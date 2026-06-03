import {
  errorResult,
  okResult,
  type GraphBackendContext,
  type GraphBackendHost,
  type GraphBackendMountOptions,
  type GraphBackendMountResult,
  type GraphDragSession,
  type GraphLayerId,
  type GraphObjectNode,
  type GraphObjectPatch,
  type GraphOperationResult,
  type GraphRenderBackend,
  type GraphRenderHandle
} from './contracts';
import {
  createGraphCoordinateSystemDragPatches,
  createGraphDragPatch,
  type GraphCreateDragPatchOptions
} from './dragOperations';
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

const cloneHandle = (handle: GraphRenderHandle): GraphRenderHandle => ({
  ...handle,
  target: { ...handle.target },
  meta: handle.meta ? { ...handle.meta } : undefined
});

/**
 * Binds the renderer-neutral scene store to one backend without letting the
 * backend become scene truth. All mutation enters GraphSceneStore first; the
 * backend is updated only after the core patch is accepted.
 */
export class GraphSceneRuntime {
  public readonly scene: GraphSceneStore;
  public readonly router: GraphInteractionRouter;
  private backend: GraphRenderBackend | null;
  private readonly handlesByObjectId = new Map<string, GraphRenderHandle>();
  private readonly defaultLayerId: GraphLayerId;
  private defaultContext: GraphBackendContext;

  public constructor(options: GraphSceneRuntimeOptions = {}) {
    this.scene = options.scene ?? new GraphSceneStore('scene');
    this.backend = options.backend ?? null;
    this.router = options.router ?? new GraphInteractionRouter();
    this.defaultLayerId = options.defaultLayerId ?? 'content';
    this.defaultContext = options.defaultContext ? { ...options.defaultContext } : {};
    if (this.backend) {
      this.router.registerBackend(this.backend, this.defaultLayerId);
    }
  }

  public setBackend(backend: GraphRenderBackend | null, layerId: GraphLayerId = this.defaultLayerId): void {
    if (this.backend) {
      for (const handle of this.handlesByObjectId.values()) {
        this.backend.remove(handle);
      }
      this.backend.flush?.({ timestamp: Date.now() });
      this.router.unregisterBackend(this.backend.id);
    }
    this.backend = backend;
    this.handlesByObjectId.clear();
    if (backend) {
      this.router.registerBackend(backend, layerId);
      this.renderAll();
    }
  }

  public mount(host: GraphBackendHost, options: GraphBackendMountOptions = {}): GraphBackendMountResult {
    const backend = this.requireBackend();
    return backend.mount(host, options);
  }

  public addObject(
    node: GraphObjectNode,
    options: { root?: boolean; replace?: boolean; context?: GraphBackendContext } = {}
  ): GraphOperationResult<GraphObjectNode> {
    const result = this.scene.addObject(node, { root: options.root, replace: options.replace });
    if (!result.ok || !result.value) return result;
    this.renderNode(result.value, options.context);
    return result;
  }

  public updateObject(
    objectId: string,
    patch: GraphObjectPatch,
    context?: GraphBackendContext
  ): GraphOperationResult<GraphObjectNode> {
    return this.updateObjectInternal(objectId, patch, context, { flush: true });
  }

  private updateObjectInternal(
    objectId: string,
    patch: GraphObjectPatch,
    context: GraphBackendContext | undefined,
    options: { flush: boolean }
  ): GraphOperationResult<GraphObjectNode> {
    const result = this.scene.updateObject(objectId, patch);
    if (!result.ok || !result.value) return result;
    if (isSelectedRuntimeNode(result.value)) {
      const moved = this.scene.moveObjectToTop(objectId);
      if (!moved.ok) return { ok: false, diagnostics: moved.diagnostics };
    }

    const backend = this.backend;
    const handle = this.handlesByObjectId.get(objectId);
    if (backend && handle) {
      backend.update(handle, patch, this.createContext(result.value, context));
    } else if (backend) {
      this.renderNode(result.value, context);
    }
    if (options.flush) {
      this.backend?.flush?.({ timestamp: Date.now(), dirtyObjectIds: [objectId] });
    }
    return result;
  }

  public removeObject(objectId: string): GraphOperationResult<GraphObjectNode> {
    return this.removeObjectInternal(objectId, { flush: true });
  }

  public syncObjects(
    nodes: readonly GraphObjectNode[],
    context?: GraphBackendContext
  ): GraphOperationResult<GraphObjectNode[]> {
    const normalized = normalizeRuntimeSyncNodes(nodes, this.scene.id);
    if (!normalized.ok || !normalized.value) return normalized;

    const nextNodesById = new Map(normalized.value.map((node) => [node.id, node]));
    const dirtyObjectIds: string[] = [];

    for (const current of this.scene.listObjects()) {
      if (!nextNodesById.has(current.id)) {
        const removed = this.removeObjectInternal(current.id, { flush: false });
        if (!removed.ok) return { ok: false, diagnostics: removed.diagnostics };
        dirtyObjectIds.push(current.id);
      }
    }

    for (const node of normalized.value) {
      const current = this.scene.getObject(node.id);
      if (!current) {
        const added = this.addObject(node, { context });
        if (!added.ok) return { ok: false, diagnostics: added.diagnostics };
        dirtyObjectIds.push(node.id);
        continue;
      }

      if (areRuntimeSyncNodesEqual(current, node)) continue;

      if (requiresRuntimeSyncReplace(current, node)) {
        const removed = this.removeObjectInternal(node.id, { flush: false });
        if (!removed.ok) return { ok: false, diagnostics: removed.diagnostics };
        const added = this.addObject(node, { context });
        if (!added.ok) return { ok: false, diagnostics: added.diagnostics };
      } else {
        const updated = this.updateObjectInternal(node.id, createRuntimeSyncPatch(node), context, { flush: false });
        if (!updated.ok) return { ok: false, diagnostics: updated.diagnostics };
      }
      dirtyObjectIds.push(node.id);
    }

    const ordered = this.reorderSceneObjects(normalized.value);
    if (!ordered.ok) return { ok: false, diagnostics: ordered.diagnostics };

    if (dirtyObjectIds.length > 0) {
      this.backend?.flush?.({ timestamp: Date.now(), dirtyObjectIds });
    }

    return okResult(this.scene.listObjects());
  }

  public applyDragToObject(
    objectId: string,
    drag: GraphCreateDragPatchOptions | GraphDragSession
  ): GraphOperationResult<GraphObjectNode> {
    const node = this.scene.getObject(objectId);
    if (!node) {
      return errorResult('runtime.missing-object', `Graph object ${objectId} does not exist.`, {
        scope: 'object',
        objectId
      });
    }
    if (node.type === 'coordinate-system') {
      const patches = createGraphCoordinateSystemDragPatches(this.scene.listObjects(), node, drag);
      if (!patches.ok || !patches.value) return { ok: false, diagnostics: patches.diagnostics };

      let targetResult: GraphOperationResult<GraphObjectNode> | null = null;
      const dirtyObjectIds: string[] = [];
      for (const scopedPatch of patches.value) {
        const result = this.updateObjectInternal(scopedPatch.objectId, scopedPatch.patch, undefined, { flush: false });
        if (!result.ok) return result;
        dirtyObjectIds.push(scopedPatch.objectId);
        if (scopedPatch.objectId === objectId) targetResult = result;
      }
      if (dirtyObjectIds.length > 0) {
        this.backend?.flush?.({ timestamp: Date.now(), dirtyObjectIds });
      }
      if (targetResult) return targetResult;
      const updated = this.scene.getObject(objectId);
      return updated
        ? { ok: true, value: updated, diagnostics: [] }
        : errorResult('runtime.missing-object', `Graph object ${objectId} does not exist.`, {
          scope: 'object',
          objectId
        });
    }
    const patch = createGraphDragPatch(node, drag);
    return patch.ok && patch.value
      ? this.updateObject(objectId, patch.value)
      : { ok: false, diagnostics: patch.diagnostics };
  }

  public clear(): void {
    if (this.backend) {
      for (const handle of this.handlesByObjectId.values()) {
        this.backend.remove(handle);
      }
      this.backend.flush?.({ timestamp: Date.now() });
    }
    this.handlesByObjectId.clear();
    this.scene.clear();
  }

  public renderAll(context?: GraphBackendContext): void {
    if (!this.backend) return;
    for (const handle of this.handlesByObjectId.values()) {
      this.backend.remove(handle);
    }
    this.handlesByObjectId.clear();
    this.scene.listObjects().forEach((node) => this.renderNode(node, context));
    this.backend.flush?.({ timestamp: Date.now() });
  }

  public snapshot(): GraphSceneRuntimeSnapshot {
    const snapshot = this.scene.snapshot();
    return {
      ...snapshot,
      handles: [...this.handlesByObjectId.values()].map(cloneHandle)
    };
  }

  public setDefaultContext(context: GraphBackendContext): void {
    this.defaultContext = { ...context };
  }

  private renderNode(node: GraphObjectNode, context?: GraphBackendContext): void {
    if (!this.backend) return;
    const previous = this.handlesByObjectId.get(node.id);
    if (previous) this.backend.remove(previous);
    const result = this.backend.create(node, this.createContext(node, context));
    if (result.ok && result.value) {
      this.handlesByObjectId.set(node.id, cloneHandle(result.value));
    }
  }

  private removeObjectInternal(
    objectId: string,
    options: { flush: boolean }
  ): GraphOperationResult<GraphObjectNode> {
    const result = this.scene.removeObject(objectId);
    if (!result.ok) return result;
    const handle = this.handlesByObjectId.get(objectId);
    if (handle && this.backend) {
      this.backend.remove(handle);
    }
    this.handlesByObjectId.delete(objectId);
    if (options.flush) {
      this.backend?.flush?.({ timestamp: Date.now(), dirtyObjectIds: [objectId] });
    }
    return result;
  }

  private reorderSceneObjects(nodes: readonly GraphObjectNode[]): GraphOperationResult<GraphObjectNode[]> {
    for (const node of nodes) {
      const moved = this.scene.moveObjectToTop(node.id);
      if (!moved.ok) return { ok: false, diagnostics: moved.diagnostics };
    }
    for (const node of nodes) {
      const current = this.scene.getObject(node.id);
      if (!current || !isSelectedRuntimeNode(current)) continue;
      const moved = this.scene.moveObjectToTop(node.id);
      if (!moved.ok) return { ok: false, diagnostics: moved.diagnostics };
    }
    return okResult(this.scene.listObjects());
  }

  private createContext(node: GraphObjectNode, context?: GraphBackendContext): GraphBackendContext {
    return {
      ...this.defaultContext,
      ...context,
      layerId: context?.layerId ?? this.defaultContext.layerId ?? node.layerId ?? this.defaultLayerId
    };
  }

  private requireBackend(): GraphRenderBackend {
    if (!this.backend) {
      throw new Error('GraphSceneRuntime requires a backend before mounting.');
    }
    return this.backend;
  }
}

const normalizeRuntimeSyncNodes = (
  nodes: readonly GraphObjectNode[],
  sceneId: string
): GraphOperationResult<GraphObjectNode[]> => {
  const store = new GraphSceneStore(`${sceneId}:sync`);
  for (const node of nodes) {
    const added = store.addObject(node);
    if (!added.ok) return { ok: false, diagnostics: added.diagnostics };
  }
  return okResult(store.listObjects());
};

const areRuntimeSyncNodesEqual = (left: GraphObjectNode, right: GraphObjectNode): boolean => (
  JSON.stringify(left) === JSON.stringify(right)
);

const requiresRuntimeSyncReplace = (current: GraphObjectNode, next: GraphObjectNode): boolean => (
  current.kind !== next.kind
  || current.type !== next.type
  || cannotPatchClearedCollection(current.dependencies, next.dependencies)
  || cannotPatchClearedCollection(current.children, next.children)
  || cannotPatchClearedCollection(current.relations, next.relations)
  || cannotPatchClearedCollection(current.capabilities, next.capabilities)
);

const cannotPatchClearedCollection = <T>(current: readonly T[] | undefined, next: readonly T[] | undefined): boolean => (
  current !== undefined && next === undefined
);

const createRuntimeSyncPatch = (node: GraphObjectNode): GraphObjectPatch => ({
  payload: node.payload,
  backendHint: node.backendHint ?? null,
  layerId: node.layerId ?? null,
  ...(node.dependencies !== undefined ? { dependencies: node.dependencies } : {}),
  ...(node.children !== undefined ? { children: node.children } : {}),
  ...(node.relations !== undefined ? { relations: node.relations } : {}),
  ...(node.capabilities !== undefined ? { capabilities: node.capabilities } : {}),
  renderHints: node.renderHints ?? null,
  meta: node.meta ?? null
});

const isSelectedRuntimeNode = (node: GraphObjectNode): boolean => (
  node.meta?.selected === true || node.renderHints?.selected === true
);

export const createGraphSceneRuntime = (options?: GraphSceneRuntimeOptions): GraphSceneRuntime => new GraphSceneRuntime(options);
