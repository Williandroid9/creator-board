import type { VideoDraft } from "../types";
import { hasScript, hasSeo } from "./video";

export type QualityCheck = {
  label: string;
  passed: boolean;
  detail: string;
};

export function getPublishReview(draft: VideoDraft) {
  const checks: QualityCheck[] = [
    {
      label: "Titulo",
      passed: Boolean(draft.title.trim()),
      detail: "Titulo principal definido.",
    },
    {
      label: "Nicho",
      passed: Boolean(draft.niche.trim()),
      detail: "Nicho preenchido para filtros e contexto.",
    },
    {
      label: "Data",
      passed: Boolean(draft.plannedDate),
      detail: "Data planejada no calendario editorial.",
    },
    {
      label: "Formato/brief",
      passed: Boolean(draft.videoFormat || draft.notes.toLowerCase().includes("brief")),
      detail: "Formato ou brief definidos para orientar producao.",
    },
    {
      label: "Roteiro",
      passed: hasScript(draft),
      detail: "Roteiro ou estrutura gravavel pronta.",
    },
    {
      label: "SEO",
      passed: hasSeo(draft) && Boolean(draft.keyword.trim()),
      detail: "Palavra-chave, titulo/descricao/notas de SEO.",
    },
    {
      label: "Link publicado",
      passed: Boolean(draft.publishedLink.trim()),
      detail: "Necessario apenas para marcar como Publicado.",
    },
  ];
  const scheduleChecks = checks.filter((check) => check.label !== "Link publicado");
  const schedulePassed = scheduleChecks.filter((check) => check.passed).length;
  const publishPassed = checks.filter((check) => check.passed).length;

  return {
    checks,
    scheduleScore: Math.round((schedulePassed / scheduleChecks.length) * 100),
    publishScore: Math.round((publishPassed / checks.length) * 100),
    readyToSchedule: schedulePassed === scheduleChecks.length,
    readyToPublish: publishPassed === checks.length,
    blockers: checks.filter((check) => !check.passed),
  };
}
