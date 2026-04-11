// ============================================================
// KEVLA ENGINE — 3D Viewport (Upgraded)
// Three.js + GLTFLoader + OBJLoader + AnimationMixer
// TransformControls + Skybox + Fog + Full model support
// ============================================================

import { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import { useEngineStore } from '../engine/store';
import type { MeshType, SkyboxPreset, PostProcessConfig } from '../engine/types';
import type { Entity } from '../engine/types';
import { Icon } from './Icons';
import { SculptSystem } from '../engine/sculpt/SculptSystem';

// ---- Primitive geometry factory ----
function createGeometry(type: MeshType | string): THREE.BufferGeometry {
  switch (type) {
    case 'cube':     return new THREE.BoxGeometry(1, 1, 1);
    case 'sphere':   return new THREE.SphereGeometry(0.5, 32, 32);
    case 'cylinder': return new THREE.CylinderGeometry(0.5, 0.5, 1, 32);
    case 'plane':    { const g = new THREE.PlaneGeometry(1, 1); g.rotateX(-Math.PI / 2); return g; }
    case 'cone':     return new THREE.ConeGeometry(0.5, 1, 32);
    case 'torus':    return new THREE.TorusGeometry(0.4, 0.15, 16, 48);
    default:         return new THREE.BoxGeometry(1, 1, 1);
  }
}

// ---- Procedural skybox colors ----
function getSkyboxColors(preset: SkyboxPreset): { top: number; bottom: number } | null {
  switch (preset) {
    case 'sky':    return { top: 0x87ceeb, bottom: 0xdff0f8 };
    case 'night':  return { top: 0x0a0a1a, bottom: 0x1a1a2e };
    case 'sunset': return { top: 0xff6b35, bottom: 0xff9a44 };
    case 'space':  return { top: 0x000005, bottom: 0x050010 };
    default:       return null;
  }
}

// ---- Cache of loaded 3D model objects & mixers ----
// Key: assetId or dataUrl hash, Value: { group, clips }
interface LoadedModel {
  group: THREE.Group;
  clips: THREE.AnimationClip[];
}
const modelCache = new Map<string, LoadedModel>();
const mixerMap = new Map<string, THREE.AnimationMixer>();
const actionMap = new Map<string, THREE.AnimationAction | null>();

function getModelCacheKey(entity: Entity): string | null {
  return entity.meshRenderer?.modelAssetId || entity.meshRenderer?.modelPath?.slice(0, 80) || null;
}

async function loadModel(entity: Entity): Promise<LoadedModel | null> {
  const mr = entity.meshRenderer;
  if (!mr || mr.meshType !== 'custom' || !mr.modelPath) return null;

  const key = getModelCacheKey(entity)!;
  if (modelCache.has(key)) return modelCache.get(key)!;

  const dataUrl = mr.modelPath;
  const isObj = dataUrl.includes('.obj') || dataUrl.includes('text/plain');
  const hasGltfMagic = (s: string) => {
    try { const bytes = atob(s.split(',')[1]); return bytes.charCodeAt(0) === 0x67 && bytes.charCodeAt(1) === 0x6c && bytes.charCodeAt(2) === 0x54 && bytes.charCodeAt(3) === 0x46; } catch { return false; }
  };
  const isGlb = dataUrl.includes('.glb') || dataUrl.includes('model/gltf') || dataUrl.includes('application/octet') || hasGltfMagic(dataUrl);

  try {
    if (isObj) {
      const objData = atob(dataUrl.split(',')[1]);
      const group = new THREE.Group();
      const objLoader = new OBJLoader();

      if (mr.mtlDataUrl) {
        const mtlData = atob(mr.mtlDataUrl.split(',')[1]);
        const assets = useEngineStore.getState().assets;
        const texMap: Record<string, string> = {};
        assets.forEach(a => { if (a.type === 'texture') texMap[a.name.toLowerCase()] = a.dataUrl; });

        const mtlLoader = new MTLLoader(new THREE.LoadingManager());
        mtlLoader.setPath('');
        const mtlResult = mtlLoader.parse(mtlData);
        mtlResult.preload();

        const texLoader = new THREE.TextureLoader(new THREE.LoadingManager());
        const texLoad = (texPath: string, onLoad: (t: THREE.Texture) => void) => {
          const name = texPath.replace(/\\/g, '/').split('/').pop()?.toLowerCase() || texPath.toLowerCase();
          const url = texMap[name] || texMap[texPath.toLowerCase()];
          if (url) {
            texLoader.load(url, (t) => { t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.RepeatWrapping; onLoad(t); });
          }
        };

        mtlResult.materials.forEach((mat: THREE.Material) => {
          const m = mat as THREE.MeshStandardMaterial;
          const slots: [string | THREE.Texture | null, string][] = [
            [m.map, 'map'], [m.normalMap, 'normalMap'], [m.roughnessMap, 'roughnessMap'],
            [m.metalnessMap, 'metalnessMap'], [m.emissiveMap, 'emissiveMap'], [m.aoMap, 'aoMap'],
          ];
          slots.forEach(([prop, slot]) => {
            if (typeof prop === 'string' && prop) {
              texLoad(prop, (t) => { (m as any)[slot] = t; m.needsUpdate = true; });
            }
          });
        });
        objLoader.setMaterials(mtlResult);
      }

      const parsed = objLoader.parse(objData);
      group.add(parsed);
      const result: LoadedModel = { group, clips: [] };
      modelCache.set(key, result);
      return result;
    } else {
      const loader = new GLTFLoader();
      const glbBase64 = dataUrl.split(',')[1] || '';
      const buffer = Uint8Array.from(atob(glbBase64), c => c.charCodeAt(0));
      return new Promise((resolve) => {
        loader.parse(
          buffer.buffer,
          '',
          (gltf) => {
            const result: LoadedModel = { group: gltf.scene, clips: gltf.animations || [] };
            modelCache.set(key, result);
            resolve(result);
          },
          () => resolve(null)
        );
      });
    }
  } catch {
    return null;
  }
}

// ---- Apply texture map to MeshStandardMaterial ----
function applyTexture(mat: THREE.MeshStandardMaterial, slot: keyof THREE.MeshStandardMaterial, dataUrl: string | undefined) {
  if (!dataUrl) { (mat as any)[slot] = null; mat.needsUpdate = true; return; }
  const loader = new THREE.TextureLoader();
  loader.load(dataUrl, (tex) => {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    (mat as any)[slot] = tex;
    mat.needsUpdate = true;
  });
}

// ============================================================
// Single viewport instance
// ============================================================
function ViewportInstance({ realityId, realityLabel, realityColor, divergence, isMain }: {
  realityId?: string;
  realityLabel?: string;
  realityColor?: string;
  divergence?: number;
  isMain?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef  = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef     = useRef(new THREE.Scene());
  const cameraRef    = useRef(new THREE.PerspectiveCamera(60, 1, 0.1, 1000));
  const orbitRef     = useRef<OrbitControls | null>(null);
  const transformRef = useRef<TransformControls | null>(null);
  const fpsRef       = useRef<HTMLDivElement>(null);
  const rafRef       = useRef(0);
  const clockRef     = useRef(new THREE.Clock());
  const frameCount   = useRef(0);
  const fpsTime      = useRef(0);

  // Scene object maps
  const meshMapRef        = useRef(new Map<string, THREE.Object3D>());
  const colliderMapRef    = useRef(new Map<string, THREE.Mesh>());
  const ghostMeshesRef    = useRef<THREE.Mesh[]>([]);
  const trailLinesRef     = useRef<THREE.Line[]>([]);
  const velocityArrowsRef = useRef<THREE.ArrowHelper[]>([]);
  const contactSpritesRef = useRef<THREE.Mesh[]>([]);
  const boxHelperRef      = useRef<THREE.BoxHelper | null>(null);
  const terrainMeshMapRef  = useRef(new Map<string, THREE.Mesh>());
  const waterMeshMapRef    = useRef(new Map<string, THREE.Mesh>());
  const particleMeshMapRef = useRef(new Map<string, THREE.Points>());
  const skyboxMeshRef     = useRef<THREE.Mesh | null>(null);
  const ppCanvasRef        = useRef<HTMLCanvasElement | null>(null);
  const lastPostProcess    = useRef<string>('');
  const sunRef            = useRef<THREE.DirectionalLight | null>(null);
  const ambientRef        = useRef<THREE.AmbientLight | null>(null);

  const colliderMat         = useRef(new THREE.MeshBasicMaterial({ color: 0x00ff88, wireframe: true, transparent: true, opacity: 0.3, depthWrite: false }));
  const colliderMatSelected = useRef(new THREE.MeshBasicMaterial({ color: 0xffaa00, wireframe: true, transparent: true, opacity: 0.45, depthWrite: false }));

  // Track loaded model objects so we can add/remove from scene
  const modelObjectsRef = useRef(new Map<string, THREE.Object3D>());
  // Track which entities have pending async load
  const loadingRef = useRef(new Set<string>());
  // Track per-entity texture version to avoid redundant loads
  const texVersionRef = useRef(new Map<string, string>());
  // Sculpt refs
  const sculptSystemRef = useRef<SculptSystem | null>(null);
  const isSculpting = useRef(false);
  const sculptMeshRef = useRef<THREE.Mesh | null>(null);
  const sculptWireRef = useRef<THREE.LineSegments | null>(null);
  const sculptHitRef = useRef<THREE.Vector3 | null>(null);
  const sculptNormalRef = useRef<THREE.Vector3 | null>(null);
  const sculptBrushSizeRef = useRef(0.5);
  const lastBrushSize = useRef(0.5);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // ---- Renderer ----
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x1a1a2e);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // ---- Camera & Orbit ----
    const camera = cameraRef.current;
    camera.position.set(10, 8, 10);
    camera.lookAt(0, 0, 0);

    const orbit = new OrbitControls(camera, renderer.domElement);
    orbit.enableDamping = true;
    orbit.dampingFactor = 0.08;
    orbit.minDistance = 1;
    orbit.maxDistance = 500;
    orbit.target.set(0, 1, 0);
    orbitRef.current = orbit;

    // ---- TransformControls (main viewport only) ----
    if (isMain) {
      const tc = new TransformControls(camera, renderer.domElement);
      tc.addEventListener('dragging-changed', (e: any) => {
        orbit.enabled = !e.value;
      });
      tc.addEventListener('objectChange', () => {
        const store = useEngineStore.getState();
        const sid = store.selectedId;
        if (!sid) return;
        const obj = meshMapRef.current.get(sid);
        if (!obj) return;
        const p = obj.position, r = obj.rotation, sc = obj.scale;
        const toDeg = (v: number) => v * 180 / Math.PI;
        store.updateTransformField(sid, 'position', 'x', +p.x.toFixed(4));
        store.updateTransformField(sid, 'position', 'y', +p.y.toFixed(4));
        store.updateTransformField(sid, 'position', 'z', +p.z.toFixed(4));
        store.updateTransformField(sid, 'rotation', 'x', +toDeg(r.x).toFixed(2));
        store.updateTransformField(sid, 'rotation', 'y', +toDeg(r.y).toFixed(2));
        store.updateTransformField(sid, 'rotation', 'z', +toDeg(r.z).toFixed(2));
        store.updateTransformField(sid, 'scale', 'x', +sc.x.toFixed(4));
        store.updateTransformField(sid, 'scale', 'y', +sc.y.toFixed(4));
        store.updateTransformField(sid, 'scale', 'z', +sc.z.toFixed(4));
      });
      sceneRef.current.add(tc);
      transformRef.current = tc;

      // Keyboard shortcuts for gizmo modes
      const onKey = (e: KeyboardEvent) => {
        if (!transformRef.current) return;
        if (e.key === 'w' || e.key === 'W') transformRef.current.setMode('translate');
        if (e.key === 'e' || e.key === 'E') transformRef.current.setMode('rotate');
        if (e.key === 'r' || e.key === 'R') transformRef.current.setMode('scale');
      };
      window.addEventListener('keydown', onKey);
    }

    // ---- Lighting ----
    const ambient = new THREE.AmbientLight(0x8899bb, 0.5);
    sceneRef.current.add(ambient);
    ambientRef.current = ambient;
    sceneRef.current.add(new THREE.HemisphereLight(0x87ceeb, 0x362d1e, 0.4));

    const sun = new THREE.DirectionalLight(0xffeedd, 1.5);
    sun.position.set(8, 15, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -25; sun.shadow.camera.right = 25;
    sun.shadow.camera.top = 25;  sun.shadow.camera.bottom = -25;
    sun.shadow.camera.near = 0.5; sun.shadow.camera.far = 100;
    sun.shadow.bias = -0.001;
    sceneRef.current.add(sun);
    sunRef.current = sun;

    const grid = new THREE.GridHelper(80, 80, 0x444455, 0x2a2a36);
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.6;
    sceneRef.current.add(grid);
    sceneRef.current.add(new THREE.AxesHelper(2));

    const contactGeo = new THREE.SphereGeometry(0.06, 8, 8);
    const contactMtl = new THREE.MeshBasicMaterial({ color: 0xff2222, transparent: true, opacity: 0.9 });

    // ---- Resize ----
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      if (width === 0 || height === 0) return;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    });
    ro.observe(container);

    // ---- Sculpt System ----
    const sculptSys = new SculptSystem({ ...state.sculptConfig });
    sculptSystemRef.current = sculptSys;
    (window as any).__kevla_meshMap = meshMapRef.current;

    const sculptRaycaster = new THREE.Raycaster();
    const sculptMouse = new THREE.Vector2();

    // ---- Sculpt Mouse Events ----
    const getSculptMesh = (entityId: string): THREE.Mesh | null => {
      const obj = meshMapRef.current.get(entityId);
      if (!obj) return null;
      if ((obj as THREE.Mesh).isMesh) return obj as THREE.Mesh;
      let found: THREE.Mesh | null = null;
      obj.traverse(child => { if ((child as THREE.Mesh).isMesh && !found) found = child as THREE.Mesh; });
      return found;
    };

    const getMouseNDC = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      return new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      );
    };

    const brushIndicator = document.createElement('div');
    brushIndicator.style.cssText = 'position:fixed;pointer-events:none;border:2px solid rgba(255,140,0,0.8);border-radius:50%;z-index:9999;display:none;';
    document.body.appendChild(brushIndicator);

    const updateBrushIndicator = (e: MouseEvent, size: number) => {
      brushIndicator.style.display = 'block';
      brushIndicator.style.width = `${size * 200}px`;
      brushIndicator.style.height = `${size * 200}px`;
      brushIndicator.style.left = `${e.clientX - size * 100}px`;
      brushIndicator.style.top = `${e.clientY - size * 100}px`;
    };

    renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());

    renderer.domElement.addEventListener('mousedown', (e: MouseEvent) => {
      const state = useEngineStore.getState();
      if (!isMain || !state.sculptConfig.enabled || e.button !== 2) return;
      if (!state.selectedId) return;
      const mesh = getSculptMesh(state.selectedId);
      if (!mesh) return;
      e.preventDefault();

      sculptMouse.copy(getMouseNDC(e));
      sculptRaycaster.setFromCamera(sculptMouse, camera);
      const hits = sculptRaycaster.intersectObject(mesh, true);
      if (hits.length === 0) return;

      const hit = hits[0];
      sculptMeshRef.current = mesh;
      sculptHitRef.current = hit.point.clone();
      sculptNormalRef.current = hit.face ? hit.face.normal.clone().transformDirection(mesh.matrixWorld) : new THREE.Vector3(0,1,0);
      isSculpting.current = true;
      orbit.enabled = false;
      sculptSys.beginStroke(state.selectedId, state.sculptConfig.brush, hit.point);
      if (!sculptSys.getConfig().enabled) sculptSys.setConfig({ enabled: true, activeEntityId: state.selectedId });
      sculptSys.cacheMesh(state.selectedId, mesh);
    });

    renderer.domElement.addEventListener('mousemove', (e: MouseEvent) => {
      const state = useEngineStore.getState();

      if (isMain && state.sculptConfig.enabled) {
        updateBrushIndicator(e, state.sculptConfig.brush.size);
        if (e.shiftKey) { brushIndicator.style.borderColor = 'rgba(100,200,255,0.8)'; }
        else if (e.ctrlKey) { brushIndicator.style.borderColor = 'rgba(255,80,80,0.8)'; }
        else { brushIndicator.style.borderColor = 'rgba(255,140,0,0.8)'; }
      } else {
        brushIndicator.style.display = 'none';
      }

      if (!isMain || !isSculpting.current || !state.sculptConfig.enabled || !sculptMeshRef.current || !sculptHitRef.current || !sculptNormalRef.current) return;

      sculptMouse.copy(getMouseNDC(e));
      sculptRaycaster.setFromCamera(sculptMouse, camera);
      const hits = sculptRaycaster.intersectObject(sculptMeshRef.current, true);
      if (hits.length === 0) return;

      const hit = hits[0];
      sculptHitRef.current.copy(hit.point);
      sculptNormalRef.current.copy(hit.face ? hit.face.normal.clone().transformDirection(sculptMeshRef.current.matrixWorld) : new THREE.Vector3(0,1,0));

      const pressure = (e as any).pressure ?? 1.0;
      let brush = state.sculptConfig.brush;
      if (e.shiftKey) brush = { ...brush, type: 'smooth' as const, strength: brush.strength * 0.5 };
      else if (e.ctrlKey) brush = { ...brush, type: 'scrape' as const, strength: brush.strength * 0.7 };

      sculptSys.applyBrush(
        state.selectedId!, brush, hit.point,
        sculptNormalRef.current, sculptMeshRef.current, pressure,
      );
    });

    renderer.domElement.addEventListener('mouseup', (e: MouseEvent) => {
      if (!isSculpting.current) return;
      const state = useEngineStore.getState();
      if (state.selectedId) sculptSys.endStroke(state.selectedId);
      isSculpting.current = false;
      orbit.enabled = true;
    });

    renderer.domElement.addEventListener('wheel', (e: WheelEvent) => {
      const state = useEngineStore.getState();
      if (!isMain || !state.sculptConfig.enabled) return;
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.05 : 0.05;
      const newSize = Math.max(0.05, Math.min(3, state.sculptConfig.brush.size + delta));
      state.setSculptBrush({ size: newSize });
      sculptBrushSizeRef.current = newSize;
    }, { passive: false });

    // ---- Animate loop ----
    const animate = () => {
      rafRef.current = requestAnimationFrame(animate);
      const dt = Math.min(clockRef.current.getDelta(), 0.05);
      orbit.update();

      const state = useEngineStore.getState();
      const sculptConfig = state.sculptConfig;

      if (isMain && state.isPlaying && !state.isPaused) state.physicsUpdate(dt);

      // Update animation mixers every frame
      mixerMap.forEach(mixer => mixer.update(dt));

      // Update particle system
      if (isMain) {
        state.particleSystem.updateAll(dt);
      }

      // Update visual scripting for entities with scripts
      if (isMain && state.isPlaying && !state.isPaused) {
        state.entities.forEach(entity => {
          if (entity.visualScript) {
            state.executeVisualScript(entity.id, dt);
          }
          // Execute behavior trees
          const executor = state.behaviorExecutors.get(entity.id);
          if (executor && entity.behaviorTree) {
            const result = executor.tick({
              position: new THREE.Vector3(entity.transform.position.x, entity.transform.position.y, entity.transform.position.z),
              dt,
            });
            if (result) {
              // Apply movement if the behavior tree returns velocity
              if (result.velocity) {
                entity.transform.position.x += result.velocity.x * dt;
                entity.transform.position.y += result.velocity.y * dt;
                entity.transform.position.z += result.velocity.z * dt;
              }
            }
          }
        });
      }

      // Scene settings: skybox, fog, ambient
      const ss = state.sceneSettings;
      updateSkybox(ss.skyboxPreset);
      if (ss.fogEnabled) {
        sceneRef.current.fog = new THREE.Fog(ss.fogColor, ss.fogNear, ss.fogFar);
      } else {
        sceneRef.current.fog = null;
      }
      if (ambientRef.current) {
        ambientRef.current.color.set(ss.ambientColor);
        ambientRef.current.intensity = ss.ambientIntensity;
      }

      // Entities
      let entities: Entity[];
      if (realityId) {
        entities = state.parallelEngine.getRealityEntities(realityId);
      } else {
        entities = state.entities;
      }

      const { selectedId, physicsDebug, showColliders, showVelocities, showContacts,
              debugContacts, isPlaying, temporalGhosts, temporalConfig, temporalEngine } = state;

      const meshMap     = meshMapRef.current;
      const colliderMap = colliderMapRef.current;
      const entityIds   = new Set(entities.map(e => e.id));

      // Cleanup removed entities
      meshMap.forEach((obj, id) => {
        if (!entityIds.has(id)) {
          sceneRef.current.remove(obj);
          if (obj instanceof THREE.Mesh) { obj.geometry.dispose(); (obj.material as THREE.Material).dispose(); }
          meshMap.delete(id);
          mixerMap.delete(id);
          actionMap.delete(id);
        }
      });
      colliderMap.forEach((mesh, id) => {
        if (!entityIds.has(id)) { sceneRef.current.remove(mesh); mesh.geometry.dispose(); colliderMap.delete(id); }
      });
      terrainMeshMapRef.current.forEach((mesh, id) => {
        if (!entityIds.has(id)) { sceneRef.current.remove(mesh); mesh.geometry.dispose(); (mesh.material as THREE.Material).dispose(); terrainMeshMapRef.current.delete(id); }
      });
      waterMeshMapRef.current.forEach((mesh, id) => {
        if (!entityIds.has(id)) { sceneRef.current.remove(mesh); mesh.geometry.dispose(); (mesh.material as THREE.Material).dispose(); waterMeshMapRef.current.delete(id); }
      });
      particleMeshMapRef.current.forEach((mesh, id) => {
        if (!entityIds.has(id)) { sceneRef.current.remove(mesh); mesh.geometry.dispose(); (mesh.material as THREE.Material).dispose(); particleMeshMapRef.current.delete(id); state.particleSystem.removeEmitter(id); }
      });

      velocityArrowsRef.current.forEach(a => sceneRef.current.remove(a));
      velocityArrowsRef.current = [];
      contactSpritesRef.current.forEach(s => sceneRef.current.remove(s));
      contactSpritesRef.current = [];
      ghostMeshesRef.current.forEach(m => { sceneRef.current.remove(m); m.geometry.dispose(); (m.material as THREE.Material).dispose(); });
      ghostMeshesRef.current = [];
      trailLinesRef.current.forEach(l => { sceneRef.current.remove(l); l.geometry.dispose(); (l.material as THREE.Material).dispose(); });
      trailLinesRef.current = [];

      // Render each entity
      entities.forEach(entity => {
        const meshType = entity.meshRenderer?.meshType || 'cube';

        if (meshType === 'custom') {
          renderCustomModel(entity, entities);
        } else {
          renderPrimitive(entity, meshType, colliderMap, contactGeo, contactMtl, selectedId, physicsDebug, showColliders, showVelocities, isPlaying);
        }

        // Sync animation state for this entity
        syncAnimationState(entity);

        // Terrain mesh
        if (isMain && entity.terrain) {
          let tMesh = terrainMeshMapRef.current.get(entity.id);
          if (!tMesh) {
            tMesh = state.terrainSystem.create(entity.terrain);
            terrainMeshMapRef.current.set(entity.id, tMesh);
            sceneRef.current.add(tMesh);
          }
          tMesh.position.set(entity.transform.position.x, entity.transform.position.y, entity.transform.position.z);
          tMesh.rotation.set(entity.transform.rotation.x * Math.PI / 180, entity.transform.rotation.y * Math.PI / 180, entity.transform.rotation.z * Math.PI / 180);
          tMesh.scale.set(entity.transform.scale.x, entity.transform.scale.y, entity.transform.scale.z);
        }

        // Water mesh
        if (isMain && entity.water) {
          let wMesh = waterMeshMapRef.current.get(entity.id);
          if (!wMesh) {
            wMesh = state.waterSystem.create(entity.water);
            waterMeshMapRef.current.set(entity.id, wMesh);
            sceneRef.current.add(wMesh);
          }
          wMesh.position.set(entity.transform.position.x, entity.transform.position.y, entity.transform.position.z);
          state.waterSystem.update(renderer, sceneRef.current, camera);
        }

        // Particle emitter
        if (isMain && entity.particleEmitter) {
          let pMesh = particleMeshMapRef.current.get(entity.id);
          if (!pMesh) {
            state.particleSystem.createEmitter(entity.id, entity.particleEmitter);
            pMesh = state.particleSystem.getEmitterMesh(entity.id);
            if (pMesh) { particleMeshMapRef.current.set(entity.id, pMesh); sceneRef.current.add(pMesh); }
          }
          if (pMesh) {
            pMesh.position.set(entity.transform.position.x, entity.transform.position.y, entity.transform.position.z);
          }
        }
      });

      // Contact sprites
      if (isMain && physicsDebug && showContacts && isPlaying) {
        debugContacts.forEach(contact => {
          const sprite = new THREE.Mesh(contactGeo, contactMtl);
          sprite.position.set(contact.contactPoint.x, contact.contactPoint.y, contact.contactPoint.z);
          sprite.scale.setScalar(0.5 + Math.min(contact.impulse * 0.1, 2));
          sceneRef.current.add(sprite);
          contactSpritesRef.current.push(sprite);
        });
      }

      // Temporal ghosts
      if (isMain && temporalConfig.enabled && temporalGhosts.length > 0) {
        temporalGhosts.forEach(ghost => {
          const geo = createGeometry(ghost.meshType);
          const isFuture = ghost.frameOffset > 0;
          const mat = new THREE.MeshStandardMaterial({
            color: isFuture ? '#44ffaa' : ghost.color,
            transparent: true, opacity: ghost.opacity,
            metalness: 0.3, roughness: 0.7, depthWrite: false,
            wireframe: isFuture,
          });
          const gm = new THREE.Mesh(geo, mat);
          gm.position.set(ghost.position.x, ghost.position.y, ghost.position.z);
          gm.rotation.set(ghost.rotation.x * Math.PI / 180, ghost.rotation.y * Math.PI / 180, ghost.rotation.z * Math.PI / 180);
          gm.scale.set(ghost.scale.x, ghost.scale.y, ghost.scale.z);
          gm.renderOrder = 998;
          sceneRef.current.add(gm);
          ghostMeshesRef.current.push(gm);
        });
      }

      // Trails
      if (isMain && temporalConfig.enabled && temporalConfig.showTrails && temporalEngine.getFrameCount() > 1) {
        const trailIds = selectedId ? [selectedId] : entities.filter(e => e.active && e.id !== 'ground_plane').map(e => e.id);
        trailIds.forEach(eid => {
          const trail = temporalEngine.generateTrail(eid);
          if (trail.length < 2) return;
          const points = trail.map(p => new THREE.Vector3(p.x, p.y, p.z));
          const geo = new THREE.BufferGeometry().setFromPoints(points);
          const ent = entities.find(e => e.id === eid);
          const mat = new THREE.LineBasicMaterial({ color: ent?.material.color || '#ffffff', transparent: true, opacity: 0.4 });
          const line = new THREE.Line(geo, mat);
          line.renderOrder = 997;
          sceneRef.current.add(line);
          trailLinesRef.current.push(line);
        });
      }

      // Selection box helper
      if (isMain) {
        if (boxHelperRef.current) { sceneRef.current.remove(boxHelperRef.current); boxHelperRef.current.dispose(); boxHelperRef.current = null; }
        if (selectedId) {
          const selObj = meshMap.get(selectedId);
          if (selObj) {
            const helper = new THREE.BoxHelper(selObj, 0xff8800);
            sceneRef.current.add(helper);
            boxHelperRef.current = helper;
          }
        }
        // Attach TransformControls to selected object
        if (transformRef.current && !isPlaying) {
          const selObj = selectedId ? meshMap.get(selectedId) : null;
          if (selObj) {
            transformRef.current.attach(selObj);
          } else {
            transformRef.current.detach();
          }
        } else if (transformRef.current && isPlaying) {
          transformRef.current.detach();
        }
      }

      renderer.render(sceneRef.current, camera);

      // ---- Post-Processing (CSS filter layer + Three.js tone mapping) ----
      if (isMain) {
        const pp = state.postProcess;
        // Update Three.js tone mapping exposure
        renderer.toneMappingExposure = pp.enabled ? pp.toneMappingExposure : 1.2;

        // Build CSS filter string
        let cssFilter = '';
        if (pp.enabled) {
          if (pp.saturation !== 1.0) cssFilter += `saturate(${pp.saturation}) `;
          if (pp.contrast !== 1.0)   cssFilter += `contrast(${pp.contrast}) `;
          if (pp.bloom)              cssFilter += `brightness(${1 + pp.bloomStrength * 0.3}) `;
          if (pp.filmGrain)          cssFilter += `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/><feBlend in='SourceGraphic' mode='screen'/></filter></svg>#n") `;
        }

        const canvas = renderer.domElement;
        const filterStr = cssFilter.trim() || 'none';
        if (filterStr !== lastPostProcess.current) {
          canvas.style.filter = filterStr;
          lastPostProcess.current = filterStr;
        }

        // Vignette + chromatic aberration via overlay canvas
        if (pp.enabled && (pp.vignette || pp.chromaticAberration)) {
          let overlay = ppCanvasRef.current;
          if (!overlay) {
            overlay = document.createElement('canvas');
            overlay.style.position = 'absolute';
            overlay.style.top = '0'; overlay.style.left = '0';
            overlay.style.width = '100%'; overlay.style.height = '100%';
            overlay.style.pointerEvents = 'none';
            overlay.style.zIndex = '2';
            containerRef.current?.appendChild(overlay);
            ppCanvasRef.current = overlay;
          }
          const w = renderer.domElement.width, h = renderer.domElement.height;
          if (overlay.width !== w || overlay.height !== h) { overlay.width = w; overlay.height = h; }
          const ctx2 = overlay.getContext('2d')!;
          ctx2.clearRect(0, 0, w, h);

          // Vignette
          if (pp.vignette) {
            const vr = ctx2.createRadialGradient(w/2, h/2, 0, w/2, h/2, Math.max(w,h)*0.7);
            vr.addColorStop(0, 'rgba(0,0,0,0)');
            vr.addColorStop(0.6, `rgba(0,0,0,${pp.vignetteIntensity * 0.3})`);
            vr.addColorStop(1, `rgba(0,0,0,${pp.vignetteIntensity * 0.85})`);
            ctx2.fillStyle = vr;
            ctx2.fillRect(0, 0, w, h);
          }

          // Chromatic aberration (simple RGB shift indicator)
          if (pp.chromaticAberration) {
            const shift = pp.chromaticAberrationOffset * w * 80;
            ctx2.globalCompositeOperation = 'screen';
            ctx2.fillStyle = `rgba(255,0,0,0.04)`;
            ctx2.fillRect(-shift, 0, w, h);
            ctx2.fillStyle = `rgba(0,0,255,0.04)`;
            ctx2.fillRect(shift, 0, w, h);
            ctx2.globalCompositeOperation = 'source-over';
          }
        } else if (ppCanvasRef.current) {
          const ctx2 = ppCanvasRef.current.getContext('2d')!;
          ctx2.clearRect(0, 0, ppCanvasRef.current.width, ppCanvasRef.current.height);
        }

        // ---- Sculpt wireframe overlay ----
        if (sculptConfig.enabled && selectedId && meshMap.has(selectedId)) {
          const mesh = getSculptMesh(selectedId);
          if (mesh) {
            if (sculptWireRef.current) { sceneRef.current.remove(sculptWireRef.current); sculptWireRef.current.geometry.dispose(); sculptWireRef.current = null; }
            if (sculptConfig.showWireframe) {
              sculptWireRef.current = new THREE.LineSegments(new THREE.WireframeGeometry(mesh.geometry), new THREE.LineBasicMaterial({ color: 0xff8800, transparent: true, opacity: 0.4 }));
              sculptWireRef.current.renderOrder = 999;
              sceneRef.current.add(sculptWireRef.current);
            }
          }
        } else {
          if (sculptWireRef.current) { sceneRef.current.remove(sculptWireRef.current); sculptWireRef.current.geometry.dispose(); sculptWireRef.current = null; }
        }
      }

      // FPS
      frameCount.current++;
      fpsTime.current += dt;
      if (fpsTime.current >= 0.5) {
        const fps = Math.round(frameCount.current / fpsTime.current);
        if (fpsRef.current) fpsRef.current.textContent = `${fps} FPS`;
        frameCount.current = 0; fpsTime.current = 0;
      }
    };

    // ---- Skybox updater (uses sky sphere) ----
    let lastSkyPreset: SkyboxPreset = 'none';
    function updateSkybox(preset: SkyboxPreset) {
      if (preset === lastSkyPreset) return;
      lastSkyPreset = preset;
      if (skyboxMeshRef.current) { sceneRef.current.remove(skyboxMeshRef.current); skyboxMeshRef.current.geometry.dispose(); (skyboxMeshRef.current.material as THREE.Material).dispose(); skyboxMeshRef.current = null; }
      const colors = getSkyboxColors(preset);
      if (colors) {
        renderer.setClearColor(colors.bottom);
        const skyGeo = new THREE.SphereGeometry(490, 32, 32);
        const skyMat = new THREE.ShaderMaterial({
          uniforms: { topColor: { value: new THREE.Color(colors.top) }, bottomColor: { value: new THREE.Color(colors.bottom) } },
          vertexShader: `varying vec3 vPos; void main(){ vPos=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
          fragmentShader: `uniform vec3 topColor,bottomColor; varying vec3 vPos; void main(){ float t=clamp((vPos.y+200.0)/400.0,0.0,1.0); gl_FragColor=vec4(mix(bottomColor,topColor,t),1.0); }`,
          side: THREE.BackSide,
        });
        const sky = new THREE.Mesh(skyGeo, skyMat);
        sceneRef.current.add(sky);
        skyboxMeshRef.current = sky;
        if (preset === 'night' || preset === 'space') {
          addStars();
        }
      } else {
        renderer.setClearColor(0x1a1a2e);
      }
    }

    function addStars() {
      const geo = new THREE.BufferGeometry();
      const positions = new Float32Array(3000);
      for (let i = 0; i < 3000; i += 3) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = 480;
        positions[i]   = r * Math.sin(phi) * Math.cos(theta);
        positions[i+1] = r * Math.cos(phi);
        positions[i+2] = r * Math.sin(phi) * Math.sin(theta);
      }
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const points = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.8, transparent: true, opacity: 0.8 }));
      sceneRef.current.add(points);
    }

    // ---- renderPrimitive ----
    function renderPrimitive(entity: Entity, meshType: string, colliderMap: Map<string, THREE.Mesh>, contactGeo: THREE.SphereGeometry, contactMtl: THREE.MeshBasicMaterial, selectedId: string | null, physicsDebug: boolean, showColliders: boolean, showVelocities: boolean, isPlaying: boolean) {
      const meshMap = meshMapRef.current;
      let obj = meshMap.get(entity.id) as THREE.Mesh | undefined;

      if (!obj || obj.userData.meshType !== meshType) {
        if (obj) { sceneRef.current.remove(obj); obj.geometry.dispose(); (obj.material as THREE.Material).dispose(); }
        const geo = createGeometry(meshType);
        const mat = new THREE.MeshStandardMaterial({ color: entity.material.color });
        obj = new THREE.Mesh(geo, mat);
        obj.castShadow = true; obj.receiveShadow = true;
        obj.userData.entityId = entity.id;
        obj.userData.meshType = meshType;
        sceneRef.current.add(obj);
        meshMap.set(entity.id, obj);
      }

      const p = entity.transform.position, r = entity.transform.rotation, sc = entity.transform.scale;
      obj.position.set(p.x, p.y, p.z);
      obj.rotation.set(r.x * Math.PI / 180, r.y * Math.PI / 180, r.z * Math.PI / 180);
      obj.scale.set(sc.x, sc.y, sc.z);

      const mat = obj.material as THREE.MeshStandardMaterial;
      mat.color.set(entity.material.color);
      mat.metalness = entity.material.metallic;
      mat.roughness = entity.material.roughness;
      mat.emissive.set(entity.material.emissive);
      mat.transparent = entity.material.opacity < 1;
      mat.opacity = entity.material.opacity;
      mat.wireframe = entity.material.wireframe;
      obj.visible = entity.active && (entity.meshRenderer?.visible ?? true);

      // Texture maps
      const texKey = [entity.material.diffuseMap, entity.material.normalMap, entity.material.roughnessMap, entity.material.metalnessMap, entity.material.emissiveMap].join('|');
      const prevKey = texVersionRef.current.get(entity.id);
      if (texKey !== prevKey) {
        applyTexture(mat, 'map', entity.material.diffuseMap);
        applyTexture(mat, 'normalMap', entity.material.normalMap);
        applyTexture(mat, 'roughnessMap', entity.material.roughnessMap);
        applyTexture(mat, 'metalnessMap', entity.material.metalnessMap);
        applyTexture(mat, 'emissiveMap', entity.material.emissiveMap);
        texVersionRef.current.set(entity.id, texKey);
      }

      // Collider wireframes
      if (isMain && physicsDebug && showColliders && entity.collider && entity.active) {
        let cwire = colliderMap.get(entity.id);
        const col = entity.collider;
        const isSelected = entity.id === selectedId;
        const matToUse = col.isTrigger
          ? new THREE.MeshBasicMaterial({ color: 0xff44ff, wireframe: true, transparent: true, opacity: 0.25, depthWrite: false })
          : isSelected ? colliderMatSelected.current : colliderMat.current;
        const shapeKey = `${col.shape}_${col.size.x}_${col.size.y}_${col.size.z}_${col.radius}_${col.height}`;
        if (!cwire || cwire.userData.shapeKey !== shapeKey) {
          if (cwire) { sceneRef.current.remove(cwire); cwire.geometry.dispose(); }
          let geo: THREE.BufferGeometry;
          if (col.shape === 'sphere') geo = new THREE.SphereGeometry(col.radius, 16, 12);
          else if (col.shape === 'capsule') geo = new THREE.CapsuleGeometry(col.radius, col.height, 8, 16);
          else geo = new THREE.BoxGeometry(col.size.x, col.size.y, col.size.z);
          cwire = new THREE.Mesh(geo, matToUse);
          cwire.userData.shapeKey = shapeKey; cwire.renderOrder = 999;
          sceneRef.current.add(cwire); colliderMap.set(entity.id, cwire);
        } else { cwire.material = matToUse; }
        cwire.position.set(p.x + col.center.x, p.y + col.center.y, p.z + col.center.z);
        cwire.rotation.copy(obj.rotation);
        cwire.visible = col.showWireframe;
      } else {
        const cwire = colliderMap.get(entity.id);
        if (cwire) cwire.visible = false;
      }

      // Velocity arrows
      if (isMain && physicsDebug && showVelocities && isPlaying && entity.rigidbody && entity.active) {
        const vel = entity.rigidbody.velocity;
        const speed = Math.sqrt(vel.x * vel.x + vel.y * vel.y + vel.z * vel.z);
        if (speed > 0.1) {
          const arrow = new THREE.ArrowHelper(
            new THREE.Vector3(vel.x, vel.y, vel.z).normalize(),
            new THREE.Vector3(p.x, p.y, p.z),
            Math.min(speed * 0.3, 3), 0x00ccff, 0.15, 0.08
          );
          sceneRef.current.add(arrow);
          velocityArrowsRef.current.push(arrow);
        }
      }
    }

    // ---- renderCustomModel ----
    function renderCustomModel(entity: Entity, _entities: Entity[]) {
      const meshMap = meshMapRef.current;
      const cacheKey = getModelCacheKey(entity);
      if (!cacheKey) return;

      if (meshMap.has(entity.id)) {
        // Already loaded — just sync transform
        const obj = meshMap.get(entity.id)!;
        const p = entity.transform.position, r = entity.transform.rotation, sc = entity.transform.scale;
        obj.position.set(p.x, p.y, p.z);
        obj.rotation.set(r.x * Math.PI / 180, r.y * Math.PI / 180, r.z * Math.PI / 180);
        obj.scale.set(sc.x, sc.y, sc.z);
        obj.visible = entity.active && (entity.meshRenderer?.visible ?? true);
        return;
      }

      if (loadingRef.current.has(entity.id)) return;
      loadingRef.current.add(entity.id);

      loadModel(entity).then(loaded => {
        loadingRef.current.delete(entity.id);
        if (!loaded) return;

        // Clone so each entity gets its own instance
        const cloned = loaded.group.clone(true);
        cloned.userData.entityId = entity.id;
        cloned.userData.meshType = 'custom';

        // Enable shadows on all child meshes
        cloned.traverse(child => {
          if ((child as THREE.Mesh).isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        const p = entity.transform.position, r = entity.transform.rotation, sc = entity.transform.scale;
        cloned.position.set(p.x, p.y, p.z);
        cloned.rotation.set(r.x * Math.PI / 180, r.y * Math.PI / 180, r.z * Math.PI / 180);
        cloned.scale.set(sc.x, sc.y, sc.z);

        sceneRef.current.add(cloned);
        meshMapRef.current.set(entity.id, cloned);

        // Set up AnimationMixer if the model has clips
        if (loaded.clips.length > 0) {
          const mixer = new THREE.AnimationMixer(cloned);
          mixerMap.set(entity.id, mixer);

          // Update clip list in store
          const clipRefs = loaded.clips.map(c => ({ name: c.name, duration: c.duration }));
          useEngineStore.getState().updateAnimation(entity.id, {
            clips: clipRefs,
            activeClip: entity.animation?.activeClip || clipRefs[0]?.name || null,
          });

          // Auto-play first clip if component says playing
          if (entity.animation?.playing && entity.animation.activeClip) {
            const clip = loaded.clips.find(c => c.name === entity.animation!.activeClip);
            if (clip) {
              const action = mixer.clipAction(clip);
              action.setLoop(entity.animation.loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
              action.timeScale = entity.animation.speed;
              action.play();
              actionMap.set(entity.id, action);
            }
          }
        }

        useEngineStore.getState().log(`🎭 Model loaded: ${entity.name}`);
      });
    }

    // ---- syncAnimationState ----
    function syncAnimationState(entity: Entity) {
      const anim = entity.animation;
      if (!anim) return;
      const mixer = mixerMap.get(entity.id);
      if (!mixer) return;

      const cacheKey = getModelCacheKey(entity);
      const loaded = cacheKey ? modelCache.get(cacheKey) : null;
      if (!loaded) return;

      const clip = anim.activeClip ? loaded.clips.find(c => c.name === anim.activeClip) : null;
      const existingAction = actionMap.get(entity.id);

      // Clip changed or state changed
      if (clip) {
        const action = mixer.clipAction(clip);
        action.setLoop(anim.loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
        action.timeScale = anim.speed;

        if (anim.playing && !action.isRunning()) {
          mixer.stopAllAction();
          action.play();
          actionMap.set(entity.id, action);
        } else if (!anim.playing && action.isRunning()) {
          action.paused = true;
        } else if (anim.playing && action.paused) {
          action.paused = false;
        }
      } else if (!anim.playing && existingAction) {
        existingAction.stop();
        actionMap.set(entity.id, null);
      }
    }

    animate();

    if (isMain) useEngineStore.getState().log('KEVLA Engine v1.1 — GLTF/OBJ import, AnimationMixer, TransformControls, Skybox enabled');

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      renderer.dispose();
      meshMapRef.current.forEach(obj => {
        sceneRef.current.remove(obj);
        if (obj instanceof THREE.Mesh) { obj.geometry.dispose(); (obj.material as THREE.Material).dispose(); }
      });
      meshMapRef.current.clear();
      colliderMapRef.current.forEach(m => m.geometry.dispose());
      colliderMapRef.current.clear();
      ghostMeshesRef.current.forEach(m => { m.geometry.dispose(); (m.material as THREE.Material).dispose(); });
      trailLinesRef.current.forEach(l => { l.geometry.dispose(); (l.material as THREE.Material).dispose(); });
      terrainMeshMapRef.current.forEach(m => { m.geometry.dispose(); (m.material as THREE.Material).dispose(); });
      terrainMeshMapRef.current.clear();
      waterMeshMapRef.current.forEach(m => { m.geometry.dispose(); (m.material as THREE.Material).dispose(); });
      waterMeshMapRef.current.clear();
      particleMeshMapRef.current.forEach(m => { m.geometry.dispose(); (m.material as THREE.Material).dispose(); });
      particleMeshMapRef.current.clear();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
  }, []);

  // ---- Click to select ----
  const handleClick = useCallback((e: React.MouseEvent) => {
    if (!isMain) return;
    const container = containerRef.current;
    const camera = cameraRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    const candidates: THREE.Object3D[] = [];
    meshMapRef.current.forEach(obj => {
      candidates.push(obj);
      obj.traverse(child => { if (child !== obj) candidates.push(child); });
    });
    const intersects = raycaster.intersectObjects(candidates, true);
    if (intersects.length > 0) {
      let hit = intersects[0].object;
      // Walk up to find the entity root
      while (hit && !hit.userData.entityId && hit.parent) hit = hit.parent;
      if (hit?.userData.entityId) {
        useEngineStore.getState().selectEntity(hit.userData.entityId);
        return;
      }
    }
    useEngineStore.getState().selectEntity(null);
  }, [isMain]);

  return (
    <div className="kv-viewport-instance" style={realityColor ? { borderColor: realityColor + '44' } : {}}>
      <div ref={containerRef} className="kv-viewport-canvas" onClick={handleClick} />

      {realityLabel && (
        <div className="kv-reality-label" style={{ backgroundColor: realityColor || '#61afef' }}>
          <span className="kv-reality-letter">{realityLabel}</span>
        </div>
      )}

      {realityId && (
        <div className="kv-reality-info" style={{ borderColor: realityColor || '#61afef' }}>
          <span className="kv-reality-name">{realityLabel}</span>
          {divergence !== undefined && divergence > 0 && (
            <span className="kv-reality-divergence" style={{
              color: divergence > 50 ? '#e06c75' : divergence > 20 ? '#e5c07b' : '#98c379'
            }}>
              Δ {divergence.toFixed(1)}%
            </span>
          )}
        </div>
      )}

      {isMain && (
        <div className="kv-viewport-hud kv-hud-tr">
          <div ref={fpsRef} className="kv-hud-item kv-hud-fps">0 FPS</div>
        </div>
      )}

      {isMain && (
        <div className="kv-viewport-hud kv-hud-bl" style={{ display:'flex', gap:'4px', padding:'4px 8px' }}>
          <button className="kv-hud-item kv-hud-gizmo" title="Translate (W)"
            onClick={() => transformRef.current?.setMode('translate')} style={{ cursor:'pointer' }}>W ↔</button>
          <button className="kv-hud-item kv-hud-gizmo" title="Rotate (E)"
            onClick={() => transformRef.current?.setMode('rotate')} style={{ cursor:'pointer' }}>E ↻</button>
          <button className="kv-hud-item kv-hud-gizmo" title="Scale (R)"
            onClick={() => transformRef.current?.setMode('scale')} style={{ cursor:'pointer' }}>R ⤢</button>
        </div>
      )}

      <div className="kv-viewport-hud kv-hud-tl">
        <div className="kv-hud-item kv-hud-scene">{isMain ? 'Scene' : realityLabel}</div>
      </div>
    </div>
  );
}

// ---- Main Viewport ----
export default function Viewport() {
  const isPlaying      = useEngineStore(s => s.isPlaying);
  const isScrubbing    = useEngineStore(s => s.temporalEngine.isScrubbing);
  const parallelEnabled = useEngineStore(s => s.parallelEnabled);
  const parallelViewMode = useEngineStore(s => s.parallelViewMode);
  const parallelEngine = useEngineStore(s => s.parallelEngine);

  if (!parallelEnabled || parallelViewMode === 'single' || parallelEngine.realities.length === 0) {
    return (
      <div className="kv-viewport-wrap">
        <ViewportInstance isMain />
        {isPlaying && !isScrubbing && (
          <div className="kv-viewport-play-border"><div className="kv-play-indicator">▶ PLAYING</div></div>
        )}
        {isScrubbing && (
          <div className="kv-viewport-scrub-border"><div className="kv-scrub-indicator">⏱ SCRUBBING</div></div>
        )}
      </div>
    );
  }

  const visibleRealities = parallelEngine.getVisibleRealities();
  const { cols, rows } = parallelEngine.getGridDimensions();

  return (
    <div className="kv-viewport-wrap kv-parallel-active">
      <div className="kv-parallel-grid" style={{
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gridTemplateRows: `repeat(${rows}, 1fr)`,
      }}>
        <div className="kv-parallel-cell kv-parallel-main">
          <ViewportInstance isMain realityLabel="Main" realityColor="#61afef" />
          <div className="kv-parallel-badge main">
            <Icon name="diamond" size={8} color="#61afef" />
            <span>Main Scene</span>
          </div>
        </div>

        {visibleRealities.map((reality, i) => {
          if (i >= cols * rows - 1) return null;
          return (
            <div key={reality.id} className="kv-parallel-cell">
              <ViewportInstance
                realityId={reality.id}
                realityLabel={reality.name}
                realityColor={reality.color}
                divergence={reality.divergence.divergencePercentage}
              />
              <div className="kv-parallel-badge" style={{ borderColor: reality.color }}>
                <span className="kv-par-dot" style={{ backgroundColor: reality.color }} />
                <span>{reality.name}</span>
                {reality.overrides.gravity && (
                  <span className="kv-par-detail">g={reality.overrides.gravity.y}</span>
                )}
                {reality.overrides.timeScale && reality.overrides.timeScale !== 1 && (
                  <span className="kv-par-detail">{reality.overrides.timeScale}×</span>
                )}
                <button className="kv-par-promote" onClick={() => useEngineStore.getState().parallelPromoteReality(reality.id)} title="Promote to main">
                  <Icon name="promote" size={10} />
                </button>
                <button className="kv-par-remove" onClick={() => useEngineStore.getState().parallelRemoveReality(reality.id)} title="Remove">
                  <Icon name="x" size={9} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {isPlaying && (
        <div className="kv-viewport-play-border parallel"><div className="kv-play-indicator">▶ PARALLEL MODE</div></div>
      )}
    </div>
  );
}
