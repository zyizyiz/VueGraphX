import type {
  GraphObjectNode,
  GraphRuntimeCapabilityDescriptor,
  GraphRuntimeCapabilityKind,
  GraphRuntimeTargetRef
} from './contracts';
import { readGraphDragPolicyDisabledReason } from './dragPolicy';

export type GraphMathObjectProfile =
  | 'function'
  | 'equation'
  | 'vector'
  | 'coordinate-system'
  | 'geometry'
  | 'solid'
  | 'scene'
  | 'viewport';

export interface GraphCapabilityTemplate {
  id: string;
  label: string;
  kind: GraphRuntimeCapabilityKind;
  category: GraphMathObjectProfile | 'base';
}

export const GRAPH_ACTIVE_MATH_VIEWPORT_CAPABILITY_IDS = [
  'math.viewport.select',
  'math.viewport.move',
  'math.viewport.resize',
  'math.viewport.pan',
  'math.viewport.zoom'
] as const;

export const GRAPH_ACTIVE_MATH_OBJECT_INTERACTION_CAPABILITY_IDS = [
  'math.object.select'
] as const;

export const GRAPH_ACTIVE_MATH_INTERACTION_CAPABILITY_IDS = [
  ...GRAPH_ACTIVE_MATH_VIEWPORT_CAPABILITY_IDS,
  ...GRAPH_ACTIVE_MATH_OBJECT_INTERACTION_CAPABILITY_IDS
] as const;

const baseObjectTemplates: readonly GraphCapabilityTemplate[] = [
  { id: 'math.object.select', label: '选择', kind: 'action', category: 'base' },
  { id: 'math.object.move', label: '移动', kind: 'drag', category: 'base' },
  { id: 'math.object.delete', label: '删除', kind: 'action', category: 'base' },
  { id: 'math.object.set-color', label: '设置颜色', kind: 'input', category: 'base' },
  { id: 'math.object.set-visibility', label: '显示/隐藏', kind: 'toggle', category: 'base' },
  { id: 'math.object.lock', label: '锁定', kind: 'toggle', category: 'base' }
] as const;

export const GRAPH_MATH_CAPABILITY_PROFILE: Readonly<Record<GraphMathObjectProfile, readonly GraphCapabilityTemplate[]>> = {
  scene: [
    { id: 'math.scene.add-function', label: '添加函数', kind: 'action', category: 'scene' },
    { id: 'math.scene.add-equation', label: '添加方程', kind: 'action', category: 'scene' },
    { id: 'math.scene.add-vector', label: '添加向量', kind: 'action', category: 'scene' },
    { id: 'math.scene.add-coordinate-system', label: '添加坐标系', kind: 'action', category: 'scene' },
    { id: 'math.scene.add-geometry', label: '添加几何图形', kind: 'action', category: 'scene' },
    { id: 'math.scene.add-solid', label: '添加立体图形', kind: 'action', category: 'scene' },
    { id: 'math.scene.annotation', label: '场景标注', kind: 'toggle', category: 'scene' },
    { id: 'math.scene.clear-selection', label: '清除选择', kind: 'action', category: 'scene' },
    { id: 'math.scene.clear-all', label: '清空场景', kind: 'action', category: 'scene' }
  ],
  viewport: [
    { id: 'math.viewport.select', label: '选择视口', kind: 'action', category: 'viewport' },
    { id: 'math.viewport.move', label: '移动视口', kind: 'drag', category: 'viewport' },
    { id: 'math.viewport.resize', label: '调整视口', kind: 'drag', category: 'viewport' },
    { id: 'math.viewport.pan', label: '平移', kind: 'drag', category: 'viewport' },
    { id: 'math.viewport.zoom', label: '缩放', kind: 'input', category: 'viewport' }
  ],
  function: [
    ...baseObjectTemplates,
    { id: 'math.function.set-expression', label: '设置表达式', kind: 'input', category: 'function' },
    { id: 'math.function.set-parameter', label: '设置参数', kind: 'input', category: 'function' },
    { id: 'math.function.update-piecewise-interval', label: '更新分段区间', kind: 'input', category: 'function' },
    { id: 'math.function.reset-parameters', label: '重置参数', kind: 'action', category: 'function' },
    { id: 'math.function.toggle-annotation', label: '函数标注', kind: 'toggle', category: 'function' },
    { id: 'math.function.toggle-auxiliary-line', label: '函数辅助线', kind: 'toggle', category: 'function' },
    { id: 'math.function.toggle-derivative', label: '导函数', kind: 'toggle', category: 'function' },
    { id: 'math.function.toggle-dependent-variable-mode', label: '因变量模式', kind: 'toggle', category: 'function' },
    { id: 'math.function.set-dynamic-point-start', label: '动态点起点', kind: 'input', category: 'function' },
    { id: 'math.function.set-dynamic-point-end', label: '动态点终点', kind: 'input', category: 'function' },
    { id: 'math.function.set-dynamic-point-speed', label: '动态点速度', kind: 'input', category: 'function' },
    { id: 'math.function.reset-dynamic-point', label: '重置动态点', kind: 'action', category: 'function' },
    { id: 'math.function.play-dynamic-point-backward', label: '反向播放动态点', kind: 'action', category: 'function' },
    { id: 'math.function.toggle-dynamic-point-playback', label: '播放/暂停动态点', kind: 'toggle', category: 'function' }
  ],
  equation: [
    ...baseObjectTemplates,
    { id: 'math.equation.set-expression', label: '设置方程', kind: 'input', category: 'equation' },
    { id: 'math.equation.set-parameter', label: '设置参数', kind: 'input', category: 'equation' },
    { id: 'math.equation.reset-parameters', label: '重置参数', kind: 'action', category: 'equation' },
    { id: 'math.equation.toggle-annotation', label: '方程标注', kind: 'toggle', category: 'equation' },
    { id: 'math.equation.toggle-auxiliary-line', label: '方程辅助线', kind: 'toggle', category: 'equation' },
    { id: 'math.equation.set-dynamic-point-start', label: '动态点起点', kind: 'input', category: 'equation' },
    { id: 'math.equation.set-dynamic-point-end', label: '动态点终点', kind: 'input', category: 'equation' },
    { id: 'math.equation.set-dynamic-point-speed', label: '动态点速度', kind: 'input', category: 'equation' },
    { id: 'math.equation.reset-dynamic-point', label: '重置动态点', kind: 'action', category: 'equation' },
    { id: 'math.equation.play-dynamic-point-backward', label: '反向播放动态点', kind: 'action', category: 'equation' },
    { id: 'math.equation.toggle-dynamic-point-playback', label: '播放/暂停动态点', kind: 'toggle', category: 'equation' }
  ],
  vector: [
    ...baseObjectTemplates,
    { id: 'math.vector.set-point', label: '设置端点', kind: 'input', category: 'vector' },
    { id: 'math.vector.toggle-annotation', label: '向量标注', kind: 'toggle', category: 'vector' },
    { id: 'math.vector.create-operation-result', label: '生成运算结果', kind: 'action', category: 'vector' },
    { id: 'math.vector.compute-dot-product', label: '点乘', kind: 'action', category: 'vector' }
  ],
  'coordinate-system': [
    ...baseObjectTemplates,
    { id: 'math.coordinate-system.toggle-annotation', label: '坐标系标注', kind: 'toggle', category: 'coordinate-system' },
    { id: 'math.coordinate-system.toggle-assist', label: '坐标辅助', kind: 'toggle', category: 'coordinate-system' }
  ],
  geometry: [
    ...baseObjectTemplates,
    { id: 'math.geometry.toggle-angle-adjust', label: '角度调整', kind: 'toggle', category: 'geometry' },
    { id: 'math.geometry.toggle-size', label: '尺寸调整', kind: 'toggle', category: 'geometry' },
    { id: 'math.geometry.toggle-rotate', label: '旋转', kind: 'toggle', category: 'geometry' },
    { id: 'math.geometry.apply-rotation', label: '应用旋转', kind: 'action', category: 'geometry' },
    { id: 'math.geometry.toggle-pivot-rotation', label: '绕点旋转', kind: 'toggle', category: 'geometry' },
    { id: 'math.geometry.toggle-annotation', label: '几何标注', kind: 'toggle', category: 'geometry' },
    { id: 'math.geometry.start-assist', label: '开始辅助线', kind: 'action', category: 'geometry' },
    { id: 'math.geometry.cancel-assist', label: '取消辅助线', kind: 'action', category: 'geometry' },
    { id: 'math.geometry.start-cut', label: '开始切割', kind: 'action', category: 'geometry' },
    { id: 'math.geometry.cancel-cut', label: '取消切割', kind: 'action', category: 'geometry' },
    { id: 'math.geometry.confirm-cut', label: '确认切割', kind: 'action', category: 'geometry' },
    { id: 'math.geometry.remove-selected-helper', label: '移除辅助对象', kind: 'action', category: 'geometry' },
    { id: 'math.geometry.toggle-color-panel', label: '颜色面板', kind: 'toggle', category: 'geometry' },
    { id: 'math.geometry.activate-stroke-color', label: '描边颜色', kind: 'action', category: 'geometry' },
    { id: 'math.geometry.activate-fill-color', label: '填充颜色', kind: 'action', category: 'geometry' },
    { id: 'math.geometry.apply-color', label: '应用颜色', kind: 'input', category: 'geometry' },
    { id: 'math.geometry.toggle-projection', label: '投影', kind: 'toggle', category: 'geometry' }
  ],
  solid: [
    ...baseObjectTemplates,
    { id: 'math.solid.set-parameter', label: '设置立体参数', kind: 'input', category: 'solid' },
    { id: 'math.solid.toggle-section', label: '截面', kind: 'toggle', category: 'solid' },
    { id: 'math.solid.set-section-plane', label: '截面方向', kind: 'input', category: 'solid' },
    { id: 'math.solid.set-section-offset', label: '截面位置', kind: 'input', category: 'solid' },
    { id: 'math.solid.activate-stroke-color', label: '线框颜色', kind: 'action', category: 'solid' },
    { id: 'math.solid.activate-fill-color', label: '表面颜色', kind: 'action', category: 'solid' },
    { id: 'math.solid.apply-color', label: '应用颜色', kind: 'input', category: 'solid' },
    { id: 'math.solid.toggle-rotate', label: '旋转观察', kind: 'toggle', category: 'solid' },
    { id: 'math.solid.animation.toggle', label: '展开动画', kind: 'toggle', category: 'solid' }
  ]
};

export const inferGraphMathObjectProfile = (node: GraphObjectNode): GraphMathObjectProfile | null => {
  if (node.kind === 'viewport') return 'viewport';
  if (node.kind === 'command' && node.type === 'scene') return 'scene';
  if (node.type === 'function' || node.type === 'equation' || node.type === 'vector' || node.type === 'coordinate-system' || node.type === 'solid') {
    return node.type;
  }
  if (
    node.type === 'point'
    || node.type === 'line'
    || node.type === 'ray'
    || node.type === 'segment'
    || node.type === 'circle'
    || node.type === 'polygon'
    || node.type === 'polyline'
    || node.type === 'arc'
    || node.type === 'sector'
    || node.type === 'semicircle'
    || node.type === 'text'
    || node.type === 'midpoint'
    || node.type === 'intersection'
    || node.type === 'angle'
    || node.type === 'parallel-line'
    || node.type === 'perpendicular-line'
    || node.type === 'tangent'
    || node.type === 'translated'
    || node.type === 'rotated'
    || node.type === 'parallel-lines'
    || node.type === 'geometry'
  ) {
    return 'geometry';
  }
  return null;
};

export const createGraphCapabilitiesForProfile = (
  profile: GraphMathObjectProfile,
  target: GraphRuntimeTargetRef,
  disabled: Partial<Record<string, string>> = {}
): GraphRuntimeCapabilityDescriptor[] => GRAPH_MATH_CAPABILITY_PROFILE[profile].map((template) => ({
  id: template.id,
  label: template.label,
  kind: template.kind,
  category: template.category,
  target: { ...target },
  status: disabled[template.id] ? 'disabled' : 'supported',
  reason: disabled[template.id]
}));

export const createGraphCapabilitiesForObject = (
  node: GraphObjectNode,
  disabled: Partial<Record<string, string>> = {}
): GraphRuntimeCapabilityDescriptor[] => {
  const profile = inferGraphMathObjectProfile(node);
  if (!profile) return [];
  return createGraphCapabilitiesForProfile(profile, { scope: 'object', objectId: node.id }, {
    ...disabled,
    ...dragDisabledCapabilities(node, disabled)
  });
};

const dragDisabledCapabilities = (
  node: GraphObjectNode,
  disabled: Partial<Record<string, string>>
): Partial<Record<string, string>> => {
  if (disabled['math.object.move']) return {};
  const reason = readGraphDragPolicyDisabledReason(node);
  return reason ? { 'math.object.move': reason } : {};
};
