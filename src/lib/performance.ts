import type { Video } from "../types";
import { getPublishDate } from "./video";

// Fecha o loop publicar → aprender → melhorar: compara um vídeo com a média do
// canal e identifica o vídeo recém-publicado que ainda não foi refletido.

function num(value: string): number {
  const n = Number(String(value || "").replace(",", ".").replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export function videoViews(v: Video): number {
  return num(v.studioViews || v.views24h);
}

function avg(values: number[]): number {
  const valid = values.filter((n) => n > 0);
  return valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : 0;
}

export type Benchmarks = {
  views: number;
  ctr: number;
  retention: number;
  sampleSize: number;
};

// Média a partir dos publicados (inclui sincronizados — são dados reais do canal).
export function getChannelBenchmarks(videos: Video[], excludeId?: string): Benchmarks {
  const published = videos.filter((v) => v.status === "Publicado" && v.id !== excludeId);
  return {
    views: avg(published.map(videoViews)),
    ctr: avg(published.map((v) => num(v.ctr))),
    retention: avg(published.map((v) => num(v.studioRetention))),
    sampleSize: published.length,
  };
}

export type MetricComparison = {
  key: "views" | "ctr" | "retention";
  label: string;
  value: number;
  average: number;
  deltaPct: number;
  direction: "up" | "down" | "flat";
  display: string;
  averageDisplay: string;
};

const fmtViews = (n: number) =>
  new Intl.NumberFormat("pt-BR", {
    notation: n >= 10000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(n);

const fmtPct = (n: number) => `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(n)}%`;

export function compareVideoToBenchmarks(video: Video, benchmarks: Benchmarks): MetricComparison[] {
  const rows: Array<Omit<MetricComparison, "deltaPct" | "direction" | "display" | "averageDisplay"> & { fmt: (n: number) => string }> = [
    { key: "views", label: "Views", value: videoViews(video), average: benchmarks.views, fmt: fmtViews },
    { key: "ctr", label: "CTR", value: num(video.ctr), average: benchmarks.ctr, fmt: fmtPct },
    { key: "retention", label: "Retenção", value: num(video.studioRetention), average: benchmarks.retention, fmt: fmtPct },
  ];

  return rows
    .filter((r) => r.value > 0 && r.average > 0)
    .map((r) => {
      const deltaPct = ((r.value - r.average) / r.average) * 100;
      const direction = Math.abs(deltaPct) < 5 ? "flat" : deltaPct > 0 ? "up" : "down";
      return {
        key: r.key,
        label: r.label,
        value: r.value,
        average: r.average,
        deltaPct,
        direction,
        display: r.fmt(r.value),
        averageDisplay: r.fmt(r.average),
      };
    });
}

function daysSincePublish(video: Video): number {
  const pub = getPublishDate(video);
  if (!pub) return -1;
  const date = new Date(pub + "T00:00:00");
  if (Number.isNaN(date.getTime())) return -1;
  return Math.floor((Date.now() - date.getTime()) / 86_400_000);
}

// Vídeo publicado recentemente (2–21 dias) que ainda não teve a lição anotada.
// É o gancho do dashboard para o usuário voltar e refletir.
export function getVideoAwaitingReview(videos: Video[]): { video: Video; days: number } | null {
  const candidates = videos
    .filter((v) => v.status === "Publicado" && !v.lessons.trim())
    .map((v) => ({ video: v, days: daysSincePublish(v) }))
    .filter(({ days }) => days >= 2 && days <= 21)
    .sort((a, b) => a.days - b.days); // mais recente primeiro

  return candidates[0] || null;
}
