/**
 * DevKit 单色 SVG 图标（stroke 风格）
 */
const DevKitIcons = (() => {

    function svg(content, size) {
        size = size || 16;
        return '<svg class="dk-icon" width="' + size + '" height="' + size + '" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + content + '</svg>';
    }

    const PATHS = {
        mybatis: '<ellipse cx="8" cy="5" rx="6" ry="2"/><path d="M2 5v5c0 1.1 2.7 2 6 2s6-.9 6-2V5"/><path d="M2 7.5c0 1.1 2.7 2 6 2s6-.9 6-2"/>',
        sql: '<polyline points="5 3 2 8 5 13"/><line x1="8" y1="13" x2="14" y2="13"/>',
        cron: '<circle cx="8" cy="8" r="6"/><polyline points="8 4.5 8 8 10.5 9.5"/>',
        timestamp: '<rect x="2" y="3" width="12" height="11" rx="1.5"/><line x1="2" y1="6.5" x2="14" y2="6.5"/><line x1="5.5" y1="1.5" x2="5.5" y2="4"/><line x1="10.5" y1="1.5" x2="10.5" y2="4"/>',
        uuid: '<rect x="3" y="7" width="10" height="7" rx="1"/><path d="M5.5 7V5.5a2.5 2.5 0 0 1 5 0V7"/><circle cx="8" cy="10.5" r="1"/>',
        json: '<path d="M5 3.5C3.5 3.5 2.5 4.5 2.5 6v1c0 1 0 1.5-1 2s-1 1-1 2 1 2.5 2.5 2.5"/><path d="M11 3.5c1.5 0 2.5 1 2.5 2.5v1c0 1 0 1.5 1 2s1 1 1 2-1 2.5-2.5 2.5"/>',
        encode: '<rect x="3.5" y="7" width="9" height="7" rx="1"/><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2"/>',
        redis: '<polygon points="9 2 3 5.5 3 10.5 9 14 15 10.5 15 5.5"/><line x1="3" y1="5.5" x2="9" y2="9"/><line x1="9" y1="9" x2="15" y2="5.5"/><line x1="9" y1="9" x2="9" y2="14"/>',
        config: '<circle cx="8" cy="8" r="2"/><path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M3.4 12.6l1.4-1.4M11.2 4.8l1.4-1.4"/>',
        regex: '<circle cx="7" cy="7" r="4.5"/><line x1="10.5" y1="10.5" x2="14" y2="14"/><path d="M5.5 7h.01M8 7h.01"/>',
        hash: '<line x1="4" y1="8" x2="12" y2="8"/><line x1="4" y1="5" x2="12" y2="5"/><line x1="6" y1="3" x2="6" y2="13"/><line x1="10" y1="3" x2="10" y2="13"/>',
        jwt: '<path d="M3 3.5h10v9H3z"/><circle cx="8" cy="8" r="2.2"/><line x1="8" y1="10.2" x2="8" y2="11.5"/>',
        explain: '<circle cx="7" cy="7" r="4.5"/><line x1="10.5" y1="10.5" x2="14" y2="14"/>',
        log: '<path d="M3 2.5h10v11H3z"/><line x1="5.5" y1="6" x2="10.5" y2="6"/><line x1="5.5" y1="8.5" x2="10.5" y2="8.5"/><line x1="5.5" y1="11" x2="8.5" y2="11"/>',
        jstack: '<polygon points="2 12 8 3 14 12"/><line x1="4.5" y1="9" x2="11.5" y2="9"/>',
        maven: '<path d="M2 4.5l6-2.5 6 2.5v7l-6 2.5-6-2.5z"/><path d="M8 2v11.5"/>',
        mock: '<rect x="2" y="4" width="12" height="9" rx="1"/><path d="M5 8h6M5 10.5h3.5"/>',
        search: '<circle cx="7" cy="7" r="4.5"/><line x1="10.5" y1="10.5" x2="14" y2="14"/>',
        theme: '<circle cx="8" cy="8" r="3"/><line x1="8" y1="1.5" x2="8" y2="3"/><line x1="8" y1="13" x2="8" y2="14.5"/><line x1="1.5" y1="8" x2="3" y2="8"/><line x1="13" y1="8" x2="14.5" y2="8"/>',
        workspace: '<path d="M2 4.5h5l1.5 2H14v7.5H2z"/>',
        sensitive: '<path d="M8 1.5l5 2.5v4c0 3.5-2.5 5.5-5 6.5-2.5-1-5-3-5-6.5V4z"/>',
        example: '<path d="M3 2.5h10v11H3z"/><polyline points="5.5 8.5 7.5 10.5 10.5 6.5"/>',
        command: '<circle cx="6" cy="6" r="4.5"/><line x1="9.5" y1="9.5" x2="13" y2="13"/><line x1="6" y1="4" x2="6" y2="6"/><line x1="6" y1="6" x2="7.5" y2="6"/>',
        moon: '<path d="M13.5 9.5a5.5 5.5 0 1 1-7-7 6.5 6.5 0 0 0 7 7z"/>',
        sun: '<circle cx="8" cy="8" r="3"/><line x1="8" y1="1.5" x2="8" y2="3"/><line x1="8" y1="13" x2="8" y2="14.5"/><line x1="1.5" y1="8" x2="3" y2="8"/><line x1="13" y1="8" x2="14.5" y2="8"/>',
        collapse: '<polyline points="4 6 8 10 12 6"/><polyline points="4 10 8 14 12 10"/>',
        copy: '<rect x="5" y="5" width="8" height="9" rx="1"/><path d="M3 3.5h7v7"/>',
        download: '<path d="M8 2.5v7"/><polyline points="5.5 7.5 8 10 10.5 7.5"/><path d="M3 12.5h10"/>',
        trash: '<path d="M3 4.5h10"/><path d="M5.5 4.5V3.5h5v1"/><path d="M5 4.5l.5 8h5l.5-8"/>',
        play: '<polygon points="6 4 12 8 6 12"/>',
        history: '<circle cx="8" cy="8" r="5.5"/><polyline points="8 5 8 8 10.5 9.5"/>',
        save: '<path d="M3 2.5h7l3 3v8.5H3z"/><rect x="5.5" y="2.5" width="5" height="4" rx=".5"/><rect x="5.5" y="9" width="5" height="3.5" rx=".5"/>',
        link: '<path d="M6.5 9.5a3 3 0 0 0 4 0l2-2a3 3 0 0 0-4-4l-1 1"/><path d="M9.5 6.5a3 3 0 0 0-4 0l-2 2a3 3 0 0 0 4 4l1-1"/>',
        menu: '<line x1="3" y1="4.5" x2="13" y2="4.5"/><line x1="3" y1="8" x2="13" y2="8"/><line x1="3" y1="11.5" x2="13" y2="11.5"/>',
        format: '<line x1="3" y1="4" x2="13" y2="4"/><line x1="3" y1="8" x2="10" y2="8"/><line x1="3" y1="12" x2="13" y2="12"/>',
        empty: '<path d="M3 2.5h10v11H3z" stroke-dasharray="2 2"/><line x1="6" y1="6.5" x2="10" y2="6.5"/><line x1="6" y1="9" x2="10" y2="9"/>',
        dotenv: '<path d="M3 2.5h10v11H3z"/><line x1="5" y1="6" x2="7" y2="6"/><line x1="8.5" y1="6" x2="11" y2="6"/><line x1="5" y1="9.5" x2="11" y2="9.5"/>',
        textdiff: '<line x1="2.5" y1="4" x2="7.5" y2="4"/><line x1="2.5" y1="8" x2="6.5" y2="8"/><line x1="2.5" y1="12" x2="7.5" y2="12"/><line x1="9.5" y1="4" x2="13.5" y2="12"/><line x1="9.5" y1="12" x2="13.5" y2="4"/>',
        linechart: '<polyline points="2 12 5.5 6 8.5 9 11 4 14 7"/><line x1="2" y1="14" x2="14" y2="14"/>',
        faker: '<circle cx="5.5" cy="5" r="2"/><circle cx="10.5" cy="7" r="2"/><circle cx="7" cy="11.5" r="2"/><line x1="7" y1="6.5" x2="9" y2="8"/><line x1="7.5" y1="9.5" x2="8.5" y2="7.5"/>',
        image: '<rect x="2.5" y="3.5" width="11" height="9" rx="1"/><circle cx="5.5" cy="6.5" r="1"/><path d="M2.5 11l2.5-2 2 1.5 2.5-2 3.5 3"/>',
        star: '<polygon points="8 2 9.8 6.2 14.5 6.6 11 9.5 12.1 14 8 11.6 3.9 14 5 9.5 1.5 6.6 6.2 6.2"/>',
        'star-filled': '<polygon points="8 2 9.8 6.2 14.5 6.6 11 9.5 12.1 14 8 11.6 3.9 14 5 9.5 1.5 6.6 6.2 6.2" fill="currentColor" stroke="none"/>'
    };

    function render(name, size) {
        const key = PATHS[name] ? name : 'mock';
        const inner = PATHS[key];
        if (key === 'star-filled') {
            return '<svg class="dk-icon dk-icon-filled" width="' + (size || 16) + '" height="' + (size || 16) + '" viewBox="0 0 16 16" aria-hidden="true">' + inner + '</svg>';
        }
        return svg(inner, size);
    }

    function prependIcon(btn, name, size) {
        if (!btn || btn.querySelector('.btn-icon')) return;
        const span = document.createElement('span');
        span.className = 'btn-icon';
        span.innerHTML = render(name, size || 14);
        btn.insertBefore(span, btn.firstChild);
        btn.classList.add('btn-with-icon');
    }

    const TOOLBAR_ICON_MAP = {
        'mybatis-convert': 'play', 'sql-format': 'format', 'sql-minify': 'format',
        'cron-parse': 'play', 'cron-gen-build': 'play', 'json-format': 'format',
        'json-minify': 'format', 'json-validate': 'play', 'json-path-run': 'play',
        'json-diff-run': 'play', 'json-to-yaml': 'play', 'yaml-to-json': 'play',
        'java-gen-run': 'play', 'json-sql-run': 'play', 'tsgo-gen-run': 'play',
        'b64-encode': 'play', 'b64-decode': 'play', 'url-encode': 'play', 'url-decode': 'play',
        'jwt-parse': 'play', 'redis-format': 'format', 'config-convert': 'play',
        'regex-run': 'play', 'hash-run': 'play', 'explain-run': 'play', 'explain-ocr-pick': 'image',
        'explain-ocr-copy': 'copy', 'explain-ocr-copy-image': 'copy', 'explain-copy-result': 'copy',
        'log-highlight': 'format', 'log-extract-json': 'play', 'jstack-run': 'play',
        'maven-run': 'play', 'mock-gen-run': 'play', 'uuid-gen': 'play',
        'dotenv-convert': 'play', 'textdiff-run': 'play', 'linechart-render': 'play', 'faker-gen': 'play',
        'jwt-panel-parse': 'play', 'jwt-panel-to-json': 'link', 'encode-to-jwt': 'link',
        'dotenv-to-config': 'link', 'faker-to-json': 'link', 'faker-to-mock': 'link',
        'mybatis-to-explain': 'link', 'linechart-to-json': 'link'
    };

    function mountToolbarIcons() {
        Object.keys(TOOLBAR_ICON_MAP).forEach(id => {
            const btn = document.getElementById(id);
            if (btn) prependIcon(btn, TOOLBAR_ICON_MAP[id]);
        });
        document.querySelectorAll('[id$="-copy"]').forEach(btn => prependIcon(btn, 'copy'));
        document.querySelectorAll('[id$="-export"]').forEach(btn => prependIcon(btn, 'download'));
        document.querySelectorAll('[id$="-clear"]').forEach(btn => prependIcon(btn, 'trash'));
        document.querySelectorAll('.history-save').forEach(btn => prependIcon(btn, 'history'));
        document.querySelectorAll('.workspace-save').forEach(btn => prependIcon(btn, 'save'));
        document.querySelectorAll('.btn-load-example').forEach(btn => prependIcon(btn, 'example'));
    }

    function mountSidebarIcons() {
        const theme = document.getElementById('theme-toggle');
        if (theme) {
            theme.className = 'btn ghost btn-sm icon-btn tooltip-host';
            theme.setAttribute('data-tooltip', '切换主题');
            theme.setAttribute('aria-label', '切换主题');
            updateThemeIcon();
        }
        const ws = document.getElementById('workspace-toggle');
        if (ws) {
            ws.className = 'btn ghost btn-sm icon-btn tooltip-host';
            ws.setAttribute('data-tooltip', '工作区');
            ws.innerHTML = render('workspace', 16);
            ws.setAttribute('aria-label', '工作区');
        }
        const collapse = document.getElementById('nav-collapse-all');
        if (collapse) {
            collapse.className = 'btn ghost btn-sm icon-btn tooltip-host';
            collapse.setAttribute('data-tooltip', '折叠分组');
            collapse.innerHTML = render('collapse', 16);
            collapse.setAttribute('aria-label', '折叠分组');
        }
    }

    function updateThemeIcon() {
        const theme = document.getElementById('theme-toggle');
        if (!theme) return;
        const isLight = document.documentElement.getAttribute('data-theme') === 'light';
        theme.innerHTML = render(isLight ? 'moon' : 'sun', 16);
        theme.setAttribute('data-tooltip', isLight ? '切换暗色' : '切换亮色');
    }

    function mountChromeIcons() {
        const sens = document.getElementById('sensitive-toggle');
        if (sens) {
            sens.innerHTML = render('sensitive', 15);
            sens.setAttribute('data-tooltip', '敏感模式');
            sens.classList.add('tooltip-host');
        }
        const cmd = document.getElementById('cmd-palette-open');
        if (cmd) {
            cmd.innerHTML = render('command', 15);
            cmd.setAttribute('data-tooltip', '命令面板 Ctrl+K');
            cmd.classList.add('tooltip-host');
        }
    }

    function mountNavIcons() {
        document.querySelectorAll('.nav-item[data-tab]').forEach(item => {
            const el = item.querySelector('.nav-icon');
            if (el) el.innerHTML = render(item.dataset.tab);
        });
        const searchIcon = document.querySelector('.nav-search-icon');
        if (searchIcon) searchIcon.innerHTML = render('search', 14);
        mountChromeIcons();
        mountSidebarIcons();
        mountToolbarIcons();
    }

    return { render, mountNavIcons, mountChromeIcons, mountSidebarIcons, mountToolbarIcons, updateThemeIcon, prependIcon, PATHS };
})();
