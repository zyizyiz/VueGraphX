import JXG from 'jsxgraph';

export type EngineMode = '2d' | '3d' | 'geometry';

export interface GraphXOptions {
  boundingbox?: [number, number, number, number];
  axis?: boolean;
  showNavigation?: boolean;
  keepaspectratio?: boolean;
  showCopyright?: boolean;
}

// 补全 JSXGraph 中缺失的 View3D 扩展接口声明，彻底消灭 Any
export interface JXGView3D extends JXG.GeometryElement {
  create: (type: string, parents: any[], attributes?: any) => JXG.GeometryElement;
}

// 基础绘图属性配置
export interface BaseStyleOptions {
  name?: string;
  withLabel?: boolean;
  strokeColor?: string;
  strokeWidth?: number;
  fillColor?: string;
  fillOpacity?: number;
  [key: string]: any;
}
