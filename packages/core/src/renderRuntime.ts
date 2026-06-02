import {
  errorResult,
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
    const result = this.scene.updateObject(objectId, patch);
    if (!result.ok || !result.value) return result;

    const backend = this.backend;
    const handle = this.handlesByObjectId.get(objectId);
    if (backend && handle) {
      backend.update(handle, patch, this.createContext(result.value, context));
    } else if (backend) {
      this.renderNode(result.value, context);
    }
    this.backend?.flush?.({ timestamp: Date.now(), dirtyObjectIds: [objectId] });
    return result;
  }

  public removeObject(objectId: string): GraphOperationResult<GraphObjectNode> {
    const result = this.scene.removeObject(objectId);
    if (!result.ok) return result;
    const handle = this.handlesByObjectId.get(objectId);
    if (handle && this.backend) {
      this.backend.remove(handle);
    }
    this.handlesByObjectId.delete(objectId);
    this.backend?.flush?.({ timestamp: Date.now(), dirtyObjectIds: [objectId] });
    return result;
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
      for (const scopedPatch of patches.value) {
        const result = this.updateObject(scopedPatch.objectId, scopedPatch.patch);
        if (!result.ok) return result;
        if (scopedPatch.objectId === objectId) targetResult = result;
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

export const createGraphSceneRuntime = (options?: GraphSceneRuntimeOptions): GraphSceneRuntime => new GraphSceneRuntime(options);
