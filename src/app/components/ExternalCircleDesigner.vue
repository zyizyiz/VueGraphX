<template>
  <div v-if="activeMode === 'geometry'" data-circle-designer-ui="true" class="pointer-events-none absolute inset-0 z-30">
    <div data-circle-designer-ui="true" class="pointer-events-auto absolute left-4 top-4 rounded-xl border border-slate-200 bg-white/95 px-3 py-2 shadow-sm backdrop-blur">
      <div
        draggable="true"
        @dragstart="onDragStart"
        class="flex cursor-grab items-center gap-2 rounded-lg bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-700 hover:bg-sky-100"
      >
        <span class="inline-block h-4 w-4 rounded-full border-2 border-sky-500 bg-sky-100"></span>
        拖动圆形到画布
      </div>
    </div>

    <div
      v-if="selected"
      class="pointer-events-auto absolute -translate-x-1/2 rounded-xl border border-slate-200 bg-white/95 px-3 py-2 shadow-lg backdrop-blur w-max max-w-[95vw]"
      :style="toolbarStyle"
      data-circle-designer-ui="true"
    >
      <div class="flex flex-wrap items-center justify-center gap-2 text-sm font-semibold text-sky-600">
        <button class="toolbar-btn" @click="showFeature = true">特性</button>
        <template v-if="!selected.isPiece">
          <button class="toolbar-btn" :class="toolClass('size')" @click="toggleSizeMode">调节大小</button>
          <button class="toolbar-btn" :class="toolClass('assist')" @click="startAssistMode">作辅助线</button>
          <button class="toolbar-btn" @click="toggleIntuitive">直观图</button>
          <button class="toolbar-btn" @click="toggleMarking">标注</button>
          <button class="toolbar-btn" :class="toolClass('crop')" @click="startCropMode">裁切</button>
        </template>
        <button class="toolbar-btn" :class="toolClass('color')" @click="toggleColorPanel">颜色</button>
        <button class="toolbar-btn text-red-500" @click="removeSelected">删除</button>
      </div>

      <div v-if="showColorPanel" class="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs text-slate-600">
        <div class="mb-1 flex items-center gap-2">
          <button class="mini-btn" :class="activeTool === 'color-stroke' ? '!bg-sky-100 !text-sky-700 !border-sky-300' : ''" @click="activeTool = 'color-stroke'">线条颜色</button>
          <button class="mini-btn" :class="activeTool === 'color-fill' ? '!bg-sky-100 !text-sky-700 !border-sky-300' : ''" @click="activeTool = 'color-fill'">填充颜色</button>
        </div>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="c in palette"
            :key="c"
            class="h-5 w-5 rounded border"
            :style="{ backgroundColor: c, borderColor: selectedColor === c ? '#0284c7' : '#cbd5e1' }"
            @click="applyColorImmediately(c)"
          ></button>
        </div>
        <div class="mt-1 text-[11px] text-slate-500">选择颜色后立即生效</div>
      </div>

      <div v-if="selected?.cutDraft && !selected?.cutConfirmed" class="mt-2 flex items-center gap-2 border-t border-slate-200 pt-2">
        <button class="mini-btn" @click="cancelCut">取消</button>
        <button class="mini-btn !bg-sky-100 !text-sky-700 !border-sky-300" @click="confirmCut">确定</button>
      </div>

      <div v-if="selected?.intuitive" class="mt-2 border-t border-slate-200 pt-2">
        <button class="mini-btn" @click="closeIntuitive">关闭直观图</button>
      </div>
    </div>

    <div
      v-if="selected && activeTool === 'size'"
      class="pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 rounded-md bg-white/90 p-1 shadow-md backdrop-blur border border-sky-200 flex items-center gap-1 z-40"
      :style="sizeInputStyle"
      data-circle-designer-ui="true"
    >
      <span class="text-xs font-semibold text-sky-600 pl-1">r =</span>
      <input
        type="number"
        step="0.1"
        class="w-16 rounded border border-slate-300 bg-white px-1 py-0.5 text-xs text-slate-700 focus:border-sky-400 focus:outline-none text-center"
        v-model.number="radiusValue"
        @input="applyRadiusInput"
      />
    </div>

    <aside
      v-if="showFeature && selected"
      class="pointer-events-auto absolute right-4 top-4 w-80 max-h-[calc(100vh-2rem)] overflow-y-auto rounded-xl border border-slate-200 bg-white p-4 shadow-xl"
      data-circle-designer-ui="true"
    >
      <div class="mb-2 flex items-center justify-between">
        <h3 class="text-sm font-bold text-slate-700">圆形特性说明</h3>
        <button class="mini-btn" @click="showFeature = false">关闭</button>
      </div>
      <div class="space-y-2 text-xs leading-6 text-slate-600">
        <p>该图形为可交互圆形对象，支持半径调节、辅助线构造、自动标注、裁切与颜色定制。</p>
        <p>调节大小：可通过拖动边界控制点或直接输入半径 r 进行精准调节。</p>
        <p>辅助线/裁切：基于“两点确定一条直线”生成可拖拽控制线，辅助线可删除，裁切可确认或取消。</p>
        <p>标注：自动识别辅助线与圆的交点，按稳定字母序标记（A/B/C...），原点固定标记为 0。</p>
        <p>颜色：可分别对线条和可填充区域应用色盘中的颜色。</p>
      </div>
    </aside>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import JXG from 'jsxgraph';
import type { EngineMode } from '../../core/engine/GraphXEngine';

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

interface CircleModel {
  id: string;
  isPiece?: boolean;
  group?: any;
  circle: any;
  center: any;
  radiusPoint?: any;
  radiusLine?: any;
  bbox?: any;
  helpers: HelperLine[];
  marks: any[];
  markNameMap: Map<string, string>;
  nextLetterIndex: number;
  intuitive: IntuitiveView | null;
  cutDraft: CutDraft | null;
  cutConfirmed: boolean;
  cutPieces: any[];
}

const props = defineProps<{
  engine: { getBoard: () => JXG.Board | null } | null;
  activeMode: EngineMode;
}>();

const circles = ref<CircleModel[]>([]);
const selectedId = ref<string | null>(null);
const showFeature = ref(false);
const showColorPanel = ref(false);
const activeTool = ref<'none' | 'size' | 'assist' | 'crop' | 'color-stroke' | 'color-fill'>('none');
const radiusValue = ref(2);
const selectedColor = ref('#0ea5e9');
const isRadiusDragging = ref(false);
const toolbarStyle = ref<Record<string, string>>({ left: '50%', top: 'calc(100% - 5rem)' });
const sizeInputStyle = ref<Record<string, string>>({ left: '50%', top: '50%' });

const palette = ['#0ea5e9', '#ef4444', '#f59e0b', '#22c55e', '#8b5cf6', '#334155', '#f97316', '#14b8a6'];

const selected = computed(() => circles.value.find(c => c.id === selectedId.value) || null);
const board = computed(() => props.engine?.getBoard() || null);

let isClickingObject = false;
let boardDownHandler: ((e: any) => void) | null = null;
let boardUpHandler: ((e: any) => void) | null = null;
let boardUpdateHandler: (() => void) | null = null;
let dragOverHandler: ((e: DragEvent) => void) | null = null;
let dropHandler: ((e: DragEvent) => void) | null = null;
let mountedDropTarget: HTMLElement | null = null;
let mountedBoardRef: JXG.Board | null = null;

const toolClass = (kind: 'size' | 'assist' | 'crop' | 'color') => {
  if (kind === 'color') return showColorPanel.value ? 'bg-sky-100 text-sky-700' : '';
  return activeTool.value === kind ? 'bg-sky-100 text-sky-700' : '';
};

const uid = (prefix: string) => `${prefix}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

const isEventFromDesignerUI = (e: any): boolean => {
  const target = (e?.target ?? e?.srcElement) as EventTarget | null;
  if (!target || !(target instanceof Element)) return false;
  return !!target.closest('[data-circle-designer-ui="true"]');
};

const removeObjectSafe = (obj: any) => {
  try {
    if (board.value && obj) board.value.removeObject(obj);
  } catch {
  }
};

const clearSelections = () => {
  showFeature.value = false;
  showColorPanel.value = false;
  activeTool.value = 'none';
  selectedId.value = null;
  circles.value.forEach(c => {
    if (c.intuitive) closeIntuitiveTarget(c);
    c.radiusPoint?.setAttribute({ visible: false });
    c.radiusLine?.setAttribute({ visible: false });
    c.bbox?.borders.forEach((b: any) => b.setAttribute({ visible: false }));
  });
  updateToolbarPosition();
  board.value?.update();
};

const selectCircle = (id: string) => {
  if (selectedId.value === id) return;
  selectedId.value = id;
  showFeature.value = false;
  showColorPanel.value = false;
  activeTool.value = 'none';
  circles.value.forEach(c => {
    if (c.id !== id && c.intuitive) closeIntuitiveTarget(c);
    c.radiusPoint?.setAttribute({ visible: false });
    c.radiusLine?.setAttribute({ visible: false });
    c.bbox?.borders.forEach((b: any) => b.setAttribute({ visible: false }));
  });
  const model = circles.value.find(c => c.id === id);
  if (model) {
    radiusValue.value = model.radiusPoint ? model.center.Dist(model.radiusPoint) : 0;
  }
  updateToolbarPosition();
  board.value?.update();
};

const updateToolbarPosition = () => {
  if (!selected.value || !board.value) {
    toolbarStyle.value = { left: '50%', top: 'calc(100% - 5rem)' };
    return;
  }

  const cx = selected.value.center.X();
  const cy = selected.value.center.Y();
  // For pieces, they might not have radiusPoint. Give them a default visual radius or calculate bbox center
  const radius = selected.value.radiusPoint ? selected.value.center.Dist(selected.value.radiusPoint) : 1;

  // We want the toolbar to be positioned exactly below the bottom edge of the circle
  // In standard JSXGraph coordinates, Y goes up. 
  // The bottom edge of the circle is at `cy - radius`.
  const bottomEdgeY = cy - radius;

  // Convert logical coordinates into screen coordinates
  const usr = new JXG.Coords(JXG.COORDS_BY_USER, [cx, bottomEdgeY], board.value);
  const sx = usr.scrCoords[1];
  const sy = usr.scrCoords[2]; // y coordinate on the screen

  const boardWidth = board.value.canvasWidth || 1000;
  const boardHeight = board.value.canvasHeight || 700;
  
  // Keep constraints so the toolbar doesn't fly off-screen
  const clampedLeft = Math.max(160, Math.min(boardWidth - 160, sx));
  
  // Add a slight padding (e.g., 20px) under the actual bottom edge of the circle.
  const paddingY = 20;
  const top = sy + paddingY;
  const clampedTop = Math.max(16, Math.min(boardHeight - 90, top));

  toolbarStyle.value = {
    left: `${clampedLeft}px`,
    top: `${clampedTop}px`
  };

  if (activeTool.value === 'size' && selected.value.radiusPoint) {
    const mx = (selected.value.center.X() + selected.value.radiusPoint.X()) / 2;
    const my = (selected.value.center.Y() + selected.value.radiusPoint.Y()) / 2;
    const musr = new JXG.Coords(JXG.COORDS_BY_USER, [mx, my], board.value);
    sizeInputStyle.value = {
      left: `${musr.scrCoords[1]}px`,
      top: `${musr.scrCoords[2]}px`,
    };
  }
};

const applyColorImmediately = (color: string) => {
  selectedColor.value = color;
  if (!selected.value || !board.value) return;

  const model = selected.value;

  if (activeTool.value === 'color-stroke') {
    model.circle.setAttribute({ strokeColor: color });
    if (model.intuitive?.sector) model.intuitive.sector.setAttribute({ strokeColor: color });
    if (model.intuitive?.curve) model.intuitive.curve.setAttribute({ strokeColor: color });
  } else if (activeTool.value === 'color-fill') {
    model.circle.setAttribute({ fillColor: color, fillOpacity: 0.35 });
    if (model.intuitive?.sector) model.intuitive.sector.setAttribute({ fillColor: color });
    if (model.intuitive?.curve) model.intuitive.curve.setAttribute({ fillColor: color });
  }

  board.value.update();
};

const applyColorIfNeeded = (target: any, kind: 'stroke' | 'fill' | 'both'): boolean => {
  if (activeTool.value !== 'color-stroke' && activeTool.value !== 'color-fill') return false;

  let applied = false;
  if (activeTool.value === 'color-stroke' && (kind === 'stroke' || kind === 'both')) {
    target.setAttribute({ strokeColor: selectedColor.value });
    applied = true;
  }

  if (activeTool.value === 'color-fill' && (kind === 'fill' || kind === 'both')) {
    target.setAttribute({ fillColor: selectedColor.value, fillOpacity: 0.35 });
    applied = true;
  }

  if (applied) {
    board.value?.update();
  }
  return applied;
};

const attachInteractiveHandlers = (model: CircleModel) => {
  model.circle.on('down', () => {
    if (!applyColorIfNeeded(model.circle, 'both')) {
      if (model.isPiece && model.radiusLine && applyColorIfNeeded(model.radiusLine, 'stroke')) return;
      selectCircle(model.id);
    }
  });

  if (model.radiusLine && model.isPiece) {
    model.radiusLine.on('down', () => {
      if (!applyColorIfNeeded(model.radiusLine, 'stroke')) {
        selectCircle(model.id);
      }
    });
  }

  model.center.on('down', () => {
    selectCircle(model.id);
  });

  if (model.radiusPoint) {
    model.radiusPoint.on('down', () => {
      selectCircle(model.id);
      isRadiusDragging.value = true;
    });

    model.radiusPoint.on('drag', () => {
      radiusValue.value = parseFloat(model.center.Dist(model.radiusPoint).toFixed(2));
    });

    model.radiusPoint.on('up', () => {
      radiusValue.value = model.center.Dist(model.radiusPoint);
      setTimeout(() => {
        isRadiusDragging.value = false;
      }, 0);
    });
  }
};

const createCircleAt = (x: number, y: number) => {
  if (!board.value) return;

  const center = board.value.create('point', [x, y], {
    visible: false,
    name: '',
    size: 2
  });

  const radiusPoint = board.value.create('point', [x + 2, y], {
    visible: false,
    name: '',
    size: 3,
    strokeColor: '#0ea5e9',
    fillColor: '#0ea5e9'
  });

  const circle = board.value.create('circle', [center, radiusPoint], {
    strokeColor: '#0ea5e9',
    fillColor: '#0ea5e9',
    fillOpacity: 0.12,
    strokeWidth: 2,
    highlight: false,
    hasInnerPoints: true
  });

  const radiusLine = board.value.create('segment', [center, radiusPoint], {
    visible: false,
    strokeColor: '#64748b',
    strokeWidth: 1.5,
  });

  const r = () => center.Dist(radiusPoint);
  const cx = () => center.X();
  const cy = () => center.Y();

  const p1 = board.value.create('point', [() => cx() - r(), () => cy() + r()], {visible:false});
  const p2 = board.value.create('point', [() => cx() + r(), () => cy() + r()], {visible:false});
  const p3 = board.value.create('point', [() => cx() + r(), () => cy() - r()], {visible:false});
  const p4 = board.value.create('point', [() => cx() - r(), () => cy() - r()], {visible:false});

  const bbox = board.value.create('polygon', [p1, p2, p3, p4], {
    fillOpacity: 0,
    borders: { strokeColor: '#0ea5e9', strokeWidth: 1, visible: false },
    vertices: { visible: false },
    hasInnerPoints: false
  });

  const model: CircleModel = {
    id: uid('circle'),
    circle,
    center,
    radiusPoint,
    radiusLine,
    bbox,
    helpers: [],
    marks: [],
    markNameMap: new Map(),
    nextLetterIndex: 0,
    intuitive: null,
    cutDraft: null,
    cutConfirmed: false,
    cutPieces: []
  };

  attachInteractiveHandlers(model);
  circles.value.push(model);
  selectCircle(model.id);
  updateToolbarPosition();
  board.value.update();
};

const getUsrCoordFromEvent = (e: any): [number, number] | null => {
  if (!board.value) return null;
  let cx = e.clientX;
  let cy = e.clientY;
  if (cx === undefined) {
    if (e.changedTouches && e.changedTouches.length > 0) {
      cx = e.changedTouches[0].clientX;
      cy = e.changedTouches[0].clientY;
    } else if (e.touches && e.touches.length > 0) {
      cx = e.touches[0].clientX;
      cy = e.touches[0].clientY;
    } else {
      return null;
    }
  }

  const cont = board.value.containerObj;
  if (!cont) return null;
  const rect = cont.getBoundingClientRect();
  const dx = cx - rect.left - (cont.clientLeft || 0);
  const dy = cy - rect.top - (cont.clientTop || 0);

  const coords = new JXG.Coords(JXG.COORDS_BY_SCREEN, [dx, dy], board.value);
  if (!Number.isFinite(coords.usrCoords[1])) return null;
  return [coords.usrCoords[1], coords.usrCoords[2]];
};

const onDragStart = (e: DragEvent) => {
  e.dataTransfer?.setData('shape', 'circle');
  e.dataTransfer!.effectAllowed = 'copy';
};

const installDropListeners = () => {
  if (mountedDropTarget && dragOverHandler) {
    mountedDropTarget.removeEventListener('dragover', dragOverHandler);
  }
  if (mountedDropTarget && dropHandler) {
    mountedDropTarget.removeEventListener('drop', dropHandler);
  }

  const mount = document.getElementById('vuegraphx-mount');
  if (!mount) return;

  dragOverHandler = (e: DragEvent) => {
    if (props.activeMode !== 'geometry') return;
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
  };

  dropHandler = (e: DragEvent) => {
    if (props.activeMode !== 'geometry') return;
    if (e.dataTransfer?.getData('shape') !== 'circle') return;
    e.preventDefault();
    const usr = getUsrCoordFromEvent(e);
    if (!usr) return;
    createCircleAt(usr[0], usr[1]);
  };

  mount.addEventListener('dragover', dragOverHandler);
  mount.addEventListener('drop', dropHandler);
  mountedDropTarget = mount;
};

const installBoardUpHandler = () => {
  if (!board.value) return;

  if (mountedBoardRef && boardDownHandler) {
    mountedBoardRef.off('down', boardDownHandler);
  }
  if (mountedBoardRef && boardUpHandler) {
    mountedBoardRef.off('up', boardUpHandler);
  }
  if (mountedBoardRef && boardUpdateHandler) {
    mountedBoardRef.off('update', boardUpdateHandler);
  }

  boardDownHandler = (e: any) => {
    // Determine on 'down' (where touch events have valid coordinates) if we hit an object
    const objs = board.value?.getAllObjectsUnderMouse(e) || [];
    isClickingObject = objs.filter((o: any) => o.elType !== 'image').length > 0;
  };

  boardUpHandler = (e: any) => {
    if (props.activeMode !== 'geometry') return;
    if (isEventFromDesignerUI(e)) return;

    if (!isClickingObject) {
      clearSelections();
      return;
    }

    const model = selected.value;
    if (!model) return;

    if (activeTool.value === 'size' && !isRadiusDragging.value) {
      return;
    }

    if (activeTool.value === 'assist') {
      const usr = getUsrCoordFromEvent(e as MouseEvent);
      if (!usr) return;

      if (!('__assistCache' in (window as any))) {
        (window as any).__assistCache = null;
      }
      const cache = (window as any).__assistCache;

      if (!cache) {
        (window as any).__assistCache = {
          p1: board.value!.create('glider', [usr[0], usr[1], model.circle], { name: '', size: 3, strokeColor: '#64748b', fillColor: '#white', strokeWidth: 2 })
        };
      } else {
        const p2 = board.value!.create('glider', [usr[0], usr[1], model.circle], { name: '', size: 3, strokeColor: '#64748b', fillColor: '#white', strokeWidth: 2 });
        const line = board.value!.create('line', [cache.p1, p2], {
          straightFirst: false,
          straightLast: false,
          dash: 2,
          strokeWidth: 2,
          strokeColor: '#64748b'
        });

        const helper: HelperLine = { id: uid('assist'), p1: cache.p1, p2, line };
        helper.line.on('down', () => {
          if (applyColorIfNeeded(helper.line, 'stroke')) return;
          removeObjectSafe(helper.p1);
          removeObjectSafe(helper.p2);
          removeObjectSafe(helper.line);
          model.helpers = model.helpers.filter(h => h.id !== helper.id);
          board.value?.update();
        });

        helper.p1.on('down', () => selectCircle(model.id));
        helper.p2.on('down', () => selectCircle(model.id));

        model.helpers.push(helper);
        (window as any).__assistCache = null;
        activeTool.value = 'none';
      }

      board.value?.update();
      return;
    }

    if (activeTool.value === 'crop') {
      const usr = getUsrCoordFromEvent(e as MouseEvent);
      if (!usr) return;

      if (!('__cropCache' in (window as any))) {
        (window as any).__cropCache = null;
      }
      const cache = (window as any).__cropCache;

      if (!cache) {
        const p1 = board.value!.create('glider', [usr[0], usr[1], model.circle], { name: '', size: 4, strokeColor: '#ef4444', fillColor: '#white', strokeWidth: 2 });
        (window as any).__cropCache = { p1 };
      } else {
        const p2 = board.value!.create('glider', [usr[0], usr[1], model.circle], { name: '', size: 4, strokeColor: '#ef4444', fillColor: '#white', strokeWidth: 2 });
        const line = board.value!.create('line', [cache.p1, p2], {
          straightFirst: false,
          straightLast: false,
          dash: 0,
          strokeWidth: 3,
          strokeColor: '#ef4444'
        });
        const icon = board.value!.create('text', [
          () => (cache.p1.X() + p2.X()) / 2,
          () => (cache.p1.Y() + p2.Y()) / 2,
          '✂️'
        ], {
          anchorX: 'middle',
          anchorY: 'middle',
          fixed: true
        });

        model.cutDraft = { p1: cache.p1, p2, line, icon };
        (window as any).__cropCache = null;
      }

      board.value?.update();
      return;
    }
  };

  board.value.on('down', boardDownHandler);
  board.value.on('up', boardUpHandler);
  boardUpdateHandler = () => {
    updateToolbarPosition();
  };
  board.value.on('update', boardUpdateHandler);
  mountedBoardRef = board.value;
};

const toggleSizeMode = () => {
  if (!selected.value) return;
  showColorPanel.value = false;
  const isSize = activeTool.value !== 'size';
  activeTool.value = isSize ? 'size' : 'none';

  if (isSize && selected.value.intuitive) closeIntuitiveTarget(selected.value);

  circles.value.forEach(c => {
    const visible = c.id === selectedId.value && isSize;
    c.radiusPoint?.setAttribute({ visible });
    c.radiusLine?.setAttribute({ visible });
    c.bbox?.borders.forEach((b: any) => b.setAttribute({ visible }));
  });

  if (isSize && selected.value.radiusPoint) {
    radiusValue.value = parseFloat(selected.value.center.Dist(selected.value.radiusPoint).toFixed(2));
  }
  
  updateToolbarPosition();
  board.value?.update();
};

const applyRadiusInput = () => {
  if (!selected.value || activeTool.value !== 'size' || !selected.value.radiusPoint) return;

  const model = selected.value;
  const centerX = model.center.X();
  const centerY = model.center.Y();
  const dx = model.radiusPoint.X() - centerX;
  const dy = model.radiusPoint.Y() - centerY;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;

  const targetR = Math.max(0.2, Number(radiusValue.value) || 0.2);
  model.radiusPoint.moveTo([centerX + (dx / len) * targetR, centerY + (dy / len) * targetR], 0);
  updateToolbarPosition();
  board.value?.update();
};

const startAssistMode = () => {
  if (!selected.value) return;
  activeTool.value = activeTool.value === 'assist' ? 'none' : 'assist';
  showColorPanel.value = false;

  if (activeTool.value === 'assist' && selected.value.intuitive) closeIntuitiveTarget(selected.value);

  if (activeTool.value !== 'assist' && (window as any).__assistCache?.p1) {
    removeObjectSafe((window as any).__assistCache.p1);
    (window as any).__assistCache = null;
  }
};

const toggleIntuitive = () => {
  if (!selected.value || !board.value) return;
  const model = selected.value;

  if (model.intuitive) {
    closeIntuitiveTarget(model);
    board.value.update();
    return;
  }

  model.circle.setAttribute({ visible: false });

  const cx = () => model.center.X();
  const cy = () => model.center.Y();
  const r = () => model.radiusPoint ? model.center.Dist(model.radiusPoint) : 1;

  // 根据斜二测画法规则（平行依旧垂改斜，横轴不变纵减半）：
  // 1. x 轴（横轴）对应 x' 轴，长度不变
  // 2. y 轴（纵轴）对应 y' 轴（夹角45度），长度减半
  // x' = x + y * 0.5 * cos(45) = x + y * sqrt(2)/4
  // y' = y * 0.5 * sin(45) = y * sqrt(2)/4
  const curve = board.value.create('curve', [
    (t: number) => cx() + r() * Math.cos(t) + (Math.sqrt(2) / 4) * r() * Math.sin(t),
    (t: number) => cy() + (Math.sqrt(2) / 4) * r() * Math.sin(t),
    0,
    2 * Math.PI
  ], {
    fillColor: '#ef4444',
    fillOpacity: 0.2,
    strokeColor: '#ef4444',
    strokeWidth: 2,
    highlight: false,
    hasInnerPoints: true, // 允许点击内部
    fixed: false // 允许触发自身事件
  });

  (curve as any).on('down', () => {
    if (!applyColorIfNeeded(curve, 'both')) {
      selectCircle(model.id);
    }
  });

  model.intuitive = { curve };
  board.value.update();
};

const closeIntuitiveTarget = (model: CircleModel) => {
  if (!model.intuitive) return;
  if (model.intuitive.left) removeObjectSafe(model.intuitive.left);
  if (model.intuitive.sector) removeObjectSafe(model.intuitive.sector);
  if (model.intuitive.curve) removeObjectSafe(model.intuitive.curve);
  model.intuitive = null;
  if (model.circle) model.circle.setAttribute({ visible: true });
};

const closeIntuitive = () => {
  if (!selected.value) return;
  closeIntuitiveTarget(selected.value);
  board.value?.update();
};

const toggleMarking = () => {
  if (!selected.value || !board.value) return;
  const model = selected.value;

  if (model.marks.length > 0) {
    model.marks.forEach(removeObjectSafe);
    model.marks = [];
    board.value.update();
    return;
  }

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  const origin = board.value.create('point', [0, 0], {
    name: '0',
    withLabel: true,
    size: 2,
    strokeColor: '#0f172a',
    fillColor: '#0f172a',
    fixed: true
  });
  model.marks.push(origin);

  model.helpers.forEach((helper) => {
    [0, 1].forEach((idx) => {
      const key = `${helper.id}:${idx}`;
      let label = model.markNameMap.get(key);
      if (!label) {
        label = alphabet[model.nextLetterIndex % alphabet.length];
        model.nextLetterIndex += 1;
        model.markNameMap.set(key, label);
      }
      const pt = board.value!.create('intersection', [helper.line, model.circle, idx], {
        name: label,
        withLabel: true,
        size: 2,
        strokeColor: '#0f172a',
        fillColor: '#0f172a'
      });
      model.marks.push(pt);
    });
  });

  board.value.update();
};

const startCropMode = () => {
  if (!selected.value) return;
  showColorPanel.value = false;
  activeTool.value = activeTool.value === 'crop' ? 'none' : 'crop';

  if (activeTool.value === 'crop' && selected.value.intuitive) closeIntuitiveTarget(selected.value);

  if (activeTool.value !== 'crop' && (window as any).__cropCache?.p1) {
    removeObjectSafe((window as any).__cropCache.p1);
    (window as any).__cropCache = null;
  }
};

const cancelCut = () => {
  if (!selected.value) return;
  const cut = selected.value.cutDraft;
  if (!cut) return;
  removeObjectSafe(cut.p1);
  removeObjectSafe(cut.p2);
  removeObjectSafe(cut.line);
  removeObjectSafe(cut.icon);
  selected.value.cutDraft = null;
  activeTool.value = 'none';
  board.value?.update();
};

const createPieceAt = (cx: number, cy: number, px1: number, py1: number, px2: number, py2: number, isReverse: boolean, colorStroke: string, colorFill: string) => {
  if (!board.value) return;

  const center = board.value.create('point', [cx, cy], { visible: false, name: '' });
  let pArc1, pArc2;

  if (isReverse) {
    pArc1 = board.value.create('point', [px2, py2], { visible: false, name: '' });
    pArc2 = board.value.create('point', [px1, py1], { visible: false, name: '' });
  } else {
    pArc1 = board.value.create('point', [px1, py1], { visible: false, name: '' });
    pArc2 = board.value.create('point', [px2, py2], { visible: false, name: '' });
  }

  const arc = board.value.create('arc', [center, pArc1, pArc2], {
    strokeColor: colorStroke,
    fillColor: colorFill,
    fillOpacity: 0.35,
    strokeWidth: 2,
    highlight: false,
    hasInnerPoints: true,
    fixed: false
  });

  const chord = board.value.create('segment', [pArc1, pArc2], {
    strokeColor: colorStroke,
    strokeWidth: 2,
    highlight: false,
    fixed: false,
    layer: 9
  });

  const group = board.value.create('group', [center, pArc1, pArc2, arc, chord]);

  const pieceModel: CircleModel = {
    id: uid('piece'),
    isPiece: true,
    group,
    circle: arc, // The main clickable/colorable shape is the arc
    center,
    radiusLine: chord, // using radiusLine property to store the chord segment for color operations
    helpers: [],
    marks: [],
    markNameMap: new Map(),
    nextLetterIndex: 0,
    intuitive: null,
    cutDraft: null,
    cutConfirmed: false,
    cutPieces: []
  };

  attachInteractiveHandlers(pieceModel);
  circles.value.push(pieceModel);
};

const confirmCut = () => {
  if (!selected.value || !board.value || !selected.value.cutDraft) return;
  const model = selected.value;
  const cut = model.cutDraft;
  if (!cut) return;

  const cx = model.center.X();
  const cy = model.center.Y();
  
  const px1 = cut.p1.X();
  const py1 = cut.p1.Y();
  const px2 = cut.p2.X();
  const py2 = cut.p2.Y();

  const colorStroke = model.circle.getAttribute('strokeColor');
  const colorFill = model.circle.getAttribute('fillColor');

  // Clean up cutting draft UI
  removeObjectSafe(cut.p1);
  removeObjectSafe(cut.p2);
  removeObjectSafe(cut.line);
  removeObjectSafe(cut.icon);
  model.cutDraft = null;

  // Create two distinct pieces at slightly offset positions using coordinates
  const offsetX = 0.5;
  const offsetY = -0.5;

  createPieceAt(cx - offsetX, cy - offsetY, px1 - offsetX, py1 - offsetY, px2 - offsetX, py2 - offsetY, false, colorStroke, colorFill);
  createPieceAt(cx + offsetX, cy + offsetY, px1 + offsetX, py1 + offsetY, px2 + offsetX, py2 + offsetY, true, colorStroke, colorFill);

  removeSelected();
};

const toggleColorPanel = () => {
  showColorPanel.value = !showColorPanel.value;
  if (showColorPanel.value) {
    activeTool.value = 'color-stroke';
  } else {
    activeTool.value = 'none';
  }
};

const removeSelected = () => {
  if (!selected.value) return;
  const model = selected.value;

  model.helpers.forEach((h) => {
    removeObjectSafe(h.p1);
    removeObjectSafe(h.p2);
    removeObjectSafe(h.line);
  });

  model.marks.forEach(removeObjectSafe);

  if (model.intuitive) {
    if (model.intuitive.left) removeObjectSafe(model.intuitive.left);
    if (model.intuitive.sector) removeObjectSafe(model.intuitive.sector);
    if (model.intuitive.curve) removeObjectSafe(model.intuitive.curve);
  }

  if (model.cutDraft) {
    removeObjectSafe(model.cutDraft.p1);
    removeObjectSafe(model.cutDraft.p2);
    removeObjectSafe(model.cutDraft.line);
    removeObjectSafe(model.cutDraft.icon);
  }

  removeObjectSafe(model.radiusLine);
  if (model.bbox) {
    removeObjectSafe(model.bbox);
    model.bbox.vertices.forEach(removeObjectSafe);
    model.bbox.borders.forEach(removeObjectSafe);
  }

  model.cutPieces.forEach(removeObjectSafe);
  removeObjectSafe(model.circle);
  removeObjectSafe(model.center);
  removeObjectSafe(model.radiusPoint);
  
  if (model.group) {
    if (model.isPiece) {
      if (model.circle.parents) {
        model.circle.parents.forEach((parentId: string) => {
           const p = (board.value as any)?.objects[parentId];
           if (p) removeObjectSafe(p);
        });
      }
    }
    removeObjectSafe(model.group);
  }

  circles.value = circles.value.filter(c => c.id !== model.id);
  selectedId.value = null;
  showFeature.value = false;
  showColorPanel.value = false;
  activeTool.value = 'none';
  board.value?.update();
};

watch(() => props.activeMode, (mode) => {
  if (mode !== 'geometry') {
    clearSelections();
  }
});

watch(selectedId, () => {
  updateToolbarPosition();
});

watch(board, (val) => {
  if (val) {
    installBoardUpHandler();
    installDropListeners();
    updateToolbarPosition();
  }
}, { immediate: true });

onMounted(() => {
  updateToolbarPosition();
});

onBeforeUnmount(() => {
  if (mountedBoardRef && boardUpHandler) {
    mountedBoardRef.off('up', boardUpHandler);
  }
  if (mountedBoardRef && boardUpdateHandler) {
    mountedBoardRef.off('update', boardUpdateHandler);
  }

  if (mountedDropTarget && dragOverHandler) mountedDropTarget.removeEventListener('dragover', dragOverHandler);
  if (mountedDropTarget && dropHandler) mountedDropTarget.removeEventListener('drop', dropHandler);
});
</script>

<style scoped>
.toolbar-btn {
  border-radius: 0.5rem;
  padding: 0.3rem 0.55rem;
  transition: all 0.15s ease;
}
.toolbar-btn:hover {
  background: #f1f5f9;
}
.mini-btn {
  border-radius: 0.4rem;
  border: 1px solid #cbd5e1;
  background: #fff;
  padding: 0.2rem 0.45rem;
  font-size: 11px;
  color: #334155;
}
</style>
