import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Crosshair,
  ExternalLink,
  Globe,
  History,
  Key,
  Lightbulb,
  Loader2,
  Play,
  Plus,
  MonitorPlay,
  RefreshCw,
  Scissors,
  Sparkles,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import {
  buildProfileFromChannel,
  consumeScoutSeed,
  DEFAULT_SCOUT_MODEL,
  EMPTY_SCOUT_PROFILE,
  loadAnthropicKey,
  loadScoutModel,
  loadScoutState,
  profileIsReady,
  runIdeaScout,
  saveAnthropicKey,
  saveScoutModel,
  saveScoutState,
  SCORE_LABELS,
  SCOUT_MODELS,
  VERDICT_META,
  type ScoutIdea,
  type ScoutProfile,
  type ScoutProgressEvent,
  type ScoutReport,
  type ScoutRun,
  type ScoutState,
} from "../lib/ideaScout";
import {
  DEFAULT_YOUTUBE_CLIENT_ID,
  fetchYouTubeMarketScan,
  preloadGoogleIdentityScript,
  requestYouTubeAccessToken,
  YOUTUBE_CLIENT_ID_KEY,
  type YouTubeMarketScan,
} from "../lib/youtubeApi";
import { EMPTY_VIDEO, makeId } from "../lib/video";
import { Button, Field, SelectInput, TextArea, TextInput } from "./ui";
import { cx } from "./ui";

// ─── Small bits ───────────────────────────────────────────────────────────────

function SectionTitle({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div>
      <p className="mb-0.5 text-xs font-black uppercase tracking-wider text-aqua">{kicker}</p>
      <h2 className="text-xl font-black text-white">{title}</h2>
    </div>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-32 shrink-0 truncate text-[0.65rem] font-semibold text-slate-400">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/5">
        <div
          className={cx(
            "h-full rounded-full",
            value >= 4 ? "bg-emerald-400" : value >= 3 ? "bg-aqua" : value >= 2 ? "bg-amber-400" : "bg-red-400",
          )}
          style={{ width: `${(value / 5) * 100}%` }}
        />
      </div>
      <span className="w-4 shrink-0 text-right text-[0.65rem] font-black text-slate-300">{value}</span>
    </div>
  );
}

// ─── Idea card ────────────────────────────────────────────────────────────────

function IdeaCard({
  idea,
  onSaveAsVideo,
  onSaveAsTrend,
}: {
  idea: ScoutIdea;
  onSaveAsVideo: (idea: ScoutIdea) => void;
  onSaveAsTrend: (idea: ScoutIdea) => void;
}) {
  const [expanded, setExpanded] = useState(idea.rank <= 3);
  const meta = VERDICT_META[idea.verdict];

  return (
    <div
      className={cx(
        "rounded-2xl border bg-panel/75 transition",
        idea.verdict === "FAZER_JA"
          ? "border-emerald-400/20"
          : idea.verdict === "DEIXAR_PRA_LA"
          ? "border-red-400/15 opacity-80"
          : "border-slate-400/10",
      )}
    >
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-start gap-3 p-4 text-left"
      >
        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-sm font-black text-slate-300">
          {idea.rank}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cx("rounded-full px-2 py-0.5 text-[0.6rem] font-black tracking-wide", meta.badge)}>
              {meta.label}
            </span>
            <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[0.6rem] font-bold text-slate-400">
              Fit {idea.fit_total}/30
            </span>
          </div>
          <h3 className="mt-1.5 text-base font-black leading-snug text-white">{idea.title}</h3>
          {idea.title_en && idea.title_en !== idea.title && (
            <p className="mt-0.5 text-xs font-semibold text-slate-500">EN: {idea.title_en}</p>
          )}
        </div>
        <ChevronDown
          className={cx("mt-1 size-4 shrink-0 text-slate-500 transition-transform", expanded && "rotate-180")}
        />
      </button>

      {/* Body */}
      {expanded && (
        <div className="space-y-3 border-t border-slate-400/[0.08] p-4 pt-3">
          <div>
            <p className="text-[0.65rem] font-black uppercase tracking-wider text-sky-400">Ângulo / Hook</p>
            <p className="mt-0.5 text-sm leading-relaxed text-slate-200">{idea.angle_hook}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-emerald-400/10 bg-emerald-500/5 p-3">
              <p className="text-[0.65rem] font-black uppercase tracking-wider text-emerald-400">Por que pode bombar</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-300">{idea.why_can_pop}</p>
            </div>
            <div className="rounded-xl border border-red-400/10 bg-red-500/5 p-3">
              <p className="text-[0.65rem] font-black uppercase tracking-wider text-red-400">Riscos / por que pode flopar</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-300">{idea.risks}</p>
            </div>
          </div>

          {/* Scores */}
          <div className="space-y-1 rounded-xl bg-white/[0.02] p-3">
            {SCORE_LABELS.map(({ key, label }) => (
              <ScoreBar key={key} label={label} value={idea.scores[key]} />
            ))}
          </div>

          {/* Verdict reason */}
          <p className="text-xs font-semibold italic text-slate-400">
            Veredito: {idea.verdict_reason}
          </p>

          {/* Evidence */}
          {idea.evidence.length > 0 && (
            <div>
              <p className="text-[0.65rem] font-black uppercase tracking-wider text-slate-500">Evidências da pesquisa</p>
              <ul className="mt-1 space-y-1">
                {idea.evidence.map((e, i) => (
                  <li key={i} className="flex gap-1.5 text-xs leading-relaxed text-slate-400">
                    <span className="text-aqua">•</span>
                    {e}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-1">
            <Button variant="primary" onClick={() => onSaveAsVideo(idea)}>
              <Plus className="size-3.5" /> Criar ideia no Kanban
            </Button>
            <Button variant="ghost" onClick={() => onSaveAsTrend(idea)}>
              <Lightbulb className="size-3.5" /> Salvar no Banco de Ideias
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export function IdeaScoutPanel() {
  const { activeChannel, createVideo, saveTrend, setToast } = useApp();
  const channelKey = activeChannel?.id || "all";

  // Persistent state
  const [scoutState, setScoutState] = useState<ScoutState>(() => loadScoutState());
  const [apiKey, setApiKey] = useState(() => loadAnthropicKey());
  const [model, setModel] = useState(() => loadScoutModel());

  // Profile (per channel, prefilled from channel data)
  const [profile, setProfile] = useState<ScoutProfile>(() => {
    const stored = loadScoutState().profiles[channelKey];
    return stored ?? buildProfileFromChannel(activeChannel);
  });
  const [profileOpen, setProfileOpen] = useState(true);

  // Run state
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<ScoutProgressEvent | null>(null);
  const [progressLog, setProgressLog] = useState<string[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState("");
  const [useYouTubeData, setUseYouTubeData] = useState(false);
  const [refineText, setRefineText] = useState("");
  const [viewRunId, setViewRunId] = useState<string>("");
  // Semente vinda do Banco de Ideias ("Caçar parecidas").
  // Consumida em effect (não no initializer): o initializer roda 2x no StrictMode
  // e a segunda chamada apagaria a semente recém-lida.
  const [seedInstruction, setSeedInstruction] = useState("");
  useEffect(() => {
    const seed = consumeScoutSeed();
    if (seed) setSeedInstruction(seed);
  }, []);

  const runningRef = useRef(false);

  // Reload profile when channel changes
  useEffect(() => {
    const stored = loadScoutState().profiles[channelKey];
    setProfile(stored ?? buildProfileFromChannel(activeChannel));
    setViewRunId("");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelKey]);

  // Elapsed timer while running
  useEffect(() => {
    if (!running) return;
    const start = Date.now();
    const t = window.setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => window.clearInterval(t);
  }, [running]);

  const channelRuns = useMemo(
    () => scoutState.runs.filter((r) => r.channelId === channelKey),
    [scoutState.runs, channelKey],
  );

  const currentRun: ScoutRun | null = useMemo(() => {
    if (viewRunId) return channelRuns.find((r) => r.id === viewRunId) ?? null;
    return channelRuns[0] ?? null;
  }, [channelRuns, viewRunId]);

  const readiness = profileIsReady(profile);
  const hasKey = Boolean(apiKey.trim());

  // ── Persistence helpers ──

  function persistProfile(next: ScoutProfile) {
    setProfile(next);
    const state = { ...scoutState, profiles: { ...scoutState.profiles, [channelKey]: next } };
    setScoutState(state);
    saveScoutState(state);
  }

  function patchProfile(updates: Partial<ScoutProfile>) {
    persistProfile({ ...profile, ...updates });
  }

  function handleSaveKey(value: string) {
    setApiKey(value);
    saveAnthropicKey(value.trim());
  }

  function handleModelChange(value: string) {
    setModel(value);
    saveScoutModel(value);
  }

  // ── YouTube real-data scans (optional) ──

  async function collectYouTubeScans(): Promise<YouTubeMarketScan[]> {
    const queries = profile.searchKeywordsEn
      .split(",")
      .map((q) => q.trim())
      .filter(Boolean)
      .slice(0, 2);
    if (!queries.length) {
      setToast("Preencha as palavras-chave (EN) para usar dados reais do YouTube.");
      return [];
    }
    try {
      await preloadGoogleIdentityScript();
      const clientId = localStorage.getItem(YOUTUBE_CLIENT_ID_KEY) || DEFAULT_YOUTUBE_CLIENT_ID;
      const token = await requestYouTubeAccessToken(clientId);
      const scans: YouTubeMarketScan[] = [];
      for (const query of queries) {
        setProgressLog((log) => [...log, `📡 Varredura real do YouTube: "${query}" (90 dias)`]);
        scans.push(await fetchYouTubeMarketScan(token, query, 90));
      }
      return scans;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setProgressLog((log) => [...log, `⚠️ YouTube indisponível (${msg}) — seguindo só com web search.`]);
      return [];
    }
  }

  // ── Run the agent ──

  async function handleRun(refineInstruction = "") {
    if (runningRef.current) return;
    if (!hasKey) { setError("Configure sua chave da API Anthropic primeiro."); return; }
    if (!readiness.ok) {
      setError(`Preencha os campos críticos antes de rodar: ${readiness.missing.join(", ")}. O agente não inventa o canal.`);
      setProfileOpen(true);
      return;
    }

    // Sem refino explícito, a semente do Banco de Ideias guia a caçada
    const effectiveInstruction = refineInstruction || seedInstruction;

    runningRef.current = true;
    setRunning(true);
    setError("");
    setElapsed(0);
    setProgressLog([]);
    setProgress({ phase: "starting", detail: "Iniciando o agente…", searchCount: 0 });

    try {
      const scans = useYouTubeData ? await collectYouTubeScans() : [];

      const report = await runIdeaScout({
        profile,
        apiKey: apiKey.trim(),
        model,
        youtubeScans: scans,
        refineInstruction: effectiveInstruction,
        previousTopTitles: refineInstruction && currentRun ? currentRun.report.ideas.map((i) => i.title) : [],
        onProgress: (event) => {
          setProgress(event);
          setProgressLog((log) => {
            if (log[log.length - 1] === event.detail) return log;
            return [...log.slice(-11), event.detail];
          });
        },
      });

      const run: ScoutRun = {
        id: makeId(),
        channelId: channelKey,
        createdAt: new Date().toISOString(),
        model,
        usedYouTubeData: scans.length > 0,
        refineInstruction: effectiveInstruction,
        report,
      };
      const state: ScoutState = {
        ...scoutState,
        profiles: { ...scoutState.profiles, [channelKey]: profile },
        runs: [run, ...scoutState.runs].slice(0, 15),
      };
      setScoutState(state);
      saveScoutState(state);
      setViewRunId(run.id);
      setProfileOpen(false);
      setRefineText("");
      setSeedInstruction("");
      setToast(`Caçador concluído: ${report.ideas.length} ideias ranqueadas.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      runningRef.current = false;
      setRunning(false);
      setProgress(null);
    }
  }

  // ── Save actions ──

  function handleSaveAsVideo(idea: ScoutIdea) {
    createVideo({
      ...EMPTY_VIDEO,
      title: idea.title,
      channelId: activeChannel?.id || "",
      channel: activeChannel?.name || "",
      niche: activeChannel?.niche || profile.niche.slice(0, 60) || "Sem nicho",
      keyword: profile.searchKeywordsEn.split(",")[0]?.trim() || "",
      priority: idea.verdict === "FAZER_JA" ? "Alta" : "Media",
      status: "Ideia",
      seoTitle: idea.title,
      tags: ["caçador-de-ideias"],
      notes: [
        `🎯 Caçador de Ideias — veredito: ${VERDICT_META[idea.verdict].label} (fit ${idea.fit_total}/30)`,
        ``,
        `Ângulo/Hook: ${idea.angle_hook}`,
        ``,
        `Por que pode bombar: ${idea.why_can_pop}`,
        `Riscos: ${idea.risks}`,
        idea.evidence.length ? `\nEvidências:\n${idea.evidence.map((e) => `- ${e}`).join("\n")}` : "",
      ].filter(Boolean).join("\n"),
    });
  }

  function handleSaveAsTrend(idea: ScoutIdea) {
    saveTrend({
      title: idea.title,
      niche: activeChannel?.niche || profile.niche.slice(0, 60),
      referenceChannel: "",
      url: "",
      views: "",
      opportunityReason: idea.why_can_pop,
      ideaAngle: idea.angle_hook,
      notes: `Caçador de Ideias — ${VERDICT_META[idea.verdict].label}. Riscos: ${idea.risks}`,
    });
  }

  // ── Render ──

  return (
    <div className="space-y-5">
      {/* Header */}
      <section className="rounded-2xl border border-slate-400/10 bg-panel/75 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand/15">
              <Crosshair className="size-5 text-brand" />
            </div>
            <div>
              <SectionTitle kicker="Agente" title="Caçador de Ideias" />
              <p className="mt-1 max-w-xl text-xs leading-relaxed text-slate-400">
                Pesquisa o que está bombando no mercado gringo, gera 20-30 candidatos, filtra contra o DNA do
                seu canal e entrega o Top 10 com veredito honesto — incluindo o que é pra <strong className="text-slate-300">deixar pra lá</strong>.
              </p>
            </div>
          </div>

          {/* History */}
          {channelRuns.length > 0 && (
            <div className="flex items-center gap-2">
              <History className="size-3.5 text-slate-500" />
              <select
                value={currentRun?.id || ""}
                onChange={(e) => setViewRunId(e.target.value)}
                className="rounded-lg border border-slate-400/10 bg-white/[0.04] py-1.5 pl-2 pr-7 text-xs font-semibold text-slate-300 outline-none"
              >
                {channelRuns.map((r) => (
                  <option key={r.id} value={r.id}>
                    {new Date(r.createdAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    {r.refineInstruction ? " · refino" : ""}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Setup row */}
        <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_280px]">
          <Field label="Chave da API Anthropic" hint="fica só no seu navegador">
            <div className="relative">
              <Key className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-500" />
              <input
                type="password"
                value={apiKey}
                onChange={(e) => handleSaveKey(e.target.value)}
                placeholder="sk-ant-…  (crie em console.anthropic.com)"
                className="w-full rounded-xl border border-slate-400/15 bg-white/[0.04] py-2.5 pl-9 pr-3 text-sm font-semibold text-white outline-none transition focus:border-aqua/40"
              />
            </div>
          </Field>
          <Field label="Modelo">
            <SelectInput value={model} onChange={(e) => handleModelChange(e.target.value)}>
              {SCOUT_MODELS.map((m) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </SelectInput>
          </Field>
        </div>

        {!hasKey && (
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-500/15 bg-amber-500/5 px-3 py-2.5">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-400" />
            <p className="text-xs leading-relaxed text-slate-400">
              O agente roda com a API da Anthropic (Claude + busca na web em tempo real). Crie uma chave em{" "}
              <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer" className="font-bold text-aqua underline">
                console.anthropic.com <ExternalLink className="inline size-3" />
              </a>{" "}
              e cole acima. Cada execução custa centavos de dólar e usa seus créditos.
            </p>
          </div>
        )}
      </section>

      {/* Profile / DNA form */}
      <section className="rounded-2xl border border-slate-400/10 bg-panel/75">
        <button
          type="button"
          onClick={() => setProfileOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-3 p-5 text-left"
        >
          <div>
            <p className="mb-0.5 text-xs font-black uppercase tracking-wider text-slate-500">Contexto</p>
            <h3 className="text-base font-black text-white">
              DNA do canal {activeChannel ? `— ${activeChannel.name}` : "(todos os canais)"}
            </h3>
            {!readiness.ok && (
              <p className="mt-1 text-xs font-semibold text-amber-400">
                Faltam campos críticos: {readiness.missing.join(", ")} — o agente não inventa o canal.
              </p>
            )}
          </div>
          <ChevronDown className={cx("size-4 shrink-0 text-slate-500 transition-transform", profileOpen && "rotate-180")} />
        </button>

        {profileOpen && (
          <div className="grid gap-4 border-t border-slate-400/[0.08] p-5 sm:grid-cols-2">
            <Field label="Nicho (1 frase) *">
              <TextInput
                value={profile.niche}
                onChange={(e) => patchProfile({ niche: e.target.value })}
                placeholder="Ex: análises críticas de JRPGs clássicos e modernos"
              />
            </Field>
            <Field label="Audiência-alvo *" hint="idade, dor/interesse, país">
              <TextInput
                value={profile.audience}
                onChange={(e) => patchProfile({ audience: e.target.value })}
                placeholder="Ex: 18-34, gamers nostálgicos BR que querem decidir o que jogar"
              />
            </Field>
            <Field label="Formato *">
              <SelectInput
                value={profile.format}
                onChange={(e) => patchProfile({ format: e.target.value as ScoutProfile["format"] })}
              >
                <option value="faceless">Faceless (sem rosto)</option>
                <option value="com rosto">Com rosto</option>
                <option value="outro">Outro</option>
              </SelectInput>
            </Field>
            <Field label="Estilo de vídeo">
              <TextInput
                value={profile.style}
                onChange={(e) => patchProfile({ style: e.target.value })}
                placeholder="Ex: ensaio narrado, lista, review, narração dark"
              />
            </Field>
            <Field label="Idioma do conteúdo">
              <TextInput
                value={profile.language}
                onChange={(e) => patchProfile({ language: e.target.value })}
              />
            </Field>
            <Field label="Tom de voz (1 frase)">
              <TextInput
                value={profile.tone}
                onChange={(e) => patchProfile({ tone: e.target.value })}
                placeholder="Ex: direto e sarcástico, mas com base em dados"
              />
            </Field>
            <Field label="Formatos que JÁ performaram" hint="com exemplos">
              <TextArea
                rows={2}
                value={profile.provenFormats}
                onChange={(e) => patchProfile({ provenFormats: e.target.value })}
                placeholder='Ex: "rankings polêmicos" (vídeo X fez 120k), iceberg…'
              />
            </Field>
            <Field label="Formatos que flopam / evitar">
              <TextArea
                rows={2}
                value={profile.flopFormats}
                onChange={(e) => patchProfile({ flopFormats: e.target.value })}
                placeholder="Ex: vlogs, reacts, notícias do dia"
              />
            </Field>
            <Field label="Concorrentes / referências gringas">
              <TextArea
                rows={2}
                value={profile.competitors}
                onChange={(e) => patchProfile({ competitors: e.target.value })}
                placeholder="Ex: Super Eyepatch Wolf, Moon Channel"
              />
            </Field>
            <Field label="Restrições de produção">
              <TextArea
                rows={2}
                value={profile.constraints}
                onChange={(e) => patchProfile({ constraints: e.target.value })}
                placeholder="Ex: sem rosto, 1 vídeo/semana, sem orçamento pra editor"
              />
            </Field>
            <Field label="Palavras-chave de pesquisa (EN)" hint="separadas por vírgula — guiam as buscas">
              <TextInput
                value={profile.searchKeywordsEn}
                onChange={(e) => patchProfile({ searchKeywordsEn: e.target.value })}
                placeholder="Ex: jrpg retrospective, persona analysis"
              />
            </Field>
            <Field label="Idioma do relatório">
              <SelectInput
                value={profile.reportLanguage}
                onChange={(e) => patchProfile({ reportLanguage: e.target.value as ScoutProfile["reportLanguage"] })}
              >
                <option value="PT-BR">Português (BR)</option>
                <option value="EN">English</option>
              </SelectInput>
            </Field>
          </div>
        )}
      </section>

      {/* Run controls */}
      <section className="rounded-2xl border border-slate-400/10 bg-panel/75 p-5">
        {seedInstruction && !running && (
          <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-sky-400/20 bg-sky-500/5 px-3.5 py-3">
            <Lightbulb className="mt-0.5 size-4 shrink-0 text-sky-400" />
            <p className="flex-1 text-xs leading-relaxed text-slate-300">
              <strong className="text-sky-300">Semente do Banco de Ideias:</strong> {seedInstruction}
            </p>
            <button
              type="button"
              onClick={() => setSeedInstruction("")}
              className="shrink-0 rounded-md p-1 text-slate-500 transition hover:bg-white/[0.06] hover:text-slate-300"
              title="Descartar semente"
            >
              ✕
            </button>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="primary"
            disabled={running || !hasKey}
            onClick={() => handleRun()}
          >
            {running ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
            {running ? "Caçando ideias…" : "Rodar o Caçador"}
          </Button>

          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-400/10 bg-white/[0.03] px-3 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/[0.06]">
            <input
              type="checkbox"
              checked={useYouTubeData}
              onChange={(e) => setUseYouTubeData(e.target.checked)}
              className="size-3.5 accent-[#14b8a6]"
              disabled={running}
            />
            <MonitorPlay className="size-3.5 text-red-400" />
            Incluir dados reais do YouTube (login Google)
          </label>

          {running && (
            <span className="ml-auto flex items-center gap-1.5 text-xs font-bold text-slate-500">
              <Globe className="size-3.5 animate-pulse text-aqua" />
              {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}
            </span>
          )}
        </div>

        {/* Progress log */}
        {running && progress && (
          <div className="mt-4 space-y-1.5 rounded-xl border border-aqua/15 bg-aqua/[0.04] p-4">
            <p className="flex items-center gap-2 text-sm font-bold text-aqua">
              <Loader2 className="size-3.5 animate-spin" />
              {progress.detail}
            </p>
            {progressLog.slice(0, -1).slice(-5).map((line, i) => (
              <p key={i} className="pl-5 text-xs font-semibold text-slate-500">{line}</p>
            ))}
            {progress.searchCount > 0 && (
              <p className="pl-5 pt-1 text-[0.65rem] font-bold uppercase tracking-wide text-slate-600">
                {progress.searchCount} busca{progress.searchCount > 1 ? "s" : ""} na web até agora
              </p>
            )}
          </div>
        )}

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-red-400" />
            <p className="text-sm font-semibold text-red-300">{error}</p>
          </div>
        )}
      </section>

      {/* Report */}
      {currentRun && !running && (
        <>
          {/* DNA + market summary */}
          <section className="rounded-2xl border border-slate-400/10 bg-panel/75 p-5">
            <div className="flex items-start gap-3">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-amber-300" />
              <div className="min-w-0">
                <p className="text-[0.65rem] font-black uppercase tracking-wider text-slate-500">DNA usado como filtro</p>
                <p className="mt-0.5 text-sm font-bold leading-relaxed text-white">{currentRun.report.dna}</p>
                {currentRun.report.market_summary && (
                  <p className="mt-2 text-xs leading-relaxed text-slate-400">{currentRun.report.market_summary}</p>
                )}
                <p className="mt-2 text-[0.65rem] font-semibold text-slate-600">
                  {new Date(currentRun.createdAt).toLocaleString("pt-BR")} · {currentRun.model}
                  {currentRun.usedYouTubeData ? " · com dados reais do YouTube" : " · web search"}
                </p>
              </div>
            </div>
          </section>

          {/* Top 10 */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <SectionTitle kicker="Resultado" title={`Top ${currentRun.report.ideas.length} ideias`} />
              <div className="flex gap-2 text-[0.6rem] font-bold">
                {(["FAZER_JA", "TESTAR_COM_CUIDADO", "DEIXAR_PRA_LA"] as const).map((v) => {
                  const count = currentRun.report.ideas.filter((i) => i.verdict === v).length;
                  if (!count) return null;
                  return (
                    <span key={v} className={cx("rounded-full px-2 py-1", VERDICT_META[v].badge)}>
                      {count} {VERDICT_META[v].label}
                    </span>
                  );
                })}
              </div>
            </div>
            {currentRun.report.ideas.map((idea) => (
              <IdeaCard
                key={`${currentRun.id}-${idea.rank}`}
                idea={idea}
                onSaveAsVideo={handleSaveAsVideo}
                onSaveAsTrend={handleSaveAsTrend}
              />
            ))}
          </section>

          {/* Discarded */}
          {currentRun.report.discarded.length > 0 && (
            <section className="rounded-2xl border border-slate-400/10 bg-panel/75 p-5">
              <div className="mb-3 flex items-center gap-2">
                <Scissors className="size-4 text-slate-500" />
                <h3 className="text-base font-black text-white">Cortadas no filtro</h3>
                <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[0.6rem] font-bold text-slate-500">
                  {currentRun.report.discarded.length}
                </span>
              </div>
              <ul className="space-y-2">
                {currentRun.report.discarded.map((d, i) => (
                  <li key={i} className="flex gap-2 text-xs leading-relaxed">
                    <span className="text-red-400">✕</span>
                    <span>
                      <strong className="font-bold text-slate-300">{d.idea}</strong>
                      <span className="text-slate-500"> — {d.reason}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Self-eval + refine */}
          <section className="grid gap-5 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-400/10 bg-panel/75 p-5">
              <div className="mb-3 flex items-center gap-2">
                <CheckCircle2 className="size-4 text-aqua" />
                <h3 className="text-base font-black text-white">Autoavaliação do agente</h3>
              </div>
              <div className="space-y-1.5">
                <ScoreBar label="Qualidade da pesquisa" value={currentRun.report.self_eval.research_quality} />
                <ScoreBar label="Aderência ao canal" value={currentRun.report.self_eval.channel_fit} />
                <ScoreBar label="Honestidade do filtro" value={currentRun.report.self_eval.honesty} />
                <ScoreBar label="Força dos hooks" value={currentRun.report.self_eval.hook_strength} />
              </div>
              {currentRun.report.self_eval.how_to_improve && (
                <p className="mt-3 text-xs leading-relaxed text-slate-400">
                  <strong className="text-slate-300">Como melhorar:</strong> {currentRun.report.self_eval.how_to_improve}
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-slate-400/10 bg-panel/75 p-5">
              <div className="mb-3 flex items-center gap-2">
                <RefreshCw className="size-4 text-sky-400" />
                <h3 className="text-base font-black text-white">Refinar a caçada</h3>
              </div>
              <div className="space-y-2">
                {currentRun.report.refine_paths.map((path, i) => (
                  <button
                    key={i}
                    type="button"
                    disabled={running}
                    onClick={() => handleRun(path)}
                    className="block w-full rounded-xl border border-slate-400/10 bg-white/[0.03] px-3 py-2.5 text-left text-xs font-semibold text-slate-300 transition hover:border-sky-400/30 hover:bg-sky-500/5"
                  >
                    → {path}
                  </button>
                ))}
                <div className="flex gap-2 pt-1">
                  <TextInput
                    value={refineText}
                    onChange={(e) => setRefineText(e.target.value)}
                    placeholder="Ou descreva seu próprio refino…"
                  />
                  <Button
                    variant="ghost"
                    disabled={running || !refineText.trim()}
                    onClick={() => handleRun(refineText)}
                  >
                    Rodar
                  </Button>
                </div>
              </div>
            </div>
          </section>
        </>
      )}

      {/* Empty state */}
      {!currentRun && !running && (
        <section className="rounded-2xl border border-dashed border-slate-400/15 bg-panel/40 p-10 text-center">
          <Crosshair className="mx-auto size-8 text-slate-600" />
          <h3 className="mt-3 text-base font-black text-white">Nenhuma caçada ainda</h3>
          <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-slate-500">
            Preencha o DNA do canal acima (nicho, audiência e formato são obrigatórios), configure a chave da
            API e rode o Caçador. Ele pesquisa o mercado gringo de verdade — leva de 2 a 5 minutos.
          </p>
        </section>
      )}
    </div>
  );
}
