import { describe, expect, it } from 'vitest';
import { GraphSceneRuntime, compareParitySnapshots } from '@vuegraphx/core';
import { createCanvas2DGraphBackend } from '@vuegraphx/backend-canvas2d';
import { createJsxGraphBackend } from '@vuegraphx/backend-jsxgraph';
import { createOperationScopedCommands, operationToolGroups, updateOperationCoordinateSystemOrigin } from '../operationTools';
import { allDemos } from '../showcase';
import {
  getParityCapabilitySummaries,
  getParityDemoCommands,
  getPreferredBackendForMode,
  isBackendSelectableForMode,
  parityRendererBackends
} from '../parityStatus';
import {
  buildPlaygroundBabylonScene,
  buildPlaygroundCanvasScene,
  buildPlaygroundJsxGraphScene,
  buildPlaygroundLayered3DScene,
  createPlaygroundParitySnapshot,
  type PlaygroundCanvasCommand
} from './canvasScene';

const toCommands = (
  commands: readonly (string | { expr: string; options?: Record<string, unknown> })[]
): PlaygroundCanvasCommand[] => commands.map((command, index) => ({
  id: `demo-${index}`,
  expression: typeof command === 'string' ? command : command.expr,
  color: '#0ea5e9',
  options: typeof command === 'string' ? undefined : command.options
}));

const twoDParityBackends = parityRendererBackends.filter((
  backend
): backend is { id: 'jsxgraph' | 'canvas2d'; label: string } => backend.id !== 'babylon');

describe('buildPlaygroundCanvasScene', () => {
  it('keeps playground drawing geometry when routed through GraphSceneRuntime scene validation', () => {
    const result = buildPlaygroundCanvasScene([
      { id: 'fn', expression: 'sin(x)', color: '#0ea5e9' },
      { id: 'A', expression: 'A = Point(-2, 0)', color: '#f43f5e' },
      { id: 'circle', expression: 'c = Circle(A, Point(0, 0))', color: '#10b981' },
      { id: 'eq', expression: 'eq = Equation("x^2 + y^2 = 4")', color: '#8b5cf6' }
    ]);
    expect(result.diagnostics).toEqual([]);

    const runtime = new GraphSceneRuntime();
    for (const node of result.nodes) {
      const add = runtime.addObject(node);
      expect(add.diagnostics, node.id).toEqual([]);
      expect(add.ok, node.id).toBe(true);
    }

    const objects = runtime.snapshot().objects;
    expect(objects.find((node) => node.id === 'fn')?.payload).toMatchObject({
      objectType: 'function',
      geometry: { kind: 'polyline', points: expect.any(Array) }
    });
    expect(objects.find((node) => node.id === 'A')?.payload).toMatchObject({
      objectType: 'point',
      point: { x: -2, y: 0 },
      position: { dimension: '2d', x: -2, y: 0 }
    });
    expect(objects.find((node) => node.id === 'c')?.payload).toMatchObject({
      objectType: 'conic',
      geometry: { kind: 'circle' }
    });
    expect(objects.find((node) => node.id === 'eq')?.payload).toMatchObject({
      objectType: 'implicit',
      geometry: { kind: 'polyline', points: expect.any(Array) }
    });
  });

  it('builds Canvas2D nodes from legacy point and geometry commands', () => {
    const result = buildPlaygroundCanvasScene([
      { id: 'a', expression: 'A=(-2,0)', color: '#0ea5e9' },
      { id: 'b', expression: 'B=(2,0)', color: '#0ea5e9' },
      { id: 'c', expression: 'C=(0,2)', color: '#0ea5e9' },
      { id: 'segment', expression: 'Segment(A, B)', color: '#8b5cf6' },
      { id: 'circle', expression: 'circle = Circle(A, B)', color: '#f43f5e' },
      { id: 'angle', expression: 'ang = Angle(B, A, C)', color: '#10b981' },
      { id: 'arc', expression: 'arc = Arc(A, B, C)', color: '#f59e0b' },
      { id: 'sector', expression: 'sector = Sector(A, B, C)', color: '#14b8a6' },
      { id: 'semi', expression: 'semi = Semicircle(B, C)', color: '#a855f7' },
      { id: 'chain', expression: 'chain = PolygonalChain(A, B, C)', color: '#111827' },
      { id: 'regular', expression: 'regular = RegularPolygon(A, B, 4)', color: '#22c55e' },
      { id: 'circ', expression: 'circ = Circumcircle(A, B, C)', color: '#2563eb' },
      { id: 'label', expression: 'label = Text(A, "origin")', color: '#64748b' }
    ]);

    expect(result.diagnostics).toEqual([]);
    expect(result.nodes.map((node) => node.type)).toEqual(['point', 'point', 'point', 'segment', 'circle', 'angle', 'arc', 'sector', 'semicircle', 'polyline', 'polygon', 'circle', 'text']);
    expect(result.nodes.find((node) => node.id === 'circle')?.dependencies).toEqual(['A', 'B']);
    expect(result.nodes.find((node) => node.id === 'ang')?.payload).toMatchObject({
      vertex: { x: -2, y: 0 },
      degrees: 45
    });
    expect(result.nodes.find((node) => node.id === 'arc')?.payload).toMatchObject({ geometry: { kind: 'arc' } });
    expect((result.nodes.find((node) => node.id === 'regular')?.payload as any).geometry.vertices).toHaveLength(4);
    expect(result.nodes.find((node) => node.id === 'circ')?.payload).toMatchObject({ geometry: { kind: 'circle' } });
    expect(result.nodes.find((node) => node.id === 'label')?.payload).toEqual({ point: { x: -2, y: 0 }, text: 'origin' });
  });

  it('maps operation-area point and annotation style options into render hints', () => {
    const result = buildPlaygroundCanvasScene([
      {
        id: 'p',
        expression: 'P = Point(1, 1)',
        color: '#4DA6FF',
        options: {
          pointFillColor: '#FFFFFF',
          pointStrokeColor: '#333333',
          pointStrokeWidth: 1.5,
          size: 4
        }
      },
      {
        id: 'helper',
        expression: 'helper = Segment(Point(-2, 0), Point(2, 0))',
        color: '#64748B',
        options: {
          strokeWidth: 1,
          selectionStrokeScale: false,
          lineDash: [4, 8]
        }
      },
      {
        id: 'label',
        expression: 'label = Text(P, "P")',
        color: '#FF3333',
        options: {
          textColor: '#FF3333',
          fontSize: 14,
          fontFamily: 'PingFang SC, Microsoft YaHei, Arial, sans-serif',
          fontWeight: 500,
          lineHeight: 14,
          textOffsetX: 6,
          textOffsetY: -6,
          textBackgroundColor: '#FFFFFF',
          textBorderColor: '#333333',
          textBorderWidth: 1.5,
          textPaddingX: 4,
          textPaddingY: 2
        }
      }
    ]);

    expect(result.diagnostics).toEqual([]);
    expect(result.nodes.find((node) => node.id === 'P')?.renderHints).toMatchObject({
      radius: 4,
      pointFillColor: '#FFFFFF',
      pointStrokeColor: '#333333',
      pointStrokeWidth: 1.5
    });
    expect(result.nodes.find((node) => node.id === 'helper')?.renderHints).toMatchObject({
      strokeWidth: 1,
      selectionStrokeScale: false,
      lineDash: [4, 8]
    });
    expect(result.nodes.find((node) => node.id === 'label')?.renderHints).toMatchObject({
      textColor: '#FF3333',
      fontSize: 14,
      fontFamily: 'PingFang SC, Microsoft YaHei, Arial, sans-serif',
      fontWeight: 500,
      lineHeight: 14,
      textOffsetX: 6,
      textOffsetY: -6,
      textBackgroundColor: '#FFFFFF',
      textBorderColor: '#333333',
      textBorderWidth: 1.5,
      textPaddingX: 4,
      textPaddingY: 2
    });
  });

  it('uses standard marker defaults for playground points', () => {
    const result = buildPlaygroundCanvasScene([
      {
        id: 'p',
        expression: 'P = Point(1, 1)',
        color: '#4DA6FF'
      }
    ]);

    expect(result.diagnostics).toEqual([]);
    expect(result.nodes.find((node) => node.id === 'P')?.renderHints).toMatchObject({
      strokeColor: '#4DA6FF',
      radius: 4,
      pointFillColor: '#FFFFFF',
      pointStrokeColor: '#333333',
      pointStrokeWidth: 1.5
    });
  });

  it('uses standard annotation defaults for playground text', () => {
    const result = buildPlaygroundCanvasScene([
      {
        id: 'label',
        expression: 'label = Text(1, 1, "A")',
        color: '#4DA6FF'
      }
    ]);

    expect(result.diagnostics).toEqual([]);
    expect(result.nodes.find((node) => node.id === 'label')?.renderHints).toMatchObject({
      strokeColor: '#4DA6FF',
      textColor: 'rgba(0, 0, 0, 0.85)',
      fontSize: 14,
      fontFamily: 'PingFang SC, Microsoft YaHei, Arial, sans-serif',
      fontWeight: 500,
      lineHeight: 14,
      textOffsetX: 5,
      textOffsetY: -10
    });
  });



  it('builds Canvas2D nodes for functions, conics, relations, transforms, and measurements', () => {
    const result = buildPlaygroundCanvasScene([
      { id: 'a', expression: 'A = Point(-4, -2)', color: '#0ea5e9' },
      { id: 'b', expression: 'B = Point(0, 2)', color: '#0ea5e9' },
      { id: 'c', expression: 'C = Point(4, -2)', color: '#0ea5e9' },
      { id: 'd', expression: 'D = Point(0, -4)', color: '#0ea5e9' },
      { id: 'l', expression: 'l = Line(A, B)', color: '#8b5cf6' },
      { id: 'm', expression: 'm = Line(C, D)', color: '#8b5cf6' },
      { id: 'mid', expression: 'M = Midpoint(A, C)', color: '#22c55e' },
      { id: 'perp', expression: 'perp = PerpendicularLine(l, C)', color: '#f43f5e' },
      { id: 'para', expression: 'para = ParallelLine(l, C)', color: '#f43f5e' },
      { id: 'poly', expression: 'poly = Polygon(A, B, C)', color: '#14b8a6' },
      { id: 'rot', expression: 'rot = Rotate(poly, 0.4, M)', color: '#14b8a6' },
      { id: 'ell', expression: 'ell = Ellipse(M, 3, 1, 0.2)', color: '#f59e0b' },
      { id: 'hyp', expression: 'hyp = Hyperbola(M, 2, 1, 0)', color: '#f59e0b' },
      { id: 'fn', expression: 'f = Function("x^2", -2, 2)', color: '#6366f1' },
      { id: 'df', expression: 'df = Derivative(f)', color: '#6366f1' },
      { id: 'tan', expression: 'tan = Tangent(B, f)', color: '#6366f1' },
      { id: 'dist', expression: 'dist = Distance(A, C)', color: '#64748b' },
      { id: 'area', expression: 'area = Area(poly)', color: '#64748b' },
      { id: 'slope', expression: 'slope = Slope(l)', color: '#64748b' }
    ]);

    expect(result.diagnostics).toEqual([]);
    expect(result.nodes.find((node) => node.id === 'ell')?.payload).toMatchObject({ geometry: { kind: 'ellipse' } });
    expect(result.nodes.find((node) => node.id === 'hyp')?.payload).toMatchObject({ geometry: { kind: 'hyperbola' } });
    expect(result.nodes.find((node) => node.id === 'df')?.type).toBe('function');
    expect((result.nodes.find((node) => node.id === 'df')?.payload as any).geometry.points.length).toBeGreaterThan(20);
    expect(result.nodes.find((node) => node.id === 'tan')?.payload).toMatchObject({ geometry: { kind: 'line' } });
    expect(result.nodes.find((node) => node.id === 'dist')?.payload).toMatchObject({ measurementKind: 'distance', point: { x: 0, y: -2 } });
    expect(result.nodes.find((node) => node.id === 'area')?.payload).toMatchObject({ measurementKind: 'area' });
  });

  it('lowers 3D z-expression defaults to a visible cross-backend surface wireframe without unsupported diagnostics', () => {
    const result = buildPlaygroundCanvasScene([
      { id: 'surface-default', expression: 'z = sin(x)*cos(y)', color: '#0ea5e9' }
    ]);

    expect(result.diagnostics).toEqual([]);
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0]).toMatchObject({
      id: 'surface-default',
      type: 'solid',
      payload: {
        solidKind: 'surface',
        family: 'surface',
        geometry: { kind: 'wireframe', projection: 'isometric' }
      }
    });
    expect((result.nodes[0].payload as any).geometry.segments.length).toBeGreaterThan(20);
  });

  it('keeps Babylon 3D mode surfaces in native xyz wireframe geometry', () => {
    const result = buildPlaygroundBabylonScene([
      { id: 'surface-3d', expression: 'z = sin(x)*cos(y)', color: '#0ea5e9' }
    ], { renderMode: '3d' });

    expect(result.diagnostics).toEqual([]);
    expect(result.nodes[0]).toMatchObject({
      type: 'solid',
      payload: {
        geometry: { kind: 'wireframe', projection: 'xyz' }
      }
    });
    const firstPoint = ((result.nodes[0].payload as any).geometry.segments[0][0]) as { x: number; y: number; z?: number };
    expect(typeof firstPoint.z).toBe('number');
  });

  it('lowers Equation, Parabola, and Solid commands for Canvas2D without unsupported diagnostics', () => {
    const result = buildPlaygroundCanvasScene([
      { id: 'eq', expression: 'eq = Equation("x^2 + y^2 = 1")', color: '#0ea5e9' },
      { id: 'parabola-focus', expression: 'F = Point(0, 1)', color: '#0ea5e9' },
      { id: 'parabola-a', expression: 'A = Point(-2, -1)', color: '#0ea5e9' },
      { id: 'parabola-b', expression: 'B = Point(2, -1)', color: '#0ea5e9' },
      { id: 'directrix', expression: 'l = Line(A, B)', color: '#0ea5e9' },
      { id: 'parabola', expression: 'p = Parabola(F, l)', color: '#0ea5e9' },
      { id: 'solid', expression: 'cube = Solid("cube", size=2)', color: '#0ea5e9' }
    ]);

    expect(result.diagnostics).toEqual([]);
    expect(result.nodes.map((node) => node.id)).toEqual(expect.arrayContaining(['eq', 'F', 'A', 'B', 'l', 'p', 'cube']));
    expect(result.nodes.find((node) => node.id === 'eq')?.payload).toMatchObject({ geometry: { kind: 'polyline' } });
    expect(result.nodes.find((node) => node.id === 'p')?.payload).toMatchObject({ conicKind: 'parabola', geometry: { kind: 'polyline' } });
    expect(result.nodes.find((node) => node.id === 'cube')?.payload).toMatchObject({ family: 'cube', geometry: { kind: 'polyline' } });
  });

  it('keeps curated Canvas and Babylon showcase demos renderable on their intended backends', () => {
    const canvasDemo = allDemos['2d'].find((demo) => demo.title === 'Canvas2D 全功能巡检');
    const babylonDemo = allDemos['3d'].find((demo) => demo.title === 'Babylon 全 solid family');
    expect(canvasDemo).toBeDefined();
    expect(babylonDemo).toBeDefined();

    const canvasResult = buildPlaygroundCanvasScene(toCommands(canvasDemo!.commands));
    expect(canvasResult.diagnostics).toEqual([]);
    expect(canvasResult.nodes.length).toBeGreaterThan(12);

    const babylonResult = buildPlaygroundLayered3DScene(toCommands(babylonDemo!.commands)).babylon;
    expect(babylonResult.diagnostics).toEqual([]);
    expect(babylonResult.nodes).toHaveLength(10);
    expect(babylonResult.nodes.map((node) => (node.payload as any).family)).toContain('quadrangular-frustum');
  });

  it('keeps math scope while sampling function expressions and exposes named math functions to later commands', () => {
    const result = buildPlaygroundCanvasScene([
      { id: 'a', expression: 'a = 0.5', color: '#0ea5e9' },
      { id: 'helper', expression: 'helper(x) = x^2', color: '#0ea5e9', options: { plot: false } },
      { id: 'f', expression: 'f(x) = sin(x) + a', color: '#f43f5e' },
      { id: 'g', expression: 'helper(x) - a', color: '#10b981' },
      { id: 'p', expression: 'P = Point(1, 1)', color: '#64748b' },
      { id: 'tangent', expression: 't = Tangent(P, f)', color: '#64748b' }
    ]);

    expect(result.diagnostics).toEqual([]);
    expect(result.nodes).toHaveLength(4);
    expect((result.nodes[0].payload as any).geometry.kind).toBe('polyline');
    expect((result.nodes[0].payload as any).geometry.points.length).toBeGreaterThan(20);
    const tangent = result.nodes.find((node) => node.id === 't');
    expect(tangent).toMatchObject({ type: 'line' });
    expect((tangent?.payload as any).through.y).toBeCloseTo(Math.sin(1) + 0.5);
  });

  it('splits sampled functions at discontinuities instead of drawing fake connecting lines', () => {
    const result = buildPlaygroundCanvasScene([
      { id: 'rational', expression: 'y = 1 / x', color: '#0ea5e9' }
    ]);

    expect(result.diagnostics).toEqual([]);
    const segments = result.nodes.filter((node) => node.type === 'function');
    expect(segments.length).toBeGreaterThan(1);
    for (const segment of segments) {
      const points = (segment.payload as any).geometry.points as Array<{ x: number; y: number }>;
      expect(points.length).toBeGreaterThan(1);
      expect(points.every((point) => point.x < 0) || points.every((point) => point.x > 0)).toBe(true);
    }
  });

  it('splits 3D scene nodes between Babylon and Canvas2D overlay layers', () => {
    const result = buildPlaygroundLayered3DScene([
      { id: 'cube', expression: 'cube = Solid("cube", size=2, x=-1)', color: '#0ea5e9' },
      { id: 'sphere', expression: 'sphere = Solid("sphere", radius=1, x=2)', color: '#22c55e' },
      { id: 'point', expression: 'A = Point(0, 0)', color: '#f43f5e' },
      { id: 'label', expression: 'label = Text(1, 1, "overlay")', color: '#64748b' }
    ]);

    expect(result.babylon.diagnostics).toEqual([]);
    expect(result.overlay.diagnostics).toEqual([]);
    expect(result.babylon.nodes.map((node) => node.type)).toEqual(['solid', 'solid']);
    expect(result.overlay.nodes.map((node) => node.type)).toEqual(['point', 'text']);
    expect(result.babylon.nodes[0].payload).toMatchObject({ family: 'cube', parameters: { size: 2 }, origin: { x: -1, y: 0, z: 0 } });
    expect(result.babylon.nodes[1].payload).toMatchObject({ family: 'sphere', parameters: { radius: 1 }, origin: { x: 2, y: 0, z: 0 } });
  });

  it('keeps every curriculum parity demo diagnostic-free and equivalent across 2D parity backends', () => {
    const demoCommands = getParityDemoCommands();
    expect(demoCommands.length).toBeGreaterThan(20);

    for (const demo of demoCommands) {
      const jsxGraph = buildPlaygroundJsxGraphScene(demo.commands);
      const canvas = buildPlaygroundCanvasScene(demo.commands);

      expect(jsxGraph.diagnostics, demo.demoId).toEqual([]);
      expect(canvas.diagnostics, demo.demoId).toEqual([]);

      const expected = createPlaygroundParitySnapshot(demo.demoId, jsxGraph.nodes, 'jsxgraph', demo.rowIds);
      const canvasComparison = compareParitySnapshots(expected, createPlaygroundParitySnapshot(demo.demoId, canvas.nodes, 'canvas2d', demo.rowIds));
      expect(canvasComparison.diagnostics, demo.demoId).toEqual([]);
    }
  });

  it('routes the real-expression parity label through LaTeX rendering with readable styling', () => {
    const demo = getParityDemoCommands().find((entry) => entry.rowIds.includes('number.real-expression'));
    expect(demo).toBeDefined();
    if (!demo) throw new Error('number.real-expression demo is missing');

    const labelCommand = demo.commands.find((command) => command.id.endsWith(':text-value'));
    expect(labelCommand?.expression).toContain('$\\sqrt{2}+\\pi\\approx');
    expect(labelCommand?.expression).toContain('\\text{实数轴/近似值}');
    expect(labelCommand?.options).toMatchObject({ strokeColor: '#0f172a' });

    const result = buildPlaygroundCanvasScene(demo.commands);
    expect(result.diagnostics).toEqual([]);

    const labels = result.nodes.filter((node) => node.type === 'text');
    expect(labels).toHaveLength(1);
    expect(labels[0].payload).toMatchObject({
      point: { x: -6.4, y: 3.2 },
      text: '$\\sqrt{2}+\\pi\\approx 4.556\\quad \\text{实数轴/近似值}$',
      format: 'latex'
    });
    expect(labels[0].renderHints).toMatchObject({ strokeColor: '#0f172a' });
  });

  it('creates backend handles for every curriculum parity node on backend contract adapters', () => {
    const demoCommands = getParityDemoCommands();
    const builders = {
      jsxgraph: buildPlaygroundJsxGraphScene,
      canvas2d: buildPlaygroundCanvasScene
    };
    const backendFactories = {
      jsxgraph: () => createJsxGraphBackend({ id: 'jsxgraph' }),
      canvas2d: () => createCanvas2DGraphBackend({ id: 'canvas2d' })
    };

    for (const demo of demoCommands) {
      for (const backend of twoDParityBackends) {
        const result = builders[backend.id](demo.commands);
        expect(result.diagnostics, `${backend.id}:${demo.demoId}`).toEqual([]);
        const graphBackend = backendFactories[backend.id]();
        if (backend.id === 'canvas2d') {
          graphBackend.mount(document.createElement('div'), { size: { width: 400, height: 300 } });
        }
        const runtime = new GraphSceneRuntime({ backend: graphBackend });
        for (const node of result.nodes) {
          const added = runtime.addObject(node);
          expect(added.ok, `${backend.id}:${demo.demoId}:${node.id}`).toBe(true);
        }
        expect(runtime.snapshot().handles.map((handle) => handle.objectId), `${backend.id}:${demo.demoId}`).toEqual(
          result.nodes.map((node) => node.id)
        );
      }
    }
  });

  it('derives selector availability and capability summaries from parity status instead of hardcoded unsupported gaps', () => {
    expect(parityRendererBackends.map((backend) => backend.id)).toEqual(['jsxgraph', 'canvas2d', 'babylon']);
    expect(getPreferredBackendForMode('2d')).toBe('canvas2d');
    expect(getPreferredBackendForMode('geometry')).toBe('canvas2d');
    expect(getPreferredBackendForMode('operation')).toBe('canvas2d');
    expect(getPreferredBackendForMode('3d')).toBe('babylon');

    for (const mode of ['2d', 'geometry', 'operation', '3d'] as const) {
      for (const backend of parityRendererBackends) {
        expect(isBackendSelectableForMode(mode, backend.id), `${mode}:${backend.id}`).toBe(
          backend.id === getPreferredBackendForMode(mode)
        );
      }
    }

    for (const backend of parityRendererBackends) {
      expect(getParityCapabilitySummaries()[backend.id].unsupported).toEqual([]);
    }
  });

  it('keeps every selectable playground demo diagnostic-free for every selectable backend', () => {
    for (const mode of Object.keys(allDemos) as Array<keyof typeof allDemos>) {
      for (const backend of parityRendererBackends) {
        if (!isBackendSelectableForMode(mode, backend.id)) continue;
        for (const demo of allDemos[mode]) {
          const result = backend.id === 'babylon'
            ? buildPlaygroundLayered3DScene(toCommands(demo.commands)).babylon
            : backend.id === 'canvas2d'
              ? buildPlaygroundCanvasScene(toCommands(demo.commands))
              : buildPlaygroundJsxGraphScene(toCommands(demo.commands));
          expect(result.diagnostics, `${mode}:${backend.id}:${demo.title}`).toEqual([]);
        }
      }
    }
  });

  it('keeps operation-area command tools diagnostic-free for every 2D backend', () => {
    const builders = {
      jsxgraph: buildPlaygroundJsxGraphScene,
      canvas2d: buildPlaygroundCanvasScene
    };
    const tools = operationToolGroups.flatMap((group) => group.tools);

    for (const backend of twoDParityBackends) {
      for (const tool of tools) {
        const result = builders[backend.id](toCommands(tool.commands));
        expect(result.diagnostics, `${backend.id}:${tool.id}`).toEqual([]);
        expect(result.nodes.length, `${backend.id}:${tool.id}`).toBeGreaterThan(0);
      }
    }
  });

  it('creates independent coordinate systems for scoped operation-area drops', () => {
    const tools = operationToolGroups.flatMap((group) => group.tools);
    const builders = {
      jsxgraph: buildPlaygroundJsxGraphScene,
      canvas2d: buildPlaygroundCanvasScene
    };

    expect(tools.length).toBeGreaterThan(0);
    expect(
      tools.flatMap((tool) => tool.commands.map((command) => command.expr))
    ).not.toContain('CoordinateSystem("plane")');

    const tool = tools.find((entry) => entry.id === 'linear-function') ?? tools[0];
    const commands = [
      ...createOperationScopedCommands(tool.commands, { x: 2.3, y: -2.7 }, 'coord_left'),
      ...createOperationScopedCommands(tool.commands, { x: -4.2, y: 5.1 }, 'coord_right')
    ];

    for (const backend of twoDParityBackends) {
      const result = builders[backend.id](toCommands(commands));
      expect(result.diagnostics, backend.id).toEqual([]);

      const coordinateSystems = result.nodes.filter((node) => node.type === 'coordinate-system');
      expect(coordinateSystems.map((node) => node.id), backend.id).toEqual(['coord_left', 'coord_right']);
      expect(coordinateSystems[0]).toMatchObject({
        meta: { coordinateSystemId: 'coord_left', independentCoordinateSystem: true, draggable: true, snapToGrid: { enabled: true, phase: 'end' } },
        payload: {
          origin: { x: 2, y: -3 }
        }
      });
      expectCoordinateSystemAxes(coordinateSystems[0], {
        xAxis: [{ x: -4, y: -3 }, { x: 8, y: -3 }],
        yAxis: [{ x: 2, y: -9 }, { x: 2, y: 3 }]
      });
      expect(coordinateSystems[1]).toMatchObject({
        meta: { coordinateSystemId: 'coord_right', independentCoordinateSystem: true, draggable: true, snapToGrid: { enabled: true, phase: 'end' } },
        payload: {
          origin: { x: -4, y: 5 }
        }
      });
      expectCoordinateSystemAxes(coordinateSystems[1], {
        xAxis: [{ x: -10, y: 5 }, { x: 2, y: 5 }],
        yAxis: [{ x: -4, y: -1 }, { x: -4, y: 11 }]
      });

      const scopedGraphs = result.nodes.filter((node) => node.type === 'function' || node.type === 'equation');
      expect(scopedGraphs.some((node) => node.meta?.coordinateSystemId === 'coord_left'), backend.id).toBe(true);
      expect(scopedGraphs.some((node) => node.meta?.coordinateSystemId === 'coord_right'), backend.id).toBe(true);
      expect(scopedGraphs.every((node) => node.renderHints?.draggable === false), backend.id).toBe(true);
    }
  });

  it('keeps operation-area geometry annotations scoped inside their coordinate windows', () => {
    const tool = operationToolGroups.flatMap((group) => group.tools).find((entry) => entry.id === 'triangle-overlay-tools');
    expect(tool).toBeDefined();
    const builders = {
      jsxgraph: buildPlaygroundJsxGraphScene,
      canvas2d: buildPlaygroundCanvasScene
    };
    const commands = createOperationScopedCommands(tool!.commands, { x: 2.25, y: -1.5 }, 'coord_triangle');

    for (const backend of twoDParityBackends) {
      const result = builders[backend.id](toCommands(commands));
      expect(result.diagnostics, backend.id).toEqual([]);
      const bounds = { left: -4, right: 8, top: 5, bottom: -7 };
      const scoped = result.nodes.filter((node) => node.meta?.coordinateSystemId === 'coord_triangle' && node.type !== 'coordinate-system');
      expect(scoped.length, backend.id).toBeGreaterThan(8);
      for (const node of scoped) {
        const points = nodePoints(node);
        expect(points.length, `${backend.id}:${node.id}`).toBeGreaterThan(0);
        expect(node.renderHints, `${backend.id}:${node.id}`).toMatchObject({
          draggable: false,
          clipWorldBounds: bounds
        });
        expect(points.every((point) => point.x >= bounds.left - 1e-9
          && point.x <= bounds.right + 1e-9
          && point.y >= bounds.bottom - 1e-9
          && point.y <= bounds.top + 1e-9), `${backend.id}:${node.id}`).toBe(true);
      }
    }
  });

  it('repositions dense operation-area text labels to reduce overlap', () => {
    const commands = createOperationScopedCommands([
      { expr: 'Text(0, 0, "顶点: (0, 0)")' },
      { expr: 'Text(0, 0, "x 轴交点: (0, 0)")' },
      { expr: 'Text(0, 0, "y 轴交点: (0, 0)")' },
      { expr: 'Text(0, 0, "对称轴: x = 0")' }
    ], { x: 0, y: 0 }, 'coord_labels');

    const result = buildPlaygroundCanvasScene(toCommands(commands));
    expect(result.diagnostics).toEqual([]);
    const labels = result.nodes.filter((node) => node.type === 'text');
    expect(labels).toHaveLength(4);
    expect(labels.every((node) => node.renderHints?.labelAvoidance === 'playground')).toBe(true);
    expect(new Set(labels.map((node) => {
      const point = (node.payload as any).point as { x: number; y: number };
      return `${point.x.toFixed(3)},${point.y.toFixed(3)}`;
    })).size).toBe(labels.length);
    expect(labels.some((node) => (node.payload as any).labelAnchor)).toBe(true);
  });

  it('preserves operation-area annotation local geometry when command coordinate origins move', () => {
    const tool = operationToolGroups
      .flatMap((group) => group.tools)
      .find((entry) => entry.id === 'triangle-overlay-tools');
    expect(tool).toBeTruthy();

    const origin = { x: 0, y: 0 };
    const movedOrigin = { x: 3, y: -1 };
    const commands = toCommands(createOperationScopedCommands(tool!.commands, origin, 'coord_triangle_move'));
    const before = buildPlaygroundCanvasScene(commands);
    expect(before.diagnostics).toEqual([]);
    const beforeSnapshot = operationLocalPointSnapshot(before.nodes, 'coord_triangle_move', origin);

    expect(updateOperationCoordinateSystemOrigin(commands, 'coord_triangle_move', movedOrigin)).toBe(commands.length);

    for (const builder of [buildPlaygroundJsxGraphScene, buildPlaygroundCanvasScene]) {
      const after = builder(commands);
      expect(after.diagnostics).toEqual([]);
      expect(operationLocalPointSnapshot(after.nodes, 'coord_triangle_move', movedOrigin)).toEqual(beforeSnapshot);
    }
  });

  it('keeps dragged operation-area coordinate systems after appending functions in core renderers', () => {
    const commands = toCommands(createOperationScopedCommands([
      { expr: 'Function("x", -5, 5)', options: { strokeColor: '#4DA6FF' } }
    ], { x: 1.25, y: -2.75 }, 'coord_drag'));
    const initial = buildPlaygroundCanvasScene(commands);
    expect(initial.diagnostics).toEqual([]);

    const runtime = new GraphSceneRuntime();
    for (const node of initial.nodes) {
      const added = runtime.addObject(node);
      expect(added.ok, node.id).toBe(true);
    }

    const dragged = runtime.applyDragToObject('coord_drag', {
      delta: { dimension: '2d', dx: 4.1, dy: 1.6 },
      dragPhase: 'end'
    });
    expect(dragged.ok).toBe(true);
    const movedOrigin = ((dragged.value?.payload as any)?.origin ?? {}) as { x?: number; y?: number };
    expect(movedOrigin).toMatchObject({ x: 5, y: -1 });
    expect(updateOperationCoordinateSystemOrigin(commands, 'coord_drag', {
      x: movedOrigin.x ?? Number.NaN,
      y: movedOrigin.y ?? Number.NaN
    })).toBe(2);

    const appendedCommands = createOperationScopedCommands([
      { expr: 'Function("-x", -5, 5)', options: { strokeColor: '#16D957' } }
    ], { x: -4.2, y: 5.1 }, 'coord_new').map((command, index) => ({
      id: `new-${index}`,
      expression: command.expr,
      color: '#10b981',
      options: command.options
    }));

    for (const builder of [buildPlaygroundCanvasScene]) {
      const rebuilt = builder([...commands, ...appendedCommands]);
      expect(rebuilt.diagnostics).toEqual([]);
      expect((rebuilt.nodes.find((node) => node.id === 'coord_drag')?.payload as any)?.origin).toMatchObject({ x: 5, y: -1 });
      const draggedFunction = rebuilt.nodes.find((node) => node.type === 'function' && node.meta?.coordinateSystemId === 'coord_drag');
      expect((draggedFunction?.renderHints as any)?.clipWorldBounds).toMatchObject({
        left: -1,
        right: 11,
        top: 5,
        bottom: -7
      });
      expect((rebuilt.nodes.find((node) => node.id === 'coord_new')?.payload as any)?.origin).toMatchObject({ x: -4, y: 5 });
    }
  });

  it('clips scoped operation-area graphs to their independent coordinate windows', () => {
    const builders = {
      jsxgraph: buildPlaygroundJsxGraphScene,
      canvas2d: buildPlaygroundCanvasScene
    };
    const commands = createOperationScopedCommands([
      { expr: 'Function("x^2 - 2", -20, 20)', options: { strokeColor: '#4DA6FF' } },
      { expr: 'Equation("x^2 + y^2 = 50")', options: { strokeColor: '#FF8D1A' } }
    ], { x: 10, y: 20 }, 'coord_clip');

    for (const backend of twoDParityBackends) {
      const result = builders[backend.id](toCommands(commands));
      expect(result.diagnostics, backend.id).toEqual([]);
      const scopedGraphs = result.nodes.filter((node) => node.meta?.coordinateSystemId === 'coord_clip' && node.type !== 'coordinate-system');
      expect(scopedGraphs.length, backend.id).toBeGreaterThan(0);
      for (const node of scopedGraphs) {
        const points = geometryPoints((node.payload as any)?.geometry);
        expect(points.length, `${backend.id}:${node.id}`).toBeGreaterThan(0);
        expect(node.renderHints, `${backend.id}:${node.id}`).toMatchObject({
          draggable: false,
          lineCap: 'butt',
          clipWorldBounds: { left: 4, right: 16, top: 26, bottom: 14 }
        });
        expect(points.every((point) => (
          point.x >= 4 - 1e-9
          && point.x <= 16 + 1e-9
          && point.y >= 14 - 1e-9
          && point.y <= 26 + 1e-9
        )), `${backend.id}:${node.id}`).toBe(true);
      }
    }
  });
});

const geometryPoints = (geometry: any): Array<{ x: number; y: number }> => {
  if (geometry?.kind === 'polyline' && Array.isArray(geometry.points)) return geometry.points;
  if ((geometry?.kind === 'multiline' || geometry?.kind === 'wireframe') && Array.isArray(geometry.segments)) {
    return geometry.segments.flat();
  }
  if (geometry?.kind === 'polygon' && Array.isArray(geometry.vertices)) return geometry.vertices;
  if (geometry?.kind === 'segment' && geometry.start && geometry.end) return [geometry.start, geometry.end];
  if (geometry?.kind === 'circle' && geometry.center) return [geometry.center];
  if (geometry?.kind === 'line' && geometry.point) return [geometry.point];
  return [];
};

const nodePoints = (node: any): Array<{ x: number; y: number }> => {
  if (node?.payload?.point) return [node.payload.point];
  return geometryPoints(node?.payload?.geometry);
};

const expectCoordinateSystemAxes = (
  node: any,
  expected: {
    xAxis: Array<{ x: number; y: number }>;
    yAxis: Array<{ x: number; y: number }>;
  }
) => {
  const geometry = node?.payload?.geometry;
  for (const [index, point] of expected.xAxis.entries()) {
    expectPointClose(geometry.xAxis[index], point);
  }
  for (const [index, point] of expected.yAxis.entries()) {
    expectPointClose(geometry.yAxis[index], point);
  }
};

const expectPointClose = (actual: any, expected: { x: number; y: number }) => {
  expect(actual.x).toBeCloseTo(expected.x, 6);
  expect(actual.y).toBeCloseTo(expected.y, 6);
};

const operationLocalPointSnapshot = (
  nodes: readonly any[],
  coordinateSystemId: string,
  origin: { x: number; y: number }
) => nodes
  .filter((node) => node.meta?.coordinateSystemId === coordinateSystemId && node.type !== 'coordinate-system')
  .map((node) => ({
    id: node.id,
    type: node.type,
    points: nodePoints(node).map((point) => ({
      x: Number((point.x - origin.x).toFixed(6)),
      y: Number((point.y - origin.y).toFixed(6))
    }))
  }));
