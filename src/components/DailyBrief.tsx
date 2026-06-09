import { useMemo } from "react";
import { AlertTriangle, Flame, Target, Zap } from "lucide-react";
import type { Video } from "../types";
import { isOverdue, isReadyToPublish, hasScript } from "../lib/video";
import { getOpportunityScore } from "../lib/opportunity";
import { computeXp, getLevelInfo } from "../lib/achievements";
import type { UnlockedAchievement } from "../types";
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
  const day = now.getDay();
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

function getDailyMission(videos: Video[]): { action: string; title: string; emoji: string } | null {
  const active = videos.filter((v) => !v.archived && v.status !== "Publicado");
  if (!active.length) return null;

  // 1. Overdue high-priority
  const overdueHigh = active.filter((v) => isOverdue(v) && v.priority === "Alta");
  if (overdueHigh.length > 0) {
    return { action: "Desatrasado urgente", title: overdueHigh[0].title, emoji: "🚨" };
  }

  // 2. Ready to publish
  const ready = active.filter(isReadyToPublish);
  if (ready.length > 0) {
    return { action: "Publique hoje", title: ready[0].title, emoji: "🚀" };
  }

  // 3. Video closest to having a script done (but missing it)
  const noScript = active.filter((v) => !hasScript(v));
  if (noScript.length > 0) {
    const allVideos = videos;
    const sorted = noScript.sort((a, b) => {
      const sa = getOpportunityScore(a, allVideos).score;
      const sb = getOpportunityScore(b, allVideos).score;
      return sb - sa;
    });
    return { action: "Escreva o roteiro", title: sorted[0].title, emoji: "✍️" };
  }

  // 4. Highest opportunity score
  const scored = active
    .map((v) => ({ v, score: getOpportunityScore(v, videos).score }))
    .sort((a, b) => b.score - a.score);
  if (scored.length > 0) {
    return { action: "Avance este vídeo", title: scored[0].v.title, emoji: "⚡" };
  }

  return null;
}

type DailyBriefProps = {
  videos: Video[];
  weeklyGoal: number;
  productionDays: string[];
  unlockedAchievements: UnlockedAchievement[];
};

export function DailyBrief({ videos, weeklyGoal, productionDays, unlockedAchievements }: DailyBriefProps) {
  const streak = useMemo(() => getProductionStreak(productionDays), [productionDays]);
  const weeklyPublished = useMemo(() => getWeeklyPublished(videos), [videos]);
  const overdueCount = useMemo(() => videos.filter(isOverdue).length, [videos]);
  const dateStr = useMemo(() => formatToday(), []);
  const mission = useMemo(() => getDailyMission(videos), [videos]);
  const goalMet = weeklyPublished >= weeklyGoal;
  const progress = Math.min(100, (weeklyPublished / Math.max(1, weeklyGoal)) * 100);

  const xp = useMemo(() => computeXp(videos, unlockedAchievements), [videos, unlockedAchievements]);
  const levelInfo = useMemo(() => getLevelInfo(xp), [xp]);
  const xpInLevel = xp - levelInfo.xpStart;
  const xpNeeded = levelInfo.xpEnd - levelInfo.xpStart;
  const levelProgress = Math.min(100, (xpInLevel / xpNeeded) * 100);

  return (
    <div className="space-y-2">
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

        {/* Streak */}
        <div className="flex items-center gap-1.5">
          <Flame className={cx("size-3.5", streak >= 7 ? "text-orange-400" : streak >= 3 ? "text-amber-400" : "text-slate-600")} />
          <span className={cx("text-sm font-black", streak >= 7 ? "text-orange-300" : streak >= 3 ? "text-amber-300" : "text-slate-500")}>
            {streak} dia{streak !== 1 ? "s" : ""}
          </span>
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

      {/* Daily mission */}
      {mission && (
        <div className="flex items-center gap-3 rounded-xl border border-sky-500/15 bg-sky-500/5 px-4 py-2.5">
          <span className="shrink-0 text-lg">{mission.emoji}</span>
          <div className="min-w-0">
            <span className="text-[0.65rem] font-black uppercase tracking-wider text-sky-400">
              Missão de hoje · {mission.action}
            </span>
            <p className="truncate text-sm font-black text-white">{mission.title}</p>
          </div>
        </div>
      )}
    </div>
  );
}
