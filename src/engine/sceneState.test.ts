import { describe, expect, it } from 'vitest';
import { GraphSceneState } from './sceneState';

describe('GraphSceneState', () => {
  it('preserves command insertion order across updates', () => {
    const state = new GraphSceneState();

    state.upsertCommand({ id: 'cmd_1', expression: 'a = 1', color: '#111111', options: { plot: false } });
    state.upsertCommand({ id: 'cmd_2', expression: 'b = 2', color: '#222222' });
    state.upsertCommand({ id: 'cmd_1', expression: 'a = 3', color: '#333333', options: { plot: false } });

    expect(state.listCommands()).toEqual([
      { id: 'cmd_1', expression: 'a = 3', color: '#333333', options: { plot: false } },
      { id: 'cmd_2', expression: 'b = 2', color: '#222222', options: undefined }
    ]);
  });

  it('removes command and shape records when cleared', () => {
    const state = new GraphSceneState();

    state.upsertCommand({ id: 'cmd_1', expression: 'a = 1' });
    state.addShape({ id: 'shape_1', entityType: 'circle', definitionType: 'circle', serializable: true });
    state.removeCommand('cmd_1');
    state.clearShapes();

    expect(state.listCommands()).toEqual([]);
    expect(state.listShapes()).toEqual([]);
  });

  it('rejects invalid shape records before they enter scene state', () => {
    const state = new GraphSceneState();

    expect(() => {
      state.addShape({ id: '', entityType: 'circle', serializable: true });
    }).toThrow(/require non-empty id and entityType/i);
  });
});
