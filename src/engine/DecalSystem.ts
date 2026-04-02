// ============================================================
// KEVLA ENGINE — Decal System v2.0
// Projected decals on surfaces
// ============================================================

import * as THREE from 'three';
import { type DecalConfig } from './types';

export class DecalSystem {
  private decals = new Map<string, { config: DecalConfig; mesh: THREE.Mesh; material: THREE.MeshDecalMaterial }>();
  private raycaster = new THREE.Raycaster();
  private tempMatrix = new THREE.Matrix4();

  create(id: string, config: Partial<DecalConfig>): THREE.Mesh {
    const geometry = new THREE.PlaneGeometry(config.size || 1, config.size || 1);
    geometry.rotateX(-Math.PI / 2);

    const material = new THREE.MeshDecalMaterial({
      color: new THREE.Color(config.color || '#ffffff'),
      transparent: true,
      opacity: 0.9,
      depthTest: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -4,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.frustumCulled = false;
    mesh.renderOrder = 999;

    const decal: DecalConfig = {
      id,
      name: config.name || 'Decal',
      textureAssetId: config.textureAssetId,
      normalMapAssetId: config.normalMapAssetId,
      color: config.color || '#ffffff',
      size: config.size || 1,
      angle: config.angle || 0,
    };

    this.decals.set(id, { config: decal, mesh, material });
    return mesh;
  }

  project(decalId: string, meshes: THREE.Object3D[], position: THREE.Vector3, direction: THREE.Vector3) {
    const decal = this.decals.get(decalId);
    if (!decal) return;

    this.raycaster.set(position, direction.clone().normalize());
    const intersects = this.raycaster.intersectObjects(meshes, true);

    if (intersects.length > 0) {
      const hit = intersects[0];
      const mesh = hit.object as THREE.Mesh;
      
      if (!mesh.geometry) return;

      this.tempMatrix.makeRotationFromEuler(new THREE.Euler(
        hit.face!.normal.x * decal.config.angle,
        hit.face!.normal.y * decal.config.angle + Math.PI / 2,
        hit.face!.normal.z * decal.config.angle
      ));

      const scale = decal.config.size;
      this.tempMatrix.scale(new THREE.Vector3(scale, scale, scale));
      this.tempMatrix.setPosition(hit.point);

      decal.mesh.position.copy(hit.point);
      decal.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), hit.face!.normal);
      decal.mesh.rotateZ(decal.config.angle * Math.PI / 180);
    }
  }

  remove(decalId: string) {
    const decal = this.decals.get(decalId);
    if (decal) {
      decal.mesh.geometry.dispose();
      decal.material.dispose();
      this.decals.delete(decalId);
    }
  }

  updateConfig(decalId: string, config: Partial<DecalConfig>) {
    const decal = this.decals.get(decalId);
    if (!decal) return;

    decal.config = { ...decal.config, ...config };
    
    if (config.color) {
      decal.material.color.set(config.color);
    }
    if (config.size) {
      const scale = config.size;
      decal.mesh.scale.setScalar(scale);
    }
    if (config.angle) {
      decal.mesh.rotation.z = config.angle * Math.PI / 180;
    }
  }

  getDecal(decalId: string) {
    return this.decals.get(decalId)?.mesh;
  }

  getAllDecals(): THREE.Mesh[] {
    return Array.from(this.decals.values()).map(d => d.mesh);
  }

  dispose() {
    this.decals.forEach((decal) => {
      decal.mesh.geometry.dispose();
      decal.material.dispose();
    });
    this.decals.clear();
  }
}

export const decalSystem = new DecalSystem();
