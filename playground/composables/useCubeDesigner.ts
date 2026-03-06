import { shallowRef, watch, onMounted, onBeforeUnmount } from 'vue';
import type { GraphCapabilitySnapshot, GraphXEngine } from 'vuegraphx';
import type { DesignerAnimationTrackState } from '../types/animation';
import { useAnimationCapabilityTracks } from './useAnimationCapabilityTracks';

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
  getActiveMode: () => string
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

  const runCapability = (capabilityId: string, payload?: unknown) => {
    const engine = getEngine();
    if (!engine) return false;
    return engine.executeCapability(capabilityId, payload);
  };

  const animationTracksState = useAnimationCapabilityTracks(
    () => capabilitySnapshot.value,
    runCapability
  );

  const getEngineInstance = () => {
    const engine = getEngine();
    if (!engine) return null;
    return engine;
  };

  const init = () => {
    const engine = getEngineInstance();
    if (engine) {
      if (unsubscribeCapabilities) unsubscribeCapabilities();
      unsubscribeCapabilities = engine.subscribeCapabilities((snapshot) => {
        capabilitySnapshot.value = snapshot;

        const selected = snapshot.selection?.entityType === 'cube' || snapshot.selection?.entityType === 'cube-2d'
          ? snapshot.selection.entity as CubeModel
          : null;
        panelState.value = {
          cubes: selected ? [selected] : [],
          selectedId: selected?.id ?? null
        };
        fastState.value = {
          tracks: animationTracksState.tracks.value,
          toolbarStyle: (snapshot.selection?.entityType === 'cube' || snapshot.selection?.entityType === 'cube-2d') && snapshot.selection.ui?.toolbarStyle
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

  const createCube = () => {
    const engine = getEngine();
    if (!engine) return false;
    return engine.createShape(getActiveMode() === 'geometry' ? 'cube-2d' : 'cube');
  };

  const onDragStart = (e: DragEvent) => {
    if (getActiveMode() !== 'geometry') return;
    e.dataTransfer?.setData('shape', 'cube-2d');
    if (e.dataTransfer) e.dataTransfer.effectAllowed = 'copy';
  };

  return {
    state: panelState,
    fastState,
    isAnyTrackPlaying: animationTracksState.isAnyTrackPlaying,

    createCube,
    onDragStart,
    setTrackProgress: animationTracksState.setTrackProgress,
    playTrackForward: animationTracksState.playTrackForward,
    playTrackBackward: animationTracksState.playTrackBackward,
    pauseTrack: animationTracksState.pauseTrack,
    resumeTrack: animationTracksState.resumeTrack,
    stopTrack: animationTracksState.stopTrack,
    toggleTrackLoop: animationTracksState.toggleTrackLoop,
    toggleTrackYoyo: animationTracksState.toggleTrackYoyo
  };
}
