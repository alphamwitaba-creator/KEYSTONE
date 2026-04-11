// ============================================================
// KEVLA ENGINE — Inverse Kinematics System v2.0
// IK rig support with FABRIK and CCD solvers
// ============================================================

import * as THREE from 'three';

export type IKSolverType = 'FABRIK' | 'CCD' | 'TwoBone';

export interface IKBone {
  name: string;
  length: number;
  chainIndex: number;
}

export interface IKChain {
  name: string;
  bones: IKBone[];
  rootBone: string;
  tipBone: string;
  targetBone: string;
  poleTarget?: string;
}

export interface IKTarget {
  position: THREE.Vector3;
  rotation: THREE.Quaternion;
  weight: number;
}

export interface IKSolverConfig {
  iterations: number;
  tolerance: number;
  damping: number;
  poleAngle: number;
  usePoleTarget: boolean;
}

export const DEFAULT_IK_CONFIG: IKSolverConfig = {
  iterations: 10,
  tolerance: 0.01,
  damping: 0.5,
  poleAngle: 0,
  usePoleTarget: true,
};

interface BoneTransform {
  position: THREE.Vector3;
  rotation: THREE.Quaternion;
  length: number;
}

export class IKSolver {
  private config: IKSolverConfig;
  private boneTransforms: Map<string, BoneTransform> = new Map();
  private tempVec = new THREE.Vector3();
  private tempQuat = new THREE.Quaternion();

  constructor(config: Partial<IKSolverConfig> = {}) {
    this.config = { ...DEFAULT_IK_CONFIG, ...config };
  }

  setConfig(config: Partial<IKSolverConfig>) {
    this.config = { ...this.config, ...config };
  }

  // FABRIK (Forward And Backward Reaching Inverse Kinematics) Solver
  solveFABRIK(
    chain: IKChain,
    rootBone: THREE.Object3D,
    targetPosition: THREE.Vector3,
    poleTarget?: THREE.Vector3,
  ): Map<string, THREE.Matrix4> {
    const positions = this.extractBonePositions(chain, rootBone);
    const lengths = this.extractBoneLengths(chain);
    const totalLength = lengths.reduce((a, b) => a + b, 0);

    const distanceToTarget = positions[0].distanceTo(targetPosition);
    
    // If target is unreachable, stretch toward it
    if (distanceToTarget > totalLength) {
      return this.solveUnreachable(chain, rootBone, targetPosition, poleTarget);
    }

    const results = new Map<string, THREE.Matrix4>();

    for (let iter = 0; iter < this.config.iterations; iter++) {
      // Forward reaching (from tip to root)
      positions[positions.length - 1].copy(targetPosition);
      for (let i = positions.length - 2; i >= 0; i--) {
        const dir = new THREE.Vector3().subVectors(positions[i], positions[i + 1]).normalize();
        positions[i].copy(positions[i + 1]).addScaledVector(dir, lengths[i]);
      }

      // Backward reaching (from root to tip)
      positions[0].copy(this.getWorldPosition(rootBone, chain.bones[0].name));
      for (let i = 1; i < positions.length; i++) {
        const dir = new THREE.Vector3().subVectors(positions[i], positions[i - 1]).normalize();
        positions[i].copy(positions[i - 1]).addScaledVector(dir, lengths[i]);
      }

      // Apply pole target constraint
      if (poleTarget && chain.bones.length >= 3) {
        this.applyPoleConstraint(positions, poleTarget, chain);
      }

      // Check convergence
      if (positions[positions.length - 1].distanceTo(targetPosition) < this.config.tolerance) {
        break;
      }
    }

    // Convert positions to bone transforms
    for (let i = 0; i < chain.bones.length; i++) {
      const bone = chain.bones[i];
      const matrix = new THREE.Matrix4();
      matrix.compose(positions[i], new THREE.Quaternion(), new THREE.Vector3(1, 1, 1));
      results.set(bone.name, matrix);
    }

    return results;
  }

  // CCD (Cyclic Coordinate Descent) Solver
  solveCCD(
    chain: IKChain,
    rootBone: THREE.Object3D,
    targetPosition: THREE.Vector3,
    poleTarget?: THREE.Vector3,
  ): Map<string, THREE.Matrix4> {
    const results = new Map<string, THREE.Matrix4>();
    const bones = this.getBoneChain(chain, rootBone);

    for (let iter = 0; iter < this.config.iterations; iter++) {
      for (let i = bones.length - 2; i >= 0; i--) {
        const bone = bones[i];
        const boneWorldPos = new THREE.Vector3();
        bone.getWorldPosition(boneWorldPos);

        // Get current effector position
        const effectorPos = new THREE.Vector3();
        bones[bones.length - 1].getWorldPosition(effectorPos);

        // Get vectors
        const toEffector = new THREE.Vector3().subVectors(effectorPos, boneWorldPos).normalize();
        const toTarget = new THREE.Vector3().subVectors(targetPosition, boneWorldPos).normalize();

        // Calculate rotation to minimize error
        const angle = Math.acos(Math.max(-1, Math.min(1, toEffector.dot(toTarget))));
        if (angle < 0.001) continue;

        const axis = new THREE.Vector3().crossVectors(toEffector, toTarget).normalize();
        if (axis.length() < 0.001) continue;

        const dampedAngle = angle * this.config.damping;
        const rotation = new THREE.Quaternion().setFromAxisAngle(axis, dampedAngle);

        // Apply rotation
        const parentWorldQuat = new THREE.Quaternion();
        if (bone.parent) bone.parent.getWorldQuaternion(parentWorldQuat);
        const localRotation = rotation.clone().multiply(parentWorldQuat.clone().invert());
        bone.quaternion.premultiply(localRotation);
      }

      // Check convergence
      const effectorPos = new THREE.Vector3();
      bones[bones.length - 1].getWorldPosition(effectorPos);
      if (effectorPos.distanceTo(targetPosition) < this.config.tolerance) {
        break;
      }
    }

    // Store results
    for (const bone of bones) {
      const matrix = new THREE.Matrix4();
      bone.updateMatrixWorld();
      matrix.copy(bone.matrixWorld);
      results.set(bone.name, matrix);
    }

    return results;
  }

  // Two-Bone IK (Analytic solution for limbs)
  solveTwoBone(
    rootBone: THREE.Object3D,
    midBone: THREE.Object3D,
    tipBone: THREE.Object3D,
    targetPosition: THREE.Vector3,
    poleTarget?: THREE.Vector3,
  ): void {
    // Get world positions
    const rootPos = new THREE.Vector3();
    const midPos = new THREE.Vector3();
    const tipPos = new THREE.Vector3();
    
    rootBone.getWorldPosition(rootPos);
    midBone.getWorldPosition(midPos);
    tipBone.getWorldPosition(tipPos);

    const upperLen = rootPos.distanceTo(midPos);
    const lowerLen = midPos.distanceTo(tipPos);
    const totalLen = upperLen + lowerLen;

    // Calculate target distance
    const targetDist = rootPos.distanceTo(targetPosition);
    
    // Clamp to reachable range
    const reach = Math.min(targetDist, totalLen * 0.999);
    
    // Law of cosines for elbow angle
    const cosAngle = (upperLen * upperLen + lowerLen * lowerLen - reach * reach) / (2 * upperLen * lowerLen);
    const angle = Math.acos(Math.max(-1, Math.min(1, cosAngle)));

    // Calculate directions
    const toTarget = new THREE.Vector3().subVectors(targetPosition, rootPos).normalize();
    
    // Determine pole direction (for knee/elbow orientation)
    const poleDir = poleTarget 
      ? new THREE.Vector3().subVectors(poleTarget, rootPos).normalize()
      : new THREE.Vector3(0, 0, 1);

    // Apply rotations
    // Root bone rotation (point toward target)
    const rootQuat = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    rootQuat.setFromUnitVectors(up, toTarget);
    rootBone.quaternion.copy(rootQuat);

    // Mid bone rotation (bend at elbow)
    const midQuat = new THREE.Quaternion();
    const bendAxis = new THREE.Vector3().crossVectors(toTarget, poleDir).normalize();
    const bendAngle = Math.PI - angle;
    midQuat.setFromAxisAngle(bendAxis, bendAngle * this.config.damping);
    
    const parentQuat = new THREE.Quaternion();
    rootBone.getWorldQuaternion(parentQuat);
    const localMidQuat = midQuat.clone().multiply(parentQuat.clone().invert());
    midBone.quaternion.copy(localMidQuat);
  }

  // Animation Events - trigger callbacks at specific frames
  triggerAnimationEvents(
    entityId: string,
    clipName: string,
    currentTime: number,
    previousTime: number,
    events: AnimationEvent[],
  ): void {
    const triggeredEvents = events.filter(event => 
      event.clipName === clipName &&
      event.time >= previousTime &&
      event.time <= currentTime
    );

    for (const event of triggeredEvents) {
      this.executeAnimationEvent(entityId, event);
    }
  }

  private executeAnimationEvent(entityId: string, event: AnimationEvent): void {
    if (event.callback) {
      event.callback(entityId);
    }
    
    if (event.functionName) {
      // Call Lua script function
      console.log(`[IK] Triggering animation event: ${event.functionName} on ${entityId}`);
    }
  }

  // Animation Retargeting - reuse animations across skeletons
  retargetAnimation(
    sourceClip: THREE.AnimationClip,
    sourceSkeleton: THREE.Skeleton,
    targetSkeleton: THREE.Skeleton,
    retargetMap: BoneMapping[],
  ): THREE.AnimationClip {
    const name = sourceClip.name + '_retargeted';
    const tracks: THREE.KeyframeTrack[] = [];

    for (const track of sourceClip.tracks) {
      const trackName = track.name;
      const sourceBoneName = trackName.split('.')[0];
      
      // Find mapping
      const mapping = retargetMap.find(m => m.source === sourceBoneName);
      if (!mapping) continue;

      const targetBoneName = mapping.target;
      const targetBone = targetSkeleton.getBoneByName(targetBoneName);
      if (!targetBone) continue;

      // Retarget position tracks
      if (track instanceof THREE.VectorKeyframeTrack) {
        const targetTrack = this.retargetPositionTrack(
          track as THREE.VectorKeycodeTrack,
          sourceBoneName,
          targetBoneName,
          sourceSkeleton,
          targetSkeleton,
          mapping,
        );
        if (targetTrack) tracks.push(targetTrack);
      }
      
      // Retarget rotation tracks
      if (track instanceof THREE.QuaternionKeyframeTrack) {
        const targetTrack = this.retargetRotationTrack(
          track as THREE.QuaternionKeyframeTrack,
          sourceBoneName,
          targetBoneName,
          sourceSkeleton,
          targetSkeleton,
          mapping,
        );
        if (targetTrack) tracks.push(targetTrack);
      }
    }

    return new THREE.AnimationClip(name, sourceClip.duration, tracks);
  }

  private retargetPositionTrack(
    track: THREE.VectorKeycodeTrack,
    sourceBone: string,
    targetBone: string,
    sourceSkeleton: THREE.Skeleton,
    targetSkeleton: THREE.Skeleton,
    mapping: BoneMapping,
  ): THREE.VectorKeycodeTrack | null {
    const sourceBoneObj = sourceSkeleton.getBoneByName(sourceBone);
    const targetBoneObj = targetSkeleton.getBoneByName(targetBone);
    if (!sourceBoneObj || !targetBoneObj) return null;

    const values = track.values;
    const retargetedValues = new Float32Array(values.length);

    for (let i = 0; i < values.length; i += 3) {
      // Convert source position to local space
      const sourcePos = new THREE.Vector3(values[i], values[i + 1], values[i + 2]);
      sourceBoneObj.worldToLocal(sourcePos);

      // Apply scale remapping if needed
      if (mapping.scale) {
        sourcePos.multiplyScalar(mapping.scale);
      }

      // Convert to target world space
      targetBoneObj.localToWorld(sourcePos);

      retargetedValues[i] = sourcePos.x;
      retargetedValues[i + 1] = sourcePos.y;
      retargetedValues[i + 2] = sourcePos.z;
    }

    return new THREE.VectorKeycodeTrack(
      `${targetBone}.position`,
      track.times,
      retargetedValues,
    );
  }

  private retargetRotationTrack(
    track: THREE.QuaternionKeyframeTrack,
    sourceBone: string,
    targetBone: string,
    sourceSkeleton: THREE.Skeleton,
    targetSkeleton: THREE.Skeleton,
    mapping: BoneMapping,
  ): THREE.QuaternionKeyframeTrack | null {
    const sourceBoneObj = sourceSkeleton.getBoneByName(sourceBone);
    const targetBoneObj = targetSkeleton.getBoneByName(targetBone);
    if (!sourceBoneObj || !targetBoneObj) return null;

    const values = track.values;
    const retargetedValues = new Float32Array(values.length);

    for (let i = 0; i < values.length; i += 4) {
      const sourceQuat = new THREE.Quaternion(values[i], values[i + 1], values[i + 2], values[i + 3]);
      
      // Convert source rotation to world
      sourceQuat.premultiply(sourceBoneObj.quaternion);
      
      // Convert to target local space
      const targetWorldQuat = sourceQuat.clone();
      const inverseTarget = targetBoneObj.quaternion.clone().invert();
      sourceQuat.premultiply(inverseTarget);

      retargetedValues[i] = sourceQuat.x;
      retargetedValues[i + 1] = sourceQuat.y;
      retargetedValues[i + 2] = sourceQuat.z;
      retargetedValues[i + 3] = sourceQuat.w;
    }

    return new THREE.QuaternionKeyframeTrack(
      `${targetBone}.quaternion`,
      track.times,
      retargetedValues,
    );
  }

  // Helper methods
  private extractBonePositions(chain: IKChain, rootBone: THREE.Object3D): THREE.Vector3[] {
    const positions: THREE.Vector3[] = [];
    let current = rootBone;

    for (const bone of chain.bones) {
      const worldPos = new THREE.Vector3();
      current.getWorldPosition(worldPos);
      positions.push(worldPos);
      current = current.children.find(c => c.name === bone.name) || current;
    }

    return positions;
  }

  private extractBoneLengths(chain: IKChain): number[] {
    return chain.bones.map(b => b.length);
  }

  private getWorldPosition(bone: THREE.Object3D, boneName: string): THREE.Vector3 {
    const target = bone.children.find(c => c.name === boneName);
    const pos = new THREE.Vector3();
    (target || bone).getWorldPosition(pos);
    return pos;
  }

  private getBoneChain(chain: IKChain, rootBone: THREE.Object3D): THREE.Object3D[] {
    const bones: THREE.Object3D[] = [rootBone];
    let current = rootBone;

    for (const boneName of chain.bones.map(b => b.name).slice(1)) {
      const child = current.children.find(c => c.name === boneName);
      if (child) {
        bones.push(child);
        current = child;
      }
    }

    return bones;
  }

  private solveUnreachable(
    chain: IKChain,
    rootBone: THREE.Object3D,
    targetPosition: THREE.Vector3,
    poleTarget?: THREE.Vector3,
  ): Map<string, THREE.Matrix4> {
    // Stretch bones toward unreachable target
    const positions = this.extractBonePositions(chain, rootBone);
    const lengths = this.extractBoneLengths(chain);
    
    const direction = new THREE.Vector3().subVectors(targetPosition, positions[0]).normalize();
    const totalLength = lengths.reduce((a, b) => a + b, 0);
    const scale = totalLength / (positions[0].distanceTo(targetPosition) || 1);

    const results = new Map<string, THREE.Matrix4>();
    let accumulatedLength = 0;

    for (let i = 0; i < chain.bones.length; i++) {
      const bone = chain.bones[i];
      const newPos = positions[0].clone().addScaledVector(direction, accumulatedLength + lengths[i] * scale);
      
      const matrix = new THREE.Matrix4();
      matrix.compose(newPos, new THREE.Quaternion(), new THREE.Vector3(1, 1, 1));
      results.set(bone.name, matrix);
      
      accumulatedLength += lengths[i];
    }

    return results;
  }

  private applyPoleConstraint(
    positions: THREE.Vector3[],
    poleTarget: THREE.Vector3,
    chain: IKChain,
  ): void {
    if (chain.bones.length < 3) return;

    // Constrain middle bones to point toward pole target
    for (let i = 1; i < positions.length - 1; i++) {
      const prev = positions[i - 1];
      const current = positions[i];
      const next = positions[i + 1];

      const toNext = new THREE.Vector3().subVectors(next, current).normalize();
      const toPole = new THREE.Vector3().subVectors(poleTarget, current).normalize();

      const blend = toNext.dot(toPole);
      const corrected = current.clone().lerp(poleTarget, blend * 0.5);
      positions[i].lerp(corrected, this.config.damping);
    }
  }
}

// Animation Event interface
export interface AnimationEvent {
  id: string;
  clipName: string;
  time: number;
  functionName?: string;
  callback?: (entityId: string) => void;
  parameter?: string | number | boolean;
}

// Bone mapping for retargeting
export interface BoneMapping {
  source: string;
  target: string;
  scale?: number;
  rotationOffset?: THREE.Quaternion;
  positionOffset?: THREE.Vector3;
}

// IK Target interface
export interface IKTargetEntity {
  entityId: string;
  chainName: string;
  target: THREE.Vector3;
  poleTarget?: THREE.Vector3;
  weight: number;
  enabled: boolean;
}

// IK System Manager
export class IKSystem {
  private solvers: Map<string, IKSolver> = new Map();
  private chains: Map<string, IKChain> = new Map();
  private activeTargets: Map<string, IKTargetEntity> = new Map();
  private animationEvents: Map<string, AnimationEvent[]> = new Map();

  constructor() {
    // Default solver
    this.solvers.set('default', new IKSolver());
  }

  createChain(name: string, bones: IKBone[], rootBone: string, tipBone: string, targetBone: string): IKChain {
    const chain: IKChain = { name, bones, rootBone, tipBone, targetBone };
    this.chains.set(name, chain);
    return chain;
  }

  addSolver(name: string, config: Partial<IKSolverConfig>): IKSolver {
    const solver = new IKSolver(config);
    this.solvers.set(name, solver);
    return solver;
  }

  setIKTarget(entityId: string, chainName: string, target: THREE.Vector3, poleTarget?: THREE.Vector3): void {
    this.activeTargets.set(entityId, {
      entityId,
      chainName,
      target,
      poleTarget,
      weight: 1.0,
      enabled: true,
    });
  }

  removeIKTarget(entityId: string): void {
    this.activeTargets.delete(entityId);
  }

  addAnimationEvent(entityId: string, event: AnimationEvent): void {
    if (!this.animationEvents.has(entityId)) {
      this.animationEvents.set(entityId, []);
    }
    this.animationEvents.get(entityId)!.push(event);
  }

  removeAnimationEvent(entityId: string, eventId: string): void {
    const events = this.animationEvents.get(entityId);
    if (events) {
      const index = events.findIndex(e => e.id === eventId);
      if (index !== -1) events.splice(index, 1);
    }
  }

  update(entityId: string, rootBone: THREE.Object3D, solverType: IKSolverType = 'FABRIK'): void {
    const target = this.activeTargets.get(entityId);
    if (!target || !target.enabled) return;

    const chain = this.chains.get(target.chainName);
    if (!chain) return;

    const solver = this.solvers.get(solverType.toLowerCase()) || this.solvers.get('default')!;

    let results: Map<string, THREE.Matrix4>;
    if (solverType === 'CCD') {
      results = solver.solveCCD(chain, rootBone, target.target, target.poleTarget);
    } else if (solverType === 'TwoBone') {
      // Two-bone is special case
      const bones = rootBone.children;
      if (bones.length >= 2) {
        solver.solveTwoBone(bones[0], bones[1], bones[2] || bones[1], target.target, target.poleTarget);
      }
      return;
    } else {
      results = solver.solveFABRIK(chain, rootBone, target.target, target.poleTarget);
    }

    // Apply transforms to bones
    results.forEach((matrix, boneName) => {
      const bone = rootBone.children.find(c => c.name === boneName);
      if (bone) {
        const pos = new THREE.Vector3();
        const quat = new THREE.Quaternion();
        const scale = new THREE.Vector3();
        matrix.decompose(pos, quat, scale);
        bone.position.lerp(pos, target.weight);
        bone.quaternion.slerp(quat, target.weight);
      }
    });
  }

  getAnimationEvents(entityId: string): AnimationEvent[] {
    return this.animationEvents.get(entityId) || [];
  }
}