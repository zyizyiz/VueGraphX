import { describe, expect, it } from 'vitest';
import {
  classifyGraphViewportWheelGesture,
  createGraphViewportNavigationController,
  fitGraphBoundsToViewportAspect,
  panFittedGraphBoundsByPointerDelta,
  panGraphBoundsByPointerDelta,
  panGraphBoundsByWheelDelta,
  projectGraphViewportWorldPoint,
  zoomFittedGraphBoundsAroundClientPoint,
  zoomGraphBoundsAroundClientPoint,
  type GraphViewportWorldBounds2D
} from './viewportNavigation';

const viewport = { width: 200, height: 100 };
const bounds: GraphViewportWorldBounds2D = { left: -10, right: 10, top: 10, bottom: -10 };

describe('graph viewport navigation helpers', () => {
  it('classifies wheel gestures so pixel-mode trackpad movement pans', () => {
    expect(classifyGraphViewportWheelGesture({
      ctrlKey: false,
      metaKey: false,
      deltaMode: 0,
      deltaX: 0,
      deltaY: 120
    })).toBe('pan');
    expect(classifyGraphViewportWheelGesture({
      ctrlKey: true,
      metaKey: false,
      deltaMode: 0,
      deltaX: 0,
      deltaY: 2
    })).toBe('zoom');
    expect(classifyGraphViewportWheelGesture({
      ctrlKey: false,
      metaKey: false,
      deltaMode: 0,
      deltaX: 0,
      deltaY: 8
    })).toBe('pan');
    expect(classifyGraphViewportWheelGesture({
      ctrlKey: false,
      metaKey: false,
      deltaMode: 0,
      deltaX: 40,
      deltaY: 10
    })).toBe('pan');
    expect(classifyGraphViewportWheelGesture({
      ctrlKey: false,
      metaKey: false,
      deltaMode: 1,
      deltaX: 0,
      deltaY: 3
    })).toBe('zoom');
    expect(classifyGraphViewportWheelGesture({
      ctrlKey: false,
      metaKey: false,
      deltaMode: 0,
      deltaX: 0.2,
      deltaY: 0.2
    })).toBe('ignore');
  });

  it('expands the requested graph box to the viewport aspect', () => {
    expect(fitGraphBoundsToViewportAspect(bounds, viewport)).toEqual({
      left: -20,
      right: 20,
      top: 10,
      bottom: -10
    });
    expect(fitGraphBoundsToViewportAspect(bounds, { width: 100, height: 200 })).toEqual({
      left: -10,
      right: 10,
      top: 20,
      bottom: -20
    });
  });

  it('keeps pointer drag as direct manipulation so scene content follows the pointer', () => {
    const before = projectGraphViewportWorldPoint({ x: 0, y: 0 }, bounds, viewport);
    const afterBounds = panGraphBoundsByPointerDelta(bounds, { x: 20, y: 10 }, viewport);
    const after = projectGraphViewportWorldPoint({ x: 0, y: 0 }, afterBounds, viewport);

    expect(after.x - before.x).toBeCloseTo(20);
    expect(after.y - before.y).toBeCloseTo(10);
  });

  it('maps trackpad wheel pan deltas to native browser visual scroll direction', () => {
    const before = projectGraphViewportWorldPoint({ x: 0, y: 0 }, bounds, viewport);
    const afterBounds = panGraphBoundsByWheelDelta(bounds, { x: 20, y: 10 }, viewport);
    const after = projectGraphViewportWorldPoint({ x: 0, y: 0 }, afterBounds, viewport);

    expect(after.x - before.x).toBeCloseTo(-20);
    expect(after.y - before.y).toBeCloseTo(-10);
  });

  it('zooms around the focused client point without moving that focus', () => {
    const focus = { x: 60, y: 25 };
    const worldAtFocus = {
      x: bounds.left + (focus.x / viewport.width) * (bounds.right - bounds.left),
      y: bounds.top - (focus.y / viewport.height) * (bounds.top - bounds.bottom)
    };

    const afterBounds = zoomGraphBoundsAroundClientPoint(bounds, focus, viewport, 0.5);
    expect(projectGraphViewportWorldPoint(worldAtFocus, afterBounds, viewport)).toEqual(focus);
  });

  it('keeps the stored graph box stable when viewport aspect changes repeatedly', () => {
    const wideViewport = { width: 400, height: 300 };
    const squareViewport = { width: 300, height: 300 };
    const firstWideFit = fitGraphBoundsToViewportAspect(bounds, wideViewport);

    expect(fitGraphBoundsToViewportAspect(bounds, squareViewport)).toEqual(bounds);
    expect(fitGraphBoundsToViewportAspect(bounds, wideViewport)).toEqual(firstWideFit);
  });

  it('applies pan and zoom using the fitted visible box without storing that fitted box', () => {
    const visibleBefore = fitGraphBoundsToViewportAspect(bounds, viewport);
    const panned = panFittedGraphBoundsByPointerDelta(bounds, { x: 20, y: 10 }, viewport);
    expect(fitGraphBoundsToViewportAspect(panned, viewport)).toEqual(
      panGraphBoundsByPointerDelta(visibleBefore, { x: 20, y: 10 }, viewport)
    );

    const focus = { x: 60, y: 25 };
    const worldAtFocus = {
      x: visibleBefore.left + (focus.x / viewport.width) * (visibleBefore.right - visibleBefore.left),
      y: visibleBefore.top - (focus.y / viewport.height) * (visibleBefore.top - visibleBefore.bottom)
    };
    const zoomed = zoomFittedGraphBoundsAroundClientPoint(bounds, focus, viewport, 0.5);
    const visibleAfter = fitGraphBoundsToViewportAspect(zoomed, viewport);
    expect(projectGraphViewportWorldPoint(worldAtFocus, visibleAfter, viewport)).toEqual(focus);
    expect(visibleAfter.right - visibleAfter.left).toBeCloseTo((visibleBefore.right - visibleBefore.left) * 0.5);
  });

  it('keeps small trackpad zoom deltas subtle while preserving larger wheel zoom steps', () => {
    const subtleController = createGraphViewportNavigationController({ bounds, viewport });
    const subtleBefore = subtleController.getBounds();
    const subtleZoom = subtleController.handleWheel({
      point: { x: 60, y: 25 },
      ctrlKey: true,
      metaKey: false,
      deltaMode: 0,
      deltaX: 0,
      deltaY: -1
    });
    const subtleBeforeWidth = subtleBefore.right - subtleBefore.left;
    const subtleAfterWidth = subtleZoom.bounds.right - subtleZoom.bounds.left;

    expect(subtleZoom.kind).toBe('wheel-zoom');
    expect(subtleAfterWidth).toBeLessThan(subtleBeforeWidth);
    expect(subtleAfterWidth).toBeGreaterThan(subtleBeforeWidth * 0.99);

    const wheelController = createGraphViewportNavigationController({ bounds, viewport });
    const wheelBefore = wheelController.getBounds();
    const wheelZoom = wheelController.handleWheel({
      point: { x: 60, y: 25 },
      ctrlKey: true,
      metaKey: false,
      deltaMode: 0,
      deltaX: 0,
      deltaY: -5
    });
    const wheelBeforeWidth = wheelBefore.right - wheelBefore.left;
    const wheelAfterWidth = wheelZoom.bounds.right - wheelZoom.bounds.left;

    expect(wheelZoom.kind).toBe('wheel-zoom');
    expect(wheelAfterWidth).toBeCloseTo(wheelBeforeWidth * 0.96);
  });

  it('drives wheel pan, wheel zoom, pointer pan, and pinch zoom through one controller', () => {
    const controller = createGraphViewportNavigationController({ bounds, viewport });

    const wheelPan = controller.handleWheel({
      point: { x: 100, y: 50 },
      ctrlKey: false,
      metaKey: false,
      deltaMode: 0,
      deltaX: 20,
      deltaY: 10
    });
    expect(wheelPan.kind).toBe('wheel-pan');
    expect(wheelPan.handled).toBe(true);

    const beforeZoom = controller.getBounds();
    const wheelZoom = controller.handleWheel({
      point: { x: 60, y: 25 },
      ctrlKey: true,
      metaKey: false,
      deltaMode: 0,
      deltaX: 0,
      deltaY: -1
    });
    expect(wheelZoom.kind).toBe('wheel-zoom');
    expect(wheelZoom.bounds.right - wheelZoom.bounds.left).toBeLessThan(beforeZoom.right - beforeZoom.left);

    expect(controller.getPointerCount()).toBe(0);
    controller.handlePointerDown({ pointerId: 1, point: { x: 100, y: 50 } });
    expect(controller.getPointerCount()).toBe(1);
    const pointerPan = controller.handlePointerMove({ pointerId: 1, point: { x: 120, y: 60 } });
    expect(pointerPan.kind).toBe('pointer-pan');

    controller.handlePointerDown({ pointerId: 2, point: { x: 180, y: 60 } });
    expect(controller.getPointerCount()).toBe(2);
    const beforePinch = controller.getBounds();
    const pinch = controller.handlePointerMove({ pointerId: 2, point: { x: 220, y: 60 } });
    expect(pinch.kind).toBe('pointer-pinch');
    expect(pinch.bounds.right - pinch.bounds.left).toBeLessThan(beforePinch.right - beforePinch.left);

    controller.handlePointerUp({ pointerId: 2 });
    expect(controller.getPointerCount()).toBe(1);
    controller.resetPointers();
    expect(controller.getPointerCount()).toBe(0);
  });
});
