(() => {
    'use strict';

    const PANEL_ID = 'yt-subtitle-panel';
    const STYLE_ID = 'yt-subtitle-panel-styles';
    const PANEL_WIDTH = 360;

    const CSS = `
#yt-subtitle-panel {
    position: fixed;
    top: 0; right: 0;
    width: ${PANEL_WIDTH}px; height: 100vh;
    background: #1e1e1e;
    border-left: 1px solid #333;
    z-index: 2147483640;
    display: flex; flex-direction: column;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    color: #e0e0e0;
}
#yt-subtitle-panel.hidden { display: none; }
body.ysp-open { padding-right: ${PANEL_WIDTH}px; }
`;

    function injectStyles() {
        if (document.getElementById(STYLE_ID)) return;
        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = CSS;
        document.head.appendChild(style);
    }

    function injectPanel() {
        if (document.getElementById(PANEL_ID)) return;
        const aside = document.createElement('aside');
        aside.id = PANEL_ID;
        aside.classList.add('hidden');
        aside.innerHTML = `
            <header class="ysp-header">
                <span class="ysp-title">字幕</span>
            </header>
            <div class="ysp-list"></div>
        `;
        document.body.appendChild(aside);
    }

    injectStyles();
    injectPanel();
    console.log('[ysp] panel DOM injected (hidden)');
})();
