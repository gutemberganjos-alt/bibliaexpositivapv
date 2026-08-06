#!/usr/bin/env bash
# ============================================================================
# Configuração de credenciais do pipeline de SEO
# ============================================================================
# Resolve os dois passos manuais de uma vez, SEM você precisar copiar e colar
# segredo nenhum:
#
#   A) Envia o SEO_TOKEN (que já está no .env.seo) para os secrets do Supabase.
#   B) Busca a chave service_role pela CLI e grava no .env.seo.
#
# Os valores vão do Supabase direto para o arquivo local. Não aparecem na tela,
# não entram no histórico do shell e não passam por nenhum intermediário.
#
#   bash seo/configurar.sh
# ============================================================================

set -euo pipefail

REF="nrizmanwdipuowpkmqqm"
RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_SEO="$RAIZ/.env.seo"

vermelho() { printf '\033[31m%s\033[0m\n' "$1"; }
verde()    { printf '\033[32m%s\033[0m\n' "$1"; }
info()     { printf '  %s\n' "$1"; }

[ -f "$ENV_SEO" ] || { vermelho "Não achei $ENV_SEO"; exit 1; }

# --- login ------------------------------------------------------------------
info "Verificando login na CLI do Supabase…"
if ! npx --yes supabase projects list >/dev/null 2>&1; then
  info "Você não está logado. Abrindo o login (vai pedir confirmação no navegador)."
  npx --yes supabase login
fi

# ---------------------------------------------------------------------------
# PASSO A — SEO_TOKEN nos secrets das Edge Functions
# ---------------------------------------------------------------------------
info ""
info "PASSO A — enviando SEO_TOKEN para os secrets do Supabase…"

TOKEN="$(grep -E '^SEO_TOKEN=' "$ENV_SEO" | head -1 | cut -d= -f2- | tr -d '"'"'"' \r')"

if [ -z "$TOKEN" ] || [ "${#TOKEN}" -lt 32 ]; then
  vermelho "  SEO_TOKEN ausente ou com menos de 32 caracteres no .env.seo."
  vermelho "  A função 'gerar' exige 32+ caracteres — gere outro com: openssl rand -hex 24"
  exit 1
fi

# O valor é passado pela CLI a partir do arquivo: nunca é digitado nem exibido.
# É aqui que mora a armadilha do HANDOFF — o valor vai puro, sem o nome junto.
npx --yes supabase secrets set "SEO_TOKEN=$TOKEN" --project-ref "$REF" >/dev/null
verde "  SEO_TOKEN salvo (${#TOKEN} caracteres)."

# ---------------------------------------------------------------------------
# PASSO B — chave service_role no .env.seo
# ---------------------------------------------------------------------------
info ""
info "PASSO B — buscando a chave service_role…"

CHAVES_JSON="$(npx --yes supabase projects api-keys --project-ref "$REF" --output json 2>/dev/null || true)"

SERVICE_KEY=""
if [ -n "$CHAVES_JSON" ]; then
  SERVICE_KEY="$(printf '%s' "$CHAVES_JSON" | node -e '
    let e = "";
    process.stdin.on("data", d => e += d).on("end", () => {
      try {
        const chaves = JSON.parse(e);
        const alvo = (Array.isArray(chaves) ? chaves : []).find(
          k => k.name === "service_role" || k.type === "secret"
        );
        process.stdout.write(alvo?.api_key ?? alvo?.apiKey ?? "");
      } catch { process.stdout.write(""); }
    });
  ' || true)"
fi

if [ -z "$SERVICE_KEY" ]; then
  vermelho "  A CLI não devolveu a chave (versão diferente ou permissão)."
  info ""
  info "  Faça este único passo à mão:"
  info "    1. https://supabase.com/dashboard/project/$REF/settings/api-keys"
  info "    2. service_role → Reveal → copiar"
  info "    3. cole em $ENV_SEO no lugar de COLE_A_SERVICE_ROLE_AQUI"
  info ""
  info "  O passo A já foi concluído — não precisa refazer."
  exit 1
fi

# Substitui a linha inteira, preservando o resto do arquivo.
TMP="$(mktemp)"
awk -v chave="$SERVICE_KEY" '
  /^SUPABASE_SERVICE_ROLE_KEY=/ { print "SUPABASE_SERVICE_ROLE_KEY=" chave; achou=1; next }
  { print }
  END { if (!achou) print "SUPABASE_SERVICE_ROLE_KEY=" chave }
' "$ENV_SEO" > "$TMP"
mv "$TMP" "$ENV_SEO"
chmod 600 "$ENV_SEO"
verde "  service_role gravada no .env.seo (permissão 600, só você lê)."

# ---------------------------------------------------------------------------
# Verificação: as credenciais funcionam de verdade?
# ---------------------------------------------------------------------------
info ""
info "Conferindo se o banco responde com essa chave…"
URL="$(grep -E '^SUPABASE_URL=' "$ENV_SEO" | head -1 | cut -d= -f2-)"
CODIGO="$(curl -s -o /dev/null -w '%{http_code}' \
  -H "apikey: $SERVICE_KEY" -H "authorization: Bearer $SERVICE_KEY" \
  "$URL/rest/v1/seo_pages?select=slug&limit=1")"

if [ "$CODIGO" = "200" ]; then
  verde "  Banco respondeu 200 — a tabela seo_pages está acessível."
else
  vermelho "  Banco respondeu $CODIGO. Confira a chave no painel."
  exit 1
fi

info ""
verde "Pronto. Faltam só duas coisas, ambas fora da minha alçada:"
info ""
info "  1. Republicar a função (ela precisa enxergar o novo secret):"
info "       npx supabase functions deploy gerar --project-ref $REF"
info ""
info "  2. No Vercel → Settings → Environment Variables, adicionar:"
info "       SUPABASE_URL                 (o mesmo valor do .env.seo)"
info "       SUPABASE_SERVICE_ROLE_KEY    (o mesmo valor do .env.seo)"
info ""
info "  Depois, o primeiro teste de verdade:"
info "       npm run seo:fila -- --so-capitulos --limite 3"
info "       npm run seo:gerar -- --limite 3"
info "       npm run seo:publicar -- --ver 3      ← LEIA o que saiu"
