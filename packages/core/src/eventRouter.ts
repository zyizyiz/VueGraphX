import {
  DEFAULT_GRAPH_LAYER_ORDER,
  type GraphClientPoint,
  type GraphDragSession,
  type GraphLayerId,
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
    if (input.uiHandled) return null;

    const layerOrder = input.layerOrder ?? DEFAULT_GRAPH_LAYER_ORDER;
    for (const layerId of layerOrder) {
      const policy = this.policies.get(layerId) ?? { layerId, interactive: true, passThrough: false };
      if (!policy.interactive && policy.passThrough) continue;
      if (!policy.interactive) return null;

      const backends = this.getBackendsForLayer(layerId, policy.backendIds);
      for (const backend of backends) {
        const pick = backend.pick(clientPoint, { ...input.pickOptions, layerOrder: [layerId] });
        if (pick) return pick;
      }

      if (!policy.passThrough) {
        continue;
      }
    }

    return null;
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
