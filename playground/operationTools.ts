import { STANDARD_COORDINATE_UI } from '@vuegraphx/core';
import {
  createFreeSubjectAuxiliaryLine,
  createQuadraticSubjectFunction,
  createSubjectAuxiliaryLineIntersectionAnnotations,
  createSubjectOverlayModel,
  point2D,
  type MathPoint2D,
  type SubjectAuxiliaryLineDescriptor,
  type SubjectOverlayAnnotation,
  type SubjectOverlayConfig,
  type SubjectOverlayModel,
  type SubjectOverlayStyle,
  type SubjectOverlayTarget
} from '@vuegraphx/math';

export const OPERATION_COMMANDS_MIME = 'application/x-vuegraphx-operation-commands';

export interface OperationCommandSpec {
  expr: string;
  options?: Record<string, unknown>;
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
}

export interface OperationCommandWithOptions {
  options?: unknown;
}

export interface OperationTool {
  id: string;
  label: string;
  description: string;
  icon: string;
  iconClass: string;
  commands: readonly OperationCommandSpec[];
}

export interface OperationToolGroup {
  title: string;
  tools: readonly OperationTool[];
}

const OPERATION_COORDINATE_RANGE = { min: -6, max: 6 } as const;

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
  const coordinateSystem: OperationCoordinateSystemRuntimeOptions = {
    id: coordinateSystemId,
    origin: clampOperationCoordinateSystemOrigin(origin, bounds, { unitScale: 1, xRange, yRange }),
    unitScale: 1,
    xRange,
    yRange,
    snapToGrid: { enabled: true, phase: 'end' }
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
        ...(command.options ?? {}),
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

const asMutableRecord = (value: unknown): Record<string, unknown> | null => (
  typeof value === 'object' && value !== null ? value as Record<string, unknown> : null
);

const clampToFitRange = (value: number, min: number, max: number): number => {
  if (!Number.isFinite(value)) return Number.isFinite(min) ? min : 0;
  if (min <= max) return Math.max(min, Math.min(max, value));
  return (min + max) / 2;
};

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
    },
    styles: {
      altitude: { strokeColor: '#EF4444', strokeWidth: 2, lineDash: [4, 3] },
      median: { strokeColor: '#16A34A', strokeWidth: 2, lineDash: [6, 3] },
      free: { strokeColor: '#7C3AED', strokeWidth: 2, lineDash: [5, 4] }
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
    includeKinds: ['vertex', 'intercept', 'axis'],
    styles: {
      vertex: { strokeColor: '#EF4444' },
      intercept: { strokeColor: '#16A34A' }
    }
  },
  auxiliaryLines: {
    includeKinds: ['symmetry-axis'],
    defaultVisibleKinds: ['symmetry-axis'],
    styles: {
      'symmetry-axis': { strokeColor: '#EF4444', strokeWidth: 2, lineDash: [5, 4] }
    }
  }
});

const operationGeometryOverlayCommands: readonly OperationCommandSpec[] = [
  { expr: 'Point(-3.5, -2)', options: { strokeColor: '#0F172A' } },
  { expr: 'Point(2.5, -2)', options: { strokeColor: '#0F172A' } },
  { expr: 'Point(-0.5, 3)', options: { strokeColor: '#0F172A' } },
  { expr: 'Polygon((-3.5, -2), (2.5, -2), (-0.5, 3))', options: { strokeColor: '#2563EB', fillColor: '#DBEAFE', fillOpacity: 0.18, strokeWidth: 2 } },
  ...operationOverlayLineCommands(operationGeometryOverlay, { kinds: ['altitude', 'median'], limit: 6 }),
  ...(operationFreeLine ? operationOverlayLineCommands([operationFreeLine]) : []),
  ...operationOverlayAnnotationCommands([...operationGeometryOverlay.annotations, ...operationFreeIntersections], {
    kinds: ['vertex', 'angle', 'side-ratio', 'helper-intersection'],
    limit: 10
  })
];

const operationFunctionOverlayCommands: readonly OperationCommandSpec[] = [
  { expr: 'Function("x^2 - 2*x - 3", -4, 5)', options: { strokeColor: '#2563EB' } },
  ...operationOverlayLineCommands(operationQuadraticOverlay),
  ...operationOverlayAnnotationCommands(operationQuadraticOverlay, { kinds: ['vertex', 'intercept'], limit: 4 })
];

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
      }
    ]
  },
  {
    title: '标注与辅助线',
    tools: [
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
      }
    ]
  }
];

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
          options: operationOverlayStyleOptions(line.style, '#64748B')
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
      options: operationOverlayStyleOptions(annotation.style, '#0F172A')
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
  if (style?.fillColor) options.fillColor = style.fillColor;
  if (style?.lineDash?.[0]) options.dash = style.lineDash[0];
  return options;
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
