# Vision Service Integration Guide

## Overview

The Vision Service provides CUDA-accelerated image processing capabilities for the AeroNavSim frontend. It can process webcam frames server-side using GPU acceleration for improved performance and accuracy.

## Architecture

```
Frontend (Browser)
    ↓ WebSocket
Vision Service (Python + CUDA)
    ↓ GPU Processing
MediaPipe/YOLO Models
    ↓ Results
Frontend (Control Signals)
```

## Setup

### Prerequisites

1. **NVIDIA GPU** with CUDA support (optional - falls back to CPU)
2. **Python 3.10+**
3. **CUDA Toolkit 12.1+** (if using GPU)
4. **NVIDIA Drivers**

### Installation

```bash
cd backend/vision_service

# Install dependencies
pip install -r requirements.txt

# For CUDA support, install PyTorch with CUDA:
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121
```

### Running

**Development:**
```bash
python server.py
```

**Production (Docker with CUDA):**
```bash
docker-compose up
```

The service will be available at `ws://localhost:8766/ws/vision`

## Frontend Integration

### Enable CUDA Backend

1. Open the **VISION** tab in AeroNavSim
2. Scroll to **CUDA Backend** section
3. Enable "Use CUDA Backend"
4. Enter backend URL (default: `ws://localhost:8766/ws/vision`)
5. The frontend will automatically connect

### Features When Using Backend

- **Higher Accuracy**: More accurate hand detection
- **Better Performance**: GPU processing reduces frontend CPU usage
- **Object Detection**: YOLO object detection available
- **Pose Estimation**: Full-body pose tracking
- **Advanced Processing**: CUDA-accelerated image operations

## WebSocket Protocol

### Client → Server

**Frame Processing:**
```json
{
  "type": "frame",
  "data": "base64_encoded_jpeg_image",
  "timestamp": 1234567890,
  "detectObjects": false,
  "detectPose": false
}
```

**Health Check:**
```json
{
  "type": "ping",
  "timestamp": 1234567890
}
```

**Configuration:**
```json
{
  "type": "config",
  "config": {
    "maxHands": 2,
    "confidenceThreshold": 0.5
  }
}
```

### Server → Client

**Detection Results:**
```json
{
  "type": "detection",
  "timestamp": 1234567890,
  "hands": [
    {
      "landmarks": [[x, y, z], ...],
      "handedness": "Right",
      "confidence": 0.95,
      "boundingBox": {
        "x": 0.1, "y": 0.2,
        "width": 0.3, "height": 0.4
      }
    }
  ],
  "objects": [...],
  "pose": {...},
  "control": {
    "direction": {"x": 0.5, "y": -0.3},
    "thrust": 0.7,
    "action": "BOOST"
  }
}
```

## Performance

### With CUDA (GPU)
- Hand Tracking: ~30-60 FPS
- YOLO Detection: ~60 FPS (YOLOv8n)
- Pose Estimation: ~30 FPS
- Latency: < 50ms end-to-end

### CPU Only
- Hand Tracking: ~10-15 FPS
- YOLO Detection: ~15 FPS
- Pose Estimation: ~10 FPS
- Latency: 100-200ms

## Models

The service uses:
- **MediaPipe Hands**: Hand tracking (21 landmarks)
- **YOLOv8**: Object detection (80 classes)
- **MediaPipe Pose**: Pose estimation (33 landmarks)

Models are automatically downloaded on first run.

## Troubleshooting

### Connection Issues
- Check that the backend is running: `curl http://localhost:8766/health`
- Verify WebSocket URL in frontend settings
- Check firewall settings

### CUDA Not Available
- Verify CUDA installation: `nvidia-smi`
- Check PyTorch CUDA: `python -c "import torch; print(torch.cuda.is_available())"`
- Service will fall back to CPU automatically

### Performance Issues
- Ensure GPU is being used: Check `/health` endpoint
- Reduce model size (use `MODEL_SIZE=n` for nano model)
- Lower frame rate in frontend settings

## API Endpoints

### `GET /health`
Returns service status and CUDA availability.

### `WebSocket /ws/vision`
Real-time vision processing endpoint.

## Environment Variables

- `CUDA_VISIBLE_DEVICES`: GPU selection (default: 0)
- `MODEL_SIZE`: YOLO model size (n, s, m, l, x)
- `HOST`: Server host (default: 0.0.0.0)
- `PORT`: Server port (default: 8766)
- `LOG_LEVEL`: Logging level (INFO, DEBUG, etc.)

