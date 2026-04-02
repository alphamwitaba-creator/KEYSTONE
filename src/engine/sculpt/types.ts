// ============================================================
// KEVLA ENGINE — Sculpting Types v3.0
// Professional-grade sculpting type definitions
// ============================================================

// ---- Brush Types ----
export type BrushType =
  | 'clay' | 'draw' | 'inflate' | 'crease' | 'smooth'
  | 'flatten' | 'grab' | 'snakeHook' | 'pinch' | 'bulge'
  | 'scrape' | 'layer' | 'elastic' | 'twist' | 'move'
  | 'nudge' | 'mask' | 'relax' | 'plane' | 'fill';

export type BrushFalloff =
  | 'smooth' | 'sharp' | 'needle' | 'flat' | 'linear'
  | 'spherical' | 'gaussian' | 'custom';

// ---- Brush Alpha / Stamp ----
export interface BrushAlpha {
  id: string;
  name: string;
  dataUrl: string;
  tileable: boolean;
}

// ---- Custom Falloff Curve ----
export interface FalloffPoint { time: number; value: number; }
export interface CustomFalloffCurve {
  id: string;
  name: string;
  points: FalloffPoint[];
}

// ---- Brush Configuration ----
export interface SculptBrush {
  type: BrushType;
  size: number;
  strength: number;
  falloff: BrushFalloff;
  customCurveId?: string;
  alphaId?: string;
  alphaScale: number;
  alphaRotation: number;
  spacing: number;
  jitter: number;
  rotationRandomness: number;
  pressureSensitivity: boolean;
  pressureCurve: 'linear' | 'exponential' | 'logarithmic' | 'custom';
  pressureCurvePoints?: FalloffPoint[];
}

export const DEFAULT_SCULPT_BRUSH: SculptBrush = {
  type: 'clay',
  size: 0.5,
  strength: 0.3,
  falloff: 'smooth',
  alphaScale: 1.0,
  alphaRotation: 0,
  spacing: 0.05,
  jitter: 0,
  rotationRandomness: 0,
  pressureSensitivity: true,
  pressureCurve: 'linear',
};

// ---- Symmetry Modes ----
export type SymmetryAxis = 'X' | 'Y' | 'Z';
export type SymmetryMode = 'none' | 'mirrorX' | 'mirrorY' | 'mirrorZ' | 'radial';

export interface SymmetryConfig {
  mode: SymmetryMode;
  radialCount: number;
  radialOffset: number;
  center: { x: number; y: number; z: number };
  lockAxis: boolean;
}

export const DEFAULT_SYMMETRY_CONFIG: SymmetryConfig = {
  mode: 'none',
  radialCount: 6,
  radialOffset: 0,
  center: { x: 0, y: 0, z: 0 },
  lockAxis: false,
};

// ---- Sculpt Layers ----
export type LayerBlendMode = 'add' | 'subtract' | 'multiply' | 'overlay' | 'softLight' | 'hardLight';

export interface SculptLayer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  blendMode: LayerBlendMode;
  opacity: number;
  displacement: Float32Array | null;
  mask: Float32Array | null;
  brushType: BrushType;
  brushSize: number;
  brushStrength: number;
  timestamp: number;
}

export interface SculptLayerStack {
  layers: SculptLayer[];
  activeLayerId: string | null;
  bakedDisplacement: Float32Array | null;
}

// ---- Masking ----
export type MaskTool = 'brush' | 'lasso' | 'box' | 'topology';
export type PolygroupColor = string;

export interface MaskConfig {
  tool: MaskTool;
  brushSize: number;
  brushStrength: number;
  invertMask: boolean;
  blurPasses: number;
  sharpenPasses: number;
}

export const DEFAULT_MASK_CONFIG: MaskConfig = {
  tool: 'brush',
  brushSize: 0.3,
  brushStrength: 1.0,
  invertMask: false,
  blurPasses: 0,
  sharpenPasses: 0,
};

// ---- Polygroups ----
export interface Polygroup {
  id: string;
  name: string;
  color: string;
  faceIndices: Set<number>;
  vertexIndices: Set<number>;
}

// ---- Voxel Sculpting ----
export interface VoxelConfig {
  gridSize: number;
  voxelSize: number;
  sdfData: Float32Array | null;
  smoothPasses: number;
  remeshResolution: number;
  marchingCubesIsoValue: number;
}

export const DEFAULT_VOXEL_CONFIG: VoxelConfig = {
  gridSize: 64,
  voxelSize: 0.1,
  sdfData: null,
  smoothPasses: 3,
  remeshResolution: 128,
  marchingCubesIsoValue: 0.0,
};

// ---- Multi-Resolution ----
export interface MeshLevel {
  level: number;
  vertexCount: number;
  positions: Float32Array;
  normals: Float32Array;
  indices: Uint32Array | Uint16Array;
  parentMesh?: MeshLevel;
}

export interface MultiResMesh {
  levels: MeshLevel[];
  activeLevel: number;
  maxLevel: number;
  originalPositions: Float32Array;
}

// ---- Spatial Partitioning ----
export interface BVHNode {
  min: [number, number, number];
  max: [number, number, number];
  left?: BVHNode;
  right?: BVHNode;
  vertexIndices: number[];
  isLeaf: boolean;
}

// ---- Stroke Data ----
export interface SculptStrokePoint {
  position: { x: number; y: number; z: number };
  normal: { x: number; y: number; z: number };
  pressure: number;
  timestamp: number;
}

export interface SculptStroke {
  entityId: string;
  brush: SculptBrush;
  points: SculptStrokePoint[];
  timestamp: number;
  symmetryMode: SymmetryMode;
}

// ---- Delta-based Undo ----
export interface VertexDelta {
  index: number;
  dx: number;
  dy: number;
  dz: number;
  dnx: number;
  dny: number;
  dnz: number;
}

export interface SculptDelta {
  entityId: string;
  deltas: VertexDelta[];
  timestamp: number;
  label?: string;
}

// ---- Sculpt Config ----
export interface SculptConfig {
  enabled: boolean;
  activeEntityId: string | null;
  brush: SculptBrush;
  symmetry: SymmetryConfig;
  topology: 'static' | 'dynamic';
  subdivisionLevel: number;
  showWireframe: boolean;
  showCurvature: boolean;
  showNormals: boolean;
  useVoxelMode: boolean;
  voxelConfig: VoxelConfig;
  maskConfig: MaskConfig;
  layerStack: SculptLayerStack | null;
  polygroups: Polygroup[];
  activePolygroupId: string | null;
  useGPUCompute: boolean;
  chunkSize: number;
  lazyUpdateThreshold: number;
}

export const DEFAULT_SCULPT_CONFIG: SculptConfig = {
  enabled: false,
  activeEntityId: null,
  brush: DEFAULT_SCULPT_BRUSH,
  symmetry: DEFAULT_SYMMETRY_CONFIG,
  topology: 'static',
  subdivisionLevel: 2,
  showWireframe: false,
  showCurvature: false,
  showNormals: false,
  useVoxelMode: false,
  voxelConfig: DEFAULT_VOXEL_CONFIG,
  maskConfig: DEFAULT_MASK_CONFIG,
  layerStack: null,
  polygroups: [],
  activePolygroupId: null,
  useGPUCompute: true,
  chunkSize: 256,
  lazyUpdateThreshold: 0.001,
};
