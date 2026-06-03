import { describe, expect, it } from 'vitest';
import {
  clampOperationCoordinateSystemOrigin,
  createOperationScopedCommands,
  resolveOperationCommandOrigin,
  updateOperationCoordinateSystemOrigin
} from './operationTools';

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

  it('clamps operation coordinate-system origins so the full coordinate window stays visible', () => {
    expect(clampOperationCoordinateSystemOrigin(
      { x: 10, y: -10 },
      { left: -10, right: 10, top: 10, bottom: -10 }
    )).toEqual({ x: 4, y: -4 });
    expect(clampOperationCoordinateSystemOrigin(
      { x: -10, y: 10 },
      { left: -10, right: 10, top: 10, bottom: -10 }
    )).toEqual({ x: -4, y: 4 });
  });
});

describe('updateOperationCoordinateSystemOrigin', () => {
  it('persists dragged operation coordinate-system origins across every scoped command', () => {
    const commands = createOperationScopedCommands([
      { expr: 'Function("x", -5, 5)', options: { strokeColor: '#4DA6FF' } },
      { expr: 'Equation("x^2 + y^2 = 4")', options: { strokeColor: '#FF8D1A' } }
    ], { x: 1.25, y: -2.75 }, 'coord_drag');

    const updated = updateOperationCoordinateSystemOrigin(commands, 'coord_drag', { x: 6, y: -1 });

    expect(updated).toBe(3);
    expect(commands.map((command) => (command.options?.coordinateSystem as any)?.origin)).toEqual([
      { x: 6, y: -1 },
      { x: 6, y: -1 },
      { x: 6, y: -1 }
    ]);
  });

  it('does not mutate commands scoped to another coordinate system', () => {
    const commands = [
      ...createOperationScopedCommands([{ expr: 'Function("x", -5, 5)' }], { x: 1, y: 2 }, 'coord_a'),
      ...createOperationScopedCommands([{ expr: 'Function("-x", -5, 5)' }], { x: -1, y: -2 }, 'coord_b')
    ];

    const updated = updateOperationCoordinateSystemOrigin(commands, 'coord_b', { x: 4, y: 5 });

    expect(updated).toBe(2);
    expect((commands[0].options?.coordinateSystem as any).origin).toEqual({ x: 1, y: 2 });
    expect((commands[1].options?.coordinateSystem as any).origin).toEqual({ x: 1, y: 2 });
    expect((commands[2].options?.coordinateSystem as any).origin).toEqual({ x: 4, y: 5 });
    expect((commands[3].options?.coordinateSystem as any).origin).toEqual({ x: 4, y: 5 });
  });
});
