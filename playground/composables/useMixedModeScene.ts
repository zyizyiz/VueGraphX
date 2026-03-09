import { onBeforeUnmount, ref, watch } from 'vue';
import type { GraphXEngine } from 'vuegraphx';

type Point3D = [number, number, number];
type Point2D = [number, number];
type PlaneObjectId = 'triangle' | 'parallelogram';
type SolidObjectId = 'cube' | 'cone';

interface SceneRuntime {
  board: any;
  view: any;
  objects: any[];
  container: HTMLElement;
  cubeVertices: Point3D[];
  cubeCenter: Point3D;
  cubeHalfSize: number;
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

const DEFAULT_CONE_ROTATION = {
  x: -58,
  y: 18,
  z: 12
};

const INITIAL_PLANE_VERTICES: Point3D[] = [
  [-3.2, -1.6, 0],
  [0.8, -0.8, 0],
  [-1.4, 2.4, 0]
];

const PARALLELOGRAM_LOCAL_VERTICES: Point3D[] = [
  [-1.5, -0.9, 0],
  [1.1, -0.9, 0],
  [1.8, 0.9, 0],
  [-0.8, 0.9, 0]
];

const CONE_SEGMENT_COUNT = 14;
const CONE_BASE_LOCAL_VERTICES: Point3D[] = Array.from({ length: CONE_SEGMENT_COUNT }, (_, index) => {
  const angle = index / CONE_SEGMENT_COUNT * Math.PI * 2;
  return [Math.cos(angle), Math.sin(angle), 0];
});

const CUBE_VERTICES_LOCAL: Point3D[] = [
  [-1, -1, -1],
  [1, -1, -1],
  [1, 1, -1],
  [-1, 1, -1],
  [-1, -1, 1],
  [1, -1, 1],
  [1, 1, 1],
  [-1, 1, 1]
];

const CUBE_FACE_INDICES = [
  [0, 1, 2, 3],
  [4, 5, 6, 7],
  [0, 1, 5, 4],
  [1, 2, 6, 5],
  [2, 3, 7, 6],
  [3, 0, 4, 7]
];

const CUBE_FACE_COLORS = ['#e11d48', '#fb7185', '#2563eb', '#38bdf8', '#16a34a', '#4ade80'];

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

const applyRotation = (point: Point3D, rotation: { x: number; y: number; z: number }): Point3D => {
  const afterX = rotateX(point, degToRad(rotation.x));
  const afterY = rotateY(afterX, degToRad(rotation.y));
  return rotateZ(afterY, degToRad(rotation.z));
};

const updateCubeVerticesFromState = (
  targetVertices: Point3D[],
  center: Point3D,
  halfSize: number,
  rotation: { x: number; y: number; z: number }
) => {
  CUBE_VERTICES_LOCAL.forEach((local, index) => {
    const scaled: Point3D = [
      local[0] * halfSize,
      local[1] * halfSize,
      local[2] * halfSize
    ];
    targetVertices[index] = add3D(center, applyRotation(scaled, rotation));
  });
};

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

    const projectPlanePointToBoard = (point: Point3D): Point2D => {
      const projected = view.project3DTo2D(point);
      const weight = Number.isFinite(projected?.[0]) && Math.abs(projected[0]) > 1e-9 ? projected[0] : 1;
      return [projected[1] / weight, projected[2] / weight];
    };

    const boardDeltaToPlaneDelta = (delta: Point2D): Point2D => {
      const origin = projectPlanePointToBoard([0, 0, 0]);
      const xAxisPoint = projectPlanePointToBoard([1, 0, 0]);
      const yAxisPoint = projectPlanePointToBoard([0, 1, 0]);
      const basisX: Point2D = [xAxisPoint[0] - origin[0], xAxisPoint[1] - origin[1]];
      const basisY: Point2D = [yAxisPoint[0] - origin[0], yAxisPoint[1] - origin[1]];
      const determinant = basisX[0] * basisY[1] - basisX[1] * basisY[0];

      if (Math.abs(determinant) < 1e-9) {
        return delta;
      }

      return [
        (delta[0] * basisY[1] - delta[1] * basisY[0]) / determinant,
        (basisX[0] * delta[1] - basisX[1] * delta[0]) / determinant
      ];
    };

    const getBoardUserPoint = (event: PointerEvent): Point2D | null => {
      const coords = board.getUsrCoordsOfMouse(event);
      if (!Array.isArray(coords) || coords.length < 2) return null;
      if (!Number.isFinite(coords[0]) || !Number.isFinite(coords[1])) return null;
      return [coords[0], coords[1]];
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

    const planeState = {
      vertices: INITIAL_PLANE_VERTICES.map((point) => [...point] as Point3D)
    };
    const parallelogramState = {
      center: [3.4, -2.6, 0] as Point3D
    };

    const planeVertexWorld = (index: number): Point3D => planeState.vertices[index] ?? [0, 0, 0];
    const parallelogramVertexWorld = (index: number): Point3D => {
      const local = PARALLELOGRAM_LOCAL_VERTICES[index] ?? [0, 0, 0];
      return add3D(parallelogramState.center, local);
    };

    const planePointA = register(view.create('point3d', [
      () => planeVertexWorld(0)[0],
      () => planeVertexWorld(0)[1],
      () => planeVertexWorld(0)[2]
    ], {
      name: 'A',
      withLabel: true,
      size: 4,
      strokeColor: '#0f172a',
      fillColor: '#0f172a'
    }));
    const planePointB = register(view.create('point3d', [
      () => planeVertexWorld(1)[0],
      () => planeVertexWorld(1)[1],
      () => planeVertexWorld(1)[2]
    ], {
      name: 'B',
      withLabel: true,
      size: 4,
      strokeColor: '#0f172a',
      fillColor: '#0f172a'
    }));
    const planePointC = register(view.create('point3d', [
      () => planeVertexWorld(2)[0],
      () => planeVertexWorld(2)[1],
      () => planeVertexWorld(2)[2]
    ], {
      name: 'C',
      withLabel: true,
      size: 4,
      strokeColor: '#0f172a',
      fillColor: '#0f172a'
    }));

    const planeEdgeAB = register(view.create('line3d', [planePointA, planePointB], {
      strokeColor: '#0f172a',
      strokeWidth: 2,
      straightFirst: false,
      straightLast: false
    }));
    const planeEdgeBC = register(view.create('line3d', [planePointB, planePointC], {
      strokeColor: '#0f172a',
      strokeWidth: 2,
      straightFirst: false,
      straightLast: false
    }));
    const planeEdgeCA = register(view.create('line3d', [planePointC, planePointA], {
      strokeColor: '#0f172a',
      strokeWidth: 2,
      straightFirst: false,
      straightLast: false
    }));
    const planeTriangle = register(view.create('polygon3d', [planePointA, planePointB, planePointC], {
      fillColor: '#1e293b',
      fillOpacity: 0.18,
      borders: {
        strokeColor: '#334155',
        strokeWidth: 2
      },
      highlight: false,
      fixed: true
    }));

    const parallelogramPoints = PARALLELOGRAM_LOCAL_VERTICES.map((_, index) => register(view.create('point3d', [
      () => parallelogramVertexWorld(index)[0],
      () => parallelogramVertexWorld(index)[1],
      () => parallelogramVertexWorld(index)[2]
    ], {
      name: ['D', 'E', 'F', 'G'][index],
      withLabel: true,
      size: 3.6,
      strokeColor: '#7c3aed',
      fillColor: '#7c3aed'
    })));

    const parallelogramShape = register(view.create('polygon3d', parallelogramPoints, {
      fillColor: '#8b5cf6',
      fillOpacity: 0.2,
      borders: {
        strokeColor: '#6d28d9',
        strokeWidth: 2
      },
      highlight: false,
      fixed: true
    }));

    const cubeState = {
      center: [2.2, 1.1, 1.1] as Point3D,
      halfSize: 1.1
    };
    const coneState = {
      center: [-3.4, 1.8, 0.75] as Point3D,
      radius: 1.15,
      height: 2.5,
      rotation: { ...DEFAULT_CONE_ROTATION }
    };

    const cubeVertices = CUBE_VERTICES_LOCAL.map(() => [0, 0, 0] as Point3D);

    const updateCubeVertices = () => {
      updateCubeVerticesFromState(cubeVertices, cubeState.center, cubeState.halfSize, {
        x: rotationX.value,
        y: rotationY.value,
        z: rotationZ.value
      });
    };

    updateCubeVertices();

    const cubeVertexWorld = (index: number): Point3D => {
      return cubeVertices[index] ?? [0, 0, 0];
    };

    const cubePoints = CUBE_VERTICES_LOCAL.map((_, index) => register(view.create('point3d', [
      () => cubeVertexWorld(index)[0],
      () => cubeVertexWorld(index)[1],
      () => cubeVertexWorld(index)[2]
    ], { visible: false })));

    const cubeFaces = CUBE_FACE_INDICES.map((faceIndices, index) => register(view.create('polygon3d', faceIndices.map((vertexIndex) => cubePoints[vertexIndex]), {
      fillColor: CUBE_FACE_COLORS[index],
      fillOpacity: 0.34,
      borders: {
        strokeColor: CUBE_FACE_COLORS[index],
        strokeWidth: 2
      },
      highlight: false,
      fixed: true
    })));

    const coneApex = register(view.create('point3d', [
      () => add3D(coneState.center, applyRotation([0, 0, coneState.height], coneState.rotation))[0],
      () => add3D(coneState.center, applyRotation([0, 0, coneState.height], coneState.rotation))[1],
      () => add3D(coneState.center, applyRotation([0, 0, coneState.height], coneState.rotation))[2]
    ], {
      visible: false
    }));

    const coneBasePoints = CONE_BASE_LOCAL_VERTICES.map((local) => register(view.create('point3d', [
      () => add3D(coneState.center, applyRotation([
        local[0] * coneState.radius,
        local[1] * coneState.radius,
        0
      ], coneState.rotation))[0],
      () => add3D(coneState.center, applyRotation([
        local[0] * coneState.radius,
        local[1] * coneState.radius,
        0
      ], coneState.rotation))[1],
      () => add3D(coneState.center, applyRotation([
        local[0] * coneState.radius,
        local[1] * coneState.radius,
        0
      ], coneState.rotation))[2]
    ], {
      visible: false
    })));

    const coneBase = register(view.create('polygon3d', coneBasePoints, {
      fillColor: '#f59e0b',
      fillOpacity: 0.2,
      borders: {
        strokeColor: '#d97706',
        strokeWidth: 1.4
      },
      highlight: false,
      fixed: true
    }));

    const coneFaces = coneBasePoints.map((point, index) => register(view.create('polygon3d', [
      coneApex,
      point,
      coneBasePoints[(index + 1) % coneBasePoints.length]
    ], {
      fillColor: '#f97316',
      fillOpacity: 0.26,
      borders: {
        strokeColor: '#ea580c',
        strokeWidth: 1.3
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
          node.style.cursor = key === 'mixedPlane' ? 'move' : key === 'mixedPlaneObject' ? 'move' : 'move';
        });
      };

      markNodes(workPlane, 'mixedPlane', 'true');
      [planePointA, planePointB, planePointC, planeEdgeAB, planeEdgeBC, planeEdgeCA, planeTriangle].forEach((element) => {
        markNodes(element, 'mixedPlaneObject', 'triangle');
      });
      [...parallelogramPoints, parallelogramShape].forEach((element) => {
        markNodes(element, 'mixedPlaneObject', 'parallelogram');
      });
      cubeFaces.forEach((face) => {
        markNodes(face, 'mixedCubeFace', 'true');
        markNodes(face, 'mixedSolidObject', 'cube');
      });
      cubeFaces.forEach((face) => {
        markNodes(face, 'mixedRotatableSolid', 'cube');
      });
      [coneBase, ...coneFaces].forEach((element) => {
        markNodes(element, 'mixedSolidObject', 'cone');
        markNodes(element, 'mixedRotatableSolid', 'cone');
      });
    };

    const interaction = {
      mode: 'idle' as 'idle' | 'pan-board' | 'rotate-solid-object' | 'drag-plane-object' | 'drag-solid-object',
      pointerId: null as number | null,
      lastX: 0,
      lastY: 0,
      lastUserPoint: null as Point2D | null,
      activePlaneObject: null as PlaneObjectId | null,
      activeSolidObject: null as SolidObjectId | null
    };

    const clearInteraction = () => {
      interaction.mode = 'idle';
      interaction.pointerId = null;
      interaction.lastUserPoint = null;
      interaction.activePlaneObject = null;
      interaction.activeSolidObject = null;
    };

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      interaction.pointerId = event.pointerId;
      interaction.lastX = event.clientX;
      interaction.lastY = event.clientY;
      interaction.lastUserPoint = getBoardUserPoint(event);

      const rotatableSolidTarget = target?.closest('[data-mixed-rotatable-solid]') as HTMLElement | null;
      const rotatableSolid = rotatableSolidTarget?.dataset.mixedRotatableSolid as SolidObjectId | undefined;
      if (event.shiftKey && rotatableSolid) {
        interaction.mode = 'rotate-solid-object';
        interaction.activeSolidObject = rotatableSolid;
        container.setPointerCapture(event.pointerId);
        event.preventDefault();
        return;
      }

      const solidTarget = target?.closest('[data-mixed-solid-object]') as HTMLElement | null;
      const solidObject = solidTarget?.dataset.mixedSolidObject as SolidObjectId | undefined;
      if (solidObject) {
        interaction.mode = 'drag-solid-object';
        interaction.activeSolidObject = solidObject;
        container.setPointerCapture(event.pointerId);
        event.preventDefault();
        return;
      }

      const planeTarget = target?.closest('[data-mixed-plane-object]') as HTMLElement | null;
      const planeObject = planeTarget?.dataset.mixedPlaneObject as PlaneObjectId | undefined;
      if (planeObject) {
        interaction.mode = 'drag-plane-object';
        interaction.activePlaneObject = planeObject;
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

      if (interaction.mode === 'rotate-solid-object') {
        const dx = event.clientX - interaction.lastX;
        const dy = event.clientY - interaction.lastY;

        if (interaction.activeSolidObject === 'cube') {
          rotationY.value += dx * 0.7;
          rotationX.value += dy * 0.7;
        } else if (interaction.activeSolidObject === 'cone') {
          coneState.rotation.y += dx * 0.7;
          coneState.rotation.x += dy * 0.7;
          scheduleBoardUpdate();
        }

        interaction.lastX = event.clientX;
        interaction.lastY = event.clientY;
        return;
      }

      if (interaction.mode === 'drag-plane-object' || interaction.mode === 'drag-solid-object') {
        const nextUserPoint = getBoardUserPoint(event);
        if (!interaction.lastUserPoint || !nextUserPoint) return;

        const boardDelta: Point2D = [
          nextUserPoint[0] - interaction.lastUserPoint[0],
          nextUserPoint[1] - interaction.lastUserPoint[1]
        ];
        const planeDelta = boardDeltaToPlaneDelta(boardDelta);

        if (interaction.mode === 'drag-plane-object') {
          if (interaction.activePlaneObject === 'triangle') {
            planeState.vertices = planeState.vertices.map((point) => [
              point[0] + planeDelta[0],
              point[1] + planeDelta[1],
              point[2]
            ] as Point3D);
          } else if (interaction.activePlaneObject === 'parallelogram') {
            parallelogramState.center = [
              parallelogramState.center[0] + planeDelta[0],
              parallelogramState.center[1] + planeDelta[1],
              parallelogramState.center[2]
            ];
          }
        } else {
          if (interaction.activeSolidObject === 'cube') {
            cubeState.center = [
              cubeState.center[0] + planeDelta[0],
              cubeState.center[1] + planeDelta[1],
              cubeState.center[2]
            ];
            updateCubeVertices();
            if (runtime.value) {
              runtime.value.cubeCenter = cubeState.center;
            }
          } else if (interaction.activeSolidObject === 'cone') {
            coneState.center = [
              coneState.center[0] + planeDelta[0],
              coneState.center[1] + planeDelta[1],
              coneState.center[2]
            ];
          }
        }

        interaction.lastUserPoint = nextUserPoint;
        interaction.lastX = event.clientX;
        interaction.lastY = event.clientY;
        scheduleBoardUpdate();
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
      cubeCenter: cubeState.center,
      cubeHalfSize: cubeState.halfSize,
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

    updateCubeVerticesFromState(current.cubeVertices, current.cubeCenter, current.cubeHalfSize, {
      x: rotationX.value,
      y: rotationY.value,
      z: rotationZ.value
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