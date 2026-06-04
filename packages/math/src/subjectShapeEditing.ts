import {
  add2D,
  boundsForPoints,
  distance2D,
  GRAPH_MATH_EPSILON,
  length2D,
  point2D,
  polygonArea,
  polygonFromVertices,
  subtract2D,
  type MathBounds2D,
  type MathPoint2D,
  type MathVector2D
} from './geometry';
import type {
  SubjectAuxiliaryLineDescriptor,
  SubjectCircleOverlayTarget,
  SubjectLineOverlayTarget,
  SubjectOverlayStyle,
  SubjectPolygonOverlayTarget,
  SubjectRayOverlayTarget,
  SubjectSegmentOverlayTarget
} from './subjectOverlays';
import type { SubjectGeometryBoundsMode, SubjectGeometryGridSnapOptions } from './subjectTransforms';

export type SubjectShapeEditTarget =
  | SubjectPolygonOverlayTarget
  | SubjectCircleOverlayTarget
  | SubjectSegmentOverlayTarget
  | SubjectLineOverlayTarget
  | SubjectRayOverlayTarget;

export type SubjectShapeEditHandleKind =
  | 'vertex'
  | 'center'
  | 'radius'
  | 'start'
  | 'end'
  | 'point'
  | 'direction'
  | 'origin';

export interface SubjectShapeEditHandleDescriptor {
  id: string;
  kind: SubjectShapeEditHandleKind;
  label: string;
  point: MathPoint2D;
  targetId: string;
  index?: number;
  meta?: Record<string, unknown>;
}

export interface SubjectShapeEditOperation {
  handleId?: string;
  handleKind?: SubjectShapeEditHandleKind;
  index?: number;
  point: MathPoint2D;
  meta?: Record<string, unknown>;
}

export interface SubjectShapeEditPreviewOptions {
  includeHandleLine?: boolean;
  style?: SubjectOverlayStyle;
}

export interface SubjectShapeEditOptions {
  bounds?: MathBounds2D;
  boundsMode?: SubjectGeometryBoundsMode;
  snapToGrid?: boolean | SubjectGeometryGridSnapOptions;
  minLength?: number;
  minRadius?: number;
  minPolygonArea?: number;
  preview?: SubjectShapeEditPreviewOptions;
  meta?: Record<string, unknown>;
}

export interface SubjectShapeEditDiagnostic {
  code:
    | 'subject-shape-edit.invalid-target'
    | 'subject-shape-edit.invalid-handle'
    | 'subject-shape-edit.invalid-point'
    | 'subject-shape-edit.degenerate-geometry'
    | 'subject-shape-edit.snap-applied'
    | 'subject-shape-edit.bounds-adjusted'
    | 'subject-shape-edit.out-of-bounds';
  severity: 'info' | 'warning' | 'error';
  message: string;
  targetId?: string;
  data?: Record<string, unknown>;
}

export interface SubjectShapeEditModel<Target extends SubjectShapeEditTarget = SubjectShapeEditTarget> {
  targetId: string;
  before: Target;
  after: Target;
  applied: boolean;
  operation: SubjectShapeEditOperation;
  activeHandle?: SubjectShapeEditHandleDescriptor;
  beforeHandles: readonly SubjectShapeEditHandleDescriptor[];
  afterHandles: readonly SubjectShapeEditHandleDescriptor[];
  previewLines: readonly SubjectAuxiliaryLineDescriptor[];
  diagnostics: readonly SubjectShapeEditDiagnostic[];
  meta?: Record<string, unknown>;
}

export const createSubjectShapeEditHandles = (
  target: SubjectShapeEditTarget
): readonly SubjectShapeEditHandleDescriptor[] => {
  if (target.kind === 'polygon') {
    return target.vertices.map((vertex, index) => createHandle(target.id, 'vertex', letterLabel(index), vertex, index));
  }
  if (target.kind === 'circle') {
    return [
      createHandle(target.id, 'center', 'O', target.center),
      createHandle(target.id, 'radius', 'r', point2D(target.center.x + target.radius, target.center.y))
    ];
  }
  if (target.kind === 'segment') {
    return [
      createHandle(target.id, 'start', 'A', target.start),
      createHandle(target.id, 'end', 'B', target.end)
    ];
  }
  if (target.kind === 'line') {
    return [
      createHandle(target.id, 'point', 'P', target.point),
      createHandle(target.id, 'direction', 'd', add2D(target.point, target.direction))
    ];
  }
  return [
    createHandle(target.id, 'origin', 'O', target.origin),
    createHandle(target.id, 'direction', 'd', add2D(target.origin, target.direction))
  ];
};

export const createSubjectShapeEditModel = <Target extends SubjectShapeEditTarget>(
  target: Target,
  operation: SubjectShapeEditOperation,
  options: SubjectShapeEditOptions = {}
): SubjectShapeEditModel<Target> => {
  const diagnostics: SubjectShapeEditDiagnostic[] = [];
  const before = cloneTarget(target);
  const beforeHandles = createSubjectShapeEditHandles(before);

  if (!isValidEditTarget(target, options)) {
    diagnostics.push({
      code: 'subject-shape-edit.invalid-target',
      severity: 'error',
      message: `Subject shape edit target ${target.id} has invalid geometry.`,
      targetId: target.id
    });
    return createEditModel(target, operation, before, before, false, undefined, beforeHandles, beforeHandles, [], diagnostics, options.meta);
  }

  if (!isFinitePoint(operation.point)) {
    diagnostics.push({
      code: 'subject-shape-edit.invalid-point',
      severity: 'error',
      message: 'Subject shape edit operation requires a finite destination point.',
      targetId: target.id
    });
    return createEditModel(target, operation, before, before, false, undefined, beforeHandles, beforeHandles, [], diagnostics, options.meta);
  }

  const activeHandle = resolveHandle(beforeHandles, operation);
  if (!activeHandle) {
    diagnostics.push({
      code: 'subject-shape-edit.invalid-handle',
      severity: 'error',
      message: `Subject shape edit target ${target.id} does not expose the requested handle.`,
      targetId: target.id,
      data: { handleId: operation.handleId, handleKind: operation.handleKind, index: operation.index }
    });
    return createEditModel(target, operation, before, before, false, undefined, beforeHandles, beforeHandles, [], diagnostics, options.meta);
  }

  const snappedPoint = snapEditPointIfNeeded(operation.point, options.snapToGrid, diagnostics, target.id);
  const edited = applyHandleEdit(target, activeHandle, snappedPoint) as Target;
  const validEdited = isValidEditTarget(edited, options);
  if (!validEdited) {
    diagnostics.push({
      code: 'subject-shape-edit.degenerate-geometry',
      severity: 'error',
      message: `Subject shape edit for ${target.id} would create degenerate geometry.`,
      targetId: target.id
    });
  }

  const bounded = validEdited
    ? applyEditBoundsIfNeeded(edited, options.bounds, options.boundsMode ?? 'none', diagnostics)
    : edited;
  const applied = diagnostics.every((diagnostic) => diagnostic.severity !== 'error');
  const after = applied ? bounded : before;
  const afterHandles = createSubjectShapeEditHandles(after);
  const previewLines = createEditPreviewLines(target.id, activeHandle, matchingHandle(afterHandles, activeHandle), options.preview);

  return createEditModel(target, operation, before, after, applied, activeHandle, beforeHandles, afterHandles, previewLines, diagnostics, options.meta);
};

export const applySubjectShapeEdit = <Target extends SubjectShapeEditTarget>(
  target: Target,
  operation: SubjectShapeEditOperation,
  options: SubjectShapeEditOptions = {}
): Target => createSubjectShapeEditModel(target, operation, options).after;

const createEditModel = <Target extends SubjectShapeEditTarget>(
  target: Target,
  operation: SubjectShapeEditOperation,
  before: Target,
  after: Target,
  applied: boolean,
  activeHandle: SubjectShapeEditHandleDescriptor | undefined,
  beforeHandles: readonly SubjectShapeEditHandleDescriptor[],
  afterHandles: readonly SubjectShapeEditHandleDescriptor[],
  previewLines: readonly SubjectAuxiliaryLineDescriptor[],
  diagnostics: readonly SubjectShapeEditDiagnostic[],
  meta: Record<string, unknown> | undefined
): SubjectShapeEditModel<Target> => ({
  targetId: target.id,
  before,
  after,
  applied,
  operation: {
    ...operation,
    point: clonePoint(operation.point),
    meta: cloneMeta(operation.meta)
  },
  activeHandle,
  beforeHandles,
  afterHandles,
  previewLines,
  diagnostics,
  meta
});

const createHandle = (
  targetId: string,
  kind: SubjectShapeEditHandleKind,
  label: string,
  point: MathPoint2D,
  index?: number
): SubjectShapeEditHandleDescriptor => ({
  id: `${targetId}:handle:${kind}${index === undefined ? '' : `:${index}`}`,
  kind,
  label,
  point: clonePoint(point),
  targetId,
  ...(index === undefined ? {} : { index })
});

const resolveHandle = (
  handles: readonly SubjectShapeEditHandleDescriptor[],
  operation: SubjectShapeEditOperation
): SubjectShapeEditHandleDescriptor | undefined => {
  if (operation.handleId) return handles.find((handle) => handle.id === operation.handleId);
  return handles.find((handle) => (
    handle.kind === operation.handleKind
      && (operation.index === undefined || handle.index === operation.index)
  ));
};

const matchingHandle = (
  handles: readonly SubjectShapeEditHandleDescriptor[],
  source: SubjectShapeEditHandleDescriptor
): SubjectShapeEditHandleDescriptor | undefined => handles.find((handle) => handle.id === source.id);

const applyHandleEdit = (
  target: SubjectShapeEditTarget,
  handle: SubjectShapeEditHandleDescriptor,
  point: MathPoint2D
): SubjectShapeEditTarget => {
  if (target.kind === 'polygon') {
    const vertices = target.vertices.map((vertex, index) => index === handle.index ? clonePoint(point) : clonePoint(vertex));
    return { ...target, vertices, meta: cloneMeta(target.meta) };
  }
  if (target.kind === 'circle') {
    if (handle.kind === 'center') return { ...target, center: clonePoint(point), meta: cloneMeta(target.meta) };
    return { ...target, radius: distance2D(target.center, point), meta: cloneMeta(target.meta) };
  }
  if (target.kind === 'segment') {
    if (handle.kind === 'start') return { ...target, start: clonePoint(point), meta: cloneMeta(target.meta) };
    return { ...target, end: clonePoint(point), meta: cloneMeta(target.meta) };
  }
  if (target.kind === 'line') {
    if (handle.kind === 'point') return { ...target, point: clonePoint(point), meta: cloneMeta(target.meta) };
    return { ...target, direction: subtract2D(point, target.point), meta: cloneMeta(target.meta) };
  }
  if (handle.kind === 'origin') return { ...target, origin: clonePoint(point), meta: cloneMeta(target.meta) };
  return { ...target, direction: subtract2D(point, target.origin), meta: cloneMeta(target.meta) };
};

const snapEditPointIfNeeded = (
  point: MathPoint2D,
  input: boolean | SubjectGeometryGridSnapOptions | undefined,
  diagnostics: SubjectShapeEditDiagnostic[],
  targetId: string
): MathPoint2D => {
  const snap = resolveGridSnapOptions(input);
  if (!snap.enabled) return clonePoint(point);
  const snapped = snapPointToGrid(point, snap);
  if (distance2D(point, snapped) > snap.tolerance) return clonePoint(point);
  diagnostics.push({
    code: 'subject-shape-edit.snap-applied',
    severity: 'info',
    message: `Subject shape edit point snapped to (${formatNumber(snapped.x)}, ${formatNumber(snapped.y)}).`,
    targetId,
    data: { before: clonePoint(point), after: snapped }
  });
  return snapped;
};

const applyEditBoundsIfNeeded = <Target extends SubjectShapeEditTarget>(
  target: Target,
  bounds: MathBounds2D | undefined,
  mode: SubjectGeometryBoundsMode,
  diagnostics: SubjectShapeEditDiagnostic[]
): Target => {
  if (!bounds || mode === 'none') return target;
  const currentBounds = editTargetBounds(target);
  if (!currentBounds || boundsContainBounds(bounds, currentBounds)) return target;
  if (mode === 'reject') {
    diagnostics.push({
      code: 'subject-shape-edit.out-of-bounds',
      severity: 'error',
      message: `Subject shape edit moved ${target.id} outside of the allowed bounds.`,
      targetId: target.id,
      data: { bounds: currentBounds, allowedBounds: bounds }
    });
    return target;
  }

  const correction = translationToFitBounds(currentBounds, bounds);
  if (!correction) {
    diagnostics.push({
      code: 'subject-shape-edit.out-of-bounds',
      severity: 'error',
      message: `Subject shape edit result for ${target.id} is larger than the allowed bounds.`,
      targetId: target.id,
      data: { bounds: currentBounds, allowedBounds: bounds }
    });
    return target;
  }

  diagnostics.push({
    code: 'subject-shape-edit.bounds-adjusted',
    severity: 'info',
    message: `Subject shape edit result for ${target.id} was translated back inside bounds.`,
    targetId: target.id,
    data: { delta: correction }
  });
  return translateEditTarget(target, correction);
};

const createEditPreviewLines = (
  targetId: string,
  beforeHandle: SubjectShapeEditHandleDescriptor,
  afterHandle: SubjectShapeEditHandleDescriptor | undefined,
  options: SubjectShapeEditPreviewOptions | undefined
): readonly SubjectAuxiliaryLineDescriptor[] => {
  if (options?.includeHandleLine === false || !afterHandle || distance2D(beforeHandle.point, afterHandle.point) <= GRAPH_MATH_EPSILON) return [];
  return [{
    id: `${targetId}:edit-preview:${beforeHandle.kind}${beforeHandle.index === undefined ? '' : `:${beforeHandle.index}`}`,
    kind: 'free',
    label: '编辑轨迹',
    start: clonePoint(beforeHandle.point),
    end: clonePoint(afterHandle.point),
    targetId,
    visible: true,
    state: 'preview',
    selectable: false,
    style: {
      strokeColor: '#7C3AED',
      strokeWidth: 1,
      lineDash: [4, 8],
      ...cloneStyle(options?.style)
    },
    meta: { previewKind: 'shape-edit-handle' }
  }];
};

const isValidEditTarget = (
  target: SubjectShapeEditTarget,
  options: Pick<SubjectShapeEditOptions, 'minLength' | 'minRadius' | 'minPolygonArea'> = {}
): boolean => {
  if (!target.id) return false;
  const minLength = options.minLength ?? GRAPH_MATH_EPSILON;
  const minRadius = options.minRadius ?? GRAPH_MATH_EPSILON;
  const minPolygonArea = options.minPolygonArea ?? GRAPH_MATH_EPSILON;
  if (target.kind === 'polygon') {
    return target.vertices.length >= 3
      && target.vertices.every(isFinitePoint)
      && polygonArea(polygonFromVertices(target.vertices)) > minPolygonArea;
  }
  if (target.kind === 'circle') return isFinitePoint(target.center) && Number.isFinite(target.radius) && target.radius > minRadius;
  if (target.kind === 'segment') return isFinitePoint(target.start) && isFinitePoint(target.end) && distance2D(target.start, target.end) > minLength;
  if (target.kind === 'line') return isFinitePoint(target.point) && isFinitePoint(target.direction) && length2D(target.direction) > minLength;
  return isFinitePoint(target.origin) && isFinitePoint(target.direction) && length2D(target.direction) > minLength;
};

const editTargetBounds = (target: SubjectShapeEditTarget): MathBounds2D | null => {
  if (target.kind === 'polygon') return boundsForPoints(target.vertices);
  if (target.kind === 'segment') return boundsForPoints([target.start, target.end]);
  if (target.kind === 'circle') {
    return {
      minX: target.center.x - target.radius,
      minY: target.center.y - target.radius,
      maxX: target.center.x + target.radius,
      maxY: target.center.y + target.radius
    };
  }
  if (target.kind === 'line') return boundsForPoints([target.point, add2D(target.point, target.direction)]);
  return boundsForPoints([target.origin, add2D(target.origin, target.direction)]);
};

const translateEditTarget = <Target extends SubjectShapeEditTarget>(
  target: Target,
  delta: MathVector2D
): Target => {
  if (target.kind === 'polygon') {
    return { ...target, vertices: target.vertices.map((vertex) => add2D(vertex, delta)), meta: cloneMeta(target.meta) } as Target;
  }
  if (target.kind === 'segment') {
    return { ...target, start: add2D(target.start, delta), end: add2D(target.end, delta), meta: cloneMeta(target.meta) } as Target;
  }
  if (target.kind === 'circle') return { ...target, center: add2D(target.center, delta), meta: cloneMeta(target.meta) } as Target;
  if (target.kind === 'line') return { ...target, point: add2D(target.point, delta), meta: cloneMeta(target.meta) } as Target;
  return { ...target, origin: add2D(target.origin, delta), meta: cloneMeta(target.meta) } as Target;
};

const boundsContainBounds = (outer: MathBounds2D, inner: MathBounds2D): boolean => (
  inner.minX >= outer.minX - GRAPH_MATH_EPSILON
    && inner.maxX <= outer.maxX + GRAPH_MATH_EPSILON
    && inner.minY >= outer.minY - GRAPH_MATH_EPSILON
    && inner.maxY <= outer.maxY + GRAPH_MATH_EPSILON
);

const translationToFitBounds = (
  current: MathBounds2D,
  allowed: MathBounds2D
): MathVector2D | null => {
  if (current.maxX - current.minX > allowed.maxX - allowed.minX + GRAPH_MATH_EPSILON) return null;
  if (current.maxY - current.minY > allowed.maxY - allowed.minY + GRAPH_MATH_EPSILON) return null;
  let x = 0;
  let y = 0;
  if (current.minX < allowed.minX) x = allowed.minX - current.minX;
  else if (current.maxX > allowed.maxX) x = allowed.maxX - current.maxX;
  if (current.minY < allowed.minY) y = allowed.minY - current.minY;
  else if (current.maxY > allowed.maxY) y = allowed.maxY - current.maxY;
  return point2D(x, y);
};

const resolveGridSnapOptions = (
  input: boolean | SubjectGeometryGridSnapOptions | undefined
): Required<SubjectGeometryGridSnapOptions> => {
  if (input === true) return { enabled: true, step: 1, origin: point2D(0, 0), tolerance: Infinity };
  if (!input) return { enabled: false, step: 1, origin: point2D(0, 0), tolerance: 0 };
  const step = typeof input.step === 'number' && Number.isFinite(input.step) && input.step > GRAPH_MATH_EPSILON ? input.step : 1;
  return {
    enabled: input.enabled !== false,
    step,
    origin: input.origin ? clonePoint(input.origin) : point2D(0, 0),
    tolerance: typeof input.tolerance === 'number' && Number.isFinite(input.tolerance) ? Math.max(0, input.tolerance) : Infinity
  };
};

const snapPointToGrid = (
  point: MathPoint2D,
  snap: Required<SubjectGeometryGridSnapOptions>
): MathPoint2D => ({
  x: snap.origin.x + Math.round((point.x - snap.origin.x) / snap.step) * snap.step,
  y: snap.origin.y + Math.round((point.y - snap.origin.y) / snap.step) * snap.step
});

const cloneTarget = <Target extends SubjectShapeEditTarget>(target: Target): Target => {
  if (target.kind === 'polygon') return { ...target, vertices: target.vertices.map(clonePoint), meta: cloneMeta(target.meta) } as Target;
  if (target.kind === 'circle') return { ...target, center: clonePoint(target.center), meta: cloneMeta(target.meta) } as Target;
  if (target.kind === 'segment') return { ...target, start: clonePoint(target.start), end: clonePoint(target.end), meta: cloneMeta(target.meta) } as Target;
  if (target.kind === 'line') return { ...target, point: clonePoint(target.point), direction: clonePoint(target.direction), meta: cloneMeta(target.meta) } as Target;
  return { ...target, origin: clonePoint(target.origin), direction: clonePoint(target.direction), meta: cloneMeta(target.meta) } as Target;
};

const isFinitePoint = (point: MathPoint2D): boolean => Number.isFinite(point.x) && Number.isFinite(point.y);

const clonePoint = (point: MathPoint2D): MathPoint2D => ({ x: point.x, y: point.y });

const cloneMeta = <T extends Record<string, unknown> | undefined>(meta: T): T => (
  meta ? { ...meta } as T : undefined as T
);

const cloneStyle = (style: SubjectOverlayStyle | undefined): SubjectOverlayStyle | undefined => (
  style ? { ...style, ...(style.lineDash ? { lineDash: [...style.lineDash] } : {}) } : undefined
);

const formatNumber = (value: number): string => {
  if (!Number.isFinite(value)) return '0';
  const rounded = Math.abs(value) < 1e-9 ? 0 : value;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
};

const letterLabel = (index: number): string => String.fromCharCode(65 + (index % 26));
