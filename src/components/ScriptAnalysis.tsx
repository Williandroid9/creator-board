import { useMemo } from "react";
import type { VideoDraft } from "../types";
import { hasSeo, hasThumbnail } from "../lib/video";
import { Button, cx } from "./ui";

type ScriptAnalysisProps = {
  draft: VideoDraft;
  onEditContent: () => void;
  onEditSeo: () => void;
};

type AnalysisItem = {
  label: string;
  passed: boolean;
  detail: string;
};

const PROMISE_RE = /\b(como|guia|passo|erros?|melhor|resultado|aumentar|evitar|antes|depois|rapido)\b/i;
const HOOK_RE = /\b(erro|segredo|pare|antes|como|por que|voce|ninguem|cuidado|evite|descubra)\b|[?]/i;
const CTA_RE = /\b(inscrev|comenta|curt|link|compartilh|salva|siga|baixe|acesse)\b/i;
const RETENTION_RE = /\b(mas|antes|no final|exemplo|agora|proximo|repare|olha|entao)\b/i;

function countWords(value: string) {
  return String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function analyzeScript(draft: VideoDraft) {
  const script = draft.script || "";
  const firstBlock = script.slice(0, 360);
  const wordCount = countWords(script);
  const items: AnalysisItem[] = [
    {
      label: "Promessa clara",
      passed: PROMISE_RE.test(`${draft.title} ${firstBlock}`),
      detail: "Titulo ou abertura indicam transformacao, erro ou resultado.",
    },
    {
      label: "Gancho inicial",
      passed: HOOK_RE.test(firstBlock),
      detail: "Abertura cria curiosidade nos primeiros segundos.",
    },
    {
      label: "Corpo suficiente",
      passed: wordCount >= 120,
      detail: `${wordCount} palavras no roteiro.`,
    },
    {
      label: "Estrutura em blocos",
      passed: script.includes("\n") && wordCount >= 80,
      detail: "Roteiro separado em partes facilita gravacao e edicao.",
    },
    {
      label: "Retencao",
      passed: RETENTION_RE.test(script),
      detail: "Usa transicoes, exemplos ou loops para manter interesse.",
    },
    {
      label: "CTA",
      passed: CTA_RE.test(script),
      detail: "Pede uma acao clara sem depender de improviso.",
    },
    {
      label: "Thumbnail conectada",
      passed: hasThumbnail(draft),
      detail: "A ideia visual conversa com promessa e gancho.",
    },
    {
      label: "SEO minimo",
      passed: hasSeo(draft) && Boolean(draft.keyword.trim()),
      detail: "Titulo, descricao/notas e palavra-chave definidos.",
    },
  ];

  const passed = items.filter((item) => item.passed).length;
  const score = Math.round((passed / items.length) * 100);
  const suggestions = items
    .filter((item) => !item.passed)
    .slice(0, 4)
    .map((item) => {
      if (item.label === "Promessa clara") {
        return "Reescreva a abertura para deixar claro o resultado que o publico ganha.";
      }
      if (item.label === "Gancho inicial") {
        return "Comece com uma pergunta, erro comum ou promessa concreta nos primeiros 15 segundos.";
      }
      if (item.label === "Corpo suficiente") {
        return "Expanda o roteiro com exemplos, passos e transicoes antes de gravar.";
      }
      if (item.label === "Estrutura em blocos") {
        return "Separe o roteiro em gancho, contexto, passos, exemplo e CTA.";
      }
      if (item.label === "Retencao") {
        return "Inclua frases de transicao e pequenas recompensas para segurar a atencao.";
      }
      if (item.label === "CTA") {
        return "Adicione um CTA simples ligado ao objetivo do video.";
      }
      if (item.label === "Thumbnail conectada") {
        return "Defina uma thumbnail com contraste, texto curto e conflito visual.";
      }
      return "Complete palavra-chave, titulo SEO e descricao antes de agendar.";
    });

  return { items, passed, score, suggestions };
}

export function ScriptAnalysis({ draft, onEditContent, onEditSeo }: ScriptAnalysisProps) {
  const analysis = useMemo(
    () => analyzeScript(draft),
    [draft.keyword, draft.script, draft.seoDescription, draft.seoNotes, draft.seoTitle, draft.thumbnailIdeas, draft.title],
  );
  const scoreTone =
    analysis.score >= 75
      ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-100"
      : analysis.score >= 45
        ? "border-amber-300/25 bg-amber-300/10 text-amber-100"
        : "border-rose-300/25 bg-rose-300/10 text-rose-100";

  return (
    <section className="grid gap-4">
      <div className={cx("rounded-xl border p-4", scoreTone)}>
        <p className="text-xs font-black uppercase opacity-70">Analise local</p>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-4xl font-black">{analysis.score}%</p>
            <p className="mt-1 text-sm font-bold opacity-80">
              {analysis.passed}/{analysis.items.length} pontos prontos para producao.
            </p>
          </div>
          <div className="flex gap-2">
            <Button className="min-h-9 px-3 text-xs" onClick={onEditContent}>
              Ajustar roteiro
            </Button>
            <Button className="min-h-9 px-3 text-xs" onClick={onEditSeo}>
              Ajustar SEO
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {analysis.items.map((item) => (
          <div key={item.label} className="rounded-xl border border-slate-700/45 bg-black/20 p-4">
            <div className="flex items-start gap-3">
              <span className={cx("mt-1 h-2.5 w-2.5 shrink-0 rounded-full", item.passed ? "bg-emerald-300" : "bg-amber-300")} />
              <div className="min-w-0">
                <p className="text-sm font-black text-white">{item.label}</p>
                <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{item.detail}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-700/45 bg-black/20 p-4">
        <p className="mb-3 text-sm font-black text-white">Proximos ajustes</p>
        {analysis.suggestions.length ? (
          <div className="grid gap-2">
            {analysis.suggestions.map((suggestion) => (
              <p key={suggestion} className="rounded-lg bg-white/[0.045] px-3 py-2 text-sm font-semibold leading-6 text-slate-300">
                {suggestion}
              </p>
            ))}
          </div>
        ) : (
          <p className="text-sm font-semibold text-slate-400">
            Roteiro, thumbnail e SEO estao coerentes. Agora vale revisar ritmo de gravacao e cortes.
          </p>
        )}
      </div>
    </section>
  );
}
