initNav();

const mybatisInput = document.getElementById('mybatis-input');
const mybatisOutput = document.getElementById('mybatis-output');
const mybatisCount = document.getElementById('mybatis-count');

function runMybatisConvert() {
    if (typeof DevKitCore !== 'undefined' && !DevKitCore.guardInputSize(mybatisInput.value, 'MyBatis 日志')) return;
    const result = MyBatisSql.convertAll(mybatisInput.value);
    if (result.error) {
        mybatisOutput.value = '// ' + result.error;
        mybatisCount.textContent = '0 条';
        DevKitCore.showError('mybatis-error', '转换失败', result.error, '请确认日志包含 Preparing: 和 Parameters: 行');
        return;
    }
    DevKitCore.hideError('mybatis-error');
    mybatisOutput.value = result.sqls.map((s, i) => '-- SQL ' + (i + 1) + '\n' + s).join('\n\n');
    mybatisCount.textContent = result.sqls.length + ' 条';
}

document.getElementById('mybatis-convert').addEventListener('click', runMybatisConvert);
document.getElementById('mybatis-format').addEventListener('click', () => {
    if (!mybatisOutput.value) runMybatisConvert();
    mybatisOutput.value = SqlFormat.beautify(mybatisOutput.value.replace(/^-- SQL \d+\n/gm, '').replace(/\n\n/g, '\n'));
});
document.getElementById('mybatis-copy').addEventListener('click', () => copyText(mybatisOutput.value));
document.getElementById('mybatis-export').addEventListener('click', () => {
    if (!mybatisOutput.value) { toast('无 SQL 可导出'); return; }
    downloadText('mybatis-' + Date.now() + '.sql', mybatisOutput.value);
});
document.getElementById('mybatis-to-explain')?.addEventListener('click', () => {
    if (!mybatisOutput.value) runMybatisConvert();
    const raw = mybatisOutput.value.replace(/^-- SQL \d+\n/gm, '').trim();
    const firstSql = raw.split('\n\n')[0]?.trim() || raw;
    if (!firstSql || firstSql.startsWith('//')) {
        toast('请先转换出有效 SQL');
        return;
    }
    const isSelect = /^\s*select/i.test(firstSql);
    const cmd = isSelect ? 'EXPLAIN ' + firstSql : firstSql;
    const hintEl = document.getElementById('explain-hint');
    if (hintEl) {
        hintEl.classList.remove('hidden');
        hintEl.innerHTML = '<strong>建议先在数据库执行：</strong><pre class="explain-cmd"></pre><span>执行后将 EXPLAIN 结果粘贴到下方，点击「分析」</span>';
        hintEl.querySelector('.explain-cmd').textContent = cmd;
    }
    Nav.activateTab('explain');
    toast('已跳转到 EXPLAIN 助手');
});
document.getElementById('mybatis-clear').addEventListener('click', () => {
    mybatisInput.value = '';
    mybatisOutput.value = '';
    mybatisCount.textContent = '0 条';
    DevKitCore.hideError('mybatis-error');
});

const sqlInput = document.getElementById('sql-input');
const sqlOutput = document.getElementById('sql-output');
document.getElementById('sql-format').addEventListener('click', () => {
    if (typeof DevKitCore !== 'undefined' && !DevKitCore.guardInputSize(sqlInput.value, 'SQL')) return;
    sqlOutput.value = SqlFormat.beautify(sqlInput.value);
});
document.getElementById('sql-minify').addEventListener('click', () => {
    if (typeof DevKitCore !== 'undefined' && !DevKitCore.guardInputSize(sqlInput.value, 'SQL')) return;
    sqlOutput.value = SqlFormat.minify(sqlInput.value);
});
document.getElementById('sql-copy').addEventListener('click', () => copyText(sqlOutput.value));
document.getElementById('sql-clear').addEventListener('click', () => { sqlInput.value = ''; sqlOutput.value = ''; });

const cronResult = document.getElementById('cron-result');
const cronStatus = document.getElementById('cron-status');
const cronRuns = document.getElementById('cron-runs');

async function parseCron() {
    const expression = document.getElementById('cron-input').value.trim();
    const type = document.getElementById('cron-type').value;
    const count = document.getElementById('cron-count').value;
    if (typeof DevKitCore !== 'undefined' && DevKitCore.isSensitiveMode() && type !== 'QUARTZ') {
        toast('敏感模式下本地仅支持 Quartz 表达式');
        return;
    }
    try {
        const data = await CronClient.nextRuns(expression, type, count);
        cronResult.classList.remove('hidden');
        if (data.success) {
            cronStatus.className = 'status ok';
            cronStatus.textContent = '✓ 表达式有效 (' + data.type + (data.local ? ' · 本地解析' : '') + ')';
            cronRuns.innerHTML = data.nextRuns.map(t => '<li>' + t + '</li>').join('');
        } else {
            cronStatus.className = 'status err';
            cronStatus.textContent = '✗ ' + data.message;
            cronRuns.innerHTML = '';
        }
    } catch (e) {
        cronResult.classList.remove('hidden');
        cronStatus.className = 'status err';
        cronStatus.textContent = '✗ 请求失败: ' + e.message;
        cronRuns.innerHTML = '';
    }
}

document.getElementById('cron-parse').addEventListener('click', parseCron);
document.querySelectorAll('.chip[data-cron]').forEach(chip => {
    chip.addEventListener('click', () => {
        document.getElementById('cron-input').value = chip.dataset.cron;
        parseCron();
    });
});

function formatDate(d) {
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

document.getElementById('ts-to-date').addEventListener('click', () => {
    let ts = document.getElementById('ts-input').value.trim();
    if (!ts) return;
    let num = Number(ts);
    if (String(ts).length === 10) num *= 1000;
    const d = new Date(num);
    if (isNaN(d.getTime())) { document.getElementById('ts-date-result').textContent = '无效时间戳'; return; }
    document.getElementById('ts-date-result').innerHTML = `日期: ${formatDate(d)}<br>秒: ${Math.floor(num / 1000)}<br>毫秒: ${num}`;
});

document.getElementById('date-to-ts').addEventListener('click', () => {
    const val = document.getElementById('date-input').value;
    if (!val) return;
    const d = new Date(val);
    document.getElementById('date-ts-result').innerHTML = `秒: ${Math.floor(d.getTime() / 1000)}<br>毫秒: ${d.getTime()}`;
});

function refreshNow() {
    const now = new Date();
    document.getElementById('ts-now-result').innerHTML = `${formatDate(now)}<br>秒: ${Math.floor(now.getTime() / 1000)}<br>毫秒: ${now.getTime()}`;
}
document.getElementById('ts-now').addEventListener('click', refreshNow);
refreshNow();

document.getElementById('uuid-gen').addEventListener('click', () => {
    const count = Math.min(100, Math.max(1, Number(document.getElementById('uuid-count').value) || 1));
    const upper = document.getElementById('uuid-upper').checked;
    const noDash = document.getElementById('uuid-no-dash').checked;
    const lines = [];
    for (let i = 0; i < count; i++) {
        let id = crypto.randomUUID();
        if (noDash) id = id.replace(/-/g, '');
        if (upper) id = id.toUpperCase();
        lines.push(id);
    }
    document.getElementById('uuid-output').value = lines.join('\n');
});
document.getElementById('uuid-copy').addEventListener('click', () => copyText(document.getElementById('uuid-output').value));

// 初始化所有模块
initJsonPro();
initJsonDiff();
initJavaGen();
initJsonSql();
initEncodePro();
initRedisPro();
initConfigConvert();
initRegexPro();
initHashPro();
initExplainPro();
initExplainOcr();
initLogPro();
initJstackPro();
initMavenPro();
initMockGen();
initCronGen();
initTsGoGen();
initTextDiff();
initDotenvPro();
initFakeData();
initJwtPro();
initCommandPalette();

(async function bootstrap() {
    await DevKitCore.init();
    initEmptyStates();
    ProCommon.initTheme();
    ProCommon.initWorkspace();
    ProCommon.initDragDrop(['mybatis-input', 'sql-input', 'json-input', 'config-input', 'log-input', 'explain-input', 'jstack-input', 'maven-input', 'dotenv-input', 'textdiff-left', 'textdiff-right']);
    ProCommon.initResizer('json-resizer', '#json-pane-left', '#json-pane-right');

    document.getElementById('cmd-palette-open')?.addEventListener('click', () => CommandPalette.open());

    ProCommon.bindHistorySave('mybatis', 'mybatis-input');
    ProCommon.bindHistorySave('sql', 'sql-input');
    ProCommon.bindHistorySave('config', 'config-input');
    ProCommon.bindHistorySave('log', 'log-input');
    ProCommon.bindHistorySave('dotenv', 'dotenv-input');
    document.querySelector('.history-save[data-tool="json"]')?.addEventListener('click', () => {
        const el = document.getElementById('json-input');
        if (el) ProCommon.pushHistory('json', el.value);
        toast('已保存到历史');
    });
    ProCommon.refreshHistoryUI('json');
    ProCommon.refreshHistoryUI('mybatis');

    document.getElementById('encode-to-jwt')?.addEventListener('click', () => {
        const jwtIn = document.getElementById('jwt-input');
        Nav.activateTab('jwt');
        setTimeout(() => {
            const panelIn = document.getElementById('jwt-panel-input');
            if (panelIn && jwtIn && jwtIn.value.trim()) panelIn.value = jwtIn.value;
            else if (panelIn && typeof DevKitExamples !== 'undefined') {
                panelIn.value = DevKitExamples.jwt || '';
            }
            toast('已跳转到 JWT 解码');
        }, 80);
    });

    document.getElementById('workspace-close')?.addEventListener('click', () => {
        document.getElementById('workspace-drawer').classList.remove('open');
    });
})();
