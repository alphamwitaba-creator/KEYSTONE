// ============================================================
// KEVLA ENGINE — Soft Body System v2.0
// Spring-mass cloth and deformable physics
// ============================================================

import * as THREE from 'three';
import { v3, type Vec3 } from './physics';

interface SoftParticle {
  position: Vec3;
  previousPosition: Vec3;
  velocity: Vec3;
  acceleration: Vec3;
  mass: number;
  pinned: boolean;
  normal: Vec3;
}

interface Spring {
  p1: number;
  p2: number;
  restLength: number;
  stiffness: number;
  damping: number;
}

interface Face {
  p1: number;
  p2: number;
  p3: number;
  normal: Vec3;
}

export class SoftBodySystem {
  private bodies = new Map<string, { particles: SoftParticle[]; springs: Spring[]; faces: Face[]; geometry: THREE.BufferGeometry; mesh: THREE.Mesh; mass: number; gravity: Vec3; damping: number }>();

  createCloth(
    id: string,
    width: number,
    height: number,
    segmentsW: number,
    segmentsH: number,
    position: Vec3,
    mass = 1,
    stiffness = 0.9,
    damping = 0.03,
    gravity = v3(0, -9.81, 0)
  ): THREE.Mesh {
    const particles: SoftParticle[] = [];
    const springs: Spring[] = [];
    const faces: Face[] = [];

    const spacingX = width / segmentsW;
    const spacingZ = height / segmentsH;

    for (let j = 0; j <= segmentsH; j++) {
      for (let i = 0; i <= segmentsW; i++) {
        const pinned = j === 0;
        particles.push({
          position: v3(position.x + i * spacingX - width / 2, position.y, position.z + j * spacingZ - height / 2),
          previousPosition: v3(position.x + i * spacingX - width / 2, position.y, position.z + j * spacingZ - height / 2),
          velocity: v3(),
          acceleration: v3(),
          mass: pinned ? 0 : mass / ((segmentsW + 1) * (segmentsH + 1)),
          pinned,
          normal: v3(0, 1, 0),
        });
      }
    }

    const idx = (i: number, j: number) => j * (segmentsW + 1) + i;

    const addSpring = (a: number, b: number, stiff: number) => {
      const pA = particles[a].position, pB = particles[b].position;
      const dx = pB.x - pA.x, dy = pB.y - pA.y, dz = pB.z - pA.z;
      const restLength = Math.sqrt(dx * dx + dy * dy + dz * dz);
      springs.push({ p1: a, p2: b, restLength, stiffness: stiff, damping });
    };

    for (let j = 0; j <= segmentsH; j++) {
      for (let i = 0; i <= segmentsW; i++) {
        if (i < segmentsW) addSpring(idx(i, j), idx(i + 1, j), stiffness);
        if (j < segmentsH) addSpring(idx(i, j), idx(i, j + 1), stiffness);
        if (i < segmentsW && j < segmentsH) addSpring(idx(i, j), idx(i + 1, j + 1), stiffness * 0.5);
        if (i < segmentsW && j < segmentsH) addSpring(idx(i + 1, j), idx(i, j + 1), stiffness * 0.5);
      }
    }

    const indices: number[] = [];
    for (let j = 0; j < segmentsH; j++) {
      for (let i = 0; i < segmentsW; i++) {
        const a = idx(i, j), b = idx(i + 1, j), c = idx(i, j + 1), d = idx(i + 1, j + 1);
        indices.push(a, b, c, b, d, c);
        const pA = particles[a].position, pB = particles[b].position, pC = particles[c].position;
        const e1 = v3(pB.x - pA.x, pB.y - pA.y, pB.z - pA.z);
        const e2 = v3(pC.x - pA.x, pC.y - pA.y, pC.z - pA.z);
        const n = v3(e1.y * e2.z - e1.z * e2.y, e1.z * e2.x - e1.x * e2.z, e1.x * e2.y - e1.y * e2.x);
        const len = Math.sqrt(n.x * n.x + n.y * n.y + n.z * n.z);
        faces.push({ p1: a, p2: b, p3: c, normal: v3(n.x / len, n.y / len, n.z / len) });
      }
    }

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particles.length * 3);
    const normals = new Float32Array(particles.length * 3);
    const uvs = new Float32Array(particles.length * 2);

    for (let j = 0; j <= segmentsH; j++) {
      for (let i = 0; i <= segmentsW; i++) {
        const idx2 = j * (segmentsW + 1) + i;
        uvs[idx2 * 2] = i / segmentsW;
        uvs[idx2 * 2 + 1] = j / segmentsH;
      }
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geometry.setIndex(indices);

    const material = new THREE.MeshStandardMaterial({
      color: '#c8a87a',
      side: THREE.DoubleSide,
      wireframe: false,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    this.bodies.set(id, { particles, springs, faces, geometry, mesh, mass, gravity, damping });
    return mesh;
  }

  createRope(
    id: string,
    start: Vec3,
    end: Vec3,
    segments: number,
    radius: number,
    mass = 0.5
  ): THREE.Mesh {
    const particles: SoftParticle[] = [];
    const springs: Spring[] = [];
    const spacing = 1 / segments;

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      particles.push({
        position: v3(
          start.x + (end.x - start.x) * t,
          start.y + (end.y - start.y) * t,
          start.z + (end.z - start.z) * t
        ),
        previousPosition: v3(
          start.x + (end.x - start.x) * t,
          start.y + (end.y - start.y) * t,
          start.z + (end.z - start.z) * t
        ),
        velocity: v3(),
        acceleration: v3(),
        mass: i === 0 ? 0 : mass / segments,
        pinned: i === 0,
        normal: v3(0, 1, 0),
      });
    }

    for (let i = 0; i < segments; i++) {
      const pA = particles[i].position, pB = particles[i + 1].position;
      const dx = pB.x - pA.x, dy = pB.y - pA.y, dz = pB.z - pA.z;
      const restLength = Math.sqrt(dx * dx + dy * dy + dz * dz);
      springs.push({ p1: i, p2: i + 1, restLength, stiffness: 1.0, damping: 0.02 });
    }

    const geometry = new THREE.CylinderGeometry(radius, radius, 1, 8, segments);
    const material = new THREE.MeshStandardMaterial({ color: '#8b7355', roughness: 0.8 });
    const mesh = new THREE.Mesh(geometry, material);

    this.bodies.set(id, { particles, springs, faces: [], geometry, mesh, mass, gravity: v3(0, -9.81, 0), damping: 0.02 });
    return mesh;
  }

  applyWind(id: string, direction: Vec3, strength: number) {
    const body = this.bodies.get(id);
    if (!body) return;
    body.gravity = v3(direction.x * strength, -9.81 + direction.y * strength, direction.z * strength);
  }

  pinParticle(id: string, particleIndex: number) {
    const body = this.bodies.get(id);
    if (body && body.particles[particleIndex]) {
      body.particles[particleIndex].pinned = true;
      body.particles[particleIndex].mass = 0;
    }
  }

  unpinParticle(id: string, particleIndex: number) {
    const body = this.bodies.get(id);
    if (body && body.particles[particleIndex]) {
      body.particles[particleIndex].pinned = false;
      body.particles[particleIndex].mass = body.mass / body.particles.length;
    }
  }

  update(id: string, dt: number) {
    const body = this.bodies.get(id);
    if (!body) return;

    const { particles, springs, gravity, damping } = body;
    const substeps = 4;
    const subDt = dt / substeps;

    for (let s = 0; s < substeps; s++) {
      for (const p of particles) {
        if (p.pinned) continue;

        const vx = (p.position.x - p.previousPosition.x) * (1 - damping);
        const vy = (p.position.y - p.previousPosition.y) * (1 - damping);
        const vz = (p.position.z - p.previousPosition.z) * (1 - damping);

        p.previousPosition = { ...p.position };

        p.position.x += vx + gravity.x * subDt * subDt;
        p.position.y += vy + gravity.y * subDt * subDt;
        p.position.z += vz + gravity.z * subDt * subDt;
      }

      for (const spring of springs) {
        const pA = particles[spring.p1], pB = particles[spring.p2];
        const dx = pB.position.x - pA.position.x;
        const dy = pB.position.y - pA.position.y;
        const dz = pB.position.z - pA.position.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.0001;
        const diff = (dist - spring.restLength) / dist;

        const moveX = dx * diff * spring.stiffness * 0.5;
        const moveY = dy * diff * spring.stiffness * 0.5;
        const moveZ = dz * diff * spring.stiffness * 0.5;

        if (!pA.pinned) {
          pA.position.x += moveX;
          pA.position.y += moveY;
          pA.position.z += moveZ;
        }
        if (!pB.pinned) {
          pB.position.x -= moveX;
          pB.position.y -= moveY;
          pB.position.z -= moveZ;
        }
      }
    }

    this.updateGeometry(id);
  }

  private updateGeometry(id: string) {
    const body = this.bodies.get(id);
    if (!body) return;

    const posAttr = body.geometry.getAttribute('position') as THREE.BufferAttribute;
    const normAttr = body.geometry.getAttribute('normal') as THREE.BufferAttribute;

    for (let i = 0; i < body.particles.length; i++) {
      const p = body.particles[i];
      posAttr.setXYZ(i, p.position.x, p.position.y, p.position.z);
    }

    body.geometry.computeVertexNormals();
    posAttr.needsUpdate = true;
  }

  getMesh(id: string): THREE.Mesh | undefined {
    return this.bodies.get(id)?.mesh;
  }

  dispose(id: string) {
    const body = this.bodies.get(id);
    if (body) {
      body.geometry.dispose();
      (body.mesh.material as THREE.Material).dispose();
      this.bodies.delete(id);
    }
  }

  disposeAll() {
    this.bodies.forEach((_, id) => this.dispose(id));
  }
}

export const softBodySystem = new SoftBodySystem();
