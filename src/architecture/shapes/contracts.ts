import type { GraphXEngine } from '../../engine/GraphXEngine';
import type { EngineMode } from '../../types/engine';
import type { ShapeCapabilityTarget } from '../capabilities/contracts';

/**
 * 由图形定义创建出的运行时实例。
 */
export interface GraphShapeInstance {
  /**
   * 图形实例唯一 id。
   */
  id: string;

  /**
   * 图形实例所属的实体类型。
   */
  entityType: string;

  /**
   * 通知实例切换选中状态。
   */
  setSelected(selected: boolean): void;

  /**
   * 画板按下事件钩子。
   */
  onBoardDown?(e: any, isClickingObject: boolean): void;

  /**
   * 画板抬起事件钩子。
   */
  onBoardUp?(e: any, isClickingObject: boolean): void;

  /**
   * 画板更新事件钩子。
   */
  onBoardUpdate?(): void;

  /**
   * 返回当前实例对外暴露的能力目标；若未选中或无能力可返回 null。
   */
  getCapabilityTarget(): ShapeCapabilityTarget | null;

  /**
   * 销毁实例及其持有的 JSXGraph 资源。
   */
  destroy(): void;
}

/**
 * 受管图形分组中的单个成员。
 */
export interface GraphShapeGroupMember {
  /**
   * 成员自身的唯一 id。
   */
  id: string;

  /**
   * 成员在分组中的稳定 key。
   */
  key: string;

  /**
   * 原始 JSXGraph 对象引用。
   */
  object: any;
}

/**
 * 单个 JSXGraph 对象的拖拽钩子配置。
 */
export interface GraphShapeDragOptions {
  /**
   * 是否在拖拽开始时自动选中当前图形。
   */
  selectOnStart?: boolean;

  /**
   * 拖拽开始回调。
   */
  onStart?: (...args: any[]) => void;

  /**
   * 拖拽移动回调。
   */
  onMove?: (...args: any[]) => void;

  /**
   * 拖拽结束回调。
   */
  onEnd?: (...args: any[]) => void;
}

export interface GraphShapeGroupDragOptions {
  /**
   * 仅对指定 key 的成员启用拖拽。
   */
  keys?: string | string[];

  /**
   * 运行时过滤是否允许某个成员参与拖拽。
   */
  filter?: (member: GraphShapeGroupMember, ...args: any[]) => boolean;

  /**
   * 是否在拖拽开始时自动选中所属图形。
   */
  selectOnStart?: boolean;

  /**
   * 拖拽开始回调。
   */
  onStart?: (member: GraphShapeGroupMember, ...args: any[]) => void;

  /**
   * 拖拽移动回调。
   */
  onMove?: (member: GraphShapeGroupMember, ...args: any[]) => void;

  /**
   * 拖拽结束回调。
   */
  onEnd?: (member: GraphShapeGroupMember, ...args: any[]) => void;
}

/**
 * 以像素表示的屏幕坐标点。
 */
export interface GraphScreenPoint {
  /**
   * 水平方向像素坐标。
   */
  x: number;

  /**
   * 垂直方向像素坐标。
   */
  y: number;
}

/**
 * 当前画板视口尺寸，单位为像素。
 */
export interface GraphViewport {
  /**
   * 画板当前宽度。
   */
  width: number;

  /**
   * 画板当前高度。
   */
  height: number;
}

/**
 * 将悬浮 UI 限制在视口范围内时使用的边距。
 */
export interface GraphViewportPadding {
  /**
   * 左侧保留边距。
   */
  left?: number;

  /**
   * 右侧保留边距。
   */
  right?: number;

  /**
   * 顶部保留边距。
   */
  top?: number;

  /**
   * 底部保留边距。
   */
  bottom?: number;
}

/**
 * 控制点标注生成方式的配置。
 */
export interface GraphPointAnnotationOptions {
  /**
   * 自动分配标注文本时使用的字符序列。
   */
  alphabet?: string;

  /**
   * 应用于所有标注点的默认 JSXGraph 属性。
   */
  defaultAttributes?: Record<string, unknown>;
}

/**
 * 标注点支持的来源类型。
 */
export type GraphPointAnnotationSource =
  | {
      /**
       * 直接使用现有点对象作为标注来源。
       */
      kind: 'point';

      /**
       * 对应的点对象。
       */
      point: any;
    }
  | {
      /**
       * 使用多个元素的交点作为标注来源。
       */
      kind: 'intersection';

      /**
       * 参与求交的元素列表。
       */
      elements: any[];

      /**
       * 取第几个交点，默认为第一个。
       */
      index?: number;
    }
  | {
      /**
       * 使用两点中点作为标注来源。
       */
      kind: 'midpoint';

      /**
       * 构成中点的两端点。
       */
      points: [any, any];
    }
  | {
      /**
       * 使用一个惰性解析函数作为来源。
       */
      kind: 'computed';

      /**
       * 运行时返回目标点对象的函数。
       */
      resolve: () => any;
    };

/**
 * 由图形运行时管理的点标注声明式描述。
 */
export interface GraphPointAnnotationSpec {
  /**
   * 标注的稳定 key，用于复用与切换。
   */
  key: string;

  /**
   * 显示给用户的标注文本；未提供时可由运行时自动生成。
   */
  label?: string;

  /**
   * 标注点的来源描述。
   */
  source: GraphPointAnnotationSource;

  /**
   * 当前标注自身的 JSXGraph 属性。
   */
  attributes?: Record<string, unknown>;
}

/**
 * 动画轨道使用的缓动函数。
 */
export type GraphAnimationEasing = (progress: number) => number;

/**
 * 单次动画播放时的覆盖配置。
 */
export interface GraphAnimationPlaybackOptions {
  /**
   * 本次播放覆盖使用的持续时长，单位毫秒。
   */
  duration?: number;

  /**
   * 本次播放覆盖使用的缓动函数。
   */
  easing?: GraphAnimationEasing;
}

/**
 * 面向图形作者暴露的公共动画轨道 API。
 */
export interface GraphAnimationTrack {
  /**
   * 动画轨道唯一 id。
   */
  readonly id: string;

  /**
   * 展示给用户的轨道名称。
   */
  readonly label?: string;

  /**
   * 当前进度值。
   */
  readonly progress: number;

  /**
   * 当前是否正在播放。
   */
  readonly isAnimating: boolean;

  /**
   * 当前是否处于暂停状态。
   */
  readonly isPaused: boolean;

  /**
   * 是否循环播放。
   */
  readonly loop: boolean;

  /**
   * 是否启用往返播放。
   */
  readonly yoyo: boolean;

  /**
   * 最小进度值。
   */
  readonly min: number;

  /**
   * 最大进度值。
   */
  readonly max: number;

  /**
   * 推荐的进度步长。
   */
  readonly step: number;

  /**
   * 默认播放时长，单位毫秒。
   */
  readonly duration: number;

  /**
   * 播放到目标进度值。
   */
  playTo(target: number, options?: GraphAnimationPlaybackOptions): void;

  /**
   * 向最大值方向播放。
   */
  playForward(options?: GraphAnimationPlaybackOptions): void;

  /**
   * 向最小值方向播放。
   */
  playBackward(options?: GraphAnimationPlaybackOptions): void;

  /**
   * 暂停当前播放。
   */
  pause(): void;

  /**
   * 恢复已暂停的播放。
   */
  resume(): void;

  /**
   * 终止当前播放并停留在当前进度。
   */
  stop(): void;

  /**
   * 显式设置循环开关。
   */
  setLoop(enabled: boolean): void;

  /**
   * 切换循环开关。
   */
  toggleLoop(): void;

  /**
   * 显式设置往返播放开关。
   */
  setYoyo(enabled: boolean): void;

  /**
   * 切换往返播放开关。
   */
  toggleYoyo(): void;

  /**
   * 直接设置当前进度值。
   */
  setProgress(value: number): void;
}

/**
 * 创建动画轨道时使用的静态配置。
 */
export interface GraphAnimationTrackConfig {
  /**
   * 动画轨道唯一 id。
   */
  id: string;

  /**
   * 轨道名称。
   */
  label?: string;

  /**
   * 初始进度值。
   */
  initialProgress?: number;

  /**
   * 最小进度值。
   */
  min?: number;

  /**
   * 最大进度值。
   */
  max?: number;

  /**
   * 推荐步长。
   */
  step?: number;

  /**
   * 默认播放时长，单位毫秒。
   */
  duration?: number;

  /**
   * 是否默认开启循环。
   */
  loop?: boolean;

  /**
   * 是否默认开启往返播放。
   */
  yoyo?: boolean;

  /**
   * 默认缓动函数。
   */
  easing?: GraphAnimationEasing;

  /**
   * 每次进度变化时触发的回调。
   */
  onProgress?: (value: number, track: GraphAnimationTrack) => void;
}

/**
 * 屏幕坐标系下的包围盒。
 */
export interface GraphScreenBounds {
  /**
   * 左边界像素坐标。
   */
  left: number;

  /**
   * 右边界像素坐标。
   */
  right: number;

  /**
   * 上边界像素坐标。
   */
  top: number;

  /**
   * 下边界像素坐标。
   */
  bottom: number;

  /**
   * 包围盒宽度。
   */
  width: number;

  /**
   * 包围盒高度。
   */
  height: number;
}

/**
 * 用于根据投影包围盒定位悬浮 UI 的锚点位置。
 */
export type GraphScreenAnchor =
  | 'top-left'
  | 'top'
  | 'top-right'
  | 'left'
  | 'center'
  | 'right'
  | 'bottom-left'
  | 'bottom'
  | 'bottom-right';

/**
 * 基于现有对象创建受管分组时接受的输入。
 */
export type GraphShapeGroupInput = any[] | Record<string, any>;

/**
 * 分组级命中事件辅助方法的配置。
 */
export interface GraphShapeGroupHitOptions {
  /**
   * 限制命中检测只针对指定 key 的成员。
   */
  keys?: string | string[];

  /**
   * 自定义监听的事件名；未传时通常使用默认命中事件。
   */
  eventName?: string;

  /**
   * 运行时过滤某个成员是否应响应命中逻辑。
   */
  filter?: (member: GraphShapeGroupMember, ...args: any[]) => boolean;
}

/**
 * 对一个或多个 JSXGraph 对象的受管分组封装。
 */
export interface GraphShapeGroup {
  /**
   * 分组唯一 id。
   */
  id: string;

  /**
   * 当前分组包含的成员列表。
   */
  members: readonly GraphShapeGroupMember[];

  /**
   * 若启用原生 group，则为对应 JSXGraph group；否则为 null。
   */
  nativeGroup: any | null;

  /**
   * 返回指定 key 的成员。
   */
  getMember(key: string): GraphShapeGroupMember | null;

  /**
   * 返回指定 key 对应的原始对象。
   */
  getObject(key: string): any | null;

  /**
   * 判断分组中是否存在指定 key。
   */
  has(key: string): boolean;

  /**
   * 返回全部成员 key。
   */
  keys(): string[];

  /**
   * 基于部分 key 创建子分组视图。
   */
  pick(keys: string | string[]): GraphShapeGroup;

  /**
   * 遍历一个或多个成员。
   */
  forEach(callback: (member: GraphShapeGroupMember) => void, keys?: string | string[]): void;

  /**
   * 批量设置成员属性。
   */
  setAttribute(attributes: Record<string, unknown>, keys?: string | string[]): void;

  /**
   * 批量控制成员可见性。
   */
  setVisible(visible: boolean, keys?: string | string[]): void;

  /**
   * 显示指定成员。
   */
  show(keys?: string | string[]): void;

  /**
   * 隐藏指定成员。
   */
  hide(keys?: string | string[]): void;

  /**
   * 绑定成员事件并返回解绑函数。
   */
  on(eventName: string, handler: (member: GraphShapeGroupMember, ...args: any[]) => void, keys?: string | string[]): () => void;

  /**
   * 绑定命中事件辅助逻辑并返回解绑函数。
   */
  onHit(handler: (member: GraphShapeGroupMember, ...args: any[]) => void, options?: GraphShapeGroupHitOptions): () => void;

  /**
   * 绑定命中即选中的交互。
   */
  bindSelectOnHit(options?: GraphShapeGroupHitOptions): () => void;

  /**
   * 为一个或多个成员绑定拖拽交互。
   */
  bindDrag(options?: GraphShapeGroupDragOptions): () => void;

  /**
   * 解绑指定事件；未传 eventName 时解绑全部。
   */
  off(eventName?: string, keys?: string | string[]): void;
}

/**
 * 创建图形实例时传给图形定义的上下文对象。
 */
export interface GraphShapeContext {
  /**
   * 当前图形所属的引擎实例。
   */
  engine: GraphXEngine;

  /**
   * 当前使用的底层画板对象。
   */
  board: any;

  /**
   * 切换当前选中图形。
   */
  selectShape(shapeId: string | null): void;

  /**
   * 判断某个图形当前是否处于选中态。
   */
  isShapeSelected(shapeId: string): boolean;

  /**
   * 将新的图形实例加入当前引擎。
   */
  addShape(instance: GraphShapeInstance): void;

  /**
   * 从当前引擎中移除某个图形实例。
   */
  removeShape(shapeId: string): void;

  /**
   * 通知外部 UI 重新计算能力状态。
   */
  notifyChange(): void;

  /**
   * 生成一个带前缀的唯一 id。
   */
  generateId(prefix: string): string;

  /**
   * 将原生事件转换为用户坐标。
   */
  getUsrCoordFromEvent(event: any): [number, number] | null;

  /**
   * 返回当前视口尺寸。
   */
  getViewport(): GraphViewport;

  /**
   * 将二维用户坐标点投影为屏幕点。
   */
  projectUserPoint(point: [number, number]): GraphScreenPoint | null;

  /**
   * 将三维点投影为屏幕点。
   */
  projectPoint3D(point: [number, number, number]): GraphScreenPoint | null;

  /**
   * 将二维点集投影为屏幕包围盒。
   */
  projectUserBounds(points: Array<[number, number]>): GraphScreenBounds | null;

  /**
   * 将三维点集投影为屏幕包围盒。
   */
  project3DBounds(points: Array<[number, number, number]>): GraphScreenBounds | null;

  /**
   * 从屏幕包围盒中解析锚点坐标。
   */
  getBoundsAnchor(bounds: GraphScreenBounds, anchor?: GraphScreenAnchor): GraphScreenPoint;

  /**
   * 将屏幕点限制在视口边界之内。
   */
  clampScreenPoint(point: GraphScreenPoint, padding?: GraphViewportPadding): GraphScreenPoint;
}

/**
 * 注册到引擎中、用于创建某类图形的公共定义。
 */
export interface GraphShapeDefinition {
  /**
   * 图形类型名，也是 createShape 时使用的 entityType。
   */
  type: string;

  /**
   * 该图形定义允许出现的模式；传 all 表示所有模式均可使用。
   */
  supportedModes: EngineMode | EngineMode[] | 'all';

  /**
   * 基于上下文和负载创建图形实例。
   */
  createShape(context: GraphShapeContext, payload?: unknown): GraphShapeInstance | null;

  /**
   * 可选的拖拽创建入口；返回 null 表示当前定义不处理该事件。
   */
  createFromDrop?(context: GraphShapeContext, event: DragEvent): GraphShapeInstance | null;
}
