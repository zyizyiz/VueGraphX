import JXG from 'jsxgraph';
import { EngineMode, GraphXOptions, JXGView3D } from './types';

/**
 * BoardManager: JSXGraph 视图与画布基底生命周期控制器
 * 职责：
 * 1. 负责实例化底层的 2D Board 和 3D View
 * 2. 隔离并处理画板的销毁与参数注入
 * 3. 作为单例持有者下发基础组件句柄
 */
export class BoardManager {
  public board!: JXG.Board;
  public view3d: JXGView3D | null = null;
  public mode: EngineMode = '2d';
  
  private containerId: string;
  private globalOptions?: GraphXOptions;

  constructor(containerId: string, options?: GraphXOptions) {
    this.containerId = containerId;
    this.globalOptions = options;
    this.injectCoreStyles();
  }

  /**
   * 自动在容器注入规避样式异常的 CSS 代码
   */
  private injectCoreStyles(): void {
    const styleId = 'vuegraphx-core-styles';
    if (document.getElementById(styleId)) return;
    const styleEl = document.createElement('style');
    styleEl.id = styleId;
    styleEl.innerHTML = `
      .jxgbox { position: relative; overflow: hidden; touch-action: none; }
      .JXGtext { position: absolute; white-space: nowrap; pointer-events: none; }
      .JXGimage { position: absolute; pointer-events: none; }
    `;
    document.head.appendChild(styleEl);
  }

  /**
   * 初始化 / 重构对应特征模式的全局 Board
   */
  public initBoard(): void {
    if (this.board) {
      JXG.JSXGraph.freeBoard(this.board);
      this.view3d = null;
    }

    const defaultOptions = {
      boundingbox: [-10, 10, 10, -10] as [number, number, number, number],
      axis: true,
      showNavigation: true,
      keepaspectratio: true,
      showCopyright: false, // 隐藏默认的 jsxgraph 左上角水印，使得画板更彻底的融为自主产品
    };
    
    // 对于 3D 模式，JSXGraph 的底板边界范围配置略有不同
    if (this.mode === '3d') {
      defaultOptions.boundingbox = [-8, 8, 8, -8];
    }
    
    // 对于 几何区 模式，抹去坐标轴体系，强调欧几里得几何白板画布
    if (this.mode === 'geometry') {
      defaultOptions.axis = false;
      defaultOptions.showNavigation = false;
    }
    
    // 合并应用系统默认特征与用户构建时注入的覆盖特征
    this.board = JXG.JSXGraph.initBoard(this.containerId, { ...defaultOptions, ...this.globalOptions });

    // 如果处于 3D 模式，额外初始化 3D 视图层，为挂载点准备三维投影矩阵
    if (this.mode === '3d') {
      this.view3d = this.board.create('view3d',
        [[-6, -3], [8, 8],
         [[-5, 5], [-5, 5], [-5, 5]]],
        {
          xPlaneElements: { visible: false },
          yPlaneElements: { visible: false },
        }
      ) as JXGView3D;
    }
  }

  /**
   * 修改模式并重启画布
   * 若确实发生改变则返回 true 指示上层清理上下文
   */
  public setMode(mode: EngineMode, options?: GraphXOptions): boolean {
    if (this.mode === mode && !options) return false;
    this.mode = mode;
    if (options !== undefined) {
      this.globalOptions = options; // 允许运行时由外部替换整体参数覆盖集
    }
    this.initBoard(); // 模式切换需要硬重启 Board 绑定基底
    return true;
  }

  /**
   * 完全重置画板：这是一种比 clearBoard 更安全暴力的行为
   */
  public resetBoard(options?: GraphXOptions): void {
    if (options !== undefined) {
      this.globalOptions = options;
    }
    this.initBoard();
  }

  /**
   * 彻底摧毁释放所有挂载的绘图元素、回收 WebGL 和 DOM
   */
  public destroy(): void {
    if (this.board) {
      JXG.JSXGraph.freeBoard(this.board);
    }
  }
}
