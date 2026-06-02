export interface GraphGridSnapPoint {
  x: number;
  y: number;
}

export interface GraphGridSnapOptions {
  enabled: boolean;
  step: number;
  origin: GraphGridSnapPoint;
  phase: 'always' | 'end';
}

export type GraphGridSnapInput =
  | boolean
  | {
    enabled?: boolean;
    step?: number;
    origin?: Partial<GraphGridSnapPoint>;
    phase?: 'always' | 'end';
  };

const DEFAULT_GRID_SNAP_OPTIONS: GraphGridSnapOptions = {
  enabled: false,
  step: 1,
  origin: { x: 0, y: 0 },
  phase: 'always'
};

export const resolveGraphGridSnapOptions = (
  input: unknown,
  fallback: Partial<GraphGridSnapOptions> = {}
): GraphGridSnapOptions => {
  const fallbackOrigin = fallback.origin ?? DEFAULT_GRID_SNAP_OPTIONS.origin;
  const base: GraphGridSnapOptions = {
    enabled: fallback.enabled ?? DEFAULT_GRID_SNAP_OPTIONS.enabled,
    step: normalizeSnapStep(fallback.step),
    origin: {
      x: normalizeFiniteNumber(fallbackOrigin.x, DEFAULT_GRID_SNAP_OPTIONS.origin.x),
      y: normalizeFiniteNumber(fallbackOrigin.y, DEFAULT_GRID_SNAP_OPTIONS.origin.y)
    },
    phase: fallback.phase ?? DEFAULT_GRID_SNAP_OPTIONS.phase
  };

  if (typeof input === 'boolean') {
    return { ...base, enabled: input };
  }

  if (!input || typeof input !== 'object') return base;
  const record = input as Record<string, unknown>;
  const origin = record.origin && typeof record.origin === 'object'
    ? record.origin as Record<string, unknown>
    : {};
  return {
    enabled: typeof record.enabled === 'boolean' ? record.enabled : base.enabled,
    step: normalizeSnapStep(record.step, base.step),
    origin: {
      x: normalizeFiniteNumber(origin.x, base.origin.x),
      y: normalizeFiniteNumber(origin.y, base.origin.y)
    },
    phase: record.phase === 'end' || record.phase === 'always' ? record.phase : base.phase
  };
};

export const snapPointToGraphGrid = (
  point: GraphGridSnapPoint,
  input: unknown,
  fallback: Partial<GraphGridSnapOptions> = {}
): GraphGridSnapPoint => {
  const options = resolveGraphGridSnapOptions(input, fallback);
  if (!options.enabled) return { ...point };
  return {
    x: snapValue(point.x, options.origin.x, options.step),
    y: snapValue(point.y, options.origin.y, options.step)
  };
};

export const snapDeltaToGraphGrid = (
  anchor: GraphGridSnapPoint,
  delta: { dx: number; dy: number },
  input: unknown,
  fallback: Partial<GraphGridSnapOptions> = {}
): { dx: number; dy: number } => {
  const snapped = snapPointToGraphGrid(
    { x: anchor.x + delta.dx, y: anchor.y + delta.dy },
    input,
    fallback
  );
  return {
    dx: snapped.x - anchor.x,
    dy: snapped.y - anchor.y
  };
};

const snapValue = (value: number, origin: number, step: number): number => (
  normalizeZero(origin + Math.round((value - origin) / step) * step)
);

const normalizeSnapStep = (value: unknown, fallback = DEFAULT_GRID_SNAP_OPTIONS.step): number => (
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback
);

const normalizeFiniteNumber = (value: unknown, fallback: number): number => (
  typeof value === 'number' && Number.isFinite(value) ? value : fallback
);

const normalizeZero = (value: number): number => (
  Math.abs(value) < 1e-9 ? 0 : Number(value.toFixed(10))
);
