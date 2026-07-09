import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
  type RefObject,
} from "react";
import type {
  AchievementContext,
  AchievementDef,
  AppData,
  Channel,
  ChannelDraft,
  CreatorProgress,
  DailyTask,
  Filters as FilterState,
  InspirationDraft,
  TrendDraft,
  Video,
  VideoDraft,
  VideoStatus,
} from "../types";
import {
  ACHIEVEMENTS,
  checkNewAchievements,
  computeXp,
  loadProgress,
  normalizeProgress,
  saveProgress,
} from "../lib/achievements";
import {
  generateSmartNotification,
  getLastShownDate,
  loadNotifPrefs,
  normalizeNotifPrefs,
  type NotificationPrefs,
  registerPeriodicSync,
  saveNotifPrefs,
  scheduleDailyNotification,
  syncPayloadToSW,
} from "../lib/notifications";
import { normalizeScoutState, saveScoutState } from "../lib/ideaScout";
import { getProductionStreak, isToday, localDateKey, weekStartKey } from "../lib/date";
import { buildBackupExtras, exportJson } from "../lib/export";
import { loadAppData, parseImportedData, saveAppData } from "../lib/storage";
import {
  createBackupSnapshot,
  deleteBackupSnapshot,
  getBackupStats,
  maybeCreateDailyBackup,
  readBackupSnapshots,
  type BackupSnapshot,
  type BackupStats,
} from "../lib/backup";
import type { YouTubeOnlineVideo } from "../lib/youtubeApi";
import { getRecommendation, hasScript, isOverdue, isReadyToPublish, makeId, normalizeVideo } from "../lib/video";
import { stampData, type ConfirmDialogState } from "./appHelpers";
import { useChannelActions } from "./useChannelActions";
import type { WeeklyPlanItem } from "../lib/weeklyPlan";
import { normalizeInspiration } from "../lib/inspiration";
import { normalizeTrend } from "../lib/trend";

// ─── View type (single source of truth) ──────────────────────────────────────

export type AppView =
  | "production"
  | "analysis"
  | "channels"
  | "insights"
  | "radar"
  | "trends"
  | "calendar"
  | "references"
  | "performance"
  | "archive"
  | "data"
  | "progress";

export const APP_VIEWS: AppView[] = [
  "production",
  "analysis",
  "channels",
  "insights",
  "radar",
  "trends",
  "calendar",
  "references",
  "performance",
  "archive",
  "data",
  "progress",
];

// ─── Storage keys ─────────────────────────────────────────────────────────────

const ACTIVE_VIEW_KEY = "creator-board-active-view-v1";
const COMPACT_KANBAN_KEY = "creator-board-compact-kanban-v1";

// ─── Helper functions ─────────────────────────────────────────────────────────

function markProductionDay(data: AppData, date = localDateKey()): AppData {
  const days = data.settings.productionDays || [];
  if (days.includes(date)) return data;
  return {
    ...data,
    settings: {
      ...data.settings,
      productionDays: [date, ...days].filter(Boolean).slice(0, 120),
    },
  };
}

function prepareDraftForSave(draft: VideoDraft): VideoDraft {
  return {
    ...draft,
    publishedAt:
      draft.status === "Publicado" && !draft.publishedAt ? localDateKey() : draft.publishedAt,
  };
}

function loadActiveView(): AppView {
  try {
    const stored = localStorage.getItem(ACTIVE_VIEW_KEY);
    return APP_VIEWS.includes(stored as AppView) ? (stored as AppView) : "production";
  } catch {
    return "production";
  }
}

function loadCompactKanban() {
  try {
    return localStorage.getItem(COMPACT_KANBAN_KEY) === "true";
  } catch {
    return false;
  }
}

function matchesVideoSearch(video: Video, search: string) {
  if (!search) return true;
  return [
    video.title,
    video.channel,
    video.niche,
    video.keyword,
    video.videoFormat,
    video.contentType,
    video.studioSyncPeriod,
    video.script,
    video.thumbnailIdeas,
    video.seoTitle,
    video.seoDescription,
    video.notes,
    video.publishedLink,
    video.studioVideoId,
    video.studioViews,
    video.studioImpressions,
    video.studioRetention,
    video.studioSubscribers,
    ...(video.tags ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(search);
}

// ─── Context type ─────────────────────────────────────────────────────────────

export interface AppContextValue {
  // Core state
  data: AppData;
  filters: FilterState;
  modalOpen: boolean;
  editingVideoId: string | null;
  focusMode: boolean;
  activeView: AppView;
  compactKanban: boolean;
  toast: string;
  celebrate: boolean;
  importRef: RefObject<HTMLInputElement>;
  backupSnapshots: BackupSnapshot[];

  // Derived values
  editingVideo: Video | null;
  activeVideos: Video[];
  archivedVideos: Video[];
  activeChannelId: string;
  activeChannel: Channel | null;
  scopedActiveVideos: Video[];
  scopedArchivedVideos: Video[];
  filteredVideos: Video[];
  searchedVideos: Video[];
  searchedArchivedVideos: Video[];
  backupStats: BackupStats;

  // UI setters
  setModalOpen: (open: boolean) => void;
  setEditingVideoId: (id: string | null) => void;
  setFocusMode: (focus: boolean | ((prev: boolean) => boolean)) => void;
  setActiveView: (view: AppView) => void;
  setCompactKanban: (compact: boolean | ((prev: boolean) => boolean)) => void;
  setFilters: (f: FilterState | ((prev: FilterState) => FilterState)) => void;
  setToast: (message: string) => void;
  undoAction: (() => void) | null;
  paletteOpen: boolean;
  setPaletteOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  shortcutsOpen: boolean;
  setShortcutsOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  confirmDialog: ConfirmDialogState | null;
  closeConfirmDialog: () => void;

  // Navigation helpers
  openCreate: () => void;
  openVideo: (video: Video | null) => void;
  setActiveChannel: (channelId: string) => void;

  // Settings actions
  setWeeklyGoal: (goal: number) => void;

  // Task actions
  updateTasks: (updater: (tasks: DailyTask[]) => DailyTask[]) => void;

  // Video CRUD
  createVideo: (draft: VideoDraft) => void;
  updateVideo: (draft: VideoDraft, mode?: "autosave" | "manual") => void;
  deleteVideo: (id: string) => void;
  moveVideo: (id: string, status: VideoStatus) => void;
  applyWeeklyPlan: (items: WeeklyPlanItem[]) => void;
  toggleArchiveVideo: (id: string) => void;
  duplicateVideo: (id: string) => void;

  // Inspiration actions
  saveInspiration: (draft: InspirationDraft) => void;
  deleteInspiration: (id: string) => void;

  // Trend actions
  saveTrend: (draft: TrendDraft) => void;
  deleteTrend: (id: string) => void;

  // Channel actions
  saveChannel: (draft: ChannelDraft) => void;
  saveChannels: (drafts: ChannelDraft[]) => void;
  deleteChannel: (id: string) => void;
  disconnectChannel: (id: string) => void;
  syncYouTubeOnline: (
    channelId: string,
    channelName: string,
    youtubeChannelId: string,
    onlineVideos: YouTubeOnlineVideo[],
    sourceLabel: string,
    skipped?: number,
  ) => { updated: number; created: number };
  clearYouTubeOnlineSync: (
    channelId: string,
    channelName: string,
    removeCreated: boolean,
  ) => { cleared: number; removed: number };

  // Data / backup actions
  handleImport: (event: ChangeEvent<HTMLInputElement>) => void;
  handleCreateRestorePoint: () => void;
  handleRestoreSnapshot: (id: string) => void;
  handleDeleteSnapshot: (id: string) => void;
  handleDownloadSnapshot: (id: string) => void;

  // Gamification
  progress: CreatorProgress;
  newAchievements: AchievementDef[];
  clearNewAchievements: () => void;
  publishCelebration: { video: Video; xpBefore: number; xpAfter: number; newAchievements: string[] } | null;
  clearPublishCelebration: () => void;
  achievementCtx: AchievementContext;

  // Notifications
  notifPrefs: NotificationPrefs;
  saveNotifPrefsAndReschedule: (prefs: NotificationPrefs) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside <AppProvider>");
  return ctx;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(() => loadAppData());
  const [filters, setFilters] = useState<FilterState>({ niche: "all", channel: "all", search: "", quickFilter: "" });
  const [modalOpen, setModalOpen] = useState(false);
  const [editingVideoId, setEditingVideoId] = useState<string | null>(null);
  const [focusMode, setFocusMode] = useState(false);
  const [activeView, setActiveView] = useState<AppView>(() => loadActiveView());
  const [compactKanban, setCompactKanban] = useState(() => loadCompactKanban());
  const [toast, setToast] = useState("");
  const [undoAction, setUndoAction] = useState<(() => void) | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const [backupSnapshots, setBackupSnapshots] = useState(() => readBackupSnapshots());
  const [progress, setProgress] = useState<CreatorProgress>(() => loadProgress());
  const [newAchievements, setNewAchievements] = useState<AchievementDef[]>([]);
  const [publishCelebration, setPublishCelebration] = useState<{
    video: Video;
    xpBefore: number;
    xpAfter: number;
    newAchievements: string[];
  } | null>(null);
  const [notifPrefs, setNotifPrefsState] = useState<NotificationPrefs>(() => loadNotifPrefs());

  // Stable refs so timeouts/callbacks never hold stale data ou progresso
  const dataRef = useRef(data);
  useEffect(() => { dataRef.current = data; }, [data]);
  const progressRef = useRef(progress);
  useEffect(() => { progressRef.current = progress; }, [progress]);

  // Persist data — avisa uma vez se o armazenamento do navegador encher (C5)
  const quotaWarnedRef = useRef(false);
  useEffect(() => {
    const result = saveAppData(data);
    if (result.ok) {
      quotaWarnedRef.current = false;
    } else if (result.quotaExceeded && !quotaWarnedRef.current) {
      quotaWarnedRef.current = true;
      setToast("Armazenamento do navegador cheio — exporte um backup em Dados para não perder trabalho.");
    }
    setBackupSnapshots((current) => maybeCreateDailyBackup(data, current));
  }, [data]);

  useEffect(() => {
    try {
      localStorage.setItem(ACTIVE_VIEW_KEY, activeView);
    } catch (error) {
      console.warn("Nao foi possivel salvar a aba ativa.", error);
    }
  }, [activeView]);

  useEffect(() => {
    try {
      localStorage.setItem(COMPACT_KANBAN_KEY, String(compactKanban));
    } catch (error) {
      console.warn("Nao foi possivel salvar o modo compacto.", error);
    }
  }, [compactKanban]);

  useEffect(() => {
    if (!toast) {
      setUndoAction(null);
      return undefined;
    }
    const timer = window.setTimeout(() => setToast(""), 4200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  // ── Achievement & XP check ────────────────────────────────────────────────

  const achievementCtx = useMemo((): AchievementContext => {
    const streak = getProductionStreak(data.settings.productionDays || []);
    const weekStart = weekStartKey();
    const weeklyPublished = data.videos.filter(
      (v) => v.status === "Publicado" && !v.studioCreatedFromOnline && !v.studioCreatedFromCsv && v.publishedAt >= weekStart,
    ).length;
    const publishedCount = data.videos.filter(
      (v) => v.status === "Publicado" && !v.studioCreatedFromOnline && !v.studioCreatedFromCsv,
    ).length;
    return { streak, weeklyPublished, weeklyGoal: data.settings.weeklyGoal, publishedCount };
  }, [data]);

  useEffect(() => {
    const newly = checkNewAchievements(data.videos, achievementCtx, progress.achievements);
    const nextAchievements = newly.length
      ? [...progress.achievements, ...newly.map((a) => ({ id: a.id, unlockedAt: new Date().toISOString() }))]
      : progress.achievements;

    // Marca-d'água monotônica: XP exibido nunca cai (apagar vídeo não tira nível).
    const currentXp = computeXp(data.videos, nextAchievements);
    const nextFloor = Math.max(progress.xpFloor ?? 0, currentXp);

    const floorChanged = nextFloor !== (progress.xpFloor ?? 0);
    if (newly.length === 0 && !floorChanged) return;

    const updated: CreatorProgress = { achievements: nextAchievements, xpFloor: nextFloor };
    setProgress(updated);
    saveProgress(updated);
    if (newly.length) setNewAchievements((prev) => [...prev, ...newly]);
  }, [data, achievementCtx]);

  // ── Notification scheduling ───────────────────────────────────────────────

  // Resume scheduled timer on mount (if already configured + permission granted)
  useEffect(() => {
    if (
      notifPrefs.enabled &&
      typeof Notification !== "undefined" &&
      Notification.permission === "granted"
    ) {
      scheduleDailyNotification(notifPrefs, () => dataRef.current);
      registerPeriodicSync();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally only on mount

  // Keep IDB payload fresh so periodic background sync (PWA) always has current data
  useEffect(() => {
    if (!notifPrefs.enabled) return;
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    const payload = generateSmartNotification(data, notifPrefs.types);
    syncPayloadToSW(payload, getLastShownDate());
  }, [data, notifPrefs]);

  // ── Derived values ────────────────────────────────────────────────────────

  const editingVideo = useMemo(
    () => data.videos.find((v) => v.id === editingVideoId) || null,
    [data.videos, editingVideoId],
  );
  const activeVideos = useMemo(() => data.videos.filter((v) => !v.archived), [data.videos]);
  const archivedVideos = useMemo(() => data.videos.filter((v) => v.archived), [data.videos]);

  const activeChannelId = data.channels.some((c) => c.id === data.settings.defaultChannel)
    ? data.settings.defaultChannel
    : "all";

  const activeChannel = useMemo(
    () => data.channels.find((c) => c.id === activeChannelId) || null,
    [activeChannelId, data.channels],
  );

  const scopedActiveVideos = useMemo(() => {
    if (!activeChannel) return activeVideos;
    return activeVideos.filter(
      (v) => v.channelId === activeChannel.id || (!v.channelId && v.channel === activeChannel.name),
    );
  }, [activeChannel, activeVideos]);

  const scopedArchivedVideos = useMemo(() => {
    if (!activeChannel) return archivedVideos;
    return archivedVideos.filter(
      (v) => v.channelId === activeChannel.id || (!v.channelId && v.channel === activeChannel.name),
    );
  }, [activeChannel, archivedVideos]);

  const filteredVideos = useMemo(() => {
    const search = filters.search.trim().toLowerCase();
    const qf = filters.quickFilter;
    const base = scopedActiveVideos.filter((v) => {
      const matchesNiche = filters.niche === "all" || v.niche === filters.niche;
      const matchesChannel = filters.channel === "all" || v.channel === filters.channel;
      if (!matchesNiche || !matchesChannel || !matchesVideoSearch(v, search)) return false;
      if (qf === "alta") return v.priority === "Alta";
      if (qf === "atrasados") return isOverdue(v);
      if (qf === "sem-roteiro") return !hasScript(v) && v.status !== "Publicado";
      if (qf === "prontos") return isReadyToPublish(v);
      return true;
    });
    if (!focusMode) return base;
    const recommendation = getRecommendation(scopedActiveVideos);
    const focusIds = new Set(
      scopedActiveVideos
        .filter((v) => isOverdue(v) || isToday(v.plannedDate) || v.id === recommendation.video?.id)
        .map((v) => v.id),
    );
    return focusIds.size ? base.filter((v) => focusIds.has(v.id)) : base;
  }, [filters, focusMode, scopedActiveVideos]);

  const searchedVideos = useMemo(() => {
    const search = filters.search.trim().toLowerCase();
    return scopedActiveVideos.filter((v) => matchesVideoSearch(v, search));
  }, [scopedActiveVideos, filters.search]);

  const searchedArchivedVideos = useMemo(() => {
    const search = filters.search.trim().toLowerCase();
    return scopedArchivedVideos.filter((v) => matchesVideoSearch(v, search));
  }, [scopedArchivedVideos, filters.search]);

  const backupStats = useMemo(() => getBackupStats(data), [data]);

  // ── Navigation helpers ────────────────────────────────────────────────────

  const openCreate = useCallback(() => {
    setEditingVideoId(null);
    setModalOpen(true);
  }, []);

  const openVideo = useCallback(
    (video: Video | null) => {
      if (!video) { openCreate(); return; }
      setEditingVideoId(video.id);
      setModalOpen(true);
    },
    [openCreate],
  );

  const setActiveChannel = useCallback((channelId: string) => {
    const nextChannelId = channelId === "all" ? "" : channelId;
    setFilters((current) => ({ ...current, channel: "all" }));
    setData((current) =>
      stampData({ ...current, settings: { ...current.settings, defaultChannel: nextChannelId } }),
    );
  }, []);

  // ── Settings actions ──────────────────────────────────────────────────────

  const setWeeklyGoal = useCallback((weeklyGoal: number) => {
    setData((current) => stampData({ ...current, settings: { ...current.settings, weeklyGoal } }));
  }, []);

  // ── Task actions ──────────────────────────────────────────────────────────

  const updateTasks = useCallback((updater: (tasks: DailyTask[]) => DailyTask[]) => {
    setData((current) => {
      const nextTasks = updater(current.dailyChecklist.tasks);
      const nextData = stampData({
        ...current,
        dailyChecklist: { date: localDateKey(), tasks: nextTasks },
      });
      return nextTasks.some((t) => t.done) ? markProductionDay(nextData) : nextData;
    });
  }, []);

  // ── Video CRUD ────────────────────────────────────────────────────────────

  const createVideo = useCallback((draft: VideoDraft) => {
    if (!draft.title.trim() || !draft.niche.trim()) {
      setToast("Preencha título e nicho antes de salvar.");
      return;
    }
    const now = new Date().toISOString();
    const video = normalizeVideo({ ...prepareDraftForSave(draft), id: makeId(), createdAt: now, updatedAt: now });
    setData((current) => stampData({ ...current, videos: [video, ...current.videos] }));
    setModalOpen(false);
    setEditingVideoId(null);
    setToast("Nova ideia salva.");
  }, []);

  const updateVideo = useCallback((draft: VideoDraft, mode: "autosave" | "manual" = "manual") => {
    if (!draft.id) return;
    setData((current) =>
      stampData({
        ...current,
        videos: current.videos.map((v) =>
          v.id === draft.id
            ? normalizeVideo({ ...v, ...prepareDraftForSave(draft), updatedAt: new Date().toISOString() })
            : v,
        ),
      }),
    );
    if (mode === "manual") setToast("Vídeo atualizado.");
  }, []);

  const deleteVideo = useCallback(
    (id: string) => {
      const video = data.videos.find((v) => v.id === id);
      setConfirmDialog({
        title: `Excluir "${video?.title || "este vídeo"}"?`,
        message: "Esta ação é permanente e não pode ser desfeita.",
        confirmLabel: "Excluir",
        onConfirm: () => {
          setData((current) =>
            stampData({ ...current, videos: current.videos.filter((v) => v.id !== id) }),
          );
          setModalOpen(false);
          setEditingVideoId(null);
          setToast("Vídeo excluído.");
          setConfirmDialog(null);
        },
      });
    },
    [data.videos],
  );

  const moveVideo = useCallback((id: string, status: VideoStatus) => {
    let isPublishing = false;
    let prevStatus: VideoStatus | undefined;

    setData((current) => {
      let changed = false;
      const nextData = stampData({
        ...current,
        videos: current.videos.map((v) => {
          if (v.id === id && v.status !== status) {
            changed = true;
            prevStatus = v.status;
            if (status === "Publicado") isPublishing = true;
            return normalizeVideo({
              ...v,
              status,
              publishedAt: status === "Publicado" && !v.publishedAt ? localDateKey() : v.publishedAt,
              updatedAt: new Date().toISOString(),
            });
          }
          return v;
        }),
      });
      return changed ? markProductionDay(nextData) : nextData;
    });

    if (isPublishing) {
      setCelebrate(true);
      window.setTimeout(() => setCelebrate(false), 3000);
      setUndoAction(null);
      // Depois que o setData assenta, lê estado fresco via refs — SEM aninhar
      // setState dentro de setState (o StrictMode invoca updaters 2x, o que
      // duplicaria a contagem de XP / a celebração). C3 da auditoria.
      window.setTimeout(() => {
        const current = dataRef.current;
        const prev = progressRef.current;
        const publishedVid = current.videos.find((v) => v.id === id);
        if (!publishedVid) return;
        const publishedCount = current.videos.filter(
          (v) => v.status === "Publicado" && !v.studioCreatedFromOnline && !v.studioCreatedFromCsv,
        ).length;
        const xpBefore = computeXp(current.videos.filter((v) => v.id !== id || v.status !== "Publicado"), prev.achievements);
        const xpAfter = computeXp(current.videos, prev.achievements);
        const newAch = checkNewAchievements(current.videos, {
          streak: 0, weeklyPublished: 0, weeklyGoal: current.settings.weeklyGoal, publishedCount,
        }, prev.achievements).map((a) => a.id);
        setPublishCelebration({ video: publishedVid, xpBefore, xpAfter, newAchievements: newAch });
      }, 200);
    } else if (prevStatus) {
      const captured = prevStatus;
      setUndoAction(() => () => {
        setData((current) =>
          stampData({
            ...current,
            videos: current.videos.map((v) =>
              v.id === id ? normalizeVideo({ ...v, status: captured, updatedAt: new Date().toISOString() }) : v,
            ),
          }),
        );
        setToast("Movimentação desfeita.");
        setUndoAction(null);
      });
    }
  }, []);

  const applyWeeklyPlan = useCallback((items: WeeklyPlanItem[]) => {
    const datesByVideo = new Map(items.map((item) => [item.video.id, item.date]));
    const now = new Date().toISOString();
    if (!datesByVideo.size) { setToast("Nenhuma acao para aplicar."); return; }
    setData((current) =>
      stampData({
        ...current,
        videos: current.videos.map((v) =>
          datesByVideo.has(v.id)
            ? normalizeVideo({ ...v, plannedDate: datesByVideo.get(v.id) || v.plannedDate, updatedAt: now })
            : v,
        ),
      }),
    );
    setToast(`Semana aplicada: ${datesByVideo.size} video${datesByVideo.size === 1 ? "" : "s"} com data.`);
  }, []);

  const toggleArchiveVideo = useCallback(
    (id: string) => {
      const target = data.videos.find((v) => v.id === id);
      const nextArchived = !target?.archived;
      setData((current) =>
        stampData({
          ...current,
          videos: current.videos.map((v) =>
            v.id === id ? normalizeVideo({ ...v, archived: nextArchived, updatedAt: new Date().toISOString() }) : v,
          ),
        }),
      );
      setToast(nextArchived ? "Vídeo arquivado." : "Vídeo restaurado.");
      // Undo support
      setUndoAction(() => () => {
        setData((current) =>
          stampData({
            ...current,
            videos: current.videos.map((v) =>
              v.id === id ? normalizeVideo({ ...v, archived: !nextArchived, updatedAt: new Date().toISOString() }) : v,
            ),
          }),
        );
        setToast(nextArchived ? "Arquivamento desfeito." : "Restauração desfeita.");
        setUndoAction(null);
      });
    },
    [data.videos],
  );

  const duplicateVideo = useCallback(
    (id: string) => {
      const source = data.videos.find((v) => v.id === id);
      if (!source) return;
      const now = new Date().toISOString();
      const copy = normalizeVideo({
        ...source,
        id: makeId(),
        title: `${source.title} (copia)`,
        status: "Ideia",
        plannedDate: "",
        publishedLink: "",
        publishedAt: "",
        views24h: "",
        ctr: "",
        avgDuration: "",
        contentType: "",
        studioSyncPeriod: "",
        studioVideoId: "",
        studioViews: "",
        studioImpressions: "",
        studioRetention: "",
        studioWatchTimeHours: "",
        studioSubscribers: "",
        studioPublishedHour: "",
        performanceNotes: "",
        lessons: "",
        studioImportedAt: "",
        studioSourceFile: "",
        studioMatchedBy: "",
        studioCreatedFromCsv: false,
        studioCreatedFromOnline: false,
        archived: false,
        createdAt: now,
        updatedAt: now,
      });
      setData((current) => stampData({ ...current, videos: [copy, ...current.videos] }));
      setActiveView("production");
      setToast("Video duplicado como nova ideia.");
    },
    [data.videos],
  );

  // ── Inspiration actions ───────────────────────────────────────────────────

  const saveInspiration = useCallback((draft: InspirationDraft) => {
    const now = new Date().toISOString();
    const inspiration = normalizeInspiration({ ...draft, id: draft.id || makeId(), createdAt: draft.createdAt || now, updatedAt: now });
    setData((current) => {
      const exists = current.inspirations.some((i) => i.id === inspiration.id);
      return stampData({
        ...current,
        inspirations: exists
          ? current.inspirations.map((i) => (i.id === inspiration.id ? inspiration : i))
          : [inspiration, ...current.inspirations],
      });
    });
    setToast(draft.id ? "Inspiracao atualizada." : "Inspiracao salva.");
  }, []);

  const deleteInspiration = useCallback((id: string) => {
    setData((current) =>
      stampData({
        ...current,
        inspirations: current.inspirations.filter((i) => i.id !== id),
        videos: current.videos.map((v) => ({
          ...v,
          linkedInspirationIds: v.linkedInspirationIds.filter((iid) => iid !== id),
        })),
      }),
    );
    setToast("Inspiracao excluida.");
  }, []);

  // ── Trend actions ─────────────────────────────────────────────────────────

  const saveTrend = useCallback((draft: TrendDraft) => {
    const now = new Date().toISOString();
    const trend = normalizeTrend({ ...draft, id: draft.id || makeId(), createdAt: draft.createdAt || now, updatedAt: now });
    setData((current) => {
      const exists = current.trends.some((t) => t.id === trend.id);
      return stampData({
        ...current,
        trends: exists
          ? current.trends.map((t) => (t.id === trend.id ? trend : t))
          : [trend, ...current.trends],
      });
    });
    setToast(draft.id ? "Tendencia atualizada." : "Tendencia salva.");
  }, []);

  const deleteTrend = useCallback((id: string) => {
    setData((current) => stampData({ ...current, trends: current.trends.filter((t) => t.id !== id) }));
    setToast("Tendencia excluida.");
  }, []);

  // ── Channel actions (extraídas para useChannelActions) ────────────────────

  const {
    saveChannel,
    saveChannels,
    deleteChannel,
    disconnectChannel,
    syncYouTubeOnline,
    clearYouTubeOnlineSync,
  } = useChannelActions({ data, setData, setToast, setConfirmDialog });

  // ── Notification prefs ───────────────────────────────────────────────────

  const saveNotifPrefsAndReschedule = useCallback((prefs: NotificationPrefs) => {
    setNotifPrefsState(prefs);
    saveNotifPrefs(prefs);
    if (
      prefs.enabled &&
      typeof Notification !== "undefined" &&
      Notification.permission === "granted"
    ) {
      scheduleDailyNotification(prefs, () => dataRef.current);
      registerPeriodicSync();
    }
  }, []);

  // ── Data / backup actions ─────────────────────────────────────────────────

  const handleImport = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const [file] = event.target.files || [];
      if (!file) return;
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        try {
          const parsed = JSON.parse(String(reader.result));
          setBackupSnapshots((current) =>
            createBackupSnapshot(data, current, "import", `Antes de importar ${file.name || "backup externo"}`),
          );
          setData((current) => parseImportedData(parsed, current));

          // Backups novos carregam XP/conquistas, Caçador e notificações junto
          const extras = (parsed as { extras?: { progress?: unknown; scout?: unknown; notifPrefs?: unknown } })?.extras;
          if (extras && typeof extras === "object") {
            if (extras.progress) {
              const restored = normalizeProgress(extras.progress);
              setProgress(restored);
              saveProgress(restored);
            }
            if (extras.scout) saveScoutState(normalizeScoutState(extras.scout));
            if (extras.notifPrefs) saveNotifPrefsAndReschedule(normalizeNotifPrefs(extras.notifPrefs));
            setToast("Backup importado com progresso, Caçador e notificações.");
          } else {
            setToast("Backup importado.");
          }
        } catch (error) {
          console.error(error);
          setToast("Não foi possível importar este arquivo.");
        } finally {
          event.target.value = "";
        }
      });
      reader.readAsText(file);
    },
    [data, saveNotifPrefsAndReschedule],
  );

  const handleCreateRestorePoint = useCallback(() => {
    const label = `Ponto manual ${new Date().toLocaleString("pt-BR")}`;
    setBackupSnapshots((current) => createBackupSnapshot(data, current, "manual", label));
    setToast("Ponto de restauracao criado.");
  }, [data]);

  const handleRestoreSnapshot = useCallback(
    (id: string) => {
      const snapshot = backupSnapshots.find((s) => s.id === id);
      if (!snapshot) { setToast("Ponto de restauracao nao encontrado."); return; }
      setConfirmDialog({
        title: `Restaurar "${snapshot.label}"?`,
        message: "Os dados atuais serão substituídos, mas um ponto de segurança será criado antes da restauração.",
        confirmLabel: "Restaurar",
        onConfirm: () => {
          setBackupSnapshots((current) => createBackupSnapshot(data, current, "restore", `Antes de restaurar ${snapshot.label}`));
          setData((current) => parseImportedData({ data: snapshot.data }, current));
          setToast("Backup restaurado.");
          setConfirmDialog(null);
        },
      });
    },
    [backupSnapshots, data],
  );

  const handleDeleteSnapshot = useCallback(
    (id: string) => {
      const snapshot = backupSnapshots.find((s) => s.id === id);
      setConfirmDialog({
        title: `Excluir o ponto "${snapshot?.label || "selecionado"}"?`,
        message: "O ponto de restauração será removido permanentemente.",
        confirmLabel: "Excluir",
        onConfirm: () => {
          setBackupSnapshots((current) => deleteBackupSnapshot(id, current));
          setToast("Ponto de restauracao excluido.");
          setConfirmDialog(null);
        },
      });
    },
    [backupSnapshots],
  );

  const handleDownloadSnapshot = useCallback(
    (id: string) => {
      const snapshot = backupSnapshots.find((s) => s.id === id);
      if (!snapshot) { setToast("Ponto de restauracao nao encontrado."); return; }
      exportJson(snapshot.data, buildBackupExtras());
      setToast("Backup do ponto baixado.");
    },
    [backupSnapshots],
  );

  // ── Keyboard shortcuts ────────────────────────────────────────────────────

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const key = event.key.toLowerCase();

      if (event.key === "Escape") {
        if (paletteOpen) { event.preventDefault(); setPaletteOpen(false); return; }
        if (modalOpen) {
          event.preventDefault();
          setModalOpen(false);
          setEditingVideoId(null);
          return;
        }
        if (focusMode) { event.preventDefault(); setFocusMode(false); }
      }

      if ((event.ctrlKey || event.metaKey) && key === "k") {
        event.preventDefault();
        setPaletteOpen((c) => !c);
        return;
      }

      if (isEditableTarget(event.target)) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      if (key === "n") { event.preventDefault(); openCreate(); }
      if (key === "/") {
        event.preventDefault();
        const searchInput = document.getElementById("global-search-input") as HTMLInputElement | null;
        searchInput?.focus();
        searchInput?.select();
      }
      if (key === "f") { event.preventDefault(); setFocusMode((c) => !c); }
      if (key === "r") { event.preventDefault(); setActiveView("radar"); }
      if (key === "?") { event.preventDefault(); setShortcutsOpen((c) => !c); }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [focusMode, modalOpen, paletteOpen, shortcutsOpen, openCreate]);

  // ─────────────────────────────────────────────────────────────────────────

  const value: AppContextValue = {
    data,
    filters,
    modalOpen,
    editingVideoId,
    focusMode,
    activeView,
    compactKanban,
    toast,
    undoAction,
    celebrate,
    paletteOpen,
    shortcutsOpen,
    confirmDialog,
    importRef,
    backupSnapshots,
    editingVideo,
    activeVideos,
    archivedVideos,
    activeChannelId,
    activeChannel,
    scopedActiveVideos,
    scopedArchivedVideos,
    filteredVideos,
    searchedVideos,
    searchedArchivedVideos,
    backupStats,
    setModalOpen,
    setEditingVideoId,
    setFocusMode,
    setActiveView,
    setCompactKanban,
    setFilters,
    setToast,
    setPaletteOpen,
    setShortcutsOpen,
    closeConfirmDialog: () => setConfirmDialog(null),
    openCreate,
    openVideo,
    setActiveChannel,
    setWeeklyGoal,
    updateTasks,
    createVideo,
    updateVideo,
    deleteVideo,
    moveVideo,
    applyWeeklyPlan,
    toggleArchiveVideo,
    duplicateVideo,
    saveInspiration,
    deleteInspiration,
    saveTrend,
    deleteTrend,
    saveChannel,
    saveChannels,
    deleteChannel,
    disconnectChannel,
    syncYouTubeOnline,
    clearYouTubeOnlineSync,
    handleImport,
    handleCreateRestorePoint,
    handleRestoreSnapshot,
    handleDeleteSnapshot,
    handleDownloadSnapshot,

    // Gamification
    progress,
    newAchievements,
    clearNewAchievements: () => setNewAchievements([]),
    publishCelebration,
    clearPublishCelebration: () => setPublishCelebration(null),
    achievementCtx,

    // Notifications
    notifPrefs,
    saveNotifPrefsAndReschedule,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable;
}
