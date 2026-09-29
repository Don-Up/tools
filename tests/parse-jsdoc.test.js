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