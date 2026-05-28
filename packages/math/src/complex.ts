import {
  failMathResult,
  normalizeMathTolerance,
  okMathResult,
  type MathResult,
  type MathResultMetaInput,
  type MathTolerance
} from './diagnostics';

export interface MathComplex {
  re: number;
  im: number;
}

export interface MathComplexOptions {
  tolerance?: MathTolerance;
  epsilon?: number;
}

const toleranceForOptions = (options: MathComplexOptions = {}) => normalizeMathTolerance({
  ...options.tolerance,
  epsilon: options.epsilon ?? options.tolerance?.epsilon
});

const metaForOptions = (options: MathComplexOptions = {}, target: string): MathResultMetaInput => ({
  tolerance: toleranceForOptions(options),
  target,
  method: 'analytic'
});

export const complex = (re: number, im = 0): MathComplex => ({ re, im });

export const isFiniteComplex = (value: MathComplex): boolean => Number.isFinite(value.re) && Number.isFinite(value.im);

export const complexFromPolar = (radius: number, angleRadians: number, options: MathComplexOptions = {}): MathResult<MathComplex> => {
  const meta = metaForOptions(options, 'complex.polar');
  if (!Number.isFinite(radius) || !Number.isFinite(angleRadians)) {
    return failMathResult('MATH_INVALID_INPUT', 'complex.polar', 'Polar complex inputs must be finite.', meta, { radius, angleRadians });
  }
  if (radius < 0) {
    return failMathResult('MATH_DOMAIN_OUT_OF_RANGE', 'complex.radius', 'Polar radius must be non-negative.', meta, { radius });
  }
  return okMathResult({ re: radius * Math.cos(angleRadians), im: radius * Math.sin(angleRadians) }, meta);
};

export const addComplex = (left: MathComplex, right: MathComplex): MathComplex => ({ re: left.re + right.re, im: left.im + right.im });

export const subtractComplex = (left: MathComplex, right: MathComplex): MathComplex => ({ re: left.re - right.re, im: left.im - right.im });

export const multiplyComplex = (left: MathComplex, right: MathComplex): MathComplex => ({
  re: left.re * right.re - left.im * right.im,
  im: left.re * right.im + left.im * right.re
});

export const conjugateComplex = (value: MathComplex): MathComplex => ({ re: value.re, im: -value.im });

export const modulusComplex = (value: MathComplex): number => Math.hypot(value.re, value.im);

export const argumentComplex = (value: MathComplex): number => Math.atan2(value.im, value.re);

export const divideComplex = (
  left: MathComplex,
  right: MathComplex,
  options: MathComplexOptions = {}
): MathResult<MathComplex> => {
  const meta = metaForOptions(options, 'complex.divide');
  if (!isFiniteComplex(left) || !isFiniteComplex(right)) {
    return failMathResult('MATH_INVALID_INPUT', 'complex.divide', 'Complex division inputs must be finite.', meta, { left, right });
  }
  const denominatorMagnitude = modulusComplex(right);
  if (denominatorMagnitude <= toleranceForOptions(options).epsilon) {
    return failMathResult('MATH_DEGENERATE_GEOMETRY', 'complex.divide', 'Cannot divide by zero complex value.', meta, { right });
  }
  const denominator = denominatorMagnitude ** 2;
  return okMathResult({
    re: (left.re * right.re + left.im * right.im) / denominator,
    im: (left.im * right.re - left.re * right.im) / denominator
  }, meta);
};
