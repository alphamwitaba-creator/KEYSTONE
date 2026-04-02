// ============================================================
// KEVLA ENGINE — Material Editor Panel v2.0
// Custom shader and material editor
// ============================================================

import { useState } from 'react';
import { useEngineStore } from '../engine/store';
import { Icon } from './Icons';
import type { ShaderGraph, ShaderNodeType } from '../engine/types';

const NODE_COLORS: Record<string, string> = {
  input: '#61afef', output: '#e06c75', constant: '#98c379', texture: '#c678dd',
  math: '#e5c07b', vector: '#56b6c2', pbr: '#ff8800', geometry: '#d19a66', noise: '#be5046',
};

const NODE_TEMPLATES: { type: ShaderNodeType; label: string; category: string }[] = [
  { type: 'float', label: 'Float', category: 'constant' },
  { type: 'color', label: 'Color', category: 'constant' },
  { type: 'texture', label: 'Texture', category: 'texture' },
  { type: 'add', label: 'Add', category: 'math' },
  { type: 'multiply', label: 'Multiply', category: 'math' },
  { type: 'divide', label: 'Divide', category: 'math' },
  { type: 'subtract', label: 'Subtract', category: 'math' },
  { type: 'power', label: 'Power', category: 'math' },
  { type: 'sqrt', label: 'Sqrt', category: 'math' },
  { type: 'sin', label: 'Sin', category: 'math' },
  { type: 'cos', label: 'Cos', category: 'math' },
  { type: 'mix', label: 'Mix', category: 'math' },
  { type: 'clamp', label: 'Clamp', category: 'math' },
  { type: 'normalize', label: 'Normalize', category: 'vector' },
  { type: 'dot', label: 'Dot', category: 'vector' },
  { type: 'cross', label: 'Cross', category: 'vector' },
  { type: 'reflect', label: 'Reflect', category: 'vector' },
  { type: 'fresnel', label: 'Fresnel', category: 'pbr' },
  { type: 'uv', label: 'UV', category: 'geometry' },
  { type: 'time', label: 'Time', category: 'geometry' },
  { type: 'position', label: 'Position', category: 'geometry' },
  { type: 'normal', label: 'Normal', category: 'geometry' },
  { type: 'viewDir', label: 'View Dir', category: 'geometry' },
  { type: 'noise', label: 'Noise', category: 'noise' },
];

export default function MaterialEditor() {
  const selectedId = useEngineStore(s => s.selectedId);
  const entities = useEngineStore(s => s.entities);
  const updateMaterial = useEngineStore(s => s.updateMaterial);
  const assets = useEngineStore(s => s.assets);
  
  const selectedEntity = entities.find(e => e.id === selectedId);
  const material = selectedEntity?.material;
  
  const [showAdvanced, setShowAdvanced] = useState(false);

  if (!selectedEntity || !material) {
    return (
      <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-dim)' }}>
        Select an entity to edit material
      </div>
    );
  }

  return (
    <div className="kv-material-editor" style={{ padding: 8, overflow: 'auto' }}>
      <div className="kv-section-title" style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-bright)', marginBottom: 8 }}>
        <Icon name="shader" size={12} /> Material Editor
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div className="kv-field">
          <span>Color</span>
          <input type="color" value={material.color} onChange={e => updateMaterial(selectedId!, { color: e.target.value })} />
        </div>
        
        <div className="kv-field-row">
          <span>Metallic</span>
          <input type="range" min={0} max={1} step={0.01} value={material.metallic} 
            onChange={e => updateMaterial(selectedId!, { metallic: parseFloat(e.target.value) })} />
          <span className="kv-field-val">{material.metallic.toFixed(2)}</span>
        </div>
        
        <div className="kv-field-row">
          <span>Roughness</span>
          <input type="range" min={0} max={1} step={0.01} value={material.roughness} 
            onChange={e => updateMaterial(selectedId!, { roughness: parseFloat(e.target.value) })} />
          <span className="kv-field-val">{material.roughness.toFixed(2)}</span>
        </div>

        <div className="kv-field-row">
          <span>Opacity</span>
          <input type="range" min={0} max={1} step={0.01} value={material.opacity} 
            onChange={e => updateMaterial(selectedId!, { opacity: parseFloat(e.target.value) })} />
          <span className="kv-field-val">{material.opacity.toFixed(2)}</span>
        </div>

        <div className="kv-field">
          <span>Emissive</span>
          <input type="color" value={material.emissive} onChange={e => updateMaterial(selectedId!, { emissive: e.target.value })} />
        </div>

        <div className="kv-field">
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <input type="checkbox" checked={material.wireframe} 
              onChange={e => updateMaterial(selectedId!, { wireframe: e.target.checked })} />
            <span>Wireframe</span>
          </label>
        </div>

        <button 
          className="kv-add-component-btn" 
          style={{ marginTop: 4 }}
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          {showAdvanced ? '▼' : '▶'} Advanced PBR
        </button>

        {showAdvanced && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 8, background: 'var(--bg-2)', borderRadius: 4 }}>
            <div className="kv-field-row">
              <span>Subsurface</span>
              <input type="range" min={0} max={1} step={0.01} value={material.subsurface || 0} 
                onChange={e => updateMaterial(selectedId!, { subsurface: parseFloat(e.target.value) })} />
              <span className="kv-field-val">{(material.subsurface || 0).toFixed(2)}</span>
            </div>
            
            <div className="kv-field-row">
              <span>Transmission</span>
              <input type="range" min={0} max={1} step={0.01} value={material.transmission || 0} 
                onChange={e => updateMaterial(selectedId!, { transmission: parseFloat(e.target.value) })} />
              <span className="kv-field-val">{(material.transmission || 0).toFixed(2)}</span>
            </div>

            <div className="kv-field-row">
              <span>Sheen</span>
              <input type="range" min={0} max={1} step={0.01} value={material.sheen || 0} 
                onChange={e => updateMaterial(selectedId!, { sheen: parseFloat(e.target.value) })} />
              <span className="kv-field-val">{(material.sheen || 0).toFixed(2)}</span>
            </div>

            <div className="kv-field-row">
              <span>Clearcoat</span>
              <input type="range" min={0} max={1} step={0.01} value={material.clearcoat || 0} 
                onChange={e => updateMaterial(selectedId!, { clearcoat: parseFloat(e.target.value) })} />
              <span className="kv-field-val">{(material.clearcoat || 0).toFixed(2)}</span>
            </div>

            <div className="kv-field-row">
              <span>Anisotropy</span>
              <input type="range" min={0} max={1} step={0.01} value={material.anisotropy || 0} 
                onChange={e => updateMaterial(selectedId!, { anisotropy: parseFloat(e.target.value) })} />
              <span className="kv-field-val">{(material.anisotropy || 0).toFixed(2)}</span>
            </div>

            <div className="kv-field">
              <span>Sheen Color</span>
              <input type="color" value={material.sheenColor || '#ffffff'} 
                onChange={e => updateMaterial(selectedId!, { sheenColor: e.target.value })} />
            </div>
          </div>
        )}

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 4 }}>
          <div className="kv-section-title" style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-dim)', marginBottom: 6 }}>
            TEXTURE MAPS
          </div>
          
          <div className="kv-field">
            <span>Diffuse</span>
            <select value={material.diffuseMap || ''} onChange={e => updateMaterial(selectedId!, { diffuseMap: e.target.value || undefined })}>
              <option value="">None</option>
              {assets.filter(a => a.type === 'texture').map(a => (
                <option key={a.id} value={a.dataUrl}>{a.name}</option>
              ))}
            </select>
          </div>

          <div className="kv-field">
            <span>Normal</span>
            <select value={material.normalMap || ''} onChange={e => updateMaterial(selectedId!, { normalMap: e.target.value || undefined })}>
              <option value="">None</option>
              {assets.filter(a => a.type === 'texture').map(a => (
                <option key={a.id} value={a.dataUrl}>{a.name}</option>
              ))}
            </select>
          </div>

          <div className="kv-field">
            <span>Roughness</span>
            <select value={material.roughnessMap || ''} onChange={e => updateMaterial(selectedId!, { roughnessMap: e.target.value || undefined })}>
              <option value="">None</option>
              {assets.filter(a => a.type === 'texture').map(a => (
                <option key={a.id} value={a.dataUrl}>{a.name}</option>
              ))}
            </select>
          </div>

          <div className="kv-field">
            <span>Metalness</span>
            <select value={material.metalnessMap || ''} onChange={e => updateMaterial(selectedId!, { metalnessMap: e.target.value || undefined })}>
              <option value="">None</option>
              {assets.filter(a => a.type === 'texture').map(a => (
                <option key={a.id} value={a.dataUrl}>{a.name}</option>
              ))}
            </select>
          </div>

          <div className="kv-field">
            <span>Emissive</span>
            <select value={material.emissiveMap || ''} onChange={e => updateMaterial(selectedId!, { emissiveMap: e.target.value || undefined })}>
              <option value="">None</option>
              {assets.filter(a => a.type === 'texture').map(a => (
                <option key={a.id} value={a.dataUrl}>{a.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MaterialEditor;
