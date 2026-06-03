import { describe, expect, it } from 'vitest';
import {
  compareParitySnapshots,
  createParityFixtureNode,
  createParitySnapshot,
  CURRICULUM_PARITY_BACKENDS,
  curriculumParityRows,
  normalizeGraphObjectForParity,
  type NormalizedParitySnapshot
} from './index';

describe('curriculum parity matrix', () => {
  it('maps each selected China curriculum row to demos and first-release backends', () => {
    const ids = new Set<string>();

    expect(curriculumParityRows.length).toBeGreaterThanOrEqual(21);
    expect(curriculumParityRows.some((row) => row.stage === 'junior-high')).toBe(true);
    expect(curriculumParityRows.some((row) => row.stage === 'senior-high')).toBe(true);

    for (const row of curriculumParityRows) {
      expect(ids.has(row.id)).toBe(false);
      ids.add(row.id);
      expect(row.sourceRefs.length).toBeGreaterThan(0);
      expect(row.sourceRefs.every((ref) => ref.document === '义务教育数学课程标准2022' || ref.document === '普通高中数学课程标准2017-2020')).toBe(true);
      expect(row.kernelExports.length).toBeGreaterThan(0);
      expect(row.visualObjectTypes.length).toBeGreaterThan(0);
      expect(row.capabilityFamilies.length).toBeGreaterThan(0);
      expect(row.demoIds.length).toBeGreaterThan(0);
      expect(row.requiredBackends).toEqual(CURRICULUM_PARITY_BACKENDS);
      expect(row.selectedStandardClauses.length).toBeGreaterThan(0);
      expect(row.exclusionReason).toBeUndefined();
    }
  });

  it('creates backend-neutral snapshots and compares exact and tolerant fields', () => {
    const point = createParityFixtureNode({
      id: 'A',
      type: 'point',
      rowIds: ['geometry.basic-2d']
    });
    const normalized = normalizeGraphObjectForParity(point, {
      demoId: 'curriculum.geometry.basic-2d',
      backendId: 'canvas2d',
      curriculumRowIds: ['geometry.basic-2d']
    });

    expect(normalized).toMatchObject({
      objectId: 'A',
      objectType: 'point',
      family: 'point',
      backendIds: ['canvas2d'],
      curriculumRowIds: ['geometry.basic-2d']
    });

    const expected: NormalizedParitySnapshot = {
      demoId: 'curriculum.geometry.basic-2d',
      objects: [{ ...normalized, points: [{ x: 0, y: 0 }] }]
    };
    const actual: NormalizedParitySnapshot = {
      demoId: 'curriculum.geometry.basic-2d',
      objects: [{ ...normalized, points: [{ x: 0.0000004, y: -0.0000004 }] }]
    };

    expect(compareParitySnapshots(expected, actual).ok).toBe(true);
    expect(compareParitySnapshots(expected, {
      ...actual,
      objects: [{ ...actual.objects[0], objectType: 'line' }]
    }).diagnostics[0]?.message).toContain('objectType');
  });

  it('creates one fixture node for every first-release primitive family', () => {
    for (const row of curriculumParityRows) {
      const snapshot = createParitySnapshot(
        row.demoIds[0],
        row.visualObjectTypes.map((type) => createParityFixtureNode({ id: `${row.id}:${type}`, type, rowIds: [row.id] })),
        { backendId: 'canvas2d', curriculumRowIds: [row.id] }
      );
      expect(snapshot.objects.length).toBe(row.visualObjectTypes.length);
      expect(compareParitySnapshots(snapshot, snapshot).ok).toBe(true);
    }
  });
});
