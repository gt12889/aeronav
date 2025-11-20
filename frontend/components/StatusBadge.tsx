import type { ServiceStatus } from "../types/index.js";

interface StatusBadgeProps {
  status: ServiceStatus["status"];
}

export const StatusBadge = ({ status }: StatusBadgeProps) => {
  const colors = {
    OFFLINE: "bg-gray-700 text-gray-400 border-gray-600",
    STARTING: "bg-yellow-900/30 text-yellow-400 border-yellow-600 animate-pulse",
    ONLINE: "bg-blue-900/30 text-blue-400 border-blue-600",
    ACTIVE: "bg-green-900/30 text-green-400 border-green-600",
    ERROR: "bg-red-900/30 text-red-400 border-red-600 animate-pulse",
    STANDBY: "bg-purple-900/30 text-purple-400 border-purple-600",
    TRAINING: "bg-orange-900/30 text-orange-400 border-orange-600 animate-pulse",
  };

  return (
    <span
      className={`px-2 py-0.5 text-xs border rounded font-mono tracking-wider ${colors[status]}`}
    >
      {status}
    </span>
  );
};

