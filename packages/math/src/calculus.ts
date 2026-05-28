import {
  failMathResult,
  normalizeMathTolerance,
  okMathResult,
  type MathInterval,
  type MathResult,
  type MathResultMetaInput,
  type MathTolerance
} from './diagnostics';
import { evaluateFunction, type MathSolveOptions } from './algebra';
import type { GraphFunctionDescriptor } from './functionKernel';
import type { MathLine2D } from './geometry';

export interface MathCalculusOptions extends MathSolveOptions {
  tolerance?: MathTolerance;
  epsilon?: number;
  step?: number;
  subdivisions?: number;
}

const DEFAULT_DERIVATIVE_STEP = 1e-5;
const DEFAULT_INTEGRAL_SUBDIVISIONS = 256;

const toleranceForOptions = (options: MathCalculusOptions = {}) => normalizeMathTolerance({
  ...options.tolerance,
  epsilon: options.epsilon ?? options.tolerance?.epsilon,
  maxIterations: options.maxIterations ?? options.tolerance?.maxIterations
});

const metaForOptions = (
  options: MathCalculusOptions = {},
  target: string,
  method = 'numeric'
): MathResultMetaInput => ({
  tolerance: toleranceForOptions(options),
  domain: options.domain,
  target,
  method
});

const validateFinite = (
  value: number,
  target: string,
  options: MathCalculusOptions
): MathResult<number> => {
  const meta = metaForOptions(options, target);
  return Number.isFinite(value)
    ? okMathResult(value, meta)
    : failMathResult('MATH_INVALID_INPUT', target, 'Calculus input must be finite.', meta, { value });
};

const derivativeStep = (options: MathCalculusOptions): MathResult<number> => {
  const meta = metaForOptions(options, 'calculus.step');
  const step = options.step ?? DEFAULT_DERIVATIVE_STEP;
  if (!Number.isFinite(step) || step <= toleranceForOptions(options).epsilon) {
    return failMathResult('MATH_INVALID_INPUT', 'calculus.step', 'Derivative step must be a positive finite number.', meta, { step });
  }
  return okMathResult(step, meta);
};

const evaluateAt = (
  descriptor: GraphFunctionDescriptor,
  x: number,
  scope: Record<string, number>,
  options: MathCalculusOptions,
  target: string
): MathResult<number> => {
  const result = evaluateFunction(descriptor, x, scope, options);
  return result.ok
    ? result
    : failMathResult('MATH_NUMERIC_METHOD_FAILED', target, 'Function evaluation failed during calculus operation.', metaForOptions(options, target), {
      x,
      diagnostic: result.error
    });
};

export const numericDerivative = (
  descriptor: GraphFunctionDescriptor,
  x: number,
  scope: Record<string, number> = {},
  options: MathCalculusOptions = {}
): MathResult<number> => {
  const meta = metaForOptions(options, 'calculus.derivative', 'central-difference');
  const validX = validateFinite(x, descriptor.variable, options);
  if (!validX.ok) return validX;
  const h = derivativeStep(options);
  if (!h.ok) return h;
  const left = evaluateAt(descriptor, validX.value - h.value, scope, options, 'calculus.derivative');
  if (!left.ok) return left;
  const right = evaluateAt(descriptor, validX.value + h.value, scope, options, 'calculus.derivative');
  if (!right.ok) return right;
  const value = (right.value - left.value) / (2 * h.value);
  return Number.isFinite(value)
    ? okMathResult(value, meta, [...left.diagnostics, ...right.diagnostics])
    : failMathResult('MATH_NON_FINITE_RESULT', 'calculus.derivative', 'Derivative result was not finite.', meta, { x });
};

export const secantSlope = (
  descriptor: GraphFunctionDescriptor,
  startX: number,
  endX: number,
  scope: Record<string, number> = {},
  options: MathCalculusOptions = {}
): MathResult<number> => {
  const meta = metaForOptions(options, 'calculus.secant');
  const start = validateFinite(startX, 'calculus.startX', options);
  if (!start.ok) return start;
  const end = validateFinite(endX, 'calculus.endX', options);
  if (!end.ok) return end;
  if (Math.abs(end.value - start.value) <= toleranceForOptions(options).epsilon) {
    return failMathResult('MATH_DEGENERATE_GEOMETRY', 'calculus.secant', 'Secant slope requires distinct x-values.', meta, { startX, endX });
  }
  const startY = evaluateAt(descriptor, start.value, scope, options, 'calculus.secant');
  if (!startY.ok) return startY;
  const endY = evaluateAt(descriptor, end.value, scope, options, 'calculus.secant');
  if (!endY.ok) return endY;
  return okMathResult((endY.value - startY.value) / (end.value - start.value), meta, [...startY.diagnostics, ...endY.diagnostics]);
};

export const tangentLineAtFunction = (
  descriptor: GraphFunctionDescriptor,
  x: number,
  scope: Record<string, number> = {},
  options: MathCalculusOptions = {}
): MathResult<MathLine2D> => {
  const meta = metaForOptions(options, 'calculus.tangentLine');
  const y = evaluateAt(descriptor, x, scope, options, 'calculus.tangentLine');
  if (!y.ok) return y;
  const slope = numericDerivative(descriptor, x, scope, options);
  if (!slope.ok) return slope;
  return okMathResult({
    kind: 'line',
    point: { x, y: y.value },
    direction: { x: 1, y: slope.value }
  }, meta, [...y.diagnostics, ...slope.diagnostics]);
};

const validateIntegralDomain = (
  domain: MathInterval,
  options: MathCalculusOptions
): MathResult<MathInterval> => {
  const meta = metaForOptions(options, 'calculus.integral.domain');
  if (!Number.isFinite(domain.min) || !Number.isFinite(domain.max)) {
    return failMathResult('MATH_INVALID_INPUT', 'calculus.integral.domain', 'Integral bounds must be finite.', meta, { domain });
  }
  if (domain.max <= domain.min) {
    return failMathResult('MATH_DOMAIN_EMPTY', 'calculus.integral.domain', 'Integral upper bound must exceed lower bound.', meta, { domain });
  }
  return okMathResult(domain, meta);
};

export const definiteIntegral = (
  descriptor: GraphFunctionDescriptor,
  domain: MathInterval,
  scope: Record<string, number> = {},
  options: MathCalculusOptions = {}
): MathResult<number> => {
  const mergedOptions: MathCalculusOptions = { ...options, domain };
  const meta = metaForOptions(mergedOptions, 'calculus.integral', 'trapezoidal');
  const validDomain = validateIntegralDomain(domain, mergedOptions);
  if (!validDomain.ok) return validDomain;
  const subdivisions = Math.floor(options.subdivisions ?? DEFAULT_INTEGRAL_SUBDIVISIONS);
  if (!Number.isInteger(subdivisions) || subdivisions <= 0) {
    return failMathResult('MATH_INVALID_INPUT', 'calculus.integral.subdivisions', 'Integral subdivisions must be a positive integer.', meta, {
      subdivisions: options.subdivisions
    });
  }

  const width = (validDomain.value.max - validDomain.value.min) / subdivisions;
  let sum = 0;
  const diagnostics = [];
  for (let index = 0; index <= subdivisions; index += 1) {
    const x = validDomain.value.min + width * index;
    const y = evaluateAt(descriptor, x, scope, mergedOptions, 'calculus.integral');
    if (!y.ok) return y;
    diagnostics.push(...y.diagnostics);
    sum += (index === 0 || index === subdivisions ? 0.5 : 1) * y.value;
  }
  const value = sum * width;
  return Number.isFinite(value)
    ? okMathResult(value, meta, diagnostics)
    : failMathResult('MATH_NON_FINITE_RESULT', 'calculus.integral', 'Integral result was not finite.', meta, { domain });
};
