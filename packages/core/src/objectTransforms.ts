import type { GraphObjectNode, GraphWorldPoint } from './contracts';

export interface GraphObjectTranslationDelta2D {
  dimension: '2d';
  dx: number;
  dy: number;
}

export interface GraphObjectTranslationDelta3D {
  dimension: '3d';
  dx: number;
  dy: number;
  dz: number;
}

export type GraphObjectTranslationDelta = GraphObjectTranslationDelta2D | GraphObjectTranslationDelta3D;

type PlainRecord = Record<string, unknown>;
type MutablePoint2D = { x: number; y: number };
type MutablePoint3D = { x: number; y: number; z: number };

export const translateGraphObjectPayload = (
  payload: PlainRecord,
  delta: GraphObjectTranslationDelta
): PlainRecord | null => {
  let changed = false;

  if (isPoint2D(payload.point) && delta.dimension === '2d') {
    payload.point = translatePoint2D(payload.point, delta);
    changed = true;
  }

  if (isWorldPoint2D(payload.position) && delta.dimension === '2d') {
    payload.position = translateWorldPoint2D(payload.position, delta);
    changed = true;
  }

  if (isWorldPoint2D(payload.origin) && delta.dimension === '2d') {
    payload.origin = translateWorldPoint2D(payload.origin, delta);
    changed = true;
  }

  if (isWorldPoint3D(payload.position) && delta.dimension === '3d') {
    payload.position = translateWorldPoint3D(payload.position, delta);
    changed = true;
  }

  if (isPoint3D(payload.origin) && delta.dimension === '3d') {
    payload.origin = translatePoint3D(payload.origin, delta);
    changed = true;
  }

  if (isPoint2D(payload.start) && isPoint2D(payload.end) && delta.dimension === '2d') {
    payload.start = translatePoint2D(payload.start, delta);
    payload.end = translatePoint2D(payload.end, delta);
    changed = true;
  }

  const geometry = payload.geometry;
  if (typeof geometry === 'object' && geometry !== null) {
    const nextGeometry = translateGraphGeometry(geometry as PlainRecord, delta);
    if (nextGeometry) {
      payload.geometry = nextGeometry;
      changed = true;
    }
  }

  return changed ? payload : null;
};

export const translateGraphRenderHints = (
  renderHints: GraphObjectNode['renderHints'],
  delta: GraphObjectTranslationDelta
): GraphObjectNode['renderHints'] | null => {
  if (!renderHints || delta.dimension !== '2d') return null;
  const bounds = renderHints.clipWorldBounds;
  if (!isClipWorldBounds2D(bounds)) return null;
  return {
    ...renderHints,
    clipWorldBounds: {
      left: bounds.left + delta.dx,
      right: bounds.right + delta.dx,
      top: bounds.top + delta.dy,
      bottom: bounds.bottom + delta.dy
    }
  };
};

const translateGraphGeometry = (
  geometry: PlainRecord,
  delta: GraphObjectTranslationDelta
): PlainRecord | null => {
  const next = { ...geometry };
  let changed = false;

  if (delta.dimension === '2d') {
    if (isPoint2D(next.center)) {
      next.center = translatePoint2D(next.center, delta);
      changed = true;
    }
    if (isPoint2D(next.point)) {
      next.point = translatePoint2D(next.point, delta);
      changed = true;
    }
    if (isPoint2D(next.origin)) {
      next.origin = translatePoint2D(next.origin, delta);
      changed = true;
    }
    if (isPoint2D(next.start) && isPoint2D(next.end)) {
      next.start = translatePoint2D(next.start, delta);
      next.end = translatePoint2D(next.end, delta);
      changed = true;
    }
    if (Array.isArray(next.vertices) && next.vertices.every(isPoint2D)) {
      next.vertices = next.vertices.map((point) => translatePoint2D(point, delta));
      changed = true;
    }
    if (Array.isArray(next.points) && next.points.every(isPoint2D)) {
      next.points = next.points.map((point) => translatePoint2D(point, delta));
      changed = true;
    }
    for (const key of ['border', 'xAxis', 'yAxis', 'tickPoints'] as const) {
      if (Array.isArray(next[key]) && next[key].every(isPoint2D)) {
        next[key] = next[key].map((point) => translatePoint2D(point, delta));
        changed = true;
      }
    }
    for (const key of ['segments', 'gridSegments', 'axisArrowSegments'] as const) {
      if (Array.isArray(next[key]) && next[key].every(isPoint2DArray)) {
        next[key] = next[key].map((segment) => segment.map((point) => translatePoint2D(point, delta)));
        changed = true;
      }
    }
    if (Array.isArray(next.labels) && next.labels.every(isLabelWithPoint2D)) {
      next.labels = next.labels.map((label) => ({
        ...label,
        point: translatePoint2D(label.point, delta)
      }));
      changed = true;
    }
  }

  return changed ? next : null;
};

const translatePoint2D = (point: MutablePoint2D, delta: GraphObjectTranslationDelta2D): MutablePoint2D => ({
  x: normalizeCoordinate(point.x + delta.dx),
  y: normalizeCoordinate(point.y + delta.dy)
});

const translatePoint3D = (point: MutablePoint3D, delta: GraphObjectTranslationDelta3D): MutablePoint3D => ({
  x: normalizeCoordinate(point.x + delta.dx),
  y: normalizeCoordinate(point.y + delta.dy),
  z: normalizeCoordinate(point.z + delta.dz)
});

const translateWorldPoint2D = (
  point: GraphWorldPoint & { dimension: '2d' },
  delta: GraphObjectTranslationDelta2D
): GraphWorldPoint & { dimension: '2d' } => ({
  ...point,
  x: normalizeCoordinate(point.x + delta.dx),
  y: normalizeCoordinate(point.y + delta.dy)
});

const translateWorldPoint3D = (
  point: GraphWorldPoint & { dimension: '3d' },
  delta: GraphObjectTranslationDelta3D
): GraphWorldPoint & { dimension: '3d' } => ({
  ...point,
  x: normalizeCoordinate(point.x + delta.dx),
  y: normalizeCoordinate(point.y + delta.dy),
  z: normalizeCoordinate(point.z + delta.dz)
});

const normalizeCoordinate = (value: number): number => (
  Math.abs(value) < 1e-9 ? 0 : Number(value.toFixed(10))
);

const isPoint2D = (value: unknown): value is MutablePoint2D => {
  if (typeof value !== 'object' || value === null) return false;
  const point = value as Partial<MutablePoint2D>;
  return typeof point.x === 'number' && Number.isFinite(point.x) && typeof point.y === 'number' && Number.isFinite(point.y);
};

const isPoint3D = (value: unknown): value is MutablePoint3D => {
  if (typeof value !== 'object' || value === null) return false;
  const point = value as Partial<MutablePoint3D>;
  return typeof point.x === 'number' && Number.isFinite(point.x)
    && typeof point.y === 'number' && Number.isFinite(point.y)
    && typeof point.z === 'number' && Number.isFinite(point.z);
};

const isPoint2DArray = (value: unknown): value is MutablePoint2D[] => (
  Array.isArray(value) && value.every(isPoint2D)
);

const isLabelWithPoint2D = (value: unknown): value is { point: MutablePoint2D; [key: string]: unknown } => {
  if (typeof value !== 'object' || value === null) return false;
  return isPoint2D((value as { point?: unknown }).point);
};

const isClipWorldBounds2D = (value: unknown): value is { left: number; right: number; top: number; bottom: number } => {
  if (typeof value !== 'object' || value === null) return false;
  const bounds = value as Partial<{ left: unknown; right: unknown; top: unknown; bottom: unknown }>;
  return typeof bounds.left === 'number' && Number.isFinite(bounds.left)
    && typeof bounds.right === 'number' && Number.isFinite(bounds.right)
    && typeof bounds.top === 'number' && Number.isFinite(bounds.top)
    && typeof bounds.bottom === 'number' && Number.isFinite(bounds.bottom);
};

const isWorldPoint2D = (value: unknown): value is GraphWorldPoint & { dimension: '2d' } => {
  if (typeof value !== 'object' || value === null) return false;
  const point = value as Partial<GraphWorldPoint>;
  return point.dimension === '2d' && typeof point.x === 'number' && Number.isFinite(point.x)
    && typeof point.y === 'number' && Number.isFinite(point.y);
};

const isWorldPoint3D = (value: unknown): value is GraphWorldPoint & { dimension: '3d' } => {
  if (typeof value !== 'object' || value === null) return false;
  const point = value as Partial<GraphWorldPoint>;
  return point.dimension === '3d' && typeof point.x === 'number' && Number.isFinite(point.x)
    && typeof point.y === 'number' && Number.isFinite(point.y)
    && typeof point.z === 'number' && Number.isFinite(point.z);
};
