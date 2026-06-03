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
type TwoFingerGestureKind = 'zoom' | 'pan' | 'ignore';
type ScreenPoint = { x: number; y: number };
type TwoFingerTouchFrame = {
  center: ScreenPoint;
  distance: number;
};
type TwoFingerGestureMode = 'pending' | 'pan' | 'zoom';
type TwoFingerGestureState = {
  mode: TwoFingerGestureMode;
  startFrame: TwoFingerTouchFrame;
  previousFrame: TwoFingerTouchFrame;
};
type TouchGesturePoint = ScreenPoint & { identifier: number };
type PointerGesturePoint = ScreenPoint & { pointerId: number };
const WHEEL_DELTA_PIXEL = 0;
const TOUCH_PINCH_DISTANCE_THRESHOLD_PX = 10;
const TOUCH_PINCH_SCALE_THRESHOLD = 0.06;
const TOUCH_PINCH_DOMINANCE_RATIO = 1.25;
const TOUCH_PAN_DISTANCE_THRESHOLD_PX = 2;
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

const resolvePinchDistanceThreshold = (distance: number): number => Math.max(
  TOUCH_PINCH_DISTANCE_THRESHOLD_PX,
  distance * TOUCH_PINCH_SCALE_THRESHOLD
);

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

export const createTwoFingerTouchFrame = (
  first: ScreenPoint,
  second: ScreenPoint
): TwoFingerTouchFrame => {
  const deltaX = second.x - first.x;
  const deltaY = second.y - first.y;
  return {
    center: {
      x: (first.x + second.x) / 2,
      y: (first.y + second.y) / 2
    },
    distance: Math.hypot(deltaX, deltaY)
  };
};

export const classifyTwoFingerTouchGesture = (
  previous: TwoFingerTouchFrame,
  current: TwoFingerTouchFrame
): TwoFingerGestureKind => {
  const distanceDelta = Math.abs(current.distance - previous.distance);
  const centerDelta = Math.hypot(current.center.x - previous.center.x, current.center.y - previous.center.y);
  const pinchDistanceThreshold = resolvePinchDistanceThreshold(previous.distance);
  if (
    distanceDelta >= pinchDistanceThreshold
    && (
      centerDelta < TOUCH_PAN_DISTANCE_THRESHOLD_PX
      || distanceDelta >= centerDelta * TOUCH_PINCH_DOMINANCE_RATIO
    )
  ) {
    return 'zoom';
  }

  if (centerDelta >= TOUCH_PAN_DISTANCE_THRESHOLD_PX) {
    return 'pan';
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
  private touchGestureState: TwoFingerGestureState | null = null;
  private activeTouchPoints = new Map<number, TouchGesturePoint>();
  private movedTouchIdentifiers = new Set<number>();
  private pointerGestureState: TwoFingerGestureState | null = null;
  private activeTouchPointers = new Map<number, PointerGesturePoint>();
  private movedTouchPointers = new Set<number>();
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
        wheel: false,
        pinch: false
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

      this.consumeGestureEvent(event);
      if (action === 'pan') {
        this.panBoardByWheel(event);
        return;
      }
      this.zoomBoardByWheel(event);
    };

    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 2) {
        this.resetTouchGesture();
        return;
      }

      this.syncActiveTouchPoints(event.touches);
      const frame = this.createActiveTouchFrame();
      if (!frame) return;

      this.touchGestureState = this.createTwoFingerGestureState(frame);
      this.movedTouchIdentifiers.clear();
      this.consumeGestureEvent(event);
    };

    const onTouchMove = (event: TouchEvent) => {
      if (event.touches.length !== 2) {
        this.resetTouchGesture();
        return;
      }

      this.updateChangedTouchPoints(event.changedTouches ?? event.touches);
      const currentFrame = this.createActiveTouchFrame();
      if (!currentFrame) return;

      const gesture = this.touchGestureState ?? this.createTwoFingerGestureState(currentFrame);
      this.touchGestureState = gesture;

      if (gesture.mode === 'pending' && this.movedTouchIdentifiers.size < 2) {
        this.consumeGestureEvent(event);
        return;
      }

      const previousFrame = gesture.previousFrame;
      const action = this.resolveTwoFingerGestureAction(gesture, currentFrame);
      this.movedTouchIdentifiers.clear();
      this.consumeGestureEvent(event);

      if (action === 'ignore') {
        gesture.previousFrame = currentFrame;
        return;
      }

      if (action === 'pan') {
        this.moveBoardOriginByScreenDelta(
          currentFrame.center.x - previousFrame.center.x,
          currentFrame.center.y - previousFrame.center.y
        );
        gesture.previousFrame = currentFrame;
        return;
      }

      this.zoomBoardByTouchFrames(previousFrame, currentFrame);
      gesture.previousFrame = currentFrame;
    };

    const onTouchEnd = (event: TouchEvent) => {
      if (event.touches.length !== 2) {
        this.resetTouchGesture();
        return;
      }

      this.syncActiveTouchPoints(event.touches);
      const frame = this.createActiveTouchFrame();
      this.touchGestureState = frame ? this.createTwoFingerGestureState(frame) : null;
      this.movedTouchIdentifiers.clear();
    };

    const onPointerDown: EventListener = (event) => {
      const pointerEvent = event as PointerEvent;
      if (pointerEvent.pointerType !== 'touch') return;

      this.activeTouchPointers.set(pointerEvent.pointerId, this.createPointerPoint(pointerEvent));
      this.capturePointer(container, pointerEvent.pointerId);
      const frame = this.createPointerFrame();
      if (!frame) return;

      this.pointerGestureState = this.createTwoFingerGestureState(frame);
      this.movedTouchPointers.clear();
      this.consumeGestureEvent(pointerEvent);
    };

    const onPointerMove: EventListener = (event) => {
      const pointerEvent = event as PointerEvent;
      if (pointerEvent.pointerType !== 'touch' || !this.activeTouchPointers.has(pointerEvent.pointerId)) return;

      this.activeTouchPointers.set(pointerEvent.pointerId, this.createPointerPoint(pointerEvent));
      this.movedTouchPointers.add(pointerEvent.pointerId);
      const currentFrame = this.createPointerFrame();
      if (!currentFrame) return;

      const gesture = this.pointerGestureState ?? this.createTwoFingerGestureState(currentFrame);
      this.pointerGestureState = gesture;

      if (gesture.mode === 'pending' && this.movedTouchPointers.size < 2) {
        this.consumeGestureEvent(pointerEvent);
        return;
      }

      const previousFrame = gesture.previousFrame;
      const action = this.resolveTwoFingerGestureAction(gesture, currentFrame);
      this.movedTouchPointers.clear();
      this.consumeGestureEvent(pointerEvent);

      if (action === 'ignore') {
        gesture.previousFrame = currentFrame;
        return;
      }

      if (action === 'pan') {
        this.moveBoardOriginByScreenDelta(
          currentFrame.center.x - previousFrame.center.x,
          currentFrame.center.y - previousFrame.center.y
        );
        gesture.previousFrame = currentFrame;
        return;
      }

      this.zoomBoardByTouchFrames(previousFrame, currentFrame);
      gesture.previousFrame = currentFrame;
    };

    const onPointerEnd: EventListener = (event) => {
      const pointerEvent = event as PointerEvent;
      if (pointerEvent.pointerType !== 'touch') return;

      const hadPointer = this.activeTouchPointers.delete(pointerEvent.pointerId);
      if (!hadPointer) return;

      const frame = this.createPointerFrame();
      this.pointerGestureState = frame ? this.createTwoFingerGestureState(frame) : null;
      this.movedTouchPointers.delete(pointerEvent.pointerId);
      this.releasePointer(container, pointerEvent.pointerId);
      if (this.activeTouchPointers.size > 0) {
        this.consumeGestureEvent(pointerEvent);
      }
    };

    const listenerOptions = { passive: false, capture: true };
    const pointerMoveTarget = ((this.board as any)?.attr?.movetarget as EventTarget | null | undefined) ?? container;
    const usePointerGestureEvents = this.shouldUsePointerGestureEvents();
    container.addEventListener('wheel', onWheel, listenerOptions);
    if (usePointerGestureEvents) {
      container.addEventListener('pointerdown', onPointerDown, listenerOptions);
      pointerMoveTarget.addEventListener('pointermove', onPointerMove, listenerOptions);
      pointerMoveTarget.addEventListener('pointerup', onPointerEnd, listenerOptions);
      pointerMoveTarget.addEventListener('pointercancel', onPointerEnd, listenerOptions);
    } else {
      container.addEventListener('touchstart', onTouchStart, listenerOptions);
      container.addEventListener('touchmove', onTouchMove, listenerOptions);
      container.addEventListener('touchend', onTouchEnd, listenerOptions);
      container.addEventListener('touchcancel', onTouchEnd, listenerOptions);
    }
    this.disposeTrackpadGestureBridge = () => {
      container.removeEventListener('wheel', onWheel, listenerOptions);
      if (usePointerGestureEvents) {
        container.removeEventListener('pointerdown', onPointerDown, listenerOptions);
        pointerMoveTarget.removeEventListener('pointermove', onPointerMove, listenerOptions);
        pointerMoveTarget.removeEventListener('pointerup', onPointerEnd, listenerOptions);
        pointerMoveTarget.removeEventListener('pointercancel', onPointerEnd, listenerOptions);
      } else {
        container.removeEventListener('touchstart', onTouchStart, listenerOptions);
        container.removeEventListener('touchmove', onTouchMove, listenerOptions);
        container.removeEventListener('touchend', onTouchEnd, listenerOptions);
        container.removeEventListener('touchcancel', onTouchEnd, listenerOptions);
      }
      this.resetTouchGesture();
      this.pointerGestureState = null;
      this.activeTouchPointers.clear();
      this.movedTouchPointers.clear();
    };
  }

  private teardownTrackpadGestureBridge(): void {
    this.disposeTrackpadGestureBridge?.();
    this.disposeTrackpadGestureBridge = null;
  }

  private consumeGestureEvent(event: Event): void {
    event.preventDefault();
    event.stopImmediatePropagation();
  }

  private shouldUsePointerGestureEvents(): boolean {
    return typeof window !== 'undefined' && typeof window.PointerEvent !== 'undefined';
  }

  private createTwoFingerGestureState(frame: TwoFingerTouchFrame): TwoFingerGestureState {
    return {
      mode: 'pending',
      startFrame: frame,
      previousFrame: frame
    };
  }

  private resolveTwoFingerGestureAction(
    gesture: TwoFingerGestureState,
    currentFrame: TwoFingerTouchFrame
  ): TwoFingerGestureKind {
    if (gesture.mode === 'pending') {
      const action = classifyTwoFingerTouchGesture(gesture.startFrame, currentFrame);
      if (action !== 'ignore') {
        gesture.mode = action;
      }
      return action;
    }

    return gesture.mode === 'pan' ? 'pan' : 'zoom';
  }

  private panBoardByWheel(event: WheelEvent): void {
    this.moveBoardOriginByScreenDelta(-event.deltaX, -event.deltaY);
  }

  private moveBoardOriginByScreenDelta(deltaX: number, deltaY: number): void {
    const origin = (this.board as any)?.origin?.scrCoords;
    if (!origin) return;
    this.board.moveOrigin(origin[1] + deltaX, origin[2] + deltaY);
    this.syncGridToBoard();
  }

  private createTouchPoint(touch: Touch): TouchGesturePoint {
    return {
      identifier: touch.identifier,
      x: touch.clientX,
      y: touch.clientY
    };
  }

  private syncActiveTouchPoints(touches: TouchList): void {
    this.activeTouchPoints.clear();
    for (const touch of Array.from(touches)) {
      this.activeTouchPoints.set(touch.identifier, this.createTouchPoint(touch));
    }
  }

  private updateChangedTouchPoints(touches: TouchList): void {
    if (this.activeTouchPoints.size < 2) {
      this.syncActiveTouchPoints(touches);
      return;
    }

    for (const touch of Array.from(touches)) {
      if (!this.activeTouchPoints.has(touch.identifier)) continue;
      this.activeTouchPoints.set(touch.identifier, this.createTouchPoint(touch));
      this.movedTouchIdentifiers.add(touch.identifier);
    }
  }

  private createActiveTouchFrame(): TwoFingerTouchFrame | null {
    if (this.activeTouchPoints.size < 2) return null;
    const [first, second] = [...this.activeTouchPoints.values()].slice(0, 2);
    return createTwoFingerTouchFrame(first, second);
  }

  private resetTouchGesture(): void {
    this.touchGestureState = null;
    this.activeTouchPoints.clear();
    this.movedTouchIdentifiers.clear();
  }

  private createPointerPoint(event: PointerEvent): PointerGesturePoint {
    return {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY
    };
  }

  private createPointerFrame(): TwoFingerTouchFrame | null {
    if (this.activeTouchPointers.size < 2) return null;
    const [first, second] = [...this.activeTouchPointers.values()].slice(0, 2);
    return createTwoFingerTouchFrame(first, second);
  }

  private capturePointer(container: HTMLElement, pointerId: number): void {
    try {
      container.setPointerCapture?.(pointerId);
    } catch {
    }
  }

  private releasePointer(container: HTMLElement, pointerId: number): void {
    try {
      container.releasePointerCapture?.(pointerId);
    } catch {
    }
  }

  private zoomBoardByTouchFrames(previous: TwoFingerTouchFrame, current: TwoFingerTouchFrame): void {
    const zoomOptions = this.globalOptions?.zoom;
    if (!this.board || !zoomOptions || zoomOptions.enabled === false || zoomOptions.pinch === false) return;

    const centerEvent = {
      clientX: current.center.x,
      clientY: current.center.y
    } as MouseEvent;

    const zoomingIn = current.distance > previous.distance;
    if (zoomOptions?.center === 'board') {
      if (zoomingIn) {
        this.board.zoomIn();
      } else {
        this.board.zoomOut();
      }
      this.syncGridToBoard();
      return;
    }

    const position = this.board.getMousePosition(centerEvent);
    const userPoint = new JXG.Coords(JXG.COORDS_BY_SCREEN, position, this.board).usrCoords;
    if (zoomingIn) {
      this.board.zoomIn(userPoint[1], userPoint[2]);
    } else {
      this.board.zoomOut(userPoint[1], userPoint[2]);
    }
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
