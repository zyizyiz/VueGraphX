import { describe, expect, it, vi } from 'vitest';
import { STANDARD_GEOMETRY_MARKER_UI, type GraphObjectNode } from '@vuegraphx/core';
import { createJsxGraphRuntime } from './runtime';

const createPointNode = (): GraphObjectNode => ({
  id: 'A',
  kind: 'command',
  type: 'point',
  payload: { objectType: 'point', position: { dimension: '2d', x: -2, y: 0 } },
  layerId: 'content'
});

describe('JsxGraphRuntime', () => {
  it('mounts a viewport grid with fixed 30px cells when enabled', () => {
    const host = document.createElement('div');
    Object.defineProperty(host, 'clientWidth', { value: 600 });
    Object.defineProperty(host, 'clientHeight', { value: 420 });
    let mountedAttributes: Record<string, unknown> = {};
    const board = {
      create: vi.fn(),
      removeObject: vi.fn(),
      update: vi.fn(),
      containerObj: host,
      getBoundingBox: () => mountedAttributes.boundingbox as [number, number, number, number]
    };
    const initBoard = vi.fn((_container: HTMLElement, attributes?: Record<string, unknown>) => {
      mountedAttributes = attributes ?? {};
      return board;
    });
    const runtime = createJsxGraphRuntime({
      JSXGraph: { initBoard }
    } as any);

    runtime.mount(host, {
      size: { width: 600, height: 420 },
      attributes: { grid: true }
    });

    expect(initBoard).toHaveBeenCalledWith(host, expect.objectContaining({
      boundingbox: [-10, 7, 10, -7]
    }));
    expect(mountedAttributes.grid).toBeUndefined();
    expect(host.style.backgroundColor).toBe('rgb(248, 250, 252)');
    expect(host.style.backgroundSize).toBe('30px 30px');
    expect(host.style.backgroundPosition).toBe('0px 0px');
  });

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

  it('maps lineDash render hints to the standard JSXGraph 4/8 dash renderer pattern', () => {
    const create = vi.fn((type: string) => ({ id: `${type}-1` }));
    const board = {
      create,
      removeObject: vi.fn(),
      update: vi.fn(),
      renderer: { dashArray: [[2, 2], [5, 5], [10, 10]] }
    };
    const runtime = createJsxGraphRuntime({} as any, { board });

    expect(board.renderer.dashArray[1]).toEqual([4, 8]);

    runtime.createObject({
      id: 'helper',
      kind: 'shape',
      type: 'segment',
      payload: { geometry: { kind: 'segment', start: { x: -1, y: 0 }, end: { x: 1, y: 0 } } },
      renderHints: { strokeColor: 'rgba(102, 102, 102, 1)', lineDash: [4, 8] },
      layerId: 'content'
    }, {
      id: 'jsxgraph:helper',
      objectId: 'helper',
      backendId: 'jsxgraph',
      layerId: 'content',
      target: { scope: 'object', objectId: 'helper', backendId: 'jsxgraph', layerId: 'content' }
    });

    expect(create).toHaveBeenCalledWith('segment', [[-1, 0], [1, 0]], expect.objectContaining({
      dash: 2,
      dashScale: false,
      strokeWidth: 1
    }));
  });

  it('keeps coordinate-system scoped JSXGraph objects fixed instead of draggable', () => {
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
      meta: { coordinateSystemId: 'coord-A' }
    }, {
      id: 'jsxgraph:A',
      objectId: 'A',
      backendId: 'jsxgraph',
      layerId: 'content',
      target: { scope: 'object', objectId: 'A', backendId: 'jsxgraph', layerId: 'content' }
    });

    expect(create).toHaveBeenCalledWith('point', [-2, 0], expect.objectContaining({
      fixed: true,
      linecap: 'butt'
    }));
  });

  it('renders coordinate-system geometry as fixed styled axes and labels', () => {
    const host = document.createElement('div');
    const create = vi.fn((type: string, _args?: unknown[], _attributes?: Record<string, unknown>) => ({ id: `${type}-${create.mock.calls.length}` }));
    const runtime = createJsxGraphRuntime({
      COORDS_BY_USER: 'user',
      Coords: class {
        public scrCoords: number[];
        public usrCoords: number[];
        public constructor(_mode: unknown, point: number[]) {
          this.usrCoords = [1, point[0], point[1]];
          this.scrCoords = [1, point[0] * 10, -point[1] * 10];
        }
      }
    } as any, {
      board: {
        create,
        removeObject: vi.fn(),
        update: vi.fn(),
        containerObj: host
      }
    });

    runtime.createObject({
      id: 'coord',
      kind: 'shape',
      type: 'coordinate-system',
      payload: {
        geometry: {
          kind: 'coordinate-system',
          segments: [
            [{ x: -3, y: 0 }, { x: 3, y: 0 }],
            [{ x: 0, y: -3 }, { x: 0, y: 3 }]
          ],
          xAxis: [{ x: -3, y: 0 }, { x: 3, y: 0 }],
          yAxis: [{ x: 0, y: -3 }, { x: 0, y: 3 }],
          labels: [
            { text: 'O', axis: 'plain', role: 'origin', point: { x: 0, y: 0 } },
            { text: 'x', axis: 'plain', role: 'x-axis', point: { x: 3, y: 0 } }
          ]
        }
      },
      meta: { coordinateSystemId: 'coord' },
      layerId: 'content'
    }, {
      id: 'jsxgraph:coord',
      objectId: 'coord',
      backendId: 'jsxgraph',
      layerId: 'content',
      target: { scope: 'object', objectId: 'coord', backendId: 'jsxgraph', layerId: 'content' }
    });

    expect(create.mock.calls.filter(([type]) => type === 'arrow')).toHaveLength(2);
    expect(create).toHaveBeenNthCalledWith(1, 'arrow', [[-3, 0], [3, 0]], expect.objectContaining({
      fixed: true,
      strokeColor: '#666666',
      strokeWidth: 1.2,
      withLabel: false
    }));
    const labels = Array.from(host.querySelectorAll('[data-vuegraphx-coordinate-label="true"]')) as HTMLElement[];
    expect(labels.map((label) => label.textContent)).toEqual(['O', 'x']);
    expect(labels[0].style.left).toBe('-12px');
    expect(labels[0].style.top).toBe('0px');
    expect(labels[1].style.left).toBe('24px');
  });

  it('keeps coordinate label overlays synced when the JSXGraph viewport changes', () => {
    const host = document.createElement('div');
    Object.defineProperty(host, 'clientWidth', { value: 100 });
    Object.defineProperty(host, 'clientHeight', { value: 100 });
    let bounds: [number, number, number, number] = [-5, 5, 5, -5];
    const listeners = new Map<string, () => void>();
    const create = vi.fn((type: string) => ({ id: `${type}-${create.mock.calls.length}` }));
    const runtime = createJsxGraphRuntime({} as any, {
      board: {
        create,
        removeObject: vi.fn(),
        update: vi.fn(),
        containerObj: host,
        getBoundingBox: () => bounds,
        on: vi.fn((eventName: string, handler: () => void) => {
          listeners.set(eventName, handler);
        }),
        off: vi.fn()
      }
    });

    runtime.createObject({
      id: 'coord',
      kind: 'shape',
      type: 'coordinate-system',
      payload: {
        geometry: {
          kind: 'coordinate-system',
          xAxis: [{ x: -1, y: 0 }, { x: 1, y: 0 }],
          yAxis: [{ x: 0, y: -1 }, { x: 0, y: 1 }],
          labels: [
            { text: 'O', axis: 'plain', role: 'origin', point: { x: 2, y: 0 } }
          ]
        }
      },
      layerId: 'content'
    }, {
      id: 'jsxgraph:coord',
      objectId: 'coord',
      backendId: 'jsxgraph',
      layerId: 'content',
      target: { scope: 'object', objectId: 'coord', backendId: 'jsxgraph', layerId: 'content' }
    });

    const label = host.querySelector('[data-vuegraphx-coordinate-label="true"]') as HTMLElement | null;
    expect(label?.style.left).toBe('58px');
    expect(label?.style.top).toBe('50px');

    bounds = [-10, 10, 10, -10];
    listeners.get('boundingbox')?.();

    expect(label?.style.left).toBe('48px');
    expect(label?.style.top).toBe('50px');

    runtime.updateObject({
      id: 'jsxgraph:coord',
      objectId: 'coord',
      backendId: 'jsxgraph',
      layerId: 'content',
      target: { scope: 'object', objectId: 'coord', backendId: 'jsxgraph', layerId: 'content' }
    }, {
      payload: {
        geometry: {
          kind: 'coordinate-system',
          xAxis: [{ x: 1, y: -1 }, { x: 3, y: -1 }],
          yAxis: [{ x: 2, y: -2 }, { x: 2, y: 0 }],
          labels: [
            { text: 'O', axis: 'plain', role: 'origin', point: { x: 2, y: -1 } }
          ]
        }
      }
    });

    const movedLabel = host.querySelector('[data-vuegraphx-coordinate-label="true"]') as HTMLElement | null;
    expect(movedLabel?.style.left).toBe('48px');
    expect(movedLabel?.style.top).toBe('55px');
  });


  it('picks coordinate systems from the whole coordinate region', () => {
    const runtime = createJsxGraphRuntime({} as any, {
      board: {
        create: vi.fn((type: string) => ({ id: `${type}-1` })),
        removeObject: vi.fn(),
        update: vi.fn()
      }
    });

    runtime.createObject({
      id: 'coord',
      kind: 'shape',
      type: 'coordinate-system',
      payload: {
        geometry: {
          kind: 'coordinate-system',
          border: [{ x: -10, y: -10 }, { x: 10, y: -10 }, { x: 10, y: 10 }, { x: -10, y: 10 }],
          segments: [
            [{ x: -10, y: 0 }, { x: 10, y: 0 }],
            [{ x: 0, y: -10 }, { x: 0, y: 10 }]
          ]
        }
      },
      layerId: 'content'
    }, {
      id: 'jsxgraph:coord',
      objectId: 'coord',
      backendId: 'jsxgraph',
      layerId: 'content',
      target: { scope: 'object', objectId: 'coord', backendId: 'jsxgraph', layerId: 'content' }
    });

    expect(runtime.pick({ x: 5, y: 5 }, { tolerancePx: 0.1 })?.target.objectId).toBe('coord');
    expect(runtime.pick({ x: 12, y: 12 }, { tolerancePx: 0.1 })).toBeNull();
  });

  it('prioritizes objects over coordinate-system fallback hits', () => {
    const runtime = createJsxGraphRuntime({} as any, {
      board: {
        create: vi.fn((type: string) => ({ id: `${type}-1` })),
        removeObject: vi.fn(),
        update: vi.fn()
      }
    });

    runtime.createObject({
      id: 'inside-function',
      kind: 'shape',
      type: 'function',
      payload: { geometry: { kind: 'polyline', points: [{ x: -8, y: 5 }, { x: 8, y: 5 }] } },
      layerId: 'content'
    }, {
      id: 'jsxgraph:inside-function',
      objectId: 'inside-function',
      backendId: 'jsxgraph',
      layerId: 'content',
      target: { scope: 'object', objectId: 'inside-function', backendId: 'jsxgraph', layerId: 'content' }
    });
    runtime.createObject({
      id: 'axis-function',
      kind: 'shape',
      type: 'function',
      payload: { geometry: { kind: 'polyline', points: [{ x: -8, y: 0 }, { x: 8, y: 0 }] } },
      layerId: 'content'
    }, {
      id: 'jsxgraph:axis-function',
      objectId: 'axis-function',
      backendId: 'jsxgraph',
      layerId: 'content',
      target: { scope: 'object', objectId: 'axis-function', backendId: 'jsxgraph', layerId: 'content' }
    });
    runtime.createObject({
      id: 'coord',
      kind: 'shape',
      type: 'coordinate-system',
      payload: {
        geometry: {
          kind: 'coordinate-system',
          border: [{ x: -10, y: -10 }, { x: 10, y: -10 }, { x: 10, y: 10 }, { x: -10, y: 10 }],
          segments: [
            [{ x: -10, y: 0 }, { x: 10, y: 0 }],
            [{ x: 0, y: -10 }, { x: 0, y: 10 }]
          ]
        }
      },
      layerId: 'content'
    }, {
      id: 'jsxgraph:coord',
      objectId: 'coord',
      backendId: 'jsxgraph',
      layerId: 'content',
      target: { scope: 'object', objectId: 'coord', backendId: 'jsxgraph', layerId: 'content' }
    });

    expect(runtime.pick({ x: 4, y: 5 }, { tolerancePx: 0.1 })?.target.objectId).toBe('inside-function');
    expect(runtime.pick({ x: 4, y: 0 }, { tolerancePx: 0.1 })?.target.objectId).toBe('axis-function');
    expect(runtime.pick({ x: 5, y: 4 }, { tolerancePx: 0.1 })?.target.objectId).toBe('coord');
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
      size: 0.5
    }));
  });

  it('maps point-specific style hints to JSXGraph point attributes', () => {
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
      renderHints: {
        strokeColor: '#0ea5e9',
        pointFillColor: '#FFFFFF',
        pointStrokeColor: '#333333',
        pointStrokeWidth: 1.5,
        radius: 4
      }
    }, {
      id: 'jsxgraph:A',
      objectId: 'A',
      backendId: 'jsxgraph',
      layerId: 'content',
      target: { scope: 'object', objectId: 'A', backendId: 'jsxgraph', layerId: 'content' }
    });

    expect(create).toHaveBeenCalledWith('point', [-2, 0], expect.objectContaining({
      strokeColor: '#333333',
      fillColor: '#FFFFFF',
      fillOpacity: 1,
      highlightStrokeColor: '#333333',
      highlightFillColor: '#FFFFFF',
      highlightFillOpacity: 1,
      strokeWidth: 1.5,
      face: 'o',
      sizeUnit: 'screen',
      zoom: false,
      size: STANDARD_GEOMETRY_MARKER_UI.pointRadiusPx - 1 - STANDARD_GEOMETRY_MARKER_UI.pointStrokeWidthPx / 2,
      label: expect.objectContaining({
        strokeColor: 'rgba(0, 0, 0, 0.85)',
        fontSize: 14,
        fontUnit: 'px',
        anchorX: 'left',
        anchorY: 'top',
        offset: [5, -10],
        cssStyle: 'font-family:PingFang SC, Microsoft YaHei, Arial, sans-serif;font-weight:500;line-height:14px;'
      })
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

  it('wraps JSXGraph text with annotation visual style hints', () => {
    const create = vi.fn((type: string, _args?: unknown[], _attributes?: Record<string, unknown>) => ({ id: `${type}-${create.mock.calls.length}` }));
    const container = document.createElement('div');
    Object.defineProperty(container, 'clientWidth', { value: 400 });
    Object.defineProperty(container, 'clientHeight', { value: 400 });
    const runtime = createJsxGraphRuntime({} as any, {
      board: {
        create,
        removeObject: vi.fn(),
        update: vi.fn(),
        getBoundingBox: () => [-10, 10, 10, -10],
        containerObj: container
      }
    });

    runtime.createObject({
      id: 'plain-style',
      kind: 'overlay',
      type: 'text',
      payload: {
        point: { x: 1, y: 2 },
        text: 'P'
      },
      renderHints: {
        textColor: '#FF3333',
        fontSize: 14,
        fontFamily: 'PingFang SC, Microsoft YaHei, Arial, sans-serif',
        fontWeight: 500,
        lineHeight: 14,
        textBackgroundColor: '#FFFFFF',
        textBorderColor: '#333333',
        textBorderWidth: 1.5,
        textBorderRadius: 3,
        textPaddingX: 4,
        textPaddingY: 2,
        textOffsetX: 6,
        textOffsetY: -6,
        textShadowColor: 'rgba(0,0,0,0.2)',
        textShadowBlur: 2
      },
      layerId: 'overlay'
    }, {
      id: 'jsxgraph:plain-style',
      objectId: 'plain-style',
      backendId: 'jsxgraph',
      layerId: 'overlay',
      target: { scope: 'object', objectId: 'plain-style', backendId: 'jsxgraph', layerId: 'overlay' }
    });

    const args = create.mock.calls[0]?.[1] as unknown[] | undefined;
    const textArg = args?.[2] as (() => string) | undefined;
    const rendered = textArg?.() ?? '';
    expect(rendered).toContain('color:#FF3333');
    expect(rendered).toContain('font-size:14px');
    expect(rendered).toContain('line-height:14px');
    expect(rendered).toContain('font-family:PingFang SC, Microsoft YaHei, Arial, sans-serif');
    expect(rendered).toContain('background:#FFFFFF');
    expect(rendered).toContain('border:1.5px solid #333333');
    expect(rendered).toContain('border-radius:3px');
    expect(rendered).toContain('padding:2px 4px');
    expect(rendered).toContain('transform:translate(6px, -6px)');
    expect(rendered).toContain('text-shadow:0px 0px 2px rgba(0,0,0,0.2)');
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
