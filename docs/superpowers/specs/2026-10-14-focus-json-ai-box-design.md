# focus-json AI Box Design Specification

> 在 `focus-json.html` 左上角新增一个常驻 AI 输入框,用户输入问题,AI 按指定 SKILL 返回双语 JSON,响应直接走与 `Ctrl+V` 相同的 `loadJson` 路径加载(不复制粘贴、不模拟按键)。

## Goal

把"复制英文段落 → 打开页面 → 翻译为双语 JSON → 粘贴"这串手工流程压缩为:把英文段落粘到左上角 input,按 Enter,自动加载并开始读。AI 输出**严格按指定 SKILL 的双语 JSON 格式**,加载路径与现有 `Ctrl+V` 完全相同,无新分支。

## Visual Layout

```
┌─────────────────────────────────────────────────┐
│ ┌──────────────────────────────┐                │
│ │ 向 AI 提问… (Enter 发送)     │  ← aiInput     │
│ └──────────────────────────────┘                │
│  (错误时: 此处红字, 自动 5s 消失)                │
│                                                 │
│              [Ctrl+V 粘贴 JSON]                 │
│              [大卡片 EN / CN]                    │
│                                                 │
└─────────────────────────────────────────────────┘
```

- 左上角固定, `position: fixed; top: 16px; left: 16px`, 常驻不隐藏
- input 宽 360px, 复用深色主题色 (`#2c2c2c` 底 / `#444` 边 / `#e0e0e0` 字 / `#4fc3f7` 聚焦)
- `ai-box` 容器 `pointer-events: none`, input 本身 `pointer-events: auto` → 背后卡片仍可点

## HTML 新增 (插在 `<body>` 顶部, `<div class="controls">` 之前)

```html
<div class="ai-box">
    <input id="aiInput" class="ai-input" type="text" autocomplete="off"
           placeholder="向 AI 提问… (Enter 发送)">
    <div id="aiError" class="ai-error" hidden></div>
</div>
```

## CSS 新增

```css
.ai-box {
    position: fixed;
    top: 16px;
    left: 16px;
    z-index: 100;
    width: 360px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    pointer-events: none;
}
.ai-input {
    pointer-events: auto;
    background: rgba(37,37,37,0.9);
    border: 1px solid #444;
    color: #e0e0e0;
    padding: 8px 12px;
    font-size: 14px;
    font-family: inherit;
    border-radius: 6px;
    outline: none;
}
.ai-input:focus { border-color: #4fc3f7; }
.ai-input.ai-busy { opacity: 0.5; cursor: wait; }
.ai-error {
    pointer-events: auto;
    color: #ef5350;
    font-size: 12px;
    background: rgba(37,37,37,0.9);
    border: 1px solid #ef5350;
    padding: 6px 8px;
    border-radius: 4px;
    max-height: 120px;
    overflow-y: auto;
    white-space: pre-wrap;
    word-break: break-all;
}
```

## JS 常量新增 (与 `cn2en-json.html` 现有值完全一致)

```js
const AI_BASE_URL = 'https://next-reader-psi.vercel.app/api/minimax';
const AI_MODEL = 'MiniMax-M3';
const AI_MAX_TOKENS = 4096;
const AI_SYSTEM_PROMPT = `1. 以英文表达的顺序和内容为准,中文作为对应翻译,两者一一对应。
2. 最小切分单位:以分割意群的逗号 (,)、破折号 (— / ——)、分号 (;) 等作为最小 entry 单位切分;用于列举名词的逗号 (如 columns, create, list, detail, retry) 不切分,保留在同一 entry 内。
3. 中文必须与英文严格对应:英文 entry 中的每部分内容,中文翻译都必须完整对应,不得省略、漏译、合并或自行简化。
4. JSON 格式:
   - key 为英文原文片段,保留原文标点、大小写、代码标识符、路径、方法名等原样。
   - value 为对应的中文翻译。
   - 保持英文原文顺序。
5. 只返回 JSON,不要额外解释或包裹代码块以外的文字。`;
```

## JS 状态新增

```js
let isAiBusy = false;
let aiAbort = null;
let aiErrorTimer = null;
```

## JS 函数新增

### `askAi()`

```js
async function askAi() {
    if (isAiBusy) { aiAbort?.abort(); return; }
    const question = aiInput.value.trim();
    if (!question) return;
    isAiBusy = true;
    aiInput.classList.add('ai-busy');
    aiInput.placeholder = 'AI 思考中…';
    hideAiError();
    aiAbort = new AbortController();
    try {
        const res = await fetch(AI_BASE_URL, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: AI_MODEL,
                max_tokens: AI_MAX_TOKENS,
                stream: false,
                system: AI_SYSTEM_PROMPT,
                messages: [{ role: 'user', content: question }]
            }),
            signal: aiAbort.signal
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const text = data.content?.[0]?.text ?? '';
        if (!text) throw new Error('AI 返回为空');
        const json = extractFirstJsonBlock(text);
        if (!json) throw new Error('响应中找不到 JSON 块');
        loadJson(json);
    } catch (err) {
        if (err.name === 'AbortError') return;
        showAiError(err.message);
    } finally {
        isAiBusy = false;
        aiInput.classList.remove('ai-busy');
        aiInput.placeholder = '向 AI 提问… (Enter 发送)';
        aiAbort = null;
    }
}
```

### `extractFirstJsonBlock(text)`

```js
function extractFirstJsonBlock(text) {
    const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fence) return fence[1].trim();
    const start = text.indexOf('{');
    if (start < 0) return null;
    let depth = 0, inStr = false, esc = false;
    for (let i = start; i < text.length; i++) {
        const c = text[i];
        if (inStr) {
            if (esc) esc = false;
            else if (c === '\\') esc = true;
            else if (c === '"') inStr = false;
        } else {
            if (c === '"') inStr = true;
            else if (c === '{') depth++;
            else if (c === '}') { depth--; if (depth === 0) return text.slice(start, i + 1); }
        }
    }
    return null;
}
```

### `showAiError(msg)` / `hideAiError()`

```js
function showAiError(msg) {
    aiError.textContent = msg;
    aiError.hidden = false;
    clearTimeout(aiErrorTimer);
    aiErrorTimer = setTimeout(hideAiError, 5000);
}
function hideAiError() {
    aiError.hidden = true;
    aiError.textContent = '';
    clearTimeout(aiErrorTimer);
}
```

## JS 接线

```js
const aiInput = document.getElementById('aiInput');
const aiError = document.getElementById('aiError');

aiInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); askAi(); }
    else if (e.key === 'Escape') { e.preventDefault(); aiInput.value = ''; }
});
aiInput.addEventListener('input', hideAiError);
```

**不复用 `loadJson` 之外的任何代码**: `Ctrl+V` 走原 `paste` handler → `loadJson`, AI 走 `askAi` → `loadJson`,两条路汇合。

## Data Flow

```
Enter 触发 askAi()
    ↓
fetch POST AI_BASE_URL  (stream: false, system: AI_SYSTEM_PROMPT)
    ↓
data.content[0].text
    ↓
extractFirstJsonBlock  (剥 ```json 包装 / 找第一个 {…} 块)
    ↓
loadJson(jsonString)   (与 Ctrl+V 完全相同的入口)
    ↓
parseJson + render     (现有逻辑,不动)
```

## Keyboard

| 按键 (input 聚焦时) | 行为 |
|---|---|
| `Enter` | 发送;若已在请求中,触发 `AbortController.abort()` 终止 |
| `Escape` | 清空 input(不取消进行中的请求) |
| `Ctrl+V` | 仍走原 paste handler,行为不变 |

> **关于 input 不设 `disabled`:** 设了 `disabled` 后 keydown 不会触发, abort 用的 Enter 按键会失效。 因此请求中只切 `.ai-busy` 类降透明度 + 改 placeholder, 保持 input 可交互, 让 Enter 终止逻辑可触达。 `isAiBusy` 守卫防止"请求中再发新问题"误触发。

## Error Handling

| 场景 | aiError 文案 | 页面行为 |
|---|---|---|
| fetch reject (网络) | `网络错误: {message}` | 不变 |
| HTTP 4xx/5xx | `HTTP {status}` | 不变 |
| `data.content[0].text` 空 | `AI 返回为空` | 不变 |
| 无 `{...}` 块 | `响应中找不到 JSON 块` | 不变 |
| `JSON.parse` 失败 | `JSON 解析失败: {message}` | 不变 |
| `loadJson` 内部 `parseJson` 报错 | (不显 aiError) | 走 `loadJson` 原 `showError` 路径,中央红字 |
| 用户 abort | (不显) | input 立即恢复 |

**aiError 自动消失:** 5 秒 `setTimeout`;用户开始在 `aiInput` 输入时立即清除。
**Abort 不当错误:** `catch (err)` 中 `if (err.name === 'AbortError') return;` 早返。

## Out of Scope

- 多模型/provider 切换
- 流式响应(SSE)显示
- 自定义系统提示词(本版硬编码,未来可加设置面板)
- API key 配置(沿用现有 `next-reader-psi.vercel.app` 代理)
- 多轮对话历史(单次问答,无记忆)
- aiBox 折叠/隐藏(常驻,后续可加 Alt+字母 切换)
- aiBox 拖动/位置调整

## Files

- **Modify**: `focus-json.html` (单文件,所有 CSS/JS 内联,预计 +120-150 行)
- **No new files**

## Testing Strategy

手工验证 (浏览器 DevTools + 实际操作):

**a. 基础通路**
- 打开页面,左上角 input 出现,聚焦可见蓝色描边
- 输入一段英文 → Enter
- input 变灰 + placeholder 变 "AI 思考中…"
- 几秒后页面整体被替换为新内容(AI 返回的 JSON 直接渲染成卡片)
- 无红字错误,input 重新可输入

**b. AI 返回非纯 JSON 时的容错**
- AI 返回 `` ```json\n{...}\n``` `` → 仍正确抽取并加载
- AI 返回 `"好的, 这是翻译: {\"a\":1}"` → 抽取第一个 `{...}` 块成功加载
- AI 返回 `"翻译失败, 请稍后再试"`(无 JSON)→ aiError 显示 "响应中找不到 JSON 块",5s 后消失,页面不变
- AI 返回 `{"a": }`(语法错)→ aiError 显示 "JSON 解析失败: …",页面不变

**c. 终止**
- 请求中按 Enter → input 立即恢复,不弹错,页面不变
- 请求中按 Esc → input 内容清空(请求继续)

**d. 现有功能回归**
- `Ctrl+V` 粘贴有效 JSON → 走原 paste 流程,正常加载
- `Ctrl+V` 粘贴无效 JSON → 显示页面中央错误(原行为),aiError 不弹
- 方向键 / 空格 / 复制按钮 / Alt+H 切控件 / 背景图 / TTS / 高亮 全部不变
- DevTools Network: 可见 `POST .../api/minimax` 请求,请求体含 `stream: false`,响应一次性

**e. 边缘**
- 空 input 按 Enter → 啥也不发生
- 长问题(>500 字)→ input 不溢出,正常发送
- 中文问题 → 正常发,正常返回中文 value
