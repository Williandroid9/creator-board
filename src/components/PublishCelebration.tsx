import { useEffect, useState } from "react";
import type { UnlockedAchievement, Video } from "../types";
import { ACHIEVEMENTS, computeXp, getLevelInfo } from "../lib/achievements";
import { cx } from "./ui";

type Props = {
  video: Video | null;
  publishedCount: number;
  xpBefore: number;
  xpAfter: number;
  newAchievements: string[];
  unlockedAchievements: UnlockedAchievement[];
  onClose: () => void;
};

export function PublishCelebration({
  video,
  publishedCount,
  xpBefore,
  xpAfter,
  newAchievements,
  onClose,
}: Props) {
  const [visible, setVisible] = useState(false);
  const [xpDisplay, setXpDisplay] = useState(xpBefore);

  useEffect(() => {
    if (!video) return;
    setVisible(true);
    setXpDisplay(xpBefore);

    // Animate XP counter
    const step = Math.ceil((xpAfter - xpBefore) / 20);
    let current = xpBefore;
    const interval = setInterval(() => {
      current = Math.min(current + step, xpAfter);
      setXpDisplay(current);
      if (current >= xpAfter) clearInterval(interval);
    }, 50);

    const t = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 400);
    }, 5000);

    return () => {
      clearInterval(interval);
      clearTimeout(t);
    };
  }, [video]);

  if (!video) return null;

  const levelAfter = getLevelInfo(xpAfter);
  const levelBefore = getLevelInfo(xpBefore);
  const leveledUp = levelAfter.level > levelBefore.level;
  const xpGained = xpAfter - xpBefore;

  return (
    <div
      className={cx(
        "fixed inset-0 z-[90] flex items-center justify-center bg-black/80 backdrop-blur-md transition-all duration-400",
        visible ? "opacity-100" : "opacity-0 pointer-events-none",
      )}
      onClick={() => { setVisible(false); setTimeout(onClose, 400); }}
    >
      <div
        className="relative mx-4 w-full max-w-md overflow-hidden rounded-3xl border border-amber-400/20 bg-[#0b1106] shadow-2xl shadow-amber-400/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top glow bar */}
        <div className="h-1 w-full bg-gradient-to-r from-amber-400 via-aqua to-brand" />

        <div className="p-8 text-center">
          {/* Big emoji */}
          <div className="animate-bounce mb-4 text-6xl">🎉</div>

          {/* Title */}
          <h2 className="mb-2 text-2xl font-black text-white">
            {leveledUp ? "Subiu de nível!" : "Publicado!"}
          </h2>

          {/* Video title */}
          <p className="mb-1 text-sm font-semibold text-slate-400">Você publicou</p>
          <p className="mb-5 text-base font-black text-white line-clamp-2">"{video.title}"</p>

          {/* Stats row */}
          <div className="mb-5 flex justify-center gap-6">
            <div className="text-center">
              <p className="text-2xl font-black text-aqua">#{publishedCount}</p>
              <p className="text-[0.65rem] font-bold uppercase tracking-wide text-slate-500">vídeo publicado</p>
            </div>
            <div className="h-10 w-px bg-slate-700" />
            <div className="text-center">
              <p className="text-2xl font-black text-amber-300">+{xpGained}</p>
              <p className="text-[0.65rem] font-bold uppercase tracking-wide text-slate-500">XP ganho</p>
            </div>
            <div className="h-10 w-px bg-slate-700" />
            <div className="text-center">
              <p className="text-2xl font-black text-white">{xpDisplay.toLocaleString("pt-BR")}</p>
              <p className="text-[0.65rem] font-bold uppercase tracking-wide text-slate-500">XP total</p>
            </div>
          </div>

          {/* Level up banner */}
          {leveledUp && (
            <div className="mb-4 rounded-2xl border border-amber-400/30 bg-amber-400/5 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-amber-400">🏆 Level Up!</p>
              <p className={cx("mt-1 text-xl font-black", levelAfter.color)}>
                {levelAfter.emoji} {levelAfter.title}
              </p>
              <p className="mt-0.5 text-xs font-semibold text-slate-400">
                Nível {levelBefore.level} → {levelAfter.level}
              </p>
            </div>
          )}

          {/* New achievements */}
          {newAchievements.length > 0 && (
            <div className="mb-4 space-y-2">
              <p className="text-xs font-bold uppercase tracking-wide text-amber-400">Nova conquista{newAchievements.length > 1 ? "s" : ""}!</p>
              {newAchievements.map((id) => {
                const def = ACHIEVEMENTS.find((a) => a.id === id);
                if (!def) return null;
                return (
                  <div key={id} className="flex items-center gap-3 rounded-xl border border-amber-400/20 bg-amber-400/5 px-4 py-2.5">
                    <span className="text-xl">{def.icon}</span>
                    <div className="text-left">
                      <p className="text-sm font-black text-white">{def.title}</p>
                      <p className="text-xs font-semibold text-slate-400">+{def.xp} XP</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Dismiss hint */}
          <p className="text-xs font-semibold text-slate-600">Clique para fechar</p>
        </div>
      </div>
    </div>
  );
}
