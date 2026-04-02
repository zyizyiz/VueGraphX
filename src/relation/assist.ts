import type { GraphRelationAssistOptions, GraphRelationRecord } from './contracts';
import type {
  GraphRelationDragSource,
  GraphRelationGeometry,
  GraphRelationLineGeometry,
  GraphRelationPointGeometry,
  GraphRelationSegmentGeometry,
  GraphRelationTargetRecord
} from './targets';
import { buildRelationTargetKey } from './targets';

export const DEFAULT_PARALLEL_SNAP_ENTER_ANGLE = 2;
export const DEFAULT_PARALLEL_SNAP_EXIT_ANGLE = 3.5;
export const DEFAULT_PERPENDICULAR_SNAP_ENTER_ANGLE = 2;
export const DEFAULT_PERPENDICULAR_SNAP_EXIT_ANGLE = 3.5;
export const DEFAULT_EQUAL_LENGTH_SNAP_ENTER_DELTA = 0.1;
export const DEFAULT_EQUAL_LENGTH_SNAP_EXIT_DELTA = 0.2;
export const DEFAULT_DISTANCE_ASSERTION_SNAP_ENTER_DELTA = 0.1;
export const DEFAULT_DISTANCE_ASSERTION_SNAP_EXIT_DELTA = 0.2;

export const normalizeRelationAssistOptions = (
  options?: GraphRelationAssistOptions
): Required<GraphRelationAssistOptions> => {
  const enter = typeof options?.parallelSnapEnterAngle === 'number' && Number.isFinite(options.parallelSnapEnterAngle)
    ? Math.max(0, options.parallelSnapEnterAngle)
    : DEFAULT_PARALLEL_SNAP_ENTER_ANGLE;
  const exit = typeof options?.parallelSnapExitAngle === 'number' && Number.isFinite(options.parallelSnapExitAngle)
    ? Math.max(enter, options.parallelSnapExitAngle)
    : Math.max(enter, DEFAULT_PARALLEL_SNAP_EXIT_ANGLE);

  return {
    parallelSnapEnterAngle: enter,
    parallelSnapExitAngle: exit,
    perpendicularSnapEnterAngle: typeof options?.perpendicularSnapEnterAngle === 'number' && Number.isFinite(options.perpendicularSnapEnterAngle)
      ? Math.max(0, options.perpendicularSnapEnterAngle)
      : DEFAULT_PERPENDICULAR_SNAP_ENTER_ANGLE,
    perpendicularSnapExitAngle: (() => {
      const perpendicularEnter = typeof options?.perpendicularSnapEnterAngle === 'number' && Number.isFinite(options.perpendicularSnapEnterAngle)
        ? Math.max(0, options.perpendicularSnapEnterAngle)
        : DEFAULT_PERPENDICULAR_SNAP_ENTER_ANGLE;
      return typeof options?.perpendicularSnapExitAngle === 'number' && Number.isFinite(options.perpendicularSnapExitAngle)
        ? Math.max(perpendicularEnter, options.perpendicularSnapExitAngle)
        : Math.max(perpendicularEnter, DEFAULT_PERPENDICULAR_SNAP_EXIT_ANGLE);
    })(),
    equalLengthSnapEnterDelta: typeof options?.equalLengthSnapEnterDelta === 'number' && Number.isFinite(options.equalLengthSnapEnterDelta)
      ? Math.max(0, options.equalLengthSnapEnterDelta)
      : DEFAULT_EQUAL_LENGTH_SNAP_ENTER_DELTA,
    equalLengthSnapExitDelta: (() => {
      const equalLengthEnter = typeof options?.equalLengthSnapEnterDelta === 'number' && Number.isFinite(options.equalLengthSnapEnterDelta)
        ? Math.max(0, options.equalLengthSnapEnterDelta)
        : DEFAULT_EQUAL_LENGTH_SNAP_ENTER_DELTA;
      return typeof options?.equalLengthSnapExitDelta === 'number' && Number.isFinite(options.equalLengthSnapExitDelta)
        ? Math.max(equalLengthEnter, options.equalLengthSnapExitDelta)
        : Math.max(equalLengthEnter, DEFAULT_EQUAL_LENGTH_SNAP_EXIT_DELTA);
    })(),
    distanceAssertionSnapEnterDelta: typeof options?.distanceAssertionSnapEnterDelta === 'number' && Number.isFinite(options.distanceAssertionSnapEnterDelta)
      ? Math.max(0, options.distanceAssertionSnapEnterDelta)
      : DEFAULT_DISTANCE_ASSERTION_SNAP_ENTER_DELTA,
    distanceAssertionSnapExitDelta: (() => {
      const distanceEnter = typeof options?.distanceAssertionSnapEnterDelta === 'number' && Number.isFinite(options.distanceAssertionSnapEnterDelta)
        ? Math.max(0, options.distanceAssertionSnapEnterDelta)
        : DEFAULT_DISTANCE_ASSERTION_SNAP_ENTER_DELTA;
      return typeof options?.distanceAssertionSnapExitDelta === 'number' && Number.isFinite(options.distanceAssertionSnapExitDelta)
        ? Math.max(distanceEnter, options.distanceAssertionSnapExitDelta)
        : Math.max(distanceEnter, DEFAULT_DISTANCE_ASSERTION_SNAP_EXIT_DELTA);
    })()
  };
};

export interface GraphRelationAssistResolution {
  relationId: string;
  geometry: GraphRelationGeometry;
  angleDelta: number;
}

export interface ResolveRelationAssistInput {
  records: GraphRelationRecord[];
  targets: GraphRelationTargetRecord[];
  draggedTargetKey: string;
  dragSource?: GraphRelationDragSource | null;
  latchedRelationId?: string | null;
  options?: GraphRelationAssistOptions;
}

const isLinearGeometry = (
  geometry: GraphRelationGeometry | null
): geometry is GraphRelationLineGeometry | GraphRelationSegmentGeometry => (
  geometry?.family === 'line-like' || geometry?.family === 'segment-like'
);

const isPointGeometry = (
  geometry: GraphRelationGeometry | null
): geometry is GraphRelationPointGeometry => geometry?.family === 'point';

const isSegmentGeometry = (
  geometry: GraphRelationGeometry | null
): geometry is GraphRelationSegmentGeometry => geometry?.family === 'segment-like';

const toVector = (geometry: GraphRelationLineGeometry | GraphRelationSegmentGeometry) => ({
  dx: geometry.x2 - geometry.x1,
  dy: geometry.y2 - geometry.y1
});

const lengthOf = (dx: number, dy: number) => Math.hypot(dx, dy);

export const measureParallelAngleDelta = (
  first: GraphRelationLineGeometry | GraphRelationSegmentGeometry,
  second: GraphRelationLineGeometry | GraphRelationSegmentGeometry
): number => {
  const vectorA = toVector(first);
  const vectorB = toVector(second);
  const normA = lengthOf(vectorA.dx, vectorA.dy);
  const normB = lengthOf(vectorB.dx, vectorB.dy);
  if (normA === 0 || normB === 0) return Number.POSITIVE_INFINITY;

  const dot = (vectorA.dx * vectorB.dx) + (vectorA.dy * vectorB.dy);
  const cross = (vectorA.dx * vectorB.dy) - (vectorA.dy * vectorB.dx);
  return Math.atan2(Math.abs(cross), Math.abs(dot)) * 180 / Math.PI;
};

export const measurePerpendicularAngleDelta = (
  first: GraphRelationLineGeometry | GraphRelationSegmentGeometry,
  second: GraphRelationLineGeometry | GraphRelationSegmentGeometry
): number => Math.abs(90 - measureParallelAngleDelta(first, second));

export const measureEqualLengthDelta = (
  first: GraphRelationSegmentGeometry,
  second: GraphRelationSegmentGeometry
): number => Math.abs(lengthOf(first.x2 - first.x1, first.y2 - first.y1) - lengthOf(second.x2 - second.x1, second.y2 - second.y1));

export const measureDistanceAssertionDelta = (
  first: GraphRelationPointGeometry,
  second: GraphRelationPointGeometry,
  expectedValue: number
): number => Math.abs(lengthOf(second.x - first.x, second.y - first.y) - expectedValue);

const resolveAlignedUnit = (
  reference: GraphRelationLineGeometry | GraphRelationSegmentGeometry,
  draggedVector: { dx: number; dy: number },
  mode: 'parallel' | 'perpendicular'
) => {
  const referenceVector = toVector(reference);
  const referenceLength = lengthOf(referenceVector.dx, referenceVector.dy);
  if (referenceLength === 0) return null;

  const baseX = referenceVector.dx / referenceLength;
  const baseY = referenceVector.dy / referenceLength;
  const candidates = mode === 'parallel'
    ? [
        { x: baseX, y: baseY },
        { x: -baseX, y: -baseY }
      ]
    : [
        { x: -baseY, y: baseX },
        { x: baseY, y: -baseX }
      ];

  return candidates.reduce((best, candidate) => {
    if (!best) return candidate;
    const bestDot = (draggedVector.dx * best.x) + (draggedVector.dy * best.y);
    const nextDot = (draggedVector.dx * candidate.x) + (draggedVector.dy * candidate.y);
    return nextDot > bestDot ? candidate : best;
  }, null as { x: number; y: number } | null);
};

const buildDirectionalAssistGeometry = (
  dragged: GraphRelationLineGeometry | GraphRelationSegmentGeometry,
  reference: GraphRelationLineGeometry | GraphRelationSegmentGeometry,
  dragSource: GraphRelationDragSource = 'element',
  mode: 'parallel' | 'perpendicular' = 'parallel'
): GraphRelationLineGeometry | GraphRelationSegmentGeometry | null => {
  const draggedVector = toVector(dragged);
  const draggedLength = lengthOf(draggedVector.dx, draggedVector.dy);
  if (draggedLength === 0) return null;

  const alignedUnit = resolveAlignedUnit(reference, draggedVector, mode);
  if (!alignedUnit) return null;
  const ux = alignedUnit.x;
  const uy = alignedUnit.y;

  if (dragSource === 'point1') {
    return {
      family: dragged.family,
      x1: dragged.x2 - (ux * draggedLength),
      y1: dragged.y2 - (uy * draggedLength),
      x2: dragged.x2,
      y2: dragged.y2
    };
  }

  if (dragSource === 'point2') {
    return {
      family: dragged.family,
      x1: dragged.x1,
      y1: dragged.y1,
      x2: dragged.x1 + (ux * draggedLength),
      y2: dragged.y1 + (uy * draggedLength)
    };
  }

  const halfLength = draggedLength / 2;
  const midpointX = (dragged.x1 + dragged.x2) / 2;
  const midpointY = (dragged.y1 + dragged.y2) / 2;

  return {
    family: dragged.family,
    x1: midpointX - (ux * halfLength),
    y1: midpointY - (uy * halfLength),
    x2: midpointX + (ux * halfLength),
    y2: midpointY + (uy * halfLength)
  };
};

export const buildParallelAssistGeometry = (
  dragged: GraphRelationLineGeometry | GraphRelationSegmentGeometry,
  reference: GraphRelationLineGeometry | GraphRelationSegmentGeometry,
  dragSource: GraphRelationDragSource = 'element'
): GraphRelationLineGeometry | GraphRelationSegmentGeometry | null => (
  buildDirectionalAssistGeometry(dragged, reference, dragSource, 'parallel')
);

export const buildPerpendicularAssistGeometry = (
  dragged: GraphRelationLineGeometry | GraphRelationSegmentGeometry,
  reference: GraphRelationLineGeometry | GraphRelationSegmentGeometry,
  dragSource: GraphRelationDragSource = 'element'
): GraphRelationLineGeometry | GraphRelationSegmentGeometry | null => (
  buildDirectionalAssistGeometry(dragged, reference, dragSource, 'perpendicular')
);

export const buildEqualLengthAssistGeometry = (
  dragged: GraphRelationSegmentGeometry,
  reference: GraphRelationSegmentGeometry,
  dragSource: GraphRelationDragSource = 'element'
): GraphRelationSegmentGeometry | null => {
  const draggedVector = toVector(dragged);
  const draggedLength = lengthOf(draggedVector.dx, draggedVector.dy);
  const referenceLength = lengthOf(reference.x2 - reference.x1, reference.y2 - reference.y1);
  if (draggedLength === 0 || referenceLength === 0) return null;

  const ux = draggedVector.dx / draggedLength;
  const uy = draggedVector.dy / draggedLength;

  if (dragSource === 'point1') {
    return {
      family: 'segment-like',
      x1: dragged.x2 - (ux * referenceLength),
      y1: dragged.y2 - (uy * referenceLength),
      x2: dragged.x2,
      y2: dragged.y2
    };
  }

  if (dragSource === 'point2') {
    return {
      family: 'segment-like',
      x1: dragged.x1,
      y1: dragged.y1,
      x2: dragged.x1 + (ux * referenceLength),
      y2: dragged.y1 + (uy * referenceLength)
    };
  }

  const midpointX = (dragged.x1 + dragged.x2) / 2;
  const midpointY = (dragged.y1 + dragged.y2) / 2;
  const halfLength = referenceLength / 2;

  return {
    family: 'segment-like',
    x1: midpointX - (ux * halfLength),
    y1: midpointY - (uy * halfLength),
    x2: midpointX + (ux * halfLength),
    y2: midpointY + (uy * halfLength)
  };
};

export const buildDistanceAssertionAssistGeometry = (
  dragged: GraphRelationPointGeometry,
  reference: GraphRelationPointGeometry,
  expectedValue: number
): GraphRelationPointGeometry | null => {
  if (!Number.isFinite(expectedValue) || expectedValue < 0) return null;

  const dx = dragged.x - reference.x;
  const dy = dragged.y - reference.y;
  const currentLength = lengthOf(dx, dy);

  if (currentLength === 0) {
    return {
      family: 'point',
      x: reference.x + expectedValue,
      y: reference.y
    };
  }

  const ux = dx / currentLength;
  const uy = dy / currentLength;
  return {
    family: 'point',
    x: reference.x + (ux * expectedValue),
    y: reference.y + (uy * expectedValue)
  };
};

export const areRelationGeometriesEquivalent = (
  first: GraphRelationGeometry | null,
  second: GraphRelationGeometry | null,
  epsilon = 1e-6
): boolean => {
  if (isPointGeometry(first) && isPointGeometry(second)) {
    return (
      Math.abs(first.x - second.x) <= epsilon
      && Math.abs(first.y - second.y) <= epsilon
    );
  }
  if (!isLinearGeometry(first) || !isLinearGeometry(second)) return false;
  return (
    Math.abs(first.x1 - second.x1) <= epsilon
    && Math.abs(first.y1 - second.y1) <= epsilon
    && Math.abs(first.x2 - second.x2) <= epsilon
    && Math.abs(first.y2 - second.y2) <= epsilon
  );
};

export const resolveRelationAssist = (
  input: ResolveRelationAssistInput
): GraphRelationAssistResolution | null => {
  const options = normalizeRelationAssistOptions(input.options);
  const targetMap = new Map(input.targets.map((target) => [target.key, target]));
  const draggedTarget = targetMap.get(input.draggedTargetKey);
  const draggedGeometry = draggedTarget?.getGeometry() ?? null;

  if (!draggedTarget || (!isLinearGeometry(draggedGeometry) && !isPointGeometry(draggedGeometry))) {
    return null;
  }

  const candidates = input.records
    .filter((record) => record.active && (
      record.kind === 'parallel'
      || record.kind === 'perpendicular'
      || record.kind === 'equal-length'
      || record.kind === 'distance-assertion'
    ))
    .map((record) => {
      const targetKeys = record.targets.map((target) => buildRelationTargetKey(target));
      if (!targetKeys.includes(input.draggedTargetKey)) return null;

      const otherTargetKey = targetKeys.find((targetKey) => targetKey !== input.draggedTargetKey);
      if (!otherTargetKey) return null;

      const otherTarget = targetMap.get(otherTargetKey);
      const otherGeometry = otherTarget?.getGeometry() ?? null;
      if (!otherTarget) return null;
      if (record.kind === 'equal-length') {
        if (!isSegmentGeometry(draggedGeometry) || !isSegmentGeometry(otherGeometry)) return null;
        const draggedSegment = draggedGeometry;
        const referenceSegment = otherGeometry;
        return {
          record,
          angleDelta: measureEqualLengthDelta(draggedSegment, referenceSegment),
          geometry: buildEqualLengthAssistGeometry(draggedSegment, referenceSegment, input.dragSource ?? 'element')
        };
      }
      if (record.kind === 'distance-assertion') {
        if (!isPointGeometry(draggedGeometry) || !isPointGeometry(otherGeometry)) return null;
        if (typeof record.params?.expectedValue !== 'number' || !Number.isFinite(record.params.expectedValue)) return null;
        return {
          record,
          angleDelta: measureDistanceAssertionDelta(draggedGeometry, otherGeometry, record.params.expectedValue),
          geometry: buildDistanceAssertionAssistGeometry(draggedGeometry, otherGeometry, record.params.expectedValue)
        };
      } else if (!isLinearGeometry(otherGeometry)) {
        return null;
      }
      if (!isLinearGeometry(draggedGeometry)) {
        return null;
      }

      return record.kind === 'parallel'
        ? {
            record,
            angleDelta: measureParallelAngleDelta(draggedGeometry, otherGeometry),
            geometry: buildParallelAssistGeometry(draggedGeometry, otherGeometry, input.dragSource ?? 'element')
          }
        : {
            record,
            angleDelta: measurePerpendicularAngleDelta(draggedGeometry, otherGeometry),
            geometry: buildPerpendicularAssistGeometry(draggedGeometry, otherGeometry, input.dragSource ?? 'element')
          };
    })
    .filter((
      candidate
    ): candidate is {
      record: GraphRelationRecord;
      angleDelta: number;
      geometry: GraphRelationLineGeometry | GraphRelationSegmentGeometry | null;
    } => !!candidate && !!candidate.geometry);

  const eligible = candidates
    .filter((candidate) => {
      const threshold = candidate.record.kind === 'parallel'
        ? (candidate.record.id === input.latchedRelationId
            ? options.parallelSnapExitAngle
            : options.parallelSnapEnterAngle)
        : candidate.record.kind === 'perpendicular'
          ? (candidate.record.id === input.latchedRelationId
              ? options.perpendicularSnapExitAngle
              : options.perpendicularSnapEnterAngle)
          : candidate.record.kind === 'equal-length'
            ? (candidate.record.id === input.latchedRelationId
                ? options.equalLengthSnapExitDelta
                : options.equalLengthSnapEnterDelta)
            : (candidate.record.id === input.latchedRelationId
                ? options.distanceAssertionSnapExitDelta
                : options.distanceAssertionSnapEnterDelta);
      return candidate.angleDelta <= threshold;
    })
    .sort((left, right) => left.angleDelta - right.angleDelta);

  const best = eligible[0];
  if (!best?.geometry) return null;

  return {
    relationId: best.record.id,
    geometry: best.geometry,
    angleDelta: best.angleDelta
  };
};
