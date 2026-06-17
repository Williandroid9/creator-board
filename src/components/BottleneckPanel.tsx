import { useMemo } from "react";
import { STATUSES, type Video } from "../types";
import {
  hasScript,
  hasSeo,
  isOverdue,
  isReadyToPublish,
  sortByPriorityAndDate,
  WIP_LIMITS,
} from "../lib/video";
import { Button, Pill, cx } from "./ui";

type BottleneckPanelProps = {
  videos: Video[];
  onOpenVideo: (video: Video) => void;
};

type AlertItem = {
  title: string;
  detail: string;
  count: number;
  videos: Video[];
  tone: "danger" | "warning" | "good" | "neutral";
};

function daysSince(value: string) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) {
    return 0;
  }

  return Math.floor((Date.now() - date.getTime()) / 86400000);
}

function toneClasses(tone: AlertItem["tone"]) {
  if (tone === "danger") {
    return "border-red-400/20 bg-red-500/10 text-red-100";
  }

  if (tone === "warning") {
    return "border-amber-300/20 bg-amber-300/10 text-amber-100";
  }

  if (tone === "good") {
    return "border-emerald-300/20 bg-emerald-300/10 text-emerald-100";
  }

  return "border-slate-600/50 bg-white/[0.04] text-slate-300";
}

export function BottleneckPanel({ videos, onOpenVideo }: BottleneckPanelProps) {
  const insights = useMemo(() => {
    const openVideos = videos.filter((video) => video.status !== "Publicado");
    const overdue = sortByPriorityAndDate(videos.filter(isOverdue));
    const ready = sortByPriorityAndDate(videos.filter(isReadyToPublish));
    const missingScript = sortByPriorityAndDate(openVideos.filter((video) => !hasScript(video)));
    const missingSeo = sortByPriorityAndDate(openVideos.filter((video) => !hasSeo(video)));
    const stale = sortByPriorityAndDate(openVideos.filter((video) => daysSince(video.updatedAt) >= 10));

    const stages = STATUSES.map((status) => {
      const count = videos.filter((video) => video.status === status).length;
      const limit = WIP_LIMITS[status];
      const ratio = limit ? count / limit : count > 0 ? 0.35 : 0;

      return {
        status,
        count,
        limit,
        ratio,
        overLimit: Boolean(limit && count > limit),
      };
    });

    const mainStage = [...stages]
      .filter((stage) => stage.status !== "Publicado")
      .sort((a, b) => Number(b.overLimit) - Number(a.overLimit) || b.ratio - a.ratio || b.count - a.count)[0];

    const alerts: AlertItem[] = [
      {
        title: "Atrasados",
        detail: "Data planejada vencida.",
        count: overdue.length,
        videos: overdue,
        tone: overdue.length ? "danger" : "good",
      },
      {
        title: "Sem roteiro",
        detail: "Ideias sem estrutura.",
        count: missingScript.length,
        videos: missingScript,
        tone: missingScript.length ? "warning" : "good",
      },
      {
        title: "Sem SEO",
        detail: "Falta busca/publicacao.",
        count: missingSeo.length,
        videos: missingSeo,
        tone: missingSeo.length ? "warning" : "good",
      },
      {
        title: "Parados",
        detail: "10+ dias sem update.",
        count: stale.length,
        videos: stale,
        tone: stale.length ? "warning" : "good",
      },
      {
        title: "Prontos",
        detail: "Podem ir para publicacao.",
        count: ready.length,
        videos: ready,
        tone: ready.length ? "good" : "neutral",
      },
    ];

    return {
      alerts,
      mainStage,
      ready,
    };
  }, [videos]);

  const visibleAlerts = insights.alerts.filter((alert) => alert.count > 0).slice(0, 4);
  const fallbackAlerts = insights.alerts.slice(0, 4);

  return (
    <section className="clean-panel rounded-2xl p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase text-aqua">Gargalos</p>
          <h2 className="text-xl font-black sm:text-2xl">Saude do fluxo</h2>
        </div>
        <Pill className={toneClasses(insights.ready.length ? "good" : "neutral")}>
          {insights.ready.length} pronto{insights.ready.length === 1 ? "" : "s"}
        </Pill>
      </div>

      <div className="grid gap-3 lg:grid-cols-[280px_minmax(0,1fr)]">
        <article className="rounded-xl bg-white/[0.04] p-4">
          <p className="mb-2 text-sm font-bold text-slate-400">Etapa mais cheia</p>
          <h3 className="text-lg font-black text-white">{insights.mainStage?.status || "Sem etapa"}</h3>
          <p className="mt-1 text-sm text-slate-400">
            {insights.mainStage?.count || 0} item{insights.mainStage?.count === 1 ? "" : "s"}
            {insights.mainStage?.limit ? ` / ${insights.mainStage.limit}` : ""}
          </p>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-black/30">
            <div
              className={cx("h-full rounded-full", insights.mainStage?.overLimit ? "bg-brand" : "bg-aqua")}
              style={{ width: `${Math.min(100, Math.round((insights.mainStage?.ratio || 0) * 100))}%` }}
            />
          </div>
        </article>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {(visibleAlerts.length ? visibleAlerts : fallbackAlerts).map((alert) => (
            <article key={alert.title} className="rounded-xl border border-slate-700/35 bg-black/18 p-4">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black text-white">{alert.title}</h3>
                  <p className="mt-1 text-xs font-bold text-slate-500">{alert.detail}</p>
                </div>
                <Pill className={toneClasses(alert.tone)}>{alert.count}</Pill>
              </div>
              {alert.videos[0] ? (
                <Button className="min-h-9 px-3 text-xs" onClick={() => onOpenVideo(alert.videos[0])}>
                  Abrir
                </Button>
              ) : (
                <p className="text-sm font-bold text-emerald-100">Ok</p>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
