import { describe, expect, it } from 'vitest';
import {
  arithmeticSequenceSum,
  arithmeticSequenceTerm,
  binomialProbability,
  areSetsEqual,
  calculateSolidMetrics,
  cartesianProduct,
  combinationCount,
  complex,
  complexFromPolar,
  conditionalProbability,
  createFiniteSet,
  createArithmeticSequence,
  createGeometricSequence,
  createSolidDescriptor,
  definiteIntegral,
  degreesToRadians,
  determinant3x3,
  divideComplex,
  dot3D,
  geometricSequenceSum,
  lawOfCosinesAngle,
  lawOfCosinesSide,
  mean,
  median,
  modeValues,
  numericDerivative,
  permutationCount,
  quartiles,
  secantSlope,
  setDifference,
  setIntersection,
  setUnion,
  solveLinearInequality,
  solveLinearSystem2x2,
  solveQuadraticInequality,
  standardDeviation,
  tangentLineAtFunction,
  triangleAreaHeron,
  unionProbability,
  vector3D,
  variance,
  weightedMean
} from './index';

describe('curriculum math kernels', () => {
  it('solves sequence term and sum formulas without renderer state', () => {
    const arithmetic = createArithmeticSequence(3, 2);
    expect(arithmetic.ok).toBe(true);
    if (!arithmetic.ok) throw new Error(arithmetic.error.message);

    const term = arithmeticSequenceTerm(arithmetic.value, 5);
    expect(term.ok).toBe(true);
    if (!term.ok) throw new Error(term.error.message);
    expect(term.value).toBe(11);

    const sum = arithmeticSequenceSum(arithmetic.value, 5);
    expect(sum.ok).toBe(true);
    if (!sum.ok) throw new Error(sum.error.message);
    expect(sum.value).toBe(35);

    const geometric = createGeometricSequence(2, 3);
    expect(geometric.ok).toBe(true);
    if (!geometric.ok) throw new Error(geometric.error.message);
    const geometricSum = geometricSequenceSum(geometric.value, 4);
    expect(geometricSum.ok).toBe(true);
    if (!geometricSum.ok) throw new Error(geometricSum.error.message);
    expect(geometricSum.value).toBe(80);
  });

  it('computes trigonometry and triangle measurements', () => {
    expect(degreesToRadians(180)).toBeCloseTo(Math.PI);

    const side = lawOfCosinesSide(3, 4, Math.PI / 2);
    expect(side.ok).toBe(true);
    if (!side.ok) throw new Error(side.error.message);
    expect(side.value).toBeCloseTo(5);

    const angle = lawOfCosinesAngle(5, 3, 4);
    expect(angle.ok).toBe(true);
    if (!angle.ok) throw new Error(angle.error.message);
    expect(angle.value).toBeCloseTo(Math.PI / 2);

    const area = triangleAreaHeron(3, 4, 5);
    expect(area.ok).toBe(true);
    if (!area.ok) throw new Error(area.error.message);
    expect(area.value).toBeCloseTo(6);
  });

  it('solves linear and quadratic inequality intervals', () => {
    const linear = solveLinearInequality([2, -4], '>=');
    expect(linear.ok).toBe(true);
    if (!linear.ok) throw new Error(linear.error.message);
    expect(linear.value).toEqual([{ min: 2, max: Number.POSITIVE_INFINITY, minClosed: true, maxClosed: false }]);

    const quadratic = solveQuadraticInequality([1, 0, -4], '<=');
    expect(quadratic.ok).toBe(true);
    if (!quadratic.ok) throw new Error(quadratic.error.message);
    expect(quadratic.value).toEqual([{ min: -2, max: 2, minClosed: true, maxClosed: true }]);
  });

  it('computes descriptive statistics and probability kernels', () => {
    const values = [1, 2, 2, 5];
    const average = mean(values);
    expect(average.ok).toBe(true);
    if (!average.ok) throw new Error(average.error.message);
    expect(average.value).toBe(2.5);

    const weighted = weightedMean([80, 100], [1, 3]);
    expect(weighted.ok).toBe(true);
    if (!weighted.ok) throw new Error(weighted.error.message);
    expect(weighted.value).toBe(95);

    const middle = median(values);
    expect(middle.ok).toBe(true);
    if (!middle.ok) throw new Error(middle.error.message);
    expect(middle.value).toBe(2);

    const mode = modeValues(values);
    expect(mode.ok).toBe(true);
    if (!mode.ok) throw new Error(mode.error.message);
    expect(mode.value).toEqual([2]);

    const populationVariance = variance(values);
    expect(populationVariance.ok).toBe(true);
    if (!populationVariance.ok) throw new Error(populationVariance.error.message);
    expect(populationVariance.value).toBeCloseTo(2.25);

    const deviation = standardDeviation(values);
    expect(deviation.ok).toBe(true);
    if (!deviation.ok) throw new Error(deviation.error.message);
    expect(deviation.value).toBeCloseTo(1.5);

    const spread = quartiles(values);
    expect(spread.ok).toBe(true);
    if (!spread.ok) throw new Error(spread.error.message);
    expect(spread.value).toEqual({ min: 1, q1: 1.5, q2: 2, q3: 3.5, max: 5 });

    const combinations = combinationCount(5, 2);
    expect(combinations.ok).toBe(true);
    if (!combinations.ok) throw new Error(combinations.error.message);
    expect(combinations.value).toBe(10);

    const permutations = permutationCount(5, 2);
    expect(permutations.ok).toBe(true);
    if (!permutations.ok) throw new Error(permutations.error.message);
    expect(permutations.value).toBe(20);

    const probability = binomialProbability(3, 2, 0.5);
    expect(probability.ok).toBe(true);
    if (!probability.ok) throw new Error(probability.error.message);
    expect(probability.value).toBeCloseTo(0.375);

    const union = unionProbability(0.4, 0.5, 0.2);
    expect(union.ok).toBe(true);
    if (!union.ok) throw new Error(union.error.message);
    expect(union.value).toBeCloseTo(0.7);

    const conditional = conditionalProbability(0.2, 0.5);
    expect(conditional.ok).toBe(true);
    if (!conditional.ok) throw new Error(conditional.error.message);
    expect(conditional.value).toBeCloseTo(0.4);

    const invalidUnion = unionProbability(0.2, 0.3, 0.4);
    expect(invalidUnion.ok).toBe(false);
    if (invalidUnion.ok) throw new Error('Expected impossible intersection probability to fail');
    expect(invalidUnion.error.code).toBe('MATH_INVALID_INPUT');

    const invalidValues = mean([] as number[]);
    expect(invalidValues.ok).toBe(false);
    if (invalidValues.ok) throw new Error('Expected empty statistics input to fail');
    expect(invalidValues.error.target).toBe('statistics.values');
  });

  it('computes common solid metrics from descriptors', () => {
    const cube = calculateSolidMetrics(createSolidDescriptor('cube', { size: 3 }));
    expect(cube.ok).toBe(true);
    if (!cube.ok) throw new Error(cube.error.message);
    expect(cube.value).toEqual({ volume: 27, surfaceArea: 54, baseArea: 9 });

    const cylinder = calculateSolidMetrics(createSolidDescriptor('cylinder', { radius: 2, height: 5 }));
    expect(cylinder.ok).toBe(true);
    if (!cylinder.ok) throw new Error(cylinder.error.message);
    expect(cylinder.value.volume).toBeCloseTo(20 * Math.PI);
    expect(cylinder.value.surfaceArea).toBeCloseTo(28 * Math.PI);

    const invalidCone = calculateSolidMetrics(createSolidDescriptor('cone', { radius: 1, height: 2, slantHeight: -3 }));
    expect(invalidCone.ok).toBe(false);
    if (invalidCone.ok) throw new Error('Expected negative slant height to fail');
    expect(invalidCone.error.code).toBe('MATH_DEGENERATE_GEOMETRY');
  });

  it('supports vector, complex, and small linear-algebra kernels used by common math topics', () => {
    expect(dot3D(vector3D(1, 2, 3), vector3D(4, 5, 6))).toBe(32);

    const quotient = divideComplex(complex(1, 2), complex(3, -4));
    expect(quotient.ok).toBe(true);
    if (!quotient.ok) throw new Error(quotient.error.message);
    expect(quotient.value.re).toBeCloseTo(-0.2);
    expect(quotient.value.im).toBeCloseTo(0.4);

    const polar = complexFromPolar(2, Math.PI / 2);
    expect(polar.ok).toBe(true);
    if (!polar.ok) throw new Error(polar.error.message);
    expect(polar.value.re).toBeCloseTo(0);
    expect(polar.value.im).toBeCloseTo(2);

    const smallDenominator = divideComplex(complex(1, 0), complex(1e-6, 0));
    expect(smallDenominator.ok).toBe(true);
    if (!smallDenominator.ok) throw new Error(smallDenominator.error.message);
    expect(smallDenominator.value.re).toBeCloseTo(1_000_000);

    expect(determinant3x3([[1, 2, 3], [0, 1, 4], [5, 6, 0]])).toBe(1);

    const solution = solveLinearSystem2x2([[2, 1], [1, -1]], [5, 1]);
    expect(solution.ok).toBe(true);
    if (!solution.ok) throw new Error(solution.error.message);
    expect(solution.value[0]).toBeCloseTo(2);
    expect(solution.value[1]).toBeCloseTo(1);
  });

  it('supports calculus and finite-set kernels for common math topics', () => {
    const descriptor = { expression: 'x^2', variable: 'x' };

    const derivative = numericDerivative(descriptor, 3);
    expect(derivative.ok).toBe(true);
    if (!derivative.ok) throw new Error(derivative.error.message);
    expect(derivative.value).toBeCloseTo(6);

    const secant = secantSlope(descriptor, 1, 3);
    expect(secant.ok).toBe(true);
    if (!secant.ok) throw new Error(secant.error.message);
    expect(secant.value).toBeCloseTo(4);

    const tangent = tangentLineAtFunction(descriptor, 2);
    expect(tangent.ok).toBe(true);
    if (!tangent.ok) throw new Error(tangent.error.message);
    expect(tangent.value.point).toEqual({ x: 2, y: 4 });
    expect(tangent.value.direction.y).toBeCloseTo(4);

    const integral = definiteIntegral(descriptor, { min: 0, max: 3 }, {}, { subdivisions: 512 });
    expect(integral.ok).toBe(true);
    if (!integral.ok) throw new Error(integral.error.message);
    expect(integral.value).toBeCloseTo(9, 3);

    const set = createFiniteSet([1, 1, 2, 3]);
    expect(set.ok).toBe(true);
    if (!set.ok) throw new Error(set.error.message);
    expect(set.value.elements).toEqual([1, 2, 3]);

    const union = setUnion(set.value, [3, 4]);
    expect(union.ok).toBe(true);
    if (!union.ok) throw new Error(union.error.message);
    expect(union.value.elements).toEqual([1, 2, 3, 4]);

    const intersection = setIntersection([1, 2, 3], [2, 3, 4]);
    expect(intersection.ok).toBe(true);
    if (!intersection.ok) throw new Error(intersection.error.message);
    expect(intersection.value.elements).toEqual([2, 3]);

    const difference = setDifference([1, 2, 3], [2]);
    expect(difference.ok).toBe(true);
    if (!difference.ok) throw new Error(difference.error.message);
    expect(difference.value.elements).toEqual([1, 3]);

    const equality = areSetsEqual([3, 2, 1], set.value);
    expect(equality.ok).toBe(true);
    if (!equality.ok) throw new Error(equality.error.message);
    expect(equality.value).toBe(true);

    const product = cartesianProduct(['x', 'y'], [1, 2]);
    expect(product.ok).toBe(true);
    if (!product.ok) throw new Error(product.error.message);
    expect(product.value).toEqual([['x', 1], ['x', 2], ['y', 1], ['y', 2]]);
  });
});
