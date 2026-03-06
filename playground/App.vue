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
        <button @click="clearAll" class="text-xs font-semibold px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded transition-colors hidden sm:block">
          清除全部
        </button>
      </div>
    </header>

    <div class="flex-1 flex overflow-hidden relative">
      <!-- 左侧控制面板 -->
      <aside class="w-80 sm:w-96 bg-white border-r border-slate-200 shadow-[2px_0_8px_rgba(0,0,0,0.02)] flex flex-col z-10 shrink-0 h-full">
        
        <!-- 指令多行表单流列表 -->
        <div class="flex-1 overflow-y-auto overflow-x-hidden p-2">
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

        <!-- Demo 示例区（多卡片可切换） -->
        <div class="border-t border-slate-100 bg-slate-50/80 shrink-0">
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
      </aside>

      <!-- 图形处理层 -->
      <main class="flex-1 relative bg-white flex items-center justify-center m-0 sm:m-4 shadow-sm border border-slate-200 overflow-hidden sm:rounded-xl z-0">
        <div id="vuegraphx-mount" class="w-full h-full jxgbox" ref="graphContainerRef"></div>
        <ExternalCircleDesigner :engine="engineRef" :active-mode="store.activeMode" />
        <ExternalCubeDesigner :engine="engineRef" :active-mode="store.activeMode" />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { shallowRef, ref, onMounted, onUnmounted, nextTick, computed } from 'vue';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { GraphXEngine, type EngineMode } from 'vuegraphx';
import { useFormulaStore, type CommandItem } from './stores/formula';
import ExternalCircleDesigner from './components/ExternalCircleDesigner.vue';
import ExternalCubeDesigner from './components/ExternalCubeDesigner.vue';
import { registerPlaygroundShapes } from './shapes';

// 顶部工具栏模式列表
const availableModes: {id: EngineMode, label: string, icon: string}[] = [
  { id: '2d', label: '二维画板', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>' },
  { id: '3d', label: '3D计算器', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>' },
  { id: 'geometry', label: '几何区', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon></svg>' }
];

// ===== 各模式的多 Demo 示例库 =====
interface DemoItem {
  emoji: string;
  title: string;
  desc: string;
  commands: (string | { expr: string, options?: any })[];
}

const allDemos: Record<EngineMode, DemoItem[]> = {
  '2d': [
    {
      emoji: '🌊',
      title: '三角函数叠加',
      desc: '正弦余弦的相位叠加，经典周期波形',
      commands: [
        'a = 0.5',
        'w = 2',
        'f(x) = sin(x) + a*cos(w*x)',
        'g(x) = sin(x) - a*cos(w*x)'
      ]
    },
    {
      emoji: '📐',
      title: '切线演示',
      desc: '曲线在某点处的切线作图',
      commands: ['f(x) = x^2', 'A = (1, 1)', 'Tangent(A, f)']
    },
    {
      emoji: '❤️',
      title: '心形曲线',
      desc: '经典心形曲线，上下两段拼合',
      commands: [
        { expr: 'h(x) = abs(x) - 1', options: { plot: false } },
        'y = sqrt(1 - h(x)^2)',
        { expr: 'k(x) = (abs(x)/2)^(2/3)', options: { plot: false } },
        'y = -3*sqrt(1-k(x))'
      ]
    },
    {
      emoji: '🔄',
      title: '导数对比',
      desc: '函数与其导数的图像对比',
      commands: ['f(x) = sin(x)', 'df(x) = cos(x)']
    },
    {
      emoji: '🌀',
      title: '有理函数',
      desc: '分子三次、分母二次的有理函数',
      commands: [
        { expr: 'num(x) = x^3 - 3*x', options: { plot: false } },
        { expr: 'den(x) = x^2 + 1', options: { plot: false } },
        'y = num(x)/den(x)'
      ]
    },
  ],
  '3d': [
    {
      emoji: '🌊',
      title: '波浪曲面',
      desc: '二元函数 sin(x)cos(y) 的曲面',
      commands: [
        'z = sin(x)*cos(y)'
      ]
    },
    {
      emoji: '🏔️',
      title: '高斯曲面',
      desc: '二维高斯正态分布钟形曲面',
      commands: [
        'z = exp(-(x^2 + y^2)/4)'
      ]
    },
    {
      emoji: '🌀',
      title: '马鞍面',
      desc: '经典双曲抛物面 z = x²-y²',
      commands: [
        'z = x^2 - y^2'
      ]
    },
    {
      emoji: '🏖️',
      title: '涟漪曲面',
      desc: '以原点为中心的衰减波',
      commands: [
        'z = sin(sqrt(x^2 + y^2)) / (sqrt(x^2 + y^2) + 0.01)'
      ]
    },
    {
      emoji: '🍩',
      title: '环面 (甜甜圈)',
      desc: '使用最新的 Surface 参数曲面方程生成',
      commands: [
        'R = 3',
        'r = 1',
        'X(u, v) = (R + r*cos(v))*cos(u)',
        'Y(u, v) = (R + r*cos(v))*sin(u)',
        'Z(u, v) = r*sin(v)',
        'Surface(X(u, v), Y(u, v), Z(u, v))'
      ]
    },
  ],
  'geometry': [
    {
      emoji: '⭕',
      title: '欧氏尺规交点',
      desc: '双圆相交构造等边三角形',
      commands: ['A = (-2, 0)', 'B = (2, 0)', 'c1 = Circle(A, B)', 'c2 = Circle(B, A)', 'Segment(A, B)']
    },
    {
      emoji: '△',
      title: '三点成三角',
      desc: '通过三点连线构造封闭多边形',
      commands: ['A = (0, 3)', 'B = (-3, -2)', 'C = (3, -2)', 'Segment(A, B)', 'Segment(B, C)', 'Segment(C, A)']
    },
    {
      emoji: '🔵',
      title: '同心圆',
      desc: '以原点为圆心的多重圆形',
      commands: ['O = (0, 0)', 'P1 = (2, 0)', 'P2 = (4, 0)', 'P3 = (6, 0)', 'Circle(O, P1)', 'Circle(O, P2)', 'Circle(O, P3)']
    },
    {
      emoji: '📏',
      title: '菱形作图',
      desc: '四点对称作菱形',
      commands: [
        'A = (0, 2)', 'B = (2, 0)', 'C = (0, -2)', 'D = (-2, 0)', 
        { expr: 'Polygon(A, B, C, D)', options: { fillColor: '#f43f5e', fillOpacity: 0.3, strokeWidth: 3, dash: 2 } }
      ]
    },
    {
      emoji: '↗️',
      title: '直线与圆',
      desc: '一条直线穿过两点，配合圆形演示',
      commands: ['A = (-3, -1)', 'B = (3, 1)', 'O = (0, 3)', 'R = (2, 3)', 'Line(A, B)', 'Circle(O, R)']
    },
  ]
};

const store = useFormulaStore();
const graphContainerRef = ref<HTMLElement | null>(null);
const activeDemo = ref<number>(-1);

const engineRef = shallowRef<GraphXEngine | null>(null);

// 当前模式的 Demo 列表
const currentDemos = computed(() => allDemos[store.activeMode] || []);

// LaTeX 实时渲染预览（支持剥离首尾常见的 $ 或者 $$ 包裹符号）
const renderLatexPreview = (expr: string): string => {
  try {
    const pureExpr = expr.replace(/^\$+(.*?)\$+$/, '$1').trim();
    return katex.renderToString(pureExpr, { throwOnError: true, displayMode: false });
  } catch {
    return `<span class="font-mono text-sm text-slate-600">${expr}</span>`;
  }
};

onMounted(() => {
  if (graphContainerRef.value) {
    const boardOptions = store.activeMode === 'geometry' 
      ? { axis: false, showNavigation: false }
      : { axis: true, showNavigation: true };
      
    engineRef.value = new GraphXEngine('vuegraphx-mount', boardOptions);
    registerPlaygroundShapes(engineRef.value);
    syncAllToEngine();
  }
});

onUnmounted(() => {
  if (engineRef.value) {
    engineRef.value.destroy();
    engineRef.value = null;
  }
});

const switchMode = async (mode: EngineMode) => {
  if (store.activeMode === mode) return;
  store.activeMode = mode;
  activeDemo.value = -1;
  
  if (engineRef.value) {
    // 外部控制特定模式的基础画板表现，彻底从引擎硬编码中剥离（例如几何区不需要坐标系）
    const boardOptions = mode === 'geometry' 
      ? { axis: false, showNavigation: false }
      : { axis: true, showNavigation: true };
      
    engineRef.value.setMode(mode, boardOptions);
    await nextTick();
    syncAllToEngine();
  }
};

const handleLineEnter = (_id: string, index: number) => {
  syncAllToEngine();
  if (index === store.commands.length - 1) {
    store.addCommand('');
  }
};

const executeSingle = (id: string) => {
  const cmd = store.commands.find(c => c.id === id) as CommandItem & { isFocused?: boolean } | undefined;
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
  if (engineRef.value) engineRef.value.removeCommand(id);
};

const clearAll = () => {
  store.clearCommands();
  if (engineRef.value) engineRef.value.clearBoard();
  activeDemo.value = -1;
};

const syncAllToEngine = () => {
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
  if (engineRef.value) engineRef.value.resetBoard();
  nextTick(() => {
    syncAllToEngine();
  });
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
</style>

