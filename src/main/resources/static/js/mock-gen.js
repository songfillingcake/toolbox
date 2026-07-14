/**
 * JSON → Spring Mock Controller 生成
 */
const MockGen = (() => {

    function generate(json, className, basePath) {
        className = className || 'MockController';
        basePath = basePath || '/api/mock';
        const parsed = typeof json === 'string' ? JSON.parse(json) : json;
        const body = JSON.stringify(parsed, null, 4).split('\n').map(l => '        ' + l).join('\n');

        return 'package com.example.mock;\n\n' +
            'import org.springframework.web.bind.annotation.GetMapping;\n' +
            'import org.springframework.web.bind.annotation.RequestMapping;\n' +
            'import org.springframework.web.bind.annotation.RestController;\n\n' +
            '@RestController\n' +
            '@RequestMapping("' + basePath + '")\n' +
            'public class ' + className + ' {\n\n' +
            '    @GetMapping("/data")\n' +
            '    public Object data() {\n' +
            '        return ' + body.trim() + ';\n' +
            '    }\n' +
            '}\n';
    }

    return { generate };
})();

function initMockGen() {
    const btn = document.getElementById('mock-gen-run');
    if (!btn) return;
    btn.addEventListener('click', () => {
        const jsonInput = document.getElementById('json-input');
        const result = JsonPro.parseWithDetail(jsonInput.value);
        if (!result.ok) { toast('请先在 JSON Pro 输入合法 JSON'); return; }
        try {
            document.getElementById('mock-gen-output').value = MockGen.generate(
                result.value,
                document.getElementById('mock-class-name').value || 'MockController',
                document.getElementById('mock-base-path').value || '/api/mock'
            );
            toast('Mock Controller 已生成');
        } catch (e) {
            toast('生成失败: ' + e.message);
        }
    });
    document.getElementById('mock-gen-copy').addEventListener('click', () =>
        copyText(document.getElementById('mock-gen-output').value));
}
