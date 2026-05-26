export type VueGraphXPackageRole = 'aggregate' | 'core' | 'math' | 'commands' | 'backend' | 'integration';

export interface VueGraphXPackageManifestEntry {
  name: string;
  role: VueGraphXPackageRole;
  description: string;
  dependsOn: string[];
  rendererPeerDependencies?: string[];
}

export const VUEGRAPHX_PACKAGE_MANIFEST: readonly VueGraphXPackageManifestEntry[] = [
  {
    name: 'vuegraphx',
    role: 'aggregate',
    description: 'Compatibility aggregate preserving the existing VueGraphX import path with the default JSXGraph experience.',
    dependsOn: ['@vuegraphx/core', '@vuegraphx/math', '@vuegraphx/commands', '@vuegraphx/backend-jsxgraph', '@vuegraphx/vue'],
    rendererPeerDependencies: ['jsxgraph']
  },
  {
    name: '@vuegraphx/core',
    role: 'core',
    description: 'Renderer-neutral scene graph, runtime contracts, capabilities, events, targets, and backend registry.',
    dependsOn: [],
    rendererPeerDependencies: []
  },
  {
    name: '@vuegraphx/math',
    role: 'math',
    description: 'Renderer-free math kernel for geometry, functions, equations, transforms, hit helpers, and constraints.',
    dependsOn: ['@vuegraphx/core'],
    rendererPeerDependencies: []
  },
  {
    name: '@vuegraphx/commands',
    role: 'commands',
    description: 'GeoGebra/JSXGraph-style command DSL parser and compiler to VueGraphX core IR.',
    dependsOn: ['@vuegraphx/core', '@vuegraphx/math'],
    rendererPeerDependencies: []
  },
  {
    name: '@vuegraphx/backend-jsxgraph',
    role: 'backend',
    description: 'JSXGraph adapter for default 2D math rendering and compatibility.',
    dependsOn: ['@vuegraphx/core', '@vuegraphx/math'],
    rendererPeerDependencies: ['jsxgraph']
  },
  {
    name: '@vuegraphx/backend-babylon',
    role: 'backend',
    description: 'BabylonJS adapter for high-performance 3D/solid rendering, picking, and projection.',
    dependsOn: ['@vuegraphx/core', '@vuegraphx/math'],
    rendererPeerDependencies: ['@babylonjs/core']
  },
  {
    name: '@vuegraphx/backend-canvas2d',
    role: 'backend',
    description: 'Pure Canvas2D backend for lightweight custom 2D rendering and Path2D-style hit testing.',
    dependsOn: ['@vuegraphx/core', '@vuegraphx/math'],
    rendererPeerDependencies: []
  },
  {
    name: '@vuegraphx/backend-pixi',
    role: 'backend',
    description: 'PixiJS backend for high-performance retained 2D rendering.',
    dependsOn: ['@vuegraphx/core', '@vuegraphx/math'],
    rendererPeerDependencies: ['pixi.js']
  },
  {
    name: '@vuegraphx/backend-fabric',
    role: 'backend',
    description: 'Fabric.js backend for object-editing canvas workflows.',
    dependsOn: ['@vuegraphx/core', '@vuegraphx/math'],
    rendererPeerDependencies: ['fabric']
  },
  {
    name: '@vuegraphx/backend-konva',
    role: 'backend',
    description: 'Konva backend for retained-mode Canvas layers and shape events.',
    dependsOn: ['@vuegraphx/core', '@vuegraphx/math'],
    rendererPeerDependencies: ['konva']
  },
  {
    name: '@vuegraphx/backend-three',
    role: 'backend',
    description: 'Three.js backend for alternative 3D rendering and raycasting.',
    dependsOn: ['@vuegraphx/core', '@vuegraphx/math'],
    rendererPeerDependencies: ['three']
  },
  {
    name: '@vuegraphx/vue',
    role: 'integration',
    description: 'Vue integration, composables, and UI bridge for core capabilities.',
    dependsOn: ['@vuegraphx/core'],
    rendererPeerDependencies: ['vue']
  }
] as const;

export const getVueGraphXPackage = (name: string): VueGraphXPackageManifestEntry | null => (
  VUEGRAPHX_PACKAGE_MANIFEST.find((entry) => entry.name === name) ?? null
);

export const listRendererPeerDependencies = (): string[] => (
  [...new Set(VUEGRAPHX_PACKAGE_MANIFEST.flatMap((entry) => entry.rendererPeerDependencies ?? []))].sort()
);
