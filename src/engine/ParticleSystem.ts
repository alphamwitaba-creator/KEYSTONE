// ============================================================
// KEVLA ENGINE — Particle System v2.0
// GPU-accelerated particle effects
// ============================================================

import * as THREE from 'three';
import { type ParticleEmitter, DEFAULT_PARTICLE_EMITTER } from './types';

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: THREE.Color;
  size: number;
  rotation: number;
  rotationSpeed: number;
  life: number;
  maxLife: number;
}

export class ParticleSystem {
  private emitters = new Map<string, { config: ParticleEmitter; particles: Particle[]; mesh: THREE.Points; material: THREE.ShaderMaterial; nextEmitTime: number; emitAccumulator: number }>();
  private globalTime = 0;

  createEmitter(id: string, config: Partial<ParticleEmitter> = {}): string {
    const emitter: ParticleEmitter = { ...DEFAULT_PARTICLE_EMITTER, ...config, id };
    const geometry = new THREE.BufferGeometry();
    const maxParticles = emitter.maxParticles;
    
    const positions = new Float32Array(maxParticles * 3);
    const colors = new Float32Array(maxParticles * 3);
    const sizes = new Float32Array(maxParticles);
    const rotations = new Float32Array(maxParticles);
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('rotation', new THREE.BufferAttribute(rotations, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        pointTexture: { value: this.createParticleTexture() },
      },
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        attribute float rotation;
        varying vec3 vColor;
        varying float vRotation;
        void main() {
          vColor = color;
          vRotation = rotation;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform sampler2D pointTexture;
        varying vec3 vColor;
        varying float vRotation;
        void main() {
          vec2 uv = gl_PointCoord;
          float c = cos(vRotation), s = sin(vRotation);
          uv = vec2(c * (uv.x - 0.5) - s * (uv.y - 0.5) + 0.5, s * (uv.x - 0.5) + c * (uv.y - 0.5) + 0.5);
          vec4 tex = texture2D(pointTexture, uv);
          gl_FragColor = vec4(vColor, tex.a);
        }
      `,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
    });

    const mesh = new THREE.Points(geometry, material);
    mesh.frustumCulled = false;
    
    this.emitters.set(id, { config: emitter, particles: [], mesh, material, nextEmitTime: 0, emitAccumulator: 0 });
    return id;
  }

  private createParticleTexture(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.3, 'rgba(255,255,255,0.8)');
    gradient.addColorStop(0.7, 'rgba(255,255,255,0.2)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    
    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  removeEmitter(id: string) {
    const emitter = this.emitters.get(id);
    if (emitter) {
      emitter.mesh.geometry.dispose();
      emitter.material.dispose();
      this.emitters.delete(id);
    }
  }

  getEmitterMesh(id: string): THREE.Points | undefined {
    return this.emitters.get(id)?.mesh;
  }

  updateEmitterConfig(id: string, config: Partial<ParticleEmitter>) {
    const emitter = this.emitters.get(id);
    if (emitter) {
      emitter.config = { ...emitter.config, ...config };
    }
  }

  play(id: string) {
    const emitter = this.emitters.get(id);
    if (emitter) emitter.config.emitting = true;
  }

  stop(id: string) {
    const emitter = this.emitters.get(id);
    if (emitter) emitter.config.emitting = false;
  }

  emit(id: string, position: THREE.Vector3, dt: number) {
    const emitter = this.emitters.get(id);
    if (!emitter || !emitter.config.emitting) return;

    const config = emitter.config;
    const rate = config.rate + (config.rateMin - config.rate) * Math.random();
    emitter.emitAccumulator += rate * dt;

    while (emitter.emitAccumulator >= 1 && emitter.particles.length < config.maxParticles) {
      emitter.emitAccumulator -= 1;
      
      const particle: Particle = {
        position: position.clone(),
        velocity: this.getEmitVelocity(config, position),
        color: new THREE.Color(config.startColor),
        size: config.startSize + (config.startSizeMax - config.startSizeMin) * Math.random(),
        rotation: config.startRotation + (config.startRotationMin - config.startRotation) * Math.random(),
        rotationSpeed: config.rotationSpeed + (config.rotationSpeedMin - config.rotationSpeed) * Math.random(),
        life: 0,
        maxLife: config.startLifetime + (config.startLifetimeMin - config.startLifetime) * Math.random(),
      };
      
      if (config.shape === 'sphere') {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = config.shapeRadius * Math.random();
        particle.position.add(new THREE.Vector3(
          r * Math.sin(phi) * Math.cos(theta),
          r * Math.sin(phi) * Math.sin(theta),
          r * Math.cos(phi)
        ));
      } else if (config.shape === 'cone') {
        const angle = Math.random() * Math.PI * 2;
        const h = Math.random();
        const radius = h * Math.tan(config.shapeAngle * Math.PI / 180);
        particle.position.add(new THREE.Vector3(
          radius * Math.cos(angle),
          h,
          radius * Math.sin(angle)
        ));
      } else if (config.shape === 'box') {
        particle.position.add(new THREE.Vector3(
          (Math.random() - 0.5) * config.shapeBox.x,
          (Math.random() - 0.5) * config.shapeBox.y,
          (Math.random() - 0.5) * config.shapeBox.z
        ));
      }

      emitter.particles.push(particle);
    }
  }

  private getEmitVelocity(config: ParticleEmitter, origin: THREE.Vector3): THREE.Vector3 {
    let dir: THREE.Vector3;
    switch (config.shape) {
      case 'sphere':
        dir = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
        break;
      case 'cone':
        const angle = Math.random() * Math.PI * 2;
        const spread = Math.tan(config.shapeAngle * Math.PI / 180);
        dir = new THREE.Vector3(
          Math.cos(angle) * spread,
          1,
          Math.sin(angle) * spread
        ).normalize();
        break;
      default:
        dir = new THREE.Vector3(0, 1, 0);
    }
    const speed = config.startSpeed + (config.startSpeedMin - config.startSpeed) * Math.random();
    return dir.multiplyScalar(speed);
  }

  update(id: string, dt: number, cameraPosition?: THREE.Vector3) {
    const emitter = this.emitters.get(id);
    if (!emitter) return;

    const config = emitter.config;
    const positions = emitter.mesh.geometry.getAttribute('position') as THREE.BufferAttribute;
    const colors = emitter.mesh.geometry.getAttribute('color') as THREE.BufferAttribute;
    const sizes = emitter.mesh.geometry.getAttribute('size') as THREE.BufferAttribute;
    const rotations = emitter.mesh.geometry.getAttribute('rotation') as THREE.BufferAttribute;

    for (let i = emitter.particles.length - 1; i >= 0; i--) {
      const p = emitter.particles[i];
      p.life += dt;

      if (p.life >= p.maxLife) {
        emitter.particles.splice(i, 1);
        continue;
      }

      p.velocity.y -= config.gravity * dt;
      p.position.add(p.velocity.clone().multiplyScalar(dt));
      p.rotation += p.rotationSpeed * dt;

      const lifeRatio = p.life / p.maxLife;
      const sizeMultiplier = config.sizeMultiplier * (1 - lifeRatio);
      const currentSize = p.size * sizeMultiplier;

      if (i < positions.count) {
        positions.setXYZ(i, p.position.x, p.position.y, p.position.z);
        colors.setXYZ(i, p.color.r, p.color.g, p.color.b);
        sizes.setX(i, currentSize);
        rotations.setX(i, p.rotation);
      }
    }

    for (let i = emitter.particles.length; i < positions.count; i++) {
      positions.setXYZ(i, 0, -10000, 0);
      sizes.setX(i, 0);
    }

    positions.needsUpdate = true;
    colors.needsUpdate = true;
    sizes.needsUpdate = true;
    rotations.needsUpdate = true;
  }

  updateAll(dt: number, cameraPosition?: THREE.Vector3) {
    this.globalTime += dt;
    this.emitters.forEach((emitter, id) => {
      this.update(id, dt, cameraPosition);
    });
  }

  getEmitterCount(): number {
    return this.emitters.size;
  }

  dispose() {
    this.emitters.forEach((_, id) => this.removeEmitter(id));
  }
}

export const particleSystem = new ParticleSystem();
