import {
  Archive,
  BarChart2,
  BookOpen,
  CalendarDays,
  ChevronDown,
  Database,
  LayoutDashboard,
  Lightbulb,
  Plus,
  Radar,
  TrendingUp,
  Tv2,
  X,
  Zap,
} from "lucide-react";
import { type AppView, useApp } from "../../context/AppContext";
import { cx } from "../ui";

// ─── Nav config ───────────────────────────────────────────────────────────────

type NavItem = { key: AppView; label: string; icon: React.ElementType; badgeFn?: (ctx: ReturnType<typeof useApp>) => number };

const navGroups: Array<{ title: string; items: NavItem[] }> = [
  {
    title: "Operação",
    items: [
      {
        key: "production",
        label: "Dashboard",
        icon: LayoutDashboard,
        badgeFn: ({ scopedActiveVideos }) =>
          scopedActiveVideos.filter((v) => {
            if (!v.plannedDate || v.status === "Publicado") return false;
            return new Date(v.plannedDate) < new Date();
          }).length,
      },
      { key: "calendar", label: "Calendário", icon: CalendarDays },
    ],
  },
  {
    title: "Crescimento",
    items: [
      {
        key: "radar",
        label: "Radar",
        icon: Radar,
        badgeFn: ({ data }) => data.radar?.ideas?.length ?? 0,
      },
      { key: "insights", label: "Insights", icon: TrendingUp },
      { key: "performance", label: "Performance", icon: BarChart2 },
    ],
  },
  {
    title: "Biblioteca",
    items: [
      { key: "trends", label: "Banco de Ideias", icon: Lightbulb },
      { key: "references", label: "Referências", icon: BookOpen },
    ],
  },
  {
    title: "Sistema",
    items: [
      { key: "channels", label: "Canais", icon: Tv2 },
      {
        key: "archive",
        label: "Arquivo",
        icon: Archive,
        badgeFn: ({ data }) => data.videos.filter((v) => v.archived).length,
      },
      { key: "data", label: "Dados", icon: Database },
    ],
  },
];

// ─── Channel selector ─────────────────────────────────────────────────────────

function ChannelSelector() {
  const { data, activeChannelId, activeChannel, setActiveChannel } = useApp();

  if (!data.channels.length) return null;

  return (
    <div className="px-3 pb-2">
      <label className="mb-1 block px-2 text-[0.65rem] font-bold uppercase tracking-widest text-slate-500">
        Canal ativo
      </label>
      <div className="relative">
        <select
          value={activeChannelId}
          onChange={(e) => setActiveChannel(e.target.value)}
          className="w-full appearance-none rounded-lg border border-slate-400/10 bg-white/[0.04] py-2 pl-3 pr-8 text-sm font-semibold text-slate-200 outline-none transition hover:bg-white/[0.07] focus:border-slate-400/30 focus:bg-white/[0.07]"
        >
          <option value="all">Todos os canais</option>
          {data.channels.map((channel) => (
            <option key={channel.id} value={channel.id}>
              {channel.name}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-500" />
      </div>
      {activeChannel && (
        <p className="mt-1 truncate px-2 text-[0.65rem] text-slate-500">{activeChannel.niche}</p>
      )}
    </div>
  );
}

// ─── Nav item ─────────────────────────────────────────────────────────────────

function NavLink({ item, onClick }: { item: NavItem; onClick?: () => void }) {
  const ctx = useApp();
  const { activeView, setActiveView } = ctx;
  const isActive = activeView === item.key;
  const Icon = item.icon;
  const badge = item.badgeFn ? item.badgeFn(ctx) : 0;

  return (
    <button
      type="button"
      onClick={() => {
        setActiveView(item.key);
        onClick?.();
      }}
      className={cx(
        "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition-all",
        isActive
          ? "bg-white/10 text-white shadow-sm"
          : "text-slate-400 hover:bg-white/[0.05] hover:text-slate-200",
      )}
    >
      <Icon
        className={cx(
          "size-4 shrink-0 transition-colors",
          isActive ? "text-aqua" : "text-slate-500",
        )}
      />
      <span className="truncate">{item.label}</span>
      {badge > 0 && (
        <span className={cx(
          "ml-auto flex h-4.5 min-w-[1.15rem] items-center justify-center rounded-full px-1 text-[0.6rem] font-black",
          isActive ? "bg-aqua/20 text-aqua" : "bg-white/[0.08] text-slate-400",
        )}>
          {badge > 99 ? "99+" : badge}
        </span>
      )}
      {isActive && badge === 0 && (
        <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-aqua" />
      )}
    </button>
  );
}

// ─── Patent badge ─────────────────────────────────────────────────────────────

const PATENT_LEVELS = [
  { min: 0,   max: 4,        label: "Iniciando a Jornada",   emoji: "🌱", color: "text-slate-400",    bar: "bg-slate-600" },
  { min: 5,   max: 19,       label: "Criador em Ascensão",   emoji: "🚀", color: "text-emerald-400",  bar: "bg-emerald-400" },
  { min: 20,  max: 59,       label: "Produtor Consistente",  emoji: "🎯", color: "text-sky-400",      bar: "bg-sky-400" },
  { min: 60,  max: 149,      label: "Estrategista Digital",  emoji: "⚡", color: "text-violet-400",   bar: "bg-violet-400" },
  { min: 150, max: Infinity, label: "Referência do Nicho",   emoji: "👑", color: "text-amber-400",    bar: "bg-amber-400" },
];

function PatentBadge() {
  const { data } = useApp();
  const publishedCount = data.videos.filter(
    (v) => v.status === "Publicado" && !v.studioCreatedFromOnline && !v.studioCreatedFromCsv,
  ).length;

  const level = PATENT_LEVELS.find((l) => publishedCount >= l.min && publishedCount <= l.max) || PATENT_LEVELS[0];
  const nextLevel = PATENT_LEVELS[PATENT_LEVELS.indexOf(level) + 1];
  const progress = nextLevel
    ? ((publishedCount - level.min) / (nextLevel.min - level.min)) * 100
    : 100;

  return (
    <div className="mx-3 mb-3 rounded-xl border border-slate-400/10 bg-white/[0.03] p-3">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-sm">{level.emoji}</span>
        <span className={cx("text-xs font-bold leading-tight", level.color)}>{level.label}</span>
      </div>
      <div className="mb-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
        <div
          className={cx("h-full rounded-full transition-all duration-700", level.bar)}
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
      <p className="text-[0.65rem] text-slate-500">
        {publishedCount} publicado{publishedCount !== 1 ? "s" : ""} no app
        {nextLevel && ` · faltam ${nextLevel.min - publishedCount}`}
      </p>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

type SidebarProps = {
  open?: boolean;
  onClose?: () => void;
};

export function Sidebar({ open, onClose }: SidebarProps) {
  const { openCreate } = useApp();

  const isMobile = onClose !== undefined;

  const content = (
    <aside
      className={cx(
        "flex h-full flex-col bg-[#0d1218] border-r border-slate-400/[0.06]",
        isMobile ? "w-72" : "w-full",
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-5">
        <div className="flex items-center gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-brand shadow-lg shadow-brand/25">
            <span className="text-xs font-black text-white">CB</span>
          </div>
          <div>
            <p className="text-sm font-black tracking-tight text-white">Creator Board</p>
            <p className="text-[0.6rem] text-slate-500">Production OS</p>
          </div>
        </div>
        {isMobile && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-white/[0.05] hover:text-slate-300"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {/* Channel selector */}
      <ChannelSelector />

      <div className="mx-3 my-1 h-px bg-slate-400/[0.06]" />

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-2">
        {navGroups.map((group) => (
          <div key={group.title} className="mb-4">
            <p className="mb-1 px-3 text-[0.6rem] font-bold uppercase tracking-widest text-slate-600">
              {group.title}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavLink key={item.key} item={item} onClick={isMobile ? onClose : undefined} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="mx-3 my-1 h-px bg-slate-400/[0.06]" />

      {/* Patent badge */}
      <PatentBadge />

      {/* Create button */}
      <div className="p-3 pt-0">
        <button
          type="button"
          onClick={() => {
            openCreate();
            onClose?.();
          }}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-brand/20 transition hover:bg-[#f0444d] active:scale-[0.98]"
        >
          <Plus className="size-4" />
          Nova ideia
        </button>
      </div>
    </aside>
  );

  if (isMobile) {
    return (
      <>
        {open && (
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={onClose}
          />
        )}
        <div
          className={cx(
            "fixed inset-y-0 left-0 z-50 transform transition-transform duration-250 lg:hidden",
            open ? "translate-x-0" : "-translate-x-full",
          )}
        >
          {content}
        </div>
      </>
    );
  }

  return (
    <div className="fixed inset-y-0 left-0 hidden w-[17rem] lg:block">
      {content}
    </div>
  );
}
