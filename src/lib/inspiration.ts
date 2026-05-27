import { INSPIRATION_TYPES, type Inspiration, type InspirationDraft, type InspirationType } from "../types";
import { makeId } from "./video";

export const EMPTY_INSPIRATION: InspirationDraft = {
  title: "",
  type: "Video",
  channel: "",
  niche: "",
  url: "",
  notes: "",
  tags: "",
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

export function normalizeInspirationType(type: unknown): InspirationType {
  const value = text(type).trim();
  const aliases: Record<string, InspirationType> = {
    "Vídeo": "Video",
    "VÃ­deo": "Video",
    "Título": "Titulo",
    "TÃ­tulo": "Titulo",
  };

  return INSPIRATION_TYPES.includes(value as InspirationType)
    ? (value as InspirationType)
    : aliases[value] || "Video";
}

export function normalizeInspiration(raw: Partial<InspirationDraft | Inspiration>): Inspiration {
  const now = new Date().toISOString();

  return {
    ...EMPTY_INSPIRATION,
    id: text(raw.id) || makeId(),
    title: text(raw.title).trim() || "Inspiracao sem titulo",
    type: normalizeInspirationType(raw.type),
    channel: text(raw.channel).trim(),
    niche: text(raw.niche).trim(),
    url: text(raw.url).trim(),
    notes: text(raw.notes).trim(),
    tags: text(raw.tags).trim(),
    createdAt: text(raw.createdAt) || now,
    updatedAt: text(raw.updatedAt) || now,
  };
}

export function normalizeInspirationDraft(raw: Partial<InspirationDraft | Inspiration>): InspirationDraft {
  const normalized = normalizeInspiration(raw);

  return {
    ...normalized,
    id: text(raw.id),
    createdAt: text(raw.createdAt),
    updatedAt: text(raw.updatedAt),
  };
}

export function getInspirationChannels(inspirations: Inspiration[]) {
  return [...new Set(inspirations.map((item) => item.channel).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "pt-BR", { sensitivity: "base" }),
  );
}

export function getInspirationNiches(inspirations: Inspiration[]) {
  return [...new Set(inspirations.map((item) => item.niche).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "pt-BR", { sensitivity: "base" }),
  );
}

export function getHost(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}
