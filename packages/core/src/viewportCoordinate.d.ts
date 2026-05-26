import { type GraphLayerId, type GraphOperationDiagnostic, type GraphOperationResult, type GraphViewportSize, type GraphWorldPoint3D } from './contracts';
export declare const GRAPH_VIEWPORT_COORDINATE_MODEL_VERSION = 1;
export type GraphViewportCoordinateMode = '2d' | 'dual-layer-2_5d' | '3d';
export type GraphViewportWorldDimensions = '2d' | '3d';
export type GraphViewportDepthPolicy = 'flat' | 'ordered-layers' | 'camera-depth';
export type GraphViewportCoordinateDiagnosticCode = 'viewport-coordinate.unsupported-mode' | 'viewport-coordinate.invalid-model';
export interface GraphViewportCoordinateDiagnostic extends GraphOperationDiagnostic {
    code: GraphViewportCoordinateDiagnosticCode;
    details?: Record<string, unknown>;
}
export interface GraphViewportCamera3D {
    position: GraphWorldPoint3D;
    target: GraphWorldPoint3D;
    up?: GraphWorldPoint3D;
    fieldOfViewDegrees?: number;
    near?: number;
    far?: number;
}
export interface GraphViewportCoordinateModelBase {
    version: typeof GRAPH_VIEWPORT_COORDINATE_MODEL_VERSION;
    viewportId: string;
    mode: GraphViewportCoordinateMode;
    size?: GraphViewportSize;
    layerIds: GraphLayerId[];
    worldDimensions: GraphViewportWorldDimensions;
    meta?: Record<string, unknown>;
}
export interface GraphViewportCoordinateModel2D extends GraphViewportCoordinateModelBase {
    mode: '2d';
    worldDimensions: '2d';
    depthPolicy: 'flat';
}
export interface GraphViewportCoordinateModelDualLayer25D extends GraphViewportCoordinateModelBase {
    mode: 'dual-layer-2_5d';
    worldDimensions: '2d';
    layerIds: [GraphLayerId, GraphLayerId];
    depthPolicy: 'ordered-layers';
}
export interface GraphViewportCoordinateModel3D extends GraphViewportCoordinateModelBase {
    mode: '3d';
    worldDimensions: '3d';
    depthPolicy: 'camera-depth';
    camera?: GraphViewportCamera3D;
}
export type GraphViewportCoordinateModel = GraphViewportCoordinateModel2D | GraphViewportCoordinateModelDualLayer25D | GraphViewportCoordinateModel3D;
export interface CreateGraphViewportCoordinateModelInput {
    viewportId: string;
    mode: string;
    size?: GraphViewportSize;
    layerIds?: readonly GraphLayerId[];
    depthPolicy?: GraphViewportDepthPolicy;
    camera?: GraphViewportCamera3D;
    meta?: Record<string, unknown>;
}
export declare const createGraphViewportCoordinateModel: (input: CreateGraphViewportCoordinateModelInput) => GraphOperationResult<GraphViewportCoordinateModel>;
