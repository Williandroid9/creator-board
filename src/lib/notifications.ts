import type { AppData, Video } from "../types";
import { isOverdue, isReadyToPublish, hasScript } from "./video";
import { getOpportunityScore } from "./opportunity";

// ─── Types ────────────────────────────────────────────────────────────────────

export const NOTIF_PREFS_KEY = "creator-board-notif-prefs-v1";
export const NOTIF_LAST_SHOWN_KEY = "creator-board-notif-last-shown";

export type NotifType =
  | "daily_mission"
  | "overdue_alert"
  | "channel_inactive"
  | "ready_to_publish"
  | "weekly_goal"
  | "streak_risk"
  | "pipeline_stale";

export type NotificationPrefs = {
  enabled: boolean;
  time: string; // "HH:MM"
  days: number[]; // 0=Sun, 1=Mon…6=Sat. Empty = every day
  types: NotifType[];
};

export type NotificationPayload = {
  title: string;
  body: string;
  type: NotifType | "generic";
  tag: string;
  url: string;
};

export const DEFAULT_NOTIF_PREFS: NotificationPrefs = {
  enabled: false,
  time: "09:00",
  days: [1, 2, 3, 4, 5], // Mon–Fri
  types: ["daily_mission", "overdue_alert", "channel_inactive", "ready_to_publish", "weekly_goal", "streak_risk", "pipeline_stale"],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysBetween(isoA: string, isoB: string): number {
  const a = new Date(isoA + "T00:00:00");
  const b = new Date(isoB + "T00:00:00");
  return Math.round(Math.abs(b.getTime() - a.getTime()) / 86_400_000);
}

function getWeekStart(): string {
  const now = new Date();
  const d = now.getDay();
  const dToMon = d === 0 ? 6 : d - 1;
  const mon = new Date(now);
  mon.setDate(now.getDate() - dToMon);
  return mon.toISOString().slice(0, 10);
}

function getStreak(productionDays: string[]): number {
  const unique = new Set(productionDays.filter(Boolean));
  let count = 0;
  const cursor = new Date();
  while (unique.has(cursor.toISOString().slice(0, 10))) {
    count++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}

function appPublished(videos: Video[]): Video[] {
  return videos.filter(
    (v) => v.status === "Publicado" && !v.studioCreatedFromOnline && !v.studioCreatedFromCsv,
  );
}

// ─── Smart notification generators (priority order) ──────────────────────────

type Generator = (data: AppData, types: NotifType[]) => NotificationPayload | null;

// 1. Channel inactive + video ready to publish → strongest urgency
const channelInactiveGenerator: Generator = (data, types) => {
  if (!types.includes("channel_inactive")) return null;
  const today = todayKey();

  for (const channel of data.channels) {
    const published = appPublished(data.videos).filter(
      (v) => v.channelId === channel.id || v.channel === channel.name,
    );
    const last = published.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))[0];
    const days = last ? daysBetween(last.publishedAt, today) : 999;
    if (days < 5) continue;

    const active = data.videos.filter(
      (v) =>
        !v.archived &&
        v.status !== "Publicado" &&
        (v.channelId === channel.id || v.channel === channel.name),
    );
    const ready = active.filter(isReadyToPublish);

    if (days >= 7 && ready.length > 0) {
      return {
        title: `🚨 ${channel.name} está ${days} dias sem publicar!`,
        body: `"${ready[0].title}" está completamente pronto — roteiro ✓ SEO ✓. Só falta apertar o botão.`,
        type: "channel_inactive",
        tag: "channel-inactive",
        url: "/",
      };
    }

    if (days >= 14) {
      const count = active.length;
      return {
        title: `📉 ${channel.name} está ${days} dias sem conteúdo`,
        body: count > 0
          ? `O algoritmo esquece quem some. Você tem ${count} vídeo${count > 1 ? "s" : ""} no pipeline esperando.`
          : `O algoritmo esquece quem some. Que tal criar uma nova ideia hoje?`,
        type: "channel_inactive",
        tag: "channel-inactive",
        url: "/",
      };
    }
  }
  return null;
};

// 2. Overdue high-priority videos
const overdueGenerator: Generator = (data, types) => {
  if (!types.includes("overdue_alert")) return null;
  const active = data.videos.filter((v) => !v.archived && v.status !== "Publicado");
  const overdueHigh = active.filter((v) => isOverdue(v) && v.priority === "Alta");
  const overdueAll = active.filter(isOverdue);

  if (overdueHigh.length >= 2) {
    return {
      title: `⚠️ ${overdueHigh.length} vídeos de alta prioridade atrasados`,
      body: `O mais urgente: "${overdueHigh[0].title}" está em "${overdueHigh[0].status}". Cada dia conta.`,
      type: "overdue_alert",
      tag: "overdue-alert",
      url: "/",
    };
  }
  if (overdueAll.length >= 3) {
    return {
      title: `📅 ${overdueAll.length} vídeos atrasados no pipeline`,
      body: `"${overdueAll[0].title}" é o mais urgente. Avance pelo menos um passo hoje.`,
      type: "overdue_alert",
      tag: "overdue-alert",
      url: "/",
    };
  }
  return null;
};

// 3. Ready to publish
const readyToPublishGenerator: Generator = (data, types) => {
  if (!types.includes("ready_to_publish")) return null;
  const ready = data.videos.filter(
    (v) => !v.archived && v.status !== "Publicado" && isReadyToPublish(v),
  );
  if (ready.length === 0) return null;

  if (ready.length === 1) {
    return {
      title: `🚀 "${ready[0].title}" está pronto!`,
      body: `Roteiro ✓ SEO ✓ — Está esperando só você. Publique hoje!`,
      type: "ready_to_publish",
      tag: "ready-to-publish",
      url: "/",
    };
  }
  return {
    title: `🚀 ${ready.length} vídeos prontos para publicar!`,
    body: `"${ready[0].title}" e mais ${ready.length - 1} estão completamente preparados. Qual vai primeiro?`,
    type: "ready_to_publish",
    tag: "ready-to-publish",
    url: "/",
  };
};

// 4. Weekly goal almost met or missed
const weeklyGoalGenerator: Generator = (data, types) => {
  if (!types.includes("weekly_goal")) return null;
  const goal = data.settings.weeklyGoal;
  if (!goal || goal <= 0) return null;

  const weekStart = getWeekStart();
  const published = appPublished(data.videos).filter((v) => v.publishedAt >= weekStart).length;
  const missing = goal - published;

  // Friday nudge — last workday of week
  const dow = new Date().getDay();

  if (missing === 1) {
    return {
      title: `🎯 Falta só 1 vídeo para bater a meta!`,
      body: `Você já publicou ${published}/${goal} esta semana. ${dow >= 4 ? "O final de semana está chegando — " : ""}Você consegue!`,
      type: "weekly_goal",
      tag: "weekly-goal",
      url: "/",
    };
  }
  if (missing === 2 && dow >= 3) {
    return {
      title: `🎯 Faltam ${missing} vídeos para a meta da semana`,
      body: `Já passou da metade da semana. Cada publicação conta — qual vai ao ar hoje?`,
      type: "weekly_goal",
      tag: "weekly-goal",
      url: "/",
    };
  }
  if (published >= goal) {
    const extra = published - goal;
    if (extra === 0) {
      return {
        title: `🏆 Meta semanal batida! Parabéns!`,
        body: `${published}/${goal} vídeos publicados. Cada um a mais agora é bônus de crescimento.`,
        type: "weekly_goal",
        tag: "weekly-goal",
        url: "/",
      };
    }
  }
  return null;
};

// 5. Streak at risk
const streakRiskGenerator: Generator = (data, types) => {
  if (!types.includes("streak_risk")) return null;
  const streak = getStreak(data.settings.productionDays);
  if (streak < 2) return null;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = yesterday.toISOString().slice(0, 10);
  const producedYesterday = (data.settings.productionDays || []).includes(yesterdayKey);

  if (streak >= 5 && !producedYesterday) {
    return {
      title: `🔥 Não quebre sua sequência de ${streak} dias!`,
      body: `Você está em chamas! Qualquer avanço conta — abra um vídeo e mude o status.`,
      type: "streak_risk",
      tag: "streak-risk",
      url: "/",
    };
  }
  if (streak >= 3) {
    return {
      title: `🔥 Sequência de ${streak} dias — mantenha!`,
      body: `Consistência é a diferença entre criadores que crescem e os que somem. Faça algo hoje.`,
      type: "streak_risk",
      tag: "streak-risk",
      url: "/",
    };
  }
  return null;
};

// 6. Pipeline stagnant — videos stuck in same status for 7+ days
const pipelineStaleGenerator: Generator = (data, types) => {
  if (!types.includes("pipeline_stale")) return null;
  const today = todayKey();
  const stale = data.videos.filter(
    (v) =>
      !v.archived &&
      v.status !== "Publicado" &&
      v.updatedAt &&
      daysBetween(v.updatedAt.slice(0, 10), today) >= 7,
  );
  if (stale.length < 2) return null;

  return {
    title: `📦 ${stale.length} vídeos parados há mais de uma semana`,
    body: `"${stale[0].title}" está em "${stale[0].status}" há ${daysBetween(stale[0].updatedAt.slice(0, 10), today)} dias. Avance um passo hoje.`,
    type: "pipeline_stale",
    tag: "pipeline-stale",
    url: "/",
  };
};

// 7. Daily mission fallback
const dailyMissionGenerator: Generator = (data, types) => {
  if (!types.includes("daily_mission")) return null;
  const active = data.videos.filter((v) => !v.archived && v.status !== "Publicado");
  if (!active.length) return null;

  // Find highest opportunity
  const scored = active
    .map((v) => ({ v, score: getOpportunityScore(v, data.videos).score }))
    .sort((a, b) => b.score - a.score);

  const top = scored[0]?.v;
  if (!top) return null;

  const action = !hasScript(top)
    ? "Escrever o roteiro"
    : top.status === "Gravacao"
    ? "Gravar"
    : top.status === "Edicao"
    ? "Editar"
    : "Avançar";

  const published = appPublished(data.videos).length;
  const greeting = new Date().getHours() < 12 ? "Bom dia" : new Date().getHours() < 18 ? "Boa tarde" : "Boa noite";

  return {
    title: `📹 ${greeting}! Hora de criar conteúdo`,
    body: `Missão de hoje: ${action} de "${top.title}". Você já publicou ${published} vídeo${published !== 1 ? "s" : ""} pelo app — continue!`,
    type: "daily_mission",
    tag: "daily-mission",
    url: "/",
  };
};

// ─── Main generator (priority queue) ─────────────────────────────────────────

const GENERATORS: Generator[] = [
  channelInactiveGenerator,
  overdueGenerator,
  readyToPublishGenerator,
  weeklyGoalGenerator,
  streakRiskGenerator,
  pipelineStaleGenerator,
  dailyMissionGenerator,
];

export function generateSmartNotification(
  data: AppData,
  enabledTypes: NotifType[],
): NotificationPayload {
  for (const gen of GENERATORS) {
    const result = gen(data, enabledTypes);
    if (result) return result;
  }

  // Absolute fallback
  const active = data.videos.filter((v) => !v.archived && v.status !== "Publicado").length;
  return {
    title: "📹 Creator Board está te esperando!",
    body:
      active > 0
        ? `Você tem ${active} vídeo${active !== 1 ? "s" : ""} no pipeline. Abra o app e avance um passo hoje.`
        : "Abra o Creator Board e crie uma nova ideia para o seu canal.",
    type: "generic",
    tag: "creator-board-fallback",
    url: "/",
  };
}

// ─── localStorage helpers ─────────────────────────────────────────────────────

export function loadNotifPrefs(): NotificationPrefs {
  try {
    const raw = localStorage.getItem(NOTIF_PREFS_KEY);
    if (!raw) return { ...DEFAULT_NOTIF_PREFS };
    const p = JSON.parse(raw) as Partial<NotificationPrefs>;
    return {
      enabled: Boolean(p.enabled),
      time: typeof p.time === "string" && /^\d{2}:\d{2}$/.test(p.time) ? p.time : "09:00",
      days: Array.isArray(p.days) ? p.days : [1, 2, 3, 4, 5],
      types: Array.isArray(p.types) ? (p.types as NotifType[]) : DEFAULT_NOTIF_PREFS.types,
    };
  } catch {
    return { ...DEFAULT_NOTIF_PREFS };
  }
}

export function saveNotifPrefs(p: NotificationPrefs): void {
  try {
    localStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify(p));
  } catch { /* silent */ }
}

export function getLastShownDate(): string {
  return localStorage.getItem(NOTIF_LAST_SHOWN_KEY) ?? "";
}

export function setLastShownDate(date: string): void {
  try {
    localStorage.setItem(NOTIF_LAST_SHOWN_KEY, date);
  } catch { /* silent */ }
}

// ─── Show notification via Service Worker ────────────────────────────────────

export async function showNotificationViaSW(payload: NotificationPayload): Promise<void> {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  try {
    const reg = await navigator.serviceWorker.ready;
    await reg.showNotification(payload.title, {
      body: payload.body,
      icon: "/logo-creator-board.webp",
      badge: "/logo-creator-board.webp",
      tag: payload.tag,
      renotify: true,
      data: { url: payload.url },
    } as NotificationOptions);
  } catch {
    // Fallback: use Notification API directly
    new Notification(payload.title, {
      body: payload.body,
      icon: "/logo-creator-board.webp",
      tag: payload.tag,
    });
  }
}

// ─── Sync notification payload to IDB for Service Worker periodic sync ────────

export async function syncPayloadToSW(payload: NotificationPayload, lastShownDate: string): Promise<void> {
  try {
    const reg = await navigator.serviceWorker.ready;
    reg.active?.postMessage({
      type: "SET_PAYLOAD",
      payload: {
        title: payload.title,
        body: payload.body,
        lastShownDate,
      },
    });
  } catch { /* silent */ }
}

// ─── Schedule daily notification ─────────────────────────────────────────────

let scheduledTimer: ReturnType<typeof setTimeout> | null = null;

export function scheduleDailyNotification(
  prefs: NotificationPrefs,
  getData: () => AppData,
): void {
  if (scheduledTimer !== null) {
    clearTimeout(scheduledTimer);
    scheduledTimer = null;
  }
  if (!prefs.enabled) return;
  if (Notification.permission !== "granted") return;

  const now = new Date();
  const [h, m] = prefs.time.split(":").map(Number);
  const target = new Date(now);
  target.setHours(h, m, 0, 0);
  if (target <= now) target.setDate(target.getDate() + 1); // Tomorrow

  // Check if target day is in allowed days
  const targetDay = target.getDay();
  if (prefs.days.length > 0 && !prefs.days.includes(targetDay)) {
    // Find next allowed day
    let skip = 1;
    while (skip <= 7) {
      const next = new Date(target);
      next.setDate(next.getDate() + skip);
      if (prefs.days.length === 0 || prefs.days.includes(next.getDay())) {
        target.setDate(target.getDate() + skip);
        break;
      }
      skip++;
    }
  }

  const msUntil = target.getTime() - now.getTime();

  scheduledTimer = setTimeout(async () => {
    const today = new Date().toISOString().slice(0, 10);
    const lastShown = getLastShownDate();
    if (lastShown !== today) {
      const data = getData();
      const payload = generateSmartNotification(data, prefs.types);
      await showNotificationViaSW(payload);
      setLastShownDate(today);
      await syncPayloadToSW(payload, today);
    }
    // Reschedule for tomorrow
    scheduleDailyNotification(prefs, getData);
  }, msUntil);
}

// ─── Register Periodic Background Sync (PWA / Chrome) ────────────────────────

export async function registerPeriodicSync(): Promise<boolean> {
  try {
    if (!("periodicSync" in ServiceWorkerRegistration.prototype)) return false;
    const reg = await navigator.serviceWorker.ready;
    const status = await navigator.permissions.query({
      name: "periodic-background-sync" as PermissionName,
    });
    if (status.state !== "granted") return false;
    await (reg as unknown as { periodicSync: { register: (tag: string, options: { minInterval: number }) => Promise<void> } })
      .periodicSync.register("creator-board-daily", {
        minInterval: 12 * 60 * 60 * 1000, // 12 hours
      });
    return true;
  } catch {
    return false;
  }
}
