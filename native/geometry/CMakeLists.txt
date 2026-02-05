cmake_minimum_required(VERSION 3.14)
project(AeronavGeometry VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

set(GEO_SOURCES src/mesh.cpp bindings/wasm_geo_bindings.cpp)

if(EMSCRIPTEN)
    set(CMAKE_EXECUTABLE_SUFFIX ".js")
    set(EMSCRIPTEN_FLAGS "-O3" "-flto" "-fno-exceptions")
    set(EMSCRIPTEN_LINK_FLAGS "--bind" "-s WASM=1" "-s MODULARIZE=1" "-s EXPORT_ES6=1"
        "-s EXPORT_NAME='createGeometryModule'" "-s ENVIRONMENT='web,worker'"
        "-s ALLOW_MEMORY_GROWTH=1" "-s NO_EXIT_RUNTIME=1")
    string(REPLACE ";" " " EMSCRIPTEN_FLAGS_STR "${EMSCRIPTEN_FLAGS}")
    string(REPLACE ";" " " EMSCRIPTEN_LINK_FLAGS_STR "${EMSCRIPTEN_LINK_FLAGS}")
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} ${EMSCRIPTEN_FLAGS_STR}")
    set(CMAKE_EXE_LINKER_FLAGS "${CMAKE_EXE_LINKER_FLAGS} ${EMSCRIPTEN_LINK_FLAGS_STR}")
    add_executable(geometry ${GEO_SOURCES})
    add_custom_command(TARGET geometry POST_BUILD
        COMMAND ${CMAKE_COMMAND} -E copy $<TARGET_FILE:geometry> ${CMAKE_SOURCE_DIR}/../../frontend/wasm/geometry.js
        COMMAND ${CMAKE_COMMAND} -E copy $<TARGET_FILE_DIR:geometry>/geometry.wasm ${CMAKE_SOURCE_DIR}/../../frontend/wasm/geometry.wasm)
else()
    add_library(geometry STATIC ${GEO_SOURCES})
endif()
target_include_directories(geometry PRIVATE ${CMAKE_CURRENT_SOURCE_DIR}/src)
