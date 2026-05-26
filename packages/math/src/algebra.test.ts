import { describe, expect, it } from 'vitest';
import {
  createFunctionDescriptor,
  evaluateExpression,
  evaluateFunction,
  findFunctionRoots,
  intersectFunctions,
  solvePolynomialRoots
} from './index';

describe('renderer-free algebra typed results', () => {
  it('evaluates expressions with constants and scoped variables', () => {
    const result = evaluateExpression('2 * pi + offset', { offset: 1 });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.error.message);
    expect(result.value).toBeCloseTo(2 * Math.PI + 1);
    expect(result.meta.target).toBe('expression');
  });

  it('returns parse diagnostics instead of throwing for invalid expressions', () => {
    const result = evaluateExpression('2 *');

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('Expected parse failure');
    expect(result.error.code).toBe('MATH_PARSE_ERROR');
    expect(result.error.target).toBe('expression');
  });

  it('reports domain diagnostics with metadata for bounded functions', () => {
    const result = evaluateFunction(createFunctionDescriptor('x^2', [0, 1]), 2);

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('Expected out-of-domain failure');
    expect(result.error.code).toBe('MATH_DOMAIN_OUT_OF_RANGE');
    expect(result.error.domain).toEqual({ min: 0, max: 1 });
    expect(result.meta.domain).toEqual({ min: 0, max: 1 });
  });

  it('solves linear and quadratic polynomial roots with diagnostics for no real roots', () => {
    const quadratic = solvePolynomialRoots([1, -3, 2]);
    expect(quadratic.ok).toBe(true);
    if (!quadratic.ok) throw new Error(quadratic.error.message);
    expect(quadratic.value.map((root) => root.value)).toEqual([1, 2]);

    const linear = solvePolynomialRoots([2, -8]);
    expect(linear.ok).toBe(true);
    if (!linear.ok) throw new Error(linear.error.message);
    expect(linear.value).toEqual([{ value: 4, multiplicity: 1 }]);

    const none = solvePolynomialRoots([1, 0, 1]);
    expect(none.ok).toBe(true);
    if (!none.ok) throw new Error(none.error.message);
    expect(none.value).toEqual([]);
    expect(none.diagnostics[0]?.code).toBe('MATH_NO_REAL_SOLUTION');
  });

  it('finds bounded function roots and function intersections numerically', () => {
    const roots = findFunctionRoots(createFunctionDescriptor('x^2 - 4'), { min: -3, max: 3 }, { samples: 96 });
    expect(roots.ok).toBe(true);
    if (!roots.ok) throw new Error(roots.error.message);
    expect(roots.value.map((root) => root.value)).toEqual([expect.closeTo(-2), expect.closeTo(2)]);
    expect(roots.meta.domain).toEqual({ min: -3, max: 3 });

    const intersections = intersectFunctions(
      createFunctionDescriptor('x'),
      createFunctionDescriptor('2 - x'),
      { min: 0, max: 2 },
      { samples: 48 }
    );
    expect(intersections.ok).toBe(true);
    if (!intersections.ok) throw new Error(intersections.error.message);
    expect(intersections.value).toEqual([{ x: expect.closeTo(1), y: expect.closeTo(1) }]);
  });

  it('finds bounded tangent/even-multiplicity numeric roots and intersections', () => {
    const evenRoots = findFunctionRoots(
      createFunctionDescriptor('(x - 0.1)^2'),
      { min: -1, max: 1 },
      { samples: 64 }
    );
    expect(evenRoots.ok).toBe(true);
    if (!evenRoots.ok) throw new Error(evenRoots.error.message);
    expect(evenRoots.value).toHaveLength(1);
    expect(evenRoots.value[0]?.value).toBeCloseTo(0.1, 6);

    const tangentIntersection = intersectFunctions(
      createFunctionDescriptor('(x - 0.1)^2'),
      createFunctionDescriptor('0'),
      { min: -1, max: 1 },
      { samples: 64 }
    );
    expect(tangentIntersection.ok).toBe(true);
    if (!tangentIntersection.ok) throw new Error(tangentIntersection.error.message);
    expect(tangentIntersection.value).toHaveLength(1);
    expect(tangentIntersection.value[0]).toEqual({ x: expect.closeTo(0.1, 6), y: expect.closeTo(0, 6) });
  });
});
