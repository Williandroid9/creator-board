import type { Channel, Video } from "../types";
import { getPublishDate } from "../lib/video";
import { cx } from "./ui";

type AssetSnowballPanelProps = {
  videos: Video[];
  channels?: Channel[];
  weeklyGoal?: number;
  compact?: boolean;
};

type CreatorRank = {
  title: string;
  mark: string;
  min: number;
  nextAt: number | null;
  nextTitle: string;
  description: string;
};

const DEFAULT_VIDEO_SECONDS = 8 * 60;

const RANKS: CreatorRank[] = [
  {
    title: "Iniciante Fantasma",
    mark: "I",
    min: 0,
    nextAt: 6,
    nextTitle: "Operador de Conteudo",
    description: "Primeira base de ativos. O foco agora e publicar com consistencia.",
  },
  {
    title: "Operador de Conteudo",
    mark: "II",
    min: 6,
    nextAt: 16,
    nextTitle: "Diretor de Nicho",
    description: "Voce ja tem uma esteira real. Agora o objetivo e repetir formatos que funcionam.",
  },
  {
    title: "Diretor de Nicho",
    mark: "III",
    min: 16,
    nextAt: 31,
    nextTitle: "Arquiteto de Acervo",
    description: "O canal comeca a parecer um ativo. Cada publicacao aumenta a base trabalhando por voce.",
  },
  {
    title: "Arquiteto de Acervo",
    mark: "IV",
    min: 31,
    nextAt: 51,
    nextTitle: "Magnata Dark",
    description: "A biblioteca ja tem peso. Agora a meta e escala, repeticao e multiplos canais.",
  },
  {
    title: "Magnata Dark",
    mark: "V",
    min: 51,
    nextAt: null,
    nextTitle: "Dono de Imperio",
    description: "Voce tem um acervo robusto trabalhando todos os dias. O jogo agora e expandir sistemas.",
  },
];

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

function durationSeconds(value: string) {
  const parts = String(value || "")
    .trim()
    .split(":")
    .map((part) => Number(part));

  if (!parts.length || parts.some((part) => Number.isNaN(part))) {
    return 0;
  }

  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }

  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }

  return parts[0] > 60 ? parts[0] : parts[0] * 60;
}

function videoViews(video: Video) {
  return metricNumber(video.studioViews || video.views24h);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: value >= 1000 ? 1 : 0,
    notation: value >= 10000 ? "compact" : "standard",
  }).format(value || 0);
}

function formatHours(seconds: number) {
  const hours = seconds / 3600;
  if (hours < 1) {
    return `${Math.round(seconds / 60)} min`;
  }

  return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(hours)} h`;
}

function getRank(publishedCount: number): CreatorRank {
  return [...RANKS].reverse().find((rank) => publishedCount >= rank.min) || RANKS[0];
}

function getRankProgress(publishedCount: number, rank: CreatorRank) {
  if (!rank.nextAt) {
    return 100;
  }

  const span = rank.nextAt - rank.min;
  const done = publishedCount - rank.min;
  return Math.max(0, Math.min(100, Math.round((done / span) * 100)));
}

function publishedInLastDays(videos: Video[], days: number) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - days);

  return videos.filter((video) => {
    const date = getPublishDate(video);
    if (!date) {
      return false;
    }

    return new Date(`${date}T12:00:00`) >= start;
  }).length;
}

function buildProjectionPoints(current: number, weeklyPace: number) {
  const points = Array.from({ length: 14 }, (_, index) => Math.round(current + weeklyPace * index));
  const max = Math.max(...points, 1);

  return points.map((value, index) => {
    const x = (index / (points.length - 1)) * 100;
    const y = 100 - (value / max) * 86 - 7;
    return { x, y, value };
  });
}

function hasAppProductionEvidence(video: Video) {
  return Boolean(
    video.script.trim() ||
      video.notes.trim() ||
      video.inspirationLinks.trim() ||
      video.linkedInspirationIds.length,
  );
}

function countsForCreatorRank(video: Video) {
  if (video.studioCreatedFromCsv) {
    return false;
  }

  if (video.studioCreatedFromOnline) {
    return hasAppProductionEvidence(video);
  }

  return true;
}

export function AssetSnowballPanel({ videos, channels = [], weeklyGoal = 2, compact = false }: AssetSnowballPanelProps) {
  const published = videos.filter((video) => video.status === "Publicado" && !video.archived);
  const appPublished = published.filter(countsForCreatorRank);
  const publishedCount = appPublished.length;
  const importedPublishedCount = Math.max(0, published.length - appPublished.length);
  const rank = getRank(publishedCount);
  const rankProgress = getRankProgress(publishedCount, rank);
  const totalViews = appPublished.reduce((sum, video) => sum + videoViews(video), 0);
  const totalSeconds = appPublished.reduce((sum, video) => sum + (durationSeconds(video.avgDuration) || DEFAULT_VIDEO_SECONDS), 0);
  const recentCount = publishedInLastDays(appPublished, 30);
  const weeklyPace = Math.max(recentCount / 4.3, weeklyGoal || 0, publishedCount ? 0.25 : 0);
  const projectedAdds = Math.round(weeklyPace * 13);
  const projectedCount = publishedCount + projectedAdds;
  const averageSeconds = publishedCount ? totalSeconds / publishedCount : DEFAULT_VIDEO_SECONDS;
  const projectedHours = totalSeconds + projectedAdds * averageSeconds;
  const points = buildProjectionPoints(publishedCount, weeklyPace);
  const polyline = points.map((point) => `${point.x},${point.y}`).join(" ");
  const nextNeed = rank.nextAt ? Math.max(0, rank.nextAt - publishedCount) : 0;

  return (
    <section className="clean-panel overflow-hidden rounded-2xl p-5">
      <div className={cx("grid gap-5", compact ? "xl:grid-cols-[minmax(0,1fr)_320px]" : "xl:grid-cols-[minmax(0,1fr)_380px]")}>
        <div className="min-w-0">
          <div className="mb-5">
            <div>
              <p className="mb-1 text-xs font-black uppercase text-aqua">Seu Acervo de Ativos</p>
              <h2 className="text-xl font-black text-white sm:text-2xl">Efeito Bola de Neve</h2>
              <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-500">
                Cada video publicado vira um ativo trabalhando 24h por dia. O foco e crescer o acervo, nao sofrer pelo resultado isolado do ultimo post.
              </p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <AssetStat label="Publicados pelo app" value={String(publishedCount)} detail="contam para patente" />
            <AssetStat label="Conteudo produzido" value={formatHours(totalSeconds)} detail="horas do seu fluxo" />
            <AssetStat label="Views do acervo" value={formatNumber(totalViews)} detail="so producao do app" />
            <AssetStat label="Projecao 90 dias" value={String(projectedCount)} detail={`+${projectedAdds} ativos`} />
          </div>

          {importedPublishedCount ? (
            <p className="mt-3 rounded-xl border border-slate-800/80 bg-black/16 px-4 py-3 text-xs font-bold leading-5 text-slate-500">
              {importedPublishedCount} video(s) importado(s) do YouTube ficam no historico e nas analises, mas nao sobem patente.
              A patente conta apenas videos publicados pelo fluxo do Creator Board.
            </p>
          ) : null}

          <div className="mt-5 rounded-xl border border-slate-800/80 bg-black/16 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase text-slate-500">Acervo acumulado</p>
                <p className="mt-1 text-sm font-bold text-slate-300">
                  Mantendo o ritmo, seu acervo chega a {formatHours(projectedHours)} em 3 meses.
                </p>
              </div>
              <span className="rounded-lg bg-white/[0.045] px-3 py-2 text-xs font-black text-slate-300">{formatNumber(weeklyPace)} / semana</span>
            </div>

            <svg className="h-36 w-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="Projecao de acervo">
              <defs>
                <linearGradient id="assetLine" x1="0" x2="1" y1="0" y2="0">
                  <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.95" />
                  <stop offset="100%" stopColor="#ff3f5f" stopOpacity="0.95" />
                </linearGradient>
              </defs>
              <path d={`M0,100 L${polyline} L100,100 Z`} fill="url(#assetLine)" opacity="0.12" />
              <polyline points={polyline} fill="none" stroke="url(#assetLine)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
              {points.filter((_, index) => index % 3 === 0 || index === points.length - 1).map((point) => (
                <circle key={`${point.x}-${point.value}`} cx={point.x} cy={point.y} r="1.8" fill="#22d3ee" vectorEffect="non-scaling-stroke" />
              ))}
            </svg>
          </div>
        </div>

        <aside className="rounded-2xl border border-slate-800/80 bg-[#111722] p-5">
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl border border-aqua/20 bg-aqua/[0.08] text-2xl font-black text-aqua">
              {rank.mark}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black uppercase text-slate-500">Status de creator</p>
              <h3 className="mt-1 text-lg font-black text-white">{rank.title}</h3>
              <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{rank.description}</p>
            </div>
          </div>

          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-xs font-black uppercase text-slate-500">{rank.nextAt ? `Proxima patente: ${rank.nextTitle}` : "Patente maxima"}</p>
              <span className="text-xs font-black text-white">{rankProgress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-800">
              <div className="h-full rounded-full bg-aqua transition-all" style={{ width: `${rankProgress}%` }} />
            </div>
            <p className="mt-2 text-xs font-semibold text-slate-500">
              {rank.nextAt ? `Faltam ${nextNeed} video(s) publicados pelo app para subir de status.` : "Agora o objetivo e manter volume real produzido no app."}
            </p>
          </div>

          <div className="mt-5 grid gap-2">
            {RANKS.map((item) => (
              <div
                key={item.title}
                className={cx(
                  "flex items-center justify-between rounded-lg border px-3 py-2",
                  item.title === rank.title ? "border-aqua/25 bg-aqua/[0.055] text-aqua" : "border-slate-800/80 bg-black/14 text-slate-500",
                )}
              >
                <span className="text-xs font-black">{item.mark}</span>
                <span className="truncate text-xs font-black">{item.title}</span>
                <span className="text-xs font-bold">{item.min}+</span>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </section>
  );
}

function AssetStat({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <article className="rounded-xl border border-slate-800/80 bg-black/16 p-4">
      <p className="text-xs font-black uppercase text-slate-500">{label}</p>
      <strong className="mt-2 block whitespace-nowrap text-xl font-black text-white sm:text-2xl">{value}</strong>
      <p className="mt-1 text-xs font-semibold text-slate-500">{detail}</p>
    </article>
  );
}
