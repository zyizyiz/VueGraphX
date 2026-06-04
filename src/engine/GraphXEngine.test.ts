import { describe, expect, it, vi } from 'vitest';
import type { GraphXOptions } from '../types/engine';
import { GraphXEngine } from './GraphXEngine';
import { GraphSceneStore } from '@vuegraphx/core';
import {
  DEFAULT_DISTANCE_ASSERTION_SNAP_ENTER_DELTA,
  DEFAULT_DISTANCE_ASSERTION_SNAP_EXIT_DELTA,
  DEFAULT_EQUAL_LENGTH_SNAP_ENTER_DELTA,
  DEFAULT_EQUAL_LENGTH_SNAP_EXIT_DELTA,
  DEFAULT_PARALLEL_SNAP_ENTER_ANGLE,
  DEFAULT_PARALLEL_SNAP_EXIT_ANGLE
} from '../relation/assist';

describe('GraphXEngine.projectPoint3D', () => {
  it('uses the 2D user coordinates from homogeneous 3D projection output', () => {
    const project3DTo2D = vi.fn().mockReturnValue([1, -2, 3]);
    const projectUserPoint = vi.fn().mockImplementation(([x, y]: [number, number]) => ({ x, y }));

    const fakeEngine = {
      getBoard: () => ({}) as any,
      getView3D: () => ({ project3DTo2D }) as any,
      projectUserPoint
    };

    const result = GraphXEngine.prototype.projectPoint3D.call(fakeEngine as any, [0, 0, 0]);

    expect(project3DTo2D).toHaveBeenCalledWith([0, 0, 0]);
    expect(projectUserPoint).toHaveBeenCalledWith([-2, 3]);
    expect(result).toEqual({ x: -2, y: 3 });
  });

  it('keeps compatibility with plain two-value projection outputs', () => {
    const projectUserPoint = vi.fn().mockImplementation(([x, y]: [number, number]) => ({ x, y }));

    const fakeEngine = {
      getBoard: () => ({}) as any,
      getView3D: () => ({ project3DTo2D: () => [4, 5] }) as any,
      projectUserPoint
    };

    const result = GraphXEngine.prototype.projectPoint3D.call(fakeEngine as any, [1, 2, 3]);

    expect(projectUserPoint).toHaveBeenCalledWith([4, 5]);
    expect(result).toEqual({ x: 4, y: 5 });
  });
});

describe('GraphXEngine overlay positioning', () => {
  it('resolves overlay screen position through the public projection helpers', () => {
    const projectUserPoint = vi.fn().mockImplementation(([x, y]: [number, number]) => ({
      x: x * 10 + 100,
      y: 80 - y * 10
    }));
    const fakeEngine = {
      getViewport: () => ({ width: 300, height: 200 }),
      projectUserPoint,
      projectPoint3D: vi.fn(),
      projectGraphWorldPoint(point: unknown) {
        return (GraphXEngine.prototype as any).projectGraphWorldPoint.call(this, point);
      }
    };

    const position = GraphXEngine.prototype.getOverlayPosition.call(fakeEngine as any, {
      point: [2, 3],
      offset: { x: 6, y: -18 }
    });

    expect(projectUserPoint).toHaveBeenCalledWith([2, 3]);
    expect(position).toMatchObject({
      anchor: { x: 120, y: 50 },
      x: 126,
      y: 32,
      offset: { x: 6, y: -18 },
      visible: true
    });
  });
});

describe('GraphXEngine relation assist options', () => {
  it('returns defaults and lets callers override thresholds', () => {
    const fakeEngine = {
      currentOptions: undefined,
      relationAssistOptions: {
        parallelSnapEnterAngle: DEFAULT_PARALLEL_SNAP_ENTER_ANGLE,
        parallelSnapExitAngle: DEFAULT_PARALLEL_SNAP_EXIT_ANGLE,
        perpendicularSnapEnterAngle: 3,
        perpendicularSnapExitAngle: 5,
        equalLengthSnapEnterDelta: DEFAULT_EQUAL_LENGTH_SNAP_ENTER_DELTA,
        equalLengthSnapExitDelta: DEFAULT_EQUAL_LENGTH_SNAP_EXIT_DELTA,
        distanceAssertionSnapEnterDelta: DEFAULT_DISTANCE_ASSERTION_SNAP_ENTER_DELTA,
        distanceAssertionSnapExitDelta: DEFAULT_DISTANCE_ASSERTION_SNAP_EXIT_DELTA
      },
      getRelationAssistOptions: GraphXEngine.prototype.getRelationAssistOptions
    };

    expect(GraphXEngine.prototype.getRelationAssistOptions.call(fakeEngine as any)).toEqual({
      parallelSnapEnterAngle: DEFAULT_PARALLEL_SNAP_ENTER_ANGLE,
      parallelSnapExitAngle: DEFAULT_PARALLEL_SNAP_EXIT_ANGLE,
      perpendicularSnapEnterAngle: 3,
      perpendicularSnapExitAngle: 5,
      equalLengthSnapEnterDelta: DEFAULT_EQUAL_LENGTH_SNAP_ENTER_DELTA,
      equalLengthSnapExitDelta: DEFAULT_EQUAL_LENGTH_SNAP_EXIT_DELTA,
      distanceAssertionSnapEnterDelta: DEFAULT_DISTANCE_ASSERTION_SNAP_ENTER_DELTA,
      distanceAssertionSnapExitDelta: DEFAULT_DISTANCE_ASSERTION_SNAP_EXIT_DELTA
    });

    const updated = GraphXEngine.prototype.setRelationAssistOptions.call(fakeEngine as any, {
      parallelSnapEnterAngle: 1.5,
      parallelSnapExitAngle: 2.5,
      perpendicularSnapEnterAngle: 2,
      perpendicularSnapExitAngle: 3,
      equalLengthSnapEnterDelta: 0.1,
      equalLengthSnapExitDelta: 0.2,
      distanceAssertionSnapEnterDelta: 0.1,
      distanceAssertionSnapExitDelta: 0.2
    });

    expect(updated).toEqual({
      parallelSnapEnterAngle: 1.5,
      parallelSnapExitAngle: 2.5,
      perpendicularSnapEnterAngle: 2,
      perpendicularSnapExitAngle: 3,
      equalLengthSnapEnterDelta: 0.1,
      equalLengthSnapExitDelta: 0.2,
      distanceAssertionSnapEnterDelta: 0.1,
      distanceAssertionSnapExitDelta: 0.2
    });
    expect(fakeEngine.currentOptions).toEqual({
      relationAssist: {
        parallelSnapEnterAngle: 1.5,
        parallelSnapExitAngle: 2.5,
        perpendicularSnapEnterAngle: 2,
        perpendicularSnapExitAngle: 3,
        equalLengthSnapEnterDelta: 0.1,
        equalLengthSnapExitDelta: 0.2,
        distanceAssertionSnapEnterDelta: 0.1,
        distanceAssertionSnapExitDelta: 0.2
      }
    });
  });
});

describe('GraphXEngine command backend routing', () => {
  it('allows function expressions on the JSXGraph backend after scope is serialized into the node', () => {
    const fakeEngine = {
      boardMgr: {
        mode: '2d',
        board: { create: vi.fn() }
      }
    };

    const canRender = GraphXEngine.prototype['canRenderCoreNodeWithJsxGraphBackend'].call(fakeEngine as any, {
      id: 'h',
      kind: 'command',
      type: 'function',
      payload: { expression: 'abs(x) - 1', variable: 'x' },
      layerId: 'content'
    });

    expect(canRender).toBe(true);

    const canRenderCoordinateSystem = GraphXEngine.prototype['canRenderCoreNodeWithJsxGraphBackend'].call(fakeEngine as any, {
      id: 'coord',
      kind: 'shape',
      type: 'coordinate-system',
      payload: { objectType: 'coordinate-system', geometry: { kind: 'coordinate-system', segments: [] } },
      layerId: 'content'
    });

    expect(canRenderCoordinateSystem).toBe(true);
  });
});

describe('GraphXEngine board option cloning', () => {
  it('does not dispose backend-rendered command handles when setMode is a no-op', () => {
    const destroy = vi.fn();
    const fakeEngine = {
      boardMgr: {
        mode: '2d',
        setMode: vi.fn(() => false)
      },
      jsxGraphCommandBackend: { destroy },
      jsxGraphCommandRuntime: {},
      jsxGraphCommandBoard: {},
      jsxGraphCommandHandles: new Map([['A', {}]]),
      commandRenderPath: new Map([['cmd_a', 'backend-jsxgraph']])
    };

    GraphXEngine.prototype.setMode.call(fakeEngine as any, '2d');

    expect(destroy).not.toHaveBeenCalled();
    expect(fakeEngine.jsxGraphCommandBackend).toEqual({ destroy });
    expect(fakeEngine.jsxGraphCommandHandles.size).toBe(1);
  });

  it('stores cloned pan and zoom options when restarting with new board settings', () => {
    const input: GraphXOptions = {
      pan: {
        enabled: true,
        needShift: false,
        needTwoFingers: true
      },
      zoom: {
        enabled: true,
        wheel: true,
        needShift: false,
        pinch: true,
        factorX: 1.1,
        factorY: 1.2,
        center: 'board'
      }
    };

    const fakeEngine = {
      boardMgr: {
        setMode: vi.fn(() => true)
      },
      hiddenLineMgr: {
        setOptions: vi.fn(),
        clearAllSources: vi.fn()
      },
      clearShapeInstances: vi.fn(),
      clearRelationTargets: vi.fn(),
      relationState: {
        clear: vi.fn()
      },
      refreshRelationState: vi.fn(),
      entityMgr: {
        clearAll: vi.fn()
      },
      sceneState: {
        clearCommands: vi.fn(),
        clearRelations: vi.fn()
      },
      runtimeSceneStore: new GraphSceneStore('test-runtime-scene'),
      clearRuntimeSceneStore: vi.fn(() => {
        fakeEngine.runtimeSceneStore.clear();
      }),
      commandCoreObjectIds: new Map(),
      commandSymbols: new Map(),
      commandNumericScope: new Map(),
      clearVariables: vi.fn(),
      setupGlobalEvents: vi.fn(),
      notifyViewportChange: vi.fn(),
      currentOptions: undefined,
      relationAssistOptions: undefined
    };

    GraphXEngine.prototype.setMode.call(fakeEngine as any, '2d', input);

    input.pan!.needShift = true;
    input.zoom!.center = 'auto';

    expect(fakeEngine.currentOptions).toEqual({
      pan: {
        enabled: true,
        needShift: false,
        needTwoFingers: true
      },
      zoom: {
        enabled: true,
        wheel: true,
        needShift: false,
        pinch: true,
        factorX: 1.1,
        factorY: 1.2,
        center: 'board'
      }
    });
  });
});
