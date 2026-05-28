import {
  failMathResult,
  normalizeMathTolerance,
  okMathResult,
  type MathResult,
  type MathResultMetaInput,
  type MathTolerance
} from './diagnostics';

export type MathSequenceKind = 'arithmetic' | 'geometric';

export interface MathArithmeticSequenceDescriptor {
  kind: 'arithmetic';
  first: number;
  difference: number;
}

export interface MathGeometricSequenceDescriptor {
  kind: 'geometric';
  first: number;
  ratio: number;
}

export type MathSequenceDescriptor = MathArithmeticSequenceDescriptor | MathGeometricSequenceDescriptor;

export interface MathSequenceOptions {
  tolerance?: MathTolerance;
  epsilon?: number;
}

const toleranceForOptions = (options: MathSequenceOptions = {}) => normalizeMathTolerance({
  ...options.tolerance,
  epsilon: options.epsilon ?? options.tolerance?.epsilon
});

const metaForOptions = (
  options: MathSequenceOptions = {},
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
  options: MathSequenceOptions
): MathResult<number> => {
  const meta = metaForOptions(options, target);
  return Number.isFinite(value)
    ? okMathResult(value, meta)
    : failMathResult('MATH_INVALID_INPUT', target, 'Sequence parameter must be finite.', meta, { value });
};

const validatePositiveInteger = (
  value: number,
  target: string,
  options: MathSequenceOptions
): MathResult<number> => {
  const meta = metaForOptions(options, target);
  return Number.isInteger(value) && value > 0
    ? okMathResult(value, meta)
    : failMathResult('MATH_INVALID_INPUT', target, 'Sequence index/count must be a positive integer.', meta, { value });
};

const validateArithmeticDescriptor = (
  descriptor: MathArithmeticSequenceDescriptor,
  options: MathSequenceOptions
): MathResult<MathArithmeticSequenceDescriptor> => {
  const first = validateFinite(descriptor.first, 'sequence.first', options);
  if (!first.ok) return first;
  const difference = validateFinite(descriptor.difference, 'sequence.difference', options);
  if (!difference.ok) return difference;
  return okMathResult({ ...descriptor }, metaForOptions(options, 'sequence.arithmetic'));
};

const validateGeometricDescriptor = (
  descriptor: MathGeometricSequenceDescriptor,
  options: MathSequenceOptions
): MathResult<MathGeometricSequenceDescriptor> => {
  const first = validateFinite(descriptor.first, 'sequence.first', options);
  if (!first.ok) return first;
  const ratio = validateFinite(descriptor.ratio, 'sequence.ratio', options);
  if (!ratio.ok) return ratio;
  return okMathResult({ ...descriptor }, metaForOptions(options, 'sequence.geometric'));
};

export const createArithmeticSequence = (
  first: number,
  difference: number,
  options: MathSequenceOptions = {}
): MathResult<MathArithmeticSequenceDescriptor> => validateArithmeticDescriptor({ kind: 'arithmetic', first, difference }, options);

export const createGeometricSequence = (
  first: number,
  ratio: number,
  options: MathSequenceOptions = {}
): MathResult<MathGeometricSequenceDescriptor> => validateGeometricDescriptor({ kind: 'geometric', first, ratio }, options);

export const arithmeticSequenceTerm = (
  descriptor: MathArithmeticSequenceDescriptor,
  index: number,
  options: MathSequenceOptions = {}
): MathResult<number> => {
  const meta = metaForOptions(options, 'sequence.term', 'arithmetic');
  const valid = validateArithmeticDescriptor(descriptor, options);
  if (!valid.ok) return valid;
  const n = validatePositiveInteger(index, 'sequence.index', options);
  if (!n.ok) return n;
  return okMathResult(valid.value.first + (n.value - 1) * valid.value.difference, meta);
};

export const arithmeticSequenceSum = (
  descriptor: MathArithmeticSequenceDescriptor,
  count: number,
  options: MathSequenceOptions = {}
): MathResult<number> => {
  const meta = metaForOptions(options, 'sequence.sum', 'arithmetic');
  const valid = validateArithmeticDescriptor(descriptor, options);
  if (!valid.ok) return valid;
  const n = validatePositiveInteger(count, 'sequence.count', options);
  if (!n.ok) return n;
  return okMathResult((n.value / 2) * (2 * valid.value.first + (n.value - 1) * valid.value.difference), meta);
};

export const geometricSequenceTerm = (
  descriptor: MathGeometricSequenceDescriptor,
  index: number,
  options: MathSequenceOptions = {}
): MathResult<number> => {
  const meta = metaForOptions(options, 'sequence.term', 'geometric');
  const valid = validateGeometricDescriptor(descriptor, options);
  if (!valid.ok) return valid;
  const n = validatePositiveInteger(index, 'sequence.index', options);
  if (!n.ok) return n;
  return okMathResult(valid.value.first * valid.value.ratio ** (n.value - 1), meta);
};

export const geometricSequenceSum = (
  descriptor: MathGeometricSequenceDescriptor,
  count: number,
  options: MathSequenceOptions = {}
): MathResult<number> => {
  const meta = metaForOptions(options, 'sequence.sum', 'geometric');
  const valid = validateGeometricDescriptor(descriptor, options);
  if (!valid.ok) return valid;
  const n = validatePositiveInteger(count, 'sequence.count', options);
  if (!n.ok) return n;
  const { first, ratio } = valid.value;
  if (Math.abs(ratio - 1) <= toleranceForOptions(options).epsilon) return okMathResult(first * n.value, meta);
  return okMathResult((first * (1 - ratio ** n.value)) / (1 - ratio), meta);
};

export const generateSequenceTerms = (
  descriptor: MathSequenceDescriptor,
  count: number,
  options: MathSequenceOptions = {}
): MathResult<number[]> => {
  const meta = metaForOptions(options, 'sequence.terms', descriptor.kind);
  const n = validatePositiveInteger(count, 'sequence.count', options);
  if (!n.ok) return n;
  const terms: number[] = [];
  for (let index = 1; index <= n.value; index += 1) {
    const term = descriptor.kind === 'arithmetic'
      ? arithmeticSequenceTerm(descriptor, index, options)
      : geometricSequenceTerm(descriptor, index, options);
    if (!term.ok) return term;
    terms.push(term.value);
  }
  return okMathResult(terms, meta);
};
