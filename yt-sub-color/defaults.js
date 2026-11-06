// 默认配色规则 —— content.js 和 popup.js 共用这一份。
// 用户在 popup 里改过以后,以 chrome.storage.local.colorRules 为准,这里只是初始值。
//
// 字段:
//   id     规则标识,会拼成 class 名 .yt-sub-color-c-<id>,只能用字母/数字/下划线
//   color  颜色值,#rrggbb
//   scale  字号缩放,0.5 ~ 1.0(1 = 不变)
//   words  单词表,逗号分隔(英文逗号/中文逗号都行)
(function () {
  'use strict';

  const DEFAULT_COLOR_RULES = [
    {
      id: 'prep',
      color: '#ffd400',                       // 黄色:常用介词
      scale: 1,
      words: [
        'about', 'above', 'across', 'after', 'against', 'along', 'alongside',
        'amid', 'amidst', 'among', 'amongst', 'around', 'at', 'atop',
        'before', 'behind', 'below', 'beneath', 'beside', 'besides',
        'between', 'beyond', 'by', 'despite', 'down', 'during', 'except',
        'for', 'from', 'in', 'inside', 'into', 'near', 'of', 'off', 'on',
        'onto', 'out', 'outside', 'over', 'past', 'per', 'since', 'through',
        'throughout', 'till', 'to', 'toward', 'towards', 'under',
        'underneath', 'unlike', 'until', 'up', 'upon', 'via', 'with',
        'within', 'without'
      ].join(', ')
    }
  ];

  globalThis.__YT_SUB_COLOR_DEFAULT_RULES = DEFAULT_COLOR_RULES;
})();
