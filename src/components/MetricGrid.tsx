import { useMemo } from "react";
import type { Video } from "../types";
import { getMetrics } from "../lib/video";
import { cx } from "./ui";

const visibleMetrics = new Set(["Em producao", "Atrasados", "Prontos para publicar", "Publicados no mes"]);

function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function MetricGrid({ videos, weeklyGoal }: { videos: Video[]; weeklyGoal: number }) {
  const metrics = useMemo(
    () => getMetrics(videos, weeklyGoal).filter((m) => visibleMetrics.has(m.label)),
    [videos, weeklyGoal],
  );

  const { thisMonthKey, lastMonthKey } = useMemo(() => {
    const now = new Date();
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return {
      thisMonthKey: getMonthKey(now),
      lastMonthKey: getMonthKey(lastMonthDate),
    };
  }, []);

  const publishedThisMonth = useMemo(
    () => videos.filter((v) => v.status === "Publicado" && v.publishedAt?.startsWith(thisMonthKey)).length,
    [videos, thisMonthKey],
  );

  const publishedLastMonth = useMemo(
    () => videos.filter((v) => v.status === "Publicado" && v.publishedAt?.startsWith(lastMonthKey)).length,
    [videos, lastMonthKey],
  );

  const publishedDelta = publishedThisMonth - publishedLastMonth;

  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => {
        const isPublishedMetric = metric.label === "Publicados no mes";
        const hasDelta = isPublishedMetric && publishedLastMonth > 0;
        const isOverdue = metric.label === "Atrasados" && Number(metric.value) > 0;
        const isReady = metric.label === "Prontos para publicar" && Number(metric.value) > 0;

        return (
          <article key={metric.label} className="clean-panel rounded-2xl p-4">
            <p className={cx(
              "mb-2 text-xs font-semibold uppercase",
              isOverdue ? "text-amber-400" : isReady ? "text-emerald-500" : "text-slate-500",
            )}>
              {metric.label}
            </p>
            <strong className={cx(
              "text-3xl font-black tracking-normal",
              isOverdue ? "text-amber-300" : isReady ? "text-emerald-300" : "text-white",
            )}>
              {metric.value}
            </strong>
            {hasDelta && (
              <p className={cx(
                "mt-1 text-xs font-bold",
                publishedDelta > 0 ? "text-emerald-400" : publishedDelta < 0 ? "text-red-400" : "text-slate-500",
              )}>
                {publishedDelta > 0 ? "+" : ""}{publishedDelta} vs mês anterior
              </p>
            )}
            {!hasDelta && isPublishedMetric && publishedLastMonth === 0 && (
              <p className="mt-1 text-xs font-bold text-slate-600">primeiro mês com dados</p>
            )}
          </article>
        );
      })}
    </section>
  );
}
