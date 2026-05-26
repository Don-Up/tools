# Anki PUML 流程图模板设计

## 1. 概述

一个 Anki 卡片模板，使用自定义渲染器将 PUML 格式流程图渲染到 Front 中，并将 `~~~` 包裹的文字转换为 input 输入框（placeholder 展示原文字）。

**输入示例：**
```
start
:登录系统~username~~;
if(验证成功?) then
:显示~仪表盘~~;
else
:显示~错误信息~~;
endif
stop
```

**预期输出：**
- 流程图 SVG（start → 登录系统 [input:username] → 判断分支 → 显示仪表盘/错误信息 → stop）
- input placeholder 为原文字

---

## 2. 渲染器设计

### 2.1 支持的 PUML 语法（流程图常用子集）

| 语法 | 含义 |
|------|------|
| `start` | 开始节点 |
| `stop` | 结束节点 |
| `:文本~placeholder~~;` | 处理步骤，`~` 内为 input placeholder |
| `if(条件?) then` | 判断入口 |
| `:分支文本~placeholder~~;` | 分支处理步骤 |
| `else` | else 分支标记 |
| `endif` | 判断结束 |
| `->` | 连接线（可选） |

### 2.2 解析流程

```
PUML 文本
    ↓
Tokenizing（正则分词）
    ↓
AST 构建（节点树）
    ↓
SVG 生成（计算布局）
    ↓
DOM 渲染 + input 替换
```

### 2.3 AST 节点类型

```js
{ type: 'start' }
{ type: 'stop' }
{ type: 'action', label: '登录系统', placeholder: 'username' }
{ type: 'if', condition: '验证成功?', thenBlock: [...], elseBlock: [...] }
```

### 2.4 SVG 布局算法

- 节点按出现顺序纵向排列
- 每个节点高度固定（50px），宽度自适应文字
- 判断节点后，两个分支并列，endif 节点居中
- 箭头：直线 + 实心三角

---

## 3. 输入框替换

### 3.1 规则

- 匹配 `:文本~占位符~~;`
- 渲染时，将 `~占位符~` 部分替换为 `<input placeholder="占位符">`
- 原始 label 正常显示在节点内

### 3.2 样式

- input 与节点文字同行内显示
- 浅色边框，透明背景
- focus 时边框高亮

---

## 4. 模板结构

```html
<div id="source-text">{{Front}}</div>

<style>
/* 自定义样式 */
</style>

<script>
/* PUML 解析 + 渲染逻辑 */
</script>
```

---

## 5. 测试用例

### 5.1 基础流程
```
start
:登录系统~username~~;
if(验证成功?) then
:显示~仪表盘~~;
else
:显示~错误信息~~;
endif
stop
```

### 5.2 无 placeholder
```
start
:简单步骤;
stop
```

### 5.3 多层判断
```
start
:步骤A;
if(A?) then
:步骤B;
else
if(C?) then
:步骤D;
else
:步骤E;
endif
endif
stop
```

---

## 6. 验收标准

1. PUML 文本正确渲染为流程图 SVG
2. `~~~` 包裹的文字正确转换为 input，placeholder 为包裹内容
3. 多分支判断正确并列显示
4. Anki 卡片可正常翻转查看