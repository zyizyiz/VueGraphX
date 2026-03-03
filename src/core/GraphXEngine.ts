import { EngineMode, GraphXOptions } from './types';
export type { EngineMode, GraphXOptions } from './types';
import { BoardManager } from './BoardManager';
import { EntityManager } from './EntityManager';
import { Renderer } from './Renderer';

/**
 * GraphXEngine (纯图形渲染引擎 - 架构门面 Facade)
 * 架构定位：核心调用入口
 * 经过深度解耦重构后，本机不再承担具体的正则拼接、数学解析或底板状态管控。
 * 将庞杂的命令调度、生命周期维护和图形工厂全部委派给对应专门的 Manager。
 */
export class GraphXEngine {
  private boardMgr: BoardManager;
  private entityMgr: EntityManager;
  private renderer: Renderer;

  constructor(containerId: string, options?: GraphXOptions) {
    this.boardMgr = new BoardManager(containerId, options);
    this.boardMgr.initBoard(); // 确保安全初始化完成底板
    
    this.entityMgr = new EntityManager();
    this.renderer = new Renderer(this.boardMgr, this.entityMgr);
  }

  /**
   * 修改模式并重启画布
   * @param options 可选的新一轮重置全局属性透传（如果不传则沿用上一次设置的属性）
   */
  public setMode(mode: EngineMode, options?: GraphXOptions): void {
    const isRestarted = this.boardMgr.setMode(mode, options);
    if (isRestarted) {
      // 模式硬切换后，需要放生所有曾被追踪的实体句柄，防止空指针或内存泄漏
      this.entityMgr.clearAll();
      this.clearVariables();
    }
  }

  /**
   * 完全重置画板：这是一种比 clearBoard 更安全暴力的行为
   * 用于解决 JSXGraph 里因为 removeObject 破坏内部子元素级联生命周期导致的组件无渲染问题
   */
  public resetBoard(options?: GraphXOptions): void {
    this.boardMgr.resetBoard(options);
    this.entityMgr.clearAll();
    this.clearVariables();
  }

  /**
   * 清除运行时引擎在整个生命周期内记录的数学作用域及定义的变量
   */
  public clearVariables(): void {
    this.renderer.mathScope.clear();
  }

  /**
   * 指令执行接口 (对外暴露的主执行阀)
   * 门面逻辑：清空旧图元 -> 交给大纲 -> 要求 Renderer 执行解析与渲染 -> 将产出丢给 EntityManager 登记
   * 
   * @param id 指令的识别ID
   * @param expression 纯文本表达式
   * @param color UI 期望赋予的渲染颜色
   * @param extraOptions 上层外部透传的客制化额外 JSXGraph 属性（如 fillColor, strokeWidth 等）
   */
  public executeCommand(id: string, expression: string, color: string = '#0ea5e9', extraOptions?: any): void {
    // 每次执行前清理该 Id 下所属全部旧数据，形成【替换重绘】逻辑以响应实时输入
    this.removeCommand(id);
    
    if (!expression || expression.trim() === '') return;
    const pureExp = expression.trim();
    const elements: any[] = [];

    try {
      if (this.boardMgr.mode === '2d' || this.boardMgr.mode === 'geometry') {
        elements.push(...this.renderer.parseAndRender2D(pureExp, color, extraOptions));
      } else if (this.boardMgr.mode === '3d') {
        elements.push(...this.renderer.parseAndRender3D(pureExp, color, extraOptions));
      }
      
      // 添加引用登记
      this.entityMgr.registerCommandElements(id, elements);
    } catch (e: any) {
      console.warn(`[GraphXEngine] 解析指令失败: ${pureExp}`, e);
      throw new Error(e.message || '引擎无法解析该语句格式');
    }
  }

  /**
   * 抹除特定ID所创造的所有实体
   */
  public removeCommand(id: string): void {
    if (!this.boardMgr.board) return;
    this.entityMgr.removeCommandElements(id, this.boardMgr.board);
  }

  /**
   * 废弃并清理整个画板内容
   * （现已代理为暴力洗板方式 resetBoard）
   */
  public clearBoard(): void {
    this.resetBoard();
  }

  /**
   * 销毁并终结整个引擎的系统生命周期
   */
  public destroy(): void {
    this.boardMgr.destroy();
    this.entityMgr.clearAll();
  }

  /**
   * 强制同步重绘画板渲染树
   */
  public forceUpdate(): void {
    if (this.boardMgr.board) {
      this.boardMgr.board.fullUpdate();
    }
  }
}
