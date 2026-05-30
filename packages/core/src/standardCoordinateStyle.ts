export interface StandardCoordinateTickModel {
  unitDistance: number;
  positions: number[];
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
  yAxisLabelTopPx: 0
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
