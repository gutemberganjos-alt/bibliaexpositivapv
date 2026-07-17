# Setup da Assinatura Stripe — Bíblia Expositiva PV

O código já está pronto e no ar (edge functions deployadas + colunas no banco).
Falta só **você conectar sua conta Stripe**. Comece tudo em **modo Teste** (toggle no topo do dashboard Stripe).

Webhook URL (guarde, usada no passo 5):
```
https://nrizmanwdipuowpkmqqm.supabase.co/functions/v1/stripe-webhook
```

---

## 1. Criar os produtos e preços (Stripe → Products)
Crie 2 produtos, cada um com um **Price recorrente mensal em BRL**:

| Produto     | Preço          | Ciclo   |
|-------------|----------------|---------|
| Individual  | R$ 29,90       | Mensal  |
| Igreja      | R$ 99,90       | Mensal  |

Copie o **Price ID** de cada um (começa com `price_...`).

## 2. Ativar métodos de pagamento (Stripe → Settings → Payment methods)
Ative **Cartão** e **Pix**. Para cobrança recorrente por PIX, ative também **Pix Automático**
(pode exigir habilitação na conta brasileira — cartão funciona de imediato).

## 3. Criar o endpoint de webhook (Stripe → Developers → Webhooks → Add endpoint)
- **Endpoint URL:** a URL do webhook acima.
- **Eventos a escutar:**
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.paid`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`
  - `charge.refunded`
- Após criar, copie o **Signing secret** (`whsec_...`).

## 4. Adicionar os secrets no Supabase
Painel: **Supabase → Project Settings → Edge Functions → Manage secrets** (ou `supabase secrets set NOME=valor`).

| Secret                    | Valor                                   |
|---------------------------|-----------------------------------------|
| `STRIPE_SECRET_KEY`       | `sk_test_...` (Developers → API keys)   |
| `STRIPE_WEBHOOK_SECRET`   | `whsec_...` (do passo 3)                 |
| `STRIPE_PRICE_INDIVIDUAL` | `price_...` (Individual, do passo 1)     |
| `STRIPE_PRICE_IGREJA`     | `price_...` (Igreja, do passo 1)         |
| `APP_URL`                 | `http://localhost:5173` (ou domínio final) |

> Os secrets `SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` já existem no ambiente das functions — não precisa recriar.

## 5. Testar o fluxo
1. `npm run dev`, entre logado, vá em **Assinatura** e clique em um plano.
2. No Checkout de teste, use o cartão `4242 4242 4242 4242`, validade futura, CVC qualquer.
3. Volta para `/assinatura?status=sucesso`. Em segundos o webhook grava a assinatura e o acesso libera.
4. Em **Minha Conta** dá para **Gerenciar** (portal Stripe) e **Cancelar** (reembolso automático se dentro de 7 dias).

---

## 6. Ligar o bloqueio de acesso (quando quiser exigir assinatura)
Hoje está **desligado** para você testar à vontade.

- **Cliente** (`.env` do frontend): `VITE_ENFORCE_SUBSCRIPTION=true` → páginas de geração (Estudos/Exegese/Interpretação) redirecionam quem não é assinante para `/assinatura`.
- **Servidor** (secret Supabase): `ENFORCE_SUBSCRIPTION=true` → a edge `gerar` recusa quem não tem assinatura ativa (é a proteção real; o cliente é só UX).
  - ⚠️ Este ponto exige **redeploy da função `gerar`** a partir do Mac (`supabase functions deploy gerar`), pois a checagem já está no código-fonte versionado mas ainda não foi publicada.

## 7. Ir para produção
Repita 1–4 com as chaves **live** (produtos, price IDs, webhook e `sk_live_...` próprios do modo Live) e ajuste `APP_URL` para o domínio real.

---

### O que já foi feito no código
- **Banco:** colunas `stripe_customer_id/subscription_id/price_id` + `cancel_at_period_end` em `subscriptions`; `stripe_invoice_id/payment_intent_id/charge_id/refunded_at` em `payments`. Helper `has_active_subscription()` refinado.
- **Edge functions (ativas):** `stripe-checkout`, `stripe-webhook`, `stripe-portal` (portal + cancelamento/reembolso 7 dias).
- **Frontend:** `lib/subscription.ts`, `SubscriptionContext`, `Membership` com checkout real e preços, `Account` com status/gerenciar/cancelar, gate `RequireSubscription` nas rotas de geração.
- **Enforcement no `gerar`:** já no código-fonte (secret `ENFORCE_SUBSCRIPTION`), pendente de redeploy pelo Mac.
