import { useEffect, useMemo, useState, type FormEvent } from "react";
import type {
  Channel,
  Inspiration,
  RadarCompetitor,
  RadarCompetitorDraft,
  RadarIdea,
  RadarRun,
  RadarState,
  Trend,
  Video,
} from "../types";
import { EMPTY_RADAR_COMPETITOR, normalizeRadarCompetitorDraft } from "../lib/radar";
import {
  DEFAULT_YOUTUBE_CLIENT_ID,
  YOUTUBE_CLIENT_ID_KEY,
  fetchYouTubeMarketScan,
  requestYouTubeAccessToken,
  type YouTubeMarketScan,
} from "../lib/youtubeApi";
import { Button, Field, Pill, SelectInput, TextArea, TextInput } from "./ui";

function loadYoutubeClientId() {
  try {
    return localStorage.getItem(YOUTUBE_CLIENT_ID_KEY) || DEFAULT_YOUTUBE_CLIENT_ID;
  } catch {
    return DEFAULT_YOUTUBE_CLIENT_ID;
  }
}

type RadarPanelProps = {
  activeChannel: Channel | null;
  videos: Video[];
  trends: Trend[];
  inspirations: Inspiration[];
  radar: RadarState;
  onRun: () => void;
  onSaveCompetitor: (draft: RadarCompetitorDraft) => void;
  onDeleteCompetitor: (id: string) => void;
  onCreateFromIdea: (idea: RadarIdea, mode: "idea" | "calendar" | "series" | "script") => void;
};

function metricNumber(value: string) {
  const normalized = String(value || "").replace(",", ".").replace(/[^\d.]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function videoViews(video: Video) {
  return metricNumber(video.studioViews || video.views24h);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(value || 0);
}

const SIGNAL_STOP_WORDS = new Set([
  "a",
  "as",
  "com",
  "como",
  "da",
  "de",
  "do",
  "dos",
  "e",
  "em",
  "mais",
  "na",
  "no",
  "o",
  "os",
  "para",
  "por",
  "que",
  "sem",
  "sobre",
  "uma",
  "video",
  "voce",
]);

function videoRetention(video: Video) {
  return metricNumber(video.studioRetention);
}

function averageMetric(values: number[]) {
  const valid = values.filter((value) => value > 0);
  return valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : 0;
}

function normalizeSignalTerm(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function strongestTerm(videos: Video[]) {
  const counts = new Map<string, number>();

  for (const video of videos) {
    const weight = Math.max(1, Math.round(videoViews(video) / 1000));
    const source = [video.title, video.keyword, video.seoTitle, video.seoNotes, video.lessons].join(" ");
    const terms = source
      .split(/[^\p{L}\p{N}]+/u)
      .map(normalizeSignalTerm)
      .filter((term) => term.length > 2 && !SIGNAL_STOP_WORDS.has(term));

    for (const term of terms) {
      counts.set(term, (counts.get(term) || 0) + weight);
    }
  }

  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "pt-BR"))[0]?.[0] || "";
}

function bestFormat(videos: Video[]) {
  const groups = new Map<string, Video[]>();

  for (const video of videos) {
    const label = [video.contentType, video.videoFormat].map((item) => item.trim()).filter(Boolean).join(" / ") || "Formato livre";
    groups.set(label, [...(groups.get(label) || []), video]);
  }

  return [...groups.entries()]
    .map(([label, groupVideos]) => ({
      label,
      count: groupVideos.length,
      averageViews: averageMetric(groupVideos.map(videoViews)),
      averageRetention: averageMetric(groupVideos.map(videoRetention)),
    }))
    .sort((a, b) => b.averageViews - a.averageViews || b.averageRetention - a.averageRetention || b.count - a.count)[0] || null;
}

function formatDateTime(value: string) {
  if (!value) {
    return "Sem pesquisa";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function scoreTone(score: number) {
  if (score >= 75) {
    return "border-aqua/25 bg-aqua/10 text-aqua";
  }

  if (score >= 55) {
    return "border-amber-400/25 bg-amber-400/10 text-amber-200";
  }

  return "border-slate-700/60 bg-white/[0.035] text-slate-300";
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-[7rem] border-t border-slate-800/80 pt-3 md:border-l md:border-t-0 md:pl-4 md:pt-0">
      <p className="text-[0.68rem] font-black uppercase text-slate-600">{label}</p>
      <p className="mt-1 truncate text-sm font-black text-slate-200">{value}</p>
    </div>
  );
}

function SignalItem({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="border-t border-slate-800/80 py-3 first:border-t-0 md:border-l md:border-t-0 md:px-4 md:first:border-l-0">
      <p className="text-[0.68rem] font-black uppercase text-slate-600">{label}</p>
      <p className="mt-1 line-clamp-1 text-sm font-black text-white">{value}</p>
      <p className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-slate-500">{detail}</p>
    </div>
  );
}

function ReportList({ title, items }: { title: string; items: string[] }) {
  return (
    <article className="rounded-xl bg-white/[0.045] p-4">
      <h4 className="text-sm font-black text-white">{title}</h4>
      {items.length ? (
        <div className="mt-3 space-y-2">
          {items.map((item) => (
            <p key={item} className="rounded-lg bg-black/18 px-3 py-2 text-xs font-bold leading-5 text-slate-300">
              {item}
            </p>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm font-semibold text-slate-500">Sem dados suficientes.</p>
      )}
    </article>
  );
}

function ScoreBreakdown({ idea }: { idea: RadarIdea }) {
  const items = [
    ["Aderencia", idea.scoreBreakdown.aderencia],
    ["Mercado", idea.scoreBreakdown.mercado],
    ["Producao", idea.scoreBreakdown.producao],
    ["CTR", idea.scoreBreakdown.ctr],
    ["Retencao", idea.scoreBreakdown.retencao],
    ["Serie", idea.scoreBreakdown.serie],
  ] as const;

  return (
    <article className="rounded-xl bg-white/[0.045] p-4">
      <h4 className="text-sm font-black text-white">Por que recebeu esse score</h4>
      <div className="mt-3 grid gap-2">
        {items.map(([label, value]) => (
          <div key={label}>
            <div className="mb-1 flex items-center justify-between gap-3 text-xs font-bold">
              <span className="text-slate-400">{label}</span>
              <span className="text-slate-200">{value}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
              <div className="h-full rounded-full bg-aqua" style={{ width: `${Math.min(100, value * 4)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

function buildDraft(channelId: string): RadarCompetitorDraft {
  return {
    ...EMPTY_RADAR_COMPETITOR,
    channelId,
  };
}

function CompetitorCard({
  competitor,
  onEdit,
  onDelete,
}: {
  competitor: RadarCompetitor;
  onEdit: (competitor: RadarCompetitor) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <article className="rounded-xl border border-slate-700/35 bg-[#111722] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="truncate text-sm font-black text-white">{competitor.name}</h4>
          <p className="mt-1 text-xs font-bold text-slate-500">
            {competitor.market} / {competitor.size}
          </p>
        </div>
        <Pill className="border-slate-700/60 bg-white/[0.035] text-slate-300">Ref</Pill>
      </div>
      <p className="mt-3 line-clamp-2 min-h-[2.5rem] text-xs font-semibold leading-5 text-slate-400">
        {competitor.notes || "Sem notas. Adicione temas fortes, frequencia e lacunas desse canal."}
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button className="min-h-9 px-3 text-xs" onClick={() => onEdit(competitor)}>
          Editar
        </Button>
        {competitor.url ? (
          <a className="btn btn-ghost min-h-9 px-3 text-center text-xs" href={competitor.url} target="_blank" rel="noreferrer">
            Abrir
          </a>
        ) : (
          <Button className="min-h-9 px-3 text-xs" disabled>
            Sem link
          </Button>
        )}
      </div>
      <Button className="mt-2 min-h-9 w-full px-3 text-xs" variant="danger" onClick={() => onDelete(competitor.id)}>
        Remover referencia
      </Button>
    </article>
  );
}

function QuickIdeaCard({
  idea,
  rank,
  onToggle,
  onCreateFromIdea,
}: {
  idea: RadarIdea;
  rank: number;
  onToggle: () => void;
  onCreateFromIdea: (idea: RadarIdea, mode: "idea" | "calendar" | "series" | "script") => void;
}) {
  const proof = idea.references.find((reference) => reference.source === "Canal") || idea.references[0] || null;

  return (
    <article className="rounded-2xl border border-slate-700/35 bg-[#111722] p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase text-slate-500">Prioridade {rank}</p>
          <h3 className="mt-1 line-clamp-2 text-lg font-black text-white">{idea.title}</h3>
        </div>
        <Pill className={scoreTone(idea.score)}>{idea.score}/100</Pill>
      </div>

      <p className="line-clamp-2 text-sm font-semibold leading-6 text-slate-400">{idea.concept}</p>

      <div className="mt-4 grid gap-2 text-xs font-bold text-slate-400">
        <div className="rounded-lg bg-white/[0.045] px-3 py-2">
          <span className="text-slate-500">Evidencia: </span>
          <span className="text-slate-200">{idea.evidence[0] || idea.strategicReason || idea.angle}</span>
        </div>
        <div className="rounded-lg bg-white/[0.045] px-3 py-2">
          <span className="text-slate-500">Referencia: </span>
          <span className="text-slate-200">
            {proof ? `${proof.title || proof.channel}${proof.views ? ` (${proof.views})` : ""}` : "Sem referencia direta ainda"}
          </span>
        </div>
        <div className="rounded-lg bg-white/[0.045] px-3 py-2">
          <span className="text-slate-500">Proximo passo: </span>
          <span className="text-slate-200">{idea.nextActions[0] || "Validar promessa e salvar no calendario."}</span>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Pill className="border-slate-700/60 bg-white/[0.035] text-slate-300">{idea.languageAngle}</Pill>
        <Pill className="border-slate-700/60 bg-white/[0.035] text-slate-300">{idea.viewPotential}</Pill>
        <Pill className="border-slate-700/60 bg-white/[0.035] text-slate-300">Dificuldade {idea.difficulty}</Pill>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <Button className="min-h-9 px-3 text-xs" variant="primary" onClick={() => onCreateFromIdea(idea, "script")}>
          Gerar roteiro
        </Button>
        <Button className="min-h-9 px-3 text-xs" onClick={() => onCreateFromIdea(idea, "calendar")}>
          Calendario
        </Button>
        <Button className="min-h-9 px-3 text-xs" onClick={() => onCreateFromIdea(idea, "idea")}>
          Salvar ideia
        </Button>
        <Button className="min-h-9 px-3 text-xs" onClick={onToggle}>
          Comparar
        </Button>
      </div>
    </article>
  );
}

function IdeaCard({
  idea,
  expanded,
  onToggle,
  onCreateFromIdea,
}: {
  idea: RadarIdea;
  expanded: boolean;
  onToggle: () => void;
  onCreateFromIdea: (idea: RadarIdea, mode: "idea" | "calendar" | "series" | "script") => void;
}) {
  return (
    <article className="rounded-2xl border border-slate-700/35 bg-[#111722] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap gap-2">
            <Pill className={scoreTone(idea.score)}>{idea.score}/100</Pill>
            <Pill className="border-slate-700/60 bg-white/[0.035] text-slate-300">{idea.languageAngle}</Pill>
            <Pill className="border-slate-700/60 bg-white/[0.035] text-slate-300">{idea.marketStatus}</Pill>
          </div>
          <h3 className="line-clamp-2 text-lg font-black text-white">{idea.title}</h3>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-400">{idea.concept}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-xl bg-white/[0.045] p-3">
          <p className="text-xs font-black uppercase text-slate-500">Hook</p>
          <p className="mt-2 text-sm font-bold leading-6 text-slate-200">{idea.hook}</p>
        </div>
        <div className="rounded-xl bg-white/[0.045] p-3">
          <p className="text-xs font-black uppercase text-slate-500">Risco</p>
          <p className="mt-2 text-sm font-bold leading-6 text-slate-200">{idea.flopRisk}</p>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <ScoreBreakdown idea={idea} />
          <ReportList title="Evidencias usadas" items={idea.evidence} />
          <ReportList title="Proximos passos" items={idea.nextActions} />
          <ReportList title="Variacoes de titulo" items={idea.titleVariations} />
          <ReportList title="Estrutura do roteiro" items={idea.scriptStructure} />
          <ReportList title="Palavras-chave" items={idea.keywords} />
          <article className="rounded-xl bg-white/[0.045] p-4">
            <h4 className="text-sm font-black text-white">Referencias e justificativa</h4>
            <p className="mt-3 text-sm font-semibold leading-6 text-slate-300">{idea.strategicReason}</p>
            <div className="mt-3 space-y-2">
              {idea.references.length ? (
                idea.references.map((reference, index) => (
                  <a
                    key={`${reference.title}-${index}`}
                    className="block rounded-lg bg-black/18 px-3 py-2 text-xs font-bold leading-5 text-slate-300 hover:bg-white/[0.06]"
                    href={reference.url || undefined}
                    target={reference.url ? "_blank" : undefined}
                    rel="noreferrer"
                  >
                    {reference.source}: {reference.title || reference.channel || "Referencia"} {reference.views ? `(${reference.views})` : ""}
                  </a>
                ))
              ) : (
                <p className="text-sm font-semibold text-slate-500">Sem referencias externas salvas.</p>
              )}
            </div>
          </article>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button className="min-h-9 px-3 text-xs" variant="primary" onClick={() => onCreateFromIdea(idea, "script")}>
          Gerar roteiro
        </Button>
        <Button className="min-h-9 px-3 text-xs" onClick={() => onCreateFromIdea(idea, "idea")}>
          Salvar ideia
        </Button>
        <Button className="min-h-9 px-3 text-xs" onClick={() => onCreateFromIdea(idea, "calendar")}>
          Salvar no calendario
        </Button>
        <Button className="min-h-9 px-3 text-xs" onClick={() => onCreateFromIdea(idea, "series")}>
          Transformar em serie
        </Button>
        <Button className="min-h-9 px-3 text-xs" onClick={onToggle}>
          {expanded ? "Recolher" : "Ver referencias"}
        </Button>
      </div>
    </article>
  );
}

function MarketScanPanel({
  scan,
  idea,
  onCreateFromIdea,
}: {
  scan: YouTubeMarketScan;
  idea: RadarIdea | null;
  onCreateFromIdea: (idea: RadarIdea, mode: "idea" | "calendar" | "series" | "script") => void;
}) {
  const pressureTone =
    scan.pressure === "Alta"
      ? "border-red-300/25 bg-red-400/10 text-red-100"
      : scan.pressure === "Media"
        ? "border-amber-300/25 bg-amber-300/10 text-amber-100"
        : "border-aqua/25 bg-aqua/10 text-aqua";
  const demandTone =
    scan.demand === "Alta"
      ? "border-aqua/25 bg-aqua/10 text-aqua"
      : scan.demand === "Media"
        ? "border-amber-300/25 bg-amber-300/10 text-amber-100"
        : "border-slate-700/60 bg-white/[0.035] text-slate-300";

  return (
    <section className="clean-panel rounded-2xl p-5">
      <div className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="mb-1 text-xs font-black uppercase text-aqua">Oceano Azul</p>
          <h3 className="text-lg font-black text-white">Pressao de demanda: {scan.opportunity}</h3>
          <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-400">{scan.recommendation}</p>
        </div>
        {idea ? (
          <Button variant="primary" onClick={() => onCreateFromIdea(idea, "script")}>
            Gerar roteiro com este contexto
          </Button>
        ) : null}
      </div>

      <div className="grid gap-3 md:grid-cols-5">
        <article className="rounded-xl bg-white/[0.045] p-3">
          <p className="text-xs font-black uppercase text-slate-500">Demanda</p>
          <Pill className={`mt-2 ${demandTone}`}>{scan.demand}</Pill>
        </article>
        <article className="rounded-xl bg-white/[0.045] p-3">
          <p className="text-xs font-black uppercase text-slate-500">Pressao</p>
          <Pill className={`mt-2 ${pressureTone}`}>{scan.pressure}</Pill>
        </article>
        <article className="rounded-xl bg-white/[0.045] p-3">
          <p className="text-xs font-black uppercase text-slate-500">Videos</p>
          <strong className="mt-2 block text-lg font-black text-white">{scan.totalVideos}</strong>
        </article>
        <article className="rounded-xl bg-white/[0.045] p-3">
          <p className="text-xs font-black uppercase text-slate-500">Canais grandes</p>
          <strong className="mt-2 block text-lg font-black text-white">{scan.bigChannelPosts}</strong>
        </article>
        <article className="rounded-xl bg-white/[0.045] p-3">
          <p className="text-xs font-black uppercase text-slate-500">Media views</p>
          <strong className="mt-2 block text-lg font-black text-white">{formatNumber(scan.averageViews)}</strong>
        </article>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <article className="rounded-xl bg-white/[0.035] p-4">
            <h4 className="text-sm font-black text-white">Videos recentes mais fortes</h4>
            <div className="mt-3 max-h-96 space-y-2 overflow-y-auto pr-1">
              {scan.videos.length ? (
                scan.videos.slice(0, 8).map((video) => (
                  <a
                    key={video.videoId}
                    className="block rounded-lg bg-black/18 px-3 py-3 hover:bg-white/[0.055]"
                    href={video.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <div className="flex items-start gap-3">
                      {video.thumbnailUrl ? (
                        <img className="h-12 w-20 rounded-md object-cover" src={video.thumbnailUrl} alt="" />
                      ) : null}
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-sm font-black text-white">{video.title}</p>
                        <p className="mt-1 text-xs font-bold text-slate-500">
                          {video.channelTitle} / {formatNumber(video.views)} views / {video.durationLabel}
                          {video.subscribers ? ` / ${formatNumber(video.subscribers)} inscritos` : ""}
                        </p>
                      </div>
                    </div>
                  </a>
                ))
              ) : (
                <p className="text-sm font-semibold text-slate-500">Nenhum video encontrado no periodo.</p>
              )}
            </div>
          </article>
        </div>

        <aside className="space-y-4">
          <ReportList
            title="Promessa e diferenciacao"
            items={scan.differentiationAngles}
          />
          <article className="rounded-xl bg-white/[0.045] p-4">
            <h4 className="text-sm font-black text-white">Palavras repetidas em titulos</h4>
            {scan.titleTerms.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {scan.titleTerms.map((term) => (
                  <Pill key={term.term} className="border-slate-700/60 bg-black/18 text-slate-300">
                    {term.term} x{term.count}
                  </Pill>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm font-semibold text-slate-500">Sem termos fortes detectados.</p>
            )}
          </article>
          <ReportList
            title="Reclamacoes dos comentarios"
            items={
              scan.viewerComplaints.length
                ? scan.viewerComplaints
                : ["Sem reclamacoes fortes detectadas nos comentarios publicos analisados."]
            }
          />
        </aside>
      </div>
    </section>
  );
}

export function RadarPanel({
  activeChannel,
  videos,
  trends,
  inspirations,
  radar,
  onRun,
  onSaveCompetitor,
  onDeleteCompetitor,
  onCreateFromIdea,
}: RadarPanelProps) {
  const [draft, setDraft] = useState<RadarCompetitorDraft>(() => buildDraft(activeChannel?.id || ""));
  const [expandedIdeaId, setExpandedIdeaId] = useState<string>("");
  const [clientId, setClientId] = useState(loadYoutubeClientId);
  const [marketAccessToken, setMarketAccessToken] = useState("");
  const [marketIdeaId, setMarketIdeaId] = useState("");
  const [marketDays, setMarketDays] = useState("14");
  const [marketBusy, setMarketBusy] = useState(false);
  const [marketMessage, setMarketMessage] = useState("");
  const [marketScans, setMarketScans] = useState<Record<string, YouTubeMarketScan>>({});

  useEffect(() => {
    setDraft((current) => ({
      ...current,
      channelId: activeChannel?.id || "",
    }));
  }, [activeChannel?.id]);

  useEffect(() => {
    try {
      localStorage.setItem(YOUTUBE_CLIENT_ID_KEY, clientId.trim());
    } catch (error) {
      console.warn("Nao foi possivel salvar o Client ID do YouTube.", error);
    }
  }, [clientId]);

  const channelVideos = useMemo(() => {
    if (!activeChannel) {
      return [];
    }

    return videos.filter(
      (video) =>
        !video.archived &&
        (video.channelId === activeChannel.id || (!video.channelId && video.channel === activeChannel.name)),
    );
  }, [activeChannel, videos]);

  const published = useMemo(() => channelVideos.filter((video) => video.status === "Publicado"), [channelVideos]);
  const activeCompetitors = useMemo(
    () => (activeChannel ? radar.competitors.filter((competitor) => competitor.channelId === activeChannel.id) : []),
    [activeChannel, radar.competitors],
  );
  const latestRun = useMemo(
    () =>
      activeChannel
        ? radar.runs
            .filter((run) => run.channelId === activeChannel.id)
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] || null
        : null,
    [activeChannel, radar.runs],
  );
  const ideas = useMemo(
    () =>
      activeChannel
        ? radar.ideas
            .filter((idea) => idea.channelId === activeChannel.id)
            .sort((a, b) => b.score - a.score || b.createdAt.localeCompare(a.createdAt))
            .slice(0, 12)
        : [],
    [activeChannel, radar.ideas],
  );
  const topIdeas = useMemo(() => ideas.slice(0, 3), [ideas]);
  const secondaryIdeas = useMemo(() => ideas.slice(3), [ideas]);
  const marketIdea = useMemo(
    () => ideas.find((idea) => idea.id === marketIdeaId) || topIdeas[0] || ideas[0] || null,
    [ideas, marketIdeaId, topIdeas],
  );
  const activeMarketScan = marketIdea ? marketScans[marketIdea.id] || null : null;
  const alerts = useMemo(
    () =>
      activeChannel
        ? radar.alerts
            .filter((alert) => alert.channelId === activeChannel.id)
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
            .slice(0, 6)
        : [],
    [activeChannel, radar.alerts],
  );
  const topVideo = useMemo(
    () => [...published].sort((a, b) => videoViews(b) - videoViews(a))[0] || null,
    [published],
  );
  const radarSignals = useMemo(() => {
    const averageViews = averageMetric(published.map(videoViews));
    const topTerm = strongestTerm(published);
    const format = bestFormat(published);
    const aboveAverage = [...published].sort((a, b) => videoViews(b) - videoViews(a)).find((video) => averageViews > 0 && videoViews(video) >= averageViews * 1.2) || null;

    return [
      {
        label: "Tema",
        value: topTerm || "Sem padrao claro",
        detail: topTerm ? "Assunto recorrente no historico do canal." : "Sincronize mais videos para detectar tema.",
      },
      {
        label: "Formato",
        value: format ? format.label : "Sem formato definido",
        detail: format ? `${format.count} video(s), media ${formatNumber(format.averageViews)} views.` : "Preencha formatos para comparar.",
      },
      {
        label: "Prova",
        value: aboveAverage?.title || topVideo?.title || "Sem video forte",
        detail: aboveAverage
          ? `${formatNumber(videoViews(aboveAverage))} views, acima da media do canal.`
          : topVideo
            ? `Melhor video atual: ${formatNumber(videoViews(topVideo))} views.`
            : "O Radar precisa de publicados para provar oportunidades.",
      },
    ];
  }, [published, topVideo]);

  useEffect(() => {
    if (!marketIdeaId && topIdeas[0]) {
      setMarketIdeaId(topIdeas[0].id);
    }
  }, [marketIdeaId, topIdeas]);

  function setField<K extends keyof RadarCompetitorDraft>(field: K, value: RadarCompetitorDraft[K]) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function submitCompetitor(event: FormEvent) {
    event.preventDefault();
    if (!activeChannel || !draft.name.trim()) {
      return;
    }

    onSaveCompetitor(
      normalizeRadarCompetitorDraft({
        ...draft,
        channelId: activeChannel.id,
      }),
    );
    setDraft(buildDraft(activeChannel.id));
  }

  async function analyzeMarket() {
    if (!marketIdea) {
      setMarketMessage("Gere ideias no Radar antes de pesquisar o mercado.");
      return;
    }

    const query = marketIdea.keywords[0] || marketIdea.title;
    setMarketBusy(true);
    setMarketMessage("Pesquisando videos recentes no YouTube...");

    try {
      const token = marketAccessToken || (await requestYouTubeAccessToken(clientId.trim()));
      setMarketAccessToken(token);
      const scan = await fetchYouTubeMarketScan(token, query, Number(marketDays) || 14);
      setMarketScans((current) => ({ ...current, [marketIdea.id]: scan }));
      setMarketMessage(`Analise pronta: ${scan.opportunity}.`);
    } catch (error) {
      setMarketMessage(error instanceof Error ? error.message : "Nao foi possivel analisar o mercado agora.");
    } finally {
      setMarketBusy(false);
    }
  }

  function enrichIdeaWithMarket(idea: RadarIdea): RadarIdea {
    const scan = marketScans[idea.id];
    if (!scan) {
      return idea;
    }

    return {
      ...idea,
      strategicReason: `${idea.strategicReason} Mercado YouTube: ${scan.recommendation}`,
      evidence: [
        ...idea.evidence,
        `Oceano Azul: demanda ${scan.demand}, pressao ${scan.pressure}, ${scan.bigChannelPosts} videos/canais grandes nos ultimos ${scan.days} dias.`,
        `Media dos concorrentes recentes: ${formatNumber(scan.averageViews)} views em ${scan.totalVideos} videos analisados.`,
      ].slice(0, 8),
      nextActions: [
        ...scan.differentiationAngles.slice(0, 3),
        ...idea.nextActions,
      ].slice(0, 8),
      flopRisk:
        scan.pressure === "Alta"
          ? `${idea.flopRisk} Pressao de mercado alta: mude o angulo antes de gravar.`
          : scan.opportunity === "Oceano azul"
            ? "Risco menor: ha demanda recente e baixa pressao de canais grandes, mas o titulo precisa ser muito especifico."
            : idea.flopRisk,
    };
  }

  function createFromIdea(idea: RadarIdea, mode: "idea" | "calendar" | "series" | "script") {
    onCreateFromIdea(enrichIdeaWithMarket(idea), mode);
  }

  if (!activeChannel) {
    return (
      <section className="clean-panel rounded-2xl p-6">
        <p className="mb-1 text-xs font-black uppercase text-aqua">Radar de Tendencias</p>
        <h2 className="text-xl font-black text-white sm:text-2xl">Escolha um canal ativo</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
          O Radar precisa de um canal selecionado para cruzar historico, nicho, referencias e proximas ideias.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <div className="clean-panel rounded-2xl p-5">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="mb-1 text-xs font-black uppercase text-aqua">Radar de Tendencias</p>
            <h2 className="text-xl font-black text-white sm:text-2xl">Ideias objetivas para {activeChannel.name}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              O Radar cruza desempenho do canal, referencias e temas recorrentes para sugerir o que gravar primeiro.
            </p>
            <div className="mt-5 grid gap-3 md:grid-cols-4">
              <SummaryStat label="Publicados" value={String(published.length)} />
              <SummaryStat label="Melhor video" value={topVideo ? formatNumber(videoViews(topVideo)) : "0"} />
              <SummaryStat label="Referencias" value={String(activeCompetitors.length)} />
              <SummaryStat label="Ideias" value={String(ideas.length)} />
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Pill className="border-slate-700/60 bg-white/[0.035] text-slate-300">
              Ultima pesquisa: {formatDateTime(latestRun?.createdAt || "")}
            </Pill>
            <Button variant="primary" onClick={onRun}>
              Pesquisar ideias profundas
            </Button>
          </div>
        </div>
      </div>

      <section className="clean-panel rounded-2xl p-5">
        <div className="flex flex-col gap-4 md:grid md:grid-cols-[180px_minmax(0,1fr)] md:items-start">
          <div>
            <p className="mb-1 text-xs font-black uppercase text-slate-500">Diagnostico rapido</p>
            <h3 className="text-lg font-black text-white">Sinais principais</h3>
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">Sem analise extra. Apenas o que ajuda a decidir.</p>
          </div>
          <div className="grid md:grid-cols-3">
            {radarSignals.map((signal) => (
              <SignalItem key={signal.label} label={signal.label} value={signal.value} detail={signal.detail} />
            ))}
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="clean-panel rounded-2xl p-5">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-1 text-xs font-black uppercase text-aqua">Gravar primeiro</p>
              <h3 className="text-lg font-black text-white">Top 3 oportunidades</h3>
              <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
                Poucas escolhas, com acao direta. O restante fica no relatorio completo.
              </p>
            </div>
            <Pill className="border-slate-700/60 bg-white/[0.035] text-slate-300">
              Mercado: {trends.length + inspirations.length + activeCompetitors.length} sinais
            </Pill>
          </div>

          {topIdeas.length ? (
            <div className="grid gap-4 2xl:grid-cols-3">
              {topIdeas.map((idea, index) => (
                <QuickIdeaCard
                  key={idea.id}
                  idea={idea}
                  rank={index + 1}
                  onToggle={() => setExpandedIdeaId((current) => (current === idea.id ? "" : idea.id))}
                  onCreateFromIdea={createFromIdea}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-700/70 p-6">
              <h4 className="text-base font-black text-white">Nenhuma ideia ranqueada ainda</h4>
              <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
                Clique em pesquisar para gerar o primeiro ranking. Com videos publicados e referencias, o score fica mais util.
              </p>
              <Button className="mt-4" variant="primary" onClick={onRun}>
                Pesquisar ideias profundas
              </Button>
            </div>
          )}
        </section>

        <aside className="clean-panel rounded-2xl p-5">
          <div className="mb-4">
            <p className="mb-1 text-xs font-black uppercase text-aqua">Alertas</p>
            <h3 className="text-lg font-black text-white">Oportunidades</h3>
          </div>
          {alerts.length ? (
            <div className="space-y-2">
              {alerts.slice(0, 4).map((alert) => (
                <div key={alert.id} className="rounded-xl border border-slate-700/45 bg-[#111722] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-black text-white">{alert.title}</p>
                    <Pill className="border-slate-700/60 bg-white/[0.035] text-slate-400">{alert.severity}</Pill>
                  </div>
                  <p className="mt-1 text-xs font-semibold leading-5 text-slate-400">{alert.detail}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm font-semibold leading-6 text-slate-500">Os alertas aparecem depois da primeira pesquisa.</p>
          )}
        </aside>
      </div>

      <section className="clean-panel rounded-2xl p-5">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="mb-1 text-xs font-black uppercase text-aqua">Radar v2</p>
            <h3 className="text-lg font-black text-white">Pressao de demanda no YouTube</h3>
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-500">
              Pesquisa videos recentes sobre uma ideia, mede competicao de canais grandes, palavras repetidas em titulos e falhas nos comentarios.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button disabled={!marketIdea || marketBusy} variant="primary" onClick={analyzeMarket}>
              {marketBusy ? "Analisando..." : "Analisar mercado"}
            </Button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_160px_minmax(0,1fr)]">
          <Field label="Ideia para analisar">
            <SelectInput value={marketIdea?.id || ""} onChange={(event) => setMarketIdeaId(event.target.value)}>
              {ideas.length ? (
                ideas.map((idea) => (
                  <option key={idea.id} value={idea.id}>
                    {idea.title}
                  </option>
                ))
              ) : (
                <option value="">Gere ideias primeiro</option>
              )}
            </SelectInput>
          </Field>
          <Field label="Periodo">
            <SelectInput value={marketDays} onChange={(event) => setMarketDays(event.target.value)}>
              <option value="7">7 dias</option>
              <option value="14">14 dias</option>
              <option value="30">30 dias</option>
            </SelectInput>
          </Field>
          <Field label="OAuth Client ID">
            <TextInput value={clientId} onChange={(event) => setClientId(event.target.value)} />
          </Field>
        </div>

        {marketMessage ? (
          <p className="mt-4 rounded-xl bg-white/[0.045] p-3 text-sm font-bold text-slate-300">{marketMessage}</p>
        ) : null}
      </section>

      {activeMarketScan ? (
        <MarketScanPanel scan={activeMarketScan} idea={marketIdea} onCreateFromIdea={createFromIdea} />
      ) : null}

      {expandedIdeaId ? (
        <section className="clean-panel rounded-2xl p-5">
          {ideas
            .filter((idea) => idea.id === expandedIdeaId)
            .map((idea) => (
              <IdeaCard
                key={idea.id}
                idea={idea}
                expanded
                onToggle={() => setExpandedIdeaId("")}
                onCreateFromIdea={createFromIdea}
              />
            ))}
        </section>
      ) : null}

      <details className="clean-panel rounded-2xl p-5">
        <summary className="cursor-pointer list-none">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="mb-1 text-xs font-black uppercase text-slate-500">Relatorio</p>
              <h3 className="text-lg font-black text-white">Analise completa e banco de ideias</h3>
            </div>
            <span className="text-sm font-black text-slate-500">Abrir detalhes</span>
          </div>
        </summary>

        <div className="mt-5 space-y-5">
          {latestRun ? (
            <div>
              <h4 className="text-lg font-black text-white">{latestRun.firstRecommendation}</h4>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-400">{latestRun.summary}</p>
              <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">{latestRun.marketSummary}</p>
              <div className="mt-4 grid gap-3 lg:grid-cols-3">
                <ReportList title="Gravar agora" items={latestRun.immediateOpportunities.slice(0, 3)} />
                <ReportList title="Proximos 7 dias" items={latestRun.next7Days.slice(0, 4)} />
                <ReportList title="Continuacoes" items={latestRun.continuationCandidates.slice(0, 4)} />
              </div>
            </div>
          ) : null}

          {secondaryIdeas.length ? (
            <div className="grid gap-4">
              {secondaryIdeas.map((idea) => (
                <IdeaCard
                  key={idea.id}
                  idea={idea}
                  expanded={expandedIdeaId === idea.id}
                  onToggle={() => setExpandedIdeaId((current) => (current === idea.id ? "" : idea.id))}
                  onCreateFromIdea={createFromIdea}
                />
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-slate-700/70 p-4 text-sm font-semibold text-slate-500">
              Sem ideias secundarias. Rode o Radar para gerar mais opcoes.
            </p>
          )}
        </div>
      </details>

      <details className="clean-panel rounded-2xl p-5">
        <summary className="cursor-pointer list-none">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="mb-1 text-xs font-black uppercase text-slate-500">Referencias</p>
              <h3 className="text-lg font-black text-white">Concorrentes e canais de referencia</h3>
            </div>
            <span className="text-sm font-black text-slate-500">{activeCompetitors.length} salvos</span>
          </div>
        </summary>

        <div className="mt-5 grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
          <form className="grid gap-3 rounded-xl bg-white/[0.035] p-4" onSubmit={submitCompetitor}>
            <Field label="Canal">
              <TextInput required value={draft.name} onChange={(event) => setField("name", event.target.value)} placeholder="Nome do canal" />
            </Field>
            <Field label="Link">
              <TextInput value={draft.url} onChange={(event) => setField("url", event.target.value)} placeholder="https://youtube.com/..." />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Mercado">
                <SelectInput value={draft.market} onChange={(event) => setField("market", event.target.value as RadarCompetitorDraft["market"])}>
                  <option value="Brasil">Brasil</option>
                  <option value="Ingles">Ingles</option>
                  <option value="Outro">Outro</option>
                </SelectInput>
              </Field>
              <Field label="Tamanho">
                <SelectInput value={draft.size} onChange={(event) => setField("size", event.target.value as RadarCompetitorDraft["size"])}>
                  <option value="Referencia">Referencia</option>
                  <option value="Grande">Grande</option>
                  <option value="Medio">Medio</option>
                  <option value="Pequeno">Pequeno</option>
                </SelectInput>
              </Field>
            </div>
            <Field label="O que observar">
              <TextArea
                rows={3}
                value={draft.notes}
                onChange={(event) => setField("notes", event.target.value)}
                placeholder="Temas fortes, frequencia, lacunas..."
              />
            </Field>
            <div className="flex gap-2">
              {draft.id ? (
                <Button className="w-full" onClick={() => setDraft(buildDraft(activeChannel.id))}>
                  Cancelar
                </Button>
              ) : null}
              <Button className="w-full" variant="primary" type="submit">
                {draft.id ? "Atualizar" : "Adicionar"}
              </Button>
            </div>
          </form>

          <section className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
            {activeCompetitors.length ? (
              activeCompetitors.map((competitor) => (
                <CompetitorCard
                  key={competitor.id}
                  competitor={competitor}
                  onEdit={(item) => setDraft(normalizeRadarCompetitorDraft(item))}
                  onDelete={onDeleteCompetitor}
                />
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-700/70 p-5 text-sm font-semibold leading-6 text-slate-500">
                Adicione canais grandes, medios e pequenos do nicho. Eles ajudam a comparar temas e lacunas.
              </div>
            )}
          </section>
        </div>
      </details>
    </section>
  );
}
