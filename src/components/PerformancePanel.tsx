import { useMemo, useState } from "react";
import type { Video } from "../types";
import { getDataSourceLabel } from "../lib/dataSource";
import { formatDate, isSameMonth, parseDate } from "../lib/date";
import { getPublishDate, sortPublishedByDate } from "../lib/video";
import { Button, cx } from "./ui";

type PeriodFilter = "all" | "7" | "30" | "90" | "month";
type SortKey = "date" | "views" | "ctr" | "retention" | "title";

const periodOptions: Array<{ value: PeriodFilter; label: string }> = [
  { value: "all", label: "Todo periodo" },
  { value: "7", label: "Ultimos 7 dias" },
  { value: "30", label: "Ultimos 30 dias" },
  { value: "90", label: "Ultimos 90 dias" },
  { value: "month", label: "Este mes" },
];

const sortOptions: Array<{ value: SortKey; label: string }> = [
  { value: "date", label: "Mais recentes" },
  { value: "views", label: "Mais views" },
  { value: "ctr", label: "Maior CTR" },
  { value: "retention", label: "Maior retencao" },
  { value: "title", label: "Titulo A-Z" },
];

function formatImportDate(value: string) {
  const date = value ? new Date(value) : null;

  if (!date || Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString("pt-BR");
}

function metricNumber(value: string) {
  const normalized = String(value || "")
    .trim()
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".")
    .replace(/[^\d.]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function average(values: number[]) {
  const valid = values.filter((value) => value > 0);
  if (!valid.length) {
    return 0;
  }

  return valid.reduce((total, value) => total + value, 0) / valid.length;
}

function formatCompactNumber(value: number) {
  if (!value) {
    return "-";
  }

  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: value >= 1000 ? 1 : 0,
    notation: value >= 10000 ? "compact" : "standard",
  }).format(value);
}

function formatPercent(value: number) {
  if (!value) {
    return "-";
  }

  return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(value)}%`;
}

function getViews(video: Video) {
  return video.studioViews || video.views24h || "";
}

function videoViews(video: Video) {
  return metricNumber(getViews(video));
}

function videoCtr(video: Video) {
  return metricNumber(video.ctr);
}

function videoRetention(video: Video) {
  return metricNumber(video.studioRetention);
}

function getDateTime(video: Video) {
  const date = parseDate(getPublishDate(video));
  return date ? date.getTime() : 0;
}

function isWithinPeriod(video: Video, period: PeriodFilter) {
  const date = parseDate(getPublishDate(video));

  if (period === "all") {
    return true;
  }

  if (!date) {
    return false;
  }

  if (period === "month") {
    return isSameMonth(getPublishDate(video));
  }

  const days = Number(period);
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - Math.max(0, days - 1));
  return date >= start;
}

function sortPublished(videos: Video[], sortKey: SortKey) {
  const sorted = [...videos];

  if (sortKey === "title") {
    return sorted.sort((a, b) => a.title.localeCompare(b.title, "pt-BR", { sensitivity: "base" }));
  }

  if (sortKey === "views") {
    return sorted.sort((a, b) => metricNumber(getViews(b)) - metricNumber(getViews(a)) || getDateTime(b) - getDateTime(a));
  }

  if (sortKey === "ctr") {
    return sorted.sort((a, b) => metricNumber(b.ctr) - metricNumber(a.ctr) || metricNumber(getViews(b)) - metricNumber(getViews(a)));
  }

  if (sortKey === "retention") {
    return sorted.sort(
      (a, b) => metricNumber(b.studioRetention) - metricNumber(a.studioRetention) || metricNumber(getViews(b)) - metricNumber(getViews(a)),
    );
  }

  return sortPublishedByDate(sorted);
}

const stopWords = new Set([
  "a",
  "agora",
  "ao",
  "aos",
  "as",
  "com",
  "como",
  "da",
  "das",
  "de",
  "do",
  "dos",
  "e",
  "em",
  "esse",
  "essa",
  "esta",
  "este",
  "mais",
  "meu",
  "minha",
  "na",
  "nas",
  "no",
  "nos",
  "o",
  "os",
  "para",
  "por",
  "que",
  "se",
  "sem",
  "sua",
  "seu",
  "um",
  "uma",
  "voce",
  "video",
]);

function normalizeTerm(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function termsForVideo(video: Video) {
  return [video.title, video.keyword, video.seoTitle, video.seoNotes]
    .join(" ")
    .split(/[^\p{L}\p{N}]+/u)
    .map(normalizeTerm)
    .filter((term) => term.length > 2 && !stopWords.has(term) && !/^\d+$/.test(term));
}

function rankTerms(videos: Video[]) {
  const ranking = new Map<string, { count: number; views: number; ctr: number; ctrCount: number }>();

  for (const video of videos) {
    const views = videoViews(video);
    const ctr = videoCtr(video);
    const uniqueTerms = new Set(termsForVideo(video));

    for (const term of uniqueTerms) {
      const current = ranking.get(term) || { count: 0, views: 0, ctr: 0, ctrCount: 0 };
      ranking.set(term, {
        count: current.count + 1,
        views: current.views + views,
        ctr: current.ctr + ctr,
        ctrCount: current.ctrCount + (ctr ? 1 : 0),
      });
    }
  }

  return [...ranking.entries()]
    .map(([term, stats]) => ({
      term,
      count: stats.count,
      averageCtr: stats.ctrCount ? stats.ctr / stats.ctrCount : 0,
      averageViews: stats.count ? stats.views / stats.count : 0,
    }))
    .filter((item) => item.count >= 1 && item.averageViews > 0)
    .sort((a, b) => b.averageViews - a.averageViews || b.count - a.count || a.term.localeCompare(b.term, "pt-BR"))
    .slice(0, 6);
}

function rankFormats(videos: Video[]) {
  const ranking = new Map<string, { count: number; views: number; retention: number; retentionCount: number }>();

  for (const video of videos) {
    const format = video.contentType || video.videoFormat || "Sem formato";
    const retention = videoRetention(video);
    const current = ranking.get(format) || { count: 0, views: 0, retention: 0, retentionCount: 0 };

    ranking.set(format, {
      count: current.count + 1,
      views: current.views + videoViews(video),
      retention: current.retention + retention,
      retentionCount: current.retentionCount + (retention ? 1 : 0),
    });
  }

  return [...ranking.entries()]
    .map(([format, stats]) => ({
      format,
      count: stats.count,
      averageViews: stats.count ? stats.views / stats.count : 0,
      averageRetention: stats.retentionCount ? stats.retention / stats.retentionCount : 0,
    }))
    .sort((a, b) => b.averageViews - a.averageViews || b.count - a.count || a.format.localeCompare(b.format, "pt-BR"))
    .slice(0, 4);
}

function buildInsights(videos: Video[]) {
  const averageViewCount = average(videos.map(videoViews));
  const averageCtrCount = average(videos.map(videoCtr));
  const videosWithViews = videos.filter((video) => videoViews(video) > 0);
  const strongest = [...videosWithViews].sort((a, b) => videoViews(b) - videoViews(a)).slice(0, 3);
  const weakest = [...videosWithViews]
    .filter((video) => averageViewCount > 0 && videoViews(video) < averageViewCount)
    .sort((a, b) => videoViews(a) - videoViews(b))
    .slice(0, 3);
  const aboveAverage = [...videosWithViews]
    .filter((video) => averageViewCount > 0 && videoViews(video) >= averageViewCount * 1.25)
    .sort((a, b) => videoViews(b) - videoViews(a));

  return {
    aboveAverage,
    averageCtr: averageCtrCount,
    averageViews: averageViewCount,
    strongest,
    themes: rankTerms(videos),
    formats: rankFormats(videos),
    weakest,
  };
}

function SourceBadge({ video }: { video: Video }) {
  const dataSource = getDataSourceLabel(video);

  if (!dataSource) {
    return null;
  }

  return (
    <span
      className={cx(
        "inline-flex w-fit rounded-md px-2 py-1 text-[0.68rem] font-black",
        dataSource === "YouTube API" && "bg-aqua/10 text-aqua",
        dataSource === "Legado" && "bg-sky-300/10 text-sky-100",
        dataSource === "Manual" && "bg-white/[0.045] text-slate-400",
      )}
    >
      {dataSource}
    </span>
  );
}

export function PerformancePanel({ videos, onOpen }: { videos: Video[]; onOpen: (video: Video) => void }) {
  const [period, setPeriod] = useState<PeriodFilter>("90");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const published = useMemo(() => videos.filter((video) => video.status === "Publicado"), [videos]);
  const visiblePublished = useMemo(
    () => sortPublished(published.filter((video) => isWithinPeriod(video, period)), sortKey),
    [period, published, sortKey],
  );
  const apiImported = visiblePublished.filter((video) => video.studioImportedAt).length;
  const publishedThisMonth = published.filter((video) => isSameMonth(getPublishDate(video))).length;
  const averageViews = average(visiblePublished.map((video) => metricNumber(getViews(video))));
  const averageCtr = average(visiblePublished.map((video) => metricNumber(video.ctr)));
  const insights = useMemo(() => buildInsights(visiblePublished), [visiblePublished]);

  return (
    <section className="space-y-4">
      <div className="clean-panel rounded-2xl p-5">
        <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-end 2xl:justify-between">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase text-aqua">Publicados</p>
            <h2 className="text-xl font-black sm:text-2xl">Performance dos videos</h2>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
              Filtre por periodo e ordene pelos sinais que realmente ajudam a decidir o proximo video.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4 2xl:min-w-[36rem]">
            <SummaryCard label="Exibidos" value={String(visiblePublished.length)} />
            <SummaryCard label="YouTube API" value={String(apiImported)} />
            <SummaryCard label="Mes" value={String(publishedThisMonth)} />
            <SummaryCard label="Media views" value={formatCompactNumber(averageViews)} />
          </div>
        </div>
      </div>

      <section className="clean-panel rounded-2xl p-4 sm:p-5">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase text-aqua">Leitura do periodo</p>
            <h3 className="text-lg font-black text-white">O que os publicados estao dizendo</h3>
          </div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
            Media {formatCompactNumber(insights.averageViews)} views / {formatPercent(insights.averageCtr)} CTR
          </p>
        </div>

        {visiblePublished.length ? (
          <div className="grid gap-3 xl:grid-cols-4">
            <InsightCard title="Melhores videos" empty="Sem views suficientes.">
              <VideoRanking videos={insights.strongest} metric={(video) => `${formatCompactNumber(videoViews(video))} views`} onOpen={onOpen} />
            </InsightCard>
            <InsightCard title="Abaixo da media" empty="Nenhum ponto fraco claro.">
              <VideoRanking videos={insights.weakest} metric={(video) => `${formatCompactNumber(videoViews(video))} views`} onOpen={onOpen} muted />
            </InsightCard>
            <InsightCard title="Acima da media" empty="Sem video 25% acima da media.">
              <VideoRanking videos={insights.aboveAverage.slice(0, 3)} metric={(video) => `${formatCompactNumber(videoViews(video))} views`} onOpen={onOpen} />
            </InsightCard>
            <InsightCard title="Temas e formatos" empty="Sincronize mais historico.">
              <div className="space-y-3">
                <CompactRanking
                  items={insights.themes.slice(0, 3).map((item) => ({
                    label: item.term,
                    detail: `${formatCompactNumber(item.averageViews)} views media`,
                  }))}
                />
                <CompactRanking
                  items={insights.formats.slice(0, 2).map((item) => ({
                    label: item.format,
                    detail: `${item.count} videos / ${formatCompactNumber(item.averageViews)} media`,
                  }))}
                />
              </div>
            </InsightCard>
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-slate-700/70 p-4 text-sm leading-6 text-slate-500">
            Escolha um periodo com videos publicados para ver os sinais automaticos.
          </p>
        )}
      </section>

      <div className="clean-panel rounded-2xl p-4 sm:p-5">
        <div className="mb-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_15rem_15rem] lg:items-end">
          <div>
            <h3 className="text-lg font-black text-white">Biblioteca publicada</h3>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              {visiblePublished.length ? `${visiblePublished.length} de ${published.length} videos` : "Nenhum publicado no filtro"}
            </p>
          </div>
          <label className="field-label">
            <span>Periodo</span>
            <select className="field-control" value={period} onChange={(event) => setPeriod(event.target.value as PeriodFilter)}>
              {periodOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field-label">
            <span>Ordenar</span>
            <select className="field-control" value={sortKey} onChange={(event) => setSortKey(event.target.value as SortKey)}>
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {visiblePublished.length ? (
          <div className="overflow-hidden rounded-xl border border-slate-800/90 bg-black/12">
            <div className="hidden grid-cols-[minmax(0,1.6fr)_7rem_6rem_5rem_6rem_6rem] gap-3 border-b border-slate-800/80 bg-white/[0.025] px-4 py-3 text-xs font-semibold uppercase text-slate-500 lg:grid">
              <span>Video</span>
              <span>Data</span>
              <span>Views</span>
              <span>CTR</span>
              <span>Retencao</span>
              <span className="text-right">Acao</span>
            </div>
            <div className="max-h-[min(68vh,740px)] divide-y divide-slate-800/80 overflow-y-auto">
              {visiblePublished.map((video) => (
                <article
                  key={video.id}
                  className="grid gap-3 px-4 py-4 transition hover:bg-white/[0.025] lg:grid-cols-[minmax(0,1.6fr)_7rem_6rem_5rem_6rem_6rem] lg:items-center"
                >
                  <div className="min-w-0">
                    <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start">
                      <h4 className="line-clamp-2 min-w-0 flex-1 text-sm font-black leading-5 text-white">{video.title}</h4>
                      <SourceBadge video={video} />
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs font-bold text-slate-500">
                      <span>{[video.channel, video.niche].filter(Boolean).join(" / ") || "Sem canal"}</span>
                      {video.contentType ? <span>{video.contentType}</span> : null}
                      {video.studioImportedAt ? <span>Sync {formatImportDate(video.studioImportedAt)}</span> : null}
                    </div>
                    {(video.performanceNotes || video.lessons) && (
                      <p className="mt-2 line-clamp-1 text-xs font-semibold text-slate-400">
                        {video.lessons || video.performanceNotes}
                      </p>
                    )}
                  </div>

                  <MetricCell label="Data" value={formatDate(getPublishDate(video), "Sem data")} />
                  <MetricCell label="Views" value={getViews(video) || "-"} />
                  <MetricCell label="CTR" value={video.ctr ? `${video.ctr}%` : "-"} />
                  <MetricCell label="Retencao" value={video.studioRetention ? `${video.studioRetention}%` : "-"} />
                  <div className="flex justify-start lg:justify-end">
                    <Button className="min-h-9 px-4 text-xs" onClick={() => onOpen(video)}>
                      Abrir
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-slate-700/70 p-4 text-sm leading-6 text-slate-500">
            Nenhum video encontrado neste periodo. Troque o filtro ou sincronize mais historico do canal.
          </p>
        )}
      </div>
    </section>
  );
}

function InsightCard({ children, empty, title }: { children: React.ReactNode; empty: string; title: string }) {
  const hasChildren = Boolean(children);

  return (
    <article className="rounded-xl border border-slate-800/80 bg-black/16 p-4">
      <h4 className="text-sm font-black text-white">{title}</h4>
      <div className="mt-3">
        {hasChildren ? children : <p className="text-sm font-semibold leading-6 text-slate-500">{empty}</p>}
      </div>
    </article>
  );
}

function VideoRanking({
  metric,
  muted = false,
  onOpen,
  videos,
}: {
  metric: (video: Video) => string;
  muted?: boolean;
  onOpen: (video: Video) => void;
  videos: Video[];
}) {
  if (!videos.length) {
    return <p className="text-sm font-semibold leading-6 text-slate-500">Sem dados suficientes.</p>;
  }

  return (
    <div className="space-y-2">
      {videos.map((video, index) => (
        <button
          key={video.id}
          type="button"
          className="flex w-full items-start gap-3 rounded-lg bg-white/[0.035] p-3 text-left transition hover:bg-white/[0.06]"
          onClick={() => onOpen(video)}
        >
          <span
            className={cx(
              "grid h-7 w-7 shrink-0 place-items-center rounded-md text-xs font-black",
              muted ? "bg-amber-300/10 text-amber-100" : "bg-aqua/10 text-aqua",
            )}
          >
            {index + 1}
          </span>
          <span className="min-w-0 flex-1">
            <span className="line-clamp-2 text-xs font-black leading-5 text-white">{video.title}</span>
            <span className="mt-1 block text-xs font-bold text-slate-500">{metric(video)}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

function CompactRanking({ items }: { items: Array<{ detail: string; label: string }> }) {
  if (!items.length) {
    return <p className="text-sm font-semibold leading-6 text-slate-500">Sem ranking ainda.</p>;
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={`${item.label}-${item.detail}`} className="rounded-lg bg-white/[0.035] px-3 py-2">
          <p className="truncate text-xs font-black text-white">{item.label}</p>
          <p className="mt-1 truncate text-xs font-bold text-slate-500">{item.detail}</p>
        </div>
      ))}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-800/80 bg-black/16 p-3">
      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
      <strong className="mt-1 block text-lg font-black text-white">{value}</strong>
    </div>
  );
}

function MetricCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-white/[0.025] px-3 py-2 text-sm font-black text-slate-200 lg:block lg:bg-transparent lg:px-0 lg:py-0">
      <span className="text-xs font-semibold uppercase text-slate-600 lg:hidden">{label}</span>
      <span className="truncate">{value}</span>
    </div>
  );
}
