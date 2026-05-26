import { type GraphClientPoint, type GraphDragSession, type GraphLayerId, type GraphOperationDiagnostic, type GraphPickOptions, type GraphPickResult, type GraphPointerSession, type GraphRenderBackend } from './contracts';
export interface GraphLayerPolicy {
    layerId: GraphLayerId;
    interactive: boolean;
    passThrough: boolean;
    backendIds?: readonly string[];
}
export interface GraphPointerRouteInput {
    pointerId: number;
    clientPoint: GraphClientPoint;
    timestamp?: number;
    uiHandled?: boolean;
    layerOrder?: readonly GraphLayerId[];
    pickOptions?: Omit<GraphPickOptions, 'layerOrder'>;
}
export interface GraphPointerRouteResult {
    pick: GraphPickResult | null;
    session: GraphPointerSession;
}
export type GraphPickDiagnosticCode = 'pick.ui-handled' | 'pick.layer-pass-through' | 'pick.layer-blocked' | 'pick.backend-miss' | 'pick.hit-group-filtered' | 'pick.target-found';
export interface GraphPickDiagnostic extends GraphOperationDiagnostic {
    code: GraphPickDiagnosticCode;
}
export interface GraphPickRouteResult {
    pick: GraphPickResult | null;
    diagnostics: GraphPickDiagnostic[];
}
export declare class GraphInteractionRouter {
    private readonly backends;
    private readonly backendLayers;
    private readonly policies;
    private activePointer;
    private activeDrag;
    constructor(policies?: readonly GraphLayerPolicy[]);
    setLayerPolicy(policy: GraphLayerPolicy): void;
    registerBackend(backend: GraphRenderBackend, layerId?: GraphLayerId): void;
    unregisterBackend(backendId: string): boolean;
    pick(clientPoint: GraphClientPoint, input?: Omit<GraphPointerRouteInput, 'pointerId' | 'clientPoint'>): GraphPickResult | null;
    pickWithDiagnostics(clientPoint: GraphClientPoint, input?: Omit<GraphPointerRouteInput, 'pointerId' | 'clientPoint'>): GraphPickRouteResult;
    pointerDown(input: GraphPointerRouteInput): GraphPointerRouteResult;
    pointerMove(pointerId: number, clientPoint: GraphClientPoint, timestamp?: number): GraphPointerSession | null;
    beginDrag(dragKind?: GraphDragSession['dragKind']): GraphDragSession | null;
    pointerUp(pointerId: number): GraphPointerSession | null;
    cancelPointer(pointerId?: number): void;
    getActivePointerSession(): GraphPointerSession | null;
    getActiveDragSession(): GraphDragSession | null;
    private getBackendsForLayer;
}
