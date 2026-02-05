cmake_minimum_required(VERSION 3.14)
project(AeronavDSP VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

set(DSP_SOURCES src/dsp.cpp bindings/wasm_dsp_bindings.cpp)

if(EMSCRIPTEN)
    set(CMAKE_EXECUTABLE_SUFFIX ".js")
    set(EMSCRIPTEN_FLAGS "-O3" "-flto" "-fno-exceptions")
    set(EMSCRIPTEN_LINK_FLAGS "--bind" "-s WASM=1" "-s MODULARIZE=1" "-s EXPORT_ES6=1"
        "-s EXPORT_NAME='createDSPModule'" "-s ENVIRONMENT='web,worker'"
        "-s ALLOW_MEMORY_GROWTH=1" "-s NO_EXIT_RUNTIME=1")
    string(REPLACE ";" " " EMSCRIPTEN_FLAGS_STR "${EMSCRIPTEN_FLAGS}")
    string(REPLACE ";" " " EMSCRIPTEN_LINK_FLAGS_STR "${EMSCRIPTEN_LINK_FLAGS}")
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} ${EMSCRIPTEN_FLAGS_STR}")
    set(CMAKE_EXE_LINKER_FLAGS "${CMAKE_EXE_LINKER_FLAGS} ${EMSCRIPTEN_LINK_FLAGS_STR}")
    add_executable(dsp ${DSP_SOURCES})
    add_custom_command(TARGET dsp POST_BUILD
        COMMAND ${CMAKE_COMMAND} -E copy $<TARGET_FILE:dsp> ${CMAKE_SOURCE_DIR}/../../frontend/wasm/dsp.js
        COMMAND ${CMAKE_COMMAND} -E copy $<TARGET_FILE_DIR:dsp>/dsp.wasm ${CMAKE_SOURCE_DIR}/../../frontend/wasm/dsp.wasm)
else()
    add_library(dsp STATIC ${DSP_SOURCES})
endif()
target_include_directories(dsp PRIVATE ${CMAKE_CURRENT_SOURCE_DIR}/src)
