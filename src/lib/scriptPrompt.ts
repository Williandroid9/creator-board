import type { VideoDraft } from "../types";
import type { ScoutIdea, ScoutProfile } from "./ideaScout";
import { getScriptTemplate } from "./scriptTemplates";

// Monta um prompt rico para você colar no Claude (claude.ai) e gerar o roteiro
// com controle total — sem gastar tokens da API dentro do app.

const CLAUDE_URL = "https://claude.ai/new";

function line(label: string, value: string | undefined | null): string | null {
  const v = (value ?? "").trim();
  return v ? `- ${label}: ${v}` : null;
}

// Bloco de DNA do canal — compartilhado entre vídeo e ideia do Caçador.
function channelDnaBlock(profile: ScoutProfile | null, fallbackChannel: string, fallbackNiche: string): string[] {
  const lines = [
    line("Canal", profile?.channelName || fallbackChannel),
    line("Nicho", profile?.niche || fallbackNiche),
    line("Audiência-alvo", profile?.audience),
    line("Formato", profile?.format),
    line("Estilo de vídeo", profile?.style),
    line("Tom de voz", profile?.tone),
    line("Formatos que JÁ performaram", profile?.provenFormats),
    line("Formatos a evitar", profile?.flopFormats),
    line("Restrições de produção", profile?.constraints),
  ].filter(Boolean) as string[];

  return lines.length ? lines : ["- (Preencha o DNA do canal na aba Caçador de Ideias para roteiros mais afiados.)"];
}

const INSTRUCTIONS = (sections: string[]) =>
  [
    "## SUA TAREFA",
    "Escreva o ROTEIRO COMPLETO deste vídeo de YouTube, pronto para gravar, no idioma do canal.",
    "",
    "Regras:",
    "- Abra com um gancho forte nos primeiros 15 segundos (promessa, pergunta provocativa ou erro comum).",
    "- Respeite o tom de voz e o estilo do canal acima — não soe genérico nem corporativo.",
    "- Escreva em blocos com subtítulos, falando como a pessoa fala (texto para narrar, não artigo).",
    "- Marque sugestões de corte, B-roll ou tela com [entre colchetes].",
    "- Inclua retenção: ganchos abertos, exemplos concretos e mini-recompensas ao longo do vídeo.",
    "- Termine com um CTA claro e específico ligado ao objetivo do vídeo.",
    "",
    `Estrutura sugerida (adapte se algo melhor surgir): ${sections.join(" → ")}.`,
    "",
    "Antes do roteiro, escreva 1 linha com o ângulo central. Depois entregue o roteiro completo.",
  ].join("\n");

export function buildScriptPrompt(draft: VideoDraft, profile: ScoutProfile | null): string {
  const template = getScriptTemplate(draft.videoFormat);

  const videoBlock = [
    line("Título", draft.title || "(defina um título)"),
    line("Palavra-chave principal", draft.keyword),
    line("Formato", template.label),
    line("Notas/observações já anotadas", draft.notes),
    line("Roteiro/rascunho já existente", draft.script),
  ].filter(Boolean) as string[];

  return [
    "Você é um roteirista de YouTube experiente, especializado neste canal.",
    "",
    "## DNA DO CANAL",
    ...channelDnaBlock(profile, draft.channel, draft.niche),
    "",
    "## O VÍDEO",
    ...videoBlock,
    "",
    INSTRUCTIONS(template.sections),
  ].join("\n");
}

export function buildScriptPromptFromIdea(
  idea: ScoutIdea,
  profile: ScoutProfile | null,
  channelName: string,
  niche: string,
): string {
  const template = getScriptTemplate("");

  const ideaBlock = [
    line("Título", idea.title),
    line("Título (EN)", idea.title_en && idea.title_en !== idea.title ? idea.title_en : ""),
    line("Ângulo / Hook", idea.angle_hook),
    line("Por que pode bombar", idea.why_can_pop),
    line("Riscos a evitar no roteiro", idea.risks),
    idea.evidence.length
      ? `- Evidências da pesquisa de mercado:\n${idea.evidence.map((e) => `  • ${e}`).join("\n")}`
      : null,
  ].filter(Boolean) as string[];

  return [
    "Você é um roteirista de YouTube experiente, especializado neste canal.",
    "Esta ideia foi validada por uma pesquisa de mercado (Caçador de Ideias) — use as evidências para guiar os ângulos.",
    "",
    "## DNA DO CANAL",
    ...channelDnaBlock(profile, channelName, niche),
    "",
    "## A IDEIA VALIDADA",
    ...ideaBlock,
    "",
    INSTRUCTIONS(template.sections),
  ].join("\n");
}

// Copia o texto e abre o Claude numa nova aba. Retorna true se copiou.
export async function copyPromptAndOpenClaude(prompt: string): Promise<boolean> {
  let copied = false;
  try {
    await navigator.clipboard.writeText(prompt);
    copied = true;
  } catch {
    copied = false;
  }
  window.open(CLAUDE_URL, "_blank", "noopener,noreferrer");
  return copied;
}

export async function copyPrompt(prompt: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(prompt);
    return true;
  } catch {
    return false;
  }
}
