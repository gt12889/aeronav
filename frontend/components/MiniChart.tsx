import { configManager } from "../utils/config.js";

interface MiniChartProps {
  data: number[];
  color: string;
  label: string;
}

export const MiniChart = ({ data, color, label }: MiniChartProps) => {
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const maxPoints = configManager.getUIConfig().maxGraphPoints;

  const points = data.map((val, i) => {
    const x = (i / (maxPoints - 1)) * 100;
    const y = 100 - ((val - min) / range) * 100;
    return `${x},${y}`;
  }).join(" ");

  return (
    <div className="h-24 w-full bg-[#0a0a0a] border border-gray-800 rounded p-2 relative overflow-hidden">
      <div className="absolute top-2 left-2 text-[10px] font-mono text-gray-500 uppercase">{label}</div>
      <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="2"
          points={points}
        />
      </svg>
    </div>
  );
};

