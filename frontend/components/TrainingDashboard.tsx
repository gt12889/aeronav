import { useState, useEffect, useRef } from "react";
import {
  BrainCircuit,
  TrendingUp,
  TrendingDown,
  Activity,
  Zap,
  Target,
  BarChart3,
  Play,
  Pause,
  RotateCcw,
  Database,
} from "lucide-react";
import type { RLMetrics, AgentMetrics } from "../types/index.js";
import { MiniChart } from "./MiniChart.js";
import { configManager } from "../utils/config.js";

interface TrainingDashboardProps {
  rlMetrics: RLMetrics;
  agentMetrics: AgentMetrics;
  isTraining: boolean;
  onStartTraining?: () => void;
  onStopTraining?: () => void;
  onResetMetrics?: () => void;
}

interface Hyperparameter {
  name: string;
  value: number | string;
  description: string;
  category: string;
}

export const TrainingDashboard = ({
  rlMetrics,
  agentMetrics,
  isTraining,
  onStartTraining,
  onStopTraining,
  onResetMetrics,
}: TrainingDashboardProps) => {
  const [selectedMetric, setSelectedMetric] = useState<"loss" | "reward" | "accuracy">("reward");
  const [timeRange, setTimeRange] = useState<"all" | "recent" | "last100">("recent");
  const [replayBufferStats, setReplayBufferStats] = useState({
    size: 0,
    capacity: 10000,
    oldestExperience: 0,
    newestExperience: 0,
  });

  const rlConfig = configManager.getSimulationConfig().rl;

  // Simulate replay buffer stats
  useEffect(() => {
    if (isTraining) {
      const interval = setInterval(() => {
        setReplayBufferStats((prev) => ({
          size: Math.min(prev.capacity, prev.size + Math.floor(Math.random() * 10)),
          capacity: prev.capacity,
          oldestExperience: prev.oldestExperience + 1,
          newestExperience: Date.now(),
        }));
      }, 500);
      return () => clearInterval(interval);
    }
  }, [isTraining]);

  const hyperparameters: Hyperparameter[] = [
    {
      name: "Epsilon (Exploration)",
      value: isTraining ? rlConfig.epsilon.training : rlConfig.epsilon.normal,
      description: "Probability of random action selection",
      category: "Exploration",
    },
    {
      name: "Learning Rate",
      value: rlConfig.learningRate,
      description: "Step size for Q-value updates",
      category: "Learning",
    },
    {
      name: "Discount Factor (Gamma)",
      value: "0.95",
      description: "Future reward discount factor",
      category: "Learning",
    },
    {
      name: "Max Energy",
      value: rlConfig.energy.max,
      description: "Maximum agent energy capacity",
      category: "Agent",
    },
    {
      name: "Energy Regen Rate",
      value: rlConfig.energy.regen,
      description: "Passive energy regeneration per step",
      category: "Agent",
    },
    {
      name: "Replay Buffer Size",
      value: replayBufferStats.capacity,
      description: "Maximum stored experiences",
      category: "Memory",
    },
    {
      name: "Batch Size",
      value: "32",
      description: "Number of experiences per update",
      category: "Training",
    },
    {
      name: "Update Frequency",
      value: "4",
      description: "Steps between target network updates",
      category: "Training",
    },
  ];

  const filteredMetrics = () => {
    if (timeRange === "all") {
      return {
        loss: rlMetrics.loss,
        reward: rlMetrics.reward,
      };
    } else if (timeRange === "last100") {
      return {
        loss: rlMetrics.loss.slice(-100),
        reward: rlMetrics.reward.slice(-100),
      };
    } else {
      // Recent (last 30)
      return {
        loss: rlMetrics.loss.slice(-30),
        reward: rlMetrics.reward.slice(-30),
      };
    }
  };

  const metrics = filteredMetrics();

  const calculateStats = (data: number[]) => {
    if (data.length === 0) return { mean: 0, min: 0, max: 0, trend: 0 };
    const mean = data.reduce((a, b) => a + b, 0) / data.length;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const recent = data.slice(-10);
    const older = data.slice(-20, -10);
    const recentMean = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderMean = older.length > 0 ? older.reduce((a, b) => a + b, 0) / older.length : recentMean;
    const trend = recentMean - olderMean;
    return { mean, min, max, trend };
  };

  const lossStats = calculateStats(metrics.loss);
  const rewardStats = calculateStats(metrics.reward);

  return (
    <div className="h-full flex flex-col bg-[#0B1120] overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-900">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <BrainCircuit className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold text-amber-400">Training Dashboard</h2>
            <span className={`px-2 py-0.5 text-xs rounded ${
              isTraining
                ? "bg-amber-900/30 text-amber-400 border border-amber-700 animate-pulse"
                : "bg-slate-800 text-slate-500 border border-slate-700"
            }`}>
              {isTraining ? "TRAINING" : "STANDBY"}
            </span>
          </div>
          <div className="flex gap-2">
            {onResetMetrics && (
              <button
                onClick={onResetMetrics}
                className="px-3 py-1 text-xs bg-slate-800 border border-slate-700 text-slate-400 rounded hover:bg-slate-700 flex items-center gap-2"
              >
                <RotateCcw size={12} /> Reset
              </button>
            )}
            {isTraining ? (
              onStopTraining && (
                <button
                  onClick={onStopTraining}
                  className="px-3 py-1 text-xs bg-red-900/30 border border-red-700 text-red-400 rounded hover:bg-red-900/50 flex items-center gap-2"
                >
                  <Pause size={12} /> Stop Training
                </button>
              )
            ) : (
              onStartTraining && (
                <button
                  onClick={onStartTraining}
                  className="px-3 py-1 text-xs bg-amber-900/30 border border-amber-700 text-amber-400 rounded hover:bg-amber-900/50 flex items-center gap-2"
                >
                  <Play size={12} /> Start Training
                </button>
              )
            )}
          </div>
        </div>

        {/* Time Range Selector */}
        <div className="flex gap-2">
          <button
            onClick={() => setTimeRange("recent")}
            className={`px-2 py-1 text-xs rounded ${
              timeRange === "recent"
                ? "bg-amber-900/30 border border-amber-700 text-amber-400"
                : "bg-slate-800 border border-slate-700 text-slate-500 hover:text-slate-300"
            }`}
          >
            Recent (30)
          </button>
          <button
            onClick={() => setTimeRange("last100")}
            className={`px-2 py-1 text-xs rounded ${
              timeRange === "last100"
                ? "bg-amber-900/30 border border-amber-700 text-amber-400"
                : "bg-slate-800 border border-slate-700 text-slate-500 hover:text-slate-300"
            }`}
          >
            Last 100
          </button>
          <button
            onClick={() => setTimeRange("all")}
            className={`px-2 py-1 text-xs rounded ${
              timeRange === "all"
                ? "bg-amber-900/30 border border-amber-700 text-amber-400"
                : "bg-slate-800 border border-slate-700 text-slate-500 hover:text-slate-300"
            }`}
          >
            All
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Metrics Overview */}
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-slate-900 rounded p-3 border border-slate-800">
            <div className="text-xs text-slate-500 mb-1">Epoch</div>
            <div className="text-2xl font-mono text-amber-400">{rlMetrics.epoch}</div>
          </div>
          <div className="bg-slate-900 rounded p-3 border border-slate-800">
            <div className="text-xs text-slate-500 mb-1">Accuracy</div>
            <div className="text-2xl font-mono text-sky-400">{(rlMetrics.accuracy * 100).toFixed(1)}%</div>
          </div>
          <div className="bg-slate-900 rounded p-3 border border-slate-800">
            <div className="text-xs text-slate-500 mb-1">Avg Reward</div>
            <div className={`text-2xl font-mono flex items-center gap-1 ${
              rewardStats.trend > 0 ? "text-emerald-400" : rewardStats.trend < 0 ? "text-red-400" : "text-slate-400"
            }`}>
              {rewardStats.mean.toFixed(3)}
              {rewardStats.trend !== 0 && (
                rewardStats.trend > 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />
              )}
            </div>
          </div>
          <div className="bg-slate-900 rounded p-3 border border-slate-800">
            <div className="text-xs text-slate-500 mb-1">Avg Loss</div>
            <div className={`text-2xl font-mono flex items-center gap-1 ${
              lossStats.trend < 0 ? "text-emerald-400" : lossStats.trend > 0 ? "text-red-400" : "text-slate-400"
            }`}>
              {lossStats.mean.toFixed(4)}
              {lossStats.trend !== 0 && (
                lossStats.trend < 0 ? <TrendingDown size={16} /> : <TrendingUp size={16} />
              )}
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-900 rounded p-3 border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-red-400 flex items-center gap-2">
                <TrendingDown size={14} /> Trajectory Error (Loss)
              </h3>
              <div className="text-xs text-slate-500">
                Min: {lossStats.min.toFixed(4)} | Max: {lossStats.max.toFixed(4)}
              </div>
            </div>
            <MiniChart data={metrics.loss} color="#ef4444" label="LOSS" />
          </div>

          <div className="bg-slate-900 rounded p-3 border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-sky-400 flex items-center gap-2">
                <TrendingUp size={14} /> Navigation Efficiency (Reward)
              </h3>
              <div className="text-xs text-slate-500">
                Min: {rewardStats.min.toFixed(3)} | Max: {rewardStats.max.toFixed(3)}
              </div>
            </div>
            <MiniChart data={metrics.reward} color="#0ea5e9" label="REWARD" />
          </div>
        </div>

        {/* Hyperparameters */}
        <div className="bg-slate-900 rounded p-4 border border-slate-800">
          <h3 className="text-sm font-bold text-amber-400 mb-3 flex items-center gap-2">
            <Zap size={14} /> Hyperparameters
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {hyperparameters.map((hp) => (
              <div key={hp.name} className="bg-slate-950 rounded p-2 border border-slate-800">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="text-xs font-bold text-slate-300">{hp.name}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{hp.description}</div>
                  </div>
                  <div className="text-sm font-mono text-amber-400 ml-2">{hp.value}</div>
                </div>
                <div className="text-[10px] text-slate-600 mt-1">{hp.category}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Replay Buffer Stats */}
        <div className="bg-slate-900 rounded p-4 border border-slate-800">
          <h3 className="text-sm font-bold text-purple-400 mb-3 flex items-center gap-2">
            <Database size={14} /> Replay Buffer
          </h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-950 rounded p-2 border border-slate-800">
              <div className="text-xs text-slate-500">Size</div>
              <div className="text-lg font-mono text-purple-400">{replayBufferStats.size.toLocaleString()}</div>
              <div className="text-[10px] text-slate-600 mt-1">
                {((replayBufferStats.size / replayBufferStats.capacity) * 100).toFixed(1)}% full
              </div>
            </div>
            <div className="bg-slate-950 rounded p-2 border border-slate-800">
              <div className="text-xs text-slate-500">Capacity</div>
              <div className="text-lg font-mono text-slate-400">{replayBufferStats.capacity.toLocaleString()}</div>
            </div>
            <div className="bg-slate-950 rounded p-2 border border-slate-800">
              <div className="text-xs text-slate-500">Experiences</div>
              <div className="text-lg font-mono text-sky-400">
                {replayBufferStats.oldestExperience.toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-600 mt-1">total collected</div>
            </div>
          </div>
          {/* Progress Bar */}
          <div className="mt-3">
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-500 transition-all duration-300"
                style={{ width: `${(replayBufferStats.size / replayBufferStats.capacity) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Agent Performance */}
        <div className="bg-slate-900 rounded p-4 border border-slate-800">
          <h3 className="text-sm font-bold text-emerald-400 mb-3 flex items-center gap-2">
            <Target size={14} /> Agent Performance
          </h3>
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-slate-950 rounded p-2 border border-slate-800">
              <div className="text-xs text-slate-500">Current Action</div>
              <div className="text-sm font-mono text-emerald-400">{agentMetrics.action}</div>
            </div>
            <div className="bg-slate-950 rounded p-2 border border-slate-800">
              <div className="text-xs text-slate-500">Confidence</div>
              <div className="text-sm font-mono text-sky-400">{(agentMetrics.confidence * 100).toFixed(1)}%</div>
            </div>
            <div className="bg-slate-950 rounded p-2 border border-slate-800">
              <div className="text-xs text-slate-500">Last Reward</div>
              <div className={`text-sm font-mono ${
                agentMetrics.reward > 0 ? "text-emerald-400" : agentMetrics.reward < 0 ? "text-red-400" : "text-slate-400"
              }`}>
                {agentMetrics.reward.toFixed(3)}
              </div>
            </div>
            <div className="bg-slate-950 rounded p-2 border border-slate-800">
              <div className="text-xs text-slate-500">Energy</div>
              <div className="text-sm font-mono text-amber-400">{agentMetrics.energy.toFixed(1)}%</div>
              <div className="h-1 bg-slate-800 rounded-full mt-1 overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    agentMetrics.energy > 50 ? "bg-emerald-500" :
                    agentMetrics.energy > 20 ? "bg-yellow-500" : "bg-red-500"
                  }`}
                  style={{ width: `${agentMetrics.energy}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Training Statistics */}
        {isTraining && (
          <div className="bg-slate-900 rounded p-4 border border-amber-800/50">
            <h3 className="text-sm font-bold text-amber-400 mb-3 flex items-center gap-2">
              <Activity size={14} /> Training Statistics
            </h3>
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div>
                <div className="text-slate-500">Steps/Second</div>
                <div className="text-slate-300 font-mono">~5</div>
              </div>
              <div>
                <div className="text-slate-500">Updates/Second</div>
                <div className="text-slate-300 font-mono">~1.25</div>
              </div>
              <div>
                <div className="text-slate-500">Data Rate</div>
                <div className="text-slate-300 font-mono">2.4 TB/s</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

