import {
  createGraphCapabilitiesForObject,
  createGraphObjectNode,
  errorResult,
  okResult,
  type GraphObjectNode,
  type GraphOperationDiagnostic,
  type GraphOperationResult
} from '@vuegraphx/core';
import {
  circleFromCenterPoint,
  circleFromThreePoints,
  distance2D,
  incenter2D,
  incircleFromTriangle,
  intersectCircles2D,
  intersectLineCircle2D,
  intersectLines2D,
  lineFromPoints,
  midpoint2D,
  parallelogramFromThreePoints,
  point2D,
  polygonArea,
  polygonCentroid,
  polygonFromVertices,
  polylineFromPoints,
  rayFromPoints,
  regularPolygonFromSide,
  rotatePoint2D,
  arcFromCenterPoints,
  circumcenter2D,
  sectorFromCenterPoints,
  segmentFromPoints,
  semicircleFromDiameterPoints,
  translatePoint2D,
  type MathPoint2D
} from '@vuegraphx/math';
import {
  createDerivativeDescriptor,
  createEquationDescriptor,
  createFunctionDescriptor,
  createSolidDescriptor,
  evaluateFunctionDescriptor,
  getSolidDefaultParameters,
  type GraphFunctionDescriptor,
  type GraphSolidFamily
} from '@vuegraphx/math';

export type GraphCommandNodeType =
  | 'point'
  | 'line'
  | 'ray'
  | 'segment'
  | 'circle'
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
  | 'rotated';

export interface GraphCommandCompileOptions {
  symbols?: GraphCommandSymbolTable;
  defaultLayerId?: GraphObjectNode['layerId'];
  renderHints?: Record<string, unknown>;
  meta?: Record<string, unknown>;
}

export interface GraphCommandCompileValue {
  node: GraphObjectNode;
  symbols: GraphCommandSymbolTable;
}

export interface GraphExpressionCompileOptions extends GraphCommandCompileOptions {
  id?: string;
  fallbackToLegacy?: boolean;
}

export type GraphCommandSymbolTable = Map<string, GraphObjectNode>;

export interface GraphCommandProgramResult {
  nodes: GraphObjectNode[];
  symbols: GraphCommandSymbolTable;
  diagnostics: GraphOperationDiagnostic[];
}

interface ResolvedPoint {
  point: MathPoint2D;
  dependency?: string;
}

interface InvocationInstruction {
  name: string;
  type: string;
  args: string[];
}

interface TupleInstruction {
  values: string[];
}

interface BracketScanState {
  depth: number;
  quote: '"' | '\'' | null;
  escaped: boolean;
}

const COMMAND_TYPE_ALIASES: Record<string, GraphCommandNodeType> = {
  point: 'point',
  line: 'line',
  ray: 'ray',
  segment: 'segment',
  circle: 'circle',
  polygon: 'polygon',
  polyline: 'polyline',
  polygonalchain: 'polyline',
  regularpolygon: 'regular-polygon',
  regular_polygon: 'regular-polygon',
  parallelogram: 'parallelogram',
  circumcircle: 'circumcircle',
  circum_circle: 'circumcircle',
  incircle: 'incircle',
  in_circle: 'incircle',
  circumcenter: 'circumcenter',
  circum_center: 'circumcenter',
  incenter: 'incenter',
  in_center: 'incenter',
  arc: 'arc',
  sector: 'sector',
  semicircle: 'semicircle',
  text: 'text',
  function: 'function',
  equation: 'equation',
  vector: 'vector',
  coordinatesystem: 'coordinate-system',
  coordinate_system: 'coordinate-system',
  solid: 'solid',
  perpendicularline: 'perpendicular-line',
  perpendicular_line: 'perpendicular-line',
  parallelline: 'parallel-line',
  parallel_line: 'parallel-line',
  midpoint: 'midpoint',
  tangent: 'tangent',
  derivative: 'derivative',
  intersect: 'intersection',
  intersection: 'intersection',
  angle: 'angle',
  translate: 'translated',
  translated: 'translated',
  rotate: 'rotated',
  rotated: 'rotated'
};

const createBracketScanState = (): BracketScanState => ({
  depth: 0,
  quote: null,
  escaped: false
});

const consumeBracketAwareChar = (state: BracketScanState, char: string): void => {
  if (state.quote) {
    if (state.escaped) {
      state.escaped = false;
      return;
    }
    if (char === '\\') {
      state.escaped = true;
      return;
    }
    if (char === state.quote) {
      state.quote = null;
    }
    return;
  }

  if (char === '"' || char === '\'') {
    state.quote = char;
    return;
  }

  if (char === '(' || char === '[' || char === '{') state.depth += 1;
  if (char === ')' || char === ']' || char === '}') state.depth -= 1;
};

const normalizeCommandType = (type: string): GraphCommandNodeType | null => COMMAND_TYPE_ALIASES[type.replace(/[-\s]/g, '').toLowerCase()] ?? null;

const stripQuotes = (value: string): string => {
  const trimmed = value.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
};

const parseNumber = (value: string): number | null => {
  const numeric = Number(stripQuotes(value));
  return Number.isFinite(numeric) ? numeric : null;
};

const hasBalancedBrackets = (input: string): boolean => {
  const state = createBracketScanState();
  for (const char of input) {
    if (state.quote) {
      if (state.escaped) {
        state.escaped = false;
        continue;
      }
      if (char === '\\') {
        state.escaped = true;
        continue;
      }
      if (char === state.quote) {
        state.quote = null;
      }
      continue;
    }

    consumeBracketAwareChar(state, char);
    if (state.depth < 0) return false;
  }
  return state.depth === 0 && state.quote === null && !state.escaped;
};

const splitTopLevelArgs = (input: string): string[] => {
  const args: string[] = [];
  let current = '';
  const state = createBracketScanState();

  for (const char of input) {
    if (state.quote) {
      current += char;
      if (state.escaped) {
        state.escaped = false;
      } else if (char === '\\') {
        state.escaped = true;
      } else if (char === state.quote) {
        state.quote = null;
      }
      continue;
    }

    if (char === '"' || char === '\'') {
      state.quote = char;
      current += char;
      continue;
    }

    if (char === '(' || char === '[' || char === '{') state.depth += 1;
    else if (char === ')' || char === ']' || char === '}') state.depth -= 1;
    else if (char === ',' && state.depth === 0) {
      args.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }

  if (current.trim()) args.push(current.trim());
  return args;
};

const parseInvocation = (expr: string): InvocationInstruction | null => {
  const match = expr.match(/^(?:([a-zA-Z_]\w*)\s*=\s*)?([a-zA-Z_]\w*)\s*\((.*)\)$/);
  if (!match) return null;

  const argsString = match[3] || '';
  if (!hasBalancedBrackets(argsString)) return null;

  return {
    name: match[1] || '',
    type: (match[2] || '').trim(),
    args: splitTopLevelArgs(argsString)
  };
};

export const normalizeLegacyGraphExpression = (expression: string): string | null => {
  const trimmed = expression.trim();
  const tupleAssignment = trimmed.match(/^([a-zA-Z_]\w*)\s*=\s*\((.*)\)$/);
  if (tupleAssignment) return `${tupleAssignment[1]} = Point(${tupleAssignment[2]})`;

  if (/^(?:[a-zA-Z_]\w*\s*=\s*)?[a-zA-Z_]\w*\s*\(.*\)$/.test(trimmed)) {
    return trimmed;
  }

  return null;
};

const parseTuple = (expr: string): TupleInstruction | null => {
  if (/^\s*[a-zA-Z_]\w*\s*\([^)]*\)\s*=/.test(expr)) {
    return null;
  }

  const match = expr.match(/^(?:([a-zA-Z_]\w*)\s*=?\s*)?\((.*)\)$/);
  if (!match) return null;

  const tupleBody = match[2] || '';
  if (!hasBalancedBrackets(tupleBody)) return null;

  const values = splitTopLevelArgs(tupleBody);
  return values.length < 2 ? null : { values };
};

const parseInlinePoint = (value: string): MathPoint2D | null => {
  const tuple = parseTuple(value.trim());
  if (!tuple || tuple.values.length !== 2) return null;
  const x = parseNumber(tuple.values[0]);
  const y = parseNumber(tuple.values[1]);
  return x === null || y === null ? null : point2D(x, y);
};

const getPointPayload = (node: GraphObjectNode): MathPoint2D | null => {
  const payload = node.payload as Record<string, unknown> | undefined;
  const point = payload?.point;
  if (typeof point !== 'object' || point === null) return null;
  const x = (point as Record<string, unknown>).x;
  const y = (point as Record<string, unknown>).y;
  return typeof x === 'number' && typeof y === 'number' ? { x, y } : null;
};

const resolvePoint = (arg: string, symbols: GraphCommandSymbolTable): ResolvedPoint | null => {
  const inline = parseInlinePoint(arg);
  if (inline) return { point: inline };

  const symbol = symbols.get(arg.trim());
  if (!symbol) return null;
  const point = getPointPayload(symbol);
  return point ? { point, dependency: symbol.id } : null;
};

const resolvePointList = (args: readonly string[], symbols: GraphCommandSymbolTable): ResolvedPoint[] | null => {
  const points = args.map((arg) => resolvePoint(arg, symbols));
  return points.every((point): point is ResolvedPoint => !!point) ? points : null;
};

const invalidCommand = (message: string): GraphOperationResult<never> => errorResult('commands.invalid-command', message);

const dependencyIds = (points: readonly ResolvedPoint[]): string[] => [...new Set(points.map((point) => point.dependency).filter((id): id is string => !!id))];

export const compileGraphCommand = (
  command: string,
  options: GraphCommandCompileOptions = {}
): GraphOperationResult<GraphCommandCompileValue> => {
  const symbols = new Map(options.symbols ?? []);
  const invocation = parseInvocation(command.trim());
  if (!invocation) {
    return invalidCommand(`Unsupported command syntax: ${command}`);
  }

  const type = normalizeCommandType(invocation.type);
  if (!type) {
    return invalidCommand(`Unsupported command type: ${invocation.type}`);
  }

  const id = invocation.name || `${type}-${symbols.size + 1}`;
  const nodeResult = buildCommandNode(id, type, invocation.args, symbols, options.defaultLayerId ?? 'content');
  if (!nodeResult.ok || !nodeResult.value) {
    return { ok: false, diagnostics: nodeResult.diagnostics };
  }

  const node = createGraphObjectNode({
    ...nodeResult.value,
    renderHints: options.renderHints ? { ...options.renderHints, ...(nodeResult.value.renderHints ?? {}) } : nodeResult.value.renderHints,
    meta: options.meta ? { ...options.meta, ...(nodeResult.value.meta ?? {}) } : nodeResult.value.meta,
    capabilities: createGraphCapabilitiesForObject(nodeResult.value)
  });
  symbols.set(id, node);
  return okResult({ node, symbols });
};

export const compileGraphExpression = (
  expression: string,
  options: GraphExpressionCompileOptions = {}
): GraphOperationResult<GraphCommandCompileValue> => {
  const trimmed = expression.trim();
  if (!trimmed) return invalidCommand('Expression must be non-empty.');

  const graphCommand = normalizeLegacyGraphExpression(trimmed);
  if (graphCommand) {
    const compiled = compileGraphCommand(graphCommand, options);
    if (compiled.ok || options.fallbackToLegacy === false) {
      return compiled;
    }
  }

  const semanticNode = buildSemanticExpressionNode(trimmed, options);
  if (semanticNode) {
    const symbols = new Map(options.symbols ?? []);
    symbols.set(semanticNode.id, semanticNode);
    return okResult({ node: semanticNode, symbols });
  }

  if (options.fallbackToLegacy !== false) {
    const symbols = new Map(options.symbols ?? []);
    const id = options.id ?? `legacy-${symbols.size + 1}`;
    const node = createGraphObjectNode({
      id,
      kind: 'command',
      type: 'legacy-expression',
      payload: { expression: trimmed },
      layerId: options.defaultLayerId ?? 'content',
      renderHints: options.renderHints ? { ...options.renderHints } : undefined,
      meta: {
        ...(options.meta ?? {}),
        compiler: 'legacy-fallback'
      }
    });
    symbols.set(id, node);
    return okResult({ node, symbols });
  }

  return invalidCommand(`Unsupported expression syntax: ${expression}`);
};

export const compileGraphCommands = (
  commands: readonly string[],
  options: GraphCommandCompileOptions = {}
): GraphCommandProgramResult => {
  let symbols = new Map(options.symbols ?? []);
  const nodes: GraphObjectNode[] = [];
  const diagnostics: GraphOperationDiagnostic[] = [];

  for (const command of commands) {
    const result = compileGraphCommand(command, { ...options, symbols });
    if (result.ok && result.value) {
      symbols = result.value.symbols;
      nodes.push(result.value.node);
    } else {
      diagnostics.push(...result.diagnostics);
    }
  }

  return { nodes, symbols, diagnostics };
};

const buildCommandNode = (
  id: string,
  type: GraphCommandNodeType,
  args: readonly string[],
  symbols: GraphCommandSymbolTable,
  layerId: GraphObjectNode['layerId']
): GraphOperationResult<GraphObjectNode> => {
  switch (type) {
    case 'point':
      return buildPointNode(id, args, layerId);
    case 'line':
      return buildTwoPointNode(id, type, args, symbols, layerId, (points) => ({ geometry: lineFromPoints(points[0].point, points[1].point) }));
    case 'ray':
      return buildTwoPointNode(id, type, args, symbols, layerId, (points) => ({ geometry: rayFromPoints(points[0].point, points[1].point) }));
    case 'segment':
      return buildTwoPointNode(id, type, args, symbols, layerId, (points) => ({ geometry: segmentFromPoints(points[0].point, points[1].point), length: distance2D(points[0].point, points[1].point) }));
    case 'vector':
      return buildTwoPointNode(id, type, args, symbols, layerId, (points) => ({ start: points[0].point, end: points[1].point, vector: { x: points[1].point.x - points[0].point.x, y: points[1].point.y - points[0].point.y } }));
    case 'circle':
      return buildCircleNode(id, args, symbols, layerId);
    case 'polygon':
      return buildPolygonNode(id, args, symbols, layerId);
    case 'polyline':
      return buildPolylineNode(id, args, symbols, layerId);
    case 'regular-polygon':
      return buildRegularPolygonNode(id, args, symbols, layerId);
    case 'parallelogram':
      return buildThreePointDerivedNode(args, symbols, 'Parallelogram', (points) => {
        const geometry = parallelogramFromThreePoints(points[0].point, points[1].point, points[2].point);
        return createBaseNode(id, 'polygon', { geometry, area: polygonArea(geometry), centroid: polygonCentroid(geometry) }, dependencyIds(points), layerId);
      });
    case 'circumcircle':
      return buildThreePointDerivedNode(args, symbols, 'Circumcircle', (points) => {
        const geometry = circleFromThreePoints(points[0].point, points[1].point, points[2].point);
        return geometry ? createBaseNode(id, 'circle', { geometry }, dependencyIds(points), layerId) : null;
      });
    case 'incircle':
      return buildThreePointDerivedNode(args, symbols, 'Incircle', (points) => {
        const geometry = incircleFromTriangle(points[0].point, points[1].point, points[2].point);
        return geometry ? createBaseNode(id, 'circle', { geometry }, dependencyIds(points), layerId) : null;
      });
    case 'circumcenter':
      return buildThreePointDerivedNode(args, symbols, 'Circumcenter', (points) => {
        const point = circumcenter2D(points[0].point, points[1].point, points[2].point);
        return point ? createBaseNode(id, 'point', { point }, dependencyIds(points), layerId) : null;
      });
    case 'incenter':
      return buildThreePointDerivedNode(args, symbols, 'Incenter', (points) => {
        const point = incenter2D(points[0].point, points[1].point, points[2].point);
        return point ? createBaseNode(id, 'point', { point }, dependencyIds(points), layerId) : null;
      });
    case 'arc':
      return buildThreePointGeometryNode(id, type, args, symbols, layerId, (points) => ({ geometry: arcFromCenterPoints(points[0].point, points[1].point, points[2].point) }));
    case 'sector':
      return buildThreePointGeometryNode(id, type, args, symbols, layerId, (points) => ({ geometry: sectorFromCenterPoints(points[0].point, points[1].point, points[2].point) }));
    case 'semicircle':
      return buildTwoPointNode(id, type, args, symbols, layerId, (points) => ({ geometry: semicircleFromDiameterPoints(points[0].point, points[1].point) }));
    case 'text':
      return buildTextNode(id, args, symbols, layerId);
    case 'function':
      return buildFunctionNode(id, args, layerId);
    case 'equation':
      return buildEquationNode(id, args, layerId);
    case 'coordinate-system':
      return okResult(createBaseNode(id, type, { dimension: stripQuotes(args[0] ?? 'plane') }, [], layerId));
    case 'solid':
      return buildSolidNode(id, args, layerId);
    case 'perpendicular-line':
      return buildPerpendicularLineNode(id, args, symbols, layerId);
    case 'parallel-line':
      return buildParallelLineNode(id, args, symbols, layerId);
    case 'midpoint':
      return buildMidpointNode(id, args, symbols, layerId);
    case 'tangent':
      return buildTangentNode(id, args, symbols, layerId);
    case 'derivative':
      return buildDerivativeNode(id, args, symbols, layerId);
    case 'intersection':
      return buildIntersectionNode(id, args, symbols, layerId);
    case 'angle':
      return buildAngleNode(id, args, symbols, layerId);
    case 'translated':
      return buildTranslatedNode(id, args, symbols, layerId);
    case 'rotated':
      return buildRotatedNode(id, args, symbols, layerId);
  }
};

const buildSemanticExpressionNode = (
  expression: string,
  options: GraphExpressionCompileOptions
): GraphObjectNode | null => {
  const layerId = options.defaultLayerId ?? 'content';
  const functionAssignment = expression.match(/^([a-zA-Z_]\w*)\s*\(\s*([a-zA-Z_]\w*)\s*\)\s*=\s*(.+)$/);
  if (functionAssignment) {
    const id = options.id ?? functionAssignment[1];
    return createSemanticNode(id, 'function', createFunctionDescriptor(functionAssignment[3].trim(), undefined, functionAssignment[2].trim()), layerId, options);
  }

  const yAssignment = expression.match(/^y\s*=\s*(.+)$/i);
  if (yAssignment) {
    const id = options.id ?? 'y';
    return createSemanticNode(id, 'function', createFunctionDescriptor(yAssignment[1].trim(), undefined, 'x'), layerId, options);
  }

  const equation = expression.match(/^(.+)=\s*(.+)$/);
  if (equation && !/^[a-zA-Z_]\w*\s*=/.test(expression)) {
    const id = options.id ?? `equation-${Math.abs(hashExpression(expression))}`;
    return createSemanticNode(id, 'equation', createEquationDescriptor(expression), layerId, options);
  }

  const variable = expression.match(/^([a-zA-Z_]\w*)\s*=\s*(.+)$/);
  if (variable) {
    const numeric = parseNumber(variable[2]);
    const id = options.id ?? variable[1];
    return createGraphObjectNode({
      id,
      kind: 'command',
      type: 'variable',
      payload: {
        name: variable[1],
        value: numeric ?? stripQuotes(variable[2]),
        expression: variable[2].trim()
      },
      layerId,
      renderHints: options.renderHints ? { ...options.renderHints } : undefined,
      meta: options.meta ? { ...options.meta } : undefined
    });
  }

  if (/[xy]/.test(expression)) {
    const id = options.id ?? `function-${Math.abs(hashExpression(expression))}`;
    return createSemanticNode(id, 'function', createFunctionDescriptor(expression, undefined, 'x'), layerId, options);
  }

  return null;
};

const createSemanticNode = (
  id: string,
  type: 'function' | 'equation',
  payload: unknown,
  layerId: GraphObjectNode['layerId'],
  options: GraphExpressionCompileOptions
): GraphObjectNode => {
  const node = createGraphObjectNode({
    id,
    kind: 'shape',
    type,
    payload,
    layerId,
    renderHints: options.renderHints ? { ...options.renderHints } : undefined,
    meta: options.meta ? { ...options.meta } : undefined
  });
  return {
    ...node,
    capabilities: createGraphCapabilitiesForObject(node)
  };
};

const hashExpression = (expression: string): number => {
  let hash = 0;
  for (let index = 0; index < expression.length; index += 1) {
    hash = ((hash << 5) - hash + expression.charCodeAt(index)) | 0;
  }
  return hash;
};

const createBaseNode = (
  id: string,
  type: GraphCommandNodeType,
  payload: unknown,
  dependencies: string[],
  layerId: GraphObjectNode['layerId']
): GraphObjectNode => ({
  id,
  kind: type === 'text'
    ? 'overlay'
    : ['perpendicular-line', 'parallel-line', 'tangent', 'intersection', 'angle', 'translated', 'rotated'].includes(type)
    ? 'relation'
    : 'shape',
  type,
  payload,
  dependencies,
  layerId
});

const buildPointNode = (id: string, args: readonly string[], layerId: GraphObjectNode['layerId']): GraphOperationResult<GraphObjectNode> => {
  if (args.length !== 2) return invalidCommand('Point requires exactly two numeric arguments.');
  const x = parseNumber(args[0]);
  const y = parseNumber(args[1]);
  if (x === null || y === null) return invalidCommand('Point arguments must be finite numbers.');
  return okResult(createBaseNode(id, 'point', { point: point2D(x, y) }, [], layerId));
};

const buildTwoPointNode = (
  id: string,
  type: 'line' | 'ray' | 'segment' | 'vector' | 'semicircle',
  args: readonly string[],
  symbols: GraphCommandSymbolTable,
  layerId: GraphObjectNode['layerId'],
  createPayload: (points: readonly [ResolvedPoint, ResolvedPoint]) => unknown
): GraphOperationResult<GraphObjectNode> => {
  if (args.length !== 2) return invalidCommand(`${type} requires exactly two point arguments.`);
  const points = resolvePointList(args, symbols);
  if (!points || points.length !== 2) return invalidCommand(`${type} arguments must reference known points or inline tuples.`);
  const pair = [points[0], points[1]] as const;
  return okResult(createBaseNode(id, type, createPayload(pair), dependencyIds(pair), layerId));
};

const buildThreePointGeometryNode = (
  id: string,
  type: 'arc' | 'sector',
  args: readonly string[],
  symbols: GraphCommandSymbolTable,
  layerId: GraphObjectNode['layerId'],
  createPayload: (points: readonly [ResolvedPoint, ResolvedPoint, ResolvedPoint]) => unknown
): GraphOperationResult<GraphObjectNode> => {
  if (args.length !== 3) return invalidCommand(`${type} requires exactly three point arguments.`);
  const points = resolvePointList(args, symbols);
  if (!points || points.length !== 3) return invalidCommand(`${type} arguments must reference known points or inline tuples.`);
  const triple = [points[0], points[1], points[2]] as const;
  return okResult(createBaseNode(id, type, createPayload(triple), dependencyIds(triple), layerId));
};

const buildCircleNode = (
  id: string,
  args: readonly string[],
  symbols: GraphCommandSymbolTable,
  layerId: GraphObjectNode['layerId']
): GraphOperationResult<GraphObjectNode> => {
  if (args.length !== 2) return invalidCommand('Circle requires a center point plus point or radius.');
  const center = resolvePoint(args[0], symbols);
  if (!center) return invalidCommand('Circle center must reference a known point or inline tuple.');

  const radius = parseNumber(args[1]);
  if (radius !== null) {
    return okResult(createBaseNode(id, 'circle', { geometry: { kind: 'circle', center: center.point, radius } }, dependencyIds([center]), layerId));
  }

  const edge = resolvePoint(args[1], symbols);
  if (!edge) return invalidCommand('Circle second argument must be a finite radius or point.');
  return okResult(createBaseNode(id, 'circle', { geometry: circleFromCenterPoint(center.point, edge.point) }, dependencyIds([center, edge]), layerId));
};

const buildPolygonNode = (
  id: string,
  args: readonly string[],
  symbols: GraphCommandSymbolTable,
  layerId: GraphObjectNode['layerId']
): GraphOperationResult<GraphObjectNode> => {
  if (args.length < 3) return invalidCommand('Polygon requires at least three points.');
  const points = resolvePointList(args, symbols);
  if (!points) return invalidCommand('Polygon arguments must reference known points or inline tuples.');
  const geometry = polygonFromVertices(points.map((point) => point.point));
  return okResult(createBaseNode(id, 'polygon', {
    geometry,
    area: polygonArea(geometry),
    centroid: polygonCentroid(geometry)
  }, dependencyIds(points), layerId));
};

const buildPolylineNode = (
  id: string,
  args: readonly string[],
  symbols: GraphCommandSymbolTable,
  layerId: GraphObjectNode['layerId']
): GraphOperationResult<GraphObjectNode> => {
  if (args.length < 2) return invalidCommand('Polyline requires at least two points.');
  const points = resolvePointList(args, symbols);
  if (!points) return invalidCommand('Polyline arguments must reference known points or inline tuples.');
  return okResult(createBaseNode(id, 'polyline', {
    geometry: polylineFromPoints(points.map((point) => point.point))
  }, dependencyIds(points), layerId));
};

const buildRegularPolygonNode = (
  id: string,
  args: readonly string[],
  symbols: GraphCommandSymbolTable,
  layerId: GraphObjectNode['layerId']
): GraphOperationResult<GraphObjectNode> => {
  if (args.length !== 3) return invalidCommand('RegularPolygon requires two points and an integer side count.');
  const points = resolvePointList(args.slice(0, 2), symbols);
  const sides = parseNumber(args[2]);
  if (!points || points.length !== 2 || sides === null || !Number.isInteger(sides) || sides < 3) {
    return invalidCommand('RegularPolygon arguments must be two known points plus an integer side count >= 3.');
  }
  const geometry = regularPolygonFromSide(points[0].point, points[1].point, sides);
  if (!geometry) return invalidCommand('RegularPolygon cannot be built from coincident side points.');
  return okResult(createBaseNode(id, 'polygon', {
    geometry,
    area: polygonArea(geometry),
    centroid: polygonCentroid(geometry),
    sideCount: sides
  }, dependencyIds(points), layerId));
};

const buildThreePointDerivedNode = (
  args: readonly string[],
  symbols: GraphCommandSymbolTable,
  label: string,
  createNode: (points: readonly [ResolvedPoint, ResolvedPoint, ResolvedPoint]) => GraphObjectNode | null
): GraphOperationResult<GraphObjectNode> => {
  if (args.length !== 3) return invalidCommand(`${label} requires exactly three point arguments.`);
  const points = resolvePointList(args, symbols);
  if (!points || points.length !== 3) return invalidCommand(`${label} arguments must reference known points or inline tuples.`);
  const triple = [points[0], points[1], points[2]] as const;
  const node = createNode(triple);
  return node
    ? okResult(node)
    : invalidCommand(`${label} cannot be constructed from collinear or degenerate points.`);
};

const buildTextNode = (
  id: string,
  args: readonly string[],
  symbols: GraphCommandSymbolTable,
  layerId: GraphObjectNode['layerId']
): GraphOperationResult<GraphObjectNode> => {
  if (args.length < 2) return invalidCommand('Text requires a point/x,y and text value.');
  const firstPoint = resolvePoint(args[0], symbols);
  const point = firstPoint ?? (
    args.length >= 3
      ? (() => {
          const x = parseNumber(args[0]);
          const y = parseNumber(args[1]);
          return x === null || y === null ? null : { point: point2D(x, y) };
        })()
      : null
  );
  if (!point) return invalidCommand('Text position must be a known point, inline tuple, or x,y coordinates.');
  const textArg = firstPoint ? args[1] : args[2];
  const text = stripQuotes(textArg ?? '');
  if (!text) return invalidCommand('Text value must be non-empty.');
  return okResult(createBaseNode(id, 'text', {
    point: point.point,
    text
  }, dependencyIds([point]), layerId));
};

const buildFunctionNode = (id: string, args: readonly string[], layerId: GraphObjectNode['layerId']): GraphOperationResult<GraphObjectNode> => {
  if (args.length < 1) return invalidCommand('Function requires an expression.');
  const min = args[1] === undefined ? null : parseNumber(args[1]);
  const max = args[2] === undefined ? null : parseNumber(args[2]);
  const domain = min !== null && max !== null ? [min, max] as [number, number] : undefined;
  return okResult(createBaseNode(id, 'function', createFunctionDescriptor(stripQuotes(args[0]), domain), [], layerId));
};

const buildEquationNode = (id: string, args: readonly string[], layerId: GraphObjectNode['layerId']): GraphOperationResult<GraphObjectNode> => {
  if (args.length < 1) return invalidCommand('Equation requires an expression.');
  return okResult(createBaseNode(id, 'equation', createEquationDescriptor(stripQuotes(args[0])), [], layerId));
};

const buildSolidNode = (id: string, args: readonly string[], layerId: GraphObjectNode['layerId']): GraphOperationResult<GraphObjectNode> => {
  const family = stripQuotes(args[0] ?? 'cube') as GraphSolidFamily;
  const parameters = getSolidDefaultParameters(family);
  const origin: { x?: number; y?: number; z?: number } = {};
  for (const arg of args.slice(1)) {
    const [key, rawValue] = arg.split('=').map((entry) => entry.trim());
    const value = rawValue === undefined ? null : parseNumber(rawValue);
    if (key && value !== null) {
      if (key === 'x' || key === 'y' || key === 'z') origin[key] = value;
      else parameters[key] = value;
    }
  }
  return okResult(createBaseNode(
    id,
    'solid',
    createSolidDescriptor(
      family,
      parameters,
      typeof origin.x === 'number' || typeof origin.y === 'number' || typeof origin.z === 'number'
        ? { x: origin.x ?? 0, y: origin.y ?? 0, z: origin.z ?? 0 }
        : undefined
    ),
    [],
    layerId
  ));
};

const buildPerpendicularLineNode = (
  id: string,
  args: readonly string[],
  symbols: GraphCommandSymbolTable,
  layerId: GraphObjectNode['layerId']
): GraphOperationResult<GraphObjectNode> => {
  if (args.length !== 2) return invalidCommand('PerpendicularLine requires a source object and point.');
  const source = symbols.get(args[0].trim());
  const point = resolvePoint(args[1], symbols);
  if (!source || !point) return invalidCommand('PerpendicularLine requires a known source object and point.');
  const line = lineGeometryFromNode(source);
  if (!line) return invalidCommand('PerpendicularLine source must be a line-like object.');
  const direction = { x: -line.direction.y, y: line.direction.x };
  return okResult(createBaseNode(id, 'perpendicular-line', {
    relation: 'perpendicular',
    sourceObjectId: source.id,
    through: point.point,
    geometry: { kind: 'line', point: point.point, direction }
  }, dependencyIds([point, { point: point.point, dependency: source.id }]), layerId));
};

const buildParallelLineNode = (
  id: string,
  args: readonly string[],
  symbols: GraphCommandSymbolTable,
  layerId: GraphObjectNode['layerId']
): GraphOperationResult<GraphObjectNode> => {
  if (args.length !== 2) return invalidCommand('ParallelLine requires a source object and point.');
  const source = symbols.get(args[0].trim());
  const point = resolvePoint(args[1], symbols);
  const line = source ? lineGeometryFromNode(source) : null;
  if (!source || !point || !line) return invalidCommand('ParallelLine requires a known line-like source object and point.');
  return okResult(createBaseNode(id, 'parallel-line', {
    relation: 'parallel',
    sourceObjectId: source.id,
    through: point.point,
    geometry: { kind: 'line', point: point.point, direction: line.direction }
  }, dependencyIds([point, { point: point.point, dependency: source.id }]), layerId));
};

const buildMidpointNode = (
  id: string,
  args: readonly string[],
  symbols: GraphCommandSymbolTable,
  layerId: GraphObjectNode['layerId']
): GraphOperationResult<GraphObjectNode> => {
  if (args.length !== 2) return invalidCommand('Midpoint requires exactly two points.');
  const points = resolvePointList(args, symbols);
  if (!points || points.length !== 2) return invalidCommand('Midpoint arguments must reference known points or inline tuples.');
  return okResult(createBaseNode(id, 'midpoint', { point: midpoint2D(points[0].point, points[1].point) }, dependencyIds(points), layerId));
};

const buildTangentNode = (
  id: string,
  args: readonly string[],
  symbols: GraphCommandSymbolTable,
  layerId: GraphObjectNode['layerId']
): GraphOperationResult<GraphObjectNode> => {
  if (args.length !== 2) return invalidCommand('Tangent requires a point and a function.');
  const point = resolvePoint(args[0], symbols);
  const source = symbols.get(args[1].trim());
  const fn = source ? functionDescriptorFromNode(source) : null;
  if (!point || !source || !fn) return invalidCommand('Tangent requires a known point and function object.');
  const y = evaluateFunctionDescriptor(fn, point.point.x);
  const dy = evaluateFunctionDescriptor(createDerivativeDescriptor(fn), point.point.x);
  if (!Number.isFinite(y) || !Number.isFinite(dy)) return invalidCommand('Tangent function cannot be evaluated at the point x-coordinate.');
  const tangentPoint = { x: point.point.x, y };
  return okResult(createBaseNode(id, 'tangent', {
    relation: 'tangent',
    sourceObjectId: source.id,
    through: tangentPoint,
    slope: dy,
    geometry: { kind: 'line', point: tangentPoint, direction: { x: 1, y: dy } }
  }, dependencyIds([point, { point: point.point, dependency: source.id }]), layerId));
};

const buildDerivativeNode = (
  id: string,
  args: readonly string[],
  symbols: GraphCommandSymbolTable,
  layerId: GraphObjectNode['layerId']
): GraphOperationResult<GraphObjectNode> => {
  if (args.length !== 1) return invalidCommand('Derivative requires exactly one function argument.');
  const source = symbols.get(args[0].trim());
  const fn = source ? functionDescriptorFromNode(source) : null;
  if (!source || !fn) return invalidCommand('Derivative requires a known function object.');
  return okResult(createBaseNode(id, 'derivative', {
    ...createDerivativeDescriptor(fn),
    sourceObjectId: source.id
  }, [source.id], layerId));
};

const buildIntersectionNode = (
  id: string,
  args: readonly string[],
  symbols: GraphCommandSymbolTable,
  layerId: GraphObjectNode['layerId']
): GraphOperationResult<GraphObjectNode> => {
  if (args.length !== 2) return invalidCommand('Intersect requires two geometric objects.');
  const left = symbols.get(args[0].trim());
  const right = symbols.get(args[1].trim());
  if (!left || !right) return invalidCommand('Intersect arguments must reference known objects.');

  const leftLine = lineGeometryFromNode(left);
  const rightLine = lineGeometryFromNode(right);
  const leftCircle = circleGeometryFromNode(left);
  const rightCircle = circleGeometryFromNode(right);
  const intersection = leftLine && rightLine
    ? intersectLines2D(leftLine, rightLine)
    : leftLine && rightCircle
      ? intersectLineCircle2D(leftLine, rightCircle)
      : leftCircle && rightLine
        ? intersectLineCircle2D(rightLine, leftCircle)
        : leftCircle && rightCircle
          ? intersectCircles2D(leftCircle, rightCircle)
          : null;

  const points = intersectionToPoints(intersection);
  if (points.length === 0) return invalidCommand('Intersect could not find finite intersection points.');
  return okResult(createBaseNode(id, 'intersection', {
    point: points[0],
    points,
    sourceObjectIds: [left.id, right.id]
  }, [left.id, right.id], layerId));
};

const buildAngleNode = (
  id: string,
  args: readonly string[],
  symbols: GraphCommandSymbolTable,
  layerId: GraphObjectNode['layerId']
): GraphOperationResult<GraphObjectNode> => {
  if (args.length !== 3) return invalidCommand('Angle requires three points.');
  const points = resolvePointList(args, symbols);
  if (!points || points.length !== 3) return invalidCommand('Angle arguments must reference known points or inline tuples.');
  const [a, b, c] = points.map((point) => point.point);
  const left = { x: a.x - b.x, y: a.y - b.y };
  const right = { x: c.x - b.x, y: c.y - b.y };
  const angleRadians = Math.atan2(left.x * right.y - left.y * right.x, left.x * right.x + left.y * right.y);
  return okResult(createBaseNode(id, 'angle', {
    points: [a, b, c],
    vertex: b,
    radians: Math.abs(angleRadians),
    degrees: Math.abs(angleRadians) * 180 / Math.PI
  }, dependencyIds(points), layerId));
};

const buildTranslatedNode = (
  id: string,
  args: readonly string[],
  symbols: GraphCommandSymbolTable,
  layerId: GraphObjectNode['layerId']
): GraphOperationResult<GraphObjectNode> => {
  if (args.length < 2) return invalidCommand('Translate requires an object and a vector/delta.');
  const source = symbols.get(args[0].trim());
  if (!source) return invalidCommand('Translate source must reference a known object.');
  const delta = resolveTranslationDelta(args.slice(1), symbols);
  if (!delta) return invalidCommand('Translate requires dx,dy, vector object, or inline point delta.');
  const payload = transformPayload2D(source, (point) => translatePoint2D(point, delta));
  if (!payload) return invalidCommand('Translate currently supports point, line, ray, segment, circle, polygon, and vector objects.');
  return okResult(createBaseNode(id, 'translated', {
    ...payload,
    transform: { kind: 'translate', delta },
    sourceObjectId: source.id
  }, [source.id], layerId));
};

const buildRotatedNode = (
  id: string,
  args: readonly string[],
  symbols: GraphCommandSymbolTable,
  layerId: GraphObjectNode['layerId']
): GraphOperationResult<GraphObjectNode> => {
  if (args.length < 2) return invalidCommand('Rotate requires an object and angle in radians.');
  const source = symbols.get(args[0].trim());
  if (!source) return invalidCommand('Rotate source must reference a known object.');
  const angle = parseNumber(args[1]);
  if (angle === null) return invalidCommand('Rotate angle must be a finite number in radians.');
  const center = args[2] ? resolvePoint(args[2], symbols)?.point : { x: 0, y: 0 };
  if (!center) return invalidCommand('Rotate center must be a known point or inline tuple.');
  const payload = transformPayload2D(source, (point) => rotatePoint2D(point, angle, center));
  if (!payload) return invalidCommand('Rotate currently supports point, line, ray, segment, circle, polygon, and vector objects.');
  return okResult(createBaseNode(id, 'rotated', {
    ...payload,
    transform: { kind: 'rotate', angle, center },
    sourceObjectId: source.id
  }, [source.id], layerId));
};

const functionDescriptorFromNode = (node: GraphObjectNode): GraphFunctionDescriptor | null => {
  const payload = asRecord(node.payload);
  if (typeof payload?.expression !== 'string') return null;
  return {
    expression: payload.expression,
    variable: typeof payload.variable === 'string' ? payload.variable : 'x',
    domain: Array.isArray(payload.domain) && payload.domain.length >= 2
      && typeof payload.domain[0] === 'number'
      && typeof payload.domain[1] === 'number'
      ? [payload.domain[0], payload.domain[1]]
      : undefined
  };
};

const lineGeometryFromNode = (node: GraphObjectNode): { kind: 'line'; point: MathPoint2D; direction: MathPoint2D } | null => {
  const payload = asRecord(node.payload);
  const geometry = asRecord(payload?.geometry);
  if (geometry?.kind === 'line' && isPointLike(geometry.point) && isPointLike(geometry.direction)) {
    return { kind: 'line', point: geometry.point, direction: geometry.direction };
  }
  if ((geometry?.kind === 'segment' || geometry?.kind === 'ray') && isPointLike(geometry.start ?? geometry.origin) && isPointLike(geometry.end ?? geometry.direction)) {
    const point = (geometry.start ?? geometry.origin) as MathPoint2D;
    const secondOrDirection = (geometry.end ?? geometry.direction) as MathPoint2D;
    const direction = geometry.kind === 'ray' ? secondOrDirection : { x: secondOrDirection.x - point.x, y: secondOrDirection.y - point.y };
    return { kind: 'line', point, direction };
  }
  if (isPointLike(payload?.start) && isPointLike(payload?.end)) {
    return { kind: 'line', point: payload.start, direction: { x: payload.end.x - payload.start.x, y: payload.end.y - payload.start.y } };
  }
  return null;
};

const circleGeometryFromNode = (node: GraphObjectNode): { kind: 'circle'; center: MathPoint2D; radius: number } | null => {
  const geometry = asRecord(asRecord(node.payload)?.geometry);
  if (geometry?.kind === 'circle' && isPointLike(geometry.center) && typeof geometry.radius === 'number') {
    return { kind: 'circle', center: geometry.center, radius: geometry.radius };
  }
  return null;
};

const intersectionToPoints = (intersection: ReturnType<typeof intersectLines2D> | null): MathPoint2D[] => {
  if (!intersection) return [];
  if (intersection.kind === 'point') return [intersection.point];
  if (intersection.kind === 'points') return intersection.points;
  return [];
};

const resolveTranslationDelta = (args: readonly string[], symbols: GraphCommandSymbolTable): MathPoint2D | null => {
  if (args.length === 1) {
    const vector = symbols.get(args[0].trim());
    const payload = vector ? asRecord(vector.payload) : null;
    const rawVector = asRecord(payload?.vector);
    if (typeof rawVector?.x === 'number' && typeof rawVector.y === 'number') return { x: rawVector.x, y: rawVector.y };
    const point = resolvePoint(args[0], symbols);
    if (point) return point.point;
  }
  if (args.length >= 2) {
    const dx = parseNumber(args[0]);
    const dy = parseNumber(args[1]);
    if (dx !== null && dy !== null) return { x: dx, y: dy };
  }
  return null;
};

const transformPayload2D = (
  source: GraphObjectNode,
  transform: (point: MathPoint2D) => MathPoint2D
): Record<string, unknown> | null => {
  const payload = asRecord(source.payload);
  const geometry = asRecord(payload?.geometry);
  if (isPointLike(payload?.point)) return { point: transform(payload.point) };
  if (geometry?.kind === 'line' && isPointLike(geometry.point) && isPointLike(geometry.direction)) {
    const start = transform(geometry.point);
    const end = transform({ x: geometry.point.x + geometry.direction.x, y: geometry.point.y + geometry.direction.y });
    return { geometry: { kind: 'line', point: start, direction: { x: end.x - start.x, y: end.y - start.y } } };
  }
  if (geometry?.kind === 'ray' && isPointLike(geometry.origin) && isPointLike(geometry.direction)) {
    const origin = transform(geometry.origin);
    const through = transform({ x: geometry.origin.x + geometry.direction.x, y: geometry.origin.y + geometry.direction.y });
    return { geometry: { kind: 'ray', origin, direction: { x: through.x - origin.x, y: through.y - origin.y } } };
  }
  if (geometry?.kind === 'segment' && isPointLike(geometry.start) && isPointLike(geometry.end)) {
    return { geometry: { kind: 'segment', start: transform(geometry.start), end: transform(geometry.end) } };
  }
  if (geometry?.kind === 'circle' && isPointLike(geometry.center) && typeof geometry.radius === 'number') {
    return { geometry: { kind: 'circle', center: transform(geometry.center), radius: geometry.radius } };
  }
  if (geometry?.kind === 'polygon' && Array.isArray(geometry.vertices)) {
    return { geometry: { kind: 'polygon', vertices: geometry.vertices.filter(isPointLike).map(transform) } };
  }
  if (geometry?.kind === 'polyline' && Array.isArray(geometry.points)) {
    return { geometry: { kind: 'polyline', points: geometry.points.filter(isPointLike).map(transform) } };
  }
  if ((geometry?.kind === 'arc' || geometry?.kind === 'sector' || geometry?.kind === 'semicircle') && isPointLike(geometry.center) && isPointLike(geometry.start) && isPointLike(geometry.end)) {
    const center = transform(geometry.center);
    const start = transform(geometry.start);
    const end = transform(geometry.end);
    return {
      geometry: {
        ...geometry,
        center,
        start,
        end,
        radius: distance2D(center, start),
        startAngle: Math.atan2(start.y - center.y, start.x - center.x),
        endAngle: Math.atan2(end.y - center.y, end.x - center.x)
      }
    };
  }
  if (isPointLike(payload?.start) && isPointLike(payload?.end)) {
    const start = transform(payload.start);
    const end = transform(payload.end);
    return { start, end, vector: { x: end.x - start.x, y: end.y - start.y } };
  }
  return null;
};

const asRecord = (value: unknown): Record<string, unknown> | null => typeof value === 'object' && value !== null ? value as Record<string, unknown> : null;

const isPointLike = (value: unknown): value is MathPoint2D => {
  const record = asRecord(value);
  return typeof record?.x === 'number' && Number.isFinite(record.x) && typeof record.y === 'number' && Number.isFinite(record.y);
};
