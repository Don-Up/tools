chrome.commands.onCommand.addListener(async (cmd) => {
  if (cmd !== 'skip-now') return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id) return;
  if (!tab.url || !tab.url.includes('youtube.com/shorts')) return;
  try {
    await chrome.tabs.sendMessage(tab.id, { type: 'SKIP_NOW' });
  } catch (_) {
    // content.js 未注入时静默忽略（用户在非 Shorts tab 触发）
  }
});
