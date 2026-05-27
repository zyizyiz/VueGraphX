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
});
