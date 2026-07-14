/**
 * Cron 解析：敏感模式下本地计算，否则走后端 API
 */
const CronClient = (() => {

    const MAX_EXPRESSION_LEN = 256;
    const MAX_COUNT = 30;

    function pad(n) {
        return String(n).padStart(2, '0');
    }

    function formatDate(d) {
        return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
            ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
    }

    function parseList(field, mapper) {
        return field.split(',').map(s => mapper(s.trim()));
    }

    const DOW_MAP = { SUN: 1, MON: 2, TUE: 3, WED: 4, THU: 5, FRI: 6, SAT: 7 };

    function parseDowToken(token) {
        const u = token.toUpperCase();
        if (DOW_MAP[u] !== undefined) return DOW_MAP[u];
        const n = parseInt(token, 10);
        if (!Number.isNaN(n)) return n;
        throw new Error('无效的星期: ' + token);
    }

    function parseDowField(field) {
        if (field === '?' || field === '*') return () => true;
        if (field.includes('/')) {
            const [base, step] = field.split('/');
            const start = base === '*' ? 1 : parseDowToken(base);
            const inc = parseInt(step, 10);
            return v => v >= start && v <= 7 && (v - start) % inc === 0;
        }
        if (field.includes('-')) {
            const [a, b] = field.split('-');
            const lo = parseDowToken(a);
            const hi = parseDowToken(b);
            return v => v >= lo && v <= hi;
        }
        if (field.includes(',')) {
            const set = new Set(field.split(',').map(s => parseDowToken(s.trim())));
            return v => set.has(v);
        }
        const n = parseDowToken(field);
        return v => v === n;
    }

    function parseField(field, min, max) {
        if (field === '*' || field === '?') {
            return v => v >= min && v <= max;
        }
        if (field.includes('/')) {
            const [base, step] = field.split('/');
            const start = base === '*' ? min : parseInt(base, 10);
            const inc = parseInt(step, 10);
            return v => v >= start && v <= max && (v - start) % inc === 0;
        }
        if (field.includes('-')) {
            const [a, b] = field.split('-');
            const lo = parseInt(a, 10);
            const hi = parseInt(b, 10);
            return v => v >= lo && v <= hi;
        }
        if (field.includes(',')) {
            const set = new Set(parseList(field, x => parseInt(x, 10)));
            return v => set.has(v);
        }
        const n = parseInt(field, 10);
        return v => v === n;
    }

    function matchesQuartz(d, sec, min, hour, dom, month, dow) {
        const S = d.getSeconds();
        const M = d.getMinutes();
        const H = d.getHours();
        const D = d.getDate();
        const MO = d.getMonth() + 1;
        const DW = d.getDay();
        const quartzDow = DW === 0 ? 1 : DW + 1;
        if (!parseField(sec, 0, 59)(S)) return false;
        if (!parseField(min, 0, 59)(M)) return false;
        if (!parseField(hour, 0, 23)(H)) return false;
        if (!parseField(month, 1, 12)(MO)) return false;
        const domOk = dom === '?' || parseField(dom, 1, 31)(D);
        const dowOk = parseDowField(dow)(quartzDow);
        if (dom !== '?' && dow !== '?') return domOk && dowOk;
        if (dom === '?') return dowOk;
        return domOk;
    }

    function localNextRuns(expression, count) {
        const expr = expression.trim();
        if (!expr) throw new Error('表达式不能为空');
        if (expr.length > MAX_EXPRESSION_LEN) {
            throw new Error('表达式过长（上限 ' + MAX_EXPRESSION_LEN + ' 字符）');
        }
        const parts = expr.split(/\s+/);
        if (parts.length < 6 || parts.length > 7) {
            throw new Error('Quartz 表达式需 6-7 段');
        }
        const [sec, min, hour, dom, month, dow] = parts;
        const limit = Math.min(Math.max(count, 1), MAX_COUNT);
        const runs = [];
        const cursor = new Date();
        cursor.setMilliseconds(0);
        cursor.setSeconds(cursor.getSeconds() + 1);

        const deadline = cursor.getTime() + 366 * 24 * 60 * 60 * 1000;
        while (runs.length < limit && cursor.getTime() < deadline) {
            if (matchesQuartz(cursor, sec, min, hour, dom, month, dow)) {
                runs.push(formatDate(cursor));
            }
            cursor.setSeconds(cursor.getSeconds() + 1);
        }
        if (runs.length === 0) {
            throw new Error('未找到匹配的执行时间（复杂表达式请关闭敏感模式使用服务端解析）');
        }
        return runs;
    }

    async function nextRuns(expression, type, count) {
        const expr = expression.trim();
        if (!expr) return { success: false, message: '表达式不能为空' };

        if (typeof DevKitCore !== 'undefined' && !DevKitCore.isNetworkAllowed()) {
            try {
                const runs = localNextRuns(expr, count);
                return { success: true, expression: expr, type: type || 'QUARTZ', nextRuns: runs, local: true };
            } catch (e) {
                return { success: false, message: e.message };
            }
        }

        const res = await fetch('/api/cron/next?expression=' + encodeURIComponent(expr) +
            '&type=' + encodeURIComponent(type || 'QUARTZ') +
            '&count=' + encodeURIComponent(count));
        if (res.status === 429) {
            return { success: false, message: '请求过于频繁，请稍后再试' };
        }
        return res.json();
    }

    return { nextRuns, localNextRuns };
})();
