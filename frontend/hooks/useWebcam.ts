// Webcam access hook for vision-based control

import { useState, useEffect, useRef, useCallback } from "react";

export interface WebcamState {
  stream: MediaStream | null;
  videoRef: React.RefObject<HTMLVideoElement>;
  isActive: boolean;
  error: string | null;
  hasPermission: boolean;
}

export interface UseWebcamOptions {
  width?: number;
  height?: number;
  facingMode?: "user" | "environment";
  frameRate?: number;
  onFrame?: (imageData: ImageData) => void;
}

export const useWebcam = (options: UseWebcamOptions = {}) => {
  const {
    width = 640,
    height = 480,
    facingMode = "user",
    frameRate = 30,
    onFrame,
  } = options;

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameIntervalRef = useRef<number | null>(null);

  // Initialize canvas for frame capture
  useEffect(() => {
    if (!canvasRef.current) {
      canvasRef.current = document.createElement("canvas");
      canvasRef.current.width = width;
      canvasRef.current.height = height;
    }
  }, [width, height]);

  // Start webcam
  const startWebcam = useCallback(async () => {
    try {
      setError(null);
      
      // Check if MediaDevices API is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Webcam API not supported in this browser");
      }

      // Request webcam access
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: width },
          height: { ideal: height },
          facingMode,
          frameRate: { ideal: frameRate },
        },
      });

      setStream(mediaStream);
      setIsActive(true);
      setHasPermission(true);

      // Attach stream to video element
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }
    } catch (err: any) {
      const errorMessage =
        err.name === "NotAllowedError"
          ? "Camera permission denied. Please allow camera access."
          : err.name === "NotFoundError"
          ? "No camera found. Please connect a camera."
          : err.name === "NotReadableError"
          ? "Camera is already in use by another application."
          : `Failed to access webcam: ${err.message}`;
      
      setError(errorMessage);
      setIsActive(false);
      setHasPermission(false);
    }
  }, [width, height, facingMode, frameRate]);

  // Stop webcam
  const stopWebcam = useCallback(() => {
    if (frameIntervalRef.current) {
      cancelAnimationFrame(frameIntervalRef.current);
      frameIntervalRef.current = null;
    }

    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsActive(false);
  }, [stream]);

  // Capture frames
  useEffect(() => {
    if (!isActive || !videoRef.current || !canvasRef.current || !onFrame) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    const captureFrame = () => {
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        ctx.drawImage(video, 0, 0, width, height);
        const imageData = ctx.getImageData(0, 0, width, height);
        onFrame(imageData);
      }
      frameIntervalRef.current = requestAnimationFrame(captureFrame);
    };

    frameIntervalRef.current = requestAnimationFrame(captureFrame);

    return () => {
      if (frameIntervalRef.current) {
        cancelAnimationFrame(frameIntervalRef.current);
      }
    };
  }, [isActive, onFrame, width, height]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopWebcam();
    };
  }, [stopWebcam]);

  return {
    stream,
    videoRef,
    isActive,
    error,
    hasPermission,
    startWebcam,
    stopWebcam,
  };
};

