import { useState } from "react";
import { STATUSES, type Video, type VideoPriority, type VideoStatus } from "../types";
import { getDataSourceLabel } from "../lib/dataSource";
import { formatDate } from "../lib/date";
import { getOpportunityScore } from "../lib/opportunity";
import { hasScript, hasSeo, hasThumbnail, nextStatus, sortByPriorityAndDate, WIP_LIMITS } from "../lib/video";
import { Button, cx } from "./ui";

const priorityDot: Record<VideoPriority, string> = {
  Alta: "bg-brand",
  Media: "bg-amber-300",
  Baixa: "bg-slate-500",
};

const priorityBorder: Record<VideoPriority, string> = {
  Alta: "border-l-brand/60",
  Media: "border-l-amber-300/40",
  Baixa: "border-l-slate-600/40",
};

const statusAccent: Record<string, string> = {
  Ideia: "text-slate-400",
  Roteiro: "text-sky-400",
  Gravacao: "text-violet-400",
  Edicao: "text-fuchsia-400",
  Thumbnail: "text-orange-400",
  SEO: "text-amber-300",
  Agendado: "text-teal-400",
  Publicado: "text-aqua",
};

function KanbanCard({
  video,
  allVideos,
  compact,
  onOpen,
  onMove,
  onDuplicate,
  onArchive,
}: {
  video: Video;
  allVideos: Video[];
  compact: boolean;
  onOpen: (video: Video) => void;
  onMove: (id: string, status: VideoStatus) => void;
  onDuplicate: (id: string) => void;
  onArchive: (id: string) => void;
}) {
  const next = nextStatus(video.status);
  const opportunity = getOpportunityScore(video, allVideos);
  const dataSource = getDataSourceLabel(video);
  const isPublished = video.status === "Publicado";
  const indicators = [
    !hasScript(video) && "Roteiro",
    !hasThumbnail(video) && "Thumb",
    !hasSeo(video) && "SEO",
  ].filter((indicator): indicator is string => Boolean(indicator));

  return (
    <article
      className={cx(
        "group rounded-xl border border-l-2 bg-[#111722] shadow-card transition-all hover:border-slate-600/50 hover:shadow-md",
        compact ? "p-2.5" : "p-3",
        "border-slate-700/30",
        priorityBorder[video.priority],
      )}
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData("text/plain", video.id);
        event.dataTransfer.effectAllowed = "move";
      }}
    >
      <div className={cx("flex items-start gap-2", compact ? "mb-1.5" : "mb-2")}>
        <span className={cx("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full", priorityDot[video.priority])} title={video.priority} />
        <h3 className={cx("line-clamp-2 flex-1 text-sm font-black leading-snug text-white", compact ? "min-h-0" : "min-h-[2.55rem]")}>{video.title}</h3>
      </div>

      {!compact && (
        <div className="flex items-center justify-between gap-2">
          <p className="min-w-0 truncate text-xs font-bold text-slate-500">
            {[video.channel, video.niche].filter(Boolean).join(" / ") || "Sem canal"}
          </p>
          <span
            className={cx(
              "shrink-0 rounded-md px-2 py-1 text-[0.68rem] font-black",
              opportunity.tone === "strong" && "bg-aqua/10 text-aqua",
              opportunity.tone === "medium" && "bg-amber-300/10 text-amber-100",
              opportunity.tone === "low" && "bg-white/[0.045] text-slate-400",
            )}
            title={opportunity.reasons.join(", ") || opportunity.nextAction}
          >
            {opportunity.score}
          </span>
        </div>
      )}
      <p className={cx("text-xs font-bold text-slate-400", compact ? "mt-1" : "mt-2")}>
        {compact ? `Score ${opportunity.score}` : `${formatDate(video.plannedDate, "Sem data")} / ${opportunity.nextAction}`}
      </p>

      {!compact && (dataSource || video.contentType) ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {dataSource ? (
            <span
              className={cx(
                "inline-flex rounded-md px-2 py-1 text-[0.68rem] font-black",
                dataSource === "YouTube API" && "bg-aqua/10 text-aqua",
                dataSource === "Legado" && "bg-sky-300/10 text-sky-100",
                dataSource === "Manual" && "bg-white/[0.045] text-slate-400",
              )}
            >
              {dataSource}
            </span>
          ) : null}
          {video.contentType ? (
            <span className="inline-flex rounded-md bg-white/[0.045] px-2 py-1 text-[0.68rem] font-black text-slate-400">
              {video.contentType}
            </span>
          ) : null}
        </div>
      ) : null}

      {!compact && !isPublished && indicators.length ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {indicators.map((indicator) => (
            <span key={indicator} className="rounded-md bg-amber-300/10 px-2 py-1 text-[0.68rem] font-black text-amber-100">
              Sem {indicator}
            </span>
          ))}
        </div>
      ) : null}

      <div className={cx("grid gap-2", compact ? "mt-3 grid-cols-3" : isPublished ? "mt-4 grid-cols-1" : "mt-4 grid-cols-2")}>
        <Button className="min-h-9 px-3 text-xs" onClick={() => onOpen(video)}>
          Abrir
        </Button>
        {!isPublished && (
          <Button className="min-h-9 px-3 text-xs" disabled={!next} onClick={() => next && onMove(video.id, next)}>
            Avancar
          </Button>
        )}
        {compact && (
          <Button className="min-h-9 px-3 text-xs" onClick={() => onArchive(video.id)}>
            Arquivar
          </Button>
        )}
      </div>

      {!compact && (
        <div className="mt-2 grid grid-cols-2 gap-2 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
          <Button className="min-h-8 px-3 text-xs" onClick={() => onDuplicate(video.id)}>
            Duplicar
          </Button>
          <Button className="min-h-8 px-3 text-xs" onClick={() => onArchive(video.id)}>
            Arquivar
          </Button>
        </div>
      )}
    </article>
  );
}

export function KanbanBoard({
  videos,
  allVideos = videos,
  compact,
  onCompactChange,
  onOpen,
  onMove,
  onDuplicate,
  onArchive,
}: {
  videos: Video[];
  allVideos?: Video[];
  compact: boolean;
  onCompactChange: (compact: boolean) => void;
  onOpen: (video: Video) => void;
  onMove: (id: string, status: VideoStatus) => void;
  onDuplicate: (id: string) => void;
  onArchive: (id: string) => void;
}) {
  const [dragOver, setDragOver] = useState<VideoStatus | "">("");

  return (
    <section className="clean-panel rounded-2xl p-4 sm:p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 text-xs font-black uppercase text-aqua">Kanban</p>
          <h2 className="text-xl font-black sm:text-2xl">Pipeline</h2>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm font-semibold text-slate-500">Arraste ou use Avancar.</p>
          <label className="flex items-center gap-2 rounded-lg bg-white/[0.045] px-3 py-2 text-sm font-bold text-slate-300">
            <input
              type="checkbox"
              checked={compact}
              onChange={(event) => onCompactChange(event.target.checked)}
              className="h-4 w-4 accent-aqua"
            />
            Compacto
          </label>
        </div>
      </div>

      {!videos.length ? (
        <div className="rounded-xl border border-dashed border-slate-700/70 p-6 text-sm font-semibold text-slate-500">
          Nenhum video encontrado. Ajuste a busca/filtros ou crie uma nova ideia.
        </div>
      ) : (
      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,230px),1fr))]">
        {STATUSES.map((status) => {
          const columnVideos = sortByPriorityAndDate(videos.filter((video) => video.status === status));
          const limit = WIP_LIMITS[status];
          const overLimit = typeof limit === "number" && columnVideos.length > limit;

          return (
            <section key={status} className={cx("min-h-[17rem] rounded-xl bg-black/18 p-3", overLimit && "ring-1 ring-amber-300/40")}>
              <div className="mb-3 flex items-center justify-between gap-3 px-1">
                <div>
                  <h3 className={cx("text-xs font-black uppercase tracking-wider", statusAccent[status] || "text-slate-400")}>{status}</h3>
                  {overLimit && <p className="text-[0.65rem] font-bold text-amber-300">WIP excedido</p>}
                </div>
                <span className={cx(
                  "rounded-full px-2 py-0.5 text-xs font-black",
                  overLimit ? "bg-amber-300/10 text-amber-200" : "bg-white/[0.06] text-slate-400",
                )}>
                  {columnVideos.length}{limit ? `/${limit}` : ""}
                </span>
              </div>

              <div
                className={cx(
                  "grid min-h-[13rem] content-start gap-3 overflow-y-auto rounded-lg p-1 pr-2",
                  status === "Publicado" ? "max-h-[28rem]" : "max-h-[38rem]",
                  dragOver === status && "drag-over",
                )}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragOver(status);
                }}
                onDragLeave={() => setDragOver("")}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragOver("");
                  const id = event.dataTransfer.getData("text/plain");
                  if (id) {
                    onMove(id, status);
                  }
                }}
              >
                {columnVideos.length ? (
                  columnVideos.map((video) => (
                    <KanbanCard
                      key={video.id}
                      video={video}
                      allVideos={allVideos}
                      compact={compact}
                      onOpen={onOpen}
                      onMove={onMove}
                      onDuplicate={onDuplicate}
                      onArchive={onArchive}
                    />
                  ))
                ) : (
                  <p className="rounded-lg border border-dashed border-slate-700/60 p-3 text-sm text-slate-600">Vazio</p>
                )}
              </div>
            </section>
          );
        })}
      </div>
      )}
    </section>
  );
}
