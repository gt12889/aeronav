// Audio data augmentation utilities for synthetic data generation

import type { AudioData } from "../types/index.js";

export interface AugmentationConfig {
  noise: {
    enabled: boolean;
    intensity: number; // 0-1
    type: "white" | "pink" | "brown";
  };
  frequencyShift: {
    enabled: boolean;
    amount: number; // Hz offset
    direction: "up" | "down" | "both";
  };
  timeWarp: {
    enabled: boolean;
    factor: number; // 0.5-2.0 (speed multiplier)
  };
  gain: {
    enabled: boolean;
    multiplier: number; // 0-2
  };
  filtering: {
    enabled: boolean;
    type: "lowpass" | "highpass" | "bandpass";
    cutoff: number; // Hz
  };
}

export const defaultAugmentationConfig: AugmentationConfig = {
  noise: {
    enabled: false,
    intensity: 0.1,
    type: "white",
  },
  frequencyShift: {
    enabled: false,
    amount: 50,
    direction: "both",
  },
  timeWarp: {
    enabled: false,
    factor: 1.0,
  },
  gain: {
    enabled: false,
    multiplier: 1.0,
  },
  filtering: {
    enabled: false,
    type: "lowpass",
    cutoff: 1000,
  },
};

/**
 * Generate white noise
 */
const generateWhiteNoise = (length: number, intensity: number): Float32Array => {
  const noise = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    noise[i] = (Math.random() * 2 - 1) * intensity;
  }
  return noise;
};

/**
 * Generate pink noise (1/f noise)
 */
const generatePinkNoise = (length: number, intensity: number): Float32Array => {
  const noise = new Float32Array(length);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  
  for (let i = 0; i < length; i++) {
    const white = (Math.random() * 2 - 1) * intensity;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.96900 * b2 + white * 0.1538520;
    b3 = 0.86650 * b3 + white * 0.3104856;
    b4 = 0.55000 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.0168980;
    noise[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
    noise[i] *= 0.11;
    b6 = white * 0.115926;
  }
  
  return noise;
};

/**
 * Generate brown noise (1/f^2 noise)
 */
const generateBrownNoise = (length: number, intensity: number): Float32Array => {
  const noise = new Float32Array(length);
  let lastValue = 0;
  
  for (let i = 0; i < length; i++) {
    const white = (Math.random() * 2 - 1) * intensity;
    lastValue = (lastValue + white * 0.02) * 0.98;
    noise[i] = lastValue;
  }
  
  return noise;
};

/**
 * Apply noise augmentation to audio data
 */
export const applyNoise = (
  audioData: AudioData,
  config: AugmentationConfig["noise"]
): AudioData => {
  if (!config.enabled) return audioData;

  const noiseIntensity = config.intensity;
  let noiseMultiplier = 1;

  switch (config.type) {
    case "white":
      noiseMultiplier = 1.0;
      break;
    case "pink":
      noiseMultiplier = 0.8; // Pink noise is typically quieter
      break;
    case "brown":
      noiseMultiplier = 0.6; // Brown noise is typically quieter
      break;
  }

  const noise = noiseIntensity * noiseMultiplier;

  return {
    bass: Math.max(0, Math.min(1, audioData.bass + (Math.random() - 0.5) * noise)),
    mid: Math.max(0, Math.min(1, audioData.mid + (Math.random() - 0.5) * noise)),
    treble: Math.max(0, Math.min(1, audioData.treble + (Math.random() - 0.5) * noise)),
    volume: Math.max(0, Math.min(1, audioData.volume + (Math.random() - 0.5) * noise)),
  };
};

/**
 * Apply frequency shift augmentation
 */
export const applyFrequencyShift = (
  audioData: AudioData,
  config: AugmentationConfig["frequencyShift"]
): AudioData => {
  if (!config.enabled) return audioData;

  // Simulate frequency shift by redistributing energy between bands
  const shift = config.amount / 1000; // Normalize to 0-1 range
  let shiftAmount = shift;

  if (config.direction === "down") {
    shiftAmount = -shift;
  } else if (config.direction === "both") {
    shiftAmount = (Math.random() > 0.5 ? 1 : -1) * shift;
  }

  // Shift energy from one band to another
  const energyShift = Math.abs(shiftAmount) * 0.1;

  return {
    bass: Math.max(0, Math.min(1, audioData.bass + (shiftAmount < 0 ? energyShift : -energyShift))),
    mid: Math.max(0, Math.min(1, audioData.mid + shiftAmount * energyShift)),
    treble: Math.max(0, Math.min(1, audioData.treble + (shiftAmount > 0 ? energyShift : -energyShift))),
    volume: audioData.volume,
  };
};

/**
 * Apply time warping (speed variation)
 */
export const applyTimeWarp = (
  audioData: AudioData,
  config: AugmentationConfig["timeWarp"],
  previousData?: AudioData
): AudioData => {
  if (!config.enabled || config.factor === 1.0) return audioData;

  // Time warping affects the rate of change
  // Faster = more variation, slower = less variation
  if (previousData) {
    const deltaBass = audioData.bass - previousData.bass;
    const deltaMid = audioData.mid - previousData.mid;
    const deltaTreble = audioData.treble - previousData.treble;
    const deltaVolume = audioData.volume - previousData.volume;

    return {
      bass: Math.max(0, Math.min(1, previousData.bass + deltaBass * config.factor)),
      mid: Math.max(0, Math.min(1, previousData.mid + deltaMid * config.factor)),
      treble: Math.max(0, Math.min(1, previousData.treble + deltaTreble * config.factor)),
      volume: Math.max(0, Math.min(1, previousData.volume + deltaVolume * config.factor)),
    };
  }

  return audioData;
};

/**
 * Apply gain augmentation
 */
export const applyGain = (
  audioData: AudioData,
  config: AugmentationConfig["gain"]
): AudioData => {
  if (!config.enabled || config.multiplier === 1.0) return audioData;

  return {
    bass: Math.max(0, Math.min(1, audioData.bass * config.multiplier)),
    mid: Math.max(0, Math.min(1, audioData.mid * config.multiplier)),
    treble: Math.max(0, Math.min(1, audioData.treble * config.multiplier)),
    volume: Math.max(0, Math.min(1, audioData.volume * config.multiplier)),
  };
};

/**
 * Apply filtering augmentation
 */
export const applyFiltering = (
  audioData: AudioData,
  config: AugmentationConfig["filtering"]
): AudioData => {
  if (!config.enabled) return audioData;

  // Simulate filtering by attenuating certain frequency bands
  const cutoff = config.cutoff;
  const bassCutoff = 200; // Approximate bass range
  const midCutoff = 2000; // Approximate mid range

  let result = { ...audioData };

  switch (config.type) {
    case "lowpass":
      // Attenuate frequencies above cutoff
      if (cutoff < midCutoff) {
        result.mid *= 0.5;
        result.treble *= 0.2;
      }
      if (cutoff < bassCutoff) {
        result.bass *= 0.5;
      }
      break;
    case "highpass":
      // Attenuate frequencies below cutoff
      if (cutoff > bassCutoff) {
        result.bass *= 0.5;
      }
      if (cutoff > midCutoff) {
        result.mid *= 0.5;
        result.bass *= 0.2;
      }
      break;
    case "bandpass":
      // Attenuate frequencies outside the band
      const center = cutoff;
      const bandwidth = center * 0.5;
      const lowFreq = center - bandwidth;
      const highFreq = center + bandwidth;

      if (lowFreq > bassCutoff) result.bass *= 0.3;
      if (highFreq < midCutoff) result.mid *= 0.3;
      if (lowFreq > midCutoff) result.treble *= 0.3;
      break;
  }

  return result;
};

/**
 * Apply all augmentations to audio data
 */
export const applyAugmentations = (
  audioData: AudioData,
  config: AugmentationConfig,
  previousData?: AudioData
): AudioData => {
  let augmented = { ...audioData };

  // Apply augmentations in order
  augmented = applyNoise(augmented, config.noise);
  augmented = applyFrequencyShift(augmented, config.frequencyShift);
  augmented = applyGain(augmented, config.gain);
  augmented = applyFiltering(augmented, config.filtering);
  augmented = applyTimeWarp(augmented, config.timeWarp, previousData);

  return augmented;
};

/**
 * Generate synthetic audio data for training
 */
export const generateSyntheticAudio = (
  baseData: AudioData,
  config: AugmentationConfig
): AudioData => {
  // Start with base data and apply augmentations
  return applyAugmentations(baseData, config);
};

/**
 * Export augmentation config
 */
export const exportAugmentationConfig = (config: AugmentationConfig): string => {
  return JSON.stringify(config, null, 2);
};

/**
 * Import augmentation config
 */
export const importAugmentationConfig = (configJson: string): AugmentationConfig | null => {
  try {
    const imported = JSON.parse(configJson);
    return { ...defaultAugmentationConfig, ...imported };
  } catch (e) {
    console.error("Failed to import augmentation config:", e);
    return null;
  }
};

