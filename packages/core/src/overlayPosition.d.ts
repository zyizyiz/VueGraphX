import type { GraphClientPoint, GraphViewportSize, GraphWorldPoint } from './contracts';
export interface GraphOverlayViewportPadding {
    left?: number;
    right?: number;
    top?: number;
    bottom?: number;
}
export interface GraphOverlayPositionOffset {
    x?: number;
    y?: number;
}
export interface GraphOverlayPositionInput {
    point: GraphWorldPoint;
    viewport: GraphViewportSize;
    project: (point: GraphWorldPoint) => GraphClientPoint | null;
    offset?: GraphOverlayPositionOffset;
    padding?: GraphOverlayViewportPadding;
    clamp?: boolean;
}
export interface GraphOverlayPosition {
    x: number;
    y: number;
    anchor: GraphClientPoint;
    point: GraphWorldPoint;
    viewport: GraphViewportSize;
    offset: Required<GraphOverlayPositionOffset>;
    visible: boolean;
}
export declare const resolveGraphOverlayPosition: (input: GraphOverlayPositionInput) => GraphOverlayPosition | null;
