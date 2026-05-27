import type { VideoDraft } from "../types";
import { hasScript, hasSeo, hasThumbnail } from "./video";

export type QualityCheck = {
  label: string;
  passed: boolean;
  detail: string;
};

const CONTRAST_RE = /\b(contraste|cor|cores|fundo|escuro|claro|amarelo|vermelho|verde|branco|preto)\b/i;
const CURIOSITY_RE = /\b(erro|segredo|nao|nunca|antes|depois|verdade|mentira|por que|como|chocante|cuidado)\b|[?]/i;
const FACE_OBJECT_RE = /\b(rosto|face|expressao|objeto|print|tela|seta|grafico|produto|antes|depois)\b/i;
const MOBILE_RE = /\b(curto|grande|legivel|mobile|celular|poucas palavras|2 palavras|3 palavras)\b/i;
const PROMISE_RE = /\b(resultado|ganho|perder|evitar|crescer|aumentar|melhorar|rapido|facil|passo)\b/i;

function wordCount(value: string) {
  return String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

export function analyzeThumbnail(draft: VideoDraft) {
  const thumbnail = draft.thumbnailIdeas || "";
  const source = `${thumbnail} ${draft.title}`;
  const checks: QualityCheck[] = [
    {
      label: "Texto curto",
      passed: hasThumbnail(draft) && wordCount(thumbnail) <= 28,
      detail: "Ideia clara sem virar frase longa.",
    },
    {
      label: "Contraste",
      passed: CONTRAST_RE.test(source),
      detail: "Cores, fundo ou contraste definidos.",
    },
    {
      label: "Promessa visual",
      passed: PROMISE_RE.test(source),
      detail: "Mostra resultado, perda, ganho ou transformacao.",
    },
    {
      label: "Curiosidade",
      passed: CURIOSITY_RE.test(source),
      detail: "Cria tensao para o clique.",
    },
    {
      label: "Rosto/objeto",
      passed: FACE_OBJECT_RE.test(source),
      detail: "Tem elemento visual principal.",
    },
    {
      label: "Leitura pequena",
      passed: MOBILE_RE.test(source),
      detail: "Pensada para aparecer pequena no celular.",
    },
  ];
  const passed = checks.filter((check) => check.passed).length;

  return {
    checks,
    passed,
    total: checks.length,
    score: Math.round((passed / checks.length) * 100),
  };
}

export function getPublishReview(draft: VideoDraft) {
  const thumbnail = analyzeThumbnail(draft);
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
      label: "Thumbnail",
      passed: hasThumbnail(draft) && thumbnail.score >= 50,
      detail: "Ideia visual definida e revisada.",
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
    thumbnail,
    scheduleScore: Math.round((schedulePassed / scheduleChecks.length) * 100),
    publishScore: Math.round((publishPassed / checks.length) * 100),
    readyToSchedule: schedulePassed === scheduleChecks.length,
    readyToPublish: publishPassed === checks.length,
    blockers: checks.filter((check) => !check.passed),
  };
}
