export interface StandardCoordinateTickModel {
  unitDistance: number;
  positions: number[];
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
  readonly yAxisLabelTopPx: 0;
};
export declare const createStandardCoordinateTickModel: (lower: number, upper: number, pixelSpan: number) => StandardCoordinateTickModel;
export declare const formatStandardCoordinateLabel: (value: number) => string;
export declare const isStandardZeroCoordinate: (value: number) => boolean;
