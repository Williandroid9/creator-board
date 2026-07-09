import {
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
  useEffect,
  useRef,
  useState,
} from "react";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import { useFocusTrap } from "../lib/useFocusTrap";

// ─── Utility ──────────────────────────────────────────────────────────────────

export function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

// ─── Button ───────────────────────────────────────────────────────────────────

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger" | "success";
};

export function Button({ children, className, variant = "ghost", type = "button", ...props }: ButtonProps) {
  const variantClass =
    variant === "primary" ? "btn-primary"
    : variant === "danger" ? "btn-danger"
    : variant === "success" ? "btn-success"
    : "btn-ghost";

  return (
    <button type={type} className={cx("btn", variantClass, className)} {...props}>
      {children}
    </button>
  );
}

// ─── Form controls ────────────────────────────────────────────────────────────

export function Field({ label, children, className, hint }: {
  label: string;
  children: ReactNode;
  className?: string;
  hint?: string;
}) {
  return (
    <label className={cx("field-label", className)}>
      <span className="flex items-center gap-1.5">
        {label}
        {hint && (
          <span className="font-normal text-slate-500 text-[0.7rem]">{hint}</span>
        )}
      </span>
      {children}
    </label>
  );
}

export function TextInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx("field-control", className)} {...props} />;
}

export function TextArea({ className, rows = 4, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cx("field-control", className)} rows={rows} {...props} />;
}

export function SelectInput({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cx("field-control", className)} {...props}>
      {children}
    </select>
  );
}

// ─── Pill ─────────────────────────────────────────────────────────────────────

export function Pill({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cx(
      "inline-flex items-center rounded-full border px-2.5 py-1 text-[0.72rem] font-extrabold",
      className,
    )}>
      {children}
    </span>
  );
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────

export function Tooltip({ children, tip, placement = "top" }: {
  children: ReactNode;
  tip: string;
  placement?: "top" | "bottom" | "left" | "right";
}) {
  const [show, setShow] = useState(false);

  const pos =
    placement === "top" ? "bottom-full left-1/2 -translate-x-1/2 mb-2"
    : placement === "bottom" ? "top-full left-1/2 -translate-x-1/2 mt-2"
    : placement === "left" ? "right-full top-1/2 -translate-y-1/2 mr-2"
    : "left-full top-1/2 -translate-y-1/2 ml-2";

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)}
      onBlur={() => setShow(false)}
    >
      {children}
      {show && (
        <span className={cx(
          "pointer-events-none absolute z-50 w-max max-w-[220px] rounded-lg border border-slate-700/60 bg-[#0d1420] px-3 py-1.5 text-xs font-semibold text-slate-200 shadow-xl",
          pos,
        )}>
          {tip}
        </span>
      )}
    </span>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

export function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div className={cx("animate-pulse rounded-lg bg-white/[0.06]", className)} />
  );
}

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="rounded-xl border border-slate-700/30 bg-[#111722] p-3 space-y-2.5">
      <SkeletonBlock className="h-4 w-3/4" />
      {Array.from({ length: lines - 1 }).map((_, i) => (
        <SkeletonBlock key={i} className={cx("h-3", i === lines - 2 ? "w-1/2" : "w-full")} />
      ))}
    </div>
  );
}

// ─── Confetti celebration ─────────────────────────────────────────────────────

const CONFETTI_COLORS = ["#ff3d46", "#14b8a6", "#f59e0b", "#6366f1", "#10b981", "#f472b6"];

interface Particle {
  id: number;
  x: number;
  color: string;
  delay: number;
  duration: number;
  size: number;
}

function generateParticles(count = 40): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    delay: Math.random() * 0.6,
    duration: 1.2 + Math.random() * 0.8,
    size: 5 + Math.random() * 6,
  }));
}

export function Confetti({ show }: { show: boolean }) {
  const [particles] = useState(() => generateParticles(40));
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!show) return;
    setVisible(true);
    const t = window.setTimeout(() => setVisible(false), 2500);
    return () => window.clearTimeout(t);
  }, [show]);

  if (!visible) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[80] overflow-hidden">
      {particles.map((p) => (
        <span
          key={p.id}
          className="absolute top-0 animate-confetti-fall rounded-sm"
          style={{
            left: `${p.x}%`,
            width: `${p.size}px`,
            height: `${p.size * 0.6}px`,
            backgroundColor: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>
  );
}

// ─── ConfirmDialog ────────────────────────────────────────────────────────────

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  onConfirm,
  onCancel,
  danger = false,
}: {
  open: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}) {
  const trapRef = useFocusTrap<HTMLDivElement>(open, onCancel);
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[75] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="animate-palette-in w-full max-w-sm overflow-hidden rounded-2xl border border-slate-700/60 bg-[#0d1218] shadow-2xl outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5">
          <h2 className="mb-1 text-base font-black text-white">{title}</h2>
          {message && (
            <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-400">{message}</p>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-700/40 px-5 py-3.5">
          <button
            type="button"
            onClick={onCancel}
            className="btn btn-ghost min-h-9 px-4 text-sm"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={cx("btn min-h-9 px-4 text-sm", danger ? "btn-danger" : "btn-primary")}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────

type ToastType = "success" | "error" | "info" | "celebrate";

function detectToastType(message: string): ToastType {
  const lower = message.toLowerCase();
  if (
    lower.includes("publicado") ||
    lower.includes("concluído") ||
    lower.includes("criado") ||
    lower.includes("salvo") ||
    lower.includes("restaurado") ||
    lower.includes("importado") ||
    lower.includes("aplicado")
  ) return "success";
  if (
    lower.includes("erro") ||
    lower.includes("não foi possível") ||
    lower.includes("falhou") ||
    lower.includes("excluído") ||
    lower.includes("excluido") ||
    lower.includes("removido")
  ) return "error";
  if (lower.includes("🎉") || lower.includes("parabéns")) return "celebrate";
  return "info";
}

const toastStyles: Record<ToastType, string> = {
  success: "border-emerald-500/30 bg-emerald-950/90 text-emerald-100",
  error: "border-red-500/30 bg-red-950/90 text-red-100",
  info: "border-aqua/25 bg-[#0f2423]/90 text-cyan-50",
  celebrate: "border-amber-500/30 bg-amber-950/90 text-amber-100",
};

const toastIcons: Record<ToastType, ReactNode> = {
  success: <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />,
  error: <AlertCircle className="size-4 shrink-0 text-red-400" />,
  info: <Info className="size-4 shrink-0 text-aqua" />,
  celebrate: <span className="shrink-0 text-base">🎉</span>,
};

export function Toast({
  message,
  onUndo,
}: {
  message: string;
  onUndo?: (() => void) | null;
}) {
  const type = detectToastType(message);

  return (
    <div
      className={cx(
        "toast fixed bottom-5 right-5 z-[60] flex max-w-[calc(100vw-2.5rem)] items-center gap-2.5 rounded-2xl border px-4 py-3 text-sm font-semibold shadow-soft backdrop-blur-md",
        toastStyles[type],
        message && "show",
      )}
      role="status"
    >
      {message && toastIcons[type]}
      <span className="flex-1">{message}</span>
      {message && onUndo && (
        <button
          type="button"
          onClick={onUndo}
          className="ml-1 shrink-0 rounded-md border border-current/25 bg-white/10 px-2 py-1 text-xs font-black transition hover:bg-white/20"
        >
          Desfazer
        </button>
      )}
    </div>
  );
}

// ─── Modal backdrop ───────────────────────────────────────────────────────────

export function ModalBackdrop({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={ref}
      className="modal-backdrop fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/65 p-4 sm:p-8 backdrop-blur-sm"
      onClick={(e) => { if (e.target === ref.current) onClose(); }}
    >
      {children}
    </div>
  );
}
