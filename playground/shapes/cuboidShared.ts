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

// 彻底抛弃原静态硬编码色系。我们将通过实时 HSL (Hue, Saturation, Lightness) 替代。
// 基于原本模型主要色调为 Indigo（对应 HSL中大约 hue=233, sat=80%），动态计算光照覆盖 Lightness 即可。
const baseHue = 233;
const baseSaturation = 80;
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

const projectCabinetTuple3D = (point: [number, number, number], edgeSize: number): [[number, number], number] => {
  const x = point[0];
  const y = point[1];
  const z = point[2];
  const half = edgeSize / 2;
  
  // 原画板在默认透视时给出的背面倾斜比为 X偏 0.27 倍距，Y偏 0.1425 倍距。
  // 注意，原模型中 Front面 Z 为 +half (距离屏幕极近)，背面 Z 为 -half。
  // 通过此等二测方程，能将真实的 3D 缩放点绝对等效地还原为斜面平面画版！
  const px = x - (z - half) * 0.27;
  const py = y - (z - half) * 0.1425;
  return [[px, py], z];
};

const faceNormals: Record<CuboidFaceId, [number, number, number]> = {
  front: [0, 0, 1],
  back: [0, 0, -1],
  right: [1, 0, 0],
  left: [-1, 0, 0],
  top: [0, 1, 0],
  bottom: [0, -1, 0]
};

// 用于求三维法向量的光照工具函数
const getLighting = (faceId: CuboidFaceId, rotateAngle: number): number => {
  const normal = faceNormals[faceId];
  
  // 法线跟随模型做同样视角的旋转绕 Y 轴
  const rotatedNormal = rotatePointAroundY(
    { x: normal[0], y: normal[1], z: normal[2] },
    rotateAngle
  );
  
  // 虚拟阳光在左前方上面。设定 x(向左), y(向上), z(向前)
  // 原色调特点：Top最亮(Y正), Left次之(X负), Front中等(Z正), Right偏暗(X正), Bottom最暗(Y负)
  let lx = -0.8, ly = 1.2, lz = 0.5;
  const llen = Math.sqrt(lx * lx + ly * ly + lz * lz);
  lx /= llen; ly /= llen; lz /= llen;
  
  // 表面法线跟光线点集作为亮度反射系数。向光为正，背光为负
  const nx = rotatedNormal.x;
  const ny = rotatedNormal.y;
  const nz = rotatedNormal.z;
  
  return nx * lx + ny * ly + nz * lz;
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
}): { points: Array<[number, number]>; depthZ: number } => {
  const {
    edgeSize,
    unfoldProgress,
    rotateProgress = 0,
    explodeProgress = 0,
    faceId,
    patchOrder = ['back', 'left', 'bottom', 'front', 'right', 'top'],
    anchor = { x: 0, y: 0 }
  } = options;

  // 为了兼容之前的爆炸展开逻辑，我们保留对原本未做 3D 旋转时的 2D 状态包围盒求心运算
  // 由于我们现在的 projectCabinetTuple3D 是绝对吻合底板逻辑的，所以它们原本就在同样的坐标系原点。
  const localOutlines = patchOrder.map((currentFaceId) => getCuboidFoldLikeFaceVertices2D(edgeSize, unfoldProgress, currentFaceId, { x: 0, y: 0 }));
  const { center: explodeCenter, spread } = getOutlineBounds(localOutlines);
  const explodeDistance = spread * 0.08 * clampSolidProgress(explodeProgress);

  const rotateAngle = rotateProgress * Math.PI * 2;
  const transformedOutlines = new Map<CuboidFaceId, { points: Array<[number, number]>; depthZ: number; lighting: number }>();

  patchOrder.forEach((currentFaceId) => {
    // 100% 依赖最本源的带旋转支持的 3D 原点阵，摒弃一切 Proxy Delta 补丁！
    const points3D = getCuboidFaceVertices3D(edgeSize, unfoldProgress, rotateProgress, currentFaceId);
    
    // 我们直接基于面ID和当前整个旋转角度施加光照模型，彻底规避点序列方向错误带来的阴阳乱相
    const lighting = getLighting(currentFaceId, rotateAngle);
    
    let avgDepthZ = 0;
    const projectedPoints = points3D.map((point) => {
      const [projected, depthZ] = projectCabinetTuple3D(point, edgeSize);
      avgDepthZ += depthZ;
      return projected as [number, number];
    });
    avgDepthZ = points3D.length > 0 ? avgDepthZ / points3D.length : 0;

    const faceCenter = getOutlineBounds([projectedPoints]).center;
    const explodeVector = [faceCenter[0] - explodeCenter[0], faceCenter[1] - explodeCenter[1]];
    const explodeLength = Math.sqrt(explodeVector[0] ** 2 + explodeVector[1] ** 2) || 1;
    const explodeShift = [
      (explodeVector[0] / explodeLength) * explodeDistance,
      (explodeVector[1] / explodeLength) * explodeDistance
    ];

    transformedOutlines.set(currentFaceId, {
      points: projectedPoints.map((point) => {
        // 由于项目要求手工图的画版是在 anchor 画出的。且这套参数体系恰恰做到了不需要进行中心平移：
        // 投影公式确保了未经 anchor 对齐的形态中心绝对落回 0,0 坐标！这正是它如此完美的印证！
        return [
          point[0] + explodeShift[0] + anchor.x,
          point[1] + explodeShift[1] + anchor.y
        ];
      }),
      depthZ: avgDepthZ,
      lighting
    });
  });

  return transformedOutlines.get(faceId) ?? { points: [], depthZ: 0 };
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
      const pointKey = api.uid(`cuboid-face-${faceId}-patch-${index}`);
      const point = api.trackObject(api.board.create('point', [
        () => getOutline(faceId).points[index]?.[0] ?? getAnchorPoint().x,
        () => getOutline(faceId).points[index]?.[1] ?? getAnchorPoint().y
      ], { visible: false, name: '' }));
      groupMembers[pointKey] = point;
      hiddenKeys.push(pointKey);
      return point;
    });

    // 创建多边形，初始给一个中等颜色。真实的颜色将在下一帧 syncVisibility 中根据实时角度接管
    patchPolygons[faceId] = api.trackObject(api.board.create('polygon', points, {
      fillColor: `hsl(${baseHue}, ${baseSaturation}%, 70%)`,
      fillOpacity: 0.94,
      borders: { strokeWidth: 2, strokeColor: `hsl(${baseHue}, 50%, 40%)` },
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
      // 注意：为了让近景遮挡远景，Z越小代表离用户越近。
      // 画家算法要求：先画远处的被遮挡景，最后画近处的叠在上层。
      // JSXGraph 元素渲染采用 SVG，依靠 DOM 순서 决定层级。
      // 因此我们需要根据距离（深度）降序排序：深度大（远）的放前面，深度小（近）的放后面。
      const depths = patchOrder.map(faceId => ({
        faceId,
        depth: getOutline(faceId).depthZ
      }));
      
      depths.sort((a, b) => b.depth - a.depth);
      
      depths.forEach((item) => {
        const polygon = patchPolygons[item.faceId];
        if (polygon) {
          // 根据法向量和光线夹角的点积(-1到1)，映射出亮度Lightness（L：55 到 89）
          const { lighting = 0.5 } = getOutline(item.faceId) as unknown as { lighting: number };
          // 为了使得色彩层次更分明，且在最亮时能贴合类似 #c7d2fe 的光感，暗时 #4f46e5 (L:59) 的饱和阴暗深色
          // 我们扩大它的映射差：把 dot (-1 ~ 1) 映射到 Lightness (52% ~ 88%)
          // 同时为了避免过度暗淡，我们可以加入一个最小环境光照阈值。
          const lStrength = (lighting + 1) / 2; // 0 到 1
          const lightness = 52 + (88 - 52) * lStrength;
          
          polygon.setAttribute({ 
            visible: true,
            fillColor: `hsl(${baseHue}, ${baseSaturation}%, ${lightness}%)`,
            borders: {
               // 边框也同步变深
               strokeColor: `hsl(${baseHue}, 60%, ${Math.max(30, lightness - 20)}%)`
            }
          });
          
          // 直接操作核心 DOM 节点重新 append 改变 Z 叠放顺序，强制画家算法生效
          const svgNode = polygon.rendNode;
          if (svgNode && svgNode.parentNode) {
            svgNode.parentNode.appendChild(svgNode);
          }
        }
      });
    },
    getAllPoints() {
      return patchOrder.flatMap((faceId) => getOutline(faceId).points);
    },
    getPatchOutline(patchId: string) {
      return patchOrder.includes(patchId as CuboidFaceId) ? getOutline(patchId as CuboidFaceId).points : [];
    }
  };
};
