import * as math from 'mathjs';
import katex from 'katex';
import katexCss from 'katex/dist/katex.min.css?raw';
import { sampleImplicitEquationSegments } from '@vuegraphx/math';
import {
  createCenteredWorldBoundsForViewportGrid,
  mergeGraphObjectPatch,
  resolveGraphTextAnchor,
  resolveGraphTextRenderDescriptor,
  resolveGraphViewportGridOptions,
  resolveGraphViewportGridStep,
  STANDARD_COORDINATE_UI,
  STANDARD_GEOMETRY_ANNOTATION_UI,
  STANDARD_GEOMETRY_MARKER_UI,
  resolveStandardCoordinateLabelPixelOffset,
  type GraphBackendContext,
  type GraphBackendMountOptions,
  type GraphClientPoint,
  type GraphObjectNode,
  type GraphObjectPatch,
  type GraphPickOptions,
  type GraphPickResult,
  type GraphRenderHandle,
  type GraphTextRenderDescriptor,
  type GraphViewportRef,
  type GraphViewportGridInput,
  type GraphViewportSize,
  type GraphWorldPoint,
  type StandardCoordinateLabelModel
} from '@vuegraphx/core';
import type { JsxGraphRuntimePort } from './JsxGraphBackend';

type JsxGraphElement = {
  id?: string;
  name?: string;
  elType?: string;
  setAttribute?: (attributes: Record<string, unknown>) => void;
};

type JsxGraphBoardLike = {
  create(type: string, args: unknown[], attributes?: Record<string, unknown>): JsxGraphElement | JsxGraphElement[];
  removeObject(element: JsxGraphElement | JsxGraphElement[]): void;
  update?(): void;
  fullUpdate?(): void;
  resizeContainer?(width: number, height: number, emit?: boolean): void;
  getBoundingBox?(): [number, number, number, number];
  on?(eventName: string, handler: () => void): void;
  off?(eventName: string, handler: () => void): void;
  containerObj?: HTMLElement;
  renderer?: { dashArray?: number[][] };
};

type JsxGraphNamespaceLike = {
  JSXGraph?: {
    initBoard(container: string | HTMLElement, attributes?: Record<string, unknown>): JsxGraphBoardLike;
    freeBoard?(board: JsxGraphBoardLike): void;
  };
  Coords?: new (mode: unknown, point: number[], board: JsxGraphBoardLike) => {
    scrCoords: number[];
    usrCoords: number[];
  };
  COORDS_BY_USER?: unknown;
  COORDS_BY_SCREEN?: unknown;
};

export interface JsxGraphRuntimeCreateElementsEvent {
  node: GraphObjectNode;
  handle: GraphRenderHandle;
  elements: JsxGraphElement[];
}

export interface JsxGraphRuntimeOptions {
  board?: JsxGraphBoardLike;
  boardOptions?: Record<string, unknown>;
  createBoard?: (host: HTMLElement, options: GraphBackendMountOptions) => JsxGraphBoardLike;
  onCreateElements?: (event: JsxGraphRuntimeCreateElementsEvent) => void;
  onRemoveElements?: (event: JsxGraphRuntimeCreateElementsEvent) => void;
}

interface StoredJsxGraphObject {
  node: GraphObjectNode;
  handle: GraphRenderHandle;
  elements: JsxGraphElement[];
  overlays: HTMLElement[];
}

interface Point2D {
  x: number;
  y: number;
}

const JSXGRAPH_STANDARD_DASH_INDEX = 2;
const JSXGRAPH_STANDARD_DASH_PATTERN = [4, 8] as const;
const JSXGRAPH_DASH_STROKE_WIDTH = 1;

const DEFAULT_BOUNDS: [number, number, number, number] = [-10, 10, 10, -10];
const JSXGRAPH_TEXT_BASE_FONT_SIZE = 14;
const KATEX_STYLE_ELEMENT_ID = 'vuegraphx-katex-style';
const KATEX_LAYOUT_CSS = katexCss.replace(/@font-face\{[^}]*\}/g, '');

export class JsxGraphRuntime implements JsxGraphRuntimePort {
  private board: JsxGraphBoardLike | null;
  private ownsBoard = false;
  private readonly objects = new Map<string, StoredJsxGraphObject>();
  private readonly visualBaselines = new WeakMap<JsxGraphBoardLike, { width: number; height: number }>();
  private gridInput?: GraphViewportGridInput;
  private disposeBoardOverlaySync: (() => void) | null = null;

  public constructor(
    private readonly JXG: JsxGraphNamespaceLike,
    private readonly options: JsxGraphRuntimeOptions = {}
  ) {
    this.board = options.board ?? null;
    if (this.board) {
      configureJsxGraphDashPattern(this.board);
      this.captureVisualBaseline(this.board);
      this.bindBoardOverlaySync(this.board);
    }
  }

  public mount(host: HTMLElement, options: GraphBackendMountOptions = {}): void {
    if (this.board) return;
    this.gridInput = readGridInput(options.attributes?.grid) ?? readGridInput(this.options.boardOptions?.grid);
    const gridOptions = resolveGraphViewportGridOptions(this.gridInput);
    const boardOptions = {
      axis: true,
      showNavigation: false,
      showCopyright: false,
      boundingbox: gridOptions.enabled
        ? toJsxGraphBounds(createCenteredWorldBoundsForViewportGrid(
          options.size ?? readHostSize(host) ?? { width: 600, height: 600 },
          gridOptions
        ))
        : DEFAULT_BOUNDS,
      ...(this.options.boardOptions ?? {}),
      ...(options.attributes ?? {})
    };
    delete (boardOptions as Record<string, unknown>).grid;
    this.board = this.options.createBoard?.(host, options)
      ?? this.JXG.JSXGraph?.initBoard(host, boardOptions)
      ?? null;
    if (!this.board) throw new Error('JSXGraph runtime requires a board or a JXG.JSXGraph.initBoard implementation.');
    configureJsxGraphDashPattern(this.board);
    this.captureVisualBaseline(this.board);
    this.bindBoardOverlaySync(this.board);
    this.ownsBoard = true;
    this.syncGridStyle();
  }

  public createObject(node: GraphObjectNode, handle: GraphRenderHandle, context: GraphBackendContext = {}): void {
    const board = this.requireBoard();
    const previous = this.objects.get(handle.id);
    if (previous) {
      this.removeStored(previous);
      this.objects.delete(handle.id);
    }

    const elements = this.createElements(board, node, context);
    const overlays = this.createOverlays(board, node);
    const stored = { node, handle, elements, overlays };
    this.objects.set(handle.id, stored);
    if (elements.length > 0) this.options.onCreateElements?.(stored);
    this.flush();
  }

  public updateObject(handle: GraphRenderHandle, patch: GraphObjectPatch, context: GraphBackendContext = {}): void {
    const stored = this.objects.get(handle.id);
    if (!stored) return;
    const nextNode = mergeGraphObjectPatch(stored.node, patch);
    this.removeStored(stored);
    const board = this.requireBoard();
    const elements = this.createElements(board, nextNode, context);
    const overlays = this.createOverlays(board, nextNode);
    const nextStored = { node: nextNode, handle, elements, overlays };
    if (isSelectedNode(nextNode)) this.objects.delete(handle.id);
    this.objects.set(handle.id, nextStored);
    if (elements.length > 0) this.options.onCreateElements?.(nextStored);
    this.flush();
  }

  public removeObject(handle: GraphRenderHandle): void {
    const stored = this.objects.get(handle.id);
    if (!stored) return;
    this.removeStored(stored);
    this.objects.delete(handle.id);
    this.flush();
  }

  public pick(point: GraphClientPoint, options: GraphPickOptions = {}): GraphPickResult | null {
    const tolerancePx = options.tolerancePx ?? 8;
    const tolerance = this.toWorldTolerance(tolerancePx);
    const world = this.unproject(point);
    const testPoint = world?.dimension === '2d' ? { x: world.x, y: world.y } : point;
    let coordinateSystemFallback: GraphPickResult | null = null;
    for (const stored of [...this.objects.values()].reverse()) {
      const layerId = stored.handle.layerId;
      if (stored.node.renderHints?.visible === false) continue;
      if (options.layerOrder && !options.layerOrder.includes(layerId)) continue;
      const hit = distanceToNode(stored.node, testPoint, tolerance);
      if (hit && hit.distance <= tolerance) {
        const result: GraphPickResult = {
          target: { scope: 'object', objectId: stored.handle.objectId, backendId: stored.handle.backendId, layerId },
          backendId: stored.handle.backendId,
          layerId,
          clientPoint: { ...point },
          worldPoint: world ?? undefined,
          distancePx: hit.distance,
          ...(hit.coordinateSystemHitMode ? { meta: { coordinateSystemHitMode: hit.coordinateSystemHitMode } } : {})
        };
        if (hit.coordinateSystemHitMode === 'fallback') {
          coordinateSystemFallback ??= result;
          continue;
        }
        return result;
      }
    }
    return coordinateSystemFallback;
  }

  public project(point: GraphWorldPoint, _viewport?: GraphViewportRef): GraphClientPoint | null {
    if (point.dimension !== '2d' || !this.board || !this.JXG.Coords || this.JXG.COORDS_BY_USER === undefined) {
      return { x: point.x, y: point.y };
    }
    const coords = new this.JXG.Coords(this.JXG.COORDS_BY_USER, [point.x, point.y], this.board);
    return { x: coords.scrCoords[1], y: coords.scrCoords[2] };
  }

  public unproject(point: GraphClientPoint, _viewport?: GraphViewportRef): GraphWorldPoint | null {
    if (!this.board || !this.JXG.Coords || this.JXG.COORDS_BY_SCREEN === undefined) {
      return { dimension: '2d', x: point.x, y: point.y };
    }
    const coords = new this.JXG.Coords(this.JXG.COORDS_BY_SCREEN, [point.x, point.y], this.board);
    return { dimension: '2d', x: coords.usrCoords[1], y: coords.usrCoords[2] };
  }

  public resize(size: GraphViewportSize): void {
    this.board?.resizeContainer?.(size.width, size.height, true);
    this.syncGridStyle();
  }

  public flush(): void {
    this.board?.update?.();
    this.syncCoordinateLabelOverlays();
  }

  public destroy(): void {
    for (const stored of this.objects.values()) this.removeStored(stored);
    this.objects.clear();
    this.clearGridStyle();
    this.disposeBoardOverlaySync?.();
    this.disposeBoardOverlaySync = null;
    if (this.ownsBoard && this.board) this.JXG.JSXGraph?.freeBoard?.(this.board);
    this.board = null;
    this.ownsBoard = false;
  }

  public listElements(handleId: string): JsxGraphElement[] {
    return [...(this.objects.get(handleId)?.elements ?? [])];
  }

  private syncGridStyle(): void {
    const gridOptions = resolveGraphViewportGridOptions(this.gridInput);
    const container = this.board?.containerObj;
    if (!container || !this.board || !gridOptions.enabled) {
      this.clearGridStyle();
      return;
    }
    const bounds = this.board.getBoundingBox?.();
    const size = readHostSize(container);
    if (!bounds || !size) return;
    const [left, top, right, bottom] = bounds;
    const worldWidth = Math.abs(right - left);
    const worldHeight = Math.abs(top - bottom);
    if (worldWidth <= 1e-9 || worldHeight <= 1e-9) return;
    const pixelsPerUnitX = size.width / worldWidth;
    const pixelsPerUnitY = size.height / worldHeight;
    const stepX = resolveGraphViewportGridStep(pixelsPerUnitX, worldWidth, gridOptions);
    const stepY = resolveGraphViewportGridStep(pixelsPerUnitY, worldHeight, gridOptions);
    const sizeX = pixelsPerUnitX * stepX;
    const sizeY = pixelsPerUnitY * stepY;
    const originX = normalizeCssModulo(((0 - left) / (right - left)) * size.width, sizeX);
    const originY = normalizeCssModulo(((top - 0) / (top - bottom)) * size.height, sizeY);
    Object.assign(container.style, {
      backgroundColor: gridOptions.backgroundColor,
      backgroundImage: `linear-gradient(to right, ${gridOptions.lineColor} ${gridOptions.lineWidth}px, transparent ${gridOptions.lineWidth}px), linear-gradient(to bottom, ${gridOptions.lineColor} ${gridOptions.lineWidth}px, transparent ${gridOptions.lineWidth}px)`,
      backgroundSize: `${formatCssNumber(sizeX)}px ${formatCssNumber(sizeY)}px`,
      backgroundPosition: `${formatCssNumber(originX)}px ${formatCssNumber(originY)}px`
    });
  }

  private clearGridStyle(): void {
    const container = this.board?.containerObj;
    if (!container) return;
    container.style.backgroundColor = '';
    container.style.backgroundImage = '';
    container.style.backgroundSize = '';
    container.style.backgroundPosition = '';
  }

  private bindBoardOverlaySync(board: JsxGraphBoardLike): void {
    this.disposeBoardOverlaySync?.();
    const subscriptions: Array<{ eventName: string; handler: () => void }> = [];
    for (const eventName of ['boundingbox', 'update', 'resize']) {
      const handler = () => this.syncCoordinateLabelOverlays();
      try {
        board.on?.(eventName, handler);
        subscriptions.push({ eventName, handler });
      } catch {
        // Lightweight test boards and older JSXGraph surfaces may not expose all events.
      }
    }
    this.disposeBoardOverlaySync = () => {
      for (const subscription of subscriptions) {
        try {
          board.off?.(subscription.eventName, subscription.handler);
        } catch {
          // Ignore stale board event teardown failures during board reset.
        }
      }
    };
  }

  private createElements(board: JsxGraphBoardLike, node: GraphObjectNode, context: GraphBackendContext): JsxGraphElement[] {
    if (node.renderHints?.visible === false) return [];
    const attrs = createAttributes(node, context);
    const payload = asRecord(node.payload);
    const geometry = asRecord(payload?.geometry) ?? createSemanticGeometryForNode(node, payload, (objectId) => this.findStoredNode(objectId));

    if (geometry?.kind === 'coordinate-system') {
      return this.createCoordinateSystemElements(board, geometry, attrs);
    }

    if (geometry?.kind === 'line' && isPoint2D(geometry.point) && isPoint2D(geometry.direction)) {
      const start = geometry.point;
      const end = add(start, geometry.direction);
      return normalizeElements(board.create('line', [[start.x, start.y], [end.x, end.y]], attrs));
    }

    if (geometry?.kind === 'ray' && isPoint2D(geometry.origin) && isPoint2D(geometry.direction)) {
      const start = geometry.origin;
      const end = add(start, geometry.direction);
      return normalizeElements(board.create('ray', [[start.x, start.y], [end.x, end.y]], attrs));
    }

    if (geometry?.kind === 'segment' && isPoint2D(geometry.start) && isPoint2D(geometry.end)) {
      return normalizeElements(board.create('segment', [[geometry.start.x, geometry.start.y], [geometry.end.x, geometry.end.y]], attrs));
    }

    if (node.type === 'vector' && isPoint2D(payload?.start) && isPoint2D(payload?.end)) {
      return normalizeElements(board.create('arrow', [[payload.start.x, payload.start.y], [payload.end.x, payload.end.y]], attrs));
    }

    if (geometry?.kind === 'circle' && isPoint2D(geometry.center) && typeof geometry.radius === 'number') {
      return normalizeElements(board.create('circle', [[geometry.center.x, geometry.center.y], geometry.radius], attrs));
    }

    if (geometry?.kind === 'ellipse' && isPoint2D(geometry.center) && typeof geometry.radiusX === 'number' && typeof geometry.radiusY === 'number') {
      const points = sampleEllipsePoints(
        geometry.center,
        geometry.radiusX,
        geometry.radiusY,
        readNumber(geometry.rotationRadians, 0)
      );
      return normalizeElements(board.create('curve', [points.map((point) => point.x), points.map((point) => point.y)], attrs));
    }

    if (geometry?.kind === 'hyperbola' && isPoint2D(geometry.center) && typeof geometry.radiusX === 'number' && typeof geometry.radiusY === 'number') {
      return sampleHyperbolaSegments(
        geometry.center,
        geometry.radiusX,
        geometry.radiusY,
        readNumber(geometry.rotationRadians, 0)
      ).flatMap((points) => normalizeElements(board.create('curve', [points.map((point) => point.x), points.map((point) => point.y)], attrs)));
    }

    if (geometry?.kind === 'polygon' && Array.isArray(geometry.vertices)) {
      const points = geometry.vertices.filter(isPoint2D).map((point) => [point.x, point.y]);
      if (points.length >= 3) return normalizeElements(board.create('polygon', points, attrs));
    }

    if (geometry?.kind === 'polyline' && Array.isArray(geometry.points)) {
      const points = geometry.points.filter(isPoint2D).map((point) => [point.x, point.y]);
      if (points.length >= 2) return normalizeElements(board.create('curve', [points.map((point) => point[0]), points.map((point) => point[1])], attrs));
    }

    if ((geometry?.kind === 'multiline' || geometry?.kind === 'wireframe') && Array.isArray(geometry.segments)) {
      return geometry.segments.flatMap((segment) => {
        const points = Array.isArray(segment) ? segment.filter(isPoint2D).map((point) => [point.x, point.y]) : [];
        return points.length >= 2
          ? normalizeElements(board.create('curve', [points.map((point) => point[0]), points.map((point) => point[1])], attrs))
          : [];
      });
    }

    if ((geometry?.kind === 'arc' || geometry?.kind === 'sector') && isPoint2D(geometry.center) && isPoint2D(geometry.start) && isPoint2D(geometry.end)) {
      return normalizeElements(board.create(geometry.kind, [
        [geometry.center.x, geometry.center.y],
        [geometry.start.x, geometry.start.y],
        [geometry.end.x, geometry.end.y]
      ], attrs));
    }

    if (geometry?.kind === 'semicircle' && isPoint2D(geometry.start) && isPoint2D(geometry.end)) {
      return normalizeElements(board.create('semicircle', [
        [geometry.start.x, geometry.start.y],
        [geometry.end.x, geometry.end.y]
      ], attrs));
    }

    if (node.type === 'angle') {
      const anglePoints = readAnglePoints(payload);
      if (anglePoints) {
        return normalizeElements(board.create('angle', anglePoints.map((point) => [point.x, point.y]), attrs));
      }
    }

    if (node.type === 'text') {
      const descriptor = resolveGraphTextRenderDescriptor(node);
      const anchor = resolveGraphTextAnchor(node);
      if (descriptor && anchor?.dimension === '2d') {
        const renderedText = renderTextForJsxGraph(descriptor, board, () => this.getTextVisualZoomScale(board), node.renderHints);
        return normalizeElements(board.create('text', [anchor.x, anchor.y, renderedText.text], {
          ...attrs,
          ...renderedText.attributes
        }));
      }
    }

    const payloadPoint = readPayloadPoint2D(payload);
    if (payloadPoint) {
      return normalizeElements(board.create('point', [payloadPoint.x, payloadPoint.y], attrs));
    }

    if ((node.type === 'function' || node.type === 'derivative') && typeof payload?.expression === 'string') {
      const descriptor = payload as { expression: string; variable?: string; domain?: [number, number] | { min?: number; max?: number }; parameters?: Record<string, unknown>; scope?: Record<string, unknown> };
      const compiled = math.parse(descriptor.expression).compile();
      const domain = readFunctionDomain(descriptor.domain);
      const variable = descriptor.variable ?? 'x';
      const parameters = {
        ...readNumberRecord(descriptor.scope),
        ...readNumberRecord(descriptor.parameters)
      };
      return normalizeElements(board.create('functiongraph', [
        (value: number) => compiled.evaluate({ ...parameters, [variable]: value, x: value, e: Math.E, pi: Math.PI }),
        ...(domain ? domain : [])
      ], attrs));
    }

    if (node.type === 'perpendicular-line') {
      const relation = asRecord(payload);
      const sourceId = typeof relation?.sourceObjectId === 'string' ? relation.sourceObjectId : undefined;
      const through = isPoint2D(relation?.through) ? relation.through : null;
      const source = sourceId ? this.findStoredNode(sourceId) : null;
      const sourceDirection = directionForNode(source);
      if (through && sourceDirection) {
        const perpendicular = { x: -sourceDirection.y, y: sourceDirection.x };
        const end = add(through, perpendicular);
        return normalizeElements(board.create('line', [[through.x, through.y], [end.x, end.y]], attrs));
      }
    }

    return [];
  }

  private findStoredNode(objectId: string): GraphObjectNode | null {
    for (const stored of this.objects.values()) {
      if (stored.node.id === objectId || stored.handle.objectId === objectId) return stored.node;
    }
    return null;
  }

  private removeStored(stored: StoredJsxGraphObject): void {
    for (const overlay of stored.overlays) overlay.remove();
    if (stored.elements.length > 0) this.options.onRemoveElements?.(stored);
    const board = this.board;
    if (!board) return;
    for (const element of stored.elements) {
      try {
        board.removeObject(element);
      } catch {
        // JSXGraph remove can throw for elements already removed by a board reset.
      }
    }
  }

  private requireBoard(): JsxGraphBoardLike {
    if (!this.board) throw new Error('JSXGraph runtime must be mounted before rendering.');
    return this.board;
  }

  private toWorldTolerance(tolerancePx: number): number {
    if (!this.board?.getBoundingBox || !this.board.containerObj) return tolerancePx;
    const [left, top, right, bottom] = this.board.getBoundingBox();
    const width = this.board.containerObj.clientWidth;
    const height = this.board.containerObj.clientHeight;
    const xScale = width / Math.max(1e-9, Math.abs(right - left));
    const yScale = height / Math.max(1e-9, Math.abs(top - bottom));
    const scale = Math.min(xScale, yScale);
    return Number.isFinite(scale) && scale > 0 ? tolerancePx / scale : tolerancePx;
  }

  private getTextVisualZoomScale(board: JsxGraphBoardLike): number {
    // Semantic labels must keep following viewport zoom past helper-UI limits.
    return normalizeVisualZoomScale(this.getRawVisualZoomScale(board));
  }

  private captureVisualBaseline(board: JsxGraphBoardLike): void {
    if (this.visualBaselines.has(board)) return;
    const span = readBoardWorldSpan(board);
    if (span) this.visualBaselines.set(board, span);
  }

  private getRawVisualZoomScale(board: JsxGraphBoardLike): number {
    const span = readBoardWorldSpan(board);
    if (!span) return 1;
    this.captureVisualBaseline(board);
    const baseline = this.visualBaselines.get(board) ?? span;
    return Math.min(
      baseline.width / Math.max(1e-9, span.width),
      baseline.height / Math.max(1e-9, span.height)
    );
  }

  private createCoordinateSystemElements(
    board: JsxGraphBoardLike,
    geometry: Record<string, unknown>,
    attrs: Record<string, unknown>
  ): JsxGraphElement[] {
    const axisAttrs = {
      ...attrs,
      name: '',
      withLabel: false,
      strokeColor: STANDARD_COORDINATE_UI.axisStrokeColor,
      fillColor: STANDARD_COORDINATE_UI.axisStrokeColor,
      strokeWidth: STANDARD_COORDINATE_UI.axisStrokeWidthPx,
      fixed: true
    };
    const elements: JsxGraphElement[] = [];
    const xAxis = readPointList2D(geometry.xAxis);
    const yAxis = readPointList2D(geometry.yAxis);
    for (const axis of [xAxis, yAxis]) {
      if (axis.length >= 2) {
        const start = axis[0];
        const end = axis[axis.length - 1];
        elements.push(...normalizeElements(board.create('arrow', [[start.x, start.y], [end.x, end.y]], axisAttrs)));
      }
    }
    if (elements.length === 0) {
      elements.push(...readCoordinateSystemSegments2D(geometry).flatMap((points) => (
        points.length >= 2
          ? normalizeElements(board.create('curve', [points.map((point) => point.x), points.map((point) => point.y)], axisAttrs))
          : []
      )));
    }
    return elements;
  }

  private createOverlays(board: JsxGraphBoardLike, node: GraphObjectNode): HTMLElement[] {
    if (!board.containerObj) return [];
    const geometry = asRecord(asRecord(node.payload)?.geometry);
    if (geometry?.kind !== 'coordinate-system') return [];
    const overlays = readStandardCoordinateLabels(geometry.labels).map((label) => this.createCoordinateLabelOverlay(board, label));
    return overlays.filter((overlay): overlay is HTMLElement => !!overlay);
  }

  private createCoordinateLabelOverlay(board: JsxGraphBoardLike, label: StandardCoordinateLabelModel): HTMLElement | null {
    const container = board.containerObj;
    if (!container) return null;
    const doc = container.ownerDocument;
    const overlay = doc.createElement('span');
    overlay.textContent = label.text;
    overlay.dataset.vuegraphxCoordinateLabel = 'true';
    overlay.dataset.vuegraphxCoordinateLabelRole = label.role;
    Object.assign(overlay.style, {
      position: 'absolute',
      pointerEvents: 'none',
      userSelect: 'none',
      color: STANDARD_COORDINATE_UI.tickLabelColor,
      font: STANDARD_COORDINATE_UI.tickLabelFont,
      lineHeight: `${STANDARD_COORDINATE_UI.tickLabelLineHeightPx}px`,
      whiteSpace: 'nowrap',
      zIndex: '3'
    });
    container.appendChild(overlay);
    if (!this.positionCoordinateLabelOverlay(board, overlay, label)) {
      overlay.remove();
      return null;
    }
    return overlay;
  }

  private syncCoordinateLabelOverlays(): void {
    const board = this.board;
    if (!board) return;
    for (const stored of this.objects.values()) {
      const geometry = asRecord(asRecord(stored.node.payload)?.geometry);
      if (geometry?.kind !== 'coordinate-system') continue;
      const labels = readStandardCoordinateLabels(geometry.labels);
      stored.overlays.forEach((overlay, index) => {
        const label = labels[index];
        if (label) this.positionCoordinateLabelOverlay(board, overlay, label);
      });
    }
  }

  private positionCoordinateLabelOverlay(board: JsxGraphBoardLike, overlay: HTMLElement, label: StandardCoordinateLabelModel): boolean {
    const projected = this.projectCoordinateLabelPoint(board, label.point);
    if (!projected) return false;
    const offset = resolveStandardCoordinateLabelPixelOffset(label);
    overlay.style.left = `${formatCssNumber(projected.x + offset.x)}px`;
    overlay.style.top = `${formatCssNumber(projected.y + offset.y)}px`;
    overlay.style.transform = label.axis === 'x' ? 'translate(-50%, 0)' : '';
    return true;
  }

  private projectCoordinateLabelPoint(board: JsxGraphBoardLike, point: Point2D): { x: number; y: number } | null {
    if (this.JXG.Coords && this.JXG.COORDS_BY_USER !== undefined) {
      try {
        const coords = new this.JXG.Coords(this.JXG.COORDS_BY_USER, [point.x, point.y], board);
        const x = coords.scrCoords[1];
        const y = coords.scrCoords[2];
        if (Number.isFinite(x) && Number.isFinite(y)) return { x, y };
      } catch {
        // Fall back to a bounding-box projection for lightweight test boards.
      }
    }
    const bounds = board.getBoundingBox?.();
    const container = board.containerObj;
    const width = container?.clientWidth ?? 0;
    const height = container?.clientHeight ?? 0;
    if (!bounds || width <= 0 || height <= 0) return null;
    const [left, top, right, bottom] = bounds;
    return {
      x: ((point.x - left) / Math.max(1e-9, right - left)) * width,
      y: ((top - point.y) / Math.max(1e-9, top - bottom)) * height
    };
  }
}

export const createJsxGraphRuntime = (
  JXG: JsxGraphNamespaceLike,
  options?: JsxGraphRuntimeOptions
): JsxGraphRuntime => new JsxGraphRuntime(JXG, options);

const createAttributes = (node: GraphObjectNode, _context: GraphBackendContext): Record<string, unknown> => {
  const hints = node.renderHints ?? {};
  const name = typeof hints.name === 'string' ? hints.name : node.id;
  const selected = isSelectedNode(node);
  const strokeColor = typeof hints.strokeColor === 'string' ? hints.strokeColor : '#0ea5e9';
  const pointStrokeColor = node.type === 'point' && typeof hints.pointStrokeColor === 'string' ? hints.pointStrokeColor : strokeColor;
  const fillColor = node.type === 'point' && typeof hints.pointFillColor === 'string'
    ? hints.pointFillColor
    : typeof hints.fillColor === 'string'
      ? hints.fillColor
      : strokeColor;
  const lineDash = readLineDashPattern(hints.lineDash);
  const baseStrokeWidth = typeof hints.strokeWidth === 'number' ? hints.strokeWidth : lineDash ? JSXGRAPH_DASH_STROKE_WIDTH : 2;
  const strokeWidth = node.type === 'point' && typeof hints.pointStrokeWidth === 'number' ? hints.pointStrokeWidth : baseStrokeWidth;
  const pointRadius = readNumber(hints.radius, STANDARD_GEOMETRY_MARKER_UI.pointRadiusPx);
  const pointSize = resolveJsxGraphPointSize(pointRadius, strokeWidth);
  return {
    name,
    withLabel: Boolean(name),
    highlight: false,
    strokeColor: node.type === 'point' ? pointStrokeColor : strokeColor,
    fillColor,
    fillOpacity: node.type === 'point' ? readNumber(hints.fillOpacity, 1) : readNumber(hints.fillOpacity, 0.15),
    strokeWidth: selected ? resolveSelectedStrokeWidth(strokeWidth) : strokeWidth,
    size: node.type === 'point' ? pointSize : readNumber(hints.radius, 3),
    visible: hints.visible !== false,
    fixed: isJsxGraphDragDisabled(node),
    linecap: readJsxGraphLineCap(hints.lineCap, isJsxGraphDragDisabled(node) ? 'butt' : 'round'),
    ...(node.type === 'point' ? {
      highlightStrokeColor: pointStrokeColor,
      highlightFillColor: fillColor,
      highlightFillOpacity: readNumber(hints.fillOpacity, 1),
      face: 'o',
      sizeUnit: 'screen',
      zoom: false,
      label: createJsxGraphPointLabelAttributes(hints)
    } : {}),
    ...(lineDash ? { dash: JSXGRAPH_STANDARD_DASH_INDEX, dashScale: false } : {})
  };
};

const resolveJsxGraphPointSize = (visualOuterRadius: number, strokeWidth: number): number => (
  Math.max(0, visualOuterRadius - 1 - strokeWidth / 2)
);

const createJsxGraphPointLabelAttributes = (hints: Record<string, unknown>): Record<string, unknown> => {
  const textColor = readSafeCssValue(hints.textColor) ?? STANDARD_GEOMETRY_ANNOTATION_UI.textColor;
  const fontFamily = readSafeCssValue(hints.fontFamily) ?? STANDARD_GEOMETRY_ANNOTATION_UI.textFontFamily;
  const fontWeight = readSafeCssValue(hints.fontWeight) ?? String(STANDARD_GEOMETRY_ANNOTATION_UI.textFontWeight);
  const lineHeight = readNumber(hints.lineHeight, STANDARD_GEOMETRY_ANNOTATION_UI.textLineHeightPx);
  return {
    strokeColor: textColor,
    highlightStrokeColor: textColor,
    fontSize: readNumber(hints.fontSize, STANDARD_GEOMETRY_ANNOTATION_UI.textFontSizePx),
    fontUnit: 'px',
    anchorX: 'left',
    anchorY: 'top',
    offset: [
      readNumber(hints.textOffsetX, STANDARD_GEOMETRY_ANNOTATION_UI.textOffsetXPx),
      readNumber(hints.textOffsetY, STANDARD_GEOMETRY_ANNOTATION_UI.textOffsetYPx)
    ],
    cssStyle: `font-family:${fontFamily};font-weight:${fontWeight};line-height:${formatCssNumber(lineHeight)}px;`
  };
};

const configureJsxGraphDashPattern = (board: JsxGraphBoardLike): void => {
  if (!Array.isArray(board.renderer?.dashArray)) return;
  board.renderer.dashArray[JSXGRAPH_STANDARD_DASH_INDEX - 1] = [...JSXGRAPH_STANDARD_DASH_PATTERN];
};

const readLineDashPattern = (value: unknown): number[] | null => (
  Array.isArray(value) && value.length > 0 && value.every((entry) => typeof entry === 'number' && Number.isFinite(entry) && entry > 0)
    ? [...value]
    : null
);

const readStandardCoordinateLabels = (value: unknown): StandardCoordinateLabelModel[] => (
  Array.isArray(value)
    ? value.filter((entry): entry is StandardCoordinateLabelModel => {
      const record = asRecord(entry) as Partial<StandardCoordinateLabelModel> | null;
      return !!record
        && typeof record.text === 'string'
        && (record.axis === 'x' || record.axis === 'y' || record.axis === 'plain')
        && (record.role === 'x-tick' || record.role === 'y-tick' || record.role === 'x-axis' || record.role === 'y-axis' || record.role === 'origin')
        && isPoint2D(record.point);
    })
    : []
);




const isJsxGraphDragDisabled = (node: GraphObjectNode): boolean => {
  const hints = node.renderHints ?? {};
  const meta = asRecord(node.meta);
  return meta?.locked === true
    || hints.draggable === false
    || meta?.draggable === false
    || meta?.dragDisabled === true
    || meta?.dragMode === 'disabled'
    || typeof meta?.coordinateSystemId === 'string';
};

const renderTextForJsxGraph = (
  descriptor: GraphTextRenderDescriptor,
  board: JsxGraphBoardLike,
  readVisualScale: () => number,
  renderHints: Record<string, unknown> | undefined
): { text: string | (() => string); attributes: Record<string, unknown> } => {
  if (descriptor.format === 'latex') ensureKatexStyles(resolveBoardDocument(board));
  const html = descriptor.format === 'latex'
    ? renderLatexHtmlAndMathMl(descriptor)
    : escapeHtml(descriptor.text);
  return {
    text: () => wrapTextHtmlForJsxGraph(html, readVisualScale(), descriptor.format === 'latex' ? 'latex' : 'plain', renderHints),
    attributes: {
      anchorX: 'left',
      anchorY: 'top',
      display: 'html',
      parse: false,
      needsRegularUpdate: true,
      cssStyle: 'background: transparent; border: 0; box-shadow: none;'
    }
  };
};

const renderLatexHtmlAndMathMl = (descriptor: GraphTextRenderDescriptor): string => (
  katex.renderToString(descriptor.latex ?? descriptor.text, {
    displayMode: descriptor.displayMode ?? false,
    output: 'htmlAndMathml',
    throwOnError: false,
    strict: 'ignore',
    trust: false
  })
);

const wrapTextHtmlForJsxGraph = (
  html: string,
  visualScale: number,
  format: 'latex' | 'plain',
  renderHints: Record<string, unknown> | undefined
): string => {
  const scale = normalizeVisualZoomScale(visualScale);
  const fontSize = formatCssNumber(readNumber(renderHints?.fontSize, JSXGRAPH_TEXT_BASE_FONT_SIZE) * scale);
  const className = format === 'latex' ? 'vuegraphx-jsxgraph-latex' : 'vuegraphx-jsxgraph-text';
  const textColor = readSafeCssValue(renderHints?.textColor) ?? readSafeCssValue(renderHints?.strokeColor) ?? 'inherit';
  const backgroundColor = readSafeCssValue(renderHints?.textBackgroundColor) ?? 'transparent';
  const borderColor = readSafeCssValue(renderHints?.textBorderColor);
  const borderWidth = readNumber(renderHints?.textBorderWidth, 1) * scale;
  const borderRadius = readNumber(renderHints?.textBorderRadius, 0) * scale;
  const paddingX = readNumber(renderHints?.textPaddingX, 0) * scale;
  const paddingY = readNumber(renderHints?.textPaddingY, 0) * scale;
  const offsetX = readNumber(renderHints?.textOffsetX, 0) * scale;
  const offsetY = readNumber(renderHints?.textOffsetY, 0) * scale;
  const shadowColor = readSafeCssValue(renderHints?.textShadowColor);
  const shadowBlur = readNumber(renderHints?.textShadowBlur, 0) * scale;
  const shadowOffsetX = readNumber(renderHints?.textShadowOffsetX, 0) * scale;
  const shadowOffsetY = readNumber(renderHints?.textShadowOffsetY, 0) * scale;
  const explicitFont = readSafeCssValue(renderHints?.font);
  const lineHeight = readNumber(renderHints?.lineHeight, 1.2);
  const lineHeightRule = lineHeight > 4
    ? `${formatCssNumber(lineHeight * scale)}px`
    : formatCssNumber(lineHeight);
  const fontRules = explicitFont
    ? `font:${explicitFont};`
    : `font-size:${fontSize}px;line-height:${lineHeightRule};font-weight:${readSafeCssValue(renderHints?.fontWeight) ?? 'inherit'};font-family:${readSafeCssValue(renderHints?.fontFamily) ?? 'inherit'};`;
  const shadow = shadowColor
    ? `${formatCssNumber(shadowOffsetX)}px ${formatCssNumber(shadowOffsetY)}px ${formatCssNumber(shadowBlur)}px ${shadowColor}`
    : 'none';
  const transform = offsetX || offsetY
    ? `transform:translate(${formatCssNumber(offsetX)}px, ${formatCssNumber(offsetY)}px);`
    : '';
  const opacity = formatCssNumber(readNumber(renderHints?.textOpacity, readNumber(renderHints?.opacity, 1)));
  return `<span class="${className}" style="display:inline-block;${fontRules}${transform}color:${textColor};background:${backgroundColor};border:${borderColor ? `${formatCssNumber(borderWidth)}px solid ${borderColor}` : '0'};border-radius:${formatCssNumber(borderRadius)}px;padding:${formatCssNumber(paddingY)}px ${formatCssNumber(paddingX)}px;box-shadow:${shadow};text-shadow:${shadow};opacity:${opacity};">${html}</span>`;
};

const ensureKatexStyles = (doc: Document | null): void => {
  if (!doc?.head || doc.getElementById(KATEX_STYLE_ELEMENT_ID)) return;
  const style = doc.createElement('style');
  style.id = KATEX_STYLE_ELEMENT_ID;
  style.textContent = KATEX_LAYOUT_CSS;
  doc.head.appendChild(style);
};

const resolveBoardDocument = (board: JsxGraphBoardLike): Document | null => (
  board.containerObj?.ownerDocument ?? (typeof document === 'undefined' ? null : document)
);

const readBoardWorldSpan = (board: JsxGraphBoardLike): { width: number; height: number } | null => {
  if (!board.getBoundingBox) return null;
  const [left, top, right, bottom] = board.getBoundingBox();
  const width = Math.abs(right - left);
  const height = Math.abs(top - bottom);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
  return {
    width,
    height
  };
};

const normalizeVisualZoomScale = (value: number): number => (
  Number.isFinite(value) && value > 0 ? value : 1
);

const formatCssNumber = (value: number): string => (
  Number.isFinite(value) ? Number(value.toFixed(3)).toString() : '0'
);

const escapeHtml = (value: string): string => (
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
);

const readSafeCssValue = (value: unknown): string | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed && !/[;"<>]/.test(trimmed) ? trimmed : null;
};

const normalizeElements = (value: JsxGraphElement | JsxGraphElement[] | null | undefined): JsxGraphElement[] => {
  if (!value) return [];
  return Array.isArray(value) ? value.filter(Boolean) : [value];
};

const asRecord = (value: unknown): Record<string, unknown> | null => typeof value === 'object' && value !== null ? value as Record<string, unknown> : null;
const isSelectedNode = (node: GraphObjectNode): boolean => node.meta?.selected === true || node.renderHints?.selected === true;

const resolveSelectedStrokeWidth = (strokeWidth: number): number => Math.max(1, strokeWidth) * 2;
const readJsxGraphLineCap = (value: unknown, fallback: 'butt' | 'round' | 'square'): 'butt' | 'round' | 'square' => (
  value === 'butt' || value === 'round' || value === 'square' ? value : fallback
);
const isPoint2D = (value: unknown): value is Point2D => {
  const record = asRecord(value);
  return typeof record?.x === 'number' && Number.isFinite(record.x) && typeof record.y === 'number' && Number.isFinite(record.y);
};
const readCoordinateSystemSegments2D = (geometry: Record<string, unknown>): Point2D[][] => {
  const segments: Point2D[][] = [];
  if (Array.isArray(geometry.segments)) {
    segments.push(...geometry.segments.map(readPointList2D).filter((points) => points.length >= 2));
    return segments;
  }
  if (Array.isArray(geometry.gridSegments)) {
    segments.push(...geometry.gridSegments.map(readPointList2D).filter((points) => points.length >= 2));
  }
  const border = readPointList2D(geometry.border);
  if (border.length >= 2) segments.push(border);
  const xAxis = readPointList2D(geometry.xAxis);
  if (xAxis.length >= 2) segments.push(xAxis);
  const yAxis = readPointList2D(geometry.yAxis);
  if (yAxis.length >= 2) segments.push(yAxis);
  return segments;
};

const readPointList2D = (value: unknown): Point2D[] => (
  Array.isArray(value) ? value.filter(isPoint2D) : []
);

const readPayloadPoint2D = (payload: Record<string, unknown> | null): Point2D | null => {
  if (isPoint2D(payload?.point)) return payload.point;
  const position = asRecord(payload?.position);
  if (position?.dimension === '2d' && isPoint2D(position)) return { x: position.x, y: position.y };
  return null;
};

const add = (left: Point2D, right: Point2D): Point2D => ({ x: left.x + right.x, y: left.y + right.y });
const subtract = (left: Point2D, right: Point2D): Point2D => ({ x: left.x - right.x, y: left.y - right.y });
const dot = (left: Point2D, right: Point2D): number => left.x * right.x + left.y * right.y;

const createSemanticGeometryForNode = (
  node: GraphObjectNode,
  payload: Record<string, unknown> | null,
  resolveNode: (objectId: string) => GraphObjectNode | null
): Record<string, unknown> | null => {
  if (node.type === 'equation' && typeof payload?.expression === 'string') {
    return geometryFromImplicitExpression(payload.expression);
  }

  if (node.type === 'solid') {
    return { kind: 'polyline', points: createSolidProjectionPolyline(payload) };
  }

  if (node.type !== 'conic') return null;
  const definition = asRecord(payload?.definition);
  const conicKind = typeof payload?.conicKind === 'string' ? payload.conicKind : '';

  if (definition?.mode === 'equation' && typeof definition.expression === 'string') {
    return geometryFromImplicitExpression(definition.expression);
  }

  if (definition?.mode === 'center-radii') {
    const center = resolvePointSource(definition.center, resolveNode);
    const radiusX = readNumber(definition.radiusX, NaN);
    const radiusY = readNumber(definition.radiusY, NaN);
    const rotationRadians = readNumber(definition.rotationRadians, 0);
    if (!center || !Number.isFinite(radiusX) || !Number.isFinite(radiusY)) return null;
    if (conicKind === 'ellipse') {
      return {
        kind: 'polyline',
        points: sampleEllipsePoints(center, radiusX, radiusY, rotationRadians)
      };
    }
    if (conicKind === 'hyperbola') {
      return {
        kind: 'multiline',
        segments: sampleHyperbolaSegments(center, radiusX, radiusY, rotationRadians)
      };
    }
  }

  if (definition?.mode === 'focus-directrix') {
    const focus = resolvePointSource(definition.focus, resolveNode);
    const directrixRef = asRecord(definition.directrix);
    const directrixNode = typeof directrixRef?.objectId === 'string' ? resolveNode(directrixRef.objectId) : null;
    const directrix = directrixNode ? readLineGeometry(directrixNode) : null;
    if (!focus || !directrix) return null;
    return { kind: 'polyline', points: sampleFocusDirectrixParabola(focus, directrix) };
  }

  return null;
};

const geometryFromImplicitExpression = (expression: string): Record<string, unknown> | null => {
  const segments = sampleImplicitEquationSegments(expression, {
    bounds: { left: DEFAULT_BOUNDS[0], top: DEFAULT_BOUNDS[1], right: DEFAULT_BOUNDS[2], bottom: DEFAULT_BOUNDS[3] },
    grid: 72
  });
  if (segments.length === 0) return null;
  return segments.length === 1
    ? { kind: 'polyline', points: segments[0] }
    : { kind: 'multiline', segments };
};

const sampleParametricClosedCurve = (pointAt: (theta: number) => Point2D, steps = 145): Point2D[] => {
  const points: Point2D[] = [];
  for (let index = 0; index < steps; index += 1) {
    points.push(pointAt((Math.PI * 2 * index) / (steps - 1)));
  }
  return points;
};

const sampleEllipsePoints = (
  center: Point2D,
  radiusX: number,
  radiusY: number,
  rotationRadians: number
): Point2D[] => sampleParametricClosedCurve((theta) => rotateAroundCenter({
  x: center.x + radiusX * Math.cos(theta),
  y: center.y + radiusY * Math.sin(theta)
}, center, rotationRadians));

const sampleHyperbolaSegments = (
  center: Point2D,
  radiusX: number,
  radiusY: number,
  rotationRadians: number
): Point2D[][] => [-1, 1].map((side) => {
  const points: Point2D[] = [];
  for (let index = 0; index < 96; index += 1) {
    const t = -2.2 + (4.4 * index) / 95;
    points.push(rotateAroundCenter({
      x: center.x + side * radiusX * Math.cosh(t),
      y: center.y + radiusY * Math.sinh(t)
    }, center, rotationRadians));
  }
  return points;
});

const sampleFocusDirectrixParabola = (
  focus: Point2D,
  directrix: { point: Point2D; direction: Point2D }
): Point2D[] => {
  const magnitude = Math.hypot(directrix.direction.x, directrix.direction.y);
  if (magnitude <= 1e-9) return [];
  const axisU = { x: directrix.direction.x / magnitude, y: directrix.direction.y / magnitude };
  let axisV = { x: -axisU.y, y: axisU.x };
  let focusV = dot(subtract(focus, directrix.point), axisV);
  if (Math.abs(focusV) <= 1e-9) return [];
  if (focusV < 0) {
    axisV = { x: -axisV.x, y: -axisV.y };
    focusV = -focusV;
  }
  const focusU = dot(subtract(focus, directrix.point), axisU);
  const span = Math.max(6, Math.abs(focusV) * 5);
  const points: Point2D[] = [];
  for (let index = 0; index < 240; index += 1) {
    const u = focusU - span + (2 * span * index) / 239;
    const v = (((u - focusU) ** 2) + focusV ** 2) / (2 * focusV);
    points.push({
      x: directrix.point.x + axisU.x * u + axisV.x * v,
      y: directrix.point.y + axisU.y * u + axisV.y * v
    });
  }
  return points;
};

const createSolidProjectionPolyline = (payload: Record<string, unknown> | null): Point2D[] => {
  const family = typeof payload?.family === 'string' ? payload.family : 'cube';
  const parameters = asRecord(payload?.parameters) ?? {};
  const origin = isPoint2D(payload?.origin) ? payload.origin : { x: 0, y: 0 };
  const size = readPositiveNumber(parameters.size, 2);
  const width = readPositiveNumber(parameters.width, size);
  const height = readPositiveNumber(parameters.height, size);
  const radius = readPositiveNumber(parameters.radius, Math.max(width, height) / 2);
  if (family === 'sphere' || family === 'cylinder' || family === 'cone' || family.includes('frustum')) {
    return sampleParametricClosedCurve((theta) => ({
      x: origin.x + radius * Math.cos(theta),
      y: origin.y + (height / 2) * Math.sin(theta)
    }), 97);
  }
  const depthOffset = Math.max(0.45, width * 0.22);
  const front = [
    { x: origin.x - width / 2, y: origin.y - height / 2 },
    { x: origin.x + width / 2, y: origin.y - height / 2 },
    { x: origin.x + width / 2, y: origin.y + height / 2 },
    { x: origin.x - width / 2, y: origin.y + height / 2 },
    { x: origin.x - width / 2, y: origin.y - height / 2 }
  ];
  const back = front.map((point) => ({ x: point.x + depthOffset, y: point.y + depthOffset }));
  return [
    ...front,
    back[0], back[1], front[1], back[1], back[2], front[2], back[2], back[3], front[3], back[3], back[0]
  ];
};

const resolvePointSource = (value: unknown, resolveNode: (objectId: string) => GraphObjectNode | null): Point2D | null => {
  const record = asRecord(value);
  const coordinates = asRecord(record?.coordinates);
  if (coordinates?.dimension === '2d' && isPoint2D(coordinates)) return coordinates;
  if (typeof record?.objectId === 'string') return getNodeAnchor(resolveNode(record.objectId));
  return isPoint2D(value) ? value : null;
};

const getNodeAnchor = (node: GraphObjectNode | null): Point2D | null => {
  const payload = asRecord(node?.payload);
  const geometry = asRecord(payload?.geometry);
  if (isPoint2D(payload?.point)) return payload.point;
  if (isPoint2D(payload?.position)) return payload.position;
  if (isPoint2D(geometry?.center)) return geometry.center;
  if (isPoint2D(geometry?.point)) return geometry.point;
  if (isPoint2D(geometry?.start) && isPoint2D(geometry.end)) return averagePoints([geometry.start, geometry.end]);
  if (Array.isArray(geometry?.points)) {
    const points = geometry.points.filter(isPoint2D);
    if (points.length > 0) return averagePoints(points);
  }
  if (Array.isArray(geometry?.vertices)) {
    const points = geometry.vertices.filter(isPoint2D);
    if (points.length > 0) return averagePoints(points);
  }
  return null;
};

const readLineGeometry = (node: GraphObjectNode): { point: Point2D; direction: Point2D } | null => {
  const payload = asRecord(node.payload);
  const geometry = asRecord(payload?.geometry);
  const point = isPoint2D(geometry?.point) ? geometry.point : isPoint2D(geometry?.origin) ? geometry.origin : isPoint2D(geometry?.start) ? geometry.start : null;
  const direction = isPoint2D(geometry?.direction) ? geometry.direction : null;
  if (point && direction) return { point, direction };
  const start = isPoint2D(geometry?.start) ? geometry.start : isPoint2D(payload?.start) ? payload.start : null;
  const end = isPoint2D(geometry?.end) ? geometry.end : isPoint2D(payload?.end) ? payload.end : null;
  if (start && end) return { point: start, direction: subtract(end, start) };
  return null;
};

const averagePoints = (points: Point2D[]): Point2D => ({
  x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
  y: points.reduce((sum, point) => sum + point.y, 0) / points.length
});

const rotateAroundCenter = (point: Point2D, center: Point2D, radians: number): Point2D => {
  if (radians === 0) return point;
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos
  };
};

const readNumber = (value: unknown, fallback: number): number => typeof value === 'number' && Number.isFinite(value) ? value : fallback;
const readPositiveNumber = (value: unknown, fallback: number): number => typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback;
const readFunctionDomain = (domain: unknown): [number, number] | undefined => {
  if (Array.isArray(domain) && domain.length >= 2 && typeof domain[0] === 'number' && typeof domain[1] === 'number') {
    return [domain[0], domain[1]];
  }
  const record = asRecord(domain);
  return typeof record?.min === 'number' && Number.isFinite(record.min) && typeof record.max === 'number' && Number.isFinite(record.max)
    ? [record.min, record.max]
    : undefined;
};
const readNumberRecord = (value: unknown): Record<string, number> => {
  const record = asRecord(value);
  if (!record) return {};
  return Object.fromEntries(
    Object.entries(record).filter((entry): entry is [string, number] => (
      typeof entry[1] === 'number' && Number.isFinite(entry[1])
    ))
  );
};

const directionForNode = (node: GraphObjectNode | null): Point2D | null => {
  const payload = asRecord(node?.payload);
  const geometry = asRecord(payload?.geometry);
  if (isPoint2D(geometry?.direction)) return geometry.direction;
  if (isPoint2D(geometry?.start) && isPoint2D(geometry.end)) return { x: geometry.end.x - geometry.start.x, y: geometry.end.y - geometry.start.y };
  if (isPoint2D(payload?.start) && isPoint2D(payload.end)) return { x: payload.end.x - payload.start.x, y: payload.end.y - payload.start.y };
  return null;
};

type NodeDistanceHit = {
  distance: number;
  coordinateSystemHitMode?: 'fallback';
};

const distanceHit = (distance: number | null): NodeDistanceHit | null => (
  distance === null ? null : { distance }
);

const distanceToNode = (node: GraphObjectNode, point: Point2D, tolerance: number): NodeDistanceHit | null => {
  const payload = asRecord(node.payload);
  const geometry = asRecord(payload?.geometry);
  const payloadPoint = readPayloadPoint2D(payload);
  if (payloadPoint) return distanceHit(Math.hypot(payloadPoint.x - point.x, payloadPoint.y - point.y));
  const coordinateSystemDistance = distanceToCoordinateSystemRegion(geometry, point, tolerance);
  if (coordinateSystemDistance !== null) return coordinateSystemDistance;
  if (geometry?.kind === 'circle' && isPoint2D(geometry.center) && typeof geometry.radius === 'number') {
    return distanceHit(Math.abs(Math.hypot(point.x - geometry.center.x, point.y - geometry.center.y) - geometry.radius));
  }
  if (geometry && (geometry.kind === 'segment' || node.type === 'vector') && isPoint2D(geometry.start) && isPoint2D(geometry.end)) {
    return distanceHit(distanceToSegment(point, geometry.start, geometry.end));
  }
  if (isPoint2D(payload?.start) && isPoint2D(payload.end)) return distanceHit(distanceToSegment(point, payload.start, payload.end));
  if ((geometry?.kind === 'line' || geometry?.kind === 'ray') && isPoint2D(geometry.point ?? geometry.origin) && isPoint2D(geometry.direction)) {
    const origin = (geometry.point ?? geometry.origin) as Point2D;
    if (geometry.kind === 'ray') {
      const projection = projectionParameter(point, origin, geometry.direction);
      if (projection < 0) return distanceHit(Math.hypot(point.x - origin.x, point.y - origin.y));
    }
    return distanceHit(distanceToInfiniteLine(point, origin, geometry.direction));
  }
  if (geometry?.kind === 'polygon' && Array.isArray(geometry.vertices)) {
    const points = geometry.vertices.filter(isPoint2D);
    return distanceHit(points.length >= 2 ? Math.min(...points.map((vertex, index) => distanceToSegment(point, vertex, points[(index + 1) % points.length]))) : null);
  }
  if (geometry?.kind === 'polyline' && Array.isArray(geometry.points)) {
    const points = geometry.points.filter(isPoint2D);
    if (points.length < 2) return null;
    const distances: number[] = [];
    for (let index = 0; index < points.length - 1; index += 1) distances.push(distanceToSegment(point, points[index], points[index + 1]));
    return distanceHit(Math.min(...distances));
  }
  const arcGeometry = readArcLikeGeometry(geometry);
  if (arcGeometry) {
    return distanceHit(distanceToArcLike(point, arcGeometry));
  }
  if (isPoint2D(payload?.point) && typeof payload?.text === 'string') {
    return distanceHit(Math.hypot(payload.point.x - point.x, payload.point.y - point.y));
  }
  const anglePoints = readAnglePoints(payload);
  if (anglePoints) {
    return distanceHit(distanceToAngle(point, anglePoints));
  }
  return null;
};


const distanceToCoordinateSystemRegion = (geometry: Record<string, unknown> | null, point: Point2D, tolerance: number): NodeDistanceHit | null => {
  if (geometry?.kind !== 'coordinate-system') return null;
  const segments = readCoordinateSystemSegments2D(geometry);
  const distances: number[] = [];
  for (const segment of segments) {
    for (let index = 1; index < segment.length; index += 1) distances.push(distanceToSegment(point, segment[index - 1], segment[index]));
  }
  const segmentDistance = distances.length > 0 ? Math.min(...distances) : Number.POSITIVE_INFINITY;
  if (segmentDistance <= tolerance) return { distance: segmentDistance, coordinateSystemHitMode: 'fallback' };

  const border = readPointList2D(geometry.border);
  if (border.length >= 3 && pointInPolygon2D(point, border)) return { distance: 0, coordinateSystemHitMode: 'fallback' };

  const bounds = boundsForPointGroups(segments);
  if (bounds && point.x >= bounds.minX && point.x <= bounds.maxX && point.y >= bounds.minY && point.y <= bounds.maxY) {
    return { distance: 0, coordinateSystemHitMode: 'fallback' };
  }

  return distances.length > 0 ? { distance: segmentDistance } : null;
};

const boundsForPointGroups = (groups: Point2D[][]): { minX: number; maxX: number; minY: number; maxY: number } | null => {
  const points = groups.flat();
  if (points.length === 0) return null;
  return {
    minX: Math.min(...points.map((entry) => entry.x)),
    maxX: Math.max(...points.map((entry) => entry.x)),
    minY: Math.min(...points.map((entry) => entry.y)),
    maxY: Math.max(...points.map((entry) => entry.y))
  };
};

const pointInPolygon2D = (point: Point2D, polygon: readonly Point2D[]): boolean => {
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index, index += 1) {
    const currentPoint = polygon[index];
    const previousPoint = polygon[previous];
    const crosses = (currentPoint.y > point.y) !== (previousPoint.y > point.y)
      && point.x < ((previousPoint.x - currentPoint.x) * (point.y - currentPoint.y)) / ((previousPoint.y - currentPoint.y) || Number.EPSILON) + currentPoint.x;
    if (crosses) inside = !inside;
  }
  return inside;
};

const readAnglePoints = (payload: Record<string, unknown> | null): [Point2D, Point2D, Point2D] | null => {
  const points = Array.isArray(payload?.points) ? payload.points.filter(isPoint2D) : [];
  return points.length >= 3 ? [points[0], points[1], points[2]] : null;
};

const readArcLikeGeometry = (geometry: Record<string, unknown> | null): { center: Point2D; start: Point2D; end: Point2D; radius: number } | null => {
  if (!geometry || (geometry.kind !== 'arc' && geometry.kind !== 'sector' && geometry.kind !== 'semicircle')) return null;
  if (!isPoint2D(geometry.center) || !isPoint2D(geometry.start) || !isPoint2D(geometry.end)) return null;
  const radius = typeof geometry.radius === 'number' && Number.isFinite(geometry.radius)
    ? geometry.radius
    : Math.hypot(geometry.start.x - geometry.center.x, geometry.start.y - geometry.center.y);
  return { center: geometry.center, start: geometry.start, end: geometry.end, radius };
};

const projectionParameter = (point: Point2D, start: Point2D, direction: Point2D): number => {
  const denominator = direction.x * direction.x + direction.y * direction.y;
  if (denominator <= 1e-9) return 0;
  return ((point.x - start.x) * direction.x + (point.y - start.y) * direction.y) / denominator;
};

const distanceToInfiniteLine = (point: Point2D, linePoint: Point2D, direction: Point2D): number => {
  const length = Math.hypot(direction.x, direction.y);
  if (length <= 1e-9) return Math.hypot(point.x - linePoint.x, point.y - linePoint.y);
  return Math.abs((point.x - linePoint.x) * direction.y - (point.y - linePoint.y) * direction.x) / length;
};

const distanceToSegment = (point: Point2D, start: Point2D, end: Point2D): number => {
  const direction = { x: end.x - start.x, y: end.y - start.y };
  const t = Math.max(0, Math.min(1, projectionParameter(point, start, direction)));
  const closest = { x: start.x + direction.x * t, y: start.y + direction.y * t };
  return Math.hypot(point.x - closest.x, point.y - closest.y);
};

const distanceToAngle = (point: Point2D, [first, vertex, third]: [Point2D, Point2D, Point2D]): number => {
  const radius = Math.max(0.35, Math.min(Math.hypot(first.x - vertex.x, first.y - vertex.y), Math.hypot(third.x - vertex.x, third.y - vertex.y)) * 0.35);
  return Math.abs(Math.hypot(point.x - vertex.x, point.y - vertex.y) - radius);
};

const distanceToArcLike = (
  point: Point2D,
  geometry: { center: Point2D; start: Point2D; end: Point2D; radius: number }
): number => {
  const radialDistance = Math.abs(Math.hypot(point.x - geometry.center.x, point.y - geometry.center.y) - geometry.radius);
  return Math.min(
    radialDistance,
    Math.hypot(point.x - geometry.start.x, point.y - geometry.start.y),
    Math.hypot(point.x - geometry.end.x, point.y - geometry.end.y)
  );
};
const readGridInput = (value: unknown): GraphViewportGridInput | undefined => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) return value as GraphViewportGridInput;
  return undefined;
};

const readHostSize = (host: HTMLElement): GraphViewportSize | null => {
  const rect = host.getBoundingClientRect?.();
  const width = host.clientWidth || rect?.width || 0;
  const height = host.clientHeight || rect?.height || 0;
  return width > 0 && height > 0 ? { width, height } : null;
};

const toJsxGraphBounds = (bounds: { left: number; top: number; right: number; bottom: number }): [number, number, number, number] => [
  bounds.left,
  bounds.top,
  bounds.right,
  bounds.bottom
];

const normalizeCssModulo = (value: number, modulo: number): number => {
  if (!Number.isFinite(value) || !Number.isFinite(modulo) || modulo <= 0) return 0;
  return ((value % modulo) + modulo) % modulo;
};
