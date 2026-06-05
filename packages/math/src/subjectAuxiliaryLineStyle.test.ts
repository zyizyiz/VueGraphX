import { describe, expect, it } from 'vitest';
import {
  createSubjectAuxiliaryLineConstructionModel,
  createQuadraticSubjectFunction,
  createSubjectGeometryTransformModel,
  createSubjectOverlayModel,
  createSubjectShapeEditModel,
  point2D,
  SUBJECT_OVERLAY_DASH_PATTERN,
  SUBJECT_OVERLAY_DASH_STROKE_WIDTH,
  SUBJECT_OVERLAY_DEFAULT_DASH_STROKE_COLOR,
  type SubjectOverlayStyle,
  type SubjectOverlayTarget,
  type SubjectShapeEditTarget
} from './index';

const triangle: SubjectOverlayTarget & SubjectShapeEditTarget = {
  id: 'auxiliary-style-triangle',
  kind: 'polygon',
  shapeKind: 'triangle',
  vertices: [point2D(0, 0), point2D(4, 0), point2D(0, 3)]
};

const defaultAuxiliaryStyle: SubjectOverlayStyle = {
  strokeColor: SUBJECT_OVERLAY_DEFAULT_DASH_STROKE_COLOR,
  textColor: SUBJECT_OVERLAY_DEFAULT_DASH_STROKE_COLOR,
  strokeWidth: SUBJECT_OVERLAY_DASH_STROKE_WIDTH,
  selectionStrokeScale: false,
  lineDash: SUBJECT_OVERLAY_DASH_PATTERN
};

describe('subject auxiliary line style', () => {
  it('uses one default style across overlay, construction, transform, and edit helpers', () => {
    const overlay = createSubjectOverlayModel(triangle, {
      auxiliaryLines: { includeKinds: ['altitude'] }
    });
    const functionOverlay = createSubjectOverlayModel({
      id: 'auxiliary-style-function',
      kind: 'function',
      descriptor: createQuadraticSubjectFunction({ id: 'auxiliary-style-quadratic', a: 1, b: -2, c: -3 }),
      sampleWindow: { minX: -4, maxX: 5, minY: -5, maxY: 5 },
      strokeColor: '#2563EB'
    }, {
      auxiliaryLines: { includeKinds: ['symmetry-axis'] }
    });
    const construction = createSubjectAuxiliaryLineConstructionModel(triangle, {
      start: point2D(-1, 1),
      end: point2D(5, 1)
    });
    const transform = createSubjectGeometryTransformModel(triangle, {
      kind: 'translate',
      delta: point2D(1, 0)
    });
    const edit = createSubjectShapeEditModel(triangle, {
      handleKind: 'vertex',
      index: 2,
      point: point2D(1, 3)
    });

    expect(overlay.auxiliaryLines.find((line) => line.kind === 'altitude')?.style).toMatchObject(defaultAuxiliaryStyle);
    expect(functionOverlay.auxiliaryLines.find((line) => line.kind === 'symmetry-axis')?.style).toMatchObject(defaultAuxiliaryStyle);
    expect(construction.candidate?.style).toMatchObject(defaultAuxiliaryStyle);
    expect(transform.previewLines[0]?.style).toMatchObject(defaultAuxiliaryStyle);
    expect(edit.previewLines[0]?.style).toMatchObject(defaultAuxiliaryStyle);
  });

  it('keeps explicit style overrides while preserving the standard dash by default', () => {
    const edit = createSubjectShapeEditModel(triangle, {
      handleKind: 'vertex',
      index: 2,
      point: point2D(1, 3)
    }, {
      preview: { style: { strokeColor: '#0F766E' } }
    });

    expect(edit.previewLines[0]?.style).toMatchObject({
      strokeColor: '#0F766E',
      lineDash: SUBJECT_OVERLAY_DASH_PATTERN,
      strokeWidth: SUBJECT_OVERLAY_DASH_STROKE_WIDTH,
      selectionStrokeScale: false
    });
  });
});
