import { describe, expect, it } from 'vitest';
import {
  createSubjectShapeEditOverlayModel,
  point2D,
  type SubjectShapeEditTarget
} from './index';

const triangle: SubjectShapeEditTarget = {
  id: 'edit-overlay-triangle',
  kind: 'polygon',
  shapeKind: 'triangle',
  vertices: [point2D(0, 0), point2D(4, 0), point2D(0, 3)]
};

describe('subject shape edit overlay model', () => {
  it('combines an applied edit with after-state handles and annotations', () => {
    const model = createSubjectShapeEditOverlayModel(triangle, {
      handleKind: 'vertex',
      index: 2,
      point: point2D(1, 3)
    }, {
      overlay: {
        annotations: { includeKinds: ['vertex', 'angle', 'side-ratio'] },
        coordinates: { enabled: true, showForKinds: ['vertex'], precision: 0 }
      }
    });

    expect(model.edit.applied).toBe(true);
    expect(model.overlay).toBe(model.afterOverlay);
    expect(model.beforeOverlay).toBeUndefined();
    expect(model.handles.active?.id).toBe('edit-overlay-triangle:handle:vertex:2');
    expect(model.handles.after.find((handle) => handle.kind === 'vertex' && handle.index === 2)?.point).toEqual({ x: 1, y: 3 });
    expect(model.edit.previewLines).toHaveLength(1);
    expect(model.afterOverlay.annotations.filter((annotation) => annotation.kind === 'vertex')).toHaveLength(3);
    expect(model.afterOverlay.annotations.some((annotation) => annotation.text.includes('(1, 3)'))).toBe(true);
    expect(model.diagnostics.edit).toEqual([]);
    expect(model.diagnostics.afterOverlay).toEqual([]);
  });

  it('can include before and after overlays for business-side comparison', () => {
    const model = createSubjectShapeEditOverlayModel(triangle, {
      handleKind: 'vertex',
      index: 2,
      point: point2D(1, 3)
    }, {
      includeBeforeOverlay: true,
      overlay: {
        annotations: { includeKinds: ['vertex'] },
        coordinates: { enabled: true, showForKinds: ['vertex'], precision: 0 }
      }
    });

    expect(model.beforeOverlay).toBeDefined();
    expect(model.beforeOverlay?.annotations.some((annotation) => annotation.text.includes('(0, 3)'))).toBe(true);
    expect(model.afterOverlay.annotations.some((annotation) => annotation.text.includes('(1, 3)'))).toBe(true);
    expect(model.diagnostics.beforeOverlay).toEqual([]);
  });

  it('keeps overlay output stable when an invalid edit is rejected', () => {
    const model = createSubjectShapeEditOverlayModel(triangle, {
      handleKind: 'vertex',
      index: 2,
      point: point2D(2, 0)
    }, {
      overlay: {
        annotations: { includeKinds: ['vertex'] },
        coordinates: { enabled: true, showForKinds: ['vertex'], precision: 0 }
      }
    });

    expect(model.edit.applied).toBe(false);
    expect(model.edit.after).toEqual(triangle);
    expect(model.diagnostics.edit.map((diagnostic) => diagnostic.code)).toContain('subject-shape-edit.degenerate-geometry');
    expect(model.afterOverlay.annotations.some((annotation) => annotation.text.includes('(0, 3)'))).toBe(true);
  });
});
