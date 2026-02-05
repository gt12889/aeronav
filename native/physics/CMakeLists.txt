cmake_minimum_required(VERSION 3.14)
project(AeronavPhysics VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Source files
set(PHYSICS_SOURCES
    src/physics_engine.cpp
    src/rigid_body.cpp
    bindings/wasm_bindings.cpp
)

set(PHYSICS_HEADERS
    src/vector3.hpp
    src/quaternion.hpp
    src/rigid_body.hpp
    src/physics_engine.hpp
)

# Emscripten-specific configuration
if(EMSCRIPTEN)
    set(CMAKE_EXECUTABLE_SUFFIX ".js")

    # Optimization and SIMD flags
    set(EMSCRIPTEN_FLAGS
        "-O3"
        "-flto"
        "-fno-exceptions"
        "-msimd128"
        "-msse"
        "-msse2"
    )

    # Linker flags for ES module output
    set(EMSCRIPTEN_LINK_FLAGS
        "--bind"
        "-s WASM=1"
        "-s MODULARIZE=1"
        "-s EXPORT_ES6=1"
        "-s EXPORT_NAME='createPhysicsModule'"
        "-s ENVIRONMENT='web,worker'"
        "-s ALLOW_MEMORY_GROWTH=1"
        "-s INITIAL_MEMORY=16777216"
        "-s STACK_SIZE=1048576"
        "-s NO_EXIT_RUNTIME=1"
        "-s MALLOC=emmalloc"
        "-s ASSERTIONS=0"
        "-s SINGLE_FILE=0"
    )

    string(REPLACE ";" " " EMSCRIPTEN_FLAGS_STR "${EMSCRIPTEN_FLAGS}")
    string(REPLACE ";" " " EMSCRIPTEN_LINK_FLAGS_STR "${EMSCRIPTEN_LINK_FLAGS}")

    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} ${EMSCRIPTEN_FLAGS_STR}")
    set(CMAKE_EXE_LINKER_FLAGS "${CMAKE_EXE_LINKER_FLAGS} ${EMSCRIPTEN_LINK_FLAGS_STR}")

    add_executable(physics_engine ${PHYSICS_SOURCES} ${PHYSICS_HEADERS})

    # Copy output files to frontend/wasm after build
    add_custom_command(TARGET physics_engine POST_BUILD
        COMMAND ${CMAKE_COMMAND} -E copy
            $<TARGET_FILE:physics_engine>
            ${CMAKE_SOURCE_DIR}/../../frontend/wasm/physics_engine.js
        COMMAND ${CMAKE_COMMAND} -E copy
            $<TARGET_FILE_DIR:physics_engine>/physics_engine.wasm
            ${CMAKE_SOURCE_DIR}/../../frontend/wasm/physics_engine.wasm
        COMMENT "Copying WASM output to frontend/wasm/"
    )
else()
    # Native build for testing (optional)
    add_library(physics_engine STATIC ${PHYSICS_SOURCES} ${PHYSICS_HEADERS})
    target_compile_options(physics_engine PRIVATE -O3 -march=native)
endif()

target_include_directories(physics_engine PRIVATE ${CMAKE_CURRENT_SOURCE_DIR}/src)
