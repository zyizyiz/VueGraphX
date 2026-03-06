import type { GraphCapabilityDescriptor } from '../../../types/capabilities';
import { GraphCapability } from '../BaseCapability';
import type { ShapeCapabilityTarget } from '../contracts';

export class AuxiliaryLineCapability extends GraphCapability {
  public readonly id = 'edit.auxiliary-line';

  public supports(target: ShapeCapabilityTarget): boolean {
    return !!target.auxiliaryLine;
  }

  public createDescriptor(target: ShapeCapabilityTarget): GraphCapabilityDescriptor {
    return {
      id: this.id,
      feature: this.id,
      label: '作辅助线',
      entityType: target.entityType,
      kind: 'toggle',
      group: 'edit',
      active: target.auxiliaryLine?.active
    };
  }

  public execute(target: ShapeCapabilityTarget): boolean {
    if (!target.auxiliaryLine) return false;
    target.auxiliaryLine.toggle();
    return true;
  }
}

export class ProjectionCapability extends GraphCapability {
  public readonly id = 'view.projection';

  public supports(target: ShapeCapabilityTarget): boolean {
    return !!target.projection;
  }

  public createDescriptor(target: ShapeCapabilityTarget): GraphCapabilityDescriptor {
    return {
      id: this.id,
      feature: this.id,
      label: '直观图',
      entityType: target.entityType,
      kind: 'toggle',
      group: 'inspect',
      active: target.projection?.active
    };
  }

  public execute(target: ShapeCapabilityTarget): boolean {
    if (!target.projection) return false;
    target.projection.toggle();
    return true;
  }
}

export class AnnotationCapability extends GraphCapability {
  public readonly id = 'annotation.mark';

  public supports(target: ShapeCapabilityTarget): boolean {
    return !!target.annotation;
  }

  public createDescriptor(target: ShapeCapabilityTarget): GraphCapabilityDescriptor {
    return {
      id: this.id,
      feature: this.id,
      label: '标注',
      entityType: target.entityType,
      kind: 'toggle',
      group: 'annotate',
      active: target.annotation?.active
    };
  }

  public execute(target: ShapeCapabilityTarget): boolean {
    if (!target.annotation) return false;
    target.annotation.toggle();
    return true;
  }
}
