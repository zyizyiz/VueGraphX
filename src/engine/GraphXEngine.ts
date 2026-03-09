import { EngineMode, GraphXOptions } from '../types/engine';
export type { EngineMode, GraphXOptions } from '../types/engine';
import { BoardManager } from '../board/BoardManager';
import { EntityManager } from '../entities/EntityManager';
import { Renderer } from '../rendering/Renderer';
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
  GraphCapabilityDescriptor,
  GraphCapabilityListener,
  GraphCapabilitySnapshot,
  GraphSelectionSnapshot
} from '../types/capabilities';

export type {
  GraphCapabilityDescriptor,
  GraphCapabilityListener,
  GraphCapabilitySnapshot,
  GraphSelectionSnapshot
} from '../types/capabilities';

export type { GraphShapeContext, GraphShapeDefinition, GraphShapeInstance } from '../architecture/shapes/contracts';
export type { ShapeCapabilityTarget } from '../architecture/capabilities/contracts';

/**
 * 面向使用方的公共引擎门面，负责画板生命周期、指令渲染、图形注册与能力执行。
 */
export class GraphXEngine {
  private boardMgr: BoardManager;
  private entityMgr: EntityManager;
  private renderer: Renderer;
  private shapeDefinitions: Map<string, GraphShapeDefinition> = new Map();
  private shapeInstances: Map<string, GraphShapeInstance> = new Map();
  private animationTasks: Map<string, (timestamp: number) => boolean | void> = new Map();
  private animationFrameId: number | null = null;
  private selectedShapeId: string | null = null;
  private isClickingObject = false;
  private capabilityListeners: GraphCapabilityListener[] = [];

  /** 创建一个绑定到指定 DOM 容器 id 的引擎实例。containerId 指向目标 DOM 容器，该容器应当已经具备明确的宽高，options 会在初始化画板时透传给 JSXGraph。 */
  constructor(containerId: string, options?: GraphXOptions) {
    this.boardMgr = new BoardManager(containerId, options);
    this.boardMgr.initBoard();

    this.entityMgr = new EntityManager();
    this.renderer = new Renderer(this.boardMgr, this.entityMgr);

    this.setupGlobalEvents();
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

  private createShapeContext(): GraphShapeContext {
    return {
      engine: this,
      board: this.getBoard(),
      selectShape: (shapeId) => this.selectShape(shapeId),
      isShapeSelected: (shapeId) => this.selectedShapeId === shapeId,
      addShape: (instance) => this.addShapeInstance(instance),
      removeShape: (shapeId) => this.removeShapeInstance(shapeId),
      notifyChange: () => this.notifyCapabilityChange(),
      generateId: (prefix) => `${prefix}_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
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

  /** 根据已注册的图形类型创建一个实例。entityType 对应注册时 definition.type，payload 会透传给图形定义的 createShape；返回 true 表示创建成功，否则表示当前类型不存在、当前模式不可用或定义主动拒绝创建。 */
  public createShape(entityType: string, payload?: unknown): boolean {
    const definition = this.shapeDefinitions.get(entityType);
    if (!definition || !this.isShapeAvailable(definition)) return false;
    const instance = definition.createShape(this.createShapeContext(), payload);
    if (!instance) return false;
    this.addShapeInstance(instance, true);
    return true;
  }

  /** 主动通知能力订阅者拉取一份新的快照。一般由引擎内部在状态变化后自动调用，图形作者通常通过 context.notifyChange 或 api.notifyChange 间接触发。 */
  public notifyCapabilityChange(): void {
    const snapshot = this.getCapabilitySnapshot();
    this.capabilityListeners.forEach(listener => listener(snapshot));
  }

  private addShapeInstance(instance: GraphShapeInstance, select = false): void {
    this.shapeInstances.set(instance.id, instance);
    if (select) {
      this.selectShape(instance.id);
      return;
    }
    this.notifyCapabilityChange();
  }

  private removeShapeInstance(shapeId: string): void {
    const instance = this.shapeInstances.get(shapeId);
    if (!instance) return;
    if (this.selectedShapeId === shapeId) {
      this.selectedShapeId = null;
      instance.setSelected(false);
    }
    instance.destroy();
    this.shapeInstances.delete(shapeId);
    this.notifyCapabilityChange();
  }

  private clearShapeInstances(): void {
    this.shapeInstances.forEach((instance) => instance.destroy());
    this.shapeInstances.clear();
    this.selectedShapeId = null;
  }

  private selectShape(shapeId: string | null): void {
    if (this.selectedShapeId === shapeId) return;

    const previous = this.selectedShapeId ? this.shapeInstances.get(this.selectedShapeId) : null;
    this.selectedShapeId = shapeId;
    previous?.setSelected(false);

    if (shapeId) {
      this.shapeInstances.get(shapeId)?.setSelected(true);
      return;
    }

    this.notifyCapabilityChange();
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
    });
  }

  private isEventFromDesignerUI(e: any): boolean {
    const target = (e?.target ?? e?.srcElement) as EventTarget | null;
    if (!target || !(target instanceof Element)) return false;
    return !!target.closest('[data-designer-ui="true"]');
  }

  /** 让已注册图形有机会基于拖拽事件创建实例。第一个返回非空实例的图形定义会接管这次拖拽创建。 */
  public handleDropEvent(e: DragEvent): void {
    for (const definition of this.shapeDefinitions.values()) {
      if (!this.isShapeAvailable(definition) || !definition.createFromDrop) continue;
      const instance = definition.createFromDrop(this.createShapeContext(), e);
      if (!instance) continue;
      this.addShapeInstance(instance, true);
      return;
    }
  }

  /** 切换引擎模式，并在需要时重建画板。切换模式会清空当前 shape 实例、命令渲染结果以及数学变量；如果传入 options，则会替换当前全局画板配置。 */
  public setMode(mode: EngineMode, options?: GraphXOptions): void {
    const isRestarted = this.boardMgr.setMode(mode, options);
    if (isRestarted) {
      this.clearShapeInstances();
      this.entityMgr.clearAll();
      this.clearVariables();
      this.setupGlobalEvents();
      this.notifyCapabilityChange();
    }
  }

  /** 重建画板并清空当前运行时状态。如果传入 options，则会替换当前全局画板配置。 */
  public resetBoard(options?: GraphXOptions): void {
    this.clearShapeInstances();
    this.boardMgr.resetBoard(options);
    this.entityMgr.clearAll();
    this.clearVariables();
    this.setupGlobalEvents();
    this.notifyCapabilityChange();
  }

  /** 清空共享数学作用域中的变量。 */
  public clearVariables(): void {
    this.renderer.mathScope.clear();
  }

  /** 执行一条表达式或指令，并将生成的元素记录到指定 id 下。相同 id 的命令会先移除旧结果再重新渲染，color 和 extraOptions 会继续透传给底层渲染器。 */
  public executeCommand(id: string, expression: string, color: string = '#0ea5e9', extraOptions?: any): void {
    this.removeCommand(id);

    if (!expression || expression.trim() === '') return;
    const pureExp = expression.trim();

    try {
      const elements = this.renderer.render(this.boardMgr.mode, pureExp, color, extraOptions);
      this.entityMgr.registerCommandElements(id, elements);
    } catch (e: any) {
      console.warn(`[GraphXEngine] 解析指令失败: ${pureExp}`, e);
      throw new Error(e.message || '引擎无法解析该语句格式');
    }
  }

  /** 移除某个指令 id 关联的全部渲染元素。 */
  public removeCommand(id: string): void {
    if (!this.boardMgr.board) return;
    this.entityMgr.removeCommandElements(id, this.boardMgr.board);
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
    this.boardMgr.destroy();
    this.entityMgr.clearAll();
    this.notifyCapabilityChange();
  }

  /** 触发一次完整的 JSXGraph 画板刷新。 */
  public forceUpdate(): void {
    if (this.boardMgr.board) {
      this.boardMgr.board.fullUpdate();
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
    return this.projectUserPoint([projected[0], projected[1]]);
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
