import type { Video, VideoDraft } from "../types";
import { normalizeTitleKey } from "../lib/onlineSync";
import { Pill } from "./ui";

function metricNumber(value: string) {
  const parsed = Number(String(value || "").replace(",", ".").replace(/[^\d.]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function titleTerms(value: string) {
  return normalizeTitleKey(value)
    .split(" ")
    .filter((term) => term.length > 2);
}

function overlapScore(title: string, reference: string) {
  const current = new Set(titleTerms(title));
  const base = titleTerms(reference);
  if (!current.size || !base.length) {
    return 0;
  }

  const hits = base.filter((term) => current.has(term)).length;
  return hits / Math.max(current.size, base.length);
}

function hasSpecificPromise(title: string) {
  return /\b(como|erros?|guia|passo|melhor|pior|antes|depois|segredos?|dicas?|motivos?|formas?)\b/i.test(title);
}

export function TitleAnalyzer({ draft, videos }: { draft: VideoDraft; videos: Video[] }) {
  const title = draft.seoTitle || draft.title;
  const related = videos
    .filter((video) =>
      video.status === "Publicado" &&
      video.id !== draft.id &&
      ((draft.channelId && video.channelId === draft.channelId) || video.channel === draft.channel || video.niche === draft.niche),
    )
    .sort((a, b) => metricNumber(b.studioViews || b.views24h) - metricNumber(a.studioViews || a.views24h))
    .slice(0, 8);
  const bestMatch = related
    .map((video) => ({ video, score: overlapScore(title, video.title) }))
    .sort((a, b) => b.score - a.score)[0];
  const length = title.trim().length;
  const score =
    (length >= 35 && length <= 75 ? 30 : length >= 20 && length <= 90 ? 18 : 8) +
    (hasSpecificPromise(title) ? 25 : 8) +
    (draft.keyword && normalizeTitleKey(title).includes(normalizeTitleKey(draft.keyword)) ? 20 : 8) +
    (bestMatch?.score ? Math.min(25, Math.round(bestMatch.score * 60)) : 8);
  const finalScore = Math.max(0, Math.min(100, score));
  const label = finalScore >= 75 ? "Forte" : finalScore >= 50 ? "Ok" : "Fraco";

  return (
    <section className="rounded-xl border border-slate-700/45 bg-black/20 p-4">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase text-aqua">Analisador de titulo</p>
          <h3 className="mt-1 text-lg font-black text-white">{label} / {finalScore}</h3>
        </div>
        <Pill className="border-slate-700/60 bg-white/[0.04] text-slate-300">{length || 0} caracteres</Pill>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg bg-white/[0.045] p-3">
          <p className="text-xs font-black uppercase text-slate-500">Promessa</p>
          <p className="mt-1 text-sm font-bold text-slate-200">
            {hasSpecificPromise(title) ? "Tem gancho claro" : "Pode ficar mais especifico"}
          </p>
        </div>
        <div className="rounded-lg bg-white/[0.045] p-3">
          <p className="text-xs font-black uppercase text-slate-500">Historico parecido</p>
          <p className="mt-1 line-clamp-2 text-sm font-bold text-slate-200">
            {bestMatch?.score ? bestMatch.video.title : "Sem comparavel forte"}
          </p>
        </div>
      </div>

      {related.length ? (
        <div className="mt-4">
          <p className="mb-2 text-xs font-black uppercase text-slate-500">Referencias do canal</p>
          <div className="grid gap-2">
            {related.slice(0, 3).map((video) => (
              <div key={video.id} className="rounded-lg bg-white/[0.035] p-3">
                <p className="line-clamp-1 text-sm font-bold text-white">{video.title}</p>
                <p className="mt-1 text-xs font-bold text-slate-500">
                  {metricNumber(video.studioViews || video.views24h).toLocaleString("pt-BR")} views
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
