import { access, readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const failures = [];

for (const packageDir of await readdir(join(root, 'packages'), { withFileTypes: true })) {
  if (!packageDir.isDirectory()) continue;
  const packageRoot = join(root, 'packages', packageDir.name);
  const manifest = JSON.parse(await readFile(join(packageRoot, 'package.json'), 'utf8'));
  for (const file of ['dist/index.js', 'dist/index.d.ts']) {
    try {
      await access(join(packageRoot, file));
    } catch {
      failures.push(`${manifest.name} is missing ${file}; run npm run build:packages`);
    }
  }
  const publishedFiles = manifest.files ?? [];
  if (publishedFiles.length !== 1 || publishedFiles[0] !== 'dist') {
    failures.push(`${manifest.name} package.json must publish only dist`);
  }
}

if (failures.length > 0) {
  console.error('Package dist verification failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Package dist verification passed.');
