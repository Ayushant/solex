import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('soleX Uncaught Error caught by ErrorBoundary:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-[#07061d] text-white flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-[#121136] border border-[#2b2a64] rounded-xl p-6 shadow-2xl space-y-5 text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-[#ffffe3]">
                soleX Workspace Active
              </h2>
              <p className="text-sm text-[#a6b4c3] mt-1.5 leading-relaxed">
                The session encountered a temporary display state. Your mandate records and database sync are preserved.
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#3b33ff] hover:bg-[#4d46ff] text-white text-sm font-medium transition-all shadow-md active:scale-98 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reload soleX Workspace</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
