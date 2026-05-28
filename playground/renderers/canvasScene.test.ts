import { describe, expect, it } from 'vitest';
import { allDemos } from '../showcase';
import { buildPlaygroundBabylonScene, buildPlaygroundCanvasScene, type PlaygroundCanvasCommand } from './canvasScene';

describe('buildPlaygroundCanvasScene', () => {
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

  it('reports unsupported Canvas2D scene commands instead of silently dropping them', () => {
    const result = buildPlaygroundCanvasScene([
      { id: 'eq', expression: 'eq = Equation("x^2 + y^2 = 1")', color: '#0ea5e9' },
      { id: 'parabola-focus', expression: 'F = Point(0, 1)', color: '#0ea5e9' },
      { id: 'parabola-a', expression: 'A = Point(-2, -1)', color: '#0ea5e9' },
      { id: 'parabola-b', expression: 'B = Point(2, -1)', color: '#0ea5e9' },
      { id: 'directrix', expression: 'l = Line(A, B)', color: '#0ea5e9' },
      { id: 'parabola', expression: 'p = Parabola(F, l)', color: '#0ea5e9' },
      { id: 'solid', expression: 'cube = Solid("cube", size=2)', color: '#0ea5e9' }
    ]);

    expect(result.nodes.map((node) => node.id)).toEqual(['F', 'A', 'B', 'l']);
    expect(result.diagnostics.map((diagnostic) => diagnostic.commandId)).toEqual(['eq', 'parabola', 'solid']);
  });

  it('keeps curated Canvas and Babylon showcase demos renderable on their intended backends', () => {
    const toCommands = (commands: (string | { expr: string; options?: Record<string, unknown> })[]): PlaygroundCanvasCommand[] => commands.map((command, index) => ({
      id: `demo-${index}`,
      expression: typeof command === 'string' ? command : command.expr,
      color: '#0ea5e9',
      options: typeof command === 'string' ? undefined : command.options
    }));

    const canvasDemo = allDemos['2d'].find((demo) => demo.title === 'Canvas2D 全功能巡检');
    const babylonDemo = allDemos['3d'].find((demo) => demo.title === 'Babylon 全 solid family');
    expect(canvasDemo).toBeDefined();
    expect(babylonDemo).toBeDefined();

    const canvasResult = buildPlaygroundCanvasScene(toCommands(canvasDemo!.commands));
    expect(canvasResult.diagnostics).toEqual([]);
    expect(canvasResult.nodes.length).toBeGreaterThan(12);

    const babylonResult = buildPlaygroundBabylonScene(toCommands(babylonDemo!.commands));
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
    expect(tangent).toMatchObject({ type: 'tangent' });
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

  it('builds a real Babylon core scene from Solid commands and rejects non-solid commands explicitly', () => {
    const result = buildPlaygroundBabylonScene([
      { id: 'cube', expression: 'cube = Solid("cube", size=2, x=-1)', color: '#0ea5e9' },
      { id: 'sphere', expression: 'sphere = Solid("sphere", radius=1, x=2)', color: '#22c55e' },
      { id: 'point', expression: 'A = Point(0, 0)', color: '#f43f5e' }
    ]);

    expect(result.nodes.map((node) => node.type)).toEqual(['solid', 'solid']);
    expect(result.nodes[0].payload).toMatchObject({ family: 'cube', parameters: { size: 2 }, origin: { x: -1, y: 0, z: 0 } });
    expect(result.nodes[1].payload).toMatchObject({ family: 'sphere', parameters: { radius: 1 }, origin: { x: 2, y: 0, z: 0 } });
    expect(result.diagnostics).toEqual([{ commandId: 'point', message: 'Babylon 后端当前只接收 core Solid(...) 立体对象；曲面/函数仍请切回 JSXGraph。' }]);
  });
});
