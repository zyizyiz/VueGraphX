export const GRAPH_MATH_EPSILON = 1e-9;

export interface MathPoint2D {
  x: number;
  y: number;
}

export interface MathPoint3D {
  x: number;
  y: number;
  z: number;
}

export type MathVector2D = MathPoint2D;
export type MathVector3D = MathPoint3D;

export interface MathLine2D {
  kind: 'line';
  point: MathPoint2D;
  direction: MathVector2D;
}

export interface MathRay2D {
  kind: 'ray';
  origin: MathPoint2D;
  direction: MathVector2D;
}

export interface MathSegment2D {
  kind: 'segment';
  start: MathPoint2D;
  end: MathPoint2D;
}

export interface MathCircle2D {
  kind: 'circle';
  center: MathPoint2D;
  radius: number;
}

export interface MathPolygon2D {
  kind: 'polygon';
  vertices: MathPoint2D[];
}

export interface MathPolyline2D {
  kind: 'polyline';
  points: MathPoint2D[];
}

export interface MathArc2D {
  kind: 'arc';
  center: MathPoint2D;
  start: MathPoint2D;
  end: MathPoint2D;
  radius: number;
  startAngle: number;
  endAngle: number;
}

export interface MathSector2D {
  kind: 'sector';
  center: MathPoint2D;
  start: MathPoint2D;
  end: MathPoint2D;
  radius: number;
  startAngle: number;
  endAngle: number;
}

export interface MathSemicircle2D {
  kind: 'semicircle';
  center: MathPoint2D;
  start: MathPoint2D;
  end: MathPoint2D;
  radius: number;
  startAngle: number;
  endAngle: number;
}

export interface MathBounds2D {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export type MathIntersection2D =
  | { kind: 'none' }
  | { kind: 'coincident' }
  | { kind: 'point'; point: MathPoint2D }
  | { kind: 'points'; points: MathPoint2D[] };

export const isFinitePoint2D = (point: MathPoint2D): boolean => Number.isFinite(point.x) && Number.isFinite(point.y);

export const point2D = (x: number, y: number): MathPoint2D => ({ x, y });

export const vector2D = (x: number, y: number): MathVector2D => ({ x, y });

export const add2D = (left: MathPoint2D, right: MathVector2D): MathPoint2D => ({
  x: left.x + right.x,
  y: left.y + right.y
});

export const subtract2D = (left: MathPoint2D, right: MathPoint2D): MathVector2D => ({
  x: left.x - right.x,
  y: left.y - right.y
});

export const scale2D = (vector: MathVector2D, factor: number): MathVector2D => ({
  x: vector.x * factor,
  y: vector.y * factor
});

export const dot2D = (left: MathVector2D, right: MathVector2D): number => left.x * right.x + left.y * right.y;

export const cross2D = (left: MathVector2D, right: MathVector2D): number => left.x * right.y - left.y * right.x;

export const length2D = (vector: MathVector2D): number => Math.hypot(vector.x, vector.y);

export const distance2D = (left: MathPoint2D, right: MathPoint2D): number => length2D(subtract2D(left, right));

export const normalize2D = (vector: MathVector2D, epsilon = GRAPH_MATH_EPSILON): MathVector2D => {
  const length = length2D(vector);
  if (length <= epsilon) return { x: 0, y: 0 };
  return { x: vector.x / length, y: vector.y / length };
};

export const midpoint2D = (left: MathPoint2D, right: MathPoint2D): MathPoint2D => ({
  x: (left.x + right.x) / 2,
  y: (left.y + right.y) / 2
});

export const lineFromPoints = (start: MathPoint2D, end: MathPoint2D): MathLine2D => ({
  kind: 'line',
  point: { ...start },
  direction: subtract2D(end, start)
});

export const rayFromPoints = (origin: MathPoint2D, through: MathPoint2D): MathRay2D => ({
  kind: 'ray',
  origin: { ...origin },
  direction: subtract2D(through, origin)
});

export const segmentFromPoints = (start: MathPoint2D, end: MathPoint2D): MathSegment2D => ({
  kind: 'segment',
  start: { ...start },
  end: { ...end }
});

export const circleFromCenterPoint = (center: MathPoint2D, pointOnCircle: MathPoint2D): MathCircle2D => ({
  kind: 'circle',
  center: { ...center },
  radius: distance2D(center, pointOnCircle)
});

export const polygonFromVertices = (vertices: readonly MathPoint2D[]): MathPolygon2D => ({
  kind: 'polygon',
  vertices: vertices.map((vertex) => ({ ...vertex }))
});

export const polylineFromPoints = (points: readonly MathPoint2D[]): MathPolyline2D => ({
  kind: 'polyline',
  points: points.map((point) => ({ ...point }))
});

export const regularPolygonFromSide = (
  start: MathPoint2D,
  end: MathPoint2D,
  sides: number
): MathPolygon2D | null => {
  if (!Number.isInteger(sides) || sides < 3) return null;
  const sideLength = distance2D(start, end);
  if (sideLength <= GRAPH_MATH_EPSILON) return null;

  const midpoint = midpoint2D(start, end);
  const sideVector = subtract2D(end, start);
  const centerOffsetScale = 1 / (2 * Math.tan(Math.PI / sides));
  const center = {
    x: midpoint.x - sideVector.y * centerOffsetScale,
    y: midpoint.y + sideVector.x * centerOffsetScale
  };
  const step = (Math.PI * 2) / sides;
  return polygonFromVertices(Array.from({ length: sides }, (_, index) => rotatePoint2D(start, step * index, center)));
};

export const parallelogramFromThreePoints = (
  first: MathPoint2D,
  second: MathPoint2D,
  third: MathPoint2D
): MathPolygon2D => {
  const fourth = {
    x: first.x + third.x - second.x,
    y: first.y + third.y - second.y
  };
  return polygonFromVertices([first, second, third, fourth]);
};

const angleFromCenter = (center: MathPoint2D, point: MathPoint2D): number => Math.atan2(point.y - center.y, point.x - center.x);

export const arcFromCenterPoints = (center: MathPoint2D, start: MathPoint2D, end: MathPoint2D): MathArc2D => ({
  kind: 'arc',
  center: { ...center },
  start: { ...start },
  end: { ...end },
  radius: distance2D(center, start),
  startAngle: angleFromCenter(center, start),
  endAngle: angleFromCenter(center, end)
});

export const sectorFromCenterPoints = (center: MathPoint2D, start: MathPoint2D, end: MathPoint2D): MathSector2D => ({
  kind: 'sector',
  center: { ...center },
  start: { ...start },
  end: { ...end },
  radius: distance2D(center, start),
  startAngle: angleFromCenter(center, start),
  endAngle: angleFromCenter(center, end)
});

export const semicircleFromDiameterPoints = (start: MathPoint2D, end: MathPoint2D): MathSemicircle2D => {
  const center = midpoint2D(start, end);
  const startAngle = angleFromCenter(center, start);
  return {
    kind: 'semicircle',
    center,
    start: { ...start },
    end: { ...end },
    radius: distance2D(center, start),
    startAngle,
    endAngle: startAngle - Math.PI
  };
};

export const circumcenter2D = (
  first: MathPoint2D,
  second: MathPoint2D,
  third: MathPoint2D,
  epsilon = GRAPH_MATH_EPSILON
): MathPoint2D | null => {
  const denominator = 2 * (
    first.x * (second.y - third.y)
    + second.x * (third.y - first.y)
    + third.x * (first.y - second.y)
  );
  if (Math.abs(denominator) <= epsilon) return null;

  const firstSquared = first.x * first.x + first.y * first.y;
  const secondSquared = second.x * second.x + second.y * second.y;
  const thirdSquared = third.x * third.x + third.y * third.y;
  return {
    x: (
      firstSquared * (second.y - third.y)
      + secondSquared * (third.y - first.y)
      + thirdSquared * (first.y - second.y)
    ) / denominator,
    y: (
      firstSquared * (third.x - second.x)
      + secondSquared * (first.x - third.x)
      + thirdSquared * (second.x - first.x)
    ) / denominator
  };
};

export const circleFromThreePoints = (
  first: MathPoint2D,
  second: MathPoint2D,
  third: MathPoint2D
): MathCircle2D | null => {
  const center = circumcenter2D(first, second, third);
  return center ? { kind: 'circle', center, radius: distance2D(center, first) } : null;
};

export const incenter2D = (
  first: MathPoint2D,
  second: MathPoint2D,
  third: MathPoint2D,
  epsilon = GRAPH_MATH_EPSILON
): MathPoint2D | null => {
  const a = distance2D(second, third);
  const b = distance2D(first, third);
  const c = distance2D(first, second);
  const perimeter = a + b + c;
  if (perimeter <= epsilon) return null;
  return {
    x: (a * first.x + b * second.x + c * third.x) / perimeter,
    y: (a * first.y + b * second.y + c * third.y) / perimeter
  };
};

export const incircleFromTriangle = (
  first: MathPoint2D,
  second: MathPoint2D,
  third: MathPoint2D,
  epsilon = GRAPH_MATH_EPSILON
): MathCircle2D | null => {
  const center = incenter2D(first, second, third, epsilon);
  if (!center) return null;
  const area = polygonArea(polygonFromVertices([first, second, third]));
  const semiperimeter = (distance2D(first, second) + distance2D(second, third) + distance2D(third, first)) / 2;
  if (semiperimeter <= epsilon || area <= epsilon) return null;
  return { kind: 'circle', center, radius: area / semiperimeter };
};

export const polygonSignedArea = (polygon: MathPolygon2D): number => {
  const vertices = polygon.vertices;
  if (vertices.length < 3) return 0;
  let sum = 0;
  for (let index = 0; index < vertices.length; index += 1) {
    const current = vertices[index];
    const next = vertices[(index + 1) % vertices.length];
    sum += current.x * next.y - next.x * current.y;
  }
  return sum / 2;
};

export const polygonArea = (polygon: MathPolygon2D): number => Math.abs(polygonSignedArea(polygon));

export const polygonCentroid = (polygon: MathPolygon2D): MathPoint2D => {
  const vertices = polygon.vertices;
  if (vertices.length === 0) return { x: 0, y: 0 };
  const area = polygonSignedArea(polygon);
  if (Math.abs(area) <= GRAPH_MATH_EPSILON) {
    const sum = vertices.reduce((acc, vertex) => ({ x: acc.x + vertex.x, y: acc.y + vertex.y }), { x: 0, y: 0 });
    return { x: sum.x / vertices.length, y: sum.y / vertices.length };
  }

  let x = 0;
  let y = 0;
  for (let index = 0; index < vertices.length; index += 1) {
    const current = vertices[index];
    const next = vertices[(index + 1) % vertices.length];
    const cross = current.x * next.y - next.x * current.y;
    x += (current.x + next.x) * cross;
    y += (current.y + next.y) * cross;
  }

  const factor = 1 / (6 * area);
  return { x: x * factor, y: y * factor };
};

export const boundsForPoints = (points: readonly MathPoint2D[]): MathBounds2D | null => {
  if (points.length === 0) return null;
  return points.reduce<MathBounds2D>((bounds, point) => ({
    minX: Math.min(bounds.minX, point.x),
    minY: Math.min(bounds.minY, point.y),
    maxX: Math.max(bounds.maxX, point.x),
    maxY: Math.max(bounds.maxY, point.y)
  }), { minX: points[0].x, minY: points[0].y, maxX: points[0].x, maxY: points[0].y });
};

export const translatePoint2D = (point: MathPoint2D, delta: MathVector2D): MathPoint2D => add2D(point, delta);

export const rotatePoint2D = (point: MathPoint2D, angleRadians: number, center: MathPoint2D = { x: 0, y: 0 }): MathPoint2D => {
  const sin = Math.sin(angleRadians);
  const cos = Math.cos(angleRadians);
  const local = subtract2D(point, center);
  return {
    x: center.x + local.x * cos - local.y * sin,
    y: center.y + local.x * sin + local.y * cos
  };
};

export const scalePoint2DAbout = (point: MathPoint2D, factor: number, center: MathPoint2D = { x: 0, y: 0 }): MathPoint2D => ({
  x: center.x + (point.x - center.x) * factor,
  y: center.y + (point.y - center.y) * factor
});

export const intersectLines2D = (left: MathLine2D, right: MathLine2D, epsilon = GRAPH_MATH_EPSILON): MathIntersection2D => {
  const denominator = cross2D(left.direction, right.direction);
  const delta = subtract2D(right.point, left.point);
  if (Math.abs(denominator) <= epsilon) {
    return Math.abs(cross2D(delta, left.direction)) <= epsilon ? { kind: 'coincident' } : { kind: 'none' };
  }

  const t = cross2D(delta, right.direction) / denominator;
  return { kind: 'point', point: add2D(left.point, scale2D(left.direction, t)) };
};

export const intersectLineCircle2D = (line: MathLine2D, circle: MathCircle2D, epsilon = GRAPH_MATH_EPSILON): MathIntersection2D => {
  const direction = normalize2D(line.direction, epsilon);
  if (length2D(direction) <= epsilon) return { kind: 'none' };
  const fromCenter = subtract2D(line.point, circle.center);
  const b = 2 * dot2D(fromCenter, direction);
  const c = dot2D(fromCenter, fromCenter) - circle.radius * circle.radius;
  const discriminant = b * b - 4 * c;
  if (discriminant < -epsilon) return { kind: 'none' };
  if (Math.abs(discriminant) <= epsilon) {
    return { kind: 'point', point: add2D(line.point, scale2D(direction, -b / 2)) };
  }
  const root = Math.sqrt(Math.max(0, discriminant));
  return {
    kind: 'points',
    points: [
      add2D(line.point, scale2D(direction, (-b - root) / 2)),
      add2D(line.point, scale2D(direction, (-b + root) / 2))
    ]
  };
};

export const intersectCircles2D = (left: MathCircle2D, right: MathCircle2D, epsilon = GRAPH_MATH_EPSILON): MathIntersection2D => {
  const centerDistance = distance2D(left.center, right.center);
  if (centerDistance <= epsilon && Math.abs(left.radius - right.radius) <= epsilon) return { kind: 'coincident' };
  if (centerDistance > left.radius + right.radius + epsilon) return { kind: 'none' };
  if (centerDistance < Math.abs(left.radius - right.radius) - epsilon) return { kind: 'none' };
  if (centerDistance <= epsilon) return { kind: 'none' };

  const a = (left.radius * left.radius - right.radius * right.radius + centerDistance * centerDistance) / (2 * centerDistance);
  const hSquared = left.radius * left.radius - a * a;
  if (hSquared < -epsilon) return { kind: 'none' };
  const unit = normalize2D(subtract2D(right.center, left.center));
  const base = add2D(left.center, scale2D(unit, a));
  if (Math.abs(hSquared) <= epsilon) return { kind: 'point', point: base };
  const h = Math.sqrt(Math.max(0, hSquared));
  const perpendicular = { x: -unit.y, y: unit.x };
  return {
    kind: 'points',
    points: [add2D(base, scale2D(perpendicular, h)), add2D(base, scale2D(perpendicular, -h))]
  };
};

export const areParallel2D = (left: MathVector2D, right: MathVector2D, epsilon = GRAPH_MATH_EPSILON): boolean => (
  Math.abs(cross2D(left, right)) <= epsilon * Math.max(1, length2D(left), length2D(right))
);

export const arePerpendicular2D = (left: MathVector2D, right: MathVector2D, epsilon = GRAPH_MATH_EPSILON): boolean => (
  Math.abs(dot2D(left, right)) <= epsilon * Math.max(1, length2D(left), length2D(right))
);

export const areEqualLength2D = (left: MathSegment2D, right: MathSegment2D, epsilon = GRAPH_MATH_EPSILON): boolean => (
  Math.abs(distance2D(left.start, left.end) - distance2D(right.start, right.end)) <= epsilon
);

export const pointInPolygon2D = (point: MathPoint2D, polygon: MathPolygon2D): boolean => {
  let inside = false;
  const vertices = polygon.vertices;
  for (let index = 0, previousIndex = vertices.length - 1; index < vertices.length; previousIndex = index, index += 1) {
    const current = vertices[index];
    const previous = vertices[previousIndex];
    const intersects = ((current.y > point.y) !== (previous.y > point.y))
      && point.x < ((previous.x - current.x) * (point.y - current.y)) / (previous.y - current.y) + current.x;
    if (intersects) inside = !inside;
  }
  return inside;
};
