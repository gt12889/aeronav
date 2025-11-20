# AeroNavSim Frontend

A React-based frontend application for visualizing an autonomous aerospace flight control system. The application simulates a distributed microservices architecture where a Reinforcement Learning (RL) agent ("Nav-Agent-01") pilots a virtual spacecraft based on real-time audio input analysis.

## Features

### Core Simulation
- **High-fidelity vector graphics simulation** with HTML5 Canvas
- **Real-time audio analysis** using Web Audio API (FFT analysis) with Web Worker optimization
- **Multi-Agent Reinforcement Learning** with Q-Learning feedback loops and coordination detection
- **Physics-based movement** using Cannon.js 3D physics engine
- **System telemetry dashboard** with live service status
- **Retro-industrial vector aesthetic** visualization
- **Combat/Training mode** with different visual and behavioral modes

### Developer Tools
- **Performance Profiler** - Real-time FPS, frame time, memory usage, and render time tracking
- **Dev Tools Panel** - State inspector, network simulation controls, and log viewer
- **Error Boundaries** - Graceful error handling with crash reporting
- **Structured Logging** - Logging system with levels, filtering, and export
- **Configuration Management** - Environment-specific configs with persistence
- **Keyboard Shortcuts** - Global shortcuts and searchable command palette (`Ctrl+K`)

### Data & Export
- **Export Functionality** - Export logs, metrics, and scene state to CSV/JSON
- **USD Scene Export** - Export 3D scenes to USD format for NVIDIA Omniverse integration
- **3D Model Viewer** - View CAD models (OBJ, GLTF, GLB) and URDF robot files with interactive 3D rendering

### Advanced Features
- **Training Dashboard** - Visualize RL training metrics, loss/reward curves, hyperparameters, and replay buffer stats
- **Synthetic Data Generation** - Audio augmentation with noise injection, frequency shifts, and time warping
- **RL Backend Connection** - WebSocket integration for connecting to external Python RL backends
- **Multi-Agent Coordination** - Multiple RL agents with different policies and coordination visualization

## Architecture

### Technology Stack

- **React 19** (via ES Modules)
- **HTML5 Canvas API** for 2D physics and particle rendering
- **Web Audio API** for FFT analysis
- **Cannon.js** for 3D physics simulation
- **Web Workers** for offloading heavy computations
- **WebSocket** for RL backend communication
- **Tailwind CSS** (via CDN) for styling
- **Lucide React** for icons

### Key Components

**Core Components:**
- `SimulationCanvas`: Main canvas visualization with spaceship, particles, nebula effects
- `App`: Main application component with state management
- `StatusBadge`: Service status indicator component
- `MiniChart`: Chart visualization for metrics

**Hooks:**
- `useAudioAnalyzer`: Custom hook for Web Audio API integration with Web Worker for performance
- `usePerformanceProfiler`: Performance metrics tracking hook
- `useKeyboardShortcuts`: Global keyboard shortcut handler
- `useRLBackend`: WebSocket connection manager for RL backend

**Developer Tools:**
- `PerformanceProfiler`: Real-time performance metrics display
- `DevTools`: Developer tools panel with state inspection and network simulation
- `ErrorBoundary`: React error boundary with crash reporting
- `CommandPalette`: Searchable command palette (`Ctrl+K`)
- `LogViewer`: Structured log viewer with filtering

**Data & Visualization:**
- `TrainingDashboard`: RL training metrics and visualization
- `MultiAgentDashboard`: Multi-agent coordination visualization
- `AugmentationPanel`: Synthetic data generation controls
- `RLBackendPanel`: RL backend connection management
- `ModelViewer`: 3D model viewer for CAD/URDF files
- `ExportMenu`: Data export functionality

**Utilities:**
- `audioProcessor.worker`: Web Worker that processes FFT data off the main thread
- `physicsEngine`: Cannon.js physics engine wrapper
- `multiAgentSystem`: Multi-agent RL system utilities
- `audioAugmentation`: Synthetic data augmentation utilities
- `usdExporter`: USD scene export functionality
- `modelLoader`: 3D model loader (OBJ, URDF, GLTF)
- `logger`: Structured logging system
- `config`: Configuration management
- `exportUtils`: Export utilities (CSV, JSON)

### Performance Optimizations

- **Web Worker for Audio Processing**: FFT analysis and frequency band calculations run in a separate thread to prevent main thread blocking
- **Fallback Support**: If Web Worker fails to load, the system automatically falls back to main thread processing
- **Pre-allocated Buffers**: Frequency data arrays are pre-allocated to reduce garbage collection overhead
- **Physics Engine**: Efficient 3D physics simulation using Cannon.js
- **Render Time Tracking**: Performance profiler tracks render times to identify bottlenecks
- **Memory Monitoring**: Real-time memory usage tracking for optimization

## Running the Application

### Option 1: Simple HTTP Server (Recommended)

Since this application uses ES modules, you need to serve it via HTTP (not file://). Use one of the following:

**Python 3:**
```bash
cd frontend
python -m http.server 8000
```

**Node.js (with http-server):**
```bash
npm install -g http-server
cd frontend
http-server -p 8000
```

**Node.js (with serve):**
```bash
npx serve frontend -p 8000
```

Then open `http://localhost:8000` in your browser.

### Option 2: Development Server with TypeScript Support

For TypeScript support without build step, you can use a dev server that handles `.tsx` files:

**Using Vite (development mode):**
```bash
npm install -g vite
cd frontend
vite
```

**Using esbuild serve:**
```bash
npm install -g esbuild
cd frontend
esbuild --serve=8000 --servedir=.
```

## Browser Requirements

- Modern browser with ES modules support (Chrome 61+, Firefox 60+, Safari 11+, Edge 16+)
- Microphone access (for real-time audio input)
- Web Audio API support

## Usage

### Basic Usage

1. **Launch**: Click the "LAUNCH" button to start the simulation
2. **Microphone**: Grant microphone access when prompted (or use synthetic signal generator)
3. **Combat Mode**: Click "ENABLE COMBAT SIM" to switch to training/combat mode
4. **Monitor**: View system telemetry, RL metrics, and logs in the right panel

### Keyboard Shortcuts

- `Space` - Launch/Abort simulation
- `C` - Toggle Combat Mode
- `Ctrl+K` / `Cmd+K` - Open Command Palette
- `Ctrl+D` / `Cmd+D` - Toggle Dev Tools
- `Ctrl+P` / `Cmd+P` - Toggle Performance Profiler
- `Ctrl+M` / `Cmd+M` - Open 3D Model Viewer
- `Ctrl+E` / `Cmd+E` - Export State

### Advanced Features

**Performance Profiler:**
- Click the performance icon in the header to view real-time FPS, memory usage, and render times

**Dev Tools:**
- Click the settings icon to access:
  - State inspector for debugging
  - Network simulation controls (packet loss, latency)
  - Log viewer with filtering

**3D Model Viewer:**
- Press `Ctrl+M` or use Command Palette to open
- Upload OBJ, GLTF, GLB, or URDF files
- Interactive 3D rendering with rotation, pan, and zoom

**Export Data:**
- Click the Export button in the header
- Export logs, metrics, performance data, or full state
- Export scenes to USD format for Omniverse

**RL Backend Connection:**
- Navigate to the "BACKEND" tab in the sidebar
- Configure WebSocket URL (default: `ws://localhost:8765`)
- Connect to external Python RL backend for real neural network integration

## Operational Modes

### Standard Flight Mode
- Smooth waypoint tracking
- Blue/Cyan color palette
- Microphone input (default)
- Agent prioritizes efficiency

### Combat/Training Mode
- Erratic target movement (evasive maneuvers)
- Amber/Orange color palette
- Synthetic signal generator (Square waves)
- Increased exploration rate (epsilon = 0.3)
- RL-Optimizer status changes to TRAINING

## File Structure

```
frontend/
├── index.html              # Main HTML entry point
├── index.tsx               # React application entry point
├── components/
│   ├── App.tsx            # Main application component
│   ├── SimulationCanvas.tsx  # Canvas visualization
│   ├── StatusBadge.tsx    # Status badge component
│   ├── MiniChart.tsx      # Chart component
│   ├── PerformanceProfiler.tsx  # Performance metrics display
│   ├── DevTools.tsx      # Developer tools panel
│   ├── ErrorBoundary.tsx  # Error boundary component
│   ├── CrashReporter.tsx # Crash reporting utility
│   ├── CommandPalette.tsx # Command palette component
│   ├── LogViewer.tsx      # Log viewer component
│   ├── ExportMenu.tsx     # Export menu component
│   ├── TrainingDashboard.tsx  # RL training dashboard
│   ├── MultiAgentDashboard.tsx # Multi-agent visualization
│   ├── AugmentationPanel.tsx  # Data augmentation panel
│   ├── RLBackendPanel.tsx     # RL backend connection panel
│   ├── ModelViewer.tsx    # 3D model viewer
│   └── ConfigPanel.tsx    # Configuration panel
├── hooks/
│   ├── useAudioAnalyzer.ts  # Audio analysis hook
│   ├── usePerformanceProfiler.ts  # Performance profiler hook
│   ├── useKeyboardShortcuts.ts  # Keyboard shortcuts hook
│   └── useRLBackend.ts    # RL backend connection hook
├── utils/
│   ├── logger.ts          # Structured logging
│   ├── config.ts          # Configuration management
│   ├── exportUtils.ts     # Export utilities
│   ├── audioAugmentation.ts  # Audio augmentation
│   ├── multiAgentSystem.ts  # Multi-agent RL system
│   ├── physicsEngine.ts   # Physics engine wrapper
│   ├── usdExporter.ts     # USD export functionality
│   ├── modelLoader.ts     # 3D model loader
│   └── websocketClient.ts # WebSocket client
├── workers/
│   └── audioProcessor.worker.ts  # Audio processing worker
├── types/
│   └── index.ts           # TypeScript type definitions
├── constants/
│   └── proto.ts           # Protocol buffer definitions
└── config/
    ├── default.json       # Default configuration
    ├── development.json   # Development overrides
    └── production.json    # Production overrides
```

## Notes

- The application simulates backend services internally (as per specification)
- All microservices behavior is mocked within the frontend logic
- The RL agent uses a simplified Q-Learning implementation (can be overridden with external backend)
- Performance optimized for 60fps+ render loops
- Configuration limits can be adjusted in `config/default.json`
- Error boundaries provide graceful error handling and crash reporting
- All data can be exported for analysis (CSV, JSON, USD formats)
- 3D model viewer supports OBJ and URDF formats natively, GLTF/GLB ready for library integration

## Integration Points

- **RL Backend**: Connect to Python RL backend via WebSocket for real neural network integration
- **Omniverse**: Export scenes to USD format for NVIDIA Omniverse visualization
- **CAD/URDF**: Import and visualize robot models and CAD files
- **Data Export**: Export all simulation data for analysis and reporting

