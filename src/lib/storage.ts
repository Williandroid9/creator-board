import type { AppData, Channel, DailyChecklist, DailyTask, Inspiration, Settings, SyncHistoryItem, Trend, Video } from "../types";
import { bindVideosToChannels, deriveChannelsFromVideos, normalizeChannel } from "./channel";
import { normalizeInspiration } from "./inspiration";
import { normalizeRadarState } from "./radar";
import { normalizeTrend } from "./trend";
import { DEFAULT_TASKS, makeId, normalizeVideo } from "./video";
import { localDateKey } from "./date";

export const APP_STORAGE_KEY = "creator-board-data-v10";
export const NEW_VIDEO_DRAFT_KEY = "creator-board-new-video-draft-v2";

const PREVIOUS_APP_STORAGE_KEYS = [
  "creator-board-data-v9",
  "creator-board-data-v8",
  "creator-board-data-v7",
  "creator-board-data-v6",
  "creator-board-data-v5",
  "creator-board-data-v4",
  "creator-board-data-v3",
  "creator-board-data-v2",
];
const LEGACY_VIDEO_KEY = "creator-board-youtube-v1";
const LEGACY_CHECKLIST_KEY = "creator-board-daily-checklist-v1";
const LEGACY_WEEKLY_GOAL_KEY = "creator-board-weekly-goal-v1";

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

export function readJson<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored ? (JSON.parse(stored) as T) : fallback;
  } catch (error) {
    console.warn(`Nao foi possivel carregar ${key}.`, error);
    return fallback;
  }
}

function normalizeTasks(tasks: unknown): DailyTask[] {
  if (!Array.isArray(tasks) || tasks.length === 0) {
    return DEFAULT_TASKS.map((title) => ({ id: makeId(), title, done: false }));
  }

  return tasks.map((task) => {
    const item = task as Partial<DailyTask>;
    return {
      id: text(item.id) || makeId(),
      title: text(item.title).trim() || "Tarefa",
      done: Boolean(item.done),
    };
  });
}

function normalizeChecklist(raw: unknown): DailyChecklist {
  const today = localDateKey();

  if (Array.isArray(raw)) {
    return {
      date: today,
      tasks: normalizeTasks(raw),
    };
  }

  if (!raw || typeof raw !== "object") {
    return {
      date: today,
      tasks: normalizeTasks(null),
    };
  }

  const checklist = raw as Partial<DailyChecklist>;
  const date = checklist.date || today;

  return {
    date: today,
    tasks: normalizeTasks(checklist.tasks).map((task) => ({
      ...task,
      done: date === today ? task.done : false,
    })),
  };
}

function normalizeSettings(raw: unknown): Settings {
  const value = raw as Partial<Settings> | number | string | null | undefined;
  const weeklyGoal = typeof value === "object" && value !== null ? Number(value.weeklyGoal) : Number(value);
  const defaultChannel = typeof value === "object" && value !== null ? text(value.defaultChannel) : "";
  const productionDays =
    typeof value === "object" && value !== null && Array.isArray(value.productionDays)
      ? [...new Set(value.productionDays.map((day) => text(day).trim()).filter(Boolean))]
          .sort((a, b) => b.localeCompare(a))
          .slice(0, 120)
      : [];

  return {
    weeklyGoal: Number.isFinite(weeklyGoal) && weeklyGoal > 0 ? weeklyGoal : 2,
    defaultChannel,
    productionDays,
  };
}

function normalizeInspirations(raw: unknown): Inspiration[] {
  return Array.isArray(raw) ? raw.map((item) => normalizeInspiration(item as Partial<Inspiration>)) : [];
}

function normalizeChannels(raw: unknown): Channel[] {
  return Array.isArray(raw) ? raw.map((item) => normalizeChannel(item as Partial<Channel>)) : [];
}

function normalizeTrends(raw: unknown): Trend[] {
  return Array.isArray(raw) ? raw.map((item) => normalizeTrend(item as Partial<Trend>)) : [];
}

function normalizeSyncHistory(raw: unknown): SyncHistoryItem[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((item) => {
      const history = item as Partial<SyncHistoryItem>;
      const source = history.source === "CSV" || history.source === "YouTube API" ? history.source : "YouTube API";

      return {
        id: text(history.id) || makeId(),
        source,
        channelId: text(history.channelId),
        channelName: text(history.channelName).trim() || "Canal",
        periodLabel: text(history.periodLabel),
        updated: Math.max(0, Number(history.updated) || 0),
        created: Math.max(0, Number(history.created) || 0),
        skipped: Math.max(0, Number(history.skipped) || 0),
        syncedAt: text(history.syncedAt) || nowIso(),
      };
    })
    .sort((a, b) => b.syncedAt.localeCompare(a.syncedAt))
    .slice(0, 50);
}

export function createEmptyData(): AppData {
  const now = nowIso();

  return {
    schemaVersion: 10,
    videos: [],
    channels: [],
    inspirations: [],
    trends: [],
    radar: normalizeRadarState(null),
    syncHistory: [],
    dailyChecklist: normalizeChecklist(null),
    settings: { weeklyGoal: 2, defaultChannel: "", productionDays: [] },
    createdAt: now,
    updatedAt: now,
  };
}

export function normalizeAppData(raw: unknown): AppData {
  const empty = createEmptyData();

  if (!raw || typeof raw !== "object") {
    return empty;
  }

  const data = raw as Partial<AppData> & { schemaVersion?: number; weeklyGoal?: unknown };
  const videos = Array.isArray(data.videos) ? data.videos.map((video) => normalizeVideo(video as Partial<Video>)) : [];
  const channels = deriveChannelsFromVideos(videos, normalizeChannels(data.channels));
  const settings = normalizeSettings(data.settings || data.weeklyGoal);

  return {
    schemaVersion: 10,
    videos: bindVideosToChannels(videos, channels),
    channels,
    inspirations: normalizeInspirations(data.inspirations),
    trends: normalizeTrends(data.trends),
    radar: normalizeRadarState(data.radar),
    syncHistory: normalizeSyncHistory(data.syncHistory),
    dailyChecklist: normalizeChecklist(data.dailyChecklist),
    settings,
    createdAt: text(data.createdAt) || empty.createdAt,
    updatedAt: text(data.updatedAt) || nowIso(),
  };
}

export function migrateLegacyData(): AppData {
  const legacyVideos = readJson<unknown>(LEGACY_VIDEO_KEY, []);
  const legacyChecklist = readJson<unknown>(LEGACY_CHECKLIST_KEY, null);
  const legacyGoal = readJson<unknown>(LEGACY_WEEKLY_GOAL_KEY, 2);
  const rawVideos =
    Array.isArray(legacyVideos)
      ? legacyVideos
      : legacyVideos && typeof legacyVideos === "object" && Array.isArray((legacyVideos as { videos?: unknown[] }).videos)
        ? (legacyVideos as { videos: unknown[] }).videos
        : [];

  const now = nowIso();
  const videos = rawVideos.map((video) => normalizeVideo(video as Partial<Video>));
  const channels = deriveChannelsFromVideos(videos, []);

  return {
    schemaVersion: 10,
    videos: bindVideosToChannels(videos, channels),
    channels,
    inspirations: [],
    trends: [],
    radar: normalizeRadarState(null),
    syncHistory: [],
    dailyChecklist: normalizeChecklist(legacyChecklist),
    settings: normalizeSettings(legacyGoal),
    createdAt: now,
    updatedAt: now,
  };
}

export function loadAppData(): AppData {
  const existing = readJson<unknown>(APP_STORAGE_KEY, null);
  if (existing && typeof existing === "object") {
    return normalizeAppData(existing);
  }

  for (const key of PREVIOUS_APP_STORAGE_KEYS) {
    const previous = readJson<unknown>(key, null);
    if (previous && typeof previous === "object") {
      return normalizeAppData(previous);
    }
  }

  return migrateLegacyData();
}

export function saveAppData(data: AppData) {
  const next = {
    ...data,
    schemaVersion: 10 as const,
    updatedAt: nowIso(),
  };

  try {
    localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(next));
  } catch (error) {
    console.warn("Nao foi possivel salvar os dados localmente.", error);
  }
}

export function parseImportedData(raw: unknown, current: AppData): AppData {
  if (Array.isArray(raw)) {
    const videos = raw.map((video) => normalizeVideo(video as Partial<Video>));
    const channels = deriveChannelsFromVideos(videos, current.channels);

    return {
      ...current,
      videos: bindVideosToChannels(videos, channels),
      channels,
      updatedAt: nowIso(),
    };
  }

  if (!raw || typeof raw !== "object") {
    throw new Error("Arquivo sem dados compativeis.");
  }

  const payload = raw as Omit<Partial<AppData>, "schemaVersion"> & {
    schemaVersion?: number;
    data?: unknown;
    videos?: unknown[];
    channels?: unknown[];
    inspirations?: unknown[];
    trends?: unknown[];
    radar?: unknown;
    dailyChecklist?: unknown;
    weeklyGoal?: unknown;
  };

  if (payload.data) {
    return normalizeAppData(payload.data);
  }

  if ([2, 3, 4, 5, 6, 7, 8, 9, 10].includes(Number(payload.schemaVersion))) {
    return normalizeAppData(payload);
  }

  if (Array.isArray(payload.videos)) {
    const videos = payload.videos.map((video) => normalizeVideo(video as Partial<Video>));
    const channels = deriveChannelsFromVideos(videos, normalizeChannels(payload.channels || current.channels));

    return {
      ...current,
      videos: bindVideosToChannels(videos, channels),
      channels,
      inspirations: normalizeInspirations(payload.inspirations || current.inspirations),
      trends: normalizeTrends(payload.trends || current.trends),
      radar: normalizeRadarState(payload.radar || current.radar),
      syncHistory: normalizeSyncHistory(payload.syncHistory || current.syncHistory),
      dailyChecklist: payload.dailyChecklist ? normalizeChecklist(payload.dailyChecklist) : current.dailyChecklist,
      settings: payload.weeklyGoal ? normalizeSettings(payload.weeklyGoal) : current.settings,
      updatedAt: nowIso(),
    };
  }

  throw new Error("Formato de backup invalido.");
}
