export interface GraphHiddenLinePoint3D {
  x: number;
  y: number;
  z: number;
}

export interface GraphHiddenLineFace {
  id?: string;
  indices: number[];
}

export type GraphHiddenLineBaseVisibility = 'visible' | 'hidden' | 'auto';

export interface GraphHiddenLinePolyline {
  id?: string;
  points: GraphHiddenLinePoint3D[];
  closed?: boolean;
  ignoreOwnerOcclusion?: boolean;
  sampleVisibility?: (point: GraphHiddenLinePoint3D) => GraphHiddenLineBaseVisibility | null | undefined;
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

export interface GraphHiddenLineNativeTargetSpec {
  getElement: () => SVGElement | null;
  strokeWidth?: number;
}

export interface GraphHiddenLineOverlayBehavior {
  renderVisible?: boolean;
  renderHidden?: boolean;
  clipNativeVisible?: boolean;
}

export interface GraphHiddenLineSamplingOptions {
  curveSegments?: number;
  surfaceStepsU?: number;
  surfaceStepsV?: number;
  adaptive?: boolean;
  maxSubdivisions?: number;
}

export type GraphHiddenLineProfile = 'performance' | 'balanced' | 'quality';

export interface GraphHiddenLineOptions {
  enabled?: boolean;
  profile?: GraphHiddenLineProfile;
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
  ignoreOwnerOcclusion?: boolean;
  sampleVisibility?: (point: GraphHiddenLinePoint3D) => GraphHiddenLineBaseVisibility | null | undefined;
  evaluate: (t: number) => GraphHiddenLinePoint3D | null;
}

export interface GraphHiddenLineSurfaceFeatureCurve {
  id?: string;
  range: [number, number];
  steps?: number;
  closed?: boolean;
  ignoreOwnerOcclusion?: boolean;
  sampleVisibility?: (point: GraphHiddenLinePoint3D) => GraphHiddenLineBaseVisibility | null | undefined;
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
  overlay?: GraphHiddenLineOverlayBehavior;
  nativeTargets?: Record<string, GraphHiddenLineNativeTargetSpec | (() => SVGElement | null)>;
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

export type GraphHiddenLineDiagnosticSeverity = 'info' | 'warning' | 'error';

export interface GraphHiddenLineDiagnostic {
  code: string;
  severity: GraphHiddenLineDiagnosticSeverity;
  message: string;
  sourceId?: string;
  ownerId?: string;
  debugLabel?: string;
}

export interface GraphHiddenLineSceneStats {
  activeSourceCount: number;
  resolvedSourceCount: number;
  skippedSourceCount: number;
  disabledSourceCount: number;
  emptySourceCount: number;
  errorSourceCount: number;
  triangleCount: number;
  polylineCount: number;
  renderedPathCount: number;
}

export interface GraphHiddenLineSceneSnapshot {
  revision: number;
  enabled: boolean;
  sourceCount: number;
  ownerCount: number;
  options: GraphHiddenLineOptions;
  stats: GraphHiddenLineSceneStats;
  diagnostics: GraphHiddenLineDiagnostic[];
  sources: GraphHiddenLineSourceSummary[];
}
