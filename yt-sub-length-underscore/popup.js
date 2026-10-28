(function () {
  'use strict';

  const HIDE_WORDS = new Set([
    'about', 'another',
    'because', 'before', 'although', 'even', 'though', 'however', 'therefore', 'whether',
    'after', 'around', 'against', 'again', 'among', 'amongst', 'between', 'during',
    'inside', 'outside', 'through', 'throughout', 'without', 'within',
    'towards', 'toward', 'across', 'behind', 'beyond',
    'someone', 'somebody', 'something', 'everyone', 'everybody', 'everything',
    'anyone', 'anybody', 'anything', 'nobody', 'nothing',
    'yourself', 'himself', 'herself', 'ourselves', 'themselves', "itself", "myself", 
    'cannot', 'should', 'would', 'could', 'might',
    "mustn", "shouldn", "wouldn", "couldn",
    'enough', 'either', 'neither', 'several', 'another',
	'already', "don", "doesn", "every", "still", 'always', "almost", "which", "there", 
	"never", "other", "being", "going", "their", 'often', "maybe", "whose", "under", "beneath", "above",
	"simply", "exactly", "barely", "hardly", "further", "finally", "really", "actually"
  ]);

  const DEFAULT_MAX_LENGTH = 4;
  const ALLOWED_MAX_LENGTHS = [3, 4, 5, 6, 7, 8];
  const EXAMPLE_INPUT = 'I am the four';
  const SAMPLE_WORDS = ['I', 'am', 'the', 'four', 'Hello', 'world', 'cat', 'dogs'];

  function normalizeMaxLength(value) {
    const n = Number(value);
    if (ALLOWED_MAX_LENGTHS.indexOf(n) !== -1) return n;
    return DEFAULT_MAX_LENGTH;
  }

  function transformText(text, maxLength, applyHideWords) {
    if (typeof text !== 'string') return text;
    const cap = normalizeMaxLength(maxLength);
    return text.replace(/\b[a-zA-Z]+\b/g, (match) => {
      if (applyHideWords && HIDE_WORDS.has(match.toLowerCase())) return '_'.repeat(match.length);
      if (match.length >= 1 && match.length <= cap) return '_'.repeat(match.length);
      return match;
    });
  }

  function buildPreview(enabled, maxLength, applyHideWords) {
    if (!enabled) {
      return EXAMPLE_INPUT + ' → ' + EXAMPLE_INPUT;
    }
    return EXAMPLE_INPUT + ' → ' + transformText(EXAMPLE_INPUT, maxLength, applyHideWords);
  }

  function buildSamples(enabled, maxLength, applyHideWords) {
    return SAMPLE_WORDS.map((w) => {
      const out = enabled ? transformText(w, maxLength, applyHideWords) : w;
      return w + ' → ' + out;
    }).join('   ');
  }

  document.addEventListener('DOMContentLoaded', () => {
    const checkbox = document.getElementById('enabledCheckbox');
    const select = document.getElementById('maxLengthSelect');
    const applyHideWordsCheckbox = document.getElementById('applyHideWordsCheckbox');
    const example = document.getElementById('examplePreview');

    let currentMaxLength = DEFAULT_MAX_LENGTH;
    let currentApplyHideWords = true;

    function refresh() {
      example.textContent = buildPreview(checkbox.checked, currentMaxLength, currentApplyHideWords) + '    |    ' + buildSamples(checkbox.checked, currentMaxLength, currentApplyHideWords);
    }

    function setSelectValue(value) {
      const normalized = normalizeMaxLength(value);
      currentMaxLength = normalized;
      const stringValue = String(normalized);
      for (let i = 0; i < select.options.length; i++) {
        if (select.options[i].value === stringValue) {
          select.selectedIndex = i;
          break;
        }
      }
    }

    try {
      chrome.storage.local.get(['enabled', 'maxLength', 'applyHideWords'], (result) => {
        const enabled = result && typeof result.enabled === 'boolean' ? result.enabled : true;
        const maxLength = result && result.maxLength !== undefined ? result.maxLength : DEFAULT_MAX_LENGTH;
        const applyHideWords = result && typeof result.applyHideWords === 'boolean' ? result.applyHideWords : true;
        checkbox.checked = enabled;
        setSelectValue(maxLength);
        if (applyHideWordsCheckbox) {
          applyHideWordsCheckbox.checked = applyHideWords;
          currentApplyHideWords = applyHideWords;
        }
        refresh();
      });
    } catch (e) {
      checkbox.checked = true;
      setSelectValue(DEFAULT_MAX_LENGTH);
      if (applyHideWordsCheckbox) applyHideWordsCheckbox.checked = true;
      refresh();
    }

    checkbox.addEventListener('change', () => {
      const next = checkbox.checked;
      try {
        chrome.storage.local.set({ enabled: next }, () => refresh());
      } catch (e) {
        refresh();
      }
    });

    select.addEventListener('change', () => {
      const next = normalizeMaxLength(select.value);
      currentMaxLength = next;
      try {
        chrome.storage.local.set({ maxLength: next }, () => refresh());
      } catch (e) {
        refresh();
      }
    });

    if (applyHideWordsCheckbox) {
      applyHideWordsCheckbox.addEventListener('change', () => {
        currentApplyHideWords = applyHideWordsCheckbox.checked;
        try {
          chrome.storage.local.set({ applyHideWords: currentApplyHideWords }, () => refresh());
        } catch (e) {
          refresh();
        }
      });
    }
  });
})();
