import { describe, expect, it } from 'vitest';
import { getBoardOptionsForPlaygroundMode } from './mode';

describe('getBoardOptionsForPlaygroundMode', () => {
  it('enables gesture zoom by default for the 2d playground board', () => {
    expect(getBoardOptionsForPlaygroundMode('2d')).toEqual(expect.objectContaining({
      axis: true,
      showNavigation: true,
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
});
