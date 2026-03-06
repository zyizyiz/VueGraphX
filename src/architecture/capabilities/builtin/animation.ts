import type { GraphCapabilityDescriptor } from '../../../types/capabilities';
import { GraphCapability } from '../BaseCapability';
import type { AnimationCapabilityContract, ShapeCapabilityTarget } from '../contracts';

const getAnimationTracks = (target: ShapeCapabilityTarget): AnimationCapabilityContract[] => {
  if (target.animations) {
    return Object.values(target.animations.tracks);
  }

  return target.animation ? [target.animation] : [];
};

const getPrimaryAnimationTrack = (target: ShapeCapabilityTarget): AnimationCapabilityContract | null => {
  if (target.animations) {
    const primaryTrackId = target.animations.primaryTrackId;
    if (primaryTrackId && target.animations.tracks[primaryTrackId]) {
      return target.animations.tracks[primaryTrackId];
    }

    return Object.values(target.animations.tracks)[0] ?? null;
  }

  return target.animation ?? null;
};

const resolveAnimationTrack = (target: ShapeCapabilityTarget, payload?: unknown): AnimationCapabilityContract | null => {
  if (
    payload &&
    typeof payload === 'object' &&
    'trackId' in payload &&
    typeof (payload as { trackId: unknown }).trackId === 'string' &&
    target.animations
  ) {
    return target.animations.tracks[(payload as { trackId: string }).trackId] ?? null;
  }

  return getPrimaryAnimationTrack(target);
};

const createAnimationMeta = (target: ShapeCapabilityTarget, track: AnimationCapabilityContract | null, extraMeta?: Record<string, unknown>) => ({
  trackId: track?.id,
  trackLabel: track?.label,
  primaryTrackId: target.animations?.primaryTrackId ?? track?.id,
  tracks: getAnimationTracks(target).map((item) => ({
    id: item.id,
    label: item.label,
    isAnimating: item.isAnimating,
    isPaused: item.isPaused,
    loop: item.loop,
    yoyo: item.yoyo,
    progress: item.progress,
    min: item.min,
    max: item.max,
    step: item.step
  })),
  ...extraMeta
});

export class AnimationPlayCapability extends GraphCapability {
  public readonly id = 'animation.play';

  public supports(target: ShapeCapabilityTarget): boolean {
    return !!getPrimaryAnimationTrack(target);
  }

  public createDescriptor(target: ShapeCapabilityTarget): GraphCapabilityDescriptor {
    const track = getPrimaryAnimationTrack(target);
    return {
      id: this.id,
      feature: this.id,
      label: '开始播放',
      entityType: target.entityType,
      kind: 'action',
      group: 'animation',
      enabled: !!track && !track.isAnimating && track.progress < (track.max ?? 1),
      meta: createAnimationMeta(target, track)
    };
  }

  public execute(target: ShapeCapabilityTarget, payload?: unknown): boolean {
    const track = resolveAnimationTrack(target, payload);
    if (!track) return false;
    track.playForward();
    return true;
  }
}

export class AnimationReverseCapability extends GraphCapability {
  public readonly id = 'animation.reverse';

  public supports(target: ShapeCapabilityTarget): boolean {
    return !!getPrimaryAnimationTrack(target);
  }

  public createDescriptor(target: ShapeCapabilityTarget): GraphCapabilityDescriptor {
    const track = getPrimaryAnimationTrack(target);
    return {
      id: this.id,
      feature: this.id,
      label: '反向播放',
      entityType: target.entityType,
      kind: 'action',
      group: 'animation',
      enabled: !!track && !track.isAnimating && track.progress > (track.min ?? 0),
      meta: createAnimationMeta(target, track)
    };
  }

  public execute(target: ShapeCapabilityTarget, payload?: unknown): boolean {
    const track = resolveAnimationTrack(target, payload);
    if (!track) return false;
    track.playBackward();
    return true;
  }
}

export class AnimationStopCapability extends GraphCapability {
  public readonly id = 'animation.stop';

  public supports(target: ShapeCapabilityTarget): boolean {
    return !!getPrimaryAnimationTrack(target);
  }

  public createDescriptor(target: ShapeCapabilityTarget): GraphCapabilityDescriptor {
    const track = getPrimaryAnimationTrack(target);
    return {
      id: this.id,
      feature: this.id,
      label: '停止动画',
      entityType: target.entityType,
      kind: 'action',
      group: 'animation',
      enabled: !!track && (track.isAnimating || track.isPaused),
      meta: createAnimationMeta(target, track)
    };
  }

  public execute(target: ShapeCapabilityTarget, payload?: unknown): boolean {
    const track = resolveAnimationTrack(target, payload);
    if (!track) return false;
    track.stop();
    return true;
  }
}

export class AnimationPauseCapability extends GraphCapability {
  public readonly id = 'animation.pause';

  public supports(target: ShapeCapabilityTarget): boolean {
    return !!getPrimaryAnimationTrack(target);
  }

  public createDescriptor(target: ShapeCapabilityTarget): GraphCapabilityDescriptor {
    const track = getPrimaryAnimationTrack(target);
    return {
      id: this.id,
      feature: this.id,
      label: '暂停动画',
      entityType: target.entityType,
      kind: 'action',
      group: 'animation',
      enabled: !!track && track.isAnimating && !track.isPaused,
      meta: createAnimationMeta(target, track)
    };
  }

  public execute(target: ShapeCapabilityTarget, payload?: unknown): boolean {
    const track = resolveAnimationTrack(target, payload);
    if (!track) return false;
    track.pause();
    return true;
  }
}

export class AnimationResumeCapability extends GraphCapability {
  public readonly id = 'animation.resume';

  public supports(target: ShapeCapabilityTarget): boolean {
    return !!getPrimaryAnimationTrack(target);
  }

  public createDescriptor(target: ShapeCapabilityTarget): GraphCapabilityDescriptor {
    const track = getPrimaryAnimationTrack(target);
    return {
      id: this.id,
      feature: this.id,
      label: '恢复动画',
      entityType: target.entityType,
      kind: 'action',
      group: 'animation',
      enabled: !!track?.isPaused,
      meta: createAnimationMeta(target, track)
    };
  }

  public execute(target: ShapeCapabilityTarget, payload?: unknown): boolean {
    const track = resolveAnimationTrack(target, payload);
    if (!track) return false;
    track.resume();
    return true;
  }
}

const parseBooleanValue = (payload: unknown): boolean | null => {
  if (typeof payload === 'boolean') return payload;
  if (
    payload &&
    typeof payload === 'object' &&
    'value' in payload &&
    typeof (payload as { value: unknown }).value === 'boolean'
  ) {
    return (payload as { value: boolean }).value;
  }
  return null;
};

export class AnimationLoopCapability extends GraphCapability {
  public readonly id = 'animation.loop';

  public supports(target: ShapeCapabilityTarget): boolean {
    return !!getPrimaryAnimationTrack(target);
  }

  public createDescriptor(target: ShapeCapabilityTarget): GraphCapabilityDescriptor {
    const track = getPrimaryAnimationTrack(target);
    return {
      id: this.id,
      feature: this.id,
      label: '循环播放',
      entityType: target.entityType,
      kind: 'toggle',
      group: 'animation',
      active: !!track?.loop,
      enabled: !!track,
      meta: createAnimationMeta(target, track)
    };
  }

  public execute(target: ShapeCapabilityTarget, payload?: unknown): boolean {
    const track = resolveAnimationTrack(target, payload);
    if (!track) return false;
    const value = parseBooleanValue(payload);
    if (value === null) {
      track.toggleLoop();
      return true;
    }
    track.setLoop(value);
    return true;
  }
}

export class AnimationYoyoCapability extends GraphCapability {
  public readonly id = 'animation.yoyo';

  public supports(target: ShapeCapabilityTarget): boolean {
    return !!getPrimaryAnimationTrack(target);
  }

  public createDescriptor(target: ShapeCapabilityTarget): GraphCapabilityDescriptor {
    const track = getPrimaryAnimationTrack(target);
    return {
      id: this.id,
      feature: this.id,
      label: '往返播放',
      entityType: target.entityType,
      kind: 'toggle',
      group: 'animation',
      active: !!track?.yoyo,
      enabled: !!track,
      meta: createAnimationMeta(target, track)
    };
  }

  public execute(target: ShapeCapabilityTarget, payload?: unknown): boolean {
    const track = resolveAnimationTrack(target, payload);
    if (!track) return false;
    const value = parseBooleanValue(payload);
    if (value === null) {
      track.toggleYoyo();
      return true;
    }
    track.setYoyo(value);
    return true;
  }
}

export class AnimationProgressCapability extends GraphCapability {
  public readonly id = 'animation.progress';

  public supports(target: ShapeCapabilityTarget): boolean {
    return !!getPrimaryAnimationTrack(target);
  }

  public createDescriptor(target: ShapeCapabilityTarget): GraphCapabilityDescriptor {
    const track = getPrimaryAnimationTrack(target);
    return {
      id: this.id,
      feature: this.id,
      label: '进度',
      entityType: target.entityType,
      kind: 'input',
      group: 'animation',
      active: true,
      enabled: !!track && !track.isAnimating,
      meta: createAnimationMeta(target, track, {
        value: track?.progress,
        min: track?.min,
        max: track?.max,
        step: track?.step
      })
    };
  }

  public execute(target: ShapeCapabilityTarget, payload?: unknown): boolean {
    const track = resolveAnimationTrack(target, payload);
    if (!track) return false;
    const value = this.parseNumberValue(payload);
    if (value === null) return false;
    track.setProgress(value);
    return true;
  }
}
