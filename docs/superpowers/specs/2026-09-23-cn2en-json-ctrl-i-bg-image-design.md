# cn2en-json Ctrl+I Background Image Design Specification

## Overview

为 `cn2en-json.html` 添加 Ctrl+I 快捷键弹出背景图片管理模态：选择本地图片后读为 Base64 存储到 IndexedDB，并应用到 `body` 全屏背景；模态内可一键清除背景。背景在页面刷新后自动恢复。

## Layout Structure

新增模态 DOM（紧邻 `#cnModal`）：

```html
<div id="bgModal" class="bg-modal" hidden>
    <div id="bgModalBackdrop" class="bg-modal-backdrop"></div>
    <div id="bgModalPanel" class="bg-modal-panel">
        <div class="bg-modal-title">背景图片</div>
        <input type="file" id="bgFileInput" accept="image/png,image/jpeg,image/gif,image/webp,image/bmp">
        <div class="bg-modal-actions">
            <button id="bgClearBtn">清除背景</button>
            <button id="bgCloseBtn">关闭</button>
        </div>
    </div>
</div>
```

## Visual Design

CSS 复用 cn-modal 风格变体：

```css
.bg-modal {
    position: fixed;
    inset: 0;
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center;
}
.bg-modal[hidden] { display: none; }
.bg-modal-backdrop {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
}
.bg-modal-panel {
    position: relative;
    background: #1e1e1e;
    padding: 30px;
    border-radius: 8px;
    min-width: 320px;
    display: flex;
    flex-direction: column;
    gap: 16px;
}
.bg-modal-title {
    font-size: 20px;
    color: #e0e0e0;
    text-align: center;
}
.bg-modal-actions {
    display: flex;
    gap: 10px;
    justify-content: center;
}
.bg-modal-actions button {
    padding: 6px 16px;
    background: #2c2c2c;
    color: #e0e0e0;
    border: 1px solid #444;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
}
.bg-modal-actions button:hover { background: #3a3a3a; }
```

body 应用背景：

```css
body.has-bg {
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    background-attachment: fixed;
}
```

JS 通过 `body.classList.add/remove('has-bg')` 与 `body.style.backgroundImage` 控制。

## Functionality

### IndexedDB 封装

```js
const DB_NAME = 'cn2en-json-bg';
const DB_VERSION = 1;
const STORE = 'images';

function openBgDb() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => req.result.createObjectStore(STORE);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

async function saveBg(dataUrl) {
    const db = await openBgDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put({ dataUrl }, 'current');
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

async function loadBg() {
    try {
        const db = await openBgDb();
        return await new Promise((resolve) => {
            const tx = db.transaction(STORE, 'readonly');
            const req = tx.objectStore(STORE).get('current');
            req.onsuccess = () => resolve(req.result?.dataUrl || null);
            req.onerror = () => resolve(null);
        });
    } catch { return null; }
}

async function clearBg() {
    const db = await openBgDb();
    return new Promise((resolve) => {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).delete('current');
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
    });
}

function applyBg(dataUrl) {
    if (dataUrl) {
        document.body.style.backgroundImage = `url(${dataUrl})`;
        document.body.classList.add('has-bg');
    } else {
        document.body.style.backgroundImage = '';
        document.body.classList.remove('has-bg');
    }
}
```

### 模态元素引用

```js
const bgModal = document.getElementById('bgModal');
const bgModalBackdrop = document.getElementById('bgModalBackdrop');
const bgFileInput = document.getElementById('bgFileInput');
const bgClearBtn = document.getElementById('bgClearBtn');
const bgCloseBtn = document.getElementById('bgCloseBtn');
```

### 事件绑定

```js
bgFileInput.addEventListener('change', () => {
    const file = bgFileInput.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
        showError('请选择图片文件');
        bgFileInput.value = '';
        return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
        try {
            await saveBg(reader.result);
            applyBg(reader.result);
            bgModal.hidden = true;
            bgFileInput.value = '';
        } catch (err) {
            showError(`保存失败: ${err.message}`);
        }
    };
    reader.onerror = () => showError('读取文件失败');
    reader.readAsDataURL(file);
});

bgClearBtn.addEventListener('click', async () => {
    await clearBg();
    applyBg(null);
});

bgCloseBtn.addEventListener('click', () => { bgModal.hidden = true; });
bgModalBackdrop.addEventListener('click', () => { bgModal.hidden = true; });
```

### Ctrl+I keydown

放在 Ctrl+V 分支之前（防止 Ctrl+I 被浏览器忽略）：

```js
if (e.ctrlKey && !e.shiftKey && !e.altKey && e.code === 'KeyI') {
    e.preventDefault();
    bgModal.hidden = false;
}
```

### ESC 监听扩展

现有 ESC 监听器扩展为同时检查 bgModal：

```js
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (!bgModal.hidden) {
            e.preventDefault();
            e.stopPropagation();
            bgModal.hidden = true;
        } else if (!cnModal.hidden) {
            e.preventDefault();
            e.stopPropagation();
            hideAllCn();
        }
    }
});
```

### 初始化恢复背景

在 `render()` 调用之前：

```js
loadBg().then(applyBg);
```

### Hint 文本更新

```html
<div id="hint" class="hint">← → 切换 · 1-3 切 Mode · S 揭示 · E/PgDn 读 EN · Z 全文 · Ctrl+I 背景</div>
```

## 行为矩阵

| 操作 | 结果 |
|------|------|
| Ctrl+I | 打开背景模态 |
| 选择图片文件（非 image/*） | 显示错误"请选择图片文件" |
| 选择图片文件（image/*） | 读为 dataURL → 存 IndexedDB → 应用到 body → 关闭模态 |
| 点击"清除背景" | 删 IndexedDB 记录 → body 恢复默认纯色 |
| 点击"关闭" | 仅关闭模态，不动背景 |
| 点击遮罩 | 同"关闭" |
| ESC（背景模态打开） | 关闭背景模态 |
| ESC（中文模态打开） | 关闭中文模态（沿用原行为） |
| Ctrl+Shift+I / Alt+I | 不触发（修饰键守卫拒绝） |
| 页面刷新 | 自动加载已有背景应用到 body |

## State

模块状态：仅 IndexedDB 中的 `{ dataUrl }`（key `'current'`）。无新增 JS 变量。

## Error Handling

| 情况 | 行为 |
|------|------|
| 文件类型非 image/* | 顶部错误条 "请选择图片文件"，清 file input |
| FileReader 读取失败 | 错误条 "读取文件失败" |
| IndexedDB 写入失败 | 错误条 "保存失败: ..." |
| IndexedDB 读取失败（loadBg 异常） | 静默忽略，背景为空 |
| IndexedDB 删除失败 | 静默忽略，body 背景已清 |

## File

- Modify: `cn2en-json.html`：
  - 新增 bg modal DOM（`#bgModal` / `#bgModalBackdrop` / `#bgModalPanel` / `#bgFileInput` / `#bgClearBtn` / `#bgCloseBtn`）
  - 新增 bg modal CSS
  - 新增 body.has-bg CSS
  - 新增 IndexedDB 封装函数（openBgDb / saveBg / loadBg / clearBg）
  - 新增 applyBg 函数
  - 注册 modal 事件（file change / clear / close / backdrop）
  - keydown 新增 Ctrl+I 分支
  - ESC 监听扩展支持 bgModal
  - 初始化时 `loadBg().then(applyBg)`
  - `#hint` 文本追加 `· Ctrl+I 背景`

## Out of Scope

- 多张背景切换 / 背景库
- 调整背景位置 / 缩放 / 重复模式 UI（用 CSS 默认 cover/center/no-repeat）
- 远程 URL 图片
- IndexedDB 清空 / 导出 UI
- 拖拽上传图片