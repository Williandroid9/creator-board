import type {
  Channel,
  Inspiration,
  RadarAlert,
  RadarChannelSize,
  RadarCompetitor,
  RadarCompetitorDraft,
  RadarDifficulty,
  RadarIdea,
  RadarLanguageAngle,
  RadarMarket,
  RadarMarketStatus,
  RadarPotential,
  RadarReference,
  RadarRun,
  RadarScoreBreakdown,
  RadarSeverity,
  RadarState,
  Trend,
  Video,
  VideoDraft,
} from "../types";
import { EMPTY_VIDEO, makeId } from "./video";
import { addDays, localDateKey } from "./date";

export const EMPTY_RADAR_STATE: RadarState = {
  competitors: [],
  runs: [],
  ideas: [],
  alerts: [],
};

export const EMPTY_RADAR_COMPETITOR: RadarCompetitorDraft = {
  channelId: "",
  name: "",
  url: "",
  market: "Brasil",
  size: "Referencia",
  notes: "",
};

const STOP_WORDS = new Set([
  "a",
  "agora",
  "ao",
  "aos",
  "as",
  "com",
  "como",
  "da",
  "das",
  "de",
  "do",
  "dos",
  "after",
  "all",
  "and",
  "are",
  "best",
  "but",
  "can",
  "for",
  "from",
  "have",
  "how",
  "into",
  "just",
  "not",
  "of",
  "that",
  "the",
  "this",
  "to",
  "what",
  "when",
  "why",
  "with",
  "you",
  "your",
  "e",
  "em",
  "essa",
  "esse",
  "esta",
  "este",
  "isso",
  "mais",
  "meu",
  "minha",
  "na",
  "nas",
  "no",
  "nos",
  "o",
  "os",
  "ou",
  "para",
  "parte",
  "por",
  "que",
  "sem",
  "seu",
  "sua",
  "sobre",
  "um",
  "uma",
  "video",
  "voce",
]);

function nowIso() {
  return new Date().toISOString();
}

function text(value: unknown, fallback = "") {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return fallback;
}

function numberMetric(value: string) {
  const normalized = String(value || "").replace(",", ".").replace(/[^\d.]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseViews(value: string) {
  const normalized = String(value || "").toLowerCase().replace(",", ".").trim();
  const multiplier = normalized.includes("mi") ? 1000000 : normalized.includes("k") || normalized.includes("mil") ? 1000 : 1;
  const parsed = Number(normalized.replace(/[^\d.]/g, ""));
  return Number.isFinite(parsed) ? parsed * multiplier : 0;
}

function average(values: number[]) {
  const valid = values.filter((value) => value > 0);
  return valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : 0;
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(value || 0);
}

function normalizeTerm(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function splitList(value: string) {
  return String(value || "")
    .split(/[\n,;|]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function tokenize(value: string) {
  return value
    .split(/[^\p{L}\p{N}]+/u)
    .map(normalizeTerm)
    .filter((term) => term.length > 2 && !STOP_WORDS.has(term));
}

function videoViews(video: Video) {
  return numberMetric(video.studioViews || video.views24h);
}

function videoCtr(video: Video) {
  return numberMetric(video.ctr);
}

function videoRetention(video: Video) {
  return numberMetric(video.studioRetention);
}

type RankedFormat = {
  label: string;
  count: number;
  averageViews: number;
  averageRetention: number;
  videos: Video[];
};

function videoFormatLabel(video: Video) {
  return [video.contentType, video.videoFormat].map((item) => item.trim()).filter(Boolean).join(" / ") || "Formato livre";
}

function rankFormats(videos: Video[]) {
  const groups = new Map<string, Video[]>();

  for (const video of videos) {
    const label = videoFormatLabel(video);
    groups.set(label, [...(groups.get(label) || []), video]);
  }

  return [...groups.entries()]
    .map(([label, groupVideos]) => ({
      label,
      count: groupVideos.length,
      averageViews: average(groupVideos.map(videoViews)),
      averageRetention: average(groupVideos.map(videoRetention)),
      videos: [...groupVideos].sort((a, b) => videoViews(b) - videoViews(a)),
    }))
    .sort((a, b) => b.averageViews - a.averageViews || b.averageRetention - a.averageRetention || b.count - a.count);
}

function detectMarket(value: string): RadarMarket {
  const normalized = normalizeTerm(value);
  if (/\b(en|english|usa|us|gringo|internacional|global)\b/.test(normalized)) {
    return "Ingles";
  }

  if (/\b(br|brasil|pt|portugues)\b/.test(normalized)) {
    return "Brasil";
  }

  return "Brasil";
}

function validMarket(value: unknown): RadarMarket {
  return value === "Brasil" || value === "Ingles" || value === "Outro" ? value : "Brasil";
}

function validSize(value: unknown): RadarChannelSize {
  return value === "Grande" || value === "Medio" || value === "Pequeno" || value === "Referencia" ? value : "Referencia";
}

function validSeverity(value: unknown): RadarSeverity {
  return value === "Alta" || value === "Media" || value === "Baixa" ? value : "Media";
}

function validLanguageAngle(value: unknown): RadarLanguageAngle {
  return value === "Brasil" || value === "Ingles para Brasil" || value === "Brasil para Ingles" ? value : "Brasil";
}

function validMarketStatus(value: unknown): RadarMarketStatus {
  return value === "Crescendo" || value === "Estavel" || value === "Saturado" ? value : "Estavel";
}

function validDifficulty(value: unknown): RadarDifficulty {
  return value === "Baixa" || value === "Media" || value === "Alta" ? value : "Media";
}

function validPotential(value: unknown): RadarPotential {
  return value === "Baixo" || value === "Medio" || value === "Alto" ? value : "Medio";
}

function topTerms(videos: Video[], limit = 10) {
  const counts = new Map<string, number>();

  for (const video of videos) {
    const weight = Math.max(1, Math.round(videoViews(video) / 1000));
    const source = [video.title, video.keyword, video.seoTitle, video.seoNotes, video.lessons].join(" ");

    for (const term of tokenize(source)) {
      counts.set(term, (counts.get(term) || 0) + weight);
    }
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "pt-BR"))
    .slice(0, limit)
    .map(([term, score]) => ({ term, score }));
}

function topicFromTitle(title: string, fallback: string) {
  const terms = tokenize(title)
    .filter((term) => !/^\d+$/.test(term))
    .slice(0, 4);
  return terms.length ? terms.join(" ") : fallback;
}

function looksEnglish(value: string) {
  const normalized = normalizeTerm(value);
  const englishHits = [" the ", " with ", " what ", " why ", " how ", " best ", "you ", "your "].filter((term) =>
    ` ${normalized} `.includes(term),
  ).length;
  const portugueseHits = [" que ", " voce ", " como ", " para ", " melhor ", " seu ", " sua "].filter((term) =>
    ` ${normalized} `.includes(term),
  ).length;

  return englishHits > portugueseHits;
}

function titlePack(candidate: Candidate, channel: Channel) {
  const sourceText = [
    candidate.baseTitle,
    candidate.topic,
    candidate.proofVideo?.title,
    channel.keywords,
    channel.audience,
  ].join(" ");
  const english = candidate.languageAngle === "Brasil para Ingles" || looksEnglish(sourceText);

  return english
    ? {
        newVersion: `The new version of ${candidate.topic}`,
        hidden: `${candidate.topic}: what nobody shows you`,
        guide: `${candidate.topic}: the practical guide`,
      }
    : {
        newVersion: `A nova versao de ${candidate.topic}`,
        hidden: `${candidate.topic}: o que ninguem te mostra`,
        guide: `${candidate.topic}: guia direto para quem quer resultado`,
      };
}

function includesAny(value: string, terms: string[]) {
  const normalized = normalizeTerm(value);
  return terms.some((term) => term && normalized.includes(normalizeTerm(term)));
}

function referenceFromVideo(video: Video): RadarReference {
  return {
    title: video.title,
    channel: video.channel,
    url: video.publishedLink,
    source: "Canal",
    views: video.studioViews || video.views24h,
    market: "Brasil",
  };
}

function referenceFromTrend(trend: Trend): RadarReference {
  return {
    title: trend.title,
    channel: trend.referenceChannel,
    url: trend.url,
    source: "Tendencia",
    views: trend.views,
    market: detectMarket([trend.referenceChannel, trend.notes, trend.url].join(" ")),
  };
}

function referenceFromInspiration(inspiration: Inspiration): RadarReference {
  return {
    title: inspiration.title,
    channel: inspiration.channel,
    url: inspiration.url,
    source: "Inspiracao",
    views: "",
    market: detectMarket([inspiration.channel, inspiration.notes, inspiration.tags, inspiration.url].join(" ")),
  };
}

function referenceFromCompetitor(competitor: RadarCompetitor): RadarReference {
  return {
    title: competitor.notes || `Canal de referencia: ${competitor.name}`,
    channel: competitor.name,
    url: competitor.url,
    source: "Concorrente",
    views: "",
    market: competitor.market,
  };
}

function normalizeStringArray(raw: unknown) {
  return Array.isArray(raw) ? raw.map((item) => text(item).trim()).filter(Boolean) : [];
}

function normalizeScoreBreakdown(raw: unknown): RadarScoreBreakdown {
  const value = raw && typeof raw === "object" ? (raw as Partial<RadarScoreBreakdown>) : {};

  return {
    aderencia: clampScore(Number(value.aderencia) || 0),
    mercado: clampScore(Number(value.mercado) || 0),
    producao: clampScore(Number(value.producao) || 0),
    ctr: clampScore(Number(value.ctr) || 0),
    retencao: clampScore(Number(value.retencao) || 0),
    concorrencia: clampScore(Number(value.concorrencia) || 0),
    serie: clampScore(Number(value.serie) || 0),
  };
}

function normalizeReferences(raw: unknown): RadarReference[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw.map((item) => {
    const reference = item as Partial<RadarReference>;
    const source =
      reference.source === "Canal" ||
      reference.source === "Tendencia" ||
      reference.source === "Inspiracao" ||
      reference.source === "Concorrente"
        ? reference.source
        : "Canal";

    return {
      title: text(reference.title).trim(),
      channel: text(reference.channel).trim(),
      url: text(reference.url).trim(),
      source,
      views: text(reference.views).trim(),
      market: validMarket(reference.market),
    };
  });
}

export function normalizeRadarCompetitor(raw: Partial<RadarCompetitor | RadarCompetitorDraft>): RadarCompetitor {
  const now = nowIso();

  return {
    id: text(raw.id) || makeId(),
    channelId: text(raw.channelId).trim(),
    name: text(raw.name).trim() || "Canal de referencia",
    url: text(raw.url).trim(),
    market: validMarket(raw.market),
    size: validSize(raw.size),
    notes: text(raw.notes).trim(),
    createdAt: text(raw.createdAt) || now,
    updatedAt: text(raw.updatedAt) || now,
  };
}

export function normalizeRadarCompetitorDraft(raw: Partial<RadarCompetitor | RadarCompetitorDraft>): RadarCompetitorDraft {
  const normalized = normalizeRadarCompetitor(raw);

  return {
    ...normalized,
    id: text(raw.id),
    createdAt: text(raw.createdAt),
    updatedAt: text(raw.updatedAt),
  };
}

function normalizeRadarAlert(raw: Partial<RadarAlert>): RadarAlert {
  return {
    id: text(raw.id) || makeId(),
    channelId: text(raw.channelId).trim(),
    type: text(raw.type).trim() || "sinal",
    title: text(raw.title).trim() || "Alerta",
    detail: text(raw.detail).trim(),
    severity: validSeverity(raw.severity),
    createdAt: text(raw.createdAt) || nowIso(),
  };
}

function normalizeRadarIdea(raw: Partial<RadarIdea>): RadarIdea {
  const now = nowIso();

  return {
    id: text(raw.id) || makeId(),
    channelId: text(raw.channelId).trim(),
    runId: text(raw.runId).trim(),
    score: clampScore(Number(raw.score) || 0),
    languageAngle: validLanguageAngle(raw.languageAngle),
    title: text(raw.title).trim() || "Ideia sem titulo",
    titleVariations: normalizeStringArray(raw.titleVariations).slice(0, 3),
    concept: text(raw.concept).trim(),
    hook: text(raw.hook).trim(),
    scriptStructure: normalizeStringArray(raw.scriptStructure).slice(0, 8),
    thumbnailSuggestion: text(raw.thumbnailSuggestion).trim(),
    keywords: normalizeStringArray(raw.keywords).slice(0, 12),
    references: normalizeReferences(raw.references).slice(0, 6),
    strategicReason: text(raw.strategicReason).trim(),
    evidence: normalizeStringArray(raw.evidence).slice(0, 6),
    nextActions: normalizeStringArray(raw.nextActions).slice(0, 6),
    scoreBreakdown: normalizeScoreBreakdown(raw.scoreBreakdown),
    marketStatus: validMarketStatus(raw.marketStatus),
    angle: text(raw.angle).trim(),
    audience: text(raw.audience).trim(),
    difficulty: validDifficulty(raw.difficulty),
    viewPotential: validPotential(raw.viewPotential),
    flopRisk: text(raw.flopRisk).trim(),
    createdAt: text(raw.createdAt) || now,
    updatedAt: text(raw.updatedAt) || now,
  };
}

function normalizeRadarRun(raw: Partial<RadarRun>): RadarRun {
  return {
    id: text(raw.id) || makeId(),
    channelId: text(raw.channelId).trim(),
    createdAt: text(raw.createdAt) || nowIso(),
    summary: text(raw.summary).trim(),
    marketSummary: text(raw.marketSummary).trim(),
    patterns: normalizeStringArray(raw.patterns).slice(0, 10),
    immediateOpportunities: normalizeStringArray(raw.immediateOpportunities).slice(0, 10),
    next7Days: normalizeStringArray(raw.next7Days).slice(0, 10),
    next30Days: normalizeStringArray(raw.next30Days).slice(0, 12),
    continuationCandidates: normalizeStringArray(raw.continuationCandidates).slice(0, 10),
    firstRecommendation: text(raw.firstRecommendation).trim(),
    alerts: Array.isArray(raw.alerts) ? raw.alerts.map((alert) => normalizeRadarAlert(alert)).slice(0, 12) : [],
  };
}

export function normalizeRadarState(raw: unknown): RadarState {
  if (!raw || typeof raw !== "object") {
    return EMPTY_RADAR_STATE;
  }

  const state = raw as Partial<RadarState>;

  return {
    competitors: Array.isArray(state.competitors)
      ? state.competitors.map((item) => normalizeRadarCompetitor(item)).slice(0, 200)
      : [],
    runs: Array.isArray(state.runs)
      ? state.runs.map((item) => normalizeRadarRun(item)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 40)
      : [],
    ideas: Array.isArray(state.ideas)
      ? state.ideas.map((item) => normalizeRadarIdea(item)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 240)
      : [],
    alerts: Array.isArray(state.alerts)
      ? state.alerts.map((item) => normalizeRadarAlert(item)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 120)
      : [],
  };
}

type Candidate = {
  baseTitle: string;
  topic: string;
  source: "top-video" | "trend" | "inspiration" | "pillar" | "keyword" | "competitor";
  references: RadarReference[];
  languageAngle: RadarLanguageAngle;
  opportunityKind: "serie" | "corrigir" | "adaptar" | "explorar" | "repetir";
  proofVideo?: Video;
  weakVideo?: Video;
  performanceSignal?: string;
};

function buildCandidates(params: {
  channel: Channel;
  videos: Video[];
  topVideos: Video[];
  aboveAverage: Video[];
  flopVideos: Video[];
  strongFormats: RankedFormat[];
  trends: Trend[];
  inspirations: Inspiration[];
  competitors: RadarCompetitor[];
  terms: Array<{ term: string; score: number }>;
}) {
  const { channel, videos, topVideos, aboveAverage, flopVideos, strongFormats, trends, inspirations, competitors, terms } = params;
  const candidates: Candidate[] = [];
  const niche = channel.niche || videos[0]?.niche || "conteudo";
  const channelKeywords = splitList(channel.keywords);
  const pillars = splitList(channel.pillars || channel.promise || niche);
  const termList = terms.map((item) => item.term);
  const matchingTerms = [...channelKeywords, ...pillars, ...termList].slice(0, 14);
  const marketTrends = trends
    .filter((trend) => {
      const haystack = [trend.title, trend.niche, trend.ideaAngle, trend.opportunityReason, trend.notes].join(" ");
      return !matchingTerms.length || includesAny(haystack, matchingTerms) || normalizeTerm(trend.niche) === normalizeTerm(niche);
    })
    .sort((a, b) => parseViews(b.views) - parseViews(a.views))
    .slice(0, 8);
  const marketInspirations = inspirations
    .filter((item) => {
      const haystack = [item.title, item.niche, item.tags, item.notes].join(" ");
      return !matchingTerms.length || includesAny(haystack, matchingTerms) || normalizeTerm(item.niche) === normalizeTerm(niche);
    })
    .slice(0, 8);

  for (const video of [...aboveAverage, ...topVideos].slice(0, 6)) {
    const topic = topicFromTitle(video.title, video.keyword || niche);
    candidates.push({
      baseTitle: `A nova versao de ${topic}`,
      topic,
      source: "top-video",
      references: [referenceFromVideo(video)],
      languageAngle: "Brasil",
      opportunityKind: "serie",
      proofVideo: video,
      performanceSignal: `${formatNumber(videoViews(video))} views no historico do canal`,
    });
    candidates.push({
      baseTitle: `${topic}: o que ninguem te mostra`,
      topic,
      source: "top-video",
      references: [referenceFromVideo(video)],
      languageAngle: "Brasil",
      opportunityKind: "serie",
      proofVideo: video,
      performanceSignal: `Tema ja validado por "${video.title}"`,
    });
  }

  for (const weakVideo of flopVideos.slice(0, 4)) {
    const topic = topicFromTitle(weakVideo.title, weakVideo.keyword || niche);
    candidates.push({
      baseTitle: `${topic}: o angulo certo que faltou`,
      topic,
      source: "top-video",
      references: [referenceFromVideo(weakVideo), ...(topVideos[0] ? [referenceFromVideo(topVideos[0])] : [])],
      languageAngle: "Brasil",
      opportunityKind: "corrigir",
      proofVideo: topVideos[0],
      weakVideo,
      performanceSignal: `"${weakVideo.title}" ficou abaixo da media e pode ser refeito com promessa mais clara`,
    });
  }

  for (const format of strongFormats.slice(0, 4)) {
    const proof = format.videos[0];
    const topic = topicFromTitle(proof?.title || termList[0] || niche, niche);
    candidates.push({
      baseTitle: `${topic} no formato ${format.label}`,
      topic,
      source: "pillar",
      references: proof ? [referenceFromVideo(proof)] : [],
      languageAngle: "Brasil",
      opportunityKind: "repetir",
      proofVideo: proof,
      performanceSignal: `${format.label} tem media de ${formatNumber(format.averageViews)} views em ${format.count} video(s)`,
    });
  }

  for (const trend of marketTrends) {
    const topic = trend.ideaAngle || trend.title;
    candidates.push({
      baseTitle: trend.ideaAngle || `${trend.title} aplicado no seu nicho`,
      topic: topicFromTitle(topic, niche),
      source: "trend",
      references: [referenceFromTrend(trend)],
      languageAngle: detectMarket([trend.referenceChannel, trend.notes, trend.url].join(" ")) === "Ingles" ? "Ingles para Brasil" : "Brasil",
      opportunityKind: "adaptar",
      performanceSignal: trend.views ? `Referencia de mercado com ${trend.views} views observadas` : "Referencia de mercado cadastrada",
    });
  }

  for (const inspiration of marketInspirations) {
    const topic = topicFromTitle(inspiration.title || inspiration.tags, niche);
    candidates.push({
      baseTitle: `${topic}: formato adaptado para ${niche}`,
      topic,
      source: "inspiration",
      references: [referenceFromInspiration(inspiration)],
      languageAngle: detectMarket([inspiration.channel, inspiration.tags, inspiration.url].join(" ")) === "Ingles" ? "Ingles para Brasil" : "Brasil",
      opportunityKind: "adaptar",
      performanceSignal: "Formato salvo como inspiracao para adaptar ao canal",
    });
  }

  for (const competitor of competitors.slice(0, 8)) {
    const competitorTopic = topicFromTitle(competitor.notes || competitor.name, niche);
    candidates.push({
      baseTitle: `Oportunidade que ${competitor.name} ainda nao explorou bem`,
      topic: competitorTopic,
      source: "competitor",
      references: [referenceFromCompetitor(competitor)],
      languageAngle: competitor.market === "Ingles" ? "Ingles para Brasil" : "Brasil",
      opportunityKind: "explorar",
      performanceSignal: competitor.notes ? `Lacuna observada em ${competitor.name}: ${competitor.notes}` : `Canal de referencia: ${competitor.name}`,
    });
  }

  for (const item of [...pillars, ...channelKeywords, ...termList].slice(0, 10)) {
    candidates.push({
      baseTitle: `${item}: guia direto para quem quer resultado`,
      topic: item,
      source: pillars.includes(item) ? "pillar" : "keyword",
      references: topVideos[0] ? [referenceFromVideo(topVideos[0])] : [],
      languageAngle: "Brasil",
      opportunityKind: pillars.includes(item) ? "explorar" : "repetir",
      proofVideo: topVideos[0],
      performanceSignal: terms.find((term) => term.term === item) ? "Termo recorrente no historico do canal" : "Pilar definido para o canal",
    });
  }

  if (!candidates.length) {
    candidates.push({
      baseTitle: `${niche}: comece por aqui`,
      topic: niche,
      source: "pillar",
      references: [],
      languageAngle: "Brasil",
      opportunityKind: "explorar",
    });
  }

  const seen = new Set<string>();
  return candidates.filter((candidate) => {
    const key = normalizeTerm(candidate.baseTitle);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function buildIdea(candidate: Candidate, context: {
  channel: Channel;
  runId: string;
  topVideos: Video[];
  averageViews: number;
  averageCtr: number;
  averageRetention: number;
  trendsCount: number;
  competitorsCount: number;
  termNames: string[];
}): RadarIdea {
  const {
    channel,
    runId,
    topVideos,
    averageViews,
    averageCtr,
    averageRetention,
    trendsCount,
    competitorsCount,
    termNames,
  } = context;
  const now = nowIso();
  const proofVideo = candidate.proofVideo || topVideos[0] || null;
  const proofReference = proofVideo ? referenceFromVideo(proofVideo) : candidate.references.find((reference) => reference.source === "Canal") || null;
  const weakReference = candidate.weakVideo ? referenceFromVideo(candidate.weakVideo) : null;
  const references = [proofReference, weakReference, ...candidate.references]
    .filter((reference): reference is RadarReference => Boolean(reference))
    .filter((reference, index, list) => {
      const key = `${reference.source}:${normalizeTerm(reference.title)}:${reference.url}`;
      return list.findIndex((item) => `${item.source}:${normalizeTerm(item.title)}:${item.url}` === key) === index;
    })
    .slice(0, 6);
  const hasMarketReference = candidate.references.some((reference) => reference.source !== "Canal") || trendsCount > 0 || competitorsCount > 0;
  const difficulty: RadarDifficulty =
    candidate.opportunityKind === "serie" || candidate.opportunityKind === "repetir" || candidate.opportunityKind === "corrigir"
      ? "Baixa"
      : candidate.source === "competitor"
        ? "Media"
        : "Media";
  const marketStatus: RadarMarketStatus =
    candidate.source === "trend" || candidate.source === "inspiration"
      ? "Crescendo"
      : candidate.opportunityKind === "corrigir"
        ? "Estavel"
        : hasMarketReference
          ? "Estavel"
          : "Estavel";
  const proofViews = proofVideo ? videoViews(proofVideo) : 0;
  const proofBoost = averageViews > 0 && proofViews >= averageViews * 1.2 ? 6 : proofViews > 0 ? 3 : 0;
  const kindBoost = {
    serie: 8,
    repetir: 7,
    adaptar: 5,
    corrigir: 4,
    explorar: 3,
  }[candidate.opportunityKind];
  const adherence = proofReference ? 22 + proofBoost : termNames.some((term) => includesAny(candidate.topic, [term])) ? 18 : 12;
  const market = candidate.source === "trend" ? 22 : candidate.source === "inspiration" ? 18 : candidate.source === "competitor" ? 16 : competitorsCount ? 12 : 8;
  const ease = difficulty === "Baixa" ? 14 : 10;
  const ctr = averageCtr >= 5 ? 12 : candidate.baseTitle.includes(":") ? 10 : 8;
  const retention = averageRetention >= 40 ? 11 : candidate.opportunityKind === "serie" || candidate.opportunityKind === "repetir" ? 10 : 8;
  const competition = competitorsCount >= 8 ? 6 : competitorsCount >= 3 ? 9 : 11;
  const series = candidate.opportunityKind === "serie" ? 14 : candidate.opportunityKind === "repetir" ? 11 : candidate.source === "pillar" ? 9 : 7;
  const scoreBreakdown: RadarScoreBreakdown = {
    aderencia: clampScore(adherence),
    mercado: clampScore(market + kindBoost),
    producao: clampScore(ease),
    ctr: clampScore(ctr),
    retencao: clampScore(retention),
    concorrencia: clampScore(competition),
    serie: clampScore(series),
  };
  const viewPotential: RadarPotential = adherence + market + kindBoost >= 48 ? "Alto" : hasMarketReference || proofReference ? "Medio" : "Medio";
  const score = clampScore(adherence + market + kindBoost + ease + ctr + retention + competition + series);
  const audience = channel.audience || `Pessoas interessadas em ${channel.niche || candidate.topic}`;
  const keywordSeeds = [candidate.topic, ...termNames, ...splitList(channel.keywords)].filter(Boolean);
  const keywords = [...new Set(keywordSeeds.map((item) => item.toLowerCase()))].slice(0, 8);
  const strategicPieces = [
    candidate.performanceSignal,
    proofVideo && proofViews
      ? `"${proofVideo.title}" serve como prova interna com ${formatNumber(proofViews)} views${averageViews ? ` contra media de ${formatNumber(averageViews)}` : ""}.`
      : "",
    candidate.weakVideo
      ? `"${candidate.weakVideo.title}" ficou abaixo da media e indica chance de refazer tema, titulo ou promessa.`
      : "",
    hasMarketReference ? "Tambem cruza sinais externos de tendencias, inspiracoes ou concorrentes cadastrados." : "",
  ].filter(Boolean);
  const evidence = [
    candidate.performanceSignal || "",
    proofVideo && proofViews ? `Prova interna: ${formatNumber(proofViews)} views em "${proofVideo.title}".` : "",
    averageViews ? `Media do canal usada como base: ${formatNumber(averageViews)} views.` : "",
    averageCtr ? `CTR medio do canal considerado: ${formatNumber(averageCtr)}%.` : "",
    averageRetention ? `Retencao media considerada: ${formatNumber(averageRetention)}%.` : "",
    hasMarketReference ? "Ha sinal externo salvo em tendencias, inspiracoes ou concorrentes." : "",
  ].filter(Boolean);
  const nextActions = [
    `Escrever um roteiro com hook de ate 20 segundos sobre ${candidate.topic}.`,
    proofVideo ? `Reaproveitar a promessa que funcionou em "${proofVideo.title}", sem copiar o titulo.` : "",
    candidate.languageAngle === "Ingles para Brasil" ? "Adaptar exemplos internacionais para contexto brasileiro." : "",
    candidate.opportunityKind === "serie" ? "Tratar como continuacao e deixar gancho para parte 3." : "",
    "Salvar no calendario somente se o roteiro tiver promessa clara em uma frase.",
  ].filter(Boolean);
  const pack = titlePack(candidate, channel);
  const finalTitle =
    candidate.opportunityKind === "serie"
      ? candidate.baseTitle.includes("o que ninguem") || candidate.baseTitle.includes("what nobody")
        ? pack.hidden
        : pack.newVersion
      : candidate.source === "keyword" || candidate.source === "pillar"
        ? pack.guide
        : candidate.baseTitle;

  const titleVariationsByKind: Record<Candidate["opportunityKind"], string[]> = {
    serie: [
      `${candidate.topic}: parte 2 com o que faltou`,
      `Depois de ${candidate.topic}, faca isso`,
      `${candidate.topic}: a atualizacao que muda tudo`,
    ],
    repetir: [
      `${candidate.topic}: mesmo formato, novo resultado`,
      `Eu testei ${candidate.topic} neste formato`,
      `${candidate.topic}: o modelo mais simples de aplicar`,
    ],
    adaptar: [
      `${candidate.topic}: a tendencia chegando no Brasil`,
      `O formato gringo de ${candidate.topic} adaptado`,
      `${candidate.topic}: por que todos estao falando disso`,
    ],
    corrigir: [
      `${candidate.topic}: o erro que travou o resultado`,
      `Refiz ${candidate.topic} do jeito certo`,
      `${candidate.topic}: a promessa que faltou no video antigo`,
    ],
    explorar: [
      `${candidate.topic}: o jeito certo de comecar`,
      `O erro que trava quem tenta ${candidate.topic}`,
      `${candidate.topic}: guia direto sem enrolacao`,
    ],
  };
  const conceptByKind: Record<Candidate["opportunityKind"], string> = {
    serie: `Criar uma continuacao direta de ${candidate.topic}, aproveitando prova interna e entregando uma nova promessa.`,
    repetir: `Repetir um formato que ja mostrou tracao e trocar apenas o tema central para reduzir risco de producao.`,
    adaptar: `Adaptar ${candidate.topic} a partir de sinais de mercado e conectar com a dor especifica do publico do canal.`,
    corrigir: `Revisitar ${candidate.topic} com titulo e hook mais claros para recuperar uma oportunidade que ficou fraca.`,
    explorar: `Usar ${candidate.topic} como aposta estruturada dentro dos pilares do canal e medir resposta do publico.`,
  };
  const hookByKind: Record<Candidate["opportunityKind"], string> = {
    serie: `O video anterior mostrou que ${candidate.topic} interessa. Agora vamos para a parte que mais gente ainda ignora.`,
    repetir: `Se esse formato ja funcionou uma vez, a pergunta agora e: o que acontece quando aplicamos em ${candidate.topic}?`,
    adaptar: `Esse tema esta aparecendo no mercado, mas quase ninguem trouxe para a realidade do seu publico ainda.`,
    corrigir: `Eu ja falei sobre ${candidate.topic}, mas faltou o angulo certo. Hoje eu vou corrigir isso de forma direta.`,
    explorar: `Se voce quer entender ${candidate.topic} sem perder tempo, este video vai te dar o caminho mais curto.`,
  };
  const thumbnailByKind: Record<Candidate["opportunityKind"], string> = {
    serie: `Usar continuidade visual do video que ja performou + selo "Parte 2" + 2 a 4 palavras sobre ${candidate.topic}.`,
    repetir: `Manter composicao do melhor formato do canal, trocar objeto/rosto principal e destacar ${candidate.topic}.`,
    adaptar: `Contraste "La fora vs Brasil" ou "novo padrao" com elemento visual simples e alto contraste.`,
    corrigir: `Antes/depois da promessa antiga, com frase curta tipo "Faltou isso" ou "Agora sim".`,
    explorar: `Rosto/reacao ou objeto central + promessa direta em 2 a 4 palavras sobre ${candidate.topic}.`,
  };

  return {
    id: makeId(),
    channelId: channel.id,
    runId,
    score,
    languageAngle: candidate.languageAngle,
    title: finalTitle,
    titleVariations: titleVariationsByKind[candidate.opportunityKind].slice(0, 3),
    concept: conceptByKind[candidate.opportunityKind],
    hook: hookByKind[candidate.opportunityKind],
    scriptStructure: [
      "Abrir com o problema e a promessa em ate 20 segundos",
      candidate.opportunityKind === "corrigir"
        ? "Mostrar rapidamente o que faltou no video anterior"
        : "Mostrar a referencia ou resultado que prova a oportunidade",
      "Explicar o contexto do tema sem alongar",
      "Entregar 3 pontos praticos com exemplos",
      "Fechar com proximo passo claro e gancho para parte 2",
    ],
    thumbnailSuggestion: thumbnailByKind[candidate.opportunityKind],
    keywords,
    references,
    strategicReason: strategicPieces.length
      ? strategicPieces.join(" ")
      : "Faz sentido como aposta inicial, mas precisa de mais dados do canal e referencias externas para ganhar confianca.",
    evidence,
    nextActions,
    scoreBreakdown,
    marketStatus,
    angle: candidate.languageAngle === "Ingles para Brasil"
      ? "Adaptar um formato internacional para a dor do publico brasileiro."
      : candidate.languageAngle === "Brasil para Ingles"
        ? "Traduzir uma dor brasileira para um angulo mais global."
        : candidate.opportunityKind === "corrigir"
          ? "Refazer a promessa do tema com aprendizado do que nao performou."
          : "Aprofundar um tema que ja conversa com o historico do canal.",
    audience,
    difficulty,
    viewPotential,
    flopRisk:
      candidate.opportunityKind === "corrigir"
        ? "Risco controlado: o tema ja apareceu, mas precisa mudar promessa e hook para nao repetir o flop."
        : score >= 75
          ? "Risco moderado: depende de titulo e entrega fortes."
          : score >= 55
            ? "Risco medio: valide com referencia externa antes de gravar."
            : "Risco alto: falta prova suficiente nos dados atuais.",
    createdAt: now,
    updatedAt: now,
  };
}

function buildAlerts(params: {
  channel: Channel;
  topVideos: Video[];
  flopVideos: Video[];
  strongFormats: RankedFormat[];
  terms: Array<{ term: string; score: number }>;
  averageViews: number;
  averageCtr: number;
  trends: Trend[];
  competitors: RadarCompetitor[];
}) {
  const { channel, topVideos, flopVideos, strongFormats, terms, averageViews, averageCtr, trends, competitors } = params;
  const alerts: RadarAlert[] = [];
  const now = nowIso();
  const best = topVideos[0];

  if (best && averageViews && videoViews(best) >= averageViews * 1.6) {
    alerts.push({
      id: makeId(),
      channelId: channel.id,
      type: "sequencia",
      title: "Video antigo pode virar sequencia",
      detail: `"${best.title}" ficou acima da media do canal. Vale criar parte 2, atualizacao ou bastidores.`,
      severity: "Alta",
      createdAt: now,
    });
  }

  const highCtr = topVideos.find((video) => averageCtr && videoCtr(video) >= averageCtr * 1.25);
  if (highCtr) {
    alerts.push({
      id: makeId(),
      channelId: channel.id,
      type: "ctr",
      title: "Titulo com promessa forte",
      detail: `"${highCtr.title}" teve CTR acima da media. Reaproveite a promessa em outro tema.`,
      severity: "Media",
      createdAt: now,
    });
  }

  const strongestTerm = terms[0];
  if (strongestTerm && strongestTerm.score >= 2) {
    alerts.push({
      id: makeId(),
      channelId: channel.id,
      type: "tema",
      title: "Tema recorrente detectado",
      detail: `"${strongestTerm.term}" aparece com frequencia no historico. Vale criar uma serie ou um quadro fixo sobre esse assunto.`,
      severity: "Media",
      createdAt: now,
    });
  }

  const strongFormat = strongFormats[0];
  if (strongFormat && strongFormat.count >= 2 && strongFormat.averageViews > 0) {
    alerts.push({
      id: makeId(),
      channelId: channel.id,
      type: "formato",
      title: "Formato com sinal de repeticao",
      detail: `${strongFormat.label} tem media de ${formatNumber(strongFormat.averageViews)} views. Repita a estrutura antes de inventar um formato novo.`,
      severity: "Media",
      createdAt: now,
    });
  }

  const weak = flopVideos[0];
  if (weak) {
    alerts.push({
      id: makeId(),
      channelId: channel.id,
      type: "rebuild",
      title: "Video fraco pode virar novo angulo",
      detail: `"${weak.title}" ficou abaixo da media. Regrave com promessa mais especifica e hook mais direto.`,
      severity: "Baixa",
      createdAt: now,
    });
  }

  const hotTrend = trends.find((trend) => parseViews(trend.views) >= 100000);
  if (hotTrend) {
    alerts.push({
      id: makeId(),
      channelId: channel.id,
      type: "mercado",
      title: "Sinal de mercado forte salvo",
      detail: `"${hotTrend.title}" tem volume observado alto. Compare com seu historico antes de gravar.`,
      severity: "Media",
      createdAt: now,
    });
  }

  if (!competitors.length) {
    alerts.push({
      id: makeId(),
      channelId: channel.id,
      type: "concorrentes",
      title: "Adicione canais de referencia",
      detail: "O Radar ja le seus dados, mas a leitura de mercado melhora muito com concorrentes e referencias por nicho.",
      severity: "Baixa",
      createdAt: now,
    });
  }

  return alerts.slice(0, 6);
}

export function generateRadarReport(params: {
  channel: Channel;
  videos: Video[];
  trends: Trend[];
  inspirations: Inspiration[];
  competitors: RadarCompetitor[];
}) {
  const { channel, videos, trends, inspirations, competitors } = params;
  const runId = makeId();
  const published = videos.filter((video) => video.status === "Publicado");
  const averageViews = average(published.map(videoViews));
  const averageCtr = average(published.map(videoCtr));
  const averageRetention = average(published.map(videoRetention));
  const topVideos = [...published]
    .sort((a, b) => videoViews(b) - videoViews(a) || videoCtr(b) - videoCtr(a) || videoRetention(b) - videoRetention(a))
    .slice(0, 8);
  const aboveAverage = published
    .filter((video) => {
      const viewsStrong = averageViews > 0 && videoViews(video) >= averageViews * 1.2;
      const ctrStrong = averageCtr > 0 && videoCtr(video) >= averageCtr * 1.15;
      const retentionStrong = averageRetention > 0 && videoRetention(video) >= averageRetention * 1.15;
      return viewsStrong || ctrStrong || retentionStrong;
    })
    .slice(0, 8);
  const flopVideos = [...published]
    .filter((video) => averageViews > 0 && videoViews(video) > 0 && videoViews(video) <= averageViews * 0.45)
    .sort((a, b) => videoViews(a) - videoViews(b))
    .slice(0, 4);
  const strongFormats = rankFormats(published).slice(0, 5);
  const terms = topTerms(videos.length ? videos : published, 12);
  const candidates = buildCandidates({
    channel,
    videos,
    topVideos,
    aboveAverage,
    flopVideos,
    strongFormats,
    trends,
    inspirations,
    competitors,
    terms,
  });
  const ideas = candidates
    .slice(0, 10)
    .map((candidate, index) =>
      buildIdea(candidate, {
        channel,
        runId,
        topVideos,
        averageViews,
        averageCtr,
        averageRetention,
        trendsCount: trends.length,
        competitorsCount: competitors.length,
        termNames: terms.map((item) => item.term),
      }),
    )
    .sort((a, b) => b.score - a.score);
  const alerts = buildAlerts({ channel, topVideos, flopVideos, strongFormats, terms, averageViews, averageCtr, trends, competitors });
  const patterns = [
    terms[0] ? `Termo recorrente: ${terms[0].term}` : "Poucos termos recorrentes ainda.",
    strongFormats[0] ? `Formato vencedor: ${strongFormats[0].label} (${formatNumber(strongFormats[0].averageViews)} views em media).` : "Poucos formatos claros ainda.",
    topVideos[0] ? `Maior prova interna: ${topVideos[0].title} (${formatNumber(videoViews(topVideos[0]))} views).` : "Sem videos publicados suficientes.",
    averageCtr ? `CTR medio atual: ${averageCtr.toFixed(1)}%.` : "CTR ainda insuficiente para comparar chamadas.",
    flopVideos[0] ? `Tema para revisar: ${flopVideos[0].title}.` : "Nenhum flop claro nos dados atuais.",
  ];
  const immediateOpportunities = ideas.slice(0, 3).map((idea) => `${idea.score}/100 - ${idea.title}`);
  const next7Days = ideas.slice(0, 3).map((idea) => idea.title);
  const next30Days = ideas.slice(0, 8).map((idea) => idea.title);
  const continuationCandidates = topVideos.slice(0, 4).map((video) => `${video.title} -> parte 2 ou atualizacao`);
  const firstRecommendation = ideas[0]
    ? `Gravar primeiro: ${ideas[0].title} (${ideas[0].score}/100).`
    : "Cadastre videos publicados ou tendencias para gerar uma recomendacao.";
  const run: RadarRun = {
    id: runId,
    channelId: channel.id,
    createdAt: nowIso(),
    summary: `${published.length} publicados analisados, ${aboveAverage.length} acima da media e ${ideas.length} ideias geradas.`,
    marketSummary: competitors.length || trends.length || inspirations.length
      ? `${competitors.length} concorrentes, ${trends.length} tendencias e ${inspirations.length} inspiracoes cruzadas com o canal.`
      : "Analise feita com dados locais do canal. Adicione concorrentes e tendencias para fortalecer a leitura de mercado.",
    patterns,
    immediateOpportunities,
    next7Days,
    next30Days,
    continuationCandidates,
    firstRecommendation,
    alerts,
  };

  return { run, ideas, alerts };
}

export function radarIdeaToVideoDraft(idea: RadarIdea, channel: Channel, schedule = false): VideoDraft {
  const plannedDate = schedule ? localDateKey(addDays(new Date(), 1)) : "";

  return {
    ...EMPTY_VIDEO,
    title: idea.title,
    channelId: channel.id,
    channel: channel.name,
    niche: channel.niche || "Sem nicho",
    keyword: idea.keywords[0] || idea.title,
    priority: idea.score >= 75 ? "Alta" : "Media",
    status: "Ideia",
    plannedDate,
    script: [`Hook: ${idea.hook}`, "", "Estrutura:", ...idea.scriptStructure.map((item) => `- ${item}`)].join("\n"),
    thumbnailIdeas: idea.thumbnailSuggestion,
    seoTitle: idea.title,
    seoNotes: idea.keywords.join(", "),
    inspirationLinks: idea.references.map((reference) => reference.url).filter(Boolean).join("\n"),
    notes: [
      `Radar de Tendencias: score ${idea.score}/100`,
      `Angulo: ${idea.angle}`,
      `Justificativa: ${idea.strategicReason}`,
      idea.evidence.length ? `Evidencias:\n${idea.evidence.map((item) => `- ${item}`).join("\n")}` : "",
      idea.nextActions.length ? `Proximos passos:\n${idea.nextActions.map((item) => `- ${item}`).join("\n")}` : "",
      `Risco: ${idea.flopRisk}`,
    ].filter(Boolean).join("\n"),
  };
}
