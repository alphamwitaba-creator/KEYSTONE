// ============================================================
// KEVLA ENGINE — Water System v2.0
// Dynamic water with reflections, waves, and foam
// ============================================================

import * as THREE from 'three';
import { type WaterConfig, DEFAULT_WATER_CONFIG } from './types';

export class WaterSystem {
  private waterMesh: THREE.Mesh | null = null;
  private config: WaterConfig = DEFAULT_WATER_CONFIG;
  private reflectionCamera: THREE.CubeCamera | null = null;
  private reflectionRenderTarget: THREE.WebGLRenderTarget | null = null;
  private time = 0;

  create(config: Partial<WaterConfig> = {}): THREE.Mesh {
    this.config = { ...DEFAULT_WATER_CONFIG, ...config };
    
    const geometry = new THREE.PlaneGeometry(this.config.size, this.config.size, this.config.subdivisions, this.config.subdivisions);
    geometry.rotateX(-Math.PI / 2);

    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        waterColor: { value: new THREE.Color(this.config.waterColor) },
        waterDepthColor: { value: new THREE.Color(this.config.waterDepthColor) },
        waveSpeed: { value: new THREE.Vector2(this.config.waveSpeed.x, this.config.waveSpeed.z) },
        waveHeight: { value: this.config.waveHeight },
        waveFrequency: { value: this.config.waveFrequency },
        reflectionTexture: { value: null },
        reflectionEnabled: { value: this.config.reflectionEnabled },
        reflectionDistortion: { value: this.config.reflectionDistortion },
        refractionEnabled: { value: this.config.refractionEnabled },
        refractionDistortion: { value: this.config.refractionDistortion },
        specularIntensity: { value: this.config.specularIntensity },
        specularPower: { value: this.config.specularPower },
        fadeDistance: { value: this.config.fadeDistance },
      },
      vertexShader: `
        uniform float time;
        uniform vec2 waveSpeed;
        uniform float waveHeight;
        uniform float waveFrequency;
        
        varying vec2 vUv;
        varying vec3 vWorldPosition;
        varying vec3 vNormal;
        
        void main() {
          vUv = uv;
          
          vec3 pos = position;
          
          float wave1 = sin(pos.x * waveFrequency + time * waveSpeed.x) * cos(pos.z * waveFrequency * 0.5 + time * waveSpeed.y);
          float wave2 = sin(pos.x * waveFrequency * 2.0 + time * waveSpeed.x * 1.5) * 0.5;
          float wave3 = cos(pos.z * waveFrequency * 1.5 + time * waveSpeed.y * 1.2) * 0.3;
          
          pos.y += (wave1 + wave2 + wave3) * waveHeight;
          
          // Calculate normal from wave derivatives
          float dx = cos(pos.x * waveFrequency + time * waveSpeed.x) * waveFrequency * waveHeight;
          float dz = -sin(pos.z * waveFrequency * 0.5 + time * waveSpeed.y) * waveFrequency * 0.5 * waveHeight;
          vNormal = normalize(vec3(-dx, 1.0, -dz));
          
          vec4 worldPos = modelMatrix * vec4(pos, 1.0);
          vWorldPosition = worldPos.xyz;
          
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 waterColor;
        uniform vec3 waterDepthColor;
        uniform sampler2D reflectionTexture;
        uniform bool reflectionEnabled;
        uniform float reflectionDistortion;
        uniform bool refractionEnabled;
        uniform float refractionDistortion;
        uniform float specularIntensity;
        uniform float specularPower;
        uniform float fadeDistance;
        
        varying vec2 vUv;
        varying vec3 vWorldPosition;
        varying vec3 vNormal;
        
        void main() {
          vec3 viewDir = normalize(cameraPosition - vWorldPosition);
          vec3 normal = normalize(vNormal);
          
          // Reflection
          vec3 reflectDir = reflect(-viewDir, normal);
          vec2 distortion = normal.xz * reflectionDistortion;
          
          vec3 reflectColor = waterColor;
          if (reflectionEnabled) {
            vec4 envColor = texture2D(reflectionTexture, reflectDir.xy * 0.5 + 0.5 + distortion);
            reflectColor = mix(waterColor, envColor.rgb, 0.5);
          }
          
          // Specular (sun reflection)
          vec3 lightDir = normalize(vec3(1.0, 1.0, 0.5));
          float spec = pow(max(dot(reflect(-lightDir, normal), viewDir), 0.0), specularPower);
          vec3 specular = spec * specularIntensity * vec3(1.0, 0.95, 0.8);
          
          // Fresnel effect
          float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), 3.0);
          
          // Depth fade
          float depth = length(vWorldPosition - cameraPosition);
          float fade = clamp(depth / fadeDistance, 0.0, 1.0);
          
          vec3 color = mix(waterDepthColor, reflectColor, fresnel);
          color += specular;
          color = mix(color, waterDepthColor, fade * 0.5);
          
          gl_FragColor = vec4(color, 0.85 - fade * 0.3);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
    });

    this.waterMesh = new THREE.Mesh(geometry, material);
    this.waterMesh.name = 'water';

    if (this.config.reflectionEnabled) {
      this.createReflection();
    }

    return this.waterMesh;
  }

  private createReflection() {
    const resolution = this.config.reflectionResolution;
    this.reflectionRenderTarget = new THREE.WebGLRenderTarget(resolution, resolution, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
    });
    this.reflectionCamera = new THREE.CubeCamera(0.1, 100, this.reflectionRenderTarget);
    if (this.waterMesh?.parent) {
      this.waterMesh.parent.add(this.reflectionCamera);
    }
  }

  update(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) {
    this.time += 0.016;
    
    if (this.waterMesh) {
      const material = this.waterMesh.material as THREE.ShaderMaterial;
      material.uniforms.time.value = this.time;
    }

    if (this.config.reflectionEnabled && this.reflectionCamera && this.waterMesh) {
      const mesh = this.waterMesh;
      mesh.visible = false;
      this.reflectionCamera.position.copy(mesh.position);
      this.reflectionCamera.update(renderer, scene);
      mesh.visible = true;
      
      const material = mesh.material as THREE.ShaderMaterial;
      material.uniforms.reflectionTexture.value = this.reflectionRenderTarget?.texture;
    }
  }

  setConfig(config: Partial<WaterConfig>) {
    this.config = { ...this.config, ...config };
    if (this.waterMesh) {
      this.waterMesh.geometry.dispose();
      (this.waterMesh.material as THREE.Material).dispose();
      this.waterMesh = null;
      this.create(this.config);
    }
  }

  getMesh(): THREE.Mesh | null {
    return this.waterMesh;
  }

  getConfig(): WaterConfig {
    return this.config;
  }

  dispose() {
    if (this.waterMesh) {
      this.waterMesh.geometry.dispose();
      (this.waterMesh.material as THREE.Material).dispose();
    }
    if (this.reflectionRenderTarget) {
      this.reflectionRenderTarget.dispose();
    }
  }
}

export const waterSystem = new WaterSystem();
