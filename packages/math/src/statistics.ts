import {
  failMathResult,
  normalizeMathTolerance,
  okMathResult,
  type MathResult,
  type MathResultMetaInput,
  type MathTolerance
} from './diagnostics';

export interface MathStatisticsOptions {
  tolerance?: MathTolerance;
  epsilon?: number;
  sample?: boolean;
}

export interface MathQuartiles {
  q1: number;
  q2: number;
  q3: number;
  min: number;
  max: number;
}

const toleranceForOptions = (options: MathStatisticsOptions = {}) => normalizeMathTolerance({
  ...options.tolerance,
  epsilon: options.epsilon ?? options.tolerance?.epsilon
});

const metaForOptions = (
  options: MathStatisticsOptions = {},
  target: string,
  method = 'analytic'
): MathResultMetaInput => ({
  tolerance: toleranceForOptions(options),
  target,
  method
});

const cloneInputArray = (values: unknown): unknown => Array.isArray(values) ? [...values] : values;

const validateValues = (
  values: readonly number[] | unknown,
  options: MathStatisticsOptions,
  target = 'statistics.values'
): MathResult<number[]> => {
  const meta = metaForOptions(options, target);
  if (!Array.isArray(values) || values.length === 0) {
    return failMathResult('MATH_INVALID_INPUT', target, 'At least one numeric value is required.', meta, { values: cloneInputArray(values) });
  }
  if (values.some((value) => !Number.isFinite(value))) {
    return failMathResult('MATH_INVALID_INPUT', target, 'All values must be finite numbers.', meta, { values: [...values] });
  }
  return okMathResult([...values], meta);
};

const sortedValues = (values: readonly number[]): number[] => [...values].sort((left, right) => left - right);

export const mean = (
  values: readonly number[],
  options: MathStatisticsOptions = {}
): MathResult<number> => {
  const meta = metaForOptions(options, 'statistics.mean');
  const valid = validateValues(values, options);
  if (!valid.ok) return valid;
  return okMathResult(valid.value.reduce((sum, value) => sum + value, 0) / valid.value.length, meta);
};

export const weightedMean = (
  values: readonly number[],
  weights: readonly number[],
  options: MathStatisticsOptions = {}
): MathResult<number> => {
  const meta = metaForOptions(options, 'statistics.weightedMean');
  const validValues = validateValues(values, options);
  if (!validValues.ok) return validValues;
  if (!Array.isArray(weights) || weights.length !== values.length || weights.length === 0 || weights.some((weight) => !Number.isFinite(weight) || weight < 0)) {
    return failMathResult('MATH_INVALID_INPUT', 'statistics.weights', 'Weights must be finite non-negative numbers matching values.', meta, {
      weights: cloneInputArray(weights)
    });
  }
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  if (totalWeight <= toleranceForOptions(options).epsilon) {
    return failMathResult('MATH_DEGENERATE_GEOMETRY', 'statistics.weights', 'Total weight must be positive.', meta, { weights: [...weights] });
  }
  return okMathResult(values.reduce((sum, value, index) => sum + value * weights[index], 0) / totalWeight, meta);
};

export const median = (
  values: readonly number[],
  options: MathStatisticsOptions = {}
): MathResult<number> => {
  const meta = metaForOptions(options, 'statistics.median');
  const valid = validateValues(values, options);
  if (!valid.ok) return valid;
  const sorted = sortedValues(valid.value);
  const middle = Math.floor(sorted.length / 2);
  return okMathResult(
    sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2,
    meta
  );
};

export const modeValues = (
  values: readonly number[],
  options: MathStatisticsOptions = {}
): MathResult<number[]> => {
  const meta = metaForOptions(options, 'statistics.mode');
  const valid = validateValues(values, options);
  if (!valid.ok) return valid;
  const counts = new Map<number, number>();
  for (const value of valid.value) counts.set(value, (counts.get(value) ?? 0) + 1);
  const maxCount = Math.max(...counts.values());
  return okMathResult([...counts.entries()]
    .filter(([, count]) => count === maxCount)
    .map(([value]) => value)
    .sort((left, right) => left - right), meta);
};

export const variance = (
  values: readonly number[],
  options: MathStatisticsOptions = {}
): MathResult<number> => {
  const meta = metaForOptions(options, 'statistics.variance');
  const valid = validateValues(values, options);
  if (!valid.ok) return valid;
  if (options.sample && valid.value.length < 2) {
    return failMathResult('MATH_INVALID_INPUT', 'statistics.values', 'Sample variance requires at least two values.', meta, { values: valid.value });
  }
  const average = valid.value.reduce((sum, value) => sum + value, 0) / valid.value.length;
  const divisor = options.sample ? valid.value.length - 1 : valid.value.length;
  return okMathResult(valid.value.reduce((sum, value) => sum + (value - average) ** 2, 0) / divisor, meta);
};

export const standardDeviation = (
  values: readonly number[],
  options: MathStatisticsOptions = {}
): MathResult<number> => {
  const meta = metaForOptions(options, 'statistics.standardDeviation');
  const result = variance(values, options);
  return result.ok ? okMathResult(Math.sqrt(result.value), meta, result.diagnostics) : result;
};

export const quartiles = (
  values: readonly number[],
  options: MathStatisticsOptions = {}
): MathResult<MathQuartiles> => {
  const meta = metaForOptions(options, 'statistics.quartiles');
  const valid = validateValues(values, options);
  if (!valid.ok) return valid;
  const sorted = sortedValues(valid.value);
  const medianOf = (items: readonly number[]): number => {
    const middle = Math.floor(items.length / 2);
    return items.length % 2 === 1 ? items[middle] : (items[middle - 1] + items[middle]) / 2;
  };
  const middle = Math.floor(sorted.length / 2);
  const lower = sorted.slice(0, middle);
  const upper = sorted.length % 2 === 0 ? sorted.slice(middle) : sorted.slice(middle + 1);
  return okMathResult({
    min: sorted[0],
    q1: lower.length > 0 ? medianOf(lower) : sorted[0],
    q2: medianOf(sorted),
    q3: upper.length > 0 ? medianOf(upper) : sorted[sorted.length - 1],
    max: sorted[sorted.length - 1]
  }, meta);
};

const validateNonNegativeInteger = (
  value: number,
  target: string,
  options: MathStatisticsOptions
): MathResult<number> => {
  const meta = metaForOptions(options, target);
  return Number.isInteger(value) && value >= 0
    ? okMathResult(value, meta)
    : failMathResult('MATH_INVALID_INPUT', target, 'Value must be a non-negative integer.', meta, { value });
};

const validateProbability = (
  value: number,
  target: string,
  options: MathStatisticsOptions
): MathResult<number> => {
  const meta = metaForOptions(options, target);
  return Number.isFinite(value) && value >= 0 && value <= 1
    ? okMathResult(value, meta)
    : failMathResult('MATH_DOMAIN_OUT_OF_RANGE', target, 'Probability must be in [0, 1].', meta, { value });
};

export const factorial = (
  value: number,
  options: MathStatisticsOptions = {}
): MathResult<number> => {
  const meta = metaForOptions(options, 'combinatorics.factorial');
  const n = validateNonNegativeInteger(value, 'combinatorics.n', options);
  if (!n.ok) return n;
  if (n.value > 170) {
    return failMathResult('MATH_UNSUPPORTED_OPERATION', 'combinatorics.n', 'Factorial is too large for finite JavaScript number output.', meta, { value });
  }
  let result = 1;
  for (let current = 2; current <= n.value; current += 1) result *= current;
  return okMathResult(result, meta);
};

export const permutationCount = (
  total: number,
  chosen: number,
  options: MathStatisticsOptions = {}
): MathResult<number> => {
  const meta = metaForOptions(options, 'combinatorics.permutation');
  const n = validateNonNegativeInteger(total, 'combinatorics.n', options);
  if (!n.ok) return n;
  const r = validateNonNegativeInteger(chosen, 'combinatorics.r', options);
  if (!r.ok) return r;
  if (r.value > n.value) return okMathResult(0, meta);
  let result = 1;
  for (let index = 0; index < r.value; index += 1) result *= n.value - index;
  return Number.isFinite(result)
    ? okMathResult(result, meta)
    : failMathResult('MATH_UNSUPPORTED_OPERATION', 'combinatorics.permutation', 'Permutation count is too large for finite output.', meta, { total, chosen });
};

export const combinationCount = (
  total: number,
  chosen: number,
  options: MathStatisticsOptions = {}
): MathResult<number> => {
  const meta = metaForOptions(options, 'combinatorics.combination');
  const n = validateNonNegativeInteger(total, 'combinatorics.n', options);
  if (!n.ok) return n;
  const r = validateNonNegativeInteger(chosen, 'combinatorics.r', options);
  if (!r.ok) return r;
  if (r.value > n.value) return okMathResult(0, meta);
  const k = Math.min(r.value, n.value - r.value);
  let result = 1;
  for (let index = 1; index <= k; index += 1) {
    result = (result * (n.value - k + index)) / index;
  }
  return Number.isFinite(result)
    ? okMathResult(result, meta)
    : failMathResult('MATH_UNSUPPORTED_OPERATION', 'combinatorics.combination', 'Combination count is too large for finite output.', meta, { total, chosen });
};

export const binomialProbability = (
  trials: number,
  successes: number,
  probability: number,
  options: MathStatisticsOptions = {}
): MathResult<number> => {
  const meta = metaForOptions(options, 'probability.binomial');
  const n = validateNonNegativeInteger(trials, 'probability.trials', options);
  if (!n.ok) return n;
  const k = validateNonNegativeInteger(successes, 'probability.successes', options);
  if (!k.ok) return k;
  const p = validateProbability(probability, 'probability.p', options);
  if (!p.ok) return p;
  if (k.value > n.value) return okMathResult(0, meta);
  const combinations = combinationCount(n.value, k.value, options);
  if (!combinations.ok) return combinations;
  return okMathResult(combinations.value * p.value ** k.value * (1 - p.value) ** (n.value - k.value), meta);
};

export const unionProbability = (
  probabilityA: number,
  probabilityB: number,
  intersectionProbability: number,
  options: MathStatisticsOptions = {}
): MathResult<number> => {
  const meta = metaForOptions(options, 'probability.union');
  const a = validateProbability(probabilityA, 'probability.a', options);
  if (!a.ok) return a;
  const b = validateProbability(probabilityB, 'probability.b', options);
  if (!b.ok) return b;
  const intersection = validateProbability(intersectionProbability, 'probability.intersection', options);
  if (!intersection.ok) return intersection;
  if (intersection.value > Math.min(a.value, b.value) + toleranceForOptions(options).epsilon) {
    return failMathResult('MATH_INVALID_INPUT', 'probability.intersection', 'Intersection probability cannot exceed either event probability.', meta, {
      probabilityA,
      probabilityB,
      intersectionProbability
    });
  }
  const result = a.value + b.value - intersection.value;
  return result >= -toleranceForOptions(options).epsilon && result <= 1 + toleranceForOptions(options).epsilon
    ? okMathResult(Math.min(1, Math.max(0, result)), meta)
    : failMathResult('MATH_INVALID_INPUT', 'probability.union', 'Union probability must remain in [0, 1].', meta, {
      probabilityA,
      probabilityB,
      intersectionProbability,
      result
    });
};

export const conditionalProbability = (
  intersectionProbability: number,
  conditionProbability: number,
  options: MathStatisticsOptions = {}
): MathResult<number> => {
  const meta = metaForOptions(options, 'probability.conditional');
  const intersection = validateProbability(intersectionProbability, 'probability.intersection', options);
  if (!intersection.ok) return intersection;
  const condition = validateProbability(conditionProbability, 'probability.condition', options);
  if (!condition.ok) return condition;
  if (condition.value <= toleranceForOptions(options).epsilon) {
    return failMathResult('MATH_DEGENERATE_GEOMETRY', 'probability.condition', 'Condition probability must be positive.', meta, { conditionProbability });
  }
  if (intersection.value > condition.value + toleranceForOptions(options).epsilon) {
    return failMathResult('MATH_INVALID_INPUT', 'probability.intersection', 'Intersection probability cannot exceed the condition probability.', meta, {
      intersectionProbability,
      conditionProbability
    });
  }
  return okMathResult(intersection.value / condition.value, meta);
};
