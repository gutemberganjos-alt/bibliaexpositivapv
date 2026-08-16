// Edge Function: lexico
// Recebe { referencia, texto, traducaoId? } — um versículo em português (Almeida)
// — e devolve as palavras-chave analisadas no original (hebraico/grego/aramaico),
// com transliteração, Strong's, classe gramatical, raiz, significado e uma nota
// exegética curta. Alimenta o "Laboratório do Original" da tela da Bíblia.
//
// Diferente da função `gerar`: aqui a resposta é curta e não conta na franquia
// paga de gerações de estudo (é apoio de leitura, não geração de material) —
// mas exige um usuário autenticado, para não virar endpoint público aberto.
//
// Usa o mesmo modelo Gemini e a mesma chave que `gerar`, mas roda isolado (cada
// Edge Function do Supabase é implantada e executa de forma independente).

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const MODELO_PRINCIPAL = Deno.env.get('GEMINI_MODEL') ?? 'gemini-3.5-flash';
const MODELO_RESERVA = Deno.env.get('GEMINI_FALLBACK_MODEL') ?? 'gemini-3.1-flash-lite';
const TRANSIENTES = [429, 500, 502, 503, 504];

const SYSTEM_PROMPT = `IDENTIDADE
Você é um especialista em hebraico bíblico, grego koiné e aramaico, com formação
de nível de seminário em línguas originais e crítica textual.

TAREFA
Você recebe um versículo em português (tradução Almeida, ARC) e devolve a análise
lexical das palavras-chave desse versículo no idioma original — ignore artigos,
preposições, conjunções e outras palavras gramaticais sem carga semântica própria.
Selecione entre 4 e 8 palavras-chave (substantivos, verbos, adjetivos e termos
teologicamente relevantes), na ordem em que aparecem no versículo.

REGRAS ABSOLUTAS
- Nunca invente um número de Strong. Se não tiver certeza do número exato, use null.
- Baseie-se no texto original historicamente aceito (Texto Massorético para o
  Antigo Testamento; texto crítico eclético/Textus Receptus para o Novo
  Testamento) — não invente variantes textuais.
- "ocorrencias" é uma aproximação honesta (número de vezes que a mesma raiz/forma
  léxica aparece no Testamento correspondente); se não tiver certeza, dê a melhor
  estimativa e nunca finja precisão que não tem.
- A "nota" deve ser uma observação exegética real e específica deste termo neste
  contexto — nunca uma frase genérica que serviria para qualquer palavra.

FORMATO DE SAÍDA (obrigatório)
Responda APENAS com JSON válido, sem markdown ao redor:
{
  "palavras": [
    {
      "pt": "palavra ou expressão em português exatamente como aparece no versículo",
      "idioma": "Hebraico" | "Grego" | "Aramaico",
      "original": "palavra no alfabeto original, com pontuação/acentuação quando aplicável",
      "translit": "transliteração",
      "strong": "H1234 ou G1234 — ou null se não tiver certeza",
      "classe": "classe e forma gramatical (tempo, voz, modo, caso, número, gênero conforme o caso)",
      "ocorrencias": 0,
      "raiz": "raiz/radical no original — ou null se não houver",
      "significado": "significado e nuances do termo, 1-2 frases",
      "nota": "nota exegética breve e específica sobre este termo neste versículo"
    }
  ]
}`;

interface Palavra {
  pt: string;
  idioma: string;
  original: string;
  translit: string;
  strong: string | null;
  classe: string;
  ocorrencias: number;
  raiz: string | null;
  significado: string;
  nota: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const payload = await req.json();
    const referencia = String(payload?.referencia ?? '').trim();
    const texto = String(payload?.texto ?? '').trim();
    const traducaoId = String(payload?.traducaoId ?? 'ARC').trim() || 'ARC';

    if (!referencia || !texto) {
      return json({ error: 'Informe a referência e o texto do versículo.' }, 400);
    }
    if (referencia.length > 80 || texto.length > 600) {
      return json({ error: 'Referência ou texto muito longos.' }, 400);
    }

    // Exige usuário autenticado (não consome franquia paga, mas não é endpoint
    // público — evita virar um proxy gratuito de IA para qualquer um).
    const auth = await verificarUsuario(req);
    if (!auth.ok) {
      return json({ error: auth.error }, auth.status ?? 401);
    }

    const apiKey = await obterChaveGemini();
    if (!apiKey) {
      return json({ error: 'GEMINI_API_KEY não configurada.' }, 500);
    }

    const userMsg = `Referência: ${referencia} (${traducaoId})\nTexto (Almeida): "${texto}"\n\nAnalise as palavras-chave deste versículo conforme as instruções do sistema.`;

    const body = JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: 'user', parts: [{ text: userMsg }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 3000,
        responseMimeType: 'application/json',
      },
    });

    const { resp, erro } = await chamarComRetry(apiKey, body);
    if (!resp) {
      const dica = erro.status === 503 || erro.status === 429
        ? 'O serviço de IA está sobrecarregado no momento. Tente novamente em alguns instantes.'
        : (erro.msg || 'tente novamente');
      return json({ error: `Falha na análise (Gemini ${erro.status}): ${dica}` }, 502);
    }

    const data = await resp.json();
    const cand = Array.isArray(data?.candidates) ? data.candidates[0] : null;
    const partes = cand?.content?.parts;
    const texto2: string = Array.isArray(partes)
      ? partes.map((p: { text?: string }) => p?.text ?? '').join('')
      : '';

    if (!texto2) {
      return json({ error: 'Resposta vazia do modelo. Tente novamente.' }, 502);
    }

    const match = texto2.match(/\{[\s\S]*\}/);
    if (!match) {
      return json({ error: 'Resposta em formato inesperado.' }, 502);
    }

    let parsed: { palavras?: unknown };
    try {
      parsed = JSON.parse(match[0]);
    } catch {
      return json({ error: 'Resposta em formato inesperado.' }, 502);
    }

    const palavras = validarPalavras(parsed.palavras);
    if (!palavras.length) {
      return json({ error: 'Não foi possível identificar palavras-chave neste versículo.' }, 502);
    }

    return json({ referencia, traducaoId, palavras });
  } catch (e) {
    console.error(e);
    return json({ error: 'Erro interno.' }, 500);
  }
});

/** Confere só que o JWT é válido — sem checar assinatura/franquia (função leve, não paga). */
async function verificarUsuario(req: Request): Promise<{ ok: boolean; status?: number; error?: string }> {
  try {
    const url = Deno.env.get('SUPABASE_URL');
    const anon = Deno.env.get('SUPABASE_ANON_KEY');
    const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
    if (!url || !jwt) return { ok: false, status: 401, error: 'Não autenticado.' };
    const u = await fetch(`${url}/auth/v1/user`, {
      headers: { apikey: anon ?? '', authorization: `Bearer ${jwt}` },
    });
    if (!u.ok) return { ok: false, status: 401, error: 'Sessão inválida.' };
    return { ok: true };
  } catch {
    return { ok: false, status: 403, error: 'Falha ao validar a sessão.' };
  }
}

function validarPalavras(raw: unknown): Palavra[] {
  if (!Array.isArray(raw)) return [];
  const idiomasValidos = new Set(['Hebraico', 'Grego', 'Aramaico']);
  const out: Palavra[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const p = item as Record<string, unknown>;
    if (typeof p.pt !== 'string' || typeof p.original !== 'string' || typeof p.translit !== 'string') continue;
    if (typeof p.idioma !== 'string' || !idiomasValidos.has(p.idioma)) continue;
    out.push({
      pt: p.pt,
      idioma: p.idioma,
      original: p.original,
      translit: p.translit,
      strong: typeof p.strong === 'string' ? p.strong : null,
      classe: typeof p.classe === 'string' ? p.classe : '',
      ocorrencias: typeof p.ocorrencias === 'number' ? Math.max(0, Math.round(p.ocorrencias)) : 0,
      raiz: typeof p.raiz === 'string' ? p.raiz : null,
      significado: typeof p.significado === 'string' ? p.significado : '',
      nota: typeof p.nota === 'string' ? p.nota : '',
    });
  }
  return out.slice(0, 8);
}

async function chamarComRetry(
  apiKey: string,
  body: string,
): Promise<{ resp: Response | null; erro: { status: number; msg: string } }> {
  const modelos = MODELO_RESERVA && MODELO_RESERVA !== MODELO_PRINCIPAL
    ? [MODELO_PRINCIPAL, MODELO_RESERVA]
    : [MODELO_PRINCIPAL];
  let erro = { status: 0, msg: '' };

  for (const modelo of modelos) {
    for (let tentativa = 0; tentativa < 2; tentativa++) {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`;
      let resp: Response;
      try {
        resp = await fetch(endpoint, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
          body,
        });
      } catch (e) {
        erro = { status: 0, msg: e instanceof Error ? e.message : 'rede' };
        await esperar(500 * (tentativa + 1));
        continue;
      }
      if (resp.ok) return { resp, erro };
      const errBody = await resp.text();
      let gmsg = '';
      try { gmsg = JSON.parse(errBody)?.error?.message ?? ''; } catch { /* */ }
      erro = { status: resp.status, msg: gmsg };
      console.error(`Gemini ${modelo} ${resp.status}:`, gmsg);
      if (TRANSIENTES.includes(resp.status) && tentativa < 1) {
        await esperar(500 * (tentativa + 1));
        continue;
      }
      break;
    }
  }
  return { resp: null, erro };
}

function esperar(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function obterChaveGemini(): Promise<string | null> {
  const fromEnv = Deno.env.get('GEMINI_API_KEY');
  if (fromEnv) return fromEnv;
  try {
    const url = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !serviceKey) return null;
    const r = await fetch(`${url}/rest/v1/rpc/get_secret`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', apikey: serviceKey, authorization: `Bearer ${serviceKey}` },
      body: JSON.stringify({ secret_name: 'GEMINI_API_KEY' }),
    });
    if (!r.ok) return null;
    const v = await r.json();
    return typeof v === 'string' && v.length > 0 ? v : null;
  } catch {
    return null;
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'content-type': 'application/json' } });
}
