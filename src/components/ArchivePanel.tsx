import type { Video } from "../types";
import { formatDate } from "../lib/date";
import { sortByPriorityAndDate } from "../lib/video";
import { Button } from "./ui";

type ArchivePanelProps = {
  videos: Video[];
  onOpen: (video: Video) => void;
  onRestore: (id: string) => void;
  onDuplicate: (id: string) => void;
};

export function ArchivePanel({ videos, onOpen, onRestore, onDuplicate }: ArchivePanelProps) {
  const sorted = sortByPriorityAndDate(videos);

  return (
    <section className="clean-panel rounded-2xl p-5">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 text-xs font-black uppercase text-aqua">Arquivo</p>
          <h2 className="text-xl font-black sm:text-2xl">Videos arquivados</h2>
        </div>
        <p className="text-sm font-bold text-slate-500">{sorted.length} item{sorted.length === 1 ? "" : "s"}</p>
      </div>

      {sorted.length ? (
        <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
          {sorted.map((video) => (
            <article key={video.id} className="rounded-xl border border-slate-700/35 bg-[#111722] p-4">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="line-clamp-2 text-sm font-black text-white">{video.title}</h3>
                  <p className="mt-1 truncate text-xs font-bold text-slate-500">
                    {[video.channel, video.niche].filter(Boolean).join(" / ") || "Sem canal"}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-white/[0.06] px-2 py-1 text-xs font-black text-slate-300">
                  {video.status}
                </span>
              </div>
              <p className="text-xs font-bold text-slate-500">Planejado: {formatDate(video.plannedDate, "Sem data")}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button className="min-h-9 px-3 text-xs" onClick={() => onOpen(video)}>
                  Abrir
                </Button>
                <Button className="min-h-9 px-3 text-xs" onClick={() => onRestore(video.id)}>
                  Restaurar
                </Button>
                <Button className="min-h-9 px-3 text-xs" onClick={() => onDuplicate(video.id)}>
                  Duplicar
                </Button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-700/70 p-6 text-sm font-semibold text-slate-500">
          Nenhum video arquivado. Use arquivar para limpar o Kanban sem excluir ideias antigas.
        </div>
      )}
    </section>
  );
}
