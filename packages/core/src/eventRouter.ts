import {
  DEFAULT_GRAPH_LAYER_ORDER,
  type GraphClientPoint,
  type GraphDragSession,
  type GraphLayerId,
  type GraphOperationDiagnostic,
  type GraphPickOptions,
  type GraphPickResult,
  type GraphPointerSession,
  type GraphRenderBackend,
  type GraphRuntimeTargetRef
} from './contracts';

export interface GraphLayerPolicy {
  layerId: GraphLayerId;
  interactive: boolean;
  passThrough: boolean;
  backendIds?: readonly string[];
}

export interface GraphPointerRouteInput {
  pointerId: number;
  clientPoint: GraphClientPoint;
  timestamp?: number;
  uiHandled?: boolean;
  layerOrder?: readonly GraphLayerId[];
  pickOptions?: Omit<GraphPickOptions, 'layerOrder'>;
}

export interface GraphPointerRouteResult {
  pick: GraphPickResult | null;
  session: GraphPointerSession;
}

export type GraphPickDiagnosticCode =
  | 'pick.ui-handled'
  | 'pick.layer-pass-through'
  | 'pick.layer-blocked'
  | 'pick.backend-miss'
  | 'pick.hit-group-filtered'
  | 'pick.target-found';

export interface GraphPickDiagnostic extends GraphOperationDiagnostic {
  code: GraphPickDiagnosticCode;
}

export interface GraphPickRouteResult {
  pick: GraphPickResult | null;
  diagnostics: GraphPickDiagnostic[];
}

const DEFAULT_LAYER_POLICIES: readonly GraphLayerPolicy[] = [
  { layerId: 'ui', interactive: true, passThrough: false },
  { layerId: 'interaction', interactive: true, passThrough: false },
  { layerId: 'overlay', interactive: false, passThrough: true },
  { layerId: 'content', interactive: true, passThrough: false },
  { layerId: 'background', interactive: true, passThrough: false },
  { layerId: 'debug', interactive: false, passThrough: true }
] as const;

export class GraphInteractionRouter {
  private readonly backends = new Map<string, GraphRenderBackend>();
  private readonly backendLayers = new Map<string, GraphLayerId>();
  private readonly policies = new Map<GraphLayerId, GraphLayerPolicy>();
  private activePointer: GraphPointerSession | null = null;
  private activeDrag: GraphDragSession | null = null;

  public constructor(policies: readonly GraphLayerPolicy[] = DEFAULT_LAYER_POLICIES) {
    policies.forEach((policy) => this.setLayerPolicy(policy));
  }

  public setLayerPolicy(policy: GraphLayerPolicy): void {
    this.policies.set(policy.layerId, {
      layerId: policy.layerId,
      interactive: policy.interactive,
      passThrough: policy.passThrough,
      backendIds: policy.backendIds ? [...policy.backendIds] : undefined
    });
  }

  public registerBackend(backend: GraphRenderBackend, layerId: GraphLayerId = 'content'): void {
    this.backends.set(backend.id, backend);
    this.backendLayers.set(backend.id, layerId);
  }

  public unregisterBackend(backendId: string): boolean {
    this.backendLayers.delete(backendId);
    return this.backends.delete(backendId);
  }

  public pick(clientPoint: GraphClientPoint, input: Omit<GraphPointerRouteInput, 'pointerId' | 'clientPoint'> = {}): GraphPickResult | null {
    return this.pickWithDiagnostics(clientPoint, input).pick;
  }

  public pickWithDiagnostics(
    clientPoint: GraphClientPoint,
    input: Omit<GraphPointerRouteInput, 'pointerId' | 'clientPoint'> = {}
  ): GraphPickRouteResult {
    const diagnostics: GraphPickDiagnostic[] = [];
    if (input.uiHandled) {
      diagnostics.push(createPickDiagnostic('pick.ui-handled', 'Pointer was already handled by the UI layer.', 'info', 'ui'));
      return { pick: null, diagnostics };
    }

    const layerOrder = input.layerOrder ?? DEFAULT_GRAPH_LAYER_ORDER;
    for (const layerId of layerOrder) {
      const policy = this.policies.get(layerId) ?? { layerId, interactive: true, passThrough: false };
      if (!policy.interactive) {
        diagnostics.push(createPickDiagnostic(
          policy.passThrough ? 'pick.layer-pass-through' : 'pick.layer-blocked',
          policy.passThrough
            ? `Graph layer ${layerId} is non-interactive and passes picking to lower layers.`
            : `Graph layer ${layerId} blocks picking for lower layers.`,
          policy.passThrough ? 'info' : 'warning',
          layerId
        ));
        if (policy.passThrough) continue;
        return { pick: null, diagnostics };
      }

      const backends = this.getBackendsForLayer(layerId, policy.backendIds);
      for (const backend of backends) {
        const pick = backend.pick(clientPoint, { ...input.pickOptions, layerOrder: [layerId] });
        if (!pick) {
          diagnostics.push(createPickDiagnostic('pick.backend-miss', `Backend ${backend.id} did not report a hit on layer ${layerId}.`, 'info', layerId, backend.id));
          continue;
        }
        const normalizedPick = normalizePickHitGroup(pick);
        if (!matchesRequestedHitGroup(normalizedPick, input.pickOptions?.hitGroups)) {
          diagnostics.push(createPickDiagnostic('pick.hit-group-filtered', `Backend ${backend.id} hit ${normalizedPick.hitGroup ?? 'an ungrouped target'}, which does not match the requested hit groups.`, 'info', layerId, backend.id));
          continue;
        }
        diagnostics.push(createPickDiagnostic('pick.target-found', `Backend ${backend.id} resolved a target on layer ${layerId}.`, 'info', layerId, backend.id));
        return { pick: normalizedPick, diagnostics };
      }

      if (!policy.passThrough) {
        continue;
      }
      diagnostics.push(createPickDiagnostic('pick.layer-pass-through', `Graph layer ${layerId} had no matching target and passes picking to lower layers.`, 'info', layerId));
    }

    return { pick: null, diagnostics };
  }

  public pointerDown(input: GraphPointerRouteInput): GraphPointerRouteResult {
    const pick = this.pick(input.clientPoint, input);
    const session: GraphPointerSession = {
      pointerId: input.pointerId,
      startClientPoint: { ...input.clientPoint },
      currentClientPoint: { ...input.clientPoint },
      target: pick?.target ? { ...pick.target } : null,
      startedAt: input.timestamp ?? Date.now()
    };
    this.activePointer = session;
    return { pick, session: { ...session, startClientPoint: { ...session.startClientPoint }, currentClientPoint: { ...session.currentClientPoint }, target: cloneTarget(session.target) } };
  }

  public pointerMove(pointerId: number, clientPoint: GraphClientPoint, timestamp: number = Date.now()): GraphPointerSession | null {
    if (!this.activePointer || this.activePointer.pointerId !== pointerId) return null;
    this.activePointer = {
      ...this.activePointer,
      currentClientPoint: { ...clientPoint },
      meta: { ...(this.activePointer.meta ?? {}), updatedAt: timestamp }
    };
    if (this.activeDrag) {
      this.activeDrag = {
        ...this.activeDrag,
        currentClientPoint: { ...clientPoint },
        meta: { ...(this.activeDrag.meta ?? {}), updatedAt: timestamp }
      };
    }
    return this.getActivePointerSession();
  }

  public beginDrag(dragKind: GraphDragSession['dragKind'] = 'move'): GraphDragSession | null {
    if (!this.activePointer || !this.activePointer.target) return null;
    this.activeDrag = {
      ...this.activePointer,
      target: { ...this.activePointer.target },
      dragKind
    };
    return this.getActiveDragSession();
  }

  public pointerUp(pointerId: number): GraphPointerSession | null {
    if (!this.activePointer || this.activePointer.pointerId !== pointerId) return null;
    const ended = this.getActivePointerSession();
    this.activePointer = null;
    this.activeDrag = null;
    return ended;
  }

  public cancelPointer(pointerId?: number): void {
    if (pointerId === undefined || this.activePointer?.pointerId === pointerId) {
      this.activePointer = null;
      this.activeDrag = null;
    }
  }

  public getActivePointerSession(): GraphPointerSession | null {
    return this.activePointer
      ? {
          ...this.activePointer,
          startClientPoint: { ...this.activePointer.startClientPoint },
          currentClientPoint: { ...this.activePointer.currentClientPoint },
          target: cloneTarget(this.activePointer.target)
        }
      : null;
  }

  public getActiveDragSession(): GraphDragSession | null {
    return this.activeDrag
      ? {
          ...this.activeDrag,
          startClientPoint: { ...this.activeDrag.startClientPoint },
          currentClientPoint: { ...this.activeDrag.currentClientPoint },
          target: cloneTarget(this.activeDrag.target),
          startWorldPoint: this.activeDrag.startWorldPoint ? { ...this.activeDrag.startWorldPoint } : undefined,
          currentWorldPoint: this.activeDrag.currentWorldPoint ? { ...this.activeDrag.currentWorldPoint } : undefined
        }
      : null;
  }

  private getBackendsForLayer(layerId: GraphLayerId, backendIds?: readonly string[]): GraphRenderBackend[] {
    const ids = backendIds ?? [...this.backendLayers.entries()]
      .filter(([, backendLayer]) => backendLayer === layerId)
      .map(([backendId]) => backendId);
    return ids
      .map((backendId) => this.backends.get(backendId))
      .filter((backend): backend is GraphRenderBackend => !!backend);
  }
}

const cloneTarget = (target: GraphRuntimeTargetRef | null): GraphRuntimeTargetRef | null => target ? { ...target } : null;

const createPickDiagnostic = (
  code: GraphPickDiagnosticCode,
  message: string,
  severity: GraphPickDiagnostic['severity'],
  layerId: GraphLayerId,
  backendId?: string
): GraphPickDiagnostic => ({
  code,
  message,
  severity,
  target: { scope: 'backend-layer', layerId, backendId }
});

const normalizePickHitGroup = (pick: GraphPickResult): GraphPickResult => {
  const hitGroups = readPickHitGroups(pick);
  return {
    ...pick,
    target: { ...pick.target },
    clientPoint: { ...pick.clientPoint },
    worldPoint: pick.worldPoint ? { ...pick.worldPoint } : undefined,
    hitGroup: pick.hitGroup ?? hitGroups[0],
    meta: {
      ...(pick.meta ?? {}),
      ...(hitGroups.length > 0 ? { hitGroups } : {})
    }
  };
};

const matchesRequestedHitGroup = (pick: GraphPickResult, requestedGroups?: readonly string[]): boolean => {
  if (!requestedGroups || requestedGroups.length === 0) return true;
  return readPickHitGroups(pick).some((group) => requestedGroups.includes(group));
};

const readPickHitGroups = (pick: GraphPickResult): string[] => {
  const fromMeta = Array.isArray(pick.meta?.hitGroups) ? pick.meta.hitGroups : [pick.meta?.hitGroup];
  const groups = [
    pick.hitGroup,
    ...fromMeta
  ].filter((group): group is string => typeof group === 'string' && group.length > 0);
  return groups.length > 0 ? [...new Set(groups)] : [pick.target.scope];
};
