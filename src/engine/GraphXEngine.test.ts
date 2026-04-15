import { describe, expect, it, vi } from 'vitest';
import type { GraphXOptions } from '../types/engine';
import { GraphXEngine } from './GraphXEngine';
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

describe('GraphXEngine board option cloning', () => {
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
      clearVariables: vi.fn(),
      setupGlobalEvents: vi.fn(),
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
