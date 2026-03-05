import JXG from 'jsxgraph';
import type { GraphXEngine } from '../GraphXEngine';
import { EngineMode } from '../../types/engine';

export type StateChangeListener<T> = (state: T) => void;

export abstract class BaseDesignerPlugin<StateType = any> {
  public name: string = 'UnnamedPlugin';
  public requiredMode: EngineMode | EngineMode[] | 'all' = 'all';
  public isActive: boolean = false;

  protected engine: GraphXEngine | null = null;
  protected state: StateType;
  private listeners: StateChangeListener<StateType>[] = [];

  constructor(initialState: StateType) {
    this.state = initialState;
  }

  public install(engine: GraphXEngine): void {
    if (this.isActive) return;
    this.engine = engine;
    this.isActive = true;
    this.onInstall();
  }

  public uninstall(): void {
    if (!this.isActive) return;
    this.onUninstall();
    this.isActive = false;
    this.engine = null;
  }

  protected get board(): JXG.Board | null {
    return this.engine ? this.engine.getBoard() : null;
  }

  public subscribe(listener: StateChangeListener<StateType>): () => void {
    this.listeners.push(listener);
    // 立即推送当前状态
    listener(this.state);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  protected setState(partialState: Partial<StateType>): void {
    this.state = { ...this.state, ...partialState };
    this.notifyStateChange();
  }

  protected getState(): StateType {
    return this.state;
  }

  protected notifyStateChange(): void {
    this.listeners.forEach(l => l(this.state));
  }

  // 生命周期钩子，供子类重写
  protected onInstall(): void {}
  protected onUninstall(): void {}

  // 引擎事件接收钩子
  public onBoardDown(_e: any, _isClickingObject: boolean): void {}
  public onBoardUp(_e: any, _isClickingObject: boolean): void {}
  public onBoardUpdate(): void {}
  public onDrop(_e: DragEvent): void {}

  // 辅助方法：屏幕坐标转逻辑坐标
  protected getUsrCoordFromEvent(e: any): [number, number] | null {
    if (!this.board) return null;
    let cx = e.clientX;
    let cy = e.clientY;
    if (cx === undefined) {
      if (e.changedTouches && e.changedTouches.length > 0) {
        cx = e.changedTouches[0].clientX;
        cy = e.changedTouches[0].clientY;
      } else if (e.touches && e.touches.length > 0) {
        cx = e.touches[0].clientX;
        cy = e.touches[0].clientY;
      } else {
        return null;
      }
    }

    const cont = this.board.containerObj;
    if (!cont) return null;
    const rect = cont.getBoundingClientRect();
    const dx = cx - rect.left - (cont.clientLeft || 0);
    const dy = cy - rect.top - (cont.clientTop || 0);

    const coords = new JXG.Coords(JXG.COORDS_BY_SCREEN, [dx, dy], this.board);
    if (!Number.isFinite(coords.usrCoords[1])) return null;
    return [coords.usrCoords[1], coords.usrCoords[2]];
  }

  // 安全删除 JXG 对象
  protected removeObjectSafe(obj: any): void {
    try {
      if (this.board && obj) this.board.removeObject(obj);
    } catch {
      // ignore
    }
  }

  protected uid(prefix: string = 'id'): string {
    return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  }
}
