import {
  createGraphSceneObjectIrNode,
  type GraphSceneObjectIrNode
} from './sceneObjectIr';
import type {
  GraphBackendInteractionStatus,
  GraphBackendKind,
  GraphClientPoint,
  GraphObjectKind,
  GraphWorldPoint2D,
  GraphOperationDiagnostic,
  GraphRuntimeCapabilityDescriptor
} from './contracts';
import { createGraphCapabilitiesForProfile } from './capabilityModel';
import {
  createStandardCoordinateSystemGeometry,
  STANDARD_COORDINATE_UI,
  type StandardCoordinateLabelModel
} from './standardCoordinateStyle';

export const SUBJECT_CANVAS_COLOR_SEQUENCE = [
  '#4DA6FF',
  '#FF8D1A',
  '#16D957',
  '#FF4D4D',
  '#BB32FF'
] as const;

export const SUBJECT_CANVAS_LAYER_POLICY = {
  coordinateBackground: 0,
  coordinateAxis: 1,
  auxiliary: 5,
  objectStep: 10,
  annotationOffset: 5,
  dynamicPointOffset: 8,
  selectedBoost: 1
} as const;

export const SUBJECT_CANVAS_DRAG_DISABLED_REASON = '坐标系内图形通过坐标系、参数或定义域控件编辑，不支持自由拖拽移动。';

export type SubjectCanvasObjectKind = 'function' | 'equation' | 'geometry' | 'vector' | 'statistics' | 'annotation' | 'auxiliary' | 'dynamic-point';
export type SubjectCoordinateSystemAxisEdge = 'x-min' | 'x-max' | 'y-min' | 'y-max';
export type SubjectCanvasSnapTargetKind = 'global-grid' | 'coordinate-origin' | 'coordinate-boundary' | 'coordinate-unit';
export type SubjectBackendId = 'jsxgraph' | 'canvas2d' | 'babylon' | 'pixi' | 'konva' | 'three' | 'fabric';
export type SubjectBackendCapabilityCategory =
  | 'canvas'
  | 'coordinate-system'
  | 'function-family'
  | 'equation-family'
  | 'domain'
  | 'annotation'
  | 'dynamic-point'
  | 'management';

export interface SubjectCanvasPoint {
  x: number;
  y: number;
}

export interface SubjectCanvasSize {
  width: number;
  height: number;
}

export interface SubjectAxisRange {
  min: number;
  max: number;
}

export interface SubjectViewportState {
  scale: number;
  translate: SubjectCanvasPoint;
  unitPx: number;
  minScale: number;
  maxScale: number;
}

export interface SubjectCanvasGridState {
  visible: boolean;
  unitPx: number;
  origin: SubjectCanvasPoint;
  showGlobalAxes: boolean;
}

export interface SubjectCanvasLayerState {
  fixedUiLayerIds: readonly string[];
  contentLayerTransform: {
    scale: number;
    translate: SubjectCanvasPoint;
  };
}

export interface SubjectManagedObject {
  id: string;
  kind: SubjectCanvasObjectKind;
  family?: string;
  sourceObjectId?: string;
  expression?: string;
  color: string;
  colorIndex: number;
  createdIndex: number;
  orderIndex: number;
  baseLayer: number;
  annotationLayer: number;
  dynamicPointLayer: number;
  selected?: boolean;
  visible?: boolean;
  meta?: Record<string, unknown>;
}

export interface SubjectCoordinateSystemState {
  id: string;
  origin: SubjectCanvasPoint;
  size: SubjectCanvasSize;
  unitPx: number;
  xRange: SubjectAxisRange;
  yRange: SubjectAxisRange;
  showAxes: boolean;
  showTicks: boolean;
  showLabels: boolean;
  clipContent: boolean;
  snap: boolean;
  colorSequence: readonly string[];
  nextColorIndex: number;
  nextCreatedIndex: number;
  selectedObjectId?: string;
  objects: readonly SubjectManagedObject[];
  meta?: Record<string, unknown>;
}

export interface SubjectCanvasState {
  id: string;
  viewport: SubjectViewportState;
  grid: SubjectCanvasGridState;
  layers: SubjectCanvasLayerState;
  coordinateSystems: readonly SubjectCoordinateSystemState[];
  activeCoordinateSystemId?: string;
  selectedCoordinateSystemId?: string;
  diagnostics: readonly GraphOperationDiagnostic[];
  meta?: Record<string, unknown>;
}

export interface CreateSubjectCanvasStateOptions {
  id?: string;
  unitPx?: number;
  scale?: number;
  translate?: SubjectCanvasPoint;
  gridOrigin?: SubjectCanvasPoint;
  showGlobalAxes?: boolean;
  meta?: Record<string, unknown>;
}

export interface AddSubjectCoordinateSystemInput {
  id?: string;
  origin?: SubjectCanvasPoint;
  size?: SubjectCanvasSize;
  unitPx?: number;
  xRange?: Partial<SubjectAxisRange>;
  yRange?: Partial<SubjectAxisRange>;
  showAxes?: boolean;
  showTicks?: boolean;
  showLabels?: boolean;
  clipContent?: boolean;
  snap?: boolean;
  colorSequence?: readonly string[];
  meta?: Record<string, unknown>;
}

export interface SubjectCanvasObjectInput {
  id?: string;
  kind: SubjectCanvasObjectKind;
  coordinateSystemId: string;
  family?: string;
  sourceObjectId?: string;
  expression?: string;
  color?: string;
  meta?: Record<string, unknown>;
}

export interface SubjectBackendSupportRow {
  backendId: SubjectBackendId;
  active: boolean;
  categories: Record<SubjectBackendCapabilityCategory, GraphBackendInteractionStatus>;
  reason?: string;
}

export interface SubjectSnapResult {
  point: SubjectCanvasPoint;
  target: {
    kind: SubjectCanvasSnapTargetKind;
    coordinateSystemId?: string;
  };
  distance: number;
}

export interface SubjectCoordinateSystemGeometry {
  kind: 'coordinate-system';
  border: readonly SubjectCanvasPoint[];
  xAxis: readonly [SubjectCanvasPoint, SubjectCanvasPoint];
  yAxis: readonly [SubjectCanvasPoint, SubjectCanvasPoint];
  axisArrowSegments: readonly (readonly [SubjectCanvasPoint, SubjectCanvasPoint])[];
  gridSegments: readonly (readonly [SubjectCanvasPoint, SubjectCanvasPoint])[];
  /** Polyline segments used by active backends that render semantic coordinate systems through path proxies. */
  segments: readonly (readonly SubjectCanvasPoint[])[];
  tickPoints: readonly SubjectCanvasPoint[];
  labels: readonly StandardCoordinateLabelModel[];
}

export interface SubjectCoordinateSystemScenePayload {
  objectType: 'coordinate-system';
  dimension: 'plane' | 'space';
  origin: GraphWorldPoint2D;
  size: SubjectCanvasSize;
  unitPx: number;
  xRange: SubjectAxisRange;
  yRange: SubjectAxisRange;
  showAxes: boolean;
  showTicks: boolean;
  showLabels: boolean;
  clipContent: boolean;
  snap: boolean;
  colorSequence: readonly string[];
  geometry: SubjectCoordinateSystemGeometry;
  label?: string;
  meta?: Record<string, unknown>;
}

export const createSubjectCanvasState = (options: CreateSubjectCanvasStateOptions = {}): SubjectCanvasState => {
  const unitPx = finitePositive(options.unitPx, 30);
  const scale = clamp(finitePositive(options.scale, 1), 0.25, 4);
  const translate = clonePoint(options.translate ?? { x: 0, y: 0 });
  return {
    id: options.id ?? 'subject-canvas',
    viewport: {
      scale,
      translate,
      unitPx,
      minScale: 0.25,
      maxScale: 4
    },
    grid: {
      visible: true,
      unitPx,
      origin: clonePoint(options.gridOrigin ?? { x: 0, y: 0 }),
      showGlobalAxes: options.showGlobalAxes ?? false
    },
    layers: {
      fixedUiLayerIds: ['ui'],
      contentLayerTransform: {
        scale,
        translate
      }
    },
    coordinateSystems: [],
    diagnostics: [],
    meta: options.meta ? { ...options.meta } : undefined
  };
};

export const addSubjectCoordinateSystem = (
  state: SubjectCanvasState,
  input: AddSubjectCoordinateSystemInput = {}
): { state: SubjectCanvasState; coordinateSystem: SubjectCoordinateSystemState } => {
  const nextState = cloneSubjectCanvasState(state);
  const unitPx = finitePositive(input.unitPx, nextState.grid.unitPx || nextState.viewport.unitPx || 30);
  const coordinateSystem: SubjectCoordinateSystemState = {
    id: input.id ?? `coord-${nextState.coordinateSystems.length + 1}`,
    origin: snapPointToUnit(input.origin ?? { x: 0, y: 0 }, unitPx),
    size: {
      width: finitePositive(input.size?.width, 360),
      height: finitePositive(input.size?.height, 360)
    },
    unitPx,
    xRange: normalizeAxisRange(input.xRange, -6, 6),
    yRange: normalizeAxisRange(input.yRange, -6, 6),
    showAxes: input.showAxes ?? true,
    showTicks: input.showTicks ?? true,
    showLabels: input.showLabels ?? true,
    clipContent: input.clipContent ?? true,
    snap: input.snap ?? true,
    colorSequence: [...(input.colorSequence?.length ? input.colorSequence : SUBJECT_CANVAS_COLOR_SEQUENCE)],
    nextColorIndex: 0,
    nextCreatedIndex: 0,
    objects: [],
    meta: input.meta ? { ...input.meta } : undefined
  };
  nextState.coordinateSystems = [...nextState.coordinateSystems, coordinateSystem];
  nextState.activeCoordinateSystemId = coordinateSystem.id;
  nextState.selectedCoordinateSystemId = coordinateSystem.id;
  return { state: nextState, coordinateSystem: cloneCoordinateSystem(coordinateSystem) };
};

export const resizeSubjectCoordinateSystemAxisRange = (
  state: SubjectCanvasState,
  coordinateSystemId: string,
  edge: SubjectCoordinateSystemAxisEdge,
  deltaUnits: number,
  options: { minSpan?: number } = {}
): SubjectCanvasState => updateCoordinateSystem(state, coordinateSystemId, (system) => {
  const minSpan = Math.max(1, Math.floor(options.minSpan ?? 2));
  const delta = Math.round(Number.isFinite(deltaUnits) ? deltaUnits : 0);
  const next = cloneCoordinateSystem(system);
  const range = edge.startsWith('x') ? { ...next.xRange } : { ...next.yRange };
  if (edge.endsWith('min')) range.min += delta;
  else range.max += delta;
  const normalized = enforceAxisSpan(range, minSpan);
  if (edge.startsWith('x')) next.xRange = normalized;
  else next.yRange = normalized;
  return next;
});

export const snapSubjectCanvasPoint = (
  state: SubjectCanvasState,
  point: SubjectCanvasPoint,
  options: { tolerancePx?: number } = {}
): SubjectSnapResult => {
  const tolerance = finitePositive(options.tolerancePx, state.grid.unitPx / 2);
  const candidates: Array<Omit<SubjectSnapResult, 'distance'>> = [];
  const gridPoint = snapPointToUnit(point, state.grid.unitPx, state.grid.origin);
  candidates.push({ point: gridPoint, target: { kind: 'global-grid' } });

  for (const system of state.coordinateSystems) {
    candidates.push({ point: clonePoint(system.origin), target: { kind: 'coordinate-origin', coordinateSystemId: system.id } });
    for (const boundary of coordinateSystemBoundaryPoints(system)) {
      candidates.push({ point: boundary, target: { kind: 'coordinate-boundary', coordinateSystemId: system.id } });
    }
    const unitPoint = snapPointToUnit(point, system.unitPx, system.origin);
    candidates.push({ point: unitPoint, target: { kind: 'coordinate-unit', coordinateSystemId: system.id } });
  }

  const best = candidates
    .map((candidate) => ({ ...candidate, distance: distance(point, candidate.point) }))
    .sort((left, right) => left.distance - right.distance || snapTargetPriority(left.target.kind) - snapTargetPriority(right.target.kind))[0];

  return best && best.distance <= tolerance
    ? best
    : { point: clonePoint(point), target: { kind: 'global-grid' }, distance: 0 };
};

export const allocateSubjectColor = (
  state: SubjectCanvasState,
  coordinateSystemId: string
): { state: SubjectCanvasState; color: string; colorIndex: number } => {
  let color: string = SUBJECT_CANVAS_COLOR_SEQUENCE[0];
  let colorIndex = 0;
  const nextState = updateCoordinateSystem(state, coordinateSystemId, (system) => {
    const next = cloneCoordinateSystem(system);
    colorIndex = next.nextColorIndex;
    color = next.colorSequence[colorIndex % next.colorSequence.length] ?? SUBJECT_CANVAS_COLOR_SEQUENCE[0];
    next.nextColorIndex += 1;
    return next;
  });
  return { state: nextState, color, colorIndex };
};

export const addManagedSubjectObject = (
  state: SubjectCanvasState,
  input: SubjectCanvasObjectInput
): { state: SubjectCanvasState; object: SubjectManagedObject } => {
  let created: SubjectManagedObject | null = null;
  const nextState = updateCoordinateSystem(state, input.coordinateSystemId, (system) => {
    const next = cloneCoordinateSystem(system);
    const colorIndex = input.color ? -1 : next.nextColorIndex;
    const color = input.color ?? (next.colorSequence[colorIndex % next.colorSequence.length] ?? SUBJECT_CANVAS_COLOR_SEQUENCE[0]);
    if (!input.color) next.nextColorIndex += 1;
    const createdIndex = next.nextCreatedIndex;
    next.nextCreatedIndex += 1;
    const orderIndex = next.objects.length;
    const baseLayer = (orderIndex + 1) * SUBJECT_CANVAS_LAYER_POLICY.objectStep;
    created = {
      id: input.id ?? `${input.kind}-${createdIndex + 1}`,
      kind: input.kind,
      family: input.family,
      sourceObjectId: input.sourceObjectId,
      expression: input.expression,
      color,
      colorIndex,
      createdIndex,
      orderIndex,
      baseLayer,
      annotationLayer: baseLayer + SUBJECT_CANVAS_LAYER_POLICY.annotationOffset,
      dynamicPointLayer: baseLayer + SUBJECT_CANVAS_LAYER_POLICY.dynamicPointOffset,
      visible: true,
      meta: {
        ...(input.meta ?? {}),
        coordinateSystemId: input.coordinateSystemId,
        draggable: false,
        dragDisabled: true,
        dragDisabledReason: SUBJECT_CANVAS_DRAG_DISABLED_REASON
      }
    };
    next.objects = [...next.objects, created];
    next.selectedObjectId = created.id;
    return selectObjectInSystem(next, created.id);
  });
  if (!created) throw new Error(`Coordinate system ${input.coordinateSystemId} was not found.`);
  return { state: nextState, object: cloneManagedObject(created) };
};

export const deleteManagedSubjectObject = (
  state: SubjectCanvasState,
  coordinateSystemId: string,
  objectId: string
): SubjectCanvasState => updateCoordinateSystem(state, coordinateSystemId, (system) => {
  const next = cloneCoordinateSystem(system);
  next.objects = next.objects.filter((object) => object.id !== objectId && object.sourceObjectId !== objectId).map(cloneManagedObject);
  next.objects = recalculateSubjectObjectLayers(next.objects);
  if (next.selectedObjectId === objectId) next.selectedObjectId = undefined;
  return next;
});

export const reorderManagedSubjectObjects = (
  state: SubjectCanvasState,
  coordinateSystemId: string,
  orderedObjectIds: readonly string[]
): SubjectCanvasState => updateCoordinateSystem(state, coordinateSystemId, (system) => {
  const next = cloneCoordinateSystem(system);
  const order = new Map(orderedObjectIds.map((id, index) => [id, index]));
  next.objects = recalculateSubjectObjectLayers(
    [...next.objects].sort((left, right) => (order.get(left.id) ?? Number.MAX_SAFE_INTEGER) - (order.get(right.id) ?? Number.MAX_SAFE_INTEGER))
  );
  return next;
});

export const changeManagedSubjectObjectType = (
  state: SubjectCanvasState,
  coordinateSystemId: string,
  objectId: string,
  nextKind: SubjectCanvasObjectKind,
  nextFamily?: string
): SubjectCanvasState => updateCoordinateSystem(state, coordinateSystemId, (system) => ({
  ...system,
  objects: system.objects.map((object) => object.id === objectId
    ? { ...cloneManagedObject(object), kind: nextKind, family: nextFamily ?? object.family }
    : cloneManagedObject(object))
}));

export const selectSubjectObject = (
  state: SubjectCanvasState,
  coordinateSystemId: string,
  objectId?: string
): SubjectCanvasState => updateCoordinateSystem(state, coordinateSystemId, (system) => selectObjectInSystem(system, objectId));

export const getSubjectObjectEffectiveLayer = (
  coordinateSystem: SubjectCoordinateSystemState,
  objectId: string
): number | null => {
  const object = coordinateSystem.objects.find((entry) => entry.id === objectId);
  if (!object) return null;
  if (!object.selected) return object.baseLayer;
  const topLayer = coordinateSystem.objects.reduce((max, entry) => Math.max(max, entry.dynamicPointLayer), 0);
  return topLayer + SUBJECT_CANVAS_LAYER_POLICY.selectedBoost;
};

export const createSubjectCoordinateSystemGeometry = (
  system: Pick<SubjectCoordinateSystemState, 'origin' | 'unitPx' | 'xRange' | 'yRange' | 'showTicks'>
): SubjectCoordinateSystemGeometry => {
  const geometry = createStandardCoordinateSystemGeometry({
    origin: system.origin,
    unitPx: system.unitPx,
    xRange: system.xRange,
    yRange: system.yRange,
    showTicks: system.showTicks,
    showLabels: true,
    includeGrid: true,
    includeBorder: true
  });
  return {
    ...geometry,
    border: geometry.border,
    xAxis: geometry.xAxis,
    yAxis: geometry.yAxis,
    axisArrowSegments: geometry.axisArrowSegments,
    gridSegments: geometry.gridSegments,
    segments: geometry.segments,
    tickPoints: geometry.tickPoints,
    labels: geometry.labels
  };
};

export const createSubjectCoordinateSystemScenePayload = (
  system: SubjectCoordinateSystemState,
  options: { dimension?: 'plane' | 'space'; label?: string } = {}
): SubjectCoordinateSystemScenePayload => ({
  objectType: 'coordinate-system',
  dimension: options.dimension ?? 'plane',
  origin: { dimension: '2d', ...clonePoint(system.origin) },
  size: { ...system.size },
  unitPx: system.unitPx,
  xRange: { ...system.xRange },
  yRange: { ...system.yRange },
  showAxes: system.showAxes,
  showTicks: system.showTicks,
  showLabels: system.showLabels,
  clipContent: system.clipContent,
  snap: system.snap,
  colorSequence: [...system.colorSequence],
  geometry: createSubjectCoordinateSystemGeometry(system),
  label: options.label,
  meta: system.meta ? { ...system.meta } : undefined
});

export const createSubjectCoordinateSystemSceneNode = (
  system: SubjectCoordinateSystemState,
  options: {
    id?: string;
    dimension?: 'plane' | 'space';
    label?: string;
    kind?: GraphObjectKind;
    capabilities?: GraphRuntimeCapabilityDescriptor[];
    meta?: Record<string, unknown>;
  } = {}
): GraphSceneObjectIrNode => {
  const payload = createSubjectCoordinateSystemScenePayload(system, options);
  const result = createGraphSceneObjectIrNode({
    id: options.id ?? system.id,
    objectType: 'coordinate-system',
    payload: {
      ...payload,
      meta: {
        ...(payload.meta ?? {}),
        ...(options.meta ?? {})
      }
    },
    kind: options.kind ?? 'shape',
    layerId: 'content',
    capabilities: options.capabilities ?? createGraphCapabilitiesForProfile('coordinate-system', { scope: 'object', objectId: options.id ?? system.id }),
    renderHints: {
      strokeColor: STANDARD_COORDINATE_UI.axisStrokeColor,
      fillColor: 'rgba(102, 102, 102, 0.08)',
      strokeWidth: STANDARD_COORDINATE_UI.axisStrokeWidthPx,
      hitGroups: ['coordinate-system'],
      draggable: true
    },
    meta: {
      subjectCanvas: true,
      ...(options.meta ?? {}),
      coordinateSystemId: system.id,
      draggable: true
    }
  });
  if (!result.ok || !result.value) {
    throw new Error(`Failed to create coordinate-system scene node: ${result.diagnostics.map((diagnostic) => diagnostic.message).join('; ')}`);
  }
  return result.value;
};

export const createSubjectBackendSupportMatrix = (backendIds: readonly GraphBackendKind[] = ['jsxgraph', 'canvas2d', 'babylon', 'pixi', 'konva', 'three', 'fabric']): SubjectBackendSupportRow[] => (
  backendIds.map((backendId) => {
    const active = backendId === 'jsxgraph' || backendId === 'canvas2d';
    return {
      backendId: backendId as SubjectBackendId,
      active,
      categories: active ? {
        canvas: 'supported',
        'coordinate-system': 'supported',
        'function-family': 'supported',
        'equation-family': 'supported',
        domain: 'supported',
        annotation: 'supported',
        'dynamic-point': 'supported',
        management: 'supported'
      } : {
        canvas: 'unsupported',
        'coordinate-system': 'unsupported',
        'function-family': 'unsupported',
        'equation-family': 'unsupported',
        domain: 'unsupported',
        annotation: 'unsupported',
        'dynamic-point': 'unsupported',
        management: 'unsupported'
      },
      reason: active
        ? 'Active VueGraphX backend for subject-canvas parity.'
        : backendId === 'babylon'
          ? 'Babylon is reserved for native 3D/solid rendering; 2D subject-canvas parity is handled by Canvas2D.'
          : 'Placeholder backend package is explicitly deferred and must not claim subject-canvas parity.'
    };
  })
);

const snapTargetPriority = (kind: SubjectCanvasSnapTargetKind): number => {
  if (kind === 'coordinate-origin') return 0;
  if (kind === 'coordinate-boundary') return 1;
  if (kind === 'coordinate-unit') return 2;
  return 3;
};

const updateCoordinateSystem = (
  state: SubjectCanvasState,
  coordinateSystemId: string,
  update: (system: SubjectCoordinateSystemState) => SubjectCoordinateSystemState
): SubjectCanvasState => {
  const next = cloneSubjectCanvasState(state);
  let found = false;
  next.coordinateSystems = next.coordinateSystems.map((system) => {
    if (system.id !== coordinateSystemId) return system;
    found = true;
    return cloneCoordinateSystem(update(system));
  });
  if (!found) {
    next.diagnostics = [...next.diagnostics, {
      code: 'subject-canvas.missing-coordinate-system',
      message: `Subject coordinate system ${coordinateSystemId} does not exist.`,
      severity: 'error',
      target: { scope: 'object', objectId: coordinateSystemId }
    }];
  }
  return next;
};

const selectObjectInSystem = (
  system: SubjectCoordinateSystemState,
  objectId?: string
): SubjectCoordinateSystemState => ({
  ...cloneCoordinateSystem(system),
  selectedObjectId: objectId,
  objects: system.objects.map((object) => ({ ...cloneManagedObject(object), selected: object.id === objectId }))
});

const recalculateSubjectObjectLayers = (objects: readonly SubjectManagedObject[]): SubjectManagedObject[] => (
  objects.map((object, orderIndex) => {
    const baseLayer = (orderIndex + 1) * SUBJECT_CANVAS_LAYER_POLICY.objectStep;
    return {
      ...cloneManagedObject(object),
      orderIndex,
      baseLayer,
      annotationLayer: baseLayer + SUBJECT_CANVAS_LAYER_POLICY.annotationOffset,
      dynamicPointLayer: baseLayer + SUBJECT_CANVAS_LAYER_POLICY.dynamicPointOffset
    };
  })
);

const coordinateSystemBoundaryPoints = (system: SubjectCoordinateSystemState): SubjectCanvasPoint[] => {
  const geometry = createSubjectCoordinateSystemGeometry(system);
  return [...geometry.border];
};

const normalizeAxisRange = (range: Partial<SubjectAxisRange> | undefined, minFallback: number, maxFallback: number): SubjectAxisRange => {
  const min = finiteNumber(range?.min, minFallback);
  const max = finiteNumber(range?.max, maxFallback);
  return enforceAxisSpan({ min: Math.min(min, max), max: Math.max(min, max) }, 2);
};

const enforceAxisSpan = (range: SubjectAxisRange, minSpan: number): SubjectAxisRange => {
  if (range.max - range.min >= minSpan) return range;
  const center = (range.min + range.max) / 2;
  return {
    min: center - minSpan / 2,
    max: center + minSpan / 2
  };
};

const cloneSubjectCanvasState = (state: SubjectCanvasState): SubjectCanvasState => ({
  id: state.id,
  viewport: {
    ...state.viewport,
    translate: clonePoint(state.viewport.translate)
  },
  grid: {
    ...state.grid,
    origin: clonePoint(state.grid.origin)
  },
  layers: {
    fixedUiLayerIds: [...state.layers.fixedUiLayerIds],
    contentLayerTransform: {
      scale: state.layers.contentLayerTransform.scale,
      translate: clonePoint(state.layers.contentLayerTransform.translate)
    }
  },
  coordinateSystems: state.coordinateSystems.map(cloneCoordinateSystem),
  activeCoordinateSystemId: state.activeCoordinateSystemId,
  selectedCoordinateSystemId: state.selectedCoordinateSystemId,
  diagnostics: state.diagnostics.map((diagnostic) => ({ ...diagnostic, target: diagnostic.target ? { ...diagnostic.target } : undefined })),
  meta: state.meta ? { ...state.meta } : undefined
});

const cloneCoordinateSystem = (system: SubjectCoordinateSystemState): SubjectCoordinateSystemState => ({
  id: system.id,
  origin: clonePoint(system.origin),
  size: { ...system.size },
  unitPx: system.unitPx,
  xRange: { ...system.xRange },
  yRange: { ...system.yRange },
  showAxes: system.showAxes,
  showTicks: system.showTicks,
  showLabels: system.showLabels,
  clipContent: system.clipContent,
  snap: system.snap,
  colorSequence: [...system.colorSequence],
  nextColorIndex: system.nextColorIndex,
  nextCreatedIndex: system.nextCreatedIndex,
  selectedObjectId: system.selectedObjectId,
  objects: system.objects.map(cloneManagedObject),
  meta: system.meta ? { ...system.meta } : undefined
});

const cloneManagedObject = (object: SubjectManagedObject): SubjectManagedObject => ({
  ...object,
  meta: object.meta ? { ...object.meta } : undefined
});

const clonePoint = (point: SubjectCanvasPoint): SubjectCanvasPoint => ({ x: point.x, y: point.y });

const snapPointToUnit = (
  point: SubjectCanvasPoint,
  unitPx: number,
  origin: SubjectCanvasPoint = { x: 0, y: 0 }
): SubjectCanvasPoint => ({
  x: origin.x + Math.round((point.x - origin.x) / Math.max(1e-9, unitPx)) * unitPx,
  y: origin.y + Math.round((point.y - origin.y) / Math.max(1e-9, unitPx)) * unitPx
});

const distance = (left: GraphClientPoint, right: GraphClientPoint): number => Math.hypot(left.x - right.x, left.y - right.y);

const finiteNumber = (value: unknown, fallback: number): number => typeof value === 'number' && Number.isFinite(value) ? value : fallback;
const finitePositive = (value: unknown, fallback: number): number => {
  const numeric = finiteNumber(value, fallback);
  return numeric > 0 ? numeric : fallback;
};
const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);
