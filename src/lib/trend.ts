import type { Trend, TrendDraft, VideoDraft } from "../types";
import { EMPTY_VIDEO, makeId } from "./video";

export const EMPTY_TREND: TrendDraft = {
  title: "",
  niche: "",
  referenceChannel: "",
  url: "",
  views: "",
  opportunityReason: "",
  ideaAngle: "",
  notes: "",
};

function text(value: unknown, fallback = "") {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return fallback;
}

export function normalizeTrend(raw: Partial<Trend | TrendDraft>): Trend {
  const now = new Date().toISOString();

  return {
    ...EMPTY_TREND,
    id: text(raw.id) || makeId(),
    title: text(raw.title).trim() || "Tendencia sem titulo",
    niche: text(raw.niche).trim(),
    referenceChannel: text(raw.referenceChannel).trim(),
    url: text(raw.url).trim(),
    views: text(raw.views).trim(),
    opportunityReason: text(raw.opportunityReason).trim(),
    ideaAngle: text(raw.ideaAngle).trim(),
    notes: text(raw.notes).trim(),
    createdAt: text(raw.createdAt) || now,
    updatedAt: text(raw.updatedAt) || now,
  };
}

export function normalizeTrendDraft(raw: Partial<Trend | TrendDraft>): TrendDraft {
  const normalized = normalizeTrend(raw);

  return {
    ...normalized,
    id: text(raw.id),
    createdAt: text(raw.createdAt),
    updatedAt: text(raw.updatedAt),
  };
}

export function trendToVideoDraft(trend: Trend): VideoDraft {
  return {
    ...EMPTY_VIDEO,
    title: trend.ideaAngle || trend.title,
    channel: "",
    niche: trend.niche || "Sem nicho",
    keyword: trend.title,
    priority: "Media",
    status: "Ideia",
    inspirationLinks: trend.url,
    notes: [
      trend.referenceChannel ? `Canal referencia: ${trend.referenceChannel}` : "",
      trend.opportunityReason ? `Motivo da oportunidade: ${trend.opportunityReason}` : "",
      trend.views ? `Views observadas: ${trend.views}` : "",
      trend.notes ? `Notas da tendencia: ${trend.notes}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
  };
}
