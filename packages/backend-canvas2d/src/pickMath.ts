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
