import {
  add2D,
  circleFromThreePoints,
  cross2D,
  dot2D,
  intersectCircles2D,
  intersectLineCircle2D,
  intersectLines2D,
  isFinitePoint2D,
  length2D,
  lineFromPoints,
  normalize2D,
  scale2D,
  subtract2D,
  type MathCircle2D,
  type MathIntersection2D,
  type MathLine2D,
  type MathPoint2D,
  type MathVector2D
} from './geometry';
import { solvePolynomialRoots } from './algebra';
import {
  failMathResult,
  infoMathDiagnostic,
  normalizeMathTolerance,
  okMathResult,
  type MathDiagnostic,
  type MathResult,
  type MathResultMetaInput,
  type MathTolerance
} from './diagnostics';

export interface MathGeometryOptions {
  tolerance?: MathTolerance;
  epsilon?: number;
  maxIterations?: number;
}

export interface MathConicCoefficients {
  A: number;
  B: number;
  C: number;
  D: number;
  E: number;
  F: number;
}

export interface MathConic2D {
  kind: 'conic';
  coefficients: MathConicCoefficients;
}

export type MathConicClassification = 'circle' | 'ellipse' | 'parabola' | 'hyperbola' | 'degenerate';

const toleranceForOptions = (options: MathGeometryOptions = {}) => normalizeMathTolerance({
  ...options.tolerance,
  epsilon: options.epsilon ?? options.tolerance?.epsilon,
  maxIterations: options.maxIterations ?? options.tolerance?.maxIterations
});

const metaForOptions = (
  options: MathGeometryOptions = {},
  target: string,
  method = 'analytic'
): MathResultMetaInput => ({
  tolerance: toleranceForOptions(options),
  target,
  method
});

const vectorIsDegenerate = (vector: MathVector2D, epsilon: number): boolean => length2D(vector) <= epsilon;

const validatePoint = (point: MathPoint2D, target: string, meta: MathResultMetaInput): MathResult<MathPoint2D> => (
  isFinitePoint2D(point)
    ? okMathResult(point, meta)
    : failMathResult('MATH_INVALID_INPUT', target, 'Point coordinates must be finite.', meta, { point })
);

const validateLine = (
  line: MathLine2D,
  options: MathGeometryOptions,
  target = 'line'
): MathResult<MathLine2D> => {
  const meta = metaForOptions(options, target);
  const point = validatePoint(line.point, `${target}.point`, meta);
  if (!point.ok) return point;
  if (!isFinitePoint2D(line.direction) || vectorIsDegenerate(line.direction, toleranceForOptions(options).epsilon)) {
    return failMathResult('MATH_DEGENERATE_GEOMETRY', `${target}.direction`, 'Line direction must be finite and non-zero.', meta, {
      direction: line.direction
    });
  }
  return okMathResult(line, meta);
};

const validateCircle = (
  circle: MathCircle2D,
  options: MathGeometryOptions,
  target = 'circle'
): MathResult<MathCircle2D> => {
  const meta = metaForOptions(options, target);
  const center = validatePoint(circle.center, `${target}.center`, meta);
  if (!center.ok) return center;
  if (!Number.isFinite(circle.radius)) {
    return failMathResult('MATH_INVALID_INPUT', `${target}.radius`, 'Circle radius must be finite.', meta, { radius: circle.radius });
  }
  if (circle.radius <= toleranceForOptions(options).epsilon) {
    return failMathResult('MATH_DEGENERATE_GEOMETRY', `${target}.radius`, 'Circle radius must be positive.', meta, {
      radius: circle.radius
    });
  }
  return okMathResult(circle, meta);
};

const coefficientsAreFinite = (coefficients: MathConicCoefficients): boolean => (
  Number.isFinite(coefficients.A)
  && Number.isFinite(coefficients.B)
  && Number.isFinite(coefficients.C)
  && Number.isFinite(coefficients.D)
  && Number.isFinite(coefficients.E)
  && Number.isFinite(coefficients.F)
);

const noRealIntersectionDiagnostic = (
  target: string,
  meta: MathResultMetaInput,
  data?: Record<string, unknown>
): MathDiagnostic => infoMathDiagnostic('MATH_NO_REAL_SOLUTION', target, 'No real intersection exists.', meta, data);

const intersectionDiagnostics = (
  intersection: MathIntersection2D,
  target: string,
  meta: MathResultMetaInput
): MathDiagnostic[] => {
  if (intersection.kind === 'none') return [noRealIntersectionDiagnostic(target, meta)];
  if (intersection.kind === 'coincident') {
    return [infoMathDiagnostic('MATH_MULTIPLE_SOLUTIONS', target, 'Geometries are coincident and have infinitely many intersections.', meta)];
  }
  return [];
};

export const lineFromPointsResult = (
  start: MathPoint2D,
  end: MathPoint2D,
  options: MathGeometryOptions = {}
): MathResult<MathLine2D> => {
  const meta = metaForOptions(options, 'line');
  const startPoint = validatePoint(start, 'line.start', meta);
  if (!startPoint.ok) return startPoint;
  const endPoint = validatePoint(end, 'line.end', meta);
  if (!endPoint.ok) return endPoint;
  const direction = subtract2D(end, start);
  if (vectorIsDegenerate(direction, toleranceForOptions(options).epsilon)) {
    return failMathResult('MATH_DEGENERATE_GEOMETRY', 'line.direction', 'Line requires two distinct points.', meta, { start, end });
  }
  return okMathResult(lineFromPoints(start, end), meta);
};

export const circleFromCenterRadius = (
  center: MathPoint2D,
  radius: number,
  options: MathGeometryOptions = {}
): MathResult<MathCircle2D> => validateCircle({ kind: 'circle', center: { ...center }, radius }, options);

export const circleFromThreePointsResult = (
  first: MathPoint2D,
  second: MathPoint2D,
  third: MathPoint2D,
  options: MathGeometryOptions = {}
): MathResult<MathCircle2D> => {
  const meta = metaForOptions(options, 'circle');
  const points = [
    validatePoint(first, 'circle.first', meta),
    validatePoint(second, 'circle.second', meta),
    validatePoint(third, 'circle.third', meta)
  ];
  const invalid = points.find((point) => !point.ok);
  if (invalid && !invalid.ok) return invalid;

  const circle = circleFromThreePoints(first, second, third);
  if (!circle || circle.radius <= toleranceForOptions(options).epsilon) {
    return failMathResult('MATH_DEGENERATE_GEOMETRY', 'circle.points', 'Three non-collinear points are required.', meta, {
      first,
      second,
      third
    });
  }
  return okMathResult(circle, meta);
};

export const conicFromCoefficients = (
  coefficients: MathConicCoefficients,
  options: MathGeometryOptions = {}
): MathResult<MathConic2D> => {
  const meta = metaForOptions(options, 'conic.coefficients');
  const tolerance = toleranceForOptions(options);
  if (!coefficientsAreFinite(coefficients)) {
    return failMathResult('MATH_INVALID_INPUT', 'conic.coefficients', 'Conic coefficients must be finite.', meta, { coefficients });
  }
  const meaningfulCoefficients = [
    coefficients.A,
    coefficients.B,
    coefficients.C,
    coefficients.D,
    coefficients.E
  ];
  if (meaningfulCoefficients.every((coefficient) => Math.abs(coefficient) <= tolerance.epsilon)) {
    return failMathResult('MATH_DEGENERATE_GEOMETRY', 'conic.coefficients', 'Conic must include at least one variable coefficient.', meta, {
      coefficients
    });
  }
  return okMathResult({ kind: 'conic', coefficients: { ...coefficients } }, meta);
};

export const evaluateConic2D = (
  conic: MathConic2D,
  point: MathPoint2D,
  options: MathGeometryOptions = {}
): MathResult<number> => {
  const meta = metaForOptions(options, 'conic');
  const validPoint = validatePoint(point, 'conic.point', meta);
  if (!validPoint.ok) return validPoint;
  const { A, B, C, D, E, F } = conic.coefficients;
  if (!coefficientsAreFinite(conic.coefficients)) {
    return failMathResult('MATH_INVALID_INPUT', 'conic.coefficients', 'Conic coefficients must be finite.', meta, { coefficients: conic.coefficients });
  }
  return okMathResult(A * point.x * point.x + B * point.x * point.y + C * point.y * point.y + D * point.x + E * point.y + F, meta);
};

export const classifyConic2D = (
  conic: MathConic2D,
  options: MathGeometryOptions = {}
): MathResult<MathConicClassification> => {
  const meta = metaForOptions(options, 'conic');
  if (!coefficientsAreFinite(conic.coefficients)) {
    return failMathResult('MATH_INVALID_INPUT', 'conic.coefficients', 'Conic coefficients must be finite.', meta, { coefficients: conic.coefficients });
  }
  const { A, B, C } = conic.coefficients;
  const tolerance = toleranceForOptions(options);
  if (Math.abs(A) <= tolerance.epsilon && Math.abs(B) <= tolerance.epsilon && Math.abs(C) <= tolerance.epsilon) {
    return okMathResult('degenerate', meta);
  }
  const discriminant = B * B - 4 * A * C;
  if (Math.abs(discriminant) <= tolerance.epsilon) return okMathResult('parabola', meta);
  if (discriminant > 0) return okMathResult('hyperbola', meta);
  if (Math.abs(A - C) <= tolerance.epsilon && Math.abs(B) <= tolerance.epsilon) return okMathResult('circle', meta);
  return okMathResult('ellipse', meta);
};

export const distancePointLine2D = (
  point: MathPoint2D,
  line: MathLine2D,
  options: MathGeometryOptions = {}
): MathResult<number> => {
  const meta = metaForOptions(options, 'line.distance');
  const validPoint = validatePoint(point, 'point', meta);
  if (!validPoint.ok) return validPoint;
  const validLine = validateLine(line, options);
  if (!validLine.ok) return validLine;
  return okMathResult(Math.abs(cross2D(subtract2D(point, line.point), line.direction)) / length2D(line.direction), meta);
};

export const angleBetweenLines2D = (
  left: MathLine2D,
  right: MathLine2D,
  options: MathGeometryOptions = {}
): MathResult<number> => {
  const meta = metaForOptions(options, 'line.angle');
  const validLeft = validateLine(left, options, 'line.left');
  if (!validLeft.ok) return validLeft;
  const validRight = validateLine(right, options, 'line.right');
  if (!validRight.ok) return validRight;
  return okMathResult(Math.atan2(Math.abs(cross2D(left.direction, right.direction)), dot2D(left.direction, right.direction)), meta);
};

export const projectPointToLine2D = (
  point: MathPoint2D,
  line: MathLine2D,
  options: MathGeometryOptions = {}
): MathResult<MathPoint2D> => {
  const meta = metaForOptions(options, 'line.projection');
  const validPoint = validatePoint(point, 'point', meta);
  if (!validPoint.ok) return validPoint;
  const validLine = validateLine(line, options);
  if (!validLine.ok) return validLine;
  const offset = subtract2D(point, line.point);
  const factor = dot2D(offset, line.direction) / dot2D(line.direction, line.direction);
  return okMathResult(add2D(line.point, scale2D(line.direction, factor)), meta);
};

const circleRadialDirectionAtPoint = (
  circle: MathCircle2D,
  point: MathPoint2D,
  options: MathGeometryOptions,
  target: string
): MathResult<MathVector2D> => {
  const meta = metaForOptions(options, target);
  const validCircle = validateCircle(circle, options);
  if (!validCircle.ok) return validCircle;
  const validPoint = validatePoint(point, `${target}.point`, meta);
  if (!validPoint.ok) return validPoint;

  const radial = subtract2D(point, circle.center);
  const radialLength = length2D(radial);
  const tolerance = toleranceForOptions(options);
  const scaledTolerance = tolerance.epsilon * Math.max(1, circle.radius);
  if (Math.abs(radialLength - circle.radius) > scaledTolerance) {
    return failMathResult('MATH_DOMAIN_OUT_OF_RANGE', `${target}.point`, 'Point must lie on the circle.', meta, {
      point,
      radius: circle.radius,
      distance: radialLength
    });
  }

  return okMathResult(normalize2D(radial, tolerance.epsilon), meta);
};

export const tangentLineToCircleAtPoint2D = (
  circle: MathCircle2D,
  point: MathPoint2D,
  options: MathGeometryOptions = {}
): MathResult<MathLine2D> => {
  const meta = metaForOptions(options, 'circle.tangent');
  const radial = circleRadialDirectionAtPoint(circle, point, options, 'circle.tangent');
  if (!radial.ok) return radial;
  return okMathResult({
    kind: 'line',
    point: { ...point },
    direction: { x: -radial.value.y, y: radial.value.x }
  }, meta);
};

export const normalLineToCircleAtPoint2D = (
  circle: MathCircle2D,
  point: MathPoint2D,
  options: MathGeometryOptions = {}
): MathResult<MathLine2D> => {
  const meta = metaForOptions(options, 'circle.normal');
  const radial = circleRadialDirectionAtPoint(circle, point, options, 'circle.normal');
  if (!radial.ok) return radial;
  return okMathResult({
    kind: 'line',
    point: { ...point },
    direction: radial.value
  }, meta);
};

export const intersectLines2DResult = (
  left: MathLine2D,
  right: MathLine2D,
  options: MathGeometryOptions = {}
): MathResult<MathIntersection2D> => {
  const meta = metaForOptions(options, 'line.intersection');
  const validLeft = validateLine(left, options, 'line.left');
  if (!validLeft.ok) return validLeft;
  const validRight = validateLine(right, options, 'line.right');
  if (!validRight.ok) return validRight;
  const intersection = intersectLines2D(left, right, toleranceForOptions(options).epsilon);
  const diagnostics = intersection.kind === 'none' || intersection.kind === 'coincident'
    ? [infoMathDiagnostic('MATH_PARALLEL_OR_COINCIDENT', 'line.intersection', 'Lines are parallel or coincident.', meta)]
    : [];
  return okMathResult(intersection, meta, diagnostics);
};

export const intersectLineCircle2DResult = (
  line: MathLine2D,
  circle: MathCircle2D,
  options: MathGeometryOptions = {}
): MathResult<MathIntersection2D> => {
  const meta = metaForOptions(options, 'lineCircle.intersection');
  const validLine = validateLine(line, options);
  if (!validLine.ok) return validLine;
  const validCircle = validateCircle(circle, options);
  if (!validCircle.ok) return validCircle;
  const intersection = intersectLineCircle2D(line, circle, toleranceForOptions(options).epsilon);
  return okMathResult(intersection, meta, intersectionDiagnostics(intersection, 'lineCircle.intersection', meta));
};

export const intersectCircles2DResult = (
  left: MathCircle2D,
  right: MathCircle2D,
  options: MathGeometryOptions = {}
): MathResult<MathIntersection2D> => {
  const meta = metaForOptions(options, 'circle.intersection');
  const validLeft = validateCircle(left, options, 'circle.left');
  if (!validLeft.ok) return validLeft;
  const validRight = validateCircle(right, options, 'circle.right');
  if (!validRight.ok) return validRight;
  const intersection = intersectCircles2D(left, right, toleranceForOptions(options).epsilon);
  return okMathResult(intersection, meta, intersectionDiagnostics(intersection, 'circle.intersection', meta));
};

export const intersectLineConic2DResult = (
  line: MathLine2D,
  conic: MathConic2D,
  options: MathGeometryOptions = {}
): MathResult<MathIntersection2D> => {
  const meta = metaForOptions(options, 'lineConic.intersection');
  const validLine = validateLine(line, options);
  if (!validLine.ok) return validLine;
  if (!coefficientsAreFinite(conic.coefficients)) {
    return failMathResult('MATH_INVALID_INPUT', 'conic.coefficients', 'Conic coefficients must be finite.', meta, { coefficients: conic.coefficients });
  }

  const { A, B, C, D, E, F } = conic.coefficients;
  const { x: px, y: py } = line.point;
  const { x: dx, y: dy } = line.direction;
  const roots = solvePolynomialRoots([
    A * dx * dx + B * dx * dy + C * dy * dy,
    2 * A * px * dx + B * (px * dy + py * dx) + 2 * C * py * dy + D * dx + E * dy,
    A * px * px + B * px * py + C * py * py + D * px + E * py + F
  ], { tolerance: toleranceForOptions(options) });

  if (!roots.ok) return roots;
  if (roots.value.length === 0) {
    return okMathResult({ kind: 'none' }, meta, roots.diagnostics.length > 0 ? roots.diagnostics : [noRealIntersectionDiagnostic('lineConic.intersection', meta)]);
  }

  const points = roots.value.map((root) => add2D(line.point, scale2D(line.direction, root.value)));
  if (points.length === 1) return okMathResult({ kind: 'point', point: points[0] }, meta, roots.diagnostics);
  return okMathResult({ kind: 'points', points }, meta, roots.diagnostics);
};
