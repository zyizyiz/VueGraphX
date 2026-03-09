<template>
  <div class="flex h-full flex-col overflow-y-auto overflow-x-hidden bg-white p-4">
    <section class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p class="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-700">Mixed Mode</p>
      <h2 class="text-2xl font-bold tracking-tight text-slate-900">统一坐标轴</h2>
      <p class="mt-3 text-sm leading-6 text-slate-600">
        当前混合模式把平面对象放在 z = 0 工作平面上，立体对象放在同一坐标系内。整体只允许平移与缩放，不旋转全局坐标轴。
      </p>
    </section>

    <section class="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div class="mb-4 flex items-center justify-between">
        <h3 class="text-sm font-bold text-slate-800">立方体姿态</h3>
        <span class="rounded-full bg-sky-50 px-2 py-1 text-[11px] font-semibold text-sky-700">对象级旋转</span>
      </div>

      <div class="space-y-4">
        <div>
          <div class="mb-1 flex items-center justify-between text-xs font-semibold text-slate-600">
            <label for="mixed-rotate-x">绕 X 轴</label>
            <span>{{ rotationX }}°</span>
          </div>
          <input id="mixed-rotate-x" :value="rotationX" type="range" min="-180" max="180" step="1" class="w-full accent-sky-600" @input="emitValue('rotationX', $event)" />
        </div>

        <div>
          <div class="mb-1 flex items-center justify-between text-xs font-semibold text-slate-600">
            <label for="mixed-rotate-y">绕 Y 轴</label>
            <span>{{ rotationY }}°</span>
          </div>
          <input id="mixed-rotate-y" :value="rotationY" type="range" min="-180" max="180" step="1" class="w-full accent-sky-600" @input="emitValue('rotationY', $event)" />
        </div>

        <div>
          <div class="mb-1 flex items-center justify-between text-xs font-semibold text-slate-600">
            <label for="mixed-rotate-z">绕 Z 轴</label>
            <span>{{ rotationZ }}°</span>
          </div>
          <input id="mixed-rotate-z" :value="rotationZ" type="range" min="-180" max="180" step="1" class="w-full accent-sky-600" @input="emitValue('rotationZ', $event)" />
        </div>
      </div>

      <div class="mt-5 grid grid-cols-2 gap-3">
        <button class="rounded-lg bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sky-600" @click="$emit('resetCube')">
          重置立方体
        </button>
        <button class="rounded-lg bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-200" @click="$emit('resetView')">
          重置视图
        </button>
      </div>
    </section>

    <section class="mt-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-5 shadow-sm">
      <h3 class="text-sm font-bold text-slate-800">当前约束</h3>
      <ul class="mt-3 space-y-2 text-sm leading-6 text-slate-600">
        <li>函数与平面几何，当前按 2D 语义理解，落在 z = 0 平面。</li>
        <li>立体对象独立维护自己的局部旋转，不改全局坐标轴。</li>
        <li>混合模式底层仍复用 3D 视图，但交互是固定正视角方案。</li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  rotationX: number;
  rotationY: number;
  rotationZ: number;
}>();

const emit = defineEmits<{
  'update:rotationX': [value: number];
  'update:rotationY': [value: number];
  'update:rotationZ': [value: number];
  resetCube: [];
  resetView: [];
}>();

const emitValue = (axis: 'rotationX' | 'rotationY' | 'rotationZ', event: Event) => {
  const value = Number((event.target as HTMLInputElement).value);
  if (axis === 'rotationX') {
    emit('update:rotationX', value);
    return;
  }

  if (axis === 'rotationY') {
    emit('update:rotationY', value);
    return;
  }

  emit('update:rotationZ', value);
};
</script>