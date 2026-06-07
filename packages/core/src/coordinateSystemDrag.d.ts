import { type GraphClientPoint, type GraphLayerId, type GraphObjectNode, type GraphOperationDiagnostic, type GraphOperationResult, type GraphPickOptions, type GraphPickResult } from './contracts';
import type { GraphCreateDragPatchOptions, GraphDragDelta2D } from './dragOperations';
export interface GraphCoordinateSystemDragPoint2D {
    x: number;
    y: number;
}
export interface GraphCoordinateSystemDragSession {
    pointerId: number;
    objectId: string;
    lastWorldPoint: GraphCoordinateSystemDragPoint2D;
}
export interface GraphCoordinateSystemDragPointerInput {
    pointerId: number;
    point: GraphClientPoint;
    fallbackToRegion?: boolean;
}
export interface GraphCoordinateSystemDragRuntime {
    scene: {
        getObject(objectId: string): GraphObjectNode | null | undefined;
        listObjects(): readonly GraphObjectNode[];
    };
    router: {
        pick(point: GraphClientPoint, input?: {
            layerOrder?: readonly GraphLayerId[];
            pickOptions?: Omit<GraphPickOptions, 'layerOrder'>;
        }): GraphPickResult | null;
    };
    applyDragToObject(objectId: string, drag: GraphCreateDragPatchOptions): GraphOperationResult<GraphObjectNode>;
}
export interface GraphCoordinateSystemDragControllerOptions {
    runtime: GraphCoordinateSystemDragRuntime;
    resolveWorldPoint: (point: GraphClientPoint) => GraphCoordinateSystemDragPoint2D | null;
    pickOptions?: GraphPickOptions;
    fallbackToRegion?: boolean;
    isDraggableNode?: (node: GraphObjectNode | null | undefined) => boolean;
    constrainDelta?: (delta: GraphDragDelta2D, session: GraphCoordinateSystemDragSession, dragPhase: 'move' | 'end') => GraphDragDelta2D;
}
export interface GraphCoordinateSystemDragControllerResult {
    handled: boolean;
    objectId?: string;
    diagnostics: GraphOperationDiagnostic[];
}
export interface GraphCoordinateSystemDragController {
    pointerDown(input: GraphCoordinateSystemDragPointerInput): GraphCoordinateSystemDragControllerResult;
    pointerMove(input: GraphCoordinateSystemDragPointerInput): GraphCoordinateSystemDragControllerResult;
    pointerUp(input: GraphCoordinateSystemDragPointerInput): GraphCoordinateSystemDragControllerResult;
    cancel(pointerId?: number): GraphCoordinateSystemDragControllerResult;
    isDragging(pointerId?: number): boolean;
    getSession(): GraphCoordinateSystemDragSession | null;
}
type PlainRecord = Record<string, unknown>;
export declare const createGraphCoordinateSystemDragController: (options: GraphCoordinateSystemDragControllerOptions) => GraphCoordinateSystemDragController;
export declare const resolveCoordinateSystemDragObjectId: (runtime: GraphCoordinateSystemDragRuntime, point: GraphClientPoint, options?: Partial<Pick<GraphCoordinateSystemDragControllerOptions, "pickOptions" | "fallbackToRegion" | "resolveWorldPoint" | "isDraggableNode">>) => string | null;
export declare const isGraphDraggableNode: (node: GraphObjectNode | null | undefined) => boolean;
export declare const isGraphCoordinateSystemDraggableNode: (node: {
    type?: string;
    meta?: PlainRecord;
    renderHints?: PlainRecord;
} | null | undefined) => boolean;
export declare const isPointInsideGraphCoordinateSystemRegion: (node: GraphObjectNode, point: GraphCoordinateSystemDragPoint2D) => boolean;
export {};
