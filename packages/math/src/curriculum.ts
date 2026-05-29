export type MathEducationStage = 'junior-high' | 'senior-high' | 'common';

export type MathKnowledgeArea =
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

export type MathKnowledgeSupportLevel = 'computed' | 'semantic-model' | 'expression-engine';
export type MathKnowledgeBackendId = 'jsxgraph' | 'canvas2d' | 'babylon';

export interface MathKnowledgeSourceRef {
  document: '义务教育数学课程标准2022' | '普通高中数学课程标准2017-2020';
  section: string;
  clause: string;
  label: string;
  url: string;
}

export type MathKnowledgeBackendEvidenceStatus = 'native' | 'sampled' | 'projected' | 'dom-overlay';

export interface MathKnowledgeBackendEvidence {
  status: MathKnowledgeBackendEvidenceStatus;
  demoIds: readonly string[];
  visualObjectTypes: readonly string[];
}

export interface MathKnowledgePoint {
  id: string;
  stage: MathEducationStage;
  area: MathKnowledgeArea;
  title: string;
  support: MathKnowledgeSupportLevel;
  kernelExports: readonly string[];
  visualObjectTypes: readonly string[];
  capabilityFamilies: readonly string[];
  sourceRefs: readonly MathKnowledgeSourceRef[];
  demoIds: readonly string[];
  backendEvidence: Record<MathKnowledgeBackendId, MathKnowledgeBackendEvidence>;
}

export interface MathKnowledgeCoverageSummary {
  total: number;
  byStage: Record<MathEducationStage, number>;
  byArea: Record<MathKnowledgeArea, number>;
  bySupport: Record<MathKnowledgeSupportLevel, number>;
}

const point = (
  id: string,
  stage: MathEducationStage,
  area: MathKnowledgeArea,
  title: string,
  support: MathKnowledgeSupportLevel,
  kernelExports: readonly string[],
  visualObjectTypes: readonly string[],
  capabilityFamilies: readonly string[]
): MathKnowledgePoint => ({
  id,
  stage,
  area,
  title,
  support,
  kernelExports,
  visualObjectTypes,
  capabilityFamilies,
  sourceRefs: refsForStage(stage, area),
  demoIds: [`curriculum.${id}`],
  backendEvidence: createBackendEvidence(`curriculum.${id}`, visualObjectTypes)
});

const YIWU_2022_URL = 'https://www.moe.gov.cn/srcsite/A26/s8001/202204/W020220420582343217634.pdf';
const GAOZHONG_2017_2020_URL = 'https://www.moe.gov.cn/srcsite/A26/s8001/202006/W020200605325074919686.pdf';

const refsForStage = (stage: MathEducationStage, area: MathKnowledgeArea): readonly MathKnowledgeSourceRef[] => {
  if (stage === 'junior-high') {
    return [{
      document: '义务教育数学课程标准2022',
      section: '第三学段/第四学段',
      clause: area,
      label: '数与代数、图形与几何、统计与概率课程内容',
      url: YIWU_2022_URL
    }];
  }
  if (stage === 'senior-high') {
    return [{
      document: '普通高中数学课程标准2017-2020',
      section: '必修课程',
      clause: area,
      label: '预备知识、函数、几何与代数、概率与统计',
      url: GAOZHONG_2017_2020_URL
    }];
  }
  return [
    {
      document: '义务教育数学课程标准2022',
      section: '跨学段核心素养',
      clause: area,
      label: '抽象能力、运算能力、几何直观、数据观念',
      url: YIWU_2022_URL
    },
    {
      document: '普通高中数学课程标准2017-2020',
      section: '课程结构与核心素养',
      clause: area,
      label: '数学抽象、逻辑推理、数学运算、直观想象、数据分析',
      url: GAOZHONG_2017_2020_URL
    }
  ];
};

const createBackendEvidence = (
  demoId: string,
  visualObjectTypes: readonly string[]
): Record<MathKnowledgeBackendId, MathKnowledgeBackendEvidence> => ({
  jsxgraph: { status: backendEvidenceStatus('jsxgraph', visualObjectTypes), demoIds: [demoId], visualObjectTypes: [...visualObjectTypes] },
  canvas2d: { status: backendEvidenceStatus('canvas2d', visualObjectTypes), demoIds: [demoId], visualObjectTypes: [...visualObjectTypes] },
  babylon: { status: backendEvidenceStatus('babylon', visualObjectTypes), demoIds: [demoId], visualObjectTypes: [...visualObjectTypes] }
});

const backendEvidenceStatus = (
  backendId: MathKnowledgeBackendId,
  visualObjectTypes: readonly string[]
): MathKnowledgeBackendEvidenceStatus => {
  const types = new Set(visualObjectTypes);
  if (backendId === 'canvas2d') {
    if (types.has('solid') || types.has('surface') || types.has('parametric')) return 'projected';
    if (types.has('function') || types.has('conic') || types.has('equation')) return 'sampled';
    return 'native';
  }
  if (backendId === 'babylon') {
    if (types.has('surface') || types.has('parametric') || types.has('function') || types.has('conic')) return 'sampled';
    if (types.has('text') || types.has('measurement')) return 'dom-overlay';
    return 'native';
  }
  if (types.has('equation') || types.has('surface')) return 'sampled';
  return 'native';
};

export const mathKnowledgeCatalog: readonly MathKnowledgePoint[] = [
  point('number.real-expression', 'common', 'number-and-algebra', '实数、代数式、根式与常量表达式求值', 'expression-engine', ['evaluateExpression', 'simplifyExpression'], ['text', 'measurement'], ['evaluate', 'simplify']),
  point('algebra.linear-quadratic-equations', 'junior-high', 'number-and-algebra', '一次/二次方程实根', 'computed', ['solvePolynomialRoots'], ['function', 'measurement'], ['solve', 'intersect']),
  point('algebra.symbolic-derivative', 'senior-high', 'calculus-basics', '基础导数、割线/切线、函数变化率与定积分近似', 'computed', ['derivativeExpressionResult', 'numericDerivative', 'secantSlope', 'tangentLineAtFunction', 'definiteIntegral'], ['function', 'line', 'measurement'], ['differentiate', 'integrate', 'measure']),
  point('inequality.linear', 'junior-high', 'inequalities', '一次不等式解集', 'computed', ['solveLinearInequality'], ['function', 'measurement'], ['solve', 'highlight-interval']),
  point('inequality.quadratic', 'senior-high', 'inequalities', '二次不等式解集', 'computed', ['solveQuadraticInequality'], ['function', 'measurement'], ['solve', 'highlight-interval']),
  point('function.evaluation-roots-intersections', 'junior-high', 'functions', '函数求值、零点、交点与定义域诊断', 'computed', ['createFunctionDescriptor', 'evaluateFunction', 'findFunctionRoots', 'intersectFunctions'], ['function', 'point'], ['evaluate', 'intersect', 'sample']),
  point('geometry.basic-2d', 'junior-high', 'plane-geometry', '点、线、射线、线段、圆、多边形基础构造', 'computed', ['point2D', 'lineFromPoints', 'rayFromPoints', 'segmentFromPoints', 'circleFromCenterPoint', 'polygonFromVertices'], ['point', 'line', 'ray', 'segment', 'conic', 'polygon'], ['create', 'drag', 'measure']),
  point('geometry.triangle-centers', 'junior-high', 'plane-geometry', '三角形外心、内心、内切圆、外接圆', 'computed', ['circumcenter2D', 'incenter2D', 'circleFromThreePointsResult', 'incircleFromTriangle'], ['point', 'conic', 'polygon'], ['construct', 'measure']),
  point('geometry.area-centroid-transform', 'junior-high', 'plane-geometry', '面积、质心、平移、旋转、缩放', 'computed', ['polygonArea', 'polygonCentroid', 'translatePoint2D', 'rotatePoint2D', 'scalePoint2DAbout'], ['polygon', 'transform', 'measurement'], ['measure', 'transform']),
  point('analytic.lines-circles-conics', 'senior-high', 'analytic-geometry', '直线、圆、圆锥曲线分类与交点', 'computed', ['lineFromPointsResult', 'conicFromCoefficients', 'classifyConic2D', 'intersectLineConic2DResult'], ['line', 'conic', 'point'], ['intersect', 'classify', 'project']),
  point('analytic.tangent-normal', 'senior-high', 'analytic-geometry', '圆的切线、法线、点到直线距离、投影', 'computed', ['distancePointLine2D', 'projectPointToLine2D', 'tangentLineToCircleAtPoint2D', 'normalLineToCircleAtPoint2D'], ['line', 'conic', 'measurement'], ['measure', 'construct']),
  point('trigonometry.angle-triangle', 'senior-high', 'trigonometry', '角度制/弧度制、三角函数、正弦/余弦定理、三角形面积', 'computed', ['degreesToRadians', 'radiansToDegrees', 'sinDegrees', 'cosDegrees', 'tanDegrees', 'lawOfSinesSide', 'lawOfCosinesSide', 'triangleAreaHeron'], ['polygon', 'measurement'], ['measure', 'solve-triangle']),
  point('solid.metrics', 'junior-high', 'solid-geometry', '常见柱锥球台体体积与表面积', 'computed', ['createSolidDescriptor', 'calculateSolidMetrics', 'getSolidDefaultParameters'], ['solid', 'measurement'], ['measure', 'resize']),
  point('solid.ir-surface', 'senior-high', 'solid-geometry', '立体几何对象语义、曲面/多面体参数模型', 'semantic-model', ['createSolidDescriptor'], ['solid', 'parametric'], ['render', 'pick', 'measure']),
  point('vector.2d-3d', 'senior-high', 'vectors', '二维/三维向量、点积、叉积、长度、单位化、向量夹角', 'computed', ['vector2D', 'vector3D', 'dot2D', 'cross2D', 'dot3D', 'cross3D', 'length2D', 'length3D', 'normalize2D', 'normalize3D', 'angleBetweenVectors3D'], ['vector', 'measurement'], ['measure', 'transform']),
  point('complex.basic', 'senior-high', 'complex-numbers', '复数代数形式、极形式、模、辐角与四则运算', 'computed', ['complex', 'complexFromPolar', 'addComplex', 'subtractComplex', 'multiplyComplex', 'divideComplex', 'conjugateComplex', 'modulusComplex', 'argumentComplex'], ['point', 'vector', 'measurement'], ['evaluate', 'transform']),
  point('linear-algebra.2x2-3x3', 'common', 'linear-algebra', '二阶/三阶行列式、二元一次方程组与二维线性变换', 'computed', ['determinant2x2', 'determinant3x3', 'solveLinearSystem2x2', 'multiplyMatrix2x2Vector'], ['transform', 'measurement'], ['solve', 'transform']),
  point('sequence.arithmetic-geometric', 'senior-high', 'sequences', '等差/等比数列通项、前 n 项和、生成项', 'computed', ['createArithmeticSequence', 'arithmeticSequenceTerm', 'arithmeticSequenceSum', 'createGeometricSequence', 'geometricSequenceTerm', 'geometricSequenceSum', 'generateSequenceTerms'], ['function', 'measurement'], ['evaluate', 'table']),
  point('statistics.descriptive', 'junior-high', 'probability-statistics', '平均数、中位数、众数、方差、标准差、四分位数', 'computed', ['mean', 'weightedMean', 'median', 'modeValues', 'variance', 'standardDeviation', 'quartiles'], ['measurement', 'text'], ['summarize']),
  point('probability.combinatorics-binomial', 'senior-high', 'probability-statistics', '排列组合、二项分布、条件概率、并事件概率', 'computed', ['factorial', 'permutationCount', 'combinationCount', 'binomialProbability', 'unionProbability', 'conditionalProbability'], ['measurement', 'text'], ['solve', 'summarize']),
  point('logic.sets-relations', 'common', 'logic-and-sets', '集合、命题、关系与约束的语义承载', 'computed', ['createFiniteSet', 'setUnion', 'setIntersection', 'setDifference', 'setSymmetricDifference', 'isSubset', 'areSetsEqual', 'cartesianProduct', 'MathResult', 'MathDiagnostic'], ['relation', 'measurement'], ['validate', 'relate'])
] as const;

const cloneKnowledgePoint = (item: MathKnowledgePoint): MathKnowledgePoint => ({
  ...item,
  kernelExports: [...item.kernelExports],
  visualObjectTypes: [...item.visualObjectTypes],
  capabilityFamilies: [...item.capabilityFamilies],
  sourceRefs: item.sourceRefs.map((ref) => ({ ...ref })),
  demoIds: [...item.demoIds],
  backendEvidence: {
    jsxgraph: cloneBackendEvidence(item.backendEvidence.jsxgraph),
    canvas2d: cloneBackendEvidence(item.backendEvidence.canvas2d),
    babylon: cloneBackendEvidence(item.backendEvidence.babylon)
  }
});

const cloneBackendEvidence = (evidence: MathKnowledgeBackendEvidence): MathKnowledgeBackendEvidence => ({
  status: evidence.status,
  demoIds: [...evidence.demoIds],
  visualObjectTypes: [...evidence.visualObjectTypes]
});

const zeroStageCounts = (): Record<MathEducationStage, number> => ({
  'junior-high': 0,
  'senior-high': 0,
  common: 0
});

const zeroAreaCounts = (): Record<MathKnowledgeArea, number> => ({
  'number-and-algebra': 0,
  functions: 0,
  inequalities: 0,
  'plane-geometry': 0,
  'analytic-geometry': 0,
  trigonometry: 0,
  'solid-geometry': 0,
  vectors: 0,
  'complex-numbers': 0,
  'linear-algebra': 0,
  sequences: 0,
  'probability-statistics': 0,
  'calculus-basics': 0,
  'logic-and-sets': 0
});

const zeroSupportCounts = (): Record<MathKnowledgeSupportLevel, number> => ({
  computed: 0,
  'semantic-model': 0,
  'expression-engine': 0
});

export const listMathKnowledgePoints = (filter: Partial<Pick<MathKnowledgePoint, 'stage' | 'area' | 'support'>> = {}): MathKnowledgePoint[] => (
  mathKnowledgeCatalog.filter((item) => (
    (filter.stage === undefined || item.stage === filter.stage)
    && (filter.area === undefined || item.area === filter.area)
    && (filter.support === undefined || item.support === filter.support)
  )).map(cloneKnowledgePoint)
);

export const getMathKnowledgePoint = (id: string): MathKnowledgePoint | undefined => {
  const item = mathKnowledgeCatalog.find((entry) => entry.id === id);
  return item ? cloneKnowledgePoint(item) : undefined;
};

export const summarizeMathKnowledgeCoverage = (): MathKnowledgeCoverageSummary => {
  const summary: MathKnowledgeCoverageSummary = {
    total: mathKnowledgeCatalog.length,
    byStage: zeroStageCounts(),
    byArea: zeroAreaCounts(),
    bySupport: zeroSupportCounts()
  };
  for (const item of mathKnowledgeCatalog) {
    summary.byStage[item.stage] += 1;
    summary.byArea[item.area] += 1;
    summary.bySupport[item.support] += 1;
  }
  return summary;
};
