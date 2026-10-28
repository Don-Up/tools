(function () {
    const IFRAME_ID = 'focus-json-popup-iframe';
    const FOCUS_URL = 'https://don-up.github.io/tools/focus-json';
    const MESSAGE_TYPE = 'focus-json-close';
    const ENQUEUE_TYPE = 'focus-json-enqueue';
    const ENQUEUE_SELF_TYPE = 'focus-json-enqueue-self';
    const ENQUEUE_NOW_TYPE = 'focus-json-enqueue-now';

    function isEditable(el) {
        if (!el) return false;
        const tag = el.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
        if (el.isContentEditable) return true;
        return false;
    }

    function getSelectedText() {
        const sel = window.getSelection && window.getSelection();
        if (!sel) return '';
        return sel.toString();
    }

    function copyText(text) {
        if (!text) return Promise.resolve();
        if (navigator.clipboard && navigator.clipboard.writeText) {
            return navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
        }
        return fallbackCopy(text);
    }

    function fallbackCopy(text) {
        try {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.setAttribute('readonly', '');
            ta.style.position = 'fixed';
            ta.style.top = '-9999px';
            document.body.appendChild(ta);
            ta.select();
            const ok = document.execCommand && document.execCommand('copy');
            document.body.removeChild(ta);
            return ok ? Promise.resolve() : Promise.reject(new Error('copy failed'));
        } catch (e) {
            return Promise.reject(e);
        }
    }

    // 选区是推文卡片之类时,上面挂着 "Translated from Chinese" 这行来源标注,
    // 它前面还有账号名、@handle、时间戳,统统不要 —— 只留标注下面的正文。
    const TRANSLATED_FROM_LINE_RE = /Translated\s+from[^\n]*\n?/i;
    const TRANSLATED_FROM_PHRASE_RE = /Translated\s+from\s+[A-Za-z]+/i;
    function dropTranslatedFromHeader(text) {
        // 先按"整行"切:标注独占一行时最准,不会误吃下面的正文
        let m = TRANSLATED_FROM_LINE_RE.exec(text);
        if (m) {
            const rest = text.slice(m.index + m[0].length);
            if (rest.trim()) return rest;
        }
        // 页面上没换行(几个 span 拼一行)时退回只切 "Translated from + 语言名"
        m = TRANSLATED_FROM_PHRASE_RE.exec(text);
        if (m) {
            const rest = text.slice(m.index + m[0].length);
            if (rest.trim()) return rest;
        }
        return text;
    }

    function cleanSelection(text) {
        return dropTranslatedFromHeader(text)
            .replace(/["“”]/g, '')
            .replace(/查看中文翻译/g, '')
            .replace(/…|\.{2,}/g, '. ')
            .trim();
    }

    // 把文本塞进已经开着的子窗口队列。translate=false 时子窗口不调翻译,直接读原文。
    // 跨源 window 只能碰白名单上的属性(postMessage / location 之类),
    // 直接 frame.contentWindow.xxx = text 会被浏览器丢掉,所以走 postMessage。
    function enqueueText(text, translate) {
        const frame = document.getElementById(IFRAME_ID);
        if (!frame || !frame.contentWindow) return;
        const clean = String(text || '').trim();
        if (!clean) return;
        frame.contentWindow.postMessage({
            type: ENQUEUE_TYPE,
            text: clean,
            translate: translate !== false
        }, '*');
    }

    // Alt+X 和右键菜单"加入朗读队列"走同一条路:
    // 面板开着 → 入队,等当前这段读完自动接上;没开 → 开一个右侧子窗口。
    function enqueueOrOpen(cleanText, translate) {
        if (document.getElementById(IFRAME_ID)) {
            enqueueText(cleanText, translate);
        } else {
            openPopup(cleanText, { autotranslate: translate !== false, docked: true, autoclose: false });
        }
    }

    // 右键菜单来的请求。background 把 contextMenus 给的 selectionText 带过来,
    // 比再取一次页面选区稳(菜单弹出的瞬间页面选区可能已经被收起来)。
    function onRuntimeMessage(message) {
        if (!message || message.type !== ENQUEUE_NOW_TYPE) return;
        const text = cleanSelection(message.text || getSelectedText());
        if (!text) return;
        enqueueOrOpen(text, message.translate !== false);
    }

    function closePopup() {
        const existing = document.getElementById(IFRAME_ID);
        if (existing) existing.remove();
        document.removeEventListener('keydown', onParentKeyDown, true);
        window.removeEventListener('message', onParentMessage);
    }

    function onParentMessage(e) {
        const data = e && e.data;
        if (!data || typeof data !== 'object') return;
        if (data.type === MESSAGE_TYPE) {
            closePopup();
            return;
        }
        // 子窗口里焦点时父页面收不到按键,子窗口会反过来喊一声要选区
        if (data.type === ENQUEUE_SELF_TYPE) {
            const text = cleanSelection(getSelectedText());
            if (text) enqueueText(text, data.translate !== false);
        }
    }

    function onParentKeyDown(e) {
        if (e.key === 'Escape') {
            closePopup();
        }
    }

    function openPopup(text, options) {
        closePopup();
        const opts = options || {};
        const params = new URLSearchParams();
        const autoclose = opts.autoclose !== false;
        if (autoclose) params.set('autoclose', '1');
        if (opts.autotranslate) params.set('autotranslate', '1');
        const url = `${FOCUS_URL}?${params.toString()}#${encodeURIComponent(text)}`;
        const iframe = document.createElement('iframe');
        iframe.id = IFRAME_ID;
        iframe.src = url;
        iframe.allow = 'autoplay';
        // docked:只占右侧一条,左边原页面照常看得见点得到(子窗口)
        // 全屏时靠 left:0 + width:100vw;贴右边时用 right:0,免得两段 vw 遇上竖向滚动条溢出
        const docked = opts.docked === true;
        // 窄窗口里字号要收一收,靠 compact=1 告诉子窗口;没带这个参数时它自己按宽度判断
        if (docked) params.set('compact', '1');
        iframe.style.cssText = [
            'position:fixed',
            docked ? 'right:0' : 'left:0',
            'top:0',
            docked ? 'width:36vw' : 'width:100vw',
            'height:100vh',
            'border:0',
            docked ? 'border-left:1px solid #444' : '',
            'margin:0',
            'padding:0',
            'z-index:2147483647',
            'background:transparent',
            'color-scheme:normal'
        ].join(';');
        document.body.appendChild(iframe);

        window.addEventListener('message', onParentMessage);
        document.addEventListener('keydown', onParentKeyDown, true);
    }

    // 右键菜单 → background → 这里。监听器在脚本加载时就挂上,
    // 不随浮层开关增减,免得菜单点的时候页面里还没挂上。
    // typeof 判断是为了让 tests/ 里的 require 不炸(那里没有 chrome)
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
        chrome.runtime.onMessage.addListener(onRuntimeMessage);
    }

    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && !e.altKey && !e.metaKey && !e.shiftKey && (e.key === 'b' || e.key === 'B' || e.code === 'KeyB')) {
            const target = e.target;
            if (isEditable(target)) return;

            const text = getSelectedText();
            if (!text || !text.trim()) {
                e.preventDefault();
                return;
            }
            const cleanText = cleanSelection(text);
            if (!cleanText.trim()) {
                e.preventDefault();
                return;
            }
            if (/[一-鿿]/.test(cleanText)) {
                e.preventDefault();
                return;
            }

            e.preventDefault();
            copyText(cleanText).catch(() => {});
            openPopup(cleanText, { autotranslate: true, autoclose: false });
            return;
        }
        // Alt+Q/W/Z/X 和 Shift+Z/X 两组。Shift 那组逻辑一样,只是不调翻译。
        const alt = e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey;
        const shift = e.shiftKey && !e.altKey && !e.ctrlKey && !e.metaKey;
        if (!alt && !shift) return;
        const key = (e.key || '').toLowerCase();
        // AltGr 之类的布局上 e.key 可能是别的字符,退回 e.code 兜底
        const k = /^[a-z]$/.test(key)
            ? key
            : (typeof e.code === 'string' && e.code.startsWith('Key') ? e.code.slice(3).toLowerCase() : '');
        if (k !== 'q' && k !== 'w' && k !== 'x' && k !== 'z') return;
        if (shift && k !== 'z' && k !== 'x') return;   // Shift 只绑了 Z / X

        const target = e.target;
        if (isEditable(target)) return;

        const text = getSelectedText();
        if (!text || !text.trim()) {
            e.preventDefault();
            return;
        }
        const cleanText = cleanSelection(text);
        if (!cleanText.trim()) {
            e.preventDefault();
            return;
        }

        e.preventDefault();
        copyText(cleanText).catch(() => {});

        const translate = alt;   // Shift 那一组不翻

        // X 朗读队列:面板已经开着 → 把选区丢进去后台处理排队,等当前这段读完自动接上;
        // 还没开 → 跟 Z 一样开一个右侧子窗口。
        if (k === 'x') {
            enqueueOrOpen(cleanText, translate);
            return;
        }

        // Alt+Q 原文全屏 / Alt+W 翻译全屏(读完自动关)/ Alt+Z、Shift+Z 右侧子窗口(留着不自动关)
        if (k === 'z') {
            openPopup(cleanText, { autotranslate: translate, docked: true, autoclose: false });
        } else {
            openPopup(cleanText, { autotranslate: k === 'w' });
        }
    }, true);

    // 给 tests/ 用:只导出纯函数。浏览器里 module 是 undefined,这段不执行。
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { cleanSelection, dropTranslatedFromHeader };
    }
})();
