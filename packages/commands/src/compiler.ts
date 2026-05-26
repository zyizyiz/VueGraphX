import {
  createGraphCapabilitiesForObject,
  createGraphObjectNode,
  okResult,
  type GraphObjectNode,
  type GraphOperationDiagnostic,
  type GraphOperationResult
} from '@vuegraphx/core';
import {
  arcFromCenterPoints,
  classifyConic2D,
  circleFromCenterPoint,
  circleFromThreePoints,
  conicFromCoefficients,
  circumcenter2D,
  distance2D,
  incenter2D,
  incircleFromTriangle,
  intersectCircles2D,
  intersectLineCircle2D,
  intersectLines2D,
  length2D,
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
import { getGraphCommandCatalogEntry, type GraphCommandNodeType } from './catalog';
import { commandError, type GraphCommandDiagnosticCode } from './diagnostics';
import {
  GraphCommandSymbolStore,
  type GraphCommandSymbolRecord,
  type GraphCommandSymbolTableInput
} from './symbols';

export { GraphCommandSymbolStore } from './symbols';
export type { GraphCommandNodeType } from './catalog';
export type { GraphCommandDiagnostic, GraphCommandDiagnosticCode } from './diagnostics';
export type { GraphCommandSymbolRecord, GraphCommandSymbolTable, GraphCommandSymbolTableInput } from './symbols';

type GraphCommandOutputNodeType = GraphCommandNodeType | 'measurement';

export interface GraphCommandCompileOptions {
  symbols?: GraphCommandSymbolTableInput;
  defaultLayerId?: GraphObjectNode['layerId'];
  renderHints?: Record<string, unknown>;
  meta?: Record<string, unknown>;
}

export interface GraphCommandCompileValue {
  node: GraphObjectNode;
  symbols: GraphCommandSymbolStore;
}

export interface GraphExpressionCompileOptions extends GraphCommandCompileOptions {
  id?: string;
  fallbackToLegacy?: boolean;
}

export interface GraphCommandProgramResult {
  nodes: GraphObjectNode[];
  symbols: GraphCommandSymbolStore;
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

const resolvePoint = (arg: string, symbols: GraphCommandSymbolStore): ResolvedPoint | null => {
  const inline = parseInlinePoint(arg);
  if (inline) return { point: inline };

  const symbol = symbols.get(arg.trim());
  if (!symbol) return null;
  const point = getPointPayload(symbol);
  return point ? { point, dependency: symbol.id } : null;
};

const resolvePointList = (args: readonly string[], symbols: GraphCommandSymbolStore): ResolvedPoint[] | null => {
  const points = args.map((arg) => resolvePoint(arg, symbols));
  return points.every((point): point is ResolvedPoint => !!point) ? points : null;
};

const invalidCommand = (
  message: string,
  code: GraphCommandDiagnosticCode = 'commands.invalid-command',
  details?: Record<string, unknown>
): GraphOperationResult<never> => commandError(code, message, undefined, details);

const arityError = (message: string, details?: Record<string, unknown>): GraphOperationResult<never> => (
  invalidCommand(message, 'commands.arity', details)
);

const invalidArgument = (message: string, details?: Record<string, unknown>): GraphOperationResult<never> => (
  invalidCommand(message, 'commands.invalid-argument', details)
);

const invalidReference = (message: string, details?: Record<string, unknown>): GraphOperationResult<never> => (
  invalidCommand(message, 'commands.invalid-reference', details)
);

const ambiguousResult = (message: string, details?: Record<string, unknown>): GraphOperationResult<never> => (
  invalidCommand(message, 'commands.ambiguous-result', details)
);

const domainError = (message: string, details?: Record<string, unknown>): GraphOperationResult<never> => (
  invalidCommand(message, 'commands.domain-error', details)
);

const unsupportedCapability = (message: string, details?: Record<string, unknown>): GraphOperationResult<never> => (
  invalidCommand(message, 'commands.unsupported-capability', details)
);

const dependencyIds = (points: readonly ResolvedPoint[]): string[] => [...new Set(points.map((point) => point.dependency).filter((id): id is string => !!id))];

const objectReference = (id: string): { objectId: string } => ({ objectId: id });

const pointSourceFromResolvedPoint = (
  point: ResolvedPoint
): { objectId: string } | { coordinates: { dimension: '2d'; x: number; y: number } } => (
  point.dependency
    ? objectReference(point.dependency)
    : { coordinates: { dimension: '2d', x: point.point.x, y: point.point.y } }
);

const resolveSymbolRecord = (
  arg: string,
  symbols: GraphCommandSymbolStore
): GraphCommandSymbolRecord | null => symbols.resolve(arg.trim());

export const compileGraphCommand = (
  command: string,
  options: GraphCommandCompileOptions = {}
): GraphOperationResult<GraphCommandCompileValue> => {
  const symbols = new GraphCommandSymbolStore(options.symbols);
  const invocation = parseInvocation(command.trim());
  if (!invocation) {
    return invalidCommand(`Unsupported command syntax: ${command}`, 'commands.syntax');
  }

  const catalogEntry = getGraphCommandCatalogEntry(invocation.type);
  if (!catalogEntry) {
    return invalidCommand(`Unsupported command type: ${invocation.type}`, 'commands.unsupported-command', {
      commandType: invocation.type
    });
  }
  if (catalogEntry.support.status === 'unsupported') {
    return unsupportedCapability(`Command type ${invocation.type} is cataloged but not supported by this compiler yet.`, {
      commandType: invocation.type
    });
  }

  const type = catalogEntry.type;
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
  symbols.set(id, node, { commandType: type });
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
    const symbols = new GraphCommandSymbolStore(options.symbols);
    symbols.set(semanticNode.id, semanticNode);
    return okResult({ node: semanticNode, symbols });
  }

  if (options.fallbackToLegacy !== false) {
    const symbols = new GraphCommandSymbolStore(options.symbols);
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

  return invalidCommand(`Unsupported expression syntax: ${expression}`, 'commands.syntax');
};

export const compileGraphCommands = (
  commands: readonly string[],
  options: GraphCommandCompileOptions = {}
): GraphCommandProgramResult => {
  let symbols = new GraphCommandSymbolStore(options.symbols);
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
  symbols: GraphCommandSymbolStore,
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
    case 'ellipse':
    case 'hyperbola':
      return buildCenterRadiiConicNode(id, type, args, symbols, layerId);
    case 'parabola':
      return buildParabolaNode(id, args, symbols, layerId);
    case 'conic':
      return buildConicNode(id, args, layerId);
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
    case 'distance':
      return buildDistanceMeasurementNode(id, args, symbols, layerId);
    case 'length':
      return buildLengthMeasurementNode(id, args, symbols, layerId);
    case 'area':
      return buildAreaMeasurementNode(id, args, symbols, layerId);
    case 'slope':
      return buildSlopeMeasurementNode(id, args, symbols, layerId);
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
  type: GraphCommandOutputNodeType,
  payload: unknown,
  dependencies: string[],
  layerId: GraphObjectNode['layerId']
): GraphObjectNode => ({
  id,
  kind: type === 'text' || type === 'measurement'
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
  if (args.length !== 2) return arityError('Point requires exactly two numeric arguments.');
  const x = parseNumber(args[0]);
  const y = parseNumber(args[1]);
  if (x === null || y === null) return invalidArgument('Point arguments must be finite numbers.');
  return okResult(createBaseNode(id, 'point', { point: point2D(x, y) }, [], layerId));
};

const buildTwoPointNode = (
  id: string,
  type: 'line' | 'ray' | 'segment' | 'vector' | 'semicircle',
  args: readonly string[],
  symbols: GraphCommandSymbolStore,
  layerId: GraphObjectNode['layerId'],
  createPayload: (points: readonly [ResolvedPoint, ResolvedPoint]) => unknown
): GraphOperationResult<GraphObjectNode> => {
  if (args.length !== 2) return arityError(`${type} requires exactly two point arguments.`);
  const points = resolvePointList(args, symbols);
  if (!points || points.length !== 2) return invalidReference(`${type} arguments must reference known points or inline tuples.`);
  const pair = [points[0], points[1]] as const;
  return okResult(createBaseNode(id, type, createPayload(pair), dependencyIds(pair), layerId));
};

const buildThreePointGeometryNode = (
  id: string,
  type: 'arc' | 'sector',
  args: readonly string[],
  symbols: GraphCommandSymbolStore,
  layerId: GraphObjectNode['layerId'],
  createPayload: (points: readonly [ResolvedPoint, ResolvedPoint, ResolvedPoint]) => unknown
): GraphOperationResult<GraphObjectNode> => {
  if (args.length !== 3) return arityError(`${type} requires exactly three point arguments.`);
  const points = resolvePointList(args, symbols);
  if (!points || points.length !== 3) return invalidReference(`${type} arguments must reference known points or inline tuples.`);
  const triple = [points[0], points[1], points[2]] as const;
  return okResult(createBaseNode(id, type, createPayload(triple), dependencyIds(triple), layerId));
};

const buildCircleNode = (
  id: string,
  args: readonly string[],
  symbols: GraphCommandSymbolStore,
  layerId: GraphObjectNode['layerId']
): GraphOperationResult<GraphObjectNode> => {
  if (args.length !== 2) return arityError('Circle requires a center point plus point or radius.');
  const center = resolvePoint(args[0], symbols);
  if (!center) return invalidReference('Circle center must reference a known point or inline tuple.');

  const radius = parseNumber(args[1]);
  if (radius !== null) {
    if (radius <= 0) return domainError('Circle radius must be positive.', { radius });
    return okResult(createBaseNode(id, 'circle', { geometry: { kind: 'circle', center: center.point, radius } }, dependencyIds([center]), layerId));
  }

  const edge = resolvePoint(args[1], symbols);
  if (!edge) return invalidReference('Circle second argument must be a finite radius or point.');
  const geometry = circleFromCenterPoint(center.point, edge.point);
  if (geometry.radius <= 0) return domainError('Circle point-on-circle must be distinct from its center.');
  return okResult(createBaseNode(id, 'circle', { geometry }, dependencyIds([center, edge]), layerId));
};

const buildCenterRadiiConicNode = (
  id: string,
  type: 'ellipse' | 'hyperbola',
  args: readonly string[],
  symbols: GraphCommandSymbolStore,
  layerId: GraphObjectNode['layerId']
): GraphOperationResult<GraphObjectNode> => {
  if (args.length < 3 || args.length > 4) return arityError(`${type} requires center, radiusX, radiusY, and optional rotation radians.`);
  const center = resolvePoint(args[0], symbols);
  if (!center) return invalidReference(`${type} center must reference a known point or inline tuple.`);
  const radiusX = parseNumber(args[1]);
  const radiusY = parseNumber(args[2]);
  const rotationRadians = args[3] === undefined ? undefined : parseNumber(args[3]);
  if (radiusX === null || radiusY === null || rotationRadians === null) {
    return invalidArgument(`${type} radii and rotation must be finite numbers.`);
  }
  if (radiusX <= 0 || radiusY <= 0) return domainError(`${type} radii must be positive.`, { radiusX, radiusY });

  return okResult(createBaseNode(id, 'conic', {
    objectType: 'conic',
    conicKind: type,
    definition: {
      mode: 'center-radii',
      center: pointSourceFromResolvedPoint(center),
      radiusX,
      radiusY,
      rotationRadians
    }
  }, dependencyIds([center]), layerId));
};

const buildParabolaNode = (
  id: string,
  args: readonly string[],
  symbols: GraphCommandSymbolStore,
  layerId: GraphObjectNode['layerId']
): GraphOperationResult<GraphObjectNode> => {
  if (args.length !== 2) return arityError('Parabola requires a focus point and directrix line.');
  const focus = resolvePoint(args[0], symbols);
  if (!focus) return invalidReference('Parabola focus must reference a known point or inline tuple.');
  const directrix = resolveSymbolRecord(args[1], symbols);
  if (!directrix) return invalidReference('Parabola directrix must reference a known line-like object.');
  if (!lineGeometryFromNode(directrix.node)) return unsupportedCapability('Parabola directrix must be a line-like object.', { reference: directrix.id });

  return okResult(createBaseNode(id, 'conic', {
    objectType: 'conic',
    conicKind: 'parabola',
    definition: {
      mode: 'focus-directrix',
      focus: pointSourceFromResolvedPoint(focus),
      directrix: objectReference(directrix.id),
      eccentricity: 1
    }
  }, dependencyIds([focus, { point: focus.point, dependency: directrix.id }]), layerId));
};

const buildConicNode = (
  id: string,
  args: readonly string[],
  layerId: GraphObjectNode['layerId']
): GraphOperationResult<GraphObjectNode> => {
  if (args.length !== 1 && args.length !== 6) return arityError('Conic requires either one equation string or six numeric coefficients.');

  if (args.length === 1) {
    const expression = stripQuotes(args[0]);
    if (!expression) return invalidArgument('Conic equation must be non-empty.');
    return okResult(createBaseNode(id, 'conic', {
      objectType: 'conic',
      conicKind: 'general-conic',
      definition: {
        mode: 'equation',
        expression,
        variables: ['x', 'y']
      }
    }, [], layerId));
  }

  const coefficients = args.map(parseNumber);
  if (coefficients.some((coefficient) => coefficient === null)) {
    return invalidArgument('Conic coefficients must be finite numbers.');
  }
  const [A, B, C, D, E, F] = coefficients as [number, number, number, number, number, number];
  const conic = conicFromCoefficients({ A, B, C, D, E, F });
  if (!conic.ok) return domainError(conic.error.message, { coefficients: { A, B, C, D, E, F } });
  const classification = classifyConic2D(conic.value);
  if (!classification.ok) return domainError(classification.error.message, { coefficients: { A, B, C, D, E, F } });
  if (classification.value === 'degenerate') {
    return domainError('Conic coefficients describe a degenerate conic.', { coefficients: { A, B, C, D, E, F } });
  }

  return okResult(createBaseNode(id, 'conic', {
    objectType: 'conic',
    conicKind: classification.value,
    definition: {
      mode: 'equation',
      expression: `${A}*x^2 + ${B}*x*y + ${C}*y^2 + ${D}*x + ${E}*y + ${F} = 0`,
      variables: ['x', 'y'],
      coefficients: { A, B, C, D, E, F }
    }
  }, [], layerId));
};

const buildPolygonNode = (
  id: string,
  args: readonly string[],
  symbols: GraphCommandSymbolStore,
  layerId: GraphObjectNode['layerId']
): GraphOperationResult<GraphObjectNode> => {
  if (args.length < 3) return arityError('Polygon requires at least three points.');
  const points = resolvePointList(args, symbols);
  if (!points) return invalidReference('Polygon arguments must reference known points or inline tuples.');
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
  symbols: GraphCommandSymbolStore,
  layerId: GraphObjectNode['layerId']
): GraphOperationResult<GraphObjectNode> => {
  if (args.length < 2) return arityError('Polyline requires at least two points.');
  const points = resolvePointList(args, symbols);
  if (!points) return invalidReference('Polyline arguments must reference known points or inline tuples.');
  return okResult(createBaseNode(id, 'polyline', {
    geometry: polylineFromPoints(points.map((point) => point.point))
  }, dependencyIds(points), layerId));
};

const buildRegularPolygonNode = (
  id: string,
  args: readonly string[],
  symbols: GraphCommandSymbolStore,
  layerId: GraphObjectNode['layerId']
): GraphOperationResult<GraphObjectNode> => {
  if (args.length !== 3) return arityError('RegularPolygon requires two points and an integer side count.');
  const points = resolvePointList(args.slice(0, 2), symbols);
  const sides = parseNumber(args[2]);
  if (!points || points.length !== 2) return invalidReference('RegularPolygon point arguments must reference known points or inline tuples.');
  if (sides === null || !Number.isInteger(sides)) return invalidArgument('RegularPolygon side count must be an integer.');
  if (sides < 3) {
    return domainError('RegularPolygon side count must be >= 3.', { sides });
  }
  const geometry = regularPolygonFromSide(points[0].point, points[1].point, sides);
  if (!geometry) return domainError('RegularPolygon cannot be built from coincident side points.');
  return okResult(createBaseNode(id, 'polygon', {
    geometry,
    area: polygonArea(geometry),
    centroid: polygonCentroid(geometry),
    sideCount: sides
  }, dependencyIds(points), layerId));
};

const buildThreePointDerivedNode = (
  args: readonly string[],
  symbols: GraphCommandSymbolStore,
  label: string,
  createNode: (points: readonly [ResolvedPoint, ResolvedPoint, ResolvedPoint]) => GraphObjectNode | null
): GraphOperationResult<GraphObjectNode> => {
  if (args.length !== 3) return arityError(`${label} requires exactly three point arguments.`);
  const points = resolvePointList(args, symbols);
  if (!points || points.length !== 3) return invalidReference(`${label} arguments must reference known points or inline tuples.`);
  const triple = [points[0], points[1], points[2]] as const;
  const node = createNode(triple);
  return node
    ? okResult(node)
    : domainError(`${label} cannot be constructed from collinear or degenerate points.`);
};

const buildTextNode = (
  id: string,
  args: readonly string[],
  symbols: GraphCommandSymbolStore,
  layerId: GraphObjectNode['layerId']
): GraphOperationResult<GraphObjectNode> => {
  if (args.length < 2) return arityError('Text requires a point/x,y and text value.');
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
  if (!point) return invalidReference('Text position must be a known point, inline tuple, or x,y coordinates.');
  const textArg = firstPoint ? args[1] : args[2];
  const text = stripQuotes(textArg ?? '');
  if (!text) return invalidArgument('Text value must be non-empty.');
  return okResult(createBaseNode(id, 'text', {
    point: point.point,
    text
  }, dependencyIds([point]), layerId));
};

const buildFunctionNode = (id: string, args: readonly string[], layerId: GraphObjectNode['layerId']): GraphOperationResult<GraphObjectNode> => {
  if (args.length < 1 || args.length > 3) return arityError('Function requires an expression and optional min/max domain.');
  const min = args[1] === undefined ? null : parseNumber(args[1]);
  const max = args[2] === undefined ? null : parseNumber(args[2]);
  if ((args[1] !== undefined && min === null) || (args[2] !== undefined && max === null)) return invalidArgument('Function domain bounds must be finite numbers.');
  if (min !== null && max !== null && min >= max) return domainError('Function domain min must be less than max.', { min, max });
  const domain = min !== null && max !== null ? [min, max] as [number, number] : undefined;
  return okResult(createBaseNode(id, 'function', createFunctionDescriptor(stripQuotes(args[0]), domain), [], layerId));
};

const buildEquationNode = (id: string, args: readonly string[], layerId: GraphObjectNode['layerId']): GraphOperationResult<GraphObjectNode> => {
  if (args.length !== 1) return arityError('Equation requires exactly one expression.');
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
  symbols: GraphCommandSymbolStore,
  layerId: GraphObjectNode['layerId']
): GraphOperationResult<GraphObjectNode> => {
  if (args.length !== 2) return arityError('PerpendicularLine requires a source object and point.');
  const source = symbols.get(args[0].trim());
  const point = resolvePoint(args[1], symbols);
  if (!source || !point) return invalidReference('PerpendicularLine requires a known source object and point.');
  const line = lineGeometryFromNode(source);
  if (!line) return unsupportedCapability('PerpendicularLine source must be a line-like object.');
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
  symbols: GraphCommandSymbolStore,
  layerId: GraphObjectNode['layerId']
): GraphOperationResult<GraphObjectNode> => {
  if (args.length !== 2) return arityError('ParallelLine requires a source object and point.');
  const source = symbols.get(args[0].trim());
  const point = resolvePoint(args[1], symbols);
  const line = source ? lineGeometryFromNode(source) : null;
  if (!source || !point) return invalidReference('ParallelLine requires a known source object and point.');
  if (!line) return unsupportedCapability('ParallelLine source must be a line-like object.');
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
  symbols: GraphCommandSymbolStore,
  layerId: GraphObjectNode['layerId']
): GraphOperationResult<GraphObjectNode> => {
  if (args.length !== 2) return arityError('Midpoint requires exactly two points.');
  const points = resolvePointList(args, symbols);
  if (!points || points.length !== 2) return invalidReference('Midpoint arguments must reference known points or inline tuples.');
  return okResult(createBaseNode(id, 'midpoint', { point: midpoint2D(points[0].point, points[1].point) }, dependencyIds(points), layerId));
};

const buildTangentNode = (
  id: string,
  args: readonly string[],
  symbols: GraphCommandSymbolStore,
  layerId: GraphObjectNode['layerId']
): GraphOperationResult<GraphObjectNode> => {
  if (args.length !== 2) return arityError('Tangent requires a point and a function.');
  const point = resolvePoint(args[0], symbols);
  const source = symbols.get(args[1].trim());
  const fn = source ? functionDescriptorFromNode(source) : null;
  if (!point || !source) return invalidReference('Tangent requires a known point and function object.');
  if (!fn) return unsupportedCapability('Tangent source must be a function object.');
  const y = evaluateFunctionDescriptor(fn, point.point.x);
  const dy = evaluateFunctionDescriptor(createDerivativeDescriptor(fn), point.point.x);
  if (!Number.isFinite(y) || !Number.isFinite(dy)) return domainError('Tangent function cannot be evaluated at the point x-coordinate.');
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
  symbols: GraphCommandSymbolStore,
  layerId: GraphObjectNode['layerId']
): GraphOperationResult<GraphObjectNode> => {
  if (args.length !== 1) return arityError('Derivative requires exactly one function argument.');
  const source = symbols.get(args[0].trim());
  const fn = source ? functionDescriptorFromNode(source) : null;
  if (!source) return invalidReference('Derivative requires a known function object.');
  if (!fn) return unsupportedCapability('Derivative source must be a function object.');
  return okResult(createBaseNode(id, 'derivative', {
    ...createDerivativeDescriptor(fn),
    sourceObjectId: source.id
  }, [source.id], layerId));
};

const buildIntersectionNode = (
  id: string,
  args: readonly string[],
  symbols: GraphCommandSymbolStore,
  layerId: GraphObjectNode['layerId']
): GraphOperationResult<GraphObjectNode> => {
  if (args.length !== 2) return arityError('Intersect requires two geometric objects.');
  const left = symbols.get(args[0].trim());
  const right = symbols.get(args[1].trim());
  if (!left || !right) return invalidReference('Intersect arguments must reference known objects.');

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

  if (!intersection) return unsupportedCapability('Intersect currently supports line and circle objects.');
  const points = intersectionToPoints(intersection);
  if (points.length === 0) return domainError('Intersect could not find finite intersection points.');
  if (points.length > 1) return ambiguousResult('Intersect found multiple points; selector syntax is not implemented yet.', {
    sourceObjectIds: [left.id, right.id],
    pointCount: points.length
  });
  return okResult(createBaseNode(id, 'intersection', {
    point: points[0],
    points,
    sourceObjectIds: [left.id, right.id]
  }, [left.id, right.id], layerId));
};

const buildAngleNode = (
  id: string,
  args: readonly string[],
  symbols: GraphCommandSymbolStore,
  layerId: GraphObjectNode['layerId']
): GraphOperationResult<GraphObjectNode> => {
  if (args.length !== 3) return arityError('Angle requires three points.');
  const points = resolvePointList(args, symbols);
  if (!points || points.length !== 3) return invalidReference('Angle arguments must reference known points or inline tuples.');
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
  symbols: GraphCommandSymbolStore,
  layerId: GraphObjectNode['layerId']
): GraphOperationResult<GraphObjectNode> => {
  if (args.length < 2 || args.length > 3) return arityError('Translate requires an object and a vector/delta.');
  const source = symbols.get(args[0].trim());
  if (!source) return invalidReference('Translate source must reference a known object.');
  const delta = resolveTranslationDelta(args.slice(1), symbols);
  if (!delta) return invalidArgument('Translate requires dx,dy, vector object, or inline point delta.');
  if (!isTransformableNode(source)) return unsupportedCapability('Translate currently supports point, line, ray, segment, circle, polygon, polyline, arc, sector, semicircle, and vector objects.', { objectType: source.type });
  const payload = transformPayload2D(source, (point) => translatePoint2D(point, delta));
  if (!payload) return unsupportedCapability('Translate could not build a renderer-neutral transform payload.', { objectType: source.type });
  return okResult(createBaseNode(id, 'translated', {
    ...payload,
    transform: { kind: 'translate', delta },
    sourceObjectId: source.id
  }, [source.id], layerId));
};

const buildRotatedNode = (
  id: string,
  args: readonly string[],
  symbols: GraphCommandSymbolStore,
  layerId: GraphObjectNode['layerId']
): GraphOperationResult<GraphObjectNode> => {
  if (args.length < 2 || args.length > 3) return arityError('Rotate requires an object, angle in radians, and optional center.');
  const source = symbols.get(args[0].trim());
  if (!source) return invalidReference('Rotate source must reference a known object.');
  const angle = parseNumber(args[1]);
  if (angle === null) return invalidArgument('Rotate angle must be a finite number in radians.');
  const center = args[2] ? resolvePoint(args[2], symbols)?.point : { x: 0, y: 0 };
  if (!center) return invalidReference('Rotate center must be a known point or inline tuple.');
  if (!isTransformableNode(source)) return unsupportedCapability('Rotate currently supports point, line, ray, segment, circle, polygon, polyline, arc, sector, semicircle, and vector objects.', { objectType: source.type });
  const payload = transformPayload2D(source, (point) => rotatePoint2D(point, angle, center));
  if (!payload) return unsupportedCapability('Rotate could not build a renderer-neutral transform payload.', { objectType: source.type });
  return okResult(createBaseNode(id, 'rotated', {
    ...payload,
    transform: { kind: 'rotate', angle, center },
    sourceObjectId: source.id
  }, [source.id], layerId));
};

const buildDistanceMeasurementNode = (
  id: string,
  args: readonly string[],
  symbols: GraphCommandSymbolStore,
  layerId: GraphObjectNode['layerId']
): GraphOperationResult<GraphObjectNode> => {
  if (args.length !== 2) return arityError('Distance requires exactly two point references.');
  const points = resolvePointList(args, symbols);
  if (!points || points.length !== 2) return invalidReference('Distance arguments must reference known points or inline tuples.');
  if (!points[0].dependency || !points[1].dependency) return invalidReference('Distance measurements require named point references for dependency tracking.');
  const value = distance2D(points[0].point, points[1].point);
  return okResult(createMeasurementNode(
    id,
    'distance',
    value,
    [points[0].dependency, points[1].dependency],
    layerId,
    { points: points.map((point) => point.point) }
  ));
};

const buildLengthMeasurementNode = (
  id: string,
  args: readonly string[],
  symbols: GraphCommandSymbolStore,
  layerId: GraphObjectNode['layerId']
): GraphOperationResult<GraphObjectNode> => {
  if (args.length !== 1 && args.length !== 2) return arityError('Length requires one object or two point references.');

  if (args.length === 2) {
    const points = resolvePointList(args, symbols);
    if (!points || points.length !== 2) return invalidReference('Length point arguments must reference known points or inline tuples.');
    if (!points[0].dependency || !points[1].dependency) return invalidReference('Length measurements require named point references for dependency tracking.');
    const value = distance2D(points[0].point, points[1].point);
    return okResult(createMeasurementNode(
      id,
      'length',
      value,
      [points[0].dependency, points[1].dependency],
      layerId,
      { points: points.map((point) => point.point) }
    ));
  }

  const source = resolveSymbolRecord(args[0], symbols);
  if (!source) return invalidReference('Length source must reference a known object.');
  const value = lengthFromNode(source.node);
  if (value === null) return unsupportedCapability('Length currently supports segment, polyline, circle, vector, arc, sector, and semicircle objects.', { objectType: source.type });
  return okResult(createMeasurementNode(id, 'length', value, [source.id], layerId));
};

const buildAreaMeasurementNode = (
  id: string,
  args: readonly string[],
  symbols: GraphCommandSymbolStore,
  layerId: GraphObjectNode['layerId']
): GraphOperationResult<GraphObjectNode> => {
  if (args.length !== 1) return arityError('Area requires exactly one object reference.');
  const source = resolveSymbolRecord(args[0], symbols);
  if (!source) return invalidReference('Area source must reference a known object.');
  const value = areaFromNode(source.node);
  if (value === null) return unsupportedCapability('Area currently supports polygon, circle, sector, and semicircle objects.', { objectType: source.type });
  return okResult(createMeasurementNode(id, 'area', value, [source.id], layerId));
};

const buildSlopeMeasurementNode = (
  id: string,
  args: readonly string[],
  symbols: GraphCommandSymbolStore,
  layerId: GraphObjectNode['layerId']
): GraphOperationResult<GraphObjectNode> => {
  if (args.length !== 1) return arityError('Slope requires exactly one line-like object reference.');
  const source = resolveSymbolRecord(args[0], symbols);
  if (!source) return invalidReference('Slope source must reference a known object.');
  const line = lineGeometryFromNode(source.node);
  if (!line) return unsupportedCapability('Slope currently supports line-like objects.', { objectType: source.type });
  if (Math.abs(line.direction.x) <= Number.EPSILON) return domainError('Slope is undefined for vertical lines.', { objectId: source.id });
  const value = line.direction.y / line.direction.x;
  return okResult(createMeasurementNode(id, 'slope', value, [source.id], layerId));
};

const createMeasurementNode = (
  id: string,
  measurementKind: 'distance' | 'length' | 'area' | 'slope',
  value: number,
  targetIds: readonly string[],
  layerId: GraphObjectNode['layerId'],
  extraPayload: Record<string, unknown> = {}
): GraphObjectNode => createBaseNode(id, 'measurement', {
  objectType: 'measurement',
  measurementKind,
  targets: targetIds.map(objectReference),
  expression: String(value),
  value,
  ...extraPayload
}, [...new Set(targetIds)], layerId);

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

const isTransformableNode = (node: GraphObjectNode): boolean => (
  [
    'point',
    'line',
    'ray',
    'segment',
    'circle',
    'polygon',
    'polyline',
    'arc',
    'sector',
    'semicircle',
    'vector',
    'midpoint',
    'intersection'
  ].includes(node.type)
);

const lengthFromNode = (node: GraphObjectNode): number | null => {
  const payload = asRecord(node.payload);
  if (typeof payload?.length === 'number' && Number.isFinite(payload.length)) return payload.length;

  const geometry = asRecord(payload?.geometry);
  if (geometry?.kind === 'segment' && isPointLike(geometry.start) && isPointLike(geometry.end)) return distance2D(geometry.start, geometry.end);
  if (geometry?.kind === 'polyline' && Array.isArray(geometry.points)) return pathLength(geometry.points);
  if (geometry?.kind === 'polygon' && Array.isArray(geometry.vertices)) return closedPathLength(geometry.vertices);
  if (geometry?.kind === 'circle' && typeof geometry.radius === 'number' && Number.isFinite(geometry.radius)) return 2 * Math.PI * geometry.radius;
  if ((geometry?.kind === 'arc' || geometry?.kind === 'sector' || geometry?.kind === 'semicircle') && typeof geometry.radius === 'number' && typeof geometry.startAngle === 'number' && typeof geometry.endAngle === 'number') {
    return Math.abs(geometry.endAngle - geometry.startAngle) * geometry.radius;
  }
  if (isPointLike(payload?.start) && isPointLike(payload?.end)) return distance2D(payload.start, payload.end);
  const vector = asRecord(payload?.vector);
  if (typeof vector?.x === 'number' && typeof vector.y === 'number') return length2D({ x: vector.x, y: vector.y });
  return null;
};

const areaFromNode = (node: GraphObjectNode): number | null => {
  const payload = asRecord(node.payload);
  if (typeof payload?.area === 'number' && Number.isFinite(payload.area)) return payload.area;

  const geometry = asRecord(payload?.geometry);
  if (geometry?.kind === 'polygon' && Array.isArray(geometry.vertices)) {
    const vertices = geometry.vertices.filter(isPointLike);
    return vertices.length >= 3 ? polygonArea(polygonFromVertices(vertices)) : null;
  }
  if (geometry?.kind === 'circle' && typeof geometry.radius === 'number' && Number.isFinite(geometry.radius)) {
    return Math.PI * geometry.radius * geometry.radius;
  }
  if (geometry?.kind === 'sector' && typeof geometry.radius === 'number' && typeof geometry.startAngle === 'number' && typeof geometry.endAngle === 'number') {
    return Math.abs(geometry.endAngle - geometry.startAngle) * geometry.radius * geometry.radius / 2;
  }
  if (geometry?.kind === 'semicircle' && typeof geometry.radius === 'number' && Number.isFinite(geometry.radius)) {
    return Math.PI * geometry.radius * geometry.radius / 2;
  }
  return null;
};

const pathLength = (values: unknown[]): number | null => {
  const points = values.filter(isPointLike);
  if (points.length !== values.length || points.length < 2) return null;
  return points.slice(1).reduce((total, point, index) => total + distance2D(points[index], point), 0);
};

const closedPathLength = (values: unknown[]): number | null => {
  const points = values.filter(isPointLike);
  if (points.length !== values.length || points.length < 3) return null;
  return pathLength([...points, points[0]]);
};

const intersectionToPoints = (intersection: ReturnType<typeof intersectLines2D> | null): MathPoint2D[] => {
  if (!intersection) return [];
  if (intersection.kind === 'point') return [intersection.point];
  if (intersection.kind === 'points') return intersection.points;
  return [];
};

const resolveTranslationDelta = (args: readonly string[], symbols: GraphCommandSymbolStore): MathPoint2D | null => {
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
