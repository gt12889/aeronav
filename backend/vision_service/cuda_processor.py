"""
CUDA Vision Processor - GPU-accelerated image processing utilities
"""

import numpy as np
import cv2
import torch
from typing import Optional

try:
    import cupy as cp
    CUPY_AVAILABLE = True
except ImportError:
    CUPY_AVAILABLE = False
    cp = None


class CudaVisionProcessor:
    """CUDA-accelerated image processing"""
    
    def __init__(self, device: str = "cuda"):
        self.device = device
        self.use_cuda = device == "cuda" and torch.cuda.is_available()
        self.use_cupy = CUPY_AVAILABLE and self.use_cuda
        
        if self.use_cuda:
            print(f"CUDA Vision Processor initialized on {torch.cuda.get_device_name(0)}")
        else:
            print("CUDA Vision Processor initialized on CPU")
    
    def preprocess_image(self, image: np.ndarray, target_size: tuple = (640, 480)) -> torch.Tensor:
        """Preprocess image for model input"""
        # Resize
        resized = cv2.resize(image, target_size)
        
        # Normalize to [0, 1]
        normalized = resized.astype(np.float32) / 255.0
        
        # Convert to tensor and move to device
        tensor = torch.from_numpy(normalized).permute(2, 0, 1).unsqueeze(0)
        
        if self.use_cuda:
            tensor = tensor.cuda()
        
        return tensor
    
    def gaussian_blur(self, image: np.ndarray, kernel_size: int = 5) -> np.ndarray:
        """Apply Gaussian blur using CUDA if available"""
        if self.use_cupy:
            # Transfer to GPU
            gpu_image = cp.asarray(image)
            
            # Apply blur (simplified - would use CUDA kernels in production)
            # For now, fall back to CPU
            return cv2.GaussianBlur(image, (kernel_size, kernel_size), 0)
        else:
            return cv2.GaussianBlur(image, (kernel_size, kernel_size), 0)
    
    def edge_detection(self, image: np.ndarray) -> np.ndarray:
        """Apply Canny edge detection"""
        gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY) if len(image.shape) == 3 else image
        return cv2.Canny(gray, 100, 200)
    
    def cleanup(self):
        """Cleanup CUDA resources"""
        if self.use_cuda:
            torch.cuda.empty_cache()

