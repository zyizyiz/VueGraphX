import type { GraphObjectNode } from './contracts';

export type CurriculumBackendId = 'jsxgraph' | 'canvas2d' | 'babylon';
export type CurriculumEducationStage = 'junior-high' | 'senior-high' | 'common';
export type CurriculumKnowledgeArea =
  | 'number-and-algebra'
  | 'functions'
  | 'inequalities'
  | 'plane-geometry'
  | 'analytic-geometry'
  | 'trigonometry'
  | 'solid-geometry'
  | 'vectors'
  | 'complex-numbers'
  | 'linear-algebra'
  | 'sequences'
  | 'probability-statistics'
  | 'calculus-basics'
  | 'logic-and-sets';

export interface CurriculumStandardRef {
  document: '义务教育数学课程标准2022' | '普通高中数学课程标准2017-2020';
  section: string;
  clause: string;
  label: string;
  url: string;
}

export interface CurriculumParityRow {
  id: string;
  stage: CurriculumEducationStage;
  area: CurriculumKnowledgeArea;
  title: string;
  sourceRefs: readonly CurriculumStandardRef[];
  selectedStandardClauses: readonly string[];
  kernelExports: readonly string[];
  visualObjectTypes: readonly string[];
  capabilityFamilies: readonly string[];
  demoIds: readonly string[];
  requiredBackends: readonly CurriculumBackendId[];
  exclusionReason?: string;
}

export interface NormalizedParityPoint {
  x: number;
  y: number;
  z?: number;
}

export interface NormalizedParityObject {
  objectId: string;
  objectType: string;
  family: string;
  dependencyIds: readonly string[];
  backendIds: readonly CurriculumBackendId[];
  curriculumRowIds: readonly string[];
  points?: readonly NormalizedParityPoint[];
  sampleCount?: number;
  expression?: string;
  conicKind?: string;
  measurementKind?: string;
  solidFamily?: string;
  value?: number;
}

export interface NormalizedParitySnapshot {
  demoId: string;
  backendId?: CurriculumBackendId;
  objects: readonly NormalizedParityObject[];
}

export interface ParityComparisonTolerance {
  epsilon?: number;
  visualEpsilon?: number;
}

export interface ParityComparisonDiagnostic {
  code: string;
  message: string;
  objectId?: string;
}

export interface ParityComparisonResult {
  ok: boolean;
  diagnostics: readonly ParityComparisonDiagnostic[];
}

export interface NormalizeParityContext {
  demoId?: string;
  backendId?: CurriculumBackendId;
  backendIds?: readonly CurriculumBackendId[];
  curriculumRowIds?: readonly string[];
}

export const CURRICULUM_PARITY_BACKENDS = ['jsxgraph', 'canvas2d', 'babylon'] as const;
export const DEFAULT_PARITY_EPSILON = 1e-6;
export const DEFAULT_PARITY_VISUAL_EPSILON = 1e-3;

const YIWU_2022_URL = 'https://www.moe.gov.cn/srcsite/A26/s8001/202204/W020220420582343217634.pdf';
const GAOZHONG_2017_2020_URL = 'https://www.moe.gov.cn/srcsite/A26/s8001/202006/W020200605325074919686.pdf';

const juniorRef = (section: string, clause: string, label: string): CurriculumStandardRef => ({
  document: '义务教育数学课程标准2022',
  section,
  clause,
  label,
  url: YIWU_2022_URL
});

const seniorRef = (section: string, clause: string, label: string): CurriculumStandardRef => ({
  document: '普通高中数学课程标准2017-2020',
  section,
  clause,
  label,
  url: GAOZHONG_2017_2020_URL
});

const refsForStage = (stage: CurriculumEducationStage, area: CurriculumKnowledgeArea): readonly CurriculumStandardRef[] => {
  if (stage === 'junior-high') return [juniorRef('第三学段/第四学段', area, '数与代数、图形与几何、统计与概率综合要求')];
  if (stage === 'senior-high') return [seniorRef('必修课程', area, '预备知识、函数、几何与代数、概率与统计')];
  return [
    juniorRef('跨学段核心素养', area, '抽象能力、运算能力、几何直观、数据观念'),
    seniorRef('课程结构与核心素养', area, '数学抽象、逻辑推理、数学运算、直观想象、数据分析')
  ];
};

const row = (
  id: string,
  stage: CurriculumEducationStage,
  area: CurriculumKnowledgeArea,
  title: string,
  kernelExports: readonly string[],
  visualObjectTypes: readonly string[],
  capabilityFamilies: readonly string[],
  clause: string
): CurriculumParityRow => ({
  id,
  stage,
  area,
  title,
  sourceRefs: refsForStage(stage, area),
  selectedStandardClauses: [clause],
  kernelExports,
  visualObjectTypes,
  capabilityFamilies,
  demoIds: [`curriculum.${id}`],
  requiredBackends: CURRICULUM_PARITY_BACKENDS
});

export const curriculumParityRows: readonly CurriculumParityRow[] = [
  row('number.real-expression', 'common', 'number-and-algebra', '实数、代数式、根式与常量表达式求值', ['evaluateExpression', 'simplifyExpression'], ['text', 'measurement'], ['evaluate', 'simplify'], '实数、代数式与运算对象必须可计算并可视化为表达式/测量结果。'),
  row('algebra.linear-quadratic-equations', 'junior-high', 'number-and-algebra', '一次/二次方程实根', ['solvePolynomialRoots'], ['function', 'measurement'], ['solve', 'intersect'], '会结合函数图象理解一元一次/二次方程的解。'),
  row('algebra.symbolic-derivative', 'senior-high', 'calculus-basics', '基础导数、割线/切线、函数变化率与定积分近似', ['derivativeExpressionResult', 'numericDerivative', 'secantSlope', 'tangentLineAtFunction', 'definiteIntegral'], ['function', 'line', 'measurement'], ['differentiate', 'integrate', 'measure'], '理解导数及其几何意义，能用导数研究函数变化。'),
  row('inequality.linear', 'junior-high', 'inequalities', '一次不等式解集', ['solveLinearInequality'], ['function', 'measurement'], ['solve', 'highlight-interval'], '会解一元一次不等式并在数轴/图象上表示解集。'),
  row('inequality.quadratic', 'senior-high', 'inequalities', '二次不等式解集', ['solveQuadraticInequality'], ['function', 'measurement'], ['solve', 'highlight-interval'], '能借助二次函数图象求解一元二次不等式。'),
  row('function.evaluation-roots-intersections', 'junior-high', 'functions', '函数求值、零点、交点与定义域诊断', ['createFunctionDescriptor', 'evaluateFunction', 'findFunctionRoots', 'intersectFunctions'], ['function', 'point'], ['evaluate', 'intersect', 'sample'], '理解函数概念，会用图象表示函数并分析零点/交点。'),
  row('geometry.basic-2d', 'junior-high', 'plane-geometry', '点、线、射线、线段、圆、多边形基础构造', ['point2D', 'lineFromPoints', 'rayFromPoints', 'segmentFromPoints', 'circleFromCenterPoint', 'polygonFromVertices'], ['point', 'line', 'ray', 'segment', 'conic', 'polygon'], ['create', 'drag', 'measure'], '掌握基本平面图形及其性质和作图。'),
  row('geometry.triangle-centers', 'junior-high', 'plane-geometry', '三角形外心、内心、内切圆、外接圆', ['circumcenter2D', 'incenter2D', 'circleFromThreePointsResult', 'incircleFromTriangle'], ['point', 'conic', 'polygon'], ['construct', 'measure'], '探索三角形重要线段、圆与中心的性质。'),
  row('geometry.area-centroid-transform', 'junior-high', 'plane-geometry', '面积、质心、平移、旋转、缩放', ['polygonArea', 'polygonCentroid', 'translatePoint2D', 'rotatePoint2D', 'scalePoint2DAbout'], ['polygon', 'measurement'], ['measure', 'transform'], '会度量面积并理解图形平移、旋转、相似变换。'),
  row('analytic.lines-circles-conics', 'senior-high', 'analytic-geometry', '直线、圆、圆锥曲线分类与交点', ['lineFromPointsResult', 'conicFromCoefficients', 'classifyConic2D', 'intersectLineConic2DResult'], ['line', 'conic', 'point'], ['intersect', 'classify', 'project'], '掌握平面解析几何中直线、圆与圆锥曲线的方程和位置关系。'),
  row('analytic.tangent-normal', 'senior-high', 'analytic-geometry', '圆的切线、法线、点到直线距离、投影', ['distancePointLine2D', 'projectPointToLine2D', 'tangentLineToCircleAtPoint2D', 'normalLineToCircleAtPoint2D'], ['line', 'conic', 'measurement'], ['measure', 'construct'], '能用代数方法研究直线与圆的位置关系和距离。'),
  row('trigonometry.angle-triangle', 'senior-high', 'trigonometry', '角度制/弧度制、三角函数、正弦/余弦定理、三角形面积', ['degreesToRadians', 'radiansToDegrees', 'sinDegrees', 'cosDegrees', 'tanDegrees', 'lawOfSinesSide', 'lawOfCosinesSide', 'triangleAreaHeron'], ['polygon', 'measurement'], ['measure', 'solve-triangle'], '理解三角函数和解三角形的基本模型。'),
  row('solid.metrics', 'junior-high', 'solid-geometry', '常见柱锥球台体体积与表面积', ['createSolidDescriptor', 'calculateSolidMetrics', 'getSolidDefaultParameters'], ['solid', 'measurement'], ['measure', 'resize'], '认识常见几何体并计算表面积、体积。'),
  row('solid.ir-surface', 'senior-high', 'solid-geometry', '立体几何对象语义、曲面/多面体参数模型', ['createSolidDescriptor'], ['solid'], ['render', 'pick', 'measure'], '理解空间几何体、表面与空间想象表达。'),
  row('vector.2d-3d', 'senior-high', 'vectors', '二维/三维向量、点积、叉积、长度、单位化、向量夹角', ['vector2D', 'vector3D', 'dot2D', 'cross2D', 'dot3D', 'cross3D', 'length2D', 'length3D', 'normalize2D', 'normalize3D', 'angleBetweenVectors3D'], ['vector', 'measurement'], ['measure', 'transform'], '掌握平面向量及空间向量的线性运算、数量积和几何意义。'),
  row('complex.basic', 'senior-high', 'complex-numbers', '复数代数形式、极形式、模、辐角与四则运算', ['complex', 'complexFromPolar', 'addComplex', 'subtractComplex', 'multiplyComplex', 'divideComplex', 'conjugateComplex', 'modulusComplex', 'argumentComplex'], ['point', 'vector', 'measurement'], ['evaluate', 'transform'], '理解复数及其几何表示。'),
  row('linear-algebra.2x2-3x3', 'common', 'linear-algebra', '二阶/三阶行列式、二元一次方程组与二维线性变换', ['determinant2x2', 'determinant3x3', 'solveLinearSystem2x2', 'multiplyMatrix2x2Vector'], ['vector', 'measurement'], ['solve', 'transform'], '用矩阵/线性变换表达代数关系。'),
  row('sequence.arithmetic-geometric', 'senior-high', 'sequences', '等差/等比数列通项、前 n 项和、生成项', ['createArithmeticSequence', 'arithmeticSequenceTerm', 'arithmeticSequenceSum', 'createGeometricSequence', 'geometricSequenceTerm', 'geometricSequenceSum', 'generateSequenceTerms'], ['function', 'measurement'], ['evaluate', 'table'], '理解等差数列、等比数列及其通项和前 n 项和。'),
  row('statistics.descriptive', 'junior-high', 'probability-statistics', '平均数、中位数、众数、方差、标准差、四分位数', ['mean', 'weightedMean', 'median', 'modeValues', 'variance', 'standardDeviation', 'quartiles'], ['measurement', 'text'], ['summarize'], '会收集、整理、描述数据并使用统计量分析。'),
  row('probability.combinatorics-binomial', 'senior-high', 'probability-statistics', '排列组合、二项分布、条件概率、并事件概率', ['factorial', 'permutationCount', 'combinationCount', 'binomialProbability', 'unionProbability', 'conditionalProbability'], ['measurement', 'text'], ['solve', 'summarize'], '掌握计数原理、概率模型和统计推断基础。'),
  row('logic.sets-relations', 'common', 'logic-and-sets', '集合、命题、关系与约束的语义承载', ['createFiniteSet', 'setUnion', 'setIntersection', 'setDifference', 'setSymmetricDifference', 'isSubset', 'areSetsEqual', 'cartesianProduct', 'MathResult', 'MathDiagnostic'], ['text', 'measurement'], ['validate', 'relate'], '理解集合、命题、逻辑关系和数学表达的有效性。')
] as const;

export const createParityFixtureNode = ({
  id,
  type,
  rowIds = []
}: {
  id: string;
  type: string;
  rowIds?: readonly string[];
}): GraphObjectNode => {
  const base = {
    id,
    kind: type === 'text' || type === 'measurement' ? 'overlay' as const : type === 'angle' ? 'relation' as const : 'shape' as const,
    type,
    layerId: type === 'text' || type === 'measurement' ? 'overlay' as const : 'content' as const,
    dependencies: [] as string[],
    meta: { curriculumRowIds: [...rowIds] }
  };

  switch (type) {
    case 'point':
      return { ...base, payload: { point: { x: 0, y: 0 } } };
    case 'text':
      return { ...base, payload: { point: { x: 0, y: 0 }, text: '课程标准' } };
    case 'line':
      return { ...base, payload: { geometry: { kind: 'line', point: { x: 0, y: 0 }, direction: { x: 1, y: 1 } } } };
    case 'ray':
      return { ...base, payload: { geometry: { kind: 'ray', origin: { x: 0, y: 0 }, direction: { x: 1, y: 0 } } } };
    case 'segment':
      return { ...base, payload: { geometry: { kind: 'segment', start: { x: -1, y: 0 }, end: { x: 1, y: 0 } } } };
    case 'polygon':
      return { ...base, payload: { geometry: { kind: 'polygon', vertices: [{ x: -1, y: -1 }, { x: 1, y: -1 }, { x: 0, y: 1 }] }, area: 2 } };
    case 'polyline':
    case 'function':
      return { ...base, type: type === 'polyline' ? 'polyline' : 'function', payload: { expression: 'x^2', geometry: { kind: 'polyline', points: [{ x: -1, y: 1 }, { x: 0, y: 0 }, { x: 1, y: 1 }] } } };
    case 'conic':
      return { ...base, payload: { conicKind: 'circle', geometry: { kind: 'circle', center: { x: 0, y: 0 }, radius: 1 } } };
    case 'vector':
      return { ...base, payload: { start: { x: 0, y: 0 }, end: { x: 1, y: 1 }, vector: { x: 1, y: 1 } } };
    case 'measurement':
      return { ...base, payload: { point: { x: 0, y: 0 }, measurementKind: 'distance', value: 1, text: 'distance: 1' } };
    case 'solid':
      return { ...base, payload: { family: 'cube', parameters: { size: 1 }, origin: { x: 0, y: 0, z: 0 }, geometry: { kind: 'polyline', points: [{ x: -1, y: -1 }, { x: 1, y: -1 }, { x: 1, y: 1 }, { x: -1, y: 1 }, { x: -1, y: -1 }] } } };
    default:
      return { ...base, payload: { point: { x: 0, y: 0 }, text: type } };
  }
};

export const createParitySnapshot = (
  demoId: string,
  nodes: readonly GraphObjectNode[],
  context: NormalizeParityContext = {}
): NormalizedParitySnapshot => ({
  demoId,
  backendId: context.backendId,
  objects: nodes.map((node) => normalizeGraphObjectForParity(node, { ...context, demoId }))
});

export const normalizeGraphObjectForParity = (
  node: GraphObjectNode,
  context: NormalizeParityContext = {}
): NormalizedParityObject => {
  const payload = asRecord(node.payload);
  const geometry = asRecord(payload?.geometry);
  const points = collectParityPoints(payload, geometry);
  const rowIds = context.curriculumRowIds
    ?? readStringArray(asRecord(node.meta)?.curriculumRowIds)
    ?? [];
  return {
    objectId: node.id,
    objectType: node.type,
    family: parityFamilyForNode(node, payload, geometry),
    dependencyIds: [...(node.dependencies ?? [])].sort(),
    backendIds: [...(context.backendIds ?? (context.backendId ? [context.backendId] : CURRICULUM_PARITY_BACKENDS))],
    curriculumRowIds: [...rowIds].sort(),
    points,
    sampleCount: countParitySamples(geometry),
    expression: typeof payload?.expression === 'string' ? normalizeExpression(payload.expression) : undefined,
    conicKind: typeof payload?.conicKind === 'string'
      ? payload.conicKind
      : typeof geometry?.kind === 'string' && ['circle', 'ellipse', 'hyperbola', 'parabola'].includes(geometry.kind)
        ? geometry.kind
        : undefined,
    measurementKind: typeof payload?.measurementKind === 'string' ? payload.measurementKind : undefined,
    solidFamily: typeof payload?.family === 'string' ? payload.family : undefined,
    value: typeof payload?.value === 'number' && Number.isFinite(payload.value) ? payload.value : undefined
  };
};

export const compareParitySnapshots = (
  expected: NormalizedParitySnapshot,
  actual: NormalizedParitySnapshot,
  tolerance: ParityComparisonTolerance = {}
): ParityComparisonResult => {
  const diagnostics: ParityComparisonDiagnostic[] = [];
  const epsilon = tolerance.epsilon ?? DEFAULT_PARITY_EPSILON;
  const visualEpsilon = tolerance.visualEpsilon ?? DEFAULT_PARITY_VISUAL_EPSILON;

  if (expected.demoId !== actual.demoId) {
    diagnostics.push({ code: 'parity.demo-id', message: `demoId mismatch: expected ${expected.demoId}, received ${actual.demoId}` });
  }

  const expectedObjects = mapByObjectId(expected.objects);
  const actualObjects = mapByObjectId(actual.objects);
  for (const id of expectedObjects.keys()) {
    if (!actualObjects.has(id)) diagnostics.push({ code: 'parity.missing-object', message: `Missing object ${id}`, objectId: id });
  }
  for (const id of actualObjects.keys()) {
    if (!expectedObjects.has(id)) diagnostics.push({ code: 'parity.extra-object', message: `Unexpected object ${id}`, objectId: id });
  }

  for (const [id, expectedObject] of expectedObjects) {
    const actualObject = actualObjects.get(id);
    if (!actualObject) continue;
    compareStringField(diagnostics, id, 'objectType', expectedObject.objectType, actualObject.objectType);
    compareStringField(diagnostics, id, 'family', expectedObject.family, actualObject.family);
    compareStringField(diagnostics, id, 'expression', expectedObject.expression, actualObject.expression);
    compareStringField(diagnostics, id, 'conicKind', expectedObject.conicKind, actualObject.conicKind);
    compareStringField(diagnostics, id, 'measurementKind', expectedObject.measurementKind, actualObject.measurementKind);
    compareStringField(diagnostics, id, 'solidFamily', expectedObject.solidFamily, actualObject.solidFamily);
    compareStringArrayField(diagnostics, id, 'dependencyIds', expectedObject.dependencyIds, actualObject.dependencyIds);
    compareStringArrayField(diagnostics, id, 'backendIds', expectedObject.backendIds, actualObject.backendIds);
    compareStringArrayField(diagnostics, id, 'curriculumRowIds', expectedObject.curriculumRowIds, actualObject.curriculumRowIds);
    compareNumberField(diagnostics, id, 'value', expectedObject.value, actualObject.value, epsilon);
    compareNumberField(diagnostics, id, 'sampleCount', expectedObject.sampleCount, actualObject.sampleCount, 0);
    comparePoints(diagnostics, id, expectedObject.points, actualObject.points, visualEpsilon);
  }

  return { ok: diagnostics.length === 0, diagnostics };
};

const parityFamilyForNode = (
  node: GraphObjectNode,
  payload: Record<string, unknown> | null,
  geometry: Record<string, unknown> | null
): string => {
  if (node.type === 'solid' || typeof payload?.family === 'string') return 'solid';
  if (node.type === 'measurement') return 'measurement';
  if (node.type === 'text') return 'text';
  if (node.type === 'function' || node.type === 'derivative') return 'function';
  if (node.type === 'vector') return 'vector';
  if (node.type === 'line' || node.type === 'ray' || node.type === 'segment' || geometry?.kind === 'line') return 'linear';
  if (node.type === 'polygon' || node.type === 'polyline' || geometry?.kind === 'polygon' || geometry?.kind === 'polyline' || geometry?.kind === 'multiline' || geometry?.kind === 'wireframe') return 'polygonal';
  if (node.type === 'conic' || node.type === 'circle' || ['circle', 'ellipse', 'hyperbola', 'parabola'].includes(String(geometry?.kind))) return 'conic';
  if (node.type === 'point' || payload?.point || payload?.position) return 'point';
  return node.type;
};

const collectParityPoints = (
  payload: Record<string, unknown> | null,
  geometry: Record<string, unknown> | null
): readonly NormalizedParityPoint[] | undefined => {
  const points: NormalizedParityPoint[] = [];
  pushPoint(points, payload?.point);
  pushPoint(points, payload?.position);
  pushPoint(points, payload?.start);
  pushPoint(points, payload?.end);
  pushPoint(points, payload?.vertex);
  pushPoint(points, geometry?.center);
  pushPoint(points, geometry?.point);
  pushPoint(points, geometry?.origin);
  pushPoint(points, geometry?.start);
  pushPoint(points, geometry?.end);
  pushPointArray(points, payload?.points);
  pushPointArray(points, geometry?.points);
  pushPointArray(points, geometry?.vertices);
  pushPointSegments(points, geometry?.segments);
  return points.length > 0 ? points : undefined;
};


const countParitySamples = (geometry: Record<string, unknown> | null): number | undefined => {
  if (Array.isArray(geometry?.points)) return geometry.points.length;
  if (Array.isArray(geometry?.segments)) {
    return geometry.segments.reduce((sum, segment) => sum + (Array.isArray(segment) ? segment.length : 0), 0);
  }
  return undefined;
};

const pushPointSegments = (target: NormalizedParityPoint[], value: unknown): void => {
  if (!Array.isArray(value)) return;
  for (const segment of value) pushPointArray(target, segment);
};

const pushPointArray = (target: NormalizedParityPoint[], value: unknown): void => {
  if (!Array.isArray(value)) return;
  for (const entry of value) pushPoint(target, entry);
};

const pushPoint = (target: NormalizedParityPoint[], value: unknown): void => {
  const record = asRecord(value);
  if (!record) return;
  const x = record.x;
  const y = record.y;
  const z = record.z;
  if (typeof x !== 'number' || !Number.isFinite(x) || typeof y !== 'number' || !Number.isFinite(y)) return;
  target.push(typeof z === 'number' && Number.isFinite(z) ? { x, y, z } : { x, y });
};

const asRecord = (value: unknown): Record<string, unknown> | null => (
  typeof value === 'object' && value !== null ? value as Record<string, unknown> : null
);

const readStringArray = (value: unknown): readonly string[] | null => (
  Array.isArray(value) && value.every((entry) => typeof entry === 'string') ? value : null
);

const normalizeExpression = (expression: string): string => expression.replace(/\s+/g, '');

const mapByObjectId = (objects: readonly NormalizedParityObject[]): Map<string, NormalizedParityObject> => {
  const map = new Map<string, NormalizedParityObject>();
  for (const object of objects) map.set(object.objectId, object);
  return map;
};

const compareStringField = (
  diagnostics: ParityComparisonDiagnostic[],
  objectId: string,
  field: keyof NormalizedParityObject,
  expected: string | undefined,
  actual: string | undefined
): void => {
  if (expected !== actual) {
    diagnostics.push({ code: `parity.${String(field)}`, message: `${String(field)} mismatch for ${objectId}: expected ${expected ?? '<unset>'}, received ${actual ?? '<unset>'}`, objectId });
  }
};

const compareStringArrayField = (
  diagnostics: ParityComparisonDiagnostic[],
  objectId: string,
  field: keyof NormalizedParityObject,
  expected: readonly string[],
  actual: readonly string[]
): void => {
  const left = [...expected].sort();
  const right = [...actual].sort();
  if (left.length !== right.length || left.some((entry, index) => entry !== right[index])) {
    diagnostics.push({ code: `parity.${String(field)}`, message: `${String(field)} mismatch for ${objectId}: expected ${left.join(',')}, received ${right.join(',')}`, objectId });
  }
};

const compareNumberField = (
  diagnostics: ParityComparisonDiagnostic[],
  objectId: string,
  field: keyof NormalizedParityObject,
  expected: number | undefined,
  actual: number | undefined,
  epsilon: number
): void => {
  if (expected === undefined && actual === undefined) return;
  if (expected === undefined || actual === undefined || Math.abs(expected - actual) > epsilon) {
    diagnostics.push({ code: `parity.${String(field)}`, message: `${String(field)} mismatch for ${objectId}: expected ${expected ?? '<unset>'}, received ${actual ?? '<unset>'}`, objectId });
  }
};

const comparePoints = (
  diagnostics: ParityComparisonDiagnostic[],
  objectId: string,
  expected: readonly NormalizedParityPoint[] | undefined,
  actual: readonly NormalizedParityPoint[] | undefined,
  epsilon: number
): void => {
  if (!expected && !actual) return;
  if (!expected || !actual || expected.length !== actual.length) {
    diagnostics.push({ code: 'parity.points', message: `points mismatch for ${objectId}: expected ${expected?.length ?? 0}, received ${actual?.length ?? 0}`, objectId });
    return;
  }
  for (let index = 0; index < expected.length; index += 1) {
    const left = expected[index];
    const right = actual[index];
    if (Math.abs(left.x - right.x) > epsilon || Math.abs(left.y - right.y) > epsilon || Math.abs((left.z ?? 0) - (right.z ?? 0)) > epsilon) {
      diagnostics.push({ code: 'parity.points', message: `point ${index} mismatch for ${objectId}`, objectId });
      return;
    }
  }
};
