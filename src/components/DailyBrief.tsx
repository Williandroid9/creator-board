import { useMemo } from "react";
import { AlertTriangle, Flame, Target, Zap } from "lucide-react";
import type { Video } from "../types";
import { isOverdue } from "../lib/video";
import { getProductionStreak, weekStartKey } from "../lib/date";
import { computeXp, getLevelInfo } from "../lib/achievements";
import type { UnlockedAchievement } from "../types";
import { cx } from "./ui";

function getWeeklyPublished(videos: Video[]): number {
  const weekStart = weekStartKey();
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
  unlockedAchievements: UnlockedAchievement[];
  xpFloor?: number;
};

// Barra compacta de stats do dia. A "missão de hoje" foi removida de propósito:
// o TodayPanel logo abaixo já é o conselheiro único do dashboard.
export function DailyBrief({ videos, weeklyGoal, productionDays, unlockedAchievements, xpFloor = 0 }: DailyBriefProps) {
  const streak = useMemo(() => getProductionStreak(productionDays), [productionDays]);
  const weeklyPublished = useMemo(() => getWeeklyPublished(videos), [videos]);
  const overdueCount = useMemo(() => videos.filter(isOverdue).length, [videos]);
  const dateStr = useMemo(() => formatToday(), []);
  const goalMet = weeklyPublished >= weeklyGoal;
  const progress = Math.min(100, (weeklyPublished / Math.max(1, weeklyGoal)) * 100);

  const xp = useMemo(
    () => Math.max(computeXp(videos, unlockedAchievements), xpFloor),
    [videos, unlockedAchievements, xpFloor],
  );
  const levelInfo = useMemo(() => getLevelInfo(xp), [xp]);
  const xpInLevel = xp - levelInfo.xpStart;
  const xpNeeded = levelInfo.xpEnd - levelInfo.xpStart;
  const levelProgress = Math.min(100, (xpInLevel / xpNeeded) * 100);

  return (
    <div>
      {/* Stats bar */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-slate-400/[0.06] bg-[#0d1218]/70 px-4 py-2.5">
        {/* Date */}
        <span className="hidden text-sm font-semibold capitalize text-slate-500 sm:block">
          {dateStr}
        </span>

        {/* XP level */}
        <div className="flex items-center gap-1.5">
          <Zap className={cx("size-3.5", levelInfo.color)} />
          <span className={cx("text-sm font-black", levelInfo.color)}>
            {levelInfo.emoji} {levelInfo.title}
          </span>
          <div className="hidden h-1 w-14 overflow-hidden rounded-full bg-white/[0.05] sm:block">
            <div className={cx("h-full rounded-full transition-all", levelInfo.bar)} style={{ width: `${levelProgress}%` }} />
          </div>
        </div>

        {/* Streak — 0 vira convite, não fracasso em destaque */}
        <div className="flex items-center gap-1.5">
          <Flame className={cx("size-3.5", streak >= 7 ? "text-orange-400" : streak >= 3 ? "text-amber-400" : "text-slate-600")} />
          {streak > 0 ? (
            <span className={cx("text-sm font-black", streak >= 7 ? "text-orange-300" : streak >= 3 ? "text-amber-300" : "text-slate-300")}>
              {streak} dia{streak !== 1 ? "s" : ""} seguidos
            </span>
          ) : (
            <span className="text-sm font-semibold text-slate-500">Comece sua sequência hoje</span>
          )}
        </div>

        {/* Weekly goal */}
        <div className="flex items-center gap-2">
          <Target className={cx("size-3.5", goalMet ? "text-aqua" : "text-slate-600")} />
          <span className={cx("text-sm font-black", goalMet ? "text-aqua" : "text-slate-400")}>
            {weeklyPublished}/{weeklyGoal} na semana
          </span>
          <div className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-white/[0.05] sm:block">
            <div className={cx("h-full rounded-full transition-all duration-500", goalMet ? "bg-aqua" : "bg-slate-600")} style={{ width: `${progress}%` }} />
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
    </div>
  );
}
