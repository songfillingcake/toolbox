/**
 * Spring 配置互转：Properties / YAML / JSON
 */
const ConfigConvert = (() => {

    function parseProperties(text) {
        const root = {};
        const lines = text.split(/\r?\n/);
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('!')) continue;
            const eq = trimmed.indexOf('=');
            const colon = trimmed.indexOf(':');
            let sep = -1;
            if (eq >= 0 && (colon < 0 || eq < colon)) sep = eq;
            else if (colon >= 0) sep = colon;
            if (sep < 0) continue;
            const key = trimmed.substring(0, sep).trim();
            let val = trimmed.substring(sep + 1).trim();
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                val = val.slice(1, -1);
            }
            setNested(root, key.split('.'), coerce(val));
        }
        return root;
    }

    function coerce(val) {
        if (val === 'true') return true;
        if (val === 'false') return false;
        if (/^-?\d+$/.test(val)) return parseInt(val, 10);
        if (/^-?\d+\.\d+$/.test(val)) return parseFloat(val);
        return val;
    }

    function setNested(obj, keys, val) {
        let cur = obj;
        for (let i = 0; i < keys.length - 1; i++) {
            const k = keys[i];
            if (!(k in cur) || typeof cur[k] !== 'object') cur[k] = {};
            cur = cur[k];
        }
        cur[keys[keys.length - 1]] = val;
    }

    function flatten(obj, prefix, lines) {
        prefix = prefix || '';
        lines = lines || [];
        if (obj !== null && typeof obj === 'object' && !Array.isArray(obj)) {
            Object.keys(obj).forEach(k => flatten(obj[k], prefix ? prefix + '.' + k : k, lines));
        } else {
            const v = typeof obj === 'string' ? obj : JSON.stringify(obj);
            lines.push(prefix + '=' + (v.includes(' ') || v.includes(':') ? '"' + v + '"' : v));
        }
        return lines;
    }

    function toProperties(obj) {
        return flatten(obj).join('\n');
    }

    function toJson(obj, indent) {
        return JSON.stringify(obj, null, indent || 2);
    }

    function toYaml(obj) {
        return typeof YamlUtil !== 'undefined' ? YamlUtil.jsonToYaml(obj) : toJson(obj);
    }

    function fromYaml(text) {
        return typeof YamlUtil !== 'undefined' ? YamlUtil.yamlToJson(text) : JSON.parse(text);
    }

    return { parseProperties, toProperties, toJson, toYaml, fromYaml };
})();

function initConfigConvert() {
    const input = document.getElementById('config-input');
    const output = document.getElementById('config-output');
    if (!input) return;

    const fmt = () => document.getElementById('config-format').value;

    document.getElementById('config-convert').addEventListener('click', () => {
        const from = fmt();
        const to = document.getElementById('config-to').value;
        try {
            let obj;
            if (from === 'properties') obj = ConfigConvert.parseProperties(input.value);
            else if (from === 'yaml') obj = ConfigConvert.fromYaml(input.value);
            else obj = JSON.parse(input.value);

            if (to === 'properties') output.value = ConfigConvert.toProperties(obj);
            else if (to === 'yaml') output.value = ConfigConvert.toYaml(obj);
            else output.value = ConfigConvert.toJson(obj, 2);
            toast('转换完成');
        } catch (e) {
            output.value = '// 错误: ' + e.message;
        }
    });

    document.getElementById('config-copy').addEventListener('click', () => copyText(output.value));
}
