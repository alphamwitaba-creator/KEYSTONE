// ============================================================
// KEVLA ENGINE — Symmetry System v3.0
// X/Y/Z mirror, radial, and locked-axis symmetry
// ============================================================

import * as THREE from 'three';
import type { SymmetryMode, SymmetryConfig } from './types';

export class SymmetrySystem {
  private config: SymmetryConfig;

  constructor(config: SymmetryConfig) {
    this.config = { ...config };
  }

  setConfig(config: Partial<SymmetryConfig>) {
    this.config = { ...this.config, ...config };
  }

  getConfig() { return this.config; }

  getSymmetricPoints(
    hitPoint: THREE.Vector3,
    hitNormal: THREE.Vector3,
    positions: Float32Array,
    normals: Float32Array,
    radius: number,
  ): { points: number[]; transforms: THREE.Matrix4[] } {
    const transforms = this.getSymmetryTransforms();
    const allPoints: number[] = [];

    for (const transform of transforms) {
      const transformedPoint = hitPoint.clone().applyMatrix4(transform);
      const transformedNormal = hitNormal.clone().transformDirection(transform);

      const rSq = radius * radius;
      for (let i = 0; i < positions.length / 3; i++) {
        const vx = positions[i * 3] - transformedPoint.x;
        const vy = positions[i * 3 + 1] - transformedPoint.y;
        const vz = positions[i * 3 + 2] - transformedPoint.z;
        if (vx * vx + vy * vy + vz * vz <= rSq) {
          allPoints.push(i);
        }
      }
    }

    return { points: [...new Set(allPoints)], transforms };
  }

  getSymmetryTransforms(): THREE.Matrix4[] {
    const transforms: THREE.Matrix4[] = [new THREE.Matrix4()];

    switch (this.config.mode) {
      case 'mirrorX': {
        const m = new THREE.Matrix4().makeScale(-1, 1, 1);
        m.setPosition(new THREE.Vector3(this.config.center.x * 2, 0, 0));
        transforms.push(m);
        break;
      }
      case 'mirrorY': {
        const m = new THREE.Matrix4().makeScale(1, -1, 1);
        m.setPosition(new THREE.Vector3(0, this.config.center.y * 2, 0));
        transforms.push(m);
        break;
      }
      case 'mirrorZ': {
        const m = new THREE.Matrix4().makeScale(1, 1, -1);
        m.setPosition(new THREE.Vector3(0, 0, this.config.center.z * 2));
        transforms.push(m);
        break;
      }
      case 'radial': {
        const count = this.config.radialCount;
        const offset = this.config.radialOffset;
        for (let i = 1; i < count; i++) {
          const angle = (i / count) * Math.PI * 2 + offset;
          const m = new THREE.Matrix4().makeRotationY(angle);
          m.setPosition(new THREE.Vector3(this.config.center.x, this.config.center.y, this.config.center.z));
          transforms.push(m);
        }
        break;
      }
    }

    return transforms;
  }

  applySymmetryToDelta(
    dx: number, dy: number, dz: number,
    transforms: THREE.Matrix4[],
  ): { dx: number; dy: number; dz: number }[] {
    const results: { dx: number; dy: number; dz: number }[] = [];

    for (const transform of transforms) {
      const dir = new THREE.Vector3(dx, dy, dz).transformDirection(transform);
      results.push({ dx: dir.x, dy: dir.y, dz: dir.z });
    }

    return results;
  }
}
