// Fonte única para tratamento de métricas (views, CTR, retenção…).
// Antes estava duplicado: `num` em performance.ts, `numericMetric` em
// opportunity.ts e três funções clean* em AppContext.

// String de métrica → número para cálculos. Aceita "1.234", "12,5%", "1,2k"
// (o "k" vira dígito perdido — mantém compatível com o comportamento anterior).
export function parseMetric(value: string): number {
  const normalized = String(value || "").replace(",", ".").replace(/[^\d.]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

// ─── Limpeza para armazenar (sincronização de canal) ─────────────────────────
// Normalizam a entrada bruta (CSV / API) para uma string limpa antes de salvar.

export function cleanIntegerMetric(value: string): string {
  return String(value || "").replace(/[^\d]/g, "");
}

export function cleanPercentMetric(value: string): string {
  return String(value || "")
    .trim()
    .replace("%", "")
    .replace(",", ".")
    .replace(/[^\d.]/g, "");
}

export function cleanDecimalMetric(value: string): string {
  return String(value || "")
    .trim()
    .replace(",", ".")
    .replace(/[^\d.]/g, "");
}
