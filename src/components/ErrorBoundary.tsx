import { Component, type ErrorInfo, type ReactNode } from "react";
import { APP_STORAGE_KEY, NEW_VIDEO_DRAFT_KEY } from "../lib/storage";

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  error: Error | null;
};

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Creator Board render error", error, info);
  }

  resetData = () => {
    const confirmed = window.confirm(
      "Isto vai limpar os dados locais do Creator Board neste navegador. Deseja continuar?",
    );

    if (!confirmed) {
      return;
    }

    localStorage.removeItem(APP_STORAGE_KEY);
    localStorage.removeItem(NEW_VIDEO_DRAFT_KEY);
    window.location.reload();
  };

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <main className="grid min-h-screen place-items-center px-4 py-8">
        <section className="clean-panel max-w-2xl rounded-2xl p-6 text-center shadow-soft sm:p-8">
          <p className="mb-2 text-xs font-black uppercase text-aqua">Creator Board</p>
          <h1 className="text-2xl font-black text-white sm:text-3xl">Nao foi possivel abrir o painel</h1>
          <p className="mt-4 text-sm leading-6 text-slate-300">
            Algum dado salvo no navegador parece estar em um formato antigo ou corrompido. Voce pode recarregar a
            pagina ou limpar apenas os dados locais deste app.
          </p>
          <pre className="mt-5 max-h-40 overflow-auto rounded-xl bg-black/30 p-4 text-left text-xs leading-5 text-slate-300">
            {this.state.error.message}
          </pre>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <button className="btn btn-ghost" type="button" onClick={() => window.location.reload()}>
              Recarregar
            </button>
            <button className="btn btn-danger" type="button" onClick={this.resetData}>
              Limpar dados locais
            </button>
          </div>
        </section>
      </main>
    );
  }
}
