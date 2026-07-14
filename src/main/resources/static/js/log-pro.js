/**
 * 日志高亮与 JSON 提取
 */
const LogPro = (() => {

    const LEVELS = { ERROR: 'log-err', WARN: 'log-warn', INFO: 'log-info', DEBUG: 'log-debug', TRACE: 'log-trace' };

    function highlightLine(line) {
        let html = esc(line);
        Object.keys(LEVELS).forEach(lv => {
            const re = new RegExp('\\b' + lv + '\\b', 'gi');
            html = html.replace(re, '<span class="' + LEVELS[lv] + '">' + lv + '</span>');
        });
        html = html.replace(/(\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}[.,\d]*)/g, '<span class="log-time">$1</span>');
        const jsonMatch = line.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
        if (jsonMatch) {
            try {
                JSON.parse(jsonMatch[1]);
                html = html.replace(esc(jsonMatch[1]), '<span class="log-json">' + esc(jsonMatch[1]) + '</span>');
            } catch (e) { /* not json */ }
        }
        return html;
    }

    function process(text) {
        return text.split(/\r?\n/).map((line, i) =>
            '<div class="log-line"><span class="log-num">' + (i + 1) + '</span>' + highlightLine(line) + '</div>'
        ).join('');
    }

    function extractJson(text) {
        const results = [];
        const re = /(\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}|\[[^\[\]]*(?:\[[^\[\]]*\][^\[\]]*)*\])/g;
        let m;
        while ((m = re.exec(text)) !== null) {
            try {
                const obj = JSON.parse(m[1]);
                results.push(JSON.stringify(obj, null, 2));
            } catch (e) { /* skip */ }
        }
        return results;
    }

    function esc(s) {
        return s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    }

    return { process, extractJson };
})();

function initLogPro() {
    const input = document.getElementById('log-input');
    if (!input) return;
    document.getElementById('log-highlight').addEventListener('click', () => {
        if (!input.value.trim()) {
            if (typeof DevKitCore !== 'undefined') {
                DevKitCore.showPanelError('log', '请输入日志内容', null, '粘贴 logback / log4j 输出后点击高亮');
            } else toast('请输入日志内容');
            return;
        }
        if (typeof DevKitCore !== 'undefined') DevKitCore.hidePanelError('log');
        if (typeof DevKitCore !== 'undefined' && !DevKitCore.guardInputSize(input.value, '日志')) return;
        document.getElementById('log-output').innerHTML = LogPro.process(input.value);
        toast('已高亮');
        document.dispatchEvent(new Event('empty-sync'));
    });
    document.getElementById('log-extract-json').addEventListener('click', () => {
        if (!input.value.trim()) {
            if (typeof DevKitCore !== 'undefined') {
                DevKitCore.showPanelError('log', '请输入日志内容', null, '需包含 JSON 片段才能提取');
            } else toast('请输入日志内容');
            return;
        }
        if (typeof DevKitCore !== 'undefined') DevKitCore.hidePanelError('log');
        const jsons = LogPro.extractJson(input.value);
        document.getElementById('log-json-extract').value = jsons.join('\n\n---\n\n') || '(未找到 JSON)';
        toast('提取 ' + jsons.length + ' 段 JSON');
    });
}
