/**
 * 可进入或退出检查态的能力契约。
 */
export interface InspectCapabilityContract {
  /**
   * 当前是否处于检查态。
   */
  active: boolean;

  /**
   * 显式切换检查态开关。
   */
  setActive: (active: boolean) => void;
}

/**
 * 暴露数值型缩放或尺寸控制的能力契约。
 */
export interface ResizeCapabilityContract {
  /**
   * 当前 resize 面板或交互是否处于激活态。
   */
  active: boolean;

  /**
   * 当前尺寸或缩放值。
   */
  value: number;

  /**
   * 允许的最小值。
   */
  min?: number;

  /**
   * 允许的最大值。
   */
  max?: number;

  /**
   * 建议 UI 使用的调节步长。
   */
  step?: number;

  /**
   * 切换 resize 交互开关。
   */
  toggle: () => void;

  /**
   * 显式设置数值。
   */
  setValue: (value: number) => void;
}

/**
 * 仅暴露开关状态的简单能力契约。
 */
export interface ToggleCapabilityContract {
  /**
   * 当前开关状态。
   */
  active: boolean;

  /**
   * 切换开关状态。
   */
  toggle: () => void;
}

/**
 * 样式面板入口能力契约。
 */
export interface StylePanelCapabilityContract {
  /**
   * 样式面板当前是否打开。
   */
  active: boolean;

  /**
   * 当前选中的颜色。
   */
  selectedColor: string;

  /**
   * 切换样式面板显隐状态。
   */
  toggle: () => void;
}

/**
 * 面向单个描边或填充颜色入口的能力契约。
 */
export interface ColorStyleCapabilityContract {
  /**
   * 当前颜色选择能力是否处于激活态。
   */
  active: boolean;

  /**
   * 当前选中的颜色。
   */
  selectedColor: string;

  /**
   * 激活颜色选择流程。
   */
  activate: () => void;

  /**
   * 应用新的颜色值。
   */
  applyColor: (color: string) => void;
}

/**
 * 两阶段拆分流程的能力契约。
 */
export interface SplitCapabilityContract {
  /**
   * 当前拆分流程是否已进入编辑态。
   */
  active: boolean;

  /**
   * 当前是否已存在待确认的草稿结果。
   */
  hasDraft: boolean;

  /**
   * 当前草稿是否满足确认条件。
   */
  canConfirm: boolean;

  /**
   * 切换拆分流程开关。
   */
  toggle: () => void;

  /**
   * 取消当前拆分流程或草稿。
   */
  cancel: () => void;

  /**
   * 确认当前拆分草稿。
   */
  confirm: () => void;
}

/**
 * 单条动画轨道在运行时暴露的能力契约。
 */
export interface AnimationCapabilityContract {
  /**
   * 动画轨道 id。
   */
  id: string;

  /**
   * 轨道显示名称。
   */
  label?: string;

  /**
   * 当前是否正在播放。
   */
  isAnimating: boolean;

  /**
   * 当前是否已暂停。
   */
  isPaused: boolean;

  /**
   * 是否开启循环播放。
   */
  loop: boolean;

  /**
   * 是否开启往返播放。
   */
  yoyo: boolean;

  /**
   * 当前播放进度。
   */
  progress: number;

  /**
   * 允许的最小进度值。
   */
  min?: number;

  /**
   * 允许的最大进度值。
   */
  max?: number;

  /**
   * 建议 UI 使用的步长。
   */
  step?: number;

  /**
   * 向最大值方向播放。
   */
  playForward: () => void;

  /**
   * 向最小值方向播放。
   */
  playBackward: () => void;

  /**
   * 暂停当前播放。
   */
  pause: () => void;

  /**
   * 恢复暂停中的播放。
   */
  resume: () => void;

  /**
   * 停止播放并停留在当前进度。
   */
  stop: () => void;

  /**
   * 显式设置循环开关。
   */
  setLoop: (enabled: boolean) => void;

  /**
   * 切换循环开关。
   */
  toggleLoop: () => void;

  /**
   * 显式设置往返播放开关。
   */
  setYoyo: (enabled: boolean) => void;

  /**
   * 切换往返播放开关。
   */
  toggleYoyo: () => void;

  /**
   * 直接跳转到指定进度。
   */
  setProgress: (value: number) => void;
}

/**
 * 单个图形暴露的一组动画轨道能力契约。
 */
export interface AnimationCollectionCapabilityContract {
  /**
   * 默认主轨道 id；业务侧未指定轨道时通常使用它。
   */
  primaryTrackId?: string;

  /**
   * 以轨道 id 为 key 的动画能力映射。
   */
  tracks: Record<string, AnimationCapabilityContract>;
}

/**
 * 选中图形实例返回的标准化能力表面。
 */
export interface ShapeCapabilityTarget {
  /**
   * 实体类型。
   */
  entityType: string;

  /**
   * 实体唯一 id。
   */
  entityId: string;

  /**
   * 图形作者提供的实体数据。
   */
  entity: unknown;

  /**
   * 与外部 UI 摆放、样式或展示有关的附加信息。
   */
  ui?: Record<string, unknown>;

  /**
   * 检查能力。
   */
  inspect?: InspectCapabilityContract;

  /**
   * resize 或数值编辑能力。
   */
  resize?: ResizeCapabilityContract;

  /**
   * 辅助线开关能力。
   */
  auxiliaryLine?: ToggleCapabilityContract;

  /**
   * 投影开关能力。
   */
  projection?: ToggleCapabilityContract;

  /**
   * 标注开关能力。
   */
  annotation?: ToggleCapabilityContract;

  /**
   * 拆分能力。
   */
  split?: SplitCapabilityContract;

  /**
   * 样式面板入口能力。
   */
  stylePanel?: StylePanelCapabilityContract;

  /**
   * 描边颜色能力。
   */
  strokeStyle?: ColorStyleCapabilityContract;

  /**
   * 填充颜色能力。
   */
  fillStyle?: ColorStyleCapabilityContract;

  /**
   * 向后兼容的单轨动画能力别名。
   */
  animation?: AnimationCapabilityContract;

  /**
   * 多轨动画能力集合。
   */
  animations?: AnimationCollectionCapabilityContract;

  /**
   * 删除当前实体的入口。
   */
  remove?: () => void;
}
