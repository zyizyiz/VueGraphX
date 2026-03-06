import { computed, shallowRef, watch, onMounted, onBeforeUnmount } from 'vue';
import type { GraphCapabilitySnapshot, GraphXEngine } from 'vuegraphx';

interface CubeModel {
  id: string;
  points: unknown[];
  faces: unknown[];
}

interface CubePanelState {
  cubes: CubeModel[];
  selectedId: string | null;
  isAnimating: boolean;
}

interface CubePanelUIState {
  unfoldProgress: number;
  toolbarStyle: Record<string, string>;
}

export function useCubeDesigner(
  getEngine: () => GraphXEngine | null,
  _getActiveMode: () => string
) {
  const panelState = shallowRef<CubePanelState>({
    cubes: [],
    selectedId: null,
    isAnimating: false
  });

  const fastState = shallowRef<CubePanelUIState>({
    unfoldProgress: 0,
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
        panelState.value = {
          cubes: selected ? [selected] : [],
          selectedId: selected?.id ?? null,
          isAnimating: !!getCapability('animation.stop')?.enabled
        };
        fastState.value = {
          unfoldProgress: typeof progressCapability?.meta?.value === 'number' ? progressCapability.meta.value : 0,
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
  const setProgress = (val: number) => runCapability('animation.progress', { value: val });
  const playUnfold = () => runCapability('animation.play');
  const playFold = () => runCapability('animation.reverse');
  const stopAnim = () => runCapability('animation.stop');

  return {
    state: panelState,
    fastState,
    isPlaying: computed(() => panelState.value.isAnimating),
    
    createCube,
    setProgress,
    playUnfold,
    playFold,
    stopAnim
  };
}
