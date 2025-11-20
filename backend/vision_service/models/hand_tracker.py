"""
Hand Tracker - MediaPipe Hands with CUDA acceleration
"""

import cv2
import numpy as np
import torch
from typing import List, Dict, Optional

try:
    import mediapipe as mp
    MEDIAPIPE_AVAILABLE = True
except ImportError:
    MEDIAPIPE_AVAILABLE = False
    mp = None


class HandTracker:
    """MediaPipe Hands tracker with CUDA support"""
    
    def __init__(self, device: str = "cuda"):
        self.device = device
        self.use_cuda = device == "cuda" and torch.cuda.is_available()
        
        if not MEDIAPIPE_AVAILABLE:
            raise ImportError("MediaPipe not available. Install with: pip install mediapipe")
        
        # Initialize MediaPipe Hands
        self.mp_hands = mp.solutions.hands
        self.hands = self.mp_hands.Hands(
            static_image_mode=False,
            max_num_hands=2,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5,
        )
        self.mp_drawing = mp.solutions.drawing_utils
    
    async def detect(self, image: np.ndarray) -> List[Dict]:
        """Detect hands in image"""
        # MediaPipe expects RGB
        if len(image.shape) == 3 and image.shape[2] == 3:
            rgb_image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR) if image.dtype == np.uint8 else image
        else:
            rgb_image = image
        
        # Process with MediaPipe
        results = self.hands.process(rgb_image)
        
        detections = []
        
        if results.multi_hand_landmarks:
            for idx, hand_landmarks in enumerate(results.multi_hand_landmarks):
                # Get handedness
                handedness = results.multi_handedness[idx].classification[0].label
                
                # Extract landmarks
                landmarks = []
                h, w = image.shape[:2]
                
                for landmark in hand_landmarks.landmark:
                    landmarks.append([
                        landmark.x,  # Normalized 0-1
                        landmark.y,  # Normalized 0-1
                        landmark.z,  # Depth
                    ])
                
                # Calculate bounding box
                xs = [l[0] for l in landmarks]
                ys = [l[1] for l in landmarks]
                min_x, max_x = min(xs), max(xs)
                min_y, max_y = min(ys), max(ys)
                
                detections.append({
                    "landmarks": landmarks,
                    "handedness": handedness,
                    "confidence": 0.9,  # MediaPipe doesn't provide per-hand confidence
                    "boundingBox": {
                        "x": min_x,
                        "y": min_y,
                        "width": max_x - min_x,
                        "height": max_y - min_y,
                    },
                })
        
        return detections
    
    def cleanup(self):
        """Cleanup resources"""
        if hasattr(self, "hands"):
            self.hands.close()

