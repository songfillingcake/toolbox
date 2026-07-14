document.addEventListener('DOMContentLoaded', () => {

    console.log('DevKit 开发工具箱 v' + ((typeof DevKitCore !== 'undefined' && DevKitCore.VERSION) || ProCommon.VERSION || 'dev') + ' 已加载');



    const focusExit = document.getElementById('focus-exit');

    if (focusExit) {

        focusExit.addEventListener('click', () => {

            document.body.classList.remove('focus-mode');

            document.querySelectorAll('.focus-panel').forEach(p => p.classList.remove('focus-panel'));

            focusExit.classList.add('hidden');

        });

    }



    document.addEventListener('keydown', (e) => {

        if (e.key === 'Escape' && document.body.classList.contains('focus-mode')) {

            document.body.classList.remove('focus-mode');

            document.querySelectorAll('.focus-panel').forEach(p => p.classList.remove('focus-panel'));

            if (focusExit) focusExit.classList.add('hidden');

        }

    });



    const hash = ProCommon.parseHash();

    if (hash.tab) ProCommon.activateTab(hash.tab);
    else if (hash.data || hash.url) ProCommon.activateTab('json');

});

