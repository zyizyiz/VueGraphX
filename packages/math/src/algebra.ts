import * as math from 'mathjs';
import type { MathPoint2D } from './geometry';
import type { GraphFunctionDescriptor } from './functionKernel';
import {
  failMathResult,
  infoMathDiagnostic,
  normalizeMathTolerance,
  okMathResult,
  type MathDiagnostic,
  type MathInterval,
  type MathResult,
  type MathResultMetaInput,
  type MathTolerance
} from './diagnostics';

export type MathExpressionInput = string | { expression: string };

export interface MathSolveOptions {
  tolerance?: MathTolerance;
  epsilon?: number;
  maxIterations?: number;
  samples?: number;
  domain?: MathInterval;
}

export interface MathRoot {
  value: number;
  multiplicity: number;
}

const DEFAULT_ROOT_SAMPLES = 128;
const DEFAULT_MAX_ITERATIONS = 64;

const errorMessage = (error: unknown): string => error instanceof Error ? error.message : String(error);

const expressionText = (input: MathExpressionInput): string => (
  typeof input === 'string' ? input : input.expression
);

const toleranceForOptions = (options: MathSolveOptions = {}) => normalizeMathTolerance({
  ...options.tolerance,
  epsilon: options.epsilon ?? options.tolerance?.epsilon,
  maxIterations: options.maxIterations ?? options.tolerance?.maxIterations
});

const metaForOptions = (
  options: MathSolveOptions = {},
  target: string,
  method: string,
  domain?: MathInterval
): MathResultMetaInput => ({
  tolerance: toleranceForOptions(options),
  domain: domain ?? options.domain,
  target,
  method
});

export const intervalFromTuple = (domain: readonly [number, number]): MathInterval => ({
  min: domain[0],
  max: domain[1]
});

const validateInterval = (
  domain: MathInterval,
  options: MathSolveOptions,
  target = 'domain'
): MathResult<MathInterval> => {
  const meta = metaForOptions(options, target, 'validate', domain);
  if (!Number.isFinite(domain.min) || !Number.isFinite(domain.max)) {
    return failMathResult('MATH_INVALID_INPUT', target, 'Domain bounds must be finite.', meta, { domain });
  }
  if (domain.max <= domain.min) {
    return failMathResult('MATH_DOMAIN_EMPTY', target, 'Domain max must be greater than domain min.', meta, { domain });
  }
  return okMathResult(domain, meta);
};

const descriptorDomain = (descriptor: GraphFunctionDescriptor, options: MathSolveOptions): MathInterval | undefined => (
  options.domain ?? (descriptor.domain ? intervalFromTuple(descriptor.domain) : undefined)
);

export const evaluateExpression = (
  input: MathExpressionInput,
  scope: Record<string, number> = {},
  options: MathSolveOptions = {}
): MathResult<number> => {
  const expression = expressionText(input).trim();
  const meta = metaForOptions(options, 'expression', 'analytic');
  if (expression.length === 0) {
    return failMathResult('MATH_INVALID_INPUT', 'expression', 'Expression must not be empty.', meta);
  }

  try {
    const compiled = math.parse(expression).compile();
    const result = compiled.evaluate({
      ...scope,
      e: Math.E,
      pi: Math.PI
    });
    if (typeof result !== 'number' || !Number.isFinite(result)) {
      return failMathResult('MATH_NON_FINITE_RESULT', 'expression', 'Expression did not evaluate to a finite number.', meta, {
        expression,
        result
      });
    }
    return okMathResult(result, meta);
  } catch (error) {
    return failMathResult('MATH_PARSE_ERROR', 'expression', 'Expression could not be parsed or evaluated.', meta, {
      expression,
      error: errorMessage(error)
    });
  }
};

export const evaluateFunction = (
  descriptor: GraphFunctionDescriptor,
  x: number,
  scope: Record<string, number> = {},
  options: MathSolveOptions = {}
): MathResult<number> => {
  const domain = descriptorDomain(descriptor, options);
  const meta = metaForOptions(options, 'function', 'analytic', domain);
  if (!Number.isFinite(x)) {
    return failMathResult('MATH_INVALID_INPUT', descriptor.variable, 'Function input must be finite.', meta, { x });
  }
  if (domain) {
    const validation = validateInterval(domain, options);
    if (!validation.ok) return validation;
    const { epsilon } = toleranceForOptions(options);
    if (x < domain.min - epsilon || x > domain.max + epsilon) {
      return failMathResult('MATH_DOMAIN_OUT_OF_RANGE', descriptor.variable, 'Function input is outside the domain.', meta, {
        x,
        domain
      });
    }
  }

  const result = evaluateExpression(descriptor.expression, { ...scope, [descriptor.variable]: x }, domain ? { ...options, domain } : options);
  return result.ok ? okMathResult(result.value, meta, result.diagnostics) : result;
};

export const simplifyExpression = (
  input: MathExpressionInput,
  options: MathSolveOptions = {}
): MathResult<string> => {
  const expression = expressionText(input).trim();
  const meta = metaForOptions(options, 'expression', 'symbolic');
  if (expression.length === 0) {
    return failMathResult('MATH_INVALID_INPUT', 'expression', 'Expression must not be empty.', meta);
  }
  try {
    return okMathResult(math.simplify(expression).toString(), meta);
  } catch (error) {
    return failMathResult('MATH_PARSE_ERROR', 'expression', 'Expression could not be simplified.', meta, {
      expression,
      error: errorMessage(error)
    });
  }
};

export const derivativeExpressionResult = (
  descriptor: GraphFunctionDescriptor,
  options: MathSolveOptions = {}
): MathResult<string> => {
  const meta = metaForOptions(options, 'expression', 'symbolic', descriptorDomain(descriptor, options));
  try {
    return okMathResult(math.derivative(descriptor.expression, descriptor.variable).toString(), meta);
  } catch (error) {
    return failMathResult('MATH_PARSE_ERROR', 'expression', 'Expression derivative could not be computed.', meta, {
      expression: descriptor.expression,
      variable: descriptor.variable,
      error: errorMessage(error)
    });
  }
};

const noRealSolutionDiagnostic = (
  target: string,
  meta: MathResultMetaInput,
  data?: Record<string, unknown>
): MathDiagnostic => infoMathDiagnostic('MATH_NO_REAL_SOLUTION', target, 'No real solution exists for the requested domain.', meta, data);

const trimLeadingCoefficients = (coefficients: readonly number[], epsilon: number): number[] => {
  const firstNonZero = coefficients.findIndex((coefficient) => Math.abs(coefficient) > epsilon);
  return firstNonZero === -1 ? [0] : coefficients.slice(firstNonZero);
};

export const solvePolynomialRoots = (
  coefficients: readonly number[],
  options: MathSolveOptions = {}
): MathResult<MathRoot[]> => {
  const meta = metaForOptions(options, 'polynomial.coefficients', 'analytic');
  const { epsilon } = toleranceForOptions(options);
  if (coefficients.length === 0 || coefficients.some((coefficient) => !Number.isFinite(coefficient))) {
    return failMathResult('MATH_INVALID_INPUT', 'polynomial.coefficients', 'Polynomial coefficients must be finite.', meta, {
      coefficients: [...coefficients]
    });
  }

  const normalized = trimLeadingCoefficients(coefficients, epsilon);
  const degree = normalized.length - 1;
  if (degree === 0) {
    if (Math.abs(normalized[0]) <= epsilon) {
      return failMathResult('MATH_MULTIPLE_SOLUTIONS', 'polynomial.coefficients', 'Zero polynomial has infinitely many roots.', meta);
    }
    return okMathResult([], meta, [noRealSolutionDiagnostic('polynomial.coefficients', meta)]);
  }

  if (degree > 2) {
    return failMathResult('MATH_UNSUPPORTED_OPERATION', 'polynomial.coefficients', 'Only linear and quadratic roots are supported in P0.', meta, {
      degree
    });
  }

  if (degree === 1) {
    const [a, b] = normalized;
    return okMathResult([{ value: -b / a, multiplicity: 1 }], meta);
  }

  const [a, b, c] = normalized;
  const discriminant = b * b - 4 * a * c;
  if (discriminant < -epsilon) {
    return okMathResult([], meta, [noRealSolutionDiagnostic('polynomial.coefficients', meta, { discriminant })]);
  }
  if (Math.abs(discriminant) <= epsilon) {
    return okMathResult([{ value: -b / (2 * a), multiplicity: 2 }], meta);
  }

  const root = Math.sqrt(discriminant);
  return okMathResult([
    { value: (-b - root) / (2 * a), multiplicity: 1 },
    { value: (-b + root) / (2 * a), multiplicity: 1 }
  ].sort((left, right) => left.value - right.value), meta);
};

const pushUniqueRoot = (roots: MathRoot[], value: number, epsilon: number) => {
  if (!Number.isFinite(value)) return;
  if (roots.some((root) => Math.abs(root.value - value) <= epsilon * 10)) return;
  roots.push({ value, multiplicity: 1 });
};

const bisectRoot = (
  evaluate: (x: number) => number,
  min: number,
  max: number,
  epsilon: number,
  maxIterations: number
): number | null => {
  let left = min;
  let right = max;
  let leftValue = evaluate(left);
  let rightValue = evaluate(right);
  if (!Number.isFinite(leftValue) || !Number.isFinite(rightValue)) return null;

  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    const mid = (left + right) / 2;
    const midValue = evaluate(mid);
    if (!Number.isFinite(midValue)) return null;
    if (Math.abs(midValue) <= epsilon || Math.abs(right - left) <= epsilon) return mid;
    if (Math.sign(leftValue) === Math.sign(midValue)) {
      left = mid;
      leftValue = midValue;
    } else {
      right = mid;
      rightValue = midValue;
    }
  }

  return Math.abs(leftValue) <= Math.abs(rightValue) ? left : right;
};

const minimizeAbsoluteRootCandidate = (
  evaluate: (x: number) => number,
  min: number,
  max: number,
  maxIterations: number
): { x: number; y: number } | null => {
  let left = min;
  let right = max;

  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    const leftThird = left + (right - left) / 3;
    const rightThird = right - (right - left) / 3;
    const leftValue = evaluate(leftThird);
    const rightValue = evaluate(rightThird);
    if (!Number.isFinite(leftValue) || !Number.isFinite(rightValue)) return null;

    if (Math.abs(leftValue) <= Math.abs(rightValue)) {
      right = rightThird;
    } else {
      left = leftThird;
    }
  }

  const x = (left + right) / 2;
  const y = evaluate(x);
  return Number.isFinite(y) ? { x, y } : null;
};

const findNumericRoots = (
  evaluate: (x: number) => number,
  domain: MathInterval,
  options: MathSolveOptions,
  target: string
): MathResult<MathRoot[]> => {
  const validation = validateInterval(domain, options, 'domain');
  const meta = metaForOptions(options, target, 'numeric', domain);
  if (!validation.ok) return validation;

  const tolerance = toleranceForOptions(options);
  const samples = Math.max(2, Math.floor(options.samples ?? DEFAULT_ROOT_SAMPLES));
  const maxIterations = tolerance.maxIterations ?? DEFAULT_MAX_ITERATIONS;
  const roots: MathRoot[] = [];

  let twoPreviousX = domain.min;
  let twoPreviousY = evaluate(twoPreviousX);
  let previousX = twoPreviousX;
  let previousY = twoPreviousY;
  if (Number.isFinite(previousY) && Math.abs(previousY) <= tolerance.epsilon) {
    pushUniqueRoot(roots, previousX, tolerance.epsilon);
  }

  for (let index = 1; index <= samples; index += 1) {
    const x = domain.min + ((domain.max - domain.min) * index) / samples;
    const y = evaluate(x);
    if (!Number.isFinite(y)) {
      twoPreviousX = previousX;
      twoPreviousY = previousY;
      previousX = x;
      previousY = y;
      continue;
    }

    if (Math.abs(y) <= tolerance.epsilon) {
      pushUniqueRoot(roots, x, tolerance.epsilon);
    } else if (Number.isFinite(previousY) && Math.sign(previousY) !== Math.sign(y)) {
      const root = bisectRoot(evaluate, previousX, x, tolerance.epsilon, maxIterations);
      if (root === null) {
        return failMathResult('MATH_NUMERIC_METHOD_FAILED', target, 'Numeric root search encountered a non-finite interval.', meta);
      }
      pushUniqueRoot(roots, root, tolerance.epsilon);
    }

    if (
      Number.isFinite(twoPreviousY) &&
      Number.isFinite(previousY) &&
      Math.abs(previousY) > tolerance.epsilon &&
      Math.sign(twoPreviousY) === Math.sign(previousY) &&
      Math.sign(previousY) === Math.sign(y) &&
      Math.abs(previousY) <= Math.abs(twoPreviousY) &&
      Math.abs(previousY) <= Math.abs(y)
    ) {
      const candidate = minimizeAbsoluteRootCandidate(evaluate, twoPreviousX, x, maxIterations);
      if (candidate === null) {
        return failMathResult('MATH_NUMERIC_METHOD_FAILED', target, 'Numeric root search encountered a non-finite local minimum.', meta);
      }
      if (Math.abs(candidate.y) <= tolerance.epsilon) {
        pushUniqueRoot(roots, candidate.x, tolerance.epsilon);
      }
    }

    twoPreviousX = previousX;
    twoPreviousY = previousY;
    previousX = x;
    previousY = y;
  }

  roots.sort((left, right) => left.value - right.value);
  if (roots.length === 0) return okMathResult([], meta, [noRealSolutionDiagnostic(target, meta, { domain })]);
  return okMathResult(roots, meta);
};

export const findFunctionRoots = (
  descriptor: GraphFunctionDescriptor,
  domain: MathInterval,
  options: MathSolveOptions = {}
): MathResult<MathRoot[]> => findNumericRoots((x) => {
  const result = evaluateFunction(descriptor, x, {}, { ...options, domain });
  return result.ok ? result.value : NaN;
}, domain, options, 'function.root');

export const findRoots1D = findFunctionRoots;

export const intersectFunctions = (
  left: GraphFunctionDescriptor,
  right: GraphFunctionDescriptor,
  domain: MathInterval,
  options: MathSolveOptions = {}
): MathResult<MathPoint2D[]> => {
  const meta = metaForOptions(options, 'function.intersection', 'numeric', domain);
  const roots = findNumericRoots((x) => {
    const leftValue = evaluateFunction(left, x, {}, { ...options, domain });
    const rightValue = evaluateFunction(right, x, {}, { ...options, domain });
    return leftValue.ok && rightValue.ok ? leftValue.value - rightValue.value : NaN;
  }, domain, options, 'function.intersection');

  if (!roots.ok) return roots;

  const points: MathPoint2D[] = [];
  for (const root of roots.value) {
    const y = evaluateFunction(left, root.value, {}, { ...options, domain });
    if (!y.ok) return failMathResult('MATH_NUMERIC_METHOD_FAILED', 'function.intersection', 'Intersection y-value could not be evaluated.', meta);
    points.push({ x: root.value, y: y.value });
  }

  return okMathResult(points, meta, roots.diagnostics);
};

export const evaluateFunctionDescriptorResult = evaluateFunction;
