// ============================================================
// KEVLA ENGINE — Visual Scripting System v2.0
// Blueprint-style visual programming nodes
// ============================================================

import * as THREE from 'three';

// ============================================================
// VISUAL SCRIPTING TYPES
// ============================================================

export type NodeCategory = 
  | 'event' | 'action' | 'condition' | 'variable' | 'math' | 'vector' 
  | 'transform' | 'input' | 'time' | 'utility' | 'custom';

export type PinType = 'exec' | 'bool' | 'int' | 'float' | 'vector3' | 'string' | 'object' | 'entity';

export interface NodePin {
  id: string;
  name: string;
  type: PinType;
  direction: 'input' | 'output';
  defaultValue?: any;
  linkedPins: string[];
}

export interface VisualNode {
  id: string;
  category: NodeCategory;
  title: string;
  position: { x: number; y: number };
  pins: NodePin[];
  data: Record<string, any>;
  color?: string;
  collapsed?: boolean;
}

export interface VisualGraph {
  id: string;
  name: string;
  nodes: VisualNode[];
  edges: { fromPin: string; toPin: string }[];
  variables: GraphVariable[];
}

export interface GraphVariable {
  name: string;
  type: PinType;
  defaultValue: any;
  exposed: boolean;
}

let _nodeIdCounter = 0;
let _pinIdCounter = 0;
const uid = (prefix = 'node') => `${prefix}_${Date.now()}_${_nodeIdCounter++}`;
const pinUid = () => `pin_${Date.now()}_${_pinIdCounter++}`;

// ============================================================
// NODE FACTORY
// ============================================================

export function createEventNode(title: string, eventName: string): VisualNode {
  return {
    id: uid('event'),
    category: 'event',
    title,
    position: { x: 0, y: 0 },
    pins: [
      { id: pinUid(), name: 'Trigger', type: 'exec', direction: 'output', linkedPins: [] },
    ],
    data: { eventName },
    color: '#98c379',
  };
}

export function createActionNode(title: string, actionName: string): VisualNode {
  return {
    id: uid('action'),
    category: 'action',
    title,
    position: { x: 0, y: 0 },
    pins: [
      { id: pinUid(), name: 'In', type: 'exec', direction: 'input', linkedPins: [] },
      { id: pinUid(), name: 'Out', type: 'exec', direction: 'output', linkedPins: [] },
    ],
    data: { actionName },
    color: '#61afef',
  };
}

export function createConditionNode(title: string): VisualNode {
  return {
    id: uid('condition'),
    category: 'condition',
    title,
    position: { x: 0, y: 0 },
    pins: [
      { id: pinUid(), name: 'In', type: 'exec', direction: 'input', linkedPins: [] },
      { id: pinUid(), name: 'True', type: 'exec', direction: 'output', linkedPins: [] },
      { id: pinUid(), name: 'False', type: 'exec', direction: 'output', linkedPins: [] },
    ],
    data: {},
    color: '#e06c75',
  };
}

export function createMathNode(operation: 'add' | 'subtract' | 'multiply' | 'divide' | 'mod' | 'power' | 'min' | 'max'): VisualNode {
  const labels: Record<string, string> = { add: '+', subtract: '-', multiply: '×', divide: '÷', mod: '%', power: '^', min: 'min', max: 'max' };
  return {
    id: uid('math'),
    category: 'math',
    title: labels[operation],
    position: { x: 0, y: 0 },
    pins: [
      { id: pinUid(), name: 'A', type: 'float', direction: 'input', defaultValue: 0, linkedPins: [] },
      { id: pinUid(), name: 'B', type: 'float', direction: 'input', defaultValue: 0, linkedPins: [] },
      { id: pinUid(), name: 'Result', type: 'float', direction: 'output', linkedPins: [] },
    ],
    data: { operation },
    color: '#c678dd',
  };
}

export function createVectorNode(operation: 'add' | 'subtract' | 'normalize' | 'length' | 'distance' | 'multiply' | 'dot' | 'cross'): VisualNode {
  return {
    id: uid('vector'),
    category: 'vector',
    title: operation.charAt(0).toUpperCase() + operation.slice(1),
    position: { x: 0, y: 0 },
    pins: operation === 'length' || operation === 'distance' ? [
      { id: pinUid(), name: 'A', type: 'vector3', direction: 'input', defaultValue: [0,0,0], linkedPins: [] },
      { id: pinUid(), name: 'B', type: 'vector3', direction: 'input', defaultValue: [0,0,0], linkedPins: [] },
      { id: pinUid(), name: 'Result', type: 'float', direction: 'output', linkedPins: [] },
    ] : operation === 'normalize' || operation === 'dot' || operation === 'cross' ? [
      { id: pinUid(), name: 'A', type: 'vector3', direction: 'input', defaultValue: [0,0,0], linkedPins: [] },
      { id: pinUid(), name: 'B', type: 'vector3', direction: 'input', defaultValue: [0,0,0], linkedPins: [] },
      { id: pinUid(), name: 'Result', type: 'vector3', direction: 'output', linkedPins: [] },
    ] : [
      { id: pinUid(), name: 'A', type: 'vector3', direction: 'input', defaultValue: [0,0,0], linkedPins: [] },
      { id: pinUid(), name: 'B', type: 'vector3', direction: 'input', defaultValue: [0,0,0], linkedPins: [] },
      { id: pinUid(), name: 'Scale', type: 'float', direction: 'input', defaultValue: 1, linkedPins: [] },
      { id: pinUid(), name: 'Result', type: 'vector3', direction: 'output', linkedPins: [] },
    ],
    data: { operation },
    color: '#56b6c2',
  };
}

export function createTransformNode(operation: 'getPosition' | 'getRotation' | 'getScale' | 'setPosition' | 'setRotation' | 'setScale' | 'translate' | 'rotate'): VisualNode {
  return {
    id: uid('transform'),
    category: 'transform',
    title: operation.replace(/([A-Z])/g, ' $1').trim(),
    position: { x: 0, y: 0 },
    pins: [
      { id: pinUid(), name: 'In', type: 'exec', direction: 'input', linkedPins: [] },
      { id: pinUid(), name: 'Target', type: 'entity', direction: 'input', defaultValue: null, linkedPins: [] },
      ...(operation.includes('set') || operation === 'translate' || operation === 'rotate' ? [
        { id: pinUid(), name: 'Value', type: operation === 'translate' || operation === 'rotate' ? 'vector3' : 'float', direction: 'input', defaultValue: 0, linkedPins: [] },
      ] : []),
      { id: pinUid(), name: 'Out', type: 'exec', direction: 'output', linkedPins: [] },
      { id: pinUid(), name: 'Result', type: operation.includes('set') ? 'exec' : (operation === 'getPosition' ? 'vector3' : 'float'), direction: 'output', linkedPins: [] },
    ],
    data: { operation },
    color: '#d19a66',
  };
}

export function createVariableNode(name: string, type: PinType): VisualNode {
  return {
    id: uid('variable'),
    category: 'variable',
    title: name,
    position: { x: 0, y: 0 },
    pins: [
      { id: pinUid(), name: 'Get', type, direction: 'output', linkedPins: [] },
      { id: pinUid(), name: 'Set', type, direction: 'input', linkedPins: [] },
    ],
    data: { variableName: name, varType: type },
    color: '#be5046',
  };
}

export function createInputNode(inputType: 'key' | 'button' | 'axis'): VisualNode {
  return {
    id: uid('input'),
    category: 'input',
    title: inputType === 'axis' ? 'Axis Input' : inputType === 'key' ? 'Key Press' : 'Button Press',
    position: { x: 0, y: 0 },
    pins: [
      { id: pinUid(), name: 'Pressed', type: 'bool', direction: 'output', linkedPins: [] },
      { id: pinUid(), name: 'Value', type: inputType === 'axis' ? 'float' : 'exec', direction: 'output', linkedPins: [] },
    ],
    data: { inputType, keyName: '' },
    color: '#abb2bf',
  };
}

export function createTimeNode(operation: 'elapsed' | 'delta' | 'time' | 'timer' | 'random'): VisualNode {
  return {
    id: uid('time'),
    category: 'time',
    title: operation.charAt(0).toUpperCase() + operation.slice(1),
    position: { x: 0, y: 0 },
    pins: [
      { id: pinUid(), name: 'Value', type: operation === 'timer' ? 'exec' : 'float', direction: 'output', linkedPins: [] },
      ...(operation === 'timer' ? [
        { id: pinUid(), name: 'Reset', type: 'exec', direction: 'input', linkedPins: [] },
        { id: pinUid(), name: 'Duration', type: 'float', direction: 'input', defaultValue: 1, linkedPins: [] },
      ] : []),
    ],
    data: { operation },
    color: '#e5c07b',
  };
}

export function createUtilityNode(utilityType: 'print' | 'log' | 'branch' | 'sequence' | 'randomBool' | 'lerp'): VisualNode {
  const titles: Record<string, string> = { print: 'Print', log: 'Log', branch: 'Branch', sequence: 'Sequence', randomBool: 'Random Bool', lerp: 'Lerp' };
  return {
    id: uid('utility'),
    category: 'utility',
    title: titles[utilityType],
    position: { x: 0, y: 0 },
    pins: utilityType === 'branch' ? [
      { id: pinUid(), name: 'In', type: 'exec', direction: 'input', linkedPins: [] },
      { id: pinUid(), name: 'Condition', type: 'bool', direction: 'input', defaultValue: false, linkedPins: [] },
      { id: pinUid(), name: 'True', type: 'exec', direction: 'output', linkedPins: [] },
      { id: pinUid(), name: 'False', type: 'exec', direction: 'output', linkedPins: [] },
    ] : utilityType === 'sequence' ? [
      { id: pinUid(), name: 'In', type: 'exec', direction: 'input', linkedPins: [] },
      { id: pinUid(), name: 'Out 1', type: 'exec', direction: 'output', linkedPins: [] },
      { id: pinUid(), name: 'Out 2', type: 'exec', direction: 'output', linkedPins: [] },
      { id: pinUid(), name: 'Out 3', type: 'exec', direction: 'output', linkedPins: [] },
      { id: pinUid(), name: 'Out 4', type: 'exec', direction: 'output', linkedPins: [] },
    ] : utilityType === 'lerp' ? [
      { id: pinUid(), name: 'A', type: 'float', direction: 'input', defaultValue: 0, linkedPins: [] },
      { id: pinUid(), name: 'B', type: 'float', direction: 'input', defaultValue: 1, linkedPins: [] },
      { id: pinUid(), name: 'T', type: 'float', direction: 'input', defaultValue: 0.5, linkedPins: [] },
      { id: pinUid(), name: 'Result', type: 'float', direction: 'output', linkedPins: [] },
    ] : [
      { id: pinUid(), name: 'In', type: 'exec', direction: 'input', linkedPins: [] },
      { id: pinUid(), name: 'Value', type: 'string', direction: 'input', defaultValue: '', linkedPins: [] },
      { id: pinUid(), name: 'Out', type: 'exec', direction: 'output', linkedPins: [] },
    ],
    data: { utilityType },
    color: '#5c6370',
  };
}

export function createGetEntityNode(): VisualNode {
  return {
    id: uid('getEntity'),
    category: 'custom',
    title: 'Get Entity',
    position: { x: 0, y: 0 },
    pins: [
      { id: pinUid(), name: 'ID', type: 'string', direction: 'input', defaultValue: '', linkedPins: [] },
      { id: pinUid(), name: 'Entity', type: 'entity', direction: 'output', linkedPins: [] },
    ],
    data: {},
    color: '#98c379',
  };
}

export function createComparisonNode(operation: '==' | '!=' | '>' | '<' | '>=' | '<='): VisualNode {
  return {
    id: uid('compare'),
    category: 'condition',
    title: operation,
    position: { x: 0, y: 0 },
    pins: [
      { id: pinUid(), name: 'A', type: 'float', direction: 'input', defaultValue: 0, linkedPins: [] },
      { id: pinUid(), name: 'B', type: 'float', direction: 'input', defaultValue: 0, linkedPins: [] },
      { id: pinUid(), name: 'Result', type: 'bool', direction: 'output', linkedPins: [] },
    ],
    data: { operation },
    color: '#e06c75',
  };
}

export function createDelayNode(): VisualNode {
  return {
    id: uid('delay'),
    category: 'utility',
    title: 'Delay',
    position: { x: 0, y: 0 },
    pins: [
      { id: pinUid(), name: 'In', type: 'exec', direction: 'input', linkedPins: [] },
      { id: pinUid(), name: 'Duration', type: 'float', direction: 'input', defaultValue: 1, linkedPins: [] },
      { id: pinUid(), name: 'Out', type: 'exec', direction: 'output', linkedPins: [] },
    ],
    data: {},
    color: '#56b6c2',
  };
}

// ============================================================
// VISUAL SCRIPT EXECUTOR
// ============================================================

interface ExecutionContext {
  graph: VisualGraph;
  entityId: string;
  variables: Map<string, any>;
  time: number;
  deltaTime: number;
}

export class VisualScriptExecutor {
  private executionContexts: Map<string, ExecutionContext> = new Map();
  private nodeResults: Map<string, Map<string, any>> = new Map();
  private executionOrder: string[] = [];

  createContext(graphId: string, graph: VisualGraph, entityId: string): ExecutionContext {
    const context: ExecutionContext = {
      graph,
      entityId,
      variables: new Map(),
      time: 0,
      deltaTime: 0,
    };

    // Initialize variables
    graph.variables.forEach(v => {
      context.variables.set(v.name, v.defaultValue);
    });

    this.executionContexts.set(graphId, context);
    return context;
  }

  execute(graphId: string, dt: number): void {
    const context = this.executionContexts.get(graphId);
    if (!context) return;

    context.time += dt;
    context.deltaTime = dt;

    // Sort nodes topologically
    this.executionOrder = this.topologicalSort(context.graph);

    // Execute each node
    for (const nodeId of this.executionOrder) {
      this.executeNode(context, nodeId);
    }
  }

  private topologicalSort(graph: VisualGraph): string[] {
    const visited = new Set<string>();
    const result: string[] = [];

    const visit = (nodeId: string) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);

      const node = graph.nodes.find(n => n.id === nodeId);
      if (!node) return;

      // Visit dependencies (input pins linked to exec outputs)
      const execInputs = node.pins.filter(p => p.type === 'exec' && p.direction === 'input');
      for (const pin of execInputs) {
        for (const linkedPinId of pin.linkedPins) {
          const linkedNode = graph.nodes.find(n => n.pins.some(p => p.id === linkedPinId));
          if (linkedNode) visit(linkedNode.id);
        }
      }

      result.push(nodeId);
    };

    // Start from event nodes
    const eventNodes = graph.nodes.filter(n => n.category === 'event');
    for (const node of eventNodes) visit(node.id);

    // Add any remaining nodes
    for (const node of graph.nodes) {
      if (!result.includes(node.id)) visit(node.id);
    }

    return result;
  }

  private executeNode(context: ExecutionContext, nodeId: string): void {
    const node = context.graph.nodes.find(n => n.id === nodeId);
    if (!node) return;

    if (!this.nodeResults.has(nodeId)) {
      this.nodeResults.set(nodeId, new Map());
    }
    const results = this.nodeResults.get(nodeId)!;

    switch (node.category) {
      case 'event':
        this.executeEventNode(node, context, results);
        break;
      case 'action':
        this.executeActionNode(node, context, results);
        break;
      case 'condition':
        this.executeConditionNode(node, context, results);
        break;
      case 'math':
        this.executeMathNode(node, context, results);
        break;
      case 'vector':
        this.executeVectorNode(node, context, results);
        break;
      case 'transform':
        this.executeTransformNode(node, context, results);
        break;
      case 'variable':
        this.executeVariableNode(node, context, results);
        break;
      case 'input':
        this.executeInputNode(node, context, results);
        break;
      case 'time':
        this.executeTimeNode(node, context, results);
        break;
      case 'utility':
        this.executeUtilityNode(node, context, results);
        break;
    }
  }

  private getPinValue(context: ExecutionContext, pinId: string, graph: VisualGraph): any {
    const allPins = graph.nodes.flatMap(n => n.pins);
    const pin = allPins.find(p => p.id === pinId);
    if (!pin) return undefined;

    // Find linked pin
    for (const linkedPinId of pin.linkedPins) {
      const linkedNode = graph.nodes.find(n => n.pins.some(p => p.id === linkedPinId));
      if (linkedNode) {
        const linkedPin = linkedNode.pins.find(p => p.id === linkedPinId);
        if (linkedPin && linkedPin.direction === 'output') {
          const results = this.nodeResults.get(linkedNode.id);
          if (results && results.has(linkedPin.name)) {
            return results.get(linkedPin.name);
          }
        }
      }
    }

    return pin.defaultValue;
  }

  private executeEventNode(node: VisualNode, context: ExecutionContext, results: Map<string, any>): void {
    // Trigger outputs based on event
    const eventName = node.data.eventName;
    const execPin = node.pins.find(p => p.type === 'exec' && p.direction === 'output');
    if (execPin) {
      results.set('Trigger', true);
    }
  }

  private executeActionNode(node: VisualNode, context: ExecutionContext, results: Map<string, any>): void {
    const inPin = node.pins.find(p => p.type === 'exec' && p.direction === 'input');
    const triggered = inPin?.linkedPins.some(id => {
      const linkedValue = this.getPinValue(context, id, context.graph);
      return linkedValue === true;
    });

    if (triggered) {
      const actionName = node.data.actionName;
      // Execute action
      console.log(`[VisualScript] Executing action: ${actionName} on ${context.entityId}`);
      results.set('Out', true);
    }
  }

  private executeConditionNode(node: VisualNode, context: ExecutionContext, results: Map<string, any>): void {
    // Evaluate condition
    const conditionPin = node.pins.find(p => p.name === 'Condition');
    if (conditionPin) {
      const value = this.getPinValue(context, conditionPin.id, context.graph);
      results.set('True', value);
      results.set('False', !value);
    }
  }

  private executeMathNode(node: VisualNode, context: ExecutionContext, results: Map<string, any>): void {
    const a = this.getPinValue(context, node.pins.find(p => p.name === 'A')!.id, context.graph) as number;
    const b = this.getPinValue(context, node.pins.find(p => p.name === 'B')!.id, context.graph) as number;
    
    let result = 0;
    switch (node.data.operation) {
      case 'add': result = a + b; break;
      case 'subtract': result = a - b; break;
      case 'multiply': result = a * b; break;
      case 'divide': result = b !== 0 ? a / b : 0; break;
      case 'mod': result = b !== 0 ? a % b : 0; break;
      case 'power': result = Math.pow(a, b); break;
      case 'min': result = Math.min(a, b); break;
      case 'max': result = Math.max(a, b); break;
    }

    results.set('Result', result);
  }

  private executeVectorNode(node: VisualNode, context: ExecutionContext, results: Map<string, any>): void {
    const op = node.data.operation;
    
    if (op === 'length' || op === 'distance') {
      const a = this.getPinValue(context, node.pins.find(p => p.name === 'A')!.id, context.graph) as [number,number,number];
      const b = this.getPinValue(context, node.pins.find(p => p.name === 'B')!.id, context.graph) as [number,number,number];
      const vecA = new THREE.Vector3(a[0], a[1], a[2]);
      const vecB = new THREE.Vector3(b[0], b[1], b[2]);
      results.set('Result', op === 'length' ? vecA.length() : vecA.distanceTo(vecB));
    } else if (op === 'normalize') {
      const a = this.getPinValue(context, node.pins.find(p => p.name === 'A')!.id, context.graph) as [number,number,number];
      const vec = new THREE.Vector3(a[0], a[1], a[2]).normalize();
      results.set('Result', [vec.x, vec.y, vec.z]);
    } else if (op === 'dot') {
      const a = this.getPinValue(context, node.pins.find(p => p.name === 'A')!.id, context.graph) as [number,number,number];
      const b = this.getPinValue(context, node.pins.find(p => p.name === 'B')!.id, context.graph) as [number,number,number];
      const vecA = new THREE.Vector3(a[0], a[1], a[2]);
      const vecB = new THREE.Vector3(b[0], b[1], b[2]);
      results.set('Result', [vecA.dot(vecB), 0, 0]);
    }
  }

  private executeTransformNode(node: VisualNode, context: ExecutionContext, results: Map<string, any>): void {
    const targetId = this.getPinValue(context, node.pins.find(p => p.name === 'Target')!.id, context.graph);
    if (!targetId) return;

    const op = node.data.operation;
    const valuePin = node.pins.find(p => p.name === 'Value');
    const value = valuePin ? this.getPinValue(context, valuePin.id, context.graph) : null;

    if (op === 'getPosition') {
      results.set('Result', [0, 0, 0]); // Would get from entity
    }
  }

  private executeVariableNode(node: VisualNode, context: ExecutionContext, results: Map<string, any>): void {
    const varName = node.data.variableName;
    const getPin = node.pins.find(p => p.name === 'Get');
    const setPin = node.pins.find(p => p.name === 'Set');

    if (getPin) {
      results.set('Get', context.variables.get(varName));
    }

    if (setPin && setPin.linkedPins.length > 0) {
      const newValue = this.getPinValue(context, setPin.linkedPins[0], context.graph);
      context.variables.set(varName, newValue);
    }
  }

  private executeInputNode(node: VisualNode, context: ExecutionContext, results: Map<string, any>): void {
    const inputType = node.data.inputType;
    const keyName = node.data.keyName || 'space';

    let pressed = false;
    if (typeof window !== 'undefined') {
      pressed = (keyName === 'space' && window.event?.type === 'keydown') || false;
    }

    results.set('Pressed', pressed);
  }

  private executeTimeNode(node: VisualNode, context: ExecutionContext, results: Map<string, any>): void {
    const op = node.data.operation;
    switch (op) {
      case 'elapsed': results.set('Value', context.time); break;
      case 'delta': results.set('Value', context.deltaTime); break;
      case 'time': results.set('Value', Date.now() / 1000); break;
      case 'random': results.set('Value', Math.random()); break;
    }
  }

  private executeUtilityNode(node: VisualNode, context: ExecutionContext, results: Map<string, any>): void {
    const utilType = node.data.utilityType;

    if (utilType === 'branch') {
      const condition = this.getPinValue(context, node.pins.find(p => p.name === 'Condition')!.id, context.graph);
      results.set('True', condition);
      results.set('False', !condition);
    } else if (utilType === 'lerp') {
      const a = this.getPinValue(context, node.pins.find(p => p.name === 'A')!.id, context.graph) as number;
      const b = this.getPinValue(context, node.pins.find(p => p.name === 'B')!.id, context.graph) as number;
      const t = this.getPinValue(context, node.pins.find(p => p.name === 'T')!.id, context.graph) as number;
      results.set('Result', a + (b - a) * Math.max(0, Math.min(1, t)));
    } else if (utilType === 'randomBool') {
      results.set('Value', Math.random() > 0.5);
    } else if (utilType === 'print') {
      const value = this.getPinValue(context, node.pins.find(p => p.name === 'Value')!.id, context.graph);
      console.log(`[VisualScript] ${value}`);
    }
  }

  destroyContext(graphId: string): void {
    this.executionContexts.delete(graphId);
  }
}

// ============================================================
// GRAPH SERIALIZATION
// ============================================================

export function serializeGraph(graph: VisualGraph): string {
  return JSON.stringify(graph, null, 2);
}

export function deserializeGraph(json: string): VisualGraph {
  return JSON.parse(json) as VisualGraph;
}

// ============================================================
// BUILT-IN GRAPH TEMPLATES
// ============================================================

export function createSimpleMovementGraph(): VisualGraph {
  const nodes: VisualNode[] = [];
  let x = 0;

  // Key input event
  const keyEvent = createEventNode('On Key Press', 'keyPress');
  keyEvent.position = { x, y: 0 };
  nodes.push(keyEvent);

  // Branch by key
  x += 200;
  const branch = createUtilityNode('branch');
  branch.position = { x, y: 0 };
  nodes.push(branch);

  // Move forward action
  x += 200;
  const moveFwd = createActionNode('Move Forward', 'moveForward');
  moveFwd.position = { x, y: -50 };
  nodes.push(moveFwd);

  // Move backward action
  x += 200;
  const moveBack = createActionNode('Move Backward', 'moveBackward');
  moveBack.position = { x, y: 50 };
  nodes.push(moveBack);

  return {
    id: uid('graph'),
    name: 'Simple Movement',
    nodes,
    edges: [
      { fromPin: keyEvent.pins[0].id, toPin: branch.pins[0].id },
      { fromPin: branch.pins[2].id, toPin: moveFwd.pins[0].id },
      { fromPin: branch.pins[3].id, toPin: moveBack.pins[0].id },
    ],
    variables: [],
  };
}

export function createPatrolGraph(): VisualGraph {
  const nodes: VisualNode[] = [];
  
  const start = createEventNode('On Start', 'start');
  start.position = { x: 0, y: 0 };
  nodes.push(start);

  const move = createActionNode('Move to Target', 'moveTo');
  move.position = { x: 200, y: 0 };
  nodes.push(move);

  const wait = createDelayNode();
  wait.position = { x: 400, y: 0 };
  nodes.push(wait);

  return {
    id: uid('graph'),
    name: 'Patrol',
    nodes,
    edges: [
      { fromPin: start.pins[0].id, toPin: move.pins[0].id },
      { fromPin: move.pins[1].id, toPin: wait.pins[0].id },
      { fromPin: wait.pins[2].id, toPin: move.pins[0].id },
    ],
    variables: [
      { name: 'targetPosition', type: 'vector3', defaultValue: [0, 0, 0], exposed: true },
    ],
  };
}