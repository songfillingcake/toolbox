/**
 * 各工具示例数据
 */
const DevKitExamples = (() => {

    const SAMPLES = {
        mybatis: `==>  Preparing: SELECT userid, nickname, \`when\` FROM balance_change_log_202606 WHERE touserid = ? AND why = ? AND \`when\` > ?
==> Parameters: 100000284(Long), 1(Integer), 1782662400(Long)
==>  Preparing: UPDATE user_wallet SET balance = balance - ? WHERE userid = ?
==> Parameters: 99.50(BigDecimal), 100000284(Long)`,

        sql: `select u.id,u.nickname,r.role_name from user u left join user_role ur on u.id=ur.user_id left join role r on ur.role_id=r.id where u.status=1 order by u.id desc limit 10`,

        json: JSON.stringify({
            code: 0,
            message: "success",
            data: {
                userId: 100000284,
                nickname: "秀场主播7610",
                tags: ["live", "gift"],
                extra: { level: 12, vip: false, balance: 1288.5 }
            }
        }, null, 2),

        config: `spring.datasource.url=jdbc:mysql://127.0.0.1:3306/live_db?useSSL=false
spring.datasource.username=root
spring.datasource.password=secret
server.port=8080
logging.level.com.bmt=DEBUG`,

        explain: `id\tselect_type\ttable\tpartitions\ttype\tpossible_keys\tkey\tkey_len\tref\trows\tfiltered\tExtra
1\tSIMPLE\tbalance_change_log_202606\tNULL\tALL\tNULL\tNULL\tNULL\tNULL\t125000\t10.00\tUsing where`,

        log: `2026-06-22 14:32:01.123 INFO  [http-nio-8080-exec-5] c.bmt.service.GiftService - send gift userId=100001 {"giftId":88,"count":1}
2026-06-22 14:32:01.456 ERROR [http-nio-8080-exec-5] c.bmt.service.WalletService - balance not enough userId=100001
2026-06-22 14:32:02.001 WARN  [scheduling-1] c.bmt.job.SettleJob - retry settle batch=2026062201`,

        jstack: `"http-nio-8080-exec-12" #45 prio=5 os_prio=0 tid=0x00007f8c1c012800 nid=0x1a2b waiting on condition
   java.lang.Thread.State: WAITING (parking)
\tat jdk.internal.misc.Unsafe.park(java.base@21/Native Method)
\tat com.bmt.service.LiveRoomService.joinRoom(LiveRoomService.java:88)

"pool-2-thread-3" #52 prio=5 os_prio=0 tid=0x00007f8c1c023000 nid=0x1a32 blocked on lock
   java.lang.Thread.State: BLOCKED (on object monitor)
\tat com.bmt.cache.RedisLock.tryLock(RedisLock.java:42)`,

        maven: `[INFO] com.bmt:live-service:jar:1.0.0
[INFO] +- org.springframework.boot:spring-boot-starter-web:jar:3.2.10:compile
[INFO] |  +- com.fasterxml.jackson.core:jackson-databind:jar:2.15.4:compile
[INFO] +- com.alibaba:fastjson:jar:1.2.83:compile
[INFO] \\- com.other:legacy-sdk:jar:2.0.0:compile
[INFO]    \\- com.fasterxml.jackson.core:jackson-databind:jar:2.12.7:compile`,

        regex: 'orderId=ORD20260622001 userId=100000284 amount=99.50',
        hash: 'appId=live001&nonce=abc123&timestamp=1782662400&key=your_secret',
        redis: 'HSET user:100000284 nickname "主播7610" level 12\nGET user:100000284\nTTL user:100000284',
        encode: 'https://api.example.com/callback?orderId=12345&sign=abc%2Bdef',
        jwt: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMDAwMDAyODQiLCJuYW1lIjoi5ri45a6iIiwiaWF0IjoxNzgyNjYyNDAwLCJleHAiOjE3ODI2NjYwMDB9.signature',

        dotenv: `DB_HOST=127.0.0.1\nDB_PORT=3306\nDB_NAME=live_db\nDB_USER=root\nDB_PASSWORD=your_secret\nREDIS_URL=redis://127.0.0.1:6379\nSPRING_PROFILES_ACTIVE=dev`,

        textdiff: 'spring.datasource.url=jdbc:mysql://127.0.0.1:3306/old_db\nserver.port=8080',

        linechart: 'date,value,series\n2026-01-01,10,A\n2026-01-02,15,A\n2026-01-03,12,A\n2026-01-01,8,B\n2026-01-02,11,B\n2026-01-03,18,B',

        jwt: 'jwt token 解码 payload header 过期',

        faker: '__auto__',

        cron: '0 0 2 * * ?',
        uuid: '__auto__',
        timestamp: '__auto__',
        mock: '__auto__',
        jwt: '__auto__'
    };

    const INPUT_MAP = {
        mybatis: 'mybatis-input', sql: 'sql-input', json: 'json-input',
        config: 'config-input', explain: 'explain-input', log: 'log-input',
        jstack: 'jstack-input', maven: 'maven-input', regex: 'regex-text',
        hash: 'hash-input', redis: 'redis-input', encode: 'url-input',
        dotenv: 'dotenv-input', textdiff: 'textdiff-left', linechart: 'linechart-input',
        cron: 'cron-input', uuid: 'uuid-count', timestamp: 'ts-input',
        jwt: 'jwt-panel-input'
    };

    function load(tool) {
        if (tool === 'encode') {
            const b64 = document.getElementById('b64-input');
            const url = document.getElementById('url-input');
            const jwt = document.getElementById('jwt-input');
            if (b64) b64.value = 'Hello DevKit 你好';
            if (url) url.value = SAMPLES.encode;
            if (jwt) jwt.value = SAMPLES.jwt;
            toast('已加载编码示例');
            return;
        }
        if (tool === 'faker') {
            const typeEl = document.getElementById('faker-type');
            const seedEl = document.getElementById('faker-seed');
            if (typeEl) typeEl.value = 'user';
            if (seedEl) seedEl.value = '42';
            document.getElementById('faker-count').value = '5';
            document.getElementById('faker-gen')?.click();
            toast('已生成测试数据示例（种子 42）');
            return;
        }
        if (tool === 'uuid') {
            document.getElementById('uuid-count').value = '3';
            document.getElementById('uuid-gen')?.click();
            toast('已生成 UUID 示例');
            return;
        }
        if (tool === 'timestamp') {
            const now = Math.floor(Date.now() / 1000);
            const el = document.getElementById('ts-input');
            if (el) el.value = String(now);
            document.getElementById('ts-to-date')?.click();
            toast('已加载当前时间戳');
            return;
        }
        if (tool === 'cron') {
            const el = document.getElementById('cron-input');
            if (el) el.value = SAMPLES.cron;
            document.getElementById('cron-parse')?.click();
            toast('已加载 Cron 示例');
            return;
        }
        if (tool === 'mock') {
            DevKitExamples.load('json');
            setTimeout(() => Nav.activateTab('mock'), 200);
            toast('已加载 JSON 示例，可在 Mock 生成继续');
            return;
        }
        if (tool === 'jwt') {
            const el = document.getElementById('jwt-panel-input');
            if (el) el.value = SAMPLES.jwt;
            document.getElementById('jwt-panel-parse')?.click();
            toast('已加载 JWT 示例');
            return;
        }
        const sample = SAMPLES[tool];
        if (!sample) { toast('暂无示例'); return; }
        const inputId = INPUT_MAP[tool];
        if (inputId) {
            const el = document.getElementById(inputId);
            if (el) {
                el.value = sample;
                el.dispatchEvent(new Event('input', { bubbles: true }));
            }
        }
        if (tool === 'jwt') {
            const jwtIn = document.getElementById('jwt-input');
            if (jwtIn) jwtIn.value = sample;
        }
        if (tool === 'json') {
            const diffLeft = document.getElementById('json-diff-left');
            if (diffLeft) diffLeft.value = sample;
        }
        toast('已加载示例数据');
        if (tool === 'textdiff') {
            const right = document.getElementById('textdiff-right');
            if (right) right.value = 'spring.datasource.url=jdbc:mysql://127.0.0.1:3306/new_db\nserver.port=8088\nlogging.level.root=INFO';
        }
        const primary = document.querySelector('#panel-' + tool + ' .btn.primary');
        if (primary && tool !== 'json') setTimeout(() => primary.click(), 100);
    }

    return Object.assign({ load }, SAMPLES);
})();
