/**

 * JSON → Java 实体类生成（增强：record / Schema / 日期 / BigDecimal）

 */

const JavaGen = (() => {



    const DATE_RE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2})?/;



    function toClassName(name) {

        const parts = name.replace(/[^a-zA-Z0-9]/g, ' ').trim().split(/\s+/);

        let result = parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('');

        if (/^\d/.test(result)) result = 'Item' + result;

        if (!result) result = 'RootBean';

        return result;

    }



    function toFieldName(name) {

        if (!name) return 'field';

        let f = name.replace(/[^a-zA-Z0-9_]/g, '_');

        if (/^[A-Z]/.test(f)) f = f.charAt(0).toLowerCase() + f.slice(1);

        if (/^\d/.test(f)) f = 'field' + f;

        return f;

    }



    function inferType(val, key, className, options) {

        if (val === null) return options.nullable ? 'Object' : 'Object';

        if (typeof val === 'boolean') return 'Boolean';

        if (typeof val === 'number') {

            if (!Number.isInteger(val)) return options.useBigDecimal ? 'BigDecimal' : 'Double';

            return 'Long';

        }

        if (typeof val === 'string') {

            if (options.useDateTypes && DATE_RE.test(val)) {

                return val.includes('T') ? 'LocalDateTime' : 'LocalDate';

            }

            return 'String';

        }

        if (Array.isArray(val)) {

            if (val.length === 0) return 'List<Object>';

            return 'List<' + inferType(val[0], key, className + 'Item', options) + '>';

        }

        return toClassName(key);

    }



    function collectClasses(obj, className, classes, options) {

        className = className || 'RootBean';

        if (classes.has(className)) return;

        if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) return;



        const fields = [];

        Object.keys(obj).forEach(key => {

            const val = obj[key];

            const type = inferType(val, key, className, options);

            fields.push({ name: toFieldName(key), jsonKey: key, type });



            if (val !== null && typeof val === 'object' && !Array.isArray(val)) {

                collectClasses(val, toClassName(key), classes, options);

            } else if (Array.isArray(val) && val.length > 0 && val[0] !== null && typeof val[0] === 'object' && !Array.isArray(val[0])) {

                collectClasses(val[0], toClassName(key) + 'Item', classes, options);

            }

        });

        classes.set(className, fields);

    }



    function generate(json, options) {

        options = options || {};

        const rootName = options.className || 'RootBean';

        const useLombok = options.lombok !== false;

        const useJackson = options.jackson !== false;

        const useSchema = options.schema === true;

        const useRecord = options.record === true;

        const nestedStatic = options.nestedStatic !== false;

        const pkg = options.packageName || 'com.example.dto';



        const parsed = typeof json === 'string' ? JSON.parse(json) : json;

        const classes = new Map();

        collectClasses(parsed, toClassName(rootName), classes, options);



        const parts = [];

        parts.push('package ' + pkg + ';\n');



        if (useLombok && !useRecord) parts.push('import lombok.Data;');

        if (useJackson) parts.push('import com.fasterxml.jackson.annotation.JsonProperty;');

        if (useSchema) parts.push('import io.swagger.v3.oas.annotations.media.Schema;');

        if (options.useDateTypes) {

            parts.push('import java.time.LocalDate;');

            parts.push('import java.time.LocalDateTime;');

        }

        if (options.useBigDecimal) parts.push('import java.math.BigDecimal;');

        parts.push('import java.util.List;\n');



        const classNames = [...classes.keys()];

        classNames.forEach((clsName, idx) => {

            const fields = classes.get(clsName);

            const isNested = idx > 0 && nestedStatic;

            if (isNested) parts.push('    ');

            if (useSchema) parts.push((isNested ? '    ' : '') + '@Schema(description = "' + clsName + '")');

            if (useLombok && !useRecord) parts.push((isNested ? '    ' : '') + '@Data');

            if (useRecord) {

                parts.push((isNested ? '    ' : '') + 'public record ' + clsName + '(');

                fields.forEach((f, i) => {

                    let line = '        ';

                    if (useJackson && f.jsonKey !== f.name) line += '@JsonProperty("' + f.jsonKey + '") ';

                    line += f.type + ' ' + f.name + (i < fields.length - 1 ? ',' : '');

                    parts.push(line);

                });

                parts.push((isNested ? '    ' : '') + ') {}\n');

            } else {

                parts.push((isNested ? '    ' : '') + 'public ' + (isNested ? 'static ' : '') + 'class ' + clsName + ' {\n');

                fields.forEach(f => {

                    if (useJackson && f.jsonKey !== f.name) {

                        parts.push('    @JsonProperty("' + f.jsonKey + '")');

                    }

                    if (useSchema) parts.push('    @Schema(description = "' + f.jsonKey + '")');

                    parts.push('    private ' + f.type + ' ' + f.name + ';\n');

                });

                parts.push((isNested ? '    ' : '') + '}\n');

            }

        });



        return parts.join('\n');

    }



    return { generate, toClassName, toFieldName };

})();



function initJavaGen() {

    const genBtn = document.getElementById('java-gen-run');

    if (!genBtn) return;



    genBtn.addEventListener('click', () => {

        const jsonInput = document.getElementById('json-input');

        const output = document.getElementById('java-gen-output');

        const result = JsonPro.parseWithDetail(jsonInput.value);

        if (!result.ok) {

            toast('请先输入合法 JSON');

            return;

        }

        try {

            output.value = JavaGen.generate(result.value, {

                className: document.getElementById('java-class-name').value || 'RootBean',

                packageName: document.getElementById('java-package').value || 'com.example.dto',

                lombok: document.getElementById('java-lombok').checked,

                jackson: document.getElementById('java-jackson').checked,

                schema: document.getElementById('java-schema') && document.getElementById('java-schema').checked,

                record: document.getElementById('java-record') && document.getElementById('java-record').checked,

                useDateTypes: document.getElementById('java-date') && document.getElementById('java-date').checked,

                useBigDecimal: document.getElementById('java-bigdecimal') && document.getElementById('java-bigdecimal').checked,

                nestedStatic: document.getElementById('java-nested') ? document.getElementById('java-nested').checked : true

            });

            toast('Java 实体已生成');

        } catch (e) {

            toast('生成失败: ' + e.message);

        }

    });



    document.getElementById('java-gen-copy').addEventListener('click', () => {

        copyText(document.getElementById('java-gen-output').value);

    });

}


