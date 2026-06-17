import type { Channel, Video } from "../types";
import { formatDate, isSameWeek } from "../lib/date";
import { getPublishDate } from "../lib/video";

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

function formatNumber(value: number) {
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

function videoViews(video: Video) {
  return metricNumber(video.studioViews || video.views24h);
}

function bestValue(videos: Video[], field: "contentType" | "videoFormat" | "studioPublishedHour") {
  const ranking = new Map<string, { count: number; views: number }>();

  for (const video of videos) {
    const value = video[field]?.trim();

    if (!value) {
      continue;
    }

    const current = ranking.get(value) || { count: 0, views: 0 };
    ranking.set(value, { count: current.count + 1, views: current.views + videoViews(video) });
  }

  return [...ranking.entries()]
    .map(([value, stats]) => ({ value, averageViews: stats.views / Math.max(1, stats.count), count: stats.count }))
    .sort((a, b) => b.averageViews - a.averageViews || b.count - a.count)[0];
}

export function ChannelPulsePanel({ channel, videos }: { channel: Channel | null; videos: Video[] }) {
  const published = videos.filter((video) => video.status === "Publicado");
  const inProduction = videos.filter((video) => !["Ideia", "Publicado"].includes(video.status)).length;
  const publishedThisWeek = published.filter((video) => isSameWeek(getPublishDate(video))).length;
  const averageViews = average(published.map(videoViews));
  const averageCtr = average(published.map((video) => metricNumber(video.ctr)));
  const strongFormat = bestValue(published, "contentType") || bestValue(published, "videoFormat");
  const bestHour = bestValue(published, "studioPublishedHour");
  const topVideo = [...published].sort((a, b) => videoViews(b) - videoViews(a))[0] || null;
  const goal = channel?.weeklyGoal || 2;

  return (
    <section className="clean-panel rounded-2xl p-5">
      <div className="mb-5 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mb-1 text-xs font-black uppercase text-aqua">Canal ativo</p>
          <h2 className="text-xl font-black text-white sm:text-2xl">{channel?.name || "Todos os canais"}</h2>
          <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-500">
            {channel?.niche || "Visao consolidada"} / {channel?.lastSyncedAt ? `sync ${formatDate(channel.lastSyncedAt.slice(0, 10))}` : "sem sync recente"}
          </p>
        </div>
        <div className="rounded-xl border border-slate-800/80 bg-black/16 px-4 py-3">
          <p className="text-xs font-black uppercase text-slate-500">Meta semanal</p>
          <strong className="mt-1 block text-xl font-black text-white">
            {publishedThisWeek}/{goal}
          </strong>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {/* Contadores sempre presentes */}
        <PulseItem label="Publicados" value={String(published.length)} detail={`${videos.length} videos ativos`} />
        <PulseItem label="Em producao" value={String(inProduction)} detail="Fora de ideia/publicado" />
        {/* Métricas só aparecem quando há dado — nada de placeholders "-" */}
        {averageViews > 0 && (
          <PulseItem label="Media views" value={formatNumber(averageViews)} detail="Studio ou 24h manual" />
        )}
        {averageCtr > 0 && (
          <PulseItem label="Media CTR" value={formatPercent(averageCtr)} detail="Videos com CTR" />
        )}
        {strongFormat && (
          <PulseItem label="Formato forte" value={strongFormat.value} detail={`${formatNumber(strongFormat.averageViews)} views media`} />
        )}
        {bestHour && (
          <PulseItem label="Melhor hora" value={bestHour.value} detail={`${formatNumber(bestHour.averageViews)} views media`} />
        )}
      </div>

      {topVideo ? (
        <div className="mt-4 rounded-xl bg-white/[0.035] p-4">
          <p className="text-xs font-black uppercase text-slate-500">Video mais forte</p>
          <p className="mt-2 line-clamp-1 text-sm font-black text-white">{topVideo.title}</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            {formatNumber(videoViews(topVideo))} views / {topVideo.ctr ? `${topVideo.ctr}% CTR` : "CTR sem dado"}
          </p>
        </div>
      ) : null}
    </section>
  );
}

function PulseItem({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <article className="rounded-xl border border-slate-800/80 bg-black/16 p-4">
      <p className="text-xs font-black uppercase text-slate-500">{label}</p>
      <strong className="mt-2 block truncate text-2xl font-black text-white">{value}</strong>
      <p className="mt-1 truncate text-xs font-semibold text-slate-500">{detail}</p>
    </article>
  );
}
