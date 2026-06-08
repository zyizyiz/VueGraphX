import { describe, expect, it } from 'vitest';
import {
  createCircleEquationSubjectFunction,
  createDefaultSubjectOverlayRegistry,
  createFreeSubjectAuxiliaryLine,
  createQuadraticSubjectFunction,
  createSubjectDynamicPoint,
  createSubjectAuxiliaryLineIntersectionAnnotations,
  createSubjectOverlayCache,
  createSubjectOverlayModel,
  point2D,
  SUBJECT_DYNAMIC_POINT_DEFAULT_RADIUS_PX,
  SUBJECT_OVERLAY_DEFAULT_ANNOTATION_COLORS,
  SUBJECT_OVERLAY_DASH_PATTERN,
  SUBJECT_OVERLAY_DASH_STROKE_WIDTH,
  SUBJECT_OVERLAY_DEFAULT_DASH_STROKE_COLOR,
  type SubjectOverlayProvider,
  type SubjectOverlayTarget
} from './index';

const rightTriangle: SubjectOverlayTarget = {
  id: 'triangle-abc',
  kind: 'polygon',
  vertices: [point2D(0, 0), point2D(4, 0), point2D(0, 3)],
  coordinateSystemId: 'plane'
};

describe('subject overlay model', () => {
  it('generates built-in triangle annotations and configurable auxiliary candidates', () => {
    const model = createSubjectOverlayModel(rightTriangle, {
      auxiliaryLines: {
        includeKinds: ['altitude', 'median', 'angle-bisector'],
        defaultVisibleKinds: ['altitude'],
        maxCandidates: 12
      },
      coordinates: { enabled: true, showForKinds: ['vertex'], precision: 1 }
    });

    expect(model.shapeKind).toBe('triangle');
    expect(model.annotations.filter((annotation) => annotation.kind === 'vertex')).toHaveLength(3);
    expect(model.annotations.some((annotation) => annotation.kind === 'angle')).toBe(true);
    expect(model.annotations.some((annotation) => annotation.text.includes('(0, 0)'))).toBe(true);

    const auxiliaryKinds = model.auxiliaryLines.map((line) => line.kind);
    expect(auxiliaryKinds).toContain('altitude');
    expect(auxiliaryKinds).toContain('median');
    expect(auxiliaryKinds).toContain('angle-bisector');
    expect(auxiliaryKinds).not.toContain('perpendicular-bisector');
    expect(model.auxiliaryLines.find((line) => line.kind === 'altitude')?.state).toBe('confirmed');
    expect(model.auxiliaryLines.find((line) => line.kind === 'median')?.state).toBe('candidate');
  });

  it('applies shape-specific kind switches, labels, and styles', () => {
    const rectangle: SubjectOverlayTarget = {
      id: 'rect-1',
      kind: 'polygon',
      shapeKind: 'rectangle',
      vertices: [point2D(0, 0), point2D(5, 0), point2D(5, 2), point2D(0, 2)]
    };

    const model = createSubjectOverlayModel(rectangle, {
      annotations: { includeKinds: ['vertex', 'angle'] },
      auxiliaryLines: { includeKinds: ['altitude', 'diagonal'] },
      shapes: {
        rectangle: {
          annotations: {
            includeKinds: ['vertex'],
            labels: { vertex: '可拖拽顶点' },
            styles: { vertex: { textColor: '#111827' } }
          },
          auxiliaryLines: {
            includeKinds: ['diagonal'],
            labels: { diagonal: '作对角线' },
            styles: { diagonal: { strokeColor: '#ef4444', strokeWidth: 2 } }
          }
        }
      }
    });

    expect(new Set(model.annotations.map((annotation) => annotation.kind))).toEqual(new Set(['vertex']));
    expect(new Set(model.auxiliaryLines.map((line) => line.kind))).toEqual(new Set(['diagonal']));
    expect(model.annotations[0].label).toBe('可拖拽顶点');
    expect(model.annotations[0].style?.textColor).toBe('#111827');
    expect(model.auxiliaryLines[0].label).toBe('作对角线');
    expect(model.auxiliaryLines[0].style).toMatchObject({ strokeColor: '#ef4444', strokeWidth: 2 });
  });

  it('supports business-defined semantic annotation providers', () => {
    const semanticProvider: SubjectOverlayProvider = {
      id: 'business.semantic-marks',
      order: 1,
      supports: (target) => target.kind === 'polygon' && target.meta?.special === 'isosceles',
      createAnnotations: ({ target }) => [{
        id: `${target.id}:equal-side-mark`,
        kind: 'equal-side-mark',
        label: '等边标记',
        text: 'AB = AC',
        targetId: target.id,
        visible: true,
        state: 'confirmed',
        meta: { semanticRole: 'equal-sides' }
      }]
    };
    const registry = createDefaultSubjectOverlayRegistry([semanticProvider]);
    const target: SubjectOverlayTarget = {
      ...rightTriangle,
      id: 'semantic-triangle',
      meta: { special: 'isosceles' }
    };

    const model = createSubjectOverlayModel(target, {
      annotations: {
        labels: { 'equal-side-mark': '腰相等' },
        styles: { 'equal-side-mark': { textColor: '#7c3aed' } }
      }
    }, registry);

    const mark = model.annotations.find((annotation) => annotation.kind === 'equal-side-mark');
    expect(model.providerIds).toContain('business.semantic-marks');
    expect(mark).toMatchObject({
      label: '腰相等',
      text: 'AB = AC',
      sourceProviderId: 'business.semantic-marks',
      meta: { semanticRole: 'equal-sides' }
    });
    expect(mark?.style?.textColor).toBe('#7c3aed');
  });

  it('honors auxiliary candidate limits while generating dense polygon helpers', () => {
    const polygon: SubjectOverlayTarget = {
      id: 'dense-polygon',
      kind: 'polygon',
      vertices: Array.from({ length: 14 }, (_, index) => {
        const angle = (Math.PI * 2 * index) / 14;
        return point2D(Math.cos(angle) * 4, Math.sin(angle) * 4);
      })
    };

    const model = createSubjectOverlayModel(polygon, {
      auxiliaryLines: {
        includeKinds: ['diagonal'],
        maxCandidates: 5
      }
    });

    expect(model.auxiliaryLines).toHaveLength(5);
    expect(model.auxiliaryLines.every((line) => line.kind === 'diagonal')).toBe(true);
  });

  it('uses the standard dashed-line style and keeps per-kind colors configurable', () => {
    const model = createSubjectOverlayModel(rightTriangle, {
      auxiliaryLines: {
        includeKinds: ['altitude', 'median'],
        styles: {
          median: { strokeColor: '#16A34A' }
        }
      }
    });

    const altitude = model.auxiliaryLines.find((line) => line.kind === 'altitude');
    const median = model.auxiliaryLines.find((line) => line.kind === 'median');
    expect(altitude?.style).toMatchObject({
      strokeColor: SUBJECT_OVERLAY_DEFAULT_DASH_STROKE_COLOR,
      textColor: SUBJECT_OVERLAY_DEFAULT_DASH_STROKE_COLOR,
      strokeWidth: SUBJECT_OVERLAY_DASH_STROKE_WIDTH
    });
    expect(altitude?.style?.lineDash).toEqual(SUBJECT_OVERLAY_DASH_PATTERN);
    expect(median?.style).toMatchObject({
      strokeColor: '#16A34A',
      strokeWidth: SUBJECT_OVERLAY_DASH_STROKE_WIDTH
    });
    expect(median?.style?.lineDash).toEqual(SUBJECT_OVERLAY_DASH_PATTERN);
  });

  it('uses default function annotation colors while keeping per-kind overrides configurable', () => {
    const quadratic = createQuadraticSubjectFunction({ id: 'q-style', a: 1, b: -2, c: -3, domain: [-4, 5] });
    const defaultModel = createSubjectOverlayModel({
      id: 'q-style-target',
      kind: 'function',
      descriptor: quadratic,
      sampleWindow: { minX: -4, maxX: 5, minY: -5, maxY: 5 },
      strokeColor: '#2563EB'
    }, {
      annotations: { includeKinds: ['vertex', 'intercept'] }
    });

    const vertex = defaultModel.annotations.find((annotation) => annotation.kind === 'vertex');
    const intercept = defaultModel.annotations.find((annotation) => annotation.kind === 'intercept');
    expect(vertex?.style).toMatchObject({
      strokeColor: SUBJECT_OVERLAY_DEFAULT_ANNOTATION_COLORS.vertex
    });
    expect(intercept?.style).toMatchObject({
      strokeColor: SUBJECT_OVERLAY_DEFAULT_ANNOTATION_COLORS.intercept
    });
    expect(vertex?.style?.textColor).toBeUndefined();
    expect(intercept?.style?.textColor).toBeUndefined();

    const configuredModel = createSubjectOverlayModel({
      id: 'q-style-configured-target',
      kind: 'function',
      descriptor: quadratic,
      sampleWindow: { minX: -4, maxX: 5, minY: -5, maxY: 5 },
      strokeColor: '#2563EB'
    }, {
      annotations: {
        includeKinds: ['vertex', 'intercept'],
        styles: {
          vertex: { strokeColor: '#111827' },
          intercept: { textColor: '#0F766E' }
        }
      }
    });

    expect(configuredModel.annotations.find((annotation) => annotation.kind === 'vertex')?.style).toMatchObject({
      strokeColor: '#111827'
    });
    expect(configuredModel.annotations.find((annotation) => annotation.kind === 'vertex')?.style?.textColor).toBeUndefined();
    expect(configuredModel.annotations.find((annotation) => annotation.kind === 'intercept')?.style).toMatchObject({
      strokeColor: SUBJECT_OVERLAY_DEFAULT_ANNOTATION_COLORS.intercept,
      textColor: '#0F766E'
    });
  });

  it('exposes dynamic point annotations with normalized style and parameter metadata', () => {
    const quadratic = createQuadraticSubjectFunction({ id: 'q-dynamic', a: 1, b: 0, c: -1, domain: [-4, 4] });
    const dynamicPoint = createSubjectDynamicPoint(quadratic, {
      parameter: 2,
      style: { color: '#FF3333' }
    });
    const model = createSubjectOverlayModel({
      id: 'q-dynamic-target',
      kind: 'function',
      descriptor: quadratic,
      dynamicPoint
    }, {
      annotations: { includeKinds: ['dynamic-point'] },
      coordinates: { enabled: true, showForKinds: ['dynamic-point'], precision: 1 }
    });

    const annotation = model.annotations.find((entry) => entry.kind === 'dynamic-point');
    expect(annotation).toMatchObject({
      label: 'P',
      text: 'P (2, 3)',
      anchor: { x: 2, y: 3 },
      style: {
        strokeColor: '#FF3333',
        fillColor: '#FF3333',
        strokeWidth: 0
      },
      meta: {
        dynamicPointId: 'q-dynamic:P',
        parameter: 2,
        style: {
          radiusPx: SUBJECT_DYNAMIC_POINT_DEFAULT_RADIUS_PX
        }
      }
    });
  });

  it('caches overlay computation by target version and config', () => {
    const cache = createSubjectOverlayCache();
    const registry = createDefaultSubjectOverlayRegistry();
    const first = createSubjectOverlayModel({ ...rightTriangle, version: 1 }, {}, registry, cache);
    const second = createSubjectOverlayModel({ ...rightTriangle, version: 1 }, {}, registry, cache);
    const third = createSubjectOverlayModel({ ...rightTriangle, version: 2 }, {}, registry, cache);

    expect(second).toBe(first);
    expect(third).not.toBe(first);
    expect(cache.stats()).toMatchObject({ hits: 1, misses: 2, size: 2 });
  });

  it('clips free auxiliary lines and can label their shape intersections', () => {
    const freeLine = createFreeSubjectAuxiliaryLine(
      rightTriangle,
      point2D(-1, 1),
      point2D(5, 1),
      {
        config: {
          auxiliaryLines: {
            includeKinds: ['free'],
            styles: { free: { strokeColor: '#7c3aed', strokeWidth: 2 } }
          }
        }
      }
    );

    expect(freeLine).not.toBeNull();
    expect(freeLine?.style).toMatchObject({ strokeColor: '#7c3aed', strokeWidth: 2 });
    expect(freeLine?.start.x).toBeCloseTo(0);
    expect(freeLine?.start.y).toBeCloseTo(1);
    expect(freeLine?.end.x).toBeCloseTo(8 / 3);
    expect(freeLine?.end.y).toBeCloseTo(1);

    const intersections = createSubjectAuxiliaryLineIntersectionAnnotations(
      rightTriangle,
      freeLine ? [freeLine] : [],
      { annotations: { includeKinds: ['helper-intersection'] }, coordinates: { showForKinds: ['helper-intersection'] } }
    );
    expect(intersections).toHaveLength(2);
    expect(intersections[0].text).toContain('(');
  });

  it('generates function and equation annotations plus mathematical auxiliary lines', () => {
    const quadratic = createQuadraticSubjectFunction({ id: 'q', a: 1, b: -2, c: -3, domain: [-4, 5] });
    const quadraticModel = createSubjectOverlayModel({
      id: 'q-target',
      kind: 'function',
      descriptor: quadratic,
      sampleWindow: { minX: -4, maxX: 5, minY: -5, maxY: 5 },
      strokeColor: '#2563EB'
    }, {
      annotations: { includeKinds: ['expression', 'vertex', 'axis'] },
      auxiliaryLines: { includeKinds: ['symmetry-axis'] }
    });

    expect(quadraticModel.annotations.map((annotation) => annotation.kind)).toEqual(['expression', 'vertex', 'axis']);
    expect(quadraticModel.annotations.find((annotation) => annotation.kind === 'vertex')?.anchor).toEqual({ x: 1, y: -4 });
    expect(quadraticModel.auxiliaryLines).toHaveLength(1);
    expect(quadraticModel.auxiliaryLines[0]).toMatchObject({
      kind: 'symmetry-axis',
      start: { x: 1, y: -5 },
      end: { x: 1, y: 5 }
    });
    expect(quadraticModel.auxiliaryLines[0].style).toMatchObject({
      strokeColor: SUBJECT_OVERLAY_DEFAULT_DASH_STROKE_COLOR,
      textColor: SUBJECT_OVERLAY_DEFAULT_DASH_STROKE_COLOR,
      strokeWidth: SUBJECT_OVERLAY_DASH_STROKE_WIDTH
    });
    expect(quadraticModel.auxiliaryLines[0].style?.lineDash).toEqual(SUBJECT_OVERLAY_DASH_PATTERN);

    const circleModel = createSubjectOverlayModel({
      id: 'circle-equation-target',
      kind: 'equation',
      descriptor: createCircleEquationSubjectFunction({ centerX: 1, centerY: -1, radius: 3 })
    }, {
      annotations: { includeKinds: ['center', 'radius'] },
      auxiliaryLines: { includeKinds: ['radius', 'diameter'] }
    });

    expect(circleModel.annotations.map((annotation) => annotation.kind)).toEqual(['center', 'radius']);
    expect(circleModel.auxiliaryLines.map((line) => line.kind)).toEqual(['radius', 'diameter']);
  });
});
