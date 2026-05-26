# Anki PUML 流程图模板实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 创建一个 Anki 卡片模板，自定义渲染器将 PUML 流程图渲染到 Front，并将 `~~~` 包裹文字转换为 input

**Architecture:** 纯前端 HTML 模板，包含 tokenizer/parser → SVG 生成器 → DOM 渲染。PUML 文本解析为 AST，AST 转为 SVG 布局，input 在 SVG foreignObject 或单独处理

**Tech Stack:** 纯 HTML/CSS/JS，无需外部依赖

---

## 文件结构

- Create: `puml-flowcard.html` — 完整的 Anki 模板文件

---

### Task 1: 创建 HTML 模板基础结构

**Files:**
- Create: `puml-flowcard.html`

- [ ] **Step 1: 创建基础 HTML 结构**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PUML Flowcard</title>
    <style>
        #source-text { display: none; }
        #flowchart-container {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #fefefe;
            padding: 20px;
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: flex-start;
        }
        .flowchart { overflow-x: auto; }
        .node-label { font-size: 14px; fill: #333; }
        .node-input {
            border: 1px solid #ccc;
            border-radius: 4px;
            padding: 4px 8px;
            font-size: 12px;
            width: 120px;
            background: #fff;
        }
        .node-input:focus { border-color: #3a86ff; outline: none; }
        .arrow-line { stroke: #666; stroke-width: 2; fill: none; marker-end: url(#arrowhead); }
        .branch-box { fill: #f5f5f5; stroke: #999; stroke-width: 1; }
    </style>
</head>
<body>
    <div id="source-text">{{Front}}</div>
    <div id="flowchart-container">
        <div id="flowchart" class="flowchart"></div>
    </div>
    <script>
    // 完整 JS 代码将在 Task 2-5 中实现
    </script>
</body>
</html>
```

- [ ] **Step 2: 验证文件创建**

Run: `ls -la puml-flowcard.html`

- [ ] **Step 3: 提交**

```bash
git add puml-flowcard.html
git commit -m "feat: scaffold puml-flowcard.html template"
```

---

### Task 2: 实现 Tokenizer（正则分词）

**Files:**
- Modify: `puml-flowcard.html` — 添加 tokenizer 函数

- [ ] **Step 1: 添加 tokenizer 函数**

```javascript
function tokenize(puml) {
    const tokens = [];
    const lines = puml.split('\n');
    let i = 0;
    while (i < lines.length) {
        const line = lines[i].trim();
        if (!line || line.startsWith("'") || line.startsWith("/")) {
            i++;
            continue;
        }
        if (line === "start") {
            tokens.push({ type: "START" });
            i++;
        } else if (line === "stop") {
            tokens.push({ type: "STOP" });
            i++;
        } else if (line.startsWith("if(")) {
            const match = line.match(/^if\((.+?)\)\s*then$/);
            if (match) {
                tokens.push({ type: "IF", condition: match[1] });
                i++;
                // 收集 then 分支内容
                const thenActions = [];
                while (i < lines.length && !lines[i].includes("else") && !lines[i].includes("endif")) {
                    const a = lines[i].trim();
                    if (a && !a.startsWith("'") && !a.startsWith("/")) {
                        if (a.startsWith(":")) thenActions.push(a);
                    }
                    i++;
                }
                tokens.push({ type: "THEN_ACTIONS", actions: thenActions });
                // else 分支
                if (i < lines.length && lines[i].includes("else")) {
                    tokens.push({ type: "ELSE" });
                    i++;
                    const elseActions = [];
                    while (i < lines.length && !lines[i].includes("endif")) {
                        const a = lines[i].trim();
                        if (a && !a.startsWith("'") && !a.startsWith("/")) {
                            if (a.startsWith(":")) elseActions.push(a);
                        }
                        i++;
                    }
                    tokens.push({ type: "ELSE_ACTIONS", actions: elseActions });
                }
                if (i < lines.length && lines[i].includes("endif")) {
                    tokens.push({ type: "ENDIF" });
                    i++;
                }
            }
        } else if (line.startsWith(":")) {
            tokens.push({ type: "ACTION", raw: line });
            i++;
        } else {
            i++;
        }
    }
    return tokens;
}
```

- [ ] **Step 2: 添加 parsePlaceholder 辅助函数**

```javascript
function parseAction(raw) {
    // :文本~placeholder~~; → { label: '文本', placeholder: 'placeholder' }
    const match = raw.match(/^:\s*(.+?)~([^~]+)~~;?$/);
    if (match) {
        return { label: match[1].trim(), placeholder: match[2].trim() };
    }
    // 无 placeholder
    const simple = raw.match(/^:\s*(.+?)\s*;?$/);
    if (simple) {
        return { label: simple[1].trim(), placeholder: null };
    }
    return { label: raw, placeholder: null };
}
```

- [ ] **Step 3: 提交**

```bash
git add puml-flowcard.html
git commit -m "feat: implement tokenizer and parseAction"
```

---

### Task 3: 实现 AST 构建器

**Files:**
- Modify: `puml-flowcard.html` — 添加 buildAST 函数

- [ ] **Step 1: 添加 buildAST 函数**

```javascript
function buildAST(tokens) {
    const ast = [];
    let i = 0;
    while (i < tokens.length) {
        const t = tokens[i];
        if (t.type === "START") {
            ast.push({ type: "start" });
            i++;
        } else if (t.type === "STOP") {
            ast.push({ type: "stop" });
            i++;
        } else if (t.type === "IF") {
            const ifNode = { type: "if", condition: t.condition, thenBlock: [], elseBlock: [] };
            i++;
            // 收集 then actions
            while (i < tokens.length && tokens[i].type === "THEN_ACTIONS") {
                tokens[i].actions.forEach(a => ifNode.thenBlock.push(parseAction(a)));
                i++;
            }
            // 收集 else actions
            if (i < tokens.length && tokens[i].type === "ELSE") {
                i++;
                while (i < tokens.length && tokens[i].type === "ELSE_ACTIONS") {
                    tokens[i].actions.forEach(a => ifNode.elseBlock.push(parseAction(a)));
                    i++;
                }
            }
            // 跳过 ENDIF
            if (i < tokens.length && tokens[i].type === "ENDIF") {
                i++;
            }
            ast.push(ifNode);
        } else if (t.type === "ACTION") {
            ast.push({ type: "action", ...parseAction(t.raw) });
            i++;
        } else {
            i++;
        }
    }
    return ast;
}
```

- [ ] **Step 2: 提交**

```bash
git add puml-flowcard.html
git commit -m "feat: implement buildAST"
```

---

### Task 4: 实现 SVG 布局生成器

**Files:**
- Modify: `puml-flowcard.html` — 添加 layoutFlowchart 和 renderFlowchart 函数

- [ ] **Step 1: 添加 layoutFlowchart 函数**

```javascript
function layoutFlowchart(ast) {
    const NODE_W = 180;
    const NODE_H = 60;
    const GAP_Y = 50;
    const GAP_X = 40;
    let y = 20;
    const nodes = [];
    ast.forEach((node, idx) => {
        if (node.type === "start" || node.type === "stop") {
            nodes.push({ ...node, x: 300, y, w: NODE_W, h: NODE_H, id: idx });
            y += NODE_H + GAP_Y;
        } else if (node.type === "action") {
            const w = Math.max(NODE_W, node.label.length * 10 + 80);
            nodes.push({ ...node, x: 300, y, w, h: NODE_H, id: idx });
            y += NODE_H + GAP_Y;
        } else if (node.type === "if") {
            // 判断节点
            const ifNode = { type: "if", condition: node.condition, x: 300, y, w: NODE_W, h: NODE_H, id: idx };
            nodes.push(ifNode);
            y += NODE_H + GAP_Y;
            // then 分支
            const thenMaxW = node.thenBlock.reduce((m, a) => Math.max(m, a.label.length * 10 + 80), NODE_W);
            const elseMaxW = node.elseBlock.reduce((m, a) => Math.max(m, a.label.length * 10 + 80), NODE_W);
            const totalW = thenMaxW + elseMaxW + GAP_X;
            const startX = 300 + NODE_W / 2 - totalW / 2;
            node.thenBlock.forEach((a, ai) => {
                nodes.push({ ...a, type: "action", x: startX + thenMaxW / 2, y, w: thenMaxW, h: NODE_H, id: idx + "_then_" + ai, branch: "then" });
            });
            y += NODE_H + GAP_Y / 2;
            node.elseBlock.forEach((a, ai) => {
                nodes.push({ ...a, type: "action", x: startX + thenMaxW + GAP_X + elseMaxW / 2, y: nodes[nodes.length - 1].y || y - NODE_H - GAP_Y / 2, w: elseMaxW, h: NODE_H, id: idx + "_else_" + ai, branch: "else" });
            });
            y += NODE_H + GAP_Y;
        }
    });
    return nodes;
}
```

- [ ] **Step 2: 添加 renderFlowchart 函数**

```javascript
function renderFlowchart(ast) {
    const nodes = layoutFlowchart(ast);
    const svgW = 700, svgH = nodes.length * 110 + 40;
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}">`;
    svg += `<defs><marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#666"/></marker></defs>`;
    let prevY = null, prevX = null;
    const NODE_W = 180, NODE_H = 60;
    nodes.forEach((n, i) => {
        if (n.type === "start") {
            svg += `<ellipse cx="${n.x}" cy="${n.y + NODE_H / 2}" rx="${NODE_W / 2}" ry="${NODE_H / 2 - 4}" fill="#4caf50" stroke="#2e7d32" stroke-width="2"/>`;
            svg += `<text x="${n.x}" y="${n.y + NODE_H / 2 + 5}" text-anchor="middle" class="node-label" fill="white" font-weight="bold">START</text>`;
            if (prevY !== null) {
                svg += `<line x1="${prevX}" y1="${prevY}" x2="${n.x}" y2="${n.y}" class="arrow-line"/>`;
            }
            [prevX, prevY] = [n.x, n.y + NODE_H];
        } else if (n.type === "stop") {
            svg += `<ellipse cx="${n.x}" cy="${n.y + NODE_H / 2}" rx="${NODE_W / 2}" ry="${NODE_H / 2 - 4}" fill="#f44336" stroke="#c62828" stroke-width="2"/>`;
            svg += `<text x="${n.x}" y="${n.y + NODE_H / 2 + 5}" text-anchor="middle" class="node-label" fill="white" font-weight="bold">STOP</text>`;
            if (prevY !== null) {
                svg += `<line x1="${prevX}" y1="${prevY}" x2="${n.x}" y2="${n.y}" class="arrow-line"/>`;
            }
            [prevX, prevY] = [n.x, n.y + NODE_H];
        } else if (n.type === "if") {
            const condText = n.condition.length > 15 ? n.condition.substring(0, 12) + "..." : n.condition;
            svg += `<polygon points="${n.x - NODE_W/2},${n.y} ${n.x + NODE_W/2},${n.y} ${n.x + NODE_W/2},${n.y + NODE_H} ${n.x - NODE_W/2},${n.y + NODE_H}" class="branch-box"/>`;
            svg += `<text x="${n.x}" y="${n.y + 22}" text-anchor="middle" class="node-label" font-weight="bold">${condText}</text>`;
            svg += `<text x="${n.x}" y="${n.y + 38}" text-anchor="middle" class="node-label" font-size="11">是</text>`;
            svg += `<line x1="${n.x + NODE_W/2}" y1="${n.y + NODE_H/3}" x2="${n.x + NODE_W/2 + 20}" y2="${n.y + NODE_H/3}" class="arrow-line"/>`;
            svg += `<text x="${n.x + NODE_W/2 + 22}" y="${n.y + NODE_H/3 + 4}" class="node-label" font-size="10">是</text>`;
            if (prevY !== null) {
                svg += `<line x1="${prevX}" y1="${prevY}" x2="${n.x}" y2="${n.y}" class="arrow-line"/>`;
            }
            [prevX, prevY] = [n.x, n.y + NODE_H];
        } else if (n.type === "action") {
            svg += `<rect x="${n.x - n.w/2}" y="${n.y}" width="${n.w}" height="${n.h}" rx="8" fill="#fff" stroke="#3a86ff" stroke-width="2"/>`;
            const labelText = n.label.length > 14 ? n.label.substring(0, 11) + "..." : n.label;
            svg += `<text x="${n.x}" y="${n.y + 20}" text-anchor="middle" class="node-label">${labelText}</text>`;
            if (n.placeholder) {
                const inputW = Math.min(140, n.placeholder.length * 8 + 20);
                svg += `<foreignObject x="${n.x - inputW/2}" y="${n.y + 28}" width="${inputW}" height="26">`;
                svg += `<input xmlns="http://www.w3.org/1999/xhtml" class="node-input" placeholder="${n.placeholder}" style="width:100%;box-sizing:border-box;"/>`;
                svg += `</foreignObject>`;
            }
            if (prevY !== null) {
                svg += `<line x1="${prevX}" y1="${prevY}" x2="${n.x}" y2="${n.y}" class="arrow-line"/>`;
            }
            [prevX, prevY] = [n.x, n.y + NODE_H];
        }
    });
    svg += `</svg>`;
    return svg;
}
```

- [ ] **Step 3: 提交**

```bash
git add puml-flowcard.html
git commit -m "feat: implement SVG layout and render"
```

---

### Task 5: 集成主函数并测试

**Files:**
- Modify: `puml-flowcard.html` — 添加 main 函数和 DOMContentLoaded 初始化

- [ ] **Step 1: 添加 main 渲染逻辑**

```javascript
function main() {
    const sourceEl = document.getElementById('source-text');
    const puml = sourceEl ? sourceEl.textContent.trim() : '';
    if (!puml) return;
    const tokens = tokenize(puml);
    const ast = buildAST(tokens);
    const svg = renderFlowchart(ast);
    const container = document.getElementById('flowchart');
    if (container) container.innerHTML = svg;
}

document.addEventListener('DOMContentLoaded', main);
```

- [ ] **Step 2: 测试验证 — 创建测试 HTML**

创建临时测试文件，引入 puml-flowcard.html 的 script 部分，传入测试 PUML，验证输出。

Run: 浏览器打开测试文件或用简单 Node.js 脚本验证。

- [ ] **Step 3: 提交**

```bash
git add puml-flowcard.html
git commit -m "feat: integrate main render function"
```

---

## 验收检查

- [ ] `puml-flowcard.html` 存在且语法正确
- [ ] `start` / `stop` 节点正确渲染为绿色/红色椭圆
- [ ] `:文本~占位符~~;` 正确转换为带 input 的节点
- [ ] `if-else-endif` 分支正确并列显示
- [ ] 无外部依赖，纯离线可用