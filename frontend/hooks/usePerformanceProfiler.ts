import { useState, useEffect, useRef } from "react";

export interface PerformanceMetrics {
  fps: number;
  frameTime: number; // milliseconds
  memoryUsage?: number; // MB (if available)
  renderTime: number; // milliseconds
  audioProcessingTime?: number; // milliseconds
  lastUpdate: number; // timestamp
}

export const usePerformanceProfiler = (isActive: boolean) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 0,
    frameTime: 0,
    memoryUsage: undefined,
    renderTime: 0,
    audioProcessingTime: undefined,
    lastUpdate: Date.now(),
  });

  const frameCountRef = useRef(0);
  const lastFpsUpdateRef = useRef(Date.now());
  const frameTimesRef = useRef<number[]>([]);
  const renderStartRef = useRef<number>(0);
  const audioStartRef = useRef<number>(0);

  // Track FPS
  useEffect(() => {
    if (!isActive) {
      setMetrics({
        fps: 0,
        frameTime: 0,
        memoryUsage: undefined,
        renderTime: 0,
        audioProcessingTime: undefined,
        lastUpdate: Date.now(),
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
      setMetrics((prev) => ({
        ...prev,
        audioProcessingTime: Math.round(audioTime * 100) / 100,
      }));
      audioStartRef.current = 0;
    }
  };

  return {
    metrics,
    startRenderMeasure,
    endRenderMeasure,
    startAudioMeasure,
    endAudioMeasure,
  };
};

