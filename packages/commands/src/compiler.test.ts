import { describe, expect, it } from 'vitest';
import { GraphSceneStore } from '@vuegraphx/core';
import {
  GraphCommandSymbolStore,
  compileGraphCommand,
  compileGraphCommands,
  compileGraphExpression,
  getGraphCommandCatalogEntry,
  listGraphCommandCatalog,
  normalizeLegacyGraphExpression
} from './index';

describe('renderer-free command compiler', () => {
  it('exposes command catalog metadata for aliases, arity, parameter types, examples, and support', () => {
    const circle = getGraphCommandCatalogEntry('Circle');
    expect(circle).toMatchObject({
      canonicalName: 'Circle',
      type: 'circle',
      arity: { min: 2, max: 2 },
      support: { status: 'supported' }
    });
    expect(circle?.aliases).toContain('Circle');
    expect(circle?.parameters.map((parameter) => parameter.type)).toEqual(['point', ['number', 'point']]);
    expect(circle?.examples[0]).toContain('Circle');
    expect(circle?.support.coreIrTypes).toContain('conic');

    const translate = getGraphCommandCatalogEntry('Translate');
    expect(translate?.parameters.map((parameter) => parameter.type)).toEqual(['object', ['number', 'vector'], 'number']);
    expect(translate?.parameters[1]).toMatchObject({ name: 'dxOrVector' });
    expect(translate?.parameters[2]).toMatchObject({ name: 'dy', optional: true });

    const polyline = getGraphCommandCatalogEntry('PolygonalChain');
    expect(polyline?.type).toBe('polyline');
    expect(getGraphCommandCatalogEntry('regular_polygon')?.type).toBe('regular-polygon');

    const catalog = listGraphCommandCatalog();
    expect(catalog.map((entry) => entry.canonicalName)).toEqual(expect.arrayContaining(['Point', 'Line', 'Ellipse', 'Distance', 'Area']));
  });

  it('compiles JSXGraph/GeoGebra-style commands into VueGraphX-owned IR', () => {
    const program = compileGraphCommands([
      'A = Point(0, 0)',
      'B = Point(3, 0)',
      'c = Circle(A, B)',
      'poly = Polygon(A, B, (0, 4))',
      'f = Function("x^2", -2, 2)',
      'eq = Equation("x^2 + y^2 = 1")',
      'solid = Solid("cube", size=2)'
    ]);

    expect(program.diagnostics).toEqual([]);
    expect(program.nodes.map((node) => node.id)).toEqual(['A', 'B', 'c', 'poly', 'f', 'eq', 'solid']);
    expect(program.nodes.find((node) => node.id === 'c')?.dependencies).toEqual(['A', 'B']);
    expect(program.nodes.find((node) => node.id === 'f')?.capabilities?.map((capability) => capability.id)).toContain('math.function.set-expression');
    expect(program.nodes.find((node) => node.id === 'solid')?.capabilities?.map((capability) => capability.id)).toContain('math.solid.toggle-section');

    const store = new GraphSceneStore('compiled');
    for (const node of program.nodes) expect(store.addObject(node).ok).toBe(true);
    const json = store.toJSON();
    expect(json.ok).toBe(true);
    expect(JSON.stringify(json.value)).not.toMatch(/JXG|BABYLON|HTMLElement/);
  });

  it('supports constructed relation commands without rendering side effects', () => {
    const first = compileGraphCommand('A = Point(0, 0)');
    expect(first.ok).toBe(true);
    const second = compileGraphCommand('B = Point(2, 0)', { symbols: first.value?.symbols });
    expect(second.ok).toBe(true);
    const line = compileGraphCommand('l = Line(A, B)', { symbols: second.value?.symbols });
    expect(line.ok).toBe(true);
    const perpendicular = compileGraphCommand('p = PerpendicularLine(l, A)', { symbols: line.value?.symbols });
    expect(perpendicular.ok).toBe(true);
    expect(perpendicular.value?.node.kind).toBe('relation');
    expect(perpendicular.value?.node.dependencies).toEqual(['A', 'l']);

    const parallel = compileGraphCommand('q = ParallelLine(l, B)', { symbols: perpendicular.value?.symbols });
    expect(parallel.ok).toBe(true);
    expect(parallel.value?.node.payload).toMatchObject({
      relation: 'parallel',
      sourceObjectId: 'l',
      through: { x: 2, y: 0 },
      geometry: { kind: 'line', direction: { x: 2, y: 0 } }
    });
  });

  it('compiles parametric Surface commands with math constants in domain bounds', () => {
    const result = compileGraphCommand('torus = Surface((3+cos(v))*cos(u), (3+cos(v))*sin(u), sin(v), 0, 2*pi, 0, 2*pi)');

    expect(result.diagnostics).toEqual([]);
    expect(result.value?.node).toMatchObject({
      id: 'torus',
      kind: 'shape',
      type: 'solid',
      payload: {
        objectType: 'solid',
        solidKind: 'surface',
        family: 'surface',
        surfaceKind: 'parametric',
        xExpression: '(3+cos(v))*cos(u)',
        yExpression: '(3+cos(v))*sin(u)',
        zExpression: 'sin(v)'
      }
    });
    expect((result.value?.node.payload as any).uDomain[1]).toBeCloseTo(Math.PI * 2);
    expect((result.value?.node.payload as any).vDomain[1]).toBeCloseTo(Math.PI * 2);
  });

  it('covers higher-level command DSL for tangent, derivative, intersection, angle, translate, and rotate', () => {
    const program = compileGraphCommands([
      'A = Point(0, 0)',
      'B = Point(2, 0)',
      'C = Point(0, 2)',
      'l = Line(A, B)',
      'm = Line(A, C)',
      'circle = Circle(A, 2)',
      'f = Function("x^2", -2, 2)',
      't = Tangent(B, f)',
      'df = Derivative(f)',
      'I = Intersect(l, m)',
      'ang = Angle(B, A, C)',
      'shifted = Translate(B, 1, 2)',
      'rotated = Rotate(B, 1.5707963267948966, A)'
    ]);

    expect(program.diagnostics).toEqual([]);
    expect(program.nodes.find((node) => node.id === 't')?.payload).toMatchObject({
      relation: 'tangent',
      sourceObjectId: 'f',
      slope: 4
    });
    expect(program.nodes.find((node) => node.id === 'df')?.payload).toMatchObject({
      expression: '2 * x',
      sourceObjectId: 'f'
    });
    expect(program.nodes.find((node) => node.id === 'I')?.payload).toMatchObject({
      point: { x: 0, y: 0 },
      sourceObjectIds: ['l', 'm']
    });
    expect(program.nodes.find((node) => node.id === 'ang')?.payload).toMatchObject({
      vertex: { x: 0, y: 0 },
      degrees: 90
    });
    expect(program.nodes.find((node) => node.id === 'shifted')?.payload).toMatchObject({
      point: { x: 3, y: 2 },
      transform: { kind: 'translate' }
    });
    const rotatedPoint = (program.nodes.find((node) => node.id === 'rotated')?.payload as any).point;
    expect(rotatedPoint.x).toBeCloseTo(0);
    expect(rotatedPoint.y).toBeCloseTo(2);
  });

  it('compiles additional JSXGraph-style geometry commands into renderer-neutral IR', () => {
    const program = compileGraphCommands([
      'A = Point(0, 0)',
      'B = Point(2, 0)',
      'C = Point(0, 2)',
      'arc = Arc(A, B, C)',
      'sector = Sector(A, B, C)',
      'semi = Semicircle(B, C)',
      'chain = PolygonalChain(A, B, C)',
      'regular = RegularPolygon(A, B, 4)',
      'para = Parallelogram(A, B, C)',
      'circ = Circumcircle(A, B, C)',
      'inc = Incircle(A, B, C)',
      'cc = Circumcenter(A, B, C)',
      'ic = Incenter(A, B, C)',
      'label = Text(A, "origin")'
    ]);

    expect(program.diagnostics).toEqual([]);
    expect(program.nodes.map((node) => node.type)).toEqual([
      'point',
      'point',
      'point',
      'arc',
      'sector',
      'semicircle',
      'polyline',
      'polygon',
      'polygon',
      'circle',
      'circle',
      'point',
      'point',
      'text'
    ]);
    expect(program.nodes.find((node) => node.id === 'arc')?.payload).toMatchObject({
      geometry: { kind: 'arc', center: { x: 0, y: 0 }, radius: 2 }
    });
    expect(program.nodes.find((node) => node.id === 'sector')?.dependencies).toEqual(['A', 'B', 'C']);
    expect(program.nodes.find((node) => node.id === 'semi')?.payload).toMatchObject({
      geometry: { kind: 'semicircle', center: { x: 1, y: 1 } }
    });
    expect(program.nodes.find((node) => node.id === 'chain')?.payload).toMatchObject({
      geometry: { kind: 'polyline', points: [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 0, y: 2 }] }
    });
    expect((program.nodes.find((node) => node.id === 'regular')?.payload as any).geometry.vertices).toHaveLength(4);
    expect(program.nodes.find((node) => node.id === 'para')?.payload).toMatchObject({
      geometry: { kind: 'polygon', vertices: [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 0, y: 2 }, { x: -2, y: 2 }] }
    });
    expect(program.nodes.find((node) => node.id === 'circ')?.payload).toMatchObject({
      geometry: { kind: 'circle', center: { x: 1, y: 1 } }
    });
    expect((program.nodes.find((node) => node.id === 'inc')?.payload as any).geometry.radius).toBeCloseTo(2 - Math.sqrt(2));
    expect(program.nodes.find((node) => node.id === 'cc')?.payload).toMatchObject({ point: { x: 1, y: 1 } });
    expect((program.nodes.find((node) => node.id === 'ic')?.payload as any).point.x).toBeCloseTo(2 - Math.sqrt(2));
    expect(program.nodes.find((node) => node.id === 'label')?.payload).toEqual({
      point: { x: 0, y: 0 },
      text: 'origin'
    });
  });

  it('compiles conic and measurement commands while tracking symbol dependencies', () => {
    const program = compileGraphCommands([
      'A = Point(0, 0)',
      'B = Point(3, 4)',
      'C = Point(0, 4)',
      's = Segment(A, B)',
      'l = Line(A, B)',
      'poly = Polygon(A, B, C)',
      'e = Ellipse(A, 5, 2)',
      'q = Conic(1, 0, 1, 0, 0, -25)',
      'd = Distance(A, B)',
      'len = Length(s)',
      'area = Area(poly)',
      'm = Slope(l)'
    ]);

    expect(program.diagnostics).toEqual([]);
    expect(program.symbols).toBeInstanceOf(GraphCommandSymbolStore);
    expect(program.nodes.find((node) => node.id === 'e')).toMatchObject({
      type: 'conic',
      payload: {
        objectType: 'conic',
        conicKind: 'ellipse'
      },
      dependencies: ['A']
    });
    expect(program.nodes.find((node) => node.id === 'q')).toMatchObject({
      type: 'conic',
      payload: {
        objectType: 'conic',
        conicKind: 'circle'
      }
    });
    expect(program.nodes.find((node) => node.id === 'd')).toMatchObject({
      type: 'measurement',
      payload: {
        objectType: 'measurement',
        measurementKind: 'distance',
        value: 5
      },
      dependencies: ['A', 'B']
    });
    expect(program.symbols.resolve('d')?.dependencies).toEqual(['A', 'B']);
    expect(program.symbols.dependencyIdsFor('m')).toEqual(['l']);

    const store = new GraphSceneStore('conic-measurement');
    for (const node of program.nodes) expect(store.addObject(node).ok).toBe(true);
  });

  it('keeps commas and brackets inside quoted command arguments', () => {
    const program = compileGraphCommands([
      'A = Point(0, 0)',
      'label = Text(A, "hello, world (kept)")',
      'f = Function("max(x, 1)", -2, 2)'
    ]);

    expect(program.diagnostics).toEqual([]);
    expect(program.nodes.find((node) => node.id === 'label')?.payload).toEqual({
      point: { x: 0, y: 0 },
      text: 'hello, world (kept)'
    });
    expect(program.nodes.find((node) => node.id === 'f')?.payload).toMatchObject({
      expression: 'max(x, 1)',
      domain: [-2, 2]
    });
  });

  it('returns structured diagnostics for invalid commands', () => {
    const result = compileGraphCommand('Circle(A, Missing)');
    expect(result.ok).toBe(false);
    expect(result.diagnostics[0].code).toBe('commands.invalid-reference');
  });

  it('returns typed diagnostics for arity, domain, ambiguous result, unsupported capability, and unsupported commands', () => {
    expect(compileGraphCommand('A = Point(1)').diagnostics[0].code).toBe('commands.arity');
    expect(compileGraphCommand('CoordinateSystem(1, 2)').diagnostics[0].code).toBe('commands.arity');
    const symbols = compileGraphCommands(['A = Point(0, 0)']).symbols;
    expect(compileGraphCommand('Text(A, "a", "b", "c")', { symbols }).diagnostics[0].code).toBe('commands.arity');
    expect(compileGraphCommand('Foo()').diagnostics[0].code).toBe('commands.unsupported-command');

    const domain = compileGraphCommands([
      'A = Point(0, 0)',
      'bad = Circle(A, -1)'
    ]);
    expect(domain.diagnostics[0].code).toBe('commands.domain-error');

    const ambiguous = compileGraphCommands([
      'A = Point(0, 0)',
      'B = Point(4, 0)',
      'c1 = Circle(A, 5)',
      'c2 = Circle(B, 5)',
      'I = Intersect(c1, c2)'
    ]);
    expect(ambiguous.diagnostics[0]).toMatchObject({
      code: 'commands.ambiguous-result',
      details: { pointCount: 2 }
    });

    const unsupported = compileGraphCommands([
      'A = Point(0, 0)',
      'label = Text(A, "origin")',
      'shifted = Translate(label, 1, 2)'
    ]);
    expect(unsupported.diagnostics[0]).toMatchObject({
      code: 'commands.unsupported-capability',
      details: { objectType: 'text' }
    });

    expect(compileGraphCommand('bad = Solid("cube", bad)').diagnostics[0]).toMatchObject({
      code: 'commands.invalid-argument',
      details: { argument: 'bad' }
    });
  });

  it('normalizes legacy tuple syntax and compiles semantic expressions into core objects', () => {
    expect(normalizeLegacyGraphExpression('A = (1, 2)')).toBe('A = Point(1, 2)');

    const point = compileGraphExpression('A = (1, 2)');
    expect(point.ok).toBe(true);
    expect(point.value?.node).toMatchObject({
      id: 'A',
      type: 'point',
      payload: { point: { x: 1, y: 2 } }
    });

    const fn = compileGraphExpression('f(x) = sin(x)', { renderHints: { strokeColor: '#f00' } });
    expect(fn.ok).toBe(true);
    expect(fn.value?.node.type).toBe('function');
    expect(fn.value?.node.renderHints?.strokeColor).toBe('#f00');
    expect(fn.value?.node.capabilities?.map((capability) => capability.id)).toContain('math.function.set-expression');

    const variable = compileGraphExpression('a = 0.5');
    expect(variable.ok).toBe(true);
    expect(variable.value?.node).toMatchObject({
      id: 'a',
      kind: 'command',
      type: 'variable',
      payload: { name: 'a', value: 0.5 }
    });
  });

  it('keeps unsupported renderer-era expressions as serializable legacy command nodes when requested', () => {
    const result = compileGraphExpression('Tangent(A, f)', {
      id: 'cmd_tangent',
      fallbackToLegacy: true,
      meta: { ownerCommandId: 'cmd_tangent' }
    });

    expect(result.ok).toBe(true);
    expect(result.value?.node).toMatchObject({
      id: 'cmd_tangent',
      kind: 'command',
      type: 'legacy-expression',
      payload: { expression: 'Tangent(A, f)' },
      meta: { ownerCommandId: 'cmd_tangent', compiler: 'legacy-fallback' }
    });
  });
});
