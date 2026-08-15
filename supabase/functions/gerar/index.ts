// Edge Function: gerar
// Recebe { modoId, publicoId, referencia, stream? } e retorna { titulo, html, meta }.
// - Sem stream: resposta JSON única (compatibilidade com supabase.functions.invoke).
// - Com stream (body.stream === true OU Accept: text/event-stream): resposta SSE,
//   emitindo o material progressivamente (eventos "titulo"/"delta"/"done"/"error").
// Usa Google Gemini com retry automático + modelo reserva. Chave só no servidor.

import { montarPrompt, MODOS, PUBLICOS, SECOES_OBRIGATORIAS } from './prompts.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-seo-token, x-device-session',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Robô de conteúdo público (SEO). O pipeline em `seo/` gera milhares de páginas
// indexáveis e NÃO pertence a nenhum assinante — não faz sentido consumir a franquia
// mensal de ninguém nem exigir sessão de usuário.
// Segurança: só libera se o secret SEO_TOKEN existir, tiver 32+ caracteres e o header
// bater exatamente. Sem o secret configurado, este caminho simplesmente não existe.
const SEO_TOKEN = Deno.env.get('SEO_TOKEN') ?? '';

function ehRoboSeo(req: Request): boolean {
  if (SEO_TOKEN.length < 32) return false;
  const enviado = req.headers.get('x-seo-token') ?? '';
  if (enviado.length !== SEO_TOKEN.length) return false;
  // Comparação de tempo constante: evita descobrir o token byte a byte pelo tempo de resposta.
  let diff = 0;
  for (let i = 0; i < SEO_TOKEN.length; i++) diff |= SEO_TOKEN.charCodeAt(i) ^ enviado.charCodeAt(i);
  return diff === 0;
}

const MODELO_PRINCIPAL = Deno.env.get('GEMINI_MODEL') ?? 'gemini-3.5-flash';
const MODELO_RESERVA = Deno.env.get('GEMINI_FALLBACK_MODEL') ?? 'gemini-3.1-flash-lite';
// Raciocínio do modelo ANTES de escrever. Estava em 0 (desligado): o modelo saía
// escrevendo direto, e em tarefas analíticas (exegese, plano de aula) isso produz
// texto genérico. Custa alguns segundos a mais e muda o nível do material.
const THINKING_BUDGET = Number(Deno.env.get('GEMINI_THINKING_BUDGET') ?? '3000');
const TRANSIENTES = [429, 500, 502, 503, 504];
// Bloqueio de acesso: exige assinatura ativa. LIGADO por padrão.
// Para desligar (dev/testes), defina o secret ENFORCE_SUBSCRIPTION=false.
const ENFORCE_SUBSCRIPTION = (Deno.env.get('ENFORCE_SUBSCRIPTION') ?? 'true') !== 'false';

/**
 * Verifica no servidor se o usuário do JWT pode gerar E consome 1 unidade da
 * franquia — tudo em uma chamada atômica no banco (RPC consume_quota), para que
 * pedidos simultâneos não furem o limite. Chamado ANTES do Gemini, de propósito:
 * nunca chamamos a IA além do que o plano permite.
 *
 * Quem NÃO assinou tem um teste grátis de TESTE_GRATIS_LIMITE gerações vitalícias
 * (contadas no banco em usage_counters com period='trial'). Ao esgotar, devolvemos
 * o código `trial_exhausted` para o app abrir a tela de assinatura.
 *
 * Limites de assinante (na função consume_quota): premium=30/mês, church=150/mês.
 * Quando ENFORCE_SUBSCRIPTION está desligado, sempre libera (dev/testes).
 */
const TESTE_GRATIS_LIMITE = 3;
/** Devolve a franquia consumida quando a geração falha (não cobra do assinante por erro nosso). */
async function devolverQuota(uid: string | null): Promise<void> {
  if (!uid || !ENFORCE_SUBSCRIPTION) return;
  try {
    const url = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !serviceKey) return;
    await fetch(`${url}/rest/v1/rpc/refund_quota`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', apikey: serviceKey, authorization: `Bearer ${serviceKey}` },
      body: JSON.stringify({ p_user_id: uid }),
    });
  } catch { /* devolução é best-effort */ }
}

interface ResultadoQuota {
  ok: boolean;
  status?: number;
  error?: string;
  code?: 'trial_exhausted' | 'quota_exhausted' | 'auth' | 'erro' | 'device_session_replaced' | 'whatsapp_required' | 'device_trial_limit';
  uid?: string;
  /** Situação da franquia, devolvida ao app para atualizar o contador na tela. */
  quota?: { trial: boolean; used: number; limit: number; remaining: number };
}

async function verificarAssinaturaEQuota(req: Request): Promise<ResultadoQuota> {
  if (ehRoboSeo(req)) return { ok: true };
  if (!ENFORCE_SUBSCRIPTION) return { ok: true };
  try {
    const url = Deno.env.get('SUPABASE_URL');
    const anon = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
    if (!url || !serviceKey || !jwt) return { ok: false, status: 401, error: 'Não autenticado.' };

    // 1) Descobre o usuário a partir do JWT (não confia em id vindo do cliente).
    const u = await fetch(`${url}/auth/v1/user`, {
      headers: { apikey: anon ?? serviceKey, authorization: `Bearer ${jwt}` },
    });
    if (!u.ok) return { ok: false, status: 401, error: 'Sessão inválida.' };
    const user = await u.json();
    const uid = user?.id;
    if (!uid) return { ok: false, status: 401, error: 'Sessão inválida.' };

    // 1.5) Um aparelho por conta: se outro login (em outro navegador/celular)
    // assumiu a conta depois deste, bloqueia ANTES de gastar franquia.
    const deviceId = req.headers.get('x-device-session') ?? '';
    if (deviceId) {
      const ds = await fetch(`${url}/rest/v1/rpc/session_is_active_for`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', apikey: serviceKey, authorization: `Bearer ${serviceKey}` },
        body: JSON.stringify({ p_user_id: uid, p_session_id: deviceId }),
      });
      if (ds.ok) {
        const ativo = await ds.json();
        if (ativo === false) {
          return {
            ok: false,
            status: 401,
            code: 'device_session_replaced',
            error: 'Sua conta foi acessada em outro dispositivo. Faça login novamente.',
          };
        }
      }
    }

    // 1.6) Teste grátis: exige WhatsApp e limita por APARELHO (não só por conta) —
    // evita quem cria vários e-mails só pra repetir as 3 gerações grátis.
    // Assinante ativo é liberado direto dentro da própria função (checa de novo).
    const gate = await fetch(`${url}/rest/v1/rpc/check_trial_gate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', apikey: serviceKey, authorization: `Bearer ${serviceKey}` },
      body: JSON.stringify({ p_user_id: uid, p_device_id: deviceId || null, p_limit: TESTE_GRATIS_LIMITE }),
    });
    if (gate.ok) {
      const gateRows = await gate.json();
      const gateRow = Array.isArray(gateRows) ? gateRows[0] : gateRows;
      if (gateRow?.allowed === false) {
        if (gateRow.code === 'whatsapp_required') {
          return {
            ok: false,
            status: 400,
            code: 'whatsapp_required',
            error: 'Pra usar as gerações gratuitas, informe seu WhatsApp na sua conta.',
          };
        }
        return {
          ok: false,
          status: 402,
          code: 'device_trial_limit',
          error: 'Este aparelho já usou o teste grátis em outra conta. Assine para continuar gerando.',
        };
      }
    }

    // 2) RPC consume_quota(uid): checa assinatura ativa + consome franquia, atômico.
    const r = await fetch(`${url}/rest/v1/rpc/consume_quota`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', apikey: serviceKey, authorization: `Bearer ${serviceKey}` },
      body: JSON.stringify({ p_user_id: uid, p_tokens: 0 }),
    });
    if (!r.ok) return { ok: false, status: 403, error: 'Não foi possível validar a assinatura.' };
    const rows = await r.json();
    const row = Array.isArray(rows) ? rows[0] : rows;

    const usado = Number(row?.used ?? 0);
    const limite = Number(row?.limit_val ?? 0);
    const ehTeste = row?.trial === true;
    const quota = { trial: ehTeste, used: usado, limit: limite, remaining: Math.max(limite - usado, 0) };

    if (row?.allowed) return { ok: true, uid, quota };

    // Teste grátis esgotado: o app abre a tela de assinatura com esse código.
    if (ehTeste) {
      return {
        ok: false,
        status: 402,
        code: 'trial_exhausted',
        error: `Você usou suas ${TESTE_GRATIS_LIMITE} gerações gratuitas. Assine para continuar.`,
        quota,
      };
    }

    return {
      ok: false,
      status: 429,
      code: 'quota_exhausted',
      error: `Limite mensal do seu plano atingido (${usado}/${limite} gerações). A franquia renova no início do próximo mês.`,
      quota,
    };
  } catch {
    return { ok: false, status: 403, code: 'erro', error: 'Falha ao validar a assinatura.' };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const payload = await req.json();
    const { modoId, publicoId, referencia, perfilId } = payload ?? {};
    const querStream = payload?.stream === true ||
      (req.headers.get('accept') ?? '').includes('text/event-stream');

    if (!MODOS[modoId] || !PUBLICOS[publicoId] || !referencia?.trim()) {
      return json({ error: 'Parâmetros inválidos.' }, 400);
    }
    if (String(referencia).length > 200) {
      return json({ error: 'Referência muito longa.' }, 400);
    }

    // Bloqueio de acesso + franquia: assinatura ativa OU teste grátis, consumindo
    // 1 geração (quando ENFORCE_SUBSCRIPTION=true). Feito ANTES de chamar o Gemini
    // — nunca gastamos IA além do que o plano (ou o teste) permite.
    const assinatura = await verificarAssinaturaEQuota(req);
    if (!assinatura.ok) {
      return json(
        { error: assinatura.error, code: assinatura.code, quota: assinatura.quota },
        assinatura.status ?? 402,
      );
    }

    const uid = assinatura.uid ?? null;

    const apiKey = await obterChaveGemini();
    if (!apiKey) {
      await devolverQuota(uid);
      return json({ error: 'GEMINI_API_KEY não configurada.' }, 500);
    }

    const system = montarPrompt(modoId, publicoId, perfilId);
    const userMsg = `Texto/tema solicitado: ${referencia}\n\nGere o material completo conforme o MODO e o PÚBLICO definidos nas instruções do sistema. Lembre-se: responda APENAS com o JSON especificado.`;

    const body = JSON.stringify({
      system_instruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: userMsg }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: limiteDeSaida(modoId),
        responseMimeType: 'application/json',
        thinkingConfig: { thinkingBudget: THINKING_BUDGET > 0 ? THINKING_BUDGET : 0 },
      },
    });

    if (querStream) {
      return await responderStream(apiKey, body, { modoId, publicoId, referencia, uid });
    }

    // ---------- Caminho não-stream (JSON único) ----------
    const { resp, erro } = await chamarComRetry(apiKey, body, false);
    if (!resp) {
      await devolverQuota(uid);
      const dica = erro.status === 503 || erro.status === 429
        ? 'O serviço de IA está sobrecarregado no momento. Tente novamente em alguns instantes.'
        : (erro.msg || 'tente novamente');
      return json({ error: `Falha na geração (Gemini ${erro.status}): ${dica}` }, 502);
    }

    const data = await resp.json();
    const cand = Array.isArray(data?.candidates) ? data.candidates[0] : null;
    const partes = cand?.content?.parts;
    const texto: string = Array.isArray(partes)
      ? partes.map((p: { text?: string }) => p?.text ?? '').join('')
      : '';

    if (!texto) {
      console.error('Resposta vazia. finishReason:', cand?.finishReason);
      await devolverQuota(uid);
      return json({ error: 'Resposta vazia do modelo. Tente novamente.' }, 502);
    }

    const match = texto.match(/\{[\s\S]*\}/);
    if (!match) {
      await devolverQuota(uid);
      return json({ error: 'Resposta em formato inesperado.' }, 502);
    }

    let parsed;
    try {
      parsed = JSON.parse(match[0]);
    } catch {
      return json({ error: 'Resposta em formato inesperado.' }, 502);
    }

    const resultado = montarResultado(parsed, referencia, publicoId);
    const validacao = validarResultado(resultado.html, modoId);
    if (!validacao.valido) {
      await devolverQuota(uid);
      return json({ error: validacao.erro }, 502);
    }
    return json(resultado);
  } catch (e) {
    console.error(e);
    return json({ error: 'Erro interno.' }, 500);
  }
});

// ---------- Streaming (SSE) ----------

async function responderStream(
  apiKey: string,
  body: string,
  ctx: { modoId: string; publicoId: string; referencia: string; uid: string | null },
): Promise<Response> {
  const { resp, erro } = await chamarComRetry(apiKey, body, true);

  const encoder = new TextEncoder();

  // Se nem o stream iniciou, devolve um SSE curto só com o erro (o cliente
  // sempre lê SSE quando pediu stream).
  if (!resp || !resp.body) {
    await devolverQuota(ctx.uid);
    const dica = erro.status === 503 || erro.status === 429
      ? 'O serviço de IA está sobrecarregado no momento. Tente novamente em alguns instantes.'
      : (erro.msg || 'tente novamente');
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(
          `data: ${JSON.stringify({ type: 'error', error: `Falha na geração (Gemini ${erro.status}): ${dica}` })}\n\n`,
        ));
        controller.close();
      },
    });
    return new Response(stream, { headers: sseHeaders() });
  }

  const geminiBody = resp.body;
  const decoder = new TextDecoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));

      const reader = geminiBody.getReader();
      let raw = '';        // texto bruto acumulado (o JSON sendo montado)
      let sseBuf = '';     // buffer de linhas SSE vindas do Gemini
      let sentTitulo = '';
      let sentHtml = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          sseBuf += decoder.decode(value, { stream: true });

          let nl: number;
          while ((nl = sseBuf.indexOf('\n')) >= 0) {
            const linha = sseBuf.slice(0, nl).trim();
            sseBuf = sseBuf.slice(nl + 1);
            if (!linha.startsWith('data:')) continue;
            const dados = linha.slice(5).trim();
            if (!dados || dados === '[DONE]') continue;
            try {
              const j = JSON.parse(dados);
              const parts = j?.candidates?.[0]?.content?.parts;
              if (Array.isArray(parts)) {
                for (const p of parts) if (p?.text) raw += p.text;
              }
            } catch {
              /* linha SSE incompleta é improvável (payload é 1 linha); ignora */
            }
          }

          const { titulo, html } = extrairParcial(raw);
          if (titulo && titulo !== sentTitulo) {
            sentTitulo = titulo;
            send({ type: 'titulo', titulo });
          }
          if (html && html !== sentHtml) {
            sentHtml = html;
            send({ type: 'delta', html });
          }
        }

        // Parse final limpo.
        const match = raw.match(/\{[\s\S]*\}/);
        let parsed: Record<string, unknown> | null = null;
        if (match) {
          try { parsed = JSON.parse(match[0]); } catch { parsed = null; }
        }

        if (!parsed) {
          await devolverQuota(ctx.uid);
          send({ type: 'error', error: 'A resposta foi interrompida antes de terminar. Tente novamente com uma passagem menor.' });
        } else {
          const resultado = montarResultado(parsed, ctx.referencia, ctx.publicoId);
          const validacao = validarResultado(resultado.html, ctx.modoId);
          if (!validacao.valido) {
            await devolverQuota(ctx.uid);
            send({ type: 'error', error: validacao.erro });
          } else {
            send({ type: 'done', result: resultado });
          }
        }
      } catch (e) {
        console.error('Erro no stream:', e);
        await devolverQuota(ctx.uid);
        send({ type: 'error', error: 'Erro durante a geração. Tente novamente.' });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: sseHeaders() });
}

function sseHeaders(): HeadersInit {
  return {
    ...CORS,
    'content-type': 'text/event-stream; charset=utf-8',
    'cache-control': 'no-cache',
    connection: 'keep-alive',
  };
}

/**
 * Extrai, de forma tolerante, os campos "titulo" e "html" de um JSON ainda
 * incompleto (streaming). Faz o unescape das sequências JSON encontradas.
 */
function extrairParcial(bruto: string): { titulo?: string; html?: string } {
  let s = bruto.trimStart();
  if (s.startsWith('```')) s = s.replace(/^```(json)?/i, '');
  return { titulo: extrairCampo(s, 'titulo'), html: extrairCampo(s, 'html') };
}

function extrairCampo(s: string, campo: string): string | undefined {
  const chave = `"${campo}"`;
  const i = s.indexOf(chave);
  if (i < 0) return undefined;
  let j = s.indexOf(':', i + chave.length);
  if (j < 0) return undefined;
  j++;
  while (j < s.length && (s[j] === ' ' || s[j] === '\n' || s[j] === '\t' || s[j] === '\r')) j++;
  if (s[j] !== '"') return undefined;
  j++;
  let out = '';
  let k = j;
  while (k < s.length) {
    const c = s[k];
    if (c === '\\') {
      const n = s[k + 1];
      if (n === undefined) break; // escape incompleto no fim do buffer
      switch (n) {
        case 'n': out += '\n'; break;
        case 't': out += '\t'; break;
        case 'r': out += '\r'; break;
        case '"': out += '"'; break;
        case '\\': out += '\\'; break;
        case '/': out += '/'; break;
        case 'b': out += '\b'; break;
        case 'f': out += '\f'; break;
        case 'u': {
          const hex = s.slice(k + 2, k + 6);
          if (hex.length < 4) { k = s.length; break; } // \u incompleto
          out += String.fromCharCode(parseInt(hex, 16));
          k += 4;
          break;
        }
        default: out += n;
      }
      k += 2;
      continue;
    }
    if (c === '"') break; // aspas de fechamento
    out += c;
    k++;
  }
  return out;
}

function montarResultado(
  parsed: Record<string, unknown>,
  referencia: string,
  publicoId: string,
) {
  const meta = (parsed.meta ?? {}) as Record<string, unknown>;
  return {
    titulo: (parsed.titulo as string) ?? referencia,
    html: sanitizarHtml((parsed.html as string) ?? ''),
    meta: {
      fontes: (meta.fontes as string) ?? '—',
      profundidade: (meta.profundidade as string) ?? '—',
      publico: publicoId,
      tempo: (meta.tempo as string) ?? '—',
      classificacao: (meta.classificacao as string) ?? '—',
    },
    demo: false,
  };
}

/**
 * Teto de tokens de saída por modo.
 *
 * CUIDADO AO MEXER: em português, 1 palavra gasta cerca de 2 tokens, e ainda há
 * as tags HTML e o escape do JSON por cima. Os valores antigos ficavam ABAIXO do
 * tamanho que o próprio prompt pedia — o texto era cortado no meio ou o modelo
 * "economizava" para caber, e o material chegava raso ao assinante.
 * Regra: tokens >= palavras alvo x 3.
 */
function limiteDeSaida(modoId: string): number {
  const limites: Record<string, number> = {
    devocional: 2500,    // 400 palavras
    estudo: 14000,       // 3.000 palavras
    sermao: 12000,       // 2.600 palavras
    exegese: 20000,      // 4.500 palavras
    curso: 14000,        // 3.000 palavras
    pergunte_texto: 11000,
    pequeno_grupo: 11000,
    discipulado: 11000,
    apologetica: 12000,
  };
  return limites[modoId] ?? 12000;
}

function validarResultado(html: string, modoId: string): { valido: boolean; erro: string } {
  if (!html.trim()) return { valido: false, erro: 'A IA não gerou conteúdo. Tente novamente.' };
  const secoes = SECOES_OBRIGATORIAS[modoId] ?? [];
  const faltantes = secoes.filter((secao) => !new RegExp(`<h4[^>]*>\\s*${escaparRegex(secao)}\\s*</h4>`, 'i').test(html));
  if (faltantes.length) {
    return { valido: false, erro: `O material ficou incompleto (${faltantes.slice(0, 3).join(', ')}). Tente novamente com uma passagem menor.` };
  }
  return { valido: true, erro: '' };
}

function escaparRegex(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Remove tags e atributos que não fazem parte do contrato de saída do modelo. */
function sanitizarHtml(html: string): string {
  const permitidas = new Set(['p', 'h4', 'ul', 'li', 'blockquote', 'cite', 'strong', 'em', 'br', 'span']);
  return html.replace(/<\/?([a-zA-Z0-9]+)(?:\s+[^>]*)?>/g, (tag, nome: string) => {
    const tagNome = nome.toLowerCase();
    if (!permitidas.has(tagNome)) return '';
    if (tag.startsWith('</')) return `</${tagNome}>`;
    if (tagNome !== 'span') return `<${tagNome}>`;
    const classe = tag.match(/class\s*=\s*["']([^"']+)["']/i)?.[1] ?? '';
    const valida = /^selo selo-(escritura|consenso|aceita|debatida|hipotese|tradicao)$/.test(classe);
    return valida ? `<span class="${classe}">` : '<span>';
  });
}

function metaVazia(publicoId: string) {
  return { fontes: '—', profundidade: '—', publico: publicoId, tempo: '—', classificacao: '—' };
}

// ---------- Chamada ao Gemini com retry + fallback ----------

/**
 * Tenta o modelo principal (com retries) e, se falhar por sobrecarga, o modelo
 * reserva. `stream=true` usa streamGenerateContent?alt=sse e devolve a Response
 * SEM consumir o corpo (para o chamador ler o stream).
 */
async function chamarComRetry(
  apiKey: string,
  body: string,
  stream: boolean,
): Promise<{ resp: Response | null; erro: { status: number; msg: string } }> {
  const modelos = MODELO_RESERVA && MODELO_RESERVA !== MODELO_PRINCIPAL
    ? [MODELO_PRINCIPAL, MODELO_RESERVA]
    : [MODELO_PRINCIPAL];

  const metodo = stream ? 'streamGenerateContent?alt=sse' : 'generateContent';
  let erro = { status: 0, msg: '' };

  for (const modelo of modelos) {
    for (let tentativa = 0; tentativa < 3; tentativa++) {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:${metodo}`;
      let resp: Response;
      try {
        resp = await fetch(endpoint, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
          body,
        });
      } catch (e) {
        erro = { status: 0, msg: e instanceof Error ? e.message : 'rede' };
        await esperar(700 * (tentativa + 1));
        continue;
      }

      if (resp.ok) return { resp, erro };

      const errBody = await resp.text();
      let gmsg = '';
      try { gmsg = JSON.parse(errBody)?.error?.message ?? ''; } catch { /* */ }
      erro = { status: resp.status, msg: gmsg };
      console.error(`Gemini ${modelo} ${resp.status}:`, gmsg);

      if (TRANSIENTES.includes(resp.status) && tentativa < 2) {
        await esperar(700 * (tentativa + 1));
        continue;
      }
      break; // erro não transitório: passa para o próximo modelo (ou encerra)
    }
  }

  return { resp: null, erro };
}

function esperar(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Busca a chave: 1º env (secret), 2º Vault do banco (via RPC restrita ao service_role). */
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
