import { describe, expect, it } from 'vitest';
import {
  applySubjectGeometryTransform,
  createSubjectGeometryTransformModel,
  point2D,
  type SubjectGeometryTransformTarget
} from './index';

const triangle: SubjectGeometryTransformTarget = {
  id: 'triangle-transform',
  kind: 'polygon',
  shapeKind: 'triangle',
  vertices: [point2D(1, 0), point2D(2, 0), point2D(1, 1)]
};

describe('subject geometry transforms', () => {
  it('rotates polygons and exposes center-line plus trajectory preview descriptors', () => {
    const model = createSubjectGeometryTransformModel(triangle, {
      kind: 'rotate',
      center: point2D(0, 0),
      angleRadians: Math.PI / 2,
      preview: { includeCenterLines: true, includeTrajectories: true }
    });

    expect(model.applied).toBe(true);
    expect(model.after.kind).toBe('polygon');
    if (model.after.kind !== 'polygon') throw new Error('expected polygon');
    expect(model.after.vertices[0].x).toBeCloseTo(0);
    expect(model.after.vertices[0].y).toBeCloseTo(1);
    expect(model.after.vertices[1].x).toBeCloseTo(0);
    expect(model.after.vertices[1].y).toBeCloseTo(2);
    expect(model.previewLines.filter((line) => line.meta?.previewKind === 'center-line')).toHaveLength(3);
    expect(model.previewArcs).toHaveLength(3);
    expect(model.previewArcs[0]).toMatchObject({
      kind: 'trajectory',
      label: '旋转轨迹',
      radius: 1
    });
  });

  it('scales circles about any center while preserving a positive radius', () => {
    const circle: SubjectGeometryTransformTarget = {
      id: 'circle-transform',
      kind: 'circle',
      center: point2D(2, 2),
      radius: 2
    };

    const model = createSubjectGeometryTransformModel(circle, {
      kind: 'scale',
      center: point2D(0, 0),
      scale: 0.5
    });

    expect(model.applied).toBe(true);
    expect(model.after.kind).toBe('circle');
    if (model.after.kind !== 'circle') throw new Error('expected circle');
    expect(model.after.center).toEqual({ x: 1, y: 1 });
    expect(model.after.radius).toBe(1);
    expect(model.previewLines.some((line) => line.label === '缩放轨迹')).toBe(true);
  });

  it('keeps transform kinds isolated from stale option fields', () => {
    const rotated = createSubjectGeometryTransformModel(triangle, {
      kind: 'rotate',
      center: point2D(0, 0),
      angleRadians: Math.PI / 2,
      delta: point2D(10, 10),
      scale: 5
    });
    expect(rotated.after.kind).toBe('polygon');
    if (rotated.after.kind !== 'polygon') throw new Error('expected polygon');
    expect(rotated.after.vertices[0].x).toBeCloseTo(0);
    expect(rotated.after.vertices[0].y).toBeCloseTo(1);
    expect(rotated.delta).toEqual({ x: 0, y: 0 });
    expect(rotated.scale).toBe(1);

    const scaled = createSubjectGeometryTransformModel(triangle, {
      kind: 'scale',
      center: point2D(0, 0),
      scale: 2,
      angleRadians: Math.PI,
      delta: point2D(10, 10)
    });
    expect(scaled.after.kind).toBe('polygon');
    if (scaled.after.kind !== 'polygon') throw new Error('expected polygon');
    expect(scaled.after.vertices[0]).toEqual({ x: 2, y: 0 });
    expect(scaled.angleRadians).toBe(0);
    expect(scaled.delta).toEqual({ x: 0, y: 0 });
  });

  it('uses actual transformed circle sample points for rotation trajectory previews', () => {
    const circle: SubjectGeometryTransformTarget = {
      id: 'circle-rotate-preview',
      kind: 'circle',
      center: point2D(2, 0),
      radius: 1
    };

    const model = createSubjectGeometryTransformModel(circle, {
      kind: 'rotate',
      center: point2D(0, 0),
      angleRadians: Math.PI / 2,
      preview: { includeCenterLines: false, includeTrajectories: true }
    });

    expect(model.previewArcs).toHaveLength(2);
    const rimArc = model.previewArcs.find((arc) => Math.abs(arc.radius - 3) < 1e-9);
    expect(rimArc).toBeDefined();
    expect(rimArc!.start).toEqual({ x: 3, y: 0 });
    expect(rimArc!.end.x).toBeCloseTo(0);
    expect(rimArc!.end.y).toBeCloseTo(3);
    expect(Math.hypot(rimArc!.end.x - rimArc!.center.x, rimArc!.end.y - rimArc!.center.y)).toBeCloseTo(rimArc!.radius);
  });

  it('snaps translated shapes by the closest point without distorting the shape', () => {
    const model = createSubjectGeometryTransformModel(triangle, {
      kind: 'translate',
      delta: point2D(-0.92, 0.03),
      snapToGrid: { enabled: true, step: 1, tolerance: 0.15 }
    });

    expect(model.diagnostics.map((diagnostic) => diagnostic.code)).toContain('subject-transform.snap-applied');
    expect(model.after.kind).toBe('polygon');
    if (model.after.kind !== 'polygon') throw new Error('expected polygon');
    expect(model.after.vertices[0]).toEqual({ x: 0, y: 0 });
    expect(model.after.vertices[1]).toEqual({ x: 1, y: 0 });
    expect(model.after.vertices[2]).toEqual({ x: 0, y: 1 });
  });

  it('can translate a transform result back inside coordinate bounds or reject it', () => {
    const segment: SubjectGeometryTransformTarget = {
      id: 'segment-transform',
      kind: 'segment',
      start: point2D(3, 4),
      end: point2D(4, 4)
    };

    const adjusted = createSubjectGeometryTransformModel(segment, {
      kind: 'translate',
      delta: point2D(2, 0),
      bounds: { minX: -5, minY: -5, maxX: 5, maxY: 5 },
      boundsMode: 'translate-inside'
    });
    expect(adjusted.diagnostics.map((diagnostic) => diagnostic.code)).toContain('subject-transform.bounds-adjusted');
    expect(adjusted.after.kind).toBe('segment');
    if (adjusted.after.kind !== 'segment') throw new Error('expected segment');
    expect(adjusted.after.start).toEqual({ x: 4, y: 4 });
    expect(adjusted.after.end).toEqual({ x: 5, y: 4 });

    const rejected = createSubjectGeometryTransformModel(segment, {
      kind: 'translate',
      delta: point2D(2, 0),
      bounds: { minX: -5, minY: -5, maxX: 5, maxY: 5 },
      boundsMode: 'reject'
    });
    expect(rejected.applied).toBe(false);
    expect(rejected.after).toEqual(segment);
    expect(rejected.diagnostics.map((diagnostic) => diagnostic.code)).toContain('subject-transform.out-of-bounds');
  });

  it('offers a direct apply helper for business-side state reducers', () => {
    const after = applySubjectGeometryTransform(triangle, {
      kind: 'translate',
      delta: point2D(1, -1)
    });

    expect(after.kind).toBe('polygon');
    if (after.kind !== 'polygon') throw new Error('expected polygon');
    expect(after.vertices[0]).toEqual({ x: 2, y: -1 });
  });
});
