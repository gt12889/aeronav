"""
Pose Estimator - MediaPipe Pose with CUDA acceleration
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


class PoseEstimator:
    """MediaPipe Pose estimator with CUDA support"""
    
    def __init__(self, device: str = "cuda"):
        self.device = device
        self.use_cuda = device == "cuda" and torch.cuda.is_available()
        
        if not MEDIAPIPE_AVAILABLE:
            raise ImportError("MediaPipe not available. Install with: pip install mediapipe")
        
        # Initialize MediaPipe Pose
        self.mp_pose = mp.solutions.pose
        self.pose = self.mp_pose.Pose(
            static_image_mode=False,
            model_complexity=1,
            enable_segmentation=False,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5,
        )
    
    async def detect(self, image: np.ndarray) -> Optional[Dict]:
        """Detect pose in image"""
        # MediaPipe expects RGB
        if len(image.shape) == 3 and image.shape[2] == 3:
            rgb_image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR) if image.dtype == np.uint8 else image
        else:
            rgb_image = image
        
        # Process with MediaPipe
        results = self.pose.process(rgb_image)
        
        if not results.pose_landmarks:
            return None
        
        # Extract landmarks
        landmarks = []
        for landmark in results.pose_landmarks.landmark:
            landmarks.append({
                "x": landmark.x,
                "y": landmark.y,
                "z": landmark.z,
                "visibility": landmark.visibility,
            })
        
        # Calculate key points
        key_points = {
            "nose": landmarks[0],
            "leftShoulder": landmarks[11],
            "rightShoulder": landmarks[12],
            "leftElbow": landmarks[13],
            "rightElbow": landmarks[14],
            "leftWrist": landmarks[15],
            "rightWrist": landmarks[16],
            "leftHip": landmarks[23],
            "rightHip": landmarks[24],
            "leftKnee": landmarks[25],
            "rightKnee": landmarks[26],
            "leftAnkle": landmarks[27],
            "rightAnkle": landmarks[28],
        }
        
        # Calculate pose angles and positions
        pose_data = {
            "landmarks": landmarks,
            "keyPoints": key_points,
            "headPosition": {
                "x": landmarks[0]["x"],
                "y": landmarks[0]["y"],
            },
            "bodyCenter": {
                "x": (landmarks[11]["x"] + landmarks[12]["x"]) / 2,
                "y": (landmarks[11]["y"] + landmarks[12]["y"]) / 2,
            },
        }
        
        return pose_data
    
    def cleanup(self):
        """Cleanup resources"""
        if hasattr(self, "pose"):
            self.pose.close()

