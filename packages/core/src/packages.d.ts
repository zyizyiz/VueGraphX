export type VueGraphXPackageRole = 'aggregate' | 'core' | 'math' | 'commands' | 'backend' | 'integration';
export interface VueGraphXPackageManifestEntry {
    name: string;
    role: VueGraphXPackageRole;
    description: string;
    dependsOn: string[];
    rendererPeerDependencies?: string[];
}
export declare const VUEGRAPHX_PACKAGE_MANIFEST: readonly VueGraphXPackageManifestEntry[];
export declare const getVueGraphXPackage: (name: string) => VueGraphXPackageManifestEntry | null;
export declare const listRendererPeerDependencies: () => string[];
