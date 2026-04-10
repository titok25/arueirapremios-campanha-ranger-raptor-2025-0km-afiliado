import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

// Carregar variáveis de ambiente
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
// O Railway define a porta automaticamente na variável de ambiente PORT
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

// Servir arquivos estáticos
app.use(express.static(join(__dirname, '.')));

/**
 * Converte qualquer valor monetário para centavos inteiros.
 */
function toIntCents(value) {
  if (value == null) return null;
  if (typeof value === 'number' && Number.isInteger(value)) return value;
  if (typeof value === 'number') return Math.round(value * 100);
  if (typeof value === 'string') {
    const cleaned = value.replace(/[R$\s]/g, '').replace(/\.(?=\d{3},)/g, '').trim();
    const normalized = cleaned.replace(',', '.');
    const parsed = parseFloat(normalized);
    if (isNaN(parsed)) return null;
    return Math.round(parsed * 100);
  }
  return null;
}

// API: Criar PIX
app.post('/api/create-pix', async (req, res) => {
  try {
    console.log('📱 POST /api/create-pix recebido');
    const { amount, customer, items, metadata } = req.body;

    // Validações básicas
    if (amount == null || amount === '') return res.status(400).json({ error: 'Amount is required' });
    if (!customer || !customer.name || !customer.document || !customer.phone || !customer.email) {
      return res.status(400).json({ error: 'Customer data incomplete' });
    }

    const publicKey = process.env.FREEPAY_PUBLIC_KEY;
    const secretKey = process.env.FREEPAY_SECRET_KEY;
    let amountCents = toIntCents(amount);

    // Se as chaves não estão configuradas, retornar erro claro em produção ou mock em dev
    if (!publicKey || !secretKey) {
      console.warn('⚠️ Chaves Freepay não configuradas no Railway!');
      if (process.env.NODE_ENV === 'production') {
        return res.status(500).json({ error: 'Configuração incompleta: FREEPAY_PUBLIC_KEY e FREEPAY_SECRET_KEY são obrigatórias no Railway.' });
      }
      // Modo demonstração para desenvolvimento local
      return res.status(200).json({
        success: true,
        data: {
          transactionId: 'demo_' + Date.now(),
          pixCode: '00020126580014br.gov.bcb.pix0136DEMO12345678905204000053039865406' + amountCents + '5802BR5913RAZOR LTDA6009SAO PAULO62070503***6304',
          amount: amountCents,
          status: 'pending',
          message: 'PIX de demonstração (Chaves API ausentes)'
        }
      });
    }

    const auth = Buffer.from(`${publicKey}:${secretKey}`).toString('base64');
    const cpfClean = customer.document.replace(/\D/g, '');
    let phoneClean = customer.phone.replace(/\D/g, '');
    if (phoneClean.length === 10 || phoneClean.length === 11) phoneClean = '55' + phoneClean;
    if (!phoneClean.startsWith('+')) phoneClean = '+' + phoneClean;

    const fpPayload = {
      amount: amountCents,
      payment_method: 'pix',
      postback_url: process.env.FREEPAY_POSTBACK_URL || 'https://webhook.site/freepay-notification',
      customer: {
        name: customer.name,
        email: customer.email,
        phone: phoneClean,
        document: { type: 'cpf', number: cpfClean }
      },
      // Metadata é obrigatório segundo o log de erro da API
      metadata: metadata || { description: "Compra de títulos Ranger Raptor 0KM" }
    };

    if (items && Array.isArray(items) && items.length > 0) {
      fpPayload.items = items.map(it => ({
        name: it.name || 'Produto',
        title: it.name || 'Produto', // O campo 'title' foi exigido pela API no log de erro
        quantity: Math.max(1, parseInt(it.quantity) || 1),
        unit_price: toIntCents(it.unit_price)
      }));
    } else {
      // Caso não venham itens, a API pode exigir pelo menos um item se o payload for estruturado assim
      fpPayload.items = [{
        name: 'RANGER RAPTOR 0KM',
        title: 'RANGER RAPTOR 0KM',
        quantity: 1,
        unit_price: amountCents
      }];
    }

    console.log('📤 Enviando para Freepay:', JSON.stringify(fpPayload));

    const response = await fetch('https://api.freepaybrasil.com/v1/payment-transaction/create', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(fpPayload)
    });

    const data = await response.json();
    console.log('📥 Resposta Freepay:', response.status, JSON.stringify(data));

    if (!response.ok) {
      return res.status(response.status).json({
        error: 'Freepay API Error',
        message: data.message || 'Erro ao processar pagamento',
        details: data,
        errors: data.errors || []
      });
    }

    // Normalizar resposta para o frontend
    if (data && data.data) {
      const d = data.data;
      if (!d.transactionId) d.transactionId = d.id;
      if (!d.pixCode) {
        const pixObj = d.pix || d.payment || d.data || {};
        d.pixCode = pixObj.qr_code || pixObj.copy_and_paste || pixObj.qrcode || pixObj.code || pixObj.payload || null;
      }
      if (!d.calculatedAmount) d.calculatedAmount = d.amount || amountCents;
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error('❌ Erro em /api/create-pix:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// Health check para o Railway monitorar o status do app
app.get('/health', (req, res) => res.status(200).json({ status: 'ok', uptime: process.uptime() }));

// Rota raiz e SPA fallback
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'index.html'));
});

// Iniciar o servidor ouvindo em 0.0.0.0
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor iniciado com sucesso!`);
  console.log(`📡 Ouvindo em: http://0.0.0.0:${PORT}`);
  console.log(`🏥 Health check: http://0.0.0.0:${PORT}/health`);
});
