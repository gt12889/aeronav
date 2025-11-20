import { useState, useMemo } from "react";
import { Search, Filter, Download, Trash2, X, ChevronDown, ChevronUp } from "lucide-react";
import { logger, LogLevel, type StructuredLogEntry } from "../utils/logger.js";
import { exportLogsToCSV, exportLogsToJSON } from "../utils/exportUtils.js";

interface LogViewerProps {
  onClose?: () => void;
}

export const LogViewer = ({ onClose }: LogViewerProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLevel, setSelectedLevel] = useState<LogLevel | "ALL">("ALL");
  const [selectedService, setSelectedService] = useState<string>("ALL");
  const [selectedProtocol, setSelectedProtocol] = useState<"ZMQ" | "gRPC" | "DDS" | "ALL">("ALL");
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());

  const allLogs = logger.getLogs();
  const stats = logger.getStats();

  const filteredLogs = useMemo(() => {
    return logger.getLogs({
      level: selectedLevel !== "ALL" ? selectedLevel : undefined,
      service: selectedService !== "ALL" ? selectedService : undefined,
      protocol: selectedProtocol !== "ALL" ? selectedProtocol : undefined,
      search: searchQuery || undefined,
    });
  }, [searchQuery, selectedLevel, selectedService, selectedProtocol]);

  const toggleLogExpansion = (logId: string) => {
    setExpandedLogs((prev) => {
      const next = new Set(prev);
      if (next.has(logId)) {
        next.delete(logId);
      } else {
        next.add(logId);
      }
      return next;
    });
  };

  const getLevelColor = (level: LogLevel) => {
    switch (level) {
      case LogLevel.DEBUG:
        return "text-indigo-400";
      case LogLevel.INFO:
        return "text-sky-400";
      case LogLevel.WARN:
        return "text-yellow-400";
      case LogLevel.ERROR:
        return "text-red-400 font-bold";
      default:
        return "text-slate-400";
    }
  };

  const getLevelBadgeColor = (level: LogLevel) => {
    switch (level) {
      case LogLevel.DEBUG:
        return "bg-indigo-900/30 text-indigo-300 border-indigo-700";
      case LogLevel.INFO:
        return "bg-sky-900/30 text-sky-300 border-sky-700";
      case LogLevel.WARN:
        return "bg-yellow-900/30 text-yellow-300 border-yellow-700";
      case LogLevel.ERROR:
        return "bg-red-900/30 text-red-300 border-red-700";
      default:
        return "bg-slate-800 text-slate-300 border-slate-700";
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#0B1120]">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-900">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-slate-300 flex items-center gap-2">
            <Filter size={14} /> Structured Logs
          </h2>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Search and Filters */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search logs..."
              className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            {/* Level Filter */}
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value === "ALL" ? "ALL" : parseInt(e.target.value) as LogLevel)}
              className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-300 focus:outline-none focus:border-sky-500"
            >
              <option value="ALL">All Levels</option>
              <option value={LogLevel.DEBUG}>DEBUG</option>
              <option value={LogLevel.INFO}>INFO</option>
              <option value={LogLevel.WARN}>WARN</option>
              <option value={LogLevel.ERROR}>ERROR</option>
            </select>

            {/* Service Filter */}
            <select
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-300 focus:outline-none focus:border-sky-500"
            >
              <option value="ALL">All Services</option>
              {Object.keys(stats.byService).map((service) => (
                <option key={service} value={service}>
                  {service} ({stats.byService[service]})
                </option>
              ))}
            </select>

            {/* Protocol Filter */}
            <select
              value={selectedProtocol}
              onChange={(e) => setSelectedProtocol(e.target.value as any)}
              className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-300 focus:outline-none focus:border-sky-500"
            >
              <option value="ALL">All Protocols</option>
              <option value="gRPC">gRPC</option>
              <option value="ZMQ">ZeroMQ</option>
              <option value="DDS">DDS</option>
            </select>
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-4 mt-3 text-xs text-slate-500">
          <span>Total: {stats.total}</span>
          <span>DEBUG: {stats.byLevel.DEBUG || 0}</span>
          <span>INFO: {stats.byLevel.INFO || 0}</span>
          <span>WARN: {stats.byLevel.WARN || 0}</span>
          <span className="text-red-400">ERROR: {stats.byLevel.ERROR || 0}</span>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => {
              const logs = logger.getLogs({
                level: selectedLevel !== "ALL" ? selectedLevel : undefined,
                service: selectedService !== "ALL" ? selectedService : undefined,
                protocol: selectedProtocol !== "ALL" ? selectedProtocol : undefined,
                search: searchQuery || undefined,
              });
              exportLogsToCSV(logs.map(log => ({
                id: parseFloat(log.id),
                timestamp: log.timestamp.split("T")[1].slice(0, -1),
                service: log.service,
                level: LogLevel[log.level] as "INFO" | "WARN" | "DEBUG" | "ERROR",
                message: log.message,
                protocol: log.protocol,
              })));
            }}
            className="px-2 py-1 text-xs bg-sky-900/30 border border-sky-700 text-sky-400 rounded hover:bg-sky-900/50 flex items-center gap-1"
          >
            <Download size={12} /> Export CSV
          </button>
          <button
            onClick={() => {
              const logs = logger.getLogs({
                level: selectedLevel !== "ALL" ? selectedLevel : undefined,
                service: selectedService !== "ALL" ? selectedService : undefined,
                protocol: selectedProtocol !== "ALL" ? selectedProtocol : undefined,
                search: searchQuery || undefined,
              });
              exportLogsToJSON(logs.map(log => ({
                id: parseFloat(log.id),
                timestamp: log.timestamp.split("T")[1].slice(0, -1),
                service: log.service,
                level: LogLevel[log.level] as "INFO" | "WARN" | "DEBUG" | "ERROR",
                message: log.message,
                protocol: log.protocol,
              })));
            }}
            className="px-2 py-1 text-xs bg-sky-900/30 border border-sky-700 text-sky-400 rounded hover:bg-sky-900/50 flex items-center gap-1"
          >
            <Download size={12} /> Export JSON
          </button>
          <button
            onClick={() => {
              logger.clearLogs();
              setExpandedLogs(new Set());
            }}
            className="px-2 py-1 text-xs bg-red-900/30 border border-red-700 text-red-400 rounded hover:bg-red-900/50 flex items-center gap-1"
          >
            <Trash2 size={12} /> Clear All
          </button>
        </div>
      </div>

      {/* Logs List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {filteredLogs.length === 0 ? (
          <div className="text-center text-slate-500 py-8">
            <p>No logs found</p>
            <p className="text-xs mt-2">Try adjusting your filters</p>
          </div>
        ) : (
          filteredLogs.map((log) => {
            const isExpanded = expandedLogs.has(log.id);
            return (
              <div
                key={log.id}
                className="bg-slate-900 border border-slate-800 rounded p-2 text-xs font-mono hover:border-slate-700 transition-colors"
              >
                <div className="flex items-start gap-2">
                  <button
                    onClick={() => toggleLogExpansion(log.id)}
                    className="text-slate-500 hover:text-slate-300 mt-0.5"
                  >
                    {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                  <span className="text-slate-600 shrink-0">
                    [{new Date(log.timestamp).toLocaleTimeString()}]
                  </span>
                  <span className={`shrink-0 px-1.5 py-0.5 rounded border text-[10px] ${getLevelBadgeColor(log.level)}`}>
                    {LogLevel[log.level]}
                  </span>
                  {log.protocol && (
                    <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                      log.protocol === 'gRPC' ? 'bg-sky-900/30 text-sky-300' :
                      log.protocol === 'ZMQ' ? 'bg-yellow-900/30 text-yellow-300' :
                      log.protocol === 'DDS' ? 'bg-indigo-900/30 text-indigo-300' :
                      'bg-slate-800 text-slate-300'
                    }`}>
                      {log.protocol}
                    </span>
                  )}
                  <span className="text-slate-400 shrink-0">{log.service}:</span>
                  <span className={`flex-1 ${getLevelColor(log.level)}`}>{log.message}</span>
                </div>
                {isExpanded && (
                  <div className="mt-2 ml-6 pt-2 border-t border-slate-800 space-y-1">
                    <div className="text-[10px] text-slate-500">
                      <div>ID: {log.id}</div>
                      <div>Timestamp: {log.timestamp}</div>
                      {log.sessionId && <div>Session: {log.sessionId}</div>}
                      {log.metadata && (
                        <div>
                          Metadata: <pre className="mt-1 text-slate-400 overflow-auto">{JSON.stringify(log.metadata, null, 2)}</pre>
                        </div>
                      )}
                      {log.stack && (
                        <details className="mt-1">
                          <summary className="text-slate-500 cursor-pointer hover:text-slate-400">Stack Trace</summary>
                          <pre className="mt-1 text-slate-500 text-[9px] overflow-auto">{log.stack}</pre>
                        </details>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

