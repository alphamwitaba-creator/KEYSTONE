// ============================================================
// KEVLA ENGINE — PROFILER & DEBUGGER v2.0
// Production-Grade Performance Profiling System
//
// Architecture:
//   ┌─────────────────────────────────────────────────────────┐
//   │             PROFILER & DEBUGGER                         │
//   │                                                          │
//   │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │
//   │  │  CPU        │  │   GPU       │  │   Memory        │  │
//   │  │  Profiler   │  │   Profiler  │  │   Profiler      │  │
//   │  └─────────────┘  └─────────────┘  └─────────────────┘  │
//   │                                                          │
//   │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │
//   │  │  Timeline    │  │   Stats      │  │   Warnings      │  │
//   │  │  Recorder    │  │   Collector  │  │   & Errors      │  │
//   │  └─────────────┘  └─────────────┘  └─────────────────┘  │
//   │                                                          │
//   │  ┌─────────────────────────────────────────────────────┐│
//   │  │           Debug Visualization UI                   ││
//   │  └─────────────────────────────────────────────────────┘│
//   └─────────────────────────────────────────────────────────┘
//
// Features:
//   • CPU profiling with call stack
//   • GPU frame timing
//   • Memory tracking
//   • Timeline recording
//   • Custom markers
//   • Performance warnings
// ============================================================

// ============================================================
// TYPES — Profiler Data Structures
// ============================================================

/** Profile sample */
export interface ProfileSample {
  name: string;
  startTime: number;
  endTime: number;
  duration: number;
  depth: number;
  callCount: number;
  parent: string | null;
  children: string[];
}

/** Profile statistics */
export interface ProfileStats {
  name: string;
  totalTime: number;
  selfTime: number;
  callCount: number;
  avgTime: number;
  minTime: number;
  maxTime: number;
  percentage: number;
}

/** Frame timing */
export interface FrameTiming {
  frame: number;
  totalTime: number;
  physicsTime: number;
  renderTime: number;
  scriptTime: number;
  cullTime: number;
  updateTime: number;
}

/** Memory stats */
export interface MemoryStats {
  total: number;
  used: number;
  free: number;
  allocations: number;
  deallocations: number;
  gcCount: number;
  heapSize: number;
  heapUsed: number;
}

/** Performance warning */
export interface PerformanceWarning {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  metric: string;
  threshold: number;
  actual: number;
  timestamp: number;
  frame: number;
}

/** Debug marker */
export interface DebugMarker {
  name: string;
  color: string;
  startTime: number;
  endTime: number | null;
  depth: number;
  category: string;
}

/** Profiler configuration */
export interface ProfilerConfig {
  enabled: boolean;
  recordStackTraces: boolean;
  maxSamples: number;
  sampleInterval: number;
  warnOnFrameTime: number;
  warnOnDrawCalls: number;
  warnOnTriangles: number;
}

export const DEFAULT_PROFILER_CONFIG: ProfilerConfig = {
  enabled: true,
  recordStackTraces: false,
  maxSamples: 1000,
  sampleInterval: 0,
  warnOnFrameTime: 33,   // 30fps = 33ms
  warnOnDrawCalls: 1000,
  warnOnTriangles: 100000,
};

// ============================================================
// CPU PROFILER
// ============================================================

export class CPUProfiler {
  private samples: Map<string, ProfileSample> = new Map();
  private activeSamples: Map<string, ProfileSample> = new Map();
  private stack: string[] = [];
  private startTime: number = 0;
  private frameCount: number = 0;
  private maxSamples: number;
  private warnings: PerformanceWarning[] = [];

  constructor(maxSamples: number = 1000) {
    this.maxSamples = maxSamples;
  }

  startFrame(): void {
    this.startTime = performance.now();
    this.stack = [];
    this.activeSamples.clear();
  }

  beginSample(name: string): void {
    const now = performance.now();
    const depth = this.stack.length;
    const parent = this.stack.length > 0 ? this.stack[this.stack.length - 1] : null;

    const sample: ProfileSample = {
      name,
      startTime: now,
      endTime: 0,
      duration: 0,
      depth,
      callCount: 0,
      parent,
      children: [],
    };

    this.samples.set(name, sample);
    this.activeSamples.set(name, sample);
    this.stack.push(name);

    // Update parent children
    if (parent) {
      const parentSample = this.samples.get(parent);
      if (parentSample) {
        parentSample.children.push(name);
      }
    }
  }

  endSample(name: string): void {
    const now = performance.now();
    const sample = this.activeSamples.get(name);
    
    if (sample) {
      sample.endTime = now;
      sample.duration = now - sample.startTime;
      sample.callCount++;
      this.activeSamples.delete(name);
    }

    this.stack.pop();
  }

  endFrame(): number {
    const endTime = performance.now();
    const frameTime = endTime - this.startTime;
    this.frameCount++;

    // Check for warnings
    if (frameTime > DEFAULT_PROFILER_CONFIG.warnOnFrameTime) {
      this.warnings.push({
        id: `warn_${Date.now()}`,
        severity: frameTime > 50 ? 'critical' : 'warning',
        message: `Frame time exceeded target: ${frameTime.toFixed(1)}ms`,
        metric: 'frameTime',
        threshold: DEFAULT_PROFILER_CONFIG.warnOnFrameTime,
        actual: frameTime,
        timestamp: Date.now(),
        frame: this.frameCount,
      });
    }

    // Trim samples if needed
    if (this.samples.size > this.maxSamples) {
      const keys = Array.from(this.samples.keys());
      for (let i = 0; i < this.maxSamples / 2; i++) {
        this.samples.delete(keys[i]);
      }
    }

    return frameTime;
  }

  getStats(): ProfileStats[] {
    const stats: Map<string, ProfileStats> = new Map();

    for (const sample of this.samples.values()) {
      if (!stats.has(sample.name)) {
        stats.set(sample.name, {
          name: sample.name,
          totalTime: 0,
          selfTime: 0,
          callCount: 0,
          avgTime: 0,
          minTime: Infinity,
          maxTime: 0,
          percentage: 0,
        });
      }

      const stat = stats.get(sample.name)!;
      stat.totalTime += sample.duration;
      stat.callCount++;
      stat.minTime = Math.min(stat.minTime, sample.duration);
      stat.maxTime = Math.max(stat.maxTime, sample.duration);
    }

    // Calculate averages and percentages
    const totalTime = Array.from(this.samples.values()).reduce((sum, s) => sum + s.duration, 0);
    const results = Array.from(stats.values()).map(stat => {
      stat.avgTime = stat.totalTime / stat.callCount;
      stat.percentage = (stat.totalTime / totalTime) * 100;
      return stat;
    });

    return results.sort((a, b) => b.totalTime - a.totalTime);
  }

  getWarnings(): PerformanceWarning[] {
    return [...this.warnings].sort((a, b) => b.severity.localeCompare(a.severity));
  }

  clearWarnings(): void {
    this.warnings = [];
  }

  reset(): void {
    this.samples.clear();
    this.activeSamples.clear();
    this.stack = [];
    this.frameCount = 0;
    this.warnings = [];
  }
}

// ============================================================
// GPU PROFILER
// ============================================================

export class GPUProfiler {
  private frameTimings: FrameTiming[] = [];
  private currentFrame: FrameTiming | null = null;
  private maxFrames: number = 60;

  startFrame(frame: number): void {
    this.currentFrame = {
      frame,
      totalTime: performance.now(),
      physicsTime: 0,
      renderTime: 0,
      scriptTime: 0,
      cullTime: 0,
      updateTime: 0,
    };
  }

  beginTiming(category: 'physics' | 'render' | 'script' | 'cull' | 'update'): void {
    // In production, would use GPU timestamps
  }

  endTiming(category: 'physics' | 'render' | 'script' | 'cull' | 'update'): void {
    if (!this.currentFrame) return;
    
    const now = performance.now();
    const start = this.currentFrame.totalTime;
    
    switch (category) {
      case 'physics': this.currentFrame.physicsTime = now - start; break;
      case 'render': this.currentFrame.renderTime = now - start; break;
      case 'script': this.currentFrame.scriptTime = now - start; break;
      case 'cull': this.currentFrame.cullTime = now - start; break;
      case 'update': this.currentFrame.updateTime = now - start; break;
    }
  }

  endFrame(): void {
    if (!this.currentFrame) return;

    this.currentFrame.totalTime = performance.now() - this.currentFrame.totalTime;
    this.frameTimings.push(this.currentFrame);

    if (this.frameTimings.length > this.maxFrames) {
      this.frameTimings.shift();
    }

    this.currentFrame = null;
  }

  getAverageFrameTime(): number {
    if (this.frameTimings.length === 0) return 0;
    const sum = this.frameTimings.reduce((acc, f) => acc + f.totalTime, 0);
    return sum / this.frameTimings.length;
  }

  getFrameTimings(count: number = 60): FrameTiming[] {
    return this.frameTimings.slice(-count);
  }

  getFPS(): number {
    const avgTime = this.getAverageFrameTime();
    return avgTime > 0 ? 1000 / avgTime : 0;
  }

  getTimingBreakdown(): { category: string; avg: number; min: number; max: number }[] {
    const breakdown: { category: string; avg: number; min: number; max: number }[] = [];
    const categories: ('physicsTime' | 'renderTime' | 'scriptTime' | 'cullTime' | 'updateTime')[] = [
      'physicsTime', 'renderTime', 'scriptTime', 'cullTime', 'updateTime'
    ];

    for (const cat of categories) {
      const values = this.frameTimings.map(f => f[cat]);
      if (values.length === 0) continue;

      breakdown.push({
        category: cat.replace('Time', ''),
        avg: values.reduce((a, b) => a + b, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
      });
    }

    return breakdown;
  }
}

// ============================================================
// MEMORY PROFILER
// ============================================================

export class MemoryProfiler {
  private snapshots: MemoryStats[] = [];
  private allocations: { size: number; stack: string; time: number }[] = [];
  private maxSnapshots: number = 60;
  private startMemory: number = 0;
  private lastGC: number = 0;

  init(): void {
    if (performance.memory) {
      this.startMemory = (performance as any).memory.usedJSHeapSize;
    }
  }

  snapshot(): MemoryStats {
    const mem: MemoryStats = {
      total: 0,
      used: 0,
      free: 0,
      allocations: this.allocations.length,
      deallocations: 0,
      gcCount: 0,
      heapSize: 0,
      heapUsed: 0,
    };

    if (performance.memory) {
      const perfMem = (performance as any).memory;
      mem.total = perfMem.jsHeapSizeLimit;
      mem.used = perfMem.usedJSHeapSize;
      mem.free = perfMem.jsHeapSizeLimit - perfMem.used;
      mem.heapSize = perfMem.jsHeapSizeLimit;
      mem.heapUsed = perfMem.usedJSHeapSize;
    }

    this.snapshots.push(mem);

    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots.shift();
    }

    return mem;
  }

  trackAllocation(size: number, stack: string = ''): void {
    this.allocations.push({ size, stack, time: Date.now() });

    // Check for memory warning
    if (this.allocations.length > 1000) {
      console.warn('High allocation count detected');
    }
  }

  getCurrentUsage(): number {
    if (performance.memory) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return 0;
  }

  getMemoryGrowth(): number {
    const current = this.getCurrentUsage();
    return current - this.startMemory;
  }

  getSnapshots(count: number = 60): MemoryStats[] {
    return this.snapshots.slice(-count);
  }

  getTopAllocations(count: number = 10): { stack: string; count: number; totalSize: number }[] {
    const byStack = new Map<string, { count: number; totalSize: number }>();

    for (const alloc of this.allocations) {
      const existing = byStack.get(alloc.stack) || { count: 0, totalSize: 0 };
      existing.count++;
      existing.totalSize += alloc.size;
      byStack.set(alloc.stack, existing);
    }

    return Array.from(byStack.entries())
      .map(([stack, data]) => ({ stack, ...data }))
      .sort((a, b) => b.totalSize - a.totalSize)
      .slice(0, count);
  }

  forceGC(): void {
    if (window.gc) {
      window.gc();
      this.lastGC = Date.now();
    }
  }

  reset(): void {
    this.snapshots = [];
    this.allocations = [];
    this.startMemory = this.getCurrentUsage();
  }
}

// ============================================================
// DEBUG MARKER SYSTEM
// ============================================================

export class DebugMarkerSystem {
  private markers: DebugMarker[] = [];
  private activeMarkers: Map<string, DebugMarker> = new Map();
  private maxMarkers: number = 500;
  private categoryColors: Map<string, string> = new Map([
    ['physics', '#e74c3c'],
    ['render', '#3498db'],
    ['script', '#2ecc71'],
    ['audio', '#9b59b6'],
    ['network', '#f39c12'],
    ['ai', '#1abc9c'],
    ['default', '#95a5a6'],
  ]);

  beginMarker(name: string, category: string = 'default'): void {
    if (this.activeMarkers.has(name)) {
      this.endMarker(name);
    }

    const color = this.categoryColors.get(category) || '#95a5a6';
    
    const marker: DebugMarker = {
      name,
      color,
      startTime: performance.now(),
      endTime: null,
      depth: this.activeMarkers.size,
      category,
    };

    this.activeMarkers.set(name, marker);
    this.markers.push(marker);

    if (this.markers.length > this.maxMarkers) {
      this.markers = this.markers.slice(-this.maxMarkers / 2);
    }
  }

  endMarker(name: string): void {
    const marker = this.activeMarkers.get(name);
    if (marker) {
      marker.endTime = performance.now();
      this.activeMarkers.delete(name);
    }
  }

  getActiveMarkers(): DebugMarker[] {
    return Array.from(this.activeMarkers.values());
  }

  getMarkers(duration: number = 1000): DebugMarker[] {
    const now = performance.now();
    return this.markers.filter(m => 
      m.endTime === null || (now - m.startTime) < duration
    );
  }

  clear(): void {
    this.markers = [];
    this.activeMarkers.clear();
  }
}

// ============================================================
// STATS COLLECTOR
// ============================================================

export class StatsCollector {
  private stats: Map<string, number> = new Map();
  private history: Map<string, number[]> = new Map();
  private maxHistory: number = 60;

  set(name: string, value: number): void {
    this.stats.set(name, value);

    // Add to history
    if (!this.history.has(name)) {
      this.history.set(name, []);
    }
    const hist = this.history.get(name)!;
    hist.push(value);
    if (hist.length > this.maxHistory) {
      hist.shift();
    }
  }

  increment(name: string, amount: number = 1): void {
    const current = this.stats.get(name) || 0;
    this.set(name, current + amount);
  }

  get(name: string): number {
    return this.stats.get(name) || 0;
  }

  getHistory(name: string): number[] {
    return this.history.get(name) || [];
  }

  getAverage(name: string): number {
    const hist = this.history.get(name);
    if (!hist || hist.length === 0) return 0;
    return hist.reduce((a, b) => a + b, 0) / hist.length;
  }

  getAllStats(): Record<string, number> {
    return Object.fromEntries(this.stats);
  }

  reset(): void {
    this.stats.clear();
    this.history.clear();
  }
}

// ============================================================
// MAIN PROFILER SYSTEM
// ============================================================

export class ProfilerSystem {
  config: ProfilerConfig;
  cpu: CPUProfiler;
  gpu: GPUProfiler;
  memory: MemoryProfiler;
  markers: DebugMarkerSystem;
  stats: StatsCollector;
  
  private frameNumber: number = 0;
  private isRunning: boolean = false;

  constructor(config: Partial<ProfilerConfig> = {}) {
    this.config = { ...DEFAULT_PROFILER_CONFIG, ...config };
    this.cpu = new CPUProfiler(this.config.maxSamples);
    this.gpu = new GPUProfiler();
    this.memory = new MemoryProfiler();
    this.markers = new DebugMarkerSystem();
    this.stats = new StatsCollector();
  }

  start(): void {
    this.isRunning = true;
    this.memory.init();
  }

  stop(): void {
    this.isRunning = false;
  }

  beginFrame(): void {
    if (!this.isRunning) return;
    this.frameNumber++;
    this.cpu.startFrame();
    this.gpu.startFrame(this.frameNumber);
  }

  endFrame(): void {
    if (!this.isRunning) return;
    
    const frameTime = this.cpu.endFrame();
    this.gpu.endFrame();
    this.memory.snapshot();

    // Update stats
    this.stats.set('fps', 1000 / frameTime);
    this.stats.set('frameTime', frameTime);
    this.stats.set('memory', this.memory.getCurrentUsage());
  }

  // Convenience methods matching Unity-style profiling
  startProfile(name: string): void {
    if (this.config.enabled) this.cpu.beginSample(name);
  }

  stopProfile(name: string): void {
    if (this.config.enabled) this.cpu.endSample(name);
  }

  // Scoped profile helper
  profile<T>(name: string, fn: () => T): T {
    this.startProfile(name);
    try {
      return fn();
    } finally {
      this.stopProfile(name);
    }
  }

  async profileAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    this.startProfile(name);
    try {
      return await fn();
    } finally {
      this.stopProfile(name);
    }
  }

  // Debug markers
  pushMarker(name: string, category: string = 'default'): void {
    if (this.config.enabled) this.markers.beginMarker(name, category);
  }

  popMarker(name: string): void {
    if (this.config.enabled) this.markers.endMarker(name);
  }

  // Get comprehensive report
  getReport(): {
    frame: number;
    fps: number;
    frameTime: number;
    cpu: ProfileStats[];
    gpu: { fps: number; timingBreakdown: ReturnType<GPUProfiler['getTimingBreakdown']> };
    memory: MemoryStats;
    warnings: PerformanceWarning[];
    stats: Record<string, number>;
  } {
    return {
      frame: this.frameNumber,
      fps: this.gpu.getFPS(),
      frameTime: this.stats.get('frameTime'),
      cpu: this.cpu.getStats(),
      gpu: {
        fps: this.gpu.getFPS(),
        timingBreakdown: this.gpu.getTimingBreakdown(),
      },
      memory: this.memory.snapshot(),
      warnings: this.cpu.getWarnings(),
      stats: this.stats.getAllStats(),
    };
  }

  reset(): void {
    this.frameNumber = 0;
    this.cpu.reset();
    this.memory.reset();
    this.markers.clear();
    this.stats.reset();
  }

  setConfig(config: Partial<ProfilerConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

export const profiler = new ProfilerSystem();