import type { Video } from "../types";

type SourceVideo = Pick<
  Video,
  | "views24h"
  | "ctr"
  | "avgDuration"
  | "studioViews"
  | "studioImpressions"
  | "studioRetention"
  | "studioSourceFile"
  | "studioCreatedFromCsv"
  | "studioCreatedFromOnline"
>;

function hasValue(value: unknown) {
  return Boolean(String(value || "").trim());
}

export function isYouTubeApiSource(video: Pick<Video, "studioSourceFile" | "studioCreatedFromOnline">) {
  return video.studioCreatedFromOnline || String(video.studioSourceFile || "").startsWith("YouTube API");
}

export function isCsvSource(video: Pick<Video, "studioSourceFile" | "studioCreatedFromCsv">) {
  return video.studioCreatedFromCsv || (hasValue(video.studioSourceFile) && !String(video.studioSourceFile).startsWith("YouTube API"));
}

export function hasImportedMetrics(video: SourceVideo) {
  return [
    video.studioViews,
    video.studioImpressions,
    video.studioRetention,
    video.studioSourceFile,
  ].some(hasValue);
}

export function getDataSourceLabel(video: SourceVideo) {
  if (isYouTubeApiSource(video)) {
    return "YouTube API";
  }

  if (isCsvSource(video)) {
    return "Legado";
  }

  if ([video.views24h, video.ctr, video.avgDuration].some(hasValue)) {
    return "Manual";
  }

  return "";
}
