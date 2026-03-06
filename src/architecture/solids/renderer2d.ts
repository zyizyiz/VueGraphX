import type {
  GraphSolidBandPatch,
  GraphSolidDefinition,
  GraphSolidDiskPatch,
  GraphSolidPatch,
  GraphSolidPoint2D,
  GraphSolidPoint3D,
  GraphSolidSectorPatch,
  GraphSolidState,
  GraphSolidTopology,
  GraphSolidVector3D,
  GraphSolidViewMode
} from './contracts';
import { clampSolidProgress, createSolidState, lerpPoint2D, rotatePointAroundX, rotatePointAroundY, rotatePointAroundZ } from './geometry';

const TAU = Math.PI * 2;
const DEFAULT_SEGMENTS = 48;

export interface GraphSolidRenderPatch2D {
  patchId: string;
  kind: GraphSolidPatch['kind'];
  outline: GraphSolidPoint2D[];
  depth: number;
  visible: boolean;
  style?: GraphSolidPatch['style'];
  renderMode: GraphSolidViewMode;
}

export interface GraphSolidRenderResult2D {
  patches: GraphSolidRenderPatch2D[];
}

export interface GraphSolidRenderOptions2D {
  anchor?: GraphSolidPoint2D;
  curveSegments?: number;
  sortByDepth?: boolean;
  isPatchVisible?: (patch: GraphSolidPatch) => boolean;
}

const normalize = (vector: GraphSolidVector3D): GraphSolidVector3D => {
  const length = Math.hypot(vector.x, vector.y, vector.z);
  if (length < 1e-8) {
    return { x: 0, y: 0, z: 1 };
  }
  return {
    x: vector.x / length,
    y: vector.y / length,
    z: vector.z / length
  };
};

const cross = (a: GraphSolidVector3D, b: GraphSolidVector3D): GraphSolidVector3D => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x
});

const add3D = (point: GraphSolidPoint3D, vector: GraphSolidVector3D): GraphSolidPoint3D => ({
  x: point.x + vector.x,
  y: point.y + vector.y,
  z: point.z + vector.z
});

const scale = (vector: GraphSolidVector3D, factor: number): GraphSolidVector3D => ({
  x: vector.x * factor,
  y: vector.y * factor,
  z: vector.z * factor
});

const resolveCurveSegments = (patch: GraphSolidPatch, fallback: number): number => {
  if (patch.kind === 'band') return Math.max(12, patch.folded.segments || fallback);
  if (patch.kind === 'disk') return Math.max(12, patch.folded.segments || fallback);
  if (patch.kind === 'sector') return Math.max(12, patch.folded.segments || fallback);
  return fallback;
};

const rotate3D = (point: GraphSolidPoint3D, state: GraphSolidState): GraphSolidPoint3D => {
  const rotatedX = rotatePointAroundX(point, state.rotationX);
  const rotatedXY = rotatePointAroundY(rotatedX, state.rotationY);
  return rotatePointAroundZ(rotatedXY, state.rotationZ);
};

const project3D = (point: GraphSolidPoint3D): GraphSolidPoint2D => ({ x: point.x, y: point.y });

const resolveBasis = (normal: GraphSolidVector3D): [GraphSolidVector3D, GraphSolidVector3D] => {
  const axis = normalize(normal);
  const helper = Math.abs(axis.z) < 0.95
    ? { x: 0, y: 0, z: 1 }
    : { x: 0, y: 1, z: 0 };
  const tangent = normalize(cross(axis, helper));
  const bitangent = normalize(cross(axis, tangent));
  return [tangent, bitangent];
};

const sampleCircle3D = (
  center: GraphSolidPoint3D,
  normal: GraphSolidVector3D,
  radius: number,
  segments: number,
  startAngle = 0,
  sweepAngle = TAU
): GraphSolidPoint3D[] => {
  const [tangent, bitangent] = resolveBasis(normal);
  const safeSegments = Math.max(12, segments);
  return Array.from({ length: safeSegments + 1 }, (_, index) => {
    const t = index / safeSegments;
    const angle = startAngle + sweepAngle * t;
    const radial = {
      x: tangent.x * Math.cos(angle) + bitangent.x * Math.sin(angle),
      y: tangent.y * Math.cos(angle) + bitangent.y * Math.sin(angle),
      z: tangent.z * Math.cos(angle) + bitangent.z * Math.sin(angle)
    };
    return add3D(center, scale(radial, radius));
  });
};

const sampleCircle2D = (
  center: GraphSolidPoint2D,
  radius: number,
  segments: number,
  startAngle = 0,
  sweepAngle = TAU
): GraphSolidPoint2D[] => {
  const safeSegments = Math.max(12, segments);
  return Array.from({ length: safeSegments + 1 }, (_, index) => {
    const t = index / safeSegments;
    const angle = startAngle + sweepAngle * t;
    return {
      x: center.x + Math.cos(angle) * radius,
      y: center.y + Math.sin(angle) * radius
    };
  });
};

const sampleBandProjected = (patch: GraphSolidBandPatch, state: GraphSolidState, segments: number): GraphSolidPoint2D[] => {
  const axis = normalize({
    x: patch.folded.bottomCenter.x - patch.folded.topCenter.x,
    y: patch.folded.bottomCenter.y - patch.folded.topCenter.y,
    z: patch.folded.bottomCenter.z - patch.folded.topCenter.z
  });
  const top = sampleCircle3D(
    patch.folded.topCenter,
    axis,
    patch.folded.radius,
    segments,
    patch.folded.startAngle,
    patch.folded.sweepAngle
  ).map((point) => project3D(rotate3D(point, state)));
  const bottom = sampleCircle3D(
    patch.folded.bottomCenter,
    axis,
    patch.folded.radius,
    segments,
    patch.folded.startAngle,
    patch.folded.sweepAngle
  ).map((point) => project3D(rotate3D(point, state))).reverse();
  return [...top, ...bottom];
};

const sampleBandNet = (patch: GraphSolidBandPatch, segments: number): GraphSolidPoint2D[] => {
  const halfWidth = patch.net.width / 2;
  const halfHeight = patch.net.height / 2;
  const safeSegments = Math.max(12, segments);
  const top = Array.from({ length: safeSegments + 1 }, (_, index) => {
    const t = index / safeSegments;
    return {
      x: patch.net.outline[0].x + (patch.net.outline[1].x - patch.net.outline[0].x) * t,
      y: patch.net.outline[0].y
    };
  });
  const bottom = Array.from({ length: safeSegments + 1 }, (_, index) => {
    const t = index / safeSegments;
    return {
      x: patch.net.outline[2].x + (patch.net.outline[3].x - patch.net.outline[2].x) * t,
      y: patch.net.outline[2].y
    };
  });
  if (Number.isNaN(halfWidth + halfHeight)) {
    return [...top, ...bottom.reverse()];
  }
  return [...top, ...bottom.reverse()];
};

const sampleDiskProjected = (patch: GraphSolidDiskPatch, state: GraphSolidState, segments: number): GraphSolidPoint2D[] => {
  return sampleCircle3D(
    patch.folded.center,
    patch.folded.normal,
    patch.folded.radius,
    segments
  ).map((point) => project3D(rotate3D(point, state)));
};

const sampleDiskNet = (patch: GraphSolidDiskPatch, segments: number): GraphSolidPoint2D[] => {
  return sampleCircle2D(patch.net.center, patch.net.radius, segments);
};

const sampleSectorProjected = (patch: GraphSolidSectorPatch, state: GraphSolidState, segments: number): GraphSolidPoint2D[] => {
  const rim = sampleCircle3D(
    patch.folded.baseCenter,
    patch.folded.axis,
    patch.folded.baseRadius,
    segments,
    -Math.PI / 2,
    Math.PI
  ).map((point) => project3D(rotate3D(point, state)));
  return [project3D(rotate3D(patch.folded.apex, state)), ...rim];
};

const sampleSectorNet = (patch: GraphSolidSectorPatch, segments: number): GraphSolidPoint2D[] => {
  return [
    patch.net.center,
    ...sampleCircle2D(patch.net.center, patch.net.radius, segments, patch.net.startAngle, patch.net.sweepAngle)
  ];
};

const averageDepth = (points: GraphSolidPoint3D[]): number => {
  if (points.length === 0) return 0;
  return points.reduce((sum, point) => sum + point.z, 0) / points.length;
};

const getPolygonProjected = (patch: Extract<GraphSolidPatch, { kind: 'polygon' }>, state: GraphSolidState) => {
  const rotated = patch.folded.vertices.map((point) => rotate3D(point, state));
  return {
    outline: rotated.map(project3D),
    depth: averageDepth(rotated)
  };
};

const getBandProjected = (patch: GraphSolidBandPatch, state: GraphSolidState, segments: number) => {
  const outline3DTop = sampleCircle3D(
    patch.folded.topCenter,
    {
      x: patch.folded.bottomCenter.x - patch.folded.topCenter.x,
      y: patch.folded.bottomCenter.y - patch.folded.topCenter.y,
      z: patch.folded.bottomCenter.z - patch.folded.topCenter.z
    },
    patch.folded.radius,
    segments,
    patch.folded.startAngle,
    patch.folded.sweepAngle
  );
  const outline3DBottom = sampleCircle3D(
    patch.folded.bottomCenter,
    {
      x: patch.folded.bottomCenter.x - patch.folded.topCenter.x,
      y: patch.folded.bottomCenter.y - patch.folded.topCenter.y,
      z: patch.folded.bottomCenter.z - patch.folded.topCenter.z
    },
    patch.folded.radius,
    segments,
    patch.folded.startAngle,
    patch.folded.sweepAngle
  );
  const rotated = [...outline3DTop, ...outline3DBottom].map((point) => rotate3D(point, state));
  return {
    outline: sampleBandProjected(patch, state, segments),
    depth: averageDepth(rotated)
  };
};

const getDiskProjected = (patch: GraphSolidDiskPatch, state: GraphSolidState, segments: number) => {
  const rotated = sampleCircle3D(patch.folded.center, patch.folded.normal, patch.folded.radius, segments).map((point) => rotate3D(point, state));
  return {
    outline: sampleDiskProjected(patch, state, segments),
    depth: averageDepth(rotated)
  };
};

const getSectorProjected = (patch: GraphSolidSectorPatch, state: GraphSolidState, segments: number) => {
  const rim = sampleCircle3D(patch.folded.baseCenter, patch.folded.axis, patch.folded.baseRadius, segments, -Math.PI / 2, Math.PI);
  const rotated = [patch.folded.apex, ...rim].map((point) => rotate3D(point, state));
  return {
    outline: sampleSectorProjected(patch, state, segments),
    depth: averageDepth(rotated)
  };
};

const getProjectedPatch = (patch: GraphSolidPatch, state: GraphSolidState, segments: number) => {
  if (patch.kind === 'polygon') return getPolygonProjected(patch, state);
  if (patch.kind === 'band') return getBandProjected(patch, state, segments);
  if (patch.kind === 'disk') return getDiskProjected(patch, state, segments);
  return getSectorProjected(patch, state, segments);
};

const getNetOutline = (patch: GraphSolidPatch, segments: number): GraphSolidPoint2D[] => {
  if (patch.kind === 'polygon') return patch.net.vertices;
  if (patch.kind === 'band') return sampleBandNet(patch, segments);
  if (patch.kind === 'disk') return sampleDiskNet(patch, segments);
  return sampleSectorNet(patch, segments);
};

const getBounds = (patches: GraphSolidRenderPatch2D[]) => {
  const points = patches.flatMap((patch) => patch.outline);
  if (points.length === 0) {
    return { center: { x: 0, y: 0 }, spread: 0 };
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  points.forEach((point) => {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  });
  return {
    center: { x: (minX + maxX) / 2, y: (minY + maxY) / 2 },
    spread: Math.max(maxX - minX, maxY - minY)
  };
};

const applyExplode = (patches: GraphSolidRenderPatch2D[], explodeProgress: number, anchor: GraphSolidPoint2D) => {
  const progress = clampSolidProgress(explodeProgress);
  if (progress <= 0.0001) {
    return patches.map((patch) => ({
      ...patch,
      outline: patch.outline.map((point) => ({ x: point.x + anchor.x, y: point.y + anchor.y }))
    }));
  }

  const bounds = getBounds(patches);
  const distance = Math.max(bounds.spread * 0.08, 0.18) * progress;

  return patches.map((patch) => {
    const centroid = patch.outline.reduce((sum, point) => ({ x: sum.x + point.x, y: sum.y + point.y }), { x: 0, y: 0 });
    const normalizedCentroid = patch.outline.length > 0
      ? { x: centroid.x / patch.outline.length, y: centroid.y / patch.outline.length }
      : bounds.center;
    const direction = {
      x: normalizedCentroid.x - bounds.center.x,
      y: normalizedCentroid.y - bounds.center.y
    };
    const directionLength = Math.hypot(direction.x, direction.y) || 1;
    const shift = {
      x: direction.x / directionLength * distance,
      y: direction.y / directionLength * distance
    };

    return {
      ...patch,
      outline: patch.outline.map((point) => ({
        x: point.x + shift.x + anchor.x,
        y: point.y + shift.y + anchor.y
      }))
    };
  });
};

export const renderSolidTopology2D = (
  topology: GraphSolidTopology,
  stateInput?: Partial<GraphSolidState>,
  options: GraphSolidRenderOptions2D = {}
): GraphSolidRenderResult2D => {
  const state = createSolidState(stateInput);
  const anchor = options.anchor ?? { x: 0, y: 0 };
  const defaultSegments = Math.max(12, options.curveSegments ?? DEFAULT_SEGMENTS);
  const unfoldProgress = clampSolidProgress(state.unfoldProgress);

  const basePatches = topology.patches.map((patch) => {
    const segments = resolveCurveSegments(patch, defaultSegments);
    const projected = getProjectedPatch(patch, state, segments);
    const netOutline = getNetOutline(patch, segments);
    const renderMode = state.viewMode;

    let outline: GraphSolidPoint2D[];
    if (renderMode === 'projected') {
      outline = projected.outline;
    } else if (renderMode === 'net') {
      outline = netOutline;
    } else {
      outline = projected.outline.length === netOutline.length
        ? projected.outline.map((point, index) => lerpPoint2D(point, netOutline[index] ?? netOutline[0], unfoldProgress))
        : (unfoldProgress >= 0.5 ? netOutline : projected.outline);
    }

    return {
      patchId: patch.id,
      kind: patch.kind,
      outline,
      depth: projected.depth,
      visible: options.isPatchVisible ? options.isPatchVisible(patch) : true,
      style: patch.style,
      renderMode
    } satisfies GraphSolidRenderPatch2D;
  });

  const exploded = applyExplode(basePatches, state.explodeProgress, anchor);
  const patches = options.sortByDepth === false
    ? exploded
    : [...exploded].sort((left, right) => left.depth - right.depth);

  return { patches };
};

export const renderSolidDefinition2D = <Parameters>(
  definition: GraphSolidDefinition<Parameters>,
  parameters: Parameters,
  stateInput?: Partial<GraphSolidState>,
  options?: GraphSolidRenderOptions2D
): GraphSolidRenderResult2D => {
  return renderSolidTopology2D(definition.createTopology(parameters), stateInput, options);
};
