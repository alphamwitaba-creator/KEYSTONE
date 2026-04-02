// ============================================================
// KEVLA ENGINE — Character Controller System v2.0
// Capsule-based character movement
// ============================================================

import * as THREE from 'three';
import { v3, type Vec3 } from './physics';

export interface CharacterState {
  position: Vec3;
  velocity: Vec3;
  rotationY: number;
  isGrounded: boolean;
  isJumping: boolean;
  isCrouching: boolean;
  isSprinting: boolean;
  canJump: boolean;
  jumpCooldown: number;
  groundContactTime: number;
}

export interface CharacterControllerConfig {
  id: string;
  height: number;
  radius: number;
  crouchHeight: number;
  walkSpeed: number;
  runSpeed: number;
  jumpForce: number;
  gravity: number;
  groundFriction: number;
  airFriction: number;
  airControl: number;
  maxFallSpeed: number;
  stepHeight: number;
  skinWidth: number;
  slopeLimit: number;
  mass: number;
  color: string;
}

const DEFAULT_CHARACTER_CONFIG: CharacterControllerConfig = {
  id: '',
  height: 1.8,
  radius: 0.4,
  crouchHeight: 1.0,
  walkSpeed: 5.0,
  runSpeed: 10.0,
  jumpForce: 8.0,
  gravity: 20.0,
  groundFriction: 10.0,
  airFriction: 0.5,
  airControl: 0.3,
  maxFallSpeed: 50.0,
  stepHeight: 0.3,
  skinWidth: 0.08,
  slopeLimit: 45,
  mass: 80,
  color: '#4488ff',
};

export class CharacterControllerSystem {
  private characters = new Map<string, {
    config: CharacterControllerConfig;
    state: CharacterState;
    mesh: THREE.Mesh;
    scene: THREE.Scene;
    capsuleMesh: THREE.Mesh | null;
    debugMesh: THREE.Mesh | null;
  }>();

  create(
    id: string,
    scene: THREE.Scene,
    position: Vec3,
    config?: Partial<CharacterControllerConfig>
  ): { mesh: THREE.Mesh; state: CharacterState } {
    const cfg: CharacterControllerConfig = { ...DEFAULT_CHARACTER_CONFIG, ...config, id };

    const geo = new THREE.CapsuleGeometry(cfg.radius, cfg.height - cfg.radius * 2, 4, 8);
    const mat = new THREE.MeshStandardMaterial({
      color: cfg.color,
      metalness: 0.3,
      roughness: 0.7,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(position.x, position.y + cfg.height / 2, position.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);

    const capsuleGeo = new THREE.CapsuleGeometry(cfg.radius, cfg.height - cfg.radius * 2, 4, 8);
    const capsuleMat = new THREE.MeshBasicMaterial({ color: cfg.color, transparent: true, opacity: 0.3, wireframe: true });
    const capsuleMesh = new THREE.Mesh(capsuleGeo, capsuleMat);
    capsuleMesh.visible = false;
    scene.add(capsuleMesh);

    const state: CharacterState = {
      position: { ...position },
      velocity: v3(),
      rotationY: 0,
      isGrounded: false,
      isJumping: false,
      isCrouching: false,
      isSprinting: false,
      canJump: true,
      jumpCooldown: 0,
      groundContactTime: 0,
    };

    this.characters.set(id, { config: cfg, state, mesh, scene, capsuleMesh, debugMesh: null });

    return { mesh, state };
  }

  move(id: string, moveDir: Vec3) {
    const char = this.characters.get(id);
    if (!char) return;

    const speed = char.state.isSprinting ? char.config.runSpeed : char.config.walkSpeed;
    char.state.velocity.x = moveDir.x * speed;
    char.state.velocity.z = moveDir.z * speed;

    if ((moveDir.x !== 0 || moveDir.z !== 0) && moveDir.y !== 0) {
      char.state.rotationY = Math.atan2(moveDir.x, moveDir.z) * 180 / Math.PI;
    }
  }

  jump(id: string) {
    const char = this.characters.get(id);
    if (!char) return;

    if (char.state.isGrounded && char.state.canJump && !char.state.isJumping) {
      char.state.velocity.y = char.config.jumpForce;
      char.state.isJumping = true;
      char.state.isGrounded = false;
      char.state.canJump = false;
      char.state.jumpCooldown = 0.2;
    }
  }

  crouch(id: string, crouch: boolean) {
    const char = this.characters.get(id);
    if (!char) return;
    char.state.isCrouching = crouch;
  }

  sprint(id: string, sprint: boolean) {
    const char = this.characters.get(id);
    if (!char) return;
    char.state.isSprinting = sprint;
  }

  applyImpulse(id: string, impulse: Vec3) {
    const char = this.characters.get(id);
    if (!char) return;
    char.state.velocity.x += impulse.x;
    char.state.velocity.y += impulse.y;
    char.state.velocity.z += impulse.z;
  }

  setPosition(id: string, position: Vec3) {
    const char = this.characters.get(id);
    if (!char) return;
    char.state.position = { ...position };
    char.mesh.position.set(position.x, position.y + char.config.height / 2, position.z);
  }

  private moveCharacter(
    char: { config: CharacterControllerConfig; state: CharacterState; mesh: THREE.Mesh; capsuleMesh: THREE.Mesh | null },
    dt: number,
    raycastFn: (origin: Vec3, dir: Vec3, maxDist: number) => { distance: number; normal: Vec3; entityId?: string } | null
  ) {
    const cfg = char.config;
    const state = char.state;

    const effectiveHeight = state.isCrouching ? cfg.crouchHeight : cfg.height;

    if (!state.isGrounded) {
      state.velocity.y -= cfg.gravity * dt;
    } else {
      state.velocity.y = Math.max(state.velocity.y - cfg.gravity * dt * 2, -cfg.maxFallSpeed * 0.1);
    }

    state.velocity.y = Math.max(state.velocity.y, -cfg.maxFallSpeed);

    if (state.jumpCooldown > 0) state.jumpCooldown -= dt;
    if (state.jumpCooldown <= 0) state.canJump = true;

    const skinW = cfg.skinWidth;
    const capsuleBottom = state.position.y + skinW;
    const capsuleTop = state.position.y + effectiveHeight - skinW;

    const moveX = state.velocity.x * dt;
    const moveY = state.velocity.y * dt;
    const moveZ = state.velocity.z * dt;

    state.position.x += moveX;
    const checkBottom = raycastFn(v3(state.position.x, capsuleBottom, state.position.z), v3(0, -1, 0), skinW + 0.1);
    if (checkBottom && checkBottom.distance <= skinW + 0.05) {
      const slopeAngle = Math.acos(checkBottom.normal.y) * 180 / Math.PI;
      if (slopeAngle <= cfg.slopeLimit) {
        if (!state.isGrounded) {
          state.isGrounded = true;
          state.isJumping = false;
        }
        state.groundContactTime += dt;
      }
    }

    state.position.y += moveY;

    const downHit = raycastFn(v3(state.position.x, capsuleTop, state.position.z), v3(0, -1, 0), skinW + Math.abs(moveY) + 0.1);
    const groundHit = raycastFn(v3(state.position.x, capsuleBottom, state.position.z), v3(0, -1, 0), skinW + 0.1);

    if (downHit && downHit.distance < skinW + 0.1 && state.velocity.y <= 0) {
      state.position.y = downHit.distance > skinW ? state.position.y : state.position.y;
      state.velocity.y = 0;
      state.isGrounded = true;
      state.isJumping = false;
    } else if (!downHit || downHit.distance > skinW + 0.1) {
      if (state.groundContactTime > 0.1) {
        state.isGrounded = false;
        state.groundContactTime = 0;
      }
    }

    state.position.z += moveZ;

    const friction = state.isGrounded ? cfg.groundFriction : cfg.airFriction;
    if (state.isGrounded) {
      const horizontalSpeed = Math.sqrt(state.velocity.x * state.velocity.x + state.velocity.z * state.velocity.z);
      if (horizontalSpeed > 0) {
        const frictionFactor = Math.max(0, 1 - friction * dt);
        state.velocity.x *= frictionFactor;
        state.velocity.z *= frictionFactor;
      }
    }

    char.mesh.position.set(state.position.x, state.position.y + effectiveHeight / 2, state.position.z);
    char.mesh.rotation.y = state.rotationY * Math.PI / 180;

    if (char.capsuleMesh) {
      char.capsuleMesh.position.set(state.position.x, state.position.y + effectiveHeight / 2, state.position.z);
    }
  }

  update(id: string, dt: number, raycastFn: (origin: Vec3, dir: Vec3, maxDist: number) => { distance: number; normal: Vec3; entityId?: string } | null) {
    const char = this.characters.get(id);
    if (!char) return;
    this.moveCharacter(char, dt, raycastFn);
  }

  getState(id: string): CharacterState | undefined {
    return this.characters.get(id)?.state;
  }

  getMesh(id: string): THREE.Mesh | undefined {
    return this.characters.get(id)?.mesh;
  }

  toggleDebug(id: string, visible: boolean) {
    const char = this.characters.get(id);
    if (char?.capsuleMesh) char.capsuleMesh.visible = visible;
  }

  dispose(id: string) {
    const char = this.characters.get(id);
    if (!char) return;
    char.scene.remove(char.mesh);
    char.scene.remove(char.capsuleMesh!);
    char.mesh.geometry.dispose();
    (char.mesh.material as THREE.Material).dispose();
    char.capsuleMesh?.geometry.dispose();
    (char.capsuleMesh?.material as THREE.Material)?.dispose();
    this.characters.delete(id);
  }
}

export const characterControllerSystem = new CharacterControllerSystem();
