import { useState, useEffect } from "react";
import {
  Users,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Minus,
  Zap,
  Activity,
  Target,
  BarChart3,
} from "lucide-react";
import type { MultiAgentMetrics, CoordinationEvent, AgentPolicy } from "../types/index.js";
import {
  getPolicyColor,
  getPolicyDescription,
} from "../utils/multiAgentSystem.js";
import { MiniChart } from "./MiniChart.js";

interface MultiAgentDashboardProps {
  agents: MultiAgentMetrics[];
  coordinationEvents: CoordinationEvent[];
  isTraining: boolean;
}

export const MultiAgentDashboard = ({
  agents,
  coordinationEvents,
  isTraining,
}: MultiAgentDashboardProps) => {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(agents[0]?.id || null);
  const [timeRange, setTimeRange] = useState<"recent" | "all">("recent");
  const [filterType, setFilterType] = useState<"all" | "conflict" | "cooperation" | "independence">("all");

  const selectedAgentData = agents.find((a) => a.id === selectedAgent) || agents[0];

  // Filter coordination events
  const filteredEvents = coordinationEvents.filter((e) => {
    if (filterType === "all") return true;
    return e.type === filterType;
  });

  // Get recent events (last 50)
  const recentEvents = timeRange === "recent" 
    ? filteredEvents.slice(-50) 
    : filteredEvents;

  // Calculate statistics
  const stats = {
    totalAgents: agents.length,
    activeAgents: agents.filter((a) => a.action !== "IDLE").length,
    avgCoordination: agents.reduce((sum, a) => sum + a.coordinationScore, 0) / agents.length,
    conflicts: coordinationEvents.filter((e) => e.type === "conflict").length,
    cooperations: coordinationEvents.filter((e) => e.type === "cooperation").length,
    independences: coordinationEvents.filter((e) => e.type === "independence").length,
  };

  // Group events by type for visualization
  const eventCounts = {
    conflict: coordinationEvents.filter((e) => e.type === "conflict").length,
    cooperation: coordinationEvents.filter((e) => e.type === "cooperation").length,
    independence: coordinationEvents.filter((e) => e.type === "independence").length,
  };

  return (
    <div className="h-full flex flex-col bg-[#0B1120] overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-900">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-emerald-400">Multi-Agent System</h2>
            <span className={`px-2 py-0.5 text-xs rounded ${
              isTraining
                ? "bg-emerald-900/30 text-emerald-400 border border-emerald-700 animate-pulse"
                : "bg-slate-800 text-slate-500 border border-slate-700"
            }`}>
              {agents.length} Agents
            </span>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-4 gap-2">
          <div className="bg-slate-800 rounded p-2 border border-slate-700">
            <div className="text-xs text-slate-500">Active</div>
            <div className="text-lg font-mono text-emerald-400">{stats.activeAgents}/{stats.totalAgents}</div>
          </div>
          <div className="bg-slate-800 rounded p-2 border border-slate-700">
            <div className="text-xs text-slate-500">Avg Coordination</div>
            <div className="text-lg font-mono text-sky-400">{(stats.avgCoordination * 100).toFixed(1)}%</div>
          </div>
          <div className="bg-slate-800 rounded p-2 border border-slate-700">
            <div className="text-xs text-slate-500">Conflicts</div>
            <div className="text-lg font-mono text-red-400">{stats.conflicts}</div>
          </div>
          <div className="bg-slate-800 rounded p-2 border border-slate-700">
            <div className="text-xs text-slate-500">Cooperations</div>
            <div className="text-lg font-mono text-green-400">{stats.cooperations}</div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Agent List */}
        <div className="bg-slate-900 rounded p-4 border border-slate-800">
          <h3 className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2">
            <Users size={14} /> Agents
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {agents.map((agent) => {
              const policyColor = getPolicyColor(agent.policy);
              const isSelected = selectedAgent === agent.id;
              
              return (
                <button
                  key={agent.id}
                  onClick={() => setSelectedAgent(agent.id)}
                  className={`p-3 rounded border text-left transition-all ${
                    isSelected
                      ? "border-emerald-500 bg-emerald-900/20"
                      : "border-slate-700 bg-slate-800 hover:border-slate-600"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-bold" style={{ color: policyColor }}>
                      {agent.name}
                    </div>
                    <div className={`px-1.5 py-0.5 text-[10px] rounded ${
                      agent.action === "IDLE" ? "bg-slate-700 text-slate-400" :
                      agent.action === "BOOST" ? "bg-red-900/30 text-red-400" :
                      agent.action === "STABILIZE" ? "bg-blue-900/30 text-blue-400" :
                      "bg-green-900/30 text-green-400"
                    }`}>
                      {agent.action}
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-500 mb-1">{agent.policy}</div>
                  <div className="flex items-center gap-2 text-xs">
                    <div className="flex-1">
                      <div className="text-slate-400">Confidence</div>
                      <div className="font-mono text-sky-400">{(agent.confidence * 100).toFixed(1)}%</div>
                    </div>
                    <div className="flex-1">
                      <div className="text-slate-400">Energy</div>
                      <div className="font-mono text-amber-400">{agent.energy.toFixed(0)}%</div>
                    </div>
                    <div className="flex-1">
                      <div className="text-slate-400">Coord</div>
                      <div className="font-mono text-emerald-400">{(agent.coordinationScore * 100).toFixed(0)}%</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Agent Details */}
        {selectedAgentData && (
          <div className="bg-slate-900 rounded p-4 border border-slate-800">
            <h3 className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2">
              <Target size={14} /> {selectedAgentData.name} Details
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-slate-500 mb-2">Policy</div>
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded"
                    style={{ backgroundColor: getPolicyColor(selectedAgentData.policy) }}
                  />
                  <div className="text-sm font-bold" style={{ color: getPolicyColor(selectedAgentData.policy) }}>
                    {selectedAgentData.policy}
                  </div>
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {getPolicyDescription(selectedAgentData.policy)}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-2">Q-Table (Low Noise)</div>
                <div className="space-y-1 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-400">GLIDE:</span>
                    <span className="text-green-400">
                      {selectedAgentData.qTable.LOW_NOISE.GLIDE.toFixed(3)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">BOOST:</span>
                    <span className="text-red-400">
                      {selectedAgentData.qTable.LOW_NOISE.BOOST.toFixed(3)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">STABILIZE:</span>
                    <span className="text-blue-400">
                      {selectedAgentData.qTable.LOW_NOISE.STABILIZE.toFixed(3)}
                    </span>
                  </div>
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-2">Q-Table (High Noise)</div>
                <div className="space-y-1 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-400">GLIDE:</span>
                    <span className="text-green-400">
                      {selectedAgentData.qTable.HIGH_NOISE.GLIDE.toFixed(3)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">BOOST:</span>
                    <span className="text-red-400">
                      {selectedAgentData.qTable.HIGH_NOISE.BOOST.toFixed(3)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">STABILIZE:</span>
                    <span className="text-blue-400">
                      {selectedAgentData.qTable.HIGH_NOISE.STABILIZE.toFixed(3)}
                    </span>
                  </div>
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-2">Performance</div>
                <div className="space-y-1 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Steps:</span>
                    <span className="text-slate-300">{selectedAgentData.totalSteps}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Last Reward:</span>
                    <span className={selectedAgentData.reward > 0 ? "text-emerald-400" : "text-red-400"}>
                      {selectedAgentData.reward.toFixed(3)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Coordination:</span>
                    <span className="text-emerald-400">
                      {(selectedAgentData.coordinationScore * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Coordination Events */}
        <div className="bg-slate-900 rounded p-4 border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
              <Activity size={14} /> Coordination Events
            </h3>
            <div className="flex gap-2">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-300"
              >
                <option value="all">All</option>
                <option value="conflict">Conflicts</option>
                <option value="cooperation">Cooperations</option>
                <option value="independence">Independence</option>
              </select>
              <button
                onClick={() => setTimeRange(timeRange === "recent" ? "all" : "recent")}
                className={`px-2 py-1 text-xs rounded ${
                  timeRange === "recent"
                    ? "bg-emerald-900/30 border border-emerald-700 text-emerald-400"
                    : "bg-slate-800 border border-slate-700 text-slate-400"
                }`}
              >
                {timeRange === "recent" ? "Recent" : "All"}
              </button>
            </div>
          </div>

          {/* Event Type Chart */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 size={12} className="text-slate-500" />
              <span className="text-xs text-slate-500">Event Distribution</span>
            </div>
            <div className="flex gap-2 h-8">
              <div
                className="bg-red-500 rounded flex items-center justify-center text-xs font-bold text-white"
                style={{ width: `${(eventCounts.conflict / Math.max(1, Object.values(eventCounts).reduce((a, b) => a + b, 0))) * 100}%` }}
                title={`Conflicts: ${eventCounts.conflict}`}
              >
                {eventCounts.conflict > 0 && eventCounts.conflict}
              </div>
              <div
                className="bg-green-500 rounded flex items-center justify-center text-xs font-bold text-white"
                style={{ width: `${(eventCounts.cooperation / Math.max(1, Object.values(eventCounts).reduce((a, b) => a + b, 0))) * 100}%` }}
                title={`Cooperations: ${eventCounts.cooperation}`}
              >
                {eventCounts.cooperation > 0 && eventCounts.cooperation}
              </div>
              <div
                className="bg-blue-500 rounded flex items-center justify-center text-xs font-bold text-white"
                style={{ width: `${(eventCounts.independence / Math.max(1, Object.values(eventCounts).reduce((a, b) => a + b, 0))) * 100}%` }}
                title={`Independence: ${eventCounts.independence}`}
              >
                {eventCounts.independence > 0 && eventCounts.independence}
              </div>
            </div>
          </div>

          {/* Event List */}
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {recentEvents.length === 0 ? (
              <div className="text-xs text-slate-500 text-center py-4">No coordination events</div>
            ) : (
              recentEvents.slice().reverse().map((event, idx) => {
                const agent1Name = agents.find((a) => a.id === event.agent1)?.name || event.agent1;
                const agent2Name = agents.find((a) => a.id === event.agent2)?.name || event.agent2;
                
                return (
                  <div
                    key={idx}
                    className={`p-2 rounded border text-xs ${
                      event.type === "conflict"
                        ? "bg-red-900/20 border-red-800 text-red-300"
                        : event.type === "cooperation"
                        ? "bg-green-900/20 border-green-800 text-green-300"
                        : "bg-blue-900/20 border-blue-800 text-blue-300"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {event.type === "conflict" && <AlertTriangle size={12} />}
                      {event.type === "cooperation" && <CheckCircle size={12} />}
                      {event.type === "independence" && <Minus size={12} />}
                      <span className="font-bold">{event.type.toUpperCase()}</span>
                      <span className="text-slate-500">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="text-slate-400">{event.description}</div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

