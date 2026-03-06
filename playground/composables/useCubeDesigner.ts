import { computed, shallowRef, watch, onMounted, onBeforeUnmount } from 'vue';
import type { GraphCapabilitySnapshot, GraphXEngine } from 'vuegraphx';
import type { DesignerAnimationTrackState } from '../types/animation';

interface CubeModel {
  id: string;
  points: unknown[];
  faces: unknown[];
}

interface CubePanelState {
  cubes: CubeModel[];
  selectedId: string | null;
}

interface CubePanelUIState {
  tracks: DesignerAnimationTrackState[];
  toolbarStyle: Record<string, string>;
}

export function useCubeDesigner(
  getEngine: () => GraphXEngine | null,
  _getActiveMode: () => string
) {
  const panelState = shallowRef<CubePanelState>({
    cubes: [],
    selectedId: null
  });

  const fastState = shallowRef<CubePanelUIState>({
    tracks: [],
    toolbarStyle: { left: '50%', top: 'calc(100% - 5rem)' }
  });

  const capabilitySnapshot = shallowRef<GraphCapabilitySnapshot>({
    selection: null,
    capabilities: []
  });

  let unsubscribeCapabilities: (() => void) | null = null;

  const getEngineInstance = () => {
    const engine = getEngine();
    if (!engine) return null;
    return engine;
  };

  const getCapability = (id: string) => capabilitySnapshot.value.capabilities.find(capability => capability.id === id);

  const init = () => {
    const engine = getEngineInstance();
    if (engine) {
      if (unsubscribeCapabilities) unsubscribeCapabilities();
      unsubscribeCapabilities = engine.subscribeCapabilities((snapshot) => {
        capabilitySnapshot.value = snapshot;

        const selected = snapshot.selection?.entityType === 'cube'
          ? snapshot.selection.entity as CubeModel
          : null;
        const progressCapability = getCapability('animation.progress');
        const trackMeta = Array.isArray(progressCapability?.meta?.tracks)
          ? progressCapability.meta.tracks as Array<Record<string, unknown>>
          : [];
        panelState.value = {
          cubes: selected ? [selected] : [],
          selectedId: selected?.id ?? null
        };
        fastState.value = {
          tracks: trackMeta
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
            })),
          toolbarStyle: snapshot.selection?.entityType === 'cube' && snapshot.selection.ui?.toolbarStyle
            ? snapshot.selection.ui.toolbarStyle as Record<string, string>
            : { left: '50%', top: 'calc(100% - 5rem)' }
        };
      });
    }
  };

  watch(() => getEngine(), () => {
    init();
  }, { immediate: true });

  onMounted(() => {
    init();
  });

  onBeforeUnmount(() => {
    if (unsubscribeCapabilities) unsubscribeCapabilities();
  });

  const runCapability = (capabilityId: string, payload?: unknown) => {
    const engine = getEngine();
    if (!engine) return false;
    return engine.executeCapability(capabilityId, payload);
  };

  const createCube = () => {
    const engine = getEngine();
    if (!engine) return false;
    return engine.createShape('cube');
  };

  const setTrackProgress = (trackId: string, value: number) => runCapability('animation.progress', { trackId, value });
  const playTrackForward = (trackId: string) => runCapability('animation.play', { trackId });
  const playTrackBackward = (trackId: string) => runCapability('animation.reverse', { trackId });
  const pauseTrack = (trackId: string) => runCapability('animation.pause', { trackId });
  const resumeTrack = (trackId: string) => runCapability('animation.resume', { trackId });
  const stopTrack = (trackId: string) => runCapability('animation.stop', { trackId });
  const toggleTrackLoop = (trackId: string, value?: boolean) => runCapability('animation.loop', { trackId, value });
  const toggleTrackYoyo = (trackId: string, value?: boolean) => runCapability('animation.yoyo', { trackId, value });
  const isAnyTrackPlaying = computed(() => fastState.value.tracks.some((track) => track.isAnimating));

  return {
    state: panelState,
    fastState,
    isAnyTrackPlaying,
    
    createCube,
    setTrackProgress,
    playTrackForward,
    playTrackBackward,
    pauseTrack,
    resumeTrack,
    stopTrack,
    toggleTrackLoop,
    toggleTrackYoyo
  };
}
