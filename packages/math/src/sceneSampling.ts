import * as math from 'mathjs';

export interface SceneSamplePoint2D {
  x: number;
  y: number;
}

export interface SceneSamplePoint3D extends SceneSamplePoint2D {
  z: number;
}

export interface SceneSamplingBounds2D {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface SampleFunctionSegmentsOptions {
  min?: number;
  max?: number;
  steps?: number;
  yMin?: number;
  yMax?: number;
  maxYJump?: number;
}

export interface SampleImplicitEquationOptions {
  bounds: SceneSamplingBounds2D;
  grid?: number;
  stitchEpsilon?: number;
}

export interface SampleExplicitSurfaceOptions {
  expression: string;
  xDomain?: readonly [number, number];
  yDomain?: readonly [number, number];
  xSteps?: number;
  ySteps?: number;
  scope?: Record<string, unknown>;
  zScale?: number;
  maxAbsZ?: number;
}

export interface SampleParametricSurfaceOptions {
  xExpression: string;
  yExpression: string;
  zExpression: string;
  uDomain?: readonly [number, number];
  vDomain?: readonly [number, number];
  uSteps?: number;
  vSteps?: number;
  scope?: Record<string, unknown>;
  zScale?: number;
  maxAbsZ?: number;
}

const DEFAULT_SCOPE = { e: Math.E, pi: Math.PI };

export const sampleFunctionSegments = (
  evaluate: (x: number) => unknown,
  options: SampleFunctionSegmentsOptions = {}
): SceneSamplePoint2D[][] => {
  const min = options.min ?? -10;
  const max = options.max ?? 10;
  const steps = Math.max(2, Math.floor(options.steps ?? 240));
  const yMin = options.yMin ?? -10;
  const yMax = options.yMax ?? 10;
  const nominalStep = Math.abs(max - min) / Math.max(1, steps - 1);
  const maxYJump = options.maxYJump ?? Math.abs(yMax - yMin) * 1.5;
  const segments: SceneSamplePoint2D[][] = [];
  let current: SceneSamplePoint2D[] = [];

  const flush = () => {
    if (current.length >= 2) segments.push(current);
    current = [];
  };

  for (let index = 0; index < steps; index += 1) {
    const x = min + ((max - min) * index) / (steps - 1);
    let rawY: unknown;
    try {
      rawY = evaluate(x);
    } catch {
      flush();
      continue;
    }
    const y = typeof rawY === 'number' ? rawY : Number(rawY);
    if (!Number.isFinite(y) || y < yMin * 4 || y > yMax * 4) {
      flush();
      continue;
    }

    const previous = current[current.length - 1];
    if (previous && (Math.abs(x - previous.x) > nominalStep * 1.5 || Math.abs(y - previous.y) > maxYJump)) {
      flush();
    }
    current.push({ x, y });
  }
  flush();
  return segments;
};

export const sampleFunctionExpressionSegments = (
  expression: string,
  variable = 'x',
  scope: Record<string, unknown> = {},
  options: SampleFunctionSegmentsOptions = {}
): SceneSamplePoint2D[][] => {
  const code = math.parse(expression).compile();
  return sampleFunctionSegments(
    (value) => code.evaluate({ ...DEFAULT_SCOPE, ...scope, [variable]: value, x: value }),
    options
  );
};

export const sampleImplicitEquationSegments = (
  expression: string,
  options: SampleImplicitEquationOptions
): SceneSamplePoint2D[][] => {
  const circle = sampleCircleEquationSegments(expression);
  if (circle.length > 0) return circle;

  const parts = expression.split('=');
  if (parts.length !== 2) return [];

  let evaluate: (x: number, y: number) => number;
  try {
    const code = math.parse(`(${parts[0]}) - (${parts[1]})`).compile();
    evaluate = (x, y) => Number(code.evaluate({ ...DEFAULT_SCOPE, x, y }));
  } catch {
    return [];
  }

  const { left, right, top, bottom } = options.bounds;
  const grid = Math.max(8, Math.floor(options.grid ?? 72));
  const values: number[][] = [];
  for (let row = 0; row <= grid; row += 1) {
    values[row] = [];
    const y = bottom + ((top - bottom) * row) / grid;
    for (let col = 0; col <= grid; col += 1) {
      const x = left + ((right - left) * col) / grid;
      const value = evaluate(x, y);
      values[row][col] = Number.isFinite(value) ? value : NaN;
    }
  }

  const cellSegments: Array<[SceneSamplePoint2D, SceneSamplePoint2D]> = [];
  for (let row = 0; row < grid; row += 1) {
    for (let col = 0; col < grid; col += 1) {
      const x0 = left + ((right - left) * col) / grid;
      const x1 = left + ((right - left) * (col + 1)) / grid;
      const y0 = bottom + ((top - bottom) * row) / grid;
      const y1 = bottom + ((top - bottom) * (row + 1)) / grid;
      const corners = [
        { x: x0, y: y0, value: values[row][col] },
        { x: x1, y: y0, value: values[row][col + 1] },
        { x: x1, y: y1, value: values[row + 1][col + 1] },
        { x: x0, y: y1, value: values[row + 1][col] }
      ];
      const crossings = [
        interpolateZeroCrossing(corners[0], corners[1]),
        interpolateZeroCrossing(corners[1], corners[2]),
        interpolateZeroCrossing(corners[2], corners[3]),
        interpolateZeroCrossing(corners[3], corners[0])
      ].filter((point): point is SceneSamplePoint2D => !!point);

      if (crossings.length === 2) {
        cellSegments.push([crossings[0], crossings[1]]);
      } else if (crossings.length === 4) {
        const centerValue = evaluate((x0 + x1) / 2, (y0 + y1) / 2);
        if (Number.isFinite(centerValue) && centerValue >= 0) {
          cellSegments.push([crossings[0], crossings[1]], [crossings[2], crossings[3]]);
        } else {
          cellSegments.push([crossings[0], crossings[3]], [crossings[1], crossings[2]]);
        }
      }
    }
  }

  return stitchLineSegments(cellSegments, options.stitchEpsilon ?? 1e-3);
};

export const sampleCircleEquationSegments = (expression: string): SceneSamplePoint2D[][] => {
  const normalized = expression.replace(/\s+/g, '').replace(/\*\*/g, '^');
  const match = normalized.match(/^x\^2\+y\^2=([0-9.]+)$/) ?? normalized.match(/^y\^2\+x\^2=([0-9.]+)$/);
  if (!match) return [];
  const radiusSquared = Number(match[1]);
  if (!Number.isFinite(radiusSquared) || radiusSquared <= 0) return [];
  const radius = Math.sqrt(radiusSquared);
  return [sampleParametricClosedCurve((theta) => ({
    x: radius * Math.cos(theta),
    y: radius * Math.sin(theta)
  }))];
};

export const sampleParametricClosedCurve = (
  pointAt: (theta: number) => SceneSamplePoint2D,
  steps = 145
): SceneSamplePoint2D[] => {
  const count = Math.max(3, Math.floor(steps));
  const points: SceneSamplePoint2D[] = [];
  for (let index = 0; index < count; index += 1) {
    points.push(pointAt((Math.PI * 2 * index) / (count - 1)));
  }
  return points;
};

export const sampleExplicitSurfaceWireframe = ({
  expression,
  xDomain = [-4, 4],
  yDomain = [-4, 4],
  xSteps = 17,
  ySteps = 17,
  scope = {},
  zScale = 1,
  maxAbsZ = 60
}: SampleExplicitSurfaceOptions): SceneSamplePoint3D[][] => {
  const code = math.parse(expression).compile();
  const evaluate = (x: number, y: number): number => Number(code.evaluate({ ...DEFAULT_SCOPE, ...scope, x, y })) * zScale;
  return sampleSurfaceGridWireframe(evaluate, xDomain, yDomain, xSteps, ySteps, maxAbsZ);
};

export const sampleParametricSurfaceWireframe = ({
  xExpression,
  yExpression,
  zExpression,
  uDomain = [-Math.PI, Math.PI],
  vDomain = [-Math.PI, Math.PI],
  uSteps = 25,
  vSteps = 17,
  scope = {},
  zScale = 1,
  maxAbsZ = 60
}: SampleParametricSurfaceOptions): SceneSamplePoint3D[][] => {
  const xCode = math.parse(xExpression).compile();
  const yCode = math.parse(yExpression).compile();
  const zCode = math.parse(zExpression).compile();
  const evaluatePoint = (u: number, v: number): SceneSamplePoint3D | null => {
    try {
      const evalScope = { ...DEFAULT_SCOPE, ...scope, u, v };
      const x = Number(xCode.evaluate(evalScope));
      const y = Number(yCode.evaluate(evalScope));
      const z = Number(zCode.evaluate(evalScope)) * zScale;
      if (![x, y, z].every(Number.isFinite) || Math.abs(z) > maxAbsZ) return null;
      return { x, y, z };
    } catch {
      return null;
    }
  };
  const uCount = Math.max(2, Math.floor(uSteps));
  const vCount = Math.max(2, Math.floor(vSteps));
  const rows: SceneSamplePoint3D[][] = [];
  for (let vi = 0; vi < vCount; vi += 1) {
    const v = vDomain[0] + ((vDomain[1] - vDomain[0]) * vi) / (vCount - 1);
    rows.push(sampleParametricLine((index, count) => {
      const u = uDomain[0] + ((uDomain[1] - uDomain[0]) * index) / (count - 1);
      return evaluatePoint(u, v);
    }, uCount));
  }
  for (let ui = 0; ui < uCount; ui += 1) {
    const u = uDomain[0] + ((uDomain[1] - uDomain[0]) * ui) / (uCount - 1);
    rows.push(sampleParametricLine((index, count) => {
      const v = vDomain[0] + ((vDomain[1] - vDomain[0]) * index) / (count - 1);
      return evaluatePoint(u, v);
    }, vCount));
  }
  return rows.filter((line) => line.length >= 2);
};

export const projectSurfaceWireframeIsometric = (
  segments: readonly (readonly SceneSamplePoint3D[])[],
  options: { xySkew?: number; yDepth?: number; zScale?: number } = {}
): SceneSamplePoint2D[][] => {
  const xySkew = options.xySkew ?? 0.42;
  const yDepth = options.yDepth ?? 0.28;
  const zScale = options.zScale ?? 0.58;
  return segments
    .map((segment) => segment.map((point) => ({
      x: point.x - point.y * xySkew,
      y: point.z * zScale + point.y * yDepth
    })))
    .filter((segment) => segment.length >= 2);
};

const sampleSurfaceGridWireframe = (
  evaluate: (x: number, y: number) => number,
  xDomain: readonly [number, number],
  yDomain: readonly [number, number],
  xSteps: number,
  ySteps: number,
  maxAbsZ: number
): SceneSamplePoint3D[][] => {
  const xCount = Math.max(2, Math.floor(xSteps));
  const yCount = Math.max(2, Math.floor(ySteps));
  const lines: SceneSamplePoint3D[][] = [];
  for (let yi = 0; yi < yCount; yi += 1) {
    const y = yDomain[0] + ((yDomain[1] - yDomain[0]) * yi) / (yCount - 1);
    lines.push(sampleParametricLine((index, count) => {
      const x = xDomain[0] + ((xDomain[1] - xDomain[0]) * index) / (count - 1);
      return evaluateSurfacePoint(evaluate, x, y, maxAbsZ);
    }, xCount));
  }
  for (let xi = 0; xi < xCount; xi += 1) {
    const x = xDomain[0] + ((xDomain[1] - xDomain[0]) * xi) / (xCount - 1);
    lines.push(sampleParametricLine((index, count) => {
      const y = yDomain[0] + ((yDomain[1] - yDomain[0]) * index) / (count - 1);
      return evaluateSurfacePoint(evaluate, x, y, maxAbsZ);
    }, yCount));
  }
  return lines.filter((line) => line.length >= 2);
};

const sampleParametricLine = <Point extends SceneSamplePoint2D | SceneSamplePoint3D>(
  pointAt: (index: number, count: number) => Point | null,
  count: number
): Point[] => {
  const points: Point[] = [];
  for (let index = 0; index < count; index += 1) {
    const point = pointAt(index, count);
    if (point) points.push(point);
  }
  return points;
};

const evaluateSurfacePoint = (
  evaluate: (x: number, y: number) => number,
  x: number,
  y: number,
  maxAbsZ: number
): SceneSamplePoint3D | null => {
  try {
    const z = evaluate(x, y);
    if (!Number.isFinite(z) || Math.abs(z) > maxAbsZ) return null;
    return { x, y, z };
  } catch {
    return null;
  }
};

const interpolateZeroCrossing = (
  first: SceneSamplePoint2D & { value: number },
  second: SceneSamplePoint2D & { value: number }
): SceneSamplePoint2D | null => {
  if (!Number.isFinite(first.value) || !Number.isFinite(second.value)) return null;
  if (first.value === second.value) return Math.abs(first.value) < 1e-9 ? { x: first.x, y: first.y } : null;
  if ((first.value > 0 && second.value > 0) || (first.value < 0 && second.value < 0)) return null;
  const ratio = Math.abs(first.value) / (Math.abs(first.value) + Math.abs(second.value));
  return {
    x: first.x + (second.x - first.x) * ratio,
    y: first.y + (second.y - first.y) * ratio
  };
};

const stitchLineSegments = (
  segments: Array<[SceneSamplePoint2D, SceneSamplePoint2D]>,
  epsilon: number
): SceneSamplePoint2D[][] => {
  const unused = segments.map(([start, end]) => ({ start, end, used: false }));
  const chains: SceneSamplePoint2D[][] = [];

  for (const seed of unused) {
    if (seed.used) continue;
    seed.used = true;
    const chain = [seed.start, seed.end];
    let changed = true;
    while (changed) {
      changed = false;
      for (const segment of unused) {
        if (segment.used) continue;
        const first = chain[0];
        const last = chain[chain.length - 1];
        if (samePoint(last, segment.start, epsilon)) {
          chain.push(segment.end);
        } else if (samePoint(last, segment.end, epsilon)) {
          chain.push(segment.start);
        } else if (samePoint(first, segment.end, epsilon)) {
          chain.unshift(segment.start);
        } else if (samePoint(first, segment.start, epsilon)) {
          chain.unshift(segment.end);
        } else {
          continue;
        }
        segment.used = true;
        changed = true;
      }
    }
    const deduped = dedupeConsecutive(chain, epsilon);
    if (deduped.length >= 2) chains.push(deduped);
  }

  return chains;
};

const dedupeConsecutive = (points: SceneSamplePoint2D[], epsilon: number): SceneSamplePoint2D[] => {
  const result: SceneSamplePoint2D[] = [];
  for (const point of points) {
    const previous = result[result.length - 1];
    if (!previous || !samePoint(previous, point, epsilon)) result.push(point);
  }
  return result;
};

const samePoint = (left: SceneSamplePoint2D, right: SceneSamplePoint2D, epsilon: number): boolean => (
  Math.abs(left.x - right.x) <= epsilon && Math.abs(left.y - right.y) <= epsilon
);
