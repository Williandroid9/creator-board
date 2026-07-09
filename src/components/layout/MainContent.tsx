import { Suspense, lazy } from "react";
import { useApp } from "../../context/AppContext";
// Eager: o Dashboard (primeiro paint) + o que está sempre montado.
import { DailyBrief } from "../DailyBrief";
import { Filters } from "../Filters";
import { FocusMode } from "../FocusMode";
import { KanbanBoard } from "../KanbanBoard";
import { OnboardingPanel } from "../OnboardingPanel";
import { ShortcutsModal } from "../ShortcutsModal";
import { TodayPanel } from "../TodayPanel";
import { formatDate } from "../../lib/date";
import { setScoutSeed } from "../../lib/ideaScout";
import { getVideoAwaitingReview } from "../../lib/performance";
import { makeId } from "../../lib/video";
import { buildBackupExtras, exportCsv, exportJson } from "../../lib/export";

// Lazy: cada tela fora do Dashboard vira um chunk carregado sob demanda,
// enxugando o bundle inicial (Fase 4 da auditoria).
const ArchivePanel = lazy(() => import("../ArchivePanel").then((m) => ({ default: m.ArchivePanel })));
const BottleneckPanel = lazy(() => import("../BottleneckPanel").then((m) => ({ default: m.BottleneckPanel })));
const ChannelInsightsPanel = lazy(() => import("../ChannelInsightsPanel").then((m) => ({ default: m.ChannelInsightsPanel })));
const ChannelPanel = lazy(() => import("../ChannelPanel").then((m) => ({ default: m.ChannelPanel })));
const ChannelPulsePanel = lazy(() => import("../ChannelPulsePanel").then((m) => ({ default: m.ChannelPulsePanel })));
const AchievementsPanel = lazy(() => import("../AchievementsPanel").then((m) => ({ default: m.AchievementsPanel })));
const ProductionHeatmap = lazy(() => import("../ProductionHeatmap").then((m) => ({ default: m.ProductionHeatmap })));
const DailyChecklist = lazy(() => import("../DailyChecklist").then((m) => ({ default: m.DailyChecklist })));
const DataPanel = lazy(() => import("../DataPanel").then((m) => ({ default: m.DataPanel })));
const IdeaScoutPanel = lazy(() => import("../IdeaScoutPanel").then((m) => ({ default: m.IdeaScoutPanel })));
const InspirationBank = lazy(() => import("../InspirationBank").then((m) => ({ default: m.InspirationBank })));
const MetricGrid = lazy(() => import("../MetricGrid").then((m) => ({ default: m.MetricGrid })));
const OpportunityPanel = lazy(() => import("../OpportunityPanel").then((m) => ({ default: m.OpportunityPanel })));
const PerformancePanel = lazy(() => import("../PerformancePanel").then((m) => ({ default: m.PerformancePanel })));
const SmartWeeklyPlanner = lazy(() => import("../SmartWeeklyPlanner").then((m) => ({ default: m.SmartWeeklyPlanner })));
const TrendsPanel = lazy(() => import("../TrendsPanel").then((m) => ({ default: m.TrendsPanel })));
const WeeklyCalendar = lazy(() => import("../WeeklyCalendar").then((m) => ({ default: m.WeeklyCalendar })));

function PanelFallback() {
  return (
    <div className="flex items-center justify-center py-24 text-sm font-semibold text-slate-500">
      Carregando…
    </div>
  );
}

export function MainContent() {
  const {
    data,
    filters,
    setFilters,
    activeView,
    activeChannel,
    activeChannelId,
    setActiveChannel,
    setActiveView,
    focusMode,
    setFocusMode,
    compactKanban,
    setCompactKanban,
    shortcutsOpen,
    setShortcutsOpen,
    scopedActiveVideos,
    filteredVideos,
    searchedVideos,
    searchedArchivedVideos,
    backupSnapshots,
    backupStats,
    importRef,
    openCreate,
    openVideo,
    createVideo,
    updateVideo,
    moveVideo,
    duplicateVideo,
    toggleArchiveVideo,
    updateTasks,
    setWeeklyGoal,
    applyWeeklyPlan,
    saveInspiration,
    deleteInspiration,
    saveTrend,
    deleteTrend,
    saveChannel,
    saveChannels,
    deleteChannel,
    disconnectChannel,
    syncYouTubeOnline,
    clearYouTubeOnlineSync,
    handleImport,
    handleCreateRestorePoint,
    handleRestoreSnapshot,
    handleDeleteSnapshot,
    handleDownloadSnapshot,
    setToast,
    progress,
    achievementCtx,
  } = useApp();

  if (focusMode) {
    return (
      <FocusMode
        videos={scopedActiveVideos}
        tasks={data.dailyChecklist.tasks}
        onExit={() => setFocusMode(false)}
        onOpenVideo={openVideo}
        onMove={moveVideo}
        onToggleTask={(id) =>
          updateTasks((tasks) => tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)))
        }
      />
    );
  }

  return (
    <main className="mx-auto max-w-[1800px] space-y-5 px-4 py-5 sm:px-6 lg:px-8">
      {/* Shortcuts modal — available on all views */}
      <ShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />

      <Suspense fallback={<PanelFallback />}>
      {/* ── Production (Dashboard) ─────────────────────────────────────────── */}
      {/* Enxuto de propósito: 1 decisão acima da dobra (TodayPanel) + o pipeline.
          Diagnósticos e planejamento moraram aqui e viraram a aba "Análise". */}
      {activeView === "production" && (
        <>
          {/* Barra compacta de stats (XP, streak, meta, atrasados) */}
          <DailyBrief
            videos={scopedActiveVideos}
            weeklyGoal={data.settings.weeklyGoal}
            productionDays={data.settings.productionDays}
            unlockedAchievements={progress.achievements}
            xpFloor={progress.xpFloor ?? 0}
          />

          {(!data.channels.length || !scopedActiveVideos.length) && (
            <OnboardingPanel
              hasChannels={Boolean(data.channels.length)}
              hasVideos={Boolean(scopedActiveVideos.length)}
              onOpenChannels={() => setActiveView("channels")}
              onCreateIdea={openCreate}
            />
          )}

          {/* A decisão do dia: próximo vídeo recomendado + tarefas + atrasados */}
          <TodayPanel
            videos={scopedActiveVideos}
            tasks={data.dailyChecklist.tasks}
            productionDays={data.settings.productionDays}
            onEnterFocus={() => setFocusMode(true)}
            onOpenVideo={openVideo}
            onToggleTask={(id) =>
              updateTasks((tasks) => tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)))
            }
            weeklyGoal={data.settings.weeklyGoal}
            onWeeklyGoalChange={setWeeklyGoal}
          />

          {/* Loop de aprendizado: lembrete para revisar um vídeo recém-publicado */}
          {(() => {
            const review = getVideoAwaitingReview(scopedActiveVideos);
            if (!review) return null;
            return (
              <button
                type="button"
                onClick={() => openVideo(review.video)}
                className="flex w-full items-center gap-3 rounded-2xl border border-sky-400/20 bg-sky-500/[0.05] px-5 py-3.5 text-left transition hover:border-sky-400/40 hover:bg-sky-500/[0.08]"
              >
                <span className="shrink-0 text-lg">📊</span>
                <span className="min-w-0 flex-1">
                  <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-sky-400">
                    Aprenda com o último vídeo
                  </span>
                  <span className="block truncate text-sm font-bold text-white">
                    "{review.video.title}" está no ar há {review.days} dias — como foi vs sua média?
                  </span>
                </span>
                <span className="shrink-0 rounded-lg bg-sky-500/15 px-3 py-1.5 text-xs font-bold text-sky-300">
                  Revisar →
                </span>
              </button>
            );
          })()}

          {/* Pipeline */}
          <section className="space-y-4">
            <Filters videos={scopedActiveVideos} filters={filters} onChange={setFilters} />
            <KanbanBoard
              videos={filteredVideos}
              allVideos={scopedActiveVideos}
              compact={compactKanban}
              onCompactChange={setCompactKanban}
              onOpen={openVideo}
              onMove={moveVideo}
              onDuplicate={duplicateVideo}
              onArchive={toggleArchiveVideo}
            />
          </section>

          {/* Atalho para os diagnósticos que saíram daqui */}
          <button
            type="button"
            onClick={() => setActiveView("analysis")}
            className="w-full rounded-2xl border border-dashed border-slate-400/15 bg-panel/40 px-5 py-4 text-left transition hover:border-aqua/30 hover:bg-aqua/[0.04]"
          >
            <span className="text-sm font-bold text-slate-300">
              📊 Métricas, oportunidades, plano semanal e gargalos agora vivem na aba{" "}
              <span className="text-aqua">Análise</span> →
            </span>
          </button>
        </>
      )}

      {/* ── Análise (diagnósticos e planejamento) ─────────────────────────── */}
      {activeView === "analysis" && (
        <div className="space-y-5">
          <MetricGrid videos={scopedActiveVideos} weeklyGoal={data.settings.weeklyGoal} />
          <ChannelPulsePanel channel={activeChannel} videos={scopedActiveVideos} />
          <OpportunityPanel videos={scopedActiveVideos} onOpenVideo={openVideo} onCreate={openCreate} />
          <SmartWeeklyPlanner
            videos={scopedActiveVideos}
            weeklyGoal={data.settings.weeklyGoal}
            onOpenVideo={openVideo}
            onApplyPlan={applyWeeklyPlan}
          />
          <BottleneckPanel videos={scopedActiveVideos} onOpenVideo={openVideo} />
          <DailyChecklist
            tasks={data.dailyChecklist.tasks}
            onToggle={(id) =>
              updateTasks((tasks) => tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)))
            }
            onRename={(id, title) =>
              updateTasks((tasks) => tasks.map((t) => (t.id === id ? { ...t, title } : t)))
            }
            onRemove={(id) => updateTasks((tasks) => tasks.filter((t) => t.id !== id))}
            onAdd={(title) => updateTasks((tasks) => [...tasks, { id: makeId(), title, done: false }])}
            onReset={() => updateTasks((tasks) => tasks.map((t) => ({ ...t, done: false })))}
          />
        </div>
      )}

      {/* ── Channels ──────────────────────────────────────────────────────── */}
      {activeView === "channels" && (
        <ChannelPanel
          channels={data.channels}
          videos={data.videos}
          syncHistory={data.syncHistory}
          activeChannelId={activeChannelId}
          onActiveChannelChange={setActiveChannel}
          onSave={saveChannel}
          onSaveMany={saveChannels}
          onOpenInsights={(channelId) => {
            setActiveChannel(channelId);
            setActiveView("insights");
          }}
          onOpenPerformance={(channelId) => {
            setActiveChannel(channelId);
            setActiveView("performance");
          }}
          onDisconnect={disconnectChannel}
          onDelete={deleteChannel}
          onYouTubeOnlineSync={syncYouTubeOnline}
          onClearYouTubeOnlineSync={clearYouTubeOnlineSync}
        />
      )}

      {/* ── Insights ──────────────────────────────────────────────────────── */}
      {activeView === "insights" && (
        <ChannelInsightsPanel
          channels={data.channels}
          videos={data.videos}
          onOpenVideo={openVideo}
          onCreateIdea={createVideo}
        />
      )}

      {/* ── Caçador de Ideias (ex-Radar) ──────────────────────────────────── */}
      {activeView === "radar" && <IdeaScoutPanel />}

      {/* ── Trends / Banco de Ideias ───────────────────────────────────────── */}
      {activeView === "trends" && (
        <TrendsPanel
          trends={data.trends}
          onSave={saveTrend}
          onDelete={deleteTrend}
          onCreateIdea={createVideo}
          onHuntSimilar={(trend) => {
            const context = [trend.title, trend.ideaAngle, trend.opportunityReason]
              .filter(Boolean)
              .join(" — ");
            setScoutSeed(`Foque a caçada em ângulos parecidos com esta oportunidade do meu Banco de Ideias: ${context}`);
            setActiveView("radar");
            setToast("Semente enviada ao Caçador de Ideias.");
          }}
        />
      )}

      {/* ── Calendar ──────────────────────────────────────────────────────── */}
      {activeView === "calendar" && (
        <WeeklyCalendar
          videos={searchedVideos}
          onOpen={openVideo}
          onReschedule={(video, date) => {
            updateVideo({ ...video, plannedDate: date }, "autosave");
            setToast(`"${video.title}" reagendado para ${formatDate(date)}.`);
          }}
        />
      )}

      {/* ── References ────────────────────────────────────────────────────── */}
      {activeView === "references" && (
        <InspirationBank
          inspirations={data.inspirations}
          onSave={saveInspiration}
          onDelete={deleteInspiration}
        />
      )}

      {/* ── Performance ───────────────────────────────────────────────────── */}
      {activeView === "performance" && (
        <PerformancePanel videos={searchedVideos} onOpen={openVideo} />
      )}

      {/* ── Archive ───────────────────────────────────────────────────────── */}
      {activeView === "archive" && (
        <ArchivePanel
          videos={searchedArchivedVideos}
          onOpen={openVideo}
          onRestore={toggleArchiveVideo}
          onDuplicate={duplicateVideo}
        />
      )}

      {/* ── Progress / Conquistas ─────────────────────────────────────────── */}
      {activeView === "progress" && (
        <div className="space-y-6">
          <ProductionHeatmap
            videos={data.videos}
            productionDays={data.settings.productionDays}
          />
          <AchievementsPanel
            videos={data.videos}
            unlockedAchievements={progress.achievements}
            xpFloor={progress.xpFloor ?? 0}
            ctx={achievementCtx}
          />
        </div>
      )}

      {/* ── Data ──────────────────────────────────────────────────────────── */}
      {activeView === "data" && (
        <DataPanel
          dataStats={backupStats}
          backupSnapshots={backupSnapshots}
          syncHistory={data.syncHistory}
          onExportJson={() => {
            exportJson(data, buildBackupExtras());
            setToast("Backup JSON exportado (com progresso e Caçador).");
          }}
          onExportSheet={() => {
            exportCsv(data.videos);
            setToast("Planilha exportada.");
          }}
          onImportBackup={handleImport}
          onCreateRestorePoint={handleCreateRestorePoint}
          onRestoreSnapshot={handleRestoreSnapshot}
          onDeleteSnapshot={handleDeleteSnapshot}
          onDownloadSnapshot={handleDownloadSnapshot}
          backupInputRef={importRef}
        />
      )}
      </Suspense>
    </main>
  );
}
