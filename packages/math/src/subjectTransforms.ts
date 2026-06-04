import {
  add2D,
  boundsForPoints,
  distance2D,
  GRAPH_MATH_EPSILON,
  midpoint2D,
  point2D,
  polygonCentroid,
  polygonFromVertices,
  rotatePoint2D,
  scalePoint2DAbout,
  subtract2D,
  type MathBounds2D,
  type MathPoint2D,
  type MathVector2D
} from './geometry';
import type {
  SubjectAuxiliaryLineDescriptor,
  SubjectCircleOverlayTarget,
  SubjectOverlayStyle,
  SubjectPolygonOverlayTarget,
  SubjectSegmentOverlayTarget
} from './subjectOverlays';

export type SubjectGeometryTransformTarget =
  | SubjectPolygonOverlayTarget
  | SubjectCircleOverlayTarget
  | SubjectSegmentOverlayTarget;

export type SubjectGeometryTransformKind = 'translate' | 'rotate' | 'scale';
export type SubjectGeometryBoundsMode = 'none' | 'translate-inside' | 'reject';
export type SubjectGeometryDragPhase = 'move' | 'end';

export interface SubjectGeometryGridSnapOptions {
  enabled?: boolean;
  step?: number;
  origin?: MathPoint2D;
  tolerance?: number;
  tolerancePx?: number;
  phase?: 'always' | 'end';
}

export interface SubjectGeometryGridSnapMetric {
  pixelsPerUnit?: number | { x?: number; y?: number };
}

export interface ResolvedSubjectGeometryGridSnapOptions {
  enabled: boolean;
  step: number;
  origin: MathPoint2D;
  tolerance: number;
  tolerancePx: number;
  phase: 'always' | 'end';
}

export interface SubjectGeometryGridSnapDecision {
  applied: boolean;
  coordinateDistance: number;
  pixelDistance?: number;
  tolerance: number;
  tolerancePx: number;
}

export interface SubjectGeometryTransformPreviewOptions {
  includeCenterLines?: boolean;
  includeTrajectories?: boolean;
  style?: SubjectOverlayStyle;
}

export interface SubjectGeometryTransformOptions {
  kind: SubjectGeometryTransformKind;
  delta?: MathVector2D;
  center?: MathPoint2D;
  angleRadians?: number;
  scale?: number;
  bounds?: MathBounds2D;
  boundsMode?: SubjectGeometryBoundsMode;
  snapToGrid?: boolean | SubjectGeometryGridSnapOptions;
  snapMetric?: SubjectGeometryGridSnapMetric;
  dragPhase?: SubjectGeometryDragPhase;
  preview?: SubjectGeometryTransformPreviewOptions;
  meta?: Record<string, unknown>;
}

export interface SubjectGeometryTransformDiagnostic {
  code:
    | 'subject-transform.invalid-target'
    | 'subject-transform.invalid-parameter'
    | 'subject-transform.snap-applied'
    | 'subject-transform.bounds-adjusted'
    | 'subject-transform.out-of-bounds';
  severity: 'info' | 'warning' | 'error';
  message: string;
  targetId?: string;
  data?: Record<string, unknown>;
}

export interface SubjectGeometryTransformPreviewArc {
  id: string;
  kind: 'trajectory';
  label: string;
  center: MathPoint2D;
  radius: number;
  start: MathPoint2D;
  end: MathPoint2D;
  startAngle: number;
  endAngle: number;
  targetId?: string;
  visible?: boolean;
  style?: SubjectOverlayStyle;
  meta?: Record<string, unknown>;
}

export interface SubjectGeometryTransformModel<Target extends SubjectGeometryTransformTarget = SubjectGeometryTransformTarget> {
  targetId: string;
  kind: SubjectGeometryTransformKind;
  before: Target;
  after: Target;
  applied: boolean;
  center?: MathPoint2D;
  delta?: MathVector2D;
  angleRadians?: number;
  scale?: number;
  previewLines: readonly SubjectAuxiliaryLineDescriptor[];
  previewArcs: readonly SubjectGeometryTransformPreviewArc[];
  diagnostics: readonly SubjectGeometryTransformDiagnostic[];
  meta?: Record<string, unknown>;
}

type NormalizedGeometryTransform = Required<Pick<SubjectGeometryTransformOptions, 'delta' | 'angleRadians' | 'scale'>>;

export const createSubjectGeometryTransformModel = <Target extends SubjectGeometryTransformTarget>(
  target: Target,
  options: SubjectGeometryTransformOptions
): SubjectGeometryTransformModel<Target> => {
  const before = cloneGeometryTarget(target);
  const diagnostics: SubjectGeometryTransformDiagnostic[] = [];
  if (!isValidGeometryTransformTarget(target)) {
    return {
      targetId: target.id,
      kind: options.kind,
      before,
      after: before,
      applied: false,
      previewLines: [],
      previewArcs: [],
      diagnostics: [{
        code: 'subject-transform.invalid-target',
        severity: 'error',
        message: `Subject geometry transform target ${target.id} has invalid geometry.`,
        targetId: target.id
      }],
      meta: options.meta
    };
  }

  const center = options.kind === 'rotate' || options.kind === 'scale'
    ? clonePoint(options.center ?? defaultTransformCenter(target))
    : undefined;
  const normalized = normalizeTransformOptions(options, diagnostics, target.id);
  const transformed = applyRawGeometryTransform(target, normalized, center);
  const snapped = applySnapIfNeeded(transformed, options.snapToGrid, options.snapMetric, options.dragPhase, diagnostics);
  const bounded = applyBoundsIfNeeded(snapped, options.bounds, options.boundsMode ?? 'none', diagnostics);
  const applied = diagnostics.every((diagnostic) => diagnostic.severity !== 'error');
  const after = applied ? bounded : before;
  const preview = createTransformPreview(before, {
    kind: options.kind,
    center,
    transform: applied ? normalized : identityTransform(),
    adjustmentDelta: applied ? geometryTranslationDelta(transformed, after) : point2D(0, 0),
    targetId: target.id,
    options: options.preview
  });

  return {
    targetId: target.id,
    kind: options.kind,
    before,
    after,
    applied,
    center,
    delta: normalized.delta,
    angleRadians: normalized.angleRadians,
    scale: normalized.scale,
    previewLines: preview.lines,
    previewArcs: preview.arcs,
    diagnostics,
    meta: options.meta
  };
};

export const applySubjectGeometryTransform = <Target extends SubjectGeometryTransformTarget>(
  target: Target,
  options: SubjectGeometryTransformOptions
): Target => createSubjectGeometryTransformModel(target, options).after;

const identityTransform = (): NormalizedGeometryTransform => ({ delta: point2D(0, 0), angleRadians: 0, scale: 1 });

const normalizeTransformOptions = (
  options: SubjectGeometryTransformOptions,
  diagnostics: SubjectGeometryTransformDiagnostic[],
  targetId: string
): NormalizedGeometryTransform => {
  const rawDelta = isFiniteVector(options.delta) ? clonePoint(options.delta) : point2D(0, 0);
  const rawAngleRadians = typeof options.angleRadians === 'number' && Number.isFinite(options.angleRadians)
    ? options.angleRadians
    : 0;
  let rawScale = typeof options.scale === 'number' && Number.isFinite(options.scale) ? options.scale : 1;
  if (options.kind === 'scale' && Math.abs(rawScale) <= GRAPH_MATH_EPSILON) {
    diagnostics.push({
      code: 'subject-transform.invalid-parameter',
      severity: 'warning',
      message: 'Scale factor was too close to zero and was clamped to 1.',
      targetId,
      data: { scale: rawScale }
    });
    rawScale = 1;
  }
  if (options.kind === 'translate') return { delta: rawDelta, angleRadians: 0, scale: 1 };
  if (options.kind === 'rotate') return { delta: point2D(0, 0), angleRadians: rawAngleRadians, scale: 1 };
  if (options.kind === 'scale') return { delta: point2D(0, 0), angleRadians: 0, scale: rawScale };
  return identityTransform();
};

const applyRawGeometryTransform = <Target extends SubjectGeometryTransformTarget>(
  target: Target,
  options: NormalizedGeometryTransform,
  center: MathPoint2D | undefined
): Target => {
  if (target.kind === 'polygon') {
    const vertices = target.vertices.map((vertex) => transformPoint(vertex, options, center));
    return { ...target, vertices, meta: cloneMeta(target.meta) } as Target;
  }
  if (target.kind === 'segment') {
    return {
      ...target,
      start: transformPoint(target.start, options, center),
      end: transformPoint(target.end, options, center),
      meta: cloneMeta(target.meta)
    } as Target;
  }
  const nextCenter = transformPoint(target.center, options, center);
  const radius = options.scale === 1 ? target.radius : Math.abs(target.radius * options.scale);
  return { ...target, center: nextCenter, radius, meta: cloneMeta(target.meta) } as Target;
};

const transformPoint = (
  point: MathPoint2D,
  options: NormalizedGeometryTransform,
  center: MathPoint2D | undefined
): MathPoint2D => {
  let next = clonePoint(point);
  if (center && options.scale !== 1) next = scalePoint2DAbout(next, options.scale, center);
  if (center && options.angleRadians !== 0) next = rotatePoint2D(next, options.angleRadians, center);
  if (options.delta.x !== 0 || options.delta.y !== 0) next = add2D(next, options.delta);
  return next;
};

const applySnapIfNeeded = <Target extends SubjectGeometryTransformTarget>(
  target: Target,
  snapInput: boolean | SubjectGeometryGridSnapOptions | undefined,
  snapMetric: SubjectGeometryGridSnapMetric | undefined,
  dragPhase: SubjectGeometryDragPhase | undefined,
  diagnostics: SubjectGeometryTransformDiagnostic[]
): Target => {
  const snap = resolveSubjectGeometryGridSnapOptions(snapInput);
  if (!snap.enabled) return target;
  if (snap.phase === 'end' && dragPhase === 'move') return target;
  const snapDelta = findBestGridSnapDelta(getSnapPoints(target), snap, snapMetric);
  if (!snapDelta) return target;
  diagnostics.push({
    code: 'subject-transform.snap-applied',
    severity: 'info',
    message: `Subject geometry transform snapped by (${formatNumber(snapDelta.x)}, ${formatNumber(snapDelta.y)}).`,
    targetId: target.id,
    data: { delta: snapDelta }
  });
  return translateGeometryTarget(target, snapDelta);
};

const applyBoundsIfNeeded = <Target extends SubjectGeometryTransformTarget>(
  target: Target,
  bounds: MathBounds2D | undefined,
  mode: SubjectGeometryBoundsMode,
  diagnostics: SubjectGeometryTransformDiagnostic[]
): Target => {
  if (!bounds || mode === 'none') return target;
  const currentBounds = geometryTargetBounds(target);
  if (!currentBounds || boundsContainBounds(bounds, currentBounds)) return target;
  if (mode === 'reject') {
    diagnostics.push({
      code: 'subject-transform.out-of-bounds',
      severity: 'error',
      message: `Subject geometry transform moved ${target.id} outside of the allowed bounds.`,
      targetId: target.id,
      data: { bounds: currentBounds, allowedBounds: bounds }
    });
    return target;
  }

  const correction = translationToFitBounds(currentBounds, bounds);
  if (!correction) {
    diagnostics.push({
      code: 'subject-transform.out-of-bounds',
      severity: 'error',
      message: `Subject geometry transform result for ${target.id} is larger than the allowed bounds.`,
      targetId: target.id,
      data: { bounds: currentBounds, allowedBounds: bounds }
    });
    return target;
  }

  diagnostics.push({
    code: 'subject-transform.bounds-adjusted',
    severity: 'info',
    message: `Subject geometry transform for ${target.id} was translated back inside bounds.`,
    targetId: target.id,
    data: { delta: correction }
  });
  return translateGeometryTarget(target, correction);
};

const createTransformPreview = (
  before: SubjectGeometryTransformTarget,
  context: {
    kind: SubjectGeometryTransformKind;
    center?: MathPoint2D;
    transform: NormalizedGeometryTransform;
    adjustmentDelta: MathVector2D;
    targetId: string;
    options?: SubjectGeometryTransformPreviewOptions;
  }
): { lines: SubjectAuxiliaryLineDescriptor[]; arcs: SubjectGeometryTransformPreviewArc[] } => {
  const includeCenterLines = context.options?.includeCenterLines ?? (context.kind === 'rotate' || context.kind === 'scale');
  const includeTrajectories = context.options?.includeTrajectories ?? true;
  const style = transformPreviewStyle(context.options?.style);
  const beforePoints = previewPoints(before);
  const afterPoints = beforePoints.map((point) => add2D(
    transformPoint(point, context.transform, context.center),
    context.adjustmentDelta
  ));
  const lines: SubjectAuxiliaryLineDescriptor[] = [];
  const arcs: SubjectGeometryTransformPreviewArc[] = [];

  if (context.center && includeCenterLines) {
    beforePoints.forEach((point, index) => {
      lines.push({
        id: `${context.targetId}:transform:center-line:${index}`,
        kind: 'free',
        label: context.kind === 'rotate' ? '旋转中心连线' : '缩放中心连线',
        start: clonePoint(context.center!),
        end: clonePoint(point),
        targetId: context.targetId,
        visible: true,
        state: 'preview',
        selectable: false,
        style,
        meta: { transformKind: context.kind, previewKind: 'center-line', pointIndex: index }
      });
    });
  }

  if (includeTrajectories) {
    beforePoints.forEach((point, index) => {
      const afterPoint = afterPoints[index] ?? point;
      if (distance2D(point, afterPoint) <= GRAPH_MATH_EPSILON) return;
      if (context.kind === 'rotate' && context.center) {
        const radius = distance2D(context.center, point);
        if (radius <= GRAPH_MATH_EPSILON) return;
        arcs.push({
          id: `${context.targetId}:transform:trajectory:${index}`,
          kind: 'trajectory',
          label: '旋转轨迹',
          center: clonePoint(context.center),
          radius,
          start: clonePoint(point),
          end: clonePoint(afterPoint),
          startAngle: Math.atan2(point.y - context.center.y, point.x - context.center.x),
          endAngle: Math.atan2(afterPoint.y - context.center.y, afterPoint.x - context.center.x),
          targetId: context.targetId,
          visible: true,
          style,
          meta: { transformKind: context.kind, pointIndex: index, angleRadians: context.transform.angleRadians }
        });
      } else {
        lines.push({
          id: `${context.targetId}:transform:trajectory:${index}`,
          kind: 'free',
          label: context.kind === 'scale' ? '缩放轨迹' : '移动轨迹',
          start: clonePoint(point),
          end: clonePoint(afterPoint),
          targetId: context.targetId,
          visible: true,
          state: 'preview',
          selectable: false,
          style,
          meta: { transformKind: context.kind, previewKind: 'trajectory', pointIndex: index, scale: context.transform.scale }
        });
      }
    });
  }

  return { lines, arcs };
};

const translateGeometryTarget = <Target extends SubjectGeometryTransformTarget>(
  target: Target,
  delta: MathVector2D
): Target => applyRawGeometryTransform(target, { delta, angleRadians: 0, scale: 1 }, undefined);

const geometryTranslationDelta = (
  from: SubjectGeometryTransformTarget,
  to: SubjectGeometryTransformTarget
): MathVector2D => {
  if (from.kind !== to.kind) return point2D(0, 0);
  if (from.kind === 'polygon' && to.kind === 'polygon') {
    const fromPoint = from.vertices[0];
    const toPoint = to.vertices[0];
    return isFinitePoint(fromPoint) && isFinitePoint(toPoint) ? subtract2D(toPoint, fromPoint) : point2D(0, 0);
  }
  if (from.kind === 'segment' && to.kind === 'segment') return subtract2D(to.start, from.start);
  if (from.kind === 'circle' && to.kind === 'circle') return subtract2D(to.center, from.center);
  return point2D(0, 0);
};

const getSnapPoints = (target: SubjectGeometryTransformTarget): MathPoint2D[] => {
  if (target.kind === 'polygon') return target.vertices.map(clonePoint);
  if (target.kind === 'segment') return [clonePoint(target.start), clonePoint(target.end)];
  return [clonePoint(target.center)];
};

const previewPoints = (target: SubjectGeometryTransformTarget): MathPoint2D[] => {
  if (target.kind === 'polygon') return target.vertices.map(clonePoint);
  if (target.kind === 'segment') return [clonePoint(target.start), clonePoint(target.end)];
  return [clonePoint(target.center), point2D(target.center.x + target.radius, target.center.y)];
};

const findBestGridSnapDelta = (
  points: readonly MathPoint2D[],
  options: ResolvedSubjectGeometryGridSnapOptions,
  metric: SubjectGeometryGridSnapMetric | undefined
): MathVector2D | null => {
  let best: { delta: MathVector2D; distance: number } | null = null;
  for (const point of points) {
    const snapped = snapSubjectGeometryPointToGrid(point, options);
    const decision = shouldApplySubjectGeometryGridSnap(point, snapped, options, metric);
    if (!decision.applied) continue;
    const delta = subtract2D(snapped, point);
    const distance = decision.pixelDistance ?? decision.coordinateDistance;
    if (!best || distance < best.distance) best = { delta, distance };
  }
  return best?.delta ?? null;
};

export const resolveSubjectGeometryGridSnapOptions = (
  input: boolean | SubjectGeometryGridSnapOptions | undefined,
  fallback: Partial<SubjectGeometryGridSnapOptions> = {}
): ResolvedSubjectGeometryGridSnapOptions => {
  const fallbackStep = readPositiveNumber(fallback.step, 1);
  const fallbackOrigin = isFinitePoint(fallback.origin) ? clonePoint(fallback.origin) : point2D(0, 0);
  const base: ResolvedSubjectGeometryGridSnapOptions = {
    enabled: fallback.enabled ?? false,
    step: fallbackStep,
    origin: fallbackOrigin,
    tolerance: readNonNegativeNumber(fallback.tolerance, fallbackStep * 0.15),
    tolerancePx: readNonNegativeNumber(fallback.tolerancePx, Number.POSITIVE_INFINITY),
    phase: fallback.phase === 'end' ? 'end' : 'always'
  };
  if (input === true) return { ...base, enabled: true };
  if (!input) return { ...base, enabled: false };
  const step = readPositiveNumber(input.step, base.step);
  return {
    enabled: input.enabled ?? true,
    step,
    origin: isFinitePoint(input.origin) ? clonePoint(input.origin) : base.origin,
    tolerance: readNonNegativeNumber(input.tolerance, fallback.tolerance === undefined ? step * 0.15 : base.tolerance),
    tolerancePx: readNonNegativeNumber(input.tolerancePx, base.tolerancePx),
    phase: input.phase === 'end' || input.phase === 'always' ? input.phase : base.phase
  };
};

export const snapSubjectGeometryPointToGrid = (
  point: MathPoint2D,
  options: Pick<ResolvedSubjectGeometryGridSnapOptions, 'step' | 'origin'>
): MathPoint2D => ({
  x: normalizeGridValue(options.origin.x + Math.round((point.x - options.origin.x) / options.step) * options.step),
  y: normalizeGridValue(options.origin.y + Math.round((point.y - options.origin.y) / options.step) * options.step)
});

export const shouldApplySubjectGeometryGridSnap = (
  point: MathPoint2D,
  snapped: MathPoint2D,
  options: Pick<ResolvedSubjectGeometryGridSnapOptions, 'tolerance' | 'tolerancePx'>,
  metric?: SubjectGeometryGridSnapMetric
): SubjectGeometryGridSnapDecision => {
  const coordinateDistance = distance2D(point, snapped);
  const pixelDistance = measureSubjectGeometryGridSnapDistancePx(point, snapped, metric);
  if (Number.isFinite(options.tolerancePx)) {
    return {
      applied: pixelDistance !== undefined && pixelDistance <= options.tolerancePx,
      coordinateDistance,
      ...(pixelDistance === undefined ? {} : { pixelDistance }),
      tolerance: options.tolerance,
      tolerancePx: options.tolerancePx
    };
  }
  return {
    applied: !Number.isFinite(options.tolerance) || coordinateDistance <= options.tolerance,
    coordinateDistance,
    ...(pixelDistance === undefined ? {} : { pixelDistance }),
    tolerance: options.tolerance,
    tolerancePx: options.tolerancePx
  };
};

export const measureSubjectGeometryGridSnapDistancePx = (
  from: MathPoint2D,
  to: MathPoint2D,
  metric?: SubjectGeometryGridSnapMetric
): number | undefined => {
  const scale = resolveSubjectGeometryPixelsPerUnit(metric);
  if (!scale) return undefined;
  return Math.hypot((to.x - from.x) * scale.x, (to.y - from.y) * scale.y);
};

const geometryTargetBounds = (target: SubjectGeometryTransformTarget): MathBounds2D | null => {
  if (target.kind === 'circle') {
    return {
      minX: target.center.x - target.radius,
      minY: target.center.y - target.radius,
      maxX: target.center.x + target.radius,
      maxY: target.center.y + target.radius
    };
  }
  return boundsForPoints(getSnapPoints(target));
};

const translationToFitBounds = (current: MathBounds2D, allowed: MathBounds2D): MathVector2D | null => {
  if ((current.maxX - current.minX) > (allowed.maxX - allowed.minX) + GRAPH_MATH_EPSILON) return null;
  if ((current.maxY - current.minY) > (allowed.maxY - allowed.minY) + GRAPH_MATH_EPSILON) return null;
  let dx = 0;
  let dy = 0;
  if (current.minX < allowed.minX) dx = allowed.minX - current.minX;
  if (current.maxX + dx > allowed.maxX) dx = allowed.maxX - current.maxX;
  if (current.minY < allowed.minY) dy = allowed.minY - current.minY;
  if (current.maxY + dy > allowed.maxY) dy = allowed.maxY - current.maxY;
  return point2D(dx, dy);
};

const boundsContainBounds = (outer: MathBounds2D, inner: MathBounds2D): boolean => (
  inner.minX >= outer.minX - GRAPH_MATH_EPSILON
    && inner.maxX <= outer.maxX + GRAPH_MATH_EPSILON
    && inner.minY >= outer.minY - GRAPH_MATH_EPSILON
    && inner.maxY <= outer.maxY + GRAPH_MATH_EPSILON
);

const defaultTransformCenter = (target: SubjectGeometryTransformTarget): MathPoint2D => {
  if (target.kind === 'polygon') return polygonCentroid(polygonFromVertices(target.vertices));
  if (target.kind === 'segment') return midpoint2D(target.start, target.end);
  return clonePoint(target.center);
};

const cloneGeometryTarget = <Target extends SubjectGeometryTransformTarget>(target: Target): Target => {
  if (target.kind === 'polygon') {
    return { ...target, vertices: target.vertices.map(clonePoint), meta: cloneMeta(target.meta) } as Target;
  }
  if (target.kind === 'segment') {
    return { ...target, start: clonePoint(target.start), end: clonePoint(target.end), meta: cloneMeta(target.meta) } as Target;
  }
  return { ...target, center: clonePoint(target.center), meta: cloneMeta(target.meta) } as Target;
};

const isValidGeometryTransformTarget = (target: SubjectGeometryTransformTarget): boolean => {
  if (!target.id) return false;
  if (target.kind === 'polygon') return target.vertices.length >= 3 && target.vertices.every(isFinitePoint);
  if (target.kind === 'segment') return isFinitePoint(target.start) && isFinitePoint(target.end) && distance2D(target.start, target.end) > GRAPH_MATH_EPSILON;
  return isFinitePoint(target.center) && Number.isFinite(target.radius) && target.radius > GRAPH_MATH_EPSILON;
};

const isFinitePoint = (point: MathPoint2D | undefined): point is MathPoint2D => (
  !!point && Number.isFinite(point.x) && Number.isFinite(point.y)
);

const isFiniteVector = (point: MathVector2D | undefined): point is MathVector2D => isFinitePoint(point);

const clonePoint = <Point extends MathPoint2D>(point: Point): Point => ({ ...point });

const cloneMeta = (meta: Record<string, unknown> | undefined): Record<string, unknown> | undefined => (
  meta ? { ...meta } : undefined
);

const transformPreviewStyle = (style: SubjectOverlayStyle | undefined): SubjectOverlayStyle => ({
  strokeColor: '#94A3B8',
  textColor: '#94A3B8',
  strokeWidth: 1,
  opacity: 0.9,
  lineDash: [4, 8],
  ...style
});

const formatNumber = (value: number): string => (
  Number.isInteger(value) ? String(value) : value.toFixed(4).replace(/0+$/, '').replace(/\.$/, '')
);

const readPositiveNumber = (value: unknown, fallback: number): number => (
  typeof value === 'number' && Number.isFinite(value) && value > GRAPH_MATH_EPSILON ? value : fallback
);

const readNonNegativeNumber = (value: unknown, fallback: number): number => (
  typeof value === 'number' && value >= 0 ? value : fallback
);

const resolveSubjectGeometryPixelsPerUnit = (
  metric: SubjectGeometryGridSnapMetric | undefined
): { x: number; y: number } | null => {
  const value = metric?.pixelsPerUnit;
  if (typeof value === 'number') {
    return Number.isFinite(value) && value > GRAPH_MATH_EPSILON ? { x: value, y: value } : null;
  }
  if (!value || typeof value !== 'object') return null;
  const x = typeof value.x === 'number' && Number.isFinite(value.x) && value.x > GRAPH_MATH_EPSILON ? value.x : null;
  const y = typeof value.y === 'number' && Number.isFinite(value.y) && value.y > GRAPH_MATH_EPSILON ? value.y : null;
  if (x === null && y === null) return null;
  return { x: x ?? y!, y: y ?? x! };
};

const normalizeGridValue = (value: number): number => (
  Math.abs(value) < GRAPH_MATH_EPSILON ? 0 : Number(value.toFixed(10))
);
