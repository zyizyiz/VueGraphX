/**
 * 2D 平面点。
 */
export interface GraphSolidPoint2D {
  x: number;
  y: number;
}

/**
 * 3D 空间点。
 */
export interface GraphSolidPoint3D extends GraphSolidPoint2D {
  z: number;
}

/**
 * 3D 向量。
 */
export interface GraphSolidVector3D {
  x: number;
  y: number;
  z: number;
}

/**
 * 统一的面片语义类型。
 */
export type GraphSolidPatchKind = 'polygon' | 'band' | 'disk' | 'sector';

/**
 * 统一的视图模式。
 */
export type GraphSolidViewMode = 'projected' | 'net' | 'hybrid';

/**
 * 多边形面在折叠态下的 3D 几何。
 */
export interface GraphSolidPolygonFoldedGeometry {
  vertices: GraphSolidPoint3D[];
  edgeIds?: string[];
}

/**
 * 多边形面在展开态下的 2D 几何。
 */
export interface GraphSolidPolygonNetGeometry {
  vertices: GraphSolidPoint2D[];
  edgeIds?: string[];
}

/**
 * 圆柱类侧面在折叠态下的带状曲面描述。
 */
export interface GraphSolidBandFoldedGeometry {
  topCenter: GraphSolidPoint3D;
  bottomCenter: GraphSolidPoint3D;
  radius: number;
  height: number;
  startAngle: number;
  sweepAngle: number;
  segments: number;
}

/**
 * 带状曲面在展开态下的 2D 轮廓。
 */
export interface GraphSolidBandNetGeometry {
  outline: GraphSolidPoint2D[];
  width: number;
  height: number;
  edgeIds?: string[];
}

/**
 * 圆盘面在折叠态下的 3D 描述。
 */
export interface GraphSolidDiskFoldedGeometry {
  center: GraphSolidPoint3D;
  normal: GraphSolidVector3D;
  radius: number;
  segments: number;
}

/**
 * 圆盘面在展开态下的 2D 描述。
 */
export interface GraphSolidDiskNetGeometry {
  center: GraphSolidPoint2D;
  radius: number;
  segments: number;
}

/**
 * 圆锥类侧面在折叠态下的曲面描述。
 */
export interface GraphSolidSectorFoldedGeometry {
  apex: GraphSolidPoint3D;
  baseCenter: GraphSolidPoint3D;
  axis: GraphSolidVector3D;
  baseRadius: number;
  slantHeight: number;
  segments: number;
}

/**
 * 扇形面在展开态下的 2D 描述。
 */
export interface GraphSolidSectorNetGeometry {
  center: GraphSolidPoint2D;
  radius: number;
  startAngle: number;
  sweepAngle: number;
  segments: number;
}

/**
 * 面片可选样式信息。
 */
export interface GraphSolidPatchStyle {
  fillColor?: string;
  fillOpacity?: number;
  strokeColor?: string;
  strokeWidth?: number;
}

interface GraphSolidPatchBase<TKind extends GraphSolidPatchKind, TFolded, TNet> {
  id: string;
  kind: TKind;
  label?: string;
  folded: TFolded;
  net: TNet;
  style?: GraphSolidPatchStyle;
}

export interface GraphSolidPolygonPatch
  extends GraphSolidPatchBase<'polygon', GraphSolidPolygonFoldedGeometry, GraphSolidPolygonNetGeometry> {}

export interface GraphSolidBandPatch
  extends GraphSolidPatchBase<'band', GraphSolidBandFoldedGeometry, GraphSolidBandNetGeometry> {}

export interface GraphSolidDiskPatch
  extends GraphSolidPatchBase<'disk', GraphSolidDiskFoldedGeometry, GraphSolidDiskNetGeometry> {}

export interface GraphSolidSectorPatch
  extends GraphSolidPatchBase<'sector', GraphSolidSectorFoldedGeometry, GraphSolidSectorNetGeometry> {}

/**
 * 所有支持的面片联合类型。
 */
export type GraphSolidPatch =
  | GraphSolidPolygonPatch
  | GraphSolidBandPatch
  | GraphSolidDiskPatch
  | GraphSolidSectorPatch;

/**
 * 面片间的铰链关系，用于驱动真实转开和净图布局。
 */
export interface GraphSolidHinge {
  id: string;
  parentPatchId: string;
  childPatchId: string;
  parentEdgeId: string;
  childEdgeId: string;
  foldedAngle: number;
  unfoldedAngle: number;
  direction?: 1 | -1;
}

/**
 * 一个可展开实体的拓扑描述。
 */
export interface GraphSolidTopology {
  rootPatchId: string;
  patches: GraphSolidPatch[];
  hinges: GraphSolidHinge[];
  metadata?: Record<string, unknown>;
}

/**
 * 驱动立体投影、展开和爆炸图的统一状态。
 */
export interface GraphSolidState {
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  unfoldProgress: number;
  explodeProgress: number;
  viewMode: GraphSolidViewMode;
}

/**
 * 通用可展开实体定义。
 */
export interface GraphSolidDefinition<Parameters = unknown> {
  type: string;
  label?: string;
  createTopology(parameters: Parameters): GraphSolidTopology;
  createState?(overrides?: Partial<GraphSolidState>): GraphSolidState;
}
