import { useRef, useEffect } from "react";
import { Video, Camera, CameraOff, AlertCircle } from "lucide-react";
import { useWebcam } from "../hooks/useWebcam.js";
import { useHandTracking } from "../hooks/useHandTracking.js";
import type { Hand, Gesture } from "../utils/handTracking.js";

// MediaPipe hand landmark indices
const WRIST = 0;
const THUMB_CMC = 1;
const THUMB_MCP = 2;
const THUMB_IP = 3;
const THUMB_TIP = 4;
const INDEX_MCP = 5;
const INDEX_PIP = 6;
const INDEX_DIP = 7;
const INDEX_TIP = 8;
const MIDDLE_MCP = 9;
const MIDDLE_PIP = 10;
const MIDDLE_DIP = 11;
const MIDDLE_TIP = 12;
const RING_MCP = 13;
const RING_PIP = 14;
const RING_DIP = 15;
const RING_TIP = 16;
const PINKY_MCP = 17;
const PINKY_PIP = 18;
const PINKY_DIP = 19;
const PINKY_TIP = 20;

interface WebcamViewerProps {
  enabled: boolean;
  detectionInterval?: number; // ms between detections
  onControlUpdate?: (control: {
    direction: { x: number; y: number };
    thrust: number;
    action: "IDLE" | "BOOST" | "STABILIZE" | "TURN_LEFT" | "TURN_RIGHT" | "EVADE";
  }) => void;
  onHandsDetected?: (count: number) => void;
  onGestureDetected?: (gesture: string | null | { type: string; confidence: number }) => void;
  showOverlay?: boolean;
}

export const WebcamViewer = ({
  enabled,
  detectionInterval = 100,
  onControlUpdate,
  onHandsDetected,
  onGestureDetected,
  showOverlay = true,
}: WebcamViewerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const {
    stream,
    videoRef: webcamVideoRef,
    isActive,
    error,
    hasPermission,
    startWebcam,
    stopWebcam,
  } = useWebcam({
    width: 640,
    height: 480,
    facingMode: "user",
    frameRate: 30,
  });

  // Use the webcam's video ref
  const trackingVideoRef = webcamVideoRef;

  const {
    hands,
    primaryHand,
    gesture,
    isDetecting,
    error: trackingError,
    isModelLoaded,
  } = useHandTracking({
    enabled: enabled && isActive,
    videoRef: trackingVideoRef,
    onControlUpdate,
    detectionInterval: detectionInterval, // Configurable FPS
  });

  // Notify parent of hands detected and gesture
  useEffect(() => {
    onHandsDetected?.(hands.length);
  }, [hands.length, onHandsDetected]);

  useEffect(() => {
    if (gesture) {
      onGestureDetected?.(gesture.type === "none" ? null : {
        type: gesture.type,
        confidence: gesture.confidence || 0,
      });
    } else {
      onGestureDetected?.(null);
    }
  }, [gesture, onGestureDetected]);

  // Draw overlay on canvas
  useEffect(() => {
    if (!showOverlay || !canvasRef.current || !trackingVideoRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const video = trackingVideoRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const draw = () => {
      if (!ctx || !video) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw hand landmarks and connections
      if (primaryHand && primaryHand.landmarks.length > 0) {
        const scaleX = canvas.width;
        const scaleY = canvas.height;

        // Draw landmarks
        ctx.fillStyle = "#0ea5e9";
        primaryHand.landmarks.forEach((landmark) => {
          ctx.beginPath();
          ctx.arc(
            landmark.x * scaleX,
            landmark.y * scaleY,
            4,
            0,
            Math.PI * 2
          );
          ctx.fill();
        });

        // Draw hand center
        const center = {
          x: primaryHand.landmarks.reduce((sum, l) => sum + l.x, 0) /
            primaryHand.landmarks.length,
          y: primaryHand.landmarks.reduce((sum, l) => sum + l.y, 0) /
            primaryHand.landmarks.length,
        };
        ctx.fillStyle = "#f59e0b";
        ctx.beginPath();
        ctx.arc(center.x * scaleX, center.y * scaleY, 8, 0, Math.PI * 2);
        ctx.fill();

        // Draw connections between landmarks (hand skeleton)
        ctx.strokeStyle = "#0ea5e9";
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        // Thumb
        ctx.moveTo(landmarks[WRIST].x * scaleX, landmarks[WRIST].y * scaleY);
        ctx.lineTo(landmarks[THUMB_CMC].x * scaleX, landmarks[THUMB_CMC].y * scaleY);
        ctx.lineTo(landmarks[THUMB_MCP].x * scaleX, landmarks[THUMB_MCP].y * scaleY);
        ctx.lineTo(landmarks[THUMB_IP].x * scaleX, landmarks[THUMB_IP].y * scaleY);
        ctx.lineTo(landmarks[THUMB_TIP].x * scaleX, landmarks[THUMB_TIP].y * scaleY);
        
        // Index finger
        ctx.moveTo(landmarks[WRIST].x * scaleX, landmarks[WRIST].y * scaleY);
        ctx.lineTo(landmarks[INDEX_MCP].x * scaleX, landmarks[INDEX_MCP].y * scaleY);
        ctx.lineTo(landmarks[INDEX_PIP].x * scaleX, landmarks[INDEX_PIP].y * scaleY);
        ctx.lineTo(landmarks[INDEX_DIP].x * scaleX, landmarks[INDEX_DIP].y * scaleY);
        ctx.lineTo(landmarks[INDEX_TIP].x * scaleX, landmarks[INDEX_TIP].y * scaleY);
        
        // Middle finger
        ctx.moveTo(landmarks[WRIST].x * scaleX, landmarks[WRIST].y * scaleY);
        ctx.lineTo(landmarks[MIDDLE_MCP].x * scaleX, landmarks[MIDDLE_MCP].y * scaleY);
        ctx.lineTo(landmarks[MIDDLE_PIP].x * scaleX, landmarks[MIDDLE_PIP].y * scaleY);
        ctx.lineTo(landmarks[MIDDLE_DIP].x * scaleX, landmarks[MIDDLE_DIP].y * scaleY);
        ctx.lineTo(landmarks[MIDDLE_TIP].x * scaleX, landmarks[MIDDLE_TIP].y * scaleY);
        
        // Ring finger
        ctx.moveTo(landmarks[WRIST].x * scaleX, landmarks[WRIST].y * scaleY);
        ctx.lineTo(landmarks[RING_MCP].x * scaleX, landmarks[RING_MCP].y * scaleY);
        ctx.lineTo(landmarks[RING_PIP].x * scaleX, landmarks[RING_PIP].y * scaleY);
        ctx.lineTo(landmarks[RING_DIP].x * scaleX, landmarks[RING_DIP].y * scaleY);
        ctx.lineTo(landmarks[RING_TIP].x * scaleX, landmarks[RING_TIP].y * scaleY);
        
        // Pinky finger
        ctx.moveTo(landmarks[WRIST].x * scaleX, landmarks[WRIST].y * scaleY);
        ctx.lineTo(landmarks[PINKY_MCP].x * scaleX, landmarks[PINKY_MCP].y * scaleY);
        ctx.lineTo(landmarks[PINKY_PIP].x * scaleX, landmarks[PINKY_PIP].y * scaleY);
        ctx.lineTo(landmarks[PINKY_DIP].x * scaleX, landmarks[PINKY_DIP].y * scaleY);
        ctx.lineTo(landmarks[PINKY_TIP].x * scaleX, landmarks[PINKY_TIP].y * scaleY);
        
        ctx.stroke();

        // Draw bounding box
        ctx.strokeStyle = "#10b981";
        ctx.lineWidth = 2;
        ctx.strokeRect(
          primaryHand.boundingBox.x * scaleX,
          primaryHand.boundingBox.y * scaleY,
          primaryHand.boundingBox.width * scaleX,
          primaryHand.boundingBox.height * scaleY
        );
      }

      // Draw gesture indicator
      if (gesture && gesture.type !== "none") {
        ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        ctx.fillRect(10, 10, 200, 40);
        ctx.fillStyle = "#fff";
        ctx.font = "16px monospace";
        ctx.fillText(
          `Gesture: ${gesture.type.replace("_", " ").toUpperCase()}`,
          20,
          35
        );
      }

      requestAnimationFrame(draw);
    };

    if (isActive) {
      draw();
    }
  }, [showOverlay, primaryHand, gesture, isActive, trackingVideoRef]);

  // Auto-start when enabled
  useEffect(() => {
    if (enabled && !isActive && !error) {
      startWebcam();
    } else if (!enabled && isActive) {
      stopWebcam();
    }
  }, [enabled, isActive, error, startWebcam, stopWebcam]);

  return (
    <div className="relative bg-slate-900 rounded-lg border border-slate-700 overflow-hidden">
      {/* Video Container */}
      <div className="relative aspect-video bg-black">
        <video
          ref={trackingVideoRef}
          className="w-full h-full object-cover"
          playsInline
          muted
          style={{ transform: "scaleX(-1)" }} // Mirror for natural feel
        />
        
        {/* Overlay Canvas */}
        {showOverlay && (
          <canvas
            ref={canvasRef}
            className="absolute inset-0 pointer-events-none"
            style={{ transform: "scaleX(-1)" }} // Mirror to match video
          />
        )}

        {/* Status Overlay */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {!isActive && !error && (
            <div className="bg-slate-900/80 px-2 py-1 rounded text-xs text-slate-400 flex items-center gap-2">
              <CameraOff size={12} />
              Camera inactive
            </div>
          )}
          {error && (
            <div className="bg-red-900/80 px-2 py-1 rounded text-xs text-red-300 flex items-center gap-2">
              <AlertCircle size={12} />
              {error}
            </div>
          )}
          {isActive && !isModelLoaded && (
            <div className="bg-yellow-900/80 px-2 py-1 rounded text-xs text-yellow-300 flex items-center gap-2">
              Loading hand detector...
            </div>
          )}
          {isDetecting && (
            <div className="bg-blue-900/80 px-2 py-1 rounded text-xs text-blue-300 flex items-center gap-2">
              Detecting...
            </div>
          )}
          {trackingError && (
            <div className="bg-red-900/80 px-2 py-1 rounded text-xs text-red-300 flex items-center gap-2">
              {trackingError}
            </div>
          )}
        </div>

        {/* Control Zone Overlay */}
        {showOverlay && isActive && (
          <div className="absolute inset-0 pointer-events-none">
            {/* 3x3 Grid */}
            <div className="w-full h-full grid grid-cols-3 grid-rows-3 opacity-20">
              {Array.from({ length: 9 }).map((_, i) => (
                <div
                  key={i}
                  className="border border-slate-600"
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="p-2 bg-slate-800 border-t border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Camera size={14} />
          <span>
            {isActive
              ? `${hands.length} hand${hands.length !== 1 ? "s" : ""} detected`
              : "Camera off"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {gesture && gesture.type !== "none" && (
            <div className="px-2 py-1 bg-purple-900/30 border border-purple-700 rounded text-xs text-purple-300">
              {gesture.type.replace("_", " ").toUpperCase()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

