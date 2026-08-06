# E-mails de autenticação com a cara do app

O Supabase envia e-mail de "reset de senha" (e cadastro) com um modelo genérico
em inglês, remetente "Supabase Auth <noreply@mail.app.supabase.io>". Para
deixar com a identidade do Bíblia Expositiva PV, edite os templates manualmente
(não existe API para isso, é só pelo painel).

## Passo a passo

1. Acesse o [Supabase Dashboard](https://supabase.com/dashboard) → projeto `bibliaexpositivapv` (nrizmanwdipuowpkmqqm)
2. **Authentication → Email Templates**
3. Escolha **Reset Password**, apague o conteúdo do campo "Message body" e cole o HTML abaixo
4. Troque o **Subject** para: `Redefinir sua senha — Bíblia Expositiva PV`
5. Clique em **Save**
6. (Opcional) Repita o mesmo processo no template **Confirm signup**, trocando só o texto e mantendo `{{ .ConfirmationURL }}`

## HTML do template (Reset Password)

```html
<div style="background:#0D1F3C;padding:32px 0;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#0D1F3C;border:1px solid #2A3F5F;border-radius:12px;">
          <tr>
            <td align="center" style="padding:36px 32px 8px;">
              <div style="font-size:15px;letter-spacing:2px;color:#D4A94E;text-transform:uppercase;margin-bottom:6px;">Bíblia Expositiva PV</div>
              <div style="font-size:22px;color:#F4E9D0;font-weight:bold;">Redefinir sua senha</div>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 8px;color:#C9D3E0;font-size:15px;line-height:1.6;">
              Recebemos um pedido para redefinir a senha da sua conta. Clique no botão abaixo para escolher uma nova senha.
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:24px 32px;">
              <a href="{{ .ConfirmationURL }}" style="background:#D4A94E;color:#0D1F3C;text-decoration:none;font-weight:bold;font-size:15px;padding:14px 32px;border-radius:8px;display:inline-block;">
                Redefinir senha
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 32px;color:#7C8AA0;font-size:13px;line-height:1.5;">
              Se você não pediu essa alteração, pode ignorar este e-mail com segurança — sua senha continua a mesma.
            </td>
          </tr>
        </table>
        <div style="color:#5A6A85;font-size:12px;margin-top:16px;">Bíblia Expositiva PV · bibliaexpositivapv.com.br</div>
      </td>
    </tr>
  </table>
</div>
```

## Sobre o remetente (noreply@mail.app.supabase.io)

Isso não dá pra trocar sem configurar um **SMTP próprio** (Authentication →
Settings → SMTP Settings, usando algo como Resend, SendGrid, Amazon SES etc.
com um domínio seu, ex. `noreply@bibliaexpositivapv.com.br`). É um passo à
parte, mais trabalhoso (precisa configurar DNS/SPF/DKIM do domínio) — o
template acima já resolve o essencial: o corpo do e-mail deixa claro que é do
app, mesmo com o remetente ainda sendo genérico. Se quiser, no futuro dá pra
configurar o SMTP próprio também.
