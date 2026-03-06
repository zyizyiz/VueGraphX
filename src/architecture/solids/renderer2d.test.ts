import { describe, expect, it } from 'vitest';
import { createConeSolidTopology, createCuboidSolidTopology, createCylinderSolidTopology } from './geometry';
import { renderSolidTopology2D } from './renderer2d';

describe('solid 2d renderer', () => {
  it('renders cuboid patches in hybrid mode', () => {
    const topology = createCuboidSolidTopology({ width: 2, height: 2, depth: 2 });
    const rendered = renderSolidTopology2D(topology, {
      viewMode: 'hybrid',
      unfoldProgress: 0.5
    });

    expect(rendered.patches).toHaveLength(6);
    expect(rendered.patches.every((patch) => patch.outline.length >= 4)).toBe(true);
  });

  it('renders cylinder net using shared band and disk patch logic', () => {
    const topology = createCylinderSolidTopology({ radius: 2, height: 5, radialSegments: 24 });
    const rendered = renderSolidTopology2D(topology, {
      viewMode: 'net'
    });

    const lateral = rendered.patches.find((patch) => patch.patchId === 'lateral');
    const top = rendered.patches.find((patch) => patch.patchId === 'top');
    expect(lateral?.kind).toBe('band');
    expect(top?.kind).toBe('disk');
    expect((lateral?.outline.length ?? 0) > 20).toBe(true);
    expect((top?.outline.length ?? 0) > 20).toBe(true);
  });

  it('renders cone projected and exploded using shared sector logic', () => {
    const topology = createConeSolidTopology({ radius: 3, height: 4, radialSegments: 20 });
    const projected = renderSolidTopology2D(topology, {
      viewMode: 'projected',
      explodeProgress: 0
    });
    const exploded = renderSolidTopology2D(topology, {
      viewMode: 'projected',
      explodeProgress: 1
    });

    const projectedBase = projected.patches.find((patch) => patch.patchId === 'base');
    const explodedBase = exploded.patches.find((patch) => patch.patchId === 'base');
    expect(projected.patches).toHaveLength(2);
    expect(projected.patches.find((patch) => patch.patchId === 'lateral')?.kind).toBe('sector');
    expect(projectedBase?.outline[0]).not.toEqual(explodedBase?.outline[0]);
  });
});
