import {
  errorResult,
  okResult,
  type GraphObjectNode,
  type GraphObjectPatch,
  type GraphOperationResult,
  type GraphWorldPoint
} from './contracts';

export interface GraphDragDelta2D {
  dimension: '2d';
  dx: number;
  dy: number;
}

export interface GraphDragDelta3D {
  dimension: '3d';
  dx: number;
  dy: number;
  dz: number;
}

export type GraphDragDelta = GraphDragDelta2D | GraphDragDelta3D;

export interface GraphCreateDragPatchOptions {
  delta?: GraphDragDelta;
  startWorldPoint?: GraphWorldPoint;
  currentWorldPoint?: GraphWorldPoint;
}

type PlainRecord = Record<string, unknown>;
type MutablePoint2D = { x: number; y: number };
type MutablePoint3D = { x: number; y: number; z: number };

export const createGraphDragPatch = (
  node: GraphObjectNode,
  options: GraphCreateDragPatchOptions
): GraphOperationResult<GraphObjectPatch> => {
  if ((node.meta as Record<string, unknown> | undefined)?.locked === true) {
    return errorResult('drag.locked-object', `Graph object ${node.id} is locked and cannot be dragged.`, {
      scope: 'object',
      objectId: node.id
    });
  }

  const delta = options.delta ?? deltaFromWorldPoints(options.startWorldPoint, options.currentWorldPoint);
  if (!delta) {
    return errorResult('drag.missing-delta', 'Drag patch requires either a delta or start/current world points.');
  }

  const payload = clonePayload(node.payload);
  if (typeof payload !== 'object' || payload === null) {
    return errorResult('drag.unsupported-payload', `Graph object ${node.id} has no draggable payload.`);
  }

  const updated = translatePayload(payload as PlainRecord, delta);
  if (!updated) {
    return errorResult('drag.unsupported-object', `Graph object ${node.id} does not expose a renderer-neutral drag rule.`);
  }

  return okResult({ payload: updated });
};

const deltaFromWorldPoints = (start?: GraphWorldPoint, current?: GraphWorldPoint): GraphDragDelta | null => {
  if (!start || !current || start.dimension !== current.dimension) return null;
  if (start.dimension === '3d' && current.dimension === '3d') {
    return { dimension: '3d', dx: current.x - start.x, dy: current.y - start.y, dz: current.z - start.z };
  }
  return { dimension: '2d', dx: current.x - start.x, dy: current.y - start.y };
};

const clonePayload = <T>(payload: T): T => {
  if (payload === undefined || payload === null) return payload;
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(payload);
    } catch {
      // Fall through to JSON cloning. Drag payloads are expected to be scene-serializable.
    }
  }
  return JSON.parse(JSON.stringify(payload)) as T;
};

const translatePayload = (payload: PlainRecord, delta: GraphDragDelta): PlainRecord | null => {
  let changed = false;

  if (isPoint2D(payload.point) && delta.dimension === '2d') {
    payload.point = translatePoint2D(payload.point, delta);
    changed = true;
  }

  if (isWorldPoint2D(payload.position) && delta.dimension === '2d') {
    payload.position = translateWorldPoint2D(payload.position, delta);
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
    const nextGeometry = translateGeometry(geometry as PlainRecord, delta);
    if (nextGeometry) {
      payload.geometry = nextGeometry;
      changed = true;
    }
  }

  return changed ? payload : null;
};

const translateGeometry = (geometry: PlainRecord, delta: GraphDragDelta): PlainRecord | null => {
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
  }

  return changed ? next : null;
};

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

const translatePoint2D = (point: MutablePoint2D, delta: GraphDragDelta2D): MutablePoint2D => ({
  x: point.x + delta.dx,
  y: point.y + delta.dy
});

const translatePoint3D = (point: MutablePoint3D, delta: GraphDragDelta3D): MutablePoint3D => ({
  x: point.x + delta.dx,
  y: point.y + delta.dy,
  z: point.z + delta.dz
});

const translateWorldPoint2D = (point: GraphWorldPoint & { dimension: '2d' }, delta: GraphDragDelta2D): GraphWorldPoint & { dimension: '2d' } => ({
  ...point,
  x: point.x + delta.dx,
  y: point.y + delta.dy
});

const translateWorldPoint3D = (point: GraphWorldPoint & { dimension: '3d' }, delta: GraphDragDelta3D): GraphWorldPoint & { dimension: '3d' } => ({
  ...point,
  x: point.x + delta.dx,
  y: point.y + delta.dy,
  z: point.z + delta.dz
});
