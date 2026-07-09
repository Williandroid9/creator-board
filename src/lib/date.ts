export function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseDate(value: string) {
  if (!value) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) {
    return null;
  }

  return new Date(year, month - 1, day);
}

export function formatDate(value: string, fallback = "Sem data") {
  const date = parseDate(value);
  if (!date) {
    return fallback;
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  }).format(date);
}

export function startOfWeek(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  const day = copy.getDay();
  const diff = (day + 6) % 7;
  copy.setDate(copy.getDate() - diff);
  return copy;
}

export function addDays(date: Date, amount: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + amount);
  return copy;
}

export function isSameWeek(value: string, baseDate = new Date()) {
  const date = parseDate(value);
  if (!date) {
    return false;
  }

  const start = startOfWeek(baseDate);
  const end = addDays(start, 7);
  return date >= start && date < end;
}

export function isSameMonth(value: string, baseDate = new Date()) {
  const date = parseDate(value);
  if (!date) {
    return false;
  }

  return (
    date.getFullYear() === baseDate.getFullYear() &&
    date.getMonth() === baseDate.getMonth()
  );
}

export function isToday(value: string) {
  return value === localDateKey();
}

// Chave (YYYY-MM-DD, local) da segunda-feira da semana de `baseDate`.
export function weekStartKey(baseDate = new Date()) {
  return localDateKey(startOfWeek(baseDate));
}

// Dias consecutivos de produção terminando hoje. Fonte única — antes estava
// reimplementado em AppContext, DailyBrief, TodayPanel e notifications (este
// último em UTC, divergindo do resto). Tudo agora usa data local.
export function getProductionStreak(productionDays: string[]) {
  const unique = new Set(productionDays.filter(Boolean));
  let count = 0;
  const cursor = new Date();
  while (unique.has(localDateKey(cursor))) {
    count += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}
