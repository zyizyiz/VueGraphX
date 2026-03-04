import { EngineMode, GraphXOptions } from '../types/engine';
export type { EngineMode, GraphXOptions } from '../types/engine';
import { BoardManager } from '../board/BoardManager';
import { EntityManager } from '../entities/EntityManager';
import { Renderer } from '../rendering/Renderer';
import JXG from 'jsxgraph';

export class GraphXEngine {
  private boardMgr: BoardManager;
  private entityMgr: EntityManager;
  private renderer: Renderer;

  constructor(containerId: string, options?: GraphXOptions) {
    this.boardMgr = new BoardManager(containerId, options);
    this.boardMgr.initBoard();

    this.entityMgr = new EntityManager();
    this.renderer = new Renderer(this.boardMgr, this.entityMgr);
  }

  public setMode(mode: EngineMode, options?: GraphXOptions): void {
    const isRestarted = this.boardMgr.setMode(mode, options);
    if (isRestarted) {
      this.entityMgr.clearAll();
      this.clearVariables();
    }
  }

  public resetBoard(options?: GraphXOptions): void {
    this.boardMgr.resetBoard(options);
    this.entityMgr.clearAll();
    this.clearVariables();
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
    this.boardMgr.destroy();
    this.entityMgr.clearAll();
  }

  public forceUpdate(): void {
    if (this.boardMgr.board) {
      this.boardMgr.board.fullUpdate();
    }
  }

  public getBoard(): JXG.Board | null {
    return this.boardMgr.board || null;
  }

  public getView3D(): any {
    return this.boardMgr.view3d;
  }
}
