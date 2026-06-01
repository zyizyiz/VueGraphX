import { createSubjectBackendSupportMatrix } from '@vuegraphx/core';
import {
  computeSubjectFunctionProperties,
  createCircleEquationSubjectFunction,
  createLinearSubjectFunction,
  createPiecewiseSubjectFunction,
  createQuadraticSubjectFunction,
  createSubjectDynamicPoint,
  createSubjectFunctionAnnotations,
  tickSubjectDynamicPoint,
  updateSubjectFunctionParameters
} from '@vuegraphx/math';
import type { PlaygroundRenderBackend } from './parityStatus';

export type SubjectToolsDemoCategory =
  | 'canvas-coordinate-system'
  | 'parameter'
  | 'manage-function'
  | 'domain-piecewise'
  | 'equation'
  | 'annotation'
  | 'dynamic-point'
  | 'backend-status';

export interface SubjectToolsDemoCommand {
  expr: string;
  options?: Record<string, unknown>;
}

export interface SubjectToolsPlaygroundDemo {
  category: SubjectToolsDemoCategory;
  emoji: string;
  title: string;
  desc: string;
  commands: readonly (string | SubjectToolsDemoCommand)[];
  compatibleBackends?: readonly PlaygroundRenderBackend[];
  modelSummary: string;
}

const parameterBase = createQuadraticSubjectFunction({ id: 'parameter-quadratic', a: 0.5, b: 1, c: 2, domain: [-5, 5] });
const parameterUpdated = updateSubjectFunctionParameters(parameterBase, { a: -0.35, b: 0, c: 1.5 });
const piecewise = createPiecewiseSubjectFunction([
  { id: 'left', expression: '-x - 1', domain: [-5, 0] },
  { id: 'right', expression: '0.5*x^2 - 1', domain: [0, 5] }
], { id: 'piecewise-demo' });
const circle = createCircleEquationSubjectFunction({ id: 'circle-demo', centerX: 1, centerY: -1, radius: 3 });
const annotated = createQuadraticSubjectFunction({ id: 'annotation-demo', a: 1, b: -2, c: -3, domain: [-4, 5] });
const dynamicFunction = createLinearSubjectFunction({ id: 'dynamic-demo', a: 0.5, b: 1, domain: [0, 8] });
const dynamicPoint = tickSubjectDynamicPoint(dynamicFunction, createSubjectDynamicPoint(dynamicFunction, { parameter: 1, speed: 2, playing: true }), 1);

export const getSubjectToolsBackendStatusRows = () => createSubjectBackendSupportMatrix();

export const subjectToolsRepresentativeDemos: readonly SubjectToolsPlaygroundDemo[] = [
  {
    category: 'canvas-coordinate-system',
    emoji: '🎯',
    title: '学科画布 · 独立坐标系',
    desc: '默认背景只有网格；拖入函数/方程时创建可见独立坐标系，所有后端走同一 coordinate-system IR。',
    compatibleBackends: ['jsxgraph', 'canvas2d', 'babylon'],
    modelSummary: 'CoordinateSystem("plane") 生成 360×360、30px/unit、x/y=[-6,6] 的 renderer-neutral 节点。',
    commands: [
      'cs = CoordinateSystem("plane")',
      'f = Function("0.5*x^2 - 2", -5, 5)',
      'Text(-5, 4, "grid only globally · visible independent axes")'
    ]
  },
  {
    category: 'parameter',
    emoji: '🎚️',
    title: '参数调节 · 二次函数',
    desc: '参数模型在 math 包中复用，playground 用两条曲线代表调节前后体验。',
    compatibleBackends: ['jsxgraph', 'canvas2d', 'babylon'],
    modelSummary: `a 从 ${parameterBase.parameters.a} 调整到 ${parameterUpdated.parameters.a}，参数控件保持序列化。`,
    commands: [
      'before = Function("0.5*x^2 + x + 2", -5, 5)',
      { expr: 'after = Function("-0.35*x^2 + 1.5", -5, 5)', options: { strokeColor: '#FF8D1A' } },
      'Text(-5, 4, "parameter a / b / c update")'
    ]
  },
  {
    category: 'manage-function',
    emoji: '🧩',
    title: '函数管理 · 添加/排序/删除',
    desc: '同一坐标系下颜色按固定序列分配，删除/重排不让既有函数随机变色。',
    compatibleBackends: ['jsxgraph', 'canvas2d', 'babylon'],
    modelSummary: '颜色序列：#4DA6FF → #FF8D1A → #16D957 → #FF4D4D → #BB32FF，按创建序循环。',
    commands: [
      { expr: 'f1 = Function("x + 1", -5, 5)', options: { strokeColor: '#4DA6FF' } },
      { expr: 'f2 = Function("-x + 2", -5, 5)', options: { strokeColor: '#FF8D1A' } },
      { expr: 'f3 = Function("0.25*x^2 - 1", -5, 5)', options: { strokeColor: '#16D957' } },
      'Text(-5, 4, "add / reorder / delete keep stable colors")'
    ]
  },
  {
    category: 'domain-piecewise',
    emoji: '✂️',
    title: '定义域 · 分段函数',
    desc: '多区间定义域、开闭端点与分段采样由 math 包统一处理。',
    compatibleBackends: ['jsxgraph', 'canvas2d', 'babylon'],
    modelSummary: `piecewise: ${piecewise.expression}`,
    commands: [
      { expr: 'left = Function("-x - 1", -5, 0)', options: { strokeColor: '#4DA6FF' } },
      { expr: 'right = Function("0.5*x^2 - 1", 0, 5)', options: { strokeColor: '#FF8D1A' } },
      'Text(-5, 4, "domain intervals split curve segments")'
    ]
  },
  {
    category: 'equation',
    emoji: '⭕',
    title: '方程族 · 圆的方程',
    desc: '函数与方程共享描述符/属性/采样，圆方程通过 active backend proxy 渲染。',
    compatibleBackends: ['jsxgraph', 'canvas2d', 'babylon'],
    modelSummary: computeSubjectFunctionProperties(circle).map((property) => `${property.label}=${JSON.stringify(property.value)}`).join('；'),
    commands: [
      'circle = Equation("(x - 1)^2 + (y + 1)^2 = 9")',
      'C = Point(1, -1)',
      'Text(-5, 4, "circle equation · center/radius annotations")'
    ]
  },
  {
    category: 'annotation',
    emoji: '🏷️',
    title: '标注 · 顶点/对称轴/截距',
    desc: '标注不是 UI 特例，而是由函数属性生成的可序列化 annotation descriptors。',
    compatibleBackends: ['jsxgraph', 'canvas2d', 'babylon'],
    modelSummary: createSubjectFunctionAnnotations(annotated).map((annotation) => annotation.label).join(' / '),
    commands: [
      'q = Function("x^2 - 2*x - 3", -4, 5)',
      'V = Point(1, -4)',
      'axis = Line(Point(1, -5), Point(1, 5))',
      'Text(1.2, -4, "vertex (1,-4)")'
    ]
  },
  {
    category: 'dynamic-point',
    emoji: '▶️',
    title: '动点 P · 沿函数播放',
    desc: '动点状态含 range/speed/direction，可 tick/reset/reverse 并随参数重算。',
    compatibleBackends: ['jsxgraph', 'canvas2d', 'babylon'],
    modelSummary: `P(${dynamicPoint.point?.x.toFixed(1)}, ${dynamicPoint.point?.y.toFixed(1)}) after 1s tick`,
    commands: [
      'path = Function("0.5*x + 1", 0, 8)',
      'P = Point(3, 2.5)',
      'Text(3.2, 2.6, "P tick: speed=2, t=3")'
    ]
  },
  {
    category: 'backend-status',
    emoji: '🧪',
    title: '后端状态 · 显式降级',
    desc: 'jsxgraph/canvas2d/babylon 是真实验证目标；pixi/konva/three/fabric 保持明确 deferred。',
    compatibleBackends: ['jsxgraph', 'canvas2d', 'babylon'],
    modelSummary: getSubjectToolsBackendStatusRows().map((row) => `${row.backendId}:${row.active ? 'active' : 'deferred'}`).join(' · '),
    commands: [
      'Text(-5, 4, "active: JSXGraph / Canvas2D / Babylon")',
      'Text(-5, 3.3, "deferred placeholders: Pixi / Konva / Three / Fabric")'
    ]
  }
];
