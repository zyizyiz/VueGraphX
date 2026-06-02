import {
  okResult,
  type GraphObjectNode,
  type GraphObjectPatch,
  type GraphOperationDiagnostic,
  type GraphOperationResult,
  type GraphWorldPoint
} from './contracts';
import { resolveGraphGridSnapOptions, snapDeltaToGraphGrid } from './gridSnapping';

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
  dragPhase?: 'move' | 'end';
  /**
   * Internal group-drag escape hatch: coordinate-scoped children are normally
   * not freely draggable, but they must move when their owning coordinate
   * system moves.
   */
  allowCoordinateScoped?: boolean;
}

export type GraphDragOperationStatus = 'success' | 'clamped' | 'failure';

export interface GraphDragBounds2D {
  dimension: '2d';
  minX?: number;
  maxX?: number;
  minY?: number;
  maxY?: number;
}

export interface GraphDragOperation {
  status: GraphDragOperationStatus;
  patch?: GraphObjectPatch;
  explanation: GraphOperationDiagnostic;
}

export interface GraphScopedDragPatch {
  objectId: string;
  patch: GraphObjectPatch;
}

type PlainRecord = Record<string, unknown>;
type MutablePoint2D = { x: number; y: number };
type MutablePoint3D = { x: number; y: number; z: number };

export const createGraphDragPatch = (
  node: GraphObjectNode,
  options: GraphCreateDragPatchOptions
): GraphOperationResult<GraphObjectPatch> => {
  const operation = resolveGraphDragOperation(node, options);
  return operation.ok && operation.value?.patch
    ? okResult(operation.value.patch)
    : { ok: false, diagnostics: operation.diagnostics };
};

export const resolveGraphDragOperation = (
  node: GraphObjectNode,
  options: GraphCreateDragPatchOptions
): GraphOperationResult<GraphDragOperation> => {
  if ((node.meta as Record<string, unknown> | undefined)?.locked === true) {
    return dragFailure(node, 'drag.locked-object', `Graph object ${node.id} is locked and cannot be dragged.`);
  }

  const disabledReason = readDragDisabledReason(node, options);
  if (disabledReason) {
    return dragFailure(node, 'drag.disabled-object', disabledReason);
  }

  if (isRelationDrivenDrag(node)) {
    return dragFailure(node, 'drag.relation-driven-object', `Graph object ${node.id} is relation-driven and must be recomputed from its dependencies instead of directly dragged.`);
  }

  let delta = options.delta ?? deltaFromWorldPoints(options.startWorldPoint, options.currentWorldPoint);
  if (!delta) {
    return dragFailure(node, 'drag.missing-delta', 'Drag patch requires either a delta or start/current world points.');
  }

  const payload = clonePayload(node.payload);
  if (typeof payload !== 'object' || payload === null) {
    return dragFailure(node, 'drag.unsupported-payload', `Graph object ${node.id} has no draggable payload.`);
  }
  delta = applyDragSnap(node, payload as PlainRecord, delta, options);

  const updated = translatePayload(payload as PlainRecord, delta);
  if (!updated) {
    return dragFailure(node, 'drag.unsupported-object', `Graph object ${node.id} does not expose a renderer-neutral drag rule.`);
  }

  const constrained = applyDragBounds(updated, node, delta);
  const renderHints = translateRenderHints(node.renderHints, delta);
  const code = constrained.clamped ? 'drag.clamped-to-bounds' : 'drag.success';
  const explanation = dragDiagnostic(
    node,
    code,
    constrained.clamped
      ? `Graph object ${node.id} drag was clamped to its renderer-neutral bounds.`
      : `Graph object ${node.id} drag produced a renderer-neutral patch.`,
    constrained.clamped ? 'warning' : 'info'
  );
  return {
    ok: true,
    value: {
      status: constrained.clamped ? 'clamped' : 'success',
      patch: {
        payload: constrained.payload,
        ...(renderHints ? { renderHints } : {})
      },
      explanation
    },
    diagnostics: constrained.clamped ? [explanation] : []
  };
};

export const createGraphCoordinateSystemDragPatches = (
  nodes: readonly GraphObjectNode[],
  coordinateSystemNode: GraphObjectNode,
  options: GraphCreateDragPatchOptions
): GraphOperationResult<GraphScopedDragPatch[]> => {
  const coordinateSystemId = readCoordinateSystemScopeId(coordinateSystemNode);
  if (!coordinateSystemId) {
    return {
      ok: false,
      diagnostics: [dragDiagnostic(
        coordinateSystemNode,
        'drag.unsupported-coordinate-system',
        `Graph object ${coordinateSystemNode.id} is not a draggable coordinate system.`,
        'error'
      )]
    };
  }

  const patches: GraphScopedDragPatch[] = [];
  const coordinatePatch = createGraphDragPatch(coordinateSystemNode, options);
  if (!coordinatePatch.ok || !coordinatePatch.value) {
    return { ok: false, diagnostics: coordinatePatch.diagnostics };
  }
  patches.push({ objectId: coordinateSystemNode.id, patch: coordinatePatch.value });
  const scopedOptions = {
    ...options,
    delta: readAppliedCoordinateSystemDelta(coordinateSystemNode, coordinatePatch.value) ?? options.delta
  };

  for (const child of nodes) {
    if (child.id === coordinateSystemNode.id || readScopedCoordinateSystemId(child) !== coordinateSystemId) continue;
    const childPatch = createGraphDragPatch(child, {
      ...scopedOptions,
      allowCoordinateScoped: true
    });
    if (!childPatch.ok || !childPatch.value) {
      return { ok: false, diagnostics: childPatch.diagnostics };
    }
    patches.push({ objectId: child.id, patch: childPatch.value });
  }

  return okResult(patches);
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

const applyDragSnap = (
  node: GraphObjectNode,
  payload: PlainRecord,
  delta: GraphDragDelta,
  options: GraphCreateDragPatchOptions
): GraphDragDelta => {
  if (delta.dimension !== '2d') return delta;
  const snapInput = readGraphSnapInput(node, payload);
  if (snapInput === undefined || snapInput === false) return delta;
  const snapOptions = resolveGraphGridSnapOptions(snapInput, { enabled: true, step: 1 });
  if (snapOptions.phase === 'end' && options.dragPhase === 'move') return delta;
  const anchor = readDragSnapAnchor(payload);
  if (!anchor) return delta;
  return {
    dimension: '2d',
    ...snapDeltaToGraphGrid(anchor, delta, snapOptions)
  };
};

const readGraphSnapInput = (node: GraphObjectNode, payload: PlainRecord): unknown => {
  const meta = node.meta as Record<string, unknown> | undefined;
  const hints = node.renderHints as Record<string, unknown> | undefined;
  return meta?.snapToGrid ?? hints?.snapToGrid ?? payload.snapToGrid;
};

const readDragSnapAnchor = (payload: PlainRecord): MutablePoint2D | null => {
  if (isWorldPoint2D(payload.origin)) return { x: payload.origin.x, y: payload.origin.y };
  if (isPoint2D(payload.origin)) return payload.origin;
  const geometry = typeof payload.geometry === 'object' && payload.geometry !== null
    ? payload.geometry as PlainRecord
    : null;
  if (isPoint2D(geometry?.origin)) return geometry.origin;
  if (isPoint2D(payload.point)) return payload.point;
  if (isWorldPoint2D(payload.position)) return { x: payload.position.x, y: payload.position.y };
  return null;
};

const readAppliedCoordinateSystemDelta = (
  before: GraphObjectNode,
  patch: GraphObjectPatch
): GraphDragDelta2D | null => {
  const beforePayload = typeof before.payload === 'object' && before.payload !== null
    ? before.payload as PlainRecord
    : null;
  const afterPayload = typeof patch.payload === 'object' && patch.payload !== null
    ? patch.payload as PlainRecord
    : null;
  if (!beforePayload || !afterPayload) return null;
  const beforeAnchor = readDragSnapAnchor(beforePayload);
  const afterAnchor = readDragSnapAnchor(afterPayload);
  if (!beforeAnchor || !afterAnchor) return null;
  return {
    dimension: '2d',
    dx: afterAnchor.x - beforeAnchor.x,
    dy: afterAnchor.y - beforeAnchor.y
  };
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

const translateRenderHints = (
  renderHints: GraphObjectNode['renderHints'],
  delta: GraphDragDelta
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

const applyDragBounds = (
  payload: PlainRecord,
  node: GraphObjectNode,
  delta: GraphDragDelta
): { payload: PlainRecord; clamped: boolean } => {
  const bounds = delta.dimension === '2d' ? readDragBounds2D(node) : null;
  if (!bounds) return { payload, clamped: false };

  let clamped = false;
  if (isPoint2D(payload.point)) {
    const nextPoint = clampPoint2D(payload.point, bounds);
    clamped = clamped || nextPoint.clamped;
    payload.point = nextPoint.point;
  }
  if (isWorldPoint2D(payload.position)) {
    const nextPoint = clampPoint2D(payload.position, bounds);
    clamped = clamped || nextPoint.clamped;
    payload.position = { ...payload.position, ...nextPoint.point };
  }

  const geometry = payload.geometry;
  if (typeof geometry === 'object' && geometry !== null) {
    const nextGeometry = clampGeometry2D(geometry as PlainRecord, bounds);
    clamped = clamped || nextGeometry.clamped;
    payload.geometry = nextGeometry.geometry;
  }

  return { payload, clamped };
};

const clampGeometry2D = (
  geometry: PlainRecord,
  bounds: GraphDragBounds2D
): { geometry: PlainRecord; clamped: boolean } => {
  let clamped = false;
  const next = { ...geometry };
  for (const key of ['center', 'point', 'origin'] as const) {
    if (isPoint2D(next[key])) {
      const result = clampPoint2D(next[key], bounds);
      clamped = clamped || result.clamped;
      next[key] = result.point;
    }
  }
  return { geometry: next, clamped };
};

const clampPoint2D = (
  point: MutablePoint2D,
  bounds: GraphDragBounds2D
): { point: MutablePoint2D; clamped: boolean } => {
  const x = clampFinite(point.x, bounds.minX, bounds.maxX);
  const y = clampFinite(point.y, bounds.minY, bounds.maxY);
  return {
    point: { x, y },
    clamped: x !== point.x || y !== point.y
  };
};

const clampFinite = (value: number, min?: number, max?: number): number => {
  const lower = typeof min === 'number' && Number.isFinite(min) ? min : Number.NEGATIVE_INFINITY;
  const upper = typeof max === 'number' && Number.isFinite(max) ? max : Number.POSITIVE_INFINITY;
  return Math.max(lower, Math.min(upper, value));
};

const readDragBounds2D = (node: GraphObjectNode): GraphDragBounds2D | null => {
  const meta = node.meta as Record<string, unknown> | undefined;
  const bounds = meta?.dragBounds;
  if (typeof bounds !== 'object' || bounds === null) return null;
  const record = bounds as Record<string, unknown>;
  if (record.dimension !== '2d') return null;
  const parsed: GraphDragBounds2D = { dimension: '2d' };
  if (typeof record.minX === 'number' && Number.isFinite(record.minX)) parsed.minX = record.minX;
  if (typeof record.maxX === 'number' && Number.isFinite(record.maxX)) parsed.maxX = record.maxX;
  if (typeof record.minY === 'number' && Number.isFinite(record.minY)) parsed.minY = record.minY;
  if (typeof record.maxY === 'number' && Number.isFinite(record.maxY)) parsed.maxY = record.maxY;
  return parsed;
};

const isRelationDrivenDrag = (node: GraphObjectNode): boolean => {
  const meta = node.meta as Record<string, unknown> | undefined;
  return meta?.relationDriven === true || meta?.dragMode === 'relation-driven';
};

const readDragDisabledReason = (
  node: GraphObjectNode,
  options: GraphCreateDragPatchOptions = {}
): string | null => {
  const meta = node.meta as Record<string, unknown> | undefined;
  const coordinateSystemId = typeof meta?.coordinateSystemId === 'string' ? meta.coordinateSystemId : null;
  const configuredReason = typeof meta?.dragDisabledReason === 'string' ? meta.dragDisabledReason : null;
  if (coordinateSystemId && node.type !== 'coordinate-system') {
    if (options.allowCoordinateScoped) return null;
    return configuredReason ?? `Graph object ${node.id} belongs to coordinate system ${coordinateSystemId} and cannot be freely dragged.`;
  }
  if (meta?.draggable === false || meta?.dragDisabled === true || meta?.dragMode === 'disabled') {
    return configuredReason ?? `Graph object ${node.id} is not draggable.`;
  }
  return null;
};

const readScopedCoordinateSystemId = (node: GraphObjectNode): string | null => {
  const meta = node.meta as Record<string, unknown> | undefined;
  return typeof meta?.coordinateSystemId === 'string' ? meta.coordinateSystemId : null;
};

const readCoordinateSystemScopeId = (node: GraphObjectNode): string | null => {
  if (node.type !== 'coordinate-system') return null;
  return readScopedCoordinateSystemId(node) ?? node.id;
};

const dragFailure = (
  node: GraphObjectNode,
  code: string,
  message: string
): GraphOperationResult<GraphDragOperation> => ({
  ok: false,
  diagnostics: [dragDiagnostic(node, code, message, 'error')]
});

const dragDiagnostic = (
  node: GraphObjectNode,
  code: string,
  message: string,
  severity: GraphOperationDiagnostic['severity']
): GraphOperationDiagnostic => ({
  code,
  message,
  severity,
  target: { scope: 'object', objectId: node.id }
});

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
