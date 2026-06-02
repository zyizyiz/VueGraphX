import { type GraphSceneObjectIrNode } from './sceneObjectIr';
import type { GraphBackendInteractionStatus, GraphBackendKind, GraphObjectKind, GraphWorldPoint2D, GraphOperationDiagnostic, GraphRuntimeCapabilityDescriptor } from './contracts';
import { type StandardCoordinateLabelModel } from './standardCoordinateStyle';
export declare const SUBJECT_CANVAS_COLOR_SEQUENCE: readonly ["#4DA6FF", "#FF8D1A", "#16D957", "#FF4D4D", "#BB32FF"];
export declare const SUBJECT_CANVAS_LAYER_POLICY: {
    readonly coordinateBackground: 0;
    readonly coordinateAxis: 1;
    readonly auxiliary: 5;
    readonly objectStep: 10;
    readonly annotationOffset: 5;
    readonly dynamicPointOffset: 8;
    readonly selectedBoost: 1;
};
export declare const SUBJECT_CANVAS_DRAG_DISABLED_REASON = "\u5750\u6807\u7CFB\u5185\u56FE\u5F62\u901A\u8FC7\u5750\u6807\u7CFB\u3001\u53C2\u6570\u6216\u5B9A\u4E49\u57DF\u63A7\u4EF6\u7F16\u8F91\uFF0C\u4E0D\u652F\u6301\u81EA\u7531\u62D6\u62FD\u79FB\u52A8\u3002";
export type SubjectCanvasObjectKind = 'function' | 'equation' | 'geometry' | 'vector' | 'statistics' | 'annotation' | 'auxiliary' | 'dynamic-point';
export type SubjectCoordinateSystemAxisEdge = 'x-min' | 'x-max' | 'y-min' | 'y-max';
export type SubjectCanvasSnapTargetKind = 'global-grid' | 'coordinate-origin' | 'coordinate-boundary' | 'coordinate-unit';
export type SubjectBackendId = 'jsxgraph' | 'canvas2d' | 'babylon' | 'pixi' | 'konva' | 'three' | 'fabric';
export type SubjectBackendCapabilityCategory = 'canvas' | 'coordinate-system' | 'function-family' | 'equation-family' | 'domain' | 'annotation' | 'dynamic-point' | 'management';
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
export declare const createSubjectCanvasState: (options?: CreateSubjectCanvasStateOptions) => SubjectCanvasState;
export declare const addSubjectCoordinateSystem: (state: SubjectCanvasState, input?: AddSubjectCoordinateSystemInput) => {
    state: SubjectCanvasState;
    coordinateSystem: SubjectCoordinateSystemState;
};
export declare const resizeSubjectCoordinateSystemAxisRange: (state: SubjectCanvasState, coordinateSystemId: string, edge: SubjectCoordinateSystemAxisEdge, deltaUnits: number, options?: {
    minSpan?: number;
}) => SubjectCanvasState;
export declare const snapSubjectCanvasPoint: (state: SubjectCanvasState, point: SubjectCanvasPoint, options?: {
    tolerancePx?: number;
}) => SubjectSnapResult;
export declare const allocateSubjectColor: (state: SubjectCanvasState, coordinateSystemId: string) => {
    state: SubjectCanvasState;
    color: string;
    colorIndex: number;
};
export declare const addManagedSubjectObject: (state: SubjectCanvasState, input: SubjectCanvasObjectInput) => {
    state: SubjectCanvasState;
    object: SubjectManagedObject;
};
export declare const deleteManagedSubjectObject: (state: SubjectCanvasState, coordinateSystemId: string, objectId: string) => SubjectCanvasState;
export declare const reorderManagedSubjectObjects: (state: SubjectCanvasState, coordinateSystemId: string, orderedObjectIds: readonly string[]) => SubjectCanvasState;
export declare const changeManagedSubjectObjectType: (state: SubjectCanvasState, coordinateSystemId: string, objectId: string, nextKind: SubjectCanvasObjectKind, nextFamily?: string) => SubjectCanvasState;
export declare const selectSubjectObject: (state: SubjectCanvasState, coordinateSystemId: string, objectId?: string) => SubjectCanvasState;
export declare const getSubjectObjectEffectiveLayer: (coordinateSystem: SubjectCoordinateSystemState, objectId: string) => number | null;
export declare const createSubjectCoordinateSystemGeometry: (system: Pick<SubjectCoordinateSystemState, "origin" | "unitPx" | "xRange" | "yRange" | "showTicks">) => SubjectCoordinateSystemGeometry;
export declare const createSubjectCoordinateSystemScenePayload: (system: SubjectCoordinateSystemState, options?: {
    dimension?: "plane" | "space";
    label?: string;
}) => SubjectCoordinateSystemScenePayload;
export declare const createSubjectCoordinateSystemSceneNode: (system: SubjectCoordinateSystemState, options?: {
    id?: string;
    dimension?: "plane" | "space";
    label?: string;
    kind?: GraphObjectKind;
    capabilities?: GraphRuntimeCapabilityDescriptor[];
    meta?: Record<string, unknown>;
}) => GraphSceneObjectIrNode;
export declare const createSubjectBackendSupportMatrix: (backendIds?: readonly GraphBackendKind[]) => SubjectBackendSupportRow[];
