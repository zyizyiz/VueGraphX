import {
  add2D,
  cross2D,
  distance2D,
  dot2D,
  GRAPH_MATH_EPSILON,
  intersectLineCircle2D,
  intersectLines2D,
  length2D,
  lineFromPoints,
  midpoint2D,
  normalize2D,
  point2D,
  polygonCentroid,
  polygonFromVertices,
  scale2D,
  segmentFromPoints,
  subtract2D,
  type MathIntersection2D,
  type MathLine2D,
  type MathPoint2D,
  type MathSegment2D,
  type MathVector2D
} from './geometry';
import {
  computeSubjectFunctionProperties,
  formatSubjectFunctionExpression,
  type SubjectDynamicPointState,
  type SubjectFunctionFamilyDescriptor,
  type SubjectFunctionProperty
} from './subjectFunctions';
import { createSubjectAuxiliaryLineConstructionModel } from './subjectGeometryConstruction';
import { createSubjectAuxiliaryLineStyle } from './subjectAuxiliaryLineStyle';

export {
  createSubjectAuxiliaryLineStyle,
  SUBJECT_OVERLAY_DASH_PATTERN,
  SUBJECT_OVERLAY_DASH_STROKE_WIDTH,
  SUBJECT_OVERLAY_DEFAULT_DASH_STROKE_COLOR,
  type SubjectAuxiliaryLineStyleOptions
} from './subjectAuxiliaryLineStyle';

export type SubjectOverlayTargetKind =
  | 'polygon'
  | 'circle'
  | 'line'
  | 'ray'
  | 'segment'
  | 'parallel-lines'
  | 'angle'
  | 'function'
  | 'equation';

export type SubjectOverlayShapeKind =
  | 'triangle'
  | 'rectangle'
  | 'square'
  | 'parallelogram'
  | 'rhombus'
  | 'trapezoid'
  | 'quadrilateral'
  | 'polygon'
  | 'circle'
  | 'line'
  | 'ray'
  | 'segment'
  | 'parallel-lines'
  | 'angle'
  | 'function'
  | 'equation'
  | string;

export type SubjectAnnotationKind =
  | 'vertex'
  | 'angle'
  | 'side-ratio'
  | 'center'
  | 'radius'
  | 'diameter'
  | 'expression'
  | 'property'
  | 'intercept'
  | 'axis'
  | 'dynamic-point'
  | 'helper-line'
  | 'helper-intersection'
  | 'coordinate'
  | 'custom'
  | string;

export type SubjectAuxiliaryLineKind =
  | 'altitude'
  | 'median'
  | 'midline'
  | 'diagonal'
  | 'angle-bisector'
  | 'perpendicular-bisector'
  | 'extension'
  | 'radius'
  | 'diameter'
  | 'symmetry-axis'
  | 'asymptote'
  | 'directrix'
  | 'free'
  | 'custom'
  | string;

export type SubjectOverlayState = 'candidate' | 'preview' | 'confirmed';

export interface SubjectOverlayStyle {
  strokeColor?: string;
  fillColor?: string;
  textColor?: string;
  strokeWidth?: number;
  selectionStrokeScale?: number | false;
  opacity?: number;
  lineDash?: readonly number[];
  emphasis?: 'normal' | 'muted' | 'highlight';
}

export interface SubjectOverlayCoordinateOptions {
  enabled?: boolean;
  showForKinds?: readonly SubjectAnnotationKind[];
  precision?: number;
  formatter?: (point: MathPoint2D, context: SubjectOverlayComputationContext) => string;
}

export interface SubjectOverlayFeatureConfig<Kind extends string = string> {
  enabled?: boolean;
  includeKinds?: readonly Kind[];
  excludeKinds?: readonly Kind[];
  defaultVisibleKinds?: readonly Kind[];
  labels?: Record<string, string>;
  styles?: Record<string, SubjectOverlayStyle>;
}

export interface SubjectAuxiliaryLineFeatureConfig extends SubjectOverlayFeatureConfig<SubjectAuxiliaryLineKind> {
  allowFreeDraw?: boolean;
  maxCandidates?: number;
}

export interface SubjectOverlayShapeRule {
  annotations?: SubjectOverlayFeatureConfig<SubjectAnnotationKind>;
  auxiliaryLines?: SubjectAuxiliaryLineFeatureConfig;
  allowFreeDraw?: boolean;
}

export interface SubjectOverlayFormatterOptions {
  number?: (value: number, context: SubjectOverlayComputationContext) => string;
  point?: (point: MathPoint2D, context: SubjectOverlayComputationContext) => string;
  label?: (descriptor: SubjectOverlayAnnotation | SubjectAuxiliaryLineDescriptor, context: SubjectOverlayComputationContext) => string;
  annotationText?: (annotation: SubjectOverlayAnnotation, context: SubjectOverlayComputationContext) => string;
}

export interface SubjectOverlayPerformanceOptions {
  cache?: boolean;
  maxCandidates?: number;
}

export interface SubjectOverlayConfig {
  annotations?: SubjectOverlayFeatureConfig<SubjectAnnotationKind>;
  auxiliaryLines?: SubjectAuxiliaryLineFeatureConfig;
  coordinates?: SubjectOverlayCoordinateOptions;
  shapes?: Record<string, SubjectOverlayShapeRule>;
  formatters?: SubjectOverlayFormatterOptions;
  performance?: SubjectOverlayPerformanceOptions;
  meta?: Record<string, unknown>;
}

export const SUBJECT_OVERLAY_DEFAULT_ANNOTATION_COLORS = {
  vertex: '#EF4444',
  intercept: '#16A34A'
} as const satisfies Record<string, string>;

export interface SubjectOverlayTargetBase {
  id: string;
  kind: SubjectOverlayTargetKind;
  shapeKind?: SubjectOverlayShapeKind;
  version?: string | number;
  strokeColor?: string;
  labelPrefix?: string;
  coordinateSystemId?: string;
  meta?: Record<string, unknown>;
}

export interface SubjectPolygonOverlayTarget extends SubjectOverlayTargetBase {
  kind: 'polygon';
  vertices: readonly MathPoint2D[];
  closed?: boolean;
}

export interface SubjectCircleOverlayTarget extends SubjectOverlayTargetBase {
  kind: 'circle';
  center: MathPoint2D;
  radius: number;
}

export interface SubjectSegmentOverlayTarget extends SubjectOverlayTargetBase {
  kind: 'segment';
  start: MathPoint2D;
  end: MathPoint2D;
}

export interface SubjectLineOverlayTarget extends SubjectOverlayTargetBase {
  kind: 'line';
  point: MathPoint2D;
  direction: MathVector2D;
}

export interface SubjectRayOverlayTarget extends SubjectOverlayTargetBase {
  kind: 'ray';
  origin: MathPoint2D;
  direction: MathVector2D;
}

export interface SubjectParallelLinesOverlayTarget extends SubjectOverlayTargetBase {
  kind: 'parallel-lines';
  segments: readonly [MathSegment2D, MathSegment2D];
}

export interface SubjectAngleOverlayTarget extends SubjectOverlayTargetBase {
  kind: 'angle';
  vertex: MathPoint2D;
  first: MathPoint2D;
  second: MathPoint2D;
}

export interface SubjectFunctionOverlayTarget extends SubjectOverlayTargetBase {
  kind: 'function' | 'equation';
  descriptor: SubjectFunctionFamilyDescriptor;
  dynamicPoint?: SubjectDynamicPointState;
  sampleWindow?: SubjectOverlayBounds2D;
}

export type SubjectOverlayTarget =
  | SubjectPolygonOverlayTarget
  | SubjectCircleOverlayTarget
  | SubjectSegmentOverlayTarget
  | SubjectLineOverlayTarget
  | SubjectRayOverlayTarget
  | SubjectParallelLinesOverlayTarget
  | SubjectAngleOverlayTarget
  | SubjectFunctionOverlayTarget;

export interface SubjectOverlayBounds2D {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface SubjectOverlayAnnotation {
  id: string;
  kind: SubjectAnnotationKind;
  label: string;
  text: string;
  anchor?: MathPoint2D;
  targetId?: string;
  sourceProviderId?: string;
  visible?: boolean;
  state?: SubjectOverlayState;
  style?: SubjectOverlayStyle;
  meta?: Record<string, unknown>;
}

export interface SubjectAuxiliaryLineDescriptor {
  id: string;
  kind: SubjectAuxiliaryLineKind;
  label: string;
  start: MathPoint2D;
  end: MathPoint2D;
  targetId?: string;
  sourceProviderId?: string;
  visible?: boolean;
  state?: SubjectOverlayState;
  selectable?: boolean;
  style?: SubjectOverlayStyle;
  meta?: Record<string, unknown>;
}

export interface SubjectOverlayDiagnostic {
  code:
    | 'subject-overlay.invalid-target'
    | 'subject-overlay.provider-error'
    | 'subject-overlay.free-line-no-intersection'
    | 'subject-overlay.limit-reached';
  severity: 'info' | 'warning' | 'error';
  message: string;
  targetId?: string;
  providerId?: string;
  data?: Record<string, unknown>;
}

export interface SubjectOverlayModel {
  targetId: string;
  targetKind: SubjectOverlayTargetKind;
  shapeKind: SubjectOverlayShapeKind;
  version: string;
  annotations: readonly SubjectOverlayAnnotation[];
  auxiliaryLines: readonly SubjectAuxiliaryLineDescriptor[];
  diagnostics: readonly SubjectOverlayDiagnostic[];
  providerIds: readonly string[];
  cacheKey?: string;
}

export interface SubjectOverlayComputationContext {
  target: SubjectOverlayTarget;
  config: SubjectOverlayConfig;
  shapeKind: SubjectOverlayShapeKind;
  version: string;
  formatNumber: (value: number) => string;
  formatPoint: (point: MathPoint2D) => string;
  annotationEnabled: (kind: SubjectAnnotationKind) => boolean;
  auxiliaryLineEnabled: (kind: SubjectAuxiliaryLineKind) => boolean;
  auxiliaryLineState: (kind: SubjectAuxiliaryLineKind) => SubjectOverlayState;
  annotationVisible: (kind: SubjectAnnotationKind) => boolean;
  auxiliaryLineVisible: (kind: SubjectAuxiliaryLineKind) => boolean;
  maxAuxiliaryLineCandidates: number;
}

export interface SubjectOverlayProvider {
  id: string;
  order?: number;
  supports: (target: SubjectOverlayTarget, context: SubjectOverlayComputationContext) => boolean;
  createAnnotations?: (context: SubjectOverlayComputationContext) => readonly SubjectOverlayAnnotation[];
  createAuxiliaryLines?: (context: SubjectOverlayComputationContext) => readonly SubjectAuxiliaryLineDescriptor[];
}

export interface SubjectOverlayCacheStats {
  hits: number;
  misses: number;
  size: number;
}

export class SubjectOverlayComputationCache {
  private readonly records = new Map<string, SubjectOverlayModel>();
  private hitCount = 0;
  private missCount = 0;

  public get(key: string): SubjectOverlayModel | undefined {
    const record = this.records.get(key);
    if (record) this.hitCount += 1;
    else this.missCount += 1;
    return record;
  }

  public set(key: string, model: SubjectOverlayModel): void {
    this.records.set(key, model);
  }

  public clear(): void {
    this.records.clear();
    this.hitCount = 0;
    this.missCount = 0;
  }

  public stats(): SubjectOverlayCacheStats {
    return {
      hits: this.hitCount,
      misses: this.missCount,
      size: this.records.size
    };
  }
}

export class SubjectOverlayRegistry {
  private readonly providers: SubjectOverlayProvider[] = [];

  public constructor(providers: readonly SubjectOverlayProvider[] = []) {
    for (const provider of providers) this.register(provider);
  }

  public register(provider: SubjectOverlayProvider): this {
    const existingIndex = this.providers.findIndex((candidate) => candidate.id === provider.id);
    if (existingIndex >= 0) this.providers.splice(existingIndex, 1, provider);
    else this.providers.push(provider);
    this.providers.sort((left, right) => (left.order ?? 0) - (right.order ?? 0));
    return this;
  }

  public listProviders(): readonly SubjectOverlayProvider[] {
    return [...this.providers];
  }

  public resolve(
    target: SubjectOverlayTarget,
    config: SubjectOverlayConfig = {},
    cache?: SubjectOverlayComputationCache
  ): SubjectOverlayModel {
    const context = createSubjectOverlayComputationContext(target, config);
    const providerIds = this.providers.map((provider) => provider.id);
    const cacheKey = createSubjectOverlayCacheKey(target, config, providerIds, context.version);
    if (cache && config.performance?.cache !== false) {
      const cached = cache.get(cacheKey);
      if (cached) return cached;
    }

    const diagnostics: SubjectOverlayDiagnostic[] = [];
    const annotations: SubjectOverlayAnnotation[] = [];
    const auxiliaryLines: SubjectAuxiliaryLineDescriptor[] = [];
    const usedProviderIds: string[] = [];

    if (!isValidOverlayTarget(target)) {
      diagnostics.push({
        code: 'subject-overlay.invalid-target',
        severity: 'error',
        message: `Subject overlay target ${target.id} has invalid geometry.`,
        targetId: target.id
      });
    } else {
      for (const provider of this.providers) {
        let supported = false;
        try {
          supported = provider.supports(target, context);
          if (!supported) continue;
          usedProviderIds.push(provider.id);
          if (provider.createAnnotations) {
            annotations.push(...provider.createAnnotations(context).map((annotation) => withProvider(annotation, provider.id)));
          }
          if (provider.createAuxiliaryLines) {
            auxiliaryLines.push(...provider.createAuxiliaryLines(context).map((line) => withLineProvider(line, provider.id)));
          }
        } catch (error) {
          diagnostics.push({
            code: 'subject-overlay.provider-error',
            severity: 'error',
            message: error instanceof Error ? error.message : `Subject overlay provider ${provider.id} failed.`,
            targetId: target.id,
            providerId: provider.id
          });
        }
      }
    }

    const filteredAuxiliaryLines = auxiliaryLines
      .filter((line) => context.auxiliaryLineEnabled(line.kind))
      .slice(0, context.maxAuxiliaryLineCandidates)
      .map((line) => applyLineConfig(line, context));

    if (auxiliaryLines.length > filteredAuxiliaryLines.length) {
      diagnostics.push({
        code: 'subject-overlay.limit-reached',
        severity: 'info',
        message: `Auxiliary line candidates were limited to ${context.maxAuxiliaryLineCandidates}.`,
        targetId: target.id,
        data: { total: auxiliaryLines.length, retained: filteredAuxiliaryLines.length }
      });
    }

    const filteredAnnotations = annotations
      .filter((annotation) => context.annotationEnabled(annotation.kind))
      .map((annotation) => applyAnnotationConfig(annotation, context));

    const model: SubjectOverlayModel = {
      targetId: target.id,
      targetKind: target.kind,
      shapeKind: context.shapeKind,
      version: context.version,
      annotations: filteredAnnotations,
      auxiliaryLines: filteredAuxiliaryLines,
      diagnostics,
      providerIds: usedProviderIds,
      cacheKey
    };

    if (cache && config.performance?.cache !== false) cache.set(cacheKey, model);
    return model;
  }
}

export const createSubjectOverlayCache = (): SubjectOverlayComputationCache => new SubjectOverlayComputationCache();

export const createDefaultSubjectOverlayRegistry = (
  customProviders: readonly SubjectOverlayProvider[] = []
): SubjectOverlayRegistry => new SubjectOverlayRegistry([
  createGeometrySubjectOverlayProvider(),
  createFunctionSubjectOverlayProvider(),
  ...customProviders
]);

export const createSubjectOverlayModel = (
  target: SubjectOverlayTarget,
  config: SubjectOverlayConfig = {},
  registry: SubjectOverlayRegistry = createDefaultSubjectOverlayRegistry(),
  cache?: SubjectOverlayComputationCache
): SubjectOverlayModel => registry.resolve(target, config, cache);

export const createGeometrySubjectOverlayProvider = (): SubjectOverlayProvider => ({
  id: 'builtin.geometry-overlays',
  order: 10,
  supports: (target) => target.kind !== 'function' && target.kind !== 'equation',
  createAnnotations: (context) => createGeometryAnnotations(context),
  createAuxiliaryLines: (context) => createGeometryAuxiliaryLines(context)
});

export const createFunctionSubjectOverlayProvider = (): SubjectOverlayProvider => ({
  id: 'builtin.function-overlays',
  order: 20,
  supports: (target) => target.kind === 'function' || target.kind === 'equation',
  createAnnotations: (context) => createFunctionAnnotations(context),
  createAuxiliaryLines: (context) => createFunctionAuxiliaryLines(context)
});

export const createFreeSubjectAuxiliaryLine = (
  target: Exclude<SubjectOverlayTarget, SubjectFunctionOverlayTarget>,
  start: MathPoint2D,
  end: MathPoint2D,
  options: {
    id?: string;
    label?: string;
    style?: SubjectOverlayStyle;
    allowSingleIntersection?: boolean;
    snapDistance?: number;
    config?: SubjectOverlayConfig;
  } = {}
): SubjectAuxiliaryLineDescriptor | null => {
  const context = createSubjectOverlayComputationContext(target, options.config ?? {});
  const shapeRule = context.config.shapes?.[context.shapeKind];
  const freeDrawEnabled = shapeRule?.allowFreeDraw ?? shapeRule?.auxiliaryLines?.allowFreeDraw ?? context.config.auxiliaryLines?.allowFreeDraw ?? true;
  if (!freeDrawEnabled || !context.auxiliaryLineEnabled('free')) return null;

  const line = lineFromPoints(start, end);
  if (length2D(line.direction) <= GRAPH_MATH_EPSILON) return null;
  const allowSingleIntersection = options.allowSingleIntersection ?? true;
  const base: Omit<SubjectAuxiliaryLineDescriptor, 'start' | 'end'> = {
    id: options.id ?? `${target.id}:free:${hashOverlayValue({ start, end })}`,
    kind: 'free',
    label: options.label ?? readLineLabel('free', context),
    targetId: target.id,
    visible: true,
    state: 'confirmed',
    selectable: true,
    style: options.style ?? dashedStyle(target.strokeColor, 'free'),
    meta: { freeDraw: true }
  };
  const configured = (line: SubjectAuxiliaryLineDescriptor): SubjectAuxiliaryLineDescriptor => applyLineConfig(line, context);

  if (isAuxiliaryConstructionTarget(target)) {
    const construction = createSubjectAuxiliaryLineConstructionModel(target, { start, end }, {
      id: base.id,
      label: base.label,
      style: base.style,
      state: base.state,
      selectable: base.selectable,
      allowSingleIntersection,
      snapDistance: options.snapDistance,
      meta: base.meta
    });
    if (!construction.candidate) return null;
    return configured({
      ...construction.candidate,
      meta: {
        ...construction.candidate.meta,
        ...legacyFreeLineMeta(target, construction.candidate.meta),
        contactCount: construction.contacts.length,
        diagnostics: construction.diagnostics.map((diagnostic) => diagnostic.code)
      }
    });
  }

  return configured({ ...base, start: clonePoint(start), end: clonePoint(end), meta: { ...base.meta, unconstrained: true } });
};

export const createSubjectAuxiliaryLineIntersectionAnnotations = (
  target: Exclude<SubjectOverlayTarget, SubjectFunctionOverlayTarget>,
  auxiliaryLines: readonly SubjectAuxiliaryLineDescriptor[],
  config: SubjectOverlayConfig = {}
): SubjectOverlayAnnotation[] => {
  const context = createSubjectOverlayComputationContext(target, config);
  if (!context.annotationEnabled('helper-intersection')) return [];
  const points: Array<{ point: MathPoint2D; lineId: string }> = [];

  for (const auxiliaryLine of auxiliaryLines) {
    const line = lineFromPoints(auxiliaryLine.start, auxiliaryLine.end);
    if (length2D(line.direction) <= GRAPH_MATH_EPSILON) continue;

    if (target.kind === 'polygon') {
      for (const edge of polygonEdges(target.vertices)) {
        const intersection = intersectLines2D(line, lineFromPoints(edge.start, edge.end));
        if (intersection.kind === 'point' && pointOnSegment2D(intersection.point, edge) && pointOnSegment2D(intersection.point, segmentFromPoints(auxiliaryLine.start, auxiliaryLine.end))) {
          points.push({ point: intersection.point, lineId: auxiliaryLine.id });
        }
      }
    }

    if (target.kind === 'circle') {
      for (const point of intersectionPoints(intersectLineCircle2D(line, { kind: 'circle', center: target.center, radius: target.radius }))) {
        if (pointOnSegment2D(point, segmentFromPoints(auxiliaryLine.start, auxiliaryLine.end), 1e-6)) {
          points.push({ point, lineId: auxiliaryLine.id });
        }
      }
    }
  }

  return uniquePoints(points, (item) => item.point).map((item, index) => applyAnnotationConfig({
    id: `${target.id}:helper-intersection:${index + 1}`,
    kind: 'helper-intersection',
    label: `I${index + 1}`,
    text: coordinateAwareText(`I${index + 1}`, item.point, 'helper-intersection', context),
    anchor: item.point,
    targetId: target.id,
    visible: true,
    state: 'confirmed',
    meta: { lineId: item.lineId }
  }, context));
};

const isAuxiliaryConstructionTarget = (
  target: Exclude<SubjectOverlayTarget, SubjectFunctionOverlayTarget>
): target is SubjectPolygonOverlayTarget | SubjectCircleOverlayTarget | SubjectSegmentOverlayTarget | SubjectLineOverlayTarget | SubjectRayOverlayTarget => (
  target.kind === 'polygon'
    || target.kind === 'circle'
    || target.kind === 'segment'
    || target.kind === 'line'
    || target.kind === 'ray'
);

const legacyFreeLineMeta = (
  target: Exclude<SubjectOverlayTarget, SubjectFunctionOverlayTarget>,
  meta: Record<string, unknown> | undefined
): Record<string, unknown> => {
  if (meta?.singleContact && target.kind === 'circle') return { tangentFallback: true };
  if (meta?.singleContact) return { snapFallback: true };
  return {};
};

const createGeometryAnnotations = (context: SubjectOverlayComputationContext): SubjectOverlayAnnotation[] => {
  const { target } = context;
  if (target.kind === 'polygon') return createPolygonAnnotations(target, context);
  if (target.kind === 'circle') return createCircleAnnotations(target, context);
  if (target.kind === 'segment') return createSegmentAnnotations(target, context);
  if (target.kind === 'angle') return createAngleAnnotations(target, context);
  return [];
};

const createPolygonAnnotations = (
  target: SubjectPolygonOverlayTarget,
  context: SubjectOverlayComputationContext
): SubjectOverlayAnnotation[] => {
  const vertices = target.vertices.map(clonePoint);
  const annotations: SubjectOverlayAnnotation[] = [];
  const prefix = target.labelPrefix ?? '';

  if (context.annotationEnabled('vertex')) {
    vertices.forEach((vertex, index) => {
      const label = `${prefix}${letterLabel(index)}`;
      annotations.push({
        id: `${target.id}:vertex:${index}`,
        kind: 'vertex',
        label,
        text: coordinateAwareText(label, vertex, 'vertex', context),
        anchor: offsetPoint(vertex, centroidDirection(vertices, vertex), 0.18),
        targetId: target.id,
        visible: context.annotationVisible('vertex'),
        state: 'confirmed'
      });
    });
  }

  if (context.annotationEnabled('angle')) {
    vertices.forEach((vertex, index) => {
      const previous = vertices[(index - 1 + vertices.length) % vertices.length];
      const next = vertices[(index + 1) % vertices.length];
      const angle = angleAtPoint(previous, vertex, next);
      const label = `${letterLabel(index)}角`;
      annotations.push({
        id: `${target.id}:angle:${index}`,
        kind: 'angle',
        label,
        text: `${context.formatNumber(radiansToDegrees(angle))}°`,
        anchor: offsetPoint(vertex, angleInteriorDirection(previous, vertex, next), 0.5),
        targetId: target.id,
        visible: context.annotationVisible('angle'),
        state: 'confirmed',
        meta: { radians: angle }
      });
    });
  }

  if (context.annotationEnabled('side-ratio')) {
    const lengths = polygonEdges(vertices).map((edge) => distance2D(edge.start, edge.end));
    const minLength = lengths.filter((length) => length > GRAPH_MATH_EPSILON).reduce((min, length) => Math.min(min, length), Infinity);
    if (Number.isFinite(minLength)) {
      annotations.push({
        id: `${target.id}:side-ratio`,
        kind: 'side-ratio',
        label: '边长比',
        text: lengths.map((length) => context.formatNumber(length / minLength)).join(':'),
        anchor: polygonCentroid(polygonFromVertices(vertices)),
        targetId: target.id,
        visible: context.annotationVisible('side-ratio'),
        state: 'confirmed'
      });
    }
  }

  return annotations;
};

const createCircleAnnotations = (
  target: SubjectCircleOverlayTarget,
  context: SubjectOverlayComputationContext
): SubjectOverlayAnnotation[] => {
  const annotations: SubjectOverlayAnnotation[] = [];
  if (context.annotationEnabled('center')) {
    annotations.push({
      id: `${target.id}:center`,
      kind: 'center',
      label: 'O',
      text: coordinateAwareText('O', target.center, 'center', context),
      anchor: clonePoint(target.center),
      targetId: target.id,
      visible: context.annotationVisible('center'),
      state: 'confirmed'
    });
  }
  if (context.annotationEnabled('radius')) {
    const anchor = point2D(target.center.x + target.radius / 2, target.center.y);
    annotations.push({
      id: `${target.id}:radius`,
      kind: 'radius',
      label: 'r',
      text: `r=${context.formatNumber(target.radius)}`,
      anchor,
      targetId: target.id,
      visible: context.annotationVisible('radius'),
      state: 'confirmed'
    });
  }
  if (context.annotationEnabled('diameter')) {
    annotations.push({
      id: `${target.id}:diameter`,
      kind: 'diameter',
      label: 'd',
      text: `d=${context.formatNumber(target.radius * 2)}`,
      anchor: point2D(target.center.x, target.center.y + target.radius / 2),
      targetId: target.id,
      visible: context.annotationVisible('diameter'),
      state: 'confirmed'
    });
  }
  return annotations;
};

const createSegmentAnnotations = (
  target: SubjectSegmentOverlayTarget,
  context: SubjectOverlayComputationContext
): SubjectOverlayAnnotation[] => {
  if (!context.annotationEnabled('angle')) return [];
  const vector = subtract2D(target.end, target.start);
  const angle = Math.atan2(vector.y, vector.x);
  return [{
    id: `${target.id}:angle`,
    kind: 'angle',
    label: '角度',
    text: `${context.formatNumber(radiansToDegrees(angle))}°`,
    anchor: midpoint2D(target.start, target.end),
    targetId: target.id,
    visible: context.annotationVisible('angle'),
    state: 'confirmed',
    meta: { radians: angle }
  }];
};

const createAngleAnnotations = (
  target: SubjectAngleOverlayTarget,
  context: SubjectOverlayComputationContext
): SubjectOverlayAnnotation[] => {
  if (!context.annotationEnabled('angle')) return [];
  const angle = angleAtPoint(target.first, target.vertex, target.second);
  return [{
    id: `${target.id}:angle`,
    kind: 'angle',
    label: '角度',
    text: `${context.formatNumber(radiansToDegrees(angle))}°`,
    anchor: offsetPoint(target.vertex, angleInteriorDirection(target.first, target.vertex, target.second), 0.5),
    targetId: target.id,
    visible: context.annotationVisible('angle'),
    state: 'confirmed',
    meta: { radians: angle }
  }];
};

const createGeometryAuxiliaryLines = (context: SubjectOverlayComputationContext): SubjectAuxiliaryLineDescriptor[] => {
  const { target } = context;
  if (target.kind === 'polygon') return createPolygonAuxiliaryLines(target, context);
  if (target.kind === 'circle') return createCircleAuxiliaryLines(target, context);
  if (target.kind === 'segment') return createSegmentAuxiliaryLines(target, context);
  return [];
};

const createPolygonAuxiliaryLines = (
  target: SubjectPolygonOverlayTarget,
  context: SubjectOverlayComputationContext
): SubjectAuxiliaryLineDescriptor[] => {
  const vertices = target.vertices.map(clonePoint);
  const lines: SubjectAuxiliaryLineDescriptor[] = [];
  if (vertices.length < 3) return lines;

  if (context.auxiliaryLineEnabled('diagonal') && vertices.length >= 4) {
    for (let startIndex = 0; startIndex < vertices.length; startIndex += 1) {
      for (let endIndex = startIndex + 1; endIndex < vertices.length; endIndex += 1) {
        if (areAdjacentPolygonVertices(startIndex, endIndex, vertices.length)) continue;
        if (!pushAuxiliaryLine(lines, createLineDescriptor(target, 'diagonal', startIndex, endIndex, vertices[startIndex], vertices[endIndex], context), context)) return lines;
      }
    }
  }

  if (context.auxiliaryLineEnabled('altitude')) {
    for (let vertexIndex = 0; vertexIndex < vertices.length; vertexIndex += 1) {
      const candidateEdges = vertices.length === 3
        ? [polygonEdges(vertices)[(vertexIndex + 1) % vertices.length]]
        : polygonEdges(vertices).filter((_edge, edgeIndex) => !edgeTouchesVertex(edgeIndex, vertexIndex, vertices.length));
      for (const edge of candidateEdges) {
        const foot = projectPointToLine(vertices[vertexIndex], lineFromPoints(edge.start, edge.end));
        if (distance2D(vertices[vertexIndex], foot) <= GRAPH_MATH_EPSILON) continue;
        if (vertices.length === 3 && altitudeCoincidesWithAdjacentEdge(vertices, vertexIndex, foot)) continue;
        if (!pushAuxiliaryLine(lines, createLineDescriptor(target, 'altitude', vertexIndex, edge.index, vertices[vertexIndex], foot, context), context)) return lines;
      }
    }
  }

  if (context.auxiliaryLineEnabled('median') && vertices.length === 3) {
    for (let vertexIndex = 0; vertexIndex < vertices.length; vertexIndex += 1) {
      const edge = polygonEdges(vertices)[(vertexIndex + 1) % vertices.length];
      if (!pushAuxiliaryLine(lines, createLineDescriptor(target, 'median', vertexIndex, edge.index, vertices[vertexIndex], midpoint2D(edge.start, edge.end), context), context)) return lines;
    }
  }

  if (context.auxiliaryLineEnabled('midline') && vertices.length === 3) {
    const mids = polygonEdges(vertices).map((edge) => midpoint2D(edge.start, edge.end));
    for (let index = 0; index < mids.length; index += 1) {
      if (!pushAuxiliaryLine(lines, createLineDescriptor(target, 'midline', index, (index + 1) % mids.length, mids[index], mids[(index + 1) % mids.length], context), context)) return lines;
    }
  }

  if (context.auxiliaryLineEnabled('angle-bisector')) {
    for (let index = 0; index < vertices.length; index += 1) {
      const vertex = vertices[index];
      const previous = vertices[(index - 1 + vertices.length) % vertices.length];
      const next = vertices[(index + 1) % vertices.length];
      const direction = angleInteriorDirection(previous, vertex, next);
      const endpoint = firstRayPolygonBoundaryPoint(vertex, direction, vertices, index);
      if (endpoint && !pushAuxiliaryLine(lines, createLineDescriptor(target, 'angle-bisector', index, index, vertex, endpoint, context, { extendsOutside: true }), context)) return lines;
    }
  }

  if (context.auxiliaryLineEnabled('perpendicular-bisector')) {
    for (const edge of polygonEdges(vertices)) {
      if (!pushAuxiliaryLine(lines, perpendicularBisectorDescriptor(target, edge, context), context)) return lines;
    }
  }

  if (context.auxiliaryLineEnabled('extension')) {
    for (const edge of polygonEdges(vertices)) {
      if (!pushAuxiliaryLine(lines, extensionLineDescriptor(target, edge, context), context)) return lines;
    }
  }

  return lines;
};

const createCircleAuxiliaryLines = (
  target: SubjectCircleOverlayTarget,
  context: SubjectOverlayComputationContext
): SubjectAuxiliaryLineDescriptor[] => {
  const lines: SubjectAuxiliaryLineDescriptor[] = [];
  const strokeColor = target.strokeColor;
  if (context.auxiliaryLineEnabled('radius')) {
    lines.push({
      id: `${target.id}:radius:right`,
      kind: 'radius',
      label: readLineLabel('radius', context),
      start: clonePoint(target.center),
      end: point2D(target.center.x + target.radius, target.center.y),
      targetId: target.id,
      visible: context.auxiliaryLineVisible('radius'),
      state: context.auxiliaryLineState('radius'),
      selectable: true,
      style: dashedStyle(strokeColor, 'radius')
    });
  }
  if (context.auxiliaryLineEnabled('diameter')) {
    lines.push({
      id: `${target.id}:diameter:vertical`,
      kind: 'diameter',
      label: readLineLabel('diameter', context),
      start: point2D(target.center.x, target.center.y - target.radius),
      end: point2D(target.center.x, target.center.y + target.radius),
      targetId: target.id,
      visible: context.auxiliaryLineVisible('diameter'),
      state: context.auxiliaryLineState('diameter'),
      selectable: true,
      style: dashedStyle(strokeColor, 'diameter')
    });
  }
  return lines;
};

const createSegmentAuxiliaryLines = (
  target: SubjectSegmentOverlayTarget,
  context: SubjectOverlayComputationContext
): SubjectAuxiliaryLineDescriptor[] => {
  if (!context.auxiliaryLineEnabled('perpendicular-bisector')) return [];
  return [perpendicularBisectorDescriptor(target, { index: 0, start: target.start, end: target.end }, context)];
};

const createFunctionAnnotations = (context: SubjectOverlayComputationContext): SubjectOverlayAnnotation[] => {
  if (context.target.kind !== 'function' && context.target.kind !== 'equation') return [];
  const target = context.target;
  const annotations: SubjectOverlayAnnotation[] = [];

  if (context.annotationEnabled('expression')) {
    annotations.push({
      id: `${target.id}:expression`,
      kind: 'expression',
      label: readAnnotationLabel('expression', context),
      text: formatSubjectFunctionExpression(target.descriptor),
      targetId: target.id,
      visible: context.annotationVisible('expression'),
      state: 'confirmed'
    });
  }

  for (const property of computeSubjectFunctionProperties(target.descriptor)) {
    const kind = normalizeFunctionPropertyAnnotationKind(property);
    if (!context.annotationEnabled(kind)) continue;
    const anchor = propertyPointAnchor(property);
    annotations.push({
      id: `${target.id}:${property.id}`,
      kind,
      label: property.label,
      text: `${property.label}: ${formatFunctionPropertyValue(property, context)}`,
      anchor,
      targetId: target.id,
      visible: context.annotationVisible(kind),
      state: 'confirmed',
      meta: { propertyId: property.id, value: property.value }
    });
  }

  if (target.dynamicPoint?.point && context.annotationEnabled('dynamic-point')) {
    annotations.push({
      id: `${target.id}:dynamic-point:${target.dynamicPoint.id}`,
      kind: 'dynamic-point',
      label: 'P',
      text: coordinateAwareText('P', target.dynamicPoint.point, 'dynamic-point', context),
      anchor: target.dynamicPoint.point,
      targetId: target.id,
      visible: context.annotationVisible('dynamic-point'),
      state: 'confirmed',
      meta: { dynamicPointId: target.dynamicPoint.id, parameter: target.dynamicPoint.parameter }
    });
  }

  return annotations;
};

const createFunctionAuxiliaryLines = (context: SubjectOverlayComputationContext): SubjectAuxiliaryLineDescriptor[] => {
  if (context.target.kind !== 'function' && context.target.kind !== 'equation') return [];
  const target = context.target;
  const lines: SubjectAuxiliaryLineDescriptor[] = [];
  const window = target.sampleWindow ?? { minX: -5, maxX: 5, minY: -5, maxY: 5 };

  if (target.descriptor.kind === 'quadratic' && context.auxiliaryLineEnabled('symmetry-axis')) {
    const a = target.descriptor.parameters.a ?? 1;
    const b = target.descriptor.parameters.b ?? 0;
    if (Math.abs(a) > GRAPH_MATH_EPSILON) {
      const x = -b / (2 * a);
      lines.push({
        id: `${target.id}:symmetry-axis`,
        kind: 'symmetry-axis',
        label: readLineLabel('symmetry-axis', context),
        start: point2D(x, window.minY),
        end: point2D(x, window.maxY),
        targetId: target.id,
        visible: context.auxiliaryLineVisible('symmetry-axis'),
        state: context.auxiliaryLineState('symmetry-axis'),
        selectable: true,
        style: dashedStyle(target.strokeColor, 'symmetry-axis'),
        meta: { expression: `${target.descriptor.variable} = ${context.formatNumber(x)}` }
      });
    }
  }

  if (target.descriptor.kind === 'circle-equation') {
    const h = target.descriptor.parameters.h ?? 0;
    const k = target.descriptor.parameters.k ?? 0;
    const r = Math.max(GRAPH_MATH_EPSILON, target.descriptor.parameters.r ?? 1);
    if (context.auxiliaryLineEnabled('radius')) {
      lines.push({
        id: `${target.id}:equation-radius`,
        kind: 'radius',
        label: readLineLabel('radius', context),
        start: point2D(h, k),
        end: point2D(h + r, k),
        targetId: target.id,
        visible: context.auxiliaryLineVisible('radius'),
        state: context.auxiliaryLineState('radius'),
        selectable: true,
        style: dashedStyle(target.strokeColor, 'radius')
      });
    }
    if (context.auxiliaryLineEnabled('diameter')) {
      lines.push({
        id: `${target.id}:equation-diameter`,
        kind: 'diameter',
        label: readLineLabel('diameter', context),
        start: point2D(h, k - r),
        end: point2D(h, k + r),
        targetId: target.id,
        visible: context.auxiliaryLineVisible('diameter'),
        state: context.auxiliaryLineState('diameter'),
        selectable: true,
        style: dashedStyle(target.strokeColor, 'diameter')
      });
    }
  }

  if (target.descriptor.kind === 'tangent' && context.auxiliaryLineEnabled('asymptote')) {
    const b = target.descriptor.parameters.b ?? 1;
    const c = target.descriptor.parameters.c ?? 0;
    if (Math.abs(b) > GRAPH_MATH_EPSILON) {
      const step = Math.PI / Math.abs(b);
      const first = (Math.PI / 2 - c) / b;
      let x = first + Math.ceil((window.minX - first) / step) * step;
      let index = 0;
      while (x <= window.maxX + GRAPH_MATH_EPSILON && index < 64) {
        if (x >= window.minX - GRAPH_MATH_EPSILON) {
          lines.push({
            id: `${target.id}:tangent-asymptote:${index}`,
            kind: 'asymptote',
            label: readLineLabel('asymptote', context),
            start: point2D(x, window.minY),
            end: point2D(x, window.maxY),
            targetId: target.id,
            visible: context.auxiliaryLineVisible('asymptote'),
            state: context.auxiliaryLineState('asymptote'),
            selectable: true,
            style: dashedStyle(target.strokeColor, 'asymptote'),
            meta: { expression: `${target.descriptor.variable} = ${context.formatNumber(x)}` }
          });
        }
        x += step;
        index += 1;
      }
    }
  }

  if (target.descriptor.kind === 'hyperbola-equation' && context.auxiliaryLineEnabled('asymptote')) {
    const h = target.descriptor.parameters.h ?? 0;
    const k = target.descriptor.parameters.k ?? 0;
    const a = Math.max(GRAPH_MATH_EPSILON, target.descriptor.parameters.a ?? 2);
    const b = Math.max(GRAPH_MATH_EPSILON, target.descriptor.parameters.b ?? 1);
    const axis = target.descriptor.meta?.axis === 'y' ? 'y' : 'x';
    const slope = axis === 'x' ? b / a : a / b;
    for (const sign of [-1, 1] as const) {
      lines.push({
        id: `${target.id}:hyperbola-asymptote:${sign}`,
        kind: 'asymptote',
        label: readLineLabel('asymptote', context),
        start: point2D(window.minX, k + sign * slope * (window.minX - h)),
        end: point2D(window.maxX, k + sign * slope * (window.maxX - h)),
        targetId: target.id,
        visible: context.auxiliaryLineVisible('asymptote'),
        state: context.auxiliaryLineState('asymptote'),
        selectable: true,
        style: dashedStyle(target.strokeColor, 'asymptote'),
        meta: { expression: `y - ${context.formatNumber(k)} = ${sign === 1 ? '' : '-'}${context.formatNumber(slope)} * (x - ${context.formatNumber(h)})` }
      });
    }
  }

  if (target.descriptor.kind === 'parabola-equation' && context.auxiliaryLineEnabled('directrix')) {
    const h = target.descriptor.parameters.h ?? 0;
    const k = target.descriptor.parameters.k ?? 0;
    const p = Math.max(GRAPH_MATH_EPSILON, Math.abs(target.descriptor.parameters.p ?? 1));
    const rawDirection = target.descriptor.meta?.direction;
    const direction = rawDirection === 'left' || rawDirection === 'up' || rawDirection === 'down'
      ? rawDirection
      : 'right';
    const vertical = direction === 'left' || direction === 'right';
    const value = direction === 'left'
      ? h + p
      : direction === 'up'
        ? k - p
        : direction === 'down'
          ? k + p
          : h - p;
    lines.push({
      id: `${target.id}:parabola-directrix`,
      kind: 'directrix',
      label: readLineLabel('directrix', context),
      start: vertical ? point2D(value, window.minY) : point2D(window.minX, value),
      end: vertical ? point2D(value, window.maxY) : point2D(window.maxX, value),
      targetId: target.id,
      visible: context.auxiliaryLineVisible('directrix'),
      state: context.auxiliaryLineState('directrix'),
      selectable: true,
      style: dashedStyle(target.strokeColor, 'directrix'),
      meta: { expression: `${vertical ? 'x' : 'y'} = ${context.formatNumber(value)}` }
    });
  }

  return lines;
};

const createSubjectOverlayComputationContext = (
  target: SubjectOverlayTarget,
  config: SubjectOverlayConfig
): SubjectOverlayComputationContext => {
  const shapeKind = inferSubjectOverlayShapeKind(target);
  const version = String(target.version ?? hashOverlayValue(projectTargetForHash(target)));
  let context: SubjectOverlayComputationContext;
  const formatNumber = (value: number): string => config.formatters?.number?.(value, context) ?? defaultFormatNumber(value);
  const formatPoint = (point: MathPoint2D): string => config.formatters?.point?.(point, context) ?? defaultFormatPoint(point, config.coordinates?.precision);
  context = {
    target,
    config,
    shapeKind,
    version,
    formatNumber,
    formatPoint,
    annotationEnabled: (kind: SubjectAnnotationKind) => isFeatureKindEnabled(kind, effectiveAnnotationConfig(config, shapeKind)),
    auxiliaryLineEnabled: (kind: SubjectAuxiliaryLineKind) => isFeatureKindEnabled(kind, effectiveAuxiliaryLineConfig(config, shapeKind)),
    auxiliaryLineState: (kind: SubjectAuxiliaryLineKind) => isFeatureKindVisible(kind, effectiveAuxiliaryLineConfig(config, shapeKind)) ? 'confirmed' : 'candidate',
    annotationVisible: (kind: SubjectAnnotationKind) => isFeatureKindVisible(kind, effectiveAnnotationConfig(config, shapeKind)),
    auxiliaryLineVisible: (kind: SubjectAuxiliaryLineKind) => isFeatureKindVisible(kind, effectiveAuxiliaryLineConfig(config, shapeKind)),
    maxAuxiliaryLineCandidates: config.shapes?.[shapeKind]?.auxiliaryLines?.maxCandidates
      ?? config.auxiliaryLines?.maxCandidates
      ?? config.performance?.maxCandidates
      ?? 128
  };
  return context;
};

const effectiveAnnotationConfig = (
  config: SubjectOverlayConfig,
  shapeKind: SubjectOverlayShapeKind
): SubjectOverlayFeatureConfig<SubjectAnnotationKind> => mergeFeatureConfig(config.annotations, config.shapes?.[shapeKind]?.annotations);

const effectiveAuxiliaryLineConfig = (
  config: SubjectOverlayConfig,
  shapeKind: SubjectOverlayShapeKind
): SubjectAuxiliaryLineFeatureConfig => ({
  ...mergeFeatureConfig(config.auxiliaryLines, config.shapes?.[shapeKind]?.auxiliaryLines),
  allowFreeDraw: config.shapes?.[shapeKind]?.auxiliaryLines?.allowFreeDraw
    ?? config.shapes?.[shapeKind]?.allowFreeDraw
    ?? config.auxiliaryLines?.allowFreeDraw,
  maxCandidates: config.shapes?.[shapeKind]?.auxiliaryLines?.maxCandidates
    ?? config.auxiliaryLines?.maxCandidates
});

const mergeFeatureConfig = <Kind extends string>(
  base?: SubjectOverlayFeatureConfig<Kind>,
  override?: SubjectOverlayFeatureConfig<Kind>
): SubjectOverlayFeatureConfig<Kind> => ({
  ...(base ?? {}),
  ...(override ?? {}),
  labels: { ...(base?.labels ?? {}), ...(override?.labels ?? {}) },
  styles: { ...(base?.styles ?? {}), ...(override?.styles ?? {}) }
});

const isFeatureKindEnabled = <Kind extends string>(kind: Kind, config: SubjectOverlayFeatureConfig<Kind>): boolean => {
  if (config.enabled === false) return false;
  if (config.includeKinds && !config.includeKinds.includes(kind)) return false;
  return !config.excludeKinds?.includes(kind);
};

const isFeatureKindVisible = <Kind extends string>(kind: Kind, config: SubjectOverlayFeatureConfig<Kind>): boolean => (
  config.defaultVisibleKinds ? config.defaultVisibleKinds.includes(kind) : true
);

const applyAnnotationConfig = (
  annotation: SubjectOverlayAnnotation,
  context: SubjectOverlayComputationContext
): SubjectOverlayAnnotation => {
  const feature = effectiveAnnotationConfig(context.config, context.shapeKind);
  const label = feature.labels?.[annotation.id] ?? feature.labels?.[annotation.kind] ?? annotation.label;
  const style = mergeStyle(defaultAnnotationStyle(annotation.kind), annotation.style, feature.styles?.[annotation.kind], feature.styles?.[annotation.id]);
  const configured = {
    ...annotation,
    label,
    visible: annotation.visible ?? context.annotationVisible(annotation.kind),
    style
  };
  const text = context.config.formatters?.annotationText?.(configured, context)
    ?? context.config.formatters?.label?.(configured, context)
    ?? (label !== annotation.label && annotation.text === annotation.label ? label : annotation.text);
  return { ...configured, text };
};

const applyLineConfig = (
  line: SubjectAuxiliaryLineDescriptor,
  context: SubjectOverlayComputationContext
): SubjectAuxiliaryLineDescriptor => {
  const feature = effectiveAuxiliaryLineConfig(context.config, context.shapeKind);
  const label = feature.labels?.[line.id] ?? feature.labels?.[line.kind] ?? line.label;
  const style = mergeStyle(line.style, feature.styles?.[line.kind], feature.styles?.[line.id]);
  return {
    ...line,
    label: context.config.formatters?.label?.({ ...line, label }, context) ?? label,
    visible: line.visible ?? context.auxiliaryLineVisible(line.kind),
    state: line.state ?? context.auxiliaryLineState(line.kind),
    style
  };
};

const withProvider = (annotation: SubjectOverlayAnnotation, providerId: string): SubjectOverlayAnnotation => ({
  ...annotation,
  sourceProviderId: annotation.sourceProviderId ?? providerId
});

const withLineProvider = (line: SubjectAuxiliaryLineDescriptor, providerId: string): SubjectAuxiliaryLineDescriptor => ({
  ...line,
  sourceProviderId: line.sourceProviderId ?? providerId
});

const inferSubjectOverlayShapeKind = (target: SubjectOverlayTarget): SubjectOverlayShapeKind => {
  if (target.shapeKind) return target.shapeKind;
  if (target.kind === 'polygon') {
    if (target.vertices.length === 3) return 'triangle';
    if (target.vertices.length === 4) return 'quadrilateral';
    return 'polygon';
  }
  return target.kind;
};

const isValidOverlayTarget = (target: SubjectOverlayTarget): boolean => {
  if (!target.id) return false;
  if (target.kind === 'polygon') return target.vertices.length >= 3 && target.vertices.every(isFinitePoint);
  if (target.kind === 'circle') return isFinitePoint(target.center) && Number.isFinite(target.radius) && target.radius > GRAPH_MATH_EPSILON;
  if (target.kind === 'segment') return isFinitePoint(target.start) && isFinitePoint(target.end) && distance2D(target.start, target.end) > GRAPH_MATH_EPSILON;
  if (target.kind === 'line') return isFinitePoint(target.point) && isFinitePoint(target.direction) && length2D(target.direction) > GRAPH_MATH_EPSILON;
  if (target.kind === 'ray') return isFinitePoint(target.origin) && isFinitePoint(target.direction) && length2D(target.direction) > GRAPH_MATH_EPSILON;
  if (target.kind === 'angle') return [target.vertex, target.first, target.second].every(isFinitePoint);
  if (target.kind === 'parallel-lines') return target.segments.every((segment) => isFinitePoint(segment.start) && isFinitePoint(segment.end));
  return true;
};

const createSubjectOverlayCacheKey = (
  target: SubjectOverlayTarget,
  config: SubjectOverlayConfig,
  providerIds: readonly string[],
  version: string
): string => `${target.id}:${target.kind}:${version}:${providerIds.join(',')}:${hashOverlayValue(projectConfigForHash(config))}`;

const projectTargetForHash = (target: SubjectOverlayTarget): unknown => {
  if (target.kind === 'function' || target.kind === 'equation') {
    return {
      id: target.id,
      kind: target.kind,
      shapeKind: target.shapeKind,
      descriptor: {
        id: target.descriptor.id,
        kind: target.descriptor.kind,
        expression: target.descriptor.expression,
        parameters: target.descriptor.parameters,
        domain: target.descriptor.domain
      },
      dynamicPoint: target.dynamicPoint,
      sampleWindow: target.sampleWindow
    };
  }
  return target;
};

const projectConfigForHash = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(projectConfigForHash);
  if (typeof value === 'function') return '[function]';
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, entry]) => [key, projectConfigForHash(entry)]));
};

const hashOverlayValue = (value: unknown): string => {
  const source = JSON.stringify(projectConfigForHash(value));
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
};

const createLineDescriptor = (
  target: SubjectOverlayTarget,
  kind: SubjectAuxiliaryLineKind,
  firstIndex: number,
  secondIndex: number,
  start: MathPoint2D,
  end: MathPoint2D,
  context: SubjectOverlayComputationContext,
  meta: Record<string, unknown> = {}
): SubjectAuxiliaryLineDescriptor => ({
  id: `${target.id}:${kind}:${firstIndex}:${secondIndex}`,
  kind,
  label: readLineLabel(kind, context),
  start: clonePoint(start),
  end: clonePoint(end),
  targetId: target.id,
  visible: context.auxiliaryLineVisible(kind),
  state: context.auxiliaryLineState(kind),
  selectable: true,
  style: dashedStyle(target.strokeColor, kind),
  meta
});

const pushAuxiliaryLine = (
  lines: SubjectAuxiliaryLineDescriptor[],
  line: SubjectAuxiliaryLineDescriptor,
  context: SubjectOverlayComputationContext
): boolean => {
  if (lines.length >= context.maxAuxiliaryLineCandidates) return false;
  lines.push(line);
  return lines.length < context.maxAuxiliaryLineCandidates;
};

const perpendicularBisectorDescriptor = (
  target: SubjectOverlayTarget,
  edge: { index: number; start: MathPoint2D; end: MathPoint2D },
  context: SubjectOverlayComputationContext
): SubjectAuxiliaryLineDescriptor => {
  const midpoint = midpoint2D(edge.start, edge.end);
  const edgeVector = subtract2D(edge.end, edge.start);
  const unit = normalize2D({ x: -edgeVector.y, y: edgeVector.x });
  const distance = Math.max(1, length2D(edgeVector) * 0.8);
  return {
    id: `${target.id}:perpendicular-bisector:${edge.index}`,
    kind: 'perpendicular-bisector',
    label: readLineLabel('perpendicular-bisector', context),
    start: add2D(midpoint, scale2D(unit, -distance)),
    end: add2D(midpoint, scale2D(unit, distance)),
    targetId: target.id,
    visible: context.auxiliaryLineVisible('perpendicular-bisector'),
    state: context.auxiliaryLineState('perpendicular-bisector'),
    selectable: true,
    style: dashedStyle(target.strokeColor, 'perpendicular-bisector'),
    meta: { edgeIndex: edge.index }
  };
};

const extensionLineDescriptor = (
  target: SubjectOverlayTarget,
  edge: { index: number; start: MathPoint2D; end: MathPoint2D },
  context: SubjectOverlayComputationContext
): SubjectAuxiliaryLineDescriptor => {
  const unit = normalize2D(subtract2D(edge.end, edge.start));
  const extension = Math.max(0.5, distance2D(edge.start, edge.end) * 0.3);
  return {
    id: `${target.id}:extension:${edge.index}`,
    kind: 'extension',
    label: readLineLabel('extension', context),
    start: add2D(edge.start, scale2D(unit, -extension)),
    end: add2D(edge.end, scale2D(unit, extension)),
    targetId: target.id,
    visible: context.auxiliaryLineVisible('extension'),
    state: context.auxiliaryLineState('extension'),
    selectable: true,
    style: dashedStyle(target.strokeColor, 'extension'),
    meta: {
      edgeIndex: edge.index,
      controls: {
        mode: 'opposite-equal',
        center: midpoint2D(edge.start, edge.end)
      }
    }
  };
};

const readAnnotationLabel = (kind: SubjectAnnotationKind, context: SubjectOverlayComputationContext): string => (
  effectiveAnnotationConfig(context.config, context.shapeKind).labels?.[kind] ?? defaultAnnotationLabels[kind] ?? kind
);

const readLineLabel = (kind: SubjectAuxiliaryLineKind, context: SubjectOverlayComputationContext): string => (
  effectiveAuxiliaryLineConfig(context.config, context.shapeKind).labels?.[kind] ?? defaultLineLabels[kind] ?? kind
);

const defaultAnnotationLabels: Record<string, string> = {
  vertex: '顶点',
  angle: '角度',
  'side-ratio': '边长比',
  center: '圆心',
  radius: '半径',
  diameter: '直径',
  expression: '表达式',
  property: '属性',
  intercept: '交点',
  axis: '轴',
  'dynamic-point': '动点P',
  'helper-line': '辅助线',
  'helper-intersection': '交点'
};

const defaultLineLabels: Record<string, string> = {
  altitude: '高',
  median: '中线',
  midline: '中位线',
  diagonal: '对角线',
  'angle-bisector': '角平分线',
  'perpendicular-bisector': '垂直平分线',
  extension: '边的延长线',
  radius: '半径',
  diameter: '直径',
  'symmetry-axis': '对称轴',
  asymptote: '渐近线',
  directrix: '准线',
  free: '自由辅助线'
};

const dashedStyle = (
  targetStrokeColor?: string,
  kind?: SubjectAuxiliaryLineKind
): SubjectOverlayStyle => createSubjectAuxiliaryLineStyle({ targetStrokeColor, kind });

const defaultAnnotationStyle = (kind: SubjectAnnotationKind): SubjectOverlayStyle | undefined => {
  const strokeColor = SUBJECT_OVERLAY_DEFAULT_ANNOTATION_COLORS[kind as keyof typeof SUBJECT_OVERLAY_DEFAULT_ANNOTATION_COLORS];
  return strokeColor ? { strokeColor } : undefined;
};

const mergeStyle = (...styles: Array<SubjectOverlayStyle | undefined>): SubjectOverlayStyle | undefined => {
  const merged = Object.assign({}, ...styles.filter(Boolean));
  return Object.keys(merged).length > 0 ? merged : undefined;
};

const polygonEdges = (vertices: readonly MathPoint2D[]): Array<{ index: number; start: MathPoint2D; end: MathPoint2D }> => (
  vertices.map((vertex, index) => ({
    index,
    start: vertex,
    end: vertices[(index + 1) % vertices.length]
  }))
);

const intersectionPoints = (intersection: MathIntersection2D): MathPoint2D[] => {
  if (intersection.kind === 'point') return [intersection.point];
  if (intersection.kind === 'points') return intersection.points;
  return [];
};

const uniquePoints = <T>(
  items: readonly T[],
  readPoint: (item: T) => MathPoint2D,
  epsilon = 1e-6
): T[] => {
  const unique: T[] = [];
  for (const item of items) {
    const point = readPoint(item);
    if (!unique.some((candidate) => distance2D(readPoint(candidate), point) <= epsilon)) unique.push(item);
  }
  return unique;
};

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

const projectPointToLine = (point: MathPoint2D, line: MathLine2D): MathPoint2D => {
  const denominator = dot2D(line.direction, line.direction);
  if (denominator <= GRAPH_MATH_EPSILON) return clonePoint(line.point);
  return add2D(line.point, scale2D(line.direction, dot2D(subtract2D(point, line.point), line.direction) / denominator));
};

const firstRayPolygonBoundaryPoint = (
  origin: MathPoint2D,
  direction: MathVector2D,
  vertices: readonly MathPoint2D[],
  vertexIndex: number
): MathPoint2D | null => {
  const rayLine = { kind: 'line' as const, point: origin, direction };
  const candidates: MathPoint2D[] = [];
  for (const edge of polygonEdges(vertices)) {
    if (edgeTouchesVertex(edge.index, vertexIndex, vertices.length)) continue;
    const intersection = intersectLines2D(rayLine, lineFromPoints(edge.start, edge.end));
    if (intersection.kind !== 'point') continue;
    if (!pointOnSegment2D(intersection.point, edge)) continue;
    if (dot2D(subtract2D(intersection.point, origin), direction) > GRAPH_MATH_EPSILON) candidates.push(intersection.point);
  }
  if (candidates.length === 0) return null;
  return candidates.sort((left, right) => distance2D(origin, left) - distance2D(origin, right))[0];
};

const altitudeCoincidesWithAdjacentEdge = (
  vertices: readonly MathPoint2D[],
  vertexIndex: number,
  foot: MathPoint2D
): boolean => {
  const previousIndex = (vertexIndex - 1 + vertices.length) % vertices.length;
  const nextIndex = (vertexIndex + 1) % vertices.length;
  return distance2D(foot, vertices[previousIndex]) <= 1e-7 || distance2D(foot, vertices[nextIndex]) <= 1e-7;
};

const edgeTouchesVertex = (edgeIndex: number, vertexIndex: number, vertexCount: number): boolean => (
  edgeIndex === vertexIndex || (edgeIndex + 1) % vertexCount === vertexIndex
);

const areAdjacentPolygonVertices = (left: number, right: number, count: number): boolean => (
  Math.abs(left - right) === 1 || Math.abs(left - right) === count - 1
);

const angleAtPoint = (first: MathPoint2D, vertex: MathPoint2D, second: MathPoint2D): number => {
  const left = normalize2D(subtract2D(first, vertex));
  const right = normalize2D(subtract2D(second, vertex));
  return Math.atan2(Math.abs(cross2D(left, right)), dot2D(left, right));
};

const angleInteriorDirection = (first: MathPoint2D, vertex: MathPoint2D, second: MathPoint2D): MathVector2D => {
  const left = normalize2D(subtract2D(first, vertex));
  const right = normalize2D(subtract2D(second, vertex));
  const sum = add2D(left, right);
  if (length2D(sum) <= GRAPH_MATH_EPSILON) return { x: -left.y, y: left.x };
  return normalize2D(sum);
};

const centroidDirection = (vertices: readonly MathPoint2D[], vertex: MathPoint2D): MathVector2D => {
  const center = polygonCentroid(polygonFromVertices(vertices));
  const outward = subtract2D(vertex, center);
  return length2D(outward) <= GRAPH_MATH_EPSILON ? { x: 0, y: 1 } : normalize2D(outward);
};

const offsetPoint = (point: MathPoint2D, direction: MathVector2D, amount: number): MathPoint2D => (
  add2D(point, scale2D(normalize2D(direction), amount))
);

const radiansToDegrees = (radians: number): number => radians * 180 / Math.PI;

const normalizeFunctionPropertyAnnotationKind = (property: SubjectFunctionProperty): SubjectAnnotationKind => {
  if (property.kind === 'vertex' || property.kind === 'center' || property.kind === 'radius' || property.kind === 'intercept' || property.kind === 'axis' || property.kind === 'expression') {
    return property.kind;
  }
  return 'property';
};

const propertyPointAnchor = (property: SubjectFunctionProperty): MathPoint2D | undefined => {
  if (isPoint(property.value)) return property.value;
  if (Array.isArray(property.value) && property.value.length > 0 && isPoint(property.value[0])) return property.value[0];
  return undefined;
};

const formatFunctionPropertyValue = (
  property: SubjectFunctionProperty,
  context: SubjectOverlayComputationContext
): string => {
  const value = property.value;
  if (value === null) return '无';
  if (typeof value === 'number') return context.formatNumber(value);
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map((point) => context.formatPoint(point)).join(', ');
  return isPoint(value) ? context.formatPoint(value) : '';
};

const coordinateAwareText = (
  label: string,
  point: MathPoint2D,
  kind: SubjectAnnotationKind,
  context: SubjectOverlayComputationContext
): string => shouldShowCoordinates(kind, context) ? `${label} ${context.formatPoint(point)}` : label;

const shouldShowCoordinates = (
  kind: SubjectAnnotationKind,
  context: SubjectOverlayComputationContext
): boolean => {
  const coordinates = context.config.coordinates;
  if (coordinates?.enabled === false) return false;
  if (context.target.coordinateSystemId) {
    if (!coordinates?.showForKinds) return kind === 'vertex' || kind === 'helper-intersection' || kind === 'dynamic-point' || kind === 'center';
  }
  return !!coordinates?.showForKinds?.includes(kind);
};

const letterLabel = (index: number): string => {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  if (index < alphabet.length) return alphabet[index];
  return `${alphabet[index % alphabet.length]}${Math.floor(index / alphabet.length) + 1}`;
};

const defaultFormatNumber = (value: number): string => {
  if (!Number.isFinite(value)) return 'NaN';
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
};

const defaultFormatPoint = (point: MathPoint2D, precision = 2): string => {
  const format = (value: number) => {
    if (Number.isInteger(value)) return String(value);
    return value.toFixed(precision).replace(/0+$/, '').replace(/\.$/, '');
  };
  return `(${format(point.x)}, ${format(point.y)})`;
};

const isPoint = (value: unknown): value is MathPoint2D => {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return typeof record.x === 'number' && Number.isFinite(record.x) && typeof record.y === 'number' && Number.isFinite(record.y);
};

const isFinitePoint = (point: MathPoint2D): boolean => Number.isFinite(point.x) && Number.isFinite(point.y);
const clonePoint = (point: MathPoint2D): MathPoint2D => ({ x: point.x, y: point.y });
