import { type GraphObjectNode, type GraphObjectPatch, type GraphOperationDiagnostic, type GraphOperationResult, type GraphWorldPoint } from './contracts';
export interface GraphDragDelta2D {
    dimension: '2d';
    dx: number;
    dy: number;
}
export interface GraphDragDelta3D {
    dimension: '3d';
    dx: number;
    dy: number;
    dz: number;
}
export type GraphDragDelta = GraphDragDelta2D | GraphDragDelta3D;
export interface GraphCreateDragPatchOptions {
    delta?: GraphDragDelta;
    startWorldPoint?: GraphWorldPoint;
    currentWorldPoint?: GraphWorldPoint;
}
export type GraphDragOperationStatus = 'success' | 'clamped' | 'failure';
export interface GraphDragBounds2D {
    dimension: '2d';
    minX?: number;
    maxX?: number;
    minY?: number;
    maxY?: number;
}
export interface GraphDragOperation {
    status: GraphDragOperationStatus;
    patch?: GraphObjectPatch;
    explanation: GraphOperationDiagnostic;
}
export declare const createGraphDragPatch: (node: GraphObjectNode, options: GraphCreateDragPatchOptions) => GraphOperationResult<GraphObjectPatch>;
export declare const resolveGraphDragOperation: (node: GraphObjectNode, options: GraphCreateDragPatchOptions) => GraphOperationResult<GraphDragOperation>;
