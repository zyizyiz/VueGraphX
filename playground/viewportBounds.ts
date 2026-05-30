import type { GraphClientPoint } from '@vuegraphx/core';
import type { CanvasWorldBounds } from '@vuegraphx/backend-canvas2d';

interface ViewportSize {
  width: number;
  height: number;
}

const safeViewportWidth = (viewport: ViewportSize) => Math.max(1, viewport.width);
const safeViewportHeight = (viewport: ViewportSize) => Math.max(1, viewport.height);

export const fitBoundsToViewportAspect = (
  bounds: CanvasWorldBounds,
  viewport: ViewportSize
): CanvasWorldBounds => {
  const worldWidth = bounds.right - bounds.left;
  const worldHeight = bounds.top - bounds.bottom;
  if (worldWidth <= 0 || worldHeight <= 0 || viewport.width <= 0 || viewport.height <= 0) {
    return { ...bounds };
  }

  const viewportAspect = viewport.width / viewport.height;
  if (!Number.isFinite(viewportAspect) || viewportAspect <= 0) return { ...bounds };

  const worldAspect = worldWidth / worldHeight;
  if (Math.abs(worldAspect - viewportAspect) < 1e-9) return { ...bounds };

  const centerX = (bounds.left + bounds.right) / 2;
  const centerY = (bounds.top + bounds.bottom) / 2;
  if (viewportAspect > worldAspect) {
    const halfWidth = (worldHeight * viewportAspect) / 2;
    return {
      left: centerX - halfWidth,
      right: centerX + halfWidth,
      top: bounds.top,
      bottom: bounds.bottom
    };
  }

  const halfHeight = (worldWidth / viewportAspect) / 2;
  return {
    left: bounds.left,
    right: bounds.right,
    top: centerY + halfHeight,
    bottom: centerY - halfHeight
  };
};

const translateBounds = (
  bounds: CanvasWorldBounds,
  worldDx: number,
  worldDy: number
): CanvasWorldBounds => ({
  left: bounds.left + worldDx,
  right: bounds.right + worldDx,
  top: bounds.top + worldDy,
  bottom: bounds.bottom + worldDy
});

export const unprojectPointFromBounds = (
  point: GraphClientPoint,
  bounds: CanvasWorldBounds,
  viewport: ViewportSize
) => ({
  x: bounds.left + (point.x / safeViewportWidth(viewport)) * (bounds.right - bounds.left),
  y: bounds.top - (point.y / safeViewportHeight(viewport)) * (bounds.top - bounds.bottom)
});

// Pointer drag is direct manipulation: the rendered scene should follow the pointer.
export const panBoundsByPointerDelta = (
  bounds: CanvasWorldBounds,
  delta: GraphClientPoint,
  viewport: ViewportSize
): CanvasWorldBounds => {
  const worldDx = -(delta.x / safeViewportWidth(viewport)) * (bounds.right - bounds.left);
  const worldDy = (delta.y / safeViewportHeight(viewport)) * (bounds.top - bounds.bottom);
  return translateBounds(bounds, worldDx, worldDy);
};

// WheelEvent deltas are scroll deltas: positive deltas move page content left/up in native scrolling.
export const panBoundsByWheelDelta = (
  bounds: CanvasWorldBounds,
  delta: GraphClientPoint,
  viewport: ViewportSize
): CanvasWorldBounds => {
  const worldDx = (delta.x / safeViewportWidth(viewport)) * (bounds.right - bounds.left);
  const worldDy = -(delta.y / safeViewportHeight(viewport)) * (bounds.top - bounds.bottom);
  return translateBounds(bounds, worldDx, worldDy);
};

export const panFittedBoundsByPointerDelta = (
  bounds: CanvasWorldBounds,
  delta: GraphClientPoint,
  viewport: ViewportSize
): CanvasWorldBounds => {
  const visible = fitBoundsToViewportAspect(bounds, viewport);
  const pannedVisible = panBoundsByPointerDelta(visible, delta, viewport);
  return translateBounds(bounds, pannedVisible.left - visible.left, pannedVisible.top - visible.top);
};

export const panFittedBoundsByWheelDelta = (
  bounds: CanvasWorldBounds,
  delta: GraphClientPoint,
  viewport: ViewportSize
): CanvasWorldBounds => {
  const visible = fitBoundsToViewportAspect(bounds, viewport);
  const pannedVisible = panBoundsByWheelDelta(visible, delta, viewport);
  return translateBounds(bounds, pannedVisible.left - visible.left, pannedVisible.top - visible.top);
};

export const zoomBoundsAroundClientPoint = (
  bounds: CanvasWorldBounds,
  clientPoint: GraphClientPoint,
  viewport: ViewportSize,
  scale: number
): CanvasWorldBounds => {
  const focus = unprojectPointFromBounds(clientPoint, bounds, viewport);
  return {
    left: focus.x + (bounds.left - focus.x) * scale,
    right: focus.x + (bounds.right - focus.x) * scale,
    top: focus.y + (bounds.top - focus.y) * scale,
    bottom: focus.y + (bounds.bottom - focus.y) * scale
  };
};

export const zoomFittedBoundsAroundClientPoint = (
  bounds: CanvasWorldBounds,
  clientPoint: GraphClientPoint,
  viewport: ViewportSize,
  scale: number
): CanvasWorldBounds => {
  const visible = fitBoundsToViewportAspect(bounds, viewport);
  const focus = unprojectPointFromBounds(clientPoint, visible, viewport);
  return {
    left: focus.x + (bounds.left - focus.x) * scale,
    right: focus.x + (bounds.right - focus.x) * scale,
    top: focus.y + (bounds.top - focus.y) * scale,
    bottom: focus.y + (bounds.bottom - focus.y) * scale
  };
};
