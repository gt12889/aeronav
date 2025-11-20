import { useState, useEffect } from "react";
import {
  Waves,
  Sliders,
  Play,
  Pause,
  RotateCcw,
  Download,
  Upload,
  Zap,
  Volume2,
  Filter,
  TrendingUp,
  Shuffle,
} from "lucide-react";
import type { AudioData } from "../types/index.js";
import {
  defaultAugmentationConfig,
  type AugmentationConfig,
  applyAugmentations,
  exportAugmentationConfig,
  importAugmentationConfig,
} from "../utils/audioAugmentation.js";

interface AugmentationPanelProps {
  originalAudioData: AudioData;
  onAugmentedDataChange?: (data: AudioData) => void;
  isActive: boolean;
}

export const AugmentationPanel = ({
  originalAudioData,
  onAugmentedDataChange,
  isActive,
}: AugmentationPanelProps) => {
  const [config, setConfig] = useState<AugmentationConfig>(defaultAugmentationConfig);
  const [isPreviewActive, setIsPreviewActive] = useState(false);
  const [previousData, setPreviousData] = useState<AudioData | undefined>(undefined);
  const [augmentedData, setAugmentedData] = useState<AudioData>(originalAudioData);

  // Apply augmentations when config or original data changes
  useEffect(() => {
    if (isPreviewActive || isActive) {
      const augmented = applyAugmentations(originalAudioData, config, previousData);
      setAugmentedData(augmented);
      setPreviousData(originalAudioData);
      onAugmentedDataChange?.(augmented);
    } else {
      setAugmentedData(originalAudioData);
      onAugmentedDataChange?.(originalAudioData);
    }
  }, [originalAudioData, config, isPreviewActive, isActive, previousData, onAugmentedDataChange]);

  const updateConfig = <K extends keyof AugmentationConfig>(
    section: K,
    updates: Partial<AugmentationConfig[K]>
  ) => {
    setConfig((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        ...updates,
      },
    }));
  };

  const resetConfig = () => {
    setConfig(defaultAugmentationConfig);
  };

  const handleExport = () => {
    const blob = new Blob([exportAugmentationConfig(config)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `augmentation-config-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const content = event.target?.result as string;
          const imported = importAugmentationConfig(content);
          if (imported) {
            setConfig(imported);
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  return (
    <div className="h-full flex flex-col bg-[#0B1120] overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-900">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Waves className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-bold text-purple-400">Data Augmentation</h2>
            <span className={`px-2 py-0.5 text-xs rounded ${
              isPreviewActive || isActive
                ? "bg-purple-900/30 text-purple-400 border border-purple-700 animate-pulse"
                : "bg-slate-800 text-slate-500 border border-slate-700"
            }`}>
              {isPreviewActive || isActive ? "ACTIVE" : "INACTIVE"}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setIsPreviewActive(!isPreviewActive)}
              className={`px-3 py-1 text-xs border rounded flex items-center gap-2 ${
                isPreviewActive
                  ? "bg-purple-900/30 border-purple-700 text-purple-400"
                  : "bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-300"
              }`}
            >
              {isPreviewActive ? <Pause size={12} /> : <Play size={12} />}
              {isPreviewActive ? "Stop Preview" : "Preview"}
            </button>
            <button
              onClick={resetConfig}
              className="px-3 py-1 text-xs bg-slate-800 border border-slate-700 text-slate-400 rounded hover:bg-slate-700 flex items-center gap-2"
            >
              <RotateCcw size={12} /> Reset
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="px-2 py-1 text-xs bg-purple-900/30 border border-purple-700 text-purple-400 rounded hover:bg-purple-900/50 flex items-center gap-1"
          >
            <Download size={12} /> Export Config
          </button>
          <button
            onClick={handleImport}
            className="px-2 py-1 text-xs bg-purple-900/30 border border-purple-700 text-purple-400 rounded hover:bg-purple-900/50 flex items-center gap-1"
          >
            <Upload size={12} /> Import Config
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Noise Augmentation */}
        <div className="bg-slate-900 rounded p-4 border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
              <Shuffle size={14} /> Noise Injection
            </h3>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.noise.enabled}
                onChange={(e) => updateConfig("noise", { enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>
          {config.noise.enabled && (
            <div className="space-y-3 mt-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Intensity: {config.noise.intensity.toFixed(2)}
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={config.noise.intensity}
                  onChange={(e) => updateConfig("noise", { intensity: parseFloat(e.target.value) })}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Noise Type</label>
                <select
                  value={config.noise.type}
                  onChange={(e) => updateConfig("noise", { type: e.target.value as any })}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-300"
                >
                  <option value="white">White Noise</option>
                  <option value="pink">Pink Noise (1/f)</option>
                  <option value="brown">Brown Noise (1/f²)</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Frequency Shift */}
        <div className="bg-slate-900 rounded p-4 border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
              <TrendingUp size={14} /> Frequency Shift
            </h3>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.frequencyShift.enabled}
                onChange={(e) => updateConfig("frequencyShift", { enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>
          {config.frequencyShift.enabled && (
            <div className="space-y-3 mt-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Amount: {config.frequencyShift.amount} Hz
                </label>
                <input
                  type="range"
                  min="0"
                  max="500"
                  step="10"
                  value={config.frequencyShift.amount}
                  onChange={(e) => updateConfig("frequencyShift", { amount: parseInt(e.target.value) })}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Direction</label>
                <select
                  value={config.frequencyShift.direction}
                  onChange={(e) => updateConfig("frequencyShift", { direction: e.target.value as any })}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-300"
                >
                  <option value="up">Up</option>
                  <option value="down">Down</option>
                  <option value="both">Both (Random)</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Time Warping */}
        <div className="bg-slate-900 rounded p-4 border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
              <Zap size={14} /> Time Warping
            </h3>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.timeWarp.enabled}
                onChange={(e) => updateConfig("timeWarp", { enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>
          {config.timeWarp.enabled && (
            <div className="mt-3">
              <label className="block text-xs text-slate-400 mb-1">
                Speed Factor: {config.timeWarp.factor.toFixed(2)}x
              </label>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={config.timeWarp.factor}
                onChange={(e) => updateConfig("timeWarp", { factor: parseFloat(e.target.value) })}
                className="w-full"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>0.5x (Slow)</span>
                <span>1.0x (Normal)</span>
                <span>2.0x (Fast)</span>
              </div>
            </div>
          )}
        </div>

        {/* Gain */}
        <div className="bg-slate-900 rounded p-4 border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
              <Volume2 size={14} /> Gain Adjustment
            </h3>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.gain.enabled}
                onChange={(e) => updateConfig("gain", { enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>
          {config.gain.enabled && (
            <div className="mt-3">
              <label className="block text-xs text-slate-400 mb-1">
                Multiplier: {config.gain.multiplier.toFixed(2)}x
              </label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={config.gain.multiplier}
                onChange={(e) => updateConfig("gain", { multiplier: parseFloat(e.target.value) })}
                className="w-full"
              />
            </div>
          )}
        </div>

        {/* Filtering */}
        <div className="bg-slate-900 rounded p-4 border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
              <Filter size={14} /> Frequency Filtering
            </h3>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.filtering.enabled}
                onChange={(e) => updateConfig("filtering", { enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>
          {config.filtering.enabled && (
            <div className="space-y-3 mt-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Filter Type</label>
                <select
                  value={config.filtering.type}
                  onChange={(e) => updateConfig("filtering", { type: e.target.value as any })}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-300"
                >
                  <option value="lowpass">Low Pass</option>
                  <option value="highpass">High Pass</option>
                  <option value="bandpass">Band Pass</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Cutoff: {config.filtering.cutoff} Hz
                </label>
                <input
                  type="range"
                  min="100"
                  max="5000"
                  step="50"
                  value={config.filtering.cutoff}
                  onChange={(e) => updateConfig("filtering", { cutoff: parseInt(e.target.value) })}
                  className="w-full"
                />
              </div>
            </div>
          )}
        </div>

        {/* Comparison */}
        <div className="bg-slate-900 rounded p-4 border border-slate-800">
          <h3 className="text-sm font-bold text-slate-300 mb-3">Original vs Augmented</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-slate-500 mb-2">Original</div>
              <div className="space-y-1 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400">Bass:</span>
                  <span className="text-purple-400">{(originalAudioData.bass * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Mid:</span>
                  <span className="text-sky-400">{(originalAudioData.mid * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Treble:</span>
                  <span className="text-emerald-400">{(originalAudioData.treble * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Volume:</span>
                  <span className="text-slate-300">{(originalAudioData.volume * 100).toFixed(1)}%</span>
                </div>
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-2">Augmented</div>
              <div className="space-y-1 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400">Bass:</span>
                  <span className="text-purple-400">{(augmentedData.bass * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Mid:</span>
                  <span className="text-sky-400">{(augmentedData.mid * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Treble:</span>
                  <span className="text-emerald-400">{(augmentedData.treble * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Volume:</span>
                  <span className="text-slate-300">{(augmentedData.volume * 100).toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

