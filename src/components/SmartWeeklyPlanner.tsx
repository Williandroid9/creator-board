import { useMemo, useState } from "react";
import type { Video } from "../types";
import { buildSmartWeeklyPlan, type WeeklyPlanItem } from "../lib/weeklyPlan";
import { Button, Pill, cx } from "./ui";

type SmartWeeklyPlannerProps = {
  videos: Video[];
  weeklyGoal: number;
  onOpenVideo: (video: Video) => void;
  onApplyPlan: (items: WeeklyPlanItem[]) => void;
};

function scoreTone(score: number) {
  if (score >= 72) {
    return "border-aqua/25 bg-aqua/10 text-aqua";
  }

  if (score >= 48) {
    return "border-amber-300/25 bg-amber-300/10 text-amber-100";
  }

  return "border-slate-700/60 bg-white/[0.035] text-slate-300";
}

export function SmartWeeklyPlanner({ videos, weeklyGoal, onOpenVideo, onApplyPlan }: SmartWeeklyPlannerProps) {
  const [planVisible, setPlanVisible] = useState(false);
  const [revision, setRevision] = useState(0);
  const plan = useMemo(() => buildSmartWeeklyPlan(videos, weeklyGoal), [revision, videos, weeklyGoal]);
  const items = useMemo(() => plan.days.flatMap((day) => day.items), [plan.days]);

  return (
    <section className="clean-panel rounded-2xl p-5">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase text-aqua">Planejamento semanal</p>
          <h2 className="text-xl font-black text-white sm:text-2xl">Semana sugerida</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
            Distribui escrita, gravacao, edicao, SEO e publicacao com base em score, atrasos e meta semanal.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Pill className="border-slate-700/60 bg-white/[0.035] text-slate-300">{plan.totalItems} acoes</Pill>
          <Pill className="border-slate-700/60 bg-white/[0.035] text-slate-300">{plan.readyToPublish} prontos</Pill>
          <Pill className={cx("border-slate-700/60 bg-white/[0.035]", plan.overdue ? "text-amber-100" : "text-slate-300")}>
            {plan.overdue} atrasados
          </Pill>
          <Button
            onClick={() => {
              setPlanVisible(true);
              setRevision((current) => current + 1);
            }}
          >
            Montar semana
          </Button>
          <Button variant="primary" disabled={!items.length} onClick={() => onApplyPlan(items)}>
            Aplicar datas
          </Button>
        </div>
      </div>

      {!planVisible ? (
        <div className="rounded-xl border border-dashed border-slate-700/70 p-5 text-sm font-semibold leading-6 text-slate-500">
          Clique em Montar semana para ver a sugestao. Aplicar datas preenche o calendario editorial sem alterar status.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
          {plan.days.map((day) => (
            <article key={day.date} className="min-h-[13rem] rounded-xl bg-black/18 p-3">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="text-sm font-black text-white">{day.dayLabel}</h3>
                <span className="rounded-full bg-white/[0.06] px-2 py-1 text-xs font-black text-slate-400">
                  {day.items.length}
                </span>
              </div>

              {day.items.length ? (
                <div className="grid gap-2">
                  {day.items.map((item) => (
                    <div key={item.id} className="rounded-xl border border-slate-700/35 bg-[#111722] p-3">
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <p className="line-clamp-2 text-sm font-black leading-snug text-white">{item.video.title}</p>
                        <span className={cx("shrink-0 rounded-md border px-2 py-1 text-[0.68rem] font-black", scoreTone(item.score))}>
                          {item.score}
                        </span>
                      </div>
                      <p className="text-xs font-semibold uppercase text-aqua">{item.action}</p>
                      <p className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-slate-500">{item.reason}</p>
                      <Button className="mt-3 min-h-8 w-full px-3 text-xs" onClick={() => onOpenVideo(item.video)}>
                        Abrir
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-lg border border-dashed border-slate-700/60 p-3 text-sm leading-6 text-slate-600">
                  Buffer para imprevistos.
                </p>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
