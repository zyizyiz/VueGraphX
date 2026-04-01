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
  });
});
