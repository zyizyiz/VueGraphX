import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const jsxgraphTypesPath = path.join(rootDir, 'node_modules', 'jsxgraph', 'src', 'index.d.ts');
const localCatalogPath = path.join(rootDir, 'src', 'core', 'rendering', 'known3dElementTypes.json');

function extractJsxgraph3DTypes(typesContent) {
  const blockMatch =
    typesContent.match(/type\s+ElementType\s*=([\s\S]*?);/) ||
    typesContent.match(/type\s+CreateElementType\s*=([\s\S]*?);/);
  if (!blockMatch) {
    throw new Error('无法在 JSXGraph 类型定义中找到 ElementType/CreateElementType。');
  }

  const block = blockMatch[1] || '';
  const regex = /'([a-z0-9]+)'/g;
  const result = new Set();
  let match;

  while ((match = regex.exec(block)) !== null) {
    const name = match[1];
    if (!name.endsWith('3d')) continue;
    if (name === 'view3d') continue;
    result.add(name);
  }

  const viewCreateRegex = /elementType:\s*"([a-z0-9]+3d)"/g;
  while ((match = viewCreateRegex.exec(typesContent)) !== null) {
    const name = match[1];
    if (name === 'view3d') continue;
    result.add(name);
  }

  return [...result].sort((a, b) => a.localeCompare(b));
}

function diffSets(source, target) {
  const sourceSet = new Set(source);
  const targetSet = new Set(target);

  const missing = source.filter((item) => !targetSet.has(item));
  const extra = target.filter((item) => !sourceSet.has(item));

  return { missing, extra };
}

async function main() {
  const [typesContent, localCatalogContent] = await Promise.all([
    readFile(jsxgraphTypesPath, 'utf8'),
    readFile(localCatalogPath, 'utf8')
  ]);

  const jsxgraph3DTypes = extractJsxgraph3DTypes(typesContent);
  const localCatalog = JSON.parse(localCatalogContent);

  if (!Array.isArray(localCatalog)) {
    throw new Error('known3dElementTypes.json 必须是字符串数组。');
  }

  const normalizedLocal = [...new Set(localCatalog.map((item) => String(item).trim().toLowerCase()))]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));

  const { missing, extra } = diffSets(jsxgraph3DTypes, normalizedLocal);

  if (missing.length === 0 && extra.length === 0) {
    console.log('✅ JSXGraph 3D 指令目录一致性检查通过。');
    console.log(`   共 ${jsxgraph3DTypes.length} 个 3D 指令与本地目录一致。`);
    return;
  }

  console.error('❌ JSXGraph 3D 指令目录存在差异。');
  if (missing.length > 0) {
    console.error('   本地目录缺失:');
    missing.forEach((name) => console.error(`   - ${name}`));
  }
  if (extra.length > 0) {
    console.error('   本地目录多余:');
    extra.forEach((name) => console.error(`   - ${name}`));
  }

  process.exitCode = 1;
}

main().catch((error) => {
  console.error('❌ 检查执行失败:', error.message);
  process.exitCode = 1;
});
