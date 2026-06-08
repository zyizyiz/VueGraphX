import { createSubjectBackendSupportMatrix } from '@vuegraphx/core';
import {
  computeSubjectFunctionProperties,
  createCircleEquationSubjectFunction,
  createFreeSubjectAuxiliaryLine,
  createLinearSubjectFunction,
  createPiecewiseSubjectFunction,
  createQuadraticSubjectFunction,
  createSubjectAuxiliaryLineConstructionModel,
  createSubjectAuxiliaryLineIntersectionAnnotations,
  createSubjectDynamicPoint,
  createSubjectGeometryTransformModel,
  createSubjectOverlayModel,
  createSubjectShapeEditModel,
  point2D,
  SUBJECT_OVERLAY_DASH_PATTERN,
  SUBJECT_OVERLAY_DASH_STROKE_WIDTH,
  SUBJECT_OVERLAY_DEFAULT_DASH_STROKE_COLOR,
  tickSubjectDynamicPoint,
  updateSubjectFunctionParameters,
  type MathPoint2D,
  type SubjectAuxiliaryLineConstructionContact,
  type SubjectAuxiliaryLineDescriptor,
  type SubjectGeometryTransformPreviewArc,
  type SubjectGeometryTransformTarget,
  type SubjectOverlayAnnotation,
  type SubjectOverlayConfig,
  type SubjectOverlayModel,
  type SubjectOverlayStyle,
  type SubjectOverlayTarget,
  type SubjectShapeEditHandleDescriptor,
  type SubjectShapeEditTarget
} from '@vuegraphx/math';
import type { PlaygroundRenderBackend } from './parityStatus';

export type SubjectToolsDemoCategory =
  | 'canvas-coordinate-system'
  | 'parameter'
  | 'manage-function'
  | 'domain-piecewise'
  | 'equation'
  | 'annotation'
  | 'geometry-overlay'
  | 'geometry-transform'
  | 'geometry-editing'
  | 'geometry-construction'
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
const annotationOverlay = createSubjectOverlayModel({
  id: 'annotation-overlay',
  kind: 'function',
  descriptor: annotated,
  sampleWindow: { minX: -4, maxX: 5, minY: -5, maxY: 5 },
  strokeColor: '#2563EB'
}, {
  annotations: {
    includeKinds: ['expression', 'vertex', 'axis', 'intercept']
  },
  auxiliaryLines: {
    includeKinds: ['symmetry-axis'],
    defaultVisibleKinds: ['symmetry-axis']
  }
});
const geometryOverlayTarget: SubjectOverlayTarget = {
  id: 'geometry-overlay-triangle',
  kind: 'polygon',
  shapeKind: 'triangle',
  vertices: [point2D(-4, -2), point2D(2, -2), point2D(-1, 3)],
  coordinateSystemId: 'plane',
  strokeColor: '#2563EB',
  meta: { subject: 'triangle-construction' }
};
const geometryOverlayConfig: SubjectOverlayConfig = {
  annotations: {
    includeKinds: ['vertex', 'angle', 'side-ratio', 'helper-intersection'],
    labels: { 'side-ratio': '三边比例' },
    styles: {
      vertex: { strokeColor: '#0F172A' },
      angle: { strokeColor: '#7C3AED' },
      'side-ratio': { strokeColor: '#0F766E' },
      'helper-intersection': { strokeColor: '#B45309' }
    }
  },
  auxiliaryLines: {
    includeKinds: ['altitude', 'median', 'angle-bisector', 'free'],
    defaultVisibleKinds: ['altitude', 'median', 'free'],
    allowFreeDraw: true,
    retentionRule: 'boundary-contact',
    preserveDraftSpan: true,
    maxCandidates: 9,
    labels: {
      altitude: '高',
      median: '中线',
      'angle-bisector': '角平分线'
    }
  },
  shapes: {
    triangle: {
      auxiliaryLines: {
        includeKinds: ['altitude', 'median', 'angle-bisector', 'free'],
        allowFreeDraw: true,
        retentionRule: 'boundary-contact',
        preserveDraftSpan: true,
        maxCandidates: 9
      }
    }
  },
  coordinates: {
    showForKinds: ['vertex', 'helper-intersection'],
    precision: 1
  }
};
const geometryOverlay = createSubjectOverlayModel(geometryOverlayTarget, geometryOverlayConfig);
const geometryFreeLine = createFreeSubjectAuxiliaryLine(
  geometryOverlayTarget,
  point2D(-4, 0),
  point2D(2.5, 0),
  { config: geometryOverlayConfig, label: '用户自定义线' }
);
const geometryFreeIntersections = createSubjectAuxiliaryLineIntersectionAnnotations(
  geometryOverlayTarget,
  geometryFreeLine ? [geometryFreeLine] : [],
  geometryOverlayConfig
);
const geometryTransformTarget: SubjectGeometryTransformTarget = {
  id: 'geometry-transform-triangle',
  kind: 'polygon',
  shapeKind: 'triangle',
  vertices: [point2D(-3, -1.5), point2D(1, -1.5), point2D(-1.5, 1.5)],
  strokeColor: '#2563EB',
  meta: { subject: 'triangle-transform' }
};
const geometryTransform = createSubjectGeometryTransformModel(geometryTransformTarget, {
  kind: 'rotate',
  center: point2D(-1, -0.25),
  angleRadians: Math.PI / 5,
  bounds: { minX: -5, minY: -4, maxX: 5, maxY: 4 },
  boundsMode: 'translate-inside',
  snapToGrid: { enabled: true, step: 0.5, tolerance: 0.12 },
  preview: {
    includeCenterLines: true,
    includeTrajectories: true
  }
});
const geometryTransformVertices = geometryTransform.after.kind === 'polygon' ? geometryTransform.after.vertices : [];
const geometryEditTarget: SubjectShapeEditTarget = {
  id: 'geometry-edit-triangle',
  kind: 'polygon',
  shapeKind: 'triangle',
  vertices: [point2D(-3.5, -2), point2D(2, -2), point2D(-1.5, 2.5)],
  strokeColor: '#0F766E',
  meta: { subject: 'triangle-edit' }
};
const geometryEdit = createSubjectShapeEditModel(geometryEditTarget, {
  handleKind: 'vertex',
  index: 2,
  point: point2D(-0.46, 3.04)
}, {
  bounds: { minX: -5, minY: -4, maxX: 5, maxY: 4 },
  boundsMode: 'translate-inside',
  snapToGrid: { enabled: true, step: 0.5, tolerance: 0.12 }
});
const geometryEditVertices = geometryEdit.after.kind === 'polygon' ? geometryEdit.after.vertices : [];
const geometryConstruction = createSubjectAuxiliaryLineConstructionModel(
  geometryOverlayTarget,
  { start: point2D(-4.4, 0.75), end: point2D(3.2, 0.75) },
  {
    label: '构造候选线',
    state: 'confirmed'
  }
);

export const getSubjectToolsBackendStatusRows = () => createSubjectBackendSupportMatrix();

const TWO_D_SUBJECT_BACKENDS = ['canvas2d'] as const satisfies readonly PlaygroundRenderBackend[];

export const subjectToolsRepresentativeDemos: readonly SubjectToolsPlaygroundDemo[] = [
  {
    category: 'canvas-coordinate-system',
    emoji: '🎯',
    title: '学科画布 · 独立坐标系',
    desc: '默认背景只有网格；拖入函数/方程时创建可见独立坐标系，所有后端走同一 coordinate-system IR。',
    compatibleBackends: TWO_D_SUBJECT_BACKENDS,
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
    compatibleBackends: TWO_D_SUBJECT_BACKENDS,
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
    compatibleBackends: TWO_D_SUBJECT_BACKENDS,
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
    compatibleBackends: TWO_D_SUBJECT_BACKENDS,
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
    compatibleBackends: TWO_D_SUBJECT_BACKENDS,
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
    title: '函数标注 · 顶点/对称轴/截距',
    desc: '标注与辅助轴线由 overlay 模型生成，playground 只把 descriptors 映射成通用命令。',
    compatibleBackends: TWO_D_SUBJECT_BACKENDS,
    modelSummary: `annotations=${annotationOverlay.annotations.map((annotation) => annotation.label).join(' / ')}；auxiliary=${annotationOverlay.auxiliaryLines.map((line) => line.label).join(' / ')}`,
    commands: [
      'q = Function("x^2 - 2*x - 3", -4, 5)',
      ...overlayLineCommands(annotationOverlay, { prefix: 'q_aux' }),
      ...overlayAnnotationCommands(annotationOverlay, { prefix: 'q_note', kinds: ['vertex', 'intercept'], limit: 4 }),
      'Text(-4, 4.4, "overlay annotations: vertex / axis / intercept")'
    ]
  },
  {
    category: 'geometry-overlay',
    emoji: '📐',
    title: '几何标注/辅助线 · 三角形配置',
    desc: '同一套 overlay provider 生成顶点、角度、边长比、高、中线和自由辅助线；图形、标签、样式、候选数量都由配置控制。',
    compatibleBackends: TWO_D_SUBJECT_BACKENDS,
    modelSummary: `annotations=${geometryOverlay.annotations.map((annotation) => annotation.label).join(' / ')}；visible auxiliary=${geometryOverlay.auxiliaryLines.filter((line) => line.visible !== false).map((line) => line.label).join(' / ')}；free=${geometryFreeLine?.label ?? 'disabled'}`,
    commands: [
      'A = (-4, -2)',
      'B = (2, -2)',
      'C = (-1, 3)',
      { expr: 'tri = Polygon(A, B, C)', options: { strokeColor: '#2563EB', fillColor: '#DBEAFE', fillOpacity: 0.18, strokeWidth: 2 } },
      ...overlayLineCommands(geometryOverlay, { prefix: 'tri_aux', kinds: ['altitude', 'median'], limit: 6 }),
      ...(geometryFreeLine ? overlayLineCommands([geometryFreeLine], { prefix: 'tri_free' }) : []),
      ...overlayAnnotationCommands([...geometryOverlay.annotations, ...geometryFreeIntersections], {
        prefix: 'tri_note',
        kinds: ['vertex', 'angle', 'side-ratio', 'helper-intersection'],
        limit: 10
      })
    ]
  },
  {
    category: 'geometry-transform',
    emoji: '↻',
    title: '几何变换 · 旋转/吸附/边界',
    desc: '旋转中心、等比变换、网格轻吸附、坐标系范围约束和预览轨迹由 math 包输出；业务侧只负责把 descriptor 画出来。',
    compatibleBackends: TWO_D_SUBJECT_BACKENDS,
    modelSummary: `applied=${geometryTransform.applied}；previewLines=${geometryTransform.previewLines.length}；previewArcs=${geometryTransform.previewArcs.length}；diagnostics=${geometryTransform.diagnostics.map((diagnostic) => diagnostic.code).join(' / ') || 'none'}`,
    commands: [
      ...pointDefinitionCommands('G', geometryTransformTarget.vertices),
      { expr: 'baseTransform = Polygon(G1, G2, G3)', options: { strokeColor: '#94A3B8', fillColor: '#E2E8F0', fillOpacity: 0.2, lineDash: [4, 8] } },
      ...pointDefinitionCommands('R', geometryTransformVertices),
      { expr: 'rotatedTransform = Polygon(R1, R2, R3)', options: { strokeColor: '#2563EB', fillColor: '#DBEAFE', fillOpacity: 0.22, strokeWidth: 2 } },
      ...(geometryTransform.center ? [{ expr: `P = ${formatPointTuple(geometryTransform.center)}`, options: { strokeColor: '#7C3AED' } }] : []),
      ...overlayLineCommands(geometryTransform.previewLines, { prefix: 'transform_preview', visibleOnly: false, labels: false, limit: 6 }),
      ...transformArcCommands(geometryTransform.previewArcs, { prefix: 'transform_arc', limit: 4 }),
      'Text(-4.8, 3.6, "math transform model: center / snap / bounds / trajectories")'
    ]
  },
  {
    category: 'geometry-editing',
    emoji: '▱',
    title: '几何编辑 · 顶点 handle 拖拽',
    desc: '拖拽点、半径点、端点和方向点由 math 包给出；业务侧只把 handle 和编辑后的 geometry 写回状态。',
    compatibleBackends: TWO_D_SUBJECT_BACKENDS,
    modelSummary: `applied=${geometryEdit.applied}；handles=${geometryEdit.afterHandles.length}；diagnostics=${geometryEdit.diagnostics.map((diagnostic) => diagnostic.code).join(' / ') || 'none'}`,
    commands: [
      ...pointDefinitionCommands('S', geometryEditTarget.vertices),
      { expr: 'editBefore = Polygon(S1, S2, S3)', options: { strokeColor: '#94A3B8', fillColor: '#E2E8F0', fillOpacity: 0.18, lineDash: [4, 8] } },
      ...pointDefinitionCommands('E', geometryEditVertices),
      { expr: 'editAfter = Polygon(E1, E2, E3)', options: { strokeColor: '#0F766E', fillColor: '#CCFBF1', fillOpacity: 0.2, strokeWidth: 2 } },
      ...shapeEditHandleCommands(geometryEdit.beforeHandles, { prefix: 'edit_before_handle', color: '#64748B', limit: 3 }),
      ...shapeEditHandleCommands(geometryEdit.afterHandles, { prefix: 'edit_after_handle', color: '#0F766E', limit: 3 }),
      ...overlayLineCommands(geometryEdit.previewLines, { prefix: 'edit_path', visibleOnly: false, labels: false, limit: 2 })
    ]
  },
  {
    category: 'geometry-construction',
    emoji: '⌁',
    title: '几何构造 · 自由辅助线候选',
    desc: '自由画线的裁剪、单点接触、重合边和失败原因由 construction model 输出；业务侧决定预览、提交或失败动画。',
    compatibleBackends: TWO_D_SUBJECT_BACKENDS,
    modelSummary: `applied=${geometryConstruction.applied}；contacts=${geometryConstruction.contacts.length}；diagnostics=${geometryConstruction.diagnostics.map((diagnostic) => diagnostic.code).join(' / ') || 'none'}`,
    commands: [
      'A = (-4, -2)',
      'B = (2, -2)',
      'C = (-1, 3)',
      { expr: 'constructTri = Polygon(A, B, C)', options: { strokeColor: '#2563EB', fillColor: '#DBEAFE', fillOpacity: 0.14, strokeWidth: 2 } },
      {
        expr: `draft = Segment(${formatPointTuple(geometryConstruction.draft.start)}, ${formatPointTuple(geometryConstruction.draft.end)})`,
        options: {
          strokeColor: SUBJECT_OVERLAY_DEFAULT_DASH_STROKE_COLOR,
          lineDash: SUBJECT_OVERLAY_DASH_PATTERN,
          strokeWidth: SUBJECT_OVERLAY_DASH_STROKE_WIDTH,
          selectionStrokeScale: false
        }
      },
      ...(geometryConstruction.candidate ? overlayLineCommands([geometryConstruction.candidate], { prefix: 'construct_candidate', labels: false }) : []),
      ...constructionContactCommands(geometryConstruction.contacts, { prefix: 'construct_contact', limit: 4 })
    ]
  },
  {
    category: 'dynamic-point',
    emoji: '▶️',
    title: '动点 P · 沿函数播放',
    desc: '动点状态含 range/speed/direction，可 tick/reset/reverse 并随参数重算。',
    compatibleBackends: TWO_D_SUBJECT_BACKENDS,
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
    desc: 'Canvas2D 是 2D 学科画布主后端；Babylon 保留给 3D solid，其他包保持明确 deferred。',
    compatibleBackends: TWO_D_SUBJECT_BACKENDS,
    modelSummary: getSubjectToolsBackendStatusRows().map((row) => `${row.backendId}:${row.active ? 'active' : 'deferred'}`).join(' · '),
    commands: [
      'Text(-5, 4, "2D active: Canvas2D · 3D active: Babylon")',
      'Text(-5, 3.3, "compat/deferred: JSXGraph / Pixi / Konva / Three / Fabric")'
    ]
  }
];

function pointDefinitionCommands(prefix: string, points: readonly MathPoint2D[]): string[] {
  return points.map((point, index) => `${prefix}${index + 1} = ${formatPointTuple(point)}`);
}

function shapeEditHandleCommands(
  handles: readonly SubjectShapeEditHandleDescriptor[],
  options: { prefix: string; color: string; limit?: number }
): SubjectToolsDemoCommand[] {
  return handles.slice(0, options.limit ?? Infinity).flatMap((handle, index) => [
    {
      expr: `${options.prefix}_${index + 1} = Point(${formatPoint(handle.point)})`,
      options: { strokeColor: options.color }
    },
    {
      expr: `${options.prefix}_${index + 1}_label = Text(${formatPoint({ x: handle.point.x + 0.12, y: handle.point.y + 0.12 })}, "${escapeCommandText(handle.label)}")`,
      options: { strokeColor: options.color }
    }
  ]);
}

function constructionContactCommands(
  contacts: readonly SubjectAuxiliaryLineConstructionContact[],
  options: { prefix: string; limit?: number }
): SubjectToolsDemoCommand[] {
  return contacts
    .filter((contact) => !!contact.point)
    .slice(0, options.limit ?? Infinity)
    .flatMap((contact, index) => {
      const point = contact.point!;
      return [
        {
          expr: `${options.prefix}_${index + 1} = Point(${formatPoint(point)})`,
          options: { strokeColor: '#B45309' }
        },
        {
          expr: `${options.prefix}_${index + 1}_label = Text(${formatPoint({ x: point.x + 0.12, y: point.y + 0.12 })}, "${escapeCommandText(contact.kind)}")`,
          options: { strokeColor: '#B45309' }
        }
      ];
    });
}

function overlayLineCommands(
  input: SubjectOverlayModel | readonly SubjectAuxiliaryLineDescriptor[],
  options: {
    prefix: string;
    kinds?: readonly string[];
    limit?: number;
    visibleOnly?: boolean;
    labels?: boolean;
  }
): SubjectToolsDemoCommand[] {
  const visibleOnly = options.visibleOnly ?? true;
  const sourceLines: readonly SubjectAuxiliaryLineDescriptor[] = isOverlayModel(input) ? input.auxiliaryLines : input;
  const lines = sourceLines
    .filter((line) => (!visibleOnly || line.visible !== false) && (!options.kinds || options.kinds.includes(line.kind)))
    .slice(0, options.limit ?? Infinity);

  return lines.flatMap((line, index) => {
    const id = `${options.prefix}_${index + 1}`;
    const commands: SubjectToolsDemoCommand[] = [{
      expr: `${id} = Segment(${formatPointTuple(line.start)}, ${formatPointTuple(line.end)})`,
      options: overlayStyleOptions(line.style, '#64748B')
    }];
    if (options.labels !== false) {
      commands.push({
        expr: `${id}_label = Text(${formatPoint(lineMidpoint(line))}, "${escapeCommandText(line.label)}")`,
        options: overlayTextStyleOptions(line.style, '#64748B')
      });
    }
    return commands;
  });
}

function transformArcCommands(
  arcs: readonly SubjectGeometryTransformPreviewArc[],
  options: { prefix: string; limit?: number }
): SubjectToolsDemoCommand[] {
  return arcs.slice(0, options.limit ?? Infinity).map((arc, index) => ({
    expr: `${options.prefix}_${index + 1} = Arc(${formatPointTuple(arc.center)}, ${formatPointTuple(arc.start)}, ${formatPointTuple(arc.end)})`,
    options: overlayStyleOptions(arc.style, '#7C3AED')
  }));
}

function overlayAnnotationCommands(
  input: SubjectOverlayModel | readonly SubjectOverlayAnnotation[],
  options: {
    prefix: string;
    kinds?: readonly string[];
    limit?: number;
    visibleOnly?: boolean;
  }
): SubjectToolsDemoCommand[] {
  const visibleOnly = options.visibleOnly ?? true;
  const annotations: readonly SubjectOverlayAnnotation[] = isOverlayModel(input) ? input.annotations : input;
  return annotations
    .filter((annotation) => !!annotation.anchor && (!visibleOnly || annotation.visible !== false) && (!options.kinds || options.kinds.includes(annotation.kind)))
    .slice(0, options.limit ?? Infinity)
    .map((annotation, index) => ({
      expr: `${options.prefix}_${index + 1} = Text(${formatPoint(annotation.anchor!)}, "${escapeCommandText(annotation.text)}")`,
      options: overlayTextStyleOptions(annotation.style, '#0F172A')
    }));
}

function isOverlayModel(
  value: SubjectOverlayModel | readonly SubjectAuxiliaryLineDescriptor[] | readonly SubjectOverlayAnnotation[]
): value is SubjectOverlayModel {
  return !Array.isArray(value);
}

function lineMidpoint(line: SubjectAuxiliaryLineDescriptor): MathPoint2D {
  return {
    x: (line.start.x + line.end.x) / 2,
    y: (line.start.y + line.end.y) / 2
  };
}

function overlayStyleOptions(style: SubjectOverlayStyle | undefined, fallbackColor: string): Record<string, unknown> {
  const options: Record<string, unknown> = {
    strokeColor: style?.strokeColor ?? style?.textColor ?? fallbackColor
  };
  if (typeof style?.strokeWidth === 'number') options.strokeWidth = style.strokeWidth;
  if (style?.selectionStrokeScale !== undefined) options.selectionStrokeScale = style.selectionStrokeScale;
  if (style?.fillColor) options.fillColor = style.fillColor;
  if (style?.lineDash?.length) options.lineDash = [...style.lineDash];
  return options;
}

function overlayTextStyleOptions(style: SubjectOverlayStyle | undefined, fallbackColor: string): Record<string, unknown> {
  const options = overlayStyleOptions(style, fallbackColor);
  options.strokeColor = style?.textColor ?? style?.strokeColor ?? fallbackColor;
  return options;
}

function formatPointTuple(point: MathPoint2D): string {
  return `(${formatNumber(point.x)}, ${formatNumber(point.y)})`;
}

function formatPoint(point: MathPoint2D): string {
  return `${formatNumber(point.x)}, ${formatNumber(point.y)}`;
}

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '0';
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
}

function escapeCommandText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}
