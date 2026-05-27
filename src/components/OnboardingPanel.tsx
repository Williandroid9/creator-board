import { Button, cx } from "./ui";

type OnboardingPanelProps = {
  hasChannels: boolean;
  hasVideos: boolean;
  onOpenChannels: () => void;
  onCreateIdea: () => void;
};

const steps = [
  {
    title: "Organize seus canais",
    body: "Separe os projetos para o dashboard nao misturar dados, ideias e publicados.",
  },
  {
    title: "Crie a primeira ideia",
    body: "Cadastre apenas titulo, nicho e prioridade. O restante pode entrar depois.",
  },
  {
    title: "Avance pelo Kanban",
    body: "Mova o card conforme produz para ver progresso, streak e acervo crescerem.",
  },
];

export function OnboardingPanel({ hasChannels, hasVideos, onOpenChannels, onCreateIdea }: OnboardingPanelProps) {
  const currentStep = !hasChannels ? 0 : !hasVideos ? 1 : 2;

  return (
    <section className="clean-panel rounded-2xl p-4 sm:p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs font-black uppercase text-aqua">Primeiros passos</p>
          <h2 className="mt-1 text-xl font-black text-white">Deixe o Creator Board pronto para trabalhar por canal.</h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-400">
            Configure o basico agora e use o resto conforme a rotina pedir.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant={hasChannels ? "ghost" : "primary"} onClick={onOpenChannels}>
            {hasChannels ? "Gerenciar canais" : "Adicionar canal"}
          </Button>
          <Button variant={hasVideos ? "ghost" : "primary"} onClick={onCreateIdea}>
            + Nova ideia
          </Button>
        </div>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-3">
        {steps.map((step, index) => {
          const complete = index < currentStep;
          const active = index === currentStep;

          return (
            <div
              key={step.title}
              className={cx(
                "rounded-xl border bg-white/[0.035] p-4",
                active ? "border-aqua/35" : "border-slate-400/10",
              )}
            >
              <div className="mb-3 flex items-center gap-2">
                <span
                  className={cx(
                    "grid h-6 w-6 place-items-center rounded-full text-xs font-black",
                    complete
                      ? "bg-emerald-300 text-ink"
                      : active
                        ? "bg-aqua text-ink"
                        : "bg-white/[0.08] text-slate-400",
                  )}
                >
                  {complete ? "OK" : index + 1}
                </span>
                <h3 className="text-sm font-black text-white">{step.title}</h3>
              </div>
              <p className="text-sm font-semibold leading-6 text-slate-400">{step.body}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
