import type { PlaygroundMode } from './types/mode';
import {
  getParityCapabilitySummaries,
  getParityDemoCommands,
  parityRendererBackends as rendererBackends,
  type PlaygroundBackendCapability,
  type PlaygroundRenderBackend
} from './parityStatus';
import { subjectToolsRepresentativeDemos } from './subjectToolsShowcase';

export type { PlaygroundBackendCapability, PlaygroundRenderBackend };

export interface DemoItem {
  emoji: string;
  title: string;
  desc: string;
  commands: readonly (string | { expr: string; options?: Record<string, unknown> })[];
  compatibleBackends?: readonly PlaygroundRenderBackend[];
}

export { rendererBackends };

export const playgroundBackendCapabilities: Record<PlaygroundRenderBackend, PlaygroundBackendCapability> = getParityCapabilitySummaries();

const curriculumParityDemos: DemoItem[] = getParityDemoCommands().map((demo) => ({
  emoji: demo.emoji,
  title: `课标 · ${demo.title}`,
  desc: demo.desc,
  commands: demo.commands.map((command) => (
    command.options
      ? { expr: command.expression, options: command.options }
      : command.expression
  ))
}));

const TWO_D_PLAYGROUND_BACKENDS = ['canvas2d'] as const satisfies readonly PlaygroundRenderBackend[];
const THREE_D_PLAYGROUND_BACKENDS = ['babylon'] as const satisfies readonly PlaygroundRenderBackend[];

export const allDemos: Record<PlaygroundMode, DemoItem[]> = {
  '2d': [
    ...subjectToolsRepresentativeDemos,
    ...curriculumParityDemos,
    {
      emoji: '🖱️',
      title: '交互合同验证',
      desc: '滚轮/触控板缩放平移，点击对象后在 Canvas2D 主后端显示 selected 高亮与诊断',
      compatibleBackends: TWO_D_PLAYGROUND_BACKENDS,
      commands: [
        'A = Point(-3, 1)',
        'B = Point(2, 1)',
        'C = Point(-0.5, 3.2)',
        'base = Segment(A, B)',
        'tri = Polygon(A, B, C)',
        'O = Point(0, 0)',
        'P = Point(2, 0)',
        'circle = Circle(O, P)',
        'label = Text(-4, -3, "wheel/pinch zoom · drag background pan · click select")'
      ]
    },
    {
      emoji: '🧪',
      title: 'Canvas2D 全功能巡检',
      desc: '点线圆弧、多边形、圆锥曲线、文本、测量和变换，由 Canvas2D 承载 2D 主画布',
      compatibleBackends: TWO_D_PLAYGROUND_BACKENDS,
      commands: [
        'A = Point(-8, 4)',
        'B = Point(-5, 4)',
        'C = Point(-6.5, 6.2)',
        'base = Segment(A, B)',
        'ray = Ray(A, C)',
        'line = Line(B, C)',
        'tri = Polygon(A, B, C)',
        'O = Point(0, 0)',
        'P = Point(2, 0)',
        'Q = Point(0, 2)',
        'circ = Circle(O, P)',
        'ell = Ellipse(O, 4, 1.4, 0.3)',
        'hyp = Hyperbola(O, 2.8, 1.2, 0.15)',
        'arc = Arc(O, P, Q)',
        'R = Point(-2, 0)',
        'sector = Sector(O, Q, R)',
        'label = Text(O, "core Canvas")',
        'd = Distance(A, B)',
        'area = Area(tri)',
        'shifted = Translate(tri, 0, -3)'
      ]
    },
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
      emoji: '📈',
      title: 'Function / Derivative / Tangent',
      desc: '命令 DSL 函数、导数与切线进入 Canvas 采样显示',
      commands: [
        'f = Function("sin(x) + 0.12*x^2", -7, 7)',
        'df = Derivative(f)',
        'T = Point(1.5, 0)',
        'tan = Tangent(T, f)',
        'Text(2.2, 3.2, "f / f\' / tangent")'
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
    }
  ],
  '3d': [
    {
      emoji: '🧊',
      title: 'Babylon 全 solid family',
      desc: '展示 core Solid(...) 当前全部可渲染族，由 Babylon 承载 3D 主画布',
      compatibleBackends: THREE_D_PLAYGROUND_BACKENDS,
      commands: [
        'cube = Solid("cube", size=1.4, x=-6, y=0, z=0)',
        'box = Solid("rectangular-prism", width=1.8, depth=1, height=1.2, x=-3.8)',
        'sphere = Solid("sphere", radius=0.9, x=-1.6)',
        'cylinder = Solid("cylinder", radius=0.65, height=1.8, x=0.4)',
        'cone = Solid("cone", radius=0.75, height=1.9, x=2.3)',
        'frustum = Solid("conical-frustum", topRadius=0.35, bottomRadius=0.8, height=1.8, x=4.3)',
        'triPrism = Solid("triangular-prism", baseArea=0.9, basePerimeter=4.4, height=1.7, x=-4.8, z=2.2)',
        'hexPrism = Solid("hexagonal-prism", baseArea=1.6, basePerimeter=5.2, height=1.6, x=-2.2, z=2.2)',
        'triPyramid = Solid("triangular-pyramid", baseArea=1, basePerimeter=4.4, height=1.8, x=0.6, z=2.2)',
        'quadFrustum = Solid("quadrangular-frustum", topArea=0.5, bottomArea=1.7, topPerimeter=2.8, bottomPerimeter=5.2, height=1.7, x=3.4, z=2.2)'
      ]
    },
    {
      emoji: '🧊',
      title: 'Babylon 基础立体',
      desc: '同一份 Solid 指令进入 Babylon 3D 层，2D 标注走独立 Canvas2D overlay',
      compatibleBackends: THREE_D_PLAYGROUND_BACKENDS,
      commands: [
        'cube = Solid("cube", size=2, x=-2)',
        'sphere = Solid("sphere", radius=1.2, x=1.6)',
        'cylinder = Solid("cylinder", radius=0.8, height=2.5, x=4)'
      ]
    },
    {
      emoji: '🌊',
      title: '波浪曲面',
      desc: '二元函数 z = sin(x)cos(y) 的真实曲面线框',
      commands: ['z = sin(x)*cos(y)', 'Text(-4, 4, "z = sin(x)cos(y)")']
    },
    {
      emoji: '🏔️',
      title: '高斯曲面',
      desc: '二维高斯正态分布钟形曲面',
      commands: ['z = exp(-(x^2 + y^2)/4)', 'Text(-4, 4, "Gaussian surface")']
    },
    {
      emoji: '🌀',
      title: '马鞍面',
      desc: '经典双曲抛物面 z = x²-y²',
      commands: ['z = 0.18*(x^2 - y^2)', 'Text(-4, 4, "saddle surface")']
    },
    {
      emoji: '🏖️',
      title: '涟漪曲面',
      desc: '以原点为中心的衰减波',
      commands: ['z = sin(sqrt(x^2 + y^2))/(sqrt(x^2 + y^2)+0.01)', 'Text(-4, 4, "radial ripple surface")']
    },
    {
      emoji: '🍩',
      title: '环面 (甜甜圈)',
      desc: '参数曲面 Surface(...) 真实表达环面线框',
      commands: [
        'torus = Surface((3+cos(v))*cos(u), (3+cos(v))*sin(u), sin(v), 0, 2*pi, 0, 2*pi)',
        'Text(-3, 4, "parametric torus")'
      ]
    }
  ],
  geometry: [
    ...curriculumParityDemos,
    {
      emoji: '🧭',
      title: '关系面板练习',
      desc: '四个点与两条线段，适合体验平行 / 垂直 / 等长 / 距离断言',
      commands: ['A = (-4, 2)', 'B = (-1, 2)', 'C = (1, -1)', 'D = (4, -1)', 'Segment(A, B)', 'Segment(C, D)']
    },
    {
      emoji: '🧮',
      title: 'Core 关系/测量/变换',
      desc: '中点、交点、平行垂直、角度、长度、面积、斜率与旋转平移',
      commands: [
        'A = Point(-4, -2)',
        'B = Point(0, 2)',
        'C = Point(4, -2)',
        'D = Point(-3, 3)',
        'E = Point(3, 3)',
        'l = Line(A, B)',
        'm = Line(C, D)',
        'I = Intersect(l, m)',
        'M = Midpoint(A, C)',
        'perp = PerpendicularLine(l, C)',
        'para = ParallelLine(l, E)',
        'poly = Polygon(A, B, C)',
        'ang = Angle(A, B, C)',
        'len = Length(A, B)',
        'area = Area(poly)',
        'slope = Slope(l)',
        'rot = Rotate(poly, 0.45, M)',
        'Text(M, "mid / metrics")'
      ]
    },
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
      emoji: '🧩',
      title: 'Core 几何指令',
      desc: '同一组点驱动多边形、内外接圆与中心点，可在 JSXGraph / Canvas2D 间切换',
      commands: [
        'A = (-2, -1)',
        'B = (2, -1)',
        'C = (0, 2)',
        'regular = RegularPolygon(A, B, 5)',
        'para = Parallelogram(A, B, C)',
        'circ = Circumcircle(A, B, C)',
        'inc = Incircle(A, B, C)',
        'cc = Circumcenter(A, B, C)',
        'ic = Incenter(A, B, C)',
        'label = Text(ic, "incenter")'
      ]
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
    }
  ],
  'operation': []
};
