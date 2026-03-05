<template>
  <div v-if="activeMode === 'geometry'" data-designer-ui="true" class="pointer-events-none absolute inset-0 z-30">
    <div data-designer-ui="true" class="pointer-events-auto absolute left-4 top-4 rounded-xl border border-slate-200 bg-white/95 px-3 py-2 shadow-sm backdrop-blur">
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
      :style="fastState.toolbarStyle"
      data-designer-ui="true"
    >
      <div class="flex flex-wrap items-center justify-center gap-2 text-sm font-semibold text-sky-600">
        <button class="toolbar-btn" @click="setShowFeature(true)">特性</button>
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

      <div v-if="state.showColorPanel" class="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs text-slate-600">
        <div class="mb-1 flex items-center gap-2">
          <button class="mini-btn" :class="state.activeTool === 'color-stroke' ? '!bg-sky-100 !text-sky-700 !border-sky-300' : ''" @click="setActiveTool('color-stroke')">线条颜色</button>
          <button class="mini-btn" :class="state.activeTool === 'color-fill' ? '!bg-sky-100 !text-sky-700 !border-sky-300' : ''" @click="setActiveTool('color-fill')">填充颜色</button>
        </div>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="c in palette"
            :key="c"
            class="h-5 w-5 rounded border"
            :style="{ backgroundColor: c, borderColor: state.selectedColor === c ? '#0284c7' : '#cbd5e1' }"
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
      v-if="selected && state.activeTool === 'size'"
      class="pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 rounded-md bg-white/90 p-1 shadow-md backdrop-blur border border-sky-200 flex items-center gap-1 z-40"
      :style="fastState.sizeInputStyle"
      data-designer-ui="true"
    >
      <span class="text-xs font-semibold text-sky-600 pl-1">r =</span>
      <input
        type="number"
        step="0.1"
        class="w-16 rounded border border-slate-300 bg-white px-1 py-0.5 text-xs text-slate-700 focus:border-sky-400 focus:outline-none text-center"
        v-model.number="radiusValue"
      />
    </div>

    <aside
      v-if="state.showFeature && selected"
      class="pointer-events-auto absolute right-4 top-4 w-80 max-h-[calc(100vh-2rem)] overflow-y-auto rounded-xl border border-slate-200 bg-white p-4 shadow-xl"
      data-designer-ui="true"
    >
      <div class="mb-2 flex items-center justify-between">
        <h3 class="text-sm font-bold text-slate-700">圆形特性说明</h3>
        <button class="mini-btn" @click="setShowFeature(false)">关闭</button>
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
import type { EngineMode } from '../../core/engine/GraphXEngine';
import type { GraphXEngine } from '../../core/engine/GraphXEngine';
import { useCircleDesigner } from '../composables/useCircleDesigner';

const props = defineProps<{
  engine: GraphXEngine | null;
  activeMode: EngineMode;
}>();

const palette = ['#0ea5e9', '#ef4444', '#f59e0b', '#22c55e', '#8b5cf6', '#334155', '#f97316', '#14b8a6'];

const {
  state,
  fastState,
  selected,
  toolClass,
  onDragStart,
  setShowFeature,
  toggleSizeMode,
  startAssistMode,
  toggleIntuitive,
  toggleMarking,
  startCropMode,
  toggleColorPanel,
  removeSelected,
  setActiveTool,
  applyColorImmediately,
  cancelCut,
  confirmCut,
  closeIntuitive,
  radiusValue
} = useCircleDesigner(
  () => props.engine,
  () => props.activeMode
);
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
