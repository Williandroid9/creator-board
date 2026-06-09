import { useApp } from "../../context/AppContext";
import { ArchivePanel } from "../ArchivePanel";
import { AssetSnowballPanel } from "../AssetSnowballPanel";
import { BottleneckPanel } from "../BottleneckPanel";
import { ChannelInsightsPanel } from "../ChannelInsightsPanel";
import { ChannelPanel } from "../ChannelPanel";
import { ChannelPulsePanel } from "../ChannelPulsePanel";
import { DailyChecklist } from "../DailyChecklist";
import { DataPanel } from "../DataPanel";
import { Filters } from "../Filters";
import { FocusMode } from "../FocusMode";
import { InspirationBank } from "../InspirationBank";
import { KanbanBoard } from "../KanbanBoard";
import { MetricGrid } from "../MetricGrid";
import { OnboardingPanel } from "../OnboardingPanel";
import { OpportunityPanel } from "../OpportunityPanel";
import { PerformancePanel } from "../PerformancePanel";
import { RadarPanel } from "../RadarPanel";
import { SmartWeeklyPlanner } from "../SmartWeeklyPlanner";
import { TodayPanel } from "../TodayPanel";
import { TrendsPanel } from "../TrendsPanel";
import { WeeklyCalendar } from "../WeeklyCalendar";
import { makeId } from "../../lib/video";
import { exportCsv, exportJson } from "../../lib/export";

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
    saveRadarCompetitor,
    deleteRadarCompetitor,
    runRadar,
    createFromRadarIdea,
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
      {/* ── Production (Dashboard) ─────────────────────────────────────────── */}
      {activeView === "production" && (
        <>
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

          <AssetSnowballPanel
            videos={scopedActiveVideos}
            channels={activeChannel ? [activeChannel] : data.channels}
            weeklyGoal={activeChannel?.weeklyGoal || data.settings.weeklyGoal}
            compact
          />

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

          <details className="clean-panel rounded-2xl p-4 sm:p-5">
            <summary className="cursor-pointer list-none">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="mb-1 text-xs font-black uppercase text-slate-500">Avançado</p>
                  <h2 className="text-lg font-black text-white">Planejamento e diagnósticos</h2>
                </div>
                <span className="text-sm font-black text-slate-500">Abrir ferramentas secundárias</span>
              </div>
            </summary>
            <div className="mt-5 grid gap-5 2xl:grid-cols-[340px_minmax(0,1fr)]">
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
          </details>
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

      {/* ── Radar ─────────────────────────────────────────────────────────── */}
      {activeView === "radar" && (
        <RadarPanel
          activeChannel={activeChannel}
          videos={data.videos}
          trends={data.trends}
          inspirations={data.inspirations}
          radar={data.radar}
          onRun={runRadar}
          onSaveCompetitor={saveRadarCompetitor}
          onDeleteCompetitor={deleteRadarCompetitor}
          onCreateFromIdea={createFromRadarIdea}
        />
      )}

      {/* ── Trends / Banco de Ideias ───────────────────────────────────────── */}
      {activeView === "trends" && (
        <TrendsPanel
          trends={data.trends}
          onSave={saveTrend}
          onDelete={deleteTrend}
          onCreateIdea={createVideo}
        />
      )}

      {/* ── Calendar ──────────────────────────────────────────────────────── */}
      {activeView === "calendar" && (
        <WeeklyCalendar videos={searchedVideos} onOpen={openVideo} />
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

      {/* ── Data ──────────────────────────────────────────────────────────── */}
      {activeView === "data" && (
        <DataPanel
          dataStats={backupStats}
          backupSnapshots={backupSnapshots}
          syncHistory={data.syncHistory}
          onExportJson={() => {
            exportJson(data);
            setToast("Backup JSON exportado.");
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
