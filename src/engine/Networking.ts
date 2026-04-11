// ============================================================
// KEVLA ENGINE — Networking System v2.0
// Multiplayer Framework with WebRTC/WebSocket, Replication, and Lag Compensation
// ============================================================

import * as THREE from 'three';

// ============================================================
// NETWORK TYPES
// ============================================================

export type NetworkMode = 'host' | 'client' | 'listen-server';
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface NetworkConfig {
  mode: NetworkMode;
  maxPlayers: number;
  serverUrl: string;
  serverPort: number;
  useWebRTC: boolean;
  tickRate: number;
  interpolationDelay: number;
  enableCompression: boolean;
}

export const DEFAULT_NETWORK_CONFIG: NetworkConfig = {
  mode: 'client',
  maxPlayers: 32,
  serverUrl: 'localhost',
  serverPort: 3000,
  useWebRTC: false,
  tickRate: 20,
  interpolationDelay: 100,
  enableCompression: true,
};

export interface PlayerInfo {
  id: string;
  name: string;
  isLocal: boolean;
  isHost: boolean;
  ping: number;
  lastUpdate: number;
  transform: { position: THREE.Vector3; rotation: THREE.Euler; scale: THREE.Vector3 };
}

export interface NetworkMessage {
  type: string;
  senderId: string;
  timestamp: number;
  sequence: number;
  data: any;
}

// ============================================================
// NETWORK MANAGER
// ============================================================

export class NetworkManager {
  private config: NetworkConfig;
  private state: ConnectionState = 'disconnected';
  private players: Map<string, PlayerInfo> = new Map();
  private localPlayerId: string = '';
  private socket: WebSocket | null = null;
  private messageHandlers: Map<string, (msg: NetworkMessage) => void> = new Map();
  private outgoingQueue: NetworkMessage[] = [];
  private incomingBuffer: NetworkMessage[] = [];
  private lastSequence: number = 0;
  private tickInterval: NodeJS.Timeout | null = null;
  private connectionCallbacks: ((state: ConnectionState) => void)[] = [];

  private entityStateCache: Map<string, EntityState> = new Map();
  private pendingInputs: InputSnapshot[] = [];
  private acknowledgedInputs: Set<number> = new Set();

  constructor(config: Partial<NetworkConfig> = {}) {
    this.config = { ...DEFAULT_NETWORK_CONFIG, ...config };
  }

  // Connection Management
  async connect(serverUrl?: string, port?: number): Promise<boolean> {
    if (serverUrl) this.config.serverUrl = serverUrl;
    if (port) this.config.serverPort = port;

    this.setState('connecting');
    const url = `ws://${this.config.serverUrl}:${this.config.serverPort}`;

    try {
      this.socket = new WebSocket(url);
      
      return new Promise((resolve) => {
        if (!this.socket) { resolve(false); return; }

        this.socket.onopen = () => {
          this.setState('connected');
          this.startNetworkTick();
          this.sendMessage({ type: 'join', data: { name: 'Player' } });
          resolve(true);
        };

        this.socket.onclose = () => {
          this.setState('disconnected');
          this.stopNetworkTick();
        };

        this.socket.onerror = () => {
          this.setState('error');
          resolve(false);
        };

        this.socket.onmessage = (event) => {
          this.handleIncomingMessage(JSON.parse(event.data));
        };
      });
    } catch (error) {
      console.error('[Network] Connection failed:', error);
      this.setState('error');
      return false;
    }
  }

  disconnect(): void {
    this.stopNetworkTick();
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.setState('disconnected');
    this.players.clear();
  }

  private setState(newState: ConnectionState): void {
    this.state = newState;
    this.connectionCallbacks.forEach(cb => cb(newState));
  }

  onConnectionState(callback: (state: ConnectionState) => void): void {
    this.connectionCallbacks.push(callback);
  }

  getState(): ConnectionState {
    return this.state;
  }

  // Message Handling
  registerHandler(type: string, handler: (msg: NetworkMessage) => void): void {
    this.messageHandlers.set(type, handler);
  }

  sendMessage(message: Partial<NetworkMessage>): void {
    const fullMsg: NetworkMessage = {
      type: message.type || 'custom',
      senderId: message.senderId || this.localPlayerId,
      timestamp: Date.now(),
      sequence: ++this.lastSequence,
      data: message.data,
    };
    this.outgoingQueue.push(fullMsg);
  }

  private handleIncomingMessage(raw: any): void {
    const msg = raw as NetworkMessage;
    this.incomingBuffer.push(msg);

    const handler = this.messageHandlers.get(msg.type);
    if (handler) {
      handler(msg);
    }
  }

  // Network Tick
  private startNetworkTick(): void {
    const interval = 1000 / this.config.tickRate;
    this.tickInterval = setInterval(() => this.networkTick(), interval);
  }

  private stopNetworkTick(): void {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
  }

  private networkTick(): void {
    // Send queued messages
    while (this.outgoingQueue.length > 0) {
      const msg = this.outgoingQueue.shift()!;
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify(msg));
      }
    }

    // Process incoming messages
    while (this.incomingBuffer.length > 0) {
      const msg = this.incomingBuffer.shift()!;
      const handler = this.messageHandlers.get(msg.type);
      if (handler) handler(msg);
    }
  }

  // Player Management
  addPlayer(id: string, info: Partial<PlayerInfo>): void {
    this.players.set(id, {
      id,
      name: info.name || 'Unknown',
      isLocal: info.isLocal || false,
      isHost: info.isHost || false,
      ping: info.ping || 0,
      lastUpdate: Date.now(),
      transform: info.transform || { 
        position: new THREE.Vector3(), 
        rotation: new THREE.Euler(), 
        scale: new THREE.Vector3(1,1,1) 
      },
    });
  }

  removePlayer(id: string): void {
    this.players.delete(id);
  }

  getPlayer(id: string): PlayerInfo | undefined {
    return this.players.get(id);
  }

  getPlayers(): PlayerInfo[] {
    return Array.from(this.players.values());
  }

  setLocalPlayer(id: string): void {
    this.localPlayerId = id;
    const player = this.players.get(id);
    if (player) player.isLocal = true;
  }

  // Entity Replication
  replicateEntity(entityId: string, state: EntityState): void {
    this.sendMessage({
      type: 'entity_update',
      data: { entityId, state },
    });
  }

  requestEntitySpawn(entityId: string, prefabId: string, position: THREE.Vector3): void {
    this.sendMessage({
      type: 'entity_spawn',
      data: { entityId, prefabId, position: { x: position.x, y: position.y, z: position.z } },
    });
  }

  requestEntityDestroy(entityId: string): void {
    this.sendMessage({
      type: 'entity_destroy',
      data: { entityId },
    });
  }

  // RPC System
  callRPC(rpcName: string, targetId: string | null, ...args: any[]): void {
    this.sendMessage({
      type: 'rpc',
      data: { rpcName, targetId, args },
    });
  }

  registerRPC(rpcName: string, handler: (...args: any[]) => void): void {
    this.registerHandler(`rpc_${rpcName}`, (msg) => {
      handler(...msg.data.args);
    });
  }
}

// ============================================================
// ENTITY REPLICATION
// ============================================================

export interface EntityState {
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: THREE.Vector3;
  velocity?: THREE.Vector3;
  animationState?: string;
  componentStates?: Record<string, any>;
}

export interface ReplicationConfig {
  syncTransform: boolean;
  syncComponents: string[];
  compressionEnabled: boolean;
  priority: 'high' | 'normal' | 'low';
}

const DEFAULT_REPLICATION_CONFIG: ReplicationConfig = {
  syncTransform: true,
  syncComponents: ['meshRenderer', 'rigidbody'],
  compressionEnabled: true,
  priority: 'normal',
};

export class ReplicationManager {
  private networkManager: NetworkManager;
  private localEntities: Set<string> = new Set();
  private remoteEntities: Map<string, EntityState> = new Map();
  private configs: Map<string, ReplicationConfig> = new Map();
  private pendingUpdates: Map<string, EntityState> = new Map();
  private interpolationBuffer: Map<string, InterpolatedState[]> = new Map();

  constructor(networkManager: NetworkManager) {
    this.networkManager = networkManager;
    this.setupHandlers();
  }

  private setupHandlers(): void {
    this.networkManager.registerHandler('entity_spawn', (msg) => {
      const { entityId, prefabId, position } = msg.data;
      this.remoteEntities.set(entityId, {
        position: new THREE.Vector3(position.x, position.y, position.z),
        rotation: new THREE.Euler(),
        scale: new THREE.Vector3(1, 1, 1),
      });
    });

    this.networkManager.registerHandler('entity_destroy', (msg) => {
      this.remoteEntities.delete(msg.data.entityId);
    });

    this.networkManager.registerHandler('entity_update', (msg) => {
      const { entityId, state } = msg.data;
      this.queueUpdate(entityId, state);
    });
  }

  registerEntity(entityId: string, config: Partial<ReplicationConfig> = {}): void {
    this.localEntities.add(entityId);
    this.configs.set(entityId, { ...DEFAULT_REPLICATION_CONFIG, ...config });
  }

  unregisterEntity(entityId: string): void {
    this.localEntities.delete(entityId);
    this.configs.delete(entityId);
  }

  private queueUpdate(entityId: string, state: EntityState): void {
    this.pendingUpdates.set(entityId, state);

    // Add to interpolation buffer
    if (!this.interpolationBuffer.has(entityId)) {
      this.interpolationBuffer.set(entityId, []);
    }
    const buffer = this.interpolationBuffer.get(entityId)!;
    buffer.push({ ...state, timestamp: Date.now() });

    // Keep only recent samples
    while (buffer.length > 10) buffer.shift();
  }

  getRemoteState(entityId: string): EntityState | null {
    return this.remoteEntities.get(entityId) || null;
  }

  getInterpolatedState(entityId: string, interpolationDelay: number): EntityState | null {
    const buffer = this.interpolationBuffer.get(entityId);
    if (!buffer || buffer.length < 2) return this.pendingUpdates.get(entityId) || null;

    const now = Date.now();
    const targetTime = now - interpolationDelay;

    // Find the two samples to interpolate between
    for (let i = 0; i < buffer.length - 1; i++) {
      const current = buffer[i];
      const next = buffer[i + 1];

      if (current.timestamp <= targetTime && next.timestamp > targetTime) {
        const t = (targetTime - current.timestamp) / (next.timestamp - current.timestamp);
        return this.interpolateStates(current, next, t);
      }
    }

    return buffer[buffer.length - 1];
  }

  private interpolateStates(a: EntityState & { timestamp: number }, b: EntityState & { timestamp: number }, t: number): EntityState {
    return {
      position: new THREE.Vector3().lerpVectors(a.position, b.position, t),
      rotation: new THREE.Euler(
        a.rotation.x + (b.rotation.x - a.rotation.x) * t,
        a.rotation.y + (b.rotation.y - a.rotation.y) * t,
        a.rotation.z + (b.rotation.z - a.rotation.z) * t,
      ),
      scale: new THREE.Vector3().lerpVectors(a.scale, b.scale, t),
    };
  }

  replicateEntity(entityId: string, state: EntityState): void {
    if (!this.localEntities.has(entityId)) return;
    this.networkManager.replicateEntity(entityId, state);
  }
}

interface InterpolatedState extends EntityState {
  timestamp: number;
}

// ============================================================
// CLIENT PREDICTION & LAG COMPENSATION
// ============================================================

export interface InputSnapshot {
  tick: number;
  input: InputState;
  timestamp: number;
}

export interface InputState {
  position: THREE.Vector3;
  rotation: THREE.Euler;
  buttons: Set<string>;
  deltaTime: number;
}

export class ClientPrediction {
  private pendingInputs: InputSnapshot[] = [];
  private serverStates: Map<number, { tick: number; state: EntityState }> = new Map();
  private confirmedTick: number = 0;
  private currentTick: number = 0;
  private networkManager: NetworkManager;
  private reconciliationEnabled: boolean = true;

  constructor(networkManager: NetworkManager) {
    this.networkManager = networkManager;
    this.setupHandlers();
  }

  private setupHandlers(): void {
    this.networkManager.registerHandler('server_snapshot', (msg) => {
      const { tick, state, confirmedInputTick } = msg.data;
      this.serverStates.set(tick, { tick, state });
      
      if (confirmedInputTick !== undefined) {
        this.confirmedTick = confirmedInputTick;
        this.reconcile(confirmedInputTick);
      }
    });
  }

  captureInput(input: InputState): InputSnapshot {
    this.currentTick++;
    const snapshot: InputSnapshot = {
      tick: this.currentTick,
      input,
      timestamp: Date.now(),
    };
    this.pendingInputs.push(snapshot);
    return snapshot;
  }

  applyInput(snapshot: InputSnapshot, currentState: EntityState): EntityState {
    // Apply movement based on input
    const newPos = currentState.position.clone();
    const newRot = currentState.rotation.clone();

    // Simple movement application (customize for your physics)
    if (snapshot.input.buttons.has('forward')) {
      newPos.z += snapshot.input.deltaTime * 5;
    }
    if (snapshot.input.buttons.has('backward')) {
      newPos.z -= snapshot.input.deltaTime * 5;
    }
    if (snapshot.input.buttons.has('left')) {
      newPos.x -= snapshot.input.deltaTime * 5;
    }
    if (snapshot.input.buttons.has('right')) {
      newPos.x += snapshot.input.deltaTime * 5;
    }

    return {
      ...currentState,
      position: newPos,
      rotation: newRot,
    };
  }

  private reconcile(confirmedTick: number): void {
    if (!this.reconciliationEnabled) return;

    // Find the server state that corresponds to the confirmed input
    const serverState = this.serverStates.get(confirmedTick);
    if (!serverState) return;

    // Apply remaining pending inputs from the confirmed state
    const pendingAfterConfirmation = this.pendingInputs.filter(i => i.tick > confirmedTick);

    let currentPredicted = serverState.state;
    for (const input of pendingAfterConfirmation) {
      currentPredicted = this.applyInput(input, currentPredicted);
    }

    // Store the corrected state for display
    this.serverStates.set(this.currentTick, {
      tick: this.currentTick,
      state: currentPredicted,
    });
  }

  getPredictedState(): EntityState {
    // Get the latest predicted state
    const latest = this.serverStates.get(this.currentTick);
    return latest?.state || { 
      position: new THREE.Vector3(), 
      rotation: new THREE.Euler(), 
      scale: new THREE.Vector3(1,1,1) 
    };
  }

  // Server reconciliation
  processServerCorrection(serverTick: number, serverState: EntityState, inputTick: number): void {
    this.serverStates.set(serverTick, { tick: serverTick, state: serverState });
    this.confirmedTick = inputTick;
    
    // Reconcile differences
    this.reconcile(inputTick);
  }
}

// ============================================================
// NETWORKED ENTITY COMPONENT
// ============================================================

export interface NetworkedEntity {
  entityId: string;
  networkId: string;
  ownerId: string;
  isOwner: boolean;
  isServer: boolean;
  replicateTransform: boolean;
  replicateComponents: string[];
}

export function createNetworkedEntity(
  entityId: string,
  ownerId: string,
  localPlayerId: string
): NetworkedEntity {
  return {
    entityId,
    networkId: entityId,
    ownerId,
    isOwner: ownerId === localPlayerId,
    isServer: false,
    replicateTransform: true,
    replicateComponents: ['meshRenderer', 'rigidbody', 'animation'],
  };
}

// ============================================================
// SIMPLE DEDICATED SERVER (Embedded)
// ============================================================

export class SimpleServer {
  private connections: Map<string, WebSocket> = new Map();
  private entities: Map<string, EntityState> = new Map();
  private port: number;
  private server: WebSocket.Server | null = null;
  private tickInterval: NodeJS.Timeout | null = null;
  private tickRate: number = 20;
  private currentTick: number = 0;

  constructor(port: number = 3000) {
    this.port = port;
  }

  start(): void {
    // Note: This is a placeholder - in real implementation,
    // you'd use a proper WebSocket server library
    console.log(`[Server] Starting on port ${this.port}`);
  }

  stop(): void {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
    
    this.connections.forEach(conn => conn.close());
    this.connections.clear();
  }

  private startTick(): void {
    const interval = 1000 / this.tickRate;
    this.tickInterval = setInterval(() => this.serverTick(), interval);
  }

  private serverTick(): void {
    this.currentTick++;

    // Broadcast world state to all clients
    const snapshot = {
      type: 'server_snapshot',
      tick: this.currentTick,
      entities: Object.fromEntries(this.entities),
    };

    this.broadcast(snapshot);
  }

  private broadcast(message: any): void {
    const data = JSON.stringify(message);
    this.connections.forEach(conn => {
      if (conn.readyState === WebSocket.OPEN) {
        conn.send(data);
      }
    });
  }

  private handleMessage(clientId: string, message: any): void {
    switch (message.type) {
      case 'join':
        this.handleJoin(clientId, message.data);
        break;
      case 'entity_update':
        this.handleEntityUpdate(clientId, message.data);
        break;
      case 'entity_spawn':
        this.handleEntitySpawn(clientId, message.data);
        break;
      case 'entity_destroy':
        this.handleEntityDestroy(clientId, message.data);
        break;
      case 'rpc':
        this.handleRPC(clientId, message.data);
        break;
    }
  }

  private handleJoin(clientId: string, data: any): void {
    console.log(`[Server] Client ${clientId} joined as ${data.name}`);
    
    this.broadcast({
      type: 'player_joined',
      data: { id: clientId, name: data.name },
    });
  }

  private handleEntityUpdate(clientId: string, data: any): void {
    const { entityId, state } = data;
    this.entities.set(entityId, state);
    
    // Broadcast to other clients
    this.broadcast({
      type: 'entity_update',
      data: { entityId, state, fromClient: clientId },
    });
  }

  private handleEntitySpawn(clientId: string, data: any): void {
    const { entityId, prefabId, position } = data;
    this.entities.set(entityId, {
      position: new THREE.Vector3(position.x, position.y, position.z),
      rotation: new THREE.Euler(),
      scale: new THREE.Vector3(1, 1, 1),
    });

    this.broadcast({
      type: 'entity_spawn',
      data: { entityId, prefabId, position },
    });
  }

  private handleEntityDestroy(clientId: string, data: any): void {
    const { entityId } = data;
    this.entities.delete(entityId);

    this.broadcast({
      type: 'entity_destroy',
      data: { entityId },
    });
  }

  private handleRPC(clientId: string, data: any): void {
    const { rpcName, targetId, args } = data;
    
    if (targetId === null) {
      // Broadcast to all
      this.broadcast({ type: `rpc_${rpcName}`, data: { args, fromClient: clientId } });
    } else if (targetId === clientId) {
      // Send back to sender
      const conn = this.connections.get(clientId);
      if (conn) {
        conn.send(JSON.stringify({ type: `rpc_${rpcName}`, data: { args } }));
      }
    } else {
      // Send to specific client
      const targetConn = this.connections.get(targetId);
      if (targetConn) {
        targetConn.send(JSON.stringify({ type: `rpc_${rpcName}`, data: { args, fromClient: clientId } }));
      }
    }
  }
}