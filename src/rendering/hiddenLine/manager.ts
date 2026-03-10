import type { BoardManager } from '../../board/BoardManager';
import type {
  GraphHiddenLineCurveSourceData,
  GraphHiddenLineMeshSourceData,
  GraphHiddenLineOptions,
  GraphHiddenLineSceneSnapshot,
  GraphHiddenLineSourceData,
  GraphHiddenLineSourceDescriptor,
  GraphHiddenLineSourceHandle,
  GraphHiddenLineSourceRecord,
  GraphHiddenLineSourceSummary,
  GraphHiddenLineSurfaceSourceData
} from './contracts';
import { GraphHiddenLineRegistry } from './registry';
import { resolveHiddenLineSceneSource, type GraphHiddenLineResolvedSceneSource } from './tessellation';
import { solveHiddenLineScene } from './solver';
import { GraphHiddenLineOverlayRenderer } from './overlayRenderer';

const DEFAULT_HIDDEN_LINE_OPTIONS: GraphHiddenLineOptions = {
  enabled: false,
  strategy: 'overlay2d',
  precision: 'balanced',
  debug: false,
  visibleStyle: {},
  hiddenStyle: {
    dash: 2,
    strokeOpacity: 0.7
  },
  sampling: {
    curveSegments: 64,
    surfaceStepsU: 24,
    surfaceStepsV: 24,
    adaptive: true,
    maxSubdivisions: 3
  }
};

const cloneOptions = (options: GraphHiddenLineOptions): GraphHiddenLineOptions => ({
  ...options,
  visibleStyle: options.visibleStyle ? { ...options.visibleStyle } : undefined,
  hiddenStyle: options.hiddenStyle ? { ...options.hiddenStyle } : undefined,
  sampling: options.sampling ? { ...options.sampling } : undefined
});

const countMeshEdges = (data: GraphHiddenLineMeshSourceData): number => {
  if (data.edges && data.edges.length > 0) return data.edges.length;

  const uniqueEdges = new Set<string>();
  data.faces.forEach((face) => {
    const indices = face.indices;
    for (let index = 0; index < indices.length; index += 1) {
      const current = indices[index];
      const next = indices[(index + 1) % indices.length];
      const edgeKey = current < next ? `${current}:${next}` : `${next}:${current}`;
      uniqueEdges.add(edgeKey);
    }
  });

  return uniqueEdges.size;
};

const countCurveSegments = (data: GraphHiddenLineCurveSourceData, options: GraphHiddenLineOptions): number => {
  return Math.max(2, data.steps ?? options.sampling?.curveSegments ?? 64);
};

const countSurfaceFaces = (data: GraphHiddenLineSurfaceSourceData, options: GraphHiddenLineOptions): number => {
  const stepsU = Math.max(1, data.stepsU ?? options.sampling?.surfaceStepsU ?? 24);
  const stepsV = Math.max(1, data.stepsV ?? options.sampling?.surfaceStepsV ?? 24);
  return stepsU * stepsV * 2;
};

const summarizeSource = (
  record: GraphHiddenLineSourceRecord,
  data: GraphHiddenLineSourceData,
  options: GraphHiddenLineOptions
): GraphHiddenLineSourceSummary => {
  if (data.kind === 'mesh') {
    return {
      sourceId: record.id,
      ownerId: record.ownerId,
      order: record.order,
      kind: data.kind,
      role: record.descriptor.role ?? 'both',
      debugLabel: record.descriptor.debugLabel,
      edgeCount: countMeshEdges(data),
      faceCount: data.faces.length,
      tags: [...(record.descriptor.tags ?? [])]
    };
  }

  if (data.kind === 'polyline-set') {
    return {
      sourceId: record.id,
      ownerId: record.ownerId,
      order: record.order,
      kind: data.kind,
      role: record.descriptor.role ?? 'edge',
      debugLabel: record.descriptor.debugLabel,
      edgeCount: data.polylines.length,
      faceCount: 0,
      tags: [...(record.descriptor.tags ?? [])]
    };
  }

  if (data.kind === 'curve') {
    return {
      sourceId: record.id,
      ownerId: record.ownerId,
      order: record.order,
      kind: data.kind,
      role: record.descriptor.role ?? 'edge',
      debugLabel: record.descriptor.debugLabel,
      edgeCount: countCurveSegments(data, options),
      faceCount: 0,
      tags: [...(record.descriptor.tags ?? [])]
    };
  }

  return {
    sourceId: record.id,
    ownerId: record.ownerId,
    order: record.order,
    kind: data.kind,
    role: record.descriptor.role ?? 'both',
    debugLabel: record.descriptor.debugLabel,
    edgeCount: data.featureCurves?.length ?? 0,
    faceCount: countSurfaceFaces(data, options),
    tags: [...(record.descriptor.tags ?? [])]
  };
};

export const normalizeGraphHiddenLineOptions = (options?: GraphHiddenLineOptions): GraphHiddenLineOptions => ({
  ...DEFAULT_HIDDEN_LINE_OPTIONS,
  ...options,
  visibleStyle: {
    ...DEFAULT_HIDDEN_LINE_OPTIONS.visibleStyle,
    ...options?.visibleStyle
  },
  hiddenStyle: {
    ...DEFAULT_HIDDEN_LINE_OPTIONS.hiddenStyle,
    ...options?.hiddenStyle
  },
  sampling: {
    ...DEFAULT_HIDDEN_LINE_OPTIONS.sampling,
    ...options?.sampling
  }
});

export class GraphHiddenLineManager {
  private readonly registry = new GraphHiddenLineRegistry();
  private readonly overlayRenderer = new GraphHiddenLineOverlayRenderer();
  private options: GraphHiddenLineOptions;
  private revision = 0;
  private snapshot: GraphHiddenLineSceneSnapshot;

  constructor(private readonly boardMgr: Pick<BoardManager, 'mode' | 'board' | 'view3d'>, options?: GraphHiddenLineOptions) {
    this.options = normalizeGraphHiddenLineOptions(options);
    this.snapshot = this.buildSnapshot([]);
  }

  public isEnabled(): boolean {
    return this.boardMgr.mode === '3d' && this.options.enabled === true;
  }

  public getOptions(): GraphHiddenLineOptions {
    return cloneOptions(this.options);
  }

  public setOptions(options?: GraphHiddenLineOptions): void {
    this.options = normalizeGraphHiddenLineOptions(options);
    this.touch();
  }

  public registerSource(
    ownerId: string,
    descriptor: GraphHiddenLineSourceDescriptor
  ): GraphHiddenLineSourceHandle {
    const record = this.registry.register(ownerId, descriptor);
    this.touch();

    return {
      id: record.id,
      ownerId: record.ownerId,
      dispose: () => this.removeSource(record.id)
    };
  }

  public removeSource(sourceId: string): boolean {
    const removed = this.registry.remove(sourceId);
    if (removed) {
      this.touch();
    }
    return removed;
  }

  public clearOwnerSources(ownerId: string): number {
    const removedIds = this.registry.clearOwner(ownerId);
    if (removedIds.length > 0) {
      this.touch();
    }
    return removedIds.length;
  }

  public clearAllSources(): void {
    if (this.registry.size() === 0) return;
    this.registry.clear();
    this.touch();
  }

  public update(): GraphHiddenLineSceneSnapshot {
    const summaries: GraphHiddenLineSourceSummary[] = [];
    const resolvedSources: GraphHiddenLineResolvedSceneSource[] = [];

    this.revision += 1;

    const board = (this.boardMgr as any).board;
    const view3d = (this.boardMgr as any).view3d;

    if (this.isEnabled()) {
      this.registry.list().forEach((record) => {
        if (record.descriptor.enabled === false) return;

        try {
          const data = record.descriptor.resolve();
          if (!data) return;
          summaries.push(summarizeSource(record, data, this.options));

          const resolved = resolveHiddenLineSceneSource(record, this.options);
          if (resolved) {
            resolvedSources.push(resolved);
          }
        } catch (error) {
          if (this.options.debug) {
            console.warn(`[GraphHiddenLineManager] resolve failed for ${record.id}`, error);
          }
        }
      });
    }

    if (this.isEnabled() && board && view3d && resolvedSources.length > 0) {
      const solveResult = solveHiddenLineScene(board, view3d, resolvedSources as any, this.options);
      this.overlayRenderer.render(board, solveResult.renderedPaths);
    } else {
      this.overlayRenderer.clear();
    }

    this.snapshot = this.buildSnapshot(summaries);
    return this.snapshot;
  }

  public getSnapshot(): GraphHiddenLineSceneSnapshot {
    return this.snapshot;
  }

  private touch(): void {
    this.revision += 1;
    this.snapshot = this.buildSnapshot([]);
  }

  private buildSnapshot(sources: GraphHiddenLineSourceSummary[]): GraphHiddenLineSceneSnapshot {
    return {
      revision: this.revision,
      enabled: this.isEnabled(),
      sourceCount: this.registry.size(),
      ownerCount: this.registry.ownerCount(),
      options: cloneOptions(this.options),
      sources: sources.map((source) => ({
        ...source,
        tags: [...source.tags]
      }))
    };
  }
}
