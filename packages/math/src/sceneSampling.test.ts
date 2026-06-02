import { describe, expect, it } from 'vitest';
import { clipSegmentsToBounds2D, sampleImplicitEquationSegments } from './sceneSampling';

describe('sceneSampling clipping', () => {
  it('clips polyline segments to a rectangular coordinate window', () => {
    const clipped = clipSegmentsToBounds2D([
      [{ x: -3, y: 0 }, { x: 0, y: 3 }, { x: 3, y: 0 }]
    ], { left: -2, right: 2, bottom: -1, top: 2 });

    expect(clipped[0][0]).toEqual({ x: -2, y: 1 });
    expect(clipped.at(-1)?.at(-1)).toEqual({ x: 2, y: 1 });
    expect(clipped.flat().every((point) => point.x >= -2 && point.x <= 2 && point.y >= -1 && point.y <= 2)).toBe(true);
  });

  it('clips optimized circle equation samples to requested bounds', () => {
    const segments = sampleImplicitEquationSegments('x^2 + y^2 = 5', {
      bounds: { left: -2, right: 2, bottom: -2, top: 2 }
    });

    expect(segments.length).toBeGreaterThan(0);
    expect(segments.flat().every((point) => (
      point.x >= -2 - 1e-9
      && point.x <= 2 + 1e-9
      && point.y >= -2 - 1e-9
      && point.y <= 2 + 1e-9
    ))).toBe(true);
  });
});
