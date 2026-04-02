// ============================================================
// KEVLA ENGINE — BVH Spatial Partitioning v3.0
// Fast vertex queries for sculpt brush radius
// ============================================================

import * as THREE from 'three';

export interface BVHNode {
  min: [number, number, number];
  max: [number, number, number];
  left?: BVHNode;
  right?: BVHNode;
  vertexIndices: number[];
  isLeaf: boolean;
  center: [number, number, number];
  radius: number;
}

export class BVHBuilder {
  private maxLeafSize: number;
  private maxDepth: number;

  constructor(maxLeafSize = 8, maxDepth = 16) {
    this.maxLeafSize = maxLeafSize;
    this.maxDepth = maxDepth;
  }

  build(positions: Float32Array, vertexCount: number): BVHNode {
    const indices = Array.from({ length: vertexCount }, (_, i) => i);
    return this.buildRecursive(positions, indices, 0);
  }

  private buildRecursive(positions: Float32Array, indices: number[], depth: number): BVHNode {
    const node: BVHNode = {
      min: [Infinity, Infinity, Infinity],
      max: [-Infinity, -Infinity, -Infinity],
      vertexIndices: indices,
      isLeaf: true,
      center: [0, 0, 0],
      radius: 0,
    };

    for (const i of indices) {
      const x = positions[i * 3], y = positions[i * 3 + 1], z = positions[i * 3 + 2];
      if (x < node.min[0]) node.min[0] = x; if (x > node.max[0]) node.max[0] = x;
      if (y < node.min[1]) node.min[1] = y; if (y > node.max[1]) node.max[1] = y;
      if (z < node.min[2]) node.min[2] = z; if (z > node.max[2]) node.max[2] = z;
    }

    node.center = [
      (node.min[0] + node.max[0]) * 0.5,
      (node.min[1] + node.max[1]) * 0.5,
      (node.min[2] + node.max[2]) * 0.5,
    ];

    const dx = node.max[0] - node.min[0], dy = node.max[1] - node.min[1], dz = node.max[2] - node.min[2];
    node.radius = Math.sqrt(dx * dx + dy * dy + dz * dz) * 0.5;

    if (indices.length <= this.maxLeafSize || depth >= this.maxDepth) {
      return node;
    }

    const extent = [node.max[0] - node.min[0], node.max[1] - node.min[1], node.max[2] - node.min[2]];
    const splitAxis = extent[0] >= extent[1] && extent[0] >= extent[2] ? 0 : extent[1] >= extent[2] ? 1 : 2;
    const splitPos = node.center[splitAxis];

    const leftIndices: number[] = [], rightIndices: number[] = [];
    for (const i of indices) {
      if (positions[i * 3 + splitAxis] < splitPos) leftIndices.push(i);
      else rightIndices.push(i);
    }

    if (leftIndices.length === 0 || rightIndices.length === 0) {
      return node;
    }

    node.isLeaf = false;
    node.vertexIndices = [];
    node.left = this.buildRecursive(positions, leftIndices, depth + 1);
    node.right = this.buildRecursive(positions, rightIndices, depth + 1);

    return node;
  }

  querySphere(node: BVHNode, center: [number, number, number], radius: number, positions: Float32Array): number[] {
    const result: number[] = [];
    this.queryRecursive(node, center, radius, positions, result);
    return result;
  }

  private queryRecursive(node: BVHNode, center: [number, number, number], radius: number, positions: Float32Array, result: number[]) {
    const dx = node.center[0] - center[0], dy = node.center[1] - center[1], dz = node.center[2] - center[2];
    const distSq = dx * dx + dy * dy + dz * dz;
    if (distSq > (node.radius + radius) * (node.radius + radius)) return;

    if (node.isLeaf) {
      const rSq = radius * radius;
      for (const i of node.vertexIndices) {
        const vx = positions[i * 3] - center[0], vy = positions[i * 3 + 1] - center[1], vz = positions[i * 3 + 2] - center[2];
        if (vx * vx + vy * vy + vz * vz <= rSq) result.push(i);
      }
    } else {
      if (node.left) this.queryRecursive(node.left, center, radius, positions, result);
      if (node.right) this.queryRecursive(node.right, center, radius, positions, result);
    }
  }
}
