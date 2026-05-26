import { describe, expect, it } from 'vitest';
import {
  DEFAULT_MATH_TOLERANCE,
  failMathResult,
  okMathResult
} from './index';

describe('math diagnostics result contract', () => {
  it('creates successful typed results with tolerance metadata', () => {
    const result = okMathResult(7, { target: 'expression' });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.error.message);
    expect(result.value).toBe(7);
    expect(result.diagnostics).toEqual([]);
    expect(result.meta).toMatchObject({
      target: 'expression',
      tolerance: { epsilon: DEFAULT_MATH_TOLERANCE.epsilon }
    });
  });

  it('creates failed typed results with stable diagnostic codes and targets', () => {
    const result = failMathResult(
      'MATH_INVALID_INPUT',
      'circle.radius',
      'Circle radius must be finite and positive.',
      { tolerance: { epsilon: 1e-6 } },
      { radius: -1 }
    );

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('Expected failure result');
    expect(result.error).toMatchObject({
      code: 'MATH_INVALID_INPUT',
      severity: 'error',
      target: 'circle.radius',
      tolerance: { epsilon: 1e-6 },
      data: { radius: -1 }
    });
    expect(result.diagnostics).toEqual([result.error]);
    expect(result.meta.tolerance.epsilon).toBe(1e-6);
  });
});
