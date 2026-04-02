// ============================================================
// KEVLA ENGINE — Audio Engine v1.0
// Web Audio API 3D spatial audio:
//   • AudioSource component per entity
//   • 3D positional audio (PannerNode HRTF)
//   • AudioListener follows scene camera
//   • Master volume, per-source volume/pitch
//   • Play, pause, stop, loop, playOnAwake
//   • Audio asset registry (mp3, ogg, wav)
//   • Lua API: Audio.Play, Audio.Stop, Audio.SetVolume
// ============================================================

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private bufferCache = new Map<string, AudioBuffer>();
  private handles = new Map<string, { source: AudioBufferSourceNode; gain: GainNode; panner: PannerNode | null; playing: boolean }>();
  masterVolume = 0.8;
  enabled = true;

  private getCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.masterVolume;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  async loadAsset(assetId: string, dataUrl: string): Promise<boolean> {
    if (this.bufferCache.has(assetId)) return true;
    try {
      const ctx = this.getCtx();
      const base64 = dataUrl.split(',')[1];
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const buffer = await ctx.decodeAudioData(bytes.buffer);
      this.bufferCache.set(assetId, buffer);
      return true;
    } catch { return false; }
  }

  play(entityId: string, assetId: string, config: { volume: number; pitch: number; loop: boolean; is3D: boolean; minDistance: number; maxDistance: number; rolloffFactor: number }, position?: { x: number; y: number; z: number }): void {
    if (!this.enabled) return;
    const buffer = this.bufferCache.get(assetId);
    if (!buffer) return;
    this.stop(entityId);
    const ctx = this.getCtx();
    if (!this.masterGain) return;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = config.loop;
    source.playbackRate.value = config.pitch;
    const gain = ctx.createGain();
    gain.gain.value = config.volume;
    let panner: PannerNode | null = null;
    if (config.is3D && position) {
      panner = ctx.createPanner();
      panner.panningModel = 'HRTF';
      panner.distanceModel = 'inverse';
      panner.refDistance = config.minDistance;
      panner.maxDistance = config.maxDistance;
      panner.rolloffFactor = config.rolloffFactor;
      panner.positionX.value = position.x;
      panner.positionY.value = position.y;
      panner.positionZ.value = position.z;
      source.connect(gain); gain.connect(panner); panner.connect(this.masterGain);
    } else {
      source.connect(gain); gain.connect(this.masterGain);
    }
    source.start(0);
    const handle = { source, gain, panner, playing: true };
    source.onended = () => { if (this.handles.get(entityId) === handle) { handle.playing = false; if (!config.loop) this.handles.delete(entityId); } };
    this.handles.set(entityId, handle);
  }

  stop(entityId: string): void {
    const h = this.handles.get(entityId);
    if (!h) return;
    try { h.source.stop(); } catch {}
    h.playing = false;
    this.handles.delete(entityId);
  }

  stopAll(): void { this.handles.forEach((_, id) => this.stop(id)); }

  updatePosition(entityId: string, pos: { x: number; y: number; z: number }): void {
    const h = this.handles.get(entityId);
    if (!h?.panner) return;
    h.panner.positionX.value = pos.x;
    h.panner.positionY.value = pos.y;
    h.panner.positionZ.value = pos.z;
  }

  updateListener(pos: { x: number; y: number; z: number }): void {
    if (!this.ctx) return;
    const l = this.ctx.listener;
    if (l.positionX) { l.positionX.value = pos.x; l.positionY.value = pos.y; l.positionZ.value = pos.z; }
    else l.setPosition(pos.x, pos.y, pos.z);
  }

  setMasterVolume(vol: number): void {
    this.masterVolume = Math.max(0, Math.min(1, vol));
    if (this.masterGain) this.masterGain.gain.value = this.masterVolume;
  }

  setVolume(entityId: string, vol: number): void {
    const h = this.handles.get(entityId);
    if (h) h.gain.gain.value = vol;
  }

  isPlaying(entityId: string): boolean { return this.handles.get(entityId)?.playing ?? false; }

  dispose(): void {
    this.stopAll();
    this.ctx?.close();
    this.ctx = null; this.masterGain = null; this.bufferCache.clear();
  }
}
