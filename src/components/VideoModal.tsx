import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  PRIORITIES,
  STATUSES,
  type Channel,
  type Inspiration,
  type SaveState,
  type Video,
  type VideoDraft,
  type VideoStatus,
} from "../types";
import { localDateKey } from "../lib/date";
import { buildScriptFromTemplate, getScriptFormatLabel, mergeScriptTemplate, SCRIPT_TEMPLATES } from "../lib/scriptTemplates";
import { NEW_VIDEO_DRAFT_KEY, readJson } from "../lib/storage";
import { EMPTY_VIDEO, hasPerformance, hasScript, hasSeo, hasThumbnail, nextStatus, normalizeVideoDraft } from "../lib/video";
import { PublishReview } from "./PublishReview";
import { ScriptAnalysis } from "./ScriptAnalysis";
import { TitleAnalyzer } from "./TitleAnalyzer";
import { Button, Field, Pill, SelectInput, TextArea, TextInput, cx } from "./ui";
import { VideoBrief } from "./VideoBrief";

type TabKey = "planning" | "production" | "publishing" | "performance";

type Tab = {
  key: TabKey;
  label: string;
};

type VideoModalProps = {
  open: boolean;
  video: Video | null;
  videos: Video[];
  channels: Channel[];
  inspirations: Inspiration[];
  onClose: () => void;
  onCreate: (draft: VideoDraft) => void;
  onUpdate: (draft: VideoDraft, mode?: "autosave" | "manual") => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onToggleArchive: (id: string) => void;
};

const emptyDraft = normalizeVideoDraft({ ...EMPTY_VIDEO, id: "", status: "Ideia" as VideoStatus, priority: "Media" });

function getInitialNewDraft(): VideoDraft {
  return normalizeVideoDraft(readJson<VideoDraft>(NEW_VIDEO_DRAFT_KEY, emptyDraft));
}

function cleanDraft(draft: VideoDraft): VideoDraft {
  const normalized = normalizeVideoDraft(draft);

  return {
    ...normalized,
    title: normalized.title.trim(),
    channel: normalized.channel.trim(),
    niche: normalized.niche.trim(),
    keyword: normalized.keyword.trim(),
    videoFormat: normalized.videoFormat.trim(),
    contentType: normalized.contentType.trim(),
    studioSyncPeriod: normalized.studioSyncPeriod.trim(),
    script: normalized.script.trim(),
    thumbnailIdeas: normalized.thumbnailIdeas.trim(),
    seoTitle: normalized.seoTitle.trim(),
    seoDescription: normalized.seoDescription.trim(),
    seoNotes: normalized.seoNotes.trim(),
    notes: normalized.notes.trim(),
    inspirationLinks: normalized.inspirationLinks.trim(),
    publishedLink: normalized.publishedLink.trim(),
    publishedAt: normalized.status === "Publicado" && !normalized.publishedAt ? localDateKey() : normalized.publishedAt,
    studioVideoId: normalized.studioVideoId.trim(),
    studioViews: normalized.studioViews.trim(),
    studioImpressions: normalized.studioImpressions.trim(),
    studioRetention: normalized.studioRetention.trim(),
    studioWatchTimeHours: normalized.studioWatchTimeHours.trim(),
    studioSubscribers: normalized.studioSubscribers.trim(),
    studioPublishedHour: normalized.studioPublishedHour.trim(),
  };
}

export function VideoModal({
  open,
  video,
  videos,
  channels,
  inspirations,
  onClose,
  onCreate,
  onUpdate,
  onDelete,
  onDuplicate,
  onToggleArchive,
}: VideoModalProps) {
  const [draft, setDraft] = useState<VideoDraft>(emptyDraft);
  const [activeTab, setActiveTab] = useState<TabKey>("planning");
  const [dirty, setDirty] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [advancedMode, setAdvancedMode] = useState(false);
  const editing = Boolean(draft.id);
  const performanceVisible = draft.status === "Publicado" || hasPerformance(draft);
  const nextStage = nextStatus(draft.status);
  const summaryItems = [
    { label: "Roteiro", done: hasScript(draft) },
    { label: "Thumbnail", done: hasThumbnail(draft) },
    { label: "SEO", done: hasSeo(draft) },
    { label: "Data", done: Boolean(draft.plannedDate) },
  ];
  const doneCount = summaryItems.filter((item) => item.done).length;

  const tabs = useMemo<Tab[]>(() => {
    const base: Tab[] = [
      { key: "planning", label: "Planejamento" },
      { key: "production", label: "Produção" },
      { key: "publishing", label: "Publicação" },
    ];

    return performanceVisible ? [...base, { key: "performance", label: "Performance" }] : base;
  }, [performanceVisible]);

  const suggestedInspirations = useMemo(() => {
    const selected = new Set(draft.linkedInspirationIds);
    const scored = inspirations.map((item) => {
      const score =
        (item.channel && draft.channel && item.channel === draft.channel ? 3 : 0) +
        (item.niche && draft.niche && item.niche === draft.niche ? 2 : 0) +
        (selected.has(item.id) ? 10 : 0);

      return { item, score };
    });

    return scored.sort((a, b) => b.score - a.score || b.item.updatedAt.localeCompare(a.item.updatedAt)).slice(0, 12);
  }, [draft.channel, draft.linkedInspirationIds, draft.niche, inspirations]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setDraft(video ? normalizeVideoDraft(video) : getInitialNewDraft());
    setDirty(false);
    setActiveTab("planning");
    setAdvancedMode(false);
    setSaveState(video ? "saved" : "draft");
  }, [open, video?.id]);

  useEffect(() => {
    if (!tabs.some((tab) => tab.key === activeTab)) {
      setActiveTab("planning");
    }
  }, [activeTab, tabs]);

  useEffect(() => {
    if (!open || editing) {
      return;
    }

    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem(NEW_VIDEO_DRAFT_KEY, JSON.stringify(cleanDraft(draft)));
      } catch (error) {
        console.warn("Nao foi possivel salvar o rascunho local.", error);
      }
      setSaveState("draft");
    }, 300);

    return () => window.clearTimeout(timer);
  }, [draft, editing, open]);

  useEffect(() => {
    if (!open || !editing || !dirty) {
      return;
    }

    setSaveState("saving");
    const timer = window.setTimeout(() => {
      onUpdate(cleanDraft(draft), "autosave");
      setDirty(false);
      setSaveState("saved");
    }, 800);

    return () => window.clearTimeout(timer);
  }, [dirty, draft, editing, onUpdate, open]);

  if (!open) {
    return null;
  }

  function setField<K extends keyof VideoDraft>(field: K, value: VideoDraft[K]) {
    setDraft((current) => {
      const next = { ...current, [field]: value };

      if (field === "status" && value === "Publicado" && !next.publishedAt) {
        next.publishedAt = localDateKey();
      }

      return next;
    });
    setDirty(true);
    if (!editing) {
      setSaveState("draft");
    }
  }

  function setChannel(channelId: string) {
    const channel = channels.find((item) => item.id === channelId);

    setDraft((current) => ({
      ...current,
      channelId: channel?.id || "",
      channel: channel?.name || "",
      niche: current.niche || channel?.niche || "",
    }));
    setDirty(true);
    if (!editing) {
      setSaveState("draft");
    }
  }

  function advanceStage() {
    if (nextStage) {
      setField("status", nextStage);
    }
  }

  function toggleInspiration(id: string) {
    const current = new Set(draft.linkedInspirationIds);
    if (current.has(id)) {
      current.delete(id);
    } else {
      current.add(id);
    }

    setField("linkedInspirationIds", [...current]);
  }

  function insertScriptTemplate() {
    const template = buildScriptFromTemplate(draft);
    setField("script", mergeScriptTemplate(draft.script, template));
    if (draft.status === "Ideia") {
      setField("status", "Roteiro");
    }
    setActiveTab("production");
  }

  function sendBriefToNotes(brief: string) {
    const nextNotes = draft.notes.trim() ? `${draft.notes.trim()}\n\n${brief}` : brief;
    setField("notes", nextNotes);
    setActiveTab("production");
  }

  function markScheduled() {
    setField("status", "Agendado");
    setActiveTab("publishing");
  }

  function markPublished() {
    setField("status", "Publicado");
    setActiveTab("publishing");
  }

  function closeModal() {
    if (editing && dirty) {
      onUpdate(cleanDraft(draft), "autosave");
    }

    onClose();
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const prepared = cleanDraft(draft);

    if (editing) {
      onUpdate(prepared, "manual");
      setDirty(false);
      setSaveState("saved");
      onClose();
      return;
    }

    onCreate(prepared);
    try {
      localStorage.removeItem(NEW_VIDEO_DRAFT_KEY);
    } catch (error) {
      console.warn("Nao foi possivel limpar o rascunho local.", error);
    }
    setDirty(false);
    setSaveState("saved");
  }

  // ── Quick Create mode (new video, basic form) ──────────────────────────────
  const isQuickCreate = !editing && !advancedMode;

  if (isQuickCreate) {
    return (
      <div
        className="modal-backdrop fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/70 p-3 sm:p-5"
        onMouseDown={(event) => event.target === event.currentTarget && closeModal()}
      >
        <form
          className="modal-card glass-panel w-full max-w-lg rounded-2xl p-5 sm:p-6"
          onSubmit={submit}
        >
          {/* Header */}
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="mb-0.5 text-xs font-black uppercase text-aqua">Nova ideia</p>
              <h2 className="text-xl font-black">Criação rápida</h2>
            </div>
            <Button onClick={closeModal}>Fechar</Button>
          </div>

          <div className="space-y-4">
            {/* Title */}
            <Field label="Título *">
              <TextInput
                required
                autoFocus
                value={draft.title}
                onChange={(e) => setField("title", e.target.value)}
                placeholder="Ex: 7 erros que travam seu canal"
                className="text-base"
              />
            </Field>

            {/* Channel + Niche row */}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Canal">
                {channels.length ? (
                  <SelectInput value={draft.channelId} onChange={(e) => setChannel(e.target.value)}>
                    <option value="">Sem canal</option>
                    {channels.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </SelectInput>
                ) : (
                  <TextInput value={draft.channel} onChange={(e) => setField("channel", e.target.value)} placeholder="Nome do canal" />
                )}
              </Field>
              <Field label="Nicho *">
                <TextInput
                  required
                  value={draft.niche}
                  onChange={(e) => setField("niche", e.target.value)}
                  placeholder="Ex: Marketing"
                />
              </Field>
            </div>

            {/* Priority pills */}
            <div className="grid gap-2">
              <span className="text-[0.8rem] font-bold text-slate-300">Prioridade</span>
              <div className="flex gap-2">
                {PRIORITIES.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setField("priority", p)}
                    className={cx(
                      "flex-1 rounded-xl border py-2.5 text-sm font-black transition",
                      draft.priority === p
                        ? p === "Alta"
                          ? "border-brand/40 bg-brand/10 text-red-200"
                          : p === "Media"
                          ? "border-amber-400/40 bg-amber-400/10 text-amber-200"
                          : "border-slate-400/30 bg-white/[0.06] text-slate-300"
                        : "border-slate-700/40 bg-white/[0.03] text-slate-500 hover:border-slate-600/40 hover:text-slate-300",
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Format (optional) */}
            <Field label="Formato (opcional)">
              <SelectInput value={draft.videoFormat} onChange={(e) => setField("videoFormat", e.target.value)}>
                <option value="">Escolher formato</option>
                {SCRIPT_TEMPLATES.map((t) => (
                  <option key={t.key} value={t.key}>{t.label}</option>
                ))}
              </SelectInput>
            </Field>

            {/* Actions */}
            <div className="flex flex-col gap-2 pt-1 sm:flex-row">
              <Button variant="primary" type="submit" className="flex-1 py-3 text-base">
                Salvar ideia
              </Button>
            </div>

            {/* Full form toggle */}
            <button
              type="button"
              onClick={() => setAdvancedMode(true)}
              className="w-full text-center text-xs font-bold text-slate-500 transition hover:text-slate-300"
            >
              Mais campos (roteiro, SEO, data, thumbnail) →
            </button>
          </div>
        </form>
      </div>
    );
  }

  // ── Full form ───────────────────────────────────────────────────────────────
  return (
    <div
      className="modal-backdrop fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/70 p-3 sm:p-5"
      onMouseDown={(event) => event.target === event.currentTarget && closeModal()}
    >
      <form className="modal-card glass-panel w-full max-w-5xl rounded-2xl p-5 sm:p-6" onSubmit={submit}>
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="mb-1 text-xs font-black uppercase text-aqua">{editing ? "Editar vídeo" : "Nova ideia"}</p>
            <h2 className="text-2xl font-black">{editing ? draft.title || "Editar vídeo" : "Cadastrar vídeo"}</h2>
            <p className="mt-2 text-xs font-bold text-slate-400">
              {saveState === "saving" && "Salvando..."}
              {saveState === "saved" && "Salvo agora"}
              {saveState === "draft" && "Rascunho local"}
              {saveState === "idle" && ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {!editing && (
              <Button onClick={() => setAdvancedMode(false)}>
                ← Criação rápida
              </Button>
            )}
            <Button onClick={() => setAdvancedMode((current) => !current)}>
              {advancedMode && editing ? "Modo simples" : "Mostrar avançado"}
            </Button>
            <Button onClick={closeModal}>Fechar</Button>
            <Button variant="primary" type="submit">
              {editing ? "Salvar agora" : "Salvar ideia"}
            </Button>
          </div>
        </div>

        <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={cx(
                "shrink-0 rounded-lg px-3 py-2 text-sm font-black transition",
                activeTab === tab.key ? "bg-aqua text-ink" : "bg-white/[0.055] text-slate-300 hover:bg-white/[0.09]",
              )}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="min-w-0">

        {activeTab === "planning" && (
          <section className="grid gap-4 sm:grid-cols-2">
            <Field label="Titulo" className="sm:col-span-2">
              <TextInput required value={draft.title} onChange={(event) => setField("title", event.target.value)} placeholder="Ex: 7 erros que travam seu canal" />
            </Field>
            <Field label="Canal">
              {channels.length ? (
                <SelectInput value={draft.channelId} onChange={(event) => setChannel(event.target.value)}>
                  <option value="">Sem canal</option>
                  {channels.map((channel) => (
                    <option key={channel.id} value={channel.id}>
                      {channel.name}
                    </option>
                  ))}
                </SelectInput>
              ) : (
                <TextInput value={draft.channel} onChange={(event) => setField("channel", event.target.value)} placeholder="Ex: Canal principal" />
              )}
            </Field>
            <Field label="Nicho">
              <TextInput required value={draft.niche} onChange={(event) => setField("niche", event.target.value)} placeholder="Ex: Marketing" />
            </Field>
            <Field label="Prioridade">
              <SelectInput value={draft.priority} onChange={(event) => setField("priority", event.target.value as VideoDraft["priority"])}>
                {PRIORITIES.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Status">
              <SelectInput value={draft.status} onChange={(event) => setField("status", event.target.value as VideoStatus)}>
                {STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Data planejada">
              <TextInput type="date" value={draft.plannedDate} onChange={(event) => setField("plannedDate", event.target.value)} />
            </Field>
            <Field label="Palavra-chave principal">
              <TextInput value={draft.keyword} onChange={(event) => setField("keyword", event.target.value)} placeholder="Ex: crescer no YouTube" />
            </Field>
            <Field label="Tags" hint="separadas por vírgula">
              <TextInput
                value={(draft.tags ?? []).join(", ")}
                onChange={(event) => {
                  const raw = event.target.value;
                  const tags = raw.split(",").map((t) => t.trim()).filter(Boolean);
                  setField("tags", tags);
                }}
                placeholder="Ex: facecam, shorts, série, educativo"
              />
            </Field>
            <Field label="Formato do video" className="sm:col-span-2">
              <SelectInput value={draft.videoFormat} onChange={(event) => setField("videoFormat", event.target.value)}>
                <option value="">Escolher formato</option>
                {SCRIPT_TEMPLATES.map((template) => (
                  <option key={template.key} value={template.key}>
                    {template.label} - {template.description}
                  </option>
                ))}
              </SelectInput>
            </Field>
          </section>
        )}

        {activeTab === "production" && (
          <section className="grid gap-5">
            <div className="rounded-xl border border-slate-400/10 bg-white/[0.035] p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase text-slate-500">Roteiro rapido</p>
                  <h3 className="mt-1 text-lg font-black text-white">{getScriptFormatLabel(draft.videoFormat)}</h3>
                  <p className="mt-1 text-sm font-semibold leading-6 text-slate-300">
                    Use uma estrutura pronta quando estiver sem ponto de partida.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button className="min-h-9 px-3 text-xs" onClick={() => setActiveTab("planning")}>
                    Trocar formato
                  </Button>
                  <Button className="min-h-9 px-3 text-xs" variant="primary" onClick={insertScriptTemplate}>
                    Inserir estrutura
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid gap-4">
              <div>
                <p className="mb-3 text-xs font-black uppercase text-slate-500">Conteúdo</p>
                <div className="grid gap-4">
                  <Field label="Roteiro">
                    <TextArea rows={8} value={draft.script} onChange={(event) => setField("script", event.target.value)} placeholder="Gancho, blocos principais, CTA e cortes importantes" />
                  </Field>
                  <Field label="Ideias de thumbnails">
                    <TextArea rows={4} value={draft.thumbnailIdeas} onChange={(event) => setField("thumbnailIdeas", event.target.value)} placeholder="Texto curto, expressão, contraste, referência visual" />
                  </Field>
                  <Field label="Observações gerais">
                    <TextArea rows={4} value={draft.notes} onChange={(event) => setField("notes", event.target.value)} placeholder="Pendências, feedback, ajustes" />
                  </Field>
                  {advancedMode ? (
                    <Field label="Links para inspiração">
                      <TextArea rows={4} value={draft.inspirationLinks} onChange={(event) => setField("inspirationLinks", event.target.value)} placeholder="Cole um link por linha" />
                    </Field>
                  ) : null}
                </div>
              </div>

              {advancedMode ? (
                <>
              <div className="rounded-xl border border-slate-700/45 bg-black/18 p-4">
                <p className="mb-3 text-xs font-black uppercase text-slate-500">SEO</p>
                <div className="grid gap-4">
                  <TitleAnalyzer draft={draft} videos={videos} />
                  <Field label="Título SEO">
                    <TextInput value={draft.seoTitle} onChange={(event) => setField("seoTitle", event.target.value)} placeholder="Título otimizado para busca" />
                  </Field>
                  <Field label="Descrição SEO">
                    <TextArea rows={5} value={draft.seoDescription} onChange={(event) => setField("seoDescription", event.target.value)} placeholder="Descrição, links, capítulos e CTA" />
                  </Field>
                  <Field label="Tags e notas de SEO">
                    <TextArea rows={4} value={draft.seoNotes} onChange={(event) => setField("seoNotes", event.target.value)} placeholder="Tags, concorrentes, promessa do vídeo" />
                  </Field>
                </div>
              </div>

            <details className="rounded-xl border border-slate-700/45 bg-black/18 p-4">
              <summary className="cursor-pointer list-none text-sm font-black text-white">
                Ferramentas de análise e brief
              </summary>
              <div className="mt-4 grid gap-4">
                <ScriptAnalysis draft={draft} onEditContent={() => setActiveTab("production")} onEditSeo={() => setActiveTab("production")} />
                <VideoBrief
                  draft={draft}
                  onEditPlanning={() => setActiveTab("planning")}
                  onEditContent={() => setActiveTab("production")}
                  onEditSeo={() => setActiveTab("production")}
                  onSendToNotes={sendBriefToNotes}
                />
              </div>
            </details>

            <div className="rounded-xl border border-slate-700/50 bg-black/20 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-white">Inspiracoes vinculadas</p>
                  <p className="mt-1 text-xs font-bold text-slate-500">Priorizadas por canal e nicho deste video.</p>
                </div>
                <Pill className="border-aqua/25 bg-white/[0.04] text-aqua">{draft.linkedInspirationIds.length} usadas</Pill>
              </div>
              {suggestedInspirations.length ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {suggestedInspirations.map(({ item }) => {
                    const checked = draft.linkedInspirationIds.includes(item.id);

                    return (
                      <label key={item.id} className="flex gap-3 rounded-lg bg-white/[0.045] p-3 text-sm text-slate-200">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleInspiration(item.id)}
                          className="mt-1 h-4 w-4 shrink-0 accent-aqua"
                        />
                        <span className="min-w-0">
                          <span className="block truncate font-black text-white">{item.title}</span>
                          <span className="text-xs text-slate-400">
                            {item.type}
                            {item.channel ? ` - ${item.channel}` : ""}
                            {item.niche ? ` - ${item.niche}` : ""}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm leading-6 text-slate-500">
                  Cadastre referências no banco de inspirações para poder vincular aqui.
                </p>
              )}
            </div>
                </>
              ) : null}
            </div>
          </section>
        )}

        {activeTab === "publishing" && (
          <section className="grid gap-5">
            <PublishReview
              draft={draft}
              onEditPlanning={() => setActiveTab("planning")}
              onEditContent={() => setActiveTab("production")}
              onEditSeo={() => setActiveTab("production")}
              onEditPublishing={() => setActiveTab("publishing")}
              onSchedule={markScheduled}
              onPublish={markPublished}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Link publicado">
                <TextInput type="url" value={draft.publishedLink} onChange={(event) => setField("publishedLink", event.target.value)} placeholder="https://youtube.com/..." />
              </Field>
              <Field label="Data de publicação">
                <TextInput type="date" value={draft.publishedAt} onChange={(event) => setField("publishedAt", event.target.value)} />
              </Field>
              <div className="rounded-xl border border-slate-700/50 bg-black/20 p-4 text-sm leading-6 text-slate-400 sm:col-span-2">
                <strong className="block text-slate-200">Performance fica para depois da publicação.</strong>
                Quando o status virar Publicado, os campos de views, CTR, duração média e aprendizados aparecem em uma aba própria.
              </div>
            </div>
          </section>
        )}

        {activeTab === "performance" && performanceVisible && (
          <section className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Views Studio">
                <TextInput type="number" min="0" value={draft.studioViews} onChange={(event) => setField("studioViews", event.target.value)} />
              </Field>
              <Field label="Views em 24h">
                <TextInput type="number" min="0" value={draft.views24h} onChange={(event) => setField("views24h", event.target.value)} />
              </Field>
              <Field label="CTR (%)">
                <TextInput type="number" min="0" step="0.1" value={draft.ctr} onChange={(event) => setField("ctr", event.target.value)} />
              </Field>
              <Field label="Impressoes">
                <TextInput type="number" min="0" value={draft.studioImpressions} onChange={(event) => setField("studioImpressions", event.target.value)} />
              </Field>
              <Field label="Retencao media (%)">
                <TextInput type="number" min="0" step="0.1" value={draft.studioRetention} onChange={(event) => setField("studioRetention", event.target.value)} />
              </Field>
              <Field label="Duracao media">
                <TextInput value={draft.avgDuration} onChange={(event) => setField("avgDuration", event.target.value)} placeholder="Ex: 4:32" />
              </Field>
              <Field label="Watch time (h)">
                <TextInput type="number" min="0" step="0.1" value={draft.studioWatchTimeHours} onChange={(event) => setField("studioWatchTimeHours", event.target.value)} />
              </Field>
              <Field label="Inscritos ganhos">
                <TextInput type="number" value={draft.studioSubscribers} onChange={(event) => setField("studioSubscribers", event.target.value)} />
              </Field>
              <Field label="Horario publicado">
                <TextInput type="time" value={draft.studioPublishedHour} onChange={(event) => setField("studioPublishedHour", event.target.value)} />
              </Field>
              <Field label="Tipo">
                <TextInput value={draft.contentType} onChange={(event) => setField("contentType", event.target.value)} placeholder="Shorts ou Longo" />
              </Field>
              <Field label="Periodo sync">
                <TextInput value={draft.studioSyncPeriod} onChange={(event) => setField("studioSyncPeriod", event.target.value)} placeholder="YouTube API 90d" />
              </Field>
            </div>
            <Field label="O que funcionou">
              <TextArea rows={4} value={draft.performanceNotes} onChange={(event) => setField("performanceNotes", event.target.value)} placeholder="Gancho, tema, thumbnail, retencao, comentarios" />
            </Field>
            <Field label="Licoes para o proximo video">
              <TextArea rows={4} value={draft.lessons} onChange={(event) => setField("lessons", event.target.value)} placeholder="O que repetir, ajustar ou evitar" />
            </Field>
          </section>
        )}
          </div>

          <aside className="rounded-xl border border-slate-700/45 bg-black/20 p-4">
            <div className="mb-4">
              <p className="mb-1 text-xs font-black uppercase text-aqua">Resumo</p>
              <h3 className="line-clamp-2 text-lg font-black text-white">{draft.title || "Nova ideia"}</h3>
              <p className="mt-2 text-sm font-semibold text-slate-400">
                {[draft.channel, draft.niche].filter(Boolean).join(" / ") || "Sem canal"}
              </p>
            </div>

            <div className="grid gap-2 text-sm">
              <div className="flex items-center justify-between gap-3 rounded-lg bg-white/[0.045] px-3 py-2">
                <span className="font-bold text-slate-400">Status</span>
                <strong className="text-white">{draft.status}</strong>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-lg bg-white/[0.045] px-3 py-2">
                <span className="font-bold text-slate-400">Prioridade</span>
                <strong className="text-white">{draft.priority}</strong>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-lg bg-white/[0.045] px-3 py-2">
                <span className="font-bold text-slate-400">Checklist</span>
                <strong className="text-white">{doneCount}/{summaryItems.length}</strong>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {summaryItems.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  className="flex w-full items-center justify-between gap-3 rounded-lg bg-white/[0.045] px-3 py-2 text-left text-sm"
                  onClick={() => {
                    if (item.label === "Roteiro") setActiveTab("production");
                    if (item.label === "Thumbnail") setActiveTab("production");
                    if (item.label === "SEO") {
                      setAdvancedMode(true);
                      setActiveTab("production");
                    }
                    if (item.label === "Data") setActiveTab("planning");
                  }}
                >
                  <span className={item.done ? "font-bold text-slate-500 line-through" : "font-bold text-slate-200"}>
                    {item.label}
                  </span>
                  <span className={cx("h-2.5 w-2.5 rounded-full", item.done ? "bg-emerald-300" : "bg-amber-300")} />
                </button>
              ))}
            </div>

            <div className="mt-5 grid gap-2">
              <Button className="w-full" onClick={advanceStage} disabled={!nextStage}>
                {nextStage ? `Avancar para ${nextStage}` : "Finalizado"}
              </Button>
              {draft.publishedLink ? (
                <a className={cx("btn btn-ghost w-full text-sm")} href={draft.publishedLink} target="_blank" rel="noreferrer">
                  Abrir publicado
                </a>
              ) : (
                <Button className="w-full" onClick={() => setActiveTab("publishing")}>
                  Publicação
                </Button>
              )}
              <Button className="w-full" onClick={() => setActiveTab("publishing")}>
                Revisão final
              </Button>
              {draft.id ? (
                <details className="rounded-xl border border-slate-700/45 bg-black/18 p-3">
                  <summary className="cursor-pointer list-none text-sm font-black text-slate-300">Mais acoes</summary>
                  <div className="mt-3 grid gap-2">
                    <Button className="w-full" onClick={() => onDuplicate(draft.id!)}>
                      Duplicar como ideia
                    </Button>
                    <Button
                      className="w-full"
                      onClick={() => {
                        setDraft((current) => ({ ...current, archived: !current.archived }));
                        onToggleArchive(draft.id!);
                      }}
                    >
                      {draft.archived ? "Restaurar do arquivo" : "Arquivar"}
                    </Button>
                    <Button variant="danger" className="w-full" onClick={() => draft.id && onDelete(draft.id)}>
                      Excluir
                    </Button>
                  </div>
                </details>
              ) : null}
            </div>
          </aside>
        </div>
      </form>
    </div>
  );
}
