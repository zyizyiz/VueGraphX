import { describe, expect, it } from 'vitest';
import { buildPlaygroundBabylonScene, buildPlaygroundCanvasScene } from './canvasScene';

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

  it('keeps math scope while sampling function expressions', () => {
    const result = buildPlaygroundCanvasScene([
      { id: 'a', expression: 'a = 0.5', color: '#0ea5e9' },
      { id: 'helper', expression: 'helper(x) = x^2', color: '#0ea5e9', options: { plot: false } },
      { id: 'f', expression: 'f(x) = sin(x) + a', color: '#f43f5e' },
      { id: 'g', expression: 'helper(x) - a', color: '#10b981' }
    ]);

    expect(result.diagnostics).toEqual([]);
    expect(result.nodes).toHaveLength(2);
    expect((result.nodes[0].payload as any).geometry.kind).toBe('polyline');
    expect((result.nodes[0].payload as any).geometry.points.length).toBeGreaterThan(20);
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
