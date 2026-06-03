import { describe, expect, it } from 'vitest';
import type { GraphClientPoint, GraphViewportSize, GraphWorldPoint } from './contracts';
import { resolveGraphOverlayPosition } from './overlayPosition';

interface TestWorldBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

const viewport: GraphViewportSize = { width: 200, height: 100 };
const point = (x: number, y: number): GraphWorldPoint => ({ dimension: '2d', x, y });

const createProjector = (bounds: TestWorldBounds) => (worldPoint: GraphWorldPoint): GraphClientPoint | null => {
  if (worldPoint.dimension !== '2d') return null;
  return {
    x: ((worldPoint.x - bounds.left) / (bounds.right - bounds.left)) * viewport.width,
    y: ((bounds.top - worldPoint.y) / (bounds.top - bounds.bottom)) * viewport.height
  };
};

describe('resolveGraphOverlayPosition', () => {
  it('projects a world anchor and applies a fixed screen offset', () => {
    const position = resolveGraphOverlayPosition({
      point: point(1, 2),
      viewport,
      project: createProjector({ left: -10, right: 10, top: 5, bottom: -5 }),
      offset: { x: 8, y: -12 }
    });

    expect(position?.anchor.x).toBeCloseTo(110);
    expect(position?.anchor.y).toBeCloseTo(30);
    expect(position?.x).toBeCloseTo(118);
    expect(position?.y).toBeCloseTo(18);
    expect(position?.offset).toEqual({ x: 8, y: -12 });
    expect(position?.visible).toBe(true);
  });

  it('moves with viewport pan while preserving the popup screen offset', () => {
    const before = resolveGraphOverlayPosition({
      point: point(0, 0),
      viewport,
      project: createProjector({ left: -10, right: 10, top: 5, bottom: -5 }),
      offset: { y: -16 }
    });
    const afterPan = resolveGraphOverlayPosition({
      point: point(0, 0),
      viewport,
      project: createProjector({ left: -5, right: 15, top: 5, bottom: -5 }),
      offset: { y: -16 }
    });

    expect(before?.anchor).toEqual({ x: 100, y: 50 });
    expect(afterPan?.anchor).toEqual({ x: 50, y: 50 });
    expect(before?.offset).toEqual(afterPan?.offset);
    expect(before?.y).toBe(34);
    expect(afterPan?.y).toBe(34);
  });

  it('reprojects on zoom without scaling the popup screen offset', () => {
    const before = resolveGraphOverlayPosition({
      point: point(1, 1),
      viewport,
      project: createProjector({ left: -10, right: 10, top: 5, bottom: -5 }),
      offset: { y: -24 }
    });
    const afterZoom = resolveGraphOverlayPosition({
      point: point(1, 1),
      viewport,
      project: createProjector({ left: -5, right: 5, top: 2.5, bottom: -2.5 }),
      offset: { y: -24 }
    });

    expect(before?.anchor.x).toBeCloseTo(110);
    expect(before?.anchor.y).toBeCloseTo(40);
    expect(afterZoom?.anchor.x).toBeCloseTo(120);
    expect(afterZoom?.anchor.y).toBeCloseTo(30);
    expect(before?.offset).toEqual({ x: 0, y: -24 });
    expect(afterZoom?.offset).toEqual({ x: 0, y: -24 });
  });

  it('reports visibility from the projected anchor and optionally clamps returned coordinates', () => {
    const position = resolveGraphOverlayPosition({
      point: point(12, 0),
      viewport,
      project: createProjector({ left: -10, right: 10, top: 5, bottom: -5 }),
      offset: { x: 40 },
      padding: { left: 10, right: 10, top: 8, bottom: 8 },
      clamp: true
    });

    expect(position?.anchor.x).toBeCloseTo(220);
    expect(position?.anchor.y).toBeCloseTo(50);
    expect(position?.x).toBeCloseTo(190);
    expect(position?.y).toBeCloseTo(50);
    expect(position?.visible).toBe(false);
  });
});
