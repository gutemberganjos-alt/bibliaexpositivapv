import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

/**
 * Rede de segurança contra "tela branca".
 * Sem isto, qualquer erro de JavaScript em qualquer componente derruba a árvore
 * inteira e o usuário vê uma página em branco, sem explicação e sem saída.
 */
interface Props { children: ReactNode }
interface State { erro: Error | null }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { erro: null };

  static getDerivedStateFromError(erro: Error): State {
    return { erro };
  }

  componentDidCatch(erro: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', erro, info.componentStack);
  }

  private recarregar = () => {
    // Limpa caches do service worker antes de recarregar: se a falha veio de um
    // bundle antigo em cache, o reload sozinho não resolveria.
    const limpar = 'caches' in window
      ? caches.keys().then((ns) => Promise.all(ns.map((n) => caches.delete(n)))).catch(() => {})
      : Promise.resolve();
    limpar.finally(() => window.location.reload());
  };

  render() {
    if (!this.state.erro) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <div className="card p-8 max-w-md">
          <h1 className="text-xl text-[var(--cor-dourado)] mb-3 font-['Playfair_Display']">
            Algo deu errado nesta tela
          </h1>
          <p className="text-sm text-[var(--cor-texto-medio)] mb-6">
            Tivemos um problema ao carregar esta parte do aplicativo. Sua conta e seus estudos estão seguros.
          </p>
          <div className="flex flex-col gap-3">
            <button onClick={this.recarregar} className="btn-primary">Recarregar a página</button>
            <a href="/" className="btn-secondary">Voltar ao início</a>
          </div>
        </div>
      </div>
    );
  }
}
