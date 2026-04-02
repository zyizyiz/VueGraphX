import { describe, expect, it, vi } from 'vitest';
import { GraphHiddenLineManager } from './manager';

describe('GraphHiddenLineManager', () => {
  it('collects source summaries for generic 3D owners', () => {
    const manager = new GraphHiddenLineManager({ mode: '3d' }, {
      enabled: true,
      sampling: {
        curveSegments: 10,
        surfaceStepsU: 4,
        surfaceStepsV: 5
      }
    });

    manager.registerSource('shape_cube', {
      debugLabel: 'cube-mesh',
      resolve: () => ({
        kind: 'mesh',
        vertices: [
          { x: 0, y: 0, z: 0 },
          { x: 1, y: 0, z: 0 },
          { x: 0, y: 1, z: 0 }
        ],
        faces: [
          { indices: [0, 1, 2] }
        ]
      })
    });

    manager.registerSource('command_surface', {
      debugLabel: 'surface',
      resolve: () => ({
        kind: 'surface',
        uRange: [0, 1],
        vRange: [0, 1],
        stepsU: 2,
        stepsV: 3,
        evaluate: () => ({ x: 0, y: 0, z: 0 }),
        featureCurves: [
          {
            range: [0, 1],
            evaluate: () => ({ x: 0, y: 0, z: 0 })
          }
        ]
      })
    });

    const snapshot = manager.update();

    expect(snapshot.enabled).toBe(true);
    expect(snapshot.sourceCount).toBe(2);
    expect(snapshot.ownerCount).toBe(2);
    expect(snapshot.stats).toEqual({
      activeSourceCount: 2,
      resolvedSourceCount: 2,
      skippedSourceCount: 0,
      disabledSourceCount: 0,
      emptySourceCount: 0,
      errorSourceCount: 0,
      triangleCount: 13,
      polylineCount: 4,
      renderedPathCount: 0
    });
    expect(snapshot.diagnostics).toEqual([]);
    expect(snapshot.sources).toEqual([
      expect.objectContaining({
        ownerId: 'shape_cube',
        kind: 'mesh',
        edgeCount: 3,
        faceCount: 1
      }),
      expect.objectContaining({
        ownerId: 'command_surface',
        kind: 'surface',
        edgeCount: 1,
        faceCount: 12
      })
    ]);
  });

  it('supports owner cleanup and disposable handles', () => {
    const manager = new GraphHiddenLineManager({ mode: '3d' }, { enabled: true });

    const firstHandle = manager.registerSource('shape_a', {
      resolve: () => ({
        kind: 'curve',
        range: [0, 1],
        evaluate: () => ({ x: 0, y: 0, z: 0 })
      })
    });

    manager.registerSource('shape_a', {
      resolve: () => ({
        kind: 'polyline-set',
        polylines: [
          {
            points: [
              { x: 0, y: 0, z: 0 },
              { x: 1, y: 0, z: 0 }
            ]
          }
        ]
      })
    });

    manager.registerSource('shape_b', {
      resolve: () => ({
        kind: 'curve',
        range: [0, 1],
        evaluate: () => ({ x: 1, y: 1, z: 1 })
      })
    });

    expect(manager.getSnapshot().sourceCount).toBe(3);
    expect(firstHandle.dispose()).toBe(true);
    expect(manager.getSnapshot().sourceCount).toBe(2);

    expect(manager.clearOwnerSources('shape_a')).toBe(1);
    expect(manager.update().sources).toEqual([
      expect.objectContaining({ ownerId: 'shape_b' })
    ]);
  });

  it('resolves each source only once per update cycle', () => {
    const manager = new GraphHiddenLineManager({ mode: '3d' }, { enabled: true });
    const resolve = vi.fn(() => ({
      kind: 'curve' as const,
      range: [0, 1] as [number, number],
      evaluate: () => ({ x: 0, y: 0, z: 0 })
    }));

    manager.registerSource('shape_once', {
      debugLabel: 'single-resolve',
      resolve
    });

    manager.update();

    expect(resolve).toHaveBeenCalledTimes(1);
  });

  it('normalizes runtime quality profiles into stable options', () => {
    const manager = new GraphHiddenLineManager({ mode: '3d' }, {
      enabled: true,
      profile: 'quality',
      sampling: {
        curveSegments: 80
      }
    });

    expect(manager.getOptions()).toEqual(expect.objectContaining({
      enabled: true,
      profile: 'quality',
      precision: 'high',
      sampling: expect.objectContaining({
        curveSegments: 80,
        surfaceStepsU: 32,
        surfaceStepsV: 32,
        maxSubdivisions: 4
      })
    }));
  });

  it('reports resolve failures and empty sources in snapshot diagnostics', () => {
    const manager = new GraphHiddenLineManager({ mode: '3d' }, { enabled: true });

    manager.registerSource('shape_empty', {
      debugLabel: 'empty-shape',
      resolve: () => null
    });

    manager.registerSource('shape_throw', {
      debugLabel: 'broken-shape',
      resolve: () => {
        throw new Error('boom');
      }
    });

    const snapshot = manager.update();

    expect(snapshot.stats).toEqual(expect.objectContaining({
      activeSourceCount: 2,
      resolvedSourceCount: 0,
      skippedSourceCount: 2,
      emptySourceCount: 1,
      errorSourceCount: 1
    }));
    expect(snapshot.diagnostics).toEqual([
      expect.objectContaining({
        code: 'hidden_line_source_empty',
        severity: 'warning',
        ownerId: 'shape_empty',
        debugLabel: 'empty-shape'
      }),
      expect.objectContaining({
        code: 'hidden_line_source_resolve_failed',
        severity: 'error',
        ownerId: 'shape_throw',
        debugLabel: 'broken-shape'
      })
    ]);
  });
});
