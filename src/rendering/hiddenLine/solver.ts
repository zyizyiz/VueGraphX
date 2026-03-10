import type { GraphHiddenLineEdgeStyle, GraphHiddenLineOptions } from './contracts';
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
  hidden: boolean;
  points: GraphHiddenLineScreenPoint[];
  style?: GraphHiddenLineEdgeStyle;
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
  drawOrder: number;
  points: GraphHiddenLineProjectedPoint[];
  visibleStyle?: GraphHiddenLineEdgeStyle;
  hiddenStyle?: GraphHiddenLineEdgeStyle;
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
  const points = polyline.worldPoints.map((point) => projectWorldPoint(board, view3d, point)).filter((point): point is GraphHiddenLineProjectedPoint => !!point);
  if (points.length < 2) return null;

  return {
    sourceId: polyline.sourceId,
    ownerId: polyline.ownerId,
    drawOrder: polyline.drawOrder,
    points,
    visibleStyle: mergeStyle(options.visibleStyle, polyline.style?.visible),
    hiddenStyle: mergeStyle(options.hiddenStyle, polyline.style?.hidden)
  };
};

type DepthComparator = (triangleDepth: number, edgeDepth: number) => boolean;

const isSampleHidden = (
  point: GraphHiddenLineScreenPoint,
  edgeDepth: number,
  triangles: ProjectedTriangleRecord[],
  compareDepth: DepthComparator,
  polylineOrder: number
): boolean => {
  for (const triangleRecord of triangles) {
    const triangle = triangleRecord.triangle;
    if (point.x < triangle.bbox.minX || point.x > triangle.bbox.maxX || point.y < triangle.bbox.minY || point.y > triangle.bbox.maxY) {
      continue;
    }

    const containment = pointInTriangleBarycentric(point, triangle);
    if (!containment.inside) continue;

    if (triangleRecord.drawOrder > polylineOrder) {
      // 后添加的图形优先级更高，直接判定遮挡，无需深度比较
      return true;
    }

    if (triangleRecord.drawOrder === polylineOrder) {
      const triangleDepth = interpolateTriangleDepth(triangle, containment.barycentric);
      if (compareDepth(triangleDepth, edgeDepth)) {
        return true;
      }
    }
  }

  return false;
};

const buildSegmentRuns = (
  polyline: ProjectedPolylineRecord,
  triangles: ProjectedTriangleRecord[],
  compareDepth: DepthComparator
): GraphHiddenLineRenderedPath[] => {
  const rendered: GraphHiddenLineRenderedPath[] = [];

  for (let index = 0; index < polyline.points.length - 1; index += 1) {
    const start = polyline.points[index];
    const end = polyline.points[index + 1];
    const dx = end.screen.x - start.screen.x;
    const dy = end.screen.y - start.screen.y;
    const length = Math.hypot(dx, dy);
    const steps = clamp(Math.ceil(length / 10), 2, 64);

    let activeHidden: boolean | null = null;
    let activePoints: GraphHiddenLineScreenPoint[] = [];

    for (let step = 0; step < steps; step += 1) {
      const t0 = step / steps;
      const t1 = (step + 1) / steps;
      const midT = (t0 + t1) / 2;
      const startPoint = step === 0 ? start.screen : lerpScreenPoint(start.screen, end.screen, t0);
      const endPoint = lerpScreenPoint(start.screen, end.screen, t1);
      const midPoint = lerpScreenPoint(start.screen, end.screen, midT);
      const edgeDepth = lerp(start.depth, end.depth, midT);
      const hidden = isSampleHidden(midPoint, edgeDepth, triangles, compareDepth, polyline.drawOrder);

      if (activeHidden === null || activeHidden !== hidden) {
        if (activePoints.length >= 2 && activeHidden !== null) {
          rendered.push({
            sourceId: polyline.sourceId,
            ownerId: polyline.ownerId,
            hidden: activeHidden,
            points: activePoints,
            style: activeHidden ? polyline.hiddenStyle : polyline.visibleStyle
          });
        }
        activeHidden = hidden;
        activePoints = [startPoint, endPoint];
        continue;
      }

      activePoints.push(endPoint);
    }

    if (activePoints.length >= 2 && activeHidden !== null) {
      rendered.push({
        sourceId: polyline.sourceId,
        ownerId: polyline.ownerId,
        hidden: activeHidden,
        points: activePoints,
        style: activeHidden ? polyline.hiddenStyle : polyline.visibleStyle
      });
    }
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

  renderedPaths.sort((left, right) => Number(left.hidden) - Number(right.hidden));

  return {
    renderedPaths,
    triangleCount: projectedTriangles.length,
    polylineCount: projectedPolylines.length
  };
};
