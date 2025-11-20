import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home, Bug } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console
    console.error("ErrorBoundary caught an error:", error, errorInfo);

    // Update state with error info
    this.setState({
      error,
      errorInfo,
    });

    // Call optional error handler
    this.props.onError?.(error, errorInfo);

    // Send error to crash reporting service (if implemented)
    this.reportError(error, errorInfo);
  }

  reportError = (error: Error, errorInfo: ErrorInfo) => {
    // In a real application, you would send this to a crash reporting service
    // For now, we'll just log it and could store it in localStorage for later retrieval
    try {
      const errorReport = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
      };

      // Store in localStorage for debugging
      const existingReports = JSON.parse(
        localStorage.getItem("aeronavsim_error_reports") || "[]"
      );
      existingReports.push(errorReport);
      // Keep only last 10 error reports
      const recentReports = existingReports.slice(-10);
      localStorage.setItem(
        "aeronavsim_error_reports",
        JSON.stringify(recentReports)
      );

      // In production, you would send this to a service like Sentry, LogRocket, etc.
      // Example: Sentry.captureException(error, { contexts: { react: errorInfo } });
    } catch (reportError) {
      console.error("Failed to report error:", reportError);
    }
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-slate-900 border border-red-900/50 rounded-lg p-6 shadow-xl">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-red-900/20 rounded-lg">
                <AlertTriangle className="w-8 h-8 text-red-400" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-red-400 mb-2">
                  System Error Detected
                </h1>
                <p className="text-slate-300 mb-4">
                  An unexpected error occurred in the application. The error has been logged
                  and will be reported for analysis.
                </p>

                {/* Error Details */}
                <div className="bg-slate-950 rounded p-4 mb-4 border border-slate-800">
                  <div className="flex items-center gap-2 mb-2">
                    <Bug className="w-4 h-4 text-slate-400" />
                    <span className="text-sm font-bold text-slate-400">Error Details</span>
                  </div>
                  <div className="font-mono text-xs text-red-300 mb-2">
                    {this.state.error?.message || "Unknown error"}
                  </div>
                  {process.env.NODE_ENV === "development" && this.state.error?.stack && (
                    <details className="mt-2">
                      <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-400">
                        Stack Trace
                      </summary>
                      <pre className="mt-2 text-xs text-slate-500 overflow-auto max-h-48 bg-black/50 p-2 rounded">
                        {this.state.error.stack}
                      </pre>
                    </details>
                  )}
                  {process.env.NODE_ENV === "development" &&
                    this.state.errorInfo?.componentStack && (
                      <details className="mt-2">
                        <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-400">
                          Component Stack
                        </summary>
                        <pre className="mt-2 text-xs text-slate-500 overflow-auto max-h-48 bg-black/50 p-2 rounded">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </details>
                    )}
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={this.handleReset}
                    className="px-4 py-2 bg-sky-900/30 border border-sky-700 text-sky-400 rounded hover:bg-sky-900/50 transition-colors flex items-center gap-2"
                  >
                    <RefreshCw size={16} />
                    Try Again
                  </button>
                  <button
                    onClick={this.handleReload}
                    className="px-4 py-2 bg-slate-800 border border-slate-700 text-slate-300 rounded hover:bg-slate-700 transition-colors flex items-center gap-2"
                  >
                    <Home size={16} />
                    Reload Page
                  </button>
                </div>

                {/* Error Report Info */}
                <div className="mt-4 pt-4 border-t border-slate-800">
                  <p className="text-xs text-slate-500">
                    Error reports are stored locally for debugging. In production, these would
                    be automatically sent to our monitoring service.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

