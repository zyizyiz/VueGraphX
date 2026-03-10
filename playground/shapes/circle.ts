import {
  createAnimationCapabilityTarget,
  createComposedShapeDefinition,
  createIntersectionAnnotation,
  createPairwiseIntersectionAnnotations,
  createPointAnnotation,
  type GraphShapeApi,
  type GraphShapeComposition,
  type GraphShapeGroup
} from 'vuegraphx';
import type { ShapeCapabilityTarget } from 'vuegraphx';

interface HelperLine {
  id: string;
  p1: any;
  p2: any;
  line: any;
  group: GraphShapeGroup;
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
  group: GraphShapeGroup;
}

type ActiveToolType = 'none' | 'size' | 'assist' | 'crop' | 'color-stroke' | 'color-fill';

interface CircleVisualRefs {
  circle: any;
  center: any;
  radiusPoint?: any;
  radiusLine?: any;
  bbox?: any;
  pulsePoint?: any;
  pulseCircle?: any;
}

interface CircleState {
  isPiece: boolean;
  showFeature: boolean;
  showColorPanel: boolean;
  activeTool: ActiveToolType;
  selectedColor: string;
  isDragging: boolean;
  isRadiusDragging: boolean;
  helpers: HelperLine[];
  intuitive: IntuitiveView | null;
  cutDraft: CutDraft | null;
  cropCache: { p1: any } | null;
  assistCache: { p1: any } | null;
  radiusValue: number;
  toolbarStyle: Record<string, string>;
  sizeInputStyle: Record<string, string>;
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
  isDragging: false,
  isRadiusDragging: false,
  helpers: [],
  intuitive: null,
  cutDraft: null,
  cropCache: null,
  assistCache: null,
  radiusValue: 2,
  toolbarStyle: { left: '50%', top: 'calc(100% - 5rem)' },
  sizeInputStyle: { left: '50%', top: '50%' },
  refs: null
});

const getRefs = (api: GraphShapeApi<CircleState>): CircleVisualRefs => {
  if (!api.state.refs) {
    throw new Error('Circle shape refs are not initialized');
  }
  return api.state.refs;
};

const mergeRefs = (api: GraphShapeApi<CircleState>, patch: Partial<CircleVisualRefs>): CircleVisualRefs => {
  const refs = { ...getRefs(api), ...patch };
  api.setState({ refs });
  return refs;
};

const getPulseTrack = (api: GraphShapeApi<CircleState>) => api.getAnimationTrack('pulse');

const getPulseAmount = (api: GraphShapeApi<CircleState>) => {
  const pulseTrack = getPulseTrack(api);
  if (!pulseTrack) return 0;
  return Math.max(0, Math.sin(pulseTrack.progress * Math.PI));
};

const syncPulseVisual = (api: GraphShapeApi<CircleState>) => {
  if (!api.state.refs || api.state.isPiece) return;
  const refs = api.selected ? ensureCircleSelectionRefs(api) : getRefs(api);
  const pulseTrack = getPulseTrack(api);
  const pulseCircle = refs.pulseCircle;
  if (!pulseTrack || !pulseCircle) return;

  const amount = getPulseAmount(api);
  const visible = api.selected && (pulseTrack.isAnimating || amount > 0.001);
  const radiusPoint = refs.radiusPoint;

  if (refs.pulsePoint && radiusPoint) {
    const centerX = refs.center.X();
    const centerY = refs.center.Y();
    const dx = radiusPoint.X() - centerX;
    const dy = radiusPoint.Y() - centerY;
    const length = Math.sqrt(dx * dx + dy * dy) || 1;
    const nextRadius = length * (1 + amount * 0.18);

    refs.pulsePoint.moveTo([
      centerX + (dx / length) * nextRadius,
      centerY + (dy / length) * nextRadius
    ], 0);
  }

  pulseCircle.setAttribute({
    visible,
    strokeOpacity: visible ? 0.2 + amount * 0.65 : 0,
    fillOpacity: visible ? 0.02 + amount * 0.08 : 0,
    strokeWidth: 1.5 + amount * 4
  });
};

const bringPulseCircleToFront = (api: GraphShapeApi<CircleState>) => {
  if (!api.state.refs || api.state.isPiece) return;
  const pulseCircle = getRefs(api).pulseCircle;
  const svgNode = pulseCircle?.rendNode;
  if (svgNode?.parentNode) {
    svgNode.parentNode.appendChild(svgNode);
  }
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

const refreshCircleBoard = (api: GraphShapeApi<CircleState>) => {
  api.board?.update();
};

const createCircleVisual = (
  api: GraphShapeApi<CircleState>,
  center: any,
  radiusPoint: any,
  centerX: () => number,
  centerY: () => number,
  radius: () => number,
  attributes: Record<string, unknown>
) => {
  if (!api.board) return null;

  const is3D = api.engine.getView3D();
  // 如果是 3D，使用具有高采样率的 2D 曲线(curve)模拟参数绘制
  if (is3D) {
    return api.trackObject(api.board.create('curve', [
      (t: number) => centerX() + radius() * Math.cos(t),
      (t: number) => centerY() + radius() * Math.sin(t),
      0,
      2 * Math.PI
    ], {
      ...attributes,
      doAdvancedPlot: false,
      numberPointsLow: 128,
      numberPointsHigh: 128
    }));
  } else {
    return api.trackObject(api.board.create('circle', [center, radiusPoint], attributes));
  }
};

const updateToolbarPosition = (api: GraphShapeApi<CircleState>) => {
  if (!api.selected || !api.state.refs) {
    if (api.state.toolbarStyle.top !== 'calc(100% - 5rem)') {
      api.setState({
        toolbarStyle: { left: '50%', top: 'calc(100% - 5rem)' }
      });
      api.scheduleUiChange();
    }
    return;
  }

  const { center, radiusPoint } = getRefs(api);
  const centerX = center.X();
  const centerY = center.Y();
  const radius = radiusPoint ? center.Dist(radiusPoint) : 1;
  const bounds = api.projectUserBounds([
    [centerX - radius, centerY],
    [centerX + radius, centerY],
    [centerX, centerY - radius],
    [centerX, centerY + radius]
  ]);
  if (!bounds) return;
  const screenPoint = api.getBoundsAnchor(bounds, 'bottom');
  const clampedToolbarPoint = api.clampScreenPoint(
    { x: screenPoint.x, y: screenPoint.y + 20 },
    { left: 160, right: 160, top: 16, bottom: 90 }
  );
  const toolbarStyle = {
    left: `${clampedToolbarPoint.x}px`,
    top: `${clampedToolbarPoint.y}px`
  };

  let sizeInputStyle = api.state.sizeInputStyle;
  if (api.state.activeTool === 'size' && radiusPoint) {
    const middleX = (center.X() + radiusPoint.X()) / 2;
    const middleY = (center.Y() + radiusPoint.Y()) / 2;
    const middlePoint = api.projectUserPoint([middleX, middleY]);
    if (middlePoint) {
      sizeInputStyle = {
        left: `${middlePoint.x}px`,
        top: `${middlePoint.y}px`
      };
    }
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
  api.scheduleUiChange();
};

const ensureCircleSelectionRefs = (api: GraphShapeApi<CircleState>): CircleVisualRefs => {
  const refs = getRefs(api);
  const patch: Partial<CircleVisualRefs> = {};
  const centerX = () => refs.center.X();
  const centerY = () => refs.center.Y();
  const radius = () => (refs.radiusPoint ? refs.center.Dist(refs.radiusPoint) : 1);

  if (!refs.pulsePoint) {
    patch.pulsePoint = api.trackObject(api.board.create('point', [
      centerX() + radius(),
      centerY()
    ], { visible: false }));
  }

  if (!refs.pulseCircle && !api.engine.getView3D()) {
    const pulsePoint = patch.pulsePoint ?? refs.pulsePoint;
    if (pulsePoint) {
      patch.pulseCircle = createCircleVisual(api, refs.center, pulsePoint, centerX, centerY, () => radius() * (1 + getPulseAmount(api) * 0.18), {
        visible: false,
        strokeColor: '#38bdf8',
        fillColor: '#38bdf8',
        fillOpacity: 0,
        strokeOpacity: 0,
        strokeWidth: 1.5,
        dash: 2,
        highlight: false,
        fixed: true,
        hasInnerPoints: false
      }) ?? undefined;
    }
  }

  if (!refs.bbox) {
    const p1 = api.trackObject(api.board.create('point', [() => centerX() - radius(), () => centerY() + radius()], { visible: false }));
    const p2 = api.trackObject(api.board.create('point', [() => centerX() + radius(), () => centerY() + radius()], { visible: false }));
    const p3 = api.trackObject(api.board.create('point', [() => centerX() + radius(), () => centerY() - radius()], { visible: false }));
    const p4 = api.trackObject(api.board.create('point', [() => centerX() - radius(), () => centerY() - radius()], { visible: false }));
    patch.bbox = api.trackObject(api.board.create('polygon', [p1, p2, p3, p4], {
      fillOpacity: 0,
      borders: { strokeColor: '#0ea5e9', strokeWidth: 1, visible: false },
      vertices: { visible: false },
      hasInnerPoints: false
    }));
  }

  return Object.keys(patch).length > 0 ? mergeRefs(api, patch) : refs;
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

  api.bindDrag(circle, {
    selectOnStart: true,
    onStart: () => {
      api.setState({ isDragging: true });
    },
    onEnd: () => {
      api.setState({ isDragging: false });
      updateToolbarPosition(api);
      api.scheduleUiChange();
    }
  });

  if (radiusPoint) {
    api.bindDrag(radiusPoint, {
      selectOnStart: true,
      onStart: () => {
        api.setState({ isDragging: true, isRadiusDragging: true });
      },
      onEnd: () => {
        api.setState({
          isDragging: false,
          radiusValue: parseFloat(center.Dist(radiusPoint).toFixed(2)),
          isRadiusDragging: false
        });
        updateToolbarPosition(api);
        api.scheduleUiChange();
      }
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
    const radius = () => center.Dist(radiusPoint);
    const centerX = () => center.X();
    const centerY = () => center.Y();

    const circle = createCircleVisual(api, center, radiusPoint, centerX, centerY, radius, {
      strokeColor: '#0ea5e9',
      fillColor: '#0ea5e9',
      fillOpacity: 0.12,
      strokeWidth: 2,
      highlight: false,
      hasInnerPoints: true
    });
    const radiusLine = api.trackObject(api.board.create('segment', [center, radiusPoint], {
      visible: false,
      strokeColor: '#64748b',
      strokeWidth: 1.5
    }));

    api.createAnimationTrack({
      id: 'pulse',
      label: '脉冲',
      initialProgress: 0,
      min: 0,
      max: 1,
      step: 0.01,
      duration: 1400,
      onProgress: () => {
        syncPulseVisual(api);
        api.board?.update();
        bringPulseCircleToFront(api);
      }
    });

    const geometryGroup = api.createGroup({
      center,
      radiusPoint,
      circle,
      radiusLine
    }, { createNativeGroup: false });
    geometryGroup.hide(['radiusPoint', 'radiusLine']);

    api.setState({
      refs: {
        circle: geometryGroup.getObject('circle') ?? circle,
        center: geometryGroup.getObject('center') ?? center,
        radiusPoint: geometryGroup.getObject('radiusPoint') ?? radiusPoint,
        radiusLine: geometryGroup.getObject('radiusLine') ?? radiusLine
      },
      radiusValue: 2
    });
    syncPulseVisual(api);
    attachInteractiveHandlers(api);
    updateToolbarPosition(api);
    refreshCircleBoard(api);
  },
  onSelectionChange(api, selected) {
    const refs = selected ? ensureCircleSelectionRefs(api) : getRefs(api);
    if (!selected) {
      closeIntuitive(api);
      refs.radiusPoint?.setAttribute({ visible: false });
      refs.radiusLine?.setAttribute({ visible: false });
      refs.bbox?.borders.forEach((border: any) => border.setAttribute({ visible: false }));
      api.setState({ showFeature: false, showColorPanel: false, activeTool: 'none' });
      syncPulseVisual(api);
      updateToolbarPosition(api);
      refreshCircleBoard(api);
      return;
    }

    if (refs.radiusPoint) {
      api.setState({ radiusValue: parseFloat(refs.center.Dist(refs.radiusPoint).toFixed(2)) });
    }
    syncPulseVisual(api);
    updateToolbarPosition(api);
    refreshCircleBoard(api);
  },
  onBoardUpdate(api) {
    if (api.selected && !api.state.isDragging) updateToolbarPosition(api);
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

        const group = api.createGroup({ start: api.state.assistCache.p1, end: p2, line }, { createNativeGroup: false });
        const helper: HelperLine = { id: api.uid('assist'), p1: api.state.assistCache.p1, p2, line, group };
        group.on('down', (member) => {
          if (member.key !== 'line') return;
          if (applyColorIfNeeded(api, helper.line, 'stroke')) return;
          Promise.resolve().then(() => {
            api.removeGroup(helper.group);
            api.setState({ helpers: api.state.helpers.filter((item) => item.id !== helper.id) });
            api.board?.update();
          });
        }, 'line');
        group.bindSelectOnHit({ keys: ['start', 'end'] });

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

        const group = api.createGroup({ start: cropStart, end: p2, line, icon }, { createNativeGroup: false });
        api.setState({
          cutDraft: { p1: cropStart, p2, line, icon, group },
          cropCache: null
        });
      }

      api.board?.update();
      api.notifyChange();
    }
  },
  onDestroy(api) {
    api.removeAnimationTrack('pulse');
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
      const ensuredRefs = ensureCircleSelectionRefs(api);
      if (!ensuredRefs.radiusPoint) return;
      const isSizeTool = api.state.activeTool !== 'size';
      if (isSizeTool && api.state.intuitive) closeIntuitive(api);

      ensuredRefs.radiusPoint.setAttribute({ visible: isSizeTool });
      ensuredRefs.radiusLine?.setAttribute({ visible: isSizeTool });
      ensuredRefs.bbox?.borders.forEach((border: any) => border.setAttribute({ visible: isSizeTool }));
      if (isSizeTool) {
        api.setState({ radiusValue: parseFloat(ensuredRefs.center.Dist(ensuredRefs.radiusPoint).toFixed(2)) });
        api.scheduleUiChange();
      }
      api.setState({ showColorPanel: false, activeTool: isSizeTool ? 'size' : 'none' });
      updateToolbarPosition(api);
      refreshCircleBoard(api);
    };

    const applyRadiusInput = (value: number) => {
      if (!refs.radiusPoint || api.state.activeTool !== 'size') return;
      api.setState({ radiusValue: value });
      api.scheduleUiChange();

      const centerX = refs.center.X();
      const centerY = refs.center.Y();
      const dx = refs.radiusPoint.X() - centerX;
      const dy = refs.radiusPoint.Y() - centerY;
      const length = Math.sqrt(dx * dx + dy * dy) || 1;
      const targetRadius = Math.max(0.2, Number(value) || 0.2);
      refs.radiusPoint.moveTo([centerX + (dx / length) * targetRadius, centerY + (dy / length) * targetRadius], 0);
      updateToolbarPosition(api);
      refreshCircleBoard(api);
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
      const helperLineEntries = api.state.helpers.map((helper) => ({
        key: helper.id,
        element: helper.line
      }));

      api.togglePointAnnotations([
        createPointAnnotation('center', refs.center, { label: 'O' }),
        ...api.state.helpers.flatMap((helper) => [0, 1].map((index) => createIntersectionAnnotation(
          `${helper.id}:${index}`,
          [helper.line, refs.circle],
          index
        ))),
        ...createPairwiseIntersectionAnnotations(helperLineEntries, {
          createKey: (left, right) => `${left.key}:${right.key}:intersection`
        })
      ]);
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
      if (api.state.cutDraft.icon) api.state.cutDraft.icon.setAttribute({ visible: false });
      api.removeGroup(api.state.cutDraft.group);
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

      if (cut.icon) cut.icon.setAttribute({ visible: false });
      api.removeGroup(cut.group);
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
      entity: {
        id: api.id,
        isPiece: api.state.isPiece,
        intuitive: api.state.intuitive,
        cutDraft: api.state.cutDraft,
        isDragging: api.state.isDragging,
        isRadiusDragging: api.state.isRadiusDragging
      },
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
      const pulseTrack = api.getAnimationTrack('pulse');
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
        active: api.hasPointAnnotations(),
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
      if (pulseTrack) {
        const animationCapabilityTarget = createAnimationCapabilityTarget(
          { pulse: pulseTrack },
          { primaryTrackId: 'pulse' }
        );

        if (animationCapabilityTarget) {
          target.animations = animationCapabilityTarget.animations;
          target.animation = animationCapabilityTarget.animation;
        }
      }
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
    const pieceGroup = api.createGroup({ center, firstPoint, secondPoint, circle, radiusLine }, { createNativeGroup: false });

    api.setState({
      refs: {
        circle: pieceGroup.getObject('circle') ?? circle,
        center: pieceGroup.getObject('center') ?? center,
        radiusLine: pieceGroup.getObject('radiusLine') ?? radiusLine
      }
    });
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
    if (api.selected && !api.state.isDragging) updateToolbarPosition(api);
  },
  onDestroy() {},
  getCapabilityTarget(api) {
    if (!api.selected) return null;
    return createCircleComposition({ x: 0, y: 0 }).getCapabilityTarget(api);
  }
});

export const circleShapeDefinition = createComposedShapeDefinition<CirclePayload, CircleState>({
  type: 'circle',
  supportedModes: 'all',
  create(_context, payload) {
    const coords = payload || { x: 0, y: 0 };
    return createCircleComposition(coords);
  },
  createFromDrop(context, event) {
    if (event.dataTransfer?.getData('shape') !== 'circle') return null;
    const userCoords = context.getUsrCoordFromEvent(event);
    if (!userCoords) return null;
    return createCircleComposition({ x: userCoords[0], y: userCoords[1] });
  }
});
