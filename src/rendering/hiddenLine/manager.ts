import type { BoardManager } from '../../board/BoardManager';
import type {
  GraphHiddenLineDiagnostic,
  GraphHiddenLineCurveSourceData,
  GraphHiddenLineMeshSourceData,
  GraphHiddenLineOptions,
  GraphHiddenLineProfile,
  GraphHiddenLineSceneSnapshot,
  GraphHiddenLineSceneStats,
  GraphHiddenLineSourceData,
  GraphHiddenLineSourceDescriptor,
  GraphHiddenLineSourceHandle,
  GraphHiddenLineSourceRecord,
  GraphHiddenLineSourceSummary,
  GraphHiddenLineSurfaceSourceData
} from './contracts';
import { GraphHiddenLineRegistry } from './registry';
import { resolveHiddenLineSceneSourceData, type GraphHiddenLineResolvedSceneSource } from './tessellation';
import { solveHiddenLineScene } from './solver';
import { GraphHiddenLineOverlayRenderer } from './overlayRenderer';

const DEFAULT_HIDDEN_LINE_OPTIONS: GraphHiddenLineOptions = {
  enabled: false,
  profile: 'balanced',
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

const HIDDEN_LINE_PROFILE_DEFAULTS: Record<GraphHiddenLineProfile, Pick<GraphHiddenLineOptions, 'precision' | 'visibleStyle' | 'hiddenStyle' | 'sampling'>> = {
  performance: {
    precision: 'balanced',
    visibleStyle: {},
    hiddenStyle: {
      dash: 2,
      strokeOpacity: 0.55
    },
    sampling: {
      curveSegments: 32,
      surfaceStepsU: 12,
      surfaceStepsV: 12,
      adaptive: true,
      maxSubdivisions: 2
    }
  },
  balanced: {
    precision: 'balanced',
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
  },
  quality: {
    precision: 'high',
    visibleStyle: {},
    hiddenStyle: {
      dash: 2,
      strokeOpacity: 0.8
    },
    sampling: {
      curveSegments: 96,
      surfaceStepsU: 32,
      surfaceStepsV: 32,
      adaptive: true,
      maxSubdivisions: 4
    }
  }
};

const cloneOptions = (options: GraphHiddenLineOptions): GraphHiddenLineOptions => ({
  ...options,
  visibleStyle: options.visibleStyle ? { ...options.visibleStyle } : undefined,
  hiddenStyle: options.hiddenStyle ? { ...options.hiddenStyle } : undefined,
  sampling: options.sampling ? { ...options.sampling } : undefined
});

const cloneStats = (stats: GraphHiddenLineSceneStats): GraphHiddenLineSceneStats => ({
  ...stats
});

const cloneDiagnostics = (diagnostics: GraphHiddenLineDiagnostic[]): GraphHiddenLineDiagnostic[] => diagnostics.map((diagnostic) => ({
  ...diagnostic
}));

const createEmptyStats = (): GraphHiddenLineSceneStats => ({
  activeSourceCount: 0,
  resolvedSourceCount: 0,
  skippedSourceCount: 0,
  disabledSourceCount: 0,
  emptySourceCount: 0,
  errorSourceCount: 0,
  triangleCount: 0,
  polylineCount: 0,
  renderedPathCount: 0
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
  ...HIDDEN_LINE_PROFILE_DEFAULTS[
    options?.profile
    ?? (options?.precision === 'high' ? 'quality' : 'balanced')
  ],
  ...options,
  profile: options?.profile ?? (options?.precision === 'high' ? 'quality' : DEFAULT_HIDDEN_LINE_OPTIONS.profile),
  precision: HIDDEN_LINE_PROFILE_DEFAULTS[
    options?.profile
    ?? (options?.precision === 'high' ? 'quality' : 'balanced')
  ].precision,
  visibleStyle: {
    ...DEFAULT_HIDDEN_LINE_OPTIONS.visibleStyle,
    ...HIDDEN_LINE_PROFILE_DEFAULTS[
      options?.profile
      ?? (options?.precision === 'high' ? 'quality' : 'balanced')
    ].visibleStyle,
    ...options?.visibleStyle
  },
  hiddenStyle: {
    ...DEFAULT_HIDDEN_LINE_OPTIONS.hiddenStyle,
    ...HIDDEN_LINE_PROFILE_DEFAULTS[
      options?.profile
      ?? (options?.precision === 'high' ? 'quality' : 'balanced')
    ].hiddenStyle,
    ...options?.hiddenStyle
  },
  sampling: {
    ...DEFAULT_HIDDEN_LINE_OPTIONS.sampling,
    ...HIDDEN_LINE_PROFILE_DEFAULTS[
      options?.profile
      ?? (options?.precision === 'high' ? 'quality' : 'balanced')
    ].sampling,
    ...options?.sampling
  }
});

export class GraphHiddenLineManager {
  private readonly registry = new GraphHiddenLineRegistry();
  private readonly overlayRenderer = new GraphHiddenLineOverlayRenderer();
  private options: GraphHiddenLineOptions;
  private revision = 0;
  private diagnostics: GraphHiddenLineDiagnostic[] = [];
  private stats: GraphHiddenLineSceneStats = createEmptyStats();
  private snapshot: GraphHiddenLineSceneSnapshot;

  constructor(
    private readonly boardMgr: Pick<BoardManager, 'mode'> & Partial<Pick<BoardManager, 'board' | 'view3d'>>,
    options?: GraphHiddenLineOptions
  ) {
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
    const diagnostics: GraphHiddenLineDiagnostic[] = [];
    const stats = createEmptyStats();

    this.revision += 1;

    const board = (this.boardMgr as any).board;
    const view3d = (this.boardMgr as any).view3d;

    if (this.isEnabled()) {
      this.registry.list().forEach((record) => {
        if (record.descriptor.enabled === false) {
          stats.disabledSourceCount += 1;
          stats.skippedSourceCount += 1;
          return;
        }

        stats.activeSourceCount += 1;

        try {
          const data = record.descriptor.resolve();
          if (!data) {
            stats.emptySourceCount += 1;
            stats.skippedSourceCount += 1;
            diagnostics.push({
              code: 'hidden_line_source_empty',
              severity: 'warning',
              message: `Hidden-line source "${record.descriptor.debugLabel ?? record.id}" returned no data.`,
              sourceId: record.id,
              ownerId: record.ownerId,
              debugLabel: record.descriptor.debugLabel
            });
            return;
          }

          summaries.push(summarizeSource(record, data, this.options));

          const resolved = resolveHiddenLineSceneSourceData(record, data, this.options);
          if (resolved) {
            stats.resolvedSourceCount += 1;
            stats.triangleCount += resolved.triangles.length;
            stats.polylineCount += resolved.polylines.length;
            resolvedSources.push(resolved);
            return;
          }

          stats.emptySourceCount += 1;
          stats.skippedSourceCount += 1;
          diagnostics.push({
            code: 'hidden_line_source_unresolved',
            severity: 'warning',
            message: `Hidden-line source "${record.descriptor.debugLabel ?? record.id}" could not be tessellated into a renderable scene source.`,
            sourceId: record.id,
            ownerId: record.ownerId,
            debugLabel: record.descriptor.debugLabel
          });
        } catch (error) {
          stats.errorSourceCount += 1;
          stats.skippedSourceCount += 1;
          diagnostics.push({
            code: 'hidden_line_source_resolve_failed',
            severity: 'error',
            message: `Hidden-line source "${record.descriptor.debugLabel ?? record.id}" failed to resolve.`,
            sourceId: record.id,
            ownerId: record.ownerId,
            debugLabel: record.descriptor.debugLabel
          });
          if (this.options.debug) {
            console.warn(`[GraphHiddenLineManager] resolve failed for ${record.id}`, error);
          }
        }
      });
    }

    if (this.isEnabled() && board && view3d && resolvedSources.length > 0) {
      const solveResult = solveHiddenLineScene(board, view3d, resolvedSources as any, this.options);
      stats.triangleCount = solveResult.triangleCount;
      stats.polylineCount = solveResult.polylineCount;
      stats.renderedPathCount = solveResult.renderedPaths.length;
      this.overlayRenderer.render(board, solveResult.renderedPaths);
    } else {
      this.overlayRenderer.clear();
    }

    this.stats = stats;
    this.diagnostics = diagnostics;
    this.snapshot = this.buildSnapshot(summaries);
    return this.snapshot;
  }

  public getSnapshot(): GraphHiddenLineSceneSnapshot {
    return this.snapshot;
  }

  private touch(): void {
    this.revision += 1;
    this.stats = createEmptyStats();
    this.diagnostics = [];
    this.snapshot = this.buildSnapshot([]);
  }

  private buildSnapshot(sources: GraphHiddenLineSourceSummary[]): GraphHiddenLineSceneSnapshot {
    return {
      revision: this.revision,
      enabled: this.isEnabled(),
      sourceCount: this.registry.size(),
      ownerCount: this.registry.ownerCount(),
      options: cloneOptions(this.options),
      stats: cloneStats(this.stats),
      diagnostics: cloneDiagnostics(this.diagnostics),
      sources: sources.map((source) => ({
        ...source,
        tags: [...source.tags]
      }))
    };
  }
}
