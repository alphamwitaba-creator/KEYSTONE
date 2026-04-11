// ============================================================
// KEVLA ENGINE — Behavior Tree System v2.0
// Visual AI editor with hierarchical task planning
// ============================================================

import * as THREE from 'three';

// ============================================================
// BEHAVIOR TREE TYPES
// ============================================================

export type NodeType = 
  | 'selector' | 'sequence' | 'parallel' | 'decorator'
  | 'action' | 'condition' | 'subtree';

export type NodeStatus = 'idle' | 'running' | 'success' | 'failure';

export interface BTNodeConfig {
  id: string;
  name: string;
  type: NodeType;
  description?: string;
  color?: string;
  icon?: string;
}

export interface BehaviorTree {
  id: string;
  name: string;
  rootNode: BTNode;
  variables: BTVariable[];
  blackboard: Map<string, any>;
}

export interface BTNode {
  id: string;
  config: BTNodeConfig;
  children: BTNode[];
  parent: BTNode | null;
  status: NodeStatus;
  lastExecutionTime: number;
}

export interface BTDecorator extends BTNode {
  child: BTNode;
  inverted: boolean;
  condition?: (blackboard: Map<string, any>) => boolean;
}

export interface BTSelector extends BTNode {
  abortPolicy: 'none' | 'lowerPriority' | 'self';
}

export interface BTSequence extends BTNode {
  strictMode: boolean;
}

export interface BTParallel extends BTNode {
  policy: 'requireOne' | 'requireAll' | 'sequence';
}

export interface BTAction extends BTNode {
  action: (blackboard: Map<string, any>, dt: number) => NodeStatus;
  category: 'movement' | 'animation' | 'combat' | 'utility' | 'custom';
  parameters: Record<string, any>;
}

export interface BTCondition extends BTNode {
  condition: (blackboard: Map<string, any>) => boolean;
}

export interface BTVariable {
  name: string;
  type: 'number' | 'string' | 'boolean' | 'vector3';
  defaultValue: any;
  exposed: boolean;
}

// ============================================================
// NODE FACTORY
// ============================================================

let _nodeIdCounter = 0;
const uid = () => `bt_node_${Date.now()}_${_nodeIdCounter++}`;

export function createSelectorNode(name: string = 'Selector', description?: string): BTSelector {
  return {
    id: uid(),
    config: { id: '', name, type: 'selector', description, color: '#e06c75' },
    children: [],
    parent: null,
    status: 'idle',
    lastExecutionTime: 0,
    abortPolicy: 'none',
  };
}

export function createSequenceNode(name: string = 'Sequence', strictMode: boolean = true): BTSequence {
  return {
    id: uid(),
    config: { id: '', name, type: 'sequence', description: strictMode ? 'Strict Sequence' : 'Sequence', color: '#98c379' },
    children: [],
    parent: null,
    status: 'idle',
    lastExecutionTime: 0,
    strictMode,
  };
}

export function createParallelNode(name: string = 'Parallel', policy: BTParallel['policy'] = 'requireAll'): BTParallel {
  return {
    id: uid(),
    config: { id: '', name, type: 'parallel', description: `Parallel (${policy})`, color: '#61afef' },
    children: [],
    parent: null,
    status: 'idle',
    lastExecutionTime: 0,
    policy,
  };
}

export function createActionNode(
  name: string, 
  action: BTAction['action'],
  category: BTAction['category'] = 'custom',
  parameters: BTAction['parameters'] = {}
): BTAction {
  return {
    id: uid(),
    config: { id: '', name, type: 'action', description: `Action: ${category}`, color: '#c678dd', icon: 'play' },
    children: [],
    parent: null,
    status: 'idle',
    lastExecutionTime: 0,
    action,
    category,
    parameters,
  };
}

export function createConditionNode(
  name: string,
  condition: BTCondition['condition']
): BTCondition {
  return {
    id: uid(),
    config: { id: '', name, type: 'condition', description: 'Condition Check', color: '#d19a66' },
    children: [],
    parent: null,
    status: 'idle',
    lastExecutionTime: 0,
    condition,
  };
}

export function createDecoratorNode(
  name: string,
  type: 'inverter' | 'succeeder' | 'failer' | 'repeater' | 'untilSuccess' | 'untilFailure' | 'limiter',
  child?: BTNode
): BTDecorator {
  const descriptions: Record<string, string> = {
    inverter: 'Invert Result',
    succeeder: 'Always Succeed',
    failer: 'Always Fail',
    repeater: 'Repeat N Times',
    untilSuccess: 'Repeat Until Success',
    untilFailure: 'Repeat Until Failure',
    limiter: 'Limit Executions',
  };

  const colors: Record<string, string> = {
    inverter: '#e5c07b',
    succeeder: '#98c379',
    failer: '#e06c75',
    repeater: '#61afef',
    untilSuccess: '#56b6c2',
    untilFailure: '#c678dd',
    limiter: '#d19a66',
  };

  return {
    id: uid(),
    config: { id: '', name: `${name} (${type})`, type: 'decorator', description: descriptions[type], color: colors[type] },
    children: child ? [child] : [],
    parent: null,
    status: 'idle',
    lastExecutionTime: 0,
    inverted: type === 'inverter',
  };
}

export function createSubtreeNode(name: string, subtreeId: string): BTNode {
  return {
    id: uid(),
    config: { id: '', name, type: 'subtree', description: `Subtree: ${subtreeId}`, color: '#be5046' },
    children: [],
    parent: null,
    status: 'idle',
    lastExecutionTime: 0,
  };
}

// ============================================================
// BEHAVIOR TREE EXECUTOR
// ============================================================

export class BehaviorTreeExecutor {
  private tree: BehaviorTree;
  private nodeStatus: Map<string, NodeStatus> = new Map();
  private nodeCounters: Map<string, number> = new Map();

  constructor(tree: BehaviorTree) {
    this.tree = tree;
  }

  tick(blackboard: Map<string, any>, dt: number): NodeStatus {
    this.resetStatuses(this.tree.rootNode);
    return this.executeNode(this.tree.rootNode, blackboard, dt);
  }

  private executeNode(node: BTNode, blackboard: Map<string, any>, dt: number): NodeStatus {
    const startTime = performance.now();
    let result: NodeStatus;

    switch (node.config.type) {
      case 'selector':
        result = this.executeSelector(node as BTSelector, blackboard, dt);
        break;
      case 'sequence':
        result = this.executeSequence(node as BTSequence, blackboard, dt);
        break;
      case 'parallel':
        result = this.executeParallel(node as BTParallel, blackboard, dt);
        break;
      case 'decorator':
        result = this.executeDecorator(node as BTDecorator, blackboard, dt);
        break;
      case 'action':
        result = this.executeAction(node as BTAction, blackboard, dt);
        break;
      case 'condition':
        result = this.executeCondition(node as BTCondition, blackboard);
        break;
      case 'subtree':
        result = this.executeSubtree(node, blackboard, dt);
        break;
      default:
        result = 'failure';
    }

    node.status = result;
    node.lastExecutionTime = performance.now() - startTime;
    return result;
  }

  private executeSelector(node: BTSelector, blackboard: Map<string, any>, dt: number): NodeStatus {
    const previousRunning = this.findRunningChild(node);
    if (previousRunning && node.abortPolicy === 'lowerPriority') {
      // Abort lower priority children
      this.abortChildren(node, previousRunning);
    }

    for (const child of node.children) {
      const status = this.executeNode(child, blackboard, dt);
      
      if (status === 'success') {
        return 'success';
      }
      
      if (status === 'running') {
        // Mark other children as idle
        for (const other of node.children) {
          if (other !== child) {
            other.status = 'idle';
          }
        }
        return 'running';
      }
    }

    return 'failure';
  }

  private executeSequence(node: BTSequence, blackboard: Map<string, any>, dt: number): NodeStatus {
    for (const child of node.children) {
      const status = this.executeNode(child, blackboard, dt);
      
      if (status === 'failure') {
        return 'failure';
      }
      
      if (status === 'running') {
        for (const other of node.children) {
          if (other !== child) {
            other.status = 'idle';
          }
        }
        return 'running';
      }
    }

    return 'success';
  }

  private executeParallel(node: BTParallel, blackboard: Map<string, any>, dt: number): NodeStatus {
    let successCount = 0;
    let failureCount = 0;
    let runningCount = 0;

    for (const child of node.children) {
      const status = this.executeNode(child, blackboard, dt);
      
      switch (status) {
        case 'success': successCount++; break;
        case 'failure': failureCount++; break;
        case 'running': runningCount++; break;
      }
    }

    switch (node.policy) {
      case 'requireAll':
        return failureCount > 0 ? 'failure' : runningCount > 0 ? 'running' : 'success';
      case 'requireOne':
        return successCount > 0 ? 'success' : runningCount > 0 ? 'running' : 'failure';
      case 'sequence':
        return failureCount > 0 ? 'failure' : successCount === node.children.length ? 'success' : 'running';
    }

    return 'failure';
  }

  private executeDecorator(node: BTDecorator, blackboard: Map<string, any>, dt: number): NodeStatus {
    if (node.children.length === 0) return 'failure';

    const child = node.children[0];
    const childResult = this.executeNode(child, blackboard, dt);

    // Handle special decorator types based on config name
    if (node.config.name.includes('Inverter')) {
      return childResult === 'success' ? 'failure' : childResult === 'failure' ? 'success' : childResult;
    }
    if (node.config.name.includes('Succeeder')) {
      return childResult === 'running' ? 'running' : 'success';
    }
    if (node.config.name.includes('Failer')) {
      return childResult === 'running' ? 'running' : 'failure';
    }
    if (node.config.name.includes('Repeater')) {
      return 'running'; // Repeater always reruns
    }
    if (node.config.name.includes('UntilSuccess')) {
      return childResult === 'success' ? 'success' : 'running';
    }
    if (node.config.name.includes('UntilFailure')) {
      return childResult === 'failure' ? 'failure' : 'running';
    }

    return childResult;
  }

  private executeAction(node: BTAction, blackboard: Map<string, any>, dt: number): NodeStatus {
    try {
      const result = node.action(blackboard, dt);
      return result;
    } catch (error) {
      console.error(`[BT] Action ${node.config.name} failed:`, error);
      return 'failure';
    }
  }

  private executeCondition(node: BTCondition, blackboard: Map<string, any>): NodeStatus {
    try {
      const result = node.condition(blackboard);
      return result ? 'success' : 'failure';
    } catch (error) {
      console.error(`[BT] Condition ${node.config.name} failed:`, error);
      return 'failure';
    }
  }

  private executeSubtree(node: BTNode, blackboard: Map<string, any>, dt: number): NodeStatus {
    // Would execute another behavior tree here
    return 'success';
  }

  private findRunningChild(node: BTNode): BTNode | null {
    for (const child of node.children) {
      if (child.status === 'running') return child;
      const nested = this.findRunningChild(child);
      if (nested) return nested;
    }
    return null;
  }

  private abortChildren(node: BTNode, exclude: BTNode): void {
    for (const child of node.children) {
      if (child !== exclude) {
        child.status = 'idle';
        this.abortChildren(child, exclude);
      }
    }
  }

  private resetStatuses(node: BTNode): void {
    if (node.status === 'running') {
      node.status = 'idle';
    }
    for (const child of node.children) {
      this.resetStatuses(child);
    }
  }

  getStatus(): Map<string, NodeStatus> {
    const status = new Map<string, NodeStatus>();
    this.collectStatuses(this.tree.rootNode, status);
    return status;
  }

  private collectStatuses(node: BTNode, status: Map<string, NodeStatus>): void {
    status.set(node.id, node.status);
    for (const child of node.children) {
      this.collectStatuses(child, status);
    }
  }
}

// ============================================================
// BUILT-IN ACTIONS
// ============================================================

export const BTActions = {
  // Movement
  moveToTarget: (blackboard: Map<string, any>, dt: number): NodeStatus => {
    const target = blackboard.get('targetPosition') as THREE.Vector3;
    const position = blackboard.get('entityPosition') as THREE.Vector3;
    const speed = blackboard.get('moveSpeed') as number || 5;
    const tolerance = blackboard.get('tolerance') as number || 0.5;

    if (!target || !position) return 'failure';

    const direction = target.clone().sub(position);
    const distance = direction.length();

    if (distance < tolerance) {
      blackboard.set('arriveTarget', true);
      return 'success';
    }

    direction.normalize().multiplyScalar(speed * dt);
    position.add(direction);
    blackboard.set('entityPosition', position);

    return 'running';
  },

  rotateTowards: (blackboard: Map<string, any>, dt: number): NodeStatus => {
    const target = blackboard.get('targetPosition') as THREE.Vector3;
    const position = blackboard.get('entityPosition') as THREE.Vector3;
    const rotation = blackboard.get('entityRotation') as THREE.Euler;
    const turnSpeed = blackboard.get('turnSpeed') as number || 3;

    if (!target || !position || !rotation) return 'failure';

    const direction = target.clone().sub(position);
    const targetAngle = Math.atan2(direction.x, direction.z);
    const currentAngle = rotation.y;

    let diff = targetAngle - currentAngle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;

    if (Math.abs(diff) < 0.05) {
      return 'success';
    }

    rotation.y += Math.sign(diff) * turnSpeed * dt;
    blackboard.set('entityRotation', rotation);

    return 'running';
  },

  // Animation
  playAnimation: (blackboard: Map<string, any>, dt: number): NodeStatus => {
    const animName = blackboard.get('playAnimation') as string;
    if (!animName) return 'failure';

    const playing = blackboard.get('animationPlaying') as boolean;
    if (playing) {
      const progress = (blackboard.get('animationProgress') as number || 0) + dt;
      blackboard.set('animationProgress', progress);
      
      const duration = blackboard.get('animationDuration') as number || 1;
      if (progress >= duration) {
        blackboard.set('animationPlaying', false);
        return 'success';
      }
      return 'running';
    }

    blackboard.set('animationPlaying', true);
    blackboard.set('animationProgress', 0);
    return 'running';
  },

  // Combat
  attackTarget: (blackboard: Map<string, any>, dt: number): NodeStatus => {
    const target = blackboard.get('combatTarget');
    const attackRange = blackboard.get('attackRange') as number || 2;
    const entityPosition = blackboard.get('entityPosition') as THREE.Vector3;

    if (!target || !entityPosition) return 'failure';

    const distance = entityPosition.distanceTo(target.position);
    
    if (distance > attackRange) {
      blackboard.set('moveToTarget', target.position);
      return 'running';
    }

    const canAttack = blackboard.get('canAttack') as boolean;
    if (canAttack) {
      blackboard.set('attackTriggered', true);
      return 'success';
    }

    return 'failure';
  },

  // Utility
  wait: (blackboard: Map<string, any>, dt: number): NodeStatus => {
    const waitTime = blackboard.get('waitTime') as number;
    const elapsed = (blackboard.get('waitElapsed') as number) || 0;

    if (!waitTime) return 'failure';

    const newElapsed = elapsed + dt;
    blackboard.set('waitElapsed', newElapsed);

    if (newElapsed >= waitTime) {
      blackboard.delete('waitElapsed');
      return 'success';
    }

    return 'running';
  },

  log: (blackboard: Map<string, any>, dt: number): NodeStatus => {
    const message = blackboard.get('logMessage') as string;
    console.log(`[BT] ${message || 'No message'}`);
    return 'success';
  },

  setVariable: (blackboard: Map<string, any>, dt: number): NodeStatus => {
    const varName = blackboard.get('setVariableName');
    const varValue = blackboard.get('setVariableValue');
    if (varName) {
      blackboard.set(varName, varValue);
    }
    return 'success';
  },

  // Condition helpers
  isTargetInRange: (blackboard: Map<string, any>): boolean => {
    const target = blackboard.get('targetPosition') as THREE.Vector3;
    const position = blackboard.get('entityPosition') as THREE.Vector3;
    const range = blackboard.get('checkRange') as number || 5;

    if (!target || !position) return false;
    return position.distanceTo(target) <= range;
  },

  isTargetVisible: (blackboard: Map<string, any>): boolean => {
    const target = blackboard.get('targetPosition') as THREE.Vector3;
    const position = blackboard.get('entityPosition') as THREE.Vector3;
    const obstacles = blackboard.get('obstacles') as THREE.Vector3[] || [];

    if (!target || !position) return false;

    // Simple line of sight check
    for (const obs of obstacles) {
      const toTarget = target.clone().sub(position).normalize();
      const toObs = obs.clone().sub(position);
      const dot = toTarget.dot(toObs.normalize());
      if (dot > 0.9 && position.distanceTo(obs) < position.distanceTo(target)) {
        return false;
      }
    }

    return true;
  },

  hasResource: (blackboard: Map<string, any>): boolean => {
    const resource = blackboard.get('checkResource');
    const amount = blackboard.get(`resource_${resource}`) as number || 0;
    const cost = blackboard.get('resourceCost') as number || 1;
    return amount >= cost;
  },
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================

export function addChild(parent: BTNode, child: BTNode): void {
  parent.children.push(child);
  child.parent = parent;
}

export function removeChild(parent: BTNode, childId: string): BTNode | null {
  const index = parent.children.findIndex(c => c.id === childId);
  if (index !== -1) {
    const child = parent.children[index];
    child.parent = null;
    parent.children.splice(index, 1);
    return child;
  }
  return null;
}

export function findNode(root: BTNode, nodeId: string): BTNode | null {
  if (root.id === nodeId) return root;
  for (const child of root.children) {
    const found = findNode(child, nodeId);
    if (found) return found;
  }
  return null;
}

export function cloneTree(root: BTNode): BTNode {
  const clone = JSON.parse(JSON.stringify(root));
  // Fix parent references
  const fixParents = (node: BTNode, parent: BTNode | null) => {
    node.parent = parent;
    for (const child of node.children) {
      fixParents(child, node);
    }
  };
  fixParents(clone, null);
  return clone;
}

export function treeToJSON(tree: BehaviorTree): string {
  return JSON.stringify(tree, null, 2);
}

export function treeFromJSON(json: string): BehaviorTree {
  const tree = JSON.parse(json) as BehaviorTree;
  // Fix parent references
  const fixParents = (node: BTNode, parent: BTNode | null) => {
    node.parent = parent;
    for (const child of node.children) {
      fixParents(child, node);
    }
  };
  fixParents(tree.rootNode, null);
  return tree;
}

// ============================================================
// BUILT-IN BEHAVIOR TREES
// ============================================================

export function createPatrolTree(waypoints: THREE.Vector3[], speed: number = 5): BehaviorTree {
  const root = createSelectorNode('Patrol');
  
  const sequence = createSequenceNode('Patrol Sequence');
  
  // Move to waypoint
  const moveAction = createActionNode('Move to Waypoint', BTActions.moveToTarget, 'movement', { speed });
  addChild(sequence, moveAction);
  
  // Wait at waypoint
  const waitAction = createActionNode('Wait', BTActions.wait, 'utility');
  addChild(sequence, waitAction);
  
  addChild(root, sequence);

  // Idle fallback
  const idleAction = createActionNode('Idle', () => 'running', 'custom');
  addChild(root, idleAction);

  return {
    id: uid(),
    name: 'Patrol',
    rootNode: root,
    variables: [
      { name: 'currentWaypoint', type: 'number', defaultValue: 0, exposed: true },
      { name: 'waypoints', type: 'vector3', defaultValue: waypoints, exposed: true },
    ],
    blackboard: new Map(),
  };
}

export function createChaseTree(range: number = 10, attackRange: number = 2): BehaviorTree {
  const root = createSelectorNode('Chase');
  
  // Check if target exists
  const hasTarget = createConditionNode('Has Target', (bb) => bb.get('targetPosition') !== undefined);
  
  // Check if in range
  const inRange = createConditionNode('In Chase Range', (bb) => {
    const target = bb.get('targetPosition') as THREE.Vector3;
    const pos = bb.get('entityPosition') as THREE.Vector3;
    return target && pos && pos.distanceTo(target) <= range;
  });

  // Chase sequence
  const chaseSeq = createSequenceNode('Chase Sequence');
  
  const moveAction = createActionNode('Chase Target', BTActions.moveToTarget, 'movement', { speed: 8 });
  addChild(chaseSeq, moveAction);
  
  const faceAction = createActionNode('Face Target', BTActions.rotateTowards, 'movement');
  addChild(chaseSeq, faceAction);

  // Attack if in range
  const attackSeq = createSequenceNode('Attack Sequence');
  const inAttackRange = createConditionNode('In Attack Range', (bb) => {
    const target = bb.get('targetPosition') as THREE.Vector3;
    const pos = bb.get('entityPosition') as THREE.Vector3;
    return target && pos && pos.distanceTo(target) <= attackRange;
  });
  addChild(attackSeq, inAttackRange);

  const attackAction = createActionNode('Attack', BTActions.attackTarget, 'combat');
  addChild(attackSeq, attackAction);

  // Compose tree
  const mainSeq = createSequenceNode('Main');
  addChild(mainSeq, hasTarget);
  
  const fallback = createSelectorNode('Fallback');
  addChild(fallback, chaseSeq);
  addChild(fallback, attackSeq);
  addChild(mainSeq, fallback);
  
  addChild(root, mainSeq);

  // Idle when no target
  const idle = createActionNode('Idle', () => 'running', 'utility');
  addChild(root, idle);

  return {
    id: uid(),
    name: 'Chase & Attack',
    rootNode: root,
    variables: [
      { name: 'targetPosition', type: 'vector3', defaultValue: null, exposed: true },
      { name: 'chaseRange', type: 'number', defaultValue: range, exposed: true },
      { name: 'attackRange', type: 'number', defaultValue: attackRange, exposed: true },
    ],
    blackboard: new Map(),
  };
}

export function createFleeTree(panicDistance: number = 10): BehaviorTree {
  const root = createSelectorNode('Flee');
  
  const hasThreat = createConditionNode('Has Threat', (bb) => {
    const threat = bb.get('threatPosition') as THREE.Vector3;
    const pos = bb.get('entityPosition') as THREE.Vector3;
    return threat && pos && pos.distanceTo(threat) <= panicDistance;
  });

  const fleeSeq = createSequenceNode('Flee Sequence');
  
  // Calculate flee direction
  const fleeAction = createActionNode('Flee', (bb) => {
    const threat = bb.get('threatPosition') as THREE.Vector3;
    const pos = bb.get('entityPosition') as THREE.Vector3;
    if (!threat || !pos) return 'failure';

    const fleeDir = pos.clone().sub(threat).normalize();
    const fleeTarget = pos.clone().addScaledVector(fleeDir, 20);
    bb.set('fleeTarget', fleeTarget);
    return 'success';
  }, 'movement');
  addChild(fleeSeq, fleeAction);

  const moveAction = createActionNode('Move Away', BTActions.moveToTarget, 'movement', { speed: 10 });
  addChild(fleeSeq, moveAction);

  const mainSeq = createSequenceNode('Main');
  addChild(mainSeq, hasThreat);
  addChild(mainSeq, fleeSeq);
  addChild(root, mainSeq);

  const idle = createActionNode('Safe - Idle', () => 'success', 'utility');
  addChild(root, idle);

  return {
    id: uid(),
    name: 'Flee',
    rootNode: root,
    variables: [
      { name: 'threatPosition', type: 'vector3', defaultValue: null, exposed: true },
      { name: 'panicDistance', type: 'number', defaultValue: panicDistance, exposed: true },
    ],
    blackboard: new Map(),
  };
}