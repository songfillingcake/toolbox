const MyBatisSql = (() => {
    const STRING_TYPES = [
        'String', 'string', 'Date', 'Timestamp', 'LocalDateTime',
        'LocalDate', 'LocalTime', 'Time', 'BigDecimal', 'char', 'Character'
    ];

    function parseParameters(paramLine) {
        const params = [];
        let current = '';
        let depth = 0;
        for (const ch of paramLine) {
            if (ch === '(') depth++;
            if (ch === ')') depth--;
            if (ch === ',' && depth === 0) {
                if (current.trim()) params.push(parseOneParam(current.trim()));
                current = '';
            } else {
                current += ch;
            }
        }
        if (current.trim()) params.push(parseOneParam(current.trim()));
        return params;
    }

    function parseOneParam(raw) {
        const match = raw.match(/^(.+)\(([^)]+)\)$/);
        if (match) return { value: match[1].trim(), type: match[2].trim() };
        return { value: raw, type: 'String' };
    }

    function formatValue(value, type) {
        if (value === 'null' || value === '') return 'NULL';
        const isString = STRING_TYPES.some(t => type.toLowerCase().includes(t.toLowerCase()));
        if (isString) return "'" + value.replace(/'/g, "''") + "'";
        return value;
    }

    function convertBlock(preparingSql, paramLine) {
        let sql = preparingSql.trim();
        if (!paramLine) return sql;
        for (const param of parseParameters(paramLine)) {
            sql = sql.replace('?', formatValue(param.value, param.type));
        }
        return sql;
    }

    function convertAll(logText) {
        if (!logText || !logText.trim()) return { sqls: [], error: '请输入 MyBatis 日志' };

        const lines = logText.split(/\r?\n/);
        const sqls = [];
        let preparing = null;
        let params = null;

        const flush = () => {
            if (preparing) sqls.push(convertBlock(preparing, params));
            preparing = null;
            params = null;
        };

        for (const line of lines) {
            const prepMatch = line.match(/==>\s*Preparing:\s*(.+)/i);
            const paramMatch = line.match(/==>\s*Parameters:\s*(.+)/i);
            if (prepMatch) { flush(); preparing = prepMatch[1]; continue; }
            if (paramMatch && preparing) { params = paramMatch[1]; flush(); }
        }
        flush();

        if (sqls.length === 0) {
            const prep = logText.match(/Preparing:\s*(.+?)(?:\s*==>|$)/is);
            const par = logText.match(/Parameters:\s*(.+)/i);
            if (prep) sqls.push(convertBlock(prep[1].trim(), par ? par[1].trim() : null));
        }

        if (sqls.length === 0) return { sqls: [], error: '未识别到 MyBatis 日志格式' };
        return { sqls, error: null };
    }

    return { convertAll, convertBlock };
})();

if (typeof globalThis !== 'undefined') globalThis.__MyBatisSql = MyBatisSql;
