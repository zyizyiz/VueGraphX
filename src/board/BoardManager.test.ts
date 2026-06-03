import JXG from 'jsxgraph';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  BoardManager,
  buildAdaptiveView3DRect,
  classifyWheelGesture,
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
        pinch: true
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
  it('activates the bridge only when two-finger pan is requested', () => {
    expect(shouldUseTrackpadGestureBridge({
      pan: { enabled: true, needTwoFingers: true }
    })).toBe(true);

    expect(shouldUseTrackpadGestureBridge({
      pan: { enabled: true, needTwoFingers: false }
    })).toBe(false);
  });

  it('classifies pinch-like wheel events as zoom and pixel scrolling as pan', () => {
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
});
