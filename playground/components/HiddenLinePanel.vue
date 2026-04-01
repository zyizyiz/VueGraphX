<template>
  <div class="border-t border-slate-100 bg-white px-4 py-4 shrink-0 space-y-3">
    <div class="flex items-start justify-between gap-3">
      <div>
        <p class="text-xs font-semibold text-slate-600 uppercase tracking-wider">Hidden Line</p>
        <p class="text-[11px] text-slate-400 mt-1">3D / 双层模式下的隐线调试与质量档位</p>
      </div>
      <span
        class="rounded-full px-2 py-1 text-[10px] font-semibold"
        :class="supportsHiddenLine ? 'bg-sky-50 text-sky-700' : 'bg-slate-100 text-slate-500'"
      >
        {{ supportsHiddenLine ? '可用' : '仅 3D 可用' }}
      </span>
    </div>

    <div v-if="supportsHiddenLine && snapshot" class="space-y-3">
      <div class="grid grid-cols-2 gap-2">
        <label class="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600">
          <span>启用隐线</span>
          <input
            :checked="isEnabled"
            type="checkbox"
            class="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
            @change="handleEnabledChange"
          />
        </label>
        <label class="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600">
          <span>调试诊断</span>
          <input
            :checked="snapshot.options.debug === true"
            type="checkbox"
            class="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
            @change="handleDebugChange"
          />
        </label>
      </div>

      <label class="block space-y-1">
        <span class="text-[11px] font-semibold text-slate-500">质量 / 性能档位</span>
        <select
          :value="currentProfile"
          class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 outline-none transition-colors focus:border-sky-300"
          @change="handleProfileChange"
        >
          <option
            v-for="profile in profileOptions"
            :key="profile"
            :value="profile"
          >
            {{ profileLabelMap[profile] }}
          </option>
        </select>
      </label>

      <div class="grid grid-cols-3 gap-2">
        <div class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <p class="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Sources</p>
          <p class="mt-1 text-sm font-semibold text-slate-700">{{ snapshot.sourceCount }}</p>
          <p class="text-[11px] text-slate-400">解析 {{ snapshot.stats.resolvedSourceCount }}</p>
        </div>
        <div class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <p class="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Segments</p>
          <p class="mt-1 text-sm font-semibold text-slate-700">{{ snapshot.stats.renderedPathCount }}</p>
          <p class="text-[11px] text-slate-400">可绘制路径</p>
        </div>
        <div class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <p class="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Diagnostics</p>
          <p class="mt-1 text-sm font-semibold text-slate-700">{{ snapshot.diagnostics.length }}</p>
          <p class="text-[11px] text-slate-400">最新一轮</p>
        </div>
        <div class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <p class="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Triangles</p>
          <p class="mt-1 text-sm font-semibold text-slate-700">{{ snapshot.stats.triangleCount }}</p>
          <p class="text-[11px] text-slate-400">遮挡面片</p>
        </div>
        <div class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <p class="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Polylines</p>
          <p class="mt-1 text-sm font-semibold text-slate-700">{{ snapshot.stats.polylineCount }}</p>
          <p class="text-[11px] text-slate-400">边线集合</p>
        </div>
        <div class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <p class="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Skipped</p>
          <p class="mt-1 text-sm font-semibold text-slate-700">{{ snapshot.stats.skippedSourceCount }}</p>
          <p class="text-[11px] text-slate-400">跳过 / 失败</p>
        </div>
      </div>

      <div class="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
        <div class="text-[11px] text-slate-500">
          <span class="font-semibold text-slate-700">Precision:</span>
          {{ snapshot.options.precision ?? 'balanced' }}
        </div>
        <button
          type="button"
          class="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 transition-colors hover:bg-slate-100"
          @click="refreshSnapshot"
        >
          刷新快照
        </button>
      </div>

      <div v-if="snapshot.diagnostics.length > 0" class="rounded-xl border border-amber-200 bg-amber-50 p-3">
        <p class="text-[11px] font-semibold text-amber-700">Runtime Diagnostics</p>
        <ul class="mt-2 space-y-1.5">
          <li
            v-for="(diagnostic, index) in snapshot.diagnostics.slice(0, 4)"
            :key="`${diagnostic.code}-${index}`"
            class="text-[11px] leading-5 text-amber-800"
          >
            {{ diagnostic.code }} · {{ diagnostic.message }}
          </li>
        </ul>
      </div>
    </div>

    <div v-else class="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-[11px] leading-5 text-slate-500">
      当前模式下没有 hidden-line 运行时。切到 `3d` 或 `dual-layer` 后，这里会显示 source 数、遮挡统计和 diagnostics。
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue';
import type { GraphHiddenLineProfile, GraphXEngine } from 'vuegraphx';
import { useHiddenLineDebug } from '../composables/useHiddenLineDebug';
import type { PlaygroundMode } from '../types/mode';

const props = defineProps<{
  engine: GraphXEngine | null;
  activeMode: PlaygroundMode;
}>();

const profileLabelMap: Record<GraphHiddenLineProfile, string> = {
  performance: '性能优先',
  balanced: '平衡',
  quality: '质量优先'
};

const {
  snapshot,
  supportsHiddenLine,
  profileOptions,
  currentProfile,
  isEnabled,
  refreshSnapshot,
  setEnabled,
  setDebug,
  setProfile
} = useHiddenLineDebug({
  getEngine: () => props.engine,
  getActiveMode: () => props.activeMode
});

let refreshTimer: number | null = null;

const startRefreshLoop = () => {
  stopRefreshLoop();
  refreshSnapshot();
  refreshTimer = window.setInterval(() => {
    refreshSnapshot();
  }, 400);
};

const stopRefreshLoop = () => {
  if (refreshTimer !== null) {
    window.clearInterval(refreshTimer);
    refreshTimer = null;
  }
};

const handleEnabledChange = (event: Event) => {
  const target = event.target as HTMLInputElement | null;
  setEnabled(target?.checked === true);
};

const handleDebugChange = (event: Event) => {
  const target = event.target as HTMLInputElement | null;
  setDebug(target?.checked === true);
};

const handleProfileChange = (event: Event) => {
  const target = event.target as HTMLSelectElement | null;
  const value = target?.value as GraphHiddenLineProfile | undefined;
  if (!value || !profileOptions.includes(value)) return;
  setProfile(value);
};

watch(
  () => [props.engine, props.activeMode] as const,
  () => {
    if (!props.engine || !supportsHiddenLine.value) {
      stopRefreshLoop();
      refreshSnapshot();
      return;
    }

    startRefreshLoop();
  },
  { immediate: true }
);

onMounted(() => {
  if (props.engine && supportsHiddenLine.value) {
    startRefreshLoop();
  }
});

onUnmounted(() => {
  stopRefreshLoop();
});
</script>
