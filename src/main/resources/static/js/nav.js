/**
 * 侧栏导航：搜索、折叠、最近使用、收藏、面包屑
 */
const Nav = (() => {
    const RECENT_KEY = 'devkit_nav_recent';
    const COLLAPSE_KEY = 'devkit_nav_collapsed';
    const PINS_KEY = 'devkit_nav_pins';
    const MAX_RECENT = 5;
    const MAX_PINS = 6;

    const TAB_GROUP = {
        mybatis: '基础工具', sql: '基础工具', cron: '基础工具', timestamp: '基础工具', uuid: '基础工具', textdiff: '基础工具', linechart: '基础工具',
        json: 'Pro 工具', encode: 'Pro 工具', redis: 'Pro 工具', config: 'Pro 工具', regex: 'Pro 工具', hash: 'Pro 工具', jwt: 'Pro 工具', dotenv: 'Pro 工具',
        explain: '开发调试', log: '开发调试', jstack: '开发调试', maven: '开发调试', mock: '开发调试', faker: '开发调试'
    };

    const TAB_META = {
        mybatis: { label: 'MyBatis → SQL' },
        sql: { label: 'SQL 格式化' },
        cron: { label: 'Cron 解析' },
        timestamp: { label: '时间戳转换' },
        uuid: { label: 'UUID 生成' },
        textdiff: { label: '文本 Diff' },
        linechart: { label: '折线图' },
        json: { label: 'JSON Pro' },
        encode: { label: '编码 Pro' },
        redis: { label: 'Redis Pro' },
        config: { label: '配置互转' },
        regex: { label: '正则测试' },
        hash: { label: 'Hash 签名' },
        jwt: { label: 'JWT 解码' },
        dotenv: { label: '.env 解析' },
        explain: { label: 'EXPLAIN 助手' },
        log: { label: '日志高亮' },
        jstack: { label: 'jstack 分析' },
        maven: { label: 'Maven 冲突' },
        mock: { label: 'Mock 生成' },
        faker: { label: '测试数据' }
    };

    const TAB_KEYWORDS = {
        mybatis: 'mybatis sql 日志 转换',
        sql: 'sql 格式化 美化',
        cron: 'cron 定时 调度',
        timestamp: '时间戳 日期 unix',
        uuid: 'uuid guid 唯一',
        textdiff: 'diff 对比 文本 配置 patch 差异',
        linechart: '折线图 chart 图表 曲线 csv 数据可视化',
        json: 'json 格式化 校验',
        encode: 'base64 url jwt 编码 解码',
        redis: 'redis 命令',
        config: 'yaml properties 配置 spring',
        regex: '正则 表达式 匹配',
        hash: 'hash md5 sha hmac 签名',
        jwt: 'jwt token 解码 payload header 过期',
        dotenv: 'env dotenv 环境变量 properties shell yaml',
        explain: 'explain 执行计划 索引',
        log: 'log 日志 高亮',
        jstack: 'jstack 线程 dump',
        maven: 'maven 依赖 冲突',
        mock: 'mock controller 接口',
        faker: '假数据 mock 测试数据 生成 用户 订单'
    };

    function iconHtml(tab, size) {
        if (typeof DevKitIcons === 'undefined') return '';
        return DevKitIcons.render(tab, size || 14);
    }

    function getPins() {
        try { return JSON.parse(localStorage.getItem(PINS_KEY) || '[]'); }
        catch (e) { return []; }
    }

    function togglePin(tab, e) {
        if (e) e.stopPropagation();
        let pins = getPins();
        if (pins.includes(tab)) {
            pins = pins.filter(t => t !== tab);
            toast('已取消收藏');
        } else {
            if (pins.length >= MAX_PINS) {
                toast('最多收藏 ' + MAX_PINS + ' 个工具');
                return;
            }
            pins = [tab, ...pins];
            toast('已收藏');
        }
        localStorage.setItem(PINS_KEY, JSON.stringify(pins));
        renderPins();
        updatePinButtons();
    }

    function renderPins() {
        const wrap = document.getElementById('nav-pins');
        const listEl = document.getElementById('nav-pins-list');
        if (!wrap || !listEl) return;
        const pins = getPins();
        if (pins.length === 0) { wrap.classList.add('hidden'); return; }
        wrap.classList.remove('hidden');
        listEl.innerHTML = pins.map(tab => {
            const m = TAB_META[tab];
            if (!m) return '';
            return '<button class="nav-recent-item nav-pin-item" data-tab="' + tab + '">' +
                '<span class="nav-icon">' + iconHtml(tab) + '</span>' + m.label + '</button>';
        }).join('');
        listEl.querySelectorAll('.nav-pin-item').forEach(btn => {
            btn.addEventListener('click', () => activateTab(btn.dataset.tab));
        });
    }

    function updatePinButtons() {
        const pins = getPins();
        document.querySelectorAll('.nav-item').forEach(item => {
            const tab = item.dataset.tab;
            const pin = item.querySelector('.nav-pin');
            if (pin) {
                const on = pins.includes(tab);
                pin.classList.toggle('pinned', on);
                pin.innerHTML = iconHtml(on ? 'star-filled' : 'star', 12);
            }
        });
    }

    function updateBreadcrumb(tab) {
        const el = document.getElementById('breadcrumb');
        if (!el || !TAB_META[tab]) return;
        const group = TAB_GROUP[tab] || '工具';
        const label = TAB_META[tab].label;
        el.innerHTML = '<span class="bc-group">' + group + '</span>' +
            '<span class="bc-sep">/</span>' +
            '<span class="bc-current">' + label + '</span>';
        document.title = label + ' · DevKit';
    }

    function getRecent() {
        try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); }
        catch (e) { return []; }
    }

    function pushRecent(tab) {
        if (!TAB_META[tab]) return;
        const list = getRecent().filter(t => t !== tab);
        list.unshift(tab);
        localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, MAX_RECENT)));
        renderRecent();
    }

    function renderRecent() {
        const wrap = document.getElementById('nav-recent');
        const listEl = document.getElementById('nav-recent-list');
        if (!wrap || !listEl) return;
        const recent = getRecent();
        if (recent.length === 0) { wrap.classList.add('hidden'); return; }
        wrap.classList.remove('hidden');
        listEl.innerHTML = recent.map(tab => {
            const m = TAB_META[tab];
            if (!m) return '';
            return '<button class="nav-recent-item" data-tab="' + tab + '">' +
                '<span class="nav-icon">' + iconHtml(tab) + '</span>' + m.label + '</button>';
        }).join('');
        listEl.querySelectorAll('.nav-recent-item').forEach(btn => {
            btn.addEventListener('click', () => activateTab(btn.dataset.tab));
        });
    }

    function syncPanelIcon(tab) {
        document.querySelectorAll('.panel-header .panel-icon-wrap').forEach(el => el.remove());
        const header = document.querySelector('#panel-' + tab + ' .panel-header');
        if (!header || typeof DevKitIcons === 'undefined') return;
        const wrap = document.createElement('div');
        wrap.className = 'panel-icon-wrap';
        wrap.innerHTML = iconHtml(tab, 18);
        header.insertBefore(wrap, header.firstChild);
        header.classList.add('with-icon');
    }

    function activateTab(tab) {
        document.querySelectorAll('.nav-item').forEach(b => {
            b.classList.toggle('active', b.dataset.tab === tab);
        });
        document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
        const panel = document.getElementById('panel-' + tab);
        if (panel) panel.classList.add('active');
        pushRecent(tab);
        updateBreadcrumb(tab);
        syncPanelIcon(tab);
        scrollActiveIntoView();
        if (!window._devkitRestoringHash) {
            const nextHash = 'tab=' + encodeURIComponent(tab);
            if (window.location.hash !== '#' + nextHash) {
                history.replaceState(null, '', '#' + nextHash);
            }
        }
        window.dispatchEvent(new CustomEvent('devkit:tab-change', { detail: { tab } }));
    }

    function scrollActiveIntoView() {
        const active = document.querySelector('.nav-item.active');
        if (active) active.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }

    function getCollapsed() {
        try { return JSON.parse(localStorage.getItem(COLLAPSE_KEY) || '{}'); }
        catch (e) { return {}; }
    }

    function setGroupCollapsed(groupEl, collapsed) {
        groupEl.classList.toggle('collapsed', collapsed);
        const header = groupEl.querySelector('.nav-group-header');
        if (header) header.setAttribute('aria-expanded', String(!collapsed));
        const id = groupEl.dataset.group;
        if (id) {
            const state = getCollapsed();
            state[id] = collapsed;
            localStorage.setItem(COLLAPSE_KEY, JSON.stringify(state));
        }
    }

    function initGroups() {
        const collapsed = getCollapsed();
        document.querySelectorAll('.nav-group').forEach(group => {
            const id = group.dataset.group;
            if (collapsed[id]) setGroupCollapsed(group, true);
            group.querySelector('.nav-group-header')?.addEventListener('click', () => {
                setGroupCollapsed(group, !group.classList.contains('collapsed'));
            });
        });
        document.getElementById('nav-collapse-all')?.addEventListener('click', () => {
            const anyOpen = [...document.querySelectorAll('.nav-group')].some(g => !g.classList.contains('collapsed'));
            document.querySelectorAll('.nav-group').forEach(g => setGroupCollapsed(g, anyOpen));
        });
    }

    function filterNav(keyword) {
        const q = keyword.trim().toLowerCase();
        const clearBtn = document.getElementById('nav-search-clear');
        const emptyEl = document.getElementById('nav-empty');
        let totalVisible = 0;
        if (clearBtn) clearBtn.classList.toggle('hidden', !q);

        document.querySelectorAll('.nav-group').forEach(group => {
            let groupVisible = 0;
            group.querySelectorAll('.nav-item').forEach(item => {
                const label = (item.querySelector('.nav-label')?.textContent || '').toLowerCase();
                const tab = item.dataset.tab || '';
                const extra = (TAB_KEYWORDS[tab] || '').toLowerCase();
                const match = !q || label.includes(q) || tab.includes(q) || extra.includes(q);
                item.classList.toggle('hidden', !match);
                if (match) groupVisible++;
            });
            group.classList.toggle('hidden', groupVisible === 0);
            if (groupVisible > 0 && q) {
                group.classList.remove('collapsed');
                group.querySelector('.nav-group-header')?.setAttribute('aria-expanded', 'true');
            }
            totalVisible += groupVisible;
        });

        const recent = document.getElementById('nav-recent');
        const pins = document.getElementById('nav-pins');
        if (recent) recent.classList.toggle('hidden', !!q || getRecent().length === 0);
        if (pins) pins.classList.toggle('hidden', !!q || getPins().length === 0);
        if (emptyEl) emptyEl.classList.toggle('hidden', totalVisible > 0 || !q);
    }

    function initSearch() {
        const input = document.getElementById('nav-search');
        const clearBtn = document.getElementById('nav-search-clear');
        if (!input) return;

        input.addEventListener('input', () => filterNav(input.value));
        input.addEventListener('keydown', e => {
            if (e.key === 'Escape') { input.value = ''; filterNav(''); input.blur(); }
        });
        clearBtn?.addEventListener('click', () => { input.value = ''; filterNav(''); input.focus(); });

        document.addEventListener('keydown', e => {
            if (e.key === '/' && !/input|textarea/i.test(document.activeElement?.tagName)) {
                e.preventDefault();
                input.focus();
            }
        });
    }

    function initPins() {
        document.querySelectorAll('.nav-item').forEach(item => {
            if (item.querySelector('.nav-pin')) return;
            const pin = document.createElement('span');
            pin.className = 'nav-pin';
            pin.title = '收藏';
            pin.innerHTML = iconHtml('star', 12);
            pin.addEventListener('click', e => togglePin(item.dataset.tab, e));
            item.appendChild(pin);
        });
        updatePinButtons();
        renderPins();
    }

    function init() {
        if (typeof DevKitIcons !== 'undefined') DevKitIcons.mountNavIcons();
        document.querySelectorAll('.nav-item').forEach(btn => {
            btn.addEventListener('click', () => activateTab(btn.dataset.tab));
        });
        initGroups();
        initSearch();
        initPins();
        renderRecent();
        const hashTab = new URLSearchParams((window.location.hash || '').replace(/^#/, '')).get('tab');
        if (hashTab && TAB_META[hashTab]) {
            window._devkitRestoringHash = true;
            activateTab(hashTab);
            window._devkitRestoringHash = false;
        } else {
            const active = document.querySelector('.nav-item.active');
            if (active) {
                updateBreadcrumb(active.dataset.tab);
                syncPanelIcon(active.dataset.tab);
            }
        }
    }

    return { init, activateTab, TAB_META, TAB_GROUP, TAB_KEYWORDS };
})();

function initNav() { Nav.init(); }

if (typeof ProCommon !== 'undefined') {
    ProCommon.activateTab = Nav.activateTab;
}
