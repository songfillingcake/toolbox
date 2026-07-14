/**
 * 编辑器 / 结果区空状态占位
 */
const EmptyStates = (() => {

    const OUTPUTS = [
        { id: 'mybatis-output', icon: 'mybatis', title: '等待转换', desc: '粘贴 MyBatis 日志，点击「转换 SQL」' },
        { id: 'sql-output', icon: 'sql', title: '等待格式化', desc: '输入 SQL 后点击「美化 SQL」' },
        { id: 'json-path-result', icon: 'json', title: 'JSONPath 结果', desc: '输入路径表达式后点击「查询」' },
        { id: 'java-gen-output', icon: 'mock', title: 'Java 代码预览', desc: '在 JSON 编辑器输入数据后生成' },
        { id: 'json-sql-output', icon: 'sql', title: 'INSERT 预览', desc: '从 JSON 数组生成 SQL 语句' },
        { id: 'tsgo-output', icon: 'json', title: '结构体预览', desc: '从 JSON 生成 TypeScript / Go' },
        { id: 'mock-gen-output', icon: 'mock', title: 'Controller 预览', desc: '从 JSON Pro 生成 Mock 接口' },
        { id: 'config-output', icon: 'config', title: '转换结果', desc: '选择格式后点击「转换」' },
        { id: 'hash-output', icon: 'hash', title: '哈希结果', desc: '输入字符串后点击「计算」' },
        { id: 'b64-output', icon: 'encode', title: '编码结果', desc: '输入内容后执行编码或解码' },
        { id: 'url-output', icon: 'encode', title: 'URL 结果', desc: '输入 URL 或文本后转换' },
        { id: 'uuid-output', icon: 'uuid', title: 'UUID 列表', desc: '设置数量后点击「生成」' },
        { id: 'dotenv-output', icon: 'dotenv', title: '转换结果', desc: '粘贴 .env 后点击「转换」' },
        { id: 'faker-output', icon: 'faker', title: 'JSON 预览', desc: '选择类型与数量后点击「生成」' }
    ];

    const RESULT_PANELS = [
        { id: 'explain-result', icon: 'explain', title: '等待分析', desc: '粘贴 EXPLAIN 输出后点击「分析」' },
        { id: 'maven-result', icon: 'maven', title: '依赖冲突报告', desc: '粘贴 dependency:tree 输出' },
        { id: 'jstack-result', icon: 'jstack', title: '线程分析报告', desc: '粘贴 jstack 输出后分析' },
        { id: 'json-diff-result', icon: 'json', title: 'Diff 结果', desc: '输入两份 JSON 后点击「对比」' },
        { id: 'log-output', icon: 'log', title: '高亮预览', desc: '粘贴日志后点击「高亮」' },
        { id: 'regex-highlight', icon: 'regex', title: '匹配预览', desc: '输入正则和文本后测试' },
        { id: 'textdiff-result', icon: 'textdiff', title: 'Diff 结果', desc: '输入两份文本后点击「对比」' }
    ];

    const watches = [];

    function isFilled(el) {
        if (!el) return false;
        const v = el.value !== undefined ? el.value : el.textContent;
        if (!v || !String(v).trim()) return false;
        if (String(v).trim() === '—') return false;
        if (String(v).trim().startsWith('//')) return false;
        return true;
    }

    function wrapField(el) {
        if (el.parentElement && el.parentElement.classList.contains('empty-field-wrap')) {
            return el.parentElement;
        }
        const wrap = document.createElement('div');
        wrap.className = 'empty-field-wrap has-empty-state';
        el.parentElement.insertBefore(wrap, el);
        wrap.appendChild(el);
        return wrap;
    }

    function createOverlay(box, cfg) {
        if (box.querySelector('.empty-state')) return box.querySelector('.empty-state');
        const empty = document.createElement('div');
        empty.className = 'empty-state';
        const iconName = cfg.icon || 'empty';
        empty.innerHTML =
            '<div class="empty-state-icon">' +
            (typeof DevKitIcons !== 'undefined' ? DevKitIcons.render(iconName, 28) : '') +
            '</div>' +
            '<div class="empty-state-title">' + cfg.title + '</div>' +
            '<div class="empty-state-desc">' + cfg.desc + '</div>';
        box.appendChild(empty);
        return empty;
    }

    function bindOutput(cfg) {
        const ta = document.getElementById(cfg.id);
        if (!ta) return;
        const box = wrapField(ta);
        const empty = createOverlay(box, cfg);
        const sync = () => {
            const filled = isFilled(ta);
            empty.classList.toggle('hidden', filled);
            ta.classList.toggle('field-empty', !filled);
        };
        ta.addEventListener('input', sync);
        watches.push(sync);
        sync();
    }

    function bindResultPanel(cfg) {
        const el = document.getElementById(cfg.id);
        if (!el) return;
        const box = wrapField(el);
        const empty = createOverlay(box, cfg);
        const sync = () => {
            const filled = isFilled(el);
            empty.classList.toggle('hidden', filled);
            el.classList.toggle('field-empty', !filled);
        };
        watches.push(sync);
        sync();
    }

    function syncAll() {
        watches.forEach(fn => fn());
    }

    function init() {
        OUTPUTS.forEach(bindOutput);
        RESULT_PANELS.forEach(bindResultPanel);
        window.addEventListener('devkit:tab-change', () => setTimeout(syncAll, 80));
        document.addEventListener('click', e => {
            if (e.target.closest('.btn')) setTimeout(syncAll, 120);
        });
        document.addEventListener('empty-sync', syncAll);
        setTimeout(syncAll, 200);
    }

    return { init, syncAll };
})();

function initEmptyStates() {
    EmptyStates.init();
}
