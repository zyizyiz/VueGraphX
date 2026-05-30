import {
  createGraphObjectNode,
  createGraphBackendInteractionCapability,
  createGraphBackendMathInteractionCapabilities,
  mergeGraphObjectPatch,
  okResult,
  type GraphBackendCapabilities,
  type GraphBackendContext,
  type GraphBackendHost,
  type GraphBackendMountOptions,
  type GraphBackendMountResult,
  type GraphClientPoint,
  type GraphObjectNode,
  type GraphObjectPatch,
  type GraphOperationResult,
  type GraphPickOptions,
  type GraphPickResult,
  type GraphRenderBackend,
  type GraphRenderHandle,
  type GraphViewportRef,
  type GraphViewportSize,
  type GraphWorldPoint
} from '@vuegraphx/core';
import { pickGraphObjectNode } from '../pickMath';

export interface MemoryGraphBackendOptions {
  id?: string;
  capabilities?: Partial<GraphBackendCapabilities>;
}

const DEFAULT_CAPABILITIES: GraphBackendCapabilities = {
  pick: true,
  project: true,
  unproject: true,
  drag: true,
  layers: true,
  dimensions: ['2d'],
  mathInteractions: createGraphBackendMathInteractionCapabilities({
    'viewport.zoom': createGraphBackendInteractionCapability('supported', { mechanism: 'core-viewport-contract' }),
    'viewport.gestureZoom': createGraphBackendInteractionCapability('supported', { mechanism: 'host-gesture-bridge', native: true }),
    'viewport.pan': createGraphBackendInteractionCapability('supported', { mechanism: 'core-viewport-contract' }),
    'object.pick': createGraphBackendInteractionCapability('supported', { mechanism: 'backend-pick' }),
    'object.select': createGraphBackendInteractionCapability('supported', { mechanism: 'core-meta-selected' }),
    'object.highlight': createGraphBackendInteractionCapability('supported', { mechanism: 'selected-render-hints' }),
    project: createGraphBackendInteractionCapability('supported', { mechanism: 'backend-project' }),
    unproject: createGraphBackendInteractionCapability('supported', { mechanism: 'backend-unproject' }),
    diagnostics: createGraphBackendInteractionCapability('supported', { mechanism: 'GraphOperationDiagnostic' })
  })
};

export class MemoryGraphBackend implements GraphRenderBackend {
  public readonly id: string;
  public readonly capabilities: GraphBackendCapabilities;
  protected readonly nodes = new Map<string, GraphObjectNode>();
  protected readonly handles = new Map<string, GraphRenderHandle>();
  protected mounted = false;
  protected size: GraphViewportSize | undefined;

  public constructor(options: MemoryGraphBackendOptions = {}) {
    this.id = options.id ?? 'memory';
    this.capabilities = { ...DEFAULT_CAPABILITIES, ...(options.capabilities ?? {}) };
  }

  public mount(_host: GraphBackendHost, options: GraphBackendMountOptions = {}): GraphBackendMountResult {
    this.mounted = true;
    this.size = options.size ? { ...options.size } : this.size;
    return { backendId: options.backendId ?? this.id, size: this.size };
  }

  public create(node: GraphObjectNode, context: GraphBackendContext = {}): GraphOperationResult<GraphRenderHandle> {
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
    return okResult({ ...handle, target: { ...handle.target } });
  }

  public update(handle: GraphRenderHandle, patch: GraphObjectPatch, context: GraphBackendContext = {}): void {
    const current = this.nodes.get(handle.objectId);
    if (!current) return;
    const next = mergeGraphObjectPatch(current, patch);
    this.nodes.set(handle.objectId, { ...next, layerId: context.layerId ?? next.layerId ?? handle.layerId });
  }

  public remove(handle: GraphRenderHandle): void {
    this.nodes.delete(handle.objectId);
    this.handles.delete(handle.id);
  }

  public pick(point: GraphClientPoint, options: GraphPickOptions = {}): GraphPickResult | null {
    if (!this.capabilities.pick) return null;
    if (options.targetScopes && !options.targetScopes.includes('object')) return null;
    const allowedLayers = options.layerOrder ? new Set(options.layerOrder) : null;
    const candidates = [...this.nodes.values()].reverse();
    for (const node of candidates) {
      if (node.renderHints?.visible === false) continue;
      if (allowedLayers && !allowedLayers.has(node.layerId ?? 'content')) continue;
      const hitGroups = readNodeHitGroups(node);
      if (options.hitGroups && !hitGroups.some((group) => options.hitGroups?.includes(group))) continue;
      const result = pickGraphObjectNode(node, point, this.id, options.tolerancePx ?? 8);
      if (result) {
        return {
          ...result,
          hitGroup: hitGroups[0],
          meta: {
            ...(result.meta ?? {}),
            hitGroups
          }
        };
      }
    }
    return null;
  }

  public project(point: GraphWorldPoint, _viewport?: GraphViewportRef): GraphClientPoint | null {
    if (!this.capabilities.project) return null;
    return { x: point.x, y: point.y };
  }

  public unproject(point: GraphClientPoint, _viewport?: GraphViewportRef): GraphWorldPoint | null {
    if (!this.capabilities.unproject) return null;
    return { dimension: '2d', x: point.x, y: point.y };
  }

  public resize(size: GraphViewportSize): void {
    this.size = { ...size };
  }

  public flush(): void {
    // Retained-memory backend has no renderer-owned frame buffer to flush.
  }

  public clear(): void {
    this.nodes.clear();
    this.handles.clear();
  }

  public destroy(): void {
    this.clear();
    this.mounted = false;
  }

  public listNodes(): GraphObjectNode[] {
    return [...this.nodes.values()].map((node) => createGraphObjectNode(node));
  }
}

const readNodeHitGroups = (node: GraphObjectNode): string[] => {
  const meta = node.meta as Record<string, unknown> | undefined;
  const renderHints = node.renderHints as Record<string, unknown> | undefined;
  const groups = [
    ...readStringList(meta?.hitGroups),
    ...readStringList(meta?.hitGroup),
    ...readStringList(renderHints?.hitGroups),
    ...readStringList(renderHints?.hitGroup)
  ];
  return groups.length > 0 ? [...new Set(groups)] : [node.type, node.kind];
};

const readStringList = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0);
  return typeof value === 'string' && value.length > 0 ? [value] : [];
};

export const createMemoryGraphBackend = (options?: MemoryGraphBackendOptions): MemoryGraphBackend => new MemoryGraphBackend(options);
