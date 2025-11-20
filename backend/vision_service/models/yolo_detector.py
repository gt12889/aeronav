"""
YOLO Object Detector - YOLOv8 with CUDA acceleration
"""

import numpy as np
import torch
from typing import List, Dict, Optional

try:
    from ultralytics import YOLO
    YOLO_AVAILABLE = True
except ImportError:
    YOLO_AVAILABLE = False
    YOLO = None


class YOLODetector:
    """YOLO object detector with CUDA support"""
    
    def __init__(self, device: str = "cuda", model_size: str = "n"):
        """
        Initialize YOLO detector
        
        Args:
            device: "cuda" or "cpu"
            model_size: Model size - "n" (nano), "s" (small), "m" (medium), "l" (large), "x" (xlarge)
        """
        self.device = device
        self.use_cuda = device == "cuda" and torch.cuda.is_available()
        
        if not YOLO_AVAILABLE:
            raise ImportError("Ultralytics YOLO not available. Install with: pip install ultralytics")
        
        # Load YOLO model
        model_name = f"yolov8{model_size}.pt"
        self.model = YOLO(model_name)
        
        # Move to device
        if self.use_cuda:
            self.model.to("cuda")
            print(f"YOLO detector loaded on CUDA: {torch.cuda.get_device_name(0)}")
        else:
            print("YOLO detector loaded on CPU")
    
    async def detect(self, image: np.ndarray, confidence_threshold: float = 0.5) -> List[Dict]:
        """Detect objects in image"""
        # Run inference
        results = self.model(image, conf=confidence_threshold, device=self.device)
        
        detections = []
        
        for result in results:
            boxes = result.boxes
            if boxes is not None:
                for box in boxes:
                    # Get box coordinates
                    x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                    confidence = float(box.conf[0].cpu().numpy())
                    class_id = int(box.cls[0].cpu().numpy())
                    class_name = self.model.names[class_id]
                    
                    detections.append({
                        "class": class_name,
                        "classId": class_id,
                        "confidence": confidence,
                        "boundingBox": {
                            "x": float(x1),
                            "y": float(y1),
                            "width": float(x2 - x1),
                            "height": float(y2 - y1),
                        },
                    })
        
        return detections
    
    def cleanup(self):
        """Cleanup resources"""
        if hasattr(self, "model"):
            del self.model
            if self.use_cuda:
                torch.cuda.empty_cache()

