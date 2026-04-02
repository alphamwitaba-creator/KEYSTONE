// ============================================================
// KEVLA ENGINE — Inspector Panel v2.0
// NEW: AudioSource editor, AnimStateMachine editor,
//      PostProcess settings, Prefab creation
// ============================================================

import { useState, useRef } from 'react';
import { useEngineStore } from '../engine/store';
import { type MeshType, type Vector3, type ColliderShapeType, type AnimStateMachine, type AnimState, type AnimTransition, createDefaultStateMachine, type TerrainConfig, type WaterConfig, type ParticleEmitter, type CharacterControllerComponent, type VehicleComponent, type RagdollComponent, type SoftBodyComponent } from '../engine/types';
import { LUA_PRESETS } from '../engine/lua';
import { Icon, MeshIcon } from './Icons';

function Vec3Input({ label, value, onChange, step = 0.1 }: { label: string; value: Vector3; onChange: (axis: 'x'|'y'|'z', val: number) => void; step?: number }) {
  const colors = ['#e06c75','#98c379','#61afef'];
  return (
    <div className="kv-vec3">
      <span className="kv-vec3-label">{label}</span>
      <div className="kv-vec3-inputs">
        {(['x','y','z'] as const).map((axis, i) => (
          <label key={axis} className="kv-vec3-field">
            <span style={{ color: colors[i] }}>{axis.toUpperCase()}</span>
            <input type="number" step={step} value={Number(value[axis].toFixed(3))} onChange={e => onChange(axis, parseFloat(e.target.value)||0)} />
          </label>
        ))}
      </div>
    </div>
  );
}

function Section({ title, icon, defaultOpen = true, onRemove, badge, children }: { title: string; icon?: string; defaultOpen?: boolean; onRemove?: () => void; badge?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="kv-section">
      <div className="kv-section-header" onClick={() => setOpen(!open)}>
        <div className="kv-section-left">
          <Icon name={open ? 'chevronDown' : 'chevronRight'} size={10} />
          {icon && <Icon name={icon} size={13} />}
          <span>{title}</span>
          {badge && <span className="kv-section-badge">{badge}</span>}
        </div>
        {onRemove && <button className="kv-section-remove" onClick={e => { e.stopPropagation(); onRemove(); }}><Icon name="x" size={10} /></button>}
      </div>
      {open && <div className="kv-section-body">{children}</div>}
    </div>
  );
}

function Slider({ label, value, onChange, min = 0, max = 1, step = 0.01 }: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number }) {
  return (
    <div className="kv-slider">
      <span className="kv-slider-label">{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(parseFloat(e.target.value))} />
      <span className="kv-slider-val">{value.toFixed(2)}</span>
    </div>
  );
}

function CheckRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="kv-field">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
    </div>
  );
}

function TextureSlot({ label, value, onChange }: { label: string; value: string|undefined; onChange: (v: string|undefined) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="kv-field kv-tex-slot">
      <span>{label}</span>
      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
        {value && <img src={value} alt="" style={{ width:28, height:28, borderRadius:4, objectFit:'cover', border:'1px solid #444' }} />}
        <button className="kv-icon-btn-sm" onClick={() => inputRef.current?.click()}>{value ? <Icon name="settings" size={11}/> : <Icon name="plus" size={11}/>}</button>
        {value && <button className="kv-icon-btn-sm kv-delete-btn" onClick={() => onChange(undefined)}><Icon name="x" size={11}/></button>}
        <input ref={inputRef} type="file" accept="image/*" style={{ display:'none' }} onChange={e => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = () => onChange(r.result as string); r.readAsDataURL(f); }} />
      </div>
    </div>
  );
}

function LuaScriptEditor({ entityId, scriptIndex, script }: { entityId: string; scriptIndex: number; script: { name: string; code: string; enabled: boolean } }) {
  const updateScript = useEngineStore(s => s.updateScript);
  const removeScript = useEngineStore(s => s.removeScript);
  const luaVM = useEngineStore(s => s.luaVM);
  const scriptErrors = useEngineStore(s => s.scriptErrors);
  const isPlaying = useEngineStore(s => s.isPlaying);
  const [showTranspiled, setShowTranspiled] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const scriptInfo = luaVM.getScriptInfo(entityId, scriptIndex);
  const errorKey = `${entityId}_${scriptIndex}`;
  const runtimeError = scriptErrors.get(errorKey);
  const hasError = !!scriptInfo?.compileError || !!runtimeError;
  const lineCount = script.code.split('\n').length;
  return (
    <div className={`kv-script-editor ${hasError ? 'has-error' : ''}`}>
      <div className="kv-script-header">
        <input type="checkbox" checked={script.enabled} onChange={e => updateScript(entityId, scriptIndex, { enabled: e.target.checked })} />
        <span className="kv-lua-badge">LUA</span>
        <input className="kv-script-name" value={script.name} onChange={e => updateScript(entityId, scriptIndex, { name: e.target.value })} />
        <div className="kv-script-actions">
          {isPlaying && scriptInfo && !hasError && <span className="kv-script-running" title="Running">●</span>}
          {hasError && <Icon name="warn" size={12} color="#ff6666" />}
          <button className="kv-icon-btn-sm" onClick={() => setShowPresets(!showPresets)} title="Presets"><Icon name="menu" size={11}/></button>
          <button className="kv-icon-btn-sm" onClick={() => setShowTranspiled(!showTranspiled)} title="Transpiled JS"><Icon name="search" size={11}/></button>
          <button className="kv-icon-btn-sm kv-delete-btn" onClick={() => removeScript(entityId, scriptIndex)}><Icon name="x" size={11}/></button>
        </div>
      </div>
      {showPresets && (
        <div className="kv-presets-list">
          {Object.entries(LUA_PRESETS).map(([key, preset]) => (
            <button key={key} className="kv-preset-item" onClick={() => { updateScript(entityId, scriptIndex, { name: preset.name, code: preset.code }); setShowPresets(false); }}>
              <span className="kv-preset-name">{preset.name}</span>
              <span className="kv-preset-desc">{preset.description}</span>
            </button>
          ))}
        </div>
      )}
      <div className="kv-code-editor">
        <div className="kv-line-numbers">{Array.from({ length: lineCount }, (_, i) => <div key={i} className="kv-line-num">{i+1}</div>)}</div>
        <textarea className="kv-code-textarea" value={script.code} onChange={e => updateScript(entityId, scriptIndex, { code: e.target.value })} spellCheck={false} rows={Math.min(Math.max(lineCount,5),18)} placeholder="-- Write Lua code..." />
      </div>
      {scriptInfo?.compileError && <div className="kv-script-error"><Icon name="error" size={11}/> Compile: {scriptInfo.compileError}</div>}
      {runtimeError && !scriptInfo?.compileError && <div className="kv-script-error kv-runtime"><Icon name="warn" size={11}/> Runtime: {runtimeError}</div>}
      {showTranspiled && scriptInfo?.transpiledCode && <div className="kv-transpiled"><div className="kv-transpiled-title">Transpiled JS</div><pre className="kv-transpiled-code">{scriptInfo.transpiledCode}</pre></div>}
      <div className="kv-script-footer">
        <span>{lineCount} lines</span>
        {scriptInfo?.hasStart && <span className="kv-lifecycle-tag start">Start</span>}
        {scriptInfo?.hasUpdate && <span className="kv-lifecycle-tag update">Update</span>}
        {scriptInfo?.hasOnCollision && <span className="kv-lifecycle-tag collision">OnCol</span>}
      </div>
    </div>
  );
}

function AudioSourceEditor({ entityId }: { entityId: string }) {
  const entity = useEngineStore(s => s.entities.find(e => e.id === entityId));
  const assets = useEngineStore(s => s.assets);
  const updateAudioSource = useEngineStore(s => s.updateAudioSource);
  const removeAudioSource = useEngineStore(s => s.removeAudioSource);
  const playAudioSource = useEngineStore(s => s.playAudioSource);
  const stopAudioSource = useEngineStore(s => s.stopAudioSource);
  const masterVolume = useEngineStore(s => s.masterVolume);
  const setMasterVolume = useEngineStore(s => s.setMasterVolume);
  const src = entity?.audioSource;
  if (!src) return null;
  const audioAssets = assets.filter(a => a.type === 'audio');
  return (
    <Section title="Audio Source" icon="script" badge={src.assetId ? '♪' : '—'} onRemove={() => removeAudioSource(entityId)}>
      <div className="kv-field">
        <span>Clip</span>
        <select value={src.assetId||''} onChange={e => updateAudioSource(entityId, { assetId: e.target.value||null })}>
          <option value="">— None —</option>
          {audioAssets.map(a => <option key={a.id} value={a.id}>{a.name}.{a.format}</option>)}
        </select>
      </div>
      {audioAssets.length === 0 && <div style={{ fontSize:11, color:'#666', padding:'2px 0' }}>Import an audio file (.mp3, .ogg, .wav) via Asset Browser</div>}
      <Slider label="Volume" value={src.volume} onChange={v => updateAudioSource(entityId, { volume: v })} />
      <Slider label="Pitch" value={src.pitch} onChange={v => updateAudioSource(entityId, { pitch: v })} min={0.1} max={4} />
      <CheckRow label="Loop" checked={src.loop} onChange={v => updateAudioSource(entityId, { loop: v })} />
      <CheckRow label="Play On Awake" checked={src.playOnAwake} onChange={v => updateAudioSource(entityId, { playOnAwake: v })} />
      <CheckRow label="3D Spatial" checked={src.is3D} onChange={v => updateAudioSource(entityId, { is3D: v })} />
      {src.is3D && <>
        <Slider label="Min Distance" value={src.minDistance} onChange={v => updateAudioSource(entityId, { minDistance: v })} min={0.1} max={50} />
        <Slider label="Max Distance" value={src.maxDistance} onChange={v => updateAudioSource(entityId, { maxDistance: v })} min={1} max={200} />
      </>}
      <CheckRow label="Muted" checked={src.muted} onChange={v => updateAudioSource(entityId, { muted: v })} />
      <div className="kv-subsection-title">Master Volume</div>
      <Slider label="Master" value={masterVolume} onChange={setMasterVolume} />
      <div style={{ display:'flex', gap:6, marginTop:4 }}>
        <button className="kv-icon-btn-sm" style={{ padding:'3px 10px', fontSize:12 }} onClick={() => playAudioSource(entityId)}>▶ Preview</button>
        <button className="kv-icon-btn-sm" style={{ padding:'3px 10px', fontSize:12 }} onClick={() => stopAudioSource(entityId)}>■ Stop</button>
      </div>
    </Section>
  );
}

function AnimStateMachineEditor({ entityId }: { entityId: string }) {
  const entity = useEngineStore(s => s.entities.find(e => e.id === entityId));
  const updateAnimStateMachine = useEngineStore(s => s.updateAnimStateMachine);
  const removeAnimStateMachine = useEngineStore(s => s.removeAnimStateMachine);
  const sm = entity?.animStateMachine;
  if (!sm) return null;
  const [newStateName, setNewStateName] = useState('');
  const [newParamName, setNewParamName] = useState('');
  const [newParamType, setNewParamType] = useState<'bool'|'float'|'trigger'|'int'>('bool');
  const addState = () => {
    if (!newStateName.trim()) return;
    const isDefault = sm.states.length === 0;
    const s: AnimState = { name: newStateName.trim(), clip: null, speed: 1, loop: true, isDefault };
    updateAnimStateMachine(entityId, { ...sm, states: [...sm.states, s], currentState: isDefault ? s.name : sm.currentState });
    setNewStateName('');
  };
  const addParam = () => {
    if (!newParamName.trim()) return;
    const defVal: boolean|number = newParamType==='bool'||newParamType==='trigger' ? false : 0;
    updateAnimStateMachine(entityId, { ...sm, parameters: [...sm.parameters, { name: newParamName.trim(), type: newParamType, value: defVal }] });
    setNewParamName('');
  };
  const addTransition = (from: string, to: string) => {
    const t: AnimTransition = { id: `tr_${Date.now()}`, fromState: from, toState: to, conditions: [], hasExitTime: false, exitTime: null, transitionDuration: 0.15 };
    updateAnimStateMachine(entityId, { ...sm, transitions: [...sm.transitions, t] });
  };
  return (
    <Section title="Anim State Machine" icon="script" badge={sm.currentState||'—'} onRemove={() => removeAnimStateMachine(entityId)}>
      <div className="kv-subsection-title">Current State: <span style={{ color:'#61afef' }}>{sm.currentState||'None'}</span></div>

      <div className="kv-subsection-title">States</div>
      {sm.states.map(state => (
        <div key={state.name} className="kv-field" style={{ background: state.name===sm.currentState?'rgba(97,175,239,0.08)':'transparent', borderRadius:4, padding:'2px 4px' }}>
          <span style={{ color: state.isDefault?'#e5c07b':'inherit' }}>{state.name}{state.isDefault?' (default)':''}</span>
          <select value={state.clip||''} onChange={e => updateAnimStateMachine(entityId, { ...sm, states: sm.states.map(s => s.name===state.name ? { ...s, clip: e.target.value||null } : s) })} style={{ maxWidth:100 }}>
            <option value="">— no clip —</option>
            {entity?.animation?.clips.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
          </select>
          <button className="kv-icon-btn-sm kv-delete-btn" onClick={() => updateAnimStateMachine(entityId, { ...sm, states: sm.states.filter(s => s.name!==state.name) })}><Icon name="x" size={10}/></button>
        </div>
      ))}
      <div style={{ display:'flex', gap:4, marginTop:4 }}>
        <input className="kv-rename-input" value={newStateName} onChange={e => setNewStateName(e.target.value)} placeholder="State name" onKeyDown={e => e.key==='Enter'&&addState()} style={{ flex:1 }} />
        <button className="kv-icon-btn-sm" onClick={addState}><Icon name="plus" size={11}/></button>
      </div>

      <div className="kv-subsection-title">Transitions</div>
      {sm.transitions.map(t => (
        <div key={t.id} className="kv-field" style={{ fontSize:11 }}>
          <span>{t.fromState==='*'?'Any':t.fromState} → {t.toState}</span>
          <button className="kv-icon-btn-sm kv-delete-btn" onClick={() => updateAnimStateMachine(entityId, { ...sm, transitions: sm.transitions.filter(tr => tr.id!==t.id) })}><Icon name="x" size={10}/></button>
        </div>
      ))}
      {sm.states.length >= 2 && (
        <div style={{ display:'flex', gap:4, marginTop:4, flexWrap:'wrap' }}>
          {sm.states.map(from => sm.states.filter(to => to.name!==from.name).map(to => (
            <button key={`${from.name}-${to.name}`} className="kv-icon-btn-sm" style={{ fontSize:10, padding:'2px 5px' }}
              onClick={() => addTransition(from.name, to.name)} title={`Add ${from.name}→${to.name}`}>
              {from.name.slice(0,4)}→{to.name.slice(0,4)}
            </button>
          )))}
        </div>
      )}

      <div className="kv-subsection-title">Parameters</div>
      {sm.parameters.map(p => (
        <div key={p.name} className="kv-field">
          <span style={{ fontSize:11 }}>{p.name} <span style={{ color:'#666' }}>({p.type})</span></span>
          {p.type==='bool'||p.type==='trigger'
            ? <input type="checkbox" checked={!!p.value} onChange={e => updateAnimStateMachine(entityId, { ...sm, parameters: sm.parameters.map(pp => pp.name===p.name ? { ...pp, value: e.target.checked } : pp) })} />
            : <input type="number" value={p.value as number} style={{ width:60 }} onChange={e => updateAnimStateMachine(entityId, { ...sm, parameters: sm.parameters.map(pp => pp.name===p.name ? { ...pp, value: parseFloat(e.target.value)||0 } : pp) })} />
          }
          <button className="kv-icon-btn-sm kv-delete-btn" onClick={() => updateAnimStateMachine(entityId, { ...sm, parameters: sm.parameters.filter(pp => pp.name!==p.name) })}><Icon name="x" size={10}/></button>
        </div>
      ))}
      <div style={{ display:'flex', gap:4, marginTop:4 }}>
        <input className="kv-rename-input" value={newParamName} onChange={e => setNewParamName(e.target.value)} placeholder="Param name" style={{ flex:1 }} onKeyDown={e => e.key==='Enter'&&addParam()} />
        <select value={newParamType} onChange={e => setNewParamType(e.target.value as any)} style={{ width:65 }}>
          <option value="bool">bool</option><option value="float">float</option><option value="trigger">trigger</option><option value="int">int</option>
        </select>
        <button className="kv-icon-btn-sm" onClick={addParam}><Icon name="plus" size={11}/></button>
      </div>
    </Section>
  );
}

function PostProcessEditor() {
  const postProcess = useEngineStore(s => s.postProcess);
  const updatePostProcess = useEngineStore(s => s.updatePostProcess);
  const [open, setOpen] = useState(false);
  return (
    <div className="kv-section">
      <div className="kv-section-header" onClick={() => setOpen(!open)}>
        <div className="kv-section-left">
          <Icon name={open?'chevronDown':'chevronRight'} size={10} />
          <Icon name="settings" size={13} />
          <span>Post-Processing</span>
          <span className="kv-section-badge" style={{ background: postProcess.enabled?'#98c379':'#555' }}>{postProcess.enabled?'ON':'OFF'}</span>
        </div>
      </div>
      {open && (
        <div className="kv-section-body">
          <CheckRow label="Enable Post-Processing" checked={postProcess.enabled} onChange={v => updatePostProcess({ enabled: v })} />
          {postProcess.enabled && <>
            <div className="kv-subsection-title">Bloom</div>
            <CheckRow label="Bloom" checked={postProcess.bloom} onChange={v => updatePostProcess({ bloom: v })} />
            {postProcess.bloom && <>
              <Slider label="Strength" value={postProcess.bloomStrength} onChange={v => updatePostProcess({ bloomStrength: v })} min={0} max={3} />
              <Slider label="Threshold" value={postProcess.bloomThreshold} onChange={v => updatePostProcess({ bloomThreshold: v })} />
              <Slider label="Radius" value={postProcess.bloomRadius} onChange={v => updatePostProcess({ bloomRadius: v })} />
            </>}
            <div className="kv-subsection-title">Lens</div>
            <CheckRow label="Vignette" checked={postProcess.vignette} onChange={v => updatePostProcess({ vignette: v })} />
            {postProcess.vignette && <Slider label="Intensity" value={postProcess.vignetteIntensity} onChange={v => updatePostProcess({ vignetteIntensity: v })} />}
            <CheckRow label="Chromatic Aberration" checked={postProcess.chromaticAberration} onChange={v => updatePostProcess({ chromaticAberration: v })} />
            {postProcess.chromaticAberration && <Slider label="Offset" value={postProcess.chromaticAberrationOffset} onChange={v => updatePostProcess({ chromaticAberrationOffset: v })} min={0} max={0.05} step={0.001} />}
            <CheckRow label="Film Grain" checked={postProcess.filmGrain} onChange={v => updatePostProcess({ filmGrain: v })} />
            {postProcess.filmGrain && <Slider label="Grain Intensity" value={postProcess.filmGrainIntensity} onChange={v => updatePostProcess({ filmGrainIntensity: v })} />}
            <div className="kv-subsection-title">Color Grading</div>
            <Slider label="Exposure" value={postProcess.toneMappingExposure} onChange={v => updatePostProcess({ toneMappingExposure: v })} min={0} max={4} />
            <Slider label="Saturation" value={postProcess.saturation} onChange={v => updatePostProcess({ saturation: v })} min={0} max={3} />
            <Slider label="Contrast" value={postProcess.contrast} onChange={v => updatePostProcess({ contrast: v })} min={0} max={3} />
            <div className="kv-subsection-title">Anti-aliasing</div>
            <div className="kv-field">
              <span>AA Mode</span>
              <select value={postProcess.antialiasing} onChange={e => updatePostProcess({ antialiasing: e.target.value as any })}>
                <option value="none">None</option>
                <option value="fxaa">FXAA</option>
              </select>
            </div>
          </>}
        </div>
      )}
    </div>
  );
}

export default function Inspector() {
  const entities               = useEngineStore(s => s.entities);
  const selectedId             = useEngineStore(s => s.selectedId);
  const isPlaying              = useEngineStore(s => s.isPlaying);
  const sceneSettings          = useEngineStore(s => s.sceneSettings);
  const updateTransformField   = useEngineStore(s => s.updateTransformField);
  const updateMaterial         = useEngineStore(s => s.updateMaterial);
  const setMeshType            = useEngineStore(s => s.setMeshType);
  const setMeshVisible         = useEngineStore(s => s.setMeshVisible);
  const addRigidbody           = useEngineStore(s => s.addRigidbody);
  const removeRigidbody        = useEngineStore(s => s.removeRigidbody);
  const updateRigidbody        = useEngineStore(s => s.updateRigidbody);
  const addCollider            = useEngineStore(s => s.addCollider);
  const removeCollider         = useEngineStore(s => s.removeCollider);
  const updateCollider         = useEngineStore(s => s.updateCollider);
  const setColliderShape       = useEngineStore(s => s.setColliderShape);
  const addLuaScript           = useEngineStore(s => s.addLuaScript);
  const renameEntity           = useEngineStore(s => s.renameEntity);
  const applyImpulseToEntity   = useEngineStore(s => s.applyImpulseToEntity);
  const addAnimationComponent  = useEngineStore(s => s.addAnimationComponent);
  const removeAnimationComponent = useEngineStore(s => s.removeAnimationComponent);
  const updateAnimation        = useEngineStore(s => s.updateAnimation);
  const setActiveClip          = useEngineStore(s => s.setActiveClip);
  const setAnimationPlaying    = useEngineStore(s => s.setAnimationPlaying);
  const updateSceneSettings    = useEngineStore(s => s.updateSceneSettings);
  const addAudioSource         = useEngineStore(s => s.addAudioSource);
  const addAnimStateMachine    = useEngineStore(s => s.addAnimStateMachine);
  const createPrefab           = useEngineStore(s => s.createPrefab);
  const addTerrain            = useEngineStore(s => s.addTerrain);
  const removeTerrain         = useEngineStore(s => s.removeTerrain);
  const updateTerrain         = useEngineStore(s => s.updateTerrain);
  const addWater              = useEngineStore(s => s.addWater);
  const removeWater           = useEngineStore(s => s.removeWater);
  const updateWater           = useEngineStore(s => s.updateWater);
  const addParticleEmitter    = useEngineStore(s => s.addParticleEmitter);
  const removeParticleEmitter = useEngineStore(s => s.removeParticleEmitter);
  const updateParticleEmitter = useEngineStore(s => s.updateParticleEmitter);
  const addCharacterController = useEngineStore(s => s.addCharacterController);
  const removeCharacterController = useEngineStore(s => s.removeCharacterController);
  const updateCharacterController = useEngineStore(s => s.updateCharacterController);
  const addVehicle = useEngineStore(s => s.addVehicle);
  const removeVehicle = useEngineStore(s => s.removeVehicle);
  const updateVehicle = useEngineStore(s => s.updateVehicle);
  const addRagdoll = useEngineStore(s => s.addRagdoll);
  const removeRagdoll = useEngineStore(s => s.removeRagdoll);
  const updateRagdoll = useEngineStore(s => s.updateRagdoll);
  const addSoftBody = useEngineStore(s => s.addSoftBody);
  const removeSoftBody = useEngineStore(s => s.removeSoftBody);
  const updateSoftBody = useEngineStore(s => s.updateSoftBody);

  const [showAddComponent, setShowAddComponent] = useState(false);
  const [showScriptPresets, setShowScriptPresets] = useState(false);
  const [impulseStrength, setImpulseStrength] = useState(5);
  const [showSceneSettings, setShowSceneSettings] = useState(false);

  const entity = entities.find(e => e.id === selectedId);

  if (!entity) {
    return (
      <div className="kv-panel">
        <div className="kv-panel-header"><Icon name="settings" size={12}/><span>Inspector</span></div>
        <div className="kv-panel-body">
          <div className="kv-section">
            <div className="kv-section-header" onClick={() => setShowSceneSettings(!showSceneSettings)}>
              <div className="kv-section-left">
                <Icon name={showSceneSettings?'chevronDown':'chevronRight'} size={10}/>
                <Icon name="settings" size={13}/><span>Scene Settings</span>
              </div>
            </div>
            {showSceneSettings && (
              <div className="kv-section-body">
                <div className="kv-field"><span>Skybox</span>
                  <select value={sceneSettings.skyboxPreset} onChange={e => updateSceneSettings({ skyboxPreset: e.target.value as any })}>
                    {['none','sky','night','sunset','space'].map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
                  </select>
                </div>
                <div className="kv-field"><span>Ambient Color</span>
                  <div className="kv-color-picker">
                    <input type="color" value={sceneSettings.ambientColor} onChange={e => updateSceneSettings({ ambientColor: e.target.value })}/>
                    <span className="kv-color-hex">{sceneSettings.ambientColor}</span>
                  </div>
                </div>
                <Slider label="Ambient Intensity" value={sceneSettings.ambientIntensity} onChange={v => updateSceneSettings({ ambientIntensity: v })} min={0} max={3}/>
                <CheckRow label="Fog" checked={sceneSettings.fogEnabled} onChange={v => updateSceneSettings({ fogEnabled: v })}/>
                {sceneSettings.fogEnabled && <>
                  <div className="kv-field"><span>Fog Color</span><div className="kv-color-picker"><input type="color" value={sceneSettings.fogColor} onChange={e => updateSceneSettings({ fogColor: e.target.value })}/><span className="kv-color-hex">{sceneSettings.fogColor}</span></div></div>
                  <Slider label="Fog Near" value={sceneSettings.fogNear} onChange={v => updateSceneSettings({ fogNear: v })} min={0} max={200} step={1}/>
                  <Slider label="Fog Far" value={sceneSettings.fogFar} onChange={v => updateSceneSettings({ fogFar: v })} min={1} max={500} step={1}/>
                </>}
              </div>
            )}
          </div>
          <PostProcessEditor />
          <div className="kv-panel-body kv-inspector-empty">
            <Icon name="search" size={32} color="#333"/><p>Select an entity to inspect</p>
          </div>
        </div>
      </div>
    );
  }

  const MESH_OPTIONS: MeshType[] = ['cube','sphere','cylinder','plane','cone','torus'];
  const COLLIDER_SHAPES: ColliderShapeType[] = ['box','sphere','capsule'];

  return (
    <div className="kv-panel">
      <div className="kv-panel-header"><Icon name="settings" size={12}/><span>Inspector</span></div>
      <div className="kv-panel-body">
        <div className="kv-entity-header">
          <div className="kv-entity-icon-lg"><MeshIcon type={entity.meshRenderer?.meshType||'cube'} size={20}/></div>
          <div className="kv-entity-info">
            <input className="kv-entity-name-input" value={entity.name} onChange={e => renameEntity(entity.id, e.target.value)} disabled={isPlaying}/>
            <span className="kv-entity-id">{entity.id.slice(0,16)}</span>
          </div>
          <div className="kv-entity-component-tags">
            {entity.rigidbody && <span className="kv-tag kv-tag-phys">RB</span>}
            {entity.collider && <span className="kv-tag kv-tag-col">{entity.collider.shape[0].toUpperCase()}</span>}
            {entity.animation && <span className="kv-tag kv-tag-anim">ANIM</span>}
            {entity.audioSource && <span className="kv-tag kv-tag-audio">♪</span>}
            {entity.animStateMachine && <span className="kv-tag kv-tag-anim">SM</span>}
            {entity.scripts.length > 0 && <span className="kv-tag kv-tag-lua">LUA×{entity.scripts.length}</span>}
          </div>
        </div>

        <Section title="Transform" icon="transform">
          <Vec3Input label="Position" value={entity.transform.position} onChange={(axis,val) => updateTransformField(entity.id,'position',axis,val)}/>
          <Vec3Input label="Rotation" value={entity.transform.rotation} onChange={(axis,val) => updateTransformField(entity.id,'rotation',axis,val)} step={1}/>
          <Vec3Input label="Scale" value={entity.transform.scale} onChange={(axis,val) => updateTransformField(entity.id,'scale',axis,val)}/>
        </Section>

        {entity.meshRenderer && (
          <Section title="Mesh Renderer" icon="cube">
            {entity.meshRenderer.meshType==='custom' ? (
              <div className="kv-field"><span>Model</span><span style={{ fontSize:11, color:'#98c379' }}>{entity.meshRenderer.modelAssetId?'✅ Imported':'⚠ No model'}</span></div>
            ) : (
              <div className="kv-field"><span>Mesh</span>
                <select value={entity.meshRenderer.meshType} onChange={e => setMeshType(entity.id, e.target.value as MeshType)}>
                  {MESH_OPTIONS.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
                </select>
              </div>
            )}
            <CheckRow label="Visible" checked={entity.meshRenderer.visible} onChange={v => setMeshVisible(entity.id, v)}/>
          </Section>
        )}

        <Section title="Material" icon="material">
          <div className="kv-field"><span>Color</span><div className="kv-color-picker"><input type="color" value={entity.material.color} onChange={e => updateMaterial(entity.id, { color: e.target.value })}/><span className="kv-color-hex">{entity.material.color}</span></div></div>
          <Slider label="Metallic" value={entity.material.metallic} onChange={v => updateMaterial(entity.id, { metallic: v })}/>
          <Slider label="Roughness" value={entity.material.roughness} onChange={v => updateMaterial(entity.id, { roughness: v })}/>
          <Slider label="Opacity" value={entity.material.opacity} onChange={v => updateMaterial(entity.id, { opacity: v })}/>
          <CheckRow label="Wireframe" checked={entity.material.wireframe} onChange={v => updateMaterial(entity.id, { wireframe: v })}/>
          <div className="kv-subsection-title">Texture Maps</div>
          <TextureSlot label="Diffuse" value={entity.material.diffuseMap} onChange={v => updateMaterial(entity.id, { diffuseMap: v })}/>
          <TextureSlot label="Normal" value={entity.material.normalMap} onChange={v => updateMaterial(entity.id, { normalMap: v })}/>
          <TextureSlot label="Roughness" value={entity.material.roughnessMap} onChange={v => updateMaterial(entity.id, { roughnessMap: v })}/>
          <TextureSlot label="Metalness" value={entity.material.metalnessMap} onChange={v => updateMaterial(entity.id, { metalnessMap: v })}/>
          <TextureSlot label="Emissive" value={entity.material.emissiveMap} onChange={v => updateMaterial(entity.id, { emissiveMap: v })}/>
        </Section>

        {entity.animation && (
          <Section title="Animator" icon="script" badge={entity.animation.playing?'▶':'■'} onRemove={() => removeAnimationComponent(entity.id)}>
            {entity.animation.clips.length===0 ? (
              <div style={{ fontSize:11, color:'#666', padding:'4px 0' }}>No clips. Load a GLB with embedded animations.</div>
            ) : <>
              <div className="kv-field"><span>Clip</span>
                <select value={entity.animation.activeClip||''} onChange={e => setActiveClip(entity.id, e.target.value||null)}>
                  <option value="">— None —</option>
                  {entity.animation.clips.map(c => <option key={c.name} value={c.name}>{c.name} ({c.duration.toFixed(1)}s)</option>)}
                </select>
              </div>
              <div style={{ display:'flex', gap:6, marginTop:4 }}>
                <button className="kv-icon-btn-sm" style={{ padding:'3px 10px', fontSize:13 }} onClick={() => setAnimationPlaying(entity.id, !entity.animation!.playing)}>{entity.animation.playing?'⏸ Pause':'▶ Play'}</button>
                <button className="kv-icon-btn-sm" style={{ padding:'3px 10px', fontSize:12 }} onClick={() => setAnimationPlaying(entity.id, false)}>■ Stop</button>
              </div>
              <CheckRow label="Loop" checked={entity.animation.loop} onChange={v => updateAnimation(entity.id, { loop: v })}/>
              <Slider label="Speed" value={entity.animation.speed} onChange={v => updateAnimation(entity.id, { speed: v })} min={0} max={4} step={0.05}/>
            </>}
          </Section>
        )}

        {entity.animStateMachine && <AnimStateMachineEditor entityId={entity.id}/>}
        {entity.audioSource && <AudioSourceEditor entityId={entity.id}/>}

        {entity.terrain && (
          <Section title="Terrain" icon="terrain" onRemove={() => removeTerrain(entity.id)}>
            <Slider label="Width" value={entity.terrain.width} onChange={v => updateTerrain(entity.id, { width: v })} min={10} max={500} step={1}/>
            <Slider label="Depth" value={entity.terrain.depth} onChange={v => updateTerrain(entity.id, { depth: v })} min={10} max={500} step={1}/>
            <Slider label="Height" value={entity.terrain.height} onChange={v => updateTerrain(entity.id, { height: v })} min={1} max={100} step={1}/>
            <Slider label="Resolution" value={entity.terrain.resolution} onChange={v => updateTerrain(entity.id, { resolution: Math.floor(v) })} min={32} max={512} step={1}/>
            <Slider label="Noise Scale" value={entity.terrain.noiseScale} onChange={v => updateTerrain(entity.id, { noiseScale: v })} min={0.001} max={0.1} step={0.001}/>
            <Slider label="Noise Strength" value={entity.terrain.noiseStrength} onChange={v => updateTerrain(entity.id, { noiseStrength: v })} min={0} max={50} step={0.5}/>
            <CheckRow label="Flat Shading" checked={entity.terrain.flatShading} onChange={v => updateTerrain(entity.id, { flatShading: v })}/>
          </Section>
        )}

        {entity.water && (
          <Section title="Water" icon="water" onRemove={() => removeWater(entity.id)}>
            <Slider label="Size" value={entity.water.size} onChange={v => updateWater(entity.id, { size: v })} min={5} max={500} step={1}/>
            <Slider label="Wave Height" value={entity.water.waveHeight} onChange={v => updateWater(entity.id, { waveHeight: v })} min={0} max={5} step={0.05}/>
            <Slider label="Wave Frequency" value={entity.water.waveFrequency} onChange={v => updateWater(entity.id, { waveFrequency: v })} min={0.5} max={20} step={0.1}/>
            <Slider label="Wave Speed X" value={entity.water.waveSpeed.x} onChange={v => updateWater(entity.id, { waveSpeed: { ...entity.water!.waveSpeed, x: v } })} min={0} max={5} step={0.05}/>
            <Slider label="Wave Speed Z" value={entity.water.waveSpeed.z} onChange={v => updateWater(entity.id, { waveSpeed: { ...entity.water!.waveSpeed, z: v } })} min={0} max={5} step={0.05}/>
            <div className="kv-field"><span>Color</span><div className="kv-color-picker"><input type="color" value={entity.water.waterColor} onChange={e => updateWater(entity.id, { waterColor: e.target.value })}/></div></div>
            <div className="kv-field"><span>Depth Color</span><div className="kv-color-picker"><input type="color" value={entity.water.waterDepthColor} onChange={e => updateWater(entity.id, { waterDepthColor: e.target.value })}/></div></div>
          </Section>
        )}

        {entity.particleEmitter && (
          <Section title="Particle Emitter" icon="particles" onRemove={() => removeParticleEmitter(entity.id)}>
            <Slider label="Rate" value={entity.particleEmitter.rate} onChange={v => updateParticleEmitter(entity.id, { rate: v })} min={1} max={500} step={1}/>
            <Slider label="Lifetime" value={entity.particleEmitter.startLifetime} onChange={v => updateParticleEmitter(entity.id, { startLifetime: v })} min={0.1} max={10} step={0.1}/>
            <Slider label="Start Size" value={entity.particleEmitter.startSize} onChange={v => updateParticleEmitter(entity.id, { startSize: v })} min={0.01} max={5} step={0.01}/>
            <Slider label="Speed" value={entity.particleEmitter.startSpeed} onChange={v => updateParticleEmitter(entity.id, { startSpeed: v })} min={0} max={50} step={0.5}/>
            <Slider label="Gravity" value={entity.particleEmitter.gravity} onChange={v => updateParticleEmitter(entity.id, { gravity: v })} min={-30} max={30} step={0.1}/>
            <div className="kv-field"><span>Shape</span><select value={entity.particleEmitter.shape} onChange={e => updateParticleEmitter(entity.id, { shape: e.target.value as any })}>
              <option value="box">Box</option><option value="sphere">Sphere</option><option value="cone">Cone</option><option value="circle">Circle</option>
            </select></div>
            <Slider label="Shape Radius" value={entity.particleEmitter.shapeRadius} onChange={v => updateParticleEmitter(entity.id, { shapeRadius: v })} min={0} max={20} step={0.1}/>
            <div className="kv-field"><span>Start Color</span><div className="kv-color-picker"><input type="color" value={entity.particleEmitter.startColor} onChange={e => updateParticleEmitter(entity.id, { startColor: e.target.value })}/></div></div>
            <CheckRow label="Loop" checked={entity.particleEmitter.loop} onChange={v => updateParticleEmitter(entity.id, { loop: v })}/>
          </Section>
        )}

        {entity.characterController && (
          <Section title="Character Controller" icon="rigidbody" onRemove={() => removeCharacterController(entity.id)}>
            <Slider label="Height" value={entity.characterController.height} onChange={v => updateCharacterController(entity.id, { height: v })} min={0.5} max={5} step={0.1}/>
            <Slider label="Radius" value={entity.characterController.radius} onChange={v => updateCharacterController(entity.id, { radius: v })} min={0.1} max={2} step={0.05}/>
            <Slider label="Walk Speed" value={entity.characterController.walkSpeed} onChange={v => updateCharacterController(entity.id, { walkSpeed: v })} min={0.5} max={20} step={0.5}/>
            <Slider label="Run Speed" value={entity.characterController.runSpeed} onChange={v => updateCharacterController(entity.id, { runSpeed: v })} min={1} max={30} step={0.5}/>
            <Slider label="Jump Force" value={entity.characterController.jumpForce} onChange={v => updateCharacterController(entity.id, { jumpForce: v })} min={1} max={30} step={0.5}/>
            <Slider label="Gravity" value={entity.characterController.gravity} onChange={v => updateCharacterController(entity.id, { gravity: v })} min={1} max={50} step={0.5}/>
            <CheckRow label="Is Player" checked={entity.characterController.isPlayer} onChange={v => updateCharacterController(entity.id, { isPlayer: v })}/>
          </Section>
        )}

        {entity.vehicle && (
          <Section title="Vehicle" icon="rigidbody" onRemove={() => removeVehicle(entity.id)}>
            <Slider label="Mass" value={entity.vehicle.mass} onChange={v => updateVehicle(entity.id, { mass: v })} min={100} max={10000} step={50}/>
            <Slider label="Engine Force" value={entity.vehicle.engineForce} onChange={v => updateVehicle(entity.id, { engineForce: v })} min={0} max={20000} step={100}/>
            <Slider label="Brake Force" value={entity.vehicle.brakeForce} onChange={v => updateVehicle(entity.id, { brakeForce: v })} min={0} max={10000} step={100}/>
            <Slider label="Steering Limit" value={entity.vehicle.steeringLimit} onChange={v => updateVehicle(entity.id, { steeringLimit: v })} min={0.1} max={1.5} step={0.05}/>
            <Slider label="Wheel Radius" value={entity.vehicle.wheelRadius} onChange={v => updateVehicle(entity.id, { wheelRadius: v })} min={0.1} max={2} step={0.05}/>
            <Slider label="Suspension" value={entity.vehicle.suspensionStiffness} onChange={v => updateVehicle(entity.id, { suspensionStiffness: v })} min={1} max={200} step={1}/>
            <Slider label="Damping" value={entity.vehicle.suspensionDamping} onChange={v => updateVehicle(entity.id, { suspensionDamping: v })} min={0.1} max={20} step={0.1}/>
          </Section>
        )}

        {entity.ragdoll && (
          <Section title="Ragdoll" icon="rigidbody" onRemove={() => removeRagdoll(entity.id)}>
            <CheckRow label="Enable Ragdoll" checked={entity.ragdoll.enabled} onChange={v => updateRagdoll(entity.id, { enabled: v })}/>
            <Slider label="Strength" value={entity.ragdoll.strength} onChange={v => updateRagdoll(entity.id, { strength: v })} min={0} max={10} step={0.1}/>
            <Slider label="Impact Threshold" value={entity.ragdoll.impactThreshold} onChange={v => updateRagdoll(entity.id, { impactThreshold: v })} min={0} max={200} step={1}/>
            <Slider label="Blend Factor" value={entity.ragdoll.blendFactor} onChange={v => updateRagdoll(entity.id, { blendFactor: v })} min={0} max={1} step={0.01}/>
          </Section>
        )}

        {entity.softBody && (
          <Section title="Soft Body" icon="rigidbody" onRemove={() => removeSoftBody(entity.id)}>
            <div className="kv-field"><span>Type</span><select value={entity.softBody.type} onChange={e => updateSoftBody(entity.id, { type: e.target.value as any })}>
              <option value="cloth">Cloth</option><option value="rope">Rope</option><option value="softball">Softball</option>
            </select></div>
            <Slider label="Stiffness" value={entity.softBody.stiffness} onChange={v => updateSoftBody(entity.id, { stiffness: v })} min={0} max={1} step={0.01}/>
            <Slider label="Damping" value={entity.softBody.damping} onChange={v => updateSoftBody(entity.id, { damping: v })} min={0} max={1} step={0.01}/>
            <Slider label="Mass" value={entity.softBody.mass} onChange={v => updateSoftBody(entity.id, { mass: v })} min={0.1} max={50} step={0.1}/>
          </Section>
        )}

        {entity.rigidbody && (
          <Section title="Rigidbody" icon="rigidbody" badge={entity.rigidbody.mass===0?'Static':`${entity.rigidbody.mass}kg`} onRemove={() => removeRigidbody(entity.id)}>
            <div className="kv-field"><span>Mass</span><input type="number" step={0.1} min={0} value={entity.rigidbody.mass} onChange={e => updateRigidbody(entity.id, { mass: parseFloat(e.target.value)||0, isKinematic: parseFloat(e.target.value)===0, useGravity: parseFloat(e.target.value)>0 })}/></div>
            <CheckRow label="Use Gravity" checked={entity.rigidbody.useGravity} onChange={v => updateRigidbody(entity.id, { useGravity: v })}/>
            <CheckRow label="Is Kinematic" checked={entity.rigidbody.isKinematic} onChange={v => updateRigidbody(entity.id, { isKinematic: v })}/>
            <div className="kv-subsection-title">Physics Material</div>
            <Slider label="Restitution" value={entity.rigidbody.restitution} onChange={v => updateRigidbody(entity.id, { restitution: v })}/>
            <Slider label="Friction" value={entity.rigidbody.friction} onChange={v => updateRigidbody(entity.id, { friction: v })}/>
            <div className="kv-subsection-title">Damping</div>
            <Slider label="Linear" value={entity.rigidbody.drag} onChange={v => updateRigidbody(entity.id, { drag: v })} min={0} max={5}/>
            <Slider label="Angular" value={entity.rigidbody.angularDrag} onChange={v => updateRigidbody(entity.id, { angularDrag: v })} min={0} max={5}/>
            {isPlaying && !entity.rigidbody.isKinematic && entity.rigidbody.mass>0 && (
              <div className="kv-impulse-area">
                <div className="kv-subsection-title">Apply Impulse</div>
                <div className="kv-field"><span>Force</span><input type="number" step={1} min={1} max={50} value={impulseStrength} onChange={e => setImpulseStrength(parseFloat(e.target.value)||5)}/></div>
                <div className="kv-impulse-grid">
                  <button className="kv-impulse-btn" onClick={() => applyImpulseToEntity(entity.id, { x:0, y:impulseStrength, z:0 })}>↑ Up</button>
                  <button className="kv-impulse-btn" onClick={() => applyImpulseToEntity(entity.id, { x:impulseStrength, y:0, z:0 })}>→ X</button>
                  <button className="kv-impulse-btn" onClick={() => applyImpulseToEntity(entity.id, { x:0, y:0, z:impulseStrength })}>Z →</button>
                </div>
              </div>
            )}
          </Section>
        )}

        {entity.collider && (
          <Section title={`${entity.collider.shape.charAt(0).toUpperCase()+entity.collider.shape.slice(1)} Collider`} icon="collider" badge={entity.collider.isTrigger?'Trigger':'Solid'} onRemove={() => removeCollider(entity.id)}>
            <div className="kv-field"><span>Shape</span>
              <select value={entity.collider.shape} onChange={e => setColliderShape(entity.id, e.target.value as ColliderShapeType)}>
                {COLLIDER_SHAPES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
              </select>
            </div>
            {entity.collider.shape==='box' && <Vec3Input label="Size" value={entity.collider.size} onChange={(axis,val) => updateCollider(entity.id, { size: { ...entity.collider!.size, [axis]: val } })}/>}
            {entity.collider.shape==='sphere' && <div className="kv-field"><span>Radius</span><input type="number" step={0.05} min={0.01} value={entity.collider.radius} onChange={e => updateCollider(entity.id, { radius: parseFloat(e.target.value)||0.5 })}/></div>}
            <Vec3Input label="Center" value={entity.collider.center} onChange={(axis,val) => updateCollider(entity.id, { center: { ...entity.collider!.center, [axis]: val } })}/>
            <CheckRow label="Is Trigger" checked={entity.collider.isTrigger} onChange={v => updateCollider(entity.id, { isTrigger: v })}/>
            <CheckRow label="Show Wireframe" checked={entity.collider.showWireframe} onChange={v => updateCollider(entity.id, { showWireframe: v })}/>
          </Section>
        )}

        {entity.scripts.length > 0 && (
          <Section title={`Scripts (${entity.scripts.length})`} icon="script">
            {entity.scripts.map((script, idx) => <LuaScriptEditor key={`${entity.id}_${idx}`} entityId={entity.id} scriptIndex={idx} script={script}/>)}
          </Section>
        )}

        {!isPlaying && (
          <div className="kv-add-component">
            <div style={{ display:'flex', gap:4, marginBottom:4 }}>
              <button className="kv-icon-btn-sm" style={{ fontSize:11, padding:'3px 8px' }} onClick={() => createPrefab(entity.id)} title="Save as Prefab">
                📦 Save Prefab
              </button>
            </div>
            <div className="kv-add-wrapper">
              <button className="kv-add-component-btn" onClick={() => { setShowAddComponent(!showAddComponent); setShowScriptPresets(false); }}>
                <Icon name="plus" size={13}/> Add Component
              </button>
              {showAddComponent && (
                <div className="kv-dropdown kv-component-dropdown">
                  {!entity.rigidbody && <button className="kv-dropdown-item" onClick={() => { addRigidbody(entity.id); setShowAddComponent(false); }}><Icon name="rigidbody" size={13}/><span className="kv-dropdown-label">Rigidbody</span></button>}
                  {!entity.collider && <>
                    <button className="kv-dropdown-item" onClick={() => { addCollider(entity.id,'box'); setShowAddComponent(false); }}><Icon name="collider" size={13}/><span className="kv-dropdown-label">Box Collider</span></button>
                    <button className="kv-dropdown-item" onClick={() => { addCollider(entity.id,'sphere'); setShowAddComponent(false); }}><Icon name="sphere" size={13}/><span className="kv-dropdown-label">Sphere Collider</span></button>
                  </>}
                  {!entity.animation && <button className="kv-dropdown-item" onClick={() => { addAnimationComponent(entity.id); setShowAddComponent(false); }}><Icon name="script" size={13}/><span className="kv-dropdown-label">Animator</span></button>}
                  {!entity.animStateMachine && <button className="kv-dropdown-item" onClick={() => { addAnimStateMachine(entity.id); setShowAddComponent(false); }}><Icon name="script" size={13}/><span className="kv-dropdown-label">Anim State Machine</span></button>}
                  {!entity.audioSource && <button className="kv-dropdown-item" onClick={() => { addAudioSource(entity.id); setShowAddComponent(false); }}><Icon name="script" size={13}/><span className="kv-dropdown-label">Audio Source</span></button>}
                  {!entity.terrain && <button className="kv-dropdown-item" onClick={() => { addTerrain(entity.id); setShowAddComponent(false); }}><Icon name="terrain" size={13}/><span className="kv-dropdown-label">Terrain</span></button>}
                  {!entity.water && <button className="kv-dropdown-item" onClick={() => { addWater(entity.id); setShowAddComponent(false); }}><Icon name="water" size={13}/><span className="kv-dropdown-label">Water</span></button>}
                  {!entity.particleEmitter && <button className="kv-dropdown-item" onClick={() => { addParticleEmitter(entity.id); setShowAddComponent(false); }}><Icon name="particles" size={13}/><span className="kv-dropdown-label">Particle Emitter</span></button>}
                  {!entity.characterController && <button className="kv-dropdown-item" onClick={() => { addCharacterController(entity.id); setShowAddComponent(false); }}><Icon name="rigidbody" size={13}/><span className="kv-dropdown-label">Character Controller</span></button>}
                  {!entity.vehicle && <button className="kv-dropdown-item" onClick={() => { addVehicle(entity.id); setShowAddComponent(false); }}><Icon name="rigidbody" size={13}/><span className="kv-dropdown-label">Vehicle</span></button>}
                  {!entity.ragdoll && <button className="kv-dropdown-item" onClick={() => { addRagdoll(entity.id); setShowAddComponent(false); }}><Icon name="rigidbody" size={13}/><span className="kv-dropdown-label">Ragdoll</span></button>}
                  {!entity.softBody && <button className="kv-dropdown-item" onClick={() => { addSoftBody(entity.id); setShowAddComponent(false); }}><Icon name="rigidbody" size={13}/><span className="kv-dropdown-label">Soft Body</span></button>}
                  <div className="kv-dropdown-divider"/>
                  <button className="kv-dropdown-item kv-lua-menu" onClick={() => setShowScriptPresets(!showScriptPresets)}>
                    <Icon name="script" size={13}/><span className="kv-dropdown-label">Lua Script ▸</span>
                  </button>
                  {showScriptPresets && (
                    <div className="kv-sub-dropdown">
                      {Object.entries(LUA_PRESETS).map(([key, preset]) => (
                        <button key={key} className="kv-dropdown-item" onClick={() => { addLuaScript(entity.id, key); setShowAddComponent(false); setShowScriptPresets(false); }}>
                          <span className="kv-dropdown-label">{preset.name}</span>
                          <span className="kv-dropdown-hint">{preset.description}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
