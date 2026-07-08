import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  PRIORITIES,
  type Channel,
  type Inspiration,
  type SaveState,
  type Video,
  type VideoDraft,
  type VideoStatus,
} from "../types";
import { localDateKey } from "../lib/date";
import { compareVideoToBenchmarks, getChannelBenchmarks } from "../lib/performance";
import { SCRIPT_TEMPLATES } from "../lib/scriptTemplates";
import { NEW_VIDEO_DRAFT_KEY, readJson } from "../lib/storage";
import { EMPTY_VIDEO, hasPerformance, hasScript, hasSeo, nextStatus, normalizeVideoDraft } from "../lib/video";
import { Button, Field, SelectInput, TextInput, cx } from "./ui";
import { PerformanceTab, PlanningTab, ProductionTab, PublishingTab, type TabKey } from "./VideoModalTabs";

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
  const hasStudioSyncData = Boolean(
    draft.studioViews ||
      draft.studioImpressions ||
      draft.studioWatchTimeHours ||
      draft.studioSubscribers ||
      draft.studioPublishedHour ||
      draft.studioSyncPeriod ||
      draft.studioImportedAt ||
      draft.contentType,
  );
  const nextStage = nextStatus(draft.status);
  const summaryItems = [
    { label: "Roteiro", done: hasScript(draft) },
    { label: "SEO", done: hasSeo(draft) },
    { label: "Data", done: Boolean(draft.plannedDate) },
  ];
  const doneCount = summaryItems.filter((item) => item.done).length;

  // Loop de aprendizado: este vídeo vs a média do canal (só publicados com dado).
  const benchmarkComparison = useMemo(() => {
    if (draft.status !== "Publicado") return [];
    const benchmarks = getChannelBenchmarks(videos, draft.id);
    if (benchmarks.sampleSize < 2) return []; // precisa de histórico para comparar
    return compareVideoToBenchmarks(draft as Video, benchmarks);
  }, [draft, videos]);

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
          role="dialog"
          aria-modal="true"
          aria-label="Nova ideia"
          className="modal-card glass-panel w-full max-w-lg rounded-2xl p-5 sm:p-6"
          onSubmit={submit}
        >
          {/* Header */}
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="mb-0.5 text-xs font-semibold uppercase text-aqua">Nova ideia</p>
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
              Mais campos (roteiro, SEO, data) →
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
      <form
        role="dialog"
        aria-modal="true"
        aria-label={editing ? "Editar vídeo" : "Cadastrar vídeo"}
        className="modal-card glass-panel w-full max-w-5xl rounded-2xl p-5 sm:p-6"
        onSubmit={submit}
      >
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase text-aqua">{editing ? "Editar vídeo" : "Nova ideia"}</p>
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
          <PlanningTab draft={draft} setField={setField} setChannel={setChannel} channels={channels} />
        )}

        {activeTab === "production" && (
          <ProductionTab
            draft={draft}
            setField={setField}
            videos={videos}
            advancedMode={advancedMode}
            setActiveTab={setActiveTab}
            onSendBriefToNotes={sendBriefToNotes}
            onToggleInspiration={toggleInspiration}
            suggestedInspirations={suggestedInspirations}
          />
        )}

        {activeTab === "publishing" && (
          <PublishingTab
            draft={draft}
            setField={setField}
            setActiveTab={setActiveTab}
            onSchedule={markScheduled}
            onPublish={markPublished}
          />
        )}

        {activeTab === "performance" && performanceVisible && (
          <PerformanceTab
            draft={draft}
            setField={setField}
            benchmarkComparison={benchmarkComparison}
            hasStudioSyncData={hasStudioSyncData}
          />
        )}
          </div>

          <aside className="rounded-xl border border-slate-700/45 bg-black/20 p-4">
            <div className="mb-4">
              <p className="mb-1 text-xs font-semibold uppercase text-aqua">Resumo</p>
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
              <Button className="w-full" onClick={() => setActiveTab("publishing")}>
                Publicação & revisão
              </Button>
              {draft.publishedLink ? (
                <a className={cx("btn btn-ghost w-full text-sm")} href={draft.publishedLink} target="_blank" rel="noreferrer">
                  Abrir publicado
                </a>
              ) : null}
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
