// ============================================================
// KEVLA ENGINE — Bottom Panel v2.0
// Tabs: Console, Assets, Physics, Scripts, Prefabs
// ============================================================

import { useEffect, useRef, useState } from 'react';
import { useEngineStore } from '../engine/store';
import { Icon } from './Icons';
import SculptPanel from './SculptPanel';

// ---- Console ----
function Console() {
  const messages = useEngineStore(s => s.consoleMessages);
  const clearConsole = useEngineStore(s => s.clearConsole);
  const [filter, setFilter] = useState<'all'|'log'|'warn'|'error'>('all');
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages]);
  const filtered = filter === 'all' ? messages : messages.filter(m => m.type === filter);
  const counts = { log: messages.filter(m => m.type==='log'||m.type==='info').length, warn: messages.filter(m => m.type==='warn').length, error: messages.filter(m => m.type==='error').length };
  return (
    <div className="kv-console">
      <div className="kv-console-toolbar">
        <button className="kv-console-clear" onClick={clearConsole}><Icon name="trash" size={11}/> Clear</button>
        <div className="kv-console-filters">
          {(['all','log','warn','error'] as const).map(f => (
            <button key={f} className={`kv-filter-btn ${filter===f?'active':''}`} onClick={() => setFilter(f)}>
              {f==='all'?<Icon name="list" size={10}/>:f==='log'?<Icon name="info" size={10}/>:f==='warn'?<Icon name="warn" size={10}/>:<Icon name="error" size={10}/>}
              <span>{f==='all'?`All (${messages.length})`:`${f.charAt(0).toUpperCase()+f.slice(1)} (${counts[f as keyof typeof counts]})`}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="kv-console-messages" ref={scrollRef}>
        {filtered.length === 0 && <div className="kv-console-empty">No messages</div>}
        {filtered.map(msg => (
          <div key={msg.id} className={`kv-console-msg kv-msg-${msg.type}`}>
            <span className="kv-msg-icon">{msg.type==='warn'?<Icon name="warn" size={10} color="#e5c07b"/>:msg.type==='error'?<Icon name="error" size={10} color="#e06c75"/>:<Icon name="info" size={10} color="#61afef"/>}</span>
            <span className="kv-msg-time">{msg.timestamp}</span>
            <span className="kv-msg-text">{msg.message}</span>
            {msg.count > 1 && <span className="kv-msg-count">{msg.count}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- Physics Panel ----
function PhysicsPanel() {
  const config = useEngineStore(s => s.physicsConfig);
  const updateConfig = useEngineStore(s => s.updatePhysicsConfig);
  const physicsDebug = useEngineStore(s => s.physicsDebug);
  const showColliders = useEngineStore(s => s.showColliders);
  const showVelocities = useEngineStore(s => s.showVelocities);
  const showContacts = useEngineStore(s => s.showContacts);
  const togglePhysicsDebug = useEngineStore(s => s.togglePhysicsDebug);
  const toggleShowColliders = useEngineStore(s => s.toggleShowColliders);
  const toggleShowVelocities = useEngineStore(s => s.toggleShowVelocities);
  const toggleShowContacts = useEngineStore(s => s.toggleShowContacts);
  const isPlaying = useEngineStore(s => s.isPlaying);
  const physicsWorld = useEngineStore(s => s.physicsWorld);
  return (
    <div className="kv-physics-panel">
      <div className="kv-physics-grid">
        <div className="kv-physics-section">
          <div className="kv-physics-title"><Icon name="settings" size={11}/> World Settings</div>
          <div className="kv-field"><span>Gravity Y</span><input type="number" step={0.5} value={config.gravity.y} onChange={e => updateConfig({ gravity: { ...config.gravity, y: parseFloat(e.target.value)||-9.81 } })} /></div>
          <div className="kv-field"><span>Substeps</span><input type="number" step={1} min={1} max={16} value={config.substeps} onChange={e => updateConfig({ substeps: parseInt(e.target.value)||4 })}/></div>
        </div>
        <div className="kv-physics-section">
          <div className="kv-physics-title"><Icon name="eye" size={11}/> Debug Visualization</div>
          <div className="kv-physics-toggles">
            {[{label:'Debug',checked:physicsDebug,toggle:togglePhysicsDebug},{label:'Colliders',checked:showColliders,toggle:toggleShowColliders},{label:'Velocity',checked:showVelocities,toggle:toggleShowVelocities},{label:'Contacts',checked:showContacts,toggle:toggleShowContacts}].map(t => (
              <label key={t.label} className={`kv-physics-toggle ${t.checked?'on':''}`}><input type="checkbox" checked={t.checked} onChange={t.toggle}/><span>{t.label}</span></label>
            ))}
          </div>
        </div>
        {isPlaying && (
          <div className="kv-physics-section">
            <div className="kv-physics-title"><Icon name="physics" size={11}/> Live Stats</div>
            <div className="kv-stats-row">
              <div className="kv-stat"><span className="kv-stat-val">{physicsWorld.stats.activeBodies}</span><span className="kv-stat-lbl">Bodies</span></div>
              <div className="kv-stat"><span className="kv-stat-val">{physicsWorld.stats.activeContacts}</span><span className="kv-stat-lbl">Contacts</span></div>
              <div className="kv-stat"><span className="kv-stat-val">{physicsWorld.stats.sleepingBodies}</span><span className="kv-stat-lbl">Sleeping</span></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Scripts Panel ----
function ScriptsPanel() {
  const entities = useEngineStore(s => s.entities);
  const scriptErrors = useEngineStore(s => s.scriptErrors);
  const isPlaying = useEngineStore(s => s.isPlaying);
  const luaVM = useEngineStore(s => s.luaVM);
  const inputState = useEngineStore(s => s.inputState);
  const selectEntity = useEngineStore(s => s.selectEntity);
  const totalScripts = entities.reduce((n,e) => n+e.scripts.length, 0);
  const enabledScripts = entities.reduce((n,e) => n+e.scripts.filter(s=>s.enabled).length, 0);
  const heldKeys = Array.from(inputState.keys).slice(0,8);
  return (
    <div className="kv-scripts-panel">
      <div className="kv-scripts-stats">
        <span><Icon name="script" size={11}/> {totalScripts} scripts</span>
        <span><Icon name="play" size={9}/> {enabledScripts} enabled</span>
        <span style={{ color: scriptErrors.size>0?'#ff6666':'#88ff88' }}><Icon name={scriptErrors.size>0?'error':'info'} size={11}/> {scriptErrors.size} errors</span>
        <span>{luaVM.scripts.size} compiled</span>
      </div>
      <div className="kv-input-state">
        <div className="kv-input-row">
          <span className="kv-input-label">Keys:</span>
          {heldKeys.length===0?<span className="kv-no-keys">none</span>:heldKeys.map(k => <span key={k} className="kv-key-badge">{k===' '?'Space':k}</span>)}
        </div>
      </div>
      <div className="kv-scripts-list">
        {entities.filter(e => e.scripts.length>0).map(entity => (
          <div key={entity.id} className="kv-scripts-group">
            <div className="kv-scripts-entity" onClick={() => selectEntity(entity.id)}>{entity.name}</div>
            {entity.scripts.map((script,idx) => {
              const key = `${entity.id}_${idx}`;
              const hasError = scriptErrors.has(key);
              return (
                <div key={idx} className={`kv-scripts-item ${hasError?'error':''} ${!script.enabled?'disabled':''}`}>
                  <span className="kv-si-status">{!script.enabled?'○':hasError?'⚠':isPlaying?'●':'◎'}</span>
                  <span className="kv-si-name">{script.name}</span>
                  <span className="kv-si-lang">LUA</span>
                </div>
              );
            })}
          </div>
        ))}
        {totalScripts===0 && <div className="kv-scripts-empty">No scripts. Add via Inspector → Add Component → Lua Script</div>}
      </div>
    </div>
  );
}

// ---- Asset Browser ----
function AssetBrowser() {
  const assets = useEngineStore(s => s.assets);
  const importAsset = useEngineStore(s => s.importAsset);
  const removeAsset = useEngineStore(s => s.removeAsset);
  const addCustomModelEntity = useEngineStore(s => s.addCustomModelEntity);
  const log = useEngineStore(s => s.log);
  const [selected, setSelected] = useState<string|null>(null);
  const [filter, setFilter] = useState<'all'|'model'|'texture'|'audio'>('all');
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const filtered = filter==='all' ? assets : assets.filter(a => a.type===filter);
  const handleFiles = async (files: FileList|null) => { if (!files) return; for (const file of Array.from(files)) await importAsset(file); };
  const formatSize = (bytes: number) => bytes < 1024*1024 ? `${(bytes/1024).toFixed(0)} KB` : `${(bytes/1024/1024).toFixed(1)} MB`;
  const typeColor: Record<string,string> = { model:'#61afef', texture:'#98c379', animation:'#c678dd', audio:'#e5c07b' };
  const typeIcon: Record<string,string> = { model:'⬟', texture:'🖼', audio:'♪', animation:'▶' };
  return (
    <div className="kv-asset-browser" onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}>
      <div className="kv-asset-toolbar">
        <div className="kv-asset-path"><Icon name="folder" size={12} color="#e5c07b"/><span>Assets ({assets.length})</span></div>
        <div className="kv-asset-tools">
          {(['all','model','texture','audio'] as const).map(f => (
            <button key={f} className={`kv-icon-btn-sm ${filter===f?'active':''}`} onClick={() => setFilter(f)}>{f==='all'?'All':f==='model'?'3D':f==='texture'?'Tex':'♪'}</button>
          ))}
          <button className="kv-icon-btn-sm" onClick={() => fileInputRef.current?.click()}><Icon name="upload" size={11}/> Import</button>
          <input ref={fileInputRef} type="file" multiple accept=".glb,.gltf,.obj,.fbx,.png,.jpg,.jpeg,.webp,.mp3,.ogg,.wav,.opus" style={{ display:'none' }} onChange={e => handleFiles(e.target.files)}/>
        </div>
      </div>
      {assets.length===0 ? (
        <div className={`kv-asset-dropzone ${dragging?'dragging':''}`}>
          <Icon name="upload" size={28} color="#444"/>
          <p style={{ color:'#555', fontSize:12, marginTop:8 }}>Drop GLB, OBJ, PNG, JPG, MP3, OGG files here</p>
          <button className="kv-add-component-btn" style={{ marginTop:8 }} onClick={() => fileInputRef.current?.click()}>Browse Files</button>
        </div>
      ) : (
        <div className={`kv-asset-grid-real ${dragging?'dragging':''}`}>
          {filtered.map(asset => (
            <div key={asset.id} className={`kv-asset-card ${selected===asset.id?'selected':''}`}
              onClick={() => setSelected(selected===asset.id?null:asset.id)}
              onDoubleClick={() => { if (asset.type==='model') { addCustomModelEntity(asset.id); log(`Added ${asset.name} to scene`); } }}
              title={`${asset.name}.${asset.format} — ${formatSize(asset.fileSize)}\nDouble-click to add model to scene`}>
              <div className="kv-asset-thumb">
                {asset.type==='texture'&&asset.dataUrl ? (
                  <img src={asset.dataUrl} alt={asset.name} style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:4 }}/>
                ) : (
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', gap:4 }}>
                    <span style={{ fontSize:22 }}>{typeIcon[asset.type]||'📄'}</span>
                    <span style={{ fontSize:9, color:typeColor[asset.type]||'#aaa', textTransform:'uppercase' }}>{asset.format}</span>
                  </div>
                )}
              </div>
              <div className="kv-asset-info">
                <span className="kv-asset-name" title={asset.name}>{asset.name}</span>
                <span className="kv-asset-meta" style={{ color:typeColor[asset.type]||'#aaa' }}>{asset.format.toUpperCase()} · {formatSize(asset.fileSize)}</span>
                {asset.embeddedClips&&asset.embeddedClips.length>0 && <span className="kv-asset-meta" style={{ color:'#c678dd' }}>{asset.embeddedClips.length} clip{asset.embeddedClips.length!==1?'s':''}</span>}
              </div>
              {selected===asset.id && (
                <div className="kv-asset-actions">
                  {asset.type==='model' && <button className="kv-asset-action-btn" onClick={e => { e.stopPropagation(); addCustomModelEntity(asset.id); }}>+ Scene</button>}
                  <button className="kv-asset-action-btn kv-delete-btn" onClick={e => { e.stopPropagation(); removeAsset(asset.id); setSelected(null); }}>✕</button>
                </div>
              )}
            </div>
          ))}
          <div className={`kv-asset-card kv-asset-import-card ${dragging?'dragging':''}`} onClick={() => fileInputRef.current?.click()}>
            <div className="kv-asset-thumb" style={{ display:'flex', alignItems:'center', justifyContent:'center' }}><Icon name="plus" size={20} color="#444"/></div>
            <div className="kv-asset-info"><span className="kv-asset-name" style={{ color:'#555' }}>Import</span></div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Prefabs Panel ----
function PrefabsPanel() {
  const prefabs = useEngineStore(s => s.prefabs);
  const instantiatePrefab = useEngineStore(s => s.instantiatePrefab);
  const deletePrefab = useEngineStore(s => s.deletePrefab);
  const selectedId = useEngineStore(s => s.selectedId);
  const createPrefab = useEngineStore(s => s.createPrefab);
  const entities = useEngineStore(s => s.entities);
  const isPlaying = useEngineStore(s => s.isPlaying);
  const selectedEntity = entities.find(e => e.id === selectedId);

  return (
    <div className="kv-prefabs-panel">
      <div className="kv-asset-toolbar">
        <div className="kv-asset-path">
          <span style={{ fontSize:14 }}>📦</span>
          <span>Prefabs ({prefabs.length})</span>
        </div>
        {selectedEntity && !isPlaying && (
          <button className="kv-icon-btn-sm" style={{ padding:'3px 10px', fontSize:11 }}
            onClick={() => createPrefab(selectedEntity.id)}
            title={`Save "${selectedEntity.name}" as a prefab`}>
            + Save "{selectedEntity.name}"
          </button>
        )}
      </div>

      {prefabs.length === 0 ? (
        <div className="kv-asset-dropzone" style={{ flexDirection:'column', gap:8 }}>
          <span style={{ fontSize:32 }}>📦</span>
          <p style={{ color:'#555', fontSize:12, textAlign:'center' }}>
            No prefabs yet.<br/>
            Select an entity in the Hierarchy and click<br/>
            the save icon to create a prefab.
          </p>
        </div>
      ) : (
        <div className="kv-prefabs-grid">
          {prefabs.map(prefab => (
            <div key={prefab.id} className="kv-prefab-card" title={`${prefab.name}\nCreated: ${new Date(prefab.createdAt).toLocaleDateString()}\nDouble-click to instantiate`}
              onDoubleClick={() => !isPlaying && instantiatePrefab(prefab.id)}>
              {/* Color swatch thumbnail */}
              <div className="kv-prefab-thumb" style={{ background: prefab.thumbnailColor }}>
                <span style={{ fontSize:18 }}>📦</span>
              </div>
              <div className="kv-prefab-info">
                <span className="kv-prefab-name">{prefab.name}</span>
                <span className="kv-prefab-date">{new Date(prefab.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="kv-prefab-actions">
                {!isPlaying && (
                  <button className="kv-asset-action-btn" title="Instantiate"
                    onClick={() => instantiatePrefab(prefab.id)}>
                    + Spawn
                  </button>
                )}
                <button className="kv-asset-action-btn kv-delete-btn" title="Delete prefab"
                  onClick={() => deletePrefab(prefab.id)}>
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ padding:'8px 12px', fontSize:11, color:'#555', borderTop:'1px solid #222' }}>
        💡 Right-click entity in Hierarchy or click the 📦 icon in Inspector to save a prefab. Double-click any prefab to spawn it.
      </div>
    </div>
  );
}

// ---- Main ----
export default function BottomPanel() {
  const activeTab = useEngineStore(s => s.activeBottomTab);
  const setTab = useEngineStore(s => s.setActiveBottomTab);
  const scriptErrors = useEngineStore(s => s.scriptErrors);
  const prefabs = useEngineStore(s => s.prefabs);
  const sculptConfig = useEngineStore(s => s.sculptConfig);

  const tabs = [
    { id: 'console' as const, label: 'Console', icon: 'terminal' },
    { id: 'assets' as const, label: 'Assets', icon: 'folder' },
    { id: 'physics' as const, label: 'Physics', icon: 'physics' },
    { id: 'scripts' as const, label: 'Scripts', icon: 'script' },
    { id: 'prefabs' as const, label: 'Prefabs', icon: 'folder' },
    { id: 'sculpt' as const, label: 'Sculpt', icon: 'sculpt' },
  ];

  return (
    <div className="kv-panel kv-bottom-panel">
      <div className="kv-tab-bar">
        {tabs.map(tab => (
          <button key={tab.id} className={`kv-tab ${activeTab===tab.id?'active':''}`} onClick={() => setTab(tab.id)}>
            <Icon name={tab.icon} size={11}/>
            <span>{tab.label}</span>
            {tab.id==='scripts' && scriptErrors.size>0 && <span className="kv-tab-badge">{scriptErrors.size}</span>}
            {tab.id==='prefabs' && prefabs.length>0 && <span className="kv-tab-badge" style={{ background:'#61afef' }}>{prefabs.length}</span>}
            {tab.id==='sculpt' && sculptConfig.enabled && <span className="kv-tab-badge" style={{ background:'#ff8800' }}>ON</span>}
          </button>
        ))}
      </div>
      <div className="kv-tab-content">
        {activeTab==='console' ? <Console/> :
         activeTab==='physics' ? <PhysicsPanel/> :
         activeTab==='scripts' ? <ScriptsPanel/> :
         activeTab==='prefabs' ? <PrefabsPanel/> :
         activeTab==='sculpt' ? <SculptPanel/> :
         <AssetBrowser/>}
      </div>
    </div>
  );
}
