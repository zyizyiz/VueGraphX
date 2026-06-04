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
 * 业务侧可观察的选中对象类型。
 */
export type GraphSelectionItemKind = 'shape' | 'runtime-object' | 'command' | 'relation';

/**
 * 选中状态变化的原因。
 */
export type GraphSelectionChangeReason = 'snapshot' | 'select' | 'deselect' | 'replace' | 'clear';

/**
 * 选中状态变化的来源。
 */
export type GraphSelectionChangeSource = 'pointer' | 'api' | 'scene-load' | 'delete' | 'clear';

/**
 * 业务侧可直接消费的选中对象描述。
 */
export interface GraphSelectionItem {
  /**
   * 当前选中对象的稳定 id。
   */
  id: string;

  /**
   * 选中对象所属的运行时类别。
   */
  kind: GraphSelectionItemKind;

  /**
   * shape 或业务实体类型。
   */
  entityType?: string;

  /**
   * renderer-neutral runtime object 类型。
   */
  objectType?: string;

  /**
   * 选中对象所属 command id；仅 command 生成的 runtime object 会提供。
   */
  commandId?: string;

  /**
   * 选中对象偏好的后端标识。
   */
  backendId?: string;

  /**
   * 图形作者或 runtime object 提供的业务数据。
   */
  entity?: unknown;

  /**
   * 与当前选中项相关的 UI 摆放和展示信息。
   */
  ui?: Record<string, unknown>;

  /**
   * 选中对象附带的浅层运行时元数据。
   */
  meta?: Record<string, unknown>;
}

/**
 * 对外推送的选中状态变化事件。
 */
export interface GraphSelectionChangeEvent {
  /**
   * 当前主选中对象；没有选中对象时为 null。
   */
  primary: GraphSelectionItem | null;

  /**
   * 当前全部选中对象。当前运行时允许多 runtime object 同时处于 selected 状态。
   */
  selected: GraphSelectionItem[];

  /**
   * 上一次推送时的选中对象列表。
   */
  previous: GraphSelectionItem[];

  /**
   * 选中状态变化原因。
   */
  reason: GraphSelectionChangeReason;

  /**
   * 触发变化的来源。
   */
  source: GraphSelectionChangeSource;

  /**
   * 单调递增的选中状态版本。
   */
  revision: number;
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

/**
 * 用于监听选中对象变化的回调。
 */
export type GraphSelectionListener = (event: GraphSelectionChangeEvent) => void;
