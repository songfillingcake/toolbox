/**
 * JWT 解码面板（独立工具，复用 EncodePro 解析逻辑）
 */
function initJwtPro() {
    const input = document.getElementById('jwt-panel-input');
    if (!input) return;

    const expEl = document.getElementById('jwt-panel-exp');
    const claimsEl = document.getElementById('jwt-panel-claims');

    function runParse() {
        if (!input.value.trim()) {
            if (typeof DevKitCore !== 'undefined') {
                DevKitCore.showPanelError('jwt', '请输入 JWT', null, '粘贴 eyJhbGciOiJIUzI1NiIs... 格式 Token');
            } else toast('请输入 JWT');
            return;
        }
        if (typeof DevKitCore !== 'undefined') DevKitCore.hidePanelError('jwt');
        try {
            const r = EncodePro.parseJwt(input.value);
            document.getElementById('jwt-panel-header').value = JSON.stringify(r.header, null, 2);
            document.getElementById('jwt-panel-payload').value = JSON.stringify(r.payload, null, 2);
            document.getElementById('jwt-panel-signature').value = r.signature;
            if (expEl && r.expInfo) {
                expEl.className = 'jwt-exp ' + r.expInfo.status;
                expEl.textContent = 'exp: ' + r.expInfo.text + ' — ' + r.expInfo.label;
            } else if (expEl) {
                expEl.className = 'jwt-exp';
                expEl.textContent = '无 exp 字段';
            }
            if (claimsEl) {
                claimsEl.innerHTML = r.claimNotes.map(n =>
                    '<span class="jwt-claim-chip">' + n + '</span>').join('');
            }
            toast('JWT 解析成功（仅解码，不验证签名）');
            document.dispatchEvent(new Event('empty-sync'));
        } catch (e) {
            if (typeof DevKitCore !== 'undefined') {
                DevKitCore.showPanelError('jwt', 'JWT 解析失败', e.message, '确认 Token 为 header.payload.signature 三段式');
            } else toast('JWT 解析失败: ' + e.message);
        }
    }

    document.getElementById('jwt-panel-parse').addEventListener('click', runParse);
    document.getElementById('jwt-panel-copy-payload').addEventListener('click', () =>
        copyText(document.getElementById('jwt-panel-payload').value));
    document.getElementById('jwt-panel-copy-header').addEventListener('click', () =>
        copyText(document.getElementById('jwt-panel-header').value));
    document.getElementById('jwt-panel-to-json').addEventListener('click', () => {
        const payload = document.getElementById('jwt-panel-payload').value;
        if (!payload.trim()) { runParse(); }
        const p = document.getElementById('jwt-panel-payload').value;
        if (!p.trim()) return;
        Nav.activateTab('json');
        setTimeout(() => {
            const el = document.getElementById('json-input');
            if (el) {
                el.value = p;
                el.dispatchEvent(new Event('input', { bubbles: true }));
            }
            toast('Payload 已发送到 JSON Pro');
        }, 80);
    });
    document.getElementById('jwt-panel-clear').addEventListener('click', () => {
        input.value = '';
        document.getElementById('jwt-panel-header').value = '';
        document.getElementById('jwt-panel-payload').value = '';
        document.getElementById('jwt-panel-signature').value = '';
        if (expEl) expEl.textContent = '';
        if (claimsEl) claimsEl.innerHTML = '';
        if (typeof DevKitCore !== 'undefined') DevKitCore.hidePanelError('jwt');
        document.dispatchEvent(new Event('empty-sync'));
    });
}
