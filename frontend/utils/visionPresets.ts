// Vision control preset configurations

import type { VisionControlConfig } from "../components/VisionControlPanel.js";

export interface VisionPreset {
  name: string;
  description: string;
  config: VisionControlConfig;
}

export const defaultPresets: VisionPreset[] = [
  {
    name: "Precise",
    description: "High accuracy, lower sensitivity for fine control",
    config: {
      enabled: true,
      scheme: "position",
      sensitivity: 0.5,
      smoothing: 0.5,
      deadZone: 0.15,
      gestureThreshold: 0.8,
      maxHands: 1,
      useBackend: false,
      backendUrl: "ws://localhost:8766/ws/vision",
      enableObjectDetection: false,
      enablePoseEstimation: false,
      frameRate: 30,
      presetName: "Precise",
    },
  },
  {
    name: "Responsive",
    description: "High sensitivity, quick response for fast movements",
    config: {
      enabled: true,
      scheme: "gesture",
      sensitivity: 0.9,
      smoothing: 0.2,
      deadZone: 0.05,
      gestureThreshold: 0.6,
      maxHands: 1,
      useBackend: false,
      backendUrl: "ws://localhost:8766/ws/vision",
      enableObjectDetection: false,
      enablePoseEstimation: false,
      frameRate: 60,
      presetName: "Responsive",
    },
  },
  {
    name: "Smooth",
    description: "High smoothing for stable, fluid control",
    config: {
      enabled: true,
      scheme: "position",
      sensitivity: 0.7,
      smoothing: 0.8,
      deadZone: 0.1,
      gestureThreshold: 0.7,
      maxHands: 1,
      useBackend: false,
      backendUrl: "ws://localhost:8766/ws/vision",
      enableObjectDetection: false,
      enablePoseEstimation: false,
      frameRate: 30,
      presetName: "Smooth",
    },
  },
  {
    name: "Zone Control",
    description: "Zone-based control for discrete actions",
    config: {
      enabled: true,
      scheme: "zone",
      sensitivity: 0.7,
      smoothing: 0.3,
      deadZone: 0.1,
      gestureThreshold: 0.6,
      maxHands: 1,
      useBackend: false,
      backendUrl: "ws://localhost:8766/ws/vision",
      enableObjectDetection: false,
      enablePoseEstimation: false,
      frameRate: 30,
      presetName: "Zone Control",
    },
  },
  {
    name: "High Performance",
    description: "CUDA backend with advanced features",
    config: {
      enabled: true,
      scheme: "gesture",
      sensitivity: 0.7,
      smoothing: 0.3,
      deadZone: 0.1,
      gestureThreshold: 0.6,
      maxHands: 2,
      useBackend: true,
      backendUrl: "ws://localhost:8766/ws/vision",
      enableObjectDetection: true,
      enablePoseEstimation: true,
      frameRate: 60,
      presetName: "High Performance",
    },
  },
];

const PRESETS_STORAGE_KEY = "aeronav_vision_presets";

export const savePreset = (preset: VisionPreset): void => {
  try {
    const customPresets = loadCustomPresets();
    const existingIndex = customPresets.findIndex((p) => p.name === preset.name);
    
    if (existingIndex >= 0) {
      customPresets[existingIndex] = preset;
    } else {
      customPresets.push(preset);
    }
    
    localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(customPresets));
  } catch (error) {
    console.error("Failed to save preset:", error);
  }
};

export const loadCustomPresets = (): VisionPreset[] => {
  try {
    const stored = localStorage.getItem(PRESETS_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error("Failed to load presets:", error);
  }
  return [];
};

export const getAllPresets = (): VisionPreset[] => {
  return [...defaultPresets, ...loadCustomPresets()];
};

export const deletePreset = (name: string): void => {
  try {
    const customPresets = loadCustomPresets();
    const filtered = customPresets.filter((p) => p.name !== name);
    localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error("Failed to delete preset:", error);
  }
};

export const exportPresets = (): string => {
  const presets = getAllPresets();
  return JSON.stringify(presets, null, 2);
};

export const importPresets = (json: string): VisionPreset[] => {
  try {
    const presets = JSON.parse(json) as VisionPreset[];
    // Validate structure
    if (Array.isArray(presets) && presets.every((p) => p.name && p.config)) {
      // Save imported presets (merge with existing)
      const customPresets = loadCustomPresets();
      const merged = [...customPresets];
      
      presets.forEach((preset) => {
        const existingIndex = merged.findIndex((p) => p.name === preset.name);
        if (existingIndex >= 0) {
          merged[existingIndex] = preset;
        } else {
          merged.push(preset);
        }
      });
      
      localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(merged));
      return merged;
    }
    throw new Error("Invalid preset format");
  } catch (error) {
    console.error("Failed to import presets:", error);
    throw error;
  }
};

