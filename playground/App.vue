<template>
  <div class="h-screen w-full flex flex-col bg-slate-50 overflow-hidden text-slate-800 font-sans selection:bg-sky-100 selection:text-sky-900">

    <!-- 顶部功能模式栏 -->
    <header class="h-14 border-b border-slate-200 bg-white flex items-center justify-between px-6 shrink-0 z-20 shadow-sm relative">
      <div class="flex items-center gap-4">
        <h1 class="text-xl font-extrabold tracking-tight text-slate-900 flex items-center gap-1.5">
          VueGraph<span class="text-sky-500">X</span>
        </h1>
        <div class="h-5 w-px bg-slate-200 mx-2"></div>
        <nav class="flex items-center gap-1">
          <button
            v-for="mode in availableModes" :key="mode.id"
            @click="switchMode(mode.id)"
            class="px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2"
            :class="store.activeMode === mode.id ? 'bg-[#f0f9ff] text-[#0369a1]' : 'text-slate-600 hover:bg-slate-100'"
          >
            <span v-html="mode.icon" class="w-4 h-4 opacity-80"></span>
            {{ mode.label }}
          </button>
        </nav>
      </div>

      <div class="flex items-center gap-3">
        <label class="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-600">
          <span>后端</span>
          <select
            :value="activeRendererBackend"
            class="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 outline-none disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
            @change="handleRendererBackendChange"
          >
            <option
              v-for="backend in rendererBackends"
              :key="backend.id"
              :value="backend.id"
              :disabled="!isRendererBackendSupported(backend.id)"
            >
              {{ backend.label }}
            </option>
          </select>
        </label>
        <span class="hidden max-w-[220px] truncate text-[11px] text-slate-400 lg:inline">
          {{ rendererBackendHint }}
        </span>
        <button
          v-if="supportsSceneDocument && !isCoreRendererActive"
          @click="showScenePanel = !showScenePanel"
          class="text-xs font-semibold px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded transition-colors hidden sm:block"
        >
          {{ showScenePanel ? '收起场景' : '场景文档' }}
        </button>
        <button @click="clearAll" class="text-xs font-semibold px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded transition-colors hidden sm:block">
          清除全部
        </button>
      </div>
    </header>

    <div class="flex-1 flex overflow-hidden relative">
      <!-- 左侧控制面板 -->
      <aside ref="sidebarRef" class="w-80 sm:w-96 bg-white border-r border-slate-200 shadow-[2px_0_8px_rgba(0,0,0,0.02)] flex flex-col z-10 shrink-0 h-full min-h-0">

        <OperationPanel
          v-if="store.activeMode === 'operation'"
          class="flex-1"
          @create-commands="handleCreateOperationCommands"
        />

        <!-- 指令多行表单流列表 -->
        <div v-else class="flex-1 overflow-y-auto overflow-x-hidden p-2">
          <div
            v-for="(cmd, index) in store.commands" :key="cmd.id"
            class="group relative border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors"
          >
            <div class="absolute left-0 top-0 bottom-0 w-12 flex flex-col items-center justify-start pt-5 border-r border-slate-100">
              <span class="text-[10px] text-slate-400 font-bold mb-1.5">{{ index + 1 }}</span>
              <div
                class="w-3.5 h-3.5 rounded-full ring-2 ring-white shadow-sm transition-all"
                :style="{ backgroundColor: cmd.color, opacity: cmd.visible ? 1 : 0.4 }"
              ></div>
            </div>

            <div class="pl-14 pr-10 py-3 relative">
              <!-- LaTeX 实时渲染预览 (当输入包含反斜杠时出现) -->
              <div
                v-if="cmd.expression.includes('\\') && !cmd.isFocused"
                class="text-base font-mono mb-1 px-0.5 cursor-text"
                @click="cmd.isFocused = true"
                v-html="renderLatexPreview(cmd.expression)"
              ></div>
              <textarea
                v-else
                v-model="cmd.expression"
                @focus="cmd.isFocused = true"
                @keydown.enter.prevent="handleLineEnter(cmd.id, index)"
                @blur="cmd.isFocused = false; syncAllToEngine()"
                rows="1"
                class="block w-full bg-transparent border-0 focus:ring-0 p-0 text-slate-800 font-mono text-[15px] resize-none overflow-hidden outline-none placeholder-slate-300 leading-relaxed"
                :class="{'text-red-500': cmd.error}"
                placeholder="输入公式或点..."
                spellcheck="false"
                style="min-height: 24px"
              ></textarea>

              <p v-if="cmd.error" class="text-xs text-red-500 mt-2 flex items-center gap-1 font-medium bg-red-50 p-1.5 rounded">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                </svg>
                <span class="truncate">{{ cmd.error }}</span>
              </p>
            </div>

            <button
              @click="removeLine(cmd.id)"
              class="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all rounded-md hover:bg-red-50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
              </svg>
            </button>
          </div>

          <div
            @click="store.addCommand('')"
            class="pl-14 py-4 text-slate-400 hover:text-sky-600 font-medium text-sm cursor-text border-b border-transparent transition-colors flex items-center gap-2"
          >
            <span class="text-xl font-light leading-none">+</span> 点击添加新表达式
          </div>
        </div>

        <div
          class="sidebar-bottom-dock shrink-0 border-t border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85 flex flex-col overflow-hidden"
          :style="sidebarBottomStyle"
        >
          <button
            type="button"
            class="sidebar-bottom-resize-handle"
            :class="{ 'sidebar-bottom-resize-handle-active': isSidebarBottomResizing }"
            @pointerdown="startSidebarBottomResize"
          >
            <span class="sidebar-bottom-resize-handle-bar"></span>
          </button>

          <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <div v-if="supportsSceneDocument && !isCoreRendererActive && showScenePanel" class="border-t border-slate-100 bg-white px-4 py-4 space-y-3">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-xs font-semibold text-slate-600 uppercase tracking-wider">Scene Document</p>
                  <p class="text-[11px] text-slate-400 mt-1">导出 JSON / 导入替换当前场景</p>
                </div>
                <span
                  v-if="sceneLastStatus"
                  class="rounded-full px-2 py-1 text-[10px] font-semibold"
                  :class="sceneErrorCount > 0 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'"
                >
                  {{ sceneLastStatus }}
                </span>
              </div>

              <textarea
                v-model="sceneText"
                rows="10"
                class="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs font-mono text-slate-700 outline-none transition-colors focus:border-sky-300 focus:bg-white"
                placeholder="点击“导出当前”生成 scene JSON，或粘贴 scene 后点击“导入替换”。"
                spellcheck="false"
              ></textarea>

              <div class="flex flex-wrap gap-2">
                <button
                  type="button"
                  class="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-700"
                  @click="handleExportScene"
                >
                  导出当前
                </button>
                <button
                  type="button"
                  class="rounded-lg bg-sky-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-sky-500"
                  @click="handleImportScene"
                >
                  导入替换
                </button>
                <button
                  type="button"
                  class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                  @click="clearSceneDocument()"
                >
                  清空文本
                </button>
              </div>

              <div v-if="sceneDiagnostics.length > 0" class="rounded-xl border border-amber-200 bg-amber-50 p-3">
                <p class="text-[11px] font-semibold text-amber-700">Diagnostics</p>
                <ul class="mt-2 space-y-1.5">
                  <li
                    v-for="(diagnostic, index) in sceneDiagnostics.slice(0, 5)"
                    :key="`${diagnostic.code}-${index}`"
                    class="text-[11px] leading-5 text-amber-800"
                  >
                    {{ diagnostic.code }} · {{ diagnostic.message }}
                  </li>
                </ul>
              </div>
            </div>

            <div class="border-t border-slate-100 bg-white px-4 py-4">
              <div class="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <p class="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Backend Capability</p>
                    <h3 class="mt-1 text-sm font-bold text-slate-800">{{ activeBackendCapability.label }}</h3>
                  </div>
                  <span
                    class="rounded-full px-2 py-1 text-[10px] font-semibold"
                    :class="isCoreRendererActive ? 'bg-sky-50 text-sky-700' : 'bg-slate-100 text-slate-600'"
                  >
                    {{ isCoreRendererActive ? 'Core runtime' : 'Compatibility' }}
                  </span>
                </div>
                <p class="mt-2 text-[11px] leading-5 text-slate-600">{{ activeBackendCapability.summary }}</p>
                <div class="mt-3 flex flex-wrap gap-1.5">
                  <span
                    v-for="item in activeBackendCapability.supported"
                    :key="`supported-${activeRendererBackend}-${item}`"
                    class="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700"
                  >
                    {{ item }}
                  </span>
                </div>
                <div v-if="activeBackendCapability.unsupported.length > 0" class="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                  <p class="text-[10px] font-semibold uppercase tracking-wider text-amber-700">Unsupported / honest gaps</p>
                  <ul class="mt-1 space-y-1">
                    <li
                      v-for="item in activeBackendCapability.unsupported"
                      :key="`unsupported-${activeRendererBackend}-${item}`"
                      class="text-[11px] leading-5 text-amber-800"
                    >
                      {{ item }}
                    </li>
                  </ul>
                </div>
                <div v-if="coreSceneSummary" class="mt-3 grid grid-cols-3 gap-2 text-center">
                  <div class="rounded-lg bg-slate-50 px-2 py-2">
                    <p class="text-[10px] text-slate-400">输入</p>
                    <p class="text-sm font-bold text-slate-700">{{ coreSceneSummary.commandCount }}</p>
                  </div>
                  <div class="rounded-lg bg-sky-50 px-2 py-2">
                    <p class="text-[10px] text-sky-500">渲染节点</p>
                    <p class="text-sm font-bold text-sky-700">{{ coreSceneSummary.nodeCount }}</p>
                  </div>
                  <div class="rounded-lg bg-amber-50 px-2 py-2">
                    <p class="text-[10px] text-amber-600">诊断</p>
                    <p class="text-sm font-bold text-amber-700">{{ coreSceneSummary.diagnosticCount }}</p>
                  </div>
                </div>
                <div v-if="isCoreRendererActive" class="mt-3 rounded-xl border border-sky-200 bg-sky-50 px-3 py-3 text-[11px] leading-5 text-sky-800">
                  {{ coreRendererPanelMessage }}
                  <span v-if="coreSelectedObjectId" class="mt-1 block font-semibold">当前选中：{{ coreSelectedObjectId }}</span>
                </div>
                <div class="mt-3 grid grid-cols-2 gap-1.5">
                  <div
                    v-for="item in activeBackendCapability.interactions"
                    :key="`interaction-${activeRendererBackend}-${item.id}`"
                    class="rounded-lg border px-2 py-1.5"
                    :class="interactionStatusClass(item.status)"
                  >
                    <p class="text-[10px] font-semibold">{{ item.label }}</p>
                    <p class="text-[10px]">{{ item.status }}</p>
                  </div>
                </div>
                <div v-if="coreInteractionDiagnostics.length > 0" class="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <p class="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Interaction diagnostics</p>
                  <ul class="mt-1 space-y-1">
                    <li
                      v-for="item in coreInteractionDiagnostics.slice(0, 5)"
                      :key="item"
                      class="text-[11px] leading-5 text-slate-700"
                    >
                      {{ item }}
                    </li>
                  </ul>
                </div>
              </div>
            </div>
            <RelationPanel v-if="!isCoreRendererActive" :engine="engineRef" :active-mode="store.activeMode" />
            <HiddenLinePanel v-if="!isCoreRendererActive" :engine="engineRef" :active-mode="store.activeMode" />

            <!-- Demo 示例区（多卡片可切换） -->
            <div class="border-t border-slate-100 bg-slate-50/80">
              <div class="px-4 pt-3 pb-1 flex items-center justify-between">
                <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">📚 示例场景</span>
                <span class="text-xs text-slate-400">点击卡片一键载入</span>
              </div>

              <div class="flex gap-2 px-3 pb-3 overflow-x-auto scrollbar-hide">
                <button
                  v-for="(demo, idx) in currentDemos"
                  :key="idx"
                  @click="loadSelectedDemo(idx)"
                  class="demo-card flex-shrink-0 w-36 p-2.5 text-left rounded-lg border transition-all duration-150 cursor-pointer"
                  :class="activeDemo === idx
                    ? 'border-sky-300 bg-sky-50 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'"
                >
                  <div class="text-lg mb-1">{{ demo.emoji }}</div>
                  <div class="text-xs font-semibold text-slate-700 leading-tight truncate">{{ demo.title }}</div>
                  <div class="text-[10px] text-slate-400 mt-0.5 leading-tight line-clamp-2">{{ demo.desc }}</div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <!-- 图形处理层 -->
      <main
        class="flex-1 relative bg-white flex items-center justify-center m-0 sm:m-4 shadow-sm border border-slate-200 overflow-hidden sm:rounded-xl z-0"
        @dragover="onDragOver"
        @drop="onDrop"
      >
        <div class="h-full w-full relative" id="graph-container">
          <div
            id="vuegraphx-mount"
            :class="[
              'absolute inset-0 z-[5] jxgbox',
              isCoreRendererActive ? 'core-interaction-surface' : ''
            ]"
            ref="graphContainerRef"
            @wheel.capture="handleCoreRendererWheel"
            @pointerdown.capture="handleCoreRendererPointerDown"
            @pointermove.capture="handleCoreRendererPointerMove"
            @pointerup.capture="handleCoreRendererPointerUp"
            @pointercancel.capture="handleCoreRendererPointerUp"
          ></div>
        </div>
        <ExternalCircleDesigner
          v-if="store.activeMode === 'geometry' && !isCoreRendererActive"
          :engine="engineRef"
          :active-mode="store.activeMode"
        />
        <ExternalCubeDesigner
          v-if="store.activeMode !== 'operation' && !isCoreRendererActive"
          :engine="engineRef"
          :active-mode="store.activeMode as EngineMode"
        />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { shallowRef, ref, onMounted, onUnmounted, nextTick, computed, watch } from 'vue';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { GraphXEngine, type EngineMode } from 'vuegraphx';
import {
  GraphSceneRuntime,
  createCenteredWorldBoundsForViewportGrid,
  resolveGraphViewportGridOptions,
  type GraphClientPoint,
  type GraphObjectNode,
  type GraphOperationDiagnostic,
  type GraphPickResult
} from '@vuegraphx/core';
import { createCanvas2DGraphBackend, type Canvas2DGraphBackend, type CanvasWorldBounds } from '@vuegraphx/backend-canvas2d';
import {
  createBabylonGraphBackend,
  createBabylonRuntime,
  type BabylonGraphBackend,
  type BabylonNamespaceLike,
  type BabylonRenderMode
} from '@vuegraphx/backend-babylon';
import { useFormulaStore, type CommandInput, type CommandItem } from './stores/formula';
import { useSceneDocument } from './composables/useSceneDocument';
import {
  buildPlaygroundBabylonScene,
  buildPlaygroundCanvasScene,
  PLAYGROUND_CANVAS_WORLD_BOUNDS
} from './renderers/canvasScene';
import { allDemos, playgroundBackendCapabilities, rendererBackends, type PlaygroundRenderBackend } from './showcase';
import { isBackendSelectableForMode } from './parityStatus';
import ExternalCircleDesigner from './components/ExternalCircleDesigner.vue';
import ExternalCubeDesigner from './components/ExternalCubeDesigner.vue';
import HiddenLinePanel from './components/HiddenLinePanel.vue';
import OperationPanel from './components/OperationPanel.vue';
import RelationPanel from './components/RelationPanel.vue';
import { OPERATION_COMMANDS_MIME, createOperationScopedCommands, resolveOperationCommandOrigin } from './operationTools';
import { registerPlaygroundShapes } from './shapes';
import { getBoardOptionsForPlaygroundMode, getEngineModeForPlayground, type PlaygroundMode } from './types/mode';
import {
  classifyCoreRendererWheelGesture,
  panFittedBoundsByPointerDelta,
  panFittedBoundsByWheelDelta,
  zoomFittedBoundsAroundClientPoint
} from './viewportBounds';

let nextOperationCoordinateSystemSequence = 1;

const readOperationCommandsFromDrop = (event: DragEvent): CommandInput[] | null => {
  const raw = event.dataTransfer?.getData(OPERATION_COMMANDS_MIME);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    const commands = parsed
      .map((item): CommandInput | null => {
        if (!item || typeof item !== 'object') return null;
        const record = item as Partial<CommandInput>;
        return typeof record.expr === 'string' && record.expr.trim()
          ? { expr: record.expr, options: record.options }
          : null;
      })
      .filter((item): item is CommandInput => item !== null);
    return commands.length > 0 ? commands : null;
  } catch {
    return null;
  }
};

const onDrop = (e: DragEvent) => {
  e.preventDefault();
  const operationCommands = readOperationCommandsFromDrop(e);
  if (operationCommands) {
    handleCreateOperationCommands(operationCommands, getCoreLocalPoint(e));
    return;
  }
  if (engineRef.value) {
    engineRef.value.handleDropEvent(e);
  }
};

const onDragOver = (e: DragEvent) => {
  e.preventDefault();
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'copy';
  }
};

const showScenePanel = ref(false);

// 顶部工具栏模式列表
const availableModes: {id: PlaygroundMode, label: string, icon: string}[] = [
  { id: '2d', label: '二维画板', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>' },
  { id: '3d', label: '3D计算器', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>' },
  { id: 'geometry', label: '几何区', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon></svg>' },
  { id: 'operation', label: '操作区', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="6" height="16" rx="1"></rect><rect x="13" y="4" width="8" height="16" rx="1"></rect><path d="M6 8h0M6 12h0M6 16h0"></path></svg>' }
];

const store = useFormulaStore();
const sidebarRef = ref<HTMLElement | null>(null);
const graphContainerRef = ref<HTMLElement | null>(null);
const activeDemo = ref<number>(-1);

const engineRef = shallowRef<GraphXEngine | null>(null);
const canvasBackendRef = shallowRef<Canvas2DGraphBackend | null>(null);
const canvasRuntimeRef = shallowRef<GraphSceneRuntime | null>(null);
const babylonBackendRef = shallowRef<BabylonGraphBackend | null>(null);
const babylonRuntimeRef = shallowRef<GraphSceneRuntime | null>(null);
const activeRendererBackend = ref<PlaygroundRenderBackend>('jsxgraph');
const babylonRuntimeError = ref('');
const sidebarBottomHeight = ref(420);
const sidebarBottomMaxHeight = ref(920);
const isSidebarBottomResizing = ref(false);
const coreViewportBounds = ref<CanvasWorldBounds>({ ...PLAYGROUND_CANVAS_WORLD_BOUNDS });
const coreInteractionDiagnostics = ref<string[]>([]);
const coreSelectedObjectId = ref<string>('');

interface CorePanSession {
  pointerId: number;
  startPoint: GraphClientPoint;
  startBounds: CanvasWorldBounds;
}

interface CorePinchSession {
  pointerIds: [number, number];
  startDistance: number;
  startCenter: GraphClientPoint;
  startBounds: CanvasWorldBounds;
}

interface CoordinateSystemDragSession {
  pointerId: number;
  objectId: string;
  backend: 'core' | 'jsxgraph';
  lastWorldPoint: { dimension: '2d'; x: number; y: number };
}

let corePanSession: CorePanSession | null = null;
let corePinchSession: CorePinchSession | null = null;
let coordinateSystemDragSession: CoordinateSystemDragSession | null = null;
const corePointers = new Map<number, GraphClientPoint>();

// 当前模式且当前后端可用的 Demo 列表
const currentDemos = computed(() => (
  allDemos[store.activeMode].filter((demo) => (
    !demo.compatibleBackends || demo.compatibleBackends.includes(activeRendererBackend.value)
  ))
));
const supportsCanvasRenderer = computed(() => isBackendSelectableForMode(store.activeMode, 'canvas2d'));
const supportsBabylonRenderer = computed(() => isBackendSelectableForMode(store.activeMode, 'babylon'));
const isCanvasRendererActive = computed(() => activeRendererBackend.value === 'canvas2d' && supportsCanvasRenderer.value);
const isBabylonRendererActive = computed(() => activeRendererBackend.value === 'babylon' && supportsBabylonRenderer.value);
const isCoreRendererActive = computed(() => isCanvasRendererActive.value || isBabylonRendererActive.value);
const rendererBackendHint = computed(() => {
  if (isBabylonRendererActive.value) return babylonRuntimeError.value || '同一份课程语义场景已切到 Babylon Core';
  if (isCanvasRendererActive.value) return '同一份课程语义场景已切到 Canvas2D Core';
  if (store.activeMode === 'operation') return '操作区支持 JSXGraph / Canvas2D / Babylon 共用命令链路';
  return 'JSXGraph 与 Canvas2D / Babylon 共用课程 parity 合同';
});
const coreRendererPanelMessage = computed(() => {
  if (isBabylonRendererActive.value) {
    return babylonRuntimeError.value
      || 'Babylon 后端正在通过 GraphSceneRuntime 渲染同一份课程语义场景；2D 对象使用原生 mesh proxy，Solid 使用原生 Babylon mesh。';
  }
  return 'Canvas2D 后端正在用同一份课程语义场景渲染 core IR；Equation / Parabola / Solid 会降维为可绘制教学对象。';
});
const isRendererBackendSupported = (backend: PlaygroundRenderBackend): boolean => (
  isBackendSelectableForMode(store.activeMode, backend)
);
const activeBackendCapability = computed(() => playgroundBackendCapabilities[activeRendererBackend.value]);
const coreSceneSummary = computed(() => {
  if (!isCoreRendererActive.value) return null;
  const result = isBabylonRendererActive.value
    ? buildPlaygroundBabylonScene(store.commands, { renderMode: getBabylonRenderModeForCurrentMode() })
    : buildPlaygroundCanvasScene(store.commands);
  return {
    commandCount: store.commands.filter((command) => command.expression.trim()).length,
    nodeCount: result.nodes.length,
    diagnosticCount: result.diagnostics.length
  };
});
const interactionStatusClass = (status: string) => {
  if (status === 'supported') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (status === 'partial-support') return 'border-amber-200 bg-amber-50 text-amber-700';
  return 'border-rose-200 bg-rose-50 text-rose-700';
};
const SIDEBAR_BOTTOM_MIN_HEIGHT = 220;
const SIDEBAR_BOTTOM_DEFAULT_HEIGHT = 400;
const SIDEBAR_BOTTOM_ABSOLUTE_MAX = 720;

const clampSidebarBottomHeight = (value: number) => {
  const min = SIDEBAR_BOTTOM_MIN_HEIGHT;
  const max = Math.max(min, sidebarBottomMaxHeight.value);
  return Math.min(Math.max(value, min), max);
};

const sidebarBottomStyle = computed(() => ({
  height: `${clampSidebarBottomHeight(sidebarBottomHeight.value)}px`,
  maxHeight: `${sidebarBottomMaxHeight.value}px`
}));

const syncSidebarBottomConstraints = () => {
  const sidebarHeight = sidebarRef.value?.clientHeight ?? 0;
  if (!sidebarHeight) return;

  const proportionalMax = Math.floor(sidebarHeight * 0.74);
  const preserveTopPane = sidebarHeight - 120;
  const nextMax = Math.max(
    SIDEBAR_BOTTOM_MIN_HEIGHT,
    Math.min(SIDEBAR_BOTTOM_ABSOLUTE_MAX, proportionalMax, preserveTopPane)
  );

  sidebarBottomMaxHeight.value = nextMax;
  sidebarBottomHeight.value = clampSidebarBottomHeight(
    sidebarBottomHeight.value || Math.min(SIDEBAR_BOTTOM_DEFAULT_HEIGHT, nextMax)
  );
};

// LaTeX 实时渲染预览（支持剥离首尾常见的 $ 或者 $$ 包裹符号）
const renderLatexPreview = (expr: string): string => {
  try {
    const pureExpr = expr.replace(/^\$+(.*?)\$+$/, '$1').trim();
    return katex.renderToString(pureExpr, { throwOnError: true, displayMode: false });
  } catch {
    return `<span class="font-mono text-sm text-slate-600">${expr}</span>`;
  }
};

const getGraphViewportSize = () => {
  const element = graphContainerRef.value;
  return {
    width: element?.clientWidth ?? 0,
    height: element?.clientHeight ?? 0
  };
};

const waitForUiPaint = async () => {
  await nextTick();
  await new Promise<void>(resolve => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
};

const getBoardOptionsForCurrentMode = (mode: PlaygroundMode) => getBoardOptionsForPlaygroundMode(mode, getGraphViewportSize());

const cloneBounds = (bounds: CanvasWorldBounds): CanvasWorldBounds => ({ ...bounds });
const createCoreViewportBoundsForCurrentMode = (): CanvasWorldBounds => {
  const gridOptions = resolveGraphViewportGridOptions(getBoardOptionsForCurrentMode(store.activeMode).grid);
  return gridOptions.enabled
    ? createCenteredWorldBoundsForViewportGrid(getGraphViewportSize(), gridOptions)
    : cloneBounds(PLAYGROUND_CANVAS_WORLD_BOUNDS);
};
const resetCoreViewportBounds = () => {
  coreViewportBounds.value = createCoreViewportBoundsForCurrentMode();
  applyCoreViewportBounds();
};

const setCoreViewportBounds = (bounds: CanvasWorldBounds, reason: string) => {
  coreViewportBounds.value = cloneBounds(bounds);
  applyCoreViewportBounds();
  pushCoreInteractionDiagnostic(reason);
};

const applyCoreViewportBounds = () => {
  canvasBackendRef.value?.setWorldBounds(coreViewportBounds.value);
  babylonBackendRef.value?.setWorldBounds(coreViewportBounds.value);
};

const getActiveCoreRuntime = () => (
  isBabylonRendererActive.value ? babylonRuntimeRef.value : canvasRuntimeRef.value
);

const getCoreLocalPoint = (event: Pick<PointerEvent | WheelEvent | DragEvent, 'clientX' | 'clientY'>): GraphClientPoint | null => {
  const element = graphContainerRef.value;
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  };
};

const getWorldPointForOperationDrop = (point: GraphClientPoint | null): { x: number; y: number } => {
  const boardBounds = engineRef.value?.getBoard()?.getBoundingBox?.() as [number, number, number, number] | undefined;
  const bounds = boardBounds
    ? { left: boardBounds[0], top: boardBounds[1], right: boardBounds[2], bottom: boardBounds[3] }
    : coreViewportBounds.value;
  return resolveOperationCommandOrigin(point, getGraphViewportSize(), bounds);
};

const getWorldPointForCanvasPoint = (point: GraphClientPoint): { dimension: '2d'; x: number; y: number } => {
  const world = getWorldPointForOperationDrop(point);
  return { dimension: '2d', ...world };
};

const isCoordinateSystemDraggableNode = (node: { type?: string; meta?: Record<string, unknown>; renderHints?: Record<string, unknown> } | null | undefined): boolean => (
  node?.type === 'coordinate-system'
  && node.meta?.locked !== true
  && node.meta?.dragDisabled !== true
  && node.meta?.dragMode !== 'disabled'
  && node.meta?.draggable !== false
  && node.renderHints?.draggable !== false
);

const readCoreObjectIdFromJsxGraphObject = (object: unknown): string | null => {
  if (!object || typeof object !== 'object') return null;
  const record = object as Record<string, unknown>;
  if (typeof record.__vuegraphxCoreObjectId === 'string') return record.__vuegraphxCoreObjectId;
  if (typeof record.vuegraphxCoreObjectId === 'string') return record.vuegraphxCoreObjectId;
  const metadata = record.metadata;
  if (metadata && typeof metadata === 'object') {
    const meta = metadata as Record<string, unknown>;
    if (typeof meta.__vuegraphxCoreObjectId === 'string') return meta.__vuegraphxCoreObjectId;
    if (typeof meta.vuegraphxCoreObjectId === 'string') return meta.vuegraphxCoreObjectId;
  }
  return null;
};

const getJsxGraphCoordinateSystemObjectAtEvent = (event: PointerEvent): string | null => {
  if (isCoreRendererActive.value || activeRendererBackend.value !== 'jsxgraph') return null;
  const board = engineRef.value?.getBoard() as { getAllObjectsUnderMouse?: (event: PointerEvent) => unknown[] } | null;
  const scene = engineRef.value?.exportRuntimeScene().scene;
  if (!board || !scene) return null;
  const objects = board.getAllObjectsUnderMouse?.(event) ?? [];
  for (const object of objects) {
    const objectId = readCoreObjectIdFromJsxGraphObject(object);
    if (!objectId) continue;
    const node = scene.objects.find((entry) => entry.id === objectId);
    if (isCoordinateSystemDraggableNode(node)) return objectId;
  }

  const localPoint = getCoreLocalPoint(event);
  if (!localPoint) return null;
  const worldPoint = getWorldPointForCanvasPoint(localPoint);
  for (const node of [...scene.objects].reverse()) {
    if (isCoordinateSystemDraggableNode(node) && isPointInsideCoordinateSystemRegion(node, worldPoint)) return node.id;
  }
  return null;
};

const isPointInsideCoordinateSystemRegion = (node: GraphObjectNode, point: { x: number; y: number }): boolean => {
  const payload = node.payload as Record<string, unknown> | undefined;
  const geometry = payload?.geometry as Record<string, unknown> | undefined;
  if (geometry?.kind !== 'coordinate-system') return false;
  const border = readPointList2D(geometry.border);
  if (border.length >= 3) return pointInPolygon2D(point, border);
  const segments = readCoordinateSystemSegments2D(geometry);
  const bounds = boundsForPointGroups(segments);
  return !!bounds && point.x >= bounds.minX && point.x <= bounds.maxX && point.y >= bounds.minY && point.y <= bounds.maxY;
};

const readCoordinateSystemSegments2D = (geometry: Record<string, unknown>): Array<Array<{ x: number; y: number }>> => {
  const segments = Array.isArray(geometry.segments)
    ? geometry.segments.map(readPointList2D).filter((segment) => segment.length >= 2)
    : [];
  if (segments.length > 0) return segments;
  return [geometry.xAxis, geometry.yAxis].map(readPointList2D).filter((segment) => segment.length >= 2);
};

const readPointList2D = (value: unknown): Array<{ x: number; y: number }> => (
  Array.isArray(value) ? value.filter(isPoint2D) : []
);

const isPoint2D = (value: unknown): value is { x: number; y: number } => {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return typeof record.x === 'number' && Number.isFinite(record.x) && typeof record.y === 'number' && Number.isFinite(record.y);
};

const boundsForPointGroups = (groups: Array<Array<{ x: number; y: number }>>): { minX: number; maxX: number; minY: number; maxY: number } | null => {
  const points = groups.flat();
  if (points.length === 0) return null;
  return {
    minX: Math.min(...points.map((entry) => entry.x)),
    maxX: Math.max(...points.map((entry) => entry.x)),
    minY: Math.min(...points.map((entry) => entry.y)),
    maxY: Math.max(...points.map((entry) => entry.y))
  };
};

const pointInPolygon2D = (point: { x: number; y: number }, polygon: ReadonlyArray<{ x: number; y: number }>): boolean => {
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index, index += 1) {
    const currentPoint = polygon[index];
    const previousPoint = polygon[previous];
    const crosses = (currentPoint.y > point.y) !== (previousPoint.y > point.y)
      && point.x < ((previousPoint.x - currentPoint.x) * (point.y - currentPoint.y)) / ((previousPoint.y - currentPoint.y) || Number.EPSILON) + currentPoint.x;
    if (crosses) inside = !inside;
  }
  return inside;
};

const startCoordinateSystemDrag = (
  event: PointerEvent,
  objectId: string,
  backend: CoordinateSystemDragSession['backend'],
  point: GraphClientPoint
) => {
  coordinateSystemDragSession = {
    pointerId: event.pointerId,
    objectId,
    backend,
    lastWorldPoint: getWorldPointForCanvasPoint(point)
  };
  corePanSession = null;
  graphContainerRef.value?.setPointerCapture?.(event.pointerId);
  suppressCoordinateSystemDragEvent(event);
  pushCoreInteractionDiagnostic(`coordinate system drag started: ${objectId}`);
};

const moveCoordinateSystemDrag = (event: PointerEvent, point: GraphClientPoint): boolean => {
  const session = coordinateSystemDragSession;
  if (!session || session.pointerId !== event.pointerId) return false;
  const currentWorldPoint = getWorldPointForCanvasPoint(point);
  const dx = currentWorldPoint.x - session.lastWorldPoint.x;
  const dy = currentWorldPoint.y - session.lastWorldPoint.y;
  if (Math.abs(dx) < 1e-9 && Math.abs(dy) < 1e-9) {
    suppressCoordinateSystemDragEvent(event);
    return true;
  }

  const delta = { dimension: '2d' as const, dx, dy };
  applyCoordinateSystemDragDelta(session, delta, 'move');
  session.lastWorldPoint = currentWorldPoint;
  suppressCoordinateSystemDragEvent(event);
  return true;
};

const applyCoordinateSystemDragDelta = (
  session: CoordinateSystemDragSession,
  delta: { dimension: '2d'; dx: number; dy: number },
  dragPhase: 'move' | 'end'
) => {
  if (session.backend === 'core') {
    const result = getActiveCoreRuntime()?.applyDragToObject(session.objectId, { delta, dragPhase });
    if (result && !result.ok) pushCoreDiagnostics(result.diagnostics);
  } else {
    const moved = engineRef.value?.executeRuntimeCapability('math.object.move', {
      scope: 'object',
      objectId: session.objectId
    }, { delta, dragPhase });
    if (!moved) pushCoreInteractionDiagnostic(`coordinate system drag failed: ${session.objectId}`);
  }
};

const stopCoordinateSystemDrag = (event: PointerEvent) => {
  const session = coordinateSystemDragSession;
  if (session?.pointerId !== event.pointerId) return;
  const point = getCoreLocalPoint(event);
  const currentWorldPoint = point ? getWorldPointForCanvasPoint(point) : session.lastWorldPoint;
  applyCoordinateSystemDragDelta(session, {
    dimension: '2d',
    dx: currentWorldPoint.x - session.lastWorldPoint.x,
    dy: currentWorldPoint.y - session.lastWorldPoint.y
  }, 'end');
  graphContainerRef.value?.releasePointerCapture?.(event.pointerId);
  pushCoreInteractionDiagnostic(`coordinate system drag ended: ${session.objectId}`);
  coordinateSystemDragSession = null;
  suppressCoordinateSystemDragEvent(event);
};

const suppressCoordinateSystemDragEvent = (event: PointerEvent) => {
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation?.();
};

const pushCoreInteractionDiagnostic = (message: string) => {
  coreInteractionDiagnostics.value = [
    `${new Date().toLocaleTimeString()} · ${message}`,
    ...coreInteractionDiagnostics.value
  ].slice(0, 8);
};

const pushCoreDiagnostics = (diagnostics: readonly GraphOperationDiagnostic[]) => {
  for (const diagnostic of diagnostics) {
    pushCoreInteractionDiagnostic(`${diagnostic.code}: ${diagnostic.message}`);
  }
};

const selectCoreObject = (objectId: string, pick?: GraphPickResult) => {
  const runtime = getActiveCoreRuntime();
  if (!runtime) return;

  for (const node of runtime.scene.listObjects()) {
    if (node.meta?.selected === true && node.id !== objectId) {
      runtime.updateObject(node.id, { meta: { ...(node.meta ?? {}), selected: false } });
    }
  }

  const node = runtime.scene.getObject(objectId);
  if (node) runtime.updateObject(objectId, { meta: { ...(node.meta ?? {}), selected: true } });
  coreSelectedObjectId.value = objectId;
  pushCoreInteractionDiagnostic(`selected ${objectId}${pick?.backendId ? ` via ${pick.backendId}` : ''}`);
};

const clearCoreSelection = (reason = 'selection cleared') => {
  const runtime = getActiveCoreRuntime();
  if (!runtime) return;
  let cleared = false;
  for (const node of runtime.scene.listObjects()) {
    if (node.meta?.selected === true) {
      runtime.updateObject(node.id, { meta: { ...(node.meta ?? {}), selected: false } });
      cleared = true;
    }
  }
  if (coreSelectedObjectId.value || cleared) {
    coreSelectedObjectId.value = '';
    pushCoreInteractionDiagnostic(reason);
  }
};

const handleCoreRendererWheel = (event: WheelEvent) => {
  if (!isCoreRendererActive.value) return;
  if (isBabylonRendererActive.value && getBabylonRenderModeForCurrentMode() === '3d') return;

  const point = getCoreLocalPoint(event);
  if (!point) return;
  const gesture = classifyCoreRendererWheelGesture(event);
  if (gesture === 'ignore') return;
  event.preventDefault();

  if (gesture === 'zoom') {
    const scale = event.deltaY < 0 ? 0.88 : 1.14;
    setCoreViewportBounds(
      zoomFittedBoundsAroundClientPoint(coreViewportBounds.value, point, getGraphViewportSize(), scale),
      `${event.ctrlKey || event.metaKey ? 'pinch-like' : 'wheel'} zoom ${scale < 1 ? 'in' : 'out'}`
    );
    return;
  }

  setCoreViewportBounds(
    panFittedBoundsByWheelDelta(coreViewportBounds.value, { x: event.deltaX, y: event.deltaY }, getGraphViewportSize()),
    'trackpad pan'
  );
};

const handleCoreRendererPointerDown = (event: PointerEvent) => {
  if (!isCoreRendererActive.value && activeRendererBackend.value !== 'jsxgraph') return;
  const point = getCoreLocalPoint(event);
  if (!point) return;

  const jsxGraphCoordinateObjectId = getJsxGraphCoordinateSystemObjectAtEvent(event);
  if (jsxGraphCoordinateObjectId) {
    engineRef.value?.executeRuntimeCapability('math.object.select', {
      scope: 'object',
      objectId: jsxGraphCoordinateObjectId
    });
    startCoordinateSystemDrag(event, jsxGraphCoordinateObjectId, 'jsxgraph', point);
    return;
  }

  if (!isCoreRendererActive.value) return;
  corePointers.set(event.pointerId, point);

  if (corePointers.size >= 2) {
    const [first, second] = [...corePointers.entries()].slice(0, 2);
    corePinchSession = {
      pointerIds: [first[0], second[0]],
      startDistance: distanceBetweenPoints(first[1], second[1]),
      startCenter: midpoint(first[1], second[1]),
      startBounds: cloneBounds(coreViewportBounds.value)
    };
    corePanSession = null;
    coordinateSystemDragSession = null;
    pushCoreInteractionDiagnostic('native pointer pinch started');
    return;
  }

  const runtime = getActiveCoreRuntime();
  const routed = runtime?.router.pickWithDiagnostics(point, { pickOptions: { tolerancePx: 10 } });
  if (routed) pushCoreDiagnostics(routed.diagnostics);
  if (routed?.pick?.target.objectId) {
    const objectId = routed.pick.target.objectId;
    selectCoreObject(objectId, routed.pick);
    const node = runtime?.scene.getObject(objectId);
    if (isCoordinateSystemDraggableNode(node)) {
      startCoordinateSystemDrag(event, objectId, 'core', point);
    }
    return;
  }

  clearCoreSelection('selection cleared via background');
  if (isBabylonRendererActive.value && getBabylonRenderModeForCurrentMode() === '3d') return;

  corePanSession = {
    pointerId: event.pointerId,
    startPoint: point,
    startBounds: cloneBounds(coreViewportBounds.value)
  };
  pushCoreInteractionDiagnostic('background pan started');
};

const handleCoreRendererPointerMove = (event: PointerEvent) => {
  if (!isCoreRendererActive.value && !coordinateSystemDragSession) return;
  const point = getCoreLocalPoint(event);
  if (!point) return;
  if (moveCoordinateSystemDrag(event, point)) return;
  if (!isCoreRendererActive.value) return;
  if (corePointers.has(event.pointerId)) corePointers.set(event.pointerId, point);

  if (corePinchSession) {
    const first = corePointers.get(corePinchSession.pointerIds[0]);
    const second = corePointers.get(corePinchSession.pointerIds[1]);
    if (!first || !second || corePinchSession.startDistance <= 1) return;
    const currentDistance = distanceBetweenPoints(first, second);
    const scale = Math.max(0.25, Math.min(4, corePinchSession.startDistance / Math.max(1, currentDistance)));
    setCoreViewportBounds(
      zoomFittedBoundsAroundClientPoint(corePinchSession.startBounds, corePinchSession.startCenter, getGraphViewportSize(), scale),
      'native pointer pinch zoom'
    );
    return;
  }

  if (corePanSession?.pointerId === event.pointerId) {
    setCoreViewportBounds(
      panFittedBoundsByPointerDelta(
        corePanSession.startBounds,
        { x: point.x - corePanSession.startPoint.x, y: point.y - corePanSession.startPoint.y },
        getGraphViewportSize()
      ),
      'pointer pan'
    );
  }
};

const handleCoreRendererPointerUp = (event: PointerEvent) => {
  if (!isCoreRendererActive.value && !coordinateSystemDragSession) return;
  stopCoordinateSystemDrag(event);
  if (!isCoreRendererActive.value) return;
  corePointers.delete(event.pointerId);
  if (corePanSession?.pointerId === event.pointerId) corePanSession = null;
  if (corePinchSession?.pointerIds.includes(event.pointerId)) corePinchSession = null;
};

const distanceBetweenPoints = (a: GraphClientPoint, b: GraphClientPoint) => Math.hypot(a.x - b.x, a.y - b.y);
const midpoint = (a: GraphClientPoint, b: GraphClientPoint): GraphClientPoint => ({
  x: (a.x + b.x) / 2,
  y: (a.y + b.y) / 2
});

let modeResizeObserver: ResizeObserver | null = null;
let modeResizeRaf: number | null = null;
let sidebarResizeObserver: ResizeObserver | null = null;
let sidebarResizeRaf: number | null = null;
let sidebarResizePointerStartY = 0;
let sidebarResizeStartHeight = SIDEBAR_BOTTOM_DEFAULT_HEIGHT;

const stopResizeObserver = () => {
  if (modeResizeRaf !== null) {
    cancelAnimationFrame(modeResizeRaf);
    modeResizeRaf = null;
  }
  modeResizeObserver?.disconnect();
  modeResizeObserver = null;
};

const stopSidebarResizeObserver = () => {
  if (sidebarResizeRaf !== null) {
    cancelAnimationFrame(sidebarResizeRaf);
    sidebarResizeRaf = null;
  }
  sidebarResizeObserver?.disconnect();
  sidebarResizeObserver = null;
};

const startResizeObserver = () => {
  stopResizeObserver();
  if (!graphContainerRef.value || (!engineRef.value && !canvasBackendRef.value && !babylonBackendRef.value)) return;

  modeResizeObserver = new ResizeObserver(() => {
    if (modeResizeRaf !== null) cancelAnimationFrame(modeResizeRaf);
    modeResizeRaf = requestAnimationFrame(() => {
      modeResizeRaf = null;
      if (isCoreRendererActive.value) {
        applyCoreViewportBounds();
      }
      if (canvasBackendRef.value) canvasBackendRef.value.resize(getGraphViewportSize());
      if (babylonBackendRef.value) babylonBackendRef.value.resize(getGraphViewportSize());
      if (engineRef.value) engineRef.value.resize();
    });
  });
  modeResizeObserver.observe(graphContainerRef.value);
};

const startSidebarResizeObserver = () => {
  stopSidebarResizeObserver();
  syncSidebarBottomConstraints();
  if (!sidebarRef.value) return;

  sidebarResizeObserver = new ResizeObserver(() => {
    if (sidebarResizeRaf !== null) cancelAnimationFrame(sidebarResizeRaf);
    sidebarResizeRaf = requestAnimationFrame(() => {
      sidebarResizeRaf = null;
      syncSidebarBottomConstraints();
    });
  });
  sidebarResizeObserver.observe(sidebarRef.value);
};

const stopSidebarBottomResize = () => {
  isSidebarBottomResizing.value = false;
  window.removeEventListener('pointermove', handleSidebarBottomResizeMove);
  window.removeEventListener('pointerup', stopSidebarBottomResize);
  document.body.classList.remove('sidebar-resize-active');
};

const handleSidebarBottomResizeMove = (event: PointerEvent) => {
  if (!isSidebarBottomResizing.value) return;
  const delta = sidebarResizePointerStartY - event.clientY;
  sidebarBottomHeight.value = clampSidebarBottomHeight(sidebarResizeStartHeight + delta);
};

const startSidebarBottomResize = (event: PointerEvent) => {
  sidebarResizePointerStartY = event.clientY;
  sidebarResizeStartHeight = sidebarBottomHeight.value;
  isSidebarBottomResizing.value = true;
  document.body.classList.add('sidebar-resize-active');
  window.addEventListener('pointermove', handleSidebarBottomResizeMove);
  window.addEventListener('pointerup', stopSidebarBottomResize);
};

onMounted(() => {
  startSidebarResizeObserver();
  initEngines();
});

watch(
  () => [store.activeMode, showScenePanel.value] as const,
  async () => {
    await waitForUiPaint();
    syncSidebarBottomConstraints();
  }
);

const destroyPrimaryRenderer = () => {
  corePanSession = null;
  corePinchSession = null;
  coordinateSystemDragSession = null;
  corePointers.clear();
  if (engineRef.value) {
    engineRef.value.destroy();
    engineRef.value = null;
  }
  if (canvasRuntimeRef.value) {
    canvasRuntimeRef.value.clear();
    canvasRuntimeRef.value = null;
  }
  if (canvasBackendRef.value) {
    canvasBackendRef.value.destroy();
    canvasBackendRef.value = null;
  }
  if (babylonRuntimeRef.value) {
    babylonRuntimeRef.value.clear();
    babylonRuntimeRef.value = null;
  }
  if (babylonBackendRef.value) {
    babylonBackendRef.value.destroy();
    babylonBackendRef.value = null;
  }
};

const initCanvasRenderer = (options: { syncCommands?: boolean } = {}) => {
  const host = graphContainerRef.value;
  if (!host) return;

  const showAxes = shouldShowCoreAxesForCurrentMode();
  const grid = getBoardOptionsForCurrentMode(store.activeMode).grid;
  coreViewportBounds.value = createCoreViewportBoundsForCurrentMode();
  host.replaceChildren();
  const backend = createCanvas2DGraphBackend({
    id: 'playground-canvas2d',
    pixelRatio: window.devicePixelRatio || 1,
    worldBounds: coreViewportBounds.value,
    showAxes,
    grid,
    preserveAspectRatio: true
  });
  backend.mount(host, {
    size: getGraphViewportSize(),
    attributes: { worldBounds: coreViewportBounds.value, grid }
  });
  canvasBackendRef.value = backend;
  canvasRuntimeRef.value = new GraphSceneRuntime({
    backend,
    defaultContext: { layerId: 'content' }
  });

  if (options.syncCommands !== false) {
    syncAllToEngine();
  }
  startResizeObserver();
};

const loadBabylonNamespace = async (): Promise<BabylonNamespaceLike> => {
  const [engineModule, sceneModule, vectorModule, colorModule, materialModule, textureModule, cameraModule, lightModule, meshBuilderModule] = await Promise.all([
    import('@babylonjs/core/Engines/engine'),
    import('@babylonjs/core/scene'),
    import('@babylonjs/core/Maths/math.vector'),
    import('@babylonjs/core/Maths/math.color'),
    import('@babylonjs/core/Materials/standardMaterial'),
    import('@babylonjs/core/Materials/Textures/dynamicTexture'),
    import('@babylonjs/core/Cameras/arcRotateCamera'),
    import('@babylonjs/core/Lights/hemisphericLight'),
    import('@babylonjs/core/Meshes/meshBuilder')
  ]);

  return {
    Engine: engineModule.Engine,
    Scene: sceneModule.Scene,
    Vector3: vectorModule.Vector3,
    Color3: colorModule.Color3,
    Color4: colorModule.Color4,
    StandardMaterial: materialModule.StandardMaterial,
    DynamicTexture: textureModule.DynamicTexture,
    ArcRotateCamera: cameraModule.ArcRotateCamera,
    HemisphericLight: lightModule.HemisphericLight,
    MeshBuilder: meshBuilderModule.MeshBuilder
  } as unknown as BabylonNamespaceLike;
};

const initBabylonRenderer = async (options: { syncCommands?: boolean } = {}) => {
  const host = graphContainerRef.value;
  if (!host) return;

  const showAxes = shouldShowCoreAxesForCurrentMode();
  const grid = getBoardOptionsForCurrentMode(store.activeMode).grid;
  coreViewportBounds.value = createCoreViewportBoundsForCurrentMode();
  host.replaceChildren();
  babylonRuntimeError.value = '';
  const renderMode = getBabylonRenderModeForCurrentMode();
  try {
    const BABYLON = await loadBabylonNamespace();
    const runtimePort = createBabylonRuntime(BABYLON, {
      renderMode,
      attachCameraControl: renderMode === '3d',
      canvasPointerEvents: 'auto',
      showAxes,
      grid
    });
    const backend = createBabylonGraphBackend({
      id: 'playground-babylon',
      runtime: runtimePort
    });
    backend.mount(host, {
      size: getGraphViewportSize(),
      attributes: { renderMode, worldBounds: coreViewportBounds.value, showAxes, grid }
    });
    babylonBackendRef.value = backend;
    babylonRuntimeRef.value = new GraphSceneRuntime({
      backend,
      defaultContext: { layerId: 'content' }
    });
  } catch (error) {
    babylonRuntimeError.value = `Babylon Core 无法加载：${error instanceof Error ? error.message : String(error)}。请安装 @babylonjs/core 后再使用该后端。`;
  }

  if (options.syncCommands !== false) {
    syncAllToEngine();
  }
  startResizeObserver();
};

const getBabylonRenderModeForCurrentMode = (): BabylonRenderMode => (
  store.activeMode === '3d' ? '3d' : '2d'
);
const shouldShowCoreAxesForCurrentMode = (): boolean => (
  getBoardOptionsForCurrentMode(store.activeMode).axis !== false
);

const initJsxGraphRenderer = (options: { syncCommands?: boolean } = {}) => {
  if (!graphContainerRef.value) return;

  engineRef.value = new GraphXEngine('vuegraphx-mount', getBoardOptionsForCurrentMode(store.activeMode));
  engineRef.value.setMode(getEngineModeForPlayground(store.activeMode));
  registerPlaygroundShapes(engineRef.value);

  if (options.syncCommands !== false) {
    syncAllToEngine();
  }
  startResizeObserver();
};

const initEngines = async (options: { syncCommands?: boolean } = {}) => {
  if (isCanvasRendererActive.value) {
    initCanvasRenderer(options);
    return;
  }

  if (isBabylonRendererActive.value) {
    await initBabylonRenderer(options);
    return;
  }

  initJsxGraphRenderer(options);
};

onUnmounted(() => {
  stopResizeObserver();
  stopSidebarResizeObserver();
  stopSidebarBottomResize();
  destroyPrimaryRenderer();
});

const switchMode = async (mode: PlaygroundMode, options: { syncCommands?: boolean } = {}) => {
  if (store.activeMode === mode) return;
  store.activeMode = mode;
  activeDemo.value = -1;
  if (!isRendererBackendSupported(activeRendererBackend.value)) {
    activeRendererBackend.value = 'jsxgraph';
  }

  stopResizeObserver();
  destroyPrimaryRenderer();
  resetCoreViewportBounds();
  coreInteractionDiagnostics.value = [];
  coreSelectedObjectId.value = '';

  await waitForUiPaint();
  await initEngines(options);
};

const switchRendererBackend = async (backend: PlaygroundRenderBackend) => {
  if (activeRendererBackend.value === backend) return;
  activeRendererBackend.value = isRendererBackendSupported(backend) ? backend : 'jsxgraph';
  showScenePanel.value = false;

  stopResizeObserver();
  destroyPrimaryRenderer();
  resetCoreViewportBounds();
  coreInteractionDiagnostics.value = [];
  coreSelectedObjectId.value = '';
  await waitForUiPaint();
  await initEngines({ syncCommands: true });
};

const handleRendererBackendChange = (event: Event) => {
  const backend = (event.target as HTMLSelectElement | null)?.value;
  if (backend === 'jsxgraph' || backend === 'canvas2d' || backend === 'babylon') {
    switchRendererBackend(backend);
  }
};

const handleCreateOperationCommands = (commands: readonly CommandInput[], dropPoint: GraphClientPoint | null = null) => {
  if (commands.length === 0) return;
  activeDemo.value = -1;
  const origin = getWorldPointForOperationDrop(dropPoint);
  const nextCommands = store.activeMode === 'operation'
    ? createOperationScopedCommands(
      commands,
      origin,
      `coord_${nextOperationCoordinateSystemSequence++}`
    )
    : commands;
  store.appendCommands(nextCommands);
  nextTick(() => {
    syncAllToEngine();
  });
};

const handleLineEnter = (_id: string, index: number) => {
  syncAllToEngine();
  if (index === store.commands.length - 1) {
    store.addCommand('');
  }
};

const executeSingle = (id: string) => {
  const cmd = store.commands.find(c => c.id === id) as CommandItem & { isFocused?: boolean } | undefined;
  if (isCoreRendererActive.value) return;
  if (!cmd || !engineRef.value) return;

  if (!cmd.expression.trim()) {
    engineRef.value.removeCommand(cmd.id);
    store.updateCommand(cmd.id, '');
    return;
  }

  try {
    store.setCommandError(id, '');
    engineRef.value.executeCommand(cmd.id, cmd.expression, cmd.color, cmd.options);
  } catch (err: any) {
    store.setCommandError(id, err.message);
  }
};

const removeLine = (id: string) => {
  store.removeCommand(id);
  if (isCoreRendererActive.value) {
    syncAllToEngine();
  } else if (engineRef.value) {
    engineRef.value.removeCommand(id);
  }
};

const clearAll = () => {
  store.clearCommands();
  activeDemo.value = -1;
  coreSelectedObjectId.value = '';
  if (engineRef.value) engineRef.value.clearBoard();
  if (canvasRuntimeRef.value) canvasRuntimeRef.value.clear();
  else if (canvasBackendRef.value) canvasBackendRef.value.clear();
  if (babylonRuntimeRef.value) babylonRuntimeRef.value.clear();
};

const syncAllToEngine = () => {
  if (isCanvasRendererActive.value) {
    const backend = canvasBackendRef.value;
    const runtime = canvasRuntimeRef.value;
    if (!backend || !runtime) return;
    coreSelectedObjectId.value = '';
    runtime.clear();
    const result = buildPlaygroundCanvasScene(store.commands);
    store.commands.forEach((command) => {
      const diagnostic = result.diagnostics.find((item) => item.commandId === command.id);
      store.setCommandError(command.id, diagnostic?.message ?? '');
    });
    for (const node of result.nodes) runtime.addObject(node);
    backend.flush();
    return;
  }

  if (isBabylonRendererActive.value) {
    const backend = babylonBackendRef.value;
    const runtime = babylonRuntimeRef.value;
    if (!backend || !runtime) {
      store.commands.forEach((command) => {
        if (command.expression.trim()) store.setCommandError(command.id, babylonRuntimeError.value || 'Babylon 后端未初始化。');
      });
      return;
    }
    coreSelectedObjectId.value = '';
    runtime.clear();
    const result = buildPlaygroundBabylonScene(store.commands, { renderMode: getBabylonRenderModeForCurrentMode() });
    store.commands.forEach((command) => {
      const diagnostic = result.diagnostics.find((item) => item.commandId === command.id);
      store.setCommandError(command.id, diagnostic?.message ?? '');
    });
    for (const node of result.nodes) runtime.addObject(node);
    backend.flush();
    return;
  }

  if (engineRef.value) engineRef.value.clearVariables();
  store.commands.forEach(cmd => executeSingle(cmd.id));
  // 批量创建图元后 JSXGraph 不会自动重绘，必须手动触发
  if (engineRef.value) engineRef.value.forceUpdate();
};

/** 加载点击的 Demo 卡片 */
const loadSelectedDemo = (idx: number) => {
  const demo = currentDemos.value[idx];
  if (!demo) return;
  activeDemo.value = idx;
  store.injectDemo(store.activeMode, demo.commands);
  // 使用 resetBoard 完全重置 JSXGraph 内部状态，避免 clearBoard/removeObject 的副作用
  if (engineRef.value) engineRef.value.resetBoard(getBoardOptionsForCurrentMode(store.activeMode));
  if (canvasRuntimeRef.value) canvasRuntimeRef.value.clear();
  if (babylonRuntimeRef.value) babylonRuntimeRef.value.clear();
  resetCoreViewportBounds();
  coreSelectedObjectId.value = '';
  nextTick(() => {
    syncAllToEngine();
  });
};

const {
  sceneText,
  diagnostics: sceneDiagnostics,
  errorCount: sceneErrorCount,
  lastStatus: sceneLastStatus,
  supportsScene: supportsSceneDocument,
  clearSceneDocument,
  exportSceneDocument,
  importSceneDocument
} = useSceneDocument({
  getEngine: () => engineRef.value,
  getActiveMode: () => store.activeMode,
  switchMode,
  syncCommandsFromScene: (commands) => store.replaceCommandsFromScene(store.activeMode, commands)
});

const handleExportScene = () => {
  showScenePanel.value = true;
  exportSceneDocument();
};

const handleImportScene = async () => {
  showScenePanel.value = true;
  activeDemo.value = -1;
  const result = await importSceneDocument();
  if (result?.scene && engineRef.value) {
    engineRef.value.forceUpdate();
  }
};
</script>

<style>
.JXGtext {
  font-family: inherit !important;
}
.JXG_navigation_button {
  display: none !important;
}
textarea {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
textarea::-webkit-scrollbar {
  display: none;
}
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
.demo-card {
  min-width: 128px;
}
.sidebar-bottom-dock {
  min-height: 220px;
}
.sidebar-bottom-resize-handle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 0.4rem 0.75rem;
  border-bottom: 1px solid rgba(226, 232, 240, 0.9);
  background: linear-gradient(180deg, rgba(248, 250, 252, 0.98), rgba(255, 255, 255, 0.98));
  cursor: ns-resize;
  touch-action: none;
}
.sidebar-bottom-resize-handle:hover,
.sidebar-bottom-resize-handle-active {
  background: linear-gradient(180deg, rgba(240, 249, 255, 0.98), rgba(255, 255, 255, 0.98));
}
.sidebar-bottom-resize-handle-bar {
  display: block;
  width: 3.5rem;
  height: 0.3rem;
  border-radius: 999px;
  background: #cbd5e1;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.9);
}
body.sidebar-resize-active {
  cursor: ns-resize;
  user-select: none;
}
#graph-container .jxgbox {
  position: absolute !important;
  outline: none !important;
  will-change: transform;
  transform: translateZ(0);
  backface-visibility: hidden;
}

#graph-container .jxgbox canvas {
  will-change: contents;
}

#vuegraphx-mount.core-interaction-surface {
  cursor: grab;
  touch-action: none;
}

#vuegraphx-mount.core-interaction-surface:active {
  cursor: grabbing;
}

#graph-container .JXGinfobox,
#graph-container .JXG_navigation,
#graph-container foreignObject {
  pointer-events: none;
}

</style>
