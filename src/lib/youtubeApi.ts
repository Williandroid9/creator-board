export type YouTubeOnlineVideo = {
  videoId: string;
  title: string;
  url: string;
  publishedAt: string;
  contentType: string;
  impressions: string;
  ctr: string;
  views: string;
  avgDuration: string;
  retention: string;
  watchTimeHours: string;
  subscribers: string;
};

export type YouTubeOnlineChannel = {
  id: string;
  title: string;
  views: string;
  subscribers: string;
  videoCount: string;
};

export type YouTubeOnlineSync = {
  channel: YouTubeOnlineChannel | null;
  availableChannels: YouTubeOnlineChannel[];
  videos: YouTubeOnlineVideo[];
};

export type YouTubeMarketVideo = {
  videoId: string;
  title: string;
  url: string;
  channelId: string;
  channelTitle: string;
  publishedAt: string;
  views: number;
  likes: number;
  comments: number;
  durationSeconds: number;
  durationLabel: string;
  subscribers: number;
  thumbnailUrl: string;
  viewerComments: string[];
};

export type YouTubeMarketScan = {
  query: string;
  days: number;
  searchedAt: string;
  demand: "Baixa" | "Media" | "Alta";
  pressure: "Baixa" | "Media" | "Alta";
  opportunity: "Oceano azul" | "Boa janela" | "Competitivo" | "Saturado";
  recommendation: string;
  averageViews: number;
  averageDurationSeconds: number;
  bigChannelPosts: number;
  totalVideos: number;
  titleTerms: Array<{ term: string; count: number }>;
  videos: YouTubeMarketVideo[];
  differentiationAngles: string[];
  viewerComplaints: string[];
};

const GIS_SCRIPT_ID = "google-identity-services";
const THREE_MINUTE_SHORTS_START = "2024-10-15";
let googleIdentityScriptPromise: Promise<void> | null = null;
export const YOUTUBE_CLIENT_ID_KEY = "creator-board-youtube-client-id-v1";
export const DEFAULT_YOUTUBE_CLIENT_ID =
  import.meta.env.VITE_YOUTUBE_CLIENT_ID || "238276840626-5h0b0d1k0l6fpgbj0uifm3rb930odkmp.apps.googleusercontent.com";
export const YOUTUBE_OAUTH_SCOPES = [
  "https://www.googleapis.com/auth/youtube.readonly",
  "https://www.googleapis.com/auth/yt-analytics.readonly",
].join(" ");

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            prompt?: string;
            callback: (response: { access_token?: string; error?: string; error_description?: string }) => void;
            error_callback?: (error: { type?: string; message?: string }) => void;
          }) => { requestAccessToken: (options?: { prompt?: string }) => void };
        };
      };
    };
  }
}

export function isGoogleIdentityReady() {
  return Boolean(window.google?.accounts?.oauth2);
}

export function preloadGoogleIdentityScript() {
  return loadGoogleIdentityScript();
}

function loadGoogleIdentityScript() {
  if (isGoogleIdentityReady()) {
    return Promise.resolve();
  }

  if (googleIdentityScriptPromise) {
    return googleIdentityScriptPromise;
  }

  googleIdentityScriptPromise = new Promise<void>((resolve, reject) => {
    if (window.google?.accounts?.oauth2) {
      resolve();
      return;
    }

    const existing = document.getElementById(GIS_SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      let attempts = 0;
      const waitForGoogle = () => {
        if (isGoogleIdentityReady()) {
          resolve();
          return;
        }

        attempts += 1;
        if (attempts > 50) {
          reject(new Error("Login do Google demorou para carregar. Recarregue a pagina e tente de novo."));
          return;
        }

        window.setTimeout(waitForGoogle, 100);
      };

      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Nao foi possivel carregar o login do Google.")), {
        once: true,
      });
      waitForGoogle();
      return;
    }

    const script = document.createElement("script");
    script.id = GIS_SCRIPT_ID;
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.addEventListener(
      "load",
      () => {
        let attempts = 0;
        const waitForGoogle = () => {
          if (isGoogleIdentityReady()) {
            resolve();
            return;
          }

          attempts += 1;
          if (attempts > 50) {
            reject(new Error("Login do Google demorou para carregar. Recarregue a pagina e tente de novo."));
            return;
          }

          window.setTimeout(waitForGoogle, 100);
        };

        waitForGoogle();
      },
      { once: true },
    );
    script.addEventListener(
      "error",
      () => {
        googleIdentityScriptPromise = null;
        reject(new Error("Nao foi possivel carregar o login do Google."));
      },
      {
        once: true,
      },
    );
    document.head.appendChild(script);
  });

  return googleIdentityScriptPromise;
}

export async function requestYouTubeAccessToken(clientId: string) {
  await loadGoogleIdentityScript();

  return new Promise<string>((resolve, reject) => {
    const oauth = window.google?.accounts?.oauth2;
    if (!oauth) {
      reject(new Error("Login do Google indisponivel neste navegador."));
      return;
    }

    const tokenClient = oauth.initTokenClient({
      client_id: clientId,
      scope: YOUTUBE_OAUTH_SCOPES,
      prompt: "consent",
      callback: (response) => {
        if (response.error || !response.access_token) {
          reject(new Error(response.error_description || response.error || "Acesso ao YouTube negado."));
          return;
        }

        resolve(response.access_token);
      },
      error_callback: (error) => {
        const detail = error.message || error.type || "";
        const popupBlocked = /popup|window|failed/i.test(detail);
        reject(
          new Error(
            popupBlocked
              ? "O navegador bloqueou a janela de login. Permita pop-ups para este site, recarregue a pagina e clique em Conectar canal novamente."
              : detail || "Falha ao abrir o login do Google.",
          ),
        );
      },
    });

    tokenClient.requestAccessToken({ prompt: "consent" });
  });
}

async function apiGet<T>(url: string, accessToken: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(details || `YouTube API respondeu ${response.status}.`);
  }

  return response.json() as Promise<T>;
}

function localDate(daysAgo: number) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}

function formatDuration(seconds: unknown) {
  const value = Math.round(Number(seconds) || 0);
  const minutes = Math.floor(value / 60);
  const rest = value % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

function formatDecimal(value: unknown, digits = 1) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed.toFixed(digits).replace(/\.0$/, "") : "";
}

function durationToSeconds(value: string) {
  const match = value.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!match) {
    return 0;
  }

  return Number(match[1] || 0) * 3600 + Number(match[2] || 0) * 60 + Number(match[3] || 0);
}

function formatDurationFromSeconds(seconds: number) {
  const value = Math.max(0, Math.round(seconds || 0));
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  const rest = value % 60;

  if (hours) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
  }

  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

function classifyContentType(seconds: number, publishedAt: string) {
  if (!seconds) {
    return "";
  }

  const publishDate = publishedAt.slice(0, 10);
  const shortsLimit = publishDate >= THREE_MINUTE_SHORTS_START ? 180 : 60;
  return seconds <= shortsLimit ? "Shorts" : "Longo";
}

function columnIndex(headers: Array<{ name: string }>, name: string) {
  return headers.findIndex((header) => header.name === name);
}

export async function fetchYouTubeConnectedChannels(accessToken: string): Promise<YouTubeOnlineChannel[]> {
  const channelResponse = await apiGet<{
    items?: Array<{
      id: string;
      snippet?: { title?: string };
      statistics?: { viewCount?: string; subscriberCount?: string; videoCount?: string };
    }>;
  }>(
    "https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true",
    accessToken,
  );

  return (channelResponse.items || []).map((item) => ({
    id: item.id,
    title: item.snippet?.title || "Canal conectado",
    views: item.statistics?.viewCount || "",
    subscribers: item.statistics?.subscriberCount || "",
    videoCount: item.statistics?.videoCount || "",
  }));
}

export async function fetchYouTubeOnlineSync(
  accessToken: string,
  days = 90,
  selectedChannelId = "",
): Promise<YouTubeOnlineSync> {
  const availableChannels = await fetchYouTubeConnectedChannels(accessToken);
  const channel =
    availableChannels.find((item) => item.id === selectedChannelId) ||
    availableChannels[0] ||
    null;

  const endDate = localDate(0);
  const startDate = localDate(days);
  const metrics = [
    "views",
    "estimatedMinutesWatched",
    "averageViewDuration",
    "averageViewPercentage",
    "subscribersGained",
  ].join(",");
  const analyticsUrl = new URL("https://youtubeanalytics.googleapis.com/v2/reports");
  analyticsUrl.searchParams.set("ids", "channel==MINE");
  analyticsUrl.searchParams.set("startDate", startDate);
  analyticsUrl.searchParams.set("endDate", endDate);
  analyticsUrl.searchParams.set("metrics", metrics);
  analyticsUrl.searchParams.set("dimensions", "video");
  analyticsUrl.searchParams.set("sort", "-views");
  analyticsUrl.searchParams.set("maxResults", "50");

  const analytics = await apiGet<{
    columnHeaders?: Array<{ name: string }>;
    rows?: Array<Array<string | number>>;
  }>(analyticsUrl.toString(), accessToken);
  const headers = analytics.columnHeaders || [];
  const rows = analytics.rows || [];
  const videoIndex = columnIndex(headers, "video");
  const viewsIndex = columnIndex(headers, "views");
  const watchIndex = columnIndex(headers, "estimatedMinutesWatched");
  const durationIndex = columnIndex(headers, "averageViewDuration");
  const retentionIndex = columnIndex(headers, "averageViewPercentage");
  const subscribersIndex = columnIndex(headers, "subscribersGained");
  const videoIds = rows.map((row) => String(row[videoIndex] || "")).filter(Boolean);

  const discoveryMap = new Map<string, { impressions: string; ctr: string }>();
  try {
    const discoveryUrl = new URL("https://youtubeanalytics.googleapis.com/v2/reports");
    discoveryUrl.searchParams.set("ids", "channel==MINE");
    discoveryUrl.searchParams.set("startDate", startDate);
    discoveryUrl.searchParams.set("endDate", endDate);
    discoveryUrl.searchParams.set("metrics", "impressions,impressionsClickThroughRate");
    discoveryUrl.searchParams.set("dimensions", "video");
    discoveryUrl.searchParams.set("sort", "-impressions");
    discoveryUrl.searchParams.set("maxResults", "50");
    const discovery = await apiGet<{
      columnHeaders?: Array<{ name: string }>;
      rows?: Array<Array<string | number>>;
    }>(discoveryUrl.toString(), accessToken);
    const discoveryHeaders = discovery.columnHeaders || [];
    const discoveryVideoIndex = columnIndex(discoveryHeaders, "video");
    const impressionsIndex = columnIndex(discoveryHeaders, "impressions");
    const ctrIndex = columnIndex(discoveryHeaders, "impressionsClickThroughRate");

    for (const row of discovery.rows || []) {
      const videoId = String(row[discoveryVideoIndex] || "");
      if (videoId) {
        discoveryMap.set(videoId, {
          impressions: String(row[impressionsIndex] || ""),
          ctr: formatDecimal(row[ctrIndex], 2),
        });
      }
    }
  } catch (error) {
    console.warn("Metricas de impressoes/CTR indisponiveis nesta conta ou periodo.", error);
  }

  const detailMap = new Map<string, { title: string; publishedAt: string; contentType: string }>();
  for (let index = 0; index < videoIds.length; index += 50) {
    const chunk = videoIds.slice(index, index + 50);
    const videosResponse = await apiGet<{
      items?: Array<{ id: string; snippet?: { title?: string; publishedAt?: string }; contentDetails?: { duration?: string } }>;
    }>(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${encodeURIComponent(chunk.join(","))}`,
      accessToken,
    );

    for (const item of videosResponse.items || []) {
      const duration = durationToSeconds(item.contentDetails?.duration || "");
      const publishedAt = item.snippet?.publishedAt ? item.snippet.publishedAt.slice(0, 10) : "";
      detailMap.set(item.id, {
        title: item.snippet?.title || item.id,
        publishedAt,
        contentType: classifyContentType(duration, publishedAt),
      });
    }
  }

  return {
    channel,
    availableChannels,
    videos: rows.map((row) => {
      const videoId = String(row[videoIndex] || "");
      const detail = detailMap.get(videoId);
      const watchMinutes = Number(row[watchIndex] || 0);
      const discovery = discoveryMap.get(videoId);

      return {
        videoId,
        title: detail?.title || videoId,
        url: `https://www.youtube.com/watch?v=${videoId}`,
        publishedAt: detail?.publishedAt || "",
        contentType: detail?.contentType || "",
        impressions: discovery?.impressions || "",
        ctr: discovery?.ctr || "",
        views: String(row[viewsIndex] || ""),
        avgDuration: formatDuration(row[durationIndex]),
        retention: formatDecimal(row[retentionIndex]),
        watchTimeHours: watchMinutes ? formatDecimal(watchMinutes / 60, 1) : "",
        subscribers: String(row[subscribersIndex] || ""),
      };
    }),
  };
}

const MARKET_STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "as",
  "best",
  "com",
  "como",
  "da",
  "de",
  "do",
  "dos",
  "em",
  "for",
  "from",
  "games",
  "how",
  "mais",
  "melhor",
  "no",
  "of",
  "on",
  "para",
  "pc",
  "que",
  "the",
  "to",
  "video",
  "with",
  "you",
  "your",
]);

function numberValue(value: unknown) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function publishedAfter(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - Math.max(1, days || 14));
  return date.toISOString();
}

function titleTerms(videos: YouTubeMarketVideo[]) {
  const counts = new Map<string, number>();

  for (const video of videos) {
    const terms = video.title
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .split(/[^a-z0-9]+/i)
      .map((term) => term.trim())
      .filter((term) => term.length > 2 && !MARKET_STOP_WORDS.has(term));

    for (const term of terms) {
      counts.set(term, (counts.get(term) || 0) + 1);
    }
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 12)
    .map(([term, count]) => ({ term, count }));
}

function detectViewerComplaints(comments: string[]) {
  const complaintPattern =
    /\b(faltou|lento|devagar|chato|errado|erro|bug|mentira|missing|forgot|slow|boring|wrong|fake|not work|doesn't work|didn't|should have|where is|no mention)\b/i;

  return comments
    .map((comment) => comment.replace(/\s+/g, " ").trim())
    .filter((comment) => complaintPattern.test(comment))
    .slice(0, 8);
}

function buildDifferentiationAngles(scan: {
  demand: "Baixa" | "Media" | "Alta";
  pressure: "Baixa" | "Media" | "Alta";
  titleTerms: Array<{ term: string; count: number }>;
  complaints: string[];
  averageDurationSeconds: number;
}) {
  const terms = scan.titleTerms.slice(0, 4).map((item) => item.term).join(", ");
  const angles = [
    scan.pressure === "Alta"
      ? "Mude o angulo: os grandes canais ja tocaram no tema. Foque em recorte especifico, lista menor ou promessa mais pratica."
      : "Entre rapido: a competicao recente ainda nao dominou o tema.",
    terms ? `Evite copiar as palavras mais repetidas nos titulos: ${terms}. Use uma promessa oposta ou mais especifica.` : "",
    scan.averageDurationSeconds
      ? `Duracao media dos concorrentes: ${formatDurationFromSeconds(scan.averageDurationSeconds)}. Diferencie com roteiro mais direto nos primeiros 30 segundos.`
      : "",
    scan.complaints.length
      ? "Use as reclamacoes dos comentarios como vantagem no roteiro: entregue logo o que os concorrentes deixaram faltando."
      : "Sem reclamacoes fortes encontradas. Diferencie pela promessa e pela estrutura.",
  ];

  return angles.filter(Boolean).slice(0, 5);
}

export async function fetchYouTubeMarketScan(
  accessToken: string,
  query: string,
  days = 14,
): Promise<YouTubeMarketScan> {
  const cleanQuery = query.trim();
  if (!cleanQuery) {
    throw new Error("Digite um tema para pesquisar no YouTube.");
  }

  const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
  searchUrl.searchParams.set("part", "snippet");
  searchUrl.searchParams.set("type", "video");
  searchUrl.searchParams.set("q", cleanQuery);
  searchUrl.searchParams.set("order", "relevance");
  searchUrl.searchParams.set("publishedAfter", publishedAfter(days));
  searchUrl.searchParams.set("maxResults", "25");

  const search = await apiGet<{
    items?: Array<{
      id?: { videoId?: string };
    }>;
  }>(searchUrl.toString(), accessToken);
  const videoIds = (search.items || []).map((item) => item.id?.videoId || "").filter(Boolean);

  if (!videoIds.length) {
    return {
      query: cleanQuery,
      days,
      searchedAt: new Date().toISOString(),
      demand: "Baixa",
      pressure: "Baixa",
      opportunity: "Oceano azul",
      recommendation: "Nenhum video relevante encontrado no periodo. Pode ser uma lacuna, mas valide com um termo mais amplo.",
      averageViews: 0,
      averageDurationSeconds: 0,
      bigChannelPosts: 0,
      totalVideos: 0,
      titleTerms: [],
      videos: [],
      differentiationAngles: ["Teste uma promessa mais ampla antes de gravar, porque o termo exato retornou pouco sinal."],
      viewerComplaints: [],
    };
  }

  const videosUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
  videosUrl.searchParams.set("part", "snippet,statistics,contentDetails");
  videosUrl.searchParams.set("id", videoIds.join(","));
  videosUrl.searchParams.set("maxResults", "50");
  const videosResponse = await apiGet<{
    items?: Array<{
      id: string;
      snippet?: {
        title?: string;
        channelId?: string;
        channelTitle?: string;
        publishedAt?: string;
        thumbnails?: { medium?: { url?: string }; high?: { url?: string }; default?: { url?: string } };
      };
      statistics?: { viewCount?: string; likeCount?: string; commentCount?: string };
      contentDetails?: { duration?: string };
    }>;
  }>(videosUrl.toString(), accessToken);

  const channelIds = [...new Set((videosResponse.items || []).map((item) => item.snippet?.channelId || "").filter(Boolean))];
  const channelSubs = new Map<string, number>();
  for (let index = 0; index < channelIds.length; index += 50) {
    const chunk = channelIds.slice(index, index + 50);
    const channelsUrl = new URL("https://www.googleapis.com/youtube/v3/channels");
    channelsUrl.searchParams.set("part", "statistics");
    channelsUrl.searchParams.set("id", chunk.join(","));
    const channelsResponse = await apiGet<{
      items?: Array<{ id: string; statistics?: { subscriberCount?: string } }>;
    }>(channelsUrl.toString(), accessToken);

    for (const item of channelsResponse.items || []) {
      channelSubs.set(item.id, numberValue(item.statistics?.subscriberCount));
    }
  }

  const marketVideos: YouTubeMarketVideo[] = (videosResponse.items || [])
    .map((item) => {
      const durationSeconds = durationToSeconds(item.contentDetails?.duration || "");
      const channelId = item.snippet?.channelId || "";

      return {
        videoId: item.id,
        title: item.snippet?.title || item.id,
        url: `https://www.youtube.com/watch?v=${item.id}`,
        channelId,
        channelTitle: item.snippet?.channelTitle || "Canal",
        publishedAt: item.snippet?.publishedAt ? item.snippet.publishedAt.slice(0, 10) : "",
        views: numberValue(item.statistics?.viewCount),
        likes: numberValue(item.statistics?.likeCount),
        comments: numberValue(item.statistics?.commentCount),
        durationSeconds,
        durationLabel: formatDurationFromSeconds(durationSeconds),
        subscribers: channelSubs.get(channelId) || 0,
        thumbnailUrl:
          item.snippet?.thumbnails?.high?.url ||
          item.snippet?.thumbnails?.medium?.url ||
          item.snippet?.thumbnails?.default?.url ||
          "",
        viewerComments: [],
      };
    })
    .sort((a, b) => b.views - a.views);

  const commentsByVideo = new Map<string, string[]>();
  for (const video of marketVideos.slice(0, 5)) {
    try {
      const commentsUrl = new URL("https://www.googleapis.com/youtube/v3/commentThreads");
      commentsUrl.searchParams.set("part", "snippet");
      commentsUrl.searchParams.set("videoId", video.videoId);
      commentsUrl.searchParams.set("maxResults", "20");
      commentsUrl.searchParams.set("order", "relevance");
      commentsUrl.searchParams.set("textFormat", "plainText");
      const commentsResponse = await apiGet<{
        items?: Array<{ snippet?: { topLevelComment?: { snippet?: { textDisplay?: string; textOriginal?: string } } } }>;
      }>(commentsUrl.toString(), accessToken);
      commentsByVideo.set(
        video.videoId,
        (commentsResponse.items || [])
          .map((item) => item.snippet?.topLevelComment?.snippet?.textOriginal || item.snippet?.topLevelComment?.snippet?.textDisplay || "")
          .filter(Boolean),
      );
    } catch {
      commentsByVideo.set(video.videoId, []);
    }
  }

  const videosWithComments = marketVideos.map((video) => ({
    ...video,
    viewerComments: commentsByVideo.get(video.videoId) || [],
  }));
  const totalViews = videosWithComments.reduce((sum, video) => sum + video.views, 0);
  const averageViews = videosWithComments.length ? totalViews / videosWithComments.length : 0;
  const averageDurationSeconds = videosWithComments.length
    ? videosWithComments.reduce((sum, video) => sum + video.durationSeconds, 0) / videosWithComments.length
    : 0;
  const bigChannelPosts = videosWithComments.filter((video) => video.subscribers >= 100000 || video.views >= 50000).length;
  const demand: YouTubeMarketScan["demand"] =
    averageViews >= 50000 || videosWithComments[0]?.views >= 150000 || videosWithComments.length >= 20
      ? "Alta"
      : averageViews >= 10000 || videosWithComments.length >= 10
        ? "Media"
        : "Baixa";
  const pressure: YouTubeMarketScan["pressure"] =
    bigChannelPosts >= 5 ? "Alta" : bigChannelPosts >= 2 ? "Media" : "Baixa";
  const opportunity: YouTubeMarketScan["opportunity"] =
    demand === "Alta" && pressure === "Baixa"
      ? "Oceano azul"
      : demand !== "Baixa" && pressure === "Media"
        ? "Boa janela"
        : pressure === "Alta"
          ? "Saturado"
          : "Competitivo";
  const recommendation =
    opportunity === "Oceano azul"
      ? "Alto interesse recente e pouca competicao forte. Grave agora antes dos canais grandes chegarem."
      : opportunity === "Boa janela"
        ? "Existe demanda, mas alguns canais fortes ja entraram. Grave com um recorte mais especifico."
        : opportunity === "Saturado"
          ? `Pressao alta: ${bigChannelPosts} canais grandes ou videos fortes apareceram nos ultimos ${days} dias. Espere, mude o angulo ou ataque uma subnicho.`
          : "Sinal moderado. Use como teste ou combine com outro tema validado do canal.";
  const terms = titleTerms(videosWithComments);
  const allComments = videosWithComments.flatMap((video) => video.viewerComments);
  const complaints = detectViewerComplaints(allComments);

  return {
    query: cleanQuery,
    days,
    searchedAt: new Date().toISOString(),
    demand,
    pressure,
    opportunity,
    recommendation,
    averageViews,
    averageDurationSeconds,
    bigChannelPosts,
    totalVideos: videosWithComments.length,
    titleTerms: terms,
    videos: videosWithComments.slice(0, 10),
    differentiationAngles: buildDifferentiationAngles({
      demand,
      pressure,
      titleTerms: terms,
      complaints,
      averageDurationSeconds,
    }),
    viewerComplaints: complaints,
  };
}
