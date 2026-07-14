/**
 * 文本行级 Diff（配置 / 日志 / SQL 片段对比）
 */
const TextDiff = (() => {

    const DEFAULT_MAX_LINES = 1500;
    const WORKER_LINE_THRESHOLD = 250;
    let maxLines = DEFAULT_MAX_LINES;
    let worker = null;
    let workerJobId = 0;

    function setMaxLines(n) {
        maxLines = n > 0 ? n : DEFAULT_MAX_LINES;
    }

    function esc(s) {
        if (typeof DevKitCore !== 'undefined' && DevKitCore.esc) return DevKitCore.esc(s);
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function diffLines(oldText, newText) {
        const a = (oldText || '').split(/\r?\n/);
        const b = (newText || '').split(/\r?\n/);
        if (a.length > maxLines || b.length > maxLines) {
            return {
                error: '行数超限（每侧最多 ' + maxLines + ' 行，当前 A=' + a.length + ' B=' + b.length + '）',
                rows: []
            };
        }
        const m = a.length;
        const n = b.length;
        const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
        for (let i = m - 1; i >= 0; i--) {
            for (let j = n - 1; j >= 0; j--) {
                if (a[i] === b[j]) dp[i][j] = dp[i + 1][j + 1] + 1;
                else dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
            }
        }
        const rows = [];
        let i = 0;
        let j = 0;
        while (i < m && j < n) {
            if (a[i] === b[j]) {
                rows.push({ type: 'same', oldLine: i + 1, newLine: j + 1, text: a[i] });
                i++;
                j++;
            } else if (dp[i + 1][j] >= dp[i][j + 1]) {
                rows.push({ type: 'removed', oldLine: i + 1, text: a[i] });
                i++;
            } else {
                rows.push({ type: 'added', newLine: j + 1, text: b[j] });
                j++;
            }
        }
        while (i < m) rows.push({ type: 'removed', oldLine: i + 1, text: a[i++] });
        while (j < n) rows.push({ type: 'added', newLine: j + 1, text: b[j++] });
        return { rows, error: null };
    }

    function shouldUseWorker(oldText, newText) {
        if (typeof Worker === 'undefined') return false;
        const a = (oldText || '').split(/\r?\n/).length;
        const b = (newText || '').split(/\r?\n/).length;
        return Math.max(a, b) >= WORKER_LINE_THRESHOLD;
    }

    function getWorker() {
        if (!worker) {
            worker = new Worker('/js/text-diff-worker.js');
        }
        return worker;
    }

    function diffLinesAsync(oldText, newText) {
        if (!shouldUseWorker(oldText, newText)) {
            return Promise.resolve(diffLines(oldText, newText));
        }
        const jobId = ++workerJobId;
        return new Promise((resolve, reject) => {
            const w = getWorker();
            const onMessage = (e) => {
                if (e.data && e.data.jobId !== jobId) return;
                w.removeEventListener('message', onMessage);
                w.removeEventListener('error', onError);
                if (e.data.ok === false) {
                    reject(new Error(e.data.error || 'Worker 对比失败'));
                } else {
                    resolve({ rows: e.data.rows || [], error: e.data.error || null });
                }
            };
            const onError = (err) => {
                w.removeEventListener('message', onMessage);
                w.removeEventListener('error', onError);
                reject(err);
            };
            w.addEventListener('message', onMessage);
            w.addEventListener('error', onError);
            w.postMessage({ jobId, oldText, newText, maxLines });
        });
    }

    function stats(rows) {
        let added = 0;
        let removed = 0;
        rows.forEach(r => {
            if (r.type === 'added') added++;
            if (r.type === 'removed') removed++;
        });
        return { added, removed, same: rows.length - added - removed };
    }

    function highlightIntraLine(oldLine, newLine) {
        if (!oldLine || !newLine || oldLine === newLine) return null;
        let start = 0;
        while (start < oldLine.length && start < newLine.length && oldLine[start] === newLine[start]) start++;
        let endOld = oldLine.length - 1;
        let endNew = newLine.length - 1;
        while (endOld >= start && endNew >= start && oldLine[endOld] === newLine[endNew]) {
            endOld--;
            endNew--;
        }
        if (start > endOld && start > endNew) return null;
        return {
            oldHtml: esc(oldLine.slice(0, start)) + '<mark>' + esc(oldLine.slice(start, endOld + 1)) + '</mark>' + esc(oldLine.slice(endOld + 1)),
            newHtml: esc(newLine.slice(0, start)) + '<mark>' + esc(newLine.slice(start, endNew + 1)) + '</mark>' + esc(newLine.slice(endNew + 1))
        };
    }

    function renderHtml(rows) {
        if (rows.length === 0) {
            return '<div class="diff-ok">两边均为空</div>';
        }
        const s = stats(rows);
        if (s.added === 0 && s.removed === 0) {
            return '<div class="diff-ok">✓ 文本完全相同（' + s.same + ' 行）</div>';
        }
        let html = '<div class="diff-summary">+ ' + s.added + ' / − ' + s.removed + ' / 相同 ' + s.same + ' 行</div>';
        html += '<div class="text-diff-lines">';
        for (let k = 0; k < rows.length; k++) {
            const r = rows[k];
            const prefix = r.type === 'added' ? '+' : (r.type === 'removed' ? '−' : ' ');
            const num = r.type === 'added' ? r.newLine : r.oldLine;
            let textHtml = esc(r.text);
            if (r.type === 'removed' && k + 1 < rows.length && rows[k + 1].type === 'added') {
                const hl = highlightIntraLine(r.text, rows[k + 1].text);
                if (hl) textHtml = hl.oldHtml;
            } else if (r.type === 'added' && k > 0 && rows[k - 1].type === 'removed') {
                const hl = highlightIntraLine(rows[k - 1].text, r.text);
                if (hl) textHtml = hl.newHtml;
            }
            html += '<div class="text-diff-line text-diff-' + r.type + '">' +
                '<span class="text-diff-gutter">' + prefix + num + '</span>' +
                '<span class="text-diff-text">' + textHtml + '</span></div>';
        }
        html += '</div>';
        return html;
    }

    function renderSideBySide(rows) {
        if (rows.length === 0) {
            return '<div class="diff-ok">两边均为空</div>';
        }
        const s = stats(rows);
        if (s.added === 0 && s.removed === 0) {
            return '<div class="diff-ok">✓ 文本完全相同（' + s.same + ' 行）</div>';
        }
        const leftParts = [];
        const rightParts = [];
        for (let k = 0; k < rows.length; k++) {
            const r = rows[k];
            if (r.type === 'same') {
                const line = esc(r.text);
                leftParts.push(sideLineHtml(' ', r.oldLine, line, 'same'));
                rightParts.push(sideLineHtml(' ', r.newLine, line, 'same'));
            } else if (r.type === 'removed') {
                let textHtml = esc(r.text);
                if (k + 1 < rows.length && rows[k + 1].type === 'added') {
                    const hl = highlightIntraLine(r.text, rows[k + 1].text);
                    if (hl) textHtml = hl.oldHtml;
                }
                leftParts.push(sideLineHtml('−', r.oldLine, textHtml, 'removed'));
                rightParts.push(sideLineHtml('', '', '', 'empty'));
            } else if (r.type === 'added') {
                let textHtml = esc(r.text);
                if (k > 0 && rows[k - 1].type === 'removed') {
                    const hl = highlightIntraLine(rows[k - 1].text, r.text);
                    if (hl) textHtml = hl.newHtml;
                }
                leftParts.push(sideLineHtml('', '', '', 'empty'));
                rightParts.push(sideLineHtml('+', r.newLine, textHtml, 'added'));
            }
        }
        return '<div class="diff-summary">+ ' + s.added + ' / − ' + s.removed + ' / 相同 ' + s.same +
            ' 行 · 并排视图</div>' +
            '<div class="text-diff-split-headers"><span>原始 A</span><span>新文本 B</span></div>' +
            '<div class="text-diff-split" id="textdiff-split">' +
            '<div class="text-diff-pane" id="textdiff-pane-left"><div class="text-diff-lines">' + leftParts.join('') + '</div></div>' +
            '<div class="text-diff-pane" id="textdiff-pane-right"><div class="text-diff-lines">' + rightParts.join('') + '</div></div>' +
            '</div>';
    }

    function sideLineHtml(prefix, num, textHtml, type) {
        const cls = type === 'empty' ? 'text-diff-line text-diff-empty' : 'text-diff-line text-diff-' + type;
        const gutter = prefix ? prefix + num : '';
        const body = type === 'empty' ? '&nbsp;' : textHtml;
        return '<div class="' + cls + '"><span class="text-diff-gutter">' + gutter + '</span>' +
            '<span class="text-diff-text">' + body + '</span></div>';
    }

    function bindSplitScroll() {
        const left = document.getElementById('textdiff-pane-left');
        const right = document.getElementById('textdiff-pane-right');
        if (!left || !right) return;
        let syncing = false;
        function sync(from, to) {
            from.addEventListener('scroll', () => {
                if (syncing) return;
                syncing = true;
                to.scrollTop = from.scrollTop;
                syncing = false;
            });
        }
        sync(left, right);
        sync(right, left);
    }

    function renderLoading(lineCount) {
        return '<div class="diff-loading"><span class="diff-spinner"></span> 后台对比中…（约 ' + lineCount + ' 行，Web Worker）</div>';
    }

    function toUnifiedDiff(rows, oldName, newName) {
        oldName = oldName || 'a.txt';
        newName = newName || 'b.txt';
        const lines = ['--- ' + oldName, '+++ ' + newName];
        rows.forEach(r => {
            if (r.type === 'same') lines.push(' ' + r.text);
            else if (r.type === 'removed') lines.push('-' + r.text);
            else lines.push('+' + r.text);
        });
        return lines.join('\n');
    }

    function toPlainText(rows) {
        return rows.map(r => {
            const p = r.type === 'added' ? '+' : (r.type === 'removed' ? '-' : ' ');
            return p + ' ' + r.text;
        }).join('\n');
    }

    return {
        diffLines, diffLinesAsync, stats, renderHtml, renderSideBySide, bindSplitScroll,
        renderLoading, toUnifiedDiff, toPlainText, setMaxLines
    };
})();

function initTextDiff() {
    const left = document.getElementById('textdiff-left');
    if (!left) return;

    let lastRows = [];
    let viewMode = localStorage.getItem('devkit_textdiff_view') || 'unified';
    const runBtn = document.getElementById('textdiff-run');
    const viewBtn = document.getElementById('textdiff-view-toggle');

    function updateViewBtn() {
        if (viewBtn) {
            viewBtn.textContent = viewMode === 'split' ? '统一视图' : '并排视图';
            viewBtn.classList.toggle('active', viewMode === 'split');
        }
    }

    function paintResult(rows) {
        const box = document.getElementById('textdiff-result');
        if (viewMode === 'split') {
            box.innerHTML = TextDiff.renderSideBySide(rows);
            TextDiff.bindSplitScroll();
        } else {
            box.innerHTML = TextDiff.renderHtml(rows);
        }
    }

    function applyResult(result) {
        const box = document.getElementById('textdiff-result');
        if (result.error) {
            box.innerHTML = '<div class="tool-error-inline">' + (typeof DevKitCore !== 'undefined' ? DevKitCore.esc(result.error) : result.error) + '</div>';
            lastRows = [];
            toast('对比失败');
        } else {
            lastRows = result.rows;
            paintResult(result.rows);
            toast('对比完成');
        }
        document.dispatchEvent(new Event('empty-sync'));
    }

    updateViewBtn();
    viewBtn?.addEventListener('click', () => {
        viewMode = viewMode === 'unified' ? 'split' : 'unified';
        localStorage.setItem('devkit_textdiff_view', viewMode);
        updateViewBtn();
        if (lastRows.length) paintResult(lastRows);
        else toast(viewMode === 'split' ? '已切换并排视图，请先执行对比' : '已切换统一视图');
    });

    runBtn.addEventListener('click', () => {
        const rightVal = document.getElementById('textdiff-right').value;
        const box = document.getElementById('textdiff-result');
        const aLines = left.value.split(/\r?\n/).length;
        const bLines = rightVal.split(/\r?\n/).length;
        const useWorker = typeof Worker !== 'undefined' && Math.max(aLines, bLines) >= 250;
        if (useWorker) {
            box.innerHTML = TextDiff.renderLoading(aLines + bLines);
            runBtn.disabled = true;
            TextDiff.diffLinesAsync(left.value, rightVal)
                .then(applyResult)
                .catch(err => {
                    const msg = typeof DevKitCore !== 'undefined' ? DevKitCore.esc(err.message) : err.message;
                    box.innerHTML = '<div class="tool-error-inline">' + msg + '</div>';
                    toast('对比失败');
                })
                .finally(() => { runBtn.disabled = false; });
            return;
        }
        applyResult(TextDiff.diffLines(left.value, rightVal));
    });

    document.getElementById('textdiff-swap').addEventListener('click', () => {
        const right = document.getElementById('textdiff-right');
        const t = left.value;
        left.value = right.value;
        right.value = t;
    });
    document.getElementById('textdiff-copy').addEventListener('click', () => {
        if (!lastRows.length) { toast('请先执行对比'); return; }
        copyText(TextDiff.toPlainText(lastRows));
    });
    document.getElementById('textdiff-export').addEventListener('click', () => {
        if (!lastRows.length) { toast('请先执行对比'); return; }
        downloadText(TextDiff.toUnifiedDiff(lastRows), 'diff.patch');
    });
    document.getElementById('textdiff-clear').addEventListener('click', () => {
        left.value = '';
        document.getElementById('textdiff-right').value = '';
        document.getElementById('textdiff-result').innerHTML = '';
        lastRows = [];
        document.dispatchEvent(new Event('empty-sync'));
    });
}

if (typeof globalThis !== 'undefined') globalThis.__TextDiff = TextDiff;
