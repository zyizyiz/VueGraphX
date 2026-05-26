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

export const GRAPH_RUNTIME_SCENE_VERSION = 2;

export interface GraphRuntimeSceneDocument {
  version: typeof GRAPH_RUNTIME_SCENE_VERSION;
  sceneId: string;
  objects: GraphObjectNode[];
  rootObjectIds: string[];
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

    const stored = createGraphObjectNode(cloneSerializable(node));
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

    this.objectMap.set(id, next);
    return okResult(createGraphObjectNode(next));
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
    const document: GraphRuntimeSceneDocument = {
      version: GRAPH_RUNTIME_SCENE_VERSION,
      sceneId: this.sceneId,
      objects: this.listObjects(),
      rootObjectIds: [...this.rootOrder],
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

    return diagnostics.some((diagnostic) => diagnostic.severity === 'error')
      ? { ok: false, diagnostics }
      : okResult(store);
  }
}
