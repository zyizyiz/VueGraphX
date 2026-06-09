import {
  distance2D,
  dot2D,
  GRAPH_MATH_EPSILON,
  intersectLines2D,
  length2D,
  lineFromPoints,
  polygonArea,
  pointInPolygon2D,
  polygonFromVertices,
  segmentFromPoints,
  subtract2D,
  type MathLine2D,
  type MathPoint2D,
  type MathSegment2D
} from './geometry';
import type {
  SubjectAuxiliaryLineDescriptor,
  SubjectOverlayState,
  SubjectOverlayStyle,
  SubjectPolygonOverlayTarget
} from './subjectOverlays';

export type SubjectShapeSplitTarget = SubjectPolygonOverlayTarget;

export interface SubjectShapeSplitDraft {
  start: MathPoint2D;
  end: MathPoint2D;
}

export interface SubjectShapeSplitContact {
  kind: 'boundary';
  point: MathPoint2D;
  edgeIndex: number;
}

export interface SubjectShapeSplitPiece extends SubjectPolygonOverlayTarget {
  splitIndex: number;
  splitLine: MathSegment2D;
}

export interface SubjectShapeSplitOptions {
  id?: string;
  label?: string;
  state?: SubjectOverlayState;
  style?: SubjectOverlayStyle;
  minPieceArea?: number;
  epsilon?: number;
  meta?: Record<string, unknown>;
}

export interface SubjectShapeSplitDiagnostic {
  code:
    | 'subject-shape-split.invalid-target'
    | 'subject-shape-split.invalid-draft'
    | 'subject-shape-split.overlap-boundary'
    | 'subject-shape-split.insufficient-boundary-contact'
    | 'subject-shape-split.invalid-split-line'
    | 'subject-shape-split.degenerate-piece';
  severity: 'info' | 'warning' | 'error';
  message: string;
  targetId?: string;
  data?: Record<string, unknown>;
}

export interface SubjectShapeSplitModel {
  targetId: string;
  draft: MathSegment2D;
  previewLine: SubjectAuxiliaryLineDescriptor | null;
  splitLine: SubjectAuxiliaryLineDescriptor | null;
  contacts: readonly SubjectShapeSplitContact[];
  pieces: readonly [SubjectShapeSplitPiece, SubjectShapeSplitPiece] | [];
  applied: boolean;
  canConfirm: boolean;
  diagnostics: readonly SubjectShapeSplitDiagnostic[];
  meta?: Record<string, unknown>;
}

interface BoundaryContact extends SubjectShapeSplitContact {
  tOnEdge: number;
}

interface BoundaryPoint {
  point: MathPoint2D;
  contactIndex?: number;
}

const DEFAULT_SPLIT_LINE_COLOR = '#DC2626';
const DEFAULT_MIN_PIECE_AREA = 1e-5;

export const createSubjectShapeSplitModel = (
  target: SubjectShapeSplitTarget,
  draft: SubjectShapeSplitDraft,
  options: SubjectShapeSplitOptions = {}
): SubjectShapeSplitModel => {
  const epsilon = options.epsilon ?? 1e-7;
  const diagnostics: SubjectShapeSplitDiagnostic[] = [];
  const segment = segmentFromPoints(draft.start, draft.end);
  const draftIsFinite = isFinitePoint(segment.start) && isFinitePoint(segment.end);
  const draftHasLength = draftIsFinite && distance2D(segment.start, segment.end) > epsilon;
  const basePreviewLine = draftIsFinite
    ? createSplitLineDescriptor(target, segment, options, 'preview')
    : null;

  if (!isValidSplitTarget(target, epsilon)) {
    diagnostics.push({
      code: 'subject-shape-split.invalid-target',
      severity: 'error',
      message: `Subject shape split target ${target.id} has invalid geometry.`,
      targetId: target.id
    });
    return emptySplitModel(target, segment, basePreviewLine, diagnostics, options.meta);
  }

  if (!draftHasLength) {
    diagnostics.push({
      code: 'subject-shape-split.invalid-draft',
      severity: 'error',
      message: 'Shape split draft requires two distinct finite points.',
      targetId: target.id
    });
    return emptySplitModel(target, segment, basePreviewLine, diagnostics, options.meta);
  }

  const line = lineFromPoints(segment.start, segment.end);
  const boundaryResult = collectBoundaryContacts(target.vertices, segment, line, epsilon);
  if (boundaryResult.overlapEdgeIndex !== null) {
    diagnostics.push({
      code: 'subject-shape-split.overlap-boundary',
      severity: 'warning',
      message: `Shape split draft overlaps polygon edge ${boundaryResult.overlapEdgeIndex}.`,
      targetId: target.id,
      data: { edgeIndex: boundaryResult.overlapEdgeIndex }
    });
    return emptySplitModel(target, segment, basePreviewLine, diagnostics, options.meta);
  }

  const contacts = uniqueBoundaryContacts(boundaryResult.contacts, segment, epsilon);
  if (contacts.length !== 2) {
    diagnostics.push({
      code: 'subject-shape-split.insufficient-boundary-contact',
      severity: 'warning',
      message: 'Shape split requires exactly two boundary contacts.',
      targetId: target.id,
      data: { contactCount: contacts.length }
    });
    return emptySplitModel(target, segment, basePreviewLine, diagnostics, options.meta, contacts);
  }

  const splitSegment = segmentFromPoints(contacts[0].point, contacts[1].point);
  const splitLine = createSplitLineDescriptor(target, splitSegment, options, options.state ?? 'preview');
  const boundary = createBoundaryWithContacts(target.vertices, contacts, epsilon);
  const firstIndex = boundary.findIndex((entry) => entry.contactIndex === 0);
  const secondIndex = boundary.findIndex((entry) => entry.contactIndex === 1);
  const firstPath = firstIndex >= 0 && secondIndex >= 0 ? normalizePolygonVertices(pathBetween(boundary, firstIndex, secondIndex), epsilon) : [];
  const secondPath = firstIndex >= 0 && secondIndex >= 0 ? normalizePolygonVertices(pathBetween(boundary, secondIndex, firstIndex), epsilon) : [];
  const minPieceArea = options.minPieceArea ?? DEFAULT_MIN_PIECE_AREA;

  if (!isValidPiece(firstPath, minPieceArea) || !isValidPiece(secondPath, minPieceArea)) {
    diagnostics.push({
      code: 'subject-shape-split.degenerate-piece',
      severity: 'warning',
      message: 'Shape split would create a degenerate piece.',
      targetId: target.id,
      data: {
        firstVertexCount: firstPath.length,
        secondVertexCount: secondPath.length,
        firstArea: polygonArea(polygonFromVertices(firstPath)),
        secondArea: polygonArea(polygonFromVertices(secondPath))
      }
    });
    return emptySplitModel(target, segment, splitLine, diagnostics, options.meta, contacts);
  }

  const targetArea = polygonArea(polygonFromVertices(target.vertices));
  const firstArea = polygonArea(polygonFromVertices(firstPath));
  const secondArea = polygonArea(polygonFromVertices(secondPath));
  const midpoint = {
    x: (splitSegment.start.x + splitSegment.end.x) / 2,
    y: (splitSegment.start.y + splitSegment.end.y) / 2
  };
  if (
    !pointInPolygonOrOnBoundary(midpoint, target.vertices, epsilon)
    || Math.abs(firstArea + secondArea - targetArea) > Math.max(epsilon, targetArea * 1e-7)
  ) {
    diagnostics.push({
      code: 'subject-shape-split.invalid-split-line',
      severity: 'warning',
      message: 'Shape split line must stay inside the polygon.',
      targetId: target.id,
      data: { targetArea, firstArea, secondArea, midpoint }
    });
    return emptySplitModel(target, segment, splitLine, diagnostics, options.meta, contacts);
  }

  const pieces: [SubjectShapeSplitPiece, SubjectShapeSplitPiece] = [
    createSplitPiece(target, firstPath, splitSegment, 0, options),
    createSplitPiece(target, secondPath, splitSegment, 1, options)
  ];

  return {
    targetId: target.id,
    draft: cloneSegment(segment),
    previewLine: splitLine,
    splitLine,
    contacts: contacts.map(cloneContact),
    pieces,
    applied: true,
    canConfirm: true,
    diagnostics,
    meta: cloneMeta(options.meta)
  };
};

const collectBoundaryContacts = (
  vertices: readonly MathPoint2D[],
  draft: MathSegment2D,
  line: MathLine2D,
  epsilon: number
): { contacts: BoundaryContact[]; overlapEdgeIndex: number | null } => {
  const contacts: BoundaryContact[] = [];
  for (const edge of polygonEdges(vertices)) {
    const edgeSegment = segmentFromPoints(edge.start, edge.end);
    const edgeLine = lineFromPoints(edge.start, edge.end);
    if (length2D(edgeLine.direction) <= epsilon) continue;

    const intersection = intersectLines2D(line, edgeLine);
    if (intersection.kind === 'coincident') {
      const overlap = overlappingSegment(draft, edgeSegment, epsilon);
      if (overlap && distance2D(overlap.start, overlap.end) > epsilon) {
        return { contacts, overlapEdgeIndex: edge.index };
      }
      continue;
    }

    if (intersection.kind !== 'point') continue;
    if (!pointOnSegment(intersection.point, draft, epsilon) || !pointOnSegment(intersection.point, edgeSegment, epsilon)) continue;
    contacts.push({
      kind: 'boundary',
      point: clonePoint(intersection.point),
      edgeIndex: edge.index,
      tOnEdge: parameterOnSegment(intersection.point, edgeSegment)
    });
  }
  return { contacts, overlapEdgeIndex: null };
};

const createBoundaryWithContacts = (
  vertices: readonly MathPoint2D[],
  contacts: readonly BoundaryContact[],
  epsilon: number
): BoundaryPoint[] => {
  const boundary: BoundaryPoint[] = [];
  for (const [index, vertex] of vertices.entries()) {
    const vertexContactIndex = contacts.findIndex((contact) => pointsEqual(contact.point, vertex, epsilon));
    pushBoundaryPoint(boundary, vertex, vertexContactIndex >= 0 ? vertexContactIndex : undefined, epsilon);

    const next = vertices[(index + 1) % vertices.length];
    const edge = segmentFromPoints(vertex, next);
    const contactsOnEdge = contacts
      .map((contact, contactIndex) => ({ contact, contactIndex, t: parameterOnSegment(contact.point, edge) }))
      .filter((entry) => entry.t > epsilon && entry.t < 1 - epsilon && pointOnSegment(entry.contact.point, edge, epsilon))
      .sort((left, right) => left.t - right.t);

    for (const entry of contactsOnEdge) {
      pushBoundaryPoint(boundary, entry.contact.point, entry.contactIndex, epsilon);
    }
  }

  if (boundary.length > 1 && pointsEqual(boundary[0].point, boundary[boundary.length - 1].point, epsilon)) {
    boundary[0] = {
      ...boundary[0],
      contactIndex: boundary[0].contactIndex ?? boundary[boundary.length - 1].contactIndex
    };
    boundary.pop();
  }
  return boundary;
};

const pathBetween = (
  boundary: readonly BoundaryPoint[],
  startIndex: number,
  endIndex: number
): MathPoint2D[] => {
  const points: MathPoint2D[] = [];
  let index = startIndex;
  while (true) {
    points.push(clonePoint(boundary[index].point));
    if (index === endIndex) break;
    index = (index + 1) % boundary.length;
  }
  return points;
};

const createSplitPiece = (
  target: SubjectShapeSplitTarget,
  vertices: readonly MathPoint2D[],
  splitLine: MathSegment2D,
  splitIndex: number,
  options: SubjectShapeSplitOptions
): SubjectShapeSplitPiece => ({
  ...target,
  id: `${target.id}:split:${splitIndex + 1}`,
  vertices: vertices.map(clonePoint),
  shapeKind: inferShapeKindForVertices(vertices),
  splitIndex,
  splitLine: cloneSegment(splitLine),
  meta: {
    ...cloneMeta(target.meta),
    ...cloneMeta(options.meta),
    splitFrom: target.id,
    splitIndex
  }
});

const createSplitLineDescriptor = (
  target: SubjectShapeSplitTarget,
  segment: MathSegment2D,
  options: SubjectShapeSplitOptions,
  state: SubjectOverlayState
): SubjectAuxiliaryLineDescriptor => ({
  id: options.id ?? `${target.id}:split-line`,
  kind: 'split',
  label: options.label ?? '分割线',
  start: clonePoint(segment.start),
  end: clonePoint(segment.end),
  targetId: target.id,
  visible: true,
  state,
  selectable: false,
  style: {
    strokeColor: DEFAULT_SPLIT_LINE_COLOR,
    textColor: DEFAULT_SPLIT_LINE_COLOR,
    strokeWidth: 2,
    selectionStrokeScale: false,
    lineDash: [],
    ...cloneStyle(options.style)
  },
  meta: {
    shapeSplit: true,
    ...cloneMeta(options.meta)
  }
});

const emptySplitModel = (
  target: SubjectShapeSplitTarget,
  draft: MathSegment2D,
  previewLine: SubjectAuxiliaryLineDescriptor | null,
  diagnostics: readonly SubjectShapeSplitDiagnostic[],
  meta: Record<string, unknown> | undefined,
  contacts: readonly BoundaryContact[] = []
): SubjectShapeSplitModel => ({
  targetId: target.id,
  draft: cloneSegment(draft),
  previewLine,
  splitLine: null,
  contacts: contacts.map(cloneContact),
  pieces: [],
  applied: false,
  canConfirm: false,
  diagnostics,
  meta: cloneMeta(meta)
});

const isValidSplitTarget = (
  target: SubjectShapeSplitTarget,
  epsilon: number
): boolean => (
  !!target.id
  && target.vertices.length >= 3
  && target.vertices.every(isFinitePoint)
  && polygonArea(polygonFromVertices(target.vertices)) > epsilon
);

const isValidPiece = (
  vertices: readonly MathPoint2D[],
  minPieceArea: number
): boolean => vertices.length >= 3 && polygonArea(polygonFromVertices(vertices)) > minPieceArea;

const pointInPolygonOrOnBoundary = (
  point: MathPoint2D,
  vertices: readonly MathPoint2D[],
  epsilon: number
): boolean => (
  pointInPolygon2D(point, polygonFromVertices(vertices))
  || polygonEdges(vertices).some((edge) => pointOnSegment(point, segmentFromPoints(edge.start, edge.end), epsilon))
);

const inferShapeKindForVertices = (
  vertices: readonly MathPoint2D[]
): SubjectShapeSplitPiece['shapeKind'] => {
  if (vertices.length === 3) return 'triangle';
  if (vertices.length === 4) return 'quadrilateral';
  return 'polygon';
};

const polygonEdges = (
  vertices: readonly MathPoint2D[]
): Array<{ index: number; start: MathPoint2D; end: MathPoint2D }> => (
  vertices.map((vertex, index) => ({
    index,
    start: vertex,
    end: vertices[(index + 1) % vertices.length]
  }))
);

const uniqueBoundaryContacts = (
  contacts: readonly BoundaryContact[],
  draft: MathSegment2D,
  epsilon: number
): BoundaryContact[] => {
  const unique: BoundaryContact[] = [];
  for (const contact of contacts) {
    if (!unique.some((candidate) => pointsEqual(candidate.point, contact.point, epsilon))) {
      unique.push({
        ...contact,
        point: clonePoint(contact.point)
      });
    }
  }
  return unique.sort((left, right) => parameterOnSegment(left.point, draft) - parameterOnSegment(right.point, draft));
};

const normalizePolygonVertices = (
  vertices: readonly MathPoint2D[],
  epsilon: number
): MathPoint2D[] => {
  const normalized: MathPoint2D[] = [];
  for (const vertex of vertices) {
    if (!normalized.some((candidate, index) => index === normalized.length - 1 && pointsEqual(candidate, vertex, epsilon))) {
      normalized.push(clonePoint(vertex));
    }
  }
  if (normalized.length > 1 && pointsEqual(normalized[0], normalized[normalized.length - 1], epsilon)) {
    normalized.pop();
  }
  return normalized;
};

const pushBoundaryPoint = (
  boundary: BoundaryPoint[],
  point: MathPoint2D,
  contactIndex: number | undefined,
  epsilon: number
) => {
  const last = boundary[boundary.length - 1];
  if (last && pointsEqual(last.point, point, epsilon)) {
    if (contactIndex !== undefined) last.contactIndex = contactIndex;
    return;
  }
  boundary.push({
    point: clonePoint(point),
    ...(contactIndex !== undefined ? { contactIndex } : {})
  });
};

const overlappingSegment = (
  left: MathSegment2D,
  right: MathSegment2D,
  epsilon: number
): MathSegment2D | null => {
  const points = uniquePoints([
    ...[left.start, left.end].filter((point) => pointOnSegment(point, right, epsilon)),
    ...[right.start, right.end].filter((point) => pointOnSegment(point, left, epsilon))
  ], epsilon);
  if (points.length < 2) return null;
  const sorted = points.sort((first, second) => parameterOnSegment(first, left) - parameterOnSegment(second, left));
  return segmentFromPoints(sorted[0], sorted[sorted.length - 1]);
};

const pointOnSegment = (
  point: MathPoint2D,
  segment: MathSegment2D,
  epsilon: number
): boolean => {
  const segmentVector = subtract2D(segment.end, segment.start);
  const pointVector = subtract2D(point, segment.start);
  const cross = Math.abs(segmentVector.x * pointVector.y - segmentVector.y * pointVector.x);
  if (cross > epsilon * Math.max(1, length2D(segmentVector))) return false;
  const projection = dot2D(pointVector, segmentVector);
  return projection >= -epsilon && projection <= dot2D(segmentVector, segmentVector) + epsilon;
};

const parameterOnSegment = (
  point: MathPoint2D,
  segment: MathSegment2D
): number => {
  const direction = subtract2D(segment.end, segment.start);
  const denominator = dot2D(direction, direction);
  if (denominator <= GRAPH_MATH_EPSILON) return 0;
  return dot2D(subtract2D(point, segment.start), direction) / denominator;
};

const uniquePoints = (
  points: readonly MathPoint2D[],
  epsilon: number
): MathPoint2D[] => {
  const unique: MathPoint2D[] = [];
  for (const point of points) {
    if (!unique.some((candidate) => pointsEqual(candidate, point, epsilon))) unique.push(clonePoint(point));
  }
  return unique;
};

const pointsEqual = (
  left: MathPoint2D,
  right: MathPoint2D,
  epsilon: number
): boolean => distance2D(left, right) <= epsilon;

const isFinitePoint = (point: MathPoint2D): boolean => Number.isFinite(point.x) && Number.isFinite(point.y);

const clonePoint = (point: MathPoint2D): MathPoint2D => ({ x: point.x, y: point.y });

const cloneSegment = (segment: MathSegment2D): MathSegment2D => segmentFromPoints(segment.start, segment.end);

const cloneContact = (contact: BoundaryContact | SubjectShapeSplitContact): SubjectShapeSplitContact => ({
  kind: 'boundary',
  point: clonePoint(contact.point),
  edgeIndex: contact.edgeIndex
});

const cloneStyle = (style: SubjectOverlayStyle | undefined): SubjectOverlayStyle => ({
  ...(style ?? {}),
  ...(style?.lineDash ? { lineDash: [...style.lineDash] } : {})
});

const cloneMeta = (meta: Record<string, unknown> | undefined): Record<string, unknown> | undefined => (
  meta ? { ...meta } : undefined
);
