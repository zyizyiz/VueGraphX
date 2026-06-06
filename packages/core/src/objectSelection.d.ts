import { type GraphClientPoint, type GraphLayerId, type GraphObjectNode, type GraphOperationDiagnostic, type GraphOperationResult, type GraphPickOptions, type GraphPickResult } from './contracts';
import type { GraphRuntimeSelectionChangeSource } from './selection';
export type GraphObjectSelectionAction = 'selected' | 'cleared' | 'ignored';
export interface GraphObjectSelectionPointerInput {
    pointerId: number;
    point: GraphClientPoint;
}
export interface GraphObjectSelectionRuntime {
    scene: {
        getObject(objectId: string): GraphObjectNode | null | undefined;
    };
    router: {
        pick?(point: GraphClientPoint, input?: GraphObjectSelectionPickInput): GraphPickResult | null;
        pickWithDiagnostics?(point: GraphClientPoint, input?: GraphObjectSelectionPickInput): GraphObjectSelectionPickResult;
    };
    selectObject(objectId: string, options?: {
        source?: GraphRuntimeSelectionChangeSource;
        exclusive?: boolean;
    }): GraphOperationResult<GraphObjectNode>;
    clearSelection(options?: {
        source?: GraphRuntimeSelectionChangeSource;
    }): GraphOperationResult<GraphObjectNode[]>;
}
export interface GraphObjectSelectionPickInput {
    layerOrder?: readonly GraphLayerId[];
    pickOptions?: Omit<GraphPickOptions, 'layerOrder'>;
}
export interface GraphObjectSelectionPickResult {
    pick: GraphPickResult | null;
    diagnostics: GraphOperationDiagnostic[];
}
export interface GraphObjectSelectionControllerOptions {
    runtime: GraphObjectSelectionRuntime;
    pickOptions?: GraphPickOptions;
    isSelectableNode?: (node: GraphObjectNode | null | undefined, pick: GraphPickResult) => boolean;
    clearOnMiss?: boolean;
    clearOnNonSelectableHit?: boolean;
    consumeSelected?: boolean;
    consumeCleared?: boolean;
    exclusive?: boolean;
    source?: GraphRuntimeSelectionChangeSource;
}
export interface GraphObjectSelectionControllerResult {
    handled: boolean;
    action: GraphObjectSelectionAction;
    objectId?: string;
    pick?: GraphPickResult;
    diagnostics: GraphOperationDiagnostic[];
}
export interface GraphObjectSelectionController {
    pointerDown(input: GraphObjectSelectionPointerInput): GraphObjectSelectionControllerResult;
    clear(): GraphObjectSelectionControllerResult;
}
type PlainRecord = Record<string, unknown>;
export declare const createGraphObjectSelectionController: (options: GraphObjectSelectionControllerOptions) => GraphObjectSelectionController;
export declare const pickGraphObjectSelectionTarget: (runtime: GraphObjectSelectionRuntime, point: GraphClientPoint, pickOptions?: GraphPickOptions) => GraphObjectSelectionPickResult;
export declare const isGraphObjectSelectableNode: (node: {
    meta?: PlainRecord;
    renderHints?: PlainRecord;
} | null | undefined) => boolean;
export {};
