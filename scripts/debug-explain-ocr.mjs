import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { createWorker } from 'tesseract.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const vendor = path.join(root, 'src/main/resources/static/vendor/tesseract');
let fixture = process.argv[2] || path.join(root, 'tests/fixtures/explain-navicat-sample.png');
const USER_SCREENSHOT = path.join(root, 'tests/fixtures/explain-user-screenshot.png');

if (!fs.existsSync(fixture) && fs.existsSync(USER_SCREENSHOT)) {
  fixture = USER_SCREENSHOT;
}

function loadExplainPro() {
  const code = fs.readFileSync(path.join(root, 'src/main/resources/static/js/explain-pro.js'), 'utf8');
  const sandbox = { globalThis: null };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);
  return sandbox.__ExplainPro;
}

function scoreOcrExplainText(text) {
  const t = String(text || '');
  const lower = t.toLowerCase();
  let score = 0;
  if (/\bselect_type\b/.test(lower)) score += 2;
  if (/\bsimple\b/.test(lower)) score += 12;
  if (/\bshow_users\b/.test(lower) || /\broomnumber\b/.test(lower)) score += 8;
  if (/\b100\.?\d*\b/.test(t)) score += 4;
  if (/(?:^|\n)\s*\d+\s+simple\b/im.test(t)) score += 25;
  const lines = t.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const dataLines = lines.filter(l => /^\d+\s+\S+/i.test(l));
  score += dataLines.length * 15;
  if (lines.length && !dataLines.length && /\bselect_type\b/i.test(t)) score -= 20;
  return score;
}

async function runOcrPass(worker, imagePath, psm) {
  await worker.setParameters({
    tessedit_pageseg_mode: String(psm),
    preserve_interword_spaces: '1'
  });
  const { data } = await worker.recognize(imagePath);
  return data.text || '';
}

async function runOcr(imagePath) {
  const worker = await createWorker('eng', 1, {
    workerPath: path.join(vendor, 'worker.min.js'),
    corePath: path.join(vendor, '/'),
    langPath: path.join(vendor, 'tessdata/'),
    workerBlobURL: false
  });
  try {
    const psms = ['11', '6', '3'];
    let best = '';
    let bestScore = -1;
    for (const psm of psms) {
      const text = await runOcrPass(worker, imagePath, psm);
      const score = scoreOcrExplainText(text);
      console.log(`PSM ${psm} score=${score}`);
      if (score > bestScore) {
        bestScore = score;
        best = text;
      }
    }
    return best;
  } finally {
    await worker.terminate();
  }
}

if (!fs.existsSync(fixture)) {
  console.error('Fixture not found:', fixture);
  process.exit(1);
}

const ExplainPro = loadExplainPro();
console.log('=== OCR fixture ===');
console.log(fixture);

const ocrText = await runOcr(fixture);
console.log('\n=== Raw OCR ===');
console.log(ocrText);

const rebuilt = ExplainPro.rebuildTabularText(ocrText);
console.log('\n=== Rebuilt TSV ===');
console.log(rebuilt);

const result = ExplainPro.analyzeFromOcr(ocrText);
console.log('\n=== Analyze ===');
if (result.error) {
  console.log('ERROR:', result.error);
  console.log('HINT:', result.hint);
  process.exit(1);
}

console.log('OK rows:', result.rows.length);
console.log(JSON.stringify(result.rows[0], null, 2));
console.log('issues:', result.issues.length, 'tips:', result.tips.length);
