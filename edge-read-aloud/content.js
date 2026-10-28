// Alt+2 朗读选中文字。
// 用页面自己的 speechSynthesis(不用 chrome.tts):不用 background、不用 offscreen,
// 按键 → 取选区 → 直接念,和 cn2en-json.html 里用的是同一批系统语音。
(function () {
    'use strict';

    const DEFAULTS = { voiceName: '', rate: 1, pitch: 1, volume: 1 };
    let settings = { ...DEFAULTS };

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(DEFAULTS, (res) => {
            if (res) settings = { ...DEFAULTS, ...res };
        });
        // 面板改完设置立刻生效,不用刷新页面
        chrome.storage.onChanged.addListener((changes, area) => {
            if (area !== 'local') return;
            Object.keys(DEFAULTS).forEach(k => {
                if (Object.prototype.hasOwnProperty.call(changes, k)) {
                    settings[k] = changes[k].newValue;
                }
            });
        });
    }

    function isTextField(el) {
        if (!el) return false;
        const tag = el.tagName;
        return tag === 'INPUT' || tag === 'TEXTAREA';
    }

    // 输入框/文本域里有没有选中东西
    function hasTextSelection(el) {
        if (!isTextField(el)) return false;
        const start = el.selectionStart;
        const end = el.selectionEnd;
        return typeof start === 'number' && typeof end === 'number' && end > start;
    }

    // 输入框/文本域里取 selectionStart~End,普通页面取窗口选区
    function getSelectedText(target) {
        if (hasTextSelection(target)) {
            return target.value.slice(target.selectionStart, target.selectionEnd);
        }
        // 输入框里没选东西(比如焦点还留在输入框,但选的是页面上的字)时看页面选区
        const sel = window.getSelection && window.getSelection();
        return sel ? sel.toString() : '';
    }

    // 拿到文字之后把选区清掉:输入框把光标缩到选区末尾,页面正文去掉高亮
    function clearSelection(target) {
        if (hasTextSelection(target)) {
            const end = target.selectionEnd;
            try { target.setSelectionRange(end, end); } catch (e) {}
            return;
        }
        const sel = window.getSelection && window.getSelection();
        if (sel && typeof sel.removeAllRanges === 'function') {
            sel.removeAllRanges();
        }
    }

    function clamp(n, min, max) {
        const v = Number(n);
        if (!isFinite(v)) return min;
        return Math.min(max, Math.max(min, v));
    }

    function findVoice(name) {
        if (!name) return null;
        const voices = speechSynthesis.getVoices() || [];
        for (const v of voices) {
            if (v.name === name) return v;
        }
        return null;
    }

    function speak(text) {
        const t = String(text || '').trim();
        if (!t) return false;
        if (typeof speechSynthesis === 'undefined') return false;

        const u = new SpeechSynthesisUtterance(t);
        const voice = findVoice(settings.voiceName);
        if (voice) {
            u.voice = voice;
            u.lang = voice.lang;
        }
        u.rate = clamp(settings.rate, 0.1, 10);
        u.pitch = clamp(settings.pitch, 0, 2);
        u.volume = clamp(settings.volume, 0, 1);

        // 重新念之前清掉队列,免得连按几次排成一串
        try { speechSynthesis.cancel(); } catch (e) {}
        u.onend = () => {};
        u.onerror = () => {};
        speechSynthesis.speak(u);
        return true;
    }

    function stop() {
        try { speechSynthesis.cancel(); } catch (e) {}
    }

    // 读当前选中的文字,读完把选区清掉
    function speakSelection(target) {
        const text = getSelectedText(target);
        if (!text || !text.trim()) return false;
        const ok = speak(text);
        if (ok) clearSelection(target);
        return ok;
    }

    // Alt+2:念当前选中的文字
    document.addEventListener('keydown', (e) => {
        if (!e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
        // Alt 按住时 e.key 在有些布局上不是数字,主要看 e.code
        if (e.code !== 'Digit2' && e.code !== 'Numpad2' && e.key !== '2') return;

        const text = getSelectedText(e.target);
        // 没选到字就不管,也不拦页面自己的 Alt+2
        if (!text || !text.trim()) return;

        e.preventDefault();
        speakSelection(e.target);
    }, true);

    // 面板上的"朗读选中"和"停止"
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
        chrome.runtime.onMessage.addListener((msg) => {
            if (!msg) return;
            if (msg.type === 'speak-selection') {
                speakSelection(document.activeElement);
            } else if (msg.type === 'stop') {
                stop();
            }
        });
    }

    // 给 tests/ 用:浏览器里 module 是 undefined,这段不执行
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { getSelectedText, clearSelection, clamp, speak, stop, speakSelection };
    }
})();
