import * as math from 'mathjs';
import type { GraphObjectNode } from '@vuegraphx/core';
import { compileGraphCommand, normalizeLegacyGraphExpression, type GraphCommandSymbolTable } from '@vuegraphx/commands';

export interface PlaygroundCanvasCommand {
  id: string;
  expression: string;
  color: string;
  options?: Record<string, unknown>;
}

export interface PlaygroundCanvasDiagnostic {
  commandId: string;
  message: string;
}

export interface PlaygroundCanvasSceneResult {
  nodes: GraphObjectNode[];
  diagnostics: PlaygroundCanvasDiagnostic[];
}

export const PLAYGROUND_CANVAS_WORLD_BOUNDS = {
  left: -10,
  top: 10,
  right: 10,
  bottom: -10
} as const;

const SAMPLE_STEPS = 240;
const BUILTIN_SCOPE = { e: Math.E, pi: Math.PI };

const CANVAS_RENDERABLE_TYPES = new Set([
  'point',
  'text',
  'angle',
  'circle',
  'arc',
  'sector',
  'semicircle',
  'polygon',
  'segment',
  'line',
  'ray',
  'polyline',
  'function',
  'vector',
  'measurement',
  'midpoint',
  'intersection',
  'perpendicular-line',
  'parallel-line',
  'tangent',
  'translated',
  'rotated',
  'conic'
]);

export const buildPlaygroundCanvasScene = (commands: readonly PlaygroundCanvasCommand[]): PlaygroundCanvasSceneResult => {
  const diagnostics: PlaygroundCanvasDiagnostic[] = [];
  const nodes: GraphObjectNode[] = [];
  let symbols: GraphCommandSymbolTable = new Map();
  const scope: Record<string, unknown> = { ...BUILTIN_SCOPE };

  for (const command of commands) {
    const expression = command.expression.trim();
    if (!expression) continue;

    const graphCommand = normalizeLegacyGraphExpression(expression);
    if (graphCommand) {
      const result = compileCanvasGraphCommand(graphCommand, symbols);
      if (result.ok && result.value) {
        symbols = result.value.symbols;
        const expanded = expandCanvasCommandNode(result.value.node, command, symbols, scope);
        if (expanded.ok) nodes.push(...expanded.nodes);
        else diagnostics.push({ commandId: command.id, message: expanded.message });
        continue;
      }
      diagnostics.push({
        commandId: command.id,
        message: result.diagnostics[0]?.message ?? 'Canvas2D 后端暂不支持该指令。'
      });
      continue;
    }

    const mathNodes = buildMathExpressionNodes(command, scope);
    if (mathNodes.ok) {
      nodes.push(...mathNodes.nodes);
      symbols = registerMathFunctionSymbol(expression, symbols, scope);
      continue;
    }

    diagnostics.push({ commandId: command.id, message: mathNodes.message ?? 'Canvas2D 后端暂不支持该指令。' });
  }

  return { nodes, diagnostics };
};

export const buildPlaygroundBabylonScene = (commands: readonly PlaygroundCanvasCommand[]): PlaygroundCanvasSceneResult => {
  const diagnostics: PlaygroundCanvasDiagnostic[] = [];
  const nodes: GraphObjectNode[] = [];
  let symbols: GraphCommandSymbolTable = new Map();

  for (const command of commands) {
    const expression = command.expression.trim();
    if (!expression) continue;

    const result = compileGraphCommand(normalizeLegacyGraphExpression(expression) ?? expression, { symbols });
    if (result.ok && result.value) {
      symbols = result.value.symbols;
      if (result.value.node.type === 'solid') {
        nodes.push(withRenderHints(result.value.node, command));
      } else if (result.value.node.type !== 'variable') {
        diagnostics.push({ commandId: command.id, message: 'Babylon 后端当前只接收 core Solid(...) 立体对象；曲面/函数仍请切回 JSXGraph。' });
      }
      continue;
    }

    diagnostics.push({
      commandId: command.id,
      message: result.diagnostics[0]?.message ?? 'Babylon 后端暂不支持该指令。'
    });
  }

  return { nodes, diagnostics };
};

const withRenderHints = (node: GraphObjectNode, command: PlaygroundCanvasCommand): GraphObjectNode => ({
  ...node,
  renderHints: {
    ...(node.renderHints ?? {}),
    strokeColor: readString(command.options?.strokeColor, command.color),
    fillColor: readString(command.options?.fillColor, `${command.color}26`),
    fillOpacity: readNumber(command.options?.fillOpacity, readNumber(node.renderHints?.fillOpacity, 1)),
    strokeWidth: readNumber(command.options?.strokeWidth, 2),
    dash: readNumber(command.options?.dash, readNumber(node.renderHints?.dash, 0)),
    radius: readNumber(command.options?.size, 4)
  }
});

const compileCanvasGraphCommand = (
  graphCommand: string,
  symbols: GraphCommandSymbolTable
): ReturnType<typeof compileGraphCommand> => {
  try {
    return compileGraphCommand(graphCommand, { symbols });
  } catch (error) {
    return {
      ok: false,
      diagnostics: [{
        code: 'commands.invalid-command',
        message: `Canvas2D 指令编译失败：${formatError(error)}`,
        severity: 'error'
      }]
    };
  }
};

const expandCanvasCommandNode = (
  node: GraphObjectNode,
  command: PlaygroundCanvasCommand,
  symbols: GraphCommandSymbolTable,
  scope: Record<string, unknown>
): { ok: true; nodes: GraphObjectNode[] } | { ok: false; message: string } => {
  if (node.type === 'variable') return { ok: true, nodes: [] };

  if (node.type === 'function' || node.type === 'derivative') {
    const descriptor = readFunctionDescriptor(node.payload);
    if (!descriptor) return { ok: false, message: 'Canvas2D 后端无法读取函数描述符。' };
    return createSampledDescriptorNode(command, node.id, descriptor, scope);
  }

  if (node.type === 'conic') {
    const normalized = normalizeCanvasConicNode(node, symbols);
    if (!normalized.ok) return normalized;
    return { ok: true, nodes: [withRenderHints(normalized.node, command)] };
  }

  if (!CANVAS_RENDERABLE_TYPES.has(node.type)) {
    return { ok: false, message: `Canvas2D 后端暂不支持 ${node.type} 指令；请切回 JSXGraph 或 Babylon（Solid）查看。` };
  }

  const normalizedMeasurement = node.type === 'measurement'
    ? addMeasurementAnchor(node, symbols)
    : node;
  return { ok: true, nodes: [withRenderHints(normalizedMeasurement, command)] };
};

const registerMathFunctionSymbol = (
  expression: string,
  symbols: GraphCommandSymbolTable,
  scope: Record<string, unknown>
): GraphCommandSymbolTable => {
  const match = expression.match(/^([a-zA-Z_]\w*)\s*\(\s*([a-zA-Z_]\w*)\s*\)\s*=\s*(.+)$/);
  if (!match) return symbols;
  const [, name, variable, body] = match;
  symbols.set(name, {
    id: name,
    kind: 'shape',
    type: 'function',
    payload: {
      expression: body.trim(),
      variable: variable.trim(),
      scope: captureFunctionScope(scope, name, variable)
    },
    layerId: 'content'
  });
  return symbols;
};

const captureFunctionScope = (
  scope: Record<string, unknown>,
  functionName: string,
  variableName: string
): Record<string, unknown> => Object.fromEntries(
  Object.entries(scope).filter(([key, value]) => (
    key !== functionName
    && key !== variableName
    && key !== 'x'
    && key !== 'y'
    && key !== 'e'
    && key !== 'pi'
    && (typeof value === 'number' || typeof value === 'function')
  ))
);

const buildMathExpressionNodes = (
  command: PlaygroundCanvasCommand,
  scope: Record<string, unknown>
): { ok: true; nodes: GraphObjectNode[] } | { ok: false; message: string } => {
  let node: math.MathNode;
  try {
    node = math.parse(command.expression);
  } catch (error) {
    return { ok: false, message: `表达式解析失败：${formatError(error)}` };
  }

  try {
    if ((node as any).isAssignmentNode) {
      const variableName = (node as any).object?.name;
      if (variableName !== 'x' && variableName !== 'y') {
        node.compile().evaluate(scope);
        return { ok: true, nodes: [] };
      }
      return createSampledNode(command, (node as any).value, scope);
    }

    if (node.type === 'FunctionAssignmentNode') {
      node.compile().evaluate(scope);
      const params = (node as any).params ?? [];
      if (command.options?.plot === false || params.length !== 1 || params[0] !== 'x') {
        return { ok: true, nodes: [] };
      }
      return createSampledNode(command, (node as any).expr, scope);
    }

    return createSampledNode(command, node, scope);
  } catch (error) {
    return { ok: false, message: `表达式求值失败：${formatError(error)}` };
  }
};

const createSampledNode = (
  command: PlaygroundCanvasCommand,
  expressionNode: math.MathNode,
  scope: Record<string, unknown>
): { ok: true; nodes: GraphObjectNode[] } | { ok: false; message: string } => {
  const code = expressionNode.compile();
  return createSampledFunctionNode(command, command.id, command.expression, (x) => code.evaluate({ ...scope, x }));
};

const createSampledDescriptorNode = (
  command: PlaygroundCanvasCommand,
  id: string,
  descriptor: { expression: string; variable: string; domain?: [number, number]; scope?: Record<string, unknown> },
  scope: Record<string, unknown>
): { ok: true; nodes: GraphObjectNode[] } | { ok: false; message: string } => {
  let code: math.EvalFunction;
  try {
    code = math.parse(descriptor.expression).compile();
  } catch (error) {
    return { ok: false, message: `函数解析失败：${formatError(error)}` };
  }
  return createSampledFunctionNode(
    command,
    id,
    descriptor.expression,
    (x) => code.evaluate({ ...(descriptor.scope ?? {}), ...scope, [descriptor.variable]: x }),
    descriptor.domain
  );
};

const createSampledFunctionNode = (
  command: PlaygroundCanvasCommand,
  id: string,
  expression: string,
  evaluate: (x: number) => unknown,
  domain?: [number, number]
): { ok: true; nodes: GraphObjectNode[] } | { ok: false; message: string } => {
  const segments: Array<Array<{ x: number; y: number }>> = [];
  let currentSegment: Array<{ x: number; y: number }> = [];
  const { left, right, bottom, top } = PLAYGROUND_CANVAS_WORLD_BOUNDS;
  const min = domain?.[0] ?? left;
  const max = domain?.[1] ?? right;
  const nominalStep = Math.abs(max - min) / Math.max(1, SAMPLE_STEPS - 1);
  const maxYJump = Math.abs(top - bottom) * 1.5;

  const flushSegment = () => {
    if (currentSegment.length >= 2) segments.push(currentSegment);
    currentSegment = [];
  };

  for (let index = 0; index < SAMPLE_STEPS; index += 1) {
    const x = min + ((max - min) * index) / (SAMPLE_STEPS - 1);
    let y: unknown;
    try {
      y = evaluate(x);
    } catch {
      flushSegment();
      continue;
    }
    if (typeof y !== 'number' || !Number.isFinite(y) || y < bottom * 4 || y > top * 4) {
      flushSegment();
      continue;
    }

    const previous = currentSegment[currentSegment.length - 1];
    if (previous && (Math.abs(x - previous.x) > nominalStep * 1.5 || Math.abs(y - previous.y) > maxYJump)) {
      flushSegment();
    }
    currentSegment.push({ x, y });
  }
  flushSegment();

  if (segments.length === 0) {
    return { ok: false, message: 'Canvas2D 后端没有采样到可绘制的函数点。' };
  }

  return {
    ok: true,
    nodes: segments.map((points, index) => withRenderHints({
      id: segments.length === 1 ? id : `${id}:segment-${index + 1}`,
      kind: 'shape',
      type: 'function',
      payload: {
        expression,
        geometry: { kind: 'polyline', points }
      },
      layerId: 'content'
    }, command))
  };
};

const normalizeCanvasConicNode = (
  node: GraphObjectNode,
  symbols: GraphCommandSymbolTable
): { ok: true; node: GraphObjectNode } | { ok: false; message: string } => {
  const payload = asRecord(node.payload);
  const definition = asRecord(payload?.definition);
  const conicKind = typeof payload?.conicKind === 'string' ? payload.conicKind : '';
  if (definition?.mode !== 'center-radii' || (conicKind !== 'ellipse' && conicKind !== 'hyperbola')) {
    return { ok: false, message: 'Canvas2D 后端当前只显示 Ellipse/Hyperbola 的 center-radii 形式；通用隐式二次曲线仍保留为 core IR。' };
  }

  const center = resolvePointSource(definition.center, symbols);
  const radiusX = readNumber(definition.radiusX, NaN);
  const radiusY = readNumber(definition.radiusY, NaN);
  const rotationRadians = readNumber(definition.rotationRadians, 0);
  if (!center || !Number.isFinite(radiusX) || !Number.isFinite(radiusY)) {
    return { ok: false, message: 'Canvas2D 后端无法解析圆锥曲线中心或半径。' };
  }

  return {
    ok: true,
    node: {
      ...node,
      payload: {
        ...payload,
        geometry: {
          kind: conicKind,
          center,
          radiusX,
          radiusY,
          rotationRadians
        }
      }
    }
  };
};

const addMeasurementAnchor = (node: GraphObjectNode, symbols: GraphCommandSymbolTable): GraphObjectNode => {
  const payload = asRecord(node.payload);
  const existingPoint = readPoint(payload?.point);
  if (existingPoint) return node;

  const pointList = Array.isArray(payload?.points) ? payload.points.map(readPoint).filter((point): point is { x: number; y: number } => !!point) : [];
  const anchor = pointList.length > 0
    ? averagePoints(pointList)
    : resolveMeasurementTargetAnchor(payload?.targets, symbols);
  if (!anchor) return node;

  return {
    ...node,
    payload: {
      ...payload,
      point: anchor,
      text: formatMeasurementLabel(payload)
    }
  };
};

const resolveMeasurementTargetAnchor = (targets: unknown, symbols: GraphCommandSymbolTable): { x: number; y: number } | null => {
  if (!Array.isArray(targets)) return null;
  const anchors = targets
    .map((target) => asRecord(target)?.objectId)
    .filter((id): id is string => typeof id === 'string')
    .map((id) => getNodeById(id, symbols))
    .map((node) => node ? getNodeAnchor(node) : null)
    .filter((point): point is { x: number; y: number } => !!point);
  return anchors.length > 0 ? averagePoints(anchors) : null;
};

const getNodeAnchor = (node: GraphObjectNode): { x: number; y: number } | null => {
  const payload = asRecord(node.payload);
  const point = readPoint(payload?.point);
  if (point) return point;
  if (readPoint(payload?.start) && readPoint(payload?.end)) return averagePoints([readPoint(payload?.start)!, readPoint(payload?.end)!]);
  const geometry = asRecord(payload?.geometry);
  if (readPoint(geometry?.center)) return readPoint(geometry?.center);
  if (readPoint(geometry?.start) && readPoint(geometry?.end)) return averagePoints([readPoint(geometry?.start)!, readPoint(geometry?.end)!]);
  if (Array.isArray(geometry?.vertices)) {
    const vertices = geometry.vertices.map(readPoint).filter((entry): entry is { x: number; y: number } => !!entry);
    if (vertices.length > 0) return averagePoints(vertices);
  }
  if (Array.isArray(geometry?.points)) {
    const points = geometry.points.map(readPoint).filter((entry): entry is { x: number; y: number } => !!entry);
    if (points.length > 0) return averagePoints(points);
  }
  return null;
};

const getNodeById = (id: string, symbols: GraphCommandSymbolTable): GraphObjectNode | null => {
  const record = symbols.resolve?.(id);
  return record?.node ?? symbols.get(id) ?? null;
};

const resolvePointSource = (value: unknown, symbols: GraphCommandSymbolTable): { x: number; y: number } | null => {
  const record = asRecord(value);
  const coordinates = asRecord(record?.coordinates);
  if (coordinates?.dimension === '2d') {
    const point = readPoint(coordinates);
    if (point) return point;
  }
  if (typeof record?.objectId === 'string') {
    const node = getNodeById(record.objectId, symbols);
    return node ? getNodeAnchor(node) : null;
  }
  return readPoint(value);
};

const readFunctionDescriptor = (value: unknown): { expression: string; variable: string; domain?: [number, number]; scope?: Record<string, unknown> } | null => {
  const record = asRecord(value);
  if (typeof record?.expression !== 'string') return null;
  const domain = Array.isArray(record.domain)
    && record.domain.length >= 2
    && typeof record.domain[0] === 'number'
    && typeof record.domain[1] === 'number'
    ? [record.domain[0], record.domain[1]] as [number, number]
    : undefined;
  return {
    expression: record.expression,
    variable: typeof record.variable === 'string' ? record.variable : 'x',
    domain,
    scope: asRecord(record.scope) ? { ...asRecord(record.scope)! } : undefined
  };
};

const averagePoints = (points: Array<{ x: number; y: number }>): { x: number; y: number } => ({
  x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
  y: points.reduce((sum, point) => sum + point.y, 0) / points.length
});

const formatMeasurementLabel = (payload: Record<string, unknown> | null): string => {
  const kind = typeof payload?.measurementKind === 'string' ? payload.measurementKind : 'measure';
  const value = typeof payload?.value === 'number' && Number.isFinite(payload.value)
    ? Number(payload.value.toFixed(3)).toString()
    : String(payload?.expression ?? '');
  return `${kind}: ${value}`;
};

const readPoint = (value: unknown): { x: number; y: number } | null => {
  const record = asRecord(value);
  return typeof record?.x === 'number' && Number.isFinite(record.x)
    && typeof record.y === 'number' && Number.isFinite(record.y)
    ? { x: record.x, y: record.y }
    : null;
};

const asRecord = (value: unknown): Record<string, unknown> | null => typeof value === 'object' && value !== null ? value as Record<string, unknown> : null;
const readString = (value: unknown, fallback: string): string => typeof value === 'string' ? value : fallback;
const readNumber = (value: unknown, fallback: number): number => typeof value === 'number' && Number.isFinite(value) ? value : fallback;
const formatError = (error: unknown): string => error instanceof Error ? error.message : String(error);
