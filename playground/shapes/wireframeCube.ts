import { createComposedShapeDefinition, type GraphShapeApi } from 'vuegraphx';

interface WireframeCubeState {
  size: number;
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

const getInteractiveRenderNode = (object: any): Element | null => {
  const node = object?.element2D?.rendNode ?? object?.rendNode ?? null;
  return node instanceof Element ? node : null;
};

const bindNativeStartListeners = (
  objects: any[],
  onStart: (event: PointerEvent | MouseEvent | TouchEvent) => void
): { count: number; cleanup: () => void } => {
  const disposers: Array<() => void> = [];
  let count = 0;

  objects.forEach((object) => {
    const node = getInteractiveRenderNode(object);
    if (!node || typeof node.addEventListener !== 'function') return;

    count += 1;

    if (node.tagName.toLowerCase() === 'polygon') {
      node.setAttribute('pointer-events', 'all');
    }

    const handleStart = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
      onStart(event as PointerEvent | MouseEvent | TouchEvent);
    };

    if (typeof window !== 'undefined' && 'PointerEvent' in window) {
      node.addEventListener('pointerdown', handleStart as EventListener, { passive: false });
      disposers.push(() => node.removeEventListener('pointerdown', handleStart as EventListener));
      return;
    }

    node.addEventListener('mousedown', handleStart as EventListener);
    node.addEventListener('touchstart', handleStart as EventListener, { passive: false });
    disposers.push(() => node.removeEventListener('mousedown', handleStart as EventListener));
    disposers.push(() => node.removeEventListener('touchstart', handleStart as EventListener));
  });

  return {
    count,
    cleanup: () => {
      disposers.forEach((dispose) => dispose());
    }
  };
};

export const wireframeCubeShapeDefinition = createComposedShapeDefinition<void, WireframeCubeState>({
  type: 'wireframe-cube',
  supportedModes: 'all',
  create() {
    let cleanupKeyListeners = () => undefined;
    let cleanupInteractionListeners = () => undefined;
    let cleanupHitListeners = () => undefined;
    let frameId: number | null = null;
    const spawnCenter = getWireframeCubeSpawnCenter(wireframeCubeSpawnIndex++);
    let instanceId: string | null = null;

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

            transform.rotationY += dx * ROTATION_SPEED;
            transform.rotationX += dy * ROTATION_SPEED;
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

        applyGeometry();

        const interactiveObjects = [...Object.values(edgeObjects), ...Object.values(faceObjects)];
        const nativeHitBindings = bindNativeStartListeners(interactiveObjects, (event) => {
          startInteraction(event);
        });

        cleanupHitListeners = nativeHitBindings.cleanup;

        if (nativeHitBindings.count === 0) {
          const group = api.createGroup({ ...edgeObjects, ...faceObjects }, { createNativeGroup: false });
          cleanupHitListeners = group.onHit((_member, ...args) => {
            startInteraction(...args);
          }, {
            eventName: 'down'
          });
        }

        return;
      },
      onDestroy() {
        if (activeWireframeCubeInteractionId === instanceId) {
          activeWireframeCubeInteractionId = null;
        }
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
