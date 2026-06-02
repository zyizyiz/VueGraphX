export interface GraphGridSnapPoint {
    x: number;
    y: number;
}
export interface GraphGridSnapOptions {
    enabled: boolean;
    step: number;
    origin: GraphGridSnapPoint;
    phase: 'always' | 'end';
}
export type GraphGridSnapInput = boolean | {
    enabled?: boolean;
    step?: number;
    origin?: Partial<GraphGridSnapPoint>;
    phase?: 'always' | 'end';
};
export declare const resolveGraphGridSnapOptions: (input: unknown, fallback?: Partial<GraphGridSnapOptions>) => GraphGridSnapOptions;
export declare const snapPointToGraphGrid: (point: GraphGridSnapPoint, input: unknown, fallback?: Partial<GraphGridSnapOptions>) => GraphGridSnapPoint;
export declare const snapDeltaToGraphGrid: (anchor: GraphGridSnapPoint, delta: {
    dx: number;
    dy: number;
}, input: unknown, fallback?: Partial<GraphGridSnapOptions>) => {
    dx: number;
    dy: number;
};
