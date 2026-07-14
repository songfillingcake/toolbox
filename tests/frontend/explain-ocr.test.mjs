import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { loadBrowserScript } from './load-browser-script.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ExplainPro = loadBrowserScript(
  'src/main/resources/static/js/explain-pro.js',
  '__ExplainPro'
);

const FIXTURE = path.join(root, 'tests/fixtures/explain-navicat-sample.png');
const TESSDATA = path.join(
  root,
  'src/main/resources/static/vendor/tesseract/tessdata/eng.traineddata.gz'
);

/** Typical Tesseract output shapes for Navicat EXPLAIN grids */
const NAVICAT_OCR_VARIANTS = [
  {
    name: 'clean two-line',
    text: `id select_type table partitions type possible_keys key key_len ref rows filtered Extra
1 SIMPLE show_users (Null) ref roomnumber roomnumber 4 const 6 100.00 (Null)`
  },
  {
    name: 'missing grey (Null) partitions',
    text: '1 SIMPLE show_users ref roomnumber roomnumber 4 const 6 100.00 NULL'
  },
  {
    name: 'id read as l',
    text: 'l SIMPLE show_users NULL ref roomnumber roomnumber 4 const 6 100.00 NULL'
  },
  {
    name: 'filtered read as l00.00',
    text: '1 SIMPLE show_users NULL ref roomnumber roomnumber 4 const 6 l00.00 NULL'
  },
  {
    name: 'missing grey Extra (Null)',
    text: '1 SIMPLE show_users NULL ref roomnumber roomnumber 4 const 6 100.00'
  },
  {
    name: 'misaligned OCR with typos (user screenshot)',
    text: `select_type table patitions type possible_keys key key len veff OWS filtered Extra
1 SIMPLE show users (Null) veff roomnumber roomnumber 4 const [] 100.80 (Null)`
  },
    text: 'id select_type table partitions type possible_keys key key_len ref rows filtered Extra'
  },
  {
    name: 'vertical header noise',
    text: `id
select_type
table
partitions
type
1 SIMPLE show_users NULL ref roomnumber roomnumber 4 const 6 100.00 NULL`
  }
];

function expectShowUsersRow(r) {
  expect(r.error).toBeNull();
  expect(r.rows).toHaveLength(1);
  const row = r.rows[0];
  expect(row.table).toBe('show_users');
  expect(row.type).toBe('ref');
  expect(row.key).toBe('roomnumber');
  expect(row.rows).toBe('6');
  expect(row.filtered).toBe('100.00');
  expect(row.partitions).toBe('NULL');
  expect(row.extra).toBe('NULL');
  expect((r.issueLevels || []).filter(i => i.level === 'high')).toHaveLength(0);
}

describe('ExplainPro Navicat screenshot OCR', () => {
  NAVICAT_OCR_VARIANTS.forEach(({ name, text }) => {
    it(`parses variant: ${name}`, () => {
      if (name === 'header only (OCR missed data row)') {
        const r = ExplainPro.analyzeFromOcr(text);
        expect(r.error).toBeTruthy();
        return;
      }
      expectShowUsersRow(ExplainPro.analyzeFromOcr(text));
    });
  });
});

const canRunLiveOcr = fs.existsSync(FIXTURE) && fs.existsSync(TESSDATA);

describe.skipIf(!canRunLiveOcr)('ExplainPro live OCR fixture', () => {
  it('recognizes explain-navicat-sample.png end-to-end', async () => {
    const { createWorker } = await import('tesseract.js');
    const vendor = path.join(root, 'src/main/resources/static/vendor/tesseract');
    const worker = await createWorker('eng', 1, {
      workerPath: path.join(vendor, 'worker.min.js'),
      corePath: path.join(vendor, '/'),
      langPath: path.join(vendor, 'tessdata/'),
      workerBlobURL: false
    });
    try {
      await worker.setParameters({
        tessedit_pageseg_mode: '6',
        preserve_interword_spaces: '1'
      });
      const { data } = await worker.recognize(FIXTURE);
      const ocrText = data.text || '';
      expect(ocrText.trim().length).toBeGreaterThan(20);
      expectShowUsersRow(ExplainPro.analyzeFromOcr(ocrText));
    } finally {
      await worker.terminate();
    }
  }, 120000);
});
