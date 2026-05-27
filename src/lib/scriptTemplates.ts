import type { VideoDraft } from "../types";

export type ScriptFormatKey = "tutorial" | "lista" | "review" | "noticia" | "react" | "short" | "comparacao";

export type ScriptTemplate = {
  key: ScriptFormatKey;
  label: string;
  description: string;
  sections: string[];
};

export const SCRIPT_TEMPLATES: ScriptTemplate[] = [
  {
    key: "tutorial",
    label: "Tutorial",
    description: "Ensinar um processo passo a passo.",
    sections: ["Gancho", "Problema", "Passo 1", "Passo 2", "Passo 3", "Erros comuns", "Resumo", "CTA"],
  },
  {
    key: "lista",
    label: "Lista",
    description: "Entregar varias ideias, erros, ferramentas ou dicas.",
    sections: ["Promessa", "Criterio da lista", "Item 1", "Item 2", "Item 3", "Melhor item", "Resumo", "CTA"],
  },
  {
    key: "review",
    label: "Review",
    description: "Avaliar produto, ferramenta, estrategia ou canal.",
    sections: ["Contexto", "Para quem e", "Pontos fortes", "Pontos fracos", "Teste real", "Veredito", "CTA"],
  },
  {
    key: "noticia",
    label: "Noticia",
    description: "Comentar mudanca, novidade ou evento recente.",
    sections: ["O que aconteceu", "Por que importa", "Impacto", "Oportunidade", "Risco", "O que fazer agora", "CTA"],
  },
  {
    key: "react",
    label: "React",
    description: "Reagir a video, tendencia, canal ou caso real.",
    sections: ["Contexto", "Primeira reacao", "Analise", "Licao", "Aplicacao pratica", "Resumo", "CTA"],
  },
  {
    key: "short",
    label: "Short",
    description: "Video curto com uma ideia central.",
    sections: ["Hook 0-2s", "Tensao", "Dica central", "Exemplo rapido", "Fechamento", "CTA curto"],
  },
  {
    key: "comparacao",
    label: "Comparacao",
    description: "Comparar opcoes, metodos, ferramentas ou estrategias.",
    sections: ["Pergunta central", "Opcao A", "Opcao B", "Criterios", "Melhor escolha", "Quando usar cada uma", "CTA"],
  },
];

const DEFAULT_TEMPLATE = SCRIPT_TEMPLATES[0];

function clean(value: string, fallback: string) {
  return value.trim() || fallback;
}

export function getScriptTemplate(format: string) {
  return SCRIPT_TEMPLATES.find((template) => template.key === format) || DEFAULT_TEMPLATE;
}

export function getScriptFormatLabel(format: string) {
  return getScriptTemplate(format).label;
}

export function buildScriptFromTemplate(draft: VideoDraft) {
  const template = getScriptTemplate(draft.videoFormat);
  const title = clean(draft.title, "[titulo do video]");
  const keyword = clean(draft.keyword, "[palavra-chave]");
  const niche = clean(draft.niche, "[nicho]");

  const intro = [
    `Formato: ${template.label}`,
    `Titulo: ${title}`,
    `Nicho: ${niche}`,
    `Palavra-chave: ${keyword}`,
    "",
  ].join("\n");

  const body = template.sections
    .map((section, index) => {
      const hint = index === 0 ? "Abra com uma promessa, pergunta ou erro forte." : "Escreva os pontos principais.";
      return `${section}\n- ${hint}\n- Exemplo/nota:\n`;
    })
    .join("\n");

  return `${intro}${body}`.trim();
}

export function mergeScriptTemplate(currentScript: string, templateScript: string) {
  if (!currentScript.trim()) {
    return templateScript;
  }

  return `${currentScript.trim()}\n\n--- Estrutura sugerida ---\n${templateScript}`;
}

export function buildVideoBriefText(draft: VideoDraft) {
  const template = getScriptTemplate(draft.videoFormat);
  const title = clean(draft.title, "Titulo ainda nao definido");
  const channel = clean(draft.channel, "Canal nao definido");
  const niche = clean(draft.niche, "Nicho nao definido");
  const keyword = clean(draft.keyword, "Palavra-chave nao definida");
  const thumbnail = clean(draft.thumbnailIdeas, "Thumbnail ainda nao definida");
  const seoTitle = clean(draft.seoTitle, title);
  const seoDescription = clean(draft.seoDescription, "Descricao SEO ainda nao definida");

  return [
    `BRIEF DO VIDEO`,
    `Titulo: ${title}`,
    `Canal: ${channel}`,
    `Nicho: ${niche}`,
    `Formato: ${template.label}`,
    `Palavra-chave: ${keyword}`,
    "",
    `Promessa`,
    `- O video precisa entregar uma resposta clara para: ${title}`,
    "",
    `Gancho`,
    `- Comece mostrando o problema, erro ou resultado ligado a "${keyword}".`,
    "",
    `Estrutura sugerida`,
    ...template.sections.map((section) => `- ${section}`),
    "",
    `Thumbnail`,
    `- ${thumbnail}`,
    "",
    `SEO`,
    `- Titulo SEO: ${seoTitle}`,
    `- Descricao: ${seoDescription}`,
    "",
    `Checklist de gravacao`,
    `- Gancho nos primeiros 15 segundos`,
    `- Exemplo pratico ou prova visual`,
    `- CTA claro no final`,
  ].join("\n");
}

export function buildBriefBlocks(draft: VideoDraft) {
  const template = getScriptTemplate(draft.videoFormat);

  return [
    {
      title: "Promessa",
      body: draft.title ? `Entregar: ${draft.title}` : "Defina a promessa principal do video.",
    },
    {
      title: "Publico e tema",
      body: `${draft.niche || "Nicho indefinido"} / ${draft.keyword || "sem palavra-chave"}`,
    },
    {
      title: "Formato",
      body: `${template.label}: ${template.description}`,
    },
    {
      title: "Estrutura",
      body: template.sections.join(" / "),
    },
    {
      title: "Thumbnail",
      body: draft.thumbnailIdeas || "Defina texto curto, contraste e curiosidade visual.",
    },
    {
      title: "SEO",
      body: draft.seoTitle || draft.seoDescription || draft.seoNotes || "Complete titulo, descricao e tags/notas.",
    },
  ];
}
