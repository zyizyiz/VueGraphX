import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useFormulaStore } from './formula';

describe('useFormulaStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('allocates deterministic command ids without random suffixes', () => {
    const store = useFormulaStore();

    const firstId = store.addCommand('a = 1');
    store.appendCommands([{ expr: 'b = 2' }, { expr: 'c = 3' }]);

    const generatedIds = store.commands.slice(1).map((command) => command.id);
    expect(firstId).toMatch(/^cmd_\d+$/);
    expect(generatedIds).toHaveLength(3);
    expect(new Set(generatedIds).size).toBe(generatedIds.length);
    expect(generatedIds.every((id) => /^cmd_\d+$/.test(id))).toBe(true);
  });
});
