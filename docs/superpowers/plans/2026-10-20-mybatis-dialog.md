# MyBatis 苏格拉底式对话教学页 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 交付单文件 `docs/study/mybatis-dialog.html`，用苏格拉底式对话 + 图形动画 + 代码逐步展示 + 末尾选择题，带 TTS 朗读，引导 MyBatis 新手 12 课入门。

**Architecture:** 页面内嵌两块脚本——`<script id="core">` 放纯逻辑（符号转文本、音色挑选、12 课内容数据、内容自检），`<script>` 放 Alpine 组件（状态机、TTS 调用、右栏渲染与 Anime.js 动画）。纯逻辑与数据放在 `id="core"` 块内并挂到 `globalThis.MyBatisCore`，使 Node 端可以正则抽出该块用 `vm` 求值并对纯函数与数据结构写断言测试，页面本身仍是零依赖单文件。

**Tech Stack:** Tailwind CSS 3 Play CDN、DaisyUI 4 full.min.css（`data-theme="night"`）、Alpine.js 3.14.1、Anime.js 3.2.2、Node `node:test`（仅测试用，仓库无 package.json，CommonJS `require` 风格，与 `tests/parse-jsdoc.test.js` 一致）。

**约定：** 依据用户既有反馈，子代理/实现者只改文件不碰 git；提交由控制器在用户明确确认后执行。因此本计划**不包含** `git commit` 步骤。

---

## File Structure

| 文件 | 职责 |
|---|---|
| `docs/study/mybatis-dialog.html` | 全部内容：布局 + 核心逻辑 + 课程数据 + Alpine 组件 + 样式 |
| `tests/mybatis-dialog.test.js` | Node 端测试：抽出 HTML 里的 `id="core"` 脚本块，验证纯函数与内容数据 |

---

## Task 1: 页面骨架与依赖引入

**Files:**
- Create: `docs/study/mybatis-dialog.html`
- Create: `tests/mybatis-dialog.test.js`

- [ ] **Step 1: 写失败测试（骨架存在性与依赖）**

创建 `tests/mybatis-dialog.test.js`：

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const HTML_PATH = path.join(__dirname, '..', 'docs', 'study', 'mybatis-dialog.html');

function readHtml() {
    return fs.readFileSync(HTML_PATH, 'utf8');
}

function loadCore() {
    const html = readHtml();
    const m = html.match(/<script id="core">([\s\S]*?)<\/script>/);
    assert.ok(m, 'HTML 中必须存在 <script id="core"> 块');
    const sandbox = { console };
    sandbox.globalThis = sandbox;
    vm.createContext(sandbox);
    vm.runInContext(m[1], sandbox);
    return sandbox.MyBatisCore;
}

test('页面引入四个 CDN 依赖并使用深色主题', () => {
    const html = readHtml();
    assert.match(html, /cdn\.tailwindcss\.com/);
    assert.match(html, /daisyui@4[^"']*full\.min\.css/);
    assert.match(html, /alpinejs@3[^"']*cdn\.min\.js/);
    assert.match(html, /animejs@3[^"']*anime\.min\.js/);
    assert.match(html, /<html[^>]*data-theme="night"/);
});

test('页面包含三栏布局的容器 id', () => {
    const html = readHtml();
    for (const id of ['lesson-list', 'dialog-stage', 'art-stage', 'progress-bar']) {
        assert.match(html, new RegExp(`id="${id}"`), `缺少 id=${id}`);
    }
});

test('core 块导出 toSpeech / pickVoice / LESSONS / QUIZ', () => {
    const core = loadCore();
    assert.equal(typeof core.toSpeech, 'function');
    assert.equal(typeof core.pickVoice, 'function');
    assert.ok(Array.isArray(core.LESSONS));
    assert.ok(Array.isArray(core.QUIZ));
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test tests/mybatis-dialog.test.js`
Expected: FAIL —— `ENOENT: no such file or directory ... docs/study/mybatis-dialog.html`

- [ ] **Step 3: 创建页面骨架**

创建 `docs/study/mybatis-dialog.html`：

```html
<!DOCTYPE html>
<html lang="zh-CN" data-theme="night">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>MyBatis 入门 · 苏格拉底对话课</title>
<script src="https://cdn.tailwindcss.com"></script>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/daisyui@4.12.10/dist/full.min.css">
<script>tailwind.config = { darkMode: 'class' };</script>
<script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.14.1/dist/cdn.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/animejs@3.2.2/lib/anime.min.js"></script>
<style>
  .dialog-scroll { scroll-behavior: smooth; }
  .art-line { opacity: 0; }
  .code-line { opacity: 0; }
  .bubble-in { transform: translateY(12px); opacity: 0; }
</style>
</head>
<body class="min-h-screen bg-base-200 text-base-content">
<div id="app" x-data="app()" class="flex flex-col h-screen">

  <header class="navbar bg-base-100 border-b border-base-300 px-4 gap-3">
    <div class="flex-1 flex items-center gap-3">
      <span class="text-lg font-bold">MyBatis 入门</span>
      <span class="badge badge-primary" x-text="`第 ${lessonIndex + 1} / ${LESSONS.length} 课`"></span>
      <span class="text-sm opacity-70" x-text="lesson.title"></span>
    </div>
    <progress id="progress-bar" class="progress progress-primary w-40" :value="lessonIndex + 1" :max="LESSONS.length"></progress>
    <label class="label cursor-pointer gap-2">
      <span class="label-text text-sm">自动朗读</span>
      <input type="checkbox" class="toggle toggle-primary" x-model="autoSpeak">
    </label>
  </header>

  <main class="flex-1 grid grid-cols-1 lg:grid-cols-[260px_1fr_1fr] gap-4 p-4 min-h-0">

    <aside class="flex flex-col gap-4 overflow-y-auto">
      <div class="card bg-base-100 border border-base-300">
        <div class="card-body p-4">
          <h2 class="card-title text-sm">课时目录</h2>
          <ul id="lesson-list" class="menu menu-sm p-0 w-full gap-1">
            <template x-for="(l, i) in LESSONS" :key="l.id">
              <li>
                <button class="w-full justify-start" :class="i === lessonIndex ? 'active' : ''"
                        @click="goLesson(i)" x-text="`${l.id}. ${l.title}`"></button>
              </li>
            </template>
          </ul>
        </div>
      </div>

      <div class="card bg-base-100 border border-base-300">
        <div class="card-body p-4 gap-3">
          <h2 class="card-title text-sm">朗读设置</h2>
          <label class="form-control">
            <span class="label-text text-xs mb-1">学生音色</span>
            <select class="select select-bordered select-sm" x-model="studentVoiceURI" @change="saveSettings()">
              <template x-for="v in voices" :key="v.voiceURI">
                <option :value="v.voiceURI" x-text="v.name"></option>
              </template>
            </select>
          </label>
          <label class="form-control">
            <span class="label-text text-xs mb-1">老师音色</span>
            <select class="select select-bordered select-sm" x-model="teacherVoiceURI" @change="saveSettings()">
              <template x-for="v in voices" :key="v.voiceURI">
                <option :value="v.voiceURI" x-text="v.name"></option>
              </template>
            </select>
          </label>
          <label class="form-control">
            <span class="label-text text-xs mb-1">语速 <span x-text="rate.toFixed(1)"></span></span>
            <input type="range" min="0.5" max="2" step="0.1" class="range range-primary range-xs" x-model.number="rate" @input="saveSettings()">
          </label>
        </div>
      </div>
    </aside>

    <section id="dialog-stage" class="card bg-base-100 border border-base-300 min-h-0 flex flex-col">
      <div class="card-body p-4 flex flex-col min-h-0">
        <h2 class="card-title text-base" x-text="lesson.title"></h2>
        <p class="text-xs opacity-60" x-text="lesson.goal"></p>
        <div class="dialog-scroll flex-1 overflow-y-auto space-y-3 pr-2" x-ref="dialogScroll">
          <template x-for="(t, i) in turns" :key="i">
            <div x-show="i < revealed" class="flex gap-2 items-start" :class="t.role === 'student' ? 'justify-start' : 'justify-end'">
              <button class="btn btn-ghost btn-xs mt-2 opacity-60 hover:opacity-100" @click="speakTurn(t)" title="重听">🔊</button>
              <div class="chat" :class="t.role === 'student' ? 'chat-start' : 'chat-end'">
                <div class="chat-header text-xs opacity-60" x-text="t.role === 'student' ? '学生' : '老师'"></div>
                <div class="chat-bubble whitespace-pre-wrap"
                     :class="t.role === 'student' ? 'chat-bubble-primary' : 'chat-bubble-neutral'"
                     x-text="t.text"></div>
              </div>
            </div>
          </template>
        </div>
        <div class="flex items-center justify-between pt-3 border-t border-base-300">
          <button class="btn btn-ghost btn-sm" @click="prev()" :disabled="lessonIndex === 0">← 上一课</button>
          <button class="btn btn-primary btn-sm" @click="next()" x-text="nextLabel"></button>
        </div>
      </div>
    </section>

    <section id="art-stage" class="card bg-base-100 border border-base-300 min-h-0">
      <div class="card-body p-4 overflow-y-auto">
        <div class="flex items-center justify-between mb-2">
          <h2 class="card-title text-base">演示</h2>
          <button class="btn btn-secondary btn-xs" @click="playArt()" x-show="!isQuizLesson">▶ 播放动画</button>
        </div>
        <div x-ref="artRoot" class="space-y-3"></div>
      </div>
    </section>

  </main>
</div>

<script id="core">
// ---- 纯逻辑：符号转文本、音色挑选、课程数据 ----
</script>

<script>
// ---- Alpine 组件：状态机、TTS、右栏渲染、动画 ----
</script>
</body>
</html>
```

- [ ] **Step 4: 运行测试确认第一、二条通过、第三条失败**

Run: `node --test tests/mybatis-dialog.test.js`
Expected: 2 pass（CDN/布局检查），1 fail（`core 块导出 ...` 断言 `typeof core.toSpeech === 'function'` 失败，因为 core 块为空）

---

## Task 2: 核心纯逻辑（符号转文本 + 音色挑选 + 内容自检）

**Files:**
- Modify: `docs/study/mybatis-dialog.html`（`id="core"` 块）
- Modify: `tests/mybatis-dialog.test.js`

- [ ] **Step 1: 写失败测试**

追加到 `tests/mybatis-dialog.test.js`：

```js
test('toSpeech 把代码符号转成口语说法', () => {
    const { toSpeech } = loadCore();
    assert.equal(toSpeech('参数用 #{} 占位'), '参数用 占位符 占位');
    assert.equal(toSpeech('a && b'), 'a 并且 b');
    assert.equal(toSpeech('x -> y'), 'x 指向 y');
    assert.equal(toSpeech('list != null'), 'list 不等于 null');
    assert.equal(toSpeech('a || b'), 'a 或者 b');
    assert.equal(toSpeech('a * b'), 'a 星号 b');
    assert.equal(toSpeech('foo()'), 'foo 括号');
});

test('toSpeech 把 ${} 标成美元占位符并保留风险提醒', () => {
    const { toSpeech } = loadCore();
    assert.match(toSpeech('${name}'), /美元占位符/);
});

test('pickVoice 学生优先 Xiaoxiao、老师优先 Yunjian', () => {
    const { pickVoice } = loadCore();
    const voices = [
        { name: 'Microsoft Yunjian Online (Natural) - Chinese (Mainland)', voiceURI: 'yunjian', lang: 'zh-CN' },
        { name: 'Microsoft Xiaoxiao Online (Natural) - Chinese (Mainland)', voiceURI: 'xiaoxiao', lang: 'zh-CN' },
        { name: 'Default Voice', voiceURI: 'def', lang: 'en-US' },
    ];
    assert.equal(pickVoice(voices, 'student').voiceURI, 'xiaoxiao');
    assert.equal(pickVoice(voices, 'teacher').voiceURI, 'yunjian');
});

test('pickVoice 缺微软音色时退回中文音色再退回第一个', () => {
    const { pickVoice } = loadCore();
    const en = [{ name: 'Alex', voiceURI: 'alex', lang: 'en-US' }];
    assert.equal(pickVoice(en, 'student').voiceURI, 'alex');
    const zh = [{ name: 'Huihui', voiceURI: 'huihui', lang: 'zh-CN' }];
    assert.equal(pickVoice(zh, 'teacher').voiceURI, 'huihui');
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test tests/mybatis-dialog.test.js`
Expected: FAIL —— `toSpeech is not a function`

- [ ] **Step 3: 实现 core 纯逻辑**

把 `id="core"` 块替换为：

```js
const SPEECH_RULES = [
    [/#\{[^}]*\}/g, '占位符'],
    [/\$\{[^}]*\}/g, '美元占位符'],
    [/=>|→/g, ' 映射到 '],
    [/->/g, ' 指向 '],
    [/&&/g, ' 并且 '],
    [/\|\|/g, ' 或者 '],
    [/!=/g, ' 不等于 '],
    [/==/g, ' 等于 '],
    [/>=/g, ' 大于等于 '],
    [/<=/g, ' 小于等于 '],
    [/\(\)/g, ' 括号 '],
    [/\*/g, ' 星号 '],
    [/\//g, ' 斜杠 '],
    [/@(\w+)/g, ' $1 注解 '],
    [/<</g, ' 左尖括号 '],
    [/>/g, ' 右尖括号 '],
];

function toSpeech(text) {
    let out = String(text == null ? '' : text);
    for (const [re, rep] of SPEECH_RULES) out = out.replace(re, rep);
    return out.replace(/\s+/g, ' ').trim();
}

function validateContent() { return []; }

function pickVoice(voices, role) {
    if (!voices || !voices.length) return null;
    const prefer = role === 'teacher' ? /yunjian/i : /xiaoxiao/i;
    return voices.find(v => prefer.test(v.name || ''))
        || voices.find(v => /^zh/i.test(v.lang || ''))
        || voices[0];
}

const MyBatisCore = { toSpeech, pickVoice, LESSONS: [], QUIZ: [], validateContent };
if (typeof globalThis !== 'undefined') globalThis.MyBatisCore = MyBatisCore;
```

- [ ] **Step 4: 运行测试确认通过**

Run: `node --test tests/mybatis-dialog.test.js`
Expected: 全部 pass（核心的 4 条新测试 + 之前的 3 条）

> 注意：`validateContent` 此时尚未定义，需在 Task 3 补上；为让 Task 2 的测试可运行，先在 core 块里放占位定义 `function validateContent() { return []; }`，Task 3 再替换为真实实现。

---

## Task 3: 12 课内容数据 + 内容自检

**Files:**
- Modify: `docs/study/mybatis-dialog.html`（`id="core"` 块内的 `LESSONS` / `QUIZ` / `validateContent`）

- [ ] **Step 1: 写失败测试**

追加到 `tests/mybatis-dialog.test.js`：

```js
test('共 12 课，编号连续，每课有标题、目标与对话', () => {
    const { LESSONS } = loadCore();
    assert.equal(LESSONS.length, 12);
    LESSONS.forEach((l, i) => {
        assert.equal(l.id, i + 1);
        assert.ok(l.title && l.title.length > 1, `第 ${l.id} 课缺标题`);
        assert.ok(l.goal && l.goal.length > 4, `第 ${l.id} 课缺目标`);
        assert.ok(Array.isArray(l.turns), `第 ${l.id} 课缺 turns`);
    });
});

test('每课对话学生占比在 30% 到 55% 之间且至少 4 句', () => {
    const { LESSONS } = loadCore();
    for (const l of LESSONS) {
        if (l.turns.length === 0) continue;
        assert.ok(l.turns.length >= 4, `第 ${l.id} 课对话过少`);
        const stu = l.turns.filter(t => t.role === 'student').length;
        const ratio = stu / l.turns.length;
        assert.ok(ratio >= 0.3 && ratio <= 0.55, `第 ${l.id} 课学生占比 ${ratio}`);
    }
});

test('每句对话都有 role 与文本，且 art 类型合法', () => {
    const { LESSONS } = loadCore();
    const legal = ['compare', 'relation', 'flow', 'data', 'mapping', 'code'];
    for (const l of LESSONS) {
        for (const t of l.turns) {
            assert.ok(['student', 'teacher'].includes(t.role), `第 ${l.id} 课 role 非法`);
            assert.ok(t.text && t.text.length > 2, `第 ${l.id} 课有空文本`);
        }
        if (l.art) assert.ok(legal.includes(l.art.type), `第 ${l.id} 课 art 类型非法: ${l.art.type}`);
    }
});

test('测验为 6 题四选一且有唯一正确项', () => {
    const { QUIZ } = loadCore();
    assert.equal(QUIZ.length, 6);
    for (const q of QUIZ) {
        assert.equal(q.options.length, 4);
        assert.ok(q.answer >= 0 && q.answer < 4);
        assert.ok(q.explain && q.explain.length > 10, '解析过短');
        assert.ok(q.lesson >= 1 && q.lesson <= 12, '缺少关联课号');
    }
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test tests/mybatis-dialog.test.js`
Expected: FAIL —— `LESSONS.length` 为 0

- [ ] **Step 3: 填写 12 课内容**

替换 core 块中的 `LESSONS` / `QUIZ` 占位为真实内容。每课结构：

```js
{
  id: 1,
  title: 'MyBatis 是什么',
  goal: '一句话说清它替你省掉了什么',
  turns: [
    { role: 'student', text: '老师，我刚学完 JDBC，写一个查询要...好几屏的样板代码。' },
    { role: 'teacher', text: '对，你被样板代码绊住了。MyBatis 的作用就像...', art: 'compare' }
  ],
  art: { type: 'compare', left: {...}, right: {...} }
}
```

内容编写硬性要求（每课都必须满足）：

| 课 | 主题 | 必须讲到 | 学生要犯的错 | art.type |
|---|---|---|---|---|
| 1 | MyBatis 是什么 | JDBC 样板代码的四步 vs MyBatis 两步 | 以为 MyBatis 是数据库/ORM 框架 | compare |
| 2 | 核心对象 | SqlSessionFactory（工厂）、SqlSession（会话）、Mapper（接口）三者的从属关系 | 把 SqlSessionFactory 当成每条 SQL 用一次 | relation |
| 3 | XML 映射 vs 注解 | 两种写法的取舍：`@Select` 快但长 SQL 难维护，XML 适合复杂 SQL | 认为注解方式更"高级" | code |
| 4 | 第一个 Mapper | `insert` / `update` / `delete` / `select` 四个方法的返回类型 | 认为 `update` 返回影响行数就一定是 1 | data |
| 5 | 参数传递 | 单参、`@Param("name")`、多参不写 `@Param` 会取 `param1/arg0` | 多参时不加 `@Param` | flow |
| 6 | 查询结果 | `resultType` 适用于列名与属性同名；返回单个用 `selectOne`、多个用 `selectList` | 用 `selectOne` 查可能返回多行的 SQL | data |
| 7 | resultMap | 下划线列名 `user_name` 与驼峰属性 `userName` 的映射 | 直接用 `resultType` 却查不出值 | mapping |
| 8 | 动态 SQL | `<where>` 去多余 AND、`<if>` 条件、`<set>` 处理 UPDATE 的逗号 | 手写 `WHERE 1=1` 硬拼 | flow |
| 9 | foreach | `<foreach collection="list" item="item">` 生成 IN 列表、空列表要加防护 | 忘了 `collection` 与 `item` 名字对不上 | data |
| 10 | 关联映射 | 一对多用 `<collection>` + `ofType` 嵌套结果映射 | 在 Mapper 接口里直接返回两个 List | relation |
| 11 | 场景串联 | 分页插件拦截器改写 SQL、事务由 Spring 管理、一级缓存同一次 SqlSession 内生效 | 以为二级缓存默认开启 | flow |
| 12 | 测验 | 6 题覆盖 `#{}` vs `${}`、resultType vs resultMap、一级/二级缓存、`@Param`、`selectOne`、XML 与注解优先级 | —— | （测验课，无 art） |

对话文本硬性要求：口语化、多用比喻（例如「Mapper 接口就像服务员，你点菜，它端菜，厨房还是那个厨房」）；代码符号写成口语（如「用花括号占位符」而不是 `#{id}`）；学生必须先提问或先犯错。

`QUIZ` 6 题固定考点：`#{}` 与 `${}` 的区别（课 8/11）、`resultType` 与 `resultMap`（课 7）、一级缓存与二级缓存（课 11）、多参缺 `@Param` 的后果（课 5）、`selectOne` 遇多行会怎样（课 6）、XML 与注解同时存在谁优先（课 3）。

- [ ] **Step 4: 实现 validateContent 并替换占位**

把 core 块中的 `function validateContent() { return []; }` 替换为：

```js
function validateContent(lessons, quiz) {
    const issues = [];
    const legalArt = ['compare', 'relation', 'flow', 'data', 'mapping', 'code'];
    (lessons || []).forEach((l, i) => {
        if (l.id !== i + 1) issues.push(`第 ${i + 1} 课 id 不连续: ${l.id}`);
        if (!l.title) issues.push(`第 ${l.id} 课缺标题`);
        if (!l.goal) issues.push(`第 ${l.id} 课缺目标`);
        if (!Array.isArray(l.turns)) issues.push(`第 ${l.id} 课缺 turns`);
        if (l.art && !legalArt.includes(l.art.type)) issues.push(`第 ${l.id} 课 art 类型非法: ${l.art.type}`);
        (l.turns || []).forEach((t, j) => {
            if (!['student', 'teacher'].includes(t.role)) issues.push(`第 ${l.id} 课第 ${j + 1} 句 role 非法`);
            if (!t.text) issues.push(`第 ${l.id} 课第 ${j + 1} 句缺文本`);
        });
        if (l.turns && l.turns.length) {
            const r = l.turns.filter(t => t.role === 'student').length / l.turns.length;
            if (r < 0.3 || r > 0.55) issues.push(`第 ${l.id} 课学生占比失衡: ${r.toFixed(2)}`);
        }
    });
    (quiz || []).forEach((q, i) => {
        if (!Array.isArray(q.options) || q.options.length !== 4) issues.push(`第 ${i + 1} 题选项不是 4 个`);
        if (!(q.answer >= 0 && q.answer < 4)) issues.push(`第 ${i + 1} 题答案越界`);
        if (!q.explain) issues.push(`第 ${i + 1} 题缺解析`);
    });
    return issues;
}
```

- [ ] **Step 5: 运行测试确认全部通过**

Run: `node --test tests/mybatis-dialog.test.js`
Expected: 全部 pass

---

## Task 4: TTS 引擎与朗读设置 UI

**Files:**
- Modify: `docs/study/mybatis-dialog.html`（Alpine 组件脚本）

- [ ] **Step 1: 写失败测试**

追加到 `tests/mybatis-dialog.test.js`：

```js
test('core 提供朗读文本转换入口 speakText', () => {
    const core = loadCore();
    assert.equal(typeof core.speakText, 'function');
    assert.equal(core.speakText('用 #{} 传参'), '用 占位符 传参');
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test tests/mybatis-dialog.test.js`
Expected: FAIL —— `speakText` 未定义

- [ ] **Step 3: 实现**

core 块追加导出：

```js
function speakText(text) { return toSpeech(text); }
MyBatisCore.speakText = speakText;
```

Alpine 组件脚本写入 TTS 部分：

```js
const { LESSONS, QUIZ, toSpeech, pickVoice } = MyBatisCore;

function app() {
    return {
        LESSONS, QUIZ,
        lessonIndex: 0,
        revealed: 0,
        voices: [],
        studentVoiceURI: '',
        teacherVoiceURI: '',
        rate: 1,
        autoSpeak: true,
        artToken: 0,

        init() {
            this.loadSettings();
            this.loadVoices();
            if (typeof speechSynthesis !== 'undefined') {
                speechSynthesis.onvoiceschanged = () => this.loadVoices();
            }
        },

        get lesson() { return LESSONS[this.lessonIndex]; },
        get turns() { return this.lesson.turns; },
        get isQuizLesson() { return this.lesson.turns.length === 0; },
        get dialogueDone() { return this.revealed >= this.turns.length; },
        get nextLabel() { return this.dialogueDone ? '下一课 →' : '下一句 ↓'; },

        loadVoices() {
            if (typeof speechSynthesis === 'undefined') return;
            this.voices = speechSynthesis.getVoices() || [];
            if (!this.studentVoiceURI) {
                const v = pickVoice(this.voices, 'student');
                if (v) this.studentVoiceURI = v.voiceURI;
            }
            if (!this.teacherVoiceURI) {
                const v = pickVoice(this.voices, 'teacher');
                if (v) this.teacherVoiceURI = v.voiceURI;
            }
        },

        saveSettings() {
            try {
                localStorage.setItem('mb-tts', JSON.stringify({
                    studentVoiceURI: this.studentVoiceURI,
                    teacherVoiceURI: this.teacherVoiceURI,
                    rate: this.rate,
                    autoSpeak: this.autoSpeak,
                }));
            } catch (e) { /* 隐私模式下忽略 */ }
        },

        loadSettings() {
            try {
                const raw = localStorage.getItem('mb-tts');
                if (!raw) return;
                const s = JSON.parse(raw);
                this.studentVoiceURI = s.studentVoiceURI || '';
                this.teacherVoiceURI = s.teacherVoiceURI || '';
                this.rate = typeof s.rate === 'number' ? s.rate : 1;
                this.autoSpeak = s.autoSpeak !== false;
            } catch (e) { /* 忽略损坏数据 */ }
        },

        speak(text, role) {
            if (typeof speechSynthesis === 'undefined' || !text) return;
            speechSynthesis.cancel();
            const u = new SpeechSynthesisUtterance(toSpeech(text));
            const uri = role === 'student' ? this.studentVoiceURI : this.teacherVoiceURI;
            const v = this.voices.find(x => x.voiceURI === uri);
            if (v) { u.voice = v; u.lang = v.lang; } else { u.lang = 'zh-CN'; }
            u.rate = this.rate;
            speechSynthesis.speak(u);
        },

        speakTurn(t) { this.speak(t.text, t.role); },
        stopSpeak() { if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel(); },
    };
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `node --test tests/mybatis-dialog.test.js`
Expected: 全部 pass

---

## Task 5: 对话引擎（展开/收起/键位/下一句下一课）

**Files:**
- Modify: `docs/study/mybatis-dialog.html`（Alpine 组件脚本）

- [ ] **Step 1: 实现状态机**

在 Alpine 组件中追加：

```js
        revealedTurns() { return this.turns.slice(0, this.revealed); },

        reveal() {
            if (this.revealed >= this.turns.length) return;
            const t = this.turns[this.revealed];
            this.revealed += 1;
            this.$nextTick(() => {
                const el = this.$refs.dialogScroll;
                if (el) el.scrollTop = el.scrollHeight;
                const bubble = el && el.lastElementChild;
                if (bubble && typeof anime !== 'undefined') {
                    anime({ targets: bubble, translateY: [12, 0], opacity: [0, 1], duration: 320, easing: 'easeOutQuad' });
                }
            });
            if (this.autoSpeak) this.speak(t.text, t.role);
        },

        collapse() {
            if (this.revealed <= 0) return;
            this.revealed -= 1;
            this.stopSpeak();
        },

        next() {
            if (!this.dialogueDone) { this.reveal(); return; }
            this.goLesson(this.lessonIndex + 1);
        },

        prev() { this.goLesson(this.lessonIndex - 1); },

        goLesson(i) {
            if (i < 0 || i >= LESSONS.length) return;
            this.stopSpeak();
            this.lessonIndex = i;
            this.revealed = 0;
            this.artToken += 1;
            this.$nextTick(() => { if (this.renderArt) this.renderArt(); });
        },

        onKey(e) {
            if (e.target && ['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;
            if (e.key === 'ArrowDown') { e.preventDefault(); this.next(); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); this.collapse(); }
            else if (e.key === 'ArrowRight') { e.preventDefault(); this.goLesson(this.lessonIndex + 1); }
            else if (e.key === 'ArrowLeft') { e.preventDefault(); this.goLesson(this.lessonIndex - 1); }
        },
```

在组件的 `init()` 中绑定键位：

```js
            window.addEventListener('keydown', this.onKey.bind(this));
```

并在 `<body>` 上加 `x-init="init()"`（或保留 `x-data="app()"` 的同时给根 div 加 `@keydown.window="onKey($event)"`）。

- [ ] **Step 2: 手动验证**

在浏览器打开页面：按 `↓` 出现第一句、按 `↓` 出现第二句；对话展开完后底部按钮文案变成「下一课 →」；按 `→` 切到第 2 课且对话重置；按 `←` 回到第 1 课；`↑` 收起最后一句。

---

## Task 6: 右栏可视化渲染器与 Anime.js 动画

**Files:**
- Modify: `docs/study/mybatis-dialog.html`（Alpine 组件脚本 + 样式）

- [ ] **Step 1: 实现各 art 类型的 HTML 渲染**

在 Alpine 组件中追加渲染方法，输出到 `this.$refs.artRoot`：

```js
        esc(s) { return String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])); },

        renderArt() {
            const root = this.$refs.artRoot;
            if (!root) return;
            const art = this.lesson.art;
            if (!art) { root.innerHTML = '<p class="text-sm opacity-60">这一课先听老师讲。</p>'; return; }
            const t = art.type;
            if (t === 'compare') {
                root.innerHTML = `
                  <div class="grid grid-cols-2 gap-3">
                    <div class="card bg-base-200 border border-base-300">
                      <div class="card-body p-3">
                        <h3 class="text-sm font-bold text-error">写 JDBC</h3>
                        <ul class="art-line text-xs space-y-1 list-disc pl-4">
                          ${art.left.map(s => `<li>${this.esc(s)}</li>`).join('')}
                        </ul>
                      </div>
                    </div>
                    <div class="card bg-base-200 border border-base-300">
                      <div class="card-body p-3">
                        <h3 class="text-sm font-bold text-success">写 MyBatis</h3>
                        <ul class="art-line text-xs space-y-1 list-disc pl-4">
                          ${art.right.map(s => `<li>${this.esc(s)}</li>`).join('')}
                        </ul>
                      </div>
                    </div>
                  </div>`;
            } else if (t === 'relation') {
                root.innerHTML = art.nodes.map((n, i) => `
                  <div class="art-line">
                    <div class="card bg-base-200 border border-base-300">
                      <div class="card-body p-3 flex-row items-center gap-3">
                        <span class="text-2xl">${n.icon || '•'}</span>
                        <div>
                          <div class="text-sm font-bold">${this.esc(n.label)}</div>
                          <div class="text-xs opacity-70">${this.esc(n.sub || '')}</div>
                        </div>
                      </div>
                    </div>
                    ${i < art.nodes.length - 1 ? `<div class="text-center text-xs opacity-60 my-1">▼ ${this.esc(art.edges[i] || '')}</div>` : ''}
                  </div>`).join('');
            } else if (t === 'flow') {
                root.innerHTML = art.steps.map((s, i) => `
                  <div class="art-line flex items-start gap-3">
                    <span class="badge badge-primary badge-sm mt-1">${i + 1}</span>
                    <div>
                      <div class="text-sm">${this.esc(s.label)}</div>
                      ${s.note ? `<div class="text-xs opacity-70">${this.esc(s.note)}</div>` : ''}
                    </div>
                  </div>`).join('');
            } else if (t === 'data') {
                root.innerHTML = `
                  <table class="table table-xs table-zebra bg-base-200">
                    <thead><tr>${art.headers.map(h => `<th>${this.esc(h)}</th>`).join('')}</tr></thead>
                    <tbody>${art.rows.map(r => `<tr class="art-line">${r.map(c => `<td>${this.esc(c)}</td>`).join('')}</tr>`).join('')}</tbody>
                  </table>
                  ${art.bars ? `<div class="space-y-2 mt-3">${art.bars.map(b => `
                    <div>
                      <div class="text-xs">${this.esc(b.label)}</div>
                      <progress class="progress progress-primary w-full" value="${b.value}" max="${b.max || 100}"></progress>
                    </div>`).join('')}</div>` : ''}`;
            } else if (t === 'mapping') {
                root.innerHTML = art.rows.map(r => `
                  <div class="art-line flex items-center gap-2 text-sm">
                    <code class="badge badge-ghost">${this.esc(r.col)}</code>
                    <span class="opacity-60">→</span>
                    <code class="badge badge-primary">${this.esc(r.prop)}</code>
                    <span class="text-xs opacity-60">${this.esc(r.note || '')}</span>
                  </div>`).join('');
            } else if (t === 'code') {
                root.innerHTML = `
                  <div class="text-xs opacity-60 mb-1">${this.esc(art.caption || '')}</div>
                  <pre class="code-line bg-base-200 rounded-box p-3 text-xs overflow-x-auto"><code>${this.esc(art.code)}</code></pre>`;
            }
        },
```

- [ ] **Step 2: 实现手动触发的动画**

```js
        playArt() {
            const root = this.$refs.artRoot;
            if (!root || typeof anime === 'undefined') return;
            const lines = root.querySelectorAll('.art-line, .code-line');
            anime({ targets: lines, opacity: [0, 1], translateY: [8, 0], delay: anime.stagger(140), duration: 320, easing: 'easeOutQuad' });
        },
```

- [ ] **Step 3: 在切课时调用渲染**

`goLesson()` 里已调用 `this.renderArt()`；另外在 `init()` 的 `$nextTick` 中也调用一次，保证首屏有内容。

- [ ] **Step 4: 手动验证**

切到第 1 课，右栏出现两栏对比；点「▶ 播放动画」，条目依次淡入；切到第 2 课出现节点链；第 3 课出现代码块；第 7 课出现字段映射行；第 6/9 课出现表格。

---

## Task 7: 测验课（第 12 课）

**Files:**
- Modify: `docs/study/mybatis-dialog.html`（模板中新增测验容器 + Alpine 组件）

- [ ] **Step 1: 在中栏加测验容器**

把中栏的对话滚动区改为同时承载两态：

```html
        <div class="dialog-scroll flex-1 overflow-y-auto space-y-3 pr-2" x-ref="dialogScroll" x-show="!isQuizLesson">
          ...原有 template x-for...
        </div>
        <div x-show="isQuizLesson" class="flex-1 overflow-y-auto space-y-3 pr-2">
          <template x-for="(q, i) in QUIZ" :key="i">
            <div class="card bg-base-200 border border-base-300">
              <div class="card-body p-4">
                <h3 class="text-sm font-bold"><span x-text="i + 1"></span>. <span x-text="q.question"></span></h3>
                <div class="space-y-1 mt-2">
                  <template x-for="(o, j) in q.options" :key="j">
                    <button class="btn btn-sm w-full justify-start"
                            :class="quizAnswered(i) ? (j === q.answer ? 'btn-success' : (quizChoice[i] === j ? 'btn-error' : 'btn-ghost')) : 'btn-ghost border-base-300'"
                            :disabled="quizAnswered(i)"
                            @click="answerQuiz(i, j)"
                            x-text="String.fromCharCode(65 + j) + '. ' + o"></button>
                  </template>
                </div>
                <div class="text-xs mt-2" x-show="quizAnswered(i)">
                  <span class="badge" :class="quizChoice[i] === q.answer ? 'badge-success' : 'badge-error'" x-text="quizChoice[i] === q.answer ? '答对了' : '答错了'"></span>
                  <p class="mt-1 opacity-80" x-text="q.explain"></p>
                </div>
              </div>
            </div>
          </template>
          <div class="card bg-base-100 border border-base-300" x-show="quizDone">
            <div class="card-body p-4">
              <h3 class="card-title text-sm">测验结果</h3>
              <p class="text-sm" x-text="`答对 ${quizScore} / ${QUIZ.length} 题`"></p>
              <p class="text-xs opacity-70" x-text="quizAdvice"></p>
            </div>
          </div>
        </div>
```

- [ ] **Step 2: 实现测验逻辑**

在 Alpine 组件追加：

```js
        quizChoice: {},
        quizAnswered(i) { return Object.prototype.hasOwnProperty.call(this.quizChoice, i); },
        get quizScore() {
            return this.QUIZ.filter((q, i) => this.quizChoice[i] === q.answer).length;
        },
        get quizDone() { return Object.keys(this.quizChoice).length === this.QUIZ.length; },
        get quizAdvice() {
            const wrong = this.QUIZ.filter((q, i) => this.quizChoice[i] !== q.answer);
            if (!wrong.length) return '全部答对，可以直接上手写项目了。';
            const ids = [...new Set(wrong.map(q => q.lesson))].sort((a, b) => a - b);
            return `建议回头复习第 ${ids.join('、')} 课。`;
        },

        answerQuiz(i, j) {
            if (this.quizAnswered(i)) return;
            this.quizChoice[i] = j;
            const q = this.QUIZ[i];
            if (this.autoSpeak) {
                const right = j === q.answer;
                this.speak(right ? `答对了。${q.explain}` : `答错了。正确答案是 ${String.fromCharCode(65 + q.answer)}。${q.explain}`, 'teacher');
            }
        },
```

- [ ] **Step 3: 手动验证**

进入第 12 课，中栏直接是 6 张题卡（不再逐句展开）；点选项立即变色并显示解析；6 题答完后出现成绩与复习建议；右栏显示答题卡进度（可用 `art.type` 不适用时改为渲染答题卡）。

- [ ] **Step 4: 修正「下一句/下一课」在测验课的行为**

测验课 `turns.length === 0`，`dialogueDone` 恒为真，按钮显示「下一课 →」；点它应切到最后一课时保持停留（`goLesson` 越界时直接 return，已实现）。

---

## Task 8: 集成验证

**Files:**
- Modify: `tests/mybatis-dialog.test.js`（补一条整体自检测试）

- [ ] **Step 1: 加内容自检测试**

追加：

```js
test('内容自检无问题', () => {
    const core = loadCore();
    const issues = core.validateContent(core.LESSONS, core.QUIZ);
    assert.deepEqual(issues, []);
});
```

- [ ] **Step 2: 运行全部测试**

Run: `node --test tests/mybatis-dialog.test.js`
Expected: 全部 pass

- [ ] **Step 3: 浏览器手工清单**

本地起服务：`npx --yes http-server docs/study -p 8899`，浏览器打开 `http://localhost:8899/mybatis-dialog.html`（或直接双击文件打开）。逐项确认：

1. 深色主题生效，三栏布局正常
2. 顶部进度条随切课变化，目录当前项高亮，点击可跳课
3. `↓` 逐句展开并朗读；`↑` 收起；`←/→` 翻课
4. 底部按钮：对话未完「下一句 ↓」，展开完变「下一课 →」
5. 音色下拉含 Microsoft 音色时，学生自动选 Xiaoxiao、老师自动选 Yunjian；语速条生效
6. 右栏「▶ 播放动画」手动触发；代码块逐行显现
7. 第 12 课 6 题答题即时反馈 + 解析朗读 + 成绩汇总
8. 控制台无报错

- [ ] **Step 4: 汇报**

向用户说明文件位置、12 课内容、TTS 音色依赖系统中文语音（缺失时可读但无朗读），并提示未提交 git（按用户既有偏好，提交需明确确认）。

---

## 实现记录（与计划的偏差）

实现过程中相对本计划做了以下调整，均已同步进 `docs/study/mybatis-dialog.html`：

1. **对话气泡动画改用 Alpine `x-transition`（CSS 过渡），不再用 anime.js。** 原因：anime.js 把元素透明度从 0 动画上来，若动画引擎被暂停（页面切到后台标签页时 anime 会自动 pause），文字会一直停在不可见状态。CSS 过渡不依赖 rAF，永远能到达终态。anime.js 仍用于右栏演示。
2. **右栏动画加结束态兜底。** `playArt()` 在启动 anime 动画后，用一个 `setTimeout` 把目标元素的 opacity/transform 强制摆到最终态，避免引擎暂停时演示内容不可见。
3. **音色自动挑选改为随语音列表更新重挑。** `speechSynthesis.getVoices()` 是异步到齐的，原来只在首次为空时挑一次；现在每次列表更新都会重挑，除非用户手动选过（`pinned` 标记，此时以 `localStorage` 中保存的为准）。
4. **老师音色的中文回退会避开学生已选的音色**，让师生声音尽量不同。
5. **测验课的底部按钮文案为「从头再学一遍 ↺」**，点击回到第 1 课并清空作答；再次进入测验课也会清空上次作答。
6. **验证方式调整。** 受环境限制（沙箱内 curl 无法访问外网、无头 Chromium 在 `--virtual-time-budget` 下 Alpine 的 `x-show` 不刷新 DOM），最终验证采用：
   - `tests/mybatis-dialog.test.js` 共 24 条断言，覆盖符号转文本、音色挑选、12 课内容结构、对话引擎状态机、测验判分与 localStorage 持久化；
   - 无头 Chromium 真实加载页面并截图，核对三栏排版、对话气泡、右栏六种演示与测验页；`x-show` 的显示行为由 Node 侧组件测试间接覆盖。

