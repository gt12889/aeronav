import { useState, useEffect, useRef } from "react";
import {
  Upload,
  File,
  X,
  Info,
  Box,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Move,
  RotateCw,
  Download,
} from "lucide-react";
import {
  loadModelFromFile,
  generateModelPreview,
  type ModelData,
  type ModelMetadata,
} from "../utils/modelLoader.js";

interface ModelViewerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ModelViewer = ({ isOpen, onClose }: ModelViewerProps) => {
  const [modelData, setModelData] = useState<ModelData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"wireframe" | "solid" | "both">("solid");
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDraggingRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!isOpen) {
      setModelData(null);
      setError(null);
      setRotation({ x: 0, y: 0 });
      setZoom(1);
      setPan({ x: 0, y: 0 });
    }
  }, [isOpen]);

  useEffect(() => {
    if (modelData && canvasRef.current) {
      renderModel();
    }
  }, [modelData, viewMode, rotation, zoom, pan]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await loadModelFromFile(file);
      setModelData(data);
    } catch (e) {
      setError(`Failed to load model: ${e}`);
    } finally {
      setIsLoading(false);
    }
  };

  const renderModel = () => {
    const canvas = canvasRef.current;
    if (!canvas || !modelData) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    const w = canvas.width;
    const h = canvas.height;

    // Clear canvas
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, w, h);

    // Generate preview geometry
    const preview = generateModelPreview(modelData);
    if (preview.vertices.length === 0) {
      ctx.fillStyle = "#666";
      ctx.font = "14px monospace";
      ctx.textAlign = "center";
      ctx.fillText("No geometry to display", w / 2, h / 2);
      return;
    }

    // Transform and project vertices
    const centerX = w / 2 + pan.x;
    const centerY = h / 2 + pan.y;
    const scale = 50 * zoom;

    // Simple 3D projection
    const projected: Array<{ x: number; y: number; z: number; color: [number, number, number] }> = [];
    
    for (let i = 0; i < preview.vertices.length; i += 3) {
      let x = preview.vertices[i];
      let y = preview.vertices[i + 1];
      let z = preview.vertices[i + 2];

      // Apply rotation
      const cosX = Math.cos(rotation.x);
      const sinX = Math.sin(rotation.x);
      const cosY = Math.cos(rotation.y);
      const sinY = Math.sin(rotation.y);

      // Rotate around Y axis
      const tempX = x * cosY - z * sinY;
      const tempZ = x * sinY + z * cosY;
      x = tempX;
      z = tempZ;

      // Rotate around X axis
      const tempY = y * cosX - z * sinX;
      z = y * sinX + z * cosX;
      y = tempY;

      // Project to 2D (orthographic)
      const screenX = centerX + x * scale;
      const screenY = centerY - y * scale; // Flip Y

      const colorIndex = (i / 3) * 3;
      const color: [number, number, number] = [
        preview.colors[colorIndex] || 0.8,
        preview.colors[colorIndex + 1] || 0.8,
        preview.colors[colorIndex + 2] || 0.8,
      ];

      projected.push({ x: screenX, y: screenY, z, color });
    }

    // Draw wireframe
    if (viewMode === "wireframe" || viewMode === "both") {
      ctx.strokeStyle = "#0ea5e9";
      ctx.lineWidth = 1;
      ctx.beginPath();

      for (let i = 0; i < preview.indices.length; i += 3) {
        const i1 = preview.indices[i];
        const i2 = preview.indices[i + 1];
        const i3 = preview.indices[i + 2];

        if (i1 < projected.length && i2 < projected.length && i3 < projected.length) {
          const p1 = projected[i1];
          const p2 = projected[i2];
          const p3 = projected[i3];

          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.lineTo(p3.x, p3.y);
          ctx.lineTo(p1.x, p1.y);
        }
      }

      ctx.stroke();
    }

    // Draw solid faces
    if (viewMode === "solid" || viewMode === "both") {
      // Sort triangles by depth for proper rendering
      const triangles: Array<{
        indices: [number, number, number];
        depth: number;
        color: [number, number, number];
      }> = [];

      for (let i = 0; i < preview.indices.length; i += 3) {
        const i1 = preview.indices[i];
        const i2 = preview.indices[i + 1];
        const i3 = preview.indices[i + 2];

        if (i1 < projected.length && i2 < projected.length && i3 < projected.length) {
          const p1 = projected[i1];
          const p2 = projected[i2];
          const p3 = projected[i3];
          const avgDepth = (p1.z + p2.z + p3.z) / 3;

          triangles.push({
            indices: [i1, i2, i3],
            depth: avgDepth,
            color: p1.color,
          });
        }
      }

      // Sort by depth (back to front)
      triangles.sort((a, b) => b.depth - a.depth);

      // Draw triangles
      triangles.forEach((tri) => {
        const p1 = projected[tri.indices[0]];
        const p2 = projected[tri.indices[1]];
        const p3 = projected[tri.indices[2]];

        ctx.fillStyle = `rgb(${Math.floor(tri.color[0] * 255)}, ${Math.floor(tri.color[1] * 255)}, ${Math.floor(tri.color[2] * 255)})`;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineTo(p3.x, p3.y);
        ctx.closePath();
        ctx.fill();

        if (viewMode === "both") {
          ctx.strokeStyle = "#0ea5e9";
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      });
    }

    // Draw axes
    ctx.strokeStyle = "#666";
    ctx.lineWidth = 2;
    ctx.beginPath();
    // X axis (red)
    ctx.strokeStyle = "#ef4444";
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(centerX + 30, centerY);
    ctx.stroke();
    // Y axis (green)
    ctx.strokeStyle = "#10b981";
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(centerX, centerY - 30);
    ctx.stroke();
    // Z axis (blue)
    ctx.strokeStyle = "#3b82f6";
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(centerX + 15, centerY + 15);
    ctx.stroke();
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    lastMouseRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current) return;

    const dx = e.clientX - lastMouseRef.current.x;
    const dy = e.clientY - lastMouseRef.current.y;

    if (e.shiftKey) {
      // Pan
      setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
    } else {
      // Rotate
      setRotation((prev) => ({
        x: prev.x + dy * 0.01,
        y: prev.y + dx * 0.01,
      }));
    }

    lastMouseRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setZoom((prev) => Math.max(0.1, Math.min(5, prev + e.deltaY * -0.001)));
  };

  const resetView = () => {
    setRotation({ x: 0, y: 0 });
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-lg w-full max-w-6xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <Box className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-bold text-purple-400">3D Model Viewer</h2>
            {modelData && (
              <span className="text-xs text-slate-500">
                {modelData.metadata.format.toUpperCase()} • {modelData.metadata.name}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={resetView}
              className="p-2 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200"
              title="Reset View"
            >
              <RotateCcw size={18} />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - File Upload & Info */}
          <div className="w-80 border-r border-slate-700 flex flex-col">
            {/* File Upload */}
            <div className="p-4 border-b border-slate-700">
              <label className="block">
                <input
                  type="file"
                  accept=".obj,.gltf,.glb,.urdf,.xml"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div className="w-full p-4 border-2 border-dashed border-slate-700 rounded-lg hover:border-purple-500 transition-colors cursor-pointer flex flex-col items-center justify-center gap-2">
                  <Upload size={24} className="text-slate-500" />
                  <span className="text-sm text-slate-400">Click to upload model</span>
                  <span className="text-xs text-slate-500">OBJ, GLTF, GLB, URDF</span>
                </div>
              </label>
            </div>

            {/* Model Info */}
            {modelData && (
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="bg-slate-800 rounded p-3 border border-slate-700">
                  <h3 className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2">
                    <Info size={14} /> Model Information
                  </h3>
                  <div className="space-y-2 text-xs font-mono">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Format:</span>
                      <span className="text-purple-400">{modelData.metadata.format.toUpperCase()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Vertices:</span>
                      <span className="text-slate-300">{modelData.metadata.vertices.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Faces:</span>
                      <span className="text-slate-300">{modelData.metadata.faces.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Materials:</span>
                      <span className="text-slate-300">{modelData.metadata.materials}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Size:</span>
                      <span className="text-slate-300">{(modelData.metadata.size / 1024).toFixed(2)} KB</span>
                    </div>
                  </div>
                </div>

                {/* Bounding Box */}
                <div className="bg-slate-800 rounded p-3 border border-slate-700">
                  <h3 className="text-sm font-bold text-slate-300 mb-3">Bounding Box</h3>
                  <div className="space-y-1 text-xs font-mono">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Min:</span>
                      <span className="text-slate-300">
                        ({modelData.metadata.boundingBox.min.x.toFixed(2)}, {modelData.metadata.boundingBox.min.y.toFixed(2)}, {modelData.metadata.boundingBox.min.z.toFixed(2)})
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Max:</span>
                      <span className="text-slate-300">
                        ({modelData.metadata.boundingBox.max.x.toFixed(2)}, {modelData.metadata.boundingBox.max.y.toFixed(2)}, {modelData.metadata.boundingBox.max.z.toFixed(2)})
                      </span>
                    </div>
                  </div>
                </div>

                {/* URDF Specific Info */}
                {modelData.urdfData && (
                  <div className="bg-slate-800 rounded p-3 border border-slate-700">
                    <h3 className="text-sm font-bold text-slate-300 mb-3">URDF Structure</h3>
                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="text-slate-500">Root Link:</span>
                        <span className="text-purple-400 ml-2">{modelData.urdfData.rootLink}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Links:</span>
                        <span className="text-slate-300 ml-2">{modelData.urdfData.links.length}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Joints:</span>
                        <span className="text-slate-300 ml-2">{modelData.urdfData.joints.length}</span>
                      </div>
                      <div className="mt-3 max-h-32 overflow-y-auto">
                        {modelData.urdfData.links.map((link) => (
                          <div key={link.name} className="text-xs text-slate-400 py-1">
                            • {link.name}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* View Controls */}
                <div className="bg-slate-800 rounded p-3 border border-slate-700">
                  <h3 className="text-sm font-bold text-slate-300 mb-3">View Controls</h3>
                  <div className="space-y-2">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">View Mode</label>
                      <select
                        value={viewMode}
                        onChange={(e) => setViewMode(e.target.value as any)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-300"
                      >
                        <option value="solid">Solid</option>
                        <option value="wireframe">Wireframe</option>
                        <option value="both">Both</option>
                      </select>
                    </div>
                    <div className="text-xs text-slate-500 space-y-1">
                      <div>• Drag: Rotate</div>
                      <div>• Shift+Drag: Pan</div>
                      <div>• Scroll: Zoom</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {isLoading && (
              <div className="p-4 text-center text-slate-400 text-sm">Loading model...</div>
            )}

            {error && (
              <div className="p-4 bg-red-900/20 border border-red-800 rounded m-4">
                <div className="text-xs text-red-400">{error}</div>
              </div>
            )}
          </div>

          {/* Right Panel - Canvas */}
          <div className="flex-1 flex flex-col bg-slate-950">
            <div className="flex-1 relative">
              <canvas
                ref={canvasRef}
                className="w-full h-full"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onWheel={handleWheel}
              />
              {!modelData && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <File size={48} className="text-slate-700 mx-auto mb-4" />
                    <div className="text-slate-500 text-sm">No model loaded</div>
                    <div className="text-slate-600 text-xs mt-2">Upload a 3D model file to view</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

