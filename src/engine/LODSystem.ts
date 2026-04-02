// ============================================================
// KEVLA ENGINE — LOD System v2.0
// Level-of-detail mesh switching
// ============================================================

import * as THREE from 'three';
import { type LODConfig, type LODLevel, DEFAULT_LOD_CONFIG, type MeshType } from './types';

export class LODSystem {
  private lodObjects = new Map<string, { config: LODConfig; levels: Map<number, THREE.Object3D>; currentLevel: number; currentMesh: THREE.Object3D | null }>();

  create(id: string, config: Partial<LODConfig>, getMeshForType: (meshType: MeshType | 'custom', assetId?: string) => THREE.Object3D | null): THREE.Object3D | null {
    const lodConfig: LODConfig = { ...DEFAULT_LOD_CONFIG, ...config };
    const levels = new Map<number, THREE.Object3D>();

    for (const level of lodConfig.levels) {
      let mesh: THREE.Object3D | null = null;
      
      if (level.modelAssetId) {
        mesh = getMeshForType('custom', level.modelAssetId);
      } else if (level.meshType) {
        mesh = getMeshForType(level.meshType);
      }
      
      if (mesh) {
        levels.set(level.distance, mesh);
        mesh.visible = false;
      }
    }

    const defaultLevel = lodConfig.levels[0];
    let currentMesh: THREE.Object3D | null = null;
    if (defaultLevel) {
      currentMesh = levels.get(defaultLevel.distance) || null;
      if (currentMesh) currentMesh.visible = true;
    }

    this.lodObjects.set(id, { config: lodConfig, levels, currentLevel: 0, currentMesh });
    return currentMesh;
  }

  update(id: string, cameraPosition: THREE.Vector3, objectPosition: THREE.Vector3) {
    const lod = this.lodObjects.get(id);
    if (!lod || !lod.config.enabled) return;

    const distance = cameraPosition.distanceTo(objectPosition);
    let newLevel = 0;

    for (let i = 0; i < lod.config.levels.length; i++) {
      if (distance >= lod.config.levels[i].distance) {
        newLevel = i;
      }
    }

    if (newLevel !== lod.currentLevel) {
      lod.currentMesh?.visible(false);
      lod.currentMesh = lod.levels.get(lod.config.levels[newLevel].distance) || null;
      if (lod.currentMesh) lod.currentMesh.visible = true;
      lod.currentLevel = newLevel;
    }
  }

  setEnabled(id: string, enabled: boolean) {
    const lod = this.lodObjects.get(id);
    if (!lod) return;
    
    lod.config.enabled = enabled;
    
    if (!enabled) {
      const defaultLevel = lod.config.levels[0];
      lod.currentMesh?.visible(false);
      lod.currentMesh = lod.levels.get(defaultLevel?.distance || 0) || null;
      if (lod.currentMesh) lod.currentMesh.visible = true;
    }
  }

  addLevel(id: string, level: LODLevel, getMeshForType: (meshType: MeshType | 'custom', assetId?: string) => THREE.Object3D | null) {
    const lod = this.lodObjects.get(id);
    if (!lod) return;

    let mesh: THREE.Object3D | null = null;
    if (level.modelAssetId) {
      mesh = getMeshForType('custom', level.modelAssetId);
    } else if (level.meshType) {
      mesh = getMeshForType(level.meshType);
    }

    if (mesh) {
      mesh.visible = false;
      lod.levels.set(level.distance, mesh);
      lod.config.levels.push(level);
      lod.config.levels.sort((a, b) => b.distance - a.distance);
    }
  }

  removeLevel(id: string, distance: number) {
    const lod = this.lodObjects.get(id);
    if (!lod || lod.config.levels.length <= 1) return;

    const mesh = lod.levels.get(distance);
    if (mesh) {
      if (mesh === lod.currentMesh) {
        lod.currentMesh?.visible(false);
        lod.currentMesh = null;
      }
      lod.levels.delete(distance);
      lod.config.levels = lod.config.levels.filter(l => l.distance !== distance);
    }
  }

  getCurrentMesh(id: string): THREE.Object3D | null {
    return this.lodObjects.get(id)?.currentMesh || null;
  }

  dispose() {
    this.lodObjects.forEach((lod) => {
      lod.levels.forEach((mesh) => {
        if (mesh instanceof THREE.Mesh) {
          mesh.geometry?.dispose();
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach(m => m.dispose());
          } else {
            mesh.material?.dispose();
          }
        }
      });
    });
    this.lodObjects.clear();
  }
}

export const lodSystem = new LODSystem();
