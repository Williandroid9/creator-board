import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import type {
  AppData,
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
} from "./types";
import { addDays, isToday, localDateKey } from "./lib/date";
import { exportCsv, exportJson } from "./lib/export";
import { loadAppData, parseImportedData, saveAppData } from "./lib/storage";
import type { YouTubeOnlineVideo } from "./lib/youtubeApi";
import { isYouTubeApiSource } from "./lib/dataSource";
import { normalizeChannel, normalizeChannelName } from "./lib/channel";
import { extractYouTubeId, normalizeTitleKey } from "./lib/onlineSync";
import { getRecommendation, isOverdue, makeId, normalizeVideo } from "./lib/video";
import type { WeeklyPlanItem } from "./lib/weeklyPlan";
import { normalizeInspiration } from "./lib/inspiration";
import { generateRadarReport, normalizeRadarCompetitor, radarIdeaToVideoDraft } from "./lib/radar";
import { normalizeTrend } from "./lib/trend";
import { ArchivePanel } from "./components/ArchivePanel";
import { AssetSnowballPanel } from "./components/AssetSnowballPanel";
import { ChannelPanel } from "./components/ChannelPanel";
import { ChannelPulsePanel } from "./components/ChannelPulsePanel";
import { ChannelInsightsPanel } from "./components/ChannelInsightsPanel";
import { DataPanel } from "./components/DataPanel";
import { DailyChecklist } from "./components/DailyChecklist";
import { Filters } from "./components/Filters";
import { FocusMode } from "./components/FocusMode";
import { KanbanBoard } from "./components/KanbanBoard";
import { InspirationBank } from "./components/InspirationBank";
import { BottleneckPanel } from "./components/BottleneckPanel";
import { MetricGrid } from "./components/MetricGrid";
import { OnboardingPanel } from "./components/OnboardingPanel";
import { OpportunityPanel } from "./components/OpportunityPanel";
import { PerformancePanel } from "./components/PerformancePanel";
import { RadarPanel } from "./components/RadarPanel";
import { SmartWeeklyPlanner } from "./components/SmartWeeklyPlanner";
import { TodayPanel } from "./components/TodayPanel";
import { Topbar, type AppView } from "./components/Topbar";
import { VideoModal } from "./components/VideoModal";
import { Toast } from "./components/ui";
import { TrendsPanel } from "./components/TrendsPanel";
import { WeeklyCalendar } from "./components/WeeklyCalendar";

const ACTIVE_VIEW_KEY = "creator-board-active-view-v1";
const COMPACT_KANBAN_KEY = "creator-board-compact-kanban-v1";
const APP_VIEWS: AppView[] = ["production", "channels", "insights", "radar", "trends", "calendar", "references", "performance", "archive", "data"];

function stampData(data: AppData): AppData {
  return {
    ...data,
    updatedAt: new Date().toISOString(),
  };
}

function markProductionDay(data: AppData, date = localDateKey()): AppData {
  const days = data.settings.productionDays || [];
  if (days.includes(date)) {
    return data;
  }

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
      draft.status === "Publicado" && !draft.publishedAt
        ? localDateKey()
        : draft.publishedAt,
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
  if (!search) {
    return true;
  }

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
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(search);
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable;
}

export default function App() {
  const [data, setData] = useState<AppData>(() => loadAppData());
  const [filters, setFilters] = useState<FilterState>({ niche: "all", channel: "all", search: "" });
  const [modalOpen, setModalOpen] = useState(false);
  const [editingVideoId, setEditingVideoId] = useState<string | null>(null);
  const [focusMode, setFocusMode] = useState(false);
  const [activeView, setActiveView] = useState<AppView>(() => loadActiveView());
  const [compactKanban, setCompactKanban] = useState(() => loadCompactKanban());
  const [toast, setToast] = useState("");
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    saveAppData(data);
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
      return undefined;
    }

    const timer = window.setTimeout(() => setToast(""), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const editingVideo = useMemo(
    () => data.videos.find((video) => video.id === editingVideoId) || null,
    [data.videos, editingVideoId],
  );
  const activeVideos = useMemo(() => data.videos.filter((video) => !video.archived), [data.videos]);
  const archivedVideos = useMemo(() => data.videos.filter((video) => video.archived), [data.videos]);
  const activeChannelId = data.channels.some((channel) => channel.id === data.settings.defaultChannel)
    ? data.settings.defaultChannel
    : "all";
  const activeChannel = useMemo(
    () => data.channels.find((channel) => channel.id === activeChannelId) || null,
    [activeChannelId, data.channels],
  );
  const scopedActiveVideos = useMemo(() => {
    if (!activeChannel) {
      return activeVideos;
    }

    return activeVideos.filter(
      (video) => video.channelId === activeChannel.id || (!video.channelId && video.channel === activeChannel.name),
    );
  }, [activeChannel, activeVideos]);
  const scopedArchivedVideos = useMemo(() => {
    if (!activeChannel) {
      return archivedVideos;
    }

    return archivedVideos.filter(
      (video) => video.channelId === activeChannel.id || (!video.channelId && video.channel === activeChannel.name),
    );
  }, [activeChannel, archivedVideos]);

  const filteredVideos = useMemo(() => {
    const search = filters.search.trim().toLowerCase();
    const base = scopedActiveVideos.filter((video) => {
      const matchesNiche = filters.niche === "all" || video.niche === filters.niche;
      const matchesChannel = filters.channel === "all" || video.channel === filters.channel;
      return matchesNiche && matchesChannel && matchesVideoSearch(video, search);
    });

    if (!focusMode) {
      return base;
    }

    const recommendation = getRecommendation(scopedActiveVideos);
    const focusIds = new Set(
      scopedActiveVideos
        .filter((video) => isOverdue(video) || isToday(video.plannedDate) || video.id === recommendation.video?.id)
        .map((video) => video.id),
    );

    return focusIds.size ? base.filter((video) => focusIds.has(video.id)) : base;
  }, [filters, focusMode, scopedActiveVideos]);

  const searchedVideos = useMemo(() => {
    const search = filters.search.trim().toLowerCase();
    return scopedActiveVideos.filter((video) => matchesVideoSearch(video, search));
  }, [scopedActiveVideos, filters.search]);

  const searchedArchivedVideos = useMemo(() => {
    const search = filters.search.trim().toLowerCase();
    return scopedArchivedVideos.filter((video) => matchesVideoSearch(video, search));
  }, [scopedArchivedVideos, filters.search]);

  const updateTasks = useCallback((updater: (tasks: DailyTask[]) => DailyTask[]) => {
    setData((current) => {
      const nextTasks = updater(current.dailyChecklist.tasks);
      const nextData = stampData({
        ...current,
        dailyChecklist: {
          date: localDateKey(),
          tasks: nextTasks,
        },
      });

      return nextTasks.some((task) => task.done) ? markProductionDay(nextData) : nextData;
    });
  }, []);

  const openCreate = useCallback(() => {
    setEditingVideoId(null);
    setModalOpen(true);
  }, []);

  const setActiveChannel = useCallback((channelId: string) => {
    const nextChannelId = channelId === "all" ? "" : channelId;
    setFilters((current) => ({ ...current, channel: "all" }));
    setData((current) =>
      stampData({
        ...current,
        settings: { ...current.settings, defaultChannel: nextChannelId },
      }),
    );
  }, []);

  const openVideo = useCallback((video: Video | null) => {
    if (!video) {
      openCreate();
      return;
    }

    setEditingVideoId(video.id);
    setModalOpen(true);
  }, [openCreate]);

  const createVideo = useCallback((draft: VideoDraft) => {
    if (!draft.title.trim() || !draft.niche.trim()) {
      setToast("Preencha título e nicho antes de salvar.");
      return;
    }

    const now = new Date().toISOString();
    const video = normalizeVideo({
      ...prepareDraftForSave(draft),
      id: makeId(),
      createdAt: now,
      updatedAt: now,
    });

    setData((current) =>
      stampData({
        ...current,
        videos: [video, ...current.videos],
      }),
    );
    setModalOpen(false);
    setEditingVideoId(null);
    setToast("Nova ideia salva.");
  }, []);

  const updateVideo = useCallback((draft: VideoDraft, mode: "autosave" | "manual" = "manual") => {
    if (!draft.id) {
      return;
    }

    setData((current) =>
      stampData({
        ...current,
        videos: current.videos.map((video) =>
          video.id === draft.id
            ? normalizeVideo({
                ...video,
                ...prepareDraftForSave(draft),
                updatedAt: new Date().toISOString(),
              })
            : video,
        ),
      }),
    );

    if (mode === "manual") {
      setToast("Vídeo atualizado.");
    }
  }, []);

  const deleteVideo = useCallback((id: string) => {
    const video = data.videos.find((item) => item.id === id);
    const confirmed = window.confirm(`Excluir "${video?.title || "este vídeo"}" do Creator Board?`);

    if (!confirmed) {
      return;
    }

    setData((current) =>
      stampData({
        ...current,
        videos: current.videos.filter((item) => item.id !== id),
      }),
    );
    setModalOpen(false);
    setEditingVideoId(null);
    setToast("Vídeo excluído.");
  }, [data.videos]);

  const moveVideo = useCallback((id: string, status: VideoStatus) => {
    setData((current) => {
      let changed = false;
      const nextData = stampData({
        ...current,
        videos: current.videos.map((video) => {
          if (video.id === id && video.status !== status) {
            changed = true;
            return normalizeVideo({
                ...video,
                status,
                publishedAt: status === "Publicado" && !video.publishedAt ? localDateKey() : video.publishedAt,
                updatedAt: new Date().toISOString(),
            });
          }

          return video;
        }),
      });

      return changed ? markProductionDay(nextData) : nextData;
    });
  }, []);

  const applyWeeklyPlan = useCallback((items: WeeklyPlanItem[]) => {
    const datesByVideo = new Map(items.map((item) => [item.video.id, item.date]));
    const now = new Date().toISOString();

    if (!datesByVideo.size) {
      setToast("Nenhuma acao para aplicar.");
      return;
    }

    setData((current) =>
      stampData({
        ...current,
        videos: current.videos.map((video) =>
          datesByVideo.has(video.id)
            ? normalizeVideo({
                ...video,
                plannedDate: datesByVideo.get(video.id) || video.plannedDate,
                updatedAt: now,
              })
            : video,
        ),
      }),
    );
    setToast(`Semana aplicada: ${datesByVideo.size} video${datesByVideo.size === 1 ? "" : "s"} com data.`);
  }, []);

  const toggleArchiveVideo = useCallback((id: string) => {
    const target = data.videos.find((video) => video.id === id);
    const nextArchived = !target?.archived;

    setData((current) =>
      stampData({
        ...current,
        videos: current.videos.map((video) => {
          if (video.id !== id) {
            return video;
          }

          return normalizeVideo({
            ...video,
            archived: nextArchived,
            updatedAt: new Date().toISOString(),
          });
        }),
      }),
    );
    setToast(nextArchived ? "Video arquivado." : "Video restaurado.");
  }, [data.videos]);

  const duplicateVideo = useCallback((id: string) => {
    const source = data.videos.find((video) => video.id === id);
    if (!source) {
      return;
    }

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

    setData((current) =>
      stampData({
        ...current,
        videos: [copy, ...current.videos],
      }),
    );
    setActiveView("production");
    setToast("Video duplicado como nova ideia.");
  }, [data.videos]);

  const saveInspiration = useCallback((draft: InspirationDraft) => {
    const now = new Date().toISOString();
    const inspiration = normalizeInspiration({
      ...draft,
      id: draft.id || makeId(),
      createdAt: draft.createdAt || now,
      updatedAt: now,
    });

    setData((current) => {
      const exists = current.inspirations.some((item) => item.id === inspiration.id);

      return stampData({
        ...current,
        inspirations: exists
          ? current.inspirations.map((item) => (item.id === inspiration.id ? inspiration : item))
          : [inspiration, ...current.inspirations],
      });
    });
    setToast(draft.id ? "Inspiracao atualizada." : "Inspiracao salva.");
  }, []);

  const deleteInspiration = useCallback((id: string) => {
    setData((current) =>
      stampData({
        ...current,
        inspirations: current.inspirations.filter((item) => item.id !== id),
        videos: current.videos.map((video) => ({
          ...video,
          linkedInspirationIds: video.linkedInspirationIds.filter((itemId) => itemId !== id),
        })),
      }),
    );
    setToast("Inspiracao excluida.");
  }, []);

  const saveTrend = useCallback((draft: TrendDraft) => {
    const now = new Date().toISOString();
    const trend = normalizeTrend({
      ...draft,
      id: draft.id || makeId(),
      createdAt: draft.createdAt || now,
      updatedAt: now,
    });

    setData((current) => {
      const exists = current.trends.some((item) => item.id === trend.id);

      return stampData({
        ...current,
        trends: exists
          ? current.trends.map((item) => (item.id === trend.id ? trend : item))
          : [trend, ...current.trends],
      });
    });
    setToast(draft.id ? "Tendencia atualizada." : "Tendencia salva.");
  }, []);

  const deleteTrend = useCallback((id: string) => {
    setData((current) =>
      stampData({
        ...current,
        trends: current.trends.filter((trend) => trend.id !== id),
      }),
    );
    setToast("Tendencia excluida.");
  }, []);

  const saveRadarCompetitor = useCallback((draft: RadarCompetitorDraft) => {
    const now = new Date().toISOString();
    const competitor = normalizeRadarCompetitor({
      ...draft,
      id: draft.id || makeId(),
      createdAt: draft.createdAt || now,
      updatedAt: now,
    });

    setData((current) => {
      const exists = current.radar.competitors.some((item) => item.id === competitor.id);

      return stampData({
        ...current,
        radar: {
          ...current.radar,
          competitors: exists
            ? current.radar.competitors.map((item) => (item.id === competitor.id ? competitor : item))
            : [competitor, ...current.radar.competitors],
        },
      });
    });
    setToast(draft.id ? "Referencia atualizada." : "Referencia adicionada ao Radar.");
  }, []);

  const deleteRadarCompetitor = useCallback((id: string) => {
    const competitor = data.radar.competitors.find((item) => item.id === id);
    const confirmed = window.confirm(`Remover "${competitor?.name || "esta referencia"}" do Radar?`);

    if (!confirmed) {
      return;
    }

    setData((current) =>
      stampData({
        ...current,
        radar: {
          ...current.radar,
          competitors: current.radar.competitors.filter((item) => item.id !== id),
        },
      }),
    );
    setToast("Referencia removida.");
  }, [data.radar.competitors]);

  const runRadar = useCallback(() => {
    if (!activeChannel) {
      setToast("Escolha um canal ativo para rodar o Radar.");
      return;
    }

    const channelVideos = data.videos.filter(
      (video) =>
        !video.archived &&
        (video.channelId === activeChannel.id || (!video.channelId && video.channel === activeChannel.name)),
    );
    const competitors = data.radar.competitors.filter((competitor) => competitor.channelId === activeChannel.id);
    const result = generateRadarReport({
      channel: activeChannel,
      videos: channelVideos,
      trends: data.trends,
      inspirations: data.inspirations,
      competitors,
    });

    setData((current) =>
      stampData({
        ...current,
        radar: {
          competitors: current.radar.competitors,
          runs: [result.run, ...current.radar.runs.filter((run) => run.id !== result.run.id)].slice(0, 40),
          ideas: [
            ...result.ideas,
            ...current.radar.ideas.filter((idea) => idea.channelId !== activeChannel.id),
          ].slice(0, 240),
          alerts: [
            ...result.alerts,
            ...current.radar.alerts.filter((alert) => alert.channelId !== activeChannel.id),
          ].slice(0, 120),
        },
      }),
    );
    setActiveView("radar");
    setToast(`Radar concluido: ${result.ideas.length} ideias geradas.`);
  }, [activeChannel, data.inspirations, data.radar.competitors, data.trends, data.videos]);

  const createFromRadarIdea = useCallback((idea: RadarIdea, mode: "idea" | "calendar" | "series" | "script") => {
    if (!activeChannel) {
      setToast("Escolha um canal ativo antes de salvar a ideia.");
      return;
    }

    const now = new Date().toISOString();
    const baseDraft = radarIdeaToVideoDraft(idea, activeChannel, mode === "calendar");
    const titles = mode === "series" ? [idea.title, ...idea.titleVariations].slice(0, 4) : [idea.title];
    const createdVideos = titles.map((title, index) =>
      normalizeVideo({
        ...baseDraft,
        id: makeId(),
        title,
        plannedDate: mode === "series" ? localDateKey(addDays(new Date(), index + 1)) : baseDraft.plannedDate,
        notes:
          mode === "series"
            ? `${baseDraft.notes}\nSerie Radar: episodio ${index + 1} de ${titles.length}`
            : baseDraft.notes,
        createdAt: now,
        updatedAt: now,
      }),
    );

    setData((current) =>
      stampData({
        ...current,
        videos: [...createdVideos, ...current.videos],
      }),
    );
    if (mode === "script") {
      setEditingVideoId(createdVideos[0].id);
      setModalOpen(true);
    }
    setActiveView(mode === "calendar" || mode === "series" ? "calendar" : "production");
    setToast(
      mode === "series"
        ? `${createdVideos.length} ideias de serie salvas.`
        : mode === "calendar"
          ? "Ideia salva no calendario de amanha."
          : mode === "script"
            ? "Roteiro gerado a partir do Radar."
            : "Ideia salva no Kanban.",
    );
  }, [activeChannel]);

  const saveChannel = useCallback((draft: ChannelDraft) => {
    const now = new Date().toISOString();
    const channel = normalizeChannel({
      ...draft,
      id: draft.id || makeId(),
      createdAt: draft.createdAt || now,
      updatedAt: now,
    });

    setData((current) => {
      const exists = current.channels.some((item) => item.id === channel.id);
      const channels = exists
        ? current.channels.map((item) => (item.id === channel.id ? channel : item))
        : [channel, ...current.channels];

      return stampData({
        ...current,
        channels: channels.sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" })),
        videos: current.videos.map((video) =>
          video.channelId === channel.id
            ? normalizeVideo({
                ...video,
                channel: channel.name,
                niche: video.niche || channel.niche,
                updatedAt: now,
              })
            : video,
        ),
      });
    });
    setToast(draft.id ? "Canal atualizado." : "Canal salvo.");
  }, []);

  const saveChannels = useCallback((drafts: ChannelDraft[]) => {
    const now = new Date().toISOString();
    const prepared = drafts
      .map((draft) =>
        normalizeChannel({
          ...draft,
          id: draft.id || makeId(),
          createdAt: draft.createdAt || now,
          updatedAt: now,
        }),
      )
      .filter((channel) => channel.name.trim());

    if (!prepared.length) {
      setToast("Nenhum canal valido para salvar.");
      return;
    }

    const existingNames = new Set(data.channels.map((channel) => normalizeChannelName(channel.name)));
    const existingYouTubeIds = new Set(data.channels.map((channel) => channel.youtubeChannelId).filter(Boolean));
    const seenNames = new Set<string>();
    const created = prepared.filter((channel) => {
      const nameKey = normalizeChannelName(channel.name);
      const duplicate =
        !nameKey ||
        existingNames.has(nameKey) ||
        seenNames.has(nameKey) ||
        (channel.youtubeChannelId && existingYouTubeIds.has(channel.youtubeChannelId));

      if (!duplicate) {
        seenNames.add(nameKey);
      }

      return !duplicate;
    });

    if (!created.length) {
      setToast("Esses canais ja existem no Creator Board.");
      return;
    }

    setData((current) =>
      stampData({
        ...current,
        channels: [...created, ...current.channels].sort((a, b) =>
          a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }),
        ),
        settings: current.settings.defaultChannel
          ? current.settings
          : { ...current.settings, defaultChannel: created[0].id },
      }),
    );
    setToast(`${created.length} canal${created.length === 1 ? "" : "es"} separado${created.length === 1 ? "" : "s"} salvo${created.length === 1 ? "" : "s"}.`);
  }, [data.channels]);

  const deleteChannel = useCallback((id: string) => {
    const channel = data.channels.find((item) => item.id === id);
    const linkedCount = data.videos.filter((video) => video.channelId === id).length;
    const confirmed = window.confirm(
      linkedCount
        ? `Excluir "${channel?.name || "este canal"}" e desvincular ${linkedCount} video${linkedCount === 1 ? "" : "s"}?`
        : `Excluir "${channel?.name || "este canal"}"?`,
    );

    if (!confirmed) {
      return;
    }

    setData((current) =>
      stampData({
        ...current,
        channels: current.channels.filter((item) => item.id !== id),
        videos: current.videos.map((video) =>
          video.channelId === id
            ? normalizeVideo({
                ...video,
                channelId: "",
                channel: "",
                updatedAt: new Date().toISOString(),
              })
            : video,
        ),
      }),
    );
    setToast("Canal excluido.");
  }, [data.channels, data.videos]);

  const disconnectChannel = useCallback((id: string) => {
    const channel = data.channels.find((item) => item.id === id);
    const confirmed = window.confirm(`Desconectar "${channel?.name || "este canal"}" da conta online? Os cards e dados salvos serao mantidos.`);

    if (!confirmed) {
      return;
    }

    setData((current) =>
      stampData({
        ...current,
        channels: current.channels.map((item) =>
          item.id === id
            ? normalizeChannel({
                ...item,
                youtubeChannelId: "",
                lastSyncedAt: "",
                lastSyncSource: "",
                updatedAt: new Date().toISOString(),
              })
            : item,
        ),
        settings: current.settings.defaultChannel === id
          ? { ...current.settings, defaultChannel: "" }
          : current.settings,
      }),
    );
    setToast("Canal desconectado. Os dados locais foram mantidos.");
  }, [data.channels]);

  const syncYouTubeOnline = useCallback((
    channelId: string,
    channelName: string,
    youtubeChannelId: string,
    onlineVideos: YouTubeOnlineVideo[],
    sourceLabel: string,
    skipped = 0,
  ) => {
    const now = new Date().toISOString();
    const existingChannel = data.channels.find(
      (channel) =>
        (channelId && channel.id === channelId) ||
        (youtubeChannelId && channel.youtubeChannelId === youtubeChannelId) ||
        normalizeChannelName(channel.name) === normalizeChannelName(channelName),
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
        ? channels.map((channel) =>
            channel.id === existingChannel.id
              ? normalizeChannel({
                  ...channel,
                  youtubeChannelId: channel.youtubeChannelId || youtubeChannelId,
                  lastSyncedAt: now,
                  lastSyncSource: sourceLabel,
                  updatedAt: now,
                })
              : channel,
          )
        : [...channels, syncChannel].sort((a, b) =>
            a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }),
          );
    const byVideoId = new Map<string, Video>();
    const byTitle = new Map<string, Video>();

    for (const video of data.videos) {
      const id = video.studioVideoId || extractYouTubeId(video.publishedLink);
      const title = normalizeTitleKey(video.title);

      if (id) {
        byVideoId.set(id, video);
      }
      if (title && !byTitle.has(title)) {
        byTitle.set(title, video);
      }
    }

    const matchedIds = new Set<string>();
    const createdVideos: Video[] = [];

    for (const row of onlineVideos) {
      const existing = byVideoId.get(row.videoId) || byTitle.get(normalizeTitleKey(row.title));

      if (existing) {
        matchedIds.add(existing.id);
        continue;
      }

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

    if (updated || createdVideos.length) {
      setData((current) =>
        stampData({
          ...current,
          channels: withSyncedChannel(current.channels),
          settings: { ...current.settings, defaultChannel: effectiveChannelId },
          videos: [
            ...createdVideos,
            ...current.videos.map((video) => {
              if (!matchedIds.has(video.id)) {
                return video;
              }

              const row =
                rowsByVideoId.get(video.studioVideoId || extractYouTubeId(video.publishedLink)) ||
                rowsByTitle.get(normalizeTitleKey(video.title));

              if (!row) {
                return video;
              }

              return normalizeVideo({
                ...video,
                channelId: video.channelId || effectiveChannelId,
                channel: video.channel || syncChannel.name,
                status: "Publicado",
                plannedDate: video.plannedDate || row.publishedAt,
                publishedAt: row.publishedAt || video.publishedAt,
                publishedLink: row.url || video.publishedLink,
                studioVideoId: row.videoId || video.studioVideoId,
                contentType: row.contentType || video.contentType,
                studioSyncPeriod: sourceLabel,
                studioViews: cleanIntegerMetric(row.views) || video.studioViews,
                studioImpressions: cleanIntegerMetric(row.impressions) || video.studioImpressions,
                ctr: cleanPercentMetric(row.ctr) || video.ctr,
                avgDuration: row.avgDuration || video.avgDuration,
                studioRetention: cleanPercentMetric(row.retention) || video.studioRetention,
                studioWatchTimeHours: cleanDecimalMetric(row.watchTimeHours) || video.studioWatchTimeHours,
                studioSubscribers: cleanIntegerMetric(row.subscribers) || video.studioSubscribers,
                studioImportedAt: now,
                studioSourceFile: sourceLabel,
                studioMatchedBy: "videoId",
                studioCreatedFromCsv: video.studioCreatedFromCsv,
                studioCreatedFromOnline: video.studioCreatedFromOnline,
                updatedAt: now,
              });
            }),
          ],
          syncHistory: [
            {
              id: makeId(),
              source: "YouTube API" as const,
              channelId: effectiveChannelId,
              channelName: syncChannel.name,
              periodLabel: sourceLabel,
              updated,
              created: createdVideos.length,
              skipped,
              syncedAt: now,
            },
            ...current.syncHistory,
          ].slice(0, 50),
        }),
      );
    } else {
      setData((current) =>
        stampData({
          ...current,
          channels: withSyncedChannel(current.channels),
          settings: { ...current.settings, defaultChannel: effectiveChannelId },
          syncHistory: [
            {
              id: makeId(),
              source: "YouTube API" as const,
              channelId: effectiveChannelId,
              channelName: syncChannel.name,
              periodLabel: sourceLabel,
              updated,
              created: 0,
              skipped,
              syncedAt: now,
            },
            ...current.syncHistory,
          ].slice(0, 50),
        }),
      );
    }

    setToast(
      updated || createdVideos.length
        ? `YouTube online: ${updated} atualizado${updated === 1 ? "" : "s"} e ${createdVideos.length} criado${createdVideos.length === 1 ? "" : "s"}.`
        : "Sincronizacao online concluida, mas nenhum video novo foi encontrado.",
    );

    return { updated, created: createdVideos.length };
  }, [data.channels, data.videos]);

  const clearYouTubeOnlineSync = useCallback((channelId: string, channelName: string, removeCreated: boolean) => {
    const targetName = channelName.trim();
    const belongsToChannel = (video: Video) =>
      (channelId && video.channelId === channelId) || (!channelId && targetName && video.channel === targetName);

    let cleared = 0;
    let removed = 0;
    const now = new Date().toISOString();
    const videos = data.videos.flatMap((video) => {
      if (!belongsToChannel(video) || !isYouTubeApiSource(video)) {
        return [video];
      }

      if (removeCreated && video.studioCreatedFromOnline) {
        removed += 1;
        return [];
      }

      cleared += 1;
      return [
        normalizeVideo({
          ...video,
          avgDuration: "",
          contentType: "",
          studioSyncPeriod: "",
          studioVideoId: "",
          studioViews: "",
          studioImpressions: "",
          ctr: "",
          studioRetention: "",
          studioWatchTimeHours: "",
          studioSubscribers: "",
          studioPublishedHour: "",
          studioImportedAt: "",
          studioSourceFile: "",
          studioMatchedBy: "",
          studioCreatedFromOnline: false,
          updatedAt: now,
        }),
      ];
    });

    setData((current) =>
      stampData({
        ...current,
        videos,
      }),
    );

    setToast(
      removed || cleared
        ? `API limpa: ${cleared} video${cleared === 1 ? "" : "s"} mantido${cleared === 1 ? "" : "s"} e ${removed} removido${removed === 1 ? "" : "s"}.`
        : "Nenhum dado online encontrado para este canal.",
    );

    return { cleared, removed };
  }, [data.videos]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const key = event.key.toLowerCase();

      if (event.key === "Escape") {
        if (modalOpen) {
          event.preventDefault();
          setModalOpen(false);
          setEditingVideoId(null);
          return;
        }

        if (focusMode) {
          event.preventDefault();
          setFocusMode(false);
        }
      }

      if (isEditableTarget(event.target)) {
        return;
      }

      if ((event.ctrlKey || event.metaKey) && key === "k") {
        event.preventDefault();
        const searchInput = document.getElementById("global-search-input") as HTMLInputElement | null;
        searchInput?.focus();
        searchInput?.select();
        return;
      }

      if (event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }

      if (key === "n") {
        event.preventDefault();
        openCreate();
      }

      if (key === "/") {
        event.preventDefault();
        const searchInput = document.getElementById("global-search-input") as HTMLInputElement | null;
        searchInput?.focus();
        searchInput?.select();
      }

      if (key === "f") {
        event.preventDefault();
        setFocusMode((current) => !current);
      }

      if (key === "r") {
        event.preventDefault();
        setActiveView("radar");
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [focusMode, modalOpen, openCreate]);

  function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const [file] = event.target.files || [];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.addEventListener("load", () => {
      try {
        const parsed = JSON.parse(String(reader.result));
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
  }

  return (
    <>
      <div className="min-h-screen px-4 py-5 sm:px-6 lg:pl-[18rem] lg:pr-6 xl:pr-8">
        <Topbar
          activeView={activeView}
          onViewChange={setActiveView}
          channels={data.channels}
          activeChannelId={activeChannelId}
          onActiveChannelChange={setActiveChannel}
          searchValue={filters.search}
          onSearchChange={(search) => setFilters((current) => ({ ...current, search }))}
          onCreate={openCreate}
        />

        {focusMode ? (
          <FocusMode
            videos={scopedActiveVideos}
            tasks={data.dailyChecklist.tasks}
            onExit={() => setFocusMode(false)}
            onOpenVideo={openVideo}
            onMove={moveVideo}
            onToggleTask={(id) =>
              updateTasks((tasks) => tasks.map((task) => (task.id === id ? { ...task, done: !task.done } : task)))
            }
          />
        ) : (
          <main className="mx-auto max-w-[1800px] space-y-5">
            {activeView === "production" && (
              <>
                {(!data.channels.length || !scopedActiveVideos.length) && (
                  <OnboardingPanel
                    hasChannels={Boolean(data.channels.length)}
                    hasVideos={Boolean(scopedActiveVideos.length)}
                    onOpenChannels={() => setActiveView("channels")}
                    onCreateIdea={openCreate}
                  />
                )}
                <TodayPanel
                  videos={scopedActiveVideos}
                  tasks={data.dailyChecklist.tasks}
                  productionDays={data.settings.productionDays}
                  onEnterFocus={() => setFocusMode(true)}
                  onOpenVideo={openVideo}
                  onToggleTask={(id) =>
                    updateTasks((tasks) => tasks.map((task) => (task.id === id ? { ...task, done: !task.done } : task)))
                  }
                  weeklyGoal={data.settings.weeklyGoal}
                  onWeeklyGoalChange={(weeklyGoal) =>
                    setData((current) =>
                      stampData({
                        ...current,
                        settings: { ...current.settings, weeklyGoal },
                      }),
                    )
                  }
                />
                <ChannelPulsePanel channel={activeChannel} videos={scopedActiveVideos} />
                <AssetSnowballPanel
                  videos={scopedActiveVideos}
                  channels={activeChannel ? [activeChannel] : data.channels}
                  weeklyGoal={activeChannel?.weeklyGoal || data.settings.weeklyGoal}
                  compact
                />
                <section className="space-y-4">
                  <Filters videos={scopedActiveVideos} filters={filters} onChange={setFilters} />
                  <KanbanBoard
                    videos={filteredVideos}
                    allVideos={scopedActiveVideos}
                    compact={compactKanban}
                    onCompactChange={setCompactKanban}
                    onOpen={openVideo}
                    onMove={moveVideo}
                    onDuplicate={duplicateVideo}
                    onArchive={toggleArchiveVideo}
                  />
                </section>
                <details className="clean-panel rounded-2xl p-4 sm:p-5">
                  <summary className="cursor-pointer list-none">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="mb-1 text-xs font-black uppercase text-slate-500">Avancado</p>
                        <h2 className="text-lg font-black text-white">Planejamento e diagnosticos</h2>
                      </div>
                      <span className="text-sm font-black text-slate-500">Abrir ferramentas secundarias</span>
                    </div>
                  </summary>
                  <div className="mt-5 grid gap-5 2xl:grid-cols-[340px_minmax(0,1fr)]">
                    <DailyChecklist
                      tasks={data.dailyChecklist.tasks}
                      onToggle={(id) =>
                        updateTasks((tasks) => tasks.map((task) => (task.id === id ? { ...task, done: !task.done } : task)))
                      }
                      onRename={(id, title) =>
                        updateTasks((tasks) => tasks.map((task) => (task.id === id ? { ...task, title } : task)))
                      }
                      onRemove={(id) => updateTasks((tasks) => tasks.filter((task) => task.id !== id))}
                      onAdd={(title) => updateTasks((tasks) => [...tasks, { id: makeId(), title, done: false }])}
                      onReset={() => updateTasks((tasks) => tasks.map((task) => ({ ...task, done: false })))}
                    />
                    <div className="space-y-5">
                      <MetricGrid videos={scopedActiveVideos} weeklyGoal={data.settings.weeklyGoal} />
                      <OpportunityPanel videos={scopedActiveVideos} onOpenVideo={openVideo} onCreate={openCreate} />
                      <SmartWeeklyPlanner
                        videos={scopedActiveVideos}
                        weeklyGoal={data.settings.weeklyGoal}
                        onOpenVideo={openVideo}
                        onApplyPlan={applyWeeklyPlan}
                      />
                      <BottleneckPanel videos={scopedActiveVideos} onOpenVideo={openVideo} />
                    </div>
                  </div>
                </details>
              </>
            )}

            {activeView === "channels" && (
              <ChannelPanel
                channels={data.channels}
                videos={data.videos}
                syncHistory={data.syncHistory}
                activeChannelId={activeChannelId}
                onActiveChannelChange={setActiveChannel}
                onSave={saveChannel}
                onSaveMany={saveChannels}
                onOpenInsights={(channelId) => {
                  setActiveChannel(channelId);
                  setActiveView("insights");
                }}
                onOpenPerformance={(channelId) => {
                  setActiveChannel(channelId);
                  setActiveView("performance");
                }}
                onDisconnect={disconnectChannel}
                onDelete={deleteChannel}
                onYouTubeOnlineSync={syncYouTubeOnline}
                onClearYouTubeOnlineSync={clearYouTubeOnlineSync}
              />
            )}

            {activeView === "insights" && (
              <ChannelInsightsPanel
                channels={data.channels}
                videos={data.videos}
                onOpenVideo={openVideo}
                onCreateIdea={createVideo}
              />
            )}

            {activeView === "radar" && (
              <RadarPanel
                activeChannel={activeChannel}
                videos={data.videos}
                trends={data.trends}
                inspirations={data.inspirations}
                radar={data.radar}
                onRun={runRadar}
                onSaveCompetitor={saveRadarCompetitor}
                onDeleteCompetitor={deleteRadarCompetitor}
                onCreateFromIdea={createFromRadarIdea}
              />
            )}

            {activeView === "trends" && (
              <TrendsPanel
                trends={data.trends}
                onSave={saveTrend}
                onDelete={deleteTrend}
                onCreateIdea={createVideo}
              />
            )}

            {activeView === "calendar" && <WeeklyCalendar videos={searchedVideos} onOpen={openVideo} />}

            {activeView === "references" && (
              <InspirationBank inspirations={data.inspirations} onSave={saveInspiration} onDelete={deleteInspiration} />
            )}

            {activeView === "performance" && <PerformancePanel videos={searchedVideos} onOpen={openVideo} />}

            {activeView === "archive" && (
              <ArchivePanel
                videos={searchedArchivedVideos}
                onOpen={openVideo}
                onRestore={toggleArchiveVideo}
                onDuplicate={duplicateVideo}
              />
            )}

            {activeView === "data" && (
              <DataPanel
                syncHistory={data.syncHistory}
                onExportJson={() => {
                  exportJson(data);
                  setToast("Backup JSON exportado.");
                }}
                onExportSheet={() => {
                  exportCsv(data.videos);
                  setToast("Planilha exportada.");
                }}
                onImportBackup={handleImport}
                backupInputRef={importRef}
              />
            )}
          </main>
        )}
      </div>

      <VideoModal
        open={modalOpen}
        video={editingVideo}
        videos={data.videos}
        channels={data.channels}
        inspirations={data.inspirations}
        onClose={() => {
          setModalOpen(false);
          setEditingVideoId(null);
        }}
        onCreate={createVideo}
        onUpdate={updateVideo}
        onDelete={deleteVideo}
        onDuplicate={duplicateVideo}
        onToggleArchive={toggleArchiveVideo}
      />
      <Toast message={toast} />
    </>
  );
}
