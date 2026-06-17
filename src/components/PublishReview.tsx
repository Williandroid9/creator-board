import { useMemo } from "react";
import type { VideoDraft } from "../types";
import { getPublishReview } from "../lib/quality";
import { Button, cx } from "./ui";

type PublishReviewProps = {
  draft: VideoDraft;
  onEditPlanning: () => void;
  onEditContent: () => void;
  onEditSeo: () => void;
  onEditPublishing: () => void;
  onSchedule: () => void;
  onPublish: () => void;
};

function scoreTone(score: number) {
  if (score >= 90) {
    return "border-emerald-300/25 bg-emerald-300/10 text-emerald-100";
  }

  if (score >= 65) {
    return "border-amber-300/25 bg-amber-300/10 text-amber-100";
  }

  return "border-rose-300/25 bg-rose-300/10 text-rose-100";
}

function jumpForLabel(label: string, handlers: Pick<PublishReviewProps, "onEditPlanning" | "onEditContent" | "onEditSeo" | "onEditPublishing">) {
  if (label === "Roteiro") return handlers.onEditContent;
  if (label === "SEO") return handlers.onEditSeo;
  if (label === "Link publicado") return handlers.onEditPublishing;
  return handlers.onEditPlanning;
}

export function PublishReview({
  draft,
  onEditPlanning,
  onEditContent,
  onEditSeo,
  onEditPublishing,
  onSchedule,
  onPublish,
}: PublishReviewProps) {
  const review = useMemo(
    () => getPublishReview(draft),
    [
      draft.keyword,
      draft.niche,
      draft.notes,
      draft.plannedDate,
      draft.publishedLink,
      draft.script,
      draft.seoDescription,
      draft.seoNotes,
      draft.seoTitle,
      draft.title,
      draft.videoFormat,
    ],
  );

  return (
    <section className="grid gap-4">
      <div className={cx("rounded-xl border p-4", scoreTone(review.scheduleScore))}>
        <p className="text-xs font-semibold uppercase opacity-70">Revisao antes de publicar</p>
        <div className="mt-2 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-4xl font-black">{review.scheduleScore}%</p>
            <p className="mt-1 text-sm font-bold opacity-80">
              Pronto para agendar. Publicacao: {review.publishScore}%.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button className="min-h-9 px-3 text-xs" disabled={!review.readyToSchedule} onClick={onSchedule}>
              Mover para Agendado
            </Button>
            <Button className="min-h-9 px-3 text-xs" variant="primary" disabled={!review.readyToPublish} onClick={onPublish}>
              Marcar Publicado
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {review.checks.map((check) => {
          const jump = jumpForLabel(check.label, { onEditPlanning, onEditContent, onEditSeo, onEditPublishing });

          return (
            <button
              key={check.label}
              type="button"
              className="rounded-xl border border-slate-700/45 bg-black/20 p-4 text-left transition hover:bg-white/[0.045]"
              onClick={jump}
            >
              <div className="flex items-start gap-3">
                <span className={cx("mt-1 h-2.5 w-2.5 shrink-0 rounded-full", check.passed ? "bg-emerald-300" : "bg-amber-300")} />
                <div className="min-w-0">
                  <p className="text-sm font-black text-white">{check.label}</p>
                  <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{check.detail}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {review.blockers.length ? (
        <div className="rounded-xl border border-slate-700/45 bg-black/20 p-4">
          <p className="mb-3 text-sm font-black text-white">Pendencias criticas</p>
          <div className="flex flex-wrap gap-2">
            {review.blockers.map((blocker) => (
              <span key={blocker.label} className="rounded-md bg-amber-300/10 px-2 py-1 text-xs font-black text-amber-100">
                {blocker.label}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
