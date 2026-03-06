import { computed } from 'vue';
import type { GraphCapabilityDescriptor, GraphCapabilitySnapshot } from 'vuegraphx';
import type { DesignerAnimationTrackState } from '../types/animation';

const getAnimationProgressCapability = (snapshot: GraphCapabilitySnapshot): GraphCapabilityDescriptor | undefined => {
  return snapshot.capabilities.find((capability) => capability.id === 'animation.progress');
};

const toDesignerAnimationTracks = (capability: GraphCapabilityDescriptor | undefined): DesignerAnimationTrackState[] => {
  const trackMeta = Array.isArray(capability?.meta?.tracks)
    ? capability.meta.tracks as Array<Record<string, unknown>>
    : [];

  return trackMeta
    .filter((track): track is Record<string, unknown> & { id: string } => typeof track.id === 'string')
    .map((track) => ({
      id: track.id,
      label: typeof track.label === 'string' && track.label ? track.label : track.id,
      progress: typeof track.progress === 'number' ? track.progress : 0,
      min: typeof track.min === 'number' ? track.min : 0,
      max: typeof track.max === 'number' ? track.max : 1,
      step: typeof track.step === 'number' ? track.step : 0.01,
      isAnimating: !!track.isAnimating,
      isPaused: !!track.isPaused,
      loop: !!track.loop,
      yoyo: !!track.yoyo
    }));
};

export const getAnimationCapabilityTracks = (snapshot: GraphCapabilitySnapshot): DesignerAnimationTrackState[] => {
  return toDesignerAnimationTracks(getAnimationProgressCapability(snapshot));
};

export function useAnimationCapabilityTracks(
  getSnapshot: () => GraphCapabilitySnapshot,
  runCapability: (capabilityId: string, payload?: unknown) => boolean
) {
  const tracks = computed(() => getAnimationCapabilityTracks(getSnapshot()));
  const isAnyTrackPlaying = computed(() => tracks.value.some((track) => track.isAnimating));

  return {
    tracks,
    isAnyTrackPlaying,
    setTrackProgress: (trackId: string, value: number) => runCapability('animation.progress', { trackId, value }),
    playTrackForward: (trackId: string) => runCapability('animation.play', { trackId }),
    playTrackBackward: (trackId: string) => runCapability('animation.reverse', { trackId }),
    pauseTrack: (trackId: string) => runCapability('animation.pause', { trackId }),
    resumeTrack: (trackId: string) => runCapability('animation.resume', { trackId }),
    stopTrack: (trackId: string) => runCapability('animation.stop', { trackId }),
    toggleTrackLoop: (trackId: string, value?: boolean) => runCapability('animation.loop', { trackId, value }),
    toggleTrackYoyo: (trackId: string, value?: boolean) => runCapability('animation.yoyo', { trackId, value })
  };
}