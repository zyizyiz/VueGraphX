import { type GraphClientPoint, type GraphDragSession, type GraphLayerId, type GraphPickOptions, type GraphPickResult, type GraphPointerSession, type GraphRenderBackend } from './contracts';
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
    pointerDown(input: GraphPointerRouteInput): GraphPointerRouteResult;
    pointerMove(pointerId: number, clientPoint: GraphClientPoint, timestamp?: number): GraphPointerSession | null;
    beginDrag(dragKind?: GraphDragSession['dragKind']): GraphDragSession | null;
    pointerUp(pointerId: number): GraphPointerSession | null;
    cancelPointer(pointerId?: number): void;
    getActivePointerSession(): GraphPointerSession | null;
    getActiveDragSession(): GraphDragSession | null;
    private getBackendsForLayer;
}
