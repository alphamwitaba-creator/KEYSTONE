# Changelog

## [2.0.0] — 2026-03-29

### New Features

#### Undo / Redo (Ctrl+Z / Ctrl+Y)
- Full history stack (50 levels) on all entity mutations
- `pushHistory()` called before every destructive action
- Undo/Redo buttons in Hierarchy panel header

#### Multi-Select
- Ctrl+Click to add/remove entities from selection
- Ctrl+A to select all entities
- Bulk delete (Delete key), bulk duplicate
- Multi-select toolbar shows count + actions
- `selectedIds: Set<string>` in store

#### SendMessage (Lua Inter-Entity Messaging)
- `SendMessage("EntityName", "MethodName", arg1, arg2)` from any Lua script
- Messages queue during frame, flushed after all scripts run
- `registerMessageHandler(entityId, method, fn)` for native handlers
- New preset: "SendMessage Demo"

#### Post-Processing (Viewport)
- Bloom, vignette, chromatic aberration, film grain
- Saturation, contrast, tone mapping exposure
- FXAA anti-aliasing toggle
- CSS filter pipeline on Three.js canvas
- Canvas 2D overlay for vignette + chromatic aberration
- Live toggle in Inspector (no entity selected → Scene Settings)

#### Prefabs System
- Save any entity as a reusable prefab (persisted to localStorage)
- Prefabs tab in Bottom Panel with grid view
- Spawn (instantiate) prefabs with random position offset
- Delete prefabs
- 📦 save button in Inspector and Hierarchy

#### Audio Engine
- Full Web Audio API with 3D spatial audio (PannerNode HRTF)
- AudioSource component: volume, pitch, loop, playOnAwake, 3D/2D
- Import .mp3, .ogg, .wav, .opus audio assets
- `Audio.Play(assetId)` / `Audio.Stop()` from Lua scripts
- Preview audio in Inspector

#### Animation State Machine
- States with clip assignments
- Transitions with parameter conditions (bool, float, int, trigger)
- Blend weight during transitions
- Parameter editor in Inspector
- `stepStateMachine()` in types.ts

---


All notable changes to KEVLA Engine are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

---

## [1.0.0] — 2026-03-13

### 🎉 Initial Release

#### Core Engine
- Entity Component System with transform, material, rigidbody, collider, and script components
- Real-time 3D viewport with Three.js rendering, shadows, and PBR materials
- Scene save/load system using JSON serialization
- Play/Stop mode with automatic scene state snapshot and restore
- 6 primitive mesh types: cube, sphere, cylinder, plane, cone, torus

#### Physics Engine
- Custom physics simulation with gravity, mass, drag, and restitution
- AABB broadphase + SAT narrowphase collision detection
- Impulse-based collision resolution with friction
- Box, sphere, and capsule collider shapes
- Physics material system (friction, bounciness, density)
- Debug visualization for colliders, velocity vectors, and contact points

#### Lua Scripting
- Built-in Lua-to-JavaScript transpiler with entity API bindings
- Entity control: position, rotation, scale access from scripts
- Input API: GetKey, GetKeyDown, GetKeyUp, GetMouseButton, GetMouseX/Y
- Lifecycle functions: Start() and Update() per entity
- Persistent state between frames via _state table
- 12 preset scripts for common gameplay patterns
- Live script editor with syntax highlighting and error display

#### Time-Travel Debugging
- Automatic frame-by-frame state recording during play mode
- Timeline scrubber with drag-to-rewind interface
- Delta compression with configurable keyframe intervals (3-30× compression ratio)
- Ghost rendering showing past and future entity positions
- Frame Inspector panel showing per-entity state at any recorded frame
- Frame Comparison mode to diff two frames side by side
- Waveform minimap showing activity, contacts, and energy over time
- Bookmarkable frames and timeline branching

#### Parallel Reality Testing
- Run 2-4 simultaneous simulation copies with different parameters
- Split viewport rendering for side-by-side comparison
- Preset parameter variations (gravity, friction, time scale)
- Divergence detection between realities

#### Editor UI
- Unity-style layout with Hierarchy, Inspector, Viewport, Console, and Asset Browser
- Resizable docking panels with drag handles
- 50+ custom SVG icons
- Professional dark theme with customizable accent colors
- Custom branding system (upload logo, change engine name)
- Entity search, rename, duplicate, and delete
- Component add/remove with visual editors

#### Build System
- Electron desktop packaging with native window chrome
- NSIS installer for Windows (welcome screen, install location, progress, finish)
- Cross-platform support: Windows (.exe), macOS (.dmg), Linux (.AppImage)
- Full C++ engine source code export with CMake build system
- Desktop and Start Menu shortcut creation

---

## [Unreleased]

### Planned
- Undo/redo system
- Multi-select entities
- Prefab system
- Audio system
- Terrain editor
- Particle system
- Animation system
- Post-processing effects
