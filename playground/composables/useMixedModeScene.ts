import { onBeforeUnmount, ref, watch } from 'vue';
import type { GraphXEngine } from 'vuegraphx';

type Point3D = [number, number, number];

interface SceneRuntime {
  board: any;
  view: any;
  objects: any[];
  container: HTMLElement;
  cubeVertices: Point3D[];
  updateScheduled: boolean;
  cleanupDomListeners: () => void;
}

interface CleanupSceneOptions {
  removeObjects?: boolean;
}

const INITIAL_BOUNDING_BOX: [number, number, number, number] = [-12, 12, 12, -12];
const DEFAULT_ROTATION = {
  x: 32,
  y: -26,
  z: 12
};

const degToRad = (degrees: number) => degrees * Math.PI / 180;

const rotateX = (point: Point3D, radians: number): Point3D => {
  const [x, y, z] = point;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return [x, y * cos - z * sin, y * sin + z * cos];
};

const rotateY = (point: Point3D, radians: number): Point3D => {
  const [x, y, z] = point;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return [x * cos + z * sin, y, -x * sin + z * cos];
};

const rotateZ = (point: Point3D, radians: number): Point3D => {
  const [x, y, z] = point;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return [x * cos - y * sin, x * sin + y * cos, z];
};

const add3D = (left: Point3D, right: Point3D): Point3D => [left[0] + right[0], left[1] + right[1], left[2] + right[2]];

export const useMixedModeScene = (
  getEngine: () => GraphXEngine | null,
  isActive: () => boolean
) => {
  const rotationX = ref(DEFAULT_ROTATION.x);
  const rotationY = ref(DEFAULT_ROTATION.y);
  const rotationZ = ref(DEFAULT_ROTATION.z);
  const runtime = ref<SceneRuntime | null>(null);

  const cleanupScene = (options: CleanupSceneOptions = {}) => {
    const current = runtime.value;
    if (!current) return;

    const { removeObjects = true } = options;

    current.cleanupDomListeners();

    if (removeObjects) {
      const activeBoard = getEngine()?.getBoard();
      if (activeBoard === current.board) {
        [...current.objects].reverse().forEach((obj) => {
          try {
            current.board.removeObject(obj);
          } catch {
            // Ignore errors if object is already removed
          }
        });
      }
    }

    current.objects = [];
    runtime.value = null;
  };

  const resetCube = () => {
    rotationX.value = DEFAULT_ROTATION.x;
    rotationY.value = DEFAULT_ROTATION.y;
    rotationZ.value = DEFAULT_ROTATION.z;
  };

  const resetView = () => {
    const board = runtime.value?.board;
    if (!board) return;
    board.setBoundingBox(INITIAL_BOUNDING_BOX, true, 'update');
    board.update();
  };

  const scheduleBoardUpdate = () => {
    const current = runtime.value;
    if (!current || current.updateScheduled) return;

    current.updateScheduled = true;
    requestAnimationFrame(() => {
      const latest = runtime.value;
      if (!latest) return;
      latest.updateScheduled = false;
      latest.board.update();
    });
  };

  const initializeScene = () => {
    const engine = getEngine();
    if (!engine || !isActive()) return;

    const board = engine.getBoard();
    const view = engine.getView3D();
    const container = board?.containerObj as HTMLElement | undefined;
    if (!board || !view || !container) return;

    cleanupScene();
    board.setBoundingBox(INITIAL_BOUNDING_BOX, true, 'update');

    const sceneObjects: any[] = [];

    const register = <T>(object: T): T => {
      sceneObjects.push(object);
      return object;
    };

    const workPlane = register(view.create('polygon3d', [
      [-5, -5, 0],
      [5, -5, 0],
      [5, 5, 0],
      [-5, 5, 0]
    ], {
      fillColor: '#cbd5e1',
      fillOpacity: 0.18,
      borders: {
        strokeColor: '#94a3b8',
        strokeWidth: 1.2
      },
      highlight: false,
      fixed: true
    }));

    const planePointA = register(view.create('point3d', [-3.2, -1.6, 0], {
      name: 'A',
      withLabel: true,
      size: 4,
      strokeColor: '#0f172a',
      fillColor: '#0f172a'
    }));
    const planePointB = register(view.create('point3d', [0.8, -0.8, 0], {
      name: 'B',
      withLabel: true,
      size: 4,
      strokeColor: '#0f172a',
      fillColor: '#0f172a'
    }));
    const planePointC = register(view.create('point3d', [-1.4, 2.4, 0], {
      name: 'C',
      withLabel: true,
      size: 4,
      strokeColor: '#0f172a',
      fillColor: '#0f172a'
    }));

    register(view.create('line3d', [planePointA, planePointB], {
      strokeColor: '#0f172a',
      strokeWidth: 2,
      straightFirst: false,
      straightLast: false
    }));
    register(view.create('line3d', [planePointB, planePointC], {
      strokeColor: '#0f172a',
      strokeWidth: 2,
      straightFirst: false,
      straightLast: false
    }));
    register(view.create('line3d', [planePointC, planePointA], {
      strokeColor: '#0f172a',
      strokeWidth: 2,
      straightFirst: false,
      straightLast: false
    }));
    register(view.create('polygon3d', [planePointA, planePointB, planePointC], {
      fillColor: '#1e293b',
      fillOpacity: 0.18,
      borders: {
        strokeColor: '#334155',
        strokeWidth: 2
      },
      highlight: false,
      fixed: true
    }));

    const cubeState = {
      center: [2.2, 1.1, 1.1] as Point3D,
      halfSize: 1.1
    };

    const cubeVerticesLocal: Point3D[] = [
      [-1, -1, -1],
      [1, -1, -1],
      [1, 1, -1],
      [-1, 1, -1],
      [-1, -1, 1],
      [1, -1, 1],
      [1, 1, 1],
      [-1, 1, 1]
    ];

    const cubeFaceIndices = [
      [0, 1, 2, 3],
      [4, 5, 6, 7],
      [0, 1, 5, 4],
      [1, 2, 6, 5],
      [2, 3, 7, 6],
      [3, 0, 4, 7]
    ];

    const cubeFaceColors = ['#e11d48', '#fb7185', '#2563eb', '#38bdf8', '#16a34a', '#4ade80'];

    const cubeVertices = cubeVerticesLocal.map(() => [0, 0, 0] as Point3D);

    const updateCubeVertices = () => {
      cubeVerticesLocal.forEach((local, index) => {
        const scaled: Point3D = [
          local[0] * cubeState.halfSize,
          local[1] * cubeState.halfSize,
          local[2] * cubeState.halfSize
        ];
        const afterX = rotateX(scaled, degToRad(rotationX.value));
        const afterY = rotateY(afterX, degToRad(rotationY.value));
        const afterZ = rotateZ(afterY, degToRad(rotationZ.value));
        cubeVertices[index] = add3D(cubeState.center, afterZ);
      });
    };

    updateCubeVertices();

    const cubeVertexWorld = (index: number): Point3D => {
      return cubeVertices[index] ?? [0, 0, 0];
    };

    const cubePoints = cubeVerticesLocal.map((_, index) => register(view.create('point3d', [
      () => cubeVertexWorld(index)[0],
      () => cubeVertexWorld(index)[1],
      () => cubeVertexWorld(index)[2]
    ], { visible: false })));

    const cubeFaces = cubeFaceIndices.map((faceIndices, index) => register(view.create('polygon3d', faceIndices.map((vertexIndex) => cubePoints[vertexIndex]), {
      fillColor: cubeFaceColors[index],
      fillOpacity: 0.34,
      borders: {
        strokeColor: cubeFaceColors[index],
        strokeWidth: 2
      },
      highlight: false,
      fixed: true
    })));

    const markSceneDom = () => {
      const markNodes = (element: any, key: string, value: string) => {
        const nodes: HTMLElement[] = [];
        if (element?.element2D?.rendNode) nodes.push(element.element2D.rendNode as HTMLElement);
        if (element?.element2D?.rendNodeFill) nodes.push(element.element2D.rendNodeFill as HTMLElement);
        if (Array.isArray(element?.element2D?.borders)) {
          element.element2D.borders.forEach((border: any) => {
            if (border?.rendNode) nodes.push(border.rendNode as HTMLElement);
          });
        }
        nodes.forEach((node) => {
          node.dataset[key] = value;
          node.style.cursor = key === 'mixedCubeFace' ? 'grab' : 'move';
        });
      };

      markNodes(workPlane, 'mixedPlane', 'true');
      cubeFaces.forEach((face) => markNodes(face, 'mixedCubeFace', 'true'));
    };

    const interaction = {
      mode: 'idle' as 'idle' | 'pan-board' | 'rotate-cube',
      pointerId: null as number | null,
      lastX: 0,
      lastY: 0
    };

    const clearInteraction = () => {
      interaction.mode = 'idle';
      interaction.pointerId = null;
    };

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      interaction.pointerId = event.pointerId;
      interaction.lastX = event.clientX;
      interaction.lastY = event.clientY;

      if (target?.closest('[data-mixed-cube-face="true"]')) {
        interaction.mode = 'rotate-cube';
        container.setPointerCapture(event.pointerId);
        event.preventDefault();
        return;
      }

      interaction.mode = 'pan-board';
      board.initMoveOrigin(event.clientX, event.clientY);
      container.setPointerCapture(event.pointerId);
      event.preventDefault();
    };

    const onPointerMove = (event: PointerEvent) => {
      if (interaction.pointerId !== event.pointerId) return;

      if (interaction.mode === 'rotate-cube') {
        const dx = event.clientX - interaction.lastX;
        const dy = event.clientY - interaction.lastY;
        rotationY.value += dx * 0.7;
        rotationX.value += dy * 0.7;
        interaction.lastX = event.clientX;
        interaction.lastY = event.clientY;
        return;
      }

      if (interaction.mode === 'pan-board') {
        board.moveOrigin(event.clientX, event.clientY, true);
        interaction.lastX = event.clientX;
        interaction.lastY = event.clientY;
      }
    };

    const onPointerUp = (event: PointerEvent) => {
      if (interaction.pointerId !== event.pointerId) return;
      if (container.hasPointerCapture(event.pointerId)) {
        container.releasePointerCapture(event.pointerId);
      }
      clearInteraction();
    };

    container.addEventListener('pointerdown', onPointerDown);
    container.addEventListener('pointermove', onPointerMove);
    container.addEventListener('pointerup', onPointerUp);
    container.addEventListener('pointercancel', onPointerUp);

    runtime.value = {
      board,
      view,
      objects: sceneObjects,
      container,
      cubeVertices,
      updateScheduled: false,
      cleanupDomListeners: () => {
        container.removeEventListener('pointerdown', onPointerDown);
        container.removeEventListener('pointermove', onPointerMove);
        container.removeEventListener('pointerup', onPointerUp);
        container.removeEventListener('pointercancel', onPointerUp);
      }
    };

    board.update();
    queueMicrotask(markSceneDom);
  };

  watch([rotationX, rotationY, rotationZ], () => {
    const current = runtime.value;
    if (!current) return;

    const cubeVerticesLocal: Point3D[] = [
      [-1, -1, -1],
      [1, -1, -1],
      [1, 1, -1],
      [-1, 1, -1],
      [-1, -1, 1],
      [1, -1, 1],
      [1, 1, 1],
      [-1, 1, 1]
    ];
    const cubeCenter: Point3D = [2.2, 1.1, 1.1];
    const halfSize = 1.1;

    cubeVerticesLocal.forEach((local, index) => {
      const scaled: Point3D = [
        local[0] * halfSize,
        local[1] * halfSize,
        local[2] * halfSize
      ];
      const afterX = rotateX(scaled, degToRad(rotationX.value));
      const afterY = rotateY(afterX, degToRad(rotationY.value));
      const afterZ = rotateZ(afterY, degToRad(rotationZ.value));
      current.cubeVertices[index] = add3D(cubeCenter, afterZ);
    });

    scheduleBoardUpdate();
  });

  watch(() => isActive(), (active) => {
    if (!active) {
      cleanupScene({ removeObjects: false });
    }
  });

  onBeforeUnmount(() => {
    cleanupScene({ removeObjects: false });
  });

  return {
    rotationX,
    rotationY,
    rotationZ,
    resetCube,
    resetView,
    rebuildScene: initializeScene
  };
};