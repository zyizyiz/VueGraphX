import { describe, expect, it, vi } from 'vitest';
import type { GraphShapeContext } from './contracts';
import { createComposedShapeDefinition } from './composition';

const createContext = (): GraphShapeContext => ({
  engine: {} as any,
  board: {} as any,
  selectShape: vi.fn(),
  isShapeSelected: vi.fn(() => false),
  addShape: vi.fn(),
  removeShape: vi.fn(),
  notifyChange: vi.fn(),
  generateId: (prefix: string) => `${prefix}_scene`,
  getUsrCoordFromEvent: vi.fn(() => null),
  getViewport: vi.fn(() => ({ width: 1000, height: 700 })),
  projectUserPoint: vi.fn(() => null),
  projectPoint3D: vi.fn(() => null),
  projectUserBounds: vi.fn(() => null),
  project3DBounds: vi.fn(() => null),
  getBoundsAnchor: vi.fn(() => ({ x: 0, y: 0 })),
  clampScreenPoint: vi.fn((point) => point)
});

describe('createComposedShapeDefinition scene support', () => {
  it('preserves scene normalizePayload and instance getScenePayload hooks', () => {
    const definition = createComposedShapeDefinition<{ value: number }, { value: number }>({
      type: 'scene-shape',
      supportedModes: 'all',
      scene: {
        normalizePayload(payload) {
          const data = payload as { value?: unknown };
          if (typeof data.value !== 'number') {
            throw new Error('value must be numeric');
          }
          return { value: data.value };
        }
      },
      create(_context, payload) {
        return {
          entityType: 'scene-shape',
          initialState: { value: payload?.value ?? 0 },
          getCapabilityTarget: () => null,
          getScenePayload(api) {
            return { value: api.state.value };
          }
        };
      }
    });

    expect(definition.scene?.normalizePayload?.({ value: 7 })).toEqual({ value: 7 });

    const instance = definition.createShape(createContext(), { value: 5 });

    expect(instance?.id).toBe('scene-shape_scene');
    expect(instance?.getScenePayload?.()).toEqual({ value: 5 });
  });
});
