import { type GraphObjectNode, type GraphObjectPatch, type GraphOperationResult } from './contracts';
export declare const GRAPH_RUNTIME_SCENE_VERSION = 2;
export interface GraphRuntimeSceneDocument {
    version: typeof GRAPH_RUNTIME_SCENE_VERSION;
    sceneId: string;
    objects: GraphObjectNode[];
    rootObjectIds: string[];
    meta?: Record<string, unknown>;
}
export interface GraphSceneStoreSnapshot {
    readonly sceneId: string;
    readonly objects: readonly GraphObjectNode[];
    readonly rootObjectIds: readonly string[];
}
export declare class GraphSceneStore {
    private readonly sceneId;
    private readonly objectMap;
    private readonly objectOrder;
    private readonly rootOrder;
    constructor(sceneId?: string);
    get id(): string;
    addObject(node: GraphObjectNode, options?: {
        root?: boolean;
        replace?: boolean;
    }): GraphOperationResult<GraphObjectNode>;
    updateObject(id: string, patch: GraphObjectPatch): GraphOperationResult<GraphObjectNode>;
    removeObject(id: string): GraphOperationResult<GraphObjectNode>;
    getObject(id: string): GraphObjectNode | null;
    listObjects(): GraphObjectNode[];
    snapshot(): GraphSceneStoreSnapshot;
    toJSON(meta?: Record<string, unknown>): GraphOperationResult<GraphRuntimeSceneDocument>;
    clear(): void;
    static fromJSON(document: GraphRuntimeSceneDocument): GraphOperationResult<GraphSceneStore>;
}
