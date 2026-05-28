import {
  failMathResult,
  normalizeMathTolerance,
  okMathResult,
  type MathResult,
  type MathResultMetaInput,
  type MathTolerance
} from './diagnostics';

export interface MathFiniteSet<T = unknown> {
  kind: 'finite-set';
  elements: T[];
}

export type MathOrderedPair<T = unknown, U = unknown> = readonly [T, U];

export interface MathSetOptions {
  tolerance?: MathTolerance;
  epsilon?: number;
}

const toleranceForOptions = (options: MathSetOptions = {}) => normalizeMathTolerance({
  ...options.tolerance,
  epsilon: options.epsilon ?? options.tolerance?.epsilon
});

const metaForOptions = (
  options: MathSetOptions = {},
  target: string,
  method = 'finite-set'
): MathResultMetaInput => ({
  tolerance: toleranceForOptions(options),
  target,
  method
});

const cloneArrayInput = (values: unknown): unknown => Array.isArray(values) ? [...values] : values;

const uniqueElements = <T>(values: readonly T[]): T[] => [...new Set(values)];

const validateSetInput = <T>(
  values: readonly T[] | MathFiniteSet<T> | unknown,
  options: MathSetOptions,
  target: string
): MathResult<T[]> => {
  const meta = metaForOptions(options, target);
  if (typeof values === 'object' && values !== null && (values as MathFiniteSet<T>).kind === 'finite-set') {
    const descriptor = values as MathFiniteSet<T>;
    return Array.isArray(descriptor.elements)
      ? okMathResult(uniqueElements(descriptor.elements), meta)
      : failMathResult('MATH_INVALID_INPUT', target, 'Finite set elements must be an array.', meta, { values: descriptor });
  }
  return Array.isArray(values)
    ? okMathResult(uniqueElements(values as readonly T[]), meta)
    : failMathResult('MATH_INVALID_INPUT', target, 'Finite set input must be an array or finite-set descriptor.', meta, {
      values: cloneArrayInput(values)
    });
};

export const createFiniteSet = <T>(
  values: readonly T[],
  options: MathSetOptions = {}
): MathResult<MathFiniteSet<T>> => {
  const meta = metaForOptions(options, 'set.create');
  const valid = validateSetInput<T>(values, options, 'set.elements');
  if (!valid.ok) return valid;
  return okMathResult({ kind: 'finite-set', elements: valid.value }, meta);
};

export const setUnion = <T>(
  left: readonly T[] | MathFiniteSet<T>,
  right: readonly T[] | MathFiniteSet<T>,
  options: MathSetOptions = {}
): MathResult<MathFiniteSet<T>> => {
  const meta = metaForOptions(options, 'set.union');
  const leftSet = validateSetInput<T>(left, options, 'set.left');
  if (!leftSet.ok) return leftSet;
  const rightSet = validateSetInput<T>(right, options, 'set.right');
  if (!rightSet.ok) return rightSet;
  return okMathResult({ kind: 'finite-set', elements: uniqueElements([...leftSet.value, ...rightSet.value]) }, meta);
};

export const setIntersection = <T>(
  left: readonly T[] | MathFiniteSet<T>,
  right: readonly T[] | MathFiniteSet<T>,
  options: MathSetOptions = {}
): MathResult<MathFiniteSet<T>> => {
  const meta = metaForOptions(options, 'set.intersection');
  const leftSet = validateSetInput<T>(left, options, 'set.left');
  if (!leftSet.ok) return leftSet;
  const rightSet = validateSetInput<T>(right, options, 'set.right');
  if (!rightSet.ok) return rightSet;
  const rightLookup = new Set(rightSet.value);
  return okMathResult({ kind: 'finite-set', elements: leftSet.value.filter((value) => rightLookup.has(value)) }, meta);
};

export const setDifference = <T>(
  left: readonly T[] | MathFiniteSet<T>,
  right: readonly T[] | MathFiniteSet<T>,
  options: MathSetOptions = {}
): MathResult<MathFiniteSet<T>> => {
  const meta = metaForOptions(options, 'set.difference');
  const leftSet = validateSetInput<T>(left, options, 'set.left');
  if (!leftSet.ok) return leftSet;
  const rightSet = validateSetInput<T>(right, options, 'set.right');
  if (!rightSet.ok) return rightSet;
  const rightLookup = new Set(rightSet.value);
  return okMathResult({ kind: 'finite-set', elements: leftSet.value.filter((value) => !rightLookup.has(value)) }, meta);
};

export const setSymmetricDifference = <T>(
  left: readonly T[] | MathFiniteSet<T>,
  right: readonly T[] | MathFiniteSet<T>,
  options: MathSetOptions = {}
): MathResult<MathFiniteSet<T>> => {
  const meta = metaForOptions(options, 'set.symmetricDifference');
  const leftOnly = setDifference(left, right, options);
  if (!leftOnly.ok) return leftOnly;
  const rightOnly = setDifference(right, left, options);
  if (!rightOnly.ok) return rightOnly;
  return okMathResult({ kind: 'finite-set', elements: uniqueElements([...leftOnly.value.elements, ...rightOnly.value.elements]) }, meta);
};

export const isSubset = <T>(
  possibleSubset: readonly T[] | MathFiniteSet<T>,
  possibleSuperset: readonly T[] | MathFiniteSet<T>,
  options: MathSetOptions = {}
): MathResult<boolean> => {
  const meta = metaForOptions(options, 'set.subset');
  const subset = validateSetInput<T>(possibleSubset, options, 'set.subset.left');
  if (!subset.ok) return subset;
  const superset = validateSetInput<T>(possibleSuperset, options, 'set.subset.right');
  if (!superset.ok) return superset;
  const lookup = new Set(superset.value);
  return okMathResult(subset.value.every((value) => lookup.has(value)), meta);
};

export const areSetsEqual = <T>(
  left: readonly T[] | MathFiniteSet<T>,
  right: readonly T[] | MathFiniteSet<T>,
  options: MathSetOptions = {}
): MathResult<boolean> => {
  const meta = metaForOptions(options, 'set.equal');
  const leftSubset = isSubset(left, right, options);
  if (!leftSubset.ok) return leftSubset;
  const rightSubset = isSubset(right, left, options);
  if (!rightSubset.ok) return rightSubset;
  return okMathResult(leftSubset.value && rightSubset.value, meta);
};

export const cartesianProduct = <T, U>(
  left: readonly T[] | MathFiniteSet<T>,
  right: readonly U[] | MathFiniteSet<U>,
  options: MathSetOptions = {}
): MathResult<Array<MathOrderedPair<T, U>>> => {
  const meta = metaForOptions(options, 'set.cartesianProduct');
  const leftSet = validateSetInput<T>(left, options, 'set.left');
  if (!leftSet.ok) return leftSet;
  const rightSet = validateSetInput<U>(right, options, 'set.right');
  if (!rightSet.ok) return rightSet;
  const pairs: Array<MathOrderedPair<T, U>> = [];
  for (const leftValue of leftSet.value) {
    for (const rightValue of rightSet.value) pairs.push([leftValue, rightValue] as const);
  }
  return okMathResult(pairs, meta);
};
