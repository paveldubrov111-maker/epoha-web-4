import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-100 dark:bg-zinc-950 p-4">
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl shadow-xl max-w-lg w-full">
            <h2 className="text-xl font-bold text-red-600 mb-4">Щось пішло не так</h2>
            <p className="text-zinc-600 dark:text-zinc-400 mb-4">
              Виникла помилка під час роботи додатку.
            </p>
            <pre className="bg-zinc-100 dark:bg-zinc-800 p-4 rounded-lg text-sm overflow-auto text-red-500 max-h-64">
              {this.state.error?.message}
            </pre>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Оновити сторінку
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
