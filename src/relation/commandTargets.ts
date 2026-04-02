import type { GraphRelationTargetFamily } from './contracts';
import type {
  GraphRelationDragObserver,
  GraphRelationDragSource,
  GraphRelationGeometry,
  GraphRelationTargetAssistAdapter,
  GraphRelationTargetRegistration
} from './targets';

const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

const getPointCoords = (point: any): [number, number] | null => {
  if (!point) return null;

  if (typeof point.X === 'function' && typeof point.Y === 'function') {
    const x = point.X();
    const y = point.Y();
    if (isFiniteNumber(x) && isFiniteNumber(y)) {
      return [x, y];
    }
  }

  const usrCoords = point?.coords?.usrCoords;
  if (Array.isArray(usrCoords) && usrCoords.length >= 3) {
    const [, x, y] = usrCoords;
    if (isFiniteNumber(x) && isFiniteNumber(y)) {
      return [x, y];
    }
  }

  return null;
};

const getLinearGeometry = (element: any, family: 'line-like' | 'segment-like') => {
  const first = getPointCoords(element?.point1 ?? element?.points?.[0]);
  const second = getPointCoords(element?.point2 ?? element?.points?.[1]);

  if (!first || !second) return null;

  return {
    family,
    x1: first[0],
    y1: first[1],
    x2: second[0],
    y2: second[1]
  };
};

const getLinearPoints = (element: any): [any, any] | null => {
  const first = element?.point1 ?? element?.points?.[0];
  const second = element?.point2 ?? element?.points?.[1];
  return first && second ? [first, second] : null;
};

const bindNativeEvent = (target: any, eventName: 'down' | 'drag' | 'up', handler: () => void): (() => void) => {
  if (!target || typeof target.on !== 'function') {
    return () => undefined;
  }

  target.on(eventName, handler);
  return typeof target.off === 'function'
    ? () => target.off(eventName, handler)
    : () => undefined;
};

const dragSourcePriority = (source: GraphRelationDragSource): number => {
  switch (source) {
    case 'point1':
    case 'point2':
      return 2;
    case 'element':
    default:
      return 1;
  }
};

const createLinearAssistAdapter = (
  element: any
): GraphRelationTargetAssistAdapter => {
  let isApplying = false;

  const subscribeDrag = (observer: GraphRelationDragObserver) => {
    const handles: Array<{ source: GraphRelationDragSource; handle: any }> = [
      { source: 'element' as const, handle: element },
      { source: 'point1' as const, handle: element?.point1 ?? element?.points?.[0] },
      { source: 'point2' as const, handle: element?.point2 ?? element?.points?.[1] }
    ].filter((entry) => !!entry.handle);
    const disposers: Array<() => void> = [];
    let activeSource: GraphRelationDragSource | null = null;

    handles.forEach(({ source, handle }) => {
      disposers.push(bindNativeEvent(handle, 'down', () => {
        if (isApplying) return;
        activeSource = source;
        observer.onStart?.(source);
      }));
      disposers.push(bindNativeEvent(handle, 'drag', () => {
        if (isApplying) return;
        if (!activeSource || dragSourcePriority(source) >= dragSourcePriority(activeSource)) {
          activeSource = source;
        }
        observer.onMove?.(activeSource ?? source);
      }));
      disposers.push(bindNativeEvent(handle, 'up', () => {
        if (isApplying) return;
        observer.onEnd?.(activeSource ?? source);
        activeSource = null;
      }));
    });

    return () => {
      disposers.forEach((dispose) => dispose());
    };
  };

  const applyGeometry = (geometry: GraphRelationGeometry): boolean => {
    if (geometry.family !== 'line-like' && geometry.family !== 'segment-like') {
      return false;
    }
    const points = getLinearPoints(element);
    if (!points) return false;
    const [first, second] = points;
    if (typeof first?.moveTo !== 'function' || typeof second?.moveTo !== 'function') {
      return false;
    }

    isApplying = true;
    try {
      first.moveTo([geometry.x1, geometry.y1], 0);
      second.moveTo([geometry.x2, geometry.y2], 0);
      return true;
    } finally {
      isApplying = false;
    }
  };

  return {
    subscribeDrag,
    applyGeometry
  };
};

const createPointAssistAdapter = (
  element: any
): GraphRelationTargetAssistAdapter => {
  let isApplying = false;

  const subscribeDrag = (observer: GraphRelationDragObserver) => {
    const disposeDown = bindNativeEvent(element, 'down', () => {
      if (!isApplying) observer.onStart?.('element');
    });
    const disposeDrag = bindNativeEvent(element, 'drag', () => {
      if (!isApplying) observer.onMove?.('element');
    });
    const disposeUp = bindNativeEvent(element, 'up', () => {
      if (!isApplying) observer.onEnd?.('element');
    });

    return () => {
      disposeDown();
      disposeDrag();
      disposeUp();
    };
  };

  const applyGeometry = (geometry: GraphRelationGeometry): boolean => {
    if (geometry.family !== 'point') return false;
    if (typeof element?.moveTo !== 'function') return false;

    isApplying = true;
    try {
      element.moveTo([geometry.x, geometry.y], 0);
      return true;
    } finally {
      isApplying = false;
    }
  };

  return {
    subscribeDrag,
    applyGeometry
  };
};

const getCircleGeometry = (element: any) => {
  const center = getPointCoords(element?.center ?? element?.midpoint);
  if (!center) return null;

  const radius = typeof element?.Radius === 'function'
    ? element.Radius()
    : typeof element?.radius === 'number'
      ? element.radius
      : undefined;

  if (!isFiniteNumber(radius)) return null;

  return {
    family: 'circle-like' as const,
    cx: center[0],
    cy: center[1],
    radius
  };
};

const normalizeKind = (value: string): string => value.trim().toLowerCase().replace(/[\s_-]/g, '');

export const resolveCommandTargetFamily = (typeInput: string): GraphRelationTargetFamily | null => {
  const type = normalizeKind(typeInput);

  if (type === 'point') return 'point';
  if (type === 'segment') return 'segment-like';
  if (['line', 'ray', 'arrow', 'parallel', 'perpendicular', 'tangent', 'normal', 'bisector'].includes(type)) {
    return 'line-like';
  }
  if (type === 'circle') return 'circle-like';

  return null;
};

export const createCommandRelationTarget = (input: {
  resolvedType: string;
  rawType?: string;
  label: string;
  sourceExpression: string;
  element: any;
}): GraphRelationTargetRegistration | null => {
  const family = resolveCommandTargetFamily(input.resolvedType || input.rawType || '');
  if (!family) return null;

  if (family === 'point') {
    return {
      family,
      label: input.label,
      sourceExpression: input.sourceExpression,
      ownerLabel: input.label,
      getGeometry: () => {
        const coords = getPointCoords(input.element);
        return coords ? { family, x: coords[0], y: coords[1] } : null;
      },
      assist: createPointAssistAdapter(input.element)
    };
  }

  if (family === 'line-like' || family === 'segment-like') {
    return {
      family,
      label: input.label,
      sourceExpression: input.sourceExpression,
      ownerLabel: input.label,
      getGeometry: () => getLinearGeometry(input.element, family),
      assist: createLinearAssistAdapter(input.element)
    };
  }

  return {
    family,
    label: input.label,
    sourceExpression: input.sourceExpression,
    ownerLabel: input.label,
    getGeometry: () => getCircleGeometry(input.element)
  };
};
