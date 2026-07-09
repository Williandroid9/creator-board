import type { ChangeEvent, RefObject } from "react";
import type { SyncHistoryItem } from "../types";
import type { BackupSnapshot, BackupStats } from "../lib/backup";
import { Button, Pill } from "./ui";

type DataPanelProps = {
  dataStats: BackupStats;
  backupSnapshots: BackupSnapshot[];
  syncHistory: SyncHistoryItem[];
  onExportJson: () => void;
  onExportSheet: () => void;
  onImportBackup: (event: ChangeEvent<HTMLInputElement>) => void;
  onCreateRestorePoint: () => void;
  onRestoreSnapshot: (id: string) => void;
  onDeleteSnapshot: (id: string) => void;
  onDownloadSnapshot: (id: string) => void;
  backupInputRef: RefObject<HTMLInputElement>;
};

function formatDateTime(value: string) {
  if (!value) {
    return "Nunca";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function reasonLabel(reason: BackupSnapshot["reason"]) {
  if (reason === "manual") {
    return "Manual";
  }

  if (reason === "import") {
    return "Antes de importar";
  }

  if (reason === "restore") {
    return "Antes de restaurar";
  }

  return "Automatico";
}

function StatCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <article className="rounded-xl bg-white/[0.045] p-4">
      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
      <strong className="mt-2 block text-2xl font-black text-white">{value}</strong>
      <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{detail}</p>
    </article>
  );
}

export function DataPanel({
  dataStats,
  backupSnapshots,
  syncHistory,
  onExportJson,
  onExportSheet,
  onImportBackup,
  onCreateRestorePoint,
  onRestoreSnapshot,
  onDeleteSnapshot,
  onDownloadSnapshot,
  backupInputRef,
}: DataPanelProps) {
  const latestBackup = backupSnapshots[0] || null;

  return (
    <div className="space-y-5">
      <section className="clean-panel rounded-2xl p-5">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase text-aqua">Seguranca local</p>
            <h2 className="text-xl font-black sm:text-2xl">Dados e backup</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Crie pontos de restauracao no navegador e baixe uma copia completa quando quiser guardar fora do app.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 xl:justify-end">
            <Button variant="primary" onClick={onCreateRestorePoint}>
              Criar ponto de seguranca
            </Button>
            <Button onClick={onExportJson}>Baixar backup JSON</Button>
            <Button onClick={() => backupInputRef.current?.click()}>Restaurar arquivo</Button>
            <Button onClick={onExportSheet}>Exportar planilha</Button>
            <input
              ref={backupInputRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={onImportBackup}
            />
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Videos salvos"
            value={String(dataStats.videos)}
            detail={`${dataStats.activeVideos} ativos / ${dataStats.publishedVideos} publicados`}
          />
          <StatCard
            label="Canais"
            value={String(dataStats.channels)}
            detail="Perfis, metas e conexoes do YouTube"
          />
          <StatCard
            label="Biblioteca"
            value={String(dataStats.trends)}
            detail={`${dataStats.trends} temas / ${dataStats.inspirations} referencias`}
          />
          <StatCard
            label="Ultimo backup"
            value={latestBackup ? formatDateTime(latestBackup.createdAt) : "Nenhum"}
            detail={latestBackup ? reasonLabel(latestBackup.reason) : "Crie um ponto de seguranca agora"}
          />
        </div>
      </section>

      <section className="clean-panel rounded-2xl p-5">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase text-aqua">Restauracao</p>
            <h2 className="text-xl font-black sm:text-2xl">Pontos de seguranca</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              O app cria um backup automatico por dia e tambem salva uma copia antes de importar ou restaurar.
            </p>
          </div>
          <Pill className="border-slate-700/60 bg-white/[0.04] text-slate-300">
            {backupSnapshots.length}/8 salvos
          </Pill>
        </div>

        {backupSnapshots.length ? (
          <div className="grid gap-3 xl:grid-cols-2">
            {backupSnapshots.map((snapshot) => (
              <article key={snapshot.id} className="rounded-xl border border-slate-700/45 bg-[#111722] p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="line-clamp-1 text-sm font-black text-white">{snapshot.label}</h3>
                      <Pill className="border-slate-700/60 bg-white/[0.04] text-slate-300">
                        {reasonLabel(snapshot.reason)}
                      </Pill>
                    </div>
                    <p className="mt-2 text-xs font-bold text-slate-500">{formatDateTime(snapshot.createdAt)}</p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button className="min-h-9 px-3 text-xs" variant="primary" onClick={() => onRestoreSnapshot(snapshot.id)}>
                      Restaurar
                    </Button>
                    <Button className="min-h-9 px-3 text-xs" onClick={() => onDownloadSnapshot(snapshot.id)}>
                      Baixar
                    </Button>
                    <Button className="min-h-9 px-3 text-xs" variant="danger" onClick={() => onDeleteSnapshot(snapshot.id)}>
                      Excluir
                    </Button>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-bold text-slate-400 md:grid-cols-4">
                  <span className="rounded-lg bg-black/18 px-3 py-2">{snapshot.stats.videos} videos</span>
                  <span className="rounded-lg bg-black/18 px-3 py-2">{snapshot.stats.channels} canais</span>
                  <span className="rounded-lg bg-black/18 px-3 py-2">{snapshot.stats.publishedVideos} publicados</span>
                  <span className="rounded-lg bg-black/18 px-3 py-2">{snapshot.stats.trends} ideias</span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-700/70 p-5">
            <h3 className="text-base font-black text-white">Nenhum ponto de seguranca ainda</h3>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
              Crie um ponto manual agora. Depois disso, o app tambem guarda uma copia automatica por dia.
            </p>
            <Button className="mt-4" variant="primary" onClick={onCreateRestorePoint}>
              Criar primeiro ponto
            </Button>
          </div>
        )}
      </section>

      <section className="clean-panel rounded-2xl p-5">
        <div className="mb-4">
          <p className="mb-1 text-xs font-semibold uppercase text-aqua">Historico</p>
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
