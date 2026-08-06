// Configuração única do pipeline de SEO. Tudo que é decisão de negócio mora aqui.

export const SITE = 'https://www.bibliaexpositivapv.com.br';
export const NOME_SITE = 'Bíblia Expositiva';
export const EMAIL = 'suporte@grupo-soares.com';

// Prefixos de URL. NÃO colidem com as rotas do app (/estudos, /biblia,
// /biblioteca são autenticadas e bloqueadas no robots.txt) — por isso o singular.
export const PREFIXOS = {
  estudo: '/estudo',
  tema: '/tema',
  sermao: '/sermao',
};

// Prévia: mínimo de seções <h4> abertas antes do bloqueio. O corte real é
// proporcional (ver lib/previa.mjs) — no primeiro teste real, 2 seções fixas
// deram 1.140 palavras em João 1 e só 461 em João 3, porque as seções têm
// tamanhos muito diferentes. Página de 461 palavras é fina demais para ranquear.
export const SECOES_ABERTAS = 2;
export const MINIMO_PALAVRAS_PREVIA = 700;
export const PROPORCAO_PREVIA = 0.40;   // alvo: ~40% do material aberto

// Ritmo de publicação. Google trata despejo em massa como sinal de spam.
export const PUBLICAR_POR_DIA = 40;

// Geração: paralelismo e pausa. O Gemini devolve 429/503 sob pressão e a própria
// edge function já tenta de novo — não adianta empurrar mais.
export const CONCORRENCIA = 3;
export const PAUSA_MS = 1200;
export const MAX_TENTATIVAS = 3;

// Quantos links internos cada página recebe.
export const LINKS_RELACIONADOS = 6;

export const ENV = {
  supabaseUrl: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  seoToken: process.env.SEO_TOKEN,
};

export function exigirEnv(chaves) {
  const faltando = chaves.filter((k) => !ENV[k]);
  if (faltando.length) {
    console.error(
      `\n  Faltam variáveis de ambiente: ${faltando.join(', ')}\n` +
      `  Crie um arquivo .env.seo na raiz (ele já está no .gitignore) com:\n\n` +
      `    SUPABASE_URL=https://nrizmanwdipuowpkmqqm.supabase.co\n` +
      `    SUPABASE_SERVICE_ROLE_KEY=...    (Supabase → Settings → API → service_role)\n` +
      `    SEO_TOKEN=...                     (o mesmo secret salvo nas Edge Functions)\n`,
    );
    process.exit(1);
  }
}
