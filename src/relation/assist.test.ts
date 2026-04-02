import { describe, expect, it } from 'vitest';
import type { GraphRelationRecord } from './contracts';
import {
  DEFAULT_DISTANCE_ASSERTION_SNAP_ENTER_DELTA,
  DEFAULT_DISTANCE_ASSERTION_SNAP_EXIT_DELTA,
  DEFAULT_EQUAL_LENGTH_SNAP_ENTER_DELTA,
  DEFAULT_EQUAL_LENGTH_SNAP_EXIT_DELTA,
  DEFAULT_PARALLEL_SNAP_ENTER_ANGLE,
  DEFAULT_PARALLEL_SNAP_EXIT_ANGLE,
  DEFAULT_PERPENDICULAR_SNAP_ENTER_ANGLE,
  DEFAULT_PERPENDICULAR_SNAP_EXIT_ANGLE,
  areRelationGeometriesEquivalent,
  buildDistanceAssertionAssistGeometry,
  buildEqualLengthAssistGeometry,
  buildParallelAssistGeometry,
  buildPerpendicularAssistGeometry,
  measureDistanceAssertionDelta,
  measureEqualLengthDelta,
  measureParallelAngleDelta,
  measurePerpendicularAngleDelta,
  normalizeRelationAssistOptions,
  resolveRelationAssist
} from './assist';
import { buildRelationTargetKey, toRelationTargetRecord } from './targets';

const createLineTarget = (
  ownerId: string,
  label: string,
  geometry: { x1: number; y1: number; x2: number; y2: number }
) => toRelationTargetRecord(ownerId, {
  family: 'line-like',
  label,
  getGeometry: () => ({
    family: 'line-like',
    ...geometry
  })
});

const createParallelRelation = (id: string, left: string, right: string): GraphRelationRecord => ({
  id,
  kind: 'parallel',
  active: true,
  targets: [
    { ownerType: 'command', ownerId: left, targetId: 'primary' },
    { ownerType: 'command', ownerId: right, targetId: 'primary' }
  ]
});

describe('relation assist helpers', () => {
  it('measures zero angle delta for parallel lines in opposite directions', () => {
    expect(measureParallelAngleDelta(
      { family: 'line-like', x1: 0, y1: 0, x2: 3, y2: 0 },
      { family: 'line-like', x1: 1, y1: 2, x2: -5, y2: 2 }
    )).toBe(0);
  });

  it('builds exact parallel geometry while preserving dragged midpoint and length', () => {
    const snapped = buildParallelAssistGeometry(
      { family: 'segment-like', x1: 0, y1: 0, x2: 2, y2: 1 },
      { family: 'line-like', x1: -1, y1: 5, x2: 4, y2: 5 }
    );

    expect(snapped?.family).toBe('segment-like');
    expect(snapped?.x1).toBeCloseTo(-0.1180339887, 6);
    expect(snapped?.y1).toBeCloseTo(0.5, 6);
    expect(snapped?.x2).toBeCloseTo(2.1180339887, 6);
    expect(snapped?.y2).toBeCloseTo(0.5, 6);
  });

  it('anchors point2 when point1 is the dragged handle', () => {
    const snapped = buildParallelAssistGeometry(
      { family: 'segment-like', x1: 0, y1: 0, x2: 2, y2: 1 },
      { family: 'line-like', x1: -1, y1: 5, x2: 4, y2: 5 },
      'point1'
    );

    expect(snapped?.x2).toBeCloseTo(2, 6);
    expect(snapped?.y2).toBeCloseTo(1, 6);
    expect(snapped?.y1).toBeCloseTo(1, 6);
  });

  it('anchors point1 when point2 is the dragged handle', () => {
    const snapped = buildParallelAssistGeometry(
      { family: 'segment-like', x1: 0, y1: 0, x2: 2, y2: 1 },
      { family: 'line-like', x1: -1, y1: 5, x2: 4, y2: 5 },
      'point2'
    );

    expect(snapped?.x1).toBeCloseTo(0, 6);
    expect(snapped?.y1).toBeCloseTo(0, 6);
    expect(snapped?.y2).toBeCloseTo(0, 6);
  });

  it('resolves the closest eligible parallel assist and latches on a wider exit threshold', () => {
    const dragged = createLineTarget('dragged', 'Dragged', { x1: 0, y1: 0, x2: 4, y2: 0.1 });
    const near = createLineTarget('near', 'Near', { x1: 0, y1: 2, x2: 4, y2: 2 });
    const far = createLineTarget('far', 'Far', { x1: 0, y1: 2, x2: 2, y2: 5 });

    const first = resolveRelationAssist({
      records: [
        createParallelRelation('rel_near', 'dragged', 'near'),
        createParallelRelation('rel_far', 'dragged', 'far')
      ],
      targets: [dragged, near, far],
      draggedTargetKey: dragged.key
    });

    expect(first).toEqual(expect.objectContaining({
      relationId: 'rel_near'
    }));
    expect(first?.angleDelta).toBeLessThan(2);

    const latched = resolveRelationAssist({
      records: [createParallelRelation('rel_near', 'dragged', 'near')],
      targets: [
        createLineTarget('dragged', 'Dragged', { x1: 0, y1: 0, x2: 4, y2: 0.2 }),
        near
      ],
      draggedTargetKey: buildRelationTargetKey({ ownerType: 'command', ownerId: 'dragged', targetId: 'primary' }),
      latchedRelationId: 'rel_near'
    });

    expect(latched).toEqual(expect.objectContaining({
      relationId: 'rel_near'
    }));
    expect(latched?.angleDelta).toBeGreaterThan(2);
    expect(latched?.angleDelta).toBeLessThan(3.5);
  });

  it('compares snapped linear geometries with epsilon tolerance', () => {
    expect(areRelationGeometriesEquivalent(
      { family: 'line-like', x1: 0, y1: 0, x2: 1, y2: 1 },
      { family: 'segment-like', x1: 0, y1: 0, x2: 1 + 1e-7, y2: 1 - 1e-7 }
    )).toBe(true);
  });

  it('normalizes relation assist options and keeps exit threshold above enter threshold', () => {
    expect(normalizeRelationAssistOptions()).toEqual({
      parallelSnapEnterAngle: DEFAULT_PARALLEL_SNAP_ENTER_ANGLE,
      parallelSnapExitAngle: DEFAULT_PARALLEL_SNAP_EXIT_ANGLE,
      perpendicularSnapEnterAngle: DEFAULT_PERPENDICULAR_SNAP_ENTER_ANGLE,
      perpendicularSnapExitAngle: DEFAULT_PERPENDICULAR_SNAP_EXIT_ANGLE,
      equalLengthSnapEnterDelta: DEFAULT_EQUAL_LENGTH_SNAP_ENTER_DELTA,
      equalLengthSnapExitDelta: DEFAULT_EQUAL_LENGTH_SNAP_EXIT_DELTA,
      distanceAssertionSnapEnterDelta: DEFAULT_DISTANCE_ASSERTION_SNAP_ENTER_DELTA,
      distanceAssertionSnapExitDelta: DEFAULT_DISTANCE_ASSERTION_SNAP_EXIT_DELTA
    });

    expect(normalizeRelationAssistOptions({
      parallelSnapEnterAngle: 4,
      parallelSnapExitAngle: 2,
      perpendicularSnapEnterAngle: 6,
      perpendicularSnapExitAngle: 4
    })).toEqual({
      parallelSnapEnterAngle: 4,
      parallelSnapExitAngle: 4,
      perpendicularSnapEnterAngle: 6,
      perpendicularSnapExitAngle: 6,
      equalLengthSnapEnterDelta: DEFAULT_EQUAL_LENGTH_SNAP_ENTER_DELTA,
      equalLengthSnapExitDelta: DEFAULT_EQUAL_LENGTH_SNAP_EXIT_DELTA,
      distanceAssertionSnapEnterDelta: DEFAULT_DISTANCE_ASSERTION_SNAP_ENTER_DELTA,
      distanceAssertionSnapExitDelta: DEFAULT_DISTANCE_ASSERTION_SNAP_EXIT_DELTA
    });
  });

  it('supports smaller custom thresholds', () => {
    const dragged = createLineTarget('dragged', 'Dragged', { x1: 0, y1: 0, x2: 4, y2: 0.12 });
    const near = createLineTarget('near', 'Near', { x1: 0, y1: 2, x2: 4, y2: 2 });

    const defaultResult = resolveRelationAssist({
      records: [createParallelRelation('rel_near', 'dragged', 'near')],
      targets: [dragged, near],
      draggedTargetKey: dragged.key
    });
    const strictResult = resolveRelationAssist({
      records: [createParallelRelation('rel_near', 'dragged', 'near')],
      targets: [dragged, near],
      draggedTargetKey: dragged.key,
      options: {
        parallelSnapEnterAngle: 1,
        parallelSnapExitAngle: 2
      }
    });

    expect(defaultResult).not.toBeNull();
    expect(strictResult).toBeNull();
  });

  it('measures perpendicular delta relative to 90 degrees', () => {
    expect(measurePerpendicularAngleDelta(
      { family: 'line-like', x1: 0, y1: 0, x2: 4, y2: 0 },
      { family: 'line-like', x1: 1, y1: 1, x2: 1, y2: 5 }
    )).toBeCloseTo(0, 6);
  });

  it('builds exact perpendicular geometry while preserving dragged midpoint and length', () => {
    const snapped = buildPerpendicularAssistGeometry(
      { family: 'segment-like', x1: 0, y1: 0, x2: 2, y2: 0.5 },
      { family: 'line-like', x1: -1, y1: 5, x2: 3, y2: 5 }
    );

    expect(snapped?.family).toBe('segment-like');
    expect(measurePerpendicularAngleDelta(snapped!, { family: 'line-like', x1: -1, y1: 5, x2: 3, y2: 5 })).toBeCloseTo(0, 6);
  });

  it('resolves perpendicular assist using its own thresholds', () => {
    const dragged = createLineTarget('dragged', 'Dragged', { x1: 0, y1: 0, x2: 0.2, y2: 4 });
    const reference = createLineTarget('reference', 'Reference', { x1: 0, y1: 2, x2: 4, y2: 2 });

    const result = resolveRelationAssist({
      records: [createParallelRelation('rel_perp', 'dragged', 'reference')].map((record) => ({
        ...record,
        kind: 'perpendicular' as const
      })),
      targets: [dragged, reference],
      draggedTargetKey: dragged.key,
      options: {
        perpendicularSnapEnterAngle: 3,
        perpendicularSnapExitAngle: 5
      }
    });

    expect(result).toEqual(expect.objectContaining({
      relationId: 'rel_perp'
    }));
  });

  it('measures equal-length delta', () => {
    expect(measureEqualLengthDelta(
      { family: 'segment-like', x1: 0, y1: 0, x2: 4, y2: 0 },
      { family: 'segment-like', x1: 0, y1: 0, x2: 3, y2: 0 }
    )).toBeCloseTo(1, 6);
  });

  it('builds equal-length assist geometry by preserving direction and matching reference length', () => {
    const snapped = buildEqualLengthAssistGeometry(
      { family: 'segment-like', x1: 0, y1: 0, x2: 4, y2: 0 },
      { family: 'segment-like', x1: 0, y1: 0, x2: 3, y2: 0 }
    );

    expect(snapped).toEqual({
      family: 'segment-like',
      x1: 0.5,
      y1: 0,
      x2: 3.5,
      y2: 0
    });
  });

  it('resolves equal-length assist using its own thresholds', () => {
    const dragged = toRelationTargetRecord('dragged', {
      family: 'segment-like',
      label: 'Dragged',
      getGeometry: () => ({ family: 'segment-like', x1: 0, y1: 0, x2: 3.15, y2: 0 })
    });
    const reference = toRelationTargetRecord('reference', {
      family: 'segment-like',
      label: 'Reference',
      getGeometry: () => ({ family: 'segment-like', x1: 0, y1: 0, x2: 3, y2: 0 })
    });

    const result = resolveRelationAssist({
      records: [createParallelRelation('rel_eq', 'dragged', 'reference')].map((record) => ({
        ...record,
        kind: 'equal-length' as const
      })),
      targets: [dragged, reference],
      draggedTargetKey: dragged.key,
      options: {
        equalLengthSnapEnterDelta: 0.2,
        equalLengthSnapExitDelta: 0.3
      }
    });

    expect(result).toEqual(expect.objectContaining({
      relationId: 'rel_eq'
    }));
  });

  it('measures distance-assertion delta', () => {
    expect(measureDistanceAssertionDelta(
      { family: 'point', x: 0, y: 0 },
      { family: 'point', x: 2.8, y: 0 },
      3
    )).toBeCloseTo(0.2, 6);
  });

  it('builds distance-assertion assist geometry along the dragged direction', () => {
    const snapped = buildDistanceAssertionAssistGeometry(
      { family: 'point', x: 2.8, y: 0 },
      { family: 'point', x: 0, y: 0 },
      3
    );

    expect(snapped).toEqual({
      family: 'point',
      x: 3,
      y: 0
    });
  });

  it('resolves distance-assertion assist using its own thresholds', () => {
    const dragged = toRelationTargetRecord('dragged', {
      family: 'point',
      label: 'Dragged',
      getGeometry: () => ({ family: 'point', x: 2.85, y: 0 })
    });
    const reference = toRelationTargetRecord('reference', {
      family: 'point',
      label: 'Reference',
      getGeometry: () => ({ family: 'point', x: 0, y: 0 })
    });

    const result = resolveRelationAssist({
      records: [createParallelRelation('rel_dist', 'dragged', 'reference')].map((record) => ({
        ...record,
        kind: 'distance-assertion' as const,
        params: { expectedValue: 3 }
      })),
      targets: [dragged, reference],
      draggedTargetKey: dragged.key,
      options: {
        distanceAssertionSnapEnterDelta: 0.2,
        distanceAssertionSnapExitDelta: 0.3
      }
    });

    expect(result).toEqual(expect.objectContaining({
      relationId: 'rel_dist'
    }));
  });
});
