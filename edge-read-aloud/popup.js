// 设置面板:选语音、调速度/音调/音量,改完存 chrome.storage.local。
// content.js 那边监听了 storage.onChanged,所以这里一改,页面上立刻就用新的了。
(function () {
    'use strict';

    const DEFAULTS = { voiceName: '', rate: 1, pitch: 1, volume: 1 };
    const TEST_TEXT = 'Hello, this is a test of the read aloud extension.';

    const voiceSelect = document.getElementById('voiceSelect');
    const rateInput = document.getElementById('rateInput');
    const pitchInput = document.getElementById('pitchInput');
    const volumeInput = document.getElementById('volumeInput');
    const rateValue = document.getElementById('rateValue');
    const pitchValue = document.getElementById('pitchValue');
    const volumeValue = document.getElementById('volumeValue');
    const testBtn = document.getElementById('testBtn');
    const readBtn = document.getElementById('readBtn');
    const stopBtn = document.getElementById('stopBtn');
    const status = document.getElementById('status');

    let voices = [];

    function setStatus(text) {
        status.textContent = text || '';
    }

    function fmt(n) {
        return (Math.round(Number(n) * 10) / 10).toFixed(1);
    }

    function refreshValues() {
        rateValue.textContent = fmt(rateInput.value);
        pitchValue.textContent = fmt(pitchInput.value);
        volumeValue.textContent = fmt(volumeInput.value);
    }

    // 语音列表不是立刻就有的:先要一次,没有就等 voiceschanged,还不有就轮询几次
    function loadVoices(done) {
        const pick = () => {
            const list = (typeof speechSynthesis !== 'undefined' && speechSynthesis.getVoices()) || [];
            if (list && list.length) {
                voices = list.slice().sort((a, b) => {
                    const la = a.lang || '', lb = b.lang || '';
                    if (la !== lb) return la < lb ? -1 : 1;
                    return (a.name || '') < (b.name || '') ? -1 : 1;
                });
                fillVoiceSelect();
            }
            done(voices.length > 0);
        };

        if (typeof speechSynthesis === 'undefined') {
            done(false);
            return;
        }
        if (speechSynthesis.getVoices().length) {
            pick();
            return;
        }
        speechSynthesis.addEventListener('voiceschanged', pick, { once: true });
        let tries = 0;
        const timer = setInterval(() => {
            tries++;
            if (speechSynthesis.getVoices().length) {
                clearInterval(timer);
                pick();
            } else if (tries > 20) {   // 3 秒还没出来,基本是系统没装语音
                clearInterval(timer);
                pick();
            }
        }, 150);
    }

    function fillVoiceSelect() {
        const current = voiceSelect.value;
        voiceSelect.innerHTML = '';
        voices.forEach(v => {
            const opt = document.createElement('option');
            opt.value = v.name;
            opt.textContent = v.lang ? `${v.name} (${v.lang})` : v.name;
            voiceSelect.appendChild(opt);
        });
        if (current) voiceSelect.value = current;
    }

    function currentVoice() {
        const name = voiceSelect.value;
        for (const v of voices) {
            if (v.name === name) return v;
        }
        return null;
    }

    // 面板里的"试听":直接在弹窗里念,不走页面
    function speakHere(text) {
        if (typeof speechSynthesis === 'undefined') {
            setStatus('这个浏览器不支持语音合成');
            return;
        }
        try { speechSynthesis.cancel(); } catch (e) {}
        const u = new SpeechSynthesisUtterance(text);
        const v = currentVoice();
        if (v) {
            u.voice = v;
            u.lang = v.lang;
        }
        u.rate = Number(rateInput.value);
        u.pitch = Number(pitchInput.value);
        u.volume = Number(volumeInput.value);
        speechSynthesis.speak(u);
    }

    function sendToActiveTab(msg) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const tab = tabs && tabs[0];
            if (!tab || tab.id === undefined) {
                setStatus('找不到当前标签页');
                return;
            }
            chrome.tabs.sendMessage(tab.id, msg, () => {
                // 没有 content script 的页面(扩展页、设置页等)会报错,吞掉
                void chrome.runtime.lastError;
            });
        });
    }

    // ---- 设置的读 / 写 ----

    function saveSettings(patch) {
        try {
            chrome.storage.local.set(patch, () => {
                void chrome.runtime.lastError;
            });
        } catch (e) { /* 存储失败不影响本次朗读 */ }
    }

    function bindRange(input, key) {
        input.addEventListener('input', () => {
            refreshValues();
            saveSettings({ [key]: Number(input.value) });
        });
    }

    bindRange(rateInput, 'rate');
    bindRange(pitchInput, 'pitch');
    bindRange(volumeInput, 'volume');

    voiceSelect.addEventListener('change', () => {
        saveSettings({ voiceName: voiceSelect.value });
        setStatus('');
    });

    testBtn.addEventListener('click', () => {
        speakHere(TEST_TEXT);
        setStatus('试听中');
    });

    readBtn.addEventListener('click', () => {
        sendToActiveTab({ type: 'speak-selection' });
        setStatus('已发送朗读指令');
    });

    stopBtn.addEventListener('click', () => {
        try { speechSynthesis.cancel(); } catch (e) {}
        sendToActiveTab({ type: 'stop' });
        setStatus('已停止');
    });

    // ---- 初始化 ----

    chrome.storage.local.get(DEFAULTS, (res) => {
        const s = { ...DEFAULTS, ...(res || {}) };
        rateInput.value = s.rate;
        pitchInput.value = s.pitch;
        volumeInput.value = s.volume;
        refreshValues();
        loadVoices((hasVoices) => {
            if (s.voiceName) voiceSelect.value = s.voiceName;
            if (!hasVoices) {
                setStatus('没读到系统语音。Windows:设置 → 时间和语言 → 语音 → 添加语音');
            }
        });
    });
})();
