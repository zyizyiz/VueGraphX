import type { GraphViewportSize } from './contracts';

export interface GraphViewportGridOptions {
  enabled?: boolean;
  cellSizePx?: number;
  lineColor?: string;
  lineWidth?: number;
  backgroundColor?: string;
  minCellSizePx?: number;
  maxLines?: number;
}

export type GraphViewportGridInput = boolean | GraphViewportGridOptions;

export interface ResolvedGraphViewportGridOptions {
  enabled: boolean;
  cellSizePx: number;
  lineColor: string;
  lineWidth: number;
  backgroundColor: string;
  minCellSizePx: number;
  maxLines: number;
}

export interface GraphViewportGridWorldBounds2D {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export const GRAPH_VIEWPORT_GRID_DEFAULTS: ResolvedGraphViewportGridOptions = {
  enabled: false,
  cellSizePx: 30,
  lineColor: 'rgba(148, 163, 184, 0.18)',
  lineWidth: 1,
  backgroundColor: '#F8FAFC',
  minCellSizePx: 6,
  maxLines: 240
};

export const resolveGraphViewportGridOptions = (
  input?: GraphViewportGridInput,
  fallback: ResolvedGraphViewportGridOptions = GRAPH_VIEWPORT_GRID_DEFAULTS
): ResolvedGraphViewportGridOptions => {
  if (input === undefined) return { ...fallback, enabled: false };
  if (input === false) return { ...fallback, enabled: false };
  if (input === true) return { ...fallback, enabled: true };

  return {
    enabled: input.enabled ?? true,
    cellSizePx: positiveFinite(input.cellSizePx, fallback.cellSizePx),
    lineColor: nonEmptyString(input.lineColor, fallback.lineColor),
    lineWidth: positiveFinite(input.lineWidth, fallback.lineWidth),
    backgroundColor: nonEmptyString(input.backgroundColor, fallback.backgroundColor),
    minCellSizePx: positiveFinite(input.minCellSizePx, fallback.minCellSizePx),
    maxLines: positiveInteger(input.maxLines, fallback.maxLines)
  };
};

export const createCenteredWorldBoundsForViewportGrid = (
  viewport: GraphViewportSize,
  grid: Pick<ResolvedGraphViewportGridOptions, 'cellSizePx'>,
  center: { x: number; y: number } = { x: 0, y: 0 }
): GraphViewportGridWorldBounds2D => {
  const cellSize = Math.max(1e-6, grid.cellSizePx);
  const halfWidth = Math.max(1, viewport.width) / cellSize / 2;
  const halfHeight = Math.max(1, viewport.height) / cellSize / 2;
  return {
    left: center.x - halfWidth,
    right: center.x + halfWidth,
    top: center.y + halfHeight,
    bottom: center.y - halfHeight
  };
};

export const resolveGraphViewportGridStep = (
  pixelsPerUnit: number,
  visibleUnits: number,
  grid: Pick<ResolvedGraphViewportGridOptions, 'minCellSizePx' | 'maxLines'>
): number => {
  const safePixelsPerUnit = Number.isFinite(pixelsPerUnit) && pixelsPerUnit > 0 ? pixelsPerUnit : 1;
  const safeVisibleUnits = Number.isFinite(visibleUnits) && visibleUnits > 0 ? visibleUnits : 1;
  const minCellSize = Math.max(1, grid.minCellSizePx);
  const maxLines = Math.max(1, Math.floor(grid.maxLines));
  let step = 1;

  while (safePixelsPerUnit * step < minCellSize || safeVisibleUnits / step > maxLines) {
    step *= 2;
  }

  return step;
};

const positiveFinite = (value: unknown, fallback: number): number => (
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback
);

const positiveInteger = (value: unknown, fallback: number): number => (
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback
);

const nonEmptyString = (value: unknown, fallback: string): string => (
  typeof value === 'string' && value.trim() ? value : fallback
);
