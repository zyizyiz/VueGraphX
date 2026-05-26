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

export interface JsxGraphRuntimePort {
  mount(host: HTMLElement, options?: GraphBackendMountOptions): void;
  createObject(node: GraphObjectNode, handle: GraphRenderHandle, context?: GraphBackendContext): void;
  updateObject(handle: GraphRenderHandle, patch: GraphObjectPatch, context?: GraphBackendContext): void;
  removeObject(handle: GraphRenderHandle): void;
  pick?(point: GraphClientPoint, options?: GraphPickOptions): GraphPickResult | null;
  project?(point: GraphWorldPoint, viewport?: GraphViewportRef): GraphClientPoint | null;
  unproject?(point: GraphClientPoint, viewport?: GraphViewportRef): GraphWorldPoint | null;
  resize?(size: GraphViewportSize): void;
  flush?(): void;
  destroy(): void;
}

export interface JsxGraphBackendOptions {
  id?: string;
  runtime?: JsxGraphRuntimePort;
  capabilities?: Partial<GraphBackendCapabilities>;
}

export class JsxGraphBackend implements GraphRenderBackend {
  public readonly id: string;
  public readonly capabilities: GraphBackendCapabilities;
  private readonly nodes = new Map<string, GraphObjectNode>();
  private readonly handles = new Map<string, GraphRenderHandle>();
  private size: GraphViewportSize | undefined;
  private readonly runtime: JsxGraphRuntimePort | null;

  public constructor(options: JsxGraphBackendOptions = {}) {
    this.id = options.id ?? 'jsxgraph';
    this.capabilities = {
      pick: true,
      project: true,
      unproject: true,
      drag: true,
      layers: true,
      dimensions: ['2d', '3d'],
      ...(options.capabilities ?? {})
    };
    this.runtime = options.runtime ?? null;
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
    this.runtime?.createObject(node, handle, context);
    return handle;
  }

  public update(handle: GraphRenderHandle, patch: GraphObjectPatch, context: GraphBackendContext = {}): void {
    const current = this.nodes.get(handle.objectId);
    if (current) {
      const next = mergeGraphObjectPatch(current, patch);
      this.nodes.set(handle.objectId, { ...next, layerId: context.layerId ?? next.layerId ?? handle.layerId });
    }
    this.runtime?.updateObject(handle, patch, context);
  }

  public remove(handle: GraphRenderHandle): void {
    this.nodes.delete(handle.objectId);
    this.handles.delete(handle.id);
    this.runtime?.removeObject(handle);
  }

  public pick(point: GraphClientPoint, options: GraphPickOptions = {}): GraphPickResult | null {
    return this.runtime?.pick?.(point, options) ?? null;
  }

  public project(point: GraphWorldPoint, viewport?: GraphViewportRef): GraphClientPoint | null {
    return this.runtime?.project?.(point, viewport) ?? { x: point.x, y: point.y };
  }

  public unproject(point: GraphClientPoint, viewport?: GraphViewportRef): GraphWorldPoint | null {
    return this.runtime?.unproject?.(point, viewport) ?? { dimension: '2d', x: point.x, y: point.y };
  }

  public resize(size: GraphViewportSize): void {
    this.size = { ...size };
    this.runtime?.resize?.(size);
  }

  public flush(): void {
    this.runtime?.flush?.();
  }

  public destroy(): void {
    this.nodes.clear();
    this.handles.clear();
    this.runtime?.destroy();
  }
}

export const createJsxGraphBackend = (options?: JsxGraphBackendOptions): JsxGraphBackend => new JsxGraphBackend(options);
