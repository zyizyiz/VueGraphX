import { describe, expect, it } from 'vitest';
import {
  angleBetweenLines2D,
  circleFromCenterRadius,
  circleFromThreePointsResult,
  conicFromCoefficients,
  distancePointLine2D,
  intersectLineConic2DResult,
  intersectLines2DResult,
  lineFromPoints,
  lineFromPointsResult,
  normalLineToCircleAtPoint2D,
  point2D,
  projectPointToLine2D,
  tangentLineToCircleAtPoint2D
} from './index';

describe('renderer-free analytic geometry typed results', () => {
  it('returns typed diagnostics for degenerate geometry', () => {
    const line = lineFromPointsResult(point2D(1, 1), point2D(1, 1));
    expect(line.ok).toBe(false);
    if (line.ok) throw new Error('Expected degenerate line');
    expect(line.error.code).toBe('MATH_DEGENERATE_GEOMETRY');
    expect(line.error.target).toBe('line.direction');

    const circle = circleFromCenterRadius(point2D(0, 0), 0);
    expect(circle.ok).toBe(false);
    if (circle.ok) throw new Error('Expected degenerate circle');
    expect(circle.error.target).toBe('circle.radius');
  });

  it('computes distance, angle, and projection for lines', () => {
    const horizontal = lineFromPoints(point2D(0, 0), point2D(2, 0));
    const vertical = lineFromPoints(point2D(0, 0), point2D(0, 3));

    const distance = distancePointLine2D(point2D(1, 4), horizontal);
    expect(distance.ok).toBe(true);
    if (!distance.ok) throw new Error(distance.error.message);
    expect(distance.value).toBeCloseTo(4);

    const angle = angleBetweenLines2D(horizontal, vertical);
    expect(angle.ok).toBe(true);
    if (!angle.ok) throw new Error(angle.error.message);
    expect(angle.value).toBeCloseTo(Math.PI / 2);

    const projection = projectPointToLine2D(point2D(1, 4), horizontal);
    expect(projection.ok).toBe(true);
    if (!projection.ok) throw new Error(projection.error.message);
    expect(projection.value).toEqual({ x: 1, y: 0 });
  });

  it('builds circles and tangent/normal lines with tolerance checks', () => {
    const circle = circleFromThreePointsResult(point2D(1, 0), point2D(0, 1), point2D(-1, 0));
    expect(circle.ok).toBe(true);
    if (!circle.ok) throw new Error(circle.error.message);
    expect(circle.value.center.x).toBeCloseTo(0);
    expect(circle.value.center.y).toBeCloseTo(0);

    const tangent = tangentLineToCircleAtPoint2D(circle.value, point2D(1, 0));
    expect(tangent.ok).toBe(true);
    if (!tangent.ok) throw new Error(tangent.error.message);
    expect(tangent.value.direction).toEqual({ x: -0, y: 1 });

    const normal = normalLineToCircleAtPoint2D(circle.value, point2D(1, 0));
    expect(normal.ok).toBe(true);
    if (!normal.ok) throw new Error(normal.error.message);
    expect(normal.value.direction).toEqual({ x: 1, y: 0 });
  });

  it('wraps intersections and P0 line-conic solving in typed results', () => {
    const horizontal = lineFromPoints(point2D(-2, 0), point2D(2, 0));
    const vertical = lineFromPoints(point2D(0, -2), point2D(0, 2));

    const lineIntersection = intersectLines2DResult(horizontal, vertical);
    expect(lineIntersection.ok).toBe(true);
    if (!lineIntersection.ok) throw new Error(lineIntersection.error.message);
    expect(lineIntersection.value).toEqual({ kind: 'point', point: { x: 0, y: 0 } });

    const conic = conicFromCoefficients({ A: 1, B: 0, C: 1, D: 0, E: 0, F: -1 });
    expect(conic.ok).toBe(true);
    if (!conic.ok) throw new Error(conic.error.message);

    const intersections = intersectLineConic2DResult(horizontal, conic.value);
    expect(intersections.ok).toBe(true);
    if (!intersections.ok) throw new Error(intersections.error.message);
    expect(intersections.value).toEqual({
      kind: 'points',
      points: [{ x: expect.closeTo(-1), y: 0 }, { x: expect.closeTo(1), y: 0 }]
    });
  });
});
