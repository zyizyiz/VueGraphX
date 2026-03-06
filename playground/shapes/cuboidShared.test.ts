import { describe, expect, it } from 'vitest';
import {
  getCuboidFoldLikeFaceVertices2D,
  getCuboidFoldLikeTransformedFaceVertices2D,
  getCuboidFaceVertices2D,
  getCuboidFaceVertices3D,
  shouldShowCuboidFace
} from './cuboidShared';

describe('cuboid shared geometry', () => {
  it('keeps the front face on the front plane when fully unfolded in 3D', () => {
    const vertices = getCuboidFaceVertices3D(2, 1, 0, 'front');

    expect(vertices).toEqual([
      [-1, 1, 1],
      [1, 1, 1],
      [1, -1, 1],
      [-1, -1, 1]
    ]);
  });

  it('uses the shared net layout for the 2D front face', () => {
    const vertices = getCuboidFaceVertices2D(2, 1, 'front');

    expect(vertices).toEqual([
      [-1, 1],
      [1, 1],
      [1, -1],
      [-1, -1]
    ]);
  });

  it('keeps all six faces available throughout the fold state', () => {
    expect(shouldShowCuboidFace('left', 0)).toBe(true);
    expect(shouldShowCuboidFace('left', 0.2)).toBe(true);
    expect(shouldShowCuboidFace('bottom', 0)).toBe(true);
    expect(shouldShowCuboidFace('front', 0)).toBe(true);
  });

  it('uses hinge-like folded positions for the 2D top face before unfolding', () => {
    const vertices = getCuboidFoldLikeFaceVertices2D(2, 0, 'top');

    expect(vertices[0]).toEqual([-1, 1]);
    expect(vertices[1]).toEqual([1, 1]);
    expect(vertices[2]?.[0]).toBeGreaterThan(1);
    expect(vertices[2]?.[1]).toBeGreaterThan(1);
  });

  it('keeps folded left, bottom and back edges fully overlapped at progress 0', () => {
    const left = getCuboidFoldLikeFaceVertices2D(2, 0, 'left');
    const bottom = getCuboidFoldLikeFaceVertices2D(2, 0, 'bottom');
    const back = getCuboidFoldLikeFaceVertices2D(2, 0, 'back');

    expect(left[0]).toEqual(left[1]);
    expect(bottom[0]).toEqual(bottom[3]);
    expect(bottom[1]).toEqual(bottom[2]);
    expect(back[1]).toEqual(back[0]);
    expect(back[2]).toEqual(back[3]);
  });

  it('applies rotate and explode transforms on top of fold-like outlines', () => {
    const base = getCuboidFoldLikeTransformedFaceVertices2D({ edgeSize: 2, unfoldProgress: 0.5, faceId: 'top' });
    const rotated = getCuboidFoldLikeTransformedFaceVertices2D({ edgeSize: 2, unfoldProgress: 0.5, rotateProgress: 0.25, faceId: 'top' });
    const exploded = getCuboidFoldLikeTransformedFaceVertices2D({ edgeSize: 2, unfoldProgress: 0.5, explodeProgress: 1, faceId: 'top' });

    expect(rotated[0]).not.toEqual(base[0]);
    expect(exploded[0]).not.toEqual(base[0]);
  });

  it('keeps the default fold-like outline unchanged when rotate progress is zero', () => {
    const base = getCuboidFoldLikeFaceVertices2D(2, 0.5, 'top');
    const transformed = getCuboidFoldLikeTransformedFaceVertices2D({
      edgeSize: 2,
      unfoldProgress: 0.5,
      rotateProgress: 0,
      faceId: 'top'
    });

    expect(transformed).toEqual(base);
  });

  it('keeps shared edges connected while rotating', () => {
    const front = getCuboidFoldLikeTransformedFaceVertices2D({ edgeSize: 2, unfoldProgress: 0.5, rotateProgress: 0.25, faceId: 'front' });
    const right = getCuboidFoldLikeTransformedFaceVertices2D({ edgeSize: 2, unfoldProgress: 0.5, rotateProgress: 0.25, faceId: 'right' });
    const back = getCuboidFoldLikeTransformedFaceVertices2D({ edgeSize: 2, unfoldProgress: 0.5, rotateProgress: 0.25, faceId: 'back' });

    expect(right[0]).toEqual(front[1]);
    expect(right[3]).toEqual(front[2]);
    expect(back[0]).toEqual(right[1]);
    expect(back[3]).toEqual(right[2]);
  });
});
