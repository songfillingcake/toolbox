/**
 * JSON Pro - 参考 json.cn 核心能力，纯浏览器端处理
 */
const JsonPro = (() => {

    function parseWithDetail(text) {
        if (!text || !text.trim()) {
            return { ok: false, error: '请输入 JSON 内容', line: 1, column: 1 };
        }
        try {
            const value = JSON.parse(text);
            return { ok: true, value };
        } catch (e) {
            const match = e.message.match(/position\s+(\d+)/i) || e.message.match(/at line (\d+) column (\d+)/i);
            let line = 1, column = 1;
            if (match) {
                if (match[2]) {
                    line = parseInt(match[1], 10);
                    column = parseInt(match[2], 10);
                } else {
                    const pos = parseInt(match[1], 10);
                    const lines = text.substring(0, pos).split('\n');
                    line = lines.length;
                    column = lines[lines.length - 1].length + 1;
                }
            }
            return { ok: false, error: e.message, line, column };
        }
    }

    function sortKeys(value) {
        if (Array.isArray(value)) {
            return value.map(sortKeys);
        }
        if (value !== null && typeof value === 'object') {
            const sorted = {};
            Object.keys(value).sort().forEach(k => {
                sorted[k] = sortKeys(value[k]);
            });
            return sorted;
        }
        return value;
    }

    function format(value, indent) {
        return JSON.stringify(value, null, indent);
    }

    function minify(value) {
        return JSON.stringify(value);
    }

    function escapeForCode(text) {
        return JSON.stringify(text);
    }

    function unescapeCode(text) {
        const trimmed = text.trim();
        if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
            (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
            return JSON.parse(trimmed.replace(/^'/, '"').replace(/'$/, '"'));
        }
        return JSON.parse('"' + trimmed.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"');
    }

    function decodeUnicodeInJson(text) {
        return text.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
            String.fromCharCode(parseInt(hex, 16)));
    }

    function stats(value) {
        const json = JSON.stringify(value);
        let keys = 0;
        const walk = (v) => {
            if (v !== null && typeof v === 'object') {
                keys += Object.keys(v).length;
                Object.values(v).forEach(walk);
            }
        };
        walk(value);
        return {
            size: new Blob([json]).size,
            chars: json.length,
            keys,
            type: Array.isArray(value) ? 'array' : typeof value
        };
    }

    /** 简易 JSONPath：$ .key [n] ['key'] [*] */
    function query(value, pathExpr) {
        if (!pathExpr || pathExpr.trim() === '$') return value;

        let path = pathExpr.trim();
        if (!path.startsWith('$')) {
            throw new Error('JSONPath 必须以 $ 开头，例如 $.data.list[0]');
        }

        let nodes = [value];
        let i = 1;

        const readKey = () => {
            if (path[i] === "'" || path[i] === '"') {
                const q = path[i++];
                let key = '';
                while (i < path.length && path[i] !== q) {
                    if (path[i] === '\\') i++;
                    key += path[i++];
                }
                i++;
                return key;
            }
            let key = '';
            while (i < path.length && /[A-Za-z0-9_$]/.test(path[i])) {
                key += path[i++];
            }
            return key;
        };

        while (i < path.length) {
            const ch = path[i];
            if (ch === '.') {
                i++;
                if (path[i] === '.') {
                    i++;
                    const key = readKey();
                    const found = [];
                    const search = (obj) => {
                        if (obj === null || typeof obj !== 'object') return;
                        if (Object.prototype.hasOwnProperty.call(obj, key)) {
                            found.push(obj[key]);
                        }
                        if (Array.isArray(obj)) {
                            obj.forEach(search);
                        } else {
                            Object.values(obj).forEach(search);
                        }
                    };
                    nodes.forEach(search);
                    nodes = found;
                } else {
                    const key = readKey();
                    nodes = nodes.flatMap(n =>
                        n !== null && typeof n === 'object' && key in n ? [n[key]] : []);
                }
            } else if (ch === '[') {
                i++;
                if (path[i] === '*') {
                    i++;
                    if (path[i] === ']') i++;
                    nodes = nodes.flatMap(n => Array.isArray(n) ? n : []);
                } else if (path[i] === "'" || path[i] === '"') {
                    const key = readKey();
                    if (path[i] === ']') i++;
                    nodes = nodes.flatMap(n =>
                        n !== null && typeof n === 'object' ? [n[key]] : []);
                } else {
                    let idx = '';
                    while (i < path.length && path[i] !== ']') idx += path[i++];
                    if (path[i] === ']') i++;
                    const index = parseInt(idx, 10);
                    nodes = nodes.flatMap(n =>
                        Array.isArray(n) && index >= 0 && index < n.length ? [n[index]] : []);
                }
            } else if (ch === ' ' || ch === '\t') {
                i++;
            } else {
                throw new Error('无法解析 JSONPath，位置: ' + path.substring(i));
            }
        }

        if (nodes.length === 0) return null;
        if (nodes.length === 1) return nodes[0];
        return nodes;
    }

    function typeLabel(v) {
        if (v === null) return 'null';
        if (Array.isArray(v)) return 'array[' + v.length + ']';
        return typeof v;
    }

    function renderValue(v) {
        if (v === null) return '<span class="jv-null">null</span>';
        if (typeof v === 'boolean') return '<span class="jv-bool">' + v + '</span>';
        if (typeof v === 'number') return '<span class="jv-num">' + v + '</span>';
        if (typeof v === 'string') {
            const display = v.length > 80 ? v.substring(0, 80) + '…' : v;
            return '<span class="jv-str">"' + escHtml(display) + '"</span>';
        }
        return '';
    }

    function escHtml(s) {
        return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function renderTree(container, value, path, onPathClick, onEdit) {
        container.innerHTML = '';
        const root = document.createElement('div');
        root.className = 'json-tree';
        buildNode(root, value, path || '$', onPathClick, onEdit);
        container.appendChild(root);
    }

    function buildNode(parent, value, path, onPathClick, onEdit) {
        if (value !== null && typeof value === 'object') {
            const isArr = Array.isArray(value);
            const entries = isArr
                ? value.map((v, i) => [String(i), v])
                : Object.keys(value).map(k => [k, value[k]]);

            const line = document.createElement('div');
            line.className = 'json-tree-line';

            const toggle = document.createElement('span');
            toggle.className = 'json-tree-toggle open';
            toggle.textContent = '▼';
            line.appendChild(toggle);

            const bracket = document.createElement('span');
            bracket.className = 'jv-bracket';
            bracket.textContent = isArr ? '[ ' + entries.length + ' ]' : '{ ' + entries.length + ' }';
            line.appendChild(bracket);

            const pathBtn = document.createElement('span');
            pathBtn.className = 'json-tree-path';
            pathBtn.textContent = path;
            pathBtn.title = '点击复制路径';
            pathBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                onPathClick && onPathClick(path);
            });
            line.appendChild(pathBtn);

            if (onEdit) {
                const editBtn = document.createElement('span');
                editBtn.className = 'json-tree-edit';
                editBtn.textContent = '✎';
                editBtn.title = '编辑此节点';
                editBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    onEdit(path, value);
                });
                line.appendChild(editBtn);
            }

            parent.appendChild(line);

            const children = document.createElement('div');
            children.className = 'json-tree-children';

            entries.forEach(([key, val]) => {
                const childPath = isArr ? path + '[' + key + ']' : path + '.' + (/^[A-Za-z_$][\w$]*$/.test(key) ? key : "['" + key.replace(/'/g, "\\'") + "']");
                const row = document.createElement('div');
                row.className = 'json-tree-row';

                if (val !== null && typeof val === 'object') {
                    const keySpan = document.createElement('span');
                    keySpan.className = 'jv-key';
                    keySpan.textContent = isArr ? '[' + key + ']' : '"' + key + '"';
                    row.appendChild(keySpan);
                    buildNode(row, val, childPath, onPathClick, onEdit);
                } else {
                    const keySpan = document.createElement('span');
                    keySpan.className = 'jv-key';
                    keySpan.textContent = (isArr ? '[' + key + ']' : '"' + key + '"') + ': ';
                    row.appendChild(keySpan);
                    const valWrap = document.createElement('span');
                    valWrap.innerHTML = renderValue(val);
                    valWrap.className = 'jv-leaf-value';
                    valWrap.title = '双击编辑 · 单击复制路径';
                    valWrap.addEventListener('click', () => onPathClick && onPathClick(childPath));
                    valWrap.addEventListener('dblclick', (e) => {
                        e.stopPropagation();
                        if (onEdit) onEdit(childPath, val);
                    });
                    row.appendChild(valWrap);
                }
                children.appendChild(row);
            });

            toggle.addEventListener('click', () => {
                const open = toggle.classList.toggle('open');
                toggle.textContent = open ? '▼' : '▶';
                children.style.display = open ? 'block' : 'none';
            });

            parent.appendChild(children);
        } else {
            const row = document.createElement('div');
            row.className = 'json-tree-row leaf';
            row.innerHTML = renderValue(value);
            row.style.cursor = 'pointer';
            row.title = '点击复制路径: ' + path;
            row.addEventListener('dblclick', (e) => {
                e.stopPropagation();
                if (onEdit) onEdit(path, value);
            });
            parent.appendChild(row);
        }
    }

    return {
        parseWithDetail,
        sortKeys,
        format,
        minify,
        escapeForCode,
        unescapeCode,
        decodeUnicodeInJson,
        stats,
        query,
        typeLabel,
        renderTree
    };
})();

/**
 * JSON Pro 面板初始化
 */
function initJsonPro() {
    const input = document.getElementById('json-input');
    const output = document.getElementById('json-output');
    const statusEl = document.getElementById('json-status');
    const errorEl = document.getElementById('json-error');
    const statsEl = document.getElementById('json-stats');
    const treeEl = document.getElementById('json-tree');
    const pathInput = document.getElementById('json-path-input');
    const pathResult = document.getElementById('json-path-result');
    const indentSelect = document.getElementById('json-indent');
    const keepEscape = document.getElementById('json-keep-escape');

    if (!input) return;

    let debounceTimer = null;

    function setStatus(ok, msg) {
        statusEl.textContent = msg;
        statusEl.className = 'badge ' + (ok ? 'badge-ok' : 'badge-err');
    }

    function getParsed() {
        let text = input.value;
        if (keepEscape && keepEscape.checked) {
            // 保留转义：仅做结构校验，格式化时不解码 \u
        }
        return JsonPro.parseWithDetail(text);
    }

    function syncView() {
        const result = getParsed();
        if (!result.ok) {
            setStatus(false, '校验失败');
            errorEl.textContent = '第 ' + result.line + ' 行, 第 ' + result.column + ' 列: ' + result.error;
            errorEl.classList.remove('hidden');
            treeEl.innerHTML = '<div class="json-tree-empty">JSON 格式错误，无法生成树形视图</div>';
            statsEl.textContent = '';
            return null;
        }

        setStatus(true, '✓ 合法 JSON');
        errorEl.classList.add('hidden');

        const st = JsonPro.stats(result.value);
        statsEl.textContent = st.type + ' · ' + st.keys + ' 个键 · ' + st.chars + ' 字符 · ' + formatBytes(st.size);

        const treeSkip = 200 * 1024;
        if (input.value.length > treeSkip) {
            treeEl.innerHTML = '<div class="json-tree-empty">内容较大（' + formatBytes(input.value.length) + '），已跳过树形渲染</div>';
        } else {
            JsonPro.renderTree(treeEl, result.value, '$', (path) => {
                pathInput.value = path;
                if (typeof copyText === 'function') copyText(path);
            }, handleTreeEdit);
        }

        return result.value;
    }

    function parseEditValue(raw, oldVal) {
        if (raw === 'null') return null;
        if (raw === 'true') return true;
        if (raw === 'false') return false;
        if (raw.startsWith('{') || raw.startsWith('[')) return JSON.parse(raw);
        if (/^-?\d+$/.test(raw)) return parseInt(raw, 10);
        if (/^-?\d+\.\d+$/.test(raw)) return parseFloat(raw);
        if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
            return JSON.parse(raw.replace(/^'/, '"').replace(/'$/, '"'));
        }
        if (typeof oldVal === 'number') return Number(raw);
        if (typeof oldVal === 'boolean') return raw === 'true';
        return raw;
    }

    function handleTreeEdit(path, oldVal) {
        const result = getParsed();
        if (!result.ok) return;
        const display = typeof oldVal === 'object' ? JSON.stringify(oldVal, null, 2) : String(oldVal);
        ProCommon.showInlineModal('编辑节点', display, (raw) => {
            try {
                const newVal = parseEditValue(raw.trim(), oldVal);
                const cloned = JSON.parse(JSON.stringify(result.value));
                ProCommon.setByPath(cloned, path, newVal);
                input.value = JsonPro.format(cloned, parseInt(indentSelect.value, 10));
                syncView();
                toast('已更新 ' + path);
            } catch (e) {
                toast('编辑失败: ' + e.message);
            }
        });
        const modal = document.getElementById('inline-edit-modal');
        if (modal) modal.querySelector('.inline-modal-path').textContent = path;
    }

    function formatBytes(n) {
        if (n < 1024) return n + ' B';
        return (n / 1024).toFixed(1) + ' KB';
    }

    function applyFormat() {
        const result = getParsed();
        if (!result.ok) { syncView(); return; }
        let val = result.value;
        if (document.getElementById('json-sort-keys').checked) {
            val = JsonPro.sortKeys(val);
        }
        const indent = parseInt(indentSelect.value, 10);
        let formatted = JsonPro.format(val, indent);
        if (!keepEscape.checked) {
            formatted = JsonPro.decodeUnicodeInJson(formatted);
        }
        input.value = formatted;
        output.value = formatted;
        syncView();
        toast('已格式化');
    }

    function applyMinify() {
        const result = getParsed();
        if (!result.ok) { syncView(); return; }
        let val = result.value;
        if (document.getElementById('json-sort-keys').checked) {
            val = JsonPro.sortKeys(val);
        }
        const min = JsonPro.minify(val);
        input.value = min;
        output.value = min;
        syncView();
        toast('已压缩');
    }

    input.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        const size = new Blob([input.value]).size;
        if (typeof DevKitCore !== 'undefined' && size > DevKitCore.getMaxInputChars()) {
            setStatus(false, '超出大小限制');
            statsEl.textContent = '已超过 ' + Math.round(DevKitCore.getMaxInputChars() / 1024) + 'KB 上限';
            treeEl.innerHTML = '<div class="json-tree-empty">输入过大，请缩小后重试</div>';
            return;
        }
        const delay = size > 500000 ? 800 : (size > 100000 ? 500 : 300);
        if (size > 1000000) {
            statsEl.textContent = '大文件模式 (' + formatBytes(size) + ')，校验可能较慢';
        }
        debounceTimer = setTimeout(syncView, delay);
    });

    document.getElementById('json-format').addEventListener('click', applyFormat);
    document.getElementById('json-minify').addEventListener('click', applyMinify);

    document.getElementById('json-validate').addEventListener('click', () => {
        syncView();
        toast(getParsed().ok ? 'JSON 合法' : 'JSON 不合法');
    });

    document.getElementById('json-sort').addEventListener('click', () => {
        const result = getParsed();
        if (!result.ok) { syncView(); return; }
        const sorted = JsonPro.sortKeys(result.value);
        const indent = parseInt(indentSelect.value, 10);
        input.value = JsonPro.format(sorted, indent);
        syncView();
        toast('已按 Key 排序');
    });

    document.getElementById('json-unicode').addEventListener('click', () => {
        input.value = JsonPro.decodeUnicodeInJson(input.value);
        syncView();
        toast('已解码 Unicode');
    });

    document.getElementById('json-escape').addEventListener('click', () => {
        output.value = JsonPro.escapeForCode(input.value);
        toast('已转义为字符串');
    });

    document.getElementById('json-unescape').addEventListener('click', () => {
        try {
            input.value = JsonPro.unescapeCode(input.value);
            syncView();
            toast('已去除转义');
        } catch (e) {
            toast('去转义失败: ' + e.message);
        }
    });

    document.getElementById('json-path-run').addEventListener('click', () => {
        const result = getParsed();
        if (!result.ok) { syncView(); return; }
        try {
            const q = JsonPro.query(result.value, pathInput.value || '$');
            pathResult.value = JsonPro.format(q, 2);
            toast('JSONPath 查询成功');
        } catch (e) {
            pathResult.value = '';
            toast('JSONPath 错误: ' + e.message);
        }
    });

    document.getElementById('json-copy').addEventListener('click', () => copyText(input.value));
    document.getElementById('json-copy-min').addEventListener('click', () => {
        const result = getParsed();
        if (result.ok) copyText(JsonPro.minify(result.value));
    });

    document.getElementById('json-clear').addEventListener('click', () => {
        input.value = '';
        output.value = '';
        pathResult.value = '';
        pathInput.value = '$';
        treeEl.innerHTML = '';
        statsEl.textContent = '';
        errorEl.classList.add('hidden');
        setStatus(false, '待输入');
    });

    document.getElementById('json-expand-all').addEventListener('click', () => {
        treeEl.querySelectorAll('.json-tree-toggle').forEach(t => {
            t.classList.add('open');
            t.textContent = '▼';
            const ch = t.parentElement.nextElementSibling;
            if (ch) ch.style.display = 'block';
        });
    });

    document.getElementById('json-collapse-all').addEventListener('click', () => {
        treeEl.querySelectorAll('.json-tree-toggle').forEach(t => {
            t.classList.remove('open');
            t.textContent = '▶';
            const ch = t.parentElement.nextElementSibling;
            if (ch) ch.style.display = 'none';
        });
    });

    const fsBtn = document.getElementById('json-fullscreen');
    if (fsBtn) {
        fsBtn.addEventListener('click', () => ProCommon.toggleFocusMode('#panel-json'));
    }

    document.getElementById('json-to-yaml').addEventListener('click', () => {
        const result = getParsed();
        if (!result.ok) { toast('JSON 不合法'); return; }
        document.getElementById('yaml-io').value = YamlUtil.jsonToYaml(result.value);
        toast('已转为 YAML');
    });

    document.getElementById('yaml-to-json').addEventListener('click', () => {
        try {
            const obj = YamlUtil.yamlToJson(document.getElementById('yaml-io').value);
            input.value = JsonPro.format(obj, parseInt(indentSelect.value, 10));
            syncView();
            toast('已转为 JSON');
        } catch (e) {
            toast('YAML 解析失败: ' + e.message);
        }
    });

    document.getElementById('yaml-copy').addEventListener('click', () => {
        copyText(document.getElementById('yaml-io').value);
    });

    ProCommon.initSubTabs('#json-subtabs');

    const hash = ProCommon.parseHash();
    if (hash.fullscreen) ProCommon.toggleFocusMode('#panel-json');
    if (hash.tab) ProCommon.activateTab(hash.tab);

    const urlLoadBtn = document.getElementById('json-url-load');
    if (urlLoadBtn) {
        urlLoadBtn.addEventListener('click', async () => {
            const url = document.getElementById('json-url-input').value.trim();
            if (!url) { toast('请输入 URL'); return; }
            try {
                toast('正在拉取...');
                const content = await ProCommon.fetchUrl(url);
                input.value = content;
                syncView();
                toast('已从 URL 加载');
            } catch (e) {
                toast('拉取失败: ' + e.message);
            }
        });
    }

    if (hash.url) {
        const urlInput = document.getElementById('json-url-input');
        if (urlInput) urlInput.value = hash.url;
        ProCommon.clearHash();
        if (urlLoadBtn) urlLoadBtn.click();
    } else if (hash.data) {
        if (typeof Nav !== 'undefined') Nav.activateTab('json');
        input.value = hash.data;
        ProCommon.clearHash();
        syncView();
    } else {
        input.value = JSON.stringify({
            code: 0,
            message: "success",
            data: {
                userId: 100000284,
                nickname: "秀场主播7610",
                tags: ["live", "gift"],
                extra: { level: 12, vip: false }
            }
        }, null, 2);
        syncView();
    }
}
