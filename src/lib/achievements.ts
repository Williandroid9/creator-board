import type { AchievementContext, AchievementDef, CreatorProgress, UnlockedAchievement, Video } from "../types";
import { hasScript, hasSeo } from "./video";

export const PROGRESS_KEY = "creator-board-progress-v1";

// ─── Achievement definitions ─────────────────────────────────────────────────

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: "first_idea",
    title: "Primeira Ideia",
    description: "Criou sua primeira ideia de vídeo no app",
    icon: "🌱",
    xp: 30,
    check: (v) => v.filter((x) => !x.studioCreatedFromCsv && !x.studioCreatedFromOnline).length >= 1,
  },
  {
    id: "first_script",
    title: "Roteirista",
    description: "Completou o roteiro de um vídeo pela primeira vez",
    icon: "✍️",
    xp: 50,
    check: (v) => v.some(hasScript),
  },
  {
    id: "full_pipeline",
    title: "Processo Completo",
    description: "Preencheu roteiro E SEO no mesmo vídeo",
    icon: "🎯",
    xp: 150,
    check: (v) => v.some((x) => hasScript(x) && hasSeo(x)),
  },
  {
    id: "first_publish",
    title: "Ao Vivo!",
    description: "Publicou seu primeiro vídeo pelo Creator Board",
    icon: "🎬",
    xp: 200,
    check: (_v, ctx) => ctx.publishedCount >= 1,
  },
  {
    id: "five_published",
    title: "Série Iniciada",
    description: "5 vídeos publicados pelo app",
    icon: "🔥",
    xp: 300,
    check: (_v, ctx) => ctx.publishedCount >= 5,
  },
  {
    id: "ten_published",
    title: "Dezena Dourada",
    description: "10 vídeos publicados pelo app",
    icon: "⚡",
    xp: 500,
    check: (_v, ctx) => ctx.publishedCount >= 10,
  },
  {
    id: "twenty_five_published",
    title: "Produtor Sólido",
    description: "25 vídeos publicados pelo app",
    icon: "🚀",
    xp: 1000,
    check: (_v, ctx) => ctx.publishedCount >= 25,
  },
  {
    id: "fifty_published",
    title: "Fábrica de Conteúdo",
    description: "50 vídeos publicados pelo app",
    icon: "💫",
    xp: 2000,
    check: (_v, ctx) => ctx.publishedCount >= 50,
  },
  {
    id: "hundred_published",
    title: "Centenário",
    description: "100 vídeos publicados — lenda absoluta",
    icon: "👑",
    xp: 5000,
    check: (_v, ctx) => ctx.publishedCount >= 100,
  },
  {
    id: "streak_3",
    title: "Sequência Ativa",
    description: "Produziu algo por 3 dias seguidos",
    icon: "🔥",
    xp: 75,
    check: (_v, ctx) => ctx.streak >= 3,
  },
  {
    id: "streak_7",
    title: "Semana Épica",
    description: "7 dias consecutivos de produção",
    icon: "🌟",
    xp: 200,
    check: (_v, ctx) => ctx.streak >= 7,
  },
  {
    id: "streak_30",
    title: "Mês Imparável",
    description: "30 dias de produção sem parar",
    icon: "🏆",
    xp: 1500,
    check: (_v, ctx) => ctx.streak >= 30,
  },
  {
    id: "weekly_goal_first",
    title: "Meta Cumprida",
    description: "Atingiu a meta semanal pela primeira vez",
    icon: "🎯",
    xp: 150,
    check: (_v, ctx) => ctx.weeklyGoal > 0 && ctx.weeklyPublished >= ctx.weeklyGoal,
  },
  {
    id: "early_bird",
    title: "Pontual",
    description: "Publicou antes do prazo planejado de um vídeo",
    icon: "⏰",
    xp: 100,
    check: (v) =>
      v.some(
        (x) => x.status === "Publicado" && x.publishedAt && x.plannedDate && x.publishedAt <= x.plannedDate,
      ),
  },
  {
    id: "pipeline_10",
    title: "Pipeline Cheio",
    description: "10 ou mais vídeos no pipeline ao mesmo tempo",
    icon: "📦",
    xp: 75,
    check: (v) => v.filter((x) => !x.archived).length >= 10,
  },
  {
    id: "tagger",
    title: "Bem Organizado",
    description: "Adicionou tags a 5 ou mais vídeos",
    icon: "🏷️",
    xp: 80,
    check: (v) => v.filter((x) => x.tags && x.tags.length > 0).length >= 5,
  },
  {
    id: "linked_inspiration",
    title: "Pesquisador",
    description: "Vinculou uma referência a um vídeo",
    icon: "🔗",
    xp: 60,
    check: (v) => v.some((x) => x.linkedInspirationIds.length > 0),
  },
  {
    id: "speed_publish",
    title: "Velocista",
    description: "Publicou 3 vídeos em uma única semana",
    icon: "💨",
    xp: 300,
    check: (_v, ctx) => ctx.weeklyPublished >= 3,
  },
];

// ─── XP Levels ────────────────────────────────────────────────────────────────

export type LevelInfo = {
  level: number;
  title: string;
  emoji: string;
  color: string;
  bar: string;
  xpStart: number;
  xpEnd: number;
};

const LEVEL_THRESHOLDS = [0, 200, 500, 1000, 1800, 3000, 4800, 7500, 11000, 16000, 23000];

export const LEVEL_DEFS: Omit<LevelInfo, "level" | "xpStart" | "xpEnd">[] = [
  { title: "Criador Iniciante",      emoji: "🌱", color: "text-slate-400",   bar: "bg-slate-500" },
  { title: "Em Ascensão",            emoji: "🚀", color: "text-emerald-400", bar: "bg-emerald-400" },
  { title: "Produtor Regular",       emoji: "📹", color: "text-sky-400",     bar: "bg-sky-400" },
  { title: "Criador Consistente",    emoji: "🎯", color: "text-violet-400",  bar: "bg-violet-400" },
  { title: "Estrategista de Conteúdo",emoji: "⚡", color: "text-amber-400",  bar: "bg-amber-400" },
  { title: "Criador Profissional",   emoji: "💫", color: "text-orange-400",  bar: "bg-orange-400" },
  { title: "Autoridade do Nicho",    emoji: "🏆", color: "text-rose-400",    bar: "bg-rose-400" },
  { title: "Expert Reconhecido",     emoji: "🌟", color: "text-fuchsia-400", bar: "bg-fuchsia-400" },
  { title: "Lenda do YouTube",       emoji: "👑", color: "text-yellow-300",  bar: "bg-yellow-300" },
  { title: "Referência Absoluta",    emoji: "🔱", color: "text-aqua",        bar: "bg-aqua" },
];

export function getLevelInfo(xp: number): LevelInfo {
  let level = 0;
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) { level = i; break; }
  }
  const cap = Math.min(level, LEVEL_DEFS.length - 1);
  const def = LEVEL_DEFS[cap];
  const xpStart = LEVEL_THRESHOLDS[level] ?? 0;
  const xpEnd = LEVEL_THRESHOLDS[level + 1] ?? xpStart + 999;
  return { level: level + 1, ...def, xpStart, xpEnd };
}

// ─── XP calculation (deterministic from data) ────────────────────────────────

export function computeXp(videos: Video[], unlocked: UnlockedAchievement[]): number {
  const published = videos.filter((v) => v.status === "Publicado" && !v.studioCreatedFromOnline && !v.studioCreatedFromCsv);
  const scripts = videos.filter(hasScript);
  const fullPipeline = videos.filter((v) => hasScript(v) && hasSeo(v));

  const base =
    published.length * 180 +
    scripts.length * 35 +
    fullPipeline.length * 80;

  const achievementXp = unlocked.reduce((sum, u) => {
    const def = ACHIEVEMENTS.find((a) => a.id === u.id);
    return sum + (def?.xp ?? 0);
  }, 0);

  return base + achievementXp;
}

// ─── Achievement checking ─────────────────────────────────────────────────────

export function checkNewAchievements(
  videos: Video[],
  ctx: AchievementContext,
  already: UnlockedAchievement[],
): AchievementDef[] {
  const unlockedIds = new Set(already.map((a) => a.id));
  return ACHIEVEMENTS.filter((a) => !unlockedIds.has(a.id) && a.check(videos, ctx));
}

// ─── localStorage helpers ─────────────────────────────────────────────────────

export function normalizeProgress(raw: unknown): CreatorProgress {
  const parsed = (raw ?? {}) as Partial<CreatorProgress>;
  return {
    achievements: Array.isArray(parsed.achievements)
      ? parsed.achievements.filter((a) => a?.id && a?.unlockedAt)
      : [],
  };
}

export function loadProgress(): CreatorProgress {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return { achievements: [] };
    return normalizeProgress(JSON.parse(raw));
  } catch {
    return { achievements: [] };
  }
}

export function saveProgress(p: CreatorProgress): void {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(p));
  } catch {
    // silent
  }
}
