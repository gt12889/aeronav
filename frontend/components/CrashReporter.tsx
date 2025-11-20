// Utility functions for crash reporting and error tracking

export interface ErrorReport {
  message: string;
  stack?: string;
  componentStack?: string;
  timestamp: string;
  userAgent: string;
  url: string;
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, any>;
}

class CrashReporter {
  private sessionId: string;
  private errorReports: ErrorReport[] = [];

  constructor() {
    this.sessionId = this.generateSessionId();
    this.loadStoredReports();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private loadStoredReports(): void {
    try {
      const stored = localStorage.getItem("aeronavsim_error_reports");
      if (stored) {
        this.errorReports = JSON.parse(stored);
      }
    } catch (e) {
      console.error("Failed to load stored error reports:", e);
    }
  }

  /**
   * Report an error
   */
  reportError(
    error: Error,
    errorInfo?: {
      componentStack?: string;
      [key: string]: any;
    },
    metadata?: Record<string, any>
  ): void {
    const report: ErrorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo?.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      sessionId: this.sessionId,
      metadata: {
        ...metadata,
        ...errorInfo,
      },
    };

    // Add to local reports
    this.errorReports.push(report);
    this.saveReports();

    // In production, send to crash reporting service
    if (process.env.NODE_ENV === "production") {
      this.sendToService(report);
    } else {
      console.error("Error Report:", report);
    }
  }

  /**
   * Save reports to localStorage
   */
  private saveReports(): void {
    try {
      // Keep only last 20 reports
      const recentReports = this.errorReports.slice(-20);
      localStorage.setItem(
        "aeronavsim_error_reports",
        JSON.stringify(recentReports)
      );
    } catch (e) {
      console.error("Failed to save error reports:", e);
    }
  }

  /**
   * Send error report to crash reporting service
   * This would integrate with services like Sentry, LogRocket, etc.
   */
  private sendToService(report: ErrorReport): void {
    // Example integration with a crash reporting service:
    // 
    // if (window.Sentry) {
    //   window.Sentry.captureException(new Error(report.message), {
    //     contexts: {
    //       react: {
    //         componentStack: report.componentStack,
    //       },
    //     },
    //     extra: report.metadata,
    //   });
    // }

    // For now, we'll just log it
    console.error("Would send to crash reporting service:", report);
  }

  /**
   * Get all error reports
   */
  getReports(): ErrorReport[] {
    return [...this.errorReports];
  }

  /**
   * Clear all error reports
   */
  clearReports(): void {
    this.errorReports = [];
    localStorage.removeItem("aeronavsim_error_reports");
  }

  /**
   * Export error reports
   */
  exportReports(): string {
    return JSON.stringify(this.errorReports, null, 2);
  }
}

// Singleton instance
export const crashReporter = new CrashReporter();

/**
 * Global error handler for unhandled errors
 */
export const setupGlobalErrorHandlers = () => {
  // Handle unhandled promise rejections
  window.addEventListener("unhandledrejection", (event) => {
    crashReporter.reportError(
      new Error(event.reason?.message || "Unhandled Promise Rejection"),
      {},
      {
        type: "unhandledrejection",
        reason: event.reason,
      }
    );
  });

  // Handle uncaught errors
  window.addEventListener("error", (event) => {
    crashReporter.reportError(
      event.error || new Error(event.message),
      {},
      {
        type: "uncaught",
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      }
    );
  });
};

