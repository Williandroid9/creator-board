import { useMemo, useState, type FormEvent } from "react";
import { INSPIRATION_TYPES, type Inspiration, type InspirationDraft, type InspirationFilters } from "../types";
import {
  EMPTY_INSPIRATION,
  getHost,
  getInspirationChannels,
  getInspirationNiches,
  normalizeInspirationDraft,
} from "../lib/inspiration";
import { Button, Field, Pill, SelectInput, TextArea, TextInput, cx } from "./ui";

type InspirationBankProps = {
  inspirations: Inspiration[];
  onSave: (draft: InspirationDraft) => void;
  onDelete: (id: string) => void;
};

const defaultFilters: InspirationFilters = {
  type: "all",
  channel: "all",
  niche: "all",
  search: "",
};

function blankDraft(): InspirationDraft {
  return normalizeInspirationDraft(EMPTY_INSPIRATION);
}

export function InspirationBank({ inspirations, onSave, onDelete }: InspirationBankProps) {
  const [draft, setDraft] = useState<InspirationDraft>(() => blankDraft());
  const [editorOpen, setEditorOpen] = useState(false);
  const [filters, setFilters] = useState<InspirationFilters>(defaultFilters);
  const channels = useMemo(() => getInspirationChannels(inspirations), [inspirations]);
  const niches = useMemo(() => getInspirationNiches(inspirations), [inspirations]);

  const filteredInspirations = useMemo(() => {
    const search = filters.search.trim().toLowerCase();

    return inspirations.filter((item) => {
      const matchesType = filters.type === "all" || item.type === filters.type;
      const matchesChannel = filters.channel === "all" || item.channel === filters.channel;
      const matchesNiche = filters.niche === "all" || item.niche === filters.niche;
      const text = [item.title, item.channel, item.niche, item.url, item.notes, item.tags]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return matchesType && matchesChannel && matchesNiche && (!search || text.includes(search));
    });
  }, [filters, inspirations]);

  function setField<K extends keyof InspirationDraft>(field: K, value: InspirationDraft[K]) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const prepared = normalizeInspirationDraft(draft);
    if (!prepared.title.trim() && !prepared.url.trim()) {
      return;
    }

    onSave({
      ...prepared,
      title: prepared.title.trim() || getHost(prepared.url) || "Inspiracao sem titulo",
    });
    setDraft(blankDraft());
    setEditorOpen(false);
  }

  return (
    <section className="clean-panel rounded-2xl p-5">
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase text-aqua">Inspiracoes</p>
          <h2 className="text-xl font-black sm:text-2xl">Banco de referencias</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <Pill className="border-aqua/25 bg-white/[0.04] text-aqua">
            {inspirations.length} salva{inspirations.length === 1 ? "" : "s"}
          </Pill>
          <Button
            variant={editorOpen ? "ghost" : "primary"}
            onClick={() => {
              if (editorOpen) {
                setDraft(blankDraft());
                setEditorOpen(false);
              } else {
                setEditorOpen(true);
              }
            }}
          >
            {editorOpen ? "Fechar" : "+ Referencia"}
          </Button>
        </div>
      </div>

      {editorOpen && (
      <form className="grid gap-3 rounded-xl bg-white/[0.045] p-4 lg:grid-cols-4" onSubmit={submit}>
        <Field label="Titulo" className="lg:col-span-2">
          <TextInput
            value={draft.title}
            onChange={(event) => setField("title", event.target.value)}
            placeholder="Ex: thumbnail com rosto + promessa forte"
          />
        </Field>
        <Field label="Tipo">
          <SelectInput value={draft.type} onChange={(event) => setField("type", event.target.value as InspirationDraft["type"])}>
            {INSPIRATION_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Canal">
          <TextInput value={draft.channel} onChange={(event) => setField("channel", event.target.value)} placeholder="Canal alvo" />
        </Field>
        <Field label="Nicho">
          <TextInput value={draft.niche} onChange={(event) => setField("niche", event.target.value)} placeholder="Nicho" />
        </Field>
        <Field label="Link" className="lg:col-span-2">
          <TextInput value={draft.url} onChange={(event) => setField("url", event.target.value)} placeholder="https://..." />
        </Field>
        <Field label="Tags">
          <TextInput value={draft.tags} onChange={(event) => setField("tags", event.target.value)} placeholder="hook, thumb, concorrente" />
        </Field>
        <Field label="Notas" className="lg:col-span-3">
          <TextArea
            rows={3}
            value={draft.notes}
            onChange={(event) => setField("notes", event.target.value)}
            placeholder="O que chamou atencao? Como isso pode inspirar proximos videos?"
          />
        </Field>
        <div className="flex items-end gap-2">
          {draft.id && (
            <Button className="flex-1" onClick={() => setDraft(blankDraft())}>
              Cancelar
            </Button>
          )}
          <Button variant="primary" className="flex-1" type="submit">
            {draft.id ? "Atualizar" : "Salvar"}
          </Button>
        </div>
      </form>
      )}

      {/* Filtros só aparecem quando há volume suficiente para justificá-los. */}
      {inspirations.length >= 6 && (
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <Field label="Tipo">
            <SelectInput value={filters.type} onChange={(event) => setFilters({ ...filters, type: event.target.value })}>
              <option value="all">Todos</option>
              {INSPIRATION_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Canal">
            <SelectInput value={filters.channel} onChange={(event) => setFilters({ ...filters, channel: event.target.value })}>
              <option value="all">Todos</option>
              {channels.map((channel) => (
                <option key={channel} value={channel}>
                  {channel}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Nicho">
            <SelectInput value={filters.niche} onChange={(event) => setFilters({ ...filters, niche: event.target.value })}>
              <option value="all">Todos</option>
              {niches.map((niche) => (
                <option key={niche} value={niche}>
                  {niche}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Buscar">
            <TextInput
              type="search"
              value={filters.search}
              onChange={(event) => setFilters({ ...filters, search: event.target.value })}
              placeholder="Titulo, tag, link..."
            />
          </Field>
        </div>
      )}

      <div className="mt-4 grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
        {filteredInspirations.length ? (
          filteredInspirations.map((item) => (
            <article key={item.id} className="rounded-xl border border-slate-700/35 bg-[#121824] p-4">
              <div className="mb-3 flex flex-wrap gap-1.5">
                <Pill className="border-aqua/25 bg-white/[0.04] text-aqua">{item.type}</Pill>
                {item.channel && <Pill className="border-slate-600/60 bg-white/[0.04] text-slate-200">{item.channel}</Pill>}
                {item.niche && <Pill className="border-slate-600/60 bg-white/[0.04] text-slate-200">{item.niche}</Pill>}
              </div>
              <h3 className="line-clamp-2 min-h-[2.7rem] break-words text-sm font-black leading-snug text-white">{item.title}</h3>
              <p className="mt-3 line-clamp-2 break-words text-sm leading-6 text-slate-400">{item.notes || item.tags || item.url || "Sem notas."}</p>
              {item.url && <p className="mt-2 truncate text-xs font-bold text-slate-500">{getHost(item.url) || item.url}</p>}
              <div className="mt-4 flex flex-wrap gap-2">
                {item.url && (
                  <a className={cx("btn btn-ghost min-h-9 px-3 text-xs")} href={item.url} target="_blank" rel="noreferrer">
                    Abrir link
                  </a>
                )}
                <Button
                  className="min-h-9 px-3 text-xs"
                  onClick={() => {
                    setDraft(normalizeInspirationDraft(item));
                    setEditorOpen(true);
                  }}
                >
                  Editar
                </Button>
                <Button className="min-h-9 px-3 text-xs" variant="danger" onClick={() => onDelete(item.id)}>
                  Excluir
                </Button>
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-xl border border-dashed border-slate-700/70 p-4 text-sm leading-6 text-slate-500 lg:col-span-2">
            <p>Nenhuma referencia encontrada.</p>
            <Button className="mt-3 min-h-9 px-3 text-xs" onClick={() => setEditorOpen(true)}>
              Adicionar referencia
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
