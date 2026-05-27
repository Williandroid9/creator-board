import { useEffect, useMemo, useState } from "react";
import type { DailyTask, Video, VideoStatus } from "../types";
import { getFocusChecklist, getRecommendation, nextStatus } from "../lib/video";
import { Button } from "./ui";

type FocusModeProps = {
  videos: Video[];
  tasks: DailyTask[];
  onExit: () => void;
  onOpenVideo: (video: Video | null) => void;
  onMove: (id: string, status: VideoStatus) => void;
  onToggleTask: (id: string) => void;
};

function formatTimer(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

export function FocusMode({ videos, tasks, onExit, onOpenVideo, onMove, onToggleTask }: FocusModeProps) {
  const recommendation = useMemo(() => getRecommendation(videos), [videos]);
  const focusChecklist = useMemo(() => getFocusChecklist(recommendation.video), [recommendation.video]);
  const [seconds, setSeconds] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const next = recommendation.video ? nextStatus(recommendation.video.status) : null;

  useEffect(() => {
    if (!running || seconds <= 0) {
      return undefined;
    }

    const timer = window.setInterval(() => setSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [running, seconds]);

  return (
    <main className="mx-auto max-w-5xl space-y-5">
      <section className="glass-panel rounded-2xl p-6 sm:p-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="mb-2 text-xs font-black uppercase text-aqua">Modo foco</p>
            <h2 className="text-2xl font-black sm:text-4xl">{recommendation.label}</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">{recommendation.detail}</p>
          </div>
          <Button onClick={onExit}>Sair do foco</Button>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <article className="rounded-2xl bg-black/20 p-5">
            <p className="mb-2 text-sm font-bold text-slate-400">Vídeo em foco</p>
            <h3 className="text-xl font-black">{recommendation.video?.title || "Nenhum vídeo cadastrado"}</h3>
            <p className="mt-2 text-sm text-slate-400">
              {recommendation.video ? `${recommendation.video.niche} - ${recommendation.video.status}` : "Cadastre uma ideia para iniciar o fluxo."}
            </p>

            <div className="mt-5 grid gap-2">
              {focusChecklist.map((item) => (
                <div key={item} className="rounded-xl bg-white/[0.045] px-3 py-2 text-sm font-semibold text-slate-200">
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

          <aside className="rounded-2xl bg-black/20 p-5">
            <p className="mb-3 text-sm font-bold text-slate-400">Sprint de criação</p>
            <div className="text-6xl font-black tabular-nums">{formatTimer(seconds)}</div>
            <div className="mt-5 flex gap-2">
              <Button variant="primary" onClick={() => setRunning((value) => !value)}>
                {running ? "Pausar" : "Iniciar"}
              </Button>
              <Button
                onClick={() => {
                  setRunning(false);
                  setSeconds(25 * 60);
                }}
              >
                Resetar
              </Button>
            </div>
          </aside>
        </div>
      </section>

      <section className="clean-panel rounded-2xl p-5">
        <h3 className="mb-4 text-lg font-black">Checklist rápida de hoje</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {tasks.map((task) => (
            <label key={task.id} className="flex items-center gap-3 rounded-xl bg-white/[0.045] p-3 text-sm font-semibold text-slate-200">
              <input type="checkbox" checked={task.done} onChange={() => onToggleTask(task.id)} className="h-5 w-5 accent-aqua" />
              <span className={task.done ? "text-slate-500 line-through" : ""}>{task.title}</span>
            </label>
          ))}
        </div>
      </section>
    </main>
  );
}
