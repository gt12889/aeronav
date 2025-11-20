import { Activity, Cpu, MemoryStick, Gauge } from "lucide-react";
import type { PerformanceMetrics } from "../types/index.js";

interface PerformanceProfilerProps {
  metrics: PerformanceMetrics;
  isVisible: boolean;
}

export const PerformanceProfiler = ({ metrics, isVisible }: PerformanceProfilerProps) => {
  if (!isVisible) return null;

  const getFpsColor = (fps: number) => {
    if (fps >= 55) return "text-emerald-400";
    if (fps >= 30) return "text-yellow-400";
    return "text-red-400";
  };

  const getFrameTimeColor = (frameTime: number) => {
    if (frameTime < 16.67) return "text-emerald-400"; // < 60fps threshold
    if (frameTime < 33.33) return "text-yellow-400"; // < 30fps threshold
    return "text-red-400";
  };

  return (
    <div className="absolute top-4 right-4 z-20 bg-slate-900/95 backdrop-blur-sm border border-slate-700 rounded-lg p-3 font-mono text-xs min-w-[200px]">
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-700">
        <Activity className="w-4 h-4 text-sky-400" />
        <span className="text-slate-300 font-bold uppercase tracking-wider">Performance</span>
      </div>

      <div className="space-y-2">
        {/* FPS */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-400">
            <Gauge className="w-3 h-3" />
            <span>FPS</span>
          </div>
          <span className={`font-bold ${getFpsColor(metrics.fps)}`}>
            {metrics.fps}
          </span>
        </div>

        {/* Frame Time */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-400">
            <Cpu className="w-3 h-3" />
            <span>Frame Time</span>
          </div>
          <span className={`font-bold ${getFrameTimeColor(metrics.frameTime)}`}>
            {metrics.frameTime.toFixed(2)}ms
          </span>
        </div>

        {/* Render Time */}
        {metrics.renderTime > 0 && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-400">
              <Activity className="w-3 h-3" />
              <span>Render</span>
            </div>
            <span className="text-sky-400 font-bold">
              {metrics.renderTime.toFixed(2)}ms
            </span>
          </div>
        )}

        {/* Audio Processing Time */}
        {metrics.audioProcessingTime !== undefined && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-400">
              <Activity className="w-3 h-3" />
              <span>Audio</span>
            </div>
            <span className="text-purple-400 font-bold">
              {metrics.audioProcessingTime.toFixed(2)}ms
            </span>
          </div>
        )}

        {/* Memory Usage */}
        {metrics.memoryUsage !== undefined && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-400">
              <MemoryStick className="w-3 h-3" />
              <span>Memory</span>
            </div>
            <span className="text-amber-400 font-bold">
              {metrics.memoryUsage.toFixed(2)} MB
            </span>
          </div>
        )}
      </div>

      {/* Performance Indicator Bar */}
      <div className="mt-3 pt-2 border-t border-slate-700">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                metrics.fps >= 55
                  ? "bg-emerald-500"
                  : metrics.fps >= 30
                  ? "bg-yellow-500"
                  : "bg-red-500"
              }`}
              style={{ width: `${Math.min(100, (metrics.fps / 60) * 100)}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-500">
            {metrics.fps >= 55 ? "OPTIMAL" : metrics.fps >= 30 ? "GOOD" : "LOW"}
          </span>
        </div>
      </div>
    </div>
  );
};

