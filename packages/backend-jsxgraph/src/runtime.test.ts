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

  it('renders selected JSXGraph objects by doubling stroke width without changing color', () => {
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
      renderHints: { strokeColor: '#0ea5e9', strokeWidth: 3, radius: 3 }
    }, {
      id: 'jsxgraph:A',
      objectId: 'A',
      backendId: 'jsxgraph',
      layerId: 'content',
      target: { scope: 'object', objectId: 'A', backendId: 'jsxgraph', layerId: 'content' }
    });

    expect(create).toHaveBeenCalledWith('point', [-2, 0], expect.objectContaining({
      highlight: false,
      strokeColor: '#0ea5e9',
      fillColor: '#0ea5e9',
      strokeWidth: 6,
      size: 3
    }));
  });

  it('keeps selected JSXGraph highlights visible when stroke width is zero', () => {
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
      renderHints: { strokeColor: '#0ea5e9', strokeWidth: 0, radius: 3 }
    }, {
      id: 'jsxgraph:A',
      objectId: 'A',
      backendId: 'jsxgraph',
      layerId: 'content',
      target: { scope: 'object', objectId: 'A', backendId: 'jsxgraph', layerId: 'content' }
    });

    expect(create).toHaveBeenCalledWith('point', [-2, 0], expect.objectContaining({
      highlight: false,
      strokeColor: '#0ea5e9',
      strokeWidth: 2
    }));
  });

  it('renders equation and solid curriculum objects as native JSXGraph curves', () => {
    const create = vi.fn((type: string, _args?: unknown[], _attributes?: Record<string, unknown>) => ({ id: `${type}-${create.mock.calls.length}` }));
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

  it('renders LaTeX text as scaled KaTeX HTML for JSXGraph text elements', () => {
    const create = vi.fn((type: string, _args?: unknown[], _attributes?: Record<string, unknown>) => ({ id: `${type}-${create.mock.calls.length}` }));
    let boundingBox: [number, number, number, number] = [-10, 10, 10, -10];
    const container = document.createElement('div');
    Object.defineProperty(container, 'clientWidth', { value: 400 });
    Object.defineProperty(container, 'clientHeight', { value: 400 });
    const runtime = createJsxGraphRuntime({} as any, {
      board: {
        create,
        removeObject: vi.fn(),
        update: vi.fn(),
        getBoundingBox: () => boundingBox,
        containerObj: container
      }
    });

    runtime.createObject({
      id: 'formula',
      kind: 'overlay',
      type: 'text',
      payload: {
        point: { x: 1, y: 2 },
        text: '$\\sqrt{x}$',
        format: 'latex'
      },
      layerId: 'overlay'
    }, {
      id: 'jsxgraph:formula',
      objectId: 'formula',
      backendId: 'jsxgraph',
      layerId: 'overlay',
      target: { scope: 'object', objectId: 'formula', backendId: 'jsxgraph', layerId: 'overlay' }
    });

    const args = create.mock.calls[0]?.[1] as unknown[] | undefined;
    const textArg = args?.[2] as (() => string) | undefined;
    expect(typeof textArg).toBe('function');
    const rendered = textArg?.() ?? '';
    expect(rendered).toContain('class="katex"');
    expect(rendered).toContain('class="katex-html"');
    expect(rendered).toContain('<math');
    expect(rendered).toContain('font-size:14px');

    boundingBox = [-5, 5, 5, -5];
    expect(textArg?.()).toContain('font-size:28px');

    boundingBox = [-1, 1, 1, -1];
    expect(textArg?.()).toContain('font-size:140px');

    expect(create).toHaveBeenCalledWith('text', [
      1,
      2,
      expect.any(Function)
    ], expect.objectContaining({
      anchorX: 'left',
      anchorY: 'top',
      display: 'html',
      parse: false,
      needsRegularUpdate: true
    }));
  });

  it('renders plain text as scaled escaped HTML for JSXGraph text elements', () => {
    const create = vi.fn((type: string, _args?: unknown[], _attributes?: Record<string, unknown>) => ({ id: `${type}-${create.mock.calls.length}` }));
    let boundingBox: [number, number, number, number] = [-10, 10, 10, -10];
    const container = document.createElement('div');
    Object.defineProperty(container, 'clientWidth', { value: 400 });
    Object.defineProperty(container, 'clientHeight', { value: 400 });
    const runtime = createJsxGraphRuntime({} as any, {
      board: {
        create,
        removeObject: vi.fn(),
        update: vi.fn(),
        getBoundingBox: () => boundingBox,
        containerObj: container
      }
    });

    runtime.createObject({
      id: 'plain',
      kind: 'overlay',
      type: 'text',
      payload: {
        point: { x: 1, y: 2 },
        text: 'A < B'
      },
      layerId: 'overlay'
    }, {
      id: 'jsxgraph:plain',
      objectId: 'plain',
      backendId: 'jsxgraph',
      layerId: 'overlay',
      target: { scope: 'object', objectId: 'plain', backendId: 'jsxgraph', layerId: 'overlay' }
    });

    const args = create.mock.calls[0]?.[1] as unknown[] | undefined;
    const textArg = args?.[2] as (() => string) | undefined;
    expect(textArg?.()).toContain('class="vuegraphx-jsxgraph-text"');
    expect(textArg?.()).toContain('A &lt; B');
    expect(textArg?.()).toContain('font-size:14px');

    boundingBox = [-1, 1, 1, -1];
    expect(textArg?.()).toContain('font-size:140px');
    expect(create).toHaveBeenCalledWith('text', [
      1,
      2,
      expect.any(Function)
    ], expect.objectContaining({
      anchorX: 'left',
      anchorY: 'top',
      display: 'html',
      parse: false,
      needsRegularUpdate: true
    }));
  });

  it('uses the initial board bounds as text scale baseline even if zoomed before first text render', () => {
    const create = vi.fn((type: string, _args?: unknown[], _attributes?: Record<string, unknown>) => ({ id: `${type}-${create.mock.calls.length}` }));
    let boundingBox: [number, number, number, number] = [-10, 10, 10, -10];
    const container = document.createElement('div');
    Object.defineProperty(container, 'clientWidth', { value: 400 });
    Object.defineProperty(container, 'clientHeight', { value: 400 });
    const runtime = createJsxGraphRuntime({} as any, {
      board: {
        create,
        removeObject: vi.fn(),
        update: vi.fn(),
        getBoundingBox: () => boundingBox,
        containerObj: container
      }
    });

    boundingBox = [-5, 5, 5, -5];
    runtime.createObject({
      id: 'late-text',
      kind: 'overlay',
      type: 'text',
      payload: {
        point: { x: 1, y: 2 },
        text: 'created after zoom'
      },
      layerId: 'overlay'
    }, {
      id: 'jsxgraph:late-text',
      objectId: 'late-text',
      backendId: 'jsxgraph',
      layerId: 'overlay',
      target: { scope: 'object', objectId: 'late-text', backendId: 'jsxgraph', layerId: 'overlay' }
    });

    const args = create.mock.calls[0]?.[1] as unknown[] | undefined;
    const textArg = args?.[2] as (() => string) | undefined;
    expect(textArg?.()).toContain('font-size:28px');
  });
});
