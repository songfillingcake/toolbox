/**
 * jstack 线程栈分析
 */
const JstackPro = (() => {

    function parse(text) {
        const threads = [];
        const blocks = text.split(/^"/m).filter(b => b.trim());
        blocks.forEach(block => {
            const nameMatch = block.match(/^([^"]+)/);
            if (!nameMatch) return;
            const name = '"' + nameMatch[1].trim();
            const stateMatch = block.match(/java\.lang\.Thread\.State:\s*(\S+)/);
            const state = stateMatch ? stateMatch[1] : 'UNKNOWN';
            const lines = block.split('\n').filter(l => l.trim().startsWith('at '));
            threads.push({ name, state, stackDepth: lines.length, topFrame: lines[0] || '' });
        });
        return threads;
    }

    function summarize(threads) {
        const byState = {};
        threads.forEach(t => {
            byState[t.state] = (byState[t.state] || 0) + 1;
        });
        const blocked = threads.filter(t => t.state === 'BLOCKED' || t.state === 'WAITING' || t.state === 'TIMED_WAITING');
        return { total: threads.length, byState, blocked, threads };
    }

    function renderHtml(summary) {
        let html = '<div class="jstack-summary">共 <strong>' + summary.total + '</strong> 个线程</div>';
        html += '<div class="jstack-states">';
        Object.keys(summary.byState).forEach(s => {
            const cls = ['BLOCKED', 'WAITING', 'TIMED_WAITING'].includes(s) ? 'jstack-warn' : '';
            html += '<span class="jstack-chip ' + cls + '">' + s + ': ' + summary.byState[s] + '</span>';
        });
        html += '</div>';
        if (summary.blocked.length) {
            html += '<div class="jstack-section"><strong>阻塞/等待线程 (' + summary.blocked.length + ')</strong><ul>';
            summary.blocked.slice(0, 20).forEach(t => {
                html += '<li><code>' + esc(t.name) + '</code> — ' + esc(t.state) +
                    (t.topFrame ? '<br><span class="jstack-frame">' + esc(t.topFrame.trim()) + '</span>' : '') + '</li>';
            });
            html += '</ul></div>';
        }
        return html;
    }

    function esc(s) {
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
    }

    return { parse, summarize, renderHtml };
})();

function initJstackPro() {
    const input = document.getElementById('jstack-input');
    if (!input) return;
    document.getElementById('jstack-run').addEventListener('click', () => {
        if (!input.value.trim()) {
            if (typeof DevKitCore !== 'undefined') {
                DevKitCore.showPanelError('jstack', '请输入 jstack 输出', null, '粘贴 jstack 或 jcmd Thread.print 结果');
            } else toast('请输入 jstack 输出');
            return;
        }
        const threads = JstackPro.parse(input.value);
        if (threads.length === 0) {
            if (typeof DevKitCore !== 'undefined') {
                DevKitCore.showPanelError('jstack', '未识别到线程', null, '确认粘贴的是完整 jstack 文本');
            }
            document.getElementById('jstack-result').innerHTML = '';
            return;
        }
        if (typeof DevKitCore !== 'undefined') DevKitCore.hidePanelError('jstack');
        const summary = JstackPro.summarize(threads);
        document.getElementById('jstack-result').innerHTML = JstackPro.renderHtml(summary);
        toast('分析 ' + summary.total + ' 个线程');
        document.dispatchEvent(new Event('empty-sync'));
    });
}
