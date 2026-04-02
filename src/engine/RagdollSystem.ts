// ============================================================
// KEVLA ENGINE — Ragdoll System v2.0
// Skeleton physics with constraint joints
// ============================================================

import * as THREE from 'three';
import { v3, type Vec3, type PhysicsBody, type PhysicsWorld } from './physics';

export type RagdollPartType = 'sphere' | 'box';

export interface RagdollPart {
  id: string;
  name: string;
  type: RagdollPartType;
  position: Vec3;
  dimensions: Vec3;
  radius: number;
  mass: number;
  friction: number;
  restitution: number;
  mesh: THREE.Mesh;
  body: PhysicsBody | null;
}

export interface RagdollJoint {
  name: string;
  partA: string;
  partB: string;
  pivotA: Vec3;
  pivotB: Vec3;
  axisA: Vec3;
  axisB: Vec3;
  angularLowerLimit: number;
  angularUpperLimit: number;
  stiffness: number;
  damping: number;
  enabled: boolean;
}

export interface RagdollConfig {
  id: string;
  name: string;
  parts: RagdollPart[];
  joints: RagdollJoint[];
  color: string;
  enabled: boolean;
  isRagdoll: boolean;
  transitionSpeed: number;
}

function createRagdollPartMesh(part: RagdollPart, color: string): THREE.Mesh {
  let geometry: THREE.BufferGeometry;
  if (part.type === 'sphere') {
    geometry = new THREE.SphereGeometry(part.radius, 12, 8);
  } else {
    geometry = new THREE.BoxGeometry(part.dimensions.x, part.dimensions.y, part.dimensions.z);
  }

  const material = new THREE.MeshStandardMaterial({
    color,
    metalness: 0.2,
    roughness: 0.7,
    transparent: true,
    opacity: 0.85,
    wireframe: false,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.position.set(part.position.x, part.position.y, part.position.z);
  return mesh;
}

export class RagdollSystem {
  private ragdolls = new Map<string, RagdollConfig>();

  createHumanoid(
    id: string,
    rootPosition: Vec3,
    color = '#e8b89d',
    scale = 1
  ): RagdollConfig {
    const parts: RagdollPart[] = [
      {
        id: 'pelvis', name: 'Pelvis', type: 'box',
        position: v3(rootPosition.x, rootPosition.y + 0.9 * scale, rootPosition.z),
        dimensions: v3(0.35 * scale, 0.2 * scale, 0.2 * scale),
        radius: 0, mass: 15, friction: 0.5, restitution: 0.1,
        mesh: null as any, body: null as any,
      },
      {
        id: 'spine', name: 'Spine', type: 'box',
        position: v3(rootPosition.x, rootPosition.y + 1.2 * scale, rootPosition.z),
        dimensions: v3(0.3 * scale, 0.25 * scale, 0.18 * scale),
        radius: 0, mass: 12, friction: 0.5, restitution: 0.1,
        mesh: null as any, body: null as any,
      },
      {
        id: 'head', name: 'Head', type: 'sphere',
        position: v3(rootPosition.x, rootPosition.y + 1.6 * scale, rootPosition.z),
        dimensions: v3(), radius: 0.12 * scale, mass: 5, friction: 0.3, restitution: 0.2,
        mesh: null as any, body: null as any,
      },
      {
        id: 'upperArmL', name: 'Left Upper Arm', type: 'box',
        position: v3(rootPosition.x - 0.3 * scale, rootPosition.y + 1.25 * scale, rootPosition.z),
        dimensions: v3(0.08 * scale, 0.25 * scale, 0.08 * scale),
        radius: 0, mass: 3, friction: 0.5, restitution: 0.1,
        mesh: null as any, body: null as any,
      },
      {
        id: 'lowerArmL', name: 'Left Lower Arm', type: 'box',
        position: v3(rootPosition.x - 0.3 * scale, rootPosition.y + 0.95 * scale, rootPosition.z),
        dimensions: v3(0.07 * scale, 0.22 * scale, 0.07 * scale),
        radius: 0, mass: 2, friction: 0.5, restitution: 0.1,
        mesh: null as any, body: null as any,
      },
      {
        id: 'upperArmR', name: 'Right Upper Arm', type: 'box',
        position: v3(rootPosition.x + 0.3 * scale, rootPosition.y + 1.25 * scale, rootPosition.z),
        dimensions: v3(0.08 * scale, 0.25 * scale, 0.08 * scale),
        radius: 0, mass: 3, friction: 0.5, restitution: 0.1,
        mesh: null as any, body: null as any,
      },
      {
        id: 'lowerArmR', name: 'Right Lower Arm', type: 'box',
        position: v3(rootPosition.x + 0.3 * scale, rootPosition.y + 0.95 * scale, rootPosition.z),
        dimensions: v3(0.07 * scale, 0.22 * scale, 0.07 * scale),
        radius: 0, mass: 2, friction: 0.5, restitution: 0.1,
        mesh: null as any, body: null as any,
      },
      {
        id: 'upperLegL', name: 'Left Upper Leg', type: 'box',
        position: v3(rootPosition.x - 0.1 * scale, rootPosition.y + 0.55 * scale, rootPosition.z),
        dimensions: v3(0.12 * scale, 0.35 * scale, 0.12 * scale),
        radius: 0, mass: 8, friction: 0.6, restitution: 0.1,
        mesh: null as any, body: null as any,
      },
      {
        id: 'lowerLegL', name: 'Left Lower Leg', type: 'box',
        position: v3(rootPosition.x - 0.1 * scale, rootPosition.y + 0.2 * scale, rootPosition.z),
        dimensions: v3(0.1 * scale, 0.3 * scale, 0.1 * scale),
        radius: 0, mass: 5, friction: 0.7, restitution: 0.1,
        mesh: null as any, body: null as any,
      },
      {
        id: 'upperLegR', name: 'Right Upper Leg', type: 'box',
        position: v3(rootPosition.x + 0.1 * scale, rootPosition.y + 0.55 * scale, rootPosition.z),
        dimensions: v3(0.12 * scale, 0.35 * scale, 0.12 * scale),
        radius: 0, mass: 8, friction: 0.6, restitution: 0.1,
        mesh: null as any, body: null as any,
      },
      {
        id: 'lowerLegR', name: 'Right Lower Leg', type: 'box',
        position: v3(rootPosition.x + 0.1 * scale, rootPosition.y + 0.2 * scale, rootPosition.z),
        dimensions: v3(0.1 * scale, 0.3 * scale, 0.1 * scale),
        radius: 0, mass: 5, friction: 0.7, restitution: 0.1,
        mesh: null as any, body: null as any,
      },
    ];

    parts.forEach(p => { p.mesh = createRagdollPartMesh(p, color); });

    const joints: RagdollJoint[] = [
      {
        name: 'spine_pelvis', partA: 'spine', partB: 'pelvis',
        pivotA: v3(0, -0.12 * scale, 0), pivotB: v3(0, 0.1 * scale, 0),
        axisA: v3(1, 0, 0), axisB: v3(1, 0, 0),
        angularLowerLimit: -0.5, angularUpperLimit: 0.5,
        stiffness: 0.9, damping: 0.1, enabled: true,
      },
      {
        name: 'head_spine', partA: 'head', partB: 'spine',
        pivotA: v3(0, -0.12 * scale, 0), pivotB: v3(0, 0.12 * scale, 0),
        axisA: v3(1, 0, 0), axisB: v3(1, 0, 0),
        angularLowerLimit: -0.6, angularUpperLimit: 0.6,
        stiffness: 0.7, damping: 0.05, enabled: true,
      },
      {
        name: 'upperArmL_spine', partA: 'upperArmL', partB: 'spine',
        pivotA: v3(0.04 * scale, 0.12 * scale, 0), pivotB: v3(-0.15 * scale, 0.06 * scale, 0),
        axisA: v3(1, 0, 0), axisB: v3(1, 0, 0),
        angularLowerLimit: -2.0, angularUpperLimit: 2.0,
        stiffness: 0.8, damping: 0.08, enabled: true,
      },
      {
        name: 'lowerArmL_upperArmL', partA: 'lowerArmL', partB: 'upperArmL',
        pivotA: v3(0, 0.11 * scale, 0), pivotB: v3(0, -0.11 * scale, 0),
        axisA: v3(1, 0, 0), axisB: v3(1, 0, 0),
        angularLowerLimit: -2.5, angularUpperLimit: 0,
        stiffness: 0.7, damping: 0.05, enabled: true,
      },
      {
        name: 'upperArmR_spine', partA: 'upperArmR', partB: 'spine',
        pivotA: v3(-0.04 * scale, 0.12 * scale, 0), pivotB: v3(0.15 * scale, 0.06 * scale, 0),
        axisA: v3(1, 0, 0), axisB: v3(1, 0, 0),
        angularLowerLimit: -2.0, angularUpperLimit: 2.0,
        stiffness: 0.8, damping: 0.08, enabled: true,
      },
      {
        name: 'lowerArmR_upperArmR', partA: 'lowerArmR', partB: 'upperArmR',
        pivotA: v3(0, 0.11 * scale, 0), pivotB: v3(0, -0.11 * scale, 0),
        axisA: v3(1, 0, 0), axisB: v3(1, 0, 0),
        angularLowerLimit: -2.5, angularUpperLimit: 0,
        stiffness: 0.7, damping: 0.05, enabled: true,
      },
      {
        name: 'upperLegL_pelvis', partA: 'upperLegL', partB: 'pelvis',
        pivotA: v3(0, -0.17 * scale, 0), pivotB: v3(-0.1 * scale, 0.1 * scale, 0),
        axisA: v3(1, 0, 0), axisB: v3(1, 0, 0),
        angularLowerLimit: -1.5, angularUpperLimit: 1.5,
        stiffness: 0.85, damping: 0.1, enabled: true,
      },
      {
        name: 'lowerLegL_upperLegL', partA: 'lowerLegL', partB: 'upperLegL',
        pivotA: v3(0, -0.15 * scale, 0), pivotB: v3(0, 0.15 * scale, 0),
        axisA: v3(1, 0, 0), axisB: v3(1, 0, 0),
        angularLowerLimit: -2.5, angularUpperLimit: 0,
        stiffness: 0.75, damping: 0.08, enabled: true,
      },
      {
        name: 'upperLegR_pelvis', partA: 'upperLegR', partB: 'pelvis',
        pivotA: v3(0, -0.17 * scale, 0), pivotB: v3(0.1 * scale, 0.1 * scale, 0),
        axisA: v3(1, 0, 0), axisB: v3(1, 0, 0),
        angularLowerLimit: -1.5, angularUpperLimit: 1.5,
        stiffness: 0.85, damping: 0.1, enabled: true,
      },
      {
        name: 'lowerLegR_upperLegR', partA: 'lowerLegR', partB: 'upperLegR',
        pivotA: v3(0, -0.15 * scale, 0), pivotB: v3(0, 0.15 * scale, 0),
        axisA: v3(1, 0, 0), axisB: v3(1, 0, 0),
        angularLowerLimit: -2.5, angularUpperLimit: 0,
        stiffness: 0.75, damping: 0.08, enabled: true,
      },
    ];

    const config: RagdollConfig = {
      id,
      name: `Ragdoll_${id}`,
      parts,
      joints,
      color,
      enabled: true,
      isRagdoll: false,
      transitionSpeed: 0.1,
    };

    this.ragdolls.set(id, config);
    return config;
  }

  enableRagdoll(id: string, enable: boolean) {
    const ragdoll = this.ragdolls.get(id);
    if (ragdoll) ragdoll.isRagdoll = enable;
  }

  applyImpulseToPart(ragdollId: string, partId: string, impulse: Vec3) {
    const ragdoll = this.ragdolls.get(ragdollId);
    if (!ragdoll) return;
    const part = ragdoll.parts.find(p => p.id === partId);
    if (part?.body) {
      part.body.velocity.x += impulse.x * part.body.invMass;
      part.body.velocity.y += impulse.y * part.body.invMass;
      part.body.velocity.z += impulse.z * part.body.invMass;
    }
  }

  applyImpulse(ragdollId: string, impulse: Vec3) {
    const ragdoll = this.ragdolls.get(ragdollId);
    if (!ragdoll) return;
    ragdoll.parts.forEach(part => this.applyImpulseToPart(ragdollId, part.id, impulse));
  }

  setPosition(id: string, position: Vec3) {
    const ragdoll = this.ragdolls.get(id);
    if (!ragdoll) return;

    const pelvis = ragdoll.parts.find(p => p.id === 'pelvis');
    if (!pelvis) return;

    const offset = v3(
      position.x - pelvis.position.x,
      position.y - pelvis.position.y,
      position.z - pelvis.position.z
    );

    ragdoll.parts.forEach(part => {
      part.position.x += offset.x;
      part.position.y += offset.y;
      part.position.z += offset.z;
      part.mesh.position.set(part.position.x, part.position.y, part.position.z);
    });
  }

  update(id: string, dt: number, gravity = v3(0, -9.81, 0)) {
    const ragdoll = this.ragdolls.get(id);
    if (!ragdoll) return;

    for (const joint of ragdoll.joints) {
      if (!joint.enabled || !ragdoll.isRagdoll) continue;

      const partA = ragdoll.parts.find(p => p.id === joint.partA);
      const partB = ragdoll.parts.find(p => p.id === joint.partB);
      if (!partA || !partB) continue;

      const targetPivotA = v3(
        partA.position.x + joint.pivotA.x,
        partA.position.y + joint.pivotA.y,
        partA.position.z + joint.pivotA.z
      );
      const targetPivotB = v3(
        partB.position.x + joint.pivotB.x,
        partB.position.y + joint.pivotB.y,
        partB.position.z + joint.pivotB.z
      );

      const dx = targetPivotB.x - targetPivotA.x;
      const dy = targetPivotB.y - targetPivotA.y;
      const dz = targetPivotB.z - targetPivotA.z;

      const correction = v3(dx * joint.stiffness, dy * joint.stiffness, dz * joint.stiffness);
      const totalMass = partA.mass + partB.mass;
      const ratioA = partB.mass / totalMass;
      const ratioB = partA.mass / totalMass;

      partA.position.x += correction.x * ratioA;
      partA.position.y += correction.y * ratioA;
      partA.position.z += correction.z * ratioA;
      partB.position.x -= correction.x * ratioB;
      partB.position.y -= correction.y * ratioB;
      partB.position.z -= correction.z * ratioB;
    }

    ragdoll.parts.forEach(part => {
      if (part.body && part.body.mass > 0) {
        part.body.velocity.x += gravity.x * dt;
        part.body.velocity.y += gravity.y * dt;
        part.body.velocity.z += gravity.z * dt;

        part.body.velocity.x *= 0.99;
        part.body.velocity.y *= 0.99;
        part.body.velocity.z *= 0.99;

        part.position.x += part.body.velocity.x * dt;
        part.position.y += part.body.velocity.y * dt;
        part.position.z += part.body.velocity.z * dt;

        if (part.position.y < part.type === 'sphere' ? part.radius : part.dimensions.y / 2) {
          part.position.y = part.type === 'sphere' ? part.radius : part.dimensions.y / 2;
          part.body.velocity.y = 0;
        }

        part.mesh.position.set(part.position.x, part.position.y, part.position.z);
      }
    });
  }

  getMeshes(id: string): THREE.Mesh[] {
    return this.ragdolls.get(id)?.parts.map(p => p.mesh) || [];
  }

  getRagdoll(id: string): RagdollConfig | undefined {
    return this.ragdolls.get(id);
  }

  dispose(id: string) {
    const ragdoll = this.ragdolls.get(id);
    if (!ragdoll) return;
    ragdoll.parts.forEach(part => {
      part.mesh.geometry.dispose();
      (part.mesh.material as THREE.Material).dispose();
    });
    this.ragdolls.delete(id);
  }
}

export const ragdollSystem = new RagdollSystem();
