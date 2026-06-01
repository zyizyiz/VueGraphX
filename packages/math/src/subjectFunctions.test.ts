import { describe, expect, it } from 'vitest';
import {
  clipSubjectDomainToWindow,
  computeSubjectFunctionProperties,
  containsSubjectDomainValue,
  createCircleEquationSubjectFunction,
  createCompositeSubjectFunction,
  createLineEquationSubjectFunction,
  createLinearSubjectFunction,
  createPiecewiseSubjectFunction,
  createQuadraticSubjectFunction,
  createSubjectDomain,
  createSubjectDomainInterval,
  createSubjectDynamicPoint,
  createSubjectFunctionAnnotations,
  evaluateSubjectFunctionDescriptor,
  formatSubjectFunctionExpression,
  resetSubjectDynamicPoint,
  reverseSubjectDynamicPoint,
  sampleSubjectEquationDescriptor,
  sampleSubjectFunctionDescriptor,
  tickSubjectDynamicPoint,
  updateSubjectFunctionParameters
} from './index';

describe('subject function families and domains', () => {
  it('normalizes open, closed, and infinite domain intervals', () => {
    const domain = createSubjectDomain([
      createSubjectDomainInterval(null, 0, { maxClosed: false }),
      createSubjectDomainInterval(1, 3, { minClosed: true, maxClosed: false })
    ]);

    expect(containsSubjectDomainValue(domain, -1000)).toBe(true);
    expect(containsSubjectDomainValue(domain, 0)).toBe(false);
    expect(containsSubjectDomainValue(domain, 1)).toBe(true);
    expect(containsSubjectDomainValue(domain, 3)).toBe(false);
    expect(clipSubjectDomainToWindow(domain, [-2, 2]).intervals).toEqual([
      { min: -2, max: 0, minClosed: true, maxClosed: false, label: undefined },
      { min: 1, max: 2, minClosed: true, maxClosed: true, label: undefined }
    ]);
  });

  it('creates linear and quadratic descriptors with computed properties', () => {
    const linear = createLinearSubjectFunction({ id: 'line', a: 2, b: -4, domain: [-5, 5] });
    expect(evaluateSubjectFunctionDescriptor(linear, 3)).toBe(2);
    expect(computeSubjectFunctionProperties(linear)).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'slope', value: 2 }),
      expect.objectContaining({ id: 'x-intercept', value: { x: 2, y: 0 } })
    ]));

    const quadratic = createQuadraticSubjectFunction({ id: 'quad', a: 1, b: -2, c: -3, domain: [-5, 5] });
    expect(evaluateSubjectFunctionDescriptor(quadratic, 3)).toBe(0);
    expect(computeSubjectFunctionProperties(quadratic)).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'vertex', value: { x: 1, y: -4 } }),
      expect.objectContaining({ id: 'axis', value: 'x = 1' }),
      expect.objectContaining({ id: 'discriminant', value: 16 }),
      expect.objectContaining({ id: 'y-intercept', value: { x: 0, y: -3 } })
    ]));
  });

  it('evaluates piecewise and composite functions as separate reusable descriptors', () => {
    const piecewise = createPiecewiseSubjectFunction([
      { id: 'left', expression: '-x', domain: [ -2, 0 ] },
      { id: 'right', expression: 'x^2', domain: [0, 2] }
    ], { id: 'piecewise-demo' });

    expect(evaluateSubjectFunctionDescriptor(piecewise, -2)).toBe(2);
    expect(evaluateSubjectFunctionDescriptor(piecewise, 1.5)).toBeCloseTo(2.25);
    expect(sampleSubjectFunctionDescriptor(piecewise, { min: -2, max: 2, steps: 16 })).toHaveLength(2);

    const inner = createQuadraticSubjectFunction({ id: 'inner', a: 1, b: 0, c: 0, domain: [-3, 3] });
    const outer = createLinearSubjectFunction({ id: 'outer', a: 2, b: 1, domain: [0, 10] });
    const composite = createCompositeSubjectFunction(outer, inner, { id: 'outer-inner' });
    expect(evaluateSubjectFunctionDescriptor(composite, 2)).toBe(9);
  });

  it('models line and circle equations with properties and samples', () => {
    const line = createLineEquationSubjectFunction({ id: 'line-eq', slope: -2, intercept: 4, domain: [-4, 4] });
    expect(line.expression).toBe('y = -2 * x + 4');
    expect(computeSubjectFunctionProperties(line)).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'slope', value: -2 }),
      expect.objectContaining({ id: 'x-intercept', value: { x: 2, y: 0 } })
    ]));

    const circle = createCircleEquationSubjectFunction({ id: 'circle-eq', centerX: 1, centerY: -1, radius: 3 });
    expect(circle.expression).toBe('(x - 1)^2 + (y + 1)^2 = 9');
    expect(computeSubjectFunctionProperties(circle)).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'center', value: { x: 1, y: -1 } }),
      expect.objectContaining({ id: 'radius', value: 3 })
    ]));
    expect(sampleSubjectEquationDescriptor(circle)[0]).toHaveLength(145);
  });

  it('creates stable annotation descriptors and updates parameters', () => {
    const quadratic = createQuadraticSubjectFunction({ id: 'quad', a: 1, b: 0, c: 0 });
    const updated = updateSubjectFunctionParameters(quadratic, { a: 2, c: 1 });

    expect(updated.parameters).toMatchObject({ a: 2, b: 0, c: 1 });
    expect(formatSubjectFunctionExpression(updated)).toBe('2 * x^2 + 0 * x + 1');
    expect(evaluateSubjectFunctionDescriptor(updated, 2)).toBe(9);
    expect(sampleSubjectFunctionDescriptor(updated, { min: 2, max: 3, steps: 2, yMax: 30 })[0][0]).toEqual({ x: 2, y: 9 });
    expect(createSubjectFunctionAnnotations(updated).map((annotation) => annotation.id)).toEqual(expect.arrayContaining([
      'quad:expression',
      'quad:vertex',
      'quad:axis',
      'quad:discriminant'
    ]));
    expect(createSubjectFunctionAnnotations(updated)[0]).toMatchObject({
      id: 'quad:expression',
      text: '2 * x^2 + 0 * x + 1'
    });

    const line = updateSubjectFunctionParameters(createLineEquationSubjectFunction({ slope: 1, intercept: 0 }), { m: 3, b: -6 });
    expect(line.expression).toBe('y = 3 * x + -6');
    expect(evaluateSubjectFunctionDescriptor(line, 4)).toBe(6);

    const circle = updateSubjectFunctionParameters(createCircleEquationSubjectFunction({ centerX: 0, centerY: 0, radius: 1 }), {
      h: -2,
      k: 1,
      r: 2
    });
    expect(circle.expression).toBe('(x + 2)^2 + (y - 1)^2 = 4');
    expect(sampleSubjectEquationDescriptor(circle)[0][0]).toEqual({ x: 0, y: 1 });
  });

  it('evaluates, ticks, resets, and reverses dynamic point P', () => {
    const fn = createLinearSubjectFunction({ id: 'f', a: 1, b: 1, domain: [0, 10] });
    const point = createSubjectDynamicPoint(fn, { parameter: 2, speed: 2, playing: true });

    expect(point.point).toEqual({ x: 2, y: 3 });
    const ticked = tickSubjectDynamicPoint(fn, point, 1.5);
    expect(ticked).toMatchObject({ parameter: 5, point: { x: 5, y: 6 } });
    expect(reverseSubjectDynamicPoint(ticked).direction).toBe(-1);
    expect(resetSubjectDynamicPoint(fn, reverseSubjectDynamicPoint(ticked))).toMatchObject({ parameter: 10, playing: false, point: { x: 10, y: 11 } });
  });
});
