import { useMemo } from "react";
import type { VideoDraft } from "../types";
import { buildBriefBlocks, buildVideoBriefText } from "../lib/scriptTemplates";
import { Button } from "./ui";

type VideoBriefProps = {
  draft: VideoDraft;
  onEditPlanning: () => void;
  onEditContent: () => void;
  onEditSeo: () => void;
  onSendToNotes: (brief: string) => void;
};

export function VideoBrief({ draft, onEditPlanning, onEditContent, onEditSeo, onSendToNotes }: VideoBriefProps) {
  const blocks = useMemo(() => buildBriefBlocks(draft), [draft.keyword, draft.niche, draft.seoDescription, draft.seoNotes, draft.seoTitle, draft.title, draft.videoFormat]);
  const briefText = useMemo(() => buildVideoBriefText(draft), [draft.channel, draft.keyword, draft.niche, draft.seoDescription, draft.seoTitle, draft.title, draft.videoFormat]);

  return (
    <section className="grid gap-4">
      <div className="rounded-xl border border-aqua/20 bg-aqua/10 p-4">
        <p className="text-xs font-black uppercase text-aqua">Brief automatico</p>
        <h3 className="mt-2 text-xl font-black text-white">{draft.title || "Video sem titulo"}</h3>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-300">
          Um resumo editavel do plano do video para gravar, revisar ou transformar em pauta.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button className="min-h-9 px-3 text-xs" onClick={() => onSendToNotes(briefText)}>
            Enviar para observacoes
          </Button>
          <Button className="min-h-9 px-3 text-xs" onClick={onEditPlanning}>
            Ajustar plano
          </Button>
          <Button className="min-h-9 px-3 text-xs" onClick={onEditContent}>
            Ajustar conteudo
          </Button>
          <Button className="min-h-9 px-3 text-xs" onClick={onEditSeo}>
            Ajustar SEO
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {blocks.map((block) => (
          <article key={block.title} className="rounded-xl border border-slate-700/45 bg-black/20 p-4">
            <p className="mb-2 text-xs font-black uppercase text-slate-500">{block.title}</p>
            <p className="text-sm font-semibold leading-6 text-slate-300">{block.body}</p>
          </article>
        ))}
      </div>

      <div className="rounded-xl border border-slate-700/45 bg-black/20 p-4">
        <p className="mb-3 text-sm font-black text-white">Brief completo</p>
        <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-lg bg-[#090e16] p-4 text-sm leading-6 text-slate-300">
          {briefText}
        </pre>
      </div>
    </section>
  );
}
