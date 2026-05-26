import { describe, expect, it } from 'vitest';
import {
  areEqualLength2D,
  areParallel2D,
  arePerpendicular2D,
  arcFromCenterPoints,
  circleFromCenterPoint,
  circleFromThreePoints,
  circumcenter2D,
  distance2D,
  incenter2D,
  incircleFromTriangle,
  intersectCircles2D,
  intersectLineCircle2D,
  intersectLines2D,
  lineFromPoints,
  midpoint2D,
  parallelogramFromThreePoints,
  point2D,
  polygonArea,
  polygonCentroid,
  polygonFromVertices,
  polylineFromPoints,
  regularPolygonFromSide,
  rotatePoint2D,
  sectorFromCenterPoints,
  segmentFromPoints,
  semicircleFromDiameterPoints
} from './index';

describe('renderer-free math kernel', () => {
  it('computes point/vector basics without a rendering board', () => {
    const a = point2D(0, 0);
    const b = point2D(3, 4);
    expect(distance2D(a, b)).toBe(5);
    expect(midpoint2D(a, b)).toEqual({ x: 1.5, y: 2 });
    expect(rotatePoint2D(point2D(1, 0), Math.PI / 2).x).toBeCloseTo(0);
    expect(rotatePoint2D(point2D(1, 0), Math.PI / 2).y).toBeCloseTo(1);
  });

  it('represents lines, circles, polygons, and relations as pure data', () => {
    const a = point2D(0, 0);
    const b = point2D(4, 0);
    const c = point2D(0, 3);
    const line = lineFromPoints(a, b);
    const vertical = lineFromPoints(a, c);
    const circle = circleFromCenterPoint(a, b);
    const polygon = polygonFromVertices([a, b, c]);

    expect(line.direction).toEqual({ x: 4, y: 0 });
    expect(circle.radius).toBe(4);
    expect(polygonArea(polygon)).toBe(6);
    expect(polygonCentroid(polygon)).toEqual({ x: 4 / 3, y: 1 });
    expect(areParallel2D(line.direction, { x: 8, y: 0 })).toBe(true);
    expect(arePerpendicular2D(line.direction, vertical.direction)).toBe(true);
    expect(areEqualLength2D(segmentFromPoints(a, b), segmentFromPoints(a, point2D(0, 4)))).toBe(true);
  });

  it('represents arcs, sectors, semicircles, and polylines as pure geometry data', () => {
    const center = point2D(0, 0);
    const start = point2D(2, 0);
    const end = point2D(0, 2);

    expect(arcFromCenterPoints(center, start, end)).toMatchObject({
      kind: 'arc',
      center,
      start,
      end,
      radius: 2
    });
    expect(sectorFromCenterPoints(center, start, end)).toMatchObject({
      kind: 'sector',
      radius: 2,
      startAngle: 0
    });
    expect(semicircleFromDiameterPoints(point2D(-1, 0), point2D(1, 0))).toMatchObject({
      kind: 'semicircle',
      center,
      radius: 1
    });
    expect(polylineFromPoints([center, start, end]).points).toEqual([center, start, end]);
  });

  it('constructs higher-level Euclidean helpers without JSXGraph', () => {
    const a = point2D(0, 0);
    const b = point2D(2, 0);
    const c = point2D(0, 2);

    const square = regularPolygonFromSide(a, b, 4);
    expect(square?.vertices).toHaveLength(4);
    expect(square?.vertices[2].x).toBeCloseTo(2);
    expect(square?.vertices[2].y).toBeCloseTo(2);

    const parallelogram = parallelogramFromThreePoints(a, b, point2D(3, 1));
    expect(parallelogram.vertices).toEqual([a, b, { x: 3, y: 1 }, { x: 1, y: 1 }]);

    expect(circumcenter2D(a, b, c)).toEqual({ x: 1, y: 1 });
    expect(circleFromThreePoints(a, b, c)).toMatchObject({ kind: 'circle', center: { x: 1, y: 1 } });
    expect(incenter2D(a, b, c)?.x).toBeCloseTo(2 - Math.sqrt(2));
    expect(incircleFromTriangle(a, b, c)?.radius).toBeCloseTo(2 - Math.sqrt(2));
  });

  it('solves intersections independently from JSXGraph', () => {
    const horizontal = lineFromPoints(point2D(-1, 0), point2D(1, 0));
    const vertical = lineFromPoints(point2D(0, -1), point2D(0, 1));
    const lineIntersection = intersectLines2D(horizontal, vertical);
    expect(lineIntersection).toEqual({ kind: 'point', point: { x: 0, y: 0 } });

    const circle = circleFromCenterPoint(point2D(0, 0), point2D(1, 0));
    const lineCircle = intersectLineCircle2D(horizontal, circle);
    expect(lineCircle.kind).toBe('points');
    if (lineCircle.kind === 'points') expect(lineCircle.points).toHaveLength(2);

    const circleCircle = intersectCircles2D(circle, circleFromCenterPoint(point2D(1, 0), point2D(2, 0)));
    expect(circleCircle.kind).toBe('points');
  });
});
