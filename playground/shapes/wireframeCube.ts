import { createComposedShapeDefinition, type GraphShapeApi } from 'vuegraphx';
import type {
  GraphHiddenLineEdgeStyle,
  GraphHiddenLineMeshSourceData,
  GraphHiddenLineSourceHandle
} from 'vuegraphx';

interface WireframeCubeState {
  size: number;
}

interface WireframeCubePayload {
  hiddenLine?: {
    visible?: GraphHiddenLineEdgeStyle;
    hidden?: GraphHiddenLineEdgeStyle;
  };
}

type Point3D = [number, number, number];

let wireframeCubeSpawnIndex = 0;
let activeWireframeCubeInteractionId: string | null = null;

const CUBE_VERTICES_LOCAL: Point3D[] = [
  [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
  [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]
];

const CUBE_EDGES: Array<[number, number]> = [
  [0, 1], [1, 2], [2, 3], [3, 0],
  [4, 5], [5, 6], [6, 7], [7, 4],
  [0, 4], [1, 5], [2, 6], [3, 7]
];

const CUBE_FACES: Array<[number, number, number, number]> = [
  [0, 1, 2, 3],
  [4, 5, 6, 7],
  [0, 1, 5, 4],
  [2, 3, 7, 6],
  [1, 2, 6, 5],
  [0, 3, 7, 4]
];

const TRANSLATE_SHORTCUT_KEY = 'Shift';
const ROTATION_SPEED = 0.01;

const getWireframeCubeSpawnCenter = (index: number): Point3D => {
  const column = index % 3;
  const row = Math.floor(index / 3) % 3;
  return [
    (column - 1) * 2.8,
    (1 - row) * 2.4,
    0
  ];
};

const rotateAroundX = ([x, y, z]: Point3D, radians: number): Point3D => {
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return [x, y * cos - z * sin, y * sin + z * cos];
};

const rotateAroundY = ([x, y, z]: Point3D, radians: number): Point3D => {
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return [x * cos + z * sin, y, -x * sin + z * cos];
};

const getScreenDeltaToWorldDelta = (
  api: GraphShapeApi<WireframeCubeState>,
  dx: number,
  dy: number
): [number, number] | null => {
  const origin = api.projectPoint3D([0, 0, 0]);
  const axisX = api.projectPoint3D([1, 0, 0]);
  const axisY = api.projectPoint3D([0, 1, 0]);

  if (!origin || !axisX || !axisY) return null;

  const ux = axisX.x - origin.x;
  const uy = axisX.y - origin.y;
  const vx = axisY.x - origin.x;
  const vy = axisY.y - origin.y;
  const det = ux * vy - uy * vx;

  if (Math.abs(det) < 1e-6) return null;

  return [
    (dx * vy - dy * vx) / det,
    (dy * ux - dx * uy) / det
  ];
};

const getPointerLikeArg = (args: any[]): { clientX?: number; clientY?: number; shiftKey?: boolean } | null => {
  for (const arg of args) {
    if (arg && typeof arg === 'object' && ('clientX' in arg || 'changedTouches' in arg || 'touches' in arg)) {
      if (typeof arg.clientX === 'number' && typeof arg.clientY === 'number') {
        return arg;
      }
      const touch = arg.changedTouches?.[0] ?? arg.touches?.[0];
      if (touch) {
        return {
          clientX: touch.clientX,
          clientY: touch.clientY,
          shiftKey: Boolean(arg.shiftKey)
        };
      }
    }
  }
  return null;
};

export const wireframeCubeShapeDefinition = createComposedShapeDefinition<WireframeCubePayload, WireframeCubeState>({
  type: 'wireframe-cube',
  supportedModes: 'all',
  create(_context, payload) {
    let cleanupKeyListeners = () => undefined;
    let cleanupInteractionListeners = () => undefined;
    let cleanupHitListeners = () => undefined;
    let frameId: number | null = null;
    const spawnCenter = getWireframeCubeSpawnCenter(wireframeCubeSpawnIndex++);
    let instanceId: string | null = null;
    let hiddenLineHandle: GraphHiddenLineSourceHandle | null = null;

    return {
      entityType: 'wireframe-cube',
      initialState: {
        size: 2
      },
      getCapabilityTarget: () => null,
      setup(api) {
        instanceId = api.id;
        const view3d = api.engine.getView3D() as any;
        if (!view3d || !api.board) return;
        const hiddenLineEnabled = api.engine.getHiddenLineOptions().enabled === true;

        const transform = {
          center: [...spawnCenter] as Point3D,
          rotationX: -0.45,
          rotationY: 0.55
        };

        const projectVertex = (vertex: Point3D): Point3D => {
          const half = api.state.size / 2;
          const scaled: Point3D = [vertex[0] * half, vertex[1] * half, vertex[2] * half];
          const rotated = rotateAroundY(rotateAroundX(scaled, transform.rotationX), transform.rotationY);
          return [
            rotated[0] + transform.center[0],
            rotated[1] + transform.center[1],
            rotated[2] + transform.center[2]
          ];
        };

        const points = CUBE_VERTICES_LOCAL.map((vertex, index) => (
          api.trackObject(view3d.create('point3d', projectVertex(vertex), {
            visible: false,
            name: `${api.id}_p${index}`
          }))
        ));

        const edgeObjects: Record<string, any> = {};
        CUBE_EDGES.forEach(([from, to], index) => {
          edgeObjects[`edge_${index}`] = api.trackObject(view3d.create('line3d', [points[from], points[to]], {
            strokeColor: '#475569',
            strokeWidth: 2,
            strokeOpacity: hiddenLineEnabled ? 0 : 1,
            fixed: true,
            highlight: false
          }));
        });

        const faceObjects: Record<string, any> = {};
        CUBE_FACES.forEach(([a, b, c, d], index) => {
          faceObjects[`face_${index}`] = api.trackObject(view3d.create('polygon3d', [points[a], points[b], points[c], points[d]], {
            fillColor: '#0f172a',
            fillOpacity: 0.001,
            highlight: false,
            fixed: true,
            borders: {
              visible: false,
              strokeOpacity: 0,
              highlightStrokeOpacity: 0
            }
          }));
        });

        const applyGeometry = () => {
          if (!api.board) return;
          api.board.suspendUpdate?.();
          CUBE_VERTICES_LOCAL.forEach((vertex, index) => {
            points[index].moveTo(projectVertex(vertex), 0);
          });
          api.board.unsuspendUpdate?.();
        };

        const hiddenLineVisible = payload?.hiddenLine?.visible ?? { strokeColor: '#475569', strokeWidth: 2 };
        const hiddenLineHidden = payload?.hiddenLine?.hidden ?? { strokeColor: '#475569', strokeWidth: 1.6, dash: 2, dashScale: true };

        hiddenLineHandle = api.registerHiddenLineSource({
          role: 'both',
          style: {
            visible: hiddenLineVisible,
            hidden: hiddenLineHidden
          },
          resolve: (): GraphHiddenLineMeshSourceData => {
            const vertices = CUBE_VERTICES_LOCAL.map((vertex) => {
              const p = projectVertex(vertex);
              return { x: p[0], y: p[1], z: p[2] };
            });
            return {
              kind: 'mesh',
              vertices,
              faces: CUBE_FACES.map((indices) => ({ indices: [...indices] })),
              edges: CUBE_EDGES.map(([from, to]) => ({
                points: [
                  { x: vertices[from].x, y: vertices[from].y, z: vertices[from].z },
                  { x: vertices[to].x, y: vertices[to].y, z: vertices[to].z }
                ]
              }))
            };
          }
        });

        const scheduleGeometryUpdate = () => {
          if (frameId !== null) return;
          frameId = requestAnimationFrame(() => {
            frameId = null;
            applyGeometry();
          });
        };

        let startPointer: { x: number; y: number } | null = null;
        let startCenter: Point3D | null = null;
        let startRotation: { x: number; y: number } | null = null;
        let lastPointer: { x: number; y: number } | null = null;
        let isRotating = false;
        let shortcutPressed = false;

        const stopInteraction = () => {
          if (activeWireframeCubeInteractionId === api.id) {
            activeWireframeCubeInteractionId = null;
          }
          cleanupInteractionListeners();
          cleanupInteractionListeners = () => undefined;

          if (frameId !== null) {
            cancelAnimationFrame(frameId);
            frameId = null;
          }

          applyGeometry();
          startPointer = null;
          startCenter = null;
          startRotation = null;
          lastPointer = null;
          isRotating = false;
        };

        const handleInteractionMove = (event: PointerEvent | MouseEvent | TouchEvent) => {
          if (activeWireframeCubeInteractionId !== api.id) return;
          event.preventDefault?.();

          if (isRotating) {
            const pointer = getPointerLikeArg([event]);
            if (!pointer || typeof pointer.clientX !== 'number' || typeof pointer.clientY !== 'number' || !lastPointer || !startRotation) {
              return;
            }

            const dx = pointer.clientX - lastPointer.x;
            const dy = pointer.clientY - lastPointer.y;
            lastPointer = { x: pointer.clientX, y: pointer.clientY };

            // 反向匹配最初的拖拽手感（向右拖使立方体朝左转、向上拖使顶部远离）
            transform.rotationY -= dx * ROTATION_SPEED;
            transform.rotationX -= dy * ROTATION_SPEED;
            scheduleGeometryUpdate();
            return;
          }

          const pointer = getPointerLikeArg([event]);
          if (!pointer || typeof pointer.clientX !== 'number' || typeof pointer.clientY !== 'number' || !startPointer || !startCenter) {
            return;
          }

          const delta = getScreenDeltaToWorldDelta(
            api,
            pointer.clientX - startPointer.x,
            pointer.clientY - startPointer.y
          );
          if (!delta) return;

          transform.center = [
            startCenter[0] + delta[0],
            startCenter[1] + delta[1],
            startCenter[2]
          ];
          scheduleGeometryUpdate();
        };

        const startInteraction = (...args: any[]) => {
          if (activeWireframeCubeInteractionId && activeWireframeCubeInteractionId !== api.id) return;
          activeWireframeCubeInteractionId = api.id;

          const pointer = getPointerLikeArg(args);
          Promise.resolve().then(() => api.select());

          startPointer = pointer && typeof pointer.clientX === 'number' && typeof pointer.clientY === 'number'
            ? { x: pointer.clientX, y: pointer.clientY }
            : null;
          startCenter = [...transform.center];
          startRotation = { x: transform.rotationX, y: transform.rotationY };
          lastPointer = pointer && typeof pointer.clientX === 'number' && typeof pointer.clientY === 'number'
            ? { x: pointer.clientX, y: pointer.clientY }
            : null;
          isRotating = !(shortcutPressed || Boolean(pointer?.shiftKey));

          cleanupInteractionListeners();

          if (typeof window === 'undefined') return;
          const browserWindow: Window = window;

          if ('PointerEvent' in browserWindow) {
            const move = (event: PointerEvent) => handleInteractionMove(event);
            const end = () => stopInteraction();
            browserWindow.addEventListener('pointermove', move, { passive: false });
            browserWindow.addEventListener('pointerup', end, { passive: true });
            browserWindow.addEventListener('pointercancel', end, { passive: true });
            cleanupInteractionListeners = () => {
              browserWindow.removeEventListener('pointermove', move);
              browserWindow.removeEventListener('pointerup', end);
              browserWindow.removeEventListener('pointercancel', end);
            };
            return;
          }

          const mouseMove = (event: MouseEvent) => handleInteractionMove(event);
          const touchMove = (event: TouchEvent) => handleInteractionMove(event);
          const end = () => stopInteraction();
          browserWindow.addEventListener('mousemove', mouseMove, { passive: false });
          browserWindow.addEventListener('mouseup', end, { passive: true });
          browserWindow.addEventListener('touchmove', touchMove, { passive: false });
          browserWindow.addEventListener('touchend', end, { passive: true });
          browserWindow.addEventListener('touchcancel', end, { passive: true });
          cleanupInteractionListeners = () => {
            browserWindow.removeEventListener('mousemove', mouseMove);
            browserWindow.removeEventListener('mouseup', end);
            browserWindow.removeEventListener('touchmove', touchMove);
            browserWindow.removeEventListener('touchend', end);
            browserWindow.removeEventListener('touchcancel', end);
          };
        };

        const onKeyDown = (event: KeyboardEvent) => {
          if (event.key === TRANSLATE_SHORTCUT_KEY) shortcutPressed = true;
        };

        const onKeyUp = (event: KeyboardEvent) => {
          if (event.key === TRANSLATE_SHORTCUT_KEY) shortcutPressed = false;
        };

        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
        cleanupKeyListeners = () => {
          window.removeEventListener('keydown', onKeyDown);
          window.removeEventListener('keyup', onKeyUp);
        };

        const group = api.createGroup({ ...edgeObjects, ...faceObjects }, { createNativeGroup: false });
        group.forEach((member) => {
          const node = group.getRenderNode(member.key);
          if (node?.tagName.toLowerCase() === 'polygon') {
            node.setAttribute('pointer-events', 'all');
          }
        });

        applyGeometry();

        if (typeof window !== 'undefined' && 'PointerEvent' in window) {
          cleanupHitListeners = group.bindNativeEvent('pointerdown', (_member, event) => {
            startInteraction(event as PointerEvent);
          }, {
            preventDefault: true,
            stopPropagation: true,
            passive: false
          });
        } else {
          const removeMouseDown = group.bindNativeEvent('mousedown', (_member, event) => {
            startInteraction(event as MouseEvent);
          }, {
            preventDefault: true,
            stopPropagation: true
          });

          const removeTouchStart = group.bindNativeEvent('touchstart', (_member, event) => {
            startInteraction(event as TouchEvent);
          }, {
            preventDefault: true,
            stopPropagation: true,
            passive: false
          });

          cleanupHitListeners = () => {
            removeMouseDown();
            removeTouchStart();
          };
        }

        return;
      },
      onDestroy() {
        if (activeWireframeCubeInteractionId === instanceId) {
          activeWireframeCubeInteractionId = null;
        }
        hiddenLineHandle?.dispose();
        cleanupInteractionListeners();
        if (frameId !== null) {
          cancelAnimationFrame(frameId);
          frameId = null;
        }
        cleanupHitListeners();
        cleanupKeyListeners();
      }
    };
  }
});
