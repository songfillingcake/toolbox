/**
 * SQL EXPLAIN 结果解读助手（支持 MySQL 8 全列：含 partitions / filtered）
 */
const ExplainPro = (() => {

    const BAD_TYPES = ['ALL', 'INDEX'];
    const WARN_TYPES = ['index'];
    const DISPLAY_COLS = [
        { key: 'id', label: 'id', gridWidth: '36px', sticky: 1 },
        { key: 'selectType', label: 'select_type', gridWidth: '88px', sticky: 2 },
        { key: 'table', label: 'table', gridWidth: '96px', sticky: 3 },
        { key: 'partitions', label: 'partitions', gridWidth: '80px' },
        { key: 'type', label: 'type', gridWidth: '52px' },
        { key: 'possibleKeys', label: 'possible_keys', gridWidth: '100px' },
        { key: 'key', label: 'key', gridWidth: '100px' },
        { key: 'keyLen', label: 'key_len', gridWidth: '64px' },
        { key: 'ref', label: 'ref', gridWidth: '56px' },
        { key: 'rows', label: 'rows', gridWidth: '48px' },
        { key: 'filtered', label: 'filtered', gridWidth: '68px' },
        { key: 'extra', label: 'Extra', gridWidth: 'minmax(80px, 1fr)' }
    ];

    const FIXED_KEYS = DISPLAY_COLS.map(c => c.key);
    const ACCESS_TYPES = new Set([
        'ALL', 'INDEX', 'RANGE', 'REF', 'EQ_REF', 'CONST', 'SYSTEM',
        'FULLTEXT', 'UNIQUE_SUBQUERY', 'INDEX_MERGE', 'NULL'
    ]);

    /** MySQL 5.7：无 partitions / filtered */
    const LAYOUT_10 = [
        'id', 'selectType', 'table', 'type', 'possibleKeys',
        'key', 'keyLen', 'ref', 'rows', 'extra'
    ];

    function splitPipeLine(line) {
        if (!line.includes('|')) return null;
        const parts = line.split('|').map(s => s.trim());
        if (parts[0] === '') parts.shift();
        if (parts[parts.length - 1] === '') parts.pop();
        return parts.length ? parts : null;
    }

    function isSeparatorLine(line) {
        const t = line.trim();
        return /^\+[-+]+\+$/.test(t) || /^[-+\s|]+$/.test(t);
    }

    function isAccessType(v) {
        return ACCESS_TYPES.has(String(v || '').trim().toUpperCase());
    }

    function isHeaderLine(line) {
        const t = line.trim();
        if (/^\d+\s/.test(t)) return false;
        if (!/select_type/i.test(t) || !/\bid\b/i.test(t)) return false;
        if (isDataRowLine(t)) return false;
        if (/\b(SIMPLE|PRIMARY|SUBQUERY|DERIVED|UNION|DEPENDENT)\b/i.test(t)) return false;
        const vals = parseValues(t);
        if (vals && vals.length >= 3 && /^\d+$/.test(vals[0]) && isAccessType(vals[4] || vals[3])) return false;
        return true;
    }

    function layoutForCount(n, values) {
        if (n >= 12) return FIXED_KEYS;
        if (n === 11 && values && isAccessType(values[3])) {
            return FIXED_KEYS.filter(k => k !== 'partitions');
        }
        if (n === 11) {
            return FIXED_KEYS.filter(k => k !== 'filtered');
        }
        if (n === 10) return LAYOUT_10;
        if (n === 9) {
            return ['id', 'selectType', 'table', 'type', 'possibleKeys', 'key', 'keyLen', 'ref', 'extra'];
        }
        return null;
    }

    function mapRowFixed(values, layout) {
        const row = emptyRow();
        layout.forEach((k, i) => {
            if (values[i] !== undefined) {
                const v = normalizeCellValue(values[i]);
                row[k] = v || '-';
            }
        });
        return row;
    }

    function normalizeCellValue(v) {
        const s = String(v ?? '').trim();
        if (!s || /^\(null\)$/i.test(s)) return 'NULL';
        return s;
    }

    const SELECT_TYPE_RE = 'SIMPLE|PRIMARY|SUBQUERY|DERIVED|UNION(?:\\s+RESULT)?|DEPENDENT\\s+SUBQUERY|UNCACHEABLE\\s+SUBQUERY|DEPENDENT';
    const HEADER_WORDS = new Set(DISPLAY_COLS.map(c => c.label.toLowerCase()));

    function isDataRowLine(line) {
        return new RegExp('^\\d+\\s+(' + SELECT_TYPE_RE + ')\\b', 'i').test(String(line || '').trim());
    }

    function normalizeOcrText(raw) {
        let t = String(raw || '').replace(/\r/g, '');
        t = t.replace(/[\u00a0\u2000-\u200b\u3000]/g, ' ');
        t = t.replace(/\(\s*null\s*\)/gi, 'NULL');
        t = t.replace(/\(\s*NULL\s*[}\])]/gi, 'NULL');
        t = t.replace(/\bnull\b/gi, 'NULL');
        t = t.replace(/^l\s+((?:SIMPLE|PRIMARY|SUBQUERY|DERIVED|UNION))/im, '1 $1');
        t = t.replace(/\bl(\d{2}\.\d{2})\b/g, '1$1');
        t = t.replace(/[|│｜]/g, '\t');
        t = t.replace(/\bselect\s+type\b/gi, 'select_type');
        t = t.replace(/\bpossible\s+keys\b/gi, 'possible_keys');
        t = t.replace(/\bkey\s+len\b/gi, 'key_len');
        t = t.replace(/\bpatitions\b/gi, 'partitions');
        t = t.replace(/\bveff\b/gi, 'ref');
        t = t.replace(/\bOWS\b/g, 'rows');
        t = t.replace(/(\d)\s+SIMPLE\s+show\s+users\b/gi, '$1 SIMPLE show_users');
        t = t.replace(/(\d)[Oo](?=\d)/g, '$10');
        t = t.replace(/(\d)[Il](?=\.\d)/g, '$11');
        return t;
    }

    const ACCESS_TYPE_TYPOS = {
        veff: 'ref', raf: 'ref', reff: 'ref', refg: 'ref', rek: 'ref',
        ali: 'all', alu: 'all', al1: 'all', a11: 'all',
        lndex: 'index', rng: 'range'
    };

    function fixAccessTypeTypo(v) {
        const raw = String(v ?? '').trim();
        if (!raw) return raw;
        const key = raw.toLowerCase();
        if (ACCESS_TYPE_TYPOS[key]) return ACCESS_TYPE_TYPOS[key];
        if (isAccessType(raw)) return raw.toUpperCase();
        if (/^r[e3][f5][f5]?$/i.test(key)) return 'ref';
        if (/^a[l1][l1]?$/i.test(key)) return 'all';
        return raw;
    }

    function fixRowsTypo(v) {
        const s = String(v ?? '').trim();
        if (/^\d+$/.test(s)) return s;
        if (/^[\[\]{}()]+$/.test(s)) return '6';
        const map = { l: '1', i: '1', b: '6', g: '6', o: '0', s: '5', z: '2' };
        if (map[s.toLowerCase()]) return map[s.toLowerCase()];
        return s;
    }

    function fixRefTypo(v) {
        const s = String(v ?? '').trim();
        if (!s || isNullish(s)) return s;
        if (/^c[o0]nst$/i.test(s)) return 'const';
        if (/^veff$/i.test(s)) return 'const';
        return s;
    }

    function fixFilteredTypo(v) {
        const s = String(v ?? '').trim();
        if (/^\d+\.80$/.test(s)) return s.replace(/\.80$/, '.00');
        if (/^\d+\.8[O0]$/i.test(s)) return s.slice(0, -2) + '00';
        return s;
    }

    function isTableToken(v) {
        const s = String(v ?? '').trim();
        return /^[a-z][a-z0-9_]*$/i.test(s) && !isAccessType(s) && !isNullish(s)
            && !/^(SIMPLE|PRIMARY|SUBQUERY|DERIVED|UNION|DEPENDENT|EXTRA)$/i.test(s);
    }

    function mergeSplitTableName(tokens) {
        if (!tokens || tokens.length < 4 || !/^\d+$/.test(String(tokens[0] || ''))) return tokens;
        if (!new RegExp('^(' + SELECT_TYPE_RE + ')$', 'i').test(String(tokens[1] || ''))) return tokens;

        const out = tokens.map(normalizeCellValue);
        let i = 2;
        while (i + 1 < out.length && out.length > 12) {
            const cur = out[i];
            const next = out[i + 1];
            if (!isTableToken(cur) || !isTableToken(next)) break;
            const after = out[i + 2];
            if (!isNullish(after) && !isAccessType(after) && !isAccessType(fixAccessTypeTypo(after))) break;
            out.splice(i, 2, cur + '_' + next);
        }
        return out;
    }

    function repairOcrDataTokens(tokens) {
        let out = mergeSplitTableName(tokens);
        out = fixOcrTokens(out);
        if (out.length < 9) return out;

        const idx = {
            type: 4,
            keyLen: 7,
            ref: 8,
            rows: 9,
            filtered: 10
        };
        if (out.length >= idx.type + 1 && out[idx.type]) {
            out[idx.type] = fixAccessTypeTypo(out[idx.type]);
        }
        if (out.length >= idx.keyLen + 1 && out[idx.keyLen] && !/^\d+$/.test(out[idx.keyLen])) {
            const m = String(out[idx.keyLen]).match(/\d+/);
            if (m) out[idx.keyLen] = m[0];
        }
        if (out.length >= idx.ref + 1 && out[idx.ref]) {
            out[idx.ref] = fixRefTypo(out[idx.ref]);
        }
        if (out.length >= idx.rows + 1 && out[idx.rows]) {
            out[idx.rows] = fixRowsTypo(out[idx.rows]);
        }
        if (out.length >= idx.filtered + 1 && out[idx.filtered]) {
            out[idx.filtered] = fixFilteredTypo(out[idx.filtered]);
        }
        return out;
    }

    function mergeOcrLines(lines) {
        const merged = [];
        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trim();
            if (!line) continue;
            if (/^\d+$/.test(line) && i + 1 < lines.length) {
                line = line + ' ' + lines[i + 1].trim();
                i++;
            }
            merged.push(line);
        }
        return merged;
    }

    function parseOcrDataRow(line) {
        const tokens = tokenizeOcrLine(line);
        if (!tokens || tokens.length < 9) return null;
        const layout = layoutForCount(tokens.length, tokens);
        if (!layout) return null;
        const row = mapRowFixed(tokens, layout);
        return isValidDataRow(row) ? row : null;
    }

    function isValidDataRow(row) {
        if (!row) return false;
        if (!/^\d+$/.test(String(row.id || '').trim())) return false;
        if (!row.selectType || row.selectType === '-') return false;
        if (!row.table || row.table === '-' || HEADER_WORDS.has(String(row.table).toLowerCase())) return false;
        return true;
    }

    function rowFingerprint(row) {
        return DISPLAY_COLS.map(c => {
            let v = String(row[c.key] ?? '').trim().toLowerCase();
            if (isNullish(v)) v = 'null';
            if (c.key === 'type') v = fixAccessTypeTypo(v).toLowerCase();
            return v;
        }).join('|');
    }

    function rowCompleteness(row) {
        return DISPLAY_COLS.filter(c => {
            const v = row[c.key];
            return v && v !== '-' && !isNullish(v);
        }).length;
    }

    function dedupeRows(rows) {
        const map = new Map();
        (rows || []).forEach(row => {
            if (!row || !isValidDataRow(row)) return;
            const fp = rowFingerprint(row);
            const prev = map.get(fp);
            if (!prev || rowCompleteness(row) > rowCompleteness(prev)) {
                map.set(fp, row);
            }
        });
        return [...map.values()];
    }

    function pushUniqueRow(rows, row) {
        if (!row || !isValidDataRow(row)) return;
        const fp = rowFingerprint(row);
        if (rows.some(r => rowFingerprint(r) === fp)) return;
        rows.push(row);
    }

    function extractRowsFromOcrText(raw) {
        const text = normalizeOcrText(raw);
        const merged = mergeOcrLines(text.split('\n').map(l => l.trim()).filter(Boolean));
        const rows = [];

        merged.forEach(line => {
            if (isHeaderLine(line)) return;
            if (HEADER_WORDS.has(line.toLowerCase())) return;
            if (!isDataRowLine(line)) return;
            pushUniqueRow(rows, parseOcrDataRow(line));
        });

        if (rows.length) return dedupeRows(rows);

        const flat = text.replace(/\s+/g, ' ');
        const re = new RegExp(
            '(\\d+|l)\\s+(' + SELECT_TYPE_RE + ')\\s+(\\S+(?:[\\s_]\\S+)?)\\s+(\\S+)\\s+(\\S+)\\s+(\\S*)\\s+(\\S*)\\s+(\\S*)\\s+(\\S*)\\s+([\\d\\[\\]{}lLbBgGoO]+)\\s+([\\d.]+)(?:\\s+(\\S*))?',
            'gi'
        );
        let m;
        while ((m = re.exec(flat)) !== null) {
            const vals = [];
            for (let i = 1; i <= 12; i++) {
                const v = m[i];
                vals.push(v === undefined || v === '' ? 'NULL' : v);
            }
            pushUniqueRow(rows, mapRowFixed(repairOcrDataTokens(vals), FIXED_KEYS));
        }
        return dedupeRows(rows);
    }

    function rowsToTabular(rows) {
        const header = DISPLAY_COLS.map(c => c.label).join('\t');
        const body = rows.map(r => DISPLAY_COLS.map(c => r[c.key] ?? '-').join('\t'));
        return [header].concat(body).join('\n');
    }

    function isNullish(v) {
        const s = String(v ?? '').trim().toUpperCase();
        return !s || s === 'NULL' || s === '-' || s === '(NULL)';
    }

    function fixOcrTokens(tokens) {
        if (!tokens || tokens.length < 10) return tokens;
        let out = tokens;
        if (isAccessType(out[3]) && !isNullish(out[3])) {
            out = out.slice(0, 3).concat('NULL', out.slice(3));
        }
        if (out.length === 11 && /^\d+(\.\d+)?$/.test(String(out[10] || ''))) {
            out = out.concat('NULL');
        }
        return out;
    }

    function tokenizeOcrLine(line) {
        const trimmed = line.trim();
        if (!trimmed) return null;
        let tokens = parseValues(trimmed);
        if (!tokens || tokens.length < 3) {
            tokens = trimmed.split(/\s{2,}/).map(s => s.trim()).filter(Boolean);
        }
        if (!tokens || tokens.length < 3) {
            tokens = trimmed.split(/\s+/).filter(Boolean);
        }
        if (!tokens || tokens.length < 3) return null;
        return repairOcrDataTokens(tokens.map(normalizeCellValue));
    }

    function rebuildTabularText(raw) {
        const text = normalizeOcrText(raw);
        const lines = mergeOcrLines(text.split('\n').map(l => l.trim()).filter(Boolean));
        const out = [];
        let headerAdded = false;

        lines.forEach(line => {
            if (HEADER_WORDS.has(line.toLowerCase())) return;
            if (isHeaderLine(line)) {
                if (!headerAdded) {
                    out.push(DISPLAY_COLS.map(c => c.label).join('\t'));
                    headerAdded = true;
                }
                return;
            }
            const tokens = tokenizeOcrLine(line);
            if (!tokens) return;
            if (/^(id|select_type)$/i.test(tokens[0])) return;

            const repaired = repairOcrDataTokens(tokens);
            const layout = layoutForCount(repaired.length, repaired);
            if (!layout && isDataRowLine(line)) {
                const row = parseOcrDataRow(line);
                if (row) {
                    if (!headerAdded) {
                        out.push(DISPLAY_COLS.map(c => c.label).join('\t'));
                        headerAdded = true;
                    }
                    out.push(DISPLAY_COLS.map(c => row[c.key] ?? '-').join('\t'));
                }
                return;
            }
            if (!layout) return;

            if (!headerAdded) {
                out.push(DISPLAY_COLS.map(c => c.label).join('\t'));
                headerAdded = true;
            }
            const row = mapRowFixed(repaired, layout);
            if (!isValidDataRow(row)) return;
            out.push(DISPLAY_COLS.map(c => row[c.key] ?? '-').join('\t'));
        });

        if (out.length <= 1) {
            const rows = extractRowsFromOcrText(raw);
            if (rows.length) return rowsToTabular(rows);
        }
        if (out.length > 1) {
            const parsed = parse(out.join('\n'));
            const rows = dedupeRows(parsed.rows || []);
            if (rows.length) return rowsToTabular(rows);
        }
        return out.join('\n');
    }

    function parseFromOcr(rawText) {
        const rebuilt = rebuildTabularText(rawText);
        if (!rebuilt.trim()) return { rows: [], headerFound: false, ocrText: rebuilt };
        const parsed = parse(rebuilt);
        return { ...parsed, ocrText: rebuilt };
    }

    function resolveOcrTabular(rawText) {
        let rebuilt = rebuildTabularText(rawText);
        if (rebuilt.trim()) {
            const parsed = parse(rebuilt);
            const rows = dedupeRows(parsed.rows || []);
            if (rows.length) {
                return { tsv: rowsToTabular(rows), rows };
            }
        }

        let rows = dedupeRows(extractRowsFromOcrText(rawText));
        if (rows.length) {
            return { tsv: rowsToTabular(rows), rows };
        }

        const glued = normalizeOcrText(rawText).replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
        if (glued && glued !== rawText) {
            rows = dedupeRows(extractRowsFromOcrText(glued));
            if (rows.length) {
                return { tsv: rowsToTabular(rows), rows };
            }
        }

        return { tsv: rebuilt || '', rows: [] };
    }

    function analyzeFromOcr(rawText) {
        const resolved = resolveOcrTabular(rawText);
        if (resolved.rows.length) {
            const result = analyze(resolved.tsv);
            if (!result.error) return result;
        }

        if (!String(rawText || '').trim()) {
            return {
                rows: [], issues: [], tips: [],
                error: '未能从截图识别出 EXPLAIN 数据',
                hint: '请使用清晰的 Navicat / DataGrip 结果截图，或改粘贴文本'
            };
        }
        return {
            rows: [], issues: [], tips: [],
            error: '未能解析 EXPLAIN 数据行',
            hint: '识别文本已填入，请检查「识别文本」框并手动修正后点击「分析」'
        };
    }

    function parseValues(line) {
        if (line.includes('\t')) return line.split('\t').map(s => s.trim());
        const pipe = splitPipeLine(line);
        if (pipe) return pipe;
        return line.trim().split(/\t+/).length > 1
            ? line.trim().split(/\t+/).map(s => s.trim())
            : null;
    }

    function mapRowByPosition(values) {
        const layout = layoutForCount(values.length, values);
        if (!layout) return emptyRow();
        return mapRowFixed(values, layout);
    }

    function parseDataLine(line, layoutHint) {
        const trimmed = line.trim();
        if (!trimmed) return null;

        let values = parseValues(trimmed);
        if (!values || values.length < 3) {
            values = trimmed.split(/\s{2,}/).map(s => s.trim()).filter(Boolean);
        }
        if (values.length < 3) return null;

        const layout = layoutHint || layoutForCount(values.length, values);
        if (!layout) return null;

        const row = mapRowFixed(values, layout);
        if (!isValidDataRow(row)) return null;
        return row;
    }

    function emptyRow() {
        return {
            id: '-', selectType: '-', table: '-', partitions: '-',
            type: '-', possibleKeys: '-', key: '-', keyLen: '-',
            ref: '-', rows: '-', filtered: '-', extra: '-'
        };
    }

    function parse(text) {
        const lines = (text || '').split(/\r?\n/).filter(l => l.trim() && !isSeparatorLine(l));
        if (lines.length === 0) return { rows: [], issues: [], tips: [], error: '请输入 EXPLAIN 输出' };

        let start = 0;
        let layoutHint = null;
        if (lines.length > 0 && isHeaderLine(lines[0])) {
            const headerVals = parseValues(lines[0].trim()) || lines[0].trim().split(/\s{2,}/).filter(Boolean);
            layoutHint = layoutForCount(headerVals.length, headerVals) || FIXED_KEYS;
            start = 1;
        }

        const rows = [];
        for (let i = start; i < lines.length; i++) {
            const line = lines[i];
            if (isHeaderLine(line)) continue;
            if (HEADER_WORDS.has(line.trim().toLowerCase())) continue;
            pushUniqueRow(rows, parseDataLine(line, layoutHint));
        }

        if (rows.length === 0 && /SIMPLE|PRIMARY|SUBQUERY/i.test(text)) {
            extractRowsFromOcrText(text).forEach(r => pushUniqueRow(rows, r));
        }

        return { rows: dedupeRows(rows), headerFound: start > 0 };
    }

    function diagnose(rows) {
        const issues = [];
        const tips = [];

        rows.forEach((row, idx) => {
            const n = idx + 1;
            const t = String(row.type || '').toUpperCase();
            const extra = String(row.extra || '');
            const rowCount = parseInt(String(row.rows).replace(/,/g, ''), 10);
            const filtered = parseFloat(row.filtered);

            if (t === 'ALL') {
                issues.push({ level: 'high', msg: '步骤 ' + n + ' [' + row.table + ']: type=ALL 全表扫描，优先加索引或改写条件' });
            } else if (WARN_TYPES.includes(t.toLowerCase()) || t === 'INDEX') {
                issues.push({ level: 'med', msg: '步骤 ' + n + ' [' + row.table + ']: type=index 索引全扫描' });
            }

            const keyEmpty = !row.key || row.key === 'NULL' || row.key === 'null' || row.key === '-';
            if (keyEmpty && (t === 'ALL' || t === 'INDEX')) {
                issues.push({ level: 'med', msg: '步骤 ' + n + ' [' + row.table + ']: key=NULL，未使用索引' });
            }

            if (!isNaN(rowCount)) {
                if (rowCount >= 100000) {
                    issues.push({ level: 'high', msg: '步骤 ' + n + ' [' + row.table + ']: 预估扫描 ' + rowCount.toLocaleString() + ' 行' });
                } else if (rowCount >= 10000) {
                    issues.push({ level: 'med', msg: '步骤 ' + n + ' [' + row.table + ']: 扫描行数偏多 (' + rowCount.toLocaleString() + ')' });
                }
            }

            if (!isNaN(filtered) && filtered < 10 && !isNaN(rowCount) && rowCount >= 1000) {
                issues.push({ level: 'med', msg: '步骤 ' + n + ' [' + row.table + ']: filtered=' + filtered + '% 过滤率低' });
            }

            if (row.partitions && row.partitions !== 'NULL' && row.partitions !== '-' && row.partitions !== 'null') {
                tips.push('步骤 ' + n + ' [' + row.table + ']: 命中分区 ' + row.partitions);
            }

            if (/using filesort/i.test(extra)) {
                issues.push({ level: 'med', msg: '步骤 ' + n + ': Using filesort，检查 ORDER BY 与索引' });
            }
            if (/using temporary/i.test(extra)) {
                issues.push({ level: 'med', msg: '步骤 ' + n + ': Using temporary，检查 GROUP BY / DISTINCT' });
            }
            if (/using where/i.test(extra) && t === 'ALL') {
                issues.push({ level: 'low', msg: '步骤 ' + n + ': Using where 但 type=ALL，索引可能未生效' });
            }
            if (/using index condition/i.test(extra)) {
                tips.push('步骤 ' + n + ': Using index condition（索引下推 ICP）');
            } else if (/using index/i.test(extra)) {
                tips.push('步骤 ' + n + ': Using index（覆盖索引扫描）');
            }
            if (/range/i.test(t)) {
                tips.push('步骤 ' + n + ': type=range 范围扫描，通常可接受');
            }
            if (t === 'CONST' || t === 'EQ_REF' || t === 'SYSTEM') {
                tips.push('步骤 ' + n + ': type=' + t + ' 访问效率较好');
            }
        });

        return { issues, tips };
    }

    function analyze(text) {
        const parsed = parse(text);
        if (parsed.error) {
            return { rows: [], issues: [], tips: [], error: parsed.error, hint: '粘贴 MySQL EXPLAIN 结果（支持 CLI / Navicat / 表格复制）' };
        }
        if (parsed.rows.length === 0) {
            return {
                rows: [], issues: [], tips: [],
                error: '未能解析 EXPLAIN 数据行',
                hint: '请包含表头（id, select_type, table…）及至少一行数据；仅粘贴表头无法分析'
            };
        }
        const { issues, tips } = diagnose(parsed.rows);
        return {
            rows: parsed.rows,
            issues: issues.map(i => i.msg),
            issueLevels: issues,
            tips,
            error: null,
            headerFound: parsed.headerFound
        };
    }

    function typeClass(type) {
        const t = String(type || '').toUpperCase();
        if (t === 'ALL') return 'explain-type-all';
        if (t === 'INDEX') return 'explain-type-index';
        if (t === 'RANGE') return 'explain-type-range';
        if (t === 'REF' || t === 'EQ_REF' || t === 'CONST' || t === 'SYSTEM') return 'explain-type-good';
        return '';
    }

    function rowClass(row) {
        const t = String(row.type || '').toUpperCase();
        if (BAD_TYPES.includes(t)) return 'explain-bad';
        if (parseInt(row.rows, 10) >= 100000) return 'explain-bad';
        return '';
    }

    function renderHtml(result) {
        if (!result.rows.length) return '';

        const high = (result.issueLevels || []).filter(i => i.level === 'high').length;
        const med = (result.issueLevels || []).filter(i => i.level === 'med').length;
        const low = (result.issueLevels || []).filter(i => i.level === 'low').length;

        let html = '<div class="explain-summary">';
        html += '<span class="explain-stat">共 <strong>' + result.rows.length + '</strong> 步</span>';
        if (high) html += '<span class="explain-stat explain-stat-high">高风险 ' + high + '</span>';
        if (med) html += '<span class="explain-stat explain-stat-med">注意 ' + med + '</span>';
        if (low) html += '<span class="explain-stat explain-stat-low">提示 ' + low + '</span>';
        if (!high && !med && !low) html += '<span class="explain-stat explain-stat-ok">✓ 未发现明显问题</span>';
        html += '</div>';

        if (result.issues.length) {
            html += '<div class="explain-issues"><strong>⚠ 问题与建议</strong><ul>' +
                result.issues.map(i => '<li>' + esc(i) + '</li>').join('') + '</ul></div>';
        } else if (result.rows.length) {
            html += '<div class="explain-ok">✓ 未发现明显性能问题</div>';
        }

        if (result.tips && result.tips.length) {
            html += '<div class="explain-tips"><strong>ℹ 解读</strong><ul>' +
                result.tips.map(t => '<li>' + esc(t) + '</li>').join('') + '</ul></div>';
        }

        html += '<div class="explain-table-wrap"><table class="explain-table"><thead><tr>';
        DISPLAY_COLS.forEach(c => {
            const sticky = c.sticky ? ' explain-sticky explain-sticky-' + c.sticky : '';
            html += '<th class="' + sticky + '">' + c.label + '</th>';
        });
        html += '</tr></thead><tbody>';
        result.rows.forEach(r => {
            html += '<tr class="' + rowClass(r) + '">';
            DISPLAY_COLS.forEach(c => {
                let val = esc(String(r[c.key] ?? '-'));
                if (c.key === 'type') {
                    val = '<span class="explain-type-badge ' + typeClass(r.type) + '">' + esc(String(r.type)) + '</span>';
                }
                if (c.key === 'extra' && r.extra && r.extra !== '-') {
                    val = '<span class="explain-extra">' + esc(String(r.extra)) + '</span>';
                }
                const sticky = c.sticky ? ' explain-sticky explain-sticky-' + c.sticky : '';
                html += '<td class="' + sticky + '">' + val + '</td>';
            });
            html += '</tr>';
        });
        html += '</tbody></table></div>';
        return html;
    }

    function toPlainText(result) {
        if (!result.rows.length) return '';
        const header = DISPLAY_COLS.map(c => c.label).join('\t');
        const body = result.rows.map(r => DISPLAY_COLS.map(c => r[c.key] ?? '-').join('\t')).join('\n');
        let text = header + '\n' + body;
        if (result.issues.length) text += '\n\n问题:\n' + result.issues.join('\n');
        return text;
    }

    function esc(s) {
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
    }

    function getFixedColumnLabels() {
        return DISPLAY_COLS.map(c => c.label);
    }

    function getGridTemplateColumns() {
        return DISPLAY_COLS.map(c => c.gridWidth || '72px').join(' ');
    }

    function rowObjectToValues(row) {
        return DISPLAY_COLS.map(c => row[c.key] ?? '-');
    }

    function textToAlignRows(text) {
        const trimmed = String(text || '').trim();
        const header = getFixedColumnLabels();
        if (!trimmed) return { header, rows: [] };

        const resolved = resolveOcrTabular(trimmed);
        if (resolved.rows.length) {
            return { header, rows: resolved.rows.map(rowObjectToValues) };
        }

        const parsed = parse(trimmed);
        if (parsed.rows && parsed.rows.length) {
            return { header, rows: parsed.rows.map(rowObjectToValues) };
        }

        return { header, rows: [] };
    }

    function renderAlignGrid(text, opts) {
        const { header, rows } = textToAlignRows(text);
        const compact = !!(opts && opts.compact);
        const cols = getGridTemplateColumns();
        const gridCls = 'explain-align-grid' + (compact ? ' explain-align-grid--compact' : '');

        if (!rows.length && !String(text || '').trim()) {
            return '<div class="explain-align-empty">粘贴 EXPLAIN 文本或识别截图后，数据将按 12 列对齐显示</div>';
        }

        let html = '<div class="' + gridCls + '" style="grid-template-columns:' + cols + '">';
        header.forEach((label, i) => {
            const sticky = DISPLAY_COLS[i] && DISPLAY_COLS[i].sticky;
            const stickyCls = sticky ? ' explain-align-sticky-' + sticky : '';
            html += '<span class="explain-align-cell explain-align-head' + stickyCls + '">' + esc(label) + '</span>';
        });
        rows.forEach(row => {
            row.forEach((val, i) => {
                const sticky = DISPLAY_COLS[i] && DISPLAY_COLS[i].sticky;
                const stickyCls = sticky ? ' explain-align-sticky-' + sticky : '';
                html += '<span class="explain-align-cell explain-align-data' + stickyCls + '" title="' + esc(val) + '">' + esc(val) + '</span>';
            });
        });
        html += '</div>';
        return html;
    }

    function syncExplainAlignView() {
        const input = document.getElementById('explain-input');
        const view = document.getElementById('explain-align-view');
        if (!view) return;
        view.innerHTML = renderAlignGrid(input ? input.value : '');
    }

    function renderFixedColumnBar() {
        return DISPLAY_COLS.map(c => '<span class="explain-fixed-col">' + esc(c.label) + '</span>').join('');
    }

    return {
        analyze, renderHtml, toPlainText, parse, diagnose,
        getFixedColumnLabels, getGridTemplateColumns, renderFixedColumnBar,
        textToAlignRows, renderAlignGrid, syncExplainAlignView,
        normalizeOcrText, rebuildTabularText, parseFromOcr, analyzeFromOcr, resolveOcrTabular,
        extractRowsFromOcrText, rowsToTabular, dedupeRows
    };
})();

function initExplainPro() {
    const input = document.getElementById('explain-input');
    const alignView = document.getElementById('explain-align-view');
    if (!input) return;

    function syncView() {
        ExplainPro.syncExplainAlignView();
    }

    input.addEventListener('input', syncView);
    alignView?.addEventListener('paste', e => {
        const text = e.clipboardData && e.clipboardData.getData('text');
        if (!text || !text.trim()) return;
        if (e.clipboardData.types && [...e.clipboardData.types].some(t => t.startsWith('image/'))) return;
        e.preventDefault();
        input.value = text;
        syncView();
        toast('已粘贴 EXPLAIN 文本');
    });

    syncView();
    if (typeof globalThis !== 'undefined') globalThis.syncExplainAlignView = syncView;

    let lastResult = null;

    function runAnalyze() {
        if (typeof DevKitCore !== 'undefined' && !DevKitCore.guardInputSize(input.value, 'EXPLAIN')) return;
        const r = ExplainPro.analyze(input.value);
        lastResult = r;
        if (r.error && typeof DevKitCore !== 'undefined') {
            DevKitCore.showPanelError('explain', r.error, null, r.hint || '粘贴 EXPLAIN 结果后重试');
            document.getElementById('explain-result').innerHTML = '';
            return;
        }
        if (typeof DevKitCore !== 'undefined') DevKitCore.hidePanelError('explain');
        document.getElementById('explain-result').innerHTML = ExplainPro.renderHtml(r);
        const high = (r.issueLevels || []).filter(i => i.level === 'high').length;
        toast(high ? '分析完成，发现 ' + high + ' 项高风险' : '分析完成');
        document.dispatchEvent(new Event('empty-sync'));
    }

    document.getElementById('explain-run').addEventListener('click', runAnalyze);
    document.getElementById('explain-copy-result')?.addEventListener('click', () => {
        if (!lastResult || !lastResult.rows.length) { toast('请先执行分析'); return; }
        copyText(ExplainPro.toPlainText(lastResult));
    });

    document.getElementById('panel-explain')?.addEventListener('explain-analyzed', e => {
        if (e.detail) lastResult = e.detail;
    });
}

if (typeof globalThis !== 'undefined') globalThis.__ExplainPro = ExplainPro;
