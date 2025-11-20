// Multi-agent RL system with different policies and coordination

import type { MultiAgentMetrics, AgentPolicy, CoordinationEvent, AudioData } from "../types/index.js";
import { configManager } from "./config.js";

export interface AgentConfig {
  id: string;
  name: string;
  policy: AgentPolicy;
  epsilon: {
    normal: number;
    training: number;
  };
  learningRate: number;
  energy: {
    max: number;
    regen: number;
    costs: {
      GLIDE: number;
      BOOST: number;
      STABILIZE: number;
    };
  };
}

export const defaultAgentConfigs: AgentConfig[] = [
  {
    id: "nav-01",
    name: "Nav-Agent-01",
    policy: "balanced",
    epsilon: { normal: 0.05, training: 0.3 },
    learningRate: 0.1,
    energy: { max: 100, regen: 1.5, costs: { GLIDE: 0.5, BOOST: 5, STABILIZE: 3 } },
  },
  {
    id: "nav-02",
    name: "Nav-Agent-02",
    policy: "conservative",
    epsilon: { normal: 0.02, training: 0.2 },
    learningRate: 0.08,
    energy: { max: 100, regen: 1.2, costs: { GLIDE: 0.3, BOOST: 6, STABILIZE: 4 } },
  },
  {
    id: "nav-03",
    name: "Nav-Agent-03",
    policy: "aggressive",
    epsilon: { normal: 0.1, training: 0.4 },
    learningRate: 0.15,
    energy: { max: 100, regen: 2.0, costs: { GLIDE: 0.7, BOOST: 4, STABILIZE: 2 } },
  },
  {
    id: "nav-04",
    name: "Nav-Agent-04",
    policy: "exploratory",
    epsilon: { normal: 0.15, training: 0.5 },
    learningRate: 0.12,
    energy: { max: 100, regen: 1.5, costs: { GLIDE: 0.5, BOOST: 5, STABILIZE: 3 } },
  },
];

/**
 * Initialize agent state with policy-specific Q-tables
 */
export const initializeAgent = (config: AgentConfig): MultiAgentMetrics => {
  // Policy-specific initial Q-values
  let initialQValues: {
    LOW_NOISE: { GLIDE: number; BOOST: number; STABILIZE: number };
    HIGH_NOISE: { GLIDE: number; BOOST: number; STABILIZE: number };
  };

  switch (config.policy) {
    case "conservative":
      // Prefer GLIDE and STABILIZE, avoid BOOST
      initialQValues = {
        LOW_NOISE: { GLIDE: 0.9, BOOST: 0.3, STABILIZE: 0.7 },
        HIGH_NOISE: { GLIDE: 0.5, BOOST: 0.2, STABILIZE: 0.95 },
      };
      break;
    case "aggressive":
      // Prefer BOOST, less conservative
      initialQValues = {
        LOW_NOISE: { GLIDE: 0.6, BOOST: 0.9, STABILIZE: 0.4 },
        HIGH_NOISE: { GLIDE: 0.3, BOOST: 0.7, STABILIZE: 0.8 },
      };
      break;
    case "exploratory":
      // More balanced, higher exploration
      initialQValues = {
        LOW_NOISE: { GLIDE: 0.7, BOOST: 0.6, STABILIZE: 0.5 },
        HIGH_NOISE: { GLIDE: 0.4, BOOST: 0.5, STABILIZE: 0.7 },
      };
      break;
    case "exploitative":
      // Strong preference for best known actions
      initialQValues = {
        LOW_NOISE: { GLIDE: 0.95, BOOST: 0.4, STABILIZE: 0.6 },
        HIGH_NOISE: { GLIDE: 0.3, BOOST: 0.2, STABILIZE: 0.98 },
      };
      break;
    case "balanced":
    default:
      // Default balanced approach
      initialQValues = {
        LOW_NOISE: { GLIDE: 0.8, BOOST: 0.6, STABILIZE: 0.2 },
        HIGH_NOISE: { GLIDE: 0.1, BOOST: 0.3, STABILIZE: 0.9 },
      };
      break;
  }

  return {
    id: config.id,
    name: config.name,
    policy: config.policy,
    action: "IDLE",
    confidence: 0.0,
    reward: 0.0,
    energy: config.energy.max,
    qTable: initialQValues,
    totalSteps: 0,
    coordinationScore: 0.5,
  };
};

/**
 * Select action based on policy and epsilon-greedy strategy
 */
export const selectAction = (
  agent: MultiAgentMetrics,
  config: AgentConfig,
  noiseState: "LOW_NOISE" | "HIGH_NOISE",
  isTraining: boolean
): "GLIDE" | "BOOST" | "STABILIZE" => {
  const epsilon = isTraining ? config.epsilon.training : config.epsilon.normal;
  const qValues = agent.qTable[noiseState];

  // Epsilon-greedy: explore or exploit
  if (Math.random() < epsilon) {
    // Exploration: random action (policy-dependent)
    const actions: ("GLIDE" | "BOOST" | "STABILIZE")[] = ["GLIDE", "BOOST", "STABILIZE"];
    
    // Policy affects exploration distribution
    if (config.policy === "exploratory") {
      return actions[Math.floor(Math.random() * actions.length)];
    } else if (config.policy === "conservative") {
      // Conservative agents explore less risky actions
      const safeActions: ("GLIDE" | "STABILIZE")[] = ["GLIDE", "STABILIZE"];
      return safeActions[Math.floor(Math.random() * safeActions.length)];
    } else if (config.policy === "aggressive") {
      // Aggressive agents explore BOOST more
      const aggressiveActions: ("BOOST" | "STABILIZE")[] = ["BOOST", "STABILIZE"];
      return aggressiveActions[Math.floor(Math.random() * aggressiveActions.length)];
    }
    
    return actions[Math.floor(Math.random() * actions.length)];
  } else {
    // Exploitation: choose best Q-value
    return Object.keys(qValues).reduce((a, b) =>
      qValues[a as keyof typeof qValues] > qValues[b as keyof typeof qValues] ? a : b
    ) as "GLIDE" | "BOOST" | "STABILIZE";
  }
};

/**
 * Calculate reward based on policy and action
 */
export const calculateReward = (
  agent: MultiAgentMetrics,
  config: AgentConfig,
  noiseState: "LOW_NOISE" | "HIGH_NOISE",
  selectedAction: "GLIDE" | "BOOST" | "STABILIZE",
  energyLevel: number
): number => {
  let reward = 0;

  // Base reward logic
  if (noiseState === "HIGH_NOISE") {
    if (selectedAction === "STABILIZE") reward = 0.9;
    else if (selectedAction === "BOOST") reward = 0.3;
    else reward = 0.1;
  } else {
    if (selectedAction === "BOOST") reward = 0.8;
    else if (selectedAction === "GLIDE") reward = 0.7;
    else reward = 0.2;
  }

  // Policy-specific adjustments
  switch (config.policy) {
    case "conservative":
      // Penalize risky actions more
      if (selectedAction === "BOOST") reward -= 0.2;
      // Reward energy conservation
      if (energyLevel > 70) reward += 0.1;
      break;
    case "aggressive":
      // Reward aggressive actions
      if (selectedAction === "BOOST") reward += 0.1;
      // Less penalty for low energy
      if (energyLevel < 20) reward -= 0.2;
      break;
    case "exploratory":
      // Neutral, exploration is its own reward
      break;
    case "exploitative":
      // Strong reward for optimal actions
      if ((noiseState === "HIGH_NOISE" && selectedAction === "STABILIZE") ||
          (noiseState === "LOW_NOISE" && selectedAction === "BOOST")) {
        reward += 0.2;
      }
      break;
  }

  // Energy penalty
  if (energyLevel < 20) reward -= 0.5;
  if (energyLevel > 80) reward += 0.1;

  return Math.max(-1, Math.min(1, reward));
};

/**
 * Update Q-table based on reward
 */
export const updateQTable = (
  agent: MultiAgentMetrics,
  config: AgentConfig,
  noiseState: "LOW_NOISE" | "HIGH_NOISE",
  selectedAction: "GLIDE" | "BOOST" | "STABILIZE",
  reward: number
): void => {
  const currentQ = agent.qTable[noiseState][selectedAction];
  const newQ = currentQ + config.learningRate * (reward - currentQ);
  agent.qTable[noiseState][selectedAction] = Math.max(0, Math.min(1, newQ));
};

/**
 * Detect coordination events between agents
 */
export const detectCoordination = (
  agents: MultiAgentMetrics[],
  timestamp: number
): CoordinationEvent[] => {
  const events: CoordinationEvent[] = [];

  for (let i = 0; i < agents.length; i++) {
    for (let j = i + 1; j < agents.length; j++) {
      const agent1 = agents[i];
      const agent2 = agents[j];

      // Check for conflicts (opposite actions)
      if (
        (agent1.action === "BOOST" && agent2.action === "STABILIZE") ||
        (agent1.action === "STABILIZE" && agent2.action === "BOOST")
      ) {
        events.push({
          timestamp,
          agent1: agent1.id,
          agent2: agent2.id,
          type: "conflict",
          description: `${agent1.name} (${agent1.action}) conflicts with ${agent2.name} (${agent2.action})`,
        });
      }

      // Check for cooperation (same optimal action)
      if (
        agent1.action === agent2.action &&
        agent1.action !== "IDLE" &&
        agent1.confidence > 0.7 &&
        agent2.confidence > 0.7
      ) {
        events.push({
          timestamp,
          agent1: agent1.id,
          agent2: agent2.id,
          type: "cooperation",
          description: `${agent1.name} and ${agent2.name} both choose ${agent1.action}`,
        });
      }

      // Check for independence (different but compatible actions)
      if (
        agent1.action !== agent2.action &&
        agent1.action !== "IDLE" &&
        agent2.action !== "IDLE" &&
        !(
          (agent1.action === "BOOST" && agent2.action === "STABILIZE") ||
          (agent1.action === "STABILIZE" && agent2.action === "BOOST")
        )
      ) {
        events.push({
          timestamp,
          agent1: agent1.id,
          agent2: agent2.id,
          type: "independence",
          description: `${agent1.name} (${agent1.action}) and ${agent2.name} (${agent2.action}) act independently`,
        });
      }
    }
  }

  return events;
};

/**
 * Calculate coordination score for an agent
 */
export const calculateCoordinationScore = (
  agent: MultiAgentMetrics,
  allAgents: MultiAgentMetrics[],
  recentEvents: CoordinationEvent[]
): number => {
  let score = 0.5; // Base score

  // Count cooperation events
  const cooperationEvents = recentEvents.filter(
    (e) =>
      (e.agent1 === agent.id || e.agent2 === agent.id) && e.type === "cooperation"
  ).length;

  // Count conflict events
  const conflictEvents = recentEvents.filter(
    (e) =>
      (e.agent1 === agent.id || e.agent2 === agent.id) && e.type === "conflict"
  ).length;

  // Calculate score
  const totalRelevantEvents = cooperationEvents + conflictEvents;
  if (totalRelevantEvents > 0) {
    score = cooperationEvents / totalRelevantEvents;
  }

  // Adjust based on agent's confidence
  score = score * 0.7 + agent.confidence * 0.3;

  return Math.max(0, Math.min(1, score));
};

/**
 * Get policy color for visualization
 */
export const getPolicyColor = (policy: AgentPolicy): string => {
  switch (policy) {
    case "conservative":
      return "#3b82f6"; // Blue
    case "aggressive":
      return "#ef4444"; // Red
    case "balanced":
      return "#10b981"; // Green
    case "exploratory":
      return "#f59e0b"; // Amber
    case "exploitative":
      return "#8b5cf6"; // Purple
    default:
      return "#6b7280"; // Gray
  }
};

/**
 * Get policy description
 */
export const getPolicyDescription = (policy: AgentPolicy): string => {
  switch (policy) {
    case "conservative":
      return "Risk-averse, prefers energy conservation";
    case "aggressive":
      return "High-risk, high-reward strategy";
    case "balanced":
      return "Moderate risk, adaptive behavior";
    case "exploratory":
      return "High exploration, learns quickly";
    case "exploitative":
      return "Optimizes known good actions";
    default:
      return "Unknown policy";
  }
};

