// WebSocket client for CUDA vision backend

export interface VisionBackendMessage {
  type: "frame" | "ping" | "config" | "detection" | "pong" | "config_ack" | "error";
  data?: string; // base64 encoded image
  timestamp?: number;
  detectObjects?: boolean;
  detectPose?: boolean;
  config?: any;
  hands?: Array<{
    landmarks: number[][];
    handedness: "Left" | "Right";
    confidence: number;
    boundingBox: { x: number; y: number; width: number; height: number };
  }>;
  objects?: Array<{
    class: string;
    classId: number;
    confidence: number;
    boundingBox: { x: number; y: number; width: number; height: number };
  }>;
  pose?: any;
  control?: {
    direction: { x: number; y: number };
    thrust: number;
    action: string;
  };
  error?: string;
}

export class VisionBackendClient {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private isConnecting = false;

  constructor(url: string = "ws://localhost:8766/ws/vision") {
    this.url = url;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      if (this.isConnecting) {
        // Wait for existing connection
        const checkInterval = setInterval(() => {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            clearInterval(checkInterval);
            resolve();
          } else if (!this.isConnecting) {
            clearInterval(checkInterval);
            reject(new Error("Connection failed"));
          }
        }, 100);
        return;
      }

      this.isConnecting = true;

      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log("[Vision Backend] Connected");
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.emit("connected", {});
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: VisionBackendMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (e) {
            console.error("[Vision Backend] Failed to parse message:", e);
            this.emit("error", { error: "Failed to parse message", original: e });
          }
        };

        this.ws.onerror = (error) => {
          console.error("[Vision Backend] Connection error:", error);
          this.isConnecting = false;
          this.emit("error", { error: "WebSocket error", original: error });
          reject(error);
        };

        this.ws.onclose = () => {
          console.log("[Vision Backend] Connection closed");
          this.isConnecting = false;
          this.emit("disconnected", {});

          // Attempt reconnect
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            setTimeout(() => {
              this.connect().catch(() => {
                // Reconnection failed, will retry on next attempt
              });
            }, this.reconnectDelay * this.reconnectAttempts);
          }
        };
      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  sendFrame(
    imageData: ImageData,
    detectObjects: boolean = false,
    detectPose: boolean = false
  ): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn("[Vision Backend] Not connected, cannot send frame");
      return;
    }

    // Convert ImageData to base64
    const canvas = document.createElement("canvas");
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.putImageData(imageData, 0, 0);
    const base64 = canvas.toDataURL("image/jpeg", 0.8).split(",")[1];

    const message: VisionBackendMessage = {
      type: "frame",
      data: base64,
      timestamp: Date.now(),
      detectObjects,
      detectPose,
    };

    this.ws.send(JSON.stringify(message));
  }

  ping(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    this.ws.send(
      JSON.stringify({
        type: "ping",
        timestamp: Date.now(),
      })
    );
  }

  updateConfig(config: any): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    this.ws.send(
      JSON.stringify({
        type: "config",
        config,
      })
    );
  }

  private handleMessage(message: VisionBackendMessage): void {
    switch (message.type) {
      case "detection":
        this.emit("detection", message);
        break;
      case "pong":
        this.emit("pong", message);
        break;
      case "config_ack":
        this.emit("config_ack", message);
        break;
      case "error":
        this.emit("error", message);
        break;
    }
  }

  on(event: string, callback: (data: any) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: (data: any) => void): void {
    this.listeners.get(event)?.delete(callback);
  }

  private emit(event: string, data: any): void {
    this.listeners.get(event)?.forEach((callback) => {
      try {
        callback(data);
      } catch (e) {
        console.error(`[Vision Backend] Error in ${event} listener:`, e);
      }
    });
  }

  get isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

// Singleton instance
let visionBackendClient: VisionBackendClient | null = null;

export const getVisionBackendClient = (url?: string): VisionBackendClient => {
  if (!visionBackendClient) {
    visionBackendClient = new VisionBackendClient(url);
  }
  return visionBackendClient;
};

