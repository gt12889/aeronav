import { useState, useEffect } from "react";
import { Box, Target, AlertCircle } from "lucide-react";
import type { VisionBackendMessage } from "../utils/visionBackendClient.js";

interface DetectedObject {
  class: string;
  classId: number;
  confidence: number;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

interface ObjectDetectionViewProps {
  enabled: boolean;
  objects: DetectedObject[];
  onObjectSelect?: (object: DetectedObject) => void;
}

export const ObjectDetectionView = ({
  enabled,
  objects,
  onObjectSelect,
}: ObjectDetectionViewProps) => {
  const [selectedObject, setSelectedObject] = useState<DetectedObject | null>(null);

  // Common object classes for rocket control
  const controlObjects = ["person", "hand", "finger", "ball", "bottle", "cup"];

  const handleObjectClick = (obj: DetectedObject) => {
    setSelectedObject(obj);
    onObjectSelect?.(obj);
  };

  if (!enabled) {
    return (
      <div className="bg-slate-800 rounded p-4 border border-slate-700">
        <div className="flex items-center gap-2 text-slate-500 text-xs">
          <AlertCircle size={14} />
          Object detection disabled
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded p-3 border border-slate-700">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
          <Target size={14} /> Object Detection
        </h3>
        <span className="text-xs text-slate-500">{objects.length} objects</span>
      </div>

      {objects.length === 0 ? (
        <div className="text-xs text-slate-500 text-center py-4">
          No objects detected
        </div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {objects.map((obj, index) => {
            const isControlObject = controlObjects.some(
              (c) => obj.class.toLowerCase().includes(c)
            );
            const isSelected = selectedObject === obj;

            return (
              <button
                key={index}
                onClick={() => handleObjectClick(obj)}
                className={`w-full text-left p-2 rounded border transition-colors ${
                  isSelected
                    ? "bg-purple-900/30 border-purple-700"
                    : isControlObject
                    ? "bg-slate-900 border-slate-700 hover:border-slate-600"
                    : "bg-slate-900/50 border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-300">
                    {obj.class}
                  </span>
                  <span className="text-xs text-slate-500">
                    {Math.round(obj.confidence * 100)}%
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 font-mono">
                  Box: ({Math.round(obj.boundingBox.x)}, {Math.round(obj.boundingBox.y)}){" "}
                  {Math.round(obj.boundingBox.width)}×{Math.round(obj.boundingBox.height)}
                </div>
                {isControlObject && (
                  <div className="text-[10px] text-purple-400 mt-1">
                    Can be used for control
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {selectedObject && (
        <div className="mt-3 pt-3 border-t border-slate-700">
          <div className="text-xs text-slate-400 mb-2">Selected Object:</div>
          <div className="bg-slate-900 rounded p-2">
            <div className="text-xs font-bold text-purple-400 mb-1">
              {selectedObject.class}
            </div>
            <div className="text-[10px] text-slate-500 space-y-1">
              <div>Confidence: {Math.round(selectedObject.confidence * 100)}%</div>
              <div>Position: ({Math.round(selectedObject.boundingBox.x)}, {Math.round(selectedObject.boundingBox.y)})</div>
              <div>Size: {Math.round(selectedObject.boundingBox.width)}×{Math.round(selectedObject.boundingBox.height)}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

