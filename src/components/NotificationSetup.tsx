import { useEffect, useState } from "react";
import {
  Bell,
  BellOff,
  BellRing,
  Check,
  Clock,
  Smartphone,
  X,
  Zap,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import {
  generateSmartNotification,
  showNotificationViaSW,
  type NotifType,
  type NotificationPrefs,
} from "../lib/notifications";
import { cx } from "./ui";
import { useFocusTrap } from "../lib/useFocusTrap";

// ─── Notification type definitions ────────────────────────────────────────────

const NOTIF_TYPE_DEFS: Array<{
  id: NotifType;
  label: string;
  detail: string;
  emoji: string;
}> = [
  {
    id: "daily_mission",
    label: "Missão diária",
    detail: "O vídeo mais importante para trabalhar hoje",
    emoji: "📹",
  },
  {
    id: "channel_inactive",
    label: "Canal inativo",
    detail: "Quando um canal fica X dias sem publicar",
    emoji: "📉",
  },
  {
    id: "ready_to_publish",
    label: "Prontos para publicar",
    detail: "Vídeos 100% preparados — só falta apertar o botão",
    emoji: "🚀",
  },
  {
    id: "overdue_alert",
    label: "Vídeos atrasados",
    detail: "Alertas de alta prioridade com data vencida",
    emoji: "⚠️",
  },
  {
    id: "weekly_goal",
    label: "Meta semanal",
    detail: "Quando falta 1–2 publicações para bater a meta",
    emoji: "🎯",
  },
  {
    id: "streak_risk",
    label: "Sequência em risco",
    detail: "Para você não quebrar sua consistência de produção",
    emoji: "🔥",
  },
  {
    id: "pipeline_stale",
    label: "Pipeline parado",
    detail: "Vídeos há mais de 7 dias no mesmo status",
    emoji: "📦",
  },
];

const DAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

type PermState = "default" | "granted" | "denied" | "unsupported";

// ─── Toggle component ─────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={cx(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200",
        checked ? "bg-aqua" : "bg-slate-700",
      )}
    >
      <span
        aria-hidden
        className={cx(
          "pointer-events-none inline-block size-5 rounded-full bg-white shadow-lg ring-0 transition-transform duration-200",
          checked ? "translate-x-5" : "translate-x-0",
        )}
      />
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type Props = { open: boolean; onClose: () => void };

export function NotificationSetup({ open, onClose }: Props) {
  const { notifPrefs, saveNotifPrefsAndReschedule, data } = useApp();

  const [permState, setPermState] = useState<PermState>(() => {
    if (!("Notification" in window)) return "unsupported";
    return Notification.permission as PermState;
  });

  const [local, setLocal] = useState<NotificationPrefs>({ ...notifPrefs });
  const [dirty, setDirty] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"ok" | "err" | null>(null);

  // Sync when modal opens
  useEffect(() => {
    if (!open) return;
    setLocal({ ...notifPrefs });
    setDirty(false);
    setTestResult(null);
    if ("Notification" in window) setPermState(Notification.permission as PermState);
  }, [open, notifPrefs]);

  function patch(updates: Partial<NotificationPrefs>) {
    setLocal((p) => ({ ...p, ...updates }));
    setDirty(true);
  }

  function toggleDay(day: number) {
    const days = local.days.includes(day)
      ? local.days.filter((d) => d !== day)
      : [...local.days, day].sort((a, b) => a - b);
    patch({ days });
  }

  function toggleType(id: NotifType) {
    const types = local.types.includes(id)
      ? local.types.filter((t) => t !== id)
      : [...local.types, id];
    patch({ types });
  }

  async function requestPermission() {
    setRequesting(true);
    try {
      const result = await Notification.requestPermission();
      setPermState(result as PermState);
      if (result === "granted") {
        const prefs: NotificationPrefs = { ...local, enabled: true };
        setLocal(prefs);
        saveNotifPrefsAndReschedule(prefs);
        setDirty(false);
      }
    } finally {
      setRequesting(false);
    }
  }

  function handleSave() {
    saveNotifPrefsAndReschedule(local);
    setDirty(false);
    onClose();
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const payload = generateSmartNotification(data, local.types);
      await showNotificationViaSW(payload);
      setTestResult("ok");
    } catch {
      setTestResult("err");
    } finally {
      setTesting(false);
    }
  }

  const trapRef = useFocusTrap<HTMLDivElement>(open, onClose);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        aria-label="Configurar notificações"
        tabIndex={-1}
        className="relative z-10 max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl border border-slate-400/10 bg-[#0d1218] shadow-2xl outline-none sm:max-w-[480px] sm:rounded-2xl"
      >

        {/* Header */}
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-slate-400/[0.08] bg-[#0d1218] px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand/15">
              <BellRing className="size-5 text-brand" />
            </div>
            <div>
              <h2 className="text-base font-black text-white">Notificações inteligentes</h2>
              <p className="text-[0.7rem] text-slate-500">Lembretes baseados no seu pipeline real</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 transition hover:bg-white/[0.06] hover:text-slate-300"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-4 p-5">

          {/* ── Unsupported ── */}
          {permState === "unsupported" && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
              <p className="text-sm font-bold text-amber-400">Navegador não suportado</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">
                Notificações push exigem o Chrome, Edge ou Firefox moderno. Safari no macOS 13+ também funciona.
              </p>
            </div>
          )}

          {/* ── Denied ── */}
          {permState === "denied" && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
              <div className="flex items-start gap-3">
                <BellOff className="mt-0.5 size-5 shrink-0 text-red-400" />
                <div>
                  <p className="text-sm font-bold text-red-400">Notificações bloqueadas</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400">
                    Você bloqueou este site. Para reativar:
                  </p>
                  <ol className="mt-2 space-y-1 text-xs text-slate-400">
                    <li>1. Clique no ícone 🔒 na barra de endereços</li>
                    <li>2. Vá em "Notificações" e mude para "Permitir"</li>
                    <li>3. Recarregue a página e volte aqui</li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          {/* ── Default — CTA ── */}
          {permState === "default" && (
            <div className="overflow-hidden rounded-xl border border-aqua/20 bg-aqua/5">
              {/* Preview cards */}
              <div className="space-y-2 p-4 pb-0">
                {[
                  { emoji: "🚨", t: "Canal X está 12 dias sem publicar!", b: '"Tutorial React" está pronto — só falta apertar o botão.' },
                  { emoji: "🎯", t: "Falta só 1 vídeo para bater a meta!", b: "Você já publicou 3/4 esta semana. Você consegue!" },
                  { emoji: "🔥", t: "Sequência de 8 dias — não quebre!", b: "Consistência é o que separa quem cresce de quem some." },
                ].map(({ emoji, t, b }) => (
                  <div
                    key={t}
                    className="rounded-lg border border-slate-400/10 bg-[#0d1218]/80 p-3"
                  >
                    <p className="text-xs font-bold text-white">{emoji} {t}</p>
                    <p className="mt-0.5 text-[0.65rem] text-slate-400">{b}</p>
                  </div>
                ))}
              </div>

              <div className="p-4">
                <p className="mb-3 text-[0.7rem] leading-relaxed text-slate-400">
                  Receba o lembrete certo, na hora certa — baseado no que está real no seu pipeline.
                </p>
                <button
                  type="button"
                  onClick={requestPermission}
                  disabled={requesting}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 text-sm font-bold text-white shadow-lg shadow-brand/20 transition hover:bg-[#f0444d] disabled:opacity-60"
                >
                  {requesting ? (
                    <>
                      <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Aguardando permissão…
                    </>
                  ) : (
                    <>
                      <Bell className="size-4" />
                      Ativar notificações inteligentes
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ── Granted — Settings ── */}
          {permState === "granted" && (
            <>
              {/* Master toggle */}
              <div className="flex items-center justify-between rounded-xl border border-slate-400/10 bg-white/[0.03] px-4 py-3">
                <div>
                  <p className="text-sm font-bold text-white">Notificações diárias</p>
                  <p className="text-[0.7rem] text-slate-500">Receber lembretes personalizados</p>
                </div>
                <Toggle checked={local.enabled} onChange={() => patch({ enabled: !local.enabled })} />
              </div>

              {local.enabled && (
                <>
                  {/* Time */}
                  <div>
                    <label className="mb-2 flex items-center gap-1.5 text-[0.7rem] font-semibold uppercase tracking-wider text-slate-500">
                      <Clock className="size-3" />
                      Horário do lembrete
                    </label>
                    <input
                      type="time"
                      value={local.time}
                      onChange={(e) => patch({ time: e.target.value })}
                      className="w-full rounded-xl border border-slate-400/15 bg-white/[0.04] px-4 py-2.5 text-sm font-bold text-white outline-none transition focus:border-aqua/40 focus:bg-white/[0.07]"
                    />
                  </div>

                  {/* Days */}
                  <div>
                    <p className="mb-2 text-[0.7rem] font-semibold uppercase tracking-wider text-slate-500">
                      Dias da semana
                    </p>
                    <div className="flex gap-1.5">
                      {DAY_LABELS.map((label, idx) => {
                        const on = local.days.length === 0 || local.days.includes(idx);
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => toggleDay(idx)}
                            className={cx(
                              "flex-1 rounded-lg py-2 text-[0.6rem] font-bold transition",
                              on
                                ? "bg-aqua/15 text-aqua ring-1 ring-aqua/30"
                                : "bg-white/[0.04] text-slate-600 hover:bg-white/[0.07] hover:text-slate-400",
                            )}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                    {local.days.length === 0 && (
                      <p className="mt-1.5 text-[0.65rem] text-slate-600">Todos os dias ativados</p>
                    )}
                  </div>

                  {/* Types */}
                  <div>
                    <p className="mb-2 text-[0.7rem] font-semibold uppercase tracking-wider text-slate-500">
                      O que receber
                    </p>
                    <div className="space-y-1.5">
                      {NOTIF_TYPE_DEFS.map(({ id, label, detail, emoji }) => {
                        const on = local.types.includes(id);
                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() => toggleType(id)}
                            className={cx(
                              "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition",
                              on
                                ? "border-slate-400/12 bg-white/[0.04]"
                                : "border-transparent bg-white/[0.02] opacity-40 hover:opacity-60",
                            )}
                          >
                            <span className="text-base leading-none">{emoji}</span>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-white">{label}</p>
                              <p className="truncate text-[0.65rem] text-slate-500">{detail}</p>
                            </div>
                            <span
                              className={cx(
                                "flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition",
                                on ? "border-aqua bg-aqua" : "border-slate-600",
                              )}
                            >
                              {on && <Check className="size-2.5 text-ink" strokeWidth={3} />}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Test */}
                  <div className="rounded-xl border border-slate-400/10 bg-white/[0.02] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold text-white">Testar agora</p>
                        <p className="text-[0.65rem] text-slate-500">
                          Notificação real baseada no seu pipeline atual
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleTest}
                        disabled={testing || local.types.length === 0}
                        className="shrink-0 rounded-xl border border-slate-400/15 bg-white/[0.05] px-3 py-2 text-xs font-bold text-slate-300 transition hover:bg-white/[0.10] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {testing ? "Enviando…" : "Enviar teste"}
                      </button>
                    </div>
                    {testResult === "ok" && (
                      <p className="mt-2 text-[0.65rem] font-semibold text-aqua">
                        ✓ Notificação enviada! Verifique a área de notificações do sistema.
                      </p>
                    )}
                    {testResult === "err" && (
                      <p className="mt-2 text-[0.65rem] font-semibold text-red-400">
                        Falha ao enviar. Verifique as permissões nas configurações do sistema.
                      </p>
                    )}
                  </div>

                  {/* PWA tip */}
                  <div className="flex items-start gap-3 rounded-xl border border-amber-500/10 bg-amber-500/5 px-4 py-3">
                    <Smartphone className="mt-0.5 size-4 shrink-0 text-amber-400" />
                    <div>
                      <p className="text-xs font-bold text-amber-300">
                        Instale como app para notificações em segundo plano
                      </p>
                      <p className="mt-1 text-[0.65rem] leading-relaxed text-slate-500">
                        No Chrome, clique no ícone <strong className="text-slate-400">⊕</strong> na barra de endereços para instalar. Assim você recebe lembretes mesmo sem o navegador aberto.
                      </p>
                    </div>
                  </div>
                </>
              )}

              {/* Zap tip when disabled */}
              {!local.enabled && (
                <div className="flex items-start gap-3 rounded-xl border border-slate-400/[0.08] bg-white/[0.02] px-4 py-3">
                  <Zap className="mt-0.5 size-4 shrink-0 text-slate-500" />
                  <p className="text-[0.7rem] leading-relaxed text-slate-500">
                    Ative as notificações para o Creator Board te lembrar de trabalhar nos seus vídeos — mesmo quando você esquecer de abrir o app.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {permState === "granted" && (
          <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-slate-400/[0.08] bg-[#0d1218] px-5 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-400 transition hover:text-slate-200"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className={cx(
                "flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition",
                dirty
                  ? "bg-brand text-white shadow-lg shadow-brand/20 hover:bg-[#f0444d]"
                  : "bg-white/[0.05] text-slate-300 hover:bg-white/[0.09]",
              )}
            >
              <Check className="size-4" />
              {dirty ? "Salvar" : "Feito"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
