import { useState } from "react";
import { Download, FileText, FileJson, Database, BarChart3, Activity, Package, Box } from "lucide-react";
import {
  exportLogsToCSV,
  exportLogsToJSON,
  exportMetricsToCSV,
  exportMetricsToJSON,
  exportStateToJSON,
  exportSceneState,
  type ExportableState,
} from "../utils/exportUtils.js";
import { exportSceneToUSD, downloadUSD } from "../utils/usdExporter.js";
import type { LogEntry, ServiceStatus, AgentMetrics, RLMetrics, PerformanceMetrics, AudioData, Particle, NebulaCloud } from "../types/index.js";

interface ExportMenuProps {
  logs: LogEntry[];
  services: ServiceStatus[];
  agentMetrics: AgentMetrics;
  rlMetrics: RLMetrics;
  performanceMetrics: PerformanceMetrics;
  audioData: AudioData;
  isTraining: boolean;
  isSimRunning: boolean;
  sceneData?: {
    spaceship: { 
      x: number; 
      y: number; 
      z?: number;
      roll: number;
      rotation?: { x: number; y: number; z: number; w: number };
      velocity?: { x: number; y: number; z: number };
    };
    particles: Particle[];
    nebula: NebulaCloud[];
  };
}

export const ExportMenu = ({
  logs,
  services,
  agentMetrics,
  rlMetrics,
  performanceMetrics,
  audioData,
  isTraining,
  isSimRunning,
  sceneData,
}: ExportMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleExportLogs = (format: "csv" | "json") => {
    if (format === "csv") {
      exportLogsToCSV(logs);
    } else {
      exportLogsToJSON(logs);
    }
    setIsOpen(false);
  };

  const handleExportMetrics = (format: "csv" | "json") => {
    if (format === "csv") {
      exportMetricsToCSV(rlMetrics, agentMetrics);
    } else {
      exportMetricsToJSON(rlMetrics, agentMetrics);
    }
    setIsOpen(false);
  };

  const handleExportState = () => {
    const state: ExportableState = {
      timestamp: new Date().toISOString(),
      services,
      logs,
      agentMetrics,
      rlMetrics,
      performanceMetrics,
      audioData,
      isTraining,
      isSimRunning,
    };
    exportStateToJSON(state);
    setIsOpen(false);
  };

  const handleExportScene = () => {
    if (sceneData) {
      exportSceneState({
        ...sceneData,
        timestamp: new Date().toISOString(),
      });
    }
    setIsOpen(false);
  };

  const handleExportUSD = () => {
    if (!sceneData) return;
    
    // Convert scene data to USD format
    const spaceshipData = {
      position: {
        x: sceneData.spaceship.x,
        y: sceneData.spaceship.y,
        z: sceneData.spaceship.z || 0,
      },
      rotation: sceneData.spaceship.rotation || {
        x: 0,
        y: 0,
        z: sceneData.spaceship.roll * (Math.PI / 180),
        w: 1,
      },
      scale: { x: 1, y: 1, z: 1 },
      velocity: sceneData.spaceship.velocity || { x: 0, y: 0, z: 0 },
    };

    const particlesData = sceneData.particles.map((p) => ({
      position: { x: p.x, y: p.y, z: p.z },
      size: p.size,
      type: p.type,
    }));

    const nebulaData = sceneData.nebula.map((n) => {
      // Convert HSL to RGB-like format for USD
      const hue = n.baseHue / 360;
      const saturation = 0.7;
      const lightness = 0.4;
      
      // Simple HSL to RGB conversion
      const c = (1 - Math.abs(2 * lightness - 1)) * saturation;
      const x = c * (1 - Math.abs(((hue * 6) % 2) - 1));
      const m = lightness - c / 2;
      
      let r = 0, g = 0, b = 0;
      if (hue < 1/6) { r = c; g = x; b = 0; }
      else if (hue < 2/6) { r = x; g = c; b = 0; }
      else if (hue < 3/6) { r = 0; g = c; b = x; }
      else if (hue < 4/6) { r = 0; g = x; b = c; }
      else if (hue < 5/6) { r = x; g = 0; b = c; }
      else { r = c; g = 0; b = x; }
      
      return {
        position: { x: n.x, y: n.y, z: 0 },
        radius: n.radius,
        color: {
          r: r + m,
          g: g + m,
          b: b + m,
          a: 0.3,
        },
      };
    });

    const environmentData = {
      gridSize: 1,
      bounds: {
        min: { x: -1000, y: -1000, z: -100 },
        max: { x: 1000, y: 1000, z: 100 },
      },
    };

    const usdContent = exportSceneToUSD(
      spaceshipData,
      particlesData,
      nebulaData,
      environmentData,
      Date.now()
    );

    downloadUSD(usdContent, `aeronavsim_scene_${Date.now()}.usd`);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded border border-slate-700 text-slate-500 hover:text-slate-300 hover:border-slate-600 transition-colors flex items-center gap-2"
        title="Export Data"
      >
        <Download size={18} />
        <span className="text-xs">Export</span>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Menu */}
          <div className="absolute top-full right-0 mt-2 w-64 bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden">
            <div className="p-2 border-b border-slate-700">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Export Data</h3>
            </div>

            <div className="py-2">
              {/* Logs */}
              <div className="px-2 py-1">
                <div className="text-xs text-slate-500 mb-1 flex items-center gap-2">
                  <Database size={12} /> Logs ({logs.length})
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleExportLogs("csv")}
                    className="flex-1 px-2 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded flex items-center justify-center gap-1 text-slate-300 transition-colors"
                  >
                    <FileText size={12} /> CSV
                  </button>
                  <button
                    onClick={() => handleExportLogs("json")}
                    className="flex-1 px-2 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded flex items-center justify-center gap-1 text-slate-300 transition-colors"
                  >
                    <FileJson size={12} /> JSON
                  </button>
                </div>
              </div>

              {/* Metrics */}
              <div className="px-2 py-1">
                <div className="text-xs text-slate-500 mb-1 flex items-center gap-2">
                  <BarChart3 size={12} /> Metrics
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleExportMetrics("csv")}
                    className="flex-1 px-2 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded flex items-center justify-center gap-1 text-slate-300 transition-colors"
                  >
                    <FileText size={12} /> CSV
                  </button>
                  <button
                    onClick={() => handleExportMetrics("json")}
                    className="flex-1 px-2 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded flex items-center justify-center gap-1 text-slate-300 transition-colors"
                  >
                    <FileJson size={12} /> JSON
                  </button>
                </div>
              </div>

              {/* Performance */}
              <div className="px-2 py-1">
                <div className="text-xs text-slate-500 mb-1 flex items-center gap-2">
                  <Activity size={12} /> Performance
                </div>
                <button
                  onClick={() => {
                    exportMetricsToCSV([performanceMetrics], agentMetrics);
                    setIsOpen(false);
                  }}
                  className="w-full px-2 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded flex items-center justify-center gap-1 text-slate-300 transition-colors"
                >
                  <FileText size={12} /> Export CSV
                </button>
              </div>

              {/* Full State */}
              <div className="px-2 py-1 border-t border-slate-700 mt-1">
                <button
                  onClick={handleExportState}
                  className="w-full px-2 py-1.5 text-xs bg-sky-900/30 hover:bg-sky-900/50 border border-sky-700 rounded flex items-center justify-center gap-1 text-sky-400 transition-colors"
                >
                  <Package size={12} /> Export Full State (JSON)
                </button>
              </div>

              {/* Scene State */}
              {sceneData && (
                <>
                  <div className="px-2 py-1 border-t border-slate-700 mt-1">
                    <div className="text-xs text-slate-500 mb-1 flex items-center gap-2">
                      <Package size={12} /> Scene Export
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={handleExportScene}
                        className="flex-1 px-2 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded flex items-center justify-center gap-1 text-slate-300 transition-colors"
                      >
                        <FileJson size={12} /> JSON
                      </button>
                      <button
                        onClick={handleExportUSD}
                        className="flex-1 px-2 py-1.5 text-xs bg-purple-900/30 hover:bg-purple-900/50 border border-purple-700 rounded flex items-center justify-center gap-1 text-purple-400 transition-colors"
                        title="Export to USD format for Omniverse"
                      >
                        <Box size={12} /> USD
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

