export type GraphCommandNodeType =
  | 'point'
  | 'line'
  | 'ray'
  | 'segment'
  | 'circle'
  | 'ellipse'
  | 'hyperbola'
  | 'parabola'
  | 'conic'
  | 'polygon'
  | 'polyline'
  | 'regular-polygon'
  | 'parallelogram'
  | 'circumcircle'
  | 'incircle'
  | 'circumcenter'
  | 'incenter'
  | 'arc'
  | 'sector'
  | 'semicircle'
  | 'text'
  | 'function'
  | 'equation'
  | 'vector'
  | 'coordinate-system'
  | 'solid'
  | 'perpendicular-line'
  | 'parallel-line'
  | 'midpoint'
  | 'tangent'
  | 'derivative'
  | 'intersection'
  | 'angle'
  | 'translated'
  | 'rotated'
  | 'distance'
  | 'length'
  | 'area'
  | 'slope';

export type GraphCommandParameterType =
  | 'number'
  | 'integer'
  | 'string'
  | 'expression'
  | 'point'
  | 'point-list'
  | 'object'
  | 'line-like'
  | 'circle-like'
  | 'function'
  | 'vector'
  | 'solid-family'
  | 'keyword-argument';

export interface GraphCommandArity {
  min: number;
  max?: number;
  variadic?: boolean;
}

export type GraphCommandParameterTypeSpec = GraphCommandParameterType | readonly GraphCommandParameterType[];

export interface GraphCommandParameterMeta {
  name: string;
  type: GraphCommandParameterTypeSpec;
  optional?: boolean;
  variadic?: boolean;
  description?: string;
}

export interface GraphCommandSupportMeta {
  status: 'supported' | 'partial' | 'unsupported';
  coreIrTypes: readonly string[];
  capabilityIds?: readonly string[];
  since?: string;
  notes?: string;
}

export interface GraphCommandCatalogEntry {
  canonicalName: string;
  type: GraphCommandNodeType;
  aliases: readonly string[];
  arity: GraphCommandArity;
  parameters: readonly GraphCommandParameterMeta[];
  examples: readonly string[];
  support: GraphCommandSupportMeta;
}

const parameter = (
  name: string,
  type: GraphCommandParameterTypeSpec,
  options: Omit<GraphCommandParameterMeta, 'name' | 'type'> = {}
): GraphCommandParameterMeta => ({ name, type, ...options });

const support = (
  coreIrTypes: readonly string[],
  options: Omit<GraphCommandSupportMeta, 'coreIrTypes' | 'status' | 'since'> & { status?: GraphCommandSupportMeta['status'] } = {}
): GraphCommandSupportMeta => ({
  status: options.status ?? 'supported',
  coreIrTypes,
  capabilityIds: options.capabilityIds,
  since: '1.3',
  notes: options.notes
});

export const GRAPH_COMMAND_CATALOG: readonly GraphCommandCatalogEntry[] = [
  {
    canonicalName: 'Point',
    type: 'point',
    aliases: ['Point'],
    arity: { min: 2, max: 2 },
    parameters: [parameter('x', 'number'), parameter('y', 'number')],
    examples: ['A = Point(0, 0)'],
    support: support(['point'])
  },
  {
    canonicalName: 'Line',
    type: 'line',
    aliases: ['Line'],
    arity: { min: 2, max: 2 },
    parameters: [parameter('start', 'point'), parameter('end', 'point')],
    examples: ['l = Line(A, B)'],
    support: support(['line'])
  },
  {
    canonicalName: 'Ray',
    type: 'ray',
    aliases: ['Ray'],
    arity: { min: 2, max: 2 },
    parameters: [parameter('origin', 'point'), parameter('through', 'point')],
    examples: ['r = Ray(A, B)'],
    support: support(['ray'])
  },
  {
    canonicalName: 'Segment',
    type: 'segment',
    aliases: ['Segment'],
    arity: { min: 2, max: 2 },
    parameters: [parameter('start', 'point'), parameter('end', 'point')],
    examples: ['s = Segment(A, B)'],
    support: support(['segment'])
  },
  {
    canonicalName: 'Circle',
    type: 'circle',
    aliases: ['Circle'],
    arity: { min: 2, max: 2 },
    parameters: [parameter('center', 'point'), parameter('radiusOrPoint', ['number', 'point'], { description: 'Finite radius, point reference, or inline point tuple on the circle.' })],
    examples: ['c = Circle(A, 3)', 'c = Circle(A, B)'],
    support: support(['conic'])
  },
  {
    canonicalName: 'Ellipse',
    type: 'ellipse',
    aliases: ['Ellipse'],
    arity: { min: 3, max: 4 },
    parameters: [parameter('center', 'point'), parameter('radiusX', 'number'), parameter('radiusY', 'number'), parameter('rotationRadians', 'number', { optional: true })],
    examples: ['e = Ellipse(A, 4, 2)'],
    support: support(['conic'])
  },
  {
    canonicalName: 'Hyperbola',
    type: 'hyperbola',
    aliases: ['Hyperbola'],
    arity: { min: 3, max: 4 },
    parameters: [parameter('center', 'point'), parameter('radiusX', 'number'), parameter('radiusY', 'number'), parameter('rotationRadians', 'number', { optional: true })],
    examples: ['h = Hyperbola(A, 4, 2)'],
    support: support(['conic'], { status: 'partial', notes: 'Stores renderer-neutral conic IR; advanced branch controls are not yet modeled.' })
  },
  {
    canonicalName: 'Parabola',
    type: 'parabola',
    aliases: ['Parabola'],
    arity: { min: 2, max: 2 },
    parameters: [parameter('focus', 'point'), parameter('directrix', 'line-like')],
    examples: ['p = Parabola(A, l)'],
    support: support(['conic'])
  },
  {
    canonicalName: 'Conic',
    type: 'conic',
    aliases: ['Conic'],
    arity: { min: 1, max: 6 },
    parameters: [parameter('equationOrCoefficients', 'expression', { variadic: true })],
    examples: ['q = Conic("x^2 + y^2 = 1")', 'q = Conic(1, 0, 1, 0, 0, -1)'],
    support: support(['conic'])
  },
  {
    canonicalName: 'Polygon',
    type: 'polygon',
    aliases: ['Polygon'],
    arity: { min: 3, variadic: true },
    parameters: [parameter('vertices', 'point-list', { variadic: true })],
    examples: ['poly = Polygon(A, B, C)'],
    support: support(['polygon'])
  },
  {
    canonicalName: 'Polyline',
    type: 'polyline',
    aliases: ['Polyline', 'PolygonalChain'],
    arity: { min: 2, variadic: true },
    parameters: [parameter('points', 'point-list', { variadic: true })],
    examples: ['chain = PolygonalChain(A, B, C)'],
    support: support(['polygon'])
  },
  {
    canonicalName: 'RegularPolygon',
    type: 'regular-polygon',
    aliases: ['RegularPolygon', 'Regular_Polygon'],
    arity: { min: 3, max: 3 },
    parameters: [parameter('start', 'point'), parameter('end', 'point'), parameter('sides', 'integer')],
    examples: ['square = RegularPolygon(A, B, 4)'],
    support: support(['polygon'])
  },
  {
    canonicalName: 'Parallelogram',
    type: 'parallelogram',
    aliases: ['Parallelogram'],
    arity: { min: 3, max: 3 },
    parameters: [parameter('a', 'point'), parameter('b', 'point'), parameter('c', 'point')],
    examples: ['para = Parallelogram(A, B, C)'],
    support: support(['polygon'])
  },
  {
    canonicalName: 'Circumcircle',
    type: 'circumcircle',
    aliases: ['Circumcircle', 'Circum_Circle'],
    arity: { min: 3, max: 3 },
    parameters: [parameter('a', 'point'), parameter('b', 'point'), parameter('c', 'point')],
    examples: ['circ = Circumcircle(A, B, C)'],
    support: support(['conic'])
  },
  {
    canonicalName: 'Incircle',
    type: 'incircle',
    aliases: ['Incircle', 'In_Circle'],
    arity: { min: 3, max: 3 },
    parameters: [parameter('a', 'point'), parameter('b', 'point'), parameter('c', 'point')],
    examples: ['inc = Incircle(A, B, C)'],
    support: support(['conic'])
  },
  {
    canonicalName: 'Circumcenter',
    type: 'circumcenter',
    aliases: ['Circumcenter', 'Circum_Center'],
    arity: { min: 3, max: 3 },
    parameters: [parameter('a', 'point'), parameter('b', 'point'), parameter('c', 'point')],
    examples: ['cc = Circumcenter(A, B, C)'],
    support: support(['point'])
  },
  {
    canonicalName: 'Incenter',
    type: 'incenter',
    aliases: ['Incenter', 'In_Center'],
    arity: { min: 3, max: 3 },
    parameters: [parameter('a', 'point'), parameter('b', 'point'), parameter('c', 'point')],
    examples: ['ic = Incenter(A, B, C)'],
    support: support(['point'])
  },
  {
    canonicalName: 'Arc',
    type: 'arc',
    aliases: ['Arc'],
    arity: { min: 3, max: 3 },
    parameters: [parameter('center', 'point'), parameter('start', 'point'), parameter('end', 'point')],
    examples: ['arc = Arc(A, B, C)'],
    support: support(['geometry'])
  },
  {
    canonicalName: 'Sector',
    type: 'sector',
    aliases: ['Sector'],
    arity: { min: 3, max: 3 },
    parameters: [parameter('center', 'point'), parameter('start', 'point'), parameter('end', 'point')],
    examples: ['sector = Sector(A, B, C)'],
    support: support(['geometry'])
  },
  {
    canonicalName: 'Semicircle',
    type: 'semicircle',
    aliases: ['Semicircle'],
    arity: { min: 2, max: 2 },
    parameters: [parameter('a', 'point'), parameter('b', 'point')],
    examples: ['semi = Semicircle(A, B)'],
    support: support(['geometry'])
  },
  {
    canonicalName: 'Text',
    type: 'text',
    aliases: ['Text'],
    arity: { min: 2, max: 3 },
    parameters: [parameter('position', 'point'), parameter('content', 'string')],
    examples: ['label = Text(A, "origin")'],
    support: support(['text'])
  },
  {
    canonicalName: 'Function',
    type: 'function',
    aliases: ['Function'],
    arity: { min: 1, max: 3 },
    parameters: [parameter('expression', 'expression'), parameter('min', 'number', { optional: true }), parameter('max', 'number', { optional: true })],
    examples: ['f = Function("x^2", -2, 2)'],
    support: support(['function'], { capabilityIds: ['math.function.set-expression'] })
  },
  {
    canonicalName: 'Equation',
    type: 'equation',
    aliases: ['Equation'],
    arity: { min: 1, max: 1 },
    parameters: [parameter('expression', 'expression')],
    examples: ['eq = Equation("x^2 + y^2 = 1")'],
    support: support(['implicit'], { capabilityIds: ['math.equation.set-expression'] })
  },
  {
    canonicalName: 'Vector',
    type: 'vector',
    aliases: ['Vector'],
    arity: { min: 2, max: 2 },
    parameters: [parameter('start', 'point'), parameter('end', 'point')],
    examples: ['v = Vector(A, B)'],
    support: support(['vector'], { capabilityIds: ['math.vector.set-point'] })
  },
  {
    canonicalName: 'CoordinateSystem',
    type: 'coordinate-system',
    aliases: ['CoordinateSystem', 'Coordinate_System'],
    arity: { min: 0, max: 1 },
    parameters: [parameter('dimension', 'string', { optional: true })],
    examples: ['cs = CoordinateSystem("plane")'],
    support: support(['coordinate-system'], { capabilityIds: ['math.coordinate-system.toggle-assist'] })
  },
  {
    canonicalName: 'Solid',
    type: 'solid',
    aliases: ['Solid'],
    arity: { min: 0, variadic: true },
    parameters: [parameter('family', 'solid-family', { optional: true }), parameter('parameters', 'keyword-argument', { variadic: true })],
    examples: ['cube = Solid("cube", size=2)'],
    support: support(['solid'], { capabilityIds: ['math.solid.toggle-section'] })
  },
  {
    canonicalName: 'PerpendicularLine',
    type: 'perpendicular-line',
    aliases: ['PerpendicularLine', 'Perpendicular_Line'],
    arity: { min: 2, max: 2 },
    parameters: [parameter('source', 'line-like'), parameter('through', 'point')],
    examples: ['p = PerpendicularLine(l, A)'],
    support: support(['line'])
  },
  {
    canonicalName: 'ParallelLine',
    type: 'parallel-line',
    aliases: ['ParallelLine', 'Parallel_Line'],
    arity: { min: 2, max: 2 },
    parameters: [parameter('source', 'line-like'), parameter('through', 'point')],
    examples: ['q = ParallelLine(l, B)'],
    support: support(['line'])
  },
  {
    canonicalName: 'Midpoint',
    type: 'midpoint',
    aliases: ['Midpoint'],
    arity: { min: 2, max: 2 },
    parameters: [parameter('a', 'point'), parameter('b', 'point')],
    examples: ['M = Midpoint(A, B)'],
    support: support(['point'])
  },
  {
    canonicalName: 'Tangent',
    type: 'tangent',
    aliases: ['Tangent'],
    arity: { min: 2, max: 2 },
    parameters: [parameter('point', 'point'), parameter('function', 'function')],
    examples: ['t = Tangent(A, f)'],
    support: support(['line'])
  },
  {
    canonicalName: 'Derivative',
    type: 'derivative',
    aliases: ['Derivative'],
    arity: { min: 1, max: 1 },
    parameters: [parameter('function', 'function')],
    examples: ['df = Derivative(f)'],
    support: support(['function'])
  },
  {
    canonicalName: 'Intersect',
    type: 'intersection',
    aliases: ['Intersect', 'Intersection'],
    arity: { min: 2, max: 2 },
    parameters: [parameter('left', 'object'), parameter('right', 'object')],
    examples: ['I = Intersect(l, m)'],
    support: support(['point'], { notes: 'Multiple intersections return a typed ambiguity diagnostic until selector syntax is added.' })
  },
  {
    canonicalName: 'Angle',
    type: 'angle',
    aliases: ['Angle'],
    arity: { min: 3, max: 3 },
    parameters: [parameter('a', 'point'), parameter('vertex', 'point'), parameter('c', 'point')],
    examples: ['ang = Angle(A, B, C)'],
    support: support(['measurement'])
  },
  {
    canonicalName: 'Translate',
    type: 'translated',
    aliases: ['Translate', 'Translated'],
    arity: { min: 2, max: 3 },
    parameters: [parameter('object', 'object'), parameter('dxOrVector', ['number', 'vector']), parameter('dy', 'number', { optional: true })],
    examples: ['shifted = Translate(A, 1, 2)'],
    support: support(['transform'])
  },
  {
    canonicalName: 'Rotate',
    type: 'rotated',
    aliases: ['Rotate', 'Rotated'],
    arity: { min: 2, max: 3 },
    parameters: [parameter('object', 'object'), parameter('angleRadians', 'number'), parameter('center', 'point', { optional: true })],
    examples: ['rotated = Rotate(A, 1.5707963267948966, B)'],
    support: support(['transform'])
  },
  {
    canonicalName: 'Distance',
    type: 'distance',
    aliases: ['Distance'],
    arity: { min: 2, max: 2 },
    parameters: [parameter('a', 'point'), parameter('b', 'point')],
    examples: ['d = Distance(A, B)'],
    support: support(['measurement'])
  },
  {
    canonicalName: 'Length',
    type: 'length',
    aliases: ['Length'],
    arity: { min: 1, max: 2 },
    parameters: [parameter('objectOrStart', 'object'), parameter('end', 'point', { optional: true })],
    examples: ['len = Length(s)', 'len = Length(A, B)'],
    support: support(['measurement'])
  },
  {
    canonicalName: 'Area',
    type: 'area',
    aliases: ['Area'],
    arity: { min: 1, max: 1 },
    parameters: [parameter('object', 'object')],
    examples: ['area = Area(poly)'],
    support: support(['measurement'])
  },
  {
    canonicalName: 'Slope',
    type: 'slope',
    aliases: ['Slope'],
    arity: { min: 1, max: 1 },
    parameters: [parameter('line', 'line-like')],
    examples: ['m = Slope(l)'],
    support: support(['measurement'])
  }
] as const;

export const normalizeGraphCommandCatalogKey = (name: string): string => name.replace(/[-_\s]/g, '').toLowerCase();

export const GRAPH_COMMAND_CATALOG_BY_ALIAS: ReadonlyMap<string, GraphCommandCatalogEntry> = new Map(
  GRAPH_COMMAND_CATALOG.flatMap((entry) => (
    [entry.canonicalName, ...entry.aliases].map((alias) => [normalizeGraphCommandCatalogKey(alias), entry] as const)
  ))
);

export const getGraphCommandCatalogEntry = (name: string): GraphCommandCatalogEntry | null => (
  GRAPH_COMMAND_CATALOG_BY_ALIAS.get(normalizeGraphCommandCatalogKey(name)) ?? null
);

export const listGraphCommandCatalog = (): GraphCommandCatalogEntry[] => (
  GRAPH_COMMAND_CATALOG.map((entry) => ({
    ...entry,
    aliases: [...entry.aliases],
    parameters: entry.parameters.map((entryParameter) => ({
      ...entryParameter,
      type: Array.isArray(entryParameter.type) ? [...entryParameter.type] : entryParameter.type
    })),
    examples: [...entry.examples],
    support: {
      ...entry.support,
      coreIrTypes: [...entry.support.coreIrTypes],
      capabilityIds: entry.support.capabilityIds ? [...entry.support.capabilityIds] : undefined
    }
  }))
);
