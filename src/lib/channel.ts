import type { Channel, ChannelDraft, Video } from "../types";
import { makeId } from "./video";

export const EMPTY_CHANNEL: ChannelDraft = {
  name: "",
  youtubeChannelId: "",
  lastSyncedAt: "",
  lastSyncSource: "",
  url: "",
  niche: "",
  weeklyGoal: 2,
  audience: "",
  promise: "",
  pillars: "",
  formats: "",
  postingFrequency: "",
  competitors: "",
  keywords: "",
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

export function normalizeChannelName(value: string) {
  return text(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function normalizeChannel(raw: Partial<ChannelDraft | Channel>): Channel {
  const now = new Date().toISOString();

  return {
    ...EMPTY_CHANNEL,
    id: text(raw.id) || makeId(),
    name: text(raw.name).trim() || "Canal sem nome",
    youtubeChannelId: text(raw.youtubeChannelId).trim(),
    lastSyncedAt: text(raw.lastSyncedAt).trim(),
    lastSyncSource: text(raw.lastSyncSource).trim(),
    url: text(raw.url).trim(),
    niche: text(raw.niche).trim(),
    weeklyGoal: Number.isFinite(Number(raw.weeklyGoal)) && Number(raw.weeklyGoal) > 0 ? Number(raw.weeklyGoal) : 2,
    audience: text(raw.audience).trim(),
    promise: text(raw.promise).trim(),
    pillars: text(raw.pillars).trim(),
    formats: text(raw.formats).trim(),
    postingFrequency: text(raw.postingFrequency).trim(),
    competitors: text(raw.competitors).trim(),
    keywords: text(raw.keywords).trim(),
    notes: text(raw.notes).trim(),
    createdAt: text(raw.createdAt) || now,
    updatedAt: text(raw.updatedAt) || now,
  };
}

export function normalizeChannelDraft(raw: Partial<ChannelDraft | Channel>): ChannelDraft {
  const normalized = normalizeChannel(raw);

  return {
    ...normalized,
    id: text(raw.id),
    createdAt: text(raw.createdAt),
    updatedAt: text(raw.updatedAt),
  };
}

export function deriveChannelsFromVideos(videos: Video[], existing: Channel[]) {
  const byName = new Map(existing.map((channel) => [normalizeChannelName(channel.name), channel]));
  const next = [...existing];

  for (const video of videos) {
    const key = normalizeChannelName(video.channel);
    if (!key || byName.has(key)) {
      continue;
    }

    const channel = normalizeChannel({
      name: video.channel,
      niche: video.niche,
      createdAt: video.createdAt,
      updatedAt: video.updatedAt,
    });

    byName.set(key, channel);
    next.push(channel);
  }

  return next.sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }));
}

export function bindVideosToChannels(videos: Video[], channels: Channel[]) {
  const byId = new Map(channels.map((channel) => [channel.id, channel]));
  const byName = new Map(channels.map((channel) => [normalizeChannelName(channel.name), channel]));

  return videos.map((video) => {
    const byExistingId = video.channelId ? byId.get(video.channelId) : null;
    const byExistingName = video.channel ? byName.get(normalizeChannelName(video.channel)) : null;
    const channel = byExistingId || byExistingName;

    if (!channel) {
      return video;
    }

    return {
      ...video,
      channelId: channel.id,
      channel: channel.name,
      niche: video.niche || channel.niche,
    };
  });
}
