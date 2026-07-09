import { useEffect, useRef } from "react";

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

// Acessibilidade de modal: prende o Tab dentro do container, restaura o foco
// ao elemento anterior ao fechar e (opcionalmente) fecha no Escape.
// Retorna um ref para anexar ao elemento do diálogo.
export function useFocusTrap<T extends HTMLElement>(active: boolean, onEscape?: () => void) {
  const ref = useRef<T>(null);
  const escRef = useRef(onEscape);
  escRef.current = onEscape;

  useEffect(() => {
    if (!active) return;
    const node = ref.current;
    if (!node) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const focusables = () =>
      Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null);

    // Não rouba o foco se algo dentro do modal já o tem (ex.: autoFocus).
    if (!node.contains(document.activeElement)) {
      (focusables()[0] ?? node).focus?.();
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (escRef.current) {
          event.preventDefault();
          escRef.current();
        }
        return;
      }
      if (event.key !== "Tab") return;
      const els = focusables();
      if (!els.length) return;
      const first = els[0];
      const last = els[els.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    node.addEventListener("keydown", onKeyDown);
    return () => {
      node.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [active]);

  return ref;
}
