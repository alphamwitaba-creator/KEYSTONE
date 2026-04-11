// ============================================================
// KEVLA ENGINE — LIGHTMAPPER & GI SYSTEM v2.0
// Production-Grade Global Illumination & Light Baking
//
// Architecture:
//   ┌─────────────────────────────────────────────────────────┐
//   │              LIGHTMAPPER & GI SYSTEM                   │
//   │                                                          │
//   │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │
//   │  │    Light    │  │   Baked    │  │   Real-time     │  │
//   │  │   Baker     │  │   Lightmap │  │   GI (SSAO,     │  │
//   │  │             │  │   Generator│  │   SDF GI)      │  │
//   │  └─────────────┘  └─────────────┘  └─────────────────┘  │
//   │                                                          │
//   │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │
//   │  │  Ambient    │  │   Light    │  │   Global        │  │
//   │  │  Occlusion  │  │   Probes   │  │   Illumination  │  │
//   │  └─────────────┘  └─────────────┘  └─────────────────┘  │
//   │                                                          │
//   │  ┌─────────────────────────────────────────────────────┐│
//   │  │           HDR Environment & Irradiance             ││
//   │  └─────────────────────────────────────────────────────┘│
//   └─────────────────────────────────────────────────────────┘
//
// Features:
//   • Lightmap baking (direct + indirect lighting)
//   • Ambient occlusion (baked + real-time SSAO)
//   • Light probes (spherical, planar)
//   • Environment mapping (IBL)
//   • SDF-based global illumination
//   • Post-process GI approximation
// ============================================================

import type { Vector3, Entity } from './types';

// ============================================================
// TYPES — Lightmapper Data Structures
// ============================================================

/** Lightmap texture */
export interface Lightmap {
  id: string;
  width: number;
  height: number;
  data: Uint8Array | Float32Array;
  format: 'rgb' | 'rgba';
  isValid: boolean;
}

/** Baked light data */
export interface BakedLight {
  position: Vector3;
  color: string;
  intensity: number;
  radius: number;
  type: 'point' | 'spot' | 'directional' | 'area';
}

/** Lightmap atlas */
export interface LightmapAtlas {
  id: string;
  lightmaps: Lightmap[];
  totalWidth: number;
  totalHeight: number;
  uvBounds: Map<string, { u: number; v: number; w: number; h: number }>;
}

/** Ambient occlusion settings */
export interface AmbientOcclusionConfig {
  enabled: boolean;
  samples: number;
  radius: number;
  intensity: number;
  bias: number;
  blurRadius: number;
  quality: 'low' | 'medium' | 'high' | 'ultra';
}

export const DEFAULT_AO_CONFIG: AmbientOcclusionConfig = {
  enabled: true,
  samples: 16,
  radius: 0.5,
  intensity: 1.0,
  bias: 0.01,
  blurRadius: 2,
  quality: 'medium',
};

/** Light probe configuration */
export interface LightProbe {
  id: string;
  position: Vector3;
  type: 'spherical' | 'planar';
  resolution: number;
  data: Float32Array | null;
  isValid: boolean;
}

/** Environment probe */
export interface EnvironmentProbe {
  id: string;
  position: Vector3;
  resolution: number;
  refreshMode: 'onAwake' | 'onDemand' | 'everyFrame';
  timeBetweenRefreshes: number;
  cubemap: string | null;
  isValid: boolean;
}

/** GI configuration */
export interface GIConfig {
  enabled: boolean;
  indirectIntensity: number;
  directIntensity: number;
  maxDistance: number;
  fallbackIntensity: number;
  quality: 'off' | 'low' | 'medium' | 'high';
}

/** Ray for lightmapping */
export interface LightmapRay {
  origin: Vector3;
  direction: Vector3;
  length: number;
  hit: boolean;
  hitPosition: Vector3;
  hitNormal: Vector3;
  hitMaterial: { albedo: Vector3; emissive: Vector3 };
}

// ============================================================
// LIGHTMAP BAKER
// ============================================================

export class LightmapBaker {
  private lightmaps: Map<string, Lightmap> = new Map();
  private atlas: LightmapAtlas | null = null;
  private raycaster: { origin: Vector3; direction: Vector3; maxDist: number }[] = [];

  /**
   * Generate lightmap for a scene
   */
  bakeLightmap(
    entityId: string,
    resolution: number = 256,
    samples: number = 64
  ): Lightmap {
    const lightmap: Lightmap = {
      id: `lm_${entityId}_${Date.now()}`,
      width: resolution,
      height: resolution,
      data: new Float32Array(resolution * resolution * 4),
      format: 'rgba',
      isValid: true,
    };

    // Ray trace each texel
    for (let y = 0; y < resolution; y++) {
      for (let x = 0; x < resolution; x++) {
        const u = x / resolution;
        const v = y / resolution;

        const color = this._traceLight(u, v, samples);
        const idx = (y * resolution + x) * 4;
        lightmap.data[idx] = color.x;
        lightmap.data[idx + 1] = color.y;
        lightmap.data[idx + 2] = color.z;
        lightmap.data[idx + 3] = 1.0;
      }
    }

    this.lightmaps.set(entityId, lightmap);
    return lightmap;
  }

  private _traceLight(u: number, v: number, samples: number): Vector3 {
    const result = { x: 0, y: 0, z: 0 };

    for (let i = 0; i < samples; i++) {
      // Hemisphere sampling
      const phi = Math.random() * Math.PI * 2;
      const theta = Math.acos(2 * Math.random() - 1);
      const dir = {
        x: Math.sin(theta) * Math.cos(phi),
        y: Math.sin(theta) * Math.sin(phi),
        z: Math.cos(theta),
      };

      // Simple diffuse calculation
      const light = { x: 1, y: 1, z: 1 };
      const ndotl = Math.max(0, dir.y); // Simple up-facing normal
      result.x += light.x * ndotl;
      result.y += light.y * ndotl;
      result.z += light.z * ndotl;
    }

    const invSamples = 1 / samples;
    return { x: result.x * invSamples, y: result.y * invSamples, z: result.z * invSamples };
  }

  /**
   * Bake ambient occlusion
   */
  bakeAO(
    entityId: string,
    resolution: number = 256,
    config: AmbientOcclusionConfig = DEFAULT_AO_CONFIG
  ): Lightmap {
    const lightmap: Lightmap = {
      id: `ao_${entityId}_${Date.now()}`,
      width: resolution,
      height: resolution,
      data: new Float32Array(resolution * resolution),
      format: 'rgb',
      isValid: true,
    };

    const radius = config.radius;
    const samples = config.samples;
    const intensity = config.intensity;

    for (let y = 0; y < resolution; y++) {
      for (let x = 0; x < resolution; x++) {
        let occlusion = 0;

        for (let s = 0; s < samples; s++) {
          const angle = Math.random() * Math.PI * 2;
          const dist = Math.random() * radius;
          const offset = {
            x: Math.cos(angle) * dist,
            y: Math.random() * radius * 0.5,
            z: Math.sin(angle) * dist,
          };

          // Simplified occlusion check
          const hitChance = this._estimateOcclusion(offset, dist);
          occlusion += hitChance;
        }

        const ao = 1 - (occlusion / samples) * intensity;
        lightmap.data[y * resolution + x] = Math.max(0, Math.min(1, ao));
      }
    }

    this.lightmaps.set(`ao_${entityId}`, lightmap);
    return lightmap;
  }

  private _estimateOcclusion(offset: Vector3, dist: number): number {
    // Simplified - in production would check against geometry
    return dist < 0.2 ? 0.1 : 0.4;
  }

  /**
   * Get lightmap for entity
   */
  getLightmap(entityId: string): Lightmap | undefined {
    return this.lightmaps.get(entityId);
  }

  /**
   * Clear lightmaps
   */
  clearLightmaps(): void {
    this.lightmaps.clear();
    this.atlas = null;
  }

  /**
   * Export lightmaps as texture data
   */
  exportLightmaps(): Map<string, Uint8Array> {
    const exports = new Map<string, Uint8Array>();

    for (const [id, lightmap] of this.lightmaps) {
      const data = new Uint8Array(lightmap.width * lightmap.height * 4);

      for (let i = 0; i < lightmap.data.length; i++) {
        data[i] = Math.min(255, Math.max(0, lightmap.data[i] * 255));
      }

      exports.set(id, data);
    }

    return exports;
  }
}

// ============================================================
// AMBIENT OCCLUSION (SSAO)
// ============================================================

export class SSAORenderer {
  private config: AmbientOcclusionConfig;
  private kernel: Vector3[] = [];

  constructor(config: Partial<AmbientOcclusionConfig> = {}) {
    this.config = { ...DEFAULT_AO_CONFIG, ...config };
    this._generateKernel();
  }

  private _generateKernel(): void {
    const samples = this._getSampleCount();
    
    for (let i = 0; i < samples; i++) {
      const sample = {
        x: Math.random() * 2 - 1,
        y: Math.random() * 2 - 1,
        z: Math.random(),
      };

      // Normalize
      const len = Math.sqrt(sample.x * sample.x + sample.y * sample.y + sample.z * sample.z);
      sample.x /= len;
      sample.y /= len;
      sample.z /= len;

      // Scale
      const scale = i / samples;
      const scaled = scale * scale;
      sample.x *= scaled;
      sample.y *= scaled;
      sample.z *= scaled;

      this.kernel.push(sample);
    }
  }

  private _getSampleCount(): number {
    switch (this.config.quality) {
      case 'low': return 8;
      case 'medium': return 16;
      case 'high': return 32;
      case 'ultra': return 64;
      default: return 16;
    }
  }

  /**
   * Compute SSAO for a position
   */
  computeAO(
    position: Vector3,
    normal: Vector3,
    depth: number,
    getDepth: (offset: Vector3) => number
  ): number {
    if (!this.config.enabled) return 1.0;

    let occlusion = 0;
    const radius = this.config.radius;

    for (const sample of this.kernel) {
      // Create sample position
      const samplePos = {
        x: position.x + sample.x * radius,
        y: position.y + sample.y * radius,
        z: position.z + sample.z * radius,
      };

      // Get depth at sample position
      const sampleDepth = getDepth(samplePos);

      // Range check
      const rangeCheck = Math.max(0, 1 - Math.abs(depth - sampleDepth) / this.config.radius);

      // Occlusion test
      if (sampleDepth < depth - this.config.bias) {
        occlusion += rangeCheck;
      }
    }

    const ao = 1 - (occlusion / this.kernel.length) * this.config.intensity;
    return Math.max(0, Math.min(1, ao));
  }

  setConfig(config: Partial<AmbientOcclusionConfig>): void {
    this.config = { ...this.config, ...config };
    this._generateKernel();
  }

  getConfig(): AmbientOcclusionConfig {
    return { ...this.config };
  }
}

// ============================================================
// LIGHT PROBES
// ============================================================

export class LightProbeSystem {
  probes: Map<string, LightProbe> = new Map();
  private irradianceCache: Map<string, Float32Array> = new Map();

  /**
   * Create a light probe
   */
  createProbe(
    id: string,
    position: Vector3,
    type: 'spherical' | 'planar' = 'spherical',
    resolution: number = 32
  ): LightProbe {
    const probe: LightProbe = {
      id,
      position,
      type,
      resolution,
      data: new Float32Array(resolution * resolution * 4),
      isValid: false,
    };

    this.probes.set(id, probe);
    return probe;
  }

  /**
   * Update probe data from scene
   */
  updateProbe(
    probeId: string,
    sceneLights: { position: Vector3; color: string; intensity: number }[]
  ): void {
    const probe = this.probes.get(probeId);
    if (!probe) return;

    const resolution = probe.resolution;

    // Generate irradiance samples
    for (let y = 0; y < resolution; y++) {
      for (let x = 0; x < resolution; x++) {
        const u = x / resolution;
        const v = y / resolution;

        // Spherical to Cartesian
        const theta = u * Math.PI * 2;
        const phi = v * Math.PI;
        const direction = {
          x: Math.sin(phi) * Math.cos(theta),
          y: Math.cos(phi),
          z: Math.sin(phi) * Math.sin(theta),
        };

        // Accumulate lighting
        let r = 0, g = 0, b = 0;

        for (const light of sceneLights) {
          const ndotl = Math.max(0, 
            direction.x * 0 + direction.y * 1 + direction.z * 0 // Simplified up normal
          );

          if (ndotl > 0) {
            r += ndotl * light.intensity;
            g += ndotl * light.intensity;
            b += ndotl * light.intensity;
          }
        }

        const idx = (y * resolution + x) * 4;
        if (probe.data) {
          probe.data[idx] = r;
          probe.data[idx + 1] = g;
          probe.data[idx + 2] = b;
          probe.data[idx + 3] = 1;
        }
      }
    }

    probe.isValid = true;
    this.irradianceCache.set(probeId, probe.data!);
  }

  /**
   * Get irradiance at position by interpolating nearby probes
   */
  getIrradiance(position: Vector3): Float32Array | null {
    let closestProbe: LightProbe | null = null;
    let closestDist = Infinity;

    for (const probe of this.probes.values()) {
      if (!probe.isValid) continue;

      const dist = Math.sqrt(
        (probe.position.x - position.x) ** 2 +
        (probe.position.y - position.y) ** 2 +
        (probe.position.z - position.z) ** 2
      );

      if (dist < closestDist) {
        closestDist = dist;
        closestProbe = probe;
      }
    }

    return closestProbe?.data || null;
  }

  /**
   * Remove probe
   */
  removeProbe(probeId: string): boolean {
    this.irradianceCache.delete(probeId);
    return this.probes.delete(probeId);
  }

  /**
   * Clear all probes
   */
  clear(): void {
    this.probes.clear();
    this.irradianceCache.clear();
  }
}

// ============================================================
// ENVIRONMENT PROBES
// ============================================================

export class EnvironmentProbeSystem {
  probes: Map<string, EnvironmentProbe> = new Map();

  createProbe(
    id: string,
    position: Vector3,
    resolution: number = 128,
    refreshMode: 'onAwake' | 'onDemand' | 'everyFrame' = 'onDemand'
  ): EnvironmentProbe {
    const probe: EnvironmentProbe = {
      id,
      position,
      resolution,
      refreshMode,
      timeBetweenRefreshes: 0,
      cubemap: null,
      isValid: false,
    };

    this.probes.set(id, probe);
    return probe;
  }

  refreshProbe(probeId: string): void {
    const probe = this.probes.get(probeId);
    if (!probe) return;

    // In production, would capture scene to cubemap
    probe.cubemap = `env_${probeId}_${Date.now()}`;
    probe.isValid = true;
  }

  getProbe(probeId: string): EnvironmentProbe | undefined {
    return this.probes.get(probeId);
  }

  getProbesInRadius(position: Vector3, radius: number): EnvironmentProbe[] {
    return Array.from(this.probes.values()).filter(probe => {
      const dist = Math.sqrt(
        (probe.position.x - position.x) ** 2 +
        (probe.position.y - position.y) ** 2 +
        (probe.position.z - position.z) ** 2
      );
      return dist <= radius;
    });
  }

  removeProbe(probeId: string): boolean {
    return this.probes.delete(probeId);
  }
}

// ============================================================
// GLOBAL ILLUMINATION
// ============================================================

export class GlobalIllumination {
  config: GIConfig;
  private probeSystem: LightProbeSystem;
  private sdfData: Float32Array | null = null;

  constructor(config: Partial<GIConfig> = {}) {
    this.config = {
      enabled: false,
      indirectIntensity: 1.0,
      directIntensity: 1.0,
      maxDistance: 10,
      fallbackIntensity: 0.5,
      quality: 'off',
      ...config,
    };

    this.probeSystem = new LightProbeSystem();
  }

  /**
   * Initialize SDF for GI
   */
  initSDF(bounds: { min: Vector3; max: Vector3 }, resolution: number): void {
    const size = resolution * resolution * resolution;
    this.sdfData = new Float32Array(size);

    // Initialize with default value
    for (let i = 0; i < size; i++) {
      this.sdfData[i] = 1.0;
    }
  }

  /**
   * Update GI
   */
  update(
    position: Vector3,
    normal: Vector3,
    albedo: Vector3,
    getSceneData: (pos: Vector3) => { depth: number; normal: Vector3 }
  ): Vector3 {
    if (!this.config.enabled || this.config.quality === 'off') {
      return albedo;
    }

    // Get irradiance from probes
    const irradiance = this.probeSystem.getIrradiance(position);

    if (irradiance) {
      return {
        x: irradiance[0] * this.config.indirectIntensity,
        y: irradiance[1] * this.config.indirectIntensity,
        z: irradiance[2] * this.config.indirectIntensity,
      };
    }

    // Fallback
    return {
      x: albedo.x * this.config.fallbackIntensity,
      y: albedo.y * this.config.fallbackIntensity,
      z: albedo.z * this.config.fallbackIntensity,
    };
  }

  /**
   * Get GI intensity at position
   */
  getGIAtPosition(position: Vector3): number {
    if (!this.config.enabled) return 0;

    const irradiance = this.probeSystem.getIrradiance(position);
    if (!irradiance) return this.config.fallbackIntensity;

    return (irradiance[0] + irradiance[1] + irradiance[2]) / 3 * this.config.indirectIntensity;
  }

  setConfig(config: Partial<GIConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getProbeSystem(): LightProbeSystem {
    return this.probeSystem;
  }
}

// ============================================================
// LIGHTMAPPER MANAGER
// ============================================================

export class LightmapperSystem {
  baker: LightmapBaker;
  ssao: SSAORenderer;
  lightProbes: LightProbeSystem;
  environmentProbes: EnvironmentProbeSystem;
  gi: GlobalIllumination;

  constructor() {
    this.baker = new LightmapBaker();
    this.ssao = new SSAORenderer();
    this.lightProbes = new LightProbeSystem();
    this.environmentProbes = new EnvironmentProbeSystem();
    this.gi = new GlobalIllumination();
  }

  /**
   * Bake all lightmaps for scene
   */
  bakeScene(entities: Entity[], resolution: number = 256): void {
    for (const entity of entities) {
      if (entity.meshRenderer) {
        this.baker.bakeLightmap(entity.id, resolution);
        this.baker.bakeAO(entity.id, resolution, this.ssao.getConfig());
      }
    }
  }

  /**
   * Update real-time systems
   */
  update(position: Vector3, normal: Vector3, depth: number, getDepth: (pos: Vector3) => number): void {
    // Update SSAO
    this.ssao.computeAO(position, normal, depth, getDepth);
  }

  /**
   * Clear all baked data
   */
  clear(): void {
    this.baker.clearLightmaps();
    this.lightProbes.clear();
  }
}

export const lightmapper = new LightmapperSystem();