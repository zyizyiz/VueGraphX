import JXG from 'jsxgraph';

/**
 * 引擎对外暴露的画板模式。
 */
export type EngineMode = '2d' | '3d' | 'geometry';

/**
 * 公共引擎门面接受的 JSXGraph 画板配置。
 */
export interface GraphXOptions {
  /**
   * 初始视口范围，格式为 [left, top, right, bottom]。
   */
  boundingbox?: [number, number, number, number];

  /**
   * 是否显示坐标轴。
   */
  axis?: boolean;

  /**
   * 是否显示 JSXGraph 默认导航控件。
   */
  showNavigation?: boolean;

  /**
   * 是否保持横纵比例一致。
   */
  keepaspectratio?: boolean;

  /**
   * 是否显示 JSXGraph 默认版权信息。
   */
  showCopyright?: boolean;

  /**
   * JSXGraph 渲染器类型。
   */
  renderer?: 'svg' | 'canvas' | 'vml';

  /**
   * JSXGraph 拖拽 move 事件的监听目标。默认会在支持拖拽时使用 document。
   */
  moveTarget?: Document | HTMLElement | null;

  /**
   * JSXGraph 画板级拖拽开关。
   */
  drag?: {
    enabled?: boolean;
  };

  /**
   * JSXGraph 画板平移开关。双层区会关闭它，避免与图元自定义拖拽冲突。
   */
  pan?: {
    enabled?: boolean;
    needShift?: boolean;
    needTwoFingers?: boolean;
  };

  /**
   * 3D 视图的布局与属性配置。仅在 3D 画板模式下生效。
   */
  view3D?: {
    /**
     * view3d 的创建参数，格式为 [[left, bottom], [width, height], [[x1, x2], [y1, y2], [z1, z2]]]
     */
    rect?: [[number, number], [number, number], [[number, number], [number, number], [number, number]]];

    /**
     * 透传给 JSXGraph view3d 的属性。
     */
    attributes?: Record<string, any>;
  };
}

/**
 * VueGraphX 在 3D 模式下使用的最小 view3d 接口。
 */
export interface JXGView3D extends JXG.GeometryElement {
  /**
   * 在当前 3D 视图中创建一个 JSXGraph 3D 元素。
   */
  create: (type: string, parents: any[], attributes?: any) => JXG.GeometryElement;
}

/**
 * 通常透传给 JSXGraph 元素的通用样式选项。
 */
export interface BaseStyleOptions {
  /**
   * 元素名称或标签文本。
   */
  name?: string;

  /**
   * 是否显示标签。
   */
  withLabel?: boolean;

  /**
   * 描边颜色。
   */
  strokeColor?: string;

  /**
   * 描边宽度。
   */
  strokeWidth?: number;

  /**
   * 填充颜色。
   */
  fillColor?: string;

  /**
   * 填充透明度。
   */
  fillOpacity?: number;

  /**
   * 允许透传额外的 JSXGraph 属性。
   */
  [key: string]: any;
}
