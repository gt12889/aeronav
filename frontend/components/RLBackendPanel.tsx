import { useState, useEffect } from "react";
import {
  Network,
  Wifi,
  WifiOff,
  RefreshCw,
  Play,
  Square,
  Settings,
  Activity,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import type { BackendState } from "../utils/websocketClient.js";

interface RLBackendPanelProps {
  isConnected: boolean;
  connectionState: "connecting" | "connected" | "disconnected" | "error";
  backendState: BackendState | null;
  error: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
  onReset: () => void;
  url: string;
  onUrlChange: (url: string) => void;
}

export const RLBackendPanel = ({
  isConnected,
  connectionState,
  backendState,
  error,
  onConnect,
  onDisconnect,
  onReset,
  url,
  onUrlChange,
}: RLBackendPanelProps) => {
  const [showSettings, setShowSettings] = useState(false);
  const [tempUrl, setTempUrl] = useState(url);

  useEffect(() => {
    setTempUrl(url);
  }, [url]);

  const handleSaveUrl = () => {
    onUrlChange(tempUrl);
    setShowSettings(false);
  };

  return (
    <div className="h-full flex flex-col bg-[#0B1120] overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-900">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Network className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-bold text-cyan-400">RL Backend Connection</h2>
            <div className={`px-2 py-0.5 text-xs rounded flex items-center gap-1 ${
              connectionState === "connected"
                ? "bg-green-900/30 text-green-400 border border-green-700"
                : connectionState === "connecting"
                ? "bg-yellow-900/30 text-yellow-400 border border-yellow-700 animate-pulse"
                : connectionState === "error"
                ? "bg-red-900/30 text-red-400 border border-red-700"
                : "bg-slate-800 text-slate-500 border border-slate-700"
            }`}>
              {connectionState === "connected" && <Wifi size={12} />}
              {connectionState === "connecting" && <RefreshCw size={12} className="animate-spin" />}
              {(connectionState === "disconnected" || connectionState === "error") && <WifiOff size={12} />}
              {connectionState.toUpperCase()}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200"
              title="Settings"
            >
              <Settings size={16} />
            </button>
            {isConnected ? (
              <button
                onClick={onDisconnect}
                className="px-3 py-1 text-xs bg-red-900/30 border border-red-700 text-red-400 rounded hover:bg-red-900/50 flex items-center gap-2"
              >
                <Square size={12} /> Disconnect
              </button>
            ) : (
              <button
                onClick={onConnect}
                className="px-3 py-1 text-xs bg-cyan-900/30 border border-cyan-700 text-cyan-400 rounded hover:bg-cyan-900/50 flex items-center gap-2"
              >
                <Play size={12} /> Connect
              </button>
            )}
          </div>
        </div>

        {/* Settings */}
        {showSettings && (
          <div className="mt-4 p-3 bg-slate-800 rounded border border-slate-700">
            <div className="mb-2">
              <label className="block text-xs text-slate-400 mb-1">WebSocket URL</label>
              <input
                type="text"
                value={tempUrl}
                onChange={(e) => setTempUrl(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-300 font-mono"
                placeholder="ws://localhost:8765"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSaveUrl}
                className="px-3 py-1 text-xs bg-cyan-900/30 border border-cyan-700 text-cyan-400 rounded hover:bg-cyan-900/50"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setTempUrl(url);
                  setShowSettings(false);
                }}
                className="px-3 py-1 text-xs bg-slate-700 border border-slate-600 text-slate-300 rounded hover:bg-slate-600"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mt-3 p-2 bg-red-900/20 border border-red-800 rounded flex items-start gap-2">
            <AlertCircle size={14} className="text-red-400 mt-0.5" />
            <div className="flex-1">
              <div className="text-xs font-bold text-red-400">Connection Error</div>
              <div className="text-xs text-red-300 mt-1">{error}</div>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Connection Info */}
        <div className="bg-slate-900 rounded p-4 border border-slate-800">
          <h3 className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2">
            <Activity size={14} /> Connection Info
          </h3>
          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-slate-400">URL:</span>
              <span className="text-slate-300">{url}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Status:</span>
              <span className={
                connectionState === "connected" ? "text-green-400" :
                connectionState === "connecting" ? "text-yellow-400" :
                connectionState === "error" ? "text-red-400" :
                "text-slate-500"
              }>
                {connectionState}
              </span>
            </div>
            {isConnected && (
              <div className="flex justify-between">
                <span className="text-slate-400">Connected:</span>
                <span className="text-green-400 flex items-center gap-1">
                  <CheckCircle size={12} /> Active
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Backend State */}
        {backendState && (
          <div className="bg-slate-900 rounded p-4 border border-slate-800">
            <h3 className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2">
              <Activity size={14} /> Backend State
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-950 rounded p-2 border border-slate-800">
                <div className="text-xs text-slate-500">Epoch</div>
                <div className="text-lg font-mono text-cyan-400">{backendState.epoch}</div>
              </div>
              <div className="bg-slate-950 rounded p-2 border border-slate-800">
                <div className="text-xs text-slate-500">Loss</div>
                <div className="text-lg font-mono text-red-400">{backendState.loss.toFixed(4)}</div>
              </div>
              <div className="bg-slate-950 rounded p-2 border border-slate-800">
                <div className="text-xs text-slate-500">Accuracy</div>
                <div className="text-lg font-mono text-green-400">{(backendState.accuracy * 100).toFixed(1)}%</div>
              </div>
              <div className="bg-slate-950 rounded p-2 border border-slate-800">
                <div className="text-xs text-slate-500">Learning Rate</div>
                <div className="text-lg font-mono text-sky-400">{backendState.learningRate.toFixed(4)}</div>
              </div>
              <div className="bg-slate-950 rounded p-2 border border-slate-800">
                <div className="text-xs text-slate-500">Epsilon</div>
                <div className="text-lg font-mono text-purple-400">{backendState.epsilon.toFixed(3)}</div>
              </div>
              <div className="bg-slate-950 rounded p-2 border border-slate-800">
                <div className="text-xs text-slate-500">Replay Buffer</div>
                <div className="text-lg font-mono text-amber-400">{backendState.replayBufferSize.toLocaleString()}</div>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        {isConnected && (
          <div className="bg-slate-900 rounded p-4 border border-slate-800">
            <h3 className="text-sm font-bold text-slate-300 mb-3">Actions</h3>
            <div className="flex gap-2">
              <button
                onClick={onReset}
                className="px-3 py-1 text-xs bg-slate-800 border border-slate-700 text-slate-300 rounded hover:bg-slate-700 flex items-center gap-2"
              >
                <RefreshCw size={12} /> Reset Environment
              </button>
            </div>
          </div>
        )}

        {/* Instructions */}
        {!isConnected && (
          <div className="bg-slate-900 rounded p-4 border border-slate-800">
            <h3 className="text-sm font-bold text-slate-300 mb-3">Setup Instructions</h3>
            <div className="text-xs text-slate-400 space-y-2">
              <p>1. Start your Python RL backend server</p>
              <p>2. Ensure it's listening on the WebSocket URL (default: ws://localhost:8765)</p>
              <p>3. Click Connect to establish the connection</p>
              <p>4. The backend will receive observations and send actions</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

