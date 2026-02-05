// Web Worker for audio frequency analysis
// Processes FFT data to calculate bass, mid, treble, and volume
// Supports WASM acceleration with JS fallback

export interface AudioAnalysisResult {
  bass: number;
  mid: number;
  treble: number;
  volume: number;
}

interface ProcessAudioMessage {
  type: "PROCESS_AUDIO";
  data: Uint8Array;
  bufferLength: number;
}

interface InitWasmMessage {
  type: "INIT_WASM";
}

type WorkerMessage = ProcessAudioMessage | InitWasmMessage;

// WASM module state
let wasmModule: any = null;
let wasmAnalyzer: any = null;
let wasmInitPromise: Promise<boolean> | null = null;
let useWasm = false;

// Performance tracking
let processCount = 0;
let totalJsTime = 0;
let totalWasmTime = 0;

/**
 * Initialize WASM audio module
 */
async function initWasm(): Promise<boolean> {
  if (wasmInitPromise) {
    return wasmInitPromise;
  }

  wasmInitPromise = (async () => {
    try {
      // Import the WASM module
      // @ts-ignore - Dynamic import in worker
      const createModule = await import('/wasm/audio_fft.js');
      wasmModule = await createModule.default();
      wasmAnalyzer = new wasmModule.AudioAnalyzer();
      useWasm = true;
      console.log('[AudioWorker] WASM module loaded successfully');
      return true;
    } catch (error) {
      console.warn('[AudioWorker] WASM unavailable, using JS fallback:', error);
      useWasm = false;
      return false;
    }
  })();

  return wasmInitPromise;
}

/**
 * Analyze frequencies using JavaScript (fallback)
 */
function analyzeFrequenciesJS(data: Uint8Array, bufferLength: number): AudioAnalysisResult {
  const startTime = performance.now();

  // Split into frequency bands
  const bassEnd = Math.floor(bufferLength * 0.1); // 0-10%
  const midEnd = Math.floor(bufferLength * 0.4); // 10-40%

  let bassSum = 0;
  let midSum = 0;
  let trebleSum = 0;

  // Process frequency data
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

  // Calculate averages
  const bass = bassEnd > 0 ? bassSum / bassEnd : 0;
  const mid = (midEnd - bassEnd) > 0 ? midSum / (midEnd - bassEnd) : 0;
  const treble = (bufferLength - midEnd) > 0 ? trebleSum / (bufferLength - midEnd) : 0;
  const volume = data.reduce((a, b) => a + b, 0) / bufferLength / 255;

  const endTime = performance.now();
  totalJsTime += (endTime - startTime);

  return { bass, mid, treble, volume };
}

/**
 * Analyze frequencies using WASM (fast path)
 */
function analyzeFrequenciesWASM(data: Uint8Array): AudioAnalysisResult {
  const startTime = performance.now();

  const result = wasmAnalyzer.analyzeUint8(data);

  const endTime = performance.now();
  totalWasmTime += (endTime - startTime);

  return {
    bass: result.bass,
    mid: result.mid,
    treble: result.treble,
    volume: result.volume,
  };
}

/**
 * Log performance comparison every 100 frames
 */
function logPerformance() {
  processCount++;
  if (processCount % 100 === 0) {
    const avgJsTime = totalJsTime / Math.max(1, processCount);
    const avgWasmTime = totalWasmTime / Math.max(1, processCount);

    if (useWasm && totalWasmTime > 0) {
      const speedup = avgJsTime / avgWasmTime;
      console.log(`[AudioWorker] Performance (${processCount} frames): WASM ${avgWasmTime.toFixed(3)}ms avg, ${speedup.toFixed(1)}x faster than JS`);
    } else if (!useWasm) {
      console.log(`[AudioWorker] Performance (${processCount} frames): JS ${avgJsTime.toFixed(3)}ms avg`);
    }
  }
}

// Try to initialize WASM on worker start
initWasm();

self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
  const { type } = e.data;

  if (type === "INIT_WASM") {
    const success = await initWasm();
    self.postMessage({
      type: "WASM_INIT_RESULT",
      success,
      backend: success ? 'wasm' : 'js'
    });
    return;
  }

  if (type === "PROCESS_AUDIO") {
    const { data, bufferLength } = e.data;

    let result: AudioAnalysisResult;

    if (useWasm && wasmAnalyzer) {
      result = analyzeFrequenciesWASM(data);
    } else {
      result = analyzeFrequenciesJS(data, bufferLength);
    }

    logPerformance();

    // Send result back to main thread
    self.postMessage({
      type: "ANALYSIS_RESULT",
      result,
      backend: useWasm ? 'wasm' : 'js'
    });
  }
};

// Export empty object to make this a module (required for ES modules in workers)
export {};
