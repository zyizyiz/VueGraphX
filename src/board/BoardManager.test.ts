import JXG from 'jsxgraph';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BoardManager,
  buildAdaptiveView3DRect,
  classifyTwoFingerTouchGesture,
  classifyWheelGesture,
  createTwoFingerTouchFrame,
  shouldUseTrackpadGestureBridge
} from './BoardManager';

describe('buildAdaptiveView3DRect', () => {
  it('fills the current board bbox and scales x/y world spans with aspect ratio', () => {
    const rect = buildAdaptiveView3DRect(
      [-12, 8, 12, -8],
      [[-8, -8], [16, 16], [[-5, 5], [-5, 5], [-5, 5]]]
    );

    expect(rect[0]).toEqual([-12, -8]);
    expect(rect[1]).toEqual([24, 16]);
    expect(rect[2][0]).toEqual([-7.5, 7.5]);
    expect(rect[2][1]).toEqual([-5, 5]);
    expect(rect[2][2]).toEqual([-5, 5]);
  });

  it('scales y span when the board becomes taller', () => {
    const rect = buildAdaptiveView3DRect(
      [-8, 12, 8, -12],
      [[-8, -8], [16, 16], [[-5, 5], [-5, 5], [-5, 5]]]
    );

    expect(rect[0]).toEqual([-8, -12]);
    expect(rect[1]).toEqual([16, 24]);
    expect(rect[2][0]).toEqual([-5, 5]);
    expect(rect[2][1]).toEqual([-7.5, 7.5]);
  });
});

describe('BoardManager.initBoard interaction options', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('forwards public pan and zoom options to JSXGraph', () => {
    document.body.innerHTML = '<div id="box"></div>';

    const fakeBoard = {
      containerObj: document.getElementById('box'),
      on: vi.fn(),
      getBoundingBox: vi.fn(),
      update: vi.fn(),
      renderer: { dashArray: [[2, 2], [5, 5], [10, 10]] }
    } as any;

    const initBoardSpy = vi.spyOn(JXG.JSXGraph, 'initBoard').mockReturnValue(fakeBoard);
    vi.spyOn(JXG.JSXGraph, 'freeBoard').mockImplementation(() => undefined as any);

    const manager = new BoardManager('box', {
      pan: {
        enabled: true,
        needShift: false,
        needTwoFingers: false
      },
      zoom: {
        enabled: true,
        wheel: true,
        needShift: false,
        pinch: true,
        center: 'board',
        min: 0.5,
        max: 4
      }
    });

    manager.initBoard();

    expect(initBoardSpy).toHaveBeenCalledWith('box', expect.objectContaining({
      pan: {
        enabled: true,
        needShift: false,
        needTwoFingers: false
      },
      zoom: {
        enabled: true,
        wheel: true,
        needShift: false,
        pinch: true,
        center: 'board',
        min: 0.5,
        max: 4
      }
    }));
    expect(fakeBoard.renderer.dashArray[1]).toEqual([4, 8]);
  });

  it('disables JSXGraph wheel zoom when two-finger pan bridge is enabled', () => {
    document.body.innerHTML = '<div id="box"></div>';

    const fakeBoard = {
      containerObj: document.getElementById('box'),
      on: vi.fn(),
      getBoundingBox: vi.fn(),
      update: vi.fn()
    } as any;

    const initBoardSpy = vi.spyOn(JXG.JSXGraph, 'initBoard').mockReturnValue(fakeBoard);
    vi.spyOn(JXG.JSXGraph, 'freeBoard').mockImplementation(() => undefined as any);

    const manager = new BoardManager('box', {
      pan: {
        enabled: true,
        needTwoFingers: true
      },
      zoom: {
        enabled: true,
        wheel: true,
        pinch: true
      }
    });

    manager.initBoard();

    expect(initBoardSpy).toHaveBeenCalledWith('box', expect.objectContaining({
      zoom: expect.objectContaining({
        enabled: true,
        wheel: false,
        pinch: false
      })
    }));
  });

  it('uses a 30px grid-aligned bounding box and CSS grid when requested', () => {
    document.body.innerHTML = '<div id="box"></div>';
    const container = document.getElementById('box') as HTMLElement;
    Object.defineProperty(container, 'clientWidth', { value: 600, configurable: true });
    Object.defineProperty(container, 'clientHeight', { value: 420, configurable: true });

    const fakeBoard = {
      containerObj: container,
      on: vi.fn(),
      getBoundingBox: vi.fn(),
      update: vi.fn()
    } as any;

    const initBoardSpy = vi.spyOn(JXG.JSXGraph, 'initBoard').mockImplementation((_id, options: any) => {
      fakeBoard.getBoundingBox.mockReturnValue(options.boundingbox);
      return fakeBoard;
    });
    vi.spyOn(JXG.JSXGraph, 'freeBoard').mockImplementation(() => undefined as any);

    const manager = new BoardManager('box', { axis: false, grid: true });

    manager.initBoard();

    expect(initBoardSpy).toHaveBeenCalledWith('box', expect.objectContaining({
      boundingbox: [-10, 7, 10, -7],
      axis: false
    }));
    expect(initBoardSpy.mock.calls[0]?.[1]).not.toHaveProperty('grid');
    expect(container.classList.contains('vuegraphx-grid-enabled')).toBe(true);
    expect(container.style.getPropertyValue('--vuegraphx-grid-size-x')).toBe('30px');
    expect(container.style.getPropertyValue('--vuegraphx-grid-size-y')).toBe('30px');
  });

  it('keeps library zoom disabled by default', () => {
    document.body.innerHTML = '<div id="box"></div>';

    const fakeBoard = {
      on: vi.fn(),
      getBoundingBox: vi.fn(),
      update: vi.fn()
    } as any;

    const initBoardSpy = vi.spyOn(JXG.JSXGraph, 'initBoard').mockReturnValue(fakeBoard);
    vi.spyOn(JXG.JSXGraph, 'freeBoard').mockImplementation(() => undefined as any);

    const manager = new BoardManager('box');

    manager.initBoard();

    expect(initBoardSpy).toHaveBeenCalledWith('box', expect.objectContaining({
      zoom: {
        enabled: false
      }
    }));
  });
});

describe('trackpad gesture bridge helpers', () => {
  beforeEach(() => {
    Reflect.deleteProperty(window, 'PointerEvent');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
    Reflect.deleteProperty(window, 'PointerEvent');
  });

  const enablePointerEventSupport = () => {
    Object.defineProperty(window, 'PointerEvent', {
      configurable: true,
      value: class PointerEventMock extends Event {}
    });
  };

  it('activates the bridge only when two-finger pan is requested', () => {
    expect(shouldUseTrackpadGestureBridge({
      pan: { enabled: true, needTwoFingers: true }
    })).toBe(true);

    expect(shouldUseTrackpadGestureBridge({
      pan: { enabled: true, needTwoFingers: false }
    })).toBe(false);
  });

  it('classifies unmodified pixel-mode wheel events as pan when two-finger pan is requested', () => {
    const options = {
      pan: { enabled: true, needTwoFingers: true },
      zoom: { enabled: true, wheel: true }
    };

    expect(classifyWheelGesture({
      ctrlKey: true,
      metaKey: false,
      deltaMode: 0
    }, options)).toBe('zoom');

    expect(classifyWheelGesture({
      ctrlKey: false,
      metaKey: false,
      deltaMode: 0
    }, options)).toBe('pan');

    expect(classifyWheelGesture({
      ctrlKey: false,
      metaKey: false,
      deltaMode: 1
    }, options)).toBe('zoom');
  });

  it('keeps modifier-wheel zoom outside two-finger pan mode', () => {
    expect(classifyWheelGesture({
      ctrlKey: true,
      metaKey: false,
      deltaMode: 0
    }, {
      pan: { enabled: true, needTwoFingers: false },
      zoom: { enabled: true, wheel: true }
    })).toBe('zoom');
  });

  it('classifies same-direction two-finger movement as pan instead of zoom', () => {
    const previous = createTwoFingerTouchFrame(
      { x: 100, y: 100 },
      { x: 160, y: 100 }
    );
    const current = createTwoFingerTouchFrame(
      { x: 100, y: 124 },
      { x: 160, y: 124 }
    );

    expect(classifyTwoFingerTouchGesture(previous, current)).toBe('pan');
  });

  it('classifies vertical two-finger movement with unchanged distance as pan', () => {
    const previous = createTwoFingerTouchFrame(
      { x: 100, y: 100 },
      { x: 100, y: 160 }
    );
    const current = createTwoFingerTouchFrame(
      { x: 100, y: 124 },
      { x: 100, y: 184 }
    );

    expect(classifyTwoFingerTouchGesture(previous, current)).toBe('pan');
  });

  it('classifies meaningful two-finger distance changes as zoom', () => {
    const previous = createTwoFingerTouchFrame(
      { x: 100, y: 100 },
      { x: 160, y: 100 }
    );
    const current = createTwoFingerTouchFrame(
      { x: 90, y: 100 },
      { x: 170, y: 100 }
    );

    expect(classifyTwoFingerTouchGesture(previous, current)).toBe('zoom');
  });

  it('routes two-finger touch movement through board pan', () => {
    document.body.innerHTML = '<div id="box"></div>';
    const container = document.getElementById('box') as HTMLElement;
    const addEventListenerSpy = vi.spyOn(container, 'addEventListener');
    const fakeBoard = {
      containerObj: container,
      on: vi.fn(),
      getBoundingBox: vi.fn(),
      update: vi.fn(),
      moveOrigin: vi.fn((x: number, y: number) => {
        fakeBoard.origin.scrCoords[1] = x;
        fakeBoard.origin.scrCoords[2] = y;
      }),
      origin: { scrCoords: [1, 300, 200] }
    } as any;

    vi.spyOn(JXG.JSXGraph, 'initBoard').mockReturnValue(fakeBoard);
    vi.spyOn(JXG.JSXGraph, 'freeBoard').mockImplementation(() => undefined as any);

    const manager = new BoardManager('box', {
      pan: { enabled: true, needTwoFingers: true },
      zoom: { enabled: true, pinch: true }
    });
    manager.initBoard();

    const touchStart = addEventListenerSpy.mock.calls.find(([type]) => type === 'touchstart')?.[1] as EventListener;
    const touchMove = addEventListenerSpy.mock.calls.find(([type]) => type === 'touchmove')?.[1] as EventListener;
    const touchStartOptions = addEventListenerSpy.mock.calls.find(([type]) => type === 'touchstart')?.[2];
    const startPreventDefault = vi.fn();
    const movePreventDefault = vi.fn();
    const startStopImmediatePropagation = vi.fn();
    const moveStopImmediatePropagation = vi.fn();

    touchStart({
      touches: [
        { identifier: 1, clientX: 100, clientY: 100 },
        { identifier: 2, clientX: 160, clientY: 100 }
      ],
      preventDefault: startPreventDefault,
      stopImmediatePropagation: startStopImmediatePropagation
    } as unknown as TouchEvent);
    touchMove({
      touches: [
        { identifier: 1, clientX: 100, clientY: 124 },
        { identifier: 2, clientX: 160, clientY: 124 }
      ],
      preventDefault: movePreventDefault,
      stopImmediatePropagation: moveStopImmediatePropagation
    } as unknown as TouchEvent);

    expect(touchStartOptions).toMatchObject({ capture: true, passive: false });
    expect(startPreventDefault).toHaveBeenCalled();
    expect(startStopImmediatePropagation).toHaveBeenCalled();
    expect(movePreventDefault).toHaveBeenCalled();
    expect(moveStopImmediatePropagation).toHaveBeenCalled();
    expect(fakeBoard.moveOrigin).toHaveBeenCalledWith(300, 224);
  });

  it('waits for both changed touches before classifying stable-distance pan', () => {
    document.body.innerHTML = '<div id="box"></div>';
    const container = document.getElementById('box') as HTMLElement;
    const addEventListenerSpy = vi.spyOn(container, 'addEventListener');
    const fakeBoard = {
      containerObj: container,
      on: vi.fn(),
      getBoundingBox: vi.fn(),
      update: vi.fn(),
      moveOrigin: vi.fn((x: number, y: number) => {
        fakeBoard.origin.scrCoords[1] = x;
        fakeBoard.origin.scrCoords[2] = y;
      }),
      zoomIn: vi.fn(),
      zoomOut: vi.fn(),
      origin: { scrCoords: [1, 300, 200] }
    } as any;

    vi.spyOn(JXG.JSXGraph, 'initBoard').mockReturnValue(fakeBoard);
    vi.spyOn(JXG.JSXGraph, 'freeBoard').mockImplementation(() => undefined as any);

    const manager = new BoardManager('box', {
      pan: { enabled: true, needTwoFingers: true },
      zoom: { enabled: true, pinch: true }
    });
    manager.initBoard();

    const touchStart = addEventListenerSpy.mock.calls.find(([type]) => type === 'touchstart')?.[1] as EventListener;
    const touchMove = addEventListenerSpy.mock.calls.find(([type]) => type === 'touchmove')?.[1] as EventListener;

    touchStart({
      touches: [
        { identifier: 1, clientX: 100, clientY: 100 },
        { identifier: 2, clientX: 100, clientY: 160 }
      ],
      preventDefault: vi.fn(),
      stopImmediatePropagation: vi.fn()
    } as unknown as TouchEvent);
    touchMove({
      touches: [
        { identifier: 1, clientX: 100, clientY: 124 },
        { identifier: 2, clientX: 100, clientY: 160 }
      ],
      changedTouches: [
        { identifier: 1, clientX: 100, clientY: 124 }
      ],
      preventDefault: vi.fn(),
      stopImmediatePropagation: vi.fn()
    } as unknown as TouchEvent);
    touchMove({
      touches: [
        { identifier: 1, clientX: 100, clientY: 124 },
        { identifier: 2, clientX: 100, clientY: 184 }
      ],
      changedTouches: [
        { identifier: 2, clientX: 100, clientY: 184 }
      ],
      preventDefault: vi.fn(),
      stopImmediatePropagation: vi.fn()
    } as unknown as TouchEvent);

    expect(fakeBoard.moveOrigin).toHaveBeenCalledWith(300, 224);
    expect(fakeBoard.zoomIn).not.toHaveBeenCalled();
    expect(fakeBoard.zoomOut).not.toHaveBeenCalled();
  });

  it('consumes unchanged two-finger touch movement before native pinch handling', () => {
    document.body.innerHTML = '<div id="box"></div>';
    const container = document.getElementById('box') as HTMLElement;
    const addEventListenerSpy = vi.spyOn(container, 'addEventListener');
    const fakeBoard = {
      containerObj: container,
      on: vi.fn(),
      getBoundingBox: vi.fn(),
      update: vi.fn(),
      moveOrigin: vi.fn(),
      zoomIn: vi.fn(),
      zoomOut: vi.fn(),
      origin: { scrCoords: [1, 300, 200] }
    } as any;

    vi.spyOn(JXG.JSXGraph, 'initBoard').mockReturnValue(fakeBoard);
    vi.spyOn(JXG.JSXGraph, 'freeBoard').mockImplementation(() => undefined as any);

    const manager = new BoardManager('box', {
      pan: { enabled: true, needTwoFingers: true },
      zoom: { enabled: true, pinch: true }
    });
    manager.initBoard();

    const touchStart = addEventListenerSpy.mock.calls.find(([type]) => type === 'touchstart')?.[1] as EventListener;
    const touchMove = addEventListenerSpy.mock.calls.find(([type]) => type === 'touchmove')?.[1] as EventListener;
    const preventDefault = vi.fn();
    const stopImmediatePropagation = vi.fn();

    touchStart({
      touches: [
        { identifier: 1, clientX: 100, clientY: 100 },
        { identifier: 2, clientX: 160, clientY: 100 }
      ],
      preventDefault: vi.fn(),
      stopImmediatePropagation: vi.fn()
    } as unknown as TouchEvent);
    touchMove({
      touches: [
        { identifier: 1, clientX: 100.2, clientY: 100.2 },
        { identifier: 2, clientX: 160.2, clientY: 100.2 }
      ],
      changedTouches: [
        { identifier: 1, clientX: 100.2, clientY: 100.2 },
        { identifier: 2, clientX: 160.2, clientY: 100.2 }
      ],
      preventDefault,
      stopImmediatePropagation
    } as unknown as TouchEvent);

    expect(preventDefault).toHaveBeenCalled();
    expect(stopImmediatePropagation).toHaveBeenCalled();
    expect(fakeBoard.moveOrigin).not.toHaveBeenCalled();
    expect(fakeBoard.zoomIn).not.toHaveBeenCalled();
    expect(fakeBoard.zoomOut).not.toHaveBeenCalled();
  });

  it('keeps a two-finger pan locked even if later frames change distance', () => {
    document.body.innerHTML = '<div id="box"></div>';
    const container = document.getElementById('box') as HTMLElement;
    const addEventListenerSpy = vi.spyOn(container, 'addEventListener');
    const fakeBoard = {
      containerObj: container,
      on: vi.fn(),
      getBoundingBox: vi.fn(),
      update: vi.fn(),
      moveOrigin: vi.fn((x: number, y: number) => {
        fakeBoard.origin.scrCoords[1] = x;
        fakeBoard.origin.scrCoords[2] = y;
      }),
      zoomIn: vi.fn(),
      zoomOut: vi.fn(),
      origin: { scrCoords: [1, 300, 200] }
    } as any;

    vi.spyOn(JXG.JSXGraph, 'initBoard').mockReturnValue(fakeBoard);
    vi.spyOn(JXG.JSXGraph, 'freeBoard').mockImplementation(() => undefined as any);

    const manager = new BoardManager('box', {
      pan: { enabled: true, needTwoFingers: true },
      zoom: { enabled: true, pinch: true }
    });
    manager.initBoard();

    const touchStart = addEventListenerSpy.mock.calls.find(([type]) => type === 'touchstart')?.[1] as EventListener;
    const touchMove = addEventListenerSpy.mock.calls.find(([type]) => type === 'touchmove')?.[1] as EventListener;

    touchStart({
      touches: [
        { identifier: 1, clientX: 100, clientY: 100 },
        { identifier: 2, clientX: 160, clientY: 100 }
      ],
      preventDefault: vi.fn(),
      stopImmediatePropagation: vi.fn()
    } as unknown as TouchEvent);
    touchMove({
      touches: [
        { identifier: 1, clientX: 100, clientY: 124 },
        { identifier: 2, clientX: 160, clientY: 124 }
      ],
      changedTouches: [
        { identifier: 1, clientX: 100, clientY: 124 },
        { identifier: 2, clientX: 160, clientY: 124 }
      ],
      preventDefault: vi.fn(),
      stopImmediatePropagation: vi.fn()
    } as unknown as TouchEvent);
    touchMove({
      touches: [
        { identifier: 1, clientX: 90, clientY: 140 },
        { identifier: 2, clientX: 170, clientY: 140 }
      ],
      changedTouches: [
        { identifier: 1, clientX: 90, clientY: 140 },
        { identifier: 2, clientX: 170, clientY: 140 }
      ],
      preventDefault: vi.fn(),
      stopImmediatePropagation: vi.fn()
    } as unknown as TouchEvent);

    expect(fakeBoard.moveOrigin).toHaveBeenLastCalledWith(300, 240);
    expect(fakeBoard.zoomIn).not.toHaveBeenCalled();
    expect(fakeBoard.zoomOut).not.toHaveBeenCalled();
  });

  it('routes pixel modifier-wheel movement through zoom in two-finger mode', () => {
    document.body.innerHTML = '<div id="box"></div>';
    const container = document.getElementById('box') as HTMLElement;
    const addEventListenerSpy = vi.spyOn(container, 'addEventListener');
    const fakeBoard = {
      containerObj: container,
      on: vi.fn(),
      getBoundingBox: vi.fn(),
      update: vi.fn(),
      moveOrigin: vi.fn((x: number, y: number) => {
        fakeBoard.origin.scrCoords[1] = x;
        fakeBoard.origin.scrCoords[2] = y;
      }),
      zoomIn: vi.fn(),
      zoomOut: vi.fn(),
      origin: { scrCoords: [1, 300, 200] }
    } as any;

    vi.spyOn(JXG.JSXGraph, 'initBoard').mockReturnValue(fakeBoard);
    vi.spyOn(JXG.JSXGraph, 'freeBoard').mockImplementation(() => undefined as any);

    const manager = new BoardManager('box', {
      pan: { enabled: true, needTwoFingers: true },
      zoom: { enabled: true, wheel: true, pinch: true, center: 'board' }
    });
    manager.initBoard();

    const wheel = addEventListenerSpy.mock.calls.find(([type]) => type === 'wheel')?.[1] as EventListener;
    const preventDefault = vi.fn();
    const stopImmediatePropagation = vi.fn();

    wheel({
      ctrlKey: true,
      metaKey: false,
      deltaMode: 0,
      deltaX: 0,
      deltaY: 24,
      preventDefault,
      stopImmediatePropagation
    } as unknown as WheelEvent);

    expect(preventDefault).toHaveBeenCalled();
    expect(stopImmediatePropagation).toHaveBeenCalled();
    expect(fakeBoard.moveOrigin).not.toHaveBeenCalled();
    expect(fakeBoard.zoomIn).not.toHaveBeenCalled();
    expect(fakeBoard.zoomOut).toHaveBeenCalled();
  });

  it('routes two touch pointers through board pan before JSXGraph pointer zoom', () => {
    enablePointerEventSupport();
    document.body.innerHTML = '<div id="box"></div>';
    const container = document.getElementById('box') as HTMLElement;
    const addEventListenerSpy = vi.spyOn(container, 'addEventListener');
    const fakeBoard = {
      containerObj: container,
      on: vi.fn(),
      getBoundingBox: vi.fn(),
      update: vi.fn(),
      moveOrigin: vi.fn((x: number, y: number) => {
        fakeBoard.origin.scrCoords[1] = x;
        fakeBoard.origin.scrCoords[2] = y;
      }),
      zoomIn: vi.fn(),
      zoomOut: vi.fn(),
      origin: { scrCoords: [1, 300, 200] }
    } as any;

    vi.spyOn(JXG.JSXGraph, 'initBoard').mockReturnValue(fakeBoard);
    vi.spyOn(JXG.JSXGraph, 'freeBoard').mockImplementation(() => undefined as any);

    const manager = new BoardManager('box', {
      pan: { enabled: true, needTwoFingers: true },
      zoom: { enabled: true, wheel: true, pinch: true }
    });
    manager.initBoard();

    const pointerDown = addEventListenerSpy.mock.calls.find(([type]) => type === 'pointerdown')?.[1] as EventListener;
    const pointerMove = addEventListenerSpy.mock.calls.find(([type]) => type === 'pointermove')?.[1] as EventListener;
    const pointerDownOptions = addEventListenerSpy.mock.calls.find(([type]) => type === 'pointerdown')?.[2];
    const firstStopImmediatePropagation = vi.fn();
    const secondStopImmediatePropagation = vi.fn();
    const moveStopImmediatePropagation = vi.fn();

    pointerDown({
      pointerType: 'touch',
      pointerId: 1,
      clientX: 100,
      clientY: 100,
      preventDefault: vi.fn(),
      stopImmediatePropagation: firstStopImmediatePropagation
    } as unknown as PointerEvent);
    pointerDown({
      pointerType: 'touch',
      pointerId: 2,
      clientX: 160,
      clientY: 100,
      preventDefault: vi.fn(),
      stopImmediatePropagation: secondStopImmediatePropagation
    } as unknown as PointerEvent);
    pointerMove({
      pointerType: 'touch',
      pointerId: 1,
      clientX: 100,
      clientY: 124,
      preventDefault: vi.fn(),
      stopImmediatePropagation: moveStopImmediatePropagation
    } as unknown as PointerEvent);
    pointerMove({
      pointerType: 'touch',
      pointerId: 2,
      clientX: 160,
      clientY: 124,
      preventDefault: vi.fn(),
      stopImmediatePropagation: vi.fn()
    } as unknown as PointerEvent);

    expect(pointerDownOptions).toMatchObject({ capture: true, passive: false });
    expect(firstStopImmediatePropagation).not.toHaveBeenCalled();
    expect(secondStopImmediatePropagation).toHaveBeenCalled();
    expect(moveStopImmediatePropagation).toHaveBeenCalled();
    expect(fakeBoard.moveOrigin).toHaveBeenCalledWith(300, 224);
    expect(fakeBoard.zoomIn).not.toHaveBeenCalled();
    expect(fakeBoard.zoomOut).not.toHaveBeenCalled();
  });

  it('routes vertical touch pointers with stable distance through board pan', () => {
    enablePointerEventSupport();
    document.body.innerHTML = '<div id="box"></div>';
    const container = document.getElementById('box') as HTMLElement;
    const addEventListenerSpy = vi.spyOn(container, 'addEventListener');
    const fakeBoard = {
      containerObj: container,
      on: vi.fn(),
      getBoundingBox: vi.fn(),
      update: vi.fn(),
      moveOrigin: vi.fn((x: number, y: number) => {
        fakeBoard.origin.scrCoords[1] = x;
        fakeBoard.origin.scrCoords[2] = y;
      }),
      zoomIn: vi.fn(),
      zoomOut: vi.fn(),
      origin: { scrCoords: [1, 300, 200] }
    } as any;

    vi.spyOn(JXG.JSXGraph, 'initBoard').mockReturnValue(fakeBoard);
    vi.spyOn(JXG.JSXGraph, 'freeBoard').mockImplementation(() => undefined as any);

    const manager = new BoardManager('box', {
      pan: { enabled: true, needTwoFingers: true },
      zoom: { enabled: true, wheel: true, pinch: true }
    });
    manager.initBoard();

    const pointerDown = addEventListenerSpy.mock.calls.find(([type]) => type === 'pointerdown')?.[1] as EventListener;
    const pointerMove = addEventListenerSpy.mock.calls.find(([type]) => type === 'pointermove')?.[1] as EventListener;

    pointerDown({
      pointerType: 'touch',
      pointerId: 1,
      clientX: 100,
      clientY: 100,
      preventDefault: vi.fn(),
      stopImmediatePropagation: vi.fn()
    } as unknown as PointerEvent);
    pointerDown({
      pointerType: 'touch',
      pointerId: 2,
      clientX: 100,
      clientY: 160,
      preventDefault: vi.fn(),
      stopImmediatePropagation: vi.fn()
    } as unknown as PointerEvent);
    pointerMove({
      pointerType: 'touch',
      pointerId: 1,
      clientX: 100,
      clientY: 124,
      preventDefault: vi.fn(),
      stopImmediatePropagation: vi.fn()
    } as unknown as PointerEvent);
    pointerMove({
      pointerType: 'touch',
      pointerId: 2,
      clientX: 100,
      clientY: 184,
      preventDefault: vi.fn(),
      stopImmediatePropagation: vi.fn()
    } as unknown as PointerEvent);

    expect(fakeBoard.moveOrigin).toHaveBeenCalledWith(300, 224);
    expect(fakeBoard.zoomIn).not.toHaveBeenCalled();
    expect(fakeBoard.zoomOut).not.toHaveBeenCalled();
  });

  it('routes two-finger distance changes through pinch zoom', () => {
    document.body.innerHTML = '<div id="box"></div>';
    const container = document.getElementById('box') as HTMLElement;
    const addEventListenerSpy = vi.spyOn(container, 'addEventListener');
    const fakeBoard = {
      containerObj: container,
      on: vi.fn(),
      getBoundingBox: vi.fn(),
      update: vi.fn(),
      moveOrigin: vi.fn(),
      zoomIn: vi.fn(),
      zoomOut: vi.fn(),
      getMousePosition: vi.fn(() => [130, 100])
    } as any;

    vi.spyOn(JXG.JSXGraph, 'initBoard').mockReturnValue(fakeBoard);
    vi.spyOn(JXG.JSXGraph, 'freeBoard').mockImplementation(() => undefined as any);

    const manager = new BoardManager('box', {
      pan: { enabled: true, needTwoFingers: true },
      zoom: { enabled: true, pinch: true, center: 'board' }
    });
    manager.initBoard();

    const touchStart = addEventListenerSpy.mock.calls.find(([type]) => type === 'touchstart')?.[1] as EventListener;
    const touchMove = addEventListenerSpy.mock.calls.find(([type]) => type === 'touchmove')?.[1] as EventListener;

    touchStart({
      touches: [
        { identifier: 1, clientX: 100, clientY: 100 },
        { identifier: 2, clientX: 160, clientY: 100 }
      ],
      preventDefault: vi.fn(),
      stopImmediatePropagation: vi.fn()
    } as unknown as TouchEvent);
    touchMove({
      touches: [
        { identifier: 1, clientX: 90, clientY: 100 },
        { identifier: 2, clientX: 170, clientY: 100 }
      ],
      preventDefault: vi.fn(),
      stopImmediatePropagation: vi.fn()
    } as unknown as TouchEvent);

    expect(fakeBoard.zoomIn).toHaveBeenCalled();
    expect(fakeBoard.moveOrigin).not.toHaveBeenCalled();
  });
});
