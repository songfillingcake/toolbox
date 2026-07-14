import { describe, expect, it } from 'vitest';
import { loadBrowserScript } from './load-browser-script.mjs';

const TextDiff = loadBrowserScript(
  'src/main/resources/static/js/text-diff.js',
  '__TextDiff'
);

describe('TextDiff', () => {
  it('detects added and removed lines', () => {
    const { rows, error } = TextDiff.diffLines('a\nb', 'a\nc');
    expect(error).toBeNull();
    expect(rows.some(r => r.type === 'removed' && r.text === 'b')).toBe(true);
    expect(rows.some(r => r.type === 'added' && r.text === 'c')).toBe(true);
  });

  it('reports identical text', () => {
    const { rows } = TextDiff.diffLines('same', 'same');
    const s = TextDiff.stats(rows);
    expect(s.added).toBe(0);
    expect(s.removed).toBe(0);
  });

  it('rejects oversized input', () => {
    TextDiff.setMaxLines(3);
    const left = '1\n2\n3\n4';
    const { error } = TextDiff.diffLines(left, '1');
    expect(error).toContain('行数超限');
    TextDiff.setMaxLines(1500);
  });
});
