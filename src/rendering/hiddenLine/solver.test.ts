import { describe, expect, it, vi } from 'vitest';
import { solveHiddenLineScene } from './solver';
import type { GraphHiddenLineResolvedSceneSource } from './tessellation';

vi.mock('./projector', () => ({
  projectWorldPoint: (_board: unknown, _view3d: unknown, point: { x: number; y: number; z: number }) => ({
    world: point,
    user: { x: point.x, y: point.y },
    screen: { x: point.x, y: point.y },
    depth: point.z
  })
}));

const baseOptions = {
  enabled: true,
  profile: 'balanced' as const,
  strategy: 'overlay2d' as const,
  precision: 'balanced' as const,
  debug: false,
  visibleStyle: {},
  hiddenStyle: {},
  sampling: {
    curveSegments: 32,
    surfaceStepsU: 16,
    surfaceStepsV: 16,
    adaptive: true,
    maxSubdivisions: 2
  }
};

describe('solveHiddenLineScene', () => {
  it('lets sampleVisibility force a segment visible', () => {
    const sources: GraphHiddenLineResolvedSceneSource[] = [
      {
        sourceId: 'tri',
        ownerId: 'tri',
        drawOrder: 2,
        edgeCount: 0,
        faceCount: 1,
        triangles: [
          {
            sourceId: 'tri',
            ownerId: 'tri',
            drawOrder: 2,
            world: [
              { x: 0, y: 0, z: -1 },
              { x: 10, y: 0, z: -1 },
              { x: 0, y: 10, z: -1 }
            ]
          }
        ],
        polylines: []
      },
      {
        sourceId: 'edge',
        ownerId: 'edge',
        drawOrder: 1,
        edgeCount: 1,
        faceCount: 0,
        triangles: [],
        polylines: [
          {
            sourceId: 'edge',
            ownerId: 'edge',
            drawOrder: 1,
            worldPoints: [
              { x: 1, y: 1, z: 0 },
              { x: 2, y: 2, z: 0 }
            ],
            sampleVisibility: () => 'visible'
          }
        ]
      }
    ];

    const result = solveHiddenLineScene({}, {}, sources, baseOptions);

    expect(result.renderedPaths).toHaveLength(1);
    expect(result.renderedPaths[0]).toEqual(expect.objectContaining({
      hidden: false,
      mode: 'draw'
    }));
  });

  it('uses later draw order to hide equal-depth edges on ties', () => {
    const sources: GraphHiddenLineResolvedSceneSource[] = [
      {
        sourceId: 'tri',
        ownerId: 'tri',
        drawOrder: 2,
        edgeCount: 0,
        faceCount: 1,
        triangles: [
          {
            sourceId: 'tri',
            ownerId: 'tri',
            drawOrder: 2,
            world: [
              { x: 0, y: 0, z: 0 },
              { x: 10, y: 0, z: 0 },
              { x: 0, y: 10, z: 0 }
            ]
          }
        ],
        polylines: []
      },
      {
        sourceId: 'edge',
        ownerId: 'edge',
        drawOrder: 1,
        edgeCount: 1,
        faceCount: 0,
        triangles: [],
        polylines: [
          {
            sourceId: 'edge',
            ownerId: 'edge',
            drawOrder: 1,
            worldPoints: [
              { x: 1, y: 1, z: 0 },
              { x: 2, y: 2, z: 0 }
            ]
          }
        ]
      }
    ];

    const result = solveHiddenLineScene({}, {}, sources, baseOptions);

    expect(result.renderedPaths.some((path) => path.hidden)).toBe(true);
    expect(result.renderedPaths[0]).toEqual(expect.objectContaining({
      hidden: true
    }));
  });
});
