(() => {
    'use strict';

    const PANEL_ID = 'yt-subtitle-panel';
    const STYLE_ID = 'yt-subtitle-panel-styles';
    const PANEL_WIDTH = 360;

    let video = null;

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

    function togglePanel() {
        const panel = document.getElementById(PANEL_ID);
        const willOpen = panel.classList.contains('hidden');
        panel.classList.toggle('hidden', !willOpen);
        document.body.classList.toggle('ysp-open', willOpen);
        chrome.storage.sync.set({ panelOpen: willOpen });
    }

    function restorePanelState() {
        chrome.storage.sync.get(['panelOpen'], (data) => {
            if (data.panelOpen) {
                const panel = document.getElementById(PANEL_ID);
                panel.classList.remove('hidden');
                document.body.classList.add('ysp-open');
            }
        });
    }

    document.addEventListener('keydown', (e) => {
        const tag = (e.target && e.target.tagName) || '';
        const editable = tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable;
        if (editable) return;
        if (e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey && e.code === 'KeyS') {
            e.preventDefault();
            togglePanel();
        }
    });

    function findVideo() {
        return document.querySelector('.html5-main-video')
            || document.querySelector('#movie_player video')
            || document.querySelector('video');
    }

    function readTracklist() {
        const resp = window.ytInitialPlayerResponse;
        if (!resp) return null;
        const tl = resp?.captions?.playerCaptionsTracklistRenderer;
        if (!tl) return { tracks: [], translations: [] };
        const tracks = (tl.captionTracks || []).map((t) => ({
            vssId: t.vssId,
            languageCode: t.languageCode,
            name: t.name?.simpleText || t.languageCode,
            baseUrl: t.baseUrl,
        }));
        const translations = (tl.translationLanguages || []).map((t) => ({
            languageCode: t.languageCode,
            name: t.languageName?.simpleText || t.languageCode,
        }));
        return { tracks, translations };
    }

    function bootstrap() {
        video = findVideo();
        if (!video) {
            console.warn('[ysp] video element not found');
            return;
        }
        const tracklist = readTracklist();
        if (!tracklist) {
            console.warn('[ysp] ytInitialPlayerResponse not available');
            return;
        }
        console.log('[ysp] tracklist:', tracklist);
    }

    injectStyles();
    injectPanel();
    bootstrap();
    restorePanelState();
    console.log('[ysp] panel DOM injected; Alt+S wired');
})();