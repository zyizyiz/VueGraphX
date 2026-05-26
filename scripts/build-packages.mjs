import { rm, readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const packagesDir = join(root, 'packages');
const tscBin = join(root, 'node_modules', 'typescript', 'bin', 'tsc');

const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));

const buildOrder = [
  'core',
  'math',
  'commands',
  'vue',
  'backend-babylon',
  'backend-canvas2d',
  'backend-fabric',
  'backend-jsxgraph',
  'backend-konva',
  'backend-pixi',
  'backend-three'
];

const discoveredPackageDirs = (await readdir(packagesDir, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);
const packageDirs = [
  ...buildOrder.filter((name) => discoveredPackageDirs.includes(name)),
  ...discoveredPackageDirs.filter((name) => !buildOrder.includes(name)).sort((left, right) => left.localeCompare(right))
].map((name) => join(packagesDir, name));
const packageManifestRecords = [];
for (const dir of packageDirs) {
  const manifestPath = join(dir, 'package.json');
  if (!existsSync(manifestPath)) continue;
  packageManifestRecords.push({ dir, manifest: await readJson(manifestPath) });
}

for (const packageDir of packageDirs) {
  const manifest = await readJson(join(packageDir, 'package.json'));
  const packageName = manifest.name;
  const entry = join(packageDir, 'src', 'index.ts');
  const outDir = join(packageDir, 'dist');
  if (!existsSync(entry)) continue;

  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });

  const external = [
    ...Object.keys(manifest.dependencies ?? {}),
    ...Object.keys(manifest.peerDependencies ?? {})
  ];

  await build({
    configFile: false,
    logLevel: 'warn',
    build: {
      emptyOutDir: false,
      outDir,
      lib: {
        entry,
        formats: ['es'],
        fileName: () => 'index.js'
      },
      rollupOptions: {
        external
      }
    }
  });

  const tsconfigPath = join(packageDir, 'tsconfig.dist.json');
  const packageTypePaths = Object.fromEntries(
    packageManifestRecords
      .filter((record) => record.manifest.name !== packageName)
      .map((record) => [record.manifest.name, [join('..', record.dir.split('/').pop(), 'dist', 'index.d.ts')]])
  );

  await writeFile(tsconfigPath, `${JSON.stringify({
    extends: '../../tsconfig.json',
    compilerOptions: {
      baseUrl: '.',
      paths: packageTypePaths,
      rootDir: './src',
      outDir: './dist',
      declaration: true,
      declarationMap: false,
      emitDeclarationOnly: true,
      noEmit: false,
      allowImportingTsExtensions: true,
      incremental: false,
      composite: false
    },
    include: ['src/**/*.ts'],
    exclude: ['src/**/*.test.ts']
  }, null, 2)}\n`);

  const tsc = spawnSync(process.execPath, [tscBin, '-p', tsconfigPath], {
    cwd: packageDir,
    stdio: 'inherit'
  });
  await rm(tsconfigPath, { force: true });
  if (tsc.status !== 0) {
    process.exit(tsc.status ?? 1);
  }
}

console.log(`Built ${packageDirs.length} VueGraphX scoped package dist directories.`);
