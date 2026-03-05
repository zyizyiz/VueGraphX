import JXG from 'jsxgraph';
import { EngineMode, GraphXOptions, JXGView3D } from '../types/engine';

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
      showCopyright: false,
    };

    if (this.mode === '3d') {
      defaultOptions.boundingbox = [-8, 8, 8, -8];
    }

    if (this.mode === 'geometry') {
      defaultOptions.axis = false;
      defaultOptions.showNavigation = false;
    }

    this.board = JXG.JSXGraph.initBoard(this.containerId, { ...defaultOptions, ...this.globalOptions });

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

  public setMode(mode: EngineMode, options?: GraphXOptions): boolean {
    if (this.mode === mode && !options) return false;
    this.mode = mode;
    if (options !== undefined) {
      this.globalOptions = options;
    }
    this.initBoard();
    return true;
  }

  public resetBoard(options?: GraphXOptions): void {
    if (options !== undefined) {
      this.globalOptions = options;
    }
    this.initBoard();
  }

  public destroy(): void {
    if (this.board) {
      JXG.JSXGraph.freeBoard(this.board);
    }
  }
}
