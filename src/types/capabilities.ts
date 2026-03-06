/**
 * 能力描述支持的交互形态。
 */
export type GraphCapabilityKind = 'action' | 'toggle' | 'input' | 'panel';

/**
 * 业务侧 UI 用于组织能力控件的高层分组。
 */
export type GraphCapabilityGroup =
  | 'create'
  | 'inspect'
  | 'edit'
  | 'annotate'
  | 'style'
  | 'animation'
  | 'danger';

/**
 * 可被外部 UI 直接渲染的能力描述对象。
 */
export interface GraphCapabilityDescriptor {
  /**
   * 能力唯一标识，通常也是 executeCapability 的入参。
   */
  id: string;

  /**
   * 能力语义分类，例如 resize、style、animation。
   */
  feature: string;

  /**
   * 建议直接展示给用户的标题。
   */
  label: string;

  /**
   * 当前能力所属的图形实体类型。
   */
  entityType: string;

  /**
   * 建议使用何种 UI 控件承载该能力。
   */
  kind: GraphCapabilityKind;

  /**
   * 建议在 UI 中归属的分组。
   */
  group: GraphCapabilityGroup;

  /**
   * 当前能力是否处于激活状态。
   */
  active?: boolean;

  /**
   * 当前能力是否允许执行。
   */
  enabled?: boolean;

  /**
   * 附加运行时参数，供业务侧 UI 自定义解释。
   */
  meta?: Record<string, unknown>;
}

/**
 * 当前选中图形实体的快照。
 */
export interface GraphSelectionSnapshot {
  /**
   * 当前选中实体的类型。
   */
  entityType: string;

  /**
   * 当前选中实体的唯一 id。
   */
  entityId: string;

  /**
   * 由图形作者定义的实体数据。
   */
  entity: unknown;

  /**
   * 与当前选中项相关的 UI 摆放和展示信息。
   */
  ui?: Record<string, unknown>;
}

/**
 * 引擎当前对外暴露的能力状态快照。
 */
export interface GraphCapabilitySnapshot {
  /**
   * 当前选中项；没有选中图形时为 null。
   */
  selection: GraphSelectionSnapshot | null;

  /**
   * 当前选中项可用的全部能力描述。
   */
  capabilities: GraphCapabilityDescriptor[];
}

/**
 * 用于监听选中项与能力变化的回调。
 */
export type GraphCapabilityListener = (snapshot: GraphCapabilitySnapshot) => void;