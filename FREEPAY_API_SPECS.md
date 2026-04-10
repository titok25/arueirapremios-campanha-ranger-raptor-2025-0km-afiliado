# 📋 Especificações da API Freepay

Documento com as especificações técnicas da API Freepay para integração PIX.

**Documentação oficial:** https://freepaybrasil.readme.io

---

## 🔐 Autenticação

### Método: Basic Auth

```
Authorization: Basic {base64(PUBLIC_KEY:SECRET_KEY)}
```

### Exemplo em Node.js

```javascript
const auth = Buffer.from(`${publicKey}:${secretKey}`).toString('base64');
const headers = {
  'Authorization': `Basic ${auth}`,
  'Content-Type': 'application/json'
};
```

---

## 📤 Endpoint: Criar Transação

### URL
```
POST https://api.freepaybrasil.com/v1/payment-transaction/create
```

### Headers Obrigatórios
```
Content-Type: application/json
Authorization: Basic {base64_credentials}
Accept: application/json
```

---

## 📊 Estrutura de Requisição

### Campos Obrigatórios

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `amount` | integer | Valor total em centavos (ex: 12050 = R$ 120,50) |
| `payment_method` | string | Método de pagamento: `pix`, `credit_card`, `boleto` |
| `postback_url` | string | URL para receber atualizações de transação |
| `customer` | object | Dados do cliente (veja abaixo) |
| `items` | array | Lista de itens (veja abaixo) |
| `metadata` | json | Metadados adicionais |

### Objeto Customer

```json
{
  "customer": {
    "name": "João Silva",
    "email": "joao@example.com",
    "phone": "+5511999999999",
    "document": {
      "type": "cpf",
      "number": "12345678900"
    }
  }
}
```

**Campos do Customer:**
- `name` (string, obrigatório): Nome completo
- `email` (string, obrigatório): E-mail válido
- `phone` (string, obrigatório): Telefone com código de país (ex: +5511999999999)
- `document` (object, obrigatório):
  - `type` (string): `cpf` ou `cnpj`
  - `number` (string): Apenas dígitos (11 para CPF, 14 para CNPJ)

### Array Items

```json
{
  "items": [
    {
      "name": "Títulos RANGER RAPTOR 0KM",
      "quantity": 18,
      "unit_price": 49,
      "description": "18 títulos da campanha"
    }
  ]
}
```

**Campos do Item:**
- `name` (string): Nome do produto
- `quantity` (integer): Quantidade
- `unit_price` (integer): Preço unitário em centavos
- `description` (string, opcional): Descrição

### Metadata

```json
{
  "metadata": {
    "provider_name": "Ranger Raptor",
    "campaign_id": "ranger-raptor-2025-0km",
    "custom_field": "valor_customizado"
  }
}
```

---

## 📥 Estrutura de Resposta

### Sucesso (200)

```json
{
  "data": {
    "id": "txn_1234567890",
    "status": "pending",
    "amount": 12050,
    "payment_method": "pix",
    "customer": {
      "id": "cust_1234567890",
      "name": "João Silva",
      "email": "joao@example.com"
    },
    "pix": {
      "qr_code": "00020126580014br.gov.bcb.pix...",
      "qr_code_url": "https://...",
      "copy_and_paste": "00020126580014br.gov.bcb.pix...",
      "expires_at": "2026-04-09T11:00:00Z"
    },
    "created_at": "2026-04-09T10:00:00Z",
    "expires_at": "2026-04-09T11:00:00Z"
  }
}
```

### Erro (400/401/500)

```json
{
  "error": "validation_error",
  "message": "Descrição do erro",
  "details": {
    "field": "Detalhes específicos"
  }
}
```

---

## 🔄 Fluxo de Pagamento PIX

1. **Cliente entra no checkout** → Preenche dados (nome, email, CPF, telefone)
2. **Frontend envia para API** → POST `/api/create-pix` com dados
3. **API chama Freepay** → Cria transação com payment_method = "pix"
4. **Freepay retorna QR Code** → PIX está pronto para pagamento
5. **Cliente escaneia QR Code** → Realiza pagamento via app bancário
6. **Webhook notifica** → Freepay envia confirmação para postback_url
7. **Status atualizado** → Sistema marca como "pago"

---

## ✅ Validações Obrigatórias

### CPF
- Exatamente 11 dígitos
- Deve passar na validação de dígito verificador
- Não pode ser sequência repetida (11111111111, etc)

### Email
- Formato válido (RFC 5322)
- Exemplo: `usuario@dominio.com.br`

### Telefone
- Mínimo 10 dígitos (sem DDD)
- Máximo 11 dígitos (com DDD)
- Formato aceito: `+5511999999999` ou `11999999999`

### Amount
- Mínimo: 1 centavo (0.01)
- Máximo: Sem limite definido
- Sempre em centavos (integer)

---

## 🛠️ Exemplo Completo em Node.js

```javascript
const payload = {
  amount: 8818, // R$ 88,18 em centavos
  payment_method: 'pix',
  postback_url: 'https://seu-dominio.com/webhook/freepay',
  customer: {
    name: 'João Silva',
    email: 'joao@example.com',
    phone: '+5511999999999',
    document: {
      type: 'cpf',
      number: '12345678900'
    }
  },
  items: [
    {
      name: 'Títulos RANGER RAPTOR 0KM',
      quantity: 18,
      unit_price: 49,
      description: '18 títulos da campanha'
    }
  ],
  metadata: {
    provider_name: 'Ranger Raptor',
    campaign_id: 'ranger-raptor-2025-0km'
  }
};

const auth = Buffer.from(`${publicKey}:${secretKey}`).toString('base64');

const response = await fetch('https://api.freepaybrasil.com/v1/payment-transaction/create', {
  method: 'POST',
  headers: {
    'Authorization': `Basic ${auth}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  body: JSON.stringify(payload)
});

const data = await response.json();
console.log('PIX Code:', data.data.pix.qr_code);
```

---

## 🔔 Webhook - Postback URL

### Quando é chamado?
- Quando o pagamento é confirmado
- Quando o pagamento expira
- Quando há alteração de status

### Formato da Notificação

```json
{
  "id": "txn_1234567890",
  "status": "confirmed",
  "amount": 8818,
  "payment_method": "pix",
  "customer": {
    "id": "cust_1234567890",
    "name": "João Silva"
  },
  "pix": {
    "transaction_id": "pix_id_123456"
  },
  "created_at": "2026-04-09T10:00:00Z",
  "confirmed_at": "2026-04-09T10:05:00Z"
}
```

---

## 🚨 Possíveis Erros

| Código | Mensagem | Solução |
|--------|----------|---------|
| 400 | Invalid amount | Verificar se amount está em centavos |
| 400 | Invalid customer data | Validar CPF, email, telefone |
| 401 | Unauthorized | Verificar chaves de API |
| 422 | Unprocessable entity | Verificar formato dos dados |
| 500 | Internal server error | Contatar suporte Freepay |

---

## 📞 Endpoints Adicionais

### Buscar Transação
```
GET https://api.freepaybrasil.com/v1/payment-transaction/{id}
```

### Estornar Transação
```
POST https://api.freepaybrasil.com/v1/payment-transaction/{id}/refund
```

### Consultar Saldo
```
GET https://api.freepaybrasil.com/v1/account/balance
```

---

## 🔗 Recursos Úteis

- **Documentação Oficial:** https://freepaybrasil.readme.io
- **Dashboard:** https://dashboard.freepaybrasil.com
- **Status da API:** https://status.freepaybrasil.com
- **Suporte:** https://freepaybrasil.com/suporte

---

## ✨ Notas Importantes

1. **Sempre use HTTPS** em produção
2. **Nunca exponha as chaves de API** no frontend
3. **Valide os dados no servidor**, não apenas no cliente
4. **Implemente retry logic** para chamadas à API
5. **Monitore os webhooks** para confirmação de pagamento
6. **Teste em sandbox** antes de produção
7. **Mantenha logs** de todas as transações

---

**Última atualização:** 09 de Abril de 2026
