/**
 * JSON Diff - 深度对比两份 JSON
 */
const JsonDiff = (() => {

    function diff(a, b, path) {
        path = path || '$';
        const changes = [];
        if (a === b) return changes;

        const typeA = getType(a);
        const typeB = getType(b);

        if (typeA !== typeB) {
            changes.push({ type: 'changed', path, oldVal: a, newVal: b });
            return changes;
        }

        if (typeA === 'object') {
            const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
            keys.forEach(k => {
                const p = path + '.' + (/^[A-Za-z_$][\w$]*$/.test(k) ? k : "['" + k + "']");
                if (!(k in a)) changes.push({ type: 'added', path: p, newVal: b[k] });
                else if (!(k in b)) changes.push({ type: 'removed', path: p, oldVal: a[k] });
                else changes.push(...diff(a[k], b[k], p));
            });
        } else if (typeA === 'array') {
            const max = Math.max(a.length, b.length);
            for (let i = 0; i < max; i++) {
                const p = path + '[' + i + ']';
                if (i >= a.length) changes.push({ type: 'added', path: p, newVal: b[i] });
                else if (i >= b.length) changes.push({ type: 'removed', path: p, oldVal: a[i] });
                else changes.push(...diff(a[i], b[i], p));
            }
        } else if (a !== b) {
            changes.push({ type: 'changed', path, oldVal: a, newVal: b });
        }
        return changes;
    }

    function getType(v) {
        if (v === null) return 'null';
        if (Array.isArray(v)) return 'array';
        return typeof v;
    }

    function formatVal(v) {
        if (v === undefined) return '(无)';
        return JSON.stringify(v);
    }

    function renderHtml(changes) {
        if (changes.length === 0) {
            return '<div class="diff-ok">✓ 两份 JSON 完全相同</div>';
        }
        return '<div class="diff-summary">共 ' + changes.length + ' 处差异</div>' +
            changes.map(c => {
                const cls = 'diff-' + c.type;
                let detail = '';
                if (c.type === 'changed') detail = formatVal(c.oldVal) + ' → ' + formatVal(c.newVal);
                else if (c.type === 'added') detail = '+ ' + formatVal(c.newVal);
                else detail = '- ' + formatVal(c.oldVal);
                return '<div class="diff-line ' + cls + '"><span class="diff-path">' + esc(c.path) + '</span> ' + esc(detail) + '</div>';
            }).join('');
    }

    function esc(s) {
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
    }

    return { diff, renderHtml };
})();

function initJsonDiff() {
    const left = document.getElementById('json-diff-left');
    const right = document.getElementById('json-diff-right');
    const result = document.getElementById('json-diff-result');
    if (!left || !result) return;

    document.getElementById('json-diff-run').addEventListener('click', () => {
        try {
            const a = JSON.parse(left.value || 'null');
            const b = JSON.parse(right.value || 'null');
            const changes = JsonDiff.diff(a, b);
            result.innerHTML = JsonDiff.renderHtml(changes);
            toast('对比完成');
        } catch (e) {
            result.innerHTML = '<div class="diff-err">解析失败: ' + e.message + '</div>';
        }
    });

    document.getElementById('json-diff-swap').addEventListener('click', () => {
        const t = left.value;
        left.value = right.value;
        right.value = t;
    });
}
