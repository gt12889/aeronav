import { Gauge, Move, Zap, Target } from "lucide-react";

interface ControlSignalDisplayProps {
  direction: { x: number; y: number };
  thrust: number;
  action: "IDLE" | "BOOST" | "STABILIZE" | "TURN_LEFT" | "TURN_RIGHT" | "EVADE";
  gestureConfidence?: number;
}

export const ControlSignalDisplay = ({
  direction,
  thrust,
  action,
  gestureConfidence,
}: ControlSignalDisplayProps) => {
  const directionMagnitude = Math.sqrt(direction.x ** 2 + direction.y ** 2);
  const directionAngle = Math.atan2(direction.y, direction.x) * (180 / Math.PI);

  const getActionColor = (action: string) => {
    switch (action) {
      case "BOOST":
        return "text-green-400";
      case "TURN_LEFT":
      case "TURN_RIGHT":
        return "text-blue-400";
      case "STABILIZE":
        return "text-yellow-400";
      case "EVADE":
        return "text-purple-400";
      default:
        return "text-slate-400";
    }
  };

  return (
    <div className="bg-slate-800 rounded p-3 border border-slate-700">
      <h3 className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2">
        <Gauge size={14} /> Control Signals
      </h3>

      <div className="space-y-3">
        {/* Direction Vector */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 flex items-center gap-2">
              <Move size={12} /> Direction
            </span>
            <span className="text-xs text-slate-500 font-mono">
              ({direction.x.toFixed(2)}, {direction.y.toFixed(2)})
            </span>
          </div>
          <div className="relative h-16 bg-slate-900 rounded border border-slate-700">
            {/* Center crosshair */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-full h-px bg-slate-700"></div>
              <div className="absolute w-px h-full bg-slate-700"></div>
            </div>
            {/* Direction vector */}
            <div
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 transition-all duration-100"
              style={{
                transform: `translate(-50%, -50%) translate(${(direction.x * 30).toFixed(1)}px, ${(-direction.y * 30).toFixed(1)}px)`,
              }}
            >
              <div className="w-2 h-2 bg-sky-400 rounded-full border-2 border-slate-900"></div>
            </div>
            {/* Magnitude indicator */}
            <div className="absolute bottom-1 left-1 text-[10px] text-slate-500">
              Mag: {directionMagnitude.toFixed(2)}
            </div>
            <div className="absolute bottom-1 right-1 text-[10px] text-slate-500">
              {directionAngle.toFixed(0)}°
            </div>
          </div>
        </div>

        {/* Thrust Level */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400 flex items-center gap-2">
              <Zap size={12} /> Thrust
            </span>
            <span className="text-xs text-slate-300 font-bold">
              {Math.round(thrust * 100)}%
            </span>
          </div>
          <div className="h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-700">
            <div
              className="h-full bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 transition-all duration-100"
              style={{ width: `${Math.abs(thrust) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Current Action */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400 flex items-center gap-2">
              <Target size={12} /> Action
            </span>
            <span className={`text-xs font-bold ${getActionColor(action)}`}>
              {action}
            </span>
          </div>
          <div className="bg-slate-900 rounded p-2 border border-slate-700">
            <div className="text-xs text-slate-300 font-mono">{action}</div>
          </div>
        </div>

        {/* Gesture Confidence */}
        {gestureConfidence !== undefined && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-400">Gesture Confidence</span>
              <span className="text-xs text-slate-300 font-bold">
                {Math.round(gestureConfidence * 100)}%
              </span>
            </div>
            <div className="h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-700">
              <div
                className={`h-full transition-all duration-100 ${
                  gestureConfidence > 0.7
                    ? "bg-green-500"
                    : gestureConfidence > 0.4
                    ? "bg-yellow-500"
                    : "bg-red-500"
                }`}
                style={{ width: `${gestureConfidence * 100}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

