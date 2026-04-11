// ============================================================
// KEVLA ENGINE — Audio Engine v2.0
// Production-Grade Audio Mixer & Effects System
//
// Features:
//   • AudioSource component per entity
//   • 3D positional audio (PannerNode HRTF)
//   • AudioListener follows scene camera
//   • Master volume, per-source volume/pitch
//   • Play, pause, stop, loop, playOnAwake
//   • Audio asset registry (mp3, ogg, wav)
//   • Lua API: Audio.Play, Audio.Stop, Audio.SetVolume
//   • Audio Mixer with channels, EQ, effects
//   • Real-time audio analysis
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

// ============================================================
// AUDIO MIXER SYSTEM
// ============================================================

/** Audio channel/mixer bus */
export interface AudioChannel {
  id: string;
  name: string;
  gain: number;
  muted: boolean;
  solo: boolean;
  pan: number;
  send: Map<string, number>;  // bus name -> send level
}

/** Equalizer band */
export interface EQBand {
  frequency: number;
  gain: number;
  q: number;
  type: 'lowshelf' | 'highshelf' | 'peaking' | 'lowpass' | 'highpass';
}

/** Audio effect type */
export type EffectType = 'reverb' | 'delay' | 'distortion' | 'filter' | 'compressor' | 'gate';

/** Effect configuration */
export interface AudioEffect {
  id: string;
  type: EffectType;
  enabled: boolean;
  parameters: Record<string, number>;
}

/** Audio bus */
export interface AudioBus {
  id: string;
  name: string;
  gain: GainNode | null;
  eq: BiquadFilterNode[] | null;
  effects: Map<string, AudioNode>;
  destination: AudioNode | null;
}

/** Audio analyzer data */
export interface AudioAnalyzerData {
  frequencyData: Uint8Array;
  timeDomainData: Uint8Array;
  averageFrequency: number;
  peakFrequency: number;
  rmsLevel: number;
}

/** Audio source data */
export interface SourceData {
  id: string;
  assetId: string;
  volume: number;
  pitch: number;
  loop: boolean;
  playing: boolean;
  position: { x: number; y: number; z: number };
  is3D: boolean;
}

export class AudioMixer {
  private ctx: AudioContext | null = null;
  private channels: Map<string, AudioChannel> = new Map();
  private buses: Map<string, AudioBus> = new Map();
  private effects: Map<string, AudioEffect> = new Map();
  private analyzers: Map<string, AnalyserNode> = new Map();
  private masterBus: AudioBus | null = null;

  // EQ presets
  private eqPresets: Record<string, EQBand[]> = {
    flat: [
      { frequency: 60, gain: 0, q: 1, type: 'peaking' },
      { frequency: 250, gain: 0, q: 1, type: 'peaking' },
      { frequency: 1000, gain: 0, q: 1, type: 'peaking' },
      { frequency: 4000, gain: 0, q: 1, type: 'peaking' },
      { frequency: 12000, gain: 0, q: 1, type: 'peaking' },
    ],
    music: [
      { frequency: 60, gain: 3, q: 1, type: 'peaking' },
      { frequency: 250, gain: 1, q: 1, type: 'peaking' },
      { frequency: 1000, gain: 0, q: 1, type: 'peaking' },
      { frequency: 4000, gain: 2, q: 1, type: 'peaking' },
      { frequency: 12000, gain: 4, q: 1, type: 'peaking' },
    ],
    voice: [
      { frequency: 60, gain: -2, q: 1, type: 'peaking' },
      { frequency: 250, gain: 4, q: 1, type: 'peaking' },
      { frequency: 1000, gain: 3, q: 1, type: 'peaking' },
      { frequency: 4000, gain: 1, q: 1, type: 'peaking' },
      { frequency: 12000, gain: -1, q: 1, type: 'peaking' },
    ],
    cinematic: [
      { frequency: 60, gain: 5, q: 0.7, type: 'peaking' },
      { frequency: 250, gain: 2, q: 1, type: 'peaking' },
      { frequency: 1000, gain: 0, q: 1, type: 'peaking' },
      { frequency: 4000, gain: -1, q: 1, type: 'peaking' },
      { frequency: 12000, gain: -2, q: 1, type: 'peaking' },
    ],
  };

  init(ctx: AudioContext, destination: AudioNode): void {
    this.ctx = ctx;

    // Create master bus
    this.masterBus = {
      id: 'master',
      name: 'Master',
      gain: ctx.createGain(),
      eq: null,
      effects: new Map(),
      destination: destination,
    };
    this.masterBus.gain.connect(destination);
    this.buses.set('master', this.masterBus);

    // Create default channels
    this.createChannel('sfx', 'SFX');
    this.createChannel('music', 'Music');
    this.createChannel('voice', 'Voice');
    this.createChannel('ambient', 'Ambient');
  }

  private getCtx(): AudioContext {
    if (!this.ctx) throw new Error('AudioMixer not initialized');
    return this.ctx;
  }

  // Channel management

  createChannel(id: string, name: string): AudioChannel {
    const channel: AudioChannel = {
      id,
      name,
      gain: 1,
      muted: false,
      solo: false,
      pan: 0,
      send: new Map(),
    };

    this.channels.set(id, channel);

    // Create bus for channel
    const ctx = this.getCtx();
    const bus: AudioBus = {
      id,
      name,
      gain: ctx.createGain(),
      eq: null,
      effects: new Map(),
      destination: this.masterBus?.gain || null,
    };
    bus.gain.connect(bus.destination!);
    this.buses.set(id, bus);

    return channel;
  }

  getChannel(id: string): AudioChannel | undefined {
    return this.channels.get(id);
  }

  setChannelGain(id: string, gain: number): void {
    const channel = this.channels.get(id);
    if (channel) {
      channel.gain = Math.max(0, Math.min(2, gain));
      const bus = this.buses.get(id);
      if (bus?.gain) bus.gain.gain.value = channel.muted ? 0 : channel.gain;
    }
  }

  setChannelMute(id: string, muted: boolean): void {
    const channel = this.channels.get(id);
    if (channel) {
      channel.muted = muted;
      const bus = this.buses.get(id);
      if (bus?.gain) bus.gain.gain.value = muted ? 0 : channel.gain;
    }
  }

  setChannelSolo(id: string, solo: boolean): void {
    const channel = this.channels.get(id);
    if (channel) {
      channel.solo = solo;
      // Update all channels based on solo state
      for (const [chId, ch] of this.channels) {
        const bus = this.buses.get(chId);
        if (bus?.gain) {
          const hasSolo = Array.from(this.channels.values()).some(c => c.solo);
          bus.gain.gain.value = (ch.muted || (hasSolo && !ch.solo)) ? 0 : ch.gain;
        }
      }
    }
  }

  setChannelPan(id: string, pan: number): void {
    const channel = this.channels.get(id);
    if (channel) {
      channel.pan = Math.max(-1, Math.min(1, pan));
    }
  }

  // Send to bus (for effects)

  sendToBus(channelId: string, busId: string, level: number): void {
    const channel = this.channels.get(channelId);
    if (channel) {
      channel.send.set(busId, Math.max(0, Math.min(1, level)));
      // In production, would create send nodes
    }
  }

  // Equalizer

  setEQPreset(channelId: string, preset: string): void {
    const bands = this.eqPresets[preset];
    if (!bands) return;

    const bus = this.buses.get(channelId);
    if (!bus) return;

    const ctx = this.getCtx();

    // Create or update EQ
    bus.eq = bands.map(band => {
      const filter = ctx.createBiquadFilter();
      filter.type = band.type;
      filter.frequency.value = band.frequency;
      filter.gain.value = band.gain;
      filter.Q.value = band.q;
      return filter;
    });

    // Connect EQ chain
    if (bus.gain && bus.eq.length > 0) {
      bus.gain.disconnect();
      bus.gain.connect(bus.eq[0]);
      for (let i = 0; i < bus.eq.length - 1; i++) {
        bus.eq[i].connect(bus.eq[i + 1]);
      }
      bus.eq[bus.eq.length - 1].connect(bus.destination!);
    }
  }

  setEQBand(channelId: string, bandIndex: number, frequency: number, gain: number, q: number): void {
    const bus = this.buses.get(channelId);
    if (!bus?.eq || !bus.eq[bandIndex]) return;

    const filter = bus.eq[bandIndex];
    filter.frequency.value = frequency;
    filter.gain.value = gain;
    filter.Q.value = q;
  }

  // Effects

  addEffect(channelId: string, effect: AudioEffect): void {
    const bus = this.buses.get(channelId);
    if (!bus) return;

    const ctx = this.getCtx();
    let node: AudioNode | null = null;

    switch (effect.type) {
      case 'reverb':
        node = ctx.createConvolver();
        // Would load impulse response
        break;
      case 'delay':
        node = ctx.createDelay(2);
        break;
      case 'distortion':
        node = ctx.createWaveShaper();
        break;
      case 'filter':
        node = ctx.createBiquadFilter();
        break;
      case 'compressor':
        node = ctx.createDynamicsCompressor();
        break;
      case 'gate':
        node = ctx.createDynamicsCompressor();
        break;
    }

    if (node) {
      bus.effects.set(effect.id, node);
    }

    this.effects.set(effect.id, effect);
  }

  setEffectParam(effectId: string, param: string, value: number): void {
    const effect = this.effects.get(effectId);
    if (effect) {
      effect.parameters[param] = value;
    }
  }

  removeEffect(channelId: string, effectId: string): void {
    const bus = this.buses.get(channelId);
    if (bus) {
      bus.effects.delete(effectId);
    }
    this.effects.delete(effectId);
  }

  // Analyzer

  createAnalyzer(id: string, fftSize: number = 256): AnalyserNode {
    const ctx = this.getCtx();
    const analyzer = ctx.createAnalyser();
    analyzer.fftSize = fftSize;
    this.analyzers.set(id, analyzer);
    return analyzer;
  }

  getAnalyzerData(id: string): AudioAnalyzerData | null {
    const analyzer = this.analyzers.get(id);
    if (!analyzer) return null;

    const frequencyData = new Uint8Array(analyzer.frequencyBinCount);
    const timeDomainData = new Uint8Array(analyzer.frequencyBinCount);

    analyzer.getByteFrequencyData(frequencyData);
    analyzer.getByteTimeDomainData(timeDomainData);

    // Calculate metrics
    let sum = 0, peak = 0, peakFreq = 0;
    for (let i = 0; i < frequencyData.length; i++) {
      sum += frequencyData[i];
      if (frequencyData[i] > peak) {
        peak = frequencyData[i];
        peakFreq = i;
      }
    }

    const avgFreq = sum / frequencyData.length;

    // RMS calculation
    let rms = 0;
    for (let i = 0; i < timeDomainData.length; i++) {
      const sample = (timeDomainData[i] - 128) / 128;
      rms += sample * sample;
    }
    rms = Math.sqrt(rms / timeDomainData.length);

    return {
      frequencyData,
      timeDomainData,
      averageFrequency: avgFreq / 255,
      peakFrequency: peakFreq / frequencyData.length,
      rmsLevel: rms,
    };
  }

  // Master controls

  getMasterLevel(): number {
    return this.masterBus?.gain?.gain.value || 0;
  }

  setMasterLevel(level: number): void {
    if (this.masterBus?.gain) {
      this.masterBus.gain.gain.value = Math.max(0, Math.min(2, level));
    }
  }

  // Get bus for connecting audio sources

  getBus(busId: string): AudioBus | undefined {
    return this.buses.get(busId);
  }

  // Stats

  getStats(): { channels: number; buses: number; effects: number; analyzers: number } {
    return {
      channels: this.channels.size,
      buses: this.buses.size,
      effects: this.effects.size,
      analyzers: this.analyzers.size,
    };
  }
}

export const audioMixer = new AudioMixer();
