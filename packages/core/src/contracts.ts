/**
 * Renderer-neutral runtime contracts for the next VueGraphX architecture.
 *
 * These types intentionally avoid JSXGraph, Babylon, DOM node, or canvas object
 * references. Backends may hold renderer resources privately through handles,
 * but the public runtime truth remains serializable core data.
 */

export type GraphObjectKind = 'command' | 'shape' | 'composite' | 'viewport' | 'overlay' | 'relation';
export type GraphBackendKind = 'jsxgraph' | 'babylon' | 'canvas2d' | 'pixi' | 'fabric' | 'konva' | 'three' | string;
export type GraphRuntimeCapabilityKind = 'action' | 'toggle' | 'input' | 'drag' | 'mode' | 'panel';
export type GraphRuntimeCapabilityStatus = 'supported' | 'disabled' | 'unsupported';
export type GraphTargetScope = 'scene' | 'viewport' | 'object' | 'component' | 'handle' | 'relation' | 'backend-layer';
export type GraphLayerId = 'background' | 'content' | 'overlay' | 'interaction' | 'ui' | 'debug';

export interface GraphClientPoint {
  x: number;
  y: number;
}

export interface GraphWorldPoint2D {
  dimension: '2d';
  x: number;
  y: number;
}

export interface GraphWorldPoint3D {
  dimension: '3d';
  x: number;
  y: number;
  z: number;
}

export type GraphWorldPoint = GraphWorldPoint2D | GraphWorldPoint3D;

export interface GraphViewportSize {
  width: number;
  height: number;
}

export interface GraphBackendHost {
  id?: string;
  hostId?: string;
  hostKind?: string;
  size?: GraphViewportSize;
  hostAttributes?: Record<string, unknown>;
  resource?: unknown;
}

export interface GraphViewportRef {
  viewportId: string;
  sceneId?: string;
}

export interface GraphRuntimeTargetRef {
  scope: GraphTargetScope;
  objectId?: string;
  componentId?: string;
  handleId?: string;
  relationId?: string;
  viewportId?: string;
  backendId?: string;
  layerId?: GraphLayerId;
}

export interface GraphRuntimeCapabilityDescriptor {
  id: string;
  label: string;
  kind: GraphRuntimeCapabilityKind;
  status: GraphRuntimeCapabilityStatus;
  target: GraphRuntimeTargetRef;
  category?: string;
  active?: boolean;
  schema?: unknown;
  reason?: string;
  meta?: Record<string, unknown>;
}

export interface GraphObjectNode<Payload = unknown> {
  id: string;
  kind: GraphObjectKind;
  type: string;
  payload: Payload;
  backendHint?: GraphBackendKind;
  layerId?: GraphLayerId;
  dependencies?: string[];
  children?: string[];
  relations?: string[];
  capabilities?: GraphRuntimeCapabilityDescriptor[];
  renderHints?: Record<string, unknown>;
  meta?: Record<string, unknown>;
}

export interface GraphObjectPatch<Payload = unknown> {
  payload?: Payload;
  backendHint?: GraphBackendKind | null;
  layerId?: GraphLayerId | null;
  dependencies?: string[];
  children?: string[];
  relations?: string[];
  capabilities?: GraphRuntimeCapabilityDescriptor[];
  renderHints?: Record<string, unknown> | null;
  meta?: Record<string, unknown> | null;
}

export interface GraphOperationDiagnostic {
  code: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
  target?: GraphRuntimeTargetRef;
}

export interface GraphOperationResult<T = unknown> {
  ok: boolean;
  value?: T;
  diagnostics: GraphOperationDiagnostic[];
}

export interface GraphPickOptions {
  layerOrder?: readonly GraphLayerId[];
  tolerancePx?: number;
  targetScopes?: readonly GraphTargetScope[];
}

export interface GraphPickResult {
  target: GraphRuntimeTargetRef;
  backendId: string;
  layerId: GraphLayerId;
  clientPoint: GraphClientPoint;
  worldPoint?: GraphWorldPoint;
  distancePx?: number;
  meta?: Record<string, unknown>;
}

export interface GraphPointerSession {
  pointerId: number;
  startClientPoint: GraphClientPoint;
  currentClientPoint: GraphClientPoint;
  target: GraphRuntimeTargetRef | null;
  startedAt: number;
  meta?: Record<string, unknown>;
}

export interface GraphDragSession extends GraphPointerSession {
  dragKind: 'move' | 'resize' | 'rotate' | 'handle' | 'custom';
  startWorldPoint?: GraphWorldPoint;
  currentWorldPoint?: GraphWorldPoint;
}

export interface GraphBackendCapabilities {
  pick: boolean;
  project: boolean;
  unproject: boolean;
  drag: boolean;
  layers: boolean;
  dimensions: ReadonlyArray<'2d' | '3d'>;
}

export interface GraphBackendMountOptions {
  backendId?: string;
  viewport?: GraphViewportRef;
  layerId?: GraphLayerId;
  size?: GraphViewportSize;
  attributes?: Record<string, unknown>;
}

export interface GraphBackendMountResult {
  backendId: string;
  size?: GraphViewportSize;
}

export interface GraphBackendContext {
  viewport?: GraphViewportRef;
  layerId?: GraphLayerId;
  now?: number;
}

export interface GraphRenderHandle {
  id: string;
  objectId: string;
  backendId: string;
  layerId: GraphLayerId;
  target: GraphRuntimeTargetRef;
  meta?: Record<string, unknown>;
}

export interface GraphRenderFrame {
  timestamp: number;
  dirtyObjectIds?: readonly string[];
}

export interface GraphRenderBackend {
  readonly id: string;
  readonly capabilities: GraphBackendCapabilities;

  mount(host: GraphBackendHost, options?: GraphBackendMountOptions): GraphBackendMountResult;
  create(node: GraphObjectNode, context?: GraphBackendContext): GraphRenderHandle;
  update(handle: GraphRenderHandle, patch: GraphObjectPatch, context?: GraphBackendContext): void;
  remove(handle: GraphRenderHandle): void;

  pick(point: GraphClientPoint, options?: GraphPickOptions): GraphPickResult | null;
  project(point: GraphWorldPoint, viewport?: GraphViewportRef): GraphClientPoint | null;
  unproject(point: GraphClientPoint, viewport?: GraphViewportRef): GraphWorldPoint | null;

  beginFrame?(frame: GraphRenderFrame): void;
  flush?(frame?: GraphRenderFrame): void;
  resize?(size: GraphViewportSize): void;
  destroy(): void;
}

export const DEFAULT_GRAPH_LAYER_ORDER: readonly GraphLayerId[] = [
  'ui',
  'interaction',
  'overlay',
  'content',
  'background',
  'debug'
] as const;

const RENDERER_LEAK_KEYS = new Set([
  'jxg',
  'JXG',
  'GeometryElement',
  'board',
  'mesh',
  'babylon',
  'BABYLON',
  'pixi',
  'fabric',
  'konva',
  'three',
  'domNode',
  'canvas'
]);

export const createGraphObjectNode = <Payload>(input: GraphObjectNode<Payload>): GraphObjectNode<Payload> => ({
  ...input,
  dependencies: input.dependencies ? [...input.dependencies] : undefined,
  children: input.children ? [...input.children] : undefined,
  relations: input.relations ? [...input.relations] : undefined,
  capabilities: input.capabilities ? input.capabilities.map((capability) => ({ ...capability, target: { ...capability.target } })) : undefined,
  renderHints: input.renderHints ? { ...input.renderHints } : undefined,
  meta: input.meta ? { ...input.meta } : undefined
});

export const createTargetRef = (target: GraphRuntimeTargetRef): GraphRuntimeTargetRef => ({ ...target });

export const mergeGraphObjectPatch = <Payload>(
  node: GraphObjectNode<Payload>,
  patch: GraphObjectPatch<Payload>
): GraphObjectNode<Payload> => ({
  ...node,
  payload: patch.payload === undefined ? node.payload : patch.payload,
  backendHint: patch.backendHint === undefined ? node.backendHint : patch.backendHint ?? undefined,
  layerId: patch.layerId === undefined ? node.layerId : patch.layerId ?? undefined,
  dependencies: patch.dependencies === undefined ? node.dependencies : [...patch.dependencies],
  children: patch.children === undefined ? node.children : [...patch.children],
  relations: patch.relations === undefined ? node.relations : [...patch.relations],
  capabilities: patch.capabilities === undefined ? node.capabilities : patch.capabilities.map((capability) => ({ ...capability, target: { ...capability.target } })),
  renderHints: patch.renderHints === undefined ? node.renderHints : patch.renderHints ? { ...patch.renderHints } : undefined,
  meta: patch.meta === undefined ? node.meta : patch.meta ? { ...patch.meta } : undefined
});

export const hasRendererFrameworkLeak = (value: unknown, seen = new WeakSet<object>()): boolean => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') {
    return /\b(JXG|JSXGraph|BABYLON|Babylon|PIXI|Fabric|Konva|THREE|HTMLElement|HTMLCanvasElement)\b/.test(value);
  }
  if (typeof value !== 'object') return false;
  if (seen.has(value)) return false;
  seen.add(value);

  const tag = Object.prototype.toString.call(value);
  if (/HTML|SVG|Canvas|Element/.test(tag)) return true;

  return Object.entries(value as Record<string, unknown>).some(([key, entry]) => (
    RENDERER_LEAK_KEYS.has(key) || hasRendererFrameworkLeak(entry, seen)
  ));
};

export const okResult = <T>(value: T): GraphOperationResult<T> => ({ ok: true, value, diagnostics: [] });

export const errorResult = (code: string, message: string, target?: GraphRuntimeTargetRef): GraphOperationResult<never> => ({
  ok: false,
  diagnostics: [{ code, message, severity: 'error', target }]
});
