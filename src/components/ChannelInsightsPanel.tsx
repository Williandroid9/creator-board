import { useMemo, useState } from "react";
import type { Channel, Video, VideoDraft } from "../types";
import { EMPTY_VIDEO } from "../lib/video";
import { AssetSnowballPanel } from "./AssetSnowballPanel";
import { Button, Pill, cx } from "./ui";

type ChannelInsightsPanelProps = {
  channels: Channel[];
  videos: Video[];
  onOpenVideo: (video: Video) => void;
  onCreateIdea: (draft: VideoDraft) => void;
};

type TopicIdea = {
  title: string;
  keyword: string;
  source: string;
};

type RepeatSignal = {
  label: string;
  value: string;
  detail: string;
};

const WEEKDAYS = ["Domingo", "Segunda", "Terca", "Quarta", "Quinta", "Sexta", "Sabado"];

const STOP_WORDS = new Set([
  "a",
  "agora",
  "ao",
  "aos",
  "as",
  "com",
  "como",
  "da",
  "das",
  "de",
  "do",
  "dos",
  "e",
  "em",
  "esse",
  "essa",
  "este",
  "esta",
  "eu",
  "isso",
  "mais",
  "meu",
  "minha",
  "na",
  "nas",
  "no",
  "nos",
  "o",
  "os",
  "ou",
  "para",
  "por",
  "que",
  "se",
  "seu",
  "sua",
  "um",
  "uma",
  "voce",
  "video",
]);

function splitList(value: string) {
  return value
    .split(/[\n,;|]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function metricNumber(value: string) {
  const normalized = String(value || "").replace(",", ".").replace(/[^\d.]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function videoViews(video: Video) {
  return metricNumber(video.studioViews || video.views24h);
}

function durationSeconds(value: string) {
  const parts = String(value || "")
    .trim()
    .split(":")
    .map((part) => Number(part));

  if (!parts.length || parts.some((part) => Number.isNaN(part))) {
    return 0;
  }

  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }

  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }

  return parts[0];
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(value || 0);
}

function formatDecimal(value: number, suffix = "") {
  if (!value) {
    return "--";
  }

  return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(value)}${suffix}`;
}

function normalizeTerm(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function topTerms(videos: Video[]) {
  const counts = new Map<string, number>();

  for (const video of videos) {
    const source = [video.title, video.keyword, video.seoTitle, video.seoNotes].join(" ");
    const terms = source
      .split(/[^\p{L}\p{N}]+/u)
      .map(normalizeTerm)
      .filter((term) => term.length > 2 && !STOP_WORDS.has(term));

    for (const term of terms) {
      counts.set(term, (counts.get(term) || 0) + 1);
    }
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "pt-BR"))
    .slice(0, 10)
    .map(([term, count]) => ({ term, count }));
}

function weightedTopTerms(videos: Video[]) {
  const counts = new Map<string, number>();

  for (const video of videos) {
    const weight = Math.max(1, Math.round(videoViews(video) / 100));
    const source = [video.title, video.keyword, video.seoTitle, video.seoNotes].join(" ");
    const terms = source
      .split(/[^\p{L}\p{N}]+/u)
      .map(normalizeTerm)
      .filter((term) => term.length > 2 && !STOP_WORDS.has(term));

    for (const term of terms) {
      counts.set(term, (counts.get(term) || 0) + weight);
    }
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "pt-BR"))
    .slice(0, 8)
    .map(([term, score]) => ({ term, score }));
}

function bestWeekday(videos: Video[]) {
  const buckets = new Map<number, { views: number; count: number }>();

  for (const video of videos) {
    const date = video.publishedAt || video.plannedDate;
    const views = videoViews(video);

    if (!date || !views) {
      continue;
    }

    const day = new Date(`${date}T12:00:00`).getDay();
    const current = buckets.get(day) || { views: 0, count: 0 };
    buckets.set(day, { views: current.views + views, count: current.count + 1 });
  }

  const ranked = [...buckets.entries()]
    .map(([day, item]) => ({ day, average: item.views / item.count, count: item.count }))
    .sort((a, b) => b.average - a.average);

  return ranked[0] || null;
}

function bestHour(videos: Video[]) {
  const buckets = new Map<string, { views: number; count: number }>();

  for (const video of videos) {
    const hour = video.studioPublishedHour;
    const views = videoViews(video);

    if (!hour || !views) {
      continue;
    }

    const current = buckets.get(hour) || { views: 0, count: 0 };
    buckets.set(hour, { views: current.views + views, count: current.count + 1 });
  }

  const ranked = [...buckets.entries()]
    .map(([hour, item]) => ({ hour, average: item.views / item.count, count: item.count }))
    .sort((a, b) => b.average - a.average);

  return ranked[0] || null;
}

function buildTopicIdeas(channel: Channel, videos: Video[]) {
  const topPublished = [...videos]
    .filter((video) => video.status === "Publicado")
    .sort((a, b) => videoViews(b) - videoViews(a))
    .slice(0, 5);
  const pillars = splitList(channel.pillars || channel.niche || channel.promise).slice(0, 5);
  const formats = splitList(channel.formats).slice(0, 4);
  const weightedTerms = weightedTopTerms(topPublished.length ? topPublished : videos).map((item) => item.term);
  const keywords = [...splitList(channel.keywords), ...weightedTerms, ...topTerms(videos).map((item) => item.term)].slice(0, 8);
  const basePillars = pillars.length ? pillars : [channel.niche || "conteudo do canal"];
  const baseFormats = formats.length ? formats : ["Tutorial", "Lista", "Analise"];
  const baseKeywords = keywords.length ? keywords : basePillars;
  const ideas: TopicIdea[] = [];

  for (const pillar of basePillars) {
    ideas.push({
      title: `Guia rapido: ${pillar}`,
      keyword: baseKeywords[ideas.length % baseKeywords.length] || pillar,
      source: "Pilar",
    });
  }

  for (const keyword of baseKeywords) {
    ideas.push({
      title: `5 erros sobre ${keyword}`,
      keyword,
      source: "Historico",
    });
  }

  for (const video of topPublished) {
    const keyword = weightedTopTerms([video])[0]?.term || video.keyword || baseKeywords[0] || channel.niche || "tema";
    ideas.push({
      title: `Nova abordagem: ${keyword}`,
      keyword,
      source: "Video forte",
    });
  }

  for (const format of baseFormats) {
    const pillar = basePillars[ideas.length % basePillars.length] || channel.niche || "tema";
    ideas.push({
      title: `${format}: ${pillar}`,
      keyword: baseKeywords[ideas.length % baseKeywords.length] || pillar,
      source: "Formato",
    });
  }

  const seen = new Set<string>();
  return ideas
    .filter((idea) => {
      const key = normalizeTerm(idea.title);
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .slice(0, 9);
}

function buildRepeatSignals(topVideos: Video[], terms: Array<{ term: string; count: number }>, bestDay: string, bestHour: string): RepeatSignal[] {
  const bestVideo = topVideos[0];
  const bestTerm = terms[0]?.term || "";
  const secondTerm = terms[1]?.term || "";

  return [
    {
      label: "Tema para repetir",
      value: bestTerm || "Dados insuficientes",
      detail: secondTerm ? `Combine com ${secondTerm} para variar o angulo.` : "Preencha ou sincronize mais titulos para melhorar a leitura.",
    },
    {
      label: "Referencia interna",
      value: bestVideo?.title || "Sem video forte",
      detail: bestVideo ? `${formatNumber(videoViews(bestVideo))} views como base de comparacao.` : "Sincronize videos publicados para descobrir referencias.",
    },
    {
      label: "Janela de publicacao",
      value: bestHour !== "Dados insuficientes" ? bestHour : bestDay,
      detail: bestHour !== "Dados insuficientes" ? `Priorize esse horario e teste variacoes proximas.` : "Sem horario suficiente; use o melhor dia por enquanto.",
    },
  ];
}

function buildRetentionGroups(videos: Video[]) {
  const ranked = [...videos]
    .filter((video) => video.status === "Publicado")
    .sort((a, b) => videoViews(b) - videoViews(a));
  const averageViews = ranked.length ? ranked.reduce((sum, video) => sum + videoViews(video), 0) / ranked.length : 0;
  const highRetention = ranked.filter((video) => metricNumber(video.studioRetention) >= 45).slice(0, 3);
  const viewGoodRetentionWeak = ranked
    .filter((video) => videoViews(video) >= averageViews && metricNumber(video.studioRetention) > 0 && metricNumber(video.studioRetention) < 35)
    .slice(0, 3);
  const remakeCandidates = ranked.filter((video) => videoViews(video) >= averageViews).slice(0, 3);

  return { highRetention, viewGoodRetentionWeak, remakeCandidates };
}

function StatCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-xl border border-slate-700/35 bg-[#111722] p-4">
      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-black text-white">{value}</p>
      <p className="mt-1 text-xs font-semibold text-slate-500">{detail}</p>
    </div>
  );
}

export function ChannelInsightsPanel({ channels, videos, onOpenVideo, onCreateIdea }: ChannelInsightsPanelProps) {
  const [selectedChannelId, setSelectedChannelId] = useState(() => channels[0]?.id || "");

  const selectedChannel = useMemo(
    () => channels.find((channel) => channel.id === selectedChannelId) || channels[0] || null,
    [channels, selectedChannelId],
  );

  const channelVideos = useMemo(() => {
    if (!selectedChannel) {
      return [];
    }

    return videos.filter(
      (video) =>
        !video.archived &&
        (video.channelId === selectedChannel.id || (!video.channelId && video.channel === selectedChannel.name)),
    );
  }, [selectedChannel, videos]);

  const publishedVideos = useMemo(
    () => channelVideos.filter((video) => video.status === "Publicado"),
    [channelVideos],
  );

  const performance = useMemo(() => {
    const imported = publishedVideos.filter((video) => video.studioImportedAt);
    const views = publishedVideos.map(videoViews).filter(Boolean);
    const ctr = publishedVideos.map((video) => metricNumber(video.ctr)).filter(Boolean);
    const duration = publishedVideos.map((video) => durationSeconds(video.avgDuration)).filter(Boolean);
    const impressions = publishedVideos.map((video) => metricNumber(video.studioImpressions)).filter(Boolean);
    const retention = publishedVideos.map((video) => metricNumber(video.studioRetention)).filter(Boolean);
    const weekday = bestWeekday(publishedVideos);
    const hour = bestHour(publishedVideos);

    return {
      importedCount: imported.length,
      averageViews: views.length ? views.reduce((sum, item) => sum + item, 0) / views.length : 0,
      averageCtr: ctr.length ? ctr.reduce((sum, item) => sum + item, 0) / ctr.length : 0,
      averageDuration: duration.length ? duration.reduce((sum, item) => sum + item, 0) / duration.length : 0,
      averageImpressions: impressions.length ? impressions.reduce((sum, item) => sum + item, 0) / impressions.length : 0,
      averageRetention: retention.length ? retention.reduce((sum, item) => sum + item, 0) / retention.length : 0,
      weekday,
      hour,
    };
  }, [publishedVideos]);

  const topVideos = useMemo(
    () =>
      [...publishedVideos]
        .sort((a, b) => videoViews(b) - videoViews(a) || metricNumber(b.ctr) - metricNumber(a.ctr))
        .slice(0, 5),
    [publishedVideos],
  );

  const terms = useMemo(() => topTerms(channelVideos), [channelVideos]);
  const ideas = useMemo(
    () => (selectedChannel ? buildTopicIdeas(selectedChannel, channelVideos) : []),
    [channelVideos, selectedChannel],
  );

  if (!channels.length) {
    return (
      <section className="clean-panel rounded-2xl p-6">
        <p className="mb-1 text-xs font-semibold uppercase text-aqua">Insights</p>
        <h2 className="text-xl font-black text-white sm:text-2xl">Cadastre um canal primeiro</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
          Os insights usam perfil do canal, ideias e videos publicados para sugerir temas e proximas apostas.
        </p>
      </section>
    );
  }

  const bestDay = performance.weekday
    ? `${WEEKDAYS[performance.weekday.day]} (${formatNumber(performance.weekday.average)} views media)`
    : "Dados insuficientes";
  const bestHourLabel = performance.hour
    ? `${performance.hour.hour} (${formatNumber(performance.hour.average)} views media)`
    : "Dados insuficientes";
  const repeatSignals = buildRepeatSignals(topVideos, terms, bestDay, bestHourLabel);
  const retentionGroups = buildRetentionGroups(publishedVideos);

  function createIdea(idea: TopicIdea) {
    if (!selectedChannel) {
      return;
    }

    onCreateIdea({
      ...EMPTY_VIDEO,
      title: idea.title,
      channelId: selectedChannel.id,
      channel: selectedChannel.name,
      niche: selectedChannel.niche || "Sem nicho",
      keyword: idea.keyword,
      priority: "Media",
      status: "Ideia",
    });
  }

  return (
    <section className="space-y-5">
      <div className="clean-panel rounded-2xl p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase text-aqua">Insights por canal</p>
            <h2 className="text-xl font-black text-white sm:text-2xl">Temas, sinais e proximas ideias</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              Uma leitura local dos seus dados salvos. Quanto mais videos publicados e metricas voce registrar, melhor ficam os sinais.
            </p>
          </div>
          <label className="field-label w-full lg:w-80">
            <span>Canal analisado</span>
            <select
              className="field-control"
              value={selectedChannel?.id || ""}
              onChange={(event) => setSelectedChannelId(event.target.value)}
            >
              {channels.map((channel) => (
                <option key={channel.id} value={channel.id}>
                  {channel.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Videos ativos" value={String(channelVideos.length)} detail="Sem contar arquivados" />
        <StatCard label="Publicados" value={String(publishedVideos.length)} detail={`${performance.importedCount} com dados importados`} />
        <StatCard label="Media views" value={formatNumber(performance.averageViews)} detail="Studio ou 24h manual" />
        <StatCard label="Media CTR" value={formatDecimal(performance.averageCtr, "%")} detail="Dos videos com CTR" />
      </div>

      <AssetSnowballPanel
        videos={channelVideos}
        channels={selectedChannel ? [selectedChannel] : []}
        weeklyGoal={selectedChannel?.weeklyGoal || 2}
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <section className="clean-panel rounded-2xl p-5">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="mb-1 text-xs font-semibold uppercase text-slate-500">Leitura estrategica</p>
                <h3 className="text-lg font-black text-white">O que os dados sugerem</h3>
              </div>
              <Pill className="border-slate-700/60 bg-white/[0.035] text-slate-300">{bestDay}</Pill>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl bg-white/[0.045] p-4">
                <p className="text-xs font-semibold uppercase text-slate-500">Melhor dia</p>
                <p className="mt-2 text-sm font-bold text-slate-200">{bestDay}</p>
              </div>
              <div className="rounded-xl bg-white/[0.045] p-4">
                <p className="text-xs font-semibold uppercase text-slate-500">Melhor horario</p>
                <p className="mt-2 text-sm font-bold text-slate-200">{bestHourLabel}</p>
              </div>
              <div className="rounded-xl bg-white/[0.045] p-4">
                <p className="text-xs font-semibold uppercase text-slate-500">Retencao media</p>
                <p className="mt-2 text-sm font-bold text-slate-200">
                  {performance.averageRetention
                    ? formatDecimal(performance.averageRetention, "%")
                    : performance.averageDuration
                      ? `${Math.floor(performance.averageDuration / 60)}m ${Math.round(performance.averageDuration % 60)}s`
                      : "--"}
                </p>
              </div>
              <div className="rounded-xl bg-white/[0.045] p-4 md:col-span-3">
                <p className="text-xs font-semibold uppercase text-slate-500">Leitura rapida</p>
                <p className="mt-2 text-sm font-bold text-slate-200">
                  {performance.averageImpressions
                    ? `Media de ${formatNumber(performance.averageImpressions)} impressoes. Use temas com CTR acima da media e replique o angulo dos videos fortes.`
                    : "Importe impressoes do Studio para separar problema de titulo/thumbnail de problema de tema."}
                </p>
              </div>
            </div>
          </section>

          <section className="clean-panel rounded-2xl p-5">
            <div className="mb-4">
              <p className="mb-1 text-xs font-semibold uppercase text-slate-500">Retencao e oportunidades</p>
              <h3 className="text-lg font-black text-white">Diagnostico dos publicados</h3>
            </div>
            <div className="grid gap-3 lg:grid-cols-3">
              <article className="rounded-xl bg-white/[0.045] p-4">
                <p className="text-xs font-semibold uppercase text-slate-500">Alta retencao</p>
                <div className="mt-3 space-y-2">
                  {retentionGroups.highRetention.length ? retentionGroups.highRetention.map((video) => (
                    <button key={video.id} className="block w-full rounded-lg bg-black/20 p-2 text-left text-xs font-bold text-slate-300" onClick={() => onOpenVideo(video)}>
                      <span className="line-clamp-1">{video.title}</span>
                      <span className="text-slate-500">{video.studioRetention}% retencao</span>
                    </button>
                  )) : <p className="text-sm text-slate-500">Sem dados suficientes.</p>}
                </div>
              </article>
              <article className="rounded-xl bg-white/[0.045] p-4">
                <p className="text-xs font-semibold uppercase text-slate-500">Tema bom, entrega fraca</p>
                <div className="mt-3 space-y-2">
                  {retentionGroups.viewGoodRetentionWeak.length ? retentionGroups.viewGoodRetentionWeak.map((video) => (
                    <button key={video.id} className="block w-full rounded-lg bg-black/20 p-2 text-left text-xs font-bold text-slate-300" onClick={() => onOpenVideo(video)}>
                      <span className="line-clamp-1">{video.title}</span>
                      <span className="text-slate-500">{formatNumber(videoViews(video))} views / {video.studioRetention}% retencao</span>
                    </button>
                  )) : <p className="text-sm text-slate-500">Nenhum alerta claro.</p>}
                </div>
              </article>
              <article className="rounded-xl bg-white/[0.045] p-4">
                <p className="text-xs font-semibold uppercase text-slate-500">Virar remake/parte 2</p>
                <div className="mt-3 space-y-2">
                  {retentionGroups.remakeCandidates.length ? retentionGroups.remakeCandidates.map((video) => (
                    <button key={video.id} className="block w-full rounded-lg bg-black/20 p-2 text-left text-xs font-bold text-slate-300" onClick={() => onOpenVideo(video)}>
                      <span className="line-clamp-1">{video.title}</span>
                      <span className="text-slate-500">{formatNumber(videoViews(video))} views</span>
                    </button>
                  )) : <p className="text-sm text-slate-500">Sincronize mais historico.</p>}
                </div>
              </article>
            </div>
          </section>

          <section className="clean-panel rounded-2xl p-5">
            <div className="mb-4">
              <p className="mb-1 text-xs font-semibold uppercase text-aqua">O que repetir</p>
              <h3 className="text-lg font-black text-white">Padroes que merecem nova aposta</h3>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {repeatSignals.map((signal) => (
                <article key={signal.label} className="rounded-xl bg-white/[0.045] p-4">
                  <p className="text-xs font-semibold uppercase text-slate-500">{signal.label}</p>
                  <p className="mt-2 line-clamp-2 text-sm font-black text-white">{signal.value}</p>
                  <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">{signal.detail}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="clean-panel rounded-2xl p-5">
            <div className="mb-4">
              <p className="mb-1 text-xs font-semibold uppercase text-slate-500">Videos fortes</p>
              <h3 className="text-lg font-black text-white">Use como referencia interna</h3>
            </div>

            {topVideos.length ? (
              <div className="grid gap-2">
                {topVideos.map((video, index) => (
                  <button
                    key={video.id}
                    type="button"
                    className="flex w-full items-center gap-3 rounded-xl bg-white/[0.045] p-3 text-left transition hover:bg-white/[0.075]"
                    onClick={() => onOpenVideo(video)}
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-aqua/12 text-xs font-black text-aqua">
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-1 text-sm font-black text-white">{video.title}</span>
                      <span className="mt-1 block text-xs font-semibold text-slate-500">
                        {formatNumber(videoViews(video))} views / {formatDecimal(metricNumber(video.ctr), "%")} CTR
                      </span>
                    </span>
                    <span className="text-xs font-black text-slate-500">Abrir</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-slate-700/70 p-5 text-sm font-semibold text-slate-500">
                Nenhum video publicado com metricas ainda. Publique ou importe dados do Studio para preencher esta lista.
              </p>
            )}
          </section>
        </div>

        <aside className="space-y-5">
          <section className="clean-panel rounded-2xl p-5">
            <div className="mb-4">
              <p className="mb-1 text-xs font-semibold uppercase text-slate-500">Temas recorrentes</p>
              <h3 className="text-lg font-black text-white">Termos que aparecem mais</h3>
            </div>
            {terms.length ? (
              <div className="flex flex-wrap gap-2">
                {terms.map((item) => (
                  <Pill key={item.term} className="border-slate-700/60 bg-white/[0.04] text-slate-300">
                    {item.term} x{item.count}
                  </Pill>
                ))}
              </div>
            ) : (
              <p className="text-sm leading-6 text-slate-500">Crie ideias ou preencha palavras-chave para gerar sinais.</p>
            )}
          </section>

          <section className="clean-panel rounded-2xl p-5">
            <div className="mb-4">
              <p className="mb-1 text-xs font-semibold uppercase text-aqua">Planejador</p>
              <h3 className="text-lg font-black text-white">Ideias baseadas no canal</h3>
            </div>
            <div className="grid gap-2">
              {ideas.map((idea) => (
                <div key={`${idea.source}-${idea.title}`} className="rounded-xl bg-white/[0.045] p-3">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="line-clamp-2 text-sm font-black text-white">{idea.title}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">{idea.source} / {idea.keyword}</p>
                    </div>
                  </div>
                  <Button className="min-h-9 w-full px-3 text-xs" onClick={() => createIdea(idea)}>
                    Criar ideia
                  </Button>
                </div>
              ))}
            </div>
          </section>

          <section className="clean-panel rounded-2xl p-5">
            <div className="mb-4">
              <p className="mb-1 text-xs font-semibold uppercase text-aqua">Proximo mes</p>
              <h3 className="text-lg font-black text-white">Rascunho editorial</h3>
            </div>
            <div className="grid gap-2">
              {ideas.slice(0, 4).map((idea, index) => (
                <div key={`month-${idea.title}`} className="rounded-xl bg-white/[0.045] p-3">
                  <p className="text-xs font-semibold uppercase text-slate-500">Semana {index + 1}</p>
                  <p className="mt-1 line-clamp-2 text-sm font-black text-white">{idea.title}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">{idea.keyword}</p>
                  <Button className="mt-3 min-h-9 w-full px-3 text-xs" onClick={() => createIdea(idea)}>
                    Criar card
                  </Button>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}
