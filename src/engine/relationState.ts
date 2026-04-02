import type {
  GraphRelationCreateInput,
  GraphRelationDiagnostic,
  GraphRelationKind,
  GraphRelationParams,
  GraphRelationRecord,
  GraphRelationTargetRef
} from '../relation/contracts';
import { buildRelationTargetKey } from '../relation/targets';

const VALID_RELATION_KINDS: GraphRelationKind[] = ['parallel', 'perpendicular', 'equal-length', 'distance-assertion'];

const cloneTargetRef = (target: GraphRelationTargetRef): GraphRelationTargetRef => ({
  ownerType: target.ownerType,
  ownerId: target.ownerId,
  targetId: target.targetId
});

const cloneParams = (params?: GraphRelationParams): GraphRelationParams | undefined => {
  if (!params) return undefined;
  return {
    expectedValue: params.expectedValue,
    tolerance: params.tolerance
  };
};

const cloneRecord = (record: GraphRelationRecord): GraphRelationRecord => ({
  id: record.id,
  kind: record.kind,
  targets: record.targets.map(cloneTargetRef),
  active: record.active,
  params: cloneParams(record.params)
});

const normalizeTarget = (target: GraphRelationTargetRef): GraphRelationTargetRef | null => {
  if (!target || (target.ownerType !== 'command' && target.ownerType !== 'shape')) return null;
  if (!target.ownerId || !target.targetId) return null;

  return {
    ownerType: target.ownerType,
    ownerId: target.ownerId,
    targetId: target.targetId
  };
};

const normalizeCreateInput = (input: GraphRelationCreateInput): {
  record: Omit<GraphRelationRecord, 'id'> | null;
  diagnostics: GraphRelationDiagnostic[];
} => {
  const diagnostics: GraphRelationDiagnostic[] = [];

  if (!VALID_RELATION_KINDS.includes(input.kind)) {
    diagnostics.push({
      code: 'relation_invalid_kind',
      message: `Unsupported relation kind "${input.kind}".`,
      severity: 'error'
    });
  }

  if (!Array.isArray(input.targets) || input.targets.length !== 2) {
    diagnostics.push({
      code: 'relation_invalid_targets',
      message: 'Relations currently require exactly two targets.',
      severity: 'error'
    });
  }

  const normalizedTargets = Array.isArray(input.targets)
    ? input.targets.map(normalizeTarget).filter((target): target is GraphRelationTargetRef => !!target)
    : [];

  if (normalizedTargets.length !== 2) {
    diagnostics.push({
      code: 'relation_invalid_target_ref',
      message: 'Relation targets must include non-empty ownerId and targetId values.',
      severity: 'error'
    });
  }

  if (input.kind === 'distance-assertion') {
    if (typeof input.params?.expectedValue !== 'number' || !Number.isFinite(input.params.expectedValue)) {
      diagnostics.push({
        code: 'relation_missing_expected_value',
        message: 'Distance assertions require a finite expectedValue.',
        severity: 'error'
      });
    }
  }

  if (diagnostics.some((item) => item.severity === 'error')) {
    return { record: null, diagnostics };
  }

  return {
    record: {
      kind: input.kind,
      targets: normalizedTargets,
      active: input.active ?? true,
      params: cloneParams(input.params)
    },
    diagnostics
  };
};

export class GraphRelationState {
  private readonly relationMap = new Map<string, GraphRelationRecord>();
  private readonly relationOrder: string[] = [];
  private nextAutoId = 1;

  public create(input: GraphRelationCreateInput): {
    record: GraphRelationRecord | null;
    diagnostics: GraphRelationDiagnostic[];
  } {
    const normalized = normalizeCreateInput(input);
    if (!normalized.record) {
      return {
        record: null,
        diagnostics: normalized.diagnostics
      };
    }

    const duplicate = this.findDuplicate(normalized.record.kind, normalized.record.targets, normalized.record.params);
    if (duplicate) {
      return {
        record: null,
        diagnostics: [{
          code: 'relation_duplicate',
          message: `Relation "${duplicate.id}" already describes the same targets and parameters.`,
          severity: 'error',
          relationId: duplicate.id
        }]
      };
    }

    const id = `rel_${this.nextAutoId++}`;
    const record: GraphRelationRecord = {
      ...normalized.record,
      id
    };
    this.relationOrder.push(id);
    this.relationMap.set(id, record);

    return {
      record: cloneRecord(record),
      diagnostics: normalized.diagnostics
    };
  }

  public add(record: GraphRelationRecord): void {
    if (!record.id) {
      throw new Error('Graph relation records require a non-empty id');
    }

    const normalized = normalizeCreateInput({
      kind: record.kind,
      targets: record.targets,
      active: record.active,
      params: record.params
    });

    if (!normalized.record) {
      throw new Error('Graph relation record is invalid');
    }

    if (!this.relationMap.has(record.id)) {
      this.relationOrder.push(record.id);
    }
    this.relationMap.set(record.id, {
      ...normalized.record,
      id: record.id
    });

    const match = record.id.match(/^rel_(\d+)$/);
    const numericId = match ? Number(match[1]) : 0;
    if (numericId >= this.nextAutoId) {
      this.nextAutoId = numericId + 1;
    }
  }

  public remove(relationId: string): boolean {
    if (!this.relationMap.has(relationId)) return false;
    this.relationMap.delete(relationId);
    const index = this.relationOrder.indexOf(relationId);
    if (index >= 0) {
      this.relationOrder.splice(index, 1);
    }
    return true;
  }

  public has(relationId: string): boolean {
    return this.relationMap.has(relationId);
  }

  public setActive(relationId: string, active: boolean): boolean {
    const record = this.relationMap.get(relationId);
    if (!record) return false;
    record.active = active;
    return true;
  }

  public list(): GraphRelationRecord[] {
    return this.relationOrder
      .map((relationId) => this.relationMap.get(relationId))
      .filter((record): record is GraphRelationRecord => !!record)
      .map(cloneRecord);
  }

  public clear(): void {
    this.relationMap.clear();
    this.relationOrder.length = 0;
    this.nextAutoId = 1;
  }

  private findDuplicate(kind: GraphRelationKind, targets: GraphRelationTargetRef[], params?: GraphRelationParams): GraphRelationRecord | null {
    const nextTargetKey = this.buildNormalizedTargetKey(targets);
    const nextExpectedValue = params?.expectedValue;

    for (const record of this.relationMap.values()) {
      if (record.kind !== kind) continue;
      if (this.buildNormalizedTargetKey(record.targets) !== nextTargetKey) continue;
      if ((record.params?.expectedValue ?? undefined) !== nextExpectedValue) continue;
      return record;
    }

    return null;
  }

  private buildNormalizedTargetKey(targets: GraphRelationTargetRef[]): string {
    return targets
      .map((target) => buildRelationTargetKey(target))
      .sort((a, b) => a.localeCompare(b))
      .join('|');
  }
}
