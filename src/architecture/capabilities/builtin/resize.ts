import type { GraphCapabilityDescriptor } from '../../../types/capabilities';
import { GraphCapability } from '../BaseCapability';
import type { ShapeCapabilityTarget } from '../contracts';

export class ResizeCapability extends GraphCapability {
  public readonly id = 'resize';

  public supports(target: ShapeCapabilityTarget): boolean {
    return !!target.resize;
  }

  public createDescriptor(target: ShapeCapabilityTarget): GraphCapabilityDescriptor {
    return {
      id: this.id,
      feature: this.id,
      label: '调节大小',
      entityType: target.entityType,
      kind: 'toggle',
      group: 'edit',
      active: target.resize?.active
    };
  }

  public execute(target: ShapeCapabilityTarget): boolean {
    if (!target.resize) return false;
    target.resize.toggle();
    return true;
  }
}

export class ResizeValueCapability extends GraphCapability {
  public readonly id = 'resize.value';

  public supports(target: ShapeCapabilityTarget): boolean {
    return !!target.resize && target.resize.active;
  }

  public createDescriptor(target: ShapeCapabilityTarget): GraphCapabilityDescriptor {
    return {
      id: this.id,
      feature: this.id,
      label: '尺寸',
      entityType: target.entityType,
      kind: 'input',
      group: 'edit',
      active: true,
      meta: {
        value: target.resize?.value,
        min: target.resize?.min,
        max: target.resize?.max,
        step: target.resize?.step
      }
    };
  }

  public execute(target: ShapeCapabilityTarget, payload?: unknown): boolean {
    if (!target.resize) return false;
    const value = this.parseNumberValue(payload);
    if (value === null) return false;
    target.resize.setValue(value);
    return true;
  }
}
