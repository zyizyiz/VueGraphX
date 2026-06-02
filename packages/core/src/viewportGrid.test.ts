import { describe, expect, it } from 'vitest';
import {
  createCenteredWorldBoundsForViewportGrid,
  resolveGraphViewportGridOptions,
  resolveGraphViewportGridStep
} from './viewportGrid';

describe('viewport grid defaults', () => {
  it('uses a 30px unit cell when enabled', () => {
    expect(resolveGraphViewportGridOptions(true)).toMatchObject({
      enabled: true,
      cellSizePx: 30,
      lineWidth: 1
    });
  });

  it('creates centered world bounds where one unit maps to one grid cell', () => {
    expect(createCenteredWorldBoundsForViewportGrid(
      { width: 600, height: 420 },
      resolveGraphViewportGridOptions(true)
    )).toEqual({
      left: -10,
      right: 10,
      top: 7,
      bottom: -7
    });
  });

  it('coalesces dense lines for low-zoom performance', () => {
    expect(resolveGraphViewportGridStep(30, 20, resolveGraphViewportGridOptions(true))).toBe(1);
    expect(resolveGraphViewportGridStep(2, 500, resolveGraphViewportGridOptions(true))).toBeGreaterThan(1);
  });
});
