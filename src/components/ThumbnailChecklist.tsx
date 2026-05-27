import { useMemo } from "react";
import type { VideoDraft } from "../types";
import { analyzeThumbnail } from "../lib/quality";
import { Button, cx } from "./ui";

type ThumbnailChecklistProps = {
  draft: VideoDraft;
  onEditThumbnail: () => void;
};

function scoreTone(score: number) {
  if (score >= 75) {
    return "border-emerald-300/25 bg-emerald-300/10 text-emerald-100";
  }

  if (score >= 50) {
    return "border-amber-300/25 bg-amber-300/10 text-amber-100";
  }

  return "border-rose-300/25 bg-rose-300/10 text-rose-100";
}

export function ThumbnailChecklist({ draft, onEditThumbnail }: ThumbnailChecklistProps) {
  const analysis = useMemo(() => analyzeThumbnail(draft), [draft.thumbnailIdeas, draft.title]);

  return (
    <section className="grid gap-4">
      <div className={cx("rounded-xl border p-4", scoreTone(analysis.score))}>
        <p className="text-xs font-black uppercase opacity-70">Thumbnail</p>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-4xl font-black">{analysis.score}%</p>
            <p className="mt-1 text-sm font-bold opacity-80">
              {analysis.passed}/{analysis.total} criterios fortes.
            </p>
          </div>
          <Button className="min-h-9 px-3 text-xs" onClick={onEditThumbnail}>
            Ajustar thumbnail
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {analysis.checks.map((check) => (
          <div key={check.label} className="rounded-xl border border-slate-700/45 bg-black/20 p-4">
            <div className="flex items-start gap-3">
              <span className={cx("mt-1 h-2.5 w-2.5 shrink-0 rounded-full", check.passed ? "bg-emerald-300" : "bg-amber-300")} />
              <div className="min-w-0">
                <p className="text-sm font-black text-white">{check.label}</p>
                <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{check.detail}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
