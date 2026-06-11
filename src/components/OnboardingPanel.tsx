import { Kanban, TrendingUp, Tv2 } from "lucide-react";
import { Button, cx } from "./ui";

type OnboardingPanelProps = {
  hasChannels: boolean;
  hasVideos: boolean;
  onOpenChannels: () => void;
  onCreateIdea: () => void;
};

const steps = [
  {
    icon: Tv2,
    iconColor: "text-aqua",
    iconBg: "bg-aqua/10",
    title: "Crie seu canal",
    body: "Separe projetos para o dashboard filtrar vídeos, métricas e publicados por canal — sem misturar dados.",
    cta: "Adicionar canal",
    action: "channels" as const,
  },
  {
    icon: Kanban,
    iconColor: "text-violet-400",
    iconBg: "bg-violet-400/10",
    title: "Lance a primeira ideia",
    body: "Basta título, nicho e prioridade para começar. Roteiro e SEO podem entrar conforme você avança.",
    cta: "Nova ideia",
    action: "idea" as const,
  },
  {
    icon: TrendingUp,
    iconColor: "text-emerald-400",
    iconBg: "bg-emerald-400/10",
    title: "Avance pelo Pipeline",
    body: "Mova o card por Roteiro → Gravação → Edição → Publicado e veja seus streaks, scores e nível crescerem.",
    cta: null,
    action: null,
  },
];

export function OnboardingPanel({ hasChannels, hasVideos, onOpenChannels, onCreateIdea }: OnboardingPanelProps) {
  const currentStep = !hasChannels ? 0 : !hasVideos ? 1 : 2;

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-400/10 bg-gradient-to-br from-[#101720] via-[#0f1b22] to-[#0d1218]">
      {/* Header */}
      <div className="border-b border-slate-400/[0.06] px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-1.5 flex items-center gap-2">
              <span className="inline-flex items-center rounded-full border border-aqua/25 bg-aqua/10 px-2.5 py-1 text-[0.7rem] font-black text-aqua">
                Primeiros passos
              </span>
            </div>
            <h2 className="text-xl font-black text-white sm:text-2xl">
              Bem-vindo ao Creator Board
            </h2>
            <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-400">
              Seu sistema completo de produção de conteúdo. Configure em 3 passos e comece a publicar com consistência.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button
              variant={hasChannels ? "ghost" : "primary"}
              onClick={onOpenChannels}
            >
              {hasChannels ? "Gerenciar canais" : "Adicionar canal"}
            </Button>
            <Button
              variant={hasVideos ? "ghost" : hasChannels ? "primary" : "ghost"}
              onClick={onCreateIdea}
            >
              + Nova ideia
            </Button>
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="grid gap-0 sm:grid-cols-3">
        {steps.map((step, index) => {
          const complete = index < currentStep;
          const active = index === currentStep;
          const Icon = step.icon;

          return (
            <div
              key={step.title}
              className={cx(
                "relative px-5 py-5 transition-all",
                index < steps.length - 1 && "sm:border-r sm:border-slate-400/[0.06]",
                index > 0 && "border-t border-slate-400/[0.06] sm:border-t-0",
                complete ? "opacity-60" : active ? "opacity-100" : "opacity-45",
              )}
            >
              {/* Active indicator */}
              {active && (
                <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-aqua/50 via-aqua to-aqua/50" />
              )}

              <div className="flex items-start gap-3">
                {/* Icon */}
                <div className={cx(
                  "flex size-9 shrink-0 items-center justify-center rounded-xl",
                  complete ? "bg-emerald-500/15" : step.iconBg,
                )}>
                  {complete ? (
                    <span className="text-base">✓</span>
                  ) : (
                    <Icon className={cx("size-4.5", complete ? "text-emerald-400" : step.iconColor)} />
                  )}
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <span className={cx(
                      "text-[0.65rem] font-black",
                      complete ? "text-emerald-400" : active ? "text-aqua" : "text-slate-600",
                    )}>
                      PASSO {index + 1}
                    </span>
                    {complete && (
                      <span className="rounded-full bg-emerald-400/15 px-1.5 py-0.5 text-[0.6rem] font-black text-emerald-400">
                        Feito
                      </span>
                    )}
                    {active && (
                      <span className="rounded-full border border-aqua/30 bg-aqua/10 px-1.5 py-0.5 text-[0.6rem] font-black text-aqua">
                        Agora
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-black text-white">{step.title}</h3>
                  <p className="mt-1.5 text-xs font-semibold leading-relaxed text-slate-400">{step.body}</p>
                  {active && step.cta && (
                    <button
                      type="button"
                      onClick={step.action === "channels" ? onOpenChannels : onCreateIdea}
                      className="mt-3 rounded-lg bg-aqua/10 px-3 py-1.5 text-xs font-bold text-aqua transition hover:bg-aqua/20"
                    >
                      {step.cta} →
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
