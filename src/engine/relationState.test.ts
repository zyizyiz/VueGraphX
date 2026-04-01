import { describe, expect, it } from 'vitest';
import { GraphRelationState } from './relationState';

describe('GraphRelationState', () => {
  it('creates ordered relation records with stable auto ids', () => {
    const state = new GraphRelationState();

    const first = state.create({
      kind: 'parallel',
      targets: [
        { ownerType: 'command', ownerId: 'cmd_a', targetId: 'primary' },
        { ownerType: 'command', ownerId: 'cmd_b', targetId: 'primary' }
      ]
    });
    const second = state.create({
      kind: 'perpendicular',
      targets: [
        { ownerType: 'command', ownerId: 'cmd_c', targetId: 'primary' },
        { ownerType: 'command', ownerId: 'cmd_d', targetId: 'primary' }
      ]
    });

    expect(first.record?.id).toBe('rel_1');
    expect(second.record?.id).toBe('rel_2');
    expect(state.list().map((record) => record.id)).toEqual(['rel_1', 'rel_2']);
  });

  it('rejects duplicate relation definitions', () => {
    const state = new GraphRelationState();

    state.create({
      kind: 'distance-assertion',
      targets: [
        { ownerType: 'command', ownerId: 'cmd_a', targetId: 'primary' },
        { ownerType: 'command', ownerId: 'cmd_b', targetId: 'primary' }
      ],
      params: { expectedValue: 4 }
    });

    const duplicate = state.create({
      kind: 'distance-assertion',
      targets: [
        { ownerType: 'command', ownerId: 'cmd_b', targetId: 'primary' },
        { ownerType: 'command', ownerId: 'cmd_a', targetId: 'primary' }
      ],
      params: { expectedValue: 4 }
    });

    expect(duplicate.record).toBeNull();
    expect(duplicate.diagnostics[0]?.code).toBe('relation_duplicate');
  });

  it('preserves loaded ids and toggles active state', () => {
    const state = new GraphRelationState();

    state.add({
      id: 'rel_9',
      kind: 'equal-length',
      targets: [
        { ownerType: 'command', ownerId: 'cmd_1', targetId: 'primary' },
        { ownerType: 'command', ownerId: 'cmd_2', targetId: 'primary' }
      ],
      active: true
    });

    expect(state.setActive('rel_9', false)).toBe(true);
    expect(state.list()).toEqual([
      expect.objectContaining({ id: 'rel_9', active: false })
    ]);

    const next = state.create({
      kind: 'parallel',
      targets: [
        { ownerType: 'command', ownerId: 'cmd_3', targetId: 'primary' },
        { ownerType: 'command', ownerId: 'cmd_4', targetId: 'primary' }
      ]
    });

    expect(next.record?.id).toBe('rel_10');
  });
});
