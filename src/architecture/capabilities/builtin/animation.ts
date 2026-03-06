import type { GraphCapabilityDescriptor } from '../../../types/capabilities';
import { GraphCapability } from '../BaseCapability';
import type { ShapeCapabilityTarget } from '../contracts';

export class AnimationPlayCapability extends GraphCapability {
  public readonly id = 'animation.play';

  public supports(target: ShapeCapabilityTarget): boolean {
    return !!target.animation;
  }

  public createDescriptor(target: ShapeCapabilityTarget): GraphCapabilityDescriptor {
    return {
      id: this.id,
      feature: this.id,
      label: '开始播放',
      entityType: target.entityType,
      kind: 'action',
      group: 'animation',
      enabled: !!target.animation && !target.animation.isAnimating && target.animation.progress < 1
    };
  }

  public execute(target: ShapeCapabilityTarget): boolean {
    if (!target.animation) return false;
    target.animation.playForward();
    return true;
  }
}

export class AnimationReverseCapability extends GraphCapability {
  public readonly id = 'animation.reverse';

  public supports(target: ShapeCapabilityTarget): boolean {
    return !!target.animation;
  }

  public createDescriptor(target: ShapeCapabilityTarget): GraphCapabilityDescriptor {
    return {
      id: this.id,
      feature: this.id,
      label: '反向播放',
      entityType: target.entityType,
      kind: 'action',
      group: 'animation',
      enabled: !!target.animation && !target.animation.isAnimating && target.animation.progress > 0
    };
  }

  public execute(target: ShapeCapabilityTarget): boolean {
    if (!target.animation) return false;
    target.animation.playBackward();
    return true;
  }
}

export class AnimationStopCapability extends GraphCapability {
  public readonly id = 'animation.stop';

  public supports(target: ShapeCapabilityTarget): boolean {
    return !!target.animation;
  }

  public createDescriptor(target: ShapeCapabilityTarget): GraphCapabilityDescriptor {
    return {
      id: this.id,
      feature: this.id,
      label: '停止动画',
      entityType: target.entityType,
      kind: 'action',
      group: 'animation',
      enabled: !!target.animation?.isAnimating
    };
  }

  public execute(target: ShapeCapabilityTarget): boolean {
    if (!target.animation) return false;
    target.animation.stop();
    return true;
  }
}

export class AnimationProgressCapability extends GraphCapability {
  public readonly id = 'animation.progress';

  public supports(target: ShapeCapabilityTarget): boolean {
    return !!target.animation;
  }

  public createDescriptor(target: ShapeCapabilityTarget): GraphCapabilityDescriptor {
    return {
      id: this.id,
      feature: this.id,
      label: '进度',
      entityType: target.entityType,
      kind: 'input',
      group: 'animation',
      active: true,
      enabled: !!target.animation && !target.animation.isAnimating,
      meta: {
        value: target.animation?.progress,
        min: target.animation?.min,
        max: target.animation?.max,
        step: target.animation?.step
      }
    };
  }

  public execute(target: ShapeCapabilityTarget, payload?: unknown): boolean {
    if (!target.animation) return false;
    const value = this.parseNumberValue(payload);
    if (value === null) return false;
    target.animation.setProgress(value);
    return true;
  }
}
