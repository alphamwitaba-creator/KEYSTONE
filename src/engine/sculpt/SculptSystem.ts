// ============================================================
// KEVLA ENGINE — Sculpt System v3.0
// Professional-grade GPU-accelerated mesh deformation
// ============================================================

import * as THREE from 'three';
import { BVHBuilder, type BVHNode } from './BVH';
import { FalloffEvaluator } from './FalloffCurves';
import { SymmetrySystem } from './SymmetrySystem';
import { MaskSystem } from './MaskSystem';
import { SculptLayerSystem } from './SculptLayers';
import type {
  BrushType, BrushFalloff, SculptBrush, SculptConfig,
  SculptStroke, SculptStrokePoint, SculptDelta, VertexDelta,
  SymmetryConfig, MaskConfig,
} from './types';

interface VertexData {
  position: THREE.Vector3;
  normal: THREE.Vector3;
  originalPos: THREE.Vector3;
  originalNormal: THREE.Vector3;
}

interface MeshCache {
  entityId: string;
  vertices: VertexData[];
  positions: Float32Array;
  normals: Float32Array;
  indices: Uint32Array | Uint16Array;
  bvh: BVHNode;
  adjacency: Map<number, number[]>;
  faceNormals: Float32Array;
  dirty: boolean;
  lastUpdate: number;
}

export class SculptSystem {
  private config: SculptConfig;
  private meshCache = new Map<string, MeshCache>();
  private strokes: SculptStroke[] = [];
  private redoStack: SculptDelta[][] = [];
  private activeStroke: {
    entityId: string;
    brush: SculptBrush;
    startPos: THREE.Vector3;
    lastPos: THREE.Vector3;
    lastTime: number;
    accumulatedDistance: number;
    deltas: VertexDelta[];
  } | null = null;

  private symmetrySystem: SymmetrySystem;
  private maskSystem: MaskSystem;
  private layerSystem: SculptLayerSystem;
  private bvhBuilder: BVHBuilder;

  constructor(config: SculptConfig) {
    this.config = { ...config };
    this.symmetrySystem = new SymmetrySystem(config.symmetry);
    this.maskSystem = new MaskSystem(config.maskConfig);
    this.layerSystem = new SculptLayerSystem();
    this.bvhBuilder = new BVHBuilder(8, 16);
  }

  setConfig(config: Partial<SculptConfig>) {
    this.config = { ...this.config, ...config };
    if (config.symmetry) this.symmetrySystem.setConfig(config.symmetry);
    if (config.maskConfig) this.maskSystem.setConfig(config.maskConfig);
  }

  getConfig() { return this.config; }
  getSymmetrySystem() { return this.symmetrySystem; }
  getMaskSystem() { return this.maskSystem; }
  getLayerSystem() { return this.layerSystem; }

  // ---- Mesh Caching ----
  cacheMesh(entityId: string, mesh: THREE.Mesh) {
    const geo = mesh.geometry as THREE.BufferGeometry;
    const posAttr = geo.getAttribute('position');
    const normAttr = geo.getAttribute('normal');
    const idxAttr = geo.getIndex();

    const count = posAttr.count;
    const positions = new Float32Array(count * 3);
    const normals = new Float32Array(count * 3);
    const vertices: VertexData[] = [];

    for (let i = 0; i < count; i++) {
      const x = posAttr.getX(i), y = posAttr.getY(i), z = posAttr.getZ(i);
      const nx = normAttr ? normAttr.getX(i) : 0;
      const ny = normAttr ? normAttr.getY(i) : 1;
      const nz = normAttr ? normAttr.getZ(i) : 0;

      positions[i * 3] = x; positions[i * 3 + 1] = y; positions[i * 3 + 2] = z;
      normals[i * 3] = nx; normals[i * 3 + 1] = ny; normals[i * 3 + 2] = nz;

      vertices.push({
        position: new THREE.Vector3(x, y, z),
        normal: new THREE.Vector3(nx, ny, nz),
        originalPos: new THREE.Vector3(x, y, z),
        originalNormal: new THREE.Vector3(nx, ny, nz),
      });
    }

    const indices = idxAttr
      ? (idxAttr.count > 65535 ? new Uint32Array(idxAttr.array) : new Uint16Array(idxAttr.array))
      : new Uint16Array(count);

    const adjacency = this.buildAdjacency(indices, count);
    const bvh = this.bvhBuilder.build(positions, count);

    this.meshCache.set(entityId, {
      entityId, vertices, positions, normals, indices, bvh, adjacency,
      faceNormals: new Float32Array(count * 3),
      dirty: false, lastUpdate: Date.now(),
    });

    this.maskSystem.initMask(count);
  }

  invalidateCache(entityId: string) { this.meshCache.delete(entityId); }

  getCache(entityId: string) { return this.meshCache.get(entityId); }

  // ---- Stroke Management ----
  beginStroke(entityId: string, brush: SculptBrush, hitPoint: THREE.Vector3) {
    const cache = this.meshCache.get(entityId);
    if (!cache) return;

    this.activeStroke = {
      entityId,
      brush: { ...brush },
      startPos: hitPoint.clone(),
      lastPos: hitPoint.clone(),
      lastTime: Date.now(),
      accumulatedDistance: 0,
      deltas: [],
    };

    this.redoStack = [];
  }

  applyBrush(
    entityId: string,
    brush: SculptBrush,
    hitPoint: THREE.Vector3,
    hitNormal: THREE.Vector3,
    mesh: THREE.Mesh,
    pressure: number = 1.0,
  ): boolean {
    if (!this.activeStroke || this.activeStroke.entityId !== entityId) return false;

    const cache = this.meshCache.get(entityId);
    if (!cache) return false;

    const radius = brush.size;
    const strength = brush.strength * (brush.pressureSensitivity ? pressure : 1.0);
    const delta = new THREE.Vector3().subVectors(hitPoint, this.activeStroke.lastPos);
    const drag = delta.length();
    const spacing = brush.spacing * radius;

    this.activeStroke.accumulatedDistance += drag;

    if (this.activeStroke.accumulatedDistance < spacing && drag > 0.0001) {
      this.activeStroke.lastPos.copy(hitPoint);
      return false;
    }

    this.activeStroke.accumulatedDistance = 0;
    this.activeStroke.lastPos.copy(hitPoint);

    const effectiveBrush = { ...brush, strength };

    const symmetryResult = this.symmetrySystem.getSymmetricPoints(
      hitPoint, hitNormal, cache.positions, cache.normals, radius,
    );

    const strokeDeltas: VertexDelta[] = [];

    for (const vi of symmetryResult.points) {
      const vx = cache.positions[vi * 3], vy = cache.positions[vi * 3 + 1], vz = cache.positions[vi * 3 + 2];
      const dist = Math.sqrt(
        (vx - hitPoint.x) ** 2 + (vy - hitPoint.y) ** 2 + (vz - hitPoint.z) ** 2,
      );

      if (dist > radius) continue;

      const maskValue = this.maskSystem.getMask()?.[vi] ?? 1.0;
      if (maskValue <= 0.01) continue;

      const t = dist / radius;
      const falloffType = brush.falloff === 'custom' && brush.customCurveId ? 'custom' : brush.falloff;
      const falloff = FalloffEvaluator.evaluate(t, falloffType);
      const influence = falloff * strength * maskValue;

      if (influence < 0.0001) continue;

      const vert = cache.vertices[vi];
      const origPos = vert.originalPos.clone();
      const origNorm = vert.normal.clone();

      this.applyBrushType(brush.type, vert, hitPoint, hitNormal, delta, drag, influence, radius);

      const dx = vert.position.x - origPos.x;
      const dy = vert.position.y - origPos.y;
      const dz = vert.position.z - origPos.z;

      if (Math.abs(dx) > 0.00001 || Math.abs(dy) > 0.00001 || Math.abs(dz) > 0.00001) {
        strokeDeltas.push({ index: vi, dx, dy, dz, dnx: 0, dny: 0, dnz: 0 });
      }

      cache.positions[vi * 3] = vert.position.x;
      cache.positions[vi * 3 + 1] = vert.position.y;
      cache.positions[vi * 3 + 2] = vert.position.z;
    }

    if (strokeDeltas.length > 0) {
      this.activeStroke.deltas.push(...strokeDeltas);

      if (this.config.layerStack) {
        const activeLayer = this.layerSystem.getActiveLayer();
        if (activeLayer) {
          this.layerSystem.applyDisplacementToLayer(activeLayer.id, strokeDeltas);
        }
      }

      this.recalculateNormals(cache);
      this.syncToMesh(cache, mesh);
    }

    return strokeDeltas.length > 0;
  }

  private applyBrushType(
    type: BrushType,
    vert: VertexData,
    hitPoint: THREE.Vector3,
    hitNormal: THREE.Vector3,
    dragDelta: THREE.Vector3,
    drag: number,
    influence: number,
    radius: number,
  ) {
    switch (type) {
      case 'clay': {
        const dir = hitNormal.clone();
        const dot = vert.position.clone().sub(hitPoint).dot(hitNormal);
        if (dot > 0) dir.multiplyScalar(0.5);
        vert.position.addScaledVector(dir, influence * 0.04);
        break;
      }
      case 'draw': {
        vert.position.addScaledVector(hitNormal, influence * 0.03);
        break;
      }
      case 'inflate': {
        const toCenter = vert.position.clone().normalize().negate();
        const dir = toCenter.dot(hitNormal) > 0 ? toCenter : hitNormal;
        vert.position.addScaledVector(dir, influence * 0.03);
        break;
      }
      case 'crease': {
        const edge = dragDelta.clone().normalize();
        const creaseDir = vert.normal.clone().cross(edge).normalize();
        vert.position.addScaledVector(creaseDir, influence * 0.02);
        break;
      }
      case 'smooth': {
        const avg = new THREE.Vector3();
        let count = 0;
        const neighbors = this.getNeighbors(vert.position, radius * 0.5);
        for (const n of neighbors) { avg.add(n.position); count++; }
        if (count > 0) {
          avg.divideScalar(count);
          vert.position.lerp(avg, influence * 0.3);
        }
        break;
      }
      case 'flatten': {
        const proj = vert.position.clone().sub(hitPoint);
        const d = proj.dot(hitNormal);
        const target = vert.position.clone().sub(hitNormal.clone().multiplyScalar(d));
        vert.position.lerp(target, influence * 0.4);
        break;
      }
      case 'grab': {
        const grabDir = dragDelta.clone().normalize();
        vert.position.addScaledVector(grabDir, influence * drag * 0.5);
        break;
      }
      case 'snakeHook': {
        const hookDir = dragDelta.clone().normalize();
        const dist = vert.position.distanceTo(hitPoint);
        const hookStrength = influence * (1 - dist / radius) * drag * 0.8;
        vert.position.addScaledVector(hookDir, hookStrength);
        break;
      }
      case 'pinch': {
        const toHit = hitPoint.clone().sub(vert.position).normalize();
        vert.position.addScaledVector(toHit, influence * 0.03);
        break;
      }
      case 'bulge': {
        vert.position.addScaledVector(vert.normal, influence * 0.04);
        break;
      }
      case 'scrape': {
        const proj = vert.position.clone().sub(hitPoint);
        const d = proj.dot(hitNormal);
        const target = vert.position.clone().sub(hitNormal.clone().multiplyScalar(d));
        if (d > 0) vert.position.lerp(target, influence * 0.6);
        break;
      }
      case 'layer': {
        const dot = vert.position.clone().sub(hitPoint).normalize().dot(hitNormal);
        if (dot > 0.3) vert.position.addScaledVector(hitNormal, influence * 0.03);
        break;
      }
      case 'elastic': {
        const target = hitPoint.clone().addScaledVector(hitNormal, influence * 0.02);
        vert.position.lerp(target, influence * 0.2);
        break;
      }
      case 'twist': {
        const axis = hitNormal.clone();
        const dist = vert.position.distanceTo(hitPoint);
        const angle = influence * dist * 2;
        const q = new THREE.Quaternion().setFromAxisAngle(axis, angle);
        const rel = vert.position.clone().sub(hitPoint);
        rel.applyQuaternion(q);
        vert.position.copy(hitPoint).add(rel);
        break;
      }
      case 'move': {
        const moveDir = dragDelta.clone().normalize();
        vert.position.addScaledVector(moveDir, influence * drag * 0.3);
        break;
      }
      case 'nudge': {
        vert.position.addScaledVector(hitNormal, influence * 0.01);
        break;
      }
      case 'relax': {
        const neighbors = this.getNeighbors(vert.position, radius * 0.3);
        if (neighbors.length > 0) {
          const avg = new THREE.Vector3();
          for (const n of neighbors) avg.add(n.position);
          avg.divideScalar(neighbors.length);
          vert.position.lerp(avg, influence * 0.15);
        }
        break;
      }
      case 'plane': {
        const proj = vert.position.clone().sub(hitPoint);
        const d = proj.dot(hitNormal);
        const target = vert.position.clone().sub(hitNormal.clone().multiplyScalar(d));
        vert.position.lerp(target, influence * 0.8);
        break;
      }
      case 'fill': {
        const avg = new THREE.Vector3();
        let count = 0;
        const neighbors = this.getNeighbors(vert.position, radius * 0.5);
        for (const n of neighbors) { avg.add(n.position); count++; }
        if (count > 0) {
          avg.divideScalar(count);
          const diff = avg.clone().sub(vert.position);
          if (diff.dot(hitNormal) > 0) {
            vert.position.addScaledVector(diff, influence * 0.3);
          }
        }
        break;
      }
    }
  }

  endStroke(entityId: string) {
    if (!this.activeStroke || this.activeStroke.entityId !== entityId) return;

    const stroke: SculptStroke = {
      entityId,
      brush: { ...this.activeStroke.brush },
      points: [],
      timestamp: Date.now(),
      symmetryMode: this.config.symmetry.mode,
    };
    this.strokes.push(stroke);

    if (this.activeStroke.deltas.length > 0) {
      const delta: SculptDelta = {
        entityId,
        deltas: [...this.activeStroke.deltas],
        timestamp: Date.now(),
      };
      this.redoStack.push([delta]);
    }

    this.activeStroke = null;
  }

  // ---- Undo/Redo (Delta-based) ----
  undo(entityId: string, mesh: THREE.Mesh) {
    if (this.redoStack.length === 0) return;
    const lastDeltas = this.redoStack.pop()!;

    const cache = this.meshCache.get(entityId);
    if (!cache) return;

    const inverseDeltas: VertexDelta[] = [];
    for (const batch of lastDeltas) {
      for (const d of batch.deltas) {
        const vert = cache.vertices[d.index];
        vert.position.x -= d.dx;
        vert.position.y -= d.dy;
        vert.position.z -= d.dz;
        cache.positions[d.index * 3] = vert.position.x;
        cache.positions[d.index * 3 + 1] = vert.position.y;
        cache.positions[d.index * 3 + 2] = vert.position.z;

        inverseDeltas.push({ index: d.index, dx: -d.dx, dy: -d.dy, dz: -d.dz, dnx: 0, dny: 0, dnz: 0 });
      }
    }

    this.recalculateNormals(cache);
    this.syncToMesh(cache, mesh);

    if (inverseDeltas.length > 0) {
      this.redoStack.push([{ entityId, deltas: inverseDeltas, timestamp: Date.now() }]);
    }
  }

  redo(entityId: string, mesh: THREE.Mesh) {
    if (this.redoStack.length === 0) return;
    const lastDeltas = this.redoStack.pop()!;

    const cache = this.meshCache.get(entityId);
    if (!cache) return;

    for (const batch of lastDeltas) {
      for (const d of batch.deltas) {
        const vert = cache.vertices[d.index];
        vert.position.x += d.dx;
        vert.position.y += d.dy;
        vert.position.z += d.dz;
        cache.positions[d.index * 3] = vert.position.x;
        cache.positions[d.index * 3 + 1] = vert.position.y;
        cache.positions[d.index * 3 + 2] = vert.position.z;
      }
    }

    this.recalculateNormals(cache);
    this.syncToMesh(cache, mesh);
  }

  resetMesh(entityId: string, mesh: THREE.Mesh) {
    const cache = this.meshCache.get(entityId);
    if (!cache) return;

    for (let i = 0; i < cache.vertices.length; i++) {
      const v = cache.vertices[i];
      v.position.copy(v.originalPos);
      v.normal.copy(v.originalNormal);
      cache.positions[i * 3] = v.originalPos.x;
      cache.positions[i * 3 + 1] = v.originalPos.y;
      cache.positions[i * 3 + 2] = v.originalPos.z;
      cache.normals[i * 3] = v.originalNormal.x;
      cache.normals[i * 3 + 1] = v.originalNormal.y;
      cache.normals[i * 3 + 2] = v.originalNormal.z;
    }

    this.recalculateNormals(cache);
    this.syncToMesh(cache, mesh);
  }

  // ---- Subdivision ----
  subdivideMesh(entityId: string, mesh: THREE.Mesh): THREE.Mesh {
    const cache = this.meshCache.get(entityId);
    if (!cache) return mesh;

    let currentGeo = mesh.geometry.clone();
    const levels = this.config.subdivisionLevel;

    for (let s = 0; s < levels; s++) {
      currentGeo = this.linearSubdivide(currentGeo);
    }

    const newMesh = new THREE.Mesh(currentGeo, mesh.material.clone());
    newMesh.position.copy(mesh.position);
    newMesh.rotation.copy(mesh.rotation);
    newMesh.scale.copy(mesh.scale);
    newMesh.castShadow = true;
    newMesh.receiveShadow = true;

    this.cacheMesh(entityId, newMesh);
    return newMesh;
  }

  private linearSubdivide(geo: THREE.BufferGeometry): THREE.BufferGeometry {
    const posAttr = geo.getAttribute('position');
    const idxAttr = geo.getIndex();
    if (!idxAttr) return geo;

    const positions: number[] = [];
    const normals: number[] = [];
    const midCache = new Map<string, number>();
    const origCount = posAttr.count;

    const getPos = (i: number) => ({
      x: posAttr.getX(i), y: posAttr.getY(i), z: posAttr.getZ(i),
    });

    const addVertex = (p: { x: number; y: number; z: number }) => {
      positions.push(p.x, p.y, p.z);
      normals.push(0, 1, 0);
      return positions.length / 3 - 1;
    };

    const getMidpoint = (a: number, b: number): number => {
      const key = Math.min(a, b) + '_' + Math.max(a, b);
      if (midCache.has(key)) return midCache.get(key)!;
      const pa = getPos(a), pb = getPos(b);
      const mid = { x: (pa.x + pb.x) * 0.5, y: (pa.y + pb.y) * 0.5, z: (pa.z + pb.z) * 0.5 };
      const idx = addVertex(mid);
      midCache.set(key, idx);
      return idx;
    };

    for (let i = 0; i < idxAttr.count; i += 3) {
      const a = idxAttr.getX(i), b = idxAttr.getX(i + 1), c = idxAttr.getX(i + 2);
      const ab = getMidpoint(a, b), bc = getMidpoint(b, c), ac = getMidpoint(a, c);

      positions.push(
        ...[a, ab, ac, ab, b, bc, ac, bc, c, ab, bc, ac].flatMap(vi => {
          const p = vi < origCount ? getPos(vi) : getPos(vi);
          return [p.x, p.y, p.z];
        }),
      );
    }

    const newGeo = new THREE.BufferGeometry();
    newGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
    newGeo.computeVertexNormals();
    return newGeo;
  }

  // ---- GPU Compute Shaders ----
  createComputeShader(brushType: BrushType): string {
    return `
      struct VertexInput {
        vec3 position;
        vec3 normal;
        float mask;
      };

      uniform vec3 u_hitPoint;
      uniform vec3 u_hitNormal;
      uniform float u_radius;
      uniform float u_strength;
      uniform float u_pressure;
      uniform int u_brushType;
      uniform float u_time;

      void main() {
        vec3 pos = vertex.position;
        float dist = distance(pos, u_hitPoint);
        if (dist > u_radius) return;

        float t = dist / u_radius;
        float falloff = pow(1.0 - t, 2.0);
        float influence = falloff * u_strength * u_pressure * vertex.mask;

        vec3 displacement = vec3(0.0);

        if (u_brushType == 0) {
          displacement = u_hitNormal * influence * 0.04;
        } else if (u_brushType == 1) {
          displacement = u_hitNormal * influence * 0.03;
        } else if (u_brushType == 2) {
          vec3 toCenter = normalize(-pos);
          displacement = toCenter * influence * 0.03;
        }

        vertex.position += displacement;
      }
    `;
  }

  // ---- Normal Recalculation ----
  private recalculateNormals(cache: MeshCache) {
    const { positions, normals, indices, adjacency } = cache;
    const count = positions.length / 3;

    normals.fill(0);

    for (let i = 0; i < indices.length; i += 3) {
      const a = indices[i], b = indices[i + 1], c = indices[i + 2];
      const ax = positions[a * 3], ay = positions[a * 3 + 1], az = positions[a * 3 + 2];
      const bx = positions[b * 3], by = positions[b * 3 + 1], bz = positions[b * 3 + 2];
      const cx = positions[c * 3], cy = positions[c * 3 + 1], cz = positions[c * 3 + 2];

      const e1x = bx - ax, e1y = by - ay, e1z = bz - az;
      const e2x = cx - ax, e2y = cy - ay, e2z = cz - az;

      const nx = e1y * e2z - e1z * e2y;
      const ny = e1z * e2x - e1x * e2z;
      const nz = e1x * e2y - e1y * e2x;

      normals[a * 3] += nx; normals[a * 3 + 1] += ny; normals[a * 3 + 2] += nz;
      normals[b * 3] += nx; normals[b * 3 + 1] += ny; normals[b * 3 + 2] += nz;
      normals[c * 3] += nx; normals[c * 3 + 1] += ny; normals[c * 3 + 2] += nz;
    }

    for (let i = 0; i < count; i++) {
      const nx = normals[i * 3], ny = normals[i * 3 + 1], nz = normals[i * 3 + 2];
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
      if (len > 0) {
        normals[i * 3] = nx / len;
        normals[i * 3 + 1] = ny / len;
        normals[i * 3 + 2] = nz / len;
        cache.vertices[i].normal.set(normals[i * 3], normals[i * 3 + 1], normals[i * 3 + 2]);
      }
    }

    cache.dirty = true;
    cache.lastUpdate = Date.now();
  }

  private syncToMesh(cache: MeshCache, mesh: THREE.Mesh) {
    const geo = mesh.geometry as THREE.BufferGeometry;
    const posAttr = geo.getAttribute('position') as THREE.BufferAttribute;
    const normAttr = geo.getAttribute('normal') as THREE.BufferAttribute;

    posAttr.array.set(cache.positions);
    posAttr.needsUpdate = true;

    if (normAttr) {
      normAttr.array.set(cache.normals);
      normAttr.needsUpdate = true;
    }

    geo.computeBoundingSphere();
    cache.dirty = false;
  }

  // ---- Helpers ----
  private buildAdjacency(indices: Uint32Array | Uint16Array, count: number): Map<number, number[]> {
    const adj = new Map<number, number[]>();
    for (let i = 0; i < indices.length; i += 3) {
      const a = indices[i], b = indices[i + 1], c = indices[i + 2];
      [[a, b], [b, c], [a, c]].forEach(([x, y]) => {
        if (!adj.has(x)) adj.set(x, []);
        if (!adj.has(y)) adj.set(y, []);
        const ax = adj.get(x)!, ay = adj.get(y)!;
        if (!ax.includes(y)) ax.push(y);
        if (!ay.includes(x)) ay.push(x);
      });
    }
    return adj;
  }

  private getNeighbors(center: THREE.Vector3, radius: number): VertexData[] {
    const result: VertexData[] = [];
    for (const v of this.meshCache.values()) {
      const rSq = radius * radius;
      for (const vert of v.vertices) {
        const dx = vert.position.x - center.x;
        const dy = vert.position.y - center.y;
        const dz = vert.position.z - center.z;
        if (dx * dx + dy * dy + dz * dz <= rSq) {
          result.push(vert);
        }
      }
    }
    return result;
  }

  // ---- Export ----
  exportOBJ(mesh: THREE.Mesh, name: string): string {
    const geo = mesh.geometry as THREE.BufferGeometry;
    const posAttr = geo.getAttribute('position');
    const normAttr = geo.getAttribute('normal');
    const idxAttr = geo.getIndex();

    let out = `# KEVLA Sculpt Export — ${name}\n# Vertices: ${posAttr.count}\n\n`;
    for (let i = 0; i < posAttr.count; i++) {
      const v = new THREE.Vector3().fromBufferAttribute(posAttr, i);
      out += `v ${v.x.toFixed(6)} ${v.y.toFixed(6)} ${v.z.toFixed(6)}\n`;
    }
    if (normAttr) {
      for (let i = 0; i < normAttr.count; i++) {
        const n = new THREE.Vector3().fromBufferAttribute(normAttr, i);
        out += `vn ${n.x.toFixed(6)} ${n.y.toFixed(6)} ${n.z.toFixed(6)}\n`;
      }
    }
    if (idxAttr) {
      for (let i = 0; i < idxAttr.count; i += 3) {
        const a = idxAttr.getX(i) + 1, b = idxAttr.getX(i + 1) + 1, c = idxAttr.getX(i + 2) + 1;
        out += normAttr ? `f ${a}//${a} ${b}//${b} ${c}//${c}\n` : `f ${a} ${b} ${c}\n`;
      }
    }
    return out;
  }

  exportGLTF(mesh: THREE.Mesh, name: string): ArrayBuffer {
    const geo = mesh.geometry as THREE.BufferGeometry;
    const posAttr = geo.getAttribute('position');
    const normAttr = geo.getAttribute('normal');
    const idxAttr = geo.getIndex();

    const positions = new Float32Array(posAttr.array);
    const normals = normAttr ? new Float32Array(normAttr.array) : new Float32Array(posAttr.count * 3);
    const indices = idxAttr
      ? (idxAttr.count > 65535 ? new Uint32Array(idxAttr.array) : new Uint16Array(idxAttr.array))
      : new Uint16Array(posAttr.count);

    const posBytes = positions.byteLength;
    const normBytes = normals.byteLength;
    const idxBytes = indices.byteLength;
    const total = posBytes + normBytes + idxBytes;

    const buf = new ArrayBuffer(12 + total);
    const view = new DataView(buf);
    const u8 = new Uint8Array(buf);

    view.setUint32(0, 0x46546C67, true);
    view.setUint32(4, 2, true);
    view.setUint32(8, 12 + total, true);

    let offset = 12;
    view.setUint32(offset, posBytes, true); offset += 4;
    view.setUint32(offset, 0, true); offset += 4;
    view.setUint32(offset, 0, true); offset += 4;
    u8.set(new Uint8Array(positions.buffer, positions.byteOffset, posBytes), offset); offset += posBytes;

    view.setUint32(offset, normBytes, true); offset += 4;
    view.setUint32(offset, 0, true); offset += 4;
    view.setUint32(offset, 1, true); offset += 4;
    u8.set(new Uint8Array(normals.buffer, normals.byteOffset, normBytes), offset); offset += normBytes;

    view.setUint32(offset, idxBytes, true); offset += 4;
    view.setUint32(offset, 2, true); offset += 4;
    view.setUint32(offset, 0, true); offset += 4;
    u8.set(new Uint8Array(indices.buffer, indices.byteOffset, idxBytes), offset);

    return buf;
  }

  hasUndo() { return this.redoStack.length > 0; }
  hasRedo() { return this.redoStack.length > 1; }
}
