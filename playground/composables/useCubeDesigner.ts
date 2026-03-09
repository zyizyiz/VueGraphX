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
  isManualRotating: boolean;
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
    isManualRotating: false,
    toolbarStyle: { left: '50%', top: 'calc(100% - 5rem)' }
  });

  const capabilitySnapshot = shallowRef<GraphCapabilitySnapshot>({
    selection: null,
    capabilities: []
  });

  let unsubscribeCapabilities: (() => void) | null = null;

  const runCapability = (id: string, ...args: any[]) => {
    const engine = getEngine();
    if (!engine || !capabilitySnapshot.value?.selection) return false;

    // 先尝试通过标准的 engine.executeCapability 触发动画等内置能力
    const success = engine.executeCapability(id, args.length > 0 ? args[0] : undefined);
    
    // 如果是自定义的 capability (如 toggleManualRotation)，则通过外部暴露的实例方法手动触发
    // 在 shape2d.ts 中，这些是被合并到 selection 快照顶层的
    const selection = capabilitySnapshot.value.selection as any;
    if (!success && selection[id] && typeof selection[id] === 'function') {
      selection[id](...args);
      engine.notifyCapabilityChange();
      return true;
    }
    
    engine.notifyCapabilityChange();
    return success;
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
          isManualRotating: !!(snapshot.selection?.entity as any)?.isManualRotating,
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
    runCapability,
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
