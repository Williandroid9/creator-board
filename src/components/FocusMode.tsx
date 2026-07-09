import { useEffect, useMemo, useState } from "react";
import type { DailyTask, Video, VideoStatus } from "../types";
import { getFocusChecklist, getRecommendation, nextStatus } from "../lib/video";
import { Button, cx } from "./ui";

type FocusModeProps = {
  videos: Video[];
  tasks: DailyTask[];
  onExit: () => void;
  onOpenVideo: (video: Video | null) => void;
  onMove: (id: string, status: VideoStatus) => void;
  onToggleTask: (id: string) => void;
};

const TIMER_PRESETS = [
  { label: "15 min", seconds: 15 * 60 },
  { label: "25 min", seconds: 25 * 60 },
  { label: "50 min", seconds: 50 * 60 },
];

function formatTimer(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

export function FocusMode({ videos, tasks, onExit, onOpenVideo, onMove, onToggleTask }: FocusModeProps) {
  const recommendation = useMemo(() => getRecommendation(videos), [videos]);
  const focusChecklist = useMemo(() => getFocusChecklist(recommendation.video), [recommendation.video]);
  const [preset, setPreset] = useState(TIMER_PRESETS[1]);
  const [seconds, setSeconds] = useState(preset.seconds);
  const [running, setRunning] = useState(false);
  const [expired, setExpired] = useState(false);
  const next = recommendation.video ? nextStatus(recommendation.video.status) : null;

  // Apply preset when changed (only if timer is stopped)
  const applyPreset = (p: typeof TIMER_PRESETS[number]) => {
    if (running) return;
    setPreset(p);
    setSeconds(p.seconds);
    setExpired(false);
  };

  useEffect(() => {
    if (!running) return undefined;
    if (seconds <= 0) {
      setRunning(false);
      setExpired(true);
      return undefined;
    }
    const timer = window.setInterval(() => setSeconds((v) => Math.max(0, v - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [running, seconds]);

  const progress = preset.seconds > 0 ? 1 - seconds / preset.seconds : 0;

  return (
    <main className="mx-auto max-w-5xl space-y-5 px-4 py-5 sm:px-6">
      <section className="glass-panel rounded-2xl p-6 sm:p-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase text-aqua">Modo Foco</p>
            <h2 className="text-2xl font-black sm:text-4xl">{recommendation.label}</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">{recommendation.detail}</p>
          </div>
          <Button onClick={onExit}>Sair do foco</Button>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          {/* Video card */}
          <article className="rounded-2xl bg-black/20 p-5">
            <p className="mb-2 text-sm font-bold text-slate-400">Vídeo em foco</p>
            <h3 className="text-xl font-black">{recommendation.video?.title || "Nenhum vídeo cadastrado"}</h3>
            <p className="mt-2 text-sm text-slate-400">
              {recommendation.video
                ? `${recommendation.video.niche} · ${recommendation.video.status}`
                : "Cadastre uma ideia para iniciar o fluxo."}
            </p>

            <div className="mt-5 grid gap-2">
              {focusChecklist.map((item) => (
                <div key={item} className="flex items-center gap-2.5 rounded-xl bg-white/[0.045] px-3 py-2.5 text-sm font-semibold text-slate-200">
                  <span className="size-2 shrink-0 rounded-full bg-aqua/50" />
                  {item}
                </div>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <Button onClick={() => onOpenVideo(recommendation.video)}>Abrir detalhes</Button>
              {recommendation.video && next && (
                <Button variant="primary" onClick={() => onMove(recommendation.video!.id, next)}>
                  Avançar para {next}
                </Button>
              )}
            </div>
          </article>

          {/* Timer */}
          <aside className="flex flex-col rounded-2xl bg-black/20 p-5">
            <p className="mb-3 text-sm font-bold text-slate-400">Pomodoro</p>

            {/* Preset selector */}
            <div className="mb-4 flex gap-2">
              {TIMER_PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => applyPreset(p)}
                  disabled={running}
                  className={cx(
                    "flex-1 rounded-lg py-1.5 text-xs font-bold transition",
                    preset.label === p.label
                      ? "bg-aqua/15 text-aqua ring-1 ring-aqua/30"
                      : "bg-white/[0.05] text-slate-400 hover:bg-white/[0.08] disabled:opacity-40",
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Timer display */}
            <div className="relative my-2 flex flex-col items-center gap-1">
              <div
                className={cx(
                  "text-6xl font-black tabular-nums transition-colors",
                  expired ? "text-amber-300" : running ? "text-white" : "text-slate-300",
                )}
              >
                {formatTimer(seconds)}
              </div>
              {expired && (
                <p className="text-xs font-black text-amber-300 animate-pulse">Tempo esgotado!</p>
              )}
              {/* Progress bar */}
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className={cx(
                    "h-full rounded-full transition-all duration-1000",
                    expired ? "bg-amber-300" : "bg-aqua",
                  )}
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
            </div>

            <div className="mt-auto flex gap-2 pt-4">
              <Button
                variant={running ? "ghost" : "primary"}
                className="flex-1"
                onClick={() => {
                  if (expired) {
                    setExpired(false);
                    setSeconds(preset.seconds);
                  }
                  setRunning((v) => !v);
                }}
              >
                {expired ? "Reiniciar" : running ? "Pausar" : "Iniciar"}
              </Button>
              <Button
                onClick={() => {
                  setRunning(false);
                  setExpired(false);
                  setSeconds(preset.seconds);
                }}
              >
                Reset
              </Button>
            </div>
          </aside>
        </div>
      </section>

      {/* Daily checklist */}
      {tasks.length > 0 && (
        <section className="clean-panel rounded-2xl p-5">
          <h3 className="mb-4 text-lg font-black">Checklist rápida de hoje</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {tasks.map((task) => (
              <label
                key={task.id}
                className="flex cursor-pointer items-center gap-3 rounded-xl bg-white/[0.045] p-3 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.07]"
              >
                <input
                  type="checkbox"
                  checked={task.done}
                  onChange={() => onToggleTask(task.id)}
                  className="h-5 w-5 accent-aqua"
                />
                <span className={task.done ? "text-slate-500 line-through" : ""}>{task.title}</span>
              </label>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
