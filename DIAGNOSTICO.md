# 🔍 Diagnóstico e Solução para Geração de PIX no Railway

## Problema
O usuário relatou que a geração de PIX não está funcionando quando o projeto está hospedado na plataforma Railway.

## Análise do Código

Foram analisados os arquivos `server.js` e `api/create-pix.js` do projeto.

### `server.js`
Este arquivo é o ponto de entrada principal da aplicação (conforme `package.json`). A rota `/api/create-pix` é definida aqui e contém a lógica para interagir com a API da FreePay. Uma observação crucial é a presença de um bloco de código que **simula a geração de PIX** caso as variáveis de ambiente `FREEPAY_PUBLIC_KEY` ou `FREEPAY_SECRET_KEY` não estejam configuradas:

```javascript
// server.js (linhas 135-161)
    // Se as chaves não estão configuradas, retornar um mock para demonstração
    if (!publicKey || !secretKey) {
      console.warn('⚠️ Chaves Freepay não configuradas. Retornando PIX mock para demonstração.');
      // ... código para gerar um PIX de demonstração ...
      return res.status(200).json({
        success: true,
        data: {
          // ... dados do PIX mock ...
          message: 'PIX gerado com sucesso (modo demonstração)'
        }
      });
    }
```

### `api/create-pix.js`
Este arquivo parece ser uma função de API separada. Ele também verifica a existência das chaves da FreePay e retorna um erro 500 se elas não estiverem presentes:

```javascript
// api/create-pix.js (linhas 30-32)
    const publicKey = process.env.FREEPAY_PUBLIC_KEY;
    const secretKey = process.env.FREEPAY_SECRET_KEY;
    if (!publicKey || !secretKey) return res.status(500).json({ error: 'freepay_keys_missing' });
```

No contexto atual, onde `server.js` é o servidor principal, a lógica de `create-pix.js` não é diretamente utilizada para a rota `/api/create-pix`. A lógica relevante está em `server.js`.

## Análise da Documentação da FreePay e Railway

A documentação `RAILWAY_SETUP.md` fornecida com o projeto detalha o processo de configuração no Railway. No **Passo 3: Configurar Variáveis de Ambiente**, é explicitamente mencionado que as variáveis `FREEPAY_PUBLIC_KEY` e `FREEPAY_SECRET_KEY` devem ser configuradas no painel do Railway.

```
// RAILWAY_SETUP.md (linhas 67-68)
FREEPAY_PUBLIC_KEY=sua_chave_publica
FREEPAY_SECRET_KEY=sua_chave_secreta
```

Além disso, a seção de **Troubleshooting** (linha 170) aborda o erro "FREEPAY_PUBLIC_KEY is not defined", indicando que a solução é verificar a configuração dessas variáveis no painel do Railway.

## Causa Provável
A causa mais provável para o problema de geração de PIX é a **ausência ou configuração incorreta das variáveis de ambiente `FREEPAY_PUBLIC_KEY` e `FREEPAY_SECRET_KEY` no ambiente de produção do Railway**.

Se essas variáveis não estiverem definidas, o código em `server.js` entrará no modo de demonstração, retornando um PIX mock em vez de fazer uma chamada real para a API da FreePay. Isso explicaria por que o PIX não está sendo "gerado" de fato, mas sim simulado.

## Solução Proposta

Para resolver o problema, siga os passos abaixo:

1.  **Obtenha suas chaves da FreePay:**
    *   Acesse o painel da FreePay ([https://freepaybrasil.com](https://freepaybrasil.com)).
    *   Vá para **Configurações > Chaves de API**.
    *   Copie sua `Public Key` e `Secret Key`.

2.  **Configure as variáveis de ambiente no Railway:**
    *   Acesse o painel do seu projeto no Railway ([https://railway.app](https://railway.app)).
    *   Navegue até a seção **"Variables"**.
    *   Adicione as seguintes variáveis, substituindo pelos valores reais obtidos da FreePay:
        *   `FREEPAY_PUBLIC_KEY = <sua_chave_publica_aqui>`
        *   `FREEPAY_SECRET_KEY = <sua_chave_secreta_aqui>`
        *   Certifique-se também de que `FREEPAY_POSTBACK_URL` esteja configurada corretamente, apontando para o seu domínio no Railway (ex: `https://seu-dominio-railway.railway.app/webhook/freepay`).

3.  **Redeploy da Aplicação:**
    *   Após configurar as variáveis, o Railway geralmente aciona um redeploy automático. Caso contrário, inicie um deploy manual.

Ao garantir que essas variáveis de ambiente estejam corretamente configuradas no Railway, a aplicação deixará de usar o mock e fará as chamadas reais para a API da FreePay, permitindo a geração efetiva do PIX.

## Próximos Passos
Após aplicar a solução, o usuário deve testar a geração de PIX novamente e verificar os logs no painel do Railway para confirmar que as chamadas para a API da FreePay estão sendo feitas e que não há erros de autenticação ou validação.
