export interface GraphGridSnapPoint {
  x: number;
  y: number;
}

export type GraphGridSnapPixelScale = number | Partial<GraphGridSnapPoint>;

export interface GraphGridSnapOptions {
  enabled: boolean;
  step: number;
  origin: GraphGridSnapPoint;
  phase: 'always' | 'end';
  tolerancePx?: number;
  pixelsPerUnit?: GraphGridSnapPixelScale;
}

export type GraphGridSnapInput =
  | boolean
  | {
    enabled?: boolean;
    step?: number;
    origin?: Partial<GraphGridSnapPoint>;
    phase?: 'always' | 'end';
    tolerancePx?: number;
    pixelsPerUnit?: GraphGridSnapPixelScale;
  };

const DEFAULT_GRID_SNAP_OPTIONS: GraphGridSnapOptions = {
  enabled: false,
  step: 1,
  origin: { x: 0, y: 0 },
  phase: 'always',
  tolerancePx: 5,
  pixelsPerUnit: { x: 30, y: 30 }
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
    phase: fallback.phase ?? DEFAULT_GRID_SNAP_OPTIONS.phase,
    tolerancePx: normalizePositiveFinite(fallback.tolerancePx, DEFAULT_GRID_SNAP_OPTIONS.tolerancePx),
    pixelsPerUnit: normalizePixelScale(fallback.pixelsPerUnit, DEFAULT_GRID_SNAP_OPTIONS.pixelsPerUnit)
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
    phase: record.phase === 'end' || record.phase === 'always' ? record.phase : base.phase,
    tolerancePx: normalizePositiveFinite(record.tolerancePx, base.tolerancePx),
    pixelsPerUnit: normalizePixelScale(record.pixelsPerUnit, base.pixelsPerUnit)
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

const normalizePositiveFinite = (value: unknown, fallback = 1): number => (
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback
);

const normalizeFiniteNumber = (value: unknown, fallback: number): number => (
  typeof value === 'number' && Number.isFinite(value) ? value : fallback
);

const normalizePixelScale = (
  value: unknown,
  fallback: GraphGridSnapPixelScale | undefined
): GraphGridSnapPixelScale => {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value;
  const fallbackRecord = typeof fallback === 'object' && fallback !== null ? fallback : {};
  const fallbackNumber = typeof fallback === 'number' && Number.isFinite(fallback) && fallback > 0 ? fallback : undefined;
  if (typeof value !== 'object' || value === null) {
    return fallbackNumber ?? {
      x: normalizePositiveFinite(fallbackRecord.x, 30),
      y: normalizePositiveFinite(fallbackRecord.y, 30)
    };
  }
  const record = value as Record<string, unknown>;
  return {
    x: normalizePositiveFinite(record.x, fallbackNumber ?? normalizePositiveFinite(fallbackRecord.x, 30)),
    y: normalizePositiveFinite(record.y, fallbackNumber ?? normalizePositiveFinite(fallbackRecord.y, 30))
  };
};

const normalizeZero = (value: number): number => (
  Math.abs(value) < 1e-9 ? 0 : Number(value.toFixed(10))
);
