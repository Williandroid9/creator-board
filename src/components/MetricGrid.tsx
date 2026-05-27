import { useMemo } from "react";
import type { Video } from "../types";
import { getMetrics } from "../lib/video";

const visibleMetrics = new Set(["Em producao", "Atrasados", "Prontos para publicar", "Publicados no mes"]);

export function MetricGrid({ videos, weeklyGoal }: { videos: Video[]; weeklyGoal: number }) {
  const metrics = useMemo(
    () => getMetrics(videos, weeklyGoal).filter((metric) => visibleMetrics.has(metric.label)),
    [videos, weeklyGoal],
  );

  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => (
        <article key={metric.label} className="clean-panel rounded-2xl p-4">
          <p className="mb-2 text-xs font-black uppercase text-slate-500">{metric.label}</p>
          <strong className="text-3xl font-black tracking-normal text-white">{metric.value}</strong>
        </article>
      ))}
    </section>
  );
}
