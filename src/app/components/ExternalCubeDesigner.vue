<template>
  <div v-if="activeMode === '3d'" data-designer-ui="true" class="pointer-events-none absolute inset-0 z-30">
    <div data-designer-ui="true" class="pointer-events-auto absolute left-4 top-4 rounded-xl border border-slate-200 bg-white/95 px-3 py-2 shadow-sm backdrop-blur">
      <button
        @click="createCube"
        class="flex cursor-pointer items-center gap-2 rounded-lg bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors"
      >
        <span class="inline-block h-4 w-4 rounded-sm border-2 border-indigo-500 bg-indigo-100"></span>
        在中心生成 3D 正方体
      </button>
    </div>

    <div
      v-if="selected"
      class="pointer-events-auto absolute -translate-x-1/2 rounded-xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur w-72 max-w-[95vw] transition-all duration-300"
      :style="fastState.toolbarStyle"
      data-designer-ui="true"
    >
      <div class="mb-3 flex items-center justify-between border-b border-slate-100 pb-2">
        <h3 class="text-sm font-bold text-slate-700 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-indigo-500" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.286 1.006l-6.906 6.906a1 1 0 01-1.414 0l-6.906-6.906a1 1 0 01-.286-1.006l1.738-5.42-1.233-.616a1 1 0 01.894-1.79l1.599.8L9 4.323V3a1 1 0 011-1z" clip-rule="evenodd" />
          </svg>
          正方体控制器
        </h3>
        <span class="text-[10px] font-mono text-slate-400 font-medium px-2 py-0.5 bg-slate-100 rounded-full">
          {{ (fastState.unfoldProgress * 100).toFixed(0) }}%
        </span>
      </div>

      <div class="space-y-4">
        <!-- 动画控制按钮 -->
        <div class="grid grid-cols-2 gap-2">
          <button 
            class="flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:text-indigo-600 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
            :disabled="isPlaying || fastState.unfoldProgress >= 1"
            @click="playUnfold"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 01-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15 13.586V12a1 1 0 011-1z" clip-rule="evenodd" />
            </svg>
            开始展开
          </button>
          <button 
            class="flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:text-indigo-600 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
            :disabled="isPlaying || fastState.unfoldProgress <= 0"
            @click="playFold"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M5 3a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V5a2 2 0 00-2-2H5zm0 2h10v7h-2l-1 2H8l-1-2H5V5z" clip-rule="evenodd" />
            </svg>
            折叠收起
          </button>
        </div>

        <div v-if="isPlaying" class="flex justify-center">
          <button class="text-xs text-red-500 hover:text-red-700 underline" @click="stopAnim">停止动画</button>
        </div>

        <!-- 手动滑块 -->
        <div class="space-y-1.5 pt-2">
          <div class="flex items-center justify-between px-1">
            <span class="text-[10px] text-slate-500">手动调节</span>
            <span class="text-[10px] text-indigo-500 font-medium" v-if="isPlaying">正在动画中...</span>
          </div>
          <input 
            type="range" 
            min="0" 
            max="1" 
            step="0.01"
            class="w-full accent-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 rounded-lg cursor-pointer"
            :value="fastState.unfoldProgress"
            @input="e => !isPlaying && setProgress(Number((e.target as HTMLInputElement).value))"
            :disabled="isPlaying"
          />
          <div class="flex justify-between text-[9px] text-slate-400 px-1">
            <span>折叠 (0%)</span>
            <span>完全展开 (100%)</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { EngineMode } from '../../core/engine/GraphXEngine';
import type { GraphXEngine } from '../../core/engine/GraphXEngine';
import { useCubeDesigner } from '../composables/useCubeDesigner';
import { computed } from 'vue';

const props = defineProps<{
  engine: GraphXEngine | null;
  activeMode: EngineMode;
}>();

const {
  state,
  fastState,
  isPlaying,
  createCube,
  setProgress,
  playUnfold,
  playFold,
  stopAnim
} = useCubeDesigner(
  () => props.engine,
  () => props.activeMode
);

const selected = computed(() => state.value.cubes.find(c => c.id === state.value.selectedId));
</script>

<style scoped>
input[type=range] {
  -webkit-appearance: none;
  background: #e2e8f0;
  height: 6px;
  border-radius: 9999px;
  transition: opacity .2s;
}

input[type=range]:disabled {
  opacity: 0.5;
}

input[type=range]:focus {
  outline: none;
}

input[type=range]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #6366f1;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  transition: transform 0.1s;
}

input[type=range]::-webkit-slider-thumb:hover {
  transform: scale(1.1);
}

input[type=range]::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #6366f1;
  cursor: pointer;
  border: none;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  transition: transform 0.1s;
}

input[type=range]::-moz-range-thumb:hover {
  transform: scale(1.1);
}
</style>
