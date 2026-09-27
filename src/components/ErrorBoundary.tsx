import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error in ErrorBoundary:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 text-red-400 bg-red-950/20 border border-red-500/30 rounded-lg">
          <h2 className="font-bold">Something went wrong rendering this component.</h2>
          <p className="text-xs font-mono mt-1">{this.state.error?.message}</p>
        </div>
      );
    }
    return this.props.children;
  }
}
