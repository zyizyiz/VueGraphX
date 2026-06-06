import {
  mergeGraphObjectPatch,
  type GraphClientPoint,
  type GraphObjectNode,
  type GraphObjectPatch,
  type GraphWorldPoint
} from './contracts';
import {
  resolveGraphGridSnapOptions,
  snapPointToGraphGrid,
  type GraphGridSnapOptions,
  type GraphGridSnapPixelScale,
  type GraphGridSnapPoint
} from './gridSnapping';
import {
  translateGraphObjectPayload,
  translateGraphRenderHints,
  type GraphObjectTranslationDelta2D
} from './objectTransforms';

export interface GraphGeometryGridSnapOptions {
  dragPhase?: 'move' | 'end';
  projectWorldPoint?: (point: GraphWorldPoint & { dimension: '2d' }) => GraphClientPoint | null;
  tolerancePx?: number;
  pixelsPerUnit?: GraphGridSnapPixelScale;
}

type PlainRecord = Record<string, unknown>;

const DEFAULT_GEOMETRY_GRID_SNAP_TOLERANCE_PX = 5;
const DEFAULT_GEOMETRY_GRID_SNAP_PIXELS_PER_UNIT = { x: 30, y: 30 };

export const snapGraphObjectGeometryToGrid = (
  node: GraphObjectNode,
  options: GraphGeometryGridSnapOptions = {}
): GraphObjectNode => {
  const patch = createGraphGeometryGridSnapPatch(node, options);
  return patch ? mergeGraphObjectPatch(node, patch) : node;
};

export const createGraphGeometryGridSnapPatch = (
  node: GraphObjectNode,
  options: GraphGeometryGridSnapOptions = {}
): GraphObjectPatch | null => {
  if (options.dragPhase === 'move') return null;
  if (!isGeometryGridSnapCandidate(node)) return null;

  const payload = asRecord(node.payload);
  const geometry = asRecord(payload?.geometry);
  if (!payload || !geometry) return null;

  const snapInput = readGeometryGridSnapInput(node, payload);
  if (snapInput === false) return null;
  const snapOptions = resolveGraphGridSnapOptions(snapInput ?? true, {
    enabled: true,
    step: 1,
    tolerancePx: positiveNumber(options.tolerancePx, DEFAULT_GEOMETRY_GRID_SNAP_TOLERANCE_PX),
    pixelsPerUnit: options.pixelsPerUnit ?? DEFAULT_GEOMETRY_GRID_SNAP_PIXELS_PER_UNIT
  });
  if (!snapOptions.enabled) return null;
  const anchors = resolveGeometryGridSnapAnchors(geometry);
  if (anchors.length === 0) return null;

  const target = resolveNearestGridSnapTarget(anchors, snapOptions, options);
  if (!target) return null;
  const delta: GraphObjectTranslationDelta2D = {
    dimension: '2d',
    dx: target.snapped.x - target.anchor.x,
    dy: target.snapped.y - target.anchor.y
  };
  if (Math.abs(delta.dx) < 1e-9 && Math.abs(delta.dy) < 1e-9) return null;

  const nextPayload = cloneSerializable(payload);
  const translatedPayload = translateGraphObjectPayload(nextPayload, delta);
  if (!translatedPayload) return null;
  const translatedRenderHints = translateGraphRenderHints(node.renderHints, delta);
  return {
    payload: translatedPayload,
    ...(translatedRenderHints ? { renderHints: translatedRenderHints } : {})
  };
};

const readGeometryGridSnapInput = (
  node: GraphObjectNode,
  payload: PlainRecord
): unknown => {
  const meta = node.meta as Record<string, unknown> | undefined;
  const hints = node.renderHints as Record<string, unknown> | undefined;
  return meta?.snapToGrid ?? hints?.snapToGrid ?? payload.snapToGrid;
};

const isGeometryGridSnapCandidate = (node: GraphObjectNode): boolean => (
  node.type !== 'coordinate-system'
  && node.type !== 'function'
  && node.type !== 'equation'
  && node.type !== 'derivative'
);

const resolveGeometryGridSnapAnchors = (
  geometry: PlainRecord
): GraphGridSnapPoint[] => {
  const vertices = Array.isArray(geometry.vertices)
    ? geometry.vertices.filter(isPoint2D)
    : [];
  if (vertices.length > 0) return vertices.map((vertex) => ({ ...vertex }));

  const explicitCenter = readGeometryCenter(geometry);
  if (explicitCenter) return [explicitCenter];

  const points = collectGeometryPoints(geometry);
  return points.length > 0 ? [centerOfPoints(points)] : [];
};

const resolveNearestGridSnapTarget = (
  anchors: readonly GraphGridSnapPoint[],
  snapOptions: GraphGridSnapOptions,
  options: GraphGeometryGridSnapOptions
): { anchor: GraphGridSnapPoint; snapped: GraphGridSnapPoint; distancePx: number } | null => {
  let best: { anchor: GraphGridSnapPoint; snapped: GraphGridSnapPoint; distancePx: number } | null = null;
  for (const anchor of anchors) {
    const snapped = snapPointToGraphGrid(anchor, snapOptions, snapOptions);
    const distancePx = measureGridSnapDistancePx(anchor, snapped, snapOptions, options);
    if (!best || distancePx < best.distancePx) {
      best = { anchor, snapped, distancePx };
    }
  }
  if (!best) return null;
  const tolerancePx = typeof snapOptions.tolerancePx === 'number' && Number.isFinite(snapOptions.tolerancePx)
    ? snapOptions.tolerancePx
    : DEFAULT_GEOMETRY_GRID_SNAP_TOLERANCE_PX;
  return best.distancePx < tolerancePx ? best : null;
};

const measureGridSnapDistancePx = (
  anchor: GraphGridSnapPoint,
  snapped: GraphGridSnapPoint,
  snapOptions: GraphGridSnapOptions,
  options: GraphGeometryGridSnapOptions
): number => {
  const projectedAnchor = options.projectWorldPoint?.({ dimension: '2d', ...anchor });
  const projectedSnapped = options.projectWorldPoint?.({ dimension: '2d', ...snapped });
  if (projectedAnchor && projectedSnapped) {
    return Math.hypot(projectedAnchor.x - projectedSnapped.x, projectedAnchor.y - projectedSnapped.y);
  }

  const scale = normalizePixelScale(snapOptions.pixelsPerUnit);
  return Math.hypot((anchor.x - snapped.x) * scale.x, (anchor.y - snapped.y) * scale.y);
};

const readGeometryCenter = (geometry: PlainRecord): GraphGridSnapPoint | null => {
  if (isPoint2D(geometry.center)) return { ...geometry.center };
  if (isPoint2D(geometry.origin)) return { ...geometry.origin };
  if (isPoint2D(geometry.point)) return { ...geometry.point };
  return null;
};

const collectGeometryPoints = (geometry: PlainRecord): GraphGridSnapPoint[] => {
  const points: GraphGridSnapPoint[] = [];
  for (const key of ['start', 'end', 'center', 'origin', 'point'] as const) {
    pushPoint(points, geometry[key]);
  }
  for (const key of ['vertices', 'border', 'xAxis', 'yAxis', 'tickPoints', 'points'] as const) {
    pushPointArray(points, geometry[key]);
  }
  for (const key of ['segments', 'gridSegments', 'axisArrowSegments'] as const) {
    const segments = geometry[key];
    if (!Array.isArray(segments)) continue;
    for (const segment of segments) pushPointArray(points, segment);
  }
  return points;
};

const centerOfPoints = (points: readonly GraphGridSnapPoint[]): GraphGridSnapPoint => ({
  x: (Math.min(...points.map((point) => point.x)) + Math.max(...points.map((point) => point.x))) / 2,
  y: (Math.min(...points.map((point) => point.y)) + Math.max(...points.map((point) => point.y))) / 2
});

const pushPoint = (points: GraphGridSnapPoint[], value: unknown): void => {
  if (isPoint2D(value)) points.push({ ...value });
};

const pushPointArray = (points: GraphGridSnapPoint[], value: unknown): void => {
  if (!Array.isArray(value)) return;
  for (const entry of value) pushPoint(points, entry);
};

const normalizePixelScale = (
  scale: GraphGridSnapPixelScale | undefined
): { x: number; y: number } => {
  if (typeof scale === 'number' && Number.isFinite(scale) && scale > 0) {
    return { x: scale, y: scale };
  }
  if (typeof scale === 'object' && scale !== null) {
    return {
      x: positiveNumber(scale.x, DEFAULT_GEOMETRY_GRID_SNAP_PIXELS_PER_UNIT.x),
      y: positiveNumber(scale.y, DEFAULT_GEOMETRY_GRID_SNAP_PIXELS_PER_UNIT.y)
    };
  }
  return { ...DEFAULT_GEOMETRY_GRID_SNAP_PIXELS_PER_UNIT };
};

const positiveNumber = (value: unknown, fallback: number): number => (
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback
);

const cloneSerializable = <T>(value: T): T => {
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(value);
    } catch {
      // Fall through to JSON cloning. Runtime graph payloads must be serializable.
    }
  }
  return JSON.parse(JSON.stringify(value)) as T;
};

const asRecord = (value: unknown): PlainRecord | null => (
  typeof value === 'object' && value !== null ? value as PlainRecord : null
);

const isPoint2D = (value: unknown): value is GraphGridSnapPoint => {
  if (typeof value !== 'object' || value === null) return false;
  const point = value as Partial<GraphGridSnapPoint>;
  return typeof point.x === 'number' && Number.isFinite(point.x)
    && typeof point.y === 'number' && Number.isFinite(point.y);
};
