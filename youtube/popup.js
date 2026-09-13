const $enabled = document.getElementById('enabled');
const $lead = document.getElementById('lead');

const DEFAULTS = { enabled: true, leadSeconds: 0 };

chrome.storage.sync.get(DEFAULTS, (data) => {
  $enabled.checked = !!data.enabled;
  $lead.value = data.leadSeconds;
});

$enabled.addEventListener('change', () => {
  chrome.storage.sync.set({ enabled: $enabled.checked });
});

$lead.addEventListener('input', () => {
  let v = parseFloat($lead.value);
  if (!isFinite(v)) v = 0;
  v = Math.max(0, Math.min(5, v));
  chrome.storage.sync.set({ leadSeconds: v });
});
