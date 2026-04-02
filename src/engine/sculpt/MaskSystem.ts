// ============================================================
// KEVLA ENGINE — Mask System v3.0
// Vertex masking, lasso/box selection, polygroups
// ============================================================

import * as THREE from 'three';
import type { Polygroup, MaskConfig } from './types';

export class MaskSystem {
  private mask: Float32Array | null = null;
  private polygroups: Map<string, Polygroup> = new Map();
  private config: MaskConfig;

  constructor(config: MaskConfig) {
    this.config = { ...config };
  }

  setConfig(config: Partial<MaskConfig>) {
    this.config = { ...this.config, ...config };
  }

  getConfig() { return this.config; }

  initMask(vertexCount: number) {
    this.mask = new Float32Array(vertexCount);
  }

  getMask() { return this.mask; }

  paintMask(
    positions: Float32Array,
    hitPoint: THREE.Vector3,
    radius: number,
    value: number,
    vertexIndices?: number[],
  ) {
    if (!this.mask) return;

    const rSq = radius * radius;
    const indices = vertexIndices || this.getVerticesInRadius(positions, hitPoint, radius);

    for (const i of indices) {
      const vx = positions[i * 3] - hitPoint.x;
      const vy = positions[i * 3 + 1] - hitPoint.y;
      const vz = positions[i * 3 + 2] - hitPoint.z;
      const distSq = vx * vx + vy * vy + vz * vz;

      if (distSq <= rSq) {
        const falloff = 1 - Math.sqrt(distSq) / radius;
        const influence = falloff * this.config.brushStrength;
        this.mask[i] = this.config.invertMask
          ? Math.max(0, this.mask[i] - influence * value)
          : Math.min(1, this.mask[i] + influence * value);
      }
    }
  }

  blurMask(passes: number) {
    if (!this.mask) return;
    const temp = new Float32Array(this.mask.length);

    for (let p = 0; p < passes; p++) {
      for (let i = 0; i < this.mask.length; i++) {
        let sum = this.mask[i] * 4;
        let count = 4;
        if (i > 0) { sum += this.mask[i - 1]; count++; }
        if (i < this.mask.length - 1) { sum += this.mask[i + 1]; count++; }
        temp[i] = sum / count;
      }
      this.mask.set(temp);
    }
  }

  sharpenMask(passes: number) {
    if (!this.mask) return;
    for (let p = 0; p < passes; p++) {
      for (let i = 0; i < this.mask.length; i++) {
        const center = this.mask[i] * 2;
        let surround = 0, count = 0;
        if (i > 0) { surround += this.mask[i - 1]; count++; }
        if (i < this.mask.length - 1) { surround += this.mask[i + 1]; count++; }
        this.mask[i] = Math.max(0, Math.min(1, center - surround / count));
      }
    }
  }

  invertMask() {
    if (!this.mask) return;
    for (let i = 0; i < this.mask.length; i++) {
      this.mask[i] = 1 - this.mask[i];
    }
  }

  clearMask() {
    if (this.mask) this.mask.fill(0);
  }

  createPolygroup(id: string, name: string, color: string, faceIndices: Set<number>, vertexIndices: Set<number>) {
    this.polygroups.set(id, { id, name, color, faceIndices, vertexIndices });
  }

  getPolygroup(id: string) { return this.polygroups.get(id); }

  getAllPolygroups() { return Array.from(this.polygroups.values()); }

  removePolygroup(id: string) { this.polygroups.delete(id); }

  clearPolygroups() { this.polygroups.clear(); }

  private getVerticesInRadius(positions: Float32Array, center: THREE.Vector3, radius: number): number[] {
    const result: number[] = [];
    const rSq = radius * radius;
    for (let i = 0; i < positions.length / 3; i++) {
      const dx = positions[i * 3] - center.x;
      const dy = positions[i * 3 + 1] - center.y;
      const dz = positions[i * 3 + 2] - center.z;
      if (dx * dx + dy * dy + dz * dz <= rSq) result.push(i);
    }
    return result;
  }
}
