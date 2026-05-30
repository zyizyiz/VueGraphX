import { describe, expect, it } from 'vitest';
import type { CanvasWorldBounds } from '@vuegraphx/backend-canvas2d';
import {
  fitBoundsToViewportAspect,
  panFittedBoundsByPointerDelta,
  panBoundsByPointerDelta,
  panBoundsByWheelDelta,
  zoomFittedBoundsAroundClientPoint,
  zoomBoundsAroundClientPoint
} from './viewportBounds';

const viewport = { width: 200, height: 100 };
const bounds: CanvasWorldBounds = { left: -10, right: 10, top: 10, bottom: -10 };

const project = (world: { x: number; y: number }, worldBounds: CanvasWorldBounds) => ({
  x: ((world.x - worldBounds.left) / (worldBounds.right - worldBounds.left)) * viewport.width,
  y: ((worldBounds.top - world.y) / (worldBounds.top - worldBounds.bottom)) * viewport.height
});

describe('playground viewport bounds helpers', () => {
  it('expands the requested graph box to the viewport aspect like JSXGraph keepaspectratio', () => {
    expect(fitBoundsToViewportAspect(bounds, viewport)).toEqual({
      left: -20,
      right: 20,
      top: 10,
      bottom: -10
    });
    expect(fitBoundsToViewportAspect(bounds, { width: 100, height: 200 })).toEqual({
      left: -10,
      right: 10,
      top: 20,
      bottom: -20
    });
  });

  it('keeps pointer drag as direct manipulation so scene content follows the pointer', () => {
    const before = project({ x: 0, y: 0 }, bounds);
    const afterBounds = panBoundsByPointerDelta(bounds, { x: 20, y: 10 }, viewport);
    const after = project({ x: 0, y: 0 }, afterBounds);

    expect(after.x - before.x).toBeCloseTo(20);
    expect(after.y - before.y).toBeCloseTo(10);
  });

  it('maps trackpad wheel pan deltas to native browser visual scroll direction', () => {
    const before = project({ x: 0, y: 0 }, bounds);
    const afterBounds = panBoundsByWheelDelta(bounds, { x: 20, y: 10 }, viewport);
    const after = project({ x: 0, y: 0 }, afterBounds);

    expect(after.x - before.x).toBeCloseTo(-20);
    expect(after.y - before.y).toBeCloseTo(-10);
  });

  it('zooms around the focused client point without moving that focus', () => {
    const focus = { x: 60, y: 25 };
    const worldAtFocus = {
      x: bounds.left + (focus.x / viewport.width) * (bounds.right - bounds.left),
      y: bounds.top - (focus.y / viewport.height) * (bounds.top - bounds.bottom)
    };

    const afterBounds = zoomBoundsAroundClientPoint(bounds, focus, viewport, 0.5);
    expect(project(worldAtFocus, afterBounds)).toEqual(focus);
  });

  it('keeps the stored graph box stable when viewport aspect changes repeatedly', () => {
    const wideViewport = { width: 400, height: 300 };
    const squareViewport = { width: 300, height: 300 };
    const firstWideFit = fitBoundsToViewportAspect(bounds, wideViewport);

    expect(fitBoundsToViewportAspect(bounds, squareViewport)).toEqual(bounds);
    expect(fitBoundsToViewportAspect(bounds, wideViewport)).toEqual(firstWideFit);
  });

  it('applies pan and zoom using the fitted visible box without storing that fitted box', () => {
    const visibleBefore = fitBoundsToViewportAspect(bounds, viewport);
    const panned = panFittedBoundsByPointerDelta(bounds, { x: 20, y: 10 }, viewport);
    expect(fitBoundsToViewportAspect(panned, viewport)).toEqual(
      panBoundsByPointerDelta(visibleBefore, { x: 20, y: 10 }, viewport)
    );

    const focus = { x: 60, y: 25 };
    const worldAtFocus = {
      x: visibleBefore.left + (focus.x / viewport.width) * (visibleBefore.right - visibleBefore.left),
      y: visibleBefore.top - (focus.y / viewport.height) * (visibleBefore.top - visibleBefore.bottom)
    };
    const zoomed = zoomFittedBoundsAroundClientPoint(bounds, focus, viewport, 0.5);
    const visibleAfter = fitBoundsToViewportAspect(zoomed, viewport);
    expect(project(worldAtFocus, visibleAfter)).toEqual(focus);
    expect(visibleAfter.right - visibleAfter.left).toBeCloseTo((visibleBefore.right - visibleBefore.left) * 0.5);
  });
});
