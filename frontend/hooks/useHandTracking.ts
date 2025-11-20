// Hand tracking hook using MediaPipe or TensorFlow.js

import { useState, useEffect, useRef, useCallback } from "react";
import type { Hand, Gesture } from "../utils/handTracking.js";
import { detectGesture, handToControl } from "../utils/handTracking.js";

export interface HandTrackingState {
  hands: Hand[];
  primaryHand: Hand | null;
  gesture: Gesture | null;
  isDetecting: boolean;
  error: string | null;
}

export interface UseHandTrackingOptions {
  enabled?: boolean;
  videoRef: React.RefObject<HTMLVideoElement>;
  onControlUpdate?: (control: {
    direction: { x: number; y: number };
    thrust: number;
    action: "IDLE" | "BOOST" | "STABILIZE" | "TURN_LEFT" | "TURN_RIGHT";
  }) => void;
  detectionInterval?: number; // ms between detections
}

// TensorFlow.js MediaPipe Hands integration
let handDetector: any = null;
let isModelLoading = false;

const loadHandDetector = async (): Promise<any> => {
  if (handDetector) return handDetector;
  if (isModelLoading) {
    // Wait for existing load
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (handDetector) {
          clearInterval(checkInterval);
          resolve(handDetector);
        }
      }, 100);
    });
  }

  isModelLoading = true;
  
  try {
    // Access TensorFlow.js and Hand Pose Detection from global scope
    // These are loaded via script tags in index.html
    const tf = (window as any).tf;
    const handPoseDetection = (window as any).handPoseDetection;
    
    if (!tf || !handPoseDetection) {
      throw new Error("TensorFlow.js or Hand Pose Detection not loaded");
    }
    
    await tf.ready();
    
    // Create detector with MediaPipe Hands
    handDetector = await handPoseDetection.createDetector(
      handPoseDetection.SupportedModels.MediaPipeHands,
      {
        runtime: "mediapipe",
        modelType: "full",
        solutionPath: "https://cdn.jsdelivr.net/npm/@mediapipe/hands",
        maxHands: 2,
      }
    );
    
    isModelLoading = false;
    console.log("Hand detector loaded successfully");
    return handDetector;
  } catch (error) {
    isModelLoading = false;
    console.warn("Failed to load hand detector, using fallback:", error);
    // Return mock detector as fallback
    return {
      estimateHands: async () => [],
    };
  }
};

export const useHandTracking = (options: UseHandTrackingOptions) => {
  const {
    enabled = true,
    videoRef,
    onControlUpdate,
    detectionInterval = 100, // 10 FPS detection
  } = options;

  const [hands, setHands] = useState<Hand[]>([]);
  const [primaryHand, setPrimaryHand] = useState<Hand | null>(null);
  const [gesture, setGesture] = useState<Gesture | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModelLoaded, setIsModelLoaded] = useState(false);

  const detectionIntervalRef = useRef<number | null>(null);
  const lastControlRef = useRef<{
    direction: { x: number; y: number };
    thrust: number;
    action: string;
  } | null>(null);

  // Load hand detector model
  useEffect(() => {
    if (!enabled) return;

    loadHandDetector()
      .then((detector) => {
        handDetector = detector;
        setIsModelLoaded(true);
        setError(null);
      })
      .catch((err) => {
        setError(`Failed to load hand detector: ${err.message}`);
        setIsModelLoaded(false);
      });
  }, [enabled]);

  // Run hand detection
  const detectHands = useCallback(async () => {
    if (!enabled || !isModelLoaded || !videoRef.current || !handDetector) {
      return;
    }

    const video = videoRef.current;
    if (video.readyState !== video.HAVE_ENOUGH_DATA) {
      return;
    }

    try {
      setIsDetecting(true);

      // Detect hands
      const detections = await handDetector.estimateHands(video, {
        flipHorizontal: false,
        staticImageMode: false,
      });

      // Convert detections to Hand format
      const detectedHands: Hand[] = detections.map((detection: any) => {
        // MediaPipe Hands returns keypoints3D array
        const keypoints = detection.keypoints3D || detection.keypoints || [];
        const landmarks = keypoints.map((kp: any) => ({
          x: (kp.x / video.videoWidth) + 0.5, // Normalize and center
          y: (kp.y / video.videoHeight) + 0.5,
          z: kp.z || 0,
        }));

        // Calculate bounding box from landmarks
        const xs = landmarks.map((l: any) => l.x);
        const ys = landmarks.map((l: any) => l.y);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);

        return {
          landmarks,
          handedness: detection.handedness === "Left" ? "Left" : "Right",
          confidence: detection.score || 0.9,
          boundingBox: {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY,
          },
        };
      });

      setHands(detectedHands);

      // Get primary hand (right hand, or first hand if no right hand)
      const rightHand = detectedHands.find((h) => h.handedness === "Right");
      const primary = rightHand || detectedHands[0] || null;
      setPrimaryHand(primary);

      // Detect gesture
      if (primary) {
        const detectedGesture = detectGesture(primary);
        setGesture(detectedGesture);

        // Calculate control signal
        const control = handToControl(
          primary,
          detectedGesture,
          video.videoWidth,
          video.videoHeight
        );

        // Only update if control changed significantly
        const lastControl = lastControlRef.current;
        if (
          !lastControl ||
          Math.abs(control.direction.x - lastControl.direction.x) > 0.1 ||
          Math.abs(control.direction.y - lastControl.direction.y) > 0.1 ||
          control.action !== lastControl.action ||
          Math.abs(control.thrust - lastControl.thrust) > 0.1
        ) {
          lastControlRef.current = control;
          onControlUpdate?.(control);
        }
      } else {
        setGesture(null);
        // Reset control when no hand detected
        if (lastControlRef.current) {
          lastControlRef.current = null;
          onControlUpdate?.({
            direction: { x: 0, y: 0 },
            thrust: 0,
            action: "IDLE",
          });
        }
      }

      setIsDetecting(false);
    } catch (err: any) {
      setError(`Hand detection error: ${err.message}`);
      setIsDetecting(false);
    }
  }, [enabled, isModelLoaded, videoRef, onControlUpdate]);

  // Start detection loop
  useEffect(() => {
    if (!enabled || !isModelLoaded) {
      return;
    }

    detectionIntervalRef.current = window.setInterval(() => {
      detectHands();
    }, detectionInterval);

    return () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
    };
  }, [enabled, isModelLoaded, detectHands, detectionInterval]);

  return {
    hands,
    primaryHand,
    gesture,
    isDetecting,
    error,
    isModelLoaded,
  };
};

