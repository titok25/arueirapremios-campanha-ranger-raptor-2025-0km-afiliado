/**
 * /api/create-pix
 * Single clean handler (CommonJS) - forwards to Freepay using global fetch
 */
module.exports = async function (req, res) {
  try {
    console.log('create-pix invoked', req.method);
    if (req.method === 'GET') return res.status(200).json({ ok: true });
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const body = req.body || {};
    try { console.log('incoming create-pix body:', JSON.stringify(body)); } catch(e) {}
    const amount = body.amount;

    // helper to parse money-like values into integer cents
    const parseMoneyToCents = v => {
      if (v == null) return null;
      if (typeof v === 'number') return Number.isInteger(v) ? v : Math.round(v * 100);
      if (typeof v === 'string') {
        const cleaned = v.replace(/[^0-9,\.]/g, '').replace(',', '.');
        const parsed = Number(cleaned);
        if (!Number.isNaN(parsed)) return Math.round(parsed * 100);
      }
      return null;
    };

    // Normalize amount to integer cents if provided directly
    let amountCents = parseMoneyToCents(amount);

    const publicKey = process.env.FREEPAY_PUBLIC_KEY;
    const secretKey = process.env.FREEPAY_SECRET_KEY;
    if (!publicKey || !secretKey) return res.status(500).json({ error: 'freepay_keys_missing' });

    const auth = Buffer.from(`${publicKey}:${secretKey}`).toString('base64');

    // Build Freepay payload with normalized values according to Freepay docs
    const fpPayload = { payment_method: 'pix' };

    // postback url from env if provided
    if (process.env.FREEPAY_POSTBACK_URL) fpPayload.postback_url = process.env.FREEPAY_POSTBACK_URL;

    // Normalize customer.document into object { type, number }
    if (body.customer) {
      const customer = Object.assign({}, body.customer);
      const doc = customer.document;
      if (doc) {
        if (typeof doc === 'string') {
          const digits = doc.replace(/\D/g, '');
          const type = digits.length === 11 ? 'cpf' : digits.length === 14 ? 'cnpj' : undefined;
          customer.document = { ...(type ? { type } : {}), number: digits };
        } else if (typeof doc === 'object' && doc.number) {
          const digits = String(doc.number).replace(/\D/g, '');
          const type = doc.type || (digits.length === 11 ? 'cpf' : digits.length === 14 ? 'cnpj' : undefined);
          customer.document = { ...(type ? { type } : {}), number: digits };
        }
      }
      fpPayload.customer = customer;
    }

    // Normalize items: ensure unit_price in cents and integer quantity
    if (Array.isArray(body.items) && body.items.length) {
      const items = body.items.map(it => {
        const unit = it.unit_price;
        let unitCents = 0;
        if (typeof unit === 'number') unitCents = Number.isInteger(unit) ? unit : Math.round(unit * 100);
        else if (typeof unit === 'string') {
          const parsed = Number(unit.replace(',', '.'));
          if (!Number.isNaN(parsed)) unitCents = Math.round(parsed * 100);
        }
        const quantity = Number.isNaN(Number(it.quantity)) ? 1 : Math.max(1, parseInt(it.quantity, 10));
        return {
          name: it.name || 'item',
          quantity,
          unit_price: unitCents,
          description: it.description,
          metadata: it.metadata
        };
      });
      fpPayload.items = items;
      // compute amount from items sum (in cents)
      const sum = items.reduce((s, it) => s + (Number(it.unit_price || 0) * Number(it.quantity || 0)), 0);
      fpPayload.amount = sum;
    } else {
      // fallback to provided amount (already normalized to cents)
      // try alternate keys if amount wasn't provided directly
      if (!amountCents) {
        const altKeys = ['total','price','preco','valor','value','ida_total','volta_total','calculatedAmount','total_out','total_in'];
        for (const k of altKeys) {
          if (body[k] != null) {
            amountCents = parseMoneyToCents(body[k]);
            if (amountCents) break;
          }
        }
      }

      // also check singular item fields
      if (!amountCents && body.item) {
        const it = body.item;
        amountCents = parseMoneyToCents(it.price || it.preco || it.unit_price || it.valor || it.total);
      }

      fpPayload.amount = amountCents;
    }

    // include metadata if present
    if (body.metadata) fpPayload.metadata = body.metadata;
      else {
        // Build minimal metadata required by Freepay from available fields
        const md = {};
        if (body.description) md.description = body.description;
        if (body.origin) md.origin = body.origin;
        if (body.destination) md.destination = body.destination;
        if (body.companyName) md.companyName = body.companyName;
        if (body.busType) md.busType = body.busType;
        if (body.adults != null) md.adults = body.adults;
        if (body.children != null) md.children = body.children;
        if (body.isReturn != null) md.isReturn = body.isReturn;
        if (body.item && body.item.title) md.itemTitle = body.item.title;
        if (body.customer && body.customer.name) md.customerName = body.customer.name;
        // only attach if we collected something
        if (Object.keys(md).length) fpPayload.metadata = md;
      }

    const _fetch = (typeof fetch !== 'undefined') ? fetch : (global && global.fetch) ? global.fetch : null;
    if (!_fetch) {
      console.error('fetch not available');
      return res.status(500).json({ error: 'fetch_not_available' });
    }

    // Heuristic: scan all string fields in the incoming body for money-like values
    // and prefer the largest detected money value when the provided amount looks wrong.
    const moneyCandidates = [];
    const moneyRegex = /(?:R\$\s*)?((?:\d{1,3}(?:[.,]\d{3})*|\d+)(?:[.,]\d{2}))/g;
    const collectStrings = (obj) => {
      if (!obj) return;
      if (typeof obj === 'string') {
        let m; while ((m = moneyRegex.exec(obj)) !== null) {
          const s = m[1];
          const cleaned = s.replace(/\./g, '').replace(',', '.');
          const v = Number(cleaned);
          if (!Number.isNaN(v)) moneyCandidates.push(Math.round(v * 100));
        }
      } else if (Array.isArray(obj)) {
        for (const it of obj) collectStrings(it);
      } else if (typeof obj === 'object') {
        for (const k of Object.keys(obj)) collectStrings(obj[k]);
      }
    };
    try { collectStrings(body); } catch (e) { console.warn('collectStrings error', e && e.stack || e); }

    // choose the largest candidate if present
    const maxDetected = moneyCandidates.length ? Math.max(...moneyCandidates) : null;
    try { console.log('detected money candidates (cents):', moneyCandidates, 'max:', maxDetected); } catch(e) {}

    // if we have items, server already set fpPayload.amount to the items sum; use it
    // otherwise, prefer an explicit amount if provided, but override it when there's
    // a larger detected amount in textual fields (common when UI prints total but sends smaller flag)
    if (fpPayload.amount && Number(fpPayload.amount) > 0) {
      // if there's a larger detected money in the body, and it exceeds the provided amount by margin, override
      if (maxDetected && maxDetected > Number(fpPayload.amount)) {
        try { console.log('Overriding provided amount', fpPayload.amount, 'with detected', maxDetected); } catch(e) {}
        fpPayload.amount = maxDetected;
      }
    } else {
      // no amount set yet; prefer explicit normalized amountCents, else detected max
      if (amountCents) fpPayload.amount = amountCents;
      else if (maxDetected) fpPayload.amount = maxDetected;
    }

    // final validation for amount
    if (!fpPayload.amount || Number(fpPayload.amount) <= 0) return res.status(400).json({ error: 'invalid_amount' });

    try { console.log('fpPayload to send:', JSON.stringify(fpPayload)); } catch(e) {}

    const resp = await _fetch('https://api.freepaybrasil.com/v1/payment-transaction/create', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(fpPayload)
    });
    const text = await resp.text();
    try { console.log('freepay response status:', resp.status, 'body:', text); } catch (e) {}
    let json;
    try { json = JSON.parse(text); } catch (e) { json = { raw: text }; }

    // Normalize Freepay response to include the fields frontend expects
    try {
      if (json && json.data) {
        const d = json.data;
        // transactionId expected by frontend
        if (!d.transactionId && d.id) d.transactionId = d.id;
        // calculatedAmount expected by frontend (in cents)
        if (!d.calculatedAmount && (d.amount || d.total)) d.calculatedAmount = d.amount || d.total;
        // pixCode expected by frontend
        const pixObj = d.pix || d.payment || d.data || {};
        if (!d.pixCode) d.pixCode = pixObj.qr_code || pixObj.qrcode || pixObj.code || pixObj.payload || null;
      }
    } catch (e) { console.warn('normalize response error', e && e.stack || e); }

    return res.status(resp.status || 200).json(json);
  } catch (err) {
    console.error('create-pix error', err && err.stack || err);
    return res.status(500).json({ error: 'internal_error', detail: String(err) });
  }
};
