import type { GraphClientPoint, GraphViewportSize } from './contracts';

export interface GraphViewportWorldBounds2D {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface GraphViewportWheelGestureInput {
  ctrlKey: boolean;
  metaKey: boolean;
  deltaMode: number;
  deltaX: number;
  deltaY: number;
}

export type GraphViewportWheelGestureKind = 'zoom' | 'pan' | 'ignore';

export interface GraphViewportNavigationWheelInput extends GraphViewportWheelGestureInput {
  point: GraphClientPoint;
}

export interface GraphViewportNavigationPointerInput {
  pointerId: number;
  point: GraphClientPoint;
}

export type GraphViewportNavigationKind =
  | 'wheel-zoom'
  | 'wheel-pan'
  | 'pointer-pan-start'
  | 'pointer-pan'
  | 'pointer-pan-end'
  | 'pointer-pinch-start'
  | 'pointer-pinch'
  | 'pointer-pinch-end'
  | 'ignore';

export interface GraphViewportNavigationResult<Bounds extends GraphViewportWorldBounds2D> {
  handled: boolean;
  kind: GraphViewportNavigationKind;
  bounds: Bounds;
}

export interface GraphViewportNavigationControllerOptions<Bounds extends GraphViewportWorldBounds2D> {
  bounds: Bounds;
  viewport: GraphViewportSize;
  wheelZoomInScale?: number;
  wheelZoomOutScale?: number;
  minPinchScale?: number;
  maxPinchScale?: number;
}

export interface GraphViewportNavigationController<Bounds extends GraphViewportWorldBounds2D> {
  getBounds: () => Bounds;
  setBounds: (bounds: Bounds) => void;
  getViewport: () => GraphViewportSize;
  setViewport: (viewport: GraphViewportSize) => void;
  getPointerCount: () => number;
  handleWheel: (input: GraphViewportNavigationWheelInput) => GraphViewportNavigationResult<Bounds>;
  handlePointerDown: (input: GraphViewportNavigationPointerInput) => GraphViewportNavigationResult<Bounds>;
  handlePointerMove: (input: GraphViewportNavigationPointerInput) => GraphViewportNavigationResult<Bounds>;
  handlePointerUp: (input: Pick<GraphViewportNavigationPointerInput, 'pointerId'>) => GraphViewportNavigationResult<Bounds>;
  resetPointers: () => void;
}

interface GraphViewportPanSession<Bounds extends GraphViewportWorldBounds2D> {
  pointerId: number;
  startPoint: GraphClientPoint;
  startBounds: Bounds;
}

interface GraphViewportPinchSession<Bounds extends GraphViewportWorldBounds2D> {
  pointerIds: [number, number];
  startDistance: number;
  startCenter: GraphClientPoint;
  startBounds: Bounds;
}

const DEFAULT_WHEEL_ZOOM_IN_SCALE = 0.96;
const DEFAULT_WHEEL_ZOOM_OUT_SCALE = 1 / DEFAULT_WHEEL_ZOOM_IN_SCALE;
const DEFAULT_WHEEL_ZOOM_REFERENCE_DELTA = 5;
const DEFAULT_MAX_WHEEL_ZOOM_STEPS = 4;
const DEFAULT_MIN_PINCH_SCALE = 0.25;
const DEFAULT_MAX_PINCH_SCALE = 4;

const safeViewportWidth = (viewport: GraphViewportSize): number => Math.max(1, viewport.width);
const safeViewportHeight = (viewport: GraphViewportSize): number => Math.max(1, viewport.height);

export const classifyGraphViewportWheelGesture = (
  event: GraphViewportWheelGestureInput
): GraphViewportWheelGestureKind => {
  if (event.ctrlKey || event.metaKey || event.deltaMode !== 0) return 'zoom';

  const absX = Math.abs(event.deltaX);
  const absY = Math.abs(event.deltaY);
  if (absX < 1 && absY < 1) return 'ignore';

  return 'pan';
};

export const fitGraphBoundsToViewportAspect = <Bounds extends GraphViewportWorldBounds2D>(
  bounds: Bounds,
  viewport: GraphViewportSize
): Bounds => {
  const worldWidth = bounds.right - bounds.left;
  const worldHeight = bounds.top - bounds.bottom;
  if (worldWidth <= 0 || worldHeight <= 0 || viewport.width <= 0 || viewport.height <= 0) {
    return cloneBounds(bounds);
  }

  const viewportAspect = viewport.width / viewport.height;
  if (!Number.isFinite(viewportAspect) || viewportAspect <= 0) return cloneBounds(bounds);

  const worldAspect = worldWidth / worldHeight;
  if (Math.abs(worldAspect - viewportAspect) < 1e-9) return cloneBounds(bounds);

  const centerX = (bounds.left + bounds.right) / 2;
  const centerY = (bounds.top + bounds.bottom) / 2;
  if (viewportAspect > worldAspect) {
    const halfWidth = (worldHeight * viewportAspect) / 2;
    return {
      ...bounds,
      left: centerX - halfWidth,
      right: centerX + halfWidth,
      top: bounds.top,
      bottom: bounds.bottom
    };
  }

  const halfHeight = (worldWidth / viewportAspect) / 2;
  return {
    ...bounds,
    left: bounds.left,
    right: bounds.right,
    top: centerY + halfHeight,
    bottom: centerY - halfHeight
  };
};

export const projectGraphViewportWorldPoint = (
  point: { x: number; y: number },
  bounds: GraphViewportWorldBounds2D,
  viewport: GraphViewportSize
): GraphClientPoint => ({
  x: ((point.x - bounds.left) / (bounds.right - bounds.left)) * safeViewportWidth(viewport),
  y: ((bounds.top - point.y) / (bounds.top - bounds.bottom)) * safeViewportHeight(viewport)
});

export const unprojectGraphViewportClientPoint = (
  point: GraphClientPoint,
  bounds: GraphViewportWorldBounds2D,
  viewport: GraphViewportSize
): { x: number; y: number } => ({
  x: bounds.left + (point.x / safeViewportWidth(viewport)) * (bounds.right - bounds.left),
  y: bounds.top - (point.y / safeViewportHeight(viewport)) * (bounds.top - bounds.bottom)
});

export const panGraphBoundsByPointerDelta = <Bounds extends GraphViewportWorldBounds2D>(
  bounds: Bounds,
  delta: GraphClientPoint,
  viewport: GraphViewportSize
): Bounds => {
  const worldDx = -(delta.x / safeViewportWidth(viewport)) * (bounds.right - bounds.left);
  const worldDy = (delta.y / safeViewportHeight(viewport)) * (bounds.top - bounds.bottom);
  return translateBounds(bounds, worldDx, worldDy);
};

export const panGraphBoundsByWheelDelta = <Bounds extends GraphViewportWorldBounds2D>(
  bounds: Bounds,
  delta: GraphClientPoint,
  viewport: GraphViewportSize
): Bounds => {
  const worldDx = (delta.x / safeViewportWidth(viewport)) * (bounds.right - bounds.left);
  const worldDy = -(delta.y / safeViewportHeight(viewport)) * (bounds.top - bounds.bottom);
  return translateBounds(bounds, worldDx, worldDy);
};

export const panFittedGraphBoundsByPointerDelta = <Bounds extends GraphViewportWorldBounds2D>(
  bounds: Bounds,
  delta: GraphClientPoint,
  viewport: GraphViewportSize
): Bounds => {
  const visible = fitGraphBoundsToViewportAspect(bounds, viewport);
  const pannedVisible = panGraphBoundsByPointerDelta(visible, delta, viewport);
  return translateBounds(bounds, pannedVisible.left - visible.left, pannedVisible.top - visible.top);
};

export const panFittedGraphBoundsByWheelDelta = <Bounds extends GraphViewportWorldBounds2D>(
  bounds: Bounds,
  delta: GraphClientPoint,
  viewport: GraphViewportSize
): Bounds => {
  const visible = fitGraphBoundsToViewportAspect(bounds, viewport);
  const pannedVisible = panGraphBoundsByWheelDelta(visible, delta, viewport);
  return translateBounds(bounds, pannedVisible.left - visible.left, pannedVisible.top - visible.top);
};

export const zoomGraphBoundsAroundClientPoint = <Bounds extends GraphViewportWorldBounds2D>(
  bounds: Bounds,
  clientPoint: GraphClientPoint,
  viewport: GraphViewportSize,
  scale: number
): Bounds => {
  const focus = unprojectGraphViewportClientPoint(clientPoint, bounds, viewport);
  return {
    ...bounds,
    left: focus.x + (bounds.left - focus.x) * scale,
    right: focus.x + (bounds.right - focus.x) * scale,
    top: focus.y + (bounds.top - focus.y) * scale,
    bottom: focus.y + (bounds.bottom - focus.y) * scale
  };
};

export const zoomFittedGraphBoundsAroundClientPoint = <Bounds extends GraphViewportWorldBounds2D>(
  bounds: Bounds,
  clientPoint: GraphClientPoint,
  viewport: GraphViewportSize,
  scale: number
): Bounds => {
  const visible = fitGraphBoundsToViewportAspect(bounds, viewport);
  const focus = unprojectGraphViewportClientPoint(clientPoint, visible, viewport);
  return {
    ...bounds,
    left: focus.x + (bounds.left - focus.x) * scale,
    right: focus.x + (bounds.right - focus.x) * scale,
    top: focus.y + (bounds.top - focus.y) * scale,
    bottom: focus.y + (bounds.bottom - focus.y) * scale
  };
};

export const createGraphViewportNavigationController = <Bounds extends GraphViewportWorldBounds2D>(
  options: GraphViewportNavigationControllerOptions<Bounds>
): GraphViewportNavigationController<Bounds> => {
  let bounds = cloneBounds(options.bounds);
  let viewport = cloneViewport(options.viewport);
  let panSession: GraphViewportPanSession<Bounds> | null = null;
  let pinchSession: GraphViewportPinchSession<Bounds> | null = null;
  const pointers = new Map<number, GraphClientPoint>();

  const wheelZoomInScale = positiveFinite(options.wheelZoomInScale, DEFAULT_WHEEL_ZOOM_IN_SCALE);
  const wheelZoomOutScale = positiveFinite(options.wheelZoomOutScale, DEFAULT_WHEEL_ZOOM_OUT_SCALE);
  const minPinchScale = positiveFinite(options.minPinchScale, DEFAULT_MIN_PINCH_SCALE);
  const maxPinchScale = Math.max(minPinchScale, positiveFinite(options.maxPinchScale, DEFAULT_MAX_PINCH_SCALE));

  const result = (
    handled: boolean,
    kind: GraphViewportNavigationKind
  ): GraphViewportNavigationResult<Bounds> => ({
    handled,
    kind,
    bounds: cloneBounds(bounds)
  });

  return {
    getBounds: () => cloneBounds(bounds),
    setBounds: (nextBounds) => {
      bounds = cloneBounds(nextBounds);
    },
    getViewport: () => cloneViewport(viewport),
    setViewport: (nextViewport) => {
      viewport = cloneViewport(nextViewport);
    },
    getPointerCount: () => pointers.size,
    handleWheel: (input) => {
      const gesture = classifyGraphViewportWheelGesture(input);
      if (gesture === 'ignore') return result(false, 'ignore');

      if (gesture === 'zoom') {
        const scale = resolveWheelZoomScale(input, viewport, wheelZoomInScale, wheelZoomOutScale);
        if (scale === 1) return result(false, 'ignore');
        bounds = zoomFittedGraphBoundsAroundClientPoint(bounds, input.point, viewport, scale);
        return result(true, 'wheel-zoom');
      }

      bounds = panFittedGraphBoundsByWheelDelta(
        bounds,
        { x: input.deltaX, y: input.deltaY },
        viewport
      );
      return result(true, 'wheel-pan');
    },
    handlePointerDown: (input) => {
      pointers.set(input.pointerId, clonePoint(input.point));

      if (pointers.size >= 2) {
        const [first, second] = Array.from(pointers.entries()).slice(0, 2);
        pinchSession = {
          pointerIds: [first[0], second[0]],
          startDistance: distanceBetweenPoints(first[1], second[1]),
          startCenter: midpoint(first[1], second[1]),
          startBounds: cloneBounds(bounds)
        };
        panSession = null;
        return result(true, 'pointer-pinch-start');
      }

      panSession = {
        pointerId: input.pointerId,
        startPoint: clonePoint(input.point),
        startBounds: cloneBounds(bounds)
      };
      return result(true, 'pointer-pan-start');
    },
    handlePointerMove: (input) => {
      if (pointers.has(input.pointerId)) {
        pointers.set(input.pointerId, clonePoint(input.point));
      }

      if (pinchSession) {
        const first = pointers.get(pinchSession.pointerIds[0]);
        const second = pointers.get(pinchSession.pointerIds[1]);
        if (!first || !second || pinchSession.startDistance <= 1) return result(false, 'ignore');

        const currentDistance = distanceBetweenPoints(first, second);
        const scale = clamp(
          pinchSession.startDistance / Math.max(1, currentDistance),
          minPinchScale,
          maxPinchScale
        );
        bounds = zoomFittedGraphBoundsAroundClientPoint(
          pinchSession.startBounds,
          pinchSession.startCenter,
          viewport,
          scale
        );
        return result(true, 'pointer-pinch');
      }

      if (panSession?.pointerId === input.pointerId) {
        bounds = panFittedGraphBoundsByPointerDelta(
          panSession.startBounds,
          {
            x: input.point.x - panSession.startPoint.x,
            y: input.point.y - panSession.startPoint.y
          },
          viewport
        );
        return result(true, 'pointer-pan');
      }

      return result(false, 'ignore');
    },
    handlePointerUp: (input) => {
      pointers.delete(input.pointerId);
      const endedPinch = pinchSession?.pointerIds.includes(input.pointerId) === true;
      const endedPan = panSession?.pointerId === input.pointerId;

      if (endedPinch) pinchSession = null;
      if (endedPan) panSession = null;

      if (endedPinch) return result(true, 'pointer-pinch-end');
      if (endedPan) return result(true, 'pointer-pan-end');
      return result(false, 'ignore');
    },
    resetPointers: () => {
      pointers.clear();
      panSession = null;
      pinchSession = null;
    }
  };
};

const cloneBounds = <Bounds extends GraphViewportWorldBounds2D>(bounds: Bounds): Bounds => ({
  ...bounds
});

const translateBounds = <Bounds extends GraphViewportWorldBounds2D>(
  bounds: Bounds,
  worldDx: number,
  worldDy: number
): Bounds => ({
  ...bounds,
  left: bounds.left + worldDx,
  right: bounds.right + worldDx,
  top: bounds.top + worldDy,
  bottom: bounds.bottom + worldDy
});

const clonePoint = (point: GraphClientPoint): GraphClientPoint => ({
  x: point.x,
  y: point.y
});

const cloneViewport = (viewport: GraphViewportSize): GraphViewportSize => ({
  width: viewport.width,
  height: viewport.height
});

const distanceBetweenPoints = (a: GraphClientPoint, b: GraphClientPoint): number => (
  Math.hypot(a.x - b.x, a.y - b.y)
);

const midpoint = (a: GraphClientPoint, b: GraphClientPoint): GraphClientPoint => ({
  x: (a.x + b.x) / 2,
  y: (a.y + b.y) / 2
});

const clamp = (value: number, min: number, max: number): number => (
  Math.min(Math.max(value, min), max)
);

const resolveWheelZoomScale = (
  input: GraphViewportWheelGestureInput,
  viewport: GraphViewportSize,
  zoomInScale: number,
  zoomOutScale: number
): number => {
  const deltaY = normalizeWheelZoomDeltaY(input, viewport);
  if (Math.abs(deltaY) < 1e-9) return 1;

  const steps = clamp(
    Math.abs(deltaY) / DEFAULT_WHEEL_ZOOM_REFERENCE_DELTA,
    0,
    DEFAULT_MAX_WHEEL_ZOOM_STEPS
  );
  return Math.pow(deltaY < 0 ? zoomInScale : zoomOutScale, steps);
};

const normalizeWheelZoomDeltaY = (
  input: GraphViewportWheelGestureInput,
  viewport: GraphViewportSize
): number => {
  if (input.deltaMode === 1) return input.deltaY * 16;
  if (input.deltaMode === 2) return input.deltaY * safeViewportHeight(viewport);
  return input.deltaY;
};

const positiveFinite = (value: number | undefined, fallback: number): number => (
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback
);
