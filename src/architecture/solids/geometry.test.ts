import { describe, expect, it } from 'vitest';
import type { GraphSolidBandPatch, GraphSolidSectorPatch } from './contracts';
import {
  clampSolidProgress,
  createConeSolidTopology,
  createCuboidSolidTopology,
  createCylinderSolidTopology,
  createSolidState,
  getConeSectorAngle,
  getConeSlantHeight
} from './geometry';

describe('solids geometry helpers', () => {
  it('creates a cuboid topology with six patches and five hinges', () => {
    const topology = createCuboidSolidTopology({ width: 4, height: 3, depth: 2 });

    expect(topology.rootPatchId).toBe('front');
    expect(topology.patches).toHaveLength(6);
    expect(topology.hinges).toHaveLength(5);
  });

  it('creates a cylinder net whose lateral width equals circumference', () => {
    const radius = 2;
    const topology = createCylinderSolidTopology({ radius, height: 5 });
    const lateralPatch = topology.patches.find(
      (patch): patch is GraphSolidBandPatch => patch.id === 'lateral' && patch.kind === 'band'
    );

    expect(lateralPatch?.kind).toBe('band');
    expect(lateralPatch?.net.width ?? 0).toBeCloseTo(Math.PI * 2 * radius);
  });

  it('creates a cone net whose sector angle matches circumference over slant height', () => {
    const radius = 3;
    const height = 4;
    const topology = createConeSolidTopology({ radius, height });
    const lateralPatch = topology.patches.find(
      (patch): patch is GraphSolidSectorPatch => patch.id === 'lateral' && patch.kind === 'sector'
    );
    const slantHeight = getConeSlantHeight(radius, height);
    const sectorAngle = getConeSectorAngle(radius, height);

    expect(slantHeight).toBeCloseTo(5);
    expect(lateralPatch?.kind).toBe('sector');
    expect(lateralPatch?.net.radius ?? 0).toBeCloseTo(slantHeight);
    expect(lateralPatch?.net.sweepAngle ?? 0).toBeCloseTo(sectorAngle);
  });

  it('clamps default solid state progress values', () => {
    const state = createSolidState({ unfoldProgress: 1.4, explodeProgress: -0.2 });

    expect(state.unfoldProgress).toBe(1);
    expect(state.explodeProgress).toBe(0);
    expect(clampSolidProgress(0.25)).toBe(0.25);
  });
});
