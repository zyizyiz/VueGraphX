import JXG from 'jsxgraph';
import type { GraphHiddenLineOptions } from '../rendering/hiddenLine/contracts';
import type { GraphRelationAssistOptions } from '../relation/contracts';

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
   * JSXGraph 画板缩放开关。支持鼠标滚轮和触摸双指 pinch。
   */
  zoom?: {
    /**
     * 是否启用缩放。
     */
    enabled?: boolean;

    /**
     * 是否允许鼠标滚轮缩放。
     */
    wheel?: boolean;

    /**
     * 鼠标滚轮缩放是否需要按住 Shift。
     */
    needShift?: boolean;

    /**
     * 是否允许触摸设备双指 pinch 缩放。
     */
    pinch?: boolean;

    /**
     * 在 keepaspectratio=false 时，是否允许水平 pinch 缩放。
     */
    pinchHorizontal?: boolean;

    /**
     * 在 keepaspectratio=false 时，是否允许垂直 pinch 缩放。
     */
    pinchVertical?: boolean;

    /**
     * pinch 手势识别灵敏度（角度阈值）。
     */
    pinchSensitivity?: number;

    /**
     * 水平缩放因子。
     */
    factorX?: number;

    /**
     * 垂直缩放因子。
     */
    factorY?: number;

    /**
     * 缩放中心。`auto` 为指针/双指中点，`board` 为画板中心。
     */
    center?: 'auto' | 'board';

    /**
     * 最小缩放值。
     */
    min?: number;

    /**
     * 最大缩放值。
     */
    max?: number;
  };

  /**
   * 关系辅助拖拽配置。当前主要用于 geometry 模式下的平行吸附阈值。
   */
  relationAssist?: GraphRelationAssistOptions;

  /**
   * 3D 视图的布局与属性配置。仅在 3D 画板模式下生效。
   */
  view3D?: {
    /**
     * 是否让 3D 视窗自动铺满当前 board 的真实可视区域，并跟随 resize 同步更新。
     */
    fitToBoard?: boolean;

    /**
     * view3d 的创建参数，格式为 [[left, bottom], [width, height], [[x1, x2], [y1, y2], [z1, z2]]]
     */
    rect?: [[number, number], [number, number], [[number, number], [number, number], [number, number]]];

    /**
     * 透传给 JSXGraph view3d 的属性。
     */
    attributes?: Record<string, any>;

    /**
     * 3D 隐线/遮挡虚线渲染配置。
     */
    hiddenLine?: GraphHiddenLineOptions;
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
  llftCorner: [number, number];
  size: [number, number];
  bbox3D: [[number, number], [number, number], [number, number]];
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
