import type {
  GraphHiddenLineCurveSourceData,
  GraphHiddenLineMeshSourceData,
  GraphHiddenLineNativeTargetSpec,
  GraphHiddenLineOptions,
  GraphHiddenLineOverlayBehavior,
  GraphHiddenLinePoint3D,
  GraphHiddenLinePolyline,
  GraphHiddenLinePolylineSetSourceData,
  GraphHiddenLineSourceRecord,
  GraphHiddenLineStyleSpec,
  GraphHiddenLineSurfaceFeatureCurve,
  GraphHiddenLineSurfaceSourceData
} from './contracts';

export interface GraphHiddenLineResolvedTriangle {
  sourceId: string;
  ownerId: string;
  drawOrder: number;
  style?: GraphHiddenLineStyleSpec;
  world: [GraphHiddenLinePoint3D, GraphHiddenLinePoint3D, GraphHiddenLinePoint3D];
}

export interface GraphHiddenLineResolvedPolyline {
  sourceId: string;
  ownerId: string;
  polylineId?: string;
  drawOrder: number;
  style?: GraphHiddenLineStyleSpec;
  overlay?: GraphHiddenLineOverlayBehavior;
  nativeTarget?: GraphHiddenLineNativeTargetSpec;
  worldPoints: GraphHiddenLinePoint3D[];
  ignoreOwnerOcclusion?: boolean;
  sampleVisibility?: GraphHiddenLinePolyline['sampleVisibility'];
}

export interface GraphHiddenLineResolvedSceneSource {
  sourceId: string;
  ownerId: string;
  drawOrder: number;
  edgeCount: number;
  faceCount: number;
  triangles: GraphHiddenLineResolvedTriangle[];
  polylines: GraphHiddenLineResolvedPolyline[];
}

const clampSegments = (value: number | undefined, fallback: number, min = 2): number => Math.max(min, Math.round(value ?? fallback));

const toPoint = (point: GraphHiddenLinePoint3D | null | undefined): GraphHiddenLinePoint3D | null => {
  if (!point) return null;
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y) || !Number.isFinite(point.z)) return null;
  return { x: point.x, y: point.y, z: point.z };
};

const triangulateFace = (indices: number[]): Array<[number, number, number]> => {
  if (indices.length < 3) return [];
  const triangles: Array<[number, number, number]> = [];
  for (let index = 1; index < indices.length - 1; index += 1) {
    triangles.push([indices[0], indices[index], indices[index + 1]]);
  }
  return triangles;
};

const extractMeshEdges = (mesh: GraphHiddenLineMeshSourceData): GraphHiddenLinePolyline[] => {
  if (mesh.edges && mesh.edges.length > 0) return mesh.edges;

  const edgeMap = new Map<string, GraphHiddenLinePolyline>();
  mesh.faces.forEach((face) => {
    const indices = face.indices;
    for (let index = 0; index < indices.length; index += 1) {
      const current = indices[index];
      const next = indices[(index + 1) % indices.length];
      const from = Math.min(current, next);
      const to = Math.max(current, next);
      const key = `${from}:${to}`;
      if (edgeMap.has(key)) continue;

      const start = toPoint(mesh.vertices[current]);
      const end = toPoint(mesh.vertices[next]);
      if (!start || !end) continue;
      edgeMap.set(key, { id: key, points: [start, end] });
    }
  });

  return Array.from(edgeMap.values());
};

const sampleCurve = (
  curve: Pick<GraphHiddenLineCurveSourceData, 'range' | 'steps' | 'evaluate' | 'closed'>,
  options: GraphHiddenLineOptions
): GraphHiddenLinePoint3D[] => {
  const steps = clampSegments(curve.steps, options.sampling?.curveSegments ?? 64);
  const [start, end] = curve.range;
  const points: GraphHiddenLinePoint3D[] = [];

  for (let index = 0; index <= steps; index += 1) {
    const t = start + (end - start) * (index / steps);
    const point = toPoint(curve.evaluate(t));
    if (point) {
      points.push(point);
    }
  }

  if (curve.closed && points.length > 1) {
    const first = points[0];
    const last = points[points.length - 1];
    if (first.x !== last.x || first.y !== last.y || first.z !== last.z) {
      points.push({ ...first });
    }
  }

  return points;
};

const sampleSurfaceGrid = (surface: GraphHiddenLineSurfaceSourceData, options: GraphHiddenLineOptions): GraphHiddenLinePoint3D[][] => {
  const stepsU = clampSegments(surface.stepsU, options.sampling?.surfaceStepsU ?? 24, 1);
  const stepsV = clampSegments(surface.stepsV, options.sampling?.surfaceStepsV ?? 24, 1);
  const [uStart, uEnd] = surface.uRange;
  const [vStart, vEnd] = surface.vRange;
  const rows: GraphHiddenLinePoint3D[][] = [];

  for (let indexU = 0; indexU <= stepsU; indexU += 1) {
    const row: GraphHiddenLinePoint3D[] = [];
    const u = uStart + (uEnd - uStart) * (indexU / stepsU);
    for (let indexV = 0; indexV <= stepsV; indexV += 1) {
      const v = vStart + (vEnd - vStart) * (indexV / stepsV);
      const point = toPoint(surface.evaluate(u, v));
      row.push(point ?? { x: Number.NaN, y: Number.NaN, z: Number.NaN });
    }
    rows.push(row);
  }

  return rows;
};

const normalizeNativeTargetSpec = (
  entry: GraphHiddenLineNativeTargetSpec | (() => SVGElement | null) | undefined
): GraphHiddenLineNativeTargetSpec | undefined => {
  if (!entry) return undefined;
  if (typeof entry === 'function') {
    return { getElement: entry };
  }
  return entry;
};

const resolveNativeTarget = (
  nativeTargets: Record<string, GraphHiddenLineNativeTargetSpec | (() => SVGElement | null)> | undefined,
  polylineId?: string
): GraphHiddenLineNativeTargetSpec | undefined => {
  if (!nativeTargets) return undefined;
  return normalizeNativeTargetSpec((polylineId ? nativeTargets[polylineId] : undefined) ?? nativeTargets.default);
};

const surfaceFeatureCurvesToPolylines = (
  sourceId: string,
  ownerId: string,
  drawOrder: number,
  style: GraphHiddenLineStyleSpec | undefined,
  overlay: GraphHiddenLineOverlayBehavior | undefined,
  nativeTargets: Record<string, GraphHiddenLineNativeTargetSpec | (() => SVGElement | null)> | undefined,
  featureCurves: GraphHiddenLineSurfaceFeatureCurve[] | undefined,
  options: GraphHiddenLineOptions
): GraphHiddenLineResolvedPolyline[] => {
  if (!featureCurves || featureCurves.length === 0) return [];

  return featureCurves
    .map((featureCurve) => ({
      sourceId,
      ownerId,
      polylineId: featureCurve.id ?? 'default',
      drawOrder,
      style,
      overlay,
      nativeTarget: resolveNativeTarget(nativeTargets, featureCurve.id),
      worldPoints: sampleCurve(featureCurve, options),
      ignoreOwnerOcclusion: featureCurve.ignoreOwnerOcclusion,
      sampleVisibility: featureCurve.sampleVisibility
    }))
    .filter((polyline) => polyline.worldPoints.length >= 2);
};

const resolveMeshSource = (
  record: GraphHiddenLineSourceRecord,
  mesh: GraphHiddenLineMeshSourceData,
  options: GraphHiddenLineOptions
): GraphHiddenLineResolvedSceneSource => {
  const triangles = (record.descriptor.role ?? 'both') === 'edge'
    ? []
    : mesh.faces.flatMap((face) => triangulateFace(face.indices).map((triangle): GraphHiddenLineResolvedTriangle | null => {
        const p0 = toPoint(mesh.vertices[triangle[0]]);
        const p1 = toPoint(mesh.vertices[triangle[1]]);
        const p2 = toPoint(mesh.vertices[triangle[2]]);
        if (!p0 || !p1 || !p2) return null;
        return {
          sourceId: record.id,
          ownerId: record.ownerId,
          drawOrder: record.order,
          style: record.descriptor.style,
          world: [p0, p1, p2] as [GraphHiddenLinePoint3D, GraphHiddenLinePoint3D, GraphHiddenLinePoint3D]
        };
      }).filter((triangle): triangle is GraphHiddenLineResolvedTriangle => !!triangle));

  const polylines = (record.descriptor.role ?? 'both') === 'occluder'
    ? []
    : extractMeshEdges(mesh)
        .map((polyline) => ({
          sourceId: record.id,
          ownerId: record.ownerId,
          polylineId: polyline.id ?? 'default',
          drawOrder: record.order,
          style: record.descriptor.style,
          overlay: record.descriptor.overlay,
          nativeTarget: resolveNativeTarget(record.descriptor.nativeTargets, polyline.id),
          worldPoints: polyline.points.map((point) => ({ ...point })),
          ignoreOwnerOcclusion: polyline.ignoreOwnerOcclusion,
          sampleVisibility: polyline.sampleVisibility
        }))
        .filter((polyline) => polyline.worldPoints.length >= 2);

  return {
    sourceId: record.id,
    ownerId: record.ownerId,
    drawOrder: record.order,
    edgeCount: polylines.length,
    faceCount: triangles.length,
    triangles,
    polylines
  };
};

const resolvePolylineSetSource = (
  record: GraphHiddenLineSourceRecord,
  data: GraphHiddenLinePolylineSetSourceData
): GraphHiddenLineResolvedSceneSource => ({
  sourceId: record.id,
  ownerId: record.ownerId,
  drawOrder: record.order,
  edgeCount: data.polylines.length,
  faceCount: 0,
  triangles: [],
  polylines: data.polylines
    .map((polyline) => ({
      sourceId: record.id,
      ownerId: record.ownerId,
      polylineId: polyline.id ?? 'default',
      drawOrder: record.order,
      style: record.descriptor.style,
      overlay: record.descriptor.overlay,
      nativeTarget: resolveNativeTarget(record.descriptor.nativeTargets, polyline.id),
      worldPoints: polyline.points.map((point) => ({ ...point })),
      ignoreOwnerOcclusion: polyline.ignoreOwnerOcclusion,
      sampleVisibility: polyline.sampleVisibility
    }))
    .filter((polyline) => polyline.worldPoints.length >= 2)
});

const resolveCurveSource = (
  record: GraphHiddenLineSourceRecord,
  curve: GraphHiddenLineCurveSourceData,
  options: GraphHiddenLineOptions
): GraphHiddenLineResolvedSceneSource => {
  const worldPoints = sampleCurve(curve, options);
  return {
    sourceId: record.id,
    ownerId: record.ownerId,
    drawOrder: record.order,
    edgeCount: worldPoints.length >= 2 ? 1 : 0,
    faceCount: 0,
    triangles: [],
    polylines: worldPoints.length >= 2
      ? [{
          sourceId: record.id,
          ownerId: record.ownerId,
          polylineId: 'default',
          drawOrder: record.order,
          style: record.descriptor.style,
          overlay: record.descriptor.overlay,
          nativeTarget: resolveNativeTarget(record.descriptor.nativeTargets, 'default'),
          worldPoints,
          ignoreOwnerOcclusion: curve.ignoreOwnerOcclusion,
          sampleVisibility: curve.sampleVisibility
        }]
      : []
  };
};

const resolveSurfaceSource = (
  record: GraphHiddenLineSourceRecord,
  surface: GraphHiddenLineSurfaceSourceData,
  options: GraphHiddenLineOptions
): GraphHiddenLineResolvedSceneSource => {
  const triangles: GraphHiddenLineResolvedTriangle[] = [];
  const role = record.descriptor.role ?? 'both';

  if (role !== 'edge') {
    const rows = sampleSurfaceGrid(surface, options);
    for (let indexU = 0; indexU < rows.length - 1; indexU += 1) {
      for (let indexV = 0; indexV < rows[indexU].length - 1; indexV += 1) {
        const a = toPoint(rows[indexU][indexV]);
        const b = toPoint(rows[indexU + 1][indexV]);
        const c = toPoint(rows[indexU + 1][indexV + 1]);
        const d = toPoint(rows[indexU][indexV + 1]);
        if (a && b && c) {
          triangles.push({
            sourceId: record.id,
            ownerId: record.ownerId,
            drawOrder: record.order,
            style: record.descriptor.style,
            world: [a, b, c]
          });
        }
        if (a && c && d) {
          triangles.push({
            sourceId: record.id,
            ownerId: record.ownerId,
            drawOrder: record.order,
            style: record.descriptor.style,
            world: [a, c, d]
          });
        }
      }
    }
  }

  const polylines = role === 'occluder'
    ? []
    : surfaceFeatureCurvesToPolylines(
        record.id,
        record.ownerId,
        record.order,
        record.descriptor.style,
        record.descriptor.overlay,
        record.descriptor.nativeTargets,
        surface.featureCurves,
        options
      );

  return {
    sourceId: record.id,
    ownerId: record.ownerId,
    drawOrder: record.order,
    edgeCount: polylines.length,
    faceCount: triangles.length,
    triangles,
    polylines
  };
};

export const resolveHiddenLineSceneSource = (
  record: GraphHiddenLineSourceRecord,
  options: GraphHiddenLineOptions
): GraphHiddenLineResolvedSceneSource | null => {
  const data = record.descriptor.resolve();
  if (!data) return null;

  if (data.kind === 'mesh') return resolveMeshSource(record, data, options);
  if (data.kind === 'polyline-set') return resolvePolylineSetSource(record, data);
  if (data.kind === 'curve') return resolveCurveSource(record, data, options);
  return resolveSurfaceSource(record, data, options);
};
