import { type GraphClientPoint, type GraphObjectNode, type GraphObjectPatch, type GraphOperationDiagnostic, type GraphOperationResult, type GraphWorldPoint } from './contracts';
import { type GraphGridSnapPixelScale } from './gridSnapping';
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
    dragPhase?: 'move' | 'end';
    projectWorldPoint?: (point: GraphWorldPoint & {
        dimension: '2d';
    }) => GraphClientPoint | null;
    tolerancePx?: number;
    pixelsPerUnit?: GraphGridSnapPixelScale;
    /**
     * Internal group-drag escape hatch: coordinate-scoped children are normally
     * not freely draggable, but they must move when their owning coordinate
     * system moves.
     */
    allowCoordinateScoped?: boolean;
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
export interface GraphScopedDragPatch {
    objectId: string;
    patch: GraphObjectPatch;
}
export declare const createGraphDragPatch: (node: GraphObjectNode, options: GraphCreateDragPatchOptions) => GraphOperationResult<GraphObjectPatch>;
export declare const resolveGraphDragOperation: (node: GraphObjectNode, options: GraphCreateDragPatchOptions) => GraphOperationResult<GraphDragOperation>;
export declare const createGraphCoordinateSystemDragPatches: (nodes: readonly GraphObjectNode[], coordinateSystemNode: GraphObjectNode, options: GraphCreateDragPatchOptions) => GraphOperationResult<GraphScopedDragPatch[]>;
