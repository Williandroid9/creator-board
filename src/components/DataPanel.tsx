import type { ChangeEvent, RefObject } from "react";
import type { SyncHistoryItem } from "../types";
import { Button } from "./ui";

type DataPanelProps = {
  syncHistory: SyncHistoryItem[];
  onExportJson: () => void;
  onExportSheet: () => void;
  onImportBackup: (event: ChangeEvent<HTMLInputElement>) => void;
  backupInputRef: RefObject<HTMLInputElement>;
};

export function DataPanel({
  syncHistory,
  onExportJson,
  onExportSheet,
  onImportBackup,
  backupInputRef,
}: DataPanelProps) {
  return (
    <div className="space-y-5">
      <section className="clean-panel rounded-2xl p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-black sm:text-2xl">Dados e backup</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Guarde uma copia completa do Creator Board ou exporte uma planilha quando precisar analisar fora do app.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={onExportJson}>Backup JSON</Button>
            <Button onClick={onExportSheet}>Exportar planilha</Button>
            <Button onClick={() => backupInputRef.current?.click()}>Importar backup</Button>
            <input
              ref={backupInputRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={onImportBackup}
            />
          </div>
        </div>
      </section>

      <section className="clean-panel rounded-2xl p-5">
        <div className="mb-4">
          <p className="mb-1 text-xs font-black uppercase text-aqua">Historico</p>
          <h2 className="text-xl font-black sm:text-2xl">Sincronizacoes recentes</h2>
        </div>
        {syncHistory.length ? (
          <div className="grid gap-2 lg:grid-cols-2">
            {syncHistory.slice(0, 8).map((item) => (
              <article key={item.id} className="rounded-xl bg-white/[0.045] p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="line-clamp-1 text-sm font-black text-white">{item.channelName}</p>
                    <p className="mt-1 text-xs font-bold text-slate-500">
                      {item.source === "CSV" ? "Importacao legada" : item.source} / {item.periodLabel || "sem periodo"}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-md bg-white/[0.055] px-2 py-1 text-[0.68rem] font-black text-slate-300">
                    {new Date(item.syncedAt).toLocaleDateString("pt-BR")}
                  </span>
                </div>
                <p className="mt-3 text-xs font-bold text-slate-400">
                  {item.updated} atualizados / {item.created} criados / {item.skipped} ignorados
                </p>
              </article>
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-slate-700/70 p-4 text-sm font-semibold text-slate-500">
            Nenhuma sincronizacao registrada ainda.
          </p>
        )}
      </section>
    </div>
  );
}
