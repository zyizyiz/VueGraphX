import type {
  AnimationCapabilityContract,
  AnimationCollectionCapabilityContract,
  ShapeCapabilityTarget
} from '../capabilities/contracts';
import type {
  GraphAnimationTrack,
  GraphAnimationTrackConfig,
  GraphShapeDragOptions,
  GraphPointAnnotationOptions,
  GraphPointAnnotationSpec,
  GraphScreenAnchor,
  GraphScreenBounds,
  GraphScreenPoint,
  GraphShapeContext,
  GraphShapeDefinition,
  GraphShapeGroup,
  GraphShapeGroupInput,
  GraphShapeInstance,
  GraphViewport,
  GraphViewportPadding
} from './contracts';
import { BaseShapeInstance } from './internal/BaseShapeInstance';

/**
 * 在组合式图形实例内部提供给作者使用的高层 API。
 */
export interface GraphShapeApi<StateType> {
  /**
   * 当前图形实例 id。
   */
  readonly id: string;

  /**
   * 当前图形实例的实体类型。
   */
  readonly entityType: string;

  /**
   * 当前图形的可变状态对象。
   */
  readonly state: StateType;

  /**
   * 当前图形是否被选中。
   */
  readonly selected: boolean;

  /**
   * 当前图形关联的上下文对象。
   */
  readonly context: GraphShapeContext;

  /**
   * 当前图形所属的引擎实例。
   */
  readonly engine: GraphShapeContext['engine'];

  /**
   * 当前底层画板对象。
   */
  readonly board: GraphShapeContext['board'];

  /**
   * 返回当前画板视口尺寸。
   */
  getViewport(): GraphViewport;

  /**
   * 将二维用户坐标投影到屏幕坐标系。
   */
  projectUserPoint(point: [number, number]): GraphScreenPoint | null;

  /**
   * 将三维点投影到屏幕坐标系。
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
   * 从包围盒中解析一个屏幕锚点。
   */
  getBoundsAnchor(bounds: GraphScreenBounds, anchor?: GraphScreenAnchor): GraphScreenPoint;

  /** 创建一条交由引擎统一调度的动画轨道。适合把图形几何变化和播放控制拆开，让外部 UI 通过能力接口驱动它。 */
  createAnimationTrack(config: GraphAnimationTrackConfig): GraphAnimationTrack;

  /**
   * 根据 id 获取动画轨道。
   */
  getAnimationTrack(id: string): GraphAnimationTrack | null;

  /**
   * 返回当前图形持有的全部动画轨道。
   */
  getAnimationTracks(): GraphAnimationTrack[];

  /**
   * 移除指定动画轨道。
   */
  removeAnimationTrack(id: string): void;

  /**
   * 判断当前图形是否已有点标注。
   */
  hasPointAnnotations(): boolean;

  /** 切换一组点标注的显示状态。返回 true 表示当前调用后处于显示态，false 表示当前调用后处于隐藏态。 */
  togglePointAnnotations(specs: GraphPointAnnotationSpec[], options?: GraphPointAnnotationOptions): boolean;

  /**
   * 清空当前图形上的全部点标注。
   */
  clearPointAnnotations(): void;

  /**
   * 将屏幕点限制在视口边界内。
   */
  clampScreenPoint(point: GraphScreenPoint, padding?: GraphViewportPadding): GraphScreenPoint;

  /**
   * 延迟通知外部 UI 更新，适合高频交互场景。
   */
  scheduleUiChange(): void;

  /**
   * 合并更新当前图形状态。
   */
  setState(partialState: Partial<StateType>): void;

  /**
   * 立即通知外部能力/UI 状态刷新。
   */
  notifyChange(): void;

  /**
   * 记录一个对象，便于实例销毁时自动清理。
   */
  trackObject<T>(objectRef: T): T;

  /**
   * 为目标对象绑定拖拽逻辑，并返回解绑函数。
   */
  bindDrag(target: any, options?: GraphShapeDragOptions): () => void;

  /** 从多个对象创建受管分组。受管分组会统一提供命中、拖拽、可见性和属性批量控制能力。 */
  createGroup(groupInput: GraphShapeGroupInput, options?: { id?: string; createNativeGroup?: boolean }): GraphShapeGroup;

  /**
   * 移除一个已创建的受管分组。
   */
  removeGroup(group: GraphShapeGroup): void;

  /**
   * 选中当前图形。
   */
  select(): void;

  /**
   * 取消选中当前图形。
   */
  deselect(): void;

  /**
   * 从引擎中移除当前图形。
   */
  remove(): void;

  /**
   * 将子图形实例挂到当前引擎中。
   */
  addShape(instance: GraphShapeInstance): void;

  /** 基于组合对象直接创建一个子图形实例。适合复杂图形内部继续拆出子图形，而不必重新走 registerShape 流程。 */
  createShape<ChildState>(composition: GraphShapeComposition<ChildState>): GraphShapeInstance;

  /**
   * 将事件转换为用户坐标。
   */
  getUsrCoordFromEvent(event: any): [number, number] | null;

  /**
   * 安全移除一个 JSXGraph 对象。
   */
  removeObjectSafe(objectRef: any): void;

  /**
   * 生成带前缀的唯一 id。
   */
  uid(prefix?: string): string;

  /**
   * 直接将屏幕坐标转换为简单对象形式。
   */
  toScreenCoordinates(x: number, y: number): { x: number; y: number } | null;
}

/**
 * 用于实现单个图形实例的运行时组合对象。
 */
export interface GraphShapeComposition<StateType> {
  /**
   * 可选的固定实例 id；未提供时由运行时自动生成。
   */
  id?: string;

  /**
   * 当前组合实例的实体类型。
   */
  entityType: string;

  /**
   * 图形实例初始化时使用的状态。
   */
  initialState: StateType;

  /** 初始化钩子，适合创建对象和绑定事件，通常也是创建 animation track、group 和 annotation spec 的位置。 */
  setup?(api: GraphShapeApi<StateType>): void;

  /** 返回当前实例对外暴露的能力目标。未选中或当前没有需要暴露的能力时可以返回 null。 */
  getCapabilityTarget(api: GraphShapeApi<StateType>): ShapeCapabilityTarget | null;

  /** 选中状态变化钩子，适合在这里切换高亮、辅助点或悬浮 UI。 */
  onSelectionChange?(api: GraphShapeApi<StateType>, selected: boolean): void;

  /**
   * 画板按下事件钩子。
   */
  onBoardDown?(api: GraphShapeApi<StateType>, event: any, isClickingObject: boolean): void;

  /**
   * 画板抬起事件钩子。
   */
  onBoardUp?(api: GraphShapeApi<StateType>, event: any, isClickingObject: boolean): void;

  /**
   * 画板更新事件钩子。
   */
  onBoardUpdate?(api: GraphShapeApi<StateType>): void;

  /**
   * 销毁前钩子，适合释放组合自身资源。
   */
  onDestroy?(api: GraphShapeApi<StateType>): void;
}

/**
 * 将输入负载转换为组合对象的图形定义辅助接口。
 */
export interface GraphShapeDefinitionComposition<Payload = unknown, StateType = unknown> {
  /**
   * 图形类型名。
   */
  type: string;

  /**
   * 支持的引擎模式。
   */
  supportedModes: GraphShapeDefinition['supportedModes'];

  /** 将上下文和负载转换为组合对象。返回 null 表示当前负载不合法或当前定义决定不创建实例。 */
  create(context: GraphShapeContext, payload?: Payload): GraphShapeComposition<StateType> | null;

  /** 可选的拖拽创建入口。返回 null 表示本次拖拽事件不由当前定义处理。 */
  createFromDrop?(context: GraphShapeContext, event: DragEvent): GraphShapeComposition<StateType> | null;
}

/**
 * 同时包含主动画别名与多轨动画集合的能力对象。
 */
export interface GraphAnimationCapabilityTarget {
  /** 向后兼容的主动画轨道别名。当业务侧只关心单轨动画时可以直接消费这个字段。 */
  animation: AnimationCapabilityContract;

  /** 完整的多轨动画集合。当图形同时暴露多条轨道时，业务侧应优先读取这里。 */
  animations: AnimationCollectionCapabilityContract;
}

class ComposedShapeInstance<StateType> extends BaseShapeInstance<StateType> {
  public readonly id: string;
  public readonly entityType: string;

  private readonly composition: GraphShapeComposition<StateType>;
  private readonly api: GraphShapeApi<StateType>;

  constructor(context: GraphShapeContext, composition: GraphShapeComposition<StateType>) {
    super(context, composition.initialState);
    this.composition = composition;
    this.id = composition.id ?? context.generateId(composition.entityType);
    this.entityType = composition.entityType;
    this.api = this.createApi();
    this.composition.setup?.(this.api);
  }

  public override onBoardDown(event: any, isClickingObject: boolean): void {
    this.composition.onBoardDown?.(this.api, event, isClickingObject);
  }

  public override onBoardUp(event: any, isClickingObject: boolean): void {
    this.composition.onBoardUp?.(this.api, event, isClickingObject);
  }

  public override onBoardUpdate(): void {
    this.composition.onBoardUpdate?.(this.api);
  }

  public getCapabilityTarget(): ShapeCapabilityTarget | null {
    return this.composition.getCapabilityTarget(this.api);
  }

  public override destroy(): void {
    this.composition.onDestroy?.(this.api);
    super.destroy();
  }

  protected override onSelectionChange(selected: boolean): void {
    this.composition.onSelectionChange?.(this.api, selected);
  }

  private createApi(): GraphShapeApi<StateType> {
    const thisRef = this;

    return {
      get id() {
        return thisRef.id;
      },
      get entityType() {
        return thisRef.entityType;
      },
      get state() {
        return thisRef.state;
      },
      get selected() {
        return thisRef.selected;
      },
      get context() {
        return thisRef.context;
      },
      get engine() {
        return thisRef.engine;
      },
      get board() {
        return thisRef.board;
      },
      getViewport() {
        return thisRef.context.getViewport();
      },
      projectUserPoint(point) {
        return thisRef.context.projectUserPoint(point);
      },
      projectPoint3D(point) {
        return thisRef.context.projectPoint3D(point);
      },
      projectUserBounds(points) {
        return thisRef.context.projectUserBounds(points);
      },
      project3DBounds(points) {
        return thisRef.context.project3DBounds(points);
      },
      getBoundsAnchor(bounds, anchor) {
        return thisRef.context.getBoundsAnchor(bounds, anchor);
      },
      createAnimationTrack(config) {
        return thisRef.createAnimationTrack(config);
      },
      getAnimationTrack(id) {
        return thisRef.getAnimationTrack(id);
      },
      getAnimationTracks() {
        return thisRef.getAnimationTracks();
      },
      removeAnimationTrack(id) {
        thisRef.removeAnimationTrack(id);
      },
      hasPointAnnotations() {
        return thisRef.hasPointAnnotations();
      },
      togglePointAnnotations(specs, options) {
        return thisRef.togglePointAnnotations(specs, options);
      },
      clearPointAnnotations() {
        thisRef.clearPointAnnotations();
      },
      clampScreenPoint(point, padding) {
        return thisRef.context.clampScreenPoint(point, padding);
      },
      scheduleUiChange() {
        thisRef.scheduleUiChange();
      },
      setState(partialState) {
        thisRef.setState(partialState);
      },
      notifyChange() {
        thisRef.notifyStateChange();
      },
      trackObject(objectRef) {
        return thisRef.trackObject(objectRef);
      },
      bindDrag(target, options) {
        return thisRef.bindDrag(target, options);
      },
      createGroup(objectRefs, options) {
        return thisRef.createGroup(objectRefs, options);
      },
      removeGroup(group) {
        thisRef.removeGroup(group);
      },
      select() {
        thisRef.selectSelf();
      },
      deselect() {
        thisRef.deselectSelf();
      },
      remove() {
        thisRef.removeSelf();
      },
      addShape(instance) {
        thisRef.addShape(instance);
      },
      createShape(composition) {
        return createComposedShape(thisRef.context, composition);
      },
      getUsrCoordFromEvent(event) {
        return thisRef.getUsrCoordFromEvent(event);
      },
      removeObjectSafe(objectRef) {
        thisRef.removeObjectSafe(objectRef);
      },
      uid(prefix) {
        return thisRef.uid(prefix);
      },
      toScreenCoordinates(x, y) {
        return thisRef.toScreenCoordinates(x, y);
      }
    };
  }
}

export const createComposedShape = <StateType>(
  context: GraphShapeContext,
  composition: GraphShapeComposition<StateType>
): GraphShapeInstance => new ComposedShapeInstance(context, composition);

/**
 * 基于更高层的组合工厂创建公共图形定义。
 */
export const createComposedShapeDefinition = <Payload = unknown, StateType = unknown>(
  definition: GraphShapeDefinitionComposition<Payload, StateType>
): GraphShapeDefinition => ({
  type: definition.type,
  supportedModes: definition.supportedModes,
  createShape(context, payload) {
    const composition = definition.create(context, payload as Payload);
    return composition ? createComposedShape(context, composition) : null;
  },
  createFromDrop: definition.createFromDrop
    ? (context, event) => {
        const composition = definition.createFromDrop?.(context, event);
        return composition ? createComposedShape(context, composition) : null;
      }
    : undefined
});

/**
 * 将运行时动画轨道转换为外部 UI 可消费的能力契约。
 */
export const createAnimationCapabilityContract = (track: GraphAnimationTrack): AnimationCapabilityContract => ({
  id: track.id,
  label: track.label,
  isAnimating: track.isAnimating,
  isPaused: track.isPaused,
  loop: track.loop,
  yoyo: track.yoyo,
  progress: track.progress,
  min: track.min,
  max: track.max,
  step: track.step,
  playForward: () => track.playForward(),
  playBackward: () => track.playBackward(),
  pause: () => track.pause(),
  resume: () => track.resume(),
  stop: () => track.stop(),
  setLoop: (value) => track.setLoop(value),
  toggleLoop: () => track.toggleLoop(),
  setYoyo: (value) => track.setYoyo(value),
  toggleYoyo: () => track.toggleYoyo(),
  setProgress: (value) => track.setProgress(value)
});

/**
 * 为图形构建多轨动画能力表面。
 */
export const createAnimationCapabilityCollection = (
  tracks: Record<string, GraphAnimationTrack | null | undefined>,
  options?: { primaryTrackId?: string }
): AnimationCollectionCapabilityContract | null => {
  const entries = Object.entries(tracks).filter((entry): entry is [string, GraphAnimationTrack] => !!entry[1]);
  if (entries.length === 0) return null;

  const capabilityTracks = Object.fromEntries(
    entries.map(([id, track]) => [id, createAnimationCapabilityContract(track)])
  ) as Record<string, AnimationCapabilityContract>;

  const primaryTrackId = options?.primaryTrackId && capabilityTracks[options.primaryTrackId]
    ? options.primaryTrackId
    : entries[0][0];

  return {
    primaryTrackId,
    tracks: capabilityTracks
  };
};

/**
 * 同时返回主动画别名与完整动画集合契约。
 */
export const createAnimationCapabilityTarget = (
  tracks: Record<string, GraphAnimationTrack | null | undefined>,
  options?: { primaryTrackId?: string }
): GraphAnimationCapabilityTarget | null => {
  const animations = createAnimationCapabilityCollection(tracks, options);
  if (!animations) return null;

  const primaryTrackId = animations.primaryTrackId;
  const animation = primaryTrackId
    ? animations.tracks[primaryTrackId]
    : Object.values(animations.tracks)[0];

  if (!animation) return null;

  return {
    animation,
    animations
  };
};

/**
 * 基于直接点引用创建标注描述。
 */
export const createPointAnnotation = (
  key: string,
  point: any,
  options?: Pick<GraphPointAnnotationSpec, 'label' | 'attributes'>
): GraphPointAnnotationSpec => ({
  key,
  label: options?.label,
  attributes: options?.attributes,
  source: { kind: 'point', point }
});

/**
 * 基于多个元素的交点创建标注描述。
 */
export const createIntersectionAnnotation = (
  key: string,
  elements: any[],
  index = 0,
  options?: Pick<GraphPointAnnotationSpec, 'label' | 'attributes'>
): GraphPointAnnotationSpec => ({
  key,
  label: options?.label,
  attributes: options?.attributes,
  source: { kind: 'intersection', elements, index }
});

/**
 * 为一组元素中所有两两交点生成标注描述。
 */
export const createPairwiseIntersectionAnnotations = (
  entries: Array<{ key: string; element: any }>,
  options?: {
    createKey?: (left: { key: string; element: any }, right: { key: string; element: any }) => string;
    attributes?: GraphPointAnnotationSpec['attributes'];
  }
): GraphPointAnnotationSpec[] => {
  const specs: GraphPointAnnotationSpec[] = [];

  for (let leftIndex = 0; leftIndex < entries.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < entries.length; rightIndex += 1) {
      const left = entries[leftIndex];
      const right = entries[rightIndex];
      specs.push(createIntersectionAnnotation(
        options?.createKey?.(left, right) ?? `${left.key}:${right.key}`,
        [left.element, right.element],
        0,
        { attributes: options?.attributes }
      ));
    }
  }

  return specs;
};

/**
 * 为两点中点创建标注描述。
 */
export const createMidpointAnnotation = (
  key: string,
  firstPoint: any,
  secondPoint: any,
  options?: Pick<GraphPointAnnotationSpec, 'label' | 'attributes'>
): GraphPointAnnotationSpec => ({
  key,
  label: options?.label,
  attributes: options?.attributes,
  source: { kind: 'midpoint', points: [firstPoint, secondPoint] }
});

/**
 * 基于延迟解析的点创建标注描述。
 */
export const createComputedPointAnnotation = (
  key: string,
  resolve: () => any,
  options?: Pick<GraphPointAnnotationSpec, 'label' | 'attributes'>
): GraphPointAnnotationSpec => ({
  key,
  label: options?.label,
  attributes: options?.attributes,
  source: { kind: 'computed', resolve }
});