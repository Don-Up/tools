# ai.html Keyword Presets Design

> 在已有 `2026-10-13-ai-html-redesign-design.md` 之上扩展。复用现有会话/IDB 骨架,加 3 套提示词模板。

## Goal

每个对话顶部放 3 个一键触发的提示词模板按钮,点击后自动发送 `模板内容 + 用户输入`。默认 3 套(翻译/总结/解释)全局共享,每对话可独立编辑。

## Visual Layout

```
┌──────────────────────────────────────────────┐
│ ○ 翻译   ○ 总结   ○ 解释            [⚙ 编辑] │  <- 关键词栏(单选按钮组)
├──────────────────────────────────────────────┤
│                                              │
│  messages area                               │
│                                              │
```

放在 `convHeader` 之下,`#messages` 之上。整行 flex 布局,3 个 radio + 标签靠左,编辑按钮靠右。点击已选中的 radio 可以取消选择。

## Data Model

### 全局默认值(IDB `settings` store)

新 key: `defaultKeywordPresets`

```js
const DEFAULT_KEYWORD_PRESETS = [
    { id: 'k1', name: '翻译', content: '请将以下内容翻译成英文:\n' },
    { id: 'k2', name: '总结', content: '请用一段话总结以下内容的要点:\n' },
    { id: 'k3', name: '解释', content: '请解释以下内容的含义:\n' },
];
```

### 会话覆盖(`conversations` store)

会话对象新增字段:

```js
{
    ...existing fields,
    keywordPresets: [
        { id, name, content },  // 长度恒为 3
    ],
}
```

- 新建会话时:从 `settings.defaultKeywordPresets` 复制;若不存在,用 `DEFAULT_KEYWORD_PRESETS` 兜底
- 字段恒为长度 3 的数组(id 保持 `k1/k2/k3`)

## UI Components

### 关键词栏(新)

- 容器:`<div id="keywordBar" class="keyword-bar">`
- 3 个 radio + label:`<label class="keyword-radio"><input type="radio" name="kwPreset" value="k1"><span>翻译</span></label>` 等
- 选中态通过 `input:checked + span` 高亮(`#4fc3f7` 背景 + 深色文字)
- 编辑按钮:`<button id="keywordEditBtn" class="btn secondary icon-only" title="编辑关键词">⚙ 编辑</button>`
- 空态:无 keywordPresets(老数据)→ 显示"加载默认"或直接用代码默认值

### 关键词编辑模态(新)

```
┌────────────────────────────────────┐
│ 编辑关键词                  [×]    │
├────────────────────────────────────┤
│ 名称 1: [翻译]                     │
│ 内容 1:                            │
│ ┌──────────────────────────────┐   │
│ │ 请将以下内容翻译成英文:        │   │
│ │                              │   │
│ └──────────────────────────────┘   │
│ 名称 2: [总结]                     │
│ 内容 2: [...]                      │
│ 名称 3: [解释]                     │
│ 内容 3: [...]                      │
│                                    │
│ [恢复默认]            [保存] [取消] │
└────────────────────────────────────┘
```

- 恢复默认:用 `DEFAULT_KEYWORD_PRESETS` 覆盖表单
- 保存:写入当前对话的 `keywordPresets`,IDB 持久化,刷新栏
- 取消:关闭模态

## Behavior

### 选中 radio + 点击发送

```js
async function send() {
    const rawQuestion = dom.questionInput.value.trim();
    if (!rawQuestion) return;
    const selectedPreset = getSelectedPreset();
    const presetSuffix = selectedPreset
        ? `\n${(selectedPreset.content || '').replace(/\n+$/, '')}`
        : '';
    const question = rawQuestion + presetSuffix;
    // ... rest of send flow unchanged
}
```

- radio 是**常驻选择**:选中后持续生效,直到用户切换或取消
- 切换到另一个 radio:旧 radio 自动取消(浏览器原生 radio 行为)
- 点击已选中的 radio:取消选择(自定义 JS 处理)
- 发送时:`send()` 读取当前选中的 preset,将其 content 拼到用户输入前面(`\n` 分隔),让 AI 先读到指令/约束再读问题
- 没有选中:不拼接,正常发送原始输入
- 流式进行中:radios disabled(不响应点击)
- 切换会话:radio 选择状态保留(全局 UI 模式,不跟 conv 走)

### 流式时按钮状态

在 `setSendButtonState(streaming)` 内更新 radio disabled:

```js
function setSendButtonState(streaming) {
    state.isStreaming = streaming;
    dom.sendBtn.textContent = streaming ? '停止' : '发送';
    dom.sendBtn.classList.toggle('secondary', streaming);
    dom.questionInput.disabled = streaming;
    document.querySelectorAll('.keyword-radio input, #keywordEditBtn').forEach(b => {
        b.disabled = streaming;
    });
}
```

### 编辑模态

```js
function openKeywordModal() {
    const conv = currentConv;
    if (!conv) return;
    // populate 3 inputs from conv.keywordPresets
    // fallback to DEFAULT_KEYWORD_PRESETS if conv.keywordPresets missing/short
}
async function saveKeywordPresets() {
    const conv = currentConv;
    conv.keywordPresets = [readInput(0), readInput(1), readInput(2)].filter(Boolean);
    // ensure length 3 by padding with defaults
    while (conv.keywordPresets.length < 3) {
        conv.keywordPresets.push(DEFAULT_KEYWORD_PRESETS[conv.keywordPresets.length]);
    }
    await convPut(conv);
    renderKeywordBar();
    closeKeywordModal();
}
function resetKeywordPresets() {
    // populate form with DEFAULT_KEYWORD_PRESETS (don't save yet)
}
```

## Streaming & Persistence

- 点击关键词走 `send()`,不绕过
- 关键词栏是只读 UI(除编辑模态外)
- 切换会话:`renderKeywordBar()` 重新渲染栏,显示当前 conv 的 presets

## Edge Cases

1. **老数据无 keywordPresets 字段** → 渲染时兜底用 `DEFAULT_KEYWORD_PRESETS`,并就地写入 conv
2. **IDB 不可用** → conv.keywordPresets 仍存内存,刷新丢失(可接受)
3. **编辑时 name 为空** → 显示时用 "关键词 N" 占位
4. **content 为空** → 点击等同于发用户输入(无前缀)
5. **流式中断后再点** → send() 检测到上一个流残留时会 abort,正常工作
6. **不同 conv 编辑后切换** → 每个 conv 独立保存,切换后栏刷新

## Out of Scope

- 增/删预设(固定 3 个)
- 拖拽排序
- 跨 conv 复用已编辑的预设(只能恢复默认)
- 模板 import/export
- 模板中插入变量(占位符)
- 多套默认(目前只有 1 套全局默认)

## Files

- **Modify**: `ai.html`(单文件)
- 预计 +150-200 行(HTML + CSS + JS)

## Testing Strategy

手动浏览器测试:

1. **首次启动**:默认看到 3 套预设(翻译/总结/解释)
2. **点击翻译**:输入"你好" → 消息 = "请将以下内容翻译成英文:\n你好"
3. **输入空 + 点击**:只发模板(去掉末尾换行)
4. **编辑模态**:修改第 2 项为"代码审查",内容"请审查以下代码:\n",保存 → 栏刷新
5. **切换会话**:新 conv 显示默认 3 套,旧 conv 显示已编辑的 3 套
6. **恢复默认**:在编辑模态点 → 3 项回到 翻译/总结/解释
7. **流式进行中**:按钮变灰,不可点
8. **刷新页面**:已编辑的预设仍在
