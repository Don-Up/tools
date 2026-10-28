// 右键菜单:选中文字后点"加入朗读队列",等价于按 Alt+X。
// background 只负责把消息转给 content script —— 它拿不到页面的选区,
// 也不该碰 DOM。选中的文字由 contextMenus 的点击信息带过来(info.selectionText)。

const MENU_ID = 'focus-json-enqueue-selection';
const ENQUEUE_NOW_TYPE = 'focus-json-enqueue-now';

function createMenu() {
    // removeAll 之后再建,免得重复 id 报错(重载扩展 / 浏览器重启后 contextMenus 可能还在)
    chrome.contextMenus.removeAll(() => {
        chrome.contextMenus.create({
            id: MENU_ID,
            title: '加入朗读队列',
            contexts: ['selection'],
            documentUrlPatterns: ['http://*/*', 'https://*/*']
        });
    });
}

chrome.runtime.onInstalled.addListener(createMenu);
chrome.runtime.onStartup.addListener(createMenu);

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId !== MENU_ID) return;
    if (!tab || tab.id === undefined || tab.id === null) return;
    // focus-json 页面本身没注入 content script,sendMessage 会失败,忽略即可
    chrome.tabs.sendMessage(tab.id, {
        type: ENQUEUE_NOW_TYPE,
        text: info.selectionText || '',
        translate: true
    }).catch(() => {});
});
