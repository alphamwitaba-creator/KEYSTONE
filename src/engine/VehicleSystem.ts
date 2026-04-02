// ============================================================
// KEVLA ENGINE — Vehicle System v2.0
// Raycast vehicle with wheels, suspension, and motors
// ============================================================

import * as THREE from 'three';
import { v3, type Vec3, type PhysicsBody, type PhysicsWorld } from './physics';

export interface WheelConfig {
  index: number;
  position: Vec3;
  radius: number;
  width: number;
  maxSuspensionTravel: number;
  suspensionStiffness: number;
  dampingRelaxation: number;
  dampingCompression: number;
  frictionSlip: number;
  maxSuspensionForce: number;
  rollInfluence: number;
  isDriving: boolean;
  isSteering: boolean;
  steeringAngle: number;
  rotation: number;
  angularVelocity: number;
  YPos: number;
  suspensionLength: number;
  maxSuspensionCompression: number;
  clipsSuspension: number;
  suspensionRelativeVelocity: number;
  suspensionForce: number;
  slip: number;
}

export interface VehicleConfig {
  mass: number;
  chassisMass: number;
  chassisDimensions: Vec3;
  suspensionStiffness: number;
  suspensionDamping: number;
  maxSuspensionTravelCM: number;
  frictionSlip: number;
  maxSuspensionForce: number;
  rollInfluence: number;
  wheelBase: number;
  suspensionCompression: number;
  suspensionRestLength: number;
  maxTravelCompression: number;
  wheels: WheelConfig[];
  color: string;
  brakeForce: number;
  engineForce: number;
  steeringLimit: number;
  steeringSpeed: number;
}

const DEFAULT_WHEEL: WheelConfig = {
  index: 0, position: v3(), radius: 0.4, width: 0.2, maxSuspensionTravel: 0.3,
  suspensionStiffness: 50, dampingRelaxation: 2.3, dampingCompression: 4.4,
  frictionSlip: 10.5, maxSuspensionForce: 100000, rollInfluence: 0.1,
  isDriving: true, isSteering: false, steeringAngle: 0, rotation: 0,
  angularVelocity: 0, YPos: 0, suspensionLength: 0.3, maxSuspensionCompression: 0.3,
  clipsSuspension: 0, suspensionRelativeVelocity: 0, suspensionForce: 0, slip: 0,
};

export class VehicleSystem {
  private vehicles = new Map<string, {
    config: VehicleConfig;
    chassis: PhysicsBody;
    chassisMesh: THREE.Mesh;
    wheelMeshes: THREE.Mesh[];
    scene: THREE.Scene;
    velocity: Vec3;
    angularVelocity: number;
    rightDirection: Vec3;
    forwardDirection: Vec3;
    world: PhysicsWorld | null;
  }>();

  create(
    id: string,
    scene: THREE.Scene,
    startPos: Vec3,
    chassisColor = '#4a90e2',
    config?: Partial<VehicleConfig>
  ): { chassisMesh: THREE.Mesh; wheelMeshes: THREE.Mesh[] } {
    const defaultCfg: VehicleConfig = {
      mass: 1500,
      chassisMass: 1200,
      chassisDimensions: v3(1.8, 0.6, 4.0),
      suspensionStiffness: 55,
      suspensionDamping: 4.5,
      maxSuspensionTravelCM: 30,
      frictionSlip: 2.0,
      maxSuspensionForce: 600000,
      rollInfluence: 0.01,
      wheelBase: 2.5,
      suspensionCompression: 0.3,
      suspensionRestLength: 0.35,
      maxTravelCompression: 0.3,
      wheels: [
        { ...DEFAULT_WHEEL, index: 0, position: v3(-0.85, 0, 1.5), isSteering: true, isDriving: true, radius: 0.4 },
        { ...DEFAULT_WHEEL, index: 1, position: v3(0.85, 0, 1.5), isSteering: true, isDriving: true, radius: 0.4 },
        { ...DEFAULT_WHEEL, index: 2, position: v3(-0.85, 0, -1.5), isSteering: false, isDriving: true, radius: 0.4 },
        { ...DEFAULT_WHEEL, index: 3, position: v3(0.85, 0, -1.5), isSteering: false, isDriving: true, radius: 0.4 },
      ],
      color: chassisColor,
      brakeForce: 3000,
      engineForce: 5000,
      steeringLimit: 0.55,
      steeringSpeed: 0.05,
    };

    const vehicleCfg: VehicleConfig = { ...defaultCfg, ...config };
    vehicleCfg.wheels = vehicleCfg.wheels.map(w => ({ ...DEFAULT_WHEEL, ...w }));

    const chassisGeo = new THREE.BoxGeometry(
      vehicleCfg.chassisDimensions.x,
      vehicleCfg.chassisDimensions.y,
      vehicleCfg.chassisDimensions.z
    );
    const chassisMat = new THREE.MeshStandardMaterial({ color: chassisColor, metalness: 0.6, roughness: 0.4 });
    const chassisMesh = new THREE.Mesh(chassisGeo, chassisMat);
    chassisMesh.position.set(startPos.x, startPos.y, startPos.z);
    chassisMesh.castShadow = true;
    chassisMesh.receiveShadow = true;
    scene.add(chassisMesh);

    const wheelGeo = new THREE.CylinderGeometry(vehicleCfg.wheels[0].radius, vehicleCfg.wheels[0].radius, vehicleCfg.wheels[0].width, 16);
    wheelGeo.rotateZ(Math.PI / 2);
    const wheelMat = new THREE.MeshStandardMaterial({ color: '#222222', roughness: 0.9 });

    const wheelMeshes: THREE.Mesh[] = vehicleCfg.wheels.map(w => {
      const wheel = new THREE.Mesh(wheelGeo.clone(), wheelMat.clone());
      wheel.castShadow = true;
      scene.add(wheel);
      return wheel;
    });

    const chassis: PhysicsBody = {
      entityId: id,
      position: { ...startPos },
      rotation: v3(),
      shape: 'box',
      halfExtents: v3(vehicleCfg.chassisDimensions.x / 2, vehicleCfg.chassisDimensions.y / 2, vehicleCfg.chassisDimensions.z / 2),
      radius: 0,
      height: 0,
      center: v3(),
      isTrigger: false,
      mass: vehicleCfg.chassisMass,
      invMass: 1 / vehicleCfg.chassisMass,
      useGravity: true,
      isKinematic: false,
      velocity: v3(),
      acceleration: v3(),
      force: v3(),
      angularVelocity: v3(),
      torque: v3(),
      inertia: v3(),
      invInertia: v3(),
      friction: 0.5,
      restitution: 0.1,
      linearDamping: 0.1,
      angularDamping: 0.3,
      isSleeping: false,
      sleepTimer: 0,
    };

    this.vehicles.set(id, {
      config: vehicleCfg,
      chassis,
      chassisMesh,
      wheelMeshes,
      scene,
      velocity: v3(),
      angularVelocity: 0,
      rightDirection: v3(1, 0, 0),
      forwardDirection: v3(0, 0, 1),
      world: null,
    });

    return { chassisMesh, wheelMeshes };
  }

  setPhysicsWorld(id: string, world: PhysicsWorld) {
    const v = this.vehicles.get(id);
    if (v) v.world = world;
  }

  setSteering(id: string, steer: number) {
    const v = this.vehicles.get(id);
    if (!v) return;
    v.config.wheels.forEach(w => {
      if (w.isSteering) w.steeringAngle = steer * v.config.steeringLimit;
    });
  }

  setEngineForce(id: string, force: number) {
    const v = this.vehicles.get(id);
    if (!v) return;
    v.config.engineForce = force;
  }

  setBrake(id: string, force: number) {
    const v = this.vehicles.get(id);
    if (!v) return;
    v.config.brakeForce = force;
  }

  update(id: string, dt: number, raycastFn: (origin: Vec3, dir: Vec3) => { distance: number; normal: Vec3 } | null) {
    const v = this.vehicles.get(id);
    if (!v) return;

    const cfg = v.config;
    const chassis = v.chassis;

    const cosSteer = Math.cos(chassis.rotation.y * Math.PI / 180);
    const sinSteer = Math.sin(chassis.rotation.y * Math.PI / 180);
    v.forwardDirection = v3(sinSteer, 0, cosSteer);
    v.rightDirection = v3(cosSteer, 0, -sinSteer);

    for (const wheel of cfg.wheels) {
      const isFront = wheel.isSteering;
      const steerAngle = isFront ? wheel.steeringAngle : 0;

      const wheelPos = v3(
        chassis.position.x + wheel.position.x * cosSteer + wheel.position.z * sinSteer,
        chassis.position.y + wheel.position.y,
        chassis.position.z - wheel.position.x * sinSteer + wheel.position.z * cosSteer
      );

      const rayDir = v3(0, -1, 0);
      const hit = raycastFn(wheelPos, rayDir);

      if (hit && hit.distance < wheel.radius + cfg.maxSuspensionTravelCM * 0.01) {
        wheel.clipsSuspension = 0;
        wheel.YPos = hit.distance - wheel.radius;
        wheel.suspensionLength = Math.max(0, wheel.YPos);

        const suspensionDelta = cfg.suspensionRestLength - wheel.suspensionLength;
        wheel.clipsSuspension = Math.max(0, Math.min(1, suspensionDelta / cfg.maxTravelCompression));

        const suspensionVelocity = wheel.suspensionRelativeVelocity;
        const dampingForce = suspensionVelocity * cfg.suspensionDamping;
        const springForce = suspensionDelta * cfg.suspensionStiffness;

        wheel.suspensionForce = (springForce - dampingForce) * cfg.mass;
        if (wheel.suspensionForce < 0) wheel.suspensionForce = 0;

        const totalForce = wheel.suspensionForce * wheel.maxSuspensionForce;
        const forceVec = v3(0, totalForce * hit.normal.y, 0);

        chassis.velocity.x += forceVec.x * dt * chassis.invMass;
        chassis.velocity.y += forceVec.y * dt * chassis.invMass;
        chassis.velocity.z += forceVec.z * dt * chassis.invMass;

        if (wheel.isDriving) {
          const driveForce = cfg.engineForce;
          chassis.velocity.x += v.forwardDirection.x * driveForce * dt * chassis.invMass;
          chassis.velocity.z += v.forwardDirection.z * driveForce * dt * chassis.invMass;
        }

        const suspensionVel = wheel.suspensionRelativeVelocity;
        wheel.slip = cfg.frictionSlip + suspensionVel * 0.1;

        if (wheel.isDriving) {
          const slipFactor = Math.min(wheel.slip, 1);
          chassis.velocity.x -= v.forwardDirection.x * slipFactor * cfg.brakeForce * dt * chassis.invMass * 0.3;
          chassis.velocity.z -= v.forwardDirection.z * slipFactor * cfg.brakeForce * dt * chassis.invMass * 0.3;
        }
      } else {
        wheel.suspensionForce = 0;
        wheel.suspensionLength = cfg.suspensionRestLength;
        wheel.suspensionRelativeVelocity = 0;
        wheel.slip = 0;
      }

      wheel.rotation += wheel.angularVelocity * dt;
      wheel.angularVelocity = cfg.engineForce * 0.01;

      const wheelY = chassis.position.y + wheel.position.y - wheel.suspensionLength - wheel.radius;
      const wheelX = chassis.position.x + wheel.position.x * Math.cos(chassis.rotation.y * Math.PI / 180);
      const wheelZ = chassis.position.z + wheel.position.z * Math.sin(chassis.rotation.y * Math.PI / 180);

      v.wheelMeshes[wheel.index].position.set(wheelX, wheelY, wheelZ);
      v.wheelMeshes[wheel.index].rotation.x = wheel.rotation;
      if (isFront) {
        v.wheelMeshes[wheel.index].rotation.y = steerAngle;
      }
    }

    chassis.velocity.x *= 0.99;
    chassis.velocity.z *= 0.99;
    chassis.velocity.y -= 9.81 * dt;

    chassis.position.x += chassis.velocity.x * dt;
    chassis.position.y += chassis.velocity.y * dt;
    chassis.position.z += chassis.velocity.z * dt;

    if (chassis.position.y < wheel.radius + 0.1) {
      chassis.position.y = wheel.radius + 0.1;
      chassis.velocity.y = 0;
    }

    v.chassisMesh.position.set(chassis.position.x, chassis.position.y, chassis.position.z);
    v.chassisMesh.rotation.y = chassis.rotation.y * Math.PI / 180;
  }

  applyBrake(id: string, brakeForce: number) {
    const v = this.vehicles.get(id);
    if (!v) return;
    v.config.wheels.forEach(w => {
      w.angularVelocity *= 0.95;
    });
    v.chassis.velocity.x *= 0.95;
    v.chassis.velocity.z *= 0.95;
  }

  getChassisMesh(id: string): THREE.Mesh | undefined {
    return this.vehicles.get(id)?.chassisMesh;
  }

  getWheelMeshes(id: string): THREE.Mesh[] {
    return this.vehicles.get(id)?.wheelMeshes || [];
  }

  getVelocity(id: string): Vec3 {
    return this.vehicles.get(id)?.velocity || v3();
  }

  dispose(id: string) {
    const v = this.vehicles.get(id);
    if (!v) return;
    v.scene.remove(v.chassisMesh);
    v.wheelMeshes.forEach(w => v.scene.remove(w));
    v.chassisMesh.geometry.dispose();
    (v.chassisMesh.material as THREE.Material).dispose();
    v.wheelMeshes.forEach(w => {
      w.geometry.dispose();
      (w.material as THREE.Material).dispose();
    });
    this.vehicles.delete(id);
  }
}

export const vehicleSystem = new VehicleSystem();
