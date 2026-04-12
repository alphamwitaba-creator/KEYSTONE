# KEVLA Engine - Build Guide

## Overview

KEVLA Engine v2.0 is a native C++ game engine with an integrated editor. This guide covers building the engine from source on Windows.

## Requirements

### Software
- **Visual Studio 2022** (or 2019) with C++ workload
- **CMake 3.16+**
- **Git** (for dependency fetching)

### Dependencies (automatically fetched)
- GLFW 3.4 - Window management
- Dear ImGui v1.91 - UI framework
- GLM 1.0.1 - Math library
- spdlog 1.12 - Logging

## Build Instructions

### Option 1: Using CMake GUI

1. Open CMake GUI
2. Set source directory to `src-cpp`
3. Set build directory to `src-cpp/build`
4. Click "Configure"
5. Select your compiler (Visual Studio 2022)
6. Click "Generate"
7. Open the generated `.sln` file
8. Build the `kevla_editor` target

### Option 2: Using Command Line

```bash
cd src-cpp
mkdir build
cd build
cmake .. -G "Visual Studio 17 2022"
cmake --build . --config Release
```

### Option 3: Using Vcpkg

```bash
# Install dependencies
vcpkg install glfw imgui glm spdlog

# Build
cmake -B build -G "Visual Studio 17 2022" -DCMAKE_TOOLCHAIN_FILE=[vcpkg scripts]/cmake/vcpkg.cmake
cmake --build build
```

## Project Structure

```
src-cpp/
├── CMakeLists.txt           # Main build configuration
├── include/
│   └── kevla/
│       ├── Core.h            # Main engine class
│       ├── Types.h           # Type definitions
│       ├── Vector.h          # Vector math
│       ├── Matrix.h          # Matrix math
│       ├── Entity.h           # ECS entity
│       ├── Scene.h            # Scene management
│       ├── Logger.h           # Logging system
│       ├── render/
│       │   └── Renderer.h     # OpenGL renderer
│       └── editor/
│           ├── Editor.h       # Main editor
│           └── EditorPanels.h  # Editor panels
├── src/
│   ├── core/                  # Core engine implementation
│   ├── render/                # Renderer implementation
│   ├── physics/               # Physics (placeholder)
│   └── editor/
│       ├── main.cpp           # Entry point
│       ├── Editor.cpp         # Editor implementation
│       └── EditorPanels.cpp    # Panel implementations
└── third_party/              # Dependencies (auto-fetched)
```

## Running the Editor

After building, run:
```bash
./bin/kevla_editor.exe
```

## Editor Features

- **Scene View**: 3D viewport with camera controls
- **Hierarchy Panel**: Entity tree view
- **Inspector Panel**: Entity property editor
- **Toolbar**: Transform tools (Select, Move, Rotate, Scale)
- **Menu Bar**: File, Edit, GameObject, View, Help

## Architecture

### Core Systems
- **Entity Component System**: Game objects with components
- **Scene Management**: Multiple scenes with save/load
- **Rendering**: OpenGL 4.6 with PBR support
- **Physics**: Basic rigid body simulation (placeholder)

### Editor Architecture
- **ImGui-based UI**: Full docking, panels, menus
- **Gizmos**: Transform manipulation
- **Selection**: Entity selection with hierarchy awareness

## Troubleshooting

### CMake not found
Install CMake from cmake.org or via `winget install cmake`

### Visual Studio not detected
Ensure you have the "Desktop development with C++" workload installed

### Build fails
- Ensure all dependencies fetch correctly
- Try clearing the build folder and rebuilding
- Check the CMake output for specific errors

## Next Steps

- Implement terrain editor
- Add AI behavior FSM
- Implement VFX graph
- Add more rendering features (shaders, materials)

## License

MIT License - See LICENSE file