import { describe, expect, it } from 'vitest';
import {
  createFreeSubjectAuxiliaryLine,
  createSubjectAuxiliaryLineConstructionModel,
  point2D,
  segmentFromPoints,
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

  it('keeps fully internal polygon drafts at the user-drawn endpoints', () => {
    const model = createSubjectAuxiliaryLineConstructionModel(
      triangle,
      { start: point2D(1, 1), end: point2D(2, 1) },
      { state: 'confirmed' }
    );

    expect(model.applied).toBe(true);
    expect(model.candidate?.start).toEqual({ x: 1, y: 1 });
    expect(model.candidate?.end).toEqual({ x: 2, y: 1 });
    expect(model.contacts.map((contact) => contact.kind)).toEqual(['inside-endpoint', 'inside-endpoint']);
    expect(model.candidate?.meta).toMatchObject({ internalDraft: true });
    expect(model.diagnostics.map((diagnostic) => diagnostic.code)).not.toContain('subject-construction.clipped');
  });

  it('lets callers require boundary contacts before retaining free-draw candidates', () => {
    const internal = createSubjectAuxiliaryLineConstructionModel(
      triangle,
      { start: point2D(1, 1), end: point2D(2, 1) },
      { retentionRule: 'boundary-contact' }
    );
    const crossing = createSubjectAuxiliaryLineConstructionModel(
      triangle,
      { start: point2D(-1, 1), end: point2D(5, 1) },
      { retentionRule: 'boundary-contact' }
    );
    const endpointAnchored = createSubjectAuxiliaryLineConstructionModel(
      triangle,
      { start: point2D(1, 1), end: point2D(5, 1) },
      { retentionRule: 'boundary-contact' }
    );

    expect(internal.applied).toBe(false);
    expect(internal.candidate).toBeNull();
    expect(internal.contacts.map((contact) => contact.kind)).toEqual(['inside-endpoint', 'inside-endpoint']);
    expect(internal.diagnostics.map((diagnostic) => diagnostic.code)).toContain('subject-construction.retention-rejected');

    expect(crossing.applied).toBe(true);
    expect(crossing.contacts.filter((contact) => contact.kind === 'intersection')).toHaveLength(2);
    expect(crossing.diagnostics.map((diagnostic) => diagnostic.code)).not.toContain('subject-construction.retention-rejected');

    expect(endpointAnchored.applied).toBe(true);
    expect(endpointAnchored.candidate?.start).toEqual({ x: 1, y: 1 });
    expect(endpointAnchored.candidate?.end).toEqual({ x: 5, y: 1 });
    expect(endpointAnchored.contacts.filter((contact) => contact.kind === 'intersection')).toHaveLength(1);
    expect(endpointAnchored.contacts.map((contact) => contact.kind)).toEqual(['intersection', 'inside-endpoint']);
    expect(endpointAnchored.diagnostics.map((diagnostic) => diagnostic.code)).not.toContain('subject-construction.retention-rejected');
  });

  it('can preserve the full drafted span after boundary-contact retention', () => {
    const model = createSubjectAuxiliaryLineConstructionModel(
      triangle,
      { start: point2D(-1, 1), end: point2D(5, 1) },
      { retentionRule: 'boundary-contact', preserveDraftSpan: true }
    );

    expect(model.applied).toBe(true);
    expect(model.candidate?.start).toEqual({ x: -1, y: 1 });
    expect(model.candidate?.end).toEqual({ x: 5, y: 1 });
    expect(model.candidate?.meta).toMatchObject({ clipped: true, preservedDraftSpan: true });
    expect(model.contacts.filter((contact) => contact.kind === 'intersection')).toHaveLength(2);
  });

  it('supports custom business retention rules for constructed helper candidates', () => {
    const seenTargets: string[] = [];
    const model = createSubjectAuxiliaryLineConstructionModel(
      triangle,
      { start: point2D(-1, 1), end: point2D(5, 1) },
      {
        retentionRule: ({ target, contacts }) => {
          seenTargets.push(target.id);
          return contacts.filter((contact) => contact.kind === 'intersection').length >= 3;
        }
      }
    );

    expect(seenTargets).toEqual([triangle.id]);
    expect(model.applied).toBe(false);
    expect(model.candidate).toBeNull();
    expect(model.contacts.filter((contact) => contact.kind === 'intersection')).toHaveLength(2);
    expect(model.diagnostics.map((diagnostic) => diagnostic.code)).toContain('subject-construction.retention-rejected');
  });

  it('exposes boundary intersections to custom retention rules for endpoint-anchored polygon drafts', () => {
    const model = createSubjectAuxiliaryLineConstructionModel(
      triangle,
      { start: point2D(1, 1), end: point2D(5, 1) },
      {
        retentionRule: ({ contacts }) => contacts.some((contact) => contact.kind === 'intersection')
      }
    );

    expect(model.applied).toBe(true);
    expect(model.candidate?.start).toEqual({ x: 1, y: 1 });
    expect(model.candidate?.end).toEqual({ x: 5, y: 1 });
    expect(model.candidate?.meta).toMatchObject({ endpointAnchoredDraft: true });
    expect(model.contacts.map((contact) => contact.kind)).toEqual(['intersection', 'inside-endpoint']);
    expect(model.diagnostics.map((diagnostic) => diagnostic.code)).not.toContain('subject-construction.retention-rejected');
  });

  it('keeps endpoint-near-boundary polygon drafts instead of extending them to another edge', () => {
    const model = createSubjectAuxiliaryLineConstructionModel(
      triangle,
      { start: point2D(1, -0.05), end: point2D(1, 1) },
      { state: 'confirmed', snapDistance: 0.12 }
    );

    expect(model.applied).toBe(true);
    expect(model.candidate?.start).toEqual({ x: 1, y: -0.05 });
    expect(model.candidate?.end).toEqual({ x: 1, y: 1 });
    expect(model.contacts.map((contact) => contact.kind)).toEqual(['intersection', 'inside-endpoint', 'inside-endpoint']);
    expect(model.contacts.filter((contact) => contact.kind === 'intersection')).toHaveLength(1);
    expect(model.candidate?.meta).toMatchObject({ internalDraft: true });
    expect(model.diagnostics.map((diagnostic) => diagnostic.code)).not.toContain('subject-construction.clipped');
  });

  it('keeps endpoint-anchored polygon drafts instead of extending backward to another edge', () => {
    const model = createSubjectAuxiliaryLineConstructionModel(
      triangle,
      { start: point2D(1, 1), end: point2D(5, 1) },
      { state: 'confirmed' }
    );

    expect(model.applied).toBe(true);
    expect(model.candidate?.start).toEqual({ x: 1, y: 1 });
    expect(model.candidate?.end).toEqual({ x: 5, y: 1 });
    expect(model.contacts.map((contact) => contact.kind)).toEqual(['intersection', 'inside-endpoint']);
    expect(model.candidate?.meta).toMatchObject({ endpointAnchoredDraft: true });
    expect(model.contacts.filter((contact) => contact.kind === 'intersection')).toHaveLength(1);
    expect(model.diagnostics.map((diagnostic) => diagnostic.code)).not.toContain('subject-construction.clipped');
  });

  it('keeps endpoint-anchored crossing polygon drafts when single-contact candidates are disabled', () => {
    const model = createSubjectAuxiliaryLineConstructionModel(
      triangle,
      { start: point2D(1, 1), end: point2D(5, 1) },
      { allowSingleContact: false }
    );

    expect(model.applied).toBe(true);
    expect(model.candidate?.start).toEqual({ x: 1, y: 1 });
    expect(model.candidate?.end).toEqual({ x: 5, y: 1 });
    expect(model.contacts.map((contact) => contact.kind)).toEqual(['intersection', 'inside-endpoint']);
    expect(model.diagnostics.map((diagnostic) => diagnostic.code)).not.toContain('subject-construction.no-contact');
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

  it('keeps overlapping polygon-edge drafts at the full user-drawn span', () => {
    const model = createSubjectAuxiliaryLineConstructionModel(
      triangle,
      { start: point2D(-1, 0), end: point2D(5, 0) }
    );

    expect(model.applied).toBe(true);
    expect(model.candidate?.start).toEqual({ x: -1, y: 0 });
    expect(model.candidate?.end).toEqual({ x: 5, y: 0 });
    expect(model.contacts[0]).toMatchObject({
      kind: 'overlap',
      edgeIndex: 0,
      start: { x: 0, y: 0 },
      end: { x: 4, y: 0 }
    });
    expect(model.diagnostics.map((diagnostic) => diagnostic.code)).toContain('subject-construction.overlap-detected');
  });

  it('rejects disjoint collinear drafts for finite construction parts', () => {
    const segment: SubjectAuxiliaryLineConstructionTarget = {
      id: 'construction-segment',
      kind: 'segment',
      start: point2D(0, 0),
      end: point2D(4, 0)
    };
    const ray: SubjectAuxiliaryLineConstructionTarget = {
      id: 'construction-ray',
      kind: 'ray',
      origin: point2D(0, 0),
      direction: point2D(1, 0)
    };
    const parallelLines: SubjectAuxiliaryLineConstructionTarget = {
      id: 'construction-parallel-lines-disjoint',
      kind: 'parallel-lines',
      segments: [
        segmentFromPoints(point2D(0, 0), point2D(4, 0)),
        segmentFromPoints(point2D(0, 3), point2D(4, 3))
      ]
    };
    const angle: SubjectAuxiliaryLineConstructionTarget = {
      id: 'construction-angle-disjoint',
      kind: 'angle',
      vertex: point2D(0, 0),
      first: point2D(4, 0),
      second: point2D(0, 3)
    };
    const cases: Array<{
      target: SubjectAuxiliaryLineConstructionTarget;
      start: ReturnType<typeof point2D>;
      end: ReturnType<typeof point2D>;
    }> = [
      { target: triangle, start: point2D(5, 0), end: point2D(6, 0) },
      { target: segment, start: point2D(5, 0), end: point2D(6, 0) },
      { target: ray, start: point2D(-2, 0), end: point2D(-1, 0) },
      { target: parallelLines, start: point2D(5, 0), end: point2D(6, 0) },
      { target: angle, start: point2D(5, 0), end: point2D(6, 0) }
    ];

    for (const item of cases) {
      const model = createSubjectAuxiliaryLineConstructionModel(item.target, {
        start: item.start,
        end: item.end
      });

      expect(model.applied, item.target.kind).toBe(false);
      expect(model.candidate).toBeNull();
      expect(model.diagnostics.map((diagnostic) => diagnostic.code)).toContain('subject-construction.no-contact');
    }
  });

  it('keeps overlapping segment drafts at the full user-drawn span', () => {
    const segment: SubjectAuxiliaryLineConstructionTarget = {
      id: 'construction-segment-overlap',
      kind: 'segment',
      start: point2D(0, 0),
      end: point2D(4, 0)
    };
    const model = createSubjectAuxiliaryLineConstructionModel(segment, {
      start: point2D(-1, 0),
      end: point2D(5, 0)
    });

    expect(model.applied).toBe(true);
    expect(model.candidate?.start).toEqual({ x: -1, y: 0 });
    expect(model.candidate?.end).toEqual({ x: 5, y: 0 });
    expect(model.contacts[0]).toMatchObject({
      kind: 'overlap',
      targetPart: 'segment',
      start: { x: 0, y: 0 },
      end: { x: 4, y: 0 }
    });
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

  it('keeps circle internal drafts and clips drafts crossing the circle boundary', () => {
    const circle: SubjectAuxiliaryLineConstructionTarget = {
      id: 'construction-circle-internal',
      kind: 'circle',
      center: point2D(0, 0),
      radius: 2
    };

    const internal = createSubjectAuxiliaryLineConstructionModel(circle, {
      start: point2D(-1, 0),
      end: point2D(1, 0)
    });
    const crossing = createSubjectAuxiliaryLineConstructionModel(circle, {
      start: point2D(0, 0),
      end: point2D(3, 0)
    });

    expect(internal.applied).toBe(true);
    expect(internal.candidate?.start).toEqual({ x: -1, y: 0 });
    expect(internal.candidate?.end).toEqual({ x: 1, y: 0 });
    expect(internal.candidate?.meta).toMatchObject({ internalDraft: true });
    expect(internal.contacts.map((contact) => contact.kind)).toEqual(['inside-endpoint', 'inside-endpoint']);
    expect(internal.diagnostics.map((diagnostic) => diagnostic.code)).not.toContain('subject-construction.clipped');

    expect(crossing.applied).toBe(true);
    expect(crossing.candidate?.start).toEqual({ x: 0, y: 0 });
    expect(crossing.candidate?.end).toEqual({ x: 2, y: 0 });
    expect(crossing.contacts.map((contact) => contact.kind)).toEqual(expect.arrayContaining(['intersection', 'inside-endpoint']));
    expect(crossing.diagnostics.map((diagnostic) => diagnostic.code)).toContain('subject-construction.clipped');
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

  it('clips free helper lines across parallel-line segments', () => {
    const parallelLines: SubjectAuxiliaryLineConstructionTarget = {
      id: 'construction-parallel-lines',
      kind: 'parallel-lines',
      segments: [
        segmentFromPoints(point2D(0, 0), point2D(4, 0)),
        segmentFromPoints(point2D(0, 3), point2D(4, 3))
      ]
    };

    const clipped = createFreeSubjectAuxiliaryLine(
      parallelLines,
      point2D(2, -1),
      point2D(2, 4)
    );
    const rejected = createFreeSubjectAuxiliaryLine(
      parallelLines,
      point2D(5, -1),
      point2D(5, 4)
    );

    expect(clipped).toMatchObject({
      start: { x: 2, y: 0 },
      end: { x: 2, y: 3 },
      meta: {
        clipped: true,
        contactCount: 2,
        diagnostics: expect.arrayContaining(['subject-construction.clipped'])
      }
    });
    expect(rejected).toBeNull();

    const overlapped = createFreeSubjectAuxiliaryLine(
      parallelLines,
      point2D(-1, 0),
      point2D(5, 0)
    );
    expect(overlapped).toMatchObject({
      start: { x: -1, y: 0 },
      end: { x: 5, y: 0 },
      meta: {
        overlapSegment: true,
        diagnostics: expect.arrayContaining(['subject-construction.overlap-detected'])
      }
    });
  });

  it('constrains free helper lines to angle arms', () => {
    const angle: SubjectAuxiliaryLineConstructionTarget = {
      id: 'construction-angle',
      kind: 'angle',
      vertex: point2D(0, 0),
      first: point2D(4, 0),
      second: point2D(0, 3)
    };

    const clipped = createFreeSubjectAuxiliaryLine(
      angle,
      point2D(0, 1),
      point2D(3, 0)
    );
    const singleContact = createSubjectAuxiliaryLineConstructionModel(angle, {
      start: point2D(2, -1),
      end: point2D(2, 1)
    });
    const rejected = createSubjectAuxiliaryLineConstructionModel(angle, {
      start: point2D(5, -1),
      end: point2D(5, 4)
    }, {
      allowSingleContact: false
    });

    expect(clipped).toMatchObject({
      start: { x: 0, y: 1 },
      end: { x: 3, y: 0 },
      meta: {
        clipped: true,
        contactCount: 2,
        diagnostics: expect.arrayContaining(['subject-construction.clipped'])
      }
    });
    expect(singleContact.applied).toBe(true);
    expect(singleContact.candidate?.meta).toMatchObject({ singleContact: true });
    expect(rejected.applied).toBe(false);
    expect(rejected.candidate).toBeNull();
    expect(rejected.diagnostics.map((diagnostic) => diagnostic.code)).toContain('subject-construction.no-contact');

    const overlapped = createFreeSubjectAuxiliaryLine(
      angle,
      point2D(-1, 0),
      point2D(5, 0)
    );
    expect(overlapped).toMatchObject({
      start: { x: -1, y: 0 },
      end: { x: 5, y: 0 },
      meta: {
        overlapSegment: true,
        diagnostics: expect.arrayContaining(['subject-construction.overlap-detected'])
      }
    });
  });
});
