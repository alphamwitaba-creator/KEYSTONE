// ============================================================
// KEVLA ENGINE — Voxel Sculpting System v3.0
// SDF-based voxel sculpting with Marching Cubes remeshing
// ============================================================

import * as THREE from 'three';
import type { VoxelConfig } from './types';

const MARCHING_CUBES_TABLE: number[][] = [
  [], [[0,8,3]], [[0,1,9]], [[1,8,3],[9,8,1]], [[1,2,10]], [[0,8,3],[1,2,10]],
  [[9,2,10],[0,2,9]], [[2,8,3],[2,10,8],[10,9,8]], [[3,11,2]], [[0,11,2],[8,11,0]],
  [[1,9,0],[2,3,11]], [[1,11,2],[1,9,11],[9,8,11]], [[3,10,1],[11,10,3]],
  [[0,10,1],[0,8,10],[8,11,10]], [[3,9,0],[3,11,9],[11,10,9]], [[9,8,10],[10,8,11]],
  [[4,7,8]], [[4,3,0],[7,3,4]], [[0,1,9],[4,7,8]], [[1,9,4],[1,4,7],[1,7,3],[9,4,7]],
  [[4,7,8],[1,2,10]], [[4,7,8],[1,2,10],[0,8,3]], [[4,7,8],[0,2,9],[2,10,9]],
  [[2,10,9],[2,9,7],[2,7,3],[7,9,4]], [[3,11,2],[4,7,8]], [[4,7,8],[0,11,2],[8,11,0]],
  [[0,1,9],[2,3,11],[4,7,8]], [[1,9,4],[1,4,7],[1,7,3],[9,4,7],[2,3,11]],
  [[4,7,8],[3,10,1],[11,10,3]], [[10,1,0],[10,0,8],[10,8,11],[0,8,4]],
  [[4,7,8],[3,9,0],[3,11,9],[11,10,9]], [[10,9,4],[11,10,4],[4,7,11]],
  [[4,9,5],[7,9,4]], [[0,8,3],[4,9,5],[7,9,4]], [[5,0,1],[5,1,4],[1,0,4],[4,0,8]],
  [[5,1,4],[1,9,4],[9,8,4]], [[2,10,5],[4,9,5],[7,9,4]],
  [[0,8,3],[2,10,5],[4,9,5],[7,9,4]], [[10,5,2],[0,2,9],[2,10,9],[9,5,4]],
  [[2,10,5],[2,5,3],[3,5,4],[5,9,4]], [[3,11,2],[4,9,5],[7,9,4]],
  [[0,11,2],[8,11,0],[4,9,5],[7,9,4]], [[0,1,9],[2,3,11],[4,9,5],[7,9,4]],
  [[5,1,4],[1,9,4],[9,8,4],[2,3,11]], [[3,10,1],[11,10,3],[4,9,5],[7,9,4]],
  [[10,1,0],[10,0,8],[10,8,11],[0,8,4],[4,9,5],[7,9,4]],
  [[3,9,0],[3,11,9],[11,10,9],[4,9,5],[7,9,4]],
  [[10,9,4],[11,10,4],[4,7,11]],
  [[7,8,4],[6,7,8]], [[0,8,3],[6,7,8]], [[0,1,9],[6,7,8]],
  [[1,9,4],[1,4,7],[1,7,3],[9,4,7],[6,7,8]], [[6,7,8],[1,2,10]],
  [[6,7,8],[0,8,3],[1,2,10]], [[6,7,8],[0,2,9],[2,10,9]],
  [[2,10,9],[2,9,7],[2,7,3],[7,9,4],[6,7,8]], [[3,11,2],[6,7,8]],
  [[0,11,2],[8,11,0],[6,7,8]], [[0,1,9],[2,3,11],[6,7,8]],
  [[1,9,4],[1,4,7],[1,7,3],[9,4,7],[2,3,11],[6,7,8]],
  [[6,7,8],[3,10,1],[11,10,3]], [[10,1,0],[10,0,8],[10,8,11],[0,8,4],[6,7,8]],
  [[6,7,8],[3,9,0],[3,11,9],[11,10,9]], [[6,7,8],[10,9,4],[11,10,4],[4,7,11]],
  [[6,7,8],[4,9,5]], [[0,8,3],[4,9,5],[6,7,8]], [[5,0,1],[5,1,4],[1,0,4],[4,0,8],[6,7,8]],
  [[5,1,4],[1,9,4],[9,8,4],[6,7,8]], [[2,10,5],[4,9,5],[7,9,4],[6,7,8]],
  [[0,8,3],[2,10,5],[4,9,5],[7,9,4],[6,7,8]], [[10,5,2],[0,2,9],[2,10,9],[9,5,4],[6,7,8]],
  [[2,10,5],[2,5,3],[3,5,4],[5,9,4],[6,7,8]], [[3,11,2],[4,9,5],[7,9,4],[6,7,8]],
  [[0,11,2],[8,11,0],[4,9,5],[7,9,4],[6,7,8]],
  [[0,1,9],[2,3,11],[4,9,5],[7,9,4],[6,7,8]],
  [[5,1,4],[1,9,4],[9,8,4],[2,3,11],[6,7,8]],
  [[3,10,1],[11,10,3],[4,9,5],[7,9,4],[6,7,8]],
  [[10,1,0],[10,0,8],[10,8,11],[0,8,4],[4,9,5],[7,9,4],[6,7,8]],
  [[3,9,0],[3,11,9],[11,10,9],[4,9,5],[7,9,4],[6,7,8]],
  [[6,7,8],[10,9,4],[11,10,4],[4,7,11]],
  [[6,8,7],[6,5,8],[5,4,8]], [[6,8,7],[0,8,3],[6,5,8],[5,0,8]],
  [[6,8,7],[0,1,9],[6,5,8],[5,0,8]], [[6,8,7],[1,9,4],[1,4,7],[1,7,3],[9,4,7],[6,5,8],[5,0,8]],
  [[6,8,7],[1,2,10],[6,5,8],[5,0,8]], [[6,8,7],[0,8,3],[1,2,10],[6,5,8],[5,0,8]],
  [[6,8,7],[0,2,9],[2,10,9],[6,5,8],[5,0,8]], [[2,10,9],[2,9,7],[2,7,3],[7,9,4],[6,8,7],[6,5,8],[5,0,8]],
  [[6,8,7],[3,11,2]], [[6,8,7],[0,11,2],[8,11,0]], [[6,8,7],[0,1,9],[2,3,11]],
  [[6,8,7],[1,9,4],[1,4,7],[1,7,3],[9,4,7],[2,3,11]],
  [[6,8,7],[3,10,1],[11,10,3]], [[6,8,7],[10,1,0],[10,0,8],[10,8,11],[0,8,4]],
  [[6,8,7],[3,9,0],[3,11,9],[11,10,9]], [[6,8,7],[10,9,4],[11,10,4],[4,7,11]],
  [[6,8,7],[4,9,5]], [[0,8,3],[4,9,5],[6,8,7]], [[5,0,1],[5,1,4],[1,0,4],[4,0,8],[6,8,7]],
  [[5,1,4],[1,9,4],[9,8,4],[6,8,7]], [[2,10,5],[4,9,5],[7,9,4],[6,8,7]],
  [[0,8,3],[2,10,5],[4,9,5],[7,9,4],[6,8,7]], [[10,5,2],[0,2,9],[2,10,9],[9,5,4],[6,8,7]],
  [[2,10,5],[2,5,3],[3,5,4],[5,9,4],[6,8,7]], [[3,11,2],[4,9,5],[7,9,4],[6,8,7]],
  [[0,11,2],[8,11,0],[4,9,5],[7,9,4],[6,8,7]],
  [[0,1,9],[2,3,11],[4,9,5],[7,9,4],[6,8,7]],
  [[5,1,4],[1,9,4],[9,8,4],[2,3,11],[6,8,7]],
  [[3,10,1],[11,10,3],[4,9,5],[7,9,4],[6,8,7]],
  [[10,1,0],[10,0,8],[10,8,11],[0,8,4],[4,9,5],[7,9,4],[6,8,7]],
  [[3,9,0],[3,11,9],[11,10,9],[4,9,5],[7,9,4],[6,8,7]],
  [[6,8,7],[10,9,4],[11,10,4],[4,7,11]],
  [[5,6,7],[5,7,4]], [[5,6,7],[0,8,3],[5,7,4],[4,7,3]],
  [[5,6,7],[0,1,9],[5,7,4],[4,7,3]], [[5,6,7],[1,9,4],[1,4,7],[1,7,3],[9,4,7],[5,7,4]],
  [[5,6,7],[1,2,10],[5,7,4],[4,7,3]], [[5,6,7],[0,8,3],[1,2,10],[5,7,4],[4,7,3]],
  [[5,6,7],[0,2,9],[2,10,9],[5,7,4],[4,7,3]], [[2,10,9],[2,9,7],[2,7,3],[7,9,4],[5,6,7],[5,7,4]],
  [[5,6,7],[3,11,2]], [[5,6,7],[0,11,2],[8,11,0],[5,7,4],[4,7,3]],
  [[5,6,7],[0,1,9],[2,3,11],[5,7,4],[4,7,3]],
  [[5,6,7],[1,9,4],[1,4,7],[1,7,3],[9,4,7],[2,3,11],[5,7,4]],
  [[5,6,7],[3,10,1],[11,10,3],[5,7,4],[4,7,3]],
  [[5,6,7],[10,1,0],[10,0,8],[10,8,11],[0,8,4],[5,7,4],[4,7,3]],
  [[5,6,7],[3,9,0],[3,11,9],[11,10,9],[5,7,4],[4,7,3]],
  [[5,6,7],[10,9,4],[11,10,4],[4,7,11]],
  [[5,6,7],[4,9,5]], [[0,8,3],[4,9,5],[5,6,7]], [[5,0,1],[5,1,4],[1,0,4],[4,0,8],[5,6,7]],
  [[5,1,4],[1,9,4],[9,8,4],[5,6,7]], [[2,10,5],[4,9,5],[7,9,4],[5,6,7]],
  [[0,8,3],[2,10,5],[4,9,5],[7,9,4],[5,6,7]], [[10,5,2],[0,2,9],[2,10,9],[9,5,4],[5,6,7]],
  [[2,10,5],[2,5,3],[3,5,4],[5,9,4],[5,6,7]], [[3,11,2],[4,9,5],[7,9,4],[5,6,7]],
  [[0,11,2],[8,11,0],[4,9,5],[7,9,4],[5,6,7]],
  [[0,1,9],[2,3,11],[4,9,5],[7,9,4],[5,6,7]],
  [[5,1,4],[1,9,4],[9,8,4],[2,3,11],[5,6,7]],
  [[3,10,1],[11,10,3],[4,9,5],[7,9,4],[5,6,7]],
  [[10,1,0],[10,0,8],[10,8,11],[0,8,4],[4,9,5],[7,9,4],[5,6,7]],
  [[3,9,0],[3,11,9],[11,10,9],[4,9,5],[7,9,4],[5,6,7]],
  [[5,6,7],[10,9,4],[11,10,4],[4,7,11]],
  [[5,6,7],[6,8,7],[6,5,8],[5,4,8]], [[5,6,7],[0,8,3],[6,8,7],[6,5,8],[5,0,8]],
  [[5,6,7],[0,1,9],[6,8,7],[6,5,8],[5,0,8]],
  [[5,6,7],[1,9,4],[1,4,7],[1,7,3],[9,4,7],[6,8,7],[6,5,8],[5,0,8]],
  [[5,6,7],[1,2,10],[6,8,7],[6,5,8],[5,0,8]],
  [[5,6,7],[0,8,3],[1,2,10],[6,8,7],[6,5,8],[5,0,8]],
  [[5,6,7],[0,2,9],[2,10,9],[6,8,7],[6,5,8],[5,0,8]],
  [[2,10,9],[2,9,7],[2,7,3],[7,9,4],[5,6,7],[6,8,7],[6,5,8],[5,0,8]],
  [[5,6,7],[3,11,2]], [[5,6,7],[0,11,2],[8,11,0],[6,8,7],[6,5,8],[5,0,8]],
  [[5,6,7],[0,1,9],[2,3,11],[6,8,7],[6,5,8],[5,0,8]],
  [[5,6,7],[1,9,4],[1,4,7],[1,7,3],[9,4,7],[2,3,11],[6,8,7],[6,5,8],[5,0,8]],
  [[5,6,7],[3,10,1],[11,10,3],[6,8,7],[6,5,8],[5,0,8]],
  [[5,6,7],[10,1,0],[10,0,8],[10,8,11],[0,8,4],[6,8,7],[6,5,8],[5,0,8]],
  [[5,6,7],[3,9,0],[3,11,9],[11,10,9],[6,8,7],[6,5,8],[5,0,8]],
  [[5,6,7],[10,9,4],[11,10,4],[4,7,11],[6,8,7]],
];

const EDGE_TABLE: [number, number][] = [
  [0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],
  [0,4],[1,5],[2,6],[3,7],
];

export class VoxelSystem {
  private config: VoxelConfig;
  private gridSize: number;
  private voxelSize: number;
  private sdfData: Float32Array | null = null;
  private origin: THREE.Vector3 = new THREE.Vector3();

  constructor(config: VoxelConfig) {
    this.config = { ...config };
    this.gridSize = config.gridSize;
    this.voxelSize = config.voxelSize;
  }

  setConfig(config: Partial<VoxelConfig>) {
    this.config = { ...this.config, ...config };
    this.gridSize = config.gridSize ?? this.gridSize;
    this.voxelSize = config.voxelSize ?? this.voxelSize;
    if (config.gridSize) this.initGrid();
  }

  initGrid() {
    const total = this.gridSize * this.gridSize * this.gridSize;
    this.sdfData = new Float32Array(total).fill(1.0);
  }

  getVoxelIndex(x: number, y: number, z: number): number {
    return x + y * this.gridSize + z * this.gridSize * this.gridSize;
  }

  worldToGrid(worldPos: THREE.Vector3): [number, number, number] {
    const gx = Math.floor((worldPos.x - this.origin.x) / this.voxelSize);
    const gy = Math.floor((worldPos.y - this.origin.y) / this.voxelSize);
    const gz = Math.floor((worldPos.z - this.origin.z) / this.voxelSize);
    return [gx, gy, gz];
  }

  gridToWorld(gx: number, gy: number, gz: number): THREE.Vector3 {
    return new THREE.Vector3(
      this.origin.x + gx * this.voxelSize,
      this.origin.y + gy * this.voxelSize,
      this.origin.z + gz * this.voxelSize,
    );
  }

  getSDF(gx: number, gy: number, gz: number): number {
    if (gx < 0 || gx >= this.gridSize || gy < 0 || gy >= this.gridSize || gz < 0 || gz >= this.gridSize) return 1.0;
    return this.sdfData![this.getVoxelIndex(gx, gy, gz)];
  }

  setSDF(gx: number, gy: number, gz: number, value: number) {
    if (gx < 0 || gx >= this.gridSize || gy < 0 || gy >= this.gridSize || gz < 0 || gz >= this.gridSize) return;
    this.sdfData![this.getVoxelIndex(gx, gy, gz)] = value;
  }

  addSphere(center: THREE.Vector3, radius: number) {
    if (!this.sdfData) this.initGrid();
    const [cx, cy, cz] = this.worldToGrid(center);
    const gr = Math.ceil(radius / this.voxelSize);

    for (let x = cx - gr; x <= cx + gr; x++) {
      for (let y = cy - gr; y <= cy + gr; y++) {
        for (let z = cz - gr; z <= cz + gr; z++) {
          const world = this.gridToWorld(x, y, z);
          const dist = world.distanceTo(center);
          const sdf = dist - radius;
          const idx = this.getVoxelIndex(x, y, z);
          if (idx >= 0 && idx < this.sdfData!.length) {
            this.sdfData![idx] = Math.min(this.sdfData![idx], sdf);
          }
        }
      }
    }
  }

  subtractSphere(center: THREE.Vector3, radius: number) {
    if (!this.sdfData) this.initGrid();
    const [cx, cy, cz] = this.worldToGrid(center);
    const gr = Math.ceil(radius / this.voxelSize);

    for (let x = cx - gr; x <= cx + gr; x++) {
      for (let y = cy - gr; y <= cy + gr; y++) {
        for (let z = cz - gr; z <= cz + gr; z++) {
          const world = this.gridToWorld(x, y, z);
          const dist = world.distanceTo(center);
          const sdf = -(dist - radius);
          const idx = this.getVoxelIndex(x, y, z);
          if (idx >= 0 && idx < this.sdfData!.length) {
            this.sdfData![idx] = Math.max(this.sdfData![idx], sdf);
          }
        }
      }
    }
  }

  smoothSDF(passes: number) {
    if (!this.sdfData) return;
    const temp = new Float32Array(this.sdfData.length);

    for (let p = 0; p < passes; p++) {
      for (let x = 1; x < this.gridSize - 1; x++) {
        for (let y = 1; y < this.gridSize - 1; y++) {
          for (let z = 1; z < this.gridSize - 1; z++) {
            const idx = this.getVoxelIndex(x, y, z);
            let sum = this.sdfData[idx] * 6;
            sum += this.sdfData[this.getVoxelIndex(x - 1, y, z)];
            sum += this.sdfData[this.getVoxelIndex(x + 1, y, z)];
            sum += this.sdfData[this.getVoxelIndex(x, y - 1, z)];
            sum += this.sdfData[this.getVoxelIndex(x, y + 1, z)];
            sum += this.sdfData[this.getVoxelIndex(x, y, z - 1)];
            sum += this.sdfData[this.getVoxelIndex(x, y, z + 1)];
            temp[idx] = sum / 12;
          }
        }
      }
      this.sdfData.set(temp);
    }
  }

  meshToVoxel(mesh: THREE.Mesh) {
    if (!this.sdfData) this.initGrid();
    const geo = mesh.geometry;
    const posAttr = geo.getAttribute('position');
    const idxAttr = geo.getIndex();
    const worldMatrix = mesh.matrixWorld;

    const tri = new THREE.Triangle();
    for (let i = 0; i < (idxAttr ? idxAttr.count : posAttr.count); i += 3) {
      const a = idxAttr ? idxAttr.getX(i) : i;
      const b = idxAttr ? idxAttr.getX(i + 1) : i + 1;
      const c = idxAttr ? idxAttr.getX(i + 2) : i + 2;

      const va = new THREE.Vector3().fromBufferAttribute(posAttr, a).applyMatrix4(worldMatrix);
      const vb = new THREE.Vector3().fromBufferAttribute(posAttr, b).applyMatrix4(worldMatrix);
      const vc = new THREE.Vector3().fromBufferAttribute(posAttr, c).applyMatrix4(worldMatrix);

      tri.set(va, vb, vc);
      const box = new THREE.Box3().setFromPoints([va, vb, vc]);
      const minG = this.worldToGrid(box.min);
      const maxG = this.worldToGrid(box.max);

      for (let x = Math.max(0, minG[0] - 1); x <= Math.min(this.gridSize - 1, maxG[0] + 1); x++) {
        for (let y = Math.max(0, minG[1] - 1); y <= Math.min(this.gridSize - 1, maxG[1] + 1); y++) {
          for (let z = Math.max(0, minG[2] - 1); z <= Math.min(this.gridSize - 1, maxG[2] + 1); z++) {
            const world = this.gridToWorld(x, y, z);
            const dist = tri.closestPointToPoint(world, new THREE.Vector3()).distanceTo(world);
            const idx = this.getVoxelIndex(x, y, z);
            if (idx >= 0 && idx < this.sdfData!.length) {
              this.sdfData![idx] = Math.min(this.sdfData![idx], dist);
            }
          }
        }
      }
    }
  }

  marchingCubes(): { positions: Float32Array; normals: Float32Array; indices: number[] } {
    if (!this.sdfData) return { positions: new Float32Array(0), normals: new Float32Array(0), indices: [] };

    const positions: number[] = [];
    const normals: number[] = [];
    const indices: number[] = [];
    const edgeCache = new Map<string, number>();
    const isoValue = this.config.marchingCubesIsoValue;

    const getEdgeVertex = (x: number, y: number, z: number, edge: number): number => {
      const key = `${x},${y},${z},${edge}`;
      if (edgeCache.has(key)) return edgeCache.get(key)!;

      const [a, b] = EDGE_TABLE[edge];
      const ax = x + (a & 1), ay = y + ((a >> 1) & 1), az = z + ((a >> 2) & 1);
      const bx = x + (b & 1), by = y + ((b >> 1) & 1), bz = z + ((b >> 2) & 1);

      const sa = this.getSDF(ax, ay, az) - isoValue;
      const sb = this.getSDF(bx, by, bz) - isoValue;
      const t = sa / (sa - sb);

      const vx = this.gridToWorld(ax + t * (bx - ax), ay + t * (by - ay), az + t * (bz - az));
      const idx = positions.length / 3;
      positions.push(vx.x, vx.y, vx.z);

      const eps = 0.01;
      const d = this.getSDF(x, y, z) - isoValue;
      const dx = (this.getSDF(x + 1, y, z) - this.getSDF(x - 1, y, z)) * 0.5;
      const dy = (this.getSDF(x, y + 1, z) - this.getSDF(x, y - 1, z)) * 0.5;
      const dz = (this.getSDF(x, y, z + 1) - this.getSDF(x, y, z - 1)) * 0.5;
      const len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
      normals.push(dx / len, dy / len, dz / len);

      edgeCache.set(key, idx);
      return idx;
    };

    for (let x = 0; x < this.gridSize - 1; x++) {
      for (let y = 0; y < this.gridSize - 1; y++) {
        for (let z = 0; z < this.gridSize - 1; z++) {
          let cubeIndex = 0;
          if (this.getSDF(x, y, z) < isoValue) cubeIndex |= 1;
          if (this.getSDF(x + 1, y, z) < isoValue) cubeIndex |= 2;
          if (this.getSDF(x + 1, y + 1, z) < isoValue) cubeIndex |= 4;
          if (this.getSDF(x, y + 1, z) < isoValue) cubeIndex |= 8;
          if (this.getSDF(x, y, z + 1) < isoValue) cubeIndex |= 16;
          if (this.getSDF(x + 1, y, z + 1) < isoValue) cubeIndex |= 32;
          if (this.getSDF(x + 1, y + 1, z + 1) < isoValue) cubeIndex |= 64;
          if (this.getSDF(x, y + 1, z + 1) < isoValue) cubeIndex |= 128;

          const triList = MARCHING_CUBES_TABLE[cubeIndex];
          if (triList.length === 0) continue;

          for (const tri of triList) {
            for (const edge of tri) {
              const vi = getEdgeVertex(x, y, z, edge);
              indices.push(vi);
            }
          }
        }
      }
    }

    return {
      positions: new Float32Array(positions),
      normals: new Float32Array(normals),
      indices,
    };
  }

  toMesh(): THREE.Mesh {
    const { positions, normals, indices } = this.marchingCubes();
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({ color: '#888888', roughness: 0.7, metalness: 0.1 });
    return new THREE.Mesh(geo, mat);
  }
}
