import { shallowRef, watch, onMounted, onBeforeUnmount } from 'vue';
import type { GraphXEngine } from '../../core/engine/GraphXEngine';
import { CubeDesignerPlugin, CubeDesignerState, CubeDesignerFastState } from '../../core/engine/plugins/CubeDesignerPlugin';

export function useCubeDesigner(
  getEngine: () => GraphXEngine | null,
  getActiveMode: () => string
) {
  const pluginState = shallowRef<CubeDesignerState>({
    cubes: [],
    selectedId: null
  });

  const fastState = shallowRef<CubeDesignerFastState>({
    unfoldProgress: 0,
    toolbarStyle: { left: '50%', top: 'calc(100% - 5rem)' }
  });

  const isPlaying = shallowRef(false);

  let plugin: CubeDesignerPlugin | null = null;
  let unsubscribe: (() => void) | null = null;
  let unsubscribeFast: (() => void) | null = null;
  
  let animId: number | null = null;

  const getPlugin = () => {
    const engine = getEngine();
    if (!engine) return null;
    
    let p = engine.getPlugin<CubeDesignerPlugin>('cube');
    if (!p) {
      p = new CubeDesignerPlugin();
      engine.registerPlugin('cube', p);
    }
    return p;
  };

  const init = () => {
    plugin = getPlugin();
    if (plugin) {
      if (unsubscribe) unsubscribe();
      unsubscribe = plugin.subscribe((newState) => {
        pluginState.value = newState;
      });
      if (unsubscribeFast) unsubscribeFast();
      unsubscribeFast = plugin.subscribeFast((newFastState) => {
        fastState.value = newFastState;
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
    if (unsubscribe) unsubscribe();
    if (unsubscribeFast) unsubscribeFast();
    if (animId) cancelAnimationFrame(animId);
  });

  const safeCall = (fn: (p: CubeDesignerPlugin) => void) => {
    if (plugin) fn(plugin);
  };

  const createCube = () => safeCall(p => p.createCube());
  
  const setProgress = (val: number) => {
    if (isPlaying.value) stopAnim();
    safeCall(p => p.setUnfoldProgress(val));
  };
  
  const stopAnim = () => {
    isPlaying.value = false;
    if (animId) cancelAnimationFrame(animId);
    animId = null;
  };

  // 展开动画 (0 -> 1)
  const playUnfold = () => {
    if (!plugin) return;
    stopAnim();
    isPlaying.value = true;
    
    const duration = 1500; // ms
    let startVal = fastState.value.unfoldProgress;
    let startTime: number | null = null;

    const step = (timestamp: number) => {
      if (!isPlaying.value) return;
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      
      // 缓入缓出 EaseInOut Quad
      let progress = elapsed / duration;
      if (progress > 1) progress = 1;
      
      const ease = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;
      
      const nextVal = startVal + (1 - startVal) * ease;
      plugin?.setUnfoldProgress(nextVal);
      
      if (progress < 1) {
        animId = requestAnimationFrame(step);
      } else {
        isPlaying.value = false;
      }
    };
    
    animId = requestAnimationFrame(step);
  };

  // 收起动画 (1 -> 0)
  const playFold = () => {
    if (!plugin) return;
    stopAnim();
    isPlaying.value = true;
    
    const duration = 1500; // ms
    let startVal = fastState.value.unfoldProgress;
    let startTime: number | null = null;

    const step = (timestamp: number) => {
      if (!isPlaying.value) return;
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      
      let progress = elapsed / duration;
      if (progress > 1) progress = 1;
      
      const ease = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;
      
      const nextVal = startVal - startVal * ease;
      plugin?.setUnfoldProgress(nextVal);
      
      if (progress < 1) {
        animId = requestAnimationFrame(step);
      } else {
        isPlaying.value = false;
      }
    };
    
    animId = requestAnimationFrame(step);
  };

  return {
    state: pluginState,
    fastState,
    isPlaying,
    
    createCube,
    setProgress,
    playUnfold,
    playFold,
    stopAnim
  };
}
