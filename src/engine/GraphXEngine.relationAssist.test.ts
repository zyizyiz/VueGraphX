import { describe, expect, it, vi } from 'vitest';
import { GraphRelationState } from './relationState';
import { GraphXEngine } from './GraphXEngine';
import type { GraphRelationGeometry } from '../relation/targets';
import { toRelationTargetRecord } from '../relation/targets';
import {
  DEFAULT_DISTANCE_ASSERTION_SNAP_ENTER_DELTA,
  DEFAULT_DISTANCE_ASSERTION_SNAP_EXIT_DELTA,
  DEFAULT_EQUAL_LENGTH_SNAP_ENTER_DELTA,
  DEFAULT_EQUAL_LENGTH_SNAP_EXIT_DELTA,
  DEFAULT_PARALLEL_SNAP_ENTER_ANGLE,
  DEFAULT_PARALLEL_SNAP_EXIT_ANGLE,
  DEFAULT_PERPENDICULAR_SNAP_ENTER_ANGLE,
  DEFAULT_PERPENDICULAR_SNAP_EXIT_ANGLE
} from '../relation/assist';

const createFakeEngine = () => {
  const engine = Object.assign(Object.create(GraphXEngine.prototype), {
    boardMgr: {
      mode: 'geometry'
    },
    relationState: new GraphRelationState(),
    relationTargets: new Map(),
    relationSnapshots: [],
    relationTargetAssistDisposers: new Map(),
    relationAssistSessions: new Map(),
    relationAssistOptions: {
      parallelSnapEnterAngle: DEFAULT_PARALLEL_SNAP_ENTER_ANGLE,
      parallelSnapExitAngle: DEFAULT_PARALLEL_SNAP_EXIT_ANGLE,
      perpendicularSnapEnterAngle: DEFAULT_PERPENDICULAR_SNAP_ENTER_ANGLE,
      perpendicularSnapExitAngle: DEFAULT_PERPENDICULAR_SNAP_EXIT_ANGLE,
      equalLengthSnapEnterDelta: DEFAULT_EQUAL_LENGTH_SNAP_ENTER_DELTA,
      equalLengthSnapExitDelta: DEFAULT_EQUAL_LENGTH_SNAP_EXIT_DELTA,
      distanceAssertionSnapEnterDelta: DEFAULT_DISTANCE_ASSERTION_SNAP_ENTER_DELTA,
      distanceAssertionSnapExitDelta: DEFAULT_DISTANCE_ASSERTION_SNAP_EXIT_DELTA
    },
    activeRelationDragKey: null,
    isApplyingRelationAssist: false,
    relationListeners: [],
    notifyRelationChange: vi.fn()
  });

  return engine as GraphXEngine & Record<string, any>;
};

describe('GraphXEngine relation assist integration', () => {
  it('tries assist immediately during drag move callbacks', () => {
    const engine = createFakeEngine();
    let observer:
      | { onStart?: (source: 'element' | 'point1' | 'point2') => void; onMove?: (source: 'element' | 'point1' | 'point2') => void; onEnd?: () => void }
      | undefined;
    const applySpy = vi.spyOn(GraphXEngine.prototype as any, 'applyRelationAssistForActiveDrag').mockImplementation(() => undefined);

    try {
      (GraphXEngine.prototype as any).syncRelationTargetAssist.call(engine, 'command:dragged:primary', {
        key: 'command:dragged:primary',
        ownerType: 'command',
        ownerId: 'dragged',
        targetId: 'primary',
        family: 'line-like',
        label: 'Dragged',
        getGeometry: () => null,
        assist: {
          subscribeDrag(nextObserver: typeof observer) {
            observer = nextObserver;
            return () => undefined;
          }
        }
      });

      observer?.onStart?.('point1');
      observer?.onMove?.('point1');

      expect(applySpy).toHaveBeenCalledTimes(1);
      expect((engine as any).activeRelationDragKey).toBe('command:dragged:primary');
    } finally {
      applySpy.mockRestore();
    }
  });

  it('applies parallel assist for the active drag target and refreshes satisfied snapshots', () => {
    const engine = createFakeEngine();
    let draggedGeometry = { family: 'line-like' as const, x1: 0, y1: 0, x2: 4, y2: 0.1 };
    const applyGeometry = vi.fn((geometry: GraphRelationGeometry) => {
      draggedGeometry = geometry as typeof draggedGeometry;
      return true;
    });

    const dragged = toRelationTargetRecord('dragged', {
      family: 'line-like',
      label: 'Dragged',
      getGeometry: () => draggedGeometry,
      assist: {
        applyGeometry
      }
    });
    const reference = toRelationTargetRecord('reference', {
      family: 'line-like',
      label: 'Reference',
      getGeometry: () => ({ family: 'line-like', x1: 0, y1: 2, x2: 4, y2: 2 })
    });

    (engine as any).relationTargets.set(dragged.key, dragged);
    (engine as any).relationTargets.set(reference.key, reference);
    (engine as any).relationState.create({
      kind: 'parallel',
      targets: [
        { ownerType: 'command', ownerId: 'dragged', targetId: 'primary' },
        { ownerType: 'command', ownerId: 'reference', targetId: 'primary' }
      ]
    });
    (engine as any).activeRelationDragKey = dragged.key;
    (engine as any).relationAssistSessions.set(dragged.key, { latchedRelationId: null, dragSource: 'element' });

    (GraphXEngine.prototype as any).applyRelationAssistForActiveDrag.call(engine);
    (GraphXEngine.prototype as any).refreshRelationState.call(engine);

    expect(applyGeometry).toHaveBeenCalledTimes(1);
    expect((engine as any).relationSnapshots[0]).toEqual(expect.objectContaining({
      status: 'satisfied'
    }));
    expect((engine as any).relationAssistSessions.get(dragged.key)?.latchedRelationId).toBe('rel_1');
  });

  it('skips relation assist outside geometry mode', () => {
    const engine = createFakeEngine();
    (engine as any).boardMgr.mode = '3d';
    (engine as any).activeRelationDragKey = 'command:dragged:primary';
    (engine as any).relationAssistSessions.set('command:dragged:primary', { latchedRelationId: 'rel_1' });

    (GraphXEngine.prototype as any).applyRelationAssistForActiveDrag.call(engine);

    expect((engine as any).activeRelationDragKey).toBeNull();
    expect((engine as any).relationAssistSessions.size).toBe(0);
  });

  it('keeps the opposite endpoint fixed when a point handle is dragged', () => {
    const engine = createFakeEngine();
    let draggedGeometry = { family: 'segment-like' as const, x1: 0, y1: 0, x2: 4, y2: 0.1 };
    const applyGeometry = vi.fn((geometry: GraphRelationGeometry) => {
      draggedGeometry = geometry as typeof draggedGeometry;
      return true;
    });

    const dragged = toRelationTargetRecord('dragged', {
      family: 'segment-like',
      label: 'Dragged',
      getGeometry: () => draggedGeometry,
      assist: {
        applyGeometry
      }
    });
    const reference = toRelationTargetRecord('reference', {
      family: 'line-like',
      label: 'Reference',
      getGeometry: () => ({ family: 'line-like', x1: 0, y1: 2, x2: 4, y2: 2 })
    });

    (engine as any).relationTargets.set(dragged.key, dragged);
    (engine as any).relationTargets.set(reference.key, reference);
    (engine as any).relationState.create({
      kind: 'parallel',
      targets: [
        { ownerType: 'command', ownerId: 'dragged', targetId: 'primary' },
        { ownerType: 'command', ownerId: 'reference', targetId: 'primary' }
      ]
    });
    (engine as any).activeRelationDragKey = dragged.key;
    (engine as any).relationAssistSessions.set(dragged.key, { latchedRelationId: null, dragSource: 'point1' });

    (GraphXEngine.prototype as any).applyRelationAssistForActiveDrag.call(engine);

    const appliedGeometry = applyGeometry.mock.calls[0]?.[0] as typeof draggedGeometry;
    expect(applyGeometry).toHaveBeenCalledTimes(1);
    expect(appliedGeometry.x2).toBeCloseTo(4, 6);
    expect(appliedGeometry.y2).toBeCloseTo(0.1, 6);
    expect(appliedGeometry.y1).toBeCloseTo(0.1, 6);
  });
});
