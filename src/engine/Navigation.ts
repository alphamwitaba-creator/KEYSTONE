// ============================================================
// KEVLA ENGINE — Navigation System v2.0
// Recast/Detour-style navigation mesh and A* pathfinding
// ============================================================

import * as THREE from 'three';

// ============================================================
// NAVIGATION MESH (Recast/Detour style)
// ============================================================

export interface NavMeshConfig {
  cellSize: number;
  cellHeight: number;
  agentHeight: number;
  agentRadius: number;
  agentMaxClimb: number;
  agentMaxSlope: number;
  regionMinSize: number;
  regionMergeSize: number;
  edgeMaxLen: number;
  edgeMaxError: number;
  detailSampleDist: number;
  detailSampleMaxError: number;
  maxSimplificationError: number;
}

export const DEFAULT_NAVMESH_CONFIG: NavMeshConfig = {
  cellSize: 0.2,
  cellHeight: 0.2,
  agentHeight: 2.0,
  agentRadius: 0.5,
  agentMaxClimb: 0.9,
  agentMaxSlope: 45,
  regionMinSize: 8,
  regionMergeSize: 20,
  cellSize: 12,
  edgeMaxError: 1.3,
  detailSampleDist: 6,
  detailSampleMaxError: 1,
  maxSimplificationError: 1.1,
};

export interface NavPoly {
  id: number;
  indices: number[];
  center: THREE.Vector3;
  areaType: number;
  flags: number;
}

export interface NavMesh {
  vertices: Float32Array;
  polygons: NavPoly[];
  detailVertices: Float32Array;
  detailIndices: Uint32Array;
  offMeshConnections: OffMeshConnection[];
  bounds: { min: THREE.Vector3; max: THREE.Vector3 };
  config: NavMeshConfig;
}

export interface OffMeshConnection {
  start: THREE.Vector3;
  end: THREE.Vector3;
  radius: number;
  bidirectional: boolean;
  areaType: number;
}

export interface NavQuery {
  findNearestPoly: (point: THREE.Vector3) => NavPoly | null;
  getPolyCenter: (poly: NavPoly) => THREE.Vector3;
  getClosestPoint: (point: THREE.Vector3) => THREE.Vector3;
  getRandomPoint: () => THREE.Vector3 | null;
}

export class NavigationMesh {
  private config: NavMeshConfig;
  private mesh: NavMesh | null = null;
  private heightField: Float32Array | null = null;
  private compactHeightField: Uint16Array | null = null;
  private rasterizationCache: Map<string, number[]> = new Map();

  constructor(config: Partial<NavMeshConfig> = {}) {
    this.config = { ...DEFAULT_NAVMESH_CONFIG, ...config };
  }

  buildFromMesh(geometry: THREE.BufferGeometry, transform?: THREE.Matrix4): NavMesh {
    const posAttr = geometry.getAttribute('position');
    const indexAttr = geometry.getIndex();

    if (!posAttr) {
      throw new Error('Geometry must have position attribute');
    }

    const vertices: number[] = [];
    const indices: number[] = indexAttr ? Array.from(indexAttr.array) : [];

    // Transform and extract vertices
    const tempVec = new THREE.Vector3();
    for (let i = 0; i < posAttr.count; i++) {
      tempVec.fromBufferAttribute(posAttr, i);
      if (transform) tempVec.applyMatrix4(transform);
      vertices.push(tempVec.x, tempVec.y, tempVec.z);
    }

    // Build compact heightfield
    this.buildHeightfield(vertices, indices);

    // Build navigation polygons
    const polygons = this.buildPolygons(vertices, indices);

    // Build detail mesh
    const { detailVertices, detailIndices } = this.buildDetailMesh(vertices, polygons);

    this.mesh = {
      vertices: new Float32Array(vertices),
      polygons,
      detailVertices: new Float32Array(detailVertices),
      detailIndices: new Uint32Array(detailIndices),
      offMeshConnections: [],
      bounds: this.calculateBounds(vertices),
      config: this.config,
    };

    return this.mesh;
  }

  private buildHeightfield(vertices: number[], indices: number[]): void {
    const bounds = this.calculateBounds(vertices);
    const width = Math.ceil((bounds.max.x - bounds.min.x) / this.config.cellSize) + 1;
    const height = Math.ceil((bounds.max.z - bounds.min.z) / this.config.cellSize) + 1;
    
    this.heightField = new Float32Array(width * height).fill(-99999);

    // Rasterize triangles to heightfield
    for (let i = 0; i < indices.length; i += 3) {
      const i0 = indices[i] * 3, i1 = indices[i + 1] * 3, i2 = indices[i + 2] * 3;
      const v0 = new THREE.Vector3(vertices[i0], vertices[i0 + 1], vertices[i0 + 2]);
      const v1 = new THREE.Vector3(vertices[i1], vertices[i1 + 1], vertices[i1 + 2]);
      const v2 = new THREE.Vector3(vertices[i2], vertices[i2 + 1], vertices[i2 + 2]);

      this.rasterizeTriangle(v0, v1, v2, bounds);
    }

    // Build compact heightfield
    this.compactHeightField = new Uint16Array(width * height);
    for (let i = 0; i < this.compactHeightField.length; i++) {
      const h = this.heightField[i];
      this.compactHeightField[i] = Math.floor((h + this.config.cellHeight) / this.config.cellHeight);
    }
  }

  private rasterizeTriangle(v0: THREE.Vector3, v1: THREE.Vector3, v2: THREE.Vector3, bounds: { min: THREE.Vector3; max: THREE.Vector3 }): void {
    const width = Math.ceil((bounds.max.x - bounds.min.x) / this.config.cellSize) + 1;

    // Simple rasterization - sample triangle at cell centers
    const minX = Math.floor((Math.min(v0.x, v1.x, v2.x) - bounds.min.x) / this.config.cellSize);
    const maxX = Math.ceil((Math.max(v0.x, v1.x, v2.x) - bounds.min.x) / this.config.cellSize);
    const minZ = Math.floor((Math.min(v0.z, v1.z, v2.z) - bounds.min.z) / this.config.cellSize);
    const maxZ = Math.ceil((Math.max(v0.z, v1.z, v2.z) - bounds.min.z) / this.config.cellSize);

    for (let x = minX; x <= maxX; x++) {
      for (let z = minZ; z <= maxZ; z++) {
        const cx = bounds.min.x + (x + 0.5) * this.config.cellSize;
        const cz = bounds.min.z + (z + 0.5) * this.config.cellSize;

        // Simple height from plane
        const bary = this.barycentricCoordinates(cx, cz, v0, v1, v2);
        if (bary && bary.u >= 0 && bary.v >= 0 && bary.u + bary.v <= 1) {
          const h = v0.y * bary.u + v1.y * bary.v + v2.y * (1 - bary.u - bary.v);
          const idx = x + z * width;
          if (this.heightField && h > this.heightField[idx]) {
            this.heightField[idx] = h;
          }
        }
      }
    }
  }

  private barycentricCoordinates(x: number, z: number, v0: THREE.Vector3, v1: THREE.Vector3, v2: THREE.Vector3): { u: number; v: number } | null {
    const area = (v1.z - v2.z) * (v0.x - v2.x) + (v2.x - v1.x) * (v0.z - v2.z);
    if (Math.abs(area) < 0.0001) return null;

    const u = ((v1.z - v2.z) * (x - v2.x) + (v2.x - v1.x) * (z - v2.z)) / area;
    const v = ((v2.z - v0.z) * (x - v2.x) + (v0.x - v2.x) * (z - v2.z)) / area;
    return { u, v };
  }

  private buildPolygons(vertices: number[], indices: number[]): NavPoly[] {
    const polygons: NavPoly[] = [];
    const vertexSet = new Set<number>();
    const adjacency = new Map<number, Set<number>>();

    // Build vertex adjacency
    for (let i = 0; i < indices.length; i += 3) {
      const [a, b, c] = [indices[i], indices[i + 1], indices[i + 2]];
      [[a, b], [b, c], [a, c]].forEach(([i, j]) => {
        if (!adjacency.has(i)) adjacency.set(i, new Set());
        adjacency.get(i)!.add(j);
      });
    }

    // Group connected vertices into polygons using flood fill
    const processed = new Set<number>();
    let polyId = 0;

    for (let i = 0; i < indices.length; i += 3) {
      const triVerts = [indices[i], indices[i + 1], indices[i + 2]];
      for (const startVert of triVerts) {
        if (processed.has(startVert)) continue;

        const polyIndices: number[] = [];
        const queue = [startVert];

        while (queue.length > 0 && polyIndices.length < 64) {
          const v = queue.shift()!;
          if (processed.has(v)) continue;
          processed.add(v);
          polyIndices.push(v);

          const neighbors = adjacency.get(v);
          if (neighbors) {
            for (const n of neighbors) {
              if (!processed.has(n) && this.isEdgeInternal(v, n, indices)) {
                queue.push(n);
              }
            }
          }
        }

        if (polyIndices.length >= 3) {
          const center = this.calculatePolygonCenter(polyIndices, vertices);
          polygons.push({
            id: polyId++,
            indices: polyIndices,
            center,
            areaType: 0,
            flags: 1, // WALKABLE
          });
        }
      }
    }

    return polygons;
  }

  private isEdgeInternal(v1: number, v2: number, indices: number[]): boolean {
    let sharedCount = 0;
    for (let i = 0; i < indices.length; i += 3) {
      const tri = [indices[i], indices[i + 1], indices[i + 2]];
      if (tri.includes(v1) && tri.includes(v2)) sharedCount++;
    }
    return sharedCount > 1;
  }

  private calculatePolygonCenter(indices: number[], vertices: number[]): THREE.Vector3 {
    const center = new THREE.Vector3();
    for (const idx of indices) {
      center.x += vertices[idx * 3];
      center.y += vertices[idx * 3 + 1];
      center.z += vertices[idx * 3 + 2];
    }
    center.divideScalar(indices.length);
    return center;
  }

  private buildDetailMesh(vertices: number[], polygons: NavPoly[]): { detailVertices: number[]; detailIndices: number[] } {
    const detailVertices: number[] = [];
    const detailIndices: number[] = [];
    let detailVertCount = 0;

    for (const poly of polygons) {
      // Add original vertices as detail vertices
      for (const idx of poly.indices) {
        detailVertices.push(vertices[idx * 3], vertices[idx * 3 + 1], vertices[idx * 3 + 2]);
      }

      // Add center vertex for polygon
      detailVertices.push(poly.center.x, poly.center.y, poly.center.z);

      // Add triangle fan
      const centerIdx = detailVertCount + poly.indices.length;
      for (let i = 0; i < poly.indices.length; i++) {
        const next = (i + 1) % poly.indices.length;
        detailIndices.push(detailVertCount + i, detailVertCount + next, centerIdx);
      }

      detailVertCount += poly.indices.length + 1;
    }

    return { detailVertices, detailIndices };
  }

  private calculateBounds(vertices: number[]): { min: THREE.Vector3; max: THREE.Vector3 } {
    const min = new THREE.Vector3(Infinity, Infinity, Infinity);
    const max = new THREE.Vector3(-Infinity, -Infinity, -Infinity);

    for (let i = 0; i < vertices.length; i += 3) {
      min.x = Math.min(min.x, vertices[i]);
      min.y = Math.min(min.y, vertices[i + 1]);
      min.z = Math.min(min.z, vertices[i + 2]);
      max.x = Math.max(max.x, vertices[i]);
      max.y = Math.max(max.y, vertices[i + 1]);
      max.z = Math.max(max.z, vertices[i + 2]);
    }

    return { min, max };
  }

  getMesh(): NavMesh | null {
    return this.mesh;
  }

  queryPoint(point: THREE.Vector3): NavPoly | null {
    if (!this.mesh) return null;

    for (const poly of this.mesh.polygons) {
      if (this.isPointInPolygon(point, poly)) {
        return poly;
      }
    }
    return null;
  }

  private isPointInPolygon(point: THREE.Vector3, poly: NavPoly): boolean {
    // Ray casting algorithm
    let inside = false;
    const n = poly.indices.length;

    for (let i = 0, j = n - 1; i < n; j = i++) {
      const pi = this.mesh!.vertices[poly.indices[i] * 3];
      const pj = this.mesh!.vertices[poly.indices[j] * 3];
      const pi2 = poly.indices[i] * 3 + 2;
      const pj2 = poly.indices[j] * 3 + 2;

      if (((this.mesh!.vertices[pi2] > point.z) !== (this.mesh!.vertices[pj2] > point.z)) &&
          (point.x < (this.mesh!.vertices[pj2] - this.mesh!.vertices[pi2]) * (point.z - this.mesh!.vertices[pi2]) / (this.mesh!.vertices[pj2] - this.mesh!.vertices[pi2]) + this.mesh!.vertices[pi])) {
        inside = !inside;
      }
    }

    return inside;
  }

  getClosestPoint(point: THREE.Vector3): THREE.Vector3 {
    const poly = this.queryPoint(point);
    if (poly) {
      return this.projectPointToPolygon(point, poly);
    }

    // Find closest polygon
    let closest: NavPoly | null = null;
    let minDist = Infinity;

    for (const p of this.mesh!.polygons) {
      const dist = point.distanceTo(p.center);
      if (dist < minDist) {
        minDist = dist;
        closest = p;
      }
    }

    return closest ? this.projectPointToPolygon(point, closest) : point.clone();
  }

  private projectPointToPolygon(point: THREE.Vector3, poly: NavPoly): THREE.Vector3 {
    const result = point.clone();
    let minDist = Infinity;

    // Project to each edge
    for (let i = 0; i < poly.indices.length; i++) {
      const j = (i + 1) % poly.indices.length;
      const v1 = new THREE.Vector3(
        this.mesh!.vertices[poly.indices[i] * 3],
        this.mesh!.vertices[poly.indices[i] * 3 + 1],
        this.mesh!.vertices[poly.indices[i] * 3 + 2],
      );
      const v2 = new THREE.Vector3(
        this.mesh!.vertices[poly.indices[j] * 3],
        this.mesh!.vertices[poly.indices[j] * 3 + 1],
        this.mesh!.vertices[poly.indices[j] * 3 + 2],
      );

      const projected = this.closestPointOnSegment(point, v1, v2);
      const dist = point.distanceTo(projected);
      if (dist < minDist) {
        minDist = dist;
        result.copy(projected);
      }
    }

    return result;
  }

  private closestPointOnSegment(p: THREE.Vector3, a: THREE.Vector3, b: THREE.Vector3): THREE.Vector3 {
    const ab = new THREE.Vector3().subVectors(b, a);
    const ap = new THREE.Vector3().subVectors(p, a);
    let t = ap.dot(ab) / ab.lengthSq();
    t = Math.max(0, Math.min(1, t));
    return a.clone().addScaledVector(ab, t);
  }
}

// ============================================================
// A* PATHFINDING
// ============================================================

export interface PathNode {
  polyId: number;
  position: THREE.Vector3;
  g: number;
  h: number;
  f: number;
  parent: PathNode | null;
}

export interface PathResult {
  points: THREE.Vector3[];
  length: number;
  success: boolean;
}

export class PathFinder {
  private navMesh: NavigationMesh;
  private nodePool: PathNode[] = [];
  private maxIterations = 2048;

  constructor(navMesh: NavigationMesh) {
    this.navMesh = navMesh;
  }

  findPath(start: THREE.Vector3, end: THREE.Vector3): PathResult {
    const mesh = this.navMesh.getMesh();
    if (!mesh) {
      return { points: [], length: 0, success: false };
    }

    const startPoly = this.navMesh.queryPoint(start);
    const endPoly = this.navMesh.queryPoint(end);

    if (!startPoly || !endPoly) {
      return { points: [], length: 0, success: false };
    }

    // A* search
    const openSet: PathNode[] = [];
    const closedSet = new Set<number>();

    const startNode: PathNode = {
      polyId: startPoly.id,
      position: start.clone(),
      g: 0,
      h: this.heuristic(start, end),
      f: 0,
      parent: null,
    };
    openSet.push(startNode);

    let iterations = 0;
    while (openSet.length > 0 && iterations < this.maxIterations) {
      iterations++;

      // Get node with lowest f
      openSet.sort((a, b) => a.f - b.f);
      const current = openSet.shift()!;

      if (current.polyId === endPoly.id) {
        return this.reconstructPath(current, start, end);
      }

      closedSet.add(current.polyId);

      // Get neighbors
      const neighbors = this.getNeighborPolys(current.polyId, mesh);
      for (const neighborId of neighbors) {
        if (closedSet.has(neighborId)) continue;

        const neighbor = mesh.polygons.find(p => p.id === neighborId);
        if (!neighbor) continue;

        const neighborPos = neighbor.center;
        const tentativeG = current.g + current.position.distanceTo(neighborPos);

        let existingNode = openSet.find(n => n.polyId === neighborId);
        if (!existingNode) {
          existingNode = {
            polyId: neighborId,
            position: neighborPos,
            g: Infinity,
            h: this.heuristic(neighborPos, end),
            f: 0,
            parent: null,
          };
          openSet.push(existingNode);
        }

        if (tentativeG < existingNode.g) {
          existingNode.g = tentativeG;
          existingNode.f = existingNode.g + existingNode.h;
          existingNode.parent = current;
        }
      }
    }

    // Could not find path
    return { points: [], length: 0, success: false };
  }

  private heuristic(a: THREE.Vector3, b: THREE.Vector3): number {
    // Euclidean distance as heuristic (admissible)
    return a.distanceTo(b);
  }

  private getNeighborPolys(polyId: number, mesh: NavMesh): number[] {
    // Simplified: return all polygons within distance
    const poly = mesh.polygons.find(p => p.id === polyId);
    if (!poly) return [];

    const neighbors: number[] = [];
    const maxDist = 10;

    for (const p of mesh.polygons) {
      if (p.id !== polyId && p.center.distanceTo(poly.center) < maxDist) {
        neighbors.push(p.id);
      }
    }

    return neighbors;
  }

  private reconstructPath(node: PathNode, start: THREE.Vector3, end: THREE.Vector3): PathResult {
    const points: THREE.Vector3[] = [start];
    let current: PathNode | null = node;

    while (current && current.parent) {
      points.push(current.position.clone());
      current = current.parent;
    }

    points.push(end);

    // Simplify path
    const simplified = this.simplifyPath(points);

    let length = 0;
    for (let i = 1; i < simplified.length; i++) {
      length += simplified[i - 1].distanceTo(simplified[i]);
    }

    return { points: simplified, length, success: true };
  }

  private simplifyPath(points: THREE.Vector3[]): THREE.Vector3[] {
    if (points.length <= 2) return points;

    const simplified: THREE.Vector3[] = [points[0]];

    for (let i = 1; i < points.length - 1; i++) {
      const prev = simplified[simplified.length - 1];
      const next = points[i + 1];

      // Add point if deviation is significant
      const deviation = this.pointLineDistance(points[i], prev, next);
      if (deviation > 0.5) {
        simplified.push(points[i]);
      }
    }

    simplified.push(points[points.length - 1]);
    return simplified;
  }

  private pointLineDistance(point: THREE.Vector3, lineStart: THREE.Vector3, lineEnd: THREE.Vector3): number {
    const ab = new THREE.Vector3().subVectors(lineEnd, lineStart);
    const ac = new THREE.Vector3().subVectors(point, lineStart);
    const t = Math.max(0, Math.min(1, ac.dot(ab) / ab.lengthSq()));
    const closest = lineStart.clone().addScaledVector(ab, t);
    return point.distanceTo(closest);
  }

  // Get random point on navigation mesh
  getRandomPoint(): THREE.Vector3 | null {
    const mesh = this.navMesh.getMesh();
    if (!mesh || mesh.polygons.length === 0) return null;

    const randomPoly = mesh.polygons[Math.floor(Math.random() * mesh.polygons.length)];
    return randomPoly.center.clone();
  }
}

// ============================================================
// STEERING BEHAVIORS
// ============================================================

export interface SteeringOutput {
  linear: THREE.Vector3;
  angular: number;
}

export class SteeringBehaviors {
  private position: THREE.Vector3 = new THREE.Vector3();
  private velocity: THREE.Vector3 = new THREE.Vector3();
  private orientation: number = 0;
  private maxSpeed: number = 5;
  private maxForce: number = 1;
  private maxAngularVelocity: number = Math.PI;

  setPosition(pos: THREE.Vector3) { this.position.copy(pos); }
  setVelocity(vel: THREE.Vector3) { this.velocity.copy(vel); }
  setOrientation(ori: number) { this.orientation = ori; }
  setMaxSpeed(speed: number) { this.maxSpeed = speed; }
  setMaxForce(force: number) { this.maxForce = force; }

  // Seek target
  seek(target: THREE.Vector3, targetLinear?: THREE.Vector3): SteeringOutput {
    const desired = target.clone().sub(this.position);
    
    if (targetLinear) {
      desired.copy(targetLinear);
    } else {
      desired.normalize().multiplyScalar(this.maxSpeed);
    }

    const steer = desired.sub(this.velocity);
    if (steer.length() > this.maxForce) {
      steer.normalize().multiplyScalar(this.maxForce);
    }

    return { linear: steer, angular: 0 };
  }

  // Flee from target
  flee(target: THREE.Vector3, panicDistance: number = 10): SteeringOutput {
    const dist = this.position.distanceTo(target);
    if (dist > panicDistance) {
      return { linear: new THREE.Vector3(), angular: 0 };
    }

    const desired = this.position.clone().sub(target);
    desired.normalize().multiplyScalar(this.maxSpeed);

    const steer = desired.sub(this.velocity);
    if (steer.length() > this.maxForce) {
      steer.normalize().multiplyScalar(this.maxForce);
    }

    return { linear: steer, angular: 0 };
  }

  // Arrive at target
  arrive(target: THREE.Vector3, slowdownRadius: number = 3, targetRadius: number = 0.5): SteeringOutput {
    const toTarget = target.clone().sub(this.position);
    const dist = toTarget.length();

    if (dist < targetRadius) {
      return { linear: new THREE.Vector3(), angular: 0 };
    }

    let speed = this.maxSpeed;
    if (dist < slowdownRadius) {
      speed = (dist / slowdownRadius) * this.maxSpeed;
    }

    const desired = toTarget.normalize().multiplyScalar(speed);
    const steer = desired.sub(this.velocity);

    if (steer.length() > this.maxForce) {
      steer.normalize().multiplyScalar(this.maxForce);
    }

    return { linear: steer, angular: 0 };
  }

  // Pursue target (predict future position)
  pursue(target: THREE.Vector3, targetVelocity: THREE.Vector3, predictionTime: number = 1): SteeringOutput {
    const predictedPos = target.clone().addScaledVector(targetVelocity, predictionTime);
    return this.seek(predictedPos);
  }

  // Evade target
  evade(target: THREE.Vector3, targetVelocity: THREE.Vector3, predictionTime: number = 1): SteeringOutput {
    const predictedPos = target.clone().addScaledVector(targetVelocity, predictionTime);
    return this.flee(predictedPos, 100);
  }

  // Wander (random movement)
  wander(theta: number, wanderDist: number = 1.5, wanderRadius: number = 1): SteeringOutput {
    const jitter = (Math.random() - 0.5) * 2 * theta;
    const wanderOffset = new THREE.Vector3(
      Math.cos(jitter) * wanderRadius,
      0,
      Math.sin(jitter) * wanderRadius
    );

    const targetLocal = new THREE.Vector3(wanderDist, 0, 0).add(wanderOffset);
    const target = this.position.clone().add(this.localToWorld(targetLocal));

    return this.seek(target);
  }

  private localToWorld(local: THREE.Vector3): THREE.Vector3 {
    const cos = Math.cos(this.orientation);
    const sin = Math.sin(this.orientation);
    return new THREE.Vector3(
      local.x * cos - local.z * sin,
      local.y,
      local.x * sin + local.z * cos
    );
  }

  // Follow path
  followPath(path: THREE.Vector3[], pathOffset: number = 0): SteeringOutput {
    if (path.length < 2) {
      return { linear: new THREE.Vector3(), angular: 0 };
    }

    // Find current path segment
    let closestDist = Infinity;
    let segmentIndex = 0;
    let closestPoint = new THREE.Vector3();

    for (let i = 0; i < path.length - 1; i++) {
      const point = this.closestPointOnPathSegment(path[i], path[i + 1]);
      const dist = this.position.distanceTo(point);
      if (dist < closestDist) {
        closestDist = dist;
        closestPoint = point;
        segmentIndex = i;
      }
    }

    // Look ahead on path
    let lookAheadDist = 3;
    let targetPoint = closestPoint.clone();

    for (let d = lookAheadDist; d < 20; d += 0.5) {
      const t = Math.min(1, d / this.velocity.length());
      const lookPoint = new THREE.Vector3().lerpVectors(
        path[segmentIndex],
        path[Math.min(segmentIndex + 1, path.length - 1)],
        t
      );
      targetPoint = lookPoint;
    }

    return this.seek(targetPoint);
  }

  private closestPointOnPathSegment(a: THREE.Vector3, b: THREE.Vector3): THREE.Vector3 {
    const ab = new THREE.Vector3().subVectors(b, a);
    const ap = new THREE.Vector3().subVectors(this.position, a);
    let t = ap.dot(ab) / ab.lengthSq();
    t = Math.max(0, Math.min(1, t));
    return a.clone().addScaledVector(ab, t);
  }

  // Separation (avoid crowding)
  separate(others: { position: THREE.Vector3; velocity: THREE.Vector3 }[], separationRadius: number = 2): SteeringOutput {
    const steer = new THREE.Vector3();
    let count = 0;

    for (const other of others) {
      const dist = this.position.distanceTo(other.position);
      if (dist > 0 && dist < separationRadius) {
        const diff = this.position.clone().sub(other.position);
        diff.normalize().divideScalar(dist);
        steer.add(diff);
        count++;
      }
    }

    if (count > 0) {
      steer.divideScalar(count);
      steer.normalize().multiplyScalar(this.maxSpeed);
      steer.sub(this.velocity);
      if (steer.length() > this.maxForce) {
        steer.normalize().multiplyScalar(this.maxForce);
      }
    }

    return { linear: steer, angular: 0 };
  }

  // Alignment (steer toward average heading)
  align(others: { position: THREE.Vector3; velocity: THREE.Vector3 }[], neighborRadius: number = 5): SteeringOutput {
    const avgVelocity = new THREE.Vector3();
    let count = 0;

    for (const other of others) {
      const dist = this.position.distanceTo(other.position);
      if (dist > 0 && dist < neighborRadius) {
        avgVelocity.add(other.velocity);
        count++;
      }
    }

    if (count > 0) {
      avgVelocity.divideScalar(count);
      avgVelocity.normalize().multiplyScalar(this.maxSpeed);
      const steer = avgVelocity.sub(this.velocity);
      if (steer.length() > this.maxForce) {
        steer.normalize().multiplyScalar(this.maxForce);
      }
      return { linear: steer, angular: 0 };
    }

    return { linear: new THREE.Vector3(), angular: 0 };
  }

  // Cohesion (steer toward average position)
  cohere(others: { position: THREE.Vector3 }[], neighborRadius: number = 5): SteeringOutput {
    const avgPosition = new THREE.Vector3();
    let count = 0;

    for (const other of others) {
      const dist = this.position.distanceTo(other.position);
      if (dist > 0 && dist < neighborRadius) {
        avgPosition.add(other.position);
        count++;
      }
    }

    if (count > 0) {
      avgPosition.divideScalar(count);
      return this.seek(avgPosition);
    }

    return { linear: new THREE.Vector3(), angular: 0 };
  }

  // Flocking (combine separation, alignment, cohesion)
  flock(
    others: { position: THREE.Vector3; velocity: THREE.Vector3 }[],
    weights: { separation: number; alignment: number; cohesion: number } = 
              { separation: 1.5, alignment: 1, cohesion: 1 }
  ): SteeringOutput {
    const separation = this.separate(others);
    const alignment = this.align(others);
    const cohesion = this.cohere(others);

    const result = new THREE.Vector3();
    result.addScaledVector(separation.linear, weights.separation);
    result.addScaledVector(alignment.linear, weights.alignment);
    result.addScaledVector(cohesion.linear, weights.cohesion);

    if (result.length() > this.maxForce) {
      result.normalize().multiplyScalar(this.maxForce);
    }

    return { linear: result, angular: 0 };
  }

  // Face target
  face(target: THREE.Vector3): SteeringOutput {
    const targetDir = target.clone().sub(this.position);
    const targetAngle = Math.atan2(targetDir.x, targetDir.z);
    
    let angleDiff = targetAngle - this.orientation;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

    let angularVelocity = angleDiff;
    if (Math.abs(angularVelocity) > this.maxAngularVelocity) {
      angularVelocity = Math.sign(angularVelocity) * this.maxAngularVelocity;
    }

    return { linear: new THREE.Vector3(), angular: angularVelocity };
  }

  // Look where going
  lookWhereGoing(): SteeringOutput {
    if (this.velocity.lengthSq() < 0.0001) {
      return { linear: new THREE.Vector3(), angular: 0 };
    }

    const targetAngle = Math.atan2(this.velocity.x, this.velocity.z);
    let angleDiff = targetAngle - this.orientation;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

    let angularVelocity = angleDiff;
    if (Math.abs(angularVelocity) > this.maxAngularVelocity) {
      angularVelocity = Math.sign(angularVelocity) * this.maxAngularVelocity;
    }

    return { linear: new THREE.Vector3(), angular: angularVelocity };
  }

  update(dt: number, steering: SteeringOutput): void {
    this.velocity.addScaledVector(steering.linear, dt);
    if (this.velocity.length() > this.maxSpeed) {
      this.velocity.normalize().multiplyScalar(this.maxSpeed);
    }

    this.position.addScaledVector(this.velocity, dt);
    this.orientation += steering.angular * dt;
  }
}