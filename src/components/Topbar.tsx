import type { Channel } from "../types";
import { Button, SelectInput, cx } from "./ui";

export type AppView =
  | "production"
  | "channels"
  | "insights"
  | "radar"
  | "trends"
  | "calendar"
  | "references"
  | "performance"
  | "archive"
  | "data";

type TopbarProps = {
  activeView: AppView;
  onViewChange: (view: AppView) => void;
  channels: Channel[];
  activeChannelId: string;
  onActiveChannelChange: (channelId: string) => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onCreate: () => void;
};

const views: Array<{ key: AppView; label: string }> = [
  { key: "production", label: "Dashboard" },
  { key: "calendar", label: "Calendario" },
  { key: "radar", label: "Radar" },
  { key: "insights", label: "Crescimento" },
  { key: "performance", label: "Publicados" },
  { key: "trends", label: "Banco de ideias" },
  { key: "references", label: "Referencias" },
  { key: "channels", label: "Canais" },
  { key: "archive", label: "Arquivo" },
  { key: "data", label: "Dados" },
];

const viewGroups: Array<{ title: string; items: Array<{ key: AppView; label: string }> }> = [
  {
    title: "Operacao",
    items: [
      { key: "production", label: "Dashboard" },
      { key: "calendar", label: "Calendario" },
    ],
  },
  {
    title: "Crescimento",
    items: [
      { key: "radar", label: "Radar" },
      { key: "insights", label: "Crescimento" },
      { key: "performance", label: "Publicados" },
    ],
  },
  {
    title: "Biblioteca",
    items: [
      { key: "trends", label: "Banco de ideias" },
      { key: "references", label: "Referencias" },
    ],
  },
  {
    title: "Sistema",
    items: [
      { key: "channels", label: "Canais" },
      { key: "archive", label: "Arquivo" },
      { key: "data", label: "Dados" },
    ],
  },
];

function LogoMark({ className }: { className: string }) {
  return (
    <div className={cx("shrink-0 overflow-hidden rounded-xl border border-white/10 bg-[#090d13] shadow-soft", className)}>
      <img src="/logo-creator-board.webp" alt="" className="h-full w-full object-cover" draggable={false} />
    </div>
  );
}

export function Topbar({
  activeView,
  onViewChange,
  channels,
  activeChannelId,
  onActiveChannelChange,
  searchValue,
  onSearchChange,
  onCreate,
}: TopbarProps) {
  const activeChannel = channels.find((channel) => channel.id === activeChannelId) || null;
  const statusLabel =
    activeChannel?.youtubeChannelId
      ? activeChannel.lastSyncedAt
        ? `Conectado / sync ${new Date(activeChannel.lastSyncedAt).toLocaleDateString("pt-BR")}`
        : "Conectado"
      : activeChannel
        ? "Perfil manual"
        : channels.length
          ? "Todos os canais"
          : "Nenhum canal";
  const activeViewLabel = views.find((view) => view.key === activeView)?.label || "Dashboard";

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-slate-400/10 bg-[#080d14]/95 px-4 py-5 backdrop-blur-xl lg:flex lg:flex-col">
        <div className="mb-8 flex items-center gap-3 px-2">
          <LogoMark className="h-10 w-10" />
          <div className="min-w-0">
            <h1 className="truncate text-lg font-black tracking-normal text-white">Creator Board</h1>
            <p className="truncate text-xs font-semibold text-slate-500">Studio de producao</p>
          </div>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto pr-1">
          {viewGroups.map((group) => (
            <section key={group.title}>
              <p className="mb-2 px-2 text-[0.68rem] font-black uppercase tracking-wide text-slate-600">
                {group.title}
              </p>
              <div className="space-y-1">
                {group.items.map((view) => (
                  <button
                    key={view.key}
                    type="button"
                    className={cx(
                      "flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm font-extrabold transition",
                      activeView === view.key
                        ? "bg-white text-ink shadow-sm"
                        : "text-slate-400 hover:bg-white/[0.06] hover:text-slate-100",
                    )}
                    onClick={() => onViewChange(view.key)}
                  >
                    <span>{view.label}</span>
                    {activeView === view.key ? <span className="h-1.5 w-1.5 rounded-full bg-brand" /> : null}
                  </button>
                ))}
              </div>
            </section>
          ))}
        </nav>

        <div className="mt-5 rounded-xl border border-slate-400/10 bg-white/[0.035] p-3">
          <p className="text-[0.68rem] font-black uppercase text-slate-600">Canal ativo</p>
          <p className="mt-1 truncate text-sm font-black text-white">{activeChannel?.name || "Todos os canais"}</p>
          <p className="mt-1 truncate text-xs font-bold text-slate-500">{statusLabel}</p>
        </div>
      </aside>

      <header className="mx-auto max-w-[1800px] pb-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-center gap-4 lg:hidden">
            <LogoMark className="h-11 w-11" />
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-black tracking-normal sm:text-3xl">Creator Board</h1>
              <p className="mt-1 text-sm font-semibold text-slate-400">Planeje, produza e acompanhe seus videos.</p>
            </div>
          </div>

          <div className="hidden min-w-0 lg:block">
            <p className="text-xs font-black uppercase tracking-wide text-slate-600">Modulo atual</p>
            <h2 className="mt-1 text-2xl font-black text-white">{activeViewLabel}</h2>
          </div>

          <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-center">
          <label className="relative min-w-0 lg:w-72">
            <span className="sr-only">Buscar videos</span>
            <input
              id="global-search-input"
              className="field-control h-[2.7rem] pr-10"
              type="search"
              placeholder="Buscar videos..."
              value={searchValue}
              onChange={(event) => onSearchChange(event.target.value)}
            />
            {searchValue ? (
              <button
                type="button"
                className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-sm font-black text-slate-500 hover:bg-white/[0.06] hover:text-white"
                onClick={() => onSearchChange("")}
                title="Limpar busca"
              >
                x
              </button>
            ) : null}
          </label>

          <label className="min-w-0 lg:w-72">
            <span className="mb-1 block text-[0.68rem] font-black uppercase text-slate-500">Canal ativo</span>
            <SelectInput
              className="h-[2.7rem]"
              value={activeChannelId || "all"}
              onChange={(event) => onActiveChannelChange(event.target.value)}
            >
              <option value="all">Todos os canais</option>
              {channels.map((channel) => (
                <option key={channel.id} value={channel.id}>
                  {channel.name}
                </option>
              ))}
            </SelectInput>
            <span className="mt-1 block truncate text-[0.7rem] font-bold text-slate-500">{statusLabel}</span>
          </label>

          <nav className="flex max-w-full flex-wrap gap-1 rounded-lg border border-slate-400/10 bg-black/18 p-1 lg:hidden">
            {views.map((view) => (
              <button
                key={view.key}
                type="button"
                className={cx(
                  "shrink-0 rounded-lg px-3 py-2 text-sm font-black transition",
                  activeView === view.key
                    ? "bg-white text-ink"
                    : "text-slate-400 hover:bg-white/[0.06] hover:text-slate-100",
                )}
                onClick={() => onViewChange(view.key)}
              >
                {view.label}
              </button>
            ))}
          </nav>
          <Button className="shrink-0" variant="primary" onClick={onCreate}>
            + Nova ideia
          </Button>
          </div>
        </div>
      </header>
    </>
  );
}
