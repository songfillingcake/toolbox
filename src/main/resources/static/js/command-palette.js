/**
 * Ctrl+K 命令面板：跳转工具、加载示例、切换主题
 */
const CommandPalette = (() => {

    let modal, input, listEl, items = [], activeIdx = 0;

    function icon(name) {
        return typeof DevKitIcons !== 'undefined' ? DevKitIcons.render(name, 15) : '';
    }

    function buildItems() {
        items = [];
        if (typeof Nav !== 'undefined' && Nav.TAB_META) {
            Object.keys(Nav.TAB_META).forEach(tab => {
                const m = Nav.TAB_META[tab];
                const extra = (Nav.TAB_KEYWORDS && Nav.TAB_KEYWORDS[tab]) || '';
                items.push({
                    type: 'goto', tab,
                    label: m.label, iconKey: tab,
                    keywords: tab + ' ' + m.label + ' ' + extra
                });
            });
        }
        items.push(
            { type: 'action', id: 'share', label: '复制当前工具链接', iconKey: 'link', keywords: 'share 分享 链接 url' },
            { type: 'action', id: 'theme', label: '切换主题', iconKey: 'theme', keywords: 'theme 主题 暗色 亮色' },
            { type: 'action', id: 'workspace', label: '打开工作区', iconKey: 'workspace', keywords: 'workspace 工作区' },
            { type: 'action', id: 'sensitive', label: '切换敏感模式', iconKey: 'sensitive', keywords: 'sensitive 敏感 安全' },
            { type: 'action', id: 'example', label: '加载当前工具示例', iconKey: 'example', keywords: 'example 示例 demo' }
        );
    }

    function render(keyword) {
        const q = (keyword || '').trim().toLowerCase();
        const filtered = q ? items.filter(i => i.keywords.toLowerCase().includes(q) || i.label.toLowerCase().includes(q)) : items;
        activeIdx = 0;
        if (filtered.length === 0) {
            listEl.innerHTML = '<div class="cmd-empty">无匹配命令</div>';
            return;
        }
        listEl.innerHTML = filtered.map((item, i) =>
            '<button class="cmd-item' + (i === 0 ? ' active' : '') + '" data-idx="' + i + '">' +
            '<span class="cmd-icon">' + icon(item.iconKey) + '</span>' +
            '<span class="cmd-label">' + item.label + '</span>' +
            '<span class="cmd-type">' + (item.type === 'goto' ? '跳转' : '操作') + '</span></button>'
        ).join('');
        listEl._filtered = filtered;
        listEl.querySelectorAll('.cmd-item').forEach(btn => {
            btn.addEventListener('click', () => execute(filtered[parseInt(btn.dataset.idx, 10)]));
        });
    }

    function execute(item) {
        close();
        if (!item) return;
        if (item.type === 'goto') {
            Nav.activateTab(item.tab);
            return;
        }
        if (item.id === 'theme') document.getElementById('theme-toggle')?.click();
        if (item.id === 'share' && typeof DevKitCore !== 'undefined') DevKitCore.copyShareLink();
        if (item.id === 'workspace') document.getElementById('workspace-toggle')?.click();
        if (item.id === 'sensitive') document.getElementById('sensitive-toggle')?.click();
        if (item.id === 'example') {
            const panel = document.querySelector('.panel.active');
            const tool = panel?.dataset.tool;
            if (tool) DevKitExamples.load(tool);
        }
    }

    function open() {
        buildItems();
        modal.classList.remove('hidden');
        input.value = '';
        render('');
        input.focus();
    }

    function close() {
        modal.classList.add('hidden');
    }

    function init() {
        modal = document.getElementById('command-palette');
        if (!modal) return;
        input = modal.querySelector('.cmd-input');
        listEl = modal.querySelector('.cmd-list');

        document.addEventListener('keydown', e => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                modal.classList.contains('hidden') ? open() : close();
            }
        });

        modal.querySelector('.cmd-backdrop').addEventListener('click', close);
        input.addEventListener('input', () => render(input.value));
        input.addEventListener('keydown', e => {
            const filtered = listEl._filtered || [];
            if (e.key === 'Escape') { close(); return; }
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                activeIdx = Math.min(activeIdx + 1, filtered.length - 1);
                highlightItem(activeIdx);
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                activeIdx = Math.max(activeIdx - 1, 0);
                highlightItem(activeIdx);
            }
            if (e.key === 'Enter') {
                e.preventDefault();
                execute(filtered[activeIdx]);
            }
        });
    }

    function highlightItem(idx) {
        listEl.querySelectorAll('.cmd-item').forEach((el, i) => el.classList.toggle('active', i === idx));
    }

    return { init, open };
})();

function initCommandPalette() {
    CommandPalette.init();
}
