import { useMemo } from "react";
import type { Filters as FilterState, Video } from "../types";
import { getChannels, getNiches, isOverdue, isReadyToPublish, hasScript } from "../lib/video";
import { Field, SelectInput, cx } from "./ui";

type FiltersProps = {
  videos: Video[];
  filters: FilterState;
  onChange: (filters: FilterState) => void;
};

type QuickChip = {
  id: string;
  label: string;
  count: (videos: Video[]) => number;
  color: string;
  activeColor: string;
};

const QUICK_CHIPS: QuickChip[] = [
  {
    id: "alta",
    label: "Alta prioridade",
    count: (v) => v.filter((x) => x.priority === "Alta").length,
    color: "border-brand/25 bg-white/[0.04] text-slate-400 hover:border-brand/50 hover:text-white",
    activeColor: "border-brand/50 bg-brand/10 text-white",
  },
  {
    id: "atrasados",
    label: "Atrasados",
    count: (v) => v.filter(isOverdue).length,
    color: "border-amber-500/25 bg-white/[0.04] text-slate-400 hover:border-amber-400/50 hover:text-amber-100",
    activeColor: "border-amber-400/50 bg-amber-400/10 text-amber-100",
  },
  {
    id: "sem-roteiro",
    label: "Sem roteiro",
    count: (v) => v.filter((x) => !hasScript(x) && x.status !== "Publicado").length,
    color: "border-sky-500/25 bg-white/[0.04] text-slate-400 hover:border-sky-400/50 hover:text-sky-100",
    activeColor: "border-sky-400/50 bg-sky-400/10 text-sky-100",
  },
  {
    id: "prontos",
    label: "Prontos p/ publicar",
    count: (v) => v.filter(isReadyToPublish).length,
    color: "border-emerald-500/25 bg-white/[0.04] text-slate-400 hover:border-emerald-400/50 hover:text-emerald-100",
    activeColor: "border-emerald-400/50 bg-emerald-400/10 text-emerald-100",
  },
];

export function Filters({ videos, filters, onChange }: FiltersProps) {
  const niches = useMemo(() => getNiches(videos), [videos]);
  const channels = useMemo(() => getChannels(videos), [videos]);

  function toggleChip(id: string) {
    onChange({ ...filters, quickFilter: filters.quickFilter === id ? "" : id });
  }

  return (
    <div className="space-y-3">
      {/* Quick filter chips */}
      <div className="flex flex-wrap gap-2">
        {QUICK_CHIPS.map((chip) => {
          const count = chip.count(videos);
          const active = filters.quickFilter === chip.id;
          return (
            <button
              key={chip.id}
              type="button"
              disabled={count === 0 && !active}
              onClick={() => toggleChip(chip.id)}
              className={cx(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition",
                active ? chip.activeColor : chip.color,
                count === 0 && !active && "pointer-events-none opacity-30",
              )}
            >
              {chip.label}
              {count > 0 && (
                <span className={cx(
                  "rounded-full px-1.5 py-0.5 text-[0.65rem] font-black",
                  active ? "bg-white/20" : "bg-white/[0.08]",
                )}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
        {filters.quickFilter && (
          <button
            type="button"
            onClick={() => onChange({ ...filters, quickFilter: "" })}
            className="inline-flex items-center gap-1 rounded-full border border-slate-600/40 bg-white/[0.04] px-3 py-1.5 text-xs font-bold text-slate-400 transition hover:text-white"
          >
            ✕ Limpar filtro
          </button>
        )}
      </div>

      {/* Channel + Niche selects */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Canal">
          <SelectInput value={filters.channel} onChange={(e) => onChange({ ...filters, channel: e.target.value })}>
            <option value="all">Todos os canais</option>
            {channels.map((channel) => (
              <option key={channel} value={channel}>{channel}</option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Nicho">
          <SelectInput value={filters.niche} onChange={(e) => onChange({ ...filters, niche: e.target.value })}>
            <option value="all">Todos os nichos</option>
            {niches.map((niche) => (
              <option key={niche} value={niche}>{niche}</option>
            ))}
          </SelectInput>
        </Field>
      </div>
    </div>
  );
}
