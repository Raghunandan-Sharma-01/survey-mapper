import fs from 'fs';
import path from 'path';

const SRC = path.resolve(process.cwd(), 'src');

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    const res = path.resolve(dir, e.name);
    if (e.isDirectory()) files.push(...walk(res));
    else if (res.endsWith('.ts') || res.endsWith('.tsx')) files.push(res);
  }
  return files;
}

function normalizeImport(importPath, importerFile) {
  if (!importPath.startsWith('.')) return null; // external
  const importerDir = path.dirname(importerFile);
  const full = path.resolve(importerDir, importPath);
  const candidates = [
    full,
    full + '.ts',
    full + '.tsx',
    path.join(full, 'index.ts'),
    path.join(full, 'index.tsx'),
  ];
  return candidates.find((c) => fs.existsSync(c)) || null;
}

const allFiles = walk(SRC);
const importsMap = new Map();
for (const f of allFiles) importsMap.set(f, new Set());

for (const f of allFiles) {
  const txt = fs.readFileSync(f, 'utf8');
  const re = /from\s+['\"]([^'\"]+)['\"]/g;
  let m;
  while ((m = re.exec(txt)) !== null) {
    const imp = m[1];
    const resolved = normalizeImport(imp, f);
    if (resolved) {
      if (!importsMap.has(resolved)) importsMap.set(resolved, new Set());
      importsMap.get(resolved).add(f);
    }
  }
}

const entryPoints = new Set([
  path.resolve(SRC, 'main.tsx'),
  path.resolve(SRC, 'App.tsx'),
]);

const unused = [];
for (const f of allFiles) {
  if (entryPoints.has(f)) continue;
  const importedBy = importsMap.get(f);
  if (!importedBy || importedBy.size === 0) {
    // Exclude type-only files
    if (f.endsWith('.d.ts')) continue;
    unused.push(f);
  }
}

console.log(JSON.stringify({ unused, count: unused.length }, null, 2));
