(function () {
  'use strict';

  const CAPTION_SELECTOR = '.ytp-caption-segment';
  const COLOR_ATTR = 'data-yt-sub-color-c';

  // 一个"单词"的正则:撇号当普通字母,字母 + 撇号连成的一段就是一个词
  // (it's / don't / John's / 'cause / dogs' 都算一个词)
  const WORD_PATTERN = "[A-Za-z'’]+";
  const WORD_SPLIT_REGEX = new RegExp('(' + WORD_PATTERN + ')', 'g');

  // --- 配色规则 -------------------------------------------------------
  // 规则存在 chrome.storage.local.colorRules 里,在 popup 里编辑;
  // 没存过就用 defaults.js 里的默认规则(常用介词 = 黄色)。
  const colorWordMap = new Map();
  const suffixEntries = [];        // 末尾匹配的规则
  let colorRules = Array.isArray(globalThis.__YT_SUB_COLOR_DEFAULT_RULES)
    ? globalThis.__YT_SUB_COLOR_DEFAULT_RULES.slice()
    : [];

  function sanitizeRuleId(id) {
    const s = String(id == null ? '' : id).replace(/[^a-zA-Z0-9_-]/g, '');
    return s || 'r';
  }

  function normalizeColor(value) {
    const c = String(value == null ? '' : value).trim();
    if (/^#[0-9a-fA-F]{3}$/.test(c) || /^#[0-9a-fA-F]{6}$/.test(c) || /^#[0-9a-fA-F]{8}$/.test(c)) return c;
    return '#ffd400';
  }

  // 字号缩放:0.5 ~ 1.0 倍(1 = 不变)
  function normalizeScale(value) {
    const n = Number(value);
    if (!isFinite(n)) return 1;
    if (n < 0.5) return 0.5;
    if (n > 1) return 1;
    return Math.round(n * 100) / 100;
  }

  // 撇号统一成直的:字幕里可能是 ' 也可能是 ’(两种都出现过),
  // 不统一的话 endsWith("'t") 匹配不上字幕里的 "doesn’t"。
  function normalizeKey(value) {
    return String(value == null ? '' : value).toLowerCase().replace(/[‘’]/g, "'");
  }

  // 单词表:"about, of, on" 这种逗号分隔的文本,也兼容存成数组
  function parseWords(value) {
    const list = Array.isArray(value)
      ? value
      : String(value == null ? '' : value).split(/[,，;；]/);
    const out = [];
    for (const w of list) {
      const key = normalizeKey(String(w == null ? '' : w).trim());
      if (key) out.push(key);
    }
    return out;
  }

  // 同一个词出现在多条规则里时,靠后的规则覆盖靠前的
  function buildColorMap(rules) {
    colorWordMap.clear();
    suffixEntries.length = 0;
    const list = Array.isArray(rules) ? rules : [];
    list.forEach((rule, index) => {
      if (!rule || typeof rule !== 'object') return;
      const entry = {
        id: sanitizeRuleId(rule.id),
        color: normalizeColor(rule.color),
        scale: normalizeScale(rule.scale),
        suffix: rule.suffix === true,      // 末尾匹配:命中的是"以这个词结尾"
        hidden: rule.hidden === true,      // 隐藏:看不见,但还占原来那么宽
        order: index
      };
      const words = parseWords(rule.words);
      if (entry.suffix) {
        suffixEntries.push({ entry: entry, patterns: words });
      } else {
        for (const w of words) colorWordMap.set(w, entry);
      }
    });
  }

  buildColorMap(colorRules);      // 先按默认规则建表,存储里的规则随后会覆盖

  function setColorRules(rules) {
    colorRules = Array.isArray(rules) ? rules : [];
    buildColorMap(colorRules);
  }

  function matchColorRule(word) {
    if (typeof word !== 'string') return null;
    const forms = matchForms(word);
    let best = null;
    // 精确匹配:原样 + 去掉首尾撇号(字幕里的引号 'hello' 也算 hello)
    for (const key of forms) {
      const entry = colorWordMap.get(key);
      if (entry && (!best || entry.order > best.order)) best = entry;
    }
    // 末尾匹配:"以这个词结尾"
    for (const item of suffixEntries) {
      for (const p of item.patterns) {
        if (!p) continue;
        if (forms.some(key => key.endsWith(p))) {
          if (!best || item.entry.order > best.order) best = item.entry;
          break;
        }
      }
    }
    return best;
  }

  // 首尾的撇号是引号或所有格,匹配时两种形态都试一遍:
  //   "there’s" → 只有一种(撇号在中间)
  //   "'cause"   → "'cause" / "cause"
  //   "'hello'"  → "'hello'" / "hello"
  function matchForms(word) {
    const raw = normalizeKey(word);
    const trimmed = raw.replace(/^'+|'+$/g, '');
    return (trimmed && trimmed !== raw) ? [raw, trimmed] : [raw];
  }

  // 样式表注入页面(带 !important,压得住 YouTube 自己的内联 color)
  function injectColorStyles() {
    const old = document.getElementById('yt-sub-color-styles');
    if (old) old.remove();
    let el = document.createElement('style');
    el.id = 'yt-sub-color-styles';
    el.textContent = colorRules
      .filter(r => r && typeof r === 'object')
      .map(r => {
        const sel = '.yt-sub-color-c-' + sanitizeRuleId(r.id);
        const base = 'color: ' + normalizeColor(r.color) + ' !important; font-size: ' + Math.round(normalizeScale(r.scale) * 100) + '% !important;';
        // 隐藏的规则:看不见,但位置还留着(visibility:hidden 保留占位)
        // 视频暂停时不管隐藏,词照样显示出来
        return r.hidden === true && !videoPaused
          ? sel + ' { ' + base + ' visibility: hidden !important; }'
          : sel + ' { ' + base + ' }';
      })
      .join('\n');
    (document.head || document.documentElement).appendChild(el);
  }

  const state = {
    enabled: true
  };

  // --- 视频播放状态 ---------------------------------------------------
  // 暂停的时候把"隐藏"的词显示出来(字幕停住了,正好用来看生词),
  // 继续播放再藏回去。
  let videoPaused = false;
  let videoEl = null;
  let watchedVideo = null;

  function findVideo() {
    if (videoEl && videoEl.isConnected) return videoEl;
    videoEl = document.querySelector('video');
    return videoEl;
  }

  function onVideoStateChange() {
    const v = findVideo();
    if (!v) return;
    const paused = !!v.paused;
    if (paused === videoPaused) return;
    videoPaused = paused;
    injectColorStyles();        // 样式表里的 visibility 也要跟着变
    processAllSegments(true);   // 强制重画:隐藏 ↔ 显示
  }

  // 找到 <video> 就挂上 pause / play 监听(YouTube 换页会换掉这个元素)
  function watchVideo() {
    const v = findVideo();
    if (!v) return;
    if (v !== watchedVideo) {
      watchedVideo = v;
      v.addEventListener('pause', onVideoStateChange);
      v.addEventListener('play', onVideoStateChange);
      v.addEventListener('ended', onVideoStateChange);
    }
    onVideoStateChange();       // 补一次同步(状态变了才重画)
  }

  // 把一句字幕里命中的词包一层 span 上色。
  // 只上色,一个字都不改 —— 文字按当前屏幕上的内容原样重建,
  // 这样和别的插件(比如下划线那个)不会互相抢字幕。
  function renderCaption(segment, text) {
    const frag = document.createDocumentFragment();
    const parts = text.split(WORD_SPLIT_REGEX);
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (!part) continue;
      if (i % 2 === 0) {                       // 词之间的空格、标点
        frag.appendChild(document.createTextNode(part));
        continue;
      }
      const rule = matchColorRule(part);
      if (!rule) {
        frag.appendChild(document.createTextNode(part));
        continue;
      }
      const span = document.createElement('span');
      span.className = 'yt-sub-color-c-' + rule.id;
      span.setAttribute(COLOR_ATTR, rule.id);
      span.style.color = rule.color;         // 样式表没注进去时的兜底
      span.style.fontSize = Math.round(rule.scale * 100) + '%';
      if (rule.hidden && !videoPaused) span.style.visibility = 'hidden';   // 隐藏但保留占位(暂停时显示出来)
      span.textContent = part;
      frag.appendChild(span);
    }
    segment.replaceChildren(frag);
  }

  // 这一句里按规则应该上色的词
  function matchedWords(text) {
    const parts = text.split(WORD_SPLIT_REGEX);
    const out = [];
    for (let i = 1; i < parts.length; i += 2) {
      if (matchColorRule(parts[i])) out.push(parts[i]);
    }
    return out;
  }

  // 屏幕上已经包了 span 的词
  function spanWords(segment) {
    const spans = segment.querySelectorAll('[' + COLOR_ATTR + ']');
    const out = [];
    for (let i = 0; i < spans.length; i++) out.push(spans[i].textContent);
    return out;
  }

  function sameList(a, b) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }

  // 关掉总开关时把我们加的 span 拆掉(文字原样留下)
  function removeColorSpans(segment) {
    const spans = segment.querySelectorAll('[' + COLOR_ATTR + ']');
    for (let i = 0; i < spans.length; i++) {
      const span = spans[i];
      const parent = span.parentNode;
      if (!parent) continue;
      while (span.firstChild) parent.insertBefore(span.firstChild, span);
      parent.removeChild(span);
    }
  }

  function processSegment(segment, force) {
    if (!segment || !segment.isConnected) return;
    const text = segment.textContent;
    if (typeof text !== 'string' || !text) return;
    if (!state.enabled) {
      if (spanWords(segment).length > 0) removeColorSpans(segment);
      return;
    }
    const expected = matchedWords(text);
    // 已经上的色和规则对得上,就别再动 DOM(避免和 MutationObserver 互相触发)
    if (!force && sameList(spanWords(segment), expected)) return;
    renderCaption(segment, text);
  }

  function processAllSegments(force) {
    const nodes = document.querySelectorAll(CAPTION_SELECTOR);
    for (const n of nodes) processSegment(n, force);
  }

  let observer = null;

  function onDomMutations(mutations) {
    let needsProcess = false;
    let needsVideoWatch = false;
    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        for (const node of mutation.addedNodes) {
          if (node.nodeType !== Node.ELEMENT_NODE) continue;
          if (node.matches && node.matches(CAPTION_SELECTOR)) { needsProcess = true; break; }
          if (node.matches && node.matches('video')) { needsVideoWatch = true; }
          if (node.querySelectorAll && node.querySelectorAll(CAPTION_SELECTOR).length > 0) { needsProcess = true; break; }
          if (node.querySelector && node.querySelector('video')) { needsVideoWatch = true; }
        }
        if (needsProcess) break;
      } else if (mutation.type === 'characterData') {
        const parent = mutation.target.parentElement;
        if (parent && parent.closest && parent.closest(CAPTION_SELECTOR)) { needsProcess = true; break; }
      } else if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
        const target = mutation.target;
        if (target.classList && target.classList.contains('ytp-caption-segment')) { needsProcess = true; break; }
      }
    }
    if (needsVideoWatch) watchVideo();
    if (needsProcess) processAllSegments(false);
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
      watchVideo();          // 同步播放状态(漏掉事件时也能补上)
      if (document.querySelector(CAPTION_SELECTOR)) processAllSegments(false);
    }, 1500);
  }

  function loadSettings(callback) {
    try {
      chrome.storage.local.get(['enabled', 'colorRules'], (result) => {
        if (result && typeof result === 'object') {
          if (typeof result.enabled === 'boolean') state.enabled = result.enabled;
          // 存过就用存的(哪怕是空数组 = 用户自己清空了),没存过才用默认的
          if (Array.isArray(result.colorRules)) setColorRules(result.colorRules);
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
        let force = false;
        if (changes && changes.enabled && typeof changes.enabled.newValue === 'boolean') {
          state.enabled = changes.enabled.newValue;
          touched = true;
        }
        // popup 里改了配色规则:重建查表 + 重注样式表 + 强制重画
        // (只改颜色不改词数时,词的个数对得上,也得重画一次)
        if (changes && changes.colorRules && changes.colorRules.newValue !== undefined) {
          setColorRules(changes.colorRules.newValue);
          injectColorStyles();
          touched = true;
          force = true;
        }
        if (touched && typeof onChange === 'function') onChange(force);
      });
    } catch (e) {
      // storage API unavailable; ignore
    }
  }

  function init() {
    injectColorStyles();
    initObserver();
    watchVideo();
    processAllSegments(false);
    startPeriodicCheck();
  }

  function boot() {
    loadSettings(() => {
      attachStorageListener((force) => processAllSegments(force));
      if (document.body) {
        init();
      } else {
        document.addEventListener('DOMContentLoaded', init, { once: true });
      }
    });
  }

  boot();

  window.__ytSubColor_test = {
    renderCaption,
    injectColorStyles,
    matchColorRule,
    matchedWords,
    spanWords,
    sameList,
    removeColorSpans,
    setColorRules,
    buildColorMap,
    parseWords,
    normalizeKey,
    matchForms,
    normalizeColor,
    normalizeScale,
    sanitizeRuleId,
    processSegment,
    processAllSegments,
    watchVideo,
    onVideoStateChange,
    getColorRules: () => colorRules,
    state,
    CAPTION_SELECTOR,
    WORD_PATTERN,
    WORD_SPLIT_REGEX
  };
})();
