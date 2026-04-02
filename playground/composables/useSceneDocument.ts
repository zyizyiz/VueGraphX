import { computed, ref } from 'vue';
import type {
  GraphSceneCommandNode,
  GraphSceneDiagnostic,
  GraphSceneExportResult,
  GraphSceneLoadResult,
  GraphSceneLoadStatus,
  GraphXEngine
} from '../../src/index';
import { GRAPH_SCENE_DOCUMENT_VERSION as graphSceneDocumentVersion } from '../../src/index';
import type { PlaygroundMode } from '../types/mode';
import { getPlaygroundModeForEngineMode } from '../types/mode';

interface UseSceneDocumentOptions {
  getEngine: () => GraphXEngine | null;
  getActiveMode: () => PlaygroundMode;
  switchMode: (mode: PlaygroundMode, options?: { syncCommands?: boolean }) => Promise<void>;
  syncCommandsFromScene: (commands: GraphSceneCommandNode[]) => void;
}

const isEngineMode = (value: unknown): value is '2d' | '3d' | 'geometry' => value === '2d' || value === '3d' || value === 'geometry';
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const hasValidTopLevelSceneShape = (value: unknown): value is {
  version: typeof graphSceneDocumentVersion;
  mode: '2d' | '3d' | 'geometry';
  commands: unknown[];
  shapes: unknown[];
  relations?: unknown[];
} => {
  if (!isRecord(value)) return false;
  return value.version === graphSceneDocumentVersion
    && isEngineMode(value.mode)
    && Array.isArray(value.commands)
    && Array.isArray(value.shapes);
};

const formatScene = (scene: unknown) => JSON.stringify(scene, null, 2);

export function useSceneDocument(options: UseSceneDocumentOptions) {
  const sceneText = ref('');
  const diagnostics = ref<GraphSceneDiagnostic[]>([]);
  const lastStatus = ref<GraphSceneExportResult['status'] | GraphSceneLoadStatus | null>(null);

  const supportsScene = computed(() => options.getActiveMode() !== 'dual-layer');
  const errorCount = computed(() => diagnostics.value.filter((item) => item.severity === 'error').length);

  const setFailureDiagnostics = (message: string) => {
    diagnostics.value = [{
      code: 'scene_invalid_document',
      message,
      severity: 'error',
      nodeKind: 'document'
    }];
    lastStatus.value = 'failure';
  };

  const exportSceneDocument = (): GraphSceneExportResult | null => {
    const engine = options.getEngine();
    if (!engine || !supportsScene.value) return null;

    const result = engine.exportScene();
    diagnostics.value = result.diagnostics;
    lastStatus.value = result.status;

    if (result.scene) {
      sceneText.value = formatScene(result.scene);
    }

    return result;
  };

  const importSceneDocument = async (): Promise<GraphSceneLoadResult | null> => {
    if (!supportsScene.value) return null;

    let parsed: unknown;
    try {
      parsed = JSON.parse(sceneText.value);
    } catch {
      setFailureDiagnostics('Scene text is not valid JSON.');
      return null;
    }

    if (!hasValidTopLevelSceneShape(parsed)) {
      setFailureDiagnostics(`Scene text must contain version ${graphSceneDocumentVersion}, a valid mode, commands[] / shapes[] arrays, and optional relations[].`);
      return null;
    }

    const targetMode = getPlaygroundModeForEngineMode(parsed.mode);
    if (options.getActiveMode() !== targetMode) {
      await options.switchMode(targetMode, { syncCommands: false });
    }

    const engine = options.getEngine();
    if (!engine) {
      setFailureDiagnostics('Playground engine is not ready.');
      return null;
    }

    const result = engine.loadScene(sceneText.value);
    diagnostics.value = result.diagnostics;
    lastStatus.value = result.status;

    if (result.scene) {
      sceneText.value = formatScene(result.scene);
      options.syncCommandsFromScene(result.scene.commands);
    }

    return result;
  };

  const clearSceneDocument = () => {
    sceneText.value = '';
    diagnostics.value = [];
    lastStatus.value = null;
  };

  return {
    sceneText,
    diagnostics,
    errorCount,
    lastStatus,
    supportsScene,
    clearSceneDocument,
    exportSceneDocument,
    importSceneDocument
  };
}
