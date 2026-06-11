import { useMemo } from "react";
import type { Video } from "../types";
import { getTopOpportunities, type OpportunityScore } from "../lib/opportunity";
import { Button, Pill, cx } from "./ui";

type OpportunityPanelProps = {
  videos: Video[];
  onOpenVideo: (video: Video) => void;
  onCreate: () => void;
};

function toneClass(tone: OpportunityScore["tone"]) {
  if (tone === "strong") {
    return "border-aqua/25 bg-aqua/10 text-aqua";
  }

  if (tone === "medium") {
    return "border-amber-300/25 bg-amber-300/10 text-amber-100";
  }

  return "border-slate-700/60 bg-white/[0.035] text-slate-300";
}

function RecommendationCard({
  title,
  emptyText,
  item,
  onOpenVideo,
}: {
  title: string;
  emptyText: string;
  item: ReturnType<typeof getTopOpportunities>["top"];
  onOpenVideo: (video: Video) => void;
}) {
  if (!item) {
    return (
      <article className="rounded-xl border border-dashed border-slate-700/70 p-4">
        <p className="mb-2 text-xs font-black uppercase text-slate-500">{title}</p>
        <p className="text-sm font-semibold leading-6 text-slate-500">{emptyText}</p>
      </article>
    );
  }

  return (
    <article className="rounded-xl border border-slate-700/40 bg-[#111722] p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="mb-1 text-xs font-black uppercase text-slate-500">{title}</p>
          <h3 className="line-clamp-2 text-base font-black text-white">{item.video.title}</h3>
        </div>
        <Pill className={cx("shrink-0", toneClass(item.opportunity.tone))}>{item.opportunity.score}</Pill>
      </div>

      <p className="text-sm font-bold text-slate-300">{item.opportunity.nextAction}</p>
      <p className="mt-1 truncate text-xs font-semibold text-slate-500">
        {[item.video.channel, item.video.niche].filter(Boolean).join(" / ") || "Sem canal"}
      </p>

      {item.opportunity.reasons.length ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {item.opportunity.reasons.map((reason) => (
            <span key={reason} className="rounded-md bg-white/[0.045] px-2 py-1 text-[0.68rem] font-black text-slate-300">
              {reason}
            </span>
          ))}
        </div>
      ) : null}

      <Button className="mt-4 min-h-9 w-full px-3 text-xs" onClick={() => onOpenVideo(item.video)}>
        Abrir
      </Button>
    </article>
  );
}

export function OpportunityPanel({ videos, onOpenVideo, onCreate }: OpportunityPanelProps) {
  const opportunities = useMemo(() => getTopOpportunities(videos), [videos]);
  const activeCount = opportunities.ranked.length;

  return (
    <section className="clean-panel rounded-2xl p-5">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mb-1 text-xs font-black uppercase text-aqua">Decisao rapida</p>
          <h2 className="text-xl font-black text-white sm:text-2xl">O que gravar agora</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
            Score local por prioridade, preparo, data e historico do canal. Use como triagem, nao como regra fixa.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Pill className="border-slate-700/60 bg-white/[0.035] text-slate-300">{activeCount} em analise</Pill>
          <Button variant="primary" onClick={onCreate}>
            Nova ideia
          </Button>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <RecommendationCard
          title="Melhor aposta"
          emptyText="Crie algumas ideias para o app calcular a melhor aposta."
          item={opportunities.top}
          onOpenVideo={onOpenVideo}
        />
        <RecommendationCard
          title="Para gravar"
          emptyText="Nenhum roteiro pronto para gravacao ainda."
          item={opportunities.recordNow}
          onOpenVideo={onOpenVideo}
        />
        <RecommendationCard
          title="Publicacao rapida"
          emptyText="Complete roteiro e SEO para aparecer aqui."
          item={opportunities.quickWin}
          onOpenVideo={onOpenVideo}
        />
      </div>
    </section>
  );
}
