import { useState, useEffect } from "react";
import { Camera, Sliders, Zap, Move, Target, RotateCw, Server, ServerOff, Box, User, Save, Download, Upload, Trash2, Gauge } from "lucide-react";
import { getAllPresets, savePreset, deletePreset, exportPresets, importPresets, type VisionPreset } from "../utils/visionPresets.js";
import { ControlSignalDisplay } from "./ControlSignalDisplay.js";

export type ControlScheme = "position" | "gesture" | "zone" | "relative";

export interface VisionControlConfig {
  enabled: boolean;
  scheme: ControlScheme;
  sensitivity: number; // 0-1
  smoothing: number; // 0-1, how much to smooth movements
  deadZone: number; // 0-1, center dead zone size
  gestureThreshold: number; // 0-1, confidence threshold for gestures
  maxHands: number;
  useBackend: boolean; // Use CUDA backend instead of browser
  backendUrl: string; // WebSocket URL for CUDA backend
  enableObjectDetection: boolean; // Enable YOLO object detection
  enablePoseEstimation: boolean; // Enable pose estimation
  frameRate: number; // Detection FPS (15, 30, or 60)
  presetName?: string; // Name of current preset
}

interface VisionControlPanelProps {
  config: VisionControlConfig;
  onConfigChange: (config: VisionControlConfig) => void;
  isActive: boolean;
  handsDetected: number;
  currentGesture: string | null;
  gestureConfidence?: number;
  controlSignal?: {
    direction: { x: number; y: number };
    thrust: number;
    action: "IDLE" | "BOOST" | "STABILIZE" | "TURN_LEFT" | "TURN_RIGHT" | "EVADE";
  };
  backendConnected?: boolean;
  backendError?: string | null;
}

export const VisionControlPanel = ({
  config,
  onConfigChange,
  isActive,
  handsDetected,
  currentGesture,
  gestureConfidence,
  controlSignal,
  backendConnected = false,
  backendError = null,
}: VisionControlPanelProps) => {
  const [localConfig, setLocalConfig] = useState<VisionControlConfig>(config);
  const [showPresets, setShowPresets] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [presets, setPresets] = useState<VisionPreset[]>(getAllPresets());
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importText, setImportText] = useState("");

  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  useEffect(() => {
    setPresets(getAllPresets());
  }, [showPresets]);

  const updateConfig = (updates: Partial<VisionControlConfig>) => {
    const newConfig = { ...localConfig, ...updates };
    setLocalConfig(newConfig);
    onConfigChange(newConfig);
  };

  const controlSchemes = [
    {
      id: "position" as ControlScheme,
      name: "Position Control",
      icon: <Target size={16} />,
      description: "Hand position directly controls rocket position",
    },
    {
      id: "gesture" as ControlScheme,
      name: "Gesture Commands",
      icon: <Zap size={16} />,
      description: "Use gestures to command the rocket",
    },
    {
      id: "zone" as ControlScheme,
      name: "Zone-Based",
      icon: <Move size={16} />,
      description: "Screen divided into control zones",
    },
    {
      id: "relative" as ControlScheme,
      name: "Relative Movement",
      icon: <RotateCw size={16} />,
      description: "Track hand movement between frames",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Status */}
      <div className="bg-slate-800 rounded p-3 border border-slate-700">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
            <Camera size={14} /> Vision Control Status
          </h3>
          <div
            className={`px-2 py-1 rounded text-xs font-bold ${
              isActive
                ? "bg-green-900/30 text-green-400 border border-green-700"
                : "bg-slate-700 text-slate-500 border border-slate-600"
            }`}
          >
            {isActive ? "ACTIVE" : "INACTIVE"}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs mb-2">
          <div>
            <span className="text-slate-500">Hands Detected:</span>
            <span className="text-slate-300 ml-2">{handsDetected}</span>
          </div>
          <div>
            <span className="text-slate-500">Current Gesture:</span>
            <span className="text-purple-400 ml-2">
              {currentGesture || "None"}
            </span>
          </div>
        </div>
        {config.useBackend && (
          <div className="mt-2 pt-2 border-t border-slate-700">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 flex items-center gap-2">
                {backendConnected ? <Server size={12} /> : <ServerOff size={12} />}
                CUDA Backend:
              </span>
              <span
                className={`font-bold ${
                  backendConnected
                    ? "text-green-400"
                    : backendError
                    ? "text-red-400"
                    : "text-slate-500"
                }`}
              >
                {backendConnected
                  ? "Connected"
                  : backendError
                  ? "Error"
                  : "Disconnected"}
              </span>
            </div>
            {backendError && (
              <div className="text-[10px] text-red-400 mt-1">{backendError}</div>
            )}
          </div>
        )}
      </div>

      {/* Control Scheme Selection */}
      <div className="bg-slate-800 rounded p-3 border border-slate-700">
        <h3 className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2">
          <Sliders size={14} /> Control Scheme
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {controlSchemes.map((scheme) => (
            <button
              key={scheme.id}
              onClick={() => updateConfig({ scheme: scheme.id })}
              className={`p-2 rounded border text-left transition-colors ${
                localConfig.scheme === scheme.id
                  ? "bg-purple-900/30 border-purple-700 text-purple-300"
                  : "bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                {scheme.icon}
                <span className="text-xs font-bold">{scheme.name}</span>
              </div>
              <div className="text-[10px] text-slate-500">
                {scheme.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Sensitivity Controls */}
      <div className="bg-slate-800 rounded p-3 border border-slate-700 space-y-3">
        <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
          <Sliders size={14} /> Sensitivity Settings
        </h3>

        {/* Sensitivity */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs text-slate-400">Sensitivity</label>
            <span className="text-xs text-slate-300">
              {Math.round(localConfig.sensitivity * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={localConfig.sensitivity}
            onChange={(e) =>
              updateConfig({ sensitivity: parseFloat(e.target.value) })
            }
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
          />
          <div className="flex justify-between text-[10px] text-slate-600 mt-1">
            <span>Low</span>
            <span>High</span>
          </div>
        </div>

        {/* Smoothing */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs text-slate-400">Smoothing</label>
            <span className="text-xs text-slate-300">
              {Math.round(localConfig.smoothing * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={localConfig.smoothing}
            onChange={(e) =>
              updateConfig({ smoothing: parseFloat(e.target.value) })
            }
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
          />
          <div className="flex justify-between text-[10px] text-slate-600 mt-1">
            <span>None</span>
            <span>Maximum</span>
          </div>
        </div>

        {/* Dead Zone */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs text-slate-400">Dead Zone</label>
            <span className="text-xs text-slate-300">
              {Math.round(localConfig.deadZone * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="0.5"
            step="0.01"
            value={localConfig.deadZone}
            onChange={(e) =>
              updateConfig({ deadZone: parseFloat(e.target.value) })
            }
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
          />
          <div className="flex justify-between text-[10px] text-slate-600 mt-1">
            <span>None</span>
            <span>Large</span>
          </div>
        </div>

        {/* Gesture Threshold */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs text-slate-400">Gesture Confidence Threshold</label>
            <span className="text-xs text-slate-300">
              {Math.round(localConfig.gestureThreshold * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={localConfig.gestureThreshold}
            onChange={(e) =>
              updateConfig({ gestureThreshold: parseFloat(e.target.value) })
            }
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
          />
          <div className="flex justify-between text-[10px] text-slate-600 mt-1">
            <span>Low</span>
            <span>High</span>
          </div>
        </div>

        {/* Frame Rate */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs text-slate-400 flex items-center gap-2">
              <Gauge size={12} /> Detection Frame Rate
            </label>
            <span className="text-xs text-slate-300 font-bold">
              {localConfig.frameRate || 30} FPS
            </span>
          </div>
          <div className="flex gap-2">
            {[15, 30, 60].map((fps) => (
              <button
                key={fps}
                onClick={() => updateConfig({ frameRate: fps })}
                className={`flex-1 px-2 py-1.5 text-xs rounded border transition-colors ${
                  (localConfig.frameRate || 30) === fps
                    ? "bg-purple-900/30 border-purple-700 text-purple-400"
                    : "bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600"
                }`}
              >
                {fps} FPS
              </button>
            ))}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            Lower FPS = Better performance, Higher FPS = Smoother control
          </div>
        </div>

        {/* Max Hands */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs text-slate-400">Max Hands</label>
            <span className="text-xs text-slate-300">{localConfig.maxHands}</span>
          </div>
          <input
            type="range"
            min="1"
            max="2"
            step="1"
            value={localConfig.maxHands}
            onChange={(e) =>
              updateConfig({ maxHands: parseInt(e.target.value) })
            }
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
          />
          <div className="flex justify-between text-[10px] text-slate-600 mt-1">
            <span>1</span>
            <span>2</span>
          </div>
        </div>
      </div>

      {/* Scheme-Specific Instructions */}
      <div className="bg-slate-800 rounded p-3 border border-slate-700">
        <h3 className="text-sm font-bold text-slate-300 mb-2">Instructions</h3>
        <div className="text-xs text-slate-400 space-y-1">
          {localConfig.scheme === "position" && (
            <>
              <div>• Move hand left/right to control X position</div>
              <div>• Move hand up/down to control Y position</div>
              <div>• Move closer/farther to control thrust</div>
            </>
          )}
          {localConfig.scheme === "gesture" && (
            <>
              <div>• Point Left → Turn Left</div>
              <div>• Point Right → Turn Right</div>
              <div>• Open Palm → Move Forward</div>
              <div>• Fist → Stabilize</div>
              <div>• Thumbs Up → Boost</div>
              <div>• Wave → Evasive Maneuvers</div>
            </>
          )}
          {localConfig.scheme === "zone" && (
            <>
              <div>• Place hand in top zone → Move Up</div>
              <div>• Place hand in bottom zone → Move Down</div>
              <div>• Place hand in left zone → Turn Left</div>
              <div>• Place hand in right zone → Turn Right</div>
              <div>• Center zone → Maintain Position</div>
            </>
          )}
          {localConfig.scheme === "relative" && (
            <>
              <div>• Move hand right → Accelerate Right</div>
              <div>• Move hand left → Accelerate Left</div>
              <div>• Move hand up → Accelerate Up</div>
              <div>• Move hand down → Accelerate Down</div>
              <div>• Keep hand still → Maintain Velocity</div>
            </>
          )}
        </div>
      </div>

      {/* Backend Settings */}
      <div className="bg-slate-800 rounded p-3 border border-slate-700">
        <h3 className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2">
          <Server size={14} /> CUDA Backend
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs text-slate-400">Use CUDA Backend</label>
            <button
              onClick={() => updateConfig({ useBackend: !localConfig.useBackend })}
              className={`px-3 py-1.5 text-xs rounded border transition-colors ${
                localConfig.useBackend
                  ? "bg-purple-900/30 border-purple-700 text-purple-400"
                  : "bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600"
              }`}
            >
              {localConfig.useBackend ? "Enabled" : "Disabled"}
            </button>
          </div>
          {localConfig.useBackend && (
            <>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Backend URL</label>
                <input
                  type="text"
                  value={localConfig.backendUrl}
                  onChange={(e) => updateConfig({ backendUrl: e.target.value })}
                  placeholder="ws://localhost:8766/ws/vision"
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-300 font-mono focus:outline-none focus:border-purple-700"
                />
                <div className="text-[10px] text-slate-500 mt-1">
                  WebSocket URL for CUDA vision backend
                </div>
              </div>
              
              {/* Advanced Features */}
              <div className="pt-2 border-t border-slate-700 space-y-2">
                <div className="text-xs text-slate-500 mb-2">Advanced Features:</div>
                
                <div className="flex items-center justify-between">
                  <label className="text-xs text-slate-400 flex items-center gap-2">
                    <Box size={12} /> Object Detection (YOLO)
                  </label>
                  <button
                    onClick={() => updateConfig({ enableObjectDetection: !localConfig.enableObjectDetection })}
                    className={`px-2 py-1 text-xs rounded border transition-colors ${
                      localConfig.enableObjectDetection
                        ? "bg-green-900/30 border-green-700 text-green-400"
                        : "bg-slate-900 border-slate-700 text-slate-400"
                    }`}
                  >
                    {localConfig.enableObjectDetection ? "On" : "Off"}
                  </button>
                </div>
                
                <div className="flex items-center justify-between">
                  <label className="text-xs text-slate-400 flex items-center gap-2">
                    <User size={12} /> Pose Estimation
                  </label>
                  <button
                    onClick={() => updateConfig({ enablePoseEstimation: !localConfig.enablePoseEstimation })}
                    className={`px-2 py-1 text-xs rounded border transition-colors ${
                      localConfig.enablePoseEstimation
                        ? "bg-green-900/30 border-green-700 text-green-400"
                        : "bg-slate-900 border-slate-700 text-slate-400"
                    }`}
                  >
                    {localConfig.enablePoseEstimation ? "On" : "Off"}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Control Signal Display */}
      {controlSignal && (
        <ControlSignalDisplay
          direction={controlSignal.direction}
          thrust={controlSignal.thrust}
          action={controlSignal.action}
          gestureConfidence={gestureConfidence}
        />
      )}

      {/* Preset Management */}
      <div className="bg-slate-800 rounded p-3 border border-slate-700">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
            <Save size={14} /> Presets
          </h3>
          <button
            onClick={() => setShowPresets(!showPresets)}
            className="text-xs text-slate-400 hover:text-slate-300"
          >
            {showPresets ? "Hide" : "Show"}
          </button>
        </div>

        {showPresets && (
          <div className="space-y-3">
            {/* Quick Presets */}
            <div>
              <div className="text-xs text-slate-500 mb-2">Quick Presets:</div>
              <div className="grid grid-cols-2 gap-2">
                {presets.slice(0, 4).map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => {
                      const presetConfig = { ...preset.config, presetName: preset.name };
                      updateConfig(presetConfig);
                      onConfigChange(presetConfig);
                    }}
                    className={`px-2 py-1.5 text-xs rounded border transition-colors text-left ${
                      localConfig.presetName === preset.name
                        ? "bg-purple-900/30 border-purple-700 text-purple-400"
                        : "bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600"
                    }`}
                  >
                    <div className="font-bold">{preset.name}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {preset.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Save Current Config */}
            <div className="pt-2 border-t border-slate-700">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  placeholder="Preset name..."
                  className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-purple-700"
                />
                <button
                  onClick={() => {
                    if (presetName.trim()) {
                      const newPreset: VisionPreset = {
                        name: presetName.trim(),
                        description: `Custom preset: ${localConfig.scheme} scheme`,
                        config: { ...localConfig, presetName: presetName.trim() },
                      };
                      savePreset(newPreset);
                      setPresets(getAllPresets());
                      setPresetName("");
                    }
                  }}
                  className="px-3 py-1.5 text-xs bg-purple-900/30 border border-purple-700 text-purple-400 rounded hover:bg-purple-900/50 flex items-center gap-1"
                >
                  <Save size={12} /> Save
                </button>
              </div>
            </div>

            {/* Custom Presets */}
            {presets.length > 4 && (
              <div>
                <div className="text-xs text-slate-500 mb-2">Custom Presets:</div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {presets.slice(4).map((preset) => (
                    <div
                      key={preset.name}
                      className="flex items-center justify-between p-2 bg-slate-900 rounded border border-slate-700"
                    >
                      <div className="flex-1">
                        <div className="text-xs font-bold text-slate-300">{preset.name}</div>
                        <div className="text-[10px] text-slate-500">{preset.description}</div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => {
                            const presetConfig = { ...preset.config, presetName: preset.name };
                            updateConfig(presetConfig);
                            onConfigChange(presetConfig);
                          }}
                          className="px-2 py-1 text-[10px] bg-slate-800 border border-slate-700 text-slate-400 rounded hover:border-slate-600"
                        >
                          Load
                        </button>
                        <button
                          onClick={() => {
                            deletePreset(preset.name);
                            setPresets(getAllPresets());
                          }}
                          className="px-2 py-1 text-[10px] bg-red-900/30 border border-red-700 text-red-400 rounded hover:bg-red-900/50"
                        >
                          <Trash2 size={10} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Export/Import */}
            <div className="pt-2 border-t border-slate-700 flex gap-2">
              <button
                onClick={() => {
                  const json = exportPresets();
                  const blob = new Blob([json], { type: "application/json" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "vision-presets.json";
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="flex-1 px-2 py-1.5 text-xs bg-slate-900 border border-slate-700 text-slate-400 rounded hover:border-slate-600 flex items-center justify-center gap-1"
              >
                <Download size={12} /> Export
              </button>
              <button
                onClick={() => setShowImportDialog(true)}
                className="flex-1 px-2 py-1.5 text-xs bg-slate-900 border border-slate-700 text-slate-400 rounded hover:border-slate-600 flex items-center justify-center gap-1"
              >
                <Upload size={12} /> Import
              </button>
            </div>

            {/* Import Dialog */}
            {showImportDialog && (
              <div className="pt-2 border-t border-slate-700">
                <div className="text-xs text-slate-400 mb-2">Import Presets (JSON):</div>
                <textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder="Paste preset JSON here..."
                  className="w-full h-24 bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-300 font-mono focus:outline-none focus:border-purple-700"
                />
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => {
                      try {
                        importPresets(importText);
                        setPresets(getAllPresets());
                        setImportText("");
                        setShowImportDialog(false);
                      } catch (error) {
                        alert(`Import failed: ${error}`);
                      }
                    }}
                    className="flex-1 px-2 py-1.5 text-xs bg-green-900/30 border border-green-700 text-green-400 rounded hover:bg-green-900/50"
                  >
                    Import
                  </button>
                  <button
                    onClick={() => {
                      setShowImportDialog(false);
                      setImportText("");
                    }}
                    className="flex-1 px-2 py-1.5 text-xs bg-slate-900 border border-slate-700 text-slate-400 rounded hover:border-slate-600"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

