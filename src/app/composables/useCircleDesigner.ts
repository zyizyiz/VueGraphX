import { shallowRef, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import type { GraphXEngine } from '../../core/engine/GraphXEngine';
import { CircleDesignerPlugin, CircleDesignerState, CircleDesignerFastState, ActiveToolType, CircleModel } from '../../core/engine/plugins/CircleDesignerPlugin';

export function useCircleDesigner(
  getEngine: () => GraphXEngine | null,
  getActiveMode: () => string
) {
  const pluginState = shallowRef<CircleDesignerState>({
    circles: [],
    selectedId: null,
    showFeature: false,
    showColorPanel: false,
    activeTool: 'none',
    selectedColor: '#0ea5e9',
    isRadiusDragging: false
  });

  const fastState = shallowRef<CircleDesignerFastState>({
    radiusValue: 2,
    toolbarStyle: { left: '50%', top: 'calc(100% - 5rem)' },
    sizeInputStyle: { left: '50%', top: '50%' }
  });

  let plugin: CircleDesignerPlugin | null = null;
  let unsubscribe: (() => void) | null = null;
  let unsubscribeFast: (() => void) | null = null;
  let dragOverHandler: ((e: DragEvent) => void) | null = null;
  let dropHandler: ((e: DragEvent) => void) | null = null;
  let mountedDropTarget: HTMLElement | null = null;

  const getPlugin = () => {
    const engine = getEngine();
    if (!engine) return null;
    
    let p = engine.getPlugin<CircleDesignerPlugin>('circle');
    if (!p) {
      p = new CircleDesignerPlugin();
      engine.registerPlugin('circle', p);
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
      installDropListeners();
    }
  };

  const installDropListeners = () => {
    if (mountedDropTarget && dragOverHandler) mountedDropTarget.removeEventListener('dragover', dragOverHandler);
    if (mountedDropTarget && dropHandler) mountedDropTarget.removeEventListener('drop', dropHandler);

    const tryMount = () => {
      const mount = document.getElementById('vuegraphx-mount');
      if (!mount) {
        setTimeout(tryMount, 50);
        return;
      }

      dragOverHandler = (e: DragEvent) => {
        if (getActiveMode() !== 'geometry') return;
        e.preventDefault();
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
      };

      dropHandler = (e: DragEvent) => {
        if (getActiveMode() !== 'geometry') return;
        if (e.dataTransfer?.getData('shape') !== 'circle') return;
        e.preventDefault();
        
        const engine = getEngine();
        if (!engine) return;
        
        engine.handleDropEvent(e);
      };

      mount.addEventListener('dragover', dragOverHandler);
      mount.addEventListener('drop', dropHandler);
      mountedDropTarget = mount;
    };

    tryMount();
  };

  watch(() => getEngine(), () => {
    init();
  }, { immediate: true });

  watch(() => getActiveMode(), (mode) => {
    if (mode !== 'geometry' && plugin) {
      plugin.clearSelections();
    }
  });

  onMounted(() => {
    init();
  });

  onBeforeUnmount(() => {
    if (unsubscribe) unsubscribe();
    if (unsubscribeFast) unsubscribeFast();
    if (mountedDropTarget && dragOverHandler) mountedDropTarget.removeEventListener('dragover', dragOverHandler);
    if (mountedDropTarget && dropHandler) mountedDropTarget.removeEventListener('drop', dropHandler);
  });

  const selected = computed<CircleModel | null>(() => {
    return pluginState.value.circles.find(c => c.id === pluginState.value.selectedId) || null;
  });

  const toolClass = (kind: 'size' | 'assist' | 'crop' | 'color') => {
    if (kind === 'color') return pluginState.value.showColorPanel ? 'bg-sky-100 text-sky-700' : '';
    return pluginState.value.activeTool === kind ? 'bg-sky-100 text-sky-700' : '';
  };

  const onDragStart = (e: DragEvent) => {
    e.dataTransfer?.setData('shape', 'circle');
    e.dataTransfer!.effectAllowed = 'copy';
  };

  // 内部封装调用，保证非空
  const safeCall = (fn: (p: CircleDesignerPlugin) => void) => {
    if (plugin) fn(plugin);
  };

  return {
    state: pluginState,
    fastState,
    selected,
    toolClass,
    onDragStart,
    
    // Actions forwarding
    setShowFeature: (val: boolean) => safeCall((p) => p.setShowFeature(val)),
    toggleSizeMode: () => safeCall((p) => p.toggleSizeMode()),
    startAssistMode: () => safeCall((p) => p.startAssistMode()),
    toggleIntuitive: () => safeCall((p) => p.toggleIntuitive()),
    toggleMarking: () => safeCall((p) => p.toggleMarking()),
    startCropMode: () => safeCall((p) => p.startCropMode()),
    toggleColorPanel: () => safeCall((p) => p.toggleColorPanel()),
    removeSelected: () => safeCall((p) => p.removeSelected()),
    setActiveTool: (tool: ActiveToolType) => safeCall((p) => p.setActiveTool(tool)),
    applyColorImmediately: (color: string) => safeCall((p) => p.applyColorImmediately(color)),
    cancelCut: () => safeCall((p) => p.cancelCut()),
    confirmCut: () => safeCall((p) => p.confirmCut()),
    closeIntuitive: () => safeCall((p) => p.closeIntuitive()),
    
    // Model proxy
    radiusValue: computed({
      get: () => fastState.value.radiusValue,
      set: (val: number) => safeCall((p) => p.applyRadiusInput(val))
    })
  };
}
