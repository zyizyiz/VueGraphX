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
  hitGroups?: readonly string[];
}

export interface GraphPickResult {
  target: GraphRuntimeTargetRef;
  backendId: string;
  layerId: GraphLayerId;
  clientPoint: GraphClientPoint;
  worldPoint?: GraphWorldPoint;
  distancePx?: number;
  hitGroup?: string;
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
  /**
   * Optional, compatibility-preserving detail for math-canvas interactions.
   *
   * The legacy booleans above remain the broad renderer-neutral contract.
   * This nested shape makes active math backend gaps explicit without forcing
   * existing consumers to change their capability reads.
   */
  mathInteractions?: GraphBackendMathInteractionCapabilities;
}

export type GraphBackendInteractionStatus = 'supported' | 'partial-support' | 'unsupported';

export interface GraphBackendInteractionCapability {
  status: GraphBackendInteractionStatus;
  reason?: string;
  mechanism?: string;
  native?: boolean;
  diagnostics?: readonly GraphOperationDiagnostic[];
}

export interface GraphBackendMathInteractionCapabilities {
  viewport: {
    zoom: GraphBackendInteractionCapability;
    gestureZoom: GraphBackendInteractionCapability;
    pan: GraphBackendInteractionCapability;
  };
  object: {
    pick: GraphBackendInteractionCapability;
    select: GraphBackendInteractionCapability;
    highlight: GraphBackendInteractionCapability;
  };
  project: GraphBackendInteractionCapability;
  unproject: GraphBackendInteractionCapability;
  diagnostics: GraphBackendInteractionCapability;
}

export const GRAPH_MATH_INTERACTION_CAPABILITY_PATHS = [
  'viewport.zoom',
  'viewport.gestureZoom',
  'viewport.pan',
  'object.pick',
  'object.select',
  'object.highlight',
  'project',
  'unproject',
  'diagnostics'
] as const;

export type GraphMathInteractionCapabilityPath = typeof GRAPH_MATH_INTERACTION_CAPABILITY_PATHS[number];

export const createGraphBackendInteractionCapability = (
  status: GraphBackendInteractionStatus = 'supported',
  detail: Omit<GraphBackendInteractionCapability, 'status'> = {}
): GraphBackendInteractionCapability => ({ status, ...detail });

export const createGraphBackendMathInteractionCapabilities = (
  overrides: Partial<{
    [Path in GraphMathInteractionCapabilityPath]: GraphBackendInteractionCapability;
  }> = {}
): GraphBackendMathInteractionCapabilities => ({
  viewport: {
    zoom: cloneInteractionCapability(overrides['viewport.zoom'] ?? createUndeclaredInteractionCapability('viewport.zoom')),
    gestureZoom: cloneInteractionCapability(overrides['viewport.gestureZoom'] ?? createUndeclaredInteractionCapability('viewport.gestureZoom')),
    pan: cloneInteractionCapability(overrides['viewport.pan'] ?? createUndeclaredInteractionCapability('viewport.pan'))
  },
  object: {
    pick: cloneInteractionCapability(overrides['object.pick'] ?? createUndeclaredInteractionCapability('object.pick')),
    select: cloneInteractionCapability(overrides['object.select'] ?? createUndeclaredInteractionCapability('object.select')),
    highlight: cloneInteractionCapability(overrides['object.highlight'] ?? createUndeclaredInteractionCapability('object.highlight'))
  },
  project: cloneInteractionCapability(overrides.project ?? createUndeclaredInteractionCapability('project')),
  unproject: cloneInteractionCapability(overrides.unproject ?? createUndeclaredInteractionCapability('unproject')),
  diagnostics: cloneInteractionCapability(overrides.diagnostics ?? createUndeclaredInteractionCapability('diagnostics'))
});

const createUndeclaredInteractionCapability = (
  path: GraphMathInteractionCapabilityPath
): GraphBackendInteractionCapability => ({
  status: 'unsupported',
  reason: `Math interaction capability ${path} is undeclared.`
});

export const validateGraphBackendMathInteractionCapabilities = (
  backendId: string,
  capabilities: GraphBackendCapabilities
): GraphOperationDiagnostic[] => {
  const diagnostics: GraphOperationDiagnostic[] = [];
  const interactions = capabilities.mathInteractions;
  if (!interactions) {
    diagnostics.push(createBackendInteractionDiagnostic(
      'backend.math-interactions.missing',
      `Backend ${backendId} does not declare the active math interaction contract.`,
      'error',
      backendId
    ));
    return diagnostics;
  }

  for (const path of GRAPH_MATH_INTERACTION_CAPABILITY_PATHS) {
    const capability = readMathInteractionCapability(interactions, path);
    if (!capability) {
      diagnostics.push(createBackendInteractionDiagnostic(
        'backend.math-interaction.missing',
        `Backend ${backendId} is missing math interaction capability ${path}.`,
        'error',
        backendId
      ));
      continue;
    }
    if (!isGraphBackendInteractionStatus(capability.status)) {
      diagnostics.push(createBackendInteractionDiagnostic(
        'backend.math-interaction.invalid-status',
        `Backend ${backendId} reports an invalid status for math interaction capability ${path}.`,
        'error',
        backendId
      ));
      continue;
    }
    if (capability.status === 'partial-support' || capability.status === 'unsupported') {
      diagnostics.push(createBackendInteractionDiagnostic(
        capability.status === 'partial-support'
          ? 'backend.math-interaction.partial-support'
          : 'backend.math-interaction.unsupported',
        capability.reason ?? `Backend ${backendId} reports ${capability.status} for math interaction capability ${path}.`,
        capability.status === 'partial-support' ? 'warning' : 'error',
        backendId
      ));
    }
  }

  return diagnostics;
};

const cloneInteractionCapability = (
  capability: GraphBackendInteractionCapability
): GraphBackendInteractionCapability => ({
  ...capability,
  diagnostics: capability.diagnostics ? capability.diagnostics.map((diagnostic) => ({
    ...diagnostic,
    target: diagnostic.target ? { ...diagnostic.target } : undefined
  })) : undefined
});

const readMathInteractionCapability = (
  capabilities: GraphBackendMathInteractionCapabilities,
  path: GraphMathInteractionCapabilityPath
): GraphBackendInteractionCapability | undefined => {
  switch (path) {
    case 'viewport.zoom':
      return capabilities.viewport.zoom;
    case 'viewport.gestureZoom':
      return capabilities.viewport.gestureZoom;
    case 'viewport.pan':
      return capabilities.viewport.pan;
    case 'object.pick':
      return capabilities.object.pick;
    case 'object.select':
      return capabilities.object.select;
    case 'object.highlight':
      return capabilities.object.highlight;
    case 'project':
      return capabilities.project;
    case 'unproject':
      return capabilities.unproject;
    case 'diagnostics':
      return capabilities.diagnostics;
  }
};

const isGraphBackendInteractionStatus = (status: unknown): status is GraphBackendInteractionStatus => (
  status === 'supported' || status === 'partial-support' || status === 'unsupported'
);

const createBackendInteractionDiagnostic = (
  code: string,
  message: string,
  severity: GraphOperationDiagnostic['severity'],
  backendId: string
): GraphOperationDiagnostic => ({
  code,
  message,
  severity,
  target: { scope: 'backend-layer', backendId }
});

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
  create(node: GraphObjectNode, context?: GraphBackendContext): GraphOperationResult<GraphRenderHandle>;
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

const RENDERER_LEAK_STRING_PATTERN = /\b(?:JXG|JSXGraph|BABYLON|PIXI|Fabric|Konva|THREE)\.[A-Za-z_$][\w$]*\b|\b(?:HTMLElement|HTMLCanvasElement|SVGElement)\b|\[object (?:HTML|SVG|Canvas)[^\]]*\]/;

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
    return RENDERER_LEAK_STRING_PATTERN.test(value);
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
