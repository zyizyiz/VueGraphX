import {
  failMathResult,
  normalizeMathTolerance,
  okMathResult,
  type MathResult,
  type MathResultMetaInput,
  type MathTolerance
} from './diagnostics';

export interface MathTrigonometryOptions {
  tolerance?: MathTolerance;
  epsilon?: number;
}

const toleranceForOptions = (options: MathTrigonometryOptions = {}) => normalizeMathTolerance({
  ...options.tolerance,
  epsilon: options.epsilon ?? options.tolerance?.epsilon
});

const metaForOptions = (
  options: MathTrigonometryOptions = {},
  target: string,
  method = 'analytic'
): MathResultMetaInput => ({
  tolerance: toleranceForOptions(options),
  target,
  method
});

const validateFinite = (
  value: number,
  target: string,
  options: MathTrigonometryOptions
): MathResult<number> => {
  const meta = metaForOptions(options, target);
  return Number.isFinite(value)
    ? okMathResult(value, meta)
    : failMathResult('MATH_INVALID_INPUT', target, 'Value must be finite.', meta, { value });
};

const validatePositive = (
  value: number,
  target: string,
  options: MathTrigonometryOptions
): MathResult<number> => {
  const meta = metaForOptions(options, target);
  if (!Number.isFinite(value)) {
    return failMathResult('MATH_INVALID_INPUT', target, 'Value must be finite.', meta, { value });
  }
  if (value <= toleranceForOptions(options).epsilon) {
    return failMathResult('MATH_DEGENERATE_GEOMETRY', target, 'Length must be positive.', meta, { value });
  }
  return okMathResult(value, meta);
};

const validateAngleRadians = (
  value: number,
  target: string,
  options: MathTrigonometryOptions
): MathResult<number> => validateFinite(value, target, options);

const validateTriangleAngleRadians = (
  value: number,
  target: string,
  options: MathTrigonometryOptions
): MathResult<number> => {
  const meta = metaForOptions(options, target);
  const angle = validateAngleRadians(value, target, options);
  if (!angle.ok) return angle;
  const epsilon = toleranceForOptions(options).epsilon;
  if (angle.value <= epsilon || angle.value >= Math.PI - epsilon) {
    return failMathResult('MATH_DEGENERATE_GEOMETRY', target, 'Triangle angle must be strictly between 0 and π radians.', meta, {
      value
    });
  }
  return okMathResult(angle.value, meta);
};

const validateTriangleSides = (
  sideA: number,
  sideB: number,
  sideC: number,
  options: MathTrigonometryOptions,
  target = 'triangle.sides'
): MathResult<readonly [number, number, number]> => {
  const meta = metaForOptions(options, target);
  const sides = [sideA, sideB, sideC] as const;
  if (sides.some((side) => !Number.isFinite(side))) {
    return failMathResult('MATH_INVALID_INPUT', target, 'Triangle side lengths must be finite.', meta, { sides });
  }
  const epsilon = toleranceForOptions(options).epsilon;
  if (sides.some((side) => side <= epsilon)) {
    return failMathResult('MATH_DEGENERATE_GEOMETRY', target, 'Triangle side lengths must be positive.', meta, { sides });
  }
  const [a, b, c] = sides;
  if (a + b <= c + epsilon || a + c <= b + epsilon || b + c <= a + epsilon) {
    return failMathResult('MATH_DEGENERATE_GEOMETRY', target, 'Triangle inequality is not satisfied.', meta, { sides });
  }
  return okMathResult(sides, meta);
};

export const degreesToRadians = (degrees: number): number => (degrees * Math.PI) / 180;

export const radiansToDegrees = (radians: number): number => (radians * 180) / Math.PI;

export const normalizeAngleRadians = (angleRadians: number, turnRadians = Math.PI * 2): number => {
  if (!Number.isFinite(angleRadians) || !Number.isFinite(turnRadians) || turnRadians <= 0) return NaN;
  const normalized = angleRadians % turnRadians;
  return normalized < 0 ? normalized + turnRadians : normalized;
};

export const sinDegrees = (degrees: number): number => Math.sin(degreesToRadians(degrees));

export const cosDegrees = (degrees: number): number => Math.cos(degreesToRadians(degrees));

export const tanDegrees = (degrees: number): number => Math.tan(degreesToRadians(degrees));

export const triangleAreaHeron = (
  sideA: number,
  sideB: number,
  sideC: number,
  options: MathTrigonometryOptions = {}
): MathResult<number> => {
  const meta = metaForOptions(options, 'triangle.area', 'heron');
  const valid = validateTriangleSides(sideA, sideB, sideC, options);
  if (!valid.ok) return valid;
  const [a, b, c] = valid.value;
  const semiperimeter = (a + b + c) / 2;
  return okMathResult(Math.sqrt(semiperimeter * (semiperimeter - a) * (semiperimeter - b) * (semiperimeter - c)), meta);
};

export const triangleAreaSAS = (
  sideA: number,
  sideB: number,
  includedAngleRadians: number,
  options: MathTrigonometryOptions = {}
): MathResult<number> => {
  const meta = metaForOptions(options, 'triangle.area', 'sas');
  const left = validatePositive(sideA, 'triangle.sideA', options);
  if (!left.ok) return left;
  const right = validatePositive(sideB, 'triangle.sideB', options);
  if (!right.ok) return right;
  const angle = validateTriangleAngleRadians(includedAngleRadians, 'triangle.includedAngle', options);
  if (!angle.ok) return angle;
  return okMathResult((left.value * right.value * Math.sin(angle.value)) / 2, meta);
};

export const lawOfCosinesSide = (
  sideA: number,
  sideB: number,
  includedAngleRadians: number,
  options: MathTrigonometryOptions = {}
): MathResult<number> => {
  const meta = metaForOptions(options, 'triangle.side', 'law-of-cosines');
  const left = validatePositive(sideA, 'triangle.sideA', options);
  if (!left.ok) return left;
  const right = validatePositive(sideB, 'triangle.sideB', options);
  if (!right.ok) return right;
  const angle = validateTriangleAngleRadians(includedAngleRadians, 'triangle.includedAngle', options);
  if (!angle.ok) return angle;
  const squared = left.value ** 2 + right.value ** 2 - 2 * left.value * right.value * Math.cos(angle.value);
  return squared >= -toleranceForOptions(options).epsilon
    ? okMathResult(Math.sqrt(Math.max(0, squared)), meta)
    : failMathResult('MATH_NUMERIC_METHOD_FAILED', 'triangle.side', 'Computed side length is not real.', meta, { squared });
};

export const lawOfCosinesAngle = (
  oppositeSide: number,
  adjacentSideA: number,
  adjacentSideB: number,
  options: MathTrigonometryOptions = {}
): MathResult<number> => {
  const meta = metaForOptions(options, 'triangle.angle', 'law-of-cosines');
  const valid = validateTriangleSides(oppositeSide, adjacentSideA, adjacentSideB, options);
  if (!valid.ok) return valid;
  const [opposite, a, b] = valid.value;
  const cosine = (a ** 2 + b ** 2 - opposite ** 2) / (2 * a * b);
  return okMathResult(Math.acos(Math.min(1, Math.max(-1, cosine))), meta);
};

export const lawOfSinesSide = (
  knownSide: number,
  knownOppositeAngleRadians: number,
  targetOppositeAngleRadians: number,
  options: MathTrigonometryOptions = {}
): MathResult<number> => {
  const meta = metaForOptions(options, 'triangle.side', 'law-of-sines');
  const side = validatePositive(knownSide, 'triangle.knownSide', options);
  if (!side.ok) return side;
  const knownAngle = validateTriangleAngleRadians(knownOppositeAngleRadians, 'triangle.knownAngle', options);
  if (!knownAngle.ok) return knownAngle;
  const targetAngle = validateTriangleAngleRadians(targetOppositeAngleRadians, 'triangle.targetAngle', options);
  if (!targetAngle.ok) return targetAngle;
  const denominator = Math.sin(knownAngle.value);
  if (Math.abs(denominator) <= toleranceForOptions(options).epsilon) {
    return failMathResult('MATH_DEGENERATE_GEOMETRY', 'triangle.knownAngle', 'Known opposite angle cannot have zero sine.', meta, {
      knownOppositeAngleRadians
    });
  }
  return okMathResult((side.value * Math.sin(targetAngle.value)) / denominator, meta);
};

export const lawOfSinesAngle = (
  knownSide: number,
  knownOppositeAngleRadians: number,
  targetSide: number,
  options: MathTrigonometryOptions = {}
): MathResult<number> => {
  const meta = metaForOptions(options, 'triangle.angle', 'law-of-sines');
  const known = validatePositive(knownSide, 'triangle.knownSide', options);
  if (!known.ok) return known;
  const target = validatePositive(targetSide, 'triangle.targetSide', options);
  if (!target.ok) return target;
  const angle = validateTriangleAngleRadians(knownOppositeAngleRadians, 'triangle.knownAngle', options);
  if (!angle.ok) return angle;
  const sine = (target.value * Math.sin(angle.value)) / known.value;
  if (sine < -1 - toleranceForOptions(options).epsilon || sine > 1 + toleranceForOptions(options).epsilon) {
    return failMathResult('MATH_NO_REAL_SOLUTION', 'triangle.angle', 'No real triangle angle satisfies the sine law inputs.', meta, {
      sine
    });
  }
  return okMathResult(Math.asin(Math.min(1, Math.max(-1, sine))), meta);
};
