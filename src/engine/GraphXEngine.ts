import { EngineMode, GraphXOptions } from '../types/engine';
export type { EngineMode, GraphXOptions } from '../types/engine';
import { BoardManager } from '../board/BoardManager';
import { EntityManager } from '../entities/EntityManager';
import { Renderer } from '../rendering/Renderer';
import { GraphHiddenLineManager } from '../rendering/hiddenLine';
import { GraphSceneState } from './sceneState';
import { GraphRelationState } from './relationState';
import JXG from 'jsxgraph';
import { capabilityRegistry } from '../architecture/capabilities/registry';
import type { ShapeCapabilityTarget } from '../architecture/capabilities/contracts';
import type {
  GraphScreenAnchor,
  GraphScreenBounds,
  GraphScreenPoint,
  GraphShapeContext,
  GraphShapeDefinition,
  GraphShapeInstance,
  GraphViewport,
  GraphViewportPadding
} from '../architecture/shapes/contracts';
import type {
  GraphRelationCreateInput,
  GraphRelationCreateResult,
  GraphRelationListener,
  GraphRelationRecord,
  GraphRelationSnapshot,
  GraphRelationStateSnapshot,
  GraphRelationTargetDescriptor,
  GraphRelationTargetRef,
  GraphSceneRelationNode
} from '../relation/contracts';
import { evaluateRelations } from '../relation/evaluator';
import {
  buildRelationTargetKey,
  toRelationTargetDescriptor,
  toRelationTargetRecord,
  type GraphRelationTargetRecord,
  type GraphRelationTargetRegistration
} from '../relation/targets';
import type {
  GraphCapabilityDescriptor,
  GraphCapabilityListener,
  GraphCapabilitySnapshot,
  GraphSelectionSnapshot
} from '../types/capabilities';
import type {
  GraphHiddenLineOptions,
  GraphHiddenLineSceneSnapshot,
  GraphHiddenLineSourceDescriptor,
  GraphHiddenLineSourceHandle
} from '../rendering/hiddenLine/contracts';
import {
  GRAPH_SCENE_DOCUMENT_VERSION,
  type GraphSceneCommandNode,
  type GraphSceneDiagnostic,
  type GraphSceneDocument,
  type GraphSceneExportResult,
  type GraphSceneLoadResult,
  type GraphSceneSettings,
  type GraphSceneShapeNode
} from '../scene/contracts';
export { GRAPH_SCENE_DOCUMENT_VERSION } from '../scene/contracts';

export type {
  GraphRelationCreateInput,
  GraphRelationCreateResult,
  GraphRelationListener,
  GraphRelationRecord,
  GraphRelationSnapshot,
  GraphRelationStateSnapshot,
  GraphRelationTargetDescriptor,
  GraphRelationTargetRef,
  GraphSceneRelationNode
} from '../relation/contracts';
export type {
  GraphCapabilityDescriptor,
  GraphCapabilityListener,
  GraphCapabilitySnapshot,
  GraphSelectionSnapshot
} from '../types/capabilities';
export type {
  GraphHiddenLineOptions,
  GraphHiddenLineSceneSnapshot,
  GraphHiddenLineSourceDescriptor,
  GraphHiddenLineSourceHandle
} from '../rendering/hiddenLine/contracts';
export type {
  GraphSceneCommandNode,
  GraphSceneDiagnostic,
  GraphSceneDocument,
  GraphSceneExportResult,
  GraphSceneLoadResult,
  GraphSceneSettings,
  GraphSceneShapeNode
} from '../scene/contracts';

export type { GraphShapeContext, GraphShapeDefinition, GraphShapeInstance } from '../architecture/shapes/contracts';
export type { ShapeCapabilityTarget } from '../architecture/capabilities/contracts';

export interface GraphCreateShapeOptions {
  select?: boolean;
}

const cloneHiddenLineOptions = (options?: GraphHiddenLineOptions): GraphHiddenLineOptions | undefined => (
  options
    ? {
        ...options,
        visibleStyle: options.visibleStyle ? { ...options.visibleStyle } : undefined,
        hiddenStyle: options.hiddenStyle ? { ...options.hiddenStyle } : undefined,
        sampling: options.sampling ? { ...options.sampling } : undefined
      }
    : undefined
);

const cloneBoundingBox = (boundingbox?: [number, number, number, number]) => (
  Array.isArray(boundingbox) && boundingbox.length === 4
    ? [...boundingbox] as [number, number, number, number]
    : undefined
);

const cloneGraphXOptions = (options?: GraphXOptions): GraphXOptions | undefined => {
  if (!options) return undefined;

  return {
    ...options,
    boundingbox: cloneBoundingBox(options.boundingbox),
    drag: options.drag ? { ...options.drag } : undefined,
    pan: options.pan ? { ...options.pan } : undefined,
    view3D: options.view3D
      ? {
          ...options.view3D,
          rect: options.view3D.rect
            ? [
                [...options.view3D.rect[0]] as [number, number],
                [...options.view3D.rect[1]] as [number, number],
                options.view3D.rect[2].map((range) => [...range] as [number, number]) as [[number, number], [number, number], [number, number]]
              ]
            : undefined,
          attributes: options.view3D.attributes ? { ...options.view3D.attributes } : undefined,
          hiddenLine: cloneHiddenLineOptions(options.view3D.hiddenLine)
        }
      : undefined
  };
};

const getDefaultSceneSettingsForMode = (mode: EngineMode): GraphSceneSettings => {
  if (mode === 'geometry') {
    return {
      axis: false,
      showNavigation: false,
      keepaspectratio: true
    };
  }

  return {
    axis: true,
    showNavigation: true,
    keepaspectratio: true,
    ...(mode === '3d'
      ? {
          view3D: {
            hiddenLine: {
              enabled: false
            }
          }
        }
      : {})
  };
};

const cloneSceneValue = <T>(value: T): T => {
  if (value === undefined || value === null) return value;

  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(value);
    } catch {
    }
  }

  if (Array.isArray(value)) {
    return value.map((item) => cloneSceneValue(item)) as T;
  }

  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [key, cloneSceneValue(entry)])
    ) as T;
  }

  return value;
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const isEngineMode = (value: unknown): value is EngineMode => value === '2d' || value === '3d' || value === 'geometry';

const normalizeSceneSettings = (value: unknown): GraphSceneSettings | null => {
  if (!isRecord(value)) return null;

  const settings: GraphSceneSettings = {};

  if (value.boundingbox !== undefined) {
    if (!Array.isArray(value.boundingbox) || value.boundingbox.length !== 4 || value.boundingbox.some((entry) => typeof entry !== 'number' || !Number.isFinite(entry))) {
      return null;
    }
    settings.boundingbox = cloneBoundingBox(value.boundingbox as [number, number, number, number]);
  }

  if (value.axis !== undefined) {
    if (typeof value.axis !== 'boolean') return null;
    settings.axis = value.axis;
  }

  if (value.showNavigation !== undefined) {
    if (typeof value.showNavigation !== 'boolean') return null;
    settings.showNavigation = value.showNavigation;
  }

  if (value.keepaspectratio !== undefined) {
    if (typeof value.keepaspectratio !== 'boolean') return null;
    settings.keepaspectratio = value.keepaspectratio;
  }

  if (value.view3D !== undefined) {
    if (!isRecord(value.view3D)) return null;

    if (value.view3D.hiddenLine !== undefined) {
      if (!isRecord(value.view3D.hiddenLine)) return null;
      if (value.view3D.hiddenLine.enabled !== undefined && typeof value.view3D.hiddenLine.enabled !== 'boolean') {
        return null;
      }

      settings.view3D = {
        hiddenLine: {
          enabled: value.view3D.hiddenLine.enabled as boolean | undefined
        }
      };
    }
  }

  return settings;
};

/**
 * 面向使用方的公共引擎门面，负责画板生命周期、指令渲染、图形注册与能力执行。
 */
export class GraphXEngine {
  private boardMgr: BoardManager;
  private currentOptions?: GraphXOptions;
  private entityMgr: EntityManager;
  private hiddenLineMgr: GraphHiddenLineManager;
  private relationState = new GraphRelationState();
  private relationTargets = new Map<string, GraphRelationTargetRecord>();
  private relationSnapshots: GraphRelationSnapshot[] = [];
  private sceneState = new GraphSceneState();
  private renderer: Renderer;
  private shapeDefinitions: Map<string, GraphShapeDefinition> = new Map();
  private shapeInstances: Map<string, GraphShapeInstance> = new Map();
  private animationTasks: Map<string, (timestamp: number) => boolean | void> = new Map();
  private animationFrameId: number | null = null;
  private selectedShapeId: string | null = null;
  private isClickingObject = false;
  private capabilityListeners: GraphCapabilityListener[] = [];
  private relationListeners: GraphRelationListener[] = [];
  private mutationBatchDepth = 0;
  private pendingCapabilityNotification = false;

  /** 创建一个绑定到指定 DOM 容器 id 的引擎实例。containerId 指向目标 DOM 容器，该容器应当已经具备明确的宽高，options 会在初始化画板时透传给 JSXGraph。 */
  constructor(containerId: string, options?: GraphXOptions) {
    this.currentOptions = cloneGraphXOptions(options);
    this.boardMgr = new BoardManager(containerId, options);
    this.boardMgr.initBoard();

    this.entityMgr = new EntityManager();
    this.hiddenLineMgr = new GraphHiddenLineManager(this.boardMgr, options?.view3D?.hiddenLine);
    this.renderer = new Renderer(this.boardMgr, this.entityMgr, {
      isEnabled: () => this.hiddenLineMgr.isEnabled(),
      getOptions: () => this.hiddenLineMgr.getOptions(),
      registerSource: (ownerId, source) => this.hiddenLineMgr.registerSource(ownerId, source),
      clearOwnerSources: (ownerId) => {
        this.hiddenLineMgr.clearOwnerSources(ownerId);
      }
    }, {
      registerTarget: (ownerId, target) => {
        this.registerRelationTarget(ownerId, target);
      },
      clearOwnerTargets: (ownerId) => {
        this.clearRelationTargets(ownerId);
      }
    });

    this.setupGlobalEvents();
    this.refreshRelationState();
  }

  public registerHiddenLineSource(
    ownerId: string,
    source: GraphHiddenLineSourceDescriptor
  ): GraphHiddenLineSourceHandle {
    return this.hiddenLineMgr.registerSource(ownerId, source);
  }

  public removeHiddenLineSource(sourceId: string): boolean {
    return this.hiddenLineMgr.removeSource(sourceId);
  }

  public clearHiddenLineSources(ownerId?: string): void {
    if (ownerId) {
      this.hiddenLineMgr.clearOwnerSources(ownerId);
      return;
    }

    this.hiddenLineMgr.clearAllSources();
  }

  public getHiddenLineSceneSnapshot(): GraphHiddenLineSceneSnapshot {
    return this.hiddenLineMgr.getSnapshot();
  }

  public getHiddenLineOptions(): GraphHiddenLineOptions {
    return this.hiddenLineMgr.getOptions();
  }

  /** 更新当前引擎的 hidden-line 配置，并立即返回最新 runtime snapshot。 */
  public setHiddenLineOptions(options?: GraphHiddenLineOptions): GraphHiddenLineSceneSnapshot {
    const nextOptions = cloneHiddenLineOptions(options);
    const currentOptions = cloneGraphXOptions(this.currentOptions) ?? {};
    const currentView3D = currentOptions.view3D ? { ...currentOptions.view3D } : undefined;

    if (nextOptions) {
      this.currentOptions = {
        ...currentOptions,
        view3D: {
          ...(currentView3D ?? {}),
          hiddenLine: nextOptions
        }
      };
    } else if (currentView3D) {
      delete currentView3D.hiddenLine;
      this.currentOptions = {
        ...currentOptions,
        view3D: Object.keys(currentView3D).length > 0 ? currentView3D : undefined
      };
    } else {
      this.currentOptions = Object.keys(currentOptions).length > 0 ? currentOptions : undefined;
    }

    this.hiddenLineMgr.setOptions(nextOptions);
    return this.hiddenLineMgr.update();
  }

  /** 按公共类型注册一个图形定义。definition.type 会作为 createShape 的调用入口。 */
  public registerShape(definition: GraphShapeDefinition): void {
    this.shapeDefinitions.set(definition.type, definition);
    this.notifyCapabilityChange();
  }

  /** 按顺序批量注册多个图形定义。definitions 中的每一项都会按 registerShape 的规则依次注册。 */
  public registerShapes(definitions: Iterable<GraphShapeDefinition>): void {
    for (const definition of definitions) {
      this.registerShape(definition);
    }
  }

  private isShapeAvailable(definition: GraphShapeDefinition): boolean {
    const currentMode = this.boardMgr.mode;
    return definition.supportedModes === 'all' ||
      (Array.isArray(definition.supportedModes)
        ? definition.supportedModes.includes(currentMode)
        : definition.supportedModes === currentMode);
  }

  private createShapeContext(preferredShapeId?: string): GraphShapeContext {
    let didUsePreferredShapeId = false;

    return {
      engine: this,
      board: this.getBoard(),
      selectShape: (shapeId) => this.selectShape(shapeId),
      isShapeSelected: (shapeId) => this.selectedShapeId === shapeId,
      addShape: (instance) => this.addShapeInstance(instance),
      removeShape: (shapeId) => this.removeShapeInstance(shapeId),
      notifyChange: () => this.notifyCapabilityChange(),
      generateId: (prefix) => {
        if (preferredShapeId && !didUsePreferredShapeId) {
          didUsePreferredShapeId = true;
          return preferredShapeId;
        }
        return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
      },
      getUsrCoordFromEvent: (event) => this.getUsrCoordFromEvent(event),
      getViewport: () => this.getViewport(),
      projectUserPoint: (point) => this.projectUserPoint(point),
      projectPoint3D: (point) => this.projectPoint3D(point),
      projectUserBounds: (points) => this.projectUserBounds(points),
      project3DBounds: (points) => this.project3DBounds(points),
      getBoundsAnchor: (bounds, anchor) => this.getBoundsAnchor(bounds, anchor),
      clampScreenPoint: (point, padding) => this.clampScreenPoint(point, padding)
    };
  }

  /** 订阅选中项与能力变化。订阅后会立即收到一次当前快照，返回值是一个取消订阅函数。 */
  public subscribeCapabilities(listener: GraphCapabilityListener): () => void {
    this.capabilityListeners.push(listener);
    listener(this.getCapabilitySnapshot());
    return () => {
      this.capabilityListeners = this.capabilityListeners.filter(l => l !== listener);
    };
  }

  /** 订阅 relation 状态与可用 target 列表。订阅后会立即收到一次当前快照。 */
  public subscribeRelations(listener: GraphRelationListener): () => void {
    this.relationListeners.push(listener);
    listener(this.getRelationStateSnapshot());
    return () => {
      this.relationListeners = this.relationListeners.filter((current) => current !== listener);
    };
  }

  /** 返回当前全部 relation snapshot 与可用 target 描述。 */
  public getRelationStateSnapshot(): GraphRelationStateSnapshot {
    return {
      relations: this.getRelationSnapshots(),
      targets: this.listRelationTargets()
    };
  }

  /** 返回当前全部 relation snapshot。 */
  public getRelationSnapshots(): GraphRelationSnapshot[] {
    return this.relationSnapshots.map((snapshot) => ({
      ...snapshot,
      targets: snapshot.targets.map((target) => ({ ...target })),
      params: snapshot.params ? { ...snapshot.params } : undefined,
      diagnostics: snapshot.diagnostics.map((diagnostic) => ({ ...diagnostic })),
      targetLabels: [...snapshot.targetLabels],
      measurements: snapshot.measurements?.map((measurement) => ({ ...measurement }))
    }));
  }

  /** 返回当前全部 relation record。 */
  public listRelations(): GraphRelationRecord[] {
    return this.relationState.list();
  }

  /** 返回当前场景内可参与 relation 的 target 列表。 */
  public listRelationTargets(): GraphRelationTargetDescriptor[] {
    return Array.from(this.relationTargets.values())
      .map((target) => ({
        ...toRelationTargetDescriptor(target.ownerId, target),
        ownerType: target.ownerType,
        targetId: target.targetId
      }))
      .sort((left, right) => left.label.localeCompare(right.label));
  }

  /** 创建一条新的 relation record。 */
  public createRelation(input: GraphRelationCreateInput): GraphRelationCreateResult {
    const created = this.relationState.create(input);
    if (!created.record) {
      return {
        status: 'failure',
        relation: null,
        snapshot: null,
        diagnostics: created.diagnostics
      };
    }

    this.sceneState.upsertRelation({
      id: created.record.id,
      kind: created.record.kind,
      targets: created.record.targets,
      active: created.record.active,
      params: created.record.params
    });
    this.refreshRelationState();

    const snapshot = this.relationSnapshots.find((item) => item.id === created.record?.id) ?? null;

    return {
      status: 'success',
      relation: created.record,
      snapshot,
      diagnostics: snapshot?.diagnostics ?? created.diagnostics
    };
  }

  /** 删除一条 relation。 */
  public removeRelation(relationId: string): boolean {
    const removed = this.relationState.remove(relationId);
    if (!removed) return false;
    this.sceneState.removeRelation(relationId);
    this.refreshRelationState();
    return true;
  }

  /** 设置 relation 的 active 状态。 */
  public setRelationActive(relationId: string, active: boolean): boolean {
    const updated = this.relationState.setActive(relationId, active);
    if (!updated) return false;

    const record = this.relationState.list().find((item) => item.id === relationId);
    if (record) {
      this.sceneState.upsertRelation({
        id: record.id,
        kind: record.kind,
        targets: record.targets,
        active: record.active,
        params: record.params
      });
    }
    this.refreshRelationState();
    return true;
  }

  /** 返回当前选中项及其标准化能力列表。返回结果同时包含 selection 和 capabilities 两部分。 */
  public getCapabilitySnapshot(): GraphCapabilitySnapshot {
    const target = this.getSelectedCapabilityTarget();

    return {
      selection: target
        ? {
            ...target,
            entityType: target.entityType,
            entityId: target.entityId,
            entity: target.entity,
            ui: target.ui
          }
        : null,
      capabilities: target
        ? capabilityRegistry
            .filter(capability => capability.supports(target))
            .map(capability => capability.createDescriptor(target))
        : []
    };
  }

  /** 返回当前选中的实体快照；如果没有选中项则返回 null。 */
  public getSelection(): GraphSelectionSnapshot | null {
    return this.getCapabilitySnapshot().selection;
  }

  /** 返回当前选中项可用的能力列表。 */
  public getCapabilities(): GraphCapabilityDescriptor[] {
    return this.getCapabilitySnapshot().capabilities;
  }

  /** 在当前选中项上执行指定能力。capabilityId 通常来自 GraphCapabilityDescriptor.id，payload 会原样透传给能力执行器；返回 true 表示执行成功，没有选中项或能力不可用时返回 false。 */
  public executeCapability(capabilityId: string, payload?: unknown): boolean {
    const target = this.getSelectedCapabilityTarget();
    if (!target) return false;
    const capability = capabilityRegistry.find(item => item.id === capabilityId && item.supports(target));
    return capability ? capability.execute(target, payload) : false;
  }

  /** 根据已注册的图形类型创建一个实例。entityType 对应注册时 definition.type，payload 会透传给图形定义的 createShape；返回 true 表示创建成功，否则表示当前类型不存在、当前模式不可用或定义主动拒绝创建。options.select 默认为 true，可用于关闭创建后自动选中。 */
  public createShape(entityType: string, payload?: unknown, options?: GraphCreateShapeOptions): boolean {
    const definition = this.shapeDefinitions.get(entityType);
    if (!definition || !this.isShapeAvailable(definition)) return false;
    return this.createShapeWithDefinition(definition, payload, options);
  }

  /** 主动通知能力订阅者拉取一份新的快照。一般由引擎内部在状态变化后自动调用，图形作者通常通过 context.notifyChange 或 api.notifyChange 间接触发。 */
  public notifyCapabilityChange(): void {
    if (this.capabilityListeners.length === 0) return;
    if (this.mutationBatchDepth > 0) {
      this.pendingCapabilityNotification = true;
      return;
    }
    this.dispatchCapabilityChange();
  }

  private registerRelationTarget(ownerId: string, target: GraphRelationTargetRegistration): void {
    const record = toRelationTargetRecord(ownerId, target);
    this.relationTargets.set(buildRelationTargetKey(record), record);
    this.refreshRelationState();
  }

  private clearRelationTargets(ownerId?: string): void {
    if (ownerId) {
      Array.from(this.relationTargets.keys()).forEach((key) => {
        if (key.startsWith(`command:${ownerId}:`) || key.startsWith(`shape:${ownerId}:`)) {
          this.relationTargets.delete(key);
        }
      });
    } else {
      this.relationTargets.clear();
    }
    this.refreshRelationState();
  }

  private refreshRelationState(): void {
    this.relationSnapshots = evaluateRelations(this.relationState.list(), Array.from(this.relationTargets.values()));
    this.notifyRelationChange();
  }

  private notifyRelationChange(): void {
    if (this.relationListeners.length === 0) return;
    const snapshot = this.getRelationStateSnapshot();
    this.relationListeners.forEach((listener) => listener(snapshot));
  }

  private addShapeInstance(instance: GraphShapeInstance, select = false, definition?: GraphShapeDefinition | null): void {
    this.runInMutationBatch(() => {
      this.shapeInstances.set(instance.id, instance);
      this.sceneState.addShape({
        id: instance.id,
        entityType: instance.entityType,
        definitionType: definition?.type,
        serializable: !!definition?.scene
      });
      if (select) {
        this.selectShape(instance.id);
        return;
      }
      this.notifyCapabilityChange();
    });
  }

  private removeShapeInstance(shapeId: string): void {
    this.runInMutationBatch(() => {
      const instance = this.shapeInstances.get(shapeId);
      if (!instance) return;
      if (this.selectedShapeId === shapeId) {
        this.selectedShapeId = null;
        instance.setSelected(false);
      }
      instance.destroy();
      this.hiddenLineMgr.clearOwnerSources(shapeId);
      this.clearRelationTargets(shapeId);
      this.shapeInstances.delete(shapeId);
      this.sceneState.removeShape(shapeId);
      this.notifyCapabilityChange();
    });
  }

  private clearShapeInstances(): void {
    this.runInMutationBatch(() => {
      this.shapeInstances.forEach((instance) => {
        instance.destroy();
        this.hiddenLineMgr.clearOwnerSources(instance.id);
        this.clearRelationTargets(instance.id);
      });
      this.shapeInstances.clear();
      this.sceneState.clearShapes();
      this.selectedShapeId = null;
      this.notifyCapabilityChange();
    });
  }

  private createShapeWithDefinition(
    definition: GraphShapeDefinition,
    payload?: unknown,
    options?: GraphCreateShapeOptions,
    preferredShapeId?: string
  ): boolean {
    return this.runInMutationBatch(() => {
      const instance = definition.createShape(this.createShapeContext(preferredShapeId), payload);
      if (!instance) return false;
      this.addShapeInstance(instance, options?.select ?? true, definition);
      return true;
    });
  }

  private selectShape(shapeId: string | null): void {
    this.runInMutationBatch(() => {
      if (this.selectedShapeId === shapeId) return;

      const previous = this.selectedShapeId ? this.shapeInstances.get(this.selectedShapeId) : null;
      this.selectedShapeId = shapeId;
      previous?.setSelected(false);

      if (shapeId) {
        this.shapeInstances.get(shapeId)?.setSelected(true);
        return;
      }

      this.notifyCapabilityChange();
    });
  }

  private getSelectedCapabilityTarget(): ShapeCapabilityTarget | null {
    if (!this.selectedShapeId) return null;
    return this.shapeInstances.get(this.selectedShapeId)?.getCapabilityTarget() ?? null;
  }

  private setupGlobalEvents(): void {
    const board = this.boardMgr.board;
    if (!board) return;

    board.on('down', (e: any) => {
      const objs = board.getAllObjectsUnderMouse(e) || [];
      this.isClickingObject = objs.filter((o: any) => o.elType !== 'image').length > 0;
      Array.from(this.shapeInstances.values()).forEach((instance) => {
        instance.onBoardDown?.(e, this.isClickingObject);
      });
    });

    board.on('up', (e: any) => {
      if (this.isEventFromDesignerUI(e)) return;
      Array.from(this.shapeInstances.values()).forEach((instance) => {
        instance.onBoardUp?.(e, this.isClickingObject);
      });
    });

    board.on('update', () => {
      Array.from(this.shapeInstances.values()).forEach((instance) => {
        instance.onBoardUpdate?.();
      });
      this.hiddenLineMgr.update();
      this.refreshRelationState();
    });
  }

  private isEventFromDesignerUI(e: any): boolean {
    const target = (e?.target ?? e?.srcElement) as EventTarget | null;
    if (!target || !(target instanceof Element)) return false;
    return !!target.closest('[data-designer-ui="true"]');
  }

  /** 让已注册图形有机会基于拖拽事件创建实例。第一个返回非空实例的图形定义会接管这次拖拽创建。 */
  public handleDropEvent(e: DragEvent): void {
    this.runInMutationBatch(() => {
      for (const definition of this.shapeDefinitions.values()) {
        if (!this.isShapeAvailable(definition) || !definition.createFromDrop) continue;
        const instance = definition.createFromDrop(this.createShapeContext(), e);
        if (!instance) continue;
        this.addShapeInstance(instance, true, definition);
        return;
      }
    });
  }

  /** 切换引擎模式，并在需要时重建画板。切换模式会清空当前 shape 实例、命令渲染结果以及数学变量；如果传入 options，则会替换当前全局画板配置。 */
  public setMode(mode: EngineMode, options?: GraphXOptions): void {
    const isRestarted = this.boardMgr.setMode(mode, options);
    if (isRestarted) {
      if (options !== undefined) {
        this.currentOptions = cloneGraphXOptions(options);
      }
      this.hiddenLineMgr.setOptions((options ?? this.currentOptions)?.view3D?.hiddenLine);
      this.clearShapeInstances();
      this.hiddenLineMgr.clearAllSources();
      this.clearRelationTargets();
      this.relationState.clear();
      this.refreshRelationState();
      this.entityMgr.clearAll();
      this.sceneState.clearCommands();
      this.sceneState.clearRelations();
      this.clearVariables();
      this.setupGlobalEvents();
    }
  }

  /** 重建画板并清空当前运行时状态。如果传入 options，则会替换当前全局画板配置。 */
  public resetBoard(options?: GraphXOptions): void {
    this.clearShapeInstances();
    this.boardMgr.resetBoard(options);
    if (options !== undefined) {
      this.currentOptions = cloneGraphXOptions(options);
    }
    this.hiddenLineMgr.setOptions((options ?? this.currentOptions)?.view3D?.hiddenLine);
    this.hiddenLineMgr.clearAllSources();
    this.clearRelationTargets();
    this.relationState.clear();
    this.refreshRelationState();
    this.entityMgr.clearAll();
    this.sceneState.clearCommands();
    this.sceneState.clearRelations();
    this.clearVariables();
    this.setupGlobalEvents();
  }

  /** 清空共享数学作用域中的变量。 */
  public clearVariables(): void {
    this.renderer.mathScope.clear();
  }

  /** 执行一条表达式或指令，并将生成的元素记录到指定 id 下。相同 id 的命令会先移除旧结果再重新渲染，color 和 extraOptions 会继续透传给底层渲染器。 */
  public executeCommand(id: string, expression: string, color: string = '#0ea5e9', extraOptions?: any): void {
    this.removeCommandRuntime(id, false);

    if (!expression || expression.trim() === '') {
      this.sceneState.removeCommand(id);
      return;
    }
    const pureExp = expression.trim();

    try {
      const elements = this.renderer.render(this.boardMgr.mode, pureExp, color, extraOptions, id);
      this.entityMgr.registerCommandElements(id, elements);
      this.sceneState.upsertCommand({
        id,
        expression: pureExp,
        color,
        options: cloneSceneValue(extraOptions)
      });
    } catch (e: any) {
      this.sceneState.removeCommand(id);
      console.warn(`[GraphXEngine] 解析指令失败: ${pureExp}`, e);
      throw new Error(e.message || '引擎无法解析该语句格式');
    }
  }

  /** 移除某个指令 id 关联的全部渲染元素。 */
  public removeCommand(id: string): void {
    this.removeCommandRuntime(id);
  }

  /** 导出当前引擎的公开 scene document。 */
  public exportScene(): GraphSceneExportResult {
    const diagnostics: GraphSceneDiagnostic[] = [];
    const shapes: GraphSceneShapeNode[] = [];
    const relations = this.relationState.list().map((relation) => ({
      id: relation.id,
      kind: relation.kind,
      targets: relation.targets.map((target) => ({ ...target })),
      active: relation.active,
      params: relation.params ? { ...relation.params } : undefined
    }));

    for (const record of this.sceneState.listShapes()) {
      if (!record.serializable) {
        diagnostics.push({
          code: 'scene_export_shape_not_serializable',
          message: `Shape "${record.id}" of type "${record.entityType}" is not declared serializable.`,
          severity: 'error',
          nodeKind: 'shape',
          nodeId: record.id,
          nodeType: record.entityType
        });
        continue;
      }

      const definitionType = record.definitionType ?? record.entityType;
      const definition = this.shapeDefinitions.get(definitionType);
      const instance = this.shapeInstances.get(record.id);

      if (!definition?.scene) {
        diagnostics.push({
          code: 'scene_export_shape_missing_definition',
          message: `Shape "${record.id}" cannot be exported because its serializable definition is unavailable.`,
          severity: 'error',
          nodeKind: 'shape',
          nodeId: record.id,
          nodeType: definitionType
        });
        continue;
      }

      if (!instance) {
        diagnostics.push({
          code: 'scene_export_shape_missing_instance',
          message: `Shape "${record.id}" cannot be exported because its runtime instance is missing.`,
          severity: 'error',
          nodeKind: 'shape',
          nodeId: record.id,
          nodeType: definitionType
        });
        continue;
      }

      if (!instance.getScenePayload) {
        diagnostics.push({
          code: 'scene_export_shape_missing_payload',
          message: `Shape "${record.id}" cannot be exported because it does not provide a scene payload.`,
          severity: 'error',
          nodeKind: 'shape',
          nodeId: record.id,
          nodeType: definitionType
        });
        continue;
      }

      shapes.push({
        id: record.id,
        type: definition.type,
        payload: cloneSceneValue(instance.getScenePayload())
      });
    }

    if (diagnostics.length > 0) {
      return {
        status: 'failure',
        scene: null,
        diagnostics
      };
    }

    return {
      status: 'success',
      scene: {
        version: GRAPH_SCENE_DOCUMENT_VERSION,
        mode: this.boardMgr.mode,
        settings: this.getSceneSettings(),
        commands: this.sceneState.listCommands().map((command) => ({
          id: command.id,
          expression: command.expression,
          color: command.color,
          options: cloneSceneValue(command.options)
        })),
        shapes,
        relations
      },
      diagnostics: []
    };
  }

  /** 加载一个 scene document，并以整体替换的方式恢复当前引擎内容。 */
  public loadScene(input: GraphSceneDocument | string): GraphSceneLoadResult {
    const preflight = this.preflightSceneDocument(input);
    if (!preflight.scene) {
      return {
        status: 'failure',
        scene: null,
        diagnostics: preflight.diagnostics,
        appliedCommands: 0,
        appliedShapes: 0,
        appliedRelations: 0
      };
    }

    const diagnostics: GraphSceneDiagnostic[] = [];
    let appliedCommands = 0;
    let appliedShapes = 0;
    let appliedRelations = 0;

    this.setMode(preflight.scene.mode, this.getSceneOptionsFromSettings(preflight.scene.settings));

    preflight.scene.commands.forEach((rawNode, index) => {
      const command = this.normalizeSceneCommandNode(rawNode);
      if (!command) {
        diagnostics.push({
          code: 'scene_invalid_command',
          message: `Command at index ${index} is not a valid scene command node.`,
          severity: 'error',
          nodeKind: 'command',
          nodeIndex: index
        });
        return;
      }

      try {
        this.executeCommand(command.id, command.expression, command.color ?? '#0ea5e9', command.options);
        appliedCommands += 1;
      } catch (error: any) {
        diagnostics.push({
          code: 'scene_command_execute_failed',
          message: error?.message || `Command "${command.id}" failed to execute.`,
          severity: 'error',
          nodeKind: 'command',
          nodeId: command.id,
          nodeIndex: index
        });
      }
    });

    preflight.scene.shapes.forEach((rawNode, index) => {
      const shape = this.normalizeSceneShapeNode(rawNode);
      if (!shape) {
        diagnostics.push({
          code: 'scene_invalid_shape',
          message: `Shape at index ${index} is not a valid scene shape node.`,
          severity: 'error',
          nodeKind: 'shape',
          nodeIndex: index
        });
        return;
      }

      const definition = this.shapeDefinitions.get(shape.type);
      if (!definition?.scene) {
        diagnostics.push({
          code: 'scene_shape_missing_definition',
          message: `Shape "${shape.type}" is not registered or does not declare scene support.`,
          severity: 'error',
          nodeKind: 'shape',
          nodeId: shape.id,
          nodeType: shape.type,
          nodeIndex: index
        });
        return;
      }

      if (!this.isShapeAvailable(definition)) {
        diagnostics.push({
          code: 'scene_shape_unsupported_mode',
          message: `Shape "${shape.type}" is not available in mode "${this.boardMgr.mode}".`,
          severity: 'error',
          nodeKind: 'shape',
          nodeId: shape.id,
          nodeType: shape.type,
          nodeIndex: index
        });
        return;
      }

      let normalizedPayload = shape.payload;
      try {
        normalizedPayload = definition.scene.normalizePayload
          ? definition.scene.normalizePayload(shape.payload)
          : shape.payload;
      } catch (error: any) {
        diagnostics.push({
          code: 'scene_shape_payload_invalid',
          message: error?.message || `Shape "${shape.type}" payload is invalid.`,
          severity: 'error',
          nodeKind: 'shape',
          nodeId: shape.id,
          nodeType: shape.type,
          nodeIndex: index
        });
        return;
      }

      const created = this.createShapeWithDefinition(definition, normalizedPayload, { select: false }, shape.id);
      if (!created) {
        diagnostics.push({
          code: 'scene_shape_create_failed',
          message: `Shape "${shape.type}" could not be restored from the scene document.`,
          severity: 'error',
          nodeKind: 'shape',
          nodeId: shape.id,
          nodeType: shape.type,
          nodeIndex: index
        });
        return;
      }

      appliedShapes += 1;
    });

    (preflight.scene.relations ?? []).forEach((rawNode, index) => {
      const relation = this.normalizeSceneRelationNode(rawNode);
      if (!relation) {
        diagnostics.push({
          code: 'scene_invalid_relation',
          message: `Relation at index ${index} is not a valid scene relation node.`,
          severity: 'error',
          nodeKind: 'relation',
          nodeIndex: index
        });
        return;
      }

      const result = this.createRelation({
        kind: relation.kind,
        targets: relation.targets,
        active: relation.active,
        params: relation.params
      });

      if (!result.relation) {
        diagnostics.push(...(result.diagnostics.length > 0
          ? result.diagnostics.map((diagnostic) => ({
              code: diagnostic.code,
              message: diagnostic.message,
              severity: diagnostic.severity,
              nodeKind: 'relation' as const,
              nodeId: relation.id,
              nodeIndex: index
            }))
          : [{
              code: 'scene_relation_create_failed',
              message: `Relation "${relation.id}" could not be restored from the scene document.`,
              severity: 'error' as const,
              nodeKind: 'relation' as const,
              nodeId: relation.id,
              nodeIndex: index
            }]));
        return;
      }

      if (result.relation.id !== relation.id) {
        this.relationState.remove(result.relation.id);
        this.sceneState.removeRelation(result.relation.id);
        this.relationState.add({
          id: relation.id,
          kind: relation.kind,
          targets: relation.targets,
          active: relation.active ?? true,
          params: relation.params
        });
        this.sceneState.upsertRelation({
          id: relation.id,
          kind: relation.kind,
          targets: relation.targets,
          active: relation.active,
          params: relation.params
        });
        this.refreshRelationState();
      }

      appliedRelations += 1;
    });

    const exportedScene = this.exportScene();
    if (exportedScene.status === 'failure') {
      diagnostics.push(...exportedScene.diagnostics);
    }

    const hasErrors = diagnostics.some((diagnostic) => diagnostic.severity === 'error');
    const status = hasErrors
      ? (appliedCommands > 0 || appliedShapes > 0 || appliedRelations > 0 ? 'partial' : 'failure')
      : 'success';

    return {
      status,
      scene: exportedScene.scene,
      diagnostics,
      appliedCommands,
      appliedShapes,
      appliedRelations
    };
  }

  private preflightSceneDocument(input: GraphSceneDocument | string): {
    scene: GraphSceneDocument | null;
    diagnostics: GraphSceneDiagnostic[];
  } {
    let raw: unknown = input;

    if (typeof input === 'string') {
      try {
        raw = JSON.parse(input);
      } catch {
        return {
          scene: null,
          diagnostics: [{
            code: 'scene_invalid_json',
            message: 'Scene input is not valid JSON.',
            severity: 'error',
            nodeKind: 'document'
          }]
        };
      }
    }

    if (!isRecord(raw)) {
      return {
        scene: null,
        diagnostics: [{
          code: 'scene_invalid_document',
          message: 'Scene input must be an object document.',
          severity: 'error',
          nodeKind: 'document'
        }]
      };
    }

    if (raw.version !== GRAPH_SCENE_DOCUMENT_VERSION) {
      return {
        scene: null,
        diagnostics: [{
          code: 'scene_unsupported_version',
          message: `Scene document version must be ${GRAPH_SCENE_DOCUMENT_VERSION}.`,
          severity: 'error',
          nodeKind: 'document'
        }]
      };
    }

    if (!isEngineMode(raw.mode)) {
      return {
        scene: null,
        diagnostics: [{
          code: 'scene_invalid_mode',
          message: 'Scene document mode must be one of "2d", "3d", or "geometry".',
          severity: 'error',
          nodeKind: 'document'
        }]
      };
    }

    if (!Array.isArray(raw.commands) || !Array.isArray(raw.shapes) || (raw.relations !== undefined && !Array.isArray(raw.relations))) {
      return {
        scene: null,
        diagnostics: [{
          code: 'scene_invalid_document',
          message: 'Scene document must contain commands[] and shapes[] arrays, and relations[] when present.',
          severity: 'error',
          nodeKind: 'document'
        }]
      };
    }

    if (raw.settings !== undefined) {
      const normalizedSettings = normalizeSceneSettings(raw.settings);
      if (!normalizedSettings) {
        return {
          scene: null,
          diagnostics: [{
            code: 'scene_invalid_settings',
            message: 'Scene document settings are not valid.',
            severity: 'error',
            nodeKind: 'document'
          }]
        };
      }
    }

    return {
      scene: {
        version: GRAPH_SCENE_DOCUMENT_VERSION,
        mode: raw.mode,
        settings: raw.settings === undefined ? undefined : normalizeSceneSettings(raw.settings) ?? undefined,
        commands: raw.commands.map((command) => cloneSceneValue(command)) as GraphSceneCommandNode[],
        shapes: raw.shapes.map((shape) => cloneSceneValue(shape)) as GraphSceneShapeNode[],
        relations: Array.isArray(raw.relations)
          ? raw.relations.map((relation) => cloneSceneValue(relation)) as GraphSceneRelationNode[]
          : []
      },
      diagnostics: []
    };
  }

  private normalizeSceneCommandNode(node: unknown): GraphSceneCommandNode | null {
    if (!isRecord(node) || typeof node.id !== 'string' || node.id.trim() === '' || typeof node.expression !== 'string') {
      return null;
    }

    if (node.color !== undefined && typeof node.color !== 'string') {
      return null;
    }

    return {
      id: node.id,
      expression: node.expression,
      color: node.color,
      options: cloneSceneValue(node.options)
    };
  }

  private normalizeSceneShapeNode(node: unknown): GraphSceneShapeNode | null {
    if (!isRecord(node) || typeof node.type !== 'string' || node.type.trim() === '') {
      return null;
    }

    if (node.id !== undefined && (typeof node.id !== 'string' || node.id.trim() === '')) {
      return null;
    }

    return {
      id: node.id,
      type: node.type,
      payload: cloneSceneValue(node.payload)
    };
  }

  private normalizeSceneRelationNode(node: unknown): GraphSceneRelationNode | null {
    if (!isRecord(node) || typeof node.id !== 'string' || node.id.trim() === '' || typeof node.kind !== 'string' || !Array.isArray(node.targets)) {
      return null;
    }

    const targets = node.targets
      .filter((target): target is GraphRelationTargetRef => (
        isRecord(target)
        && (target.ownerType === 'command' || target.ownerType === 'shape')
        && typeof target.ownerId === 'string'
        && target.ownerId.trim() !== ''
        && typeof target.targetId === 'string'
        && target.targetId.trim() !== ''
      ))
      .map((target) => ({
        ownerType: target.ownerType,
        ownerId: target.ownerId,
        targetId: target.targetId
      }));

    if (targets.length !== 2) {
      return null;
    }

    if (node.active !== undefined && typeof node.active !== 'boolean') {
      return null;
    }

    const params = isRecord(node.params)
      ? {
          expectedValue: typeof node.params.expectedValue === 'number' ? node.params.expectedValue : undefined,
          tolerance: typeof node.params.tolerance === 'number' ? node.params.tolerance : undefined
        }
      : undefined;

    return {
      id: node.id,
      kind: node.kind as GraphSceneRelationNode['kind'],
      targets,
      active: node.active,
      params
    };
  }

  private getSceneSettings(): GraphSceneSettings {
    const defaults = getDefaultSceneSettingsForMode(this.boardMgr.mode);
    const settings: GraphSceneSettings = {
      axis: this.currentOptions?.axis ?? defaults.axis,
      showNavigation: this.currentOptions?.showNavigation ?? defaults.showNavigation,
      keepaspectratio: this.currentOptions?.keepaspectratio ?? defaults.keepaspectratio
    };

    const boundingbox = cloneBoundingBox(this.currentOptions?.boundingbox);
    if (boundingbox) {
      settings.boundingbox = boundingbox;
    }

    if (this.boardMgr.mode === '3d') {
      settings.view3D = {
        hiddenLine: {
          enabled: this.currentOptions?.view3D?.hiddenLine?.enabled
            ?? defaults.view3D?.hiddenLine?.enabled
            ?? false
        }
      };
    }

    return settings;
  }

  private getSceneOptionsFromSettings(settings?: GraphSceneSettings): GraphXOptions {
    if (!settings) return {};

    const options: GraphXOptions = {};

    if (settings.boundingbox) {
      options.boundingbox = cloneBoundingBox(settings.boundingbox);
    }

    if (settings.axis !== undefined) {
      options.axis = settings.axis;
    }

    if (settings.showNavigation !== undefined) {
      options.showNavigation = settings.showNavigation;
    }

    if (settings.keepaspectratio !== undefined) {
      options.keepaspectratio = settings.keepaspectratio;
    }

    if (settings.view3D?.hiddenLine?.enabled !== undefined) {
      options.view3D = {
        hiddenLine: {
          enabled: settings.view3D.hiddenLine.enabled
        }
      };
    }

    return options;
  }

  private removeCommandRuntime(id: string, removeSceneRecord = true): void {
    this.hiddenLineMgr.clearOwnerSources(id);
    this.clearRelationTargets(id);
    if (this.boardMgr.board) {
      this.entityMgr.removeCommandElements(id, this.boardMgr.board);
    }
    if (removeSceneRecord) {
      this.sceneState.removeCommand(id);
    }
  }

  /** 通过重建画板来清空当前内容。 */
  public clearBoard(): void {
    this.resetBoard();
  }

  /** 向共享动画帧调度器注册一个任务。task 每帧执行一次；当它返回 false 时，引擎会自动移除该任务。 */
  public registerAnimationTask(taskId: string, task: (timestamp: number) => boolean | void): void {
    this.animationTasks.set(taskId, task);
    this.ensureAnimationLoop();
  }

  /** 从共享动画帧调度器中移除一个任务。 */
  public unregisterAnimationTask(taskId: string): void {
    this.animationTasks.delete(taskId);

    if (this.animationTasks.size === 0 && this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /** 释放画板资源并清空已注册的运行时状态。 */
  public destroy(): void {
    this.clearShapeInstances();
    this.shapeDefinitions.clear();
    this.stopAnimationLoop();
    this.hiddenLineMgr.clearAllSources();
    this.clearRelationTargets();
    this.relationState.clear();
    this.refreshRelationState();
    this.boardMgr.destroy();
    this.entityMgr.clearAll();
    this.sceneState.clearAll();
  }

  /** 触发一次完整的 JSXGraph 画板刷新。 */
  public forceUpdate(): void {
    if (this.boardMgr.board) {
      this.boardMgr.board.fullUpdate();
    }
  }

  /**
   * 安全地调整当前画板的渲染尺寸。如果在混合层或监听容器调整大小，使用此方法能避免用 `resetBoard` 导致的灾难性“死循环重建”。
   * 如果不传递 width 和 height，引擎将自动探测当前绑定的 DOM 容器实际大小进行重置。
   */
  public resize(width?: number, height?: number): void {
    const board = this.boardMgr.board;
    if (!board) return;

    let targetWidth = width;
    let targetHeight = height;

    if (targetWidth === undefined || targetHeight === undefined) {
      const container = board.containerObj;
      if (container) {
        targetWidth = targetWidth ?? container.clientWidth;
        targetHeight = targetHeight ?? container.clientHeight;
      }
    }

    if (targetWidth !== undefined && targetHeight !== undefined) {
      board.resizeContainer(targetWidth, targetHeight, true);
      this.boardMgr.syncView3DToBoard();
      board.update();
    }
  }

  /** 返回底层 JSXGraph 画板实例。若当前尚未初始化成功，则返回 null。 */
  public getBoard(): JXG.Board | null {
    return this.boardMgr.board || null;
  }

  /** 返回当前画板视口尺寸，返回值以像素为单位。 */
  public getViewport(): GraphViewport {
    const board = this.getBoard();
    return {
      width: board?.canvasWidth || 1000,
      height: board?.canvasHeight || 700
    };
  }

  /** 将二维用户坐标点投影到屏幕坐标系。若当前无法完成投影，则返回 null。 */
  public projectUserPoint(point: [number, number]): GraphScreenPoint | null {
    const board = this.getBoard();
    if (!board) return null;
    const coords = new JXG.Coords(JXG.COORDS_BY_USER, point, board);
    if (!Number.isFinite(coords.scrCoords[1]) || !Number.isFinite(coords.scrCoords[2])) return null;
    return {
      x: coords.scrCoords[1],
      y: coords.scrCoords[2]
    };
  }

  /** 借助当前 view3d 将三维点投影到屏幕坐标系。当前不在 3D 模式或无法投影时返回 null。 */
  public projectPoint3D(point: [number, number, number]): GraphScreenPoint | null {
    const board = this.getBoard();
    const view3d = this.getView3D();
    if (!board || !view3d) return null;
    const projected = view3d.project3DTo2D(point);
    if (!projected || projected.length < 2) return null;

    const userPoint: [number, number] = projected.length >= 3
      ? [projected[1], projected[2]]
      : [projected[0], projected[1]];

    return this.projectUserPoint(userPoint);
  }

  /** 投影一组二维点，并返回其屏幕包围盒。若没有有效投影点，则返回 null。 */
  public projectUserBounds(points: Array<[number, number]>): GraphScreenBounds | null {
    return this.getScreenBounds(points.map((point) => this.projectUserPoint(point)));
  }

  /** 投影一组三维点，并返回其屏幕包围盒。若没有有效投影点，则返回 null。 */
  public project3DBounds(points: Array<[number, number, number]>): GraphScreenBounds | null {
    return this.getScreenBounds(points.map((point) => this.projectPoint3D(point)));
  }

  /** 根据屏幕包围盒解析一个锚点位置。anchor 默认为 center。 */
  public getBoundsAnchor(bounds: GraphScreenBounds, anchor: GraphScreenAnchor = 'center'): GraphScreenPoint {
    const centerX = bounds.left + bounds.width / 2;
    const centerY = bounds.top + bounds.height / 2;

    switch (anchor) {
      case 'top-left':
        return { x: bounds.left, y: bounds.top };
      case 'top':
        return { x: centerX, y: bounds.top };
      case 'top-right':
        return { x: bounds.right, y: bounds.top };
      case 'left':
        return { x: bounds.left, y: centerY };
      case 'right':
        return { x: bounds.right, y: centerY };
      case 'bottom-left':
        return { x: bounds.left, y: bounds.bottom };
      case 'bottom':
        return { x: centerX, y: bounds.bottom };
      case 'bottom-right':
        return { x: bounds.right, y: bounds.bottom };
      case 'center':
      default:
        return { x: centerX, y: centerY };
    }
  }

  /** 将屏幕坐标点限制在视口内，便于悬浮 UI 不越界。padding 用于为四周预留安全边距。 */
  public clampScreenPoint(point: GraphScreenPoint, padding: GraphViewportPadding = {}): GraphScreenPoint {
    const viewport = this.getViewport();
    const left = padding.left ?? 0;
    const right = padding.right ?? 0;
    const top = padding.top ?? 0;
    const bottom = padding.bottom ?? 0;

    return {
      x: Math.max(left, Math.min(viewport.width - right, point.x)),
      y: Math.max(top, Math.min(viewport.height - bottom, point.y))
    };
  }

  private getScreenBounds(points: Array<GraphScreenPoint | null>): GraphScreenBounds | null {
    const validPoints = points.filter((point): point is GraphScreenPoint => {
      if (!point) return false;
      return Number.isFinite(point.x) && Number.isFinite(point.y);
    });

    if (validPoints.length === 0) return null;

    const xs = validPoints.map((point) => point.x);
    const ys = validPoints.map((point) => point.y);
    const left = Math.min(...xs);
    const right = Math.max(...xs);
    const top = Math.min(...ys);
    const bottom = Math.max(...ys);

    return {
      left,
      right,
      top,
      bottom,
      width: right - left,
      height: bottom - top
    };
  }

  private dispatchCapabilityChange(): void {
    const snapshot = this.getCapabilitySnapshot();
    this.capabilityListeners.forEach(listener => listener(snapshot));
  }

  private runInMutationBatch<T>(operation: () => T): T {
    const board = this.boardMgr.board;
    const isOutermostBatch = this.mutationBatchDepth === 0;

    if (isOutermostBatch) {
      board?.suspendUpdate?.();
    }

    this.mutationBatchDepth += 1;

    try {
      return operation();
    } finally {
      this.mutationBatchDepth -= 1;

      if (isOutermostBatch) {
        board?.unsuspendUpdate?.();

        if (this.pendingCapabilityNotification) {
          this.pendingCapabilityNotification = false;
          this.dispatchCapabilityChange();
        }
      }
    }
  }

  private ensureAnimationLoop(): void {
    if (this.animationFrameId !== null || this.animationTasks.size === 0) return;

    this.animationFrameId = requestAnimationFrame((timestamp) => {
      this.animationFrameId = null;
      const tasks = Array.from(this.animationTasks.entries());

      tasks.forEach(([taskId, task]) => {
        const shouldKeepRunning = task(timestamp);
        if (shouldKeepRunning === false) {
          this.animationTasks.delete(taskId);
        }
      });

      this.ensureAnimationLoop();
    });
  }

  private stopAnimationLoop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    this.animationTasks.clear();
  }

  private getUsrCoordFromEvent(event: any): [number, number] | null {
    const board = this.getBoard();
    if (!board) return null;

    let clientX = event.clientX;
    let clientY = event.clientY;
    if (clientX === undefined) {
      if (event.changedTouches && event.changedTouches.length > 0) {
        clientX = event.changedTouches[0].clientX;
        clientY = event.changedTouches[0].clientY;
      } else if (event.touches && event.touches.length > 0) {
        clientX = event.touches[0].clientX;
        clientY = event.touches[0].clientY;
      } else {
        return null;
      }
    }

    const container = board.containerObj;
    if (!container) return null;

    const rect = container.getBoundingClientRect();
    const dx = clientX - rect.left - (container.clientLeft || 0);
    const dy = clientY - rect.top - (container.clientTop || 0);
    const coords = new JXG.Coords(JXG.COORDS_BY_SCREEN, [dx, dy], board);
    if (!Number.isFinite(coords.usrCoords[1])) return null;
    return [coords.usrCoords[1], coords.usrCoords[2]];
  }

  /** 当引擎运行在 3D 模式时，返回当前激活的 JSXGraph view3d 实例。当前不是 3D 模式时通常返回 null。 */
  public getView3D(): any {
    return this.boardMgr.view3d;
  }
}
