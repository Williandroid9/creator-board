import { useMemo, useState, type FormEvent } from "react";
import { Crosshair } from "lucide-react";
import type { Trend, TrendDraft, VideoDraft } from "../types";
import { EMPTY_TREND, normalizeTrendDraft, trendToVideoDraft } from "../lib/trend";
import { Button, Field, Pill, TextArea, TextInput } from "./ui";

type TrendsPanelProps = {
  trends: Trend[];
  onSave: (draft: TrendDraft) => void;
  onDelete: (id: string) => void;
  onCreateIdea: (draft: VideoDraft) => void;
  onHuntSimilar?: (trend: Trend) => void;
};

function blankDraft(): TrendDraft {
  return normalizeTrendDraft(EMPTY_TREND);
}

function parseViews(value: string) {
  const normalized = String(value || "").toLowerCase().replace(",", ".").trim();
  const multiplier = normalized.includes("mi") ? 1000000 : normalized.includes("k") || normalized.includes("mil") ? 1000 : 1;
  const number = Number(normalized.replace(/[^\d.]/g, ""));
  return Number.isFinite(number) ? number * multiplier : 0;
}

function formatRelativeDate(value: string) {
  if (!value) {
    return "Sem data";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  }).format(new Date(value));
}

export function TrendsPanel({ trends, onSave, onDelete, onCreateIdea, onHuntSimilar }: TrendsPanelProps) {
  const [draft, setDraft] = useState<TrendDraft>(() => blankDraft());
  const [editorOpen, setEditorOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [nicheFilter, setNicheFilter] = useState("all");

  const niches = useMemo(
    () =>
      [...new Set(trends.map((trend) => trend.niche).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b, "pt-BR", { sensitivity: "base" }),
      ),
    [trends],
  );

  const filteredTrends = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return trends
      .filter((trend) => {
        const matchesNiche = nicheFilter === "all" || trend.niche === nicheFilter;
        const matchesSearch =
          !normalizedSearch ||
          [trend.title, trend.niche, trend.referenceChannel, trend.opportunityReason, trend.ideaAngle, trend.notes]
            .join(" ")
            .toLowerCase()
            .includes(normalizedSearch);

        return matchesNiche && matchesSearch;
      })
      .sort((a, b) => parseViews(b.views) - parseViews(a.views) || b.updatedAt.localeCompare(a.updatedAt));
  }, [nicheFilter, search, trends]);

  const highSignalCount = useMemo(() => trends.filter((trend) => parseViews(trend.views) >= 100000).length, [trends]);

  function setField<K extends keyof TrendDraft>(field: K, value: TrendDraft[K]) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function edit(trend: Trend) {
    setDraft(normalizeTrendDraft(trend));
    setEditorOpen(true);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const prepared = normalizeTrendDraft(draft);
    if (!prepared.title.trim()) {
      return;
    }

    onSave(prepared);
    setDraft(blankDraft());
    setEditorOpen(false);
  }

  return (
    <section className="space-y-5">
      <div className="clean-panel rounded-2xl p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-1 text-xs font-black uppercase text-aqua">Tendencias</p>
            <h2 className="text-xl font-black text-white sm:text-2xl">Radar manual de oportunidades</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              Salve temas, videos e canais que chamaram atencao. Depois transforme os melhores sinais em ideias.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Pill className="border-slate-700/60 bg-white/[0.035] text-slate-300">{trends.length} sinais</Pill>
            <Pill className="border-aqua/20 bg-aqua/10 text-aqua">{highSignalCount} fortes</Pill>
            <Button
              variant={editorOpen ? "ghost" : "primary"}
              onClick={() => {
                setDraft(blankDraft());
                setEditorOpen((current) => !current);
              }}
            >
              {editorOpen ? "Fechar" : "+ Tendencia"}
            </Button>
          </div>
        </div>
      </div>

      {editorOpen && (
        <form className="clean-panel grid gap-3 rounded-2xl p-5 lg:grid-cols-4" onSubmit={submit}>
          <Field label="Tema" className="lg:col-span-2">
            <TextInput required value={draft.title} onChange={(event) => setField("title", event.target.value)} placeholder="Ex: IA para thumbnails" />
          </Field>
          <Field label="Nicho">
            <TextInput value={draft.niche} onChange={(event) => setField("niche", event.target.value)} placeholder="Ex: YouTube, games, finanças" />
          </Field>
          <Field label="Views observadas">
            <TextInput value={draft.views} onChange={(event) => setField("views", event.target.value)} placeholder="Ex: 120k, 1.4mi" />
          </Field>
          <Field label="Canal referencia">
            <TextInput value={draft.referenceChannel} onChange={(event) => setField("referenceChannel", event.target.value)} placeholder="Canal ou criador" />
          </Field>
          <Field label="Link">
            <TextInput type="url" value={draft.url} onChange={(event) => setField("url", event.target.value)} placeholder="https://youtube.com/..." />
          </Field>
          <Field label="Angulo para ideia" className="lg:col-span-2">
            <TextInput value={draft.ideaAngle} onChange={(event) => setField("ideaAngle", event.target.value)} placeholder="Como adaptar isso para meu canal?" />
          </Field>
          <Field label="Motivo da oportunidade" className="lg:col-span-2">
            <TextArea rows={3} value={draft.opportunityReason} onChange={(event) => setField("opportunityReason", event.target.value)} placeholder="Por que este tema parece promissor?" />
          </Field>
          <Field label="Notas" className="lg:col-span-2">
            <TextArea rows={3} value={draft.notes} onChange={(event) => setField("notes", event.target.value)} placeholder="Padrao de thumbnail, titulo, comentarios, timing..." />
          </Field>
          <div className="flex items-end gap-2 lg:col-span-4">
            {draft.id && (
              <Button onClick={() => setDraft(blankDraft())}>
                Limpar
              </Button>
            )}
            <Button variant="primary" type="submit">
              {draft.id ? "Atualizar tendencia" : "Salvar tendencia"}
            </Button>
          </div>
        </form>
      )}

      <div className="clean-panel rounded-2xl p-5">
        <div className="mb-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_240px]">
          <label className="field-label">
            <span>Buscar tendencia</span>
            <TextInput value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tema, canal, motivo..." />
          </label>
          <label className="field-label">
            <span>Nicho</span>
            <select className="field-control" value={nicheFilter} onChange={(event) => setNicheFilter(event.target.value)}>
              <option value="all">Todos os nichos</option>
              {niches.map((niche) => (
                <option key={niche} value={niche}>
                  {niche}
                </option>
              ))}
            </select>
          </label>
        </div>

        {filteredTrends.length ? (
          <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
            {filteredTrends.map((trend) => {
              const strongSignal = parseViews(trend.views) >= 100000;

              return (
                <article key={trend.id} className="rounded-xl border border-slate-700/35 bg-[#111722] p-4">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="line-clamp-2 text-base font-black text-white">{trend.title}</h3>
                      <p className="mt-1 truncate text-xs font-bold text-slate-500">
                        {[trend.referenceChannel, trend.niche].filter(Boolean).join(" / ") || "Sem referencia"}
                      </p>
                    </div>
                    <Pill className={strongSignal ? "border-aqua/20 bg-aqua/10 text-aqua" : "border-slate-700/60 bg-white/[0.035] text-slate-300"}>
                      {trend.views || "sem views"}
                    </Pill>
                  </div>

                  <p className="line-clamp-2 min-h-[3rem] text-sm font-semibold leading-6 text-slate-300">
                    {trend.opportunityReason || trend.ideaAngle || trend.notes || "Adicione o motivo da oportunidade para decidir se vale virar pauta."}
                  </p>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <Button className="min-h-9 px-3 text-xs" onClick={() => onCreateIdea(trendToVideoDraft(trend))}>
                      Virar ideia
                    </Button>
                    <Button className="min-h-9 px-3 text-xs" onClick={() => edit(trend)}>
                      Editar
                    </Button>
                  </div>
                  {onHuntSimilar && (
                    <Button
                      className="mt-2 min-h-9 w-full px-3 text-xs"
                      onClick={() => onHuntSimilar(trend)}
                    >
                      <Crosshair className="size-3.5" /> Caçar ideias parecidas
                    </Button>
                  )}
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {trend.url ? (
                      <a className="btn btn-ghost min-h-9 px-3 text-center text-xs" href={trend.url} target="_blank" rel="noreferrer">
                        Abrir link
                      </a>
                    ) : (
                      <Button className="min-h-9 px-3 text-xs" disabled>
                        Sem link
                      </Button>
                    )}
                    <Button className="min-h-9 px-3 text-xs" variant="danger" onClick={() => onDelete(trend.id)}>
                      Excluir
                    </Button>
                  </div>
                  <p className="mt-3 text-xs font-semibold text-slate-600">Atualizado em {formatRelativeDate(trend.updatedAt)}</p>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-700/70 p-6 text-sm font-semibold leading-6 text-slate-500">
            Nenhuma tendencia encontrada. Salve um tema promissor para transformar em ideia depois.
          </div>
        )}
      </div>
    </section>
  );
}
