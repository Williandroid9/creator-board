import { useMemo, useState } from "react";
import { CalendarDays } from "lucide-react";
import type { Video, VideoPriority, VideoStatus } from "../types";
import { addDays, localDateKey, startOfWeek } from "../lib/date";
import { isOverdue, sortByPriorityAndDate } from "../lib/video";
import { Button, cx } from "./ui";

// Mesma rampa coesa do Kanban: cinza → aqua → verde (Publicado).
const statusDot: Record<VideoStatus, string> = {
  Ideia: "bg-slate-500",
  Roteiro: "bg-slate-400",
  Gravacao: "bg-aqua/60",
  Edicao: "bg-aqua/80",
  SEO: "bg-aqua",
  Agendado: "bg-teal-300",
  Publicado: "bg-emerald-400",
};

const priorityRing: Record<VideoPriority, string> = {
  Alta: "ring-brand/50",
  Media: "ring-amber-300/30",
  Baixa: "ring-slate-600/30",
};

const priorityLabel: Record<VideoPriority, string> = {
  Alta: "text-brand",
  Media: "text-amber-200",
  Baixa: "text-slate-400",
};

function VideoCard({
  video,
  onOpen,
  draggable = false,
}: {
  video: Video;
  onOpen: (v: Video) => void;
  draggable?: boolean;
}) {
  const overdue = isOverdue(video);

  return (
    <button
      type="button"
      onClick={() => onOpen(video)}
      draggable={draggable}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", video.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      className={cx(
        "group block w-full rounded-lg ring-1 bg-white/[0.045] p-2 text-left transition hover:bg-white/[0.075]",
        priorityRing[video.priority],
        overdue && "ring-amber-400/50 bg-amber-400/5",
        draggable && "cursor-grab active:cursor-grabbing",
      )}
    >
      <div className="flex items-start gap-1.5">
        <span className={cx("mt-1 h-2 w-2 shrink-0 rounded-full", statusDot[video.status])} />
        <span className="line-clamp-2 text-xs font-bold leading-snug text-white">{video.title}</span>
      </div>
      <div className="mt-1.5 flex items-center gap-2 pl-3.5">
        <span className={cx("text-[0.65rem] font-black uppercase tracking-wide", priorityLabel[video.priority])}>
          {video.priority}
        </span>
        {overdue && (
          <span className="text-[0.65rem] font-black text-amber-400">Atrasado</span>
        )}
        {!overdue && (
          <span className="text-[0.65rem] font-semibold text-slate-500">{video.status}</span>
        )}
      </div>
    </button>
  );
}

export function WeeklyCalendar({
  videos,
  onOpen,
  onReschedule,
}: {
  videos: Video[];
  onOpen: (video: Video) => void;
  onReschedule?: (video: Video, date: string) => void;
}) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [dragOverDay, setDragOverDay] = useState<string | null>(null);
  const weekStart = useMemo(() => addDays(startOfWeek(new Date()), weekOffset * 7), [weekOffset]);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const dayFormatter = new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" });
  const monthFormatter = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" });
  const today = localDateKey();

  const totalScheduled = useMemo(
    () => days.reduce((sum, d) => sum + videos.filter((v) => v.plannedDate === localDateKey(d)).length, 0),
    [days, videos],
  );

  return (
    <section className="clean-panel rounded-2xl p-5">
      {/* Header */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="mb-0.5 text-xs font-black uppercase tracking-wider text-aqua">Calendário</p>
          <h2 className="text-xl font-black capitalize sm:text-2xl">
            {monthFormatter.format(weekStart)}
          </h2>
          <p className="mt-0.5 text-xs font-semibold text-slate-500">
            {totalScheduled} vídeo{totalScheduled !== 1 ? "s" : ""} agendado{totalScheduled !== 1 ? "s" : ""} nesta semana
            {onReschedule ? " · arraste um card para reagendar" : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Button className="px-3 text-sm" onClick={() => setWeekOffset((v) => v - 1)}>
            ‹ Anterior
          </Button>
          <Button
            className={cx("px-3 text-sm", weekOffset === 0 && "ring-1 ring-aqua/40")}
            onClick={() => setWeekOffset(0)}
          >
            Hoje
          </Button>
          <Button className="px-3 text-sm" onClick={() => setWeekOffset((v) => v + 1)}>
            Próxima ›
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="mb-4 flex flex-wrap gap-3">
        {(["Ideia", "Roteiro", "Gravacao", "Edicao", "Publicado"] as VideoStatus[]).map((s) => (
          <span key={s} className="flex items-center gap-1.5 text-[0.68rem] font-bold text-slate-400">
            <span className={cx("h-2 w-2 rounded-full", statusDot[s])} />
            {s}
          </span>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7">
        {days.map((day) => {
          const key = localDateKey(day);
          const dayVideos = sortByPriorityAndDate(videos.filter((v) => v.plannedDate === key));
          const isToday = key === today;

          return (
            <article
              key={key}
              onDragOver={(e) => {
                if (!onReschedule) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                if (dragOverDay !== key) setDragOverDay(key);
              }}
              onDragLeave={(e) => {
                if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                setDragOverDay((d) => (d === key ? null : d));
              }}
              onDrop={(e) => {
                e.preventDefault();
                setDragOverDay(null);
                if (!onReschedule) return;
                const id = e.dataTransfer.getData("text/plain");
                const video = videos.find((v) => v.id === id);
                if (video && video.plannedDate !== key) onReschedule(video, key);
              }}
              className={cx(
                "min-h-[9rem] rounded-xl p-3 transition",
                isToday
                  ? "bg-aqua/5 ring-1 ring-aqua/40"
                  : "bg-black/18",
                dragOverDay === key && "bg-aqua/10 ring-2 ring-aqua/60",
              )}
            >
              <div className={cx(
                "mb-3 text-sm font-black capitalize",
                isToday ? "text-aqua" : "text-slate-100",
              )}>
                {dayFormatter.format(day)}
                {isToday && (
                  <span className="ml-2 rounded-full bg-aqua/15 px-2 py-0.5 text-[0.65rem] font-black text-aqua">
                    hoje
                  </span>
                )}
              </div>

              {dayVideos.length ? (
                <div className="space-y-1.5">
                  {dayVideos.map((v) => (
                    <VideoCard
                      key={v.id}
                      video={v}
                      onOpen={onOpen}
                      draggable={Boolean(onReschedule) && v.status !== "Publicado"}
                    />
                  ))}
                </div>
              ) : (
                <p className={cx(
                  "mt-2 text-xs font-semibold",
                  isToday ? "text-aqua/50" : "text-slate-600",
                )}>
                  Livre
                </p>
              )}
            </article>
          );
        })}
      </div>

      {/* Empty state when no videos across the week */}
      {totalScheduled === 0 && (
        <div className="mt-4 flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-700/60 py-8 text-center">
          <CalendarDays className="size-8 text-slate-600" />
          <div>
            <p className="text-sm font-black text-slate-400">Nenhum vídeo agendado nesta semana</p>
            <p className="mt-1 text-xs font-semibold text-slate-600">
              Abra um vídeo no Kanban e defina uma "Data planejada" para aparecê-lo aqui.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
