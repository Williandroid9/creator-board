import type { Video } from "../types";
import type { YouTubeOnlineVideo } from "./youtubeApi";

export type OnlineSyncPreviewItem = {
  row: YouTubeOnlineVideo;
  video: Video | null;
  action: "update" | "create" | "possible_duplicate";
  matchBy: "videoId" | "title" | "similar" | "none";
};

export type OnlineSyncPreview = {
  items: OnlineSyncPreviewItem[];
  updateCount: number;
  createCount: number;
  possibleDuplicateCount: number;
};

export function normalizeTitleKey(value: string) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function extractYouTubeId(url: string) {
  const value = String(url || "");
  const match = value.match(/(?:watch\?v=|youtu\.be\/|shorts\/|embed\/)([a-zA-Z0-9_-]{6,})/);
  return match?.[1] || "";
}

function titleLooksSimilar(a: string, b: string) {
  const left = normalizeTitleKey(a);
  const right = normalizeTitleKey(b);

  if (left.length < 12 || right.length < 12) {
    return false;
  }

  return left.includes(right) || right.includes(left);
}

export function buildOnlineSyncPreview(videos: Video[], rows: YouTubeOnlineVideo[]): OnlineSyncPreview {
  const byVideoId = new Map<string, Video>();
  const byTitle = new Map<string, Video>();

  for (const video of videos) {
    const videoId = video.studioVideoId || extractYouTubeId(video.publishedLink);
    const title = normalizeTitleKey(video.title);

    if (videoId) {
      byVideoId.set(videoId, video);
    }

    if (title && !byTitle.has(title)) {
      byTitle.set(title, video);
    }
  }

  const items = rows.map<OnlineSyncPreviewItem>((row) => {
    const byId = row.videoId ? byVideoId.get(row.videoId) : null;
    if (byId) {
      return { row, video: byId, action: "update", matchBy: "videoId" };
    }

    const byExactTitle = byTitle.get(normalizeTitleKey(row.title));
    if (byExactTitle) {
      return { row, video: byExactTitle, action: "update", matchBy: "title" };
    }

    const similar = videos.find((video) => titleLooksSimilar(video.title, row.title));
    if (similar) {
      return { row, video: similar, action: "possible_duplicate", matchBy: "similar" };
    }

    return { row, video: null, action: "create", matchBy: "none" };
  });

  return {
    items,
    updateCount: items.filter((item) => item.action === "update").length,
    createCount: items.filter((item) => item.action === "create").length,
    possibleDuplicateCount: items.filter((item) => item.action === "possible_duplicate").length,
  };
}
