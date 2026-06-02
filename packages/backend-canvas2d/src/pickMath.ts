import type { GraphClientPoint, GraphObjectNode, GraphPickResult, GraphRuntimeTargetRef } from '@vuegraphx/core';
import {
  cross2D,
  distance2D,
  dot2D,
  length2D,
  pointInPolygon2D,
  subtract2D,
  type MathLine2D,
  type MathCircle2D,
  type MathPoint2D,
  type MathPolygon2D,
  type MathRay2D,
  type MathSegment2D
} from '@vuegraphx/math';

const readPointPayload = (node: GraphObjectNode): MathPoint2D | null => {
  const payload = node.payload as Record<string, unknown> | undefined;
  const point = payload?.point;
  if (typeof point !== 'object' || point === null) return null;
  const x = (point as Record<string, unknown>).x;
  const y = (point as Record<string, unknown>).y;
  return typeof x === 'number' && typeof y === 'number' ? { x, y } : null;
};

const readGeometryPayload = <T>(node: GraphObjectNode, kind: string): T | null => {
  const payload = node.payload as Record<string, unknown> | undefined;
  const geometry = payload?.geometry;
  if (typeof geometry !== 'object' || geometry === null) return null;
  return (geometry as Record<string, unknown>).kind === kind ? geometry as T : null;
};

const readAnglePoints = (node: GraphObjectNode): [MathPoint2D, MathPoint2D, MathPoint2D] | null => {
  const payload = node.payload as Record<string, unknown> | undefined;
  const points = Array.isArray(payload?.points) ? payload.points.filter(isPointLike) : [];
  return points.length >= 3 ? [points[0], points[1], points[2]] : null;
};

const distanceToSegment = (point: MathPoint2D, segment: MathSegment2D): number => {
  const dx = segment.end.x - segment.start.x;
  const dy = segment.end.y - segment.start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return distance2D(point, segment.start);
  const t = Math.max(0, Math.min(1, ((point.x - segment.start.x) * dx + (point.y - segment.start.y) * dy) / lengthSquared));
  return distance2D(point, { x: segment.start.x + t * dx, y: segment.start.y + t * dy });
};

const distanceToLine = (point: MathPoint2D, line: MathLine2D): number => {
  const length = length2D(line.direction);
  if (length === 0) return distance2D(point, line.point);
  return Math.abs(cross2D(subtract2D(point, line.point), line.direction)) / length;
};

const distanceToRay = (point: MathPoint2D, ray: MathRay2D): number => {
  const lengthSquared = dot2D(ray.direction, ray.direction);
  if (lengthSquared === 0) return distance2D(point, ray.origin);
  const t = dot2D(subtract2D(point, ray.origin), ray.direction) / lengthSquared;
  if (t < 0) return distance2D(point, ray.origin);
  return distanceToLine(point, { kind: 'line', point: ray.origin, direction: ray.direction });
};

const distanceToPolyline = (point: MathPoint2D, points: readonly MathPoint2D[]): number => {
  if (points.length === 0) return Number.POSITIVE_INFINITY;
  if (points.length === 1) return distance2D(point, points[0]);
  let minDistance = Number.POSITIVE_INFINITY;
  for (let index = 1; index < points.length; index += 1) {
    minDistance = Math.min(minDistance, distanceToSegment(point, { kind: 'segment', start: points[index - 1], end: points[index] }));
  }
  return minDistance;
};

export const pickGraphObjectNode = (
  node: GraphObjectNode,
  clientPoint: GraphClientPoint,
  backendId: string,
  tolerancePx = 8
): GraphPickResult | null => {
  const point = { x: clientPoint.x, y: clientPoint.y };
  const layerId = node.layerId ?? 'content';
  const target: GraphRuntimeTargetRef = { scope: 'object', objectId: node.id, backendId, layerId };
  const pointPayload = readPointPayload(node);
  if (pointPayload) {
    const distancePx = distance2D(point, pointPayload);
    return distancePx <= tolerancePx ? { target, backendId, layerId, clientPoint: { ...clientPoint }, worldPoint: { dimension: '2d', ...pointPayload }, distancePx } : null;
  }

  const circle = readGeometryPayload<MathCircle2D>(node, 'circle');
  if (circle) {
    const distancePx = Math.abs(distance2D(point, circle.center) - circle.radius);
    return distancePx <= tolerancePx ? { target, backendId, layerId, clientPoint: { ...clientPoint }, worldPoint: { dimension: '2d', ...point }, distancePx } : null;
  }

  const segment = readGeometryPayload<MathSegment2D>(node, 'segment');
  if (segment) {
    const distancePx = distanceToSegment(point, segment);
    return distancePx <= tolerancePx ? { target, backendId, layerId, clientPoint: { ...clientPoint }, worldPoint: { dimension: '2d', ...point }, distancePx } : null;
  }

  const line = readGeometryPayload<MathLine2D>(node, 'line');
  if (line) {
    const distancePx = distanceToLine(point, line);
    return distancePx <= tolerancePx ? { target, backendId, layerId, clientPoint: { ...clientPoint }, worldPoint: { dimension: '2d', ...point }, distancePx } : null;
  }

  const ray = readGeometryPayload<MathRay2D>(node, 'ray');
  if (ray) {
    const distancePx = distanceToRay(point, ray);
    return distancePx <= tolerancePx ? { target, backendId, layerId, clientPoint: { ...clientPoint }, worldPoint: { dimension: '2d', ...point }, distancePx } : null;
  }

  const polyline = readGeometryPayload<{ kind: 'polyline'; points: MathPoint2D[] }>(node, 'polyline');
  if (polyline) {
    const distancePx = distanceToPolyline(point, polyline.points);
    return distancePx <= tolerancePx ? { target, backendId, layerId, clientPoint: { ...clientPoint }, worldPoint: { dimension: '2d', ...point }, distancePx } : null;
  }

  const multiline = readMultilineGeometry(node);
  if (multiline) {
    const distancePx = Math.min(...multiline.map((segment) => distanceToPolyline(point, segment)));
    return distancePx <= tolerancePx ? { target, backendId, layerId, clientPoint: { ...clientPoint }, worldPoint: { dimension: '2d', ...point }, distancePx } : null;
  }

  const coordinateSystem = readCoordinateSystemHitGeometry(node);
  if (coordinateSystem) {
    const distancePx = pointInCoordinateSystemRegion(point, coordinateSystem)
      ? 0
      : Math.min(...coordinateSystem.segments.map((segment) => distanceToPolyline(point, segment)));
    return distancePx <= tolerancePx ? { target, backendId, layerId, clientPoint: { ...clientPoint }, worldPoint: { dimension: '2d', ...point }, distancePx } : null;
  }

  const arc = readArcLikeGeometry(node);
  if (arc) {
    const distancePx = distanceToArcLike(point, arc);
    return distancePx <= tolerancePx ? { target, backendId, layerId, clientPoint: { ...clientPoint }, worldPoint: { dimension: '2d', ...point }, distancePx } : null;
  }

  const polygon = readGeometryPayload<MathPolygon2D>(node, 'polygon');
  if (polygon && pointInPolygon2D(point, polygon)) {
    return { target, backendId, layerId, clientPoint: { ...clientPoint }, worldPoint: { dimension: '2d', ...point }, distancePx: 0 };
  }

  const anglePoints = readAnglePoints(node);
  if (anglePoints) {
    const distancePx = distanceToAngle(point, anglePoints);
    return distancePx <= tolerancePx ? { target, backendId, layerId, clientPoint: { ...clientPoint }, worldPoint: { dimension: '2d', ...point }, distancePx } : null;
  }

  return null;
};

const readMultilineGeometry = (node: GraphObjectNode): MathPoint2D[][] | null => {
  const payload = node.payload as Record<string, unknown> | undefined;
  const geometry = payload?.geometry;
  if (typeof geometry !== 'object' || geometry === null) return null;
  const record = geometry as Record<string, unknown>;
  if (record.kind !== 'multiline' && record.kind !== 'wireframe') return null;
  if (!Array.isArray(record.segments)) return null;
  const segments = record.segments
    .filter(Array.isArray)
    .map((segment) => segment.filter(isPointLike));
  return segments.some((segment) => segment.length >= 2) ? segments : null;
};

const readCoordinateSystemHitGeometry = (node: GraphObjectNode): { border: MathPoint2D[]; segments: MathPoint2D[][] } | null => {
  const geometry = readGeometryPayload<Record<string, unknown>>(node, 'coordinate-system');
  if (!geometry) return null;
  const segments = Array.isArray(geometry.segments)
    ? geometry.segments.filter(isPointArray)
    : [];
  const axisSegments = [geometry.xAxis, geometry.yAxis].filter(isPointArray);
  const hitSegments = segments.length > 0 ? segments : axisSegments;
  const border = isPointArray(geometry.border) ? geometry.border : boundsPolygonForSegments([...hitSegments, ...segments, ...axisSegments]);
  return hitSegments.length > 0 || border.length >= 3 ? { border, segments: hitSegments } : null;
};

const pointInCoordinateSystemRegion = (point: MathPoint2D, geometry: { border: MathPoint2D[] }): boolean => (
  geometry.border.length >= 3 && pointInPolygon2D(point, { kind: 'polygon', vertices: geometry.border })
);

const boundsPolygonForSegments = (segments: MathPoint2D[][]): MathPoint2D[] => {
  const points = segments.flat();
  if (points.length === 0) return [];
  const minX = Math.min(...points.map((point) => point.x));
  const maxX = Math.max(...points.map((point) => point.x));
  const minY = Math.min(...points.map((point) => point.y));
  const maxY = Math.max(...points.map((point) => point.y));
  if (!Number.isFinite(minX) || !Number.isFinite(maxX) || !Number.isFinite(minY) || !Number.isFinite(maxY)) return [];
  return [
    { x: minX, y: minY },
    { x: maxX, y: minY },
    { x: maxX, y: maxY },
    { x: minX, y: maxY }
  ];
};

const readArcLikeGeometry = (
  node: GraphObjectNode
): { center: MathPoint2D; start: MathPoint2D; end: MathPoint2D; radius: number } | null => {
  const payload = node.payload as Record<string, unknown> | undefined;
  const geometry = payload?.geometry;
  if (typeof geometry !== 'object' || geometry === null) return null;
  const record = geometry as Record<string, unknown>;
  if (record.kind !== 'arc' && record.kind !== 'sector' && record.kind !== 'semicircle') return null;
  if (!isPointLike(record.center) || !isPointLike(record.start) || !isPointLike(record.end)) return null;
  return {
    center: record.center,
    start: record.start,
    end: record.end,
    radius: typeof record.radius === 'number' && Number.isFinite(record.radius)
      ? record.radius
      : distance2D(record.center, record.start)
  };
};

const isPointLike = (value: unknown): value is MathPoint2D => {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return typeof record.x === 'number' && Number.isFinite(record.x) && typeof record.y === 'number' && Number.isFinite(record.y);
};

const isPointArray = (value: unknown): value is MathPoint2D[] => (
  Array.isArray(value) && value.every(isPointLike)
);

const distanceToAngle = (point: MathPoint2D, [first, vertex, third]: [MathPoint2D, MathPoint2D, MathPoint2D]): number => {
  const radius = Math.max(0.35, Math.min(distance2D(first, vertex), distance2D(third, vertex)) * 0.35);
  return Math.abs(distance2D(point, vertex) - radius);
};

const distanceToArcLike = (
  point: MathPoint2D,
  geometry: { center: MathPoint2D; start: MathPoint2D; end: MathPoint2D; radius: number }
): number => Math.min(
  Math.abs(distance2D(point, geometry.center) - geometry.radius),
  distance2D(point, geometry.start),
  distance2D(point, geometry.end)
);
