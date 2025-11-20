// WebSocket client for connecting to Python RL backend

export interface RLMessage {
  type: "observation" | "action" | "reward" | "reset" | "state" | "error";
  data: any;
  timestamp?: number;
}

export interface ObservationData {
  audio: {
    bass: number;
    mid: number;
    treble: number;
    volume: number;
  };
  agentState: {
    energy: number;
    position: { x: number; y: number; z: number };
    velocity: { x: number; y: number; z: number };
  };
  environment: {
    noiseLevel: "LOW_NOISE" | "HIGH_NOISE";
    training: boolean;
  };
}

export interface ActionData {
  action: "GLIDE" | "BOOST" | "STABILIZE" | "IDLE";
  confidence: number;
  qValues?: {
    GLIDE: number;
    BOOST: number;
    STABILIZE: number;
  };
}

export interface RewardData {
  reward: number;
  done: boolean;
  info?: Record<string, any>;
}

export interface BackendState {
  epoch: number;
  loss: number;
  accuracy: number;
  learningRate: number;
  epsilon: number;
  replayBufferSize: number;
}

export class RLWebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private reconnectDelay: number = 1000;
  private isConnecting: boolean = false;
  private messageQueue: RLMessage[] = [];
  private listeners: Map<string, Set<(data: any) => void>> = new Map();

  constructor(url: string = "ws://localhost:8765") {
    this.url = url;
  }

  /**
   * Connect to the WebSocket server
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
        resolve();
        return;
      }

      this.isConnecting = true;

      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log("[RL WebSocket] Connected to backend");
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          
          // Send queued messages
          while (this.messageQueue.length > 0) {
            const msg = this.messageQueue.shift();
            if (msg) this.send(msg);
          }
          
          this.emit("connected", {});
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: RLMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (e) {
            console.error("[RL WebSocket] Failed to parse message:", e);
            this.emit("error", { error: "Failed to parse message", original: e });
          }
        };

        this.ws.onerror = (error) => {
          console.error("[RL WebSocket] Connection error:", error);
          this.isConnecting = false;
          this.emit("error", { error: "WebSocket error", original: error });
          reject(error);
        };

        this.ws.onclose = () => {
          console.log("[RL WebSocket] Connection closed");
          this.isConnecting = false;
          this.emit("disconnected", {});
          
          // Attempt to reconnect
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff
            console.log(`[RL WebSocket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            setTimeout(() => this.connect(), delay);
          } else {
            console.error("[RL WebSocket] Max reconnection attempts reached");
            this.emit("error", { error: "Max reconnection attempts reached" });
          }
        };
      } catch (e) {
        this.isConnecting = false;
        reject(e);
      }
    });
  }

  /**
   * Disconnect from the WebSocket server
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.reconnectAttempts = this.maxReconnectAttempts; // Prevent reconnection
  }

  /**
   * Send a message to the backend
   */
  send(message: RLMessage): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      // Queue message if not connected
      this.messageQueue.push(message);
      return false;
    }

    try {
      const messageWithTimestamp = {
        ...message,
        timestamp: Date.now(),
      };
      this.ws.send(JSON.stringify(messageWithTimestamp));
      return true;
    } catch (e) {
      console.error("[RL WebSocket] Failed to send message:", e);
      this.messageQueue.push(message); // Queue for retry
      return false;
    }
  }

  /**
   * Send observation to backend
   */
  sendObservation(observation: ObservationData): boolean {
    return this.send({
      type: "observation",
      data: observation,
    });
  }

  /**
   * Request action from backend
   */
  requestAction(observation: ObservationData): boolean {
    return this.send({
      type: "action",
      data: observation,
    });
  }

  /**
   * Send reward to backend
   */
  sendReward(reward: RewardData): boolean {
    return this.send({
      type: "reward",
      data: reward,
    });
  }

  /**
   * Reset the environment
   */
  reset(): boolean {
    return this.send({
      type: "reset",
      data: {},
    });
  }

  /**
   * Request backend state
   */
  requestState(): boolean {
    return this.send({
      type: "state",
      data: {},
    });
  }

  /**
   * Handle incoming messages
   */
  private handleMessage(message: RLMessage): void {
    switch (message.type) {
      case "action":
        this.emit("action", message.data);
        break;
      case "reward":
        this.emit("reward", message.data);
        break;
      case "state":
        this.emit("state", message.data);
        break;
      case "error":
        this.emit("error", message.data);
        break;
      default:
        console.warn("[RL WebSocket] Unknown message type:", message.type);
    }
  }

  /**
   * Subscribe to events
   */
  on(event: string, callback: (data: any) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  /**
   * Unsubscribe from events
   */
  off(event: string, callback: (data: any) => void): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  /**
   * Emit event to listeners
   */
  private emit(event: string, data: any): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach((callback) => {
        try {
          callback(data);
        } catch (e) {
          console.error(`[RL WebSocket] Error in event listener for ${event}:`, e);
        }
      });
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Get connection state
   */
  getConnectionState(): "connecting" | "connected" | "disconnected" | "error" {
    if (!this.ws) return "disconnected";
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING:
        return "connecting";
      case WebSocket.OPEN:
        return "connected";
      case WebSocket.CLOSING:
      case WebSocket.CLOSED:
        return "disconnected";
      default:
        return "error";
    }
  }
}

// Singleton instance
let wsClientInstance: RLWebSocketClient | null = null;

export const getRLWebSocketClient = (url?: string): RLWebSocketClient => {
  if (!wsClientInstance) {
    wsClientInstance = new RLWebSocketClient(url);
  }
  return wsClientInstance;
};

