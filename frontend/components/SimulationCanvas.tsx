import { useEffect, useRef } from "react";
import type { AudioData, AgentMetrics, Particle, NebulaCloud } from "../types/index.js";
import { SpaceshipPhysicsEngine, defaultSpaceshipConfig } from "../utils/physicsEngine.js";

interface SimulationCanvasProps {
  data: AudioData;
  isTraining: boolean;
  agentMetrics: AgentMetrics;
  onRenderStart?: () => void;
  onRenderEnd?: () => void;
  onSceneDataUpdate?: (sceneData: {
    spaceship: { x: number; y: number; z: number; roll: number; rotation?: { x: number; y: number; z: number; w: number }; velocity?: { x: number; y: number; z: number } };
    particles: Particle[];
    nebula: NebulaCloud[];
  }) => void;
}

export const SimulationCanvas = ({
  data,
  isTraining,
  agentMetrics,
  onRenderStart,
  onRenderEnd,
  onSceneDataUpdate,
}: SimulationCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const nebulaRef = useRef<NebulaCloud[]>([]);

  // Physics Engine
  const physicsEngineRef = useRef<SpaceshipPhysicsEngine | null>(null);
  
  // Spaceship State (for backward compatibility and visual interpolation)
  const shipState = useRef({
    currentX: 0,
    currentY: -100,
    targetX: 0,
    targetY: -100,
    roll: 0,
    velocity: 0,
    targetChangeTimer: 0,
    usePhysics: true // Toggle for physics vs simple lerp
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let time = 0;
    let gridScroll = 0;

    // Init Particles (Space Dust)
    if (particlesRef.current.length === 0) {
      for (let i = 0; i < 50; i++) {
        particlesRef.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          z: Math.random() * 2,
          vx: 0,
          vy: Math.random() * 4 + 2, // Falling down/towards
          size: Math.random() * 2 + 1,
          type: Math.random() > 0.7 ? 'bit' : 'block'
        });
      }
    }

    // Init Nebula Clouds
    if (nebulaRef.current.length === 0) {
      for (let i = 0; i < 6; i++) {
        nebulaRef.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height * 0.8,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() * 0.2) + 0.1,
          radius: 200 + Math.random() * 300,
          baseHue: 200 + Math.random() * 60, // Blue/Purple spectrum
          phase: Math.random() * Math.PI * 2
        });
      }
    }

    const drawSpaceship = (
      ctx: CanvasRenderingContext2D,
      x: number,
      y: number,
      roll: number,
      colorAccent: string,
      thrust: number
    ) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(roll * 0.5); // Bank effect

      // Thrusters (Behind)
      const thrustLength = 20 + (thrust * 60);
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      // Left Engine Fire
      ctx.beginPath();
      ctx.moveTo(-15, 20);
      ctx.lineTo(-20, 20 + thrustLength);
      ctx.lineTo(-10, 20 + thrustLength * 0.8);
      ctx.fillStyle = isTraining ? '#f59e0b' : '#0ea5e9';
      ctx.globalAlpha = 0.6 + Math.random() * 0.4;
      ctx.fill();

      // Right Engine Fire
      ctx.beginPath();
      ctx.moveTo(15, 20);
      ctx.lineTo(20, 20 + thrustLength);
      ctx.lineTo(10, 20 + thrustLength * 0.8);
      ctx.fill();
      ctx.restore();

      // --- Ship Body (Technical Schematic) ---
      ctx.shadowBlur = 10;
      ctx.shadowColor = colorAccent;
      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 2;
      ctx.fillStyle = "#1e293b";

      // Fuselage
      ctx.beginPath();
      ctx.moveTo(0, -30); // Nose
      ctx.lineTo(10, 0);
      ctx.lineTo(15, 25); // R Engine Mount
      ctx.lineTo(5, 20); // Rear center
      ctx.lineTo(-5, 20);
      ctx.lineTo(-15, 25); // L Engine Mount
      ctx.lineTo(-10, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Wings
      ctx.beginPath();
      ctx.moveTo(10, 0);
      ctx.lineTo(40, 15); // R Wing Tip
      ctx.lineTo(15, 20);
      ctx.fillStyle = "#0f172a"; // Darker wing
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(-10, 0);
      ctx.lineTo(-40, 15); // L Wing Tip
      ctx.lineTo(-15, 20);
      ctx.fill();
      ctx.stroke();

      // Cockpit / Sensor Array
      ctx.beginPath();
      ctx.moveTo(0, -10);
      ctx.lineTo(3, 0);
      ctx.lineTo(0, 15);
      ctx.lineTo(-3, 0);
      ctx.closePath();
      ctx.fillStyle = colorAccent;
      ctx.fill();

      // Technical Markings
      ctx.font = "6px monospace";
      ctx.fillStyle = "#94a3b8";
      ctx.fillText("MK-II", -12, 10);

      ctx.restore();
    };

    const render = () => {
      // Start performance measurement
      onRenderStart?.();
      const renderStartTime = performance.now();

      time += isTraining ? 0.15 : 0.02;
      // Grid moves "down" to simulate flying "forward"
      const speed = 2 + (data.bass * 3);
      gridScroll = (gridScroll + speed) % 40;

      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;

      // --- Background ---
      const bgGradient = ctx.createLinearGradient(0, 0, 0, h);
      bgGradient.addColorStop(0, "#020617");
      bgGradient.addColorStop(1, "#1e293b");
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, w, h);

      // --- Nebula Effects ---
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      nebulaRef.current.forEach(cloud => {
        // Audio reactivity logic for Nebula
        // Move down faster with bass (speed sensation)
        cloud.y += cloud.vy + (data.bass * 2);
        cloud.x += cloud.vx;

        // Wrap around
        if (cloud.y > h + cloud.radius) {
          cloud.y = -cloud.radius;
          cloud.x = Math.random() * w;
        }
        if (cloud.x < -cloud.radius) cloud.x = w + cloud.radius;
        if (cloud.x > w + cloud.radius) cloud.x = -cloud.radius;

        const pulsate = Math.sin(time + cloud.phase) * 0.1 + 1;
        const audioScale = 1 + (data.mid * 0.6); // React to Mids
        const r = cloud.radius * pulsate * audioScale;

        // Color shift based on mode
        let hue = cloud.baseHue;
        if (isTraining) {
          // Shift Blue/Purple to Orange/Red
          hue = (hue + 140) % 360;
        }

        const alpha = 0.02 + (data.treble * 0.08); // React to Treble (shimmer)

        const grad = ctx.createRadialGradient(cloud.x, cloud.y, 0, cloud.x, cloud.y, r);
        grad.addColorStop(0, `hsla(${hue}, 70%, 40%, ${alpha})`);
        grad.addColorStop(1, `hsla(${hue + 20}, 60%, 10%, 0)`);

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cloud.x, cloud.y, r, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();

      // --- Technical Floor (Bottom Half) ---
      // Simulating a ground plane far below
      const horizonY = h * 0.2;

      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, w, h); // Full screen grid for flight
      ctx.clip();

      const gridColor = isTraining ? "rgba(251, 191, 36, 0.15)" : "rgba(56, 189, 248, 0.1)";
      ctx.fillStyle = gridColor;

      // Vertical lines (perspective)
      // We fan them out from center top (fake vanishing point)
      const vpY = -200;
      const vpX = cx;

      for (let i = -10; i <= 10; i++) {
        const xOffset = i * 100;
        ctx.beginPath();
        ctx.moveTo(vpX, vpY);
        ctx.lineTo(cx + xOffset * 4, h + 100);
        ctx.strokeStyle = gridColor;
        ctx.stroke();
      }

      // Horizontal lines (scrolling down)
      // Exponential spacing for depth
      for (let i = 0; i < 20; i++) {
        const offset = (gridScroll + (i * 40)) % h;
        const yPos = (offset * offset) / h + 50; // Fake perspective curve
        if (yPos > h) continue;

        ctx.beginPath();
        ctx.moveTo(0, yPos);
        ctx.lineTo(w, yPos);
        ctx.lineWidth = 1 + (yPos / h); // Thicker near camera
        ctx.stroke();
      }
      ctx.restore();

      // --- Particles: Space Dust ---
      ctx.fillStyle = isTraining ? "#fcd34d" : "#bae6fd";
      particlesRef.current.forEach(p => {
        // Move particles out from center or down
        p.y += p.vy * (1 + data.bass); // Speed up with bass

        // Reset if off screen
        if (p.y > h) {
          p.y = 0;
          p.x = Math.random() * w;
          p.vy = Math.random() * 5 + 2;
        }

        const size = p.size * (0.5 + data.treble);
        if (p.type === 'bit') {
          ctx.fillRect(p.x, p.y, 1, size * 4); // Streak
        } else {
          ctx.fillRect(p.x, p.y, size, size);
        }
      });

      // --- Physics & Movement ---
      const ss = shipState.current;
      const boundsX = w * 0.4;
      const boundsY = h * 0.4;
      const physics = physicsEngineRef.current;

      // Calculate delta time
      const currentTime = performance.now();
      const deltaTime = (currentTime - lastFrameTime) / 1000; // Convert to seconds
      lastFrameTime = currentTime;

      // Visual update based on Agent Action
      // If Agent says boost, we artificially increase speed animation
      const agentThrust = agentMetrics.action === "BOOST" ? 0.5 : 0.0;
      const visualThrust = Math.max(data.bass, agentThrust);

      // Determine target position
      if (isTraining) {
        // Dogfight / Evasive maneuvers
        ss.targetChangeTimer++;
        if (ss.targetChangeTimer > 30) {
          ss.targetX = (Math.random() - 0.5) * (w * 0.8);
          ss.targetY = (Math.random() - 0.5) * (h * 0.6);
          ss.targetChangeTimer = 0;
        }
      } else {
        // Smooth Patrol
        const t = time * 0.5;
        const radiusX = boundsX * 0.8;
        const radiusY = boundsY * 0.5;

        ss.targetX = Math.sin(t) * radiusX;
        ss.targetY = Math.cos(t * 1.3) * radiusY - (data.mid * 50);
      }

      // Update physics engine
      if (physics && ss.usePhysics) {
        // Set target in physics world (convert screen coordinates to physics coordinates)
        physics.setTarget(ss.targetX, ss.targetY, 0);
        
        // Apply thrust based on agent action
        const thrustIntensity = Math.max(data.bass, agentThrust);
        physics.applyThrust(agentMetrics.action, thrustIntensity);
        
        // Apply banking based on movement direction
        const dx = ss.targetX - ss.currentX;
        const targetRoll = (dx / w) * 40 * (Math.PI / 180); // Convert to radians
        const rollFactor = agentMetrics.action === "STABILIZE" ? 0.02 : 0.1;
        physics.applyBanking(targetRoll, rollFactor);
        
        // Step physics simulation
        physics.step(deltaTime);
        
        // Get physics state
        const physicsState = physics.getState();
        
        // Update visual state from physics
        ss.currentX = physicsState.position.x;
        ss.currentY = physicsState.position.y;
        ss.roll = physics.getRoll() * (180 / Math.PI); // Convert to degrees
        ss.velocity = physics.getSpeed();
      } else {
        // Fallback to simple lerp if physics disabled
        const moveSpeed = isTraining ? 0.15 : 0.05;
        const dx = ss.targetX - ss.currentX;
        const dy = ss.targetY - ss.currentY;

        ss.currentX += dx * moveSpeed;
        ss.currentY += dy * moveSpeed;

        // Calculate Bank (Roll) based on X velocity
        const rollFactor = agentMetrics.action === "STABILIZE" ? 0.02 : 0.1;
        const targetRoll = (dx / w) * 40;
        ss.roll += (targetRoll - ss.roll) * rollFactor;
      }

      // --- Draw Ship ---
      const shipScreenX = cx + ss.currentX;
      const shipScreenY = cy + ss.currentY;
      const accentColor = isTraining ? "#f59e0b" : "#0ea5e9";

      // Draw Target Reticle
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      const tx = cx + ss.targetX;
      const ty = cy + ss.targetY;
      ctx.arc(tx, ty, 15, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw Leader Line
      ctx.beginPath();
      ctx.moveTo(shipScreenX, shipScreenY);
      ctx.lineTo(tx, ty);
      ctx.globalAlpha = 0.3;
      ctx.stroke();
      ctx.globalAlpha = 1.0;

      // Draw The Ship
      drawSpaceship(ctx, shipScreenX, shipScreenY, ss.roll, accentColor, visualThrust);

      // Update scene data for export
      if (onSceneDataUpdate) {
        const physics = physicsEngineRef.current;
        const physicsState = physics && ss.usePhysics ? physics.getState() : null;
        
        onSceneDataUpdate({
          spaceship: {
            x: ss.currentX,
            y: ss.currentY,
            z: physicsState?.position.z || 0,
            roll: ss.roll,
            rotation: physicsState ? {
              x: physicsState.rotation.x,
              y: physicsState.rotation.y,
              z: physicsState.rotation.z,
              w: 1, // Simplified quaternion
            } : undefined,
            velocity: physicsState ? {
              x: physicsState.velocity.x,
              y: physicsState.velocity.y,
              z: physicsState.velocity.z,
            } : undefined,
          },
          particles: particlesRef.current,
          nebula: nebulaRef.current,
        });
      }

      // --- HUD Overlay ---
      const hudColor = isTraining ? "rgba(251, 191, 36, 0.7)" : "rgba(56, 189, 248, 0.7)";
      ctx.fillStyle = hudColor;
      ctx.strokeStyle = hudColor;

      // Cockpit Brackets
      const bSize = 30;
      const pad = 20;

      // Horizon Line (Artificial Horizon)
      const horizonTilt = -ss.roll;
      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.rotate(horizonTilt * 0.5);

      // Pitch Ladders
      ctx.globalAlpha = 0.3;
      for (let i = -2; i <= 2; i++) {
        if (i === 0) continue;
        const yOff = i * 40;
        ctx.beginPath();
        ctx.moveTo(-20, yOff); ctx.lineTo(20, yOff);
        ctx.stroke();
        ctx.fillText(`${i * 10}`, 25, yOff + 3);
      }
      // Center Marker
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-10, 0); ctx.lineTo(-5, 0); ctx.lineTo(0, 5); ctx.lineTo(5, 0); ctx.lineTo(10, 0);
      ctx.stroke();
      ctx.restore();

      // Stats Columns
      ctx.globalAlpha = 1.0;
      ctx.font = "10px monospace";

      // Left: Thrust/Speed
      const physics = physicsEngineRef.current;
      const speedVal = physics && ss.usePhysics 
        ? Math.floor(physics.getSpeed())
        : Math.floor(200 + (data.volume * 800) + (agentMetrics.action === "BOOST" ? 300 : 0));
      ctx.fillText(`THRUST: ${Math.floor(visualThrust * 100)}%`, 20, h / 2);
      ctx.fillText(`VEL:    ${speedVal} m/s`, 20, h / 2 + 15);
      if (physics && ss.usePhysics) {
        ctx.fillText(`PHYSICS: ON`, 20, h / 2 + 30);
      }

      // Right: Altitude/System
      const alt = Math.floor(12000 - ss.currentY * 10);
      ctx.textAlign = "right";
      ctx.fillText(`ALT:  ${alt} ft`, w - 20, h / 2);
      ctx.fillText(`ROLL: ${(ss.roll * 57.29).toFixed(1)}°`, w - 20, h / 2 + 15);
      ctx.textAlign = "left";

      // --- Agent Neural Link HUD ---
      ctx.save();
      const boxW = 160;
      const boxH = 70;
      const boxX = w - boxW - 20;
      const boxY = 20;

      ctx.fillStyle = "rgba(15, 23, 42, 0.8)";
      ctx.strokeStyle = isTraining ? "#f59e0b" : "#0ea5e9";
      ctx.lineWidth = 1;
      ctx.fillRect(boxX, boxY, boxW, boxH);
      ctx.strokeRect(boxX, boxY, boxW, boxH);

      // Header
      ctx.fillStyle = isTraining ? "#f59e0b" : "#0ea5e9";
      ctx.font = "10px monospace";
      ctx.fillText("NEURAL LINK // NAV-AGENT-01", boxX + 10, boxY + 15);

      // Metrics
      ctx.fillStyle = "#e2e8f0";
      ctx.fillText(`ACTION: ${agentMetrics.action}`, boxX + 10, boxY + 35);
      ctx.fillText(`CONF:   ${(agentMetrics.confidence * 100).toFixed(1)}%`, boxX + 10, boxY + 50);

      // Energy Bar
      ctx.fillText(`PWR:`, boxX + 10, boxY + 62);
      ctx.fillStyle = "#334155";
      ctx.fillRect(boxX + 40, boxY + 54, 100, 8);
      ctx.fillStyle = agentMetrics.energy > 30 ? (isTraining ? "#f59e0b" : "#0ea5e9") : "#ef4444";
      ctx.fillRect(boxX + 40, boxY + 54, Math.max(0, agentMetrics.energy), 8);

      ctx.restore();

      // Bottom Mode Info
      ctx.fillStyle = hudColor;
      ctx.font = "12px monospace";
      ctx.fillText(isTraining ? "COMBAT_MODE // AUTOPILOT ENGAGED" : "FLIGHT_MODE // WAYPOINT TRACKING", 20, h - 20);

      // End performance measurement
      const renderEndTime = performance.now();
      onRenderEnd?.();

      animationId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationId);
  }, [data, isTraining, agentMetrics]);

  return <canvas ref={canvasRef} className="w-full h-full block" />;
};

