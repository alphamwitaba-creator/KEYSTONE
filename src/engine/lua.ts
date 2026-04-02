// ============================================================
// KEVLA ENGINE — Lua Scripting System v2.0
// NEW in v2: SendMessage, GetEntity full API, Audio.Play/Stop
// ============================================================

export interface InputState { keys: Set<string>; keysDown: Set<string>; keysUp: Set<string>; mouseX: number; mouseY: number; mouseButtons: Set<number>; mouseDeltaX: number; mouseDeltaY: number; }
export function createInputState(): InputState { return { keys: new Set(), keysDown: new Set(), keysUp: new Set(), mouseX: 0, mouseY: 0, mouseButtons: new Set(), mouseDeltaX: 0, mouseDeltaY: 0 }; }

export function transpileLua(luaCode: string): string {
  let js = luaCode;
  js = js.replace(/--\[\[[\s\S]*?\]\]/g, '');
  js = js.replace(/--.*/g, '');
  js = js.replace(/\.\./g, ' + ');
  js = js.replace(/\bfunction\s+(\w+)\s*\(([^)]*)\)/g, 'function $1($2) {');
  js = js.replace(/\bfunction\s*\(([^)]*)\)/g, 'function($1) {');
  js = js.replace(/\bfor\s+(\w+)\s*=\s*([^,]+),\s*([^,\n]+),\s*([^\n]+?)\s+do\b/g, 'for (let $1 = $2; $1 <= $3; $1 += $4) {');
  js = js.replace(/\bfor\s+(\w+)\s*=\s*([^,]+),\s*([^\n]+?)\s+do\b/g, 'for (let $1 = $2; $1 <= $3; $1++) {');
  js = js.replace(/\bfor\s+(\w+)\s*,\s*(\w+)\s+in\s+pairs\(([^)]+)\)\s+do\b/g, 'for (let [$1, $2] of Object.entries($3)) {');
  js = js.replace(/\bfor\s+(\w+)\s*,\s*(\w+)\s+in\s+ipairs\(([^)]+)\)\s+do\b/g, 'for (let [$1, $2] of $3.entries()) {');
  js = js.replace(/\bwhile\s+(.+?)\s+do\b/g, 'while ($1) {');
  js = js.replace(/\brepeat\b/g, 'do {');
  js = js.replace(/\buntil\s+(.+)/g, '} while (!($1))');
  js = js.replace(/\bif\s+(.+?)\s+then\b/g, 'if ($1) {');
  js = js.replace(/\belseif\s+(.+?)\s+then\b/g, '} else if ($1) {');
  js = js.replace(/\belse\b(?!\s*if)/g, '} else {');
  js = js.replace(/\bend\b/g, '}');
  js = js.replace(/\blocal\s+/g, 'let ');
  js = js.replace(/~=/g, '!==');
  js = js.replace(/==/g, '===');
  js = js.replace(/\band\b/g, '&&');
  js = js.replace(/\bor\b/g, '||');
  js = js.replace(/\bnot\b/g, '!');
  js = js.replace(/\bnil\b/g, 'null');
  js = js.replace(/#(\w+)/g, '$1.length');
  js = js.replace(/\bmath\.pi\b/gi, 'Math.PI');
  js = js.replace(/\bmath\.huge\b/gi, 'Infinity');
  js = js.replace(/\bmath\.sin\b/g, 'Math.sin');
  js = js.replace(/\bmath\.cos\b/g, 'Math.cos');
  js = js.replace(/\bmath\.tan\b/g, 'Math.tan');
  js = js.replace(/\bmath\.abs\b/g, 'Math.abs');
  js = js.replace(/\bmath\.sqrt\b/g, 'Math.sqrt');
  js = js.replace(/\bmath\.floor\b/g, 'Math.floor');
  js = js.replace(/\bmath\.ceil\b/g, 'Math.ceil');
  js = js.replace(/\bmath\.max\b/g, 'Math.max');
  js = js.replace(/\bmath\.min\b/g, 'Math.min');
  js = js.replace(/\bmath\.random\b/g, 'Math.random');
  js = js.replace(/\bmath\.atan2\b/g, 'Math.atan2');
  js = js.replace(/\bmath\.deg\b/g, '__deg');
  js = js.replace(/\bmath\.rad\b/g, '__rad');
  js = js.replace(/\btostring\b/g, 'String');
  js = js.replace(/\btonumber\b/g, 'Number');
  return js;
}

export interface CompiledScript { name: string; sourceCode: string; transpiledCode: string; compiledFn: Function | null; compileError: string | null; hasStart: boolean; hasUpdate: boolean; hasOnCollision: boolean; started: boolean; state: Record<string, any>; }

export class LuaVM {
  scripts: Map<string, CompiledScript> = new Map();
  consoleOutput: (msg: string, type: 'log' | 'warn' | 'error') => void;
  inputState: InputState;
  private _entityLookup: ((name: string) => any) | null = null;
  // NEW: message queue for SendMessage
  private _messageQueue: Array<{ targetName: string; method: string; args: any[] }> = [];
  private _messageHandlers: Map<string, Map<string, Function>> = new Map(); // entityId -> method -> fn
  // NEW: audio callback
  private _audioPlay: ((entityId: string, assetId: string) => void) | null = null;
  private _audioStop: ((entityId: string) => void) | null = null;

  constructor(consoleOutput: (msg: string, type: 'log' | 'warn' | 'error') => void, inputState: InputState) {
    this.consoleOutput = consoleOutput;
    this.inputState = inputState;
  }

  setEntityLookup(fn: (name: string) => any) { this._entityLookup = fn; }
  setAudioCallbacks(play: (entityId: string, assetId: string) => void, stop: (entityId: string) => void) {
    this._audioPlay = play; this._audioStop = stop;
  }

  compile(entityId: string, scriptIndex: number, name: string, luaCode: string): CompiledScript {
    const key = `${entityId}_${scriptIndex}`;
    const existing = this.scripts.get(key);
    if (existing && existing.sourceCode === luaCode && !existing.compileError) return existing;
    const result: CompiledScript = { name, sourceCode: luaCode, transpiledCode: '', compiledFn: null, compileError: null, hasStart: false, hasUpdate: false, hasOnCollision: false, started: existing?.started || false, state: existing?.state || {} };
    try {
      const js = transpileLua(luaCode);
      result.transpiledCode = js;
      result.hasStart = /\bfunction\s+Start\s*\(/.test(luaCode);
      result.hasUpdate = /\bfunction\s+Update\s*\(/.test(luaCode);
      result.hasOnCollision = /\bfunction\s+OnCollision\s*\(/.test(luaCode);
      const wrapped = `"use strict";\n${js}\nif(typeof Start==='function'&&!__started){Start(object,dt);__markStarted();}\nif(typeof Update==='function'){Update(object,dt);}`;
      result.compiledFn = new Function('object','dt','time','Input','print','_state','__started','__markStarted','__deg','__rad','FindEntity','Destroy','Instantiate','Vector3','SendMessage','Audio','math', wrapped);
    } catch (err: any) { result.compileError = err.message; }
    this.scripts.set(key, result);
    return result;
  }

  execute(entityId: string, scriptIndex: number, entityBindings: { position: { x:number;y:number;z:number }; rotation: { x:number;y:number;z:number }; scale: { x:number;y:number;z:number }; name: string; active: boolean }, dt: number, time: number): { error?: string; destroyed?: boolean; spawned?: any[] } {
    const key = `${entityId}_${scriptIndex}`;
    const script = this.scripts.get(key);
    if (!script || !script.compiledFn || script.compileError) return { error: script?.compileError || 'Script not compiled' };
    const spawned: any[] = [];
    let destroyed = false;
    try {
      const InputAPI = {
        GetKey: (k: string) => this.inputState.keys.has(k.toLowerCase()),
        GetKeyDown: (k: string) => this.inputState.keysDown.has(k.toLowerCase()),
        GetKeyUp: (k: string) => this.inputState.keysUp.has(k.toLowerCase()),
        GetMouseX: () => this.inputState.mouseX,
        GetMouseY: () => this.inputState.mouseY,
        GetMouseButton: (btn: number) => this.inputState.mouseButtons.has(btn),
        GetMouseDeltaX: () => this.inputState.mouseDeltaX,
        GetMouseDeltaY: () => this.inputState.mouseDeltaY,
        IsKeyHeld: (k: string) => this.inputState.keys.has(k.toLowerCase()),
      };
      const printFn = (...args: any[]) => this.consoleOutput(args.map(String).join('\t'), 'log');
      const deg = (r: number) => r * (180 / Math.PI);
      const rad = (d: number) => d * (Math.PI / 180);
      const Vector3 = (x = 0, y = 0, z = 0) => ({ x, y, z });
      const FindEntity = (name: string) => this._entityLookup ? this._entityLookup(name) : null;
      const Destroy = () => { destroyed = true; };
      const Instantiate = (type: string, x = 0, y = 0, z = 0) => { spawned.push({ type, position: { x, y, z } }); };
      // NEW: SendMessage — queues a message to another entity
      const SendMessage = (targetName: string, method: string, ...args: any[]) => {
        this._messageQueue.push({ targetName, method, args });
      };
      // NEW: Audio API
      const Audio = {
        Play: (assetId: string) => { this._audioPlay?.(entityId, assetId); },
        Stop: () => { this._audioStop?.(entityId); },
        SetVolume: (_vol: number) => {},
      };
      // Expose math table for scripts that use math.sin etc via variable
      const math = { sin: Math.sin, cos: Math.cos, tan: Math.tan, abs: Math.abs, sqrt: Math.sqrt, floor: Math.floor, ceil: Math.ceil, max: Math.max, min: Math.min, random: Math.random, atan2: Math.atan2, pi: Math.PI, huge: Infinity, deg, rad };
      script.compiledFn(entityBindings, dt, time, InputAPI, printFn, script.state, script.started, () => { script.started = true; }, deg, rad, FindEntity, Destroy, Instantiate, Vector3, SendMessage, Audio, math);
      return { destroyed, spawned: spawned.length > 0 ? spawned : undefined };
    } catch (err: any) { return { error: err.message }; }
  }

  // Process queued messages — called after all scripts run each frame.
  // entityLookupFull now also returns the entity's runtime bindings and script
  // count so we can dispatch into compiled scripts without requiring scripts to
  // pre-register handlers.
  flushMessages(
    entityLookupFull: (name: string) => {
      id: string; name: string;
      bindings: { position:{x:number;y:number;z:number}; rotation:{x:number;y:number;z:number}; scale:{x:number;y:number;z:number}; name:string; active:boolean };
      scriptCount: number;
    } | null
  ): void {
    const queue = [...this._messageQueue];
    this._messageQueue = [];
    for (const msg of queue) {
      const entity = entityLookupFull(msg.targetName);
      if (!entity) continue;

      // 1. Try pre-registered handler (registerMessageHandler path)
      const handlers = this._messageHandlers.get(entity.id);
      if (handlers) {
        const fn = handlers.get(msg.method);
        if (fn) { try { fn(...msg.args); } catch {} continue; }
      }

      // 2. Scan compiled scripts for a function matching the method name and
      //    invoke it directly — this is the primary path for Lua scripts that
      //    simply define `function OnHit(dmg) … end` without any registration.
      for (let idx = 0; idx < entity.scriptCount; idx++) {
        const script = this.scripts.get(`${entity.id}_${idx}`);
        if (!script || !script.compiledFn || script.compileError) continue;
        if (!script.sourceCode.includes(`function ${msg.method}`)) continue;
        try {
          const printFn = (...args: any[]) => this.consoleOutput(args.map(String).join('\t'), 'log');
          const deg = (r: number) => r * (180 / Math.PI);
          const rad = (d: number) => d * (Math.PI / 180);
          const Vector3 = (x = 0, y = 0, z = 0) => ({ x, y, z });
          const FindEntity = (name: string) => this._entityLookup ? this._entityLookup(name) : null;
          const SendMessage = (targetName: string, method: string, ...args: any[]) => {
            this._messageQueue.push({ targetName, method, args });
          };
          const Audio = {
            Play: (assetId: string) => { this._audioPlay?.(entity.id, assetId); },
            Stop: () => { this._audioStop?.(entity.id); },
            SetVolume: (_vol: number) => {},
          };
          const math = { sin: Math.sin, cos: Math.cos, tan: Math.tan, abs: Math.abs, sqrt: Math.sqrt, floor: Math.floor, ceil: Math.ceil, max: Math.max, min: Math.min, random: Math.random, atan2: Math.atan2, pi: Math.PI, huge: Infinity, deg, rad };
          const InputAPI = {
            GetKey: () => false, GetKeyDown: () => false, GetKeyUp: () => false,
            GetMouseX: () => 0, GetMouseY: () => 0, GetMouseButton: () => false,
            GetMouseDeltaX: () => 0, GetMouseDeltaY: () => 0, IsKeyHeld: () => false,
          };
          // Build a one-shot function: re-run the transpiled source to define
          // all its functions in scope, then call the target method if defined.
          const argsJson = JSON.stringify(msg.args);
          const dispatchSrc = `"use strict";\n${script.transpiledCode}\nconst __ma=${argsJson};if(typeof ${msg.method}==='function'){${msg.method}(...__ma);}`;
          const dispatchFn = new Function(
            'object','dt','time','Input','print','_state','__started','__markStarted',
            '__deg','__rad','FindEntity','Destroy','Instantiate','Vector3','SendMessage','Audio','math',
            dispatchSrc
          );
          const noop = () => {};
          dispatchFn(
            entity.bindings, 0, 0, InputAPI, printFn,
            script.state, script.started, noop,
            deg, rad, FindEntity, noop, noop, Vector3, SendMessage, Audio, math
          );
        } catch { /* ignore per-message dispatch errors */ }
      }
    }
  }

  registerMessageHandler(entityId: string, method: string, fn: Function): void {
    if (!this._messageHandlers.has(entityId)) this._messageHandlers.set(entityId, new Map());
    this._messageHandlers.get(entityId)!.set(method, fn);
  }

  reset(): void { this.scripts.forEach(s => { s.started = false; s.state = {}; }); this._messageQueue = []; }
  clear(): void { this.scripts.clear(); this._messageHandlers.clear(); this._messageQueue = []; }
  removeEntity(entityId: string): void {
    const keys: string[] = [];
    this.scripts.forEach((_, k) => { if (k.startsWith(entityId + '_')) keys.push(k); });
    keys.forEach(k => this.scripts.delete(k));
    this._messageHandlers.delete(entityId);
  }
  getScriptInfo(entityId: string, idx: number) { return this.scripts.get(`${entityId}_${idx}`); }
}

// ---- Lua Presets ----
export const LUA_PRESETS: Record<string, { name: string; code: string; description: string }> = {
  move_wasd: { name: 'WASD Movement', description: 'Move object with WASD keys',
    code: `-- WASD Movement\nlocal speed = 5\nfunction Update(object, dt)\n    if Input.GetKey("w") then object.position.z = object.position.z - speed * dt end\n    if Input.GetKey("s") then object.position.z = object.position.z + speed * dt end\n    if Input.GetKey("a") then object.position.x = object.position.x - speed * dt end\n    if Input.GetKey("d") then object.position.x = object.position.x + speed * dt end\n    if Input.GetKey("q") then object.rotation.y = object.rotation.y - 90 * dt end\n    if Input.GetKey("e") then object.rotation.y = object.rotation.y + 90 * dt end\nend` },
  rotate: { name: 'Auto Rotate', description: 'Continuously rotates the object',
    code: `-- Auto Rotate\nlocal rotSpeed = 60\nfunction Update(object, dt)\n    object.rotation.y = object.rotation.y + rotSpeed * dt\nend` },
  bounce: { name: 'Bounce', description: 'Object bounces up and down',
    code: `-- Bounce\nlocal amplitude = 2\nlocal frequency = 3\nlocal baseY = 1.5\nfunction Update(object, dt)\n    object.position.y = baseY + math.abs(math.sin(time * frequency)) * amplitude\nend` },
  orbit: { name: 'Orbit', description: 'Orbits around world origin',
    code: `-- Orbit\nlocal radius = 4\nlocal height = 1.5\nlocal orbitSpeed = 1.5\nfunction Update(object, dt)\n    object.position.x = math.cos(time * orbitSpeed) * radius\n    object.position.z = math.sin(time * orbitSpeed) * radius\n    object.position.y = height\n    object.rotation.y = -time * orbitSpeed * 57.3\nend` },
  hover: { name: 'Hover Float', description: 'Gently floats up and down',
    code: `-- Hover Float\nfunction Update(object, dt)\n    object.position.y = object.position.y + math.sin(time * 2) * 0.01\n    object.rotation.y = object.rotation.y + 15 * dt\nend` },
  patrol: { name: 'Patrol', description: 'Moves back and forth along X axis',
    code: `-- Patrol\nlocal range = 4\nlocal speed = 2\nfunction Update(object, dt)\n    object.position.x = math.sin(time * speed) * range\n    if math.cos(time * speed) > 0 then object.rotation.y = 90\n    else object.rotation.y = -90\n    end\nend` },
  follow_input: { name: 'Arrow Keys Move', description: 'Move with arrow keys',
    code: `-- Arrow Keys\nlocal speed = 4\nfunction Update(object, dt)\n    if Input.GetKey("arrowup") then object.position.z = object.position.z - speed * dt end\n    if Input.GetKey("arrowdown") then object.position.z = object.position.z + speed * dt end\n    if Input.GetKey("arrowleft") then object.position.x = object.position.x - speed * dt end\n    if Input.GetKey("arrowright") then object.position.x = object.position.x + speed * dt end\nend` },
  color_change: { name: 'Scale Pulse', description: 'Pulses scale based on time',
    code: `-- Scale Pulse\nlocal minS = 0.7\nlocal maxS = 1.5\nlocal pulseSpeed = 2\nfunction Update(object, dt)\n    local s = minS + (maxS - minS) * (math.sin(time * pulseSpeed) * 0.5 + 0.5)\n    object.scale.x = s\n    object.scale.y = s\n    object.scale.z = s\nend` },
  wave: { name: 'Wave Motion', description: 'Complex wave pattern movement',
    code: `-- Wave Motion\nlocal scaleX = 3\nlocal scaleZ = 2\nlocal speed = 1\nfunction Update(object, dt)\n    object.position.x = math.sin(time * speed) * scaleX\n    object.position.z = math.sin(time * speed * 2) * scaleZ\n    object.position.y = 1 + math.sin(time * 3) * 0.5\nend` },
  spawner: { name: 'Spawner', description: 'Press F to spawn objects nearby',
    code: `-- Spawner\nfunction Update(object, dt)\n    if Input.GetKeyDown("f") then\n        local ox = object.position.x + (math.random() - 0.5) * 3\n        local oy = object.position.y + 2\n        local oz = object.position.z + (math.random() - 0.5) * 3\n        Instantiate("sphere", ox, oy, oz)\n        print("Spawned at " .. ox)\n    end\nend` },
  look_at_mouse: { name: 'Track Mouse', description: 'Object rotates based on mouse position',
    code: `-- Track Mouse\nfunction Update(object, dt)\n    local mx = Input.GetMouseX()\n    local my = Input.GetMouseY()\n    object.rotation.y = (mx - 0.5) * 180\n    object.rotation.x = (my - 0.5) * -60\nend` },
  state_demo: { name: 'Counter Demo', description: 'Demonstrates persistent state',
    code: `-- Counter Demo\nfunction Start(object, dt)\n    _state.counter = 0\n    _state.timer = 0\n    print("Script started on: " .. object.name)\nend\nfunction Update(object, dt)\n    _state.timer = _state.timer + dt\n    if _state.timer >= 1.0 then\n        _state.counter = _state.counter + 1\n        _state.timer = 0\n        print(object.name .. " tick #" .. _state.counter)\n    end\nend` },
  send_message: { name: 'SendMessage Demo', description: 'Send a message to another entity by name',
    code: `-- SendMessage Demo\n-- Sends a "OnHit" message to entity named "Target" every second\nfunction Start(object, dt)\n    _state.timer = 0\nend\nfunction Update(object, dt)\n    _state.timer = _state.timer + dt\n    if _state.timer >= 1.0 then\n        _state.timer = 0\n        SendMessage("Target", "OnHit", 10)\n        print("Sent OnHit to Target")\n    end\nend` },
  custom: { name: 'Custom Script', description: 'Empty template with full API reference',
    code: `-- Custom Lua Script\n-- API Reference:\n--   object.position.x/y/z   (read/write)\n--   object.rotation.x/y/z   (degrees, read/write)\n--   object.scale.x/y/z      (read/write)\n--   object.name              (read only)\n--   dt                       (delta time seconds)\n--   time                     (elapsed seconds)\n--   Input.GetKey("w")        (true while held)\n--   Input.GetKeyDown("space")(true on first press)\n--   print("msg")             (logs to Console)\n--   _state.myVar = value     (persists between frames)\n--   FindEntity("name")       (get entity by name)\n--   SendMessage("name", "Method", arg1)\n--   Instantiate("cube", x, y, z)\n--   Destroy()                (remove this entity)\n--   Audio.Play("assetId")\n--   Audio.Stop()\n\nfunction Start(object, dt)\n    print("Hello from " .. object.name)\nend\n\nfunction Update(object, dt)\n    -- Your code here\nend` },
};
