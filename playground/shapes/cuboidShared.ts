import {
  clampSolidProgress,
  createCuboidSolidTopology,
  degToRad,
  lerpPoint2D,
  lerpPoint3D,
  rotatePointAroundX,
  rotatePointAroundY,
  type GraphShapeApi,
  type GraphSolid2DScene,
  type GraphSolidTopology,
  type GraphSolidPoint2D,
  type GraphSolidPoint3D,
  type GraphSolidPolygonPatch
} from 'vuegraphx';

export const cuboidFaceIds = ['front', 'top', 'right', 'left', 'bottom', 'back'] as const;

export type CuboidFaceId = typeof cuboidFaceIds[number];

interface CuboidFaceVisualStyle {
  fillColor: string;
  fillOpacity: number;
  strokeColor: string;
  strokeWidth: number;
}

export const cuboidFaceStyles: Record<CuboidFaceId, CuboidFaceVisualStyle> = {
  front: {
    fillColor: '#818cf8',
    fillOpacity: 0.96,
    strokeColor: '#3730a3',
    strokeWidth: 2
  },
  top: {
    fillColor: '#c7d2fe',
    fillOpacity: 0.94,
    strokeColor: '#4338ca',
    strokeWidth: 2
  },
  right: {
    fillColor: '#4f46e5',
    fillOpacity: 0.94,
    strokeColor: '#312e81',
    strokeWidth: 2
  },
  left: {
    fillColor: '#a5b4fc',
    fillOpacity: 0.9,
    strokeColor: '#4f46e5',
    strokeWidth: 2
  },
  bottom: {
    fillColor: '#cbd5e1',
    fillOpacity: 0.92,
    strokeColor: '#64748b',
    strokeWidth: 2
  },
  back: {
    fillColor: '#e0e7ff',
    fillOpacity: 0.92,
    strokeColor: '#6366f1',
    strokeWidth: 2
  }
};
const projectedRotationX = degToRad(-28);
const projectedRotationY = degToRad(34);
const topologyCache = new Map<number, GraphSolidTopology>();
const faceCache = new Map<number, Record<CuboidFaceId, GraphSolidPolygonPatch>>();

const toPoint2DTuple = (point: GraphSolidPoint2D): [number, number] => [point.x, point.y];

const toPoint3DTuple = (point: GraphSolidPoint3D): [number, number, number] => [point.x, point.y, point.z];

export const getCuboidTopology = (edgeSize: number): GraphSolidTopology => {
  const cached = topologyCache.get(edgeSize);
  if (cached) return cached;

  const topology = createCuboidSolidTopology({
    width: edgeSize,
    height: edgeSize,
    depth: edgeSize
  });
  topologyCache.set(edgeSize, topology);
  return topology;
};

const getCuboidFaceMap = (edgeSize: number): Record<CuboidFaceId, GraphSolidPolygonPatch> => {
  const cached = faceCache.get(edgeSize);
  if (cached) return cached;

  const topology = getCuboidTopology(edgeSize);

  const faces = cuboidFaceIds.reduce((result, faceId) => {
    const patch = topology.patches.find(
      (candidate): candidate is GraphSolidPolygonPatch => candidate.id === faceId && candidate.kind === 'polygon'
    );

    if (!patch) {
      throw new Error(`Cuboid patch ${faceId} is missing from topology`);
    }

    result[faceId] = patch;
    return result;
  }, {} as Record<CuboidFaceId, GraphSolidPolygonPatch>);

  faceCache.set(edgeSize, faces);
  return faces;
};

const projectFoldedPoint2D = (point: GraphSolidPoint3D): GraphSolidPoint2D => {
  const rotatedX = rotatePointAroundX(point, projectedRotationX);
  const rotated = rotatePointAroundY(rotatedX, projectedRotationY);
  return {
    x: rotated.x,
    y: rotated.y
  };
};

const toNetPlanePoint3D = (point: GraphSolidPoint2D, edgeSize: number): GraphSolidPoint3D => ({
  x: point.x,
  y: point.y,
  z: edgeSize / 2
});

export const shouldShowCuboidFace = (faceId: CuboidFaceId, unfoldProgress: number): boolean => {
  void faceId;
  void unfoldProgress;
  return true;
};

export const getCuboidFaceVertices3D = (
  edgeSize: number,
  unfoldProgress: number,
  rotateProgress: number,
  faceId: CuboidFaceId
): Array<[number, number, number]> => {
  const unfold = clampSolidProgress(unfoldProgress);
  const rotateAngle = rotateProgress * Math.PI * 2;
  const face = getCuboidFaceMap(edgeSize)[faceId];

  return face.folded.vertices.map((foldedPoint, index) => {
    const netPoint = toNetPlanePoint3D(face.net.vertices[index] ?? face.net.vertices[0], edgeSize);
    const unfoldedPoint = lerpPoint3D(foldedPoint, netPoint, unfold);
    return toPoint3DTuple(rotatePointAroundY(unfoldedPoint, rotateAngle));
  });
};

export const getCuboidVertices3D = (
  edgeSize: number,
  unfoldProgress: number,
  rotateProgress: number
): Array<[number, number, number]> => cuboidFaceIds.flatMap((faceId) => getCuboidFaceVertices3D(edgeSize, unfoldProgress, rotateProgress, faceId));

export const getCuboidFaceVertices2D = (
  edgeSize: number,
  unfoldProgress: number,
  faceId: CuboidFaceId,
  anchor: GraphSolidPoint2D = { x: 0, y: 0 }
): Array<[number, number]> => {
  const unfold = clampSolidProgress(unfoldProgress);
  const face = getCuboidFaceMap(edgeSize)[faceId];

  return face.folded.vertices.map((foldedPoint, index) => {
    const foldedProjected = projectFoldedPoint2D(foldedPoint);
    const netPoint = face.net.vertices[index] ?? face.net.vertices[0];
    const currentPoint = lerpPoint2D(foldedProjected, netPoint, unfold);
    return toPoint2DTuple({
      x: currentPoint.x + anchor.x,
      y: currentPoint.y + anchor.y
    });
  });
};

export const getCuboidVertices2D = (
  edgeSize: number,
  unfoldProgress: number,
  anchor: GraphSolidPoint2D = { x: 0, y: 0 }
): Array<[number, number]> => cuboidFaceIds.flatMap((faceId) => getCuboidFaceVertices2D(edgeSize, unfoldProgress, faceId, anchor));

const lerpTuplePoint = (from: [number, number], to: [number, number], t: number): [number, number] => [
  from[0] + (to[0] - from[0]) * t,
  from[1] + (to[1] - from[1]) * t
];

const projectPerspectiveTuple3D = (point: [number, number, number], cameraDistance: number): [number, number] => {
  const perspective = cameraDistance / Math.max(0.001, cameraDistance - point[2]);
  return [point[0] * perspective, point[1] * perspective];
};

const cuboidProxyVertexOrders: Record<CuboidFaceId, [number, number, number, number]> = {
  front: [0, 1, 2, 3],
  top: [0, 1, 2, 3],
  right: [1, 0, 3, 2],
  left: [0, 1, 2, 3],
  bottom: [0, 1, 2, 3],
  back: [1, 0, 3, 2]
};

const remapProxyOutline = (
  faceId: CuboidFaceId,
  outline: Array<[number, number, number]>
): Array<[number, number, number]> => {
  const vertexOrder = cuboidProxyVertexOrders[faceId];
  return vertexOrder.map((index) => outline[index] ?? [0, 0, 0]);
};

const getOutlineBounds = (outlines: Array<Array<[number, number]>>) => {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  outlines.flat().forEach(([x, y]) => {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  });

  return {
    center: [(minX + maxX) / 2, (minY + maxY) / 2] as [number, number],
    spread: Math.max(maxX - minX, maxY - minY)
  };
};

export const getCuboidFoldLikeFaceVertices2D = (
  edgeSize: number,
  unfoldProgress: number,
  faceId: CuboidFaceId,
  anchor: GraphSolidPoint2D = { x: 0, y: 0 }
): Array<[number, number]> => {
  const unfold = clampSolidProgress(unfoldProgress);
  const size = edgeSize;
  const depth = size * 0.375;
  const half = size / 2;
  const foldOffsetX = depth * 0.72;
  const foldOffsetY = depth * 0.38;
  const centerX = anchor.x;
  const centerY = anchor.y;

  const frontTL: [number, number] = [centerX - half, centerY + half];
  const frontTR: [number, number] = [centerX + half, centerY + half];
  const frontBR: [number, number] = [centerX + half, centerY - half];
  const frontBL: [number, number] = [centerX - half, centerY - half];

  const foldedTopOuterL: [number, number] = [frontTL[0] + foldOffsetX, frontTL[1] + foldOffsetY];
  const foldedTopOuterR: [number, number] = [frontTR[0] + foldOffsetX, frontTR[1] + foldOffsetY];
  const foldedRightOuterT: [number, number] = [frontTR[0] + foldOffsetX, frontTR[1] + foldOffsetY];
  const foldedRightOuterB: [number, number] = [frontBR[0] + foldOffsetX, frontBR[1] + foldOffsetY];

  const flatTopOuterL: [number, number] = [frontTL[0], frontTL[1] + size];
  const flatTopOuterR: [number, number] = [frontTR[0], frontTR[1] + size];
  const flatRightOuterT: [number, number] = [frontTR[0] + size, frontTR[1]];
  const flatRightOuterB: [number, number] = [frontBR[0] + size, frontBR[1]];
  const flatLeftOuterT: [number, number] = [frontTL[0] - size, frontTL[1]];
  const flatLeftOuterB: [number, number] = [frontBL[0] - size, frontBL[1]];
  const flatBottomOuterL: [number, number] = [frontBL[0], frontBL[1] - size];
  const flatBottomOuterR: [number, number] = [frontBR[0], frontBR[1] - size];
  const flatBackOuterT: [number, number] = [flatRightOuterT[0] + size, flatRightOuterT[1]];
  const flatBackOuterB: [number, number] = [flatRightOuterB[0] + size, flatRightOuterB[1]];

  const collapsedLeftOuterT: [number, number] = [frontTL[0], frontTL[1]];
  const collapsedLeftOuterB: [number, number] = [frontBL[0], frontBL[1]];
  const collapsedBottomOuterL: [number, number] = [frontBL[0], frontBL[1]];
  const collapsedBottomOuterR: [number, number] = [frontBR[0], frontBR[1]];

  const topOuterL = lerpTuplePoint(foldedTopOuterL, flatTopOuterL, unfold);
  const topOuterR = lerpTuplePoint(foldedTopOuterR, flatTopOuterR, unfold);
  const rightOuterT = lerpTuplePoint(foldedRightOuterT, flatRightOuterT, unfold);
  const rightOuterB = lerpTuplePoint(foldedRightOuterB, flatRightOuterB, unfold);
  const leftOuterT = lerpTuplePoint(collapsedLeftOuterT, flatLeftOuterT, unfold);
  const leftOuterB = lerpTuplePoint(collapsedLeftOuterB, flatLeftOuterB, unfold);
  const bottomOuterL = lerpTuplePoint(collapsedBottomOuterL, flatBottomOuterL, unfold);
  const bottomOuterR = lerpTuplePoint(collapsedBottomOuterR, flatBottomOuterR, unfold);
  const backOuterT = lerpTuplePoint(rightOuterT, flatBackOuterT, unfold);
  const backOuterB = lerpTuplePoint(rightOuterB, flatBackOuterB, unfold);

  if (faceId === 'front') return [frontTL, frontTR, frontBR, frontBL];
  if (faceId === 'top') return [frontTL, frontTR, topOuterR, topOuterL];
  if (faceId === 'right') return [frontTR, rightOuterT, rightOuterB, frontBR];
  if (faceId === 'left') return [leftOuterT, frontTL, frontBL, leftOuterB];
  if (faceId === 'bottom') return [frontBL, frontBR, bottomOuterR, bottomOuterL];
  return [rightOuterT, backOuterT, backOuterB, rightOuterB];
};

export const getCuboidFoldLikeTransformedFaceVertices2D = (options: {
  edgeSize: number;
  unfoldProgress: number;
  rotateProgress?: number;
  explodeProgress?: number;
  faceId: CuboidFaceId;
  patchOrder?: CuboidFaceId[];
  anchor?: GraphSolidPoint2D;
}): Array<[number, number]> => {
  const {
    edgeSize,
    unfoldProgress,
    rotateProgress = 0,
    explodeProgress = 0,
    faceId,
    patchOrder = ['back', 'left', 'bottom', 'front', 'right', 'top'],
    anchor = { x: 0, y: 0 }
  } = options;

  const localOutlines = patchOrder.map((currentFaceId) => getCuboidFoldLikeFaceVertices2D(edgeSize, unfoldProgress, currentFaceId));
  const baselineProxyOutlines = patchOrder.map((currentFaceId) => remapProxyOutline(
    currentFaceId,
    getCuboidFaceVertices3D(edgeSize, unfoldProgress, 0, currentFaceId)
  ));
  const rotatedProxyOutlines = patchOrder.map((currentFaceId) => remapProxyOutline(
    currentFaceId,
    getCuboidFaceVertices3D(edgeSize, unfoldProgress, rotateProgress, currentFaceId)
  ));
  const cameraDistance = edgeSize * 6;
  const rotatedLikeOutlines = patchOrder.map((_, faceIndex) => {
    const localOutline = localOutlines[faceIndex] ?? [];
    const baselineProxy = baselineProxyOutlines[faceIndex] ?? [];
    const rotatedProxy = rotatedProxyOutlines[faceIndex] ?? [];

    return localOutline.map((point, pointIndex) => {
      const baselineProjected = projectPerspectiveTuple3D(baselineProxy[pointIndex] ?? [0, 0, 0], cameraDistance);
      const rotatedProjected = projectPerspectiveTuple3D(rotatedProxy[pointIndex] ?? [0, 0, 0], cameraDistance);
      return [
        point[0] + (rotatedProjected[0] - baselineProjected[0]),
        point[1] + (rotatedProjected[1] - baselineProjected[1])
      ] as [number, number];
    });
  });
  const { center, spread } = getOutlineBounds(rotatedLikeOutlines);
  const explodeDistance = spread * 0.08 * clampSolidProgress(explodeProgress);

  const transformedOutlines = new Map<CuboidFaceId, Array<[number, number]>>();
  patchOrder.forEach((currentFaceId, index) => {
    const outline = rotatedLikeOutlines[index] ?? [];
    const centroid = outline.reduce<[number, number]>((sum, point) => [sum[0] + point[0], sum[1] + point[1]], [0, 0]);
    const normalizedCentroid: [number, number] = outline.length > 0
      ? [centroid[0] / outline.length, centroid[1] / outline.length]
      : center;
    const direction: [number, number] = [normalizedCentroid[0] - center[0], normalizedCentroid[1] - center[1]];
    const directionLength = Math.hypot(direction[0], direction[1]) || 1;
    const explodeShift: [number, number] = [
      direction[0] / directionLength * explodeDistance,
      direction[1] / directionLength * explodeDistance
    ];

    transformedOutlines.set(currentFaceId, outline.map((point, pointIndex) => {
      void pointIndex;
      return [
        point[0] + explodeShift[0] + anchor.x,
        point[1] + explodeShift[1] + anchor.y
      ];
    }));
  });

  return transformedOutlines.get(faceId) ?? [];
};

export const createCuboidFoldLikeScene2D = <StateType>(options: {
  api: GraphShapeApi<StateType>;
  anchor: any;
  edgeSize: number;
  getUnfoldProgress: () => number;
  getRotateProgress?: () => number;
  getExplodeProgress?: () => number;
  patchOrder?: CuboidFaceId[];
}): GraphSolid2DScene => {
  const {
    api,
    anchor,
    edgeSize,
    getUnfoldProgress,
    getRotateProgress = () => 0,
    getExplodeProgress = () => 0,
    patchOrder = ['back', 'left', 'bottom', 'front', 'right', 'top']
  } = options;

  const getAnchorPoint = (): GraphSolidPoint2D => ({ x: anchor.X(), y: anchor.Y() });
  const getOutline = (faceId: CuboidFaceId) => getCuboidFoldLikeTransformedFaceVertices2D({
    edgeSize,
    unfoldProgress: getUnfoldProgress(),
    rotateProgress: getRotateProgress(),
    explodeProgress: getExplodeProgress(),
    faceId,
    patchOrder,
    anchor: getAnchorPoint()
  });
  const patchPolygons: Record<string, any> = {};
  const groupMembers: Record<string, any> = { anchor };
  const hiddenKeys = ['anchor'];

  patchOrder.forEach((faceId) => {
    const points = [0, 1, 2, 3].map((index) => {
      const pointKey = `${faceId}_point_${index}`;
      const point = api.trackObject(api.board.create('point', [
        () => getOutline(faceId)[index]?.[0] ?? getAnchorPoint().x,
        () => getOutline(faceId)[index]?.[1] ?? getAnchorPoint().y
      ], { visible: false, name: '' }));
      groupMembers[pointKey] = point;
      hiddenKeys.push(pointKey);
      return point;
    });

    const style = cuboidFaceStyles[faceId];
    patchPolygons[faceId] = api.trackObject(api.board.create('polygon', points, {
      fillColor: style.fillColor,
      fillOpacity: style.fillOpacity,
      borders: { strokeWidth: style.strokeWidth, strokeColor: style.strokeColor },
      vertices: { visible: false },
      highlight: false,
      fixed: false,
      hasInnerPoints: true,
      visible: true
    }));
    groupMembers[faceId] = patchPolygons[faceId];
  });

  const group = api.createGroup(groupMembers, { createNativeGroup: false });
  group.hide(hiddenKeys);

  return {
    group,
    patchIds: [...patchOrder],
    patchPolygons,
    syncVisibility() {
      Object.values(patchPolygons).forEach((polygon) => {
        polygon.setAttribute({ visible: true });
      });
    },
    getAllPoints() {
      return patchOrder.flatMap((faceId) => getOutline(faceId));
    },
    getPatchOutline(patchId: string) {
      return patchOrder.includes(patchId as CuboidFaceId) ? getOutline(patchId as CuboidFaceId) : [];
    }
  };
};
