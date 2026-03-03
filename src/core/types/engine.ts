import JXG from 'jsxgraph';

export type EngineMode = '2d' | '3d' | 'geometry';

export interface GraphXOptions {
  boundingbox?: [number, number, number, number];
  axis?: boolean;
  showNavigation?: boolean;
  keepaspectratio?: boolean;
  showCopyright?: boolean;
}

export interface JXGView3D extends JXG.GeometryElement {
  create: (type: string, parents: any[], attributes?: any) => JXG.GeometryElement;
}

export interface BaseStyleOptions {
  name?: string;
  withLabel?: boolean;
  strokeColor?: string;
  strokeWidth?: number;
  fillColor?: string;
  fillOpacity?: number;
  [key: string]: any;
}
