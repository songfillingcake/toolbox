/**
 * JSON ↔ YAML 转换（常见结构，纯 JS）
 */
const YamlUtil = (() => {

    function needsQuote(s) {
        return /[:#\[\]{}&,*?|>!\-@`"'\\%]/.test(s) || /^\s|\s$/.test(s) ||
            ['true', 'false', 'null', 'yes', 'no'].includes(s.toLowerCase());
    }

    function quote(s) {
        return needsQuote(s) ? JSON.stringify(s) : s;
    }

    function jsonToYaml(value, indent) {
        indent = indent || 0;
        const pad = '  '.repeat(indent);

        if (value === null) return pad + 'null';
        if (typeof value === 'boolean') return pad + value;
        if (typeof value === 'number') return pad + value;
        if (typeof value === 'string') return pad + quote(value);

        if (Array.isArray(value)) {
            if (value.length === 0) return pad + '[]';
            return value.map(item => {
                if (item !== null && typeof item === 'object') {
                    const inner = jsonToYaml(item, indent + 1);
                    const lines = inner.split('\n');
                    return pad + '- ' + lines[0].trim() + (lines.length > 1 ? '\n' + lines.slice(1).join('\n') : '');
                }
                return pad + '- ' + jsonToYaml(item, 0).trim();
            }).join('\n');
        }

        const keys = Object.keys(value);
        if (keys.length === 0) return pad + '{}';
        return keys.map(key => {
            const v = value[key];
            const k = needsQuote(key) ? JSON.stringify(key) : key;
            if (v !== null && typeof v === 'object') {
                return pad + k + ':\n' + jsonToYaml(v, indent + 1);
            }
            return pad + k + ': ' + jsonToYaml(v, 0).trim();
        }).join('\n');
    }

    function yamlToJson(text) {
        const lines = text.replace(/\t/g, '  ').split('\n');
        const root = {};
        const stack = [{ indent: -1, obj: root, isArray: false }];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (!line.trim() || line.trim().startsWith('#')) continue;

            const indent = line.search(/\S/);
            const content = line.trim();

            while (stack.length > 1 && indent <= stack[stack.length - 1].indent) {
                stack.pop();
            }

            const parent = stack[stack.length - 1];

            if (content.startsWith('- ')) {
                let arr = parent.obj;
                if (!Array.isArray(arr)) {
                    arr = [];
                    parent.obj = arr;
                }
                const val = parseScalar(content.substring(2).trim());
                if (val && val.__nested) {
                    const item = {};
                    arr.push(item);
                    stack.push({ indent, obj: item, isArray: true });
                } else {
                    arr.push(val);
                }
            } else {
                const colon = content.indexOf(':');
                if (colon < 0) throw new Error('第 ' + (i + 1) + ' 行 YAML 格式错误');
                const key = content.substring(0, colon).trim().replace(/^["']|["']$/g, '');
                const rest = content.substring(colon + 1).trim();

                if (!rest) {
                    const child = {};
                    parent.obj[key] = child;
                    stack.push({ indent, obj: child, isArray: false });
                } else {
                    parent.obj[key] = parseScalar(rest);
                }
            }
        }
        return root;
    }

    function parseScalar(s) {
        if (!s) return { __nested: true };
        if (s === 'null' || s === '~') return null;
        if (s === 'true') return true;
        if (s === 'false') return false;
        if (/^-?\d+$/.test(s)) return parseInt(s, 10);
        if (/^-?\d+\.\d+$/.test(s)) return parseFloat(s);
        if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
            return s.slice(1, -1);
        }
        return s;
    }

    return { jsonToYaml, yamlToJson };
})();
