// ============================================================
// KEVLA ENGINE — PHYSICS JOINTS v2.0
// Production-Grade Joint/Constraint System
//
// Architecture:
//   ┌─────────────────────────────────────────────────────────┐
//   │                 PHYSICS JOINTS                          │
//   │                                                          │
//   │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │
//   │  │    Fixed    │  │   Hinge     │  │    Slider       │  │
//   │  │    Joint    │  │    Joint    │  │    Joint        │  │
//   │  └─────────────┘  └─────────────┘  └─────────────────┘  │
//   │                                                          │
//   │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │
//   │  │  Spring     │  │    D6       │  │   Distance      │  │
//   │  │    Joint    │  │    Joint    │  │    Joint        │  │
//   │  └─────────────┘  └─────────────┘  └─────────────────┘  │
//   │                                                          │
//   │  ┌─────────────────────────────────────────────────────┐│
//   │  │          Constraint Solver & Limits                 ││
//   │  └─────────────────────────────────────────────────────┘│
//   └─────────────────────────────────────────────────────────┘
//
// Features:
//   • 6 joint types (Fixed, Hinge, Slider, Spring, D6, Distance)
//   • Configurable limits and drives
//   • Break force/threshold
//   • Collision between connected bodies
//   • Motor support
// ============================================================

import type { Vector3 } from './types';

// ============================================================
// TYPES — Joint Data Structures
// ============================================================

/** Joint type */
export type JointType = 'fixed' | 'hinge' | 'slider' | 'spring' | 'd6' | 'distance';

/** Axis for joint configuration */
export interface JointAxis {
  axis: Vector3;
  anchor: Vector3;
}

/** Joint limit */
export interface JointLimit {
  min: number;
  max: number;
  stiffness: number;
  damping: number;
  contactDistance: number;
}

/** Joint drive */
export interface JointDrive {
  positionSpring: number;
  positionDamping: number;
  forceLimit: number;
  freeSpin: boolean;
}

/** Joint configuration */
export interface JointConfig {
  type: JointType;
  bodyA: string;
  bodyB: string;
  anchorA: Vector3;
  anchorB: Vector3;
  axisA?: Vector3;
  axisB?: Vector3;
  xDrive?: JointDrive;
  yDrive?: JointDrive;
  zDrive?: JointDrive;
  angularXDrive?: JointDrive;
  angularYDrive?: JointDrive;
  angularZDrive?: JointDrive;
  linearLimit?: JointLimit;
  angularXLimit?: JointLimit;
  angularYLimit?: JointLimit;
  angularZLimit?: JointLimit;
  breakForce: number;
  breakTorque: number;
  enableCollision: boolean;
  enablePreProcessing: boolean;
}

/** Physics body reference */
export interface PhysicsBody {
  id: string;
  mass: number;
  position: Vector3;
  rotation: Vector3;
  velocity: Vector3;
  angularVelocity: Vector3;
  inverseMass: number;
  inverseInertia: Vector3;
}

/** Constraint row for solver */
export interface ConstraintRow {
  type: 'linear' | 'angular';
  axis: number;  // 0=x, 1=y, 2=z
  bodyA: PhysicsBody | null;
  bodyB: PhysicsBody | null;
  restitution: number;
  stiffness: number;
  damping: number;
  lowerLimit: number;
  upperLimit: number;
  rhs: number;
  jacobianA: number[];
  jacobianB: number[];
}

/** Joint state for simulation */
export interface JointState {
  id: string;
  type: JointType;
  broken: boolean;
  appliedForce: Vector3;
  appliedTorque: Vector3;
}

// ============================================================
// BASE JOINT CLASS
// ============================================================

export abstract class PhysicsJoint {
  id: string;
  type: JointType;
  bodyA: PhysicsBody;
  bodyB: PhysicsBody;
  anchorA: Vector3;
  anchorB: Vector3;
  breakForce: number = Infinity;
  breakTorque: number = Infinity;
  enableCollision: boolean = false;
  enablePreProcessing: boolean = true;
  broken: boolean = false;
  
  appliedForce: Vector3 = { x: 0, y: 0, z: 0 };
  appliedTorque: Vector3 = { x: 0, y: 0, z: 0 };

  constructor(config: JointConfig) {
    this.id = `joint_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.type = config.type;
    this.bodyA = { id: config.bodyA, mass: 1, position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 }, angularVelocity: { x: 0, y: 0, z: 0 }, inverseMass: 1, inverseInertia: { x: 1, y: 1, z: 1 } };
    this.bodyB = { id: config.bodyB, mass: 1, position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 }, angularVelocity: { x: 0, y: 0, z: 0 }, inverseMass: 1, inverseInertia: { x: 1, y: 1, z: 1 } };
    this.anchorA = config.anchorA;
    this.anchorB = config.anchorB;
    this.breakForce = config.breakForce ?? Infinity;
    this.breakTorque = config.breakTorque ?? Infinity;
    this.enableCollision = config.enableCollision ?? false;
    this.enablePreProcessing = config.enablePreProcessing ?? true;
  }

  abstract getConstraintRows(): ConstraintRow[];

  getState(): JointState {
    return {
      id: this.id,
      type: this.type,
      broken: this.broken,
      appliedForce: { ...this.appliedForce },
      appliedTorque: { ...this.appliedTorque },
    };
  }

  isBroken(): boolean {
    const forceMag = Math.sqrt(
      this.appliedForce.x ** 2 + 
      this.appliedForce.y ** 2 + 
      this.appliedForce.z ** 2
    );
    const torqueMag = Math.sqrt(
      this.appliedTorque.x ** 2 + 
      this.appliedTorque.y ** 2 + 
      this.appliedTorque.z ** 2
    );

    if (forceMag > this.breakForce || torqueMag > this.breakTorque) {
      this.broken = true;
      return true;
    }
    return false;
  }

  resetAppliedForces(): void {
    this.appliedForce = { x: 0, y: 0, z: 0 };
    this.appliedTorque = { x: 0, y: 0, z: 0 };
  }
}

// ============================================================
// FIXED JOINT
// ============================================================

export class FixedJoint extends PhysicsJoint {
  constructor(config: JointConfig) {
    super({ ...config, type: 'fixed' });
  }

  getConstraintRows(): ConstraintRow[] {
    return [
      { type: 'linear', axis: 0, bodyA: this.bodyA, bodyB: this.bodyB, restitution: 0, stiffness: 1e8, damping: 1e6, lowerLimit: 0, upperLimit: 0, rhs: 0, jacobianA: [1, 0, 0, 0, 0, 0], jacobianB: [-1, 0, 0, 0, 0, 0] },
      { type: 'linear', axis: 1, bodyA: this.bodyA, bodyB: this.bodyB, restitution: 0, stiffness: 1e8, damping: 1e6, lowerLimit: 0, upperLimit: 0, rhs: 0, jacobianA: [0, 1, 0, 0, 0, 0], jacobianB: [0, -1, 0, 0, 0, 0] },
      { type: 'linear', axis: 2, bodyA: this.bodyA, bodyB: this.bodyB, restitution: 0, stiffness: 1e8, damping: 1e6, lowerLimit: 0, upperLimit: 0, rhs: 0, jacobianA: [0, 0, 1, 0, 0, 0], jacobianB: [0, 0, -1, 0, 0, 0] },
      { type: 'angular', axis: 0, bodyA: this.bodyA, bodyB: this.bodyB, restitution: 0, stiffness: 1e8, damping: 1e6, lowerLimit: 0, upperLimit: 0, rhs: 0, jacobianA: [0, 0, 0, 1, 0, 0], jacobianB: [0, 0, 0, -1, 0, 0] },
      { type: 'angular', axis: 1, bodyA: this.bodyA, bodyB: this.bodyB, restitution: 0, stiffness: 1e8, damping: 1e6, lowerLimit: 0, upperLimit: 0, rhs: 0, jacobianA: [0, 0, 0, 0, 1, 0], jacobianB: [0, 0, 0, 0, -1, 0] },
      { type: 'angular', axis: 2, bodyA: this.bodyA, bodyB: this.bodyB, restitution: 0, stiffness: 1e8, damping: 1e6, lowerLimit: 0, upperLimit: 0, rhs: 0, jacobianA: [0, 0, 0, 0, 0, 1], jacobianB: [0, 0, 0, 0, 0, -1] },
    ];
  }
}

// ============================================================
// HINGE JOINT
// ============================================================

export class HingeJoint extends PhysicsJoint {
  axis: Vector3;
  limits: { lower: number; upper: number };
  motor: { enabled: boolean; targetVelocity: number; maxForce: number };

  constructor(config: JointConfig & { axis?: Vector3; limits?: { lower: number; upper: number } }) {
    super({ ...config, type: 'hinge' });
    this.axis = config.axis ?? { x: 0, y: 1, z: 0 };
    this.limits = config.limits ?? { lower: -Math.PI, upper: Math.PI };
    this.motor = { enabled: false, targetVelocity: 0, maxForce: 100 };
  }

  setMotor(enabled: boolean, targetVelocity: number = 0, maxForce: number = 100): void {
    this.motor.enabled = enabled;
    this.motor.targetVelocity = targetVelocity;
    this.motor.maxForce = maxForce;
  }

  setLimits(lower: number, upper: number): void {
    this.limits.lower = lower;
    this.limits.upper = upper;
  }

  getConstraintRows(): ConstraintRow[] {
    const rows: ConstraintRow[] = [];
    
    // Lock 5 DOFs, leave 1 free (hinge rotation)
    rows.push(
      { type: 'linear', axis: 0, bodyA: this.bodyA, bodyB: this.bodyB, restitution: 0, stiffness: 1e8, damping: 1e6, lowerLimit: 0, upperLimit: 0, rhs: 0, jacobianA: [1, 0, 0, 0, 0, 0], jacobianB: [-1, 0, 0, 0, 0, 0] },
      { type: 'linear', axis: 1, bodyA: this.bodyA, bodyB: this.bodyB, restitution: 0, stiffness: 1e8, damping: 1e6, lowerLimit: 0, upperLimit: 0, rhs: 0, jacobianA: [0, 1, 0, 0, 0, 0], jacobianB: [0, -1, 0, 0, 0, 0] },
      { type: 'linear', axis: 2, bodyA: this.bodyA, bodyB: this.bodyB, restitution: 0, stiffness: 1e8, damping: 1e6, lowerLimit: 0, upperLimit: 0, rhs: 0, jacobianA: [0, 0, 1, 0, 0, 0], jacobianB: [0, 0, -1, 0, 0, 0] },
      { type: 'angular', axis: 0, bodyA: this.bodyA, bodyB: this.bodyB, restitution: 0, stiffness: 1e8, damping: 1e6, lowerLimit: 0, upperLimit: 0, rhs: 0, jacobianA: [0, 0, 0, 1, 0, 0], jacobianB: [0, 0, 0, -1, 0, 0] },
      { type: 'angular', axis: 1, bodyA: this.bodyA, bodyB: this.bodyB, restitution: 0, stiffness: 1e8, damping: 1e6, lowerLimit: 0, upperLimit: 0, rhs: 0, jacobianA: [0, 0, 0, 0, 1, 0], jacobianB: [0, 0, 0, 0, -1, 0] },
    );

    // Angular limit on hinge axis
    rows.push({
      type: 'angular',
      axis: 2,
      bodyA: this.bodyA,
      bodyB: this.bodyB,
      restitution: 0.1,
      stiffness: 1e7,
      damping: 1e5,
      lowerLimit: this.limits.lower,
      upperLimit: this.limits.upper,
      rhs: 0,
      jacobianA: [0, 0, 0, 0, 0, this.axis.x],
      jacobianB: [0, 0, 0, 0, 0, -this.axis.x],
    });

    return rows;
  }
}

// ============================================================
// SLIDER JOINT (Prismatic)
// ============================================================

export class SliderJoint extends PhysicsJoint {
  axis: Vector3;
  limits: { lower: number; upper: number };
  motor: { enabled: boolean; targetVelocity: number; maxForce: number };

  constructor(config: JointConfig & { axis?: Vector3; limits?: { lower: number; upper: number } }) {
    super({ ...config, type: 'slider' });
    this.axis = config.axis ?? { x: 1, y: 0, z: 0 };
    this.limits = config.limits ?? { lower: -10, upper: 10 };
    this.motor = { enabled: false, targetVelocity: 0, maxForce: 100 };
  }

  getConstraintRows(): ConstraintRow[] {
    const rows: ConstraintRow[] = [];
    
    // Lock 5 DOFs, leave 1 free (slider translation)
    rows.push(
      { type: 'linear', axis: 0, bodyA: this.bodyA, bodyB: this.bodyB, restitution: 0, stiffness: 1e8, damping: 1e6, lowerLimit: 0, upperLimit: 0, rhs: 0, jacobianA: [0, 1, 0, 0, 0, 0], jacobianB: [0, -1, 0, 0, 0, 0] },
      { type: 'linear', axis: 1, bodyA: this.bodyA, bodyB: this.bodyB, restitution: 0, stiffness: 1e8, damping: 1e6, lowerLimit: 0, upperLimit: 0, rhs: 0, jacobianA: [0, 0, 1, 0, 0, 0], jacobianB: [0, 0, -1, 0, 0, 0] },
      { type: 'angular', axis: 0, bodyA: this.bodyA, bodyB: this.bodyB, restitution: 0, stiffness: 1e8, damping: 1e6, lowerLimit: 0, upperLimit: 0, rhs: 0, jacobianA: [0, 0, 0, 1, 0, 0], jacobianB: [0, 0, 0, -1, 0, 0] },
      { type: 'angular', axis: 1, bodyA: this.bodyA, bodyB: this.bodyB, restitution: 0, stiffness: 1e8, damping: 1e6, lowerLimit: 0, upperLimit: 0, rhs: 0, jacobianA: [0, 0, 0, 0, 1, 0], jacobianB: [0, 0, 0, 0, -1, 0] },
      { type: 'angular', axis: 2, bodyA: this.bodyA, bodyB: this.bodyB, restitution: 0, stiffness: 1e8, damping: 1e6, lowerLimit: 0, upperLimit: 0, rhs: 0, jacobianA: [0, 0, 0, 0, 0, 1], jacobianB: [0, 0, 0, 0, 0, -1] },
    );

    // Linear limit on slider axis
    rows.push({
      type: 'linear',
      axis: 0,
      bodyA: this.bodyA,
      bodyB: this.bodyB,
      restitution: 0.1,
      stiffness: 1e7,
      damping: 1e5,
      lowerLimit: this.limits.lower,
      upperLimit: this.limits.upper,
      rhs: 0,
      jacobianA: [this.axis.x, 0, 0, 0, 0, 0],
      jacobianB: [-this.axis.x, 0, 0, 0, 0, 0],
    });

    return rows;
  }
}

// ============================================================
// SPRING JOINT
// ============================================================

export class SpringJoint extends PhysicsJoint {
  restLength: number;
  stiffness: number;
  damping: number;
  autoConfigure: boolean;

  constructor(config: JointConfig & { stiffness?: number; damping?: number; autoConfigure?: boolean }) {
    super({ ...config, type: 'spring' });
    this.restLength = config.anchorA ? this._distance(config.anchorA, config.anchorB) : 1;
    this.stiffness = config.stiffness ?? 50;
    this.damping = config.damping ?? 1;
    this.autoConfigure = config.autoConfigure ?? true;
  }

  private _distance(a: Vector3, b: Vector3): number {
    const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  setStiffness(stiffness: number): void {
    this.stiffness = stiffness;
  }

  setDamping(damping: number): void {
    this.damping = damping;
  }

  setRestLength(length: number): void {
    this.restLength = length;
  }

  getConstraintRows(): ConstraintRow[] {
    const axis = {
      x: (this.bodyB.position.x - this.bodyA.position.x) / this.restLength,
      y: (this.bodyB.position.y - this.bodyA.position.y) / this.restLength,
      z: (this.bodyB.position.z - this.bodyA.position.z) / this.restLength,
    };

    return [
      {
        type: 'linear',
        axis: 0,
        bodyA: this.bodyA,
        bodyB: this.bodyB,
        restitution: 0,
        stiffness: this.stiffness,
        damping: this.damping,
        lowerLimit: 0,
        upperLimit: 0,
        rhs: this.stiffness * this.restLength,
        jacobianA: [axis.x, axis.y, axis.z, 0, 0, 0],
        jacobianB: [-axis.x, -axis.y, -axis.z, 0, 0, 0],
      },
    ];
  }
}

// ============================================================
// DISTANCE JOINT
// ============================================================

export class DistanceJoint extends PhysicsJoint {
  distance: number;
  minDistance: number;
  maxDistance: number;

  constructor(config: JointConfig & { distance?: number; minDistance?: number; maxDistance?: number }) {
    super({ ...config, type: 'distance' });
    this.distance = config.distance ?? this._distance(config.anchorA, config.anchorB);
    this.minDistance = config.minDistance ?? 0;
    this.maxDistance = config.maxDistance ?? Infinity;
  }

  private _distance(a: Vector3, b: Vector3): number {
    const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  setDistance(distance: number): void {
    this.distance = distance;
  }

  setLimits(min: number, max: number): void {
    this.minDistance = min;
    this.maxDistance = max;
  }

  getConstraintRows(): ConstraintRow[] {
    const axis = {
      x: (this.bodyB.position.x - this.bodyA.position.x) / this.distance,
      y: (this.bodyB.position.y - this.bodyA.position.y) / this.distance,
      z: (this.bodyB.position.z - this.bodyA.position.z) / this.distance,
    };

    return [
      {
        type: 'linear',
        axis: 0,
        bodyA: this.bodyA,
        bodyB: this.bodyB,
        restitution: 0.1,
        stiffness: 1e7,
        damping: 1e5,
        lowerLimit: this.minDistance - this.distance,
        upperLimit: this.maxDistance - this.distance,
        rhs: this.distance,
        jacobianA: [axis.x, axis.y, axis.z, 0, 0, 0],
        jacobianB: [-axis.x, -axis.y, -axis.z, 0, 0, 0],
      },
    ];
  }
}

// ============================================================
// D6 JOINT (6-Degree-of-Freedom)
// ============================================================

export class D6Joint extends PhysicsJoint {
  xMotion: 'locked' | 'limited' | 'free' = 'limited';
  yMotion: 'locked' | 'limited' | 'free' = 'limited';
  zMotion: 'locked' | 'limited' | 'free' = 'limited';
  angularXMotion: 'locked' | 'limited' | 'free' = 'limited';
  angularYMotion: 'locked' | 'limited' | 'free' = 'limited';
  angularZMotion: 'locked' | 'limited' | 'free' = 'limited';

  linearLimit: JointLimit = { min: 0, max: 0, stiffness: 1e7, damping: 1e5, contactDistance: 0 };
  angularXLimit: JointLimit = { min: 0, max: 0, stiffness: 1e7, damping: 1e5, contactDistance: 0 };
  angularYLimit: JointLimit = { min: 0, max: 0, stiffness: 1e7, damping: 1e5, contactDistance: 0 };
  angularZLimit: JointLimit = { min: 0, max: 0, stiffness: 1e7, damping: 1e5, contactDistance: 0 };

  xDrive: JointDrive = { positionSpring: 0, positionDamping: 0, forceLimit: Infinity, freeSpin: false };
  yDrive: JointDrive = { positionSpring: 0, positionDamping: 0, forceLimit: Infinity, freeSpin: false };
  zDrive: JointDrive = { positionSpring: 0, positionDamping: 0, forceLimit: Infinity, freeSpin: false };
  angularXDrive: JointDrive = { positionSpring: 0, positionDamping: 0, forceLimit: Infinity, freeSpin: false };
  angularYDrive: JointDrive = { positionSpring: 0, positionDamping: 0, forceLimit: Infinity, freeSpin: false };
  angularZDrive: JointDrive = { positionSpring: 0, positionDamping: 0, forceLimit: Infinity, freeSpin: false };

  constructor(config: JointConfig) {
    super({ ...config, type: 'd6' });
  }

  setLinearLimit(axis: 'x' | 'y' | 'z', min: number, max: number): void {
    if (axis === 'x') this.linearLimit = { ...this.linearLimit, min, max };
  }

  setAngularLimit(axis: 'x' | 'y' | 'z', min: number, max: number): void {
    if (axis === 'x') this.angularXLimit = { ...this.angularXLimit, min, max };
    if (axis === 'y') this.angularYLimit = { ...this.angularYLimit, min, max };
    if (axis === 'z') this.angularZLimit = { ...this.angularZLimit, min, max };
  }

  setDrive(axis: 'x' | 'y' | 'z' | 'angularX' | 'angularY' | 'angularZ', drive: Partial<JointDrive>): void {
    if (axis === 'x') this.xDrive = { ...this.xDrive, ...drive };
    if (axis === 'y') this.yDrive = { ...this.yDrive, ...drive };
    if (axis === 'z') this.zDrive = { ...this.zDrive, ...drive };
    if (axis === 'angularX') this.angularXDrive = { ...this.angularXDrive, ...drive };
    if (axis === 'angularY') this.angularYDrive = { ...this.angularYDrive, ...drive };
    if (axis === 'angularZ') this.angularZDrive = { ...this.angularZDrive, ...drive };
  }

  getConstraintRows(): ConstraintRow[] {
    const rows: ConstraintRow[] = [];
    const stiffness = 1e7;
    const damping = 1e5;

    // Linear axes
    if (this.xMotion === 'locked') {
      rows.push({ type: 'linear', axis: 0, bodyA: this.bodyA, bodyB: this.bodyB, restitution: 0, stiffness, damping, lowerLimit: 0, upperLimit: 0, rhs: 0, jacobianA: [1, 0, 0, 0, 0, 0], jacobianB: [-1, 0, 0, 0, 0, 0] });
    } else if (this.xMotion === 'limited') {
      rows.push({ type: 'linear', axis: 0, bodyA: this.bodyA, bodyB: this.bodyB, restitution: 0.1, stiffness, damping, lowerLimit: this.linearLimit.min, upperLimit: this.linearLimit.max, rhs: 0, jacobianA: [1, 0, 0, 0, 0, 0], jacobianB: [-1, 0, 0, 0, 0, 0] });
    }

    if (this.yMotion === 'locked') {
      rows.push({ type: 'linear', axis: 1, bodyA: this.bodyA, bodyB: this.bodyB, restitution: 0, stiffness, damping, lowerLimit: 0, upperLimit: 0, rhs: 0, jacobianA: [0, 1, 0, 0, 0, 0], jacobianB: [0, -1, 0, 0, 0, 0] });
    } else if (this.yMotion === 'limited') {
      rows.push({ type: 'linear', axis: 1, bodyA: this.bodyA, bodyB: this.bodyB, restitution: 0.1, stiffness, damping, lowerLimit: this.linearLimit.min, upperLimit: this.linearLimit.max, rhs: 0, jacobianA: [0, 1, 0, 0, 0, 0], jacobianB: [0, -1, 0, 0, 0, 0] });
    }

    if (this.zMotion === 'locked') {
      rows.push({ type: 'linear', axis: 2, bodyA: this.bodyA, bodyB: this.bodyB, restitution: 0, stiffness, damping, lowerLimit: 0, upperLimit: 0, rhs: 0, jacobianA: [0, 0, 1, 0, 0, 0], jacobianB: [0, 0, -1, 0, 0, 0] });
    } else if (this.zMotion === 'limited') {
      rows.push({ type: 'linear', axis: 2, bodyA: this.bodyA, bodyB: this.bodyB, restitution: 0.1, stiffness, damping, lowerLimit: this.linearLimit.min, upperLimit: this.linearLimit.max, rhs: 0, jacobianA: [0, 0, 1, 0, 0, 0], jacobianB: [0, 0, -1, 0, 0, 0] });
    }

    // Angular axes
    if (this.angularXMotion === 'locked') {
      rows.push({ type: 'angular', axis: 0, bodyA: this.bodyA, bodyB: this.bodyB, restitution: 0, stiffness, damping, lowerLimit: 0, upperLimit: 0, rhs: 0, jacobianA: [0, 0, 0, 1, 0, 0], jacobianB: [0, 0, 0, -1, 0, 0] });
    } else if (this.angularXMotion === 'limited') {
      rows.push({ type: 'angular', axis: 0, bodyA: this.bodyA, bodyB: this.bodyB, restitution: 0.1, stiffness, damping, lowerLimit: this.angularXLimit.min, upperLimit: this.angularXLimit.max, rhs: 0, jacobianA: [0, 0, 0, 1, 0, 0], jacobianB: [0, 0, 0, -1, 0, 0] });
    }

    if (this.angularYMotion === 'locked') {
      rows.push({ type: 'angular', axis: 1, bodyA: this.bodyA, bodyB: this.bodyB, restitution: 0, stiffness, damping, lowerLimit: 0, upperLimit: 0, rhs: 0, jacobianA: [0, 0, 0, 0, 1, 0], jacobianB: [0, 0, 0, 0, -1, 0] });
    } else if (this.angularYMotion === 'limited') {
      rows.push({ type: 'angular', axis: 1, bodyA: this.bodyA, bodyB: this.bodyB, restitution: 0.1, stiffness, damping, lowerLimit: this.angularYLimit.min, upperLimit: this.angularYLimit.max, rhs: 0, jacobianA: [0, 0, 0, 0, 1, 0], jacobianB: [0, 0, 0, 0, -1, 0] });
    }

    if (this.angularZMotion === 'locked') {
      rows.push({ type: 'angular', axis: 2, bodyA: this.bodyA, bodyB: this.bodyB, restitution: 0, stiffness, damping, lowerLimit: 0, upperLimit: 0, rhs: 0, jacobianA: [0, 0, 0, 0, 0, 1], jacobianB: [0, 0, 0, 0, 0, -1] });
    } else if (this.angularZMotion === 'limited') {
      rows.push({ type: 'angular', axis: 2, bodyA: this.bodyA, bodyB: this.bodyB, restitution: 0.1, stiffness, damping, lowerLimit: this.angularZLimit.min, upperLimit: this.angularZLimit.max, rhs: 0, jacobianA: [0, 0, 0, 0, 0, 1], jacobianB: [0, 0, 0, 0, 0, -1] });
    }

    return rows;
  }
}

// ============================================================
// JOINT FACTORY
// ============================================================

export function createJoint(config: JointConfig): PhysicsJoint {
  switch (config.type) {
    case 'fixed':
      return new FixedJoint(config);
    case 'hinge':
      return new HingeJoint(config as JointConfig & { axis?: Vector3; limits?: { lower: number; upper: number } });
    case 'slider':
      return new SliderJoint(config as JointConfig & { axis?: Vector3; limits?: { lower: number; upper: number } });
    case 'spring':
      return new SpringJoint(config as JointConfig & { stiffness?: number; damping?: number; autoConfigure?: boolean });
    case 'distance':
      return new DistanceJoint(config as JointConfig & { distance?: number; minDistance?: number; maxDistance?: number });
    case 'd6':
      return new D6Joint(config);
    default:
      throw new Error(`Unknown joint type: ${config.type}`);
  }
}

// ============================================================
// JOINT MANAGER
// ============================================================

export class JointManager {
  joints: Map<string, PhysicsJoint> = new Map();

  addJoint(joint: PhysicsJoint): void {
    this.joints.set(joint.id, joint);
  }

  removeJoint(jointId: string): boolean {
    return this.joints.delete(jointId);
  }

  getJoint(jointId: string): PhysicsJoint | undefined {
    return this.joints.get(jointId);
  }

  getJointsForBody(bodyId: string): PhysicsJoint[] {
    return Array.from(this.joints.values()).filter(
      j => j.bodyA.id === bodyId || j.bodyB.id === bodyId
    );
  }

  getAllConstraintRows(): ConstraintRow[] {
    const rows: ConstraintRow[] = [];
    for (const joint of this.joints.values()) {
      if (!joint.broken) {
        rows.push(...joint.getConstraintRows());
      }
    }
    return rows;
  }

  update(): void {
    for (const joint of this.joints.values()) {
      if (joint.isBroken()) {
        console.warn(`Joint ${joint.id} has broken`);
      }
      joint.resetAppliedForces();
    }
  }

  clear(): void {
    this.joints.clear();
  }
}

export const jointManager = new JointManager();

// ============================================================
// DEFAULT JOINT PRESETS
// ============================================================

export const DEFAULT_JOINT_PRESETS: Record<string, Partial<JointConfig>> = {
  door: {
    type: 'hinge',
    breakForce: 5000,
    breakTorque: 5000,
    enableCollision: false,
  },
  pendulum: {
    type: 'distance',
    breakForce: 10000,
    breakTorque: 10000,
    enableCollision: false,
  },
  vehicle_wheel: {
    type: 'hinge',
    breakForce: 100000,
    breakTorque: 100000,
    enableCollision: false,
  },
  ragdoll_joint: {
    type: 'd6',
    breakForce: 5000,
    breakTorque: 5000,
    enableCollision: false,
  },
  spring_bumper: {
    type: 'spring',
    breakForce: 5000,
    breakTorque: 5000,
    enableCollision: true,
  },
};