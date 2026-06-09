import { useMemo } from "react";
import { AlertTriangle, Flame, Target } from "lucide-react";
import type { Video } from "../types";
import { isOverdue } from "../lib/video";
import { cx } from "./ui";

function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getProductionStreak(productionDays: string[]): number {
  const unique = new Set(productionDays.filter(Boolean));
  let count = 0;
  const cursor = new Date();
  while (unique.has(toDateKey(cursor))) {
    count++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}

function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay(); // 0 = Sun
  const daysToMon = day === 0 ? 6 : day - 1;
  const mon = new Date(now);
  mon.setDate(now.getDate() - daysToMon);
  mon.setHours(0, 0, 0, 0);
  return toDateKey(mon);
}

function getWeeklyPublished(videos: Video[]): number {
  const weekStart = getWeekStart();
  return videos.filter(
    (v) =>
      v.status === "Publicado" &&
      !v.studioCreatedFromOnline &&
      !v.studioCreatedFromCsv &&
      v.publishedAt >= weekStart,
  ).length;
}

function formatToday(): string {
  return new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

type DailyBriefProps = {
  videos: Video[];
  weeklyGoal: number;
  productionDays: string[];
};

export function DailyBrief({ videos, weeklyGoal, productionDays }: DailyBriefProps) {
  const streak = useMemo(() => getProductionStreak(productionDays), [productionDays]);
  const weeklyPublished = useMemo(() => getWeeklyPublished(videos), [videos]);
  const overdueCount = useMemo(() => videos.filter(isOverdue).length, [videos]);
  const dateStr = useMemo(() => formatToday(), []);
  const goalMet = weeklyPublished >= weeklyGoal;
  const progress = Math.min(100, (weeklyPublished / Math.max(1, weeklyGoal)) * 100);

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-slate-400/[0.06] bg-[#0d1218]/70 px-4 py-2.5">
      {/* Date */}
      <span className="hidden text-sm font-semibold capitalize text-slate-500 sm:block">
        {dateStr}
      </span>

      {/* Streak */}
      <div className="flex items-center gap-1.5">
        <Flame
          className={cx(
            "size-3.5",
            streak >= 7 ? "text-orange-400" : streak >= 3 ? "text-amber-400" : "text-slate-600",
          )}
        />
        <span
          className={cx(
            "text-sm font-black",
            streak >= 7 ? "text-orange-300" : streak >= 3 ? "text-amber-300" : "text-slate-500",
          )}
        >
          {streak} dia{streak !== 1 ? "s" : ""} consecutivo{streak !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Weekly goal */}
      <div className="flex items-center gap-2">
        <Target className={cx("size-3.5", goalMet ? "text-aqua" : "text-slate-600")} />
        <span className={cx("text-sm font-black", goalMet ? "text-aqua" : "text-slate-400")}>
          {weeklyPublished}/{weeklyGoal} na semana
        </span>
        <div className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-white/[0.05] sm:block">
          <div
            className={cx("h-full rounded-full transition-all duration-500", goalMet ? "bg-aqua" : "bg-slate-600")}
            style={{ width: `${progress}%` }}
          />
        </div>
        {goalMet && (
          <span className="rounded-full border border-aqua/25 bg-aqua/10 px-1.5 py-0.5 text-[0.6rem] font-black text-aqua">
            Meta ✓
          </span>
        )}
      </div>

      {/* Overdue alert */}
      {overdueCount > 0 && (
        <div className="flex items-center gap-1.5">
          <AlertTriangle className="size-3.5 text-amber-400" />
          <span className="text-sm font-black text-amber-300">
            {overdueCount} atrasado{overdueCount !== 1 ? "s" : ""}
          </span>
        </div>
      )}
    </div>
  );
}
