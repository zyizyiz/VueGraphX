<template>
  <div class="flex h-full flex-col overflow-y-auto overflow-x-hidden bg-white p-4">
    <section class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p class="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-indigo-700">Dual Layer Mode</p>
      <h2 class="text-2xl font-bold tracking-tight text-slate-900">双层协同区</h2>
      <p class="mt-3 text-sm leading-6 text-slate-600">
        此模式下包含两个独立的绘图层：顶层 2D 画板与底层 3D 空间。
        你可以同时在这两个层级中添加图形。
      </p>
    </section>

    <section class="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div class="mb-4 flex items-center justify-between">
        <h3 class="text-sm font-bold text-slate-800">图形投放</h3>
        <span class="rounded-full bg-indigo-50 px-2 py-1 text-[11px] font-semibold text-indigo-700">跨层操作</span>
      </div>

      <div class="grid grid-cols-1 gap-3">
        <button 
          @click="$emit('addShape', '2d', 'triangle')"
          class="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition-all hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 group"
        >
          <div class="flex h-8 w-8 items-center justify-center rounded-md bg-white shadow-sm group-hover:bg-indigo-600 group-hover:text-white transition-colors">
            <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 4L4 20H20L12 4Z" />
            </svg>
          </div>
          <span>添加 2D 三角形</span>
        </button>

        <button 
          @click="$emit('addShape', '2d', 'circle')"
          class="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition-all hover:bg-sky-50 hover:border-sky-200 hover:text-sky-700 group"
        >
          <div class="flex h-8 w-8 items-center justify-center rounded-md bg-white shadow-sm group-hover:bg-sky-600 group-hover:text-white transition-colors">
            <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="8" />
            </svg>
          </div>
          <span>添加 2D 圆形</span>
        </button>

        <button 
          @click="$emit('addShape', '3d', 'wireframe-cube')"
          class="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition-all hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 group"
        >
          <div class="flex h-8 w-8 items-center justify-center rounded-md bg-white shadow-sm group-hover:bg-emerald-600 group-hover:text-white transition-colors">
            <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="4" y="4" width="16" height="16" />
              <path d="M4 4L9 9M20 20L15 15" />
            </svg>
          </div>
          <span>添加 3D 线框正方体</span>
        </button>
      </div>
    </section>

    <section class="mt-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-5 shadow-sm">
      <h3 class="text-sm font-bold text-slate-800">交互说明</h3>
      <ul class="mt-3 space-y-2 text-sm leading-6 text-slate-600">
        <li>2D 图形始终漂浮在 3D 场景之上。</li>
        <li>拖动正方体默认是旋转，按住 <code>Shift</code> 再拖动才是整体平移。</li>
        <li>2D 和 3D 的空白区域会继续向下透传到底部控件层。</li>
        <li>点到正方体本体时，仍然可以直接拖拽或旋转它。</li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
defineEmits<{
  addShape: [layer: '2d' | '3d', type: string]
}>();
</script>
