import * as math from 'mathjs';
import {
  projectSurfaceWireframeIsometric,
  sampleExplicitSurfaceWireframe,
  sampleFunctionSegments,
  sampleImplicitEquationSegments,
  sampleParametricClosedCurve,
  sampleParametricSurfaceWireframe,
  type SceneSamplePoint2D,
  type SceneSamplePoint3D
} from '@vuegraphx/math';
import {
  CURRICULUM_PARITY_BACKENDS,
  createParitySnapshot,
  type CurriculumBackendId,
  type GraphObjectNode,
  type NormalizedParitySnapshot
} from '@vuegraphx/core';
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
const IMPLICIT_GRID_SIZE = 72;
const SURFACE_DOMAIN: readonly [number, number] = [-4, 4];
const SURFACE_Z_SCALE = 0.34;
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
  'conic',
  'equation',
  'solid',
  'parametric',
  'coordinate-system'
]);

export interface PlaygroundSceneBuildOptions {
  backendId?: CurriculumBackendId;
  renderMode?: '2d' | '3d';
}

export const buildPlaygroundCanvasScene = (commands: readonly PlaygroundCanvasCommand[]): PlaygroundCanvasSceneResult => (
  buildPlaygroundCoreScene(commands, { backendId: 'canvas2d', renderMode: '2d' })
);

export const buildPlaygroundBabylonScene = (
  commands: readonly PlaygroundCanvasCommand[],
  options: PlaygroundSceneBuildOptions = {}
): PlaygroundCanvasSceneResult => (
  buildPlaygroundCoreScene(commands, { backendId: 'babylon', renderMode: options.renderMode ?? '2d' })
);

export const buildPlaygroundJsxGraphScene = (commands: readonly PlaygroundCanvasCommand[]): PlaygroundCanvasSceneResult => (
  buildPlaygroundCoreScene(commands, { backendId: 'jsxgraph', renderMode: '2d' })
);

const buildPlaygroundCoreScene = (
  commands: readonly PlaygroundCanvasCommand[],
  options: Required<Pick<PlaygroundSceneBuildOptions, 'backendId' | 'renderMode'>>
): PlaygroundCanvasSceneResult => {
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
        const expanded = expandCanvasCommandNode(result.value.node, command, symbols, scope, options);
        if (expanded.ok) {
          nodes.push(...expanded.nodes);
        } else {
          diagnostics.push({ commandId: command.id, message: expanded.message });
        }
        continue;
      }
      const mathNodes = buildMathExpressionNodes(command, scope, options);
      if (mathNodes.ok) {
        nodes.push(...mathNodes.nodes);
        symbols = registerMathFunctionSymbol(expression, symbols, scope);
        continue;
      }
      diagnostics.push({
        commandId: command.id,
        message: result.diagnostics[0]?.message ?? `${backendLabel(options.backendId)} 暂不支持该指令。`
      });
      continue;
    }

    const mathNodes = buildMathExpressionNodes(command, scope, options);
    if (mathNodes.ok) {
      nodes.push(...mathNodes.nodes);
      symbols = registerMathFunctionSymbol(expression, symbols, scope);
      continue;
    }

    diagnostics.push({ commandId: command.id, message: mathNodes.ok ? `${backendLabel(options.backendId)} 暂不支持该指令。` : mathNodes.message });
  }

  return { nodes, diagnostics };
};

export const createPlaygroundParitySnapshot = (
  demoId: string,
  nodes: readonly GraphObjectNode[],
  backendId: CurriculumBackendId,
  rowIds: readonly string[]
): NormalizedParitySnapshot => createParitySnapshot(demoId, nodes, {
  backendId,
  backendIds: CURRICULUM_PARITY_BACKENDS,
  curriculumRowIds: rowIds
});

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

const backendLabel = (backendId: CurriculumBackendId): string => {
  if (backendId === 'jsxgraph') return 'JSXGraph 后端';
  if (backendId === 'babylon') return 'Babylon 后端';
  return 'Canvas2D 后端';
};

const normalizeSceneContractNode = (node: GraphObjectNode): GraphObjectNode => {
  const payload = asRecord(node.payload);
  const geometry = asRecord(payload?.geometry);
  const geometryKind = typeof geometry?.kind === 'string' ? geometry.kind : '';
  const relationTypes = new Set(['perpendicular-line', 'parallel-line', 'tangent']);

  if (relationTypes.has(node.type) && geometryKind === 'line') {
    return { ...node, kind: 'shape', type: 'line' };
  }

  if (node.type === 'translated' || node.type === 'rotated') {
    if (geometryKind === 'polygon') return { ...node, kind: 'shape', type: 'polygon' };
    if (geometryKind === 'polyline') return { ...node, kind: 'shape', type: 'polyline' };
    if (geometryKind === 'circle') return { ...node, kind: 'shape', type: 'circle' };
    if (geometryKind === 'line' || geometryKind === 'segment' || geometryKind === 'ray') {
      return { ...node, kind: 'shape', type: geometryKind };
    }
    if (payload?.point || payload?.position) return { ...node, kind: 'shape', type: 'point' };
  }

  if ((node.type === 'midpoint' || node.type === 'intersection') && (payload?.point || payload?.position)) {
    return { ...node, kind: 'shape', type: 'point' };
  }

  const vectorStart = readPoint(payload?.start);
  const vectorEnd = readPoint(payload?.end);
  if (node.type === 'vector' && vectorStart && vectorEnd) {
    return {
      ...node,
      payload: {
        ...payload,
        geometry: {
          kind: 'segment',
          start: vectorStart,
          end: vectorEnd
        }
      }
    };
  }

  return node;
};

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
        message: `课程场景指令编译失败：${formatError(error)}`,
        severity: 'error'
      }]
    };
  }
};

const expandCanvasCommandNode = (
  node: GraphObjectNode,
  command: PlaygroundCanvasCommand,
  symbols: GraphCommandSymbolTable,
  scope: Record<string, unknown>,
  options: Required<Pick<PlaygroundSceneBuildOptions, 'backendId' | 'renderMode'>>
): { ok: true; nodes: GraphObjectNode[] } | { ok: false; message: string } => {
  if (node.type === 'variable') return { ok: true, nodes: [] };

  if (node.type === 'function' || node.type === 'derivative') {
    const descriptor = readFunctionDescriptor(node.payload);
    if (!descriptor) return { ok: false, message: `${backendLabel(options.backendId)} 无法读取函数描述符。` };
    return createSampledDescriptorNode(command, node.id, descriptor, scope);
  }

  if (node.type === 'equation') {
    return createEquationPolylineNode(command, node);
  }

  if (node.type === 'solid' && isSurfacePayload(node.payload)) {
    return createSurfaceWireframeNode(command, node, options);
  }

  if (node.type === 'conic') {
    const normalized = normalizeCanvasConicNode(node, symbols);
    if (!normalized.ok) return { ok: false, message: normalized.message };
    return { ok: true, nodes: [withRenderHints(normalized.node, command)] };
  }

  if (node.type === 'solid') {
    return { ok: true, nodes: [withRenderHints(addSolidProjectionGeometry(node), command)] };
  }

  if (!CANVAS_RENDERABLE_TYPES.has(node.type)) {
    return { ok: false, message: `${backendLabel(options.backendId)} 暂不支持 ${node.type} 指令。` };
  }

  const normalizedMeasurement = node.type === 'measurement'
    ? addMeasurementAnchor(node, symbols)
    : node;
  return { ok: true, nodes: [withRenderHints(normalizeSceneContractNode(normalizedMeasurement), command)] };
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
  scope: Record<string, unknown>,
  options: Required<Pick<PlaygroundSceneBuildOptions, 'backendId' | 'renderMode'>>
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
      if (variableName === 'z' || variableName === 'Z') {
        return createExplicitSurfaceWireframeNode(command, (node as any).value.toString(), scope, options);
      }
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
  const { left, right, bottom, top } = PLAYGROUND_CANVAS_WORLD_BOUNDS;
  const segments = sampleFunctionSegments(evaluate, {
    min: domain?.[0] ?? left,
    max: domain?.[1] ?? right,
    yMin: bottom,
    yMax: top,
    steps: SAMPLE_STEPS
  });

  if (segments.length === 0) {
    return { ok: false, message: '当前后端没有采样到可绘制的函数点。' };
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

const createEquationPolylineNode = (
  command: PlaygroundCanvasCommand,
  node: GraphObjectNode
): { ok: true; nodes: GraphObjectNode[] } | { ok: false; message: string } => {
  const payload = asRecord(node.payload);
  const expression = typeof payload?.expression === 'string' ? payload.expression : '';
  const segments = sampleImplicitEquationSegments(expression, {
    bounds: PLAYGROUND_CANVAS_WORLD_BOUNDS,
    grid: IMPLICIT_GRID_SIZE
  });
  if (segments.length === 0) return { ok: false, message: '当前后端没有采样到可绘制的方程等值线。' };

  return {
    ok: true,
    nodes: [withRenderHints({
      ...node,
      payload: {
        ...payload,
        expression,
        geometry: createPolylineOrMultilineGeometry(segments)
      }
    }, command)]
  };
};

const createExplicitSurfaceWireframeNode = (
  command: PlaygroundCanvasCommand,
  zExpression: string,
  scope: Record<string, unknown>,
  options: Required<Pick<PlaygroundSceneBuildOptions, 'backendId' | 'renderMode'>>
): { ok: true; nodes: GraphObjectNode[] } | { ok: false; message: string } => (
  createSurfaceWireframeNode(command, {
    id: command.id,
    kind: 'shape',
    type: 'solid',
    payload: {
      objectType: 'solid',
      solidKind: 'surface',
      family: 'surface',
      surfaceKind: 'explicit',
      expression: `z = ${zExpression}`,
      xExpression: 'x',
      yExpression: 'y',
      zExpression,
      xDomain: [...SURFACE_DOMAIN],
      yDomain: [...SURFACE_DOMAIN],
      scope: readNumericRecord(scope)
    },
    layerId: 'content'
  }, options)
);

const createSurfaceWireframeNode = (
  command: PlaygroundCanvasCommand,
  node: GraphObjectNode,
  options: Required<Pick<PlaygroundSceneBuildOptions, 'backendId' | 'renderMode'>>
): { ok: true; nodes: GraphObjectNode[] } | { ok: false; message: string } => {
  const payload = asRecord(node.payload) ?? {};
  const surfaceKind = typeof payload.surfaceKind === 'string' ? payload.surfaceKind : 'explicit';
  const scope = readNumericRecord(payload.scope);
  let segments3D: SceneSamplePoint3D[][];
  try {
    if (surfaceKind === 'parametric') {
      const uDomain = readNumberPair(payload.uDomain) ?? [0, Math.PI * 2] as [number, number];
      const vDomain = readNumberPair(payload.vDomain) ?? [0, Math.PI * 2] as [number, number];
      segments3D = sampleParametricSurfaceWireframe({
        xExpression: readString(payload.xExpression, 'u'),
        yExpression: readString(payload.yExpression, 'v'),
        zExpression: readString(payload.zExpression, '0'),
        uDomain,
        vDomain,
        uSteps: readNumber(payload.uSteps, 25),
        vSteps: readNumber(payload.vSteps, 17),
        scope,
        zScale: readNumber(payload.zScale, 1)
      });
    } else {
      segments3D = sampleExplicitSurfaceWireframe({
        expression: readString(payload.zExpression, readString(payload.expression, '0').replace(/^z\s*=\s*/i, '')),
        xDomain: readNumberPair(payload.xDomain) ?? SURFACE_DOMAIN,
        yDomain: readNumberPair(payload.yDomain) ?? SURFACE_DOMAIN,
        xSteps: readNumber(payload.xSteps, 17),
        ySteps: readNumber(payload.ySteps, 17),
        scope,
        zScale: readNumber(payload.zScale, SURFACE_Z_SCALE)
      });
    }
  } catch (error) {
    return { ok: false, message: `曲面采样失败：${formatError(error)}` };
  }

  if (segments3D.length === 0) return { ok: false, message: '没有采样到可绘制的曲面线框。' };
  const useNative3D = options.backendId === 'babylon' && options.renderMode === '3d';
  const segments = useNative3D ? segments3D : projectSurfaceWireframeIsometric(segments3D);

  return {
    ok: true,
    nodes: [withRenderHints({
      ...node,
      type: 'solid',
      payload: {
        ...payload,
        objectType: 'solid',
        solidKind: 'surface',
        family: 'surface',
        geometry: {
          kind: 'wireframe',
          projection: useNative3D ? 'xyz' : 'isometric',
          segments
        }
      }
    }, command)]
  };
};

const createPolylineOrMultilineGeometry = (segments: SceneSamplePoint2D[][]): Record<string, unknown> => (
  segments.length === 1
    ? { kind: 'polyline', points: segments[0] }
    : { kind: 'multiline', segments }
);

const normalizeCanvasConicNode = (
  node: GraphObjectNode,
  symbols: GraphCommandSymbolTable
): { ok: true; node: GraphObjectNode } | { ok: false; message: string } => {
  const payload = asRecord(node.payload);
  const definition = asRecord(payload?.definition);
  const conicKind = typeof payload?.conicKind === 'string' ? payload.conicKind : '';
  if (conicKind === 'parabola' && definition?.mode === 'focus-directrix') {
    const focus = resolvePointSource(definition.focus, symbols);
    const directrixNode = typeof asRecord(definition.directrix)?.objectId === 'string'
      ? getNodeById(String(asRecord(definition.directrix)?.objectId), symbols)
      : null;
    const directrix = directrixNode ? readLineGeometry(directrixNode) : null;
    if (!focus || !directrix) return { ok: false, message: '当前后端无法解析抛物线焦点或准线。' };
    return {
      ok: true,
      node: {
        ...node,
        payload: {
          ...payload,
          geometry: {
            kind: 'polyline',
            points: sampleFocusDirectrixParabola(focus, directrix)
          }
        }
      }
    };
  }

  if (definition?.mode === 'equation' && typeof definition.expression === 'string') {
    const segments = sampleImplicitEquationSegments(definition.expression, { bounds: PLAYGROUND_CANVAS_WORLD_BOUNDS, grid: IMPLICIT_GRID_SIZE });
    if (segments.length === 0) return { ok: false, message: '当前后端没有采样到可绘制的圆锥曲线等值线。' };
    return {
      ok: true,
      node: {
        ...node,
        payload: {
          ...payload,
          expression: definition.expression,
          geometry: createPolylineOrMultilineGeometry(segments)
        }
      }
    };
  }

  if (definition?.mode !== 'center-radii' || (conicKind !== 'ellipse' && conicKind !== 'hyperbola')) {
    return { ok: false, message: '当前后端可显示 Ellipse/Hyperbola 的 center-radii 形式；通用隐式二次曲线保留为 core IR。' };
  }

  const center = resolvePointSource(definition.center, symbols);
  const radiusX = readNumber(definition.radiusX, NaN);
  const radiusY = readNumber(definition.radiusY, NaN);
  const rotationRadians = readNumber(definition.rotationRadians, 0);
  if (!center || !Number.isFinite(radiusX) || !Number.isFinite(radiusY)) {
    return { ok: false, message: '当前后端无法解析圆锥曲线中心或半径。' };
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

const sampleFocusDirectrixParabola = (
  focus: { x: number; y: number },
  directrix: { point: { x: number; y: number }; direction: { x: number; y: number } }
): Array<{ x: number; y: number }> => {
  const magnitude = Math.hypot(directrix.direction.x, directrix.direction.y);
  if (magnitude <= 1e-9) return [];
  const axisU = { x: directrix.direction.x / magnitude, y: directrix.direction.y / magnitude };
  let axisV = { x: -axisU.y, y: axisU.x };
  let focusV = dot(subtractPoints(focus, directrix.point), axisV);
  if (Math.abs(focusV) <= 1e-9) return [];
  if (focusV < 0) {
    axisV = { x: -axisV.x, y: -axisV.y };
    focusV = -focusV;
  }
  const focusU = dot(subtractPoints(focus, directrix.point), axisU);
  const span = Math.max(6, Math.abs(focusV) * 5);
  const points: Array<{ x: number; y: number }> = [];
  for (let index = 0; index < SAMPLE_STEPS; index += 1) {
    const u = focusU - span + (2 * span * index) / (SAMPLE_STEPS - 1);
    const v = (((u - focusU) ** 2) + focusV ** 2) / (2 * focusV);
    points.push({
      x: directrix.point.x + axisU.x * u + axisV.x * v,
      y: directrix.point.y + axisU.y * u + axisV.y * v
    });
  }
  return points;
};

const addSolidProjectionGeometry = (node: GraphObjectNode): GraphObjectNode => {
  const payload = asRecord(node.payload);
  const existingGeometry = asRecord(payload?.geometry);
  if (existingGeometry?.kind === 'polyline') return node;
  return {
    ...node,
    payload: {
      ...payload,
      geometry: {
        kind: 'polyline',
        points: createSolidProjectionPolyline(payload)
      }
    }
  };
};

const createSolidProjectionPolyline = (payload: Record<string, unknown> | null): Array<{ x: number; y: number }> => {
  const family = typeof payload?.family === 'string' ? payload.family : 'cube';
  const parameters = asRecord(payload?.parameters) ?? {};
  const origin = readPoint(asRecord(payload?.origin)) ?? { x: 0, y: 0 };
  const size = readPositiveNumber(parameters.size, 2);
  const width = readPositiveNumber(parameters.width, size);
  const height = readPositiveNumber(parameters.height, size);
  const radius = readPositiveNumber(parameters.radius, Math.max(width, height) / 2);
  if (family === 'sphere' || family === 'cylinder' || family === 'cone' || family.includes('frustum')) {
    return sampleParametricClosedCurve((theta) => ({
      x: origin.x + radius * Math.cos(theta),
      y: origin.y + (height / 2) * Math.sin(theta)
    }), 97);
  }
  const depthOffset = Math.max(0.45, width * 0.22);
  const front = [
    { x: origin.x - width / 2, y: origin.y - height / 2 },
    { x: origin.x + width / 2, y: origin.y - height / 2 },
    { x: origin.x + width / 2, y: origin.y + height / 2 },
    { x: origin.x - width / 2, y: origin.y + height / 2 },
    { x: origin.x - width / 2, y: origin.y - height / 2 }
  ];
  const back = front.map((point) => ({ x: point.x + depthOffset, y: point.y + depthOffset }));
  return [
    ...front,
    back[0], back[1], front[1], back[1], back[2], front[2], back[2], back[3], front[3], back[3], back[0]
  ];
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

const readLineGeometry = (node: GraphObjectNode): { point: { x: number; y: number }; direction: { x: number; y: number } } | null => {
  const payload = asRecord(node.payload);
  const geometry = asRecord(payload?.geometry);
  const point = readPoint(geometry?.point) ?? readPoint(geometry?.origin) ?? readPoint(geometry?.start);
  const direction = readPoint(geometry?.direction);
  if (point && direction) return { point, direction };
  const start = readPoint(geometry?.start) ?? readPoint(payload?.start);
  const end = readPoint(geometry?.end) ?? readPoint(payload?.end);
  if (start && end) return { point: start, direction: subtractPoints(end, start) };
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
  const domain = readFunctionDomain(record.domain);
  return {
    expression: record.expression,
    variable: typeof record.variable === 'string' ? record.variable : 'x',
    domain,
    scope: {
      ...readNumericRecord(record.scope),
      ...readNumericRecord(record.parameters)
    }
  };
};

const readNumericRecord = (value: unknown): Record<string, number> => {
  const record = asRecord(value);
  if (!record) return {};
  return Object.fromEntries(
    Object.entries(record).filter((entry): entry is [string, number] => (
      typeof entry[1] === 'number' && Number.isFinite(entry[1])
    ))
  );
};

const readFunctionDomain = (value: unknown): [number, number] | undefined => {
  if (Array.isArray(value)
    && value.length >= 2
    && typeof value[0] === 'number'
    && Number.isFinite(value[0])
    && typeof value[1] === 'number'
    && Number.isFinite(value[1])) {
    return [value[0], value[1]];
  }
  const record = asRecord(value);
  return typeof record?.min === 'number'
    && Number.isFinite(record.min)
    && typeof record.max === 'number'
    && Number.isFinite(record.max)
    ? [record.min, record.max]
    : undefined;
};

const isSurfacePayload = (payload: unknown): boolean => {
  const record = asRecord(payload);
  return record?.solidKind === 'surface' || record?.family === 'surface' || typeof record?.zExpression === 'string';
};

const readNumberPair = (value: unknown): [number, number] | null => {
  if (!Array.isArray(value) || value.length < 2) return null;
  const first = readNumber(value[0], NaN);
  const second = readNumber(value[1], NaN);
  return Number.isFinite(first) && Number.isFinite(second) && first < second ? [first, second] : null;
};

const averagePoints = (points: Array<{ x: number; y: number }>): { x: number; y: number } => ({
  x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
  y: points.reduce((sum, point) => sum + point.y, 0) / points.length
});

const subtractPoints = (
  left: { x: number; y: number },
  right: { x: number; y: number }
): { x: number; y: number } => ({ x: left.x - right.x, y: left.y - right.y });

const dot = (
  left: { x: number; y: number },
  right: { x: number; y: number }
): number => left.x * right.x + left.y * right.y;

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
const readPositiveNumber = (value: unknown, fallback: number): number => typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback;
const formatError = (error: unknown): string => error instanceof Error ? error.message : String(error);
