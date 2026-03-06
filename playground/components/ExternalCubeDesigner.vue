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
      <div class="mb-3 flex items-center justify-between border-b border-slate-100 pb-2">
        <h3 class="text-sm font-bold text-slate-700 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-indigo-500" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.286 1.006l-6.906 6.906a1 1 0 01-1.414 0l-6.906-6.906a1 1 0 01-.286-1.006l1.738-5.42-1.233-.616a1 1 0 01.894-1.79l1.599.8L9 4.323V3a1 1 0 011-1z" clip-rule="evenodd" />
          </svg>
          {{ panelTitle }}
        </h3>
        <span class="text-[10px] font-mono text-slate-400 font-medium px-2 py-0.5 bg-slate-100 rounded-full">
          {{ fastState.tracks.length }} 条轨道
        </span>
        <span v-if="isAnyTrackPlaying" class="text-[10px] text-indigo-500 font-medium">动画运行中</span>
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
  isAnyTrackPlaying,
  createCube,
  createGeometrySolid,
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
</script>

<style scoped></style>
