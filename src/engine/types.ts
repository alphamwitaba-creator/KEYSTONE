// ============================================================
// KEVLA ENGINE — Type Definitions v2.0
// ============================================================

export interface Vector3 { x: number; y: number; z: number; }
export interface Transform { position: Vector3; rotation: Vector3; scale: Vector3; }
export type MeshType = 'cube' | 'sphere' | 'cylinder' | 'plane' | 'cone' | 'torus' | 'custom';
export interface MeshRenderer { meshType: MeshType; visible: boolean; modelAssetId?: string; modelPath?: string; mtlDataUrl?: string; }
export interface MaterialComponent { 
  color: string; metallic: number; roughness: number; emissive: string; opacity: number; wireframe: boolean; 
  diffuseMap?: string; normalMap?: string; roughnessMap?: string; metalnessMap?: string; emissiveMap?: string;
  subsurface?: number; transmission?: number; thickness?: number; sheen?: number; sheenColor?: string;
  clearcoat?: number; clearcoatRoughness?: number; anisotropy?: number; enableShaderGraph?: boolean; shaderGraphId?: string;
}

export type ShaderNodeType = 'input' | 'output' | 'float' | 'color' | 'texture' | 'add' | 'multiply' | 'divide' | 'subtract' | 'power' | 'sqrt' | 'sin' | 'cos' | 'mix' | 'clamp' | 'normalize' | 'dot' | 'cross' | 'reflect' | 'fresnel' | 'uv' | 'time' | 'position' | 'normal' | 'viewDir' | 'noise' | 'gradient' | 'rgb2hsv' | 'hsv2rgb';
export interface ShaderNode { id: string; type: ShaderNodeType; x: number; y: number; inputs: Record<string, string>; outputs: string[]; value?: any; label?: string; textureId?: string; }
export interface ShaderGraph { id: string; name: string; nodes: ShaderNode[]; edges: { from: string; fromSocket: string; to: string; toSocket: string }[]; }
export const DEFAULT_SHADER_GRAPH: ShaderGraph = { id: '', name: 'New Shader', nodes: [], edges: [] };

export type ParticleEmitterShape = 'box' | 'sphere' | 'cone' | 'circle';
export type ParticleRenderMode = 'billboard' | 'stretched' | 'mesh' | 'ribbon';
export interface ParticleEmitter {
  id: string; name: string; enabled: boolean; emitting: boolean; loop: boolean;
  rate: number; rateMin: number; maxParticles: number;
  startLifetime: number; startLifetimeMin: number; startSpeed: number; startSpeedMin: number;
  startSize: number; startSizeMin: number; startSizeMax: number; sizeMultiplier: number; sizeOverLifetime?: { time: number; value: number }[];
  startColor: string; startColorMin: string; colorOverLifetime?: { time: number; color: string }[];
  startRotation: number; startRotationMin: number; rotationSpeed: number; rotationSpeedMin: number;
  gravity: number; velocityOverLifetime?: { time: number; x: number; y: number; z: number }[];
  shape: ParticleEmitterShape; shapeRadius: number; shapeAngle: number; shapeBox: { x: number; y: number; z: number };
  emitFromEdge: boolean; alignToDirection: boolean; simulationSpace: 'local' | 'world';
  renderMode: ParticleRenderMode; meshAssetId?: string; materialId?: string;
  subEmitters: string[]; subEmitterMode: 'begin' | 'end' | 'collision';
}
export const DEFAULT_PARTICLE_EMITTER: ParticleEmitter = {
  id: '', name: 'New Emitter', enabled: true, emitting: false, loop: true,
  rate: 50, rateMin: 0, maxParticles: 1000,
  startLifetime: 2, startLifetimeMin: 0, startSpeed: 5, startSpeedMin: 0,
  startSize: 0.5, startSizeMin: 0.1, startSizeMax: 1, sizeMultiplier: 1,
  startColor: '#ffffff', startColorMin: '#ffffff',
  startRotation: 0, startRotationMin: 0, rotationSpeed: 0, rotationSpeedMin: 0,
  gravity: -9.81, shape: 'box', shapeRadius: 0.5, shapeAngle: 25, shapeBox: { x: 1, y: 1, z: 1 },
  emitFromEdge: false, alignToDirection: true, simulationSpace: 'world',
  renderMode: 'billboard', subEmitters: [], subEmitterMode: 'end',
};

export interface TerrainConfig { 
  enabled: boolean; heightmapAssetId?: string; 
  width: number; depth: number; height: number; resolution: number;
  subdivisions: number; holeScale: number; holeOffset: { x: number; y: number };
  layers: TerrainLayer[]; 
  trees: TerrainTree[]; grass: TerrainGrass;
}
export interface TerrainLayer { id: string; name: string; textureAssetId?: string; normalMapAssetId?: string; tileSize: number; tileScale: number; minHeight: number; maxHeight: number; }
export interface TerrainTree { id: string; position: { x: number; y: number; z: number }; scale: number; rotationY: number; prefabId?: string; }
export interface TerrainGrass { enabled: boolean; density: number; maxHeight: number; windStrength: number; color1: string; color2: string; }
export const DEFAULT_TERRAIN_CONFIG: TerrainConfig = { 
  enabled: false, width: 100, depth: 100, height: 20, resolution: 128, 
  subdivisions: 1, holeScale: 1, holeOffset: { x: 0, y: 0 }, layers: [], trees: [], 
  grass: { enabled: false, density: 1000, maxHeight: 1.5, windStrength: 0.5, color1: '#2d5a27', color2: '#4a7c3f' } 
};

export interface WaterConfig {
  enabled: boolean; meshId?: string;
  size: number; subdivisions: number;
  waveSpeed: { x: number; z: number }; waveHeight: number; waveFrequency: number;
  reflectionEnabled: boolean; reflectionResolution: number; reflectionDistortion: number;
  refractionEnabled: boolean; refractionDistortion: number; depthScale: number;
  foamEnabled: boolean; foamThreshold: number; foamScale: number;
  specularIntensity: number; specularPower: number;
  waterColor: string; waterDepthColor: string; fadeDistance: number;
}
export const DEFAULT_WATER_CONFIG: WaterConfig = {
  enabled: false, size: 100, subdivisions: 128,
  waveSpeed: { x: 0.5, z: 0.3 }, waveHeight: 0.5, waveFrequency: 0.5,
  reflectionEnabled: true, reflectionResolution: 512, reflectionDistortion: 0.1,
  refractionEnabled: true, refractionDistortion: 0.2, depthScale: 0.5,
  foamEnabled: true, foamThreshold: 0.5, foamScale: 0.1,
  specularIntensity: 1, specularPower: 128,
  waterColor: '#1a5f7a', waterDepthColor: '#0d3445', fadeDistance: 50,
};

export interface DecalConfig { id: string; name: string; textureAssetId?: string; normalMapAssetId?: string; color: string; size: number; angle: number; }
export interface DecalComponent { decals: DecalConfig[]; maxDecals: number; }

export interface LODLevel { distance: number; modelAssetId?: string; meshType?: MeshType; }
export interface LODConfig { enabled: boolean; levels: LODLevel[]; currentLevel: number; }
export const DEFAULT_LOD_CONFIG: LODConfig = { enabled: false, levels: [{ distance: 0 }], currentLevel: 0 };
export interface AnimationClipRef { name: string; duration: number; }
export interface AnimationComponent { clips: AnimationClipRef[]; activeClip: string | null; playing: boolean; loop: boolean; speed: number; }

// ---- Animation State Machine ----
export type AnimParamType = 'bool' | 'float' | 'trigger' | 'int';
export interface AnimParameter { name: string; type: AnimParamType; value: boolean | number; }
export type TransitionConditionOp = '==' | '!=' | '>' | '<' | '>=' | '<=';
export interface TransitionCondition { parameter: string; op: TransitionConditionOp; value: boolean | number; }
export interface AnimTransition { id: string; fromState: string; toState: string; conditions: TransitionCondition[]; hasExitTime: boolean; exitTime: number | null; transitionDuration: number; }
export interface AnimState { name: string; clip: string | null; speed: number; loop: boolean; isDefault: boolean; }
export interface AnimStateMachine { states: AnimState[]; transitions: AnimTransition[]; parameters: AnimParameter[]; currentState: string | null; previousState: string | null; blendWeight: number; stateTime: number; transitionTime: number; activeTransition: AnimTransition | null; }

export function createDefaultStateMachine(): AnimStateMachine {
  return { states: [], transitions: [], parameters: [], currentState: null, previousState: null, blendWeight: 1, stateTime: 0, transitionTime: 0, activeTransition: null };
}

export function stepStateMachine(sm: AnimStateMachine, dt: number): { sm: AnimStateMachine; currentClip: string | null; previousClip: string | null; blendWeight: number; changed: boolean } {
  let next: AnimStateMachine = { ...sm, stateTime: sm.stateTime + dt };
  let changed = false;
  const candidates = sm.transitions.filter(t => t.fromState === sm.currentState || t.fromState === '*');
  for (const t of candidates) {
    if (t.hasExitTime && t.exitTime !== null && sm.stateTime < t.exitTime) continue;
    const condsMet = t.conditions.length === 0 || t.conditions.every(c => {
      const param = sm.parameters.find(p => p.name === c.parameter);
      if (!param) return false;
      if (param.type === 'trigger') return param.value === true;
      const v = param.value as number; const cv = c.value as number;
      switch (c.op) { case '==': return param.value === c.value; case '!=': return param.value !== c.value; case '>': return v > cv; case '<': return v < cv; case '>=': return v >= cv; case '<=': return v <= cv; default: return false; }
    });
    if (!condsMet) continue;
    next = { ...next, previousState: sm.currentState, currentState: t.toState, stateTime: 0, transitionTime: 0, blendWeight: t.transitionDuration > 0 ? 0 : 1, activeTransition: t };
    next.parameters = next.parameters.map(p => p.type === 'trigger' && t.conditions.some(c => c.parameter === p.name) ? { ...p, value: false } : p);
    changed = true; break;
  }
  if (next.activeTransition && next.activeTransition.transitionDuration > 0) {
    next.transitionTime += dt;
    next.blendWeight = Math.min(1, next.transitionTime / next.activeTransition.transitionDuration);
    if (next.blendWeight >= 1) { next.activeTransition = null; next.previousState = null; }
  } else if (!next.activeTransition) { next.blendWeight = 1; }
  return { sm: next, currentClip: next.states.find(s => s.name === next.currentState)?.clip ?? null, previousClip: next.states.find(s => s.name === next.previousState)?.clip ?? null, blendWeight: next.blendWeight, changed };
}

// ---- Audio Source ----
export interface AudioSourceComponent { assetId: string | null; volume: number; pitch: number; loop: boolean; playOnAwake: boolean; is3D: boolean; minDistance: number; maxDistance: number; rolloffFactor: number; muted: boolean; }
export const DEFAULT_AUDIO_SOURCE: AudioSourceComponent = { assetId: null, volume: 1, pitch: 1, loop: false, playOnAwake: false, is3D: true, minDistance: 1, maxDistance: 20, rolloffFactor: 1, muted: false };

// ---- Post-Processing ----
export interface PostProcessConfig { enabled: boolean; bloom: boolean; bloomStrength: number; bloomThreshold: number; bloomRadius: number; vignette: boolean; vignetteIntensity: number; chromaticAberration: boolean; chromaticAberrationOffset: number; filmGrain: boolean; filmGrainIntensity: number; antialiasing: 'none' | 'fxaa'; toneMappingExposure: number; saturation: number; contrast: number; }
export const DEFAULT_POST_PROCESS: PostProcessConfig = { enabled: false, bloom: false, bloomStrength: 0.5, bloomThreshold: 0.8, bloomRadius: 0.4, vignette: false, vignetteIntensity: 0.5, chromaticAberration: false, chromaticAberrationOffset: 0.002, filmGrain: false, filmGrainIntensity: 0.35, antialiasing: 'fxaa', toneMappingExposure: 1.0, saturation: 1.0, contrast: 1.0 };

// ---- Prefab ----
export interface PrefabData { id: string; name: string; entitySnapshot: Omit<Entity, 'id'>; createdAt: string; thumbnailColor: string; }

// ---- Physics ----
export type ColliderShapeType = 'box' | 'sphere' | 'capsule';
export interface RigidbodyComponent { mass: number; useGravity: boolean; isKinematic: boolean; drag: number; angularDrag: number; restitution: number; friction: number; velocity: Vector3; angularVelocity: Vector3; freezePositionX: boolean; freezePositionY: boolean; freezePositionZ: boolean; freezeRotationX: boolean; freezeRotationY: boolean; freezeRotationZ: boolean; }
export interface ColliderComponent { shape: ColliderShapeType; size: Vector3; radius: number; height: number; center: Vector3; isTrigger: boolean; showWireframe: boolean; }
export interface ScriptComponent { name: string; code: string; enabled: boolean; }
export interface PointLightComponent { color: string; intensity: number; range: number; }

// ---- Advanced Physics Components ----
export interface CharacterControllerComponent {
  enabled: boolean; height: number; radius: number; walkSpeed: number; runSpeed: number;
  jumpForce: number; gravity: number; isPlayer: boolean;
}
export const DEFAULT_CHARACTER_CONTROLLER: CharacterControllerComponent = {
  enabled: false, height: 1.8, radius: 0.4, walkSpeed: 5, runSpeed: 10,
  jumpForce: 8, gravity: 20, isPlayer: false,
};

export interface VehicleComponent {
  enabled: boolean; wheelCount: number; engineForce: number; brakeForce: number;
  steeringLimit: number; mass: number; wheelRadius: number; suspensionStiffness: number;
  suspensionDamping: number; wheelPositions: Vector3[];
}
export const DEFAULT_VEHICLE_COMPONENT: VehicleComponent = {
  enabled: false, wheelCount: 4, engineForce: 5000, brakeForce: 3000,
  steeringLimit: 0.55, mass: 1500, wheelRadius: 0.4, suspensionStiffness: 55,
  suspensionDamping: 4.5, wheelPositions: [
    { x: -0.85, y: 0, z: 1.5 }, { x: 0.85, y: 0, z: 1.5 },
    { x: -0.85, y: 0, z: -1.5 }, { x: 0.85, y: 0, z: -1.5 },
  ],
};

export interface RagdollComponent {
  enabled: boolean; isRagdoll: boolean; strength: number;
  impactThreshold: number; blendFactor: number;
}
export const DEFAULT_RAGDOLL_COMPONENT: RagdollComponent = {
  enabled: false, isRagdoll: false, strength: 1.0, impactThreshold: 50, blendFactor: 0.1,
};

export interface SoftBodyComponent {
  enabled: boolean; type: 'cloth' | 'rope' | 'softball'; stiffness: number;
  damping: number; mass: number; pinnedVertices: number[];
}
export const DEFAULT_SOFT_BODY_COMPONENT: SoftBodyComponent = {
  enabled: false, type: 'cloth', stiffness: 0.9, damping: 0.03, mass: 1, pinnedVertices: [],
};

// ---- Asset Registry ----
export type AssetType = 'model' | 'texture' | 'animation' | 'audio' | 'shadergraph';
export interface AssetEntry { id: string; name: string; type: AssetType; dataUrl: string; fileSize: number; format: string; importedAt: string; embeddedClips?: string[]; thumbnailUrl?: string; mtlDataUrl?: string; shaderGraph?: ShaderGraph; }

// ---- Scene Settings ----
export type SkyboxPreset = 'none' | 'sky' | 'night' | 'sunset' | 'space';
export interface SceneSettings { skyboxPreset: SkyboxPreset; fogEnabled: boolean; fogColor: string; fogNear: number; fogFar: number; ambientColor: string; ambientIntensity: number; }
export const DEFAULT_SCENE_SETTINGS: SceneSettings = { skyboxPreset: 'none', fogEnabled: false, fogColor: '#aaaaaa', fogNear: 10, fogFar: 100, ambientColor: '#8899bb', ambientIntensity: 0.5 };

// ---- Entity ----
export interface Entity { 
  id: string; name: string; active: boolean; transform: Transform; 
  meshRenderer?: MeshRenderer; material: MaterialComponent; 
  rigidbody?: RigidbodyComponent; collider?: ColliderComponent; light?: PointLightComponent; 
  animation?: AnimationComponent; animStateMachine?: AnimStateMachine; 
  audioSource?: AudioSourceComponent; scripts: ScriptComponent[]; 
  particleEmitter?: ParticleEmitter; terrain?: TerrainConfig; water?: WaterConfig; 
  decalComponent?: DecalComponent; lod?: LODConfig;
  characterController?: CharacterControllerComponent;
  vehicle?: VehicleComponent;
  ragdoll?: RagdollComponent;
  softBody?: SoftBodyComponent;
}
export interface ConsoleMessage { id: string; type: 'log' | 'warn' | 'error' | 'info'; message: string; timestamp: string; count: number; }
export interface SceneData { name: string; entities: Entity[]; savedAt: string; sceneSettings?: SceneSettings; }

export const MESH_ICONS: Record<MeshType, string> = { cube: '▣', sphere: '●', cylinder: '⬡', plane: '▬', cone: '△', torus: '◎', custom: '⬟' };
export const COLLIDER_ICONS: Record<ColliderShapeType, string> = { box: '▣', sphere: '●', capsule: '⬡' };

// ---- Sculpting (see engine/sculpt/ for full implementation) ----
export type {
  BrushType, BrushFalloff, SculptBrush, SculptStroke, SculptPoint, SculptConfig,
  SymmetryAxis, SymmetryMode, SymmetryConfig,
  LayerBlendMode, SculptLayer, SculptLayerStack,
  MaskTool, MaskConfig, Polygroup,
  VoxelConfig, MeshLevel, MultiResMesh,
  BVHNode as SculptBVHNode, VertexDelta, SculptDelta,
  FalloffPoint, CustomFalloffCurve, BrushAlpha,
  SculptStrokePoint,
} from './sculpt/types';
export { DEFAULT_SCULPT_BRUSH, DEFAULT_SCULPT_CONFIG, DEFAULT_SYMMETRY_CONFIG, DEFAULT_MASK_CONFIG, DEFAULT_VOXEL_CONFIG } from './sculpt/types';
