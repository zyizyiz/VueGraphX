import type {
  GraphBackendCapabilities,
  GraphBackendContext,
  GraphBackendHost,
  GraphBackendMountOptions,
  GraphBackendMountResult,
  GraphClientPoint,
  GraphObjectNode,
  GraphObjectPatch,
  GraphOperationResult,
  GraphPickOptions,
  GraphPickResult,
  GraphRenderBackend,
  GraphRenderHandle,
  GraphViewportRef,
  GraphViewportSize,
  GraphWorldPoint
} from '@vuegraphx/core';
import {
  createGraphBackendInteractionCapability,
  createGraphBackendMathInteractionCapabilities,
  createGraphObjectNode,
  mergeGraphObjectPatch,
  okResult
} from '@vuegraphx/core';

export interface BabylonRuntimePickResult {
  objectId: string;
  componentId?: string;
  worldPoint?: GraphWorldPoint;
  distancePx?: number;
  meta?: Record<string, unknown>;
}

export interface BabylonRuntimePort {
  mount(host: HTMLElement, options?: GraphBackendMountOptions): void;
  getSupportStatus?(node: GraphObjectNode, context?: GraphBackendContext): BabylonBackendSupportStatus | null;
  createObject(node: GraphObjectNode, handle: GraphRenderHandle, context?: GraphBackendContext): void;
  updateObject(handle: GraphRenderHandle, patch: GraphObjectPatch, context?: GraphBackendContext): void;
  createSolid?(node: GraphObjectNode, handle: GraphRenderHandle, context?: GraphBackendContext): void;
  updateSolid?(handle: GraphRenderHandle, patch: GraphObjectPatch, context?: GraphBackendContext): void;
  remove(handle: GraphRenderHandle): void;
  pick(point: GraphClientPoint, options?: GraphPickOptions): BabylonRuntimePickResult | null;
  project?(point: GraphWorldPoint, viewport?: GraphViewportRef): GraphClientPoint | null;
  unproject?(point: GraphClientPoint, viewport?: GraphViewportRef): GraphWorldPoint | null;
  setWorldBounds?(bounds: { left: number; right: number; top: number; bottom: number }): void;
  resize?(size: GraphViewportSize): void;
  renderFrame?(): void;
  destroy(): void;
}

export interface BabylonGraphBackendOptions {
  id?: string;
  runtime?: BabylonRuntimePort;
  capabilities?: Partial<GraphBackendCapabilities>;
}

export type BabylonBackendSupportStatus = 'success' | 'unsupported' | 'partial-support';

const getBabylonSupportStatus = (node: GraphObjectNode): BabylonBackendSupportStatus => {
  if (node.type === 'solid') return 'success';
  return 'unsupported';
};

const createBackendSupportDiagnosticResult = (
  backendId: string,
  node: GraphObjectNode,
  status: Exclude<BabylonBackendSupportStatus, 'success'>
): GraphOperationResult<GraphRenderHandle> => ({
  ok: false,
  diagnostics: [{
    code: status === 'partial-support' ? 'backend.partial-support' : 'backend.unsupported-object',
    message: `Backend ${backendId} reports ${status} for object ${node.id} (${node.type}).`,
    severity: status === 'partial-support' ? 'warning' : 'error',
    target: {
      scope: 'object',
      objectId: node.id,
      backendId,
      layerId: node.layerId ?? 'content'
    }
  }]
});

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
      mathInteractions: createGraphBackendMathInteractionCapabilities({
        'viewport.zoom': createGraphBackendInteractionCapability('supported', {
          mechanism: '3D ArcRotateCamera controls'
        }),
        'viewport.gestureZoom': createGraphBackendInteractionCapability('partial-support', {
          mechanism: 'native 3D camera controls',
          native: true,
          reason: 'Planar annotations are rendered by the independent Canvas2D overlay, not the Babylon backend.'
        }),
        'viewport.pan': createGraphBackendInteractionCapability('supported', {
          mechanism: '3D ArcRotateCamera controls'
        }),
        'object.pick': createGraphBackendInteractionCapability('supported', { mechanism: 'runtime scene.pick metadata' }),
        'object.select': createGraphBackendInteractionCapability('supported', { mechanism: 'core-meta-selected' }),
        'object.highlight': createGraphBackendInteractionCapability('supported', { mechanism: 'selected 3D material state' }),
        project: createGraphBackendInteractionCapability('supported', { mechanism: 'runtime project adapter' }),
        unproject: createGraphBackendInteractionCapability('supported', { mechanism: 'runtime unproject adapter' }),
        diagnostics: createGraphBackendInteractionCapability('supported', { mechanism: 'GraphOperationDiagnostic' })
      }),
      ...(options.capabilities ?? {})
    };
  }

  public mount(host: GraphBackendHost, options: GraphBackendMountOptions = {}): GraphBackendMountResult {
    const hostElement = resolveHostElement(host);
    if (this.runtime && !hostElement) {
      throw new Error('BabylonGraphBackend runtime requires an HTMLElement host.');
    }
    if (hostElement) this.runtime?.mount(hostElement, options);
    this.size = options.size ? { ...options.size } : this.size;
    return { backendId: options.backendId ?? this.id, size: this.size };
  }

  public create(node: GraphObjectNode, context: GraphBackendContext = {}): GraphOperationResult<GraphRenderHandle> {
    const status = combineBabylonSupportStatus(
      getBabylonSupportStatus(node),
      this.runtime?.getSupportStatus?.(node, context) ?? 'success'
    );
    if (status !== 'success') {
      return createBackendSupportDiagnosticResult(this.id, node, status);
    }
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
    this.runtime?.createObject(stored, handle, context);
    return okResult(handle);
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

  public setWorldBounds(bounds: { left: number; right: number; top: number; bottom: number }): void {
    this.runtime?.setWorldBounds?.(bounds);
  }

  public destroy(): void {
    this.nodes.clear();
    this.handles.clear();
    this.runtime?.destroy();
  }
}

const resolveHostElement = (host: GraphBackendHost): HTMLElement | null => {
  if (typeof HTMLElement === 'undefined') return null;
  if (host instanceof HTMLElement) return host;
  if (host.resource instanceof HTMLElement) return host.resource;
  return null;
};

export const createBabylonGraphBackend = (options?: BabylonGraphBackendOptions): BabylonGraphBackend => new BabylonGraphBackend(options);

const combineBabylonSupportStatus = (
  staticStatus: BabylonBackendSupportStatus,
  runtimeStatus: BabylonBackendSupportStatus
): BabylonBackendSupportStatus => {
  if (staticStatus === 'unsupported' || runtimeStatus === 'unsupported') return 'unsupported';
  if (staticStatus === 'partial-support' || runtimeStatus === 'partial-support') return 'partial-support';
  return 'success';
};
