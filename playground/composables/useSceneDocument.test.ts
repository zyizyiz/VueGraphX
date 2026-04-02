import { describe, expect, it, vi } from 'vitest';
import { GRAPH_SCENE_DOCUMENT_VERSION } from 'vuegraphx';
import { useSceneDocument } from './useSceneDocument';

describe('useSceneDocument', () => {
  it('exports current engine scene into formatted JSON text', () => {
    const exportScene = vi.fn(() => ({
      status: 'success' as const,
      scene: {
        version: 1 as const,
        mode: '2d' as const,
        commands: [{ id: 'cmd_1', expression: 'a = 1' }],
        shapes: []
      },
      diagnostics: []
    }));

    const sceneDocument = useSceneDocument({
      getEngine: () => ({ exportScene } as any),
      getActiveMode: () => '2d',
      switchMode: vi.fn(async () => undefined),
      syncCommandsFromScene: vi.fn()
    });

    const result = sceneDocument.exportSceneDocument();

    expect(result?.status).toBe('success');
    expect(sceneDocument.sceneText.value).toContain('"mode": "2d"');
    expect(sceneDocument.lastStatus.value).toBe('success');
  });

  it('switches mode and syncs command store after importing a scene', async () => {
    let activeMode: '2d' | '3d' | 'geometry' | 'dual-layer' = '3d';
    const syncCommandsFromScene = vi.fn();
    const switchMode = vi.fn(async (mode: typeof activeMode) => {
      activeMode = mode;
    });
    const loadScene = vi.fn(() => ({
      status: 'success' as const,
      scene: {
        version: 1 as const,
        mode: '3d' as const,
        settings: {
          view3D: {
            hiddenLine: {
              enabled: true
            }
          }
        },
        commands: [{ id: 'cmd_scene', expression: 'z = x + y', color: '#0ea5e9' }],
        shapes: []
      },
      diagnostics: [],
      appliedCommands: 1,
      appliedShapes: 0
    }));

    const sceneDocument = useSceneDocument({
      getEngine: () => ({ loadScene } as any),
      getActiveMode: () => activeMode,
      switchMode,
      syncCommandsFromScene
    });

    sceneDocument.sceneText.value = JSON.stringify({
      version: GRAPH_SCENE_DOCUMENT_VERSION,
      mode: '3d',
      commands: [],
      shapes: []
    });

    await sceneDocument.importSceneDocument();

    expect(switchMode).not.toHaveBeenCalled();
    expect(loadScene).toHaveBeenCalledTimes(1);
    expect(syncCommandsFromScene).toHaveBeenCalledWith([
      { id: 'cmd_scene', expression: 'z = x + y', color: '#0ea5e9' }
    ]);
    expect(sceneDocument.lastStatus.value).toBe('success');
  });
});
