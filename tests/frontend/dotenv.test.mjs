import { describe, expect, it } from 'vitest';
import { loadBrowserScript } from './load-browser-script.mjs';

const DotenvPro = loadBrowserScript(
  'src/main/resources/static/js/dotenv-pro.js',
  '__DotenvPro'
);

describe('DotenvPro', () => {
  it('parses basic env and strips inline comment', () => {
    const r = DotenvPro.parseInput('DB_HOST=127.0.0.1 # local\nDB_PASSWORD=secret', 'dotenv');
    expect(r.errors).toHaveLength(0);
    expect(r.entries[0].value).toBe('127.0.0.1');
    expect(r.entries[1].value).toBe('secret');
  });

  it('converts properties to dotenv', () => {
    const r = DotenvPro.parseInput('APP_NAME=devkit\nPORT=8088', 'properties');
    const out = DotenvPro.formatOutput(r.entries, 'dotenv');
    expect(out).toContain('APP_NAME=devkit');
  });

  it('masks sensitive keys only', () => {
    const entries = [
      { key: 'DB_USER', value: 'root', line: 1 },
      { key: 'API_KEY', value: 'abc', line: 2 }
    ];
    const masked = DotenvPro.maskSecrets(entries);
    expect(masked[0].value).toBe('root');
    expect(masked[1].value).toBe('******');
  });
});
