import { describe, expect, it, vi } from 'vitest';
import { nextTick, ref } from 'vue';
import { useRelations } from './useRelations';

const createMockEngine = () => {
  const snapshot = {
    relations: [],
    targets: [
      { key: 'command:cmd_a:primary', ownerType: 'command' as const, ownerId: 'cmd_a', targetId: 'primary', family: 'point' as const, label: 'A' },
      { key: 'command:cmd_b:primary', ownerType: 'command' as const, ownerId: 'cmd_b', targetId: 'primary', family: 'point' as const, label: 'B' }
    ]
  };

  return {
    getRelationAssistOptions: vi.fn(() => ({
      parallelSnapEnterAngle: 2,
      parallelSnapExitAngle: 3.5,
      perpendicularSnapEnterAngle: 2,
      perpendicularSnapExitAngle: 3.5,
      equalLengthSnapEnterDelta: 0.1,
      equalLengthSnapExitDelta: 0.2,
      distanceAssertionSnapEnterDelta: 0.1,
      distanceAssertionSnapExitDelta: 0.2
    })),
    setRelationAssistOptions: vi.fn((options) => ({
      parallelSnapEnterAngle: Math.max(0, Number(options.parallelSnapEnterAngle ?? 2)),
      parallelSnapExitAngle: Math.max(Number(options.parallelSnapEnterAngle ?? 2), Number(options.parallelSnapExitAngle ?? 3.5)),
      perpendicularSnapEnterAngle: Math.max(0, Number(options.perpendicularSnapEnterAngle ?? 2)),
      perpendicularSnapExitAngle: Math.max(Number(options.perpendicularSnapEnterAngle ?? 2), Number(options.perpendicularSnapExitAngle ?? 3.5)),
      equalLengthSnapEnterDelta: Math.max(0, Number(options.equalLengthSnapEnterDelta ?? 0.1)),
      equalLengthSnapExitDelta: Math.max(Number(options.equalLengthSnapEnterDelta ?? 0.1), Number(options.equalLengthSnapExitDelta ?? 0.2)),
      distanceAssertionSnapEnterDelta: Math.max(0, Number(options.distanceAssertionSnapEnterDelta ?? 0.1)),
      distanceAssertionSnapExitDelta: Math.max(Number(options.distanceAssertionSnapEnterDelta ?? 0.1), Number(options.distanceAssertionSnapExitDelta ?? 0.2))
    })),
    subscribeRelations: vi.fn((listener: (state: typeof snapshot) => void) => {
      listener(snapshot);
      return () => undefined;
    }),
    createRelation: vi.fn(() => ({
      status: 'success' as const,
      relation: {
        id: 'rel_1',
        kind: 'distance-assertion' as const,
        targets: [
          { ownerType: 'command' as const, ownerId: 'cmd_a', targetId: 'primary' },
          { ownerType: 'command' as const, ownerId: 'cmd_b', targetId: 'primary' }
        ],
        active: true,
        params: { expectedValue: 5 }
      },
      snapshot: null,
      diagnostics: []
    })),
    removeRelation: vi.fn(() => true),
    setRelationActive: vi.fn(() => true)
  };
};

describe('useRelations', () => {
  it('subscribes to relation state and creates a distance assertion from selected targets', async () => {
    const engine = createMockEngine();
    const activeMode = ref<'2d' | '3d' | 'geometry' | 'dual-layer'>('geometry');
    const engineRef = ref(engine as any);

    const relationState = useRelations({
      getEngine: () => engineRef.value,
      getActiveMode: () => activeMode.value
    });

    await nextTick();

    relationState.primaryTargetKey.value = 'command:cmd_a:primary';
    relationState.secondaryTargetKey.value = 'command:cmd_b:primary';
    relationState.selectedKind.value = 'distance-assertion';
    relationState.expectedDistance.value = 5;
    expect(relationState.availableSecondaryTargets.value).toEqual([
      expect.objectContaining({ key: 'command:cmd_b:primary' })
    ]);
    relationState.createRelation();

    expect(engine.subscribeRelations).toHaveBeenCalledTimes(1);
    expect(relationState.targets.value).toHaveLength(2);
    expect(engine.createRelation).toHaveBeenCalledWith({
      kind: 'distance-assertion',
      targets: [
        { ownerType: 'command', ownerId: 'cmd_a', targetId: 'primary' },
        { ownerType: 'command', ownerId: 'cmd_b', targetId: 'primary' }
      ],
      params: { expectedValue: 5 }
    });
    expect(relationState.lastMessage.value).toContain('已创建');

    relationState.parallelSnapEnterAngle.value = 1.5;
    relationState.parallelSnapExitAngle.value = 2.5;
    relationState.perpendicularSnapEnterAngle.value = 2;
    relationState.perpendicularSnapExitAngle.value = 3;
    relationState.equalLengthSnapEnterDelta.value = 0.1;
    relationState.equalLengthSnapExitDelta.value = 0.2;
    relationState.distanceAssertionSnapEnterDelta.value = 0.1;
    relationState.distanceAssertionSnapExitDelta.value = 0.2;
    relationState.applyRelationAssistOptions();

    expect(engine.setRelationAssistOptions).toHaveBeenCalledWith({
      parallelSnapEnterAngle: 1.5,
      parallelSnapExitAngle: 2.5,
      perpendicularSnapEnterAngle: 2,
      perpendicularSnapExitAngle: 3,
      equalLengthSnapEnterDelta: 0.1,
      equalLengthSnapExitDelta: 0.2,
      distanceAssertionSnapEnterDelta: 0.1,
      distanceAssertionSnapExitDelta: 0.2
    });
    expect(relationState.lastMessage.value).toContain('已更新吸附阈值');
  });
});
