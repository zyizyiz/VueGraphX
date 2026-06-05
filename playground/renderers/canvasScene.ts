import * as math from 'mathjs';
import {
  clipSegmentsToBounds2D,
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
  STANDARD_GEOMETRY_ANNOTATION_UI,
  STANDARD_GEOMETRY_MARKER_UI,
  createStandardCoordinateSystemGeometry,
  createParitySnapshot,
  resolveGraphGridSnapOptions,
  snapPointToGraphGrid,
  type CurriculumBackendId,
  type GraphObjectNode,
  type NormalizedParitySnapshot,
  type StandardCoordinateAxisTickStrategy
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

export interface PlaygroundLayered3DSceneResult {
  babylon: PlaygroundCanvasSceneResult;
  overlay: PlaygroundCanvasSceneResult;
}

type PlaygroundSceneBackendId = CurriculumBackendId | 'babylon';
type PlaygroundSceneBuildContext = { backendId: PlaygroundSceneBackendId; renderMode: '2d' | '3d' };

interface OperationCoordinateSystemRuntimeOptions {
  id: string;
  origin: { x: number; y: number };
  unitScale: number;
  xRange: { min: number; max: number };
  yRange: { min: number; max: number };
  snapToGrid?: unknown;
  tickPolicy?: {
    x?: StandardCoordinateAxisTickStrategy;
    y?: StandardCoordinateAxisTickStrategy;
  };
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

const POINT_RENDER_HINT_OPTION_KEYS = [
  'pointShadowColor',
  'pointShadowBlur',
  'pointShadowOffsetX',
  'pointShadowOffsetY'
] as const;

const TEXT_RENDER_HINT_OPTION_KEYS = [
  'font',
  'textBackgroundColor',
  'textBorderColor',
  'textBorderWidth',
  'textBorderRadius',
  'textPaddingX',
  'textPaddingY',
  'textOffsetX',
  'textOffsetY',
  'textShadowColor',
  'textShadowBlur',
  'textShadowOffsetX',
  'textShadowOffsetY',
  'textOpacity'
] as const;

export interface PlaygroundSceneBuildOptions {
  backendId?: PlaygroundSceneBackendId;
  renderMode?: '2d' | '3d';
}

export const buildPlaygroundCanvasScene = (commands: readonly PlaygroundCanvasCommand[]): PlaygroundCanvasSceneResult => (
  buildPlaygroundCoreScene(commands, { backendId: 'canvas2d', renderMode: '2d' })
);

export const buildPlaygroundBabylonScene = (
  commands: readonly PlaygroundCanvasCommand[],
  _options: { renderMode?: '3d' } = {}
): PlaygroundCanvasSceneResult => (
  buildPlaygroundCoreScene(commands, { backendId: 'babylon', renderMode: '3d' })
);

export const buildPlaygroundJsxGraphScene = (commands: readonly PlaygroundCanvasCommand[]): PlaygroundCanvasSceneResult => (
  buildPlaygroundCoreScene(commands, { backendId: 'jsxgraph', renderMode: '2d' })
);

export const buildPlaygroundLayered3DScene = (
  commands: readonly PlaygroundCanvasCommand[]
): PlaygroundLayered3DSceneResult => {
  const babylon = buildPlaygroundBabylonScene(commands, { renderMode: '3d' });
  const overlayBase = buildPlaygroundCanvasScene(commands);
  return {
    babylon: {
      ...babylon,
      nodes: babylon.nodes.filter(isPlayground3DNode)
    },
    overlay: {
      nodes: overlayBase.nodes.filter(isPlayground2DOverlayNode),
      diagnostics: overlayBase.diagnostics
    }
  };
};

const isPlayground3DNode = (node: GraphObjectNode): boolean => node.type === 'solid';
const isPlayground2DOverlayNode = (node: GraphObjectNode): boolean => node.type !== 'solid';

const buildPlaygroundCoreScene = (
  commands: readonly PlaygroundCanvasCommand[],
  options: PlaygroundSceneBuildContext
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
        const node = applyOperationCoordinateSystemOptions(result.value.node, command);
        if (node !== result.value.node) symbols.set(node.id, node);
        const expanded = expandCanvasCommandNode(node, command, symbols, scope, options);
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

  return { nodes: withTextAvoidance(withStableRenderOrder(nodes)), diagnostics };
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

const withRenderHints = (node: GraphObjectNode, command: PlaygroundCanvasCommand): GraphObjectNode => {
  const options = command.options ?? {};
  const existingHints = node.renderHints ?? {};
  const strokeColor = readString(options.strokeColor, command.color);
  const hints: Record<string, unknown> = {
    ...existingHints,
    strokeColor,
    fillColor: readString(options.fillColor, `${command.color}26`),
    fillOpacity: readNumber(options.fillOpacity, readNumber(existingHints.fillOpacity, 1)),
    strokeWidth: readNumber(options.strokeWidth, 2),
    selectionStrokeScale: readSelectionStrokeScale(options.selectionStrokeScale, existingHints.selectionStrokeScale),
    lineDash: readLineDashPattern(options.lineDash) ?? readLineDashPattern(existingHints.lineDash),
    radius: readNumber(options.size, readNumber(options.radius, readNumber(existingHints.radius, STANDARD_GEOMETRY_MARKER_UI.pointRadiusPx)))
  };

  if (node.type === 'point') {
    hints.pointFillColor = readString(options.pointFillColor, readString(existingHints.pointFillColor, STANDARD_GEOMETRY_MARKER_UI.pointFillColor));
    hints.pointStrokeColor = readString(options.pointStrokeColor, readString(existingHints.pointStrokeColor, STANDARD_GEOMETRY_MARKER_UI.pointStrokeColor));
    hints.pointStrokeWidth = readNumber(options.pointStrokeWidth, readNumber(existingHints.pointStrokeWidth, STANDARD_GEOMETRY_MARKER_UI.pointStrokeWidthPx));
    copyExplicitRenderHintOptions(hints, options, POINT_RENDER_HINT_OPTION_KEYS);
  }

  if (node.type === 'text' || node.type === 'measurement') {
    hints.textColor = readString(options.textColor, readString(existingHints.textColor, STANDARD_GEOMETRY_ANNOTATION_UI.textColor));
    hints.fontSize = readNumber(options.fontSize, readNumber(existingHints.fontSize, STANDARD_GEOMETRY_ANNOTATION_UI.textFontSizePx));
    hints.fontFamily = readString(options.fontFamily, readString(existingHints.fontFamily, STANDARD_GEOMETRY_ANNOTATION_UI.textFontFamily));
    hints.fontWeight = readStringOrNumber(options.fontWeight, readStringOrNumber(existingHints.fontWeight, STANDARD_GEOMETRY_ANNOTATION_UI.textFontWeight));
    hints.lineHeight = readNumber(options.lineHeight, readNumber(existingHints.lineHeight, STANDARD_GEOMETRY_ANNOTATION_UI.textLineHeightPx));
    hints.textOffsetX = readNumber(options.textOffsetX, readNumber(existingHints.textOffsetX, STANDARD_GEOMETRY_ANNOTATION_UI.textOffsetXPx));
    hints.textOffsetY = readNumber(options.textOffsetY, readNumber(existingHints.textOffsetY, STANDARD_GEOMETRY_ANNOTATION_UI.textOffsetYPx));
    copyExplicitRenderHintOptions(hints, options, TEXT_RENDER_HINT_OPTION_KEYS);
  }

  return { ...node, renderHints: hints };
};

const withStableRenderOrder = (nodes: readonly GraphObjectNode[]): GraphObjectNode[] => (
  nodes.map((node, index) => ({
    ...node,
    renderHints: {
      ...(node.renderHints ?? {}),
      zIndex: readNumber(node.renderHints?.zIndex, index)
    }
  }))
);

interface TextAvoidanceBox {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

interface TextAvoidanceLabel {
  node: GraphObjectNode;
  index: number;
  anchor: { x: number; y: number };
  text: string;
  width: number;
  height: number;
  bounds: TextAvoidanceBox;
}

const TEXT_AVOIDANCE_PADDING = 0.16;
const TEXT_AVOIDANCE_MIN_GAP = 0.08;

const withTextAvoidance = (nodes: readonly GraphObjectNode[]): GraphObjectNode[] => {
  const labels = nodes
    .map((node, index): TextAvoidanceLabel | null => {
      if (node.type !== 'text' && node.type !== 'measurement') return null;
      if (typeof node.meta?.coordinateSystemId !== 'string') return null;
      const payload = asRecord(node.payload);
      const anchor = readPoint(payload?.point);
      const text = typeof payload?.text === 'string' ? payload.text : '';
      if (!payload || !anchor || !text.trim()) return null;
      const size = estimateTextAvoidanceSize(text);
      return {
        node,
        index,
        anchor,
        text,
        width: size.width,
        height: size.height,
        bounds: readTextAvoidanceBounds(node.renderHints?.clipWorldBounds)
      };
    })
    .filter((label): label is TextAvoidanceLabel => label !== null);

  if (labels.length < 2) return [...nodes];

  const placed: TextAvoidanceBox[] = [];
  const relocated = new Map<number, { x: number; y: number }>();
  for (const label of labels) {
    const position = chooseTextAvoidancePosition(label, placed);
    relocated.set(label.index, position);
    placed.push(textAvoidanceBox(position, label.width, label.height));
  }

  return nodes.map((node, index) => {
    const point = relocated.get(index);
    if (!point) return node;
    const payload = asRecord(node.payload);
    if (!payload) return node;
    return {
      ...node,
      payload: {
        ...payload,
        point,
        labelAnchor: payload.labelAnchor ?? payload.point
      },
      renderHints: {
        ...(node.renderHints ?? {}),
        labelAvoidance: 'playground'
      }
    };
  });
};

const chooseTextAvoidancePosition = (
  label: TextAvoidanceLabel,
  placed: readonly TextAvoidanceBox[]
): { x: number; y: number } => {
  let best = clampTextAvoidancePosition(label.anchor, label.width, label.height, label.bounds);
  let bestScore = Number.POSITIVE_INFINITY;
  for (const candidate of textAvoidanceCandidates(label)) {
    const position = clampTextAvoidancePosition(candidate, label.width, label.height, label.bounds);
    const box = textAvoidanceBox(position, label.width, label.height);
    const overlap = placed.reduce((sum, existing) => sum + textAvoidanceOverlapArea(box, existing), 0);
    const distance = Math.hypot(position.x - label.anchor.x, position.y - label.anchor.y);
    const score = overlap * 1000 + distance;
    if (score < bestScore) {
      best = position;
      bestScore = score;
      if (overlap <= 1e-9) break;
    }
  }
  return best;
};

const textAvoidanceCandidates = (label: TextAvoidanceLabel): Array<{ x: number; y: number }> => {
  const gap = TEXT_AVOIDANCE_PADDING;
  const { x, y } = label.anchor;
  return [
    { x: x + gap, y: y + label.height + gap },
    { x: x + gap, y: y - gap },
    { x: x - label.width - gap, y: y + label.height + gap },
    { x: x - label.width - gap, y: y - gap },
    { x: x - label.width / 2, y: y + label.height + gap },
    { x: x - label.width / 2, y: y - gap },
    { x: x + gap, y: y + label.height / 2 },
    { x: x - label.width - gap, y: y + label.height / 2 },
    { x, y },
    { x: x + gap * 2, y },
    { x: x - label.width - gap * 2, y }
  ];
};

const estimateTextAvoidanceSize = (text: string): { width: number; height: number } => {
  const width = [...text].reduce((sum, char) => sum + (/[\u4e00-\u9fff]/.test(char) ? 0.34 : 0.19), 0);
  return {
    width: Math.max(0.7, width + TEXT_AVOIDANCE_PADDING * 2),
    height: 0.48
  };
};

const textAvoidanceBox = (
  position: { x: number; y: number },
  width: number,
  height: number
): TextAvoidanceBox => ({
  left: position.x,
  right: position.x + width,
  top: position.y,
  bottom: position.y - height
});

const clampTextAvoidancePosition = (
  position: { x: number; y: number },
  width: number,
  height: number,
  bounds: TextAvoidanceBox
): { x: number; y: number } => ({
  x: clampFiniteNumber(position.x, bounds.left, Math.max(bounds.left, bounds.right - width)),
  y: clampFiniteNumber(position.y, Math.min(bounds.top, bounds.bottom + height), bounds.top)
});

const textAvoidanceOverlapArea = (left: TextAvoidanceBox, right: TextAvoidanceBox): number => {
  const width = Math.max(0, Math.min(left.right, right.right) - Math.max(left.left, right.left) + TEXT_AVOIDANCE_MIN_GAP);
  const height = Math.max(0, Math.min(left.top, right.top) - Math.max(left.bottom, right.bottom) + TEXT_AVOIDANCE_MIN_GAP);
  return width * height;
};

const readTextAvoidanceBounds = (value: unknown): TextAvoidanceBox => {
  const bounds = asRecord(value);
  const left = readFiniteNumber(bounds?.left);
  const right = readFiniteNumber(bounds?.right);
  const top = readFiniteNumber(bounds?.top);
  const bottom = readFiniteNumber(bounds?.bottom);
  return left !== null && right !== null && top !== null && bottom !== null && left < right && bottom < top
    ? { left, right, top, bottom }
    : { ...PLAYGROUND_CANVAS_WORLD_BOUNDS };
};

const clampFiniteNumber = (value: number, min: number, max: number): number => (
  Math.max(min, Math.min(max, value))
);

const withOperationCoordinateMeta = (
  node: GraphObjectNode,
  command: PlaygroundCanvasCommand,
  options: { clipToCoordinateSystem?: boolean } = {}
): GraphObjectNode => {
  const coordinateSystem = readOperationCoordinateSystemOptions(command);
  if (!coordinateSystem) return node;
  const isCoordinateSystem = node.type === 'coordinate-system';
  return {
    ...node,
    meta: {
      ...(node.meta ?? {}),
      coordinateSystemId: coordinateSystem.id,
      independentCoordinateSystem: true,
      draggable: isCoordinateSystem,
      ...(coordinateSystem.snapToGrid !== undefined ? { snapToGrid: coordinateSystem.snapToGrid } : {}),
      ...(!isCoordinateSystem ? { dragDisabled: true } : {})
    },
    renderHints: {
      ...(node.renderHints ?? {}),
      draggable: isCoordinateSystem,
      lineCap: 'butt',
      ...(options.clipToCoordinateSystem ? { clipWorldBounds: operationCoordinateWorldBounds(coordinateSystem) } : {})
    }
  };
};

const applyOperationCoordinateSystemOptions = (
  node: GraphObjectNode,
  command: PlaygroundCanvasCommand
): GraphObjectNode => {
  const coordinateSystem = readOperationCoordinateSystemOptions(command);
  if (!coordinateSystem || node.type !== 'coordinate-system') return node;
  const payload = asRecord(node.payload) ?? {};
  const geometry = createOperationCoordinateSystemGeometry(coordinateSystem);
  return withOperationCoordinateMeta({
    ...node,
    payload: {
      ...payload,
      origin: { dimension: '2d', ...coordinateSystem.origin },
      unitPx: coordinateSystem.unitScale,
      xRange: { ...coordinateSystem.xRange },
      yRange: { ...coordinateSystem.yRange },
      size: {
        width: (coordinateSystem.xRange.max - coordinateSystem.xRange.min) * coordinateSystem.unitScale,
        height: (coordinateSystem.yRange.max - coordinateSystem.yRange.min) * coordinateSystem.unitScale
      },
      showAxes: true,
      showTicks: true,
      showLabels: true,
      geometry
    }
  }, command);
};

const createOperationCoordinateSystemGeometry = (coordinateSystem: OperationCoordinateSystemRuntimeOptions) => (
  createStandardCoordinateSystemGeometry({
    origin: coordinateSystem.origin,
    unitPx: coordinateSystem.unitScale,
    xRange: coordinateSystem.xRange,
    yRange: coordinateSystem.yRange,
    showTicks: true,
    showLabels: true,
    includeGrid: false,
    includeBorder: false,
    xTickStrategy: coordinateSystem.tickPolicy?.x,
    yTickStrategy: coordinateSystem.tickPolicy?.y
  })
);

const readOperationCoordinateSystemOptions = (
  command: PlaygroundCanvasCommand
): OperationCoordinateSystemRuntimeOptions | null => {
  const value = asRecord(command.options?.coordinateSystem);
  const origin = asRecord(value?.origin);
  const xRange = asRecord(value?.xRange);
  const yRange = asRecord(value?.yRange);
  const id = typeof value?.id === 'string' && value.id.trim() ? value.id : '';
  const originX = readFiniteNumber(origin?.x);
  const originY = readFiniteNumber(origin?.y);
  const unitScale = readFiniteNumber(value?.unitScale);
  const xMin = readFiniteNumber(xRange?.min);
  const xMax = readFiniteNumber(xRange?.max);
  const yMin = readFiniteNumber(yRange?.min);
  const yMax = readFiniteNumber(yRange?.max);
  if (!id || originX === null || originY === null || unitScale === null || unitScale <= 0) return null;
  if (xMin === null || xMax === null || yMin === null || yMax === null || xMax <= xMin || yMax <= yMin) return null;
  const resolvedOrigin = readOperationCoordinateSystemOrigin({ x: originX, y: originY }, value?.snapToGrid);
  const tickPolicy = readOperationCoordinateTickPolicy(value?.tickPolicy);
  return {
    id,
    origin: resolvedOrigin,
    unitScale,
    xRange: { min: xMin, max: xMax },
    yRange: { min: yMin, max: yMax },
    snapToGrid: value?.snapToGrid,
    ...(tickPolicy ? { tickPolicy } : {})
  };
};

const readOperationCoordinateTickPolicy = (
  value: unknown
): OperationCoordinateSystemRuntimeOptions['tickPolicy'] | null => {
  const record = asRecord(value);
  if (!record) return null;
  const x = readOperationCoordinateTickStrategy(record.x);
  const y = readOperationCoordinateTickStrategy(record.y);
  if (!x && !y) return null;
  return {
    ...(x ? { x } : {}),
    ...(y ? { y } : {})
  };
};

const readOperationCoordinateTickStrategy = (
  value: unknown
): StandardCoordinateAxisTickStrategy | null => {
  const record = asRecord(value);
  if (!record) return null;
  const kind = record?.kind;
  if (kind !== 'integer' && kind !== 'step' && kind !== 'pi' && kind !== 'custom') return null;
  const step = readFiniteNumber(record.step);
  const origin = readFiniteNumber(record.origin);
  const piMultiple = readFiniteNumber(record.piMultiple);
  return {
    kind,
    ...(step !== null ? { step } : {}),
    ...(origin !== null ? { origin } : {}),
    ...(piMultiple !== null ? { piMultiple } : {}),
    ...(Array.isArray(record.labels) ? { labels: readOperationCoordinateCustomTicks(record.labels) } : {})
  };
};

const readOperationCoordinateCustomTicks = (
  values: readonly unknown[]
): StandardCoordinateAxisTickStrategy['labels'] => values
  .map((entry) => {
    const record = asRecord(entry);
    const value = readFiniteNumber(record?.value);
    if (value === null) return null;
    return {
      value,
      ...(typeof record?.label === 'string' ? { label: record.label } : {})
    };
  })
  .filter((entry): entry is { value: number; label?: string } => entry !== null);

const readOperationCoordinateSystemOrigin = (
  origin: { x: number; y: number },
  snapToGrid: unknown
): { x: number; y: number } => {
  const snapOptions = resolveGraphGridSnapOptions(snapToGrid, { enabled: false, step: 1 });
  if (!snapOptions.enabled || snapOptions.phase === 'end') return { ...origin };
  return snapPointToGraphGrid(origin, snapOptions);
};

const transformOperationCoordinateSegments = (
  segments: SceneSamplePoint2D[][],
  coordinateSystem: OperationCoordinateSystemRuntimeOptions
): SceneSamplePoint2D[][] => segments.map((segment) => segment.map((point) => ({
  x: coordinateSystem.origin.x + point.x * coordinateSystem.unitScale,
  y: coordinateSystem.origin.y + point.y * coordinateSystem.unitScale
})));

const transformOperationCoordinatePoint = (
  point: { x: number; y: number },
  coordinateSystem: OperationCoordinateSystemRuntimeOptions
): { x: number; y: number } => ({
  x: coordinateSystem.origin.x + point.x * coordinateSystem.unitScale,
  y: coordinateSystem.origin.y + point.y * coordinateSystem.unitScale
});

const scaleOperationCoordinateVector = (
  point: { x: number; y: number },
  coordinateSystem: OperationCoordinateSystemRuntimeOptions
): { x: number; y: number } => ({
  x: point.x * coordinateSystem.unitScale,
  y: point.y * coordinateSystem.unitScale
});

const operationCoordinateWorldBounds = (
  coordinateSystem: OperationCoordinateSystemRuntimeOptions
): { left: number; right: number; top: number; bottom: number } => ({
  left: coordinateSystem.origin.x + coordinateSystem.xRange.min * coordinateSystem.unitScale,
  right: coordinateSystem.origin.x + coordinateSystem.xRange.max * coordinateSystem.unitScale,
  top: coordinateSystem.origin.y + coordinateSystem.yRange.max * coordinateSystem.unitScale,
  bottom: coordinateSystem.origin.y + coordinateSystem.yRange.min * coordinateSystem.unitScale
});

const clipOperationCoordinateSegments = (
  segments: SceneSamplePoint2D[][],
  coordinateSystem: OperationCoordinateSystemRuntimeOptions
): SceneSamplePoint2D[][] => clipSegmentsToBounds2D(segments, {
  left: coordinateSystem.xRange.min,
  right: coordinateSystem.xRange.max,
  top: coordinateSystem.yRange.max,
  bottom: coordinateSystem.yRange.min
});

const clampOperationCoordinateDomain = (
  domain: [number, number] | undefined,
  coordinateSystem: OperationCoordinateSystemRuntimeOptions
): [number, number] | null => {
  const min = Math.max(domain?.[0] ?? coordinateSystem.xRange.min, coordinateSystem.xRange.min);
  const max = Math.min(domain?.[1] ?? coordinateSystem.xRange.max, coordinateSystem.xRange.max);
  return min < max ? [min, max] : null;
};

const readFiniteNumber = (value: unknown): number | null => (
  typeof value === 'number' && Number.isFinite(value) ? value : null
);

const readLineDashPattern = (value: unknown): number[] | undefined => (
  Array.isArray(value) && value.length > 0 && value.every((entry) => typeof entry === 'number' && Number.isFinite(entry) && entry > 0)
    ? [...value]
    : undefined
);

const backendLabel = (backendId: PlaygroundSceneBackendId): string => {
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

const transformOperationCoordinateNode = (
  node: GraphObjectNode,
  coordinateSystem: OperationCoordinateSystemRuntimeOptions
): GraphObjectNode => {
  if (node.type === 'coordinate-system') return node;
  return {
    ...node,
    payload: transformOperationCoordinateValue(node.payload, coordinateSystem) as GraphObjectNode['payload']
  };
};

const transformOperationCoordinateValue = (
  value: unknown,
  coordinateSystem: OperationCoordinateSystemRuntimeOptions,
  key = ''
): unknown => {
  if (Array.isArray(value)) {
    return value.map((entry) => transformOperationCoordinateValue(entry, coordinateSystem, key));
  }

  const point = readPoint(value);
  if (point && isOperationCoordinatePointKey(key)) {
    return {
      ...(asRecord(value) ?? {}),
      ...transformOperationCoordinatePoint(point, coordinateSystem)
    };
  }
  if (point && key === 'direction') {
    return {
      ...(asRecord(value) ?? {}),
      ...scaleOperationCoordinateVector(point, coordinateSystem)
    };
  }

  const record = asRecord(value);
  if (!record) return value;
  const next: Record<string, unknown> = {};
  for (const [entryKey, entryValue] of Object.entries(record)) {
    if ((entryKey === 'radius' || entryKey === 'radiusX' || entryKey === 'radiusY') && typeof entryValue === 'number' && Number.isFinite(entryValue)) {
      next[entryKey] = entryValue * coordinateSystem.unitScale;
    } else {
      next[entryKey] = transformOperationCoordinateValue(entryValue, coordinateSystem, entryKey);
    }
  }
  return next;
};

const isOperationCoordinatePointKey = (key: string): boolean => (
  [
    'anchor',
    'border',
    'center',
    'centroid',
    'coordinates',
    'end',
    'gridSegments',
    'origin',
    'point',
    'points',
    'position',
    'segments',
    'start',
    'through',
    'tickPoints',
    'vertex',
    'vertices',
    'xAxis',
    'yAxis'
  ].includes(key)
);

const prepareOperationCoordinateNode = (
  node: GraphObjectNode,
  command: PlaygroundCanvasCommand,
  options: { clipToCoordinateSystem?: boolean } = { clipToCoordinateSystem: true }
): GraphObjectNode => {
  const coordinateSystem = readOperationCoordinateSystemOptions(command);
  const transformed = coordinateSystem ? transformOperationCoordinateNode(node, coordinateSystem) : node;
  return withOperationCoordinateMeta(withRenderHints(transformed, command), command, options);
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
  options: PlaygroundSceneBuildContext
): { ok: true; nodes: GraphObjectNode[] } | { ok: false; message: string } => {
  if (node.type === 'variable') return { ok: true, nodes: [] };

  if (node.type === 'function' || node.type === 'derivative') {
    const descriptor = readFunctionDescriptor(node.payload);
    if (!descriptor) return { ok: false, message: `${backendLabel(options.backendId)} 无法读取函数描述符。` };
    return createSampledDescriptorNode(command, node.id, descriptor, scope, node.meta);
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
    return { ok: true, nodes: [prepareOperationCoordinateNode(normalized.node, command)] };
  }

  if (node.type === 'solid') {
    return { ok: true, nodes: [prepareOperationCoordinateNode(addSolidProjectionGeometry(node), command)] };
  }

  if (!CANVAS_RENDERABLE_TYPES.has(node.type)) {
    return { ok: false, message: `${backendLabel(options.backendId)} 暂不支持 ${node.type} 指令。` };
  }

  const normalizedMeasurement = node.type === 'measurement'
    ? addMeasurementAnchor(node, symbols)
    : node;
  return { ok: true, nodes: [prepareOperationCoordinateNode(normalizeSceneContractNode(normalizedMeasurement), command)] };
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
  options: PlaygroundSceneBuildContext
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
  scope: Record<string, unknown>,
  meta?: GraphObjectNode['meta']
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
    descriptor.domain,
    meta
  );
};

const createSampledFunctionNode = (
  command: PlaygroundCanvasCommand,
  id: string,
  expression: string,
  evaluate: (x: number) => unknown,
  domain?: [number, number],
  meta?: GraphObjectNode['meta']
): { ok: true; nodes: GraphObjectNode[] } | { ok: false; message: string } => {
  const coordinateSystem = readOperationCoordinateSystemOptions(command);
  const domainRange = coordinateSystem ? clampOperationCoordinateDomain(domain, coordinateSystem) : domain;
  if (coordinateSystem && !domainRange) {
    return { ok: false, message: '函数定义域不在当前坐标系范围内。' };
  }
  const { left, right, bottom, top } = coordinateSystem
    ? {
      left: coordinateSystem.xRange.min,
      right: coordinateSystem.xRange.max,
      bottom: coordinateSystem.yRange.min,
      top: coordinateSystem.yRange.max
    }
    : PLAYGROUND_CANVAS_WORLD_BOUNDS;
  const segments = sampleFunctionSegments(evaluate, {
    min: domainRange?.[0] ?? left,
    max: domainRange?.[1] ?? right,
    yMin: bottom,
    yMax: top,
    steps: SAMPLE_STEPS
  });
  const renderedSegments = coordinateSystem
    ? transformOperationCoordinateSegments(clipOperationCoordinateSegments(segments, coordinateSystem), coordinateSystem)
    : segments;

  if (renderedSegments.length === 0) {
    return { ok: false, message: '当前后端没有采样到可绘制的函数点。' };
  }

  return {
    ok: true,
    nodes: renderedSegments.map((points, index) => withOperationCoordinateMeta(withRenderHints({
      id: renderedSegments.length === 1 ? id : `${id}:segment-${index + 1}`,
      kind: 'shape',
      type: 'function',
      payload: {
        expression,
        geometry: { kind: 'polyline', points }
      },
      layerId: 'content',
      meta: meta ? { ...meta } : undefined
    }, command), command, { clipToCoordinateSystem: true }))
  };
};

const createEquationPolylineNode = (
  command: PlaygroundCanvasCommand,
  node: GraphObjectNode
): { ok: true; nodes: GraphObjectNode[] } | { ok: false; message: string } => {
  const payload = asRecord(node.payload);
  const expression = typeof payload?.expression === 'string' ? payload.expression : '';
  const coordinateSystem = readOperationCoordinateSystemOptions(command);
  const segments = sampleImplicitEquationSegments(expression, {
    bounds: coordinateSystem
      ? {
        left: coordinateSystem.xRange.min,
        right: coordinateSystem.xRange.max,
        top: coordinateSystem.yRange.max,
        bottom: coordinateSystem.yRange.min
      }
      : PLAYGROUND_CANVAS_WORLD_BOUNDS,
    grid: IMPLICIT_GRID_SIZE
  });
  const renderedSegments = coordinateSystem
    ? transformOperationCoordinateSegments(clipOperationCoordinateSegments(segments, coordinateSystem), coordinateSystem)
    : segments;
  if (renderedSegments.length === 0) return { ok: false, message: '当前后端没有采样到可绘制的方程等值线。' };

  return {
    ok: true,
    nodes: [withOperationCoordinateMeta(withRenderHints({
      ...node,
      payload: {
        ...payload,
        expression,
        geometry: createPolylineOrMultilineGeometry(renderedSegments)
      }
    }, command), command, { clipToCoordinateSystem: true })]
  };
};

const createExplicitSurfaceWireframeNode = (
  command: PlaygroundCanvasCommand,
  zExpression: string,
  scope: Record<string, unknown>,
  options: PlaygroundSceneBuildContext
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
  options: PlaygroundSceneBuildContext
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
const readSelectionStrokeScale = (value: unknown, fallback: unknown): number | false | undefined => (
  value === false || typeof value === 'number' && Number.isFinite(value) && value > 0
    ? value
    : fallback === false || typeof fallback === 'number' && Number.isFinite(fallback) && fallback > 0
      ? fallback
      : undefined
);
const readStringOrNumber = (value: unknown, fallback: string | number): string | number => (
  typeof value === 'string' || typeof value === 'number' && Number.isFinite(value) ? value : fallback
);
const readPositiveNumber = (value: unknown, fallback: number): number => typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback;
const formatError = (error: unknown): string => error instanceof Error ? error.message : String(error);

const copyExplicitRenderHintOptions = (
  target: Record<string, unknown>,
  options: Record<string, unknown>,
  keys: readonly string[]
): void => {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(options, key)) target[key] = options[key];
  }
};
