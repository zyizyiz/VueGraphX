import type {
  GraphBackendCapabilities,
  GraphBackendContext,
  GraphBackendMountOptions,
  GraphBackendMountResult,
  GraphClientPoint,
  GraphObjectNode,
  GraphObjectPatch,
  GraphPickOptions,
  GraphPickResult,
  GraphRenderBackend,
  GraphRenderHandle,
  GraphViewportRef,
  GraphViewportSize,
  GraphWorldPoint
} from '@vuegraphx/core';
import { createGraphObjectNode, mergeGraphObjectPatch } from '@vuegraphx/core';

export interface BabylonRuntimePickResult {
  objectId: string;
  componentId?: string;
  worldPoint?: GraphWorldPoint;
  distancePx?: number;
  meta?: Record<string, unknown>;
}

export interface BabylonRuntimePort {
  mount(host: HTMLElement, options?: GraphBackendMountOptions): void;
  createSolid(node: GraphObjectNode, handle: GraphRenderHandle, context?: GraphBackendContext): void;
  updateSolid(handle: GraphRenderHandle, patch: GraphObjectPatch, context?: GraphBackendContext): void;
  remove(handle: GraphRenderHandle): void;
  pick(point: GraphClientPoint, options?: GraphPickOptions): BabylonRuntimePickResult | null;
  project?(point: GraphWorldPoint, viewport?: GraphViewportRef): GraphClientPoint | null;
  unproject?(point: GraphClientPoint, viewport?: GraphViewportRef): GraphWorldPoint | null;
  resize?(size: GraphViewportSize): void;
  renderFrame?(): void;
  destroy(): void;
}

export interface BabylonGraphBackendOptions {
  id?: string;
  runtime?: BabylonRuntimePort;
  capabilities?: Partial<GraphBackendCapabilities>;
}

export class BabylonGraphBackend implements GraphRenderBackend {
  public readonly id: string;
  public readonly capabilities: GraphBackendCapabilities;
  private readonly nodes = new Map<string, GraphObjectNode>();
  private readonly handles = new Map<string, GraphRenderHandle>();
  private size: GraphViewportSize | undefined;
  private readonly runtime: BabylonRuntimePort | null;

  public constructor(options: BabylonGraphBackendOptions = {}) {
    this.id = options.id ?? 'babylon';
    this.runtime = options.runtime ?? null;
    this.capabilities = {
      pick: true,
      project: true,
      unproject: true,
      drag: true,
      layers: true,
      dimensions: ['3d'],
      ...(options.capabilities ?? {})
    };
  }

  public mount(host: HTMLElement, options: GraphBackendMountOptions = {}): GraphBackendMountResult {
    this.runtime?.mount(host, options);
    this.size = options.size ? { ...options.size } : this.size;
    return { backendId: options.backendId ?? this.id, size: this.size };
  }

  public create(node: GraphObjectNode, context: GraphBackendContext = {}): GraphRenderHandle {
    const stored = createGraphObjectNode(node);
    const layerId = context.layerId ?? stored.layerId ?? 'content';
    const handle: GraphRenderHandle = {
      id: `${this.id}:${stored.id}`,
      objectId: stored.id,
      backendId: this.id,
      layerId,
      target: { scope: 'object', objectId: stored.id, backendId: this.id, layerId }
    };
    this.nodes.set(stored.id, { ...stored, layerId });
    this.handles.set(handle.id, handle);
    if (node.type === 'solid') {
      this.runtime?.createSolid(node, handle, context);
    }
    return handle;
  }

  public update(handle: GraphRenderHandle, patch: GraphObjectPatch, context: GraphBackendContext = {}): void {
    const current = this.nodes.get(handle.objectId);
    if (current) {
      const next = mergeGraphObjectPatch(current, patch);
      this.nodes.set(handle.objectId, { ...next, layerId: context.layerId ?? next.layerId ?? handle.layerId });
    }
    this.runtime?.updateSolid(handle, patch, context);
  }

  public remove(handle: GraphRenderHandle): void {
    this.nodes.delete(handle.objectId);
    this.handles.delete(handle.id);
    this.runtime?.remove(handle);
  }

  public pick(point: GraphClientPoint, options: GraphPickOptions = {}): GraphPickResult | null {
    const runtimePick = this.runtime?.pick(point, options) ?? null;
    if (runtimePick) {
      return {
        target: {
          scope: runtimePick.componentId ? 'component' : 'object',
          objectId: runtimePick.objectId,
          componentId: runtimePick.componentId,
          backendId: this.id,
          layerId: 'content'
        },
        backendId: this.id,
        layerId: 'content',
        clientPoint: { ...point },
        worldPoint: runtimePick.worldPoint,
        distancePx: runtimePick.distancePx,
        meta: runtimePick.meta ? { ...runtimePick.meta } : undefined
      };
    }
    return null;
  }

  public project(point: GraphWorldPoint, viewport?: GraphViewportRef): GraphClientPoint | null {
    return this.runtime?.project?.(point, viewport) ?? { x: point.x, y: point.y };
  }

  public unproject(point: GraphClientPoint, viewport?: GraphViewportRef): GraphWorldPoint | null {
    return this.runtime?.unproject?.(point, viewport) ?? { dimension: '3d', x: point.x, y: point.y, z: 0 };
  }

  public flush(): void {
    this.runtime?.renderFrame?.();
  }

  public resize(size: GraphViewportSize): void {
    this.size = { ...size };
    this.runtime?.resize?.(size);
  }

  public destroy(): void {
    this.nodes.clear();
    this.handles.clear();
    this.runtime?.destroy();
  }
}

export const createBabylonGraphBackend = (options?: BabylonGraphBackendOptions): BabylonGraphBackend => new BabylonGraphBackend(options);
