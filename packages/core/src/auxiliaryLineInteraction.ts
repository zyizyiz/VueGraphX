import type { GraphClientPoint } from './contracts';

export interface GraphAuxiliaryLineInteractionPoint2D {
  x: number;
  y: number;
}

export interface GraphAuxiliaryLineInteractionDraft {
  start: GraphAuxiliaryLineInteractionPoint2D;
  end: GraphAuxiliaryLineInteractionPoint2D;
}

export type GraphAuxiliaryLineInteractionAnchorRole = 'start' | 'end' | 'pending-start';

export interface GraphAuxiliaryLineInteractionAnchorState {
  role: GraphAuxiliaryLineInteractionAnchorRole;
  clientPoint: GraphClientPoint;
  point: GraphAuxiliaryLineInteractionPoint2D;
  fixed: boolean;
  visible: boolean;
}

export interface GraphAuxiliaryLineInteractionPointerInput {
  pointerId: number;
  point: GraphClientPoint;
}

export interface GraphAuxiliaryLineInteractionResolveInput {
  targetObjectId: string;
  clientPoint: GraphClientPoint;
}

export interface GraphAuxiliaryLineInteractionPointTargetInput extends GraphAuxiliaryLineInteractionResolveInput {
  point: GraphAuxiliaryLineInteractionPoint2D;
}

export interface GraphAuxiliaryLineInteractionDraftInput {
  targetObjectId: string;
  draft: GraphAuxiliaryLineInteractionDraft;
  distancePx: number;
  distance: number;
}

export interface GraphAuxiliaryLineInteractionControllerOptions {
  targetObjectId: string;
  tolerancePx?: number;
  resolvePoint(input: GraphAuxiliaryLineInteractionResolveInput): GraphAuxiliaryLineInteractionPoint2D | null;
  isPointInsideTarget?(input: GraphAuxiliaryLineInteractionPointTargetInput): boolean;
  isDraftValid?(input: GraphAuxiliaryLineInteractionDraftInput): boolean;
}

export interface GraphAuxiliaryLineInteractionAnchor {
  clientPoint: GraphClientPoint;
  point: GraphAuxiliaryLineInteractionPoint2D;
}

export interface GraphAuxiliaryLineInteractionPointerSession {
  pointerId: number;
  startClientPoint: GraphClientPoint;
  currentClientPoint: GraphClientPoint;
  startPoint: GraphAuxiliaryLineInteractionPoint2D;
  currentPoint: GraphAuxiliaryLineInteractionPoint2D;
}

export interface GraphAuxiliaryLineInteractionSession {
  targetObjectId: string;
  pendingStart: GraphAuxiliaryLineInteractionAnchor | null;
  pointer: GraphAuxiliaryLineInteractionPointerSession | null;
  anchors: readonly GraphAuxiliaryLineInteractionAnchorState[];
}

export type GraphAuxiliaryLineInteractionEvent =
  | {
    kind: 'pointer-started';
    targetObjectId: string;
    pointerId: number;
    startClientPoint: GraphClientPoint;
    currentClientPoint: GraphClientPoint;
    startPoint: GraphAuxiliaryLineInteractionPoint2D;
    currentPoint: GraphAuxiliaryLineInteractionPoint2D;
    pendingStartActive: boolean;
    anchors: readonly GraphAuxiliaryLineInteractionAnchorState[];
  }
  | {
    kind: 'preview';
    targetObjectId: string;
    pointerId?: number;
    source: 'drag' | 'click-hover';
    draft: GraphAuxiliaryLineInteractionDraft;
    anchors: readonly GraphAuxiliaryLineInteractionAnchorState[];
  }
  | {
    kind: 'preview-cleared';
    targetObjectId: string;
    pointerId?: number;
    reason: 'outside-target' | 'too-short' | 'commit' | 'cancel';
    anchors: readonly GraphAuxiliaryLineInteractionAnchorState[];
  }
  | {
    kind: 'outside-target';
    targetObjectId: string;
    pointerId?: number;
    phase: 'pointerdown' | 'pointermove' | 'pointerup' | 'hover';
    clientPoint: GraphClientPoint;
    point: GraphAuxiliaryLineInteractionPoint2D | null;
  }
  | {
    kind: 'pending-start-set';
    targetObjectId: string;
    pointerId: number;
    clientPoint: GraphClientPoint;
    point: GraphAuxiliaryLineInteractionPoint2D;
    anchors: readonly GraphAuxiliaryLineInteractionAnchorState[];
  }
  | {
    kind: 'too-short';
    targetObjectId: string;
    pointerId: number;
    draft: GraphAuxiliaryLineInteractionDraft;
    distancePx: number;
    distance: number;
    pendingStartActive: boolean;
    anchors: readonly GraphAuxiliaryLineInteractionAnchorState[];
  }
  | {
    kind: 'commit';
    targetObjectId: string;
    pointerId: number;
    draft: GraphAuxiliaryLineInteractionDraft;
    distancePx: number;
    distance: number;
    anchors: readonly GraphAuxiliaryLineInteractionAnchorState[];
  }
  | {
    kind: 'cancelled';
    targetObjectId: string;
    pointerId?: number;
  };

export interface GraphAuxiliaryLineInteractionResult {
  handled: boolean;
  targetObjectId: string;
  events: readonly GraphAuxiliaryLineInteractionEvent[];
  anchors: readonly GraphAuxiliaryLineInteractionAnchorState[];
}

export interface GraphAuxiliaryLineInteractionController {
  pointerDown(input: GraphAuxiliaryLineInteractionPointerInput): GraphAuxiliaryLineInteractionResult;
  pointerMove(input: GraphAuxiliaryLineInteractionPointerInput): GraphAuxiliaryLineInteractionResult;
  pointerUp(input: GraphAuxiliaryLineInteractionPointerInput): GraphAuxiliaryLineInteractionResult;
  cancel(pointerId?: number): GraphAuxiliaryLineInteractionResult;
  isPointerActive(pointerId?: number): boolean;
  hasPendingStart(): boolean;
  getSession(): GraphAuxiliaryLineInteractionSession;
}

const DEFAULT_AUXILIARY_LINE_TOLERANCE_PX = 4;

export const createGraphAuxiliaryLineInteractionController = (
  options: GraphAuxiliaryLineInteractionControllerOptions
): GraphAuxiliaryLineInteractionController => {
  const tolerancePx = options.tolerancePx ?? DEFAULT_AUXILIARY_LINE_TOLERANCE_PX;
  let pendingStart: GraphAuxiliaryLineInteractionAnchor | null = null;
  let pointer: GraphAuxiliaryLineInteractionPointerSession | null = null;

  const createResult = (
    handled: boolean,
    events: readonly GraphAuxiliaryLineInteractionEvent[] = [],
    anchors: readonly GraphAuxiliaryLineInteractionAnchorState[] = []
  ): GraphAuxiliaryLineInteractionResult => ({
    handled,
    targetObjectId: options.targetObjectId,
    events,
    anchors: cloneAnchorStates(anchors)
  });

  const cloneSession = (): GraphAuxiliaryLineInteractionSession => ({
    targetObjectId: options.targetObjectId,
    pendingStart: pendingStart ? cloneAnchor(pendingStart) : null,
    pointer: pointer ? clonePointer(pointer) : null,
    anchors: readAnchors()
  });

  const readAnchors = (): readonly GraphAuxiliaryLineInteractionAnchorState[] => {
    if (pointer) {
      return [
        createAnchorState('start', pointer.startClientPoint, pointer.startPoint, true),
        createAnchorState('end', pointer.currentClientPoint, pointer.currentPoint, false)
      ];
    }

    return pendingStart
      ? [createAnchorState('pending-start', pendingStart.clientPoint, pendingStart.point, true)]
      : [];
  };

  const resolveAnchor = (
    clientPoint: GraphClientPoint
  ): GraphAuxiliaryLineInteractionAnchor | null => {
    const point = options.resolvePoint({
      targetObjectId: options.targetObjectId,
      clientPoint
    });
    if (!isFinitePoint2D(point)) return null;
    return {
      clientPoint: cloneClientPoint(clientPoint),
      point: clonePoint(point)
    };
  };

  const isInsideTarget = (anchor: GraphAuxiliaryLineInteractionAnchor): boolean => (
    options.isPointInsideTarget?.({
      targetObjectId: options.targetObjectId,
      clientPoint: anchor.clientPoint,
      point: anchor.point
    }) ?? true
  );

  const isValidDraft = (
    draft: GraphAuxiliaryLineInteractionDraft,
    distancePx: number,
    distance: number
  ): boolean => (
    options.isDraftValid?.({
      targetObjectId: options.targetObjectId,
      draft: cloneDraft(draft),
      distancePx,
      distance
    }) ?? distancePx > tolerancePx
  );

  const createDraft = (
    start: GraphAuxiliaryLineInteractionPoint2D,
    end: GraphAuxiliaryLineInteractionPoint2D
  ): GraphAuxiliaryLineInteractionDraft => ({
    start: clonePoint(start),
    end: clonePoint(end)
  });

  return {
    pointerDown(input) {
      if (pointer) return createResult(true);

      const current = resolveAnchor(input.point);
      if (!current || !isInsideTarget(current)) {
        return createResult(true, [{
          kind: 'outside-target',
          targetObjectId: options.targetObjectId,
          pointerId: input.pointerId,
          phase: 'pointerdown',
          clientPoint: cloneClientPoint(input.point),
          point: current ? clonePoint(current.point) : null
        }]);
      }

      const start = pendingStart ?? current;
      pointer = {
        pointerId: input.pointerId,
        startClientPoint: cloneClientPoint(start.clientPoint),
        currentClientPoint: cloneClientPoint(current.clientPoint),
        startPoint: clonePoint(start.point),
        currentPoint: clonePoint(current.point)
      };
      const anchors = [
        createAnchorState('start', pointer.startClientPoint, pointer.startPoint, true)
      ];

      return createResult(true, [{
        kind: 'pointer-started',
        targetObjectId: options.targetObjectId,
        pointerId: input.pointerId,
        startClientPoint: cloneClientPoint(pointer.startClientPoint),
        currentClientPoint: cloneClientPoint(pointer.currentClientPoint),
        startPoint: clonePoint(pointer.startPoint),
        currentPoint: clonePoint(pointer.currentPoint),
        pendingStartActive: pendingStart !== null,
        anchors
      }], anchors);
    },

    pointerMove(input) {
      if (pointer?.pointerId === input.pointerId) {
        const startClientPoint = cloneClientPoint(pointer.startClientPoint);
        const startPoint = clonePoint(pointer.startPoint);
        const current = resolveAnchor(input.point);
        if (!current || !isInsideTarget(current)) {
          const anchors = [
            createAnchorState('start', startClientPoint, startPoint, true)
          ];
          if (current) {
            pointer = {
              ...pointer,
              currentClientPoint: cloneClientPoint(current.clientPoint),
              currentPoint: clonePoint(current.point)
            };
          }
          return createResult(true, [
            {
              kind: 'preview-cleared',
              targetObjectId: options.targetObjectId,
              pointerId: input.pointerId,
              reason: 'outside-target',
              anchors
            },
            {
              kind: 'outside-target',
              targetObjectId: options.targetObjectId,
              pointerId: input.pointerId,
              phase: 'pointermove',
              clientPoint: cloneClientPoint(input.point),
              point: current ? clonePoint(current.point) : null
            }
          ], anchors);
        }

        pointer = {
          ...pointer,
          currentClientPoint: cloneClientPoint(current.clientPoint),
          currentPoint: clonePoint(current.point)
        };
        const draft = createDraft(startPoint, current.point);
        const anchors = createDraftAnchorStates(startClientPoint, startPoint, current.clientPoint, current.point, false);
        return createResult(true, [{
          kind: 'preview',
          targetObjectId: options.targetObjectId,
          pointerId: input.pointerId,
          source: 'drag',
          draft,
          anchors
        }], anchors);
      }

      if (pendingStart) {
        const current = resolveAnchor(input.point);
        if (!current || !isInsideTarget(current)) {
          const anchors = [
            createAnchorState('pending-start', pendingStart.clientPoint, pendingStart.point, true)
          ];
          return createResult(true, [
            {
              kind: 'preview-cleared',
              targetObjectId: options.targetObjectId,
              pointerId: input.pointerId,
              reason: 'outside-target',
              anchors
            },
            {
              kind: 'outside-target',
              targetObjectId: options.targetObjectId,
              pointerId: input.pointerId,
              phase: 'hover',
              clientPoint: cloneClientPoint(input.point),
              point: current ? clonePoint(current.point) : null
            }
          ], anchors);
        }

        const draft = createDraft(pendingStart.point, current.point);
        const anchors = createDraftAnchorStates(
          pendingStart.clientPoint,
          pendingStart.point,
          current.clientPoint,
          current.point,
          false
        );
        return createResult(true, [{
          kind: 'preview',
          targetObjectId: options.targetObjectId,
          pointerId: input.pointerId,
          source: 'click-hover',
          draft,
          anchors
        }], anchors);
      }

      return createResult(false);
    },

    pointerUp(input) {
      if (!pointer || pointer.pointerId !== input.pointerId) return createResult(false);

      const activePointer = pointer;
      pointer = null;
      const current = resolveAnchor(input.point) ?? {
        clientPoint: cloneClientPoint(activePointer.currentClientPoint),
        point: clonePoint(activePointer.currentPoint)
      };
      const draft = createDraft(activePointer.startPoint, current.point);
      const distancePx = distanceBetweenPoints(activePointer.startClientPoint, current.clientPoint);
      const distance = distanceBetweenPoints(activePointer.startPoint, current.point);
      const draftAnchors = createDraftAnchorStates(
        activePointer.startClientPoint,
        activePointer.startPoint,
        current.clientPoint,
        current.point,
        true
      );
      const startInsideTarget = isInsideTarget({
        clientPoint: activePointer.startClientPoint,
        point: activePointer.startPoint
      });
      const endInsideTarget = isInsideTarget(current);

      if (!startInsideTarget || !endInsideTarget) {
        const outsideAnchors = pendingStart
          ? [createAnchorState('pending-start', pendingStart.clientPoint, pendingStart.point, true)]
          : [];
        return createResult(true, [
          {
            kind: 'preview-cleared',
            targetObjectId: options.targetObjectId,
            pointerId: input.pointerId,
            reason: 'outside-target',
            anchors: outsideAnchors
          },
          {
            kind: 'outside-target',
            targetObjectId: options.targetObjectId,
            pointerId: input.pointerId,
            phase: 'pointerup',
            clientPoint: cloneClientPoint(current.clientPoint),
            point: clonePoint(current.point)
          }
        ], outsideAnchors);
      }

      if (!isValidDraft(draft, distancePx, distance)) {
        const hadPendingStart = pendingStart !== null;
        if (!pendingStart) {
          pendingStart = {
            clientPoint: cloneClientPoint(activePointer.startClientPoint),
            point: clonePoint(activePointer.startPoint)
          };
        }
        const pendingAnchors = pendingStart
          ? [createAnchorState('pending-start', pendingStart.clientPoint, pendingStart.point, true)]
          : [];
        const events: GraphAuxiliaryLineInteractionEvent[] = [
          {
            kind: 'preview-cleared',
            targetObjectId: options.targetObjectId,
            pointerId: input.pointerId,
            reason: 'too-short',
            anchors: pendingAnchors
          },
          {
            kind: 'too-short',
            targetObjectId: options.targetObjectId,
            pointerId: input.pointerId,
            draft,
            distancePx,
            distance,
            pendingStartActive: hadPendingStart,
            anchors: pendingAnchors
          }
        ];
        if (!hadPendingStart) {
          events.push({
            kind: 'pending-start-set',
            targetObjectId: options.targetObjectId,
            pointerId: input.pointerId,
            clientPoint: cloneClientPoint(pendingStart.clientPoint),
            point: clonePoint(pendingStart.point),
            anchors: pendingAnchors
          });
        }
        return createResult(true, events, pendingAnchors);
      }

      pendingStart = null;
      return createResult(true, [
        {
          kind: 'preview-cleared',
          targetObjectId: options.targetObjectId,
          pointerId: input.pointerId,
          reason: 'commit',
          anchors: []
        },
        {
          kind: 'commit',
          targetObjectId: options.targetObjectId,
          pointerId: input.pointerId,
          draft,
          distancePx,
          distance,
          anchors: draftAnchors
        }
      ], []);
    },

    cancel(pointerId) {
      if (pointerId !== undefined && pointer?.pointerId !== pointerId) return createResult(false);
      const hadState = pointer !== null || pendingStart !== null;
      pointer = null;
      pendingStart = null;
      if (!hadState) return createResult(false);
      return createResult(true, [
        {
          kind: 'preview-cleared',
          targetObjectId: options.targetObjectId,
          pointerId,
          reason: 'cancel',
          anchors: []
        },
        {
          kind: 'cancelled',
          targetObjectId: options.targetObjectId,
          pointerId
        }
      ], []);
    },

    isPointerActive(pointerId) {
      return !!pointer && (pointerId === undefined || pointer.pointerId === pointerId);
    },

    hasPendingStart() {
      return pendingStart !== null;
    },

    getSession: cloneSession
  };
};

const cloneClientPoint = (point: GraphClientPoint): GraphClientPoint => ({
  x: point.x,
  y: point.y
});

const clonePoint = (
  point: GraphAuxiliaryLineInteractionPoint2D
): GraphAuxiliaryLineInteractionPoint2D => ({
  x: point.x,
  y: point.y
});

const cloneDraft = (
  draft: GraphAuxiliaryLineInteractionDraft
): GraphAuxiliaryLineInteractionDraft => ({
  start: clonePoint(draft.start),
  end: clonePoint(draft.end)
});

const cloneAnchor = (
  anchor: GraphAuxiliaryLineInteractionAnchor
): GraphAuxiliaryLineInteractionAnchor => ({
  clientPoint: cloneClientPoint(anchor.clientPoint),
  point: clonePoint(anchor.point)
});

const createAnchorState = (
  role: GraphAuxiliaryLineInteractionAnchorRole,
  clientPoint: GraphClientPoint,
  point: GraphAuxiliaryLineInteractionPoint2D,
  fixed: boolean
): GraphAuxiliaryLineInteractionAnchorState => ({
  role,
  clientPoint: cloneClientPoint(clientPoint),
  point: clonePoint(point),
  fixed,
  visible: true
});

const createDraftAnchorStates = (
  startClientPoint: GraphClientPoint,
  startPoint: GraphAuxiliaryLineInteractionPoint2D,
  endClientPoint: GraphClientPoint,
  endPoint: GraphAuxiliaryLineInteractionPoint2D,
  endFixed: boolean
): readonly GraphAuxiliaryLineInteractionAnchorState[] => [
  createAnchorState('start', startClientPoint, startPoint, true),
  createAnchorState('end', endClientPoint, endPoint, endFixed)
];

const cloneAnchorState = (
  anchor: GraphAuxiliaryLineInteractionAnchorState
): GraphAuxiliaryLineInteractionAnchorState => ({
  role: anchor.role,
  clientPoint: cloneClientPoint(anchor.clientPoint),
  point: clonePoint(anchor.point),
  fixed: anchor.fixed,
  visible: anchor.visible
});

const cloneAnchorStates = (
  anchors: readonly GraphAuxiliaryLineInteractionAnchorState[]
): readonly GraphAuxiliaryLineInteractionAnchorState[] => anchors.map(cloneAnchorState);

const clonePointer = (
  activePointer: GraphAuxiliaryLineInteractionPointerSession
): GraphAuxiliaryLineInteractionPointerSession => ({
  pointerId: activePointer.pointerId,
  startClientPoint: cloneClientPoint(activePointer.startClientPoint),
  currentClientPoint: cloneClientPoint(activePointer.currentClientPoint),
  startPoint: clonePoint(activePointer.startPoint),
  currentPoint: clonePoint(activePointer.currentPoint)
});

const distanceBetweenPoints = (
  start: GraphAuxiliaryLineInteractionPoint2D,
  end: GraphAuxiliaryLineInteractionPoint2D
): number => Math.hypot(end.x - start.x, end.y - start.y);

const isFinitePoint2D = (value: unknown): value is GraphAuxiliaryLineInteractionPoint2D => {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return typeof record.x === 'number'
    && Number.isFinite(record.x)
    && typeof record.y === 'number'
    && Number.isFinite(record.y);
};
