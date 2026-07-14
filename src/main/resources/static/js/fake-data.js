/**
 * 测试数据生成（JSON 数组，可复现种子，便于导入 JSON Pro / Mock）
 */
const FakeData = (() => {

    const SURNAMES = ['张', '王', '李', '赵', '刘', '陈', '杨', '黄', '周', '吴'];
    const NAMES = ['伟', '芳', '娜', '敏', '静', '丽', '强', '磊', '洋', '艳', '勇', '军', '杰', '娟', '涛'];
    const DOMAINS = ['example.com', 'test.io', 'demo.cn', 'mail.dev'];
    const CITIES = ['北京', '上海', '广州', '深圳', '杭州', '成都', '武汉', '西安'];
    const PRODUCTS = ['月度会员', '年度 VIP', '直播礼物包', '道具礼包', '充值钻石', '皮肤盲盒', '经验加速卡'];
    const GIFTS = ['玫瑰', '跑车', '火箭', '城堡', '比心', '棒棒糖', '皇冠'];
    const LIVE_TITLES = ['深夜聊天室', '游戏上分局', '户外探店', '新歌首唱', '技术分享会'];

    let rng = Math.random;

    function mulberry32(seed) {
        let s = seed >>> 0;
        return function () {
            s += 0x6D2B79F5;
            let t = s;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    function setSeed(seed) {
        const n = parseInt(seed, 10);
        rng = Number.isFinite(n) ? mulberry32(n) : Math.random;
    }

    function pick(arr) {
        return arr[Math.floor(rng() * arr.length)];
    }

    function randomInt(min, max) {
        return Math.floor(rng() * (max - min + 1)) + min;
    }

    function randomPhone() {
        const prefixes = ['130', '131', '132', '133', '135', '136', '137', '138', '139', '150', '151', '152', '157', '158', '159', '186', '187', '188'];
        return pick(prefixes) + String(randomInt(10000000, 99999999));
    }

    function randomUser(i) {
        const surname = pick(SURNAMES);
        const name = pick(NAMES) + (rng() > 0.5 ? pick(NAMES) : '');
        const nickname = surname + name;
        const userId = 100000000 + randomInt(1, 9999999);
        return {
            userId,
            nickname,
            phone: randomPhone(),
            email: 'user' + userId + '@' + pick(DOMAINS),
            city: pick(CITIES),
            level: randomInt(1, 50),
            vip: rng() > 0.7,
            balance: Number((rng() * 10000).toFixed(2)),
            createTime: new Date(Date.now() - randomInt(0, 86400000 * 365)).toISOString()
        };
    }

    function randomOrder(i) {
        const orderId = 'ORD' + Date.now() + randomInt(100, 999) + i;
        return {
            orderId,
            userId: 100000000 + randomInt(1, 9999999),
            amount: Number((rng() * 500 + 1).toFixed(2)),
            status: pick(['PENDING', 'PAID', 'SHIPPED', 'DONE', 'CANCELLED']),
            productName: pick(PRODUCTS),
            quantity: randomInt(1, 5),
            createdAt: new Date(Date.now() - randomInt(0, 86400000 * 30)).toISOString()
        };
    }

    function randomProduct(i) {
        const id = 'SKU' + randomInt(10000, 99999);
        return {
            productId: id,
            name: pick(PRODUCTS),
            price: Number((rng() * 299 + 1).toFixed(2)),
            stock: randomInt(0, 5000),
            category: pick(['virtual', 'membership', 'gift', 'prop']),
            onSale: rng() > 0.2,
            tags: [pick(['hot', 'new', 'limited']), pick(['vip', 'daily', 'event'])].filter((v, idx, a) => a.indexOf(v) === idx)
        };
    }

    function randomLive(i) {
        const roomId = 900000 + randomInt(1, 99999);
        return {
            roomId,
            anchorId: 100000000 + randomInt(1, 9999999),
            title: pick(LIVE_TITLES),
            viewers: randomInt(10, 50000),
            status: pick(['LIVE', 'PREVIEW', 'ENDED']),
            category: pick(['chat', 'game', 'music', 'tech']),
            startedAt: new Date(Date.now() - randomInt(0, 7200000)).toISOString()
        };
    }

    function randomGift(i) {
        return {
            giftId: 'G' + randomInt(1000, 9999),
            name: pick(GIFTS),
            price: randomInt(1, 9999),
            combo: rng() > 0.6,
            animation: pick(['fade', 'burst', 'fly', 'none'])
        };
    }

    const GENERATORS = {
        user: randomUser,
        order: randomOrder,
        product: randomProduct,
        live: randomLive,
        gift: randomGift
    };

    function generate(type, count) {
        const gen = GENERATORS[type] || randomUser;
        const n = Math.min(200, Math.max(1, count));
        const list = [];
        for (let i = 0; i < n; i++) list.push(gen(i));
        return list;
    }

    return { generate, setSeed, GENERATORS };
})();

function initFakeData() {
    const output = document.getElementById('faker-output');
    if (!output) return;

    function doGenerate() {
        const seedEl = document.getElementById('faker-seed');
        FakeData.setSeed(seedEl && seedEl.value.trim() ? seedEl.value.trim() : null);
        const type = document.getElementById('faker-type').value;
        const count = parseInt(document.getElementById('faker-count').value, 10) || 5;
        const data = FakeData.generate(type, count);
        output.value = JSON.stringify(data, null, 2);
        toast('已生成 ' + data.length + ' 条');
        document.dispatchEvent(new Event('empty-sync'));
        return output.value;
    }

    document.getElementById('faker-gen').addEventListener('click', doGenerate);
    document.getElementById('faker-copy').addEventListener('click', () => copyText(output.value));
    document.getElementById('faker-export').addEventListener('click', () => {
        if (!output.value.trim()) { toast('请先生成数据'); return; }
        const type = document.getElementById('faker-type').value;
        downloadText(output.value, 'fake-' + type + '.json');
    });
    document.getElementById('faker-to-json').addEventListener('click', () => {
        if (!output.value.trim()) doGenerate();
        if (!output.value.trim()) return;
        Nav.activateTab('json');
        setTimeout(() => {
            const el = document.getElementById('json-input');
            if (el) {
                el.value = output.value;
                el.dispatchEvent(new Event('input', { bubbles: true }));
            }
            toast('已发送到 JSON Pro');
        }, 80);
    });
    document.getElementById('faker-to-mock').addEventListener('click', () => {
        if (!output.value.trim()) doGenerate();
        if (!output.value.trim()) return;
        Nav.activateTab('json');
        setTimeout(() => {
            const el = document.getElementById('json-input');
            if (el) {
                el.value = output.value;
                el.dispatchEvent(new Event('input', { bubbles: true }));
            }
            Nav.activateTab('mock');
            setTimeout(() => document.getElementById('mock-gen-run')?.click(), 120);
            toast('已发送到 Mock 生成');
        }, 80);
    });
}
