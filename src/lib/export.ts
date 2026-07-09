import type { AppData, Video } from "../types";
import { localDateKey } from "./date";
import { loadProgress } from "./achievements";
import { loadScoutState } from "./ideaScout";
import { loadNotifPrefs } from "./notifications";

function downloadTextFile(filename: string, type: string, content: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function csvCell(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

export type BackupExtras = {
  progress: ReturnType<typeof loadProgress>;
  scout: ReturnType<typeof loadScoutState>;
  notifPrefs: ReturnType<typeof loadNotifPrefs>;
};

// XP/conquistas, perfis do Caçador e preferências de notificação vivem fora do
// AppData (storages próprios) — entram no backup para sobreviver à troca de navegador.
export function buildBackupExtras(): BackupExtras {
  return {
    progress: loadProgress(),
    scout: loadScoutState(),
    notifPrefs: loadNotifPrefs(),
  };
}

export function exportJson(data: AppData, extras?: BackupExtras) {
  const payload = {
    app: "Creator Board",
    exportedAt: new Date().toISOString(),
    data,
    ...(extras ? { extras } : {}),
  };

  downloadTextFile(
    `creator-board-backup-${localDateKey()}.json`,
    "application/json",
    JSON.stringify(payload, null, 2),
  );
}

export function exportCsv(videos: Video[]) {
  const headers = [
    "Titulo",
    "Canal",
    "Nicho",
    "Formato",
    "Tipo de conteudo",
    "Status",
    "Prioridade",
    "Arquivado",
    "Data planejada",
    "Link publicado",
    "Views 24h",
    "Views Studio",
    "CTR",
    "Impressoes",
    "Retencao media",
    "Watch time horas",
    "Inscritos",
    "Horario publicado",
    "Periodo sincronizado",
    "Licoes",
    "Inspiracoes vinculadas",
    "Studio importado em",
    "Arquivo Studio",
    "Match Studio",
    "Criado por importacao legada",
    "Criado por API",
  ];
  const rows = videos.map((video) => [
    video.title,
    video.channel,
    video.niche,
    video.videoFormat,
    video.contentType,
    video.status,
    video.priority,
    video.archived ? "Sim" : "Nao",
    video.plannedDate,
    video.publishedLink,
    video.views24h,
    video.studioViews,
    video.ctr,
    video.studioImpressions,
    video.studioRetention,
    video.studioWatchTimeHours,
    video.studioSubscribers,
    video.studioPublishedHour,
    video.studioSyncPeriod,
    video.lessons,
    video.linkedInspirationIds.length,
    video.studioImportedAt,
    video.studioSourceFile,
    video.studioMatchedBy,
    video.studioCreatedFromCsv ? "Sim" : "Nao",
    video.studioCreatedFromOnline ? "Sim" : "Nao",
  ]);
  const content = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");

  downloadTextFile(`creator-board-videos-${localDateKey()}.csv`, "text/csv;charset=utf-8", content);
}
