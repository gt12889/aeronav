import { useState, useEffect } from "react";
import { User, Activity } from "lucide-react";

interface PoseLandmark {
  x: number;
  y: number;
  z: number;
  visibility: number;
}

interface PoseData {
  landmarks: PoseLandmark[];
  keyPoints: {
    nose: PoseLandmark;
    leftShoulder: PoseLandmark;
    rightShoulder: PoseLandmark;
    leftElbow: PoseLandmark;
    rightElbow: PoseLandmark;
    leftWrist: PoseLandmark;
    rightWrist: PoseLandmark;
    leftHip: PoseLandmark;
    rightHip: PoseLandmark;
    leftKnee: PoseLandmark;
    rightKnee: PoseLandmark;
    leftAnkle: PoseLandmark;
    rightAnkle: PoseLandmark;
  };
  headPosition: { x: number; y: number };
  bodyCenter: { x: number; y: number };
}

interface PoseEstimationViewProps {
  enabled: boolean;
  pose: PoseData | null;
  onPoseUpdate?: (control: {
    direction: { x: number; y: number };
    action: "IDLE" | "BOOST" | "STABILIZE" | "TURN_LEFT" | "TURN_RIGHT";
  }) => void;
}

export const PoseEstimationView = ({
  enabled,
  pose,
  onPoseUpdate,
}: PoseEstimationViewProps) => {
  const [controlMode, setControlMode] = useState<"head" | "body" | "arms">("head");

  useEffect(() => {
    if (!enabled || !pose) {
      return;
    }

    let direction = { x: 0, y: 0 };
    let action: "IDLE" | "BOOST" | "STABILIZE" | "TURN_LEFT" | "TURN_RIGHT" = "IDLE";

    switch (controlMode) {
      case "head":
        // Control based on head position
        direction = {
          x: (pose.headPosition.x - 0.5) * 2,
          y: (0.5 - pose.headPosition.y) * 2,
        };
        break;

      case "body":
        // Control based on body center and lean
        const leftShoulder = pose.keyPoints.leftShoulder;
        const rightShoulder = pose.keyPoints.rightShoulder;
        const leftHip = pose.keyPoints.leftHip;
        const rightHip = pose.keyPoints.rightHip;

        // Calculate lean direction
        const shoulderCenterX = (leftShoulder.x + rightShoulder.x) / 2;
        const hipCenterX = (leftHip.x + rightHip.x) / 2;
        const lean = shoulderCenterX - hipCenterX;

        direction = {
          x: lean * 5, // Amplify lean for control
          y: (0.5 - pose.bodyCenter.y) * 2,
        };

        // Detect jump (ankles above knees)
        const leftAnkle = pose.keyPoints.leftAnkle;
        const rightAnkle = pose.keyPoints.rightAnkle;
        const leftKnee = pose.keyPoints.leftKnee;
        const rightKnee = pose.keyPoints.rightKnee;

        if (
          leftAnkle.y < leftKnee.y &&
          rightAnkle.y < rightKnee.y &&
          leftAnkle.visibility > 0.5 &&
          rightAnkle.visibility > 0.5
        ) {
          action = "BOOST";
        }
        break;

      case "arms":
        // Control based on arm positions
        const leftWrist = pose.keyPoints.leftWrist;
        const rightWrist = pose.keyPoints.rightWrist;
        const leftElbow = pose.keyPoints.leftElbow;
        const rightElbow = pose.keyPoints.rightElbow;

        // Calculate arm spread
        const armSpread = Math.abs(leftWrist.x - rightWrist.x);
        const armCenterX = (leftWrist.x + rightWrist.x) / 2;
        const armCenterY = (leftWrist.y + rightWrist.y) / 2;

        direction = {
          x: (armCenterX - 0.5) * 2,
          y: (0.5 - armCenterY) * 2,
        };

        // Detect arms raised (boost gesture)
        if (
          leftWrist.y < leftElbow.y &&
          rightWrist.y < rightElbow.y &&
          leftWrist.visibility > 0.5 &&
          rightWrist.visibility > 0.5
        ) {
          action = "BOOST";
        }
        break;
    }

    // Normalize direction
    const magnitude = Math.sqrt(direction.x ** 2 + direction.y ** 2);
    if (magnitude > 1) {
      direction.x /= magnitude;
      direction.y /= magnitude;
    }

    onPoseUpdate?.({
      direction,
      action,
    });
  }, [enabled, pose, controlMode, onPoseUpdate]);

  if (!enabled) {
    return (
      <div className="bg-slate-800 rounded p-4 border border-slate-700">
        <div className="flex items-center gap-2 text-slate-500 text-xs">
          <User size={14} />
          Pose estimation disabled
        </div>
      </div>
    );
  }

  if (!pose) {
    return (
      <div className="bg-slate-800 rounded p-4 border border-slate-700">
        <div className="text-xs text-slate-500 text-center py-4">
          No pose detected
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded p-3 border border-slate-700">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
          <User size={14} /> Pose Estimation
        </h3>
        <div className="flex gap-1">
          {(["head", "body", "arms"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setControlMode(mode)}
              className={`px-2 py-1 text-[10px] rounded border transition-colors ${
                controlMode === mode
                  ? "bg-purple-900/30 border-purple-700 text-purple-400"
                  : "bg-slate-900 border-slate-700 text-slate-500 hover:border-slate-600"
              }`}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2 text-xs">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="text-slate-500">Head Position:</span>
            <div className="text-slate-300 font-mono">
              ({pose.headPosition.x.toFixed(2)}, {pose.headPosition.y.toFixed(2)})
            </div>
          </div>
          <div>
            <span className="text-slate-500">Body Center:</span>
            <div className="text-slate-300 font-mono">
              ({pose.bodyCenter.x.toFixed(2)}, {pose.bodyCenter.y.toFixed(2)})
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-700">
          <div className="text-slate-500 mb-1">Key Points Detected:</div>
          <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-400">
            <div>• Nose: {pose.keyPoints.nose.visibility > 0.5 ? "✓" : "✗"}</div>
            <div>• Shoulders: {pose.keyPoints.leftShoulder.visibility > 0.5 && pose.keyPoints.rightShoulder.visibility > 0.5 ? "✓" : "✗"}</div>
            <div>• Elbows: {pose.keyPoints.leftElbow.visibility > 0.5 && pose.keyPoints.rightElbow.visibility > 0.5 ? "✓" : "✗"}</div>
            <div>• Wrists: {pose.keyPoints.leftWrist.visibility > 0.5 && pose.keyPoints.rightWrist.visibility > 0.5 ? "✓" : "✗"}</div>
            <div>• Hips: {pose.keyPoints.leftHip.visibility > 0.5 && pose.keyPoints.rightHip.visibility > 0.5 ? "✓" : "✗"}</div>
            <div>• Knees: {pose.keyPoints.leftKnee.visibility > 0.5 && pose.keyPoints.rightKnee.visibility > 0.5 ? "✓" : "✗"}</div>
            <div>• Ankles: {pose.keyPoints.leftAnkle.visibility > 0.5 && pose.keyPoints.rightAnkle.visibility > 0.5 ? "✓" : "✗"}</div>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-700">
          <div className="text-xs text-slate-500 mb-1">Control Mode: <span className="text-purple-400 capitalize">{controlMode}</span></div>
          <div className="text-[10px] text-slate-500">
            {controlMode === "head" && "• Move head left/right to steer"}
            {controlMode === "head" && "• Move head up/down to control altitude"}
            {controlMode === "body" && "• Lean left/right to turn"}
            {controlMode === "body" && "• Jump to boost"}
            {controlMode === "arms" && "• Raise arms to boost"}
            {controlMode === "arms" && "• Spread arms to control direction"}
          </div>
        </div>
      </div>
    </div>
  );
};

