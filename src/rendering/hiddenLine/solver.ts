import type {
  GraphHiddenLineBaseVisibility,
  GraphHiddenLineEdgeStyle,
  GraphHiddenLineNativeTargetSpec,
  GraphHiddenLineOptions,
  GraphHiddenLineOverlayBehavior,
  GraphHiddenLinePoint3D
} from './contracts';
import {
  clamp,
  createTriangle2DBBox,
  interpolateTriangleDepth,
  lerp,
  lerpScreenPoint,
  pointInTriangleBarycentric,
  type GraphHiddenLineTriangle2D
} from './geometry';
import { projectWorldPoint, type GraphHiddenLineProjectedPoint, type GraphHiddenLineScreenPoint } from './projector';
import type {
  GraphHiddenLineResolvedPolyline,
  GraphHiddenLineResolvedSceneSource,
  GraphHiddenLineResolvedTriangle
} from './tessellation';

export interface GraphHiddenLineRenderedPath {
  sourceId: string;
  ownerId: string;
  polylineId?: string;
  hidden: boolean;
  mode: 'draw' | 'mask';
  points: GraphHiddenLineScreenPoint[];
  style?: GraphHiddenLineEdgeStyle;
  nativeTarget?: GraphHiddenLineNativeTargetSpec;
  dashOffset?: number;
  dashPathLength?: number;
  dashReferenceLength?: number;
  dashReferenceScreenLength?: number;
}

export interface GraphHiddenLineSolveResult {
  renderedPaths: GraphHiddenLineRenderedPath[];
  triangleCount: number;
  polylineCount: number;
}

interface ProjectedTriangleRecord {
  sourceId: string;
  ownerId: string;
  drawOrder: number;
  triangle: GraphHiddenLineTriangle2D;
}

interface ProjectedPolylineRecord {
  sourceId: string;
  ownerId: string;
  polylineId?: string;
  drawOrder: number;
  points: GraphHiddenLineProjectedPoint[];
  worldPoints: GraphHiddenLinePoint3D[];
  visibleStyle?: GraphHiddenLineEdgeStyle;
  hiddenStyle?: GraphHiddenLineEdgeStyle;
  overlay?: GraphHiddenLineOverlayBehavior;
  nativeTarget?: GraphHiddenLineNativeTargetSpec;
  ignoreOwnerOcclusion?: boolean;
  sampleVisibility?: (point: GraphHiddenLinePoint3D) => GraphHiddenLineBaseVisibility | null | undefined;
}

const mergeStyle = (
  baseStyle: GraphHiddenLineEdgeStyle | undefined,
  overrideStyle: GraphHiddenLineEdgeStyle | undefined
): GraphHiddenLineEdgeStyle | undefined => {
  if (!baseStyle && !overrideStyle) return undefined;
  return {
    ...(baseStyle ?? {}),
    ...(overrideStyle ?? {})
  };
};

const projectTriangle = (board: any, view3d: any, triangle: GraphHiddenLineResolvedTriangle): ProjectedTriangleRecord | null => {
  const a = projectWorldPoint(board, view3d, triangle.world[0]);
  const b = projectWorldPoint(board, view3d, triangle.world[1]);
  const c = projectWorldPoint(board, view3d, triangle.world[2]);
  if (!a || !b || !c) return null;

  const projectedTriangle: GraphHiddenLineTriangle2D = {
    a,
    b,
    c,
    bbox: createTriangle2DBBox({ a, b, c })
  };

  return {
    sourceId: triangle.sourceId,
    ownerId: triangle.ownerId,
    drawOrder: triangle.drawOrder,
    triangle: projectedTriangle
  };
};

const projectPolyline = (
  board: any,
  view3d: any,
  polyline: GraphHiddenLineResolvedPolyline,
  options: GraphHiddenLineOptions
): ProjectedPolylineRecord | null => {
  const points: GraphHiddenLineProjectedPoint[] = [];
  const worldPoints: GraphHiddenLinePoint3D[] = [];

  polyline.worldPoints.forEach((point) => {
    const projected = projectWorldPoint(board, view3d, point);
    if (!projected) return;
    points.push(projected);
    worldPoints.push({ ...point });
  });

  if (points.length < 2) return null;

  return {
    sourceId: polyline.sourceId,
    ownerId: polyline.ownerId,
    polylineId: polyline.polylineId,
    drawOrder: polyline.drawOrder,
    points,
    worldPoints,
    visibleStyle: mergeStyle(options.visibleStyle, polyline.style?.visible),
    hiddenStyle: mergeStyle(options.hiddenStyle, polyline.style?.hidden),
    overlay: polyline.overlay,
    nativeTarget: polyline.nativeTarget,
    ignoreOwnerOcclusion: polyline.ignoreOwnerOcclusion,
    sampleVisibility: polyline.sampleVisibility
  };
};

type DepthComparator = (triangleDepth: number, edgeDepth: number) => boolean;

const isSampleHidden = (
  point: GraphHiddenLineScreenPoint,
  edgeDepth: number,
  triangles: ProjectedTriangleRecord[],
  compareDepth: DepthComparator,
  polylineOrder: number,
  polylineOwnerId: string,
  ignoreOwnerOcclusion: boolean
): boolean => {
  for (const triangleRecord of triangles) {
    if (ignoreOwnerOcclusion && triangleRecord.ownerId === polylineOwnerId) {
      continue;
    }
    const triangle = triangleRecord.triangle;
    if (point.x < triangle.bbox.minX || point.x > triangle.bbox.maxX || point.y < triangle.bbox.minY || point.y > triangle.bbox.maxY) {
      continue;
    }

    const containment = pointInTriangleBarycentric(point, triangle);
    if (!containment.inside) continue;

    const triangleDepth = interpolateTriangleDepth(triangle, containment.barycentric);
    if (compareDepth(triangleDepth, edgeDepth)) {
      return true;
    }

    if (Math.abs(triangleDepth - edgeDepth) <= 1e-3 && triangleRecord.drawOrder > polylineOrder) {
      return true;
    }
  }

  return false;
};

const lerpWorldPoint = (from: GraphHiddenLinePoint3D, to: GraphHiddenLinePoint3D, progress: number): GraphHiddenLinePoint3D => ({
  x: lerp(from.x, to.x, progress),
  y: lerp(from.y, to.y, progress),
  z: lerp(from.z, to.z, progress)
});

const distance3D = (from: GraphHiddenLinePoint3D, to: GraphHiddenLinePoint3D): number => Math.hypot(
  to.x - from.x,
  to.y - from.y,
  to.z - from.z
);

const createRenderedPath = (
  polyline: ProjectedPolylineRecord,
  hidden: boolean,
  mode: 'draw' | 'mask',
  points: GraphHiddenLineScreenPoint[],
  style?: GraphHiddenLineEdgeStyle,
  dashOffset?: number,
  dashPathLength?: number,
  dashReferenceLength?: number,
  dashReferenceScreenLength?: number
): GraphHiddenLineRenderedPath => ({
  sourceId: polyline.sourceId,
  ownerId: polyline.ownerId,
  polylineId: polyline.polylineId,
  hidden,
  mode,
  points,
  style,
  nativeTarget: polyline.nativeTarget,
  dashOffset,
  dashPathLength,
  dashReferenceLength,
  dashReferenceScreenLength
});

const buildSegmentRuns = (
  polyline: ProjectedPolylineRecord,
  triangles: ProjectedTriangleRecord[],
  compareDepth: DepthComparator
): GraphHiddenLineRenderedPath[] => {
  const rendered: GraphHiddenLineRenderedPath[] = [];
  const overlay = polyline.overlay ?? {};
  const totalWorldLength = polyline.worldPoints.reduce((accumulator, point, index) => {
    if (index === 0) return accumulator;
    const previous = polyline.worldPoints[index - 1];
    return previous ? accumulator + distance3D(previous, point) : accumulator;
  }, 0);
  const totalScreenLength = polyline.points.reduce((accumulator, point, index) => {
    if (index === 0) return accumulator;
    const previous = polyline.points[index - 1];
    return previous ? accumulator + Math.hypot(point.screen.x - previous.screen.x, point.screen.y - previous.screen.y) : accumulator;
  }, 0);

  const flushRun = (hidden: boolean, points: GraphHiddenLineScreenPoint[], runStartDistance: number, runEndDistance: number) => {
    if (points.length < 2) return;
    const runLength = Math.max(0, runEndDistance - runStartDistance);

    if (!hidden && overlay.clipNativeVisible && polyline.nativeTarget) {
      rendered.push(createRenderedPath(polyline, false, 'mask', points, polyline.visibleStyle, runStartDistance, runLength, totalWorldLength, totalScreenLength));
    }

    if (!hidden) {
      if (overlay.renderVisible !== false) {
        rendered.push(createRenderedPath(polyline, false, 'draw', points, polyline.visibleStyle, runStartDistance, runLength, totalWorldLength, totalScreenLength));
      }
      return;
    }

    if (overlay.renderHidden !== false) {
      rendered.push(createRenderedPath(polyline, true, 'draw', points, polyline.hiddenStyle, runStartDistance, runLength, totalWorldLength, totalScreenLength));
    }
  };

  const pushPoint = (points: GraphHiddenLineScreenPoint[], point: GraphHiddenLineScreenPoint) => {
    const lastPoint = points[points.length - 1];
    if (!lastPoint || Math.abs(lastPoint.x - point.x) > 1e-6 || Math.abs(lastPoint.y - point.y) > 1e-6) {
      points.push(point);
    }
  };

  let activeHidden: boolean | null = null;
  let activePoints: GraphHiddenLineScreenPoint[] = [];
  let activeRunStartDistance = 0;
  let activeRunEndDistance = 0;
  let traversedLength = 0;

  for (let index = 0; index < polyline.points.length - 1; index += 1) {
    const start = polyline.points[index];
    const end = polyline.points[index + 1];
    const startWorld = polyline.worldPoints[index];
    const endWorld = polyline.worldPoints[index + 1];
    if (!startWorld || !endWorld) continue;
    const dx = end.screen.x - start.screen.x;
    const dy = end.screen.y - start.screen.y;
    const length = Math.hypot(dx, dy);
    const worldLength = distance3D(startWorld, endWorld);
    const steps = clamp(Math.ceil(length / 10), 2, 64);

    for (let step = 0; step < steps; step += 1) {
      const t0 = step / steps;
      const t1 = (step + 1) / steps;
      const midT = (t0 + t1) / 2;
      const startPoint = step === 0 ? start.screen : lerpScreenPoint(start.screen, end.screen, t0);
      const endPoint = lerpScreenPoint(start.screen, end.screen, t1);
      const midPoint = lerpScreenPoint(start.screen, end.screen, midT);
      const midWorldPoint = lerpWorldPoint(startWorld, endWorld, midT);
      const stepStartDistance = traversedLength + worldLength * t0;
      const stepEndDistance = traversedLength + worldLength * t1;
      const edgeDepth = lerp(start.depth, end.depth, midT);
      const externallyHidden = isSampleHidden(
        midPoint,
        edgeDepth,
        triangles,
        compareDepth,
        polyline.drawOrder,
        polyline.ownerId,
        Boolean(polyline.ignoreOwnerOcclusion)
      );
      const baseVisibility = polyline.sampleVisibility?.(midWorldPoint) ?? 'auto';
      const hidden = baseVisibility === 'visible'
        ? false
        : baseVisibility === 'hidden'
          ? true
          : externallyHidden;

      if (activeHidden === null || activeHidden !== hidden) {
        if (activePoints.length >= 2 && activeHidden !== null) {
          flushRun(activeHidden, activePoints, activeRunStartDistance, activeRunEndDistance);
        }
        activeHidden = hidden;
        activeRunStartDistance = stepStartDistance;
        activeRunEndDistance = stepEndDistance;
        activePoints = [startPoint];
        pushPoint(activePoints, endPoint);
        continue;
      }

      activeRunEndDistance = stepEndDistance;
      pushPoint(activePoints, endPoint);
    }

    traversedLength += worldLength;
  }

  if (activePoints.length >= 2 && activeHidden !== null) {
    flushRun(activeHidden, activePoints, activeRunStartDistance, activeRunEndDistance);
  }

  return rendered;
};

export const solveHiddenLineScene = (
  board: any,
  view3d: any,
  sources: GraphHiddenLineResolvedSceneSource[],
  options: GraphHiddenLineOptions
): GraphHiddenLineSolveResult => {
  const compareDepthNearIsSmaller: DepthComparator = (triangleDepth, edgeDepth) => triangleDepth < edgeDepth - 1e-3;
  const compareDepthNearIsLarger: DepthComparator = (triangleDepth, edgeDepth) => triangleDepth > edgeDepth + 1e-3;

  const projectedTriangles = sources
    .flatMap((source) => source.triangles)
    .map((triangle) => projectTriangle(board, view3d, triangle))
    .filter((triangle): triangle is ProjectedTriangleRecord => !!triangle);

  const projectedPolylines = sources
    .flatMap((source) => source.polylines)
    .map((polyline) => projectPolyline(board, view3d, polyline, options))
    .filter((polyline): polyline is ProjectedPolylineRecord => !!polyline);

  const runWithComparator = (compareDepth: DepthComparator) => projectedPolylines
    .flatMap((polyline) => buildSegmentRuns(polyline, projectedTriangles, compareDepth))
    .filter((path) => path.points.length >= 2);

  let renderedPaths = runWithComparator(compareDepthNearIsSmaller);
  const hasHidden = renderedPaths.some((path) => path.hidden);
  if (!hasHidden) {
    // 某些视角矩阵深度符号与假设相反，做一次反向比较兜底
    renderedPaths = runWithComparator(compareDepthNearIsLarger);
  }

  const rank = (path: GraphHiddenLineRenderedPath) => {
    if (path.mode === 'mask') return 0;
    return path.hidden ? 2 : 1;
  };
  renderedPaths.sort((left, right) => rank(left) - rank(right));

  return {
    renderedPaths,
    triangleCount: projectedTriangles.length,
    polylineCount: projectedPolylines.length
  };
};
