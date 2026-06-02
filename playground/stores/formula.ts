import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { GraphSceneCommandNode } from 'vuegraphx';
import type { PlaygroundMode } from '../types/mode';

export interface CommandItem {
  id: string;
  expression: string;
  color: string;
  visible: boolean;
  error?: string;
  isFocused?: boolean; // LaTeX 预览时的焦点状态
  options?: any;       // 开放拓展透传给底层绘图引擎的自定义配置项（例如 fillColor）
}

export interface CommandInput {
  expr: string;
  options?: any;
}

const commandColors = ['#0ea5e9', '#f43f5e', '#8b5cf6', '#10b981', '#f59e0b'];

let nextCommandSequence = 1;

const createCommandId = (existingCommands: readonly CommandItem[]): string => {
  const existingIds = new Set(existingCommands.map((command) => command.id));
  let id = '';
  do {
    id = `cmd_${nextCommandSequence++}`;
  } while (existingIds.has(id));
  return id;
};

export const useFormulaStore = defineStore('formula', () => {
  // 分别维护三个模式下的独立状态表
  const commandsMap = ref<Record<PlaygroundMode, CommandItem[]>>({
    '2d': [{ id: 'init_2d', expression: 'sin(x)', color: '#0ea5e9', visible: true }],
    '3d': [{ id: 'init_3d', expression: 'z = sin(x)*cos(y)', color: '#f43f5e', visible: true }],
    'geometry': [{ id: 'init_geom1', expression: 'A=(-2,0)', color: '#8b5cf6', visible: true }],
    'operation': []
  });
  
  const activeMode = ref<PlaygroundMode>('2d');

  // 当前激活面板的数据映射门面
  const commands = computed(() => commandsMap.value[activeMode.value]);

  const addCommand = (expression: string = '') => {
    // 从当前激活态的数组里取长度进行递进颜色分配
    const list = commandsMap.value[activeMode.value];
    const id = createCommandId(list);
    const color = commandColors[list.length % commandColors.length];
    
    list.push({
      id,
      expression,
      color,
      visible: true
    });
    return id;
  };

  const appendCommands = (items: readonly CommandInput[]) => {
    const list = commandsMap.value[activeMode.value];
    items.forEach((item) => {
      list.push({
        id: createCommandId(list),
        expression: item.expr,
        color: commandColors[list.length % commandColors.length],
        visible: true,
        options: item.options
      });
    });
  };

  const removeCommand = (id: string) => {
    const list = commandsMap.value[activeMode.value];
    const idx = list.findIndex(c => c.id === id);
    if (idx !== -1) list.splice(idx, 1);
  };

  const updateCommand = (id: string, expression: string) => {
    const cmd = commandsMap.value[activeMode.value].find(c => c.id === id);
    if (cmd) {
      cmd.expression = expression;
      cmd.error = undefined; // reset error
    }
  };

  const setCommandError = (id: string, error: string) => {
    const cmd = commandsMap.value[activeMode.value].find(c => c.id === id);
    if (cmd) cmd.error = error;
  };

  const clearCommands = () => {
    commandsMap.value[activeMode.value] = [];
  };

  const injectDemo = (mode: PlaygroundMode, demoCommands: readonly (string | { expr: string, options?: any })[]) => {
    commandsMap.value[mode] = [];
    demoCommands.forEach((cmdRaw, idx) => {
      const expr = typeof cmdRaw === 'string' ? cmdRaw : cmdRaw.expr;
      const opts = typeof cmdRaw === 'string' ? undefined : cmdRaw.options;
      commandsMap.value[mode].push({
        id: `demo_${mode}_${idx}`,
        expression: expr,
        color: commandColors[idx % commandColors.length],
        visible: true,
        options: opts
      });
    });
  };

  const replaceCommandsFromScene = (mode: PlaygroundMode, sceneCommands: GraphSceneCommandNode[]) => {
    commandsMap.value[mode] = sceneCommands.map((command, index) => ({
      id: command.id,
      expression: command.expression,
      color: command.color ?? commandColors[index % commandColors.length],
      visible: true,
      options: command.options
    }));
  };

  return {
    commands,
    activeMode,
    addCommand,
    appendCommands,
    removeCommand,
    updateCommand,
    setCommandError,
    clearCommands,
    injectDemo,
    replaceCommandsFromScene
  };
});
