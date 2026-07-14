/**
 * Redis 命令格式化与说明
 */
const RedisFormat = (() => {

    const CMD_HELP = {
        GET: '获取字符串值  GET key',
        SET: '设置字符串  SET key value [EX seconds]',
        DEL: '删除键  DEL key [key ...]',
        HGET: '获取哈希字段  HGET key field',
        HSET: '设置哈希字段  HSET key field value',
        HGETALL: '获取全部哈希  HGETALL key',
        LPUSH: '左侧入队  LPUSH key element [element ...]',
        RPUSH: '右侧入队  RPUSH key element [element ...]',
        LRANGE: '列表范围  LRANGE key start stop',
        SADD: '集合添加  SADD key member [member ...]',
        SMEMBERS: '集合成员  SMEMBERS key',
        ZADD: '有序集合  ZADD key score member [score member ...]',
        EXPIRE: '设置过期  EXPIRE key seconds',
        TTL: '查询 TTL  TTL key',
        KEYS: '匹配键(生产慎用)  KEYS pattern',
        SCAN: '迭代扫描  SCAN cursor [MATCH pattern] [COUNT count]',
        INCR: '自增  INCR key',
        DECR: '自减  DECR key'
    };

    function formatCommand(line) {
        line = line.trim();
        if (!line) return '';

        const parts = splitRedisArgs(line);
        if (parts.length === 0) return line;

        const cmd = parts[0].toUpperCase();
        const formatted = [cmd, ...parts.slice(1)].join(' ');

        const upper = line.toUpperCase();
        let warnings = [];
        if (upper.startsWith('KEYS ')) warnings.push('⚠ KEYS 会阻塞 Redis，生产环境请用 SCAN');
        if (upper.startsWith('FLUSHALL') || upper.startsWith('FLUSHDB')) warnings.push('⚠ 危险命令：清空数据');
        if (upper.includes('*') && upper.startsWith('DEL ')) warnings.push('⚠ 批量删除，请确认 key 范围');

        let help = CMD_HELP[cmd] || '';

        return formatted + (help ? '\n\n# ' + help : '') + (warnings.length ? '\n\n' + warnings.join('\n') : '');
    }

    function splitRedisArgs(line) {
        const args = [];
        let cur = '';
        let inQuote = false;
        let quote = '';

        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (inQuote) {
                if (ch === quote) inQuote = false;
                else cur += ch;
            } else if (ch === '"' || ch === "'") {
                inQuote = true;
                quote = ch;
            } else if (/\s/.test(ch)) {
                if (cur) { args.push(cur); cur = ''; }
            } else {
                cur += ch;
            }
        }
        if (cur) args.push(cur);
        return args;
    }

    function batchFormat(text) {
        return text.split('\n').map(l => {
            if (!l.trim() || l.trim().startsWith('#')) return l;
            return formatCommand(l);
        }).join('\n\n');
    }

    return { formatCommand, batchFormat, CMD_HELP };
})();

function initRedisPro() {
    const input = document.getElementById('redis-input');
    if (!input) return;

    document.getElementById('redis-format').addEventListener('click', () => {
        document.getElementById('redis-output').value = RedisFormat.batchFormat(input.value);
        toast('Redis 命令已格式化');
    });

    document.getElementById('redis-copy').addEventListener('click', () => {
        copyText(document.getElementById('redis-output').value);
    });

    document.getElementById('redis-clear').addEventListener('click', () => {
        input.value = '';
        document.getElementById('redis-output').value = '';
    });

    document.querySelectorAll('.redis-cmd-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            input.value = chip.dataset.cmd;
            document.getElementById('redis-output').value = RedisFormat.formatCommand(chip.dataset.cmd);
        });
    });
}
