import {
  type GraphClientPoint,
  type GraphLayerId,
  type GraphObjectNode,
  type GraphOperationDiagnostic,
  type GraphOperationResult,
  type GraphPickOptions,
  type GraphPickResult
} from './contracts';
import { isGraphObjectDraggableByPolicy } from './dragPolicy';
import type { GraphCreateDragPatchOptions, GraphDragDelta2D } from './dragOperations';

export interface GraphCoordinateSystemDragPoint2D {
  x: number;
  y: number;
}

export interface GraphCoordinateSystemDragSession {
  pointerId: number;
  objectId: string;
  lastWorldPoint: GraphCoordinateSystemDragPoint2D;
}

export interface GraphCoordinateSystemDragPointerInput {
  pointerId: number;
  point: GraphClientPoint;
}

export interface GraphCoordinateSystemDragRuntime {
  scene: {
    getObject(objectId: string): GraphObjectNode | null | undefined;
    listObjects(): readonly GraphObjectNode[];
  };
  router: {
    pick(point: GraphClientPoint, input?: {
      layerOrder?: readonly GraphLayerId[];
      pickOptions?: Omit<GraphPickOptions, 'layerOrder'>;
    }): GraphPickResult | null;
  };
  applyDragToObject(
    objectId: string,
    drag: GraphCreateDragPatchOptions
  ): GraphOperationResult<GraphObjectNode>;
}

export interface GraphCoordinateSystemDragControllerOptions {
  runtime: GraphCoordinateSystemDragRuntime;
  resolveWorldPoint: (point: GraphClientPoint) => GraphCoordinateSystemDragPoint2D | null;
  pickOptions?: GraphPickOptions;
  fallbackToRegion?: boolean;
  isDraggableNode?: (node: GraphObjectNode | null | undefined) => boolean;
  constrainDelta?: (
    delta: GraphDragDelta2D,
    session: GraphCoordinateSystemDragSession,
    dragPhase: 'move' | 'end'
  ) => GraphDragDelta2D;
}

export interface GraphCoordinateSystemDragControllerResult {
  handled: boolean;
  objectId?: string;
  diagnostics: GraphOperationDiagnostic[];
}

export interface GraphCoordinateSystemDragController {
  pointerDown(input: GraphCoordinateSystemDragPointerInput): GraphCoordinateSystemDragControllerResult;
  pointerMove(input: GraphCoordinateSystemDragPointerInput): GraphCoordinateSystemDragControllerResult;
  pointerUp(input: GraphCoordinateSystemDragPointerInput): GraphCoordinateSystemDragControllerResult;
  cancel(pointerId?: number): GraphCoordinateSystemDragControllerResult;
  isDragging(pointerId?: number): boolean;
  getSession(): GraphCoordinateSystemDragSession | null;
}

type PlainRecord = Record<string, unknown>;

export const createGraphCoordinateSystemDragController = (
  options: GraphCoordinateSystemDragControllerOptions
): GraphCoordinateSystemDragController => {
  const isDraggableNode = options.isDraggableNode ?? isGraphDraggableNode;
  let session: GraphCoordinateSystemDragSession | null = null;

  const cloneSession = (): GraphCoordinateSystemDragSession | null => (
    session
      ? {
        pointerId: session.pointerId,
        objectId: session.objectId,
        lastWorldPoint: { ...session.lastWorldPoint }
      }
      : null
  );

  const applyDelta = (
    activeSession: GraphCoordinateSystemDragSession,
    currentWorldPoint: GraphCoordinateSystemDragPoint2D,
    dragPhase: 'move' | 'end'
  ): GraphCoordinateSystemDragControllerResult => {
    const delta = {
      dimension: '2d' as const,
      dx: currentWorldPoint.x - activeSession.lastWorldPoint.x,
      dy: currentWorldPoint.y - activeSession.lastWorldPoint.y
    };

    if (dragPhase === 'move' && Math.abs(delta.dx) < 1e-9 && Math.abs(delta.dy) < 1e-9) {
      return { handled: true, objectId: activeSession.objectId, diagnostics: [] };
    }

    const constrainedDelta = options.constrainDelta?.(delta, activeSession, dragPhase) ?? delta;
    const moved = options.runtime.applyDragToObject(activeSession.objectId, {
      delta: constrainedDelta,
      dragPhase
    });
    if (moved.ok) {
      activeSession.lastWorldPoint = { ...currentWorldPoint };
    }
    return {
      handled: true,
      objectId: activeSession.objectId,
      diagnostics: moved.diagnostics
    };
  };

  return {
    pointerDown(input) {
      if (session) return { handled: false, diagnostics: [] };

      const objectId = resolveCoordinateSystemDragObjectId(options.runtime, input.point, {
        pickOptions: options.pickOptions,
        fallbackToRegion: options.fallbackToRegion ?? true,
        resolveWorldPoint: options.resolveWorldPoint,
        isDraggableNode
      });
      if (!objectId) return { handled: false, diagnostics: [] };

      const worldPoint = options.resolveWorldPoint(input.point);
      if (!isFinitePoint2D(worldPoint)) {
        return {
          handled: false,
          objectId,
          diagnostics: [createCoordinateSystemDragDiagnostic(
            'coordinate-system-drag.invalid-world-point',
            `Coordinate system ${objectId} cannot start dragging without a finite 2D world point.`,
            'error',
            objectId
          )]
        };
      }

      session = {
        pointerId: input.pointerId,
        objectId,
        lastWorldPoint: { ...worldPoint }
      };
      return { handled: true, objectId, diagnostics: [] };
    },

    pointerMove(input) {
      if (!session || session.pointerId !== input.pointerId) return { handled: false, diagnostics: [] };
      const worldPoint = options.resolveWorldPoint(input.point);
      if (!isFinitePoint2D(worldPoint)) {
        return {
          handled: true,
          objectId: session.objectId,
          diagnostics: [createCoordinateSystemDragDiagnostic(
            'coordinate-system-drag.invalid-world-point',
            `Coordinate system ${session.objectId} cannot continue dragging without a finite 2D world point.`,
            'error',
            session.objectId
          )]
        };
      }
      return applyDelta(session, worldPoint, 'move');
    },

    pointerUp(input) {
      if (!session || session.pointerId !== input.pointerId) return { handled: false, diagnostics: [] };
      const activeSession = session;
      session = null;
      const worldPoint = options.resolveWorldPoint(input.point) ?? activeSession.lastWorldPoint;
      return applyDelta(activeSession, worldPoint, 'end');
    },

    cancel(pointerId) {
      if (!session || (pointerId !== undefined && session.pointerId !== pointerId)) {
        return { handled: false, diagnostics: [] };
      }
      const objectId = session.objectId;
      session = null;
      return { handled: true, objectId, diagnostics: [] };
    },

    isDragging(pointerId) {
      return !!session && (pointerId === undefined || session.pointerId === pointerId);
    },

    getSession: cloneSession
  };
};

export const resolveCoordinateSystemDragObjectId = (
  runtime: GraphCoordinateSystemDragRuntime,
  point: GraphClientPoint,
  options: Partial<Pick<
    GraphCoordinateSystemDragControllerOptions,
    'pickOptions' | 'fallbackToRegion' | 'resolveWorldPoint' | 'isDraggableNode'
  >> = {}
): string | null => {
  const isDraggableNode = options.isDraggableNode ?? isGraphDraggableNode;
  const routed = pickRuntimeObject(runtime, point, options.pickOptions);
  if (routed?.target.objectId) {
    const node = runtime.scene.getObject(routed.target.objectId);
    return isDraggableNode(node) ? routed.target.objectId : null;
  }

  if (options.fallbackToRegion === false || !options.resolveWorldPoint) return null;
  const worldPoint = options.resolveWorldPoint(point);
  if (!isFinitePoint2D(worldPoint)) return null;

  for (const node of [...runtime.scene.listObjects()].reverse()) {
    if (isDraggableNode(node) && isPointInsideGraphCoordinateSystemRegion(node, worldPoint)) {
      return node.id;
    }
  }
  return null;
};

export const isGraphDraggableNode = (
  node: GraphObjectNode | null | undefined
): boolean => isGraphObjectDraggableByPolicy(node);

export const isGraphCoordinateSystemDraggableNode = (
  node: { type?: string; meta?: PlainRecord; renderHints?: PlainRecord } | null | undefined
): boolean => (
  node?.type === 'coordinate-system'
  && isGraphObjectDraggableByPolicy({
    id: 'coordinate-system',
    type: node.type,
    meta: node.meta,
    renderHints: node.renderHints
  })
);

export const isPointInsideGraphCoordinateSystemRegion = (
  node: GraphObjectNode,
  point: GraphCoordinateSystemDragPoint2D
): boolean => {
  const payload = typeof node.payload === 'object' && node.payload !== null
    ? node.payload as PlainRecord
    : null;
  const geometry = typeof payload?.geometry === 'object' && payload.geometry !== null
    ? payload.geometry as PlainRecord
    : null;
  if (geometry?.kind !== 'coordinate-system') return false;

  const border = readPointList2D(geometry.border);
  if (border.length >= 3) return pointInPolygon2D(point, border);

  const bounds = boundsForPointGroups(readCoordinateSystemSegments2D(geometry));
  return !!bounds
    && point.x >= bounds.minX
    && point.x <= bounds.maxX
    && point.y >= bounds.minY
    && point.y <= bounds.maxY;
};

const pickRuntimeObject = (
  runtime: GraphCoordinateSystemDragRuntime,
  point: GraphClientPoint,
  pickOptions: GraphPickOptions = {}
): GraphPickResult | null => {
  const { layerOrder, ...backendPickOptions } = pickOptions;
  return runtime.router.pick(point, {
    layerOrder,
    pickOptions: backendPickOptions
  });
};

const readCoordinateSystemSegments2D = (geometry: PlainRecord): GraphCoordinateSystemDragPoint2D[][] => {
  const segments = Array.isArray(geometry.segments)
    ? geometry.segments.map(readPointList2D).filter((segment) => segment.length >= 2)
    : [];
  if (segments.length > 0) return segments;
  return [geometry.xAxis, geometry.yAxis].map(readPointList2D).filter((segment) => segment.length >= 2);
};

const readPointList2D = (value: unknown): GraphCoordinateSystemDragPoint2D[] => (
  Array.isArray(value) ? value.filter(isFinitePoint2D) : []
);

const boundsForPointGroups = (
  groups: readonly GraphCoordinateSystemDragPoint2D[][]
): { minX: number; maxX: number; minY: number; maxY: number } | null => {
  const points = groups.flat();
  if (points.length === 0) return null;
  return {
    minX: Math.min(...points.map((entry) => entry.x)),
    maxX: Math.max(...points.map((entry) => entry.x)),
    minY: Math.min(...points.map((entry) => entry.y)),
    maxY: Math.max(...points.map((entry) => entry.y))
  };
};

const pointInPolygon2D = (
  point: GraphCoordinateSystemDragPoint2D,
  polygon: readonly GraphCoordinateSystemDragPoint2D[]
): boolean => {
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index, index += 1) {
    const currentPoint = polygon[index];
    const previousPoint = polygon[previous];
    const crosses = (currentPoint.y > point.y) !== (previousPoint.y > point.y)
      && point.x < ((previousPoint.x - currentPoint.x) * (point.y - currentPoint.y)) / ((previousPoint.y - currentPoint.y) || Number.EPSILON) + currentPoint.x;
    if (crosses) inside = !inside;
  }
  return inside;
};

const isFinitePoint2D = (value: unknown): value is GraphCoordinateSystemDragPoint2D => {
  if (!value || typeof value !== 'object') return false;
  const record = value as PlainRecord;
  return typeof record.x === 'number'
    && Number.isFinite(record.x)
    && typeof record.y === 'number'
    && Number.isFinite(record.y);
};

const createCoordinateSystemDragDiagnostic = (
  code: string,
  message: string,
  severity: GraphOperationDiagnostic['severity'],
  objectId: string
): GraphOperationDiagnostic => ({
  code,
  message,
  severity,
  target: {
    scope: 'object',
    objectId
  }
});
