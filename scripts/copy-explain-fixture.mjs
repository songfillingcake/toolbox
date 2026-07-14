import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = process.argv[2] || path.join(
  process.env.USERPROFILE || '',
  '.cursor/projects/C-Users-ADMINI-1-AppData-Local-Temp-a31520d6-30fb-423d-9035-b3a29c1b42be/assets/explain-navicat-sample.png'
);
const dest = path.join(root, 'tests/fixtures/explain-navicat-sample.png');

if (!fs.existsSync(src)) {
  console.error('Source image not found:', src);
  process.exit(1);
}

fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.copyFileSync(src, dest);
console.log('Copied to', dest, '(' + fs.statSync(dest).size + ' bytes)');
