// ============================================================
// KEVLA ENGINE — Terrain System v2.0
// Heightmap terrain with layers, trees, and grass
// ============================================================

import * as THREE from 'three';
import { type TerrainConfig, type TerrainLayer, type TerrainTree, type TerrainGrass, DEFAULT_TERRAIN_CONFIG } from './types';

export class TerrainSystem {
  private terrainMesh: THREE.Mesh | null = null;
  private grassMesh: THREE.InstancedMesh | null = null;
  private config: TerrainConfig = DEFAULT_TERRAIN_CONFIG;
  private heightData: Float32Array | null = null;

  create(config: Partial<TerrainConfig> = {}): THREE.Mesh {
    this.config = { ...DEFAULT_TERRAIN_CONFIG, ...config };
    const { width, depth, height, resolution } = this.config;

    const geometry = new THREE.PlaneGeometry(width, depth, resolution, resolution);
    geometry.rotateX(-Math.PI / 2);

    const material = new THREE.MeshStandardMaterial({
      color: '#4a7c3f',
      roughness: 0.9,
      metalness: 0.0,
      flatShading: true,
    });

    this.terrainMesh = new THREE.Mesh(geometry, material);
    this.terrainMesh.receiveShadow = true;
    this.terrainMesh.castShadow = false;
    this.terrainMesh.name = 'terrain';

    this.generateHeightmap(geometry);
    this.updateTerrainLayers();

    return this.terrainMesh;
  }

  private generateHeightmap(geometry: THREE.BufferGeometry) {
    const posAttr = geometry.getAttribute('position');
    this.heightData = new Float32Array(posAttr.count);

    const simplex = this.createNoise2D();
    
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const z = posAttr.getZ(i);
      
      let h = 0;
      h += simplex.noise(x * 0.02, z * 0.02) * this.config.height * 0.5;
      h += simplex.noise(x * 0.05, z * 0.05) * this.config.height * 0.3;
      h += simplex.noise(x * 0.1, z * 0.1) * this.config.height * 0.15;
      h += simplex.noise(x * 0.2, z * 0.2) * this.config.height * 0.05;
      
      this.heightData[i] = h;
      posAttr.setY(i, h);
    }

    geometry.computeVertexNormals();
  }

  private createNoise2D() {
    return {
      noise: (x: number, y: number): number => {
        const X = Math.floor(x) & 255;
        const Y = Math.floor(y) & 255;
        x -= Math.floor(x);
        y -= Math.floor(y);
        const u = x * x * (3 - 2 * x);
        const v = y * y * (3 - 2 * y);
        const A = (X + Y * 256) % 256;
        const B = (X + 1 + Y * 256) % 256;
        const C = (X + (Y + 1) * 256) % 256;
        const D = (X + 1 + (Y + 1) * 256) % 256;
        const hash = (n: number) => Math.sin(n) * 43758.5453123 % 1;
        return (1 - v) * ((1 - u) * hash(A) + u * hash(B)) + v * ((1 - u) * hash(C) + u * hash(D)) - 0.5;
      },
    };
  }

  getHeightAt(x: number, z: number): number {
    if (!this.terrainMesh) return 0;
    const geometry = this.terrainMesh.geometry as THREE.PlaneGeometry;
    const { width, depth, resolution } = this.config;
    
    const halfW = width / 2;
    const halfD = depth / 2;
    const gridX = ((x + halfW) / width) * resolution;
    const gridZ = ((z + halfD) / depth) * resolution;
    
    const x0 = Math.floor(gridX);
    const z0 = Math.floor(gridZ);
    const x1 = Math.min(x0 + 1, resolution);
    const z1 = Math.min(z0 + 1, resolution);
    
    const fx = gridX - x0;
    const fz = gridZ - z0;
    
    const idx00 = z0 * (resolution + 1) + x0;
    const idx10 = z0 * (resolution + 1) + x1;
    const idx01 = z1 * (resolution + 1) + x0;
    const idx11 = z1 * (resolution + 1) + x1;
    
    if (!this.heightData) return 0;
    
    const h00 = this.heightData[idx00] || 0;
    const h10 = this.heightData[idx10] || 0;
    const h01 = this.heightData[idx01] || 0;
    const h11 = this.heightData[idx11] || 0;
    
    const h0 = h00 * (1 - fx) + h10 * fx;
    const h1 = h01 * (1 - fx) + h11 * fx;
    
    return h0 * (1 - fz) + h1 * fz;
  }

  private updateTerrainLayers() {
    if (!this.terrainMesh) return;
    
    const material = this.terrainMesh.material as THREE.MeshStandardMaterial;
    
    if (this.config.layers.length > 0) {
      const layer0 = this.config.layers[0];
      if (layer0?.textureAssetId) {
        const loader = new THREE.TextureLoader();
        loader.load(layer0.textureAssetId, (tex) => {
          tex.wrapS = THREE.RepeatWrapping;
          tex.wrapT = THREE.RepeatWrapping;
          tex.repeat.set(layer0.tileScale, layer0.tileScale);
          material.map = tex;
          material.needsUpdate = true;
        });
      }
    }
  }

  addLayer(layer: TerrainLayer) {
    this.config.layers.push(layer);
    this.updateTerrainLayers();
  }

  removeLayer(layerId: string) {
    this.config.layers = this.config.layers.filter(l => l.id !== layerId);
    this.updateTerrainLayers();
  }

  addTree(tree: TerrainTree) {
    this.config.trees.push(tree);
    this.createGrassInstance();
  }

  removeTree(treeId: string) {
    this.config.trees = this.config.trees.filter(t => t.id !== treeId);
    this.createGrassInstance();
  }

  private createGrassInstance() {
    if (this.grassMesh) {
      this.terrainMesh?.parent?.remove(this.grassMesh);
      this.grassMesh.geometry.dispose();
      (this.grassMesh.material as THREE.Material).dispose();
    }

    const { grass, width, depth, trees } = this.config;
    if (!grass.enabled || grass.density === 0) return;

    const grassGeometry = new THREE.PlaneGeometry(0.2, grass.maxHeight);
    grassGeometry.translate(0, grass.maxHeight / 2, 0);
    
    const grassMaterial = new THREE.MeshStandardMaterial({
      color: grass.color1,
      side: THREE.DoubleSide,
      alphaTest: 0.5,
    });

    this.grassMesh = new THREE.InstancedMesh(grassGeometry, grassMaterial, grass.density);
    this.grassMesh.receiveShadow = true;

    const dummy = new THREE.Object3D();
    for (let i = 0; i < grass.density; i++) {
      const x = (Math.random() - 0.5) * width;
      const z = (Math.random() - 0.5) * depth;
      const y = this.getHeightAt(x, z);
      
      dummy.position.set(x, y, z);
      dummy.rotation.y = Math.random() * Math.PI * 2;
      dummy.scale.setScalar(0.8 + Math.random() * 0.4);
      dummy.updateMatrix();
      this.grassMesh.setMatrixAt(i, dummy.matrix);
    }

    this.grassMesh.instanceMatrix.needsUpdate = true;
    this.terrainMesh?.parent?.add(this.grassMesh);
  }

  getMesh(): THREE.Mesh | null {
    return this.terrainMesh;
  }

  getGrassMesh(): THREE.InstancedMesh | null {
    return this.grassMesh;
  }

  setConfig(config: Partial<TerrainConfig>) {
    this.config = { ...this.config, ...config };
    if (this.terrainMesh) {
      this.terrainMesh.geometry.dispose();
      (this.terrainMesh.material as THREE.Material).dispose();
      this.terrainMesh = null;
      this.create(this.config);
    }
  }

  getConfig(): TerrainConfig {
    return this.config;
  }

  dispose() {
    if (this.terrainMesh) {
      this.terrainMesh.geometry.dispose();
      (this.terrainMesh.material as THREE.Material).dispose();
    }
    if (this.grassMesh) {
      this.grassMesh.geometry.dispose();
      (this.grassMesh.material as THREE.Material).dispose();
    }
  }
}

export const terrainSystem = new TerrainSystem();
