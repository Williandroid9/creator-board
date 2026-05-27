import type { Video, VideoStatus } from "../types";
import { isToday, parseDate } from "./date";
import { hasScript, hasSeo, hasThumbnail, isOverdue, nextStatus } from "./video";

export type OpportunityScore = {
  score: number;
  label: "Alta" | "Boa" | "Baixa";
  tone: "strong" | "medium" | "low";
  nextAction: string;
  reasons: string[];
};

const STATUS_WEIGHT: Record<VideoStatus, number> = {
  Ideia: 4,
  Roteiro: 14,
  Gravacao: 22,
  Edicao: 18,
  Thumbnail: 16,
  SEO: 20,
  Agendado: 24,
  Publicado: 0,
};

function numericMetric(value: string) {
  const normalized = String(value || "").replace(",", ".").replace(/[^\d.]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function average(values: number[]) {
  const valid = values.filter((value) => value > 0);
  return valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : 0;
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function dateSignal(video: Video) {
  const date = parseDate(video.plannedDate);

  if (!date) {
    return { points: 0, reason: "" };
  }

  if (isOverdue(video)) {
    return { points: 12, reason: "esta atrasado" };
  }

  if (isToday(video.plannedDate)) {
    return { points: 12, reason: "esta planejado para hoje" };
  }

  const today = parseDate(new Date().toISOString().slice(0, 10));
  if (!today) {
    return { points: 0, reason: "" };
  }

  const days = Math.ceil((date.getTime() - today.getTime()) / 86400000);
  if (days > 0 && days <= 7) {
    return { points: 8, reason: "entra na semana editorial" };
  }

  return { points: 2, reason: "tem data definida" };
}

function performanceSignal(video: Video, videos: Video[]) {
  const published = videos.filter((item) => item.status === "Publicado");
  const globalViews = average(published.map((item) => numericMetric(item.studioViews || item.views24h)));
  const related = published.filter(
    (item) =>
      item.id !== video.id &&
      ((video.channelId && item.channelId === video.channelId) || (!video.channelId && video.channel && item.channel === video.channel) || item.niche === video.niche),
  );
  const relatedViews = average(related.map((item) => numericMetric(item.studioViews || item.views24h)));
  const relatedCtr = average(related.map((item) => numericMetric(item.ctr)));

  if (related.length >= 2 && relatedViews && globalViews && relatedViews >= globalViews * 1.15) {
    return { points: 18, reason: "tema/canal ja performou acima da media" };
  }

  if (related.length >= 1 && (relatedViews || relatedCtr)) {
    return { points: 12, reason: "tem historico parecido para comparar" };
  }

  if (video.channel || video.channelId) {
    return { points: 6, reason: "esta ligado a um canal definido" };
  }

  return { points: 0, reason: "" };
}

function readinessSignal(video: Video) {
  let points = 0;
  const reasons: string[] = [];

  if (hasScript(video)) {
    points += 14;
    reasons.push("roteiro pronto");
  }

  if (hasThumbnail(video)) {
    points += 8;
    reasons.push("thumbnail pensada");
  }

  if (hasSeo(video)) {
    points += 8;
    reasons.push("SEO iniciado");
  }

  if (video.keyword.trim()) {
    points += 6;
    reasons.push("palavra-chave definida");
  }

  return { points, reasons };
}

export function getNextAction(video: Video) {
  if (!hasScript(video)) {
    return "Escrever roteiro";
  }

  if (video.status === "Ideia" || video.status === "Roteiro") {
    return "Gravar";
  }

  if (video.status === "Gravacao") {
    return "Editar";
  }

  if (!hasThumbnail(video)) {
    return "Criar thumbnail";
  }

  if (!hasSeo(video)) {
    return "Revisar SEO";
  }

  if (video.status === "SEO") {
    return "Agendar";
  }

  if (video.status === "Agendado") {
    return "Publicar";
  }

  return nextStatus(video.status) ? `Avancar para ${nextStatus(video.status)}` : "Revisar";
}

export function getOpportunityScore(video: Video, videos: Video[]): OpportunityScore {
  if (video.status === "Publicado" || video.archived) {
    return {
      score: 0,
      label: "Baixa",
      tone: "low",
      nextAction: "Publicado",
      reasons: ["ja saiu do fluxo ativo"],
    };
  }

  let score = 10 + STATUS_WEIGHT[video.status];
  const reasons: string[] = [];

  if (video.priority === "Alta") {
    score += 16;
    reasons.push("prioridade alta");
  } else if (video.priority === "Media") {
    score += 9;
  } else {
    score += 3;
  }

  const readiness = readinessSignal(video);
  score += readiness.points;
  reasons.push(...readiness.reasons);

  const performance = performanceSignal(video, videos);
  score += performance.points;
  if (performance.reason) {
    reasons.push(performance.reason);
  }

  const date = dateSignal(video);
  score += date.points;
  if (date.reason) {
    reasons.push(date.reason);
  }

  if (video.title.length >= 24) {
    score += 5;
    reasons.push("titulo ja tem promessa");
  }

  if (!video.plannedDate) {
    score -= 4;
  }

  if (!hasScript(video) && ["Gravacao", "Edicao", "Thumbnail", "SEO", "Agendado"].includes(video.status)) {
    score -= 12;
    reasons.push("etapa avancada sem roteiro");
  }

  const finalScore = clampScore(score);

  return {
    score: finalScore,
    label: finalScore >= 72 ? "Alta" : finalScore >= 48 ? "Boa" : "Baixa",
    tone: finalScore >= 72 ? "strong" : finalScore >= 48 ? "medium" : "low",
    nextAction: getNextAction(video),
    reasons: reasons.slice(0, 3),
  };
}

export function getTopOpportunities(videos: Video[]) {
  const active = videos.filter((video) => !video.archived && video.status !== "Publicado");
  const scored = active
    .map((video) => ({ video, opportunity: getOpportunityScore(video, videos) }))
    .sort((a, b) => b.opportunity.score - a.opportunity.score || b.video.updatedAt.localeCompare(a.video.updatedAt));

  const recordNow = scored.find(({ video }) => hasScript(video) && ["Ideia", "Roteiro", "Gravacao"].includes(video.status));
  const quickWin = scored.find(({ video }) => hasScript(video) && hasThumbnail(video) && hasSeo(video));

  return {
    top: scored[0] || null,
    recordNow: recordNow || scored[0] || null,
    quickWin: quickWin || scored.find(({ opportunity }) => opportunity.nextAction !== "Escrever roteiro") || scored[0] || null,
    ranked: scored,
  };
}
