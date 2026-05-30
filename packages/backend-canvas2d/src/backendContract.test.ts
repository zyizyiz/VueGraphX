import { describe, expect, it, vi } from 'vitest';
import {
  GRAPH_MATH_INTERACTION_CAPABILITY_PATHS,
  GraphInteractionRouter,
  createParityFixtureNode,
  curriculumParityRows,
  validateGraphBackendMathInteractionCapabilities
} from '@vuegraphx/core';
import type {
  GraphClientPoint,
  GraphObjectNode,
  GraphOperationDiagnostic,
  GraphOperationResult,
  GraphPickOptions,
  GraphPickResult,
  GraphRenderBackend,
  GraphRenderHandle
} from '@vuegraphx/core';
import type { BabylonRuntimePort } from '@vuegraphx/backend-babylon';
import type { JsxGraphRuntimePort } from '@vuegraphx/backend-jsxgraph';
import { createBabylonGraphBackend } from '@vuegraphx/backend-babylon';
import { createJsxGraphBackend, createJsxGraphRuntime } from '@vuegraphx/backend-jsxgraph';
import { createCanvas2DGraphBackend, createMemoryGraphBackend } from './index';

const pointNode: GraphObjectNode = {
  id: 'A',
  kind: 'shape',
  type: 'point',
  payload: { point: { x: 10, y: 10 } },
  layerId: 'content'
};

const solidNode: GraphObjectNode = createParityFixtureNode({ id: 'cube', type: 'solid', rowIds: ['solid.metrics'] });

type CanvasDrawOp =
  | { name: 'lineTo'; x: number; y: number }
  | { name: 'arc'; x: number; y: number; radius: number; fillStyle: string; strokeStyle: string }
  | { name: 'stroke'; strokeStyle: string; lineWidth: number; lineToCount: number }
  | { name: 'fill'; fillStyle: string }
  | { name: 'fillText' | 'strokeText'; text: string; x: number; y: number; font: string; fillStyle?: string; strokeStyle?: string }
  | { name: string; [key: string]: unknown };

const createRecordingCanvasContext = (): { context: CanvasRenderingContext2D; ops: CanvasDrawOp[] } => {
  const ops: CanvasDrawOp[] = [];
  const stack: Array<Pick<CanvasRenderingContext2D, 'strokeStyle' | 'fillStyle' | 'lineWidth' | 'font' | 'globalAlpha'>> = [];
  let lineToCount = 0;
  const context: any = {
    strokeStyle: '#000000',
    fillStyle: '#000000',
    lineWidth: 1,
    lineCap: 'butt',
    lineJoin: 'miter',
    font: '10px sans-serif',
    globalAlpha: 1,
    save() {
      stack.push({
        strokeStyle: this.strokeStyle,
        fillStyle: this.fillStyle,
        lineWidth: this.lineWidth,
        font: this.font,
        globalAlpha: this.globalAlpha
      });
    },
    restore() {
      const entry = stack.pop();
      if (!entry) return;
      this.strokeStyle = entry.strokeStyle;
      this.fillStyle = entry.fillStyle;
      this.lineWidth = entry.lineWidth;
      this.font = entry.font;
      this.globalAlpha = entry.globalAlpha;
    },
    beginPath() {
      lineToCount = 0;
      ops.push({ name: 'beginPath' });
    },
    moveTo(x: number, y: number) {
      ops.push({ name: 'moveTo', x, y });
    },
    lineTo(x: number, y: number) {
      lineToCount += 1;
      ops.push({ name: 'lineTo', x, y });
    },
    closePath() {
      ops.push({ name: 'closePath' });
    },
    arc(x: number, y: number, radius: number) {
      ops.push({ name: 'arc', x, y, radius, fillStyle: String(this.fillStyle), strokeStyle: String(this.strokeStyle) });
    },
    ellipse() {
      ops.push({ name: 'ellipse' });
    },
    stroke() {
      ops.push({ name: 'stroke', strokeStyle: String(this.strokeStyle), lineWidth: this.lineWidth, lineToCount });
    },
    fill() {
      ops.push({ name: 'fill', fillStyle: String(this.fillStyle) });
    },
    fillText(text: string, x: number, y: number) {
      ops.push({ name: 'fillText', text, x, y, font: String(this.font), fillStyle: String(this.fillStyle) });
    },
    strokeText(text: string, x: number, y: number) {
      ops.push({ name: 'strokeText', text, x, y, font: String(this.font), strokeStyle: String(this.strokeStyle) });
    },
    clearRect() {
      ops.push({ name: 'clearRect' });
    },
    setTransform() {},
    setLineDash() {}
  };
  return { context: context as CanvasRenderingContext2D, ops };
};

const implicitNode: GraphObjectNode = {
  id: 'implicit-circle',
  kind: 'shape',
  type: 'implicit',
  payload: { objectType: 'implicit', expression: 'x^2 + y^2 = 1', variables: ['x', 'y'] },
  layerId: 'content'
};

type BackendContractBackendId = 'memory' | 'canvas2d' | 'jsxgraph' | 'babylon';
type BackendContractStatus = 'success' | 'unsupported' | 'partial-support';

interface BackendCapabilityExpectation {
  dimensions: ReadonlyArray<'2d' | '3d'>;
  pick: boolean;
  project: boolean;
  unproject: boolean;
  drag: boolean;
  layers: boolean;
}

interface DeclarativeBackendContractFixture {
  id: string;
  node: GraphObjectNode;
  expectations: Record<BackendContractBackendId, BackendContractStatus>;
}

const backendCapabilityExpectations: Record<BackendContractBackendId, BackendCapabilityExpectation> = {
  memory: { dimensions: ['2d'], pick: true, project: true, unproject: true, drag: true, layers: true },
  canvas2d: { dimensions: ['2d'], pick: true, project: true, unproject: true, drag: true, layers: true },
  jsxgraph: { dimensions: ['2d', '3d'], pick: true, project: true, unproject: true, drag: true, layers: true },
  babylon: { dimensions: ['2d', '3d'], pick: true, project: true, unproject: true, drag: true, layers: true }
};

const backendContractFixtures: readonly DeclarativeBackendContractFixture[] = [
  {
    id: 'point-2d',
    node: pointNode,
    expectations: {
      memory: 'success',
      canvas2d: 'success',
      jsxgraph: 'success',
      babylon: 'success'
    }
  },
  {
    id: 'solid-3d',
    node: solidNode,
    expectations: {
      memory: 'success',
      canvas2d: 'success',
      jsxgraph: 'success',
      babylon: 'success'
    }
  },
  {
    id: 'implicit-curve',
    node: implicitNode,
    expectations: {
      memory: 'success',
      canvas2d: 'unsupported',
      jsxgraph: 'unsupported',
      babylon: 'unsupported'
    }
  }
] as const;

const createBackendContractDiagnostic = (
  backend: GraphRenderBackend,
  fixture: DeclarativeBackendContractFixture,
  status: Exclude<BackendContractStatus, 'success'>
): GraphOperationDiagnostic => {
  const code = status === 'partial-support'
    ? 'backend.partial-support'
    : 'backend.unsupported-object';
  return {
    code,
    message: `Backend ${backend.id} reports ${status} for object ${fixture.node.id} (${fixture.node.type}).`,
    severity: status === 'partial-support' ? 'warning' : 'error',
    target: {
      scope: 'object',
      objectId: fixture.node.id,
      backendId: backend.id,
      layerId: fixture.node.layerId ?? 'content'
    }
  };
};

const getBackendContractStatus = (
  backend: GraphRenderBackend,
  fixture: DeclarativeBackendContractFixture
): BackendContractStatus => fixture.expectations[backend.id as BackendContractBackendId] ?? 'unsupported';

const runDeclarativeBackendContractFixture = (
  backend: GraphRenderBackend,
  fixture: DeclarativeBackendContractFixture
): GraphOperationResult<GraphRenderHandle> => backend.create(fixture.node);

const expectCreatedHandle = (result: GraphOperationResult<GraphRenderHandle>): GraphRenderHandle => {
  expect(result.ok).toBe(true);
  expect(result.diagnostics).toEqual([]);
  expect(result.value).toBeDefined();
  return result.value!;
};

const createBackendContractMatrix = () => {
  const jsxGraphRuntime: JsxGraphRuntimePort = {
    mount: vi.fn(),
    createObject: vi.fn(),
    updateObject: vi.fn(),
    removeObject: vi.fn(),
    destroy: vi.fn()
  };
  const babylonRuntime: BabylonRuntimePort = {
    mount: vi.fn(),
    createObject: vi.fn(),
    updateObject: vi.fn(),
    createSolid: vi.fn(),
    updateSolid: vi.fn(),
    remove: vi.fn(),
    pick: vi.fn(() => null),
    destroy: vi.fn()
  };

  return {
    jsxGraphRuntime,
    babylonRuntime,
    backends: [
      createMemoryGraphBackend(),
      createCanvas2DGraphBackend(),
      createJsxGraphBackend({ runtime: jsxGraphRuntime }),
      createBabylonGraphBackend({ runtime: babylonRuntime })
    ]
  };
};

const readContractHitGroups = (node: GraphObjectNode): string[] => {
  const meta = node.meta as Record<string, unknown> | undefined;
  const hitGroups = Array.isArray(meta?.hitGroups) ? meta.hitGroups : [meta?.hitGroup];
  const groups = hitGroups.filter((group): group is string => typeof group === 'string' && group.length > 0);
  return groups.length > 0 ? groups : [node.type, node.kind];
};

const pickContractPointNode = (
  node: GraphObjectNode,
  point: GraphClientPoint,
  backendId: string,
  options: GraphPickOptions = {}
): GraphPickResult | null => {
  if (options.targetScopes && !options.targetScopes.includes('object')) return null;
  if (options.layerOrder && !options.layerOrder.includes(node.layerId ?? 'content')) return null;
  const groups = readContractHitGroups(node);
  if (options.hitGroups && !groups.some((group) => options.hitGroups?.includes(group))) return null;
  const payload = node.payload as { point?: { x: number; y: number } };
  if (!payload.point) return null;
  const distancePx = Math.hypot(payload.point.x - point.x, payload.point.y - point.y);
  if (distancePx > (options.tolerancePx ?? 8)) return null;
  const layerId = node.layerId ?? 'content';
  return {
    target: { scope: 'object', objectId: node.id, backendId, layerId },
    backendId,
    layerId,
    clientPoint: { ...point },
    worldPoint: { dimension: '2d', x: payload.point.x, y: payload.point.y },
    distancePx,
    hitGroup: groups[0],
    meta: { hitGroups: groups }
  };
};

const createJsxGraphPickingRuntime = (): JsxGraphRuntimePort => {
  const nodes = new Map<string, GraphObjectNode>();
  return {
    mount: vi.fn(),
    createObject: vi.fn((node: GraphObjectNode) => {
      nodes.set(node.id, node);
    }),
    updateObject: vi.fn((handle: GraphRenderHandle, patch) => {
      const current = nodes.get(handle.objectId);
      if (current) nodes.set(handle.objectId, { ...current, ...patch, payload: patch.payload ?? current.payload });
    }),
    removeObject: vi.fn((handle: GraphRenderHandle) => {
      nodes.delete(handle.objectId);
    }),
    pick: vi.fn((point: GraphClientPoint, options: GraphPickOptions = {}) => {
      for (const node of [...nodes.values()].reverse()) {
        const pick = pickContractPointNode(node, point, 'jsxgraph-interaction', options);
        if (pick) return pick;
      }
      return null;
    }),
    destroy: vi.fn(() => {
      nodes.clear();
    })
  };
};

describe('shared backend contract adapters', () => {
  it('declares runtime capabilities for every backend in the shared contract matrix', () => {
    const { backends } = createBackendContractMatrix();

    for (const backend of backends) {
      const expected = backendCapabilityExpectations[backend.id as BackendContractBackendId];
      expect(expected).toBeDefined();
      expect(backend.capabilities).toMatchObject({
        pick: expected.pick,
        project: expected.project,
        unproject: expected.unproject,
        drag: expected.drag,
        layers: expected.layers
      });
      expect(backend.capabilities.dimensions).toEqual(expected.dimensions);
    }
  });

  it('declares explicit active math interaction statuses for Canvas2D, JSXGraph, and Babylon', () => {
    const { backends } = createBackendContractMatrix();
    const activeBackends = backends.filter((backend) => ['canvas2d', 'jsxgraph', 'babylon'].includes(backend.id));

    expect(activeBackends.map((backend) => backend.id)).toEqual(['canvas2d', 'jsxgraph', 'babylon']);
    for (const backend of activeBackends) {
      const interactions = backend.capabilities.mathInteractions;
      expect(interactions, backend.id).toBeDefined();
      const statuses = GRAPH_MATH_INTERACTION_CAPABILITY_PATHS.map((path) => {
        if (path === 'viewport.zoom') return interactions?.viewport.zoom.status;
        if (path === 'viewport.gestureZoom') return interactions?.viewport.gestureZoom.status;
        if (path === 'viewport.pan') return interactions?.viewport.pan.status;
        if (path === 'object.pick') return interactions?.object.pick.status;
        if (path === 'object.select') return interactions?.object.select.status;
        if (path === 'object.highlight') return interactions?.object.highlight.status;
        if (path === 'project') return interactions?.project.status;
        if (path === 'unproject') return interactions?.unproject.status;
        return interactions?.diagnostics.status;
      });
      expect(statuses).toHaveLength(9);
      expect(statuses.every((status) => ['supported', 'partial-support', 'unsupported'].includes(String(status)))).toBe(true);
      expect(validateGraphBackendMathInteractionCapabilities(backend.id, backend.capabilities).map((diagnostic) => diagnostic.code)).not.toContain(
        'backend.math-interaction.missing'
      );
    }

    expect(backends.find((backend) => backend.id === 'babylon')?.capabilities.mathInteractions?.viewport.gestureZoom.status).toBe('partial-support');
  });

  it('runs create/update/pick/remove lifecycle for memory and Canvas2D backends from the same core node', () => {
    const host = document.createElement('div');
    const backends = [createMemoryGraphBackend({ id: 'memory-contract' }), createCanvas2DGraphBackend({ id: 'canvas-contract' })];

    for (const backend of backends) {
      backend.mount(host, { size: { width: 100, height: 100 } });
      const handle = expectCreatedHandle(backend.create(pointNode));
      expect(handle.target.objectId).toBe('A');
      expect(backend.pick({ x: 10, y: 10 })?.target.objectId).toBe('A');
      expect(backend.pick({ x: 10, y: 10 }, { targetScopes: ['handle'] })).toBeNull();
      backend.update(handle, { payload: { point: { x: 20, y: 20 } } });
      expect(backend.pick({ x: 20, y: 20 })?.target.objectId).toBe('A');
      backend.remove(handle);
      expect(backend.pick({ x: 20, y: 20 })).toBeNull();
      backend.destroy();
    }
  });

  it('runs the same interaction routing fixture across memory, Canvas2D, and a DOM backend adapter', () => {
    const backends = [
      createMemoryGraphBackend({ id: 'memory-interaction' }),
      createCanvas2DGraphBackend({ id: 'canvas2d-interaction' }),
      createJsxGraphBackend({ id: 'jsxgraph-interaction', runtime: createJsxGraphPickingRuntime() })
    ];

    for (const backend of backends) {
      backend.mount(document.createElement('div'), { size: { width: 100, height: 100 } });
      const createResult = backend.create({
        ...pointNode,
        id: `${backend.id}-point`,
        meta: { hitGroups: ['vertex'] }
      });
      expect(createResult.ok).toBe(true);

      const router = new GraphInteractionRouter([
        { layerId: 'overlay', interactive: false, passThrough: true }
      ]);
      router.registerBackend(backend, 'content');

      const routed = router.pickWithDiagnostics({ x: 10, y: 10 }, {
        layerOrder: ['overlay', 'content'],
        pickOptions: { hitGroups: ['vertex'] }
      });

      expect(routed.pick).toMatchObject({
        backendId: backend.id,
        hitGroup: 'vertex',
        target: {
          scope: 'object',
          objectId: `${backend.id}-point`,
          backendId: backend.id,
          layerId: 'content'
        }
      });
      expect(routed.diagnostics.map((diagnostic) => diagnostic.code)).toContain('pick.layer-pass-through');
      backend.destroy();
    }
  });

  it('runs one declarative backend contract fixture matrix across memory, Canvas2D, JSXGraph, and Babylon', () => {
    const { backends, jsxGraphRuntime, babylonRuntime } = createBackendContractMatrix();

    for (const backend of backends) {
      backend.mount(document.createElement('div'), { size: { width: 100, height: 100 } });
    }

    for (const fixture of backendContractFixtures) {
      for (const backend of backends) {
        const status = getBackendContractStatus(backend, fixture);
        const result = runDeclarativeBackendContractFixture(backend, fixture);

        if (status === 'success') {
          expect(result.ok).toBe(true);
          expect(result.value?.target).toMatchObject({
            scope: 'object',
            objectId: fixture.node.id,
            backendId: backend.id,
            layerId: fixture.node.layerId ?? 'content'
          });
          expect(JSON.stringify(result.value)).not.toMatch(/JXG|GeometryElement|Board|BABYLON|Mesh/);
          backend.remove(result.value!);
        } else {
          expect(result.ok).toBe(false);
          expect(result.diagnostics).toEqual([createBackendContractDiagnostic(backend, fixture, status)]);
        }
      }
    }

    expect(jsxGraphRuntime.createObject).toHaveBeenCalledTimes(2);
    expect(babylonRuntime.createObject).toHaveBeenCalledTimes(2);

    for (const backend of backends) {
      backend.destroy();
    }
  });

  it('accepts every curriculum parity primitive required by the first-release backend matrix', () => {
    const { backends } = createBackendContractMatrix();
    const backendsById = new Map(backends.map((backend) => [backend.id, backend]));

    for (const backend of backends) {
      backend.mount(document.createElement('div'), { size: { width: 100, height: 100 } });
    }

    for (const row of curriculumParityRows) {
      for (const backendId of row.requiredBackends) {
        const backend = backendsById.get(backendId);
        expect(backend, `${row.id}:${backendId}`).toBeDefined();
        for (const type of row.visualObjectTypes) {
          const node = createParityFixtureNode({ id: `${row.id}:${type}`, type, rowIds: [row.id] });
          const result = backend!.create(node);
          expect(result.diagnostics, `${row.id}:${backendId}:${type}`).toEqual([]);
          expect(result.ok, `${row.id}:${backendId}:${type}`).toBe(true);
          backend!.remove(result.value!);
        }
      }
    }

    for (const backend of backends) backend.destroy();
  });

  it('maps Canvas2D client points to core world coordinates when a viewport is configured', () => {
    const host = document.createElement('div');
    const backend = createCanvas2DGraphBackend({
      id: 'canvas-world',
      worldBounds: { left: -10, top: 10, right: 10, bottom: -10 }
    });

    backend.mount(host, { size: { width: 200, height: 200 } });
    backend.create({
      ...pointNode,
      payload: { point: { x: 0, y: 0 } }
    });

    expect(backend.project({ dimension: '2d', x: 0, y: 0 })).toEqual({ x: 100, y: 100 });
    expect(backend.unproject({ x: 100, y: 100 })).toEqual({ dimension: '2d', x: 0, y: 0 });
    expect(backend.pick({ x: 100, y: 100 })?.target.objectId).toBe('A');
  });

  it('can preserve unit aspect and draw standard coordinate labels on rectangular Canvas2D viewports', () => {
    const { context, ops } = createRecordingCanvasContext();
    const backend = createCanvas2DGraphBackend({
      id: 'canvas-aspect',
      canvas: document.createElement('canvas'),
      context,
      pixelRatio: 1,
      worldBounds: { left: -10, top: 10, right: 10, bottom: -10 },
      preserveAspectRatio: true,
      showAxes: true
    });

    backend.mount(document.createElement('div'), { size: { width: 400, height: 200 } });

    expect(backend.project({ dimension: '2d', x: 10, y: 0 })).toEqual({ x: 300, y: 100 });
    expect(backend.unproject({ x: 300, y: 100 })).toEqual({ dimension: '2d', x: 10, y: 0 });
    expect(ops).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'fillText', text: '5', x: 250, y: 100, fillStyle: 'rgba(0, 0, 0, 0.85)' }),
      expect.objectContaining({ name: 'fillText', text: '-5', x: 150, y: 100, fillStyle: 'rgba(0, 0, 0, 0.85)' }),
      expect.objectContaining({ name: 'fillText', text: '5', x: 190, y: 41, fillStyle: 'rgba(0, 0, 0, 0.85)' }),
      expect.objectContaining({ name: 'fillText', text: 'O', x: 188, y: 100, fillStyle: 'rgba(0, 0, 0, 0.85)' }),
      expect.objectContaining({ name: 'fillText', text: 'x', x: 394, y: 100, fillStyle: 'rgba(0, 0, 0, 0.85)' }),
      expect.objectContaining({ name: 'fillText', text: 'y', x: 190, y: 0, fillStyle: 'rgba(0, 0, 0, 0.85)' }),
      expect.objectContaining({ name: 'moveTo', x: 0.6, y: 100 }),
      expect.objectContaining({ name: 'lineTo', x: 394, y: 100 }),
      expect.objectContaining({ name: 'moveTo', x: 200, y: 200 }),
      expect.objectContaining({ name: 'lineTo', x: 200, y: 6 })
    ]));
    expect(ops.filter((op) => op.name === 'moveTo' && op.x === 210 && op.y === 100)).toEqual([]);

    backend.destroy();
  });

  it('scales Canvas2D coordinate labels, strokes, and points with viewport zoom', () => {
    const { context, ops } = createRecordingCanvasContext();
    const backend = createCanvas2DGraphBackend({
      id: 'canvas-visual-zoom',
      canvas: document.createElement('canvas'),
      context,
      pixelRatio: 1,
      worldBounds: { left: -10, top: 10, right: 10, bottom: -10 },
      preserveAspectRatio: true,
      showAxes: true
    });

    backend.mount(document.createElement('div'), { size: { width: 400, height: 200 } });
    expect(backend.create({
      ...pointNode,
      payload: { point: { x: 0, y: 0 } },
      renderHints: { radius: 4, strokeWidth: 2 }
    }).ok).toBe(true);

    ops.splice(0);
    backend.setWorldBounds({ left: -5, top: 5, right: 5, bottom: -5 });

    expect(ops).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'moveTo', x: 1.2, y: 100 }),
      expect.objectContaining({ name: 'lineTo', x: 388, y: 100 }),
      expect.objectContaining({ name: 'lineTo', x: 200, y: 12 }),
      expect.objectContaining({ name: 'fillText', text: 'x', x: 388, y: 100, font: 'bold 24px "Songti SC", "STSong", "SimSun", serif' }),
      expect.objectContaining({ name: 'fillText', text: 'y', x: 180, y: 0, font: 'bold 24px "Songti SC", "STSong", "SimSun", serif' }),
      expect.objectContaining({ name: 'arc', radius: 12 }),
      expect.objectContaining({ name: 'arc', radius: 8 })
    ]));
    expect(ops).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'stroke', strokeStyle: '#666666', lineWidth: 2.4 })
    ]));

    backend.destroy();
  });

  it('reports Canvas2D partial support for nodes without drawable geometry instead of accepting silent no-ops', () => {
    const backend = createCanvas2DGraphBackend({ id: 'canvas-drawable' });
    backend.mount(document.createElement('div'), { size: { width: 200, height: 200 } });

    const rawFunction: GraphObjectNode = {
      id: 'raw-function',
      kind: 'shape',
      type: 'function',
      payload: { expression: 'x^2', variable: 'x' },
      layerId: 'content'
    };
    const rawConic: GraphObjectNode = {
      id: 'raw-conic',
      kind: 'shape',
      type: 'conic',
      payload: { conicKind: 'ellipse', definition: { mode: 'center-radii' } },
      layerId: 'content'
    };

    expect(backend.create(rawFunction)).toEqual({
      ok: false,
      diagnostics: [createBackendContractDiagnostic(backend, { id: 'raw-function', node: rawFunction, expectations: backendContractFixtures[0].expectations }, 'partial-support')]
    });
    expect(backend.create(rawConic)).toEqual({
      ok: false,
      diagnostics: [createBackendContractDiagnostic(backend, { id: 'raw-conic', node: rawConic, expectations: backendContractFixtures[0].expectations }, 'partial-support')]
    });
    expect(backend.create({
      ...rawFunction,
      id: 'sampled-function',
      payload: { geometry: { kind: 'polyline', points: [{ x: -1, y: 1 }, { x: 1, y: 1 }] } }
    }).ok).toBe(true);
    expect(backend.create({
      ...rawConic,
      id: 'drawable-ellipse',
      payload: { geometry: { kind: 'ellipse', center: { x: 0, y: 0 }, radiusX: 2, radiusY: 1 } }
    }).ok).toBe(true);

    backend.destroy();
  });

  it('reports Babylon partial support for proxy nodes without drawable geometry instead of drawing placeholders', () => {
    const runtime: BabylonRuntimePort = {
      mount: vi.fn(),
      createObject: vi.fn(),
      updateObject: vi.fn(),
      createSolid: vi.fn(),
      updateSolid: vi.fn(),
      remove: vi.fn(),
      pick: vi.fn(() => null),
      destroy: vi.fn()
    };
    const backend = createBabylonGraphBackend({ runtime });
    backend.mount(document.createElement('div'), { size: { width: 200, height: 200 } });

    const rawFunction: GraphObjectNode = {
      id: 'raw-function',
      kind: 'shape',
      type: 'function',
      payload: { expression: 'x^2', variable: 'x' },
      layerId: 'content'
    };
    const drawableFunction: GraphObjectNode = {
      ...rawFunction,
      id: 'sampled-function',
      payload: { geometry: { kind: 'polyline', points: [{ x: -1, y: 1 }, { x: 1, y: 1 }] } }
    };

    expect(backend.create(rawFunction)).toEqual({
      ok: false,
      diagnostics: [createBackendContractDiagnostic(backend, { id: 'raw-function', node: rawFunction, expectations: backendContractFixtures[0].expectations }, 'partial-support')]
    });
    const drawable = backend.create(drawableFunction);
    expect(drawable.ok).toBe(true);
    expect(runtime.createObject).toHaveBeenCalledTimes(1);
    backend.remove(drawable.value!);
    backend.destroy();
  });

  it('visibly strokes sampled functions and root points on the real Canvas2D drawing path', () => {
    const { context, ops } = createRecordingCanvasContext();
    const canvas = document.createElement('canvas');
    const backend = createCanvas2DGraphBackend({
      id: 'canvas-visible',
      canvas,
      context,
      pixelRatio: 1,
      worldBounds: { left: -10, top: 10, right: 10, bottom: -10 },
      showAxes: true
    });

    backend.mount(document.createElement('div'), { size: { width: 400, height: 300 } });
    const nodes: GraphObjectNode[] = [
      {
        id: 'f',
        kind: 'shape',
        type: 'function',
        payload: {
          expression: 'x^2 - 4',
          geometry: {
            kind: 'polyline',
            points: [{ x: -4, y: 12 }, { x: -3, y: 5 }, { x: -2, y: 0 }, { x: 0, y: -4 }, { x: 2, y: 0 }, { x: 3, y: 5 }, { x: 4, y: 12 }]
          }
        },
        renderHints: { strokeColor: '#0ea5e9', strokeWidth: 2 },
        layerId: 'content'
      },
      {
        id: 'A',
        kind: 'shape',
        type: 'point',
        payload: { point: { x: -2, y: 0 } },
        renderHints: { strokeColor: '#8b5cf6', radius: 4 },
        layerId: 'content'
      },
      {
        id: 'B',
        kind: 'shape',
        type: 'point',
        payload: { point: { x: 2, y: 0 } },
        renderHints: { strokeColor: '#10b981', radius: 4 },
        layerId: 'content'
      },
      {
        id: 'd',
        kind: 'overlay',
        type: 'measurement',
        payload: { point: { x: 0, y: 0 }, measurementKind: 'distance', value: 4, text: 'distance: 4' },
        renderHints: { strokeColor: '#f59e0b' },
        layerId: 'content'
      }
    ];

    for (const node of nodes) expect(backend.create(node).ok).toBe(true);

    ops.splice(0);
    backend.flush();

    const functionStroke = ops.find((op): op is Extract<CanvasDrawOp, { name: 'stroke' }> => (
      op.name === 'stroke' && op.strokeStyle === '#0ea5e9'
    ));
    expect(functionStroke?.lineToCount).toBeGreaterThanOrEqual(6);
    expect(ops).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'fill', fillStyle: '#8b5cf6' }),
      expect.objectContaining({ name: 'fill', fillStyle: '#10b981' }),
      expect.objectContaining({ name: 'fillText', text: 'distance: 4' })
    ]));

    backend.destroy();
  });

  it('renders selected Canvas2D objects with explicit highlight styling', () => {
    const { context, ops } = createRecordingCanvasContext();
    const backend = createCanvas2DGraphBackend({
      id: 'canvas-selected',
      canvas: document.createElement('canvas'),
      context,
      pixelRatio: 1,
      worldBounds: { left: -10, top: 10, right: 10, bottom: -10 },
      showAxes: false
    });

    backend.mount(document.createElement('div'), { size: { width: 200, height: 200 } });
    expect(backend.create({
      ...pointNode,
      meta: { selected: true },
      renderHints: { strokeColor: '#0ea5e9' }
    }).ok).toBe(true);
    ops.splice(0);
    backend.flush();

    expect(ops).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'fill', fillStyle: '#f97316' }),
      expect.objectContaining({ name: 'arc', strokeStyle: '#f97316' })
    ]));
    backend.destroy();
  });

  it('picks every Canvas2D geometry type that the backend visibly draws', () => {
    const host = document.createElement('div');
    const backend = createCanvas2DGraphBackend({ id: 'canvas-hit-test' });
    backend.mount(host, { size: { width: 200, height: 200 } });

    backend.create({
      id: 'line',
      kind: 'shape',
      type: 'line',
      payload: { geometry: { kind: 'line', point: { x: 0, y: 0 }, direction: { x: 10, y: 0 } } },
      layerId: 'content'
    });
    backend.create({
      id: 'ray',
      kind: 'shape',
      type: 'ray',
      payload: { geometry: { kind: 'ray', origin: { x: 0, y: 10 }, direction: { x: 10, y: 0 } } },
      layerId: 'content'
    });
    backend.create({
      id: 'polyline',
      kind: 'shape',
      type: 'function',
      payload: { geometry: { kind: 'polyline', points: [{ x: 0, y: 20 }, { x: 20, y: 20 }] } },
      layerId: 'content'
    });
    backend.create({
      id: 'angle',
      kind: 'relation',
      type: 'angle',
      payload: { points: [{ x: 20, y: 30 }, { x: 10, y: 30 }, { x: 10, y: 40 }], vertex: { x: 10, y: 30 }, radians: Math.PI / 2, degrees: 90 },
      layerId: 'content'
    });
    backend.create({
      id: 'arc',
      kind: 'shape',
      type: 'arc',
      payload: { geometry: { kind: 'arc', center: { x: 40, y: 40 }, start: { x: 50, y: 40 }, end: { x: 40, y: 50 }, radius: 10, startAngle: 0, endAngle: Math.PI / 2 } },
      layerId: 'content'
    });

    expect(backend.pick({ x: 5, y: 0 }, { tolerancePx: 1 })?.target.objectId).toBe('line');
    expect(backend.pick({ x: 5, y: 10 }, { tolerancePx: 1 })?.target.objectId).toBe('ray');
    expect(backend.pick({ x: 5, y: 10 }, { tolerancePx: 1 })?.worldPoint).toEqual({ dimension: '2d', x: 5, y: 10 });
    expect(backend.pick({ x: -5, y: 10 }, { tolerancePx: 1 })).toBeNull();
    expect(backend.pick({ x: 10, y: 20 }, { tolerancePx: 1 })?.target.objectId).toBe('polyline');
    expect(backend.pick({ x: 13.5, y: 30 }, { tolerancePx: 1 })?.target.objectId).toBe('angle');
    expect(backend.pick({ x: 50, y: 40 }, { tolerancePx: 1 })?.target.objectId).toBe('arc');
  });

  it('wraps JSXGraph as an adapter without leaking JSXGraph objects into core handles', () => {
    const runtime: JsxGraphRuntimePort = {
      mount: vi.fn(),
      createObject: vi.fn(),
      updateObject: vi.fn(),
      removeObject: vi.fn(),
      destroy: vi.fn()
    };
    const backend = createJsxGraphBackend({ runtime });
    backend.mount(document.createElement('div'));
    const handle = expectCreatedHandle(backend.create(pointNode));
    backend.update(handle, { payload: { point: { x: 11, y: 12 } } });
    backend.remove(handle);
    backend.destroy();

    expect(runtime.createObject).toHaveBeenCalledOnce();
    expect(JSON.stringify(handle)).not.toMatch(/JXG|GeometryElement|Board/);
  });

  it('renders core geometry through the JSXGraph runtime adapter instead of root renderer handlers', () => {
    const created: Array<{ type: string; args: unknown[]; attributes?: Record<string, unknown> }> = [];
    const removed: unknown[] = [];
    const board = {
      create: vi.fn((type: string, args: unknown[], attributes?: Record<string, unknown>) => {
        created.push({ type, args, attributes });
        return { id: `${type}-${created.length}`, name: typeof attributes?.name === 'string' ? attributes.name : undefined, elType: type };
      }),
      removeObject: vi.fn((element: unknown) => {
        removed.push(element);
      }),
      update: vi.fn()
    };
    const runtime = createJsxGraphRuntime({}, { board });
    const backend = createJsxGraphBackend({ runtime });
    backend.mount(document.createElement('div'));
    const line = expectCreatedHandle(backend.create({
      id: 'l',
      kind: 'shape',
      type: 'line',
      payload: { geometry: { kind: 'line', point: { x: 0, y: 0 }, direction: { x: 2, y: 0 } } },
      renderHints: { strokeColor: '#f00' },
      layerId: 'content'
    }));
    const circle = expectCreatedHandle(backend.create({
      id: 'c',
      kind: 'shape',
      type: 'circle',
      payload: { geometry: { kind: 'circle', center: { x: 0, y: 0 }, radius: 2 } },
      layerId: 'content'
    }));
    expectCreatedHandle(backend.create({
      id: 'f',
      kind: 'shape',
      type: 'function',
      payload: { expression: 'x^2', variable: 'x', domain: [-1, 1] },
      layerId: 'content'
    }));
    backend.create({
      id: 'df',
      kind: 'relation',
      type: 'derivative',
      payload: { expression: '2 * x', variable: 'x', domain: [-1, 1], sourceObjectId: 'f' },
      layerId: 'content'
    });
    backend.create({
      id: 'angle',
      kind: 'relation',
      type: 'angle',
      payload: { points: [{ x: 2, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 2 }], vertex: { x: 0, y: 0 }, radians: Math.PI / 2, degrees: 90 },
      layerId: 'content'
    });
    backend.create({
      id: 'arc',
      kind: 'shape',
      type: 'arc',
      payload: { geometry: { kind: 'arc', center: { x: 0, y: 0 }, start: { x: 2, y: 0 }, end: { x: 0, y: 2 }, radius: 2, startAngle: 0, endAngle: Math.PI / 2 } },
      layerId: 'content'
    });
    backend.create({
      id: 'semi',
      kind: 'shape',
      type: 'semicircle',
      payload: { geometry: { kind: 'semicircle', center: { x: 1, y: 0 }, start: { x: 0, y: 0 }, end: { x: 2, y: 0 }, radius: 1, startAngle: Math.PI, endAngle: 0 } },
      layerId: 'content'
    });
    backend.create({
      id: 'label',
      kind: 'overlay',
      type: 'text',
      payload: { point: { x: 1, y: 1 }, text: 'A' },
      layerId: 'overlay'
    });

    expect(created.map((entry) => entry.type)).toEqual(['line', 'circle', 'functiongraph', 'functiongraph', 'angle', 'arc', 'semicircle', 'text']);
    expect(created[0].args).toEqual([[0, 0], [2, 0]]);
    expect((created[2].args[0] as (x: number) => number)(3)).toBe(9);
    expect((created[3].args[0] as (x: number) => number)(3)).toBe(6);
    expect(created[4].args).toEqual([[2, 0], [0, 0], [0, 2]]);
    expect(created[5].args).toEqual([[0, 0], [2, 0], [0, 2]]);
    expect(created[6].args).toEqual([[0, 0], [2, 0]]);
    expect(created[7].args).toEqual([1, 1, 'A']);
    expect(backend.pick({ x: 1, y: 0 }, { tolerancePx: 0.1 })?.target.objectId).toBe('l');
    expect(backend.pick({ x: 0.7, y: 0 }, { tolerancePx: 0.1 })?.target.objectId).toBe('angle');
    backend.update(circle, { payload: { geometry: { kind: 'circle', center: { x: 1, y: 1 }, radius: 3 } } });
    expect(created[created.length - 1]?.args).toEqual([[1, 1], 3]);
    backend.remove(line);
    expect(removed.length).toBeGreaterThan(0);
  });

  it('supports Babylon solid picking through an injected runtime port', () => {
    const runtime: BabylonRuntimePort = {
      mount: vi.fn(),
      createObject: vi.fn(),
      updateObject: vi.fn(),
      createSolid: vi.fn(),
      updateSolid: vi.fn(),
      remove: vi.fn(),
      pick: vi.fn(() => ({ objectId: 'cube', componentId: 'face:front', worldPoint: { dimension: '3d' as const, x: 0, y: 0, z: 1 } })),
      destroy: vi.fn()
    };
    const backend = createBabylonGraphBackend({ runtime });
    backend.mount(document.createElement('div'));
    const handle = expectCreatedHandle(backend.create(solidNode));
    const pick = backend.pick({ x: 5, y: 5 });

    expect(handle.objectId).toBe('cube');
    expect(runtime.createObject).toHaveBeenCalledOnce();
    expect(pick?.target).toMatchObject({ scope: 'component', objectId: 'cube', componentId: 'face:front', backendId: 'babylon' });
    expect(pick?.worldPoint).toEqual({ dimension: '3d', x: 0, y: 0, z: 1 });
  });
});
