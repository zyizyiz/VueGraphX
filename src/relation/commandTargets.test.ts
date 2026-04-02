import { describe, expect, it, vi } from 'vitest';
import { createCommandRelationTarget } from './commandTargets';

const createPointHandle = (x: number, y: number) => {
  const handlers = new Map<string, Set<() => void>>();
  let coords: [number, number] = [x, y];

  return {
    X: () => coords[0],
    Y: () => coords[1],
    coords: {
      get usrCoords() {
        return [1, coords[0], coords[1]];
      }
    },
    on: vi.fn((eventName: string, handler: () => void) => {
      const bucket = handlers.get(eventName) ?? new Set();
      bucket.add(handler);
      handlers.set(eventName, bucket);
    }),
    off: vi.fn((eventName: string, handler: () => void) => {
      handlers.get(eventName)?.delete(handler);
    }),
    moveTo: vi.fn(([nextX, nextY]: [number, number]) => {
      coords = [nextX, nextY];
    }),
    emit: (eventName: string) => {
      handlers.get(eventName)?.forEach((handler) => handler());
    }
  };
};

describe('createCommandRelationTarget', () => {
  it('adds an assist adapter for line-like command targets', () => {
    const point1 = createPointHandle(0, 0);
    const point2 = createPointHandle(4, 1);
    const element = {
      point1,
      point2,
      on: vi.fn(),
      off: vi.fn()
    };

    const target = createCommandRelationTarget({
      resolvedType: 'line',
      label: 'l1',
      sourceExpression: 'Line((0,0),(4,1))',
      element
    });

    expect(target?.family).toBe('line-like');
    expect(target?.assist).toBeDefined();

    const observer = {
      onStart: vi.fn(),
      onMove: vi.fn(),
      onEnd: vi.fn()
    };
    const unsubscribe = target?.assist?.subscribeDrag?.(observer);
    point1.emit('down');
    point2.emit('drag');
    point1.emit('up');

    expect(observer.onStart).toHaveBeenCalledTimes(1);
    expect(observer.onMove).toHaveBeenCalledTimes(1);
    expect(observer.onEnd).toHaveBeenCalledTimes(1);
    expect(observer.onStart).toHaveBeenLastCalledWith('point1');
    expect(observer.onMove).toHaveBeenLastCalledWith('point2');
    expect(observer.onEnd).toHaveBeenLastCalledWith('point2');

    const applied = target?.assist?.applyGeometry?.({
      family: 'line-like',
      x1: 0,
      y1: 0,
      x2: 4,
      y2: 0
    });

    expect(applied).toBe(true);
    expect(point1.moveTo).toHaveBeenCalledWith([0, 0], 0);
    expect(point2.moveTo).toHaveBeenCalledWith([4, 0], 0);

    unsubscribe?.();
  });

  it('adds point assist adapters for point targets', () => {
    const point = createPointHandle(1, 2);
    const target = createCommandRelationTarget({
      resolvedType: 'point',
      label: 'A',
      sourceExpression: 'A=(1,2)',
      element: point
    });

    expect(target?.family).toBe('point');
    expect(target?.assist).toBeDefined();

    const observer = {
      onStart: vi.fn(),
      onMove: vi.fn(),
      onEnd: vi.fn()
    };
    target?.assist?.subscribeDrag?.(observer);
    point.emit('down');
    point.emit('drag');
    point.emit('up');
    expect(observer.onStart).toHaveBeenLastCalledWith('element');
    expect(observer.onMove).toHaveBeenLastCalledWith('element');
    expect(observer.onEnd).toHaveBeenLastCalledWith('element');

    const applied = target?.assist?.applyGeometry?.({
      family: 'point',
      x: 3,
      y: 4
    });
    expect(applied).toBe(true);
    expect(point.moveTo).toHaveBeenCalledWith([3, 4], 0);
  });

  it('keeps point-handle priority over element drag events during one drag session', () => {
    const point1 = createPointHandle(0, 0);
    const point2 = createPointHandle(4, 1);
    const elementHandlers = new Map<string, Set<() => void>>();
    const element = {
      point1,
      point2,
      on: vi.fn((eventName: string, handler: () => void) => {
        const bucket = elementHandlers.get(eventName) ?? new Set();
        bucket.add(handler);
        elementHandlers.set(eventName, bucket);
      }),
      off: vi.fn((eventName: string, handler: () => void) => {
        elementHandlers.get(eventName)?.delete(handler);
      }),
      emit: (eventName: string) => {
        elementHandlers.get(eventName)?.forEach((handler) => handler());
      }
    };

    const target = createCommandRelationTarget({
      resolvedType: 'line',
      label: 'l1',
      sourceExpression: 'Line((0,0),(4,1))',
      element
    });

    const observer = {
      onStart: vi.fn(),
      onMove: vi.fn(),
      onEnd: vi.fn()
    };

    target?.assist?.subscribeDrag?.(observer);
    point1.emit('down');
    element.emit('drag');
    point1.emit('drag');

    expect(observer.onMove).toHaveBeenNthCalledWith(1, 'point1');
    expect(observer.onMove).toHaveBeenNthCalledWith(2, 'point1');
  });
});
