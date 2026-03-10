import JXG from 'jsxgraph';
import { EngineMode, GraphXOptions, JXGView3D } from '../types/engine';

/**
 * 供公共引擎门面调用的底层画板生命周期管理器。
 */
export class BoardManager {
  public board!: JXG.Board;
  public view3d: JXGView3D | null = null;
  public mode: EngineMode = '2d';

  private containerId: string;
  private globalOptions?: GraphXOptions;

  /**
   * 创建一个绑定到指定 DOM 容器 id 的画板管理器。
   */
  constructor(containerId: string, options?: GraphXOptions) {
    this.containerId = containerId;
    this.globalOptions = options;
    this.applyGlobalJSXGraphOptions();
    this.injectCoreStyles();
  }

  private applyGlobalJSXGraphOptions(): void {
    // 全局禁用高亮
    JXG.Options.elements.highlight = false;
  }

  private injectCoreStyles(): void {
    const styleId = 'vuegraphx-core-styles';
    if (document.getElementById(styleId)) return;
    const styleEl = document.createElement('style');
    styleEl.id = styleId;
    styleEl.innerHTML = `
      .jxgbox { position: relative; overflow: hidden; touch-action: none; }
      .jxgbox :focus { outline: none !important; }
      .JXGtext { position: absolute; white-space: nowrap; pointer-events: none; }
      .JXGimage { position: absolute; pointer-events: none; }
    `;
    document.head.appendChild(styleEl);
  }

  /**
   * 使用当前模式与配置初始化或重建 JSXGraph 画板。
   */
  public initBoard(): void {
    if (this.board) {
      JXG.JSXGraph.freeBoard(this.board);
      this.view3d = null;
    }

    const dragEnabled = this.globalOptions?.drag?.enabled !== false;
    const defaultMoveTarget = dragEnabled ? document : null;

    const defaultOptions = {
      boundingbox: [-10, 10, 10, -10] as [number, number, number, number],
      axis: true,
      showNavigation: true,
      keepaspectratio: true,
      showCopyright: false,
      moveTarget: defaultMoveTarget,
      selection: {
        enabled: false,
        needShift: true
      }
    };

    if (this.mode === '3d') {
      defaultOptions.boundingbox = [-8, 8, 8, -8];
    }

    if (this.mode === 'geometry') {
      defaultOptions.axis = false;
      defaultOptions.showNavigation = false;
    }

    const view3DOptions = this.globalOptions?.view3D;
    const boardOptions = { ...this.globalOptions };
    delete (boardOptions as Partial<GraphXOptions>).view3D;

    this.board = JXG.JSXGraph.initBoard(this.containerId, { ...defaultOptions, ...boardOptions });

    if (this.mode === '3d') {
      const viewRect = view3DOptions?.rect ?? [[-6, -3], [8, 8], [[-5, 5], [-5, 5], [-5, 5]]];
      const viewAttributes = {
        xPlaneElements: { visible: false },
        yPlaneElements: { visible: false },
        ...(view3DOptions?.attributes ?? {})
      };

      this.view3d = this.board.create('view3d',
        viewRect,
        viewAttributes
      ) as JXGView3D;
    }
  }

  /**
   * 切换画板模式，并可选地替换全局画板配置。
   */
  public setMode(mode: EngineMode, options?: GraphXOptions): boolean {
    if (this.mode === mode && !options) return false;
    this.mode = mode;
    if (options !== undefined) {
      this.globalOptions = options;
    }
    this.initBoard();
    return true;
  }

  /**
   * 在保留当前模式的前提下重建画板。
   */
  public resetBoard(options?: GraphXOptions): void {
    if (options !== undefined) {
      this.globalOptions = options;
    }
    this.initBoard();
  }

  /**
   * 释放底层 JSXGraph 画板资源。
   */
  public destroy(): void {
    if (this.board) {
      JXG.JSXGraph.freeBoard(this.board);
    }
  }
}
