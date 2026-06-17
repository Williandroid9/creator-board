import { useMemo, useState } from "react";
import type { Video } from "../types";
import { cx } from "./ui";

type HeatCell = {
  date: string;
  published: number;
  produced: boolean;
};

function buildHeatmap(
  videos: Video[],
  productionDays: string[],
): { weeks: HeatCell[][]; months: { label: string; colStart: number }[] } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Start from 364 days ago (53 weeks)
  const start = new Date(today);
  start.setDate(start.getDate() - 364);

  // Align to Monday
  const dayOfWeek = start.getDay(); // 0=Sun
  const daysToMon = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  start.setDate(start.getDate() - daysToMon);

  // Build lookup maps
  const prodDaySet = new Set(productionDays);
  const publishedMap = new Map<string, number>();
  for (const v of videos) {
    if (v.status === "Publicado" && v.publishedAt && !v.studioCreatedFromOnline && !v.studioCreatedFromCsv) {
      publishedMap.set(v.publishedAt, (publishedMap.get(v.publishedAt) ?? 0) + 1);
    }
  }

  const toKey = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const weeks: HeatCell[][] = [];
  const months: { label: string; colStart: number }[] = [];
  let lastMonth = -1;
  let weekCol = 0;
  const cursor = new Date(start);

  while (cursor <= today) {
    const week: HeatCell[] = [];
    for (let d = 0; d < 7; d++) {
      const key = toKey(cursor);
      const month = cursor.getMonth();
      if (month !== lastMonth && d === 0) {
        months.push({
          label: cursor.toLocaleDateString("pt-BR", { month: "short" }),
          colStart: weekCol,
        });
        lastMonth = month;
      }
      week.push({
        date: key,
        published: publishedMap.get(key) ?? 0,
        produced: prodDaySet.has(key) && cursor <= today,
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
    weekCol++;
    if (cursor > today) break;
  }

  return { weeks, months };
}

function cellColor(cell: HeatCell): string {
  if (cell.published >= 3) return "bg-aqua";
  if (cell.published === 2) return "bg-aqua/70";
  if (cell.published === 1) return "bg-aqua/45";
  if (cell.produced) return "bg-aqua/15";
  return "bg-white/[0.04]";
}

function cellTitle(cell: HeatCell): string {
  if (cell.published > 0) return `${cell.date}: ${cell.published} publicado${cell.published > 1 ? "s" : ""}`;
  if (cell.produced) return `${cell.date}: dia de produção`;
  return cell.date;
}

type Props = {
  videos: Video[];
  productionDays: string[];
};

export function ProductionHeatmap({ videos, productionDays }: Props) {
  const { weeks, months } = useMemo(() => buildHeatmap(videos, productionDays), [videos, productionDays]);
  const [hovered, setHovered] = useState<string | null>(null);

  const totalPublished = useMemo(
    () =>
      videos.filter(
        (v) => v.status === "Publicado" && !v.studioCreatedFromOnline && !v.studioCreatedFromCsv,
      ).length,
    [videos],
  );

  const totalProduced = new Set([
    ...productionDays,
    ...videos
      .filter((v) => v.status === "Publicado" && v.publishedAt)
      .map((v) => v.publishedAt),
  ]).size;

  // Find longest streak
  const longestStreak = useMemo(() => {
    const days = [...new Set(productionDays)].sort();
    let max = 0;
    let cur = 0;
    let prev: string | null = null;
    for (const d of days) {
      if (prev) {
        const prevDate: Date = new Date(prev);
        prevDate.setDate(prevDate.getDate() + 1);
        const expectedKey: string = prevDate.toISOString().slice(0, 10);
        if (d === expectedKey) {
          cur++;
        } else {
          cur = 1;
        }
      } else {
        cur = 1;
      }
      max = Math.max(max, cur);
      prev = d;
    }
    return max;
  }, [productionDays]);

  const dayLabels = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

  return (
    <div className="rounded-2xl border border-slate-400/10 bg-panel/75 p-5">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-0.5 text-xs font-semibold uppercase tracking-wider text-aqua">Heatmap</p>
          <h2 className="text-xl font-black">Histórico de produção</h2>
          <p className="mt-0.5 text-xs font-semibold text-slate-500">Últimos 365 dias</p>
        </div>
        <div className="flex gap-4">
          <div className="text-center">
            <p className="text-2xl font-black text-white">{totalPublished}</p>
            <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-slate-500">Publicados</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-black text-white">{totalProduced}</p>
            <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-slate-500">Dias ativos</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-black text-white">{longestStreak}</p>
            <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-slate-500">Maior streak</p>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          {/* Month labels */}
          <div className="relative mb-1 ml-7 h-4">
            {months.map((m) => (
              <span
                key={`${m.label}-${m.colStart}`}
                className="absolute text-[0.6rem] font-bold text-slate-500"
                style={{ left: `${m.colStart * 14}px` }}
              >
                {m.label}
              </span>
            ))}
          </div>

          <div className="flex gap-0.5">
            {/* Day-of-week labels */}
            <div className="mr-1 flex flex-col gap-0.5">
              {dayLabels.map((d, i) => (
                <span
                  key={d}
                  className={cx("flex h-3 items-center text-[0.55rem] font-bold text-slate-600", i % 2 !== 0 && "invisible")}
                >
                  {d}
                </span>
              ))}
            </div>

            {/* Week columns */}
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-0.5">
                {week.map((cell) => (
                  <div
                    key={cell.date}
                    title={cellTitle(cell)}
                    onMouseEnter={() => setHovered(cell.date)}
                    onMouseLeave={() => setHovered(null)}
                    className={cx(
                      "h-3 w-3 cursor-default rounded-sm transition-transform",
                      cellColor(cell),
                      hovered === cell.date && "scale-125 ring-1 ring-white/30",
                    )}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Hovered info */}
      {hovered && (() => {
        const allCells = weeks.flat();
        const cell = allCells.find((c) => c.date === hovered);
        if (!cell) return null;
        return (
          <p className="mt-2 text-xs font-semibold text-slate-400">
            {cell.published > 0
              ? `${cell.date} · ${cell.published} vídeo${cell.published > 1 ? "s" : ""} publicado${cell.published > 1 ? "s" : ""} 🎉`
              : cell.produced
              ? `${cell.date} · Dia de produção`
              : `${cell.date} · Sem atividade`}
          </p>
        );
      })()}

      {/* Legend */}
      <div className="mt-3 flex items-center gap-3 text-[0.65rem] font-semibold text-slate-500">
        <span>Menos</span>
        {["bg-white/[0.04]", "bg-aqua/15", "bg-aqua/45", "bg-aqua/70", "bg-aqua"].map((c) => (
          <span key={c} className={cx("h-3 w-3 rounded-sm", c)} />
        ))}
        <span>Mais</span>
      </div>
    </div>
  );
}
