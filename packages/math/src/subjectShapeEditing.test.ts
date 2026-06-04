import { describe, expect, it } from 'vitest';
import {
  applySubjectShapeEdit,
  createSubjectShapeEditHandles,
  createSubjectShapeEditModel,
  point2D,
  type SubjectShapeEditTarget
} from './index';

const triangle: SubjectShapeEditTarget = {
  id: 'edit-triangle',
  kind: 'polygon',
  shapeKind: 'triangle',
  vertices: [point2D(0, 0), point2D(4, 0), point2D(0, 3)]
};

describe('subject shape editing', () => {
  it('exposes renderer-free edit handles for common geometry targets', () => {
    const polygonHandles = createSubjectShapeEditHandles(triangle);
    expect(polygonHandles.map((handle) => [handle.kind, handle.label, handle.point])).toEqual([
      ['vertex', 'A', { x: 0, y: 0 }],
      ['vertex', 'B', { x: 4, y: 0 }],
      ['vertex', 'C', { x: 0, y: 3 }]
    ]);

    const circleHandles = createSubjectShapeEditHandles({
      id: 'edit-circle',
      kind: 'circle',
      center: point2D(1, 2),
      radius: 3
    });
    expect(circleHandles.map((handle) => handle.kind)).toEqual(['center', 'radius']);
    expect(circleHandles[1].point).toEqual({ x: 4, y: 2 });
  });

  it('edits polygon vertices with grid snapping and preview descriptors', () => {
    const model = createSubjectShapeEditModel(triangle, {
      handleKind: 'vertex',
      index: 2,
      point: point2D(1.04, 2.96)
    }, {
      snapToGrid: { enabled: true, step: 0.5, tolerance: 0.08 }
    });

    expect(model.applied).toBe(true);
    expect(model.after.kind).toBe('polygon');
    if (model.after.kind !== 'polygon') throw new Error('expected polygon');
    expect(model.after.vertices[2]).toEqual({ x: 1, y: 3 });
    expect(model.afterHandles.find((handle) => handle.kind === 'vertex' && handle.index === 2)?.point).toEqual({ x: 1, y: 3 });
    expect(model.previewLines).toHaveLength(1);
    expect(model.diagnostics.map((diagnostic) => diagnostic.code)).toContain('subject-shape-edit.snap-applied');
  });

  it('translates edited geometry back inside bounds when requested', () => {
    const model = createSubjectShapeEditModel(triangle, {
      handleKind: 'vertex',
      index: 2,
      point: point2D(6, 3)
    }, {
      bounds: { minX: -5, minY: -5, maxX: 5, maxY: 5 },
      boundsMode: 'translate-inside'
    });

    expect(model.applied).toBe(true);
    expect(model.after.kind).toBe('polygon');
    if (model.after.kind !== 'polygon') throw new Error('expected polygon');
    expect(model.after.vertices[0]).toEqual({ x: -1, y: 0 });
    expect(model.after.vertices[1]).toEqual({ x: 3, y: 0 });
    expect(model.after.vertices[2]).toEqual({ x: 5, y: 3 });
    expect(model.diagnostics.map((diagnostic) => diagnostic.code)).toContain('subject-shape-edit.bounds-adjusted');
  });

  it('rejects edits that would collapse a polygon', () => {
    const model = createSubjectShapeEditModel(triangle, {
      handleKind: 'vertex',
      index: 2,
      point: point2D(2, 0)
    });

    expect(model.applied).toBe(false);
    expect(model.after).toEqual(triangle);
    expect(model.diagnostics.map((diagnostic) => diagnostic.code)).toContain('subject-shape-edit.degenerate-geometry');
  });

  it('updates circle radius handles without moving the center', () => {
    const circle: SubjectShapeEditTarget = {
      id: 'edit-circle-radius',
      kind: 'circle',
      center: point2D(1, 1),
      radius: 2
    };

    const after = applySubjectShapeEdit(circle, {
      handleKind: 'radius',
      point: point2D(1, 4)
    });

    expect(after.kind).toBe('circle');
    if (after.kind !== 'circle') throw new Error('expected circle');
    expect(after.center).toEqual({ x: 1, y: 1 });
    expect(after.radius).toBe(3);
  });

  it('updates line and ray direction handles from their defining points', () => {
    const line = createSubjectShapeEditModel({
      id: 'edit-line',
      kind: 'line',
      point: point2D(0, 0),
      direction: point2D(2, 0)
    }, {
      handleKind: 'direction',
      point: point2D(0, 3)
    });
    expect(line.after.kind).toBe('line');
    if (line.after.kind !== 'line') throw new Error('expected line');
    expect(line.after.direction).toEqual({ x: 0, y: 3 });

    const ray = createSubjectShapeEditModel({
      id: 'edit-ray',
      kind: 'ray',
      origin: point2D(1, 1),
      direction: point2D(2, 0)
    }, {
      handleKind: 'direction',
      point: point2D(1, 4)
    });
    expect(ray.after.kind).toBe('ray');
    if (ray.after.kind !== 'ray') throw new Error('expected ray');
    expect(ray.after.direction).toEqual({ x: 0, y: 3 });
  });
});
