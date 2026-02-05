#!/bin/bash
# Build script for Aeronav WebAssembly modules
# Compiles C++ physics and audio code to WASM using Emscripten

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}  Aeronav WASM Build Script${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

# Get script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
NATIVE_DIR="$PROJECT_ROOT/native"
WASM_OUTPUT_DIR="$PROJECT_ROOT/frontend/wasm"

# Check for Emscripten
if ! command -v emcmake &> /dev/null; then
    echo -e "${RED}Error: Emscripten not found!${NC}"
    echo ""
    echo "Please install Emscripten SDK:"
    echo "  git clone https://github.com/emscripten-core/emsdk.git"
    echo "  cd emsdk"
    echo "  ./emsdk install latest"
    echo "  ./emsdk activate latest"
    echo "  source ./emsdk_env.sh"
    echo ""
    echo "Or if already installed, make sure to source emsdk_env.sh:"
    echo "  source /path/to/emsdk/emsdk_env.sh"
    exit 1
fi

echo -e "${GREEN}✓ Emscripten found${NC}"
emcc --version | head -1

# Create output directory
mkdir -p "$WASM_OUTPUT_DIR"
echo -e "${GREEN}✓ Output directory: $WASM_OUTPUT_DIR${NC}"
echo ""

# Build function
build_module() {
    local module_name=$1
    local source_dir=$2

    echo -e "${YELLOW}Building $module_name...${NC}"

    # Create build directory
    local build_dir="$source_dir/build"
    mkdir -p "$build_dir"

    # Run CMake with Emscripten
    cd "$build_dir"
    emcmake cmake .. \
        -DCMAKE_BUILD_TYPE=Release \
        -DCMAKE_VERBOSE_MAKEFILE=OFF

    # Build
    emmake make -j$(nproc 2>/dev/null || echo 4)

    # Verify output
    local js_file="$WASM_OUTPUT_DIR/${module_name}.js"
    local wasm_file="$WASM_OUTPUT_DIR/${module_name}.wasm"

    if [[ -f "$js_file" && -f "$wasm_file" ]]; then
        local js_size=$(du -h "$js_file" | cut -f1)
        local wasm_size=$(du -h "$wasm_file" | cut -f1)
        echo -e "${GREEN}✓ $module_name built successfully${NC}"
        echo "   JS:   $js_file ($js_size)"
        echo "   WASM: $wasm_file ($wasm_size)"
    else
        echo -e "${RED}✗ $module_name build failed - output files not found${NC}"
        return 1
    fi

    cd "$PROJECT_ROOT"
    echo ""
}

# Build physics module
if [[ -d "$NATIVE_DIR/physics" ]]; then
    build_module "physics_engine" "$NATIVE_DIR/physics"
else
    echo -e "${YELLOW}⚠ Physics module not found at $NATIVE_DIR/physics${NC}"
fi

# Build audio module
if [[ -d "$NATIVE_DIR/audio" ]]; then
    build_module "audio_fft" "$NATIVE_DIR/audio"
else
    echo -e "${YELLOW}⚠ Audio module not found at $NATIVE_DIR/audio${NC}"
fi

# Build RL module
if [[ -d "$NATIVE_DIR/rl" ]]; then
    build_module "multi_agent" "$NATIVE_DIR/rl"
else
    echo -e "${YELLOW}⚠ RL module not found at $NATIVE_DIR/rl${NC}"
fi

# Build geometry module
if [[ -d "$NATIVE_DIR/geometry" ]]; then
    build_module "geometry" "$NATIVE_DIR/geometry"
else
    echo -e "${YELLOW}⚠ Geometry module not found at $NATIVE_DIR/geometry${NC}"
fi

# Build math module
if [[ -d "$NATIVE_DIR/math" ]]; then
    build_module "math_utils" "$NATIVE_DIR/math"
else
    echo -e "${YELLOW}⚠ Math module not found at $NATIVE_DIR/math${NC}"
fi

# Build collision module
if [[ -d "$NATIVE_DIR/collision" ]]; then
    build_module "collision" "$NATIVE_DIR/collision"
else
    echo -e "${YELLOW}⚠ Collision module not found at $NATIVE_DIR/collision${NC}"
fi

# Build pathfinding module
if [[ -d "$NATIVE_DIR/pathfinding" ]]; then
    build_module "pathfinding" "$NATIVE_DIR/pathfinding"
else
    echo -e "${YELLOW}⚠ Pathfinding module not found at $NATIVE_DIR/pathfinding${NC}"
fi

# Build DSP module
if [[ -d "$NATIVE_DIR/dsp" ]]; then
    build_module "dsp" "$NATIVE_DIR/dsp"
else
    echo -e "${YELLOW}⚠ DSP module not found at $NATIVE_DIR/dsp${NC}"
fi

# Summary
echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}  Build Complete${NC}"
echo -e "${BLUE}================================${NC}"
echo ""
echo "WASM modules are in: $WASM_OUTPUT_DIR"
echo ""
echo "To use in development:"
echo "  1. Start a local server from the frontend directory"
echo "  2. WASM modules will be loaded from /wasm/*.js"
echo ""
echo "Production deployment:"
echo "  Copy the contents of frontend/wasm/ to your web server"
echo "  Ensure proper MIME types are set:"
echo "    .wasm -> application/wasm"
echo "    .js   -> application/javascript"
