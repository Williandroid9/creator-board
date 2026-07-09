import { useCallback, type Dispatch, type SetStateAction } from "react";
import type { AppData, ChannelDraft, Video } from "../types";
import { normalizeChannel, normalizeChannelName } from "../lib/channel";
import { extractYouTubeId, normalizeTitleKey } from "../lib/onlineSync";
import { isYouTubeApiSource } from "../lib/dataSource";
import { cleanDecimalMetric, cleanIntegerMetric, cleanPercentMetric } from "../lib/metrics";
import { makeId, normalizeVideo } from "../lib/video";
import type { YouTubeOnlineVideo } from "../lib/youtubeApi";
import { stampData, type ConfirmDialogState } from "./appHelpers";

// Ações de canal e sincronização com o YouTube, extraídas do AppProvider para
// enxugar o god-object. O contrato exposto por useApp() permanece idêntico.
type ChannelActionsDeps = {
  data: AppData;
  setData: Dispatch<SetStateAction<AppData>>;
  setToast: (message: string) => void;
  setConfirmDialog: Dispatch<SetStateAction<ConfirmDialogState | null>>;
};

export function useChannelActions({ data, setData, setToast, setConfirmDialog }: ChannelActionsDeps) {
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
  }, [setData, setToast]);

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
    [data.channels, setData, setToast],
  );

  const deleteChannel = useCallback(
    (id: string) => {
      const channel = data.channels.find((c) => c.id === id);
      const linkedCount = data.videos.filter((v) => v.channelId === id).length;
      setConfirmDialog({
        title: `Excluir "${channel?.name || "este canal"}"?`,
        message: linkedCount
          ? `${linkedCount} video${linkedCount === 1 ? "" : "s"} vinculado${linkedCount === 1 ? "" : "s"} ser${linkedCount === 1 ? "á" : "ão"} desvinculado${linkedCount === 1 ? "" : "s"} (os cards são mantidos).`
          : "Esta ação não pode ser desfeita.",
        confirmLabel: "Excluir canal",
        onConfirm: () => {
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
          setConfirmDialog(null);
        },
      });
    },
    [data.channels, data.videos, setConfirmDialog, setData, setToast],
  );

  const disconnectChannel = useCallback(
    (id: string) => {
      const channel = data.channels.find((c) => c.id === id);
      setConfirmDialog({
        title: `Desconectar "${channel?.name || "este canal"}" da conta online?`,
        message: "Os cards e dados salvos serão mantidos. Você pode reconectar quando quiser.",
        confirmLabel: "Desconectar",
        onConfirm: () => {
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
          setConfirmDialog(null);
        },
      });
    },
    [data.channels, setConfirmDialog, setData, setToast],
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
    [data.channels, data.videos, setData, setToast],
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
    [data.videos, setData, setToast],
  );

  return { saveChannel, saveChannels, deleteChannel, disconnectChannel, syncYouTubeOnline, clearYouTubeOnlineSync };
}
