import { STANDARD_COORDINATE_UI } from '@vuegraphx/core';

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
  coordinateSystemId: string
): OperationCommandSpec[] => {
  const coordinateSystem: OperationCoordinateSystemRuntimeOptions = {
    id: coordinateSystemId,
    origin: { ...origin },
    unitScale: 1,
    xRange: { ...OPERATION_COORDINATE_RANGE },
    yRange: { ...OPERATION_COORDINATE_RANGE },
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
  }
];
