cmake_minimum_required(VERSION 3.14)
project(AeronavAudio VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Source files
set(AUDIO_SOURCES
    src/audio_fft.cpp
    src/audio_augmentation.cpp
    bindings/wasm_audio_bindings.cpp
)

set(AUDIO_HEADERS
    src/audio_fft.hpp
    src/audio_augmentation.hpp
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
        "-s EXPORT_NAME='createAudioModule'"
        "-s ENVIRONMENT='web,worker'"
        "-s ALLOW_MEMORY_GROWTH=1"
        "-s INITIAL_MEMORY=4194304"
        "-s STACK_SIZE=524288"
        "-s NO_EXIT_RUNTIME=1"
        "-s MALLOC=emmalloc"
        "-s ASSERTIONS=0"
        "-s SINGLE_FILE=0"
    )

    string(REPLACE ";" " " EMSCRIPTEN_FLAGS_STR "${EMSCRIPTEN_FLAGS}")
    string(REPLACE ";" " " EMSCRIPTEN_LINK_FLAGS_STR "${EMSCRIPTEN_LINK_FLAGS}")

    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} ${EMSCRIPTEN_FLAGS_STR}")
    set(CMAKE_EXE_LINKER_FLAGS "${CMAKE_EXE_LINKER_FLAGS} ${EMSCRIPTEN_LINK_FLAGS_STR}")

    add_executable(audio_fft ${AUDIO_SOURCES} ${AUDIO_HEADERS})

    # Copy output files to frontend/wasm after build
    add_custom_command(TARGET audio_fft POST_BUILD
        COMMAND ${CMAKE_COMMAND} -E copy
            $<TARGET_FILE:audio_fft>
            ${CMAKE_SOURCE_DIR}/../../frontend/wasm/audio_fft.js
        COMMAND ${CMAKE_COMMAND} -E copy
            $<TARGET_FILE_DIR:audio_fft>/audio_fft.wasm
            ${CMAKE_SOURCE_DIR}/../../frontend/wasm/audio_fft.wasm
        COMMENT "Copying WASM output to frontend/wasm/"
    )
else()
    # Native build for testing (optional)
    add_library(audio_fft STATIC ${AUDIO_SOURCES} ${AUDIO_HEADERS})
    target_compile_options(audio_fft PRIVATE -O3 -march=native)
endif()

target_include_directories(audio_fft PRIVATE ${CMAKE_CURRENT_SOURCE_DIR}/src)
