import type { GraphCapabilityDescriptor } from '../../../types/capabilities';
import { GraphCapability } from '../BaseCapability';
import type { ShapeCapabilityTarget } from '../contracts';

export class StylePanelCapability extends GraphCapability {
  public readonly id = 'style';

  public supports(target: ShapeCapabilityTarget): boolean {
    return !!target.stylePanel;
  }

  public createDescriptor(target: ShapeCapabilityTarget): GraphCapabilityDescriptor {
    return {
      id: this.id,
      feature: this.id,
      label: '颜色',
      entityType: target.entityType,
      kind: 'panel',
      group: 'style',
      active: target.stylePanel?.active,
      meta: { selectedColor: target.stylePanel?.selectedColor }
    };
  }

  public execute(target: ShapeCapabilityTarget): boolean {
    if (!target.stylePanel) return false;
    target.stylePanel.toggle();
    return true;
  }
}

export class StrokeStyleCapability extends GraphCapability {
  public readonly id = 'style.stroke';

  public supports(target: ShapeCapabilityTarget): boolean {
    return !!target.strokeStyle;
  }

  public createDescriptor(target: ShapeCapabilityTarget): GraphCapabilityDescriptor {
    return {
      id: this.id,
      feature: this.id,
      label: '线条颜色',
      entityType: target.entityType,
      kind: 'toggle',
      group: 'style',
      active: target.strokeStyle?.active,
      meta: { selectedColor: target.strokeStyle?.selectedColor }
    };
  }

  public execute(target: ShapeCapabilityTarget, payload?: unknown): boolean {
    if (!target.strokeStyle) return false;
    target.strokeStyle.activate();
    const color = this.parseColorValue(payload);
    if (color) target.strokeStyle.applyColor(color);
    return true;
  }
}

export class FillStyleCapability extends GraphCapability {
  public readonly id = 'style.fill';

  public supports(target: ShapeCapabilityTarget): boolean {
    return !!target.fillStyle;
  }

  public createDescriptor(target: ShapeCapabilityTarget): GraphCapabilityDescriptor {
    return {
      id: this.id,
      feature: this.id,
      label: '填充颜色',
      entityType: target.entityType,
      kind: 'toggle',
      group: 'style',
      active: target.fillStyle?.active,
      meta: { selectedColor: target.fillStyle?.selectedColor }
    };
  }

  public execute(target: ShapeCapabilityTarget, payload?: unknown): boolean {
    if (!target.fillStyle) return false;
    target.fillStyle.activate();
    const color = this.parseColorValue(payload);
    if (color) target.fillStyle.applyColor(color);
    return true;
  }
}
