# SmartNav

A modular microservices-based simulation system with an aerospace flight control frontend visualization.

## Components

### Backend Microservices

The system consists of the following microservices:

- **Audio Service**: Analyzes audio input (beats, pitch, waveform) and publishes events.
- **Simulation Controller**: Subscribes to audio events and routes commands to agents.
- **Agents**:
    - **Robot Arm**: Simulates robotic movement.
    - **Lighting**: Simulates environmental lighting.

### Frontend Application (AeroNavSim)

A React-based frontend application (`frontend/`) that visualizes an autonomous aerospace flight control system. Features include:

**Core Features:**
- High-fidelity vector graphics simulation with HTML5 Canvas
- Real-time audio analysis using Web Audio API with Web Worker optimization
- Multi-Agent Reinforcement Learning with Q-Learning and coordination detection
- Physics-based movement using Cannon.js 3D physics engine
- System telemetry dashboard with live service status
- Combat/Training mode with different visual and behavioral modes

**Developer Tools:**
- Performance profiler (FPS, memory, render time)
- Dev tools panel with state inspector and network simulation
- Error boundaries with crash reporting
- Structured logging with filtering and export
- Keyboard shortcuts and command palette

**Advanced Features:**
- Training dashboard for RL metrics visualization
- Synthetic data generation (audio augmentation)
- RL backend WebSocket connection for external neural networks
- USD scene export for NVIDIA Omniverse integration
- 3D model viewer for CAD models and URDF files
- Data export (CSV, JSON, USD formats)

See [frontend/README.md](frontend/README.md) for detailed frontend documentation.

## Communication

Backend services communicate using gRPC and ZeroMQ.
- **gRPC**: Used for service-to-service command and control.
- **ZeroMQ**: Used for low-latency event publishing (optional/future optimization, currently using gRPC streams or simple RPCs for simplicity in v1).

## Prerequisites

### Backend
- Docker
- Docker Compose

### Frontend
- Modern web browser with ES modules support
- Python 3 or Node.js (for development server)
- Microphone access (optional, for real-time audio input)

## Usage

### Backend Services

1.  Build the services:
    ```bash
    docker-compose build
    ```

2.  Run the simulation:
    ```bash
    docker-compose up
    ```

### Frontend Application

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Start a development server (choose one):
   ```bash
   # Python 3
   python -m http.server 8000
   
   # Node.js (with http-server)
   npx http-server -p 8000
   
   # Node.js (with serve)
   npx serve -p 8000
   ```

3. Open `http://localhost:8000` in your browser.

See [frontend/README.md](frontend/README.md) for more details.
