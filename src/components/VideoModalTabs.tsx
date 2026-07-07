import { PRIORITIES, STATUSES, type Channel, type Inspiration, type Video, type VideoDraft, type VideoStatus } from "../types";
import type { MetricComparison } from "../lib/performance";
import { SCRIPT_TEMPLATES } from "../lib/scriptTemplates";
import { PublishReview } from "./PublishReview";
import { ScriptAnalysis } from "./ScriptAnalysis";
import { TitleAnalyzer } from "./TitleAnalyzer";
import { Field, Pill, SelectInput, TextArea, TextInput, cx } from "./ui";
import { VideoBrief } from "./VideoBrief";

export type TabKey = "planning" | "production" | "publishing" | "performance";

// Atualiza um campo do rascunho preservando o tipo do valor.
type SetField = <K extends keyof VideoDraft>(field: K, value: VideoDraft[K]) => void;

// ─── Planejamento ─────────────────────────────────────────────────────────────

export function PlanningTab({
  draft,
  setField,
  setChannel,
  channels,
}: {
  draft: VideoDraft;
  setField: SetField;
  setChannel: (channelId: string) => void;
  channels: Channel[];
}) {
  return (
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
  );
}

// ─── Produção (conteúdo + SEO + ferramentas) ─────────────────────────────────

export function ProductionTab({
  draft,
  setField,
  videos,
  advancedMode,
  setActiveTab,
  onSendBriefToNotes,
  onToggleInspiration,
  suggestedInspirations,
}: {
  draft: VideoDraft;
  setField: SetField;
  videos: Video[];
  advancedMode: boolean;
  setActiveTab: (tab: TabKey) => void;
  onSendBriefToNotes: (brief: string) => void;
  onToggleInspiration: (id: string) => void;
  suggestedInspirations: Array<{ item: Inspiration; score: number }>;
}) {
  return (
    <section className="grid gap-5">
      <div className="grid gap-4">
        <div>
          <p className="mb-3 text-xs font-semibold uppercase text-slate-500">Conteúdo</p>
          <div className="grid gap-4">
            <Field label="Roteiro">
              <TextArea rows={8} value={draft.script} onChange={(event) => setField("script", event.target.value)} placeholder="Gancho, blocos principais, CTA e cortes importantes" />
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

        {/* SEO — sempre visível: é etapa essencial do vídeo, não item "avançado" */}
        <div className="rounded-xl border border-slate-700/45 bg-black/18 p-4">
          <p className="mb-3 text-xs font-semibold uppercase text-slate-500">SEO</p>
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

        {advancedMode ? (
          <>
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
                  onSendToNotes={onSendBriefToNotes}
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
                          onChange={() => onToggleInspiration(item.id)}
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
  );
}

// ─── Publicação ───────────────────────────────────────────────────────────────

export function PublishingTab({
  draft,
  setField,
  setActiveTab,
  onSchedule,
  onPublish,
}: {
  draft: VideoDraft;
  setField: SetField;
  setActiveTab: (tab: TabKey) => void;
  onSchedule: () => void;
  onPublish: () => void;
}) {
  return (
    <section className="grid gap-5">
      <PublishReview
        draft={draft}
        onEditPlanning={() => setActiveTab("planning")}
        onEditContent={() => setActiveTab("production")}
        onEditSeo={() => setActiveTab("production")}
        onEditPublishing={() => setActiveTab("publishing")}
        onSchedule={onSchedule}
        onPublish={onPublish}
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
  );
}

// ─── Performance (pós-publicação) ─────────────────────────────────────────────

export function PerformanceTab({
  draft,
  setField,
  benchmarkComparison,
  hasStudioSyncData,
}: {
  draft: VideoDraft;
  setField: SetField;
  benchmarkComparison: MetricComparison[];
  hasStudioSyncData: boolean;
}) {
  return (
    <section className="grid gap-4">
      {/* Comparação com a média do canal — o coração do loop de aprendizado */}
      {benchmarkComparison.length > 0 && (
        <div className="rounded-xl border border-aqua/20 bg-aqua/[0.04] p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-aqua">Este vídeo vs sua média</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {benchmarkComparison.map((c) => {
              const tone =
                c.direction === "up" ? "text-emerald-300" : c.direction === "down" ? "text-amber-300" : "text-slate-300";
              const arrow = c.direction === "up" ? "▲" : c.direction === "down" ? "▼" : "—";
              return (
                <div key={c.key} className="rounded-lg bg-black/20 p-3">
                  <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-slate-500">{c.label}</p>
                  <p className="mt-1 text-2xl font-extrabold text-white">{c.display}</p>
                  <p className={cx("mt-1 text-xs font-bold", tone)}>
                    {arrow} {Math.abs(c.deltaPct) < 5 ? "na média" : `${c.deltaPct > 0 ? "+" : ""}${c.deltaPct.toFixed(0)}% vs média`}
                  </p>
                  <p className="text-[0.65rem] font-semibold text-slate-600">média {c.averageDisplay}</p>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs leading-relaxed text-slate-400">
            Anote em <strong className="text-slate-300">"Lições"</strong> o que explica esse resultado — é o que melhora o próximo vídeo.
          </p>
        </div>
      )}

      {/* Núcleo manual — o que vale anotar à mão */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Views (24h)">
          <TextInput type="number" min="0" value={draft.views24h} onChange={(event) => setField("views24h", event.target.value)} />
        </Field>
        <Field label="CTR (%)">
          <TextInput type="number" min="0" step="0.1" value={draft.ctr} onChange={(event) => setField("ctr", event.target.value)} />
        </Field>
        <Field label="Retencao media (%)">
          <TextInput type="number" min="0" step="0.1" value={draft.studioRetention} onChange={(event) => setField("studioRetention", event.target.value)} />
        </Field>
        <Field label="Duracao media">
          <TextInput value={draft.avgDuration} onChange={(event) => setField("avgDuration", event.target.value)} placeholder="Ex: 4:32" />
        </Field>
      </div>

      <Field label="O que funcionou">
        <TextArea rows={4} value={draft.performanceNotes} onChange={(event) => setField("performanceNotes", event.target.value)} placeholder="Gancho, tema, retencao, comentarios" />
      </Field>
      <Field label="Licoes para o proximo video">
        <TextArea rows={4} value={draft.lessons} onChange={(event) => setField("lessons", event.target.value)} placeholder="O que repetir, ajustar ou evitar" />
      </Field>

      {/* Dados do sync — só aparecem quando o YouTube preencheu algo */}
      {hasStudioSyncData ? (
        <details className="rounded-xl border border-slate-700/45 bg-black/18 p-4">
          <summary className="cursor-pointer list-none text-sm font-black text-white">
            Dados do YouTube (sync automático)
          </summary>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <Field label="Views Studio">
              <TextInput type="number" min="0" value={draft.studioViews} onChange={(event) => setField("studioViews", event.target.value)} />
            </Field>
            <Field label="Impressoes">
              <TextInput type="number" min="0" value={draft.studioImpressions} onChange={(event) => setField("studioImpressions", event.target.value)} />
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
          </div>
        </details>
      ) : (
        <p className="rounded-xl border border-slate-700/45 bg-black/18 p-4 text-sm leading-6 text-slate-500">
          Conecte o canal na aba <strong className="text-slate-300">Canais</strong> para puxar views, impressões e
          watch time automaticamente do YouTube.
        </p>
      )}
    </section>
  );
}
