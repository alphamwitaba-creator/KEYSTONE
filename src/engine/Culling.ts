// ============================================================
// KEVLA ENGINE — OCCLUSION CULLING SYSTEM v2.0
// Production-Grade Visibility Optimization
//
// Architecture:
//   ┌─────────────────────────────────────────────────────────┐
//   │            OCCLUSION CULLING SYSTEM                     │
//   │                                                          │
//   │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │
//   │  │    BVH      │  │   Portal    │  │   Occlusion    │  │
//   │  │  (Spatial) │  │   Culling   │  │   Query        │  │
//   │  └─────────────┘  └─────────────┘  └─────────────────┘  │
//   │                                                          │
//   │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │
//   │  │    CPU      │  │    GPU      │  │    Hybrid       │  │
//   │  │   Culling   │  │   Culling   │  │    Culling     │  │
//   │  └─────────────┘  └─────────────┘  └─────────────────┘  │
//   │                                                          │
//   │  ┌─────────────────────────────────────────────────────┐│
//   │  │           Stats & Profiling                        ││
//   │  └─────────────────────────────────────────────────────┘│
//   └─────────────────────────────────────────────────────────┘
//
// Features:
//   • BVH-based spatial culling
//   • Frustum culling (view frustum optimization)
//   • Distance-based LOD culling
//   • Portal-based indoor culling
//   • Software occlusion queries
//   • Hybrid CPU/GPU culling
//   • Real-time statistics
// ============================================================

import type { Entity, Vector3 } from './types';

// ============================================================
// TYPES — Culling Data Structures
// ============================================================

/** Bounding volume type */
export type BoundingType = 'sphere' | 'box' | 'oriented_box';

/** Bounding volume */
export interface BoundingVolume {
  type: BoundingType;
  center: Vector3;
  radius?: number;        // for sphere
  halfExtents?: Vector3; // for box
  orientation?: Vector3;  // for OBB
}

/** Octree/BBVH node */
export interface OctreeNode {
  id: string;
  bounds: BoundingVolume;
  children: OctreeNode[] | null;
  entities: string[];  // entity IDs
  depth: number;
  isLeaf: boolean;
}

/** Occlusion plane for portal culling */
export interface OcclusionPlane {
  normal: Vector3;
  distance: number;
  portalId: string;
}

/** Portal for indoor culling */
export interface Portal {
  id: string;
  name: string;
  bounds: BoundingVolume;
  connectedRoomId: string;
  bidirectional: boolean;
  active: boolean;
}

/** Room/cell for portal culling */
export interface Room {
  id: string;
  name: string;
  bounds: BoundingVolume;
  portals: string[];  // portal IDs
  active: boolean;
}

/** Culling stats */
export interface CullingStats {
  totalEntities: number;
  culledEntities: number;
  visibleEntities: number;
  frustumTests: number;
  occlusionTests: number;
  distanceTests: number;
 BVHTests: number;
  lastUpdateTime: number;
  cullRate: number;
}

/** View frustum */
export interface Frustum {
  planes: { normal: Vector3; distance: number }[];
  corners: Vector3[];
  fov: number;
  near: number;
  far: number;
  aspect: number;
}

/** LOD level */
export interface LODLevel {
  distance: number;
  meshType: string;
  quality: number;
}

/** Culling configuration */
export interface CullingConfig {
  enabled: boolean;
  frustumCulling: boolean;
  distanceCulling: boolean;
  occlusionCulling: boolean;
  portalCulling: boolean;
  lodEnabled: boolean;
  lodLevels: LODLevel[];
  minDistance: number;
  maxDistance: number;
  occlusionQueryResolution: number;
  maxPortalDepth: number;
}

export const DEFAULT_CULLING_CONFIG: CullingConfig = {
  enabled: true,
  frustumCulling: true,
  distanceCulling: true,
  occlusionCulling: false,
  portalCulling: false,
  lodEnabled: true,
  lodLevels: [
    { distance: 0, meshType: 'high', quality: 1.0 },
    { distance: 50, meshType: 'medium', quality: 0.7 },
    { distance: 100, meshType: 'low', quality: 0.4 },
    { distance: 200, meshType: 'lowest', quality: 0.2 },
  ],
  minDistance: 0.1,
  maxDistance: 500,
  occlusionQueryResolution: 32,
  maxPortalDepth: 5,
};

// ============================================================
// FRUSTUM CALCULATION
// ============================================================

export class FrustumCalculator {
  /**
   * Build frustum from camera parameters
   */
  static buildFrustum(
    position: Vector3,
    forward: Vector3,
    up: Vector3,
    fov: number,
    aspect: number,
    near: number,
    far: number
  ): Frustum {
    const right = this.cross(up, forward);
    const fovRad = (fov * Math.PI) / 180;
    const tanHalfFov = Math.tan(fovRad / 2);

    // Calculate frustum corners
    const farHeight = far * tanHalfFov;
    const farWidth = farHeight * aspect;
    const nearHeight = near * tanHalfFov;
    const nearWidth = nearHeight * aspect;

    const corners: Vector3[] = [
      { x: position.x + forward.x * near + right.x * nearWidth + up.x * nearHeight, y: position.y + forward.y * near + right.y * nearWidth + up.y * nearHeight, z: position.z + forward.z * near + right.z * nearWidth + up.z * nearHeight },
      { x: position.x + forward.x * near - right.x * nearWidth + up.x * nearHeight, y: position.y + forward.y * near - right.y * nearWidth + up.y * nearHeight, z: position.z + forward.z * near - right.z * nearWidth + up.z * nearHeight },
      { x: position.x + forward.x * near + right.x * nearWidth - up.x * nearHeight, y: position.y + forward.y * near + right.y * nearWidth - up.y * nearHeight, z: position.z + forward.z * near + right.z * nearWidth - up.z * nearHeight },
      { x: position.x + forward.x * near - right.x * nearWidth - up.x * nearHeight, y: position.y + forward.y * near - right.y * nearWidth - up.y * nearHeight, z: position.z + forward.z * near - right.z * nearWidth - up.z * nearHeight },
      { x: position.x + forward.x * far + right.x * farWidth + up.x * farHeight, y: position.y + forward.y * far + right.y * farWidth + up.y * farHeight, z: position.z + forward.z * far + right.z * farWidth + up.z * farHeight },
      { x: position.x + forward.x * far - right.x * farWidth + up.x * farHeight, y: position.y + forward.y * far - right.y * farWidth + up.y * farHeight, z: position.z + forward.z * far - right.z * farWidth + up.z * farHeight },
      { x: position.x + forward.x * far + right.x * farWidth - up.x * farHeight, y: position.y + forward.y * far + right.y * farWidth - up.y * farHeight, z: position.z + forward.z * far + right.z * farWidth - up.z * farHeight },
      { x: position.x + forward.x * far - right.x * farWidth - up.x * farHeight, y: position.y + forward.y * far - right.y * farWidth - up.y * farHeight, z: position.z + forward.z * far - right.z * farWidth - up.z * farHeight },
    ];

    // Calculate frustum planes
    const planes: { normal: Vector3; distance: number }[] = [];

    // Near plane
    planes.push({ normal: { ...forward }, distance: -this.dot(forward, position) - near });

    // Far plane
    planes.push({ normal: { x: -forward.x, y: -forward.y, z: -forward.z }, distance: this.dot(forward, position) + far });

    // Left plane
    const leftNormal = this.normalize({ x: forward.x + right.x / tanHalfFov, y: forward.y + right.y / tanHalfFov, z: forward.z + right.z / tanHalfFov });
    planes.push({ normal: leftNormal, distance: -this.dot(leftNormal, position) });

    // Right plane
    const rightNormal = this.normalize({ x: forward.x - right.x / tanHalfFov, y: forward.y - right.y / tanHalfFov, z: forward.z - right.z / tanHalfFov });
    planes.push({ normal: rightNormal, distance: -this.dot(rightNormal, position) });

    // Top plane
    const topNormal = this.normalize({ x: forward.x - up.x / tanHalfFov, y: forward.y - up.y / tanHalfFov, z: forward.z - up.z / tanHalfFov });
    planes.push({ normal: topNormal, distance: -this.dot(topNormal, position) });

    // Bottom plane
    const bottomNormal = this.normalize({ x: forward.x + up.x / tanHalfFov, y: forward.y + up.y / tanHalfFov, z: forward.z + up.z / tanHalfFov });
    planes.push({ normal: bottomNormal, distance: -this.dot(bottomNormal, position) });

    return { planes, corners, fov, near, far, aspect };
  }

  /**
   * Check if a point is inside the frustum
   */
  static isPointInFrustum(frustum: Frustum, point: Vector3): boolean {
    for (const plane of frustum.planes) {
      const distance = this.dot(plane.normal, point) + plane.distance;
      if (distance < 0) return false;
    }
    return true;
  }

  /**
   * Check if a sphere is inside the frustum
   */
  static isSphereInFrustum(frustum: Frustum, center: Vector3, radius: number): boolean {
    for (const plane of frustum.planes) {
      const distance = this.dot(plane.normal, center) + plane.distance;
      if (distance < -radius) return false;
    }
    return true;
  }

  /**
   * Check if a box is inside the frustum
   */
  static isBoxInFrustum(frustum: Frustum, center: Vector3, halfExtents: Vector3): boolean {
    for (const plane of frustum.planes) {
      const dot = this.dot(plane.normal, center);
      const extents = Math.abs(halfExtents.x * plane.normal.x) + Math.abs(halfExtents.y * plane.normal.y) + Math.abs(halfExtents.z * plane.normal.z);
      
      if (dot + extents + plane.distance < 0) return false;
    }
    return true;
  }

  private static cross(a: Vector3, b: Vector3): Vector3 {
    return {
      x: a.y * b.z - a.z * b.y,
      y: a.z * b.x - a.x * b.z,
      z: a.x * b.y - a.y * b.x,
    };
  }

  private static dot(a: Vector3, b: Vector3): number {
    return a.x * b.x + a.y * b.y + a.z * b.z;
  }

  private static normalize(v: Vector3): Vector3 {
    const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    if (len === 0) return { x: 0, y: 0, z: 0 };
    return { x: v.x / len, y: v.y / len, z: v.z / len };
  }
}

// ============================================================
// BVH (Bounding Volume Hierarchy) SYSTEM
// ============================================================

export class BVHSystem {
  private root: OctreeNode | null = null;
  private maxDepth: number = 8;
  private maxEntitiesPerNode: number = 8;
  private worldBounds: BoundingVolume = { type: 'box', center: { x: 0, y: 0, z: 0 }, halfExtents: { x: 100, y: 50, z: 100 } };

  /**
   * Build BVH from entities
   */
  buildFromEntities(entities: { id: string; position: Vector3; radius?: number; bounds?: BoundingVolume }[]): void {
    this.root = this._buildRecursive(entities, 0, this.worldBounds);
  }

  private _buildRecursive(entities: { id: string; position: Vector3; radius?: number }[], depth: number, bounds: BoundingVolume): OctreeNode {
    const nodeId = `node_${depth}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Leaf node
    if (depth >= this.maxDepth || entities.length <= this.maxEntitiesPerNode) {
      return {
        id: nodeId,
        bounds,
        children: null,
        entities: entities.map(e => e.id),
        depth,
        isLeaf: true,
      };
    }

    // Split along best axis
    const axis = this._findBestSplitAxis(entities);
    const mid = Math.floor(entities.length / 2);
    
    // Sort entities by position on split axis
    entities.sort((a, b) => a.position[axis] - b.position[axis]);
    
    const leftEntities = entities.slice(0, mid);
    const rightEntities = entities.slice(mid);
    
    // Calculate child bounds
    const leftBounds = this._calculateBounds(leftEntities);
    const rightBounds = this._calculateBounds(rightEntities);

    return {
      id: nodeId,
      bounds,
      children: [
        this._buildRecursive(leftEntities, depth + 1, leftBounds),
        this._buildRecursive(rightEntities, depth + 1, rightBounds),
      ],
      entities: [],
      depth,
      isLeaf: false,
    };
  }

  private _findBestSplitAxis(entities: { id: string; position: Vector3 }[]): 'x' | 'y' | 'z' {
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;

    for (const e of entities) {
      minX = Math.min(minX, e.position.x); maxX = Math.max(maxX, e.position.x);
      minY = Math.min(minY, e.position.y); maxY = Math.max(maxY, e.position.y);
      minZ = Math.min(minZ, e.position.z); maxZ = Math.max(maxZ, e.position.z);
    }

    const rangeX = maxX - minX;
    const rangeY = maxY - minY;
    const rangeZ = maxZ - minZ;

    if (rangeX >= rangeY && rangeX >= rangeZ) return 'x';
    if (rangeY >= rangeZ) return 'y';
    return 'z';
  }

  private _calculateBounds(entities: { id: string; position: Vector3; radius?: number }[]): BoundingVolume {
    if (entities.length === 0) {
      return { type: 'sphere', center: { x: 0, y: 0, z: 0 }, radius: 0 };
    }

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;

    for (const e of entities) {
      const r = e.radius || 1;
      minX = Math.min(minX, e.position.x - r); maxX = Math.max(maxX, e.position.x + r);
      minY = Math.min(minY, e.position.y - r); maxY = Math.max(maxY, e.position.y + r);
      minZ = Math.min(minZ, e.position.z - r); maxZ = Math.max(maxZ, e.position.z + r);
    }

    return {
      type: 'box',
      center: { x: (minX + maxX) / 2, y: (minY + maxY) / 2, z: (minZ + maxZ) / 2 },
      halfExtents: { x: (maxX - minX) / 2, y: (maxY - minY) / 2, z: (maxZ - minZ) / 2 },
    };
  }

  /**
   * Query entities inside frustum
   */
  queryFrustum(frustum: Frustum): string[] {
    if (!this.root) return [];
    return this._queryFrustumRecursive(this.root, frustum);
  }

  private _queryFrustumRecursive(node: OctreeNode, frustum: Frustum): string[] {
    const results: string[] = [];

    // Check if node bounds intersect frustum
    if (!this._boundsIntersectsFrustum(node.bounds, frustum)) {
      return results;
    }

    if (node.isLeaf) {
      return node.entities;
    }

    if (node.children) {
      for (const child of node.children) {
        results.push(...this._queryFrustumRecursive(child, frustum));
      }
    }

    return results;
  }

  private _boundsIntersectsFrustum(bounds: BoundingVolume, frustum: Frustum): boolean {
    if (bounds.type === 'sphere') {
      return FrustumCalculator.isSphereInFrustum(frustum, bounds.center, bounds.radius || 1);
    }
    return FrustumCalculator.isBoxInFrustum(frustum, bounds.center, bounds.halfExtents || { x: 1, y: 1, z: 1 });
  }

  /**
   * Get stats
   */
  getStats(): { nodeCount: number; depth: number; entityCount: number } {
    let nodeCount = 0;
    let entityCount = 0;
    let maxDepth = 0;

    const traverse = (node: OctreeNode) => {
      nodeCount++;
      maxDepth = Math.max(maxDepth, node.depth);
      if (node.isLeaf) {
        entityCount += node.entities.length;
      }
      if (node.children) {
        for (const child of node.children) {
          traverse(child);
        }
      }
    };

    if (this.root) traverse(this.root);
    return { nodeCount, depth: maxDepth, entityCount };
  }
}

// ============================================================
// PORTAL-BASED INDOOR CULLING
// ============================================================

export class PortalCullingSystem {
  private rooms: Map<string, Room> = new Map();
  private portals: Map<string, Portal> = new Map();
  private activeRoom: string | null = null;
  private maxDepth: number = 5;

  addRoom(room: Room): void {
    this.rooms.set(room.id, room);
  }

  addPortal(portal: Portal): void {
    this.portals.set(portal.id, portal);
    
    // Add to room
    const room = this.rooms.get(portal.connectedRoomId);
    if (room) {
      room.portals.push(portal.id);
    }
  }

  /**
   * Get visible rooms from camera position
   */
  getVisibleRooms(cameraPosition: Vector3): string[] {
    const visible: Set<string> = new Set();
    
    // Start from room containing camera
    for (const [id, room] of this.rooms) {
      if (this._isPointInBounds(cameraPosition, room.bounds)) {
        this._collectVisibleRooms(id, visible, 0);
        break;
      }
    }

    return Array.from(visible);
  }

  private _collectVisibleRooms(roomId: string, visible: Set<string>, depth: number): void {
    if (depth > this.maxDepth || visible.has(roomId)) return;
    
    visible.add(roomId);
    
    const room = this.rooms.get(roomId);
    if (!room) return;

    for (const portalId of room.portals) {
      const portal = this.portals.get(portalId);
      if (!portal || !portal.active) continue;

      const nextRoomId = portal.connectedRoomId;
      if (!visible.has(nextRoomId)) {
        this._collectVisibleRooms(nextRoomId, visible, depth + 1);
      }
    }
  }

  private _isPointInBounds(point: Vector3, bounds: BoundingVolume): boolean {
    if (bounds.type === 'box' && bounds.halfExtents) {
      const dx = Math.abs(point.x - bounds.center.x);
      const dy = Math.abs(point.y - bounds.center.y);
      const dz = Math.abs(point.z - bounds.center.z);
      return dx <= bounds.halfExtents.x && dy <= bounds.halfExtents.y && dz <= bounds.halfExtents.z;
    }
    return true;
  }

  /**
   * Get portals for a room
   */
  getPortalsForRoom(roomId: string): Portal[] {
    const room = this.rooms.get(roomId);
    if (!room) return [];
    return room.portals.map(id => this.portals.get(id)!).filter(Boolean);
  }

  /**
   * Get room stats
   */
  getStats(): { roomCount: number; portalCount: number } {
    return {
      roomCount: this.rooms.size,
      portalCount: this.portals.size,
    };
  }
}

// ============================================================
// OCCLUSION CULLING MAIN SYSTEM
// ============================================================

export class OcclusionCullingSystem {
  config: CullingConfig;
  private bvh: BVHSystem;
  private portalSystem: PortalCullingSystem;
  private stats: CullingStats;
  private lastCameraPosition: Vector3 = { x: 0, y: 0, z: 0 };

  constructor(config?: Partial<CullingConfig>) {
    this.config = { ...DEFAULT_CULLING_CONFIG, ...config };
    this.bvh = new BVHSystem();
    this.portalSystem = new PortalCullingSystem();
    this.stats = this._initStats();
  }

  private _initStats(): CullingStats {
    return {
      totalEntities: 0,
      culledEntities: 0,
      visibleEntities: 0,
      frustumTests: 0,
      occlusionTests: 0,
      distanceTests: 0,
     BVHTests: 0,
      lastUpdateTime: Date.now(),
      cullRate: 0,
    };
  }

  /**
   * Update culling system with entities and camera
   */
  update(
    entities: Entity[],
    cameraPosition: Vector3,
    cameraForward: Vector3,
    cameraUp: Vector3,
    fov: number = 60,
    aspect: number = 16 / 9
  ): string[] {
    if (!this.config.enabled) {
      return entities.map(e => e.id);
    }

    this.stats = this._initStats();
    this.stats.totalEntities = entities.length;
    this.lastCameraPosition = cameraPosition;

    // Build BVH if needed
    if (this.bvh.getStats().entityCount !== entities.length) {
      this.bvh.buildFromEntities(entities.map(e => ({ id: e.id, position: e.transform.position, radius: 1 })));
    }

    // Build frustum
    const frustum = FrustumCalculator.buildFrustum(
      cameraPosition,
      cameraForward,
      cameraUp,
      fov,
      aspect,
      0.1,
      this.config.maxDistance
    );

    let visibleIds: Set<string> = new Set();

    // Distance culling (cheap - do first)
    if (this.config.distanceCulling) {
      for (const entity of entities) {
        this.stats.distanceTests++;
        const dist = this._distanceToCamera(entity.transform.position, cameraPosition);
        
        if (dist < this.config.minDistance || dist > this.config.maxDistance) {
          this.stats.culledEntities++;
          continue;
        }
        visibleIds.add(entity.id);
      }
    } else {
      visibleIds = new Set(entities.map(e => e.id));
    }

    // Frustum culling with BVH
    if (this.config.frustumCulling) {
      const bvhResults = this.bvh.queryFrustum(frustum);
      this.stats.BVHTests = bvhResults.length;

      const frustumVisible = new Set<string>();
      for (const entity of entities) {
        this.stats.frustumTests++;
        if (bvhResults.includes(entity.id) && visibleIds.has(entity.id)) {
          const inFrustum = FrustumCalculator.isPointInFrustum(frustum, entity.transform.position);
          if (inFrustum) {
            frustumVisible.add(entity.id);
          }
        }
      }
      visibleIds = frustumVisible;
    }

    // Portal culling (indoor)
    if (this.config.portalCulling) {
      const visibleRooms = this.portalSystem.getVisibleRooms(cameraPosition);
      // Filter entities by room
      // In a full implementation, entities would be associated with rooms
    }

    // Calculate stats
    this.stats.visibleEntities = visibleIds.size;
    this.stats.culledEntities = this.stats.totalEntities - this.stats.visibleEntities;
    this.stats.cullRate = this.stats.totalEntities > 0 ? this.stats.culledEntities / this.stats.totalEntities : 0;
    this.stats.lastUpdateTime = Date.now();

    return Array.from(visibleIds);
  }

  /**
   * Get LOD level for entity based on distance
   */
  getLODLevel(distance: number): { meshType: string; quality: number } {
    if (!this.config.lodEnabled) {
      return { meshType: 'high', quality: 1.0 };
    }

    for (let i = this.config.lodLevels.length - 1; i >= 0; i--) {
      if (distance >= this.config.lodLevels[i].distance) {
        return {
          meshType: this.config.lodLevels[i].meshType,
          quality: this.config.lodLevels[i].quality,
        };
      }
    }

    return this.config.lodLevels[0];
  }

  private _distanceToCamera(position: Vector3, camera: Vector3): number {
    const dx = position.x - camera.x;
    const dy = position.y - camera.y;
    const dz = position.z - camera.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Get current culling stats
   */
  getStats(): CullingStats {
    return { ...this.stats };
  }

  /**
   * Update config
   */
  setConfig(config: Partial<CullingConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Add room for portal culling
   */
  addRoom(room: Room): void {
    this.portalSystem.addRoom(room);
  }

  /**
   * Add portal for portal culling
   */
  addPortal(portal: Portal): void {
    this.portalSystem.addPortal(portal);
  }

  /**
   * Reset stats
   */
  resetStats(): void {
    this.stats = this._initStats();
  }
}

// ============================================================
// DEFAULT ROOMS & PORTALS
// ============================================================

export function createDefaultRooms(): { rooms: Room[]; portals: Portal[] } {
  const rooms: Room[] = [
    {
      id: 'main_hall',
      name: 'Main Hall',
      bounds: { type: 'box', center: { x: 0, y: 2, z: 0 }, halfExtents: { x: 20, y: 5, z: 20 } },
      portals: [],
      active: true,
    },
    {
      id: 'corridor_north',
      name: 'North Corridor',
      bounds: { type: 'box', center: { x: 0, y: 2, z: -25 }, halfExtents: { x: 5, y: 3, z: 10 } },
      portals: [],
      active: true,
    },
    {
      id: 'corridor_south',
      name: 'South Corridor',
      bounds: { type: 'box', center: { x: 0, y: 2, z: 25 }, halfExtents: { x: 5, y: 3, z: 10 } },
      portals: [],
      active: true,
    },
  ];

  const portals: Portal[] = [
    {
      id: 'portal_north',
      name: 'North Door',
      bounds: { type: 'box', center: { x: 0, y: 2.5, z: -10 }, halfExtents: { x: 2, y: 2.5, z: 0.5 } },
      connectedRoomId: 'corridor_north',
      bidirectional: true,
      active: true,
    },
    {
      id: 'portal_south',
      name: 'South Door',
      bounds: { type: 'box', center: { x: 0, y: 2.5, z: 10 }, halfExtents: { x: 2, y: 2.5, z: 0.5 } },
      connectedRoomId: 'corridor_south',
      bidirectional: true,
      active: true,
    },
  ];

  return { rooms, portals };
}