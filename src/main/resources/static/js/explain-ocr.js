/**
 * EXPLAIN 截图 OCR（Tesseract.js 按需加载）
 */
const ExplainOcr = (() => {
    const OCR_LOCAL = '/vendor/tesseract';

    let loadPromise = null;

    function loadScript(src) {
        return new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = src;
            s.async = true;
            s.onload = () => resolve();
            s.onerror = () => reject(new Error('load failed: ' + src));
            document.head.appendChild(s);
        });
    }

    async function probeLocalVendor() {
        try {
            const res = await fetch(OCR_LOCAL + '/tesseract.min.js', { method: 'HEAD' });
            return res.ok;
        } catch (_) {
            return false;
        }
    }

    function workerOptions() {
        return {
            workerPath: OCR_LOCAL + '/worker.min.js',
            corePath: OCR_LOCAL + '/',
            langPath: OCR_LOCAL + '/tessdata/',
            workerBlobURL: false
        };
    }

    async function ensureLocalVendor() {
        const ok = await probeLocalVendor();
        if (!ok) {
            throw new Error('本地 OCR 未安装，请在项目根目录执行 npm run vendor:ocr 后重启');
        }
        try {
            const langRes = await fetch(OCR_LOCAL + '/tessdata/eng.traineddata.gz', { method: 'HEAD' });
            if (!langRes.ok) {
                throw new Error('缺少 eng.traineddata.gz，请执行 npm run vendor:ocr:tessdata');
            }
        } catch (e) {
            if (e.message && /traineddata|vendor:ocr/.test(e.message)) throw e;
            throw new Error('无法校验 OCR 语言包，请执行 npm run vendor:ocr:tessdata');
        }
    }

    async function loadTesseract() {
        await ensureLocalVendor();

        if (typeof Tesseract !== 'undefined') return Tesseract;
        if (loadPromise) return loadPromise;

        loadPromise = (async () => {
            if (typeof Tesseract === 'undefined') {
                await loadScript(OCR_LOCAL + '/tesseract.min.js');
            }
            if (typeof Tesseract === 'undefined') {
                throw new Error('OCR 引擎加载失败，请执行 npm run vendor:ocr 后刷新');
            }
            return Tesseract;
        })();

        return loadPromise;
    }

    function readFileAsDataUrl(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('读取图片失败'));
            reader.readAsDataURL(file);
        });
    }

    function loadImage(dataUrl) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error('图片格式无效'));
            img.src = dataUrl;
        });
    }

    function isBlueSelection(r, g, b) {
        return b > 90 && b > r + 25 && b > g - 10;
    }

    function pixelToInk(r, g, b, mode) {
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        if (isBlueSelection(r, g, b)) {
            return lum > 165 ? 0 : 255;
        }
        if (mode === 'soft') {
            return lum < 215 ? 0 : 255;
        }
        return lum < 200 ? 0 : 255;
    }

    function detectContentBounds(img) {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const { data, width, height } = ctx.getImageData(0, 0, img.width, img.height);
        let minX = width;
        let minY = height;
        let maxX = 0;
        let maxY = 0;
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const i = (y * width + x) * 4;
                const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
                if (lum < 238) {
                    minX = Math.min(minX, x);
                    minY = Math.min(minY, y);
                    maxX = Math.max(maxX, x);
                    maxY = Math.max(maxY, y);
                }
            }
        }
        if (maxX <= minX || maxY <= minY) return null;
        const pad = Math.max(2, Math.round(Math.min(width, height) * 0.01));
        return {
            x: Math.max(0, minX - pad),
            y: Math.max(0, minY - pad),
            w: Math.min(width - Math.max(0, minX - pad), maxX - minX + 1 + pad * 2),
            h: Math.min(height - Math.max(0, minY - pad), maxY - minY + 1 + pad * 2)
        };
    }

    function renderImage(img, mode, crop, bounds) {
        let srcX = 0;
        let srcY = 0;
        let srcW = img.width;
        let srcH = img.height;
        const boundsRect = bounds === undefined ? detectContentBounds(img) : bounds;
        if (boundsRect) {
            srcX = boundsRect.x;
            srcY = boundsRect.y;
            srcW = boundsRect.w;
            srcH = boundsRect.h;
        }
        if (crop) {
            srcY = srcY + srcH * crop.y0;
            srcH = Math.max(1, srcH * (crop.y1 - crop.y0));
        }
        const targetW = Math.max(1600, Math.round(srcW * (srcW < 600 ? 4 : srcW < 1000 ? 3 : 2)));
        const w = targetW;
        const h = Math.max(1, Math.round(srcH * (targetW / srcW)));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, w, h);

        if (mode === 'raw') {
            return canvas.toDataURL('image/png');
        }

        const imageData = ctx.getImageData(0, 0, w, h);
        const d = imageData.data;
        for (let i = 0; i < d.length; i += 4) {
            const v = pixelToInk(d[i], d[i + 1], d[i + 2], mode);
            d[i] = d[i + 1] = d[i + 2] = v;
        }
        ctx.putImageData(imageData, 0, 0);
        return canvas.toDataURL('image/png');
    }

    async function buildPreprocessVariants(dataUrl) {
        const img = await loadImage(dataUrl);
        const bounds = detectContentBounds(img);
        const variants = [
            { tag: 'crop-normalize', dataUrl: renderImage(img, 'normalize', null, bounds) },
            { tag: 'crop-soft', dataUrl: renderImage(img, 'soft', null, bounds) },
            { tag: 'crop-raw', dataUrl: renderImage(img, 'raw', null, bounds) },
            { tag: 'normalize', dataUrl: renderImage(img, 'normalize') },
            { tag: 'body', dataUrl: renderImage(img, 'normalize', { y0: 0.18, y1: 1 }, bounds) }
        ];
        return variants;
    }

    function scoreOcrExplainText(text) {
        const t = String(text || '');
        const lower = t.toLowerCase();
        let score = 0;
        if (/\bselect_type\b/.test(lower)) score += 2;
        if (/\bsimple\b/.test(lower)) score += 12;
        if (/\bshow_users\b/.test(lower) || /\broomnumber\b/.test(lower)) score += 8;
        if (/\b100\.?\d*\b/.test(t)) score += 4;
        if (/(?:^|\n)\s*\d+\s+simple\b/im.test(t)) score += 25;
        if (/(?:^|\n)\s*l\s+simple\b/im.test(t)) score += 20;
        const lines = t.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        const dataLines = lines.filter(l => /^\d+\s+\S+/i.test(l) || /^l\s+simple\b/i.test(l));
        score += dataLines.length * 15;
        if (lines.length && !dataLines.length && /\bselect_type\b/i.test(t)) score -= 20;
        return score;
    }

    function mergeOcrTexts(texts) {
        const dataLines = new Map();
        texts.forEach(text => {
            String(text || '').split(/\r?\n/).forEach(line => {
                const trimmed = line.trim();
                if (!trimmed) return;
                if (/^id\b/i.test(trimmed) && /select_type/i.test(trimmed)) return;
                if (!/^\d+\s+SIMPLE\b/i.test(trimmed) && !/^l\s+SIMPLE\b/i.test(trimmed)) return;
                const key = trimmed
                    .toLowerCase()
                    .replace(/\(\s*null\s*\)/gi, 'null')
                    .replace(/\bnull\b/g, 'null')
                    .replace(/\bref\b/g, 'ref')
                    .replace(/\s+/g, ' ');
                const prev = dataLines.get(key);
                if (!prev || trimmed.length > prev.length) dataLines.set(key, trimmed);
            });
        });
        if (!dataLines.size) {
            const parts = [];
            const seen = new Set();
            texts.forEach(text => {
                String(text || '').split(/\r?\n/).forEach(line => {
                    const trimmed = line.trim();
                    if (!trimmed || seen.has(trimmed)) return;
                    seen.add(trimmed);
                    parts.push(trimmed);
                });
            });
            return parts.join('\n');
        }
        const header = 'id select_type table partitions type possible_keys key key_len ref rows filtered Extra';
        return header + '\n' + [...dataLines.values()].join('\n');
    }

    function preprocessImage(dataUrl) {
        return loadImage(dataUrl).then(img => renderImage(img, 'normalize'));
    }

    async function recognizeWithWorker(worker, dataUrl, psm, onProgress) {
        await worker.setParameters({
            tessedit_pageseg_mode: String(psm),
            preserve_interword_spaces: '1'
        });
        const { data } = await worker.recognize(dataUrl);
        if (typeof onProgress === 'function') onProgress();
        return data.text || '';
    }

    async function recognize(fileOrDataUrl, onProgress) {
        const Tess = await loadTesseract();
        const dataUrl = typeof fileOrDataUrl === 'string'
            ? fileOrDataUrl
            : await readFileAsDataUrl(fileOrDataUrl);
        const variants = await buildPreprocessVariants(dataUrl);
        const psms = ['11', '6', '4', '3'];
        const total = variants.length * psms.length;
        let step = 0;
        let bestText = '';
        let bestScore = -1;
        const collected = [];

        const worker = await Tess.createWorker('eng', 1, {
            ...workerOptions(),
            logger: m => {
                if (m.status === 'recognizing text' && typeof onProgress === 'function') {
                    onProgress(Math.min(99, Math.round((m.progress || 0) * 100)));
                }
            }
        });
        try {
            for (const variant of variants) {
                for (const psm of psms) {
                    const text = await recognizeWithWorker(worker, variant.dataUrl, psm);
                    collected.push(text);
                    const score = scoreOcrExplainText(text);
                    if (score > bestScore) {
                        bestScore = score;
                        bestText = text;
                    }
                    step++;
                    if (typeof onProgress === 'function') {
                        onProgress(Math.min(99, Math.round(step / total * 100)));
                    }
                }
            }

            const merged = mergeOcrTexts(collected);
            const mergedScore = scoreOcrExplainText(merged);
            if (merged.trim() && (mergedScore > bestScore || !/\bSIMPLE\b/i.test(bestText))) {
                bestScore = mergedScore;
                bestText = merged;
            }
        } finally {
            await worker.terminate();
        }

        if (typeof onProgress === 'function') onProgress(100);
        return bestText;
    }

    function dataUrlToPngBlob(dataUrl) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);
                canvas.toBlob(blob => {
                    if (blob) resolve(blob);
                    else reject(new Error('图片转换失败'));
                }, 'image/png');
            };
            img.onerror = () => reject(new Error('图片读取失败'));
            img.src = dataUrl;
        });
    }

    async function copyImage(dataUrl) {
        if (!dataUrl) throw new Error('暂无截图');
        if (!navigator.clipboard || !window.ClipboardItem) {
            throw new Error('当前浏览器不支持复制图片');
        }
        const blob = await dataUrlToPngBlob(dataUrl);
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    }

    return {
        recognize, preprocessImage, buildPreprocessVariants, scoreOcrExplainText,
        readFileAsDataUrl, copyImage, loadTesseract
    };
})();

function initExplainOcr() {
    const panel = document.getElementById('panel-explain');
    const input = document.getElementById('explain-input');
    const recognizeBtn = document.getElementById('explain-ocr-pick');
    const statusEl = document.getElementById('explain-ocr-status');
    const imageBox = document.getElementById('explain-ocr-image-box');
    const pasteTarget = document.getElementById('explain-ocr-paste-target');
    const placeholderEl = document.getElementById('explain-ocr-placeholder');
    const imageEl = document.getElementById('explain-ocr-image');
    const imageCopyBtn = document.getElementById('explain-ocr-copy-image');
    const ocrBox = document.getElementById('explain-ocr-box');
    const ocrOutput = document.getElementById('explain-ocr-output');
    const ocrAlign = document.getElementById('explain-ocr-align');
    const ocrCopyBtn = document.getElementById('explain-ocr-copy');
    if (!panel || !input || !recognizeBtn || !imageBox) return;

    let busy = false;
    let lastOcrText = '';
    let lastImageDataUrl = '';

    function setStatus(text, show) {
        if (!statusEl) return;
        statusEl.textContent = text || '';
        statusEl.classList.toggle('hidden', !show);
    }

    function updateRecognizeState() {
        const hasImage = !!lastImageDataUrl;
        recognizeBtn.disabled = busy || !hasImage;
        if (imageCopyBtn) imageCopyBtn.disabled = !hasImage;
    }

    function setImageBox(dataUrl) {
        lastImageDataUrl = dataUrl || '';
        if (imageEl) {
            if (lastImageDataUrl) {
                imageEl.src = lastImageDataUrl;
                imageEl.classList.remove('hidden');
            } else {
                imageEl.removeAttribute('src');
                imageEl.classList.add('hidden');
            }
        }
        if (placeholderEl) {
            placeholderEl.classList.toggle('hidden', !!lastImageDataUrl);
        }
        updateRecognizeState();
    }

    function setOcrBox(rebuilt, rawText) {
        const resolved = ExplainPro.resolveOcrTabular(rawText || rebuilt || '');
        const tsv = (resolved.tsv || rebuilt || '').trim();
        const hasData = resolved.rows.length > 0;
        const displayText = tsv || (rawText || '').trim();
        lastOcrText = displayText;
        if (!ocrBox) return;
        if (!displayText) {
            if (ocrOutput) ocrOutput.value = '';
            if (ocrAlign) ocrAlign.innerHTML = '';
            ocrBox.classList.add('hidden');
            return;
        }
        if (ocrOutput) ocrOutput.value = tsv || displayText;
        if (ocrAlign) {
            ocrAlign.innerHTML = hasData
                ? ExplainPro.renderAlignGrid(tsv, { compact: true })
                : ExplainPro.renderAlignGrid(displayText, { compact: true });
        }
        ocrBox.classList.remove('hidden');
    }

    async function loadImageFile(file) {
        if (!file || !file.type.startsWith('image/')) {
            toast('请粘贴图片');
            return;
        }
        try {
            const dataUrl = await ExplainOcr.readFileAsDataUrl(file);
            setImageBox(dataUrl);
            toast('截图已粘贴，点击「识别截图」开始识别');
        } catch (e) {
            toast('读取图片失败: ' + (e.message || e));
        }
    }

    function pasteImageFromEvent(e) {
        const items = e.clipboardData && e.clipboardData.items;
        if (!items) return false;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.startsWith('image/')) {
                e.preventDefault();
                const file = items[i].getAsFile();
                if (file) loadImageFile(file);
                return true;
            }
        }
        return false;
    }

    async function applyOcrResult(ocrText) {
        const resolved = ExplainPro.resolveOcrTabular(ocrText);
        const rebuilt = resolved.tsv || ExplainPro.rebuildTabularText(ocrText);
        setOcrBox(rebuilt, ocrText);

        if (resolved.rows.length && rebuilt.trim()) {
            input.value = rebuilt;
            if (typeof globalThis.syncExplainAlignView === 'function') {
                globalThis.syncExplainAlignView();
            } else {
                ExplainPro.syncExplainAlignView();
            }
        }

        const result = ExplainPro.analyzeFromOcr(ocrText);
        if (result.error) {
            if (typeof DevKitCore !== 'undefined') {
                let hint = result.hint || '识别失败';
                if (/\bselect_type\b/i.test(ocrText) && !/\bSIMPLE\b/i.test(ocrText)) {
                    hint = 'OCR 只识别到表头。请刷新页面后重试；若仍失败，取消 Navicat 行选中（避免蓝底白字）再截图';
                }
                DevKitCore.showPanelError('explain', result.error, null, hint);
            }
            document.getElementById('explain-result').innerHTML = '';
            if (rebuilt.trim()) toast('已填入识别文本，可手动修正后分析');
            else toast('识别失败，请换更清晰的截图');
            return;
        }

        if (typeof DevKitCore !== 'undefined') DevKitCore.hidePanelError('explain');
        document.getElementById('explain-result').innerHTML = ExplainPro.renderHtml(result);
        document.getElementById('panel-explain')?.dispatchEvent(new CustomEvent('explain-analyzed', { detail: result }));
        const high = (result.issueLevels || []).filter(i => i.level === 'high').length;
        toast(high ? '截图识别完成，发现 ' + high + ' 项高风险' : '截图识别完成');
        document.dispatchEvent(new Event('empty-sync'));
    }

    function errorMessage(e) {
        if (!e) return '未知错误';
        if (typeof e === 'string') return e;
        return e.message || String(e);
    }

    async function runRecognize() {
        if (!lastImageDataUrl) {
            toast('请先在截图区 Ctrl+V 粘贴图片');
            imageBox?.focus();
            return;
        }
        if (busy) return;
        busy = true;
        updateRecognizeState();
        setStatus('正在加载 OCR 引擎…', true);

        try {
            setStatus('正在识别截图（多模式）… 0%', true);
            const text = await ExplainOcr.recognize(lastImageDataUrl, pct => {
                setStatus('正在识别截图… ' + pct + '%', true);
            });
            setStatus('', false);
            await applyOcrResult(text);
        } catch (e) {
            setStatus('', false);
            const msg = errorMessage(e);
            toast('截图识别失败: ' + msg);
            if (typeof DevKitCore !== 'undefined') {
                const hint = /vendor:ocr|本地 OCR|OCR 引擎/.test(msg)
                    ? '在项目根目录执行 npm run vendor:ocr 安装本地 OCR，然后重启应用并刷新页面'
                    : (msg || '请检查 OCR 资源是否完整');
                DevKitCore.showPanelError('explain', '截图识别失败', null, hint);
            }
        } finally {
            busy = false;
            updateRecognizeState();
        }
    }

    recognizeBtn.addEventListener('click', runRecognize);

    ocrCopyBtn?.addEventListener('click', () => {
        const text = (ocrOutput && ocrOutput.value) || lastOcrText;
        if (!text.trim()) { toast('暂无识别文本'); return; }
        copyText(text);
    });

    imageCopyBtn?.addEventListener('click', () => {
        if (!lastImageDataUrl) { toast('暂无截图'); return; }
        ExplainOcr.copyImage(lastImageDataUrl)
            .then(() => toast('图片已复制到剪贴板'))
            .catch(e => toast('复制图片失败: ' + (e.message || e)));
    });

    imageBox.addEventListener('paste', pasteImageFromEvent);
    panel.addEventListener('paste', e => { pasteImageFromEvent(e); });
    input.addEventListener('paste', e => { pasteImageFromEvent(e); }, true);

    imageBox.addEventListener('focus', () => imageBox.classList.add('focused'));
    imageBox.addEventListener('blur', () => imageBox.classList.remove('focused'));
    imageBox.addEventListener('click', () => imageBox.focus());

    const onDropImage = e => {
        const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
        if (!file || !file.type.startsWith('image/')) return;
        e.preventDefault();
        e.stopPropagation();
        imageBox.classList.remove('drag-over');
        loadImageFile(file);
    };

    imageBox.addEventListener('dragover', e => {
        if (e.dataTransfer && [...e.dataTransfer.types].includes('Files')) {
            e.preventDefault();
            imageBox.classList.add('drag-over');
        }
    });
    imageBox.addEventListener('dragleave', () => imageBox.classList.remove('drag-over'));
    imageBox.addEventListener('drop', onDropImage);
    pasteTarget?.addEventListener('drop', onDropImage);

    updateRecognizeState();
}

if (typeof globalThis !== 'undefined') globalThis.__ExplainOcr = ExplainOcr;
