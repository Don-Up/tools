(function () {
  'use strict';

  const WORD_REGEX = /\b[a-zA-Z]+\b/g;
  const CAPTION_SELECTOR = '.ytp-caption-segment';

  const HIDE_WORDS = new Set([
    // 'about', 'another',
    // 'because', 'before', 'although', 'even', 'though', 'however', 'therefore', 'whether',
    // 'after', 'around', 'against', 'again', 'among', 'amongst', 'between', 'during',
    // 'inside', 'outside', 'through', 'throughout', 'without', 'within',
    // 'towards', 'toward', 'across', 'behind', 'beyond',
    // 'someone', 'somebody', 'something', 'everyone', 'everybody', 'everything',
    // 'anyone', 'anybody', 'anything', 'nobody', 'nothing',
    // 'yourself', 'himself', 'herself', 'ourselves', 'themselves', 'itself', 'myself',
    // 'cannot', 'should', 'would', 'could', 'might',
    // "mustn", "shouldn", "wouldn", "couldn",
    // 'enough', 'either', 'neither', 'several', 'another',
    // 'already', "don", "doesn", 'every', 'still', 'always', 'almost', 'which', 'there',
    // 'never', 'other', 'being', 'going', 'their', 'often', 'maybe', 'whose', 'under', 'beneath', 'above',
    // 'simply', 'exactly', 'barely', 'hardly', 'further', 'finally', 'really', 'actually'
  ]);

  const DEFAULT_MAX_LENGTH = 5;
  const ALLOWED_MAX_LENGTHS = [3, 4, 5, 6, 7, 8];

  function normalizeMaxLength(value) {
    const n = Number(value);
    if (ALLOWED_MAX_LENGTHS.indexOf(n) !== -1) return n;
    return DEFAULT_MAX_LENGTH;
  }

  function transformWord(word, maxLength) {
    if (typeof word !== 'string' || word.length === 0) return word;
    // if (state.applyHideWords && HIDE_WORDS.has(word.toLowerCase())) {
    //   return '____'.repeat(1);
    // }
    const cap = normalizeMaxLength(maxLength);
    // if(word.length <= 2 && !["t", "ll", "d", "re", "s"].includes(word)) {
    //   return "_"
    // }
    if (word.length < cap && word.length>1) { // word.length >= 1 &&
      return state.applyHideWords? word[0]+"_":'__' //.repeat(1);
    }
    return word;
  }

  function transformText(text, maxLength) {
    if (typeof text !== 'string') return text;
    const cap = normalizeMaxLength(maxLength);
    return text.replace(WORD_REGEX, (match) => transformWord(match, cap));
  }

  const state = {
    enabled: true,
    showOriginal: false,
    maxLength: DEFAULT_MAX_LENGTH,
    applyHideWords: true
  };

  function effectiveOutput(original) {
    if (state.showOriginal) return original;
    return transformText(original, state.maxLength);
  }

  function processSegment(segment) {
    if (!segment || !segment.isConnected) return;
    if (!state.enabled) return;
    const currentText = segment.textContent;
    if (typeof currentText !== 'string') return;
    const storedOriginal = segment.getAttribute('data-yt-sub-lu-original');
    const isTransformed = segment.getAttribute('data-yt-sub-lu-transformed') === 'true';

    if (isTransformed && storedOriginal !== null) {
      const expected = effectiveOutput(storedOriginal);
      if (currentText === expected) return;
    }

    const original = storedOriginal !== null ? storedOriginal : currentText;
    const output = effectiveOutput(original);
    if (currentText === output) {
      segment.setAttribute('data-yt-sub-lu-original', original);
      segment.setAttribute('data-yt-sub-lu-transformed', 'true');
      return;
    }
    segment.setAttribute('data-yt-sub-lu-original', original);
    segment.setAttribute('data-yt-sub-lu-transformed', 'true');
    segment.textContent = output;
  }

  function processAllSegments() {
    const nodes = document.querySelectorAll(CAPTION_SELECTOR);
    for (const n of nodes) processSegment(n);
  }

  function refreshAllSegments() {
    const nodes = document.querySelectorAll(CAPTION_SELECTOR);
    for (const n of nodes) {
      n.removeAttribute('data-yt-sub-lu-transformed');
      processSegment(n);
    }
  }

  let observer = null;

  function onDomMutations(mutations) {
    let needsProcess = false;
    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        for (const node of mutation.addedNodes) {
          if (node.nodeType !== Node.ELEMENT_NODE) continue;
          if (node.matches && node.matches(CAPTION_SELECTOR)) { needsProcess = true; break; }
          if (node.querySelectorAll && node.querySelectorAll(CAPTION_SELECTOR).length > 0) { needsProcess = true; break; }
        }
        if (needsProcess) break;
      } else if (mutation.type === 'characterData') {
        const parent = mutation.target.parentElement;
        if (parent && parent.classList && parent.classList.contains('ytp-caption-segment')) { needsProcess = true; break; }
        if (parent && parent.closest && parent.closest(CAPTION_SELECTOR)) { needsProcess = true; break; }
      } else if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
        const target = mutation.target;
        if (target.classList && target.classList.contains('ytp-caption-segment')) { needsProcess = true; break; }
      }
    }
    if (needsProcess) processAllSegments();
  }

  function initObserver() {
    if (observer) observer.disconnect();
    if (!document.body) return;
    observer = new MutationObserver(onDomMutations);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['class']
    });
  }

  function startPeriodicCheck() {
    setInterval(() => {
      ensureVideoListeners();
      syncShowOriginalWithVideo();
      if (document.querySelector(CAPTION_SELECTOR)) refreshAllSegments();
    }, 1500);
  }

  function showToast(message, duration) {
    const text = String(message);
    const ttl = typeof duration === 'number' ? duration : 1500;
    if (!document.body) {
      setTimeout(() => showToast(text, ttl), 100);
      return;
    }
    const toast = document.createElement('div');
    toast.textContent = text;
    toast.style.position = 'fixed';
    toast.style.top = '20px';
    toast.style.right = '20px';
    toast.style.backgroundColor = '#065fd4';
    toast.style.color = 'white';
    toast.style.padding = '8px 16px';
    toast.style.borderRadius = '24px';
    toast.style.fontSize = '14px';
    toast.style.fontFamily = 'system-ui, sans-serif';
    toast.style.zIndex = '10000';
    toast.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
    toast.style.pointerEvents = 'none';
    document.body.appendChild(toast);
    setTimeout(() => {
      if (toast && toast.parentNode) toast.parentNode.removeChild(toast);
    }, ttl);
  }

  function setVideoPlayback(shouldPause) {
    try {
      const video = document.querySelector('video');
      if (!video) return;
      if (shouldPause) {
        if (!video.paused) video.pause();
      } else {
        if (video.paused) {
          const result = video.play();
          if (result && typeof result.catch === 'function') result.catch(() => {});
        }
      }
    } catch (err) {
      // ignore playback errors (e.g. autoplay policy, missing video)
    }
  }

  let currentVideo = null;

  function detachVideoListeners(video) {
    if (!video) return;
    video.removeEventListener('play', onVideoPlay);
    video.removeEventListener('pause', onVideoPause);
    video.removeEventListener('ended', onVideoPause);
  }

  function ensureVideoListeners() {
    const video = document.querySelector('video');
    if (!video) {
      if (currentVideo) {
        detachVideoListeners(currentVideo);
        currentVideo = null;
      }
      return;
    }
    if (video === currentVideo) return;
    if (currentVideo) detachVideoListeners(currentVideo);
    video.addEventListener('play', onVideoPlay);
    video.addEventListener('pause', onVideoPause);
    video.addEventListener('ended', onVideoPause);
    currentVideo = video;
    syncShowOriginalWithVideo();
  }

  function syncShowOriginalWithVideo() {
    const video = currentVideo || document.querySelector('video');
    if (!video || !state.enabled) return false;
    if (video.paused) {
      if (state.showOriginal) return false;
      state.showOriginal = true;
      refreshAllSegments();
      return true;
    }
    if (!state.showOriginal) return false;
    state.showOriginal = false;
    refreshAllSegments();
    return true;
  }

  function onVideoPlay() {
    if (!state.showOriginal) return;
    state.showOriginal = false;
    try { chrome.storage.local.set({ showOriginal: false }); } catch (err) {}
    if (state.enabled) showToast('Playing · Transformed captions', 1500);
    refreshAllSegments();
  }

  function onVideoPause() {
    if (state.showOriginal) return;
    state.showOriginal = true;
    try { chrome.storage.local.set({ showOriginal: true }); } catch (err) {}
    if (state.enabled) showToast('Paused · Original captions', 1500);
    refreshAllSegments();
  }

  function onKeyDown(e) {
    const target = e.target;
    if (target && (
      target.isContentEditable ||
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT'
    )) {
      return;
    }
    if ((e.key === 'z' || e.key === 'Z') && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      state.showOriginal = !state.showOriginal;
      setVideoPlayback(state.showOriginal);
      try {
        chrome.storage.local.set({ showOriginal: state.showOriginal });
      } catch (err) {
        // ignore storage failure
      }
      refreshAllSegments();
      showToast(state.showOriginal ? 'Paused · Original captions (Z to resume)' : 'Playing · Transformed captions (Z to peek)', 1800);
    }
  }

  function watchForNavigation() {
    let lastUrl = location.href;
    const check = () => {
      const currentUrl = location.href;
      if (currentUrl !== lastUrl) {
        lastUrl = currentUrl;
        setTimeout(() => {
          ensureVideoListeners();
          refreshAllSegments();
        }, 100);
      }
      requestAnimationFrame(check);
    };
    requestAnimationFrame(check);
  }

  function loadSettings(callback) {
    try {
      chrome.storage.local.get(['enabled', 'showOriginal', 'maxLength', 'applyHideWords'], (result) => {
        if (result && typeof result === 'object') {
          if (typeof result.enabled === 'boolean') state.enabled = result.enabled;
          if (typeof result.showOriginal === 'boolean') state.showOriginal = result.showOriginal;
          if (result.maxLength !== undefined) state.maxLength = normalizeMaxLength(result.maxLength);
          if (typeof result.applyHideWords === 'boolean') state.applyHideWords = result.applyHideWords;
        }
        if (typeof callback === 'function') callback();
      });
    } catch (e) {
      if (typeof callback === 'function') callback();
    }
  }

  function attachStorageListener(onChange) {
    try {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== 'local') return;
        let touched = false;
        if (changes && changes.enabled && typeof changes.enabled.newValue === 'boolean') {
          state.enabled = changes.enabled.newValue;
          touched = true;
        }
        if (changes && changes.showOriginal && typeof changes.showOriginal.newValue === 'boolean') {
          state.showOriginal = changes.showOriginal.newValue;
          touched = true;
        }
        if (changes && changes.maxLength && changes.maxLength.newValue !== undefined) {
          state.maxLength = normalizeMaxLength(changes.maxLength.newValue);
          touched = true;
        }
        if (changes && changes.applyHideWords && typeof changes.applyHideWords.newValue === 'boolean') {
          state.applyHideWords = changes.applyHideWords.newValue;
          touched = true;
        }
        if (touched) syncShowOriginalWithVideo();
        if (touched && typeof onChange === 'function') onChange();
      });
    } catch (e) {
      // storage API unavailable; ignore
    }
  }

  function init() {
    ensureVideoListeners();
    initObserver();
    processAllSegments();
    startPeriodicCheck();
    window.addEventListener('keydown', onKeyDown);
    watchForNavigation();
  }

  function boot() {
    loadSettings(() => {
      attachStorageListener(refreshAllSegments);
      if (document.body) {
        init();
      } else {
        document.addEventListener('DOMContentLoaded', init, { once: true });
      }
    });
  }

  boot();

  window.__ytSubLU_test = {
    transformWord,
    transformText,
    processSegment,
    processAllSegments,
    refreshAllSegments,
    ensureVideoListeners,
    syncShowOriginalWithVideo,
    onVideoPlay,
    onVideoPause,
    WORD_REGEX,
    CAPTION_SELECTOR,
    state,
    showToast,
    DEFAULT_MAX_LENGTH,
    ALLOWED_MAX_LENGTHS,
    normalizeMaxLength,
    HIDE_WORDS
  };
})();