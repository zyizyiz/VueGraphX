import { describe, expect, it, vi } from 'vitest';
import {
  GRAPH_MATH_INTERACTION_CAPABILITY_PATHS,
  GraphInteractionRouter,
  addSubjectCoordinateSystem,
  createParityFixtureNode,
  createSubjectCanvasState,
  createSubjectCoordinateSystemSceneNode,
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
const coordinateSystemNode: GraphObjectNode = createSubjectCoordinateSystemSceneNode(
  addSubjectCoordinateSystem(createSubjectCanvasState(), { id: 'coord-contract' }).coordinateSystem
);

type CanvasDrawOp =
  | { name: 'lineTo'; x: number; y: number }
  | { name: 'arc'; x: number; y: number; radius: number; fillStyle: string; strokeStyle: string }
  | { name: 'stroke'; strokeStyle: string; lineWidth: number; lineCap: string; lineToCount: number }
  | { name: 'fill'; fillStyle: string }
  | { name: 'fillRect'; x: number; y: number; width: number; height: number; fillStyle: string }
  | { name: 'fillText' | 'strokeText'; text: string; x: number; y: number; font: string; fillStyle?: string; strokeStyle?: string }
  | { name: 'translate' | 'scale'; x: number; y: number }
  | { name: 'setLineDash'; pattern: number[] }
  | { name: string; [key: string]: unknown };

const createRecordingCanvasContext = (): { context: CanvasRenderingContext2D; ops: CanvasDrawOp[] } => {
  const ops: CanvasDrawOp[] = [];
  const stack: Array<Pick<CanvasRenderingContext2D, 'strokeStyle' | 'fillStyle' | 'lineWidth' | 'lineCap' | 'lineJoin' | 'font' | 'globalAlpha' | 'textAlign' | 'textBaseline' | 'shadowColor' | 'shadowBlur' | 'shadowOffsetX' | 'shadowOffsetY'>> = [];
  let lineToCount = 0;
  const context: any = {
    strokeStyle: '#000000',
    fillStyle: '#000000',
    lineWidth: 1,
    lineCap: 'butt',
    lineJoin: 'miter',
    font: '10px sans-serif',
    globalAlpha: 1,
    textAlign: 'start',
    textBaseline: 'alphabetic',
    shadowColor: 'transparent',
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    save() {
      stack.push({
        strokeStyle: this.strokeStyle,
        fillStyle: this.fillStyle,
        lineWidth: this.lineWidth,
        lineCap: this.lineCap,
        lineJoin: this.lineJoin,
        font: this.font,
        globalAlpha: this.globalAlpha,
        textAlign: this.textAlign,
        textBaseline: this.textBaseline,
        shadowColor: this.shadowColor,
        shadowBlur: this.shadowBlur,
        shadowOffsetX: this.shadowOffsetX,
        shadowOffsetY: this.shadowOffsetY
      });
    },
    restore() {
      const entry = stack.pop();
      if (!entry) return;
      this.strokeStyle = entry.strokeStyle;
      this.fillStyle = entry.fillStyle;
      this.lineWidth = entry.lineWidth;
      this.lineCap = entry.lineCap;
      this.lineJoin = entry.lineJoin;
      this.font = entry.font;
      this.globalAlpha = entry.globalAlpha;
      this.textAlign = entry.textAlign;
      this.textBaseline = entry.textBaseline;
      this.shadowColor = entry.shadowColor;
      this.shadowBlur = entry.shadowBlur;
      this.shadowOffsetX = entry.shadowOffsetX;
      this.shadowOffsetY = entry.shadowOffsetY;
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
      ops.push({ name: 'stroke', strokeStyle: String(this.strokeStyle), lineWidth: this.lineWidth, lineCap: String(this.lineCap), lineToCount });
    },
    fill() {
      ops.push({ name: 'fill', fillStyle: String(this.fillStyle) });
    },
    fillRect(x: number, y: number, width: number, height: number) {
      ops.push({ name: 'fillRect', x, y, width, height, fillStyle: String(this.fillStyle) });
    },
    rect(x: number, y: number, width: number, height: number) {
      ops.push({ name: 'rect', x, y, width, height });
    },
    roundRect(x: number, y: number, width: number, height: number, radius: number) {
      ops.push({ name: 'roundRect', x, y, width, height, radius });
    },
    clip() {
      ops.push({ name: 'clip' });
    },
    fillText(text: string, x: number, y: number) {
      ops.push({ name: 'fillText', text, x, y, font: String(this.font), fillStyle: String(this.fillStyle) });
    },
    strokeText(text: string, x: number, y: number) {
      ops.push({ name: 'strokeText', text, x, y, font: String(this.font), strokeStyle: String(this.strokeStyle) });
    },
    measureText(text: string) {
      return { width: text.length * 7 };
    },
    clearRect() {
      ops.push({ name: 'clearRect' });
    },
    translate(x: number, y: number) {
      ops.push({ name: 'translate', x, y });
    },
    scale(x: number, y: number) {
      ops.push({ name: 'scale', x, y });
    },
    setTransform() {},
    setLineDash(pattern: number[]) {
      ops.push({ name: 'setLineDash', pattern: [...pattern] });
    }
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
  babylon: { dimensions: ['3d'], pick: true, project: true, unproject: true, drag: true, layers: true }
};

const backendContractFixtures: readonly DeclarativeBackendContractFixture[] = [
  {
    id: 'point-2d',
    node: pointNode,
    expectations: {
      memory: 'success',
      canvas2d: 'success',
      jsxgraph: 'success',
      babylon: 'unsupported'
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
    id: 'coordinate-system',
    node: coordinateSystemNode,
    expectations: {
      memory: 'success',
      canvas2d: 'success',
      jsxgraph: 'success',
      babylon: 'unsupported'
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

  it('runs one declarative backend contract fixture matrix across 2D adapters and Babylon 3D', () => {
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

    expect(jsxGraphRuntime.createObject).toHaveBeenCalledTimes(3);
    expect(babylonRuntime.createObject).toHaveBeenCalledTimes(1);

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



  it('derives a 30px-per-unit viewport grid when Canvas2D grid is enabled without explicit bounds', () => {
    const { context, ops } = createRecordingCanvasContext();
    const backend = createCanvas2DGraphBackend({
      id: 'canvas-grid',
      canvas: document.createElement('canvas'),
      context,
      pixelRatio: 1,
      grid: true,
      showAxes: false
    });

    backend.mount(document.createElement('div'), { size: { width: 600, height: 420 } });

    expect(backend.getWorldBounds()).toEqual({ left: -10, right: 10, top: 7, bottom: -7 });
    expect(backend.project({ dimension: '2d', x: 1, y: 1 })).toEqual({ x: 330, y: 180 });
    expect(ops).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'fillRect', x: 0, y: 0, width: 600, height: 420, fillStyle: '#F8FAFC' }),
      expect.objectContaining({ name: 'stroke', strokeStyle: 'rgba(148, 163, 184, 0.18)', lineWidth: 1 })
    ]));

    backend.destroy();
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
      expect.objectContaining({ name: 'fillText', text: 'y', x: 190, y: -7, fillStyle: 'rgba(0, 0, 0, 0.85)' }),
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
      expect.objectContaining({ name: 'fillText', text: 'y', x: 180, y: -14, font: 'bold 24px "Songti SC", "STSong", "SimSun", serif' }),
      expect.objectContaining({ name: 'arc', radius: 6 })
    ]));
    expect(ops).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'stroke', strokeStyle: '#666666', lineWidth: 2.4 })
    ]));
    expect(ops.some((op) => op.name === 'arc' && op.radius === 12)).toBe(false);
    expect(ops.some((op) => op.name === 'fill' && op.fillStyle === 'rgba(255, 255, 255, 0.96)')).toBe(false);

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

  it('rejects Babylon 2D proxy nodes at the backend boundary', () => {
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
      diagnostics: [createBackendContractDiagnostic(backend, { id: 'raw-function', node: rawFunction, expectations: backendContractFixtures[0].expectations }, 'unsupported')]
    });
    const drawable = backend.create(drawableFunction);
    expect(drawable).toEqual({
      ok: false,
      diagnostics: [createBackendContractDiagnostic(backend, { id: 'sampled-function', node: drawableFunction, expectations: backendContractFixtures[0].expectations }, 'unsupported')]
    });
    expect(runtime.createObject).not.toHaveBeenCalled();
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
    expect(ops.some((op) => op.name === 'stroke' && op.strokeStyle === 'rgba(255, 255, 255, 0.9)')).toBe(false);
    expect(ops.some((op) => op.name === 'fill' && op.fillStyle === 'rgba(255, 255, 255, 0.96)')).toBe(false);
    expect(ops.some((op) => op.name === 'stroke' && op.strokeStyle === 'rgba(255, 255, 255, 0.96)')).toBe(false);
    expect(ops.some((op) => op.name === 'strokeText' && op.text === 'distance: 4')).toBe(false);

    backend.destroy();
  });

  it('renders Canvas2D dashed paths with the standard 4/8 pattern and 1px width', () => {
    const { context, ops } = createRecordingCanvasContext();
    const backend = createCanvas2DGraphBackend({
      id: 'canvas-dash',
      canvas: document.createElement('canvas'),
      context,
      pixelRatio: 1,
      worldBounds: { left: -10, top: 10, right: 10, bottom: -10 },
      showAxes: false
    });

    backend.mount(document.createElement('div'), { size: { width: 200, height: 200 } });
    expect(backend.create({
      id: 'helper-line',
      kind: 'shape',
      type: 'function',
      payload: {
        geometry: {
          kind: 'polyline',
          points: [{ x: -4, y: 0 }, { x: 4, y: 0 }]
        }
      },
      renderHints: { strokeColor: 'rgba(102, 102, 102, 1)', lineDash: [4, 8] },
      layerId: 'content'
    }).ok).toBe(true);

    ops.splice(0);
    backend.flush();

    expect(ops).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'setLineDash', pattern: [4, 8] }),
      expect.objectContaining({ name: 'stroke', strokeStyle: 'rgba(102, 102, 102, 1)', lineWidth: 1 })
    ]));

    backend.destroy();
  });

  it('clips Canvas2D coordinate-scoped paths to their coordinate window', () => {
    const { context, ops } = createRecordingCanvasContext();
    const backend = createCanvas2DGraphBackend({
      id: 'canvas-clip-scoped',
      canvas: document.createElement('canvas'),
      context,
      pixelRatio: 1,
      worldBounds: { left: -10, top: 10, right: 10, bottom: -10 },
      showAxes: false
    });

    backend.mount(document.createElement('div'), { size: { width: 200, height: 200 } });
    expect(backend.create({
      id: 'scoped-f',
      kind: 'shape',
      type: 'function',
      payload: {
        geometry: {
          kind: 'polyline',
          points: [{ x: -4, y: 0 }, { x: 0, y: 0 }, { x: 4, y: 0 }]
        }
      },
      renderHints: {
        strokeColor: '#0ea5e9',
        lineCap: 'butt',
        clipWorldBounds: { left: -2, right: 2, top: 2, bottom: -2 }
      },
      layerId: 'content'
    }).ok).toBe(true);

    ops.splice(0);
    backend.flush();

    expect(ops).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'rect', x: 80, y: 80, width: 40, height: 40 }),
      expect.objectContaining({ name: 'clip' }),
      expect.objectContaining({ name: 'stroke', strokeStyle: '#0ea5e9', lineCap: 'butt' })
    ]));

    backend.destroy();
  });

  it('renders selected Canvas2D objects by doubling stroke width without changing color', () => {
    const { context, ops } = createRecordingCanvasContext();
    const backend = createCanvas2DGraphBackend({
      id: 'canvas-selected',
      canvas: document.createElement('canvas'),
      context,
      pixelRatio: 1,
      worldBounds: { left: -10, top: 10, bottom: -10, right: 10 },
      showAxes: false
    });

    backend.mount(document.createElement('div'), { size: { width: 200, height: 200 } });
    expect(backend.create({
      ...pointNode,
      meta: { selected: true },
      renderHints: { strokeColor: '#0ea5e9', strokeWidth: 3 }
    }).ok).toBe(true);
    ops.splice(0);
    backend.flush();

    expect(ops).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'fill', fillStyle: '#0ea5e9' }),
      expect.objectContaining({ name: 'arc', strokeStyle: '#0ea5e9' }),
      expect.objectContaining({ name: 'stroke', strokeStyle: '#0ea5e9', lineWidth: 6 })
    ]));

    backend.destroy();
  });

  it('renders Canvas2D point-specific marker fill and stroke hints', () => {
    const { context, ops } = createRecordingCanvasContext();
    const backend = createCanvas2DGraphBackend({
      id: 'canvas-point-marker-style',
      canvas: document.createElement('canvas'),
      context,
      pixelRatio: 1,
      worldBounds: { left: -10, top: 10, bottom: -10, right: 10 },
      showAxes: false
    });

    backend.mount(document.createElement('div'), { size: { width: 200, height: 200 } });
    expect(backend.create({
      ...pointNode,
      renderHints: {
        strokeColor: '#0ea5e9',
        pointFillColor: '#FFFFFF',
        pointStrokeColor: '#333333',
        pointStrokeWidth: 1.5,
        radius: 4
      }
    }).ok).toBe(true);
    ops.splice(0);
    backend.flush();

    expect(ops).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'arc', radius: 3.25, fillStyle: '#FFFFFF', strokeStyle: '#333333' }),
      expect.objectContaining({ name: 'fill', fillStyle: '#FFFFFF' }),
      expect.objectContaining({ name: 'stroke', strokeStyle: '#333333', lineWidth: 1.5 })
    ]));

    backend.destroy();
  });

  it('renders Canvas2D text visual hints for annotation labels', () => {
    const { context, ops } = createRecordingCanvasContext();
    const backend = createCanvas2DGraphBackend({
      id: 'canvas-text-annotation-style',
      canvas: document.createElement('canvas'),
      context,
      pixelRatio: 1,
      worldBounds: { left: -10, top: 10, bottom: -10, right: 10 },
      showAxes: false
    });

    backend.mount(document.createElement('div'), { size: { width: 200, height: 200 } });
    expect(backend.create({
      id: 'annotation-label',
      kind: 'overlay',
      type: 'text',
      payload: {
        objectType: 'text',
        point: { x: 0, y: 0 },
        text: 'label'
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
        textOffsetY: -6
      },
      layerId: 'overlay'
    }).ok).toBe(true);
    ops.splice(0);
    backend.flush();

    expect(ops).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'translate', x: 106, y: 94 }),
      expect.objectContaining({ name: 'roundRect', x: -4, y: -2, width: 43, height: 18, radius: 3 }),
      expect.objectContaining({ name: 'fill', fillStyle: '#FFFFFF' }),
      expect.objectContaining({ name: 'stroke', strokeStyle: '#333333', lineWidth: 1.5 }),
      expect.objectContaining({
        name: 'fillText',
        text: 'label',
        x: 0,
        y: 0,
        fillStyle: '#FF3333',
        font: '500 14px/14px PingFang SC, Microsoft YaHei, Arial, sans-serif'
      })
    ]));

    backend.destroy();
  });

  it('keeps selected Canvas2D path highlights visible when stroke width is zero', () => {
    const { context, ops } = createRecordingCanvasContext();
    const backend = createCanvas2DGraphBackend({
      id: 'canvas-selected-zero-stroke',
      canvas: document.createElement('canvas'),
      context,
      pixelRatio: 1,
      worldBounds: { left: -10, top: 10, bottom: -10, right: 10 },
      showAxes: false
    });

    backend.mount(document.createElement('div'), { size: { width: 200, height: 200 } });
    expect(backend.create({
      id: 'f',
      kind: 'shape',
      type: 'function',
      payload: { geometry: { kind: 'polyline', points: [{ x: -1, y: 0 }, { x: 1, y: 0 }] } },
      meta: { selected: true },
      renderHints: { strokeColor: '#0ea5e9', strokeWidth: 0 },
      layerId: 'content'
    }).ok).toBe(true);
    ops.splice(0);
    backend.flush();

    expect(ops).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'stroke', strokeStyle: '#0ea5e9', lineWidth: 2 })
    ]));

    backend.destroy();
  });

  it('does not render a Canvas2D coordinate-system selection border', () => {
    const { context, ops } = createRecordingCanvasContext();
    const backend = createCanvas2DGraphBackend({
      id: 'canvas-coordinate-selected-borderless',
      canvas: document.createElement('canvas'),
      context,
      pixelRatio: 1,
      worldBounds: { left: -10, top: 10, bottom: -10, right: 10 },
      showAxes: false
    });

    backend.mount(document.createElement('div'), { size: { width: 200, height: 200 } });
    expect(backend.create({
      id: 'coord-selected',
      kind: 'shape',
      type: 'coordinate-system',
      payload: {
        geometry: {
          kind: 'coordinate-system',
          border: [{ x: -6, y: -6 }, { x: 6, y: -6 }, { x: 6, y: 6 }, { x: -6, y: 6 }],
          xAxis: [{ x: -6, y: 0 }, { x: 6, y: 0 }],
          yAxis: [{ x: 0, y: -6 }, { x: 0, y: 6 }]
        }
      },
      meta: { selected: true },
      renderHints: { strokeWidth: 12 },
      layerId: 'content'
    }).ok).toBe(true);
    ops.splice(0);
    backend.flush();

    expect(ops).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'stroke', strokeStyle: '#CBD5E1' })
    ]));
    expect(ops).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'stroke', lineWidth: 24 })
    ]));

    backend.destroy();
  });

  it('renders plain Canvas2D text with opaque text color instead of translucent fill color', () => {
    const { context, ops } = createRecordingCanvasContext();
    const backend = createCanvas2DGraphBackend({
      id: 'canvas-text-readable',
      canvas: document.createElement('canvas'),
      context,
      pixelRatio: 1,
      worldBounds: { left: -10, top: 10, right: 10, bottom: -10 },
      showAxes: false
    });

    backend.mount(document.createElement('div'), { size: { width: 400, height: 300 } });
    const result = backend.create({
      id: 'plain-label',
      kind: 'overlay',
      type: 'text',
      payload: {
        objectType: 'text',
        point: { x: -6, y: 4 },
        text: 'x²-4=0 的两个实根：-2, 2'
      },
      renderHints: {
        strokeColor: '#f59e0b',
        fillColor: '#f59e0b26'
      },
      layerId: 'overlay'
    });

    expect(result.ok).toBe(true);
    ops.splice(0);
    backend.flush();

    expect(ops).toEqual(expect.arrayContaining([
      expect.objectContaining({
        name: 'fillText',
        text: 'x²-4=0 的两个实根：-2, 2',
        fillStyle: '#f59e0b',
        font: expect.stringContaining('14px')
      })
    ]));
    expect(ops.some((op) => op.name === 'fillText' && op.text === 'x²-4=0 的两个实根：-2, 2' && op.fillStyle === '#f59e0b26')).toBe(false);
    expect(ops.some((op) => op.name === 'strokeText' && op.text === 'x²-4=0 的两个实根：-2, 2')).toBe(false);

    backend.destroy();
  });

  it('draws plain Canvas2D text from a stable transformed screen anchor under zoom', () => {
    const { context, ops } = createRecordingCanvasContext();
    const canvas = document.createElement('canvas');
    const backend = createCanvas2DGraphBackend({
      id: 'canvas-plain-zoom',
      canvas,
      context,
      pixelRatio: 1,
      worldBounds: { left: -10, top: 10, right: 10, bottom: -10 },
      showAxes: false
    });

    backend.mount(document.createElement('div'), { size: { width: 400, height: 300 } });
    const result = backend.create({
      id: 'plain-zoom-label',
      kind: 'overlay',
      type: 'text',
      payload: {
        objectType: 'text',
        point: { x: 1, y: 2 },
        text: 'zoom label'
      },
      renderHints: { strokeColor: '#0f172a' },
      layerId: 'overlay'
    });

    expect(result.ok).toBe(true);
    ops.splice(0);
    backend.setWorldBounds({ left: -5, top: 5, right: 5, bottom: -5 });

    expect(ops).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'translate', x: 240, y: 90 }),
      expect.objectContaining({ name: 'scale', x: 2, y: 2 }),
      expect.objectContaining({ name: 'fillText', text: 'zoom label', x: 0, y: 0, font: expect.stringContaining('14px') })
    ]));
    expect(ops.some((op) => op.name === 'fillText' && op.text === 'zoom label' && String(op.font).includes('28px'))).toBe(false);

    ops.splice(0);
    backend.setWorldBounds({ left: -1, top: 1, right: 1, bottom: -1 });
    expect(ops).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'translate', x: 400, y: -150 }),
      expect.objectContaining({ name: 'scale', x: 10, y: 10 }),
      expect.objectContaining({ name: 'fillText', text: 'zoom label', x: 0, y: 0, font: expect.stringContaining('14px') })
    ]));

    backend.destroy();
  });

  it('renders LaTeX text through the Canvas2D DOM label layer', () => {
    const { context, ops } = createRecordingCanvasContext();
    const canvas = document.createElement('canvas');
    const host = document.createElement('div');
    const backend = createCanvas2DGraphBackend({
      id: 'canvas-latex',
      canvas,
      context,
      pixelRatio: 1,
      worldBounds: { left: -10, top: 10, right: 10, bottom: -10 },
      showAxes: false
    });

    backend.mount(host, { size: { width: 400, height: 300 } });
    const result = backend.create({
      id: 'formula',
      kind: 'overlay',
      type: 'text',
      payload: {
        objectType: 'text',
        content: '$\\frac{a}{b}$',
        anchor: { coordinates: { dimension: '2d', x: 1, y: 2 } },
        format: 'latex'
      },
      renderHints: { strokeColor: '#0f172a' },
      layerId: 'overlay'
    });

    expect(result.ok).toBe(true);
    ops.splice(0);
    backend.flush();

    const label = host.querySelector('[data-vuegraphx-canvas2d-label-layer] [data-vuegraphx-object-id="formula"]') as HTMLElement | null;
    expect(label?.innerHTML).toContain('class="katex"');
    expect(label?.innerHTML).toContain('class="katex-html"');
    expect(label?.innerHTML).toContain('<math');
    expect(label?.textContent).toContain('a');
    expect(label?.textContent).toContain('b');
    expect(label?.style.left).toBe('0px');
    expect(label?.style.top).toBe('0px');
    expect(label?.style.transform).toBe('translate3d(220px, 120px, 0) scale(1)');
    expect(label?.style.transformOrigin).toBe('0 0');
    expect(label?.style.background).toBe('transparent');
    expect(label?.style.boxShadow).toBe('none');
    expect(label?.style.textShadow).toBe('none');
    expect(label?.style.contain).toBe('layout paint style');
    expect(label?.style.font).toContain('14px');
    expect(ops.some((op) => (op.name === 'fillText' || op.name === 'strokeText') && String(op.text).includes('\\frac'))).toBe(false);

    backend.setWorldBounds({ left: -5, top: 5, right: 5, bottom: -5 });
    const zoomedLabel = host.querySelector('[data-vuegraphx-canvas2d-label-layer] [data-vuegraphx-object-id="formula"]') as HTMLElement | null;
    expect(zoomedLabel?.style.left).toBe('0px');
    expect(zoomedLabel?.style.top).toBe('0px');
    expect(zoomedLabel?.style.font).toContain('14px');
    expect(zoomedLabel?.style.transform).toBe('translate3d(240px, 90px, 0) scale(2)');

    backend.setWorldBounds({ left: -1, top: 1, right: 1, bottom: -1 });
    const deeplyZoomedLabel = host.querySelector('[data-vuegraphx-canvas2d-label-layer] [data-vuegraphx-object-id="formula"]') as HTMLElement | null;
    expect(deeplyZoomedLabel?.style.font).toContain('14px');
    expect(deeplyZoomedLabel?.style.transform).toBe('translate3d(400px, -150px, 0) scale(10)');

    const unsafe = backend.create({
      id: 'unsafe-formula',
      kind: 'overlay',
      type: 'text',
      payload: {
        objectType: 'text',
        content: '$<img src=x onerror=alert(1)>$',
        anchor: { coordinates: { dimension: '2d', x: 1, y: 1 } },
        format: 'latex'
      },
      layerId: 'overlay'
    });
    expect(unsafe.ok).toBe(true);
    backend.flush();
    const unsafeLabel = host.querySelector('[data-vuegraphx-object-id="unsafe-formula"]') as HTMLElement | null;
    expect(unsafeLabel?.querySelector('img')).toBeNull();
    expect(unsafeLabel?.querySelector('[onerror]')).toBeNull();

    backend.destroy();
  });

  it('reports Canvas2D partial support for LaTeX text when no DOM label layer can be installed', () => {
    const { context } = createRecordingCanvasContext();
    const canvas = document.createElement('canvas');
    const backend = createCanvas2DGraphBackend({
      id: 'canvas-latex-no-layer',
      canvas,
      context,
      pixelRatio: 1,
      worldBounds: { left: -10, top: 10, right: 10, bottom: -10 },
      showAxes: false
    });

    backend.mount(canvas, { size: { width: 400, height: 300 } });
    const node: GraphObjectNode = {
      id: 'formula',
      kind: 'overlay',
      type: 'text',
      payload: {
        objectType: 'text',
        content: '$\\frac{a}{b}$',
        anchor: { coordinates: { dimension: '2d', x: 0, y: 0 } },
        format: 'latex'
      },
      layerId: 'overlay'
    };

    expect(backend.create(node)).toEqual({
      ok: false,
      diagnostics: [createBackendContractDiagnostic(backend, { id: 'formula', node, expectations: backendContractFixtures[0].expectations }, 'partial-support')]
    });

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


  it('picks Canvas2D coordinate systems from the whole coordinate region', () => {
    const host = document.createElement('div');
    const backend = createCanvas2DGraphBackend({ id: 'canvas-coordinate-region-hit-test' });
    backend.mount(host, { size: { width: 200, height: 200 } });

    backend.create({
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
    });

    expect(backend.pick({ x: 5, y: 5 }, { tolerancePx: 0.1 })?.target.objectId).toBe('coord');
    expect(backend.pick({ x: 12, y: 12 }, { tolerancePx: 0.1 })).toBeNull();

    backend.destroy();
  });

  it('prioritizes Canvas2D objects over coordinate-system fallback hits', () => {
    const host = document.createElement('div');
    const backend = createCanvas2DGraphBackend({ id: 'canvas-coordinate-region-priority-test' });
    backend.mount(host, { size: { width: 200, height: 200 } });

    backend.create({
      id: 'inside-function',
      kind: 'shape',
      type: 'function',
      payload: { geometry: { kind: 'polyline', points: [{ x: -8, y: 5 }, { x: 8, y: 5 }] } },
      layerId: 'content'
    });
    backend.create({
      id: 'axis-function',
      kind: 'shape',
      type: 'function',
      payload: { geometry: { kind: 'polyline', points: [{ x: -8, y: 0 }, { x: 8, y: 0 }] } },
      layerId: 'content'
    });
    backend.create({
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
    });

    expect(backend.pick({ x: 4, y: 5 }, { tolerancePx: 0.1 })?.target.objectId).toBe('inside-function');
    expect(backend.pick({ x: 4, y: 0 }, { tolerancePx: 0.1 })?.target.objectId).toBe('axis-function');
    expect(backend.pick({ x: 5, y: 4 }, { tolerancePx: 0.1 })?.target.objectId).toBe('coord');

    backend.destroy();
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
    expect(created[7].args.slice(0, 2)).toEqual([1, 1]);
    expect(typeof created[7].args[2]).toBe('function');
    expect((created[7].args[2] as () => string)()).toContain('A');
    expect(created[7].attributes).toMatchObject({ anchorX: 'left', anchorY: 'top', display: 'html' });
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
