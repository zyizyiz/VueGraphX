import { curriculumParityRows, type CurriculumBackendId } from '@vuegraphx/core';
import type { PlaygroundMode } from './types/mode';

export type PlaygroundRenderBackend = CurriculumBackendId | 'babylon';

export interface PlaygroundBackendCapability {
  id: PlaygroundRenderBackend;
  label: string;
  summary: string;
  supported: readonly string[];
  unsupported: readonly string[];
  notes: readonly string[];
  interactions: readonly PlaygroundInteractionStatus[];
}

export interface PlaygroundInteractionStatus {
  id: string;
  label: string;
  status: 'supported' | 'partial-support' | 'unsupported';
  detail: string;
}

export interface ParityDemoCommand {
  id: string;
  expression: string;
  color: string;
  options?: Record<string, unknown>;
}

export interface CurriculumParityDemo {
  demoId: string;
  rowIds: readonly string[];
  title: string;
  desc: string;
  emoji: string;
  commands: readonly ParityDemoCommand[];
}

export const parityRendererBackends: { id: PlaygroundRenderBackend; label: string }[] = [
  { id: 'jsxgraph', label: 'JSXGraph' },
  { id: 'canvas2d', label: 'Canvas2D Core' },
  { id: 'babylon', label: 'Babylon Core' }
];

export const getPreferredBackendForMode = (mode: PlaygroundMode): PlaygroundRenderBackend => (
  mode === '3d' ? 'babylon' : 'canvas2d'
);

export const isBackendSelectableForMode = (mode: PlaygroundMode, backend: PlaygroundRenderBackend): boolean => (
  backend === getPreferredBackendForMode(mode)
);

export const getParityCapabilitySummaries = (): Record<PlaygroundRenderBackend, PlaygroundBackendCapability> => {
  const families = [...new Set(curriculumParityRows.flatMap((row) => row.capabilityFamilies))].sort();
  const objectTypes = [...new Set(curriculumParityRows.flatMap((row) => row.visualObjectTypes))].sort();
  const coverage = `${curriculumParityRows.length} 个初高中课程标准映射点`;
  return {
    jsxgraph: {
      id: 'jsxgraph',
      label: 'JSXGraph',
      summary: `兼容验证后端：与 Canvas2D 合同适配器使用同一份语义场景和 ${coverage}。`,
      supported: [`对象族：${objectTypes.join(' / ')}`, `能力族：${families.join(' / ')}`],
      unsupported: [],
      notes: ['关系面板、隐藏线调试仍属于 JSXGraph 专项面板；课程 parity demo 不依赖这些专项面板。'],
      interactions: [
        { id: 'viewport.zoom', label: '缩放', status: 'supported', detail: 'JSXGraph board zoom + VueGraphX modifier-wheel bridge' },
        { id: 'viewport.gestureZoom', label: '手势缩放', status: 'supported', detail: 'pinch 选项和 ctrl/meta wheel 兼容路径' },
        { id: 'viewport.pan', label: '平移', status: 'supported', detail: 'JSXGraph pan + 双指/像素 wheel bridge' },
        { id: 'object.pick', label: '拾取', status: 'supported', detail: 'runtime pick 路由' },
        { id: 'object.select', label: '选中状态', status: 'supported', detail: 'core meta.selected 可观测状态' },
        { id: 'object.highlight', label: '选中高亮', status: 'supported', detail: 'selected meta -> stroke width ×2，不改变原色' },
        { id: 'project', label: '投影', status: 'supported', detail: 'JSXGraph Coords project' },
        { id: 'unproject', label: '反投影', status: 'supported', detail: 'JSXGraph Coords unproject' },
        { id: 'diagnostics', label: '诊断', status: 'supported', detail: 'GraphOperationDiagnostic / pick diagnostics' }
      ]
    },
    canvas2d: {
      id: 'canvas2d',
      label: 'Canvas2D Core',
      summary: `2D 主渲染后端：Equation/Parabola/Solid 均降维为 Canvas 可绘制语义对象，覆盖 ${coverage}。`,
      supported: [`对象族：${objectTypes.join(' / ')}`, `能力族：${families.join(' / ')}`],
      unsupported: [],
      notes: ['Canvas2D 对立体使用教学等价投影/线框表达，不回退到 JSXGraph。'],
      interactions: [
        { id: 'viewport.zoom', label: '缩放', status: 'supported', detail: 'playground/core viewport bounds + project/unproject' },
        { id: 'viewport.gestureZoom', label: '手势缩放', status: 'supported', detail: 'pointer pinch 与 ctrl/meta wheel bridge' },
        { id: 'viewport.pan', label: '平移', status: 'supported', detail: 'pointer drag 和 trackpad wheel pan' },
        { id: 'object.pick', label: '拾取', status: 'supported', detail: 'Canvas2D hit testing' },
        { id: 'object.select', label: '选中状态', status: 'supported', detail: 'core meta.selected 可观测状态' },
        { id: 'object.highlight', label: '选中高亮', status: 'supported', detail: 'selected meta -> stroke width ×2，不改变原色' },
        { id: 'project', label: '投影', status: 'supported', detail: 'worldBounds project' },
        { id: 'unproject', label: '反投影', status: 'supported', detail: 'worldBounds unproject' },
        { id: 'diagnostics', label: '诊断', status: 'supported', detail: 'GraphOperationDiagnostic / pick diagnostics' }
      ]
    },
    babylon: {
      id: 'babylon',
      label: 'Babylon Core',
      summary: `3D 主渲染后端：空间对象由 Babylon canvas 渲染，平面标注通过独立 Canvas2D overlay 承载，覆盖 ${coverage}。`,
      supported: [`对象族：${objectTypes.join(' / ')}`, `能力族：${families.join(' / ')}`],
      unsupported: [],
      notes: ['Babylon 不再作为 2D 主画布；2D/标注层由独立 Canvas2D runtime 叠加。'],
      interactions: [
        { id: 'viewport.zoom', label: '缩放', status: 'supported', detail: '3D camera controls；overlay 跟随 host bounds' },
        { id: 'viewport.gestureZoom', label: '手势缩放', status: 'partial-support', detail: '3D 原生 camera；Canvas2D overlay 通过 VueGraphX gesture bridge' },
        { id: 'viewport.pan', label: '平移', status: 'supported', detail: '3D camera controls；overlay 跟随 host bounds' },
        { id: 'object.pick', label: '拾取', status: 'supported', detail: 'scene.pick metadata 映射' },
        { id: 'object.select', label: '选中状态', status: 'supported', detail: 'core meta.selected 可观测状态' },
        { id: 'object.highlight', label: '选中高亮', status: 'supported', detail: 'selected meta -> proxy thickness ×2，不改变原色' },
        { id: 'project', label: '投影', status: 'supported', detail: 'Babylon 3D runtime project；overlay worldBounds project' },
        { id: 'unproject', label: '反投影', status: 'supported', detail: 'Babylon 3D pick fallback；overlay worldBounds unproject' },
        { id: 'diagnostics', label: '诊断', status: 'supported', detail: 'GraphOperationDiagnostic / backend partial support rows' }
      ]
    }
  };
};

export const getParityDemoCommands = (): CurriculumParityDemo[] => (
  curriculumParityRows.map((row, index) => ({
    demoId: row.demoIds[0],
    rowIds: [row.id],
    title: row.title,
    desc: `课程标准映射：${row.selectedStandardClauses[0]}`,
    emoji: parityEmojiForArea(row.area),
    commands: commandsForParityRow(row.id, index)
  }))
);

const commandsForParityRow = (rowId: string, index: number): readonly ParityDemoCommand[] => {
  const color = PARITY_COLORS[index % PARITY_COLORS.length];
  const id = (suffix: string) => `${rowId}:${suffix}`;
  const cmd = (suffix: string, expression: string, options?: Record<string, unknown>): ParityDemoCommand => ({
    id: id(suffix),
    expression,
    color,
    ...(options ? { options } : {})
  });
  const text = (suffix: string, label: string, x = -6, y = 4, options?: Record<string, unknown>): ParityDemoCommand => (
    cmd(`text-${suffix}`, `Text(${x}, ${y}, "${label}")`, options)
  );

  switch (rowId) {
    case 'number.real-expression':
      return [
        cmd('O', 'O = Point(-4, 0)'),
        cmd('A', 'A = Point(0.56, 0)'),
        cmd('B', 'B = Point(3.14, 0)'),
        cmd('axis', 'axis = Segment(O, B)'),
        cmd('unit', 'u = Segment(O, A)'),
        text('value', '$\\sqrt{2}+\\pi\\approx 4.556\\quad \\text{实数轴/近似值}$', -6.4, 3.2, { strokeColor: '#0f172a' })
      ];
    case 'algebra.linear-quadratic-equations':
      return [
        cmd('f', 'f = Function("x^2 - 4", -4, 4)'),
        cmd('axis', 'axis = Function("0", -4.5, 4.5)'),
        cmd('R1', 'R1 = Point(-2, 0)'),
        cmd('R2', 'R2 = Point(2, 0)'),
        text('roots', 'x²-4=0 的两个实根：-2, 2', -5.8, 4)
      ];
    case 'algebra.symbolic-derivative':
      return [
        cmd('f', 'f = Function("x^2 - 2*x", -4, 4)'),
        cmd('df', 'df = Derivative(f)'),
        cmd('P', 'P = Point(1, -1)'),
        cmd('tan', 'tan = Tangent(P, f)'),
        text('derivative', "f'(x)=2x-2；切线体现变化率", -6, 4)
      ];
    case 'inequality.linear':
      return [
        cmd('f', 'f = Function("2*x - 3", -3, 5)'),
        cmd('axis', 'axis = Function("0", -3, 5)'),
        cmd('root', 'R = Point(1.5, 0)'),
        cmd('mark', 'M = Point(4, 0)'),
        cmd('solution', 'sol = Segment(R, M)', { strokeWidth: 5 }),
        text('solution', '2x-3 ≥ 0：解集 x ≥ 1.5', -6, 4)
      ];
    case 'inequality.quadratic':
      return [
        cmd('f', 'f = Function("x^2 - 1", -3, 3)'),
        cmd('axis', 'axis = Function("0", -3, 3)'),
        cmd('L', 'L = Point(-1, 0)'),
        cmd('R', 'R = Point(1, 0)'),
        cmd('leftRay', 'left = Segment(Point(-3, 0), L)', { strokeWidth: 5 }),
        cmd('rightRay', 'right = Segment(R, Point(3, 0))', { strokeWidth: 5 }),
        text('solution', 'x²-1 ≥ 0：(-∞,-1]∪[1,∞)', -6, 4)
      ];
    case 'function.evaluation-roots-intersections':
      return [
        cmd('f', 'f = Function("x^2 - 4", -4, 4)'),
        cmd('g', 'g = Function("x", -4, 4)'),
        cmd('rootA', 'A = Point(-2, 0)'),
        cmd('rootB', 'B = Point(2, 0)'),
        cmd('eval', 'P = Point(3, 5)'),
        text('features', '零点、函数值 f(3)=5 与交点读图', -6, 4)
      ];
    case 'geometry.basic-2d':
      return [
        cmd('A', 'A = Point(-3, -1)'),
        cmd('B', 'B = Point(2, -1)'),
        cmd('C', 'C = Point(0, 2)'),
        cmd('line', 'l = Line(A, B)'),
        cmd('ray', 'r = Ray(A, C)'),
        cmd('segment', 's = Segment(B, C)'),
        cmd('circle', 'o = Circle(A, B)'),
        cmd('polygon', 'tri = Polygon(A, B, C)')
      ];
    case 'geometry.triangle-centers':
      return [
        cmd('A', 'A = Point(-3, -2)'),
        cmd('B', 'B = Point(3, -2)'),
        cmd('C', 'C = Point(0, 2)'),
        cmd('poly', 'tri = Polygon(A, B, C)'),
        cmd('circ', 'circ = Circumcircle(A, B, C)'),
        cmd('inc', 'inc = Incircle(A, B, C)'),
        cmd('cc', 'cc = Circumcenter(A, B, C)'),
        cmd('ic', 'ic = Incenter(A, B, C)')
      ];
    case 'geometry.area-centroid-transform':
      return [
        cmd('A', 'A = Point(-2, -1)'),
        cmd('B', 'B = Point(2, -1)'),
        cmd('C', 'C = Point(0, 2)'),
        cmd('poly', 'poly = Polygon(A, B, C)'),
        cmd('area', 'area = Area(poly)'),
        cmd('rot', 'rot = Rotate(poly, 0.45, A)'),
        text('area', '面积度量 + 绕 A 旋转变换', -6, 4)
      ];
    case 'analytic.lines-circles-conics':
      return [
        cmd('A', 'A = Point(-3, -1)'),
        cmd('B', 'B = Point(3, 1)'),
        cmd('line', 'l = Line(A, B)'),
        cmd('circleEq', 'eq = Equation("x^2 + y^2 = 9")'),
        cmd('ellipse', 'ell = Ellipse(Point(0, 0), 4, 1.4, 0.3)'),
        cmd('distance', 'd = Distance(A, B)'),
        text('analytic', '直线、圆方程、椭圆与距离', -6, 4)
      ];
    case 'analytic.tangent-normal':
      return [
        cmd('O', 'O = Point(0, 0)'),
        cmd('P', 'P = Point(3, 0)'),
        cmd('Q', 'Q = Point(0, 3)'),
        cmd('circle', 'c = Circle(O, P)'),
        cmd('radius', 'r = Segment(O, P)'),
        cmd('tangent', 't = Line(P, Q)'),
        cmd('distance', 'd = Distance(O, P)'),
        text('tangent', '半径 OP 与过 P 的切线/法线模型', -6, 4)
      ];
    case 'trigonometry.angle-triangle':
      return [
        cmd('A', 'A = Point(-2, -1)'),
        cmd('B', 'B = Point(2, -1)'),
        cmd('C', 'C = Point(0, 2)'),
        cmd('tri', 'tri = Polygon(A, B, C)'),
        cmd('angle', 'ang = Angle(A, C, B)'),
        cmd('area', 'area = Area(tri)'),
        text('trig', '角度/弧度、正弦余弦定理与三角形面积', -6, 4)
      ];
    case 'solid.metrics':
      return [
        cmd('cube', 'cube = Solid("cube", size=2, x=-2, y=0, z=0)'),
        cmd('sphere', 'sphere = Solid("sphere", radius=1.2, x=2, y=0, z=0)'),
        text('metrics', '立方体/球：体积与表面积语义', -6, 4)
      ];
    case 'solid.ir-surface':
      return [
        cmd('surface', 'surface = Surface(u, v, 0.18*(u^2-v^2), -4, 4, -4, 4)'),
        cmd('cube', 'cube = Solid("cube", size=1.3, x=-5, y=-3, z=0)'),
        text('surface', '曲面线框 + 多面体语义，不再用二维截线冒充', -6, 4)
      ];
    case 'vector.2d-3d':
      return [
        cmd('O', 'O = Point(0, 0)'),
        cmd('A', 'A = Point(3, 2)'),
        cmd('B', 'B = Point(-1, 3)'),
        cmd('v', 'v = Vector(O, A)'),
        cmd('w', 'w = Vector(O, B)'),
        cmd('len', 'len = Length(O, A)'),
        text('vector', '向量加减、长度、点积/叉积的几何表示', -6, 4)
      ];
    case 'complex.basic':
      return [
        cmd('O', 'O = Point(0, 0)'),
        cmd('Z', 'Z = Point(3, 2)'),
        cmd('C', 'C = Point(3, -2)'),
        cmd('zvec', 'z = Vector(O, Z)'),
        cmd('conj', 'conj = Vector(O, C)'),
        cmd('modulus', 'r = Circle(O, Z)'),
        text('complex', '复平面：z=3+2i，模长与共轭', -6, 4)
      ];
    case 'linear-algebra.2x2-3x3':
      return [
        cmd('O', 'O = Point(0, 0)'),
        cmd('E1', 'E1 = Point(2, 0)'),
        cmd('E2', 'E2 = Point(0, 2)'),
        cmd('T1', 'T1 = Point(3, 1)'),
        cmd('T2', 'T2 = Point(1, 3)'),
        cmd('e1', 'e1 = Vector(O, E1)'),
        cmd('e2', 'e2 = Vector(O, E2)'),
        cmd('t1', 't1 = Vector(O, T1)'),
        cmd('t2', 't2 = Vector(O, T2)'),
        cmd('cell', 'cell = Polygon(O, T1, Point(4, 4), T2)'),
        text('matrix', '矩阵把基向量映到新平行四边形；det 表示面积倍率', -6, 4)
      ];
    case 'sequence.arithmetic-geometric':
      return [
        cmd('A1', 'A1 = Point(1, 1)'),
        cmd('A2', 'A2 = Point(2, 1.5)'),
        cmd('A3', 'A3 = Point(3, 2)'),
        cmd('A4', 'A4 = Point(4, 2.5)'),
        cmd('A5', 'A5 = Point(5, 3)'),
        cmd('seq', 'seq = Polyline(A1, A2, A3, A4, A5)'),
        text('seq', '等差数列 aₙ=1+0.5(n-1)，S₅=10', -6, 4)
      ];
    case 'statistics.descriptive':
      return [
        cmd('D1', 'D1 = Point(-4, 1)'),
        cmd('D2', 'D2 = Point(-2, 2)'),
        cmd('D3', 'D3 = Point(0, 2)'),
        cmd('D4', 'D4 = Point(2, 4)'),
        cmd('D5', 'D5 = Point(4, 5)'),
        cmd('trend', 'trend = Polyline(D1, D2, D3, D4, D5)'),
        cmd('mean', 'mean = Segment(Point(-4, 2.8), Point(4, 2.8))', { lineDash: [4, 8], strokeWidth: 1 }),
        text('stats', '数据 1,2,2,4,5：均值2.8，中位数2，极差4', -6, 4)
      ];
    case 'probability.combinatorics-binomial':
      return [
        cmd('P0', 'P0 = Point(-3, 0.3)'),
        cmd('P1', 'P1 = Point(-1.5, 1.5)'),
        cmd('P2', 'P2 = Point(0, 2.25)'),
        cmd('P3', 'P3 = Point(1.5, 1.5)'),
        cmd('P4', 'P4 = Point(3, 0.3)'),
        cmd('dist', 'dist = Polyline(P0, P1, P2, P3, P4)'),
        cmd('axis', 'axis = Segment(Point(-3.5, 0), Point(3.5, 0))'),
        text('prob', 'Binomial(n=4,p=0.5)：对称概率分布', -6, 4)
      ];
    case 'logic.sets-relations':
      return [
        cmd('OA', 'OA = Point(-1.2, 0)'),
        cmd('OB', 'OB = Point(1.2, 0)'),
        cmd('RA', 'RA = Point(0.4, 0)'),
        cmd('RB', 'RB = Point(2.8, 0)'),
        cmd('Aset', 'Aset = Circle(OA, RA)'),
        cmd('Bset', 'Bset = Circle(OB, RB)'),
        text('A', 'A', -2.4, 1.6),
        text('B', 'B', 2.1, 1.6),
        text('logic', '集合交并补与命题关系：A∩B / A∪B', -6, 4)
      ];
    default:
      return [
        text('fallback', rowId),
        cmd('A', 'A = Point(0, 0)'),
        cmd('B', 'B = Point(3, 0)'),
        cmd('metric', 'm = Distance(A, B)')
      ];
  }
};

const parityEmojiForArea = (area: string): string => {
  if (area.includes('geometry')) return '📐';
  if (area.includes('probability') || area.includes('statistics')) return '📊';
  if (area.includes('solid')) return '🧊';
  if (area.includes('function') || area.includes('calculus')) return '📈';
  if (area.includes('vectors') || area.includes('complex')) return '🧭';
  return '🧮';
};

const PARITY_COLORS = ['#0ea5e9', '#8b5cf6', '#10b981', '#f43f5e', '#f59e0b', '#14b8a6'];
