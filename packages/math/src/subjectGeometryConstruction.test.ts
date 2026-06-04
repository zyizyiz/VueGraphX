import { describe, expect, it } from 'vitest';
import {
  createFreeSubjectAuxiliaryLine,
  createSubjectAuxiliaryLineConstructionModel,
  point2D,
  type SubjectAuxiliaryLineConstructionTarget
} from './index';

const triangle: SubjectAuxiliaryLineConstructionTarget = {
  id: 'construction-triangle',
  kind: 'polygon',
  shapeKind: 'triangle',
  vertices: [point2D(0, 0), point2D(4, 0), point2D(0, 3)]
};

describe('subject auxiliary line construction', () => {
  it('clips a free-draw draft line to polygon boundaries', () => {
    const model = createSubjectAuxiliaryLineConstructionModel(
      triangle,
      { start: point2D(-1, 1), end: point2D(5, 1) },
      { state: 'confirmed' }
    );

    expect(model.applied).toBe(true);
    expect(model.candidate?.start.x).toBeCloseTo(0);
    expect(model.candidate?.start.y).toBeCloseTo(1);
    expect(model.candidate?.end.x).toBeCloseTo(8 / 3);
    expect(model.candidate?.end.y).toBeCloseTo(1);
    expect(model.contacts.filter((contact) => contact.kind === 'intersection')).toHaveLength(2);
    expect(model.diagnostics.map((diagnostic) => diagnostic.code)).toContain('subject-construction.clipped');
  });

  it('keeps single-contact drafts as free helper candidates when enabled', () => {
    const model = createSubjectAuxiliaryLineConstructionModel(
      triangle,
      { start: point2D(4.05, -2), end: point2D(4.05, 2) },
      { snapDistance: 0.1 }
    );

    expect(model.applied).toBe(true);
    expect(model.contacts).toHaveLength(1);
    expect(model.contacts[0].point).toEqual({ x: 4, y: 0 });
    expect(model.candidate?.meta).toMatchObject({ singleContact: true });
    expect(model.diagnostics.map((diagnostic) => diagnostic.code)).toContain('subject-construction.single-contact');
  });

  it('can reject single-contact drafts when callers require clipped spans', () => {
    const model = createSubjectAuxiliaryLineConstructionModel(
      triangle,
      { start: point2D(4, -2), end: point2D(4, 2) },
      { allowSingleContact: false }
    );

    expect(model.applied).toBe(false);
    expect(model.candidate).toBeNull();
    expect(model.previewLine?.state).toBe('preview');
    expect(model.diagnostics.map((diagnostic) => diagnostic.code)).toContain('subject-construction.no-contact');
  });

  it('rejects non-finite draft points before constructing line geometry', () => {
    const model = createSubjectAuxiliaryLineConstructionModel(
      triangle,
      { start: { x: Number.NaN, y: 0 }, end: point2D(1, 1) }
    );

    expect(model.applied).toBe(false);
    expect(model.candidate).toBeNull();
    expect(model.previewLine).toBeNull();
    expect(model.diagnostics).toEqual([expect.objectContaining({
      code: 'subject-construction.invalid-draft',
      severity: 'error'
    })]);
  });

  it('snaps overlapping drafts to the overlapped polygon edge', () => {
    const model = createSubjectAuxiliaryLineConstructionModel(
      triangle,
      { start: point2D(-1, 0), end: point2D(5, 0) }
    );

    expect(model.applied).toBe(true);
    expect(model.candidate?.start).toEqual({ x: 0, y: 0 });
    expect(model.candidate?.end).toEqual({ x: 4, y: 0 });
    expect(model.contacts[0]).toMatchObject({ kind: 'overlap', edgeIndex: 0 });
    expect(model.diagnostics.map((diagnostic) => diagnostic.code)).toContain('subject-construction.overlap-detected');
  });

  it('reports tangent contacts for circle construction', () => {
    const circle: SubjectAuxiliaryLineConstructionTarget = {
      id: 'construction-circle',
      kind: 'circle',
      center: point2D(0, 0),
      radius: 2
    };

    const model = createSubjectAuxiliaryLineConstructionModel(circle, {
      start: point2D(-3, 2),
      end: point2D(3, 2)
    });

    expect(model.applied).toBe(true);
    expect(model.contacts).toEqual([{ kind: 'tangent', point: { x: 0, y: 2 }, targetPart: 'circle' }]);
    expect(model.candidate?.meta).toMatchObject({ singleContact: true });
  });

  it('keeps the legacy free auxiliary line helper compatible with construction diagnostics', () => {
    const freeLine = createFreeSubjectAuxiliaryLine(
      triangle,
      point2D(-1, 1),
      point2D(5, 1),
      { label: '用户线' }
    );

    expect(freeLine).not.toBeNull();
    expect(freeLine?.label).toBe('用户线');
    expect(freeLine?.state).toBe('confirmed');
    expect(freeLine?.start.x).toBeCloseTo(0);
    expect(freeLine?.end.x).toBeCloseTo(8 / 3);
    expect(freeLine?.meta?.diagnostics).toContain('subject-construction.clipped');
  });
});
