import { describe, expect, it } from 'vitest';
import {
  createSubjectShapeSplitModel,
  point2D,
  polygonArea,
  polygonFromVertices,
  type SubjectShapeSplitTarget
} from './index';

const triangle: SubjectShapeSplitTarget = {
  id: 'split-triangle',
  kind: 'polygon',
  shapeKind: 'triangle',
  vertices: [point2D(0, 0), point2D(4, 0), point2D(0, 4)]
};

const concaveL: SubjectShapeSplitTarget = {
  id: 'split-concave-l',
  kind: 'polygon',
  shapeKind: 'polygon',
  vertices: [
    point2D(0, 0),
    point2D(4, 0),
    point2D(4, 1),
    point2D(1, 1),
    point2D(1, 4),
    point2D(0, 4)
  ]
};

describe('subject shape splitting', () => {
  it('splits a polygon into two pieces along a boundary-to-boundary draft', () => {
    const model = createSubjectShapeSplitModel(triangle, {
      start: point2D(-1, 2),
      end: point2D(5, 2)
    });

    expect(model.applied).toBe(true);
    expect(model.canConfirm).toBe(true);
    expect(model.contacts.map((contact) => contact.point)).toEqual([
      { x: 0, y: 2 },
      { x: 2, y: 2 }
    ]);
    expect(model.splitLine?.start).toEqual({ x: 0, y: 2 });
    expect(model.splitLine?.end).toEqual({ x: 2, y: 2 });
    expect(model.splitLine?.style).toMatchObject({
      strokeColor: '#DC2626',
      strokeWidth: 2,
      lineDash: []
    });
    expect(model.pieces).toHaveLength(2);
    const [firstPiece, secondPiece] = model.pieces;
    if (!firstPiece || !secondPiece) throw new Error('Expected two split pieces.');
    expect(firstPiece.vertices).toEqual([
      { x: 0, y: 2 },
      { x: 0, y: 0 },
      { x: 4, y: 0 },
      { x: 2, y: 2 }
    ]);
    expect(secondPiece.vertices).toEqual([
      { x: 2, y: 2 },
      { x: 0, y: 4 },
      { x: 0, y: 2 }
    ]);
    expect(firstPiece.shapeKind).toBe('quadrilateral');
    expect(secondPiece.shapeKind).toBe('triangle');
    expect(totalPieceArea(model.pieces)).toBeCloseTo(polygonArea(polygonFromVertices(triangle.vertices)));
  });

  it('supports splitting from a vertex to the opposite edge', () => {
    const model = createSubjectShapeSplitModel(triangle, {
      start: point2D(0, 0),
      end: point2D(2, 2)
    });

    expect(model.applied).toBe(true);
    expect(model.contacts.map((contact) => contact.point)).toEqual([
      { x: 0, y: 0 },
      { x: 2, y: 2 }
    ]);
    expect(model.pieces.map((piece) => piece.vertices.length)).toEqual([3, 3]);
    expect(totalPieceArea(model.pieces)).toBeCloseTo(8);
  });

  it('rejects drafts that do not reach two boundary contacts', () => {
    const model = createSubjectShapeSplitModel(triangle, {
      start: point2D(1, 1),
      end: point2D(2, 1)
    });

    expect(model.applied).toBe(false);
    expect(model.canConfirm).toBe(false);
    expect(model.pieces).toEqual([]);
    expect(model.previewLine?.start).toEqual({ x: 1, y: 1 });
    expect(model.previewLine?.end).toEqual({ x: 2, y: 1 });
    expect(model.diagnostics.map((diagnostic) => diagnostic.code)).toContain('subject-shape-split.insufficient-boundary-contact');
  });

  it('rejects drafts that overlap an existing polygon edge', () => {
    const model = createSubjectShapeSplitModel(triangle, {
      start: point2D(0, 0),
      end: point2D(4, 0)
    });

    expect(model.applied).toBe(false);
    expect(model.diagnostics).toEqual([expect.objectContaining({
      code: 'subject-shape-split.overlap-boundary',
      severity: 'warning',
      data: { edgeIndex: 0 }
    })]);
  });

  it('rejects concave polygon splits whose chord leaves the polygon interior', () => {
    const model = createSubjectShapeSplitModel(concaveL, {
      start: point2D(1, 2),
      end: point2D(2, 1)
    });

    expect(model.applied).toBe(false);
    expect(model.canConfirm).toBe(false);
    expect(model.pieces).toEqual([]);
    expect(model.contacts.map((contact) => contact.point)).toEqual([
      { x: 1, y: 2 },
      { x: 2, y: 1 }
    ]);
    expect(model.diagnostics).toEqual([expect.objectContaining({
      code: 'subject-shape-split.invalid-split-line',
      severity: 'warning'
    })]);
  });

  it('supports concave polygon splits when the chord stays inside the polygon', () => {
    const model = createSubjectShapeSplitModel(concaveL, {
      start: point2D(0.5, -1),
      end: point2D(0.5, 5)
    });

    expect(model.applied).toBe(true);
    expect(model.contacts.map((contact) => contact.point)).toEqual([
      { x: 0.5, y: 0 },
      { x: 0.5, y: 4 }
    ]);
    expect(model.pieces.map((piece) => piece.shapeKind)).toEqual(['polygon', 'quadrilateral']);
    expect(totalPieceArea(model.pieces)).toBeCloseTo(polygonArea(polygonFromVertices(concaveL.vertices)));
  });
});

const totalPieceArea = (
  pieces: readonly { vertices: readonly ReturnType<typeof point2D>[] }[]
): number => pieces.reduce((sum, piece) => sum + polygonArea(polygonFromVertices(piece.vertices)), 0);
