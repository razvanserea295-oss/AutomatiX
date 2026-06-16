import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home, Copy } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  
  scope?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const scope = this.props.scope || 'root';
    console.error(`[ErrorBoundary:${scope}]`, error, errorInfo);
    this.setState({ error, errorInfo });

    
    
    if (typeof window !== 'undefined' && 'electron' in window) {
      try {
        (window as unknown as { electron: { invoke: (cmd: string, args?: unknown) => Promise<unknown> } })
          .electron.invoke('log_renderer', {
            level: 'error',
            message: `ErrorBoundary caught in ${scope}: ${error.message}`,
            meta: {
              scope,
              name: error.name,
              stack: error.stack,
              componentStack: errorInfo.componentStack,
              href: window.location.href,
            },
          });
      } catch {  }
    } else if (typeof window !== 'undefined' && (window as Window).location &&
               ((window as Window).location.protocol === 'http:' || (window as Window).location.protocol === 'https:')) {
      
      
      const w = window as Window;
      try {
        const token = (() => { try { return localStorage.getItem('promix_token') || ''; } catch { return ''; } })();
        fetch(`${w.location.origin}/api/cmd/log_renderer`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({
            level: 'error',
            message: `ErrorBoundary caught in ${scope}: ${error.message}`,
            meta: { scope, name: error.name, stack: error.stack, componentStack: errorInfo.componentStack, href: w.location.href },
          }),
        }).catch(() => {  });
      } catch {  }
    }
  }

  






  private handleReset = () => {
    if (typeof window !== 'undefined' && window.location) {
      window.location.reload();
    } else {
      this.setState({ hasError: false, error: null, errorInfo: null });
    }
  };

  private handleGoHome = () => {
    window.location.hash = '/';
    this.handleReset();
  };

  private handleCopyDetails = () => {
    const { error, errorInfo } = this.state;
    const details = [
      `Scope: ${this.props.scope ?? 'root'}`,
      `URL: ${window.location.href}`,
      `User-Agent: ${navigator.userAgent}`,
      '',
      `Error: ${error?.toString() ?? 'unknown'}`,
      '',
      'Stack:',
      error?.stack ?? '(no stack)',
      '',
      'Component stack:',
      errorInfo?.componentStack ?? '(no component stack)',
    ].join('\n');
    navigator.clipboard?.writeText(details).catch(() => {  });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      const scope = this.props.scope || 'pagina';

      return (
        <div className="flex flex-1 flex-col items-center justify-center p-6 bg-surface-primary">
          <div className="max-w-md w-full bg-surface-secondary rounded-lg shadow-card p-6 border border-line">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-6 h-6 text-status-red flex-shrink-0" />
              <div>
                <h2 className="text-lg font-semibold text-content-primary">A apărut o eroare</h2>
                <p className="text-pm-xs text-content-muted mt-0.5">în {scope}</p>
              </div>
            </div>

            <p className="text-sm text-content-muted mb-4">
              Pagina a întâmpinat o problemă. Restul aplicației funcționează — poți reîncerca sau să revii la dashboard.
            </p>

            {this.state.error && (
              <div className="mb-4 p-3 bg-status-red/10 border border-status-red/20 rounded text-xs font-mono text-status-red overflow-auto max-h-32">
                {this.state.error.toString()}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={this.handleReset}
                className="flex items-center gap-2 px-3 py-2 bg-accent text-surface-primary rounded hover:bg-accent/90 transition-colors justify-center text-sm font-medium"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reîncearcă</span>
              </button>
              <button
                onClick={this.handleGoHome}
                className="flex items-center gap-2 px-3 py-2 border border-line text-content-primary rounded hover:bg-surface-tertiary transition-colors justify-center text-sm font-medium"
              >
                <Home className="w-4 h-4" />
                <span>Acasă</span>
              </button>
            </div>

            <button
              onClick={this.handleCopyDetails}
              className="mt-3 w-full flex items-center gap-1.5 justify-center text-pm-xs text-content-muted hover:text-content-primary transition-colors"
            >
              <Copy className="w-3 h-3" />
              <span>Copiază detalii pentru support</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
