// Physics engine wrapper using Cannon.js for realistic spaceship movement

import * as CANNON from "cannon-es";

export interface PhysicsState {
  position: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  angularVelocity: { x: number; y: number; z: number };
}

export interface SpaceshipPhysicsConfig {
  mass: number;
  maxThrust: number;
  maxAngularVelocity: number;
  damping: number;
  angularDamping: number;
  dragCoefficient: number;
}

export const defaultSpaceshipConfig: SpaceshipPhysicsConfig = {
  mass: 1000, // kg
  maxThrust: 5000, // N
  maxAngularVelocity: 2.0, // rad/s
  damping: 0.8, // Linear damping
  angularDamping: 0.9, // Angular damping
  dragCoefficient: 0.1, // Air resistance
};

export class SpaceshipPhysicsEngine {
  private world: CANNON.World;
  private spaceshipBody: CANNON.Body;
  private config: SpaceshipPhysicsConfig;
  private targetPosition: CANNON.Vec3;
  private targetVelocity: CANNON.Vec3;
  private lastUpdateTime: number;

  constructor(config: SpaceshipPhysicsConfig = defaultSpaceshipConfig) {
    this.config = config;
    
    // Create physics world
    this.world = new CANNON.World();
    this.world.gravity.set(0, 0, 0); // Zero gravity for space
    this.world.broadphase = new CANNON.NaiveBroadphase();
    this.world.solver.iterations = 10;

    // Create spaceship body (box shape for simplicity)
    const shape = new CANNON.Box(new CANNON.Vec3(1, 0.5, 0.3)); // Approximate spaceship dimensions
    this.spaceshipBody = new CANNON.Body({ mass: config.mass });
    this.spaceshipBody.addShape(shape);
    this.spaceshipBody.linearDamping = config.damping;
    this.spaceshipBody.angularDamping = config.angularDamping;
    this.spaceshipBody.position.set(0, 0, 0);
    
    this.world.addBody(this.spaceshipBody);

    // Initialize target tracking
    this.targetPosition = new CANNON.Vec3(0, 0, 0);
    this.targetVelocity = new CANNON.Vec3(0, 0, 0);
    this.lastUpdateTime = performance.now();
  }

  /**
   * Set target position for navigation
   */
  setTarget(x: number, y: number, z: number = 0): void {
    this.targetPosition.set(x, y, z);
  }

  /**
   * Apply thrust force based on agent action
   */
  applyThrust(action: "IDLE" | "GLIDE" | "BOOST" | "STABILIZE", intensity: number = 1.0): void {
    const force = new CANNON.Vec3();
    
    // Calculate direction to target
    const direction = new CANNON.Vec3();
    direction.sub(this.targetPosition, this.spaceshipBody.position);
    const distance = direction.length();
    
    if (distance > 0.1) {
      direction.normalize();
      
      switch (action) {
        case "BOOST":
          // Maximum thrust towards target
          const boostForce = this.config.maxThrust * intensity * 1.5;
          force.set(
            direction.x * boostForce,
            direction.y * boostForce,
            direction.z * boostForce
          );
          break;
          
        case "GLIDE":
          // Minimal thrust, mostly coasting
          const glideForce = this.config.maxThrust * intensity * 0.3;
          force.set(
            direction.x * glideForce,
            direction.y * glideForce,
            direction.z * glideForce
          );
          // Apply drag
          const velocity = this.spaceshipBody.velocity;
          const dragForce = velocity.scale(-this.config.dragCoefficient * velocity.length());
          force.vadd(dragForce, force);
          break;
          
        case "STABILIZE":
          // Counteract angular velocity and apply stabilizing thrust
          const stabilizeForce = this.config.maxThrust * intensity * 0.5;
          force.set(
            direction.x * stabilizeForce,
            direction.y * stabilizeForce,
            direction.z * stabilizeForce
          );
          
          // Apply angular damping for stabilization
          this.spaceshipBody.angularVelocity.scale(0.7, this.spaceshipBody.angularVelocity);
          break;
          
        case "IDLE":
        default:
          // Just apply drag
          const idleVelocity = this.spaceshipBody.velocity;
          const idleDrag = idleVelocity.scale(-this.config.dragCoefficient * idleVelocity.length());
          force.copy(idleDrag);
          break;
      }
      
      this.spaceshipBody.applyForce(force, this.spaceshipBody.position);
    }
  }

  /**
   * Apply torque for banking/rolling based on movement direction
   */
  applyBanking(desiredRoll: number, rollFactor: number = 0.1): void {
    const currentRoll = this.getRoll();
    const rollDifference = desiredRoll - currentRoll;
    
    // Apply torque to achieve desired roll
    const torque = new CANNON.Vec3(0, 0, rollDifference * rollFactor * 100);
    this.spaceshipBody.torque.copy(torque);
    
    // Limit angular velocity
    if (this.spaceshipBody.angularVelocity.length() > this.config.maxAngularVelocity) {
      this.spaceshipBody.angularVelocity.normalize();
      this.spaceshipBody.angularVelocity.scale(this.config.maxAngularVelocity, this.spaceshipBody.angularVelocity);
    }
  }

  /**
   * Step the physics simulation
   */
  step(deltaTime: number = 0.016): void {
    // Clamp deltaTime to prevent large jumps
    const clampedDelta = Math.min(deltaTime, 0.1);
    this.world.step(clampedDelta);
  }

  /**
   * Get current physics state
   */
  getState(): PhysicsState {
    return {
      position: {
        x: this.spaceshipBody.position.x,
        y: this.spaceshipBody.position.y,
        z: this.spaceshipBody.position.z,
      },
      velocity: {
        x: this.spaceshipBody.velocity.x,
        y: this.spaceshipBody.velocity.y,
        z: this.spaceshipBody.velocity.z,
      },
      rotation: {
        x: this.spaceshipBody.quaternion.x,
        y: this.spaceshipBody.quaternion.y,
        z: this.spaceshipBody.quaternion.z,
      },
      angularVelocity: {
        x: this.spaceshipBody.angularVelocity.x,
        y: this.spaceshipBody.angularVelocity.y,
        z: this.spaceshipBody.angularVelocity.z,
      },
    };
  }

  /**
   * Get roll angle in radians
   */
  getRoll(): number {
    // Extract roll from quaternion
    const q = this.spaceshipBody.quaternion;
    const sinr_cosp = 2 * (q.w * q.x + q.y * q.z);
    const cosr_cosp = 1 - 2 * (q.x * q.x + q.y * q.y);
    return Math.atan2(sinr_cosp, cosr_cosp);
  }

  /**
   * Get pitch angle in radians
   */
  getPitch(): number {
    const q = this.spaceshipBody.quaternion;
    const sinp = 2 * (q.w * q.y - q.z * q.x);
    if (Math.abs(sinp) >= 1) {
      return Math.sign(sinp) * Math.PI / 2;
    }
    return Math.asin(sinp);
  }

  /**
   * Get yaw angle in radians
   */
  getYaw(): number {
    const q = this.spaceshipBody.quaternion;
    const siny_cosp = 2 * (q.w * q.z + q.x * q.y);
    const cosy_cosp = 1 - 2 * (q.y * q.y + q.z * q.z);
    return Math.atan2(siny_cosp, cosy_cosp);
  }

  /**
   * Get speed in m/s
   */
  getSpeed(): number {
    return this.spaceshipBody.velocity.length();
  }

  /**
   * Reset physics state
   */
  reset(x: number = 0, y: number = 0, z: number = 0): void {
    this.spaceshipBody.position.set(x, y, z);
    this.spaceshipBody.velocity.set(0, 0, 0);
    this.spaceshipBody.angularVelocity.set(0, 0, 0);
    this.spaceshipBody.quaternion.set(0, 0, 0, 1);
  }

  /**
   * Cleanup
   */
  dispose(): void {
    this.world.removeBody(this.spaceshipBody);
    // Note: Cannon.js doesn't have explicit dispose, but we can clear references
  }
}

