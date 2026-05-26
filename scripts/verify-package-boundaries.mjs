import { readFile, readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const rootManifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const rendererPackages = ['jsxgraph', '@babylonjs/core', 'pixi.js', 'fabric', 'konva', 'three'];
const rendererPackageSet = new Set(rendererPackages);
const packageSourceRoots = [
  { name: '@vuegraphx/core', dir: 'packages/core/src', allowedVueGraphXImports: [] },
  { name: '@vuegraphx/math', dir: 'packages/math/src', allowedVueGraphXImports: [] },
  { name: '@vuegraphx/commands', dir: 'packages/commands/src', allowedVueGraphXImports: ['@vuegraphx/core', '@vuegraphx/math'] },
  { name: '@vuegraphx/vue', dir: 'packages/vue/src', allowedVueGraphXImports: ['@vuegraphx/core'] }
];
const backendPeerRequirements = new Map([
  ['@vuegraphx/backend-jsxgraph', ['jsxgraph']],
  ['@vuegraphx/backend-babylon', ['@babylonjs/core']],
  ['@vuegraphx/backend-canvas2d', []],
  ['@vuegraphx/backend-pixi', ['pixi.js']],
  ['@vuegraphx/backend-fabric', ['fabric']],
  ['@vuegraphx/backend-konva', ['konva']],
  ['@vuegraphx/backend-three', ['three']]
]);

const importPattern = /(?:import|export)\s+(?:type\s+)?(?:[^'";]+\s+from\s+)?['"]([^'"]+)['"]/g;
const dynamicImportPattern = /import\(\s*['"]([^'"]+)['"]\s*\)/g;

const listFiles = async (dir) => {
  const absolute = join(root, dir);
  const entries = await readdir(absolute, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const entryPath = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(entryPath));
    else if (/\.tsx?$/.test(entry.name)) files.push(entryPath);
  }
  return files;
};

const readJson = async (path) => JSON.parse(await readFile(join(root, path), 'utf8'));
const stripJsonComments = (source) => {
  let output = '';
  let inString = false;
  let stringQuote = '';
  let escaped = false;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];

    if (inString) {
      output += char;
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === stringQuote) {
        inString = false;
      }
      continue;
    }

    if (char === '"' || char === "'") {
      inString = true;
      stringQuote = char;
      output += char;
      continue;
    }

    if (char === '/' && next === '/') {
      while (index < source.length && source[index] !== '\n') index += 1;
      output += '\n';
      continue;
    }

    if (char === '/' && next === '*') {
      index += 2;
      while (index < source.length && !(source[index] === '*' && source[index + 1] === '/')) index += 1;
      index += 1;
      continue;
    }

    output += char;
  }

  return output;
};
const readJsonc = async (path) => JSON.parse(stripJsonComments(await readFile(join(root, path), 'utf8')));

const collectImports = (source) => {
  const imports = [];
  for (const pattern of [importPattern, dynamicImportPattern]) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(source)) !== null) imports.push(match[1]);
  }
  return imports;
};

const packageNameForSpecifier = (specifier) => {
  if (specifier.startsWith('@')) return specifier.split('/').slice(0, 2).join('/');
  return specifier.split('/')[0];
};

const isRelativeOutsidePackageSrc = (specifier) => specifier === '..' || specifier.startsWith('../');
const isRootSrcImport = (specifier) => specifier.includes('/src/') || specifier.startsWith('../../src') || specifier.startsWith('../../../src');

const failures = [];
const allPackageFiles = [];

for (const packageDir of await readdir(join(root, 'packages'), { withFileTypes: true })) {
  if (!packageDir.isDirectory()) continue;
  allPackageFiles.push(...await listFiles(`packages/${packageDir.name}/src`));
}

for (const file of allPackageFiles) {
  const source = await readFile(join(root, file), 'utf8');
  for (const specifier of collectImports(source)) {
    if (isRootSrcImport(specifier)) {
      failures.push(`Package source must not import root src compatibility shims: ${specifier} (${file})`);
    }
  }
}

for (const boundary of packageSourceRoots) {
  const files = await listFiles(boundary.dir);
  for (const file of files) {
    const source = await readFile(join(root, file), 'utf8');
    for (const specifier of collectImports(source)) {
      const packageName = packageNameForSpecifier(specifier);
      if (rendererPackageSet.has(packageName)) {
        failures.push(`${boundary.name} must not import renderer package ${specifier} (${file})`);
      }
      if (packageName.startsWith('@vuegraphx/') && !boundary.allowedVueGraphXImports.includes(packageName)) {
        failures.push(`${boundary.name} may not import ${packageName} (${file})`);
      }
      if ((boundary.name === '@vuegraphx/commands' || boundary.name === '@vuegraphx/vue') && isRelativeOutsidePackageSrc(specifier)) {
        failures.push(`${boundary.name} must use package aliases instead of cross-package relative import ${specifier} (${file})`);
      }
    }
  }
}

const manifests = new Map();
for (const packageDir of await readdir(join(root, 'packages'), { withFileTypes: true })) {
  if (!packageDir.isDirectory()) continue;
  const manifest = await readJson(`packages/${packageDir.name}/package.json`);
  manifests.set(manifest.name, { manifest, path: `packages/${packageDir.name}/package.json` });
}

for (const [name, record] of manifests) {
  if (record.manifest.private === true) failures.push(`${record.path} must be publishable; remove private:true for real npm boundaries`);
  if (record.manifest.version !== rootManifest.version) failures.push(`${record.path} version must match root ${rootManifest.version}`);
  if (!record.manifest.publishConfig || record.manifest.publishConfig.access !== 'public') {
    failures.push(`${record.path} must declare publishConfig.access=public`);
  }
  if (!Array.isArray(record.manifest.files) || record.manifest.files.length !== 1 || record.manifest.files[0] !== 'dist') {
    failures.push(`${record.path} must publish dist only; source stays repository-local`);
  }
  if (record.manifest.types !== './dist/index.d.ts') failures.push(`${record.path} must expose built declaration output`);
  if (record.manifest.module !== './dist/index.js') failures.push(`${record.path} must expose built ESM output via module`);
  if (record.manifest.exports?.['.']?.types !== './dist/index.d.ts' || record.manifest.exports?.['.']?.import !== './dist/index.js') {
    failures.push(`${record.path} must export dist output, not source or root shims`);
  }
  const dependencies = { ...(record.manifest.dependencies ?? {}), ...(record.manifest.peerDependencies ?? {}) };
  for (const [dependency, range] of Object.entries(dependencies)) {
    if (dependency.startsWith('@vuegraphx/') && range !== rootManifest.version) {
      failures.push(`${record.path} depends on ${dependency}@${range}; expected ${rootManifest.version}`);
    }
  }
}

for (const [name, peers] of backendPeerRequirements) {
  const record = manifests.get(name);
  if (!record) {
    failures.push(`Missing package manifest for ${name}`);
    continue;
  }
  const peerDependencies = record.manifest.peerDependencies ?? {};
  const peerDependenciesMeta = record.manifest.peerDependenciesMeta ?? {};
  for (const peer of peers) {
    if (!peerDependencies[peer]) failures.push(`${relative(root, join(root, record.path))} must declare peerDependency ${peer}`);
    if (!peerDependenciesMeta[peer]?.optional) failures.push(`${record.path} must mark renderer peerDependency ${peer} as optional in workspace metadata`);
  }
  for (const rendererPackage of rendererPackages) {
    if (!peers.includes(rendererPackage) && peerDependencies[rendererPackage]) {
      failures.push(`${record.path} declares unrelated renderer peerDependency ${rendererPackage}`);
    }
  }
  const dependencies = record.manifest.dependencies ?? {};
  for (const internalDependency of ['@vuegraphx/core', '@vuegraphx/math']) {
    if (dependencies[internalDependency] !== rootManifest.version) {
      failures.push(`${record.path} must depend on ${internalDependency}@${rootManifest.version}`);
    }
  }
}

for (const coreName of ['@vuegraphx/core', '@vuegraphx/math', '@vuegraphx/commands', '@vuegraphx/vue']) {
  const record = manifests.get(coreName);
  if (!record) {
    failures.push(`Missing package manifest for ${coreName}`);
    continue;
  }
  const dependencies = { ...(record.manifest.dependencies ?? {}), ...(record.manifest.peerDependencies ?? {}) };
  for (const rendererPackage of rendererPackages) {
    if (dependencies[rendererPackage]) failures.push(`${record.path} must not depend on renderer package ${rendererPackage}`);
  }
}

const tsconfig = await readJsonc('tsconfig.json');
const paths = tsconfig.compilerOptions?.paths ?? {};
for (const name of manifests.keys()) {
  if (!name.startsWith('@vuegraphx/')) continue;
  const expectedPrefix = 'packages/';
  const actual = paths[name]?.[0];
  if (!actual || !actual.startsWith(expectedPrefix)) {
    failures.push(`tsconfig path for ${name} must point at package source, found ${actual ?? '<missing>'}`);
  }
}

const vueIndex = await readFile(join(root, 'packages/vue/src/index.ts'), 'utf8');
if (!/from ['"]vue['"]/.test(vueIndex)) {
  failures.push('@vuegraphx/vue must own Vue integration code instead of only re-exporting core');
}

if (failures.length > 0) {
  console.error('Package boundary verification failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Package boundary verification passed.');
console.log(`Checked package-owned source boundaries: ${packageSourceRoots.map((boundary) => boundary.name).join(', ')}`);
console.log(`Checked backend peer dependency manifests: ${[...backendPeerRequirements.keys()].join(', ')}`);
console.log('Checked tsconfig aliases point at packages/*/src, not root compatibility shims.');
