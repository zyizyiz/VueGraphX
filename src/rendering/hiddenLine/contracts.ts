export interface GraphHiddenLinePoint3D {
  x: number;
  y: number;
  z: number;
}

export interface GraphHiddenLineFace {
  id?: string;
  indices: number[];
}

export interface GraphHiddenLinePolyline {
  id?: string;
  points: GraphHiddenLinePoint3D[];
  closed?: boolean;
}

export interface GraphHiddenLineEdgeStyle {
  strokeColor?: string;
  strokeWidth?: number;
  strokeOpacity?: number;
  dash?: number;
  dashScale?: boolean;
  lineCap?: 'butt' | 'round' | 'square';
}

export interface GraphHiddenLineStyleSpec {
  visible?: GraphHiddenLineEdgeStyle;
  hidden?: GraphHiddenLineEdgeStyle;
}

export interface GraphHiddenLineSamplingOptions {
  curveSegments?: number;
  surfaceStepsU?: number;
  surfaceStepsV?: number;
  adaptive?: boolean;
  maxSubdivisions?: number;
}

export interface GraphHiddenLineOptions {
  enabled?: boolean;
  strategy?: 'overlay2d';
  precision?: 'balanced' | 'high';
  debug?: boolean;
  visibleStyle?: GraphHiddenLineEdgeStyle;
  hiddenStyle?: GraphHiddenLineEdgeStyle;
  sampling?: GraphHiddenLineSamplingOptions;
}

export interface GraphHiddenLineMeshSourceData {
  kind: 'mesh';
  vertices: GraphHiddenLinePoint3D[];
  faces: GraphHiddenLineFace[];
  edges?: GraphHiddenLinePolyline[];
}

export interface GraphHiddenLinePolylineSetSourceData {
  kind: 'polyline-set';
  polylines: GraphHiddenLinePolyline[];
}

export interface GraphHiddenLineCurveSourceData {
  kind: 'curve';
  range: [number, number];
  steps?: number;
  closed?: boolean;
  evaluate: (t: number) => GraphHiddenLinePoint3D | null;
}

export interface GraphHiddenLineSurfaceFeatureCurve {
  id?: string;
  range: [number, number];
  steps?: number;
  closed?: boolean;
  evaluate: (t: number) => GraphHiddenLinePoint3D | null;
}

export interface GraphHiddenLineSurfaceSourceData {
  kind: 'surface';
  uRange: [number, number];
  vRange: [number, number];
  stepsU?: number;
  stepsV?: number;
  evaluate: (u: number, v: number) => GraphHiddenLinePoint3D | null;
  featureCurves?: GraphHiddenLineSurfaceFeatureCurve[];
}

export type GraphHiddenLineSourceData =
  | GraphHiddenLineMeshSourceData
  | GraphHiddenLinePolylineSetSourceData
  | GraphHiddenLineCurveSourceData
  | GraphHiddenLineSurfaceSourceData;

export type GraphHiddenLineOcclusionRole = 'occluder' | 'edge' | 'both';

export interface GraphHiddenLineSourceDescriptor<TData extends GraphHiddenLineSourceData = GraphHiddenLineSourceData> {
  id?: string;
  enabled?: boolean;
  debugLabel?: string;
  tags?: string[];
  role?: GraphHiddenLineOcclusionRole;
  style?: GraphHiddenLineStyleSpec;
  resolve: () => TData | null;
}

export interface GraphHiddenLineSourceRecord<TData extends GraphHiddenLineSourceData = GraphHiddenLineSourceData> {
  id: string;
  ownerId: string;
  /** 全局注册顺序，后注册的数值更大，作为遮挡排序优先级。 */
  order: number;
  descriptor: GraphHiddenLineSourceDescriptor<TData>;
}

export interface GraphHiddenLineSourceHandle {
  id: string;
  ownerId: string;
  dispose(): boolean;
}

export interface GraphHiddenLineSourceSummary {
  sourceId: string;
  ownerId: string;
  order?: number;
  kind: GraphHiddenLineSourceData['kind'];
  role: GraphHiddenLineOcclusionRole;
  debugLabel?: string;
  edgeCount: number;
  faceCount: number;
  tags: string[];
}

export interface GraphHiddenLineSceneSnapshot {
  revision: number;
  enabled: boolean;
  sourceCount: number;
  ownerCount: number;
  options: GraphHiddenLineOptions;
  sources: GraphHiddenLineSourceSummary[];
}
