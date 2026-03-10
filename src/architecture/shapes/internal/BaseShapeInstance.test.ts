import { describe, expect, it, vi } from 'vitest';
import type { ShapeCapabilityTarget } from '../../capabilities/contracts';
import type { GraphShapeContext, GraphShapeGroupInput } from '../contracts';
import { BaseShapeInstance } from './BaseShapeInstance';

class TestShapeInstance extends BaseShapeInstance<Record<string, never>> {
  public readonly id = 'shape_test';
  public readonly entityType = 'shape-test';

  public getCapabilityTarget(): ShapeCapabilityTarget | null {
    return null;
  }

  public createManagedGroup(groupInput: GraphShapeGroupInput) {
    return this.createGroup(groupInput, { createNativeGroup: false });
  }
}

const createContext = (): GraphShapeContext => ({
  engine: {} as any,
  board: {} as any,
  selectShape: vi.fn(),
  isShapeSelected: vi.fn(() => false),
  addShape: vi.fn(),
  removeShape: vi.fn(),
  notifyChange: vi.fn(),
  generateId: (prefix: string) => `${prefix}_1`,
  getUsrCoordFromEvent: vi.fn(() => null),
  getViewport: vi.fn(() => ({ width: 1000, height: 700 })),
  projectUserPoint: vi.fn(() => null),
  projectPoint3D: vi.fn(() => null),
  projectUserBounds: vi.fn(() => null),
  project3DBounds: vi.fn(() => null),
  getBoundsAnchor: vi.fn(() => ({ x: 0, y: 0 })),
  clampScreenPoint: vi.fn((point) => point)
});

describe('BaseShapeInstance native render-node helpers', () => {
  it('binds native events through managed groups in layered scenarios', () => {
    const node = document.createElement('div');
    const object = { element2D: { rendNode: node } };
    const shape = new TestShapeInstance(createContext(), {});
    const group = shape.createManagedGroup({ handle: object });
    const handler = vi.fn();

    expect(group.getRenderNode('handle')).toBe(node);

    const dispose = group.bindNativeEvent('mousedown', (member, event, renderNode) => {
      handler(member.key, event.defaultPrevented, renderNode);
    }, {
      preventDefault: true
    });

    node.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith('handle', true, node);

    dispose();
    node.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    expect(handler).toHaveBeenCalledTimes(1);

    shape.destroy();
  });
});
