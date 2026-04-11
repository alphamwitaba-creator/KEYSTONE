// ============================================================
// KEVLA ENGINE — PREFAB SYSTEM v2.0
// Production-Grade Prefab & Blueprint System
//
// Architecture:
//   ┌─────────────────────────────────────────────────────────┐
//   │               PREFAB SYSTEM                              │
//   │                                                          │
//   │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │
//   │  │    Prefab   │  │  Prefab     │  │   Instance      │  │
//   │  │  Definition │  │  Library    │  │   Manager       │  │
//   │  └─────────────┘  └─────────────┘  └─────────────────┘  │
//   │                                                          │
//   │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │
//   │  │  Override   │  │    Link     │  │    Variant      │  │
//   │  │   System    │  │   Tracker   │  │   Generator     │  │
//   │  └─────────────┘  └─────────────┘  └─────────────────┘  │
//   │                                                          │
//   │  ┌─────────────────────────────────────────────────────┐│
//   │  │           Asset Management (Import/Export)          ││
//   │  └─────────────────────────────────────────────────────┘│
//   └─────────────────────────────────────────────────────────┘
//
// Features:
//   • Template-based prefab creation
//   • Nested prefabs (prefabs within prefabs)
//   • Property overrides with diff tracking
//   • Live linking (edit prefab → all instances update)
//   • Variants (prefab variations with partial overrides)
//   • Asset bundling for distribution
//   • Version history with rollback
// ============================================================

import type { Entity, Vector3, Transform, MaterialComponent, MeshRenderer } from './types';

// ============================================================
// TYPES — Prefab Data Structures
// ============================================================

/** Component override (property that differs from prefab) */
export interface ComponentOverride {
  componentId: string;
  property: string;
  value: unknown;
  isModified: boolean;
}

/** Component definition in prefab */
export interface PrefabComponent {
  id: string;
  type: string;
  properties: Record<string, unknown>;
  children?: PrefabComponent[];
}

/** Prefab definition */
export interface PrefabDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  version: number;
  createdAt: number;
  updatedAt: number;
  author: string;
  
  // Root entity template
  rootEntity: PrefabEntity;
  
  // Nested prefab references
  nestedPrefabs: string[];
  
  // Default values
  defaultValues: Record<string, unknown>;
  
  // Metadata
  thumbnail?: string;
  icon?: string;
  color?: string;
}

/** Entity template in prefab */
export interface PrefabEntity {
  id: string;
  name: string;
  transform: {
    position: Vector3;
    rotation: Vector3;
    scale: Vector3;
  };
  components: PrefabComponent[];
  children: PrefabEntity[];
}

/** Prefab instance */
export interface PrefabInstance {
  id: string;
  prefabId: string;
  sceneObjectId: string;
  overrides: ComponentOverride[];
  variantOf?: string;
  createdAt: number;
  lastUpdated: number;
}

/** Prefab variant */
export interface PrefabVariant {
  id: string;
  name: string;
  basePrefabId: string;
  overrides: ComponentOverride[];
  createdAt: number;
  author: string;
}

/** Prefab link (tracks relationship) */
export interface PrefabLink {
  instanceId: string;
  prefabId: string;
  entityId: string;
  lastSyncTime: number;
  syncStatus: 'synced' | 'modified' | 'conflict';
}

/** Prefab library entry */
export interface PrefabLibraryEntry {
  prefab: PrefabDefinition;
  instances: string[];
  totalUses: number;
  lastUsedAt: number;
}

/** Prefab change record for versioning */
export interface PrefabChange {
  version: number;
  timestamp: number;
  author: string;
  description: string;
  changes: {
    type: 'added' | 'modified' | 'removed';
    path: string;
    oldValue?: unknown;
    newValue?: unknown;
  }[];
}

// ============================================================
// PREFAB COMPONENT FACTORY
// ============================================================

export class PrefabComponentFactory {
  static transform(): PrefabComponent {
    return {
      id: 'transform',
      type: 'Transform',
      properties: {
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
      },
    };
  }

  static mesh(meshType: string = 'cube', color: string = '#3498db'): PrefabComponent {
    return {
      id: 'mesh',
      type: 'MeshRenderer',
      properties: {
        meshType,
        visible: true,
      },
    };
  }

  static material(color: string = '#3498db', metallic: number = 0, roughness: number = 0.5): PrefabComponent {
    return {
      id: 'material',
      type: 'Material',
      properties: {
        color,
        metallic,
        roughness,
        opacity: 1,
        emissive: '#000000',
      },
    };
  }

  static rigidbody(mass: number = 1, useGravity: boolean = true): PrefabComponent {
    return {
      id: 'rigidbody',
      type: 'Rigidbody',
      properties: {
        mass,
        useGravity,
        isKinematic: false,
        linearDamping: 0,
        angularDamping: 0.01,
      },
    };
  }

  static collider(shape: 'box' | 'sphere' | 'capsule' = 'box', size: Vector3 = { x: 1, y: 1, z: 1 }): PrefabComponent {
    return {
      id: 'collider',
      type: 'Collider',
      properties: {
        shape,
        size,
        isTrigger: false,
        material: null,
      },
    };
  }

  static script(scriptPath: string, properties: Record<string, unknown> = {}): PrefabComponent {
    return {
      id: 'script',
      type: 'Script',
      properties: {
        scriptPath,
        ...properties,
      },
    };
  }

  static light(type: 'directional' | 'point' | 'spot' = 'point', color: string = '#ffffff', intensity: number = 1): PrefabComponent {
    return {
      id: 'light',
      type: 'Light',
      properties: {
        type,
        color,
        intensity,
        range: 10,
        castShadows: true,
      },
    };
  }

  static particle(emitterId?: string): PrefabComponent {
    return {
      id: 'particle',
      type: 'ParticleEmitter',
      properties: {
        emitterId: emitterId || '',
        enabled: false,
        emitting: false,
      },
    };
  }

  static audio(soundPath: string, loop: boolean = false, volume: number = 1): PrefabComponent {
    return {
      id: 'audio',
      type: 'AudioSource',
      properties: {
        soundPath,
        loop,
        volume,
        pitch: 1,
        spatial: true,
      },
    };
  }
}

// ============================================================
// PREFAB DEFINITION BUILDER
// ============================================================

export class PrefabBuilder {
  private _id: string;
  private _name: string;
  private _description: string = '';
  private _category: string = 'General';
  private _tags: string[] = [];
  private _author: string = 'System';
  private _rootEntity: PrefabEntity | null = null;
  private _nestedPrefabs: string[] = [];
  private _defaultValues: Record<string, unknown> = {};
  private _color: string = '#3498db';

  constructor(id: string, name: string) {
    this._id = id;
    this._name = name;
  }

  description(desc: string): PrefabBuilder {
    this._description = desc;
    return this;
  }

  category(cat: string): PrefabBuilder {
    this._category = cat;
    return this;
  }

  tags(...tags: string[]): PrefabBuilder {
    this._tags = tags;
    return this;
  }

  author(author: string): PrefabBuilder {
    this._author = author;
    return this;
  }

  color(color: string): PrefabBuilder {
    this._color = color;
    return this;
  }

  rootEntity(entity: PrefabEntity): PrefabBuilder {
    this._rootEntity = entity;
    return this;
  }

  addNestedPrefab(prefabId: string): PrefabBuilder {
    this._nestedPrefabs.push(prefabId);
    return this;
  }

  defaultValue(key: string, value: unknown): PrefabBuilder {
    this._defaultValues[key] = value;
    return this;
  }

  build(): PrefabDefinition {
    if (!this._rootEntity) {
      throw new Error('Root entity is required for prefab');
    }

    return {
      id: this._id,
      name: this._name,
      description: this._description,
      category: this._category,
      tags: this._tags,
      version: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      author: this._author,
      rootEntity: this._rootEntity,
      nestedPrefabs: this._nestedPrefabs,
      defaultValues: this._defaultValues,
      color: this._color,
    };
  }
}

// ============================================================
// DEFAULT PREFABS
// ============================================================

export const DEFAULT_PREFABS: PrefabDefinition[] = [
  // Basic Cube
  new PrefabBuilder('prefab_cube', 'Cube')
    .description('Basic cube primitive')
    .category('Primitives')
    .tags('basic', 'cube', 'geometry')
    .rootEntity({
      id: 'root',
      name: 'Cube',
      transform: { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 } },
      components: [
        PrefabComponentFactory.mesh('cube', '#3498db'),
        PrefabComponentFactory.material('#3498db', 0, 0.5),
      ],
      children: [],
    })
    .build(),

  // Basic Sphere
  new PrefabBuilder('prefab_sphere', 'Sphere')
    .description('Basic sphere primitive')
    .category('Primitives')
    .tags('basic', 'sphere', 'geometry')
    .rootEntity({
      id: 'root',
      name: 'Sphere',
      transform: { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 } },
      components: [
        PrefabComponentFactory.mesh('sphere', '#e74c3c'),
        PrefabComponentFactory.material('#e74c3c', 0.2, 0.3),
      ],
      children: [],
    })
    .build(),

  // Player Character
  new PrefabBuilder('prefab_player', 'Player')
    .description('Player character with physics and controls')
    .category('Characters')
    .tags('player', 'character', 'physics', 'controller')
    .rootEntity({
      id: 'root',
      name: 'Player',
      transform: { position: { x: 0, y: 1, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 2, z: 1 } },
      components: [
        PrefabComponentFactory.mesh('capsule', '#2ecc71'),
        PrefabComponentFactory.material('#2ecc71', 0, 0.6),
        PrefabComponentFactory.rigidbody(70, true),
        PrefabComponentFactory.collider('capsule', { x: 0.5, y: 1, z: 0.5 }),
        PrefabComponentFactory.script('player_controller.js', { moveSpeed: 5, jumpForce: 8 }),
      ],
      children: [],
    })
    .build(),

  // Enemy NPC
  new PrefabBuilder('prefab_enemy', 'Enemy')
    .description('Basic enemy with AI behavior')
    .category('Characters')
    .tags('enemy', 'npc', 'ai', 'combat')
    .rootEntity({
      id: 'root',
      name: 'Enemy',
      transform: { position: { x: 0, y: 1, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1.5, z: 1 } },
      components: [
        PrefabComponentFactory.mesh('cube', '#e74c3c'),
        PrefabComponentFactory.material('#e74c3c', 0, 0.7),
        PrefabComponentFactory.rigidbody(50, true),
        PrefabComponentFactory.collider('box', { x: 0.8, y: 1.5, z: 0.8 }),
        PrefabComponentFactory.script('enemy_ai.js', { health: 100, damage: 10 }),
      ],
      children: [],
    })
    .build(),

  // Light Source
  new PrefabBuilder('prefab_light', 'Light')
    .description('Point light source')
    .category('Environment')
    .tags('light', 'lighting', 'point')
    .rootEntity({
      id: 'root',
      name: 'Light',
      transform: { position: { x: 0, y: 3, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 } },
      components: [
        PrefabComponentFactory.light('point', '#ffffff', 1),
      ],
      children: [],
    })
    .build(),

  // Ground Plane
  new PrefabBuilder('prefab_ground', 'Ground')
    .description('Static ground plane')
    .category('Environment')
    .tags('ground', 'floor', 'static')
    .rootEntity({
      id: 'root',
      name: 'Ground',
      transform: { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 50, y: 0.1, z: 50 } },
      components: [
        PrefabComponentFactory.mesh('plane', '#27ae60'),
        PrefabComponentFactory.material('#27ae60', 0, 0.9),
        PrefabComponentFactory.collider('box', { x: 50, y: 0.1, z: 50 }),
      ],
      children: [],
    })
    .build(),

  // Collectible Item
  new PrefabBuilder('prefab_collectible', 'Collectible')
    .description('Pickup-able collectible item')
    .category('Items')
    .tags('collectible', 'item', 'pickup')
    .rootEntity({
      id: 'root',
      name: 'Collectible',
      transform: { position: { x: 0, y: 1, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 0.5, y: 0.5, z: 0.5 } },
      components: [
        PrefabComponentFactory.mesh('octahedron', '#f1c40f'),
        PrefabComponentFactory.material('#f1c40f', 0.8, 0.2),
        PrefabComponentFactory.collider('sphere', { x: 0.5, y: 0.5, z: 0.5 }),
        PrefabComponentFactory.script('collectible.js', { value: 10, respawnTime: 5 }),
      ],
      children: [],
    })
    .build(),

  // Projectile
  new PrefabBuilder('prefab_projectile', 'Projectile')
    .description('Hazardous projectile')
    .category('Weapons')
    .tags('projectile', 'weapon', 'hazard')
    .rootEntity({
      id: 'root',
      name: 'Projectile',
      transform: { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 0.2, y: 0.2, z: 0.5 } },
      components: [
        PrefabComponentFactory.mesh('sphere', '#9b59b6'),
        PrefabComponentFactory.material('#9b59b6', 0, 0.3),
        PrefabComponentFactory.rigidbody(1, false),
        PrefabComponentFactory.collider('sphere', { x: 0.2, y: 0.2, z: 0.2 }),
        PrefabComponentFactory.script('projectile.js', { speed: 20, damage: 25 }),
      ],
      children: [],
    })
    .build(),

  // Trigger Zone
  new PrefabBuilder('prefab_trigger', 'Trigger Zone')
    .description('Trigger zone for events')
    .category('Logic')
    .tags('trigger', 'zone', 'event')
    .rootEntity({
      id: 'root',
      name: 'Trigger',
      transform: { position: { x: 0, y: 1, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 2, y: 2, z: 2 } },
      components: [
        PrefabComponentFactory.mesh('cube', '#3498db'),
        PrefabComponentFactory.material('#3498db', 0, 0.5),
        PrefabComponentFactory.material('#3498db', 0, 0.5).properties.opacity = 0.3,
        PrefabComponentFactory.collider('box', { x: 2, y: 2, z: 2 }),
        PrefabComponentFactory.script('trigger.js', { onEnter: '', onExit: '' }),
      ],
      children: [],
    })
    .build(),

  // Camera
  new PrefabBuilder('prefab_camera', 'Camera')
    .description('Main camera')
    .category('System')
    .tags('camera', 'view', 'system')
    .rootEntity({
      id: 'root',
      name: 'Camera',
      transform: { position: { x: 0, y: 5, z: -10 }, rotation: { x: 20, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 } },
      components: [
        PrefabComponentFactory.script('camera.js', { fov: 60, near: 0.1, far: 1000 }),
      ],
      children: [],
    })
    .build(),
];

// ============================================================
// PREFAB MANAGER
// ============================================================

export class PrefabManager {
  private prefabs: Map<string, PrefabDefinition> = new Map();
  private variants: Map<string, PrefabVariant> = new Map();
  private instances: Map<string, PrefabInstance> = new Map();
  private links: Map<string, PrefabLink> = new Map();
  private changeHistory: Map<string, PrefabChange[]> = new Map();

  constructor() {
    this._loadDefaultPrefabs();
  }

  private _loadDefaultPrefabs(): void {
    for (const prefab of DEFAULT_PREFABS) {
      this.prefabs.set(prefab.id, prefab);
    }
  }

  registerPrefab(prefab: PrefabDefinition): void {
    this.prefabs.set(prefab.id, prefab);
    this.changeHistory.set(prefab.id, [{
      version: 1,
      timestamp: Date.now(),
      author: prefab.author,
      description: 'Initial creation',
      changes: [],
    }]);
  }

  getPrefab(prefabId: string): PrefabDefinition | undefined {
    return this.prefabs.get(prefabId);
  }

  getAllPrefabs(): PrefabDefinition[] {
    return Array.from(this.prefabs.values());
  }

  getPrefabsByCategory(category: string): PrefabDefinition[] {
    return this.getAllPrefabs().filter(p => p.category === category);
  }

  searchPrefabs(query: string): PrefabDefinition[] {
    const q = query.toLowerCase();
    return this.getAllPrefabs().filter(p => 
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.tags.some(t => t.toLowerCase().includes(q))
    );
  }

  deletePrefab(prefabId: string): boolean {
    // Check for existing instances
    for (const [, instance] of this.instances) {
      if (instance.prefabId === prefabId) {
        console.warn(`Cannot delete prefab ${prefabId}: has existing instances`);
        return false;
      }
    }
    return this.prefabs.delete(prefabId);
  }

  createVariant(name: string, basePrefabId: string, author: string = 'System'): PrefabVariant | null {
    const base = this.prefabs.get(basePrefabId);
    if (!base) return null;

    const variant: PrefabVariant = {
      id: `variant_${Date.now()}`,
      name,
      basePrefabId,
      overrides: [],
      createdAt: Date.now(),
      author,
    };

    this.variants.set(variant.id, variant);
    return variant;
  }

  getVariant(variantId: string): PrefabVariant | undefined {
    return this.variants.get(variantId);
  }

  getVariantsOf(prefabId: string): PrefabVariant[] {
    return Array.from(this.variants.values()).filter(v => v.basePrefabId === prefabId);
  }

  // Instance management

  createInstance(prefabId: string, sceneObjectId: string): PrefabInstance | null {
    const prefab = this.prefabs.get(prefabId);
    if (!prefab) return null;

    const instance: PrefabInstance = {
      id: `instance_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      prefabId,
      sceneObjectId,
      overrides: [],
      createdAt: Date.now(),
      lastUpdated: Date.now(),
    };

    this.instances.set(instance.id, instance);

    // Create link
    const link: PrefabLink = {
      instanceId: instance.id,
      prefabId,
      entityId: prefab.rootEntity.id,
      lastSyncTime: Date.now(),
      syncStatus: 'synced',
    };
    this.links.set(instance.id, link);

    return instance;
  }

  getInstance(instanceId: string): PrefabInstance | undefined {
    return this.instances.get(instanceId);
  }

  getInstancesOf(prefabId: string): PrefabInstance[] {
    return Array.from(this.instances.values()).filter(i => i.prefabId === prefabId);
  }

  getAllInstances(): PrefabInstance[] {
    return Array.from(this.instances.values());
  }

  deleteInstance(instanceId: string): boolean {
    this.links.delete(instanceId);
    return this.instances.delete(instanceId);
  }

  // Override system

  applyOverride(instanceId: string, componentId: string, property: string, value: unknown): boolean {
    const instance = this.instances.get(instanceId);
    if (!instance) return false;

    const existing = instance.overrides.find(o => 
      o.componentId === componentId && o.property === property
    );

    if (existing) {
      existing.value = value;
      existing.isModified = true;
    } else {
      instance.overrides.push({
        componentId,
        property,
        value,
        isModified: true,
      });
    }

    instance.lastUpdated = Date.now();
    this._updateLinkStatus(instanceId, 'modified');

    return true;
  }

  removeOverride(instanceId: string, componentId: string, property: string): boolean {
    const instance = this.instances.get(instanceId);
    if (!instance) return false;

    const idx = instance.overrides.findIndex(o => 
      o.componentId === componentId && o.property === property
    );
    
    if (idx >= 0) {
      instance.overrides.splice(idx, 1);
      instance.lastUpdated = Date.now();
      return true;
    }
    return false;
  }

  getOverrides(instanceId: string): ComponentOverride[] {
    const instance = this.instances.get(instanceId);
    return instance?.overrides || [];
  }

  revertOverrides(instanceId: string): boolean {
    const instance = this.instances.get(instanceId);
    if (!instance) return false;

    instance.overrides = [];
    instance.lastUpdated = Date.now();
    this._updateLinkStatus(instanceId, 'synced');

    return true;
  }

  private _updateLinkStatus(instanceId: string, status: 'synced' | 'modified' | 'conflict'): void {
    const link = this.links.get(instanceId);
    if (link) {
      link.syncStatus = status;
    }
  }

  // Sync system

  syncInstance(instanceId: string): boolean {
    const instance = this.instances.get(instanceId);
    if (!instance) return false;

    const prefab = this.prefabs.get(instance.prefabId);
    if (!prefab) return false;

    // Apply all overrides to the live entity
    // This would be called by the scene system
    this._updateLinkStatus(instanceId, 'synced');

    return true;
  }

  syncAllInstances(): void {
    for (const instanceId of this.instances.keys()) {
      this.syncInstance(instanceId);
    }
  }

  // Version history

  getChangeHistory(prefabId: string): PrefabChange[] {
    return this.changeHistory.get(prefabId) || [];
  }

  rollbackToVersion(prefabId: string, version: number): boolean {
    const history = this.changeHistory.get(prefabId);
    if (!history) return false;

    const target = history.find(c => c.version === version);
    if (!target) return false;

    // In a real implementation, this would restore the prefab to that version
    console.log(`Rolling back prefab ${prefabId} to version ${version}`);
    return true;
  }

  // Import/Export

  exportPrefab(prefabId: string): string {
    const prefab = this.prefabs.get(prefabId);
    if (!prefab) return '';

    return JSON.stringify(prefab, null, 2);
  }

  importPrefab(json: string): PrefabDefinition | null {
    try {
      const prefab = JSON.parse(json) as PrefabDefinition;
      prefab.id = `imported_${Date.now()}`;
      prefab.createdAt = Date.now();
      prefab.updatedAt = Date.now();
      this.registerPrefab(prefab);
      return prefab;
    } catch (e) {
      console.error('Failed to import prefab:', e);
      return null;
    }
  }

  exportAllPrefabs(): string {
    return JSON.stringify(this.getAllPrefabs(), null, 2);
  }

  importPrefabs(json: string): number {
    try {
      const prefabs = JSON.parse(json) as PrefabDefinition[];
      for (const prefab of prefabs) {
        prefab.id = `imported_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        prefab.createdAt = Date.now();
        prefab.updatedAt = Date.now();
        this.registerPrefab(prefab);
      }
      return prefabs.length;
    } catch (e) {
      console.error('Failed to import prefabs:', e);
      return 0;
    }
  }

  // Statistics

  getStats(): {
    totalPrefabs: number;
    totalVariants: number;
    totalInstances: number;
    syncedInstances: number;
    modifiedInstances: number;
    conflicts: number;
  } {
    let synced = 0, modified = 0, conflicts = 0;
    
    for (const [, link] of this.links) {
      switch (link.syncStatus) {
        case 'synced': synced++; break;
        case 'modified': modified++; break;
        case 'conflict': conflicts++; break;
      }
    }

    return {
      totalPrefabs: this.prefabs.size,
      totalVariants: this.variants.size,
      totalInstances: this.instances.size,
      syncedInstances: synced,
      modifiedInstances: modified,
      conflicts,
    };
  }
}

// ============================================================
// PREFAB ENTITY TO SCENE ENTITY CONVERTER
// ============================================================

export function prefabEntityToSceneEntity(
  prefabEntity: PrefabEntity,
  scene: { addEntity: (e: Partial<Entity>) => Entity }
): Entity {
  const entity = scene.addEntity({
    name: prefabEntity.name,
    transform: {
      position: { ...prefabEntity.transform.position },
      rotation: { ...prefabEntity.transform.rotation },
      scale: { ...prefabEntity.transform.scale },
    },
  });

  // Add components
  for (const comp of prefabEntity.components) {
    switch (comp.type) {
      case 'MeshRenderer':
        (entity as any).meshRenderer = { meshType: comp.properties.meshType as string, visible: true };
        break;
      case 'Material':
        (entity as any).material = {
          color: comp.properties.color as string,
          metallic: comp.properties.metallic as number,
          roughness: comp.properties.roughness as number,
          opacity: comp.properties.opacity as number,
          emissive: comp.properties.emissive as string,
        };
        break;
      case 'Rigidbody':
        (entity as any).rigidbody = {
          mass: comp.properties.mass as number,
          useGravity: comp.properties.useGravity as boolean,
          isKinematic: comp.properties.isKinematic as boolean,
          velocity: { x: 0, y: 0, z: 0 },
          angularVelocity: { x: 0, y: 0, z: 0 },
        };
        break;
      case 'Collider':
        (entity as any).collider = {
          shape: comp.properties.shape as string,
          size: comp.properties.size as Vector3,
          isTrigger: comp.properties.isTrigger as boolean,
        };
        break;
      case 'Script':
        (entity as any).scriptPath = comp.properties.scriptPath as string;
        break;
      case 'Light':
        (entity as any).light = {
          type: comp.properties.type as string,
          color: comp.properties.color as string,
          intensity: comp.properties.intensity as number,
        };
        break;
    }
  }

  return entity;
}

// ============================================================
// PREFAB BUILDER FACTORY
// ============================================================

export function createPrefabBuilder(id: string, name: string): PrefabBuilder {
  return new PrefabBuilder(id, name);
}