import { describe, expect, it, vi } from 'vitest';
import { useHiddenLineDebug } from './useHiddenLineDebug';

describe('useHiddenLineDebug', () => {
  it('returns an unsupported state outside 3d-capable modes', () => {
    const hiddenLine = useHiddenLineDebug({
      getEngine: () => ({
        getHiddenLineSceneSnapshot: vi.fn(),
        getHiddenLineOptions: vi.fn(),
        setHiddenLineOptions: vi.fn()
      } as any),
      getActiveMode: () => '2d'
    });

    expect(hiddenLine.supportsHiddenLine.value).toBe(false);
    expect(hiddenLine.refreshSnapshot()).toBeNull();
    expect(hiddenLine.snapshot.value).toBeNull();
  });

  it('merges runtime patches into current engine hidden-line options', () => {
    const snapshot = {
      revision: 4,
      enabled: true,
      sourceCount: 1,
      ownerCount: 1,
      options: {
        enabled: true,
        profile: 'quality',
        precision: 'high',
        strategy: 'overlay2d',
        debug: false,
        visibleStyle: {},
        hiddenStyle: { dash: 2, strokeOpacity: 0.8 },
        sampling: {
          curveSegments: 64,
          surfaceStepsU: 24,
          surfaceStepsV: 24,
          adaptive: true,
          maxSubdivisions: 3
        }
      },
      stats: {
        activeSourceCount: 1,
        resolvedSourceCount: 1,
        skippedSourceCount: 0,
        disabledSourceCount: 0,
        emptySourceCount: 0,
        errorSourceCount: 0,
        triangleCount: 12,
        polylineCount: 4,
        renderedPathCount: 6
      },
      diagnostics: [],
      sources: []
    };

    const getHiddenLineOptions = vi.fn(() => ({
      enabled: true,
      profile: 'balanced',
      debug: false,
      sampling: {
        curveSegments: 48,
        surfaceStepsU: 20
      }
    }));
    const setHiddenLineOptions = vi.fn(() => snapshot);

    const hiddenLine = useHiddenLineDebug({
      getEngine: () => ({
        getHiddenLineSceneSnapshot: vi.fn(() => snapshot),
        getHiddenLineOptions,
        setHiddenLineOptions
      } as any),
      getActiveMode: () => '3d'
    });

    const result = hiddenLine.setProfile('quality');

    expect(setHiddenLineOptions).toHaveBeenCalledWith({
      enabled: true,
      profile: 'quality',
      debug: false,
      sampling: {
        curveSegments: 48,
        surfaceStepsU: 20
      },
      visibleStyle: undefined,
      hiddenStyle: undefined
    });
    expect(result).toStrictEqual(snapshot);
    expect(hiddenLine.snapshot.value).toStrictEqual(snapshot);
  });
});
