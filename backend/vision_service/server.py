"""
Vision Service - CUDA-accelerated image processing backend
Provides hand tracking, object detection, and pose estimation via WebSocket
"""

import asyncio
import base64
import json
import logging
from typing import Optional
import cv2
import numpy as np
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import torch

from vision_service.cuda_processor import CudaVisionProcessor
from vision_service.models.hand_tracker import HandTracker
from vision_service.models.yolo_detector import YOLODetector
from vision_service.models.pose_estimator import PoseEstimator

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Vision Service API")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify allowed origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global processor instances
vision_processor: Optional[CudaVisionProcessor] = None
hand_tracker: Optional[HandTracker] = None
yolo_detector: Optional[YOLODetector] = None
pose_estimator: Optional[PoseEstimator] = None


@app.on_event("startup")
async def startup_event():
    """Initialize CUDA processors on startup"""
    global vision_processor, hand_tracker, yolo_detector, pose_estimator
    
    logger.info("Initializing Vision Service...")
    
    # Check CUDA availability
    cuda_available = torch.cuda.is_available()
    device = "cuda" if cuda_available else "cpu"
    logger.info(f"Using device: {device}")
    
    if cuda_available:
        logger.info(f"CUDA Device: {torch.cuda.get_device_name(0)}")
        logger.info(f"CUDA Version: {torch.version.cuda}")
    
    try:
        # Initialize CUDA processor
        vision_processor = CudaVisionProcessor(device=device)
        
        # Initialize models
        hand_tracker = HandTracker(device=device)
        yolo_detector = YOLODetector(device=device)
        pose_estimator = PoseEstimator(device=device)
        
        logger.info("Vision Service initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize Vision Service: {e}", exc_info=True)
        raise


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    global vision_processor, hand_tracker, yolo_detector, pose_estimator
    
    logger.info("Shutting down Vision Service...")
    
    if vision_processor:
        vision_processor.cleanup()
    if hand_tracker:
        hand_tracker.cleanup()
    if yolo_detector:
        yolo_detector.cleanup()
    if pose_estimator:
        pose_estimator.cleanup()


def decode_image(base64_image: str) -> np.ndarray:
    """Decode base64 image to numpy array"""
    try:
        image_data = base64.b64decode(base64_image)
        nparr = np.frombuffer(image_data, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        return cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    except Exception as e:
        logger.error(f"Failed to decode image: {e}")
        raise


@app.websocket("/ws/vision")
async def websocket_vision(websocket: WebSocket):
    """WebSocket endpoint for vision processing"""
    await websocket.accept()
    logger.info("WebSocket client connected")
    
    try:
        while True:
            # Receive message
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message.get("type") == "frame":
                # Process frame
                frame_data = message.get("data")
                if not frame_data:
                    continue
                
                # Decode image
                image = decode_image(frame_data)
                
                # Process with CUDA
                results = {
                    "type": "detection",
                    "timestamp": message.get("timestamp"),
                    "hands": [],
                    "objects": [],
                    "pose": None,
                    "control": None,
                }
                
                # Hand tracking
                if hand_tracker:
                    hands = await hand_tracker.detect(image)
                    results["hands"] = [
                        {
                            "landmarks": hand["landmarks"].tolist() if hasattr(hand["landmarks"], "tolist") else hand["landmarks"],
                            "handedness": hand["handedness"],
                            "confidence": float(hand["confidence"]),
                            "boundingBox": {
                                "x": float(hand["boundingBox"]["x"]),
                                "y": float(hand["boundingBox"]["y"]),
                                "width": float(hand["boundingBox"]["width"]),
                                "height": float(hand["boundingBox"]["height"]),
                            },
                        }
                        for hand in hands
                    ]
                
                # Object detection (YOLO)
                if yolo_detector and message.get("detectObjects", False):
                    objects = await yolo_detector.detect(image)
                    results["objects"] = objects
                
                # Pose estimation
                if pose_estimator and message.get("detectPose", False):
                    pose = await pose_estimator.detect(image)
                    results["pose"] = pose
                
                # Calculate control signal from hands
                if results["hands"]:
                    primary_hand = results["hands"][0]
                    control = calculate_control_signal(primary_hand, image.shape)
                    results["control"] = control
                
                # Send results
                await websocket.send_json(results)
            
            elif message.get("type") == "ping":
                # Health check
                await websocket.send_json({"type": "pong", "timestamp": message.get("timestamp")})
            
            elif message.get("type") == "config":
                # Update configuration
                config = message.get("config", {})
                # Apply config updates here
                await websocket.send_json({"type": "config_ack", "config": config})
    
    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}", exc_info=True)
        await websocket.close()


def calculate_control_signal(hand: dict, image_shape: tuple) -> dict:
    """Calculate rocket control signal from hand detection"""
    landmarks = hand["landmarks"]
    
    # Calculate hand center (normalized 0-1)
    center_x = sum(l[0] for l in landmarks) / len(landmarks)
    center_y = sum(l[1] for l in landmarks) / len(landmarks)
    
    # Map to direction (-1 to 1)
    direction = {
        "x": (center_x - 0.5) * 2,  # -1 (left) to 1 (right)
        "y": (0.5 - center_y) * 2,  # -1 (down) to 1 (up)
    }
    
    # Calculate distance from camera (estimated from z coordinates)
    avg_z = sum(l[2] for l in landmarks) / len(landmarks) if len(landmarks[0]) > 2 else 0
    thrust = max(0, min(1, 1 - (avg_z + 0.5)))
    
    # Detect gesture (simplified)
    action = "IDLE"
    if len(landmarks) >= 21:
        # Simple gesture detection based on finger positions
        # This is a placeholder - implement proper gesture recognition
        action = "BOOST" if thrust > 0.7 else "IDLE"
    
    return {
        "direction": direction,
        "thrust": float(thrust),
        "action": action,
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    cuda_available = torch.cuda.is_available()
    return {
        "status": "healthy",
        "cuda_available": cuda_available,
        "device": "cuda" if cuda_available else "cpu",
        "models_loaded": {
            "hand_tracker": hand_tracker is not None,
            "yolo_detector": yolo_detector is not None,
            "pose_estimator": pose_estimator is not None,
        },
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8766)

