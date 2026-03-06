import type { GraphCapabilityDescriptor } from '../../../types/capabilities';
import { GraphCapability } from '../BaseCapability';
import type { ShapeCapabilityTarget } from '../contracts';

export class InspectCapability extends GraphCapability {
  public readonly id = 'inspect';

  public supports(target: ShapeCapabilityTarget): boolean {
    return !!target.inspect;
  }

  public createDescriptor(target: ShapeCapabilityTarget): GraphCapabilityDescriptor {
    return {
      id: this.id,
      feature: this.id,
      label: '特性',
      entityType: target.entityType,
      kind: 'panel',
      group: 'inspect',
      active: target.inspect?.active
    };
  }

  public execute(target: ShapeCapabilityTarget): boolean {
    if (!target.inspect) return false;
    target.inspect.setActive(!target.inspect.active);
    return true;
  }
}
