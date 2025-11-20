// Hand tracking utilities using MediaPipe or TensorFlow.js

export interface HandLandmark {
  x: number;
  y: number;
  z: number;
}

export interface Hand {
  landmarks: HandLandmark[];
  handedness: "Left" | "Right";
  confidence: number;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface Gesture {
  type: "point_left" | "point_right" | "open_palm" | "fist" | "thumbs_up" | "wave" | "none";
  confidence: number;
}

/**
 * Calculate hand center position (normalized 0-1)
 */
export const getHandCenter = (hand: Hand): { x: number; y: number } => {
  if (hand.landmarks.length === 0) return { x: 0.5, y: 0.5 };

  const sum = hand.landmarks.reduce(
    (acc, landmark) => ({
      x: acc.x + landmark.x,
      y: acc.y + landmark.y,
    }),
    { x: 0, y: 0 }
  );

  return {
    x: sum.x / hand.landmarks.length,
    y: sum.y / hand.landmarks.length,
  };
};

/**
 * Calculate hand distance from camera (estimated from z coordinates)
 */
export const getHandDistance = (hand: Hand): number => {
  if (hand.landmarks.length === 0) return 0.5;

  const avgZ = hand.landmarks.reduce((sum, l) => sum + l.z, 0) / hand.landmarks.length;
  // Normalize z to 0-1 range (closer = higher value)
  return Math.max(0, Math.min(1, 1 - (avgZ + 0.5)));
};

/**
 * Detect gesture from hand landmarks
 * Simplified gesture recognition based on finger positions
 */
export const detectGesture = (hand: Hand): Gesture => {
  if (hand.landmarks.length < 21) {
    return { type: "none", confidence: 0 };
  }

  // MediaPipe hand landmarks indices (21 points)
  const landmarks = hand.landmarks;
  if (landmarks.length < 21) {
    return { type: "none", confidence: 0 };
  }

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

  // Calculate finger extended states
  // A finger is extended if the tip is above the PIP joint
  const isThumbExtended = landmarks[THUMB_TIP].y < landmarks[THUMB_IP].y;
  const isIndexExtended =
    landmarks[INDEX_TIP].y < landmarks[INDEX_PIP].y;
  const isMiddleExtended =
    landmarks[MIDDLE_TIP].y < landmarks[MIDDLE_PIP].y;
  const isRingExtended =
    landmarks[RING_TIP].y < landmarks[RING_PIP].y;
  const isPinkyExtended =
    landmarks[PINKY_TIP].y < landmarks[PINKY_PIP].y;

  const extendedFingers = [
    isThumbExtended,
    isIndexExtended,
    isMiddleExtended,
    isRingExtended,
    isPinkyExtended,
  ].filter(Boolean).length;

  // Gesture detection logic
  if (extendedFingers === 0) {
    return { type: "fist", confidence: 0.9 };
  }

  if (extendedFingers === 5) {
    return { type: "open_palm", confidence: 0.9 };
  }

  if (isThumbExtended && extendedFingers === 1) {
    return { type: "thumbs_up", confidence: 0.85 };
  }

  // Pointing gestures
  if (isIndexExtended && !isMiddleExtended && !isRingExtended && !isPinkyExtended) {
    const indexTip = landmarks[INDEX_TIP];
    const wrist = landmarks[WRIST];
    const horizontalDiff = indexTip.x - wrist.x;

    if (horizontalDiff < -0.1) {
      return { type: "point_left", confidence: 0.8 };
    } else if (horizontalDiff > 0.1) {
      return { type: "point_right", confidence: 0.8 };
    }
  }

  // Wave detection (pinky extended, others not)
  if (isPinkyExtended && extendedFingers <= 2) {
    return { type: "wave", confidence: 0.7 };
  }

  return { type: "none", confidence: 0.5 };
};

/**
 * Simple hand tracking using color-based detection (fallback)
 * This is a placeholder until MediaPipe/TensorFlow.js is integrated
 */
export const detectHandSimple = (
  imageData: ImageData,
  previousHand?: Hand
): Hand | null => {
  // This is a simplified placeholder
  // In production, this would use MediaPipe or TensorFlow.js
  // For now, return null to indicate no hand detected
  return null;
};

/**
 * Calculate control signal from hand position and gesture
 */
export const handToControl = (
  hand: Hand,
  gesture: Gesture,
  screenWidth: number,
  screenHeight: number
): {
  direction: { x: number; y: number };
  thrust: number;
  action: "IDLE" | "BOOST" | "STABILIZE" | "TURN_LEFT" | "TURN_RIGHT";
} => {
  const center = getHandCenter(hand);
  const distance = getHandDistance(hand);

  // Map hand position to direction (-1 to 1)
  const direction = {
    x: (center.x - 0.5) * 2, // -1 (left) to 1 (right)
    y: (0.5 - center.y) * 2, // -1 (down) to 1 (up)
  };

  // Gesture-based actions override position
  let action: "IDLE" | "BOOST" | "STABILIZE" | "TURN_LEFT" | "TURN_RIGHT" = "IDLE";
  let thrust = distance; // Use distance as thrust

  switch (gesture.type) {
    case "point_left":
      action = "TURN_LEFT";
      direction.x = -1;
      break;
    case "point_right":
      action = "TURN_RIGHT";
      direction.x = 1;
      break;
    case "thumbs_up":
      action = "BOOST";
      thrust = 1.0;
      break;
    case "fist":
      action = "STABILIZE";
      thrust = 0;
      break;
    case "open_palm":
      // Use position-based control
      break;
    case "wave":
      action = "BOOST"; // Evasive maneuver
      break;
    default:
      // Use position-based control
      break;
  }

  return {
    direction,
    thrust: Math.max(0, Math.min(1, thrust)),
    action,
  };
};

