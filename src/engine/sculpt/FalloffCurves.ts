// ============================================================
// KEVLA ENGINE — Falloff Curves v3.0
// Custom brush falloff with editable curves
// ============================================================

export interface FalloffPoint { time: number; value: number; }

export class FalloffEvaluator {
  static evaluate(t: number, type: string, customCurve?: FalloffPoint[]): number {
    if (t >= 1) return 0;
    if (t <= 0) return 1;

    switch (type) {
      case 'smooth': return (1 - t) * (1 - t);
      case 'sharp': return t < 0.5 ? 1 : (1 - (t - 0.5) * 2) * (1 - (t - 0.5) * 2);
      case 'needle': return t < 0.2 ? 1 : Math.pow(1 - (t - 0.2) / 0.8, 3);
      case 'flat': return t < 0.8 ? 1 : (1 - t) * 5;
      case 'linear': return 1 - t;
      case 'spherical': return Math.sqrt(1 - t * t);
      case 'gaussian': return Math.exp(-4 * t * t);
      case 'custom': return customCurve ? this.interpolateCurve(t, customCurve) : (1 - t) * (1 - t);
      default: return (1 - t) * (1 - t);
    }
  }

  static interpolateCurve(t: number, points: FalloffPoint[]): number {
    if (points.length === 0) return 1 - t;
    if (points.length === 1) return points[0].value;

    if (t <= points[0].time) return points[0].value;
    if (t >= points[points.length - 1].time) return points[points.length - 1].value;

    for (let i = 0; i < points.length - 1; i++) {
      if (t >= points[i].time && t <= points[i + 1].time) {
        const range = points[i + 1].time - points[i].time;
        if (range === 0) return points[i].value;
        const alpha = (t - points[i].time) / range;
        return points[i].value + alpha * (points[i + 1].value - points[i].value);
      }
    }

    return points[points.length - 1].value;
  }

  static evaluatePressure(t: number, pressure: number, curve: string, points?: FalloffPoint[]): number {
    let pressureFactor: number;
    switch (curve) {
      case 'exponential': pressureFactor = Math.pow(pressure, 2); break;
      case 'logarithmic': pressureFactor = Math.log(1 + pressure * (Math.E - 1)) / Math.log(Math.E); break;
      case 'custom': pressureFactor = points ? this.interpolateCurve(pressure, points) : pressure; break;
      default: pressureFactor = pressure; break;
    }
    return this.evaluate(t, curve === 'custom' ? 'custom' : 'smooth') * pressureFactor;
  }
}
