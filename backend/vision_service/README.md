# Vision Service - CUDA-Accelerated Image Processing Backend

A FastAPI-based backend service providing CUDA-accelerated computer vision capabilities for the AeroNavSim frontend.

## Features

- **Hand Tracking**: MediaPipe Hands with CUDA acceleration
- **Object Detection**: YOLOv8 object detection
- **Pose Estimation**: MediaPipe Pose for full-body tracking
- **WebSocket API**: Real-time frame processing
- **CUDA Support**: GPU-accelerated processing when available

## Requirements

- Python 3.10+
- CUDA-capable GPU (optional, falls back to CPU)
- NVIDIA drivers and CUDA toolkit

## Installation

### With CUDA Support

```bash
# Install CUDA-enabled PyTorch
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121

# Install other dependencies
pip install -r requirements.txt
```

### CPU Only

```bash
pip install -r requirements.txt
```

## Running the Service

### Development

```bash
python server.py
```

Or with uvicorn:

```bash
uvicorn server:app --host 0.0.0.0 --port 8766 --reload
```

### Docker (with CUDA)

```bash
docker build -t vision-service .
docker run --gpus all -p 8766:8766 vision-service
```

## API Endpoints

### WebSocket: `/ws/vision`

Real-time vision processing endpoint.

**Message Format (Client → Server):**
```json
{
  "type": "frame",
  "data": "base64_encoded_image",
  "timestamp": 1234567890,
  "detectObjects": false,
  "detectPose": false
}
```

**Response Format (Server → Client):**
```json
{
  "type": "detection",
  "timestamp": 1234567890,
  "hands": [
    {
      "landmarks": [[x, y, z], ...],
      "handedness": "Right",
      "confidence": 0.9,
      "boundingBox": {"x": 0.1, "y": 0.2, "width": 0.3, "height": 0.4}
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

### Health Check: `GET /health`

Returns service status and CUDA availability.

## Configuration

Set environment variables:

- `CUDA_VISIBLE_DEVICES`: Specify which GPU to use
- `MODEL_SIZE`: YOLO model size (n, s, m, l, x)

## Performance

- **Hand Tracking**: ~30 FPS on GPU, ~10 FPS on CPU
- **YOLO Detection**: ~60 FPS on GPU (YOLOv8n), ~15 FPS on CPU
- **Pose Estimation**: ~30 FPS on GPU, ~10 FPS on CPU

## Integration with Frontend

The frontend can connect to this service via WebSocket to offload heavy vision processing to the GPU, enabling:

- Higher frame rates
- More accurate detection
- Advanced features (object tracking, pose estimation)
- Reduced frontend CPU usage

