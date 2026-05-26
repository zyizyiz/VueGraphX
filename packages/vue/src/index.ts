import { computed, inject, provide, ref, type ComputedRef, type InjectionKey, type Ref } from 'vue';
import {
  GraphBackendRegistry,
  GraphInteractionRouter,
  GraphSceneStore,
  type GraphObjectNode,
  type GraphObjectPatch,
  type GraphOperationResult,
  type GraphPointerRouteInput,
  type GraphPointerRouteResult,
  type GraphRenderBackend
} from '@vuegraphx/core';

export interface VueGraphXRuntime {
  scene: GraphSceneStore;
  registry: GraphBackendRegistry;
  router: GraphInteractionRouter;
}

export interface VueGraphXRuntimeOptions {
  sceneId?: string;
  registry?: GraphBackendRegistry;
  router?: GraphInteractionRouter;
}

export interface VueGraphXSceneBinding {
  scene: GraphSceneStore;
  revision: Ref<number>;
  objects: ComputedRef<GraphObjectNode[]>;
  addObject(node: GraphObjectNode, options?: { root?: boolean; replace?: boolean }): GraphOperationResult<GraphObjectNode>;
  updateObject(id: string, patch: GraphObjectPatch): GraphOperationResult<GraphObjectNode>;
  removeObject(id: string): GraphOperationResult<GraphObjectNode>;
  clear(): void;
}

export interface VueGraphXBackendBinding {
  registry: GraphBackendRegistry;
  backends: ComputedRef<GraphRenderBackend[]>;
  registerBackend(backend: GraphRenderBackend): void;
  unregisterBackend(id: string): boolean;
}

export const vueGraphXRuntimeKey: InjectionKey<VueGraphXRuntime> = Symbol('VueGraphXRuntime');

export const createVueGraphXRuntime = (options: VueGraphXRuntimeOptions = {}): VueGraphXRuntime => ({
  scene: new GraphSceneStore(options.sceneId ?? 'scene'),
  registry: options.registry ?? new GraphBackendRegistry(),
  router: options.router ?? new GraphInteractionRouter()
});

export const provideVueGraphXRuntime = (runtime: VueGraphXRuntime = createVueGraphXRuntime()): VueGraphXRuntime => {
  provide(vueGraphXRuntimeKey, runtime);
  return runtime;
};

export const injectVueGraphXRuntime = (fallback?: VueGraphXRuntime): VueGraphXRuntime => {
  const runtime = inject(vueGraphXRuntimeKey, fallback);
  if (!runtime) {
    throw new Error('VueGraphX runtime was not provided. Call provideVueGraphXRuntime() in an ancestor setup().');
  }
  return runtime;
};

export const useVueGraphXScene = (runtime: VueGraphXRuntime = injectVueGraphXRuntime()): VueGraphXSceneBinding => {
  const revision = ref(0);
  const bump = () => {
    revision.value += 1;
  };

  return {
    scene: runtime.scene,
    revision,
    objects: computed(() => {
      revision.value;
      return runtime.scene.listObjects();
    }),
    addObject: (node, options = {}) => {
      const result = runtime.scene.addObject(node, options);
      if (result.ok) bump();
      return result;
    },
    updateObject: (id, patch) => {
      const result = runtime.scene.updateObject(id, patch);
      if (result.ok) bump();
      return result;
    },
    removeObject: (id) => {
      const result = runtime.scene.removeObject(id);
      if (result.ok) bump();
      return result;
    },
    clear: () => {
      runtime.scene.clear();
      bump();
    }
  };
};

export const useVueGraphXBackends = (runtime: VueGraphXRuntime = injectVueGraphXRuntime()): VueGraphXBackendBinding => {
  const revision = ref(0);
  const bump = () => {
    revision.value += 1;
  };

  return {
    registry: runtime.registry,
    backends: computed(() => {
      revision.value;
      return runtime.registry.list();
    }),
    registerBackend: (backend) => {
      runtime.registry.register(backend);
      runtime.router.registerBackend(backend);
      bump();
    },
    unregisterBackend: (id) => {
      const removed = runtime.registry.unregister(id);
      const unrouted = runtime.router.unregisterBackend(id);
      if (removed || unrouted) bump();
      return removed || unrouted;
    }
  };
};

export const useVueGraphXPointerRouter = (runtime: VueGraphXRuntime = injectVueGraphXRuntime()) => ({
  router: runtime.router,
  pointerDown: (input: GraphPointerRouteInput): GraphPointerRouteResult => runtime.router.pointerDown(input),
  pointerMove: runtime.router.pointerMove.bind(runtime.router),
  pointerUp: runtime.router.pointerUp.bind(runtime.router),
  beginDrag: runtime.router.beginDrag.bind(runtime.router),
  cancelPointer: runtime.router.cancelPointer.bind(runtime.router)
});
