import { useMemo } from "react";
import { Lock } from "lucide-react";
import type { AchievementContext, UnlockedAchievement, Video } from "../types";
import { ACHIEVEMENTS, computeXp, getLevelInfo } from "../lib/achievements";
import { cx } from "./ui";

type Props = {
  videos: Video[];
  unlockedAchievements: UnlockedAchievement[];
  xpFloor?: number;
  ctx: AchievementContext;
};

export function AchievementsPanel({ videos, unlockedAchievements, xpFloor = 0, ctx }: Props) {
  const unlockedIds = useMemo(
    () => new Set(unlockedAchievements.map((a) => a.id)),
    [unlockedAchievements],
  );

  const xp = useMemo(
    () => Math.max(computeXp(videos, unlockedAchievements), xpFloor),
    [videos, unlockedAchievements, xpFloor],
  );
  const info = getLevelInfo(xp);

  const xpInLevel = xp - info.xpStart;
  const xpNeeded = info.xpEnd - info.xpStart;
  const levelProgress = Math.min(100, (xpInLevel / xpNeeded) * 100);

  const unlockedCount = unlockedAchievements.length;
  const totalCount = ACHIEVEMENTS.length;

  const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <section className="space-y-6">
      {/* XP Card */}
      <div className="rounded-2xl border border-slate-400/10 bg-panel/75 p-5">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-0.5 text-xs font-semibold uppercase tracking-wider text-aqua">Nível do Criador</p>
            <div className="flex items-center gap-3">
              <span className="text-4xl">{info.emoji}</span>
              <div>
                <h2 className={cx("text-xl font-black", info.color)}>{info.title}</h2>
                <p className="text-sm font-semibold text-slate-400">
                  Nível {info.level} · <span className="text-white font-black">{xp.toLocaleString("pt-BR")}</span> XP
                </p>
              </div>
            </div>
          </div>
          <div className="flex gap-5 sm:text-right">
            <div>
              <p className="text-3xl font-extrabold text-white">{unlockedCount}</p>
              <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-slate-500">Conquistas</p>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-white">{totalCount - unlockedCount}</p>
              <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-slate-500">Bloqueadas</p>
            </div>
          </div>
        </div>

        {/* XP bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-bold text-slate-400">
            <span>{xpInLevel.toLocaleString("pt-BR")} XP neste nível</span>
            <span>faltam {(xpNeeded - xpInLevel).toLocaleString("pt-BR")} XP para Nível {info.level + 1}</span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className={cx("h-full rounded-full transition-all duration-700", info.bar)}
              style={{ width: `${levelProgress}%` }}
            />
          </div>
          <p className="text-xs font-semibold text-slate-600">
            {xp.toLocaleString("pt-BR")} / {info.xpEnd.toLocaleString("pt-BR")} XP total
          </p>
        </div>

        {/* XP breakdown */}
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            {
              label: "Publicações",
              value: `+${(ctx.publishedCount * 180).toLocaleString("pt-BR")} XP`,
              sub: `${ctx.publishedCount} × 180`,
            },
            {
              label: "Roteiros",
              value: `+${(videos.filter((v) => v.script?.trim()).length * 35).toLocaleString("pt-BR")} XP`,
              sub: `× 35 cada`,
            },
            {
              label: "Pipeline completo",
              value: `+${(videos.filter((v) => v.script?.trim() && (v.seoTitle?.trim() || v.seoDescription?.trim() || v.seoNotes?.trim())).length * 80).toLocaleString("pt-BR")} XP`,
              sub: `× 80 cada`,
            },
            {
              label: "Conquistas",
              value: `+${unlockedAchievements.reduce((s, u) => s + (ACHIEVEMENTS.find((a) => a.id === u.id)?.xp ?? 0), 0).toLocaleString("pt-BR")} XP`,
              sub: `${unlockedCount} desbloqueadas`,
            },
          ].map((item) => (
            <div key={item.label} className="rounded-xl bg-white/[0.04] p-3">
              <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-slate-500">{item.label}</p>
              <p className="mt-1 text-base font-black text-white">{item.value}</p>
              <p className="text-[0.65rem] text-slate-600">{item.sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Achievements grid */}
      <div className="rounded-2xl border border-slate-400/10 bg-panel/75 p-5">
        <div className="mb-5">
          <p className="mb-0.5 text-xs font-semibold uppercase tracking-wider text-aqua">Conquistas</p>
          <h2 className="text-xl font-black">Sala de troféus</h2>
          <p className="mt-0.5 text-sm font-semibold text-slate-400">
            {unlockedCount} / {totalCount} desbloqueadas
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {ACHIEVEMENTS.map((ach) => {
            const unlocked = unlockedIds.has(ach.id);
            const unlockedEntry = unlockedAchievements.find((u) => u.id === ach.id);
            const isClose = !unlocked && ach.check(videos, { ...ctx, publishedCount: ctx.publishedCount + 2, streak: ctx.streak + 1 });

            return (
              <div
                key={ach.id}
                className={cx(
                  "rounded-xl border p-4 transition-all",
                  unlocked
                    ? "border-amber-400/25 bg-amber-400/5"
                    : isClose
                    ? "border-slate-600/40 bg-white/[0.03]"
                    : "border-slate-700/30 bg-white/[0.02] opacity-60",
                )}
              >
                <div className="mb-3 flex items-start gap-3">
                  <span className={cx("text-2xl", !unlocked && "grayscale opacity-40")}>
                    {ach.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className={cx("text-sm font-black", unlocked ? "text-white" : "text-slate-400")}>
                        {ach.title}
                      </p>
                      {!unlocked && <Lock className="size-3 shrink-0 text-slate-600" />}
                    </div>
                    <p className="mt-0.5 text-xs font-semibold leading-snug text-slate-500">
                      {ach.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className={cx(
                    "rounded-md px-2 py-0.5 text-[0.65rem] font-black",
                    unlocked ? "bg-amber-400/15 text-amber-300" : "bg-white/[0.05] text-slate-600",
                  )}>
                    +{ach.xp} XP
                  </span>
                  {unlocked && unlockedEntry && (
                    <span className="text-[0.6rem] font-semibold text-slate-600">
                      {dateFormatter.format(new Date(unlockedEntry.unlockedAt))}
                    </span>
                  )}
                  {!unlocked && isClose && (
                    <span className="text-[0.6rem] font-bold text-sky-400">Quase lá...</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
