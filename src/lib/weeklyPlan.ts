import type { Video } from "../types";
import { addDays, formatDate, localDateKey, parseDate, startOfWeek } from "./date";
import { getNextAction, getOpportunityScore, getTopOpportunities } from "./opportunity";
import { hasScript, hasSeo, hasThumbnail, isOverdue } from "./video";

export type WeeklyPlanItem = {
  id: string;
  date: string;
  dayLabel: string;
  action: string;
  reason: string;
  score: number;
  video: Video;
};

export type WeeklyPlan = {
  weekStart: string;
  weekEnd: string;
  days: Array<{
    date: string;
    dayLabel: string;
    items: WeeklyPlanItem[];
  }>;
  totalItems: number;
  readyToPublish: number;
  overdue: number;
};

const DAY_LABELS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"];
const WEEKDAY_CAPACITY = [2, 2, 2, 2, 2, 1, 1];
const PUBLISH_DAY_ORDER = [2, 4, 6, 1, 3, 0, 5];

function isDateInRange(value: string, start: Date, end: Date) {
  const date = parseDate(value);
  return Boolean(date && date >= start && date <= end);
}

function isReadyToPublishNow(video: Video) {
  return hasScript(video) && hasThumbnail(video) && hasSeo(video);
}

function getReason(video: Video, action: string) {
  if (isOverdue(video)) {
    return "Atrasado e precisa voltar para o fluxo.";
  }

  if (isReadyToPublishNow(video) && action === "Publicar") {
    return "Ja tem roteiro, thumbnail e SEO.";
  }

  if (!hasScript(video)) {
    return "Roteiro e o maior bloqueio.";
  }

  if (!hasThumbnail(video)) {
    return "Precisa de visual antes de publicar.";
  }

  if (!hasSeo(video)) {
    return "Falta fechar busca e descricao.";
  }

  return "Boa relacao entre preparo e prioridade.";
}

function preferredDayIndex(item: { video: Video; action: string }, start: Date, end: Date, publishCursor: number) {
  if (isDateInRange(item.video.plannedDate, start, end)) {
    const planned = parseDate(item.video.plannedDate)!;
    return Math.max(0, Math.min(6, Math.round((planned.getTime() - start.getTime()) / 86400000)));
  }

  if (item.action === "Publicar") {
    return PUBLISH_DAY_ORDER[publishCursor % PUBLISH_DAY_ORDER.length];
  }

  if (item.action === "Escrever roteiro") {
    return 0;
  }

  if (item.action === "Gravar") {
    return 1;
  }

  if (item.action === "Editar") {
    return 2;
  }

  if (item.action === "Criar thumbnail" || item.action === "Revisar SEO") {
    return 3;
  }

  return 4;
}

function findAvailableDay(preferred: number, counts: number[]) {
  for (let offset = 0; offset < 7; offset += 1) {
    const index = Math.min(6, preferred + offset);
    if (counts[index] < WEEKDAY_CAPACITY[index]) {
      return index;
    }
  }

  for (let index = 0; index < 7; index += 1) {
    if (counts[index] < WEEKDAY_CAPACITY[index]) {
      return index;
    }
  }

  return -1;
}

export function buildSmartWeeklyPlan(videos: Video[], weeklyGoal: number, baseDate = new Date()): WeeklyPlan {
  const start = startOfWeek(baseDate);
  const end = addDays(start, 6);
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(start, index);
    return {
      date: localDateKey(date),
      dayLabel: `${DAY_LABELS[index]} ${formatDate(localDateKey(date))}`,
      items: [] as WeeklyPlanItem[],
    };
  });

  const active = videos.filter((video) => !video.archived && video.status !== "Publicado");
  const ranked = getTopOpportunities(videos).ranked;
  const overdue = active.filter(isOverdue);
  const plannedThisWeek = active.filter((video) => isDateInRange(video.plannedDate, start, end));
  const readyToPublish = active.filter(isReadyToPublishNow);
  const targetSize = Math.min(
    Math.max(5, weeklyGoal * 3),
    WEEKDAY_CAPACITY.reduce((sum, capacity) => sum + capacity, 0),
    active.length,
  );

  const selected = new Map<string, Video>();

  for (const video of [...overdue, ...plannedThisWeek, ...readyToPublish]) {
    if (selected.size >= targetSize) {
      break;
    }
    selected.set(video.id, video);
  }

  for (const item of ranked) {
    if (selected.size >= targetSize) {
      break;
    }
    selected.set(item.video.id, item.video);
  }

  const items = [...selected.values()]
    .map((video) => {
      const opportunity = getOpportunityScore(video, videos);
      const nextAction = isReadyToPublishNow(video) && readyToPublish.indexOf(video) < weeklyGoal ? "Publicar" : getNextAction(video);
      return { video, action: nextAction, score: opportunity.score };
    })
    .sort((a, b) => {
      if (a.action === "Publicar" && b.action !== "Publicar") return -1;
      if (a.action !== "Publicar" && b.action === "Publicar") return 1;
      return b.score - a.score || b.video.updatedAt.localeCompare(a.video.updatedAt);
    });

  const counts = Array(7).fill(0) as number[];
  let publishCursor = 0;

  for (const item of items) {
    const preferred = preferredDayIndex(item, start, end, publishCursor);
    const dayIndex = findAvailableDay(preferred, counts);

    if (dayIndex < 0) {
      continue;
    }

    if (item.action === "Publicar") {
      publishCursor += 1;
    }

    counts[dayIndex] += 1;
    days[dayIndex].items.push({
      id: `${item.video.id}-${days[dayIndex].date}-${item.action}`,
      date: days[dayIndex].date,
      dayLabel: days[dayIndex].dayLabel,
      action: item.action,
      reason: getReason(item.video, item.action),
      score: item.score,
      video: item.video,
    });
  }

  return {
    weekStart: days[0].date,
    weekEnd: days[6].date,
    days,
    totalItems: days.reduce((sum, day) => sum + day.items.length, 0),
    readyToPublish: readyToPublish.length,
    overdue: overdue.length,
  };
}
