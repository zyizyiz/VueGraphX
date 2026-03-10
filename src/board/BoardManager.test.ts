import { describe, expect, it } from 'vitest';
import { buildAdaptiveView3DRect } from './BoardManager';

describe('buildAdaptiveView3DRect', () => {
  it('fills the current board bbox and scales x/y world spans with aspect ratio', () => {
    const rect = buildAdaptiveView3DRect(
      [-12, 8, 12, -8],
      [[-8, -8], [16, 16], [[-5, 5], [-5, 5], [-5, 5]]]
    );

    expect(rect[0]).toEqual([-12, -8]);
    expect(rect[1]).toEqual([24, 16]);
    expect(rect[2][0]).toEqual([-7.5, 7.5]);
    expect(rect[2][1]).toEqual([-5, 5]);
    expect(rect[2][2]).toEqual([-5, 5]);
  });

  it('scales y span when the board becomes taller', () => {
    const rect = buildAdaptiveView3DRect(
      [-8, 12, 8, -12],
      [[-8, -8], [16, 16], [[-5, 5], [-5, 5], [-5, 5]]]
    );

    expect(rect[0]).toEqual([-8, -12]);
    expect(rect[1]).toEqual([16, 24]);
    expect(rect[2][0]).toEqual([-5, 5]);
    expect(rect[2][1]).toEqual([-7.5, 7.5]);
  });
});
