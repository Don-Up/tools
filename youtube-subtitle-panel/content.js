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

.ysp-header {
    padding: 12px;
    border-bottom: 1px solid #333;
    display: flex; gap: 8px; align-items: center;
}
.ysp-title { font-size: 13px; color: #888; }
.ysp-lang {
    flex: 1;
    background: #252525; color: #cfd8dc;
    border: 1px solid #444; border-radius: 4px;
    padding: 4px 6px; font-size: 12px;
}
.ysp-lang:disabled { opacity: 0.5; cursor: not-allowed; }

.ysp-list {
    flex: 1; overflow-y: auto;
    padding: 12px 8px;
    scrollbar-width: thin;
    scrollbar-color: #3a3a3a transparent;
}
.ysp-list::-webkit-scrollbar { width: 8px; }
.ysp-list::-webkit-scrollbar-thumb {
    background: #3a3a3a; border-radius: 4px;
}
.ysp-row {
    padding: 8px 10px;
    border-radius: 4px;
    cursor: pointer;
    border-left: 4px solid transparent;
    transition: background 0.15s;
}
.ysp-row:hover { background: rgba(255,255,255,0.04); }
.ysp-line-top { color: #bbb; font-size: 13px; line-height: 1.5; }
.ysp-line-bot { color: #777; font-size: 13px; line-height: 1.5; }
.ysp-row.active {
    background: rgba(79,195,247,0.12);
    border-left-color: #4fc3f7;
}
.ysp-row.active .ysp-line-top { color: #fff; font-weight: 600; }
.ysp-row.active .ysp-line-bot { color: #cfd8dc; }

.ysp-empty {
    padding: 40px 20px;
    color: #888; font-size: 13px;
    text-align: center;
}
.ysp-empty.hidden { display: none; }
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
                <select class="ysp-lang ysp-lang-top" data-slot="top"></select>
                <select class="ysp-lang ysp-lang-bot" data-slot="bot"></select>
            </header>
            <div class="ysp-list"></div>
            <div class="ysp-empty hidden"></div>
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

    async function fetchCues(track, { signal } = {}) {
        if (!track || !track.baseUrl) return [];
        const u = new URL(track.baseUrl);
        u.searchParams.delete('fmt');
        u.searchParams.set('fmt', 'json3');
        const res = await fetch(u.toString(), { signal, credentials: 'omit' });
        if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
        const data = await res.json();
        const cues = (data.events || [])
            .filter((e) => Array.isArray(e.segs) && e.segs.length > 0)
            .map((e) => ({
                startMs: e.tStartMs,
                endMs: e.tStartMs + (e.dDurationMs || 0),
                text: e.segs.map((s) => s.utf8 || '').join('').trim(),
            }))
            .filter((c) => c.text.length > 0 && c.endMs > c.startMs);
        return cues;
    }

    function buildCueList(topCues, botCues) {
        const rows = [];
        for (const top of topCues) {
            let best = null;
            let bestOverlap = 0;
            for (const bot of botCues) {
                const overlap = Math.min(top.endMs, bot.endMs) - Math.max(top.startMs, bot.startMs);
                if (overlap > bestOverlap) {
                    bestOverlap = overlap;
                    best = bot;
                }
            }
            if (!best) {
                let bestDist = Infinity;
                for (const bot of botCues) {
                    const dist = Math.abs(bot.startMs - top.startMs);
                    if (dist < bestDist) { bestDist = dist; best = bot; }
                }
                if (bestDist > 2000) best = null;
            }
            rows.push({
                startMs: top.startMs,
                endMs: top.endMs,
                topText: top.text,
                botText: best ? best.text : '',
            });
        }
        rows.sort((a, b) => a.startMs - b.startMs);
        return rows;
    }

    function renderRows(rows) {
        const list = document.querySelector(`#${PANEL_ID} .ysp-list`);
        const frag = document.createDocumentFragment();
        for (const row of rows) {
            const div = document.createElement('div');
            div.className = 'ysp-row';
            div.dataset.startMs = String(row.startMs);
            div.innerHTML = `
                <div class="ysp-line ysp-line-top"></div>
                <div class="ysp-line ysp-line-bot"></div>
            `;
            div.querySelector('.ysp-line-top').textContent = row.topText;
            div.querySelector('.ysp-line-bot').textContent = row.botText;
            frag.appendChild(div);
        }
        list.replaceChildren(frag);
    }

    async function bootstrap() {
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
        if (tracklist.tracks.length === 0) {
            console.log('[ysp] no caption tracks on this video');
            return;
        }
        try {
            const top = tracklist.tracks[0];
            const bot = tracklist.tracks[1] || null;
            const [topCues, botCues] = await Promise.all([
                fetchCues(top),
                bot ? fetchCues(bot) : Promise.resolve([]),
            ]);
            const rows = buildCueList(topCues, botCues);
            renderRows(rows);
            console.log(`[ysp] rendered ${rows.length} rows`);
        } catch (err) {
            console.error('[ysp] bootstrap failed:', err);
        }
    }

    injectStyles();
    injectPanel();
    bootstrap();
    restorePanelState();
    console.log('[ysp] panel DOM injected; Alt+S wired');
})();