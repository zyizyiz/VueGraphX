import type { GraphClientPoint, GraphViewportSize, GraphWorldPoint } from './contracts';

export interface GraphOverlayViewportPadding {
  left?: number;
  right?: number;
  top?: number;
  bottom?: number;
}

export interface GraphOverlayPositionOffset {
  x?: number;
  y?: number;
}

export interface GraphOverlayPositionInput {
  point: GraphWorldPoint;
  viewport: GraphViewportSize;
  project: (point: GraphWorldPoint) => GraphClientPoint | null;
  offset?: GraphOverlayPositionOffset;
  padding?: GraphOverlayViewportPadding;
  clamp?: boolean;
}

export interface GraphOverlayPosition {
  x: number;
  y: number;
  anchor: GraphClientPoint;
  point: GraphWorldPoint;
  viewport: GraphViewportSize;
  offset: Required<GraphOverlayPositionOffset>;
  visible: boolean;
}

export const resolveGraphOverlayPosition = (input: GraphOverlayPositionInput): GraphOverlayPosition | null => {
  const anchor = input.project(input.point);
  if (!anchor || !isFiniteClientPoint(anchor)) return null;

  const offset = normalizeOverlayOffset(input.offset);
  const rawPosition = {
    x: anchor.x + offset.x,
    y: anchor.y + offset.y
  };
  const position = input.clamp
    ? clampClientPoint(rawPosition, input.viewport, input.padding)
    : rawPosition;

  return {
    x: position.x,
    y: position.y,
    anchor: { ...anchor },
    point: cloneWorldPoint(input.point),
    viewport: { ...input.viewport },
    offset,
    visible: isPointInsideViewport(anchor, input.viewport, input.padding)
  };
};

const normalizeOverlayOffset = (offset: GraphOverlayPositionOffset | undefined): Required<GraphOverlayPositionOffset> => ({
  x: finiteOrZero(offset?.x),
  y: finiteOrZero(offset?.y)
});

const finiteOrZero = (value: number | undefined): number => (
  typeof value === 'number' && Number.isFinite(value) ? value : 0
);

const isFiniteClientPoint = (point: GraphClientPoint): boolean => (
  Number.isFinite(point.x) && Number.isFinite(point.y)
);

const isPointInsideViewport = (
  point: GraphClientPoint,
  viewport: GraphViewportSize,
  padding: GraphOverlayViewportPadding = {}
): boolean => {
  const left = finiteOrZero(padding.left);
  const right = finiteOrZero(padding.right);
  const top = finiteOrZero(padding.top);
  const bottom = finiteOrZero(padding.bottom);

  return point.x >= left
    && point.x <= Math.max(left, viewport.width - right)
    && point.y >= top
    && point.y <= Math.max(top, viewport.height - bottom);
};

const clampClientPoint = (
  point: GraphClientPoint,
  viewport: GraphViewportSize,
  padding: GraphOverlayViewportPadding = {}
): GraphClientPoint => {
  const left = finiteOrZero(padding.left);
  const right = finiteOrZero(padding.right);
  const top = finiteOrZero(padding.top);
  const bottom = finiteOrZero(padding.bottom);

  return {
    x: Math.max(left, Math.min(Math.max(left, viewport.width - right), point.x)),
    y: Math.max(top, Math.min(Math.max(top, viewport.height - bottom), point.y))
  };
};

const cloneWorldPoint = (point: GraphWorldPoint): GraphWorldPoint => (
  point.dimension === '3d'
    ? { dimension: '3d', x: point.x, y: point.y, z: point.z }
    : { dimension: '2d', x: point.x, y: point.y }
);
