// ============================================================
// KEVLA ENGINE — Global State Store v2.0
// NEW: Audio, Undo/Redo, Multi-Select, Prefabs,
//      Post-Processing, AnimStateMachine, SendMessage
// ============================================================

import { create } from 'zustand';
import {
  type Entity, type MeshType, type MaterialComponent, type RigidbodyComponent,
  type ColliderComponent, type ColliderShapeType, type ScriptComponent,
  type ConsoleMessage, type SceneData, type MeshRenderer, type AssetEntry,
  type AnimationComponent, type SceneSettings, type AnimStateMachine,
  type AudioSourceComponent, type PostProcessConfig, type PrefabData,
  type SculptConfig, DEFAULT_SCENE_SETTINGS, DEFAULT_AUDIO_SOURCE, DEFAULT_POST_PROCESS, DEFAULT_SCULPT_CONFIG,
  createDefaultStateMachine, stepStateMachine,
  type TerrainConfig, type WaterConfig, type ParticleEmitter,
  DEFAULT_TERRAIN_CONFIG, DEFAULT_WATER_CONFIG, DEFAULT_PARTICLE_EMITTER,
  type CharacterControllerComponent, type VehicleComponent, type RagdollComponent, type SoftBodyComponent,
  DEFAULT_CHARACTER_CONTROLLER, DEFAULT_VEHICLE_COMPONENT, DEFAULT_RAGDOLL_COMPONENT, DEFAULT_SOFT_BODY_COMPONENT,
} from './types';
import { PhysicsWorld, createPhysicsBody, type PhysicsConfig, type Contact, type CollisionEvent, DEFAULT_PHYSICS_CONFIG } from './physics';
import { LuaVM, createInputState, type InputState, LUA_PRESETS } from './lua';
import { TemporalEngine, type TemporalConfig, type GhostEntity, DEFAULT_TEMPORAL_CONFIG } from './temporal';
import { ParallelEngine, type ParallelViewMode, type RealityOverrides } from './parallel';
import { AudioEngine } from './audio';
import { SculptSystem } from './sculpt/SculptSystem';
import { ParticleSystem } from './ParticleSystem';
import { TerrainSystem } from './TerrainSystem';
import { WaterSystem } from './WaterSystem';
import { CharacterControllerSystem } from './CharacterController';

let _idCounter = 0;
const uid = (prefix = 'entity') => `${prefix}_${Date.now()}_${_idCounter++}`;
const vec3 = (x = 0, y = 0, z = 0) => ({ x, y, z });

const defaultMaterial = (): MaterialComponent => ({ color: '#5b8def', metallic: 0.2, roughness: 0.6, emissive: '#000000', opacity: 1, wireframe: false });
const defaultRigidbody = (mass = 1): RigidbodyComponent => ({ mass, useGravity: mass > 0, isKinematic: mass === 0, drag: 0.05, angularDrag: 0.1, restitution: 0.4, friction: 0.5, velocity: vec3(), angularVelocity: vec3(), freezePositionX: false, freezePositionY: false, freezePositionZ: false, freezeRotationX: false, freezeRotationY: false, freezeRotationZ: false });
const defaultBoxCollider = (scale = vec3(1,1,1)): ColliderComponent => ({ shape: 'box', size: { ...scale }, radius: 0.5, height: 1, center: vec3(), isTrigger: false, showWireframe: true });
const defaultSphereCollider = (): ColliderComponent => ({ shape: 'sphere', size: vec3(1,1,1), radius: 0.5, height: 1, center: vec3(), isTrigger: false, showWireframe: true });

const createDefaultEntities = (): Entity[] => [
  { id: 'ground_plane', name: 'Ground', active: true, transform: { position: vec3(0,-0.05,0), rotation: vec3(), scale: vec3(20,0.1,20) }, meshRenderer: { meshType: 'cube', visible: true }, material: { color: '#3d3d3d', metallic: 0.05, roughness: 0.95, emissive: '#000000', opacity: 1, wireframe: false }, rigidbody: defaultRigidbody(0), collider: { shape: 'box', size: vec3(20,0.1,20), radius: 0.5, height: 1, center: vec3(), isTrigger: false, showWireframe: false }, scripts: [] },
  { id: 'player_cube', name: 'Player', active: true, transform: { position: vec3(0,0.5,0), rotation: vec3(), scale: vec3(1,1,1) }, meshRenderer: { meshType: 'cube', visible: true }, material: { color: '#4488ff', metallic: 0.3, roughness: 0.5, emissive: '#000000', opacity: 1, wireframe: false }, scripts: [{ name: 'WASD Movement', code: LUA_PRESETS.move_wasd.code, enabled: true }] },
  { id: 'orbiting_sphere', name: 'Orbiter', active: true, transform: { position: vec3(3,1.5,0), rotation: vec3(), scale: vec3(0.8,0.8,0.8) }, meshRenderer: { meshType: 'sphere', visible: true }, material: { color: '#ff6644', metallic: 0.7, roughness: 0.3, emissive: '#000000', opacity: 1, wireframe: false }, scripts: [{ name: 'Orbit', code: LUA_PRESETS.orbit.code, enabled: true }] },
  { id: 'spinning_torus', name: 'Spinner', active: true, transform: { position: vec3(-3,1,-2), rotation: vec3(), scale: vec3(1.2,1.2,1.2) }, meshRenderer: { meshType: 'torus', visible: true }, material: { color: '#44cc88', metallic: 0.9, roughness: 0.1, emissive: '#000000', opacity: 1, wireframe: false }, scripts: [{ name: 'Rotate', code: LUA_PRESETS.rotate.code, enabled: true }] },
  { id: 'physics_ball', name: 'Physics Ball', active: true, transform: { position: vec3(2,6,-1), rotation: vec3(), scale: vec3(1,1,1) }, meshRenderer: { meshType: 'sphere', visible: true }, material: { color: '#ffaa22', metallic: 0.5, roughness: 0.4, emissive: '#000000', opacity: 1, wireframe: false }, rigidbody: { ...defaultRigidbody(1), restitution: 0.7 }, collider: defaultSphereCollider(), scripts: [] },
];

const globalInputState = createInputState();

function setupInputListeners(inputState: InputState): () => void {
  const onKeyDown = (e: KeyboardEvent) => { const k = e.key.toLowerCase(); if (!inputState.keys.has(k)) inputState.keysDown.add(k); inputState.keys.add(k); };
  const onKeyUp = (e: KeyboardEvent) => { const k = e.key.toLowerCase(); inputState.keys.delete(k); inputState.keysUp.add(k); };
  const onMouseMove = (e: MouseEvent) => { inputState.mouseX = e.clientX/window.innerWidth; inputState.mouseY = e.clientY/window.innerHeight; inputState.mouseDeltaX = e.movementX/window.innerWidth; inputState.mouseDeltaY = e.movementY/window.innerHeight; };
  const onMouseDown = (e: MouseEvent) => inputState.mouseButtons.add(e.button);
  const onMouseUp = (e: MouseEvent) => inputState.mouseButtons.delete(e.button);
  window.addEventListener('keydown', onKeyDown); window.addEventListener('keyup', onKeyUp);
  window.addEventListener('mousemove', onMouseMove); window.addEventListener('mousedown', onMouseDown); window.addEventListener('mouseup', onMouseUp);
  return () => { window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp); window.removeEventListener('mousemove', onMouseMove); window.removeEventListener('mousedown', onMouseDown); window.removeEventListener('mouseup', onMouseUp); };
}
setupInputListeners(globalInputState);

function syncEntitiesToPhysics(entities: Entity[], world: PhysicsWorld): void {
  world.clear();
  entities.forEach(entity => {
    if (!entity.active || !entity.rigidbody || !entity.collider) return;
    const body = createPhysicsBody(entity.id, entity.transform.position, entity.transform.rotation, entity.transform.scale,
      { mass: entity.rigidbody.mass, useGravity: entity.rigidbody.useGravity, isKinematic: entity.rigidbody.isKinematic, drag: entity.rigidbody.drag, angularDrag: entity.rigidbody.angularDrag, restitution: entity.rigidbody.restitution, friction: entity.rigidbody.friction, velocity: entity.rigidbody.velocity, angularVelocity: entity.rigidbody.angularVelocity },
      { shape: entity.collider.shape, size: entity.collider.size, center: entity.collider.center, radius: entity.collider.radius, height: entity.collider.height, isTrigger: entity.collider.isTrigger });
    world.addBody(body);
  });
}

const MAX_UNDO = 50;

export interface EngineState {
  projectName: string; sceneName: string;
  engineLogo: string | null; engineName: string; engineAccentColor: string;
  entities: Entity[]; selectedId: string | null; selectedIds: Set<string>; entityCounter: number;
  isPlaying: boolean; isPaused: boolean; prePlaySnapshot: Entity[] | null; playTime: number;
  physicsWorld: PhysicsWorld; physicsConfig: PhysicsConfig; physicsDebug: boolean;
  showColliders: boolean; showVelocities: boolean; showContacts: boolean;
  debugContacts: Contact[]; collisionEvents: CollisionEvent[];
  luaVM: LuaVM; inputState: InputState; scriptErrors: Map<string,string>; activeScriptCount: number;
  consoleMessages: ConsoleMessage[]; activeBottomTab: 'console'|'assets'|'physics'|'scripts'|'prefabs'|'sculpt';
  showNewSceneDialog: boolean; showSaveDialog: boolean; showLoadDialog: boolean;
  temporalEngine: TemporalEngine; temporalConfig: TemporalConfig; temporalGhosts: GhostEntity[];
  parallelEngine: ParallelEngine; parallelEnabled: boolean; parallelViewMode: ParallelViewMode;
  assets: AssetEntry[];
  sceneSettings: SceneSettings;
  // NEW
  undoStack: Entity[][];
  redoStack: Entity[][];
  audioEngine: AudioEngine;
  masterVolume: number;
  prefabs: PrefabData[];
  postProcess: PostProcessConfig;
  sculptConfig: SculptConfig;
  sculptSystem: SculptSystem;
  particleSystem: ParticleSystem;
  terrainSystem: TerrainSystem;
  waterSystem: WaterSystem;
  characterControllerSystem: CharacterControllerSystem;

  // Entity actions
  addEntity: (type: MeshType, name?: string) => void;
  removeEntity: (id: string) => void;
  duplicateEntity: (id: string) => void;
  selectEntity: (id: string | null) => void;
  toggleSelectEntity: (id: string, additive: boolean) => void;
  selectAll: () => void;
  clearSelection: () => void;
  deleteSelected: () => void;
  duplicateSelected: () => void;
  renameEntity: (id: string, name: string) => void;
  toggleEntityActive: (id: string) => void;
  updateTransformField: (id: string, component: 'position'|'rotation'|'scale', axis: 'x'|'y'|'z', value: number) => void;
  setMeshType: (id: string, type: MeshType) => void;
  setMeshVisible: (id: string, visible: boolean) => void;
  updateMaterial: (id: string, updates: Partial<MaterialComponent>) => void;
  updateEntity: (id: string, updates: Partial<Entity>) => void;
  addRigidbody: (id: string) => void;
  removeRigidbody: (id: string) => void;
  updateRigidbody: (id: string, updates: Partial<RigidbodyComponent>) => void;
  addCollider: (id: string, shape?: ColliderShapeType) => void;
  removeCollider: (id: string) => void;
  updateCollider: (id: string, updates: Partial<ColliderComponent>) => void;
  setColliderShape: (id: string, shape: ColliderShapeType) => void;
  addTerrain: (id: string) => void; removeTerrain: (id: string) => void; updateTerrain: (id: string, updates: Partial<TerrainConfig>) => void;
  addWater: (id: string) => void; removeWater: (id: string) => void; updateWater: (id: string, updates: Partial<WaterConfig>) => void;
  addParticleEmitter: (id: string) => void; removeParticleEmitter: (id: string) => void; updateParticleEmitter: (id: string, updates: Partial<ParticleEmitter>) => void;
  addCharacterController: (id: string) => void; removeCharacterController: (id: string) => void; updateCharacterController: (id: string, updates: Partial<CharacterControllerComponent>) => void;
  addVehicle: (id: string) => void; removeVehicle: (id: string) => void; updateVehicle: (id: string, updates: Partial<VehicleComponent>) => void;
  addRagdoll: (id: string) => void; removeRagdoll: (id: string) => void; updateRagdoll: (id: string, updates: Partial<RagdollComponent>) => void;
  addSoftBody: (id: string) => void; removeSoftBody: (id: string) => void; updateSoftBody: (id: string, updates: Partial<SoftBodyComponent>) => void;
  updatePhysicsConfig: (updates: Partial<PhysicsConfig>) => void;
  togglePhysicsDebug: () => void; toggleShowColliders: () => void; toggleShowVelocities: () => void; toggleShowContacts: () => void;
  applyForceToEntity: (id: string, force: {x:number;y:number;z:number}) => void;
  applyImpulseToEntity: (id: string, impulse: {x:number;y:number;z:number}) => void;
  addLuaScript: (id: string, presetKey: string) => void;
  removeScript: (id: string, index: number) => void;
  updateScript: (id: string, index: number, updates: Partial<ScriptComponent>) => void;
  addScript: (id: string, preset: string) => void;
  play: () => void; pause: () => void; stop: () => void;
  physicsUpdate: (dt: number) => void;
  log: (msg: string) => void; warn: (msg: string) => void; error: (msg: string) => void; clearConsole: () => void;
  saveScene: (name?: string) => void; loadScene: (name: string) => void; newScene: () => void;
  getSavedSceneNames: () => string[]; setSceneName: (name: string) => void;
  setActiveBottomTab: (tab: 'console'|'assets'|'physics'|'scripts'|'prefabs'|'sculpt') => void;
  setShowNewSceneDialog: (show: boolean) => void; setShowSaveDialog: (show: boolean) => void; setShowLoadDialog: (show: boolean) => void;
  // Temporal
  temporalScrub: (frame: number) => void; temporalStepForward: () => void; temporalStepBackward: () => void;
  temporalJumpToStart: () => void; temporalJumpToEnd: () => void;
  temporalForkBranch: (name?: string) => void; temporalSwitchBranch: (branchId: string) => void;
  temporalDeleteBranch: (branchId: string) => void; temporalAddBookmark: (label: string) => void;
  temporalToggleGhosts: () => void; temporalToggleTrails: () => void;
  temporalSetGhostCount: (count: number) => void; temporalUpdateConfig: (updates: Partial<TemporalConfig>) => void;
  // Parallel
  parallelAutoSetup: () => void; parallelCreateFromPreset: (presetKey: string) => void;
  parallelCreateCustom: (name: string, overrides: RealityOverrides) => void;
  parallelRemoveReality: (id: string) => void; parallelSetViewMode: (mode: ParallelViewMode) => void;
  parallelPromoteReality: (id: string) => void; parallelUpdateOverrides: (id: string, overrides: Partial<RealityOverrides>) => void;
  parallelToggle: () => void; parallelReset: () => void;
  // Branding
  setEngineLogo: (dataUrl: string|null) => void; setEngineName: (name: string) => void;
  setEngineAccentColor: (color: string) => void; clearBranding: () => void;
  // Assets
  importAsset: (file: File) => Promise<void>; removeAsset: (id: string) => void; addCustomModelEntity: (assetId: string) => void;
  // Animation
  addAnimationComponent: (entityId: string) => void; removeAnimationComponent: (entityId: string) => void;
  updateAnimation: (entityId: string, updates: Partial<AnimationComponent>) => void;
  setActiveClip: (entityId: string, clipName: string|null) => void;
  setAnimationPlaying: (entityId: string, playing: boolean) => void;
  // Scene settings
  updateSceneSettings: (updates: Partial<SceneSettings>) => void;
  // NEW: Undo / Redo
  undo: () => void; redo: () => void; pushHistory: () => void;
  // NEW: Audio
  addAudioSource: (entityId: string) => void; removeAudioSource: (entityId: string) => void;
  updateAudioSource: (entityId: string, updates: Partial<AudioSourceComponent>) => void;
  setMasterVolume: (vol: number) => void;
  playAudioSource: (entityId: string) => Promise<void>;
  stopAudioSource: (entityId: string) => void;
  // NEW: Prefabs
  createPrefab: (entityId: string) => void; instantiatePrefab: (prefabId: string) => void; deletePrefab: (prefabId: string) => void;
  // NEW: AnimStateMachine
  addAnimStateMachine: (entityId: string) => void; removeAnimStateMachine: (entityId: string) => void;
  updateAnimStateMachine: (entityId: string, sm: AnimStateMachine) => void;
  setAnimParam: (entityId: string, paramName: string, value: boolean|number) => void;
  // NEW: PostProcess
  updatePostProcess: (updates: Partial<PostProcessConfig>) => void;
  // Sculpt
  toggleSculptMode: () => void;
  setSculptBrush: (updates: Partial<{ type: BrushType; size: number; strength: number; falloff: BrushFalloff }>) => void;
  setSculptConfig: (updates: Partial<SculptConfig>) => void;
  sculptUndo: (entityId: string) => void;
  sculptRedo: (entityId: string) => void;
  sculptReset: (entityId: string) => void;
}

export const useEngineStore = create<EngineState>((set, get) => {
  const audioEngine = new AudioEngine();
  const luaVM = new LuaVM(
    (msg, type) => { const s = get(); if (type==='warn') s.warn(msg); else if (type==='error') s.error(msg); else s.log(`📜 ${msg}`); },
    globalInputState,
  );
  // Wire audio callbacks into LuaVM
  luaVM.setAudioCallbacks(
    (entityId, assetId) => {
      const entity = get().entities.find(e => e.id === entityId);
      if (!entity?.audioSource) return;
      const src = entity.audioSource;
      const asset = get().assets.find(a => a.id === assetId);
      if (!asset) return;
      audioEngine.loadAsset(assetId, asset.dataUrl).then(ok => {
        if (ok) audioEngine.play(entityId, assetId, { volume: src.volume, pitch: src.pitch, loop: src.loop, is3D: src.is3D, minDistance: src.minDistance, maxDistance: src.maxDistance, rolloffFactor: src.rolloffFactor }, entity.transform.position);
      });
    },
    (entityId) => audioEngine.stop(entityId),
  );
  const temporalEngine = new TemporalEngine();
  const sculptSystem = new SculptSystem(DEFAULT_SCULPT_CONFIG);
  const particleSystem = new ParticleSystem();
  const terrainSystem = new TerrainSystem();
  const waterSystem = new WaterSystem();
  const characterControllerSystem = new CharacterControllerSystem();

  return {
    projectName: 'MyGame', sceneName: 'KEVLA Demo',
    engineLogo: localStorage.getItem('kevla_logo') || null,
    engineName: localStorage.getItem('kevla_engine_name') || 'KEVLA',
    engineAccentColor: localStorage.getItem('kevla_accent') || '#ff8800',
    entities: createDefaultEntities(), selectedId: null, selectedIds: new Set(), entityCounter: 5,
    isPlaying: false, isPaused: false, prePlaySnapshot: null, playTime: 0,
    physicsWorld: new PhysicsWorld(), physicsConfig: { ...DEFAULT_PHYSICS_CONFIG }, physicsDebug: true,
    showColliders: true, showVelocities: true, showContacts: true, debugContacts: [], collisionEvents: [],
    luaVM, inputState: globalInputState, scriptErrors: new Map(), activeScriptCount: 0,
    consoleMessages: [], activeBottomTab: 'console',
    showNewSceneDialog: false, showSaveDialog: false, showLoadDialog: false,
    temporalEngine, temporalConfig: { ...DEFAULT_TEMPORAL_CONFIG }, temporalGhosts: [],
    parallelEngine: new ParallelEngine(), parallelEnabled: false, parallelViewMode: 'single' as ParallelViewMode,
    assets: [],
    sceneSettings: { ...DEFAULT_SCENE_SETTINGS },
    undoStack: [], redoStack: [],
    audioEngine, masterVolume: 0.8,
    prefabs: JSON.parse(localStorage.getItem('kevla_prefabs') || '[]'),
    postProcess: { ...DEFAULT_POST_PROCESS },
    sculptConfig: { ...DEFAULT_SCULPT_CONFIG },
    sculptSystem,
    particleSystem,
    terrainSystem,
    waterSystem,
    characterControllerSystem,

    // ===== HISTORY HELPERS =====
    pushHistory: () => {
      const { entities, undoStack } = get();
      const snapshot = JSON.parse(JSON.stringify(entities));
      set({ undoStack: [...undoStack.slice(-MAX_UNDO + 1), snapshot], redoStack: [] });
    },
    undo: () => {
      const { undoStack, redoStack, entities } = get();
      if (undoStack.length === 0) return;
      const prev = undoStack[undoStack.length - 1];
      const current = JSON.parse(JSON.stringify(entities));
      set({ entities: prev, undoStack: undoStack.slice(0, -1), redoStack: [...redoStack, current], selectedId: null, selectedIds: new Set() });
      get().log('↩ Undo');
    },
    redo: () => {
      const { redoStack, undoStack, entities } = get();
      if (redoStack.length === 0) return;
      const next = redoStack[redoStack.length - 1];
      const current = JSON.parse(JSON.stringify(entities));
      set({ entities: next, redoStack: redoStack.slice(0, -1), undoStack: [...undoStack, current], selectedId: null, selectedIds: new Set() });
      get().log('↪ Redo');
    },

    // ===== ENTITY MANAGEMENT =====
    addEntity: (type, name) => {
      get().pushHistory();
      const count = get().entityCounter;
      const displayName = name || `${type.charAt(0).toUpperCase()+type.slice(1)} (${count})`;
      const yPos = type === 'plane' ? 0.01 : 3;
      const scale = type === 'plane' ? vec3(5,1,5) : vec3(1,1,1);
      const newEntity: Entity = { id: uid(), name: displayName, active: true, transform: { position: vec3((Math.random()-0.5)*4,yPos,(Math.random()-0.5)*4), rotation: vec3(), scale }, meshRenderer: { meshType: type, visible: true }, material: { ...defaultMaterial(), color: '#'+Math.floor(Math.random()*0xffffff).toString(16).padStart(6,'0') }, scripts: [] };
      set({ entities: [...get().entities, newEntity], entityCounter: count+1, selectedId: newEntity.id });
      get().log(`Created ${displayName}`);
    },
    removeEntity: (id) => {
      get().pushHistory();
      const entity = get().entities.find(e => e.id === id);
      get().luaVM.removeEntity(id);
      get().audioEngine.stop(id);
      const newSelectedIds = new Set(get().selectedIds);
      newSelectedIds.delete(id);
      set({ entities: get().entities.filter(e => e.id !== id), selectedId: get().selectedId === id ? null : get().selectedId, selectedIds: newSelectedIds });
      if (entity) get().log(`Deleted ${entity.name}`);
    },
    duplicateEntity: (id) => {
      get().pushHistory();
      const source = get().entities.find(e => e.id === id);
      if (!source) return;
      const clone: Entity = JSON.parse(JSON.stringify(source));
      clone.id = uid(); clone.name = `${source.name} (Copy)`; clone.transform.position.x += 1.5;
      set({ entities: [...get().entities, clone], selectedId: clone.id, entityCounter: get().entityCounter+1 });
      get().log(`Duplicated ${source.name}`);
    },
    selectEntity: (id) => {
      set({ selectedId: id, selectedIds: id ? new Set([id]) : new Set() });
      if (get().temporalConfig.enabled && get().temporalEngine.getFrameCount() > 0) {
        set({ temporalGhosts: get().temporalEngine.generateGhosts(id) });
      }
    },
    toggleSelectEntity: (id, additive) => {
      const { selectedIds } = get();
      if (additive) {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id); else next.add(id);
        const arr = [...next];
        set({ selectedIds: next, selectedId: arr[arr.length-1] || null });
      } else {
        set({ selectedIds: new Set([id]), selectedId: id });
      }
    },
    selectAll: () => {
      const ids = new Set(get().entities.map(e => e.id));
      const arr = [...ids];
      set({ selectedIds: ids, selectedId: arr[arr.length-1] || null });
    },
    clearSelection: () => set({ selectedIds: new Set(), selectedId: null }),
    deleteSelected: () => {
      const { selectedIds } = get();
      if (selectedIds.size === 0) return;
      get().pushHistory();
      selectedIds.forEach(id => { get().luaVM.removeEntity(id); get().audioEngine.stop(id); });
      set({ entities: get().entities.filter(e => !selectedIds.has(e.id)), selectedId: null, selectedIds: new Set() });
      get().log(`Deleted ${selectedIds.size} entit${selectedIds.size===1?'y':'ies'}`);
    },
    duplicateSelected: () => {
      const { selectedIds, entities } = get();
      if (selectedIds.size === 0) return;
      get().pushHistory();
      const clones: Entity[] = [];
      selectedIds.forEach(id => {
        const src = entities.find(e => e.id === id);
        if (!src) return;
        const clone: Entity = JSON.parse(JSON.stringify(src));
        clone.id = uid(); clone.name = `${src.name} (Copy)`; clone.transform.position.x += 1.5;
        clones.push(clone);
      });
      const newIds = new Set(clones.map(c => c.id));
      set({ entities: [...entities, ...clones], selectedIds: newIds, selectedId: clones[clones.length-1]?.id || null, entityCounter: get().entityCounter + clones.length });
      get().log(`Duplicated ${clones.length} entities`);
    },
    renameEntity: (id, name) => set({ entities: get().entities.map(e => e.id===id ? { ...e, name } : e) }),
    toggleEntityActive: (id) => set({ entities: get().entities.map(e => e.id===id ? { ...e, active: !e.active } : e) }),
    updateTransformField: (id, component, axis, value) => set({ entities: get().entities.map(e => e.id===id ? { ...e, transform: { ...e.transform, [component]: { ...e.transform[component], [axis]: value } } } : e) }),
    setMeshType: (id, type) => set({ entities: get().entities.map(e => e.id===id ? { ...e, meshRenderer: { ...(e.meshRenderer||{visible:true}), meshType: type } as MeshRenderer } : e) }),
    setMeshVisible: (id, visible) => set({ entities: get().entities.map(e => e.id===id&&e.meshRenderer ? { ...e, meshRenderer: { ...e.meshRenderer, visible } } : e) }),
    updateMaterial: (id, updates) => set({ entities: get().entities.map(e => e.id===id ? { ...e, material: { ...e.material, ...updates } } : e) }),
    updateEntity: (id, updates) => set({ entities: get().entities.map(e => e.id===id ? { ...e, ...updates } : e) }),
    addRigidbody: (id) => { set({ entities: get().entities.map(e => e.id===id ? { ...e, rigidbody: defaultRigidbody(1) } : e) }); get().log('Added Rigidbody'); },
    removeRigidbody: (id) => set({ entities: get().entities.map(e => e.id===id ? { ...e, rigidbody: undefined } : e) }),
    updateRigidbody: (id, updates) => set({ entities: get().entities.map(e => e.id===id&&e.rigidbody ? { ...e, rigidbody: { ...e.rigidbody, ...updates } } : e) }),
    addCollider: (id, shape='box') => {
      const entity = get().entities.find(e => e.id===id);
      const scale = entity?.transform.scale || vec3(1,1,1);
      const collider = shape==='sphere' ? defaultSphereCollider() : shape==='capsule' ? { shape: 'capsule' as const, size: vec3(1,1,1), radius: 0.5, height: 1, center: vec3(), isTrigger: false, showWireframe: true } : defaultBoxCollider(scale);
      set({ entities: get().entities.map(e => e.id===id ? { ...e, collider } : e) });
      get().log(`Added ${shape} collider`);
    },
    removeCollider: (id) => set({ entities: get().entities.map(e => e.id===id ? { ...e, collider: undefined } : e) }),
    updateCollider: (id, updates) => set({ entities: get().entities.map(e => e.id===id&&e.collider ? { ...e, collider: { ...e.collider, ...updates } } : e) }),
    setColliderShape: (id, shape) => set({ entities: get().entities.map(e => { if (e.id!==id||!e.collider) return e; return { ...e, collider: { ...e.collider, shape, radius: shape==='sphere'||shape==='capsule' ? 0.5 : e.collider.radius, height: shape==='capsule' ? 1 : e.collider.height } }; }) }),

    addTerrain: (id) => set({ entities: get().entities.map(e => e.id===id ? { ...e, terrain: { ...DEFAULT_TERRAIN_CONFIG } } : e) }),
    removeTerrain: (id) => set({ entities: get().entities.map(e => e.id===id ? { ...e, terrain: undefined } : e) }),
    updateTerrain: (id, updates) => set({ entities: get().entities.map(e => e.id===id&&e.terrain ? { ...e, terrain: { ...e.terrain, ...updates } } : e) }),
    addWater: (id) => set({ entities: get().entities.map(e => e.id===id ? { ...e, water: { ...DEFAULT_WATER_CONFIG } } : e) }),
    removeWater: (id) => set({ entities: get().entities.map(e => e.id===id ? { ...e, water: undefined } : e) }),
    updateWater: (id, updates) => set({ entities: get().entities.map(e => e.id===id&&e.water ? { ...e, water: { ...e.water, ...updates } } : e) }),
    addParticleEmitter: (id) => set({ entities: get().entities.map(e => e.id===id ? { ...e, particleEmitter: { ...DEFAULT_PARTICLE_EMITTER, id } } : e) }),
    removeParticleEmitter: (id) => set({ entities: get().entities.map(e => e.id===id ? { ...e, particleEmitter: undefined } : e) }),
    updateParticleEmitter: (id, updates) => set({ entities: get().entities.map(e => e.id===id&&e.particleEmitter ? { ...e, particleEmitter: { ...e.particleEmitter, ...updates } } : e) }),

    addCharacterController: (id) => set({ entities: get().entities.map(e => e.id===id ? { ...e, characterController: { ...DEFAULT_CHARACTER_CONTROLLER } } : e) }),
    removeCharacterController: (id) => set({ entities: get().entities.map(e => e.id===id ? { ...e, characterController: undefined } : e) }),
    updateCharacterController: (id, updates) => set({ entities: get().entities.map(e => e.id===id&&e.characterController ? { ...e, characterController: { ...e.characterController, ...updates } } : e) }),
    addVehicle: (id) => set({ entities: get().entities.map(e => e.id===id ? { ...e, vehicle: { ...DEFAULT_VEHICLE_COMPONENT } } : e) }),
    removeVehicle: (id) => set({ entities: get().entities.map(e => e.id===id ? { ...e, vehicle: undefined } : e) }),
    updateVehicle: (id, updates) => set({ entities: get().entities.map(e => e.id===id&&e.vehicle ? { ...e, vehicle: { ...e.vehicle, ...updates } } : e) }),
    addRagdoll: (id) => set({ entities: get().entities.map(e => e.id===id ? { ...e, ragdoll: { ...DEFAULT_RAGDOLL_COMPONENT } } : e) }),
    removeRagdoll: (id) => set({ entities: get().entities.map(e => e.id===id ? { ...e, ragdoll: undefined } : e) }),
    updateRagdoll: (id, updates) => set({ entities: get().entities.map(e => e.id===id&&e.ragdoll ? { ...e, ragdoll: { ...e.ragdoll, ...updates } } : e) }),
    addSoftBody: (id) => set({ entities: get().entities.map(e => e.id===id ? { ...e, softBody: { ...DEFAULT_SOFT_BODY_COMPONENT } } : e) }),
    removeSoftBody: (id) => set({ entities: get().entities.map(e => e.id===id ? { ...e, softBody: undefined } : e) }),
    updateSoftBody: (id, updates) => set({ entities: get().entities.map(e => e.id===id&&e.softBody ? { ...e, softBody: { ...e.softBody, ...updates } } : e) }),
    updatePhysicsConfig: (updates) => { const config = { ...get().physicsConfig, ...updates }; get().physicsWorld.config = config; set({ physicsConfig: config }); },
    togglePhysicsDebug: () => set({ physicsDebug: !get().physicsDebug }),
    toggleShowColliders: () => set({ showColliders: !get().showColliders }),
    toggleShowVelocities: () => set({ showVelocities: !get().showVelocities }),
    toggleShowContacts: () => set({ showContacts: !get().showContacts }),
    applyForceToEntity: (id, force) => get().physicsWorld.applyForce(id, force),
    applyImpulseToEntity: (id, impulse) => { get().physicsWorld.applyImpulse(id, impulse); get().log(`Applied impulse (${impulse.x.toFixed(1)}, ${impulse.y.toFixed(1)}, ${impulse.z.toFixed(1)})`); },
    addLuaScript: (id, presetKey) => { const preset = LUA_PRESETS[presetKey]||LUA_PRESETS.custom; set({ entities: get().entities.map(e => e.id===id ? { ...e, scripts: [...e.scripts, { name: preset.name, code: preset.code, enabled: true }] } : e) }); get().log(`Added Lua script: ${preset.name}`); },
    addScript: (id, preset) => get().addLuaScript(id, preset),
    removeScript: (id, index) => { get().luaVM.removeEntity(id); set({ entities: get().entities.map(e => e.id===id ? { ...e, scripts: e.scripts.filter((_,i) => i!==index) } : e) }); },
    updateScript: (id, index, updates) => set({ entities: get().entities.map(e => e.id===id ? { ...e, scripts: e.scripts.map((s,i) => i===index ? { ...s, ...updates } : s) } : e) }),

    // ===== PLAYBACK =====
    play: () => {
      const state = get();
      if (!state.isPlaying) {
        const snapshot = JSON.parse(JSON.stringify(state.entities));
        state.physicsWorld.config = { ...state.physicsConfig };
        syncEntitiesToPhysics(state.entities, state.physicsWorld);
        state.luaVM.reset();
        state.luaVM.setEntityLookup((name) => { const e = get().entities.find(e => e.name===name&&e.active); return e ? { position: e.transform.position, rotation: e.transform.rotation, scale: e.transform.scale, name: e.name } : null; });
        let scriptCount = 0;
        state.entities.forEach(entity => { entity.scripts.forEach((script, idx) => { if (script.enabled) { state.luaVM.compile(entity.id, idx, script.name, script.code); scriptCount++; } }); });
        // Play OnAwake audio sources
        state.entities.forEach(entity => {
          if (entity.audioSource?.playOnAwake && entity.audioSource.assetId) {
            const asset = get().assets.find(a => a.id === entity.audioSource!.assetId);
            if (asset) {
              audioEngine.loadAsset(asset.id, asset.dataUrl).then(ok => {
                if (ok) audioEngine.play(entity.id, asset.id, entity.audioSource!, entity.transform.position);
              });
            }
          }
        });
        state.temporalEngine.reset();
        state.temporalEngine.startRecording();
        set({ isPlaying: true, isPaused: false, prePlaySnapshot: snapshot, playTime: 0, activeScriptCount: scriptCount, scriptErrors: new Map(), temporalGhosts: [] });
        state.log(`▶ Play — ${scriptCount} scripts active`);
      } else {
        state.temporalEngine.isRecording = true;
        state.temporalEngine.isScrubbing = false;
        syncEntitiesToPhysics(state.entities, state.physicsWorld);
        set({ isPaused: false });
        state.log('▶ Resumed');
      }
    },
    pause: () => { get().temporalEngine.isRecording = false; set({ isPaused: !get().isPaused }); get().log(get().isPaused ? '⏸ Paused' : '▶ Resumed'); },
    stop: () => {
      const snapshot = get().prePlaySnapshot;
      get().physicsWorld.clear();
      get().luaVM.reset();
      get().temporalEngine.stopRecording();
      get().parallelEngine.reset();
      audioEngine.stopAll();
      globalInputState.keys.clear(); globalInputState.keysDown.clear(); globalInputState.keysUp.clear(); globalInputState.mouseButtons.clear();
      set({ isPlaying: false, isPaused: false, entities: snapshot||get().entities, prePlaySnapshot: null, playTime: 0, debugContacts: [], collisionEvents: [], scriptErrors: new Map(), activeScriptCount: 0, temporalGhosts: [], parallelEnabled: false, parallelViewMode: 'single' as ParallelViewMode });
      get().log('⏹ Stopped');
    },

    // ===== PHYSICS UPDATE =====
    physicsUpdate: (dt) => {
      const { isPlaying, isPaused, entities, playTime, physicsWorld, luaVM, temporalEngine, temporalConfig, selectedId, inputState, characterControllerSystem } = get();
      if (!isPlaying || isPaused) return;
      const time = playTime + dt;
      const newErrors = new Map<string,string>();
      const entitiesToRemove: string[] = [];
      const entitiesToSpawn: { type: string; position: {x:number;y:number;z:number} }[] = [];
      physicsWorld.step(dt);

      // Character Controller input handling
      const moveDir = { x: 0, y: 0, z: 0 };
      if (inputState.keys.has('w')) moveDir.z -= 1;
      if (inputState.keys.has('s')) moveDir.z += 1;
      if (inputState.keys.has('a')) moveDir.x -= 1;
      if (inputState.keys.has('d')) moveDir.x += 1;
      const isSprinting = inputState.keys.has('shift');
      const isCrouching = inputState.keys.has('control');
      const wantsJump = inputState.keysDown.has(' ') || inputState.keysDown.has('space');

      entities.forEach(entity => {
        if (entity.characterController && entity.characterController.enabled) {
          if (moveDir.x !== 0 || moveDir.z !== 0) {
            characterControllerSystem.move(entity.id, moveDir);
          }
          if (isSprinting) characterControllerSystem.sprint(entity.id, true);
          if (isCrouching) characterControllerSystem.crouch(entity.id, true);
          if (wantsJump) characterControllerSystem.jump(entity.id);
          const state = characterControllerSystem.getState(entity.id);
          if (state) {
            entity.transform.position = state.position;
          }
        }
      });
      inputState.keysDown.delete(' ');
      inputState.keysDown.delete('space');
      let updated = entities.map(entity => {
        if (!entity.active) return entity;
        const pos = { ...entity.transform.position };
        const rot = { ...entity.transform.rotation };
        const scl = { ...entity.transform.scale };
        const body = physicsWorld.getBody(entity.id);
        if (body && entity.rigidbody && !entity.rigidbody.isKinematic) {
          const rb = entity.rigidbody;
          pos.x = rb.freezePositionX ? entity.transform.position.x : body.position.x;
          pos.y = rb.freezePositionY ? entity.transform.position.y : body.position.y;
          pos.z = rb.freezePositionZ ? entity.transform.position.z : body.position.z;
          rot.x = rb.freezeRotationX ? entity.transform.rotation.x : body.rotation.x;
          rot.y = rb.freezeRotationY ? entity.transform.rotation.y : body.rotation.y;
          rot.z = rb.freezeRotationZ ? entity.transform.rotation.z : body.rotation.z;
        }
        entity.scripts.forEach((script, idx) => {
          if (!script.enabled) return;
          luaVM.compile(entity.id, idx, script.name, script.code);
          const result = luaVM.execute(entity.id, idx, { position: pos, rotation: rot, scale: scl, name: entity.name, active: entity.active }, dt, time);
          if (result.error) newErrors.set(`${entity.id}_${idx}`, result.error);
          if (result.destroyed) entitiesToRemove.push(entity.id);
          if (result.spawned) entitiesToSpawn.push(...result.spawned);
        });
        // Update audio position
        if (entity.audioSource) audioEngine.updatePosition(entity.id, pos);
        return { ...entity, transform: { position: pos, rotation: rot, scale: scl }, ...(body&&entity.rigidbody&&!entity.rigidbody.isKinematic ? { rigidbody: { ...entity.rigidbody, velocity: { ...body.velocity }, angularVelocity: { ...body.angularVelocity } } } : {}) };
      });

      // Flush SendMessage queue — use `updated` (not stale store) and pass
      // entity bindings + scriptCount so lua.ts can dispatch directly into scripts.
      luaVM.flushMessages((name) => {
        const e = updated.find(e => e.name === name && e.active);
        if (!e) return null;
        return {
          id: e.id, name: e.name, scriptCount: e.scripts.length,
          bindings: { position: { ...e.transform.position }, rotation: { ...e.transform.rotation }, scale: { ...e.transform.scale }, name: e.name, active: e.active },
        };
      });

      // Step AnimStateMachine for every entity that has one
      updated = updated.map(entity => {
        if (!entity.animStateMachine) return entity;
        const result = stepStateMachine(entity.animStateMachine, dt);
        return result.changed ? { ...entity, animStateMachine: result.sm } : entity;
      });

      if (entitiesToRemove.length > 0) { updated = updated.filter(e => !entitiesToRemove.includes(e.id)); entitiesToRemove.forEach(id => luaVM.removeEntity(id)); }
      if (entitiesToSpawn.length > 0) {
        entitiesToSpawn.forEach(spawn => {
          const meshType = (['cube','sphere','cylinder','cone','torus'] as MeshType[]).find(t => t===spawn.type)||'cube';
          const ne: Entity = { id: uid(), name: `Spawned ${meshType}`, active: true, transform: { position: { ...spawn.position }, rotation: vec3(), scale: vec3(0.6,0.6,0.6) }, meshRenderer: { meshType, visible: true }, material: { ...defaultMaterial(), color: '#'+Math.floor(Math.random()*0xffffff).toString(16).padStart(6,'0') }, rigidbody: defaultRigidbody(0.5), collider: meshType==='sphere' ? defaultSphereCollider() : defaultBoxCollider(vec3(0.6,0.6,0.6)), scripts: [] };
          updated.push(ne);
          if (ne.rigidbody&&ne.collider) {
            const body = createPhysicsBody(ne.id, ne.transform.position, ne.transform.rotation, ne.transform.scale, { mass: ne.rigidbody.mass, useGravity: ne.rigidbody.useGravity, isKinematic: ne.rigidbody.isKinematic, drag: ne.rigidbody.drag, angularDrag: ne.rigidbody.angularDrag, restitution: ne.rigidbody.restitution, friction: ne.rigidbody.friction, velocity: ne.rigidbody.velocity, angularVelocity: ne.rigidbody.angularVelocity }, { shape: ne.collider.shape, size: ne.collider.size, center: ne.collider.center, radius: ne.collider.radius, height: ne.collider.height, isTrigger: ne.collider.isTrigger });
            physicsWorld.addBody(body);
          }
        });
      }

      if (temporalConfig.enabled && temporalEngine.isRecording) {
        const collisionPairs: [string,string][] = physicsWorld.events.filter(ev => ev.type==='enter'||ev.type==='stay').map(ev => [ev.entityA, ev.entityB] as [string,string]);
        const entityScriptErrors: Record<string,string[]> = {};
        newErrors.forEach((errMsg, key) => { const entityId = key.split('_').slice(0,-1).join('_'); if (!entityScriptErrors[entityId]) entityScriptErrors[entityId]=[]; entityScriptErrors[entityId].push(errMsg); });
        temporalEngine.recordFrame(updated, time, dt, physicsWorld.stats.activeContacts, newErrors.size, collisionPairs, {}, entityScriptErrors);
        set({ temporalGhosts: temporalEngine.generateGhosts(selectedId) });
      }

      const pe = get().parallelEngine;
      if (pe.isEnabled && pe.realities.length > 0) pe.stepAll(dt, globalInputState);

      globalInputState.keysDown.clear(); globalInputState.keysUp.clear(); globalInputState.mouseDeltaX = 0; globalInputState.mouseDeltaY = 0;
      set({ entities: updated, playTime: time, debugContacts: [...physicsWorld.debugContacts], collisionEvents: [...physicsWorld.events], scriptErrors: newErrors });
      physicsWorld.events.filter(e => e.type==='enter').forEach(event => {
        const nameA = entities.find(e => e.id===event.entityA)?.name||event.entityA;
        const nameB = event.entityB==='__ground__' ? 'Ground' : entities.find(e => e.id===event.entityB)?.name||event.entityB;
        get().log(`💥 Collision: ${nameA} ↔ ${nameB}`);
      });
    },

    // ===== CONSOLE =====
    log: (msg) => { const msgs = get().consoleMessages; const last = msgs[msgs.length-1]; if (last&&last.message===msg&&last.type==='log') { set({ consoleMessages: [...msgs.slice(0,-1), { ...last, count: last.count+1 }] }); } else { set({ consoleMessages: [...msgs, { id: uid('log'), type: 'log' as const, message: msg, timestamp: new Date().toLocaleTimeString(), count: 1 }].slice(-500) }); } },
    warn: (msg) => set({ consoleMessages: [...get().consoleMessages, { id: uid('warn'), type: 'warn' as const, message: msg, timestamp: new Date().toLocaleTimeString(), count: 1 }].slice(-500) }),
    error: (msg) => { const msgs = get().consoleMessages; const last = msgs[msgs.length-1]; if (last&&last.message===msg&&last.type==='error') { set({ consoleMessages: [...msgs.slice(0,-1), { ...last, count: last.count+1 }] }); } else { set({ consoleMessages: [...msgs, { id: uid('err'), type: 'error' as const, message: msg, timestamp: new Date().toLocaleTimeString(), count: 1 }].slice(-500) }); } },
    clearConsole: () => set({ consoleMessages: [] }),

    // ===== SCENE =====
    saveScene: (name) => { const n = name||get().sceneName; const data: SceneData = { name: n, entities: get().entities, savedAt: new Date().toISOString(), sceneSettings: get().sceneSettings }; localStorage.setItem(`kevla_scene_${n}`, JSON.stringify(data)); set({ sceneName: n }); get().log(`💾 Saved "${n}"`); },
    loadScene: (name) => {
      const raw = localStorage.getItem(`kevla_scene_${name}`);
      if (!raw) { get().warn(`Scene "${name}" not found`); return; }
      try { const data: SceneData = JSON.parse(raw); get().luaVM.clear(); get().temporalEngine.reset(); set({ entities: data.entities, sceneName: data.name, selectedId: null, selectedIds: new Set(), isPlaying: false, isPaused: false, prePlaySnapshot: null, playTime: 0, temporalGhosts: [], sceneSettings: data.sceneSettings||{ ...DEFAULT_SCENE_SETTINGS } }); get().log(`📂 Loaded "${data.name}" (${data.entities.length} entities)`); } catch { get().error(`Failed to parse scene "${name}"`); }
    },
    newScene: () => { get().physicsWorld.clear(); get().luaVM.clear(); get().temporalEngine.reset(); set({ entities: createDefaultEntities(), selectedId: null, selectedIds: new Set(), sceneName: 'New Scene', isPlaying: false, isPaused: false, prePlaySnapshot: null, playTime: 0, debugContacts: [], collisionEvents: [], scriptErrors: new Map(), temporalGhosts: [], undoStack: [], redoStack: [] }); get().log('New scene created'); },
    getSavedSceneNames: () => Object.keys(localStorage).filter(k => k.startsWith('kevla_scene_')).map(k => k.replace('kevla_scene_','')),
    setSceneName: (name) => set({ sceneName: name }),
    setActiveBottomTab: (tab) => set({ activeBottomTab: tab }),
    setShowNewSceneDialog: (show) => set({ showNewSceneDialog: show }),
    setShowSaveDialog: (show) => set({ showSaveDialog: show }),
    setShowLoadDialog: (show) => set({ showLoadDialog: show }),

    // ===== TEMPORAL =====
    temporalScrub: (frame) => { const { temporalEngine, entities } = get(); const states = temporalEngine.scrubTo(frame); if (!states) return; const restored = temporalEngine.applySnapshot(states, entities); const meta = temporalEngine.getFrameMeta(frame); const ghosts = temporalEngine.generateGhosts(get().selectedId); set({ entities: restored, playTime: meta?.timestamp??get().playTime, temporalGhosts: ghosts }); },
    temporalStepForward: () => { const { temporalEngine, entities } = get(); const states = temporalEngine.stepForward(); if (!states) return; const restored = temporalEngine.applySnapshot(states, entities); const meta = temporalEngine.getFrameMeta(temporalEngine.currentFrame); set({ entities: restored, playTime: meta?.timestamp??get().playTime, temporalGhosts: temporalEngine.generateGhosts(get().selectedId) }); },
    temporalStepBackward: () => { const { temporalEngine, entities } = get(); const states = temporalEngine.stepBackward(); if (!states) return; const restored = temporalEngine.applySnapshot(states, entities); const meta = temporalEngine.getFrameMeta(temporalEngine.currentFrame); set({ entities: restored, playTime: meta?.timestamp??get().playTime, temporalGhosts: temporalEngine.generateGhosts(get().selectedId) }); },
    temporalJumpToStart: () => { const { temporalEngine, entities } = get(); const states = temporalEngine.jumpToStart(); if (!states) return; const restored = temporalEngine.applySnapshot(states, entities); const meta = temporalEngine.getFrameMeta(temporalEngine.currentFrame); set({ entities: restored, playTime: meta?.timestamp??0, temporalGhosts: temporalEngine.generateGhosts(get().selectedId) }); },
    temporalJumpToEnd: () => { const { temporalEngine, entities } = get(); const states = temporalEngine.jumpToEnd(); if (!states) return; const restored = temporalEngine.applySnapshot(states, entities); const meta = temporalEngine.getFrameMeta(temporalEngine.currentFrame); set({ entities: restored, playTime: meta?.timestamp??get().playTime, temporalGhosts: temporalEngine.generateGhosts(get().selectedId) }); },
    temporalForkBranch: (name) => { const branch = get().temporalEngine.forkBranch(name); get().log(`⑂ Forked: "${branch.name}" at frame ${branch.forkFrame}`); },
    temporalSwitchBranch: (branchId) => { const { temporalEngine, entities } = get(); if (temporalEngine.switchBranch(branchId)) { const states = temporalEngine.reconstructFrame(temporalEngine.currentFrame); if (states) { const restored = temporalEngine.applySnapshot(states, entities); const meta = temporalEngine.getFrameMeta(temporalEngine.currentFrame); set({ entities: restored, playTime: meta?.timestamp??get().playTime, temporalGhosts: temporalEngine.generateGhosts(get().selectedId) }); } get().log(`Switched to branch: "${temporalEngine.getActiveBranch()?.name}"`); } },
    temporalDeleteBranch: (branchId) => { if (get().temporalEngine.deleteBranch(branchId)) get().log('Deleted timeline branch'); },
    temporalAddBookmark: (label) => { get().temporalEngine.addBookmark(label); get().log(`🔖 Bookmark "${label}" at frame ${get().temporalEngine.currentFrame}`); },
    temporalToggleGhosts: () => { const config = get().temporalConfig; const newCount = config.ghostCount>0?0:5; const newConfig = { ...config, ghostCount: newCount }; get().temporalEngine.config.ghostCount = newCount; set({ temporalConfig: newConfig, temporalGhosts: newCount>0 ? get().temporalEngine.generateGhosts(get().selectedId) : [] }); },
    temporalToggleTrails: () => { const config = get().temporalConfig; const newConfig = { ...config, showTrails: !config.showTrails }; get().temporalEngine.config.showTrails = newConfig.showTrails; set({ temporalConfig: newConfig }); },
    temporalSetGhostCount: (count) => { const config = { ...get().temporalConfig, ghostCount: count }; get().temporalEngine.config.ghostCount = count; set({ temporalConfig: config, temporalGhosts: count>0 ? get().temporalEngine.generateGhosts(get().selectedId) : [] }); },
    temporalUpdateConfig: (updates) => { const config = { ...get().temporalConfig, ...updates }; Object.assign(get().temporalEngine.config, updates); set({ temporalConfig: config }); },

    // ===== PARALLEL =====
    parallelAutoSetup: () => { const pe = get().parallelEngine; pe.autoSetup(get().entities); set({ parallelEnabled: true, parallelViewMode: pe.viewMode }); get().log('⊞ Parallel Reality: 4 realities created'); },
    parallelCreateFromPreset: (presetKey) => { const pe = get().parallelEngine; const reality = pe.createFromPreset(get().entities, presetKey); if (reality) { if (!pe.isEnabled) { pe.isEnabled=true; pe.baselineEntities=JSON.parse(JSON.stringify(get().entities)); } if (pe.realities.length===2) pe.viewMode='1x2'; else if (pe.realities.length>=3) pe.viewMode='2x2'; set({ parallelEnabled: true, parallelViewMode: pe.viewMode }); get().log(`⊞ Created reality: ${reality.name}`); } },
    parallelCreateCustom: (name, overrides) => { const pe = get().parallelEngine; if (!pe.isEnabled) { pe.isEnabled=true; pe.baselineEntities=JSON.parse(JSON.stringify(get().entities)); } pe.createReality(get().entities, overrides, name); if (pe.realities.length===2) pe.viewMode='1x2'; else if (pe.realities.length>=3) pe.viewMode='2x2'; set({ parallelEnabled: true, parallelViewMode: pe.viewMode }); get().log(`⊞ Created custom reality: ${name}`); },
    parallelRemoveReality: (id) => { const pe = get().parallelEngine; pe.removeReality(id); set({ parallelViewMode: pe.viewMode, parallelEnabled: pe.realities.length>0 }); get().log('Removed parallel reality'); },
    parallelSetViewMode: (mode) => { get().parallelEngine.viewMode = mode; set({ parallelViewMode: mode }); },
    parallelPromoteReality: (id) => { const pe = get().parallelEngine; const promoted = pe.promoteReality(id); if (promoted) { set({ entities: promoted }); get().log('⊞ Promoted reality to main scene'); } },
    parallelUpdateOverrides: (id, overrides) => get().parallelEngine.updateOverrides(id, overrides),
    parallelToggle: () => { const pe = get().parallelEngine; if (pe.isEnabled) { pe.reset(); set({ parallelEnabled: false, parallelViewMode: 'single' }); get().log('⊞ Parallel disabled'); } else { pe.autoSetup(get().entities); set({ parallelEnabled: true, parallelViewMode: pe.viewMode }); get().log('⊞ Parallel enabled'); } },
    parallelReset: () => { get().parallelEngine.reset(); set({ parallelEnabled: false, parallelViewMode: 'single' }); },

    // ===== BRANDING =====
    setEngineLogo: (dataUrl) => { if (dataUrl) localStorage.setItem('kevla_logo', dataUrl); else localStorage.removeItem('kevla_logo'); set({ engineLogo: dataUrl }); get().log(dataUrl ? '🎨 Logo updated' : '🎨 Logo removed'); },
    setEngineName: (name) => { const t = name.trim()||'KEVLA'; localStorage.setItem('kevla_engine_name', t); set({ engineName: t }); },
    setEngineAccentColor: (color) => { localStorage.setItem('kevla_accent', color); set({ engineAccentColor: color }); document.documentElement.style.setProperty('--logo-accent', color); },
    clearBranding: () => { localStorage.removeItem('kevla_logo'); localStorage.removeItem('kevla_engine_name'); localStorage.removeItem('kevla_accent'); set({ engineLogo: null, engineName: 'KEVLA', engineAccentColor: '#ff8800' }); document.documentElement.style.setProperty('--logo-accent', '#ff8800'); get().log('🎨 Branding reset'); },

    // ===== ASSETS =====
    importAsset: async (file: File) => {
      const { log, warn, assets } = get();
      const ext = file.name.split('.').pop()?.toLowerCase()||'';
      const audioFormats = ['mp3','ogg','wav','opus','aac','m4a','flac'];
      const modelFormats = ['glb','gltf','obj','fbx'];
      const textureFormats = ['png','jpg','jpeg','webp'];
      const supported = [...modelFormats, ...textureFormats, ...audioFormats, 'mtl'];
      if (!supported.includes(ext)) { warn(`Unsupported: .${ext}`); return; }

      const toDataUrl = (f: File) => new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result as string);
        r.onerror = () => reject(new Error('Read failed'));
        r.readAsDataURL(f);
      });

      const dataUrl = await toDataUrl(file);
      const id = `asset_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
      const baseName = file.name.replace(/\.[^.]+$/,'');

      if (ext === 'mtl') {
        const pairedObj = assets.find(a => a.type === 'model' && a.format === 'obj' && a.name === baseName);
        if (pairedObj) {
          set(s => ({ assets: s.assets.map(a => a.id === pairedObj.id ? { ...a, mtlDataUrl: dataUrl } : a) }));
          log(`✅ MTL paired with: ${baseName}`);
        } else {
          log(`⚠ MTL "${baseName}" imported — drop its .obj file to pair them`);
          set(s => ({ assets: [...s.assets, { id, name: baseName, type: 'model', dataUrl: '', fileSize: file.size, format: ext, importedAt: new Date().toISOString(), embeddedClips: [], mtlDataUrl: dataUrl }] }));
        }
        return;
      }

      const type: AssetEntry['type'] = modelFormats.includes(ext) ? 'model' : textureFormats.includes(ext) ? 'texture' : 'audio';
      let mtlDataUrl: string | undefined;

      if (ext === 'obj') {
        const pairedMtl = assets.find(a => a.mtlDataUrl && a.name === baseName);
        if (pairedMtl) {
          mtlDataUrl = pairedMtl.mtlDataUrl;
          set(s => ({ assets: s.assets.filter(a => a.id !== pairedMtl.id) }));
        }
      }

      const entry: AssetEntry = { id, name: file.name.replace(/\.[^.]+$/,''), type, dataUrl, fileSize: file.size, format: ext, importedAt: new Date().toISOString(), embeddedClips: [], mtlDataUrl };
      if (type === 'audio') audioEngine.loadAsset(id, dataUrl);
      set(s => ({ assets: [...s.assets, entry] }));
      log(`✅ Imported ${type}: ${entry.name}${mtlDataUrl ? ' (+MTL)' : ''} (${(file.size/1024).toFixed(0)} KB)`);
    },
    removeAsset: (id) => { set(s => ({ assets: s.assets.filter(a => a.id!==id) })); get().log('🗑 Asset removed'); },
    addCustomModelEntity: (assetId) => {
      const asset = get().assets.find(a => a.id===assetId); if (!asset) return;
      const id = uid('model');
      const entity: Entity = { id, name: asset.name, active: true, transform: { position: vec3(), rotation: vec3(), scale: vec3(1,1,1) }, meshRenderer: { meshType: 'custom', visible: true, modelAssetId: assetId, modelPath: asset.dataUrl, mtlDataUrl: asset.mtlDataUrl }, material: { color: '#ffffff', metallic: 0, roughness: 0.5, emissive: '#000000', opacity: 1, wireframe: false }, animation: asset.embeddedClips&&asset.embeddedClips.length>0 ? { clips: asset.embeddedClips.map(n => ({ name: n, duration: 0 })), activeClip: asset.embeddedClips[0]||null, playing: false, loop: true, speed: 1 } : undefined, scripts: [] };
      set(s => ({ entities: [...s.entities, entity], selectedId: id, entityCounter: s.entityCounter+1 }));
      get().log(`🎭 Model added: ${asset.name}${asset.mtlDataUrl ? ' (with MTL)' : ''}`);
    },

    // ===== ANIMATION =====
    addAnimationComponent: (entityId) => set(s => ({ entities: s.entities.map(e => e.id===entityId ? { ...e, animation: { clips: [], activeClip: null, playing: false, loop: true, speed: 1 } } : e) })),
    removeAnimationComponent: (entityId) => set(s => ({ entities: s.entities.map(e => e.id===entityId ? { ...e, animation: undefined } : e) })),
    updateAnimation: (entityId, updates) => set(s => ({ entities: s.entities.map(e => e.id===entityId&&e.animation ? { ...e, animation: { ...e.animation, ...updates } } : e) })),
    setActiveClip: (entityId, clipName) => set(s => ({ entities: s.entities.map(e => e.id===entityId&&e.animation ? { ...e, animation: { ...e.animation, activeClip: clipName } } : e) })),
    setAnimationPlaying: (entityId, playing) => set(s => ({ entities: s.entities.map(e => e.id===entityId&&e.animation ? { ...e, animation: { ...e.animation, playing } } : e) })),

    // ===== SCENE SETTINGS =====
    updateSceneSettings: (updates) => set(s => ({ sceneSettings: { ...s.sceneSettings, ...updates } })),

    // ===== AUDIO ACTIONS =====
    addAudioSource: (entityId) => { set(s => ({ entities: s.entities.map(e => e.id===entityId ? { ...e, audioSource: { ...DEFAULT_AUDIO_SOURCE } } : e) })); get().log('Added AudioSource'); },
    removeAudioSource: (entityId) => { audioEngine.stop(entityId); set(s => ({ entities: s.entities.map(e => e.id===entityId ? { ...e, audioSource: undefined } : e) })); },
    updateAudioSource: (entityId, updates) => set(s => ({ entities: s.entities.map(e => e.id===entityId&&e.audioSource ? { ...e, audioSource: { ...e.audioSource, ...updates } } : e) })),
    setMasterVolume: (vol) => { audioEngine.setMasterVolume(vol); set({ masterVolume: vol }); },
    playAudioSource: async (entityId) => {
      const entity = get().entities.find(e => e.id===entityId);
      if (!entity?.audioSource?.assetId) return;
      const src = entity.audioSource;
      const asset = get().assets.find(a => a.id===src.assetId);
      if (!asset) return;
      const ok = await audioEngine.loadAsset(asset.id, asset.dataUrl);
      if (ok) audioEngine.play(entityId, asset.id, src, entity.transform.position);
    },
    stopAudioSource: (entityId) => audioEngine.stop(entityId),

    // ===== PREFABS =====
    createPrefab: (entityId) => {
      const entity = get().entities.find(e => e.id===entityId);
      if (!entity) return;
      const { id: _id, ...snapshot } = entity;
      const prefab: PrefabData = { id: `prefab_${Date.now()}`, name: entity.name, entitySnapshot: snapshot, createdAt: new Date().toISOString(), thumbnailColor: entity.material.color };
      const prefabs = [...get().prefabs, prefab];
      set({ prefabs });
      localStorage.setItem('kevla_prefabs', JSON.stringify(prefabs));
      get().log(`📦 Prefab created: ${entity.name}`);
    },
    instantiatePrefab: (prefabId) => {
      const prefab = get().prefabs.find(p => p.id===prefabId);
      if (!prefab) return;
      get().pushHistory();
      const entity: Entity = { ...JSON.parse(JSON.stringify(prefab.entitySnapshot)), id: uid('prefab'), name: prefab.name };
      entity.transform.position.x += (Math.random()-0.5)*2;
      entity.transform.position.z += (Math.random()-0.5)*2;
      set(s => ({ entities: [...s.entities, entity], selectedId: entity.id, entityCounter: s.entityCounter+1 }));
      get().log(`📦 Instantiated prefab: ${prefab.name}`);
    },
    deletePrefab: (prefabId) => {
      const prefabs = get().prefabs.filter(p => p.id!==prefabId);
      set({ prefabs });
      localStorage.setItem('kevla_prefabs', JSON.stringify(prefabs));
      get().log('🗑 Prefab deleted');
    },

    // ===== ANIM STATE MACHINE =====
    addAnimStateMachine: (entityId) => { set(s => ({ entities: s.entities.map(e => e.id===entityId ? { ...e, animStateMachine: createDefaultStateMachine() } : e) })); get().log('Added AnimStateMachine'); },
    removeAnimStateMachine: (entityId) => set(s => ({ entities: s.entities.map(e => e.id===entityId ? { ...e, animStateMachine: undefined } : e) })),
    updateAnimStateMachine: (entityId, sm) => set(s => ({ entities: s.entities.map(e => e.id===entityId ? { ...e, animStateMachine: sm } : e) })),
    setAnimParam: (entityId, paramName, value) => {
      set(s => ({
        entities: s.entities.map(e => {
          if (e.id!==entityId||!e.animStateMachine) return e;
          return { ...e, animStateMachine: { ...e.animStateMachine, parameters: e.animStateMachine.parameters.map(p => p.name===paramName ? { ...p, value } : p) } };
        })
      }));
    },

    // ===== POST-PROCESS =====
    updatePostProcess: (updates) => set(s => ({ postProcess: { ...s.postProcess, ...updates } })),

    // ===== SCULPT =====
    toggleSculptMode: () => {
      const { sculptConfig } = get();
      const next = !sculptConfig.enabled;
      sculptSystem.setConfig({ enabled: next, activeEntityId: next ? sculptConfig.activeEntityId : null });
      set({ sculptConfig: { ...sculptConfig, enabled: next } });
      get().log(next ? '🖌 Sculpt mode ON' : '🖌 Sculpt mode OFF');
    },
    setSculptBrush: (updates) => {
      const { sculptConfig } = get();
      const brush = { ...sculptConfig.brush, ...updates };
      sculptSystem.setConfig({ brush });
      set({ sculptConfig: { ...sculptConfig, brush } });
    },
    setSculptConfig: (updates) => {
      const { sculptConfig } = get();
      sculptSystem.setConfig(updates);
      set({ sculptConfig: { ...sculptConfig, ...updates } });
    },
    sculptUndo: (entityId) => {
      const meshMap = (window as any).__kevla_meshMap;
      if (!meshMap) return;
      const mesh = meshMap.get(entityId);
      if (mesh) sculptSystem.undo(entityId, mesh);
    },
    sculptRedo: (entityId) => {
      const meshMap = (window as any).__kevla_meshMap;
      if (!meshMap) return;
      const mesh = meshMap.get(entityId);
      if (mesh) sculptSystem.redo(entityId, mesh);
    },
    sculptReset: (entityId) => {
      const meshMap = (window as any).__kevla_meshMap;
      if (!meshMap) return;
      const mesh = meshMap.get(entityId);
      if (mesh) sculptSystem.resetMesh(entityId, mesh);
      get().log('🔄 Sculpt reset');
    },
  };
});
