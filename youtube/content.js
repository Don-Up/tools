(() => {
  const DEFAULTS = { enabled: true, leadSeconds: 0 };

  const state = {
    enabled: DEFAULTS.enabled,
    leadSeconds: DEFAULTS.leadSeconds,
  };

  let currentVideo = null;
  let hasFiredForCurrent = false;
  let rafId = null;

  function clampLead(v) {
    if (!isFinite(v)) return 0;
    return Math.max(0, Math.min(5, v));
  }

  function loadState() {
    try {
      chrome.storage.sync.get(DEFAULTS, (data) => {
        state.enabled = !!data.enabled;
        state.leadSeconds = clampLead(data.leadSeconds);
      });
    } catch (_) {
      state.enabled = DEFAULTS.enabled;
      state.leadSeconds = DEFAULTS.leadSeconds;
    }
  }

  function setupStorageListener() {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'sync') return;
      if (changes.enabled) state.enabled = !!changes.enabled.newValue;
      if (changes.leadSeconds) state.leadSeconds = clampLead(changes.leadSeconds.newValue);
    });
  }

  function findVideo() {
    return document.querySelector('video');
  }

  function startLoop() {
    if (rafId !== null) return;
    const tick = () => {
      if (!state.enabled || !currentVideo) {
        rafId = requestAnimationFrame(tick);
        return;
      }
      const v = currentVideo;
      if (v.paused || v.ended) {
        rafId = requestAnimationFrame(tick);
        return;
      }
      const d = v.duration;
      if (!isFinite(d) || d <= 0) {
        rafId = requestAnimationFrame(tick);
        return;
      }
      const t = v.currentTime;
      if (!hasFiredForCurrent && t >= d - state.leadSeconds) {
        triggerNext();
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
  }

  function stopLoop() {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  function onVideoAdded(video) {
    if (currentVideo === video) return;
    currentVideo = video;
    hasFiredForCurrent = false;
    startLoop();
  }

  function setupVideoObserver() {
    const onMutate = () => {
      const v = findVideo();
      if (v && v !== currentVideo) onVideoAdded(v);
    };
    const observer = new MutationObserver(onMutate);
    observer.observe(document.body, { childList: true, subtree: true });
    // 初次扫描（页面已挂载 video 的情况）
    onMutate();
  }

  function triggerNext() {
    hasFiredForCurrent = true;
    window.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'ArrowDown',
      code: 'ArrowDown',
      bubbles: true,
      cancelable: true,
      view: window,
    }));
  }

  function setupMessageListener() {
    chrome.runtime.onMessage.addListener((msg) => {
      if (msg && msg.type === 'SKIP_NOW') {
        triggerNext();
      }
    });
  }

  // 启动
  loadState();
  setupStorageListener();
  setupMessageListener();
  setupVideoObserver();
})();
