import { EngineMode, GraphXOptions } from '../types/engine';
export type { EngineMode, GraphXOptions } from '../types/engine';
import { BoardManager } from '../board/BoardManager';
import { EntityManager } from '../entities/EntityManager';
import { Renderer } from '../rendering/Renderer';
import JXG from 'jsxgraph';
import { capabilityRegistry } from '../architecture/capabilities/registry';
import type { ShapeCapabilityTarget } from '../architecture/capabilities/contracts';
import type { GraphShapeContext, GraphShapeDefinition, GraphShapeInstance } from '../architecture/shapes/contracts';
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

export class GraphXEngine {
  private boardMgr: BoardManager;
  private entityMgr: EntityManager;
  private renderer: Renderer;
  private shapeDefinitions: Map<string, GraphShapeDefinition> = new Map();
  private shapeInstances: Map<string, GraphShapeInstance> = new Map();
  private selectedShapeId: string | null = null;
  private isClickingObject = false;
  private capabilityListeners: GraphCapabilityListener[] = [];

  constructor(containerId: string, options?: GraphXOptions) {
    this.boardMgr = new BoardManager(containerId, options);
    this.boardMgr.initBoard();

    this.entityMgr = new EntityManager();
    this.renderer = new Renderer(this.boardMgr, this.entityMgr);

    this.setupGlobalEvents();
  }

  public registerShape(definition: GraphShapeDefinition): void {
    this.shapeDefinitions.set(definition.type, definition);
    this.notifyCapabilityChange();
  }

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
      getUsrCoordFromEvent: (event) => this.getUsrCoordFromEvent(event)
    };
  }

  public subscribeCapabilities(listener: GraphCapabilityListener): () => void {
    this.capabilityListeners.push(listener);
    listener(this.getCapabilitySnapshot());
    return () => {
      this.capabilityListeners = this.capabilityListeners.filter(l => l !== listener);
    };
  }

  public getCapabilitySnapshot(): GraphCapabilitySnapshot {
    const target = this.getSelectedCapabilityTarget();

    return {
      selection: target
        ? {
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

  public getSelection(): GraphSelectionSnapshot | null {
    return this.getCapabilitySnapshot().selection;
  }

  public getCapabilities(): GraphCapabilityDescriptor[] {
    return this.getCapabilitySnapshot().capabilities;
  }

  public executeCapability(capabilityId: string, payload?: unknown): boolean {
    const target = this.getSelectedCapabilityTarget();
    if (!target) return false;
    const capability = capabilityRegistry.find(item => item.id === capabilityId && item.supports(target));
    return capability ? capability.execute(target, payload) : false;
  }

  public createShape(entityType: string, payload?: unknown): boolean {
    const definition = this.shapeDefinitions.get(entityType);
    if (!definition || !this.isShapeAvailable(definition)) return false;
    const instance = definition.createShape(this.createShapeContext(), payload);
    if (!instance) return false;
    this.addShapeInstance(instance, true);
    return true;
  }

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

  public handleDropEvent(e: DragEvent): void {
    for (const definition of this.shapeDefinitions.values()) {
      if (!this.isShapeAvailable(definition) || !definition.createFromDrop) continue;
      const instance = definition.createFromDrop(this.createShapeContext(), e);
      if (!instance) continue;
      this.addShapeInstance(instance, true);
      return;
    }
  }

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

  public resetBoard(options?: GraphXOptions): void {
    this.clearShapeInstances();
    this.boardMgr.resetBoard(options);
    this.entityMgr.clearAll();
    this.clearVariables();
    this.setupGlobalEvents();
    this.notifyCapabilityChange();
  }

  public clearVariables(): void {
    this.renderer.mathScope.clear();
  }

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

  public removeCommand(id: string): void {
    if (!this.boardMgr.board) return;
    this.entityMgr.removeCommandElements(id, this.boardMgr.board);
  }

  public clearBoard(): void {
    this.resetBoard();
  }

  public destroy(): void {
    this.clearShapeInstances();
    this.shapeDefinitions.clear();
    this.boardMgr.destroy();
    this.entityMgr.clearAll();
    this.notifyCapabilityChange();
  }

  public forceUpdate(): void {
    if (this.boardMgr.board) {
      this.boardMgr.board.fullUpdate();
    }
  }

  public getBoard(): JXG.Board | null {
    return this.boardMgr.board || null;
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

  public getView3D(): any {
    return this.boardMgr.view3d;
  }
}
