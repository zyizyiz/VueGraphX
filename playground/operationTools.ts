import {
  STANDARD_GEOMETRY_ANNOTATION_UI,
  STANDARD_GEOMETRY_MARKER_UI,
  STANDARD_COORDINATE_UI,
  snapPointToGraphGrid,
  type StandardCoordinateAxisTickStrategy
} from '@vuegraphx/core';
import {
  createCosineSubjectFunction,
  createFreeSubjectAuxiliaryLine,
  createHyperbolaEquationSubjectFunction,
  createParabolaEquationSubjectFunction,
  createQuadraticSubjectFunction,
  createSineSubjectFunction,
  createSubjectAuxiliaryLineConstructionModel,
  createSubjectGeometryTransformModel,
  createSubjectAuxiliaryLineIntersectionAnnotations,
  createSubjectOverlayModel,
  createSubjectShapeEditModel,
  createTangentSubjectFunction,
  point2D,
  SUBJECT_OVERLAY_DASH_PATTERN,
  SUBJECT_OVERLAY_DASH_STROKE_WIDTH,
  SUBJECT_OVERLAY_DEFAULT_DASH_STROKE_COLOR,
  type MathPoint2D,
  type SubjectAuxiliaryLineConstructionTarget,
  type SubjectGeometryGridSnapOptions,
  type SubjectAuxiliaryLineConstructionContact,
  type SubjectAuxiliaryLineDescriptor,
  type SubjectGeometryTransformPreviewArc,
  type SubjectGeometryTransformTarget,
  type SubjectOverlayAnnotation,
  type SubjectOverlayConfig,
  type SubjectOverlayModel,
  type SubjectOverlayStyle,
  type SubjectOverlayTarget,
  type SubjectShapeEditHandleDescriptor,
  type SubjectShapeEditTarget
} from '@vuegraphx/math';

export const OPERATION_COMMANDS_MIME = 'application/x-vuegraphx-operation-commands';
export const OPERATION_TOOL_MIME = 'application/x-vuegraphx-operation-tool';

export interface OperationCommandSpec {
  expr: string;
  options?: Record<string, unknown>;
}

export interface OperationCoordinateTickPolicy {
  x?: StandardCoordinateAxisTickStrategy;
  y?: StandardCoordinateAxisTickStrategy;
}

export interface OperationCoordinateSystemRuntimeConfig {
  tickPolicy?: OperationCoordinateTickPolicy;
}

export interface OperationViewportSize {
  width: number;
  height: number;
}

export interface OperationWorldBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface OperationCoordinateSystemRuntimeOptions {
  id: string;
  origin: { x: number; y: number };
  unitScale: number;
  xRange: { min: number; max: number };
  yRange: { min: number; max: number };
  snapToGrid?: unknown;
  tickPolicy?: OperationCoordinateTickPolicy;
}

export interface OperationCommandWithOptions {
  options?: unknown;
}

export type OperationInteractiveToolKind = 'geometry-shape-edit' | 'geometry-auxiliary-construction';
export type OperationToolPlacement = 'coordinate-system' | 'world';

export interface OperationToolCommandContext {
  origin: MathPoint2D;
}

export interface OperationGeometryShapeEditInteraction {
  kind: 'geometry-shape-edit';
  snapToGrid?: boolean | SubjectGeometryGridSnapOptions;
}

export interface OperationAuxiliaryConstructionInteraction {
  kind: 'geometry-auxiliary-construction';
}

export type OperationToolInteraction =
  | OperationGeometryShapeEditInteraction
  | OperationAuxiliaryConstructionInteraction;

export interface OperationTool {
  id: string;
  label: string;
  description: string;
  icon: string;
  iconClass: string;
  commands: readonly OperationCommandSpec[];
  placement?: OperationToolPlacement;
  createCommands?: (context: OperationToolCommandContext) => readonly OperationCommandSpec[];
  interaction?: OperationToolInteraction;
}

export interface OperationToolGroup {
  title: string;
  tools: readonly OperationTool[];
}

export type OperationShapeEditPolygonTarget = Extract<SubjectShapeEditTarget, { kind: 'polygon' }>;
export type OperationAuxiliaryConstructionTarget = Extract<SubjectAuxiliaryLineConstructionTarget, { kind: 'polygon' }>;
export interface OperationAuxiliaryConstructionDraft {
  start: MathPoint2D;
  end: MathPoint2D;
}

const OPERATION_COORDINATE_RANGE = { min: -6, max: 6 } as const;
const OPERATION_COORDINATE_SNAP = { enabled: true, phase: 'end' } as const;
export const OPERATION_SHAPE_EDIT_DEFAULT_SNAP = {
  enabled: true,
  step: 0.5,
  origin: { x: 0, y: 0 },
  phase: 'end',
  tolerancePx: 12
} satisfies SubjectGeometryGridSnapOptions;

export const resolveOperationCommandOrigin = (
  point: { x: number; y: number } | null,
  viewport: OperationViewportSize,
  bounds: OperationWorldBounds
): { x: number; y: number } => {
  const width = Math.max(1, viewport.width);
  const height = Math.max(1, viewport.height);
  const local = point ?? { x: width / 2, y: height / 2 };
  return {
    x: bounds.left + (local.x / width) * (bounds.right - bounds.left),
    y: bounds.top - (local.y / height) * (bounds.top - bounds.bottom)
  };
};

export const createOperationScopedCommands = (
  commands: readonly OperationCommandSpec[],
  origin: { x: number; y: number },
  coordinateSystemId: string,
  bounds?: OperationWorldBounds
): OperationCommandSpec[] => {
  const xRange = { ...OPERATION_COORDINATE_RANGE };
  const yRange = { ...OPERATION_COORDINATE_RANGE };
  const runtimeConfig = readOperationCoordinateSystemRuntimeConfig(commands);
  const coordinateSystem: OperationCoordinateSystemRuntimeOptions = {
    id: coordinateSystemId,
    origin: alignOperationCoordinateSystemOriginToGrid(origin, bounds, { unitScale: 1, xRange, yRange }),
    unitScale: 1,
    xRange,
    yRange,
    snapToGrid: OPERATION_COORDINATE_SNAP,
    ...(runtimeConfig.tickPolicy ? { tickPolicy: cloneOperationCoordinateTickPolicy(runtimeConfig.tickPolicy) } : {})
  };

  return [
    {
      expr: `${coordinateSystemId} = CoordinateSystem("plane")`,
      options: {
        coordinateSystem,
        strokeColor: STANDARD_COORDINATE_UI.axisStrokeColor,
        strokeWidth: STANDARD_COORDINATE_UI.axisStrokeWidthPx
      }
    },
    ...commands.map((command) => ({
      ...command,
      options: {
        ...omitOperationCoordinateSystemRuntimeConfig(command.options),
        coordinateSystem
      }
    }))
  ];
};

export const clampOperationCoordinateSystemOrigin = (
  origin: { x: number; y: number },
  bounds?: OperationWorldBounds,
  options: Pick<OperationCoordinateSystemRuntimeOptions, 'unitScale' | 'xRange' | 'yRange'> = {
    unitScale: 1,
    xRange: OPERATION_COORDINATE_RANGE,
    yRange: OPERATION_COORDINATE_RANGE
  }
): { x: number; y: number } => {
  if (!bounds) return { ...origin };
  const unitScale = Number.isFinite(options.unitScale) && options.unitScale > 0 ? options.unitScale : 1;
  const minOriginX = bounds.left - options.xRange.min * unitScale;
  const maxOriginX = bounds.right - options.xRange.max * unitScale;
  const minOriginY = bounds.bottom - options.yRange.min * unitScale;
  const maxOriginY = bounds.top - options.yRange.max * unitScale;
  return {
    x: clampToFitRange(origin.x, minOriginX, maxOriginX),
    y: clampToFitRange(origin.y, minOriginY, maxOriginY)
  };
};

export const isOperationPointInsideCoordinateSystem = (
  point: MathPoint2D,
  coordinateSystem: Pick<OperationCoordinateSystemRuntimeOptions, 'xRange' | 'yRange'>,
  tolerance = 1e-7
): boolean => (
  Number.isFinite(point.x)
  && Number.isFinite(point.y)
  && point.x >= coordinateSystem.xRange.min - tolerance
  && point.x <= coordinateSystem.xRange.max + tolerance
  && point.y >= coordinateSystem.yRange.min - tolerance
  && point.y <= coordinateSystem.yRange.max + tolerance
);

export const alignOperationCoordinateSystemOriginToGrid = (
  origin: { x: number; y: number },
  bounds?: OperationWorldBounds,
  options: Pick<OperationCoordinateSystemRuntimeOptions, 'unitScale' | 'xRange' | 'yRange'> = {
    unitScale: 1,
    xRange: OPERATION_COORDINATE_RANGE,
    yRange: OPERATION_COORDINATE_RANGE
  }
): { x: number; y: number } => {
  const unitScale = Number.isFinite(options.unitScale) && options.unitScale > 0 ? options.unitScale : 1;
  const snapped = snapPointToGraphGrid(origin, OPERATION_COORDINATE_SNAP, { enabled: true, step: unitScale });
  if (!bounds) return snapped;

  const minOriginX = bounds.left - options.xRange.min * unitScale;
  const maxOriginX = bounds.right - options.xRange.max * unitScale;
  const minOriginY = bounds.bottom - options.yRange.min * unitScale;
  const maxOriginY = bounds.top - options.yRange.max * unitScale;
  return {
    x: clampGridValueToFitRange(snapped.x, minOriginX, maxOriginX, unitScale),
    y: clampGridValueToFitRange(snapped.y, minOriginY, maxOriginY, unitScale)
  };
};

export const updateOperationCoordinateSystemOrigin = <T extends OperationCommandWithOptions>(
  commands: readonly T[],
  coordinateSystemId: string,
  origin: { x: number; y: number }
): number => {
  if (!coordinateSystemId || !Number.isFinite(origin.x) || !Number.isFinite(origin.y)) return 0;

  let updatedCount = 0;
  for (const command of commands) {
    const options = asMutableRecord(command.options);
    const coordinateSystem = asMutableRecord(options?.coordinateSystem);
    if (coordinateSystem?.id !== coordinateSystemId) continue;

    const currentOrigin = asMutableRecord(coordinateSystem.origin);
    command.options = {
      ...(options ?? {}),
      coordinateSystem: {
        ...coordinateSystem,
        origin: {
          ...(currentOrigin ?? {}),
          x: origin.x,
          y: origin.y
        }
      }
    };
    updatedCount += 1;
  }
  return updatedCount;
};

export const createOperationShapeEditTarget = (
  id = 'operation-shape-edit-triangle'
): OperationShapeEditPolygonTarget => ({
  id,
  kind: 'polygon',
  shapeKind: 'triangle',
  vertices: [point2D(-3.5, -2), point2D(2, -2), point2D(-1.5, 2.5)],
  strokeColor: '#0F766E'
});

export const createOperationShapeEditCommands = (
  prefix: string,
  target: OperationShapeEditPolygonTarget = createOperationShapeEditTarget(`${prefix}-target`)
): OperationCommandSpec[] => [
  ...operationPointDefinitionCommands(`${prefix}_S`, target.vertices),
  {
    expr: `${prefix}_before = Polygon(${target.vertices.map((_, index) => `${prefix}_S${index + 1}`).join(', ')})`,
    options: { strokeColor: '#94A3B8', fillColor: '#E2E8F0', fillOpacity: 0.18, lineDash: [4, 8] }
  },
  ...target.vertices.map((point, index) => ({
    expr: createOperationShapeEditVertexCommand(prefix, index, point),
    options: operationPointStyleOptions('#0F766E', { pointStrokeColor: '#0F766E' })
  })),
  {
    expr: `${prefix}_after = Polygon(${target.vertices.map((_, index) => `${prefix}_E${index + 1}`).join(', ')})`,
    options: { strokeColor: '#0F766E', fillColor: '#CCFBF1', fillOpacity: 0.2, strokeWidth: 2 }
  }
];

export const createOperationShapeEditVertexCommand = (
  prefix: string,
  index: number,
  point: MathPoint2D
): string => `${prefix}_E${index + 1} = ${formatOperationPointTuple(point)}`;

export const createOperationAuxiliaryConstructionTarget = (
  id = 'operation-auxiliary-construction-triangle'
): OperationAuxiliaryConstructionTarget => ({
  id,
  kind: 'polygon',
  shapeKind: 'triangle',
  vertices: [point2D(-3.5, -2), point2D(2.5, -2), point2D(-0.5, 3)],
  strokeColor: '#2563EB'
});

const OPERATION_AUXILIARY_CONSTRUCTION_DEFAULT_DRAFT: OperationAuxiliaryConstructionDraft = {
  start: point2D(-4.4, 0.75),
  end: point2D(3.2, 0.75)
};

export const createOperationAuxiliaryConstructionCommands = (
  prefix: string,
  target: OperationAuxiliaryConstructionTarget = createOperationAuxiliaryConstructionTarget(`${prefix}-target`),
  draft: OperationAuxiliaryConstructionDraft | null = OPERATION_AUXILIARY_CONSTRUCTION_DEFAULT_DRAFT,
  pendingStart: MathPoint2D | null = null
): OperationCommandSpec[] => {
  const commands: OperationCommandSpec[] = [
    ...operationPointDefinitionCommands(`${prefix}_P`, target.vertices),
    {
      expr: `${prefix}_triangle = Polygon(${target.vertices.map((_, index) => `${prefix}_P${index + 1}`).join(', ')})`,
      options: { strokeColor: '#2563EB', fillColor: '#DBEAFE', fillOpacity: 0.14, strokeWidth: 2 }
    }
  ];

  if (!draft) {
    if (pendingStart) {
      commands.push({
        expr: `${prefix}_pending_start = Point(${operationPointText(pendingStart)})`,
        options: operationPointStyleOptions('#B45309', { pointStrokeColor: '#B45309' })
      });
    }
    commands.push({
      expr: `Text(-4.8, 3.6, "自由辅助线构造: ${pendingStart ? '等待终点' : '拖动或两点点击'} / contacts=0 / applied=false")`,
      options: { strokeColor: '#475569' }
    });
    return commands;
  }

  const model = createSubjectAuxiliaryLineConstructionModel(target, draft, {
    id: `${prefix}_candidate`,
    label: '构造候选线',
    state: 'confirmed'
  });

  if (model.candidate) {
    commands.push(...operationOverlayLineCommands([model.candidate], { labels: false }));
  } else {
    commands.push({
      expr: `${prefix}_draft = Segment(${operationPointTuple(model.draft.start)}, ${operationPointTuple(model.draft.end)})`,
      options: {
        strokeColor: SUBJECT_OVERLAY_DEFAULT_DASH_STROKE_COLOR,
        lineDash: SUBJECT_OVERLAY_DASH_PATTERN,
        strokeWidth: SUBJECT_OVERLAY_DASH_STROKE_WIDTH,
        selectionStrokeScale: false
      }
    });
  }
  commands.push(...operationConstructionContactCommands(model.contacts, { prefix: `${prefix}_contact`, limit: 4 }));
  commands.push({
    expr: `Text(-4.8, 3.6, "自由辅助线构造: contacts=${model.contacts.length} / applied=${model.applied}")`,
    options: { strokeColor: '#475569' }
  });
  return commands;
};

export const formatOperationPointTuple = (point: MathPoint2D): string => operationPointTuple(point);

export const findOperationToolById = (toolId: string): OperationTool | null => (
  operationToolGroups.flatMap((group) => group.tools).find((tool) => tool.id === toolId) ?? null
);

export const shouldScopeOperationTool = (tool: OperationTool): boolean => (
  (tool.placement ?? 'coordinate-system') === 'coordinate-system'
);

export const createOperationToolCommands = (
  tool: OperationTool,
  context: OperationToolCommandContext
): readonly OperationCommandSpec[] => (
  tool.createCommands ? tool.createCommands(context) : tool.commands
);

const asMutableRecord = (value: unknown): Record<string, unknown> | null => (
  typeof value === 'object' && value !== null ? value as Record<string, unknown> : null
);

const readOperationCoordinateSystemRuntimeConfig = (
  commands: readonly OperationCommandSpec[]
): OperationCoordinateSystemRuntimeConfig => {
  for (const command of commands) {
    const config = asMutableRecord(command.options)?.operationCoordinateSystem;
    if (typeof config === 'object' && config !== null) return config as OperationCoordinateSystemRuntimeConfig;
  }
  return {};
};

const omitOperationCoordinateSystemRuntimeConfig = (
  options: Record<string, unknown> | undefined
): Record<string, unknown> => {
  if (!options) return {};
  const { operationCoordinateSystem: _operationCoordinateSystem, ...rest } = options;
  return rest;
};

const cloneOperationCoordinateTickPolicy = (
  policy: OperationCoordinateTickPolicy
): OperationCoordinateTickPolicy => ({
  ...(policy.x ? { x: { ...policy.x, ...(policy.x.labels ? { labels: policy.x.labels.map((tick) => ({ ...tick })) } : {}) } } : {}),
  ...(policy.y ? { y: { ...policy.y, ...(policy.y.labels ? { labels: policy.y.labels.map((tick) => ({ ...tick })) } : {}) } } : {})
});

const clampToFitRange = (value: number, min: number, max: number): number => {
  if (!Number.isFinite(value)) return Number.isFinite(min) ? min : 0;
  if (min <= max) return Math.max(min, Math.min(max, value));
  return (min + max) / 2;
};

const clampGridValueToFitRange = (value: number, min: number, max: number, step: number): number => {
  if (!Number.isFinite(value) || !Number.isFinite(min) || !Number.isFinite(max) || !Number.isFinite(step) || step <= 0) {
    return clampToFitRange(value, min, max);
  }
  if (min > max) return normalizeGridValue((min + max) / 2);

  const lowerIndex = Math.ceil(min / step - 1e-9);
  const upperIndex = Math.floor(max / step + 1e-9);
  if (lowerIndex > upperIndex) return clampToFitRange(value, min, max);

  const desiredIndex = Math.round(value / step);
  return normalizeGridValue(clampToFitRange(desiredIndex, lowerIndex, upperIndex) * step);
};

const normalizeGridValue = (value: number): number => (
  Math.abs(value) < 1e-9 ? 0 : Number(value.toFixed(10))
);

const operationGeometryTransformTarget: SubjectGeometryTransformTarget = {
  id: 'operation-geometry-transform-triangle',
  kind: 'polygon',
  shapeKind: 'triangle',
  vertices: [point2D(-3, -1.5), point2D(1, -1.5), point2D(-1.5, 1.5)],
  strokeColor: '#2563EB'
};

const operationGeometryTransform = createSubjectGeometryTransformModel(operationGeometryTransformTarget, {
  kind: 'rotate',
  center: point2D(-1, -0.25),
  angleRadians: Math.PI / 5,
  bounds: { minX: -5, minY: -4, maxX: 5, maxY: 4 },
  boundsMode: 'translate-inside',
  snapToGrid: { enabled: true, step: 0.5, tolerance: 0.12 },
  preview: {
    includeCenterLines: true,
    includeTrajectories: true
  }
});
const operationGeometryTransformVertices = operationGeometryTransform.after.kind === 'polygon'
  ? operationGeometryTransform.after.vertices
  : [];

const operationShapeEditTarget = createOperationShapeEditTarget();
const operationShapeEdit = createSubjectShapeEditModel(operationShapeEditTarget, {
  handleKind: 'vertex',
  index: 2,
  point: point2D(-0.46, 3.04)
}, {
  bounds: { minX: -5, minY: -4, maxX: 5, maxY: 4 },
  boundsMode: 'translate-inside',
  snapToGrid: { enabled: true, step: 0.5, tolerance: 0.12 }
});
const operationShapeEditVertices = operationShapeEdit.after.kind === 'polygon'
  ? operationShapeEdit.after.vertices
  : [];

const operationGeometryOverlayTarget: SubjectOverlayTarget = {
  id: 'operation-geometry-overlay-triangle',
  kind: 'polygon',
  shapeKind: 'triangle',
  vertices: [point2D(-3.5, -2), point2D(2.5, -2), point2D(-0.5, 3)],
  coordinateSystemId: 'operation-plane',
  strokeColor: '#2563EB'
};

const operationGeometryOverlayConfig: SubjectOverlayConfig = {
  annotations: {
    includeKinds: ['vertex', 'angle', 'side-ratio', 'helper-intersection'],
    labels: { 'side-ratio': '边长比' },
    styles: {
      vertex: { strokeColor: '#0F172A' },
      angle: { strokeColor: '#7C3AED' },
      'side-ratio': { strokeColor: '#0F766E' },
      'helper-intersection': { strokeColor: '#B45309' }
    }
  },
  auxiliaryLines: {
    includeKinds: ['altitude', 'median', 'free'],
    defaultVisibleKinds: ['altitude', 'median', 'free'],
    allowFreeDraw: true,
    maxCandidates: 6,
    labels: {
      altitude: '高',
      median: '中线'
    }
  },
  coordinates: {
    showForKinds: ['vertex', 'helper-intersection'],
    precision: 1
  }
};

const operationGeometryOverlay = createSubjectOverlayModel(operationGeometryOverlayTarget, operationGeometryOverlayConfig);
const operationFreeLine = createFreeSubjectAuxiliaryLine(
  operationGeometryOverlayTarget,
  point2D(-3.5, 0),
  point2D(2.5, 0),
  { config: operationGeometryOverlayConfig, label: '自定义辅助线' }
);
const operationFreeIntersections = createSubjectAuxiliaryLineIntersectionAnnotations(
  operationGeometryOverlayTarget,
  operationFreeLine ? [operationFreeLine] : [],
  operationGeometryOverlayConfig
);
const operationQuadraticOverlay = createSubjectOverlayModel({
  id: 'operation-function-overlay-quadratic',
  kind: 'function',
  descriptor: createQuadraticSubjectFunction({ id: 'operation-quadratic', a: 1, b: -2, c: -3, domain: [-4, 5] }),
  sampleWindow: { minX: -4, maxX: 5, minY: -5, maxY: 5 },
  strokeColor: '#2563EB'
}, {
  annotations: {
    includeKinds: ['vertex', 'intercept', 'axis']
  },
  auxiliaryLines: {
    includeKinds: ['symmetry-axis'],
    defaultVisibleKinds: ['symmetry-axis']
  }
});

const operationPiTickPolicy: OperationCoordinateTickPolicy = {
  x: { kind: 'pi', piMultiple: 0.5 },
  y: { kind: 'integer' }
};
const operationTrigonometryCoordinateSystem: OperationCoordinateSystemRuntimeConfig = {
  tickPolicy: operationPiTickPolicy
};
const operationSineFunction = createSineSubjectFunction({ id: 'operation-sine', domain: [-6, 6] });
const operationCosineFunction = createCosineSubjectFunction({ id: 'operation-cosine', domain: [-6, 6] });
const operationTangentFunction = createTangentSubjectFunction({ id: 'operation-tangent', domain: [-6, 6] });
const operationTangentOverlay = createSubjectOverlayModel({
  id: 'operation-function-overlay-tangent',
  kind: 'function',
  descriptor: operationTangentFunction,
  sampleWindow: { minX: -6, maxX: 6, minY: -5, maxY: 5 },
  strokeColor: '#EA580C'
}, {
  auxiliaryLines: {
    includeKinds: ['asymptote'],
    defaultVisibleKinds: ['asymptote'],
    maxCandidates: 6,
    labels: { asymptote: '渐近线' }
  },
  annotations: {
    includeKinds: ['asymptote']
  }
});

const operationHyperbolaEquation = createHyperbolaEquationSubjectFunction({
  id: 'operation-hyperbola',
  centerX: -1.2,
  centerY: 0,
  transverseSemiAxis: 2,
  conjugateSemiAxis: 1,
  axis: 'x'
});
const operationParabolaEquation = createParabolaEquationSubjectFunction({
  id: 'operation-parabola',
  vertexX: 1.2,
  vertexY: -1,
  focalParameter: 0.7,
  direction: 'right'
});
const operationHyperbolaOverlay = createSubjectOverlayModel({
  id: 'operation-equation-overlay-hyperbola',
  kind: 'equation',
  descriptor: operationHyperbolaEquation,
  sampleWindow: { minX: -6, maxX: 6, minY: -6, maxY: 6 },
  strokeColor: '#2563EB'
}, {
  auxiliaryLines: {
    includeKinds: ['asymptote'],
    defaultVisibleKinds: ['asymptote'],
    labels: { asymptote: '渐近线' }
  },
  annotations: {
    includeKinds: ['center', 'vertex', 'focus', 'asymptote']
  }
});
const operationParabolaOverlay = createSubjectOverlayModel({
  id: 'operation-equation-overlay-parabola',
  kind: 'equation',
  descriptor: operationParabolaEquation,
  sampleWindow: { minX: -6, maxX: 6, minY: -6, maxY: 6 },
  strokeColor: '#F97316'
}, {
  auxiliaryLines: {
    includeKinds: ['directrix'],
    defaultVisibleKinds: ['directrix'],
    labels: { directrix: '准线' }
  },
  annotations: {
    includeKinds: ['vertex', 'focus', 'directrix']
  }
});

const operationGeometryOverlayCommands: readonly OperationCommandSpec[] = [
  { expr: 'Point(-3.5, -2)', options: operationPointStyleOptions('#0F172A') },
  { expr: 'Point(2.5, -2)', options: operationPointStyleOptions('#0F172A') },
  { expr: 'Point(-0.5, 3)', options: operationPointStyleOptions('#0F172A') },
  { expr: 'Polygon((-3.5, -2), (2.5, -2), (-0.5, 3))', options: { strokeColor: '#2563EB', fillColor: '#DBEAFE', fillOpacity: 0.18, strokeWidth: 2 } },
  ...operationOverlayLineCommands(operationGeometryOverlay, { kinds: ['altitude', 'median'], limit: 6 }),
  ...(operationFreeLine ? operationOverlayLineCommands([operationFreeLine]) : []),
  ...operationOverlayAnnotationCommands([...operationGeometryOverlay.annotations, ...operationFreeIntersections], {
    kinds: ['vertex', 'angle', 'side-ratio', 'helper-intersection'],
    limit: 10
  })
];

export const createOperationIndependentTriangleCommands = (
  origin: MathPoint2D
): OperationCommandSpec[] => {
  const vertices = [
    point2D(origin.x - 2, origin.y - 1.3),
    point2D(origin.x + 2, origin.y - 1.3),
    point2D(origin.x, origin.y + 2)
  ];
  return [{
    expr: `Polygon(${vertices.map(operationPointTuple).join(', ')})`,
    options: {
      strokeColor: '#0F766E',
      fillColor: '#CCFBF1',
      fillOpacity: 0.24,
      strokeWidth: 2
    }
  }];
};

const operationFunctionOverlayCommands: readonly OperationCommandSpec[] = [
  { expr: 'Function("x^2 - 2*x - 3", -4, 5)', options: { strokeColor: '#2563EB' } },
  ...operationOverlayLineCommands(operationQuadraticOverlay),
  ...operationOverlayAnnotationCommands(operationQuadraticOverlay, { kinds: ['vertex', 'intercept'], limit: 4 })
];

const operationTrigonometryCommands: readonly OperationCommandSpec[] = [
  {
    expr: `Function("${escapeOperationText(operationSineFunction.expression)}", -6, 6)`,
    options: { strokeColor: '#2563EB', operationCoordinateSystem: operationTrigonometryCoordinateSystem }
  },
  { expr: `Function("${escapeOperationText(operationCosineFunction.expression)}", -6, 6)`, options: { strokeColor: '#16A34A' } },
  { expr: `Function("${escapeOperationText(operationTangentFunction.expression)}", -6, 6)`, options: { strokeColor: '#EA580C' } },
  ...operationOverlayLineCommands(operationTangentOverlay, { kinds: ['asymptote'], limit: 4 })
];

const operationConicOverlayCommands: readonly OperationCommandSpec[] = [
  { expr: `Equation("${escapeOperationText(operationHyperbolaEquation.expression)}")`, options: { strokeColor: '#2563EB' } },
  ...operationOverlayLineCommands(operationHyperbolaOverlay, { kinds: ['asymptote'], limit: 2 }),
  ...operationOverlayAnnotationCommands(operationHyperbolaOverlay, { kinds: ['center', 'vertex', 'focus'], limit: 5 }),
  { expr: `Equation("${escapeOperationText(operationParabolaEquation.expression)}")`, options: { strokeColor: '#F97316' } },
  ...operationOverlayLineCommands(operationParabolaOverlay, { kinds: ['directrix'], limit: 1 }),
  ...operationOverlayAnnotationCommands(operationParabolaOverlay, { kinds: ['vertex', 'focus', 'directrix'], limit: 3 })
];

const operationGeometryTransformCommands: readonly OperationCommandSpec[] = [
  ...operationPointDefinitionCommands('G', operationGeometryTransformTarget.vertices),
  { expr: 'baseTransform = Polygon(G1, G2, G3)', options: { strokeColor: '#94A3B8', fillColor: '#E2E8F0', fillOpacity: 0.2, lineDash: [4, 8] } },
  ...operationPointDefinitionCommands('R', operationGeometryTransformVertices),
  { expr: 'rotatedTransform = Polygon(R1, R2, R3)', options: { strokeColor: '#2563EB', fillColor: '#DBEAFE', fillOpacity: 0.22, strokeWidth: 2 } },
  ...(operationGeometryTransform.center ? [{
    expr: `P = ${operationPointTuple(operationGeometryTransform.center)}`,
    options: operationPointStyleOptions('#7C3AED', { pointStrokeColor: '#7C3AED' })
  }] : []),
  ...operationOverlayLineCommands(operationGeometryTransform.previewLines, { visibleOnly: false, labels: false, limit: 6 }),
  ...operationTransformArcCommands(operationGeometryTransform.previewArcs, { limit: 4 }),
  { expr: 'Text(-4.8, 3.6, "几何变换预览: 旋转中心 / 吸附 / 边界")', options: { strokeColor: '#475569' } }
];

const operationShapeEditCommands: readonly OperationCommandSpec[] = [
  ...operationPointDefinitionCommands('S', operationShapeEditTarget.vertices),
  { expr: 'editBefore = Polygon(S1, S2, S3)', options: { strokeColor: '#94A3B8', fillColor: '#E2E8F0', fillOpacity: 0.18, lineDash: [4, 8] } },
  ...operationPointDefinitionCommands('E', operationShapeEditVertices),
  { expr: 'editAfter = Polygon(E1, E2, E3)', options: { strokeColor: '#0F766E', fillColor: '#CCFBF1', fillOpacity: 0.2, strokeWidth: 2 } },
  ...operationShapeEditHandleCommands(operationShapeEdit.beforeHandles, { prefix: 'beforeHandle', color: '#64748B', limit: 3 }),
  ...operationShapeEditHandleCommands(operationShapeEdit.afterHandles, { prefix: 'afterHandle', color: '#0F766E', limit: 3 }),
  ...operationOverlayLineCommands(operationShapeEdit.previewLines, { visibleOnly: false, labels: false, limit: 2 }),
  {
    expr: `Text(-4.8, 3.6, "几何编辑内核: handle=${operationShapeEdit.activeHandle?.label ?? '-'} / diagnostics=${operationShapeEdit.diagnostics.length}")`,
    options: { strokeColor: '#475569' }
  }
];

const operationAuxiliaryConstructionCommands: readonly OperationCommandSpec[] = createOperationAuxiliaryConstructionCommands('construct');

export const operationToolGroups: readonly OperationToolGroup[] = [
  {
    title: '函数',
    tools: [
      {
        id: 'quadratic-function',
        label: '二次函数',
        description: '拖入后自动带出坐标轴，再在同一网格里画二次函数',
        icon: 'ƒ',
        iconClass: 'bg-violet-50 text-violet-600 ring-1 ring-violet-200',
        commands: [
          { expr: 'Function("0.5*x^2 - 2", -5, 5)', options: { strokeColor: '#4DA6FF' } }
        ]
      },
      {
        id: 'trigonometry-pi-ticks',
        label: '三角函数 π 刻度',
        description: '拖入后用 π/2 刻度展示 sin、cos、tan 和切线渐近线',
        icon: 'π',
        iconClass: 'bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200',
        commands: operationTrigonometryCommands
      }
    ]
  },
  {
    title: '方程与组合',
    tools: [
      {
        id: 'linear-function',
        label: '一次函数',
        description: '拖入后自动带出坐标轴，再在同一网格里画一次函数',
        icon: '↗',
        iconClass: 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200',
        commands: [
          { expr: 'Function("2*x - 1", -5, 5)', options: { strokeColor: '#16D957' } }
        ]
      },
      {
        id: 'circle-equation',
        label: '圆的方程',
        description: '拖入后自动带出坐标轴，再在同一网格里画方程',
        icon: '=',
        iconClass: 'bg-orange-50 text-orange-600 ring-1 ring-orange-200',
        commands: [
          { expr: 'Equation("(x - 1)^2 + (y + 1)^2 = 9")', options: { strokeColor: '#FF8D1A' } }
        ]
      },
      {
        id: 'piecewise-function',
        label: '分段函数',
        description: '拖入后自动带出坐标轴，再在同一网格里拼接分段函数',
        icon: '∪',
        iconClass: 'bg-rose-50 text-rose-600 ring-1 ring-rose-200',
        commands: [
          { expr: 'Function("-x - 1", -5, 0)', options: { strokeColor: '#4DA6FF' } },
          { expr: 'Function("0.5*x^2 - 1", 0, 5)', options: { strokeColor: '#FF8D1A' } }
        ]
      },
      {
        id: 'conic-overlay-tools',
        label: '圆锥曲线辅助线',
        description: '拖入后生成双曲线渐近线、抛物线准线和关键点标注',
        icon: '⌒',
        iconClass: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
        commands: operationConicOverlayCommands
      }
    ]
  },
  {
    title: '标注与辅助线',
    tools: [
      {
        id: 'independent-triangle',
        label: '独立三角形',
        description: '生成不带坐标系的几何三角形，可直接拖拽移动',
        icon: '△',
        iconClass: 'bg-teal-50 text-teal-700 ring-1 ring-teal-200',
        commands: createOperationIndependentTriangleCommands(point2D(0, 0)),
        placement: 'world',
        createCommands: ({ origin }) => createOperationIndependentTriangleCommands(origin)
      },
      {
        id: 'triangle-overlay-tools',
        label: '三角形标注',
        description: '拖入后生成顶点、角度、边长比、高、中线和自定义辅助线',
        icon: '△',
        iconClass: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200',
        commands: operationGeometryOverlayCommands
      },
      {
        id: 'quadratic-overlay-tools',
        label: '函数标注',
        description: '拖入后生成二次函数、顶点/截距标注和对称轴辅助线',
        icon: '⊥',
        iconClass: 'bg-purple-50 text-purple-700 ring-1 ring-purple-200',
        commands: operationFunctionOverlayCommands
      },
      {
        id: 'geometry-transform-preview',
        label: '几何变换预览',
        description: '拖入后展示变换前后图形、旋转中心、吸附/边界后的结果和轨迹弧',
        icon: '↻',
        iconClass: 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200',
        commands: operationGeometryTransformCommands
      },
      {
        id: 'geometry-shape-edit-preview',
        label: '几何拖拽编辑',
        description: '点击或拖入后生成可拖拽顶点，并实时写回编辑结果',
        icon: '▱',
        iconClass: 'bg-teal-50 text-teal-700 ring-1 ring-teal-200',
        commands: operationShapeEditCommands,
        interaction: { kind: 'geometry-shape-edit' }
      },
      {
        id: 'auxiliary-construction-preview',
        label: '自由辅助线构造',
        description: '点击或拖入后在画布中拖动绘制辅助线候选，并标出接触点',
        icon: '⌁',
        iconClass: 'bg-fuchsia-50 text-fuchsia-700 ring-1 ring-fuchsia-200',
        commands: operationAuxiliaryConstructionCommands,
        interaction: { kind: 'geometry-auxiliary-construction' }
      }
    ]
  }
];

function operationShapeEditHandleCommands(
  handles: readonly SubjectShapeEditHandleDescriptor[],
  options: { prefix: string; color: string; limit?: number }
): OperationCommandSpec[] {
  return handles.slice(0, options.limit ?? Infinity).flatMap((handle, index) => [
    {
      expr: `${options.prefix}_${index + 1} = Point(${operationPointText(handle.point)})`,
      options: operationPointStyleOptions(options.color, { pointStrokeColor: options.color })
    },
    {
      expr: `Text(${operationPointText({ x: handle.point.x + 0.12, y: handle.point.y + 0.12 })}, "${escapeOperationText(handle.label)}")`,
      options: { strokeColor: options.color, ...operationTextStyleOptions() }
    }
  ]);
}

function operationConstructionContactCommands(
  contacts: readonly SubjectAuxiliaryLineConstructionContact[],
  options: { prefix: string; limit?: number }
): OperationCommandSpec[] {
  return contacts
    .filter((contact) => !!contact.point)
    .slice(0, options.limit ?? Infinity)
    .flatMap((contact, index) => {
      const point = contact.point!;
      return [
        {
          expr: `${options.prefix}_${index + 1} = Point(${operationPointText(point)})`,
          options: operationPointStyleOptions('#B45309', { pointStrokeColor: '#B45309' })
        },
        {
          expr: `Text(${operationPointText({ x: point.x + 0.12, y: point.y + 0.12 })}, "${escapeOperationText(contact.kind)}")`,
          options: { strokeColor: '#B45309', ...operationTextStyleOptions() }
        }
      ];
    });
}

function operationOverlayLineCommands(
  input: SubjectOverlayModel | readonly SubjectAuxiliaryLineDescriptor[],
  options: {
    kinds?: readonly string[];
    limit?: number;
    visibleOnly?: boolean;
    labels?: boolean;
  } = {}
): OperationCommandSpec[] {
  const visibleOnly = options.visibleOnly ?? true;
  const sourceLines: readonly SubjectAuxiliaryLineDescriptor[] = isOperationOverlayModel(input) ? input.auxiliaryLines : input;
  return sourceLines
    .filter((line) => (!visibleOnly || line.visible !== false) && (!options.kinds || options.kinds.includes(line.kind)))
    .slice(0, options.limit ?? Infinity)
    .flatMap((line) => {
      const commands: OperationCommandSpec[] = [{
        expr: `Segment(${operationPointTuple(line.start)}, ${operationPointTuple(line.end)})`,
        options: operationOverlayStyleOptions(line.style, '#64748B')
      }];
      if (options.labels !== false) {
        commands.push({
          expr: `Text(${operationPointText(operationLineMidpoint(line))}, "${escapeOperationText(line.label)}")`,
          options: operationOverlayTextStyleOptions(line.style, '#64748B')
        });
      }
      return commands;
    });
}

function operationOverlayAnnotationCommands(
  input: SubjectOverlayModel | readonly SubjectOverlayAnnotation[],
  options: {
    kinds?: readonly string[];
    limit?: number;
    visibleOnly?: boolean;
  } = {}
): OperationCommandSpec[] {
  const visibleOnly = options.visibleOnly ?? true;
  const annotations: readonly SubjectOverlayAnnotation[] = isOperationOverlayModel(input) ? input.annotations : input;
  return annotations
    .filter((annotation) => !!annotation.anchor && (!visibleOnly || annotation.visible !== false) && (!options.kinds || options.kinds.includes(annotation.kind)))
    .slice(0, options.limit ?? Infinity)
    .map((annotation) => ({
      expr: `Text(${operationPointText(annotation.anchor!)}, "${escapeOperationText(annotation.text)}")`,
      options: operationOverlayTextStyleOptions(annotation.style, '#0F172A')
    }));
}

function operationPointDefinitionCommands(prefix: string, points: readonly MathPoint2D[]): OperationCommandSpec[] {
  return points.map((point, index) => ({
    expr: `${prefix}${index + 1} = ${operationPointTuple(point)}`,
    options: operationPointStyleOptions()
  }));
}

function operationTransformArcCommands(
  arcs: readonly SubjectGeometryTransformPreviewArc[],
  options: { limit?: number } = {}
): OperationCommandSpec[] {
  return arcs.slice(0, options.limit ?? Infinity).map((arc) => ({
    expr: `Arc(${operationPointTuple(arc.center)}, ${operationPointTuple(arc.start)}, ${operationPointTuple(arc.end)})`,
    options: operationOverlayStyleOptions(arc.style, '#7C3AED')
  }));
}

function isOperationOverlayModel(
  value: SubjectOverlayModel | readonly SubjectAuxiliaryLineDescriptor[] | readonly SubjectOverlayAnnotation[]
): value is SubjectOverlayModel {
  return !Array.isArray(value);
}

function operationLineMidpoint(line: SubjectAuxiliaryLineDescriptor): MathPoint2D {
  return {
    x: (line.start.x + line.end.x) / 2,
    y: (line.start.y + line.end.y) / 2
  };
}

function operationOverlayStyleOptions(style: SubjectOverlayStyle | undefined, fallbackColor: string): Record<string, unknown> {
  const options: Record<string, unknown> = {
    strokeColor: style?.strokeColor ?? style?.textColor ?? fallbackColor
  };
  if (typeof style?.strokeWidth === 'number') options.strokeWidth = style.strokeWidth;
  if (style?.selectionStrokeScale !== undefined) options.selectionStrokeScale = style.selectionStrokeScale;
  if (style?.fillColor) options.fillColor = style.fillColor;
  if (style?.lineDash?.length) options.lineDash = [...style.lineDash];
  return options;
}

function operationOverlayTextStyleOptions(style: SubjectOverlayStyle | undefined, fallbackColor: string): Record<string, unknown> {
  const options = operationOverlayStyleOptions(style, fallbackColor);
  const textColor = style?.textColor ?? STANDARD_GEOMETRY_ANNOTATION_UI.textColor;
  Object.assign(options, operationTextStyleOptions(textColor));
  return options;
}

function operationPointStyleOptions(
  strokeColor: string = STANDARD_GEOMETRY_MARKER_UI.pointStrokeColor,
  overrides: { pointFillColor?: string; pointStrokeColor?: string } = {}
): Record<string, unknown> {
  return {
    strokeColor,
    pointFillColor: overrides.pointFillColor ?? STANDARD_GEOMETRY_MARKER_UI.pointFillColor,
    pointStrokeColor: overrides.pointStrokeColor ?? STANDARD_GEOMETRY_MARKER_UI.pointStrokeColor,
    pointStrokeWidth: STANDARD_GEOMETRY_MARKER_UI.pointStrokeWidthPx,
    size: STANDARD_GEOMETRY_MARKER_UI.pointRadiusPx
  };
}

function operationTextStyleOptions(color: string = STANDARD_GEOMETRY_ANNOTATION_UI.textColor): Record<string, unknown> {
  return {
    textColor: color,
    fontSize: STANDARD_GEOMETRY_ANNOTATION_UI.textFontSizePx,
    fontFamily: STANDARD_GEOMETRY_ANNOTATION_UI.textFontFamily,
    fontWeight: STANDARD_GEOMETRY_ANNOTATION_UI.textFontWeight,
    lineHeight: STANDARD_GEOMETRY_ANNOTATION_UI.textLineHeightPx,
    textOffsetX: STANDARD_GEOMETRY_ANNOTATION_UI.textOffsetXPx,
    textOffsetY: STANDARD_GEOMETRY_ANNOTATION_UI.textOffsetYPx
  };
}

function operationPointTuple(point: MathPoint2D): string {
  return `(${operationNumber(point.x)}, ${operationNumber(point.y)})`;
}

function operationPointText(point: MathPoint2D): string {
  return `${operationNumber(point.x)}, ${operationNumber(point.y)}`;
}

function operationNumber(value: number): string {
  if (!Number.isFinite(value)) return '0';
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
}

function escapeOperationText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}
