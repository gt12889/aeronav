// Web Worker for audio frequency analysis
// Processes FFT data to calculate bass, mid, treble, and volume

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

type WorkerMessage = ProcessAudioMessage;

self.onmessage = (e: MessageEvent<WorkerMessage>) => {
  const { type, data, bufferLength } = e.data;

  if (type === "PROCESS_AUDIO") {
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

    const result: AudioAnalysisResult = {
      bass,
      mid,
      treble,
      volume,
    };

    // Send result back to main thread
    self.postMessage({ type: "ANALYSIS_RESULT", result });
  }
};

// Export empty object to make this a module (required for ES modules in workers)
export {};

