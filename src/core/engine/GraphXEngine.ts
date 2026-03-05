import { EngineMode, GraphXOptions } from '../types/engine';
export type { EngineMode, GraphXOptions } from '../types/engine';
import { BoardManager } from '../board/BoardManager';
import { EntityManager } from '../entities/EntityManager';
import { Renderer } from '../rendering/Renderer';
import JXG from 'jsxgraph';
import { BaseDesignerPlugin } from './plugins/BaseDesignerPlugin';
import { CubeDesignerPlugin } from './plugins/CubeDesignerPlugin';

export class GraphXEngine {
  private boardMgr: BoardManager;
  private entityMgr: EntityManager;
  private renderer: Renderer;
  public plugins: Map<string, BaseDesignerPlugin> = new Map();
  private isClickingObject = false;

  constructor(containerId: string, options?: GraphXOptions) {
    this.boardMgr = new BoardManager(containerId, options);
    this.boardMgr.initBoard();

    this.entityMgr = new EntityManager();
    this.renderer = new Renderer(this.boardMgr, this.entityMgr);

    this.setupGlobalEvents();
    
    // 初始化默认的 Cube 设计器插件（预装载）
    this.registerPlugin('cube', new CubeDesignerPlugin());
  }

  public registerPlugin(name: string, plugin: BaseDesignerPlugin): void {
    if (this.plugins.has(name)) {
      this.plugins.get(name)?.uninstall();
    }
    // 把名字与插件实例同步，强制约束字典与对象一致
    plugin.name = name;
    this.plugins.set(name, plugin);
    
    // 不再注册即装载，而是交由系统依据当前模式和规则尝试装载
    this.evaluatePluginActivation(plugin);
  }

  // --- 动态控制 API: 允许外部主动启用 ---
  public enablePlugin(name: string): void {
    const p = this.plugins.get(name);
    if (p && !p.isActive) {
      p.install(this);
    }
  }

  // --- 动态控制 API: 允许外部主动停用 ---
  public disablePlugin(name: string): void {
    const p = this.plugins.get(name);
    if (p && p.isActive) {
      p.uninstall();
    }
  }

  /**
   * 判断并激活插件。只有当插件约束 `requiredMode` 为 'all' 
   * 或恰好匹配当前 engine 工作模式时，才会执行唤起 `install()`。
   * 其他情况强制让其 `uninstall()` 隔离休眠。
   */
  private evaluatePluginActivation(plugin: BaseDesignerPlugin): void {
    const currentMode = this.boardMgr.mode;
    const isModeMatched = plugin.requiredMode === 'all' ||
      (Array.isArray(plugin.requiredMode) 
        ? plugin.requiredMode.includes(currentMode) 
        : plugin.requiredMode === currentMode);
        
    if (isModeMatched) {
      if (!plugin.isActive) plugin.install(this);
    } else {
      if (plugin.isActive) plugin.uninstall();
    }
  }

  private evaluateAllPlugins(): void {
    this.plugins.forEach(p => this.evaluatePluginActivation(p));
  }

  public getPlugin<T extends BaseDesignerPlugin>(name: string): T | undefined {
    return this.plugins.get(name) as T | undefined;
  }

  private setupGlobalEvents(): void {
    const board = this.boardMgr.board;
    if (!board) return;

    board.on('down', (e: any) => {
      const objs = board.getAllObjectsUnderMouse(e) || [];
      this.isClickingObject = objs.filter((o: any) => o.elType !== 'image').length > 0;
      // 仅向处在激活状态下的插件派发事件
      this.plugins.forEach(p => {
        if (p.isActive) p.onBoardDown(e, this.isClickingObject);
      });
    });

    board.on('up', (e: any) => {
      if (this.isEventFromDesignerUI(e)) return;
      this.plugins.forEach(p => {
        if (p.isActive) p.onBoardUp(e, this.isClickingObject);
      });
    });

    board.on('update', () => {
      this.plugins.forEach(p => {
        if (p.isActive) p.onBoardUpdate();
      });
    });
  }

  private isEventFromDesignerUI(e: any): boolean {
    const target = (e?.target ?? e?.srcElement) as EventTarget | null;
    if (!target || !(target instanceof Element)) return false;
    return !!target.closest('[data-designer-ui="true"]');
  }

  public handleDropEvent(e: DragEvent): void {
    this.plugins.forEach(p => p.onDrop(e));
  }

  public setMode(mode: EngineMode, options?: GraphXOptions): void {
    const isRestarted = this.boardMgr.setMode(mode, options);
    if (isRestarted) {
      this.plugins.forEach(p => p.uninstall());
      this.entityMgr.clearAll();
      this.clearVariables();
      this.setupGlobalEvents();
      // 基于当前新的 mode，智能评估应该唤醒哪些插件
      this.evaluateAllPlugins();
    }
  }

  public resetBoard(options?: GraphXOptions): void {
    this.plugins.forEach(p => p.uninstall());
    this.boardMgr.resetBoard(options);
    this.entityMgr.clearAll();
    this.clearVariables();
    this.setupGlobalEvents();
    // 画板重置后重新依规激活插件
    this.evaluateAllPlugins();
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
    this.plugins.forEach(p => p.uninstall());
    this.plugins.clear();
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
