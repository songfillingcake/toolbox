/**
 * JSON 数组 → SQL INSERT
 */
const JsonSql = (() => {

    function escapeSql(val) {
        if (val === null || val === undefined) return 'NULL';
        if (typeof val === 'boolean') return val ? '1' : '0';
        if (typeof val === 'number') return String(val);
        return "'" + String(val).replace(/'/g, "''") + "'";
    }

    function toInsert(rows, tableName) {
        if (!Array.isArray(rows) || rows.length === 0) throw new Error('需要 JSON 数组');
        tableName = tableName || 'your_table';
        const cols = Object.keys(rows[0]);
        const header = 'INSERT INTO ' + tableName + ' (' + cols.join(', ') + ') VALUES';
        const values = rows.map(row => {
            const vals = cols.map(c => escapeSql(row[c]));
            return '(' + vals.join(', ') + ')';
        });
        return values.map(v => header + '\n' + v + ';').join('\n\n');
    }

    return { toInsert };
})();

function initJsonSql() {
    const btn = document.getElementById('json-sql-run');
    if (!btn) return;
    btn.addEventListener('click', () => {
        const result = JsonPro.parseWithDetail(document.getElementById('json-input').value);
        if (!result.ok) { toast('JSON 不合法'); return; }
        const data = Array.isArray(result.value) ? result.value :
            (result.value.data && Array.isArray(result.value.data) ? result.value.data : [result.value]);
        try {
            document.getElementById('json-sql-output').value = JsonSql.toInsert(
                data, document.getElementById('json-sql-table').value || 'your_table');
            toast('INSERT 已生成');
        } catch (e) {
            toast(e.message);
        }
    });
    document.getElementById('json-sql-copy').addEventListener('click', () =>
        copyText(document.getElementById('json-sql-output').value));
}
