import type { Video } from "../types";

// Fluxo de produção do criador. Os 3 primeiros (preparo) são feitos em qualquer
// ordem; os 4 últimos (pós) são sequenciais. É um checklist por vídeo,
// independente das colunas do Kanban.

export type ProductionPhase = "prep" | "pos";

export type ProductionStep = {
  id: string;
  label: string;
  phase: ProductionPhase;
};

export const PRODUCTION_STEPS: ProductionStep[] = [
  { id: "thumb", label: "Thumb", phase: "prep" },
  { id: "titulo", label: "Título", phase: "prep" },
  { id: "roteiro", label: "Roteiro", phase: "prep" },
  { id: "narracao", label: "Fazer narração", phase: "pos" },
  { id: "edicao", label: "Ilustração / Edição", phase: "pos" },
  { id: "naolistado", label: "Subir não-listado", phase: "pos" },
  { id: "programar", label: "Programar publicação", phase: "pos" },
];

const STEP_IDS = new Set(PRODUCTION_STEPS.map((s) => s.id));

export function normalizeProductionSteps(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.map((v) => String(v)).filter((id) => STEP_IDS.has(id)))];
}

export function productionProgress(video: Pick<Video, "productionSteps">) {
  const done = new Set(video.productionSteps ?? []);
  const completed = PRODUCTION_STEPS.filter((s) => done.has(s.id)).length;
  const total = PRODUCTION_STEPS.length;
  return { completed, total, percent: total ? Math.round((completed / total) * 100) : 0 };
}

// Próximo passo na ordem do fluxo: o primeiro incompleto (preparo antes do pós).
export function nextProductionStep(video: Pick<Video, "productionSteps">): ProductionStep | null {
  const done = new Set(video.productionSteps ?? []);
  return PRODUCTION_STEPS.find((s) => !done.has(s.id)) ?? null;
}

export function hasProductionTracking(video: Pick<Video, "productionSteps">): boolean {
  return (video.productionSteps?.length ?? 0) > 0;
}
