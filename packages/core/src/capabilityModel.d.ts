import type { GraphObjectNode, GraphRuntimeCapabilityDescriptor, GraphRuntimeCapabilityKind, GraphRuntimeTargetRef } from './contracts';
export type GraphMathObjectProfile = 'function' | 'equation' | 'vector' | 'coordinate-system' | 'geometry' | 'solid' | 'scene' | 'viewport';
export interface GraphCapabilityTemplate {
    id: string;
    label: string;
    kind: GraphRuntimeCapabilityKind;
    category: GraphMathObjectProfile | 'base';
}
export declare const GRAPH_MATH_CAPABILITY_PROFILE: Readonly<Record<GraphMathObjectProfile, readonly GraphCapabilityTemplate[]>>;
export declare const inferGraphMathObjectProfile: (node: GraphObjectNode) => GraphMathObjectProfile | null;
export declare const createGraphCapabilitiesForProfile: (profile: GraphMathObjectProfile, target: GraphRuntimeTargetRef, disabled?: Partial<Record<string, string>>) => GraphRuntimeCapabilityDescriptor[];
export declare const createGraphCapabilitiesForObject: (node: GraphObjectNode, disabled?: Partial<Record<string, string>>) => GraphRuntimeCapabilityDescriptor[];
