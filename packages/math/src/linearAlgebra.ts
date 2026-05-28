import {
  failMathResult,
  normalizeMathTolerance,
  okMathResult,
  type MathResult,
  type MathResultMetaInput,
  type MathTolerance
} from './diagnostics';

export type MathMatrix2x2 = readonly [readonly [number, number], readonly [number, number]];
export type MathMatrix3x3 = readonly [readonly [number, number, number], readonly [number, number, number], readonly [number, number, number]];
export type MathVector2Tuple = readonly [number, number];

export interface MathLinearAlgebraOptions {
  tolerance?: MathTolerance;
  epsilon?: number;
}

const toleranceForOptions = (options: MathLinearAlgebraOptions = {}) => normalizeMathTolerance({
  ...options.tolerance,
  epsilon: options.epsilon ?? options.tolerance?.epsilon
});

const metaForOptions = (options: MathLinearAlgebraOptions = {}, target: string): MathResultMetaInput => ({
  tolerance: toleranceForOptions(options),
  target,
  method: 'analytic'
});

const finiteValues = (values: readonly number[]): boolean => values.every(Number.isFinite);

export const determinant2x2 = (matrix: MathMatrix2x2): number => matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0];

export const determinant3x3 = (matrix: MathMatrix3x3): number => (
  matrix[0][0] * (matrix[1][1] * matrix[2][2] - matrix[1][2] * matrix[2][1])
  - matrix[0][1] * (matrix[1][0] * matrix[2][2] - matrix[1][2] * matrix[2][0])
  + matrix[0][2] * (matrix[1][0] * matrix[2][1] - matrix[1][1] * matrix[2][0])
);

export const multiplyMatrix2x2Vector = (matrix: MathMatrix2x2, vector: MathVector2Tuple): MathVector2Tuple => [
  matrix[0][0] * vector[0] + matrix[0][1] * vector[1],
  matrix[1][0] * vector[0] + matrix[1][1] * vector[1]
];

export const solveLinearSystem2x2 = (
  matrix: MathMatrix2x2,
  constants: MathVector2Tuple,
  options: MathLinearAlgebraOptions = {}
): MathResult<MathVector2Tuple> => {
  const meta = metaForOptions(options, 'linear-system.2x2');
  const values = [matrix[0][0], matrix[0][1], matrix[1][0], matrix[1][1], constants[0], constants[1]];
  if (!finiteValues(values)) {
    return failMathResult('MATH_INVALID_INPUT', 'linear-system.2x2', 'Linear system coefficients must be finite.', meta, { matrix, constants });
  }
  const determinant = determinant2x2(matrix);
  if (Math.abs(determinant) <= toleranceForOptions(options).epsilon) {
    return failMathResult('MATH_MULTIPLE_SOLUTIONS', 'linear-system.2x2', 'Linear system is singular or underdetermined.', meta, { matrix, constants, determinant });
  }
  return okMathResult([
    (constants[0] * matrix[1][1] - matrix[0][1] * constants[1]) / determinant,
    (matrix[0][0] * constants[1] - constants[0] * matrix[1][0]) / determinant
  ], meta);
};
