// ============================================================
// KEVLA ENGINE — Particle Panel v2.0
// Particle emitter editor
// ============================================================

import { useState } from 'react';
import { useEngineStore } from '../engine/store';
import { Icon } from './Icons';
import type { ParticleEmitter, ParticleEmitterShape, ParticleRenderMode } from '../engine/types';

const SHAPE_OPTIONS: ParticleEmitterShape[] = ['box', 'sphere', 'cone', 'circle'];
const RENDER_OPTIONS: ParticleRenderMode[] = ['billboard', 'stretched', 'mesh', 'ribbon'];

export default function ParticlePanel() {
  const selectedId = useEngineStore(s => s.selectedId);
  const entities = useEngineStore(s => s.entities);
  const updateEntity = useEngineStore(s => s.updateEntity);
  const log = useEngineStore(s => s.log);
  
  const selectedEntity = entities.find(e => e.id === selectedId);
  const emitter = selectedEntity?.particleEmitter;
  
  const [activeTab, setActiveTab] = useState<'emission' | 'shape' | 'render'>('emission');

  const updateEmitter = (updates: Partial<ParticleEmitter>) => {
    if (!selectedId || !emitter) return;
    const updated = { ...emitter, ...updates };
    updateEntity(selectedId, { particleEmitter: updated });
  };

  if (!selectedEntity) {
    return (
      <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-dim)' }}>
        Select an entity to edit particles
      </div>
    );
  }

  if (!emitter) {
    return (
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <Icon name="particles" size={24} color="var(--text-dim)" />
        <p style={{ color: 'var(--text-dim)', fontSize: 11 }}>No particle emitter on this entity</p>
        <button 
          className="kv-add-component-btn"
          onClick={() => {
            updateEntity(selectedId, { 
              particleEmitter: {
                id: `emitter_${Date.now()}`,
                name: 'New Emitter',
                enabled: true,
                emitting: false,
                loop: true,
                rate: 50,
                rateMin: 0,
                maxParticles: 1000,
                startLifetime: 2,
                startLifetimeMin: 0,
                startSpeed: 5,
                startSpeedMin: 0,
                startSize: 0.5,
                startSizeMin: 0.1,
                startSizeMax: 1,
                sizeMultiplier: 1,
                startColor: '#ffffff',
                startColorMin: '#ffffff',
                startRotation: 0,
                startRotationMin: 0,
                rotationSpeed: 0,
                rotationSpeedMin: 0,
                gravity: -9.81,
                shape: 'box',
                shapeRadius: 0.5,
                shapeAngle: 25,
                shapeBox: { x: 1, y: 1, z: 1 },
                emitFromEdge: false,
                alignToDirection: true,
                simulationSpace: 'world',
                renderMode: 'billboard',
                subEmitters: [],
                subEmitterMode: 'end',
              }
            });
            log('Added Particle Emitter');
          }}
        >
          + Add Particle Emitter
        </button>
      </div>
    );
  }

  return (
    <div className="kv-particle-panel" style={{ padding: 8, overflow: 'auto', height: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-bright)' }}>
          <Icon name="particles" size={12} /> Particle Emitter
        </span>
        <button 
          className={`kv-icon-btn-sm ${emitter.emitting ? 'active' : ''}`}
          onClick={() => updateEmitter({ emitting: !emitter.emitting })}
          style={{ marginLeft: 'auto', background: emitter.emitting ? 'var(--green)' : 'var(--panel-hover)' }}
        >
          {emitter.emitting ? '▶ Playing' : '○ Stopped'}
        </button>
      </div>

      <div className="kv-tab-bar" style={{ display: 'flex', gap: 2, borderBottom: '1px solid var(--border)', paddingBottom: 4 }}>
        {(['emission', 'shape', 'render'] as const).map(tab => (
          <button
            key={tab}
            className={`kv-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
            style={{ padding: '4px 8px', fontSize: 10, textTransform: 'uppercase' }}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'emission' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div className="kv-field-row">
            <span>Rate</span>
            <input type="range" min={1} max={200} step={1} value={emitter.rate} 
              onChange={e => updateEmitter({ rate: parseInt(e.target.value) })} />
            <span className="kv-field-val">{emitter.rate}</span>
          </div>
          
          <div className="kv-field-row">
            <span>Max</span>
            <input type="range" min={100} max={10000} step={100} value={emitter.maxParticles} 
              onChange={e => updateEmitter({ maxParticles: parseInt(e.target.value) })} />
            <span className="kv-field-val">{emitter.maxParticles}</span>
          </div>

          <div className="kv-field-row">
            <span>Lifetime</span>
            <input type="range" min={0.1} max={10} step={0.1} value={emitter.startLifetime} 
              onChange={e => updateEmitter({ startLifetime: parseFloat(e.target.value) })} />
            <span className="kv-field-val">{emitter.startLifetime.toFixed(1)}s</span>
          </div>

          <div className="kv-field-row">
            <span>Speed</span>
            <input type="range" min={0} max={50} step={0.5} value={emitter.startSpeed} 
              onChange={e => updateEmitter({ startSpeed: parseFloat(e.target.value) })} />
            <span className="kv-field-val">{emitter.startSpeed.toFixed(1)}</span>
          </div>

          <div className="kv-field-row">
            <span>Size</span>
            <input type="range" min={0.01} max={5} step={0.01} value={emitter.startSize} 
              onChange={e => updateEmitter({ startSize: parseFloat(e.target.value) })} />
            <span className="kv-field-val">{emitter.startSize.toFixed(2)}</span>
          </div>

          <div className="kv-field-row">
            <span>Gravity</span>
            <input type="range" min={-50} max={50} step={0.5} value={emitter.gravity} 
              onChange={e => updateEmitter({ gravity: parseFloat(e.target.value) })} />
            <span className="kv-field-val">{emitter.gravity.toFixed(1)}</span>
          </div>

          <div className="kv-field">
            <span>Start Color</span>
            <input type="color" value={emitter.startColor} onChange={e => updateEmitter({ startColor: e.target.value })} />
          </div>

          <div className="kv-field">
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input type="checkbox" checked={emitter.loop} onChange={e => updateEmitter({ loop: e.target.checked })} />
              <span>Loop</span>
            </label>
          </div>

          <div className="kv-field">
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input type="checkbox" checked={emitter.alignToDirection} onChange={e => updateEmitter({ alignToDirection: e.target.checked })} />
              <span>Align to Direction</span>
            </label>
          </div>
        </div>
      )}

      {activeTab === 'shape' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div className="kv-field">
            <span>Shape</span>
            <select value={emitter.shape} onChange={e => updateEmitter({ shape: e.target.value as ParticleEmitterShape })}>
              {SHAPE_OPTIONS.map(s => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>

          {emitter.shape === 'box' && (
            <>
              <div className="kv-field-row">
                <span>Width</span>
                <input type="range" min={0.1} max={20} step={0.1} value={emitter.shapeBox.x} 
                  onChange={e => updateEmitter({ shapeBox: { ...emitter.shapeBox, x: parseFloat(e.target.value) } })} />
                <span className="kv-field-val">{emitter.shapeBox.x.toFixed(1)}</span>
              </div>
              <div className="kv-field-row">
                <span>Height</span>
                <input type="range" min={0.1} max={20} step={0.1} value={emitter.shapeBox.y} 
                  onChange={e => updateEmitter({ shapeBox: { ...emitter.shapeBox, y: parseFloat(e.target.value) } })} />
                <span className="kv-field-val">{emitter.shapeBox.y.toFixed(1)}</span>
              </div>
              <div className="kv-field-row">
                <span>Depth</span>
                <input type="range" min={0.1} max={20} step={0.1} value={emitter.shapeBox.z} 
                  onChange={e => updateEmitter({ shapeBox: { ...emitter.shapeBox, z: parseFloat(e.target.value) } })} />
                <span className="kv-field-val">{emitter.shapeBox.z.toFixed(1)}</span>
              </div>
            </>
          )}

          {emitter.shape === 'sphere' && (
            <div className="kv-field-row">
              <span>Radius</span>
              <input type="range" min={0.1} max={10} step={0.1} value={emitter.shapeRadius} 
                onChange={e => updateEmitter({ shapeRadius: parseFloat(e.target.value) })} />
              <span className="kv-field-val">{emitter.shapeRadius.toFixed(1)}</span>
            </div>
          )}

          {emitter.shape === 'cone' && (
            <>
              <div className="kv-field-row">
                <span>Radius</span>
                <input type="range" min={0.1} max={10} step={0.1} value={emitter.shapeRadius} 
                  onChange={e => updateEmitter({ shapeRadius: parseFloat(e.target.value) })} />
                <span className="kv-field-val">{emitter.shapeRadius.toFixed(1)}</span>
              </div>
              <div className="kv-field-row">
                <span>Angle</span>
                <input type="range" min={5} max={90} step={1} value={emitter.shapeAngle} 
                  onChange={e => updateEmitter({ shapeAngle: parseFloat(e.target.value) })} />
                <span className="kv-field-val">{emitter.shapeAngle}°</span>
              </div>
            </>
          )}

          <div className="kv-field">
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input type="checkbox" checked={emitter.emitFromEdge} onChange={e => updateEmitter({ emitFromEdge: e.target.checked })} />
              <span>Emit from Edge</span>
            </label>
          </div>
        </div>
      )}

      {activeTab === 'render' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div className="kv-field">
            <span>Render Mode</span>
            <select value={emitter.renderMode} onChange={e => updateEmitter({ renderMode: e.target.value as ParticleRenderMode })}>
              {RENDER_OPTIONS.map(r => (
                <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
              ))}
            </select>
          </div>

          <div className="kv-field">
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input type="checkbox" checked={emitter.simulationSpace === 'world'} 
                onChange={e => updateEmitter({ simulationSpace: e.target.checked ? 'world' : 'local' })} />
              <span>World Space</span>
            </label>
          </div>

          <div className="kv-field-row">
            <span>Start Rotation</span>
            <input type="range" min={0} max={360} step={1} value={emitter.startRotation} 
              onChange={e => updateEmitter({ startRotation: parseFloat(e.target.value) })} />
            <span className="kv-field-val">{emitter.startRotation}°</span>
          </div>

          <div className="kv-field-row">
            <span>Rotation Speed</span>
            <input type="range" min={-20} max={20} step={0.5} value={emitter.rotationSpeed} 
              onChange={e => updateEmitter({ rotationSpeed: parseFloat(e.target.value) })} />
            <span className="kv-field-val">{emitter.rotationSpeed.toFixed(1)}</span>
          </div>

          <div className="kv-field-row">
            <span>Size Over Life</span>
            <input type="range" min={0} max={3} step={0.1} value={emitter.sizeMultiplier} 
              onChange={e => updateEmitter({ sizeMultiplier: parseFloat(e.target.value) })} />
            <span className="kv-field-val">{emitter.sizeMultiplier.toFixed(1)}x</span>
          </div>
        </div>
      )}

      <button 
        className="kv-add-component-btn" 
        style={{ marginTop: 'auto', background: '#e06c75' }}
        onClick={() => { updateEntity(selectedId, { particleEmitter: undefined}); log('Removed Particle Emitter'); }}
      >
        Remove Emitter
      </button>
    </div>
  );
}

export default ParticlePanel;
