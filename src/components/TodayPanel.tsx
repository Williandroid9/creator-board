import { useMemo } from "react";
import type { DailyTask, Video } from "../types";
import { formatDate } from "../lib/date";
import { getTopOpportunities } from "../lib/opportunity";
import { hasScript, hasSeo, isOverdue, sortByPriorityAndDate } from "../lib/video";
import { Button, cx } from "./ui";

type TodayPanelProps = {
  videos: Video[];
  tasks: DailyTask[];
  productionDays: string[];
  onEnterFocus: () => void;
  onOpenVideo: (video: Video | null) => void;
  onToggleTask: (id: string) => void;
  weeklyGoal: number;
  onWeeklyGoalChange: (goal: number) => void;
};

export function TodayPanel({
  videos,
  tasks,
  productionDays,
  onEnterFocus,
  onOpenVideo,
  onToggleTask,
  weeklyGoal,
  onWeeklyGoalChange,
}: TodayPanelProps) {
  const opportunities = useMemo(() => getTopOpportunities(videos), [videos]);
  const recommendation = opportunities.quickWin || opportunities.recordNow || opportunities.top;
  const overdueVideos = useMemo(() => sortByPriorityAndDate(videos.filter(isOverdue)), [videos]);
  const pendingTasks = tasks.filter((task) => !task.done);
  const completedTasks = tasks.length - pendingTasks.length;
  const recommendedVideo = recommendation?.video || null;
  const recommendedScore = recommendation?.opportunity.score || 0;
  const taskBonus = Math.min(18, completedTasks * 3);
  const displayScore = Math.min(100, recommendedScore + taskBonus);
  const missingItems = recommendedVideo ? getMissingItems(recommendedVideo) : [];
  const productionProgress = recommendedVideo ? getProductionProgress(recommendedVideo) : null;
  const streak = useMemo(() => getProductionStreak(productionDays), [productionDays]);

  return (
    <section className="clean-panel rounded-2xl p-5 sm:p-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="mb-1 text-xs font-black uppercase text-aqua">Hoje</p>
          <h2 className="text-xl font-black sm:text-2xl">Proximo video recomendado</h2>
        </div>
        <Button variant="primary" onClick={onEnterFocus}>
          Modo foco
        </Button>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(16rem,0.75fr)_minmax(16rem,0.75fr)]">
        <article className="rounded-xl border border-aqua/15 bg-aqua/[0.055] p-4">
          {recommendedVideo ? (
            <>
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="mb-2 text-xs font-black uppercase text-aqua">{recommendation.opportunity.nextAction}</p>
                  <h3 className="line-clamp-2 text-xl font-black leading-tight text-white">{recommendedVideo.title}</h3>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-300">
                    {recommendation.opportunity.reasons.length
                      ? recommendation.opportunity.reasons.join(" / ")
                      : "Melhor combinacao entre prioridade, preparo e etapa atual."}
                  </p>
                </div>
                <div className={cx("shrink-0 rounded-xl border px-4 py-3 text-center", scoreTone(displayScore))}>
                  <p className="text-[0.68rem] font-black uppercase">Score</p>
                  <strong className="block text-2xl font-black">{displayScore}</strong>
                  {taskBonus ? <span className="text-[0.68rem] font-black">+{taskBonus} rotina</span> : null}
                </div>
              </div>

              <div className="mb-4 grid gap-2 sm:grid-cols-4">
                <MiniInfo label="Status" value={recommendedVideo.status} />
                <MiniInfo label="Prioridade" value={recommendedVideo.priority} />
                <MiniInfo label="Data" value={formatDate(recommendedVideo.plannedDate, "Sem data")} />
                <MiniInfo label="Canal" value={recommendedVideo.channel || "Sem canal"} />
              </div>

              {productionProgress ? <ProductionProgress progress={productionProgress} /> : null}

              <div className="mb-4 flex flex-wrap gap-2">
                {getReadinessItems(recommendedVideo).map((item) => (
                  <span
                    key={item.label}
                    className={cx(
                      "rounded-lg px-2.5 py-1 text-xs font-black",
                      item.done ? "bg-aqua/10 text-aqua" : "bg-amber-300/10 text-amber-100",
                    )}
                  >
                    {item.done ? "OK" : "Falta"} {item.label}
                  </span>
                ))}
              </div>

              {missingItems.length ? (
                <p className="mb-4 text-sm font-semibold leading-6 text-slate-400">
                  Para destravar: {missingItems.slice(0, 2).join(" e ")}.
                </p>
              ) : (
                <p className="mb-4 text-sm font-semibold leading-6 text-aqua">
                  Este video esta pronto para virar publicacao ou entrar em revisao final.
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                <Button variant="primary" onClick={() => onOpenVideo(recommendedVideo)}>
                  Trabalhar agora
                </Button>
                <Button onClick={onEnterFocus}>Entrar em foco</Button>
              </div>
            </>
          ) : (
            <>
              <p className="mb-2 text-sm font-bold text-slate-400">Sem video ativo</p>
              <h3 className="mb-2 text-lg font-black text-white">Cadastre a proxima ideia</h3>
              <p className="mb-4 text-sm leading-6 text-slate-300">
                O app precisa de pelo menos uma ideia ativa para recomendar o proximo passo.
              </p>
              <Button variant="primary" onClick={() => onOpenVideo(null)}>
                Cadastrar ideia
              </Button>
            </>
          )}
        </article>

        <article className="rounded-xl bg-white/[0.045] p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-slate-400">Tarefas</p>
              <p className="text-xs font-semibold text-slate-500">Check direto no dashboard</p>
            </div>
            <span className="text-sm font-black text-white">{completedTasks}/{tasks.length}</span>
          </div>
          {tasks.length ? (
            <div className="space-y-2">
              {tasks.slice(0, 6).map((task) => (
                <label
                  key={task.id}
                  className={cx(
                    "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 transition",
                    task.done
                      ? "border-aqua/15 bg-aqua/[0.055] text-aqua"
                      : "border-slate-800/80 bg-black/14 text-slate-300 hover:border-slate-700/80",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={task.done}
                    onChange={() => onToggleTask(task.id)}
                    className="h-4 w-4 accent-aqua"
                  />
                  <span className={cx("min-w-0 flex-1 truncate text-sm font-bold", task.done && "line-through")}>{task.title}</span>
                </label>
              ))}
              {tasks.length > 6 ? <p className="text-xs font-semibold text-slate-500">+{tasks.length - 6} tarefas na checklist completa.</p> : null}
            </div>
          ) : (
            <p className="text-sm leading-6 text-slate-300">Checklist concluida.</p>
          )}
          <div className="mt-4 rounded-lg border border-slate-800/80 bg-black/16 p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-black uppercase text-slate-500">Streak</p>
              <span className="text-sm font-black text-white">{streak.current} dia(s)</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">
              <div className="h-full rounded-full bg-aqua transition-all" style={{ width: `${Math.min(100, (streak.current / 7) * 100)}%` }} />
            </div>
            <p className="mt-2 text-xs font-semibold text-slate-500">
              {streak.current >= 7 ? "Multiplicador de consistencia ativo." : `${Math.max(0, 7 - streak.current)} dia(s) para ativar o multiplicador.`}
            </p>
          </div>
        </article>

        <article className="rounded-xl bg-white/[0.045] p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm font-bold text-slate-400">Atrasados</p>
            <span className="text-sm font-black text-white">{overdueVideos.length}</span>
          </div>
          {overdueVideos.length ? (
            <div className="space-y-2">
              {overdueVideos.slice(0, 2).map((video) => (
                <button
                  key={video.id}
                  className="block w-full rounded-lg bg-black/16 p-2 text-left text-sm text-slate-200 hover:bg-white/[0.06]"
                  onClick={() => onOpenVideo(video)}
                  type="button"
                >
                  <span className="line-clamp-2 font-bold">{video.title}</span>
                  <span className="text-xs text-slate-400">{formatDate(video.plannedDate)}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm leading-6 text-slate-300">Nada vencido.</p>
          )}
          <label className="mt-4 grid gap-2 text-xs font-bold text-slate-400">
            Meta semanal
            <input
              className="field-control py-2"
              type="number"
              min="1"
              value={weeklyGoal}
              onChange={(event) => onWeeklyGoalChange(Math.max(1, Number(event.target.value) || 1))}
            />
          </label>
        </article>
      </div>
    </section>
  );
}

type ProductionProgress = {
  percent: number;
  currentIndex: number;
};

const PRODUCTION_STAGES = ["Ideia", "Roteiro", "Locucao", "Edicao", "SEO", "Postado"];

function getProductionProgress(video: Video): ProductionProgress {
  const currentIndexByStatus: Record<Video["status"], number> = {
    Ideia: 0,
    Roteiro: 1,
    Gravacao: 2,
    Edicao: 3,
    SEO: 4,
    Agendado: 4,
    Publicado: 5,
  };
  const currentIndex = currentIndexByStatus[video.status] ?? 0;

  return {
    currentIndex,
    percent: Math.round((currentIndex / (PRODUCTION_STAGES.length - 1)) * 100),
  };
}

function ProductionProgress({ progress }: { progress: ProductionProgress }) {
  return (
    <div className="mb-4 rounded-xl border border-slate-700/35 bg-black/18 p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-xs font-black uppercase text-slate-500">Conclusao de conteudo</p>
        <span className="text-xs font-black text-white">{progress.percent}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-800">
        <div className="h-full rounded-full bg-aqua transition-all" style={{ width: `${progress.percent}%` }} />
      </div>
      <div className="mt-3 grid grid-cols-6 gap-1">
        {PRODUCTION_STAGES.map((stage, index) => (
          <span
            key={stage}
            className={cx(
              "truncate rounded-md px-1.5 py-1 text-center text-[0.62rem] font-black",
              index <= progress.currentIndex ? "bg-aqua/10 text-aqua" : "bg-white/[0.04] text-slate-600",
            )}
            title={stage}
          >
            {stage}
          </span>
        ))}
      </div>
    </div>
  );
}

function getProductionStreak(days: string[]) {
  const unique = new Set(days.filter(Boolean));
  let current = 0;
  const cursor = new Date();

  while (unique.has(toDateKey(cursor))) {
    current += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return { current };
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getReadinessItems(video: Video) {
  return [
    { label: "roteiro", done: hasScript(video) },
    { label: "SEO", done: hasSeo(video) },
    { label: "data", done: Boolean(video.plannedDate) },
  ];
}

function getMissingItems(video: Video) {
  return getReadinessItems(video)
    .filter((item) => !item.done)
    .map((item) => item.label);
}

function scoreTone(score: number) {
  if (score >= 72) {
    return "border-aqua/25 bg-aqua/10 text-aqua";
  }

  if (score >= 48) {
    return "border-amber-300/25 bg-amber-300/10 text-amber-100";
  }

  return "border-slate-700/60 bg-white/[0.04] text-slate-300";
}

function MiniInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg bg-black/18 px-3 py-2">
      <p className="text-[0.68rem] font-black uppercase text-slate-500">{label}</p>
      <p className="mt-1 truncate text-xs font-black text-slate-100">{value}</p>
    </div>
  );
}
