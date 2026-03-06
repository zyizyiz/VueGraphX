import type { GraphCapabilityDescriptor } from '../../../types/capabilities';
import { GraphCapability } from '../BaseCapability';
import type { ShapeCapabilityTarget } from '../contracts';

export class DeleteCapability extends GraphCapability {
  public readonly id = 'delete';

  public supports(target: ShapeCapabilityTarget): boolean {
    return !!target.remove;
  }

  public createDescriptor(target: ShapeCapabilityTarget): GraphCapabilityDescriptor {
    return {
      id: this.id,
      feature: this.id,
      label: '删除',
      entityType: target.entityType,
      kind: 'action',
      group: 'danger'
    };
  }

  public execute(target: ShapeCapabilityTarget): boolean {
    if (!target.remove) return false;
    target.remove();
    return true;
  }
}
