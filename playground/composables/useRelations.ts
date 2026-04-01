import { computed, ref, watch } from 'vue';
import type {
  GraphRelationCreateResult,
  GraphRelationKind,
  GraphRelationSnapshot,
  GraphRelationTargetDescriptor,
  GraphRelationTargetRef,
  GraphXEngine
} from 'vuegraphx';
import type { PlaygroundMode } from '../types/mode';

interface UseRelationsOptions {
  getEngine: () => GraphXEngine | null;
  getActiveMode: () => PlaygroundMode;
}

const RELATION_KINDS: GraphRelationKind[] = ['parallel', 'perpendicular', 'equal-length', 'distance-assertion'];

const isLineLike = (family?: GraphRelationTargetDescriptor['family'] | null) => family === 'line-like' || family === 'segment-like';
const isSegmentLike = (family?: GraphRelationTargetDescriptor['family'] | null) => family === 'segment-like';
const isPoint = (family?: GraphRelationTargetDescriptor['family'] | null) => family === 'point';

const supportsRelationKind = (
  kind: GraphRelationKind,
  firstFamily?: GraphRelationTargetDescriptor['family'] | null,
  secondFamily?: GraphRelationTargetDescriptor['family'] | null
): boolean => {
  if (!firstFamily && !secondFamily) return true;

  switch (kind) {
    case 'parallel':
    case 'perpendicular':
      return secondFamily ? (isLineLike(firstFamily) && isLineLike(secondFamily)) : isLineLike(firstFamily);
    case 'equal-length':
      return secondFamily ? (isSegmentLike(firstFamily) && isSegmentLike(secondFamily)) : isSegmentLike(firstFamily);
    case 'distance-assertion':
      return secondFamily ? (isPoint(firstFamily) && isPoint(secondFamily)) : isPoint(firstFamily);
    default:
      return false;
  }
};

const kindLabelMap: Record<GraphRelationKind, string> = {
  parallel: '平行',
  perpendicular: '垂直',
  'equal-length': '等长',
  'distance-assertion': '距离断言'
};

const sortTargets = (items: GraphRelationTargetDescriptor[]) => (
  [...items].sort((left, right) => {
    const familyComparison = left.family.localeCompare(right.family);
    return familyComparison !== 0 ? familyComparison : left.label.localeCompare(right.label);
  })
);

export function useRelations(options: UseRelationsOptions) {
  const relations = ref<GraphRelationSnapshot[]>([]);
  const targets = ref<GraphRelationTargetDescriptor[]>([]);
  const selectedKind = ref<GraphRelationKind>('parallel');
  const primaryTargetKey = ref('');
  const secondaryTargetKey = ref('');
  const expectedDistance = ref(2);
  const lastCreateResult = ref<GraphRelationCreateResult | null>(null);
  const lastMessage = ref('');

  const getTargetByKey = (key: string) => targets.value.find((target) => target.key === key) ?? null;
  const toTargetRef = (target: GraphRelationTargetDescriptor): GraphRelationTargetRef => ({
    ownerType: target.ownerType,
    ownerId: target.ownerId,
    targetId: target.targetId
  });

  const primaryTarget = computed(() => getTargetByKey(primaryTargetKey.value));
  const secondaryTarget = computed(() => getTargetByKey(secondaryTargetKey.value));
  const availablePrimaryTargets = computed(() => sortTargets(targets.value));
  const relationKindOptions = computed(() => RELATION_KINDS.map((kind) => ({
    kind,
    enabled: supportsRelationKind(kind, primaryTarget.value?.family, secondaryTarget.value?.family)
  })));
  const compatibleKinds = computed(() => RELATION_KINDS.filter((kind) => supportsRelationKind(kind, primaryTarget.value?.family, secondaryTarget.value?.family)));
  const availableSecondaryTargets = computed(() => {
    const primary = primaryTarget.value;
    if (!primary) {
      return sortTargets(targets.value);
    }

    return sortTargets(
      targets.value.filter((target) => (
        target.key !== primary.key
        && supportsRelationKind(selectedKind.value, primary.family, target.family)
      ))
    );
  });
  const canCreate = computed(() => {
    if (options.getActiveMode() !== 'geometry') return false;
    if (!primaryTarget.value || !secondaryTarget.value) return false;
    if (primaryTarget.value.key === secondaryTarget.value.key) return false;
    if (!compatibleKinds.value.includes(selectedKind.value)) return false;
    if (selectedKind.value === 'distance-assertion' && !Number.isFinite(Number(expectedDistance.value))) return false;
    return true;
  });

  watch(compatibleKinds, (nextKinds) => {
    if (nextKinds.length > 0 && !nextKinds.includes(selectedKind.value)) {
      selectedKind.value = nextKinds[0];
    }
  }, { immediate: true });

  watch(targets, (nextTargets) => {
    if (primaryTargetKey.value && !nextTargets.some((target) => target.key === primaryTargetKey.value)) {
      primaryTargetKey.value = '';
    }
    if (secondaryTargetKey.value && !nextTargets.some((target) => target.key === secondaryTargetKey.value)) {
      secondaryTargetKey.value = '';
    }
  });

  watch([selectedKind, primaryTargetKey, targets], () => {
    if (secondaryTargetKey.value && !availableSecondaryTargets.value.some((target) => target.key === secondaryTargetKey.value)) {
      secondaryTargetKey.value = '';
    }
  });

  watch(() => options.getEngine(), (engine, _previous, onCleanup) => {
    relations.value = [];
    targets.value = [];

    if (!engine) return;

    const unsubscribe = engine.subscribeRelations((snapshot) => {
      relations.value = snapshot.relations;
      targets.value = sortTargets(snapshot.targets);
    });

    onCleanup(() => unsubscribe());
  }, { immediate: true });

  const createRelation = () => {
    const engine = options.getEngine();
    if (!engine || !canCreate.value || !primaryTarget.value || !secondaryTarget.value) return null;

    const result = engine.createRelation({
      kind: selectedKind.value,
      targets: [toTargetRef(primaryTarget.value), toTargetRef(secondaryTarget.value)],
      params: selectedKind.value === 'distance-assertion'
        ? { expectedValue: Number(expectedDistance.value) }
        : undefined
    });

    lastCreateResult.value = result;
    lastMessage.value = result.status === 'success'
      ? `已创建 ${kindLabelMap[selectedKind.value]} 关系`
      : (result.diagnostics[0]?.message ?? '创建关系失败');

    return result;
  };

  const removeRelation = (relationId: string) => {
    const engine = options.getEngine();
    if (!engine) return false;
    return engine.removeRelation(relationId);
  };

  const toggleRelation = (relation: GraphRelationSnapshot) => {
    const engine = options.getEngine();
    if (!engine) return false;
    return engine.setRelationActive(relation.id, !relation.active);
  };

  return {
    relations,
    targets,
    availablePrimaryTargets,
    availableSecondaryTargets,
    relationKindOptions,
    selectedKind,
    primaryTargetKey,
    secondaryTargetKey,
    expectedDistance,
    compatibleKinds,
    canCreate,
    lastCreateResult,
    lastMessage,
    kindLabelMap,
    createRelation,
    removeRelation,
    toggleRelation
  };
}
