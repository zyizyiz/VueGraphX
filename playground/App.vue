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
          :active-tool-id="activeOperationToolId"
          @activate-tool="handleActivateOperationTool"
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
                  <span v-if="coreRuntimeSelection.primaryObjectId" class="mt-1 block font-semibold">
                    当前选中：{{ coreRuntimeSelection.primaryObjectId }}
                  </span>
                  <span v-if="coreRuntimeSelection.primaryObjectId" class="block text-[10px] text-sky-700">
                    {{ coreRuntimeSelection.backendId || activeRendererBackend }} · {{ coreRuntimeSelection.primaryKind }}/{{ coreRuntimeSelection.primaryType }} · {{ coreRuntimeSelection.source }} · {{ coreRuntimeSelection.reason }} · rev {{ coreRuntimeSelection.revision }}
                  </span>
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
                      v-for="(item, index) in coreInteractionDiagnostics.slice(0, 5)"
                      :key="`core-diagnostic-${index}-${item}`"
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
          <div
            v-if="operationShapeEditHandleProjections.length > 0"
            class="pointer-events-none absolute inset-0 z-[11]"
          >
            <button
              v-for="handle in operationShapeEditHandleProjections"
              v-show="handle.visible"
              :key="handle.id"
              type="button"
              class="operation-shape-edit-handle pointer-events-auto"
              :class="{ 'operation-shape-edit-handle-active': activeOperationShapeEditDragHandleId === handle.id }"
              :style="{ left: `${handle.x}px`, top: `${handle.y}px` }"
              :aria-label="`拖拽 ${handle.label}`"
              :title="handle.label"
              data-operation-shape-edit-handle
              @pointerdown="startOperationShapeEditHandleDrag($event, handle.id)"
              @pointermove="handleOperationShapeEditHandleMove"
              @pointerup="handleOperationShapeEditHandleUp"
              @pointercancel="handleOperationShapeEditHandleUp"
            >
              <span>{{ handle.label }}</span>
            </button>
          </div>
          <div class="pointer-events-none absolute inset-0 z-[12]">
            <div
              v-if="businessOverlayPosition"
              class="business-overlay-anchor"
              :class="{ 'business-overlay-anchor-hidden': !businessOverlayPosition.visible }"
              :style="{
                transform: `translate3d(${businessOverlayPosition.x}px, ${businessOverlayPosition.y}px, 0) translate(-50%, -100%)`
              }"
            >
              <div class="business-overlay-card pointer-events-auto">
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <p class="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">业务浮窗</p>
                    <p class="mt-1 text-sm font-bold text-slate-900">世界坐标 (0, 0)</p>
                  </div>
                  <span class="business-overlay-status">Live</span>
                </div>
                <div class="mt-3 grid grid-cols-2 gap-2">
                  <div class="business-overlay-metric">
                    <span>screen x</span>
                    <strong>{{ Math.round(businessOverlayPosition.anchor.x) }}</strong>
                  </div>
                  <div class="business-overlay-metric">
                    <span>screen y</span>
                    <strong>{{ Math.round(businessOverlayPosition.anchor.y) }}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
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
  isGraphDraggableNode,
  resolveGraphOverlayPosition,
  resolveGraphViewportGridOptions,
  resolveGraphGridSnapOptions,
  snapPointToGraphGrid,
  type GraphClientPoint,
  type GraphObjectNode,
  type GraphOperationDiagnostic,
  type GraphPickResult,
  type GraphRuntimeSelectionChangeEvent
} from '@vuegraphx/core';
import {
  createSubjectShapeEditHandles,
  createSubjectShapeEditModel,
  type MathPoint2D,
  type SubjectGeometryDragPhase,
  type SubjectGeometryGridSnapMetric,
  type SubjectGeometryGridSnapOptions,
  type SubjectShapeEditHandleDescriptor
} from '@vuegraphx/math';
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
  buildPlaygroundCanvasScene,
  buildPlaygroundLayered3DScene,
  PLAYGROUND_CANVAS_WORLD_BOUNDS
} from './renderers/canvasScene';
import { allDemos, playgroundBackendCapabilities, rendererBackends, type PlaygroundRenderBackend } from './showcase';
import { getPreferredBackendForMode, isBackendSelectableForMode } from './parityStatus';
import ExternalCircleDesigner from './components/ExternalCircleDesigner.vue';
import ExternalCubeDesigner from './components/ExternalCubeDesigner.vue';
import HiddenLinePanel from './components/HiddenLinePanel.vue';
import OperationPanel from './components/OperationPanel.vue';
import RelationPanel from './components/RelationPanel.vue';
import {
  OPERATION_COMMANDS_MIME,
  OPERATION_SHAPE_EDIT_DEFAULT_SNAP,
  OPERATION_TOOL_MIME,
  alignOperationCoordinateSystemOriginToGrid,
  clampOperationCoordinateSystemOrigin,
  createOperationShapeEditCommands,
  createOperationShapeEditTarget,
  createOperationShapeEditVertexCommand,
  createOperationScopedCommands,
  createOperationToolCommands,
  findOperationToolById,
  resolveOperationCommandOrigin,
  shouldScopeOperationTool,
  updateOperationCoordinateSystemOrigin,
  type OperationCoordinateSystemRuntimeOptions,
  type OperationShapeEditPolygonTarget,
  type OperationTool
} from './operationTools';
import { registerPlaygroundShapes } from './shapes';
import { getBoardOptionsForPlaygroundMode, getEngineModeForPlayground, type PlaygroundMode } from './types/mode';
import {
  createGraphViewportNavigationController,
  fitGraphBoundsToViewportAspect,
  type GraphViewportNavigationController,
  type GraphViewportNavigationKind
} from '@vuegraphx/core';

let nextOperationCoordinateSystemSequence = 1;
let nextOperationShapeEditSequence = 1;

const OPERATION_SHAPE_EDIT_LOG_PREFIX = '[VueGraphX operation shape edit]';

const debugOperationShapeEdit = (message: string, data?: Record<string, unknown>) => {
  console.info(OPERATION_SHAPE_EDIT_LOG_PREFIX, message, data ?? {});
};

const readOperationToolFromDrop = (event: DragEvent): OperationTool | null => {
  const raw = event.dataTransfer?.getData(OPERATION_TOOL_MIME);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return null;
    const toolId = (parsed as { id?: unknown }).id;
    return typeof toolId === 'string' ? findOperationToolById(toolId) : null;
  } catch (error) {
    debugOperationShapeEdit('drop tool payload parse failed', {
      error: error instanceof Error ? error.message : String(error)
    });
    return null;
  }
};

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
  const dropPoint = getCoreLocalPoint(e);
  const operationTool = readOperationToolFromDrop(e);
  if (operationTool) {
    handleActivateOperationTool(operationTool, dropPoint);
    return;
  }
  const operationCommands = readOperationCommandsFromDrop(e);
  if (operationCommands) {
    handleCreateOperationCommands(operationCommands, dropPoint);
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
const activeRendererBackend = ref<PlaygroundRenderBackend>(getPreferredBackendForMode('2d'));
const babylonRuntimeError = ref('');
const sidebarBottomHeight = ref(420);
const sidebarBottomMaxHeight = ref(920);
const isSidebarBottomResizing = ref(false);
const coreViewportBounds = ref<CanvasWorldBounds>({ ...PLAYGROUND_CANVAS_WORLD_BOUNDS });
const coreInteractionDiagnostics = ref<string[]>([]);
const businessOverlayRefreshKey = ref(0);
const operationShapeEditSession = ref<OperationShapeEditSession | null>(null);
const activeOperationShapeEditDragHandleId = ref('');
const operationShapeEditProjectionRevision = ref(0);

interface CoreRuntimeSelectionProjection {
  primaryObjectId: string;
  primaryKind: string;
  primaryType: string;
  backendId: string;
  selectedCount: number;
  reason: GraphRuntimeSelectionChangeEvent['reason'];
  source: GraphRuntimeSelectionChangeEvent['source'];
  revision: number;
}

const createEmptyCoreRuntimeSelection = (): CoreRuntimeSelectionProjection => ({
  primaryObjectId: '',
  primaryKind: '',
  primaryType: '',
  backendId: '',
  selectedCount: 0,
  reason: 'snapshot',
  source: 'api',
  revision: 0
});

const coreRuntimeSelection = ref<CoreRuntimeSelectionProjection>(createEmptyCoreRuntimeSelection());
const coreSelectedObjectId = computed(() => coreRuntimeSelection.value.primaryObjectId);

const BUSINESS_OVERLAY_ANCHOR = { dimension: '2d', x: 0, y: 0 } as const;
const BUSINESS_OVERLAY_OFFSET = { x: 0, y: -18 } as const;

interface CoordinateSystemDragSession {
  pointerId: number;
  objectId: string;
  backend: 'core' | 'jsxgraph';
  lastWorldPoint: { dimension: '2d'; x: number; y: number };
}

interface OperationShapeEditSession {
  toolId: string;
  coordinateSystemId: string;
  commandPrefix: string;
  coordinateSystem: OperationCoordinateSystemRuntimeOptions;
  target: OperationShapeEditPolygonTarget;
  snapToGrid: boolean | SubjectGeometryGridSnapOptions;
  commandIdsByVertex: readonly string[];
}

interface OperationShapeEditHandleProjection extends SubjectShapeEditHandleDescriptor {
  x: number;
  y: number;
  visible: boolean;
}

interface OperationShapeEditDragSession {
  pointerId: number;
  handleId: string;
  element: HTMLElement;
}

let coreNavigationController: GraphViewportNavigationController<CanvasWorldBounds> | null = null;
let coordinateSystemDragSession: CoordinateSystemDragSession | null = null;
let operationShapeEditDragSession: OperationShapeEditDragSession | null = null;
let disposeViewportChangeSubscription: (() => void) | null = null;
let disposeCoreRuntimeSelectionSubscription: (() => void) | null = null;

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
const activeOperationToolId = computed(() => operationShapeEditSession.value?.toolId ?? '');
const operationShapeEditHandleProjections = computed<OperationShapeEditHandleProjection[]>(() => {
  operationShapeEditProjectionRevision.value;
  void coreViewportBounds.value;
  void businessOverlayRefreshKey.value;
  const session = operationShapeEditSession.value;
  if (!session || store.activeMode !== 'operation') return [];

  const coordinateSystem = readStoredOperationCoordinateSystem(session.coordinateSystemId) ?? session.coordinateSystem;
  const viewport = getGraphViewportSize();
  const bounds = getOperationVisiblePlacementBounds();
  const width = Math.max(1, viewport.width);
  const height = Math.max(1, viewport.height);
  const spanX = bounds.right - bounds.left;
  const spanY = bounds.top - bounds.bottom;
  if (!Number.isFinite(spanX) || !Number.isFinite(spanY) || Math.abs(spanX) < 1e-9 || Math.abs(spanY) < 1e-9) return [];

  return createSubjectShapeEditHandles(session.target).map((handle) => {
    const world = operationLocalPointToWorld(handle.point, coordinateSystem);
    const x = ((world.x - bounds.left) / spanX) * width;
    const y = ((bounds.top - world.y) / spanY) * height;
    return {
      ...handle,
      x,
      y,
      visible: Number.isFinite(x) && Number.isFinite(y) && x >= -24 && x <= width + 24 && y >= -24 && y <= height + 24
    };
  });
});
const businessOverlayPosition = computed(() => {
  businessOverlayRefreshKey.value;
  if (store.activeMode === '3d') return null;

  if (isCoreRendererActive.value) {
    void coreViewportBounds.value;
    const backend = canvasBackendRef.value;
    if (!backend) return null;
    return resolveGraphOverlayPosition({
      point: BUSINESS_OVERLAY_ANCHOR,
      viewport: getGraphViewportSize(),
      project: (point) => point.dimension === '2d' ? backend.project(point) : null,
      offset: BUSINESS_OVERLAY_OFFSET
    });
  }

  return engineRef.value?.getOverlayPosition({
    point: [BUSINESS_OVERLAY_ANCHOR.x, BUSINESS_OVERLAY_ANCHOR.y],
    offset: BUSINESS_OVERLAY_OFFSET
  }) ?? null;
});
const rendererBackendHint = computed(() => {
  if (isBabylonRendererActive.value) return babylonRuntimeError.value || '3D 使用 Babylon canvas，2D 标注使用独立 Canvas2D overlay';
  if (isCanvasRendererActive.value) return '2D / 几何 / 操作区使用 Canvas2D Core';
  return 'JSXGraph 仅保留为兼容路径';
});
const coreRendererPanelMessage = computed(() => {
  if (isBabylonRendererActive.value) {
    return babylonRuntimeError.value
      || 'Babylon runtime 只承载 3D 节点；平面文本、标注和辅助对象通过独立 Canvas2D overlay 渲染。';
  }
  return 'Canvas2D 后端正在用同一份课程语义场景渲染 2D core IR；Equation / Parabola / Solid 会降维为可绘制教学对象。';
});
const isRendererBackendSupported = (backend: PlaygroundRenderBackend): boolean => (
  isBackendSelectableForMode(store.activeMode, backend)
);
const activeBackendCapability = computed(() => playgroundBackendCapabilities[activeRendererBackend.value]);
const coreSceneSummary = computed(() => {
  if (!isCoreRendererActive.value) return null;
  if (isBabylonRendererActive.value) {
    const result = buildPlaygroundLayered3DScene(store.commands);
    return {
      commandCount: store.commands.filter((command) => command.expression.trim()).length,
      nodeCount: result.babylon.nodes.length + result.overlay.nodes.length,
      diagnosticCount: result.babylon.diagnostics.length + result.overlay.diagnostics.length
    };
  }
  const result = buildPlaygroundCanvasScene(store.commands);
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

const refreshBusinessOverlayPosition = () => {
  businessOverlayRefreshKey.value += 1;
  refreshOperationShapeEditProjection();
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
  resetCoreNavigationController();
  applyCoreViewportBounds();
};

const setCoreViewportBounds = (bounds: CanvasWorldBounds, reason: string) => {
  coreViewportBounds.value = cloneBounds(bounds);
  coreNavigationController?.setBounds(coreViewportBounds.value);
  applyCoreViewportBounds();
  pushCoreInteractionDiagnostic(reason);
};

const applyCoreViewportBounds = () => {
  canvasBackendRef.value?.setWorldBounds(coreViewportBounds.value);
  babylonBackendRef.value?.setWorldBounds(coreViewportBounds.value);
  refreshBusinessOverlayPosition();
};

const resetCoreNavigationController = () => {
  coreNavigationController = createGraphViewportNavigationController({
    bounds: coreViewportBounds.value,
    viewport: getGraphViewportSize()
  });
};

const requireCoreNavigationController = (): GraphViewportNavigationController<CanvasWorldBounds> => {
  if (!coreNavigationController) {
    resetCoreNavigationController();
  }
  if (!coreNavigationController) {
    throw new Error('Core viewport navigation controller is missing.');
  }
  return coreNavigationController;
};

const describeCoreNavigationKind = (kind: GraphViewportNavigationKind, event?: WheelEvent): string => {
  if (kind === 'wheel-zoom') {
    const direction = event && event.deltaY < 0 ? 'in' : 'out';
    return `${event?.ctrlKey || event?.metaKey ? 'pinch-like' : 'wheel'} zoom ${direction}`;
  }
  if (kind === 'wheel-pan') return 'trackpad pan';
  if (kind === 'pointer-pan') return 'pointer pan';
  if (kind === 'pointer-pinch') return 'native pointer pinch zoom';
  if (kind === 'pointer-pan-start') return 'background pan started';
  if (kind === 'pointer-pinch-start') return 'native pointer pinch started';
  return kind;
};

const getActiveCoreRuntime = () => (
  isBabylonRendererActive.value ? babylonRuntimeRef.value : canvasRuntimeRef.value
);

const resetCoreRuntimeSelection = () => {
  coreRuntimeSelection.value = createEmptyCoreRuntimeSelection();
};

const handleCoreRuntimeSelectionChange = (event: GraphRuntimeSelectionChangeEvent) => {
  const primary = event.primary;
  coreRuntimeSelection.value = {
    primaryObjectId: primary?.objectId ?? '',
    primaryKind: primary?.kind ?? '',
    primaryType: primary?.objectType ?? '',
    backendId: primary?.backendId ?? '',
    selectedCount: event.selected.length,
    reason: event.reason,
    source: event.source,
    revision: event.revision
  };
};

const stopCoreRuntimeSelectionSubscription = () => {
  disposeCoreRuntimeSelectionSubscription?.();
  disposeCoreRuntimeSelectionSubscription = null;
};

const subscribeCoreRuntimeSelection = (runtime: GraphSceneRuntime) => {
  stopCoreRuntimeSelectionSubscription();
  disposeCoreRuntimeSelectionSubscription = runtime.subscribeSelection(handleCoreRuntimeSelectionChange);
};

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
  const bounds = getOperationVisiblePlacementBounds();
  return resolveOperationCommandOrigin(point, getGraphViewportSize(), bounds);
};

const getOperationPlacementBounds = (): CanvasWorldBounds => {
  const boardBounds = engineRef.value?.getBoard()?.getBoundingBox?.() as [number, number, number, number] | undefined;
  return boardBounds
    ? { left: boardBounds[0], top: boardBounds[1], right: boardBounds[2], bottom: boardBounds[3] }
    : coreViewportBounds.value;
};

const getOperationVisiblePlacementBounds = (): CanvasWorldBounds => {
  const bounds = getOperationPlacementBounds();
  return isCoreRendererActive.value ? fitGraphBoundsToViewportAspect(bounds, getGraphViewportSize()) : bounds;
};

const getWorldPointForCanvasPoint = (point: GraphClientPoint): { dimension: '2d'; x: number; y: number } => {
  const world = getWorldPointForOperationDrop(point);
  return { dimension: '2d', ...world };
};

const operationLocalPointToWorld = (
  point: MathPoint2D,
  coordinateSystem: OperationCoordinateSystemRuntimeOptions
): { x: number; y: number } => ({
  x: coordinateSystem.origin.x + point.x * coordinateSystem.unitScale,
  y: coordinateSystem.origin.y + point.y * coordinateSystem.unitScale
});

const operationWorldPointToLocal = (
  point: { x: number; y: number },
  coordinateSystem: OperationCoordinateSystemRuntimeOptions
): MathPoint2D => ({
  x: (point.x - coordinateSystem.origin.x) / coordinateSystem.unitScale,
  y: (point.y - coordinateSystem.origin.y) / coordinateSystem.unitScale
});

const clampOperationShapeEditPoint = (
  point: MathPoint2D,
  coordinateSystem: OperationCoordinateSystemRuntimeOptions
): MathPoint2D => ({
  x: clampNumber(point.x, coordinateSystem.xRange.min, coordinateSystem.xRange.max),
  y: clampNumber(point.y, coordinateSystem.yRange.min, coordinateSystem.yRange.max)
});

const clampNumber = (value: number, min: number, max: number) => {
  if (!Number.isFinite(value)) return Number.isFinite(min) ? min : 0;
  return Math.max(min, Math.min(max, value));
};

const handleActivateOperationTool = (tool: OperationTool, dropPoint: GraphClientPoint | null = null) => {
  debugOperationShapeEdit('activate tool', {
    toolId: tool.id,
    interaction: tool.interaction ?? null,
    dropPoint
  });
  if (tool.interaction?.kind === 'geometry-shape-edit') {
    createOperationShapeEditSession(tool, dropPoint);
    return;
  }
  handleCreateOperationToolCommands(tool, dropPoint);
};

const handleCreateOperationToolCommands = (tool: OperationTool, dropPoint: GraphClientPoint | null = null) => {
  const origin = getWorldPointForOperationDrop(dropPoint);
  handleCreateOperationCommands(createOperationToolCommands(tool, { origin }), dropPoint, {
    origin,
    scopeToCoordinateSystem: shouldScopeOperationTool(tool)
  });
};

const createOperationShapeEditSession = (tool: OperationTool, dropPoint: GraphClientPoint | null = null) => {
  if (store.activeMode !== 'operation') return;
  clearOperationShapeEditSession();
  activeDemo.value = -1;

  const coordinateSystemId = `coord_${nextOperationCoordinateSystemSequence++}`;
  const commandPrefix = `edit_${nextOperationShapeEditSequence++}`;
  const target = createOperationShapeEditTarget(`${commandPrefix}_target`);
  const bounds = getOperationVisiblePlacementBounds();
  const origin = getWorldPointForOperationDrop(dropPoint);
  const scopedCommands = createOperationScopedCommands(
    createOperationShapeEditCommands(commandPrefix, target),
    origin,
    coordinateSystemId,
    bounds
  );
  const coordinateSystem = (scopedCommands[0]?.options as { coordinateSystem?: OperationCoordinateSystemRuntimeOptions } | undefined)?.coordinateSystem;
  if (!coordinateSystem) {
    pushCoreInteractionDiagnostic('shape edit failed: coordinate system was not created');
    return;
  }

  const previousCommandCount = store.commands.length;
  store.appendCommands(scopedCommands);
  const insertedCommands = store.commands.slice(previousCommandCount, previousCommandCount + scopedCommands.length);
  const commandIdsByVertex = target.vertices.map((_, index) => (
    insertedCommands.find((command) => command.expression.startsWith(`${commandPrefix}_E${index + 1} =`))?.id ?? ''
  ));

  if (commandIdsByVertex.some((id) => !id)) {
    pushCoreInteractionDiagnostic('shape edit failed: editable vertex commands were not found');
    return;
  }

  const snapToGrid = tool.interaction?.kind === 'geometry-shape-edit'
    ? tool.interaction.snapToGrid ?? OPERATION_SHAPE_EDIT_DEFAULT_SNAP
    : OPERATION_SHAPE_EDIT_DEFAULT_SNAP;

  operationShapeEditSession.value = {
    toolId: tool.id,
    coordinateSystemId,
    commandPrefix,
    coordinateSystem,
    target,
    snapToGrid,
    commandIdsByVertex
  };
  debugOperationShapeEdit('session created', {
    toolId: tool.id,
    coordinateSystemId,
    commandPrefix,
    origin,
    coordinateSystem,
    snapToGrid,
    commandIdsByVertex,
    vertices: target.vertices
  });
  refreshOperationShapeEditProjection();
  nextTick(() => {
    syncAllToEngine({ keepSelection: coordinateSystemId });
    refreshOperationShapeEditProjection();
  });
};

const startOperationShapeEditHandleDrag = (event: PointerEvent, handleId: string) => {
  const session = operationShapeEditSession.value;
  if (!session) {
    debugOperationShapeEdit('pointerdown ignored: no active session', { handleId });
    return;
  }
  const element = event.currentTarget instanceof HTMLElement ? event.currentTarget : null;
  if (!element) {
    debugOperationShapeEdit('pointerdown ignored: missing currentTarget element', { handleId });
    return;
  }

  operationShapeEditDragSession = { pointerId: event.pointerId, handleId, element };
  activeOperationShapeEditDragHandleId.value = handleId;
  coreNavigationController?.resetPointers();
  coordinateSystemDragSession = null;
  element.setPointerCapture?.(event.pointerId);
  window.addEventListener('pointermove', handleOperationShapeEditHandleMove);
  window.addEventListener('pointerup', handleOperationShapeEditHandleUp);
  window.addEventListener('pointercancel', handleOperationShapeEditHandleUp);
  document.body.classList.add('operation-shape-edit-drag-active');
  debugOperationShapeEdit('pointerdown', {
    pointerId: event.pointerId,
    handleId,
    dragPhase: 'move',
    client: { x: event.clientX, y: event.clientY },
    elementClass: element.className,
    elementFromPoint: describeElementAtPoint(event.clientX, event.clientY)
  });
  applyOperationShapeEditDrag(event, 'move');
  suppressOperationShapeEditEvent(event);
};

const handleOperationShapeEditHandleMove = (event: PointerEvent) => {
  if (operationShapeEditDragSession?.pointerId !== event.pointerId) return;
  debugOperationShapeEdit('pointermove', {
    pointerId: event.pointerId,
    handleId: operationShapeEditDragSession.handleId,
    dragPhase: 'move',
    client: { x: event.clientX, y: event.clientY }
  });
  applyOperationShapeEditDrag(event, 'move');
  suppressOperationShapeEditEvent(event);
};

const handleOperationShapeEditHandleUp = (event: PointerEvent) => {
  if (operationShapeEditDragSession?.pointerId !== event.pointerId) return;
  const dragPhase: SubjectGeometryDragPhase = event.type === 'pointerup' ? 'end' : 'move';
  debugOperationShapeEdit(event.type, {
    pointerId: event.pointerId,
    handleId: operationShapeEditDragSession.handleId,
    dragPhase,
    client: { x: event.clientX, y: event.clientY }
  });
  applyOperationShapeEditDrag(event, dragPhase);
  clearOperationShapeEditDragSession();
  suppressOperationShapeEditEvent(event);
};

const applyOperationShapeEditDrag = (event: PointerEvent, dragPhase: SubjectGeometryDragPhase) => {
  const dragSession = operationShapeEditDragSession;
  const session = operationShapeEditSession.value;
  if (!dragSession || !session) return;

  const point = getOperationShapeEditLocalPoint(event, session);
  if (!point) {
    debugOperationShapeEdit('drag ignored: local point unavailable', {
      pointerId: event.pointerId,
      handleId: dragSession.handleId,
      dragPhase,
      client: { x: event.clientX, y: event.clientY }
    });
    return;
  }
  const coordinateSystem = readStoredOperationCoordinateSystem(session.coordinateSystemId) ?? session.coordinateSystem;
  const model = createSubjectShapeEditModel(session.target, {
    handleId: dragSession.handleId,
    point,
    dragPhase
  }, {
    bounds: {
      minX: coordinateSystem.xRange.min,
      minY: coordinateSystem.yRange.min,
      maxX: coordinateSystem.xRange.max,
      maxY: coordinateSystem.yRange.max
    },
    boundsMode: 'reject',
    snapToGrid: session.snapToGrid,
    snapMetric: getOperationShapeEditSnapMetric(coordinateSystem),
    minPolygonArea: 0.05
  });
  if (!model.applied || model.after.kind !== 'polygon') {
    const error = model.diagnostics.find((diagnostic) => diagnostic.severity === 'error');
    if (error) pushCoreInteractionDiagnostic(error.message);
    debugOperationShapeEdit('drag rejected', {
      pointerId: event.pointerId,
      handleId: dragSession.handleId,
      dragPhase,
      localPoint: point,
      diagnostics: model.diagnostics
    });
    return;
  }

  const nextSession: OperationShapeEditSession = {
    ...session,
    coordinateSystem,
    target: model.after
  };
  operationShapeEditSession.value = nextSession;
  updateOperationShapeEditCommands(nextSession);
  refreshOperationShapeEditProjection();
  syncAllToEngine({ keepSelection: session.coordinateSystemId });
  debugOperationShapeEdit('drag applied', {
    pointerId: event.pointerId,
    handleId: dragSession.handleId,
    dragPhase,
    localPoint: point,
    vertices: nextSession.target.vertices,
    diagnostics: model.diagnostics,
    updatedCommands: nextSession.commandIdsByVertex.map((commandId, index) => ({
      commandId,
      expression: createOperationShapeEditVertexCommand(nextSession.commandPrefix, index, nextSession.target.vertices[index])
    }))
  });
};

const getOperationShapeEditLocalPoint = (
  event: PointerEvent,
  session: OperationShapeEditSession
): MathPoint2D | null => {
  const localPoint = getCoreLocalPoint(event);
  if (!localPoint) return null;
  const coordinateSystem = readStoredOperationCoordinateSystem(session.coordinateSystemId) ?? session.coordinateSystem;
  const worldPoint = getWorldPointForCanvasPoint(localPoint);
  return clampOperationShapeEditPoint(operationWorldPointToLocal(worldPoint, coordinateSystem), coordinateSystem);
};

const getOperationShapeEditSnapMetric = (
  coordinateSystem: OperationCoordinateSystemRuntimeOptions
): SubjectGeometryGridSnapMetric => {
  const viewport = getGraphViewportSize();
  const bounds = getOperationVisiblePlacementBounds();
  const spanX = Math.abs(bounds.right - bounds.left);
  const spanY = Math.abs(bounds.top - bounds.bottom);
  const unitScale = Number.isFinite(coordinateSystem.unitScale) && coordinateSystem.unitScale > 0
    ? coordinateSystem.unitScale
    : 1;

  return {
    pixelsPerUnit: {
      x: spanX > 1e-9 ? Math.max(1, viewport.width) * unitScale / spanX : undefined,
      y: spanY > 1e-9 ? Math.max(1, viewport.height) * unitScale / spanY : undefined
    }
  };
};

const updateOperationShapeEditCommands = (session: OperationShapeEditSession) => {
  session.target.vertices.forEach((vertex, index) => {
    const commandId = session.commandIdsByVertex[index];
    if (commandId) store.updateCommand(commandId, createOperationShapeEditVertexCommand(session.commandPrefix, index, vertex));
  });
};

const refreshOperationShapeEditProjection = () => {
  operationShapeEditProjectionRevision.value += 1;
};

const clearOperationShapeEditSession = () => {
  clearOperationShapeEditDragSession();
  if (operationShapeEditSession.value) {
    debugOperationShapeEdit('session cleared', {
      coordinateSystemId: operationShapeEditSession.value.coordinateSystemId,
      commandPrefix: operationShapeEditSession.value.commandPrefix
    });
  }
  operationShapeEditSession.value = null;
  refreshOperationShapeEditProjection();
};

const clearOperationShapeEditDragSession = () => {
  if (operationShapeEditDragSession) {
    try {
      operationShapeEditDragSession.element.releasePointerCapture?.(operationShapeEditDragSession.pointerId);
    } catch {
      // Pointer capture can already be released by the browser when the drag ends.
    }
  }
  operationShapeEditDragSession = null;
  activeOperationShapeEditDragHandleId.value = '';
  window.removeEventListener('pointermove', handleOperationShapeEditHandleMove);
  window.removeEventListener('pointerup', handleOperationShapeEditHandleUp);
  window.removeEventListener('pointercancel', handleOperationShapeEditHandleUp);
  document.body.classList.remove('operation-shape-edit-drag-active');
};

const describeElementAtPoint = (clientX: number, clientY: number): Record<string, unknown> | null => {
  const element = document.elementFromPoint(clientX, clientY);
  if (!(element instanceof HTMLElement)) return null;
  return {
    tagName: element.tagName,
    id: element.id,
    className: element.className,
    dataset: { ...element.dataset }
  };
};

const shouldClearOperationShapeEditSessionForCommand = (commandId: string): boolean => {
  const session = operationShapeEditSession.value;
  if (!session) return false;
  return session.commandIdsByVertex.includes(commandId)
    || store.commands.find((command) => command.id === commandId)?.expression.startsWith(`${session.coordinateSystemId} =`) === true
    || store.commands.find((command) => command.id === commandId)?.expression.startsWith(`${session.commandPrefix}_`) === true;
};

const suppressOperationShapeEditEvent = (event: PointerEvent) => {
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation?.();
};

const isRuntimeDraggableNode = (node: GraphObjectNode | null | undefined): boolean => (
  isGraphDraggableNode(node)
);

const isCoordinateSystemDraggableNode = (node: GraphObjectNode | null | undefined): boolean => (
  node?.type === 'coordinate-system' && isRuntimeDraggableNode(node)
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

const getJsxGraphDraggableObjectAtEvent = (event: PointerEvent): string | null => {
  if (isCoreRendererActive.value || activeRendererBackend.value !== 'jsxgraph') return null;
  const board = engineRef.value?.getBoard() as { getAllObjectsUnderMouse?: (event: PointerEvent) => unknown[] } | null;
  const scene = engineRef.value?.exportRuntimeScene().scene;
  if (!board || !scene) return null;
  const objects = board.getAllObjectsUnderMouse?.(event) ?? [];
  let draggableObjectId: string | null = null;
  let coordinateSystemObjectId: string | null = null;
  for (const object of objects) {
    const objectId = readCoreObjectIdFromJsxGraphObject(object);
    if (!objectId) continue;
    const node = scene.objects.find((entry) => entry.id === objectId);
    if (!node) continue;
    if (isRuntimeDraggableNode(node as GraphObjectNode)) {
      if (node.type === 'coordinate-system') coordinateSystemObjectId ??= objectId;
      else draggableObjectId ??= objectId;
      continue;
    }
    return null;
  }
  if (draggableObjectId) return draggableObjectId;
  if (coordinateSystemObjectId) return coordinateSystemObjectId;

  const localPoint = getCoreLocalPoint(event);
  if (!localPoint) return null;
  const worldPoint = getWorldPointForCanvasPoint(localPoint);
  for (const node of [...scene.objects].reverse()) {
    if (isCoordinateSystemDraggableNode(node as GraphObjectNode) && isPointInsideCoordinateSystemRegion(node as GraphObjectNode, worldPoint)) return node.id;
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
  coreNavigationController?.resetPointers();
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
  if (applyOperationCoordinateSystemDragDelta(session, delta, dragPhase)) return;

  const constrainedDelta = clampCoordinateSystemDragDelta(session, delta);
  if (session.backend === 'core') {
    const result = getActiveCoreRuntime()?.applyDragToObject(session.objectId, { delta: constrainedDelta, dragPhase });
    if (result && !result.ok) pushCoreDiagnostics(result.diagnostics);
    if (dragPhase === 'end' && result?.ok && result.value) {
      persistDraggedOperationCoordinateSystemOrigin(session.objectId, result.value);
    }
  } else {
    const moved = engineRef.value?.executeRuntimeCapability('math.object.move', {
      scope: 'object',
      objectId: session.objectId
    }, { delta: constrainedDelta, dragPhase });
    if (!moved) pushCoreInteractionDiagnostic(`coordinate system drag failed: ${session.objectId}`);
  }
};

const applyOperationCoordinateSystemDragDelta = (
  session: CoordinateSystemDragSession,
  delta: { dimension: '2d'; dx: number; dy: number },
  dragPhase: 'move' | 'end'
): boolean => {
  if (store.activeMode !== 'operation') return false;
  const coordinateSystem = readStoredOperationCoordinateSystem(session.objectId);
  if (!coordinateSystem) return false;

  let nextOrigin = {
    x: coordinateSystem.origin.x + delta.dx,
    y: coordinateSystem.origin.y + delta.dy
  };
  nextOrigin = applyOperationCoordinateSystemSnap(nextOrigin, coordinateSystem, dragPhase);
  const bounds = getOperationVisiblePlacementBounds();
  const originOptions = {
    unitScale: coordinateSystem.unitScale,
    xRange: coordinateSystem.xRange,
    yRange: coordinateSystem.yRange
  };
  nextOrigin = dragPhase === 'end' && isOperationCoordinateSystemSnapEnabled(coordinateSystem)
    ? alignOperationCoordinateSystemOriginToGrid(nextOrigin, bounds, originOptions)
    : clampOperationCoordinateSystemOrigin(nextOrigin, bounds, originOptions);

  const updatedCount = updateOperationCoordinateSystemOrigin(store.commands, session.objectId, nextOrigin);
  if (updatedCount <= 0) return false;
  syncAllToEngine({ keepSelection: session.objectId });
  return true;
};

const readStoredOperationCoordinateSystem = (coordinateSystemId: string): OperationCoordinateSystemRuntimeOptions | null => {
  for (const command of store.commands) {
    const options = readPlainRecord(command.options);
    const coordinateSystem = readPlainRecord(options?.coordinateSystem);
    if (coordinateSystem?.id !== coordinateSystemId) continue;
    return normalizeOperationCoordinateSystem(coordinateSystem);
  }
  return null;
};

const normalizeOperationCoordinateSystem = (
  value: Record<string, unknown>
): OperationCoordinateSystemRuntimeOptions | null => {
  const origin = readPointRecord(value.origin);
  const xRange = readRangeRecord(value.xRange);
  const yRange = readRangeRecord(value.yRange);
  const unitScale = typeof value.unitScale === 'number' && Number.isFinite(value.unitScale) && value.unitScale > 0
    ? value.unitScale
    : 1;
  if (typeof value.id !== 'string' || !origin || !xRange || !yRange) return null;
  return {
    id: value.id,
    origin,
    unitScale,
    xRange,
    yRange,
    snapToGrid: value.snapToGrid
  };
};

const applyOperationCoordinateSystemSnap = (
  origin: { x: number; y: number },
  coordinateSystem: OperationCoordinateSystemRuntimeOptions,
  dragPhase: 'move' | 'end'
): { x: number; y: number } => {
  const snapOptions = resolveGraphGridSnapOptions(coordinateSystem.snapToGrid, { enabled: false, step: coordinateSystem.unitScale });
  if (!snapOptions.enabled || (snapOptions.phase === 'end' && dragPhase === 'move')) return origin;
  return snapPointToGraphGrid(origin, snapOptions);
};

const isOperationCoordinateSystemSnapEnabled = (coordinateSystem: OperationCoordinateSystemRuntimeOptions): boolean => (
  resolveGraphGridSnapOptions(coordinateSystem.snapToGrid, { enabled: false, step: coordinateSystem.unitScale }).enabled
);

const clampCoordinateSystemDragDelta = (
  session: CoordinateSystemDragSession,
  delta: { dimension: '2d'; dx: number; dy: number }
): { dimension: '2d'; dx: number; dy: number } => {
  const node = getCoordinateSystemDragNode(session);
  const payload = node?.payload as Record<string, unknown> | undefined;
  const origin = readCoordinateSystemNodeOrigin(node as GraphObjectNode | null);
  const xRange = payload?.xRange as Record<string, unknown> | undefined;
  const yRange = payload?.yRange as Record<string, unknown> | undefined;
  const unitScale = typeof payload?.unitPx === 'number' && Number.isFinite(payload.unitPx) && payload.unitPx > 0
    ? payload.unitPx
    : 1;
  if (
    !origin
    || typeof xRange?.min !== 'number'
    || typeof xRange.max !== 'number'
    || typeof yRange?.min !== 'number'
    || typeof yRange.max !== 'number'
  ) {
    return delta;
  }
  const nextOrigin = clampOperationCoordinateSystemOrigin({
    x: origin.x + delta.dx,
    y: origin.y + delta.dy
  }, getOperationVisiblePlacementBounds(), {
    unitScale,
    xRange: { min: xRange.min, max: xRange.max },
    yRange: { min: yRange.min, max: yRange.max }
  });
  return {
    dimension: '2d',
    dx: nextOrigin.x - origin.x,
    dy: nextOrigin.y - origin.y
  };
};

const getCoordinateSystemDragNode = (session: CoordinateSystemDragSession): GraphObjectNode | null => {
  if (session.backend === 'core') return getActiveCoreRuntime()?.scene.getObject(session.objectId) ?? null;
  return engineRef.value?.exportRuntimeScene().scene?.objects.find((node) => node.id === session.objectId) ?? null;
};

const persistDraggedOperationCoordinateSystemOrigin = (
  coordinateSystemId: string,
  node: GraphObjectNode
) => {
  const origin = readCoordinateSystemNodeOrigin(node);
  if (!origin) return;
  updateOperationCoordinateSystemOrigin(store.commands, coordinateSystemId, origin);
};

const readPlainRecord = (value: unknown): Record<string, unknown> | null => (
  typeof value === 'object' && value !== null ? value as Record<string, unknown> : null
);

const readPointRecord = (value: unknown): { x: number; y: number } | null => {
  const record = readPlainRecord(value);
  return typeof record?.x === 'number' && Number.isFinite(record.x)
    && typeof record.y === 'number' && Number.isFinite(record.y)
    ? { x: record.x, y: record.y }
    : null;
};

const readRangeRecord = (value: unknown): { min: number; max: number } | null => {
  const record = readPlainRecord(value);
  return typeof record?.min === 'number' && Number.isFinite(record.min)
    && typeof record.max === 'number' && Number.isFinite(record.max)
    ? { min: record.min, max: record.max }
    : null;
};

const readCoordinateSystemNodeOrigin = (node: GraphObjectNode | null | undefined): { x: number; y: number } | null => {
  if (!node) return null;
  const payload = typeof node.payload === 'object' && node.payload !== null
    ? node.payload as Record<string, unknown>
    : null;
  const origin = typeof payload?.origin === 'object' && payload.origin !== null
    ? payload.origin as Record<string, unknown>
    : null;
  if (typeof origin?.x !== 'number' || !Number.isFinite(origin.x)) return null;
  if (typeof origin.y !== 'number' || !Number.isFinite(origin.y)) return null;
  return { x: origin.x, y: origin.y };
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

  const selected = runtime.selectObject(objectId, { source: 'pointer' });
  if (!selected.ok) {
    pushCoreDiagnostics(selected.diagnostics);
    return;
  }
  pushCoreInteractionDiagnostic(`selected ${objectId}${pick?.backendId ? ` via ${pick.backendId}` : ''}`);
};

const clearCoreSelection = (reason = 'selection cleared') => {
  const runtime = getActiveCoreRuntime();
  if (!runtime) return;

  const hadSelection = runtime.getSelectionItems().length > 0;
  const cleared = runtime.clearSelection({ source: 'pointer' });
  if (!cleared.ok) {
    pushCoreDiagnostics(cleared.diagnostics);
    return;
  }
  if (hadSelection) {
    pushCoreInteractionDiagnostic(reason);
  }
};

const handleCoreRendererWheel = (event: WheelEvent) => {
  if (!isCoreRendererActive.value) return;
  if (isBabylonRendererActive.value && getBabylonRenderModeForCurrentMode() === '3d') return;

  const point = getCoreLocalPoint(event);
  if (!point) return;
  const result = requireCoreNavigationController().handleWheel({
    point,
    ctrlKey: event.ctrlKey,
    metaKey: event.metaKey,
    deltaMode: event.deltaMode,
    deltaX: event.deltaX,
    deltaY: event.deltaY
  });
  if (!result.handled) return;

  event.preventDefault();
  setCoreViewportBounds(result.bounds, describeCoreNavigationKind(result.kind, event));
};

const handleCoreRendererPointerDown = (event: PointerEvent) => {
  if (!isCoreRendererActive.value && activeRendererBackend.value !== 'jsxgraph') return;
  const point = getCoreLocalPoint(event);
  if (!point) return;

  const jsxGraphDraggableObjectId = getJsxGraphDraggableObjectAtEvent(event);
  if (jsxGraphDraggableObjectId) {
    engineRef.value?.executeRuntimeCapability('math.object.select', {
      scope: 'object',
      objectId: jsxGraphDraggableObjectId
    });
    startCoordinateSystemDrag(event, jsxGraphDraggableObjectId, 'jsxgraph', point);
    return;
  }

  if (!isCoreRendererActive.value) return;
  const controller = requireCoreNavigationController();
  if (controller.getPointerCount() > 0) {
    const result = controller.handlePointerDown({
      pointerId: event.pointerId,
      point
    });
    if (!result.handled) return;

    coordinateSystemDragSession = null;
    event.preventDefault();
    graphContainerRef.value?.setPointerCapture?.(event.pointerId);
    pushCoreInteractionDiagnostic(describeCoreNavigationKind(result.kind));
    return;
  }

  const runtime = getActiveCoreRuntime();
  const routed = runtime?.router.pickWithDiagnostics(point, { pickOptions: { tolerancePx: 10 } });
  if (routed) pushCoreDiagnostics(routed.diagnostics);
  if (routed?.pick?.target.objectId) {
    const objectId = routed.pick.target.objectId;
    selectCoreObject(objectId, routed.pick);
    const node = runtime?.scene.getObject(objectId);
    if (isRuntimeDraggableNode(node)) {
      startCoordinateSystemDrag(event, objectId, 'core', point);
    }
    return;
  }

  clearCoreSelection('selection cleared via background');
  if (isBabylonRendererActive.value && getBabylonRenderModeForCurrentMode() === '3d') return;

  const result = controller.handlePointerDown({
    pointerId: event.pointerId,
    point
  });
  if (!result.handled) return;

  coordinateSystemDragSession = null;
  event.preventDefault();
  graphContainerRef.value?.setPointerCapture?.(event.pointerId);
  pushCoreInteractionDiagnostic(describeCoreNavigationKind(result.kind));
};

const handleCoreRendererPointerMove = (event: PointerEvent) => {
  if (!isCoreRendererActive.value && !coordinateSystemDragSession) return;
  const point = getCoreLocalPoint(event);
  if (!point) return;
  if (moveCoordinateSystemDrag(event, point)) return;
  if (!isCoreRendererActive.value) return;
  const result = requireCoreNavigationController().handlePointerMove({
    pointerId: event.pointerId,
    point
  });
  if (!result.handled) return;

  event.preventDefault();
  setCoreViewportBounds(result.bounds, describeCoreNavigationKind(result.kind));
};

const handleCoreRendererPointerUp = (event: PointerEvent) => {
  if (!isCoreRendererActive.value && !coordinateSystemDragSession) return;
  stopCoordinateSystemDrag(event);
  if (!isCoreRendererActive.value) return;
  const result = requireCoreNavigationController().handlePointerUp({ pointerId: event.pointerId });
  graphContainerRef.value?.releasePointerCapture?.(event.pointerId);
  if (result.handled) {
    event.preventDefault();
  }
};

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

const stopViewportChangeSubscription = () => {
  disposeViewportChangeSubscription?.();
  disposeViewportChangeSubscription = null;
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
      refreshBusinessOverlayPosition();
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
  coreNavigationController = null;
  coordinateSystemDragSession = null;
  clearOperationShapeEditDragSession();
  stopViewportChangeSubscription();
  stopCoreRuntimeSelectionSubscription();
  resetCoreRuntimeSelection();
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
  const runtime = new GraphSceneRuntime({
    backend,
    defaultContext: { layerId: 'content' }
  });
  canvasRuntimeRef.value = runtime;
  subscribeCoreRuntimeSelection(runtime);

  if (options.syncCommands !== false) {
    syncAllToEngine();
  }
  startResizeObserver();
  refreshBusinessOverlayPosition();
};

const createCoreRenderLayer = (
  host: HTMLElement,
  name: string,
  options: { zIndex: number; pointerEvents: 'auto' | 'none' }
): HTMLDivElement => {
  const layer = document.createElement('div');
  layer.setAttribute('data-vuegraphx-render-layer', name);
  Object.assign(layer.style, {
    position: 'absolute',
    inset: '0',
    zIndex: String(options.zIndex),
    pointerEvents: options.pointerEvents
  });
  host.appendChild(layer);
  return layer;
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

  const grid = getBoardOptionsForCurrentMode(store.activeMode).grid;
  coreViewportBounds.value = createCoreViewportBoundsForCurrentMode();
  host.replaceChildren();
  const babylonLayer = createCoreRenderLayer(host, 'babylon-3d', { zIndex: 1, pointerEvents: 'auto' });
  const overlayLayer = createCoreRenderLayer(host, 'canvas2d-overlay', { zIndex: 2, pointerEvents: 'none' });
  babylonRuntimeError.value = '';
  const renderMode: BabylonRenderMode = '3d';
  try {
    const BABYLON = await loadBabylonNamespace();
    const runtimePort = createBabylonRuntime(BABYLON, {
      renderMode,
      attachCameraControl: true,
      canvasPointerEvents: 'auto',
      showAxes: shouldShowCoreAxesForCurrentMode(),
      grid
    });
    const backend = createBabylonGraphBackend({
      id: 'playground-babylon',
      runtime: runtimePort
    });
    backend.mount(babylonLayer, {
      size: getGraphViewportSize(),
      attributes: { renderMode, worldBounds: coreViewportBounds.value, showAxes: shouldShowCoreAxesForCurrentMode(), grid }
    });
    babylonBackendRef.value = backend;
    const babylonRuntime = new GraphSceneRuntime({
      backend,
      defaultContext: { layerId: 'content' }
    });
    babylonRuntimeRef.value = babylonRuntime;
    subscribeCoreRuntimeSelection(babylonRuntime);

    const overlayBackend = createCanvas2DGraphBackend({
      id: 'playground-canvas2d-overlay',
      pixelRatio: window.devicePixelRatio || 1,
      worldBounds: coreViewportBounds.value,
      showAxes: false,
      grid: false,
      preserveAspectRatio: true
    });
    overlayBackend.mount(overlayLayer, {
      size: getGraphViewportSize(),
      attributes: { worldBounds: coreViewportBounds.value, grid: false }
    });
    canvasBackendRef.value = overlayBackend;
    canvasRuntimeRef.value = new GraphSceneRuntime({
      backend: overlayBackend,
      defaultContext: { layerId: 'content' }
    });
  } catch (error) {
    babylonRuntimeError.value = `Babylon Core 无法加载：${error instanceof Error ? error.message : String(error)}。请安装 @babylonjs/core 后再使用该后端。`;
  }

  if (options.syncCommands !== false) {
    syncAllToEngine();
  }
  startResizeObserver();
  refreshBusinessOverlayPosition();
};

const getBabylonRenderModeForCurrentMode = (): BabylonRenderMode => (
  '3d'
);
const shouldShowCoreAxesForCurrentMode = (): boolean => (
  getBoardOptionsForCurrentMode(store.activeMode).axis !== false
);

const initJsxGraphRenderer = (options: { syncCommands?: boolean } = {}) => {
  if (!graphContainerRef.value) return;

  engineRef.value = new GraphXEngine('vuegraphx-mount', getBoardOptionsForCurrentMode(store.activeMode));
  engineRef.value.setMode(getEngineModeForPlayground(store.activeMode));
  registerPlaygroundShapes(engineRef.value);
  stopViewportChangeSubscription();
  disposeViewportChangeSubscription = engineRef.value.subscribeViewportChange(() => {
    refreshBusinessOverlayPosition();
  });

  if (options.syncCommands !== false) {
    syncAllToEngine();
  }
  startResizeObserver();
  refreshBusinessOverlayPosition();
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
  clearOperationShapeEditSession();
  store.activeMode = mode;
  activeDemo.value = -1;
  if (!isRendererBackendSupported(activeRendererBackend.value)) {
    activeRendererBackend.value = getPreferredBackendForMode(mode);
  }

  stopResizeObserver();
  destroyPrimaryRenderer();
  resetCoreViewportBounds();
  coreInteractionDiagnostics.value = [];
  resetCoreRuntimeSelection();

  await waitForUiPaint();
  await initEngines(options);
};

const switchRendererBackend = async (backend: PlaygroundRenderBackend) => {
  if (activeRendererBackend.value === backend) return;
  activeRendererBackend.value = isRendererBackendSupported(backend) ? backend : getPreferredBackendForMode(store.activeMode);
  showScenePanel.value = false;

  stopResizeObserver();
  destroyPrimaryRenderer();
  resetCoreViewportBounds();
  coreInteractionDiagnostics.value = [];
  resetCoreRuntimeSelection();
  await waitForUiPaint();
  await initEngines({ syncCommands: true });
};

const handleRendererBackendChange = (event: Event) => {
  const backend = (event.target as HTMLSelectElement | null)?.value;
  if (backend === 'jsxgraph' || backend === 'canvas2d' || backend === 'babylon') {
    switchRendererBackend(backend);
  }
};

const handleCreateOperationCommands = (
  commands: readonly CommandInput[],
  dropPoint: GraphClientPoint | null = null,
  options: { origin?: MathPoint2D; scopeToCoordinateSystem?: boolean } = {}
) => {
  if (commands.length === 0) return;
  clearOperationShapeEditSession();
  activeDemo.value = -1;
  const bounds = getOperationVisiblePlacementBounds();
  const origin = options.origin ?? getWorldPointForOperationDrop(dropPoint);
  const scopeToCoordinateSystem = options.scopeToCoordinateSystem ?? true;
  const nextCommands = store.activeMode === 'operation' && scopeToCoordinateSystem
    ? createOperationScopedCommands(
      commands,
      origin,
      `coord_${nextOperationCoordinateSystemSequence++}`,
      bounds
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
  if (shouldClearOperationShapeEditSessionForCommand(id)) {
    clearOperationShapeEditSession();
  }
  store.removeCommand(id);
  if (isCoreRendererActive.value) {
    syncAllToEngine();
  } else if (engineRef.value) {
    engineRef.value.removeCommand(id);
  }
};

const clearAll = () => {
  clearOperationShapeEditSession();
  store.clearCommands();
  activeDemo.value = -1;
  resetCoreRuntimeSelection();
  if (engineRef.value) engineRef.value.clearBoard();
  if (canvasRuntimeRef.value) canvasRuntimeRef.value.clear();
  else if (canvasBackendRef.value) canvasBackendRef.value.clear();
  if (babylonRuntimeRef.value) babylonRuntimeRef.value.clear();
};

const syncAllToEngine = (options: { keepSelection?: string } = {}) => {
  if (isCanvasRendererActive.value) {
    const runtime = canvasRuntimeRef.value;
    if (!canvasBackendRef.value || !runtime) return;
    const selectedObjectId = options.keepSelection ?? coreSelectedObjectId.value;
    const result = buildPlaygroundCanvasScene(store.commands);
    store.commands.forEach((command) => {
      const diagnostic = result.diagnostics.find((item) => item.commandId === command.id);
      store.setCommandError(command.id, diagnostic?.message ?? '');
    });
    const synced = runtime.syncObjects(applyCoreRuntimeSelection(result.nodes, selectedObjectId));
    if (!synced.ok) pushCoreDiagnostics(synced.diagnostics);
    return;
  }

  if (isBabylonRendererActive.value) {
    const runtime = babylonRuntimeRef.value;
    if (!babylonBackendRef.value || !runtime) {
      store.commands.forEach((command) => {
        if (command.expression.trim()) store.setCommandError(command.id, babylonRuntimeError.value || 'Babylon 后端未初始化。');
      });
      return;
    }
    const selectedObjectId = options.keepSelection ?? coreSelectedObjectId.value;
    const result = buildPlaygroundLayered3DScene(store.commands);
    store.commands.forEach((command) => {
      const diagnostic = result.babylon.diagnostics.find((item) => item.commandId === command.id)
        ?? result.overlay.diagnostics.find((item) => item.commandId === command.id);
      store.setCommandError(command.id, diagnostic?.message ?? '');
    });
    const synced = runtime.syncObjects(applyCoreRuntimeSelection(result.babylon.nodes, selectedObjectId));
    if (!synced.ok) pushCoreDiagnostics(synced.diagnostics);
    const overlayRuntime = canvasRuntimeRef.value;
    if (overlayRuntime) {
      const overlaySynced = overlayRuntime.syncObjects(result.overlay.nodes);
      if (!overlaySynced.ok) pushCoreDiagnostics(overlaySynced.diagnostics);
    }
    return;
  }

  if (engineRef.value) engineRef.value.clearVariables();
  store.commands.forEach(cmd => executeSingle(cmd.id));
  // 批量创建图元后 JSXGraph 不会自动重绘，必须手动触发
  if (engineRef.value) engineRef.value.forceUpdate();
};

const applyCoreRuntimeSelection = (
  nodes: readonly GraphObjectNode[],
  selectedObjectId?: string
): GraphObjectNode[] => {
  if (!selectedObjectId) return [...nodes];
  return nodes.map((node) => (
    node.id === selectedObjectId
      ? { ...node, meta: { ...(node.meta ?? {}), selected: true } }
      : node
  ));
};

/** 加载点击的 Demo 卡片 */
const loadSelectedDemo = (idx: number) => {
  const demo = currentDemos.value[idx];
  if (!demo) return;
  clearOperationShapeEditSession();
  activeDemo.value = idx;
  store.injectDemo(store.activeMode, demo.commands);
  // 使用 resetBoard 完全重置 JSXGraph 内部状态，避免 clearBoard/removeObject 的副作用
  if (engineRef.value) engineRef.value.resetBoard(getBoardOptionsForCurrentMode(store.activeMode));
  if (canvasRuntimeRef.value) canvasRuntimeRef.value.clear();
  if (babylonRuntimeRef.value) babylonRuntimeRef.value.clear();
  resetCoreViewportBounds();
  resetCoreRuntimeSelection();
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
  clearOperationShapeEditSession();
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

.operation-shape-edit-handle {
  position: absolute;
  width: 28px;
  height: 28px;
  transform: translate(-50%, -50%);
  border: 0;
  padding: 0;
  background: transparent;
  color: rgba(0, 0, 0, 0.85);
  cursor: grab;
  touch-action: none;
  transition: transform 120ms ease;
}

.operation-shape-edit-handle::before {
  content: "";
  position: absolute;
  left: 50%;
  top: 50%;
  width: 8px;
  height: 8px;
  transform: translate(-50%, -50%);
  border: 1.5px solid #333333;
  border-radius: 999px;
  background: #ffffff;
  box-sizing: border-box;
  transition: box-shadow 120ms ease;
}

.operation-shape-edit-handle span {
  position: absolute;
  left: calc(50% + 5px);
  top: calc(50% - 10px);
  display: block;
  width: 10px;
  height: 14px;
  font-family: "PingFang SC", "Microsoft YaHei", Arial, sans-serif;
  font-size: 14px;
  font-weight: 500;
  line-height: 14px;
  color: rgba(0, 0, 0, 0.85);
  pointer-events: none;
}

.operation-shape-edit-handle:hover,
.operation-shape-edit-handle:focus-visible,
.operation-shape-edit-handle-active {
  outline: none;
}

.operation-shape-edit-handle:hover::before,
.operation-shape-edit-handle:focus-visible::before,
.operation-shape-edit-handle-active::before {
  box-shadow: 0 0 0 3px rgba(51, 51, 51, 0.12);
}

.operation-shape-edit-handle-active,
body.operation-shape-edit-drag-active {
  cursor: grabbing;
}

#graph-container .JXGinfobox,
#graph-container .JXG_navigation,
#graph-container foreignObject {
  pointer-events: none;
}

.business-overlay-anchor {
  position: absolute;
  left: 0;
  top: 0;
  min-width: 220px;
  max-width: min(260px, calc(100vw - 2rem));
  transition: opacity 120ms ease;
  will-change: transform;
}

.business-overlay-anchor::after {
  content: "";
  position: absolute;
  left: 50%;
  bottom: -9px;
  width: 12px;
  height: 12px;
  border-right: 1px solid rgba(16, 185, 129, 0.28);
  border-bottom: 1px solid rgba(16, 185, 129, 0.28);
  background: rgba(255, 255, 255, 0.96);
  transform: translateX(-50%) rotate(45deg);
}

.business-overlay-anchor-hidden {
  opacity: 0.35;
}

.business-overlay-card {
  position: relative;
  border: 1px solid rgba(16, 185, 129, 0.24);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.96);
  padding: 0.8rem;
  box-shadow: 0 14px 38px rgba(15, 23, 42, 0.16);
  backdrop-filter: blur(10px);
}

.business-overlay-status {
  border-radius: 999px;
  background: #ecfdf5;
  color: #047857;
  padding: 0.25rem 0.5rem;
  font-size: 0.65rem;
  font-weight: 700;
  line-height: 1;
}

.business-overlay-metric {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  border-radius: 6px;
  background: #f8fafc;
  padding: 0.45rem 0.55rem;
}

.business-overlay-metric span {
  color: #64748b;
  font-size: 0.68rem;
  font-weight: 600;
}

.business-overlay-metric strong {
  color: #0f172a;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 0.76rem;
}

</style>
