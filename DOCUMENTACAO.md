# Documentação - Ranger Raptor 0KM

## 📋 Resumo das Melhorias Implementadas

Este documento descreve todas as funcionalidades adicionadas ao site da campanha Ranger Raptor 0KM.

---

## ✨ Funcionalidades Novas

### 1. **Somas Automáticas de Cotas**

A página agora calcula automaticamente o valor total baseado na quantidade de títulos selecionados.

**Como funciona:**
- Preço unitário: R$ 0,49 por título
- Ao alterar a quantidade (usando os botões +/- ou digitando), o valor total é atualizado em tempo real
- A barra de progresso também é atualizada dinamicamente
- Os botões de pacote (+50, +100, +500, +1000) pré-selecionam as quantidades

**Código relevante:**
```javascript
function updatePrice() {
  const qty = parseInt(document.getElementById('qtyInput').value) || 1;
  const total = (qty * PRICE_PER_TITLE).toFixed(2).replace('.', ',');
  document.getElementById('ctaPrice').textContent = `R$ ${total}`;
  
  // Atualizar progresso
  const percent = ((qty / TOTAL_TITLES) * 100).toFixed(2);
  document.getElementById('progressPercent').textContent = `${percent}%`;
  document.getElementById('progressBar').style.width = `${percent}%`;
}
```

---

### 2. **Botão "Mostrar Mais" Funcional**

Existem dois botões "Mostrar Mais" na página:

#### a) **Títulos Premiados**
- Mostra inicialmente 5 títulos
- Ao clicar em "Mostrar Mais", exibe os 15 títulos restantes
- O botão muda para "Mostrar Menos" para recolher a lista

#### b) **Roletas Instantâneas - Ganhadores**
- Mostra inicialmente 5 prêmios
- Funciona da mesma forma que os títulos premiados

**Código relevante:**
```javascript
function toggleShowMore(section) {
  const btn = document.getElementById(`showMore${section === 'titles' ? 'Titles' : 'Roletas'}`);
  const rows = document.querySelectorAll(`${section === 'titles' ? '.titles-list' : '.roletas-winners'} .title-row.hidden`);
  
  const isHidden = rows[0]?.classList.contains('hidden');
  rows.forEach(row => {
    if (isHidden) {
      row.classList.remove('hidden');
    } else {
      row.classList.add('hidden');
    }
  });
  
  btn.textContent = isHidden ? '∧ Mostrar Menos' : '∨ Mostrar Mais';
}
```

---

### 3. **Checkout em 3 Etapas com Modal**

O checkout foi completamente reformulado em um modal com 3 etapas:

#### **Etapa 1: Telefone**
- Campo para inserir telefone
- Validação obrigatória
- Exibe quantidade de títulos sendo adquiridos

#### **Etapa 2: Dados Pessoais**
- Confirmação do telefone
- Nome completo
- CPF
- Validação de todos os campos

#### **Etapa 3: Pagamento PIX**
- Exibe código PIX para cópia
- Botão para copiar código automaticamente
- Confirmação de pagamento

**Estrutura HTML:**
```html
<div class="checkout-modal" id="checkoutModal">
  <div class="checkout-content">
    <div class="checkout-header">
      <span class="checkout-title">Checkout</span>
      <button class="checkout-close" onclick="closeCheckout()">✕</button>
    </div>
    <div class="checkout-body">
      <!-- 3 steps aqui -->
    </div>
  </div>
</div>
```

---

## 🔌 Integração com API de Pagamentos

### **API Endpoint Existente**

O projeto já possui um endpoint de API em `/api/create-pix.js` que integra com **Freepay**.

**Método:** POST  
**URL:** `/api/create-pix`

### **Payload Esperado**

```json
{
  "amount": 8.82,
  "customer": {
    "name": "João Silva",
    "document": "12345678901",
    "phone": "11999999999"
  },
  "items": [
    {
      "name": "Títulos RANGER RAPTOR 0KM",
      "quantity": 18,
      "unit_price": 0.49,
      "description": "18 títulos da campanha Ranger Raptor 0KM"
    }
  ],
  "metadata": {
    "campaign": "ranger-raptor-2025-0km",
    "description": "Compra de títulos de loteria"
  }
}
```

### **Resposta Esperada**

```json
{
  "data": {
    "transactionId": "txn_xxxxxxxx",
    "calculatedAmount": 882,
    "pixCode": "00020126580014br.gov.bcb.pix0136...",
    "status": "pending"
  }
}
```

### **Como Integrar no Frontend**

Para ativar a integração real com PIX, modifique a função `confirmPayment()`:

```javascript
async function confirmPayment() {
  const phone = document.getElementById('phone1').value;
  const name = document.getElementById('fullName').value;
  const cpf = document.getElementById('cpf').value;
  const qty = document.getElementById('qtyInput').value;
  const total = (qty * PRICE_PER_TITLE).toFixed(2);

  try {
    const response = await fetch('/api/create-pix', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: parseFloat(total),
        customer: {
          name: name,
          document: cpf.replace(/\D/g, ''),
          phone: phone.replace(/\D/g, '')
        },
        items: [
          {
            name: 'Títulos RANGER RAPTOR 0KM',
            quantity: parseInt(qty),
            unit_price: PRICE_PER_TITLE,
            description: `${qty} títulos da campanha Ranger Raptor 0KM`
          }
        ],
        metadata: {
          campaign: 'ranger-raptor-2025-0km',
          description: 'Compra de títulos de loteria'
        }
      })
    });

    const data = await response.json();
    
    if (data.data && data.data.pixCode) {
      document.getElementById('pixCode').textContent = data.data.pixCode;
      alert('✓ Código PIX gerado com sucesso!');
    } else {
      alert('Erro ao gerar código PIX');
    }
  } catch (error) {
    console.error('Erro:', error);
    alert('Erro ao processar pagamento');
  }
}
```

---

## 📁 Estrutura de Arquivos

```
ranger_raptor/
├── index.html                    # Página principal (ATUALIZADO)
├── DOCUMENTACAO.md              # Este arquivo
├── api/
│   └── create-pix.js            # API de pagamento PIX (Freepay)
├── images/
│   ├── car1.jpg
│   ├── car2.jpg
│   ├── car3.jpg
│   ├── car4.jpg
│   ├── logo.jpg
│   └── footer_logos.png
└── tema/
    └── imagens/
        ├── footer_logos.png     # Imagem do footer (LOTEP + RAZOR)
        └── footer_logos_oficial.png
```

---

## 🎨 Estilos CSS

### **Cores Principais**
- **Verde (Primário):** `#198754` - Botões, badges, progresso
- **Preto:** `#000000` - Header, backgrounds
- **Cinza Claro:** `#f4f6f8` - Backgrounds secundários
- **Texto:** `#212529` - Cor padrão de texto

### **Fontes**
- **Principal:** `Public Sans` (weights: 300, 400, 500, 600, 700, 800, 900)
- **Secundária:** `Montserrat` (weights: 400, 500, 600, 700, 800, 900)
- **Monospace:** `Fira Code` (para números de títulos)

---

## 📱 Responsividade

A página é totalmente responsiva e se adapta para:
- **Desktop:** 680px de largura máxima
- **Tablet:** Ajustes automáticos
- **Mobile:** Otimizado para telas pequenas

---

## 🔧 Variáveis JavaScript

```javascript
const PRICE_PER_TITLE = 0.49;      // Preço por título
const TOTAL_TITLES = 20;            // Total de títulos na campanha
const CURRENT_TITLES = 7;           // Títulos já vendidos
```

---

## 🚀 Como Usar

### **1. Alterar Quantidade**
- Use os botões +/- para aumentar/diminuir
- Ou digite diretamente no campo
- O preço total é atualizado automaticamente

### **2. Selecionar Pacote**
- Clique em um dos botões de pacote (+50, +100, +500, +1000)
- A quantidade será pré-selecionada

### **3. Abrir Checkout**
- Clique em "Quero participar"
- Preencha os dados em cada etapa
- Copie o código PIX na etapa 3
- Realize o pagamento

### **4. Mostrar Mais Títulos**
- Clique em "∨ Mostrar Mais" para expandir
- Clique em "∧ Mostrar Menos" para recolher

---

## ⚙️ Variáveis de Ambiente (para API)

Para que a integração com Freepay funcione, configure as seguintes variáveis de ambiente:

```bash
FREEPAY_PUBLIC_KEY=sua_chave_publica
FREEPAY_SECRET_KEY=sua_chave_secreta
FREEPAY_POSTBACK_URL=https://seu-dominio.com/webhook/freepay
```

---

## 📞 Suporte

Para dúvidas sobre a integração ou funcionalidades, consulte:
- Documentação da Freepay: https://docs.freepaybrasil.com
- Arquivo `api/create-pix.js` para detalhes técnicos

---

## ✅ Checklist de Funcionalidades

- [x] Somas automáticas de cotas
- [x] Botão "Mostrar Mais" funcional (Títulos)
- [x] Botão "Mostrar Mais" funcional (Roletas)
- [x] Checkout em 3 etapas
- [x] Modal de checkout
- [x] Validação de formulários
- [x] Cópia de código PIX
- [x] Estilos CSS do site oficial
- [x] Caminho para imagem do footer em `tema/imagens/`
- [x] Integração com API Freepay (pronta para ativar)

---

**Última atualização:** 09 de Abril de 2026
