import JXG from 'jsxgraph';
import { EngineMode, GraphXOptions, JXGView3D } from '../types/engine';
import jsxgraphCssText from '../../node_modules/jsxgraph/distrib/jsxgraph.css?inline';

type View3DRect = NonNullable<NonNullable<GraphXOptions['view3D']>['rect']>;

const DEFAULT_VIEW3D_RECT: View3DRect = [[-6, -3], [8, 8], [[-5, 5], [-5, 5], [-5, 5]]];

const cloneView3DRect = (rect: View3DRect): View3DRect => [
  [...rect[0]] as [number, number],
  [...rect[1]] as [number, number],
  rect[2].map((range) => [...range] as [number, number]) as [[number, number], [number, number], [number, number]]
];

const scaleRangeAroundCenter = ([min, max]: [number, number], scale: number): [number, number] => {
  const center = (min + max) / 2;
  const halfSpan = ((max - min) / 2) * scale;
  return [center - halfSpan, center + halfSpan];
};

export const buildAdaptiveView3DRect = (
  boardBoundingBox: [number, number, number, number],
  baseRect: View3DRect
): View3DRect => {
  const [left, top, right, bottom] = boardBoundingBox;
  const width = right - left;
  const height = top - bottom;
  const baseWidth = baseRect[1][0];
  const baseHeight = baseRect[1][1];
  const scaleX = Math.abs(baseWidth) > 1e-6 ? width / baseWidth : 1;
  const scaleY = Math.abs(baseHeight) > 1e-6 ? height / baseHeight : 1;

  return [
    [left, bottom],
    [width, height],
    [
      scaleRangeAroundCenter(baseRect[2][0], scaleX),
      scaleRangeAroundCenter(baseRect[2][1], scaleY),
      [...baseRect[2][2]] as [number, number]
    ]
  ];
};

/**
 * 供公共引擎门面调用的底层画板生命周期管理器。
 */
export class BoardManager {
  public board!: JXG.Board;
  public view3d: JXGView3D | null = null;
  public mode: EngineMode = '2d';

  private containerId: string;
  private globalOptions?: GraphXOptions;
  private baseView3DRect: View3DRect = cloneView3DRect(DEFAULT_VIEW3D_RECT);

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
      ${jsxgraphCssText}
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

    if (this.mode === '3d' && view3DOptions?.fitToBoard) {
      this.board.on('boundingbox', () => {
        this.syncView3DToBoard();
      });
    }

    if (this.mode === '3d') {
      const viewRect = cloneView3DRect(view3DOptions?.rect ?? DEFAULT_VIEW3D_RECT);
      this.baseView3DRect = cloneView3DRect(viewRect);
      const viewAttributes = {
        xPlaneElements: { visible: false },
        yPlaneElements: { visible: false },
        ...(view3DOptions?.attributes ?? {})
      };

      this.view3d = this.board.create('view3d',
        viewRect,
        viewAttributes
      ) as JXGView3D;

      this.syncView3DToBoard();
    }
  }

  public syncView3DToBoard(): void {
    if (this.mode !== '3d' || !this.board || !this.view3d || !this.globalOptions?.view3D?.fitToBoard) {
      return;
    }

    const boardBoundingBox = this.board.getBoundingBox();
    if (!boardBoundingBox || boardBoundingBox.length < 4) return;

    const adaptiveRect = buildAdaptiveView3DRect(
      boardBoundingBox as [number, number, number, number],
      this.baseView3DRect
    );

    this.view3d.llftCorner = adaptiveRect[0];
    this.view3d.size = adaptiveRect[1];
    this.view3d.bbox3D = adaptiveRect[2];
    this.view3d.update?.();
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
