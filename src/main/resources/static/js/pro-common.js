/**
 * Pro 通用：Hash 传参、专注模式、历史记录、主题、拖拽、工作区
 */
const ProCommon = (() => {
    const HISTORY_KEY = 'devkit_history_v1';
    const WORKSPACE_KEY = 'devkit_workspace_v1';
    const SETTINGS_KEY = 'devkit_settings_v1';
    const VERSION = '1.10.0';
    const MAX_HISTORY = 10;

    function getSettings() {
        if (typeof DevKitCore !== 'undefined') return DevKitCore.getSettings();
        try {
            return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
        } catch (e) {
            return {};
        }
    }

    function saveSettings(patch) {
        if (typeof DevKitCore !== 'undefined') return DevKitCore.saveSettings(patch);
        const s = Object.assign(getSettings(), patch);
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
        return s;
    }

    function initTheme() {
        const settings = getSettings();
        const theme = settings.theme || 'dark';
        document.documentElement.setAttribute('data-theme', theme);
        const btn = document.getElementById('theme-toggle');
        if (btn) {
            btn.addEventListener('click', () => {
                const next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
                document.documentElement.setAttribute('data-theme', next);
                saveSettings({ theme: next });
                if (typeof DevKitIcons !== 'undefined') DevKitIcons.updateThemeIcon();
                else btn.textContent = next === 'light' ? 'Dark' : 'Light';
            });
            if (typeof DevKitIcons !== 'undefined') DevKitIcons.updateThemeIcon();
        }
        const ver = document.getElementById('app-version');
        if (ver && typeof DevKitCore === 'undefined') ver.textContent = 'v' + VERSION;
    }

    function parseHash() {
        const hash = window.location.hash ? window.location.hash.substring(1) : '';
        if (!hash) return {};

        const result = {};
        if (hash.startsWith('data=')) {
            try {
                result.data = decodeURIComponent(hash.substring(5));
            } catch (e) {
                result.data = hash.substring(5);
            }
            return result;
        }
        if (hash.startsWith('url=')) {
            try {
                result.url = decodeURIComponent(hash.substring(4));
            } catch (e) {
                result.url = hash.substring(4);
            }
            return result;
        }

        const params = new URLSearchParams(hash);
        if (params.has('data')) result.data = params.get('data');
        if (params.has('url')) result.url = params.get('url');
        if (params.has('fullscreen')) result.fullscreen = true;
        if (params.has('tab')) result.tab = params.get('tab');
        return result;
    }

    function clearHash() {
        if (window.location.hash) {
            history.replaceState(null, '', window.location.pathname + window.location.search);
        }
    }

    function activateTab(tabName) {
        if (typeof Nav !== 'undefined' && Nav.activateTab) {
            Nav.activateTab(tabName);
            return;
        }
        const btn = document.querySelector('.nav-item[data-tab="' + tabName + '"]');
        if (btn) btn.click();
    }

    function toggleFocusMode(panelSelector) {
        document.body.classList.toggle('focus-mode');
        const panel = document.querySelector(panelSelector);
        if (panel) panel.classList.toggle('focus-panel');
        const exit = document.getElementById('focus-exit');
        if (exit) exit.classList.toggle('hidden', !document.body.classList.contains('focus-mode'));
    }

    function setByPath(root, pathExpr, newValue) {
        if (pathExpr === '$') return newValue;
        const tokens = tokenizePath(pathExpr);
        if (tokens.length === 0) throw new Error('无效路径');
        let cur = root;
        for (let i = 0; i < tokens.length - 1; i++) {
            cur = cur[tokens[i]];
            if (cur === undefined) throw new Error('路径不存在: ' + pathExpr);
        }
        cur[tokens[tokens.length - 1]] = newValue;
        return root;
    }

    function tokenizePath(path) {
        const tokens = [];
        let i = 1;
        while (i < path.length) {
            if (path[i] === '.') {
                i++;
                if (path[i] === '[') continue;
                let key = '';
                while (i < path.length && /[A-Za-z0-9_$]/.test(path[i])) key += path[i++];
                if (key) tokens.push(key);
            } else if (path[i] === '[') {
                i++;
                if (path[i] === "'" || path[i] === '"') {
                    const q = path[i++];
                    let key = '';
                    while (i < path.length && path[i] !== q) key += path[i++];
                    i++;
                    if (path[i] === ']') i++;
                    tokens.push(key);
                } else {
                    let idx = '';
                    while (i < path.length && path[i] !== ']') idx += path[i++];
                    if (path[i] === ']') i++;
                    tokens.push(parseInt(idx, 10));
                }
            } else {
                i++;
            }
        }
        return tokens;
    }

    function initSubTabs(containerSelector) {
        const container = document.querySelector(containerSelector);
        if (!container) return;
        const tabs = container.querySelectorAll('.sub-tab');
        const panels = container.querySelectorAll('.sub-panel');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                panels.forEach(p => p.classList.remove('active'));
                tab.classList.add('active');
                const target = container.querySelector('#' + tab.dataset.subtab);
                if (target) target.classList.add('active');
            });
        });
    }

    function getHistory(toolId) {
        try {
            const all = JSON.parse(localStorage.getItem(HISTORY_KEY) || '{}');
            return all[toolId] || [];
        } catch (e) {
            return [];
        }
    }

    function pushHistory(toolId, content, label) {
        if (typeof DevKitCore !== 'undefined' && !DevKitCore.canPersistLocally()) {
            toast('敏感模式下已禁用历史记录');
            return;
        }
        if (!content || !String(content).trim()) return;
        try {
            const all = JSON.parse(localStorage.getItem(HISTORY_KEY) || '{}');
            const list = (all[toolId] || []).filter(h => h.content !== content);
            list.unshift({
                content: content,
                label: label || new Date().toLocaleString('zh-CN'),
                ts: Date.now()
            });
            all[toolId] = list.slice(0, MAX_HISTORY);
            localStorage.setItem(HISTORY_KEY, JSON.stringify(all));
            refreshHistoryUI(toolId);
        } catch (e) { /* quota */ }
    }

    function refreshHistoryUI(toolId) {
        const wrap = document.querySelector('.history-panel[data-tool="' + toolId + '"]');
        if (!wrap) return;
        const listEl = wrap.querySelector('.history-list');
        if (!listEl) return;
        const items = getHistory(toolId);
        if (items.length === 0) {
            listEl.innerHTML = '<div class="history-empty">暂无历史</div>';
            return;
        }
        listEl.innerHTML = items.map((h, i) =>
            '<button class="history-item" data-idx="' + i + '" title="' + escAttr(h.label) + '">' +
            escHtml(h.label) + '<span class="history-preview">' + escHtml(String(h.content).substring(0, 60)) + '…</span></button>'
        ).join('');
        listEl.querySelectorAll('.history-item').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.idx, 10);
                const item = items[idx];
                const target = wrap.dataset.target;
                const el = document.getElementById(target);
                if (el && item) {
                    el.value = item.content;
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                    toast('已恢复历史记录');
                }
            });
        });
    }

    function bindHistorySave(toolId, inputId, getLabel) {
        const input = document.getElementById(inputId);
        if (!input) return;
        refreshHistoryUI(toolId);
        const saveBtn = document.querySelector('.history-save[data-tool="' + toolId + '"]');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                pushHistory(toolId, input.value, getLabel ? getLabel() : undefined);
                toast('已保存到历史');
            });
        }
    }

    function getWorkspace() {
        try {
            return JSON.parse(localStorage.getItem(WORKSPACE_KEY) || '[]');
        } catch (e) {
            return [];
        }
    }

    function saveWorkspaceItem(name, toolId, content, fields) {
        if (typeof DevKitCore !== 'undefined' && !DevKitCore.canPersistLocally()) {
            toast('敏感模式下已禁用工作区');
            return;
        }
        const list = getWorkspace().filter(w => w.name !== name);
        const item = { name, toolId, content, ts: Date.now() };
        if (fields && typeof fields === 'object' && Object.keys(fields).length > 0) {
            item.fields = fields;
        }
        list.unshift(item);
        localStorage.setItem(WORKSPACE_KEY, JSON.stringify(list.slice(0, 50)));
        refreshWorkspaceUI();
    }

    function applyWorkspaceItem(w) {
        if (w.fields && typeof w.fields === 'object') {
            Object.keys(w.fields).forEach(id => {
                const el = document.getElementById(id);
                if (!el) return;
                if (el.type === 'checkbox') {
                    el.checked = w.fields[id] === true || w.fields[id] === '1';
                } else {
                    el.value = w.fields[id];
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                }
            });
        } else if (w.content != null) {
            const el = document.getElementById(w.toolId + '-input')
                || document.getElementById(w.toolId + '-text')
                || document.querySelector('#panel-' + w.toolId + ' textarea:not([readonly])');
            if (el) {
                el.value = w.content;
                el.dispatchEvent(new Event('input', { bubbles: true }));
            }
        }
        document.dispatchEvent(new Event('empty-sync'));
    }

    function refreshWorkspaceUI() {
        const listEl = document.getElementById('workspace-list');
        if (!listEl) return;
        const items = getWorkspace();
        if (items.length === 0) {
            listEl.innerHTML = '<div class="history-empty">工作区为空，在工具栏点击「存工作区」保存</div>';
            return;
        }
        listEl.innerHTML = items.map((w, i) =>
            '<div class="workspace-item">' +
            '<span class="ws-name">' + escHtml(w.name) + '</span>' +
            '<span class="ws-tool">' + escHtml(w.toolId) + '</span>' +
            '<button class="btn-xs ws-load" data-idx="' + i + '">加载</button>' +
            '<button class="btn-xs ws-del" data-idx="' + i + '">删</button></div>'
        ).join('');
        listEl.querySelectorAll('.ws-load').forEach(btn => {
            btn.addEventListener('click', () => {
                const w = items[parseInt(btn.dataset.idx, 10)];
                activateTab(w.toolId);
                setTimeout(() => {
                    applyWorkspaceItem(w);
                    toast('已加载: ' + w.name);
                }, 80);
            });
        });
        listEl.querySelectorAll('.ws-del').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.idx, 10);
                const list = getWorkspace();
                list.splice(idx, 1);
                localStorage.setItem(WORKSPACE_KEY, JSON.stringify(list));
                refreshWorkspaceUI();
            });
        });
    }

    function exportWorkspace() {
        const data = JSON.stringify(getWorkspace(), null, 2);
        if (typeof DevKitCore !== 'undefined') {
            DevKitCore.downloadText('devkit-workspace.json', data);
        } else {
            downloadText('devkit-workspace.json', data);
        }
    }

    function importWorkspaceFile(file) {
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const list = JSON.parse(reader.result);
                if (!Array.isArray(list)) throw new Error('格式错误');
                localStorage.setItem(WORKSPACE_KEY, JSON.stringify(list.slice(0, 50)));
                refreshWorkspaceUI();
                toast('工作区已导入');
            } catch (e) {
                toast('导入失败: ' + e.message);
            }
        };
        reader.readAsText(file);
    }

    function initWorkspace() {
        refreshWorkspaceUI();
        document.querySelectorAll('.workspace-save').forEach(btn => {
            btn.addEventListener('click', () => {
                const toolId = btn.dataset.tool;
                const inputId = btn.dataset.input;
                const fieldIds = btn.dataset.fields
                    ? btn.dataset.fields.split(',').map(s => s.trim()).filter(Boolean)
                    : (inputId ? [inputId] : []);
                const fields = {};
                let hasContent = false;
                fieldIds.forEach(id => {
                    const el = document.getElementById(id);
                    if (!el) return;
                    if (el.type === 'checkbox') {
                        fields[id] = el.checked;
                        return;
                    }
                    if (String(el.value || '').trim()) {
                        fields[id] = el.value;
                        hasContent = true;
                    }
                });
                if (!hasContent) { toast('内容为空'); return; }
                const name = prompt('工作区名称:', toolId + ' ' + new Date().toLocaleTimeString('zh-CN'));
                if (!name) return;
                const primary = inputId && fields[inputId] != null
                    ? fields[inputId]
                    : fields[fieldIds.find(fid => {
                        const e = document.getElementById(fid);
                        return e && e.type !== 'checkbox';
                    })] || '';
                const multi = btn.dataset.fields ? fields : null;
                saveWorkspaceItem(name, toolId, primary, multi);
                toast('已保存到工作区');
            });
        });
        const toggle = document.getElementById('workspace-toggle');
        const drawer = document.getElementById('workspace-drawer');
        if (toggle && drawer) {
            toggle.addEventListener('click', () => drawer.classList.toggle('open'));
        }
        document.getElementById('workspace-export')?.addEventListener('click', exportWorkspace);
        const importInput = document.getElementById('workspace-import');
        importInput?.addEventListener('change', () => {
            const file = importInput.files && importInput.files[0];
            if (file) importWorkspaceFile(file);
            importInput.value = '';
        });
    }

    function initDragDrop(textareaIds) {
        (textareaIds || []).forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            el.addEventListener('dragover', e => { e.preventDefault(); el.classList.add('drag-over'); });
            el.addEventListener('dragleave', () => el.classList.remove('drag-over'));
            el.addEventListener('drop', e => {
                e.preventDefault();
                el.classList.remove('drag-over');
                const file = e.dataTransfer.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = () => {
                        el.value = reader.result;
                        el.dispatchEvent(new Event('input', { bubbles: true }));
                        toast('已导入: ' + file.name);
                    };
                    reader.readAsText(file);
                }
            });
        });
    }

    function initResizer(gripId, leftSelector, rightSelector) {
        const grip = document.getElementById(gripId);
        const left = document.querySelector(leftSelector);
        const right = document.querySelector(rightSelector);
        if (!grip || !left || !right) return;
        let dragging = false;
        grip.addEventListener('mousedown', e => {
            dragging = true;
            document.body.style.cursor = 'col-resize';
            e.preventDefault();
        });
        document.addEventListener('mousemove', e => {
            if (!dragging) return;
            const parent = left.parentElement;
            const rect = parent.getBoundingClientRect();
            const pct = Math.min(80, Math.max(20, ((e.clientX - rect.left) / rect.width) * 100));
            left.style.flex = '0 0 ' + pct + '%';
            right.style.flex = '1';
        });
        document.addEventListener('mouseup', () => {
            dragging = false;
            document.body.style.cursor = '';
        });
    }

    function initGlobalShortcuts() {
        if (typeof DevKitCore !== 'undefined') return;
        document.addEventListener('keydown', e => {
            if (e.ctrlKey && e.key === 'Enter') {
                const panel = document.querySelector('.panel.active');
                if (!panel) return;
                const primary = panel.querySelector('.btn.primary');
                if (primary) { e.preventDefault(); primary.click(); }
            }
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                const panel = document.querySelector('.panel.active');
                const ta = panel && panel.querySelector('textarea:not([readonly])');
                if (ta && ta.value) copyText(ta.value);
            }
        });
    }

    async function fetchUrl(url) {
        if (typeof DevKitCore !== 'undefined') {
            return DevKitCore.fetchUrlSafe(url);
        }
        const res = await fetch('/api/fetch?url=' + encodeURIComponent(url));
        const data = await res.json();
        if (!data.success) throw new Error(data.message || '拉取失败');
        return data.content;
    }

    function showInlineModal(title, value, onConfirm) {
        let modal = document.getElementById('inline-edit-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'inline-edit-modal';
            modal.className = 'inline-modal hidden';
            modal.innerHTML =
                '<div class="inline-modal-backdrop"></div>' +
                '<div class="inline-modal-box">' +
                '<h4 class="inline-modal-title"></h4>' +
                '<p class="inline-modal-path"></p>' +
                '<textarea class="inline-modal-input" spellcheck="false"></textarea>' +
                '<div class="inline-modal-actions">' +
                '<button class="btn primary inline-modal-ok">确定</button>' +
                '<button class="btn inline-modal-cancel">取消</button></div></div>';
            document.body.appendChild(modal);
            modal.querySelector('.inline-modal-backdrop').addEventListener('click', () => modal.classList.add('hidden'));
            modal.querySelector('.inline-modal-cancel').addEventListener('click', () => modal.classList.add('hidden'));
        }
        modal.querySelector('.inline-modal-title').textContent = title;
        modal.querySelector('.inline-modal-path').textContent = '';
        const input = modal.querySelector('.inline-modal-input');
        input.value = typeof value === 'string' ? value : JSON.stringify(value);
        modal.classList.remove('hidden');
        input.focus();
        const ok = modal.querySelector('.inline-modal-ok');
        const handler = () => {
            ok.removeEventListener('click', handler);
            modal.classList.add('hidden');
            onConfirm(input.value);
        };
        ok.addEventListener('click', handler);
    }

    function escHtml(s) {
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function escAttr(s) {
        return String(s).replace(/"/g, '&quot;');
    }

    return {
        VERSION,
        parseHash, clearHash, activateTab, toggleFocusMode, setByPath, initSubTabs,
        initTheme, getHistory, pushHistory, bindHistorySave, refreshHistoryUI,
        getWorkspace, saveWorkspaceItem, refreshWorkspaceUI, exportWorkspace, initWorkspace,
        initDragDrop, initResizer, initGlobalShortcuts, fetchUrl, showInlineModal,
        saveSettings, getSettings
    };
})();
