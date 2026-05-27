import { useMemo, useState } from "react";
import type { Video } from "../types";
import { addDays, localDateKey, startOfWeek } from "../lib/date";
import { sortByPriorityAndDate } from "../lib/video";
import { Button } from "./ui";

export function WeeklyCalendar({ videos, onOpen }: { videos: Video[]; onOpen: (video: Video) => void }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const weekStart = useMemo(() => addDays(startOfWeek(new Date()), weekOffset * 7), [weekOffset]);
  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)), [weekStart]);
  const formatter = new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" });

  return (
    <section className="clean-panel rounded-2xl p-5">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="mb-1 text-xs font-black uppercase text-aqua">Calendario</p>
          <h2 className="text-xl font-black sm:text-2xl">Semana editorial</h2>
        </div>
        <div className="flex gap-2">
          <Button className="px-3" onClick={() => setWeekOffset((value) => value - 1)}>
            &lt;
          </Button>
          <Button className="px-3" onClick={() => setWeekOffset(0)}>
            Hoje
          </Button>
          <Button className="px-3" onClick={() => setWeekOffset((value) => value + 1)}>
            &gt;
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7">
        {days.map((day) => {
          const key = localDateKey(day);
          const dayVideos = sortByPriorityAndDate(videos.filter((video) => video.plannedDate === key));

          return (
            <article key={key} className={`min-h-[9rem] rounded-xl bg-black/18 p-3 ${key === localDateKey() ? "ring-1 ring-aqua/50" : ""}`}>
              <div className="mb-3 text-sm font-black capitalize text-slate-100">{formatter.format(day)}</div>
              {dayVideos.length ? (
                <div className="space-y-2">
                  {dayVideos.map((video) => (
                    <button
                      key={video.id}
                      className="block w-full rounded-lg bg-white/[0.045] p-2 text-left hover:bg-white/[0.075]"
                      onClick={() => onOpen(video)}
                      type="button"
                    >
                      <span className="line-clamp-2 text-sm font-bold text-white">{video.title}</span>
                      <span className="text-xs text-slate-400">
                        {video.status} - {video.priority}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-600">Livre</p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
