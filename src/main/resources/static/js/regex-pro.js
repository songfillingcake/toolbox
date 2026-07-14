/**
 * 正则测试器
 */
const RegexPro = (() => {

    function test(pattern, flags, text) {
        const re = new RegExp(pattern, flags);
        const matches = [];
        const MAX_MATCHES = 1000;
        let m;
        const global = flags.includes('g');
        if (global) {
            while ((m = re.exec(text)) !== null) {
                matches.push({ match: m[0], index: m.index, groups: m.slice(1) });
                if (matches.length >= MAX_MATCHES) break;
                if (m[0].length === 0) re.lastIndex++;
            }
        } else {
            m = re.exec(text);
            if (m) matches.push({ match: m[0], index: m.index, groups: m.slice(1) });
        }
        return { matches, valid: true };
    }

    function highlight(text, pattern, flags) {
        try {
            const re = new RegExp(pattern, flags.includes('g') ? flags : flags + 'g');
            const parts = [];
            let last = 0;
            let m;
            let count = 0;
            const MAX = 1000;
            while ((m = re.exec(text)) !== null && count < MAX) {
                parts.push(esc(text.slice(last, m.index)));
                parts.push('<mark class="regex-hit">' + esc(m[0]) + '</mark>');
                last = m.index + m[0].length;
                count++;
                if (m[0].length === 0) re.lastIndex++;
            }
            parts.push(esc(text.slice(last)));
            return parts.join('');
        } catch (e) {
            return esc(text);
        }
    }

    function esc(s) {
        return s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    }

    return { test, highlight, esc };
})();

function initRegexPro() {
    const pattern = document.getElementById('regex-pattern');
    if (!pattern) return;

    document.getElementById('regex-run').addEventListener('click', () => {
        const flags = ['g', 'i', 'm', 's'].filter(f =>
            document.getElementById('regex-flag-' + f).checked).join('');
        const text = document.getElementById('regex-text').value;
        if (typeof DevKitCore !== 'undefined' && !DevKitCore.guardInputSize(text, '测试文本')) return;
        const resultEl = document.getElementById('regex-result');
        const highlightEl = document.getElementById('regex-highlight');
        try {
            const r = RegexPro.test(pattern.value, flags, text);
            highlightEl.innerHTML = RegexPro.highlight(text, pattern.value, flags);
            if (r.matches.length === 0) {
                resultEl.textContent = '无匹配';
            } else {
                const suffix = r.matches.length >= 1000 ? '（已达 1000 条上限）' : '';
                resultEl.innerHTML = r.matches.map((m, i) =>
                    '#' + (i + 1) + ' [' + m.index + '-' + (m.index + m.match.length) + '] "' + m.match + '"' +
                    (m.groups.length ? ' groups: ' + JSON.stringify(m.groups) : '')
                ).join('\n') + suffix;
            }
            toast('匹配 ' + r.matches.length + ' 处');
        } catch (e) {
            resultEl.textContent = '正则错误: ' + e.message;
            highlightEl.textContent = text;
        }
    });
}
