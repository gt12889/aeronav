import { useState, useEffect, useRef, useCallback } from "react";
import type { AudioData } from "../types/index.js";
import { FFT_SIZE } from "../constants/proto.js";

// Worker type for audio processing
type AudioWorker = Worker & {
  postMessage(message: { type: "PROCESS_AUDIO"; data: Uint8Array; bufferLength: number }, transfer?: Transferable[]): void;
};

export const useAudioAnalyzer = (isActive: boolean, isTraining: boolean) => {
  const [audioData, setAudioData] = useState<AudioData>({
    bass: 0,
    mid: 0,
    treble: 0,
    volume: 0,
  });
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const requestRef = useRef<number | null>(null);
  const workerRef = useRef<AudioWorker | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);

  // Demo mode oscillator if mic fails or denied
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);

  // Initialize Web Worker
  useEffect(() => {
    try {
      // Create worker with proper path handling for ES modules
      const worker = new Worker(
        new URL("../workers/audioProcessor.worker.ts", import.meta.url),
        { type: "module" }
      ) as AudioWorker;

      worker.onmessage = (e: MessageEvent<{ type: "ANALYSIS_RESULT"; result: AudioData }>) => {
        if (e.data.type === "ANALYSIS_RESULT") {
          setAudioData(e.data.result);
        }
      };

      worker.onerror = (error) => {
        console.error("Audio worker error:", error);
        // Worker failed, will fallback to main thread processing
        workerRef.current = null;
      };

      workerRef.current = worker;

      return () => {
        worker.terminate();
        workerRef.current = null;
      };
    } catch (error) {
      console.warn("Failed to create audio worker, using main thread fallback:", error);
      workerRef.current = null;
    }
  }, []);

  const startAudio = async (useMic: boolean) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
    }

    const ctx = audioContextRef.current;
    const analyser = ctx.createAnalyser();
    analyser.fftSize = FFT_SIZE;
    analyserRef.current = analyser;

    // Pre-allocate data array for frequency data
    const bufferLength = analyser.frequencyBinCount;
    dataArrayRef.current = new Uint8Array(bufferLength);

    try {
      if (useMic && !isTraining) {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        const source = ctx.createMediaStreamSource(stream);
        source.connect(analyser);
        sourceRef.current = source;
      } else {
        // Demo/Training Mode: Create a fake signal
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = isTraining ? "square" : "sawtooth"; // Square wave for "digital/synthetic" feel
        osc.frequency.value = isTraining ? 800 : 100;
        osc.connect(gain);
        gain.gain.value = 0.1;
        gain.connect(analyser);
        osc.start();

        // Modulate oscillator
        const modulationInterval = setInterval(() => {
          if (osc.frequency) osc.frequency.setValueAtTime((isTraining ? 200 : 100) + Math.random() * 400, ctx.currentTime);
          if (gain.gain) gain.gain.setTargetAtTime(Math.random() * (isTraining ? 0.8 : 0.5), ctx.currentTime, 0.1);
        }, isTraining ? 100 : 500); // Faster modulation in training

        // Store interval ID for cleanup
        (oscillatorRef.current as any) = { osc, interval: modulationInterval };
        gainRef.current = gain;
      }
    } catch (e) {
      console.error("Audio init failed", e);
    }
  };

  const stopAudio = () => {
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (oscillatorRef.current) {
      const oscData = oscillatorRef.current as any;
      if (oscData.osc) {
        oscData.osc.stop();
        if (oscData.interval) {
          clearInterval(oscData.interval);
        }
      }
      oscillatorRef.current = null;
    }
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
    }
  };

  const update = useCallback(() => {
    if (!analyserRef.current || !dataArrayRef.current || !workerRef.current) {
      // Fallback to main thread processing if worker not available
      if (!analyserRef.current || !dataArrayRef.current) return;

      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = dataArrayRef.current;
      analyserRef.current.getByteFrequencyData(dataArray);

      // Split into bands (fallback processing)
      const bassEnd = Math.floor(bufferLength * 0.1);
      const midEnd = Math.floor(bufferLength * 0.4);

      let bassSum = 0;
      let midSum = 0;
      let trebleSum = 0;

      for (let i = 0; i < bufferLength; i++) {
        const val = dataArray[i] / 255;
        if (i < bassEnd) bassSum += val;
        else if (i < midEnd) midSum += val;
        else trebleSum += val;
      }

      const bass = bassEnd > 0 ? bassSum / bassEnd : 0;
      const mid = (midEnd - bassEnd) > 0 ? midSum / (midEnd - bassEnd) : 0;
      const treble = (bufferLength - midEnd) > 0 ? trebleSum / (bufferLength - midEnd) : 0;
      const volume = dataArray.reduce((a, b) => a + b, 0) / bufferLength / 255;

      setAudioData({ bass, mid, treble, volume });
      requestRef.current = requestAnimationFrame(update);
      return;
    }

    // Get frequency data from analyser
    const bufferLength = analyserRef.current.frequencyBinCount;
    analyserRef.current.getByteFrequencyData(dataArrayRef.current);

    // Transfer data to worker for processing
    // Use transferable objects for better performance (zero-copy transfer)
    const dataCopy = new Uint8Array(dataArrayRef.current);
    workerRef.current.postMessage({
      type: "PROCESS_AUDIO",
      data: dataCopy,
      bufferLength,
    });

    // Continue animation loop
    requestRef.current = requestAnimationFrame(update);
  }, []);

  useEffect(() => {
    // Restart audio when training mode toggles to switch source types
    if (isActive) {
      stopAudio();
      startAudio(!isTraining); // If training, forcing non-mic
      requestRef.current = requestAnimationFrame(update);
    }
    return () => stopAudio();
  }, [isActive, isTraining, update]); // Added update dependency

  useEffect(() => {
    if (isActive) {
      requestRef.current = requestAnimationFrame(update);
    } else {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isActive, update]);

  return { audioData, startAudio, stopAudio };
};
