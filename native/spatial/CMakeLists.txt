cmake_minimum_required(VERSION 3.14)
project(AeronavSpatial VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

set(SPATIAL_SOURCES src/spatial.cpp bindings/wasm_spatial_bindings.cpp)

if(EMSCRIPTEN)
    set(CMAKE_EXECUTABLE_SUFFIX ".js")
    set(EMSCRIPTEN_FLAGS "-O3" "-flto" "-fno-exceptions")
    set(EMSCRIPTEN_LINK_FLAGS "--bind" "-s WASM=1" "-s MODULARIZE=1" "-s EXPORT_ES6=1"
        "-s EXPORT_NAME='createSpatialModule'" "-s ENVIRONMENT='web,worker'"
        "-s ALLOW_MEMORY_GROWTH=1" "-s NO_EXIT_RUNTIME=1")
    string(REPLACE ";" " " EMSCRIPTEN_FLAGS_STR "${EMSCRIPTEN_FLAGS}")
    string(REPLACE ";" " " EMSCRIPTEN_LINK_FLAGS_STR "${EMSCRIPTEN_LINK_FLAGS}")
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} ${EMSCRIPTEN_FLAGS_STR}")
    set(CMAKE_EXE_LINKER_FLAGS "${CMAKE_EXE_LINKER_FLAGS} ${EMSCRIPTEN_LINK_FLAGS_STR}")
    add_executable(spatial ${SPATIAL_SOURCES})
    add_custom_command(TARGET spatial POST_BUILD
        COMMAND ${CMAKE_COMMAND} -E copy $<TARGET_FILE:spatial> ${CMAKE_SOURCE_DIR}/../../frontend/wasm/spatial.js
        COMMAND ${CMAKE_COMMAND} -E copy $<TARGET_FILE_DIR:spatial>/spatial.wasm ${CMAKE_SOURCE_DIR}/../../frontend/wasm/spatial.wasm)
else()
    add_library(spatial STATIC ${SPATIAL_SOURCES})
endif()
target_include_directories(spatial PRIVATE ${CMAKE_CURRENT_SOURCE_DIR}/src)
