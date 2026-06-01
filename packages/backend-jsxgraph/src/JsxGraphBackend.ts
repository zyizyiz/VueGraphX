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

type BackendSupportStatus = 'success' | 'unsupported' | 'partial-support';

const JSXGRAPH_SUPPORTED_TYPES = new Set([
  'point',
  'text',
  'angle',
  'circle',
  'arc',
  'sector',
  'semicircle',
  'polygon',
  'segment',
  'line',
  'ray',
  'polyline',
  'function',
  'derivative',
  'vector',
  'measurement',
  'midpoint',
  'intersection',
  'perpendicular-line',
  'parallel-line',
  'tangent',
  'translated',
  'rotated',
  'conic',
  'equation',
  'solid'
]);
const JSXGRAPH_PARTIAL_TYPES = new Set(['parametric']);

const getJsxGraphSupportStatus = (node: GraphObjectNode): BackendSupportStatus => {
  if (node.type === 'implicit') return hasRenderablePathGeometry(node) ? 'success' : 'unsupported';
  if (JSXGRAPH_SUPPORTED_TYPES.has(node.type)) return 'success';
  if (JSXGRAPH_PARTIAL_TYPES.has(node.type)) return 'partial-support';
  return 'unsupported';
};

const createBackendSupportDiagnosticResult = (
  backendId: string,
  node: GraphObjectNode,
  status: Exclude<BackendSupportStatus, 'success'>
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
      mathInteractions: createGraphBackendMathInteractionCapabilities({
        'viewport.zoom': createGraphBackendInteractionCapability('supported', { mechanism: 'JSXGraph board zoom' }),
        'viewport.gestureZoom': createGraphBackendInteractionCapability('supported', {
          mechanism: 'JSXGraph pinch plus VueGraphX modifier-wheel bridge',
          native: true
        }),
        'viewport.pan': createGraphBackendInteractionCapability('supported', { mechanism: 'JSXGraph pan plus VueGraphX wheel bridge' }),
        'object.pick': createGraphBackendInteractionCapability('supported', { mechanism: 'runtime-pick' }),
        'object.select': createGraphBackendInteractionCapability('supported', { mechanism: 'core-meta-selected' }),
        'object.highlight': createGraphBackendInteractionCapability('supported', {
          mechanism: 'selected stroke width scale; global JSXGraph hover highlight is not required'
        }),
        project: createGraphBackendInteractionCapability('supported', { mechanism: 'JSXGraph Coords adapter' }),
        unproject: createGraphBackendInteractionCapability('supported', { mechanism: 'JSXGraph Coords adapter' }),
        diagnostics: createGraphBackendInteractionCapability('supported', { mechanism: 'GraphOperationDiagnostic' })
      }),
      ...(options.capabilities ?? {})
    };
    this.runtime = options.runtime ?? null;
  }

  public mount(host: GraphBackendHost, options: GraphBackendMountOptions = {}): GraphBackendMountResult {
    const hostElement = resolveHostElement(host);
    if (this.runtime && !hostElement) {
      throw new Error('JsxGraphBackend runtime requires an HTMLElement host.');
    }
    if (hostElement) this.runtime?.mount(hostElement, options);
    this.size = options.size ? { ...options.size } : this.size;
    return { backendId: options.backendId ?? this.id, size: this.size };
  }

  public create(node: GraphObjectNode, context: GraphBackendContext = {}): GraphOperationResult<GraphRenderHandle> {
    const status = getJsxGraphSupportStatus(node);
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
    this.runtime?.createObject(node, handle, context);
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

const resolveHostElement = (host: GraphBackendHost): HTMLElement | null => {
  if (typeof HTMLElement === 'undefined') return null;
  if (host instanceof HTMLElement) return host;
  if (host.resource instanceof HTMLElement) return host.resource;
  return null;
};

export const createJsxGraphBackend = (options?: JsxGraphBackendOptions): JsxGraphBackend => new JsxGraphBackend(options);

const hasRenderablePathGeometry = (node: GraphObjectNode): boolean => {
  const payload = asRecord(node.payload);
  const geometry = asRecord(payload?.geometry);
  if (Array.isArray(geometry?.points) && geometry.points.length >= 2) return true;
  if (Array.isArray(geometry?.segments) && geometry.segments.some((segment) => Array.isArray(segment) && segment.length >= 2)) return true;
  return ['circle', 'ellipse', 'hyperbola', 'arc', 'sector', 'semicircle', 'segment', 'line', 'ray', 'polyline', 'polygon', 'multiline', 'wireframe'].includes(
    typeof geometry?.kind === 'string' ? geometry.kind : ''
  );
};

const asRecord = (value: unknown): Record<string, unknown> | null => (
  typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : null
);
