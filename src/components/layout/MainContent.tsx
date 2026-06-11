import { useApp } from "../../context/AppContext";
import { ArchivePanel } from "../ArchivePanel";
import { BottleneckPanel } from "../BottleneckPanel";
import { ChannelInsightsPanel } from "../ChannelInsightsPanel";
import { ChannelPanel } from "../ChannelPanel";
import { ChannelPulsePanel } from "../ChannelPulsePanel";
import { AchievementsPanel } from "../AchievementsPanel";
import { DailyBrief } from "../DailyBrief";
import { ProductionHeatmap } from "../ProductionHeatmap";
import { DailyChecklist } from "../DailyChecklist";
import { DataPanel } from "../DataPanel";
import { Filters } from "../Filters";
import { FocusMode } from "../FocusMode";
import { IdeaScoutPanel } from "../IdeaScoutPanel";
import { InspirationBank } from "../InspirationBank";
import { KanbanBoard } from "../KanbanBoard";
import { MetricGrid } from "../MetricGrid";
import { OnboardingPanel } from "../OnboardingPanel";
import { OpportunityPanel } from "../OpportunityPanel";
import { PerformancePanel } from "../PerformancePanel";
import { ShortcutsModal } from "../ShortcutsModal";
import { SmartWeeklyPlanner } from "../SmartWeeklyPlanner";
import { TodayPanel } from "../TodayPanel";
import { TrendsPanel } from "../TrendsPanel";
import { WeeklyCalendar } from "../WeeklyCalendar";
import { formatDate } from "../../lib/date";
import { setScoutSeed } from "../../lib/ideaScout";
import { makeId } from "../../lib/video";
import { buildBackupExtras, exportCsv, exportJson } from "../../lib/export";

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

      {/* ── Production (Dashboard) ─────────────────────────────────────────── */}
      {activeView === "production" && (
        <>
          {/* Daily Brief banner */}
          <DailyBrief
            videos={scopedActiveVideos}
            weeklyGoal={data.settings.weeklyGoal}
            productionDays={data.settings.productionDays}
            unlockedAchievements={progress.achievements}
          />

          {(!data.channels.length || !scopedActiveVideos.length) && (
            <OnboardingPanel
              hasChannels={Boolean(data.channels.length)}
              hasVideos={Boolean(scopedActiveVideos.length)}
              onOpenChannels={() => setActiveView("channels")}
              onCreateIdea={openCreate}
            />
          )}

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

          <ChannelPulsePanel channel={activeChannel} videos={scopedActiveVideos} />

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

          {/* Planning & diagnostics – always visible, no details/summary */}
          <section className="clean-panel rounded-2xl p-4 sm:p-5">
            <div className="mb-5">
              <p className="mb-0.5 text-xs font-black uppercase tracking-wider text-slate-500">Ferramentas</p>
              <h2 className="text-lg font-black text-white">Planejamento & Diagnósticos</h2>
            </div>
            <div className="grid gap-5 2xl:grid-cols-[340px_minmax(0,1fr)]">
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
              <div className="space-y-5">
                <MetricGrid videos={scopedActiveVideos} weeklyGoal={data.settings.weeklyGoal} />
                <OpportunityPanel videos={scopedActiveVideos} onOpenVideo={openVideo} onCreate={openCreate} />
                <SmartWeeklyPlanner
                  videos={scopedActiveVideos}
                  weeklyGoal={data.settings.weeklyGoal}
                  onOpenVideo={openVideo}
                  onApplyPlan={applyWeeklyPlan}
                />
                <BottleneckPanel videos={scopedActiveVideos} onOpenVideo={openVideo} />
              </div>
            </div>
          </section>
        </>
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
    </main>
  );
}
