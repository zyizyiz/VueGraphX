import { computed, ref } from 'vue';
import type {
  GraphHiddenLineOptions,
  GraphHiddenLineProfile,
  GraphHiddenLineSceneSnapshot,
  GraphXEngine
} from 'vuegraphx';
import type { PlaygroundMode } from '../types/mode';

interface UseHiddenLineDebugOptions {
  getEngine: () => GraphXEngine | null;
  getActiveMode: () => PlaygroundMode;
}

const PROFILE_OPTIONS: GraphHiddenLineProfile[] = ['performance', 'balanced', 'quality'];

const cloneOptions = (options?: GraphHiddenLineOptions): GraphHiddenLineOptions | undefined => (
  options
    ? {
        ...options,
        visibleStyle: options.visibleStyle ? { ...options.visibleStyle } : undefined,
        hiddenStyle: options.hiddenStyle ? { ...options.hiddenStyle } : undefined,
        sampling: options.sampling ? { ...options.sampling } : undefined
      }
    : undefined
);

const mergeOptions = (base: GraphHiddenLineOptions | undefined, patch: GraphHiddenLineOptions): GraphHiddenLineOptions => ({
  ...(cloneOptions(base) ?? {}),
  ...patch,
  visibleStyle: patch.visibleStyle
    ? {
        ...(base?.visibleStyle ?? {}),
        ...patch.visibleStyle
      }
    : cloneOptions(base)?.visibleStyle,
  hiddenStyle: patch.hiddenStyle
    ? {
        ...(base?.hiddenStyle ?? {}),
        ...patch.hiddenStyle
      }
    : cloneOptions(base)?.hiddenStyle,
  sampling: patch.sampling
    ? {
        ...(base?.sampling ?? {}),
        ...patch.sampling
      }
    : cloneOptions(base)?.sampling
});

export function useHiddenLineDebug(options: UseHiddenLineDebugOptions) {
  const snapshot = ref<GraphHiddenLineSceneSnapshot | null>(null);

  const supportsHiddenLine = computed(() => {
    const mode = options.getActiveMode();
    return mode === '3d' || mode === 'dual-layer';
  });

  const refreshSnapshot = (): GraphHiddenLineSceneSnapshot | null => {
    const engine = options.getEngine();
    if (!engine || !supportsHiddenLine.value) {
      snapshot.value = null;
      return null;
    }

    const nextSnapshot = engine.getHiddenLineSceneSnapshot();
    snapshot.value = nextSnapshot;
    return nextSnapshot;
  };

  const applyOptionsPatch = (patch: GraphHiddenLineOptions): GraphHiddenLineSceneSnapshot | null => {
    const engine = options.getEngine();
    if (!engine || !supportsHiddenLine.value) {
      snapshot.value = null;
      return null;
    }

    const nextSnapshot = engine.setHiddenLineOptions(mergeOptions(engine.getHiddenLineOptions(), patch));
    snapshot.value = nextSnapshot;
    return nextSnapshot;
  };

  const setEnabled = (enabled: boolean) => applyOptionsPatch({ enabled });
  const setDebug = (debug: boolean) => applyOptionsPatch({ debug });
  const setProfile = (profile: GraphHiddenLineProfile) => applyOptionsPatch({ profile });

  const currentProfile = computed<GraphHiddenLineProfile>(() => snapshot.value?.options.profile ?? 'balanced');
  const isEnabled = computed(() => snapshot.value?.options.enabled === true);

  return {
    snapshot,
    supportsHiddenLine,
    profileOptions: PROFILE_OPTIONS,
    currentProfile,
    isEnabled,
    refreshSnapshot,
    setEnabled,
    setDebug,
    setProfile
  };
}
