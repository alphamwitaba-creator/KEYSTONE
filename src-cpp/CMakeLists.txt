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
    include/kevla/Core.h
    include/kevla/Types.h
    include/kevla/Vector.h
    include/kevla/Matrix.h
    include/kevla/Transform.h
    include/kevla/Entity.h
    include/kevla/Scene.h
    include/kevla/Logger.h
)

set(ENGINE_SOURCES
    src/core/Core.cpp
    src/core/Logger.cpp
    src/core/Types.cpp
)

set(RENDERER_HEADERS
    include/kevla/render/Renderer.h
    include/kevla/render/Camera.h
    include/kevla/render/Mesh.h
    include/kevla/render/Material.h
    include/kevla/render/Shader.h
    include/kevla/render/Framebuffer.h
    include/kevla/render/Light.h
)

set(RENDERER_SOURCES
    src/render/Renderer.cpp
    src/render/Camera.cpp
    src/render/Mesh.cpp
    src/render/Material.cpp
    src/render/Shader.cpp
)

set(PHYSICS_HEADERS
    include/kevla/physics/PhysicsWorld.h
    include/kevla/physics/RigidBody.h
    include/kevla/physics/Collider.h
    include/kevla/physics/Joint.h
)

set(PHYSICS_SOURCES
    src/physics/PhysicsWorld.cpp
    src/physics/RigidBody.cpp
    src/physics/Collider.cpp
    src/physics/Joint.cpp
)

set(EDITOR_HEADERS
    include/kevla/editor/Editor.h
    include/kevla/editor/EditorCamera.h
    include/kevla/editor/SceneView.h
    include/kevla/editor/HierarchyPanel.h
    include/kevla/editor/InspectorPanel.h
    include/kevla/editor/ToolbarPanel.h
)

set(EDITOR_SOURCES
    src/editor/Editor.cpp
    src/editor/SceneView.cpp
    src/editor/HierarchyPanel.cpp
    src/editor/InspectorPanel.cpp
    src/editor/ToolbarPanel.cpp
)

# Create engine library
add_library(kevla_core STATIC
    ${ENGINE_HEADERS}
    ${ENGINE_SOURCES}
    ${RENDERER_HEADERS}
    ${RENDERER_SOURCES}
    ${PHYSICS_HEADERS}
    ${PHYSICS_SOURCES}
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
    Vulkan::Vulkan
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
    
    # Enable console for debugging
    set_target_properties(kevla_editor PROPERTIES
        LINK_FLAGS "/SUBSYSTEM:CONSOLE"
    )
endif()

# Installation rules
install(TARGETS kevla_editor RUNTIME DESTINATION bin)

message(STATUS "KEVLA Engine configuration complete")
message(STATUS "  Build type: ${CMAKE_BUILD_TYPE}")
message(STATUS "  C++ standard: ${CMAKE_CXX_STANDARD}")
message(STATUS "  Compiler: ${CMAKE_CXX_COMPILER_ID}")