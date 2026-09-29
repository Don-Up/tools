const test = require('node:test');
const assert = require('node:assert/strict');
const { parseJsDoc, InvalidFormatError } = require('../parse-jsdoc.js');

test('rejects text missing /** prefix', () => {
  assert.throws(
    () => parseJsDoc('not a jsdoc'),
    (err) => err instanceof InvalidFormatError
  );
});

test('rejects text missing */ suffix', () => {
  assert.throws(
    () => parseJsDoc('/**\n * body\n'),
    (err) => err instanceof InvalidFormatError
  );
});

test('accepts minimal valid JSDoc with empty body', () => {
  const result = parseJsDoc('/**\n */');
  assert.deepEqual(result, {
    title: null,
    description: [],
    params: [],
    returns: null,
    links: []
  });
});

test('captures description lines between /** and first tag', () => {
  const input = `/**
 * 导出代码弹窗:展示 generateJsx(snapshot) 输出,提供复制按钮。
 * 打开时一次性锁快照,关闭后再开会刷新。
 */`;
  const result = parseJsDoc(input);
  assert.deepEqual(result.description, [
    '导出代码弹窗:展示 generateJsx(snapshot) 输出,提供复制按钮。',
    '打开时一次性锁快照,关闭后再开会刷新。'
  ]);
  assert.equal(result.params.length, 0);
});

test('strips leading * and " *" prefixes from each line', () => {
  const input = '/**\n* line A\n * line B\n*line C\n*/';
  const result = parseJsDoc(input);
  assert.deepEqual(result.description, ['line A', 'line B', 'line C']);
});

test('preserves empty lines as empty-string entries for paragraph breaks', () => {
  const input = `/**
 * paragraph one
 *
 * paragraph two
 */`;
  const result = parseJsDoc(input);
  assert.deepEqual(result.description, ['paragraph one', '', 'paragraph two']);
});

test('parses @param with name and single-line description', () => {
  const input = `/**
 * description
 * @param props.open 控制 modal 是否可见。
 */`;
  const result = parseJsDoc(input);
  assert.equal(result.params.length, 1);
  assert.deepEqual(result.params[0], {
    name: 'props.open',
    desc: '控制 modal 是否可见。',
    example: null
  });
});

test('parses multiple @params in order', () => {
  const input = `/**
 * @param a first param
 * @param b second param
 */`;
  const result = parseJsDoc(input);
  assert.equal(result.params.length, 2);
  assert.equal(result.params[0].name, 'a');
  assert.equal(result.params[0].desc, 'first param');
  assert.equal(result.params[1].name, 'b');
  assert.equal(result.params[1].desc, 'second param');
});

test('@param description spans multiple continuation lines', () => {
  const input = `/**
 * @param props.x line one
 *        line two
 *        line three
 */`;
  const result = parseJsDoc(input);
  assert.equal(result.params[0].desc, 'line one\nline two\nline three');
});

test('@param with name only and empty desc still produces a card', () => {
  const input = `/**
 * @param lonely
 */`;
  const result = parseJsDoc(input);
  assert.equal(result.params.length, 1);
  assert.equal(result.params[0].name, 'lonely');
  assert.equal(result.params[0].desc, '');
});

test('parses "例如:" example line after @param desc', () => {
  const input = `/**
 * @param props.open 控制 modal 是否可见。
 *        例如: true
 */`;
  const result = parseJsDoc(input);
  assert.equal(result.params[0].example, 'true');
});

test('"例如:" only triggers on exact prefix (other colons ignored)', () => {
  const input = `/**
 * @param x 描述: 包含英文冒号不会触发 example。
 *        例如: realExample
 */`;
  const result = parseJsDoc(input);
  assert.equal(result.params[0].desc, '描述: 包含英文冒号不会触发 example。');
  assert.equal(result.params[0].example, 'realExample');
});

test('multi-line example value collects until next tag or EOF', () => {
  const input = `/**
 * @param props.onClose 关闭 modal 时调用。
 *        例如: () => setExportModalOpen(
 *          false
 *        )
 */`;
  const result = parseJsDoc(input);
  assert.equal(result.params[0].example, '() => setExportModalOpen(\nfalse\n)');
});

test('@param without example leaves example as null', () => {
  const input = `/**
 * @param x just a description
 */`;
  const result = parseJsDoc(input);
  assert.equal(result.params[0].example, null);
});

test('parses single-line @returns', () => {
  const input = `/**
 * @returns A rendered string.
 */`;
  const result = parseJsDoc(input);
  assert.equal(result.returns, 'A rendered string.');
});

test('@returns spans multiple continuation lines until next tag', () => {
  const input = `/**
 * @returns 渲染一个居中卡片式 dialog(含 backdrop)。
 *          header 标题 + 关闭按钮,<pre> 代码区,<button> 复制。
 * @param x trailing param
 */`;
  const result = parseJsDoc(input);
  assert.equal(result.returns, '渲染一个居中卡片式 dialog(含 backdrop)。\nheader 标题 + 关闭按钮,<pre> 代码区,<button> 复制。');
  assert.equal(result.params.length, 1);
  assert.equal(result.params[0].name, 'x');
});

test('@returns immediately before */ still records empty string', () => {
  const input = `/**
 * @returns
 */`;
  const result = parseJsDoc(input);
  assert.equal(result.returns, '');
});

test('missing @returns leaves returns as null', () => {
  const input = `/**
 * just description
 */`;
  const result = parseJsDoc(input);
  assert.equal(result.returns, null);
});

test('parses @link numbered list', () => {
  const input = `/**
 * @link
 * 1. EditorLayout(/editor 路由的 layout.tsx): 渲染本组件。
 * 2. generateJsx(纯函数): 在 useEffect 里调用。
 * 3. navigator.clipboard(浏览器原生 API): 复制按钮。
 */`;
  const result = parseJsDoc(input);
  assert.equal(result.links.length, 3);
  assert.deepEqual(result.links[0], {
    name: 'EditorLayout(/editor 路由的 layout.tsx)',
    desc: '渲染本组件。'
  });
  assert.equal(result.links[2].name, 'navigator.clipboard(浏览器原生 API)');
});

test('@link lines without numeric prefix are skipped', () => {
  const input = `/**
 * @link
 * 1. real entry: real desc
 * junk line without number
 * 2. second entry: second desc
 */`;
  const result = parseJsDoc(input);
  assert.equal(result.links.length, 2);
  assert.equal(result.links[0].name, 'real entry');
  assert.equal(result.links[1].name, 'second entry');
});

test('missing @link leaves links as empty array', () => {
  const input = `/**
 * just description
 */`;
  const result = parseJsDoc(input);
  assert.deepEqual(result.links, []);
});

test('leading/trailing whitespace around the block is tolerated', () => {
  const input = `\n\n/**\n * body\n */\n\n`;
  const result = parseJsDoc(input);
  assert.deepEqual(result.description, ['body']);
});

test('unknown tag skips its own line AND its body until next known tag', () => {
  const input = `/**
 * before
 * @example foo bar
 * more example body
 * still more
 * @param x real param
 */`;
  const result = parseJsDoc(input);
  assert.deepEqual(result.description, ['before']);
  assert.equal(result.params.length, 1);
  assert.equal(result.params[0].name, 'x');
});

test('full real-world example from spec parses correctly', () => {
  const input = `/**
 * 导出代码弹窗:展示 generateJsx(snapshot) 输出,提供复制按钮。
 * 打开时一次性锁快照,关闭后再开会刷新(避免 modal 内实时同步闪烁)。
 * @param props.open 控制 modal 是否可见;为 false 时整个组件不渲染(不影响 EditorLayout 布局)。
 *        例如: true
 * @param props.onClose 用户关闭 modal 时通知父组件收起;X / 外部点击(backdropClick) / Esc 三种方式都触发。
 *        例如: () => setExportModalOpen(false)
 * @returns 渲染一个居中卡片式 dialog(含 backdrop);header 标题 + 关闭按钮,<pre> 代码区,<button> 复制。
 * @link
 * 1. EditorLayout(/editor 路由的 layout.tsx): 渲染本组件,open 接 exportModalOpen state,onClose 接 setter。
 * 2. generateJsx(纯函数): 在 useEffect 里调用一次,生成 <pre> 内容。
 * 3. navigator.clipboard(浏览器原生 API): 复制按钮 onClick 调用 writeText(result)。
 */`;
  const result = parseJsDoc(input);
  assert.equal(result.description.length, 2);
  assert.equal(result.params.length, 2);
  assert.equal(result.params[0].name, 'props.open');
  assert.equal(result.params[0].example, 'true');
  assert.equal(result.params[1].name, 'props.onClose');
  assert.equal(result.params[1].example, '() => setExportModalOpen(false)');
  assert(result.returns.startsWith('渲染一个居中卡片式 dialog'));
  assert.equal(result.links.length, 3);
  assert.equal(result.links[0].name, 'EditorLayout(/editor 路由的 layout.tsx)');
});

test('extracts title from trailing function declaration', () => {
  const input = `/**
 * description
 */
export function ExportModal`;
  const result = parseJsDoc(input);
  assert.equal(result.title, 'ExportModal');
});

test('extracts title from various declaration styles', () => {
  assert.equal(parseJsDoc('/**\n * d\n */\nfunction Foo').title, 'Foo');
  assert.equal(parseJsDoc('/**\n * d\n */\nclass Bar').title, 'Bar');
  assert.equal(parseJsDoc('/**\n * d\n */\nexport default Baz').title, 'Baz');
  assert.equal(parseJsDoc('/**\n * d\n */\nexport default function Qux').title, 'Qux');
});

test('extracts title from const/let/var declaration (skip arrow body)', () => {
  const input = `/**
 * d
 */
const ExportModal = (props) => {}`;
  const result = parseJsDoc(input);
  assert.equal(result.title, 'ExportModal');
});

test('title is null when no trailing declaration', () => {
  const result = parseJsDoc('/**\n * description\n */');
  assert.equal(result.title, null);
});

test('multi-line trailing: title from last line only', () => {
  const input = `/**
 * d
 */
const a = 1
function Last`;
  const result = parseJsDoc(input);
  assert.equal(result.title, 'Last');
});