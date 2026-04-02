// ============================================================
// KEVLA ENGINE — Sculpt Layers System v3.0
// Non-destructive sculpt layers with blending and masking
// ============================================================

import type { SculptLayer, SculptLayerStack, LayerBlendMode } from './types';

let _layerCounter = 0;
const uid = () => `layer_${Date.now()}_${_layerCounter++}`;

export class SculptLayerSystem {
  private stack: SculptLayerStack;

  constructor() {
    this.stack = { layers: [], activeLayerId: null, bakedDisplacement: null };
  }

  getStack() { return this.stack; }

  addLayer(name: string, vertexCount: number): string {
    const layer: SculptLayer = {
      id: uid(),
      name,
      visible: true,
      locked: false,
      blendMode: 'add',
      opacity: 1.0,
      displacement: new Float32Array(vertexCount * 3),
      mask: null,
      brushType: 'clay',
      brushSize: 0.5,
      brushStrength: 0.3,
      timestamp: Date.now(),
    };
    this.stack.layers.push(layer);
    this.stack.activeLayerId = layer.id;
    return layer.id;
  }

  removeLayer(id: string) {
    const idx = this.stack.layers.findIndex(l => l.id === id);
    if (idx === -1) return;
    this.stack.layers.splice(idx, 1);
    if (this.stack.activeLayerId === id) {
      this.stack.activeLayerId = this.stack.layers.length > 0 ? this.stack.layers[this.stack.layers.length - 1].id : null;
    }
  }

  setActiveLayer(id: string) {
    if (this.stack.layers.some(l => l.id === id)) {
      this.stack.activeLayerId = id;
    }
  }

  getActiveLayer(): SculptLayer | null {
    if (!this.stack.activeLayerId) return null;
    return this.stack.layers.find(l => l.id === this.stack.activeLayerId) || null;
  }

  setLayerBlendMode(id: string, mode: LayerBlendMode) {
    const layer = this.stack.layers.find(l => l.id === id);
    if (layer) layer.blendMode = mode;
  }

  setLayerOpacity(id: string, opacity: number) {
    const layer = this.stack.layers.find(l => l.id === id);
    if (layer) layer.opacity = Math.max(0, Math.min(1, opacity));
  }

  setLayerVisibility(id: string, visible: boolean) {
    const layer = this.stack.layers.find(l => l.id === id);
    if (layer) layer.visible = visible;
  }

  setLayerMask(id: string, mask: Float32Array) {
    const layer = this.stack.layers.find(l => l.id === id);
    if (layer) layer.mask = mask;
  }

  applyDisplacementToLayer(layerId: string, deltas: { index: number; dx: number; dy: number; dz: number }[]) {
    const layer = this.stack.layers.find(l => l.id === layerId);
    if (!layer || !layer.displacement || layer.locked) return;

    for (const d of deltas) {
      const i = d.index * 3;
      layer.displacement[i] += d.dx;
      layer.displacement[i + 1] += d.dy;
      layer.displacement[i + 2] += d.dz;
    }
  }

  bakeLayers(vertexCount: number): Float32Array {
    const result = new Float32Array(vertexCount * 3);

    for (const layer of this.stack.layers) {
      if (!layer.visible || !layer.displacement) continue;

      const effectiveOpacity = layer.opacity;
      for (let i = 0; i < vertexCount * 3; i++) {
        let value = layer.displacement[i] * effectiveOpacity;

        if (layer.mask) {
          const vertexIdx = Math.floor(i / 3);
          if (vertexIdx < layer.mask.length) {
            value *= layer.mask[vertexIdx];
          }
        }

        switch (layer.blendMode) {
          case 'add': result[i] += value; break;
          case 'subtract': result[i] -= value; break;
          case 'multiply': result[i] *= (1 + value); break;
          case 'overlay': result[i] += value > 0 ? value * 0.5 : value * 2; break;
          case 'softLight': result[i] += value * 0.7; break;
          case 'hardLight': result[i] += value * 1.3; break;
        }
      }
    }

    this.stack.bakedDisplacement = result;
    return result;
  }

  clearBaked() { this.stack.bakedDisplacement = null; }

  reorderLayer(id: string, newIndex: number) {
    const idx = this.stack.layers.findIndex(l => l.id === id);
    if (idx === -1 || newIndex < 0 || newIndex >= this.stack.layers.length) return;
    const [layer] = this.stack.layers.splice(idx, 1);
    this.stack.layers.splice(newIndex, 0, layer);
  }

  duplicateLayer(id: string): string | null {
    const source = this.stack.layers.find(l => l.id === id);
    if (!source) return null;

    const copy: SculptLayer = {
      ...source,
      id: uid(),
      name: source.name + ' Copy',
      displacement: source.displacement ? new Float32Array(source.displacement) : null,
      mask: source.mask ? new Float32Array(source.mask) : null,
      timestamp: Date.now(),
    };

    const insertIdx = this.stack.layers.findIndex(l => l.id === id) + 1;
    this.stack.layers.splice(insertIdx, 0, copy);
    this.stack.activeLayerId = copy.id;
    return copy.id;
  }

  mergeDown(id: string) {
    const idx = this.stack.layers.findIndex(l => l.id === id);
    if (idx <= 0) return;

    const upper = this.stack.layers[idx];
    const lower = this.stack.layers[idx - 1];

    if (upper.displacement && lower.displacement) {
      for (let i = 0; i < upper.displacement.length; i++) {
        lower.displacement[i] += upper.displacement[i] * upper.opacity;
      }
    }

    this.stack.layers.splice(idx, 1);
    this.stack.activeLayerId = lower.id;
  }

  flattenAll(vertexCount: number): Float32Array {
    const baked = this.bakeLayers(vertexCount);
    this.stack.layers = [];
    this.stack.activeLayerId = null;
    return baked;
  }
}
