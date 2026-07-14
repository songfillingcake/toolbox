import { describe, expect, it } from 'vitest';
import { loadBrowserScript } from './load-browser-script.mjs';

const ExplainPro = loadBrowserScript(
  'src/main/resources/static/js/explain-pro.js',
  '__ExplainPro'
);

const SAMPLE = `id\tselect_type\ttable\tpartitions\ttype\tpossible_keys\tkey\tkey_len\tref\trows\tfiltered\tExtra
1\tSIMPLE\tuser\tNULL\tALL\tNULL\tNULL\tNULL\tNULL\t125000\t10.00\tUsing where`;

describe('ExplainPro', () => {
  it('parses MySQL 8 full columns', () => {
    const r = ExplainPro.analyze(SAMPLE);
    expect(r.error).toBeNull();
    expect(r.rows).toHaveLength(1);
    expect(r.rows[0].table).toBe('user');
    expect(r.rows[0].partitions).toBe('NULL');
    expect(r.rows[0].filtered).toBe('10.00');
    expect(r.rows[0].type).toBe('ALL');
  });

  it('flags full table scan', () => {
    const r = ExplainPro.analyze(SAMPLE);
    expect(r.issues.some(i => /ALL/.test(i))).toBe(true);
  });

  it('rejects header-only paste', () => {
    const r = ExplainPro.analyze('id\tselect_type\ttable\ttype\trows\tExtra');
    expect(r.error).toContain('未能解析');
  });

  it('parses data rows without header using fixed column order', () => {
    const dataOnly = '1\tSIMPLE\tuser\tNULL\tALL\tNULL\tNULL\tNULL\tNULL\t125000\t10.00\tUsing where';
    const r = ExplainPro.analyze(dataOnly);
    expect(r.error).toBeNull();
    expect(r.rows[0].table).toBe('user');
    expect(r.rows[0].type).toBe('ALL');
  });

  it('exposes fixed column labels', () => {
    const labels = ExplainPro.getFixedColumnLabels();
    expect(labels).toHaveLength(12);
    expect(labels[0]).toBe('id');
    expect(labels[11]).toBe('Extra');
  });

  it('renders aligned grid with same column widths for header and data', () => {
    const tsv = `id\tselect_type\ttable\tpartitions\ttype\tpossible_keys\tkey\tkey_len\tref\trows\tfiltered\tExtra
1\tSIMPLE\tshow_users\tNULL\tref\troomnumber\troomnumber\t4\tconst\t6\t100.00\tNULL`;
    const html = ExplainPro.renderAlignGrid(tsv);
    expect(html).toContain('explain-align-grid');
    expect(html).toContain('grid-template-columns:');
    expect(html).toContain('show_users');
    expect(html).toContain('roomnumber');
    expect(html).toContain('100.00');
    const heads = (html.match(/explain-align-head/g) || []).length;
    const cells = (html.match(/explain-align-data/g) || []).length;
    expect(heads).toBe(12);
    expect(cells).toBe(12);
  });

  it('normalizes Navicat OCR text with (Null)', () => {
    const ocr = `id select_type table partitions type possible_keys key key_len ref rows filtered Extra
1 SIMPLE show_users (Null) ref roomnumber roomnumber 4 const 6 100.00 (Null)`;
    const r = ExplainPro.analyzeFromOcr(ocr);
    expect(r.error).toBeNull();
    expect(r.rows).toHaveLength(1);
    expect(r.rows[0].table).toBe('show_users');
    expect(r.rows[0].type).toBe('ref');
    expect(r.rows[0].partitions).toBe('NULL');
    expect(r.rows[0].filtered).toBe('100.00');
    expect(r.rows[0].extra).toBe('NULL');
  });

  it('rebuilds tabular text from spaced OCR data line', () => {
    const rebuilt = ExplainPro.rebuildTabularText('1 SIMPLE show_users NULL ref roomnumber roomnumber 4 const 6 100.00 NULL');
    expect(rebuilt).toContain('show_users');
    expect(rebuilt).toContain('100.00');
  });

  it('parses OCR with split id line and vertical header noise', () => {
    const ocr = `id
select_type
table
1
SIMPLE show_users NULL ref roomnumber roomnumber 4 const 6 100.00 NULL`;
    const r = ExplainPro.analyzeFromOcr(ocr);
    expect(r.error).toBeNull();
    expect(r.rows[0].table).toBe('show_users');
  });

  it('extracts row from flat OCR text via regex', () => {
    const rows = ExplainPro.extractRowsFromOcrText(
      'garbage id select_type 1 SIMPLE show_users NULL ref roomnumber roomnumber 4 const 6 100.00 NULL more'
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].type).toBe('ref');
  });

  it('inserts NULL partitions when OCR skips (Null) before type', () => {
    const ocr = '1 SIMPLE show_users ref roomnumber roomnumber 4 const 6 100.00 NULL';
    const r = ExplainPro.analyzeFromOcr(ocr);
    expect(r.error).toBeNull();
    expect(r.rows[0].partitions).toBe('NULL');
    expect(r.rows[0].type).toBe('ref');
    expect(r.rows[0].filtered).toBe('100.00');
    expect(r.rows[0].extra).toBe('NULL');
  });

  it('appends NULL Extra when OCR drops trailing (Null)', () => {
    const ocr = '1 SIMPLE show_users NULL ref roomnumber roomnumber 4 const 6 100.00';
    const r = ExplainPro.analyzeFromOcr(ocr);
    expect(r.error).toBeNull();
    expect(r.rows[0].filtered).toBe('100.00');
    expect(r.rows[0].extra).toBe('NULL');
  });
});
