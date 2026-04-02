import { describe, expect, it } from 'vitest';
import { evaluateRelations } from './evaluator';
import { toRelationTargetRecord } from './targets';
import type { GraphRelationRecord } from './contracts';

const createLineTarget = (ownerId: string, label: string, x1: number, y1: number, x2: number, y2: number) => (
  toRelationTargetRecord(ownerId, {
    family: 'line-like',
    label,
    getGeometry: () => ({ family: 'line-like', x1, y1, x2, y2 })
  })
);

const createSegmentTarget = (ownerId: string, label: string, x1: number, y1: number, x2: number, y2: number) => (
  toRelationTargetRecord(ownerId, {
    family: 'segment-like',
    label,
    getGeometry: () => ({ family: 'segment-like', x1, y1, x2, y2 })
  })
);

const createPointTarget = (ownerId: string, label: string, x: number, y: number) => (
  toRelationTargetRecord(ownerId, {
    family: 'point',
    label,
    getGeometry: () => ({ family: 'point', x, y })
  })
);

const createRelation = (id: string, kind: GraphRelationRecord['kind'], ownerA: string, ownerB: string, params?: GraphRelationRecord['params']): GraphRelationRecord => ({
  id,
  kind,
  targets: [
    { ownerType: 'command', ownerId: ownerA, targetId: 'primary' },
    { ownerType: 'command', ownerId: ownerB, targetId: 'primary' }
  ],
  active: true,
  params
});

describe('evaluateRelations', () => {
  it('marks parallel relations as satisfied when directions match', () => {
    const snapshots = evaluateRelations([
      createRelation('rel_1', 'parallel', 'cmd_a', 'cmd_b')
    ], [
      createLineTarget('cmd_a', 'l1', 0, 0, 1, 0),
      createLineTarget('cmd_b', 'l2', 0, 1, 4, 1)
    ]);

    expect(snapshots[0]).toEqual(expect.objectContaining({
      status: 'satisfied',
      targetLabels: ['l1', 'l2']
    }));
  });

  it('marks equal-length relations as violated when segment lengths diverge', () => {
    const snapshots = evaluateRelations([
      createRelation('rel_2', 'equal-length', 'cmd_a', 'cmd_b')
    ], [
      createSegmentTarget('cmd_a', 's1', 0, 0, 2, 0),
      createSegmentTarget('cmd_b', 's2', 0, 0, 3, 0)
    ]);

    expect(snapshots[0]).toEqual(expect.objectContaining({
      status: 'violated'
    }));
    expect(snapshots[0].measurements?.[0]).toEqual(expect.objectContaining({
      kind: 'length',
      actualValue: 2,
      expectedValue: 3,
      delta: 1
    }));
  });

  it('marks point distance assertions as satisfied and surfaces conflicts on the same pair', () => {
    const snapshots = evaluateRelations([
      createRelation('rel_3', 'distance-assertion', 'cmd_p1', 'cmd_p2', { expectedValue: 5 }),
      createRelation('rel_4', 'parallel', 'cmd_l1', 'cmd_l2'),
      createRelation('rel_5', 'perpendicular', 'cmd_l1', 'cmd_l2')
    ], [
      createPointTarget('cmd_p1', 'A', 0, 0),
      createPointTarget('cmd_p2', 'B', 3, 4),
      createLineTarget('cmd_l1', 'l1', 0, 0, 1, 0),
      createLineTarget('cmd_l2', 'l2', 0, 0, 0, 1)
    ]);

    expect(snapshots[0]).toEqual(expect.objectContaining({ status: 'satisfied' }));
    expect(snapshots[1]).toEqual(expect.objectContaining({ status: 'conflicting' }));
    expect(snapshots[2]).toEqual(expect.objectContaining({ status: 'conflicting' }));
  });
});
