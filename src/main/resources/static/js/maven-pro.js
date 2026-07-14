/**
 * Maven dependency:tree 冲突检测
 */
const MavenPro = (() => {

    function parse(text) {
        const lines = text.split(/\r?\n/).filter(l => l.includes(':'));
        const artifacts = [];
        lines.forEach(line => {
            const m = line.match(/([a-zA-Z0-9_.-]+):([a-zA-Z0-9_.-]+):([a-zA-Z0-9_.-]+):([^\s]+)/);
            if (m) {
                const depth = (line.match(/\+/g) || line.match(/\|/g) || []).length;
                artifacts.push({
                    groupId: m[1], artifactId: m[2], type: m[3], version: m[4],
                    line: line.trim(), depth
                });
            }
        });
        return artifacts;
    }

    function findConflicts(artifacts) {
        const map = {};
        const conflicts = [];
        artifacts.forEach(a => {
            const key = a.groupId + ':' + a.artifactId;
            if (!map[key]) map[key] = [];
            map[key].push(a);
        });
        Object.keys(map).forEach(key => {
            const versions = [...new Set(map[key].map(a => a.version))];
            if (versions.length > 1) {
                conflicts.push({ artifact: key, versions, entries: map[key] });
            }
        });
        return conflicts;
    }

    function renderHtml(conflicts) {
        if (conflicts.length === 0) {
            return '<div class="explain-ok">✓ 未发现同 artifact 多版本冲突</div>';
        }
        let html = '<div class="explain-issues"><strong>发现 ' + conflicts.length + ' 处版本冲突</strong></div>';
        conflicts.forEach(c => {
            html += '<div class="maven-conflict"><strong>' + esc(c.artifact) + '</strong><br>版本: ' +
                c.versions.map(v => '<span class="maven-ver">' + esc(v) + '</span>').join(' vs ') +
                '<pre class="maven-lines">' + esc(c.entries.map(e => e.line).join('\n')) + '</pre></div>';
        });
        return html;
    }

    function esc(s) {
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
    }

    return { parse, findConflicts, renderHtml };
})();

function initMavenPro() {
    const input = document.getElementById('maven-input');
    if (!input) return;
    document.getElementById('maven-run').addEventListener('click', () => {
        if (!input.value.trim()) {
            if (typeof DevKitCore !== 'undefined') {
                DevKitCore.showPanelError('maven', '请输入 dependency:tree 输出', null, '在项目目录执行 mvn dependency:tree');
            } else toast('请输入 dependency:tree 输出');
            return;
        }
        const arts = MavenPro.parse(input.value);
        if (arts.length === 0) {
            if (typeof DevKitCore !== 'undefined') {
                DevKitCore.showPanelError('maven', '未识别到依赖行', null, '粘贴 mvn dependency:tree 完整输出');
            }
            document.getElementById('maven-result').innerHTML = '';
            return;
        }
        if (typeof DevKitCore !== 'undefined') DevKitCore.hidePanelError('maven');
        const conflicts = MavenPro.findConflicts(arts);
        document.getElementById('maven-result').innerHTML = MavenPro.renderHtml(conflicts);
        toast('解析 ' + arts.length + ' 个依赖，冲突 ' + conflicts.length + ' 处');
        document.dispatchEvent(new Event('empty-sync'));
    });
}
