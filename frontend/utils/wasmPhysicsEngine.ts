// WASM Physics Engine wrapper for Aeronav
// Drop-in replacement for Cannon.js based physicsEngine.ts

import type { PhysicsState, SpaceshipPhysicsConfig } from './physicsEngine';

// Re-export types for consistency
export type { PhysicsState, SpaceshipPhysicsConfig };

// Default configuration matching physicsEngine.ts
export const defaultSpaceshipConfig: SpaceshipPhysicsConfig = {
  mass: 1000,
  maxThrust: 5000,
  maxAngularVelocity: 2.0,
  damping: 0.8,
  angularDamping: 0.9,
  dragCoefficient: 0.1,
};

// Thrust action mapping (matching WASM constants)
const THRUST_ACTIONS = {
  IDLE: 0,
  GLIDE: 1,
  BOOST: 2,
  STABILIZE: 3,
} as const;

type ThrustActionName = keyof typeof THRUST_ACTIONS;

// WASM module interface (matches embind exports)
interface WasmPhysicsModule {
  PhysicsEngine: {
    new (): WasmPhysicsEngineInstance;
    new (
      mass: number,
      maxThrust: number,
      maxAngularVelocity: number,
      linearDamping: number,
      angularDamping: number,
      dragCoefficient: number
    ): WasmPhysicsEngineInstance;
  };
  THRUST_IDLE: number;
  THRUST_GLIDE: number;
  THRUST_BOOST: number;
  THRUST_STABILIZE: number;
}

interface WasmVector3 {
  x: number;
  y: number;
  z: number;
}

interface WasmPhysicsState {
  position: WasmVector3;
  velocity: WasmVector3;
  rotation: WasmVector3;
  angularVelocity: WasmVector3;
}

interface WasmPhysicsEngineInstance {
  step(deltaTime: number): void;
  reset(x: number, y: number, z: number): void;
  setTarget(x: number, y: number, z: number): void;
  applyThrust(action: number, intensity: number): void;
  applyBanking(desiredRoll: number, rollFactor: number): void;
  getState(): WasmPhysicsState;
  getPosition(): WasmVector3;
  getVelocity(): WasmVector3;
  getAngularVelocity(): WasmVector3;
  getRoll(): number;
  getPitch(): number;
  getYaw(): number;
  getSpeed(): number;
  setMass(mass: number): void;
  setMaxThrust(thrust: number): void;
  setMaxAngularVelocity(maxAngVel: number): void;
  setLinearDamping(damping: number): void;
  setAngularDamping(damping: number): void;
  setDragCoefficient(drag: number): void;
  delete(): void;
}

// Global module cache
let wasmModule: WasmPhysicsModule | null = null;
let loadPromise: Promise<WasmPhysicsModule> | null = null;

/**
 * Load the WASM physics module
 * Returns cached module if already loaded
 */
export async function loadWasmPhysics(): Promise<WasmPhysicsModule> {
  if (wasmModule) {
    return wasmModule;
  }

  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = (async () => {
    try {
      // Dynamic import of the WASM module
      // The module is expected to be at /wasm/physics_engine.js
      const createModule = await import('/wasm/physics_engine.js');
      wasmModule = await createModule.default();
      console.log('[WasmPhysics] Module loaded successfully');
      return wasmModule!;
    } catch (error) {
      console.error('[WasmPhysics] Failed to load module:', error);
      loadPromise = null;
      throw error;
    }
  })();

  return loadPromise;
}

/**
 * Check if WASM physics is available
 */
export function isWasmPhysicsAvailable(): boolean {
  return wasmModule !== null;
}

/**
 * WASM-backed physics engine with same API as SpaceshipPhysicsEngine
 */
export class WasmSpaceshipPhysicsEngine {
  private engine: WasmPhysicsEngineInstance;
  private config: SpaceshipPhysicsConfig;

  constructor(config: SpaceshipPhysicsConfig = defaultSpaceshipConfig) {
    if (!wasmModule) {
      throw new Error('WASM module not loaded. Call loadWasmPhysics() first.');
    }

    this.config = { ...config };
    this.engine = new wasmModule.PhysicsEngine(
      config.mass,
      config.maxThrust,
      config.maxAngularVelocity,
      config.damping,
      config.angularDamping,
      config.dragCoefficient
    );
  }

  /**
   * Set target position for navigation
   */
  setTarget(x: number, y: number, z: number = 0): void {
    this.engine.setTarget(x, y, z);
  }

  /**
   * Apply thrust force based on agent action
   */
  applyThrust(action: ThrustActionName, intensity: number = 1.0): void {
    const actionCode = THRUST_ACTIONS[action];
    this.engine.applyThrust(actionCode, intensity);
  }

  /**
   * Apply torque for banking/rolling
   */
  applyBanking(desiredRoll: number, rollFactor: number = 0.1): void {
    this.engine.applyBanking(desiredRoll, rollFactor);
  }

  /**
   * Step the physics simulation
   */
  step(deltaTime: number = 0.016): void {
    this.engine.step(deltaTime);
  }

  /**
   * Get current physics state
   */
  getState(): PhysicsState {
    const state = this.engine.getState();
    return {
      position: { ...state.position },
      velocity: { ...state.velocity },
      rotation: { ...state.rotation },
      angularVelocity: { ...state.angularVelocity },
    };
  }

  /**
   * Get roll angle in radians
   */
  getRoll(): number {
    return this.engine.getRoll();
  }

  /**
   * Get pitch angle in radians
   */
  getPitch(): number {
    return this.engine.getPitch();
  }

  /**
   * Get yaw angle in radians
   */
  getYaw(): number {
    return this.engine.getYaw();
  }

  /**
   * Get speed in m/s
   */
  getSpeed(): number {
    return this.engine.getSpeed();
  }

  /**
   * Reset physics state
   */
  reset(x: number = 0, y: number = 0, z: number = 0): void {
    this.engine.reset(x, y, z);
  }

  /**
   * Update configuration
   */
  setConfig(config: Partial<SpaceshipPhysicsConfig>): void {
    if (config.mass !== undefined) {
      this.config.mass = config.mass;
      this.engine.setMass(config.mass);
    }
    if (config.maxThrust !== undefined) {
      this.config.maxThrust = config.maxThrust;
      this.engine.setMaxThrust(config.maxThrust);
    }
    if (config.maxAngularVelocity !== undefined) {
      this.config.maxAngularVelocity = config.maxAngularVelocity;
      this.engine.setMaxAngularVelocity(config.maxAngularVelocity);
    }
    if (config.damping !== undefined) {
      this.config.damping = config.damping;
      this.engine.setLinearDamping(config.damping);
    }
    if (config.angularDamping !== undefined) {
      this.config.angularDamping = config.angularDamping;
      this.engine.setAngularDamping(config.angularDamping);
    }
    if (config.dragCoefficient !== undefined) {
      this.config.dragCoefficient = config.dragCoefficient;
      this.engine.setDragCoefficient(config.dragCoefficient);
    }
  }

  /**
   * Cleanup WASM resources
   */
  dispose(): void {
    this.engine.delete();
  }
}

/**
 * Create a physics engine, preferring WASM if available
 * Falls back to callback for JS implementation if WASM unavailable
 */
export async function createPhysicsEngine(
  config: SpaceshipPhysicsConfig = defaultSpaceshipConfig,
  onFallback?: () => void
): Promise<WasmSpaceshipPhysicsEngine> {
  try {
    await loadWasmPhysics();
    return new WasmSpaceshipPhysicsEngine(config);
  } catch (error) {
    console.warn('[WasmPhysics] Falling back to JS implementation:', error);
    onFallback?.();
    throw error; // Let caller handle fallback to JS implementation
  }
}
