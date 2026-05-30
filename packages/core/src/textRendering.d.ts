import type { GraphObjectNode, GraphWorldPoint } from './contracts';
export type GraphTextRenderFormat = 'plain' | 'latex' | 'markdown';
export interface GraphLatexSource {
    latex: string;
    displayMode: boolean;
}
export interface GraphTextRenderDescriptor {
    text: string;
    format: GraphTextRenderFormat;
    latex?: string;
    displayMode?: boolean;
}
export declare const inferGraphTextFormat: (text: string) => GraphTextRenderFormat;
export declare const normalizeGraphLatexSource: (text: string) => GraphLatexSource;
export declare const resolveGraphTextRenderDescriptor: (node: GraphObjectNode) => GraphTextRenderDescriptor | null;
export declare const resolveGraphTextAnchor: (node: GraphObjectNode) => GraphWorldPoint | null;
