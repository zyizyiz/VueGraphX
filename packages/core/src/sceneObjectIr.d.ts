import { type GraphLayerId, type GraphObjectKind, type GraphObjectNode, type GraphOperationDiagnostic, type GraphOperationResult, type GraphRuntimeTargetRef, type GraphWorldPoint } from './contracts';
export declare const GRAPH_SCENE_OBJECT_IR_VERSION = 1;
export declare const SUPPORTED_GRAPH_SCENE_OBJECT_IR_TYPES: readonly ["point", "line", "segment", "ray", "polygon", "conic", "text", "function", "parametric", "implicit", "vector", "transform", "measurement", "solid"];
export type GraphSceneObjectIrType = typeof SUPPORTED_GRAPH_SCENE_OBJECT_IR_TYPES[number];
export type GraphSceneObjectIrDiagnosticCode = 'scene-object-ir.unsupported-object-type' | 'scene-object-ir.invalid-payload';
export interface GraphSceneObjectIrDiagnostic extends GraphOperationDiagnostic {
    code: GraphSceneObjectIrDiagnosticCode;
    details?: Record<string, unknown>;
}
export type GraphSceneCoordinate = GraphWorldPoint;
export interface GraphSceneObjectRef {
    objectId: string;
    componentId?: string;
    relationId?: string;
    role?: string;
}
export interface GraphSceneCoordinateRef {
    coordinates: GraphSceneCoordinate;
}
export type GraphScenePointSource = GraphSceneObjectRef | GraphSceneCoordinateRef;
export interface GraphSceneNumericDomain {
    min?: number;
    max?: number;
    step?: number;
}
export interface GraphSceneVectorComponents {
    dimension: '2d' | '3d';
    x: number;
    y: number;
    z?: number;
}
export interface GraphSceneStyleIr {
    strokeColor?: string;
    fillColor?: string;
    strokeWidth?: number;
    opacity?: number;
    visible?: boolean;
    lineDash?: readonly number[];
}
export interface GraphSceneObjectIrBase<Type extends GraphSceneObjectIrType> {
    schemaVersion?: typeof GRAPH_SCENE_OBJECT_IR_VERSION;
    objectType: Type;
    label?: string;
    style?: GraphSceneStyleIr;
    meta?: Record<string, unknown>;
}
export interface GraphPointSceneObjectIr extends GraphSceneObjectIrBase<'point'> {
    position: GraphSceneCoordinate;
}
export type GraphLineDefinitionIr = {
    mode: 'through-points';
    points: readonly [GraphScenePointSource, GraphScenePointSource];
} | {
    mode: 'point-direction';
    point: GraphScenePointSource;
    direction: GraphSceneVectorComponents;
} | {
    mode: 'equation';
    coefficients: {
        a: number;
        b: number;
        c: number;
    };
};
export interface GraphLineSceneObjectIr extends GraphSceneObjectIrBase<'line'> {
    definition: GraphLineDefinitionIr;
}
export interface GraphSegmentSceneObjectIr extends GraphSceneObjectIrBase<'segment'> {
    endpoints: readonly [GraphScenePointSource, GraphScenePointSource];
}
export type GraphRayDefinitionIr = {
    origin: GraphScenePointSource;
    through: GraphScenePointSource;
    direction?: never;
} | {
    origin: GraphScenePointSource;
    direction: GraphSceneVectorComponents;
    through?: never;
};
export type GraphRaySceneObjectIr = GraphSceneObjectIrBase<'ray'> & GraphRayDefinitionIr;
export interface GraphPolygonSceneObjectIr extends GraphSceneObjectIrBase<'polygon'> {
    vertices: readonly GraphScenePointSource[];
    closed?: boolean;
    holes?: readonly (readonly GraphScenePointSource[])[];
}
export type GraphConicKind = 'circle' | 'ellipse' | 'hyperbola' | 'parabola' | 'general-conic';
export type GraphConicDefinitionIr = {
    mode: 'center-radii';
    center: GraphScenePointSource;
    radiusX: number;
    radiusY?: number;
    rotationRadians?: number;
} | {
    mode: 'equation';
    expression: string;
    variables?: readonly [string, string];
} | {
    mode: 'through-points';
    points: readonly GraphScenePointSource[];
} | {
    mode: 'focus-directrix';
    focus: GraphScenePointSource;
    directrix: GraphSceneObjectRef;
    eccentricity?: number;
};
export interface GraphConicSceneObjectIr extends GraphSceneObjectIrBase<'conic'> {
    conicKind: GraphConicKind;
    definition: GraphConicDefinitionIr;
}
export interface GraphTextSceneObjectIr extends GraphSceneObjectIrBase<'text'> {
    content: string;
    anchor: GraphScenePointSource;
    format?: 'plain' | 'latex' | 'markdown';
}
export interface GraphFunctionSceneObjectIr extends GraphSceneObjectIrBase<'function'> {
    expression: string;
    variable?: string;
    domain?: GraphSceneNumericDomain;
    parameters?: Record<string, number>;
}
export interface GraphParametricSceneObjectIr extends GraphSceneObjectIrBase<'parametric'> {
    parameter: string;
    xExpression: string;
    yExpression: string;
    zExpression?: string;
    domain?: GraphSceneNumericDomain;
    parameters?: Record<string, number>;
}
export interface GraphImplicitSceneObjectIr extends GraphSceneObjectIrBase<'implicit'> {
    expression: string;
    variables?: readonly [string, string] | readonly [string, string, string];
    domain?: Record<string, GraphSceneNumericDomain>;
    parameters?: Record<string, number>;
}
export interface GraphVectorSceneObjectIr extends GraphSceneObjectIrBase<'vector'> {
    start?: GraphScenePointSource;
    end?: GraphScenePointSource;
    components?: GraphSceneVectorComponents;
}
export type GraphTransformKind = 'translation' | 'rotation' | 'reflection' | 'scale' | 'matrix' | 'custom';
export interface GraphTransformSceneObjectIr extends GraphSceneObjectIrBase<'transform'> {
    transformKind: GraphTransformKind;
    target: GraphSceneObjectRef;
    parameters: Record<string, unknown>;
}
export type GraphMeasurementKind = 'distance' | 'angle' | 'length' | 'area' | 'slope' | 'dot-product' | 'cross-product' | 'volume';
export interface GraphMeasurementSceneObjectIr extends GraphSceneObjectIrBase<'measurement'> {
    measurementKind: GraphMeasurementKind;
    targets: readonly GraphSceneObjectRef[];
    unit?: string;
    expression?: string;
}
export type GraphSolidKind = 'polyhedron' | 'sphere' | 'cylinder' | 'cone' | 'prism' | 'pyramid' | 'surface' | 'custom';
export interface GraphSolidSceneObjectIr extends GraphSceneObjectIrBase<'solid'> {
    solidKind: GraphSolidKind;
    vertices?: readonly Extract<GraphWorldPoint, {
        dimension: '3d';
    }>[];
    faces?: readonly (readonly number[])[];
    parameters?: Record<string, unknown>;
}
export type GraphSceneObjectIr = GraphPointSceneObjectIr | GraphLineSceneObjectIr | GraphSegmentSceneObjectIr | GraphRaySceneObjectIr | GraphPolygonSceneObjectIr | GraphConicSceneObjectIr | GraphTextSceneObjectIr | GraphFunctionSceneObjectIr | GraphParametricSceneObjectIr | GraphImplicitSceneObjectIr | GraphVectorSceneObjectIr | GraphTransformSceneObjectIr | GraphMeasurementSceneObjectIr | GraphSolidSceneObjectIr;
export type GraphSceneObjectIrNode = GraphObjectNode<GraphSceneObjectIr> & {
    type: GraphSceneObjectIrType;
};
export interface CreateGraphSceneObjectIrNodeInput {
    id: string;
    objectType: string;
    payload: unknown;
    kind?: GraphObjectKind;
    layerId?: GraphLayerId;
    dependencies?: string[];
    children?: string[];
    relations?: string[];
    renderHints?: Record<string, unknown>;
    meta?: Record<string, unknown>;
}
export declare const isSupportedGraphSceneObjectIrType: (value: string) => value is GraphSceneObjectIrType;
export declare const unsupportedGraphSceneObjectIrDiagnostic: (objectType: string, objectId?: string) => GraphSceneObjectIrDiagnostic;
export declare const invalidGraphSceneObjectIrPayloadDiagnostic: (expectedObjectType: GraphSceneObjectIrType, receivedObjectType: string | undefined, objectId?: string) => GraphSceneObjectIrDiagnostic;
export declare const createGraphSceneObjectIrNode: (input: CreateGraphSceneObjectIrNodeInput) => GraphOperationResult<GraphSceneObjectIrNode>;
