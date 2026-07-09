import { useState } from "react";
import {
  Activity,
  Archive,
  BarChart2,
  Bell,
  BookOpen,
  CalendarDays,
  ChevronDown,
  Crosshair,
  Database,
  LayoutDashboard,
  Lightbulb,
  Plus,
  Trophy,
  TrendingUp,
  Tv2,
  Zap,
} from "lucide-react";
import { getDisplayXp, getLevelInfo } from "../../lib/achievements";
import { type AppView, useApp } from "../../context/AppContext";
import { NotificationSetup } from "../NotificationSetup";
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
        label: "Caçador de Ideias",
        icon: Crosshair,
      },
      { key: "analysis", label: "Análise", icon: Activity },
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
      {
        key: "progress",
        label: "Conquistas",
        icon: Trophy,
        badgeFn: ({ newAchievements }) => newAchievements.length,
      },
    ],
  },
];

// ─── Channel selector ─────────────────────────────────────────────────────────

function ChannelSelector() {
  const { data, activeChannelId, activeChannel, setActiveChannel } = useApp();

  if (!data.channels.length) return null;

  return (
    <div className="px-3 pb-2">
      <label className="mb-1 block px-2 text-[0.65rem] font-semibold uppercase tracking-widest text-slate-500">
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

// ─── XP badge ─────────────────────────────────────────────────────────────────

function XpBadge() {
  const { data, progress, setActiveView } = useApp();
  const xp = getDisplayXp(data.videos, progress);
  const info = getLevelInfo(xp);
  const xpInLevel = xp - info.xpStart;
  const xpNeeded = info.xpEnd - info.xpStart;
  const levelProgress = Math.min(100, (xpInLevel / xpNeeded) * 100);

  return (
    <button
      type="button"
      onClick={() => setActiveView("progress")}
      className="mx-3 mb-3 w-[calc(100%-1.5rem)] rounded-xl border border-slate-400/10 bg-white/[0.03] p-3 text-left transition hover:bg-white/[0.06]"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm">{info.emoji}</span>
          <span className={cx("truncate text-xs font-bold leading-tight", info.color)}>{info.title}</span>
        </div>
        <span className="shrink-0 rounded-full bg-white/[0.07] px-2 py-0.5 text-[0.6rem] font-black text-slate-400">
          Nv. {info.level}
        </span>
      </div>
      <div className="mb-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
        <div
          className={cx("h-full rounded-full transition-all duration-700", info.bar)}
          style={{ width: `${levelProgress}%` }}
        />
      </div>
      <p className="text-[0.65rem] text-slate-500">
        {xp.toLocaleString("pt-BR")} XP · {progress.achievements.length} conquistas
      </p>
    </button>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

// App focado em PC: sidebar fixa, sempre visível. O antigo drawer mobile
// (backdrop + translate) foi removido na Fase 2 da auditoria.
export function Sidebar() {
  const { openCreate, notifPrefs } = useApp();
  const [notifSetupOpen, setNotifSetupOpen] = useState(false);

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 flex w-[17rem] flex-col border-r border-slate-400/[0.06] bg-[#0d1218]">
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-brand shadow-lg shadow-brand/25">
            <span className="text-xs font-black text-white">CB</span>
          </div>
          <div>
            <p className="text-sm font-black tracking-tight text-white">Creator Board</p>
            <p className="text-[0.6rem] text-slate-500">Production OS</p>
          </div>
        </div>

        {/* Channel selector */}
        <ChannelSelector />

        <div className="mx-3 my-1 h-px bg-slate-400/[0.06]" />

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-2">
          {navGroups.map((group) => (
            <div key={group.title} className="mb-4">
              <p className="mb-1 px-3 text-[0.6rem] font-semibold uppercase tracking-widest text-slate-600">
                {group.title}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavLink key={item.key} item={item} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="mx-3 my-1 h-px bg-slate-400/[0.06]" />

        {/* XP / Level badge */}
        <XpBadge />

        {/* Notifications button */}
        <div className="px-3 pb-2">
          <button
            type="button"
            onClick={() => setNotifSetupOpen(true)}
            className="flex w-full items-center gap-2.5 rounded-xl border border-slate-400/[0.08] bg-white/[0.02] px-3 py-2 text-left transition hover:bg-white/[0.06]"
          >
            <div className="relative">
              <Bell className={cx("size-4", notifPrefs.enabled ? "text-aqua" : "text-slate-500")} />
              {!notifPrefs.enabled && (
                <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-brand" />
              )}
            </div>
            <span className={cx("flex-1 text-xs font-semibold", notifPrefs.enabled ? "text-slate-300" : "text-slate-500")}>
              {notifPrefs.enabled ? `Notificações às ${notifPrefs.time}` : "Ativar notificações"}
            </span>
            {notifPrefs.enabled && (
              <span className="size-1.5 shrink-0 rounded-full bg-aqua" />
            )}
          </button>
        </div>

        {/* Create button */}
        <div className="p-3 pt-0">
          <button
            type="button"
            onClick={openCreate}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-brand/20 transition hover:bg-[#f0444d] active:scale-[0.98]"
          >
            <Plus className="size-4" />
            Nova ideia
          </button>
        </div>
      </aside>

      <NotificationSetup open={notifSetupOpen} onClose={() => setNotifSetupOpen(false)} />
    </>
  );
}
