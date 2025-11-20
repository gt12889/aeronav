// Structured logging utility with levels, filtering, and export functionality

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface StructuredLogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  service: string;
  message: string;
  protocol?: "ZMQ" | "gRPC" | "DDS";
  metadata?: Record<string, any>;
  stack?: string;
  sessionId?: string;
}

export interface LoggerConfig {
  minLevel: LogLevel;
  enableConsole: boolean;
  enableStorage: boolean;
  maxStoredLogs: number;
  sessionId?: string;
}

class Logger {
  private config: LoggerConfig;
  private logs: StructuredLogEntry[] = [];
  private listeners: Array<(log: StructuredLogEntry) => void> = [];

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      minLevel: LogLevel.INFO,
      enableConsole: true,
      enableStorage: true,
      maxStoredLogs: 1000,
      sessionId: this.generateSessionId(),
      ...config,
    };

    this.loadStoredLogs();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private loadStoredLogs(): void {
    if (!this.config.enableStorage) return;

    try {
      const stored = localStorage.getItem("aeronavsim_logs");
      if (stored) {
        this.logs = JSON.parse(stored);
      }
    } catch (e) {
      console.error("Failed to load stored logs:", e);
    }
  }

  private saveLogs(): void {
    if (!this.config.enableStorage) return;

    try {
      // Keep only recent logs
      const recentLogs = this.logs.slice(-this.config.maxStoredLogs);
      localStorage.setItem("aeronavsim_logs", JSON.stringify(recentLogs));
    } catch (e) {
      console.error("Failed to save logs:", e);
    }
  }

  private createLogEntry(
    level: LogLevel,
    service: string,
    message: string,
    protocol?: "ZMQ" | "gRPC" | "DDS",
    metadata?: Record<string, any>
  ): StructuredLogEntry {
    const entry: StructuredLogEntry = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      level,
      service,
      message,
      protocol,
      metadata,
      sessionId: this.config.sessionId,
    };

    // Add stack trace for errors
    if (level === LogLevel.ERROR) {
      entry.stack = new Error().stack;
    }

    return entry;
  }

  private log(
    level: LogLevel,
    service: string,
    message: string,
    protocol?: "ZMQ" | "gRPC" | "DDS",
    metadata?: Record<string, any>
  ): void {
    // Check if log level meets minimum threshold
    if (level < this.config.minLevel) {
      return;
    }

    const entry = this.createLogEntry(level, service, message, protocol, metadata);

    // Add to logs array
    this.logs.push(entry);
    this.saveLogs();

    // Console output
    if (this.config.enableConsole) {
      const levelName = LogLevel[level];
      const style = this.getConsoleStyle(level);
      console[this.getConsoleMethod(level)](
        `%c[${levelName}] %c[${service}]`,
        style,
        "color: inherit",
        message,
        metadata || ""
      );
    }

    // Notify listeners
    this.listeners.forEach((listener) => listener(entry));
  }

  private getConsoleStyle(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG:
        return "color: #6366f1; font-weight: normal";
      case LogLevel.INFO:
        return "color: #0ea5e9; font-weight: normal";
      case LogLevel.WARN:
        return "color: #f59e0b; font-weight: bold";
      case LogLevel.ERROR:
        return "color: #ef4444; font-weight: bold";
      default:
        return "color: inherit";
    }
  }

  private getConsoleMethod(level: LogLevel): "debug" | "info" | "warn" | "error" {
    switch (level) {
      case LogLevel.DEBUG:
        return "debug";
      case LogLevel.INFO:
        return "info";
      case LogLevel.WARN:
        return "warn";
      case LogLevel.ERROR:
        return "error";
      default:
        return "info";
    }
  }

  // Public logging methods
  debug(service: string, message: string, protocol?: "ZMQ" | "gRPC" | "DDS", metadata?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, service, message, protocol, metadata);
  }

  info(service: string, message: string, protocol?: "ZMQ" | "gRPC" | "DDS", metadata?: Record<string, any>): void {
    this.log(LogLevel.INFO, service, message, protocol, metadata);
  }

  warn(service: string, message: string, protocol?: "ZMQ" | "gRPC" | "DDS", metadata?: Record<string, any>): void {
    this.log(LogLevel.WARN, service, message, protocol, metadata);
  }

  error(
    service: string,
    message: string,
    protocol?: "ZMQ" | "gRPC" | "DDS",
    metadata?: Record<string, any>,
    error?: Error
  ): void {
    const errorMetadata = {
      ...metadata,
      errorMessage: error?.message,
      errorStack: error?.stack,
    };
    this.log(LogLevel.ERROR, service, message, protocol, errorMetadata);
  }

  // Filtering methods
  getLogs(filters?: {
    level?: LogLevel;
    service?: string;
    protocol?: "ZMQ" | "gRPC" | "DDS";
    startTime?: Date;
    endTime?: Date;
    search?: string;
  }): StructuredLogEntry[] {
    let filtered = [...this.logs];

    if (filters?.level !== undefined) {
      filtered = filtered.filter((log) => log.level === filters.level);
    }

    if (filters?.service) {
      filtered = filtered.filter((log) =>
        log.service.toLowerCase().includes(filters.service!.toLowerCase())
      );
    }

    if (filters?.protocol) {
      filtered = filtered.filter((log) => log.protocol === filters.protocol);
    }

    if (filters?.startTime) {
      filtered = filtered.filter(
        (log) => new Date(log.timestamp) >= filters.startTime!
      );
    }

    if (filters?.endTime) {
      filtered = filtered.filter(
        (log) => new Date(log.timestamp) <= filters.endTime!
      );
    }

    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (log) =>
          log.message.toLowerCase().includes(searchLower) ||
          log.service.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  }

  // Get logs by level
  getDebugLogs(): StructuredLogEntry[] {
    return this.getLogs({ level: LogLevel.DEBUG });
  }

  getInfoLogs(): StructuredLogEntry[] {
    return this.getLogs({ level: LogLevel.INFO });
  }

  getWarnLogs(): StructuredLogEntry[] {
    return this.getLogs({ level: LogLevel.WARN });
  }

  getErrorLogs(): StructuredLogEntry[] {
    return this.getLogs({ level: LogLevel.ERROR });
  }

  // Statistics
  getStats(): {
    total: number;
    byLevel: Record<string, number>;
    byService: Record<string, number>;
    byProtocol: Record<string, number>;
  } {
    const stats = {
      total: this.logs.length,
      byLevel: {} as Record<string, number>,
      byService: {} as Record<string, number>,
      byProtocol: {} as Record<string, number>,
    };

    this.logs.forEach((log) => {
      // By level
      const levelName = LogLevel[log.level];
      stats.byLevel[levelName] = (stats.byLevel[levelName] || 0) + 1;

      // By service
      stats.byService[log.service] = (stats.byService[log.service] || 0) + 1;

      // By protocol
      if (log.protocol) {
        stats.byProtocol[log.protocol] = (stats.byProtocol[log.protocol] || 0) + 1;
      }
    });

    return stats;
  }

  // Export methods
  exportLogs(format: "json" | "csv" | "txt" = "json"): string {
    switch (format) {
      case "json":
        return JSON.stringify(this.logs, null, 2);
      case "csv":
        return this.exportToCSV();
      case "txt":
        return this.exportToTxt();
      default:
        return JSON.stringify(this.logs, null, 2);
    }
  }

  private exportToCSV(): string {
    const headers = ["Timestamp", "Level", "Service", "Protocol", "Message", "Metadata"];
    const rows = this.logs.map((log) => [
      log.timestamp,
      LogLevel[log.level],
      log.service,
      log.protocol || "",
      log.message.replace(/"/g, '""'),
      log.metadata ? JSON.stringify(log.metadata).replace(/"/g, '""') : "",
    ]);

    return [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");
  }

  private exportToTxt(): string {
    return this.logs
      .map((log) => {
        const levelName = LogLevel[log.level];
        const protocol = log.protocol ? `[${log.protocol}]` : "";
        return `[${log.timestamp}] ${levelName} ${protocol} [${log.service}] ${log.message}`;
      })
      .join("\n");
  }

  // Clear logs
  clearLogs(): void {
    this.logs = [];
    this.saveLogs();
  }

  // Clear logs by filter
  clearLogsByFilter(filters: {
    level?: LogLevel;
    service?: string;
    before?: Date;
  }): number {
    const beforeCount = this.logs.length;
    
    this.logs = this.logs.filter((log) => {
      if (filters.level !== undefined && log.level !== filters.level) {
        return true;
      }
      if (filters.service && log.service !== filters.service) {
        return true;
      }
      if (filters.before && new Date(log.timestamp) >= filters.before) {
        return true;
      }
      return false;
    });

    this.saveLogs();
    return beforeCount - this.logs.length;
  }

  // Configuration
  setConfig(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): LoggerConfig {
    return { ...this.config };
  }

  // Event listeners
  onLog(callback: (log: StructuredLogEntry) => void): () => void {
    this.listeners.push(callback);
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }
}

// Singleton instance
export const logger = new Logger({
  minLevel: LogLevel.DEBUG,
  enableConsole: true,
  enableStorage: true,
  maxStoredLogs: 1000,
});

