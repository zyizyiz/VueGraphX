import {
  cross2D,
  distance2D,
  dot2D,
  GRAPH_MATH_EPSILON,
  intersectLineCircle2D,
  intersectLines2D,
  length2D,
  lineFromPoints,
  segmentFromPoints,
  subtract2D,
  type MathIntersection2D,
  type MathLine2D,
  type MathPoint2D,
  type MathSegment2D,
  type MathVector2D
} from './geometry';
import type {
  SubjectAuxiliaryLineDescriptor,
  SubjectAngleOverlayTarget,
  SubjectCircleOverlayTarget,
  SubjectLineOverlayTarget,
  SubjectOverlayState,
  SubjectOverlayStyle,
  SubjectParallelLinesOverlayTarget,
  SubjectPolygonOverlayTarget,
  SubjectRayOverlayTarget,
  SubjectSegmentOverlayTarget
} from './subjectOverlays';
import { createSubjectAuxiliaryLineStyle } from './subjectAuxiliaryLineStyle';

export type SubjectAuxiliaryLineConstructionTarget =
  | SubjectPolygonOverlayTarget
  | SubjectCircleOverlayTarget
  | SubjectSegmentOverlayTarget
  | SubjectLineOverlayTarget
  | SubjectRayOverlayTarget
  | SubjectParallelLinesOverlayTarget
  | SubjectAngleOverlayTarget;

export interface SubjectAuxiliaryLineDraft {
  start: MathPoint2D;
  end: MathPoint2D;
}

export type SubjectAuxiliaryLineConstructionContactKind =
  | 'intersection'
  | 'tangent'
  | 'overlap'
  | 'inside-endpoint'
  | 'unconstrained';

export interface SubjectAuxiliaryLineConstructionContact {
  kind: SubjectAuxiliaryLineConstructionContactKind;
  point?: MathPoint2D;
  start?: MathPoint2D;
  end?: MathPoint2D;
  targetPart?: 'polygon-edge' | 'circle' | 'segment' | 'line' | 'ray' | 'parallel-line-segment' | 'angle-arm';
  edgeIndex?: number;
  meta?: Record<string, unknown>;
}

export type SubjectAuxiliaryLineRetentionPreset = 'any-contact' | 'boundary-contact';

export interface SubjectAuxiliaryLineRetentionContext {
  target: SubjectAuxiliaryLineConstructionTarget;
  draft: MathSegment2D;
  candidate: SubjectAuxiliaryLineDescriptor;
  contacts: readonly SubjectAuxiliaryLineConstructionContact[];
  diagnostics: readonly SubjectAuxiliaryLineConstructionDiagnostic[];
}

export type SubjectAuxiliaryLineRetentionRule =
  | SubjectAuxiliaryLineRetentionPreset
  | ((context: SubjectAuxiliaryLineRetentionContext) => boolean);

export interface SubjectAuxiliaryLineConstructionDiagnostic {
  code:
    | 'subject-construction.invalid-target'
    | 'subject-construction.invalid-draft'
    | 'subject-construction.clipped'
    | 'subject-construction.single-contact'
    | 'subject-construction.overlap-detected'
    | 'subject-construction.no-contact'
    | 'subject-construction.retention-rejected'
    | 'subject-construction.retention-rule-error';
  severity: 'info' | 'warning' | 'error';
  message: string;
  targetId?: string;
  data?: Record<string, unknown>;
}

export interface SubjectAuxiliaryLineConstructionOptions {
  id?: string;
  label?: string;
  style?: SubjectOverlayStyle;
  state?: SubjectOverlayState;
  selectable?: boolean;
  allowSingleContact?: boolean;
  allowSingleIntersection?: boolean;
  retentionRule?: SubjectAuxiliaryLineRetentionRule;
  preserveDraftSpan?: boolean;
  snapDistance?: number;
  meta?: Record<string, unknown>;
}

export interface SubjectAuxiliaryLineConstructionModel {
  targetId: string;
  draft: MathSegment2D;
  candidate: SubjectAuxiliaryLineDescriptor | null;
  previewLine: SubjectAuxiliaryLineDescriptor | null;
  contacts: readonly SubjectAuxiliaryLineConstructionContact[];
  applied: boolean;
  diagnostics: readonly SubjectAuxiliaryLineConstructionDiagnostic[];
  meta?: Record<string, unknown>;
}

export const createSubjectAuxiliaryLineConstructionModel = (
  target: SubjectAuxiliaryLineConstructionTarget,
  draft: SubjectAuxiliaryLineDraft,
  options: SubjectAuxiliaryLineConstructionOptions = {}
): SubjectAuxiliaryLineConstructionModel => {
  const diagnostics: SubjectAuxiliaryLineConstructionDiagnostic[] = [];
  const normalizedDraft = segmentFromPoints(draft.start, draft.end);
  const draftIsFinite = isFinitePoint(normalizedDraft.start) && isFinitePoint(normalizedDraft.end);
  const previewLine = draftIsFinite
    ? createDescriptor(target, normalizedDraft, {
      ...options,
      id: `${options.id ?? defaultConstructionId(target, normalizedDraft)}:preview`,
      state: 'preview',
      selectable: false,
      meta: { ...options.meta, draft: true }
    })
    : null;

  if (!isValidConstructionTarget(target)) {
    diagnostics.push({
      code: 'subject-construction.invalid-target',
      severity: 'error',
      message: `Subject auxiliary construction target ${target.id} has invalid geometry.`,
      targetId: target.id
    });
    return emptyConstructionModel(target, normalizedDraft, previewLine, diagnostics, options.meta);
  }

  if (!draftIsFinite) {
    diagnostics.push({
      code: 'subject-construction.invalid-draft',
      severity: 'error',
      message: 'Auxiliary line draft requires finite start and end points.',
      targetId: target.id
    });
    return emptyConstructionModel(target, normalizedDraft, null, diagnostics, options.meta);
  }

  const baseLine = lineFromPoints(normalizedDraft.start, normalizedDraft.end);
  if (length2D(baseLine.direction) <= GRAPH_MATH_EPSILON) {
    diagnostics.push({
      code: 'subject-construction.invalid-draft',
      severity: 'error',
      message: 'Auxiliary line draft requires two distinct finite points.',
      targetId: target.id
    });
    return emptyConstructionModel(target, normalizedDraft, previewLine, diagnostics, options.meta);
  }

  const result = constructAuxiliaryLine(target, normalizedDraft, baseLine, options, diagnostics);
  const candidate = applyRetentionRule(target, normalizedDraft, result.candidate, result.contacts, options, diagnostics);
  return {
    targetId: target.id,
    draft: normalizedDraft,
    candidate,
    previewLine: candidate ? { ...candidate, id: `${candidate.id}:preview`, state: 'preview', selectable: false } : previewLine,
    contacts: result.contacts,
    applied: candidate !== null,
    diagnostics,
    meta: options.meta
  };
};

export const hasSubjectAuxiliaryLineBoundaryContact = (
  contacts: readonly SubjectAuxiliaryLineConstructionContact[]
): boolean => contacts.some(isBoundaryContact);

const constructAuxiliaryLine = (
  target: SubjectAuxiliaryLineConstructionTarget,
  draft: MathSegment2D,
  line: MathLine2D,
  options: SubjectAuxiliaryLineConstructionOptions,
  diagnostics: SubjectAuxiliaryLineConstructionDiagnostic[]
): { candidate: SubjectAuxiliaryLineDescriptor | null; contacts: SubjectAuxiliaryLineConstructionContact[] } => {
  if (target.kind === 'polygon') return constructPolygonAuxiliaryLine(target, draft, line, options, diagnostics);
  if (target.kind === 'circle') return constructCircleAuxiliaryLine(target, draft, line, options, diagnostics);
  if (target.kind === 'segment') return constructSegmentAuxiliaryLine(target, draft, line, options, diagnostics);
  if (target.kind === 'line') return constructLineAuxiliaryLine(target, draft, line, options, diagnostics);
  if (target.kind === 'ray') return constructRayAuxiliaryLine(target, draft, line, options, diagnostics);
  if (target.kind === 'parallel-lines') return constructParallelLinesAuxiliaryLine(target, draft, line, options, diagnostics);
  return constructAngleAuxiliaryLine(target, draft, line, options, diagnostics);
};

const constructPolygonAuxiliaryLine = (
  target: SubjectPolygonOverlayTarget,
  draft: MathSegment2D,
  line: MathLine2D,
  options: SubjectAuxiliaryLineConstructionOptions,
  diagnostics: SubjectAuxiliaryLineConstructionDiagnostic[]
): { candidate: SubjectAuxiliaryLineDescriptor | null; contacts: SubjectAuxiliaryLineConstructionContact[] } => {
  const contacts: SubjectAuxiliaryLineConstructionContact[] = [];
  const points: MathPoint2D[] = [];
  const endpointTolerance = options.snapDistance ?? 0.12;
  const draftEndpointContacts: SubjectAuxiliaryLineConstructionContact[] = [draft.start, draft.end]
    .filter((endpoint) => pointInPolygonInclusive(endpoint, target.vertices, endpointTolerance))
    .map((point) => ({ kind: 'inside-endpoint', point: clonePoint(point), targetPart: 'polygon-edge' }));

  for (const edge of polygonEdges(target.vertices)) {
    const edgeLine = lineFromPoints(edge.start, edge.end);
    const intersection = intersectLines2D(line, edgeLine);
    if (intersection.kind === 'coincident') {
      const overlap = overlappingSegment(draft, segmentFromPoints(edge.start, edge.end));
      if (!overlap) continue;
      diagnostics.push({
        code: 'subject-construction.overlap-detected',
        severity: 'info',
        message: `Auxiliary line draft overlaps polygon edge ${edge.index}.`,
        targetId: target.id,
        data: { edgeIndex: edge.index }
      });
      contacts.push({ kind: 'overlap', start: clonePoint(overlap.start), end: clonePoint(overlap.end), targetPart: 'polygon-edge', edgeIndex: edge.index });
      return { candidate: createDescriptor(target, draft, { ...options, meta: { ...options.meta, overlapEdgeIndex: edge.index } }), contacts };
    }
    if (intersection.kind === 'point' && pointOnSegment2D(intersection.point, edge) && pointOnSegment2D(intersection.point, draft)) {
      points.push(intersection.point);
      contacts.push({ kind: 'intersection', point: clonePoint(intersection.point), targetPart: 'polygon-edge', edgeIndex: edge.index });
    }
  }

  for (const contact of draftEndpointContacts) {
    if (contact.point) points.push(contact.point);
    contacts.push(contact);
  }

  if (points.length < 2) {
    const snapDistance = options.snapDistance ?? 0.12;
    for (const [index, vertex] of target.vertices.entries()) {
      if (distancePointToLine(vertex, line) > snapDistance) continue;
      if (distancePointToSegment(vertex, draft) > snapDistance) continue;
      points.push(vertex);
      contacts.push({
        kind: 'intersection',
        point: clonePoint(vertex),
        targetPart: 'polygon-edge',
        edgeIndex: index,
        meta: { snapped: true }
      });
    }
  }

  if (draftEndpointContacts.length > 0) {
    const normalizedContacts = uniqueContacts(contacts);
    if (normalizedContacts.length <= 1 && (options.allowSingleContact ?? options.allowSingleIntersection ?? true) === false) {
      return noContact(target, diagnostics, normalizedContacts);
    }
    return {
      candidate: createDescriptor(target, draft, {
        ...options,
        meta: {
          ...options.meta,
          internalDraft: draftEndpointContacts.length === 2,
          endpointAnchoredDraft: draftEndpointContacts.length === 1
        }
      }),
      contacts: normalizedContacts
    };
  }

  const uniquePointsOnLine = uniquePoints(points);
  if (uniquePointsOnLine.length >= 2) {
    const [start, end] = extremesAlongLine(uniquePointsOnLine, line);
    diagnostics.push({
      code: 'subject-construction.clipped',
      severity: 'info',
      message: 'Auxiliary line draft was clipped to the polygon boundary.',
      targetId: target.id,
      data: { contactCount: uniquePointsOnLine.length }
    });
    return {
      candidate: createDescriptor(target, clippedCandidateSegment(draft, segmentFromPoints(start, end), options), {
        ...options,
        meta: { ...options.meta, clipped: true, ...(options.preserveDraftSpan ? { preservedDraftSpan: true } : {}) }
      }),
      contacts: uniqueContacts(contacts)
    };
  }

  return singleContactOrEmpty(target, draft, options, diagnostics, uniqueContacts(contacts));
};

const constructCircleAuxiliaryLine = (
  target: SubjectCircleOverlayTarget,
  draft: MathSegment2D,
  line: MathLine2D,
  options: SubjectAuxiliaryLineConstructionOptions,
  diagnostics: SubjectAuxiliaryLineConstructionDiagnostic[]
): { candidate: SubjectAuxiliaryLineDescriptor | null; contacts: SubjectAuxiliaryLineConstructionContact[] } => {
  const intersections = intersectionPoints(intersectLineCircle2D(line, { kind: 'circle', center: target.center, radius: target.radius }))
    .filter((point) => pointOnSegment2D(point, draft));
  const insideEndpoints = [draft.start, draft.end].filter((point) => pointInCircleInclusive(point, target));
  const lineIsTangent = Math.abs(distancePointToLine(target.center, line) - target.radius) <= 1e-6;
  const contacts = intersections.map<SubjectAuxiliaryLineConstructionContact>((point) => ({
    kind: lineIsTangent ? 'tangent' : 'intersection',
    point: clonePoint(point),
    targetPart: 'circle'
  })).concat(insideEndpoints.map<SubjectAuxiliaryLineConstructionContact>((point) => ({
    kind: 'inside-endpoint',
    point: clonePoint(point),
    targetPart: 'circle'
  })));
  const clippedPoints = uniquePoints([...intersections, ...insideEndpoints]);

  if (insideEndpoints.length === 2 && intersections.length === 0) {
    return {
      candidate: createDescriptor(target, draft, { ...options, meta: { ...options.meta, internalDraft: true } }),
      contacts: uniqueContacts(contacts)
    };
  }

  if (clippedPoints.length >= 2) {
    const [start, end] = extremesAlongLine(clippedPoints, line);
    diagnostics.push({
      code: 'subject-construction.clipped',
      severity: 'info',
      message: 'Auxiliary line draft was clipped to the circle boundary.',
      targetId: target.id,
      data: { contactCount: clippedPoints.length }
    });
    return {
      candidate: createDescriptor(target, clippedCandidateSegment(draft, segmentFromPoints(start, end), options), {
        ...options,
        meta: { ...options.meta, clipped: true, ...(options.preserveDraftSpan ? { preservedDraftSpan: true } : {}) }
      }),
      contacts: uniqueContacts(contacts)
    };
  }
  return singleContactOrEmpty(target, draft, options, diagnostics, uniqueContacts(contacts));
};

const constructSegmentAuxiliaryLine = (
  target: SubjectSegmentOverlayTarget,
  draft: MathSegment2D,
  line: MathLine2D,
  options: SubjectAuxiliaryLineConstructionOptions,
  diagnostics: SubjectAuxiliaryLineConstructionDiagnostic[]
): { candidate: SubjectAuxiliaryLineDescriptor | null; contacts: SubjectAuxiliaryLineConstructionContact[] } => {
  const targetSegment = segmentFromPoints(target.start, target.end);
  const intersection = intersectLines2D(line, lineFromPoints(targetSegment.start, targetSegment.end));
  if (intersection.kind === 'coincident') {
    const overlap = overlappingSegment(draft, targetSegment);
    if (!overlap) return noContact(target, diagnostics);
    diagnostics.push({
      code: 'subject-construction.overlap-detected',
      severity: 'info',
      message: 'Auxiliary line draft overlaps the target segment.',
      targetId: target.id
    });
    return {
      candidate: createDescriptor(target, draft, { ...options, meta: { ...options.meta, overlapSegment: true } }),
      contacts: [{ kind: 'overlap', start: clonePoint(overlap.start), end: clonePoint(overlap.end), targetPart: 'segment' }]
    };
  }
  if (intersection.kind === 'point' && pointOnSegment2D(intersection.point, targetSegment) && pointOnSegment2D(intersection.point, draft)) {
    return singleContactOrEmpty(target, draft, options, diagnostics, [{
      kind: 'intersection',
      point: clonePoint(intersection.point),
      targetPart: 'segment'
    }]);
  }
  return noContact(target, diagnostics);
};

const constructLineAuxiliaryLine = (
  target: SubjectLineOverlayTarget,
  draft: MathSegment2D,
  line: MathLine2D,
  options: SubjectAuxiliaryLineConstructionOptions,
  diagnostics: SubjectAuxiliaryLineConstructionDiagnostic[]
): { candidate: SubjectAuxiliaryLineDescriptor | null; contacts: SubjectAuxiliaryLineConstructionContact[] } => {
  const targetLine: MathLine2D = { kind: 'line', point: target.point, direction: target.direction };
  const intersection = intersectLines2D(line, targetLine);
  if (intersection.kind === 'coincident') {
    diagnostics.push({
      code: 'subject-construction.overlap-detected',
      severity: 'info',
      message: 'Auxiliary line draft overlaps the target line.',
      targetId: target.id
    });
    return {
      candidate: createDescriptor(target, draft, { ...options, meta: { ...options.meta, overlapLine: true } }),
      contacts: [{ kind: 'overlap', start: clonePoint(draft.start), end: clonePoint(draft.end), targetPart: 'line' }]
    };
  }
  if (intersection.kind === 'point' && pointOnSegment2D(intersection.point, draft)) {
    return singleContactOrEmpty(target, draft, options, diagnostics, [{
      kind: 'intersection',
      point: clonePoint(intersection.point),
      targetPart: 'line'
    }]);
  }
  return noContact(target, diagnostics);
};

const constructRayAuxiliaryLine = (
  target: SubjectRayOverlayTarget,
  draft: MathSegment2D,
  line: MathLine2D,
  options: SubjectAuxiliaryLineConstructionOptions,
  diagnostics: SubjectAuxiliaryLineConstructionDiagnostic[]
): { candidate: SubjectAuxiliaryLineDescriptor | null; contacts: SubjectAuxiliaryLineConstructionContact[] } => {
  const targetLine: MathLine2D = { kind: 'line', point: target.origin, direction: target.direction };
  const intersection = intersectLines2D(line, targetLine);
  if (intersection.kind === 'coincident') {
    const overlap = overlappingRaySegment(target.origin, target.direction, draft);
    if (!overlap) return noContact(target, diagnostics);
    diagnostics.push({
      code: 'subject-construction.overlap-detected',
      severity: 'info',
      message: 'Auxiliary line draft overlaps the target ray.',
      targetId: target.id
    });
    return {
      candidate: createDescriptor(target, draft, { ...options, meta: { ...options.meta, overlapRay: true } }),
      contacts: [{ kind: 'overlap', start: clonePoint(overlap.start), end: clonePoint(overlap.end), targetPart: 'ray' }]
    };
  }
  if (intersection.kind === 'point' && pointOnRay2D(intersection.point, target.origin, target.direction) && pointOnSegment2D(intersection.point, draft)) {
    return singleContactOrEmpty(target, draft, options, diagnostics, [{
      kind: 'intersection',
      point: clonePoint(intersection.point),
      targetPart: 'ray'
    }]);
  }
  return noContact(target, diagnostics);
};

const constructParallelLinesAuxiliaryLine = (
  target: SubjectParallelLinesOverlayTarget,
  draft: MathSegment2D,
  line: MathLine2D,
  options: SubjectAuxiliaryLineConstructionOptions,
  diagnostics: SubjectAuxiliaryLineConstructionDiagnostic[]
): { candidate: SubjectAuxiliaryLineDescriptor | null; contacts: SubjectAuxiliaryLineConstructionContact[] } => (
  constructSegmentPartsAuxiliaryLine(
    target,
    draft,
    line,
    target.segments.map((segment, index) => ({
      segment,
      targetPart: 'parallel-line-segment',
      meta: { segmentIndex: index }
    })),
    options,
    diagnostics
  )
);

const constructAngleAuxiliaryLine = (
  target: SubjectAngleOverlayTarget,
  draft: MathSegment2D,
  line: MathLine2D,
  options: SubjectAuxiliaryLineConstructionOptions,
  diagnostics: SubjectAuxiliaryLineConstructionDiagnostic[]
): { candidate: SubjectAuxiliaryLineDescriptor | null; contacts: SubjectAuxiliaryLineConstructionContact[] } => (
  constructSegmentPartsAuxiliaryLine(
    target,
    draft,
    line,
    [
      {
        segment: segmentFromPoints(target.vertex, target.first),
        targetPart: 'angle-arm',
        meta: { arm: 'first' }
      },
      {
        segment: segmentFromPoints(target.vertex, target.second),
        targetPart: 'angle-arm',
        meta: { arm: 'second' }
      }
    ],
    options,
    diagnostics
  )
);

const constructSegmentPartsAuxiliaryLine = (
  target: SubjectAuxiliaryLineConstructionTarget,
  draft: MathSegment2D,
  line: MathLine2D,
  parts: ReadonlyArray<{
    segment: MathSegment2D;
    targetPart: NonNullable<SubjectAuxiliaryLineConstructionContact['targetPart']>;
    meta?: Record<string, unknown>;
  }>,
  options: SubjectAuxiliaryLineConstructionOptions,
  diagnostics: SubjectAuxiliaryLineConstructionDiagnostic[]
): { candidate: SubjectAuxiliaryLineDescriptor | null; contacts: SubjectAuxiliaryLineConstructionContact[] } => {
  const points: MathPoint2D[] = [];
  const contacts: SubjectAuxiliaryLineConstructionContact[] = [];

  for (const part of parts) {
    const partLine = lineFromPoints(part.segment.start, part.segment.end);
    const intersection = intersectLines2D(line, partLine);
    if (intersection.kind === 'coincident') {
      const overlap = overlappingSegment(draft, part.segment);
      if (!overlap) continue;
      diagnostics.push({
        code: 'subject-construction.overlap-detected',
        severity: 'info',
        message: 'Auxiliary line draft overlaps a target segment.',
        targetId: target.id,
        data: part.meta
      });
      return {
        candidate: createDescriptor(target, draft, { ...options, meta: { ...options.meta, overlapSegment: true, ...part.meta } }),
        contacts: [{
          kind: 'overlap',
          start: clonePoint(overlap.start),
          end: clonePoint(overlap.end),
          targetPart: part.targetPart,
          meta: part.meta
        }]
      };
    }
    if (intersection.kind === 'point' && pointOnSegment2D(intersection.point, part.segment) && pointOnSegment2D(intersection.point, draft)) {
      points.push(intersection.point);
      contacts.push({
        kind: 'intersection',
        point: clonePoint(intersection.point),
        targetPart: part.targetPart,
        meta: part.meta
      });
    }
  }

  const uniquePointsOnLine = uniquePoints(points);
  if (uniquePointsOnLine.length >= 2) {
    const [start, end] = extremesAlongLine(uniquePointsOnLine, line);
    diagnostics.push({
      code: 'subject-construction.clipped',
      severity: 'info',
      message: 'Auxiliary line draft was clipped to target segments.',
      targetId: target.id,
      data: { contactCount: uniquePointsOnLine.length }
    });
    return {
      candidate: createDescriptor(target, clippedCandidateSegment(draft, segmentFromPoints(start, end), options), {
        ...options,
        meta: { ...options.meta, clipped: true, ...(options.preserveDraftSpan ? { preservedDraftSpan: true } : {}) }
      }),
      contacts: uniqueContacts(contacts)
    };
  }

  return singleContactOrEmpty(target, draft, options, diagnostics, uniqueContacts(contacts));
};

const singleContactOrEmpty = (
  target: SubjectAuxiliaryLineConstructionTarget,
  draft: MathSegment2D,
  options: SubjectAuxiliaryLineConstructionOptions,
  diagnostics: SubjectAuxiliaryLineConstructionDiagnostic[],
  contacts: SubjectAuxiliaryLineConstructionContact[]
): { candidate: SubjectAuxiliaryLineDescriptor | null; contacts: SubjectAuxiliaryLineConstructionContact[] } => {
  if (contacts.length > 0 && (options.allowSingleContact ?? options.allowSingleIntersection ?? true)) {
    diagnostics.push({
      code: 'subject-construction.single-contact',
      severity: 'info',
      message: 'Auxiliary line draft has a single contact and is kept as a free helper line.',
      targetId: target.id,
      data: { contactCount: contacts.length }
    });
    return {
      candidate: createDescriptor(target, draft, { ...options, meta: { ...options.meta, singleContact: true } }),
      contacts
    };
  }
  return noContact(target, diagnostics, contacts);
};

const noContact = (
  target: SubjectAuxiliaryLineConstructionTarget,
  diagnostics: SubjectAuxiliaryLineConstructionDiagnostic[],
  contacts: SubjectAuxiliaryLineConstructionContact[] = []
): { candidate: null; contacts: SubjectAuxiliaryLineConstructionContact[] } => {
  diagnostics.push({
    code: 'subject-construction.no-contact',
    severity: 'warning',
    message: `Auxiliary line draft does not contact target ${target.id}.`,
    targetId: target.id
  });
  return { candidate: null, contacts };
};

const clippedCandidateSegment = (
  draft: MathSegment2D,
  clipped: MathSegment2D,
  options: SubjectAuxiliaryLineConstructionOptions
): MathSegment2D => options.preserveDraftSpan ? draft : clipped;

const applyRetentionRule = (
  target: SubjectAuxiliaryLineConstructionTarget,
  draft: MathSegment2D,
  candidate: SubjectAuxiliaryLineDescriptor | null,
  contacts: readonly SubjectAuxiliaryLineConstructionContact[],
  options: SubjectAuxiliaryLineConstructionOptions,
  diagnostics: SubjectAuxiliaryLineConstructionDiagnostic[]
): SubjectAuxiliaryLineDescriptor | null => {
  if (!candidate) return null;
  const rule = options.retentionRule ?? 'any-contact';
  let retained = false;
  try {
    retained = typeof rule === 'function'
      ? rule({ target, draft, candidate, contacts, diagnostics: [...diagnostics] })
      : evaluateRetentionPreset(rule, contacts);
  } catch (error) {
    diagnostics.push({
      code: 'subject-construction.retention-rule-error',
      severity: 'error',
      message: `Auxiliary line retention rule failed for target ${target.id}.`,
      targetId: target.id,
      data: { message: error instanceof Error ? error.message : String(error) }
    });
    return null;
  }

  if (retained) return candidate;
  diagnostics.push({
    code: 'subject-construction.retention-rejected',
    severity: 'warning',
    message: `Auxiliary line candidate was rejected by the retention rule for target ${target.id}.`,
    targetId: target.id,
    data: {
      rule: typeof rule === 'string' ? rule : 'custom',
      contactKinds: contacts.map((contact) => contact.kind)
    }
  });
  return null;
};

const evaluateRetentionPreset = (
  rule: SubjectAuxiliaryLineRetentionPreset,
  contacts: readonly SubjectAuxiliaryLineConstructionContact[]
): boolean => {
  if (rule === 'boundary-contact') return hasSubjectAuxiliaryLineBoundaryContact(contacts);
  return contacts.length > 0;
};

const isBoundaryContact = (contact: SubjectAuxiliaryLineConstructionContact): boolean => (
  contact.kind === 'intersection'
  || contact.kind === 'tangent'
  || contact.kind === 'overlap'
);

const createDescriptor = (
  target: SubjectAuxiliaryLineConstructionTarget,
  segment: MathSegment2D,
  options: SubjectAuxiliaryLineConstructionOptions
): SubjectAuxiliaryLineDescriptor => ({
  id: options.id ?? defaultConstructionId(target, segment),
  kind: 'free',
  label: options.label ?? '自由辅助线',
  start: clonePoint(segment.start),
  end: clonePoint(segment.end),
  targetId: target.id,
  visible: true,
  state: options.state ?? 'preview',
  selectable: options.selectable ?? true,
  style: createSubjectAuxiliaryLineStyle({ kind: 'free', style: options.style }),
  meta: { freeDraw: true, construction: true, ...options.meta }
});

const emptyConstructionModel = (
  target: SubjectAuxiliaryLineConstructionTarget,
  draft: MathSegment2D,
  previewLine: SubjectAuxiliaryLineDescriptor | null,
  diagnostics: readonly SubjectAuxiliaryLineConstructionDiagnostic[],
  meta: Record<string, unknown> | undefined
): SubjectAuxiliaryLineConstructionModel => ({
  targetId: target.id,
  draft,
  candidate: null,
  previewLine,
  contacts: [],
  applied: false,
  diagnostics,
  meta
});

const isValidConstructionTarget = (target: SubjectAuxiliaryLineConstructionTarget): boolean => {
  if (!target.id) return false;
  if (target.kind === 'polygon') return target.vertices.length >= 3 && target.vertices.every(isFinitePoint);
  if (target.kind === 'circle') return isFinitePoint(target.center) && Number.isFinite(target.radius) && target.radius > GRAPH_MATH_EPSILON;
  if (target.kind === 'segment') return isFinitePoint(target.start) && isFinitePoint(target.end) && distance2D(target.start, target.end) > GRAPH_MATH_EPSILON;
  if (target.kind === 'line') return isFinitePoint(target.point) && isFinitePoint(target.direction) && length2D(target.direction) > GRAPH_MATH_EPSILON;
  if (target.kind === 'ray') return isFinitePoint(target.origin) && isFinitePoint(target.direction) && length2D(target.direction) > GRAPH_MATH_EPSILON;
  if (target.kind === 'parallel-lines') {
    return target.segments.length === 2 && target.segments.every((segment) => (
      isFinitePoint(segment.start) && isFinitePoint(segment.end) && distance2D(segment.start, segment.end) > GRAPH_MATH_EPSILON
    ));
  }
  return [target.vertex, target.first, target.second].every(isFinitePoint)
    && distance2D(target.vertex, target.first) > GRAPH_MATH_EPSILON
    && distance2D(target.vertex, target.second) > GRAPH_MATH_EPSILON;
};

const polygonEdges = (vertices: readonly MathPoint2D[]): Array<{ index: number; start: MathPoint2D; end: MathPoint2D }> => (
  vertices.map((vertex, index) => ({
    index,
    start: vertex,
    end: vertices[(index + 1) % vertices.length]
  }))
);

const extremesAlongLine = (
  points: readonly MathPoint2D[],
  line: MathLine2D
): [MathPoint2D, MathPoint2D] => {
  const sorted = [...points].sort((left, right) => parameterOnLine(left, line) - parameterOnLine(right, line));
  return [clonePoint(sorted[0]), clonePoint(sorted[sorted.length - 1])];
};

const parameterOnLine = (point: MathPoint2D, line: MathLine2D): number => (
  dot2D(subtract2D(point, line.point), line.direction) / Math.max(GRAPH_MATH_EPSILON, dot2D(line.direction, line.direction))
);

const overlappingSegment = (
  draft: MathSegment2D,
  target: MathSegment2D
): MathSegment2D | null => {
  const points = uniquePoints([
    ...[draft.start, draft.end].filter((point) => pointOnSegment2D(point, target)),
    ...[target.start, target.end].filter((point) => pointOnSegment2D(point, draft))
  ]);
  if (points.length === 0) return null;
  if (points.length === 1) return segmentFromPoints(points[0], points[0]);
  const [start, end] = extremesAlongLine(points, lineFromPoints(draft.start, draft.end));
  return segmentFromPoints(start, end);
};

const overlappingRaySegment = (
  origin: MathPoint2D,
  direction: MathVector2D,
  draft: MathSegment2D
): MathSegment2D | null => {
  const points = uniquePoints([
    ...[draft.start, draft.end].filter((point) => pointOnRay2D(point, origin, direction)),
    ...(pointOnSegment2D(origin, draft) ? [origin] : [])
  ]);
  if (points.length === 0) return null;
  if (points.length === 1) return segmentFromPoints(points[0], points[0]);
  const [start, end] = extremesAlongLine(points, { kind: 'line', point: origin, direction });
  return segmentFromPoints(start, end);
};

const intersectionPoints = (intersection: MathIntersection2D): MathPoint2D[] => {
  if (intersection.kind === 'point') return [intersection.point];
  if (intersection.kind === 'points') return intersection.points;
  return [];
};

const uniquePoints = (points: readonly MathPoint2D[], epsilon = 1e-6): MathPoint2D[] => {
  const unique: MathPoint2D[] = [];
  for (const point of points) {
    if (!unique.some((candidate) => distance2D(candidate, point) <= epsilon)) unique.push(clonePoint(point));
  }
  return unique;
};

const uniqueContacts = (
  contacts: readonly SubjectAuxiliaryLineConstructionContact[],
  epsilon = 1e-6
): SubjectAuxiliaryLineConstructionContact[] => {
  const unique: SubjectAuxiliaryLineConstructionContact[] = [];
  for (const contact of contacts) {
    if (!contact.point) {
      unique.push(contact);
      continue;
    }
    if (!unique.some((candidate) => candidate.point && distance2D(candidate.point, contact.point!) <= epsilon)) unique.push(contact);
  }
  return unique;
};

const pointInPolygonInclusive = (
  point: MathPoint2D,
  vertices: readonly MathPoint2D[],
  boundaryTolerance = 1e-7
): boolean => {
  if (polygonEdges(vertices).some((edge) => pointOnSegment2D(point, edge, boundaryTolerance))) return true;
  if (polygonEdges(vertices).some((edge) => distancePointToSegment(point, edge) <= boundaryTolerance)) return true;
  let inside = false;
  for (let index = 0, previousIndex = vertices.length - 1; index < vertices.length; previousIndex = index, index += 1) {
    const current = vertices[index];
    const previous = vertices[previousIndex];
    const intersects = ((current.y > point.y) !== (previous.y > point.y))
      && point.x < ((previous.x - current.x) * (point.y - current.y)) / (previous.y - current.y) + current.x;
    if (intersects) inside = !inside;
  }
  return inside;
};

const pointInCircleInclusive = (
  point: MathPoint2D,
  circle: SubjectCircleOverlayTarget,
  epsilon = 1e-7
): boolean => distance2D(point, circle.center) <= circle.radius + epsilon;

const pointOnSegment2D = (
  point: MathPoint2D,
  segment: Pick<MathSegment2D, 'start' | 'end'>,
  epsilon = 1e-7
): boolean => {
  const segmentVector = subtract2D(segment.end, segment.start);
  const pointVector = subtract2D(point, segment.start);
  if (Math.abs(cross2D(segmentVector, pointVector)) > epsilon * Math.max(1, length2D(segmentVector))) return false;
  const projection = dot2D(pointVector, segmentVector);
  return projection >= -epsilon && projection <= dot2D(segmentVector, segmentVector) + epsilon;
};

const pointOnRay2D = (
  point: MathPoint2D,
  origin: MathPoint2D,
  direction: MathPoint2D,
  epsilon = 1e-7
): boolean => (
  Math.abs(cross2D(direction, subtract2D(point, origin))) <= epsilon * Math.max(1, length2D(direction))
    && dot2D(subtract2D(point, origin), direction) >= -epsilon
);

const distancePointToLine = (point: MathPoint2D, line: MathLine2D): number => (
  Math.abs(cross2D(line.direction, subtract2D(point, line.point))) / Math.max(GRAPH_MATH_EPSILON, length2D(line.direction))
);

const distancePointToSegment = (
  point: MathPoint2D,
  segment: Pick<MathSegment2D, 'start' | 'end'>
): number => {
  const segmentVector = subtract2D(segment.end, segment.start);
  const lengthSquared = dot2D(segmentVector, segmentVector);
  if (lengthSquared <= GRAPH_MATH_EPSILON) return distance2D(point, segment.start);

  const rawProjection = dot2D(subtract2D(point, segment.start), segmentVector) / lengthSquared;
  const projection = Math.max(0, Math.min(1, rawProjection));
  return distance2D(point, {
    x: segment.start.x + segmentVector.x * projection,
    y: segment.start.y + segmentVector.y * projection
  });
};

const defaultConstructionId = (
  target: SubjectAuxiliaryLineConstructionTarget,
  segment: MathSegment2D
): string => `${target.id}:free:${hashConstructionValue({ start: segment.start, end: segment.end })}`;

const hashConstructionValue = (value: unknown): string => {
  const source = JSON.stringify(value);
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
};

const isFinitePoint = (point: MathPoint2D): boolean => Number.isFinite(point.x) && Number.isFinite(point.y);

const clonePoint = (point: MathPoint2D): MathPoint2D => ({ x: point.x, y: point.y });
