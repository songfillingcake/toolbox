/**
 * DevKit 核心 API：toast、复制、导出、错误提示、敏感模式、统一工具栏
 */
const DevKitCore = (() => {
    const VERSION = '1.10.0';
    const SETTINGS_KEY = 'devkit_settings_v1';
    const DEFAULT_MAX_INPUT = 512 * 1024;

    let serverConfig = {
        fetchEnabled: true,
        fetchAllowLocalhost: false,
        version: VERSION,
        maxInputChars: DEFAULT_MAX_INPUT
    };

    function getSettings() {
        try {
            return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
        } catch (e) {
            return {};
        }
    }

    function saveSettings(patch) {
        const s = Object.assign(getSettings(), patch);
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
        applySensitiveMode(s.sensitiveMode === true);
        return s;
    }

    function getServerConfig() {
        return Object.assign({}, serverConfig);
    }

    function getMaxInputChars() {
        return serverConfig.maxInputChars || DEFAULT_MAX_INPUT;
    }

    function isNetworkAllowed() {
        return !isSensitiveMode();
    }

    function canPersistLocally() {
        return !isSensitiveMode();
    }

    function guardInputSize(text, label) {
        const max = getMaxInputChars();
        if (text != null && text.length > max) {
            toast((label || '输入') + '超过 ' + Math.round(max / 1024) + 'KB 上限');
            return false;
        }
        return true;
    }

    function guardPanelInputs(panel) {
        if (!panel) return true;
        const fields = panel.querySelectorAll(
            'textarea:not([readonly]), input[type="text"]:not([readonly]), input:not([type]):not([readonly])');
        for (const field of fields) {
            if (field.closest('.hidden, .sub-panel:not(.active)')) continue;
            if (field.offsetParent === null && !field.closest('.sub-panel.active')) continue;
            const label = field.id ? field.id.replace(/-input$/, '') : '输入';
            if (!guardInputSize(field.value, label)) return false;
        }
        return true;
    }

    function initInputGuards() {
        document.addEventListener('click', e => {
            const btn = e.target.closest('.panel .btn');
            if (!btn || btn.classList.contains('ghost') || btn.classList.contains('btn-xs')) return;
            if (btn.id === 'nav-toggle' || btn.closest('.sidebar')) return;
            const panel = btn.closest('.panel');
            if (!panel || !guardPanelInputs(panel)) {
                e.preventDefault();
                e.stopImmediatePropagation();
            }
        }, true);
    }

    function copyShareLink() {
        const panel = document.querySelector('.panel.active');
        const tab = panel && panel.id ? panel.id.replace('panel-', '') : '';
        if (!tab) { toast('无法生成分享链接'); return; }
        const url = location.origin + location.pathname + '#tab=' + encodeURIComponent(tab);
        copyText(url);
    }

    function clearSensitiveLocalData() {
        if (!confirm('清除历史、工作区、收藏与最近使用记录？')) return;
        ['devkit_history_v1', 'devkit_workspace_v1', 'devkit_nav_pins', 'devkit_nav_recent']
            .forEach(k => localStorage.removeItem(k));
        toast('本地数据已清除');
        location.reload();
    }

    function initMobileNav() {
        const toggle = document.getElementById('nav-toggle');
        const backdrop = document.getElementById('nav-backdrop');
        const sidebar = document.querySelector('.sidebar');
        if (toggle && typeof DevKitIcons !== 'undefined') {
            toggle.innerHTML = DevKitIcons.render('menu', 16);
            toggle.classList.add('tooltip-host');
            toggle.setAttribute('data-tooltip', '菜单');
        }
        if (!toggle || !sidebar) return;
        const open = () => {
            sidebar.classList.add('open');
            backdrop?.classList.remove('hidden');
            document.body.classList.add('nav-open');
        };
        const close = () => {
            sidebar.classList.remove('open');
            backdrop?.classList.add('hidden');
            document.body.classList.remove('nav-open');
        };
        toggle.addEventListener('click', () => {
            sidebar.classList.contains('open') ? close() : open();
        });
        backdrop?.addEventListener('click', close);
        window.addEventListener('devkit:tab-change', close);
    }

    function initSensitiveBannerActions() {
        document.getElementById('sensitive-clear-local')?.addEventListener('click', clearSensitiveLocalData);
    }

    function toast(msg) {
        const el = document.getElementById('toast');
        if (!el) return;
        el.textContent = msg;
        el.classList.add('show');
        setTimeout(() => el.classList.remove('show'), 2200);
    }

    function copyText(text) {
        if (!text) { toast('没有可复制的内容'); return Promise.resolve(false); }
        return navigator.clipboard.writeText(text).then(() => {
            toast('已复制到剪贴板');
            return true;
        });
    }

    function downloadText(filename, text) {
        if (!text) { toast('没有可导出的内容'); return; }
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
        URL.revokeObjectURL(a.href);
        toast('已导出 ' + filename);
    }

    function showError(containerId, title, detail, hint) {
        const el = document.getElementById(containerId);
        if (!el) return;
        el.classList.remove('hidden');
        el.innerHTML =
            '<strong>' + esc(title) + '</strong>' +
            (detail ? '<div class="error-detail">' + esc(detail) + '</div>' : '') +
            (hint ? '<div class="error-hint">' + esc(hint) + '</div>' : '');
    }

    function hideError(containerId) {
        const el = document.getElementById(containerId);
        if (el) el.classList.add('hidden');
    }

    function esc(s) {
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
    }

    function isSensitiveMode() {
        return getSettings().sensitiveMode === true;
    }

    function applyFetchPolicy() {
        const fetchOk = serverConfig.fetchEnabled && isNetworkAllowed();
        document.querySelectorAll('.json-url-bar').forEach(bar => {
            bar.classList.toggle('hidden', !serverConfig.fetchEnabled);
            bar.classList.toggle('disabled', !fetchOk);
        });
        const ver = document.getElementById('app-version');
        if (ver && serverConfig.version) ver.textContent = 'v' + serverConfig.version;
        if (typeof TextDiff !== 'undefined' && serverConfig.maxDiffLines) {
            TextDiff.setMaxLines(serverConfig.maxDiffLines);
        }
    }

    function applySensitiveMode(on) {
        document.body.classList.toggle('sensitive-mode', on);
        const banner = document.getElementById('sensitive-banner');
        if (banner) banner.classList.toggle('hidden', !on);
        const toggle = document.getElementById('sensitive-toggle');
        if (toggle) {
            toggle.classList.toggle('active', on);
            toggle.setAttribute('data-tooltip', on ? '敏感模式已开启' : '开启敏感模式');
        }
        document.querySelectorAll('.history-save, .workspace-save').forEach(btn => {
            btn.disabled = on;
            btn.classList.toggle('disabled', on);
        });
        applyFetchPolicy();
    }

    function initSensitiveMode() {
        applySensitiveMode(isSensitiveMode());
        const toggle = document.getElementById('sensitive-toggle');
        if (toggle) {
            toggle.addEventListener('click', () => {
                const next = !isSensitiveMode();
                saveSettings({ sensitiveMode: next });
                toast(next ? '敏感模式：禁止网络请求与本地持久化' : '敏感模式已关闭');
            });
        }
    }

    async function loadServerConfig() {
        try {
            const res = await fetch('/api/config');
            if (res.ok) {
                serverConfig = Object.assign(serverConfig, await res.json());
            }
        } catch (e) {
            /* 离线或静态部署 */
        }
        applyFetchPolicy();
    }

    async function fetchUrlSafe(url) {
        if (!serverConfig.fetchEnabled) {
            throw new Error('服务端已禁用 URL 拉取');
        }
        if (isSensitiveMode()) {
            throw new Error('敏感模式下禁止远程 URL 拉取');
        }
        const res = await fetch('/api/fetch?url=' + encodeURIComponent(url));
        if (res.status === 429) {
            throw new Error('请求过于频繁，请稍后再试');
        }
        const data = await res.json();
        if (!data.success) throw new Error(data.message || '拉取失败');
        return data.content;
    }

    function injectExampleButtons() {
        if (typeof DevKitExamples === 'undefined') return;
        document.querySelectorAll('.panel[data-tool]').forEach(panel => {
            const tool = panel.dataset.tool;
            if (!DevKitExamples[tool]) return;
            const toolbar = panel.querySelector('.toolbar');
            if (!toolbar || toolbar.querySelector('.btn-load-example')) return;
            const btn = document.createElement('button');
            btn.className = 'btn ghost btn-load-example';
            btn.textContent = '加载示例';
            btn.addEventListener('click', () => DevKitExamples.load(tool));
            toolbar.insertBefore(btn, toolbar.firstChild);
        });
        if (typeof DevKitIcons !== 'undefined') DevKitIcons.mountToolbarIcons();
    }

    function showPanelError(toolId, title, detail, hint) {
        const el = document.getElementById(toolId + '-error')
            || document.querySelector('#panel-' + toolId + ' .tool-error');
        if (el) {
            showError(el.id, title, detail, hint);
        } else {
            toast(title + (detail ? '：' + detail : ''));
        }
    }

    function hidePanelError(toolId) {
        const el = document.getElementById(toolId + '-error')
            || document.querySelector('#panel-' + toolId + ' .tool-error');
        if (el) hideError(el.id);
    }

    function getActivePanelResultText() {
        const panel = document.querySelector('.panel.active');
        if (!panel) return '';
        const roAreas = panel.querySelectorAll('textarea[readonly]');
        for (const ro of roAreas) {
            if (String(ro.value || '').trim()) return ro.value;
        }
        const jsonExtract = panel.querySelector('#log-json-extract');
        if (jsonExtract && String(jsonExtract.value || '').trim()) return jsonExtract.value;
        const jwtPayload = panel.querySelector('#jwt-payload');
        if (jwtPayload && String(jwtPayload.value || '').trim()) return jwtPayload.value;
        const jwtPanelPayload = panel.querySelector('#jwt-panel-payload');
        if (jwtPanelPayload && String(jwtPanelPayload.value || '').trim()) return jwtPanelPayload.value;
        const divSelectors = [
            '#textdiff-result', '#explain-result', '#jstack-result', '#maven-result',
            '#regex-highlight', '#log-output', '#jwt-claims-info'
        ];
        for (const sel of divSelectors) {
            const el = panel.querySelector(sel);
            if (el && String(el.textContent || '').trim()) return el.textContent;
        }
        return '';
    }

    function initEncodeExampleButton() {
        document.querySelector('.encode-example-btn')?.addEventListener('click', () => {
            if (typeof DevKitExamples !== 'undefined') DevKitExamples.load('encode');
        });
    }
    function bindResultActions() {
        document.querySelectorAll('[data-copy-target]').forEach(btn => {
            btn.addEventListener('click', () => {
                const el = document.getElementById(btn.dataset.copyTarget);
                if (el) copyText(el.value || el.textContent || '');
            });
        });
        document.querySelectorAll('[data-export-target]').forEach(btn => {
            btn.addEventListener('click', () => {
                const el = document.getElementById(btn.dataset.exportTarget);
                const name = btn.dataset.exportName || 'export.txt';
                if (el) downloadText(name, el.value || el.textContent || '');
            });
        });
    }

    function initGlobalShortcuts() {
        document.addEventListener('keydown', e => {
            if (e.ctrlKey && e.key === 'Enter') {
                const panel = document.querySelector('.panel.active');
                const primary = panel && panel.querySelector('.btn.primary');
                if (primary) { e.preventDefault(); primary.click(); }
            }
            if (e.ctrlKey && e.shiftKey && e.key === 'C') {
                e.preventDefault();
                const text = getActivePanelResultText();
                if (text) copyText(text);
                else toast('当前面板无可复制结果');
            }
        });
    }

    async function init() {
        injectExampleButtons();
        initEncodeExampleButton();
        bindResultActions();
        initGlobalShortcuts();
        initInputGuards();
        initSensitiveMode();
        initSensitiveBannerActions();
        initMobileNav();
        document.getElementById('share-link-btn')?.addEventListener('click', copyShareLink);
        const shareBtn = document.getElementById('share-link-btn');
        if (shareBtn && typeof DevKitIcons !== 'undefined') {
            shareBtn.innerHTML = DevKitIcons.render('link', 15);
        }
        await loadServerConfig();
        if (typeof DevKitIcons !== 'undefined') DevKitIcons.mountChromeIcons();
    }

    return {
        VERSION, toast, copyText, downloadText, showError, hideError, esc,
        showPanelError, hidePanelError, getActivePanelResultText,
        isSensitiveMode, isNetworkAllowed, canPersistLocally, guardInputSize, guardPanelInputs,
        saveSettings, getSettings, getServerConfig, getMaxInputChars, copyShareLink,
        clearSensitiveLocalData, fetchUrlSafe, loadServerConfig, init
    };
})();

function toast(msg) { DevKitCore.toast(msg); }
function copyText(text) { return DevKitCore.copyText(text); }
function downloadText(filename, text) { DevKitCore.downloadText(filename, text); }
