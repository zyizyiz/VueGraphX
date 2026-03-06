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
          {{ fastState.tracks.length }} 条轨道
        </span>
        <span v-if="isAnyTrackPlaying" class="text-[10px] text-indigo-500 font-medium">动画运行中</span>
      </div>

      <AnimationTracksPanel
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
  isAnyTrackPlaying,
  createCube,
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

const selected = computed(() => state.value.cubes.find(c => c.id === state.value.selectedId));
</script>

<style scoped></style>
