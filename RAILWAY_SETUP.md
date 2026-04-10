# 🚀 Guia de Hospedagem na Railway

Este documento descreve como hospedar o projeto **Ranger Raptor 0KM** na plataforma Railway.

---

## 📋 Pré-requisitos

1. **Conta GitHub** - Para conectar seu repositório
2. **Conta Railway** - Crie em https://railway.app
3. **Conta Freepay** - Para obter chaves de API (opcional para testes)

---

## 🔧 Passo 1: Preparar o Repositório Git

### 1.1 Inicializar Git (se ainda não fez)

```bash
cd ranger_raptor
git init
git add .
git commit -m "Initial commit: Ranger Raptor 0KM campaign"
```

### 1.2 Enviar para GitHub

```bash
# Criar repositório no GitHub
# https://github.com/new

# Adicionar remote
git remote add origin https://github.com/seu-usuario/ranger-raptor-0km.git
git branch -M main
git push -u origin main
```

---

## 🚀 Passo 2: Conectar à Railway

### 2.1 Acessar Railway

1. Acesse https://railway.app
2. Faça login com sua conta
3. Clique em **"New Project"**
4. Selecione **"Deploy from GitHub"**

### 2.2 Conectar Repositório

1. Autorize o Railway a acessar sua conta GitHub
2. Selecione o repositório **ranger-raptor-0km**
3. Clique em **"Deploy"**

---

## ⚙️ Passo 3: Configurar Variáveis de Ambiente

### 3.1 No painel Railway

1. Vá para **"Variables"** no seu projeto
2. Clique em **"Add Variable"**
3. Adicione as seguintes variáveis:

```
PORT=3000
FREEPAY_PUBLIC_KEY=sua_chave_publica
FREEPAY_SECRET_KEY=sua_chave_secreta
FREEPAY_POSTBACK_URL=https://seu-dominio-railway.railway.app/webhook/freepay
NODE_ENV=production
```

### 3.2 Obter Chaves Freepay

1. Acesse https://freepaybrasil.com
2. Faça login em sua conta
3. Vá para **Configurações > Chaves de API**
4. Copie as chaves **Public Key** e **Secret Key**
5. Cole no painel Railway

---

## 📦 Passo 4: Estrutura de Arquivos Necessária

Certifique-se de que seu repositório tem:

```
ranger-raptor-0km/
├── server.js                 # Servidor Express
├── package.json             # Dependências
├── Procfile                 # Configuração Railway
├── .env.example             # Exemplo de variáveis
├── .gitignore               # Arquivos a ignorar
├── index.html               # Página principal
├── api/
│   └── create-pix.js        # API de pagamento
├── images/                  # Imagens do carousel
├── tema/
│   └── imagens/             # Imagens do footer
└── README.md                # Documentação
```

---

## ✅ Passo 5: Deploy

### 5.1 Deploy Automático

O Railway fará deploy automaticamente quando você fazer push para a branch `main`:

```bash
git add .
git commit -m "Update: Nova funcionalidade"
git push origin main
```

### 5.2 Acompanhar Deploy

1. No painel Railway, clique em **"Deployments"**
2. Veja o progresso do deploy em tempo real
3. Quando terminar, você verá um link público

---

## 🌐 Passo 6: Acessar Sua Aplicação

Após o deploy bem-sucedido:

1. Railway fornecerá uma URL pública (ex: `https://ranger-raptor-0km.railway.app`)
2. Acesse essa URL no navegador
3. Sua aplicação está ao vivo! 🎉

---

## 🔍 Monitoramento e Logs

### Ver Logs

1. No painel Railway, vá para **"Logs"**
2. Você verá todos os logs do servidor em tempo real
3. Procure por erros ou mensagens importantes

### Health Check

Acesse: `https://seu-dominio.railway.app/health`

Você deve receber:
```json
{
  "status": "ok",
  "timestamp": "2026-04-09T10:00:00.000Z"
}
```

---

## 🛠️ Troubleshooting

### Erro: "Cannot find module 'express'"

**Solução:** Execute `npm install` localmente e faça commit do `package-lock.json`

```bash
npm install
git add package-lock.json
git commit -m "Add package-lock.json"
git push origin main
```

### Erro: "FREEPAY_PUBLIC_KEY is not defined"

**Solução:** Verifique se as variáveis de ambiente estão configuradas no painel Railway

### Erro: "Port already in use"

**Solução:** Railway gerencia a porta automaticamente. Não altere o `PORT` no código.

### PIX não está sendo gerado

**Solução:** 
1. Verifique se as chaves Freepay estão corretas
2. Confira os logs no painel Railway
3. Teste com o modo demonstração (sem chaves)

---

## 📊 Domínio Customizado (Opcional)

Para usar um domínio próprio:

1. No painel Railway, vá para **"Settings"**
2. Clique em **"Custom Domain"**
3. Digite seu domínio (ex: `ranger-raptor.com`)
4. Configure os DNS records conforme instruído

---

## 💾 Backup e Dados

### Backup do Código

O GitHub é seu backup automático. Todos os commits são salvos.

### Dados de Transações

Se implementar banco de dados:

1. Railway oferece PostgreSQL e MongoDB
2. Adicione no painel: **"New Service" > "Database"**
3. Configure a variável de conexão

---

## 🔐 Segurança

### Boas Práticas

1. **Nunca** commite arquivos `.env` com chaves reais
2. Use `.env.example` como template
3. Altere as chaves Freepay regularmente
4. Monitore os logs para atividades suspeitas
5. Use HTTPS (Railway fornece automaticamente)

### Proteção de Dados

- Todos os dados são transmitidos via HTTPS
- As chaves de API nunca são expostas no frontend
- Valide todos os dados no servidor

---

## 📞 Suporte

### Railway
- Documentação: https://docs.railway.app
- Status: https://status.railway.app
- Comunidade: https://discord.gg/railway

### Freepay
- Documentação: https://docs.freepaybrasil.com
- Suporte: https://freepaybrasil.com/suporte

---

## 🎯 Próximos Passos

1. ✅ Fazer deploy na Railway
2. ✅ Testar todas as funcionalidades
3. ✅ Configurar domínio customizado
4. ✅ Monitorar logs e performance
5. ✅ Implementar banco de dados (se necessário)
6. ✅ Configurar backups automáticos

---

## 📝 Checklist Final

- [ ] Repositório Git criado
- [ ] Código enviado para GitHub
- [ ] Conta Railway criada
- [ ] Projeto conectado ao GitHub
- [ ] Variáveis de ambiente configuradas
- [ ] Deploy bem-sucedido
- [ ] URL pública acessível
- [ ] Health check funcionando
- [ ] PIX gerando corretamente
- [ ] Domínio customizado (opcional)

---

**Parabéns! Seu site está no ar! 🚀**

Para dúvidas, consulte a documentação da Railway ou entre em contato com o suporte Freepay.
