# Infraestrutura de SEO programático

O site tinha **uma** página indexável. Isto aqui é a máquina que transforma o motor
de geração — o mesmo que os assinantes usam — em milhares de páginas públicas que
o Google consegue ler, ranquear e mandar tráfego.

Custo de mídia: **zero**. Custo real: dezenas de reais em tokens, uma única vez.

---

## Antes de rodar

**1. Criar a tabela.** ✅ **Já aplicado em produção** em 21/07/2026. O arquivo
`seo/sql/001_seo_pages.sql` é o estado consolidado, caso precise recriar do zero.

**2. Credenciais.** Um comando resolve o secret `SEO_TOKEN` e a chave `service_role`:

```bash
npm run seo:configurar
```

O script lê o token do `.env.seo` (já gerado), manda para os secrets do Supabase,
busca a `service_role` pela CLI e grava de volta no arquivo. Nenhum valor aparece
na tela nem no histórico do shell. Se a CLI não devolver a chave, ele avisa e
mostra o caminho manual — o resto já terá sido feito.

**3. Publicar a função `gerar`** (ela precisa enxergar o novo secret):

```bash
npx supabase functions deploy gerar --project-ref nrizmanwdipuowpkmqqm
```

**4. No Vercel**, adicione `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` às variáveis
de ambiente do projeto — o build precisa delas para emitir o HTML estático.
Sem elas o build do app continua funcionando; só não sai página nova.

> **Sobre o `.env.seo`:** fica no `.gitignore`, com permissão 600. A chave
> `service_role` ignora toda a RLS do banco — trate como senha de administrador.

---

## O ciclo

```bash
npm run seo:minerar                  # 1. o que o mercado digita (autocomplete Google + YouTube)
npm run seo:fila                     # 2. vira um plano de páginas
npm run seo:gerar -- --limite 20     # 3. gera 20 e grava como RASCUNHO
npm run seo:publicar -- --ver 3      # 4. LEIA antes de soltar
npm run seo:publicar -- --lote 40    #    publica as 40 mais antigas
npm run build                        # 5. o HTML estático sai dentro de dist/
```

Depois é rotina: `seo:gerar` de vez em quando, `seo:publicar --lote 40` por dia,
e o deploy leva as novas páginas.

---

## Por que cada decisão é assim

**HTML estático, sem React.** O app é 100% client-side. O Google até executa
JavaScript, mas com fila, atraso e falha. Página de conteúdo precisa existir no
primeiro byte — por isso `seo/lib/template.mjs` emite HTML puro com CSS embutido,
que funciona até com JS desligado.

**Rascunho por padrão.** Publicar 2.000 páginas no mesmo dia é o padrão clássico
que o Google reconhece como spam. 40 por dia parece um site que cresce. E o freio
existe também para você **ler antes de soltar**: página ruim indexada é dívida.

**Prévia de 2 seções, com mínimo de palavras.** Abaixo de ~450 palavras a página
vira conteúdo raso e não ranqueia — aí não existe tráfego para converter. O corte é
gravado no banco na hora da geração, não recalculado no build: assim a página que o
Google indexou hoje é a mesma amanhã.

**Links internos obrigatórios.** Cada página aponta para as vizinhas do mesmo grupo
(capítulos do mesmo livro, termos da mesma semente) e os índices `/estudo/`,
`/tema/`, `/sermao/` funcionam como hubs. Página órfã não recebe autoridade — é o
erro que mata a maioria dos projetos de conteúdo programático.

**O robô não consome franquia de ninguém.** A edge function reconhece o header
`x-seo-token` (comparação de tempo constante, mínimo de 32 caracteres) e pula a
verificação de assinatura. Sem o secret configurado, esse caminho não existe.

---

## Arquivos

| Arquivo | O que faz |
|---|---|
| `config.mjs` | Toda decisão de negócio: prefixos de URL, tamanho da prévia, ritmo |
| `1-minerar.mjs` | Autocomplete Google + YouTube → `data/palavras-chave.json` |
| `2-fila.mjs` | 1.189 capítulos + termos minerados → `data/fila.json` |
| `3-gerar.mjs` | Chama `gerar`, corta a prévia, grava rascunhos (retomável) |
| `4-publicar.mjs` | Ver, conferir e publicar em lotes |
| `5-estatico.mjs` | Banco → `dist/` (páginas, índices, sitemaps, robots) |
| `lib/previa.mjs` | Onde o conteúdo é cortado |
| `lib/template.mjs` | O HTML, o CSS e os dados estruturados |
| `lib/ensaios.mjs` | **Páginas fixas, escritas à mão** (ver abaixo) |
| `lib/template-ensaio.mjs` | Renderizador dos ensaios, com schema de FAQ |
| `sql/001_seo_pages.sql` | Tabela, view pública, RLS e `publicar_lote()` |

---

## Ensaios — as páginas que ganham confiança

`seo/lib/ensaios.mjs` guarda páginas **escritas à mão**, não geradas pelo modelo.
Elas saem no build junto com o resto e entram sozinhas no sitemap e no robots.

A primeira é `/usar-ia-para-pregar`, e ela existe por um motivo estratégico:
há gente digitando "posso usar IA para preparar sermão" com angústia real, sem
encontrar nenhuma resposta séria — só opinião solta em grupo de WhatsApp. Quem
busca isso é exatamente o seu público, no momento exato da dúvida.

**A regra desta pasta:** o texto tem que se sustentar sozinho, como artigo.
O ensaio de IA diz abertamente onde a ferramenta **não** deve ser usada e reconhece
que cristãos sérios discordam. É isso que o torna crível — e é por isso que ele
converte melhor que qualquer página de vendas sobre o mesmo assunto.

Para acrescentar outro, copie a estrutura do objeto existente. Os campos `faq`
viram schema `FAQPage`, que faz o Google exibir as respostas direto no resultado
de busca — ocupando muito mais tela que um link comum.

Ideias com a mesma lógica: "quanto tempo leva para preparar um sermão",
"como preparar uma aula de EBD do zero", "o que é exegese e como fazer".

---

## Depois do primeiro deploy

1. **Google Search Console** → enviar `https://www.bibliaexpositivapv.com.br/sitemap.xml`
   (é um índice de sitemaps; o Google segue os filhos sozinho).
2. Pedir indexação manual da home e de 2 ou 3 páginas de conteúdo — acelera o
   primeiro rastreamento.
3. Conferir com "Inspecionar URL" se o Google vê o **texto** da página, não uma casca.
4. Em 30 dias, olhar quais padrões de busca aparecem em Desempenho e **dobrar
   naqueles** — a fila é só uma hipótese até os dados chegarem.

## Sinais de alerta

- `npm run seo:publicar` avisa quantas páginas têm prévia abaixo de 400 palavras.
  Se forem muitas, o problema é o prompt, não o corte.
- Se o Search Console marcar "Rastreada – no momento não indexada" em massa, você
  publicou rápido demais ou raso demais. Pare de publicar e melhore a densidade.
- Se `5-estatico.mjs` disser "pulando geração estática", faltam as variáveis de
  ambiente no Vercel. O build do app não quebra — de propósito.
