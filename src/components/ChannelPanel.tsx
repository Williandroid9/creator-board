import { useMemo, useState, type FormEvent } from "react";
import type { Channel, ChannelDraft, SyncHistoryItem, Video } from "../types";
import type { YouTubeOnlineVideo } from "../lib/youtubeApi";
import { isYouTubeApiSource } from "../lib/dataSource";
import { isSameWeek } from "../lib/date";
import { EMPTY_CHANNEL, normalizeChannelDraft } from "../lib/channel";
import { getPublishDate } from "../lib/video";
import { YouTubeOnlinePanel } from "./YouTubeOnlinePanel";
import { Button, Field, Pill, TextArea, TextInput, cx } from "./ui";

type ChannelPanelProps = {
  channels: Channel[];
  videos: Video[];
  syncHistory: SyncHistoryItem[];
  activeChannelId: string;
  onActiveChannelChange: (channelId: string) => void;
  onSave: (draft: ChannelDraft) => void;
  onSaveMany: (drafts: ChannelDraft[]) => void;
  onOpenInsights: (channelId: string) => void;
  onOpenPerformance: (channelId: string) => void;
  onDisconnect: (id: string) => void;
  onDelete: (id: string) => void;
  onYouTubeOnlineSync: (
    channelId: string,
    channelName: string,
    youtubeChannelId: string,
    videos: YouTubeOnlineVideo[],
    sourceLabel: string,
    skipped?: number,
  ) => { updated: number; created: number };
  onClearYouTubeOnlineSync: (channelId: string, channelName: string, removeCreated: boolean) => { cleared: number; removed: number };
};

function blankDraft(): ChannelDraft {
  return normalizeChannelDraft(EMPTY_CHANNEL);
}

function parseBulkChannels(value: string, fallbackNiche: string) {
  return value
    .split(/\r?\n|;/)
    .flatMap((line) => (line.includes("|") ? [line] : line.split(",")))
    .map((line) => {
      const [name = "", niche = "", url = ""] = line.split("|").map((part) => part.trim());

      return {
        name,
        niche: niche || fallbackNiche,
        url,
      };
    })
    .filter((item) => item.name);
}

type ChannelStats = {
  averageCtr: number;
  averageViews: number;
  inProduction: number;
  onlineImported: number;
  published: number;
  total: number;
};

const EMPTY_CHANNEL_STATS: ChannelStats = {
  averageCtr: 0,
  averageViews: 0,
  inProduction: 0,
  onlineImported: 0,
  published: 0,
  total: 0,
};

function metricNumber(value: string) {
  const normalized = String(value || "")
    .trim()
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".")
    .replace(/[^\d.]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function average(values: number[]) {
  const valid = values.filter((value) => value > 0);
  return valid.length ? valid.reduce((total, value) => total + value, 0) / valid.length : 0;
}

function formatCompactNumber(value: number) {
  if (!value) {
    return "-";
  }

  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: value >= 1000 ? 1 : 0,
    notation: value >= 10000 ? "compact" : "standard",
  }).format(value);
}

function formatPercent(value: number) {
  if (!value) {
    return "-";
  }

  return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(value)}%`;
}

function daysSince(value: string) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) {
    return null;
  }

  return Math.floor((Date.now() - date.getTime()) / 86400000);
}

function getConnectionHealth(channel: Channel, lastSync: SyncHistoryItem | undefined) {
  if (!channel.youtubeChannelId) {
    return {
      label: "Manual",
      detail: "Perfil separado, sem API",
      className: "border-slate-700/60 bg-white/[0.04] text-slate-400",
    };
  }

  const syncDate = channel.lastSyncedAt || lastSync?.syncedAt || "";
  const days = daysSince(syncDate);

  if (days === null) {
    return {
      label: "Conectado",
      detail: "Aguardando primeira sync",
      className: "border-amber-300/25 bg-amber-300/10 text-amber-100",
    };
  }

  if (days <= 7) {
    return {
      label: "Saudavel",
      detail: days === 0 ? "Sync hoje" : `Sync ha ${days} dias`,
      className: "border-aqua/20 bg-aqua/10 text-aqua",
    };
  }

  if (days <= 30) {
    return {
      label: "Atualizar",
      detail: `Sync ha ${days} dias`,
      className: "border-amber-300/25 bg-amber-300/10 text-amber-100",
    };
  }

  return {
    label: "Sync antigo",
    detail: `Sync ha ${days} dias`,
    className: "border-red-300/25 bg-red-400/10 text-red-100",
  };
}

function ChannelCard({
  channel,
  active,
  stats,
  publishedWeek,
  lastSync,
  onActive,
  onAnalyze,
  onPublished,
  onEdit,
  onSync,
  onDisconnect,
  onDelete,
}: {
  channel: Channel;
  active: boolean;
  stats: ChannelStats;
  publishedWeek: number;
  lastSync: SyncHistoryItem | undefined;
  onActive: () => void;
  onAnalyze: () => void;
  onPublished: () => void;
  onEdit: () => void;
  onSync: () => void;
  onDisconnect: () => void;
  onDelete: () => void;
}) {
  const health = getConnectionHealth(channel, lastSync);

  return (
    <article
      className={cx(
        "rounded-xl border bg-[#111722] p-4",
        active ? "border-aqua/35 ring-1 ring-aqua/20" : "border-slate-700/35",
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-black text-white">{channel.name}</h3>
          <p className="mt-1 truncate text-xs font-bold text-slate-500">{channel.niche || "Sem nicho definido"}</p>
        </div>
        <Pill className={health.className}>{health.label}</Pill>
      </div>

      <div className="mb-3 grid grid-cols-3 gap-2">
        <MiniMetric label="Videos" value={String(stats.total)} />
        <MiniMetric label="Publicados" value={String(stats.published)} />
        <MiniMetric label="Semana" value={`${publishedWeek}/${channel.weeklyGoal}`} />
        <MiniMetric label="Media views" value={formatCompactNumber(stats.averageViews)} />
        <MiniMetric label="Media CTR" value={formatPercent(stats.averageCtr)} />
        <MiniMetric label="API" value={String(stats.onlineImported)} />
      </div>

      <div className="mb-3 rounded-lg bg-white/[0.035] px-3 py-2 text-xs font-bold text-slate-500">
        <p className="truncate">{health.detail}</p>
        {lastSync ? (
          <p className="mt-1 truncate">
            Ultima acao: {lastSync.updated} atualizados / {lastSync.created} criados
          </p>
        ) : null}
      </div>

      <p className="line-clamp-2 min-h-[3rem] text-sm leading-6 text-slate-300">
        {channel.promise || channel.audience || channel.notes || "Complete o perfil estrategico deste canal."}
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button
          className="min-h-9 px-3 text-xs"
          variant={active ? "primary" : "ghost"}
          onClick={onActive}
        >
          {active ? "Ativo" : "Tornar ativo"}
        </Button>
        <Button className="min-h-9 px-3 text-xs" onClick={onAnalyze}>
          Ver analise
        </Button>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Button className="min-h-8 px-3 text-xs" onClick={onPublished}>
          Publicados
        </Button>
        <Button className="min-h-8 px-3 text-xs" onClick={onSync}>
          {channel.youtubeChannelId ? "Sincronizar" : "Conectar"}
        </Button>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Button className="min-h-8 px-3 text-xs" onClick={onEdit}>
          Editar
        </Button>
        <Button className="min-h-8 px-3 text-xs" disabled={!channel.youtubeChannelId} onClick={onDisconnect}>
          Desconectar
        </Button>
      </div>
      <div className="mt-2">
        <Button className="min-h-8 w-full px-3 text-xs" variant="danger" onClick={onDelete}>
          Excluir
        </Button>
      </div>
      {channel.url && (
        <a className="mt-2 block truncate text-xs font-bold text-aqua" href={channel.url} target="_blank" rel="noreferrer">
          Abrir canal
        </a>
      )}
    </article>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg bg-black/18 px-2 py-2">
      <p className="truncate text-[0.62rem] font-black uppercase text-slate-600">{label}</p>
      <p className="mt-1 truncate text-xs font-black text-white">{value}</p>
    </div>
  );
}

export function ChannelPanel({
  channels,
  videos,
  syncHistory,
  activeChannelId,
  onActiveChannelChange,
  onSave,
  onSaveMany,
  onOpenInsights,
  onOpenPerformance,
  onDisconnect,
  onDelete,
  onYouTubeOnlineSync,
  onClearYouTubeOnlineSync,
}: ChannelPanelProps) {
  const [draft, setDraft] = useState<ChannelDraft>(() => blankDraft());
  const [editorOpen, setEditorOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkNiche, setBulkNiche] = useState("");
  const [bulkError, setBulkError] = useState("");
  const [syncTargetId, setSyncTargetId] = useState("");

  const videoCountByChannel = useMemo(() => {
    const counts = new Map<string, number>();
    const publishedWeek = new Map<string, number>();
    for (const video of videos) {
      if (video.channelId) {
        counts.set(video.channelId, (counts.get(video.channelId) || 0) + 1);
        if (video.status === "Publicado" && isSameWeek(getPublishDate(video))) {
          publishedWeek.set(video.channelId, (publishedWeek.get(video.channelId) || 0) + 1);
        }
      }
    }
    return { total: counts, publishedWeek };
  }, [videos]);
  const lastSyncByChannel = useMemo(() => {
    const map = new Map<string, SyncHistoryItem>();
    for (const item of syncHistory) {
      if (item.channelId && !map.has(item.channelId)) {
        map.set(item.channelId, item);
      }
    }
    return map;
  }, [syncHistory]);
  const channelStatsById = useMemo(() => {
    const map = new Map<string, ChannelStats>();

    for (const channel of channels) {
      const channelVideos = videos.filter(
        (video) => video.channelId === channel.id || (!video.channelId && video.channel === channel.name),
      );
      const published = channelVideos.filter((video) => video.status === "Publicado");
      const averageViews = average(published.map((video) => metricNumber(video.studioViews || video.views24h)));
      const averageCtr = average(published.map((video) => metricNumber(video.ctr)));

      map.set(channel.id, {
        averageCtr,
        averageViews,
        inProduction: channelVideos.filter((video) => !["Ideia", "Publicado"].includes(video.status)).length,
        onlineImported: channelVideos.filter(isYouTubeApiSource).length,
        published: published.length,
        total: channelVideos.length,
      });
    }

    return map;
  }, [channels, videos]);
  const connectedCount = channels.filter((channel) => channel.youtubeChannelId).length;
  const activeChannel = channels.find((channel) => channel.id === activeChannelId) || null;
  const connectedChannels = channels.filter((channel) => channel.youtubeChannelId);
  const manualChannels = channels.filter((channel) => !channel.youtubeChannelId);
  const channelsNeedingSync = channels.filter((channel) => {
    const health = getConnectionHealth(channel, lastSyncByChannel.get(channel.id));
    return channel.youtubeChannelId && health.label !== "Saudavel";
  }).length;
  const onlineImportedTotal = videos.filter(isYouTubeApiSource).length;
  const activeChannelStats = activeChannel ? channelStatsById.get(activeChannel.id) || EMPTY_CHANNEL_STATS : null;
  const activeChannelHealth = activeChannel ? getConnectionHealth(activeChannel, lastSyncByChannel.get(activeChannel.id)) : null;

  function setField<K extends keyof ChannelDraft>(field: K, value: ChannelDraft[K]) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const prepared = normalizeChannelDraft(draft);
    if (!prepared.name.trim()) {
      return;
    }

    onSave(prepared);
    setDraft(blankDraft());
    setEditorOpen(false);
  }

  function submitBulk(event: FormEvent) {
    event.preventDefault();
    const parsed = parseBulkChannels(bulkText, bulkNiche.trim());

    if (!parsed.length) {
      setBulkError("Digite pelo menos um canal.");
      return;
    }

    onSaveMany(
      parsed.map((item) =>
        normalizeChannelDraft({
          ...EMPTY_CHANNEL,
          name: item.name,
          niche: item.niche,
          url: item.url,
          weeklyGoal: 2,
        }),
      ),
    );
    setBulkText("");
    setBulkNiche("");
    setBulkError("");
    setBulkOpen(false);
  }

  function edit(channel: Channel) {
    setDraft(normalizeChannelDraft(channel));
    setEditorOpen(true);
  }

  function focusSync(channelId: string) {
    setSyncTargetId(channelId);
    onActiveChannelChange(channelId);
    window.requestAnimationFrame(() => {
      document.getElementById("youtube-connect-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  return (
    <section className="space-y-5">
      <div className="clean-panel rounded-2xl p-5">
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mb-1 text-xs font-black uppercase text-aqua">Canais</p>
          <h2 className="text-xl font-black sm:text-2xl">Canais conectados</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
            Conecte, alterne e sincronize cada canal do YouTube sem depender de planilhas.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={() => document.getElementById("youtube-connect-panel")?.scrollIntoView({ behavior: "smooth", block: "start" })}>
            + Conectar YouTube
          </Button>
          <Button
            variant={editorOpen ? "ghost" : "ghost"}
            onClick={() => {
              if (editorOpen) {
                setDraft(blankDraft());
                setEditorOpen(false);
              } else {
                setEditorOpen(true);
                setBulkOpen(false);
              }
            }}
          >
            {editorOpen ? "Fechar perfil" : "+ Perfil manual"}
          </Button>
          <Button
            onClick={() => {
              setBulkOpen((current) => !current);
              setEditorOpen(false);
            }}
          >
            + Varios canais
          </Button>
        </div>
      </div>

      <div className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl bg-white/[0.045] p-4">
          <p className="text-xs font-black uppercase text-slate-500">Canal ativo</p>
          <p className="mt-2 line-clamp-1 text-base font-black text-white">{activeChannel?.name || "Todos os canais"}</p>
        </div>
        <div className="rounded-xl bg-white/[0.045] p-4">
          <p className="text-xs font-black uppercase text-slate-500">Conectados</p>
          <p className="mt-2 text-base font-black text-white">{connectedCount}/{channels.length}</p>
        </div>
        <div className="rounded-xl bg-white/[0.045] p-4">
          <p className="text-xs font-black uppercase text-slate-500">Precisam sync</p>
          <p className="mt-2 text-base font-black text-white">{channelsNeedingSync}</p>
        </div>
        <div className="rounded-xl bg-white/[0.045] p-4">
          <p className="text-xs font-black uppercase text-slate-500">Videos via API</p>
          <p className="mt-2 text-base font-black text-white">{onlineImportedTotal}</p>
        </div>
      </div>

      {channels.length ? (
        <div className="mb-5 rounded-xl border border-slate-400/10 bg-black/18 p-3">
          <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase text-slate-500">Troca rapida</p>
              <p className="text-sm font-semibold text-slate-400">Clique em um canal para filtrar todo o app.</p>
            </div>
            <Button className="min-h-9 px-3 text-xs" onClick={() => onActiveChannelChange("all")}>
              Ver todos
            </Button>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {channels.map((channel) => {
              const health = getConnectionHealth(channel, lastSyncByChannel.get(channel.id));
              const active = activeChannelId === channel.id;

              return (
                <button
                  key={channel.id}
                  type="button"
                  className={cx(
                    "min-w-[13rem] rounded-xl border px-3 py-3 text-left transition",
                    active
                      ? "border-aqua/35 bg-aqua/10"
                      : "border-slate-700/45 bg-white/[0.035] hover:bg-white/[0.06]",
                  )}
                  onClick={() => onActiveChannelChange(channel.id)}
                >
                  <span className="block truncate text-sm font-black text-white">{channel.name}</span>
                  <span className="mt-1 flex items-center justify-between gap-2 text-xs font-bold text-slate-500">
                    <span className="truncate">{channel.niche || "Sem nicho"}</span>
                    <span className={cx("shrink-0 rounded-full border px-2 py-0.5", health.className)}>
                      {health.label}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {activeChannel && activeChannelStats && activeChannelHealth ? (
        <div className="mb-5 rounded-xl border border-aqua/20 bg-aqua/5 p-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase text-aqua">Canal ativo agora</p>
              <h3 className="mt-1 truncate text-xl font-black text-white">{activeChannel.name}</h3>
              <p className="mt-1 line-clamp-2 text-sm font-semibold leading-6 text-slate-400">
                {activeChannel.promise || activeChannel.audience || activeChannel.niche || "Complete o perfil estrategico para melhorar analises."}
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-4 xl:w-[34rem]">
              <MiniMetric label="Total" value={String(activeChannelStats.total)} />
              <MiniMetric label="Publicados" value={String(activeChannelStats.published)} />
              <MiniMetric label="Producao" value={String(activeChannelStats.inProduction)} />
              <MiniMetric label="Status" value={activeChannelHealth.label} />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="primary" onClick={() => focusSync(activeChannel.id)}>
              {activeChannel.youtubeChannelId ? "Sincronizar agora" : "Conectar YouTube"}
            </Button>
            <Button onClick={() => onOpenInsights(activeChannel.id)}>Ver crescimento</Button>
            <Button onClick={() => onOpenPerformance(activeChannel.id)}>Ver publicados</Button>
            <Button onClick={() => edit(activeChannel)}>Editar perfil</Button>
          </div>
        </div>
      ) : null}

      {bulkOpen && (
        <form className="mb-5 grid gap-3 rounded-xl bg-white/[0.045] p-4 lg:grid-cols-[minmax(0,1fr)_280px_180px]" onSubmit={submitBulk}>
          <Field label="Canais separados" className="lg:row-span-2">
            <TextArea
              rows={5}
              value={bulkText}
              onChange={(event) => {
                setBulkText(event.target.value);
                setBulkError("");
              }}
              placeholder={"Canal 1\nCanal 2\nCanal 3\n\nOu: Canal 1 | Nicho | https://youtube.com/@canal"}
            />
          </Field>
          <Field label="Nicho padrao">
            <TextInput
              value={bulkNiche}
              onChange={(event) => setBulkNiche(event.target.value)}
              placeholder="Ex: Educacao, Games..."
            />
          </Field>
          <div className="flex items-end">
            <Button className="w-full" variant="primary" type="submit">
              Criar canais
            </Button>
          </div>
          <p className={cx("text-sm font-semibold", bulkError ? "text-red-200" : "text-slate-500")}>
            {bulkError || "Use uma linha por canal. Para detalhar, use: Nome | Nicho | Link."}
          </p>
        </form>
      )}

      {editorOpen && (
        <form className="mb-5 grid gap-3 rounded-xl bg-white/[0.045] p-4 lg:grid-cols-4" onSubmit={submit}>
          <Field label="Nome" className="lg:col-span-2">
            <TextInput required value={draft.name} onChange={(event) => setField("name", event.target.value)} />
          </Field>
          <Field label="Link">
            <TextInput type="url" value={draft.url} onChange={(event) => setField("url", event.target.value)} placeholder="https://youtube.com/..." />
          </Field>
          <Field label="ID do canal YouTube">
            <TextInput value={draft.youtubeChannelId} onChange={(event) => setField("youtubeChannelId", event.target.value)} placeholder="UC..." />
          </Field>
          <Field label="Nicho">
            <TextInput value={draft.niche} onChange={(event) => setField("niche", event.target.value)} />
          </Field>
          <Field label="Meta semanal">
            <TextInput
              type="number"
              min="1"
              value={draft.weeklyGoal}
              onChange={(event) => setField("weeklyGoal", Number(event.target.value) || 1)}
            />
          </Field>
          <Field label="Publico-alvo" className="lg:col-span-2">
            <TextInput value={draft.audience} onChange={(event) => setField("audience", event.target.value)} placeholder="Quem o canal quer atrair?" />
          </Field>
          <Field label="Promessa do canal" className="lg:col-span-2">
            <TextInput value={draft.promise} onChange={(event) => setField("promise", event.target.value)} placeholder="Qual transformacao o canal entrega?" />
          </Field>
          <Field label="Pilares de conteudo" className="lg:col-span-2">
            <TextArea rows={3} value={draft.pillars} onChange={(event) => setField("pillars", event.target.value)} placeholder="Temas fixos, series, quadros..." />
          </Field>
          <Field label="Formatos principais" className="lg:col-span-2">
            <TextArea rows={3} value={draft.formats} onChange={(event) => setField("formats", event.target.value)} placeholder="Tutorial, react, review, shorts..." />
          </Field>
          <Field label="Frequencia">
            <TextInput value={draft.postingFrequency} onChange={(event) => setField("postingFrequency", event.target.value)} placeholder="Ex: 3 videos/semana" />
          </Field>
          <Field label="Palavras-chave">
            <TextInput value={draft.keywords} onChange={(event) => setField("keywords", event.target.value)} placeholder="termos principais" />
          </Field>
          <Field label="Concorrentes/referencias" className="lg:col-span-2">
            <TextInput value={draft.competitors} onChange={(event) => setField("competitors", event.target.value)} placeholder="canais separados por virgula" />
          </Field>
          <Field label="Observacoes" className="lg:col-span-3">
            <TextArea rows={3} value={draft.notes} onChange={(event) => setField("notes", event.target.value)} />
          </Field>
          <div className="flex items-end gap-2">
            {draft.id && (
              <Button className="flex-1" onClick={() => setDraft(blankDraft())}>
                Limpar
              </Button>
            )}
            <Button className="flex-1" variant="primary" type="submit">
              {draft.id ? "Atualizar" : "Salvar"}
            </Button>
          </div>
        </form>
      )}

      {channels.length ? (
        <div className="space-y-5">
          {connectedChannels.length ? (
            <div>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-sm font-black uppercase text-slate-400">Conectados ao YouTube</h3>
                <Pill className="border-aqua/20 bg-aqua/10 text-aqua">{connectedChannels.length}</Pill>
              </div>
              <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
                {connectedChannels.map((channel) => (
                  <ChannelCard
                    key={channel.id}
                    channel={channel}
                    active={activeChannelId === channel.id}
                    stats={channelStatsById.get(channel.id) || EMPTY_CHANNEL_STATS}
                    publishedWeek={videoCountByChannel.publishedWeek.get(channel.id) || 0}
                    lastSync={lastSyncByChannel.get(channel.id)}
                    onActive={() => onActiveChannelChange(channel.id)}
                    onAnalyze={() => onOpenInsights(channel.id)}
                    onPublished={() => onOpenPerformance(channel.id)}
                    onSync={() => focusSync(channel.id)}
                    onEdit={() => edit(channel)}
                    onDisconnect={() => onDisconnect(channel.id)}
                    onDelete={() => onDelete(channel.id)}
                  />
                ))}
              </div>
            </div>
          ) : null}

          {manualChannels.length ? (
            <div>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-sm font-black uppercase text-slate-400">Perfis separados</h3>
                <Pill className="border-slate-700/60 bg-white/[0.04] text-slate-300">{manualChannels.length}</Pill>
              </div>
              <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
                {manualChannels.map((channel) => (
                  <ChannelCard
                    key={channel.id}
                    channel={channel}
                    active={activeChannelId === channel.id}
                    stats={channelStatsById.get(channel.id) || EMPTY_CHANNEL_STATS}
                    publishedWeek={videoCountByChannel.publishedWeek.get(channel.id) || 0}
                    lastSync={lastSyncByChannel.get(channel.id)}
                    onActive={() => onActiveChannelChange(channel.id)}
                    onAnalyze={() => onOpenInsights(channel.id)}
                    onPublished={() => onOpenPerformance(channel.id)}
                    onSync={() => focusSync(channel.id)}
                    onEdit={() => edit(channel)}
                    onDisconnect={() => onDisconnect(channel.id)}
                    onDelete={() => onDelete(channel.id)}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-700/70 p-6 text-sm font-semibold text-slate-500">
          Nenhum canal conectado. Use Conectar YouTube para trazer o primeiro canal; depois voce podera tornar ativo,
          sincronizar ou desconectar cada perfil.
        </div>
      )}
      </div>

      <div id="youtube-connect-panel">
        <YouTubeOnlinePanel
          channels={channels}
          videos={videos}
          preferredChannelId={syncTargetId}
          onSync={onYouTubeOnlineSync}
          onClearSync={onClearYouTubeOnlineSync}
        />
      </div>
    </section>
  );
}
