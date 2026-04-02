// ============================================================
// KEVLA ENGINE — Sculpting System v2.0
// Real-time mesh deformation with brush-based tools
// ============================================================

import * as THREE from 'three';
import { type BrushType, type BrushFalloff, type SculptPoint, type SculptStroke, type SculptBrush, type SculptConfig, DEFAULT_SCULPT_BRUSH } from './types';

interface VertexData { position: THREE.Vector3; normal: THREE.Vector3; originalPos: THREE.Vector3; }
type StrokeSnapshot = Map<string, Float32Array>;

export class SculptSystem {
  private strokes: SculptStroke[] = [];
  private redoStack: SculptStroke[] = [];
  private vertexDataCache = new Map<string, VertexData[]>();
  private activeStroke: { entityId: string; brush: SculptBrush; startPos: THREE.Vector3; lastPos: THREE.Vector3; snapshots: StrokeSnapshot[] } | null = null;
  private config: SculptConfig;

  constructor(config: SculptConfig) { this.config = config; }

  setConfig(config: Partial<SculptConfig>) { this.config = { ...this.config, ...config }; }
  getConfig() { return this.config; }

  beginStroke(entityId: string, brush: SculptBrush, hitPoint: THREE.Vector3) {
    this.activeStroke = { entityId, brush, startPos: hitPoint.clone(), lastPos: hitPoint.clone(), snapshots: [] };
    this.redoStack = [];
    this.saveSnapshot(entityId);
  }

  private saveSnapshot(entityId: string) {
    if (!this.activeStroke) return;
    const positions = this.vertexDataCache.get(entityId);
    if (!positions) return;
    const snap = new Float32Array(positions.length * 3);
    positions.forEach((v, i) => { snap[i*3]=v.position.x; snap[i*3+1]=v.position.y; snap[i*3+2]=v.position.z; });
    this.activeStroke.snapshots.push(new Map([[entityId, snap]]));
  }

  applyBrushStroke(entityId: string, brush: SculptBrush, hitPoint: THREE.Vector3, hitNormal: THREE.Vector3, raycaster: THREE.Raycaster, camera: THREE.Camera, mesh: THREE.Mesh) {
    if (!this.activeStroke || this.activeStroke.entityId !== entityId) return;
    const radius = brush.size;
    const strength = brush.strength;
    const delta = new THREE.Vector3().subVectors(hitPoint, this.activeStroke.lastPos);
    const drag = delta.length();
    if (drag < 0.001) return;

    const vData = this.vertexDataCache.get(entityId);
    if (!vData) return;

    const deltaDir = delta.clone().normalize();
    this.activeStroke.lastPos = hitPoint.clone();

    vData.forEach(v => {
      const dist = v.position.distanceTo(hitPoint);
      if (dist > radius) return;
      const falloff = this.getFalloff(dist / radius, brush.falloff);
      const influence = falloff * strength;

      switch (brush.type) {
        case 'grab': {
          const grabDir = delta.clone().normalize();
          v.position.addScaledVector(grabDir, influence * drag);
          break;
        }
        case 'smooth': {
          const avg = new THREE.Vector3();
          let count = 0;
          vData.forEach(other => {
            if (other.position.distanceTo(v.position) < radius * 0.5) { avg.add(other.position); count++; }
          });
          if (count > 0) { avg.divideScalar(count); v.position.lerp(avg, influence * 0.5); }
          break;
        }
        case 'crease': {
          const creaseDir = v.normal.clone().cross(deltaDir).normalize();
          v.position.addScaledVector(creaseDir, influence * 0.02);
          break;
        }
        case 'flatten': {
          const flatN = new THREE.Vector3(hitNormal.x, hitNormal.y, hitNormal.z).normalize();
          const proj = v.position.clone().sub(hitPoint);
          const d = proj.dot(flatN);
          const target = v.position.clone().sub(flatN.clone().multiplyScalar(d));
          v.position.lerp(target, influence * 0.5);
          break;
        }
        case 'bulge': {
          v.position.addScaledVector(v.normal, influence * 0.05);
          break;
        }
        case 'pinch': {
          v.position.addScaledVector(v.normal, -influence * 0.05);
          break;
        }
        case 'inflate': {
          const toCenter = new THREE.Vector3().subVectors(new THREE.Vector3(), v.position).normalize();
          v.position.addScaledVector(toCenter, -influence * 0.03);
          break;
        }
        case 'draw': {
          v.position.addScaledVector(hitNormal, influence * 0.05);
          break;
        }
        case 'layer': {
          const dot = v.position.clone().sub(hitPoint).normalize().dot(hitNormal);
          if (dot > 0.3) v.position.addScaledVector(hitNormal, influence * 0.03);
          break;
        }
        case 'scrape': {
          const flatN = new THREE.Vector3(hitNormal.x, hitNormal.y, hitNormal.z).normalize();
          const proj = v.position.clone().sub(hitPoint);
          const d = proj.dot(flatN);
          const target = v.position.clone().sub(flatN.clone().multiplyScalar(d));
          if (Math.abs(d) < radius * 0.3) v.position.lerp(target, influence * 0.8);
          break;
        }
      }
    });

    this.recalculateNormals(entityId, mesh);
  }

  endStroke(entityId: string) {
    if (!this.activeStroke || this.activeStroke.entityId !== entityId) return;
    const stroke: SculptStroke = {
      entityId,
      brush: { ...this.activeStroke.brush },
      points: [],
      timestamp: Date.now(),
    };
    this.strokes.push(stroke);
    this.activeStroke = null;
  }

  undo(entityId: string, mesh: THREE.Mesh) {
    if (this.strokes.length === 0) return;
    const stroke = this.strokes.pop()!;
    this.redoStack.push(stroke);
    const positions = this.vertexDataCache.get(entityId);
    if (!positions) return;
    const geo = mesh.geometry as THREE.BufferGeometry;
    const posAttr = geo.getAttribute('position') as THREE.BufferAttribute;
    positions.forEach((v, i) => { posAttr.setXYZ(i, v.originalPos.x, v.originalPos.y, v.originalPos.z); });
    posAttr.needsUpdate = true;
    geo.computeVertexNormals();
  }

  redo(entityId: string, mesh: THREE.Mesh) {
    if (this.redoStack.length === 0) return;
    const stroke = this.redoStack.pop()!;
    this.strokes.push(stroke);
    const positions = this.vertexDataCache.get(entityId);
    if (!positions) return;
    const geo = mesh.geometry as THREE.BufferAttribute;
    positions.forEach((v, i) => { geo.setXYZ(i, v.position.x, v.position.y, v.position.z); });
    (geo as THREE.BufferAttribute).needsUpdate = true;
  }

  cacheMesh(entityId: string, mesh: THREE.Mesh) {
    const geo = mesh.geometry as THREE.BufferGeometry;
    const posAttr = geo.getAttribute('position');
    const normAttr = geo.getAttribute('normal');
    const vData: VertexData[] = [];
    for (let i = 0; i < posAttr.count; i++) {
      const p = new THREE.Vector3().fromBufferAttribute(posAttr, i);
      const n = normAttr ? new THREE.Vector3().fromBufferAttribute(normAttr, i) : new THREE.Vector3(0, 1, 0);
      vData.push({ position: p.clone(), normal: n.clone(), originalPos: p.clone() });
    }
    this.vertexDataCache.set(entityId, vData);
  }

  invalidateCache(entityId: string) { this.vertexDataCache.delete(entityId); }

  private getFalloff(t: number, falloff: BrushFalloff): number {
    if (t >= 1) return 0;
    switch (falloff) {
      case 'smooth': return Math.pow(1 - t, 2);
      case 'sharp': return t < 0.5 ? 1 : Math.pow(1 - (t - 0.5) * 2, 2);
      case 'needle': return t < 0.2 ? 1 : Math.pow(1 - (t - 0.2) / 0.8, 3);
      default: return Math.pow(1 - t, 2);
    }
  }

  private recalculateNormals(entityId: string, mesh: THREE.Mesh) {
    const geo = mesh.geometry as THREE.BufferGeometry;
    const posAttr = geo.getAttribute('position');
    const vData = this.vertexDataCache.get(entityId);
    if (!vData) return;

    const adjMap = new Map<number, Set<number>>();
    const index = geo.getIndex();
    if (index) {
      for (let i = 0; i < index.count; i += 3) {
        const a = index.getX(i), b = index.getX(i+1), c = index.getX(i+2);
        [[a,b],[b,c],[a,c]].forEach(([i,j]) => {
          if (!adjMap.has(i)) adjMap.set(i, new Set());
          if (!adjMap.has(j)) adjMap.set(j, new Set());
          adjMap.get(i)!.add(j);
          adjMap.get(j)!.add(i);
        });
    }

    const pos = [];
    for (let i = 0; i < posAttr.count; i++) pos.push(new THREE.Vector3().fromBufferAttribute(posAttr, i));

    vData.forEach((v, i) => {
      const n = new THREE.Vector3();
      if (index) {
        for (let j = 0; j < index.count; j += 3) {
          const a = index.getX(j), b = index.getX(j+1), c = index.getX(j+2);
          if (a === i || b === i || c === i) {
            const pa = pos[a], pb = pos[b], pc = pos[c];
            const e1 = new THREE.Vector3().subVectors(pb, pa);
            const e2 = new THREE.Vector3().subVectors(pc, pa);
            n.add(e1.cross(e2));
          }
        }
        n.normalize();
      } else {
        const neighbors = adjMap.get(i);
        if (neighbors && neighbors.size > 0) {
          const p = pos[i];
          neighbors.forEach(j => {
            const np = pos[j];
            const e = new THREE.Vector3().subVectors(np, p);
            const avg = new THREE.Vector3();
            neighbors.forEach(k => { if (k !== j) avg.add(new THREE.Vector3().subVectors(pos[k], np)); });
            n.add(e.cross(avg).normalize());
          });
          n.normalize();
        }
      }
      v.normal.copy(n);
      v.position.fromBufferAttribute(posAttr, i);
    });

    geo.computeVertexNormals();
  }

  subdivideMesh(entityId: string, mesh: THREE.Mesh): THREE.Mesh {
    const geo = mesh.geometry as THREE.BufferGeometry;
    const subdivCount = this.config.subdivisionLevel;
    let result = geo;
    for (let s = 0; s < subdivCount; s++) {
      result = new THREE.BufferGeometry();
      const srcPos = (geo.getAttribute('position') as THREE.BufferAttribute).array;
      const srcNorm = geo.getAttribute('normal') ? (geo.getAttribute('normal') as THREE.BufferAttribute).array : null;
      const srcIdx = geo.getIndex() ? (geo.getIndex() as THREE.BufferAttribute).array : null;

      const srcVerts = srcPos.length / 3;
      const newPositions: number[] = [];
      const newNormals: number[] = [];
      const midpointCache = new Map<string, number>();

      const addMidpoint = (i: number, j: number) => {
        const key = Math.min(i,j) + '_' + Math.max(i,j);
        if (midpointCache.has(key)) return midpointCache.get(key)!;
        const mi = newPositions.length / 3;
        newPositions.push((srcPos[i*3]+srcPos[j*3])*0.5, (srcPos[i*3+1]+srcPos[j*3+1])*0.5, (srcPos[i*3+2]+srcPos[j*3+2])*0.5);
        if (srcNorm) newNormals.push((srcNorm[i*3]+srcNorm[j*3])*0.5, (srcNorm[i*3+1]+srcNorm[j*3+1])*0.5, (srcNorm[i*3+2]+srcNorm[j*3+2])*0.5);
        midpointCache.set(key, mi);
        return mi;
      };

      const addVertex = (i: number) => {
        newPositions.push(srcPos[i*3], srcPos[i*3+1], srcPos[i*3+2]);
        if (srcNorm) newNormals.push(srcNorm[i*3], srcNorm[i*3+1], srcNorm[i*3+2]);
      };

      if (srcIdx) {
        for (let t = 0; t < srcIdx.length; t += 3) {
          const a = srcIdx[t], b = srcIdx[t+1], c = srcIdx[t+2];
          const ab = addMidpoint(a, b), bc = addMidpoint(b, c), ac = addMidpoint(a, c);
          [a,ab,ac, ab,b,bc, ac,bc,c, ab,bc,ac].forEach(vi => {
            addVertex(vi >= srcVerts ? srcIdx[vi - srcVerts] : vi);
          });
        }
      } else {
        for (let v = 0; v < srcVerts; v += 3) {
          const ab = addMidpoint(v, v+1), bc = addMidpoint(v+1, v+2), ac = addMidpoint(v, v+2);
          [v,ab,ac, ab,v+1,bc, ac,bc,v+2, ab,bc,ac].forEach(vi => addVertex(vi));
        }
      }

      result.setAttribute('position', new THREE.BufferAttribute(new Float32Array(newPositions), 3));
      if (newNormals.length > 0) result.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(newNormals), 3));
      result.computeVertexNormals();
      geo = result;
    }

    const newMesh = new THREE.Mesh(result, mesh.material.clone());
    newMesh.position.copy(mesh.position);
    newMesh.rotation.copy(mesh.rotation);
    newMesh.scale.copy(mesh.scale);
    newMesh.castShadow = true; newMesh.receiveShadow = true;
    this.cacheMesh(entityId, newMesh);
    return newMesh;
  }

  exportOBJ(mesh: THREE.Mesh, name: string): string {
    const geo = mesh.geometry as THREE.BufferGeometry;
    const posAttr = geo.getAttribute('position');
    const normAttr = geo.getAttribute('normal');
    const idxAttr = geo.getIndex();
    let out = `# KEVLA Sculpt Export - ${name}\n# Vertices: ${posAttr.count}\n\n`;
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
        const a = idxAttr.getX(i)+1, b = idxAttr.getX(i+1)+1, c = idxAttr.getX(i+2)+1;
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
    const indices = idxAttr ? new Uint16Array(idxAttr.array) : new Uint16Array(posAttr.count);

    const totalVerts = posAttr.count;
    const totalIdx = indices.length;

    const posBytes = positions.byteLength;
    const normBytes = normals.byteLength;
    const idxBytes = indices.byteLength;
    const total = posBytes + normBytes + idxBytes;

    const buf = new ArrayBuffer(12 + total);
    const view = new DataView(buf);
    const u8 = new Uint8Array(buf);

    const HEADER = 12;
    let offset = HEADER;

    view.setUint32(offset, posBytes, true); offset += 4;
    view.setUint32(offset, 0, true); offset += 4;
    view.setUint32(offset, 0, true); offset += 4;
    u8.set(new Uint8Array(positions.buffer, positions.byteOffset, posBytes), offset); offset += posBytes;

    view.setUint32(offset, normBytes, true); offset += 4;
    view.setUint32(offset, 1, true); offset += 4;
    view.setUint32(offset, 0, true); offset += 4;
    u8.set(new Uint8Array(normals.buffer, normals.byteOffset, normBytes), offset); offset += normBytes;

    view.setUint32(offset, idxBytes, true); offset += 4;
    view.setUint32(offset, 2, true); offset += 4;
    view.setUint32(offset, 0, true); offset += 4;
    u8.set(new Uint8Array(indices.buffer, indices.byteOffset, idxBytes), offset);

    return buf;
  }

  resetMesh(entityId: string, mesh: THREE.Mesh) {
    const vData = this.vertexDataCache.get(entityId);
    if (!vData) return;
    const geo = mesh.geometry as THREE.BufferGeometry;
    const posAttr = geo.getAttribute('position') as THREE.BufferAttribute;
    vData.forEach((v, i) => { posAttr.setXYZ(i, v.originalPos.x, v.originalPos.y, v.originalPos.z); });
    posAttr.needsUpdate = true;
    geo.computeVertexNormals();
  }

  hasUndo() { return this.strokes.length > 0; }
  hasRedo() { return this.redoStack.length > 0; }
}
