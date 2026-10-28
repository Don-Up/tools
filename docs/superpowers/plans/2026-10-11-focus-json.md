# focus-json.html Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a single-file dark-theme HTML page that parses pasted `{"en": "cn"}` JSON and walks through entries one at a time with arrow-key navigation, mirroring `focus-text.html`.

**Architecture:** One new file `focus-json.html` at repo root. Vanilla JS, no dependencies. Paste → `JSON.parse` → `Object.entries` → `[{en, cn}]` array. Card-centered render with EN-on-top / CN-on-bottom layout. Arrow keys (Left/Right/Up/Down) navigate, no wrap. No localStorage. No settings panel.

**Tech Stack:** HTML + CSS + vanilla JS. No build, no bundler, no external libraries.

---

### File Structure

- **Create**: `focus-json.html` (single file, ~150 lines total, self-contained)
  - `<style>` block: dark-theme CSS matching focus-text.html
  - `<body>`: empty `.stage` div + `<script>` block
  - `<script>` block: state, `parseJson`, `loadJson`, `render`, paste + keydown listeners

No other files are touched. No dependencies on existing repo files (focus-text.html is a reference, not imported).

---

### Task 1: Scaffold HTML + CSS

**Files:**
- Create: `focus-json.html`

- [ ] **Step 1: Create `focus-json.html` with head, body shell, and full CSS — no script yet**

Write the following content to `C:\Users\10691\Documents\GitHub\html-tools\focus-json.html`:

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>focus-json</title>
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        html, body {
            height: 100%;
        }

        body {
            font-family: -apple-system, blinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #1e1e1e;
            color: #e0e0e0;
            min-height: 100vh;
            padding: 48px 5vw;
            display: flex;
            flex-direction: column;
            align-items: center;
        }

        .stage {
            width: 100%;
            max-width: 1200px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            flex: 1;
        }

        .hint {
            color: #888;
            font-size: 24px;
            text-align: center;
            line-height: 1.8;
        }

        .hint kbd {
            display: inline-block;
            font-family: inherit;
            background: #2c2c2c;
            border: 1px solid #444;
            border-radius: 4px;
            padding: 2px 8px;
            color: #b0bec5;
        }

        .error {
            color: #ef5350;
            font-size: 20px;
            text-align: center;
        }

        .card {
            background: #252525;
            border: 1px solid #333;
            border-radius: 12px;
            padding: 60px 72px;
        }

        .en {
            font-size: 72px;
            line-height: 1.4;
            color: #e0e0e0;
            font-weight: 500;
            word-break: break-word;
        }

        .divider {
            margin: 36px 0;
            border-top: 1px solid #333;
        }

        .cn {
            font-size: 40px;
            line-height: 1.5;
            color: #b0bec5;
            word-break: break-word;
        }

        .status {
            margin-top: 32px;
            text-align: center;
            color: #888;
            font-size: 18px;
            font-family: 'Consolas', 'Monaco', monospace;
        }

        .status kbd {
            display: inline-block;
            padding: 2px 8px;
            margin: 0 2px;
            background: #2c2c2c;
            border: 1px solid #444;
            border-radius: 4px;
            font-family: inherit;
            color: #b0bec5;
        }
    </style>
</head>
<body>
    <div class="stage" id="stage">
        <div class="hint">按 <kbd>Ctrl</kbd> + <kbd>V</kbd> 粘贴 JSON</div>
    </div>
</body>
</html>
```

- [ ] **Step 2: Manually verify in browser**

Open `focus-json.html` (double-click in Explorer or `file:///` URL). Confirm:
- Dark background fills viewport
- Centered hint text "按 Ctrl + V 粘贴 JSON" is visible
- The `<kbd>` chips inside the hint are styled with rounded dark backgrounds

- [ ] **Step 3: Commit**

```bash
git add focus-json.html
git commit -m "feat: scaffold focus-json.html with dark-theme CSS"
```

---

### Task 2: Implement parseJson, loadJson, and render

**Files:**
- Modify: `focus-json.html` (add `<script>` block before `</body>`)

- [ ] **Step 1: Add the full `<script>` block**

Insert this immediately before the closing `</body>` tag of `focus-json.html`:

```html
    <script>
        'use strict';

        let entries = [];
        let currentIndex = 0;
        const stage = document.getElementById('stage');

        function parseJson(text) {
            let obj;
            try {
                obj = JSON.parse(text);
            } catch (err) {
                throw new Error('JSON 解析失败: ' + err.message);
            }
            if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
                throw new Error('输入不是 JSON 对象');
            }
            entries = Object.entries(obj).map(([en, cn]) => ({
                en: String(en),
                cn: String(cn),
            }));
            return entries.length;
        }

        function showError(message) {
            stage.innerHTML = '';
            const err = document.createElement('div');
            err.className = 'error';
            err.textContent = message;
            stage.appendChild(err);
            entries = [];
            currentIndex = 0;
        }

        function render() {
            stage.innerHTML = '';
            if (entries.length === 0) {
                const hint = document.createElement('div');
                hint.className = 'hint';
                hint.innerHTML = '按 <kbd>Ctrl</kbd> + <kbd>V</kbd> 粘贴 JSON';
                stage.appendChild(hint);
                return;
            }
            const card = document.createElement('div');
            card.className = 'card';
            const en = document.createElement('div');
            en.className = 'en';
            en.textContent = entries[currentIndex].en;
            card.appendChild(en);
            const divider = document.createElement('div');
            divider.className = 'divider';
            card.appendChild(divider);
            const cn = document.createElement('div');
            cn.className = 'cn';
            cn.textContent = entries[currentIndex].cn;
            card.appendChild(cn);
            stage.appendChild(card);

            const status = document.createElement('div');
            status.className = 'status';
            status.innerHTML = `${currentIndex + 1} / ${entries.length}&nbsp;&nbsp;<kbd>←</kbd><kbd>→</kbd> 切换`;
            stage.appendChild(status);
        }

        function loadJson(text) {
            try {
                parseJson(text);
            } catch (err) {
                showError(err.message);
                return;
            }
            if (entries.length === 0) {
                showError('没有解析到任何条目');
                return;
            }
            currentIndex = 0;
            render();
        }

        document.addEventListener('paste', (e) => {
            const text = (e.clipboardData || window.clipboardData).getData('text');
            if (!text) return;
            e.preventDefault();
            loadJson(text);
        });

        document.addEventListener('keydown', (e) => {
            if (entries.length === 0) return;
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                e.preventDefault();
                if (currentIndex < entries.length - 1) {
                    currentIndex++;
                    render();
                }
            } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                e.preventDefault();
                if (currentIndex > 0) {
                    currentIndex--;
                    render();
                }
            }
        });
    </script>
```

- [ ] **Step 2: Manually verify the parse + render path**

In the browser, focus the page and press `Ctrl+V`. Paste this JSON:

```json
{
  "The export tasks finally have a home in the UI": "导出任务终于在前端有自己的页面了",
  "Users can now open `/exports`": "用户现在可以打开 `/exports`"
}
```

Expected:
- Card appears centered, dark background, rounded border
- "The export tasks finally have a home in the UI" in large (~72px) font on top
- Divider line
- "导出任务终于在前端有自己的页面了" in smaller (~40px) font below
- Status row: `1 / 2    ← → 切换`

- [ ] **Step 3: Manually verify error paths**

Without refreshing, paste these one at a time:

a) `{"a": "b",` — expect red error `JSON 解析失败: ...`
b) `[]` — expect red error `输入不是 JSON 对象`
c) `{}` — expect red error `没有解析到任何条目`

After each error, paste the valid 2-entry JSON from Step 2 and verify the error is replaced by the card.

- [ ] **Step 4: Manually verify arrow navigation**

With 2 entries loaded:

a) Press `→` — expect status `2 / 2`, second entry shown.
b) Press `→` again — expect no change (no wrap).
c) Press `←` — expect status `1 / 2`, first entry shown.
d) Press `←` again — expect no change.
e) Press `↓` — expect status `2 / 2`.
f) Press `↑` — expect status `1 / 2`.

- [ ] **Step 5: Commit**

```bash
git add focus-json.html
git commit -m "feat: implement parse, render, paste, and arrow navigation"
```

---

### Task 3: Full spec verification + cleanup

**Files:**
- (no file changes — verification only)

- [ ] **Step 1: Run the 11-case manual test plan from the spec**

Use the full 9-entry JSON from the spec body. Verify each of the 11 cases listed in `docs/superpowers/specs/2026-10-11-focus-json-design.md` → "Testing Strategy":

1. Initial state shows Ctrl+V hint ✓
2. Paste 9-entry JSON → status `1 / 9`, EN/CN rendered, card centered ✓
3. `→` 8 times → status increments each time, content swaps ✓
4. `→` on last entry → no-op ✓
5. `←` back to first, `←` again → no-op ✓
6. `↓` / `↑` also navigate ✓
7. Malformed JSON `{"a": "b",` → red error with `JSON 解析失败: ...` ✓
8. `[]` → red error `输入不是 JSON 对象` ✓
9. `{}` → red error `没有解析到任何条目` ✓
10. Valid JSON after error → error replaced ✓
11. Refresh page → entries cleared, hint re-shown ✓

- [ ] **Step 2: Verify file is under 200 lines**

Run: `wc -l "C:/Users/10691/Documents/GitHub/html-tools/focus-json.html"`

Expected: < 200 lines.

- [ ] **Step 3: No further commit needed**

Task 2's commit covers the final implementation. If any cleanup is needed (e.g. trailing whitespace), amend or add a small fixup commit.
