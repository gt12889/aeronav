// WASM Audio Processor wrapper for Aeronav
// SIMD-accelerated frequency analysis

import type { AudioAnalysisResult } from '../workers/audioProcessor.worker';

// Re-export for convenience
export type { AudioAnalysisResult };

// WASM module interface (matches embind exports)
interface WasmAudioModule {
  AudioAnalyzer: {
    new (): WasmAudioAnalyzerInstance;
  };
  analyzeFrequencies(data: Uint8Array): WasmAudioResult;
}

interface WasmAudioResult {
  bass: number;
  mid: number;
  treble: number;
  volume: number;
}

interface WasmAudioAnalyzerInstance {
  analyzeUint8(data: Uint8Array): WasmAudioResult;
  analyzeFloat32(data: Float32Array, normalized: boolean): WasmAudioResult;
  setBassRange(endPercent: number): void;
  setMidRange(endPercent: number): void;
  delete(): void;
}

// Global module cache
let wasmModule: WasmAudioModule | null = null;
let loadPromise: Promise<WasmAudioModule> | null = null;

/**
 * Load the WASM audio module
 * Returns cached module if already loaded
 */
export async function loadWasmAudio(): Promise<WasmAudioModule> {
  if (wasmModule) {
    return wasmModule;
  }

  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = (async () => {
    try {
      // Dynamic import of the WASM module
      // The module is expected to be at /wasm/audio_fft.js
      const createModule = await import('/wasm/audio_fft.js');
      wasmModule = await createModule.default();
      console.log('[WasmAudio] Module loaded successfully');
      return wasmModule!;
    } catch (error) {
      console.error('[WasmAudio] Failed to load module:', error);
      loadPromise = null;
      throw error;
    }
  })();

  return loadPromise;
}

/**
 * Check if WASM audio is available
 */
export function isWasmAudioAvailable(): boolean {
  return wasmModule !== null;
}

/**
 * Quick analyze function (creates analyzer on each call)
 * Use WasmAudioAnalyzer class for repeated analysis
 */
export function analyzeFrequenciesWasm(data: Uint8Array): AudioAnalysisResult | null {
  if (!wasmModule) {
    return null;
  }

  try {
    const result = wasmModule.analyzeFrequencies(data);
    return {
      bass: result.bass,
      mid: result.mid,
      treble: result.treble,
      volume: result.volume,
    };
  } catch (error) {
    console.error('[WasmAudio] Analysis failed:', error);
    return null;
  }
}

/**
 * WASM-backed audio analyzer class
 * Reusable instance for repeated analysis (more efficient)
 */
export class WasmAudioAnalyzer {
  private analyzer: WasmAudioAnalyzerInstance;

  constructor() {
    if (!wasmModule) {
      throw new Error('WASM module not loaded. Call loadWasmAudio() first.');
    }
    this.analyzer = new wasmModule.AudioAnalyzer();
  }

  /**
   * Analyze Uint8Array frequency data (from getByteFrequencyData)
   */
  analyzeUint8(data: Uint8Array): AudioAnalysisResult {
    const result = this.analyzer.analyzeUint8(data);
    return {
      bass: result.bass,
      mid: result.mid,
      treble: result.treble,
      volume: result.volume,
    };
  }

  /**
   * Analyze Float32Array frequency data
   * @param normalized If true, expects 0-1 range; if false, expects -1 to 1
   */
  analyzeFloat32(data: Float32Array, normalized: boolean = true): AudioAnalysisResult {
    const result = this.analyzer.analyzeFloat32(data, normalized);
    return {
      bass: result.bass,
      mid: result.mid,
      treble: result.treble,
      volume: result.volume,
    };
  }

  /**
   * Configure bass frequency range (0-1)
   * Default is 0.1 (0-10% of frequency bins)
   */
  setBassRange(endPercent: number): void {
    this.analyzer.setBassRange(endPercent);
  }

  /**
   * Configure mid frequency range end (0-1)
   * Default is 0.4 (10-40% of frequency bins, treble is 40-100%)
   */
  setMidRange(endPercent: number): void {
    this.analyzer.setMidRange(endPercent);
  }

  /**
   * Cleanup WASM resources
   */
  dispose(): void {
    this.analyzer.delete();
  }
}

/**
 * Create audio analyzer, trying WASM first
 * Returns null if WASM unavailable (caller should use JS fallback)
 */
export async function createAudioAnalyzer(): Promise<WasmAudioAnalyzer | null> {
  try {
    await loadWasmAudio();
    return new WasmAudioAnalyzer();
  } catch (error) {
    console.warn('[WasmAudio] WASM unavailable, using JS fallback');
    return null;
  }
}

/**
 * Analyze frequencies with automatic WASM/JS selection
 * Falls back to JS implementation if WASM unavailable
 */
export function analyzeFrequenciesAuto(
  data: Uint8Array,
  bufferLength: number
): AudioAnalysisResult {
  // Try WASM first
  if (wasmModule) {
    const result = analyzeFrequenciesWasm(data);
    if (result) return result;
  }

  // JS fallback (matching original worker implementation)
  const bassEnd = Math.floor(bufferLength * 0.1);
  const midEnd = Math.floor(bufferLength * 0.4);

  let bassSum = 0;
  let midSum = 0;
  let trebleSum = 0;

  for (let i = 0; i < bufferLength; i++) {
    const val = data[i] / 255;
    if (i < bassEnd) {
      bassSum += val;
    } else if (i < midEnd) {
      midSum += val;
    } else {
      trebleSum += val;
    }
  }

  const bass = bassEnd > 0 ? bassSum / bassEnd : 0;
  const mid = (midEnd - bassEnd) > 0 ? midSum / (midEnd - bassEnd) : 0;
  const treble = (bufferLength - midEnd) > 0 ? trebleSum / (bufferLength - midEnd) : 0;

  let volumeSum = 0;
  for (let i = 0; i < bufferLength; i++) {
    volumeSum += data[i];
  }
  const volume = volumeSum / bufferLength / 255;

  return { bass, mid, treble, volume };
}
