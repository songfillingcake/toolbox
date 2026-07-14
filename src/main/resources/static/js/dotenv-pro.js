/**
 * .env 环境变量解析与互转（双向）
 */
const DotenvPro = (() => {

    const KEY_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;
    const SENSITIVE_RE = /password|passwd|secret|token|credential|api[_-]?key|private[_-]?key/i;

    function stripInlineComment(val) {
        let inSingle = false;
        let inDouble = false;
        for (let k = 0; k < val.length; k++) {
            const c = val[k];
            if (c === "'" && !inDouble) inSingle = !inSingle;
            else if (c === '"' && !inSingle) inDouble = !inDouble;
            else if (c === '#' && !inSingle && !inDouble && (k === 0 || /\s/.test(val[k - 1]))) {
                return val.substring(0, k).trim();
            }
        }
        return val;
    }

    function parseDotenv(text) {
        const entries = [];
        const errors = [];
        const rawLines = (text || '').split(/\r?\n/);
        let i = 0;
        while (i < rawLines.length) {
            const lineNo = i + 1;
            let line = rawLines[i].trim();
            i++;
            if (!line || line.startsWith('#')) continue;
            if (line.startsWith('export ')) line = line.substring(7).trim();
            const eq = line.indexOf('=');
            if (eq <= 0) {
                errors.push('第 ' + lineNo + ' 行：缺少 KEY=VALUE');
                continue;
            }
            const key = line.substring(0, eq).trim();
            let valPart = line.substring(eq + 1);
            let value;
            const trimmedVal = valPart.trim();
            if (trimmedVal.startsWith('"')) {
                let sb = '';
                let j = 1;
                let closed = false;
                while (j < trimmedVal.length) {
                    const c = trimmedVal[j];
                    if (c === '\\' && j + 1 < trimmedVal.length) {
                        const next = trimmedVal[j + 1];
                        if (next === 'n') { sb += '\n'; j += 2; }
                        else if (next === 't') { sb += '\t'; j += 2; }
                        else { sb += next; j += 2; }
                    } else if (c === '"') { closed = true; j++; break; }
                    else { sb += c; j++; }
                }
                if (!closed) {
                    while (i < rawLines.length) {
                        sb += '\n' + rawLines[i];
                        i++;
                        if (rawLines[i - 1].trim().endsWith('"')) {
                            const tail = rawLines[i - 1].trim();
                            sb = sb.substring(0, sb.length - tail.length) + tail.slice(0, -1);
                            break;
                        }
                    }
                }
                value = sb;
                const hash = value.indexOf(' #');
                if (hash >= 0) value = value.substring(0, hash);
            } else if (trimmedVal.startsWith("'") && trimmedVal.endsWith("'") && trimmedVal.length >= 2) {
                value = trimmedVal.slice(1, -1);
            } else {
                value = stripInlineComment(trimmedVal.trim());
            }
            value = value.replace(/\\n/g, '\n').replace(/\\t/g, '\t');
            if (!KEY_RE.test(key)) errors.push('第 ' + lineNo + ' 行：非法变量名 ' + key);
            entries.push({ key, value, line: lineNo });
        }
        return { entries, errors };
    }

    function parseProperties(text) {
        const entries = [];
        const errors = [];
        (text || '').split(/\r?\n/).forEach((line, idx) => {
            const n = idx + 1;
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('!')) return;
            const eq = trimmed.indexOf('=');
            const colon = trimmed.indexOf(':');
            let sep = -1;
            if (eq >= 0 && (colon < 0 || eq < colon)) sep = eq;
            else if (colon >= 0) sep = colon;
            if (sep < 0) {
                errors.push('第 ' + n + ' 行：无法解析');
                return;
            }
            const key = trimmed.substring(0, sep).trim().replace(/\./g, '_');
            let val = trimmed.substring(sep + 1).trim();
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                val = val.slice(1, -1);
            }
            if (!KEY_RE.test(key)) errors.push('第 ' + n + ' 行：非法变量名 ' + key);
            entries.push({ key, value: val, line: n });
        });
        return { entries, errors };
    }

    function parseJson(text) {
        const errors = [];
        try {
            const obj = JSON.parse(text || '{}');
            if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
                return { entries: [], errors: ['JSON 须为对象'] };
            }
            const entries = Object.keys(obj).map((key, i) => ({
                key,
                value: obj[key] == null ? '' : String(obj[key]),
                line: i + 1
            }));
            return { entries, errors };
        } catch (e) {
            errors.push('JSON 解析失败：' + e.message);
            return { entries: [], errors };
        }
    }

    function parseShell(text) {
        const entries = [];
        const errors = [];
        (text || '').split(/\r?\n/).forEach((line, idx) => {
            const n = idx + 1;
            let trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) return;
            if (trimmed.startsWith('export ')) trimmed = trimmed.substring(7).trim();
            const eq = trimmed.indexOf('=');
            if (eq <= 0) {
                errors.push('第 ' + n + ' 行：缺少 export KEY=VALUE');
                return;
            }
            const key = trimmed.substring(0, eq).trim();
            let val = trimmed.substring(eq + 1).trim();
            if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
            entries.push({ key, value: val, line: n });
        });
        return { entries, errors };
    }

    function flattenYamlObject(obj, prefix, entries, errors) {
        if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
            errors.push('YAML 须为键值对象');
            return;
        }
        Object.keys(obj).forEach(key => {
            const val = obj[key];
            const envKey = (prefix ? prefix + '_' + key : key).replace(/\./g, '_');
            if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
                flattenYamlObject(val, envKey, entries, errors);
            } else if (Array.isArray(val)) {
                errors.push('键 ' + envKey + '：暂不支持数组，请用 JSON 格式');
            } else {
                if (!KEY_RE.test(envKey)) errors.push('键 ' + envKey + ' 非法');
                entries.push({ key: envKey, value: val == null ? '' : String(val), line: entries.length + 1 });
            }
        });
    }

    function parseYaml(text) {
        const errors = [];
        if (typeof YamlUtil === 'undefined') {
            return { entries: [], errors: ['YAML 解析模块未加载'] };
        }
        try {
            const obj = YamlUtil.yamlToJson(text || '');
            const entries = [];
            flattenYamlObject(obj, '', entries, errors);
            return { entries, errors };
        } catch (e) {
            errors.push('YAML 解析失败：' + e.message);
            return { entries: [], errors };
        }
    }

    function toYaml(entries) {
        if (typeof YamlUtil === 'undefined') return toJson(entries);
        const obj = {};
        entries.forEach(e => { obj[e.key] = e.value; });
        return YamlUtil.jsonToYaml(obj);
    }

    function parseInput(text, format) {
        if (format === 'properties') return parseProperties(text);
        if (format === 'json') return parseJson(text);
        if (format === 'shell') return parseShell(text);
        if (format === 'yaml') return parseYaml(text);
        return parseDotenv(text);
    }

    function toDotenv(entries) {
        return entries.map(e => {
            const v = e.value;
            const needsQuote = /[\s#"'\\]/.test(v) || v.includes('\n');
            const val = needsQuote ? '"' + v.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n') + '"' : v;
            return e.key + '=' + val;
        }).join('\n');
    }

    function toProperties(entries) {
        return entries.map(e => e.key + '=' + escapeProp(e.value)).join('\n');
    }

    function escapeProp(v) {
        if (/[\s#!=:]/.test(v)) return '"' + v.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
        return v;
    }

    function toJson(entries) {
        const obj = {};
        entries.forEach(e => { obj[e.key] = e.value; });
        return JSON.stringify(obj, null, 2);
    }

    function shellEscape(v) {
        return v.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\$/g, '\\$').replace(/`/g, '\\`').replace(/\n/g, '\\n');
    }

    function toShellExport(entries) {
        return entries.map(e => 'export ' + e.key + '="' + shellEscape(e.value) + '"').join('\n');
    }

    function maskSecrets(entries) {
        return entries.map(e => ({
            key: e.key,
            value: SENSITIVE_RE.test(e.key) ? '******' : e.value,
            line: e.line
        }));
    }

    function formatOutput(entries, format) {
        if (format === 'json') return toJson(entries);
        if (format === 'shell') return toShellExport(entries);
        if (format === 'properties') return toProperties(entries);
        if (format === 'yaml') return toYaml(entries);
        return toDotenv(entries);
    }

    return {
        parseDotenv, parseProperties, parseJson, parseShell, parseYaml, parseInput,
        toDotenv, toProperties, toJson, toShellExport, toYaml, maskSecrets, formatOutput
    };
})();

function initDotenvPro() {
    const input = document.getElementById('dotenv-input');
    if (!input) return;

    function run() {
        const inFmt = document.getElementById('dotenv-from').value;
        const outFmt = document.getElementById('dotenv-to').value;
        const out = document.getElementById('dotenv-output');
        const err = document.getElementById('dotenv-errors');
        const r = DotenvPro.parseInput(input.value, inFmt);
        if (r.errors.length) {
            err.classList.remove('hidden');
            err.textContent = r.errors.join('\n');
            if (r.entries.length === 0) {
                out.value = '';
                return;
            }
        } else {
            err.classList.add('hidden');
        }
        if (r.entries.length === 0 && !input.value.trim()) {
            out.value = '';
            document.getElementById('dotenv-count').textContent = '0 项';
            return;
        }
        const masked = document.getElementById('dotenv-mask').checked;
        const entries = masked ? DotenvPro.maskSecrets(r.entries) : r.entries;
        out.value = DotenvPro.formatOutput(entries, outFmt);
        document.getElementById('dotenv-count').textContent = r.entries.length + ' 项';
        document.dispatchEvent(new Event('empty-sync'));
    }

    document.getElementById('dotenv-convert').addEventListener('click', () => {
        run();
        toast('已转换');
    });
    document.getElementById('dotenv-copy').addEventListener('click', () =>
        copyText(document.getElementById('dotenv-output').value));
    document.getElementById('dotenv-export').addEventListener('click', () => {
        const fmt = document.getElementById('dotenv-to').value;
        const ext = fmt === 'json' ? '.json' : (fmt === 'shell' ? '.sh' : (fmt === 'yaml' ? '.yaml' : (fmt === 'properties' ? '.properties' : '.env')));
        downloadText(document.getElementById('dotenv-output').value, 'dotenv' + ext);
    });
    document.getElementById('dotenv-to-config').addEventListener('click', () => {
        const out = document.getElementById('dotenv-output').value;
        if (!out.trim()) { run(); }
        Nav.activateTab('config');
        setTimeout(() => {
            const el = document.getElementById('config-input');
            const fmt = document.getElementById('dotenv-to').value;
            if (el) {
                el.value = document.getElementById('dotenv-output').value;
                const cfgFmt = document.getElementById('config-format');
                if (cfgFmt) {
                    cfgFmt.value = fmt === 'json' ? 'json' : (fmt === 'yaml' ? 'yaml' : 'properties');
                }
                el.dispatchEvent(new Event('input', { bubbles: true }));
            }
            toast('已发送到配置互转');
        }, 80);
    });
    document.getElementById('dotenv-clear').addEventListener('click', () => {
        input.value = '';
        document.getElementById('dotenv-output').value = '';
        document.getElementById('dotenv-errors').classList.add('hidden');
        document.getElementById('dotenv-count').textContent = '0 项';
        document.dispatchEvent(new Event('empty-sync'));
    });
}

if (typeof globalThis !== 'undefined') globalThis.__DotenvPro = DotenvPro;
