/**

 * 编码 Pro：Base64 / URL / JWT（增强：过期倒计时 + claim 说明）

 */

const EncodePro = (() => {



    const CLAIM_LABELS = {

        iss: '签发者 (issuer)',

        sub: '主题 (subject)',

        aud: '受众 (audience)',

        exp: '过期时间 (expiration)',

        nbf: '生效时间 (not before)',

        iat: '签发时间 (issued at)',

        jti: 'JWT ID'

    };



    function base64Encode(text) {

        return btoa(unescape(encodeURIComponent(text)));

    }



    function base64Decode(text) {

        return decodeURIComponent(escape(atob(text.trim())));

    }



    function urlEncode(text) {

        return encodeURIComponent(text);

    }



    function urlDecode(text) {

        return decodeURIComponent(text);

    }



    function parseJwt(token) {

        const parts = token.trim().split('.');

        if (parts.length < 2) throw new Error('JWT 格式错误，需要 header.payload[.signature]');



        function decodePart(part) {

            const pad = part.length % 4 === 0 ? '' : '='.repeat(4 - part.length % 4);

            const json = atob(part.replace(/-/g, '+').replace(/_/g, '/') + pad);

            return JSON.parse(json);

        }



        const payload = decodePart(parts[1]);

        const expInfo = formatExp(payload.exp);

        const claimNotes = [];

        Object.keys(payload).forEach(k => {

            if (CLAIM_LABELS[k]) claimNotes.push(k + ': ' + CLAIM_LABELS[k]);

        });



        return {

            header: decodePart(parts[0]),

            payload,

            signature: parts[2] || '(无签名部分)',

            expInfo,

            claimNotes,

            raw: { header: parts[0], payload: parts[1], signature: parts[2] }

        };

    }



    function formatExp(exp) {

        if (!exp) return null;

        const d = new Date(exp * 1000);

        const now = Date.now();

        const diff = d.getTime() - now;

        const fmt = d.toLocaleString('zh-CN');

        if (diff < 0) return { text: fmt, status: 'expired', label: '已过期 ' + Math.abs(Math.floor(diff / 60000)) + ' 分钟' };

        const mins = Math.floor(diff / 60000);

        const hours = Math.floor(mins / 60);

        const label = hours > 24 ? Math.floor(hours / 24) + ' 天后过期' : (hours > 0 ? hours + ' 小时后过期' : mins + ' 分钟后过期');

        return { text: fmt, status: 'valid', label };

    }



    return { base64Encode, base64Decode, urlEncode, urlDecode, parseJwt, CLAIM_LABELS };

})();



function initEncodePro() {

    const b64in = document.getElementById('b64-input');

    if (!b64in) return;



    document.getElementById('b64-encode').addEventListener('click', () => {

        try {

            document.getElementById('b64-output').value = EncodePro.base64Encode(b64in.value);

            toast('Base64 编码完成');

        } catch (e) { toast(e.message); }

    });

    document.getElementById('b64-decode').addEventListener('click', () => {

        try {

            document.getElementById('b64-output').value = EncodePro.base64Decode(b64in.value);

            toast('Base64 解码完成');

        } catch (e) { toast('解码失败: ' + e.message); }

    });

    document.getElementById('b64-copy').addEventListener('click', () => copyText(document.getElementById('b64-output').value));



    const urlIn = document.getElementById('url-input');

    document.getElementById('url-encode').addEventListener('click', () => {

        document.getElementById('url-output').value = EncodePro.urlEncode(urlIn.value);

        toast('URL 编码完成');

    });

    document.getElementById('url-decode').addEventListener('click', () => {

        try {

            document.getElementById('url-output').value = EncodePro.urlDecode(urlIn.value);

            toast('URL 解码完成');

        } catch (e) { toast('解码失败: ' + e.message); }

    });

    document.getElementById('url-copy').addEventListener('click', () => copyText(document.getElementById('url-output').value));



    const jwtIn = document.getElementById('jwt-input');

    const expEl = document.getElementById('jwt-exp-info');

    const claimsEl = document.getElementById('jwt-claims-info');



    document.getElementById('jwt-parse').addEventListener('click', () => {

        try {

            const r = EncodePro.parseJwt(jwtIn.value);

            document.getElementById('jwt-header').value = JSON.stringify(r.header, null, 2);

            document.getElementById('jwt-payload').value = JSON.stringify(r.payload, null, 2);

            document.getElementById('jwt-signature').value = r.signature;

            if (expEl && r.expInfo) {

                expEl.className = 'jwt-exp ' + r.expInfo.status;

                expEl.textContent = 'exp: ' + r.expInfo.text + ' — ' + r.expInfo.label;

            } else if (expEl) {

                expEl.textContent = '';

            }

            if (claimsEl) {

                claimsEl.innerHTML = r.claimNotes.map(n => '<span class="jwt-claim-chip">' + n + '</span>').join('');

            }

            toast('JWT 解析成功（仅解码，不验证签名）');

        } catch (e) { toast('JWT 解析失败: ' + e.message); }

    });

    document.getElementById('jwt-copy-payload').addEventListener('click', () => {

        copyText(document.getElementById('jwt-payload').value);

    });

}


