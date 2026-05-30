import { describe, expect, it, vi } from 'vitest';
import type { GraphObjectNode } from '@vuegraphx/core';
import { createJsxGraphRuntime } from './runtime';

const createPointNode = (): GraphObjectNode => ({
  id: 'A',
  kind: 'command',
  type: 'point',
  payload: { objectType: 'point', position: { dimension: '2d', x: -2, y: 0 } },
  layerId: 'content'
});

describe('JsxGraphRuntime', () => {
  it('passes flat coordinate parents when creating a point', () => {
    const create = vi.fn((type: string) => ({ id: `${type}-1` }));
    const runtime = createJsxGraphRuntime({} as any, {
      board: {
        create,
        removeObject: vi.fn(),
        update: vi.fn()
      }
    });

    runtime.createObject(createPointNode(), {
      id: 'jsxgraph:A',
      objectId: 'A',
      backendId: 'jsxgraph',
      layerId: 'content',
      target: { scope: 'object', objectId: 'A', backendId: 'jsxgraph', layerId: 'content' }
    });

    expect(create).toHaveBeenCalledWith('point', [-2, 0], expect.any(Object));
  });

  it('uses explicit selected attributes instead of global JSXGraph hover highlighting', () => {
    const create = vi.fn((type: string) => ({ id: `${type}-1` }));
    const runtime = createJsxGraphRuntime({} as any, {
      board: {
        create,
        removeObject: vi.fn(),
        update: vi.fn()
      }
    });

    runtime.createObject({
      ...createPointNode(),
      meta: { selected: true },
      renderHints: { strokeColor: '#0ea5e9', strokeWidth: 2, radius: 3 }
    }, {
      id: 'jsxgraph:A',
      objectId: 'A',
      backendId: 'jsxgraph',
      layerId: 'content',
      target: { scope: 'object', objectId: 'A', backendId: 'jsxgraph', layerId: 'content' }
    });

    expect(create).toHaveBeenCalledWith('point', [-2, 0], expect.objectContaining({
      highlight: false,
      strokeColor: '#f97316',
      fillColor: '#f97316',
      strokeWidth: 4,
      size: 5
    }));
  });

  it('renders equation and solid curriculum objects as native JSXGraph curves', () => {
    const create = vi.fn((type: string) => ({ id: `${type}-${create.mock.calls.length}` }));
    const runtime = createJsxGraphRuntime({} as any, {
      board: {
        create,
        removeObject: vi.fn(),
        update: vi.fn()
      }
    });
    const handle = (objectId: string) => ({
      id: `jsxgraph:${objectId}`,
      objectId,
      backendId: 'jsxgraph',
      layerId: 'content' as const,
      target: { scope: 'object' as const, objectId, backendId: 'jsxgraph', layerId: 'content' as const }
    });

    runtime.createObject({
      id: 'eq',
      kind: 'shape',
      type: 'equation',
      payload: { expression: 'x^2 + y^2 = 1', variables: ['x', 'y'] },
      layerId: 'content'
    }, handle('eq'));
    runtime.createObject({
      id: 'cube',
      kind: 'shape',
      type: 'solid',
      payload: { family: 'cube', parameters: { size: 2 }, origin: { x: 0, y: 0, z: 0 } },
      layerId: 'content'
    }, handle('cube'));

    expect(create).toHaveBeenCalledWith('curve', [expect.any(Array), expect.any(Array)], expect.any(Object));
    expect(create.mock.calls.filter(([type]) => type === 'curve')).toHaveLength(2);
  });

  it('renders ellipse and hyperbola geometry as curves without bridging hyperbola branches', () => {
    const create = vi.fn((type: string, _args: unknown[]) => ({ id: `${type}-${create.mock.calls.length}` }));
    const runtime = createJsxGraphRuntime({} as any, {
      board: {
        create,
        removeObject: vi.fn(),
        update: vi.fn()
      }
    });
    const handle = (objectId: string) => ({
      id: `jsxgraph:${objectId}`,
      objectId,
      backendId: 'jsxgraph',
      layerId: 'content' as const,
      target: { scope: 'object' as const, objectId, backendId: 'jsxgraph', layerId: 'content' as const }
    });

    runtime.createObject({
      id: 'ell',
      kind: 'shape',
      type: 'conic',
      payload: { geometry: { kind: 'ellipse', center: { x: 0, y: 0 }, radiusX: 2, radiusY: 1 } },
      layerId: 'content'
    }, handle('ell'));
    runtime.createObject({
      id: 'hyp',
      kind: 'shape',
      type: 'conic',
      payload: { geometry: { kind: 'hyperbola', center: { x: 0, y: 0 }, radiusX: 1, radiusY: 1 } },
      layerId: 'content'
    }, handle('hyp'));

    const curves = create.mock.calls.filter(([type]) => type === 'curve');
    expect(curves).toHaveLength(3);
    expect((curves[0][1] as [number[], number[]])[0]).toHaveLength(145);
    expect((curves[1][1] as [number[], number[]])[0]).toHaveLength(96);
    expect((curves[2][1] as [number[], number[]])[0]).toHaveLength(96);
  });
});
