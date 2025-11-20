// React hook for integrating with RL backend via WebSocket

import { useState, useEffect, useRef, useCallback } from "react";
import {
  RLWebSocketClient,
  getRLWebSocketClient,
  type ObservationData,
  type ActionData,
  type RewardData,
  type BackendState,
} from "../utils/websocketClient.js";
import type { AudioData, AgentMetrics } from "../types/index.js";

interface UseRLBackendOptions {
  enabled: boolean;
  url?: string;
  autoConnect?: boolean;
  onActionReceived?: (action: ActionData) => void;
  onStateUpdate?: (state: BackendState) => void;
}

interface UseRLBackendReturn {
  isConnected: boolean;
  connectionState: "connecting" | "connected" | "disconnected" | "error";
  backendState: BackendState | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  sendObservation: (audioData: AudioData, agentMetrics: AgentMetrics, isTraining: boolean) => void;
  sendReward: (reward: number, done: boolean) => void;
  reset: () => void;
  error: string | null;
}

export const useRLBackend = ({
  enabled,
  url,
  autoConnect = false,
  onActionReceived,
  onStateUpdate,
}: UseRLBackendOptions): UseRLBackendReturn => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<"connecting" | "connected" | "disconnected" | "error">("disconnected");
  const [backendState, setBackendState] = useState<BackendState | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const wsClientRef = useRef<RLWebSocketClient | null>(null);
  const lastObservationRef = useRef<ObservationData | null>(null);

  // Initialize WebSocket client
  useEffect(() => {
    if (enabled) {
      wsClientRef.current = getRLWebSocketClient(url);
      
      // Set up event listeners
      wsClientRef.current.on("connected", () => {
        setIsConnected(true);
        setConnectionState("connected");
        setError(null);
      });

      wsClientRef.current.on("disconnected", () => {
        setIsConnected(false);
        setConnectionState("disconnected");
      });

      wsClientRef.current.on("action", (action: ActionData) => {
        onActionReceived?.(action);
      });

      wsClientRef.current.on("state", (state: BackendState) => {
        setBackendState(state);
        onStateUpdate?.(state);
      });

      wsClientRef.current.on("error", (errorData: any) => {
        setError(errorData.error || "Unknown error");
        setConnectionState("error");
      });

      // Auto-connect if enabled
      if (autoConnect) {
        wsClientRef.current.connect().catch((e) => {
          setError(`Failed to connect: ${e}`);
        });
      }
    }

    return () => {
      if (wsClientRef.current) {
        wsClientRef.current.disconnect();
        wsClientRef.current = null;
      }
    };
  }, [enabled, url, autoConnect, onActionReceived, onStateUpdate]);

  // Update connection state
  useEffect(() => {
    if (wsClientRef.current) {
      const interval = setInterval(() => {
        const state = wsClientRef.current?.getConnectionState() || "disconnected";
        setConnectionState(state);
        setIsConnected(state === "connected");
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [enabled]);

  const connect = useCallback(async () => {
    if (wsClientRef.current) {
      try {
        setConnectionState("connecting");
        await wsClientRef.current.connect();
      } catch (e) {
        setError(`Connection failed: ${e}`);
        setConnectionState("error");
      }
    }
  }, []);

  const disconnect = useCallback(() => {
    if (wsClientRef.current) {
      wsClientRef.current.disconnect();
      setIsConnected(false);
      setConnectionState("disconnected");
    }
  }, []);

  const sendObservation = useCallback((
    audioData: AudioData,
    agentMetrics: AgentMetrics,
    isTraining: boolean
  ) => {
    if (!wsClientRef.current || !isConnected) return;

    const observation: ObservationData = {
      audio: {
        bass: audioData.bass,
        mid: audioData.mid,
        treble: audioData.treble,
        volume: audioData.volume,
      },
      agentState: {
        energy: agentMetrics.energy,
        position: { x: 0, y: 0, z: 0 }, // Would come from physics engine
        velocity: { x: 0, y: 0, z: 0 }, // Would come from physics engine
      },
      environment: {
        noiseLevel: audioData.bass > 0.4 ? "HIGH_NOISE" : "LOW_NOISE",
        training: isTraining,
      },
    };

    lastObservationRef.current = observation;
    wsClientRef.current.sendObservation(observation);
    
    // Request action based on observation
    wsClientRef.current.requestAction(observation);
  }, [isConnected]);

  const sendReward = useCallback((reward: number, done: boolean = false) => {
    if (!wsClientRef.current || !isConnected) return;

    const rewardData: RewardData = {
      reward,
      done,
    };

    wsClientRef.current.sendReward(rewardData);
  }, [isConnected]);

  const reset = useCallback(() => {
    if (wsClientRef.current && isConnected) {
      wsClientRef.current.reset();
    }
  }, [isConnected]);

  return {
    isConnected,
    connectionState,
    backendState,
    connect,
    disconnect,
    sendObservation,
    sendReward,
    reset,
    error,
  };
};

