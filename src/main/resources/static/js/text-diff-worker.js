/**
 * 文本 Diff Web Worker — 在后台线程执行 LCS，避免大文件卡死主线程
 */
self.onmessage = function (e) {
    const { jobId, oldText, newText, maxLines } = e.data;
    try {
        const result = diffLines(oldText, newText, maxLines || 1500);
        self.postMessage({ ok: true, jobId, ...result });
    } catch (err) {
        self.postMessage({ ok: false, jobId, error: err.message || String(err), rows: [] });
    }
};

function diffLines(oldText, newText, maxLines) {
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
