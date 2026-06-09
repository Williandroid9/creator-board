import { Command, X } from "lucide-react";
import { cx } from "./ui";

const SHORTCUTS = [
  {
    category: "Ações rápidas",
    items: [
      { keys: ["N"], description: "Nova ideia" },
      { keys: ["F"], description: "Modo Foco on/off" },
    ],
  },
  {
    category: "Navegação",
    items: [
      { keys: ["R"], description: "Ir para Radar" },
      { keys: ["/"], description: "Focar na busca" },
    ],
  },
  {
    category: "Global",
    items: [
      { keys: ["Ctrl", "K"], description: "Command palette" },
      { keys: ["?"], description: "Esta tela de atalhos" },
      { keys: ["Esc"], description: "Fechar modal" },
    ],
  },
];

export function ShortcutsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[65] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="animate-palette-in w-full max-w-[360px] overflow-hidden rounded-2xl border border-slate-700/60 bg-[#0d1218] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-700/40 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <Command className="size-4 text-aqua" />
            <h2 className="text-sm font-black text-white">Atalhos de teclado</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 transition hover:bg-white/[0.05] hover:text-slate-300"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Shortcut groups */}
        <div className="space-y-4 p-4">
          {SHORTCUTS.map((group) => (
            <div key={group.category}>
              <p className="mb-2 px-1 text-[0.6rem] font-black uppercase tracking-widest text-slate-600">
                {group.category}
              </p>
              <div className="space-y-1">
                {group.items.map((item) => (
                  <div
                    key={item.description}
                    className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-white/[0.04]"
                  >
                    <span className="text-sm font-semibold text-slate-300">{item.description}</span>
                    <div className="flex items-center gap-1">
                      {item.keys.map((k, i) => (
                        <span key={k} className="flex items-center gap-1">
                          <kbd className="rounded border border-slate-700/60 bg-white/[0.05] px-2 py-0.5 text-[0.7rem] font-black text-slate-400">
                            {k}
                          </kbd>
                          {i < item.keys.length - 1 && (
                            <span className="text-[0.65rem] text-slate-700">+</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-slate-700/40 px-5 py-3">
          <p className="text-center text-[0.65rem] font-semibold text-slate-600">
            Pressione{" "}
            <kbd className="rounded border border-slate-700/50 bg-white/[0.04] px-1.5 py-0.5 text-[0.65rem] font-black">
              ?
            </kbd>{" "}
            para abrir esta tela
          </p>
        </div>
      </div>
    </div>
  );
}
