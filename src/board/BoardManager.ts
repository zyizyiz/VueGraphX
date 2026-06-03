import JXG from 'jsxgraph';
import {
  createCenteredWorldBoundsForViewportGrid,
  resolveGraphViewportGridOptions,
  resolveGraphViewportGridStep,
  type ResolvedGraphViewportGridOptions
} from '@vuegraphx/core';
import { EngineMode, GraphXOptions, JXGView3D } from '../types/engine';
import jsxgraphCssText from '../../node_modules/jsxgraph/distrib/jsxgraph.css?inline';

type View3DRect = NonNullable<NonNullable<GraphXOptions['view3D']>['rect']>;
type WheelGestureKind = 'zoom' | 'pan' | 'ignore';
type WheelGestureLikeEvent = Pick<WheelEvent, 'ctrlKey' | 'metaKey' | 'deltaMode'>;
const WHEEL_DELTA_PIXEL = 0;
const JSXGRAPH_STANDARD_DASH_INDEX = 2;
const JSXGRAPH_STANDARD_DASH_PATTERN = [4, 8] as const;

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

export const shouldUseTrackpadGestureBridge = (options?: GraphXOptions): boolean => (
  options?.pan?.enabled !== false && options?.pan?.needTwoFingers === true
);

export const classifyWheelGesture = (
  event: WheelGestureLikeEvent,
  options?: GraphXOptions
): WheelGestureKind => {
  const zoomEnabled = options?.zoom?.enabled !== false;
  const wheelZoomEnabled = options?.zoom?.wheel !== false;

  if ((event.ctrlKey || event.metaKey) && zoomEnabled) {
    return 'zoom';
  }

  if (shouldUseTrackpadGestureBridge(options) && event.deltaMode === WHEEL_DELTA_PIXEL) {
    return 'pan';
  }

  if (zoomEnabled && wheelZoomEnabled) {
    return 'zoom';
  }

  return 'ignore';
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
  private disposeTrackpadGestureBridge: (() => void) | null = null;
  private disposeGridSync: (() => void) | null = null;

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

  private configureStandardDashPattern(): void {
    const dashArray = (this.board as { renderer?: { dashArray?: number[][] } } | undefined)?.renderer?.dashArray;
    if (!Array.isArray(dashArray)) return;
    dashArray[JSXGRAPH_STANDARD_DASH_INDEX - 1] = [...JSXGRAPH_STANDARD_DASH_PATTERN];
  }

  private injectCoreStyles(): void {
    const styleId = 'vuegraphx-core-styles';
    if (document.getElementById(styleId)) return;
    const styleEl = document.createElement('style');
    styleEl.id = styleId;
    styleEl.innerHTML = `
      ${jsxgraphCssText}
      .jxgbox { position: relative; overflow: hidden; touch-action: none; }
      .jxgbox.vuegraphx-grid-enabled {
        background-color: var(--vuegraphx-grid-background, #F8FAFC);
        background-image:
          linear-gradient(to right, var(--vuegraphx-grid-line-color, rgba(148, 163, 184, 0.18)) var(--vuegraphx-grid-line-width, 1px), transparent var(--vuegraphx-grid-line-width, 1px)),
          linear-gradient(to bottom, var(--vuegraphx-grid-line-color, rgba(148, 163, 184, 0.18)) var(--vuegraphx-grid-line-width, 1px), transparent var(--vuegraphx-grid-line-width, 1px));
        background-size: var(--vuegraphx-grid-size-x, 30px) var(--vuegraphx-grid-size-y, 30px);
        background-position: var(--vuegraphx-grid-origin-x, 0px) var(--vuegraphx-grid-origin-y, 0px);
      }
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
    this.teardownTrackpadGestureBridge();
    this.teardownGridSync();
    this.clearGridStyle();

    if (this.board) {
      JXG.JSXGraph.freeBoard(this.board);
      this.view3d = null;
    }

    const dragEnabled = this.globalOptions?.drag?.enabled !== false;
    const defaultMoveTarget = dragEnabled ? document : null;
    const gridOptions = resolveGraphViewportGridOptions(this.globalOptions?.grid);

    const defaultOptions = {
      boundingbox: [-10, 10, 10, -10] as [number, number, number, number],
      axis: true,
      showNavigation: true,
      keepaspectratio: true,
      showCopyright: false,
      moveTarget: defaultMoveTarget,
      zoom: {
        enabled: false
      },
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

    if (gridOptions.enabled && !this.globalOptions?.boundingbox) {
      defaultOptions.boundingbox = this.createGridAlignedBoundingBox(gridOptions) ?? defaultOptions.boundingbox;
    }

    const view3DOptions = this.globalOptions?.view3D;
    const boardOptions = { ...this.globalOptions };
    delete (boardOptions as Partial<GraphXOptions>).view3D;
    delete (boardOptions as Partial<GraphXOptions>).grid;
    if (shouldUseTrackpadGestureBridge(this.globalOptions) && boardOptions.zoom) {
      boardOptions.zoom = {
        ...boardOptions.zoom,
        wheel: false
      };
    }

    this.board = JXG.JSXGraph.initBoard(this.containerId, { ...defaultOptions, ...boardOptions } as any);
    this.configureStandardDashPattern();
    this.setupTrackpadGestureBridge();
    this.setupGridSync(gridOptions);

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

  public syncGridToBoard(): void {
    this.syncGridStyle(resolveGraphViewportGridOptions(this.globalOptions?.grid));
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
    this.teardownTrackpadGestureBridge();
    this.teardownGridSync();
    this.clearGridStyle();
    if (this.board) {
      JXG.JSXGraph.freeBoard(this.board);
    }
  }

  private setupGridSync(gridOptions: ResolvedGraphViewportGridOptions): void {
    if (!this.board || !gridOptions.enabled) {
      this.clearGridStyle();
      return;
    }

    const sync = () => this.syncGridStyle(gridOptions);
    sync();
    this.board.on('boundingbox', sync);
    this.disposeGridSync = () => {
      (this.board as any)?.off?.('boundingbox', sync);
    };
  }

  private teardownGridSync(): void {
    this.disposeGridSync?.();
    this.disposeGridSync = null;
  }

  private createGridAlignedBoundingBox(gridOptions: ResolvedGraphViewportGridOptions): [number, number, number, number] | null {
    const size = this.readContainerSize();
    if (!size) return null;
    const bounds = createCenteredWorldBoundsForViewportGrid(size, gridOptions);
    return [bounds.left, bounds.top, bounds.right, bounds.bottom];
  }

  private syncGridStyle(gridOptions: ResolvedGraphViewportGridOptions): void {
    const container = this.board?.containerObj as HTMLElement | undefined ?? this.getContainerElement();
    if (!container || !gridOptions.enabled || !this.board) {
      this.clearGridStyle(container);
      return;
    }

    const bounds = this.board.getBoundingBox() as [number, number, number, number] | undefined;
    const size = this.readContainerSize(container);
    if (!bounds || bounds.length < 4 || !size) {
      this.clearGridStyle(container);
      return;
    }

    const [left, top, right, bottom] = bounds;
    const worldWidth = Math.abs(right - left);
    const worldHeight = Math.abs(top - bottom);
    if (worldWidth <= 1e-9 || worldHeight <= 1e-9) {
      this.clearGridStyle(container);
      return;
    }

    const pixelsPerUnitX = size.width / worldWidth;
    const pixelsPerUnitY = size.height / worldHeight;
    const stepX = resolveGraphViewportGridStep(pixelsPerUnitX, worldWidth, gridOptions);
    const stepY = resolveGraphViewportGridStep(pixelsPerUnitY, worldHeight, gridOptions);
    const cellSizeX = pixelsPerUnitX * stepX;
    const cellSizeY = pixelsPerUnitY * stepY;
    const originX = normalizeCssModulo(((0 - left) / (right - left)) * size.width, cellSizeX);
    const originY = normalizeCssModulo(((top - 0) / (top - bottom)) * size.height, cellSizeY);

    container.classList.add('vuegraphx-grid-enabled');
    container.style.setProperty('--vuegraphx-grid-background', gridOptions.backgroundColor);
    container.style.setProperty('--vuegraphx-grid-line-color', gridOptions.lineColor);
    container.style.setProperty('--vuegraphx-grid-line-width', `${formatCssNumber(gridOptions.lineWidth)}px`);
    container.style.setProperty('--vuegraphx-grid-size-x', `${formatCssNumber(cellSizeX)}px`);
    container.style.setProperty('--vuegraphx-grid-size-y', `${formatCssNumber(cellSizeY)}px`);
    container.style.setProperty('--vuegraphx-grid-origin-x', `${formatCssNumber(originX)}px`);
    container.style.setProperty('--vuegraphx-grid-origin-y', `${formatCssNumber(originY)}px`);
  }

  private clearGridStyle(container: HTMLElement | null = this.getContainerElement()): void {
    if (!container) return;
    container.classList.remove('vuegraphx-grid-enabled');
    for (const name of [
      '--vuegraphx-grid-background',
      '--vuegraphx-grid-line-color',
      '--vuegraphx-grid-line-width',
      '--vuegraphx-grid-size-x',
      '--vuegraphx-grid-size-y',
      '--vuegraphx-grid-origin-x',
      '--vuegraphx-grid-origin-y'
    ]) {
      container.style.removeProperty(name);
    }
  }

  private getContainerElement(): HTMLElement | null {
    return typeof document === 'undefined' ? null : document.getElementById(this.containerId);
  }

  private readContainerSize(container: HTMLElement | null = this.getContainerElement()): { width: number; height: number } | null {
    if (!container) return null;
    const rect = container.getBoundingClientRect?.();
    const width = container.clientWidth || rect?.width || 0;
    const height = container.clientHeight || rect?.height || 0;
    return width > 0 && height > 0 ? { width, height } : null;
  }

  private setupTrackpadGestureBridge(): void {
    if (!this.board || !shouldUseTrackpadGestureBridge(this.globalOptions)) return;

    const container = this.board.containerObj as HTMLElement | undefined;
    if (!container) return;

    const onWheel = (event: WheelEvent) => {
      const action = classifyWheelGesture(event, this.globalOptions);
      if (action === 'ignore') return;

      event.preventDefault();
      if (action === 'pan') {
        this.panBoardByWheel(event);
        return;
      }
      this.zoomBoardByWheel(event);
    };

    container.addEventListener('wheel', onWheel, { passive: false });
    this.disposeTrackpadGestureBridge = () => {
      container.removeEventListener('wheel', onWheel);
    };
  }

  private teardownTrackpadGestureBridge(): void {
    this.disposeTrackpadGestureBridge?.();
    this.disposeTrackpadGestureBridge = null;
  }

  private panBoardByWheel(event: WheelEvent): void {
    const origin = (this.board as any)?.origin?.scrCoords;
    if (!origin) return;
    this.board.moveOrigin(origin[1] - event.deltaX, origin[2] - event.deltaY);
    this.syncGridToBoard();
  }

  private zoomBoardByWheel(event: WheelEvent): void {
    const zoomOptions = this.globalOptions?.zoom;
    if (!this.board || zoomOptions?.enabled === false || event.deltaY === 0) return;

    if (zoomOptions?.center === 'board') {
      if (event.deltaY < 0) {
        this.board.zoomIn();
      } else {
        this.board.zoomOut();
      }
      this.syncGridToBoard();
      return;
    }

    const position = this.board.getMousePosition(event);
    const userPoint = new JXG.Coords(JXG.COORDS_BY_SCREEN, position, this.board).usrCoords;
    if (event.deltaY < 0) {
      this.board.zoomIn(userPoint[1], userPoint[2]);
    } else {
      this.board.zoomOut(userPoint[1], userPoint[2]);
    }
    this.syncGridToBoard();
  }
}

const normalizeCssModulo = (value: number, modulo: number): number => {
  if (!Number.isFinite(value) || !Number.isFinite(modulo) || modulo <= 0) return 0;
  return ((value % modulo) + modulo) % modulo;
};

const formatCssNumber = (value: number): string => (
  Number.isFinite(value) ? Number(value.toFixed(3)).toString() : '0'
);
