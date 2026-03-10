import type { GraphHiddenLineProjectedPoint, GraphHiddenLineScreenPoint } from './projector';

export interface GraphHiddenLineTriangle2D {
  a: GraphHiddenLineProjectedPoint;
  b: GraphHiddenLineProjectedPoint;
  c: GraphHiddenLineProjectedPoint;
  bbox: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };
}

export const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

export const lerp = (from: number, to: number, t: number): number => from + (to - from) * t;

export const lerpScreenPoint = (from: GraphHiddenLineScreenPoint, to: GraphHiddenLineScreenPoint, t: number): GraphHiddenLineScreenPoint => ({
  x: lerp(from.x, to.x, t),
  y: lerp(from.y, to.y, t)
});

export const computeTriangleArea2D = (
  a: GraphHiddenLineScreenPoint,
  b: GraphHiddenLineScreenPoint,
  c: GraphHiddenLineScreenPoint
): number => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);

export const createTriangle2DBBox = (triangle: Pick<GraphHiddenLineTriangle2D, 'a' | 'b' | 'c'>) => ({
  minX: Math.min(triangle.a.screen.x, triangle.b.screen.x, triangle.c.screen.x),
  minY: Math.min(triangle.a.screen.y, triangle.b.screen.y, triangle.c.screen.y),
  maxX: Math.max(triangle.a.screen.x, triangle.b.screen.x, triangle.c.screen.x),
  maxY: Math.max(triangle.a.screen.y, triangle.b.screen.y, triangle.c.screen.y)
});

export const pointInTriangleBarycentric = (
  point: GraphHiddenLineScreenPoint,
  triangle: GraphHiddenLineTriangle2D,
  epsilon = 1e-6
): { inside: boolean; barycentric: [number, number, number] } => {
  const { a, b, c } = triangle;
  const denominator = ((b.screen.y - c.screen.y) * (a.screen.x - c.screen.x) + (c.screen.x - b.screen.x) * (a.screen.y - c.screen.y));
  if (Math.abs(denominator) < epsilon) {
    return { inside: false, barycentric: [0, 0, 0] };
  }

  const w1 = ((b.screen.y - c.screen.y) * (point.x - c.screen.x) + (c.screen.x - b.screen.x) * (point.y - c.screen.y)) / denominator;
  const w2 = ((c.screen.y - a.screen.y) * (point.x - c.screen.x) + (a.screen.x - c.screen.x) * (point.y - c.screen.y)) / denominator;
  const w3 = 1 - w1 - w2;
  const inside = w1 > epsilon && w2 > epsilon && w3 > epsilon;

  return {
    inside,
    barycentric: [w1, w2, w3]
  };
};

export const interpolateTriangleDepth = (triangle: GraphHiddenLineTriangle2D, barycentric: [number, number, number]): number => {
  const [w1, w2, w3] = barycentric;
  return triangle.a.depth * w1 + triangle.b.depth * w2 + triangle.c.depth * w3;
};
