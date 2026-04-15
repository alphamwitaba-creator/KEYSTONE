cmake_minimum_required(VERSION 3.16)
project(KEVLAEngine VERSION 2.0.0 LANGUAGES CXX)

# C++ Standard
set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Output directories
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/bin)
set(CMAKE_LIBRARY_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/lib)
set(CMAKE_ARCHIVE_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/lib)

# Warning flags
if(MSVC)
    add_compile_options(/W4 /WX- /permissive-)
else()
    add_compile_options(-Wall -Wextra -Wpedantic)
endif()

# Dependencies
find_package(OpenGL REQUIRED)
find_package(Vulkan OPTIONAL)

# Fetch GLFW
include(FetchContent)
FetchContent_Declare(
    glfw
    GIT_REPOSITORY https://github.com/glfw/glfw.git
    GIT_TAG 3.4
)
FetchContent_MakeAvailable(glfw)

# Fetch Dear ImGui
FetchContent_Declare(
    imgui
    GIT_REPOSITORY https://github.com/ocornut/imgui.git
    GIT_TAG v1.91.7
)
FetchContent_MakeAvailable(imgui)

# Fetch GLM (math library)
FetchContent_Declare(
    glm
    GIT_REPOSITORY https://github.com/g-truc/glm.git
    GIT_TAG 1.0.1
)
FetchContent_MakeAvailable(glm)

# Fetch spdlog (logging)
FetchContent_Declare(
    spdlog
    GIT_REPOSITORY https://github.com/gabime/spdlog.git
    GIT_TAG v1.12.0
)
FetchContent_MakeAvailable(spdlog)

# Source files
set(ENGINE_HEADERS
    ${CMAKE_CURRENT_SOURCE_DIR}/include/kevla/Core.h
    ${CMAKE_CURRENT_SOURCE_DIR}/include/kevla/Types.h
    ${CMAKE_CURRENT_SOURCE_DIR}/include/kevla/Vector.h
    ${CMAKE_CURRENT_SOURCE_DIR}/include/kevla/Matrix.h
    ${CMAKE_CURRENT_SOURCE_DIR}/include/kevla/Entity.h
    ${CMAKE_CURRENT_SOURCE_DIR}/include/kevla/Scene.h
    ${CMAKE_CURRENT_SOURCE_DIR}/include/kevla/Logger.h
    ${CMAKE_CURRENT_SOURCE_DIR}/include/kevla/render/Renderer.h
)

set(ENGINE_SOURCES
    ${CMAKE_CURRENT_SOURCE_DIR}/src/core/Core.cpp
    ${CMAKE_CURRENT_SOURCE_DIR}/src/core/Logger.cpp
    ${CMAKE_CURRENT_SOURCE_DIR}/src/core/Entity.cpp
    ${CMAKE_CURRENT_SOURCE_DIR}/src/core/Scene.cpp
)

set(RENDERER_HEADERS
    ${CMAKE_CURRENT_SOURCE_DIR}/include/kevla/render/Renderer.h
    ${CMAKE_CURRENT_SOURCE_DIR}/include/kevla/render/Mesh.h
    ${CMAKE_CURRENT_SOURCE_DIR}/include/kevla/render/Material.h
    ${CMAKE_CURRENT_SOURCE_DIR}/include/kevla/render/Shader.h
    ${CMAKE_CURRENT_SOURCE_DIR}/include/kevla/render/Framebuffer.h
    ${CMAKE_CURRENT_SOURCE_DIR}/include/kevla/render/Light.h
)

set(RENDERER_SOURCES
    ${CMAKE_CURRENT_SOURCE_DIR}/src/render/Renderer.cpp
    ${CMAKE_CURRENT_SOURCE_DIR}/src/render/Mesh.cpp
    ${CMAKE_CURRENT_SOURCE_DIR}/src/render/Material.cpp
    ${CMAKE_CURRENT_SOURCE_DIR}/src/render/Shader.cpp
    ${CMAKE_CURRENT_SOURCE_DIR}/src/render/Framebuffer.cpp
    ${CMAKE_CURRENT_SOURCE_DIR}/src/render/Light.cpp
)

# Physics subsystem
set(PHYSICS_HEADERS
    ${CMAKE_CURRENT_SOURCE_DIR}/include/kevla/physics/PhysicsWorld.h
    ${CMAKE_CURRENT_SOURCE_DIR}/include/kevla/physics/RigidBody.h
    ${CMAKE_CURRENT_SOURCE_DIR}/include/kevla/physics/Collider.h
    ${CMAKE_CURRENT_SOURCE_DIR}/include/kevla/physics/Joint.h
)

set(PHYSICS_SOURCES
    ${CMAKE_CURRENT_SOURCE_DIR}/src/physics/PhysicsWorld.cpp
    ${CMAKE_CURRENT_SOURCE_DIR}/src/physics/RigidBody.cpp
    ${CMAKE_CURRENT_SOURCE_DIR}/src/physics/Collider.cpp
    ${CMAKE_CURRENT_SOURCE_DIR}/src/physics/Joint.cpp
)

# AI subsystem
set(AI_SOURCES
    ${CMAKE_CURRENT_SOURCE_DIR}/src/ai/BehaviorTree.cpp
)

# VFX subsystem
set(VFX_SOURCES
    ${CMAKE_CURRENT_SOURCE_DIR}/src/vfx/VFXGraph.cpp
)

# Sculpt subsystem
set(SCULPT_HEADERS
    ${CMAKE_CURRENT_SOURCE_DIR}/include/kevla/sculpt/Sculpt.h
)

set(SCULPT_SOURCES
    ${CMAKE_CURRENT_SOURCE_DIR}/src/sculpt/Sculpt.cpp
)

# Assets subsystem
set(ASSETS_HEADERS
    ${CMAKE_CURRENT_SOURCE_DIR}/include/kevla/assets/AssetManager.h
)

set(ASSETS_SOURCES
    ${CMAKE_CURRENT_SOURCE_DIR}/src/assets/AssetManager.cpp
)

# Animation subsystem
set(ANIMATION_HEADERS
    ${CMAKE_CURRENT_SOURCE_DIR}/include/kevla/animation/Animation.h
)

set(ANIMATION_SOURCES
    ${CMAKE_CURRENT_SOURCE_DIR}/src/animation/Animation.cpp
)

# Serialization subsystem
set(SERIALIZATION_HEADERS
    ${CMAKE_CURRENT_SOURCE_DIR}/include/kevla/serialization/SceneSerialization.h
)

set(SERIALIZATION_SOURCES
    ${CMAKE_CURRENT_SOURCE_DIR}/src/serialization/SceneSerialization.cpp
)

set(EDITOR_HEADERS
    ${CMAKE_CURRENT_SOURCE_DIR}/include/kevla/editor/Editor.h
    ${CMAKE_CURRENT_SOURCE_DIR}/include/kevla/editor/EditorPanels.h
    ${CMAKE_CURRENT_SOURCE_DIR}/include/kevla/editor/Gizmo.h
    ${CMAKE_CURRENT_SOURCE_DIR}/include/kevla/editor/UndoRedo.h
    ${CMAKE_CURRENT_SOURCE_DIR}/include/kevla/editor/Hotkeys.h
    ${CMAKE_CURRENT_SOURCE_DIR}/include/kevla/editor/SculptPanel.h
    ${CMAKE_CURRENT_SOURCE_DIR}/include/kevla/editor/UVEditor.h
    ${CMAKE_CURRENT_SOURCE_DIR}/include/kevla/editor/MaterialEditor.h
)

set(EDITOR_SOURCES
    ${CMAKE_CURRENT_SOURCE_DIR}/src/editor/Editor.cpp
    ${CMAKE_CURRENT_SOURCE_DIR}/src/editor/EditorPanels.cpp
    ${CMAKE_CURRENT_SOURCE_DIR}/src/editor/Gizmo.cpp
    ${CMAKE_CURRENT_SOURCE_DIR}/src/editor/UndoRedo.cpp
    ${CMAKE_CURRENT_SOURCE_DIR}/src/editor/Hotkeys.cpp
    ${CMAKE_CURRENT_SOURCE_DIR}/src/editor/SculptPanel.cpp
    ${CMAKE_CURRENT_SOURCE_DIR}/src/editor/UVEditor.cpp
    ${CMAKE_CURRENT_SOURCE_DIR}/src/editor/MaterialEditor.cpp
)

# Create engine library
add_library(kevla_core STATIC
    ${ENGINE_HEADERS}
    ${ENGINE_SOURCES}
    ${RENDERER_HEADERS}
    ${RENDERER_SOURCES}
    ${PHYSICS_HEADERS}
    ${PHYSICS_SOURCES}
    ${AI_SOURCES}
    ${VFX_SOURCES}
    ${SCULPT_HEADERS}
    ${SCULPT_SOURCES}
    ${ASSETS_HEADERS}
    ${ASSETS_SOURCES}
    ${ANIMATION_HEADERS}
    ${ANIMATION_SOURCES}
    ${SERIALIZATION_HEADERS}
    ${SERIALIZATION_SOURCES}
)

target_include_directories(kevla_core PUBLIC
    ${CMAKE_CURRENT_SOURCE_DIR}/include
    ${glm_SOURCE_DIR}
    ${spdlog_SOURCE_DIR}/include
)

target_link_libraries(kevla_core PUBLIC
    glfw
    OpenGL::GL
    spdlog::spdlog
    imgui
)

# Create editor executable
add_executable(kevla_editor
    src/editor/main.cpp
    ${EDITOR_HEADERS}
    ${EDITOR_SOURCES}
)

target_include_directories(kevla_editor PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/include
    ${glm_SOURCE_DIR}
    ${imgui_SOURCE_DIR}
    ${spdlog_SOURCE_DIR}/include
)

target_link_libraries(kevla_editor PRIVATE
    kevla_core
    glfw
    OpenGL::GL
    imgui
    spdlog::spdlog
)

# Copy resources to binary directory
add_custom_command(TARGET kevla_editor POST_BUILD
    COMMAND ${CMAKE_COMMAND} -E copy_directory
    ${CMAKE_SOURCE_DIR}/assets
    $<TARGET_FILE_DIR:kevla_editor>/assets
)

# Windows-specific settings
if(WIN32)
    target_compile_definitions(kevla_editor PRIVATE _CRT_SECURE_NO_WARNINGS)
    target_compile_definitions(kevla_core PRIVATE _CRT_SECURE_NO_WARNINGS)
    
    # Use static runtime (no need for Visual C++ Redistributable)
    set(CMAKE_MSVC_RUNTIME_LIBRARY "MultiThreaded$<$<CONFIG:Debug>:Debug>")
    
    # Enable console for debugging
    set_target_properties(kevla_editor PROPERTIES
        LINK_FLAGS "/SUBSYSTEM:CONSOLE"
    )
    
    # Collect all DLLs for release
    add_custom_command(TARGET kevla_editor POST_BUILD
        COMMAND ${CMAKE_COMMAND} -E copy_if_different
        $<TARGET_FILE_DIR:kevla_editor>/../glfw/src/Debug/glfw3.dll
        $<TARGET_FILE_DIR:kevla_editor>/
    )
endif()

# Installation rules
install(TARGETS kevla_editor RUNTIME DESTINATION bin)

message(STATUS "KEVLA Engine configuration complete")
message(STATUS "  Build type: ${CMAKE_BUILD_TYPE}")
message(STATUS "  C++ standard: ${CMAKE_CXX_STANDARD}")
message(STATUS "  Compiler: ${CMAKE_CXX_COMPILER_ID}")