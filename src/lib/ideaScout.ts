import type { Channel } from "../types";
import type { YouTubeMarketScan } from "./youtubeApi";

// ─── Storage keys ─────────────────────────────────────────────────────────────

export const ANTHROPIC_KEY_STORAGE = "creator-board-anthropic-key-v1";
export const SCOUT_STORAGE_KEY = "creator-board-scout-v1";
export const SCOUT_MODEL_KEY = "creator-board-scout-model-v1";

export const SCOUT_MODELS = [
  { id: "claude-opus-4-8", label: "Claude Opus 4.8 — máxima qualidade (recomendado)" },
  { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6 — mais rápido e barato" },
] as const;

export const DEFAULT_SCOUT_MODEL = "claude-opus-4-8";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ScoutProfile = {
  channelName: string;
  niche: string; // 1 frase
  language: string;
  audience: string; // idade, dor/interesse, país
  format: "com rosto" | "faceless" | "outro";
  style: string; // ensaio, lista, review, narração dark...
  provenFormats: string; // formatos que JÁ performaram
  flopFormats: string; // formatos que flopam / evitar
  tone: string; // 1 frase
  competitors: string; // canais gringos de referência
  constraints: string; // restrições de produção
  searchKeywordsEn: string; // keywords EN para guiar a pesquisa
  reportLanguage: "PT-BR" | "EN";
};

export type ScoutScores = {
  aderencia: number;
  audiencia: number;
  momentum: number;
  saturacao: number;
  viabilidade: number;
  hook: number;
};

export type ScoutVerdict = "FAZER_JA" | "TESTAR_COM_CUIDADO" | "DEIXAR_PRA_LA";

export type ScoutIdea = {
  rank: number;
  title: string;
  title_en: string;
  angle_hook: string;
  why_can_pop: string;
  risks: string;
  scores: ScoutScores;
  fit_total: number;
  verdict: ScoutVerdict;
  verdict_reason: string;
  evidence: string[];
};

export type ScoutSelfEval = {
  research_quality: number;
  channel_fit: number;
  honesty: number;
  hook_strength: number;
  how_to_improve: string;
};

export type ScoutReport = {
  dna: string;
  market_summary: string;
  ideas: ScoutIdea[];
  discarded: Array<{ idea: string; reason: string }>;
  self_eval: ScoutSelfEval;
  refine_paths: string[];
};

export type ScoutRun = {
  id: string;
  channelId: string;
  createdAt: string;
  model: string;
  usedYouTubeData: boolean;
  refineInstruction: string;
  report: ScoutReport;
};

export type ScoutState = {
  profiles: Record<string, ScoutProfile>;
  runs: ScoutRun[];
};

export type ScoutProgressEvent = {
  phase: "starting" | "searching" | "analyzing" | "reporting" | "continuing";
  detail: string;
  searchCount: number;
};

// ─── Profile helpers ──────────────────────────────────────────────────────────

export const EMPTY_SCOUT_PROFILE: ScoutProfile = {
  channelName: "",
  niche: "",
  language: "Português (Brasil)",
  audience: "",
  format: "faceless",
  style: "",
  provenFormats: "",
  flopFormats: "",
  tone: "",
  competitors: "",
  constraints: "",
  searchKeywordsEn: "",
  reportLanguage: "PT-BR",
};

export function buildProfileFromChannel(channel: Channel | null): ScoutProfile {
  if (!channel) return { ...EMPTY_SCOUT_PROFILE };
  const nicheParts = [channel.niche, channel.promise].filter(Boolean).join(" — ");
  return {
    ...EMPTY_SCOUT_PROFILE,
    channelName: channel.name,
    niche: nicheParts,
    audience: channel.audience,
    style: channel.formats,
    competitors: channel.competitors,
    searchKeywordsEn: channel.keywords,
  };
}

export function profileIsReady(p: ScoutProfile): { ok: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!p.niche.trim()) missing.push("Nicho");
  if (!p.audience.trim()) missing.push("Audiência-alvo");
  if (!p.format) missing.push("Formato");
  return { ok: missing.length === 0, missing };
}

// ─── Storage ──────────────────────────────────────────────────────────────────

export function loadScoutState(): ScoutState {
  try {
    const raw = localStorage.getItem(SCOUT_STORAGE_KEY);
    if (!raw) return { profiles: {}, runs: [] };
    const parsed = JSON.parse(raw) as Partial<ScoutState>;
    return {
      profiles: parsed.profiles && typeof parsed.profiles === "object" ? (parsed.profiles as Record<string, ScoutProfile>) : {},
      runs: Array.isArray(parsed.runs) ? (parsed.runs as ScoutRun[]) : [],
    };
  } catch {
    return { profiles: {}, runs: [] };
  }
}

export function saveScoutState(state: ScoutState): void {
  try {
    localStorage.setItem(SCOUT_STORAGE_KEY, JSON.stringify(state));
  } catch { /* quota — silently drop */ }
}

export function loadAnthropicKey(): string {
  try {
    return localStorage.getItem(ANTHROPIC_KEY_STORAGE) || "";
  } catch {
    return "";
  }
}

export function saveAnthropicKey(key: string): void {
  try {
    if (key) localStorage.setItem(ANTHROPIC_KEY_STORAGE, key);
    else localStorage.removeItem(ANTHROPIC_KEY_STORAGE);
  } catch { /* silent */ }
}

export function loadScoutModel(): string {
  try {
    const stored = localStorage.getItem(SCOUT_MODEL_KEY);
    return SCOUT_MODELS.some((m) => m.id === stored) ? (stored as string) : DEFAULT_SCOUT_MODEL;
  } catch {
    return DEFAULT_SCOUT_MODEL;
  }
}

export function saveScoutModel(model: string): void {
  try {
    localStorage.setItem(SCOUT_MODEL_KEY, model);
  } catch { /* silent */ }
}

// ─── YouTube data condenser ──────────────────────────────────────────────────

export function condenseMarketScan(scan: YouTubeMarketScan) {
  return {
    query: scan.query,
    period_days: scan.days,
    total_videos_found: scan.totalVideos,
    average_views: scan.averageViews,
    market_opportunity: scan.opportunity,
    top_videos: scan.videos.slice(0, 12).map((v) => ({
      title: v.title,
      channel: v.channelTitle,
      views: v.views,
      channel_subscribers: v.subscribers,
      views_per_sub_ratio: v.subscribers > 0 ? Number((v.views / v.subscribers).toFixed(2)) : null,
      is_outlier: v.subscribers > 0 && v.subscribers < 200_000 && v.views / v.subscribers >= 2,
      published_at: v.publishedAt,
      duration: v.durationLabel,
    })),
    common_title_terms: scan.titleTerms.slice(0, 10),
    viewer_complaints: scan.viewerComplaints.slice(0, 6),
  };
}

// ─── Agent definition ─────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Você é o Caçador de Ideias (YouTube Idea Scout) — um estrategista de conteúdo de YouTube sênior, especializado em achar ideias de vídeo com alto potencial e em dizer a verdade sobre o que vai funcionar e o que vai flopar.

Você NÃO é um gerador de ideias genéricas: você é o filtro crítico que separa "ideia legal" de "ideia que ESTE canal específico consegue executar e fazer bombar".

## MISSÃO (em cada execução)
1. Entender o canal a fundo (nicho, audiência, formato, tom, o que já funcionou).
2. Pesquisar o que está performando no mercado internacional (gringa) dentro desse nicho.
3. Gerar 20-30 candidatos internamente, filtrar com critério e entregar as 10 ideias mais promissoras, cada uma com análise crítica de fit.

Você prioriza HONESTIDADE BRUTAL sobre otimismo vazio. Se uma ideia não faz sentido para o canal, você diz — e explica o porquê.

## FERRAMENTAS
- **web_search**: sua fonte primária de "está bombando ou não". Pesquise SEMPRE em inglês para capturar o mercado gringo. Use para: vídeos recentes (~90 dias) com performance acima da média no nicho; outliers (vídeos de canais pequenos que estouraram = demanda reprimida); palavras-chave/temas em ascensão; tendências culturais, lançamentos, polêmicas, sazonalidade; ângulos que a gringa já validou mas ainda têm espaço.
- **Dados reais do YouTube** (quando fornecidos no contexto): views, inscritos e ratio views/inscritos REAIS coletados via YouTube Data API. Trate como sua fonte mais confiável de números.
- **deliver_report**: ferramenta OBRIGATÓRIA para entregar o relatório final. Chame exatamente UMA vez, ao final, depois de toda a pesquisa.

## FLUXO DE TRABALHO (siga nesta ordem)
1. **Carregar contexto** — leia o bloco do canal e resuma mentalmente o "DNA" em 1 linha (vai no campo dna do relatório).
2. **Pesquisa internacional** — faça MÚLTIPLAS buscas em inglês (mínimo 4-6 buscas diferentes). Se uma busca não trouxer nada relevante, reformule e tente de novo antes de desistir.
3. **Gerar candidatos** — produza 20-30 ideias brutas internamente. Volume primeiro, filtro depois. Não se autocensure nessa fase.
4. **Filtro crítico** — avalie cada candidato pelos critérios abaixo. Corte sem dó o que não passa.
5. **Ranquear o Top 10** — ordene por potencial real PARA ESTE CANAL, não por potencial absoluto.
6. **Análise crítica individual** — veredito honesto para cada uma das 10.

## CRITÉRIOS DE AVALIAÇÃO (pontue 0-5 cada)
- **aderencia** — encaixa no DNA do canal ou força a barra?
- **audiencia** — a pessoa que assiste esse canal CLICARIA nisso?
- **momentum** — a tendência está subindo, no pico ou já morreu?
- **saturacao** — já tem 50 vídeos iguais ou é espaço aberto? (5 = espaço aberto)
- **viabilidade** — dá pra fazer com o formato e os recursos do canal? (ideia que exige rosto num canal faceless = nota baixa)
- **hook** — tem um gancho forte ou é morno?

Uma ideia com aderência 5 mas viabilidade 1 NÃO entra no Top 10. Fit > potencial absoluto.

## REGRAS DE COMPORTAMENTO
- **Seja brutalmente honesto.** Sua função é evitar que o canal queime tempo. Elogio fácil não ajuda ninguém.
- **NUNCA invente dados.** Números (views, inscritos, volume) só podem vir dos resultados de busca ou dos dados do YouTube fornecidos. Sem fonte = sem número. Quando não validar algo, escreva "não consegui validar" — nunca estime de cabeça.
- **Fit > hype.** Uma ideia viral genérica que não combina com o canal vale menos que uma ideia média perfeitamente alinhada.
- **Ângulo > tema.** "Persona 6" não é ideia; "Por que a espera por Persona 6 está quebrando a comunidade" é ideia. Todo título deve carregar um ângulo.
- **Justifique o corte.** Liste em discarded pelo menos 5 ideias descartadas com o motivo de cada corte.
- **Inclua no Top 10 pelo menos 1-2 ideias com veredito DEIXAR_PRA_LA** com explicação — isso mostra que o filtro está funcionando e que a lista não é só elogio.
- **Títulos prontos pra thumbnail**: curtos, com gancho. O campo title vai no idioma do canal; title_en é a versão em inglês.
- **evidence**: para cada ideia, liste os fatos/números da pesquisa que a sustentam, citando a fonte (ex: "vídeo X do canal Y: 2.1M views em 3 semanas, canal com 80k inscritos — busca web"). Se não houver validação, deixe o array vazio e seja honesto no risco.

## AUTOAVALIAÇÃO
Ao final, avalie a própria entrega (0-5) em: qualidade da pesquisa (dados reais usados), aderência das ideias ao canal, honestidade do filtro crítico, força dos hooks/títulos. Aponte como melhorar.

Em refine_paths, ofereça 2-3 caminhos de refino concretos (ex: "aprofundar as 3 do topo em roteiro", "rodar de novo focando só em formato lista", "buscar ângulos de Shorts").

## IDIOMA
Escreva o relatório no idioma indicado no contexto do canal (campo "Idioma do relatório"). Pense e pesquise em inglês, entregue no idioma pedido.`;

const SCORE_SCHEMA = { type: "integer", enum: [0, 1, 2, 3, 4, 5] } as const;

const DELIVER_REPORT_TOOL = {
  name: "deliver_report",
  description:
    "Entrega o relatório final do Caçador de Ideias. Chame exatamente uma vez, ao final de toda a pesquisa e análise, com o Top 10 completo.",
  strict: true,
  input_schema: {
    type: "object" as const,
    additionalProperties: false,
    required: ["dna", "market_summary", "ideas", "discarded", "self_eval", "refine_paths"],
    properties: {
      dna: {
        type: "string",
        description: "Resumo de 1 linha do DNA do canal usado como filtro de todas as decisões",
      },
      market_summary: {
        type: "string",
        description: "2-4 frases sobre o que a pesquisa internacional mostrou (tendências, outliers, espaços abertos)",
      },
      ideas: {
        type: "array",
        description: "Exatamente 10 ideias, ordenadas da melhor (rank 1) para a pior (rank 10)",
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "rank", "title", "title_en", "angle_hook", "why_can_pop", "risks",
            "scores", "fit_total", "verdict", "verdict_reason", "evidence",
          ],
          properties: {
            rank: { type: "integer", description: "1 a 10" },
            title: { type: "string", description: "Título no idioma do canal, pronto para thumbnail (curto, com gancho)" },
            title_en: { type: "string", description: "Versão em inglês do título" },
            angle_hook: { type: "string", description: "O ângulo e o gancho de abertura do vídeo" },
            why_can_pop: { type: "string", description: "Por que PODE bombar — com base na pesquisa" },
            risks: { type: "string", description: "Riscos / por que pode flopar" },
            scores: {
              type: "object",
              additionalProperties: false,
              required: ["aderencia", "audiencia", "momentum", "saturacao", "viabilidade", "hook"],
              properties: {
                aderencia: SCORE_SCHEMA,
                audiencia: SCORE_SCHEMA,
                momentum: SCORE_SCHEMA,
                saturacao: SCORE_SCHEMA,
                viabilidade: SCORE_SCHEMA,
                hook: SCORE_SCHEMA,
              },
            },
            fit_total: { type: "integer", description: "Soma dos 6 critérios (0-30)" },
            verdict: { type: "string", enum: ["FAZER_JA", "TESTAR_COM_CUIDADO", "DEIXAR_PRA_LA"] },
            verdict_reason: { type: "string", description: "Por quê, em 1 frase" },
            evidence: {
              type: "array",
              items: { type: "string" },
              description: "Fatos/números da pesquisa que sustentam a ideia, com fonte. Vazio se nada foi validado.",
            },
          },
        },
      },
      discarded: {
        type: "array",
        description: "Pelo menos 5 ideias descartadas no filtro, cada uma com motivo",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["idea", "reason"],
          properties: {
            idea: { type: "string" },
            reason: { type: "string" },
          },
        },
      },
      self_eval: {
        type: "object",
        additionalProperties: false,
        required: ["research_quality", "channel_fit", "honesty", "hook_strength", "how_to_improve"],
        properties: {
          research_quality: SCORE_SCHEMA,
          channel_fit: SCORE_SCHEMA,
          honesty: SCORE_SCHEMA,
          hook_strength: SCORE_SCHEMA,
          how_to_improve: { type: "string" },
        },
      },
      refine_paths: {
        type: "array",
        items: { type: "string" },
        description: "2-3 caminhos de refino concretos para a próxima rodada",
      },
    },
  },
};

// ─── Context builder ──────────────────────────────────────────────────────────

function buildUserMessage(
  profile: ScoutProfile,
  youtubeData: ReturnType<typeof condenseMarketScan>[],
  refineInstruction: string,
  previousTopTitles: string[],
): string {
  const lines = [
    `Data de hoje: ${new Date().toISOString().slice(0, 10)}`,
    "",
    "## CONTEXTO DO CANAL",
    `- Nome do canal: ${profile.channelName || "(não informado)"}`,
    `- Nicho: ${profile.niche}`,
    `- Idioma do conteúdo: ${profile.language}`,
    `- Audiência-alvo: ${profile.audience}`,
    `- Formato: ${profile.format}`,
    `- Estilo de vídeo: ${profile.style || "(não informado)"}`,
    `- Formatos que JÁ performaram bem: ${profile.provenFormats || "(não informado)"}`,
    `- Formatos que flopam / evitar: ${profile.flopFormats || "(não informado)"}`,
    `- Tom de voz: ${profile.tone || "(não informado)"}`,
    `- Concorrentes/referências (gringos): ${profile.competitors || "(não informado)"}`,
    `- Restrições de produção: ${profile.constraints || "(não informado)"}`,
    `- Palavras-chave para guiar a pesquisa (EN): ${profile.searchKeywordsEn || "(derive do nicho)"}`,
    `- Idioma do relatório de saída: ${profile.reportLanguage}`,
  ];

  if (youtubeData.length > 0) {
    lines.push(
      "",
      "## DADOS REAIS DO YOUTUBE (coletados agora via YouTube Data API — use como fonte primária de números)",
      "```json",
      JSON.stringify(youtubeData, null, 1),
      "```",
    );
  }

  if (previousTopTitles.length > 0) {
    lines.push(
      "",
      "## RODADA ANTERIOR (títulos já entregues — não repita, evolua)",
      ...previousTopTitles.map((t) => `- ${t}`),
    );
  }

  if (refineInstruction.trim()) {
    lines.push("", "## INSTRUÇÃO DE REFINO DESTA RODADA", refineInstruction.trim());
  }

  lines.push(
    "",
    "Execute o fluxo completo: pesquise o mercado gringo com web_search (mínimo 4-6 buscas), gere 20-30 candidatos, filtre, ranqueie e entregue o Top 10 chamando deliver_report.",
  );

  return lines.join("\n");
}

// ─── Report validation ────────────────────────────────────────────────────────

function clampScore(n: unknown): number {
  const v = Math.round(Number(n));
  return Number.isFinite(v) ? Math.min(5, Math.max(0, v)) : 0;
}

function normalizeReport(raw: unknown): ScoutReport {
  const r = (raw ?? {}) as Record<string, unknown>;
  const ideas = (Array.isArray(r.ideas) ? r.ideas : []).map((i, idx) => {
    const idea = (i ?? {}) as Record<string, unknown>;
    const s = (idea.scores ?? {}) as Record<string, unknown>;
    const scores: ScoutScores = {
      aderencia: clampScore(s.aderencia),
      audiencia: clampScore(s.audiencia),
      momentum: clampScore(s.momentum),
      saturacao: clampScore(s.saturacao),
      viabilidade: clampScore(s.viabilidade),
      hook: clampScore(s.hook),
    };
    const sum = scores.aderencia + scores.audiencia + scores.momentum + scores.saturacao + scores.viabilidade + scores.hook;
    const verdictRaw = String(idea.verdict || "");
    const verdict: ScoutVerdict =
      verdictRaw === "FAZER_JA" || verdictRaw === "TESTAR_COM_CUIDADO" || verdictRaw === "DEIXAR_PRA_LA"
        ? verdictRaw
        : "TESTAR_COM_CUIDADO";
    return {
      rank: Number(idea.rank) || idx + 1,
      title: String(idea.title || "").trim(),
      title_en: String(idea.title_en || "").trim(),
      angle_hook: String(idea.angle_hook || "").trim(),
      why_can_pop: String(idea.why_can_pop || "").trim(),
      risks: String(idea.risks || "").trim(),
      scores,
      fit_total: sum,
      verdict,
      verdict_reason: String(idea.verdict_reason || "").trim(),
      evidence: Array.isArray(idea.evidence) ? idea.evidence.map((e) => String(e)).filter(Boolean) : [],
    } satisfies ScoutIdea;
  }).filter((i) => i.title);

  const selfRaw = (r.self_eval ?? {}) as Record<string, unknown>;

  return {
    dna: String(r.dna || "").trim(),
    market_summary: String(r.market_summary || "").trim(),
    ideas: ideas.sort((a, b) => a.rank - b.rank),
    discarded: (Array.isArray(r.discarded) ? r.discarded : [])
      .map((d) => {
        const item = (d ?? {}) as Record<string, unknown>;
        return { idea: String(item.idea || "").trim(), reason: String(item.reason || "").trim() };
      })
      .filter((d) => d.idea),
    self_eval: {
      research_quality: clampScore(selfRaw.research_quality),
      channel_fit: clampScore(selfRaw.channel_fit),
      honesty: clampScore(selfRaw.honesty),
      hook_strength: clampScore(selfRaw.hook_strength),
      how_to_improve: String(selfRaw.how_to_improve || "").trim(),
    },
    refine_paths: (Array.isArray(r.refine_paths) ? r.refine_paths : []).map((p) => String(p)).filter(Boolean),
  };
}

// ─── Error mapping ────────────────────────────────────────────────────────────

function friendlyError(error: unknown): Error {
  const message = error instanceof Error ? error.message : String(error);
  if (/401|authentication/i.test(message)) {
    return new Error("Chave de API inválida ou revogada. Confira a chave em console.anthropic.com.");
  }
  if (/credit balance|billing/i.test(message)) {
    return new Error("Sua conta Anthropic está sem créditos. Adicione créditos em console.anthropic.com/settings/billing.");
  }
  if (/429|rate.?limit/i.test(message)) {
    return new Error("Limite de requisições atingido. Aguarde um minuto e tente de novo.");
  }
  if (/529|overloaded/i.test(message)) {
    return new Error("A API da Anthropic está sobrecarregada agora. Tente de novo em alguns minutos.");
  }
  if (/Failed to fetch|NetworkError|network/i.test(message)) {
    return new Error("Falha de rede ao chamar a API. Verifique sua conexão.");
  }
  return new Error(`Erro do agente: ${message}`);
}

// ─── Main agent loop ──────────────────────────────────────────────────────────

export type RunScoutParams = {
  profile: ScoutProfile;
  apiKey: string;
  model: string;
  youtubeScans: YouTubeMarketScan[];
  refineInstruction?: string;
  previousTopTitles?: string[];
  onProgress: (event: ScoutProgressEvent) => void;
};

export async function runIdeaScout(params: RunScoutParams): Promise<ScoutReport> {
  const { profile, apiKey, model, youtubeScans, onProgress } = params;
  const refineInstruction = params.refineInstruction ?? "";
  const previousTopTitles = params.previousTopTitles ?? [];

  // Dynamic import keeps the SDK out of the main bundle
  const { default: Anthropic } = await import("@anthropic-ai/sdk");

  const client = new Anthropic({
    apiKey,
    dangerouslyAllowBrowser: true,
    defaultHeaders: { "anthropic-dangerous-direct-browser-access": "true" },
    maxRetries: 2,
  });

  const youtubeData = youtubeScans.map(condenseMarketScan);
  const userMessage = buildUserMessage(profile, youtubeData, refineInstruction, previousTopTitles);

  const tools = [
    { type: "web_search_20260209" as const, name: "web_search" as const, max_uses: 12 },
    DELIVER_REPORT_TOOL,
  ];

  type MessageParam = { role: "user" | "assistant"; content: unknown };
  let messages: MessageParam[] = [{ role: "user", content: userMessage }];

  let searchCount = 0;
  let continuations = 0;
  let nudges = 0;
  const MAX_CONTINUATIONS = 10;

  onProgress({ phase: "starting", detail: "Carregando o DNA do canal e preparando a pesquisa…", searchCount });

  while (true) {
    const stream = client.messages.stream({
      model,
      max_tokens: 64000,
      thinking: { type: "adaptive" },
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tools: tools as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      messages: messages as any,
    });

    stream.on("streamEvent", (event) => {
      if (event.type === "content_block_start") {
        const block = event.content_block;
        if (block.type === "server_tool_use") {
          searchCount += 1;
          onProgress({
            phase: "searching",
            detail: `Pesquisando o mercado gringo… (busca ${searchCount})`,
            searchCount,
          });
        } else if (block.type === "web_search_tool_result") {
          onProgress({
            phase: "analyzing",
            detail: `Analisando resultados da busca ${searchCount}…`,
            searchCount,
          });
        } else if (block.type === "tool_use" && block.name === "deliver_report") {
          onProgress({
            phase: "reporting",
            detail: "Filtrando candidatos e montando o Top 10…",
            searchCount,
          });
        } else if (block.type === "thinking") {
          onProgress({
            phase: "analyzing",
            detail: searchCount > 0 ? "Cruzando achados com o DNA do canal…" : "Planejando a estratégia de pesquisa…",
            searchCount,
          });
        }
      }
    });

    let message;
    try {
      message = await stream.finalMessage();
    } catch (error) {
      throw friendlyError(error);
    }

    // Forced structured output: report delivered via tool call
    if (message.stop_reason === "tool_use") {
      const toolUse = message.content.find(
        (b) => b.type === "tool_use" && b.name === "deliver_report",
      );
      if (toolUse && toolUse.type === "tool_use") {
        return normalizeReport(toolUse.input);
      }
      // tool_use sem deliver_report não deveria acontecer (única client tool) — continue o loop
      messages = [...messages, { role: "assistant", content: message.content }];
      continue;
    }

    // Server tool loop paused — re-send to resume (per API docs)
    if (message.stop_reason === "pause_turn") {
      continuations += 1;
      if (continuations > MAX_CONTINUATIONS) {
        throw new Error("A pesquisa excedeu o limite de continuações. Tente novamente com menos palavras-chave.");
      }
      onProgress({
        phase: "continuing",
        detail: "Pesquisa longa — continuando de onde parou…",
        searchCount,
      });
      messages = [...messages, { role: "assistant", content: message.content }];
      continue;
    }

    // Model finished talking without calling the tool — nudge it (max 2x)
    if (message.stop_reason === "end_turn") {
      nudges += 1;
      if (nudges > 2) {
        throw new Error("O agente terminou sem entregar o relatório estruturado. Rode novamente.");
      }
      messages = [
        ...messages,
        { role: "assistant", content: message.content },
        {
          role: "user",
          content:
            "Agora chame a ferramenta deliver_report exatamente uma vez com o relatório completo (Top 10, descartadas, autoavaliação e caminhos de refino). Não escreva mais texto.",
        },
      ];
      continue;
    }

    if (message.stop_reason === "max_tokens") {
      throw new Error("O relatório excedeu o limite de tokens. Rode novamente — o agente vai ser mais conciso.");
    }

    if (message.stop_reason === "refusal") {
      throw new Error("O modelo recusou a tarefa. Revise o conteúdo do perfil do canal e tente novamente.");
    }

    throw new Error(`Parada inesperada do agente: ${message.stop_reason ?? "desconhecida"}`);
  }
}

// ─── Verdict display helpers ──────────────────────────────────────────────────

export const VERDICT_META: Record<ScoutVerdict, { label: string; badge: string; bar: string }> = {
  FAZER_JA: {
    label: "FAZER JÁ",
    badge: "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/30",
    bar: "bg-emerald-400",
  },
  TESTAR_COM_CUIDADO: {
    label: "TESTAR COM CUIDADO",
    badge: "bg-amber-500/15 text-amber-300 ring-1 ring-amber-400/30",
    bar: "bg-amber-400",
  },
  DEIXAR_PRA_LA: {
    label: "DEIXAR PRA LÁ",
    badge: "bg-red-500/15 text-red-300 ring-1 ring-red-400/30",
    bar: "bg-red-400",
  },
};

export const SCORE_LABELS: Array<{ key: keyof ScoutScores; label: string }> = [
  { key: "aderencia", label: "Aderência ao nicho" },
  { key: "audiencia", label: "Fit com a audiência" },
  { key: "momentum", label: "Momentum" },
  { key: "saturacao", label: "Espaço (saturação)" },
  { key: "viabilidade", label: "Viabilidade" },
  { key: "hook", label: "Hook / retenção" },
];
