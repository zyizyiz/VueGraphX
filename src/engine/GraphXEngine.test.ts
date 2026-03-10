import { describe, expect, it, vi } from 'vitest';
import { GraphXEngine } from './GraphXEngine';

describe('GraphXEngine.projectPoint3D', () => {
  it('uses the 2D user coordinates from homogeneous 3D projection output', () => {
    const project3DTo2D = vi.fn().mockReturnValue([1, -2, 3]);
    const projectUserPoint = vi.fn().mockImplementation(([x, y]: [number, number]) => ({ x, y }));

    const fakeEngine = {
      getBoard: () => ({}) as any,
      getView3D: () => ({ project3DTo2D }) as any,
      projectUserPoint
    };

    const result = GraphXEngine.prototype.projectPoint3D.call(fakeEngine as any, [0, 0, 0]);

    expect(project3DTo2D).toHaveBeenCalledWith([0, 0, 0]);
    expect(projectUserPoint).toHaveBeenCalledWith([-2, 3]);
    expect(result).toEqual({ x: -2, y: 3 });
  });

  it('keeps compatibility with plain two-value projection outputs', () => {
    const projectUserPoint = vi.fn().mockImplementation(([x, y]: [number, number]) => ({ x, y }));

    const fakeEngine = {
      getBoard: () => ({}) as any,
      getView3D: () => ({ project3DTo2D: () => [4, 5] }) as any,
      projectUserPoint
    };

    const result = GraphXEngine.prototype.projectPoint3D.call(fakeEngine as any, [1, 2, 3]);

    expect(projectUserPoint).toHaveBeenCalledWith([4, 5]);
    expect(result).toEqual({ x: 4, y: 5 });
  });
});
