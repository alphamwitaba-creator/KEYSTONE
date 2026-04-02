// ============================================================
// KEVLA ENGINE — Sculpt Panel v3.0
// Professional sculpting toolbar with layers, symmetry, masking
// ============================================================

import { useState } from 'react';
import { useEngineStore } from '../engine/store';
import { Icon } from './Icons';
import type { BrushType, BrushFalloff, SymmetryMode, LayerBlendMode } from '../engine/sculpt/types';

const BRUSH_GROUPS: { label: string; brushes: BrushType[] }[] = [
  { label: 'Add', brushes: ['clay', 'draw', 'inflate', 'bulge', 'layer'] },
  { label: 'Remove', brushes: ['scrape', 'crease', 'pinch'] },
  { label: 'Smooth', brushes: ['smooth', 'relax', 'fill'] },
  { label: 'Move', brushes: ['grab', 'snakeHook', 'move', 'nudge', 'twist', 'elastic'] },
  { label: 'Flatten', brushes: ['flatten', 'plane'] },
  { label: 'Mask', brushes: ['mask'] },
];

const BRUSH_ICONS: Record<BrushType, string> = {
  clay: '◉', draw: '✎', inflate: '⬆', crease: '↟', smooth: '◯',
  flatten: '▬', grab: '✋', snakeHook: '↩', pinch: '◡', bulge: '◠',
  scrape: '⤫', layer: '≡', elastic: '↔', twist: '↻', move: '✥',
  nudge: '→', mask: '◧', relax: '≈', plane: '▭', fill: '◨',
};

const BRUSH_LABELS: Record<BrushType, string> = {
  clay: 'Clay', draw: 'Draw', inflate: 'Inflate', crease: 'Crease', smooth: 'Smooth',
  flatten: 'Flatten', grab: 'Grab', snakeHook: 'Snake Hook', pinch: 'Pinch', bulge: 'Bulge',
  scrape: 'Scrape', layer: 'Layer', elastic: 'Elastic', twist: 'Twist', move: 'Move',
  nudge: 'Nudge', mask: 'Mask', relax: 'Relax', plane: 'Plane', fill: 'Fill',
};

const FALLOFF_TYPES: { value: BrushFalloff; label: string }[] = [
  { value: 'smooth', label: 'Smooth' },
  { value: 'sharp', label: 'Sharp' },
  { value: 'needle', label: 'Needle' },
  { value: 'flat', label: 'Flat' },
  { value: 'linear', label: 'Linear' },
  { value: 'spherical', label: 'Sphere' },
  { value: 'gaussian', label: 'Gauss' },
];

const SYMMETRY_MODES: { value: SymmetryMode; label: string; icon: string }[] = [
  { value: 'none', label: 'Off', icon: '○' },
  { value: 'mirrorX', label: 'X', icon: '↔' },
  { value: 'mirrorY', label: 'Y', icon: '↕' },
  { value: 'mirrorZ', label: 'Z', icon: '↗' },
  { value: 'radial', label: 'Radial', icon: '✦' },
];

const LAYER_BLEND_MODES: { value: LayerBlendMode; label: string }[] = [
  { value: 'add', label: 'Add' },
  { value: 'subtract', label: 'Subtract' },
  { value: 'multiply', label: 'Multiply' },
  { value: 'overlay', label: 'Overlay' },
  { value: 'softLight', label: 'Soft Light' },
  { value: 'hardLight', label: 'Hard Light' },
];

export default function SculptPanel() {
  const sculptConfig = useEngineStore(s => s.sculptConfig);
  const setSculptBrush = useEngineStore(s => s.setSculptBrush);
  const setSculptConfig = useEngineStore(s => s.setSculptConfig);
  const sculptUndo = useEngineStore(s => s.sculptUndo);
  const sculptRedo = useEngineStore(s => s.sculptRedo);
  const sculptReset = useEngineStore(s => s.sculptReset);
  const toggleSculptMode = useEngineStore(s => s.toggleSculptMode);
  const selectedId = useEngineStore(s => s.selectedId);
  const sculptSystem = useEngineStore(s => s.sculptSystem);
  const entities = useEngineStore(s => s.entities);
  const log = useEngineStore(s => s.log);

  const [activeTab, setActiveTab] = useState<'brush' | 'symmetry' | 'layers' | 'mask'>('brush');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const selectedEntity = entities.find(e => e.id === selectedId);

  const handleExportOBJ = () => {
    const meshMap = (window as any).__kevla_meshMap as Map<string, any>;
    if (!selectedId || !meshMap) { log('Select a mesh to export'); return; }
    const mesh = meshMap.get(selectedId);
    if (!mesh) { log('Mesh not found'); return; }
    const name = selectedEntity?.name || 'sculpt';
    const obj = sculptSystem.exportOBJ(mesh, name);
    const blob = new Blob([obj], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${name}.obj`; a.click();
    URL.revokeObjectURL(url);
    log(`Exported ${name}.obj`);
  };

  const handleExportGLTF = () => {
    const meshMap = (window as any).__kevla_meshMap as Map<string, any>;
    if (!selectedId || !meshMap) { log('Select a mesh to export'); return; }
    const mesh = meshMap.get(selectedId);
    if (!mesh) { log('Mesh not found'); return; }
    const name = selectedEntity?.name || 'sculpt';
    const buf = sculptSystem.exportGLTF(mesh, name);
    const blob = new Blob([buf], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${name}.glb`; a.click();
    URL.revokeObjectURL(url);
    log(`Exported ${name}.glb`);
  };

  const handleBakeLayers = () => {
    const cache = sculptSystem.getCache(selectedId!);
    if (!cache) { log('No mesh cached'); return; }
    sculptSystem.getLayerSystem().bakeLayers(cache.vertices.length);
    log('Layers baked');
  };

  const handleFlattenAll = () => {
    const cache = sculptSystem.getCache(selectedId!);
    if (!cache) { log('No mesh cached'); return; }
    sculptSystem.getLayerSystem().flattenAll(cache.vertices.length);
    log('All layers flattened');
  };

  const tabs: { id: typeof activeTab; label: string; icon: string }[] = [
    { id: 'brush', label: 'Brush', icon: 'sculpt' },
    { id: 'symmetry', label: 'Symmetry', icon: 'transform' },
    { id: 'layers', label: 'Layers', icon: 'layers' },
    { id: 'mask', label: 'Mask', icon: 'mask' },
  ];

  return (
    <div className="kv-sculpt-panel" style={{
      background: 'var(--panel-bg)', borderTop: '1px solid var(--border)',
      padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8,
      height: '100%', overflowY: 'auto',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-bright)', letterSpacing: 1 }}>
          SCULPT
        </span>
        <button
          className={`kv-icon-btn-sm ${sculptConfig.enabled ? 'active' : ''}`}
          onClick={toggleSculptMode}
          style={{ fontSize: 10, padding: '2px 8px', background: sculptConfig.enabled ? 'var(--accent)' : 'var(--panel-hover)', color: sculptConfig.enabled ? '#000' : 'var(--text)' }}
        >
          {sculptConfig.enabled ? 'ON' : 'OFF'}
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, borderBottom: '1px solid var(--border)', paddingBottom: 4 }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1, padding: '4px 2px', fontSize: 9, textTransform: 'uppercase',
              background: activeTab === tab.id ? 'var(--accent)' : 'transparent',
              color: activeTab === tab.id ? '#000' : 'var(--text-dim)',
              border: 'none', borderRadius: 3, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3,
            }}
          >
            <Icon name={tab.icon} size={10} /> {tab.label}
          </button>
        ))}
      </div>

      {/* Brush Tab */}
      {activeTab === 'brush' && (
        <>
          {/* Brush Grid */}
          {BRUSH_GROUPS.map(group => (
            <div key={group.label}>
              <div style={{ fontSize: 9, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 }}>
                {group.label}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${group.brushes.length}, 1fr)`, gap: 2 }}>
                {group.brushes.map(type => (
                  <button
                    key={type}
                    onClick={() => setSculptBrush({ type })}
                    title={BRUSH_LABELS[type]}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      padding: '4px 1px', borderRadius: 3, border: '1px solid var(--border)',
                      background: sculptConfig.brush.type === type ? 'var(--accent)' : 'var(--panel-hover)',
                      color: sculptConfig.brush.type === type ? '#000' : 'var(--text)',
                      cursor: 'pointer', fontSize: 12, gap: 1,
                    }}
                  >
                    <span style={{ fontSize: 14 }}>{BRUSH_ICONS[type]}</span>
                    <span style={{ fontSize: 7, textTransform: 'uppercase' }}>{type.slice(0, 4)}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* Size / Strength */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div className="kv-field-row">
              <span style={{ fontSize: 10 }}>Size</span>
              <input type="range" min={0.01} max={5} step={0.01}
                value={sculptConfig.brush.size}
                onChange={e => setSculptBrush({ size: parseFloat(e.target.value) })}
                style={{ flex: 1 }}
              />
              <span className="kv-field-val">{sculptConfig.brush.size.toFixed(2)}</span>
            </div>
            <div className="kv-field-row">
              <span style={{ fontSize: 10 }}>Strength</span>
              <input type="range" min={0.01} max={1} step={0.01}
                value={sculptConfig.brush.strength}
                onChange={e => setSculptBrush({ strength: parseFloat(e.target.value) })}
                style={{ flex: 1 }}
              />
              <span className="kv-field-val">{sculptConfig.brush.strength.toFixed(2)}</span>
            </div>
          </div>

          {/* Falloff */}
          <div>
            <div style={{ fontSize: 9, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 }}>Falloff</div>
            <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              {FALLOFF_TYPES.map(f => (
                <button
                  key={f.value}
                  onClick={() => setSculptBrush({ falloff: f.value })}
                  style={{
                    padding: '2px 6px', fontSize: 9, borderRadius: 3,
                    border: '1px solid var(--border)',
                    background: sculptConfig.brush.falloff === f.value ? 'var(--accent)' : 'var(--panel-hover)',
                    color: sculptConfig.brush.falloff === f.value ? '#000' : 'var(--text)',
                    cursor: 'pointer',
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Advanced */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            style={{
              background: 'transparent', border: 'none', color: 'var(--text-dim)',
              fontSize: 9, cursor: 'pointer', textAlign: 'left', padding: 0,
            }}
          >
            {showAdvanced ? '▾' : '▸'} Advanced Settings
          </button>

          {showAdvanced && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingLeft: 8 }}>
              <div className="kv-field-row">
                <span style={{ fontSize: 10 }}>Spacing</span>
                <input type="range" min={0} max={0.5} step={0.01}
                  value={sculptConfig.brush.spacing}
                  onChange={e => setSculptBrush({ spacing: parseFloat(e.target.value) })}
                  style={{ flex: 1 }}
                />
                <span className="kv-field-val">{sculptConfig.brush.spacing.toFixed(2)}</span>
              </div>
              <div className="kv-field-row">
                <span style={{ fontSize: 10 }}>Jitter</span>
                <input type="range" min={0} max={1} step={0.01}
                  value={sculptConfig.brush.jitter}
                  onChange={e => setSculptBrush({ jitter: parseFloat(e.target.value) })}
                  style={{ flex: 1 }}
                />
                <span className="kv-field-val">{sculptConfig.brush.jitter.toFixed(2)}</span>
              </div>
              <div className="kv-field-row">
                <span style={{ fontSize: 10 }}>Pressure</span>
                <input type="checkbox" checked={sculptConfig.brush.pressureSensitivity}
                  onChange={e => setSculptBrush({ pressureSensitivity: e.target.checked })}
                />
              </div>
            </div>
          )}
        </>
      )}

      {/* Symmetry Tab */}
      {activeTab === 'symmetry' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', gap: 2 }}>
            {SYMMETRY_MODES.map(mode => (
              <button
                key={mode.value}
                onClick={() => setSculptConfig({ symmetry: { ...sculptConfig.symmetry, mode: mode.value } })}
                style={{
                  flex: 1, padding: '4px 2px', fontSize: 9, borderRadius: 3,
                  border: '1px solid var(--border)',
                  background: sculptConfig.symmetry.mode === mode.value ? 'var(--accent)' : 'var(--panel-hover)',
                  color: sculptConfig.symmetry.mode === mode.value ? '#000' : 'var(--text)',
                  cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                }}
              >
                <span style={{ fontSize: 14 }}>{mode.icon}</span>
                <span>{mode.label}</span>
              </button>
            ))}
          </div>

          {sculptConfig.symmetry.mode === 'radial' && (
            <div className="kv-field-row">
              <span style={{ fontSize: 10 }}>Count</span>
              <input type="range" min={2} max={24} step={1}
                value={sculptConfig.symmetry.radialCount}
                onChange={e => setSculptConfig({ symmetry: { ...sculptConfig.symmetry, radialCount: parseInt(e.target.value) } })}
                style={{ flex: 1 }}
              />
              <span className="kv-field-val">{sculptConfig.symmetry.radialCount}</span>
            </div>
          )}

          <div className="kv-field-row">
            <span style={{ fontSize: 10 }}>Lock Axis</span>
            <input type="checkbox" checked={sculptConfig.symmetry.lockAxis}
              onChange={e => setSculptConfig({ symmetry: { ...sculptConfig.symmetry, lockAxis: e.target.checked } })}
            />
          </div>
        </div>
      )}

      {/* Layers Tab */}
      {activeTab === 'layers' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', gap: 3 }}>
            <button className="kv-icon-btn-sm" onClick={() => {
              const cache = sculptSystem.getCache(selectedId!);
              if (cache) {
                sculptSystem.getLayerSystem().addLayer(`Layer ${sculptSystem.getLayerSystem().getStack().layers.length + 1}`, cache.vertices.length);
                log('Layer added');
              }
            }} style={{ flex: 1 }}>
              <Icon name="plus" size={10} /> Add Layer
            </button>
            <button className="kv-icon-btn-sm" onClick={handleBakeLayers} style={{ flex: 1 }}>
              <Icon name="download" size={10} /> Bake
            </button>
            <button className="kv-icon-btn-sm" onClick={handleFlattenAll} style={{ flex: 1, color: '#e06c75' }}>
              <Icon name="reset" size={10} /> Flatten
            </button>
          </div>

          {sculptSystem.getLayerSystem().getStack().layers.map(layer => (
            <div key={layer.id} style={{
              padding: '4px 6px', borderRadius: 3,
              border: '1px solid var(--border)',
              background: sculptSystem.getLayerSystem().getStack().activeLayerId === layer.id ? 'var(--panel-hover)' : 'transparent',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <input type="checkbox" checked={layer.visible}
                onChange={e => sculptSystem.getLayerSystem().setLayerVisibility(layer.id, e.target.checked)}
              />
              <span style={{ fontSize: 10, flex: 1 }}>{layer.name}</span>
              <select value={layer.blendMode}
                onChange={e => sculptSystem.getLayerSystem().setLayerBlendMode(layer.id, e.target.value as LayerBlendMode)}
                style={{ fontSize: 9, background: 'var(--panel-bg)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 2, padding: '1px 3px' }}
              >
                {LAYER_BLEND_MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
              <input type="range" min={0} max={1} step={0.01} value={layer.opacity}
                onChange={e => sculptSystem.getLayerSystem().setLayerOpacity(layer.id, parseFloat(e.target.value))}
                style={{ width: 40 }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Mask Tab */}
      {activeTab === 'mask' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', gap: 3 }}>
            {(['brush', 'lasso', 'box'] as const).map(tool => (
              <button
                key={tool}
                onClick={() => setSculptConfig({ maskConfig: { ...sculptConfig.maskConfig, tool } })}
                style={{
                  flex: 1, padding: '4px 2px', fontSize: 9, borderRadius: 3,
                  border: '1px solid var(--border)',
                  background: sculptConfig.maskConfig.tool === tool ? 'var(--accent)' : 'var(--panel-hover)',
                  color: sculptConfig.maskConfig.tool === tool ? '#000' : 'var(--text)',
                  cursor: 'pointer', textTransform: 'capitalize',
                }}
              >
                {tool}
              </button>
            ))}
          </div>

          <div className="kv-field-row">
            <span style={{ fontSize: 10 }}>Mask Size</span>
            <input type="range" min={0.01} max={3} step={0.01}
              value={sculptConfig.maskConfig.brushSize}
              onChange={e => setSculptConfig({ maskConfig: { ...sculptConfig.maskConfig, brushSize: parseFloat(e.target.value) } })}
              style={{ flex: 1 }}
            />
            <span className="kv-field-val">{sculptConfig.maskConfig.brushSize.toFixed(2)}</span>
          </div>

          <div style={{ display: 'flex', gap: 3 }}>
            <button className="kv-icon-btn-sm" onClick={() => sculptSystem.getMaskSystem().invertMask()} style={{ flex: 1 }}>
              Invert
            </button>
            <button className="kv-icon-btn-sm" onClick={() => sculptSystem.getMaskSystem().clearMask()} style={{ flex: 1, color: '#e06c75' }}>
              Clear
            </button>
            <button className="kv-icon-btn-sm" onClick={() => sculptSystem.getMaskSystem().blurMask(3)} style={{ flex: 1 }}>
              Blur
            </button>
          </div>
        </div>
      )}

      {/* Undo/Redo/Reset */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 6, display: 'flex', gap: 3 }}>
        <button className="kv-icon-btn-sm" onClick={() => selectedId && sculptUndo(selectedId)} title="Undo">
          <Icon name="undo" size={10} /> Undo
        </button>
        <button className="kv-icon-btn-sm" onClick={() => selectedId && sculptRedo(selectedId)} title="Redo">
          <Icon name="redo" size={10} /> Redo
        </button>
        <button className="kv-icon-btn-sm" onClick={() => selectedId && sculptReset(selectedId)} title="Reset" style={{ color: '#e06c75' }}>
          <Icon name="reset" size={10} /> Reset
        </button>
      </div>

      {/* Topology */}
      <div style={{ display: 'flex', gap: 3 }}>
        <button className="kv-icon-btn-sm" onClick={() => setSculptConfig({ showWireframe: !sculptConfig.showWireframe })}
          style={{ flex: 1, background: sculptConfig.showWireframe ? 'var(--accent)' : 'var(--panel-hover)', color: sculptConfig.showWireframe ? '#000' : 'var(--text)' }}>
          <Icon name="grid" size={10} /> Wireframe
        </button>
        <button className="kv-icon-btn-sm" onClick={() => setSculptConfig({ topology: sculptConfig.topology === 'static' ? 'dynamic' : 'static' })}
          style={{ flex: 1, background: sculptConfig.topology === 'dynamic' ? 'var(--accent)' : 'var(--panel-hover)', color: sculptConfig.topology === 'dynamic' ? '#000' : 'var(--text)' }}>
          {sculptConfig.topology === 'dynamic' ? 'Dynamic' : 'Static'}
        </button>
      </div>

      {sculptConfig.topology === 'dynamic' && (
        <div className="kv-field-row">
          <span style={{ fontSize: 10 }}>Subdiv</span>
          <input type="range" min={0} max={5} step={1}
            value={sculptConfig.subdivisionLevel}
            onChange={e => setSculptConfig({ subdivisionLevel: parseInt(e.target.value) })}
            style={{ flex: 1 }}
          />
          <span className="kv-field-val">L{sculptConfig.subdivisionLevel}</span>
        </div>
      )}

      {/* Export */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 6 }}>
        <div style={{ fontSize: 9, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Export</div>
        <div style={{ display: 'flex', gap: 3 }}>
          <button className="kv-icon-btn-sm" onClick={handleExportOBJ} style={{ flex: 1 }}>
            <Icon name="download" size={10} /> OBJ
          </button>
          <button className="kv-icon-btn-sm" onClick={handleExportGLTF} style={{ flex: 1 }}>
            <Icon name="download" size={10} /> GLB
          </button>
        </div>
      </div>

      <div style={{ fontSize: 8, color: 'var(--text-dim)', textAlign: 'center', marginTop: 2 }}>
        RMB sculpt · Scroll size · Shift+RMB smooth · Ctrl+RMB erase
      </div>
    </div>
  );
}
