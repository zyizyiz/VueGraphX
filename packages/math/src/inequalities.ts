import {
  failMathResult,
  normalizeMathTolerance,
  okMathResult,
  type MathResult,
  type MathResultMetaInput,
  type MathTolerance
} from './diagnostics';
import { solvePolynomialRoots } from './algebra';

export type MathInequalityOperator = '<' | '<=' | '>' | '>=';

export interface MathSolutionInterval {
  min: number;
  max: number;
  minClosed: boolean;
  maxClosed: boolean;
}

export interface MathInequalityOptions {
  tolerance?: MathTolerance;
  epsilon?: number;
}

const toleranceForOptions = (options: MathInequalityOptions = {}) => normalizeMathTolerance({
  ...options.tolerance,
  epsilon: options.epsilon ?? options.tolerance?.epsilon
});

const metaForOptions = (
  options: MathInequalityOptions = {},
  target: string,
  method = 'analytic'
): MathResultMetaInput => ({
  tolerance: toleranceForOptions(options),
  target,
  method
});

const allRealInterval = (): MathSolutionInterval => ({
  min: Number.NEGATIVE_INFINITY,
  max: Number.POSITIVE_INFINITY,
  minClosed: false,
  maxClosed: false
});

const pointInterval = (value: number): MathSolutionInterval => ({
  min: value,
  max: value,
  minClosed: true,
  maxClosed: true
});

const leftInterval = (max: number, closed: boolean): MathSolutionInterval => ({
  min: Number.NEGATIVE_INFINITY,
  max,
  minClosed: false,
  maxClosed: closed
});

const rightInterval = (min: number, closed: boolean): MathSolutionInterval => ({
  min,
  max: Number.POSITIVE_INFINITY,
  minClosed: closed,
  maxClosed: false
});

const boundedInterval = (min: number, max: number, closed: boolean): MathSolutionInterval => ({
  min,
  max,
  minClosed: closed,
  maxClosed: closed
});

const evaluateInequality = (value: number, operator: MathInequalityOperator, epsilon: number): boolean => {
  switch (operator) {
    case '<': return value < -epsilon;
    case '<=': return value <= epsilon;
    case '>': return value > epsilon;
    case '>=': return value >= -epsilon;
  }
};

const includesEquality = (operator: MathInequalityOperator): boolean => operator === '<=' || operator === '>=';

const validateOperator = (
  operator: MathInequalityOperator,
  options: MathInequalityOptions,
  target = 'inequality.operator'
): MathResult<MathInequalityOperator> => {
  const meta = metaForOptions(options, target);
  return operator === '<' || operator === '<=' || operator === '>' || operator === '>='
    ? okMathResult(operator, meta)
    : failMathResult('MATH_INVALID_INPUT', target, 'Inequality operator must be one of <, <=, >, >=.', meta, { operator });
};

const validateCoefficients = (
  coefficients: readonly number[],
  expectedLength: number,
  options: MathInequalityOptions,
  target: string
): MathResult<number[]> => {
  const meta = metaForOptions(options, target);
  if (coefficients.length !== expectedLength || coefficients.some((coefficient) => !Number.isFinite(coefficient))) {
    return failMathResult('MATH_INVALID_INPUT', target, `Expected ${expectedLength} finite coefficients.`, meta, { coefficients: [...coefficients] });
  }
  return okMathResult([...coefficients], meta);
};

export const solveLinearInequality = (
  coefficients: readonly [number, number],
  operator: MathInequalityOperator,
  options: MathInequalityOptions = {}
): MathResult<MathSolutionInterval[]> => {
  const meta = metaForOptions(options, 'inequality.linear');
  const validOperator = validateOperator(operator, options);
  if (!validOperator.ok) return validOperator;
  const validCoefficients = validateCoefficients(coefficients, 2, options, 'inequality.linear.coefficients');
  if (!validCoefficients.ok) return validCoefficients;
  const [a, b] = validCoefficients.value;
  const epsilon = toleranceForOptions(options).epsilon;

  if (Math.abs(a) <= epsilon) {
    return okMathResult(evaluateInequality(b, operator, epsilon) ? [allRealInterval()] : [], meta);
  }

  const root = -b / a;
  const closed = includesEquality(operator);
  const positiveSlopeTakesRight = (a > 0 && (operator === '>' || operator === '>='))
    || (a < 0 && (operator === '<' || operator === '<='));
  return okMathResult([positiveSlopeTakesRight ? rightInterval(root, closed) : leftInterval(root, closed)], meta);
};

export const solveQuadraticInequality = (
  coefficients: readonly [number, number, number],
  operator: MathInequalityOperator,
  options: MathInequalityOptions = {}
): MathResult<MathSolutionInterval[]> => {
  const meta = metaForOptions(options, 'inequality.quadratic');
  const validOperator = validateOperator(operator, options);
  if (!validOperator.ok) return validOperator;
  const validCoefficients = validateCoefficients(coefficients, 3, options, 'inequality.quadratic.coefficients');
  if (!validCoefficients.ok) return validCoefficients;
  const [a, b, c] = validCoefficients.value;
  const epsilon = toleranceForOptions(options).epsilon;

  if (Math.abs(a) <= epsilon) {
    return solveLinearInequality([b, c], operator, options);
  }

  const roots = solvePolynomialRoots([a, b, c], { tolerance: toleranceForOptions(options) });
  if (!roots.ok) return roots;
  const closed = includesEquality(operator);

  if (roots.value.length === 0) {
    return okMathResult(evaluateInequality(a, operator, epsilon) ? [allRealInterval()] : [], meta, roots.diagnostics);
  }

  if (roots.value.length === 1) {
    const root = roots.value[0].value;
    const positiveAway = a > 0;
    if (positiveAway) {
      if (operator === '>') return okMathResult([leftInterval(root, false), rightInterval(root, false)], meta);
      if (operator === '>=') return okMathResult([allRealInterval()], meta);
      if (operator === '<=') return okMathResult([pointInterval(root)], meta);
      return okMathResult([], meta);
    }
    if (operator === '<') return okMathResult([leftInterval(root, false), rightInterval(root, false)], meta);
    if (operator === '<=') return okMathResult([allRealInterval()], meta);
    if (operator === '>=') return okMathResult([pointInterval(root)], meta);
    return okMathResult([], meta);
  }

  const [left, right] = roots.value.map((root) => root.value).sort((one, two) => one - two);
  const insideIsNegative = a > 0;
  const wantsNegative = operator === '<' || operator === '<=';
  const inside = boundedInterval(left, right, closed);
  const outside = [leftInterval(left, closed), rightInterval(right, closed)];
  return okMathResult(wantsNegative === insideIsNegative ? [inside] : outside, meta);
};
