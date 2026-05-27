import { useMemo } from "react";
import type { Filters as FilterState, Video } from "../types";
import { getChannels, getNiches } from "../lib/video";
import { Field, SelectInput } from "./ui";

type FiltersProps = {
  videos: Video[];
  filters: FilterState;
  onChange: (filters: FilterState) => void;
};

export function Filters({ videos, filters, onChange }: FiltersProps) {
  const niches = useMemo(() => getNiches(videos), [videos]);
  const channels = useMemo(() => getChannels(videos), [videos]);

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Canal">
        <SelectInput value={filters.channel} onChange={(event) => onChange({ ...filters, channel: event.target.value })}>
          <option value="all">Todos os canais</option>
          {channels.map((channel) => (
            <option key={channel} value={channel}>
              {channel}
            </option>
          ))}
        </SelectInput>
      </Field>
      <Field label="Nicho">
        <SelectInput value={filters.niche} onChange={(event) => onChange({ ...filters, niche: event.target.value })}>
          <option value="all">Todos os nichos</option>
          {niches.map((niche) => (
            <option key={niche} value={niche}>
              {niche}
            </option>
          ))}
        </SelectInput>
      </Field>
    </div>
  );
}
