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

export declare const classifyGraphViewportWheelGesture: (
  event: GraphViewportWheelGestureInput
) => GraphViewportWheelGestureKind;

export declare const fitGraphBoundsToViewportAspect: <Bounds extends GraphViewportWorldBounds2D>(
  bounds: Bounds,
  viewport: GraphViewportSize
) => Bounds;

export declare const projectGraphViewportWorldPoint: (
  point: { x: number; y: number },
  bounds: GraphViewportWorldBounds2D,
  viewport: GraphViewportSize
) => GraphClientPoint;

export declare const unprojectGraphViewportClientPoint: (
  point: GraphClientPoint,
  bounds: GraphViewportWorldBounds2D,
  viewport: GraphViewportSize
) => { x: number; y: number };

export declare const panGraphBoundsByPointerDelta: <Bounds extends GraphViewportWorldBounds2D>(
  bounds: Bounds,
  delta: GraphClientPoint,
  viewport: GraphViewportSize
) => Bounds;

export declare const panGraphBoundsByWheelDelta: <Bounds extends GraphViewportWorldBounds2D>(
  bounds: Bounds,
  delta: GraphClientPoint,
  viewport: GraphViewportSize
) => Bounds;

export declare const panFittedGraphBoundsByPointerDelta: <Bounds extends GraphViewportWorldBounds2D>(
  bounds: Bounds,
  delta: GraphClientPoint,
  viewport: GraphViewportSize
) => Bounds;

export declare const panFittedGraphBoundsByWheelDelta: <Bounds extends GraphViewportWorldBounds2D>(
  bounds: Bounds,
  delta: GraphClientPoint,
  viewport: GraphViewportSize
) => Bounds;

export declare const zoomGraphBoundsAroundClientPoint: <Bounds extends GraphViewportWorldBounds2D>(
  bounds: Bounds,
  clientPoint: GraphClientPoint,
  viewport: GraphViewportSize,
  scale: number
) => Bounds;

export declare const zoomFittedGraphBoundsAroundClientPoint: <Bounds extends GraphViewportWorldBounds2D>(
  bounds: Bounds,
  clientPoint: GraphClientPoint,
  viewport: GraphViewportSize,
  scale: number
) => Bounds;

export declare const createGraphViewportNavigationController: <Bounds extends GraphViewportWorldBounds2D>(
  options: GraphViewportNavigationControllerOptions<Bounds>
) => GraphViewportNavigationController<Bounds>;
