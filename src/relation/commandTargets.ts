import type { GraphRelationTargetFamily } from './contracts';
import type { GraphRelationTargetRegistration } from './targets';

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
      }
    };
  }

  if (family === 'line-like' || family === 'segment-like') {
    return {
      family,
      label: input.label,
      sourceExpression: input.sourceExpression,
      ownerLabel: input.label,
      getGeometry: () => getLinearGeometry(input.element, family)
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
