(function () {
  'use strict';

  // --- 配色规则列表 --------------------------------------------------
  // 每条规则 = { id, color, words };words 是逗号分隔的文本(中文逗号也认)。
  // 存进 chrome.storage.local.colorRules,content.js 监听到变化就实时重画字幕。
  const DEFAULT_RULES = Array.isArray(globalThis.__YT_SUB_COLOR_DEFAULT_RULES)
    ? globalThis.__YT_SUB_COLOR_DEFAULT_RULES
    : [];

  const PREVIEW_TEXT = "He's quickly in John's room";

  // 一个"单词"的正则:撇号当普通字母(it's / don't / John's / 'cause / dogs' 算一个词)
  const WORD_PATTERN = "[A-Za-z'’]+";
  const WORD_SPLIT_REGEX = new RegExp('(' + WORD_PATTERN + ')', 'g');

  let colorRules = [];
  let idSeq = 0;

  function normalizeHex(value) {
    const c = String(value == null ? '' : value).trim();
    if (/^#[0-9a-fA-F]{3}$/.test(c) || /^#[0-9a-fA-F]{6}$/.test(c)) return c;
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

  function newRuleId() {
    idSeq += 1;
    return 'r' + Date.now().toString(36) + idSeq.toString(36);
  }

  function normalizeRule(rule) {
    const r = (rule && typeof rule === 'object') ? rule : {};
    let id = (typeof r.id === 'string' && r.id) ? r.id : newRuleId();
    id = id.replace(/[^a-zA-Z0-9_-]/g, '') || newRuleId();
    let words = '';
    if (typeof r.words === 'string') words = r.words;
    else if (Array.isArray(r.words)) words = r.words.join(', ');
    return {
      id: id,
      color: normalizeHex(r.color),
      scale: normalizeScale(r.scale),
      suffix: r.suffix === true,        // 末尾匹配:命中的是"以这个词结尾"
      hidden: r.hidden === true,        // 隐藏:看不见,但还占原来那么宽
      words: words
    };
  }

  // 撇号统一成直的:字幕里可能是 ' 也可能是 ’(两种都出现过)
  function normalizeKey(value) {
    return String(value == null ? '' : value).toLowerCase().replace(/[‘’]/g, "'");
  }

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

  // 首尾的撇号是引号或所有格,匹配时两种形态都试一遍(跟 content.js 一致)
  function matchForms(word) {
    const raw = normalizeKey(word);
    const trimmed = raw.replace(/^'+|'+$/g, '');
    return (trimmed && trimmed !== raw) ? [raw, trimmed] : [raw];
  }

  // 跟 content.js 一致:靠后的规则覆盖靠前的;末尾匹配的规则命中"以这个词结尾"
  function matchRule(word) {
    if (typeof word !== 'string') return null;
    const forms = matchForms(word);
    let best = null;
    colorRules.forEach((rule, index) => {
      const patterns = parseWords(rule.words);
      if (patterns.length === 0) return;
      const hit = rule.suffix
        ? patterns.some(p => p && forms.some(key => key.endsWith(p)))
        : forms.some(key => patterns.indexOf(key) !== -1);
      if (hit && (!best || index > best.index)) best = { rule: rule, index: index };
    });
    return best ? best.rule : null;
  }

  function saveColorRules() {
    try {
      chrome.storage.local.set({ colorRules: colorRules }, () => {});
    } catch (e) {
      // ignore storage failure
    }
  }

  function buildRuleRow(rule, index) {
    const block = document.createElement('div');
    block.className = 'rule-block';

    const row = document.createElement('div');
    row.className = 'rule-row';

    const words = document.createElement('input');
    words.type = 'text';
    words.className = 'rule-words';
    words.placeholder = 'about, of, on';
    words.value = rule.words;
    words.title = 'Words to color, separated by commas';

    const color = document.createElement('input');
    color.type = 'color';
    color.className = 'rule-color';
    color.value = rule.color;
    color.title = 'Color';

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'rule-remove';
    remove.textContent = '×';
    remove.title = 'Remove rule';

    // 字号缩放滑块(0.5 ~ 1.0 倍)
    const scaleRow = document.createElement('div');
    scaleRow.className = 'rule-scale';

    const scale = document.createElement('input');
    scale.type = 'range';
    scale.className = 'rule-size';
    scale.min = '0.5';
    scale.max = '1';
    scale.step = '0.05';
    scale.value = String(rule.scale);
    scale.title = 'Font size scale (0.5 - 1.0)';

    const scaleValue = document.createElement('span');
    scaleValue.className = 'rule-size-value';
    scaleValue.textContent = rule.scale.toFixed(2) + '×';

    // 末尾匹配:勾上以后,这一条里的词当作"结尾"(ly → 所有以 ly 结尾的词)
    const suffixLabel = document.createElement('label');
    suffixLabel.className = 'rule-suffix';
    suffixLabel.title = 'Match words ending with these (e.g. ly, \'s)';

    const suffix = document.createElement('input');
    suffix.type = 'checkbox';
    suffix.className = 'rule-suffix-box';
    suffix.checked = rule.suffix === true;

    const suffixText = document.createElement('span');
    suffixText.textContent = 'ends with';

    suffixLabel.appendChild(suffix);
    suffixLabel.appendChild(suffixText);

    // 隐藏:命中的词看不见,但还占原来那么宽
    const hideLabel = document.createElement('label');
    hideLabel.className = 'rule-hide';
    hideLabel.title = 'Hide matched words (they keep their space)';

    const hide = document.createElement('input');
    hide.type = 'checkbox';
    hide.className = 'rule-hide-box';
    hide.checked = rule.hidden === true;

    const hideText = document.createElement('span');
    hideText.textContent = 'hide';

    hideLabel.appendChild(hide);
    hideLabel.appendChild(hideText);

    // 输入即生效:写回内存 + 存盘,content.js 那边会收到 storage 变化
    words.addEventListener('input', () => {
      colorRules[index].words = words.value;
      saveColorRules();
      renderPreview();
    });
    color.addEventListener('input', () => {
      colorRules[index].color = color.value;
      saveColorRules();
      renderPreview();
    });
    scale.addEventListener('input', () => {
      const next = normalizeScale(scale.value);
      colorRules[index].scale = next;
      scaleValue.textContent = next.toFixed(2) + '×';
      saveColorRules();
      renderPreview();
    });
    suffix.addEventListener('change', () => {
      colorRules[index].suffix = suffix.checked;
      saveColorRules();
      renderPreview();
    });
    hide.addEventListener('change', () => {
      colorRules[index].hidden = hide.checked;
      saveColorRules();
      renderPreview();
    });
    remove.addEventListener('click', () => {
      colorRules.splice(index, 1);
      saveColorRules();
      renderColorRules();
      renderPreview();
    });

    row.appendChild(words);
    row.appendChild(color);
    row.appendChild(remove);

    scaleRow.appendChild(scale);
    scaleRow.appendChild(scaleValue);
    scaleRow.appendChild(suffixLabel);
    scaleRow.appendChild(hideLabel);

    block.appendChild(row);
    block.appendChild(scaleRow);
    return block;
  }

  function renderColorRules() {
    const list = document.getElementById('rulesList');
    if (!list) return;
    list.innerHTML = '';
    if (colorRules.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'rules-empty';
      empty.textContent = 'No rules yet — add one below.';
      list.appendChild(empty);
      return;
    }
    colorRules.forEach((rule, index) => list.appendChild(buildRuleRow(rule, index)));
  }

  function addColorRule() {
    colorRules.push({ id: newRuleId(), color: '#ffd400', scale: 1, hidden: false, words: '' });
    saveColorRules();
    renderColorRules();
    renderPreview();
    const inputs = document.querySelectorAll('.rule-words');
    const last = inputs[inputs.length - 1];
    if (last) last.focus();
  }

  // 预览:按当前规则把例句里的命中词染上色
  function renderPreview() {
    const box = document.getElementById('colorPreview');
    if (!box) return;
    box.innerHTML = '';
    const parts = PREVIEW_TEXT.split(WORD_SPLIT_REGEX);
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (!part) continue;
      if (i % 2 === 0) {
        box.appendChild(document.createTextNode(part));
        continue;
      }
      const rule = matchRule(part);
      if (!rule) {
        box.appendChild(document.createTextNode(part));
        continue;
      }
      const span = document.createElement('span');
      span.style.color = normalizeHex(rule.color);
      span.style.fontSize = Math.round(normalizeScale(rule.scale) * 100) + '%';
      if (rule.hidden) span.style.visibility = 'hidden';   // 隐藏但保留占位
      span.textContent = part;
      box.appendChild(span);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const checkbox = document.getElementById('enabledCheckbox');
    const addRuleBtn = document.getElementById('addRuleBtn');

    try {
      chrome.storage.local.get(['enabled', 'colorRules'], (result) => {
        if (result && typeof result === 'object') {
          if (typeof result.enabled === 'boolean') checkbox.checked = result.enabled;
        }
        const stored = result && result.colorRules;
        // 存过就用存的(哪怕是空数组 = 用户自己清空了),没存过才用默认那条
        colorRules = Array.isArray(stored)
          ? stored.map(normalizeRule)
          : DEFAULT_RULES.map(normalizeRule);
        renderColorRules();
        renderPreview();
      });
    } catch (e) {
      checkbox.checked = true;
      colorRules = DEFAULT_RULES.map(normalizeRule);
      renderColorRules();
      renderPreview();
    }

    checkbox.addEventListener('change', () => {
      const next = checkbox.checked;
      try {
        chrome.storage.local.set({ enabled: next }, () => {});
      } catch (e) {
        // ignore storage failure
      }
    });

    if (addRuleBtn) {
      addRuleBtn.addEventListener('click', addColorRule);
    }
  });
})();
