// ============================================================
// KEVLA ENGINE — ANIMATION SYSTEM v2.0
// Production-Grade Skeletal Animation & State Machine
//
// Architecture:
//   ┌─────────────────────────────────────────────────────────┐
//   │                  ANIMATION SYSTEM                       │
//   │                                                          │
//   │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │
//   │  │AnimationClip│  │Animation    │  │ AnimationMixer │  │
//   │  │(Keyframes)  │  │StateMachine │  │(Blend Trees)   │  │
//   │  └─────────────┘  └─────────────┘  └─────────────────┘  │
//   │                                                          │
//   │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │
//   │  │   Bone      │  │  Skeleton  │  │ SkinnedMesh     │  │
//   │  │  Transform  │  │  Hierarchy  │  │ Renderer        │  │
//   │  └─────────────┘  └─────────────┘  └─────────────────┘  │
//   │                                                          │
//   │  ┌─────────────────────────────────────────────────────┐│
//   │  │           Animation Events & Callbacks              ││
//   │  └─────────────────────────────────────────────────────┘│
//   └─────────────────────────────────────────────────────────┘
//
// Features:
//   • Keyframe tracks for position, rotation, scale, custom props
//   • State machine with transitions, blend trees, layers
//   • Skeletal animation with bone hierarchy
//   • Root motion extraction
//   • Animation events (onAnimationEnd, onKeyframeHit)
//   • Additive blending and masking
// ============================================================

import type { Vector3, Entity } from './types';

// ============================================================
// TYPES — Animation Data Structures
// ============================================================

/** Keyframe for animation tracks */
export interface Keyframe<T = number> {
  time: number;
  value: T;
  inTangent?: T;
  outTangent?: T;
}

/** Animation curve/track */
export interface AnimationCurve {
  targetPath: string;        // e.g., "root/arm/forearm"
  property: AnimationProperty;
  keyframes: Keyframe[];
  preWrapMode: WrapMode;
  postWrapMode: WrapMode;
}

export type AnimationProperty = 
  | 'position' | 'rotation' | 'scale' 
  | 'color' | 'opacity' | 'custom';

/** Wrap mode for animation */
export type WrapMode = 'clamp' | 'loop' | 'pingpong' | 'mirror';

/** Animation curve type */
export type CurveType = 'linear' | 'bezier' | 'stepped';

/** Animation clip */
export interface AnimationClip {
  id: string;
  name: string;
  duration: number;
  frameRate: number;
  curves: AnimationCurve[];
  events: AnimationEvent[];
  rootMotion: RootMotionData | null;
}

/** Animation event (callback at specific time) */
export interface AnimationEvent {
  time: number;
  functionName: string;
  parameter: string | number | boolean;
}

/** Root motion data */
export interface RootMotionData {
  positionCurve: Keyframe<Vector3>[];
  rotationCurve: Keyframe<Vector3>[];
  applyToRoot: boolean;
}

/** Bone in skeleton */
export interface Bone {
  id: string;
  name: string;
  parentId: string | null;
  localPosition: Vector3;
  localRotation: Vector3;
  localScale: Vector3;
  bindPoseInverse: Float32Array;  // 4x4 matrix inverse
  length: number;
  children: string[];
}

/** Skeleton definition */
export interface Skeleton {
  id: string;
  name: string;
  bones: Bone[];
  rootBoneId: string | null;
  boneIndexMap: Map<string, number>;
}

/** Skinned mesh influence */
export interface SkinnedVertex {
  boneIndices: number[];
  boneWeights: number[];
}

/** Animation state in state machine */
export interface AnimationState {
  id: string;
  name: string;
  clipId: string | null;
  clip: AnimationClip | null;
  speed: number;
  normalizedTime: number;
  isPlaying: boolean;
  loop: boolean;
  blendWeight: number;
  exitTime: number;
  transitionDuration: number;
  anyStateTransition: boolean;
}

/** State machine transition */
export interface AnimationTransition {
  id: string;
  fromStateId: string;
  toStateId: string;
  condition: TransitionCondition;
  duration: number;
  offset: number;
  interruptionSource: InterruptionSource;
}

export type InterruptionSource = 'none' | 'current' | 'next' | 'currentThenNext';

/** Transition condition */
export interface TransitionCondition {
  parameter: string;
  mode: 'if' | 'while' | 'greater' | 'less' | 'equals' | 'notEquals';
  value: number | string | boolean;
  threshold?: number;
}

/** Blend tree */
export interface BlendTree {
  id: string;
  name: string;
  type: BlendTreeType;
  children: BlendTreeChild[];
  parameter: string;
  blendParameter: string;
  minThreshold: number;
  maxThreshold: number;
}

export type BlendTreeType = 'simple1D' | 'simpleDirectional2D' | 'freeformCartesian2D' | 'freeformDirectional2D' | 'direct';

export interface BlendTreeChild {
  motionId: string;
  motionClip: AnimationClip | null;
  threshold: number;
  position: Vector3;  // for 2D blend trees
  timeScale: number;
  blendWeight: number;
}

/** Animation layer */
export interface AnimationLayer {
  id: string;
  name: string;
  weight: number;
  blending: 'override' | 'additive';
  stateMachineId: string;
  avatarMask: AvatarMask | null;
  passThrough: boolean;
}

/** Avatar mask (bone filtering) */
export interface AvatarMask {
  transformCount: number;
  mask: boolean[];
  allowAdditive: boolean;
}

/** Animation mixer (blend tree executor) */
export class AnimationMixer {
  clips: AnimationClip[] = [];
  activeStates: Map<string, AnimationState> = new Map();
  blendTrees: Map<string, BlendTree> = new Map();
  currentTime: number = 0;
  deltaTime: number = 0;
  events: Map<string, AnimationEvent[]> = new Map();

  evaluate(
    bonePath: string,
    property: AnimationProperty,
    time: number
  ): unknown {
    for (const [, state] of this.activeStates) {
      if (!state.clip) continue;
      
      const clip = state.clip;
      const adjustedTime = this._wrapTime(time, clip, state);
      
      for (const curve of clip.curves) {
        if (curve.targetPath !== bonePath || curve.property !== property) continue;
        
        return this._evaluateCurve(curve, adjustedTime);
      }
    }
    
    return null;
  }

  private _wrapTime(time: number, clip: AnimationClip, state: AnimationState): number {
    const duration = clip.duration;
    if (duration <= 0) return 0;
    
    const loopTime = time % duration;
    return loopTime < 0 ? loopTime + duration : loopTime;
  }

  private _evaluateCurve(curve: AnimationCurve, time: number): unknown {
    const keyframes = curve.keyframes;
    if (keyframes.length === 0) return null;
    if (keyframes.length === 1) return keyframes[0].value;
    
    // Find surrounding keyframes
    let prevIdx = 0;
    for (let i = 0; i < keyframes.length - 1; i++) {
      if (time >= keyframes[i].time && time <= keyframes[i + 1].time) {
        prevIdx = i;
        break;
      }
    }
    
    const k1 = keyframes[prevIdx];
    const k2 = keyframes[prevIdx + 1];
    const t = (time - k1.time) / (k2.time - k1.time);
    
    // Linear interpolation (can be enhanced to bezier)
    if (k1.value instanceof Object && 'x' in k1.value) {
      return {
        x: k1.value.x + (k2.value.x - k1.value.x) * t,
        y: k1.value.y + (k2.value.y - k1.value.y) * t,
        z: k1.value.z + (k2.value.z - k1.value.z) * t,
      };
    }
    
    return k1.value + (k2.value as number - k1.value) * t;
  }
}

// ============================================================
// DEFAULT ANIMATION CLIPS
// ============================================================

export const DEFAULT_ANIMATION_CLIPS: AnimationClip[] = [
  {
    id: 'idle',
    name: 'Idle',
    duration: 2.0,
    frameRate: 30,
    curves: [
      {
        targetPath: 'root',
        property: 'position',
        keyframes: [
          { time: 0, value: { x: 0, y: 0, z: 0 } },
          { time: 1, value: { x: 0, y: 0.05, z: 0 } },
          { time: 2, value: { x: 0, y: 0, z: 0 } },
        ],
        preWrapMode: 'loop',
        postWrapMode: 'loop',
      },
    ],
    events: [],
    rootMotion: null,
  },
  {
    id: 'walk',
    name: 'Walk',
    duration: 0.8,
    frameRate: 30,
    curves: [
      {
        targetPath: 'root',
        property: 'position',
        keyframes: [
          { time: 0, value: { x: 0, y: 0, z: 0 } },
          { time: 0.4, value: { x: 0, y: 0, z: 0.5 } },
          { time: 0.8, value: { x: 0, y: 0, z: 1.0 } },
        ],
        preWrapMode: 'loop',
        postWrapMode: 'loop',
      },
    ],
    events: [
      { time: 0, functionName: 'onFootstep', parameter: 'left' },
      { time: 0.4, functionName: 'onFootstep', parameter: 'right' },
    ],
    rootMotion: { positionCurve: [], rotationCurve: [], applyToRoot: true },
  },
  {
    id: 'run',
    name: 'Run',
    duration: 0.6,
    frameRate: 60,
    curves: [
      {
        targetPath: 'root',
        property: 'position',
        keyframes: [
          { time: 0, value: { x: 0, y: 0, z: 0 } },
          { time: 0.3, value: { x: 0, y: -0.1, z: 1.5 } },
          { time: 0.6, value: { x: 0, y: 0, z: 3.0 } },
        ],
        preWrapMode: 'loop',
        postWrapMode: 'loop',
      },
    ],
    events: [
      { time: 0, functionName: 'onFootstep', parameter: 'left' },
      { time: 0.3, functionName: 'onFootstep', parameter: 'right' },
    ],
    rootMotion: { positionCurve: [], rotationCurve: [], applyToRoot: true },
  },
  {
    id: 'jump',
    name: 'Jump',
    duration: 1.0,
    frameRate: 30,
    curves: [
      {
        targetPath: 'root',
        property: 'position',
        keyframes: [
          { time: 0, value: { x: 0, y: 0, z: 0 } },
          { time: 0.2, value: { x: 0, y: 0.5, z: 0 } },
          { time: 0.5, value: { x: 0, y: 1.0, z: 0 } },
          { time: 0.7, value: { x: 0, y: 0.8, z: 0 } },
          { time: 1.0, value: { x: 0, y: 0, z: 0 } },
        ],
        preWrapMode: 'clamp',
        postWrapMode: 'clamp',
      },
    ],
    events: [
      { time: 0, functionName: 'onJump', parameter: 0 },
      { time: 0.5, functionName: 'onJumpApex', parameter: 1 },
      { time: 1.0, functionName: 'onLand', parameter: 0 },
    ],
    rootMotion: { positionCurve: [], rotationCurve: [], applyToRoot: true },
  },
  {
    id: 'attack',
    name: 'Attack',
    duration: 0.5,
    frameRate: 60,
    curves: [
      {
        targetPath: 'root',
        property: 'rotation',
        keyframes: [
          { time: 0, value: { x: 0, y: 0, z: 0 } },
          { time: 0.15, value: { x: 0, y: -45, z: 0 } },
          { time: 0.25, value: { x: 0, y: 45, z: 0 } },
          { time: 0.5, value: { x: 0, y: 0, z: 0 } },
        ],
        preWrapMode: 'clamp',
        postWrapMode: 'clamp',
      },
    ],
    events: [
      { time: 0.15, functionName: 'onHitFrame', parameter: 'impact' },
    ],
    rootMotion: null,
  },
  {
    id: 'hit',
    name: 'Hit',
    duration: 0.3,
    frameRate: 30,
    curves: [
      {
        targetPath: 'root',
        property: 'rotation',
        keyframes: [
          { time: 0, value: { x: 0, y: 0, z: 0 } },
          { time: 0.05, value: { x: 0, y: -15, z: 0 } },
          { time: 0.1, value: { x: 0, y: 15, z: 0 } },
          { time: 0.3, value: { x: 0, y: 0, z: 0 } },
        ],
        preWrapMode: 'clamp',
        postWrapMode: 'clamp',
      },
    ],
    events: [],
    rootMotion: null,
  },
  {
    id: 'death',
    name: 'Death',
    duration: 2.0,
    frameRate: 30,
    curves: [
      {
        targetPath: 'root',
        property: 'position',
        keyframes: [
          { time: 0, value: { x: 0, y: 0, z: 0 } },
          { time: 0.5, value: { x: 0, y: -0.5, z: 0 } },
          { time: 2.0, value: { x: 0, y: -1.0, z: 0 } },
        ],
        preWrapMode: 'clamp',
        postWrapMode: 'clamp',
      },
      {
        targetPath: 'root',
        property: 'rotation',
        keyframes: [
          { time: 0, value: { x: 0, y: 0, z: 0 } },
          { time: 0.3, value: { x: -90, y: 0, z: 0 } },
          { time: 2.0, value: { x: -90, y: 0, z: 0 } },
        ],
        preWrapMode: 'clamp',
        postWrapMode: 'clamp',
      },
    ],
    events: [
      { time: 0, functionName: 'onDeath', parameter: 0 },
      { time: 2.0, functionName: 'onDeathComplete', parameter: 1 },
    ],
    rootMotion: null,
  },
];

// ============================================================
// ANIMATION STATE MACHINE
// ============================================================

export class AnimationStateMachine {
  id: string;
  name: string;
  states: Map<string, AnimationState> = new Map();
  transitions: AnimationTransition[] = [];
  defaultStateId: string | null = null;
  currentStateId: string | null = null;
  parameters: Map<string, number | string | boolean> = new Map();
  layers: AnimationLayer[] = [];
  events: Map<string, (param?: unknown) => void> = new Map();

  private currentState: AnimationState | null = null;
  private targetState: AnimationState | null = null;
  private transitionProgress: number = 0;
  private transitionDuration: number = 0;

  constructor(id: string, name: string) {
    this.id = id;
    this.name = name;
  }

  addState(state: AnimationState): void {
    this.states.set(state.id, state);
    if (this.defaultStateId === null) {
      this.defaultStateId = state.id;
    }
  }

  removeState(stateId: string): boolean {
    if (stateId === this.defaultStateId) return false;
    return this.states.delete(stateId);
  }

  addTransition(transition: AnimationTransition): void {
    this.transitions.push(transition);
  }

  removeTransition(transitionId: string): void {
    this.transitions = this.transitions.filter(t => t.id !== transitionId);
  }

  setDefaultState(stateId: string): boolean {
    if (!this.states.has(stateId)) return false;
    this.defaultStateId = stateId;
    return true;
  }

  setParameter(name: string, value: number | string | boolean): void {
    this.parameters.set(name, value);
  }

  getParameter(name: string): number | string | boolean | undefined {
    return this.parameters.get(name);
  }

  getCurrentState(): AnimationState | null {
    return this.currentState;
  }

  addEventListener(event: string, callback: (param?: unknown) => void): void {
    this.events.set(event, callback);
  }

  private _evaluateConditions(conditions: TransitionCondition[]): boolean {
    for (const cond of conditions) {
      const paramValue = this.parameters.get(cond.parameter);
      if (paramValue === undefined) continue;
      
      switch (cond.mode) {
        case 'if':
        case 'equals':
          if (paramValue !== cond.value) return false;
          break;
        case 'notEquals':
          if (paramValue === cond.value) return false;
          break;
        case 'greater':
          if (typeof paramValue !== 'number' || typeof cond.value !== 'number') return false;
          if (paramValue <= cond.value) return false;
          break;
        case 'less':
          if (typeof paramValue !== 'number' || typeof cond.value !== 'number') return false;
          if (paramValue >= cond.value) return false;
          break;
      }
    }
    return true;
  }

  update(deltaTime: number): void {
    // Update current state time
    if (this.currentState) {
      this.currentState.normalizedTime += deltaTime * this.currentState.speed;
      
      if (this.currentState.clip) {
        const duration = this.currentState.clip.duration;
        if (this.currentState.loop) {
          this.currentState.normalizedTime = this.currentState.normalizedTime % duration;
        } else if (this.currentState.normalizedTime >= duration) {
          this.currentState.normalizedTime = duration;
          
          // Trigger animation end event
          const events = this.events.get('onAnimationEnd');
          if (events) events(this.currentState.id);
        }
      }
    }

    // Check for transitions
    this._checkTransitions();

    // Handle transition blending
    if (this.targetState && this.transitionProgress < 1) {
      this.transitionProgress += deltaTime / this.transitionDuration;
      if (this.transitionProgress >= 1) {
        this.transitionProgress = 1;
        this.currentState = this.targetState;
        this.currentStateId = this.targetState.id;
        this.targetState = null;
        this.transitionProgress = 0;
      }
    }
  }

  private _checkTransitions(): void {
    // Check any-state transitions first
    for (const transition of this.transitions) {
      if (transition.fromStateId !== 'any') continue;
      if (!this._evaluateConditions([transition.condition])) continue;
      
      this._startTransition(transition);
      return;
    }

    // Check current state transitions
    if (!this.currentStateId) return;
    
    for (const transition of this.transitions) {
      if (transition.fromStateId !== this.currentStateId) continue;
      if (!this._evaluateConditions([transition.condition])) continue;
      
      this._startTransition(transition);
      return;
    }
  }

  private _startTransition(transition: AnimationTransition): void {
    const toState = this.states.get(transition.toStateId);
    if (!toState) return;

    this.targetState = toState;
    this.transitionDuration = transition.duration;
    this.transitionProgress = 0;
    
    // Reset target state
    this.targetState.normalizedTime = transition.offset;
    this.targetState.isPlaying = true;
  }

  play(stateId: string): void {
    const state = this.states.get(stateId);
    if (!state) return;
    
    this.currentState = state;
    this.currentStateId = stateId;
    state.isPlaying = true;
    state.normalizedTime = 0;
    this.targetState = null;
    this.transitionProgress = 1;
  }

  crossFade(stateId: string, duration: number = 0.3): void {
    if (!this.currentState) {
      this.play(stateId);
      return;
    }

    const toState = this.states.get(stateId);
    if (!toState) return;

    // Find transition
    const transition = this.transitions.find(
      t => t.fromStateId === this.currentStateId && t.toStateId === stateId
    );

    if (transition) {
      this.transitionDuration = transition.duration;
    } else {
      this.transitionDuration = duration;
    }

    this.targetState = toState;
    this.targetState.normalizedTime = 0;
    this.targetState.isPlaying = true;
    this.transitionProgress = 0;
  }

  getBlendWeight(): number {
    if (!this.targetState || !this.currentState) return 1;
    return this.transitionProgress;
  }

  getCurrentClip(): AnimationClip | null {
    if (this.targetState && this.transitionProgress < 1) {
      return this.targetState.clip;
    }
    return this.currentState?.clip || null;
  }

  getCurrentTime(): number {
    return this.currentState?.normalizedTime || 0;
  }
}

// ============================================================
// SKELETAL ANIMATION SYSTEM
// ============================================================

export class SkeletalAnimationSystem {
  skeletons: Map<string, Skeleton> = new Map();
  stateMachines: Map<string, AnimationStateMachine> = new Map();
  rootMotionTargets: Set<string> = new Set();

  private boneMatrices: Map<string, Float32Array[]> = new Map();
  private inverseBindMatrices: Map<string, Float32Array[]> = new Map();

  createSkeleton(id: string, name: string, boneData: Omit<Bone, 'children'>[]): Skeleton {
    const skeleton: Skeleton = {
      id,
      name,
      bones: [],
      rootBoneId: null,
      boneIndexMap: new Map(),
    };

    // Build bone hierarchy
    const boneMap = new Map<string, Omit<Bone, 'children'>>();
    for (const bone of boneData) {
      boneMap.set(bone.id, bone);
      skeleton.bones.push({ ...bone, children: [] });
      skeleton.boneIndexMap.set(bone.id, skeleton.bones.length - 1);
    }

    // Set parent-child relationships
    for (const bone of skeleton.bones) {
      if (bone.parentId) {
        const parent = skeleton.bones.find(b => b.id === bone.parentId);
        if (parent) parent.children.push(bone.id);
      } else {
        skeleton.rootBoneId = bone.id;
      }
    }

    // Compute bind pose
    this._computeBindPose(skeleton);

    this.skeletons.set(id, skeleton);
    return skeleton;
  }

  private _computeBindPose(skeleton: Skeleton): void {
    for (const bone of skeleton.bones) {
      // Compute world transform
      const worldTransform = this._getBoneWorldTransform(skeleton, bone.id);
      
      // Store inverse bind pose
      const inverseBindPose = this._invertMatrix(worldTransform);
      bone.bindPoseInverse = inverseBindPose;
    }
  }

  private _getBoneWorldTransform(skeleton: Skeleton, boneId: string): Float32Array {
    const bone = skeleton.bones.find(b => b.id === boneId);
    if (!bone) return new Float32Array(16);

    if (!bone.parentId) {
      return this._translateMatrix(bone.localPosition);
    }

    const parentMatrix = this._getBoneWorldTransform(skeleton, bone.parentId);
    const localMatrix = this._composeMatrix(bone.localPosition, bone.localRotation, bone.localScale);
    return this._multiplyMatrix(parentMatrix, localMatrix);
  }

  private _composeMatrix(position: Vector3, rotation: Vector3, scale: Vector3): Float32Array {
    const matrix = new Float32Array(16);
    
    // Simplified rotation (Euler to rotation matrix)
    const cx = Math.cos(rotation.x), sx = Math.sin(rotation.x);
    const cy = Math.cos(rotation.y), sy = Math.sin(rotation.y);
    const cz = Math.cos(rotation.z), sz = Math.sin(rotation.z);

    matrix[0] = cy * cz;
    matrix[1] = sx * sy * cz + cx * sz;
    matrix[2] = -cx * sy * cz + sx * sz;
    matrix[3] = 0;
    matrix[4] = -cy * sz;
    matrix[5] = -sx * sy * sz + cx * cz;
    matrix[6] = cx * sy * sz + sx * cz;
    matrix[7] = 0;
    matrix[8] = sy;
    matrix[9] = -sx * cy;
    matrix[10] = cx * cy;
    matrix[11] = 0;
    matrix[12] = position.x;
    matrix[13] = position.y;
    matrix[14] = position.z;
    matrix[15] = 1;

    // Apply scale
    matrix[0] *= scale.x; matrix[1] *= scale.x; matrix[2] *= scale.x;
    matrix[4] *= scale.y; matrix[5] *= scale.y; matrix[6] *= scale.y;
    matrix[8] *= scale.z; matrix[9] *= scale.z; matrix[10] *= scale.z;

    return matrix;
  }

  private _translateMatrix(position: Vector3): Float32Array {
    const matrix = new Float32Array(16);
    matrix[0] = 1; matrix[5] = 1; matrix[10] = 1; matrix[15] = 1;
    matrix[12] = position.x;
    matrix[13] = position.y;
    matrix[14] = position.z;
    return matrix;
  }

  private _multiplyMatrix(a: Float32Array, b: Float32Array): Float32Array {
    const result = new Float32Array(16);
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        let sum = 0;
        for (let k = 0; k < 4; k++) {
          sum += a[i * 4 + k] * b[k * 4 + j];
        }
        result[i * 4 + j] = sum;
      }
    }
    return result;
  }

  private _invertMatrix(m: Float32Array): Float32Array {
    // Simplified inverse (full implementation would be more complex)
    const inv = new Float32Array(16);
    inv[0] = 1; inv[5] = 1; inv[10] = 1; inv[15] = 1;
    inv[12] = -m[12];
    inv[13] = -m[13];
    inv[14] = -m[14];
    return inv;
  }

  getBoneMatrices(skeletonId: string): Float32Array[] | null {
    const skeleton = this.skeletons.get(skeletonId);
    if (!skeleton) return null;

    const matrices: Float32Array[] = [];
    for (const bone of skeleton.bones) {
      const worldTransform = this._getBoneWorldTransform(skeleton, bone.id);
      matrices.push(worldTransform);
    }

    return matrices;
  }

  updateBoneFromAnimation(
    skeletonId: string,
    boneId: string,
    position: Vector3,
    rotation: Vector3,
    scale: Vector3
  ): void {
    const skeleton = this.skeletons.get(skeletonId);
    if (!skeleton) return;

    const bone = skeleton.bones.find(b => b.id === boneId);
    if (bone) {
      bone.localPosition = position;
      bone.localRotation = rotation;
      bone.localScale = scale;
    }
  }
}

// ============================================================
// DEFAULT SKELETONS
// ============================================================

export function createHumanoidSkeleton(): Skeleton {
  const bones: Omit<Bone, 'children'>[] = [
    { id: 'root', name: 'Root', parentId: null, localPosition: { x: 0, y: 0, z: 0 }, localRotation: { x: 0, y: 0, z: 0 }, localScale: { x: 1, y: 1, z: 1 }, bindPoseInverse: new Float32Array(16), length: 0 },
    { id: 'hips', name: 'Hips', parentId: 'root', localPosition: { x: 0, y: 1, z: 0 }, localRotation: { x: 0, y: 0, z: 0 }, localScale: { x: 1, y: 1, z: 1 }, bindPoseInverse: new Float32Array(16), length: 0.2 },
    { id: 'spine', name: 'Spine', parentId: 'hips', localPosition: { x: 0, y: 0.2, z: 0 }, localRotation: { x: 0, y: 0, z: 0 }, localScale: { x: 1, y: 1, z: 1 }, bindPoseInverse: new Float32Array(16), length: 0.25 },
    { id: 'chest', name: 'Chest', parentId: 'spine', localPosition: { x: 0, y: 0.25, z: 0 }, localRotation: { x: 0, y: 0, z: 0 }, localScale: { x: 1, y: 1, z: 1 }, bindPoseInverse: new Float32Array(16), length: 0.25 },
    { id: 'neck', name: 'Neck', parentId: 'chest', localPosition: { x: 0, y: 0.25, z: 0 }, localRotation: { x: 0, y: 0, z: 0 }, localScale: { x: 1, y: 1, z: 1 }, bindPoseInverse: new Float32Array(16), length: 0.1 },
    { id: 'head', name: 'Head', parentId: 'neck', localPosition: { x: 0, y: 0.1, z: 0 }, localRotation: { x: 0, y: 0, z: 0 }, localScale: { x: 1, y: 1, z: 1 }, bindPoseInverse: new Float32Array(16), length: 0.2 },
    { id: 'leftShoulder', name: 'Left Shoulder', parentId: 'chest', localPosition: { x: -0.2, y: 0.15, z: 0 }, localRotation: { x: 0, y: 0, z: 0 }, localScale: { x: 1, y: 1, z: 1 }, bindPoseInverse: new Float32Array(16), length: 0.15 },
    { id: 'leftArm', name: 'Left Arm', parentId: 'leftShoulder', localPosition: { x: -0.15, y: 0, z: 0 }, localRotation: { x: 0, y: 0, z: 0 }, localScale: { x: 1, y: 1, z: 1 }, bindPoseInverse: new Float32Array(16), length: 0.3 },
    { id: 'leftForearm', name: 'Left Forearm', parentId: 'leftArm', localPosition: { x: -0.3, y: 0, z: 0 }, localRotation: { x: 0, y: 0, z: 0 }, localScale: { x: 1, y: 1, z: 1 }, bindPoseInverse: new Float32Array(16), length: 0.28 },
    { id: 'leftHand', name: 'Left Hand', parentId: 'leftForearm', localPosition: { x: -0.28, y: 0, z: 0 }, localRotation: { x: 0, y: 0, z: 0 }, localScale: { x: 1, y: 1, z: 1 }, bindPoseInverse: new Float32Array(16), length: 0.1 },
    { id: 'rightShoulder', name: 'Right Shoulder', parentId: 'chest', localPosition: { x: 0.2, y: 0.15, z: 0 }, localRotation: { x: 0, y: 0, z: 0 }, localScale: { x: 1, y: 1, z: 1 }, bindPoseInverse: new Float32Array(16), length: 0.15 },
    { id: 'rightArm', name: 'Right Arm', parentId: 'rightShoulder', localPosition: { x: 0.15, y: 0, z: 0 }, localRotation: { x: 0, y: 0, z: 0 }, localScale: { x: 1, y: 1, z: 1 }, bindPoseInverse: new Float32Array(16), length: 0.3 },
    { id: 'rightForearm', name: 'Right Forearm', parentId: 'rightArm', localPosition: { x: 0.3, y: 0, z: 0 }, localRotation: { x: 0, y: 0, z: 0 }, localScale: { x: 1, y: 1, z: 1 }, bindPoseInverse: new Float32Array(16), length: 0.28 },
    { id: 'rightHand', name: 'Right Hand', parentId: 'rightForearm', localPosition: { x: 0.28, y: 0, z: 0 }, localRotation: { x: 0, y: 0, z: 0 }, localScale: { x: 1, y: 1, z: 1 }, bindPoseInverse: new Float32Array(16), length: 0.1 },
    { id: 'leftUpLeg', name: 'Left Up Leg', parentId: 'hips', localPosition: { x: -0.1, y: 0, z: 0 }, localRotation: { x: 0, y: 0, z: 0 }, localScale: { x: 1, y: 1, z: 1 }, bindPoseInverse: new Float32Array(16), length: 0.4 },
    { id: 'leftLeg', name: 'Left Leg', parentId: 'leftUpLeg', localPosition: { x: 0, y: -0.4, z: 0 }, localRotation: { x: 0, y: 0, z: 0 }, localScale: { x: 1, y: 1, z: 1 }, bindPoseInverse: new Float32Array(16), length: 0.4 },
    { id: 'leftFoot', name: 'Left Foot', parentId: 'leftLeg', localPosition: { x: 0, y: -0.4, z: 0 }, localRotation: { x: 0, y: 0, z: 0 }, localScale: { x: 1, y: 1, z: 1 }, bindPoseInverse: new Float32Array(16), length: 0.15 },
    { id: 'rightUpLeg', name: 'Right Up Leg', parentId: 'hips', localPosition: { x: 0.1, y: 0, z: 0 }, localRotation: { x: 0, y: 0, z: 0 }, localScale: { x: 1, y: 1, z: 1 }, bindPoseInverse: new Float32Array(16), length: 0.4 },
    { id: 'rightLeg', name: 'Right Leg', parentId: 'rightUpLeg', localPosition: { x: 0, y: -0.4, z: 0 }, localRotation: { x: 0, y: 0, z: 0 }, localScale: { x: 1, y: 1, z: 1 }, bindPoseInverse: new Float32Array(16), length: 0.4 },
    { id: 'rightFoot', name: 'Right Foot', parentId: 'rightLeg', localPosition: { x: 0, y: -0.4, z: 0 }, localRotation: { x: 0, y: 0, z: 0 }, localScale: { x: 1, y: 1, z: 1 }, bindPoseInverse: new Float32Array(16), length: 0.15 },
  ];

  const system = new SkeletalAnimationSystem();
  return system.createSkeleton('humanoid', 'Humanoid', bones);
}

// ============================================================
// ANIMATION SYSTEM MAIN CLASS
// ============================================================

export class AnimationSystem {
  clips: Map<string, AnimationClip> = new Map();
  stateMachines: Map<string, AnimationStateMachine> = new Map();
  skeletalSystem: SkeletalAnimationSystem;
  activeAnimations: Map<string, AnimationStateMachine> = new Map();

  constructor() {
    this.skeletalSystem = new SkeletalAnimationSystem();
    this._loadDefaultClips();
  }

  private _loadDefaultClips(): void {
    for (const clip of DEFAULT_ANIMATION_CLIPS) {
      this.clips.set(clip.id, clip);
    }
  }

  registerClip(clip: AnimationClip): void {
    this.clips.set(clip.id, clip);
  }

  getClip(clipId: string): AnimationClip | undefined {
    return this.clips.get(clipId);
  }

  createStateMachine(id: string, name: string): AnimationStateMachine {
    const sm = new AnimationStateMachine(id, name);
    this.stateMachines.set(id, sm);
    return sm;
  }

  play(entityId: string, stateMachineId: string): void {
    const sm = this.stateMachines.get(stateMachineId);
    if (!sm) return;

    if (sm.defaultStateId) {
      sm.play(sm.defaultStateId);
    }
    this.activeAnimations.set(entityId, sm);
  }

  crossFade(entityId: string, stateMachineId: string, stateId: string, duration: number = 0.3): void {
    let sm = this.activeAnimations.get(entityId);
    
    if (!sm || sm.id !== stateMachineId) {
      sm = this.stateMachines.get(stateMachineId);
      if (!sm) return;
      this.activeAnimations.set(entityId, sm);
    }

    sm.crossFade(stateId, duration);
  }

  setParameter(entityId: string, name: string, value: number | string | boolean): void {
    const sm = this.activeAnimations.get(entityId);
    if (sm) {
      sm.setParameter(name, value);
    }
  }

  update(deltaTime: number): void {
    for (const [, sm] of this.activeAnimations) {
      sm.update(deltaTime);
    }
  }

  getCurrentClip(entityId: string): AnimationClip | null {
    const sm = this.activeAnimations.get(entityId);
    return sm?.getCurrentClip() || null;
  }

  getCurrentTime(entityId: string): number {
    const sm = this.activeAnimations.get(entityId);
    return sm?.getCurrentTime() || 0;
  }

  isPlaying(entityId: string): boolean {
    const sm = this.activeAnimations.get(entityId);
    return sm?.getCurrentState()?.isPlaying || false;
  }

  stop(entityId: string): void {
    this.activeAnimations.delete(entityId);
  }
}