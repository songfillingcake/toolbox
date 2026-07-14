import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'src/main/resources/static/vendor/tesseract');
const tessdataDir = path.join(outDir, 'tessdata');
const VER = '5.1.1';

async function downloadTo(target, urls) {
  let lastErr = '';
  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        lastErr = `${url} -> ${res.status}`;
        continue;
      }
      const buf = Buffer.from(await res.arrayBuffer());
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, buf);
      console.log(`${path.relative(outDir, target)}\t${buf.length} bytes`);
      return;
    } catch (e) {
      lastErr = `${url} -> ${e.message}`;
    }
  }
  throw new Error(`Download failed for ${path.basename(target)}: ${lastErr}`);
}

function jsDist(file) {
  return [
    `https://cdn.jsdelivr.net/npm/tesseract.js@${VER}/dist/${file}`,
    `https://registry.npmmirror.com/tesseract.js/${VER}/files/dist/${file}`
  ];
}

function coreFile(file) {
  return [
    `https://cdn.jsdelivr.net/npm/tesseract.js-core@${VER}/${file}`,
    `https://registry.npmmirror.com/tesseract.js-core/${VER}/files/${file}`
  ];
}

fs.mkdirSync(tessdataDir, { recursive: true });

const jobs = [
  ['tesseract.min.js', jsDist('tesseract.min.js')],
  ['worker.min.js', jsDist('worker.min.js')],
  ['tesseract-core.wasm.js', coreFile('tesseract-core.wasm.js')],
  ['tesseract-core-simd.wasm.js', coreFile('tesseract-core-simd.wasm.js')],
  ['tesseract-core-lstm.wasm.js', coreFile('tesseract-core-lstm.wasm.js')],
  ['tesseract-core-simd-lstm.wasm.js', coreFile('tesseract-core-simd-lstm.wasm.js')],
  ['tessdata/eng.traineddata.gz', [
    'https://cdn.jsdelivr.net/npm/@tesseract.js-data/eng/4.0.0/eng.traineddata.gz',
    'https://registry.npmmirror.com/@tesseract.js-data/eng/4.0.0/eng.traineddata.gz'
  ]]
];

const tessdataOnly = process.argv.includes('--tessdata-only');
const runJobs = tessdataOnly
  ? jobs.filter(([rel]) => rel.startsWith('tessdata/'))
  : jobs;

for (const [rel, urls] of runJobs) {
  await downloadTo(path.join(outDir, rel), urls);
}

console.log('OCR vendor files ready at', outDir);
