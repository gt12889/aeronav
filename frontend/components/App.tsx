import { useState, useEffect, useRef, useCallback } from "react";
import { ErrorBoundary } from "./ErrorBoundary.js";
import { crashReporter } from "./CrashReporter.js";
import {
  Activity,
  Server,
  Cpu,
  Zap,
  Mic,
  MicOff,
  Play,
  Terminal as TerminalIcon,
  Radio,
  Layers,
  Volume2,
  Settings,
  FileCode,
  Network,
  BrainCircuit,
  Database,
  LineChart,
  PauseCircle,
  Rocket,
  Waves,
  Users,
  Box,
  Camera,
} from "lucide-react";
import { useAudioAnalyzer } from "../hooks/useAudioAnalyzer.js";
import { usePerformanceProfiler } from "../hooks/usePerformanceProfiler.js";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts.js";
import { SimulationCanvas } from "./SimulationCanvas.js";
import { StatusBadge } from "./StatusBadge.js";
import { MiniChart } from "./MiniChart.js";
import { PerformanceProfiler } from "./PerformanceProfiler.js";
import { DevTools } from "./DevTools.js";
import { ExportMenu } from "./ExportMenu.js";
import { CommandPalette } from "./CommandPalette.js";
import { TrainingDashboard } from "./TrainingDashboard.js";
import { AugmentationPanel } from "./AugmentationPanel.js";
import { MultiAgentDashboard } from "./MultiAgentDashboard.js";
import { RLBackendPanel } from "./RLBackendPanel.js";
import { ModelViewer } from "./ModelViewer.js";
import { WebcamViewer } from "./WebcamViewer.js";
import { VisionControlPanel, type VisionControlConfig, type ControlScheme } from "./VisionControlPanel.js";
import { ObjectDetectionView } from "./ObjectDetectionView.js";
import { PoseEstimationView } from "./PoseEstimationView.js";
import { useRLBackend } from "../hooks/useRLBackend.js";
import { getVisionBackendClient } from "../utils/visionBackendClient.js";
import { exportStateToJSON } from "../utils/exportUtils.js";
import { logger, LogLevel } from "../utils/logger.js";
import { configManager } from "../utils/config.js";
import {
  defaultAgentConfigs,
  initializeAgent,
  selectAction,
  calculateReward,
  updateQTable,
  detectCoordination,
  calculateCoordinationScore,
} from "../utils/multiAgentSystem.js";
import type {
  LogEntry,
  ServiceStatus,
  RLMetrics,
  AgentMetrics,
  AudioData,
  MultiAgentMetrics,
  CoordinationEvent,
  Particle,
  NebulaCloud,
} from "../types/index.js";
import { PROTO_DEFINITION, MAX_LOGS, MAX_GRAPH_POINTS } from "../constants/proto.js";

const App = () => {
  const [isSimRunning, setIsSimRunning] = useState(false);
  const [isTraining, setIsTraining] = useState(false);
  const [useMic, setUseMic] = useState(true);
  const [activeTab, setActiveTab] = useState<"services" | "proto" | "intelligence" | "augmentation" | "multiagent" | "rlbackend" | "vision">("services");
  const [augmentedAudioData, setAugmentedAudioData] = useState<AudioData | null>(null);
  const [sceneData, setSceneData] = useState<{
    spaceship: { x: number; y: number; z: number; roll: number; rotation?: { x: number; y: number; z: number; w: number }; velocity?: { x: number; y: number; z: number } };
    particles: Particle[];
    nebula: NebulaCloud[];
  } | null>(null);
  const [showPerformanceProfiler, setShowPerformanceProfiler] = useState(false);
  const [showDevTools, setShowDevTools] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showModelViewer, setShowModelViewer] = useState(false);
  const [visionControlEnabled, setVisionControlEnabled] = useState(false);
  const [visionConfig, setVisionConfig] = useState<VisionControlConfig>({
    enabled: false,
    scheme: "gesture",
    sensitivity: 0.7,
    smoothing: 0.3,
    deadZone: 0.1,
    gestureThreshold: 0.6,
    maxHands: 1,
    useBackend: false,
    backendUrl: "ws://localhost:8766/ws/vision",
    enableObjectDetection: false,
    enablePoseEstimation: false,
    frameRate: 30,
    presetName: undefined,
  });
  const [currentControlSignal, setCurrentControlSignal] = useState<{
    direction: { x: number; y: number };
    thrust: number;
    action: "IDLE" | "BOOST" | "STABILIZE" | "TURN_LEFT" | "TURN_RIGHT" | "EVADE";
  } | null>(null);
  const [gestureConfidence, setGestureConfidence] = useState<number>(0);
  const [detectedObjects, setDetectedObjects] = useState<Array<{
    class: string;
    classId: number;
    confidence: number;
    boundingBox: { x: number; y: number; width: number; height: number };
  }>>([]);
  const [poseData, setPoseData] = useState<any>(null);
  const [visionBackendConnected, setVisionBackendConnected] = useState(false);
  const [visionBackendError, setVisionBackendError] = useState<string | null>(null);
  const [currentGesture, setCurrentGesture] = useState<string | null>(null);
  const [handsDetected, setHandsDetected] = useState(0);
  const { audioData, startAudio, stopAudio } = useAudioAnalyzer(isSimRunning, isTraining);
  const { metrics, startRenderMeasure, endRenderMeasure } = usePerformanceProfiler(isSimRunning);

  // Simulated Services
  const [services, setServices] = useState<ServiceStatus[]>([
    { name: "Audio-Sensors", status: "OFFLINE", role: "Telemetry", protocol: "ZeroMQ", latency: 0, tech: "Python/PyAudio" },
    { name: "Flight-Control", status: "OFFLINE", role: "Navigation", protocol: "gRPC", latency: 0, tech: "Go/Microservices" },
    { name: "Nav-Agent-01", status: "OFFLINE", role: "Pilot AI", protocol: "gRPC", latency: 0, tech: "C++/Isaac SDK" },
    { name: "Nav-Agent-02", status: "OFFLINE", role: "Pilot AI", protocol: "gRPC", latency: 0, tech: "C++/Isaac SDK" },
    { name: "Nav-Agent-03", status: "OFFLINE", role: "Pilot AI", protocol: "gRPC", latency: 0, tech: "C++/Isaac SDK" },
    { name: "Nav-Agent-04", status: "OFFLINE", role: "Pilot AI", protocol: "gRPC", latency: 0, tech: "C++/Isaac SDK" },
    { name: "Shield-Sys", status: "OFFLINE", role: "Defense", protocol: "gRPC", latency: 0, tech: "Rust" },
    { name: "RL-Optimizer", status: "OFFLINE", role: "Model Trainer", protocol: "gRPC", latency: 0, tech: "Python/PyTorch" },
    { name: "Sim-Env", status: "OFFLINE", role: "Physics Engine", protocol: "DDS", latency: 0, tech: "C++/CUDA" },
  ]);

  const [logs, setLogs] = useState<LogEntry[]>([]);

  // RL Metrics
  const [rlMetrics, setRlMetrics] = useState<RLMetrics>({
    epoch: 0,
    loss: [],
    reward: [],
    accuracy: 0
  });

  // Multi-Agent State
  const [multiAgents, setMultiAgents] = useState<MultiAgentMetrics[]>(() =>
    defaultAgentConfigs.map((config) => initializeAgent(config))
  );
  const [coordinationEvents, setCoordinationEvents] = useState<CoordinationEvent[]>([]);

  // Legacy single agent state (for backward compatibility)
  const [agentMetrics, setAgentMetrics] = useState<AgentMetrics>({
    action: "IDLE",
    confidence: 0.0,
    reward: 0.0,
    energy: 100
  });

  // Agent configs ref
  const agentConfigsRef = useRef(defaultAgentConfigs);

  // RL Backend connection state
  const [rlBackendUrl, setRlBackendUrl] = useState<string>("ws://localhost:8765");
  const [useRLBackend, setUseRLBackend] = useState<boolean>(false);

  // RL Backend connection
  const {
    isConnected: isBackendConnected,
    connectionState: backendConnectionState,
    backendState,
    connect: connectBackend,
    disconnect: disconnectBackend,
    sendObservation: sendBackendObservation,
    sendReward: sendBackendReward,
    reset: resetBackend,
    error: backendError,
  } = useRLBackend({
    enabled: useRLBackend,
    url: rlBackendUrl,
    autoConnect: false,
    onActionReceived: (action) => {
      // Override agent action with backend action if connected
      if (useRLBackend && isBackendConnected) {
        setAgentMetrics((prev) => ({
          ...prev,
          action: action.action,
          confidence: action.confidence,
        }));
      }
    },
    onStateUpdate: (state) => {
      // Update RL metrics from backend
      setRlMetrics((prev) => ({
        ...prev,
        epoch: state.epoch,
        accuracy: state.accuracy,
        loss: [...prev.loss, state.loss].slice(-configManager.getUIConfig().maxGraphPoints),
      }));
    },
  });

  // Refs for simulation loop variables to avoid constant restart of interval
  const audioDataRef = useRef(audioData);
  const servicesRef = useRef(services);
  const isTrainingRef = useRef(isTraining);
  const augmentedAudioDataRef = useRef<AudioData | null>(null);

  useEffect(() => {
    audioDataRef.current = audioData;
  }, [audioData]);

  useEffect(() => {
    servicesRef.current = services;
  }, [services]);

  useEffect(() => {
    isTrainingRef.current = isTraining;
  }, [isTraining]);

  useEffect(() => {
    augmentedAudioDataRef.current = augmentedAudioData;
  }, [augmentedAudioData]);

  const addLog = useCallback((service: string, msg: string, protocol: LogEntry["protocol"], level: LogEntry["level"] = "INFO") => {
    // Use structured logger
    if (level === "DEBUG") {
      logger.debug(service, msg, protocol);
    } else if (level === "INFO") {
      logger.info(service, msg, protocol);
    } else if (level === "WARN") {
      logger.warn(service, msg, protocol);
    } else {
      logger.error(service, msg, protocol);
    }

    // Also add to UI logs for backward compatibility
    setLogs((prev) => {
      const newLog: LogEntry = {
        id: Date.now() + Math.random(),
        timestamp: new Date().toISOString().split("T")[1].slice(0, -1),
        service,
        message: msg,
        protocol,
        level,
      };
      const maxLogs = configManager.getUIConfig().maxLogs;
      return [newLog, ...prev].slice(0, maxLogs);
    });
  }, []);

  // Toggle Training
  const toggleTraining = () => {
    if (!isSimRunning) {
      alert("Start the system first.");
      return;
    }
    const newState = !isTraining;
    setIsTraining(newState);
    addLog("Flight-Control", newState ? "Engaging COMBAT_TRAINING protocol..." : "Engaging STANDARD_PATROL protocol...", "gRPC", "WARN");

    // Update service status based on training mode
    setServices(prev => prev.map(s => {
      if (s.name === "RL-Optimizer") return { ...s, status: newState ? "TRAINING" : "STANDBY" };
      if (s.name === "Sim-Env") return { ...s, status: newState ? "ACTIVE" : "STANDBY" };
      return s;
    }));

    if (newState) setActiveTab("intelligence");
  };

  // Toggle Simulation
  const toggleSimulation = async () => {
    if (isSimRunning) {
      setIsSimRunning(false);
      setIsTraining(false);
      stopAudio();
      setServices((s) => s.map((svc) => ({ ...svc, status: "OFFLINE", latency: 0 })));
      addLog("System", "Shutdown sequence initiated...", undefined, "WARN");
    } else {
      setIsSimRunning(true);
      addLog("System", "Boot sequence initiated...", undefined, "INFO");

      // Simulate startup sequence
      setTimeout(() => {
        setServices((s) => s.map(svc => svc.name === "Audio-Sensors" ? { ...svc, status: "STARTING" } : svc));
        addLog("Audio-Sensors", "Calibrating sensor array...", "ZMQ");
      }, 500);

      setTimeout(() => {
        setServices((s) => s.map(svc => svc.name === "Flight-Control" ? { ...svc, status: "STARTING" } : svc));
        addLog("Flight-Control", "Connecting to main thruster matrix...", "gRPC");
      }, 1200);

      setTimeout(async () => {
        await startAudio(useMic);
        setServices((s) => s.map(svc => {
          if (svc.name === "RL-Optimizer" || svc.name === "Sim-Env") return { ...svc, status: "STANDBY" };
          return { ...svc, status: "ACTIVE", latency: Math.floor(Math.random() * 10) + 2 };
        }));
        addLog("System", "All systems nominal. Flight ready.", "gRPC", "INFO");
      }, 2000);
    }
  };

  // Backend Logic Simulation Loop
  useEffect(() => {
    if (!isSimRunning) return;

    const interval = setInterval(() => {
      const currentAudio = audioDataRef.current;
      const currentServices = servicesRef.current;
      const training = isTrainingRef.current;
      // Use augmented audio if available for RL logic
      const effectiveAudio = augmentedAudioDataRef.current || currentAudio;

      // 1. Calculate Network State Updates (Latency, Drops, Recovery)
      const updatedServices = currentServices.map(s => {
        // Skip if not running
        if (s.status === "OFFLINE" || s.status === "STARTING") return s;

        let next = { ...s };
        const isAgent = s.name.includes("Nav") || s.name.includes("Shield");

        // A. Recovery Logic (15% chance to reconnect if ERROR)
        if (s.status === "ERROR") {
          if (Math.random() < 0.15) {
            addLog(s.name, "Link re-established (Auto-Recovery)", "gRPC", "INFO");
            next.status = training && s.name === "RL-Optimizer" ? "TRAINING" : training && s.name === "Sim-Env" ? "ACTIVE" : "ACTIVE";
            next.latency = 120; // Reconnect penalty
            return next;
          }
          return next;
        }

        // B. Drop/Timeout Logic (2% chance per tick for Agents)
        if (isAgent && Math.random() < 0.02) {
          addLog(s.name, "Telemetry Lost: Signal Dropped", "gRPC", "ERROR");
          next.status = "ERROR";
          next.latency = 0;
          return next;
        }

        // C. Latency Simulation
        let latency = next.latency + (Math.random() * 10 - 5);

        // Lag Spikes
        if (Math.random() < 0.05) {
          const spike = Math.floor(Math.random() * 300) + 50;
          latency += spike;
          if (latency > 250) {
            addLog(s.name, `High latency detected: ${Math.floor(latency)}ms`, "gRPC", "WARN");
          }
        }

        latency = latency * 0.8 + 15;
        next.latency = Math.floor(Math.max(2, latency));

        return next;
      });

      setServices(updatedServices);

      // 2. MULTI-AGENT RL LOGIC
      // Process all agents with different policies
      const activeNavServices = updatedServices.filter(s => s.name.startsWith("Nav-Agent") && s.status === "ACTIVE");
      
      // 3. Simulate Traffic based on Audio Events & Service Status
      const isNavActive = activeNavServices.length > 0;
      
      if (activeNavServices.length > 0) {
        const noiseState = effectiveAudio.bass > 0.4 ? "HIGH_NOISE" : "LOW_NOISE";
        const timestamp = Date.now();

        // Process each agent
        setMultiAgents((prevAgents) => {
          const updatedAgents = prevAgents.map((agent) => {
            const config = agentConfigsRef.current.find((c) => c.id === agent.id);
            if (!config) return agent;

            // Only process if agent's service is active
            const serviceActive = activeNavServices.some((s) => s.name === agent.name);
            if (!serviceActive) return agent;

            // Select action based on policy
            const selectedAction = selectAction(agent, config, noiseState, training);

            // Apply energy cost
            const cost = config.energy.costs[selectedAction as keyof typeof config.energy.costs] || 0;
            const newEnergy = Math.max(0, Math.min(config.energy.max, agent.energy - cost + config.energy.regen));

            // Calculate reward
            const reward = calculateReward(agent, config, noiseState, selectedAction, newEnergy);

            // Update Q-table
            const updatedAgent = { ...agent };
            updateQTable(updatedAgent, config, noiseState, selectedAction, reward);

            // Update agent state
            updatedAgent.action = selectedAction;
            updatedAgent.energy = newEnergy;
            updatedAgent.reward = reward;
            updatedAgent.confidence = updatedAgent.qTable[noiseState][selectedAction];
            updatedAgent.totalSteps += 1;

            return updatedAgent;
          });

          // Detect coordination events
          const newEvents = detectCoordination(updatedAgents, timestamp);
          if (newEvents.length > 0) {
            setCoordinationEvents((prev) => [...prev, ...newEvents].slice(-200)); // Keep last 200 events
          }

          // Update coordination scores
          const recentEvents = coordinationEvents.slice(-50);
          updatedAgents.forEach((agent) => {
            agent.coordinationScore = calculateCoordinationScore(agent, updatedAgents, recentEvents);
          });

          // Update legacy single agent metrics (use first agent for backward compatibility)
          if (updatedAgents.length > 0) {
            const firstAgent = updatedAgents[0];
            setAgentMetrics({
              action: firstAgent.action,
              confidence: firstAgent.confidence,
              reward: firstAgent.reward,
              energy: firstAgent.energy,
            });
          }

          return updatedAgents;
        });
      }

        // G. Logging & Optimizer Interaction (using multi-agent state)
        setMultiAgents((currentAgents) => {
          if (currentAgents.length > 0 && Math.random() > 0.85) {
            const firstAgent = currentAgents[0];
            if (training) {
              addLog(firstAgent.name, `TRAINING_STEP: Action=${firstAgent.action} Reward=${firstAgent.reward.toFixed(2)}`, "gRPC", "DEBUG");
            } else if (firstAgent.reward < 0) {
              addLog(firstAgent.name, `Optimization Alert: Suboptimal maneuver detected (R=${firstAgent.reward.toFixed(2)})`, "gRPC", "WARN");
            }
          }

          if (training && currentAgents.length > 0 && Math.random() > 0.9) {
            addLog("RL-Optimizer", `BATCH_UPDATE: Gradients sync applied to ${currentAgents.length} agents`, "gRPC", "INFO");
          }

          // Send observation to RL backend if connected
          if (useRLBackend && isBackendConnected && currentAgents.length > 0) {
            const firstAgent = currentAgents[0];
            sendBackendObservation(effectiveAudio, firstAgent, training);
            
            // Send reward if training
            if (training) {
              sendBackendReward(firstAgent.reward, false);
            }
          }

          // Sync RL Chart with Agent Performance (aggregate from all agents)
          if (training && currentAgents.length > 0 && Math.random() > 0.5) {
            const avgReward = currentAgents.reduce((sum, a) => sum + a.reward, 0) / currentAgents.length;
            setRlMetrics(prev => {
              const newReward = (prev.reward[prev.reward.length - 1] || 0.5) * 0.9 + avgReward * 0.1; // Smooth it
              return {
                epoch: prev.epoch + 1,
                loss: [...prev.loss, Math.max(0, 1 - newReward)].slice(-configManager.getUIConfig().maxGraphPoints),
                reward: [...prev.reward, Math.max(0, newReward)].slice(-configManager.getUIConfig().maxGraphPoints),
                accuracy: Math.min(0.99, newReward)
              };
            });
          }

          return currentAgents; // Return unchanged
        });
      }

      // Bass Event -> Thrust boost
      const audioConfig = configManager.getSimulationConfig().audio;
      const bassThreshold = training ? audioConfig.bassThreshold.training : audioConfig.bassThreshold.normal;
      if (effectiveAudio.bass > bassThreshold) {
        if (Math.random() > 0.6) {
          addLog(training ? "Sim-Env" : "Audio-Sensors", `EVENT: BASS_KICK { amp: ${effectiveAudio.bass.toFixed(2)} }`, training ? "DDS" : "ZMQ");
        }

        // Only apply thrust if Agent allows or we are in manual override (not impl here, assuming agent has authority)
        const payload = `{ thrust: ${Math.floor(effectiveAudio.bass * 100)}% }`;
        if (Math.random() > 0.8) addLog("Flight-Control", `RPC: ApplyThrust(${payload})`, "gRPC");
      }

    }, 200); // Check every 200ms

    return () => clearInterval(interval);
  }, [isSimRunning, addLog, rlMetrics]);

  // Vision Backend Connection and Detection Handling
  useEffect(() => {
    if (!visionConfig.useBackend || !visionBackendConnected) {
      return;
    }

    const client = getVisionBackendClient(visionConfig.backendUrl);
    
    // Handle detection results
    const handleDetection = (message: any) => {
      if (message.type === "detection") {
        if (visionConfig.enableObjectDetection && message.objects) {
          setDetectedObjects(message.objects);
        }
        if (visionConfig.enablePoseEstimation && message.pose) {
          setPoseData(message.pose);
        }
        // Handle hand detection from backend if needed
        if (message.hands && message.hands.length > 0) {
          setHandsDetected(message.hands.length);
          // Could update gesture from backend
        }
        // Apply control signal from backend
        if (message.control && visionControlEnabled) {
          setAgentMetrics((prev) => ({
            ...prev,
            action: message.control.action,
            confidence: 0.9,
          }));
        }
      }
    };

    client.on("detection", handleDetection);
    client.on("error", (error) => {
      setVisionBackendError(error.error || "Backend error");
    });

    return () => {
      client.off("detection", handleDetection);
    };
  }, [visionConfig.useBackend, visionConfig.enableObjectDetection, visionConfig.enablePoseEstimation, visionBackendConnected, visionControlEnabled]);

  // Keyboard Shortcuts
  useKeyboardShortcuts({
    onLaunch: toggleSimulation,
    onCombat: () => {
      if (isSimRunning) {
        toggleTraining();
      }
    },
    onToggleDevTools: () => setShowDevTools(!showDevTools),
    onTogglePerformance: () => setShowPerformanceProfiler(!showPerformanceProfiler),
    onToggleMic: () => {
      if (!isSimRunning && !isTraining) {
        setUseMic(!useMic);
      }
    },
    onExport: () => {
      // Trigger export menu - could be enhanced to directly export
      exportStateToJSON({
        timestamp: new Date().toISOString(),
        services,
        logs,
        agentMetrics,
        rlMetrics,
        performanceMetrics: metrics,
        audioData,
        isTraining,
        isSimRunning,
      });
    },
    onEscape: () => {
      if (showDevTools) setShowDevTools(false);
      if (showCommandPalette) setShowCommandPalette(false);
    },
  });

  // Command Palette Commands
  const commandPaletteCommands = [
    {
      id: "launch",
      label: "Launch Simulation",
      description: "Start or stop the simulation",
      icon: <Rocket size={16} />,
      shortcut: "Space",
      action: toggleSimulation,
      category: "Simulation",
    },
    {
      id: "combat",
      label: "Toggle Combat Mode",
      description: "Enable or disable combat/training mode",
      icon: <BrainCircuit size={16} />,
      shortcut: "C",
      action: () => {
        if (isSimRunning) toggleTraining();
      },
      category: "Simulation",
    },
    {
      id: "devtools",
      label: "Toggle Dev Tools",
      description: "Open developer tools panel",
      icon: <Settings size={16} />,
      shortcut: "Ctrl+D",
      action: () => setShowDevTools(!showDevTools),
      category: "Tools",
    },
    {
      id: "performance",
      label: "Toggle Performance Profiler",
      description: "Show or hide performance metrics",
      icon: <Activity size={16} />,
      shortcut: "Ctrl+P",
      action: () => setShowPerformanceProfiler(!showPerformanceProfiler),
      category: "Tools",
    },
    {
      id: "mic",
      label: "Toggle Microphone",
      description: "Switch between microphone and synthetic signal",
      icon: <Mic size={16} />,
      shortcut: "Ctrl+M",
      action: () => {
        if (!isSimRunning && !isTraining) {
          setUseMic(!useMic);
        }
      },
      category: "Audio",
    },
    {
      id: "export",
      label: "Export State",
      description: "Export full application state to JSON",
      icon: <Download size={16} />,
      shortcut: "Ctrl+E",
      action: () => {
        exportStateToJSON({
          timestamp: new Date().toISOString(),
          services,
          logs,
          agentMetrics,
          rlMetrics,
          performanceMetrics: metrics,
          audioData,
          isTraining,
          isSimRunning,
        });
      },
      category: "Export",
    },
    {
      id: "model-viewer",
      label: "3D Model Viewer",
      description: "View CAD models and URDF files",
      icon: <Box size={16} />,
      shortcut: "Ctrl+M",
      action: () => setShowModelViewer(true),
      category: "Tools",
    },
  ];

  // Handle Ctrl+K for command palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setShowCommandPalette(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-[#050505] text-slate-300 font-mono flex flex-col">
      {/* Header */}
      <header className="h-16 border-b border-slate-800 bg-slate-950 flex items-center justify-between px-6 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Activity className="text-sky-500" />
          <h1 className="text-xl font-bold tracking-widest text-slate-100">
            AERO<span className="text-sky-500">NAV</span>SIM
            <span className="ml-2 text-xs text-slate-500 font-normal border border-slate-800 px-1 rounded">
              v3.4-FLIGHT
            </span>
          </h1>
        </div>

        <div className="flex items-center gap-6">
          {isSimRunning && (
            <button
              onClick={toggleTraining}
              className={`flex items-center gap-2 px-3 py-1 rounded text-xs border transition-all ${
                isTraining
                  ? "bg-amber-900/20 border-amber-500 text-amber-500 animate-pulse"
                  : "bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200"
              }`}
            >
              {isTraining ? <BrainCircuit size={14} /> : <Rocket size={14} />}
              {isTraining ? "COMBAT SIM ACTIVE" : "ENABLE COMBAT SIM"}
            </button>
          )}

          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span className={`w-2 h-2 rounded-full ${isSimRunning ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></span>
            {isSimRunning ? 'UPLINK SECURE' : 'OFFLINE'}
          </div>
          <div className="h-8 w-[1px] bg-slate-800"></div>
          <div className="flex gap-2">
            <ExportMenu
              logs={logs}
              services={services}
              agentMetrics={agentMetrics}
              rlMetrics={rlMetrics}
              performanceMetrics={metrics}
              audioData={audioData}
              isTraining={isTraining}
              isSimRunning={isSimRunning}
              sceneData={sceneData || undefined}
            />
            <button
              onClick={() => setShowDevTools(!showDevTools)}
              className={`p-2 rounded border ${showDevTools ? 'border-indigo-500 text-indigo-400 bg-indigo-900/20' : 'border-slate-700 text-slate-500 hover:text-slate-300'} transition-colors`}
              title="Open Developer Tools"
            >
              <Settings size={18} />
            </button>
            <button
              onClick={() => setShowPerformanceProfiler(!showPerformanceProfiler)}
              className={`p-2 rounded border ${showPerformanceProfiler ? 'border-sky-500 text-sky-400 bg-sky-900/20' : 'border-slate-700 text-slate-500 hover:text-slate-300'} transition-colors`}
              title="Toggle Performance Profiler"
            >
              <Activity size={18} />
            </button>
            <button
              onClick={() => setUseMic(!useMic)}
              disabled={isSimRunning || isTraining}
              className={`p-2 rounded border ${useMic ? 'border-emerald-900 text-emerald-400 bg-emerald-900/10' : 'border-slate-700 text-slate-500'} transition-colors`}
              title={useMic ? "Microphone Input" : "Generated Signal"}
            >
              {useMic ? <Mic size={18} /> : <Radio size={18} />}
            </button>
            <button
              onClick={toggleSimulation}
              className={`flex items-center gap-2 px-4 py-1.5 rounded font-bold border transition-all ${
                isSimRunning
                  ? "bg-red-950/30 border-red-500 text-red-500 hover:bg-red-900/50"
                  : "bg-sky-950/30 border-sky-500 text-sky-500 hover:bg-sky-900/50"
              }`}
            >
              {isSimRunning ? <MicOff size={18} /> : <Play size={18} />}
              {isSimRunning ? "ABORT" : "LAUNCH"}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left: 3D Sim View */}
        <section className="flex-1 flex flex-col border-r border-slate-800 relative">
            <div className="absolute top-4 left-4 z-10 pointer-events-none">
            <h2 className="text-xs text-slate-500 uppercase tracking-wider mb-1">Optical Sensor Feed: CAM-04</h2>
            <div className="flex gap-2 text-[10px] font-mono text-sky-500">
              <div>FPS: {showPerformanceProfiler ? metrics.fps : (isSimRunning ? (isTraining ? 144 : 60) : 0)}</div>
              <div>LATENCY: {isSimRunning ? '4.2ms' : '-'}</div>
            </div>
          </div>

          {/* The Canvas */}
          <div className="flex-1 bg-slate-950 relative overflow-hidden">
            <ErrorBoundary
              onError={(error, errorInfo) => {
                crashReporter.reportError(error, errorInfo, {
                  component: "SimulationCanvas",
                });
              }}
            >
              <ErrorBoundary
              onError={(error, errorInfo) => {
                crashReporter.reportError(error, errorInfo, {
                  component: "SimulationCanvas",
                });
              }}
            >
              <SimulationCanvas 
                data={effectiveAudioData} 
                isTraining={isTraining} 
                agentMetrics={agentMetrics}
                onRenderStart={startRenderMeasure}
                onRenderEnd={endRenderMeasure}
                onSceneDataUpdate={setSceneData}
              />
            </ErrorBoundary>
            </ErrorBoundary>
            <PerformanceProfiler metrics={metrics} isVisible={showPerformanceProfiler} />

            {/* Overlay Data */}
            {isSimRunning && (
              <div className="absolute bottom-4 right-4 flex gap-2">
                <div className="bg-slate-900/80 backdrop-blur p-2 rounded border border-slate-700 w-16">
                  <div className="h-20 bg-slate-800 rounded-sm relative flex items-end overflow-hidden">
                    <div className="w-full bg-purple-500 transition-all duration-75" style={{ height: `${effectiveAudioData.bass * 100}%` }}></div>
                  </div>
                  <div className="text-[10px] text-center mt-1 text-slate-400">ENG.1</div>
                </div>
                <div className="bg-slate-900/80 backdrop-blur p-2 rounded border border-slate-700 w-16">
                  <div className="h-20 bg-slate-800 rounded-sm relative flex items-end overflow-hidden">
                    <div className="w-full bg-sky-500 transition-all duration-75" style={{ height: `${effectiveAudioData.mid * 100}%` }}></div>
                  </div>
                  <div className="text-[10px] text-center mt-1 text-slate-400">NAV</div>
                </div>
                <div className="bg-slate-900/80 backdrop-blur p-2 rounded border border-slate-700 w-16">
                  <div className="h-20 bg-slate-800 rounded-sm relative flex items-end overflow-hidden">
                    <div className="w-full bg-emerald-500 transition-all duration-75" style={{ height: `${effectiveAudioData.treble * 100}%` }}></div>
                  </div>
                  <div className="text-[10px] text-center mt-1 text-slate-400">COMMS</div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Right: Architecture & Logs */}
        <aside className="w-[450px] flex flex-col bg-[#0B1120] border-l border-slate-800">
          {/* Tabs */}
          <div className="flex border-b border-slate-800 bg-slate-900">
            <button
              onClick={() => setActiveTab("services")}
              className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === "services" ? "text-sky-400 border-b-2 border-sky-400 bg-slate-800" : "text-slate-500 hover:text-slate-300"}`}
            >
              <Server size={14} /> SYSTEMS
            </button>
            <button
              onClick={() => setActiveTab("intelligence")}
              className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === "intelligence" ? "text-amber-400 border-b-2 border-amber-400 bg-slate-800" : "text-slate-500 hover:text-slate-300"}`}
            >
              <BrainCircuit size={14} /> AUTOPILOT
            </button>
            <button
              onClick={() => setActiveTab("proto")}
              className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === "proto" ? "text-indigo-400 border-b-2 border-indigo-400 bg-slate-800" : "text-slate-500 hover:text-slate-300"}`}
            >
              <FileCode size={14} /> PROTO
            </button>
            <button
              onClick={() => setActiveTab("augmentation")}
              className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === "augmentation" ? "text-purple-400 border-b-2 border-purple-400 bg-slate-800" : "text-slate-500 hover:text-slate-300"}`}
            >
              <Waves size={14} /> AUGMENT
            </button>
            <button
              onClick={() => setActiveTab("rlbackend")}
              className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === "rlbackend" ? "text-cyan-400 border-b-2 border-cyan-400 bg-slate-800" : "text-slate-500 hover:text-slate-300"}`}
            >
              <Network size={14} /> BACKEND
            </button>
            <button
              onClick={() => setActiveTab("vision")}
              className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === "vision" ? "text-green-400 border-b-2 border-green-400 bg-slate-800" : "text-slate-500 hover:text-slate-300"}`}
            >
              <Camera size={14} /> VISION
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === "services" ? (
            <div className="p-4 border-b border-slate-800">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-slate-400 flex items-center gap-2">
                  <Network size={14} /> AVIONICS MESH
                </h2>
                <span className="text-xs text-slate-600 font-mono">CLUSTER: alpha-one</span>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {services.map((s) => (
                  <div key={s.name} className={`bg-slate-900 border p-3 rounded flex items-center justify-between group transition-colors ${s.status === "ERROR" ? "border-red-900/50 bg-red-900/5" : s.status === "TRAINING" ? "border-amber-900/50 bg-amber-900/5" : "border-slate-800 hover:border-slate-600"}`}>
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded bg-slate-950 text-slate-400 ${s.status === 'ACTIVE' ? 'text-sky-500' : s.status === 'TRAINING' ? 'text-amber-500' : s.status === 'ERROR' ? 'text-red-500' : ''}`}>
                        {s.name.includes("Audio") ? <Mic size={16} /> :
                          s.name.includes("Control") ? <Cpu size={16} /> :
                            s.name.includes("RL") ? <BrainCircuit size={16} /> :
                              s.name.includes("Sim") ? <Database size={16} /> :
                                s.name.includes("Nav") ? <Rocket size={16} /> : <Zap size={16} />}
                      </div>
                      <div>
                        <div className="text-xs text-slate-300 font-bold">{s.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{s.role} • {s.tech}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <StatusBadge status={s.status} />
                      {(s.status === "ACTIVE" || s.status === "TRAINING") && (
                        <div className={`text-[10px] mt-1 font-mono ${s.latency > 150 ? 'text-yellow-500 animate-pulse' : 'text-slate-500'}`}>
                          {s.latency}ms
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : activeTab === "intelligence" ? (
            <div className="flex-1 flex flex-col min-h-0 border-b border-slate-800">
              <TrainingDashboard
                rlMetrics={rlMetrics}
                agentMetrics={agentMetrics}
                isTraining={isTraining}
                onStartTraining={() => {
                  if (isSimRunning && !isTraining) {
                    toggleTraining();
                  }
                }}
                onStopTraining={() => {
                  if (isSimRunning && isTraining) {
                    toggleTraining();
                  }
                }}
                onResetMetrics={() => {
                  setRlMetrics({
                    epoch: 0,
                    loss: [],
                    reward: [],
                    accuracy: 0,
                  });
                }}
              />
            </div>
          ) : activeTab === "augmentation" ? (
            <div className="flex-1 flex flex-col min-h-0 border-b border-slate-800">
              <AugmentationPanel
                originalAudioData={audioData}
                onAugmentedDataChange={setAugmentedAudioData}
                isActive={isTraining}
              />
            </div>
          ) : activeTab === "multiagent" ? (
            <div className="flex-1 flex flex-col min-h-0 border-b border-slate-800">
              <MultiAgentDashboard
                agents={multiAgents}
                coordinationEvents={coordinationEvents}
                isTraining={isTraining}
              />
            </div>
          ) : activeTab === "rlbackend" ? (
            <div className="flex-1 flex flex-col min-h-0 border-b border-slate-800">
              <RLBackendPanel
                isConnected={isBackendConnected}
                connectionState={backendConnectionState}
                backendState={backendState}
                error={backendError}
                onConnect={connectBackend}
                onDisconnect={disconnectBackend}
                onReset={resetBackend}
                url={rlBackendUrl}
                onUrlChange={setRlBackendUrl}
              />
            </div>
          ) : activeTab === "vision" ? (
            <div className="flex-1 flex flex-col min-h-0 border-b border-slate-800 overflow-y-auto">
              <div className="p-4 border-b border-slate-800">
                <div className="mb-4">
                  <h2 className="text-sm font-bold text-slate-400 flex items-center gap-2 mb-2">
                    <Camera size={14} /> Vision-Based Control
                  </h2>
                  <p className="text-xs text-slate-500">
                    Use hand gestures to control the rocket. Configure sensitivity and control scheme below.
                  </p>
                </div>
              </div>

              {/* Control Panel */}
              <div className="p-4 border-b border-slate-800">
                <VisionControlPanel
                  config={visionConfig}
                  onConfigChange={(newConfig) => {
                    setVisionConfig(newConfig);
                    setVisionControlEnabled(newConfig.enabled);
                    
                    // Connect/disconnect backend if needed
                    if (newConfig.useBackend && !visionBackendConnected) {
                      const client = getVisionBackendClient(newConfig.backendUrl);
                      client.connect().then(() => {
                        setVisionBackendConnected(true);
                        setVisionBackendError(null);
                      }).catch((err) => {
                        setVisionBackendError(err.message);
                        setVisionBackendConnected(false);
                      });
                    } else if (!newConfig.useBackend && visionBackendConnected) {
                      const client = getVisionBackendClient();
                      client.disconnect();
                      setVisionBackendConnected(false);
                    }
                  }}
                  isActive={visionControlEnabled && isSimRunning}
                  handsDetected={handsDetected}
                  currentGesture={currentGesture}
                  backendConnected={visionBackendConnected}
                  backendError={visionBackendError}
                />
              </div>

              {/* Webcam Viewer */}
              <div className="p-4">
                <WebcamViewer
                  enabled={visionControlEnabled && isSimRunning}
                  detectionInterval={1000 / (visionConfig.frameRate || 30)}
                  onControlUpdate={(control) => {
                    // Store control signal for display
                    setCurrentControlSignal(control);

                    // Apply vision control based on scheme
                    if (visionControlEnabled && visionConfig.enabled) {
                      // Apply smoothing
                      const smoothedDirection = {
                        x: control.direction.x * visionConfig.sensitivity,
                        y: control.direction.y * visionConfig.sensitivity,
                      };

                      // Apply dead zone
                      if (
                        Math.abs(smoothedDirection.x) < visionConfig.deadZone &&
                        Math.abs(smoothedDirection.y) < visionConfig.deadZone
                      ) {
                        // In dead zone, don't update
                        return;
                      }

                      // Override agent action with vision control
                      if (control.action !== "IDLE") {
                        setAgentMetrics((prev) => ({
                          ...prev,
                          action: control.action,
                          confidence: 0.9,
                        }));
                      }
                    }
                  }}
                  onHandsDetected={setHandsDetected}
                  onGestureDetected={(gesture) => {
                    if (gesture && typeof gesture === "object" && "type" in gesture) {
                      setCurrentGesture(gesture.type);
                      setGestureConfidence((gesture as any).confidence || 0);
                    } else {
                      setCurrentGesture(gesture);
                      setGestureConfidence(0);
                    }
                  }}
                  showOverlay={true}
                />
              </div>
            </div>
          ) : (
            <div className="p-0 border-b border-slate-800 h-[250px] flex flex-col">
              <div className="bg-slate-950 p-2 border-b border-slate-800 text-[10px] text-slate-500 font-mono">
                src/proto/aeronav.proto
              </div>
              <div className="flex-1 overflow-auto p-4 bg-[#050505] text-xs font-mono text-indigo-300/90 leading-relaxed whitespace-pre">
                {PROTO_DEFINITION}
              </div>
            </div>
          )}

          {/* System Logs */}
          <div className="flex-1 flex flex-col min-h-0 bg-[#0B1120]">
            <div className="p-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4">
              <span className="text-xs text-slate-400 flex items-center gap-2">
                <TerminalIcon size={12} /> BLACK BOX LOGS
              </span>
              <span className="text-[10px] text-slate-600 font-mono">/var/log/sys.log</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-2">
              {logs.length === 0 && (
                <div className="text-slate-600 italic text-center mt-10">Waiting for flight computer...</div>
              )}
              {logs.map((log) => (
                <div key={log.id} className="flex gap-2 animate-in fade-in slide-in-from-bottom-1 duration-300">
                  <span className="text-slate-600 shrink-0">[{log.timestamp}]</span>
                  <div className="flex-1 break-all">
                    <span className={`${
                      log.level === "ERROR" ? "text-red-500 font-bold" :
                        log.level === "WARN" ? "text-yellow-500" :
                          log.level === "DEBUG" ? "text-indigo-400" : "text-sky-400"
                      } mr-2`}>
                      {log.level}
                    </span>
                    {log.protocol && (
                      <span className={`px-1 rounded text-[10px] mr-2 ${
                        log.protocol === 'gRPC' ? 'bg-sky-900/30 text-sky-300' :
                          log.protocol === 'ZMQ' ? 'bg-yellow-900/30 text-yellow-300' :
                            log.protocol === 'DDS' ? 'bg-indigo-900/30 text-indigo-300' : 'bg-slate-800 text-slate-300'
                        }`}>
                        {log.protocol}
                      </span>
                    )}
                    <span className="text-slate-300">{log.message}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </main>

      {/* Command Palette */}
      <CommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        commands={commandPaletteCommands}
      />

      {/* Model Viewer */}
      <ModelViewer
        isOpen={showModelViewer}
        onClose={() => setShowModelViewer(false)}
      />

      {/* Dev Tools Modal */}
      <DevTools
        isOpen={showDevTools}
        onClose={() => setShowDevTools(false)}
        services={services}
        logs={logs}
        agentMetrics={agentMetrics}
        rlMetrics={rlMetrics}
        performanceMetrics={metrics}
        onNetworkSimulationChange={(packetLoss, latency) => {
          // Apply network simulation to services
          setServices((prev) => prev.map((s) => ({
            ...s,
            latency: s.status === "ACTIVE" || s.status === "TRAINING" 
              ? Math.max(2, s.latency + latency + (Math.random() * packetLoss * 10))
              : s.latency
          })));
        }}
        onClearLogs={() => setLogs([])}
        onExportState={() => {
          exportStateToJSON({
            timestamp: new Date().toISOString(),
            services,
            logs,
            agentMetrics,
            rlMetrics,
            performanceMetrics: metrics,
            audioData,
            isTraining,
            isSimRunning,
          });
        }}
      />
    </div>
  );
};

export default App;

