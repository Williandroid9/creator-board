import { Command, Menu, Plus, Search, X } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { cx } from "../ui";

type HeaderProps = {
  onOpenSidebar: () => void;
};

export function Header({ onOpenSidebar }: HeaderProps) {
  const {
    filters,
    setFilters,
    openCreate,
    activeView,
  } = useApp();

  const viewLabels: Record<string, string> = {
    production: "Dashboard",
    analysis: "Análise",
    calendar: "Calendário",
    radar: "Caçador de Ideias",
    insights: "Insights",
    performance: "Performance",
    trends: "Banco de Ideias",
    references: "Referências",
    channels: "Canais",
    archive: "Arquivo",
    data: "Dados",
  };

  return (
    <header className="sticky top-0 z-30 border-b border-slate-400/[0.06] bg-[#0b0f14]/90 backdrop-blur-xl lg:bg-transparent lg:backdrop-blur-none">
      <div className="flex items-center gap-3 px-4 py-3 lg:px-6 lg:py-4">
        {/* Mobile hamburger */}
        <button
          type="button"
          onClick={onOpenSidebar}
          className="shrink-0 rounded-lg p-2 text-slate-400 hover:bg-white/[0.06] hover:text-slate-200 lg:hidden"
          aria-label="Abrir menu"
        >
          <Menu className="size-5" />
        </button>

        {/* Page title (desktop) */}
        <div className="hidden lg:block">
          <h1 className="text-lg font-black text-white">{viewLabels[activeView] || "Creator Board"}</h1>
        </div>

        {/* Logo (mobile only) */}
        <div className="flex items-center gap-2 lg:hidden">
          <div className="flex size-7 items-center justify-center rounded-lg bg-brand">
            <span className="text-[0.6rem] font-black text-white">CB</span>
          </div>
          <span className="text-sm font-black text-white">Creator Board</span>
        </div>

        {/* Search */}
        <div className="relative flex flex-1 items-center lg:max-w-sm">
          <Search className="pointer-events-none absolute left-3 size-3.5 text-slate-500" />
          <input
            id="global-search-input"
            type="search"
            placeholder="Buscar…"
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            className="h-9 w-full rounded-xl border border-slate-400/10 bg-white/[0.04] pl-8 pr-20 text-sm text-slate-200 outline-none placeholder:text-slate-600 transition hover:bg-white/[0.07] focus:border-slate-400/25 focus:bg-white/[0.07] focus:ring-2 focus:ring-white/5"
          />
          {filters.search ? (
            <button
              type="button"
              onClick={() => setFilters((f) => ({ ...f, search: "" }))}
              className="absolute right-2.5 rounded p-0.5 text-slate-500 hover:text-slate-300"
            >
              <X className="size-3.5" />
            </button>
          ) : (
            <kbd className="pointer-events-none absolute right-2.5 flex items-center gap-0.5 rounded border border-slate-700/60 bg-white/[0.04] px-1.5 py-0.5 text-[0.65rem] font-bold text-slate-600">
              <Command className="size-2.5" />K
            </kbd>
          )}
        </div>

        {/* Create button */}
        <button
          type="button"
          onClick={openCreate}
          className="flex shrink-0 items-center gap-1.5 rounded-xl bg-brand px-3.5 py-2 text-sm font-bold text-white shadow-md shadow-brand/20 transition hover:bg-[#f0444d] active:scale-[0.97]"
        >
          <Plus className="size-4" />
          <span className="hidden sm:inline">Nova ideia</span>
        </button>
      </div>
    </header>
  );
}
