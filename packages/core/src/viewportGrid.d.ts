import type { GraphViewportSize } from './contracts';
export interface GraphViewportGridOptions {
    enabled?: boolean;
    cellSizePx?: number;
    lineColor?: string;
    lineWidth?: number;
    backgroundColor?: string;
    minCellSizePx?: number;
    maxLines?: number;
}
export type GraphViewportGridInput = boolean | GraphViewportGridOptions;
export interface ResolvedGraphViewportGridOptions {
    enabled: boolean;
    cellSizePx: number;
    lineColor: string;
    lineWidth: number;
    backgroundColor: string;
    minCellSizePx: number;
    maxLines: number;
}
export interface GraphViewportGridWorldBounds2D {
    left: number;
    top: number;
    right: number;
    bottom: number;
}
export declare const GRAPH_VIEWPORT_GRID_DEFAULTS: ResolvedGraphViewportGridOptions;
export declare const resolveGraphViewportGridOptions: (input?: GraphViewportGridInput, fallback?: ResolvedGraphViewportGridOptions) => ResolvedGraphViewportGridOptions;
export declare const createCenteredWorldBoundsForViewportGrid: (viewport: GraphViewportSize, grid: Pick<ResolvedGraphViewportGridOptions, "cellSizePx">, center?: {
    x: number;
    y: number;
}) => GraphViewportGridWorldBounds2D;
export declare const resolveGraphViewportGridStep: (pixelsPerUnit: number, visibleUnits: number, grid: Pick<ResolvedGraphViewportGridOptions, "minCellSizePx" | "maxLines">) => number;
