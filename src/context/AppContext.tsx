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
  AppData,
  Channel,
  ChannelDraft,
  DailyTask,
  Filters as FilterState,
  InspirationDraft,
  RadarCompetitorDraft,
  RadarIdea,
  TrendDraft,
  Video,
  VideoDraft,
  VideoStatus,
} from "../types";
import { addDays, isToday, localDateKey } from "../lib/date";
import { exportJson } from "../lib/export";
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
import { isYouTubeApiSource } from "../lib/dataSource";
import { normalizeChannel, normalizeChannelName } from "../lib/channel";
import { extractYouTubeId, normalizeTitleKey } from "../lib/onlineSync";
import { getRecommendation, hasScript, isOverdue, isReadyToPublish, makeId, normalizeVideo } from "../lib/video";
import type { WeeklyPlanItem } from "../lib/weeklyPlan";
import { normalizeInspiration } from "../lib/inspiration";
import { generateRadarReport, normalizeRadarCompetitor, radarIdeaToVideoDraft } from "../lib/radar";
import { normalizeTrend } from "../lib/trend";

// ─── View type (single source of truth) ──────────────────────────────────────

export type AppView =
  | "production"
  | "channels"
  | "insights"
  | "radar"
  | "trends"
  | "calendar"
  | "references"
  | "performance"
  | "archive"
  | "data";

export const APP_VIEWS: AppView[] = [
  "production",
  "channels",
  "insights",
  "radar",
  "trends",
  "calendar",
  "references",
  "performance",
  "archive",
  "data",
];

// ─── Storage keys ─────────────────────────────────────────────────────────────

const ACTIVE_VIEW_KEY = "creator-board-active-view-v1";
const COMPACT_KANBAN_KEY = "creator-board-compact-kanban-v1";

// ─── Helper functions ─────────────────────────────────────────────────────────

function stampData(data: AppData): AppData {
  return { ...data, updatedAt: new Date().toISOString() };
}

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

function cleanIntegerMetric(value: string) {
  return String(value || "").replace(/[^\d]/g, "");
}

function cleanPercentMetric(value: string) {
  return String(value || "")
    .trim()
    .replace("%", "")
    .replace(",", ".")
    .replace(/[^\d.]/g, "");
}

function cleanDecimalMetric(value: string) {
  return String(value || "")
    .trim()
    .replace(",", ".")
    .replace(/[^\d.]/g, "");
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
  confirmDialog: { title: string; message?: string; confirmLabel?: string; onConfirm: () => void } | null;
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

  // Radar actions
  saveRadarCompetitor: (draft: RadarCompetitorDraft) => void;
  deleteRadarCompetitor: (id: string) => void;
  runRadar: () => void;
  createFromRadarIdea: (idea: RadarIdea, mode: "idea" | "calendar" | "series" | "script") => void;

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
  const [confirmDialog, setConfirmDialog] = useState<{ title: string; message?: string; confirmLabel?: string; onConfirm: () => void } | null>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const [backupSnapshots, setBackupSnapshots] = useState(() => readBackupSnapshots());

  // Persist data
  useEffect(() => {
    saveAppData(data);
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
      setToast("🎉 Vídeo publicado! Parabéns!");
      window.setTimeout(() => setCelebrate(false), 3000);
      setUndoAction(null);
    } else if (prevStatus) {
      const captured = prevStatus;
      setUndoAction(() => {
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
      setUndoAction(() => {
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

  // ── Radar actions ─────────────────────────────────────────────────────────

  const saveRadarCompetitor = useCallback((draft: RadarCompetitorDraft) => {
    const now = new Date().toISOString();
    const competitor = normalizeRadarCompetitor({ ...draft, id: draft.id || makeId(), createdAt: draft.createdAt || now, updatedAt: now });
    setData((current) => {
      const exists = current.radar.competitors.some((c) => c.id === competitor.id);
      return stampData({
        ...current,
        radar: {
          ...current.radar,
          competitors: exists
            ? current.radar.competitors.map((c) => (c.id === competitor.id ? competitor : c))
            : [competitor, ...current.radar.competitors],
        },
      });
    });
    setToast(draft.id ? "Referencia atualizada." : "Referencia adicionada ao Radar.");
  }, []);

  const deleteRadarCompetitor = useCallback(
    (id: string) => {
      const competitor = data.radar.competitors.find((c) => c.id === id);
      if (!window.confirm(`Remover "${competitor?.name || "esta referencia"}" do Radar?`)) return;
      setData((current) =>
        stampData({
          ...current,
          radar: { ...current.radar, competitors: current.radar.competitors.filter((c) => c.id !== id) },
        }),
      );
      setToast("Referencia removida.");
    },
    [data.radar.competitors],
  );

  const runRadar = useCallback(() => {
    if (!activeChannel) { setToast("Escolha um canal ativo para rodar o Radar."); return; }
    const channelVideos = data.videos.filter(
      (v) => !v.archived && (v.channelId === activeChannel.id || (!v.channelId && v.channel === activeChannel.name)),
    );
    const competitors = data.radar.competitors.filter((c) => c.channelId === activeChannel.id);
    const result = generateRadarReport({ channel: activeChannel, videos: channelVideos, trends: data.trends, inspirations: data.inspirations, competitors });
    setData((current) =>
      stampData({
        ...current,
        radar: {
          competitors: current.radar.competitors,
          runs: [result.run, ...current.radar.runs.filter((r) => r.id !== result.run.id)].slice(0, 40),
          ideas: [...result.ideas, ...current.radar.ideas.filter((i) => i.channelId !== activeChannel.id)].slice(0, 240),
          alerts: [...result.alerts, ...current.radar.alerts.filter((a) => a.channelId !== activeChannel.id)].slice(0, 120),
        },
      }),
    );
    setActiveView("radar");
    setToast(`Radar concluido: ${result.ideas.length} ideias geradas.`);
  }, [activeChannel, data.inspirations, data.radar.competitors, data.trends, data.videos]);

  const createFromRadarIdea = useCallback(
    (idea: RadarIdea, mode: "idea" | "calendar" | "series" | "script") => {
      if (!activeChannel) { setToast("Escolha um canal ativo antes de salvar a ideia."); return; }
      const now = new Date().toISOString();
      const baseDraft = radarIdeaToVideoDraft(idea, activeChannel, mode === "calendar");
      const titles = mode === "series" ? [idea.title, ...idea.titleVariations].slice(0, 4) : [idea.title];
      const createdVideos = titles.map((title, index) =>
        normalizeVideo({
          ...baseDraft,
          id: makeId(),
          title,
          plannedDate: mode === "series" ? localDateKey(addDays(new Date(), index + 1)) : baseDraft.plannedDate,
          notes: mode === "series" ? `${baseDraft.notes}\nSerie Radar: episodio ${index + 1} de ${titles.length}` : baseDraft.notes,
          createdAt: now,
          updatedAt: now,
        }),
      );
      setData((current) => stampData({ ...current, videos: [...createdVideos, ...current.videos] }));
      if (mode === "script") { setEditingVideoId(createdVideos[0].id); setModalOpen(true); }
      setActiveView(mode === "calendar" || mode === "series" ? "calendar" : "production");
      setToast(
        mode === "series" ? `${createdVideos.length} ideias de serie salvas.`
          : mode === "calendar" ? "Ideia salva no calendario de amanha."
          : mode === "script" ? "Roteiro gerado a partir do Radar."
          : "Ideia salva no Kanban.",
      );
    },
    [activeChannel],
  );

  // ── Channel actions ───────────────────────────────────────────────────────

  const saveChannel = useCallback((draft: ChannelDraft) => {
    const now = new Date().toISOString();
    const channel = normalizeChannel({ ...draft, id: draft.id || makeId(), createdAt: draft.createdAt || now, updatedAt: now });
    setData((current) => {
      const exists = current.channels.some((c) => c.id === channel.id);
      const channels = exists
        ? current.channels.map((c) => (c.id === channel.id ? channel : c))
        : [channel, ...current.channels];
      return stampData({
        ...current,
        channels: channels.sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" })),
        videos: current.videos.map((v) =>
          v.channelId === channel.id
            ? normalizeVideo({ ...v, channel: channel.name, niche: v.niche || channel.niche, updatedAt: now })
            : v,
        ),
      });
    });
    setToast(draft.id ? "Canal atualizado." : "Canal salvo.");
  }, []);

  const saveChannels = useCallback(
    (drafts: ChannelDraft[]) => {
      const now = new Date().toISOString();
      const prepared = drafts
        .map((d) => normalizeChannel({ ...d, id: d.id || makeId(), createdAt: d.createdAt || now, updatedAt: now }))
        .filter((c) => c.name.trim());
      if (!prepared.length) { setToast("Nenhum canal valido para salvar."); return; }
      const existingNames = new Set(data.channels.map((c) => normalizeChannelName(c.name)));
      const existingYouTubeIds = new Set(data.channels.map((c) => c.youtubeChannelId).filter(Boolean));
      const seenNames = new Set<string>();
      const created = prepared.filter((c) => {
        const nameKey = normalizeChannelName(c.name);
        const duplicate = !nameKey || existingNames.has(nameKey) || seenNames.has(nameKey) || (c.youtubeChannelId && existingYouTubeIds.has(c.youtubeChannelId));
        if (!duplicate) seenNames.add(nameKey);
        return !duplicate;
      });
      if (!created.length) { setToast("Esses canais ja existem no Creator Board."); return; }
      setData((current) =>
        stampData({
          ...current,
          channels: [...created, ...current.channels].sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" })),
          settings: current.settings.defaultChannel ? current.settings : { ...current.settings, defaultChannel: created[0].id },
        }),
      );
      setToast(`${created.length} canal${created.length === 1 ? "" : "es"} salvo${created.length === 1 ? "" : "s"}.`);
    },
    [data.channels],
  );

  const deleteChannel = useCallback(
    (id: string) => {
      const channel = data.channels.find((c) => c.id === id);
      const linkedCount = data.videos.filter((v) => v.channelId === id).length;
      const msg = linkedCount
        ? `Excluir "${channel?.name || "este canal"}" e desvincular ${linkedCount} video${linkedCount === 1 ? "" : "s"}?`
        : `Excluir "${channel?.name || "este canal"}"?`;
      if (!window.confirm(msg)) return;
      setData((current) =>
        stampData({
          ...current,
          channels: current.channels.filter((c) => c.id !== id),
          videos: current.videos.map((v) =>
            v.channelId === id ? normalizeVideo({ ...v, channelId: "", channel: "", updatedAt: new Date().toISOString() }) : v,
          ),
        }),
      );
      setToast("Canal excluido.");
    },
    [data.channels, data.videos],
  );

  const disconnectChannel = useCallback(
    (id: string) => {
      const channel = data.channels.find((c) => c.id === id);
      if (!window.confirm(`Desconectar "${channel?.name || "este canal"}" da conta online? Os cards e dados salvos serao mantidos.`)) return;
      setData((current) =>
        stampData({
          ...current,
          channels: current.channels.map((c) =>
            c.id === id
              ? normalizeChannel({ ...c, youtubeChannelId: "", lastSyncedAt: "", lastSyncSource: "", updatedAt: new Date().toISOString() })
              : c,
          ),
          settings: current.settings.defaultChannel === id ? { ...current.settings, defaultChannel: "" } : current.settings,
        }),
      );
      setToast("Canal desconectado. Os dados locais foram mantidos.");
    },
    [data.channels],
  );

  const syncYouTubeOnline = useCallback(
    (
      channelId: string,
      channelName: string,
      youtubeChannelId: string,
      onlineVideos: YouTubeOnlineVideo[],
      sourceLabel: string,
      skipped = 0,
    ) => {
      const now = new Date().toISOString();
      const existingChannel = data.channels.find(
        (c) =>
          (channelId && c.id === channelId) ||
          (youtubeChannelId && c.youtubeChannelId === youtubeChannelId) ||
          normalizeChannelName(c.name) === normalizeChannelName(channelName),
      );
      const syncChannel =
        existingChannel ||
        normalizeChannel({
          id: channelId,
          name: channelName || "Canal conectado",
          youtubeChannelId,
          lastSyncedAt: now,
          lastSyncSource: sourceLabel,
          niche: "Sem nicho",
          notes: "Criado automaticamente pela sincronizacao online do YouTube.",
          createdAt: now,
          updatedAt: now,
        });
      const effectiveChannelId = syncChannel.id;
      const channelNiche = syncChannel.niche || "Sem nicho";

      const withSyncedChannel = (channels: AppData["channels"]) =>
        existingChannel
          ? channels.map((c) =>
              c.id === existingChannel.id
                ? normalizeChannel({ ...c, youtubeChannelId: c.youtubeChannelId || youtubeChannelId, lastSyncedAt: now, lastSyncSource: sourceLabel, updatedAt: now })
                : c,
            )
          : [...channels, syncChannel].sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }));

      const byVideoId = new Map<string, Video>();
      const byTitle = new Map<string, Video>();
      for (const v of data.videos) {
        const id = v.studioVideoId || extractYouTubeId(v.publishedLink);
        const title = normalizeTitleKey(v.title);
        if (id) byVideoId.set(id, v);
        if (title && !byTitle.has(title)) byTitle.set(title, v);
      }

      const matchedIds = new Set<string>();
      const createdVideos: Video[] = [];
      for (const row of onlineVideos) {
        const existing = byVideoId.get(row.videoId) || byTitle.get(normalizeTitleKey(row.title));
        if (existing) { matchedIds.add(existing.id); continue; }
        createdVideos.push(
          normalizeVideo({
            id: makeId(),
            title: row.title || row.videoId || "Video sincronizado do YouTube",
            channelId: effectiveChannelId,
            channel: syncChannel.name,
            niche: channelNiche,
            priority: "Media",
            status: "Publicado",
            plannedDate: row.publishedAt,
            publishedAt: row.publishedAt,
            publishedLink: row.url,
            seoTitle: row.title,
            studioVideoId: row.videoId,
            contentType: row.contentType,
            studioSyncPeriod: sourceLabel,
            studioViews: cleanIntegerMetric(row.views),
            studioImpressions: cleanIntegerMetric(row.impressions),
            ctr: cleanPercentMetric(row.ctr),
            avgDuration: row.avgDuration,
            studioRetention: cleanPercentMetric(row.retention),
            studioWatchTimeHours: cleanDecimalMetric(row.watchTimeHours),
            studioSubscribers: cleanIntegerMetric(row.subscribers),
            studioImportedAt: now,
            studioSourceFile: sourceLabel,
            studioMatchedBy: "videoId",
            studioCreatedFromCsv: false,
            studioCreatedFromOnline: true,
            createdAt: now,
            updatedAt: now,
          }),
        );
      }

      const rowsByVideoId = new Map(onlineVideos.map((row) => [row.videoId, row]));
      const rowsByTitle = new Map(onlineVideos.map((row) => [normalizeTitleKey(row.title), row]));
      const updated = matchedIds.size;

      const syncHistoryEntry = {
        id: makeId(),
        source: "YouTube API" as const,
        channelId: effectiveChannelId,
        channelName: syncChannel.name,
        periodLabel: sourceLabel,
        updated,
        created: createdVideos.length,
        skipped,
        syncedAt: now,
      };

      if (updated || createdVideos.length) {
        setData((current) =>
          stampData({
            ...current,
            channels: withSyncedChannel(current.channels),
            settings: { ...current.settings, defaultChannel: effectiveChannelId },
            videos: [
              ...createdVideos,
              ...current.videos.map((v) => {
                if (!matchedIds.has(v.id)) return v;
                const row =
                  rowsByVideoId.get(v.studioVideoId || extractYouTubeId(v.publishedLink)) ||
                  rowsByTitle.get(normalizeTitleKey(v.title));
                if (!row) return v;
                return normalizeVideo({
                  ...v,
                  channelId: v.channelId || effectiveChannelId,
                  channel: v.channel || syncChannel.name,
                  status: "Publicado",
                  plannedDate: v.plannedDate || row.publishedAt,
                  publishedAt: row.publishedAt || v.publishedAt,
                  publishedLink: row.url || v.publishedLink,
                  studioVideoId: row.videoId || v.studioVideoId,
                  contentType: row.contentType || v.contentType,
                  studioSyncPeriod: sourceLabel,
                  studioViews: cleanIntegerMetric(row.views) || v.studioViews,
                  studioImpressions: cleanIntegerMetric(row.impressions) || v.studioImpressions,
                  ctr: cleanPercentMetric(row.ctr) || v.ctr,
                  avgDuration: row.avgDuration || v.avgDuration,
                  studioRetention: cleanPercentMetric(row.retention) || v.studioRetention,
                  studioWatchTimeHours: cleanDecimalMetric(row.watchTimeHours) || v.studioWatchTimeHours,
                  studioSubscribers: cleanIntegerMetric(row.subscribers) || v.studioSubscribers,
                  studioImportedAt: now,
                  studioSourceFile: sourceLabel,
                  studioMatchedBy: "videoId",
                  studioCreatedFromCsv: v.studioCreatedFromCsv,
                  studioCreatedFromOnline: v.studioCreatedFromOnline,
                  updatedAt: now,
                });
              }),
            ],
            syncHistory: [syncHistoryEntry, ...current.syncHistory].slice(0, 50),
          }),
        );
      } else {
        setData((current) =>
          stampData({
            ...current,
            channels: withSyncedChannel(current.channels),
            settings: { ...current.settings, defaultChannel: effectiveChannelId },
            syncHistory: [syncHistoryEntry, ...current.syncHistory].slice(0, 50),
          }),
        );
      }

      setToast(
        updated || createdVideos.length
          ? `YouTube online: ${updated} atualizado${updated === 1 ? "" : "s"} e ${createdVideos.length} criado${createdVideos.length === 1 ? "" : "s"}.`
          : "Sincronizacao online concluida, mas nenhum video novo foi encontrado.",
      );
      return { updated, created: createdVideos.length };
    },
    [data.channels, data.videos],
  );

  const clearYouTubeOnlineSync = useCallback(
    (channelId: string, channelName: string, removeCreated: boolean) => {
      const targetName = channelName.trim();
      const belongsToChannel = (v: Video) =>
        (channelId && v.channelId === channelId) || (!channelId && targetName && v.channel === targetName);

      let cleared = 0;
      let removed = 0;
      const now = new Date().toISOString();
      const videos = data.videos.flatMap((v) => {
        if (!belongsToChannel(v) || !isYouTubeApiSource(v)) return [v];
        if (removeCreated && v.studioCreatedFromOnline) { removed += 1; return []; }
        cleared += 1;
        return [
          normalizeVideo({
            ...v,
            avgDuration: "", contentType: "", studioSyncPeriod: "", studioVideoId: "",
            studioViews: "", studioImpressions: "", ctr: "", studioRetention: "",
            studioWatchTimeHours: "", studioSubscribers: "", studioPublishedHour: "",
            studioImportedAt: "", studioSourceFile: "", studioMatchedBy: "",
            studioCreatedFromOnline: false, updatedAt: now,
          }),
        ];
      });
      setData((current) => stampData({ ...current, videos }));
      setToast(
        removed || cleared
          ? `API limpa: ${cleared} video${cleared === 1 ? "" : "s"} mantido${cleared === 1 ? "" : "s"} e ${removed} removido${removed === 1 ? "" : "s"}.`
          : "Nenhum dado online encontrado para este canal.",
      );
      return { cleared, removed };
    },
    [data.videos],
  );

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
          setToast("Backup importado.");
        } catch (error) {
          console.error(error);
          setToast("Não foi possível importar este arquivo.");
        } finally {
          event.target.value = "";
        }
      });
      reader.readAsText(file);
    },
    [data],
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
      if (
        !window.confirm(
          `Restaurar "${snapshot.label}"?\n\nOs dados atuais serao substituidos, mas um ponto de seguranca sera criado antes da restauracao.`,
        )
      ) return;
      setBackupSnapshots((current) => createBackupSnapshot(data, current, "restore", `Antes de restaurar ${snapshot.label}`));
      setData((current) => parseImportedData({ data: snapshot.data }, current));
      setToast("Backup restaurado.");
    },
    [backupSnapshots, data],
  );

  const handleDeleteSnapshot = useCallback(
    (id: string) => {
      const snapshot = backupSnapshots.find((s) => s.id === id);
      if (!window.confirm(`Excluir o ponto de restauracao "${snapshot?.label || "selecionado"}"?`)) return;
      setBackupSnapshots((current) => deleteBackupSnapshot(id, current));
      setToast("Ponto de restauracao excluido.");
    },
    [backupSnapshots],
  );

  const handleDownloadSnapshot = useCallback(
    (id: string) => {
      const snapshot = backupSnapshots.find((s) => s.id === id);
      if (!snapshot) { setToast("Ponto de restauracao nao encontrado."); return; }
      exportJson(snapshot.data);
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
    saveRadarCompetitor,
    deleteRadarCompetitor,
    runRadar,
    createFromRadarIdea,
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
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable;
}
