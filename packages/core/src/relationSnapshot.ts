import {
  okResult,
  type GraphObjectNode,
  type GraphOperationDiagnostic,
  type GraphOperationResult,
  type GraphRuntimeTargetRef
} from './contracts';

export const GRAPH_RELATION_SNAPSHOT_VERSION = 1;

export type GraphRelationSnapshotDiagnosticCode =
  | 'relation-snapshot.invalid-snapshot'
  | 'relation-snapshot.missing-object'
  | 'relation-snapshot.missing-dependency'
  | 'relation-snapshot.missing-relation'
  | 'relation-snapshot.invalid-relation-object';

export interface GraphRelationSnapshotDiagnostic extends GraphOperationDiagnostic {
  code: GraphRelationSnapshotDiagnosticCode;
  details?: Record<string, unknown>;
}

export interface GraphObjectRelationSnapshot {
  objectId: string;
  dependencyIds: string[];
  relationIds: string[];
}

export interface GraphRelationSnapshotEntry {
  relationId: string;
  relationType: string;
  dependencyIds: string[];
}

export interface GraphSceneRelationSnapshot {
  version: typeof GRAPH_RELATION_SNAPSHOT_VERSION;
  objects: GraphObjectRelationSnapshot[];
  relations: GraphRelationSnapshotEntry[];
}

export interface GraphRelationInvalidationInput {
  changedObjectIds?: readonly string[];
  removedObjectIds?: readonly string[];
}

export type GraphRelationInvalidationReason = 'changed' | 'removed' | 'dependency';

export interface GraphRelationInvalidationEntry {
  objectId: string;
  reason: GraphRelationInvalidationReason;
  sourceObjectId?: string;
  dependencyChain: string[];
}

export interface GraphRelationInvalidationPlan {
  changedObjectIds: string[];
  removedObjectIds: string[];
  dirtyObjectIds: string[];
  recomputeObjectIds: string[];
  relationIds: string[];
  entries: GraphRelationInvalidationEntry[];
}

export const createGraphRelationSnapshot = (
  objects: readonly GraphObjectNode[]
): GraphOperationResult<GraphSceneRelationSnapshot> => {
  const diagnostics: GraphRelationSnapshotDiagnostic[] = [];
  const seenObjectIds = new Set<string>();
  const objectSnapshots: GraphObjectRelationSnapshot[] = [];
  const relationSnapshots: GraphRelationSnapshotEntry[] = [];

  for (const node of objects) {
    if (!isNonEmptyString(node.id)) {
      diagnostics.push(invalidSnapshotDiagnostic('objects[].id', 'non-empty string', { objectId: node.id }));
      continue;
    }
    if (seenObjectIds.has(node.id)) {
      diagnostics.push(invalidSnapshotDiagnostic('objects[].id', 'unique object id', { objectId: node.id }));
      continue;
    }
    seenObjectIds.add(node.id);

    const dependencyIds = readStringArray(node.dependencies, `objects[${node.id}].dependencies`, diagnostics);
    const relationIds = readStringArray(node.relations, `objects[${node.id}].relations`, diagnostics);
    if (!dependencyIds || !relationIds) continue;

    if (dependencyIds.length > 0 || relationIds.length > 0) {
      objectSnapshots.push({
        objectId: node.id,
        dependencyIds,
        relationIds
      });
    }

    if (node.kind === 'relation') {
      relationSnapshots.push({
        relationId: node.id,
        relationType: node.type,
        dependencyIds
      });
    }
  }

  if (diagnostics.length > 0) return { ok: false, diagnostics };

  const snapshot: GraphSceneRelationSnapshot = {
    version: GRAPH_RELATION_SNAPSHOT_VERSION,
    objects: objectSnapshots,
    relations: relationSnapshots
  };
  const validation = validateGraphRelationSnapshot(snapshot, objects);
  return validation.ok && validation.value ? okResult(validation.value) : validation;
};

export const createGraphRelationInvalidationPlan = (
  objects: readonly GraphObjectNode[],
  input: GraphRelationInvalidationInput
): GraphOperationResult<GraphRelationInvalidationPlan> => {
  const changedObjectIds = uniqueStrings(input.changedObjectIds ?? []);
  const removedObjectIds = uniqueStrings(input.removedObjectIds ?? []);
  const objectMap = new Map(objects.map((object) => [object.id, object]));
  const diagnostics: GraphRelationSnapshotDiagnostic[] = [];

  for (const objectId of changedObjectIds) {
    if (!objectMap.has(objectId)) diagnostics.push(missingObjectDiagnostic(objectId));
  }
  if (diagnostics.length > 0) return { ok: false, diagnostics };

  const changedSet = new Set(changedObjectIds);
  const removedSet = new Set(removedObjectIds);
  const dirtySet = new Set<string>([...changedObjectIds, ...removedObjectIds]);
  const entries: GraphRelationInvalidationEntry[] = [
    ...changedObjectIds.map((objectId) => ({
      objectId,
      reason: 'changed' as const,
      dependencyChain: [objectId]
    })),
    ...removedObjectIds.map((objectId) => ({
      objectId,
      reason: 'removed' as const,
      dependencyChain: [objectId]
    }))
  ];

  let changed = true;
  while (changed) {
    changed = false;
    for (const object of objects) {
      if (dirtySet.has(object.id)) continue;
      const sourceObjectId = (object.dependencies ?? []).find((dependencyId) => dirtySet.has(dependencyId));
      if (!sourceObjectId) continue;
      dirtySet.add(object.id);
      entries.push({
        objectId: object.id,
        reason: 'dependency',
        sourceObjectId,
        dependencyChain: [sourceObjectId, object.id]
      });
      changed = true;
    }
  }

  const relationIds = new Set<string>();
  for (const object of objects) {
    if (!dirtySet.has(object.id)) continue;
    if (object.kind === 'relation') relationIds.add(object.id);
    for (const relationId of object.relations ?? []) {
      relationIds.add(relationId);
    }
  }

  const dependentDirtyObjectIds = objects
    .map((object) => object.id)
    .filter((objectId) => dirtySet.has(objectId) && !changedSet.has(objectId) && !removedSet.has(objectId));
  const recomputeObjectIds = orderByDependencyTopology(dependentDirtyObjectIds, objectMap);
  const dirtyObjectIds = [
    ...changedObjectIds,
    ...removedObjectIds,
    ...recomputeObjectIds
  ];

  return okResult({
    changedObjectIds,
    removedObjectIds,
    dirtyObjectIds,
    recomputeObjectIds,
    relationIds: [...relationIds],
    entries
  });
};

export const validateGraphRelationSnapshot = (
  snapshot: unknown,
  objects: readonly GraphObjectNode[] = []
): GraphOperationResult<GraphSceneRelationSnapshot> => {
  const parsed = parseGraphRelationSnapshot(snapshot);
  if (!parsed.ok || !parsed.value) return parsed;

  const objectMap = new Map(objects.map((object) => [object.id, object]));
  if (objectMap.size === 0) return okResult(parsed.value);

  const diagnostics: GraphRelationSnapshotDiagnostic[] = [];
  for (const objectEntry of parsed.value.objects) {
    if (!objectMap.has(objectEntry.objectId)) {
      diagnostics.push(missingObjectDiagnostic(objectEntry.objectId));
      continue;
    }

    for (const dependencyId of objectEntry.dependencyIds) {
      if (!objectMap.has(dependencyId)) {
        diagnostics.push(missingDependencyDiagnostic(objectEntry.objectId, dependencyId));
      }
    }

    for (const relationId of objectEntry.relationIds) {
      const relation = objectMap.get(relationId);
      if (!relation) {
        diagnostics.push(missingRelationDiagnostic(objectEntry.objectId, relationId));
      } else if (relation.kind !== 'relation') {
        diagnostics.push(invalidRelationObjectDiagnostic(relationId, objectEntry.objectId));
      }
    }
  }

  for (const relationEntry of parsed.value.relations) {
    const relation = objectMap.get(relationEntry.relationId);
    if (!relation) {
      diagnostics.push(missingRelationDiagnostic(relationEntry.relationId, relationEntry.relationId));
      continue;
    }
    if (relation.kind !== 'relation') {
      diagnostics.push(invalidRelationObjectDiagnostic(relationEntry.relationId, relationEntry.relationId));
    }
    for (const dependencyId of relationEntry.dependencyIds) {
      if (!objectMap.has(dependencyId)) {
        diagnostics.push(missingDependencyDiagnostic(relationEntry.relationId, dependencyId));
      }
    }
  }

  return diagnostics.length > 0 ? { ok: false, diagnostics } : okResult(parsed.value);
};

const parseGraphRelationSnapshot = (snapshot: unknown): GraphOperationResult<GraphSceneRelationSnapshot> => {
  const record = asRecord(snapshot);
  if (!record) {
    return { ok: false, diagnostics: [invalidSnapshotDiagnostic('snapshot', 'object')] };
  }
  if (record.version !== GRAPH_RELATION_SNAPSHOT_VERSION) {
    return {
      ok: false,
      diagnostics: [invalidSnapshotDiagnostic('version', `${GRAPH_RELATION_SNAPSHOT_VERSION}`, { receivedVersion: record.version })]
    };
  }
  if (!Array.isArray(record.objects)) {
    return { ok: false, diagnostics: [invalidSnapshotDiagnostic('objects', 'array')] };
  }
  if (!Array.isArray(record.relations)) {
    return { ok: false, diagnostics: [invalidSnapshotDiagnostic('relations', 'array')] };
  }

  const diagnostics: GraphRelationSnapshotDiagnostic[] = [];
  const objects = record.objects
    .map((entry, index) => parseObjectRelationSnapshot(entry, index, diagnostics))
    .filter((entry): entry is GraphObjectRelationSnapshot => !!entry);
  const relations = record.relations
    .map((entry, index) => parseRelationSnapshotEntry(entry, index, diagnostics))
    .filter((entry): entry is GraphRelationSnapshotEntry => !!entry);

  return diagnostics.length > 0
    ? { ok: false, diagnostics }
    : okResult({
        version: GRAPH_RELATION_SNAPSHOT_VERSION,
        objects,
        relations
      });
};

const parseObjectRelationSnapshot = (
  entry: unknown,
  index: number,
  diagnostics: GraphRelationSnapshotDiagnostic[]
): GraphObjectRelationSnapshot | null => {
  const record = asRecord(entry);
  if (!record) {
    diagnostics.push(invalidSnapshotDiagnostic(`objects[${index}]`, 'object'));
    return null;
  }
  if (!isNonEmptyString(record.objectId)) {
    diagnostics.push(invalidSnapshotDiagnostic(`objects[${index}].objectId`, 'non-empty string'));
    return null;
  }
  const dependencyIds = readStringArray(record.dependencyIds, `objects[${index}].dependencyIds`, diagnostics);
  const relationIds = readStringArray(record.relationIds, `objects[${index}].relationIds`, diagnostics);
  return dependencyIds && relationIds
    ? { objectId: record.objectId, dependencyIds, relationIds }
    : null;
};

const parseRelationSnapshotEntry = (
  entry: unknown,
  index: number,
  diagnostics: GraphRelationSnapshotDiagnostic[]
): GraphRelationSnapshotEntry | null => {
  const record = asRecord(entry);
  if (!record) {
    diagnostics.push(invalidSnapshotDiagnostic(`relations[${index}]`, 'object'));
    return null;
  }
  if (!isNonEmptyString(record.relationId)) {
    diagnostics.push(invalidSnapshotDiagnostic(`relations[${index}].relationId`, 'non-empty string'));
    return null;
  }
  if (!isNonEmptyString(record.relationType)) {
    diagnostics.push(invalidSnapshotDiagnostic(`relations[${index}].relationType`, 'non-empty string'));
    return null;
  }
  const dependencyIds = readStringArray(record.dependencyIds, `relations[${index}].dependencyIds`, diagnostics);
  return dependencyIds
    ? { relationId: record.relationId, relationType: record.relationType, dependencyIds }
    : null;
};

const readStringArray = (
  value: unknown,
  path: string,
  diagnostics: GraphRelationSnapshotDiagnostic[]
): string[] | null => {
  if (value === undefined) return [];
  if (!Array.isArray(value) || !value.every(isNonEmptyString)) {
    diagnostics.push(invalidSnapshotDiagnostic(path, 'array of non-empty strings'));
    return null;
  }
  return [...value];
};

const uniqueStrings = (values: readonly string[]): string[] => [...new Set(values.filter(isNonEmptyString))];

const orderByDependencyTopology = (
  objectIds: readonly string[],
  objectMap: ReadonlyMap<string, GraphObjectNode>
): string[] => {
  const candidateSet = new Set(objectIds);
  const ordered: string[] = [];
  const visiting = new Set<string>();
  const visited = new Set<string>();

  const visit = (objectId: string): void => {
    if (visited.has(objectId)) return;
    if (visiting.has(objectId)) return;

    visiting.add(objectId);
    const object = objectMap.get(objectId);
    const dependencyIds = [...(object?.dependencies ?? [])]
      .filter((dependencyId) => candidateSet.has(dependencyId))
      .sort(compareStringIds);
    for (const dependencyId of dependencyIds) {
      visit(dependencyId);
    }
    visiting.delete(objectId);
    visited.add(objectId);
    ordered.push(objectId);
  };

  for (const objectId of [...objectIds].sort(compareStringIds)) {
    visit(objectId);
  }

  return ordered;
};

const compareStringIds = (left: string, right: string): number => (
  left < right ? -1 : left > right ? 1 : 0
);

const asRecord = (value: unknown): Record<string, unknown> | null => (
  typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : null
);

const isNonEmptyString = (value: unknown): value is string => (
  typeof value === 'string' && value.length > 0
);

const invalidSnapshotDiagnostic = (
  path: string,
  expected: string,
  details?: Record<string, unknown>
): GraphRelationSnapshotDiagnostic => ({
  code: 'relation-snapshot.invalid-snapshot',
  message: `Graph relation snapshot field "${path}" must be ${expected}.`,
  severity: 'error',
  target: { scope: 'scene' },
  details: {
    path,
    expected,
    ...(details ?? {})
  }
});

const missingObjectDiagnostic = (objectId: string): GraphRelationSnapshotDiagnostic => ({
  code: 'relation-snapshot.missing-object',
  message: `Graph relation snapshot references missing object "${objectId}".`,
  severity: 'error',
  target: objectTarget(objectId),
  details: { objectId }
});

const missingDependencyDiagnostic = (
  objectId: string,
  dependencyId: string
): GraphRelationSnapshotDiagnostic => ({
  code: 'relation-snapshot.missing-dependency',
  message: `Graph object "${objectId}" depends on missing object "${dependencyId}".`,
  severity: 'error',
  target: objectTarget(objectId),
  details: {
    objectId,
    dependencyId
  }
});

const missingRelationDiagnostic = (
  objectId: string,
  relationId: string
): GraphRelationSnapshotDiagnostic => ({
  code: 'relation-snapshot.missing-relation',
  message: `Graph object "${objectId}" references missing relation "${relationId}".`,
  severity: 'error',
  target: objectTarget(objectId),
  details: {
    objectId,
    relationId
  }
});

const invalidRelationObjectDiagnostic = (
  relationId: string,
  objectId: string
): GraphRelationSnapshotDiagnostic => ({
  code: 'relation-snapshot.invalid-relation-object',
  message: `Graph relation "${relationId}" must reference an object with kind "relation".`,
  severity: 'error',
  target: { scope: 'relation', relationId },
  details: {
    relationId,
    objectId
  }
});

const objectTarget = (objectId: string): GraphRuntimeTargetRef => ({
  scope: 'object',
  objectId
});
