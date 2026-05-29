import type { AppData } from "../types";
import { localDateKey } from "./date";
import { normalizeAppData, readJson } from "./storage";
import { makeId } from "./video";

export const BACKUP_HISTORY_KEY = "creator-board-backup-history-v1";
const MAX_BACKUPS = 8;

export type BackupReason = "auto" | "manual" | "import" | "restore";

export type BackupSnapshot = {
  id: string;
  label: string;
  reason: BackupReason;
  createdAt: string;
  stats: BackupStats;
  data: AppData;
};

export type BackupStats = {
  channels: number;
  videos: number;
  activeVideos: number;
  publishedVideos: number;
  radarIdeas: number;
  inspirations: number;
  trends: number;
};

export function getBackupStats(data: AppData): BackupStats {
  return {
    channels: data.channels.length,
    videos: data.videos.length,
    activeVideos: data.videos.filter((video) => !video.archived).length,
    publishedVideos: data.videos.filter((video) => video.status === "Publicado").length,
    radarIdeas: data.radar.ideas.length,
    inspirations: data.inspirations.length,
    trends: data.trends.length,
  };
}

function normalizeBackupSnapshot(raw: unknown): BackupSnapshot | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const snapshot = raw as Partial<BackupSnapshot>;
  if (!snapshot.data) {
    return null;
  }

  const reason: BackupReason =
    snapshot.reason === "manual" || snapshot.reason === "import" || snapshot.reason === "restore" ? snapshot.reason : "auto";
  const data = normalizeAppData(snapshot.data);

  return {
    id: typeof snapshot.id === "string" && snapshot.id ? snapshot.id : makeId(),
    label: typeof snapshot.label === "string" && snapshot.label ? snapshot.label : "Backup do Creator Board",
    reason,
    createdAt: typeof snapshot.createdAt === "string" && snapshot.createdAt ? snapshot.createdAt : new Date().toISOString(),
    stats: getBackupStats(data),
    data,
  };
}

export function readBackupSnapshots() {
  const raw = readJson<unknown>(BACKUP_HISTORY_KEY, []);
  return Array.isArray(raw)
    ? raw
        .map(normalizeBackupSnapshot)
        .filter((snapshot): snapshot is BackupSnapshot => Boolean(snapshot))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, MAX_BACKUPS)
    : [];
}

function persistBackupSnapshots(snapshots: BackupSnapshot[]) {
  let next = snapshots
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, MAX_BACKUPS);

  while (next.length) {
    try {
      localStorage.setItem(BACKUP_HISTORY_KEY, JSON.stringify(next));
      return next;
    } catch (error) {
      console.warn("Nao foi possivel salvar todos os pontos de restauracao.", error);
      next = next.slice(0, -1);
    }
  }

  return [];
}

export function createBackupSnapshot(
  data: AppData,
  currentSnapshots: BackupSnapshot[],
  reason: BackupReason,
  label: string,
) {
  const snapshot: BackupSnapshot = {
    id: makeId(),
    label,
    reason,
    createdAt: new Date().toISOString(),
    stats: getBackupStats(data),
    data: normalizeAppData(data),
  };

  return persistBackupSnapshots([snapshot, ...currentSnapshots.filter((item) => item.id !== snapshot.id)]);
}

export function maybeCreateDailyBackup(data: AppData, currentSnapshots: BackupSnapshot[]) {
  const today = localDateKey();
  const hasTodayAutoBackup = currentSnapshots.some(
    (snapshot) => snapshot.reason === "auto" && snapshot.createdAt.slice(0, 10) === today,
  );

  if (hasTodayAutoBackup) {
    return currentSnapshots;
  }

  return createBackupSnapshot(data, currentSnapshots, "auto", `Backup automatico de ${today}`);
}

export function deleteBackupSnapshot(id: string, currentSnapshots: BackupSnapshot[]) {
  return persistBackupSnapshots(currentSnapshots.filter((snapshot) => snapshot.id !== id));
}

export function clearBackupSnapshots() {
  try {
    localStorage.removeItem(BACKUP_HISTORY_KEY);
  } catch (error) {
    console.warn("Nao foi possivel limpar os pontos de restauracao.", error);
  }

  return [];
}
