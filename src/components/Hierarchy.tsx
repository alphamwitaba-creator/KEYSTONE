// ============================================================
// KEVLA ENGINE — Hierarchy Panel v2.0
// NEW: Multi-select (Ctrl+click, Shift+click), Undo/Redo,
//      Prefab create, audio/animSM badges
// ============================================================

import { useState, useRef, useEffect } from 'react';
import { useEngineStore } from '../engine/store';
import type { MeshType } from '../engine/types';
import { Icon, MeshIcon } from './Icons';

const MESH_OPTIONS: { type: MeshType; label: string }[] = [
  { type: 'cube', label: 'Cube' }, { type: 'sphere', label: 'Sphere' },
  { type: 'cylinder', label: 'Cylinder' }, { type: 'plane', label: 'Plane' },
  { type: 'cone', label: 'Cone' }, { type: 'torus', label: 'Torus' },
];

export default function Hierarchy() {
  const entities          = useEngineStore(s => s.entities);
  const selectedId        = useEngineStore(s => s.selectedId);
  const selectedIds       = useEngineStore(s => s.selectedIds);
  const selectEntity      = useEngineStore(s => s.selectEntity);
  const toggleSelectEntity= useEngineStore(s => s.toggleSelectEntity);
  const selectAll         = useEngineStore(s => s.selectAll);
  const clearSelection    = useEngineStore(s => s.clearSelection);
  const deleteSelected    = useEngineStore(s => s.deleteSelected);
  const duplicateSelected = useEngineStore(s => s.duplicateSelected);
  const removeEntity      = useEngineStore(s => s.removeEntity);
  const duplicateEntity   = useEngineStore(s => s.duplicateEntity);
  const addEntity         = useEngineStore(s => s.addEntity);
  const toggleEntityActive= useEngineStore(s => s.toggleEntityActive);
  const renameEntity      = useEngineStore(s => s.renameEntity);
  const isPlaying         = useEngineStore(s => s.isPlaying);
  const undo              = useEngineStore(s => s.undo);
  const redo              = useEngineStore(s => s.redo);
  const undoStack         = useEngineStore(s => s.undoStack);
  const redoStack         = useEngineStore(s => s.redoStack);
  const createPrefab      = useEngineStore(s => s.createPrefab);

  const [showAddMenu, setShowAddMenu] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId && inputRef.current) { inputRef.current.focus(); inputRef.current.select(); }
  }, [editingId]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) { e.preventDefault(); redo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') { e.preventDefault(); selectAll(); }
      if (e.key === 'Delete' && selectedIds.size > 0 && !isPlaying) { deleteSelected(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo, selectAll, deleteSelected, selectedIds, isPlaying]);

  const commitRename = () => {
    if (editingId && editName.trim()) renameEntity(editingId, editName.trim());
    setEditingId(null);
  };

  const filteredEntities = searchQuery
    ? entities.filter(e => e.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : entities;

  const multiSelected = selectedIds.size > 1;

  return (
    <div className="kv-panel">
      <div className="kv-panel-header">
        <Icon name="layout" size={12} />
        <span>Hierarchy</span>
        <div className="kv-panel-actions">
          {/* Undo/Redo */}
          <button className="kv-icon-btn" onClick={undo} disabled={undoStack.length === 0} title="Undo (Ctrl+Z)">
            <Icon name="undo" size={13} />
          </button>
          <button className="kv-icon-btn" onClick={redo} disabled={redoStack.length === 0} title="Redo (Ctrl+Y)">
            <Icon name="redo" size={13} />
          </button>
          <div className="kv-add-wrapper">
            <button className="kv-icon-btn" onClick={() => setShowAddMenu(!showAddMenu)} title="Add Entity" disabled={isPlaying}>
              <Icon name="plus" size={14} />
            </button>
            {showAddMenu && (
              <div className="kv-dropdown" style={{ right: 0, top: '100%' }}>
                {MESH_OPTIONS.map(opt => (
                  <button key={opt.type} className="kv-dropdown-item" onClick={() => { addEntity(opt.type); setShowAddMenu(false); }}>
                    <MeshIcon type={opt.type} size={13} />
                    <span className="kv-dropdown-label">{opt.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Multi-select toolbar */}
      {multiSelected && (
        <div className="kv-multiselect-bar">
          <span className="kv-multiselect-count">{selectedIds.size} selected</span>
          <button className="kv-icon-btn-sm" onClick={duplicateSelected} title="Duplicate selected"><Icon name="copy" size={11} /></button>
          <button className="kv-icon-btn-sm kv-delete-btn" onClick={deleteSelected} title="Delete selected"><Icon name="trash" size={11} /></button>
          <button className="kv-icon-btn-sm" onClick={clearSelection} title="Clear selection"><Icon name="x" size={11} /></button>
        </div>
      )}

      {/* Search */}
      <div className="kv-search-bar">
        <Icon name="search" size={12} color="#666" />
        <input type="text" placeholder="Search entities..." value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)} />
        {searchQuery && (
          <button className="kv-search-clear" onClick={() => setSearchQuery('')}><Icon name="x" size={10} /></button>
        )}
      </div>

      <div className="kv-panel-body kv-hierarchy-list">
        {filteredEntities.length === 0 && (
          <div className="kv-empty">{searchQuery ? 'No matching entities' : 'Empty scene — click + to add'}</div>
        )}

        {filteredEntities.map(entity => {
          const isSelected = selectedIds.has(entity.id) || entity.id === selectedId;
          const meshType = entity.meshRenderer?.meshType || 'cube';

          return (
            <div
              key={entity.id}
              className={`kv-hierarchy-item ${isSelected ? 'selected' : ''} ${!entity.active ? 'inactive' : ''}`}
              onClick={e => {
                if (e.ctrlKey || e.metaKey) toggleSelectEntity(entity.id, true);
                else selectEntity(entity.id);
              }}
              onDoubleClick={() => { setEditingId(entity.id); setEditName(entity.name); }}
            >
              <button className="kv-vis-toggle"
                onClick={ev => { ev.stopPropagation(); toggleEntityActive(entity.id); }}
                title={entity.active ? 'Hide' : 'Show'}>
                <Icon name={entity.active ? 'eye' : 'eyeOff'} size={12} />
              </button>

              <span className="kv-entity-icon"><MeshIcon type={meshType} size={13} /></span>

              {editingId === entity.id ? (
                <input ref={inputRef} className="kv-rename-input" value={editName}
                  onChange={e => setEditName(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setEditingId(null); }}
                  onClick={e => e.stopPropagation()} />
              ) : (
                <span className="kv-entity-label">{entity.name}</span>
              )}

              <div className="kv-entity-badges">
                {entity.rigidbody && <span className="kv-badge kv-badge-phys" title="Rigidbody">RB</span>}
                {entity.collider && <span className="kv-badge kv-badge-col" title="Collider">C</span>}
                {entity.scripts.length > 0 && <span className="kv-badge kv-badge-lua" title="Scripts">S</span>}
                {entity.audioSource && <span className="kv-badge kv-badge-audio" title="AudioSource">♪</span>}
                {entity.animStateMachine && <span className="kv-badge kv-badge-anim" title="State Machine">SM</span>}
              </div>

              {isSelected && !multiSelected && !isPlaying && (
                <div className="kv-entity-actions">
                  <button onClick={e => { e.stopPropagation(); createPrefab(entity.id); }} title="Save as Prefab">
                    <Icon name="save" size={11} />
                  </button>
                  <button onClick={e => { e.stopPropagation(); duplicateEntity(entity.id); }} title="Duplicate">
                    <Icon name="copy" size={11} />
                  </button>
                  <button onClick={e => { e.stopPropagation(); removeEntity(entity.id); }} title="Delete" className="kv-delete-btn">
                    <Icon name="trash" size={11} />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="kv-panel-footer">
        <span>{entities.length} entit{entities.length === 1 ? 'y' : 'ies'}</span>
        {selectedIds.size > 0 && <span className="kv-filter-badge">{selectedIds.size} selected</span>}
        {searchQuery && <span className="kv-filter-badge">{filteredEntities.length} shown</span>}
      </div>
    </div>
  );
}
