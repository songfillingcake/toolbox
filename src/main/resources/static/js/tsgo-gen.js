/**
 * JSON → TypeScript / Go struct
 */
const TsGoGen = (() => {

    function toTsField(key, val) {
        const optional = val === null ? '?' : '';
        let type = 'unknown';
        if (val === null) type = 'null';
        else if (typeof val === 'boolean') type = 'boolean';
        else if (typeof val === 'number') type = Number.isInteger(val) ? 'number' : 'number';
        else if (typeof val === 'string') type = 'string';
        else if (Array.isArray(val)) type = (val.length && typeof val[0] === 'object') ? 'any[]' : inferTs(val[0]) + '[]';
        else type = 'Record<string, any>';
        return key + optional + ': ' + type + ';';
    }

    function inferTs(val) {
        if (val === null) return 'null';
        if (typeof val === 'boolean') return 'boolean';
        if (typeof val === 'number') return 'number';
        if (typeof val === 'string') return 'string';
        return 'any';
    }

    function toGoField(key, val) {
        const name = key.charAt(0).toUpperCase() + key.slice(1);
        let type = 'interface{}';
        if (val === null) type = 'interface{}';
        else if (typeof val === 'boolean') type = 'bool';
        else if (typeof val === 'number') type = Number.isInteger(val) ? 'int64' : 'float64';
        else if (typeof val === 'string') type = 'string';
        else if (Array.isArray(val)) type = '[]' + (val.length ? goType(val[0]) : 'interface{}');
        return name + ' ' + type + ' `json:"' + key + '"`';
    }

    function goType(val) {
        if (val === null) return 'interface{}';
        if (typeof val === 'boolean') return 'bool';
        if (typeof val === 'number') return Number.isInteger(val) ? 'int64' : 'float64';
        if (typeof val === 'string') return 'string';
        return 'map[string]interface{}';
    }

    function generateTs(obj, name) {
        name = name || 'Root';
        if (Array.isArray(obj) && obj.length) obj = obj[0];
        if (typeof obj !== 'object' || obj === null) return 'export type ' + name + ' = any;';
        const lines = Object.keys(obj).map(k => '  ' + toTsField(k, obj[k]));
        return 'export interface ' + name + ' {\n' + lines.join('\n') + '\n}';
    }

    function generateGo(obj, name) {
        name = name || 'Root';
        if (Array.isArray(obj) && obj.length) obj = obj[0];
        if (typeof obj !== 'object' || obj === null) return 'type ' + name + ' struct {}';
        const lines = Object.keys(obj).map(k => '\t' + toGoField(k, obj[k]));
        return 'type ' + name + ' struct {\n' + lines.join('\n') + '\n}';
    }

    return { generateTs, generateGo };
})();

function initTsGoGen() {
    const btn = document.getElementById('tsgo-gen-run');
    if (!btn) return;
    btn.addEventListener('click', () => {
        const result = JsonPro.parseWithDetail(document.getElementById('json-input').value);
        if (!result.ok) { toast('JSON 不合法'); return; }
        const lang = document.getElementById('tsgo-lang').value;
        const name = document.getElementById('tsgo-name').value || 'Root';
        const out = lang === 'go' ? TsGoGen.generateGo(result.value, name) : TsGoGen.generateTs(result.value, name);
        document.getElementById('tsgo-output').value = out;
        toast((lang === 'go' ? 'Go' : 'TypeScript') + ' 结构体已生成');
    });
    document.getElementById('tsgo-copy').addEventListener('click', () => copyText(document.getElementById('tsgo-output').value));
}
