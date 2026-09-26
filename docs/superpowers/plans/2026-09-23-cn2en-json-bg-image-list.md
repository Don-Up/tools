# cn2en-json Background Image List Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `cn2en-json.html` 中将背景图片对话框改为列表管理（image1/image2/...），每次切换 entry 随机选一张作背景，避免与上次相同。

**Architecture:** 单文件扩展。IndexedDB object store 升级到 autoincrement 模式，新增 `loadAllBg`/`addBg`/`deleteBg` 替换原单条 `saveBg`/`loadBg`。`bgImages` 与 `currentBgId` 模块变量缓存状态。模态内渲染列表 + 删除按钮 + 底部添加按钮。`render()` 末尾触发 `pickRandomBg()`。

**Tech Stack:** 纯 HTML/CSS/JS（vanilla），IndexedDB（autoincrement object store），FileReader，backdrop-filter（沿用）。

---

## File Structure

- Modify: `cn2en-json.html` — 单文件，替换 bg 相关 DOM/CSS/JS

无新增文件。

---

## Task 1: 重构 IndexedDB schema 与 DB helpers

**Files:**
- Modify: `cn2en-json.html`

- [ ] **Step 1: 升级 DB_VERSION 到 2 并改 store 为 autoincrement**

定位到现有 `const DB_VERSION = 1;`（位于 `STORE = 'images'` 上方附近），改为：

```js
const DB_VERSION = 2;
```

定位到 `openBgDb` 函数内的 `req.onupgradeneeded = () => req.result.createObjectStore(STORE);`，替换为：

```js
req.onupgradeneeded = () => {
    const db = req.result;
    if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
    }
};
```

- [ ] **Step 2: 替换 saveBg/loadBg/clearBg 为 loadAllBg/addBg/deleteBg**

删除现有 `async function saveBg(...)` / `async function loadBg(...)` / `async function clearBg(...)` 三块整体代码。替换为：

```js
async function loadAllBg() {
    const db = await openBgDb();
    return new Promise((resolve) => {
        const tx = db.transaction(STORE, 'readonly');
        const req = tx.objectStore(STORE).getAll();
        req.onsuccess = () => resolve((req.result || []).sort((a, b) => a.id - b.id));
        req.onerror = () => resolve([]);
    });
}

async function addBg(dataUrl) {
    const db = await openBgDb();
    const all = await loadAllBg();
    const name = `image${all.length + 1}`;
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        const store = tx.objectStore(STORE);
        const req = store.add({ name, dataUrl });
        req.onsuccess = () => resolve({ id: req.result, name, dataUrl });
        req.onerror = () => reject(req.error);
    });
}

async function deleteBg(id) {
    const db = await openBgDb();
    return new Promise((resolve) => {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
    });
}
```

- [ ] **Step 3: 提交**

```bash
git add cn2en-json.html
git commit -m "Refactor bg IndexedDB to list of records with autoincrement id"
```

---

## Task 2: 替换模态 DOM 与 CSS

**Files:**
- Modify: `cn2en-json.html`

- [ ] **Step 1: 替换 #bgModal 内层结构**

定位到 `<div id="bgModal" class="bg-modal" hidden>...` 整块（含 backdrop/panel/title/file input/actions/close）。将整块替换为：

```html
<div id="bgModal" class="bg-modal" hidden>
    <div id="bgModalBackdrop" class="bg-modal-backdrop"></div>
    <div id="bgModalPanel" class="bg-modal-panel">
        <div class="bg-modal-title">背景图片</div>
        <ul id="bgList" class="bg-list"></ul>
        <div class="bg-modal-actions">
            <button id="bgAddBtn">选择图片</button>
            <button id="bgCloseBtn">关闭</button>
        </div>
    </div>
    <input type="file" id="bgFileInput" accept="image/png,image/jpeg,image/gif,image/webp,image/bmp" hidden>
</div>
```

- [ ] **Step 2: 添加 bgList 相关 CSS**

定位到现有 `body.has-bg #textStage { ... }` 规则之后。紧接其后插入：

```css
.bg-list {
    list-style: none;
    margin: 0;
    padding: 0;
    max-height: 200px;
    overflow-y: auto;
    min-width: 260px;
}
.bg-list-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 6px 8px;
    color: #e0e0e0;
    font-size: 14px;
    border-radius: 4px;
}
.bg-list-item:hover { background: #2c2c2c; }
.bg-delete-btn {
    background: transparent;
    color: #c66;
    border: none;
    cursor: pointer;
    font-size: 18px;
    padding: 0 8px;
    line-height: 1;
}
.bg-delete-btn:hover { color: #f88; }
.bg-list:empty::before {
    content: '暂无背景图片';
    color: #666;
    font-size: 13px;
    display: block;
    text-align: center;
    padding: 8px;
}
```

- [ ] **Step 3: 提交**

```bash
git add cn2en-json.html
git commit -m "Replace bg modal DOM and add list CSS"
```

---

## Task 3: 重写模态 JS（list 渲染 + add/close + 随机背景）

**Files:**
- Modify: `cn2en-json.html`

- [ ] **Step 1: 添加模块状态变量**

定位到现有 `const bgCloseBtn = document.getElementById('bgCloseBtn');` 一行（位于 `const bgFileInput = ...` 之后）。在该行之后插入：

```js
const bgList = document.getElementById('bgList');
const bgAddBtn = document.getElementById('bgAddBtn');
let bgImages = [];
let currentBgId = -1;
```

- [ ] **Step 2: 添加 renderBgList 与 pickRandomBg 函数**

定位到现有 `function applyBg(...) { ... }` 函数定义块。在该块**之后**插入：

```js
function renderBgList() {
    bgList.innerHTML = '';
    bgImages.forEach(img => {
        const li = document.createElement('li');
        li.className = 'bg-list-item';
        const nameSpan = document.createElement('span');
        nameSpan.className = 'bg-name';
        nameSpan.textContent = img.name;
        const delBtn = document.createElement('button');
        delBtn.className = 'bg-delete-btn';
        delBtn.textContent = '×';
        delBtn.title = '删除';
        delBtn.addEventListener('click', async () => {
            await deleteBg(img.id);
            bgImages = bgImages.filter(b => b.id !== img.id);
            if (bgImages.length === 0) {
                applyBg(null);
                currentBgId = -1;
            } else if (currentBgId === img.id) {
                pickRandomBg();
            }
            renderBgList();
        });
        li.appendChild(nameSpan);
        li.appendChild(delBtn);
        bgList.appendChild(li);
    });
}

function pickRandomBg() {
    if (bgImages.length === 0) return;
    let candidates = bgImages;
    if (bgImages.length > 1) {
        candidates = bgImages.filter(b => b.id !== currentBgId);
    }
    const picked = candidates[Math.floor(Math.random() * candidates.length)];
    currentBgId = picked.id;
    applyBg(picked.dataUrl);
}
```

- [ ] **Step 3: 替换文件选择与按钮事件**

定位到现有 `bgFileInput.addEventListener('change', () => { ... });` 整块（包含 showError/FileReader 等）。将整块替换为：

```js
bgAddBtn.addEventListener('click', () => bgFileInput.click());

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
            const rec = await addBg(reader.result);
            bgImages.push(rec);
            pickRandomBg();
            renderBgList();
            bgFileInput.value = '';
        } catch (err) {
            showError(`保存失败: ${err.message}`);
        }
    };
    reader.onerror = () => showError('读取文件失败');
    reader.readAsDataURL(file);
});
```

- [ ] **Step 4: 在 Ctrl+I 打开模态时刷新列表**

定位到现有 keydown 监听中的 Ctrl+I 分支：

```js
if (e.ctrlKey && !e.shiftKey && !e.altKey && e.code === 'KeyI') {
    e.preventDefault();
    bgModal.hidden = false;
}
```

替换为：

```js
if (e.ctrlKey && !e.shiftKey && !e.altKey && e.code === 'KeyI') {
    e.preventDefault();
    renderBgList();
    bgModal.hidden = false;
}
```

- [ ] **Step 5: 在 render() 末尾触发 pickRandomBg**

定位到 `function render() { ... }` 函数末尾（`speakCn();` 之后、闭合 `}` 之前）。在 `speakCn();` 之后追加：

```js
if (bgImages.length > 0) pickRandomBg();
```

- [ ] **Step 6: 替换启动恢复调用**

定位到 `populateVoices();\n    loadBg().then(applyBg);`（位于 script 末尾）。将 `loadBg().then(applyBg)` 替换为：

```js
loadAllBg().then(list => {
    bgImages = list;
    if (bgImages.length > 0) pickRandomBg();
});
```

- [ ] **Step 7: 提交**

```bash
git add cn2en-json.html
git commit -m "Wire bg image list with add/delete and random per-entry"
```

---

## Task 4: 端到端手动验证

**Files:**
- 无文件修改（仅验证）

- [ ] **Step 1: 全新状态基线**

DevTools → Application → IndexedDB → 删除 `cn2en-json-bg` 数据库。刷新页面。

预期：body 无背景。Ctrl+I 弹模态，列表为空，显示"暂无背景图片"占位。

- [ ] **Step 2: 添加第一张图**

Ctrl+I → 点击"选择图片" → 选 `pic1.png`。

预期：
- 列表显示 `image1`
- body 应用背景（pic1）
- 模态仍打开（设计如此：添加后不关闭）

- [ ] **Step 3: 添加第二、三张图**

再选 `pic2.png` → 列表 `[image1, image2]`，body 随机换一张。

再选 `pic3.png` → 列表 `[image1, image2, image3]`。

预期：每次添加后 body 背景切换到刚添加或随机一张。

- [ ] **Step 4: 关闭模态后再开启**

点击"关闭"或 ESC 或点击遮罩。

预期：模态关闭，背景保持。再 Ctrl+I → 列表仍显示 3 项。

- [ ] **Step 5: 切换 entry 触发随机换图**

粘贴 JSON。按 ArrowRight 多次。

预期：每次切句后背景切换（多张时），但不与前一张相同（连续两次不同）。

- [ ] **Step 6: 删除非当前背景图**

Ctrl+I → 删除 `image2`（非当前）。

预期：列表变 `[image1, image3]`，body 背景不变（仍是 image1 或 image3）。

- [ ] **Step 7: 删除当前背景图**

删除当前正在显示的那张。

预期：列表减少一项；body 立即随机换一张剩余图。

- [ ] **Step 8: 删除全部图片**

逐个删除直到列表为空。

预期：body 背景清除（无 `has-bg` class），`background-image: none`。

- [ ] **Step 9: 持久化跨刷新**

添加 2 张图，刷新。

预期：启动时 `loadAllBg` 恢复 2 张，随机选一张作为背景。

- [ ] **Step 10: 持久化命名稳定**

刷新前后 `image1` / `image2` 名字保持不变（基于 `count+1`，不随删除重排）。

---

## 收尾

所有任务完成后，`cn2en-json.html` 的背景功能从单张升级为多张列表：

- IndexedDB 用 autoincrement 存多条记录 `{id, name, dataUrl}`
- 模态显示列表，每行有删除按钮
- 底部"选择图片"按钮添加新图
- 多张时每次切换 entry 随机选一张作背景，避免与上次相同
- 启动时自动恢复并随机选一张
- 空列表时无背景