import { describe, expect, it } from 'vitest';
import { getBoardOptionsForPlaygroundMode, getEngineModeForPlayground } from './mode';

describe('getBoardOptionsForPlaygroundMode', () => {
  it('enables gesture zoom by default for the 2d playground board', () => {
    expect(getBoardOptionsForPlaygroundMode('2d')).toEqual(expect.objectContaining({
      axis: true,
      showNavigation: true,
      grid: true,
      pan: {
        enabled: true,
        needShift: false,
        needTwoFingers: true
      },
      zoom: {
        enabled: true,
        wheel: true,
        needShift: false,
        pinch: true
      }
    }));
  });

  it('routes operation mode through the geometry engine with neutral board chrome', () => {
    expect(getEngineModeForPlayground('operation')).toBe('geometry');
    expect(getBoardOptionsForPlaygroundMode('operation')).toEqual({
      axis: false,
      showNavigation: false,
      grid: true
    });
  });

});
