// 12.04.2026 13:40 - CRITICAL FIX: Resolved TypeScript build errors (verbatimModuleSyntax and unused React import).
// 12.04.2026 12:20 - FEATURE: Added ErrorBoundary to isolate rendering crashes caused by corrupted data.
// src/features/Shared/ErrorBoundary.tsx

import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  errorInfo: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorInfo: error.message };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary hat einen Absturz abgefangen:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="p-4 border border-red-200 bg-red-50 text-red-600 rounded-xl text-sm font-bold shadow-sm my-2">
          ⚠️ Ein Fehler ist bei der Darstellung dieses Elements aufgetreten.
        </div>
      );
    }

    return this.props.children;
  }
}
// --- END OF FILE 47 Zeilen ---