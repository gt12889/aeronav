import { useState, useEffect, useRef } from "react";

export interface PerformanceMetrics {
  fps: number;
  frameTime: number; // milliseconds
  memoryUsage?: number; // MB (if available)
  renderTime: number; // milliseconds
  audioProcessingTime?: number; // milliseconds
  physicsStepTime?: number; // milliseconds
  lastUpdate: number; // timestamp
  // Backend info
  physicsBackend?: 'wasm' | 'js' | 'loading';
  audioBackend?: 'wasm' | 'js' | 'loading';
}

export const usePerformanceProfiler = (isActive: boolean) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 0,
    frameTime: 0,
    memoryUsage: undefined,
    renderTime: 0,
    audioProcessingTime: undefined,
    physicsStepTime: undefined,
    lastUpdate: Date.now(),
    physicsBackend: 'loading',
    audioBackend: 'loading',
  });

  const frameCountRef = useRef(0);
  const lastFpsUpdateRef = useRef(Date.now());
  const frameTimesRef = useRef<number[]>([]);
  const renderStartRef = useRef<number>(0);
  const audioStartRef = useRef<number>(0);
  const physicsStartRef = useRef<number>(0);
  const physicsTimesRef = useRef<number[]>([]);
  const audioTimesRef = useRef<number[]>([]);

  // Track FPS
  useEffect(() => {
    if (!isActive) {
      setMetrics({
        fps: 0,
        frameTime: 0,
        memoryUsage: undefined,
        renderTime: 0,
        audioProcessingTime: undefined,
        physicsStepTime: undefined,
        lastUpdate: Date.now(),
        physicsBackend: 'loading',
        audioBackend: 'loading',
      });
      return;
    }

    let animationFrameId: number;

    let lastFrameTime = performance.now();

    const measureFrame = (currentTime: number) => {
      const now = Date.now();
      frameCountRef.current++;

      // Calculate frame time (time between frames)
      const frameTime = currentTime - lastFrameTime;
      lastFrameTime = currentTime;
      frameTimesRef.current.push(frameTime);

      // Calculate FPS every second
      const timeSinceLastUpdate = now - lastFpsUpdateRef.current;
      if (timeSinceLastUpdate >= 1000) {
        const fps = Math.round((frameCountRef.current * 1000) / timeSinceLastUpdate);
        frameCountRef.current = 0;
        lastFpsUpdateRef.current = now;

        // Calculate average frame time from recent frames
        const avgFrameTime = frameTimesRef.current.length > 0
          ? frameTimesRef.current.reduce((a, b) => a + b, 0) / frameTimesRef.current.length
          : 0;

        // Get memory usage if available (Chrome/Edge)
        let memoryUsage: number | undefined;
        if ((performance as any).memory) {
          const memory = (performance as any).memory;
          memoryUsage = Math.round((memory.usedJSHeapSize / 1048576) * 100) / 100; // Convert to MB
        }

        setMetrics((prev) => ({
          ...prev,
          fps,
          frameTime: Math.round(avgFrameTime * 100) / 100,
          memoryUsage,
          lastUpdate: now,
        }));

        // Keep only last 60 frame times for average calculation
        frameTimesRef.current = frameTimesRef.current.slice(-60);
      }

      animationFrameId = requestAnimationFrame(measureFrame);
    };

    animationFrameId = requestAnimationFrame(measureFrame);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isActive]);

  // Track render time
  const startRenderMeasure = () => {
    renderStartRef.current = performance.now();
  };

  const endRenderMeasure = () => {
    if (renderStartRef.current > 0) {
      const renderTime = performance.now() - renderStartRef.current;
      setMetrics((prev) => ({
        ...prev,
        renderTime: Math.round(renderTime * 100) / 100,
      }));
      renderStartRef.current = 0;
    }
  };

  // Track audio processing time
  const startAudioMeasure = () => {
    audioStartRef.current = performance.now();
  };

  const endAudioMeasure = () => {
    if (audioStartRef.current > 0) {
      const audioTime = performance.now() - audioStartRef.current;
      audioTimesRef.current.push(audioTime);
      // Keep rolling average of last 60 samples
      if (audioTimesRef.current.length > 60) {
        audioTimesRef.current = audioTimesRef.current.slice(-60);
      }
      const avgAudioTime = audioTimesRef.current.reduce((a, b) => a + b, 0) / audioTimesRef.current.length;
      setMetrics((prev) => ({
        ...prev,
        audioProcessingTime: Math.round(avgAudioTime * 1000) / 1000,
      }));
      audioStartRef.current = 0;
    }
  };

  // Track physics step time
  const startPhysicsMeasure = () => {
    physicsStartRef.current = performance.now();
  };

  const endPhysicsMeasure = () => {
    if (physicsStartRef.current > 0) {
      const physicsTime = performance.now() - physicsStartRef.current;
      physicsTimesRef.current.push(physicsTime);
      // Keep rolling average of last 60 samples
      if (physicsTimesRef.current.length > 60) {
        physicsTimesRef.current = physicsTimesRef.current.slice(-60);
      }
      const avgPhysicsTime = physicsTimesRef.current.reduce((a, b) => a + b, 0) / physicsTimesRef.current.length;
      setMetrics((prev) => ({
        ...prev,
        physicsStepTime: Math.round(avgPhysicsTime * 1000) / 1000,
      }));
      physicsStartRef.current = 0;
    }
  };

  // Set backend info
  const setPhysicsBackend = (backend: 'wasm' | 'js' | 'loading') => {
    setMetrics((prev) => ({ ...prev, physicsBackend: backend }));
  };

  const setAudioBackend = (backend: 'wasm' | 'js' | 'loading') => {
    setMetrics((prev) => ({ ...prev, audioBackend: backend }));
  };

  return {
    metrics,
    startRenderMeasure,
    endRenderMeasure,
    startAudioMeasure,
    endAudioMeasure,
    startPhysicsMeasure,
    endPhysicsMeasure,
    setPhysicsBackend,
    setAudioBackend,
  };
};

