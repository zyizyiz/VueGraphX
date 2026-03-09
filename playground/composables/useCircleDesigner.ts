import { shallowRef, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import type { GraphCapabilitySnapshot, GraphXEngine } from 'vuegraphx';
import type { DesignerAnimationTrackState } from '../types/animation';
import { useAnimationCapabilityTracks } from './useAnimationCapabilityTracks';

type ActiveToolType = 'none' | 'size' | 'assist' | 'crop' | 'color-stroke' | 'color-fill';

interface CircleModel {
  id: string;
  isPiece?: boolean;
  intuitive: unknown | null;
  cutDraft: unknown | null;
  cutConfirmed?: boolean;
}

interface CirclePanelState {
  circles: CircleModel[];
  selectedId: string | null;
  showFeature: boolean;
  showColorPanel: boolean;
  activeTool: ActiveToolType;
  selectedColor: string;
  isRadiusDragging: boolean;
}

interface CirclePanelUIState {
  radiusValue: number;
  toolbarStyle: Record<string, string>;
  sizeInputStyle: Record<string, string>;
  animationTracks: DesignerAnimationTrackState[];
}

export function useCircleDesigner(
  getEngine: () => GraphXEngine | null,
  getActiveMode: () => string
) {
  const panelState = shallowRef<CirclePanelState>({
    circles: [],
    selectedId: null,
    showFeature: false,
    showColorPanel: false,
    activeTool: 'none',
    selectedColor: '#0ea5e9',
    isRadiusDragging: false
  });

  const fastState = shallowRef<CirclePanelUIState>({
    radiusValue: 2,
    toolbarStyle: { left: '50%', top: 'calc(100% - 5rem)' },
    sizeInputStyle: { left: '50%', top: '50%' },
    animationTracks: []
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

  const getCapability = (id: string) => capabilitySnapshot.value.capabilities.find(capability => capability.id === id);

  const getActiveTool = (): ActiveToolType => {
    if (getCapability('style.fill')?.active) return 'color-fill';
    if (getCapability('style.stroke')?.active) return 'color-stroke';
    if (getCapability('resize')?.active) return 'size';
    if (getCapability('edit.auxiliary-line')?.active) return 'assist';
    if (getCapability('edit.split')?.active) return 'crop';
    return 'none';
  };

  const init = () => {
    const engine = getEngineInstance();
    if (engine) {
      if (unsubscribeCapabilities) unsubscribeCapabilities();
      unsubscribeCapabilities = engine.subscribeCapabilities((snapshot) => {
        capabilitySnapshot.value = snapshot;

        const selected = snapshot.selection?.entityType === 'circle' || snapshot.selection?.entityType === 'circle-piece'
          ? snapshot.selection.entity as CircleModel
          : null;
        const radiusCapability = getCapability('resize.value');
        const styleCapability = getCapability('style');
        const toolbarStyle = (snapshot.selection?.entityType === 'circle' || snapshot.selection?.entityType === 'circle-piece') && snapshot.selection.ui?.toolbarStyle
          ? snapshot.selection.ui.toolbarStyle as Record<string, string>
          : { left: '50%', top: 'calc(100% - 5rem)' };
        const sizeInputStyle = (snapshot.selection?.entityType === 'circle' || snapshot.selection?.entityType === 'circle-piece') && snapshot.selection.ui?.sizeInputStyle
          ? snapshot.selection.ui.sizeInputStyle as Record<string, string>
          : { left: '50%', top: '50%' };

        panelState.value = {
          circles: selected ? [selected] : [],
          selectedId: selected?.id ?? null,
          showFeature: !!getCapability('inspect')?.active,
          showColorPanel: !!styleCapability?.active,
          activeTool: getActiveTool(),
          selectedColor: typeof styleCapability?.meta?.selectedColor === 'string' ? styleCapability.meta.selectedColor : '#0ea5e9',
          isRadiusDragging: false
        };

        fastState.value = {
          radiusValue: typeof radiusCapability?.meta?.value === 'number' ? radiusCapability.meta.value : 2,
          toolbarStyle,
          sizeInputStyle,
          animationTracks: animationTracksState.tracks.value
        };
      });
    }
  };

  watch(() => getEngine(), () => {
    init();
  }, { immediate: true });

  watch(() => getActiveMode(), (mode) => {
    if (mode !== 'geometry' && mode !== 'mixed') {
      capabilitySnapshot.value = { selection: null, capabilities: [] };
    }
  });

  onMounted(() => {
    init();
  });

  onBeforeUnmount(() => {
    if (unsubscribeCapabilities) unsubscribeCapabilities();
  });

  const selected = computed<CircleModel | null>(() => {
    return panelState.value.circles.find(c => c.id === panelState.value.selectedId) || null;
  });

  const toolClass = (kind: 'size' | 'assist' | 'crop' | 'color') => {
    if (kind === 'color') return panelState.value.showColorPanel ? 'bg-sky-100 text-sky-700' : '';
    return panelState.value.activeTool === kind ? 'bg-sky-100 text-sky-700' : '';
  };

  const onDragStart = (e: DragEvent) => {
    e.dataTransfer?.setData('shape', 'circle');
    e.dataTransfer!.effectAllowed = 'copy';
  };

  return {
    state: panelState,
    fastState,
    selected,
    isAnyAnimationPlaying: animationTracksState.isAnyTrackPlaying,
    toolClass,
    onDragStart,
    
    // Actions forwarding
    setShowFeature: (val: boolean) => val !== panelState.value.showFeature && runCapability('inspect'),
    toggleSizeMode: () => runCapability('resize'),
    startAssistMode: () => runCapability('edit.auxiliary-line'),
    toggleIntuitive: () => runCapability('view.projection'),
    toggleMarking: () => runCapability('annotation.mark'),
    startCropMode: () => runCapability('edit.split'),
    toggleColorPanel: () => runCapability('style'),
    removeSelected: () => runCapability('delete'),
    setActiveTool: (tool: ActiveToolType) => runCapability(tool === 'color-fill' ? 'style.fill' : 'style.stroke'),
    applyColorImmediately: (color: string) => runCapability(
      panelState.value.activeTool === 'color-fill' ? 'style.fill' : 'style.stroke',
      { color }
    ),
    cancelCut: () => runCapability('edit.split.cancel'),
    confirmCut: () => runCapability('edit.split.confirm'),
    setTrackProgress: animationTracksState.setTrackProgress,
    playTrackForward: animationTracksState.playTrackForward,
    playTrackBackward: animationTracksState.playTrackBackward,
    pauseTrack: animationTracksState.pauseTrack,
    resumeTrack: animationTracksState.resumeTrack,
    stopTrack: animationTracksState.stopTrack,
    toggleTrackLoop: animationTracksState.toggleTrackLoop,
    toggleTrackYoyo: animationTracksState.toggleTrackYoyo,
    
    // Model proxy
    radiusValue: computed({
      get: () => fastState.value.radiusValue,
      set: (val: number) => runCapability('resize.value', { value: val })
    })
  };
}
