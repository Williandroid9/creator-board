import { useEffect, useMemo, useState } from "react";
import type { Channel, Video } from "../types";
import { isYouTubeApiSource } from "../lib/dataSource";
import { buildOnlineSyncPreview, type OnlineSyncPreview } from "../lib/onlineSync";
import {
  fetchYouTubeConnectedChannels,
  fetchYouTubeOnlineSync,
  requestYouTubeAccessToken,
  DEFAULT_YOUTUBE_CLIENT_ID,
  YOUTUBE_CLIENT_ID_KEY,
  type YouTubeOnlineChannel,
  type YouTubeOnlineSync,
  type YouTubeOnlineVideo,
} from "../lib/youtubeApi";
import { Button, Field, Pill, SelectInput, TextInput } from "./ui";

type YouTubeOnlinePanelProps = {
  channels: Channel[];
  videos: Video[];
  preferredChannelId?: string;
  onSync: (
    channelId: string,
    channelName: string,
    youtubeChannelId: string,
    videos: YouTubeOnlineVideo[],
    sourceLabel: string,
    skipped?: number,
  ) => { updated: number; created: number };
  onClearSync: (channelId: string, channelName: string, removeCreated: boolean) => { cleared: number; removed: number };
};

function loadClientId() {
  try {
    return localStorage.getItem(YOUTUBE_CLIENT_ID_KEY) || DEFAULT_YOUTUBE_CLIENT_ID;
  } catch {
    return DEFAULT_YOUTUBE_CLIENT_ID;
  }
}

function normalizeName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function YouTubeOnlinePanel({ channels, videos, preferredChannelId, onSync, onClearSync }: YouTubeOnlinePanelProps) {
  const [clientId, setClientId] = useState(loadClientId);
  const [selectedChannelId, setSelectedChannelId] = useState(() => channels[0]?.id || "");
  const [targetMode, setTargetMode] = useState<"google" | "selected">("google");
  const [periodDays, setPeriodDays] = useState("90");
  const [accessToken, setAccessToken] = useState("");
  const [googleChannels, setGoogleChannels] = useState<YouTubeOnlineChannel[]>([]);
  const [selectedGoogleChannelId, setSelectedGoogleChannelId] = useState("");
  const [syncData, setSyncData] = useState<YouTubeOnlineSync | null>(null);
  const [preview, setPreview] = useState<OnlineSyncPreview | null>(null);
  const [selectedVideoIds, setSelectedVideoIds] = useState<Set<string>>(() => new Set());
  const [statusMessage, setStatusMessage] = useState("");
  const [removeCreatedOnline, setRemoveCreatedOnline] = useState(false);
  const [clearResult, setClearResult] = useState<{ cleared: number; removed: number } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (channels.length && !channels.some((channel) => channel.id === selectedChannelId)) {
      setSelectedChannelId(channels[0].id);
    }
  }, [channels, selectedChannelId]);

  useEffect(() => {
    if (preferredChannelId && channels.some((channel) => channel.id === preferredChannelId)) {
      setSelectedChannelId(preferredChannelId);
      setTargetMode("selected");
    }
  }, [channels, preferredChannelId]);

  useEffect(() => {
    try {
      localStorage.setItem(YOUTUBE_CLIENT_ID_KEY, clientId.trim());
    } catch (error) {
      console.warn("Nao foi possivel salvar o Client ID do YouTube.", error);
    }
  }, [clientId]);

  const selectedChannel = channels.find((channel) => channel.id === selectedChannelId) || channels[0] || null;
  const runningFromFile = typeof window !== "undefined" && window.location.protocol === "file:";
  const readyForOAuth = Boolean(clientId.trim()) && !runningFromFile;
  const selectedRows = useMemo(
    () => (preview ? preview.items.filter((item) => selectedVideoIds.has(item.row.videoId)).map((item) => item.row) : []),
    [preview, selectedVideoIds],
  );
  const canSync = readyForOAuth && Boolean(accessToken);
  const selectedGoogleChannel =
    googleChannels.find((channel) => channel.id === selectedGoogleChannelId) ||
    syncData?.channel ||
    googleChannels[0] ||
    null;
  const googleChannelId = selectedGoogleChannel?.id || "";
  const googleChannelTitle = selectedGoogleChannel?.title || "";
  const googleMatchedChannel = useMemo(
    () =>
      channels.find(
        (channel) =>
          (googleChannelId && channel.youtubeChannelId === googleChannelId) ||
          (googleChannelTitle && normalizeName(channel.name) === normalizeName(googleChannelTitle)),
      ) || null,
    [channels, googleChannelId, googleChannelTitle],
  );
  const activeChannelId = targetMode === "google" ? googleMatchedChannel?.id || "" : selectedChannel?.id || "";
  const activeChannelName =
    targetMode === "google"
      ? googleChannelTitle || googleMatchedChannel?.name || selectedChannel?.name || ""
      : selectedChannel?.name || googleChannelTitle || "";
  const selectedMismatch = Boolean(
    syncData?.channel &&
      targetMode === "selected" &&
      selectedChannel &&
      ((selectedChannel.youtubeChannelId && selectedChannel.youtubeChannelId !== syncData.channel.id) ||
        (!selectedChannel.youtubeChannelId && normalizeName(selectedChannel.name) !== normalizeName(syncData.channel.title))),
  );
  const onlineCount = useMemo(
    () =>
      videos.filter((video) => {
        const belongs = activeChannelId
          ? video.channelId === activeChannelId || video.channel === activeChannelName
          : activeChannelName && video.channel === activeChannelName;

        return belongs && isYouTubeApiSource(video);
      }).length,
    [activeChannelId, activeChannelName, videos],
  );
  const onlineCreatedCount = useMemo(
    () =>
      videos.filter((video) => {
        const belongs = activeChannelId
          ? video.channelId === activeChannelId || video.channel === activeChannelName
          : activeChannelName && video.channel === activeChannelName;

        return belongs && isYouTubeApiSource(video) && video.studioCreatedFromOnline;
      }).length,
    [activeChannelId, activeChannelName, videos],
  );
  const status = useMemo(() => {
    if (accessToken) {
      return "Canal autorizado";
    }

    if (runningFromFile) {
      return "Precisa abrir pelo servidor local";
    }

    if (!clientId.trim()) {
      return "Falta OAuth Client ID";
    }

    return "Pronto para conectar";
  }, [accessToken, clientId, runningFromFile]);

  async function connectChannel() {
    if (!readyForOAuth) {
      return;
    }

    setBusy(true);
    setStatusMessage("Abrindo login do Google...");
    try {
      const token = await requestYouTubeAccessToken(clientId.trim());
      setAccessToken(token);
      const discoveredChannels = await fetchYouTubeConnectedChannels(token);
      setGoogleChannels(discoveredChannels);
      setSelectedGoogleChannelId(discoveredChannels[0]?.id || "");
      setStatusMessage(
        discoveredChannels.length > 1
          ? "Acesso autorizado. Escolha qual canal sincronizar."
          : "Acesso autorizado. Agora voce pode buscar uma previa.",
      );
    } catch (error) {
      setAccessToken("");
      setStatusMessage(error instanceof Error ? error.message : "Nao foi possivel conectar ao YouTube.");
    } finally {
      setBusy(false);
    }
  }

  async function syncNow() {
    if (!accessToken) {
      setStatusMessage("Conecte o canal antes de sincronizar.");
      return;
    }

    setBusy(true);
    setStatusMessage("Buscando dados online do YouTube...");
    try {
      const result = await fetchYouTubeOnlineSync(accessToken, Number(periodDays) || 90, selectedGoogleChannelId);
      setGoogleChannels(result.availableChannels);
      setSelectedGoogleChannelId(result.channel?.id || selectedGoogleChannelId);
      setSyncData(result);
      const nextPreview = buildOnlineSyncPreview(videos, result.videos);
      setPreview(nextPreview);
      setSelectedVideoIds(
        new Set(
          nextPreview.items
            .filter((item) => item.action !== "possible_duplicate")
            .map((item) => item.row.videoId),
        ),
      );
      setClearResult(null);
      setStatusMessage("Revise os videos encontrados antes de aplicar.");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Nao foi possivel sincronizar o YouTube.");
    } finally {
      setBusy(false);
    }
  }

  function applySelectedSync() {
    if (!syncData || !preview) {
      setStatusMessage("Busque uma previa antes de aplicar.");
      return;
    }

    if (!selectedRows.length) {
      setStatusMessage("Selecione pelo menos um video para importar.");
      return;
    }

    const skipped = preview.items.length - selectedRows.length;
    const channelId = targetMode === "selected" ? selectedChannel?.id || "" : "";
    const channelName =
      targetMode === "selected"
        ? selectedChannel?.name || syncData.channel?.title || "Canal conectado"
        : syncData.channel?.title || selectedChannel?.name || "Canal conectado";
    const saved = onSync(channelId, channelName, googleChannelId || syncData.channel?.id || "", selectedRows, `YouTube API ${periodDays}d`, skipped);
    setPreview(null);
    setSelectedVideoIds(new Set());
    setStatusMessage(
      `Sincronizacao aplicada: ${saved.updated} atualizado${saved.updated === 1 ? "" : "s"}, ${saved.created} criado${saved.created === 1 ? "" : "s"} e ${skipped} ignorado${skipped === 1 ? "" : "s"}.`,
    );
  }

  function togglePreviewItem(videoId: string) {
    setSelectedVideoIds((current) => {
      const next = new Set(current);
      if (next.has(videoId)) {
        next.delete(videoId);
      } else {
        next.add(videoId);
      }
      return next;
    });
  }

  function clearOnlineData() {
    const channelName = activeChannelName.trim();
    if (!channelName) {
      setStatusMessage("Escolha ou sincronize um canal antes de limpar dados online.");
      return;
    }

    const detail = removeCreatedOnline && onlineCreatedCount
      ? `Tambem serao removidos ${onlineCreatedCount} card${onlineCreatedCount === 1 ? "" : "s"} criado${onlineCreatedCount === 1 ? "" : "s"} pela API.`
      : "Os cards serao mantidos; apenas metricas e marcacoes da API serao apagadas.";
    const confirmed = window.confirm(`Limpar dados online do YouTube para "${channelName}"?\n\n${detail}`);

    if (!confirmed) {
      return;
    }

    const result = onClearSync(activeChannelId, channelName, removeCreatedOnline);
    setClearResult(result);
    setSyncData(null);
    setAccessToken("");
    setStatusMessage(`Dados online limpos: ${result.cleared} mantidos, ${result.removed} removidos.`);
  }

  return (
    <section className="clean-panel rounded-2xl p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
          <p className="mb-1 text-xs font-black uppercase text-aqua">Conexao online</p>
          <h2 className="text-xl font-black sm:text-2xl">Conectar canal do YouTube</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Use o login do Google para buscar metricas do YouTube Analytics e atualizar o canal ativo sem planilhas.
          </p>
        </div>
        <Pill className="border-slate-700/60 bg-white/[0.04] text-slate-300">{status}</Pill>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="grid gap-4">
          <Field label="Canal para conectar">
            {channels.length ? (
              <SelectInput value={selectedChannel?.id || ""} onChange={(event) => setSelectedChannelId(event.target.value)}>
                {channels.map((channel) => (
                  <option key={channel.id} value={channel.id}>
                    {channel.name}
                  </option>
                ))}
              </SelectInput>
            ) : (
              <TextInput value="O Google detecta o canal no login" disabled />
            )}
          </Field>

          {googleChannels.length ? (
            <Field label="Canal encontrado no Google">
              <SelectInput value={selectedGoogleChannelId} onChange={(event) => setSelectedGoogleChannelId(event.target.value)}>
                {googleChannels.map((channel) => (
                  <option key={channel.id} value={channel.id}>
                    {channel.title}
                  </option>
                ))}
              </SelectInput>
            </Field>
          ) : null}

          <Field label="Destino da sincronizacao">
            <SelectInput value={targetMode} onChange={(event) => setTargetMode(event.target.value as "google" | "selected")}>
              <option value="google">Usar canal detectado pelo Google</option>
              <option value="selected" disabled={!selectedChannel}>
                Vincular ao canal selecionado
              </option>
            </SelectInput>
          </Field>

          <Field label="Periodo de analise">
            <SelectInput value={periodDays} onChange={(event) => setPeriodDays(event.target.value)}>
              <option value="28">Ultimos 28 dias</option>
              <option value="90">Ultimos 90 dias</option>
              <option value="180">Ultimos 180 dias</option>
              <option value="365">Ultimos 365 dias</option>
            </SelectInput>
          </Field>

          <Field label="OAuth Client ID do Google">
            <TextInput
              value={clientId}
              onChange={(event) => setClientId(event.target.value)}
              placeholder="Cole aqui o Client ID do projeto Google Cloud"
            />
          </Field>

          <div className="flex flex-wrap gap-2">
            <Button disabled={!readyForOAuth || busy} onClick={connectChannel}>
              Conectar canal
            </Button>
            <Button variant="primary" disabled={!canSync || busy} onClick={syncNow}>
              Buscar previa
            </Button>
            <Button disabled={!preview || !selectedRows.length || busy} onClick={applySelectedSync}>
              Aplicar selecionados
            </Button>
            <a
              className="btn btn-ghost text-sm"
              href="https://console.cloud.google.com/apis/credentials"
              target="_blank"
              rel="noreferrer"
            >
              Google Cloud
            </a>
          </div>

          {statusMessage ? (
            <p className="rounded-xl bg-white/[0.045] p-3 text-sm font-bold text-slate-300">{statusMessage}</p>
          ) : null}

          {selectedMismatch ? (
            <p className="rounded-xl border border-amber-300/25 bg-amber-300/10 p-3 text-sm font-bold text-amber-100">
              O Google detectou "{googleChannelTitle}", mas o canal selecionado parece diferente. Use "canal detectado pelo Google"
              para evitar misturar dados.
            </p>
          ) : null}

          {preview ? (
            <div className="rounded-xl border border-slate-700/45 bg-black/18 p-4">
              <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase text-aqua">Revisao antes de importar</p>
                  <h3 className="mt-1 text-base font-black text-white">{preview.items.length} videos encontrados</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Pill className="border-emerald-300/20 bg-emerald-300/10 text-emerald-100">
                    {preview.updateCount} atualiza
                  </Pill>
                  <Pill className="border-aqua/20 bg-aqua/10 text-aqua">{preview.createCount} cria</Pill>
                  <Pill className="border-amber-300/20 bg-amber-300/10 text-amber-100">
                    {preview.possibleDuplicateCount} revisar
                  </Pill>
                </div>
              </div>

              <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                {preview.items.map((item) => {
                  const checked = selectedVideoIds.has(item.row.videoId);
                  const actionLabel =
                    item.action === "update"
                      ? `Atualizar por ${item.matchBy === "videoId" ? "ID" : "titulo"}`
                      : item.action === "possible_duplicate"
                        ? "Possivel duplicado"
                        : "Criar novo";

                  return (
                    <label key={item.row.videoId} className="flex gap-3 rounded-lg bg-white/[0.045] p-3 text-sm">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => togglePreviewItem(item.row.videoId)}
                        className="mt-1 h-4 w-4 shrink-0 accent-aqua"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="line-clamp-1 font-black text-white">{item.row.title}</span>
                        <span className="mt-1 block text-xs font-bold text-slate-500">
                          {actionLabel} / {item.row.views || 0} views
                          {item.row.contentType ? ` / ${item.row.contentType}` : ""}
                          {item.row.impressions ? ` / ${item.row.impressions} impressoes` : ""}
                          {item.row.ctr ? ` / CTR ${item.row.ctr}%` : ""}
                          {item.video ? ` / existente: ${item.video.title}` : ""}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="rounded-xl border border-slate-700/45 bg-black/18 p-4">
            <p className="text-xs font-black uppercase text-slate-500">Limpeza online</p>
            <h3 className="mt-1 text-base font-black text-white">Apagar dados da API deste canal</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              <Pill className="border-slate-700/60 bg-white/[0.04] text-slate-300">
                {onlineCount} com dados online
              </Pill>
              <Pill className="border-slate-700/60 bg-white/[0.04] text-slate-300">
                {onlineCreatedCount} criados pela API
              </Pill>
            </div>
            <label className="mt-3 flex items-start gap-3 rounded-lg bg-white/[0.04] p-3 text-sm font-semibold text-slate-300">
              <input
                type="checkbox"
                checked={removeCreatedOnline}
                onChange={(event) => setRemoveCreatedOnline(event.target.checked)}
                className="mt-1 h-4 w-4 shrink-0 accent-aqua"
              />
              <span>Remover tambem cards criados automaticamente pela API</span>
            </label>
            <Button
              className="mt-3 w-full"
              variant="danger"
              disabled={!activeChannelName || !onlineCount || busy}
              onClick={clearOnlineData}
            >
              Limpar dados online
            </Button>
            {clearResult ? (
              <p className="mt-3 rounded-lg bg-emerald-300/10 p-3 text-sm font-bold text-emerald-100">
                Limpeza feita: {clearResult.cleared} mantidos sem API, {clearResult.removed} removidos.
              </p>
            ) : null}
          </div>
        </div>

        <div className="rounded-xl bg-black/18 p-4">
          <p className="text-xs font-black uppercase text-slate-500">Status da conexao</p>
          <div className="mt-3 grid gap-3 text-sm leading-6 text-slate-400">
            <p>
              Conecte um canal, busque uma previa e aplique apenas os videos que deseja trazer para o Creator Board.
            </p>
            <p>
              Se tiver mais de um canal, conecte um por vez e salve cada perfil na lista de canais conectados.
            </p>
            {syncData?.channel ? (
              <div className="rounded-lg bg-white/[0.045] p-3">
                <p className="text-xs font-black uppercase text-slate-500">Canal autorizado</p>
                <p className="mt-1 font-black text-slate-100">{syncData.channel.title}</p>
                <p className="mt-1 text-xs font-bold text-slate-500">
                  {syncData.channel.subscribers || "-"} inscritos / {syncData.channel.videoCount || "-"} videos / {googleChannelId}
                </p>
              </div>
            ) : null}
            {syncData?.videos.length ? (
              <div className="rounded-lg bg-white/[0.045] p-3">
                <p className="text-xs font-black uppercase text-slate-500">Ultima sincronizacao</p>
                <p className="mt-1 font-black text-slate-100">{syncData.videos.length} videos importados da API</p>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
