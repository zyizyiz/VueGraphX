import { describe, expect, it, vi } from 'vitest';
import type { GraphHiddenLineSceneSnapshot } from '../rendering/hiddenLine/contracts';
import { GraphXEngine } from './GraphXEngine';

const createSnapshot = (): GraphHiddenLineSceneSnapshot => ({
  revision: 3,
  enabled: true,
  sourceCount: 0,
  ownerCount: 0,
  options: {
    enabled: true,
    profile: 'quality',
    precision: 'high',
    strategy: 'overlay2d',
    debug: false,
    visibleStyle: {},
    hiddenStyle: {
      dash: 2,
      strokeOpacity: 0.8
    },
    sampling: {
      curveSegments: 80,
      surfaceStepsU: 32,
      surfaceStepsV: 32,
      adaptive: true,
      maxSubdivisions: 4
    }
  },
  stats: {
    activeSourceCount: 0,
    resolvedSourceCount: 0,
    skippedSourceCount: 0,
    disabledSourceCount: 0,
    emptySourceCount: 0,
    errorSourceCount: 0,
    triangleCount: 0,
    polylineCount: 0,
    renderedPathCount: 0
  },
  diagnostics: [],
  sources: []
});

describe('GraphXEngine.setHiddenLineOptions', () => {
  it('updates current options and refreshes the hidden-line snapshot', () => {
    const snapshot = createSnapshot();
    const setOptions = vi.fn();
    const update = vi.fn(() => snapshot);

    const engine = Object.assign(Object.create(GraphXEngine.prototype), {
      currentOptions: {
        axis: false,
        view3D: {
          fitToBoard: true,
          hiddenLine: {
            enabled: false
          }
        }
      },
      hiddenLineMgr: {
        setOptions,
        update
      }
    }) as any;

    const result = engine.setHiddenLineOptions({
      enabled: true,
      profile: 'quality',
      sampling: {
        curveSegments: 80
      }
    });

    expect(setOptions).toHaveBeenCalledWith({
      enabled: true,
      profile: 'quality',
      sampling: {
        curveSegments: 80
      }
    });
    expect(update).toHaveBeenCalledTimes(1);
    expect(result).toBe(snapshot);
    expect(engine.currentOptions).toEqual({
      axis: false,
      view3D: {
        fitToBoard: true,
        hiddenLine: {
          enabled: true,
          profile: 'quality',
          sampling: {
            curveSegments: 80
          }
        }
      }
    });
  });

  it('removes persisted hidden-line options when unset', () => {
    const snapshot = createSnapshot();
    const setOptions = vi.fn();
    const update = vi.fn(() => snapshot);

    const engine = Object.assign(Object.create(GraphXEngine.prototype), {
      currentOptions: {
        axis: false,
        view3D: {
          fitToBoard: true,
          hiddenLine: {
            enabled: true,
            profile: 'balanced'
          }
        }
      },
      hiddenLineMgr: {
        setOptions,
        update
      }
    }) as any;

    engine.setHiddenLineOptions(undefined);

    expect(setOptions).toHaveBeenCalledWith(undefined);
    expect(engine.currentOptions).toEqual({
      axis: false,
      view3D: {
        fitToBoard: true
      }
    });
  });
});
