<template>
  <section class="flex h-full min-h-0 flex-col bg-white">
    <div class="border-b border-slate-100 px-4 py-4">
      <p class="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-700">Operation Area</p>
      <h2 class="mt-1 text-xl font-bold tracking-tight text-slate-900">操作区</h2>
      <p class="mt-1 text-xs leading-5 text-slate-500">
        拖拽到画布会按落点生成对象；点击按钮会在当前画布中心生成同一组命令。
      </p>
    </div>

    <div class="min-h-0 flex-1 overflow-y-auto p-4">
      <div class="space-y-5">
        <div v-for="group in operationToolGroups" :key="group.title">
          <div class="mb-2 flex items-center justify-between">
            <h3 class="text-xs font-bold uppercase tracking-wide text-slate-500">{{ group.title }}</h3>
            <span class="text-[10px] text-slate-400">拖拽落点 / 点击居中</span>
          </div>

          <div class="grid gap-2">
            <button
              v-for="tool in group.tools"
              :key="tool.id"
              type="button"
              draggable="true"
              class="group flex cursor-grab items-center gap-3 rounded-xl border px-3 py-3 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-sky-200 hover:bg-sky-50 active:cursor-grabbing active:translate-y-0"
              :class="activeToolId === tool.id
                ? 'border-teal-300 bg-teal-50 ring-2 ring-teal-100'
                : 'border-slate-200 bg-white'"
              :aria-pressed="activeToolId === tool.id"
              @click="handleToolClick(tool)"
              @dragstart="startDrag(tool, $event)"
            >
              <span
                class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg"
                :class="tool.iconClass"
              >
                {{ tool.icon }}
              </span>
              <span class="min-w-0">
                <span class="block text-sm font-semibold text-slate-800 group-hover:text-sky-800">
                  {{ tool.label }}
                </span>
                <span class="mt-0.5 block text-[11px] leading-4 text-slate-400">
                  {{ tool.description }}
                </span>
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { OPERATION_COMMANDS_MIME, OPERATION_TOOL_MIME, operationToolGroups, type OperationCommandSpec, type OperationTool } from '../operationTools';

defineProps<{
  activeToolId?: string;
}>();

const emit = defineEmits<{
  'create-commands': [commands: readonly OperationCommandSpec[]];
  'activate-tool': [tool: OperationTool];
}>();

const handleToolClick = (tool: OperationTool) => {
  console.info('[VueGraphX operation tool]', tool.interaction ? 'activate' : 'create', {
    toolId: tool.id,
    interaction: tool.interaction ?? null
  });
  if (tool.interaction) {
    emit('activate-tool', tool);
    return;
  }
  emit('create-commands', tool.commands);
};

const startDrag = (tool: OperationTool, event: DragEvent) => {
  console.info('[VueGraphX operation tool]', 'dragstart', {
    toolId: tool.id,
    interaction: tool.interaction ?? null
  });
  const commands = tool.commands;
  event.dataTransfer?.setData(OPERATION_TOOL_MIME, JSON.stringify({
    id: tool.id,
    interaction: tool.interaction ?? null
  }));
  event.dataTransfer?.setData(OPERATION_COMMANDS_MIME, JSON.stringify(commands));
  event.dataTransfer?.setData('text/plain', commands.map((command) => command.expr).join('\n'));
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'copy';
  }
};
</script>
