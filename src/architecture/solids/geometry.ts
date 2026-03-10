import type {
  GraphSolidBandPatch,
  GraphSolidDefinition,
  GraphSolidDiskPatch,
  GraphSolidHinge,
  GraphSolidPoint2D,
  GraphSolidPoint3D,
  GraphSolidPolygonPatch,
  GraphSolidSectorPatch,
  GraphSolidState,
  GraphSolidTopology
} from './contracts';

const TAU = Math.PI * 2;
const DEFAULT_CURVE_SEGMENTS = 48;

export interface GraphRegularPolygon2DOptions {
  center?: GraphSolidPoint2D;
  sides: number;
  radius?: number;
  sideLength?: number;
  rotation?: number;
}

export interface GraphCuboidParameters {
  width: number;
  height: number;
  depth: number;
  center?: GraphSolidPoint3D;
  netCenter?: GraphSolidPoint2D;
}

export interface GraphCylinderParameters {
  radius: number;
  height: number;
  radialSegments?: number;
  center?: GraphSolidPoint3D;
  netCenter?: GraphSolidPoint2D;
  netGap?: number;
}

export interface GraphConeParameters {
  radius: number;
  height: number;
  radialSegments?: number;
  apex?: GraphSolidPoint3D;
  netCenter?: GraphSolidPoint2D;
  netGap?: number;
}

const assertPositive = (name: string, value: number) => {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a positive finite number`);
  }
};

const normalizeCurveSegments = (value?: number) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return DEFAULT_CURVE_SEGMENTS;
  return Math.max(12, Math.round(value));
};

const createRectangleFace3D = (
  center: GraphSolidPoint3D,
  width: number,
  height: number,
  axisA: keyof GraphSolidPoint3D,
  fixedAxis: keyof GraphSolidPoint3D
): GraphSolidPoint3D[] => {
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  const points: Array<[number, number]> = [
    [-halfWidth, halfHeight],
    [halfWidth, halfHeight],
    [halfWidth, -halfHeight],
    [-halfWidth, -halfHeight]
  ];

  return points.map(([deltaA, deltaB]) => ({
    x: fixedAxis === 'x' ? center.x : axisA === 'x' ? center.x + deltaA : center.x + deltaB,
    y: fixedAxis === 'y' ? center.y : axisA === 'y' ? center.y + deltaA : center.y + deltaB,
    z: fixedAxis === 'z' ? center.z : axisA === 'z' ? center.z + deltaA : center.z + deltaB
  }));
};

export const clampSolidProgress = (value: number): number => Math.min(1, Math.max(0, value));

export const lerp = (from: number, to: number, t: number): number => from + (to - from) * t;

export const degToRad = (degrees: number): number => degrees * Math.PI / 180;

export const translatePoint2D = (point: GraphSolidPoint2D, dx: number, dy: number): GraphSolidPoint2D => ({
  x: point.x + dx,
  y: point.y + dy
});

export const translatePoint3D = (point: GraphSolidPoint3D, dx: number, dy: number, dz: number): GraphSolidPoint3D => ({
  x: point.x + dx,
  y: point.y + dy,
  z: point.z + dz
});

export const lerpPoint2D = (from: GraphSolidPoint2D, to: GraphSolidPoint2D, t: number): GraphSolidPoint2D => ({
  x: lerp(from.x, to.x, t),
  y: lerp(from.y, to.y, t)
});

export const lerpPoint3D = (from: GraphSolidPoint3D, to: GraphSolidPoint3D, t: number): GraphSolidPoint3D => ({
  x: lerp(from.x, to.x, t),
  y: lerp(from.y, to.y, t),
  z: lerp(from.z, to.z, t)
});

export const rotatePointAroundX = (point: GraphSolidPoint3D, radians: number): GraphSolidPoint3D => {
  const cosValue = Math.cos(radians);
  const sinValue = Math.sin(radians);
  return {
    x: point.x,
    y: point.y * cosValue - point.z * sinValue,
    z: point.y * sinValue + point.z * cosValue
  };
};

export const rotatePointAroundY = (point: GraphSolidPoint3D, radians: number): GraphSolidPoint3D => {
  const cosValue = Math.cos(radians);
  const sinValue = Math.sin(radians);
  return {
    x: point.x * cosValue + point.z * sinValue,
    y: point.y,
    z: -point.x * sinValue + point.z * cosValue
  };
};

export const rotatePointAroundZ = (point: GraphSolidPoint3D, radians: number): GraphSolidPoint3D => {
  const cosValue = Math.cos(radians);
  const sinValue = Math.sin(radians);
  return {
    x: point.x * cosValue - point.y * sinValue,
    y: point.x * sinValue + point.y * cosValue,
    z: point.z
  };
};

export const createRectangle2D = (
  width: number,
  height: number,
  center: GraphSolidPoint2D = { x: 0, y: 0 }
): GraphSolidPoint2D[] => {
  assertPositive('width', width);
  assertPositive('height', height);
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  return [
    { x: center.x - halfWidth, y: center.y + halfHeight },
    { x: center.x + halfWidth, y: center.y + halfHeight },
    { x: center.x + halfWidth, y: center.y - halfHeight },
    { x: center.x - halfWidth, y: center.y - halfHeight }
  ];
};

export const computeRegularPolygonRadiusFromSide = (sideLength: number, sides: number): number => {
  assertPositive('sideLength', sideLength);
  if (!Number.isInteger(sides) || sides < 3) {
    throw new Error('sides must be an integer greater than or equal to 3');
  }
  return sideLength / (2 * Math.sin(Math.PI / sides));
};

export const createRegularPolygon2D = ({
  center = { x: 0, y: 0 },
  sides,
  radius,
  sideLength,
  rotation = 0
}: GraphRegularPolygon2DOptions): GraphSolidPoint2D[] => {
  if (!Number.isInteger(sides) || sides < 3) {
    throw new Error('sides must be an integer greater than or equal to 3');
  }
  const resolvedRadius = radius ?? (typeof sideLength === 'number' ? computeRegularPolygonRadiusFromSide(sideLength, sides) : null);
  if (resolvedRadius === null) {
    throw new Error('createRegularPolygon2D requires either radius or sideLength');
  }
  assertPositive('radius', resolvedRadius);

  return Array.from({ length: sides }, (_, index) => {
    const angle = rotation + Math.PI / 2 - index * TAU / sides;
    return {
      x: center.x + Math.cos(angle) * resolvedRadius,
      y: center.y + Math.sin(angle) * resolvedRadius
    };
  });
};

export const createSolidState = (overrides: Partial<GraphSolidState> = {}): GraphSolidState => ({
  rotationX: overrides.rotationX ?? degToRad(-18),
  rotationY: overrides.rotationY ?? degToRad(28),
  rotationZ: overrides.rotationZ ?? 0,
  unfoldProgress: clampSolidProgress(overrides.unfoldProgress ?? 0),
  explodeProgress: clampSolidProgress(overrides.explodeProgress ?? 0),
  viewMode: overrides.viewMode ?? 'projected'
});

export const createCuboidSolidTopology = ({
  width,
  height,
  depth,
  center = { x: 0, y: 0, z: 0 },
  netCenter = { x: 0, y: 0 }
}: GraphCuboidParameters): GraphSolidTopology => {
  assertPositive('width', width);
  assertPositive('height', height);
  assertPositive('depth', depth);

  const halfDepth = depth / 2;
  const frontCenter = { x: center.x, y: center.y, z: center.z + halfDepth };
  const backCenter = { x: center.x, y: center.y, z: center.z - halfDepth };
  const topCenter = { x: center.x, y: center.y + height / 2, z: center.z };
  const bottomCenter = { x: center.x, y: center.y - height / 2, z: center.z };
  const leftCenter = { x: center.x - width / 2, y: center.y, z: center.z };
  const rightCenter = { x: center.x + width / 2, y: center.y, z: center.z };

  const frontNetCenter = netCenter;
  const topNetCenter = translatePoint2D(netCenter, 0, height);
  const bottomNetCenter = translatePoint2D(netCenter, 0, -height);
  const leftNetCenter = translatePoint2D(netCenter, -width, 0);
  const rightNetCenter = translatePoint2D(netCenter, width, 0);
  const backNetCenter = translatePoint2D(netCenter, width * 2, 0);

  const makeFace = (
    id: string,
    label: string,
    foldedVertices: GraphSolidPoint3D[],
    netVertices: GraphSolidPoint2D[],
    style: GraphSolidPolygonPatch['style']
  ): GraphSolidPolygonPatch => ({
    id,
    label,
    kind: 'polygon',
    folded: {
      vertices: foldedVertices,
      edgeIds: ['top', 'right', 'bottom', 'left']
    },
    net: {
      vertices: netVertices,
      edgeIds: ['top', 'right', 'bottom', 'left']
    },
    style
  });

  const patches: GraphSolidPolygonPatch[] = [
    makeFace('front', 'Front', createRectangleFace3D(frontCenter, width, height, 'x', 'z'), createRectangle2D(width, height, frontNetCenter), {
      fillColor: '#818cf8',
      fillOpacity: 0.95,
      strokeColor: '#3730a3',
      strokeWidth: 2
    }),
    makeFace('top', 'Top', createRectangleFace3D(topCenter, width, depth, 'x', 'y'), createRectangle2D(width, depth, topNetCenter), {
      fillColor: '#c7d2fe',
      fillOpacity: 0.92,
      strokeColor: '#4338ca',
      strokeWidth: 2
    }),
    makeFace('bottom', 'Bottom', createRectangleFace3D(bottomCenter, width, depth, 'x', 'y'), createRectangle2D(width, depth, bottomNetCenter), {
      fillColor: '#cbd5e1',
      fillOpacity: 0.9,
      strokeColor: '#64748b',
      strokeWidth: 2
    }),
    makeFace('left', 'Left', createRectangleFace3D(leftCenter, depth, height, 'z', 'x'), createRectangle2D(depth, height, leftNetCenter), {
      fillColor: '#a5b4fc',
      fillOpacity: 0.92,
      strokeColor: '#4f46e5',
      strokeWidth: 2
    }),
    makeFace('right', 'Right', createRectangleFace3D(rightCenter, depth, height, 'z', 'x'), createRectangle2D(depth, height, rightNetCenter), {
      fillColor: '#4f46e5',
      fillOpacity: 0.92,
      strokeColor: '#312e81',
      strokeWidth: 2
    }),
    makeFace('back', 'Back', createRectangleFace3D(backCenter, width, height, 'x', 'z'), createRectangle2D(width, height, backNetCenter), {
      fillColor: '#e0e7ff',
      fillOpacity: 0.92,
      strokeColor: '#6366f1',
      strokeWidth: 2
    })
  ];

  const hinges: GraphSolidHinge[] = [
    { id: 'front-top', parentPatchId: 'front', childPatchId: 'top', parentEdgeId: 'top', childEdgeId: 'bottom', foldedAngle: Math.PI / 2, unfoldedAngle: Math.PI, direction: 1 },
    { id: 'front-bottom', parentPatchId: 'front', childPatchId: 'bottom', parentEdgeId: 'bottom', childEdgeId: 'top', foldedAngle: Math.PI / 2, unfoldedAngle: Math.PI, direction: -1 },
    { id: 'front-left', parentPatchId: 'front', childPatchId: 'left', parentEdgeId: 'left', childEdgeId: 'right', foldedAngle: Math.PI / 2, unfoldedAngle: Math.PI, direction: -1 },
    { id: 'front-right', parentPatchId: 'front', childPatchId: 'right', parentEdgeId: 'right', childEdgeId: 'left', foldedAngle: Math.PI / 2, unfoldedAngle: Math.PI, direction: 1 },
    { id: 'right-back', parentPatchId: 'right', childPatchId: 'back', parentEdgeId: 'right', childEdgeId: 'left', foldedAngle: Math.PI / 2, unfoldedAngle: Math.PI, direction: 1 }
  ];

  return {
    rootPatchId: 'front',
    patches,
    hinges,
    metadata: { width, height, depth }
  };
};

export const createCylinderSolidTopology = ({
  radius,
  height,
  radialSegments,
  center = { x: 0, y: 0, z: 0 },
  netCenter = { x: 0, y: 0 },
  netGap = radius * 0.35
}: GraphCylinderParameters): GraphSolidTopology => {
  assertPositive('radius', radius);
  assertPositive('height', height);
  assertPositive('netGap', netGap);

  const segments = normalizeCurveSegments(radialSegments);
  const circumference = TAU * radius;

  const lateralPatch: GraphSolidBandPatch = {
    id: 'lateral',
    label: 'Lateral',
    kind: 'band',
    folded: {
      topCenter: { x: center.x, y: center.y + height / 2, z: center.z },
      bottomCenter: { x: center.x, y: center.y - height / 2, z: center.z },
      radius,
      height,
      startAngle: 0,
      sweepAngle: TAU,
      segments
    },
    net: {
      outline: createRectangle2D(circumference, height, netCenter),
      width: circumference,
      height,
      edgeIds: ['top', 'right', 'bottom', 'left']
    },
    style: {
      fillColor: '#93c5fd',
      fillOpacity: 0.9,
      strokeColor: '#1d4ed8',
      strokeWidth: 2
    }
  };

  const topPatch: GraphSolidDiskPatch = {
    id: 'top',
    label: 'Top',
    kind: 'disk',
    folded: {
      center: { x: center.x, y: center.y + height / 2, z: center.z },
      normal: { x: 0, y: 1, z: 0 },
      radius,
      segments
    },
    net: {
      center: translatePoint2D(netCenter, 0, height / 2 + radius + netGap),
      radius,
      segments
    },
    style: {
      fillColor: '#dbeafe',
      fillOpacity: 0.92,
      strokeColor: '#2563eb',
      strokeWidth: 2
    }
  };

  const bottomPatch: GraphSolidDiskPatch = {
    id: 'bottom',
    label: 'Bottom',
    kind: 'disk',
    folded: {
      center: { x: center.x, y: center.y - height / 2, z: center.z },
      normal: { x: 0, y: -1, z: 0 },
      radius,
      segments
    },
    net: {
      center: translatePoint2D(netCenter, 0, -(height / 2 + radius + netGap)),
      radius,
      segments
    },
    style: {
      fillColor: '#eff6ff',
      fillOpacity: 0.92,
      strokeColor: '#1d4ed8',
      strokeWidth: 2
    }
  };

  return {
    rootPatchId: 'lateral',
    patches: [lateralPatch, topPatch, bottomPatch],
    hinges: [
      { id: 'lateral-top', parentPatchId: 'lateral', childPatchId: 'top', parentEdgeId: 'top', childEdgeId: 'rim', foldedAngle: Math.PI / 2, unfoldedAngle: Math.PI, direction: 1 },
      { id: 'lateral-bottom', parentPatchId: 'lateral', childPatchId: 'bottom', parentEdgeId: 'bottom', childEdgeId: 'rim', foldedAngle: Math.PI / 2, unfoldedAngle: Math.PI, direction: -1 }
    ],
    metadata: {
      radius,
      height,
      circumference,
      radialSegments: segments
    }
  };
};

export const getConeSlantHeight = (radius: number, height: number): number => {
  assertPositive('radius', radius);
  assertPositive('height', height);
  return Math.hypot(radius, height);
};

export const getConeSectorAngle = (radius: number, height: number): number => {
  const slantHeight = getConeSlantHeight(radius, height);
  return TAU * radius / slantHeight;
};

export const createConeSolidTopology = ({
  radius,
  height,
  radialSegments,
  apex = { x: 0, y: height / 2, z: 0 },
  netCenter = { x: 0, y: 0 },
  netGap = radius * 0.35
}: GraphConeParameters): GraphSolidTopology => {
  assertPositive('radius', radius);
  assertPositive('height', height);
  assertPositive('netGap', netGap);

  const segments = normalizeCurveSegments(radialSegments);
  const slantHeight = getConeSlantHeight(radius, height);
  const sectorAngle = getConeSectorAngle(radius, height);

  const lateralPatch: GraphSolidSectorPatch = {
    id: 'lateral',
    label: 'Lateral',
    kind: 'sector',
    folded: {
      apex,
      baseCenter: { x: apex.x, y: apex.y - height, z: apex.z },
      axis: { x: 0, y: -1, z: 0 },
      baseRadius: radius,
      slantHeight,
      segments
    },
    net: {
      center: netCenter,
      radius: slantHeight,
      startAngle: -sectorAngle / 2,
      sweepAngle: sectorAngle,
      segments
    },
    style: {
      fillColor: '#fcd34d',
      fillOpacity: 0.9,
      strokeColor: '#b45309',
      strokeWidth: 2
    }
  };

  const basePatch: GraphSolidDiskPatch = {
    id: 'base',
    label: 'Base',
    kind: 'disk',
    folded: {
      center: { x: apex.x, y: apex.y - height, z: apex.z },
      normal: { x: 0, y: -1, z: 0 },
      radius,
      segments
    },
    net: {
      center: translatePoint2D(netCenter, slantHeight + radius + netGap, 0),
      radius,
      segments
    },
    style: {
      fillColor: '#fef3c7',
      fillOpacity: 0.94,
      strokeColor: '#d97706',
      strokeWidth: 2
    }
  };

  return {
    rootPatchId: 'lateral',
    patches: [lateralPatch, basePatch],
    hinges: [
      { id: 'lateral-base', parentPatchId: 'lateral', childPatchId: 'base', parentEdgeId: 'arc', childEdgeId: 'rim', foldedAngle: Math.PI / 2, unfoldedAngle: Math.PI, direction: 1 }
    ],
    metadata: {
      radius,
      height,
      slantHeight,
      sectorAngle,
      radialSegments: segments
    }
  };
};

export const createCuboidSolidDefinition = (): GraphSolidDefinition<GraphCuboidParameters> => ({
  type: 'cuboid-solid',
  label: 'Cuboid Solid',
  createTopology: createCuboidSolidTopology,
  createState: createSolidState
});

export const createCylinderSolidDefinition = (): GraphSolidDefinition<GraphCylinderParameters> => ({
  type: 'cylinder-solid',
  label: 'Cylinder Solid',
  createTopology: createCylinderSolidTopology,
  createState: createSolidState
});

export const createConeSolidDefinition = (): GraphSolidDefinition<GraphConeParameters> => ({
  type: 'cone-solid',
  label: 'Cone Solid',
  createTopology: createConeSolidTopology,
  createState: createSolidState
});
