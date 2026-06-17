import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  Archive,
  BarChart2,
  BookOpen,
  CalendarDays,
  Database,
  LayoutDashboard,
  Lightbulb,
  Crosshair,
  Plus,
  Search,
  TrendingUp,
  Tv2,
  Zap,
} from "lucide-react";
import { type AppView, useApp } from "../context/AppContext";
import { cx } from "./ui";

// ─── Commands ─────────────────────────────────────────────────────────────────

type CommandAction =
  | { type: "view"; view: AppView }
  | { type: "create" }
  | { type: "focus" };

interface Command {
  id: string;
  label: string;
  group: string;
  icon: React.ElementType;
  shortcut?: string;
  action: CommandAction;
  keywords?: string;
}

const COMMANDS: Command[] = [
  // Navigation
  { id: "go-dashboard",    label: "Ir para Dashboard",     group: "Navegar", icon: LayoutDashboard, action: { type: "view", view: "production" } },
  { id: "go-calendar",     label: "Ir para Calendário",    group: "Navegar", icon: CalendarDays,    action: { type: "view", view: "calendar" } },
  { id: "go-radar",        label: "Ir para Caçador de Ideias", group: "Navegar", icon: Crosshair,   shortcut: "R", action: { type: "view", view: "radar" }, keywords: "radar scout ideias agente" },
  { id: "go-analysis",     label: "Ir para Análise",       group: "Navegar", icon: Activity,        action: { type: "view", view: "analysis" }, keywords: "metricas diagnosticos gargalos plano semanal oportunidades" },
  { id: "go-insights",     label: "Ir para Insights",      group: "Navegar", icon: TrendingUp,      action: { type: "view", view: "insights" } },
  { id: "go-performance",  label: "Ir para Performance",   group: "Navegar", icon: BarChart2,       action: { type: "view", view: "performance" } },
  { id: "go-trends",       label: "Ir para Banco de Ideias", group: "Navegar", icon: Lightbulb,     action: { type: "view", view: "trends" } },
  { id: "go-references",   label: "Ir para Referências",   group: "Navegar", icon: BookOpen,        action: { type: "view", view: "references" } },
  { id: "go-channels",     label: "Ir para Canais",        group: "Navegar", icon: Tv2,             action: { type: "view", view: "channels" } },
  { id: "go-archive",      label: "Ir para Arquivo",       group: "Navegar", icon: Archive,         action: { type: "view", view: "archive" } },
  { id: "go-data",         label: "Ir para Dados",         group: "Navegar", icon: Database,        action: { type: "view", view: "data" } },
  // Actions
  { id: "new-idea",    label: "Nova ideia",              group: "Ações", icon: Plus,  shortcut: "N", action: { type: "create" }, keywords: "criar vídeo novo ideia" },
  { id: "focus-mode", label: "Entrar no Modo Foco",      group: "Ações", icon: Zap,   shortcut: "F", action: { type: "focus" },  keywords: "foco pomodoro sprint" },
];

function matchesQuery(cmd: Command, q: string) {
  if (!q) return true;
  const haystack = [cmd.label, cmd.group, cmd.keywords || ""].join(" ").toLowerCase();
  return q.split(" ").every((token) => haystack.includes(token));
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { setActiveView, openCreate, setFocusMode } = useApp();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return COMMANDS.filter((cmd) => matchesQuery(cmd, q));
  }, [query]);

  // Focus input on open
  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // Reset active index on new results
  useEffect(() => { setActiveIndex(0); }, [results]);

  // Scroll active item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${activeIndex}"]`) as HTMLElement | null;
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  function executeCommand(cmd: Command) {
    onClose();
    if (cmd.action.type === "view") setActiveView(cmd.action.view);
    else if (cmd.action.type === "create") openCreate();
    else if (cmd.action.type === "focus") setFocusMode((v) => !v);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const cmd = results[activeIndex];
      if (cmd) executeCommand(cmd);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  }

  if (!open) return null;

  // Group results
  const groups = results.reduce<Record<string, Command[]>>((acc, cmd) => {
    (acc[cmd.group] ||= []).push(cmd);
    return acc;
  }, {});

  return (
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center bg-black/70 backdrop-blur-sm pt-[12vh]"
      onClick={onClose}
    >
      <div
        className="animate-palette-in mx-4 w-full max-w-[560px] overflow-hidden rounded-2xl border border-slate-700/60 bg-[#0d1218] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-slate-700/40 px-4 py-3.5">
          <Search className="size-4 shrink-0 text-slate-500" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Buscar ação ou página…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-sm font-semibold text-white outline-none placeholder:text-slate-600"
          />
          <kbd className="rounded border border-slate-700/50 bg-white/[0.04] px-1.5 py-0.5 text-[0.65rem] font-bold text-slate-600">
            ESC
          </kbd>
        </div>

        {/* Results list */}
        <div ref={listRef} className="max-h-[380px] overflow-y-auto p-2">
          {Object.entries(groups).length === 0 ? (
            <p className="px-3 py-6 text-center text-sm font-semibold text-slate-600">Nenhum resultado encontrado</p>
          ) : (
            Object.entries(groups).map(([group, cmds]) => (
              <div key={group} className="mb-1">
                <p className="mb-1 px-3 pt-1 text-[0.6rem] font-semibold uppercase tracking-widest text-slate-600">
                  {group}
                </p>
                {cmds.map((cmd) => {
                  const globalIndex = results.indexOf(cmd);
                  const isActive = globalIndex === activeIndex;
                  const Icon = cmd.icon;
                  return (
                    <button
                      key={cmd.id}
                      data-index={globalIndex}
                      type="button"
                      onClick={() => executeCommand(cmd)}
                      onMouseEnter={() => setActiveIndex(globalIndex)}
                      className={cx(
                        "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition",
                        isActive ? "bg-white/[0.08] text-white" : "text-slate-400 hover:text-slate-200",
                      )}
                    >
                      <Icon className={cx("size-4 shrink-0", isActive ? "text-aqua" : "text-slate-600")} />
                      <span className="flex-1">{cmd.label}</span>
                      {cmd.shortcut && (
                        <kbd className={cx(
                          "rounded border px-1.5 py-0.5 text-[0.6rem] font-black",
                          isActive ? "border-slate-600 bg-white/[0.05] text-slate-400" : "border-slate-700/50 text-slate-600",
                        )}>
                          {cmd.shortcut}
                        </kbd>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center gap-3 border-t border-slate-700/40 px-4 py-2">
          <span className="text-[0.65rem] font-semibold text-slate-600">↑↓ navegar</span>
          <span className="text-[0.65rem] font-semibold text-slate-600">↵ selecionar</span>
          <span className="text-[0.65rem] font-semibold text-slate-600">ESC fechar</span>
        </div>
      </div>
    </div>
  );
}
