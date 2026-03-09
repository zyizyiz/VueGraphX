<template>
  <div v-if="activeMode === '3d' || activeMode === 'geometry'" data-designer-ui="true" class="pointer-events-none absolute inset-0 z-30">
    <div
      data-designer-ui="true"
      class="pointer-events-auto absolute rounded-xl border border-slate-200 bg-white/95 px-3 py-2 shadow-sm backdrop-blur"
      :class="activeMode === 'geometry' ? 'left-4 top-24' : 'left-4 top-4'"
    >
      <div v-if="activeMode === 'geometry'" class="flex flex-col gap-2">
        <button
          v-for="spec in geometrySolidSpecs"
          :key="spec.type"
          draggable="true"
          @click="createGeometrySolid(spec.type)"
          @dragstart="onDragStart(spec.type, $event)"
          class="flex cursor-grab items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-colors"
          :class="spec.badgeClass"
        >
          <span class="relative inline-flex h-4 w-4 items-center justify-center">
            <span class="inline-block h-4 w-4" :class="spec.iconClass"></span>
          </span>
          {{ spec.dragLabel }}
        </button>
      </div>

      <button
        v-else
        @click="createCube"
        class="flex cursor-pointer items-center gap-2 rounded-lg bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 transition-colors hover:bg-indigo-100"
      >
        <span class="inline-block h-4 w-4 rounded-sm border-2 border-indigo-500 bg-indigo-100"></span>
        {{ createLabel }}
      </button>
    </div>

    <div
      v-if="selected"
      class="pointer-events-auto absolute -translate-x-1/2 rounded-xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur w-72 max-w-[95vw] transition-all duration-300"
      :style="fastState.toolbarStyle"
      data-designer-ui="true"
    >
      <div class="mb-4 flex items-center justify-between border-b border-slate-100 pb-2">
        <h3 class="text-sm font-bold text-slate-700 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-indigo-500" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.286 1.006l-6.906 6.906a1 1 0 01-1.414 0l-6.906-6.906a1 1 0 01-.286-1.006l1.738-5.42-1.233-.616a1 1 0 01.894-1.79l1.599.8L9 4.323V3a1 1 0 011-1z" clip-rule="evenodd" />
          </svg>
          {{ panelTitle }}
        </h3>
        <span v-if="state.selectedType === 'cube'" class="text-[10px] font-mono text-slate-400 font-medium px-2 py-0.5 bg-slate-100 rounded-full">
          {{ (cubeUnfoldProgress * 100).toFixed(0) }}%
        </span>
        <span v-else class="text-[10px] font-mono text-slate-400 font-medium px-2 py-0.5 bg-slate-100 rounded-full">
          {{ fastState.tracks.length }} 条轨道
        </span>
      </div>

      <template v-if="state.selectedType === 'cube'">
        <!-- 为标准正方体特设的大面板 -->
        <div class="space-y-4">
          <!-- 动画控制按钮 -->
          <div class="grid grid-cols-2 gap-2">
            <button 
              class="flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:text-indigo-600 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
              :disabled="cubeIsPlaying || cubeUnfoldProgress >= 1"
              @click="playTrackForward('unfold')"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 01-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15 13.586V12a1 1 0 011-1z" clip-rule="evenodd" />
              </svg>
              开始展开
            </button>
            <button 
              class="flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:text-indigo-600 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
              :disabled="cubeIsPlaying || cubeUnfoldProgress <= 0"
              @click="playTrackBackward('unfold')"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M5 3a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V5a2 2 0 00-2-2H5zm0 2h10v7h-2l-1 2H8l-1-2H5V5z" clip-rule="evenodd" />
              </svg>
              折叠收起
            </button>
          </div>

          <div v-if="cubeIsPlaying" class="flex justify-center">
            <button class="text-xs text-red-500 hover:text-red-700 underline" @click="stopTrack('unfold')">停止动画</button>
          </div>

          <!-- 手动滑块 -->
          <div class="space-y-1.5 pt-2">
            <div class="flex items-center justify-between px-1">
              <span class="text-[10px] text-slate-500">手动调节</span>
              <span class="text-[10px] text-indigo-500 font-medium" v-if="cubeIsPlaying">正在动画中...</span>
            </div>
            <input 
              type="range" 
              min="0" 
              max="1" 
              step="0.01"
              class="w-full accent-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 rounded-lg cursor-pointer"
              :value="cubeUnfoldProgress"
              @input="onCubeProgressChange"
            >
          </div>
        </div>
      </template>

      <template v-else>
        <!-- 旧有通用手动轨道面板 -->
        <div class="mb-4">
          <button
            @click="runCapability('toggleManualRotation')"
            class="flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold transition-all duration-200 shadow-sm"
            :class="fastState.isManualRotating 
              ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-amber-200' 
              : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
            "
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" :class="fastState.isManualRotating ? 'animate-spin' : ''" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="23 4 23 10 17 10"></polyline>
              <polyline points="1 20 1 14 7 14"></polyline>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
            </svg>
            {{ fastState.isManualRotating ? '正在手动旋转(点击关闭)' : '开启 3D 手动旋转' }}
          </button>
          <p v-if="fastState.isManualRotating" class="mt-2 text-[10px] text-center text-amber-600 font-bold bg-amber-50 py-1 rounded">
            请在画布上拖拽立方体进行翻转
          </p>
        </div>

        <AnimationTracksPanel
          v-if="fastState.tracks.length > 0"
          :tracks="fastState.tracks"
          theme="indigo"
          @set-progress="setTrackProgress"
          @play-forward="playTrackForward"
          @play-backward="playTrackBackward"
          @pause="pauseTrack"
          @resume="resumeTrack"
          @stop="stopTrack"
          @toggle-loop="toggleTrackLoop"
          @toggle-yoyo="toggleTrackYoyo"
        />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { EngineMode, GraphXEngine } from 'vuegraphx';
import { useCubeDesigner } from '../composables/useCubeDesigner';
import { computed } from 'vue';
import AnimationTracksPanel from './AnimationTracksPanel.vue';

const props = defineProps<{
  engine: GraphXEngine | null;
  activeMode: EngineMode;
}>();

const {
  state,
  fastState,
  geometrySolidSpecs,
  createCube,
  createGeometrySolid,
  runCapability,
  onDragStart,
  setTrackProgress,
  playTrackForward,
  playTrackBackward,
  pauseTrack,
  resumeTrack,
  stopTrack,
  toggleTrackLoop,
  toggleTrackYoyo
} = useCubeDesigner(
  () => props.engine,
  () => props.activeMode
);

const selected = computed(() => state.value.solids.find(c => c.id === state.value.selectedId));
const createLabel = computed(() => '在中心生成 3D 正方体');
const panelTitle = computed(() => {
  if (props.activeMode !== 'geometry') return '正方体控制器';
  if (state.value.selectedType === 'cylinder-2d') return '2D 圆柱控制器';
  if (state.value.selectedType === 'cone-2d') return '2D 圆锥控制器';
  return '2D 立体控制器';
});

// 计算针对普通cube特调的属性
const cubeUnfoldProgress = computed(() => {
  const t = fastState.value.tracks.find(t => t.id === 'unfold');
  return t ? t.progress : 0;
});
const cubeIsPlaying = computed(() => {
  const t = fastState.value.tracks.find(t => t.id === 'unfold');
  return t ? t.isAnimating : false;
});
const onCubeProgressChange = (e: Event) => {
  const val = parseFloat((e.target as HTMLInputElement).value);
  setTrackProgress('unfold', val);
};
</script>

<style scoped></style>
