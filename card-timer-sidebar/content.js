(function () {
    'use strict';

    const IFRAME_ID = 'cardTimerSidebar';
    const STYLE_ID = 'card-timer-sidebar-styles';
    const BODY_CLASS = 'card-timer-sidebar-open';
    const IFRAME_SRC = 'https://don-up.github.io/tools/card-timer';

    function injectStyles() {
        if (document.getElementById(STYLE_ID)) return;
        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
#${IFRAME_ID} {
    position: fixed;
    top: 0;
    right: 0;
    width: 33vw;
    height: 100vh;
    border: none;
    background: #121212;
    z-index: 2147483647;
    display: none;
}
#${IFRAME_ID}.shown { display: block; }
body.${BODY_CLASS} { padding-right: 33vw; }
`;
        document.documentElement.appendChild(style);
    }

    function injectIframe() {
        if (document.getElementById(IFRAME_ID)) return document.getElementById(IFRAME_ID);
        const root = document.body || document.documentElement;
        const iframe = document.createElement('iframe');
        iframe.id = IFRAME_ID;
        iframe.src = IFRAME_SRC;
        iframe.setAttribute('allow', '');
        root.appendChild(iframe);
        return iframe;
    }

    function wireKeydown(iframe) {
        document.addEventListener('keydown', (e) => {
            const tag = (e.target && e.target.tagName) || '';
            const inEditableField = tag === 'INPUT' || tag === 'TEXTAREA';

            if (!e.ctrlKey && e.shiftKey && !e.altKey && !e.metaKey && e.code === 'KeyO') {
                e.preventDefault();
                const shown = iframe.classList.toggle('shown');
                document.body.classList.toggle(BODY_CLASS, shown);
                return;
            }

            if (e.ctrlKey || e.altKey || e.metaKey || inEditableField) return;

            const sel = window.getSelection && window.getSelection().toString().trim();
            if (!sel) return;

            let type = null;
            if (e.key === 'q' || e.key === 'Q') type = 'cn-en-q';
            else if (e.key === 'w' || e.key === 'W') type = 'cn-en-append';
            else if (e.key === 'e' || e.key === 'E') type = 'cn-en-br';
            if (!type) return;

            e.preventDefault();
            iframe.contentWindow && iframe.contentWindow.postMessage(
                { type: type, content: sel }, '*');
        });
    }

    function init() {
        injectStyles();
        const iframe = injectIframe();
        wireKeydown(iframe);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();
