import type { GraphCapabilityDescriptor } from '../../../types/capabilities';
import { GraphCapability } from '../BaseCapability';
import type { ShapeCapabilityTarget } from '../contracts';

export class SplitCapability extends GraphCapability {
  public readonly id = 'edit.split';

  public supports(target: ShapeCapabilityTarget): boolean {
    return !!target.split;
  }

  public createDescriptor(target: ShapeCapabilityTarget): GraphCapabilityDescriptor {
    return {
      id: this.id,
      feature: this.id,
      label: '裁切',
      entityType: target.entityType,
      kind: 'toggle',
      group: 'edit',
      active: target.split?.active
    };
  }

  public execute(target: ShapeCapabilityTarget): boolean {
    if (!target.split) return false;
    target.split.toggle();
    return true;
  }
}

export class SplitCancelCapability extends GraphCapability {
  public readonly id = 'edit.split.cancel';

  public supports(target: ShapeCapabilityTarget): boolean {
    return !!target.split?.hasDraft;
  }

  public createDescriptor(target: ShapeCapabilityTarget): GraphCapabilityDescriptor {
    return {
      id: this.id,
      feature: this.id,
      label: '取消裁切',
      entityType: target.entityType,
      kind: 'action',
      group: 'edit'
    };
  }

  public execute(target: ShapeCapabilityTarget): boolean {
    if (!target.split) return false;
    target.split.cancel();
    return true;
  }
}

export class SplitConfirmCapability extends GraphCapability {
  public readonly id = 'edit.split.confirm';

  public supports(target: ShapeCapabilityTarget): boolean {
    return !!target.split?.hasDraft && !!target.split?.canConfirm;
  }

  public createDescriptor(target: ShapeCapabilityTarget): GraphCapabilityDescriptor {
    return {
      id: this.id,
      feature: this.id,
      label: '确认裁切',
      entityType: target.entityType,
      kind: 'action',
      group: 'edit'
    };
  }

  public execute(target: ShapeCapabilityTarget): boolean {
    if (!target.split) return false;
    target.split.confirm();
    return true;
  }
}
