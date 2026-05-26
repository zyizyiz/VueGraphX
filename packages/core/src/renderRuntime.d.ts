import { type GraphBackendContext, type GraphBackendMountOptions, type GraphBackendMountResult, type GraphDragSession, type GraphLayerId, type GraphObjectNode, type GraphObjectPatch, type GraphOperationResult, type GraphRenderBackend, type GraphRenderHandle } from './contracts';
import { type GraphCreateDragPatchOptions } from './dragOperations';
import { GraphInteractionRouter } from './eventRouter';
import { GraphSceneStore, type GraphSceneStoreSnapshot } from './sceneDocument';
export interface GraphSceneRuntimeOptions {
    scene?: GraphSceneStore;
    backend?: GraphRenderBackend;
    router?: GraphInteractionRouter;
    defaultLayerId?: GraphLayerId;
    defaultContext?: GraphBackendContext;
}
export interface GraphSceneRuntimeSnapshot extends GraphSceneStoreSnapshot {
    handles: readonly GraphRenderHandle[];
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
    constructor(options?: GraphSceneRuntimeOptions);
    setBackend(backend: GraphRenderBackend | null, layerId?: GraphLayerId): void;
    mount(host: HTMLElement, options?: GraphBackendMountOptions): GraphBackendMountResult;
    addObject(node: GraphObjectNode, options?: {
        root?: boolean;
        replace?: boolean;
        context?: GraphBackendContext;
    }): GraphOperationResult<GraphObjectNode>;
    updateObject(objectId: string, patch: GraphObjectPatch, context?: GraphBackendContext): GraphOperationResult<GraphObjectNode>;
    removeObject(objectId: string): GraphOperationResult<GraphObjectNode>;
    applyDragToObject(objectId: string, drag: GraphCreateDragPatchOptions | GraphDragSession): GraphOperationResult<GraphObjectNode>;
    clear(): void;
    renderAll(context?: GraphBackendContext): void;
    snapshot(): GraphSceneRuntimeSnapshot;
    setDefaultContext(context: GraphBackendContext): void;
    private renderNode;
    private createContext;
    private requireBackend;
}
export declare const createGraphSceneRuntime: (options?: GraphSceneRuntimeOptions) => GraphSceneRuntime;
