const SqlFormat = (() => {
    const KEYWORDS = [
        'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'ORDER BY', 'GROUP BY', 'HAVING',
        'INSERT INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE FROM', 'JOIN', 'LEFT JOIN',
        'RIGHT JOIN', 'INNER JOIN', 'OUTER JOIN', 'ON', 'LIMIT', 'OFFSET', 'AS',
        'IN', 'NOT', 'NULL', 'IS', 'BETWEEN', 'LIKE', 'DISTINCT', 'UNION', 'CASE',
        'WHEN', 'THEN', 'ELSE', 'END', 'EXISTS'
    ];

    function normalize(sql) { return sql.replace(/\s+/g, ' ').trim(); }

    function upperKeywords(sql) {
        let result = sql;
        for (const kw of [...KEYWORDS].sort((a, b) => b.length - a.length)) {
            const regex = new RegExp('\\b' + kw.replace(/ /g, '\\s+') + '\\b', 'gi');
            result = result.replace(regex, kw);
        }
        return result;
    }

    function beautify(sql) {
        let s = upperKeywords(normalize(sql));
        for (const kw of ['SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'ORDER BY', 'GROUP BY', 'HAVING', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN', 'JOIN', 'LIMIT']) {
            const regex = new RegExp('\\s+(' + kw.replace(/ /g, '\\s+') + ')\\b', 'gi');
            s = s.replace(regex, '\n$1');
        }
        return s.split('\n').map(l => l.trim()).filter(Boolean).join('\n');
    }

    function minify(sql) { return normalize(upperKeywords(sql)); }
    return { beautify, minify };
})();
