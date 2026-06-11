export const STATUSES = [
  "Ideia",
  "Roteiro",
  "Gravacao",
  "Edicao",
  "SEO",
  "Agendado",
  "Publicado",
] as const;

export const PRIORITIES = ["Alta", "Media", "Baixa"] as const;
export const INSPIRATION_TYPES = ["Video", "Thumbnail", "Titulo", "Hook", "Canal", "SEO", "Ideia"] as const;

export type VideoStatus = (typeof STATUSES)[number];
export type VideoPriority = (typeof PRIORITIES)[number];
export type InspirationType = (typeof INSPIRATION_TYPES)[number];

export type Video = {
  id: string;
  title: string;
  channelId: string;
  channel: string;
  niche: string;
  keyword: string;
  videoFormat: string;
  contentType: string;
  studioSyncPeriod: string;
  priority: VideoPriority;
  status: VideoStatus;
  plannedDate: string;
  script: string;
  thumbnailIdeas: string;
  seoTitle: string;
  seoDescription: string;
  seoNotes: string;
  notes: string;
  inspirationLinks: string;
  publishedLink: string;
  publishedAt: string;
  views24h: string;
  ctr: string;
  avgDuration: string;
  studioVideoId: string;
  studioViews: string;
  studioImpressions: string;
  studioRetention: string;
  studioWatchTimeHours: string;
  studioSubscribers: string;
  studioPublishedHour: string;
  performanceNotes: string;
  lessons: string;
  studioImportedAt: string;
  studioSourceFile: string;
  studioMatchedBy: string;
  studioCreatedFromCsv: boolean;
  studioCreatedFromOnline: boolean;
  archived: boolean;
  linkedInspirationIds: string[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

export type VideoDraft = Omit<Video, "id" | "createdAt" | "updatedAt"> & {
  id?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type DailyTask = {
  id: string;
  title: string;
  done: boolean;
};

export type DailyChecklist = {
  date: string;
  tasks: DailyTask[];
};

export type Inspiration = {
  id: string;
  title: string;
  type: InspirationType;
  channel: string;
  niche: string;
  url: string;
  notes: string;
  tags: string;
  createdAt: string;
  updatedAt: string;
};

export type InspirationDraft = Omit<Inspiration, "id" | "createdAt" | "updatedAt"> & {
  id?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type Trend = {
  id: string;
  title: string;
  niche: string;
  referenceChannel: string;
  url: string;
  views: string;
  opportunityReason: string;
  ideaAngle: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type TrendDraft = Omit<Trend, "id" | "createdAt" | "updatedAt"> & {
  id?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type RadarMarket = "Brasil" | "Ingles" | "Outro";
export type RadarChannelSize = "Grande" | "Medio" | "Pequeno" | "Referencia";
export type RadarLanguageAngle = "Brasil" | "Ingles para Brasil" | "Brasil para Ingles";
export type RadarMarketStatus = "Crescendo" | "Estavel" | "Saturado";
export type RadarDifficulty = "Baixa" | "Media" | "Alta";
export type RadarPotential = "Baixo" | "Medio" | "Alto";
export type RadarSeverity = "Alta" | "Media" | "Baixa";

export type RadarScoreBreakdown = {
  aderencia: number;
  mercado: number;
  producao: number;
  ctr: number;
  retencao: number;
  concorrencia: number;
  serie: number;
};

export type RadarCompetitor = {
  id: string;
  channelId: string;
  name: string;
  url: string;
  market: RadarMarket;
  size: RadarChannelSize;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type RadarCompetitorDraft = Omit<RadarCompetitor, "id" | "createdAt" | "updatedAt"> & {
  id?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type RadarReference = {
  title: string;
  channel: string;
  url: string;
  source: "Canal" | "Tendencia" | "Inspiracao" | "Concorrente";
  views: string;
  market: RadarMarket;
};

export type RadarIdea = {
  id: string;
  channelId: string;
  runId: string;
  score: number;
  languageAngle: RadarLanguageAngle;
  title: string;
  titleVariations: string[];
  concept: string;
  hook: string;
  scriptStructure: string[];
  thumbnailSuggestion: string;
  keywords: string[];
  references: RadarReference[];
  strategicReason: string;
  evidence: string[];
  nextActions: string[];
  scoreBreakdown: RadarScoreBreakdown;
  marketStatus: RadarMarketStatus;
  angle: string;
  audience: string;
  difficulty: RadarDifficulty;
  viewPotential: RadarPotential;
  flopRisk: string;
  createdAt: string;
  updatedAt: string;
};

export type RadarAlert = {
  id: string;
  channelId: string;
  type: string;
  title: string;
  detail: string;
  severity: RadarSeverity;
  createdAt: string;
};

export type RadarRun = {
  id: string;
  channelId: string;
  createdAt: string;
  summary: string;
  marketSummary: string;
  patterns: string[];
  immediateOpportunities: string[];
  next7Days: string[];
  next30Days: string[];
  continuationCandidates: string[];
  firstRecommendation: string;
  alerts: RadarAlert[];
};

export type RadarState = {
  competitors: RadarCompetitor[];
  runs: RadarRun[];
  ideas: RadarIdea[];
  alerts: RadarAlert[];
};

export type Channel = {
  id: string;
  name: string;
  youtubeChannelId: string;
  lastSyncedAt: string;
  lastSyncSource: string;
  url: string;
  niche: string;
  weeklyGoal: number;
  audience: string;
  promise: string;
  pillars: string;
  formats: string;
  postingFrequency: string;
  competitors: string;
  keywords: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type ChannelDraft = Omit<Channel, "id" | "createdAt" | "updatedAt"> & {
  id?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type Settings = {
  weeklyGoal: number;
  defaultChannel: string;
  productionDays: string[];
};

export type SyncSource = "CSV" | "YouTube API";

export type SyncHistoryItem = {
  id: string;
  source: SyncSource;
  channelId: string;
  channelName: string;
  periodLabel: string;
  updated: number;
  created: number;
  skipped: number;
  syncedAt: string;
};

export type AppData = {
  schemaVersion: 10;
  videos: Video[];
  channels: Channel[];
  inspirations: Inspiration[];
  trends: Trend[];
  radar: RadarState;
  syncHistory: SyncHistoryItem[];
  dailyChecklist: DailyChecklist;
  settings: Settings;
  createdAt: string;
  updatedAt: string;
};

export type Filters = {
  niche: string;
  channel: string;
  search: string;
  quickFilter: string;
};

export type InspirationFilters = {
  type: string;
  channel: string;
  niche: string;
  search: string;
};

export type Recommendation = {
  label: string;
  detail: string;
  video: Video | null;
};

export type SaveState = "idle" | "saving" | "saved" | "draft";

// ─── Gamification ─────────────────────────────────────────────────────────────

export type UnlockedAchievement = {
  id: string;
  unlockedAt: string; // ISO date string
};

export type CreatorProgress = {
  achievements: UnlockedAchievement[];
};

export type AchievementDef = {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  check: (videos: Video[], ctx: AchievementContext) => boolean;
};

export type AchievementContext = {
  streak: number;
  weeklyPublished: number;
  weeklyGoal: number;
  publishedCount: number;
};
