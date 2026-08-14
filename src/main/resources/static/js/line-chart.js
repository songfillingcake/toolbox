/**
 * 折线图：从 CSV / JSON 生成 SVG 折线图
 */
const LineChart = (() => {

    const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6'];
    const MAX_POINTS = 2000;

    function parseNumber(val) {
        if (val == null || val === '') return NaN;
        const n = Number(String(val).replace(/,/g, '').trim());
        return Number.isFinite(n) ? n : NaN;
    }

    function splitCsvLine(line) {
        const out = [];
        let cur = '';
        let inQuote = false;
        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (ch === '"') {
                if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
                else inQuote = !inQuote;
            } else if (ch === ',' && !inQuote) {
                out.push(cur.trim());
                cur = '';
            } else cur += ch;
        }
        out.push(cur.trim());
        return out;
    }

    function groupPoints(rows) {
        const map = new Map();
        rows.forEach(r => {
            const name = r.series || '系列 1';
            if (!map.has(name)) map.set(name, []);
            map.get(name).push({ x: r.x, y: r.y });
        });
        return [...map.entries()].map(([name, points]) => ({ name, points }));
    }

    function parseCsv(text) {
        const lines = (text || '').trim().split(/\r?\n/).filter(l => l.trim());
        if (lines.length < 2) return { error: '至少需要 2 行数据（含表头或数据行）', series: [] };

        let start = 0;
        const first = splitCsvLine(lines[0]);
        if (first.length >= 2 && isNaN(parseNumber(first[1]))) start = 1;
        if (lines.length - start < 2) return { error: '有效数据行不足', series: [] };

        const rows = [];
        for (let i = start; i < lines.length; i++) {
            const cols = splitCsvLine(lines[i]);
            if (cols.length < 2) continue;
            const y = parseNumber(cols[1]);
            if (isNaN(y)) continue;
            rows.push({
                x: cols[0],
                y,
                series: cols.length >= 3 ? (cols[2] || '系列 1') : '系列 1'
            });
        }
        if (!rows.length) return { error: '未解析到有效数值，请检查 CSV 格式（x,y 或 x,y,系列）', series: [] };
        if (rows.length > MAX_POINTS) return { error: '数据点超过 ' + MAX_POINTS + ' 个上限', series: [] };
        return { error: null, series: groupPoints(rows) };
    }

    function normalizeJsonPoint(obj, idx) {
        if (obj == null || typeof obj !== 'object') return null;
        const keys = Object.keys(obj);
        const yKey = keys.find(k => /^(y|value|val|count|amount|num|number)$/i.test(k))
            || keys.find(k => typeof obj[k] === 'number');
        const xKey = keys.find(k => /^(x|date|time|day|month|label|name|key)$/i.test(k) && k !== yKey)
            || keys.find(k => k !== yKey && typeof obj[k] !== 'number');
        const seriesKey = keys.find(k => /^(series|group|category|type|name)$/i.test(k) && k !== xKey && k !== yKey);

        let y = yKey != null ? parseNumber(obj[yKey]) : NaN;
        if (isNaN(y) && keys.length >= 2) {
            const numKeys = keys.filter(k => typeof obj[k] === 'number' || !isNaN(parseNumber(obj[k])));
            if (numKeys.length) y = parseNumber(obj[numKeys[numKeys.length - 1]]);
        }
        if (isNaN(y)) return null;

        let x = xKey != null ? obj[xKey] : idx;
        let series = seriesKey != null ? String(obj[seriesKey]) : '系列 1';
        return { x: String(x), y, series };
    }

    function parseJson(text) {
        let data;
        try { data = JSON.parse(text); }
        catch (e) { return { error: 'JSON 解析失败: ' + e.message, series: [] }; }

        const rows = [];
        if (Array.isArray(data)) {
            data.forEach((item, i) => {
                const p = normalizeJsonPoint(item, i);
                if (p) rows.push(p);
            });
        } else if (data && typeof data === 'object') {
            Object.keys(data).forEach(name => {
                const arr = data[name];
                if (!Array.isArray(arr)) return;
                arr.forEach((item, i) => {
                    if (item && typeof item === 'object') {
                        const p = normalizeJsonPoint(item, i);
                        if (p) rows.push({ ...p, series: name });
                    } else {
                        const y = parseNumber(item);
                        if (!isNaN(y)) rows.push({ x: String(i), y, series: name });
                    }
                });
            });
        } else {
            return { error: 'JSON 需为数组或对象（系列名 → 数据数组）', series: [] };
        }

        if (!rows.length) return { error: '未解析到有效数据点', series: [] };
        if (rows.length > MAX_POINTS) return { error: '数据点超过 ' + MAX_POINTS + ' 个上限', series: [] };
        return { error: null, series: groupPoints(rows) };
    }

    function parseInput(text, format) {
        const trimmed = (text || '').trim();
        if (!trimmed) return { error: '请输入数据', series: [] };

        if (format === 'csv') return parseCsv(trimmed);
        if (format === 'json') return parseJson(trimmed);

        const first = trimmed[0];
        if (first === '[' || first === '{') return parseJson(trimmed);
        return parseCsv(trimmed);
    }

    function collectXLabels(seriesList) {
        const seen = new Set();
        const labels = [];
        seriesList.forEach(s => {
            s.points.forEach(p => {
                const key = String(p.x);
                if (!seen.has(key)) { seen.add(key); labels.push(key); }
            });
        });
        return labels;
    }

    function niceStep(range) {
        if (range <= 0) return 1;
        const rough = range / 5;
        const mag = Math.pow(10, Math.floor(Math.log10(rough)));
        const norm = rough / mag;
        let step = mag;
        if (norm <= 1) step = mag;
        else if (norm <= 2) step = 2 * mag;
        else if (norm <= 5) step = 5 * mag;
        else step = 10 * mag;
        return step;
    }

    function esc(s) {
        if (typeof DevKitCore !== 'undefined' && DevKitCore.esc) return DevKitCore.esc(s);
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function renderSvg(seriesList, opts) {
        opts = opts || {};
        const width = opts.width || 640;
        const height = opts.height || 360;
        const pad = { top: 28, right: 20, bottom: 44, left: 52 };
        const chartW = width - pad.left - pad.right;
        const chartH = height - pad.top - pad.bottom;

        const xLabels = collectXLabels(seriesList);
        if (!xLabels.length) return '<div class="tool-error-inline">无有效数据</div>';

        let yMin = Infinity;
        let yMax = -Infinity;
        seriesList.forEach(s => {
            s.points.forEach(p => {
                if (p.y < yMin) yMin = p.y;
                if (p.y > yMax) yMax = p.y;
            });
        });
        if (!Number.isFinite(yMin) || !Number.isFinite(yMax)) {
            return '<div class="tool-error-inline">Y 轴数值无效</div>';
        }
        if (yMin === yMax) { yMin -= 1; yMax += 1; }
        const yPad = (yMax - yMin) * 0.08 || 1;
        yMin -= yPad;
        yMax += yPad;

        const yStep = niceStep(yMax - yMin);
        const yStart = Math.floor(yMin / yStep) * yStep;
        const yEnd = Math.ceil(yMax / yStep) * yStep;

        const xCount = xLabels.length;
        const xIndex = new Map(xLabels.map((l, i) => [l, i]));

        function xPos(label) {
            if (xCount <= 1) return pad.left + chartW / 2;
            const i = xIndex.get(String(label)) ?? 0;
            return pad.left + (i / (xCount - 1)) * chartW;
        }
        function yPos(val) {
            return pad.top + chartH - ((val - yStart) / (yEnd - yStart)) * chartH;
        }

        const parts = [];
        parts.push('<svg class="linechart-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + width + ' ' + height + '" width="100%" height="' + height + '" role="img" aria-label="折线图">');

        // grid + Y ticks
        for (let v = yStart; v <= yEnd + yStep * 0.01; v += yStep) {
            const y = yPos(v);
            parts.push('<line class="linechart-grid" x1="' + pad.left + '" y1="' + y + '" x2="' + (pad.left + chartW) + '" y2="' + y + '"/>');
            const label = Number.isInteger(v) ? String(v) : v.toFixed(2).replace(/\.?0+$/, '');
            parts.push('<text class="linechart-tick" x="' + (pad.left - 8) + '" y="' + (y + 4) + '" text-anchor="end">' + esc(label) + '</text>');
        }

        // X ticks (skip if too many)
        const xSkip = xCount > 12 ? Math.ceil(xCount / 12) : 1;
        xLabels.forEach((label, i) => {
            if (i % xSkip !== 0 && i !== xCount - 1) return;
            const x = xPos(label);
            parts.push('<text class="linechart-tick linechart-tick-x" x="' + x + '" y="' + (height - 12) + '" text-anchor="middle">' + esc(label.length > 14 ? label.slice(0, 12) + '…' : label) + '</text>');
        });

        // axes
        parts.push('<line class="linechart-axis" x1="' + pad.left + '" y1="' + pad.top + '" x2="' + pad.left + '" y2="' + (pad.top + chartH) + '"/>');
        parts.push('<line class="linechart-axis" x1="' + pad.left + '" y1="' + (pad.top + chartH) + '" x2="' + (pad.left + chartW) + '" y2="' + (pad.top + chartH) + '"/>');

        // legend
        let legendX = pad.left;
        seriesList.forEach((s, si) => {
            const color = COLORS[si % COLORS.length];
            parts.push('<rect x="' + legendX + '" y="6" width="10" height="10" fill="' + color + '" rx="2"/>');
            parts.push('<text class="linechart-legend" x="' + (legendX + 14) + '" y="15">' + esc(s.name) + '</text>');
            legendX += 14 + Math.min(s.name.length, 12) * 7 + 20;
        });

        // lines + points
        seriesList.forEach((s, si) => {
            const color = COLORS[si % COLORS.length];
            const coords = s.points.map(p => xPos(p.x) + ',' + yPos(p.y));
            if (coords.length >= 2) {
                parts.push('<polyline class="linechart-line" fill="none" stroke="' + color + '" stroke-width="2" points="' + coords.join(' ') + '"/>');
            }
            s.points.forEach(p => {
                const cx = xPos(p.x);
                const cy = yPos(p.y);
                parts.push('<circle class="linechart-point" cx="' + cx + '" cy="' + cy + '" r="3.5" fill="' + color + '"><title>' + esc(s.name + ': ' + p.x + ' = ' + p.y) + '</title></circle>');
            });
        });

        parts.push('</svg>');
        return parts.join('');
    }

    function svgToPng(svgEl) {
        return new Promise((resolve, reject) => {
            const svgData = new XMLSerializer().serializeToString(svgEl);
            const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = svgEl.viewBox.baseVal.width || svgEl.clientWidth || 640;
                canvas.height = svgEl.viewBox.baseVal.height || svgEl.clientHeight || 360;
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--bg-elevated').trim() || '#1a1a2e';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);
                URL.revokeObjectURL(url);
                canvas.toBlob(b => {
                    if (b) resolve(b);
                    else reject(new Error('PNG 导出失败'));
                }, 'image/png');
            };
            img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('SVG 渲染失败')); };
            img.src = url;
        });
    }

    return { parseInput, parseCsv, parseJson, renderSvg, svgToPng, COLORS, MAX_POINTS };
})();

function initLineChart() {
    const input = document.getElementById('linechart-input');
    if (!input) return;

    const formatEl = document.getElementById('linechart-format');
    const wrap = document.getElementById('linechart-canvas-wrap');
    let lastSeries = [];

    function render() {
        if (typeof DevKitCore !== 'undefined' && !DevKitCore.guardInputSize(input.value, '折线图')) return;

        const format = formatEl ? formatEl.value : 'auto';
        const result = LineChart.parseInput(input.value, format);
        if (result.error) {
            DevKitCore.showError('linechart-error', '解析失败', result.error, '支持 CSV（x,y 或 x,y,系列）与 JSON 数组');
            wrap.innerHTML = '';
            lastSeries = [];
            document.dispatchEvent(new Event('empty-sync'));
            return;
        }
        DevKitCore.hideError('linechart-error');
        lastSeries = result.series;
        wrap.innerHTML = LineChart.renderSvg(result.series);
        toast('图表已生成（' + result.series.length + ' 个系列）');
        document.dispatchEvent(new Event('empty-sync'));
    }

    document.getElementById('linechart-render')?.addEventListener('click', render);

    document.getElementById('linechart-export')?.addEventListener('click', async () => {
        const svg = wrap.querySelector('.linechart-svg');
        if (!svg) { toast('请先生成图表'); return; }
        try {
            const blob = await LineChart.svgToPng(svg);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'linechart-' + Date.now() + '.png';
            a.click();
            URL.revokeObjectURL(url);
            toast('已导出 PNG');
        } catch (e) {
            toast('导出失败: ' + e.message);
        }
    });

    document.getElementById('linechart-to-json')?.addEventListener('click', () => {
        if (!lastSeries.length) { toast('请先生成图表'); return; }
        const arr = [];
        lastSeries.forEach(s => {
            s.points.forEach(p => arr.push({ x: p.x, y: p.y, series: s.name }));
        });
        const json = JSON.stringify(arr, null, 2);
        Nav.activateTab('json');
        setTimeout(() => {
            const el = document.getElementById('json-input');
            if (el) el.value = json;
            toast('已跳转到 JSON Pro');
        }, 80);
    });

    document.getElementById('linechart-clear')?.addEventListener('click', () => {
        input.value = '';
        wrap.innerHTML = '';
        lastSeries = [];
        DevKitCore.hideError('linechart-error');
        document.dispatchEvent(new Event('empty-sync'));
    });
}

if (typeof globalThis !== 'undefined') globalThis.__LineChart = LineChart;
