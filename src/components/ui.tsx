import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

export function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger";
};

export function Button({ children, className, variant = "ghost", type = "button", ...props }: ButtonProps) {
  const variantClass =
    variant === "primary" ? "btn-primary" : variant === "danger" ? "btn-danger" : "btn-ghost";

  return (
    <button type={type} className={cx("btn", variantClass, className)} {...props}>
      {children}
    </button>
  );
}

export function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={cx("field-label", className)}>
      <span>{label}</span>
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

export function Pill({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[0.72rem] font-extrabold",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Toast({ message }: { message: string }) {
  return (
    <div
      className={cx(
        "toast fixed bottom-5 right-5 z-[60] max-w-[calc(100vw-2.5rem)] rounded-2xl border border-aqua/25 bg-[#0f2423] px-4 py-3 text-sm font-bold text-cyan-50 shadow-soft",
        message && "show",
      )}
      role="status"
    >
      {message}
    </div>
  );
}
