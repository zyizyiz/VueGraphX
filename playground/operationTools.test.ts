import { describe, expect, it } from 'vitest';
import { resolveOperationCommandOrigin } from './operationTools';

describe('resolveOperationCommandOrigin', () => {
  it('places clicked operation tools at the current viewport center', () => {
    expect(resolveOperationCommandOrigin(
      null,
      { width: 600, height: 420 },
      { left: -10, right: 10, top: 7, bottom: -7 }
    )).toEqual({ x: 0, y: 0 });
  });

  it('maps dragged operation tools to the drop point in world coordinates', () => {
    expect(resolveOperationCommandOrigin(
      { x: 450, y: 105 },
      { width: 600, height: 420 },
      { left: -10, right: 10, top: 7, bottom: -7 }
    )).toEqual({ x: 5, y: 3.5 });
  });
});
