import JXG from 'jsxgraph';
import { createComposedShapeDefinition, type GraphShapeApi, type GraphShapeComposition } from 'vuegraphx';
import type { ShapeCapabilityTarget } from 'vuegraphx';

interface HelperLine {
  id: string;
  p1: any;
  p2: any;
  line: any;
}

interface IntuitiveView {
  curve?: any;
  left?: any;
  sector?: any;
}

interface CutDraft {
  p1: any;
  p2: any;
  line: any;
  icon: any;
}

type ActiveToolType = 'none' | 'size' | 'assist' | 'crop' | 'color-stroke' | 'color-fill';

interface CircleVisualRefs {
  circle: any;
  center: any;
  radiusPoint?: any;
  radiusLine?: any;
  bbox?: any;
}

interface CircleState {
  isPiece: boolean;
  showFeature: boolean;
  showColorPanel: boolean;
  activeTool: ActiveToolType;
  selectedColor: string;
  isRadiusDragging: boolean;
  helpers: HelperLine[];
  marks: any[];
  markNameMap: Map<string, string>;
  nextLetterIndex: number;
  intuitive: IntuitiveView | null;
  cutDraft: CutDraft | null;
  cropCache: { p1: any } | null;
  assistCache: { p1: any } | null;
  radiusValue: number;
  toolbarStyle: Record<string, string>;
  sizeInputStyle: Record<string, string>;
  rafId: number | null;
  refs: CircleVisualRefs | null;
}

interface CirclePayload {
  x: number;
  y: number;
}

interface CirclePiecePayload {
  cx: number;
  cy: number;
  px1: number;
  py1: number;
  px2: number;
  py2: number;
  isReverse: boolean;
  colorStroke: string;
  colorFill: string;
}

const createBaseState = (isPiece: boolean): CircleState => ({
  isPiece,
  showFeature: false,
  showColorPanel: false,
  activeTool: 'none',
  selectedColor: '#0ea5e9',
  isRadiusDragging: false,
  helpers: [],
  marks: [],
  markNameMap: new Map(),
  nextLetterIndex: 0,
  intuitive: null,
  cutDraft: null,
  cropCache: null,
  assistCache: null,
  radiusValue: 2,
  toolbarStyle: { left: '50%', top: 'calc(100% - 5rem)' },
  sizeInputStyle: { left: '50%', top: '50%' },
  rafId: null,
  refs: null
});

const notifyFastChange = (api: GraphShapeApi<CircleState>) => {
  if (api.state.rafId !== null) cancelAnimationFrame(api.state.rafId);
  api.setState({
    rafId: requestAnimationFrame(() => {
      api.notifyChange();
      api.setState({ rafId: null });
    })
  });
};

const getRefs = (api: GraphShapeApi<CircleState>): CircleVisualRefs => {
  if (!api.state.refs) {
    throw new Error('Circle shape refs are not initialized');
  }
  return api.state.refs;
};

const applyColorIfNeeded = (api: GraphShapeApi<CircleState>, target: any, kind: 'stroke' | 'fill' | 'both') => {
  if (api.state.activeTool !== 'color-stroke' && api.state.activeTool !== 'color-fill') return false;

  let applied = false;
  if (api.state.activeTool === 'color-stroke' && (kind === 'stroke' || kind === 'both')) {
    target.setAttribute({ strokeColor: api.state.selectedColor });
    applied = true;
  }

  if (api.state.activeTool === 'color-fill' && (kind === 'fill' || kind === 'both')) {
    target.setAttribute({ fillColor: api.state.selectedColor, fillOpacity: 0.35 });
    applied = true;
  }

  if (applied) api.board?.update();
  return applied;
};

const closeIntuitive = (api: GraphShapeApi<CircleState>) => {
  if (!api.state.intuitive) return;
  if (api.state.intuitive.left) api.removeObjectSafe(api.state.intuitive.left);
  if (api.state.intuitive.sector) api.removeObjectSafe(api.state.intuitive.sector);
  if (api.state.intuitive.curve) api.removeObjectSafe(api.state.intuitive.curve);
  getRefs(api).circle.setAttribute({ visible: true });
  api.setState({ intuitive: null });
};

const updateToolbarPosition = (api: GraphShapeApi<CircleState>) => {
  if (!api.selected || !api.board || !api.state.refs) {
    if (api.state.toolbarStyle.top !== 'calc(100% - 5rem)') {
      api.setState({
        toolbarStyle: { left: '50%', top: 'calc(100% - 5rem)' }
      });
      notifyFastChange(api);
    }
    return;
  }

  const { center, radiusPoint } = getRefs(api);
  const centerX = center.X();
  const centerY = center.Y();
  const radius = radiusPoint ? center.Dist(radiusPoint) : 1;
  const bottomEdgeY = centerY - radius;
  const screenPoint = new JXG.Coords(JXG.COORDS_BY_USER, [centerX, bottomEdgeY], api.board);

  const boardWidth = api.board.canvasWidth || 1000;
  const boardHeight = api.board.canvasHeight || 700;
  const toolbarStyle = {
    left: `${Math.max(160, Math.min(boardWidth - 160, screenPoint.scrCoords[1]))}px`,
    top: `${Math.max(16, Math.min(boardHeight - 90, screenPoint.scrCoords[2] + 20))}px`
  };

  let sizeInputStyle = api.state.sizeInputStyle;
  if (api.state.activeTool === 'size' && radiusPoint) {
    const middleX = (center.X() + radiusPoint.X()) / 2;
    const middleY = (center.Y() + radiusPoint.Y()) / 2;
    const middlePoint = new JXG.Coords(JXG.COORDS_BY_USER, [middleX, middleY], api.board);
    sizeInputStyle = {
      left: `${middlePoint.scrCoords[1]}px`,
      top: `${middlePoint.scrCoords[2]}px`
    };
  }

  if (
    api.state.toolbarStyle.left === toolbarStyle.left &&
    api.state.toolbarStyle.top === toolbarStyle.top &&
    api.state.sizeInputStyle.left === sizeInputStyle.left &&
    api.state.sizeInputStyle.top === sizeInputStyle.top
  ) {
    return;
  }

  api.setState({ toolbarStyle, sizeInputStyle });
  notifyFastChange(api);
};

const attachInteractiveHandlers = (api: GraphShapeApi<CircleState>) => {
  const { circle, center, radiusPoint, radiusLine } = getRefs(api);

  circle.on('down', () => {
    if (!applyColorIfNeeded(api, circle, 'both')) {
      if (api.state.isPiece && radiusLine && applyColorIfNeeded(api, radiusLine, 'stroke')) return;
      Promise.resolve().then(() => api.select());
    }
  });

  if (radiusLine && api.state.isPiece) {
    radiusLine.on('down', () => {
      if (!applyColorIfNeeded(api, radiusLine, 'stroke')) {
        Promise.resolve().then(() => api.select());
      }
    });
  }

  center.on('down', () => {
    Promise.resolve().then(() => api.select());
  });

  if (radiusPoint) {
    radiusPoint.on('down', () => {
      Promise.resolve().then(() => api.select());
      api.setState({ isRadiusDragging: true });
    });

    radiusPoint.on('drag', () => {
      api.setState({ radiusValue: parseFloat(center.Dist(radiusPoint).toFixed(2)) });
      notifyFastChange(api);
    });

    radiusPoint.on('up', () => {
      api.setState({ radiusValue: center.Dist(radiusPoint) });
      notifyFastChange(api);
      setTimeout(() => api.setState({ isRadiusDragging: false }), 0);
    });
  }
};

const createCircleComposition = (payload: CirclePayload): GraphShapeComposition<CircleState> => ({
  entityType: 'circle',
  initialState: createBaseState(false),
  setup(api) {
    if (!api.board) return;

    const center = api.trackObject(api.board.create('point', [payload.x, payload.y], {
      visible: false,
      name: '',
      size: 2
    }));
    const radiusPoint = api.trackObject(api.board.create('point', [payload.x + 2, payload.y], {
      visible: false,
      name: '',
      size: 3,
      strokeColor: '#0ea5e9',
      fillColor: '#0ea5e9'
    }));
    const circle = api.trackObject(api.board.create('circle', [center, radiusPoint], {
      strokeColor: '#0ea5e9',
      fillColor: '#0ea5e9',
      fillOpacity: 0.12,
      strokeWidth: 2,
      highlight: false,
      hasInnerPoints: true
    }));
    const radiusLine = api.trackObject(api.board.create('segment', [center, radiusPoint], {
      visible: false,
      strokeColor: '#64748b',
      strokeWidth: 1.5
    }));

    const radius = () => center.Dist(radiusPoint);
    const centerX = () => center.X();
    const centerY = () => center.Y();
    const p1 = api.trackObject(api.board.create('point', [() => centerX() - radius(), () => centerY() + radius()], { visible: false }));
    const p2 = api.trackObject(api.board.create('point', [() => centerX() + radius(), () => centerY() + radius()], { visible: false }));
    const p3 = api.trackObject(api.board.create('point', [() => centerX() + radius(), () => centerY() - radius()], { visible: false }));
    const p4 = api.trackObject(api.board.create('point', [() => centerX() - radius(), () => centerY() - radius()], { visible: false }));
    const bbox = api.trackObject(api.board.create('polygon', [p1, p2, p3, p4], {
      fillOpacity: 0,
      borders: { strokeColor: '#0ea5e9', strokeWidth: 1, visible: false },
      vertices: { visible: false },
      hasInnerPoints: false
    }));

    api.setState({
      refs: { circle, center, radiusPoint, radiusLine, bbox },
      radiusValue: 2
    });
    attachInteractiveHandlers(api);
    updateToolbarPosition(api);
    api.board.update();
  },
  onSelectionChange(api, selected) {
    const refs = getRefs(api);
    if (!selected) {
      closeIntuitive(api);
      refs.radiusPoint?.setAttribute({ visible: false });
      refs.radiusLine?.setAttribute({ visible: false });
      refs.bbox?.borders.forEach((border: any) => border.setAttribute({ visible: false }));
      api.setState({ showFeature: false, showColorPanel: false, activeTool: 'none' });
      updateToolbarPosition(api);
      api.board?.update();
      return;
    }

    if (refs.radiusPoint) {
      api.setState({ radiusValue: parseFloat(refs.center.Dist(refs.radiusPoint).toFixed(2)) });
    }
    updateToolbarPosition(api);
    api.board?.update();
  },
  onBoardUpdate(api) {
    if (api.selected) updateToolbarPosition(api);
  },
  onBoardUp(api, event, isClickingObject) {
    if (!api.selected) return;
    const refs = getRefs(api);

    if (!isClickingObject) {
      api.deselect();
      return;
    }

    if (api.state.activeTool === 'size' && !api.state.isRadiusDragging) return;

    if (api.state.activeTool === 'assist') {
      const userCoords = api.getUsrCoordFromEvent(event);
      if (!userCoords) return;

      if (!api.state.assistCache) {
        api.setState({
          assistCache: {
            p1: api.trackObject(api.board.create('glider', [userCoords[0], userCoords[1], refs.circle], {
              name: '',
              size: 3,
              strokeColor: '#64748b',
              fillColor: '#ffffff',
              strokeWidth: 2
            }))
          }
        });
      } else {
        const p2 = api.trackObject(api.board.create('glider', [userCoords[0], userCoords[1], refs.circle], {
          name: '',
          size: 3,
          strokeColor: '#64748b',
          fillColor: '#ffffff',
          strokeWidth: 2
        }));
        const line = api.trackObject(api.board.create('line', [api.state.assistCache.p1, p2], {
          straightFirst: false,
          straightLast: false,
          dash: 2,
          strokeWidth: 2,
          strokeColor: '#64748b'
        }));

        const helper: HelperLine = { id: api.uid('assist'), p1: api.state.assistCache.p1, p2, line };
        line.on('down', () => {
          if (applyColorIfNeeded(api, helper.line, 'stroke')) return;
          Promise.resolve().then(() => {
            api.removeObjectSafe(helper.p1);
            api.removeObjectSafe(helper.p2);
            api.removeObjectSafe(helper.line);
            api.setState({ helpers: api.state.helpers.filter((item) => item.id !== helper.id) });
            api.board?.update();
          });
        });
        helper.p1.on('down', () => Promise.resolve().then(() => api.select()));
        helper.p2.on('down', () => Promise.resolve().then(() => api.select()));

        api.setState({
          helpers: [...api.state.helpers, helper],
          assistCache: null,
          activeTool: 'none'
        });
      }

      api.board?.update();
      api.notifyChange();
      return;
    }

    if (api.state.activeTool === 'crop') {
      const userCoords = api.getUsrCoordFromEvent(event);
      if (!userCoords) return;

      if (!api.state.cropCache) {
        api.setState({
          cropCache: {
            p1: api.trackObject(api.board.create('glider', [userCoords[0], userCoords[1], refs.circle], {
              name: '',
              size: 4,
              strokeColor: '#ef4444',
              fillColor: '#ffffff',
              strokeWidth: 2
            }))
          }
        });
      } else {
        const cropStart = api.state.cropCache.p1;
        const p2 = api.trackObject(api.board.create('glider', [userCoords[0], userCoords[1], refs.circle], {
          name: '',
          size: 4,
          strokeColor: '#ef4444',
          fillColor: '#ffffff',
          strokeWidth: 2
        }));
        const line = api.trackObject(api.board.create('line', [cropStart, p2], {
          straightFirst: false,
          straightLast: false,
          dash: 0,
          strokeWidth: 3,
          strokeColor: '#ef4444'
        }));
        const icon = api.trackObject(api.board.create('text', [
          () => (cropStart.X() + p2.X()) / 2,
          () => (cropStart.Y() + p2.Y()) / 2,
          'CUT'
        ], {
          anchorX: 'middle',
          anchorY: 'middle',
          fixed: true
        }));

        api.setState({
          cutDraft: { p1: cropStart, p2, line, icon },
          cropCache: null
        });
      }

      api.board?.update();
      api.notifyChange();
    }
  },
  onDestroy(api) {
    if (api.state.rafId !== null) cancelAnimationFrame(api.state.rafId);
  },
  getCapabilityTarget(api): ShapeCapabilityTarget | null {
    if (!api.selected) return null;
    const refs = getRefs(api);

    const setColorMode = (tool: Extract<ActiveToolType, 'color-stroke' | 'color-fill'>) => {
      if (!api.state.showColorPanel) {
        api.setState({ showColorPanel: true, activeTool: 'color-stroke' });
      }
      if (api.state.activeTool !== tool) api.setState({ activeTool: tool });
    };

    const applyColorImmediately = (color: string) => {
      api.setState({ selectedColor: color });
      if (api.state.activeTool === 'color-stroke') {
        refs.circle.setAttribute({ strokeColor: color });
        if (api.state.intuitive?.sector) api.state.intuitive.sector.setAttribute({ strokeColor: color });
        if (api.state.intuitive?.curve) api.state.intuitive.curve.setAttribute({ strokeColor: color });
      } else if (api.state.activeTool === 'color-fill') {
        refs.circle.setAttribute({ fillColor: color, fillOpacity: 0.35 });
        if (api.state.intuitive?.sector) api.state.intuitive.sector.setAttribute({ fillColor: color });
        if (api.state.intuitive?.curve) api.state.intuitive.curve.setAttribute({ fillColor: color });
      }
      api.board?.update();
    };

    const toggleSizeMode = () => {
      if (!refs.radiusPoint) return;
      const isSizeTool = api.state.activeTool !== 'size';
      if (isSizeTool && api.state.intuitive) closeIntuitive(api);

      refs.radiusPoint.setAttribute({ visible: isSizeTool });
      refs.radiusLine?.setAttribute({ visible: isSizeTool });
      refs.bbox?.borders.forEach((border: any) => border.setAttribute({ visible: isSizeTool }));
      if (isSizeTool) {
        api.setState({ radiusValue: parseFloat(refs.center.Dist(refs.radiusPoint).toFixed(2)) });
        notifyFastChange(api);
      }
      api.setState({ showColorPanel: false, activeTool: isSizeTool ? 'size' : 'none' });
      updateToolbarPosition(api);
      api.board?.update();
    };

    const applyRadiusInput = (value: number) => {
      if (!refs.radiusPoint || api.state.activeTool !== 'size') return;
      api.setState({ radiusValue: value });
      notifyFastChange(api);

      const centerX = refs.center.X();
      const centerY = refs.center.Y();
      const dx = refs.radiusPoint.X() - centerX;
      const dy = refs.radiusPoint.Y() - centerY;
      const length = Math.sqrt(dx * dx + dy * dy) || 1;
      const targetRadius = Math.max(0.2, Number(value) || 0.2);
      refs.radiusPoint.moveTo([centerX + (dx / length) * targetRadius, centerY + (dy / length) * targetRadius], 0);
      updateToolbarPosition(api);
      api.board?.update();
    };

    const startAssistMode = () => {
      const nextTool = api.state.activeTool === 'assist' ? 'none' : 'assist';
      api.setState({ activeTool: nextTool, showColorPanel: false });
      if (nextTool === 'assist' && api.state.intuitive) closeIntuitive(api);
      if (nextTool !== 'assist' && api.state.assistCache?.p1) {
        api.removeObjectSafe(api.state.assistCache.p1);
        api.setState({ assistCache: null });
      }
    };

    const toggleIntuitive = () => {
      if (api.state.activeTool === 'size') api.setState({ activeTool: 'none' });
      if (api.state.intuitive) {
        closeIntuitive(api);
        api.board?.update();
        api.notifyChange();
        return;
      }

      refs.circle.setAttribute({ visible: false });
      const centerX = () => refs.center.X();
      const centerY = () => refs.center.Y();
      const radius = () => (refs.radiusPoint ? refs.center.Dist(refs.radiusPoint) : 1);
      const curve = api.trackObject(api.board.create('curve', [
        (t: number) => centerX() + radius() * Math.cos(t) + (Math.sqrt(2) / 4) * radius() * Math.sin(t),
        (t: number) => centerY() + (Math.sqrt(2) / 4) * radius() * Math.sin(t),
        0,
        2 * Math.PI
      ], {
        fillColor: '#ef4444',
        fillOpacity: 0.2,
        strokeColor: '#ef4444',
        strokeWidth: 2,
        highlight: false,
        hasInnerPoints: true,
        fixed: false
      }));

      curve.on('down', () => {
        if (!applyColorIfNeeded(api, curve, 'both')) {
          Promise.resolve().then(() => api.select());
        }
      });
      api.setState({ intuitive: { curve } });
      api.board.update();
      api.notifyChange();
    };

    const toggleMarking = () => {
      if (!api.board) return;
      if (api.state.marks.length > 0) {
        api.state.marks.forEach((mark) => {
          if (mark === refs.center) {
            mark.setAttribute({ name: '', withLabel: false, visible: false });
          } else {
            api.removeObjectSafe(mark);
          }
        });
        api.setState({ marks: [] });
        api.board.update();
        return;
      }

      const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      refs.center.setAttribute({
        name: 'O',
        withLabel: true,
        visible: true,
        size: 2,
        strokeColor: '#0f172a',
        fillColor: '#0f172a'
      });
      const marks = [refs.center];
      const markNameMap = new Map(api.state.markNameMap);
      let nextLetterIndex = api.state.nextLetterIndex;

      api.state.helpers.forEach((helper) => {
        [0, 1].forEach((index) => {
          const key = `${helper.id}:${index}`;
          let label = markNameMap.get(key);
          if (!label) {
            label = alphabet[nextLetterIndex % alphabet.length];
            nextLetterIndex += 1;
            markNameMap.set(key, label);
          }
          const point = api.trackObject(api.board.create('intersection', [helper.line, refs.circle, index], {
            name: label,
            withLabel: true,
            size: 2,
            strokeColor: '#0f172a',
            fillColor: '#0f172a'
          }));
          marks.push(point);
        });
      });

      api.setState({ marks, markNameMap, nextLetterIndex });
      api.board.update();
    };

    const startCropMode = () => {
      const nextTool = api.state.activeTool === 'crop' ? 'none' : 'crop';
      api.setState({ showColorPanel: false, activeTool: nextTool });
      if (nextTool === 'crop' && api.state.intuitive) closeIntuitive(api);
      if (nextTool !== 'crop' && api.state.cropCache?.p1) {
        api.removeObjectSafe(api.state.cropCache.p1);
        api.setState({ cropCache: null });
      }
    };

    const cancelCut = () => {
      if (!api.state.cutDraft) return;
      api.removeObjectSafe(api.state.cutDraft.p1);
      api.removeObjectSafe(api.state.cutDraft.p2);
      api.removeObjectSafe(api.state.cutDraft.line);
      if (api.state.cutDraft.icon) {
        api.state.cutDraft.icon.setAttribute({ visible: false });
        api.removeObjectSafe(api.state.cutDraft.icon);
      }
      api.setState({ cutDraft: null, activeTool: 'none' });
      api.board?.update();
    };

    const confirmCut = () => {
      if (!api.state.cutDraft || api.state.isPiece) return;
      const cut = api.state.cutDraft;
      const centerX = refs.center.X();
      const centerY = refs.center.Y();
      const startX = cut.p1.X();
      const startY = cut.p1.Y();
      const endX = cut.p2.X();
      const endY = cut.p2.Y();
      const colorStroke = refs.circle.getAttribute('strokeColor');
      const colorFill = refs.circle.getAttribute('fillColor');

      api.removeObjectSafe(cut.p1);
      api.removeObjectSafe(cut.p2);
      api.removeObjectSafe(cut.line);
      if (cut.icon) {
        cut.icon.setAttribute({ visible: false });
        api.removeObjectSafe(cut.icon);
      }
      api.setState({ cutDraft: null });

      api.addShape(api.createShape(createCirclePieceComposition({
        cx: centerX - 0.5,
        cy: centerY - 0.5,
        px1: startX - 0.5,
        py1: startY - 0.5,
        px2: endX - 0.5,
        py2: endY - 0.5,
        isReverse: false,
        colorStroke,
        colorFill
      })));
      api.addShape(api.createShape(createCirclePieceComposition({
        cx: centerX + 0.5,
        cy: centerY + 0.5,
        px1: startX + 0.5,
        py1: startY + 0.5,
        px2: endX + 0.5,
        py2: endY + 0.5,
        isReverse: true,
        colorStroke,
        colorFill
      })));
      api.remove();
    };

    const target: ShapeCapabilityTarget = {
      entityType: api.entityType,
      entityId: api.id,
      entity: { id: api.id, isPiece: api.state.isPiece, intuitive: api.state.intuitive, cutDraft: api.state.cutDraft },
      ui: {
        toolbarStyle: { ...api.state.toolbarStyle },
        sizeInputStyle: { ...api.state.sizeInputStyle }
      },
      inspect: {
        active: api.state.showFeature,
        setActive: (active) => api.setState({ showFeature: active })
      },
      stylePanel: {
        active: api.state.showColorPanel,
        selectedColor: api.state.selectedColor,
        toggle: () => api.setState({ showColorPanel: !api.state.showColorPanel, activeTool: api.state.showColorPanel ? 'none' : 'color-stroke' })
      },
      strokeStyle: {
        active: api.state.activeTool === 'color-stroke',
        selectedColor: api.state.selectedColor,
        activate: () => setColorMode('color-stroke'),
        applyColor: applyColorImmediately
      },
      fillStyle: {
        active: api.state.activeTool === 'color-fill',
        selectedColor: api.state.selectedColor,
        activate: () => setColorMode('color-fill'),
        applyColor: applyColorImmediately
      },
      remove: () => api.remove()
    };

    if (!api.state.isPiece) {
      target.resize = {
        active: api.state.activeTool === 'size',
        value: api.state.radiusValue,
        min: 0.2,
        step: 0.1,
        toggle: toggleSizeMode,
        setValue: applyRadiusInput
      };
      target.auxiliaryLine = {
        active: api.state.activeTool === 'assist',
        toggle: startAssistMode
      };
      target.projection = {
        active: !!api.state.intuitive,
        toggle: toggleIntuitive
      };
      target.annotation = {
        active: api.state.marks.length > 0,
        toggle: toggleMarking
      };
      target.split = {
        active: api.state.activeTool === 'crop',
        hasDraft: !!api.state.cutDraft,
        canConfirm: !!api.state.cutDraft,
        toggle: startCropMode,
        cancel: cancelCut,
        confirm: confirmCut
      };
    }

    return target;
  }
});

const createCirclePieceComposition = (payload: CirclePiecePayload): GraphShapeComposition<CircleState> => ({
  entityType: 'circle-piece',
  initialState: createBaseState(true),
  setup(api) {
    if (!api.board) return;

    const center = api.trackObject(api.board.create('point', [payload.cx, payload.cy], { visible: false, name: '' }));
    const firstPoint = payload.isReverse
      ? api.trackObject(api.board.create('point', [payload.px2, payload.py2], { visible: false, name: '' }))
      : api.trackObject(api.board.create('point', [payload.px1, payload.py1], { visible: false, name: '' }));
    const secondPoint = payload.isReverse
      ? api.trackObject(api.board.create('point', [payload.px1, payload.py1], { visible: false, name: '' }))
      : api.trackObject(api.board.create('point', [payload.px2, payload.py2], { visible: false, name: '' }));
    const circle = api.trackObject(api.board.create('arc', [center, firstPoint, secondPoint], {
      strokeColor: payload.colorStroke,
      fillColor: payload.colorFill,
      fillOpacity: 0.35,
      strokeWidth: 2,
      highlight: false,
      hasInnerPoints: true,
      fixed: false
    }));
    const radiusLine = api.trackObject(api.board.create('segment', [firstPoint, secondPoint], {
      strokeColor: payload.colorStroke,
      strokeWidth: 2,
      highlight: false,
      fixed: false,
      layer: 9
    }));
    api.trackObject(api.board.create('group', [center, firstPoint, secondPoint, circle, radiusLine]));

    api.setState({ refs: { circle, center, radiusLine } });
    attachInteractiveHandlers(api);
    api.board.update();
  },
  onSelectionChange(api, selected) {
    if (!selected) {
      api.setState({ showFeature: false, showColorPanel: false, activeTool: 'none' });
      updateToolbarPosition(api);
    }
  },
  onBoardUpdate(api) {
    if (api.selected) updateToolbarPosition(api);
  },
  onDestroy(api) {
    if (api.state.rafId !== null) cancelAnimationFrame(api.state.rafId);
  },
  getCapabilityTarget(api) {
    if (!api.selected) return null;
    return createCircleComposition({ x: 0, y: 0 }).getCapabilityTarget(api);
  }
});

export const circleShapeDefinition = createComposedShapeDefinition<CirclePayload, CircleState>({
  type: 'circle',
  supportedModes: ['2d', 'geometry'],
  create(_context, payload) {
    if (!payload || !Number.isFinite(payload.x) || !Number.isFinite(payload.y)) return null;
    return createCircleComposition(payload);
  },
  createFromDrop(context, event) {
    if (event.dataTransfer?.getData('shape') !== 'circle') return null;
    const userCoords = context.getUsrCoordFromEvent(event);
    if (!userCoords) return null;
    return createCircleComposition({ x: userCoords[0], y: userCoords[1] });
  }
});