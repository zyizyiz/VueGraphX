import type { GraphObjectNode } from './contracts';
export type CurriculumBackendId = 'jsxgraph' | 'canvas2d';
export type CurriculumEducationStage = 'junior-high' | 'senior-high' | 'common';
export type CurriculumKnowledgeArea = 'number-and-algebra' | 'functions' | 'inequalities' | 'plane-geometry' | 'analytic-geometry' | 'trigonometry' | 'solid-geometry' | 'vectors' | 'complex-numbers' | 'linear-algebra' | 'sequences' | 'probability-statistics' | 'calculus-basics' | 'logic-and-sets';
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
export declare const CURRICULUM_PARITY_BACKENDS: readonly ["jsxgraph", "canvas2d"];
export declare const DEFAULT_PARITY_EPSILON = 0.000001;
export declare const DEFAULT_PARITY_VISUAL_EPSILON = 0.001;
export declare const curriculumParityRows: readonly CurriculumParityRow[];
export declare const createParityFixtureNode: ({ id, type, rowIds }: {
    id: string;
    type: string;
    rowIds?: readonly string[];
}) => GraphObjectNode;
export declare const createParitySnapshot: (demoId: string, nodes: readonly GraphObjectNode[], context?: NormalizeParityContext) => NormalizedParitySnapshot;
export declare const normalizeGraphObjectForParity: (node: GraphObjectNode, context?: NormalizeParityContext) => NormalizedParityObject;
export declare const compareParitySnapshots: (expected: NormalizedParitySnapshot, actual: NormalizedParitySnapshot, tolerance?: ParityComparisonTolerance) => ParityComparisonResult;
