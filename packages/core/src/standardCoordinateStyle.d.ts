export interface StandardCoordinateTickModel {
    unitDistance: number;
    positions: number[];
}
export interface StandardCoordinatePoint {
    x: number;
    y: number;
}
export type StandardCoordinateLabelAxis = 'x' | 'y' | 'plain';
export type StandardCoordinateLabelRole = 'x-tick' | 'y-tick' | 'x-axis' | 'y-axis' | 'origin';
export interface StandardCoordinateLabelModel {
    text: string;
    axis: StandardCoordinateLabelAxis;
    role: StandardCoordinateLabelRole;
    point: StandardCoordinatePoint;
    value?: number;
}
export interface StandardCoordinateGeometryInput {
    origin: StandardCoordinatePoint;
    unitPx: number;
    xRange: {
        min: number;
        max: number;
    };
    yRange: {
        min: number;
        max: number;
    };
    showTicks?: boolean;
    showLabels?: boolean;
    includeGrid?: boolean;
    includeBorder?: boolean;
}
export interface StandardCoordinateSystemGeometry extends Record<string, unknown> {
    kind: 'coordinate-system';
    border: readonly StandardCoordinatePoint[];
    xAxis: readonly [StandardCoordinatePoint, StandardCoordinatePoint];
    yAxis: readonly [StandardCoordinatePoint, StandardCoordinatePoint];
    axisArrowSegments: readonly (readonly [StandardCoordinatePoint, StandardCoordinatePoint])[];
    gridSegments: readonly (readonly [StandardCoordinatePoint, StandardCoordinatePoint])[];
    segments: readonly (readonly StandardCoordinatePoint[])[];
    tickPoints: readonly StandardCoordinatePoint[];
    labels: readonly StandardCoordinateLabelModel[];
}
export interface StandardCoordinateLabelPixelOffset {
    x: number;
    y: number;
}
export declare const STANDARD_COORDINATE_UI: {
    readonly axisStrokeColor: "#666666";
    readonly axisStrokeWidthPx: 1.2;
    readonly axisArrowLengthPx: 6;
    readonly axisArrowHalfHeightPx: 3.4641;
    readonly tickLabelColor: "rgba(0, 0, 0, 0.85)";
    readonly tickLabelFont: "bold 12px \"Songti SC\", \"STSong\", \"SimSun\", serif";
    readonly tickLabelLineHeightPx: 14;
    readonly tickTargetDistancePx: 30;
    readonly minTickLabelDistancePx: 22;
    readonly xTickLabelTopOffsetPx: 0;
    readonly yTickLabelLeftOffsetPx: -10;
    readonly yTickLabelTopOffsetPx: -9;
    readonly originLabelLeftOffsetPx: -12;
    readonly originLabelTopOffsetPx: 0;
    readonly xAxisLabelRightInsetPx: 6;
    readonly xAxisLabelTopOffsetPx: 0;
    readonly yAxisLabelLeftOffsetPx: -10;
    readonly yAxisLabelTopPx: -7;
};
export declare const createStandardCoordinateTickModel: (lower: number, upper: number, pixelSpan: number) => StandardCoordinateTickModel;
export declare const formatStandardCoordinateLabel: (value: number) => string;
export declare const isStandardZeroCoordinate: (value: number) => boolean;
export declare const resolveStandardCoordinateLabelPixelOffset: (labelOrRole: StandardCoordinateLabelModel | StandardCoordinateLabelRole) => StandardCoordinateLabelPixelOffset;
export declare const resolveStandardCoordinateLabelScreenPosition: (label: StandardCoordinateLabelModel, point: StandardCoordinatePoint, visualScale?: number) => StandardCoordinatePoint;
export declare const createStandardCoordinateSystemGeometry: (input: StandardCoordinateGeometryInput) => StandardCoordinateSystemGeometry;
