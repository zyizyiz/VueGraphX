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
export type GraphAuxiliaryLineInteractionEvent = {
    kind: 'pointer-started';
    targetObjectId: string;
    pointerId: number;
    startClientPoint: GraphClientPoint;
    currentClientPoint: GraphClientPoint;
    startPoint: GraphAuxiliaryLineInteractionPoint2D;
    currentPoint: GraphAuxiliaryLineInteractionPoint2D;
    pendingStartActive: boolean;
    anchors: readonly GraphAuxiliaryLineInteractionAnchorState[];
} | {
    kind: 'preview';
    targetObjectId: string;
    pointerId?: number;
    source: 'drag' | 'click-hover';
    draft: GraphAuxiliaryLineInteractionDraft;
    anchors: readonly GraphAuxiliaryLineInteractionAnchorState[];
} | {
    kind: 'preview-cleared';
    targetObjectId: string;
    pointerId?: number;
    reason: 'outside-target' | 'too-short' | 'commit' | 'cancel';
    anchors: readonly GraphAuxiliaryLineInteractionAnchorState[];
} | {
    kind: 'outside-target';
    targetObjectId: string;
    pointerId?: number;
    phase: 'pointerdown' | 'pointermove' | 'pointerup' | 'hover';
    clientPoint: GraphClientPoint;
    point: GraphAuxiliaryLineInteractionPoint2D | null;
} | {
    kind: 'pending-start-set';
    targetObjectId: string;
    pointerId: number;
    clientPoint: GraphClientPoint;
    point: GraphAuxiliaryLineInteractionPoint2D;
    anchors: readonly GraphAuxiliaryLineInteractionAnchorState[];
} | {
    kind: 'too-short';
    targetObjectId: string;
    pointerId: number;
    draft: GraphAuxiliaryLineInteractionDraft;
    distancePx: number;
    distance: number;
    pendingStartActive: boolean;
    anchors: readonly GraphAuxiliaryLineInteractionAnchorState[];
} | {
    kind: 'commit';
    targetObjectId: string;
    pointerId: number;
    draft: GraphAuxiliaryLineInteractionDraft;
    distancePx: number;
    distance: number;
    anchors: readonly GraphAuxiliaryLineInteractionAnchorState[];
} | {
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
export declare const createGraphAuxiliaryLineInteractionController: (options: GraphAuxiliaryLineInteractionControllerOptions) => GraphAuxiliaryLineInteractionController;
