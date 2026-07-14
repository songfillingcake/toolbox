import { describe, expect, it } from 'vitest';
import { loadBrowserScript } from './load-browser-script.mjs';

const MyBatisSql = loadBrowserScript(
  'src/main/resources/static/js/mybatis-sql.js',
  '__MyBatisSql'
);

describe('MyBatisSql', () => {
  it('converts standard log block', () => {
    const log = `==>  Preparing: SELECT id FROM user WHERE id = ?
==> Parameters: 1001(Long)`;
    const r = MyBatisSql.convertAll(log);
    expect(r.error).toBeNull();
    expect(r.sqls[0]).toBe('SELECT id FROM user WHERE id = 1001');
  });

  it('returns error for empty input', () => {
    const r = MyBatisSql.convertAll('  ');
    expect(r.error).toBe('请输入 MyBatis 日志');
  });
});
