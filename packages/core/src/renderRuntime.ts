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
import {
  cloneGraphRuntimeSelectionItem,
  cloneGraphRuntimeSelectionItems,
  createGraphRuntimeSelectionItem,
  isGraphRuntimeSelectedNode,
  resolveGraphRuntimeSelectionChangeReason,
  sameGraphRuntimeSelectionItems,
  type GraphRuntimeSelectionChangeEvent,
  type GraphRuntimeSelectionChangeSource,
  type GraphRuntimeSelectionItem,
  type GraphRuntimeSelectionListener
} from './selection';

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

export interface GraphSceneRuntimeSelectionOptions {
  source?: GraphRuntimeSelectionChangeSource;
}

export interface GraphSceneRuntimeSelectionMutationOptions extends GraphSceneRuntimeSelectionOptions {
  context?: GraphBackendContext;
}

export interface GraphSceneRuntimeObjectSelectionOptions extends GraphSceneRuntimeSelectionMutationOptions {
  exclusive?: boolean;
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
  private selectionListeners: GraphRuntimeSelectionListener[] = [];
  private selectionRevision = 0;

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
    const previousSelection = this.readSelectionItems();
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
    this.dispatchSelectionChange(previousSelection, 'api');
  }

  public mount(host: GraphBackendHost, options: GraphBackendMountOptions = {}): GraphBackendMountResult {
    const backend = this.requireBackend();
    return backend.mount(host, options);
  }

  public addObject(
    node: GraphObjectNode,
    options: { root?: boolean; replace?: boolean; context?: GraphBackendContext; source?: GraphRuntimeSelectionChangeSource } = {}
  ): GraphOperationResult<GraphObjectNode> {
    const previousSelection = this.readSelectionItems();
    const result = this.addObjectInternal(node, options);
    if (result.ok) this.dispatchSelectionChange(previousSelection, options.source ?? 'api');
    return result;
  }

  private addObjectInternal(
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
    context?: GraphBackendContext,
    options: GraphSceneRuntimeSelectionOptions = {}
  ): GraphOperationResult<GraphObjectNode> {
    const previousSelection = this.readSelectionItems();
    const result = this.updateObjectInternal(objectId, patch, context, { flush: true });
    if (result.ok) this.dispatchSelectionChange(previousSelection, options.source ?? 'api');
    return result;
  }

  private updateObjectInternal(
    objectId: string,
    patch: GraphObjectPatch,
    context: GraphBackendContext | undefined,
    options: { flush: boolean }
  ): GraphOperationResult<GraphObjectNode> {
    const result = this.scene.updateObject(objectId, patch);
    if (!result.ok || !result.value) return result;
    if (isGraphRuntimeSelectedNode(result.value)) {
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

  public removeObject(
    objectId: string,
    options: GraphSceneRuntimeSelectionOptions = {}
  ): GraphOperationResult<GraphObjectNode> {
    const previousSelection = this.readSelectionItems();
    const result = this.removeObjectInternal(objectId, { flush: true });
    if (result.ok) this.dispatchSelectionChange(previousSelection, options.source ?? 'delete');
    return result;
  }

  public syncObjects(
    nodes: readonly GraphObjectNode[],
    context?: GraphBackendContext
  ): GraphOperationResult<GraphObjectNode[]> {
    const normalized = normalizeRuntimeSyncNodes(nodes, this.scene.id);
    if (!normalized.ok || !normalized.value) return normalized;

    const previousSelection = this.readSelectionItems();
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
        const added = this.addObjectInternal(node, { context });
        if (!added.ok) return { ok: false, diagnostics: added.diagnostics };
        dirtyObjectIds.push(node.id);
        continue;
      }

      if (areRuntimeSyncNodesEqual(current, node)) continue;

      if (requiresRuntimeSyncReplace(current, node)) {
        const removed = this.removeObjectInternal(node.id, { flush: false });
        if (!removed.ok) return { ok: false, diagnostics: removed.diagnostics };
        const added = this.addObjectInternal(node, { context });
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

    const result = okResult(this.scene.listObjects());
    this.dispatchSelectionChange(previousSelection, 'sync');
    return result;
  }

  public subscribeSelection(listener: GraphRuntimeSelectionListener): () => void {
    this.selectionListeners.push(listener);
    const selected = this.getSelectionItems();
    listener({
      primary: this.getPrimarySelectionItem(selected),
      selected,
      previous: [],
      reason: 'snapshot',
      source: 'api',
      revision: this.selectionRevision
    });
    return () => {
      this.selectionListeners = this.selectionListeners.filter((current) => current !== listener);
    };
  }

  public getSelectionItems(): GraphRuntimeSelectionItem[] {
    return cloneGraphRuntimeSelectionItems(this.readSelectionItems());
  }

  public selectObject(
    objectId: string,
    options: GraphSceneRuntimeObjectSelectionOptions = {}
  ): GraphOperationResult<GraphObjectNode> {
    const current = this.scene.getObject(objectId);
    if (!current) {
      return errorResult('runtime.missing-object', `Graph object ${objectId} does not exist.`, {
        scope: 'object',
        objectId
      });
    }

    const previousSelection = this.readSelectionItems();
    const dirtyObjectIds: string[] = [];
    let selectedResult: GraphOperationResult<GraphObjectNode> = okResult(current);
    const exclusive = options.exclusive ?? true;
    const nodes = this.scene.listObjects();

    if (exclusive) {
      for (const node of nodes) {
        if (node.id === objectId || !isGraphRuntimeSelectedNode(node)) continue;
        const updated = this.updateObjectInternal(
          node.id,
          createRuntimeSelectionPatch(node, false),
          options.context,
          { flush: false }
        );
        if (!updated.ok) return updated;
        dirtyObjectIds.push(node.id);
      }
    }

    const latest = this.scene.getObject(objectId) ?? current;
    if (!isGraphRuntimeSelectedNode(latest)) {
      selectedResult = this.updateObjectInternal(
        objectId,
        createRuntimeSelectionPatch(latest, true),
        options.context,
        { flush: false }
      );
      if (!selectedResult.ok) return selectedResult;
      dirtyObjectIds.push(objectId);
    }

    if (dirtyObjectIds.length > 0) {
      this.backend?.flush?.({ timestamp: Date.now(), dirtyObjectIds });
    }
    this.dispatchSelectionChange(previousSelection, options.source ?? 'api');
    return selectedResult;
  }

  public clearSelection(
    options: GraphSceneRuntimeSelectionMutationOptions = {}
  ): GraphOperationResult<GraphObjectNode[]> {
    const previousSelection = this.readSelectionItems();
    const dirtyObjectIds: string[] = [];
    const changedNodes: GraphObjectNode[] = [];

    for (const node of this.scene.listObjects()) {
      if (!isGraphRuntimeSelectedNode(node)) continue;
      const updated = this.updateObjectInternal(
        node.id,
        createRuntimeSelectionPatch(node, false),
        options.context,
        { flush: false }
      );
      if (!updated.ok || !updated.value) return { ok: false, diagnostics: updated.diagnostics };
      changedNodes.push(updated.value);
      dirtyObjectIds.push(node.id);
    }

    if (dirtyObjectIds.length > 0) {
      this.backend?.flush?.({ timestamp: Date.now(), dirtyObjectIds });
    }
    this.dispatchSelectionChange(previousSelection, options.source ?? 'clear');
    return okResult(changedNodes);
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
    const previousSelection = this.readSelectionItems();
    if (this.backend) {
      for (const handle of this.handlesByObjectId.values()) {
        this.backend.remove(handle);
      }
      this.backend.flush?.({ timestamp: Date.now() });
    }
    this.handlesByObjectId.clear();
    this.scene.clear();
    this.dispatchSelectionChange(previousSelection, 'clear');
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
      if (!current || !isGraphRuntimeSelectedNode(current)) continue;
      const moved = this.scene.moveObjectToTop(node.id);
      if (!moved.ok) return { ok: false, diagnostics: moved.diagnostics };
    }
    return okResult(this.scene.listObjects());
  }

  private readSelectionItems(): GraphRuntimeSelectionItem[] {
    return this.scene.listObjects()
      .filter(isGraphRuntimeSelectedNode)
      .map((node) => {
        const handle = this.handlesByObjectId.get(node.id);
        return createGraphRuntimeSelectionItem(node, {
          backendId: handle?.backendId,
          target: handle?.target
        });
      });
  }

  private getPrimarySelectionItem(items: readonly GraphRuntimeSelectionItem[]): GraphRuntimeSelectionItem | null {
    return items.length > 0 ? cloneGraphRuntimeSelectionItem(items[items.length - 1]) : null;
  }

  private dispatchSelectionChange(
    previous: readonly GraphRuntimeSelectionItem[],
    source: GraphRuntimeSelectionChangeSource
  ): void {
    const selected = this.readSelectionItems();
    if (sameGraphRuntimeSelectionItems(previous, selected)) {
      return;
    }

    this.selectionRevision += 1;
    const event: GraphRuntimeSelectionChangeEvent = {
      primary: this.getPrimarySelectionItem(selected),
      selected: cloneGraphRuntimeSelectionItems(selected),
      previous: cloneGraphRuntimeSelectionItems(previous),
      reason: resolveGraphRuntimeSelectionChangeReason(previous, selected),
      source,
      revision: this.selectionRevision
    };
    this.selectionListeners.forEach((listener) => listener(event));
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

const createRuntimeSelectionPatch = (node: GraphObjectNode, selected: boolean): GraphObjectPatch => ({
  meta: {
    ...(node.meta ?? {}),
    selected
  },
  ...(node.renderHints?.selected !== undefined
    ? {
        renderHints: {
          ...node.renderHints,
          selected
        }
      }
    : {})
});

export const createGraphSceneRuntime = (options?: GraphSceneRuntimeOptions): GraphSceneRuntime => new GraphSceneRuntime(options);
