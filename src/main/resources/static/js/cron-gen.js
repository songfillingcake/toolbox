/**
 * Cron 反向生成（常用场景 → Quartz 表达式）
 */
const CronGen = (() => {

    const PRESETS = {
        daily2am: { label: '每天凌晨 2 点', cron: '0 0 2 * * ?' },
        daily9am: { label: '每天上午 9 点', cron: '0 0 9 * * ?' },
        every5min: { label: '每 5 分钟', cron: '0 0/5 * * * ?' },
        everyHour: { label: '每小时整点', cron: '0 0 * * * ?' },
        weekday9: { label: '工作日 9 点', cron: '0 0 9 ? * MON-FRI' },
        monthFirst: { label: '每月 1 号 0 点', cron: '0 0 0 1 * ?' },
        sunday: { label: '每周日 10 点', cron: '0 0 10 ? * SUN' }
    };

    function fromForm(form) {
        const { mode, hour, minute, second, dayOfWeek, dayOfMonth, interval } = form;
        if (mode === 'daily') {
            return second + ' ' + minute + ' ' + hour + ' * * ?';
        }
        if (mode === 'interval') {
            return '0 0/' + interval + ' * * * ?';
        }
        if (mode === 'weekly') {
            return second + ' ' + minute + ' ' + hour + ' ? * ' + dayOfWeek;
        }
        if (mode === 'monthly') {
            return second + ' ' + minute + ' ' + hour + ' ' + dayOfMonth + ' * ?';
        }
        return '0 0 2 * * ?';
    }

    return { PRESETS, fromForm };
})();

function initCronGen() {
    const wrap = document.getElementById('cron-gen-presets');
    if (!wrap) return;

    Object.keys(CronGen.PRESETS).forEach(key => {
        const p = CronGen.PRESETS[key];
        const btn = document.createElement('button');
        btn.className = 'chip';
        btn.textContent = p.label;
        btn.addEventListener('click', () => {
            document.getElementById('cron-input').value = p.cron;
            document.getElementById('cron-gen-output').value = p.cron;
            parseCron();
        });
        wrap.appendChild(btn);
    });

    document.getElementById('cron-gen-build').addEventListener('click', () => {
        const cron = CronGen.fromForm({
            mode: document.getElementById('cron-gen-mode').value,
            second: document.getElementById('cron-gen-second').value || '0',
            minute: document.getElementById('cron-gen-minute').value || '0',
            hour: document.getElementById('cron-gen-hour').value || '2',
            dayOfWeek: document.getElementById('cron-gen-dow').value || 'MON-FRI',
            dayOfMonth: document.getElementById('cron-gen-dom').value || '1',
            interval: document.getElementById('cron-gen-interval').value || '5'
        });
        document.getElementById('cron-gen-output').value = cron;
        document.getElementById('cron-input').value = cron;
        parseCron();
        toast('已生成 Cron');
    });

    document.getElementById('cron-gen-copy').addEventListener('click', () =>
        copyText(document.getElementById('cron-gen-output').value));
}
