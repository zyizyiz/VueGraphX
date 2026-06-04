export interface StandardCoordinateTickModel {
  unitDistance: number;
  positions: number[];
}

export type StandardCoordinateAxisTickStrategyKind = 'integer' | 'step' | 'pi' | 'custom';

export interface StandardCoordinateCustomTick {
  value: number;
  label?: string;
}

export interface StandardCoordinateAxisTickStrategy {
  kind: StandardCoordinateAxisTickStrategyKind;
  step?: number;
  origin?: number;
  /**
   * Multiplier used by the `pi` strategy. The default is `0.5`, producing
   * pi/2 tick spacing. Values are stored in world units.
   */
  piMultiple?: number;
  labels?: readonly StandardCoordinateCustomTick[];
}

export interface StandardCoordinatePoint {
  x: number;
  y: number;
}

export type StandardCoordinateLabelAxis = 'x' | 'y' | 'plain';

export type StandardCoordinateLabelRole = 'x-tick' | 'y-tick' | 'x-axis' | 'y-axis' | 'origin';

export interface StandardCoordinateLabelModel {
  text: string;
  axis: StandardCoordinateLabelAxis;
  role: StandardCoordinateLabelRole;
  point: StandardCoordinatePoint;
  value?: number;
}

export interface StandardCoordinateGeometryInput {
  origin: StandardCoordinatePoint;
  unitPx: number;
  xRange: { min: number; max: number };
  yRange: { min: number; max: number };
  showTicks?: boolean;
  showLabels?: boolean;
  includeGrid?: boolean;
  includeBorder?: boolean;
  xTickStrategy?: StandardCoordinateAxisTickStrategy;
  yTickStrategy?: StandardCoordinateAxisTickStrategy;
}

export interface StandardCoordinateSystemGeometry extends Record<string, unknown> {
  kind: 'coordinate-system';
  border: readonly StandardCoordinatePoint[];
  xAxis: readonly [StandardCoordinatePoint, StandardCoordinatePoint];
  yAxis: readonly [StandardCoordinatePoint, StandardCoordinatePoint];
  axisArrowSegments: readonly (readonly [StandardCoordinatePoint, StandardCoordinatePoint])[];
  gridSegments: readonly (readonly [StandardCoordinatePoint, StandardCoordinatePoint])[];
  segments: readonly (readonly StandardCoordinatePoint[])[];
  tickPoints: readonly StandardCoordinatePoint[];
  labels: readonly StandardCoordinateLabelModel[];
}

export interface StandardCoordinateLabelPixelOffset {
  x: number;
  y: number;
}

// Shared coordinate-system visual constants used by active math backends.
export const STANDARD_COORDINATE_UI = {
  axisStrokeColor: '#666666',
  axisStrokeWidthPx: 1.2,
  axisArrowLengthPx: 6,
  axisArrowHalfHeightPx: 3.4641,
  tickLabelColor: 'rgba(0, 0, 0, 0.85)',
  tickLabelFont: 'bold 12px "Songti SC", "STSong", "SimSun", serif',
  tickLabelLineHeightPx: 14,
  tickTargetDistancePx: 30,
  minTickLabelDistancePx: 22,
  xTickLabelTopOffsetPx: 0,
  yTickLabelLeftOffsetPx: -10,
  yTickLabelTopOffsetPx: -9,
  originLabelLeftOffsetPx: -12,
  originLabelTopOffsetPx: 0,
  xAxisLabelRightInsetPx: 6,
  xAxisLabelTopOffsetPx: 0,
  yAxisLabelLeftOffsetPx: -10,
  yAxisLabelTopPx: -7
} as const;

// Shared geometry marker and annotation visual constants used by demos and render adapters.
export const STANDARD_GEOMETRY_MARKER_UI = {
  pointRadiusPx: 4,
  pointFillColor: '#FFFFFF',
  pointStrokeColor: '#333333',
  pointStrokeWidthPx: 1.5,
  emphasisPointFillColor: '#FF3333',
  emphasisPointStrokeColor: '#FF3333'
} as const;

export const STANDARD_GEOMETRY_ANNOTATION_UI = {
  textColor: 'rgba(0, 0, 0, 0.85)',
  textFontSizePx: 14,
  textFontFamily: 'PingFang SC, Microsoft YaHei, Arial, sans-serif',
  textFontWeight: 500,
  textLineHeightPx: 14,
  textOffsetXPx: 5,
  textOffsetYPx: -10
} as const;

export const createStandardCoordinateTickModel = (
  lower: number,
  upper: number,
  pixelSpan: number
): StandardCoordinateTickModel => {
  const span = Math.max(1e-9, upper - lower);
  const pixelsPerUnit = Math.max(1e-9, pixelSpan / span);
  const unitDistance = chooseStandardCoordinateUnitDistance(STANDARD_COORDINATE_UI.minTickLabelDistancePx / pixelsPerUnit);
  return {
    unitDistance,
    positions: createStandardCoordinateTickPositions(lower, upper, unitDistance)
  };
};

export const formatStandardCoordinateLabel = (value: number): string => {
  const normalized = isStandardZeroCoordinate(value) ? 0 : Number(value.toFixed(6));
  return Number.isInteger(normalized) ? String(normalized) : normalized.toString();
};

export const isStandardZeroCoordinate = (value: number): boolean => Math.abs(value) < 1e-9;

export const resolveStandardCoordinateLabelPixelOffset = (
  labelOrRole: StandardCoordinateLabelModel | StandardCoordinateLabelRole
): StandardCoordinateLabelPixelOffset => {
  const role = typeof labelOrRole === 'string' ? labelOrRole : labelOrRole.role;
  if (role === 'x-tick') return { x: 0, y: STANDARD_COORDINATE_UI.xTickLabelTopOffsetPx };
  if (role === 'y-tick') return { x: STANDARD_COORDINATE_UI.yTickLabelLeftOffsetPx, y: STANDARD_COORDINATE_UI.yTickLabelTopOffsetPx };
  if (role === 'x-axis') return { x: -STANDARD_COORDINATE_UI.xAxisLabelRightInsetPx, y: STANDARD_COORDINATE_UI.xAxisLabelTopOffsetPx };
  if (role === 'y-axis') return { x: STANDARD_COORDINATE_UI.yAxisLabelLeftOffsetPx, y: STANDARD_COORDINATE_UI.yAxisLabelTopPx };
  return { x: STANDARD_COORDINATE_UI.originLabelLeftOffsetPx, y: STANDARD_COORDINATE_UI.originLabelTopOffsetPx };
};

export const resolveStandardCoordinateLabelScreenPosition = (
  label: StandardCoordinateLabelModel,
  point: StandardCoordinatePoint,
  visualScale = 1
): StandardCoordinatePoint => {
  const offset = resolveStandardCoordinateLabelPixelOffset(label);
  return {
    x: point.x + offset.x * visualScale,
    y: point.y + offset.y * visualScale
  };
};

export const createStandardCoordinateSystemGeometry = (
  input: StandardCoordinateGeometryInput
): StandardCoordinateSystemGeometry => {
  const unitPx = Number.isFinite(input.unitPx) && input.unitPx > 0 ? input.unitPx : 30;
  const xRange = normalizeStandardCoordinateRange(input.xRange, -6, 6);
  const yRange = normalizeStandardCoordinateRange(input.yRange, -6, 6);
  const showTicks = input.showTicks ?? true;
  const showLabels = input.showLabels ?? true;
  const includeGrid = input.includeGrid ?? true;
  const includeBorder = input.includeBorder ?? true;
  const world = (x: number, y: number): StandardCoordinatePoint => ({
    x: input.origin.x + x * unitPx,
    y: input.origin.y + y * unitPx
  });
  const xTickValues = createInteriorTicksFromStrategy(xRange.min, xRange.max, input.xTickStrategy);
  const yTickValues = createInteriorTicksFromStrategy(yRange.min, yRange.max, input.yTickStrategy);
  const xGridValues = createGridTicksFromStrategy(xRange.min, xRange.max, input.xTickStrategy);
  const yGridValues = createGridTicksFromStrategy(yRange.min, yRange.max, input.yTickStrategy);
  const gridSegments: Array<readonly [StandardCoordinatePoint, StandardCoordinatePoint]> = [];
  if (includeGrid) {
    for (const x of xGridValues) {
      gridSegments.push([world(x, yRange.min), world(x, yRange.max)]);
    }
    for (const y of yGridValues) {
      gridSegments.push([world(xRange.min, y), world(xRange.max, y)]);
    }
  }
  const border = [
    world(xRange.min, yRange.min),
    world(xRange.max, yRange.min),
    world(xRange.max, yRange.max),
    world(xRange.min, yRange.max),
    world(xRange.min, yRange.min)
  ] as const;
  const xAxis = [world(xRange.min, 0), world(xRange.max, 0)] as const;
  const yAxis = [world(0, yRange.min), world(0, yRange.max)] as const;
  const arrowSegments = [
    ...createStandardAxisArrowSegments(xAxis, unitPx),
    ...createStandardAxisArrowSegments(yAxis, unitPx)
  ];
  const xTickPoints = xTickValues.map((x) => world(x, 0));
  const yTickPoints = yTickValues.map((y) => world(0, y));
  const labels: StandardCoordinateLabelModel[] = [];

  if (showLabels) {
    for (const x of xTickValues) {
      if (isStandardZeroCoordinate(x)) continue;
      labels.push({ text: formatStandardCoordinateTickLabel(x, input.xTickStrategy), axis: 'x', role: 'x-tick', point: world(x, 0), value: x });
    }
    for (const y of yTickValues) {
      if (isStandardZeroCoordinate(y)) continue;
      labels.push({ text: formatStandardCoordinateTickLabel(y, input.yTickStrategy), axis: 'y', role: 'y-tick', point: world(0, y), value: y });
    }
    labels.push(
      { text: 'O', axis: 'plain', role: 'origin', point: world(0, 0), value: 0 },
      { text: 'x', axis: 'plain', role: 'x-axis', point: xAxis[1] },
      { text: 'y', axis: 'plain', role: 'y-axis', point: yAxis[1] }
    );
  }

  return {
    kind: 'coordinate-system',
    border,
    xAxis,
    yAxis,
    gridSegments,
    segments: [
      ...(includeBorder ? [border] : []),
      xAxis,
      yAxis,
      ...arrowSegments,
      ...gridSegments
    ],
    axisArrowSegments: arrowSegments,
    tickPoints: showTicks ? [...xTickPoints, ...yTickPoints] : [],
    labels
  };
};

const chooseStandardCoordinateUnitDistance = (minimumDistance: number): number => {
  if (!Number.isFinite(minimumDistance) || minimumDistance <= 1) return 1;
  const base = Math.pow(10, Math.floor(Math.log10(minimumDistance)));
  for (const multiplier of [1, 2, 5, 10]) {
    const candidate = base * multiplier;
    if (candidate >= minimumDistance - 1e-9) return candidate;
  }
  return base * 10;
};

const createStandardCoordinateTickPositions = (lower: number, upper: number, distance: number): number[] => {
  if (!Number.isFinite(distance) || distance <= 0) return [];
  const positions: number[] = [];
  const epsilon = distance * 1e-6;
  let value = Math.ceil((lower - epsilon) / distance) * distance;
  let guard = 0;
  while (value <= upper + epsilon && guard < 4096) {
    positions.push(isStandardZeroCoordinate(value) ? 0 : Number(value.toFixed(10)));
    value += distance;
    guard += 1;
  }
  return positions;
};

const normalizeStandardCoordinateRange = (
  value: { min: number; max: number } | undefined,
  fallbackMin: number,
  fallbackMax: number
): { min: number; max: number } => {
  const min = typeof value?.min === 'number' && Number.isFinite(value.min) ? value.min : fallbackMin;
  const max = typeof value?.max === 'number' && Number.isFinite(value.max) ? value.max : fallbackMax;
  return min < max ? { min, max } : { min: fallbackMin, max: fallbackMax };
};

const createInteriorTicksFromStrategy = (
  min: number,
  max: number,
  strategy: StandardCoordinateAxisTickStrategy | undefined
): number[] => createTicksFromStrategy(min, max, strategy, false);

const createGridTicksFromStrategy = (
  min: number,
  max: number,
  strategy: StandardCoordinateAxisTickStrategy | undefined
): number[] => createTicksFromStrategy(min, max, strategy, true);

const createTicksFromStrategy = (
  min: number,
  max: number,
  strategy: StandardCoordinateAxisTickStrategy | undefined,
  includeBoundary: boolean
): number[] => {
  if (strategy?.kind === 'custom') {
    const lower = includeBoundary ? min - 1e-9 : min + 1e-9;
    const upper = includeBoundary ? max + 1e-9 : max - 1e-9;
    return [...(strategy.labels ?? [])]
      .map((tick) => tick.value)
      .filter((value) => Number.isFinite(value) && value >= lower && value <= upper)
      .map((value) => isStandardZeroCoordinate(value) ? 0 : Number(value.toFixed(10)))
      .sort((left, right) => left - right);
  }

  const step = resolveTickStep(strategy);
  const origin = Number.isFinite(strategy?.origin) ? strategy!.origin! : 0;
  if (!Number.isFinite(step) || step <= 0) return [];

  const values: number[] = [];
  const epsilon = step * 1e-6;
  const lower = includeBoundary ? min - epsilon : min + epsilon;
  const upper = includeBoundary ? max + epsilon : max - epsilon;
  let value = origin + Math.ceil((lower - origin) / step) * step;
  let guard = 0;
  while (value <= upper && guard < 4096) {
    if (value >= lower) values.push(isStandardZeroCoordinate(value) ? 0 : Number(value.toFixed(10)));
    value += step;
    guard += 1;
  }
  return values;
};

const resolveTickStep = (strategy: StandardCoordinateAxisTickStrategy | undefined): number => {
  if (!strategy || strategy.kind === 'integer') return 1;
  if (strategy.kind === 'pi') {
    const multiple = Number.isFinite(strategy.piMultiple) && strategy.piMultiple! > 0 ? strategy.piMultiple! : 0.5;
    return Math.PI * multiple;
  }
  return Number.isFinite(strategy.step) && strategy.step! > 0 ? strategy.step! : 1;
};

const formatStandardCoordinateTickLabel = (
  value: number,
  strategy: StandardCoordinateAxisTickStrategy | undefined
): string => {
  const custom = strategy?.labels?.find((tick) => Math.abs(tick.value - value) < 1e-9);
  if (custom?.label) return custom.label;
  if (strategy?.kind === 'pi') return formatPiTickLabel(value);
  return formatStandardCoordinateLabel(value);
};

const formatPiTickLabel = (value: number): string => {
  const multiple = Number(value / Math.PI);
  const roundedHalfUnits = Math.round(multiple * 2);
  if (Math.abs(multiple * 2 - roundedHalfUnits) > 1e-6) return `${formatStandardCoordinateLabel(multiple)}π`;
  if (roundedHalfUnits === 0) return '0';
  const sign = roundedHalfUnits < 0 ? '-' : '';
  const absolute = Math.abs(roundedHalfUnits);
  if (absolute === 1) return `${sign}π/2`;
  if (absolute === 2) return `${sign}π`;
  if (absolute % 2 === 0) return `${sign}${absolute / 2}π`;
  return `${sign}${absolute}π/2`;
};

const createStandardAxisArrowSegments = (
  axis: readonly [StandardCoordinatePoint, StandardCoordinatePoint],
  unitPx: number
): Array<readonly [StandardCoordinatePoint, StandardCoordinatePoint]> => {
  const start = axis[0];
  const end = axis[1];
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy);
  if (!Number.isFinite(length) || length <= 1e-9) return [];
  const ux = dx / length;
  const uy = dy / length;
  const arrowLength = (STANDARD_COORDINATE_UI.axisArrowLengthPx / STANDARD_COORDINATE_UI.tickTargetDistancePx) * unitPx;
  const arrowHalfHeight = (STANDARD_COORDINATE_UI.axisArrowHalfHeightPx / STANDARD_COORDINATE_UI.tickTargetDistancePx) * unitPx;
  const base = {
    x: end.x - ux * arrowLength,
    y: end.y - uy * arrowLength
  };
  const normal = { x: -uy, y: ux };
  return [
    [end, { x: base.x + normal.x * arrowHalfHeight, y: base.y + normal.y * arrowHalfHeight }],
    [end, { x: base.x - normal.x * arrowHalfHeight, y: base.y - normal.y * arrowHalfHeight }]
  ];
};
