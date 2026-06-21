import { isSameMonth, isSameWeek, isToday, localDateKey, parseDate } from "./date";
import { normalizeProductionSteps } from "./productionSteps";
import {
  PRIORITIES,
  STATUSES,
  type Recommendation,
  type Video,
  type VideoDraft,
  type VideoPriority,
  type VideoStatus,
} from "../types";

export const DEFAULT_TASKS = [
  "Pesquisar ideias",
  "Escrever roteiro",
  "Revisar SEO",
  "Publicar video",
  "Responder comentarios",
];

export const EMPTY_VIDEO: VideoDraft = {
  title: "",
  channelId: "",
  channel: "",
  niche: "",
  keyword: "",
  videoFormat: "",
  contentType: "",
  studioSyncPeriod: "",
  priority: "Media",
  status: "Ideia",
  plannedDate: "",
  script: "",
  thumbnailIdeas: "",
  seoTitle: "",
  seoDescription: "",
  seoNotes: "",
  notes: "",
  inspirationLinks: "",
  publishedLink: "",
  publishedAt: "",
  views24h: "",
  ctr: "",
  avgDuration: "",
  studioVideoId: "",
  studioViews: "",
  studioImpressions: "",
  studioRetention: "",
  studioWatchTimeHours: "",
  studioSubscribers: "",
  studioPublishedHour: "",
  performanceNotes: "",
  lessons: "",
  studioImportedAt: "",
  studioSourceFile: "",
  studioMatchedBy: "",
  studioCreatedFromCsv: false,
  studioCreatedFromOnline: false,
  archived: false,
  linkedInspirationIds: [],
  tags: [],
  productionSteps: [],
};

export const WIP_LIMITS: Partial<Record<VideoStatus, number>> = {
  Ideia: 20,
  Roteiro: 4,
  Gravacao: 3,
  Edicao: 4,
  SEO: 4,
  Agendado: 8,
};

export function makeId() {
  try {
    if (window.crypto?.randomUUID) {
      return window.crypto.randomUUID();
    }
  } catch {
    // Fall back for browsers that restrict crypto APIs on local files.
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function isBlank(value: unknown) {
  return !String(value || "").trim();
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

export function hasScript(video: Pick<Video, "script">) {
  return !isBlank(video.script);
}

export function hasSeo(video: Pick<Video, "seoTitle" | "seoDescription" | "seoNotes">) {
  return [video.seoTitle, video.seoDescription, video.seoNotes].some((value) => !isBlank(value));
}

export function hasPerformance(
  video: Pick<
    Video,
    | "views24h"
    | "ctr"
    | "avgDuration"
    | "studioViews"
    | "studioImpressions"
    | "studioRetention"
    | "performanceNotes"
    | "lessons"
  >,
) {
  return [
    video.views24h,
    video.ctr,
    video.avgDuration,
    video.studioViews,
    video.studioImpressions,
    video.studioRetention,
    video.performanceNotes,
    video.lessons,
  ].some((value) => !isBlank(value));
}

export function isOverdue(video: Pick<Video, "plannedDate" | "status">) {
  const date = parseDate(video.plannedDate);
  if (!date || video.status === "Publicado") {
    return false;
  }

  return date < parseDate(localDateKey())!;
}

export function isReadyToPublish(video: Video) {
  return (
    video.status !== "Publicado" &&
    hasScript(video) &&
    hasSeo(video) &&
    ["SEO", "Agendado"].includes(video.status)
  );
}

export function getPublishDate(video: Pick<Video, "publishedAt" | "plannedDate" | "status">) {
  return video.publishedAt || (video.status === "Publicado" ? video.plannedDate : "");
}

export function normalizeStatus(status: unknown): VideoStatus {
  const value = text(status).trim();
  const aliases: Record<string, VideoStatus> = {
    "Gravação": "Gravacao",
    "Gravacao": "Gravacao",
    "GravaÃ§Ã£o": "Gravacao",
    "Edição": "Edicao",
    "Edicao": "Edicao",
    "EdiÃ§Ã£o": "Edicao",
    // Etapa removida do pipeline — migra dados antigos para a etapa seguinte
    "Thumbnail": "SEO",
  };

  return STATUSES.includes(value as VideoStatus) ? (value as VideoStatus) : aliases[value] || "Ideia";
}

export function normalizePriority(priority: unknown): VideoPriority {
  const value = text(priority).trim();
  const aliases: Record<string, VideoPriority> = {
    "Média": "Media",
    "Media": "Media",
    "MÃ©dia": "Media",
  };

  return PRIORITIES.includes(value as VideoPriority) ? (value as VideoPriority) : aliases[value] || "Media";
}

export function normalizeVideo(raw: Partial<VideoDraft | Video>): Video {
  const now = new Date().toISOString();
  const status = normalizeStatus(raw.status);

  return {
    ...EMPTY_VIDEO,
    id: text(raw.id) || makeId(),
    title: text(raw.title).trim() || "Video sem titulo",
    channelId: text(raw.channelId),
    channel: text(raw.channel).trim(),
    niche: text(raw.niche).trim() || "Sem nicho",
    keyword: text(raw.keyword),
    videoFormat: text(raw.videoFormat),
    contentType: text(raw.contentType),
    studioSyncPeriod: text(raw.studioSyncPeriod),
    priority: normalizePriority(raw.priority),
    status,
    plannedDate: text(raw.plannedDate),
    script: text(raw.script),
    thumbnailIdeas: text(raw.thumbnailIdeas),
    seoTitle: text(raw.seoTitle),
    seoDescription: text(raw.seoDescription),
    seoNotes: text(raw.seoNotes),
    notes: text(raw.notes),
    inspirationLinks: text(raw.inspirationLinks),
    publishedLink: text(raw.publishedLink),
    publishedAt:
      status === "Publicado"
        ? text(raw.publishedAt) || text(raw.plannedDate) || localDateKey()
        : text(raw.publishedAt),
    views24h: text(raw.views24h),
    ctr: text(raw.ctr),
    avgDuration: text(raw.avgDuration),
    studioVideoId: text(raw.studioVideoId),
    studioViews: text(raw.studioViews),
    studioImpressions: text(raw.studioImpressions),
    studioRetention: text(raw.studioRetention),
    studioWatchTimeHours: text(raw.studioWatchTimeHours),
    studioSubscribers: text(raw.studioSubscribers),
    studioPublishedHour: text(raw.studioPublishedHour),
    performanceNotes: text(raw.performanceNotes),
    lessons: text(raw.lessons),
    studioImportedAt: text(raw.studioImportedAt),
    studioSourceFile: text(raw.studioSourceFile),
    studioMatchedBy: text(raw.studioMatchedBy),
    studioCreatedFromCsv: Boolean(raw.studioCreatedFromCsv || (raw.studioSourceFile && raw.studioMatchedBy === "none")),
    studioCreatedFromOnline: Boolean(
      raw.studioCreatedFromOnline ||
        (String(raw.studioSourceFile || "").startsWith("YouTube API") && raw.studioMatchedBy === "none"),
    ),
    archived: Boolean(raw.archived),
    linkedInspirationIds: Array.isArray(raw.linkedInspirationIds)
      ? raw.linkedInspirationIds.map((id) => text(id)).filter(Boolean)
      : [],
    tags: Array.isArray(raw.tags) ? raw.tags.map((t) => text(t).trim()).filter(Boolean) : [],
    productionSteps: normalizeProductionSteps(raw.productionSteps),
    createdAt: text(raw.createdAt) || now,
    updatedAt: text(raw.updatedAt) || now,
  };
}

export function normalizeVideoDraft(raw: Partial<VideoDraft | Video>): VideoDraft {
  const normalized = normalizeVideo(raw);

  return {
    ...normalized,
    id: text(raw.id),
    createdAt: text(raw.createdAt),
    updatedAt: text(raw.updatedAt),
  };
}

export function sortByPriorityAndDate(videos: Video[]) {
  const score: Record<VideoPriority, number> = { Alta: 0, Media: 1, Baixa: 2 };

  return [...videos].sort((a, b) => {
    const priority = score[a.priority] - score[b.priority];
    if (priority !== 0) {
      return priority;
    }

    if (a.plannedDate && b.plannedDate) {
      return a.plannedDate.localeCompare(b.plannedDate);
    }

    if (a.plannedDate) {
      return -1;
    }

    if (b.plannedDate) {
      return 1;
    }

    return String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""));
  });
}

export function sortPublishedByDate(videos: Video[]) {
  return [...videos].sort((a, b) =>
    String(getPublishDate(b) || b.updatedAt || "").localeCompare(String(getPublishDate(a) || a.updatedAt || "")),
  );
}

export function getNiches(videos: Video[]) {
  return [...new Set(videos.map((video) => video.niche).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "pt-BR", { sensitivity: "base" }),
  );
}

export function getChannels(videos: Video[]) {
  return [...new Set(videos.map((video) => video.channel).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "pt-BR", { sensitivity: "base" }),
  );
}

export function nextStatus(status: VideoStatus) {
  const index = STATUSES.indexOf(status);
  return STATUSES[index + 1] || null;
}

export function getRecommendation(videos: Video[]): Recommendation {
  const openVideos = sortByPriorityAndDate(videos.filter((video) => !video.archived && video.status !== "Publicado"));
  const overdue = openVideos.find(isOverdue);

  if (overdue) {
    return {
      label: "Resolver atraso",
      detail: `Retome "${overdue.title}" antes de iniciar uma ideia nova.`,
      video: overdue,
    };
  }

  const plannedToday = openVideos.find((video) => isToday(video.plannedDate));
  if (plannedToday) {
    return {
      label: "Produzir o video de hoje",
      detail: `Avance "${plannedToday.title}" para a proxima etapa.`,
      video: plannedToday,
    };
  }

  const missingScript = openVideos.find((video) => !hasScript(video));
  if (missingScript) {
    return {
      label: "Escrever roteiro",
      detail: `Complete o roteiro de "${missingScript.title}".`,
      video: missingScript,
    };
  }

  const missingSeo = openVideos.find((video) => !hasSeo(video));
  if (missingSeo) {
    return {
      label: "Revisar SEO",
      detail: `Finalize titulo, descricao ou tags de "${missingSeo.title}".`,
      video: missingSeo,
    };
  }

  return {
    label: "Planejar proxima publicacao",
    detail: openVideos.length
      ? `Escolha a proxima acao para "${openVideos[0].title}".`
      : "Cadastre uma ideia para comecar a semana.",
    video: openVideos[0] || null,
  };
}

export function getMetrics(videos: Video[], weeklyGoal: number) {
  const openVideos = videos.filter((video) => video.status !== "Publicado");
  const inProduction = videos.filter((video) => !["Ideia", "Publicado"].includes(video.status)).length;
  const publishedThisMonth = videos.filter((video) =>
    video.status === "Publicado" ? isSameMonth(getPublishDate(video)) : false,
  ).length;
  const publishedThisWeek = videos.filter((video) =>
    video.status === "Publicado" ? isSameWeek(getPublishDate(video)) : false,
  ).length;

  return [
    { label: "Ideias totais", value: videos.length },
    { label: "Em producao", value: inProduction },
    { label: "Atrasados", value: videos.filter(isOverdue).length },
    { label: "Prontos para publicar", value: videos.filter(isReadyToPublish).length },
    { label: "Sem roteiro", value: openVideos.filter((video) => !hasScript(video)).length },
    { label: "Sem SEO", value: openVideos.filter((video) => !hasSeo(video)).length },
    { label: "Publicados no mes", value: publishedThisMonth },
    { label: "Meta semanal", value: `${publishedThisWeek}/${weeklyGoal}` },
  ];
}

export function getFocusChecklist(video: Video | null) {
  if (!video) {
    return ["Cadastrar uma ideia", "Definir nicho", "Escolher data planejada"];
  }

  return [
    hasScript(video) ? "Roteiro pronto" : "Escrever roteiro",
    hasSeo(video) ? "SEO revisado" : "Revisar SEO",
    video.plannedDate ? "Data planejada definida" : "Definir data planejada",
    video.publishedLink ? "Link publicado salvo" : "Salvar link quando publicar",
  ];
}
