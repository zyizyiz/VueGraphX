import { shallowRef, watch, onMounted, onBeforeUnmount } from 'vue';
import type { GraphCapabilitySnapshot, GraphXEngine } from 'vuegraphx';
import type { DesignerAnimationTrackState } from '../types/animation';
import { useAnimationCapabilityTracks } from './useAnimationCapabilityTracks';

type SolidEntityType = 'cube' | 'cube-2d' | 'cylinder-2d' | 'cone-2d';

interface SolidModel {
  id: string;
  points: unknown[];
  faces: unknown[];
  scene?: string;
}

interface SolidPanelState {
  solids: SolidModel[];
  selectedId: string | null;
  selectedType: SolidEntityType | null;
}

interface SolidPanelUIState {
  tracks: DesignerAnimationTrackState[];
  toolbarStyle: Record<string, string>;
}

interface GeometrySolidSpec {
  type: Extract<SolidEntityType, 'cube-2d' | 'cylinder-2d' | 'cone-2d'>;
  label: string;
  dragLabel: string;
  badgeClass: string;
  iconClass: string;
}

const geometrySolidSpecs: GeometrySolidSpec[] = [
  {
    type: 'cube-2d',
    label: '立方体',
    dragLabel: '拖动立方体到画布',
    badgeClass: 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100',
    iconClass: 'rounded-sm border-2 border-indigo-500 bg-indigo-100'
  },
  {
    type: 'cylinder-2d',
    label: '圆柱',
    dragLabel: '拖动圆柱到画布',
    badgeClass: 'bg-sky-50 text-sky-700 hover:bg-sky-100',
    iconClass: 'rounded-full border-2 border-sky-500 bg-sky-100'
  },
  {
    type: 'cone-2d',
    label: '圆锥',
    dragLabel: '拖动圆锥到画布',
    badgeClass: 'bg-amber-50 text-amber-700 hover:bg-amber-100',
    iconClass: 'border-x-[8px] border-b-[14px] border-x-transparent border-b-amber-400'
  }
];

const supportedSelectionTypes = new Set<SolidEntityType>(['cube', 'cube-2d', 'cylinder-2d', 'cone-2d']);

const isSupportedSelectionType = (value: string | null | undefined): value is SolidEntityType => !!value && supportedSelectionTypes.has(value as SolidEntityType);

export function useCubeDesigner(
  getEngine: () => GraphXEngine | null,
  getActiveMode: () => string
) {
  const panelState = shallowRef<SolidPanelState>({
    solids: [],
    selectedId: null,
    selectedType: null
  });

  const fastState = shallowRef<SolidPanelUIState>({
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

        const selectedType = isSupportedSelectionType(snapshot.selection?.entityType)
          ? snapshot.selection.entityType
          : null;
        const selected = selectedType
          ? snapshot.selection?.entity as SolidModel
          : null;
        panelState.value = {
          solids: selected ? [selected] : [],
          selectedId: selected?.id ?? null,
          selectedType
        };
        fastState.value = {
          tracks: animationTracksState.tracks.value,
          toolbarStyle: selectedType && snapshot.selection?.ui?.toolbarStyle
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

  const createSolid = (type: SolidEntityType) => {
    const engine = getEngine();
    if (!engine) return false;
    return engine.createShape(type);
  };

  const createCube = () => createSolid(getActiveMode() === 'geometry' ? 'cube-2d' : 'cube');

  const createGeometrySolid = (type: GeometrySolidSpec['type']) => createSolid(type);

  const onDragStart = (shapeType: GeometrySolidSpec['type'], e: DragEvent) => {
    if (getActiveMode() !== 'geometry') return;
    e.dataTransfer?.setData('shape', shapeType);
    if (e.dataTransfer) e.dataTransfer.effectAllowed = 'copy';
  };

  return {
    state: panelState,
    fastState,
    geometrySolidSpecs,
    isAnyTrackPlaying: animationTracksState.isAnyTrackPlaying,

    createCube,
    createGeometrySolid,
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
