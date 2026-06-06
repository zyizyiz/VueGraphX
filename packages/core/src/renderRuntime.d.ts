import { type GraphBackendContext, type GraphBackendHost, type GraphBackendMountOptions, type GraphBackendMountResult, type GraphDragSession, type GraphLayerId, type GraphObjectNode, type GraphObjectPatch, type GraphOperationResult, type GraphRenderBackend, type GraphRenderHandle } from './contracts';
import { type GraphCreateDragPatchOptions } from './dragOperations';
import { GraphInteractionRouter } from './eventRouter';
import { type GraphGridSnapPixelScale } from './gridSnapping';
import { GraphSceneStore, type GraphSceneStoreSnapshot } from './sceneDocument';
import { type GraphRuntimeSelectionChangeSource, type GraphRuntimeSelectionItem, type GraphRuntimeSelectionListener } from './selection';
export interface GraphSceneRuntimeOptions {
    scene?: GraphSceneStore;
    backend?: GraphRenderBackend;
    router?: GraphInteractionRouter;
    defaultLayerId?: GraphLayerId;
    defaultContext?: GraphBackendContext;
    geometryGridSnap?: GraphSceneRuntimeGeometryGridSnapOptions;
}
export interface GraphSceneRuntimeGeometryGridSnapOptions {
    tolerancePx?: number;
    pixelsPerUnit?: GraphGridSnapPixelScale;
}
export interface GraphSceneRuntimeSnapshot extends GraphSceneStoreSnapshot {
    handles: readonly GraphRenderHandle[];
}
export interface GraphSceneRuntimeSelectionOptions {
    source?: GraphRuntimeSelectionChangeSource;
}
export interface GraphSceneRuntimeSelectionMutationOptions extends GraphSceneRuntimeSelectionOptions {
    context?: GraphBackendContext;
}
export interface GraphSceneRuntimeObjectSelectionOptions extends GraphSceneRuntimeSelectionMutationOptions {
    exclusive?: boolean;
}
/**
 * Binds the renderer-neutral scene store to one backend without letting the
 * backend become scene truth. All mutation enters GraphSceneStore first; the
 * backend is updated only after the core patch is accepted.
 */
export declare class GraphSceneRuntime {
    readonly scene: GraphSceneStore;
    readonly router: GraphInteractionRouter;
    private backend;
    private readonly handlesByObjectId;
    private readonly defaultLayerId;
    private defaultContext;
    private selectionListeners;
    private selectionRevision;
    constructor(options?: GraphSceneRuntimeOptions);
    setBackend(backend: GraphRenderBackend | null, layerId?: GraphLayerId): void;
    mount(host: GraphBackendHost, options?: GraphBackendMountOptions): GraphBackendMountResult;
    addObject(node: GraphObjectNode, options?: {
        root?: boolean;
        replace?: boolean;
        context?: GraphBackendContext;
        source?: GraphRuntimeSelectionChangeSource;
    }): GraphOperationResult<GraphObjectNode>;
    updateObject(objectId: string, patch: GraphObjectPatch, context?: GraphBackendContext, options?: GraphSceneRuntimeSelectionOptions): GraphOperationResult<GraphObjectNode>;
    removeObject(objectId: string, options?: GraphSceneRuntimeSelectionOptions): GraphOperationResult<GraphObjectNode>;
    syncObjects(nodes: readonly GraphObjectNode[], context?: GraphBackendContext): GraphOperationResult<GraphObjectNode[]>;
    subscribeSelection(listener: GraphRuntimeSelectionListener): () => void;
    getSelectionItems(): GraphRuntimeSelectionItem[];
    selectObject(objectId: string, options?: GraphSceneRuntimeObjectSelectionOptions): GraphOperationResult<GraphObjectNode>;
    clearSelection(options?: GraphSceneRuntimeSelectionMutationOptions): GraphOperationResult<GraphObjectNode[]>;
    applyDragToObject(objectId: string, drag: GraphCreateDragPatchOptions | GraphDragSession): GraphOperationResult<GraphObjectNode>;
    clear(): void;
    renderAll(context?: GraphBackendContext): void;
    snapshot(): GraphSceneRuntimeSnapshot;
    setDefaultContext(context: GraphBackendContext): void;
    private renderNode;
    private removeObjectInternal;
    private reorderSceneObjects;
    private readSelectionItems;
    private getPrimarySelectionItem;
    private dispatchSelectionChange;
    private createContext;
    private requireBackend;
}
export declare const createGraphSceneRuntime: (options?: GraphSceneRuntimeOptions) => GraphSceneRuntime;
