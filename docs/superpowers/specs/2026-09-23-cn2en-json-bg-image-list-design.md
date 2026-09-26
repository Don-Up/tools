# cn2en-json Background Image List Design Specification

## Overview

将背景图片对话框从单条记录改为列表管理：显示所有已存图片（默认名 `image1/image2/...`），每行右侧删除按钮；底部"选择图片"按钮添加新图；多张图片时每次切换 entry 随机选一张作背景，避免与上次相同。

## Layout Structure

替换原 `#bgModal` 内层结构：

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
</div>
```

每条 `<li>` 结构：

```html
<li class="bg-list-item">
    <span class="bg-name">image1</span>
    <button class="bg-delete-btn">×</button>
</li>
```

## Visual Design

新增 CSS：

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

## Functionality

### IndexedDB schema 变更

```js
const STORE = 'images';
// object store keyPath: 'id', autoIncrement: true
// record: { id: <number>, name: 'image1', dataUrl: 'data:...' }
```

升级在 `onupgradeneeded`：

```js
if (!db.objectStoreNames.contains(STORE)) {
    db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
}
```

DB 版本提升到 2。

### DB helpers

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

### 模块状态

```js
let bgImages = [];   // 同步缓存 [{id, name, dataUrl}]
let currentBgId = -1; // 当前应用的图片 id；-1 表示无背景
```

### 启动恢复

```js
bgImages = await loadAllBg();
if (bgImages.length > 0) {
    pickRandomBg();
}
```

### 模态渲染

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
```

### 随机选图

```js
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

- 单张时直接选那张
- 多张时排除上次的那张再随机（避免连续相同）

### render() 末尾触发

在 `render()` 函数体末尾追加：

```js
if (bgImages.length > 0) pickRandomBg();
```

- 切条目时随机换背景
- 初始 render（paste 后）也触发换一次

### applyBg 行为不变

仍按 `body.has-bg` + `backgroundImage` 切换，逻辑不变。

### 文件选择

保留原 `#bgFileInput`（隐藏 input）。`#bgAddBtn` click → `bgFileInput.click()`：

```js
bgAddBtn.addEventListener('click', () => bgFileInput.click());
```

`bgFileInput.change`：

```js
bgFileInput.addEventListener('change', async () => {
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

### 模态打开时刷新列表

```js
bgModal.addEventListener('show', renderBgList); // 自定义事件或直接挂到 bgFileInput change 后
```

实际方案：直接在 `Ctrl+I` keydown 处理中加 `renderBgList()`，并在每次 add/delete 后调用。

### 关闭按钮、ESC、backdrop

沿用现有关闭逻辑（关闭模态但保留背景）。

## 行为矩阵

| 操作 | 结果 |
|------|------|
| 启动（无图） | 无背景，模态列表为空 |
| 启动（有图） | 随机选一张作为背景 |
| Ctrl+I（空列表） | 显示"暂无背景图片"占位 |
| Ctrl+I（有列表） | 显示当前所有图片 |
| 点击"选择图片" | 打开系统文件选择对话框 |
| 选择图片 | 添加为 `image<N+1>`，随机应用到背景，列表刷新 |
| 点击删除按钮 | 从 IndexedDB 删除，列表刷新；若删除的是当前背景，随机换一张；删除后空列表则清除背景 |
| 切换 entry（多张） | 随机选一张（避免与上次相同） |
| 切换 entry（单张） | 仍选那张（不变化） |
| ESC / 关闭 / 点遮罩 | 关闭模态，背景保持 |

## State

新增模块变量：
- `bgImages: Array<{id, name, dataUrl}>`
- `currentBgId: number`（默认 -1）

## Error Handling

| 情况 | 行为 |
|------|------|
| 文件非 image/* | 顶部错误条 "请选择图片文件" |
| FileReader 失败 | 错误条 "读取文件失败" |
| IndexedDB 写入失败 | 错误条 "保存失败: ..." |
| IndexedDB 删除失败 | 静默忽略 |
| 启动读 DB 失败 | bgImages=[]，无背景 |

## File

- Modify: `cn2en-json.html`：
  - `#bgModal` 内层 DOM 替换为 list + add/close
  - 新增 `.bg-list*` CSS
  - `DB_VERSION` 升到 2，onupgradeneeded 创建 autoincrement store
  - `loadBg`/`saveBg`/`clearBg` 替换为 `loadAllBg`/`addBg`/`deleteBg`
  - 模块变量 `bgImages`/`currentBgId`
  - `pickRandomBg` 与 `renderBgList` 函数
  - `bgAddBtn` click 触发隐藏 input
  - `bgFileInput` change 改用 addBg + pickRandomBg + renderBgList
  - 模态打开时调用 `renderBgList`
  - 删除按钮事件（动态绑定）
  - `render()` 末尾触发 `pickRandomBg`
  - 启动时 `loadAllBg` + 选一张（如有）

## Out of Scope

- 重命名
- 拖拽排序
- 远程 URL 图片
- 批量删除 UI
- 每张图片单独预览缩略图（仅显示名称）