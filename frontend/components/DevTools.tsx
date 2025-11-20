import { useState } from "react";
import {
  Settings,
  Code,
  Network,
  Activity,
  Database,
  Eye,
  EyeOff,
  Download,
  Trash2,
} from "lucide-react";
import type { ServiceStatus, LogEntry, AgentMetrics, RLMetrics, PerformanceMetrics } from "../types/index.js";
import { PerformanceProfiler } from "./PerformanceProfiler.js";
import { LogViewer } from "./LogViewer.js";
import { ConfigPanel } from "./ConfigPanel.js";
import { exportLogsToJSON, exportStateToJSON } from "../utils/exportUtils.js";

interface DevToolsProps {
  isOpen: boolean;
  onClose: () => void;
  services: ServiceStatus[];
  logs: LogEntry[];
  agentMetrics: AgentMetrics;
  rlMetrics: RLMetrics;
  performanceMetrics: PerformanceMetrics;
  onNetworkSimulationChange?: (packetLoss: number, latency: number) => void;
  onClearLogs?: () => void;
  onExportState?: () => void;
}

export const DevTools = ({
  isOpen,
  onClose,
  services,
  logs,
  agentMetrics,
  rlMetrics,
  performanceMetrics,
  onNetworkSimulationChange,
  onClearLogs,
  onExportState,
}: DevToolsProps) => {
  const [activeTab, setActiveTab] = useState<"state" | "performance" | "network" | "logs" | "config">("state");
  const [showConfigPanel, setShowConfigPanel] = useState(false);
  const [packetLoss, setPacketLoss] = useState(0);
  const [simulatedLatency, setSimulatedLatency] = useState(0);
  const [expandedState, setExpandedState] = useState<Record<string, boolean>>({});

  if (!isOpen) return null;

  const toggleStateExpansion = (key: string) => {
    setExpandedState((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return "null";
    if (typeof value === "object") {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  const renderStateValue = (key: string, value: any, depth = 0) => {
    if (depth > 3) return <span className="text-slate-500">...</span>;
    
    if (typeof value === "object" && value !== null) {
      const isExpanded = expandedState[`${key}-${depth}`];
      return (
        <div className="ml-4">
          <button
            onClick={() => toggleStateExpansion(`${key}-${depth}`)}
            className="text-sky-400 hover:text-sky-300 text-xs"
          >
            {isExpanded ? "▼" : "▶"} {Array.isArray(value) ? `Array[${value.length}]` : "Object"}
          </button>
          {isExpanded && (
            <div className="ml-4 mt-1 space-y-1">
              {Object.entries(value).map(([k, v]) => (
                <div key={k} className="text-xs">
                  <span className="text-purple-400">{k}:</span> {renderStateValue(`${key}.${k}`, v, depth + 1)}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }
    return <span className="text-slate-300">{formatValue(value)}</span>;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-lg w-full max-w-6xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <Settings className="w-5 h-5 text-sky-400" />
            <h2 className="text-lg font-bold text-slate-200">Developer Tools</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded transition-colors text-slate-400 hover:text-slate-200"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-700 bg-slate-950">
          <button
            onClick={() => setActiveTab("state")}
            className={`px-4 py-2 text-sm font-medium flex items-center gap-2 transition-colors ${
              activeTab === "state"
                ? "text-sky-400 border-b-2 border-sky-400 bg-slate-900"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <Code size={14} /> State Inspector
          </button>
          <button
            onClick={() => setActiveTab("performance")}
            className={`px-4 py-2 text-sm font-medium flex items-center gap-2 transition-colors ${
              activeTab === "performance"
                ? "text-sky-400 border-b-2 border-sky-400 bg-slate-900"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <Activity size={14} /> Performance
          </button>
          <button
            onClick={() => setActiveTab("network")}
            className={`px-4 py-2 text-sm font-medium flex items-center gap-2 transition-colors ${
              activeTab === "network"
                ? "text-sky-400 border-b-2 border-sky-400 bg-slate-900"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <Network size={14} /> Network Simulation
          </button>
          <button
            onClick={() => setActiveTab("logs")}
            className={`px-4 py-2 text-sm font-medium flex items-center gap-2 transition-colors ${
              activeTab === "logs"
                ? "text-sky-400 border-b-2 border-sky-400 bg-slate-900"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <Database size={14} /> Logs ({logs.length})
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {activeTab === "state" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-300">Application State</h3>
                <div className="flex gap-2">
                  <button
                    onClick={onExportState}
                    className="px-3 py-1 text-xs bg-sky-900/30 border border-sky-700 text-sky-400 rounded hover:bg-sky-900/50 flex items-center gap-2"
                  >
                    <Download size={12} /> Export State
                  </button>
                </div>
              </div>

              {/* Agent Metrics */}
              <div className="bg-slate-800 rounded p-3 border border-slate-700">
                <button
                  onClick={() => toggleStateExpansion("agentMetrics")}
                  className="w-full flex items-center justify-between text-left"
                >
                  <h4 className="text-sm font-bold text-sky-400">Agent Metrics</h4>
                  <span className="text-xs text-slate-500">{expandedState["agentMetrics"] ? "▼" : "▶"}</span>
                </button>
                {expandedState["agentMetrics"] && (
                  <div className="mt-2 space-y-1 font-mono text-xs">
                    {Object.entries(agentMetrics).map(([key, value]) => (
                      <div key={key} className="flex">
                        <span className="text-purple-400 w-32">{key}:</span>
                        {renderStateValue(`agentMetrics.${key}`, value)}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* RL Metrics */}
              <div className="bg-slate-800 rounded p-3 border border-slate-700">
                <button
                  onClick={() => toggleStateExpansion("rlMetrics")}
                  className="w-full flex items-center justify-between text-left"
                >
                  <h4 className="text-sm font-bold text-sky-400">RL Metrics</h4>
                  <span className="text-xs text-slate-500">{expandedState["rlMetrics"] ? "▼" : "▶"}</span>
                </button>
                {expandedState["rlMetrics"] && (
                  <div className="mt-2 space-y-1 font-mono text-xs">
                    <div className="flex">
                      <span className="text-purple-400 w-32">epoch:</span>
                      <span className="text-slate-300">{rlMetrics.epoch}</span>
                    </div>
                    <div className="flex">
                      <span className="text-purple-400 w-32">accuracy:</span>
                      <span className="text-slate-300">{(rlMetrics.accuracy * 100).toFixed(2)}%</span>
                    </div>
                    <div className="flex">
                      <span className="text-purple-400 w-32">loss.length:</span>
                      <span className="text-slate-300">{rlMetrics.loss.length}</span>
                    </div>
                    <div className="flex">
                      <span className="text-purple-400 w-32">reward.length:</span>
                      <span className="text-slate-300">{rlMetrics.reward.length}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Services */}
              <div className="bg-slate-800 rounded p-3 border border-slate-700">
                <button
                  onClick={() => toggleStateExpansion("services")}
                  className="w-full flex items-center justify-between text-left"
                >
                  <h4 className="text-sm font-bold text-sky-400">Services ({services.length})</h4>
                  <span className="text-xs text-slate-500">{expandedState["services"] ? "▼" : "▶"}</span>
                </button>
                {expandedState["services"] && (
                  <div className="mt-2 space-y-2">
                    {services.map((service, idx) => (
                      <div key={idx} className="bg-slate-900 rounded p-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-300 font-bold">{service.name}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] ${
                            service.status === "ACTIVE" ? "bg-green-900/30 text-green-400" :
                            service.status === "ERROR" ? "bg-red-900/30 text-red-400" :
                            "bg-slate-700 text-slate-400"
                          }`}>
                            {service.status}
                          </span>
                        </div>
                        <div className="mt-1 text-slate-500">
                          Latency: {service.latency}ms | Protocol: {service.protocol}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "performance" && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-300 mb-4">Performance Metrics</h3>
              <div className="bg-slate-800 rounded p-4 border border-slate-700">
                <PerformanceProfiler metrics={performanceMetrics} isVisible={true} />
              </div>
              <div className="bg-slate-800 rounded p-4 border border-slate-700">
                <h4 className="text-xs font-bold text-slate-400 mb-2">Detailed Metrics</h4>
                <div className="space-y-2 font-mono text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">FPS:</span>
                    <span className="text-slate-300">{performanceMetrics.fps}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Frame Time:</span>
                    <span className="text-slate-300">{performanceMetrics.frameTime.toFixed(2)}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Render Time:</span>
                    <span className="text-slate-300">{performanceMetrics.renderTime.toFixed(2)}ms</span>
                  </div>
                  {performanceMetrics.memoryUsage !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Memory Usage:</span>
                      <span className="text-slate-300">{performanceMetrics.memoryUsage.toFixed(2)} MB</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-500">Last Update:</span>
                    <span className="text-slate-300">
                      {new Date(performanceMetrics.lastUpdate).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "network" && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-300 mb-4">Network Simulation Controls</h3>
              
              {/* Packet Loss */}
              <div className="bg-slate-800 rounded p-4 border border-slate-700">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Packet Loss: {packetLoss}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="50"
                  value={packetLoss}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    setPacketLoss(value);
                    onNetworkSimulationChange?.(value, simulatedLatency);
                  }}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>0%</span>
                  <span>25%</span>
                  <span>50%</span>
                </div>
              </div>

              {/* Latency */}
              <div className="bg-slate-800 rounded p-4 border border-slate-700">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Simulated Latency: {simulatedLatency}ms
                </label>
                <input
                  type="range"
                  min="0"
                  max="1000"
                  step="10"
                  value={simulatedLatency}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    setSimulatedLatency(value);
                    onNetworkSimulationChange?.(packetLoss, value);
                  }}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>0ms</span>
                  <span>500ms</span>
                  <span>1000ms</span>
                </div>
              </div>

              {/* Network Stats */}
              <div className="bg-slate-800 rounded p-4 border border-slate-700">
                <h4 className="text-xs font-bold text-slate-400 mb-2">Service Network Stats</h4>
                <div className="space-y-2">
                  {services.map((service) => (
                    <div key={service.name} className="flex justify-between text-xs">
                      <span className="text-slate-400">{service.name}:</span>
                      <span className={`${
                        service.latency > 200 ? "text-red-400" :
                        service.latency > 100 ? "text-yellow-400" :
                        "text-green-400"
                      }`}>
                        {service.latency}ms ({service.protocol})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "logs" && (
            <div className="h-full flex flex-col -m-4">
              <LogViewer />
            </div>
          )}
        </div>

        {/* Config Panel */}
        <ConfigPanel
          isOpen={showConfigPanel}
          onClose={() => setShowConfigPanel(false)}
        />
      </div>
    </div>
  );
};

