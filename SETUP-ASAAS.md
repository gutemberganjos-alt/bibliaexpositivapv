# Setup do Asaas — Bíblia Expositiva PV

Migração do Stripe para o Asaas (PIX + cartão). O código já está pronto e as funções
publicadas. Falta você conectar sua conta Asaas.

**Comece no Sandbox** (ambiente de testes) e só depois vá para produção.

URL do webhook (usada no passo 3):
```
https://nrizmanwdipuowpkmqqm.supabase.co/functions/v1/asaas-webhook
```

---

## 1. Criar conta e pegar a chave de API
- Sandbox: https://sandbox.asaas.com → criar conta de testes.
- No painel: **Integrações → API** → gerar/copiar a **chave de API**.

## 2. Escolher um token de webhook
Invente uma senha longa e aleatória (ex.: 40 caracteres). Ela será usada nos dois lados:
no painel do Asaas e no secret `ASAAS_WEBHOOK_TOKEN`. Serve para o nosso servidor ter
certeza de que o evento veio mesmo do Asaas.

## 3. Configurar o webhook (Asaas → Integrações → Webhooks)
- **URL:** a URL acima.
- **Token de autenticação:** o token do passo 2.
- **Versão:** a mais recente.
- **Eventos** (marque estes):
  - `PAYMENT_RECEIVED`
  - `PAYMENT_CONFIRMED`
  - `PAYMENT_OVERDUE`
  - `PAYMENT_REFUNDED`
  - `PAYMENT_CREDIT_CARD_CAPTURE_REFUSED`

> ⚠️ O Asaas **pausa a fila** se o endpoint falhar 15 vezes seguidas. Nosso webhook foi
> escrito para responder 200 mesmo em caso de erro interno (o erro fica no log), justamente
> para isso não acontecer. Se algum dia a fila pausar, reative em Integrações.

## 4. Secrets no Supabase
Supabase → **Edge Functions → Manage secrets**. Cole:

```
ASAAS_API_KEY=sua_chave_do_asaas
ASAAS_ENV=sandbox
ASAAS_WEBHOOK_TOKEN=o_token_que_voce_inventou
```

Quando for para produção, troque a chave pela de produção e `ASAAS_ENV=production`.

## 5. Testar no Sandbox
1. `npm run dev` (ou no site publicado), entre logado.
2. **Assinatura → Assinar plano individual** → informe um CPF válido → escolha **PIX**.
3. Você vai para a página de cobrança do Asaas.
4. No sandbox dá para simular o pagamento pelo próprio painel do Asaas.
5. Ao confirmar, o webhook ativa a assinatura e o acesso libera sozinho.

---

## O que mudou em relação ao Stripe

**CPF/CNPJ agora é obrigatório.** O Asaas exige para emitir a cobrança. A tela de assinatura
pede o documento antes de ir ao pagamento, com validação de dígito verificador no cliente e
no servidor. **Não guardamos o CPF no nosso banco** — ele vai direto ao Asaas (menos
exposição de dado pessoal para efeito de LGPD).

**O acesso libera só após o pagamento.** No Asaas, criar a assinatura não é pagar: ela gera
uma cobrança. Por isso a assinatura nasce como `incomplete` e só vira `active` quando chega
o evento de pagamento confirmado. A tela já mostra "Confirmando sua assinatura…" enquanto
isso, e libera sozinha.

**PIX x cartão — diferença importante de retenção:**
- **Cartão:** renova sozinho todo mês.
- **PIX:** o Asaas gera uma nova cobrança a cada ciclo, e o cliente precisa pagar. Com o
  **Pix Automático** (exige CNPJ e autorização do cliente no app do banco), passa a ser
  automático. Quem não autorizar continua pagando manualmente — vale acompanhar a
  inadimplência nos primeiros meses.

**Não existe mais "portal do cliente".** O Stripe tinha uma página pronta para o cliente
gerenciar o cartão. No Asaas isso não existe do mesmo jeito, então a tela **Minha Conta**
agora tem apenas o cancelamento (com reembolso automático dentro de 7 dias).

## Ainda pendente (não é bug)
- Testar uma cobrança real em produção.
- Termos de Uso e Política de Privacidade (LGPD).
- Emissão de nota fiscal — o Asaas tem emissão automática para assinaturas; vale configurar
  com seu contador.
- Biblioteca ainda não sincroniza entre aparelhos (localStorage).
- As funções antigas do Stripe (`stripe-checkout`, `stripe-webhook`, `stripe-portal`)
  continuam publicadas no Supabase, mas não são mais usadas. Podem ser removidas pelo painel.
