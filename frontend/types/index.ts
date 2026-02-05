// Type definitions for AeroNavSim

export interface AudioData {
  bass: number;
  mid: number;
  treble: number;
  volume: number;
}

export interface LogEntry {
  id: number;
  timestamp: string;
  service: string;
  level: "INFO" | "WARN" | "DEBUG" | "ERROR";
  message: string;
  protocol?: "ZMQ" | "gRPC" | "DDS";
}

export interface ServiceStatus {
  name: string;
  status: "OFFLINE" | "STARTING" | "ONLINE" | "ACTIVE" | "ERROR" | "STANDBY" | "TRAINING";
  role: string;
  protocol: string;
  latency: number;
  tech?: string;
}

export interface RLMetrics {
  epoch: number;
  loss: number[];
  reward: number[];
  accuracy: number;
}

export interface AgentMetrics {
  action: "IDLE" | "GLIDE" | "BOOST" | "STABILIZE";
  confidence: number;
  reward: number;
  energy: number;
}

export type AgentPolicy = "conservative" | "aggressive" | "balanced" | "exploratory" | "exploitative";

export interface MultiAgentMetrics {
  id: string;
  name: string;
  policy: AgentPolicy;
  action: "IDLE" | "GLIDE" | "BOOST" | "STABILIZE";
  confidence: number;
  reward: number;
  energy: number;
  qTable: {
    LOW_NOISE: { GLIDE: number; BOOST: number; STABILIZE: number };
    HIGH_NOISE: { GLIDE: number; BOOST: number; STABILIZE: number };
  };
  totalSteps: number;
  coordinationScore: number; // How well this agent coordinates with others
}

export interface CoordinationEvent {
  timestamp: number;
  agent1: string;
  agent2: string;
  type: "conflict" | "cooperation" | "independence";
  description: string;
}

export interface Particle {
  x: number;
  y: number;
  z: number; // pseudo depth
  vx: number;
  vy: number;
  size: number;
  type: 'bit' | 'block';
}

export interface NebulaCloud {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  baseHue: number;
  phase: number;
}

export interface PerformanceMetrics {
  fps: number;
  frameTime: number; // milliseconds
  memoryUsage?: number; // MB (if available)
  renderTime: number; // milliseconds
  audioProcessingTime?: number; // milliseconds
  physicsStepTime?: number; // milliseconds
  lastUpdate: number; // timestamp
  // Backend info for WASM vs JS comparison
  physicsBackend?: 'wasm' | 'js' | 'loading';
  audioBackend?: 'wasm' | 'js' | 'loading';
}

