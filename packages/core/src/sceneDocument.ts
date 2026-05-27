import {
  createGraphObjectNode,
  errorResult,
  hasRendererFrameworkLeak,
  mergeGraphObjectPatch,
  okResult,
  type GraphObjectNode,
  type GraphObjectPatch,
  type GraphOperationDiagnostic,
  type GraphOperationResult
} from './contracts';
import {
  createGraphRelationSnapshot,
  validateGraphRelationSnapshot,
  type GraphSceneRelationSnapshot
} from './relationSnapshot';
import {
  createGraphSceneObjectIrNode,
  isSupportedGraphSceneObjectIrType,
  unsupportedGraphSceneObjectIrDiagnostic
} from './sceneObjectIr';

export const GRAPH_RUNTIME_SCENE_VERSION = 2;

export interface GraphRuntimeSceneDocument {
  version: typeof GRAPH_RUNTIME_SCENE_VERSION;
  sceneId: string;
  objects: GraphObjectNode[];
  rootObjectIds: string[];
  relationSnapshot?: GraphSceneRelationSnapshot;
  meta?: Record<string, unknown>;
}

export interface GraphSceneStoreSnapshot {
  readonly sceneId: string;
  readonly objects: readonly GraphObjectNode[];
  readonly rootObjectIds: readonly string[];
}

const cloneSerializable = <T>(value: T): T => {
  if (value === undefined || value === null) return value;

  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(value);
    } catch {
      // Fall through to JSON-safe cloning below. Scene documents are expected to
      // be serializable, so JSON cloning is an acceptable fallback here.
    }
  }

  return JSON.parse(JSON.stringify(value)) as T;
};

const duplicateObjectDiagnostic = (id: string): GraphOperationDiagnostic => ({
  code: 'scene.duplicate-object-id',
  message: `Graph scene already contains object id: ${id}`,
  severity: 'error',
  target: { scope: 'object', objectId: id }
});

const missingObjectDiagnostic = (id: string): GraphOperationDiagnostic => ({
  code: 'scene.missing-object',
  message: `Graph scene does not contain object id: ${id}`,
  severity: 'error',
  target: { scope: 'object', objectId: id }
});

const rendererLeakDiagnostic = (id: string): GraphOperationDiagnostic => ({
  code: 'scene.renderer-framework-leak',
  message: `Graph object ${id} contains renderer-owned data. Core scene documents must stay serializable and backend-neutral.`,
  severity: 'error',
  target: { scope: 'object', objectId: id }
});

const sceneSemanticKinds = new Set<GraphObjectNode['kind']>(['shape', 'composite', 'overlay', 'relation']);

const requiresSceneObjectIrValidation = (node: GraphObjectNode): boolean => sceneSemanticKinds.has(node.kind);

const validateSceneObjectNode = (node: GraphObjectNode): GraphOperationResult<GraphObjectNode> => {
  if (!requiresSceneObjectIrValidation(node)) return okResult(node);

  if (!isSupportedGraphSceneObjectIrType(node.type)) {
    const legacyInput = readLegacySceneObjectIrInput(node);
    if (legacyInput && !readPayloadObjectType(node.payload)) {
      return createSceneObjectIrNode(node, legacyInput.objectType, legacyInput.payload);
    }
    return { ok: false, diagnostics: [unsupportedGraphSceneObjectIrDiagnostic(node.type, node.id)] };
  }

  const result = createSceneObjectIrNode(node, node.type, node.payload);
  if (result.ok || readPayloadObjectType(node.payload)) return result;

  const legacyInput = readLegacySceneObjectIrInput(node);
  return legacyInput ? createSceneObjectIrNode(node, legacyInput.objectType, legacyInput.payload) : result;
};

const createSceneObjectIrNode = (
  node: GraphObjectNode,
  objectType: string,
  payload: unknown
): GraphOperationResult<GraphObjectNode> => (
  createGraphSceneObjectIrNode({
    id: node.id,
    objectType,
    payload,
    kind: node.kind,
    layerId: node.layerId,
    backendHint: node.backendHint,
    dependencies: node.dependencies,
    children: node.children,
    relations: node.relations,
    capabilities: node.capabilities,
    renderHints: node.renderHints,
    meta: node.meta
  })
);

const readPayloadObjectType = (payload: unknown): string | undefined => {
  const record = asRecord(payload);
  return typeof record?.objectType === 'string' ? record.objectType : undefined;
};

const readLegacySceneObjectIrInput = (node: GraphObjectNode): { objectType: string; payload: unknown } | null => {
  const payload = asRecord(node.payload);
  if (!payload) return null;

  if (node.type === 'point') {
    const point = readPoint2D(payload.point) ?? readPoint2D(payload.position);
    return point ? {
      objectType: 'point',
      payload: { objectType: 'point', position: toWorldPoint2D(point) }
    } : null;
  }

  if (node.type === 'derivative') {
    return typeof payload.expression === 'string' ? {
      objectType: 'function',
      payload: {
        objectType: 'function',
        expression: payload.expression,
        variable: typeof payload.variable === 'string' ? payload.variable : 'x',
        domain: readLegacyDomain(payload.domain),
        parameters: readNumberRecord(payload.parameters)
      }
    } : null;
  }

  if (node.type === 'angle') {
    return Array.isArray(node.dependencies) && node.dependencies.length >= 3 ? {
      objectType: 'measurement',
      payload: {
        objectType: 'measurement',
        measurementKind: 'angle',
        targets: node.dependencies.slice(0, 3).map((objectId) => ({ objectId })),
        expression: typeof payload.degrees === 'number' ? `${payload.degrees}deg` : undefined
      }
    } : null;
  }

  if (node.type === 'arc' || node.type === 'sector' || node.type === 'semicircle') {
    return readLegacyCircularGeometryIrInput(payload);
  }

  if (node.type === 'line' || node.type === 'segment' || node.type === 'ray') {
    return readLegacyLinearObjectIrInput(node.type, payload);
  }

  if (node.type === 'polygon' || node.type === 'polyline') {
    const geometry = asRecord(payload.geometry);
    const vertices = readPoint2DArray(geometry?.vertices ?? geometry?.points);
    return vertices && vertices.length >= (node.type === 'polygon' ? 3 : 2) ? {
      objectType: 'polygon',
      payload: {
        objectType: 'polygon',
        vertices: vertices.map(toCoordinateSource),
        closed: node.type === 'polygon'
      }
    } : null;
  }

  if (node.type === 'circle') {
    const geometry = asRecord(payload.geometry);
    const center = readPoint2D(geometry?.center);
    const radius = readFiniteNumber(geometry?.radius);
    return center && radius !== null ? {
      objectType: 'conic',
      payload: {
        objectType: 'conic',
        conicKind: 'circle',
        definition: {
          mode: 'center-radii',
          center: toCoordinateSource(center),
          radiusX: radius,
          radiusY: radius
        }
      }
    } : null;
  }

  if (node.type === 'text') {
    const point = readPoint2D(payload.point);
    return point && typeof payload.text === 'string' ? {
      objectType: 'text',
      payload: {
        objectType: 'text',
        content: payload.text,
        anchor: toCoordinateSource(point),
        format: 'plain'
      }
    } : null;
  }

  if (node.type === 'function') {
    return typeof payload.expression === 'string' ? {
      objectType: 'function',
      payload: {
        objectType: 'function',
        expression: payload.expression,
        variable: typeof payload.variable === 'string' ? payload.variable : 'x',
        domain: readLegacyDomain(payload.domain),
        parameters: readNumberRecord(payload.parameters)
      }
    } : null;
  }

  if (node.type === 'equation') {
    return typeof payload.expression === 'string' ? {
      objectType: 'implicit',
      payload: {
        objectType: 'implicit',
        expression: payload.expression,
        variables: ['x', 'y'],
        parameters: readNumberRecord(payload.parameters)
      }
    } : null;
  }

  if (node.type === 'vector') {
    const start = readPoint2D(payload.start);
    const end = readPoint2D(payload.end);
    if (start && end) {
      return {
        objectType: 'vector',
        payload: { objectType: 'vector', start: toCoordinateSource(start), end: toCoordinateSource(end) }
      };
    }
    const vector = readPoint2D(payload.vector);
    return vector ? {
      objectType: 'vector',
      payload: { objectType: 'vector', components: { dimension: '2d', x: vector.x, y: vector.y } }
    } : null;
  }

  if (node.type === 'solid') {
    return {
      objectType: 'solid',
      payload: {
        objectType: 'solid',
        solidKind: 'custom',
        parameters: {
          ...(asRecord(payload.parameters) ?? {}),
          ...(typeof payload.family === 'string' ? { family: payload.family } : {})
        }
      }
    };
  }

  return null;
};

const readLegacyCircularGeometryIrInput = (payload: Record<string, unknown>): { objectType: string; payload: unknown } | null => {
  const geometry = asRecord(payload.geometry);
  const center = readPoint2D(geometry?.center);
  const radius = readFiniteNumber(geometry?.radius);
  return center && radius !== null ? {
    objectType: 'conic',
    payload: {
      objectType: 'conic',
      conicKind: 'circle',
      definition: {
        mode: 'center-radii',
        center: toCoordinateSource(center),
        radiusX: radius,
        radiusY: radius
      }
    }
  } : null;
};

const readLegacyLinearObjectIrInput = (
  type: 'line' | 'segment' | 'ray',
  payload: Record<string, unknown>
): { objectType: string; payload: unknown } | null => {
  const geometry = asRecord(payload.geometry);
  if (!geometry) return null;

  if (type === 'line') {
    const point = readPoint2D(geometry.point);
    const direction = readPoint2D(geometry.direction);
    return point && direction ? {
      objectType: 'line',
      payload: {
        objectType: 'line',
        definition: {
          mode: 'point-direction',
          point: toCoordinateSource(point),
          direction: { dimension: '2d', x: direction.x, y: direction.y }
        }
      }
    } : null;
  }

  if (type === 'segment') {
    const start = readPoint2D(geometry.start);
    const end = readPoint2D(geometry.end);
    return start && end ? {
      objectType: 'segment',
      payload: { objectType: 'segment', endpoints: [toCoordinateSource(start), toCoordinateSource(end)] }
    } : null;
  }

  const origin = readPoint2D(geometry.origin);
  const direction = readPoint2D(geometry.direction);
  return origin && direction ? {
    objectType: 'ray',
    payload: {
      objectType: 'ray',
      origin: toCoordinateSource(origin),
      direction: { dimension: '2d', x: direction.x, y: direction.y }
    }
  } : null;
};

const asRecord = (value: unknown): Record<string, unknown> | null => (
  typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : null
);

const readFiniteNumber = (value: unknown): number | null => (
  typeof value === 'number' && Number.isFinite(value) ? value : null
);

const readPoint2D = (value: unknown): { x: number; y: number } | null => {
  const point = asRecord(value);
  const coordinates = asRecord(point?.coordinates);
  const source = coordinates ?? point;
  if (!source) return null;
  const x = readFiniteNumber(source.x);
  const y = readFiniteNumber(source.y);
  return x === null || y === null ? null : { x, y };
};

const readPoint2DArray = (value: unknown): { x: number; y: number }[] | null => {
  if (!Array.isArray(value)) return null;
  const points = value.map(readPoint2D);
  return points.every((point): point is { x: number; y: number } => !!point) ? points : null;
};

const readLegacyDomain = (value: unknown): { min?: number; max?: number; step?: number } | undefined => {
  if (Array.isArray(value) && value.length >= 2) {
    const min = readFiniteNumber(value[0]);
    const max = readFiniteNumber(value[1]);
    return min === null || max === null ? undefined : { min, max };
  }
  const domain = asRecord(value);
  if (!domain) return undefined;
  return {
    ...(readFiniteNumber(domain.min) !== null ? { min: readFiniteNumber(domain.min)! } : {}),
    ...(readFiniteNumber(domain.max) !== null ? { max: readFiniteNumber(domain.max)! } : {}),
    ...(readFiniteNumber(domain.step) !== null ? { step: readFiniteNumber(domain.step)! } : {})
  };
};

const readNumberRecord = (value: unknown): Record<string, number> | undefined => {
  const record = asRecord(value);
  if (!record) return undefined;
  const entries = Object.entries(record);
  return entries.every(([, entry]) => typeof entry === 'number' && Number.isFinite(entry))
    ? Object.fromEntries(entries) as Record<string, number>
    : undefined;
};

const toWorldPoint2D = (point: { x: number; y: number }): { dimension: '2d'; x: number; y: number } => ({
  dimension: '2d',
  x: point.x,
  y: point.y
});

const toCoordinateSource = (point: { x: number; y: number }): { coordinates: { dimension: '2d'; x: number; y: number } } => ({
  coordinates: toWorldPoint2D(point)
});

export class GraphSceneStore {
  private readonly objectMap = new Map<string, GraphObjectNode>();
  private readonly objectOrder: string[] = [];
  private readonly rootOrder: string[] = [];

  public constructor(private readonly sceneId: string = 'scene') {}

  public get id(): string {
    return this.sceneId;
  }

  public addObject(node: GraphObjectNode, options: { root?: boolean; replace?: boolean } = {}): GraphOperationResult<GraphObjectNode> {
    if (hasRendererFrameworkLeak(node)) {
      return { ok: false, diagnostics: [rendererLeakDiagnostic(node.id)] };
    }

    const exists = this.objectMap.has(node.id);
    if (exists && !options.replace) {
      return { ok: false, diagnostics: [duplicateObjectDiagnostic(node.id)] };
    }

    const validation = validateSceneObjectNode(node);
    if (!validation.ok || !validation.value) {
      return { ok: false, diagnostics: validation.diagnostics };
    }

    const stored = createGraphObjectNode(cloneSerializable(validation.value));
    if (!exists) {
      this.objectOrder.push(stored.id);
    }
    this.objectMap.set(stored.id, stored);

    if (options.root !== false && !this.rootOrder.includes(stored.id)) {
      this.rootOrder.push(stored.id);
    }

    return okResult(createGraphObjectNode(stored));
  }

  public updateObject(id: string, patch: GraphObjectPatch): GraphOperationResult<GraphObjectNode> {
    const current = this.objectMap.get(id);
    if (!current) {
      return { ok: false, diagnostics: [missingObjectDiagnostic(id)] };
    }

    const next = mergeGraphObjectPatch(current, cloneSerializable(patch));
    if (hasRendererFrameworkLeak(next)) {
      return { ok: false, diagnostics: [rendererLeakDiagnostic(id)] };
    }

    const validation = validateSceneObjectNode(next);
    if (!validation.ok || !validation.value) {
      return { ok: false, diagnostics: validation.diagnostics };
    }

    const stored = createGraphObjectNode(cloneSerializable(validation.value));
    this.objectMap.set(id, stored);
    return okResult(createGraphObjectNode(stored));
  }

  public removeObject(id: string): GraphOperationResult<GraphObjectNode> {
    const current = this.objectMap.get(id);
    if (!current) {
      return { ok: false, diagnostics: [missingObjectDiagnostic(id)] };
    }

    this.objectMap.delete(id);
    const orderIndex = this.objectOrder.indexOf(id);
    if (orderIndex >= 0) this.objectOrder.splice(orderIndex, 1);
    const rootIndex = this.rootOrder.indexOf(id);
    if (rootIndex >= 0) this.rootOrder.splice(rootIndex, 1);

    return okResult(createGraphObjectNode(current));
  }

  public getObject(id: string): GraphObjectNode | null {
    const node = this.objectMap.get(id);
    return node ? createGraphObjectNode(node) : null;
  }

  public listObjects(): GraphObjectNode[] {
    return this.objectOrder
      .map((id) => this.objectMap.get(id))
      .filter((node): node is GraphObjectNode => !!node)
      .map((node) => createGraphObjectNode(node));
  }

  public snapshot(): GraphSceneStoreSnapshot {
    return {
      sceneId: this.sceneId,
      objects: this.listObjects(),
      rootObjectIds: [...this.rootOrder]
    };
  }

  public toJSON(meta?: Record<string, unknown>): GraphOperationResult<GraphRuntimeSceneDocument> {
    const objects = this.listObjects();
    const relationSnapshot = createGraphRelationSnapshot(objects);
    if (!relationSnapshot.ok || !relationSnapshot.value) {
      return { ok: false, diagnostics: relationSnapshot.diagnostics };
    }

    const document: GraphRuntimeSceneDocument = {
      version: GRAPH_RUNTIME_SCENE_VERSION,
      sceneId: this.sceneId,
      objects,
      rootObjectIds: [...this.rootOrder],
      relationSnapshot: relationSnapshot.value,
      meta: meta ? cloneSerializable(meta) : undefined
    };

    if (hasRendererFrameworkLeak(document)) {
      return errorResult('scene.renderer-framework-leak', 'Graph scene document contains renderer-owned data.');
    }

    return okResult(cloneSerializable(document));
  }

  public clear(): void {
    this.objectMap.clear();
    this.objectOrder.length = 0;
    this.rootOrder.length = 0;
  }

  public static fromJSON(document: GraphRuntimeSceneDocument): GraphOperationResult<GraphSceneStore> {
    if (document.version !== GRAPH_RUNTIME_SCENE_VERSION) {
      return errorResult('scene.unsupported-version', `Unsupported graph scene document version: ${document.version}`);
    }

    if (hasRendererFrameworkLeak(document)) {
      return errorResult('scene.renderer-framework-leak', 'Graph scene document contains renderer-owned data.');
    }

    const store = new GraphSceneStore(document.sceneId);
    const diagnostics: GraphOperationDiagnostic[] = [];
    for (const node of document.objects) {
      const result = store.addObject(node, { root: document.rootObjectIds.includes(node.id) });
      if (!result.ok) diagnostics.push(...result.diagnostics);
    }
    if (diagnostics.length > 0) return { ok: false, diagnostics };

    if (document.relationSnapshot !== undefined) {
      const snapshotValidation = validateGraphRelationSnapshot(document.relationSnapshot, store.listObjects());
      if (!snapshotValidation.ok) {
        return { ok: false, diagnostics: snapshotValidation.diagnostics };
      }
    }

    const computedSnapshot = createGraphRelationSnapshot(store.listObjects());
    if (!computedSnapshot.ok) return { ok: false, diagnostics: computedSnapshot.diagnostics };

    return okResult(store);
  }
}
