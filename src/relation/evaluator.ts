import type {
  GraphRelationDiagnostic,
  GraphRelationKind,
  GraphRelationMeasurement,
  GraphRelationRecord,
  GraphRelationSnapshot
} from './contracts';
import { buildRelationTargetKey, type GraphRelationGeometry, type GraphRelationTargetRecord } from './targets';

const DEFAULT_DIRECTION_TOLERANCE = 1e-2;
const DEFAULT_DISTANCE_TOLERANCE = 5e-2;

const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const isLineLikeGeometry = (value: GraphRelationGeometry | null): value is Extract<GraphRelationGeometry, { family: 'line-like' | 'segment-like' }> => (
  value?.family === 'line-like' || value?.family === 'segment-like'
);
const isPointGeometry = (value: GraphRelationGeometry | null): value is Extract<GraphRelationGeometry, { family: 'point' }> => value?.family === 'point';
const isSegmentGeometry = (value: GraphRelationGeometry | null): value is Extract<GraphRelationGeometry, { family: 'segment-like' }> => value?.family === 'segment-like';

const formatNumber = (value: number) => Number(value.toFixed(3));

const toVector = (geometry: Extract<GraphRelationGeometry, { family: 'line-like' | 'segment-like' }>) => ({
  dx: geometry.x2 - geometry.x1,
  dy: geometry.y2 - geometry.y1
});

const lengthOf = (dx: number, dy: number) => Math.hypot(dx, dy);
const pairKeyFor = (record: GraphRelationRecord) => record.targets
  .map((target) => buildRelationTargetKey(target))
  .sort((a, b) => a.localeCompare(b))
  .join('|');

const buildSnapshot = (
  record: GraphRelationRecord,
  targetLabels: string[],
  status: GraphRelationSnapshot['status'],
  explanation: string,
  diagnostics: GraphRelationDiagnostic[] = [],
  measurements?: GraphRelationMeasurement[]
): GraphRelationSnapshot => ({
  ...record,
  targets: record.targets.map((target) => ({ ...target })),
  params: record.params ? { ...record.params } : undefined,
  targetLabels,
  status,
  explanation: record.active ? explanation : `Inactive · ${explanation}`,
  diagnostics,
  measurements
});

const resolveConflictingRelationIds = (records: GraphRelationRecord[]): Set<string> => {
  const byPair = new Map<string, GraphRelationKind[]>();
  const relationIdsByPair = new Map<string, string[]>();

  records.filter((record) => record.active).forEach((record) => {
    const pairKey = pairKeyFor(record);
    byPair.set(pairKey, [...(byPair.get(pairKey) ?? []), record.kind]);
    relationIdsByPair.set(pairKey, [...(relationIdsByPair.get(pairKey) ?? []), record.id]);
  });

  const conflictingIds = new Set<string>();
  byPair.forEach((kinds, pairKey) => {
    if (kinds.includes('parallel') && kinds.includes('perpendicular')) {
      (relationIdsByPair.get(pairKey) ?? []).forEach((relationId) => conflictingIds.add(relationId));
    }
  });

  return conflictingIds;
};

const evaluateDirectionRelation = (
  record: GraphRelationRecord,
  targetLabels: string[],
  geometries: GraphRelationGeometry[]
): GraphRelationSnapshot => {
  if (!isLineLikeGeometry(geometries[0]) || !isLineLikeGeometry(geometries[1])) {
    return buildSnapshot(record, targetLabels, 'unsupported', 'This relation requires two line-like targets.', [{
      code: 'relation_unsupported_targets',
      message: 'Parallel and perpendicular relations only support line-like targets.',
      severity: 'error',
      relationId: record.id
    }]);
  }

  const first = toVector(geometries[0]);
  const second = toVector(geometries[1]);
  const norm1 = lengthOf(first.dx, first.dy);
  const norm2 = lengthOf(second.dx, second.dy);
  if (norm1 === 0 || norm2 === 0) {
    return buildSnapshot(record, targetLabels, 'unsupported', 'This relation cannot be evaluated because one target has zero length.', [{
      code: 'relation_degenerate_target',
      message: 'A line-like target has zero length and cannot be evaluated.',
      severity: 'error',
      relationId: record.id
    }]);
  }

  const dot = (first.dx * second.dx) + (first.dy * second.dy);
  const normalizedDot = Math.abs(dot) / (norm1 * norm2);
  const cross = (first.dx * second.dy) - (first.dy * second.dx);
  const normalizedCross = Math.abs(cross) / (norm1 * norm2);
  const tolerance = record.params?.tolerance ?? DEFAULT_DIRECTION_TOLERANCE;

  const measurement: GraphRelationMeasurement = {
    kind: 'angle',
    actualValue: formatNumber(Math.atan2(Math.abs(cross), Math.abs(dot)) * 180 / Math.PI)
  };

  if (record.kind === 'parallel') {
    return normalizedCross <= tolerance
      ? buildSnapshot(record, targetLabels, 'satisfied', 'The two targets are parallel.', [], [measurement])
      : buildSnapshot(record, targetLabels, 'violated', 'The two targets are no longer parallel.', [], [measurement]);
  }

  return normalizedDot <= tolerance
    ? buildSnapshot(record, targetLabels, 'satisfied', 'The two targets are perpendicular.', [], [measurement])
    : buildSnapshot(record, targetLabels, 'violated', 'The two targets are not perpendicular.', [], [measurement]);
};

const evaluateEqualLengthRelation = (
  record: GraphRelationRecord,
  targetLabels: string[],
  geometries: GraphRelationGeometry[]
): GraphRelationSnapshot => {
  if (!isSegmentGeometry(geometries[0]) || !isSegmentGeometry(geometries[1])) {
    return buildSnapshot(record, targetLabels, 'unsupported', 'Equal-length requires two segment-like targets.', [{
      code: 'relation_unsupported_targets',
      message: 'Equal-length relations only support segment-like targets.',
      severity: 'error',
      relationId: record.id
    }]);
  }

  const firstGeometry = geometries[0] as Extract<GraphRelationGeometry, { family: 'segment-like' }>;
  const secondGeometry = geometries[1] as Extract<GraphRelationGeometry, { family: 'segment-like' }>;
  const lengthA = lengthOf(firstGeometry.x2 - firstGeometry.x1, firstGeometry.y2 - firstGeometry.y1);
  const lengthB = lengthOf(secondGeometry.x2 - secondGeometry.x1, secondGeometry.y2 - secondGeometry.y1);
  const delta = Math.abs(lengthA - lengthB);
  const tolerance = record.params?.tolerance ?? DEFAULT_DISTANCE_TOLERANCE;
  const measurement: GraphRelationMeasurement = {
    kind: 'length',
    actualValue: formatNumber(lengthA),
    expectedValue: formatNumber(lengthB),
    delta: formatNumber(delta)
  };

  return delta <= tolerance
    ? buildSnapshot(record, targetLabels, 'satisfied', 'The two segments currently have equal length.', [], [measurement])
    : buildSnapshot(record, targetLabels, 'violated', 'The two segments do not have equal length.', [], [measurement]);
};

const evaluateDistanceAssertion = (
  record: GraphRelationRecord,
  targetLabels: string[],
  geometries: GraphRelationGeometry[]
): GraphRelationSnapshot => {
  if (!isPointGeometry(geometries[0]) || !isPointGeometry(geometries[1])) {
    return buildSnapshot(record, targetLabels, 'unsupported', 'Distance assertions currently require two point targets.', [{
      code: 'relation_unsupported_targets',
      message: 'Distance assertions only support point-to-point measurements in v1.',
      severity: 'error',
      relationId: record.id
    }]);
  }

  const expectedValue = record.params?.expectedValue;
  if (!isFiniteNumber(expectedValue)) {
    return buildSnapshot(record, targetLabels, 'unsupported', 'Distance assertions require an expectedValue.', [{
      code: 'relation_missing_expected_value',
      message: 'Distance assertion is missing expectedValue.',
      severity: 'error',
      relationId: record.id
    }]);
  }

  const actualValue = lengthOf(geometries[1].x - geometries[0].x, geometries[1].y - geometries[0].y);
  const delta = Math.abs(actualValue - expectedValue);
  const tolerance = record.params?.tolerance ?? DEFAULT_DISTANCE_TOLERANCE;
  const measurement: GraphRelationMeasurement = {
    kind: 'distance',
    actualValue: formatNumber(actualValue),
    expectedValue: formatNumber(expectedValue),
    delta: formatNumber(delta)
  };

  return delta <= tolerance
    ? buildSnapshot(record, targetLabels, 'satisfied', 'The point-to-point distance matches the expected value.', [], [measurement])
    : buildSnapshot(record, targetLabels, 'violated', 'The point-to-point distance no longer matches the expected value.', [], [measurement]);
};

export const evaluateRelations = (
  records: GraphRelationRecord[],
  targets: GraphRelationTargetRecord[]
): GraphRelationSnapshot[] => {
  const targetMap = new Map(targets.map((target) => [target.key, target]));
  const conflictingIds = resolveConflictingRelationIds(records);

  return records.map((record) => {
    const targetRecords = record.targets.map((target) => targetMap.get(buildRelationTargetKey(target)) ?? null);
    const targetLabels = targetRecords.map((target, index) => target?.label ?? `${record.targets[index]?.ownerId}:${record.targets[index]?.targetId}`);

    if (targetRecords.some((target) => !target)) {
      return buildSnapshot(record, targetLabels, 'missing-target', 'At least one target is no longer available in the current scene.', [{
        code: 'relation_missing_target',
        message: 'One or more relation targets could not be resolved.',
        severity: 'error',
        relationId: record.id
      }]);
    }

    if (conflictingIds.has(record.id)) {
      return buildSnapshot(record, targetLabels, 'conflicting', 'This relation conflicts with another active relation on the same target pair.', [{
        code: 'relation_conflict',
        message: 'Parallel and perpendicular relations cannot both stay active on the same pair.',
        severity: 'error',
        relationId: record.id
      }]);
    }

    const geometries = targetRecords.map((target) => target?.getGeometry() ?? null);
    if (geometries.some((geometry) => !geometry)) {
      return buildSnapshot(record, targetLabels, 'missing-target', 'At least one target cannot currently provide geometry data.', [{
        code: 'relation_missing_geometry',
        message: 'One or more targets failed to provide geometry data.',
        severity: 'error',
        relationId: record.id
      }]);
    }

    switch (record.kind) {
      case 'parallel':
      case 'perpendicular':
        return evaluateDirectionRelation(record, targetLabels, geometries as GraphRelationGeometry[]);
      case 'equal-length':
        return evaluateEqualLengthRelation(record, targetLabels, geometries as GraphRelationGeometry[]);
      case 'distance-assertion':
        return evaluateDistanceAssertion(record, targetLabels, geometries as GraphRelationGeometry[]);
      default:
        return buildSnapshot(record, targetLabels, 'unsupported', 'This relation kind is not implemented.', [{
          code: 'relation_unimplemented_kind',
          message: `Relation kind "${record.kind}" is not implemented.`,
          severity: 'error',
          relationId: record.id
        }]);
    }
  });
};
