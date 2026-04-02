import { describe, expect, it, vi } from 'vitest';
import { Expression3DHandler } from './Expression3DHandler';
import { GenericInvocationHandler } from './GenericInvocationHandler';
import { Surface3DHandler } from './Surface3DHandler';

const createBaseContext = () => ({
  mode: '3d' as const,
  ownerId: 'cmd_1',
  rawExpr: '',
  processedExpr: '',
  color: '#0ea5e9',
  extraOptions: {},
  boardMgr: {
    board: {},
    view3d: {
      create: vi.fn(() => ({ id: 'shape' })),
      project3DTo2D: vi.fn()
    }
  },
  entityMgr: {
    getNamedElement: vi.fn(),
    registerNamedElement: vi.fn()
  },
  mathScope: {
    data: {},
    evaluate: vi.fn()
  },
  hiddenLine: {
    isEnabled: vi.fn(() => true),
    getOptions: vi.fn(() => ({ enabled: true })),
    registerSource: vi.fn(() => ({ id: 'hidden_1', ownerId: 'cmd_1', dispose: vi.fn() })),
    clearOwnerSources: vi.fn()
  }
});

describe('hidden-line adapters', () => {
  it('adds metadata for expression surfaces', () => {
    const handler = new Expression3DHandler();
    const ctx = createBaseContext();
    ctx.processedExpr = 'z = x + y';

    handler.handle(ctx as any);

    expect(ctx.hiddenLine.registerSource).toHaveBeenCalledWith(expect.objectContaining({
      debugLabel: 'expression-surface',
      tags: ['command', 'expression', 'surface', '3d'],
      role: 'both'
    }));
  });

  it('adds metadata for explicit Surface commands', () => {
    const handler = new Surface3DHandler();
    const ctx = createBaseContext();
    ctx.processedExpr = 'Surface(u, v, u+v, 0, 1, 0, 1)';

    handler.handle(ctx as any);

    expect(ctx.hiddenLine.registerSource).toHaveBeenCalledWith(expect.objectContaining({
      debugLabel: 'surface-command',
      tags: ['command', 'surface', '3d'],
      role: 'both'
    }));
  });

  it('adds metadata for generic 3d line invocations', () => {
    const handler = new GenericInvocationHandler();
    const ctx = createBaseContext();
    ctx.processedExpr = 'Line((0,0,0),(1,1,1))';

    handler.handle(ctx as any);

    expect(ctx.hiddenLine.registerSource).toHaveBeenCalledWith(expect.objectContaining({
      debugLabel: 'command:line3d',
      tags: ['command', '3d', 'line3d', 'edge'],
      role: 'edge'
    }));
  });
});
