<template>
  <div v-if="tracks.length > 0" class="rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs text-slate-600">
    <div class="mb-2 flex items-center justify-between">
      <span class="font-semibold text-slate-700">{{ title }}</span>
      <span v-if="isAnyTrackPlaying" :class="themeStyles.statusClass">动画运行中</span>
    </div>
    <div class="space-y-2">
      <div
        v-for="track in tracks"
        :key="track.id"
        class="rounded-md border border-slate-200 bg-white p-2"
      >
        <div class="mb-1 flex items-center justify-between">
          <span class="font-medium text-slate-700">{{ track.label }}</span>
          <div class="flex items-center gap-1.5">
            <span v-if="track.isPaused" class="text-[10px] font-medium text-amber-500">已暂停</span>
            <span class="text-[10px] font-mono text-slate-400">{{ (track.progress * 100).toFixed(0) }}%</span>
          </div>
        </div>
        <div class="mb-2 grid grid-cols-4 gap-1.5">
          <button class="mini-btn" :disabled="track.isAnimating || track.progress >= track.max" @click="$emit('play-forward', track.id)">播放</button>
          <button class="mini-btn" :disabled="track.isAnimating || track.progress <= track.min" @click="$emit('play-backward', track.id)">反向</button>
          <button class="mini-btn" :disabled="!track.isAnimating || track.isPaused" @click="$emit('pause', track.id)">暂停</button>
          <button class="mini-btn" :disabled="!track.isPaused" @click="$emit('resume', track.id)">恢复</button>
        </div>
        <div class="mb-2 grid grid-cols-3 gap-1.5">
          <button class="mini-btn" :disabled="!track.isAnimating" @click="$emit('stop', track.id)">停止</button>
          <button class="mini-btn" :class="track.loop ? themeStyles.toggleActiveClass : ''" @click="$emit('toggle-loop', track.id, !track.loop)">循环</button>
          <button class="mini-btn" :class="track.yoyo ? themeStyles.toggleActiveClass : ''" @click="$emit('toggle-yoyo', track.id, !track.yoyo)">往返</button>
        </div>
        <input
          type="range"
          :min="track.min"
          :max="track.max"
          :step="track.step"
          :style="{ accentColor: themeStyles.accentColor, color: themeStyles.accentColor }"
          class="track-slider w-full focus:outline-none focus:ring-2 rounded-lg cursor-pointer"
          :class="themeStyles.ringClass"
          :value="track.progress"
          @input="onTrackInput(track.id, $event)"
          :disabled="track.isAnimating && !track.isPaused"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { DesignerAnimationTrackState } from '../types/animation';

const props = withDefaults(defineProps<{
  tracks: DesignerAnimationTrackState[];
  title?: string;
  theme?: 'sky' | 'indigo';
}>(), {
  title: '动画轨道',
  theme: 'sky'
});

const emit = defineEmits<{
  'set-progress': [trackId: string, value: number];
  'play-forward': [trackId: string];
  'play-backward': [trackId: string];
  pause: [trackId: string];
  resume: [trackId: string];
  stop: [trackId: string];
  'toggle-loop': [trackId: string, value: boolean];
  'toggle-yoyo': [trackId: string, value: boolean];
}>();

const themeStyles = computed(() => {
  if (props.theme === 'indigo') {
    return {
      accentColor: '#6366f1',
      statusClass: 'text-[10px] text-indigo-500 font-medium',
      ringClass: 'focus:ring-indigo-200',
      toggleActiveClass: '!border-indigo-300 !bg-indigo-50 !text-indigo-700'
    };
  }

  return {
    accentColor: '#0ea5e9',
    statusClass: 'text-[10px] text-sky-600 font-medium',
    ringClass: 'focus:ring-sky-200',
    toggleActiveClass: '!border-sky-300 !bg-sky-50 !text-sky-700'
  };
});

const isAnyTrackPlaying = computed(() => props.tracks.some((track) => track.isAnimating));

const onTrackInput = (trackId: string, event: Event) => {
  const target = event.target as HTMLInputElement | null;
  if (!target) return;
  emit('set-progress', trackId, Number(target.value));
};
</script>

<style scoped>
.track-slider {
  -webkit-appearance: none;
  background: #e2e8f0;
  height: 6px;
  border-radius: 9999px;
  transition: opacity .2s;
}

.track-slider:disabled {
  opacity: 0.5;
}

.track-slider:focus {
  outline: none;
}

.track-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: currentColor;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: transform 0.1s;
}

.track-slider::-webkit-slider-thumb:hover {
  transform: scale(1.1);
}

.track-slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: currentColor;
  cursor: pointer;
  border: none;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: transform 0.1s;
}

.track-slider::-moz-range-thumb:hover {
  transform: scale(1.1);
}

.mini-btn {
  border-radius: 0.4rem;
  border: 1px solid #cbd5e1;
  background: #fff;
  padding: 0.2rem 0.45rem;
  font-size: 11px;
  color: #334155;
}

.mini-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>