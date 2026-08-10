import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase';

export interface EstudoMeta {
  fontes: string;
  profundidade: string;
  publico: string;
  tempo: string;
  classificacao: string;
}

export interface EstudoResultado {
  titulo: string;
  html: string;
  meta: EstudoMeta;
  demo?: boolean;
}

export interface GerarEstudoParams {
  modoId: string;
  publicoId: string;
  referencia: string;
  perfilId?: string;
}

/**
 * Chama a edge function `gerar` (Supabase) para produzir o material de estudo.
 * A chave da Anthropic fica apenas no servidor; aqui enviamos só os parâmetros.
 * O token do usuário é anexado automaticamente pelo supabase-js (verify_jwt = true).
 */
export async function gerarEstudo(params: GerarEstudoParams): Promise<EstudoResultado> {
  const referencia = params.referencia.trim();
  if (!referencia) {
    throw new Error('Informe um texto, tema ou referência bíblica.');
  }
  if (referencia.length > 200) {
    throw new Error('A referência está muito longa (máximo de 200 caracteres).');
  }

  const { data, error } = await supabase.functions.invoke<EstudoResultado & { error?: string }>(
    'gerar',
    { body: { ...params, referencia } }
  );

  if (error) {
    // FunctionsHttpError expõe a resposta original em `context`.
    let detalhe = '';
    try {
      const ctx = (error as { context?: unknown }).context;
      if (ctx && typeof (ctx as Response).json === 'function') {
        const body = await (ctx as Response).json();
        detalhe = body?.error ?? '';
      }
    } catch {
      /* ignora falha ao ler o corpo do erro */
    }
    throw new Error(detalhe || 'Não foi possível gerar o material. Tente novamente.');
  }

  if (!data || data.error) {
    throw new Error(data?.error || 'Resposta inesperada do servidor.');
  }

  return data;
}

/** Callbacks do streaming. */
export interface GerarEstudoStreamCallbacks {
  /** Título do material, assim que fica disponível. */
  onTitulo?: (titulo: string) => void;
  /** HTML acumulado até o momento (renderizar como está). */
  onDelta?: (htmlParcial: string) => void;
  /** Resultado final, limpo e com meta completa. */
  onDone: (resultado: EstudoResultado) => void;
  /**
   * Erro durante a geração. `code` vem do servidor e identifica bloqueios de
   * franquia: 'trial_exhausted' (acabaram as gerações do teste grátis) e
   * 'quota_exhausted' (assinante bateu o limite do mês).
   */
  onError: (mensagem: string, code?: string) => void;
}

/**
 * Versão em streaming: chama a edge function `gerar` com Accept text/event-stream
 * e vai reportando o material conforme ele é gerado (evita a sensação de espera).
 * Faz fetch direto na URL da função (o supabase-js não expõe o corpo em stream).
 *
 * Retorna uma função para abortar a geração (ex.: ao desmontar o componente).
 */
export function gerarEstudoStream(
  params: GerarEstudoParams,
  cb: GerarEstudoStreamCallbacks,
): () => void {
  const controller = new AbortController();

  (async () => {
    const referencia = params.referencia.trim();
    if (!referencia) {
      cb.onError('Informe um texto, tema ou referência bíblica.');
      return;
    }
    if (referencia.length > 200) {
      cb.onError('A referência está muito longa (máximo de 200 caracteres).');
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token ?? SUPABASE_ANON_KEY;

      const resp = await fetch(`${SUPABASE_URL}/functions/v1/gerar`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'text/event-stream',
          apikey: SUPABASE_ANON_KEY,
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...params, referencia, stream: true }),
        signal: controller.signal,
      });

      if (!resp.ok || !resp.body) {
        // Erro antes do stream (ex.: 400/402/429 com JSON). Tenta extrair a mensagem
        // e o código — é por ele que a tela sabe abrir o convite de assinatura.
        let msg = 'Não foi possível gerar o material. Tente novamente.';
        let code: string | undefined;
        try {
          const body = await resp.json();
          if (body?.error) msg = body.error;
          if (body?.code) code = String(body.code);
        } catch { /* corpo não-JSON */ }
        cb.onError(msg, code);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let finalizado = false;

      const processarEvento = (raw: string) => {
        // Um evento SSE pode ter várias linhas "data:"; junta os payloads.
        const linhas = raw.split('\n');
        const dados = linhas
          .filter((l) => l.startsWith('data:'))
          .map((l) => l.slice(5).trimStart())
          .join('\n');
        if (!dados) return;

        let msg: {
          type: string;
          titulo?: string;
          html?: string;
          result?: EstudoResultado;
          error?: string;
        };
        try {
          msg = JSON.parse(dados);
        } catch {
          return;
        }

        switch (msg.type) {
          case 'titulo':
            if (msg.titulo) cb.onTitulo?.(msg.titulo);
            break;
          case 'delta':
            if (typeof msg.html === 'string') cb.onDelta?.(msg.html);
            break;
          case 'done':
            if (msg.result) {
              finalizado = true;
              cb.onDone(msg.result);
            }
            break;
          case 'error':
            finalizado = true;
            cb.onError(msg.error || 'Erro ao gerar o material.');
            break;
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // Eventos SSE são separados por linha em branco (\n\n).
        let sep: number;
        while ((sep = buffer.indexOf('\n\n')) >= 0) {
          const evento = buffer.slice(0, sep);
          buffer = buffer.slice(sep + 2);
          processarEvento(evento);
        }
      }
      // Processa um eventual último evento sem \n\n final.
      if (buffer.trim()) processarEvento(buffer);

      if (!finalizado) {
        cb.onError('A geração foi interrompida antes de terminar. Tente novamente.');
      }
    } catch (err) {
      if (controller.signal.aborted) return; // cancelamento intencional
      cb.onError(err instanceof Error ? err.message : 'Erro ao gerar o material.');
    }
  })();

  return () => controller.abort();
}
